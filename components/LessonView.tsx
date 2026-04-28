"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Markdown } from "@/components/Markdown";
import { LoadingMascot } from "@/components/LoadingMascot";
import { TTSButton } from "@/components/TTSButton";
import { BackLink } from "@/components/BackLink";

type State = "loading" | "streaming" | "done" | "error";

export function LessonView({
  kidId,
  sessionId,
  initialText,
  initialDone,
}: {
  kidId: string;
  sessionId: string;
  initialText: string;
  initialDone: boolean;
}) {
  const [text, setText] = useState(initialText);
  const [state, setState] = useState<State>(initialDone ? "done" : "loading");
  const [err, setErr] = useState<string | null>(null);
  const [quizReady, setQuizReady] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    // Already cached → no need to stream.
    if (initialDone) return;
    if (startedRef.current) return;
    startedRef.current = true;

    const ctrl = new AbortController();
    (async () => {
      const res = await fetch(`/api/lessons/${sessionId}/stream`, {
        signal: ctrl.signal,
      });
      if (!res.body) {
        setErr("沒有回應");
        setState("error");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const evt of events) {
          const line = evt.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let payload: {
            ready?: boolean;
            delta?: string;
            done?: boolean;
            error?: string;
          };
          try {
            payload = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.error) {
            setErr(payload.error);
            setState("error");
          } else if (payload.delta) {
            setState("streaming");
            setText((t) => t + payload.delta);
          } else if (payload.done) {
            setState("done");
          } else if (payload.ready) {
            setState("streaming");
          }
        }
      }
    })().catch((e) => {
      if (ctrl.signal.aborted) return;
      setErr(String(e));
      setState("error");
    });

    return () => ctrl.abort();
  }, [sessionId, initialDone]);

  // Poll quiz readiness once lesson is done
  useEffect(() => {
    if (state !== "done") return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await fetch(`/api/quizzes/${sessionId}`);
        if (r.ok) {
          const j = await r.json();
          if (j.status === "done") {
            setQuizReady(true);
            return;
          }
          if (j.status === "error") {
            await fetch(`/api/quizzes/${sessionId}/start`, { method: "POST" });
          }
        }
      } catch {}
      timer = setTimeout(tick, 1500);
    };
    tick();
    return () => clearTimeout(timer);
  }, [state, sessionId]);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-2xl">
        <BackLink href={`/kid/${kidId}`}>回首頁</BackLink>

        <div className="mt-4 rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-amber-100">
          {text === "" && state !== "error" && (
            <LoadingMascot message="老師正在認真看你的照片喔～" />
          )}

          {text !== "" && (
            <>
              <Markdown source={text} />
              {state === "streaming" && (
                <span className="caret text-amber-500" />
              )}
            </>
          )}

          {state === "error" && (
            <div className="rounded-xl bg-red-50 p-4 text-red-700">
              出了點小問題：{err}
            </div>
          )}
        </div>

        {state === "done" && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <TTSButton text={text} />
            <Link
              href={`/kid/${kidId}/quiz/${sessionId}`}
              className="w-full rounded-3xl bg-gradient-to-r from-emerald-400 to-sky-400 py-5 text-center text-2xl font-bold text-white shadow-lg transition hover:scale-[1.01]"
            >
              {quizReady ? "🧠 開始小測驗！" : "🧠 開始小測驗（準備中…）"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
