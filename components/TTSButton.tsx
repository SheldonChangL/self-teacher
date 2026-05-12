"use client";

import { useEffect, useRef, useState } from "react";
import { pickGBVoice } from "./tts-voices";
import {
  silence,
  speakQueue,
  type QueueHandle,
} from "./tts-controller";

const CJK = /[㐀-鿿豈-﫿　-〿＀-￯]/;

function chunkByLang(text: string): { text: string; lang: string }[] {
  // Split into sentences and group by detected language to avoid switching
  // voices mid-word. Non-CJK chunks all get en-GB so the kid hears British
  // pronunciation throughout the app (lessons, phonics, quiz).
  const sentences = text
    .split(/(?<=[。！？!?\n])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: { text: string; lang: string }[] = [];
  for (const s of sentences) {
    const lang = CJK.test(s) ? "zh-TW" : "en-GB";
    const last = out[out.length - 1];
    if (last && last.lang === lang) last.text += " " + s;
    else out.push({ text: s, lang });
  }
  return out;
}

export function TTSButton({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing, setPlaying] = useState(false);
  const handleRef = useRef<QueueHandle | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    // Trigger an initial getVoices() so the browser starts populating the list
    // (Chrome lazy-loads voices on first read).
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      handleRef.current?.stop();
      silence();
    };
  }, []);

  if (!supported) return null;

  function start() {
    const stripped = text
      .replace(/[#*`_>]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const chunks = chunkByLang(stripped);
    const gbVoice = pickGBVoice();
    const queue = chunks.map((c, i) => {
      // Pad the final chunk so Chrome/Safari don't clip the tail consonant.
      const sentence =
        i === chunks.length - 1 && !/[。.!?！？]$/.test(c.text)
          ? c.text + ". "
          : c.text;
      const u = new SpeechSynthesisUtterance(sentence);
      u.lang = c.lang;
      u.rate = 0.95;
      u.pitch = 1.05;
      if (c.lang === "en-GB" && gbVoice) u.voice = gbVoice;
      return u;
    });
    setPlaying(true);
    handleRef.current = speakQueue(queue, () => setPlaying(false));
  }

  function stop() {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlaying(false);
  }

  return (
    <button
      onClick={playing ? stop : start}
      className="w-full rounded-3xl bg-sky-500 py-5 text-2xl font-bold text-white shadow-lg transition hover:bg-sky-600 active:scale-95"
    >
      {playing ? "⏹ 停止" : "🔊 老師念給我聽"}
    </button>
  );
}
