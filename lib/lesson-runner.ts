import { EventEmitter } from "node:events";
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

// Live broadcast channel per session. The runner emits "msg" events while
// claude streams in; the lesson stream route subscribes so multiple viewers
// (and refreshes) see the same single claude run instead of triggering more.
export type LessonMsg =
  | { type: "delta"; text: string }
  | { type: "done"; title: string }
  | { type: "error"; message: string };

export type LessonChannel = {
  emitter: EventEmitter;
  /** Everything claude has emitted so far — replayed to late subscribers. */
  buffer: string;
  /** True once the runner reached a terminal state (done or error). */
  ended: boolean;
  /** Set when `ended` is true so late subscribers can immediately finalize. */
  finalMsg?: LessonMsg;
};

const channels = new Map<string, LessonChannel>();

function getOrCreateChannel(sid: string): LessonChannel {
  let ch = channels.get(sid);
  if (!ch) {
    const emitter = new EventEmitter();
    // Several refresh-happy clients (TV + phone + desktop) might subscribe
    // at the same time. Bump the warning threshold from the default 10.
    emitter.setMaxListeners(50);
    ch = { emitter, buffer: "", ended: false };
    channels.set(sid, ch);
  }
  return ch;
}

/** Subscribers can read the buffered transcript + listen to live events. */
export function getLessonChannel(sid: string): LessonChannel | undefined {
  return channels.get(sid);
}

function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : "今天的學習";
}

/**
 * Fire-and-forget lesson generation.
 *
 * Idempotent: returns immediately if the session is already done or already
 * running in this process. Otherwise marks the row as `running` and spawns
 * the AI in the background; status flips to `done` (with `lesson_json`) or
 * `error` when finished.
 *
 * Called from:
 *   - `/api/upload`             — kick off as soon as the photo lands
 *   - `app/kid/[id]/page.tsx`   — recover pending sessions on render so the
 *                                 TV-side EventSource isn't a single point of
 *                                 failure (old WebOS Chromium can't run the
 *                                 client bundle)
 *   - `/api/lessons/[sid]/stream` — when the modern phone/desktop client
 *                                 opens the SSE; it then subscribes to the
 *                                 same channel instead of spawning its own
 *                                 claude.
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
  const ch = getOrCreateChannel(sessionId);

  const finalize = (msg: LessonMsg) => {
    ch.ended = true;
    ch.finalMsg = msg;
    ch.emitter.emit("msg", msg);
    // Keep the channel around briefly so late subscribers can still read
    // `finalMsg` + `buffer` before it disappears.
    setTimeout(() => channels.delete(sessionId), 30_000);
  };

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
        if (evt.type === "text") {
          full += evt.text;
          ch.buffer += evt.text;
          ch.emitter.emit("msg", {
            type: "delta",
            text: evt.text,
          } satisfies LessonMsg);
        } else if (evt.type === "cost") {
          costUsd = evt.costUsd;
        } else if (evt.type === "error") {
          throw new Error(evt.message);
        }
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

      finalize({ type: "done", title });
    } catch (err) {
      console.error("[lesson-runner]", sessionId, err);
      db.prepare(
        "UPDATE sessions SET lesson_status = 'error' WHERE id = ?",
      ).run(sessionId);
      finalize({ type: "error", message: String(err) });
    } finally {
      inFlight.delete(sessionId);
    }
  })();
}
