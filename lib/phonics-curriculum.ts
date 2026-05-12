// Phonics curriculum skeleton — hand-authored structure following the UK
// "Letters & Sounds" framework (Phases 2–6) + a final sight-words stage.
//
// AI (Gemini) is only responsible for filling in *content* (engaging stories,
// example words, mini-quizzes) for each lesson defined here — it doesn't get
// to decide scope. That keeps the curriculum predictable and reproducible.
//
// All slugs are URL-safe and stable; do NOT rename a slug once it ships,
// otherwise existing rows in phonics_lessons / phonics_progress will orphan.

export type PhonicsLessonDef = {
  slug: string;
  title: string;
  /** Target graphemes (letters / letter clusters) for this lesson. */
  graphemes: string[];
  /** Short note used in the Gemini prompt to steer example words. */
  focus: string;
};

export type PhonicsStageDef = {
  slug: string;
  order: number;
  title: string;
  emoji: string;
  description: string;
  /** Tailwind colour pair used by the UI. */
  colorFrom: string;
  colorTo: string;
  lessons: PhonicsLessonDef[];
};

export const PHONICS_STAGES: ReadonlyArray<PhonicsStageDef> = [
  {
    slug: "stage-1",
    order: 1,
    title: "字母音 Letter Sounds A–Z",
    emoji: "🔤",
    description: "完整 26 個字母 a–z 的發音（依英國 satpin 順序教學，可立刻拼出 cat / pin / tap）。",
    colorFrom: "from-emerald-400",
    colorTo: "to-teal-400",
    lessons: [
      {
        slug: "satpin",
        title: "s · a · t · p · i · n",
        graphemes: ["s", "a", "t", "p", "i", "n"],
        focus: "最常用的 6 個音，可組成 cat / pin / tap / sat / nip。",
      },
      {
        slug: "mdgock",
        title: "m · d · g · o · c · k · ck",
        graphemes: ["m", "d", "g", "o", "c", "k", "ck"],
        focus: "加入更多短音與 ck 結尾（duck, sock）。",
      },
      {
        slug: "eurhbfl",
        title: "e · u · r · h · b · f · ff · l · ll · ss",
        graphemes: ["e", "u", "r", "h", "b", "f", "ff", "l", "ll", "ss"],
        focus: "完成短母音 e/u 與雙子音結尾（ff/ll/ss）。",
      },
      {
        slug: "jvwxyzqu",
        title: "j · v · w · x · y · z · zz · qu",
        graphemes: ["j", "v", "w", "x", "y", "z", "zz", "qu"],
        focus: "剩下的字母音與 qu 字母組合。",
      },
    ],
  },
  {
    slug: "stage-2",
    order: 2,
    title: "子音字母組合 Consonant Digraphs",
    emoji: "🤝",
    description: "兩個字母拼出一個新音：sh、ch、th、ng、ph、wh。",
    colorFrom: "from-sky-400",
    colorTo: "to-cyan-400",
    lessons: [
      {
        slug: "ch-sh",
        title: "ch · sh",
        graphemes: ["ch", "sh"],
        focus: "chip / chair / ship / fish。",
      },
      {
        slug: "th-ng",
        title: "th · ng",
        graphemes: ["th (voiced)", "th (unvoiced)", "ng"],
        focus: "this (有聲) vs thin (無聲)；ring / king。",
      },
      {
        slug: "ph-wh",
        title: "ph · wh",
        graphemes: ["ph", "wh"],
        focus: "phone / photo；what / when / where。",
      },
    ],
  },
  {
    slug: "stage-3",
    order: 3,
    title: "魔術 e Magic E",
    emoji: "✨",
    description: "字尾加 e，前面的母音就變長音！cap → cape、bit → bite。",
    colorFrom: "from-violet-400",
    colorTo: "to-fuchsia-400",
    lessons: [
      {
        slug: "a-e",
        title: "a_e（cake）",
        graphemes: ["a_e"],
        focus: "cake / name / gate / lake。",
      },
      {
        slug: "i-e",
        title: "i_e（bike）",
        graphemes: ["i_e"],
        focus: "bike / time / kite / nine。",
      },
      {
        slug: "o-e",
        title: "o_e（home）",
        graphemes: ["o_e"],
        focus: "home / bone / rope / note。",
      },
      {
        slug: "u-e",
        title: "u_e（cube）",
        graphemes: ["u_e"],
        focus: "cube / tube / mule / cute。",
      },
      {
        slug: "e-e",
        title: "e_e（these）",
        graphemes: ["e_e"],
        focus: "these / complete / Pete（少見但要會認）。",
      },
    ],
  },
  {
    slug: "stage-4",
    order: 4,
    title: "母音字母組合 Vowel Teams",
    emoji: "👯",
    description: "兩個母音黏在一起當一個音：ai、ee、oa、oo、igh。",
    colorFrom: "from-amber-400",
    colorTo: "to-orange-400",
    lessons: [
      {
        slug: "ai-ay",
        title: "ai · ay",
        graphemes: ["ai", "ay"],
        focus: "rain / train；day / play。",
      },
      {
        slug: "ee-ea",
        title: "ee · ea",
        graphemes: ["ee", "ea"],
        focus: "see / tree；sea / read。",
      },
      {
        slug: "oa-ow",
        title: "oa · ow（長音）",
        graphemes: ["oa", "ow (long)"],
        focus: "boat / coat；snow / show。",
      },
      {
        slug: "oo",
        title: "oo（短音 / 長音）",
        graphemes: ["oo (short)", "oo (long)"],
        focus: "book / look（短）；moon / food（長）。",
      },
      {
        slug: "ie-igh",
        title: "ie · igh",
        graphemes: ["ie", "igh"],
        focus: "pie / tie；night / light。",
      },
    ],
  },
  {
    slug: "stage-5",
    order: 5,
    title: "R-controlled 與雙母音 Diphthongs",
    emoji: "🌀",
    description: "母音遇到 r 會變樣；oi / ou 是會「滑動」的雙母音。",
    colorFrom: "from-rose-400",
    colorTo: "to-pink-400",
    lessons: [
      {
        slug: "ar",
        title: "ar（car）",
        graphemes: ["ar"],
        focus: "car / star / park。英式 /ɑː/，嘴張大。",
      },
      {
        slug: "or",
        title: "or（fork）",
        graphemes: ["or"],
        focus: "fork / horse / sport。英式 /ɔː/。",
      },
      {
        slug: "er-ir-ur",
        title: "er · ir · ur（同音）",
        graphemes: ["er", "ir", "ur"],
        focus: "her / bird / turn — 三組拼法念起來一樣 /ɜː/。",
      },
      {
        slug: "oi-oy",
        title: "oi · oy",
        graphemes: ["oi", "oy"],
        focus: "coin / point；boy / toy。",
      },
      {
        slug: "ou-ow",
        title: "ou · ow（短音）",
        graphemes: ["ou", "ow (diphthong)"],
        focus: "house / mouse；cow / now。",
      },
    ],
  },
  {
    slug: "stage-6",
    order: 6,
    title: "常用混音 Consonant Blends",
    emoji: "🚀",
    description: "兩個或三個子音黏在一起，每個音都要念出來：bl、str、scr…",
    colorFrom: "from-lime-400",
    colorTo: "to-green-500",
    lessons: [
      {
        slug: "l-blends",
        title: "L-blends（bl, cl, fl, gl, pl）",
        graphemes: ["bl", "cl", "fl", "gl", "pl"],
        focus: "blue / clap / flag / glad / plate。",
      },
      {
        slug: "r-blends",
        title: "R-blends（br, cr, dr, fr, gr, pr, tr）",
        graphemes: ["br", "cr", "dr", "fr", "gr", "pr", "tr"],
        focus: "brown / crab / drum / frog / green / pretty / tree。",
      },
      {
        slug: "s-blends",
        title: "S-blends（st, sp, sk, sm, sn, sw）",
        graphemes: ["st", "sp", "sk", "sm", "sn", "sw"],
        focus: "star / spoon / ski / small / snow / swim。",
      },
      {
        slug: "trigraph-blends",
        title: "三字母混音（scr, spl, spr, str, thr, shr）",
        graphemes: ["scr", "spl", "spr", "str", "thr", "shr"],
        focus: "scream / splash / spring / string / three / shrimp。",
      },
    ],
  },
  {
    slug: "stage-7",
    order: 7,
    title: "進階拼字 Alternative Spellings",
    emoji: "🎩",
    description: "Phase 5 變體：y 當母音、soft c/g、-le 結尾、安靜的字母。",
    colorFrom: "from-indigo-400",
    colorTo: "to-purple-500",
    lessons: [
      {
        slug: "y-as-vowel",
        title: "y 當母音（my / happy）",
        graphemes: ["y (as long i)", "y (as long e)"],
        focus: "字尾單音節 y 當長 i（sky, fly, cry）；多音節字尾 y 當長 e（happy, sunny, baby）。",
      },
      {
        slug: "soft-cg",
        title: "soft c · soft g",
        graphemes: ["soft c", "soft g"],
        focus: "c/g 後面接 e/i/y 就變軟音：city, ice, face；gem, giant, large。",
      },
      {
        slug: "le-ending",
        title: "-le 結尾",
        graphemes: ["-le"],
        focus: "字尾不發母音的 -le：table, little, apple, bubble。",
      },
      {
        slug: "silent-letters",
        title: "安靜的字母 Silent Letters",
        graphemes: ["silent k (kn)", "silent w (wr)", "silent b (mb)", "silent gh"],
        focus: "knife, knee；write, wrong；lamb, comb；night, light（gh 不發音）。",
      },
    ],
  },
  {
    slug: "stage-8",
    order: 8,
    title: "高頻字 Sight Words",
    emoji: "⭐",
    description: "最常見、要直接「整個字背起來」的不規則或高頻單字。",
    colorFrom: "from-orange-400",
    colorTo: "to-red-500",
    lessons: [
      {
        slug: "sight-1",
        title: "Sight Words 1（the, of, to…）",
        graphemes: ["the", "of", "to", "you", "are", "was"],
        focus: "最常見但不照規則的字，整個字背起來。",
      },
      {
        slug: "sight-2",
        title: "Sight Words 2（said, have, they…）",
        graphemes: ["said", "have", "they", "one", "two", "what"],
        focus: "繼續最高頻的不規則字。",
      },
      {
        slug: "sight-3",
        title: "Sight Words 3（a, I, and, is…）",
        graphemes: ["a", "I", "and", "is", "it", "in", "on", "at"],
        focus: "超高頻的兩三字母短字，幾乎每句都會看到。",
      },
      {
        slug: "sight-4",
        title: "Sight Words 4（that, with, for…）",
        graphemes: ["that", "with", "for", "as", "his", "her", "my", "by"],
        focus: "代名詞、介系詞高頻字，閱讀必備。",
      },
    ],
  },
];

export type StageSlug = (typeof PHONICS_STAGES)[number]["slug"];

export function findStage(slug: string): PhonicsStageDef | undefined {
  return PHONICS_STAGES.find((s) => s.slug === slug);
}

export function findLesson(
  stageSlug: string,
  lessonSlug: string,
): { stage: PhonicsStageDef; lesson: PhonicsLessonDef } | undefined {
  const stage = findStage(stageSlug);
  if (!stage) return undefined;
  const lesson = stage.lessons.find((l) => l.slug === lessonSlug);
  if (!lesson) return undefined;
  return { stage, lesson };
}

export function totalLessonCount(): number {
  return PHONICS_STAGES.reduce((n, s) => n + s.lessons.length, 0);
}
