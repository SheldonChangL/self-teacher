import { db, Profile, Session } from "./db";
import { runClaude } from "./claude";
import { buildQuizPrompt } from "./prompts";

const inFlight = new Set<string>();

export type Quiz = {
  questions: Array<{
    q_zh: string;
    q_en: string;
    options: string[];
    answer_index: number;
    explain_zh: string;
    explain_en: string;
  }>;
};

function extractJson(s: string): unknown {
  const trimmed = s.trim();
  // strip ```json fences if model added them
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = fenced ? fenced[1] : trimmed;
  // find first { and last }
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1) throw new Error("no JSON in output");
  return JSON.parse(candidate.slice(first, last + 1));
}

export function startQuizGeneration(sessionId: string): void {
  if (inFlight.has(sessionId)) return;
  inFlight.add(sessionId);

  void (async () => {
    try {
      const session = db
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(sessionId) as Session | undefined;
      if (!session || !session.lesson_json) throw new Error("lesson 尚未完成");

      const profile = db
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(session.profile_id) as Profile | undefined;
      if (!profile) throw new Error("找不到 profile");

      const lesson = JSON.parse(session.lesson_json) as { markdown: string };

      db.prepare("UPDATE sessions SET quiz_status = 'running' WHERE id = ?").run(
        sessionId,
      );

      const prompt = buildQuizPrompt({
        profile,
        lessonMarkdown: lesson.markdown,
        subject: session.subject,
      });
      const { text, costUsd } = await runClaude(prompt, { allowedTools: [] });
      const quiz = extractJson(text) as Quiz;

      if (!quiz.questions || !Array.isArray(quiz.questions)) {
        throw new Error("quiz JSON 格式不對");
      }

      db.prepare(
        "UPDATE sessions SET quiz_json = ?, quiz_status = 'done' WHERE id = ?",
      ).run(JSON.stringify(quiz), sessionId);

      if (costUsd > 0) {
        db.prepare(
          `INSERT INTO cost_log (profile_id, kind, cost_usd, created_at)
           VALUES (?, 'quiz', ?, ?)`,
        ).run(session.profile_id, costUsd, Date.now());
      }
    } catch (err) {
      console.error("[quiz]", sessionId, err);
      db.prepare("UPDATE sessions SET quiz_status = 'error' WHERE id = ?").run(
        sessionId,
      );
    } finally {
      inFlight.delete(sessionId);
    }
  })();
}
