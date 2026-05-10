"use client";

import { useEffect, useState } from "react";

// 6–12 歲混合題庫：簡單單字、中翻英、拼字、加減乘、比大小。
// 出題池會自動把難題（乘法、長單字拼字）出現頻率壓低，所以 6 歲也玩得動，
// 12 歲也不會無聊。

type VocabEntry = { emoji: string; en: string; zh: string };

const VOCAB: VocabEntry[] = [
  { emoji: "🍎", en: "apple", zh: "蘋果" },
  { emoji: "🍌", en: "banana", zh: "香蕉" },
  { emoji: "🍇", en: "grape", zh: "葡萄" },
  { emoji: "🍊", en: "orange", zh: "橘子" },
  { emoji: "🍓", en: "strawberry", zh: "草莓" },
  { emoji: "🐱", en: "cat", zh: "貓" },
  { emoji: "🐶", en: "dog", zh: "狗" },
  { emoji: "🐰", en: "rabbit", zh: "兔子" },
  { emoji: "🐻", en: "bear", zh: "熊" },
  { emoji: "🦁", en: "lion", zh: "獅子" },
  { emoji: "🐯", en: "tiger", zh: "老虎" },
  { emoji: "🐘", en: "elephant", zh: "大象" },
  { emoji: "🐵", en: "monkey", zh: "猴子" },
  { emoji: "🐦", en: "bird", zh: "鳥" },
  { emoji: "🐟", en: "fish", zh: "魚" },
  { emoji: "🐝", en: "bee", zh: "蜜蜂" },
  { emoji: "🦋", en: "butterfly", zh: "蝴蝶" },
  { emoji: "🚗", en: "car", zh: "車子" },
  { emoji: "🚌", en: "bus", zh: "公車" },
  { emoji: "🚲", en: "bike", zh: "腳踏車" },
  { emoji: "✈️", en: "plane", zh: "飛機" },
  { emoji: "🚢", en: "ship", zh: "船" },
  { emoji: "☀️", en: "sun", zh: "太陽" },
  { emoji: "🌙", en: "moon", zh: "月亮" },
  { emoji: "⭐", en: "star", zh: "星星" },
  { emoji: "☁️", en: "cloud", zh: "雲" },
  { emoji: "🌧️", en: "rain", zh: "雨" },
  { emoji: "❄️", en: "snow", zh: "雪" },
  { emoji: "🌳", en: "tree", zh: "樹" },
  { emoji: "🌹", en: "rose", zh: "玫瑰" },
  { emoji: "🌻", en: "flower", zh: "花" },
  { emoji: "🏠", en: "house", zh: "房子" },
  { emoji: "🏫", en: "school", zh: "學校" },
  { emoji: "📖", en: "book", zh: "書" },
  { emoji: "✏️", en: "pencil", zh: "鉛筆" },
  { emoji: "💧", en: "water", zh: "水" },
  { emoji: "🥛", en: "milk", zh: "牛奶" },
  { emoji: "🍞", en: "bread", zh: "麵包" },
  { emoji: "🥚", en: "egg", zh: "蛋" },
  { emoji: "🍰", en: "cake", zh: "蛋糕" },
  { emoji: "⚽", en: "ball", zh: "球" },
  { emoji: "🎈", en: "balloon", zh: "氣球" },
  { emoji: "☂️", en: "umbrella", zh: "雨傘" },
  { emoji: "🎵", en: "music", zh: "音樂" },
  { emoji: "❤️", en: "heart", zh: "愛心" },
  { emoji: "👁️", en: "eye", zh: "眼睛" },
  { emoji: "✋", en: "hand", zh: "手" },
  { emoji: "👣", en: "foot", zh: "腳" },
];

