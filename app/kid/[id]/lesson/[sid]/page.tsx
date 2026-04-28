import { notFound } from "next/navigation";
import { db, type Session } from "@/lib/db";
import { LessonView } from "@/components/LessonView";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const session = db
    .prepare("SELECT * FROM sessions WHERE id = ?")
    .get(sid) as Session | undefined;
  if (!session) notFound();

  let initialText = "";
  let initialDone = false;
  if (session.lesson_status === "done" && session.lesson_json) {
    const lesson = JSON.parse(session.lesson_json) as { markdown?: string };
    initialText = lesson.markdown ?? "";
    initialDone = true;
  }

  return (
    <LessonView
      kidId={id}
      sessionId={sid}
      initialText={initialText}
      initialDone={initialDone}
    />
  );
}
