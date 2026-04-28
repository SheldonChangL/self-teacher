export type Subject =
  | "free"
  | "chinese"
  | "english"
  | "math"
  | "science"
  | "social";

export const SUBJECTS: { id: Subject; label: string; icon: string }[] = [
  { id: "free", label: "自由探索", icon: "🌈" },
  { id: "chinese", label: "國語", icon: "📖" },
  { id: "english", label: "英文", icon: "🔤" },
  { id: "math", label: "數學", icon: "🔢" },
  { id: "science", label: "自然", icon: "🌱" },
  { id: "social", label: "社會", icon: "🌏" },
];
