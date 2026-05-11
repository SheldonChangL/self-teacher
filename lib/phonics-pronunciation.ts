// Coax Web Speech API into producing English phonemes instead of letter names.
//
// The problem: feeding `speechSynthesis` a bare grapheme like "sh", "ch", or
// even single letters like "s" makes most engines spell out letter names
// ("ess-aitch", "ess"). Web Speech has no SSML <phoneme> support, so we can't
// just specify IPA.
//
// The trick: each grapheme in our curriculum maps to a short text designed to
// trigger the closest phoneme the engine can produce — usually an elongated
// onomatopoeic version ("shhh", "ahh") or a consonant+schwa pad ("buh",
// "tuh") that phonics teachers use when sounding letters out loud. Tested
// against Daniel & Kate on macOS and Google UK English on Chrome.
//
// When an example word is available, we append it so the kid hears the
// phoneme in context — that's also a reliable fallback if the cue itself
// gets mispronounced by an exotic voice.

const PHONEME_HINTS: Record<string, string> = {
  // -- Phase 2 single letters --
  // Stop consonants need a schwa pad to be pronounceable in isolation.
  s: "ssss",
  a: "ahh",
  t: "tuh",
  p: "puh",
  i: "ih",
  n: "nnn",
  m: "mmm",
  d: "duh",
  g: "guh",
  o: "oh",
  c: "kuh",
  k: "kuh",
  ck: "kuh",
  e: "eh",
  u: "uh",
  r: "rrr",
  h: "huh",
  b: "buh",
  f: "fff",
  ff: "fff",
  l: "lll",
  ll: "lll",
  ss: "ssss",
  j: "juh",
  v: "vvv",
  w: "wuh",
  x: "ks",
  y: "yuh",
  z: "zzz",
  zz: "zzz",
  qu: "kwuh",

  // -- Phase 3 digraphs --
  ch: "chuh",
  sh: "shhh",
  "th (voiced)": "thuh", // as in "this"
  "th (unvoiced)": "thhh", // as in "thin"
  th: "thhh",
  ng: "nng",
  ph: "fff",
  wh: "wuh",

  // -- Magic E (long vowel sounds) --
  a_e: "ay", // cake
  i_e: "eye", // bike
  o_e: "oh", // home
  u_e: "you", // cube
  e_e: "ee", // these

  // -- Vowel teams --
  ai: "ay",
  ay: "ay",
  ee: "ee",
  ea: "ee",
  oa: "oh",
  "ow (long)": "oh",
  "oo (short)": "uh", // book
  "oo (long)": "ooh", // moon
  ie: "eye",
  igh: "eye",

  // -- R-controlled (British: r usually silent post-vowel) --
  ar: "ahh", // /ɑː/
  or: "or", // /ɔː/
  er: "ur", // /ɜː/
  ir: "ur",
  ur: "ur",

  // -- Diphthongs --
  oi: "oy",
  oy: "oy",
  ou: "ow",
  "ow (diphthong)": "ow",

  // -- Phase 4 blends --
  bl: "bluh",
  cl: "kluh",
  fl: "fluh",
  gl: "gluh",
  pl: "pluh",
  br: "bruh",
  cr: "kruh",
  dr: "druh",
  fr: "fruh",
  gr: "gruh",
  pr: "pruh",
  tr: "truh",
  st: "stuh",
  sp: "spuh",
  sk: "skuh",
  sm: "smuh",
  sn: "snuh",
  sw: "swuh",

  // -- Sight words: speak as-is (no hint needed) --
  // "the", "of", "to", "you", "are", "was", "said", "have", "they", "one",
  // "two", "what" — fall through to the raw grapheme below.
};

function normalize(g: string): string {
  return g.trim().toLowerCase();
}

/** Convert a grapheme like "sh" into a TTS-friendly cue like "shhh".
 *  If `exampleWord` is given, it's appended so the phoneme is reinforced
 *  in word context (e.g. "shhh. ship"). */
export function phonemeCue(grapheme: string, exampleWord?: string): string {
  const hint = PHONEME_HINTS[normalize(grapheme)];
  if (hint) {
    return exampleWord ? `${hint}. ${exampleWord}` : hint;
  }
  // Fallback: just speak the word itself. Sight words ("the", "you") and
  // anything unknown will read naturally as whole words rather than letters.
  return exampleWord ? `${grapheme}. ${exampleWord}` : grapheme;
}

/** Lightweight grapheme-only cue (no word appended) — used in the full-lesson
 *  TTS script where we want phoneme + Chinese explanation, without re-saying
 *  example words that get spoken later. */
export function phonemeCueOnly(grapheme: string): string {
  return PHONEME_HINTS[normalize(grapheme)] ?? grapheme;
}
