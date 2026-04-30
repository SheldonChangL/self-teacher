import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULTS } from "@/lib/limits";
import { PROVIDERS, type ProviderId } from "@/lib/ai-router";

export const runtime = "nodejs";

const NUM_KEYS = ["daily_lessons_limit", "monthly_budget_usd"] as const;
const STR_KEYS = ["ai_provider", "ai_model_claude", "ai_model_gemini"] as const;

export async function GET() {
  const out: Record<string, number | string> = {};
  for (const k of NUM_KEYS) {
    const v = getSetting(k);
    out[k] = v ? Number(v) : DEFAULTS[k];
  }
  for (const k of STR_KEYS) {
    out[k] = getSetting(k) ?? "";
  }
  if (!out.ai_provider) out.ai_provider = "claude";
  if (!out.ai_model_claude)
    out.ai_model_claude = PROVIDERS.find((p) => p.id === "claude")!.defaultModel;
  if (!out.ai_model_gemini)
    out.ai_model_gemini = PROVIDERS.find((p) => p.id === "gemini")!.defaultModel;
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  for (const k of NUM_KEYS) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `bad ${k}` }, { status: 400 });
      }
      setSetting(k, String(n));
    }
  }

  if (body.ai_provider !== undefined) {
    const p = String(body.ai_provider) as ProviderId;
    if (!PROVIDERS.some((x) => x.id === p)) {
      return NextResponse.json({ error: "unknown ai_provider" }, { status: 400 });
    }
    setSetting("ai_provider", p);
  }
  if (body.ai_model_claude !== undefined) {
    const valid = PROVIDERS.find((p) => p.id === "claude")!.models.some(
      (m) => m.value === body.ai_model_claude,
    );
    if (!valid) {
      return NextResponse.json({ error: "unknown claude model" }, { status: 400 });
    }
    setSetting("ai_model_claude", String(body.ai_model_claude));
  }
  if (body.ai_model_gemini !== undefined) {
    const valid = PROVIDERS.find((p) => p.id === "gemini")!.models.some(
      (m) => m.value === body.ai_model_gemini,
    );
    if (!valid) {
      return NextResponse.json({ error: "unknown gemini model" }, { status: 400 });
    }
    setSetting("ai_model_gemini", String(body.ai_model_gemini));
  }

  return NextResponse.json({ ok: true });
}
