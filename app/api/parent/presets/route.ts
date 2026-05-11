import { NextResponse } from "next/server";
import { TASK_KINDS, createPreset, listPresets } from "@/lib/tasks";
import type { TaskKind } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ presets: listPresets() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind ?? "") as TaskKind;
  if (!TASK_KINDS.includes(kind)) {
    return NextResponse.json({ error: "bad kind" }, { status: 400 });
  }
  const label = String(body.label ?? "").trim();
  const emoji = String(body.emoji ?? "").trim();
  const minutes = Number(body.minutes_award);
  if (!label || !emoji) {
    return NextResponse.json({ error: "label/emoji required" }, { status: 400 });
  }
  if (!Number.isFinite(minutes) || minutes < 2 || minutes > 30) {
    return NextResponse.json(
      { error: "minutes_award must be 2-30" },
      { status: 400 },
    );
  }
  const preset = createPreset({ kind, label, emoji, minutes_award: minutes });
  return NextResponse.json({ preset });
}
