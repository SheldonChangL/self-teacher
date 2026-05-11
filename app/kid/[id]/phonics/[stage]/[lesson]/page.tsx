import { notFound } from "next/navigation";
import { db, Profile } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { findLesson } from "@/lib/phonics-curriculum";
import { getCompletedLessonKeys, getPhonicsContent } from "@/lib/phonics";
import { PhonicsLessonView } from "@/components/PhonicsLessonView";

export const dynamic = "force-dynamic";

export default async function PhonicsLessonPage({
  params,
}: {
  params: Promise<{ id: string; stage: string; lesson: string }>;
}) {
  const { id, stage: stageSlug, lesson: lessonSlug } = await params;

  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const found = findLesson(stageSlug, lessonSlug);
  if (!found) notFound();
  const { stage, lesson } = found;

  const content = getPhonicsContent(stageSlug, lessonSlug);
  if (!content) {
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-3xl">
          <BackLink href={`/kid/${id}/phonics/${stageSlug}`}>
            回課程清單
          </BackLink>
          <div className="mt-6 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 p-6 text-amber-800">
            <p className="text-xl font-bold">這一課還沒準備好 📋</p>
            <p className="mt-2 text-base">
              請家長執行：
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-amber-100 px-3 py-2 font-mono text-sm">
              npm run seed:phonics
            </pre>
          </div>
        </div>
      </main>
    );
  }

  const completed = getCompletedLessonKeys(id);
  const isCompleted = completed.has(`${stageSlug}:${lessonSlug}`);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-8">
      <div className="w-full max-w-3xl">
        <BackLink href={`/kid/${id}/phonics/${stageSlug}`}>
          回課程清單
        </BackLink>
        <div className="mt-4">
          <PhonicsLessonView
            profileId={id}
            stageSlug={stageSlug}
            lessonSlug={lessonSlug}
            stageTitle={`Stage ${stage.order} · ${stage.title}`}
            lessonTitle={lesson.title}
            colorFrom={stage.colorFrom}
            colorTo={stage.colorTo}
            initiallyCompleted={isCompleted}
            content={content}
          />
        </div>
      </div>
    </main>
  );
}
