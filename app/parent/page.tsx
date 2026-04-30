import Link from "next/link";
import { getParentStats } from "@/lib/stats";
import { BackLink } from "@/components/BackLink";
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
import { SUBJECTS } from "@/lib/subjects";
import {
  ActivityBarChart,
  PieChart,
  SUBJECT_COLORS,
} from "@/components/Charts";

export const dynamic = "force-dynamic";

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

function formatRelative(ts: number | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "剛剛";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分鐘前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小時前`;
  if (diff < 7 * 86400_000) return `${Math.floor(diff / 86400_000)} 天前`;
  return new Date(ts).toLocaleDateString("zh-TW");
}

export default function ParentDashboard() {
  const stats = getParentStats();

  const hasSubjectData = stats.totals.lessons > 0;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-5xl">
        <div className="flex items-center justify-between">
          <BackLink href="/">回首頁</BackLink>
          <span className="text-xs text-zinc-400">
            最後更新：{new Date().toLocaleString("zh-TW")}
          </span>
        </div>

        <header className="mt-2">
          <h1 className="text-4xl font-extrabold text-amber-700">
            👨‍👩‍👧 家長後台
          </h1>
          <p className="mt-1 text-zinc-600">
            看看小朋友最近學了什麼、答對了多少。
          </p>
        </header>

        {/* Hero stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="小朋友" value={stats.totals.kids} icon="👧" />
          <StatCard label="學過的課" value={stats.totals.lessons} icon="📚" />
          <StatCard label="完成測驗" value={stats.totals.quizzes} icon="🧠" />
          <StatCard
            label="近 7 天活動"
            value={stats.activity_by_day
              .filter((d) => Date.now() - new Date(d.date).getTime() < 7 * 86400_000)
              .reduce((a, b) => a + b.count, 0)}
            icon="📈"
          />
        </div>

        {/* Activity chart */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-700">
            📅 近 30 天活動
          </h2>
          <div className="mt-3 rounded-2xl bg-white/80 p-4 ring-1 ring-amber-100">
            <ActivityBarChart data={stats.activity_by_day} days={30} />
          </div>
        </section>

        {/* Subject pie + ranking */}
        {hasSubjectData && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-700">
              📊 科目分佈
            </h2>
            <div className="mt-3 rounded-2xl bg-white/80 p-5 ring-1 ring-amber-100">
              <PieChart
                slices={SUBJECTS.map((s) => ({
                  ...s,
                  count: stats.totals.by_subject[s.id],
                  color: SUBJECT_COLORS[s.id],
                }))}
              />
            </div>
          </section>
        )}

        {/* Per-kid cards */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-700">
            👶 每位小朋友的狀況
          </h2>
          {stats.kids.length === 0 ? (
            <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-zinc-600">
              還沒有小朋友的資料～
              <Link href="/profile/new" className="text-amber-700 underline">
                建立第一個 profile
              </Link>
            </p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {stats.kids.map((k) => (
                <div
                  key={k.id}
                  data-testid={`kid-card-${k.id}`}
                  className="rounded-3xl bg-white/90 p-5 shadow-sm ring-1 ring-amber-100 transition hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{k.avatar}</span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-zinc-800">
                        {k.name}
                      </h3>
                      <p className="text-sm text-zinc-500">
                        {k.age} 歲・最後活動 {formatRelative(k.last_activity_at)}
                      </p>
                    </div>
                    <ProfileSettingsModal
                      profile={{
                        id: k.id,
                        name: k.name,
                        avatar: k.avatar,
                        age: k.age,
                        lang_pref: k.lang_pref,
                      }}
                    />
                    <Link
                      href={`/parent/${k.id}`}
                      className="text-sm text-amber-700 hover:underline"
                    >
                      看詳情 →
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <MiniStat
                      label="學過"
                      value={k.lessons_total}
                      hint="堂課"
                    />
                    <MiniStat
                      label="測驗"
                      value={k.quizzes_taken}
                      hint="次"
                    />
                    <MiniStat
                      label="平均分"
                      value={
                        k.avg_score !== null ? k.avg_score.toFixed(1) : "—"
                      }
                      hint="/ 5"
                    />
                  </div>
                  {k.recent.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-zinc-500">最近：</p>
                      <ul className="mt-1 space-y-1 text-sm">
                        {k.recent.slice(0, 3).map((r) => {
                          const subj =
                            SUBJECT_BY_ID[r.subject] ?? SUBJECT_BY_ID.free;
                          return (
                            <li
                              key={r.id}
                              className="flex items-center gap-2 truncate"
                            >
                              <span className="shrink-0">{subj.icon}</span>
                              <span className="truncate text-zinc-700">
                                {r.title}
                              </span>
                              {r.score !== null && (
                                <span className="ml-auto shrink-0 rounded-full bg-emerald-100 px-2 text-xs text-emerald-700">
                                  {r.score}/5
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: string;
}) {
  return (
    <div className="rounded-3xl bg-white/90 p-4 text-center shadow-sm ring-1 ring-amber-100">
      <div className="text-3xl">{icon}</div>
      <div className="mt-1 text-3xl font-extrabold text-amber-700">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-amber-50 px-2 py-2">
      <div className="text-lg font-bold text-amber-700">
        {value}
        <span className="ml-0.5 text-xs font-normal text-zinc-500">{hint}</span>
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
