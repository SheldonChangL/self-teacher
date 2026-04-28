import { NextResponse } from "next/server";
import { db, Session } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const session = db
    .prepare(
      "SELECT id, quiz_status, quiz_json, score FROM sessions WHERE id = ?",
    )
    .get(sid) as
    | Pick<Session, "id" | "quiz_status" | "quiz_json" | "score">
    | undefined;
  if (!session)
    return NextResponse.json({ error: "session not found" }, { status: 404 });
  return NextResponse.json({
    status: session.quiz_status,
    quiz: session.quiz_json ? JSON.parse(session.quiz_json) : null,
    score: session.score,
  });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const score = Number(body.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return NextResponse.json({ error: "bad score" }, { status: 400 });
  }
  db.prepare("UPDATE sessions SET score = ? WHERE id = ?").run(score, sid);
  return NextResponse.json({ ok: true });
}
