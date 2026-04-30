import { db, Profile, Session } from "@/lib/db";
import { streamAI, getActiveProvider } from "@/lib/ai-router";
import { buildLessonPrompt, buildRegeneratePrompt } from "@/lib/prompts";
import { startQuizGeneration } from "@/lib/quiz-runner";
import { bumpDailyActivity } from "@/lib/streak";
import { addCardsForLesson } from "@/lib/vocab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "今天的學習";
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sid) as Session | undefined;
  if (!session) {
    return new Response("session not found", { status: 404 });
  }

  // If already done, replay full content quickly so a refresh works.
  if (session.lesson_status === "done" && session.lesson_json) {
    const lesson = JSON.parse(session.lesson_json) as { markdown: string };
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ delta: lesson.markdown })}\n\n` +
              `data: ${JSON.stringify({ done: true, cached: true })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  }

  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(session.profile_id) as Profile | undefined;
  if (!profile) {
    return new Response("profile not found", { status: 404 });
  }

  const imagePaths = JSON.parse(session.image_paths) as string[];

  // Strip the [regenerate:mode] tag from hint before passing to prompts
  const regenMatch = session.hint.match(/^\[regenerate:(simpler|angle)\]\s*(.*)$/);
  const cleanHint = regenMatch ? regenMatch[2] : session.hint;
  const regenMode = regenMatch ? (regenMatch[1] as "simpler" | "angle") : null;

  let prompt: string;
  if (regenMode && session.prev_lesson_id) {
    const prev = db
      .prepare("SELECT lesson_json FROM sessions WHERE id = ?")
      .get(session.prev_lesson_id) as { lesson_json: string | null } | undefined;
    const prevMd = prev?.lesson_json
      ? (JSON.parse(prev.lesson_json) as { markdown?: string }).markdown ?? ""
      : "";
    prompt = buildRegeneratePrompt({
      profile,
      imageRelPaths: imagePaths,
      subject: session.subject,
      hint: cleanHint,
      previousMarkdown: prevMd,
      mode: regenMode,
    });
  } else {
    prompt = buildLessonPrompt({
      profile,
      imageRelPaths: imagePaths,
      subject: session.subject,
      hint: cleanHint,
    });
  }

  db.prepare("UPDATE sessions SET lesson_status = 'running' WHERE id = ?").run(
    sid,
  );

  const enc = new TextEncoder();
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort());

  const stream = new ReadableStream({
    async start(controller) {
      let full = "";
      let costUsd = 0;
      const send = (obj: unknown) =>
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      // initial heartbeat so client gets headers immediately
      send({ ready: true });
      try {
        for await (const evt of streamAI(prompt, {
          allowedTools: ["Read"],
          signal: ac.signal,
        })) {
          if (evt.type === "text") {
            full += evt.text;
            send({ delta: evt.text });
          } else if (evt.type === "cost") {
            costUsd = evt.costUsd;
          } else if (evt.type === "error") {
            send({ error: evt.message });
            db.prepare(
              "UPDATE sessions SET lesson_status = 'error' WHERE id = ?",
            ).run(sid);
            controller.close();
            return;
          }
        }
        const title = extractTitle(full);
        db.prepare(
          "UPDATE sessions SET lesson_json = ?, lesson_status = 'done' WHERE id = ?",
        ).run(JSON.stringify({ markdown: full, title }), sid);

        bumpDailyActivity(session.profile_id);
        addCardsForLesson(session.profile_id, sid, full);

        // Always log so the parent can see usage even when cost is unknown
        // (e.g. Gemini emits costUsd=0). Tag with active provider in `kind`.
        const kind = `lesson:${getActiveProvider()}`;
        db.prepare(
          `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at)
           VALUES (?, ?, ?, ?)`,
        ).run(session.profile_id, kind, costUsd, Date.now());

        // fire-and-forget: start quiz generation while kid reads
        startQuizGeneration(sid);

        send({ done: true, title });
        controller.close();
      } catch (err) {
        send({ error: String(err) });
        db.prepare(
          "UPDATE sessions SET lesson_status = 'error' WHERE id = ?",
        ).run(sid);
        controller.close();
      }
    },
    cancel() {
      ac.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
