"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { LoadingMascot } from "@/components/LoadingMascot";
import { BackLink } from "@/components/BackLink";
import type { Quiz } from "@/lib/quiz-runner";

type Result = "correct" | "wrong" | null;

export default function QuizPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = use(params);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [status, setStatus] = useState<string>("loading");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancel = false;
    const tick = async () => {
      const r = await fetch(`/api/quizzes/${sid}`);
      const j = await r.json();
      if (cancel) return;
      setStatus(j.status);
      if (j.status === "done") {
        setQuiz(j.quiz);
      } else if (j.status === "error") {
        await fetch(`/api/quizzes/${sid}/start`, { method: "POST" });
        setTimeout(tick, 2000);
      } else {
        setTimeout(tick, 1500);
      }
    };
    tick();
    return () => {
      cancel = true;
    };
  }, [sid]);

  function pick(i: number) {
    if (!quiz) return;
    if (picked !== null) return;
    setPicked(i);
    const correct = i === quiz.questions[idx].answer_index;
    setResult(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 1);
  }

  async function next() {
    if (!quiz) return;
    if (idx + 1 >= quiz.questions.length) {
      setDone(true);
      await fetch(`/api/quizzes/${sid}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score }),
      });
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    setResult(null);
  }

  if (!quiz) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-8">
        <div className="w-full max-w-xl rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-amber-100">
          <BackLink href={`/kid/${id}/lesson/${sid}`}>回課文</BackLink>
          <LoadingMascot
            message={
              status === "running" || status === "pending"
                ? "出題中…再等老師一下下！"
                : status === "error"
                  ? "出題出狀況了，再試一次..."
                  : "載入中…"
            }
          />
        </div>
      </main>
    );
  }

  if (done) {
    const total = quiz.questions.length;
    const stars = "⭐".repeat(score) + "・".repeat(total - score);
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-8">
        <div className="w-full max-w-xl rounded-3xl bg-white/90 p-8 text-center shadow-lg ring-1 ring-amber-100">
          <div className="text-7xl">🎉</div>
          <h1 className="mt-3 text-3xl font-extrabold text-amber-700">
            測驗完成！
          </h1>
          <p className="mt-3 text-2xl">{stars}</p>
          <p className="mt-2 text-lg text-zinc-700">
            答對 {score} / {total} 題
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/kid/${id}/capture`}
              className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-white shadow hover:bg-amber-600"
            >
              📷 再學一個
            </Link>
            <Link
              href={`/kid/${id}`}
              className="flex-1 rounded-2xl bg-zinc-200 py-3 font-bold text-zinc-700 hover:bg-zinc-300"
            >
              🏠 回首頁
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const q = quiz.questions[idx];
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-xl">
        <BackLink href={`/kid/${id}/lesson/${sid}`}>回課文</BackLink>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-amber-700">
            🧠 第 {idx + 1} / {quiz.questions.length} 題
          </h1>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
            ⭐ {score}
          </span>
        </div>

        <div className="mt-4 rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-amber-100">
          <p className="text-xl font-semibold text-zinc-800">{q.q_zh}</p>
          {q.q_en?.trim() && (
            <p className="mt-1 text-base italic text-zinc-500">{q.q_en}</p>
          )}

          <div className="mt-5 grid gap-3">
            {q.options.map((o, i) => {
              const isPicked = picked === i;
              const isAnswer = i === q.answer_index;
              const showResult = picked !== null;
              const cls = showResult
                ? isAnswer
                  ? "bg-emerald-100 ring-emerald-400 text-emerald-800"
                  : isPicked
                    ? "bg-rose-100 ring-rose-400 text-rose-800"
                    : "bg-zinc-50 text-zinc-500"
                : "bg-zinc-50 hover:bg-amber-100 ring-zinc-200";
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  disabled={picked !== null}
                  className={`rounded-2xl px-4 py-3 text-left text-lg font-medium ring-2 transition ${cls}`}
                >
                  {String.fromCharCode(65 + i)}. {o}
                </button>
              );
            })}
          </div>

          {result && (
            <div
              className={`mt-5 rounded-2xl p-4 ${
                result === "correct"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              <p className="font-bold">
                {result === "correct" ? "🎉 答對了！" : "💡 沒關係，看一下："}
              </p>
              <p className="mt-1">{q.explain_zh}</p>
              {q.explain_en?.trim() && (
                <p className="mt-1 italic">{q.explain_en}</p>
              )}
            </div>
          )}

          {result && (
            <button
              onClick={next}
              className="mt-5 w-full rounded-2xl bg-amber-500 py-3 text-lg font-bold text-white shadow hover:bg-amber-600"
            >
              {idx + 1 < quiz.questions.length ? "下一題 →" : "看成績 🎊"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
