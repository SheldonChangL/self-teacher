"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const AVATARS = [
  "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷",
  "🐸", "🐵", "🐰", "🦄", "🐶", "🐱", "🐹", "🐧",
];

type Profile = {
  id: string;
  name: string;
  avatar: string;
  age: number;
  lang_pref: string;
};

export function ProfileSettingsModal({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(profile.age);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [langPref, setLangPref] = useState(profile.lang_pref);
  const [err, setErr] = useState<string | null>(null);

  function reset() {
    setName(profile.name);
    setAge(profile.age);
    setAvatar(profile.avatar);
    setLangPref(profile.lang_pref);
    setErr(null);
    setConfirmingDelete(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function save() {
    setErr(null);
    startTransition(async () => {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, age, avatar, lang_pref: langPref }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr(j.error ?? "儲存失敗");
        return;
      }
      router.refresh();
      close();
    });
  }

  function deleteProfile() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setErr("刪除失敗");
        return;
      }
      router.refresh();
      close();
    });
  }

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        title="設定"
        className="shrink-0 rounded-full bg-white/80 px-3 py-2 text-zinc-500 ring-1 ring-amber-100 transition hover:bg-white hover:text-amber-700"
      >
        ⚙️
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-extrabold text-amber-700">
              編輯小朋友
            </h2>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-zinc-700">名字</span>
              <input
                value={name}
                maxLength={12}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-xl border-2 border-amber-200 px-3 py-2 text-base outline-none focus:border-amber-400"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-zinc-700">
                年齡（{age} 歲）
              </span>
              <input
                type="range"
                min={3}
                max={15}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="mt-1 w-full accent-amber-500"
              />
            </label>

            <div className="mt-4">
              <span className="text-sm font-semibold text-zinc-700">頭像</span>
              <div className="mt-1 grid grid-cols-8 gap-1">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition ${
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

            <div className="mt-4">
              <span className="text-sm font-semibold text-zinc-700">
                學習語言
              </span>
              <div className="mt-1 flex gap-1">
                {[
                  { v: "zh-en", t: "中英雙語" },
                  { v: "zh", t: "純中文" },
                  { v: "en", t: "純英文" },
                ].map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setLangPref(o.v)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      langPref === o.v
                        ? "bg-amber-500 text-white"
                        : "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {o.t}
                  </button>
                ))}
              </div>
            </div>

            {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

            <div className="mt-6 flex gap-2">
              <button
                onClick={close}
                disabled={busy}
                className="flex-1 rounded-2xl bg-zinc-100 py-3 font-bold text-zinc-700 hover:bg-zinc-200"
              >
                取消
              </button>
              <button
                onClick={save}
                disabled={busy}
                className="flex-1 rounded-2xl bg-amber-500 py-3 font-bold text-white shadow hover:bg-amber-600 disabled:opacity-50"
              >
                {busy ? "儲存中…" : "儲存"}
              </button>
            </div>

            <hr className="my-5 border-zinc-200" />

            <button
              onClick={deleteProfile}
              disabled={busy}
              className={`w-full rounded-2xl py-3 text-sm font-bold transition ${
                confirmingDelete
                  ? "bg-rose-600 text-white hover:bg-rose-700"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              }`}
            >
              {confirmingDelete
                ? `確認刪除 ${profile.name} 與全部紀錄？`
                : "🗑 刪除這位小朋友"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
