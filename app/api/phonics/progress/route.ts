import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markLessonComplete } from "@/lib/phonics";
import { findLesson } from "@/lib/phonics-curriculum";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    profileId?: string;
    stageSlug?: string;
    lessonSlug?: string;
  };
  const { profileId, stageSlug, lessonSlug } = body;
  if (!profileId || !stageSlug || !lessonSlug) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  // Reject unknown profiles + unknown curriculum slugs so we don't accumulate
  // orphan rows.
  const profile = db
    .prepare("SELECT 1 FROM profiles WHERE id = ?")
    .get(profileId);
  if (!profile) {
    return NextResponse.json({ error: "unknown profile" }, { status: 404 });
  }
  if (!findLesson(stageSlug, lessonSlug)) {
    return NextResponse.json({ error: "unknown lesson" }, { status: 404 });
  }

  markLessonComplete(profileId, stageSlug, lessonSlug);
  return NextResponse.json({ ok: true });
}
