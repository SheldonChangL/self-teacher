"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "我正在認真看你的照片喔～ 🔍",
  "嗯嗯…我發現了好東西！",
  "讓我想一下要怎麼跟你說最有趣 ✨",
  "馬上就好，等我一下下！",
  "Looking carefully at your photos…",
];

export function LoadingMascot({ message }: { message?: string }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="text-8xl animate-mascot select-none">🦊</div>
      <div className="mt-6 max-w-xs rounded-3xl bg-white px-5 py-3 text-center text-zinc-700 shadow-md ring-1 ring-amber-100">
        {message ?? TIPS[idx]}
      </div>
    </div>
  );
}
