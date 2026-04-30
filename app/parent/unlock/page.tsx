"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UnlockPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/parent";
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/parent/auth")
      .then((r) => r.json())
      .then((j) => setHasPin(!!j.has_pin))
      .catch(() => setHasPin(false));
  }, []);

  function tap(d: string) {
    if (busy) return;
    setErr(null);
    if (pin.length >= 8) return;
    setPin((p) => p + d);
  }

  function back() {
    setPin((p) => p.slice(0, -1));
    setErr(null);
  }

  async function submit() {
    if (pin.length < 4) {
      setErr("至少 4 位數");
      return;
    }
    if (hasPin === false) {
      // Set flow: ask for confirmation pin
      if (confirmPin === null) {
        setConfirmPin(pin);
        setPin("");
        return;
      }
      if (pin !== confirmPin) {
        setErr("兩次 PIN 不一樣，請重來");
        setPin("");
        setConfirmPin(null);
        return;
      }
      setBusy(true);
      const res = await fetch("/api/parent/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set", pin }),
      });
      setBusy(false);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "設定失敗");
        return;
      }
      router.push(next);
      return;
    }

    setBusy(true);
    const res = await fetch("/api/parent/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "verify", pin }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "PIN 錯誤");
      setPin("");
      return;
    }
    router.push(next);
  }

  if (hasPin === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="text-zinc-500">載入中…</p>
      </main>
    );
  }

  const phase =
    hasPin === false
      ? confirmPin === null
        ? "set"
        : "set-confirm"
      : "verify";
  const headline =
    phase === "set"
      ? "設定家長 PIN（4–8 位）"
      : phase === "set-confirm"
        ? "再輸入一次確認"
        : "輸入家長 PIN";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white/95 p-7 shadow-xl ring-1 ring-amber-100">
        <div className="text-center text-5xl">🔒</div>
        <h1 className="mt-3 text-center text-2xl font-extrabold text-amber-700">
          {headline}
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500">
          {phase === "set"
            ? "之後進入家長後台或刪除資料都需要這組 PIN"
            : phase === "set-confirm"
              ? "請再輸入一次"
              : "解鎖後可進家長後台與管理功能"}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className={`h-4 w-4 rounded-full ${
                i < pin.length ? "bg-amber-500" : "bg-zinc-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <button
              key={d}
              onClick={() => tap(d)}
              className="h-14 rounded-2xl bg-zinc-100 text-2xl font-bold text-zinc-800 hover:bg-amber-100 active:scale-95"
            >
              {d}
            </button>
          ))}
          <button
            onClick={back}
            className="h-14 rounded-2xl bg-zinc-100 text-base font-bold text-zinc-500 hover:bg-rose-100 active:scale-95"
          >
            ⌫
          </button>
          <button
            onClick={() => tap("0")}
            className="h-14 rounded-2xl bg-zinc-100 text-2xl font-bold text-zinc-800 hover:bg-amber-100 active:scale-95"
          >
            0
          </button>
          <button
            onClick={submit}
            disabled={busy || pin.length < 4}
            className="h-14 rounded-2xl bg-amber-500 text-base font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50 active:scale-95"
          >
            {busy ? "…" : "OK"}
          </button>
        </div>

        {err && (
          <p className="mt-3 text-center text-sm text-rose-600">{err}</p>
        )}
      </div>
    </main>
  );
}
