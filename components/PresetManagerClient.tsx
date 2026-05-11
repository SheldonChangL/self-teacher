"use client";

import { useEffect, useState } from "react";
import { MinuteStepper } from "./MinuteStepper";

type Kind = "homework" | "chore" | "exercise" | "reading";

type Preset = {
  id: string;
  kind: Kind;
  label: string;
  emoji: string;
  minutes_award: number;
  active: number;
  is_builtin: number;
};

const KIND_LABELS: Record<Kind, { name: string; emoji: string }> = {
  homework: { name: "作業", emoji: "🏠" },
  chore: { name: "家事", emoji: "🧹" },
  exercise: { name: "運動", emoji: "🏃" },
  reading: { name: "課外讀物", emoji: "📖" },
};

export function PresetManagerClient({
  initialBonus,
}: {
  initialBonus: { pct: number; min: number; max: number };
}) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activeKind, setActiveKind] = useState<Kind>("homework");
  const [bonus, setBonus] = useState(initialBonus);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/parent/presets", { cache: "no-store" });
      if (r.ok) {
        const data = (await r.json()) as { presets: Preset[] };
        setPresets(data.presets);
      }
    } finally {
      setLoading(false);
    }
  }

  async function patchPreset(id: string, patch: Partial<Preset>) {
    const r = await fetch(`/api/parent/presets/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) {
      const data = (await r.json()) as { preset: Preset };
      setPresets((prev) =>
        prev.map((p) => (p.id === id ? data.preset : p)),
      );
    }
  }

  async function deletePresetItem(id: string) {
    if (!confirm("確定刪除這個項目？")) return;
    const r = await fetch(`/api/parent/presets/${id}`, { method: "DELETE" });
    if (r.ok) {
      setPresets((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function saveBonus(next: { pct: number; min: number; max: number }) {
    setBonus(next);
    await fetch("/api/parent/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        weekend_bonus_pct: next.pct,
        weekend_bonus_min: next.min,
        weekend_bonus_max: next.max,
      }),
    });
  }

  const visible = presets.filter((p) => p.kind === activeKind);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(KIND_LABELS) as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setActiveKind(k)}
            className={`rounded-2xl px-4 py-2 text-base font-semibold transition ${
              activeKind === k
                ? "bg-amber-500 text-white shadow"
                : "bg-amber-50 text-zinc-700 hover:bg-amber-100"
            }`}
          >
            {KIND_LABELS[k].emoji} {KIND_LABELS[k].name}
          </button>
        ))}
      </div>

      <div className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
        {loading ? (
          <p className="py-6 text-center text-zinc-500">載入中…</p>
        ) : (
          <ul className="divide-y divide-amber-100">
            {visible.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 py-3"
              >
                <span className="text-3xl">{p.emoji}</span>
                <span className="flex-1 text-lg font-semibold text-zinc-800">
                  {p.label}
                  {!p.is_builtin && (
                    <span className="ml-2 rounded bg-sky-100 px-2 text-xs font-normal text-sky-700">
                      自訂
                    </span>
                  )}
                </span>
                <MinuteStepper
                  value={p.minutes_award}
                  min={2}
                  max={30}
                  onChange={(n) => patchPreset(p.id, { minutes_award: n })}
                />
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!p.active}
                    onChange={(e) =>
                      patchPreset(p.id, { active: e.target.checked ? 1 : 0 })
                    }
                    className="h-5 w-5"
                  />
                  <span className="text-sm text-zinc-700">啟用</span>
                </label>
                {!p.is_builtin && (
                  <button
                    type="button"
                    onClick={() => deletePresetItem(p.id)}
                    className="rounded-lg bg-rose-50 px-3 py-1 text-sm text-rose-700 hover:bg-rose-100"
                  >
                    刪除
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          {showAdd ? "取消" : "＋ 新增自訂項目"}
        </button>
        {showAdd && (
          <AddPresetForm
            kind={activeKind}
            onAdded={(p) => {
              setPresets((prev) => [...prev, p]);
              setShowAdd(false);
            }}
          />
        )}
      </div>

      <div className="rounded-3xl bg-white/90 p-5 ring-1 ring-amber-100">
        <h2 className="text-xl font-bold text-amber-700">🎁 週末加碼設定</h2>
        <p className="mt-1 text-sm text-zinc-500">
          週六、日的額外遊戲時間，依平日一~五累積分鐘換算。
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <BonusField
            label="平日總分 ×"
            suffix="%"
            value={bonus.pct}
            min={0}
            max={100}
            onChange={(v) => saveBonus({ ...bonus, pct: v })}
          />
          <BonusField
            label="最少"
            suffix="分"
            value={bonus.min}
            min={0}
            max={120}
            onChange={(v) => saveBonus({ ...bonus, min: v })}
          />
          <BonusField
            label="最多"
            suffix="分"
            value={bonus.max}
            min={0}
            max={240}
            onChange={(v) => saveBonus({ ...bonus, max: v })}
          />
        </div>
      </div>
    </div>
  );
}

function BonusField({
  label,
  suffix,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-sm text-zinc-600">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="min-w-[3rem] text-right text-lg font-bold tabular-nums text-amber-700">
          {value}
          <span className="ml-0.5 text-xs font-normal text-zinc-500">
            {suffix}
          </span>
        </span>
      </div>
    </div>
  );
}

function AddPresetForm({
  kind,
  onAdded,
}: {
  kind: Kind;
  onAdded: (p: Preset) => void;
}) {
  const [label, setLabel] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [minutes, setMinutes] = useState(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/parent/presets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, label, emoji, minutes_award: minutes }),
      });
      if (r.ok) {
        const data = (await r.json()) as { preset: Preset };
        onAdded(data.preset);
        setLabel("");
        setEmoji("⭐");
        setMinutes(5);
      } else {
        const data = await r.json().catch(() => ({}));
        setError(data.error ?? "新增失敗");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-emerald-50 p-3"
    >
      <label className="flex flex-col text-sm">
        <span className="text-zinc-600">Emoji</span>
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="mt-1 w-16 rounded-lg border border-emerald-200 px-2 py-1 text-center text-2xl"
          required
        />
      </label>
      <label className="flex flex-1 flex-col text-sm">
        <span className="text-zinc-600">名稱</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mt-1 rounded-lg border border-emerald-200 px-2 py-1"
          required
        />
      </label>
      <div className="flex flex-col text-sm">
        <span className="text-zinc-600">分鐘</span>
        <MinuteStepper value={minutes} onChange={(n) => setMinutes(n)} />
      </div>
      <button
        type="submit"
        disabled={saving || !label.trim() || !emoji.trim()}
        className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white disabled:opacity-50"
      >
        {saving ? "新增中…" : "新增"}
      </button>
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
