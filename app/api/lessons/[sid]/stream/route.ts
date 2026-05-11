import { db, Session } from "@/lib/db";
import {
  startLessonGeneration,
  getLessonChannel,
  type LessonMsg,
} from "@/lib/lesson-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const enc = new TextEncoder();
  const sse = (obj: unknown) =>
    enc.encode(`data: ${JSON.stringify(obj)}\n\n`);

  // Already finished: replay cached content immediately. No claude spawn,
  // refresh-safe.
  if (session.lesson_status === "done" && session.lesson_json) {
    const lesson = JSON.parse(session.lesson_json) as {
      markdown: string;
      title?: string;
    };
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(sse({ delta: lesson.markdown }));
        controller.enqueue(sse({ done: true, cached: true }));
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

  // Otherwise: hand the work to the shared lesson-runner (idempotent — if
  // /api/upload or kid-home already kicked it off, this is a no-op) and
  // subscribe to its broadcast channel. Multiple refreshes / multiple
  // viewers share one claude run.
  startLessonGeneration(sid);

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (obj: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(sse(obj));
        } catch {
          // controller already closed
        }
      };
      const safeClose = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {}
      };

      safeEnqueue({ ready: true });

      const ch = getLessonChannel(sid);
      if (!ch) {
        // Race: runner finished + cleaned up its channel before we got here.
        // Fall back to DB.
        const s2 = db
          .prepare("SELECT * FROM sessions WHERE id = ?")
          .get(sid) as Session | undefined;
        if (s2?.lesson_status === "done" && s2.lesson_json) {
          const lesson = JSON.parse(s2.lesson_json) as {
            markdown: string;
            title?: string;
          };
          safeEnqueue({ delta: lesson.markdown });
          safeEnqueue({ done: true, title: lesson.title, cached: true });
        } else if (s2?.lesson_status === "error") {
          safeEnqueue({ error: "lesson 之前失敗了，請重新整理或重新拍照" });
        } else {
          safeEnqueue({
            error: "找不到 lesson channel，請重新整理",
          });
        }
        safeClose();
        return;
      }

      // Replay everything claude has produced so far so a late subscriber
      // (refresh / second tab) catches up.
      if (ch.buffer) safeEnqueue({ delta: ch.buffer });

      // Already finalized → emit the final frame and close.
      if (ch.ended && ch.finalMsg) {
        if (ch.finalMsg.type === "done") {
          safeEnqueue({ done: true, title: ch.finalMsg.title });
        } else if (ch.finalMsg.type === "error") {
          safeEnqueue({ error: ch.finalMsg.message });
        }
        safeClose();
        return;
      }

      const onMsg = (msg: LessonMsg) => {
        if (msg.type === "delta") {
          safeEnqueue({ delta: msg.text });
        } else if (msg.type === "done") {
          safeEnqueue({ done: true, title: msg.title });
          cleanup();
          safeClose();
        } else if (msg.type === "error") {
          safeEnqueue({ error: msg.message });
          cleanup();
          safeClose();
        }
      };
      const cleanup = () => {
        ch.emitter.off("msg", onMsg);
      };
      ch.emitter.on("msg", onMsg);

      // Client refresh / navigate-away → drop subscription, but DO NOT
      // abort the underlying runner (other viewers may still be watching,
      // and the upload-triggered spawn must keep going regardless).
      req.signal.addEventListener("abort", () => {
        cleanup();
        safeClose();
      });
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
