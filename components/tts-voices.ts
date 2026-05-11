"use client";

// Browser SpeechSynthesis voice picker for British English.
//
// `speechSynthesis.getVoices()` returns an empty list synchronously on first
// load in some browsers (notably Chrome); it populates after a `voiceschanged`
// event fires. Callers should `getVoices()` once on mount to nudge the load,
// then `pickGBVoice()` each time they want to speak.

const GB_VOICE_PREFERENCES = [
  // macOS / iOS bundled voices
  "Daniel",
  "Kate",
  "Serena",
  "Arthur",
  "Oliver",
  "Stephanie",
  // Chrome / Google
  "Google UK English Female",
  "Google UK English Male",
  // Microsoft Edge
  "Microsoft Sonia",
  "Microsoft Ryan",
  "Microsoft Libby",
];

export function pickGBVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const gb = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith("en-gb"));
  for (const name of GB_VOICE_PREFERENCES) {
    const hit = gb.find((v) => v.name.includes(name));
    if (hit) return hit;
  }
  // Any en-GB voice is better than falling back to en-US.
  if (gb.length > 0) return gb[0];
  // No en-GB voice installed; let the browser fall back via `lang = en-GB`.
  return null;
}
