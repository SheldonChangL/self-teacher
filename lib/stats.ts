import { db, type Profile, type Session } from "./db";
import { SUBJECTS, type Subject } from "./subjects";

export type KidStats = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  lang_pref: string;
  lessons_total: number;
  lessons_done: number;
  quizzes_taken: number;
  avg_score: number | null;
  by_subject: Record<Subject, number>;
  last_activity_at: number | null;
  recent: {
    id: string;
    title: string;
    subject: Subject;
    score: number | null;
    created_at: number;
  }[];
};

export type ParentStats = {
  kids: KidStats[];
  totals: {
    kids: number;
    lessons: number;
    quizzes: number;
    by_subject: Record<Subject, number>;
  };
  activity_by_day: { date: string; count: number }[];
};

const ZERO_SUBJECT_COUNT: Record<Subject, number> = SUBJECTS.reduce(
  (acc, s) => ({ ...acc, [s.id]: 0 }),
  {} as Record<Subject, number>,
);

export function getKidStats(profile: Profile): KidStats {
  const sessions = db
    .prepare(
      "SELECT * FROM sessions WHERE profile_id = ? ORDER BY created_at DESC",
    )
    .all(profile.id) as Session[];

  const lessons_done = sessions.filter((s) => s.lesson_status === "done").length;
  const scoredSessions = sessions.filter((s) => s.score !== null);
  const quizzes_taken = scoredSessions.length;
  const avg_score =
    quizzes_taken === 0
      ? null
      : scoredSessions.reduce((a, s) => a + (s.score ?? 0), 0) / quizzes_taken;

  const by_subject = { ...ZERO_SUBJECT_COUNT };
  for (const s of sessions) {
    const k = (s.subject in by_subject ? s.subject : "free") as Subject;
    by_subject[k] += 1;
  }

  const recent = sessions.slice(0, 5).map((s) => {
    const lesson = s.lesson_json
      ? (JSON.parse(s.lesson_json) as { title?: string })
      : null;
    return {
      id: s.id,
      title: lesson?.title ?? "(學習中…)",
      subject: s.subject,
      score: s.score,
      created_at: s.created_at,
    };
  });

  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    age: profile.age,
    lang_pref: profile.lang_pref,
    lessons_total: sessions.length,
    lessons_done,
    quizzes_taken,
    avg_score,
    by_subject,
    last_activity_at: sessions[0]?.created_at ?? null,
    recent,
  };
}

export function getParentStats(): ParentStats {
  const profiles = db
    .prepare("SELECT * FROM profiles ORDER BY created_at ASC")
    .all() as Profile[];

  const kids = profiles.map(getKidStats);

  const totals_by_subject = { ...ZERO_SUBJECT_COUNT };
  let totalLessons = 0;
  let totalQuizzes = 0;
  for (const k of kids) {
    totalLessons += k.lessons_total;
    totalQuizzes += k.quizzes_taken;
    for (const s of SUBJECTS) {
      totals_by_subject[s.id] += k.by_subject[s.id];
    }
  }

  const activity_by_day = db
    .prepare(
      `SELECT
         strftime('%Y-%m-%d', created_at / 1000, 'unixepoch', 'localtime') AS date,
         COUNT(*) AS count
       FROM sessions
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date ASC`,
    )
    .all(Date.now() - 30 * 24 * 3600 * 1000) as {
    date: string;
    count: number;
  }[];

  return {
    kids,
    totals: {
      kids: kids.length,
      lessons: totalLessons,
      quizzes: totalQuizzes,
      by_subject: totals_by_subject,
    },
    activity_by_day,
  };
}

export type SessionRow = Session & { title: string };

export function getKidSessions(profileId: string, limit = 100): SessionRow[] {
  const rows = db
    .prepare(
      "SELECT * FROM sessions WHERE profile_id = ? ORDER BY created_at DESC LIMIT ?",
    )
    .all(profileId, limit) as Session[];
  return rows.map((s) => {
    const lesson = s.lesson_json
      ? (JSON.parse(s.lesson_json) as { title?: string })
      : null;
    return { ...s, title: lesson?.title ?? "(學習中…)" };
  });
}
