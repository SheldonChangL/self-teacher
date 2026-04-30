"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import type { VocabCard } from "@/lib/vocab";

export function ReviewSession({
  kidId,
  cards,
  profileName,
}: {
  kidId: string;
  cards: VocabCard[];
  profileName: string;
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [good, setGood] = useState(0);
  const [forgot, setForgot] = useState(0);
  const [busy, setBusy] = useState(false);

  if (cards.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-xl">
          <BackLink href={`/kid/${kidId}`}>回首頁</BackLink>
          <div className="mt-6 rounded-3xl bg-white/95 p-10 text-center shadow ring-1 ring-amber-100">
            <div className="text-7xl">🎉</div>
            <h1 className="mt-3 text-3xl font-extrabold text-amber-700">
              {profileName}，今天沒有要複習的詞！
            </h1>
            <p className="mt-2 text-zinc-600">
              拍張新照片繼續學新東西吧～
            </p>
            <Link
              href={`/kid/${kidId}/capture`}
              className="mt-6 inline-block rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow"
            >
              📷 開始學新的
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const done = idx >= cards.length;
  const card = cards[Math.min(idx, cards.length - 1)];

  async function record(recall: "good" | "forgot") {
    if (busy) return;
    setBusy(true);
    await fetch(`/api/review/${kidId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ card_id: card.id, recall }),
    });
    if (recall === "good") setGood((n) => n + 1);
    else setForgot((n) => n + 1);
    setFlipped(false);
    setIdx((n) => n + 1);
    setBusy(false);
  }

  if (done) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-xl">
          <BackLink href={`/kid/${kidId}`}>回首頁</BackLink>
          <div className="mt-6 rounded-3xl bg-white/95 p-10 text-center shadow ring-1 ring-amber-100">
            <div className="text-7xl">✅</div>
            <h1 className="mt-3 text-3xl font-extrabold text-amber-700">
              複習完成！
            </h1>
            <p className="mt-3 text-lg text-zinc-700">
              ✓ 會 {good} 個・✗ 不會 {forgot} 個
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              不會的會比較快再出現給你練習。
            </p>
            <Link
              href={`/kid/${kidId}`}
              className="mt-6 inline-block rounded-2xl bg-amber-500 px-6 py-3 font-bold text-white shadow"
            >
              🏠 回首頁
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between">
          <BackLink href={`/kid/${kidId}`}>回首頁</BackLink>
          <span className="text-sm text-zinc-500">
            第 {idx + 1} / {cards.length} 個
          </span>
        </div>

        <h1 className="mt-2 text-3xl font-extrabold text-amber-700">
          📚 今日複習
        </h1>

        <button
          onClick={() => setFlipped((f) => !f)}
          className="mt-6 flex min-h-64 w-full flex-col items-center justify-center rounded-3xl bg-white/95 p-8 text-center shadow-lg ring-1 ring-amber-100 transition active:scale-[0.99]"
        >
          {!flipped ? (
            <>
              <p className="text-3xl font-extrabold text-zinc-800">
                {card.front}
              </p>
              <p className="mt-3 text-sm text-zinc-400">點一下看答案 ↓</p>
            </>
          ) : (
            <>
              <p className="text-base text-zinc-400">{card.front}</p>
              <p className="mt-2 text-2xl font-bold text-amber-700">
                {card.back}
              </p>
            </>
          )}
        </button>

        {flipped && (
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => record("forgot")}
              disabled={busy}
              className="rounded-3xl bg-rose-100 py-5 text-2xl font-bold text-rose-700 shadow hover:bg-rose-200 active:scale-95 disabled:opacity-50"
            >
              ✗ 不會
            </button>
            <button
              onClick={() => record("good")}
              disabled={busy}
              className="rounded-3xl bg-emerald-500 py-5 text-2xl font-bold text-white shadow hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
            >
              ✓ 會
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
