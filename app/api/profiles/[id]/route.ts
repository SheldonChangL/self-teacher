import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db, type Profile } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
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
  const name =
    typeof body.name === "string" ? body.name.trim() : profile.name;
  const avatar =
    typeof body.avatar === "string" && body.avatar.trim()
      ? body.avatar.trim()
      : profile.avatar;
  const age = Number.isFinite(Number(body.age))
    ? Number(body.age)
    : profile.age;
  const langPref =
    typeof body.lang_pref === "string" ? body.lang_pref : profile.lang_pref;

  if (!name) {
    return NextResponse.json({ error: "name 必填" }, { status: 400 });
  }
  if (age < 2 || age > 18) {
    return NextResponse.json(
      { error: "age 需在 2-18 之間" },
      { status: 400 },
    );
  }

  db.prepare(
    `UPDATE profiles SET name = ?, avatar = ?, age = ?, lang_pref = ? WHERE id = ?`,
  ).run(name, avatar, age, langPref, id);

  const updated = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile;
  return NextResponse.json({ profile: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  db.prepare("DELETE FROM sessions WHERE profile_id = ?").run(id);
  db.prepare("DELETE FROM profiles WHERE id = ?").run(id);

  const uploadDir = path.join(process.cwd(), "uploads", id);
  await fs.rm(uploadDir, { recursive: true, force: true });

  return NextResponse.json({ ok: true });
}
