import { notFound } from "next/navigation";
import { db, type Profile } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { TodayClient } from "@/components/TodayClient";

export const dynamic = "force-dynamic";

export default async function TodayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const today = new Date().toLocaleDateString("zh-TW", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8 sm:px-6">
      <div className="w-full max-w-4xl">
        <BackLink href={`/kid/${id}`}>回首頁</BackLink>

        <header className="mt-2 flex items-center gap-4">
          <span className="text-6xl">{profile.avatar}</span>
          <div>
            <h1 className="text-3xl font-extrabold text-amber-700 sm:text-4xl">
              📋 今日任務
            </h1>
            <p className="text-zinc-600">{today}，加油！</p>
          </div>
        </header>

        <div className="mt-6">
          <TodayClient profileId={id} />
        </div>
      </div>
    </main>
  );
}
