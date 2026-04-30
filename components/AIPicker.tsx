"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PROVIDERS, type ProviderId } from "@/lib/ai-providers";

export function AIPicker({
  initialProvider,
  initialModelClaude,
  initialModelGemini,
}: {
  initialProvider: ProviderId;
  initialModelClaude: string;
  initialModelGemini: string;
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderId>(initialProvider);
  const [modelClaude, setModelClaude] = useState(initialModelClaude);
  const [modelGemini, setModelGemini] = useState(initialModelGemini);
  const [busy, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(payload: Record<string, string>) {
    startTransition(async () => {
      await fetch("/api/parent/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
      router.refresh();
    });
  }

  const claudeProvider = PROVIDERS.find((p) => p.id === "claude")!;
  const geminiProvider = PROVIDERS.find((p) => p.id === "gemini")!;
  const activeModel = provider === "claude" ? modelClaude : modelGemini;
  const activeModelLabel =
    (provider === "claude" ? claudeProvider.models : geminiProvider.models).find(
      (m) => m.value === activeModel,
    )?.label ?? activeModel;

  return (
    <div className="rounded-3xl bg-white/90 p-4 shadow-sm ring-1 ring-amber-100">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-700">🤖 AI 老師</h3>
        {saved && <span className="text-xs text-emerald-600">已存檔 ✓</span>}
      </div>

      <p className="mt-1 text-base font-bold text-amber-700">
        {provider === "claude" ? "Claude" : "Gemini"} ・{" "}
        <span className="text-sm font-normal text-zinc-600">
          {activeModelLabel}
        </span>
      </p>

      <div className="mt-3">
        <span className="text-xs text-zinc-500">廠牌</span>
        <div className="mt-1 flex gap-2">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setProvider(p.id);
                save({ ai_provider: p.id });
              }}
              disabled={busy}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition ${
                provider === p.id
                  ? "bg-amber-500 text-white shadow"
                  : "bg-zinc-100 text-zinc-700 hover:bg-amber-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <span className="text-xs text-zinc-500">模型</span>
        <div className="mt-1 flex flex-col gap-1">
          {(provider === "claude" ? claudeProvider.models : geminiProvider.models).map(
            (m) => {
              const checked = m.value === activeModel;
              return (
                <label
                  key={m.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    checked
                      ? "bg-amber-50 ring-2 ring-amber-300"
                      : "bg-zinc-50 hover:bg-amber-50/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    checked={checked}
                    onChange={() => {
                      if (provider === "claude") {
                        setModelClaude(m.value);
                        save({ ai_model_claude: m.value });
                      } else {
                        setModelGemini(m.value);
                        save({ ai_model_gemini: m.value });
                      }
                    }}
                    disabled={busy}
                    className="accent-amber-500"
                  />
                  <span className="flex-1 text-zinc-700">{m.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      m.tier === "smart"
                        ? "bg-violet-100 text-violet-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {m.tier === "smart" ? "聰明" : "快"}
                  </span>
                </label>
              );
            },
          )}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-zinc-400">
        切換後立刻生效。Gemini 目前不回報 USD 花費，本月花費圖表上會以 0 計。
      </p>
    </div>
  );
}
