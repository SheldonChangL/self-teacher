"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WeeklyUsageStepper({
  profileId,
  todayDate,
  todayUsed,
  weekUsed,
  weekEarned,
}: {
  profileId: string;
  todayDate: string;
  todayUsed: number;
  weekUsed: number;
  weekEarned: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [optimisticToday, setOptimisticToday] = useState(todayUsed);
  const [optimisticWeek, setOptimisticWeek] = useState(weekUsed);

  async function add(delta: number) {
    if (busy) return;
    setBusy(true);
    setOptimisticToday((v) => Math.max(0, v + delta));
    setOptimisticWeek((v) => Math.max(0, v + delta));
    try {
      await fetch(`/api/parent/${profileId}/game-time`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: todayDate, minutes: delta }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const remaining = Math.max(0, weekEarned - optimisticWeek);

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2 text-center">
        <Cell label="本週累積" value={weekEarned} />
        <Cell label="已使用" value={optimisticWeek} />
        <Cell label="剩餘" value={remaining} highlight />
      </div>
      <div className="rounded-2xl bg-amber-50 p-3">
        <p className="text-sm text-zinc-600">
          今日 ({todayDate}) 已記錄使用：
          <span className="ml-1 font-bold text-amber-700">
            {optimisticToday} 分鐘
          </span>
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[15, 30, 60].map((m) => (
            <button
              key={m}
              type="button"
              disabled={busy}
              onClick={() => add(m)}
              className="rounded-xl bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
            >
              + 使用 {m} 分
            </button>
          ))}
          <button
            type="button"
            disabled={busy || optimisticToday <= 0}
            onClick={() => add(-Math.min(15, optimisticToday))}
            className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-200 disabled:opacity-50"
          >
            − 退回 15 分
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 ${
        highlight ? "bg-amber-100" : "bg-amber-50"
      }`}
    >
      <div className="text-2xl font-extrabold text-amber-700 tabular-nums">
        {value}
        <span className="ml-1 text-xs font-normal text-zinc-500">分</span>
      </div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}
