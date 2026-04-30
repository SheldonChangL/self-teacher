"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function CostHero({
  monthUsd,
  budgetUsd,
  dailyLimit,
}: {
  monthUsd: number;
  budgetUsd: number;
  dailyLimit: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [budget, setBudget] = useState(budgetUsd);
  const [limit, setLimit] = useState(dailyLimit);
  const [busy, startTransition] = useTransition();

  const pct = Math.min(100, (monthUsd / Math.max(0.01, budgetUsd)) * 100);
  const tone =
    pct < 60
      ? "bg-emerald-400"
      : pct < 90
        ? "bg-amber-400"
        : "bg-rose-500";

  function save() {
    startTransition(async () => {
      await fetch("/api/parent/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthly_budget_usd: budget,
          daily_lessons_limit: limit,
        }),
      });
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-amber-100">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">💸 本月 AI 花費</h3>
        <button
          onClick={() => setEditing((e) => !e)}
          className="text-xs text-zinc-400 hover:text-amber-700"
        >
          {editing ? "取消" : "調整 ⚙"}
        </button>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-amber-700">
          ${monthUsd.toFixed(2)}
        </span>
        <span className="text-sm text-zinc-500">/ ${budgetUsd.toFixed(2)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        每位小朋友每天最多 {dailyLimit} 堂課
      </p>

      {editing && (
        <div className="mt-3 space-y-3 border-t border-zinc-100 pt-3">
          <label className="block text-sm">
            <span className="text-zinc-700">月預算（美金）</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-700">每天每位小朋友最多堂數</span>
            <input
              type="number"
              min={1}
              max={50}
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-amber-200 px-3 py-1.5 text-sm outline-none focus:border-amber-400"
            />
          </label>
          <button
            onClick={save}
            disabled={busy}
            className="w-full rounded-xl bg-amber-500 py-2 text-sm font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50"
          >
            {busy ? "儲存中…" : "儲存"}
          </button>
        </div>
      )}
    </div>
  );
}
