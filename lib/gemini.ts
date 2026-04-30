// Gemini CLI provider. Mirrors lib/claude.ts so callers can swap by
// flipping a settings flag. Emits the same event shape:
//   { type: "text", text }
//   { type: "cost", costUsd }   (Gemini CLI doesn't report USD; emits 0)
//   { type: "done", full }
//   { type: "error", message }
import { spawn } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";

export type GeminiRunOptions = {
  cwd?: string;
  model?: string;
  signal?: AbortSignal;
};

const GEMINI_BIN = process.env.GEMINI_BIN || "gemini";
const DEFAULT_MODEL =
  process.env.SELF_TEACHER_GEMINI_MODEL || "gemini-3-pro-preview";

function buildArgs(prompt: string, opts: GeminiRunOptions) {
  return [
    "--prompt",
    prompt,
    "--output-format",
    "stream-json",
    "--yolo",
    "--model",
    opts.model ?? DEFAULT_MODEL,
  ];
}

export type GeminiEvent =
  | { type: "text"; text: string }
  | { type: "cost"; costUsd: number }
  | { type: "done"; full: string }
  | { type: "error"; message: string };

export async function* streamGemini(
  prompt: string,
  opts: GeminiRunOptions = {},
): AsyncGenerator<GeminiEvent> {
  const cwd = opts.cwd ?? process.cwd();
  const args = buildArgs(prompt, opts);

  const devnull = fs.openSync("/dev/null", "r");
  const child = spawn(GEMINI_BIN, args, {
    cwd,
    stdio: [devnull, "pipe", "pipe"],
    env: process.env,
  });
  child.once("close", () => {
    try {
      fs.closeSync(devnull);
    } catch {}
  });

  if (opts.signal) {
    opts.signal.addEventListener("abort", () => child.kill("SIGTERM"), {
      once: true,
    });
  }

  // gemini logs MCP / banner noise to stderr — capture but don't surface
  const stderrChunks: string[] = [];
  child.stderr!.on("data", (b: Buffer) => stderrChunks.push(b.toString()));

  const exit = new Promise<{ code: number | null }>((resolve) =>
    child.once("close", (code) => resolve({ code })),
  );

  const rl = readline.createInterface({ input: child.stdout! });
  const lineQueue: string[] = [];
  let lineResolve: (() => void) | null = null;
  let lineEnded = false;
  rl.on("line", (line) => {
    lineQueue.push(line);
    lineResolve?.();
    lineResolve = null;
  });
  rl.once("close", () => {
    lineEnded = true;
    lineResolve?.();
    lineResolve = null;
  });

  let full = "";

  while (true) {
    if (lineQueue.length === 0) {
      if (lineEnded) break;
      await new Promise<void>((r) => (lineResolve = r));
      continue;
    }
    const line = lineQueue.shift()!;
    if (!line.trim()) continue;

    let evt: unknown;
    try {
      evt = JSON.parse(line);
    } catch {
      continue;
    }
    if (!evt || typeof evt !== "object") continue;
    const e = evt as {
      type?: string;
      role?: string;
      content?: string;
      delta?: boolean;
    };

    // gemini emits assistant deltas as `{type:"message", role:"assistant",
    // content:"...", delta:true}`. Final result event has no cost field —
    // emit 0 to keep the API shape consistent with Claude.
    if (e.type === "message" && e.role === "assistant" && typeof e.content === "string") {
      // gemini sometimes sends both delta:true chunks AND a final consolidated
      // message without delta. Trust delta:true chunks; ignore the rest.
      if (e.delta === true) {
        full += e.content;
        yield { type: "text", text: e.content };
      }
    } else if (e.type === "result") {
      yield { type: "cost", costUsd: 0 };
    }
  }

  const { code } = await exit;
  if (code !== 0) {
    yield {
      type: "error",
      message: `gemini exited ${code}: ${stderrChunks.join("").slice(-400)}`,
    };
    return;
  }
  yield { type: "done", full };
}

export async function runGemini(
  prompt: string,
  opts: GeminiRunOptions = {},
): Promise<{ text: string; costUsd: number }> {
  let full = "";
  let costUsd = 0;
  for await (const e of streamGemini(prompt, opts)) {
    if (e.type === "text") full += e.text;
    else if (e.type === "cost") costUsd = e.costUsd;
    else if (e.type === "error") throw new Error(e.message);
    else if (e.type === "done") full = e.full;
  }
  return { text: full, costUsd };
}
