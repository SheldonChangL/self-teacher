import Link from "next/link";
import { notFound } from "next/navigation";
import { db, Profile } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { findStage } from "@/lib/phonics-curriculum";
import { getCompletedLessonKeys, getSeededLessonKeys } from "@/lib/phonics";

export const dynamic = "force-dynamic";

export default async function PhonicsStagePage({
  params,
}: {
  params: Promise<{ id: string; stage: string }>;
}) {
  const { id, stage: stageSlug } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const stage = findStage(stageSlug);
  if (!stage) notFound();

  const completed = getCompletedLessonKeys(id);
  const seeded = getSeededLessonKeys();

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <BackLink href={`/kid/${id}/phonics`}>回階段選擇</BackLink>

        <header
          className={`mt-2 mb-6 rounded-3xl bg-gradient-to-br ${stage.colorFrom} ${stage.colorTo} p-6 text-white shadow-lg`}
        >
          <div className="flex items-center gap-4">
            <span className="text-6xl">{stage.emoji}</span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest opacity-80">
                Stage {stage.order}
              </p>
              <h1 className="text-3xl font-extrabold drop-shadow-sm">
                {stage.title}
              </h1>
            </div>
          </div>
          <p className="mt-3 text-base leading-relaxed">{stage.description}</p>
        </header>

        <ul className="space-y-3">
          {stage.lessons.map((lesson, i) => {
            const key = `${stage.slug}:${lesson.slug}`;
            const isCompleted = completed.has(key);
            const isSeeded = seeded.has(key);
            const content = (
              <>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-bold text-emerald-700">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xl font-bold text-zinc-800">
                    {lesson.title}
                  </div>
                  <div className="text-sm text-zinc-500">{lesson.focus}</div>
                </div>
                {isCompleted && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                    ✓ 學過了
                  </span>
                )}
                {!isSeeded && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                    待 seed
                  </span>
                )}
              </>
            );
            return (
              <li key={lesson.slug}>
                {isSeeded ? (
                  <Link
                    href={`/kid/${id}/phonics/${stage.slug}/${lesson.slug}`}
                    className="flex items-center gap-4 rounded-3xl bg-white p-5 shadow-md ring-1 ring-zinc-100 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98]"
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-100 opacity-70">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
