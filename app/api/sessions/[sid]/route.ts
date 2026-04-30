import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db, type Session } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ sid: string }> },
) {
  const { sid } = await ctx.params;
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sid) as Session | undefined;
  if (!session) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM sessions WHERE id = ?").run(sid);

  const uploadDir = path.join(
    process.cwd(),
    "uploads",
    session.profile_id,
    sid,
  );
  await fs.rm(uploadDir, { recursive: true, force: true });

  return NextResponse.json({ ok: true });
}
