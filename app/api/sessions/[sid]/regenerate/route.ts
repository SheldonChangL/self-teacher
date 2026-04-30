import { NextResponse } from "next/server";
import { db, type Session } from "@/lib/db";
import { newId } from "@/lib/id";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === "angle" ? "angle" : "simpler";

  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sid) as Session | undefined;
  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (session.lesson_status !== "done" || !session.lesson_json) {
    return NextResponse.json(
      { error: "原始課文尚未完成，無法重生" },
      { status: 400 },
    );
  }

  const newSid = newId("s");
  const annotatedHint =
    `[regenerate:${mode}] ${session.hint}`.trim();

  db.prepare(
    `INSERT INTO sessions
      (id, profile_id, image_paths, subject, hint,
       lesson_status, quiz_status, prev_lesson_id, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?, ?)`,
  ).run(
    newSid,
    session.profile_id,
    session.image_paths,
    session.subject,
    annotatedHint,
    sid,
    Date.now(),
  );

  return NextResponse.json({ session_id: newSid, mode });
}
