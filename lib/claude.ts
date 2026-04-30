import { spawn } from "node:child_process";
import fs from "node:fs";
import readline from "node:readline";

export type ClaudeRunOptions = {
  cwd?: string;
  model?: string;
  allowedTools?: string[];
  signal?: AbortSignal;
  /** Pass through `--effort` (low|medium|high|xhigh|max) */
  effort?: string;
};

const CLAUDE_BIN = process.env.CLAUDE_BIN || "claude";
const DEFAULT_MODEL = process.env.SELF_TEACHER_MODEL || "haiku";

function buildArgs(prompt: string, opts: ClaudeRunOptions) {
  // Use --flag=value syntax for variadic flags so commander.js doesn't
  // greedily consume the prompt argument.
  const args = [
    "--print",
    "--output-format=stream-json",
    "--verbose",
    "--include-partial-messages",
    "--permission-mode=bypassPermissions",
    "--no-session-persistence",
    `--model=${opts.model ?? DEFAULT_MODEL}`,
  ];
  if (opts.effort) args.push(`--effort=${opts.effort}`);
  if (opts.allowedTools !== undefined) {
    args.push(`--tools=${opts.allowedTools.join(",")}`);
  }
  args.push(prompt);
  return args;
}

export type ClaudeEvent =
  | { type: "text"; text: string }
  | { type: "cost"; costUsd: number }
  | { type: "done"; full: string }
  | { type: "error"; message: string };

/**
 * Spawn claude CLI in print/stream-json mode and yield text deltas as they
 * arrive. The CLI emits per-token text deltas inside content_block_delta
 * stream_events when --include-partial-messages is set.
 */
export async function* streamClaude(
  prompt: string,
  opts: ClaudeRunOptions = {},
): AsyncGenerator<ClaudeEvent> {
  const cwd = opts.cwd ?? process.cwd();
  const args = buildArgs(prompt, opts);

  // Explicitly redirect stdin from /dev/null. With "ignore", claude CLI still
  // waits 3s for stdin data before proceeding; an open /dev/null fd makes it
  // see EOF immediately and start work right away.
  const devnull = fs.openSync("/dev/null", "r");
  const child = spawn(CLAUDE_BIN, args, {
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

  const stderrChunks: string[] = [];
  child.stderr!.on("data", (b: Buffer) =>
    stderrChunks.push(b.toString()),
  );

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

  const textBlockIndices = new Set<number>();
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
      total_cost_usd?: number;
      event?: {
        type?: string;
        index?: number;
        content_block?: { type?: string };
        delta?: { type?: string; text?: string };
      };
    };

    if (e.type === "result" && typeof e.total_cost_usd === "number") {
      yield { type: "cost", costUsd: e.total_cost_usd };
      continue;
    }
    if (e.type !== "stream_event" || !e.event) continue;
    const ev = e.event;
    if (ev.type === "content_block_start" && ev.content_block?.type === "text") {
      if (typeof ev.index === "number") textBlockIndices.add(ev.index);
    } else if (
      ev.type === "content_block_delta" &&
      ev.delta?.type === "text_delta" &&
      typeof ev.delta.text === "string" &&
      typeof ev.index === "number" &&
      textBlockIndices.has(ev.index)
    ) {
      full += ev.delta.text;
      yield { type: "text", text: ev.delta.text };
    }
  }

  const { code } = await exit;
  if (code !== 0) {
    yield {
      type: "error",
      message: `claude exited with code ${code}: ${stderrChunks.join("").slice(0, 500)}`,
    };
    return;
  }
  yield { type: "done", full };
}

/** Collect the entire assistant text response (no streaming). */
export async function runClaude(
  prompt: string,
  opts: ClaudeRunOptions = {},
): Promise<{ text: string; costUsd: number }> {
  let full = "";
  let costUsd = 0;
  for await (const e of streamClaude(prompt, opts)) {
    if (e.type === "text") full += e.text;
    else if (e.type === "cost") costUsd = e.costUsd;
    else if (e.type === "error") throw new Error(e.message);
    else if (e.type === "done") full = e.full;
  }
  return { text: full, costUsd };
}
