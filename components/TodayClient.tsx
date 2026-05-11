"use client";

import { useEffect, useMemo, useState } from "react";

type Kind = "homework" | "chore" | "exercise" | "reading";
type Status = "done" | "undone" | "forgot";

type Preset = {
  id: string;
  kind: Kind;
  label: string;
  emoji: string;
  minutes_award: number;
  active: number;
  sort_order: number;
};

type Log = {
  id: string;
  profile_id: string;
  date: string;
  kind: Kind;
  preset_id: string;
  label: string;
  emoji: string;
  status: Status;
  minutes_awarded: number;
};

type TodayState = {
  date: string;
  presets: Preset[];
  logs: Log[];
  earned_minutes: number;
};

export function TodayClient({ profileId }: { profileId: string }) {
  const [state, setState] = useState<TodayState | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

  async function load() {
    const r = await fetch(`/api/kid/${profileId}/today`, { cache: "no-store" });
    if (r.ok) setState(await r.json());
  }

  async function send(preset_id: string, status: Status | "remove") {
    setBusy((s) => new Set(s).add(preset_id));
    try {
      const r = await fetch(`/api/kid/${profileId}/today`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ preset_id, status }),
      });
      if (r.ok) setState(await r.json());
    } finally {
      setBusy((s) => {
        const next = new Set(s);
        next.delete(preset_id);
        return next;
      });
    }
  }

  const byKind = useMemo(
    () => groupByKind(state?.presets ?? []),
    [state?.presets],
  );

  if (!state) {
    return (
      <div className="py-20 text-center text-zinc-500">載入中…</div>
    );
  }

  const logByPreset = new Map(state.logs.map((l) => [l.preset_id, l]));

  return (
    <div className="space-y-6 pb-32">
      <HomeworkSection
        presets={byKind.homework ?? []}
        logByPreset={logByPreset}
        busy={busy}
        onAct={send}
      />
      <ToggleSection
        title="🧹 家事幫忙"
        hint="點一下打勾，再點一下取消"
        presets={byKind.chore ?? []}
        logByPreset={logByPreset}
        busy={busy}
        onAct={send}
      />
      <ToggleSection
        title="🏃 運動"
        hint="點一下打勾，再點一下取消"
        presets={byKind.exercise ?? []}
        logByPreset={logByPreset}
        busy={busy}
        onAct={send}
      />
      <ToggleSection
        title="📖 課外讀物"
        hint="今天有讀就點一下"
        presets={byKind.reading ?? []}
        logByPreset={logByPreset}
        busy={busy}
        onAct={send}
      />

      <GameTimeBadge minutes={state.earned_minutes} />
    </div>
  );
}

function groupByKind(presets: Preset[]): Record<Kind, Preset[]> {
  const out = { homework: [], chore: [], exercise: [], reading: [] } as Record<
    Kind,
    Preset[]
  >;
  for (const p of presets) out[p.kind].push(p);
  return out;
}

function HomeworkSection({
  presets,
  logByPreset,
  busy,
  onAct,
}: {
  presets: Preset[];
  logByPreset: Map<string, Log>;
  busy: Set<string>;
  onAct: (preset_id: string, status: Status | "remove") => void;
}) {
  const includedIds = new Set(
    presets.filter((p) => logByPreset.has(p.id)).map((p) => p.id),
  );

  return (
    <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
      <h2 className="text-2xl font-extrabold text-amber-700">🏠 今日作業</h2>
      <p className="mt-1 text-sm text-zinc-500">
        先選「今天有什麼作業」，再點是完成 / 未完成 / 忘了帶。
      </p>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-zinc-700">今天有什麼作業？</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {presets.map((p) => {
            const on = includedIds.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={busy.has(p.id)}
                onClick={() => onAct(p.id, on ? "remove" : "undone")}
                className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 text-center transition disabled:opacity-50 ${
                  on
                    ? "bg-amber-500 text-white shadow"
                    : "bg-amber-50 text-zinc-700 hover:bg-amber-100"
                }`}
              >
                <span className="text-3xl">{p.emoji}</span>
                <span className="mt-1 text-sm font-semibold">{p.label}</span>
                <span className="text-[10px] opacity-80">
                  +{p.minutes_award} 分
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {includedIds.size > 0 && (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700">完成狀況</h3>
          {presets
            .filter((p) => includedIds.has(p.id))
            .map((p) => {
              const log = logByPreset.get(p.id)!;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 p-3"
                >
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="flex-1 font-semibold text-zinc-800">
                    {p.label}
                  </span>
                  <StatusButton
                    label="完成"
                    icon="✅"
                    active={log.status === "done"}
                    color="emerald"
                    onClick={() => onAct(p.id, "done")}
                    disabled={busy.has(p.id)}
                  />
                  <StatusButton
                    label="未完成"
                    icon="⭕"
                    active={log.status === "undone"}
                    color="zinc"
                    onClick={() => onAct(p.id, "undone")}
                    disabled={busy.has(p.id)}
                  />
                  <StatusButton
                    label="忘了帶"
                    icon="🎒"
                    active={log.status === "forgot"}
                    color="rose"
                    onClick={() => onAct(p.id, "forgot")}
                    disabled={busy.has(p.id)}
                  />
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}

function ToggleSection({
  title,
  hint,
  presets,
  logByPreset,
  busy,
  onAct,
}: {
  title: string;
  hint: string;
  presets: Preset[];
  logByPreset: Map<string, Log>;
  busy: Set<string>;
  onAct: (preset_id: string, status: Status | "remove") => void;
}) {
  if (presets.length === 0) return null;
  return (
    <section className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
      <h2 className="text-2xl font-extrabold text-amber-700">{title}</h2>
      <p className="mt-1 text-sm text-zinc-500">{hint}</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {presets.map((p) => {
          const on = logByPreset.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={busy.has(p.id)}
              onClick={() => onAct(p.id, on ? "remove" : "done")}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 text-center transition disabled:opacity-50 ${
                on
                  ? "bg-emerald-500 text-white shadow"
                  : "bg-amber-50 text-zinc-700 hover:bg-amber-100"
              }`}
            >
              <span className="text-3xl">{p.emoji}</span>
              <span className="mt-1 text-sm font-semibold">{p.label}</span>
              <span className="text-[10px] opacity-80">
                +{p.minutes_award} 分
              </span>
              {on && <span className="text-xs">✓ 已完成</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatusButton({
  label,
  icon,
  active,
  color,
  onClick,
  disabled,
}: {
  label: string;
  icon: string;
  active: boolean;
  color: "emerald" | "zinc" | "rose";
  onClick: () => void;
  disabled?: boolean;
}) {
  const palette: Record<string, string> = {
    emerald: active
      ? "bg-emerald-500 text-white"
      : "bg-white text-emerald-700 ring-1 ring-emerald-200",
    zinc: active
      ? "bg-zinc-600 text-white"
      : "bg-white text-zinc-700 ring-1 ring-zinc-200",
    rose: active
      ? "bg-rose-500 text-white"
      : "bg-white text-rose-700 ring-1 ring-rose-200",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${palette[color]}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function GameTimeBadge({ minutes }: { minutes: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-3">
      <div className="rounded-full bg-gradient-to-r from-amber-500 to-rose-500 px-6 py-3 text-lg font-extrabold text-white shadow-lg ring-2 ring-white">
        🎮 今日獲得 <span className="text-2xl">{minutes}</span> 分鐘遊戲時間
      </div>
    </div>
  );
}
