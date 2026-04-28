import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { startQuizGeneration } from "@/lib/quiz-runner";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const row = db
    .prepare("SELECT quiz_status FROM sessions WHERE id = ?")
    .get(sid) as { quiz_status: string } | undefined;
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.quiz_status !== "running") {
    db.prepare("UPDATE sessions SET quiz_status = 'pending' WHERE id = ?").run(
      sid,
    );
    startQuizGeneration(sid);
  }
  return NextResponse.json({ ok: true });
}
