"use client";

import { useRef, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Webcam from "react-webcam";
import { SUBJECTS, type Subject } from "@/lib/subjects";

type Snap = { dataUrl: string; blob: Blob };

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export default function CapturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPhone = searchParams.get("from") === "phone";
  const webcamRef = useRef<Webcam | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const [subject, setSubject] = useState<Subject>("free");
  const [hint, setHint] = useState("");
  const [phoneSent, setPhoneSent] = useState(false);

  async function takePhoto() {
    const cam = webcamRef.current;
    if (!cam) return;
    const dataUrl = cam.getScreenshot({ width: 1280, height: 720 });
    if (!dataUrl) {
      setErr("拍照失敗，請允許相機權限或改用上傳檔案");
      return;
    }
    const blob = await dataUrlToBlob(dataUrl);
    setSnaps((s) => [...s, { dataUrl, blob }]);
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next: Snap[] = [];
    for (const f of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });
      next.push({ dataUrl, blob: f });
    }
    setSnaps((s) => [...s, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(i: number) {
    setSnaps((s) => s.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (snaps.length === 0) {
      setErr("至少要 1 張照片喔！");
      return;
    }
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.append("profile_id", id);
    fd.append("subject", subject);
    if (hint.trim()) fd.append("hint", hint.trim());
    snaps.forEach((s, i) => {
      const ext = s.blob.type.includes("png") ? "png" : "jpg";
      fd.append("images", new File([s.blob], `img${i + 1}.${ext}`, { type: s.blob.type || "image/jpeg" }));
    });
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "上傳失敗");
      setBusy(false);
      return;
    }
    const { session_id } = await res.json();
    if (fromPhone) {
      setPhoneSent(true);
      setBusy(false);
      // give TV time to receive the SSE event before user navigates back
      return;
    }
    router.push(`/kid/${id}/lesson/${session_id}`);
  }

  function resetForAnother() {
    setSnaps([]);
    setHint("");
    setPhoneSent(false);
  }

  if (phoneSent) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md rounded-3xl bg-white/95 p-8 text-center shadow-xl ring-1 ring-amber-100">
          <div className="text-7xl">📺</div>
          <h1 className="mt-3 text-3xl font-extrabold text-amber-700">
            送出囉！
          </h1>
          <p className="mt-3 text-lg text-zinc-700">
            老師正在電視上開課～
            <br />
            快回去看電視吧！
          </p>
          <button
            onClick={resetForAnother}
            className="mt-6 w-full rounded-2xl bg-amber-500 py-3 font-bold text-white shadow hover:bg-amber-600"
          >
            📷 再拍一份
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-2xl">
        {!fromPhone && (
          <Link
            href={`/kid/${id}`}
            className="text-sm text-amber-700 hover:underline"
          >
            ← 回上頁
          </Link>
        )}
        <h1 className="mt-2 text-3xl font-bold text-amber-700">
          {fromPhone ? "📱 給電視老師拍張照" : "📷 拍下你想學的東西！"}
        </h1>
        <p className="text-zinc-600">
          {fromPhone
            ? "拍好按下「送出」，課文會出現在電視上。"
            : "可以拍多張，老師會一起看。"}
        </p>

        <div className="mt-5">
          <p className="text-base font-semibold text-zinc-700">
            想學哪一科？
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SUBJECTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubject(s.id)}
                className={`flex flex-col items-center rounded-2xl px-2 py-3 transition ${
                  subject === s.id
                    ? "bg-amber-500 text-white shadow-md ring-2 ring-amber-600"
                    : "bg-white/80 text-zinc-700 ring-1 ring-amber-100 hover:bg-amber-50"
                }`}
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="mt-1 text-xs font-bold">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setMode("camera")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "camera"
                ? "bg-amber-500 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            用相機
          </button>
          <button
            onClick={() => setMode("upload")}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              mode === "upload"
                ? "bg-amber-500 text-white"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            選檔案
          </button>
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl bg-black/90 ring-2 ring-amber-200">
          {mode === "camera" ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "environment" }}
              className="aspect-video w-full object-cover"
              onUserMediaError={() =>
                setErr("無法使用相機，請改用「選檔案」")
              }
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center bg-amber-50">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={onPickFiles}
                className="block w-full text-center text-zinc-700 file:mr-4 file:rounded-full file:border-0 file:bg-amber-500 file:px-6 file:py-3 file:text-white"
              />
            </div>
          )}
        </div>

        {mode === "camera" && (
          <button
            onClick={takePhoto}
            className="mt-4 w-full rounded-2xl bg-amber-500 py-4 text-xl font-bold text-white shadow-md transition hover:bg-amber-600"
          >
            📸 拍一張
          </button>
        )}

        {snaps.length > 0 && (
          <div className="mt-6">
            <h2 className="text-base font-semibold text-zinc-700">
              已收集的 {snaps.length} 張
            </h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {snaps.map((s, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.dataUrl}
                    alt=""
                    className="aspect-square w-full rounded-xl object-cover ring-1 ring-zinc-200"
                  />
                  <button
                    onClick={() => remove(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 text-sm text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <details className="mt-5 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-amber-100">
          <summary className="cursor-pointer text-sm font-medium text-zinc-700">
            💬 想跟老師說什麼？（選填）
          </summary>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value.slice(0, 200))}
            placeholder="例如：第三題我不會、教我這個英文單字怎麼念、這朵花叫什麼…"
            className="mt-2 w-full rounded-xl border border-amber-200 bg-white p-3 text-sm outline-none focus:border-amber-400"
            rows={2}
          />
          <div className="mt-1 text-right text-xs text-zinc-400">
            {hint.length} / 200
          </div>
        </details>

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <button
          onClick={submit}
          disabled={busy || snaps.length === 0}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-emerald-400 to-sky-400 py-5 text-xl font-bold text-white shadow-lg transition hover:scale-[1.01] disabled:opacity-50"
        >
          {busy
            ? "上傳中…"
            : fromPhone
              ? "📤 送到電視"
              : "✨ 開始學習！"}
        </button>
      </div>
    </main>
  );
}
