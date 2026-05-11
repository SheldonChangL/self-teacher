import Link from "next/link";
import { notFound } from "next/navigation";
import { db, type Profile } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { PieChart } from "@/components/Charts";
import { WeeklyUsageStepper } from "@/components/WeeklyUsageStepper";
import { startOfWeek, weeklySummary } from "@/lib/weekly";
import { localDate } from "@/lib/tasks";
import { usedMinutes } from "@/lib/rewards";

export const dynamic = "force-dynamic";

const CHORE_PALETTE = [
  "#f59e0b",
  "#ef4444",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

const DAY_LABELS = ["一", "二", "三", "四", "五", "六", "日"];

function shiftWeek(weekStartIso: string, deltaDays: number): string {
  const d = new Date(weekStartIso);
  d.setDate(d.getDate() + deltaDays);
  return d.toLocaleDateString("sv-SE");
}

export default async function WeeklyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { id } = await params;
  const { week } = await searchParams;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const weekStartDate = week
    ? startOfWeek(new Date(week))
    : startOfWeek(new Date());
  const summary = weeklySummary(id, weekStartDate);
  const todayIso = localDate();
  const todayUsed = usedMinutes(id, todayIso);

  const prevWeekIso = shiftWeek(summary.week_start, -7);
  const nextWeekIso = shiftWeek(summary.week_start, 7);

  const hwMaxPerDay = Math.max(1, ...summary.homework.per_day.map((d) => d.total));

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-4xl">
        <BackLink href={`/parent/${id}`}>回小朋友詳情</BackLink>

        <header className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-amber-700 sm:text-4xl">
              📊 {profile.name} 本週總結
            </h1>
            <p className="text-zinc-600">
              {summary.week_start} ~ {summary.week_end}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/parent/${id}/weekly?week=${prevWeekIso}`}
              className="rounded-xl bg-amber-100 px-4 py-2 text-amber-700 hover:bg-amber-200"
            >
              ← 上一週
            </Link>
            <Link
              href={`/parent/${id}/weekly`}
              className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
            >
              本週
            </Link>
            <Link
              href={`/parent/${id}/weekly?week=${nextWeekIso}`}
              className="rounded-xl bg-amber-100 px-4 py-2 text-amber-700 hover:bg-amber-200"
            >
              下一週 →
            </Link>
          </div>
        </header>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
            <h2 className="text-lg font-bold text-amber-700">📝 作業完成率</h2>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="text-5xl font-extrabold text-amber-700 tabular-nums">
                {summary.homework.pct}%
              </span>
              <span className="text-sm text-zinc-500">
                {summary.homework.done} / {summary.homework.total} 完成
                {summary.homework.forgot > 0 && (
                  <>
                    {" "}
                    · <span className="text-rose-600">🎒 忘了帶 {summary.homework.forgot}</span>
                  </>
                )}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-1">
              {summary.homework.per_day.map((d, i) => {
                const h =
                  d.total === 0
                    ? 4
                    : Math.max(4, (d.done / hwMaxPerDay) * 80);
                return (
                  <div
                    key={d.date}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {d.total === 0 ? "—" : `${d.done}/${d.total}`}
                    </span>
                    <div
                      className="w-full rounded-t bg-amber-400"
                      style={{ height: `${h}px` }}
                      title={`${d.date}: ${d.done}/${d.total}`}
                    />
                    <span className="text-xs text-zinc-500">
                      {DAY_LABELS[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
            <h2 className="text-lg font-bold text-amber-700">🧹 家事貢獻</h2>
            <p className="mt-1 text-sm text-zinc-500">
              本週累計 {summary.chores.total} 次
            </p>
            {summary.chores.total === 0 ? (
              <p className="mt-6 text-center text-zinc-400">尚無紀錄</p>
            ) : (
              <div className="mt-2">
                <PieChart
                  slices={summary.chores.by_label.map((c, i) => ({
                    id: `chore-${i}`,
                    label: c.label,
                    icon: c.emoji,
                    count: c.count,
                    color: CHORE_PALETTE[i % CHORE_PALETTE.length],
                  }))}
                />
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
            <h2 className="text-lg font-bold text-amber-700">
              🏃 運動 / 📖 閱讀
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-4xl font-extrabold text-amber-700 tabular-nums">
                  {summary.exercise_days}
                  <span className="ml-1 text-sm font-normal text-zinc-500">
                    / 7 天
                  </span>
                </div>
                <div className="mt-1 text-sm text-zinc-600">🏃 有運動的日子</div>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <div className="text-4xl font-extrabold text-amber-700 tabular-nums">
                  {summary.reading_days}
                  <span className="ml-1 text-sm font-normal text-zinc-500">
                    / 7 天
                  </span>
                </div>
                <div className="mt-1 text-sm text-zinc-600">📖 有閱讀的日子</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
            <h2 className="text-lg font-bold text-amber-700">🎮 遊戲時間</h2>
            <p className="mt-1 text-sm text-zinc-500">
              平日累積 {summary.game_time.weekday_total} 分 → 週末加碼建議{" "}
              <span className="font-bold text-rose-600">
                {summary.game_time.weekend_bonus_suggested}
              </span>{" "}
              分鐘
            </p>
            <WeeklyUsageStepper
              profileId={id}
              todayDate={todayIso}
              todayUsed={todayUsed}
              weekUsed={summary.game_time.used_total}
              weekEarned={summary.game_time.earned_total}
            />
          </section>
        </div>

        <section className="mt-6 rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
          <h2 className="text-lg font-bold text-amber-700">📅 每日明細</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-zinc-500">
                <tr>
                  <th className="py-1 text-left">日期</th>
                  <th className="py-1 text-right">作業</th>
                  <th className="py-1 text-right">獲得</th>
                  <th className="py-1 text-right">使用</th>
                </tr>
              </thead>
              <tbody>
                {summary.dates.map((date, i) => {
                  const hw = summary.homework.per_day[i];
                  const earned = summary.game_time.earned_by_day[i].minutes;
                  const used = summary.game_time.used_by_day[i].minutes;
                  return (
                    <tr key={date} className="border-t border-amber-50">
                      <td className="py-2 text-zinc-700">
                        {date} ({DAY_LABELS[i]})
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {hw.total === 0 ? "—" : `${hw.done}/${hw.total}`}
                      </td>
                      <td className="py-2 text-right tabular-nums text-emerald-700">
                        +{earned}
                      </td>
                      <td className="py-2 text-right tabular-nums text-rose-600">
                        −{used}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
