import { subscribeProfile } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const safeEnqueue = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(data));
        } catch {
          closed = true;
        }
      };

      safeEnqueue(`data: ${JSON.stringify({ ready: true })}\n\n`);
      const unsubscribe = subscribeProfile(id, (evt) => {
        safeEnqueue(`data: ${JSON.stringify(evt)}\n\n`);
      });
      const heartbeat = setInterval(() => {
        safeEnqueue(`: ping\n\n`);
      }, 20000);

      const cleanup = () => {
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener("abort", cleanup, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
