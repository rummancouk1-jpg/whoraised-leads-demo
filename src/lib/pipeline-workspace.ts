import type { LeadWorkspaceMeta, WorkspaceTeamMember } from "@/types/pipeline-workspace";

export const WORKSPACE_TEAM: WorkspaceTeamMember[] = [
  {
    id: "sdr-1",
    name: "Alex Rivera",
    initials: "AR",
    role: "SDR",
    tint: "from-indigo-500/90 to-violet-600/90",
  },
  {
    id: "sdr-2",
    name: "Jordan Kim",
    initials: "JK",
    role: "SDR",
    tint: "from-slate-600/90 to-slate-700/90",
  },
  {
    id: "ae-1",
    name: "Morgan Lee",
    initials: "ML",
    role: "AE",
    tint: "from-cyan-600/85 to-indigo-600/85",
  },
  {
    id: "lead-1",
    name: "Sam Patel",
    initials: "SP",
    role: "Lead",
    tint: "from-violet-600/85 to-indigo-700/85",
  },
];

const TOUCHED_LABELS = ["today", "1d ago", "2d ago", "3d ago", "this week"];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getLeadWorkspaceMeta(leadId: string): LeadWorkspaceMeta {
  const seed = hashSeed(leadId);
  const owner = WORKSPACE_TEAM[seed % WORKSPACE_TEAM.length]!;
  const recentlyViewed = seed % 5 === 0 || seed % 7 === 0;
  const lastTouchedLabel =
    TOUCHED_LABELS[seed % TOUCHED_LABELS.length] ?? "this week";

  return {
    leadId,
    owner,
    recentlyViewed,
    lastTouchedLabel,
  };
}

export function buildWorkspaceMetaMap(
  leadIds: string[],
): Map<string, LeadWorkspaceMeta> {
  const map = new Map<string, LeadWorkspaceMeta>();
  for (const id of leadIds) {
    map.set(id, getLeadWorkspaceMeta(id));
  }
  return map;
}

export function formatWorkspaceTimestamp(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
