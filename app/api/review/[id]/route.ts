import { NextResponse } from "next/server";
import { dueToday, recordReview } from "@/lib/vocab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return NextResponse.json({ cards: dueToday(id, 10) });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  await ctx.params; // not actually needed but keeps the signature consistent
  const body = await req.json().catch(() => ({}));
  const { card_id, recall } = body as {
    card_id?: string;
    recall?: "good" | "forgot";
  };
  if (!card_id || (recall !== "good" && recall !== "forgot")) {
    return NextResponse.json({ error: "bad input" }, { status: 400 });
  }
  recordReview(card_id, recall);
  return NextResponse.json({ ok: true });
}
