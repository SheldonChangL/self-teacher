"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function PairingQR({
  profileId,
  qrDataUrl,
  captureUrl,
}: {
  profileId: string;
  qrDataUrl: string;
  captureUrl: string;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const es = new EventSource(`/api/profiles/${profileId}/events`);
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      let payload: { type?: string; sessionId?: string; ready?: boolean };
      try {
        payload = JSON.parse(e.data);
      } catch {
        return;
      }
      if (payload.ready) setConnected(true);
      if (payload.type === "session-created" && payload.sessionId) {
        router.push(`/kid/${profileId}/lesson/${payload.sessionId}`);
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, [profileId, router]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-white/90 p-6 shadow-md ring-1 ring-amber-100">
      <div className="text-center">
        <p className="text-2xl font-bold text-amber-700">
          📱 用手機掃這個拍照
        </p>
        <p className="text-zinc-500">
          手機跟電視在同一個 Wi-Fi 喔！
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qrDataUrl}
        alt="掃我"
        className="h-64 w-64 rounded-2xl bg-white p-2 shadow ring-1 ring-zinc-200"
      />
      <div className="text-center">
        <code className="break-all rounded-lg bg-zinc-100 px-3 py-1 text-sm text-zinc-700">
          {captureUrl}
        </code>
        <p className="mt-2 text-sm text-zinc-500">
          {connected ? (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              已連線，等手機拍照…
            </span>
          ) : (
            <span className="text-zinc-400">連線中…</span>
          )}
        </p>
      </div>
    </div>
  );
}
