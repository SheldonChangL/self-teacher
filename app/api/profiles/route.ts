import { NextResponse } from "next/server";
import { db, Profile } from "@/lib/db";
import { newId } from "@/lib/id";

export const runtime = "nodejs";

export async function GET() {
  const rows = db
    .prepare("SELECT * FROM profiles ORDER BY created_at ASC")
    .all() as Profile[];
  return NextResponse.json({ profiles: rows });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const avatar = String(body.avatar ?? "🦊").trim();
  const age = Number(body.age);
  const langPref = String(body.lang_pref ?? "zh-en");

  if (!name || !Number.isFinite(age) || age < 2 || age > 18) {
    return NextResponse.json(
      { error: "name 必填、age 需在 2-18 之間" },
      { status: 400 },
    );
  }

  const id = newId("p");
  db.prepare(
    `INSERT INTO profiles (id, name, avatar, age, lang_pref, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, name, avatar || "🦊", age, langPref, Date.now());

  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile;
  return NextResponse.json({ profile }, { status: 201 });
}