type Round =
  | {
      kind: "vocab"; // 看 emoji 選英文
      emoji: string;
      correct: string;
      choices: string[];
    }
  | {
      kind: "translate"; // 看中文選英文
      zh: string;
      correct: string;
      choices: string[];
    }
  | {
      kind: "spell"; // 看 emoji 把字母按順序點出來
      emoji: string;
      word: string;
      letters: string[];
    }
  | {
      kind: "math-add"; // 加法
      a: number;
      b: number;
      ans: number;
      choices: number[];
    }
  | {
      kind: "math-sub"; // 減法（保證不為負）
      a: number;
      b: number;
      ans: number;
      choices: number[];
    }
  | {
      kind: "math-mul"; // 簡單乘法
      a: number;
      b: number;
      ans: number;
      choices: number[];
    }
  | {
      kind: "bigger"; // 比大小（兩位數）
      a: number;
      b: number;
    };

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildVocabChoices(correct: string): string[] {
  const distractors = pickN(
    VOCAB.filter((v) => v.en !== correct),
    3,
  ).map((v) => v.en);
  return shuffle([correct, ...distractors]);
}

function buildNumChoices(ans: number, range: number): number[] {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    // generate plausible wrong answers near `ans`
    const offset =
      Math.floor(Math.random() * range) -
      Math.floor(range / 2) +
      (Math.random() < 0.5 ? -1 : 1);
    const w = Math.max(0, ans + (offset === 0 ? 1 : offset));
    if (w !== ans) wrongs.add(w);
  }
  return shuffle([ans, ...wrongs]);
}

function newRound(): Round {
  const k = Math.random();

  // 20% — vocab: 看 emoji 選英文
  if (k < 0.2) {
    const v = pick(VOCAB);
    return {
      kind: "vocab",
      emoji: v.emoji,
      correct: v.en,
      choices: buildVocabChoices(v.en),
    };
  }

  // 15% — translate: 看中文選英文
  if (k < 0.35) {
    const v = pick(VOCAB);
    return {
      kind: "translate",
      zh: v.zh,
      correct: v.en,
      choices: buildVocabChoices(v.en),
    };
  }

  // 15% — spell: 看 emoji 按順序點字母（限制單字長度避免太難）
  if (k < 0.5) {
    const candidates = VOCAB.filter(
      (v) => v.en.length >= 3 && v.en.length <= 5,
    );
    const v = pick(candidates);
    const distractorLetters = pickN(
      "abcdefghijklmnopqrstuvwxyz"
        .split("")
        .filter((c) => !v.en.includes(c)),
      Math.max(0, 6 - v.en.length),
    );
    return {
      kind: "spell",
      emoji: v.emoji,
      word: v.en,
      letters: shuffle([...v.en.split(""), ...distractorLetters]),
    };
  }

  // 20% — addition: a + b ≤ 20
  if (k < 0.7) {
    const a = 1 + Math.floor(Math.random() * 12);
    const b = 1 + Math.floor(Math.random() * Math.min(12, 20 - a));
    return {
      kind: "math-add",
      a,
      b,
      ans: a + b,
      choices: buildNumChoices(a + b, 6),
    };
  }

  // 15% — subtraction: a ≥ b
  if (k < 0.85) {
    const a = 3 + Math.floor(Math.random() * 18); // 3..20
    const b = Math.floor(Math.random() * a); // 0..a-1
    return {
      kind: "math-sub",
      a,
      b,
      ans: a - b,
      choices: buildNumChoices(a - b, 5),
    };
  }

  // 10% — multiplication: 1..5 × 1..9
  if (k < 0.95) {
    const a = 1 + Math.floor(Math.random() * 5);
    const b = 1 + Math.floor(Math.random() * 9);
    return {
      kind: "math-mul",
      a,
      b,
      ans: a * b,
      choices: buildNumChoices(a * b, 8),
    };
  }

  // 5% — bigger: 兩位數比大小
  let a = 10 + Math.floor(Math.random() * 90);
  let b = 10 + Math.floor(Math.random() * 90);
  while (a === b) b = 10 + Math.floor(Math.random() * 90);
  return { kind: "bigger", a, b };
}

