import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Profile } from "@/lib/db";
import { getKidStats, getKidSessions } from "@/lib/stats";
import { SUBJECTS } from "@/lib/subjects";
import { PieChart, ScoreLineChart, SUBJECT_COLORS } from "@/components/Charts";

export const dynamic = "force-dynamic";

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

function fmt(ts: number): string {
  return new Date(ts).toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function KidDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const stats = getKidStats(profile);
  const sessions = getKidSessions(profile.id, 100);

  // Score history (oldest → newest, only completed quizzes)
  const scoreHistory = sessions
    .filter((s) => s.score !== null)
    .map((s) => ({ date: s.created_at, score: s.score as number }))
    .reverse();

  const subjectsAll = SUBJECTS.map((s) => ({
    ...s,
    count: stats.by_subject[s.id],
    color: SUBJECT_COLORS[s.id],
  }));
  const hasSubjectData = stats.lessons_total > 0;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-5xl">
        <Link
          href="/parent"
          className="text-sm text-amber-700 hover:underline"
        >
          ← 回家長後台
        </Link>

        <header className="mt-2 flex items-center gap-5">
          <span className="text-7xl">{profile.avatar}</span>
          <div>
            <h1 className="text-4xl font-extrabold text-amber-700">
              {profile.name}
            </h1>
            <p className="text-zinc-600">
              {profile.age} 歲 · 加入於{" "}
              {new Date(profile.created_at).toLocaleDateString("zh-TW")}
            </p>
          </div>
        </header>

        {/* Hero numbers */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon="📚" label="學過的課" value={stats.lessons_total} />
          <Stat icon="🧠" label="完成測驗" value={stats.quizzes_taken} />
          <Stat
            icon="⭐"
            label="平均分"
            value={
              stats.avg_score !== null
                ? `${stats.avg_score.toFixed(1)}/5`
                : "—"
            }
          />
          <Stat
            icon="📈"
            label="最近 7 天"
            value={
              sessions.filter(
                (s) => Date.now() - s.created_at < 7 * 86400_000,
              ).length
            }
          />
        </div>

        {/* Subject pie chart */}
        {hasSubjectData && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-700">
              🎯 喜歡的科目
            </h2>
            <div className="mt-3 rounded-2xl bg-white/80 p-5 ring-1 ring-amber-100">
              <PieChart slices={subjectsAll} />
            </div>
          </section>
        )}

        {/* Score trend line chart */}
        {scoreHistory.length > 0 && (
          <section className="mt-8" data-testid="score-trend">
            <h2 className="text-lg font-semibold text-zinc-700">
              📈 測驗成績變化
            </h2>
            <div className="mt-3 rounded-2xl bg-white/80 p-4 ring-1 ring-amber-100">
              <ScoreLineChart points={scoreHistory} />
            </div>
          </section>
        )}

        {/* All sessions list */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-700">
            📋 全部紀錄（{sessions.length}）
          </h2>
          {sessions.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-zinc-600">
              這位小朋友還沒上過課。
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-amber-100 overflow-hidden rounded-2xl bg-white/80 ring-1 ring-amber-100">
              {sessions.map((s) => {
                const subj =
                  SUBJECT_BY_ID[s.subject] ?? SUBJECT_BY_ID.free;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/kid/${profile.id}/lesson/${s.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition hover:bg-amber-50"
                    >
                      <span
                        className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                        title={subj.label}
                      >
                        {subj.icon} {subj.label}
                      </span>
                      <span className="flex-1 truncate font-medium text-zinc-800">
                        {s.title}
                      </span>
                      <span className="hidden text-xs text-zinc-500 sm:inline">
                        {fmt(s.created_at)}
                      </span>
                      {s.score !== null ? (
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-sm text-emerald-700">
                          ⭐ {s.score}/5
                        </span>
                      ) : s.lesson_status !== "done" ? (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          學習中
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          未測驗
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm ring-1 ring-amber-100">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-2xl font-extrabold text-amber-700">
        {value}
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
