import type { Streak } from "@/lib/streak";

const DAY = ["日", "一", "二", "三", "四", "五", "六"];

export function StreakChip({ streak }: { streak: Streak }) {
  const message =
    streak.today_count > 0
      ? `🔥 連續 ${streak.current} 天，今天已經學了 ${streak.today_count} 堂！`
      : streak.current > 0
        ? `🔥 連續 ${streak.current} 天，今天再學 1 堂就 ${streak.current + 1} 天！`
        : "✨ 今天學第 1 堂就開始連續打卡！";

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white/85 px-5 py-4 ring-1 ring-amber-100 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base font-bold text-amber-700">{message}</p>
      <div className="flex gap-2">
        {streak.last7.map((d) => {
          const dow = DAY[new Date(d.date).getDay()];
          const active = d.count > 0;
          return (
            <div
              key={d.date}
              className="flex flex-col items-center"
              title={`${d.date}: ${d.count} 堂`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  active
                    ? "bg-amber-500 text-white"
                    : d.today
                      ? "border-2 border-dashed border-amber-300 text-amber-400"
                      : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {active ? "✓" : ""}
              </span>
              <span
                className={`mt-1 text-[10px] ${
                  d.today ? "font-bold text-amber-700" : "text-zinc-400"
                }`}
              >
                {dow}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
