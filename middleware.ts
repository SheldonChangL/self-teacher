import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySession } from "@/lib/parent-auth";

const DEFAULT_SECRET =
  process.env.PARENT_AUTH_SECRET ?? "self-teacher-dev-secret-please-override";

const PROTECTED_PATHS = [
  /^\/parent(\/|$)/,
];
const PROTECTED_API = [
  { method: "DELETE", path: /^\/api\/sessions\// },
  { method: "DELETE", path: /^\/api\/profiles\// },
  { method: "PATCH", path: /^\/api\/profiles\// },
];
const ALLOW_THROUGH = [/^\/parent\/unlock(\/|$)/, /^\/api\/parent\/auth(\/|$)/];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ALLOW_THROUGH.some((re) => re.test(pathname))) return NextResponse.next();

  const isPage = PROTECTED_PATHS.some((re) => re.test(pathname));
  const isApi = PROTECTED_API.some(
    (rule) => rule.method === req.method && rule.path.test(pathname),
  );
  if (!isPage && !isApi) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  const ok = await verifySession(DEFAULT_SECRET, cookie);
  if (ok) return NextResponse.next();

  if (isApi) {
    return NextResponse.json({ error: "locked" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/parent/unlock";
  url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/parent/:path*", "/api/sessions/:path*", "/api/profiles/:path*"],
};
