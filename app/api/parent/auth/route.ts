import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import {
  COOKIE_NAME,
  KEYS,
  hashPin,
  newSecret,
  signSession,
  verifyPin,
} from "@/lib/parent-auth";

export const runtime = "nodejs";

const DEFAULT_SECRET =
  process.env.PARENT_AUTH_SECRET ?? "self-teacher-dev-secret-please-override";

function getSecret(): string {
  if (process.env.PARENT_AUTH_SECRET) return process.env.PARENT_AUTH_SECRET;
  let s = getSetting(KEYS.secret);
  if (!s) {
    s = newSecret();
    setSetting(KEYS.secret, s);
  }
  // We sign cookies with DEFAULT_SECRET (used by middleware). The DB secret
  // exists for forward-compat — middleware can adopt env-only mode later.
  return DEFAULT_SECRET;
}

export async function GET() {
  const stored = getSetting(KEYS.pinHash);
  return NextResponse.json({ has_pin: !!stored });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  const pin = String(body.pin ?? "");

  if (!/^\d{4,8}$/.test(pin)) {
    return NextResponse.json(
      { error: "PIN 必須是 4-8 位數字" },
      { status: 400 },
    );
  }

  if (action === "set") {
    if (getSetting(KEYS.pinHash)) {
      return NextResponse.json(
        { error: "已設定過 PIN，請先解鎖" },
        { status: 409 },
      );
    }
    setSetting(KEYS.pinHash, await hashPin(pin));
    const cookie = await signSession(getSecret());
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, cookie, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }

  if (action === "verify") {
    const stored = getSetting(KEYS.pinHash);
    if (!stored) {
      return NextResponse.json({ error: "尚未設定 PIN" }, { status: 400 });
    }
    if (!(await verifyPin(pin, stored))) {
      return NextResponse.json({ error: "PIN 錯誤" }, { status: 401 });
    }
    const cookie = await signSession(getSecret());
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, cookie, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }

  if (action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
