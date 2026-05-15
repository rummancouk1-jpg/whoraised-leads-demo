interface LiveProductMetaProps {
  verifiedCount: number;
  variant?: "header" | "inline";
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

export function LiveProductMeta({
  verifiedCount,
  variant = "inline",
}: LiveProductMetaProps) {
  if (variant === "header") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300/90">
        <LiveDot />
        Live lead intelligence preview
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
        <LiveDot />
        <span>
          <span className="font-semibold text-slate-800">{verifiedCount}</span> verified
          {verifiedCount === 1 ? " lead" : " leads"}
        </span>
      </span>
      <span className="hidden text-slate-300 sm:inline" aria-hidden>
        |
      </span>
      <span className="text-slate-500">Updated just now</span>
    </div>
  );
}
