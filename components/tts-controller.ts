"use client";

// Centralised wrapper around `window.speechSynthesis` to work around two
// well-known Web Speech API race conditions that the kids hit:
//
//   1. Silent press: Chrome / Safari drop a `speak()` call if it lands too
//      close after a `cancel()` — the engine is mid-flush and discards the
//      new utterance. Symptom: nothing happens when you press 🔊.
//
//   2. Audio bleed: `cancel()` is async in practice. The previous utterance's
//      tail keeps playing while the new one starts, so the kid hears half
//      of "sun" overlapped with "ssss".
//
//   3. Paused queue: after a cancel() the engine sometimes flips into a
//      "paused" state that silently swallows subsequent speak()s. Calling
//      `resume()` defensively before every speak() un-sticks it.
//
// Fix: serialise every speak request through a monotonically-increasing
// token. Each new request cancels the previous, waits ~60ms for the engine
// to actually drain, and only speaks if no newer request has come in.
// All TTS buttons in the app share one token so they don't race each other.

const SETTLE_MS = 60;

let globalToken = 0;

export function speakOne(u: SpeechSynthesisUtterance): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const myToken = ++globalToken;

  synth.cancel();

  setTimeout(() => {
    if (myToken !== globalToken) return; // a newer request arrived
    if (synth.paused) synth.resume();
    synth.speak(u);
  }, SETTLE_MS);
}

export type QueueHandle = {
  /** Stop the queue immediately. Safe to call multiple times. */
  stop: () => void;
};

/** Speak a chain of utterances one after another. The returned handle's
 *  `stop()` invalidates the chain so the next utterance won't fire even if
 *  the engine's `onend` arrives late. */
export function speakQueue(
  utterances: SpeechSynthesisUtterance[],
  onDone: () => void,
): QueueHandle {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onDone();
    return { stop: () => {} };
  }
  const synth = window.speechSynthesis;
  const myToken = ++globalToken;
  let stopped = false;
  let i = 0;

  const next = () => {
    if (stopped || myToken !== globalToken) return;
    if (i >= utterances.length) {
      onDone();
      return;
    }
    const u = utterances[i++];
    u.onend = next;
    // onerror also advances — we'd rather skip a bad chunk than hang.
    u.onerror = next;
    synth.speak(u);
  };

  synth.cancel();
  setTimeout(() => {
    if (stopped || myToken !== globalToken) return;
    if (synth.paused) synth.resume();
    next();
  }, SETTLE_MS);

  return {
    stop: () => {
      stopped = true;
      // Bumping the token also invalidates any other in-flight queue/single
      // requests, so a stop is a true "shut everything up".
      ++globalToken;
      synth.cancel();
    },
  };
}

/** Plain cancel without starting anything new — used by component unmount. */
export function silence(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  ++globalToken;
  window.speechSynthesis.cancel();
}
