import Link from "next/link";
import { notFound } from "next/navigation";
import { db, Profile } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { PHONICS_STAGES } from "@/lib/phonics-curriculum";
import { getStageProgress, isCurriculumSeeded } from "@/lib/phonics";

export const dynamic = "force-dynamic";

export default async function PhonicsHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const seeded = isCurriculumSeeded();
  const progress = getStageProgress(id);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <BackLink href={`/kid/${id}`}>回首頁</BackLink>

        <header className="mt-2 mb-8">
          <h1 className="text-4xl font-extrabold text-emerald-700">
            🔤 自然發音 Phonics
          </h1>
          <p className="mt-2 text-lg text-zinc-600">
            從字母音到完整單字，跟著 British 老師一起念！
          </p>
        </header>

        {!seeded && <SeedNotice />}

        <div className="grid gap-5 sm:grid-cols-2">
          {PHONICS_STAGES.map((stage) => {
            const p = progress.get(stage.slug);
            const done = p?.done ?? 0;
            const total = p?.total ?? stage.lessons.length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <Link
                key={stage.slug}
                href={`/kid/${id}/phonics/${stage.slug}`}
                className={`group flex flex-col rounded-3xl bg-gradient-to-br ${stage.colorFrom} ${stage.colorTo} p-6 text-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl active:scale-95`}
              >
                <div className="flex items-start justify-between">
                  <span className="text-5xl">{stage.emoji}</span>
                  <span className="rounded-full bg-white/25 px-3 py-1 text-sm font-bold backdrop-blur-sm">
                    {done} / {total}
                  </span>
                </div>
                <h2 className="mt-3 text-2xl font-extrabold drop-shadow-sm">
                  {stage.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed opacity-95">
                  {stage.description}
                </p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function SeedNotice() {
  return (
    <div className="mb-6 rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50 p-5 text-amber-800">
      <p className="text-lg font-bold">📋 課程內容還沒準備好</p>
      <p className="mt-1 text-sm">
        請家長在專案資料夾執行：
      </p>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-amber-100 px-3 py-2 text-sm font-mono">
        npm run seed:phonics
      </pre>
      <p className="mt-2 text-sm">
        這會用 Gemini 一次產生全部 27 課的內容，存進資料庫，之後就能直接打開。
      </p>
    </div>
  );
}
