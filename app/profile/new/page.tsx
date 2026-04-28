"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackLink } from "@/components/BackLink";

const AVATARS = [
  "🦊",
  "🐻",
  "🐼",
  "🐨",
  "🐯",
  "🦁",
  "🐮",
  "🐷",
  "🐸",
  "🐵",
  "🐰",
  "🦄",
  "🐶",
  "🐱",
  "🐹",
  "🐧",
];

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [age, setAge] = useState(7);
  const [avatar, setAvatar] = useState("🦊");
  const [langPref, setLangPref] = useState("zh-en");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, age, avatar, lang_pref: langPref }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "新增失敗");
      setBusy(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-12">
      <div className="w-full max-w-xl rounded-3xl bg-white/90 p-8 shadow-lg ring-1 ring-amber-100">
        <BackLink href="/">回首頁</BackLink>
        <h1 className="mt-2 text-3xl font-bold text-amber-700">
          新增小朋友 ✨
        </h1>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <label className="block">
            <span className="text-base font-semibold text-zinc-700">名字</span>
            <input
              required
              maxLength={12}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full rounded-xl border-2 border-amber-200 bg-white px-4 py-3 text-lg outline-none focus:border-amber-400"
              placeholder="例如：小明"
            />
          </label>

          <label className="block">
            <span className="text-base font-semibold text-zinc-700">
              年齡（{age} 歲）
            </span>
            <input
              type="range"
              min={3}
              max={15}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="mt-2 w-full accent-amber-500"
            />
          </label>

          <div>
            <span className="text-base font-semibold text-zinc-700">
              選一個頭像
            </span>
            <div className="mt-2 grid grid-cols-8 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-3xl transition ${
                    avatar === a
                      ? "bg-amber-200 ring-2 ring-amber-500"
                      : "bg-zinc-100 hover:bg-amber-100"
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-base font-semibold text-zinc-700">
              學習語言
            </span>
            <div className="mt-2 flex gap-2">
              {[
                { v: "zh-en", t: "中英雙語" },
                { v: "zh", t: "純中文" },
                { v: "en", t: "純英文" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setLangPref(o.v)}
                  className={`flex-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    langPref === o.v
                      ? "bg-amber-500 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-amber-100"
                  }`}
                >
                  {o.t}
                </button>
              ))}
            </div>
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-amber-500 py-4 text-xl font-bold text-white shadow-md transition hover:bg-amber-600 disabled:opacity-60"
          >
            {busy ? "建立中…" : "建立！"}
          </button>
        </form>
      </div>
    </main>
  );
}
