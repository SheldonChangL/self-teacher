// Quick-reference 26-letter grid for Stage 1. Each letter is colour-coded
// by the lesson it appears in, so a parent can see at a glance that the
// curriculum covers the entire alphabet (q appears only via the "qu"
// digraph, per UK phonics convention — see badge under the grid).

import { PHONICS_STAGES } from "@/lib/phonics-curriculum";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

const LESSON_STYLES: Array<{
  match: (l: string) => boolean;
  bg: string;
  ring: string;
  label: string;
}> = [
  {
    match: (l) => "satpin".includes(l),
    bg: "bg-emerald-200 text-emerald-900",
    ring: "ring-emerald-300",
    label: "satpin",
  },
  {
    match: (l) => "mdgock".includes(l),
    bg: "bg-teal-200 text-teal-900",
    ring: "ring-teal-300",
    label: "mdgock",
  },
  {
    match: (l) => "eurhbfl".includes(l),
    bg: "bg-cyan-200 text-cyan-900",
    ring: "ring-cyan-300",
    label: "eurhbfl",
  },
  {
    match: (l) => "jvwxyz".includes(l),
    bg: "bg-sky-200 text-sky-900",
    ring: "ring-sky-300",
    label: "jvwxyzqu",
  },
];

function styleFor(letter: string) {
  for (const s of LESSON_STYLES) if (s.match(letter)) return s;
  // 'q' falls here — taught as the digraph "qu" in the jvwxyzqu lesson.
  return {
    bg: "bg-sky-200 text-sky-900",
    ring: "ring-sky-300",
    label: "jvwxyzqu (qu)",
  };
}

export function AlphabetOverview() {
  const stage1 = PHONICS_STAGES.find((s) => s.slug === "stage-1");
  if (!stage1) return null;

  return (
    <section className="mb-6 rounded-3xl bg-white p-5 shadow-md ring-1 ring-emerald-100">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-emerald-700">
          🅰️ 字母總覽 A–Z
        </h2>
        <span className="text-xs text-zinc-500">
          26 個字母 ✓ · 顏色代表所屬課程
        </span>
      </header>

      <div className="grid grid-cols-7 gap-2 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
        {ALPHABET.map((letter) => {
          const s = styleFor(letter);
          return (
            <div
              key={letter}
              title={s.label}
              className={`flex aspect-square items-center justify-center rounded-xl ${s.bg} text-xl font-extrabold uppercase ring-2 ${s.ring}`}
            >
              {letter}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        💡 英文裡 q 永遠跟 u 黏在一起（quick, queen），所以在
        <span className="font-mono"> jvwxyzqu </span>
        那一課跟其他字母一起學。
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {LESSON_STYLES.map((s) => (
          <span
            key={s.label}
            className={`rounded-full ${s.bg} px-2 py-0.5 font-mono ring-1 ${s.ring}`}
          >
            {s.label}
          </span>
        ))}
      </div>
    </section>
  );
}
