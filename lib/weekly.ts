import { db } from "./db";
import { earnedMinutes, usedMinutes, weekendBonus } from "./rewards";

export function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  out.setDate(out.getDate() + diff);
  return out;
}

function fmt(d: Date): string {
  return d.toLocaleDateString("sv-SE");
}

export function weekDates(weekStart: Date): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    out.push(fmt(d));
  }
  return out;
}

export type WeeklySummary = {
  week_start: string;
  week_end: string;
  dates: string[];
  homework: {
    total: number;
    done: number;
    forgot: number;
    pct: number;
    per_day: { date: string; done: number; total: number }[];
  };
  chores: {
    total: number;
    by_label: { label: string; emoji: string; count: number }[];
  };
  exercise_days: number;
  reading_days: number;
  game_time: {
    earned_by_day: { date: string; minutes: number }[];
    used_by_day: { date: string; minutes: number }[];
    weekday_total: number;
    weekend_total: number;
    earned_total: number;
    used_total: number;
    weekend_bonus_suggested: number;
  };
};

export function weeklySummary(profileId: string, weekStart: Date): WeeklySummary {
  const dates = weekDates(weekStart);
  const start = dates[0];
  const end = dates[6];

  const logs = db
    .prepare(
      `SELECT date, kind, status, label, emoji, minutes_awarded
       FROM daily_logs
       WHERE profile_id = ? AND date BETWEEN ? AND ?`,
    )
    .all(profileId, start, end) as {
    date: string;
    kind: "homework" | "chore" | "exercise" | "reading";
    status: "done" | "undone" | "forgot";
    label: string;
    emoji: string;
    minutes_awarded: number;
  }[];

  // Homework
  const hw = logs.filter((l) => l.kind === "homework");
  const hwTotal = hw.length;
  const hwDone = hw.filter((l) => l.status === "done").length;
  const hwForgot = hw.filter((l) => l.status === "forgot").length;
  const hwPerDay = dates.map((date) => {
    const day = hw.filter((l) => l.date === date);
    return {
      date,
      done: day.filter((l) => l.status === "done").length,
      total: day.length,
    };
  });

  // Chores
  const chores = logs.filter((l) => l.kind === "chore" && l.status === "done");
  const choreMap = new Map<string, { label: string; emoji: string; count: number }>();
  for (const c of chores) {
    const key = `${c.emoji}::${c.label}`;
    const prev = choreMap.get(key);
    if (prev) prev.count++;
    else choreMap.set(key, { label: c.label, emoji: c.emoji, count: 1 });
  }
  const choresBy = Array.from(choreMap.values()).sort((a, b) => b.count - a.count);

  // Exercise / reading days
  const exerciseDates = new Set(
    logs.filter((l) => l.kind === "exercise" && l.status === "done").map((l) => l.date),
  );
  const readingDates = new Set(
    logs.filter((l) => l.kind === "reading" && l.status === "done").map((l) => l.date),
  );

  // Game time
  const earnedByDay = dates.map((date) => ({
    date,
    minutes: earnedMinutes(profileId, date),
  }));
  const usedByDay = dates.map((date) => ({
    date,
    minutes: usedMinutes(profileId, date),
  }));
  // Weekday = Mon-Fri = indices 0-4 (since startOfWeek returns Monday)
  const weekdayTotal = earnedByDay.slice(0, 5).reduce((a, b) => a + b.minutes, 0);
  const weekendTotal = earnedByDay.slice(5, 7).reduce((a, b) => a + b.minutes, 0);
  const earnedTotal = weekdayTotal + weekendTotal;
  const usedTotal = usedByDay.reduce((a, b) => a + b.minutes, 0);

  return {
    week_start: start,
    week_end: end,
    dates,
    homework: {
      total: hwTotal,
      done: hwDone,
      forgot: hwForgot,
      pct: hwTotal === 0 ? 0 : Math.round((hwDone / hwTotal) * 100),
      per_day: hwPerDay,
    },
    chores: {
      total: chores.length,
      by_label: choresBy,
    },
    exercise_days: exerciseDates.size,
    reading_days: readingDates.size,
    game_time: {
      earned_by_day: earnedByDay,
      used_by_day: usedByDay,
      weekday_total: weekdayTotal,
      weekend_total: weekendTotal,
      earned_total: earnedTotal,
      used_total: usedTotal,
      weekend_bonus_suggested: weekendBonus(weekdayTotal),
    },
  };
}
