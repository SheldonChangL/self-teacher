// Phonics DB access — thin wrappers around phonics_lessons / phonics_progress.
// Seed script (scripts/seed-phonics.mjs) writes; runtime only reads.

import { db } from "./db";
import { PHONICS_STAGES } from "./phonics-curriculum";

/** Shape that Gemini is asked to return for each lesson. Kept loose: the UI
 * tolerates missing fields and degrades gracefully. */
export type PhonicsLessonContent = {
  intro_zh: string;
  mnemonic_zh?: string;
  graphemes: Array<{
    grapheme: string;
    phoneme_ipa: string;
    how_to_say_zh: string;
    example_words: Array<{
      word: string;
      ipa: string;
      meaning_zh: string;
      emoji?: string;
    }>;
  }>;
  story_en: string;
  story_zh: string;
  practice_sentences: Array<{ en: string; zh: string }>;
  mini_quiz: Array<{
    question_zh: string;
    choices: string[];
    answer_index: number;
  }>;
  fun_fact_zh?: string;
};

export function getPhonicsContent(
  stageSlug: string,
  lessonSlug: string,
): PhonicsLessonContent | null {
  const row = db
    .prepare(
      "SELECT content_json FROM phonics_lessons WHERE stage_slug = ? AND lesson_slug = ?",
    )
    .get(stageSlug, lessonSlug) as { content_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.content_json) as PhonicsLessonContent;
  } catch {
    return null;
  }
}

/** Set of "stage:lesson" composite keys present in phonics_lessons. */
export function getSeededLessonKeys(): Set<string> {
  const rows = db
    .prepare("SELECT stage_slug, lesson_slug FROM phonics_lessons")
    .all() as Array<{ stage_slug: string; lesson_slug: string }>;
  return new Set(rows.map((r) => `${r.stage_slug}:${r.lesson_slug}`));
}

/** Set of "stage:lesson" composite keys the kid has completed. */
export function getCompletedLessonKeys(profileId: string): Set<string> {
  const rows = db
    .prepare(
      "SELECT stage_slug, lesson_slug FROM phonics_progress WHERE profile_id = ?",
    )
    .all(profileId) as Array<{ stage_slug: string; lesson_slug: string }>;
  return new Set(rows.map((r) => `${r.stage_slug}:${r.lesson_slug}`));
}

export function markLessonComplete(
  profileId: string,
  stageSlug: string,
  lessonSlug: string,
): void {
  db.prepare(
    `INSERT INTO phonics_progress (profile_id, stage_slug, lesson_slug, completed_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (profile_id, stage_slug, lesson_slug) DO NOTHING`,
  ).run(profileId, stageSlug, lessonSlug, Date.now());
}

export type StageProgress = {
  stageSlug: string;
  done: number;
  total: number;
};

export function getStageProgress(profileId: string): Map<string, StageProgress> {
  const completed = getCompletedLessonKeys(profileId);
  const out = new Map<string, StageProgress>();
  for (const stage of PHONICS_STAGES) {
    let done = 0;
    for (const lesson of stage.lessons) {
      if (completed.has(`${stage.slug}:${lesson.slug}`)) done++;
    }
    out.set(stage.slug, {
      stageSlug: stage.slug,
      done,
      total: stage.lessons.length,
    });
  }
  return out;
}

/** True iff every stage has at least one row in phonics_lessons.
 *  Used by the UI to show a friendly "請先 seed" message instead of crashing. */
export function isCurriculumSeeded(): boolean {
  const seeded = getSeededLessonKeys();
  for (const stage of PHONICS_STAGES) {
    for (const lesson of stage.lessons) {
      if (!seeded.has(`${stage.slug}:${lesson.slug}`)) return false;
    }
  }
  return true;
}
