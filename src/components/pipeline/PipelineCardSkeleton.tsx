/** Future-ready loading placeholder — swap in during API hydration. */
export function PipelineCardSkeleton() {
  return (
    <div
      className="animate-pulse rounded-[10px] border border-slate-200/40 bg-white/60 px-2.5 py-2"
      aria-hidden
    >
      <div className="flex gap-2">
        <div className="h-7 w-7 shrink-0 rounded-md bg-slate-200/80" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 w-3/4 rounded bg-slate-200/80" />
          <div className="h-2.5 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        <div className="h-4 w-16 rounded bg-slate-100" />
        <div className="h-4 w-10 rounded bg-slate-100" />
      </div>
      <div className="mt-2 h-8 rounded-md bg-indigo-50/50" />
      <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
        <div className="h-4 w-12 rounded bg-slate-100" />
        <div className="h-5 w-14 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
