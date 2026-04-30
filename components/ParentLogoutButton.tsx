"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function ParentLogoutButton() {
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      await fetch("/api/parent/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      router.push("/parent/unlock");
    });
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="text-xs text-zinc-400 hover:text-zinc-700"
    >
      🔒 鎖回家長後台
    </button>
  );
}
