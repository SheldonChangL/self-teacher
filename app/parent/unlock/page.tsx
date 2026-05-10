import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSetting, setSetting } from "@/lib/db";
import {
  COOKIE_NAME,
  KEYS,
  hashPin,
  signSession,
  verifyPin,
} from "@/lib/parent-auth";

const DEFAULT_SECRET =
  process.env.PARENT_AUTH_SECRET ?? "self-teacher-dev-secret-please-override";

async function unlockAction(formData: FormData) {
  "use server";
  const pin = String(formData.get("pin") ?? "");
  const rawNext = String(formData.get("next") ?? "/parent");
  const next = rawNext.startsWith("/") ? rawNext : "/parent";

  const back = (err: string) =>
    `/parent/unlock?next=${encodeURIComponent(next)}&err=${err}`;

  if (!/^\d{4,8}$/.test(pin)) {
    redirect(back("format"));
  }

  const stored = getSetting(KEYS.pinHash);
  if (stored) {
    if (!(await verifyPin(pin, stored))) {
      redirect(back("wrong"));
    }
  } else {
    setSetting(KEYS.pinHash, await hashPin(pin));
  }

  const cookie = await signSession(DEFAULT_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect(next);
}

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") ? sp.next : "/parent";
  const stored = getSetting(KEYS.pinHash);
  const hasPin = !!stored;

  const headline = hasPin ? "輸入家長 PIN" : "設定家長 PIN（4–8 位數）";
  const sub = hasPin
    ? "解鎖後可進家長後台與管理功能"
    : "之後進入家長後台或刪除資料都需要這組 PIN。請務必記住。";

  let errMsg = "";
  if (sp.err === "format") errMsg = "PIN 必須是 4-8 位數字";
  else if (sp.err === "wrong") errMsg = "PIN 錯誤，請再試一次";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <form
        action={unlockAction}
        className="w-full max-w-sm rounded-3xl bg-white/95 p-7 shadow-xl ring-1 ring-amber-100"
      >
        <input type="hidden" name="next" value={next} />
        <div className="text-center text-5xl">🔒</div>
        <h1 className="mt-3 text-center text-2xl font-extrabold text-amber-700">
          {headline}
        </h1>
        <p className="mt-1 text-center text-sm text-zinc-500">{sub}</p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4,8}"
          name="pin"
          required
          autoFocus
          maxLength={8}
          minLength={4}
          autoComplete="off"
          className="mt-6 w-full rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 text-center text-3xl font-bold tracking-[0.4em] text-amber-700 outline-none focus:border-amber-500"
          placeholder="••••"
        />

        <button
          type="submit"
          className="mt-4 w-full touch-manipulation rounded-2xl bg-amber-500 py-4 text-xl font-extrabold text-white shadow transition hover:bg-amber-600 active:scale-95"
        >
          {hasPin ? "解鎖" : "設定 PIN"}
        </button>

        {errMsg && (
          <p className="mt-3 text-center text-sm font-bold text-rose-600">
            {errMsg}
          </p>
        )}
      </form>
    </main>
  );
}
