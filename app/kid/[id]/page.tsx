import os from "node:os";
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
import { dueCount } from "@/lib/vocab";
import { startLessonGeneration } from "@/lib/lesson-runner";

const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s]));

export const dynamic = "force-dynamic";

// Skip virtual interfaces (Docker bridges, VPNs, VM hypervisors) — phones on the
// same Wi-Fi cannot reach those subnets. Prefer the WAN-facing physical NIC.
const VIRTUAL_IFACE_RE = /^(docker|br-|veth|vmnet|vboxnet|utun|tailscale|zt|tun|tap|llw|awdl)/i;

function findLanIPv4(): string | null {
  const ifaces = os.networkInterfaces();
  const candidates: { name: string; addr: string }[] = [];
  for (const name of Object.keys(ifaces)) {
    if (VIRTUAL_IFACE_RE.test(name)) continue;
    for (const info of ifaces[name] ?? []) {
      if (info.family !== "IPv4" || info.internal) continue;
      candidates.push({ name, addr: info.address });
    }
  }
  // Prefer en0/en1/eth0/wlan0 (typical Wi-Fi/Ethernet) over anything else.
  const preferred = candidates.find((c) =>
    /^(en\d+|eth\d+|wlan\d+|wlp|enp)/i.test(c.name),
  );
  return (preferred ?? candidates[0])?.addr ?? null;
}

function isLoopbackHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0"
  );
}

async function buildCaptureUrl(profileId: string): Promise<string> {
  const h = await headers();
  const rawHost = h.get("host") ?? "localhost:3030";
  let host = rawHost;
  if (isLoopbackHost(rawHost)) {
    const lan = findLanIPv4();
    if (lan) {
      const port = rawHost.includes(":") ? rawHost.split(":")[1] : "3030";
      host = `${lan}:${port}`;
    }
  }
  const proto = h.get("x-forwarded-proto") ?? "http";
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

  // Recovery: any session without a finished lesson_json gets nudged. This is
  // the safety net for cases where /api/upload's fire-and-forget didn't stick
  // (process restart) or the TV's EventSource never navigated us to the
  // lesson page (old WebOS Chromium can't run the client bundle).
  const hasPending = sessions.some((s) => !s.lesson_json);
  for (const s of sessions) {
    if (!s.lesson_json) startLessonGeneration(s.id);
  }

  const captureUrl = await buildCaptureUrl(id);
  const qrDataUrl = await QRCode.toDataURL(captureUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#92400e", light: "#ffffff" },
  });
  const streak = getStreak(id);
  const reviewDue = dueCount(id);
  const todayIso = new Date().toLocaleDateString("sv-SE");
  const earnedRow = db
    .prepare(
      "SELECT COALESCE(SUM(minutes_awarded),0) as m FROM daily_logs WHERE profile_id = ? AND date = ?",
    )
    .get(id, todayIso) as { m: number };
  const earnedToday = earnedRow.m | 0;

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      {/* Old TV browsers (LG WebOS) can't run the client-side EventSource
          that auto-navigates to a lesson. Meta refresh is the no-JS fallback
          that lets pending sessions surface as soon as they finish. */}
      {hasPending && (
        <meta httpEquiv="refresh" content="6" />
      )}
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
              href={`/kid/${id}/today`}
              className="flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-emerald-400 to-teal-400 px-6 py-6 text-2xl font-bold text-white shadow-xl transition hover:scale-[1.02]"
            >
              📋 今日任務
              <span className="rounded-full bg-white/20 px-3 py-1 text-base">
                🎮 {earnedToday} 分
              </span>
            </Link>

            <Link
              href={`/kid/${id}/capture`}
              className="flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-amber-400 to-rose-400 px-6 py-8 text-2xl font-bold text-white shadow-xl transition hover:scale-[1.02]"
            >
              📷 用這台直接拍
            </Link>
            <p className="text-sm text-zinc-500">
              （沒用電視＋手機時，點這個就好）
            </p>

            {reviewDue > 0 && (
              <Link
                href={`/kid/${id}/review`}
                className="flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-violet-400 to-fuchsia-400 px-6 py-5 text-xl font-bold text-white shadow-lg transition hover:scale-[1.02]"
              >
                📚 今日複習（{reviewDue} 個）
              </Link>
            )}

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
