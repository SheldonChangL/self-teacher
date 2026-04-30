import { db } from "./db";
import { newId } from "./id";

const DAY = 24 * 60 * 60 * 1000;
// Simplified SM-2: ease 0..5 → wait this many days before next review.
const INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];

export type VocabCard = {
  id: string;
  profile_id: string;
  front: string;
  back: string;
  source_session_id: string | null;
  ease: number;
  next_review_at: number;
  created_at: number;
};

/**
 * Pull `**front** ... — back` lines from the vocab block in a lesson
 * markdown. Tolerant of subject variations (English needs KK 音標,
 * Chinese needs 注音, math/science use plain term).
 */
export function extractVocab(md: string): { front: string; back: string }[] {
  if (!md) return [];
  // Find the vocab block (between the 🔤 marker and the next ## heading)
  const start = md.search(/\*\*🔤[^*\n]+\*\*/);
  let block: string;
  if (start === -1) {
    // Fallback: scan whole doc but only if it has em-dashes — risky but
    // some lessons may skip the marker.
    block = md;
  } else {
    const after = md.slice(start);
    const end = after.indexOf("\n## ");
    block = end === -1 ? after : after.slice(0, end);
  }

  const out: { front: string; back: string }[] = [];
  const seen = new Set<string>();
  for (const raw of block.split(/\r?\n/)) {
    // Match list items split by em-dash, en-dash, or " - ".
    const m = raw.match(/^\s*[-*]\s+(.+?)\s+[—–-]+\s+(.+?)\s*$/);
    if (!m) continue;
    const front = m[1].replace(/\*\*/g, "").replace(/`/g, "").trim();
    const back = m[2].replace(/\*\*/g, "").replace(/`/g, "").trim();
    if (!front || !back) continue;
    if (front.length > 80 || back.length > 160) continue;
    if (seen.has(front)) continue;
    seen.add(front);
    out.push({ front, back });
  }
  return out;
}

export function addCardsForLesson(
  profileId: string,
  sessionId: string,
  markdown: string,
  now = Date.now(),
): number {
  const items = extractVocab(markdown);
  if (items.length === 0) return 0;
  const stmt = db.prepare(
    `INSERT INTO vocab_cards
       (id, profile_id, front, back, source_session_id, ease, next_review_at, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?)
     ON CONFLICT(profile_id, front) DO NOTHING`,
  );
  let inserted = 0;
  for (const it of items) {
    const r = stmt.run(
      newId("v"),
      profileId,
      it.front,
      it.back,
      sessionId,
      now + INTERVALS_DAYS[0] * DAY,
      now,
    );
    if (r.changes > 0) inserted++;
  }
  return inserted;
}

export function dueToday(
  profileId: string,
  limit = 10,
  now = Date.now(),
): VocabCard[] {
  return db
    .prepare(
      `SELECT * FROM vocab_cards
       WHERE profile_id = ? AND next_review_at <= ?
       ORDER BY next_review_at ASC
       LIMIT ?`,
    )
    .all(profileId, now, limit) as VocabCard[];
}

export function dueCount(profileId: string, now = Date.now()): number {
  const r = db
    .prepare(
      `SELECT COUNT(*) AS c FROM vocab_cards
       WHERE profile_id = ? AND next_review_at <= ?`,
    )
    .get(profileId, now) as { c: number };
  return r.c;
}

export function recordReview(
  cardId: string,
  recall: "good" | "forgot",
  now = Date.now(),
): void {
  const card = db
    .prepare("SELECT * FROM vocab_cards WHERE id = ?")
    .get(cardId) as VocabCard | undefined;
  if (!card) return;
  const ease =
    recall === "good"
      ? Math.min(INTERVALS_DAYS.length - 1, card.ease + 1)
      : 0;
  const next = now + INTERVALS_DAYS[ease] * DAY;
  db.prepare(
    "UPDATE vocab_cards SET ease = ?, next_review_at = ? WHERE id = ?",
  ).run(ease, next, cardId);
}
