import { getSetting } from "./db";
import { streamClaude as _streamClaude, runClaude as _runClaude } from "./claude";
import { streamGemini as _streamGemini, runGemini as _runGemini } from "./gemini";
import { PROVIDERS, type ProviderId } from "./ai-providers";

export { PROVIDERS };
export type { ProviderId, ModelOption, ProviderInfo } from "./ai-providers";

export type AIEvent =
  | { type: "text"; text: string }
  | { type: "cost"; costUsd: number }
  | { type: "done"; full: string }
  | { type: "error"; message: string };

export type AIOptions = {
  cwd?: string;
  model?: string;
  signal?: AbortSignal;
  /** Tools allowed; provider-specific. Ignored by Gemini CLI. */
  allowedTools?: string[];
  effort?: string;
};

export function getActiveProvider(): ProviderId {
  const v = getSetting("ai_provider");
  return v === "gemini" ? "gemini" : "claude";
}

export function getActiveModel(provider: ProviderId): string {
  const key = provider === "gemini" ? "ai_model_gemini" : "ai_model_claude";
  const v = getSetting(key);
  if (v) return v;
  return PROVIDERS.find((p) => p.id === provider)!.defaultModel;
}

export async function* streamAI(
  prompt: string,
  opts: AIOptions = {},
): AsyncGenerator<AIEvent> {
  const provider = getActiveProvider();
  const model = opts.model ?? getActiveModel(provider);

  if (provider === "gemini") {
    for await (const e of _streamGemini(prompt, {
      cwd: opts.cwd,
      model,
      signal: opts.signal,
    })) {
      yield e;
    }
    return;
  }
  for await (const e of _streamClaude(prompt, {
    cwd: opts.cwd,
    model,
    signal: opts.signal,
    allowedTools: opts.allowedTools,
    effort: opts.effort,
  })) {
    yield e;
  }
}

export async function runAI(
  prompt: string,
  opts: AIOptions = {},
): Promise<{ text: string; costUsd: number; provider: ProviderId; model: string }> {
  const provider = getActiveProvider();
  const model = opts.model ?? getActiveModel(provider);
  const r =
    provider === "gemini"
      ? await _runGemini(prompt, { cwd: opts.cwd, model, signal: opts.signal })
      : await _runClaude(prompt, {
          cwd: opts.cwd,
          model,
          signal: opts.signal,
          allowedTools: opts.allowedTools,
          effort: opts.effort,
        });
  return { ...r, provider, model };
}
