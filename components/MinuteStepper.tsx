"use client";

import { useState } from "react";

export function MinuteStepper({
  value,
  min = 2,
  max = 30,
  step = 1,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);

  async function bump(delta: number) {
    if (disabled || pending) return;
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    setPending(true);
    try {
      await onChange(next);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => bump(-step)}
        disabled={disabled || pending || value <= min}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-2xl font-bold text-amber-700 disabled:opacity-40"
        aria-label="減少"
      >
        −
      </button>
      <span className="min-w-[3rem] text-center text-xl font-bold tabular-nums text-zinc-800">
        {value}
        <span className="ml-0.5 text-xs font-normal text-zinc-500">分</span>
      </span>
      <button
        type="button"
        onClick={() => bump(step)}
        disabled={disabled || pending || value >= max}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-2xl font-bold text-amber-700 disabled:opacity-40"
        aria-label="增加"
      >
        +
      </button>
    </div>
  );
}
