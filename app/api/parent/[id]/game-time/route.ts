import { NextResponse } from "next/server";
import { db, type Profile } from "@/lib/db";
import { recordUsage } from "@/lib/rewards";
import { localDate } from "@/lib/tasks";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile)
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const minutes = Number(body.minutes);
  const date =
    typeof body.date === "string" && body.date ? body.date : localDate();
  if (!Number.isFinite(minutes) || minutes === 0) {
    return NextResponse.json({ error: "bad minutes" }, { status: 400 });
  }
  recordUsage(id, date, minutes);
  return NextResponse.json({ ok: true });
}
