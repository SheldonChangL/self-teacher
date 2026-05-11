import { NextResponse } from "next/server";
import { deletePreset, updatePreset } from "@/lib/tasks";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: {
    active?: number;
    minutes_award?: number;
    label?: string;
    emoji?: string;
  } = {};
  if (body.active !== undefined) {
    patch.active = body.active ? 1 : 0;
  }
  if (body.minutes_award !== undefined) {
    const m = Number(body.minutes_award);
    if (!Number.isFinite(m) || m < 2 || m > 30) {
      return NextResponse.json(
        { error: "minutes_award must be 2-30" },
        { status: 400 },
      );
    }
    patch.minutes_award = m;
  }
  if (typeof body.label === "string") {
    const v = body.label.trim();
    if (!v) {
      return NextResponse.json({ error: "label empty" }, { status: 400 });
    }
    patch.label = v;
  }
  if (typeof body.emoji === "string") {
    const v = body.emoji.trim();
    if (!v) {
      return NextResponse.json({ error: "emoji empty" }, { status: 400 });
    }
    patch.emoji = v;
  }

  const preset = updatePreset(id, patch);
  if (!preset) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ preset });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const ok = deletePreset(id);
  if (!ok) {
    return NextResponse.json(
      { error: "builtin presets cannot be deleted" },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
