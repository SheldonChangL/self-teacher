import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import { DEFAULTS } from "@/lib/limits";

export const runtime = "nodejs";

const KEYS = ["daily_lessons_limit", "monthly_budget_usd"] as const;

export async function GET() {
  const out: Record<string, number> = {};
  for (const k of KEYS) {
    const v = getSetting(k);
    out[k] = v ? Number(v) : DEFAULTS[k];
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  for (const k of KEYS) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: `bad ${k}` }, { status: 400 });
      }
      setSetting(k, String(n));
    }
  }
  return NextResponse.json({ ok: true });
}
