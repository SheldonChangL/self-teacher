import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { db, Profile, Session } from "@/lib/db";
import { SUBJECTS } from "@/lib/subjects";
import { PairingQR } from "@/components/PairingQR";
import { BackLink } from "@/components/BackLink";
import { StreakChip } from "@/components/StreakChip";
import { getStreak } from "@/lib/streak";

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

export const dynamic = "force-dynamic";

async function buildCaptureUrl(profileId: string): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "http");
  return `${proto}://${host}/kid/${profileId}/capture?from=phone`;
}

export default async function KidHome({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = db
    .prepare("SELECT * FROM profiles WHERE id = ?")
    .get(id) as Profile | undefined;
  if (!profile) notFound();

  const sessions = db
    .prepare(
      "SELECT * FROM sessions WHERE profile_id = ? ORDER BY created_at DESC LIMIT 12",
    )
    .all(id) as Session[];

  const captureUrl = await buildCaptureUrl(id);
  const qrDataUrl = await QRCode.toDataURL(captureUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#92400e", light: "#ffffff" },
  });
  const streak = getStreak(id);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl">
        <BackLink href="/">換人</BackLink>

        <header className="mt-2 flex items-center gap-4">
          <span className="text-7xl">{profile.avatar}</span>
          <div>
            <h1 className="text-4xl font-extrabold text-amber-700">
              {profile.name}，準備好了嗎？
            </h1>
            <p className="text-zinc-600">
              {profile.age} 歲 · 一起學新東西吧！
            </p>
          </div>
        </header>

        <div className="mt-5">
          <StreakChip streak={streak} />
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <PairingQR
            profileId={id}
            qrDataUrl={qrDataUrl}
            captureUrl={captureUrl}
          />

          <div className="flex flex-col gap-4">
            <Link
              href={`/kid/${id}/capture`}
              className="flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-amber-400 to-rose-400 px-6 py-8 text-2xl font-bold text-white shadow-xl transition hover:scale-[1.02]"
            >
              📷 用這台直接拍
            </Link>
            <p className="text-sm text-zinc-500">
              （沒用電視＋手機時，點這個就好）
            </p>

            <h2 className="mt-2 text-xl font-semibold text-zinc-700">
              以前學過的 📚
            </h2>
            {sessions.length === 0 ? (
              <p className="text-zinc-500">
                還沒有紀錄～拍張照片就會出現在這！
              </p>
            ) : (
              <ul className="space-y-2">
                {sessions.map((s) => {
                  const lesson = s.lesson_json
                    ? (JSON.parse(s.lesson_json) as { title?: string })
                    : null;
                  const title = lesson?.title ?? "(學習中…)";
                  const date = new Date(s.created_at).toLocaleString("zh-TW", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const subj =
                    SUBJECT_BY_ID[s.subject] ?? SUBJECT_BY_ID.free;
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/kid/${id}/lesson/${s.id}`}
                        className="flex items-center justify-between gap-2 rounded-2xl bg-white/80 px-5 py-3 ring-1 ring-amber-100 transition hover:bg-white"
                      >
                        <span className="flex min-w-0 items-center gap-2 font-medium text-zinc-800">
                          <span
                            className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800"
                            title={subj.label}
                          >
                            {subj.icon} {subj.label}
                          </span>
                          <span className="truncate">{title}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-3 text-sm text-zinc-500">
                          {s.score !== null && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                              ⭐ {s.score}/5
                            </span>
                          )}
                          {date}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
