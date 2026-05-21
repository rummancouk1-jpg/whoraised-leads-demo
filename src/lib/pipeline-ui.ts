import type { PipelineStage } from "@/types/pipeline";

/** Muted stage accents for headers and empty states — executive, not gamified. */
export const PIPELINE_STAGE_THEME: Record<
  PipelineStage,
  {
    accent: string;
    accentMuted: string;
    headerGlow: string;
    countBg: string;
    dropRing: string;
    dropGlow: string;
  }
> = {
  new: {
    accent: "bg-sky-400/90",
    accentMuted: "text-sky-300/80",
    headerGlow: "from-sky-500/[0.07]",
    countBg: "bg-sky-500/10 text-sky-200/90 ring-sky-400/15",
    dropRing: "ring-sky-400/25",
    dropGlow: "shadow-[inset_0_0_24px_-8px_rgba(56,189,248,0.12)]",
  },
  contacted: {
    accent: "bg-violet-400/90",
    accentMuted: "text-violet-300/80",
    headerGlow: "from-violet-500/[0.07]",
    countBg: "bg-violet-500/10 text-violet-200/90 ring-violet-400/15",
    dropRing: "ring-violet-400/25",
    dropGlow: "shadow-[inset_0_0_24px_-8px_rgba(167,139,250,0.12)]",
  },
  qualified: {
    accent: "bg-emerald-400/90",
    accentMuted: "text-emerald-300/80",
    headerGlow: "from-emerald-500/[0.07]",
    countBg: "bg-emerald-500/10 text-emerald-200/90 ring-emerald-400/15",
    dropRing: "ring-emerald-400/22",
    dropGlow: "shadow-[inset_0_0_24px_-8px_rgba(52,211,153,0.1)]",
  },
  closed: {
    accent: "bg-slate-400/70",
    accentMuted: "text-slate-400/90",
    headerGlow: "from-slate-400/[0.05]",
    countBg: "bg-white/[0.06] text-slate-300/90 ring-white/[0.08]",
    dropRing: "ring-white/15",
    dropGlow: "shadow-[inset_0_0_20px_-10px_rgba(148,163,184,0.08)]",
  },
};

export function getCompanyInitials(companyName: string): string {
  const words = companyName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}

/** Deterministic avatar tint from company name — subtle, not rainbow. */
export function getAvatarTint(companyName: string): string {
  const palette = [
    "from-indigo-500/90 to-violet-600/90",
    "from-slate-600/90 to-slate-700/90",
    "from-cyan-600/85 to-indigo-600/85",
    "from-violet-600/85 to-indigo-700/85",
    "from-slate-500/90 to-indigo-600/85",
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = (hash + companyName.charCodeAt(i)) % palette.length;
  }
  return palette[hash]!;
}
