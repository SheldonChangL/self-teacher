import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { db, Profile, Subject, SUBJECTS } from "@/lib/db";
import { newId } from "@/lib/id";
import { publishProfileEvent } from "@/lib/events";
import { canStart } from "@/lib/limits";

const VALID_SUBJECTS = new Set(SUBJECTS.map((s) => s.id));

export const runtime = "nodejs";

const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function POST(req: Request) {
  const form = await req.formData();
  const profileId = String(form.get("profile_id") ?? "");
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(profileId) as Profile | undefined;
  if (!profile) {
    return NextResponse.json({ error: "找不到 profile" }, { status: 400 });
  }

  const limit = canStart(profileId);
  if (!limit.allowed) {
    const msg =
      limit.reason === "daily"
        ? `今天已經學了 ${limit.current} 堂，達到 ${limit.limit} 堂上限囉，明天再來吧！`
        : `這個月 AI 花費 $${limit.current.toFixed(2)} 已超過預算 $${limit.limit.toFixed(2)}，先讓家長調整一下吧。`;
    return NextResponse.json(
      { error: msg, reason: limit.reason },
      { status: 429 },
    );
  }

  const files = form.getAll("images").filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "沒有圖片" }, { status: 400 });
  }

  const subjectRaw = String(form.get("subject") ?? "free");
  const subject: Subject = (VALID_SUBJECTS.has(subjectRaw as Subject)
    ? (subjectRaw as Subject)
    : "free");
  const hint = String(form.get("hint") ?? "").slice(0, 200);

  const sessionId = newId("s");
  const dir = path.join(UPLOAD_ROOT, profileId, sessionId);
  await fs.mkdir(dir, { recursive: true });

  const savedRel: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = /^(jpg|jpeg|png|webp|gif)$/.test(ext) ? ext : "jpg";
    const filename = `img${i + 1}.${safeExt}`;
    const buf = Buffer.from(await f.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buf);
    savedRel.push(path.posix.join("uploads", profileId, sessionId, filename));
  }

  db.prepare(
    `INSERT INTO sessions
       (id, profile_id, image_paths, subject, hint,
        lesson_status, quiz_status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', 'pending', ?)`,
  ).run(
    sessionId,
    profileId,
    JSON.stringify(savedRel),
    subject,
    hint,
    Date.now(),
  );

  publishProfileEvent(profileId, {
    type: "session-created",
    sessionId,
  });

  return NextResponse.json({
    session_id: sessionId,
    image_paths: savedRel,
    subject,
    hint,
  });
}
