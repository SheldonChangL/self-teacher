"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SessionDeleteButton({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (res.ok) router.refresh();
      else alert("刪除失敗");
    });
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      title={`刪除 ${title}`}
      className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold transition ${
        confirming
          ? "bg-rose-500 text-white"
          : "bg-zinc-100 text-zinc-400 hover:bg-rose-100 hover:text-rose-600"
      }`}
    >
      {confirming ? "確認刪除" : "✕"}
    </button>
  );
}
