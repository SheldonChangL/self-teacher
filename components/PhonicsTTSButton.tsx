"use client";

// Small speaker button for phonics: speaks a single English word / short
// phrase in a British voice. Used next to every example word and every
// practice sentence in the phonics lesson page.

import { useEffect, useState } from "react";
import { pickGBVoice } from "./tts-voices";

type Variant = "icon" | "pill";

export function PhonicsTTSButton({
  text,
  rate = 0.85,
  label,
  variant = "icon",
  ariaLabel,
}: {
  text: string;
  rate?: number;
  label?: string;
  variant?: Variant;
  /** Override accessible name — useful when `text` is a TTS cue like "shhh"
   *  but you want the button announced as "念 sh 的音". */
  ariaLabel?: string;
}) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" && "speechSynthesis" in window;
    setSupported(ok);
    if (ok) window.speechSynthesis.getVoices();
  }, []);

  if (!supported) return null;

  function speak() {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-GB";
    u.rate = rate;
    u.pitch = 1.05;
    const voice = pickGBVoice();
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={speak}
        className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700 transition hover:bg-sky-200 active:scale-95"
      >
        🔊 {label ?? "聽一次"}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? `念出 ${text}`}
      onClick={speak}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xl text-white shadow transition hover:bg-sky-600 active:scale-95"
    >
      🔊
    </button>
  );
}
