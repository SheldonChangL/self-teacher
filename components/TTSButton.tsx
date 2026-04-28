"use client";

import { useEffect, useRef, useState } from "react";

const CJK = /[㐀-鿿豈-﫿　-〿＀-￯]/;

function chunkByLang(text: string): { text: string; lang: string }[] {
  // Split into sentences and group by detected language to avoid switching
  // voices mid-word.
  const sentences = text
    .split(/(?<=[。！？!?\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: { text: string; lang: string }[] = [];
  for (const s of sentences) {
    const lang = CJK.test(s) ? "zh-TW" : "en-US";
    const last = out[out.length - 1];
    if (last && last.lang === lang) last.text += " " + s;
    else out.push({ text: s, lang });
  }
  return out;
}

export function TTSButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window)
        window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  function start() {
    window.speechSynthesis.cancel();
    const stripped = text
      .replace(/[#*`_>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const chunks = chunkByLang(stripped);
    const queue = chunks.map((c) => {
      const u = new SpeechSynthesisUtterance(c.text);
      u.lang = c.lang;
      u.rate = 0.95;
      u.pitch = 1.05;
      return u;
    });
    queueRef.current = queue;
    setPlaying(true);
    let i = 0;
    const next = () => {
      if (i >= queue.length) {
        setPlaying(false);
        return;
      }
      const u = queue[i++];
      u.onend = next;
      u.onerror = next;
      window.speechSynthesis.speak(u);
    };
    next();
  }

  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  return (
    <button
      onClick={playing ? stop : start}
      className="rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-sky-600"
    >
      {playing ? "⏹ 停止朗讀" : "🔊 朗讀給我聽"}
    </button>
  );
}
