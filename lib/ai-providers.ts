// Pure data — safe to import from client components.
export type ProviderId = "claude" | "gemini";

export type ModelOption = {
  value: string;
  label: string;
  tier: "fast" | "smart";
};

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  models: ModelOption[];
  defaultModel: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "claude",
    label: "Claude (Anthropic)",
    defaultModel: "haiku",
    models: [
      { value: "haiku", label: "Haiku 4.5（快、便宜）", tier: "fast" },
      { value: "sonnet", label: "Sonnet 4.6（平衡）", tier: "smart" },
      { value: "opus", label: "Opus 4.7（最聰明、較慢）", tier: "smart" },
    ],
  },
  {
    id: "gemini",
    label: "Gemini (Google)",
    defaultModel: "gemini-3-pro-preview",
    models: [
      {
        value: "auto-gemini-3",
        label: "Auto Gemini 3（自動分流，較快）",
        tier: "fast",
      },
      {
        value: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash（快）",
        tier: "fast",
      },
      {
        value: "gemini-3-pro-preview",
        label: "Gemini 3 Pro Preview（最聰明）",
        tier: "smart",
      },
    ],
  },
];
