import { db, Profile, Session } from "./db";
import { streamAI, getActiveProvider } from "./ai-router";
import { buildLessonPrompt, buildRegeneratePrompt } from "./prompts";
import { bumpDailyActivity } from "./streak";
import { addCardsForLesson } from "./vocab";
import { startQuizGeneration } from "./quiz-runner";

// Track in-flight lesson generations so we don't double-spawn claude for the
// same session if /api/upload, kid home auto-recovery, and the lesson stream
// route all try to kick it off simultaneously.
const inFlight = new Set<string>();

function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "今天的學習";
}

/**
 * Fire-and-forget lesson generation.
 *
 * Idempotent: returns immediately if the session is already done, already
 * running in this process, or not found. Otherwise marks the row as `running`
 * and spawns the AI in the background; status flips to `done` (with
 * `lesson_json`) or `error` when finished.
 *
 * Called from:
 *   - `/api/upload`            — kick off as soon as the photo lands
 *   - `app/kid/[id]/page.tsx`  — recover pending sessions on render so the
 *                                TV-side EventSource isn't a single point of
 *                                failure (old WebOS Chromium can't run the
 *                                client bundle)
 */
export function startLessonGeneration(sessionId: string): void {
  if (inFlight.has(sessionId)) return;

  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sessionId) as Session | undefined;
  if (!session) return;
  if (session.lesson_status === "done") return;
  // `running` rows that aren't in our inFlight set are stranded from a prior
  // process; fall through and re-run them.

  inFlight.add(sessionId);

  void (async () => {
    try {
      db.prepare(
        "UPDATE sessions SET lesson_status = 'running' WHERE id = ?",
      ).run(sessionId);

      const profile = db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(session.profile_id) as Profile | undefined;
      if (!profile) throw new Error("找不到 profile");

      const imagePaths = JSON.parse(session.image_paths) as string[];
      const regenMatch = session.hint.match(
        /^\[regenerate:(simpler|angle)\]\s*(.*)$/,
      );
      const cleanHint = regenMatch ? regenMatch[2] : session.hint;
      const regenMode = regenMatch
        ? (regenMatch[1] as "simpler" | "angle")
        : null;

      let prompt: string;
      if (regenMode && session.prev_lesson_id) {
        const prev = db
          .prepare("SELECT lesson_json FROM sessions WHERE id = ?")
          .get(session.prev_lesson_id) as
          | { lesson_json: string | null }
          | undefined;
        const prevMd = prev?.lesson_json
          ? (JSON.parse(prev.lesson_json) as { markdown?: string }).markdown ??
            ""
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

      let full = "";
      let costUsd = 0;
      for await (const evt of streamAI(prompt, { allowedTools: ["Read"] })) {
        if (evt.type === "text") full += evt.text;
        else if (evt.type === "cost") costUsd = evt.costUsd;
        else if (evt.type === "error") throw new Error(evt.message);
      }
      if (!full.trim()) throw new Error("AI 沒回任何內容");

      const title = extractTitle(full);
      db.prepare(
        "UPDATE sessions SET lesson_json = ?, lesson_status = 'done' WHERE id = ?",
      ).run(JSON.stringify({ markdown: full, title }), sessionId);

      bumpDailyActivity(session.profile_id);
      addCardsForLesson(session.profile_id, sessionId, full);

      db.prepare(
        `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at)
         VALUES (?, ?, ?, ?)`,
      ).run(
        session.profile_id,
        `lesson:${getActiveProvider()}`,
        costUsd,
        Date.now(),
      );

      // Kick off quiz generation in the background once the lesson is done.
      startQuizGeneration(sessionId);
    } catch (err) {
      console.error("[lesson-runner]", sessionId, err);
      db.prepare(
        "UPDATE sessions SET lesson_status = 'error' WHERE id = ?",
      ).run(sessionId);
    } finally {
      inFlight.delete(sessionId);
    }
  })();
}
