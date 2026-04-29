"use client";

import { useEffect, useState } from "react";

type Round =
  | { kind: "find"; pool: string[]; target: string }
  | { kind: "count"; emoji: string; count: number; choices: number[] }
  | { kind: "bigger"; a: number; b: number };

const ANIMALS = [
  "🐶", "🐰", "🐱", "🦊", "🐻", "🐼", "🐯", "🐵",
  "🐸", "🐧", "🦄", "🐮", "🐷", "🐹", "🐨", "🐔",
];
const FRUIT = [
  "🍎", "🍌", "🍇", "🍉", "🍓", "🍊", "🍒", "🍑",
  "🥝", "🍍", "🥭", "🍋",
];
const SHAPES = ["⭐", "❤️", "🔵", "🟢", "🟡", "🟣", "🔺", "🟦"];
const POOLS = [ANIMALS, FRUIT, SHAPES];

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function newRound(): Round {
  const k = Math.random();
  if (k < 0.55) {
    const pool = POOLS[Math.floor(Math.random() * POOLS.length)];
    const items = pickN(pool, 6);
    return {
      kind: "find",
      pool: items,
      target: items[Math.floor(Math.random() * items.length)],
    };
  }
  if (k < 0.85) {
    const pool = POOLS[Math.floor(Math.random() * POOLS.length)];
    const emoji = pool[Math.floor(Math.random() * pool.length)];
    const count = 1 + Math.floor(Math.random() * 5); // 1-5
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const w = 1 + Math.floor(Math.random() * 5);
      if (w !== count) wrongs.add(w);
    }
    const choices = [count, ...wrongs].sort(() => Math.random() - 0.5);
    return { kind: "count", emoji, count, choices };
  }
  let a = 1 + Math.floor(Math.random() * 9);
  let b = 1 + Math.floor(Math.random() * 9);
  while (a === b) b = 1 + Math.floor(Math.random() * 9);
  return { kind: "bigger", a, b };
}

export function WaitGame({ message }: { message?: string }) {
  // Start as null so SSR is deterministic; pick the first round on mount.
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState<string | number | null>(null);
  const [hit, setHit] = useState<string | number | null>(null);

  useEffect(() => {
    if (!round) setRound(newRound());
  }, [round]);

  const next = () => {
    setHit(null);
    setShake(null);
    setRound(newRound());
  };

  function handlePick(value: string | number, correct: boolean) {
    if (hit !== null) return;
    if (correct) {
      setHit(value);
      setScore((s) => s + 1);
      setTimeout(next, 600);
    } else {
      setShake(value);
      setTimeout(() => setShake(null), 400);
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex w-full items-center justify-between text-sm text-zinc-500">
        <span>🦊 {message ?? "老師還在認真看你的照片，邊玩邊等吧！"}</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
          ⭐ {score}
        </span>
      </div>

      {round?.kind === "find" && (
        <FindRound
          round={round}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "count" && (
        <CountRound
          round={round}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "bigger" && (
        <BiggerRound
          round={round}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round && (
        <button
          onClick={next}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          換一題 ↻
        </button>
      )}
    </div>
  );
}

type RoundProps<R> = {
  round: R;
  hit: string | number | null;
  shake: string | number | null;
  onPick: (v: string | number, correct: boolean) => void;
};

function FindRound({
  round,
  hit,
  shake,
  onPick,
}: RoundProps<Extract<Round, { kind: "find" }>>) {
  return (
    <>
      <p className="text-2xl font-extrabold text-amber-700">
        找出 <span className="text-5xl align-middle">{round.target}</span> ！
      </p>
      <div className="grid grid-cols-3 gap-3">
        {round.pool.map((e, i) => {
          const correct = e === round.target;
          const isHit = hit === e && correct;
          const isShake = shake === e;
          return (
            <button
              key={`${e}-${i}`}
              onClick={() => onPick(e, correct)}
              className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-amber-50 text-5xl shadow-sm ring-2 ring-amber-100 transition active:scale-90 ${
                isHit ? "bg-emerald-100 ring-emerald-400 scale-110" : ""
              } ${isShake ? "bg-rose-100 ring-rose-400 animate-shake" : ""}`}
            >
              {e}
            </button>
          );
        })}
      </div>
    </>
  );
}

function CountRound({
  round,
  hit,
  shake,
  onPick,
}: RoundProps<Extract<Round, { kind: "count" }>>) {
  return (
    <>
      <p className="text-xl font-bold text-amber-700">數一數有幾個？</p>
      <div className="flex max-w-xs flex-wrap items-center justify-center gap-1 rounded-3xl bg-amber-50 p-4 ring-2 ring-amber-100">
        {Array.from({ length: round.count }).map((_, i) => (
          <span key={i} className="text-4xl">
            {round.emoji}
          </span>
        ))}
      </div>
      <div className="flex gap-3">
        {round.choices.map((n) => {
          const correct = n === round.count;
          const isHit = hit === n && correct;
          const isShake = shake === n;
          return (
            <button
              key={n}
              onClick={() => onPick(n, correct)}
              className={`h-16 w-16 rounded-2xl bg-amber-50 text-3xl font-extrabold text-amber-700 shadow-sm ring-2 ring-amber-100 transition active:scale-90 ${
                isHit ? "bg-emerald-100 ring-emerald-400 scale-110" : ""
              } ${isShake ? "bg-rose-100 ring-rose-400 animate-shake" : ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </>
  );
}

function BiggerRound({
  round,
  hit,
  shake,
  onPick,
}: RoundProps<Extract<Round, { kind: "bigger" }>>) {
  const bigger = round.a > round.b ? round.a : round.b;
  return (
    <>
      <p className="text-xl font-bold text-amber-700">哪一個比較大？</p>
      <div className="flex gap-4">
        {[round.a, round.b].map((n) => {
          const correct = n === bigger;
          const isHit = hit === n && correct;
          const isShake = shake === n;
          return (
            <button
              key={n}
              onClick={() => onPick(n, correct)}
              className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-amber-50 text-6xl font-extrabold text-amber-700 shadow ring-2 ring-amber-100 transition active:scale-90 ${
                isHit ? "bg-emerald-100 ring-emerald-400 scale-110" : ""
              } ${isShake ? "bg-rose-100 ring-rose-400 animate-shake" : ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </>
  );
}
