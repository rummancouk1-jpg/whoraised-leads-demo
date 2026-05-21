import type { LeadWorkspaceMeta } from "@/types/pipeline-workspace";

interface WorkspaceOwnerBadgeProps {
  meta: LeadWorkspaceMeta;
  compact?: boolean;
}

export function WorkspaceOwnerBadge({ meta, compact }: WorkspaceOwnerBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={`Assigned to ${meta.owner.name} · ${meta.lastTouchedLabel}`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${meta.owner.tint} font-semibold text-white ring-1 ring-white/20 ${
          compact ? "h-4 w-4 text-[7px]" : "h-5 w-5 text-[8px]"
        }`}
        aria-hidden
      >
        {meta.owner.initials}
      </span>
      {!compact ? (
        <span className="max-w-[72px] truncate text-[9px] font-medium text-slate-500">
          {meta.owner.initials}
        </span>
      ) : null}
      {meta.recentlyViewed ? (
        <span
          className="h-1 w-1 shrink-0 rounded-full bg-indigo-400/80"
          title="Recently viewed"
          aria-label="Recently viewed"
        />
      ) : null}
    </span>
  );
}
