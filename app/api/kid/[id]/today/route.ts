import { NextResponse } from "next/server";
import { db, type Profile } from "@/lib/db";
import {
  deleteLogByPreset,
  getTodayState,
  localDate,
  upsertLog,
} from "@/lib/tasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function assertProfile(id: string): Profile | null {
  return (
    (db.prepare("SELECT * FROM profiles WHERE id = ?").get(id) as
      | Profile
      | undefined) ?? null
  );
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!assertProfile(id))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(getTodayState(id));
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!assertProfile(id))
    return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const preset_id = String(body.preset_id ?? "");
  const status = String(body.status ?? "");
  const date =
    typeof body.date === "string" && body.date ? body.date : localDate();

  if (!preset_id) {
    return NextResponse.json({ error: "preset_id required" }, { status: 400 });
  }

  if (status === "remove") {
    deleteLogByPreset({ profile_id: id, date, preset_id });
    return NextResponse.json(getTodayState(id, date));
  }

  if (status !== "done" && status !== "undone" && status !== "forgot") {
    return NextResponse.json({ error: "bad status" }, { status: 400 });
  }

  try {
    upsertLog({ profile_id: id, date, preset_id, status });
  } catch {
    return NextResponse.json({ error: "preset_not_found" }, { status: 404 });
  }
  return NextResponse.json(getTodayState(id, date));
}
