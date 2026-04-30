import { db } from "./db";

function localDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

export function bumpDailyActivity(profileId: string, ts = Date.now()): void {
  const date = localDate(ts);
  db.prepare(
    `INSERT INTO daily_activity (profile_id, date, lessons_count)
     VALUES (?, ?, 1)
     ON CONFLICT(profile_id, date) DO UPDATE SET
       lessons_count = lessons_count + 1`,
  ).run(profileId, date);
}

export type Streak = {
  current: number;
  longest: number;
  today_count: number;
  last7: { date: string; count: number; today: boolean }[];
};

export function getStreak(profileId: string, now = Date.now()): Streak {
  const rows = db
    .prepare(
      `SELECT date, lessons_count FROM daily_activity
       WHERE profile_id = ?
       ORDER BY date DESC`,
    )
    .all(profileId) as { date: string; lessons_count: number }[];

  const today = localDate(now);
  const set = new Map(rows.map((r) => [r.date, r.lessons_count]));

  // Walk backward from today; if today missing but yesterday hits, streak is from yesterday.
  let cursor = new Date(now);
  cursor.setHours(0, 0, 0, 0);
  let current = 0;
  // If today empty, allow streak to continue from yesterday for grace
  if (!set.has(today)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(cursor.toLocaleDateString("sv-SE"))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Longest: scan all rows in date-asc order
  const ascDates = rows.map((r) => r.date).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of ascDates) {
    const dt = new Date(d);
    if (prev) {
      const diffDays = Math.round(
        (dt.getTime() - prev.getTime()) / (24 * 3600 * 1000),
      );
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = dt;
  }

  // Last 7 days (today + 6 back)
  const last7: Streak["last7"] = [];
  const cur = new Date(now);
  cur.setHours(0, 0, 0, 0);
  for (let i = 6; i >= 0; i--) {
    const d = new Date(cur);
    d.setDate(d.getDate() - i);
    const iso = d.toLocaleDateString("sv-SE");
    last7.push({
      date: iso,
      count: set.get(iso) ?? 0,
      today: iso === today,
    });
  }

  return {
    current,
    longest,
    today_count: set.get(today) ?? 0,
    last7,
  };
}
