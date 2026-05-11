"use client";

// Client-side renderer for a single phonics lesson. Receives pre-generated
// content from the server page, plus the kid/stage/lesson identifiers needed
// to mark the lesson complete on the "我學會了" tap.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PhonicsLessonContent } from "@/lib/phonics";
import { phonemeCue, phonemeCueOnly } from "@/lib/phonics-pronunciation";
import { PhonicsTTSButton } from "./PhonicsTTSButton";
import { TTSButton } from "./TTSButton";

type Props = {
  profileId: string;
  stageSlug: string;
  lessonSlug: string;
  stageTitle: string;
  lessonTitle: string;
  colorFrom: string;
  colorTo: string;
  initiallyCompleted: boolean;
  content: PhonicsLessonContent;
};

export function PhonicsLessonView({
  profileId,
  stageSlug,
  lessonSlug,
  stageTitle,
  lessonTitle,
  colorFrom,
  colorTo,
  initiallyCompleted,
  content,
}: Props) {
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [saving, setSaving] = useState(false);

  // Single big TTS pass: intro + how-to-say (per grapheme) + words + story
  // concatenated so the kid can tap once and hear the whole lesson read out.
  // We feed the engine `phonemeCueOnly(g.grapheme)` instead of the raw
  // grapheme so it pronounces /ʃ/ for "sh" instead of spelling "S-H".
  const fullScript = useMemo(() => {
    const parts: string[] = [];
    parts.push(content.intro_zh);
    for (const g of content.graphemes) {
      parts.push(`${phonemeCueOnly(g.grapheme)}. ${g.how_to_say_zh}`);
      for (const w of g.example_words) {
        parts.push(w.word + "。 " + w.meaning_zh);
      }
    }
    parts.push(content.story_zh);
    parts.push(content.story_en);
    return parts.join("\n");
  }, [content]);

  async function markComplete() {
    if (completed || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/phonics/progress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          profileId,
          stageSlug,
          lessonSlug,
        }),
      });
      if (res.ok) setCompleted(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Hero flash card */}
      <section
        className={`rounded-3xl bg-gradient-to-br ${colorFrom} ${colorTo} p-8 text-white shadow-xl`}
      >
        <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
          {stageTitle}
        </p>
        <h1 className="mt-1 text-4xl font-extrabold drop-shadow-sm sm:text-5xl">
          {lessonTitle}
        </h1>
        <div className="mt-6 flex flex-wrap gap-3">
          {content.graphemes.map((g) => (
            <span
              key={g.grapheme}
              className="rounded-2xl bg-white/25 px-5 py-3 text-3xl font-black backdrop-blur-sm sm:text-4xl"
            >
              {g.grapheme}{" "}
              <span className="text-base font-medium opacity-90">
                {g.phoneme_ipa}
              </span>
            </span>
          ))}
        </div>
        <p className="mt-5 text-lg leading-relaxed">{content.intro_zh}</p>
        {content.mnemonic_zh && (
          <p className="mt-2 inline-block rounded-2xl bg-white/20 px-4 py-2 text-base">
            💡 {content.mnemonic_zh}
          </p>
        )}
      </section>

      {/* Whole-lesson play button */}
      <TTSButton text={fullScript} />

      {/* Per-grapheme: how to say + example words */}
      {content.graphemes.map((g) => (
        <section
          key={g.grapheme}
          className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-zinc-100"
        >
          <header className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-zinc-800">
                <span className="rounded-xl bg-amber-100 px-3 py-1 text-amber-700">
                  {g.grapheme}
                </span>
                <span className="ml-3 font-mono text-xl text-zinc-500">
                  {g.phoneme_ipa}
                </span>
              </h2>
            </div>
            <PhonicsTTSButton
              text={phonemeCue(g.grapheme, g.example_words[0]?.word)}
              rate={0.7}
              ariaLabel={`念 ${g.grapheme} 的音`}
            />
          </header>

          <p className="mt-3 text-lg text-zinc-700">
            <span className="mr-2 font-semibold text-zinc-500">怎麼念：</span>
            {g.how_to_say_zh}
          </p>

          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {g.example_words.map((w) => (
              <li
                key={w.word}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4"
              >
                <span className="text-4xl">{w.emoji ?? "🔤"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-zinc-800">
                      {w.word}
                    </span>
                    <span className="font-mono text-sm text-zinc-500">
                      {w.ipa}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600">{w.meaning_zh}</div>
                </div>
                <PhonicsTTSButton text={w.word} rate={0.8} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Story */}
      <section className="rounded-3xl bg-amber-50 p-6 shadow-md ring-1 ring-amber-100">
        <h2 className="text-2xl font-extrabold text-amber-800">
          📖 小故事 Little Story
        </h2>
        <p className="mt-3 text-2xl font-bold leading-relaxed text-zinc-800">
          {content.story_en}
        </p>
        <p className="mt-2 text-lg text-zinc-600">{content.story_zh}</p>
        <div className="mt-4">
          <PhonicsTTSButton
            text={content.story_en}
            rate={0.85}
            variant="pill"
            label="念這個故事"
          />
        </div>
      </section>

      {/* Practice sentences */}
      {content.practice_sentences.length > 0 && (
        <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-zinc-100">
          <h2 className="text-2xl font-extrabold text-zinc-800">
            🗣️ 來練習說 Practice
          </h2>
          <ul className="mt-4 space-y-3">
            {content.practice_sentences.map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-semibold text-zinc-800">
                    {s.en}
                  </div>
                  <div className="text-sm text-zinc-500">{s.zh}</div>
                </div>
                <PhonicsTTSButton text={s.en} rate={0.85} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Mini quiz */}
      <MiniQuiz quiz={content.mini_quiz} />

      {/* Fun fact */}
      {content.fun_fact_zh && (
        <section className="rounded-3xl bg-violet-50 p-6 shadow-md ring-1 ring-violet-100">
          <h2 className="text-xl font-bold text-violet-800">🎉 小知識</h2>
          <p className="mt-2 text-zinc-700">{content.fun_fact_zh}</p>
        </section>
      )}

      {/* Complete + nav */}
      <div className="flex flex-col gap-3">
        {completed ? (
          <div className="rounded-3xl bg-emerald-100 py-5 text-center text-2xl font-bold text-emerald-800 ring-1 ring-emerald-200">
            ✅ 你已經學會這課了！
          </div>
        ) : (
          <button
            type="button"
            onClick={markComplete}
            disabled={saving}
            className="rounded-3xl bg-gradient-to-r from-emerald-500 to-teal-500 py-5 text-2xl font-bold text-white shadow-lg transition hover:scale-[1.02] disabled:opacity-60"
          >
            {saving ? "儲存中…" : "🌟 我學會了！"}
          </button>
        )}
        <Link
          href={`/kid/${profileId}/phonics/${stageSlug}`}
          className="rounded-3xl bg-zinc-100 py-4 text-center text-lg font-semibold text-zinc-700 transition hover:bg-zinc-200"
        >
          回到課程清單
        </Link>
      </div>
    </div>
  );
}

function MiniQuiz({
  quiz,
}: {
  quiz: PhonicsLessonContent["mini_quiz"];
}) {
  // Index of the choice the kid has picked, per question. -1 = unanswered.
  const [picks, setPicks] = useState<number[]>(() => quiz.map(() => -1));

  if (quiz.length === 0) return null;
  const correctCount = picks.reduce(
    (n, p, i) => n + (p === quiz[i].answer_index ? 1 : 0),
    0,
  );
  const answeredCount = picks.filter((p) => p !== -1).length;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-md ring-1 ring-zinc-100">
      <header className="flex items-baseline justify-between">
        <h2 className="text-2xl font-extrabold text-zinc-800">
          🎯 小練習 Mini Quiz
        </h2>
        <span className="text-sm text-zinc-500">
          {answeredCount}/{quiz.length} 答對 {correctCount}
        </span>
      </header>

      <ol className="mt-4 space-y-5">
        {quiz.map((q, qi) => {
          const pick = picks[qi];
          const answered = pick !== -1;
          return (
            <li key={qi}>
              <p className="text-lg font-semibold text-zinc-800">
                {qi + 1}. {q.question_zh}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {q.choices.map((choice, ci) => {
                  const isPicked = pick === ci;
                  const isCorrect = ci === q.answer_index;
                  let cls =
                    "rounded-2xl border-2 px-4 py-3 text-left text-lg font-medium transition";
                  if (!answered) {
                    cls +=
                      " border-zinc-200 bg-white hover:border-sky-300 hover:bg-sky-50";
                  } else if (isPicked && isCorrect) {
                    cls += " border-emerald-400 bg-emerald-50 text-emerald-800";
                  } else if (isPicked && !isCorrect) {
                    cls += " border-rose-400 bg-rose-50 text-rose-800";
                  } else if (!isPicked && isCorrect) {
                    cls += " border-emerald-400 bg-emerald-50/60 text-emerald-700";
                  } else {
                    cls += " border-zinc-200 bg-zinc-50 text-zinc-500";
                  }
                  return (
                    <button
                      key={ci}
                      type="button"
                      disabled={answered}
                      onClick={() => {
                        setPicks((prev) => {
                          const next = [...prev];
                          next[qi] = ci;
                          return next;
                        });
                      }}
                      className={cls}
                    >
                      {answered && isCorrect && "✓ "}
                      {answered && isPicked && !isCorrect && "✗ "}
                      {choice}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
