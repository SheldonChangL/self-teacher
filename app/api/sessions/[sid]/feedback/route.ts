import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const fb = body.feedback as "up" | "down" | null;
  if (fb !== "up" && fb !== "down" && fb !== null) {
    return NextResponse.json({ error: "bad feedback" }, { status: 400 });
  }
  const row = db
    .prepare("UPDATE sessions SET feedback = ? WHERE id = ?")
    .run(fb, sid);
  if (row.changes === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