export function WaitGame({ message }: { message?: string }) {
  const [round, setRound] = useState<Round | null>(null);
  const [score, setScore] = useState(0);
  const [shake, setShake] = useState<string | number | null>(null);
  const [hit, setHit] = useState<string | number | null>(null);
  const [spellProgress, setSpellProgress] = useState<string[]>([]);
  const [spellWrong, setSpellWrong] = useState<string | null>(null);

  useEffect(() => {
    if (!round) setRound(newRound());
  }, [round]);

  const next = () => {
    setHit(null);
    setShake(null);
    setSpellProgress([]);
    setSpellWrong(null);
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

  function handleSpellLetter(letter: string, idxInLetters: number) {
    if (round?.kind !== "spell") return;
    if (hit !== null) return;
    const expected = round.word[spellProgress.length];
    if (letter === expected) {
      const nextProgress = [...spellProgress, `${letter}@${idxInLetters}`];
      setSpellProgress(nextProgress);
      if (nextProgress.length === round.word.length) {
        setHit("__spelled__");
        setScore((s) => s + 1);
        setTimeout(next, 700);
      }
    } else {
      setSpellWrong(`${letter}@${idxInLetters}`);
      setTimeout(() => setSpellWrong(null), 400);
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

      {round?.kind === "vocab" && (
        <VocabRound
          round={round}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "translate" && (
        <TranslateRound
          round={round}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "spell" && (
        <SpellRound
          round={round}
          progress={spellProgress}
          wrong={spellWrong}
          done={hit === "__spelled__"}
          onLetter={handleSpellLetter}
        />
      )}

      {round?.kind === "math-add" && (
        <MathRound
          a={round.a}
          b={round.b}
          op="+"
          ans={round.ans}
          choices={round.choices}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "math-sub" && (
        <MathRound
          a={round.a}
          b={round.b}
          op="−"
          ans={round.ans}
          choices={round.choices}
          hit={hit}
          shake={shake}
          onPick={(v, ok) => handlePick(v, ok)}
        />
      )}

      {round?.kind === "math-mul" && (
        <MathRound
          a={round.a}
          b={round.b}
          op="×"
          ans={round.ans}
          choices={round.choices}
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

type Hit = string | number | null;

function VocabRound({
  round,
  hit,
  shake,
  onPick,
}: {
  round: Extract<Round, { kind: "vocab" }>;
  hit: Hit;
  shake: Hit;
  onPick: (v: string, correct: boolean) => void;
}) {
  return (
    <>
      <p className="text-base font-bold text-amber-700">
        這個英文怎麼說？
      </p>
      <div className="text-7xl">{round.emoji}</div>
      <div className="grid grid-cols-2 gap-3">
        {round.choices.map((w) => {
          const correct = w === round.correct;
          const isHit = hit === w && correct;
          const isShake = shake === w;
          return (
            <button
              key={w}
              onClick={() => onPick(w, correct)}
              className={`min-w-[7rem] rounded-2xl bg-amber-50 px-4 py-3 text-lg font-bold text-amber-700 shadow-sm ring-2 ring-amber-100 transition active:scale-95 ${
                isHit ? "scale-110 bg-emerald-100 ring-emerald-400" : ""
              } ${isShake ? "animate-shake bg-rose-100 ring-rose-400" : ""}`}
            >
              {w}
            </button>
          );
        })}
      </div>
    </>
  );
}

function TranslateRound({
  round,
  hit,
  shake,
  onPick,
}: {
  round: Extract<Round, { kind: "translate" }>;
  hit: Hit;
  shake: Hit;
  onPick: (v: string, correct: boolean) => void;
}) {
  return (
    <>
      <p className="text-base font-bold text-amber-700">
        哪一個是「{round.zh}」？
      </p>
      <div className="grid grid-cols-2 gap-3">
        {round.choices.map((w) => {
          const correct = w === round.correct;
          const isHit = hit === w && correct;
          const isShake = shake === w;
          return (
            <button
              key={w}
              onClick={() => onPick(w, correct)}
              className={`min-w-[7rem] rounded-2xl bg-amber-50 px-4 py-3 text-lg font-bold text-amber-700 shadow-sm ring-2 ring-amber-100 transition active:scale-95 ${
                isHit ? "scale-110 bg-emerald-100 ring-emerald-400" : ""
              } ${isShake ? "animate-shake bg-rose-100 ring-rose-400" : ""}`}
            >
              {w}
            </button>
          );
        })}
      </div>
    </>
  );
}

function SpellRound({
  round,
  progress,
  wrong,
  done,
  onLetter,
}: {
  round: Extract<Round, { kind: "spell" }>;
  progress: string[];
  wrong: string | null;
  done: boolean;
  onLetter: (letter: string, idx: number) => void;
}) {
  // progress contains entries like "c@2" — letter + the index in `letters` it came from
  const usedIdx = new Set(progress.map((p) => p.split("@")[1]));
  const placedLetters = progress.map((p) => p.split("@")[0]);

  return (
    <>
      <p className="text-base font-bold text-amber-700">把字母拼出來！</p>
      <div className="text-7xl">{round.emoji}</div>
      <div className="flex gap-1">
        {round.word.split("").map((_, i) => {
          const filled = placedLetters[i];
          return (
            <span
              key={i}
              className={`flex h-12 w-10 items-center justify-center rounded-lg border-2 text-2xl font-extrabold transition ${
                filled
                  ? done
                    ? "border-emerald-400 bg-emerald-100 text-emerald-700"
                    : "border-amber-400 bg-amber-100 text-amber-700"
                  : "border-zinc-300 bg-white text-zinc-300"
              }`}
            >
              {filled ?? "_"}
            </span>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {round.letters.map((l, i) => {
          const used = usedIdx.has(String(i));
          const isWrong = wrong === `${l}@${i}`;
          return (
            <button
              key={`${l}-${i}`}
              onClick={() => onLetter(l, i)}
              disabled={used || done}
              className={`h-12 w-12 rounded-xl text-xl font-extrabold uppercase shadow-sm ring-2 transition active:scale-90 ${
                used
                  ? "bg-zinc-100 text-zinc-300 ring-zinc-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100"
              } ${isWrong ? "animate-shake bg-rose-100 ring-rose-400 text-rose-700" : ""}`}
            >
              {l}
            </button>
          );
        })}
      </div>
    </>
  );
}

function MathRound({
  a,
  b,
  op,
  ans,
  choices,
  hit,
  shake,
  onPick,
}: {
  a: number;
  b: number;
  op: "+" | "−" | "×";
  ans: number;
  choices: number[];
  hit: Hit;
  shake: Hit;
  onPick: (v: number, correct: boolean) => void;
}) {
  return (
    <>
      <p className="text-base font-bold text-amber-700">算一算</p>
      <div className="rounded-3xl bg-amber-50 px-8 py-4 ring-2 ring-amber-200">
        <span className="text-5xl font-extrabold text-amber-700">
          {a} <span className="mx-2">{op}</span> {b}{" "}
          <span className="mx-2">=</span> ?
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {choices.map((n) => {
          const correct = n === ans;
          const isHit = hit === n && correct;
          const isShake = shake === n;
          return (
            <button
              key={n}
              onClick={() => onPick(n, correct)}
              className={`h-16 min-w-[6rem] rounded-2xl bg-amber-50 text-3xl font-extrabold text-amber-700 shadow-sm ring-2 ring-amber-100 transition active:scale-90 ${
                isHit ? "scale-110 bg-emerald-100 ring-emerald-400" : ""
              } ${isShake ? "animate-shake bg-rose-100 ring-rose-400" : ""}`}
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
}: {
  round: Extract<Round, { kind: "bigger" }>;
  hit: Hit;
  shake: Hit;
  onPick: (v: number, correct: boolean) => void;
}) {
  const bigger = round.a > round.b ? round.a : round.b;
  return (
    <>
      <p className="text-base font-bold text-amber-700">哪一個比較大？</p>
      <div className="flex gap-4">
        {[round.a, round.b].map((n) => {
          const correct = n === bigger;
          const isHit = hit === n && correct;
          const isShake = shake === n;
          return (
            <button
              key={n}
              onClick={() => onPick(n, correct)}
              className={`flex h-28 w-28 items-center justify-center rounded-3xl bg-amber-50 text-5xl font-extrabold text-amber-700 shadow ring-2 ring-amber-100 transition active:scale-90 ${
                isHit ? "scale-110 bg-emerald-100 ring-emerald-400" : ""
              } ${isShake ? "animate-shake bg-rose-100 ring-rose-400" : ""}`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </>
  );
}
