import type { HTMLAttributes } from "react";

interface PipelineCardDragHandleProps {
  handleProps: HTMLAttributes<HTMLElement>;
}

export function PipelineCardDragHandle({ handleProps }: PipelineCardDragHandleProps) {
  const { className, ...rest } = handleProps;

  return (
    <button
      type="button"
      className={`shrink-0 rounded p-0.5 text-slate-500 transition-colors hover:bg-white/[0.08] hover:text-slate-300 active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${className ?? ""}`}
      aria-label="Drag to move"
      onClick={(e) => e.stopPropagation()}
      {...rest}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <circle cx="5" cy="4" r="1" />
        <circle cx="11" cy="4" r="1" />
        <circle cx="5" cy="8" r="1" />
        <circle cx="11" cy="8" r="1" />
        <circle cx="5" cy="12" r="1" />
        <circle cx="11" cy="12" r="1" />
      </svg>
    </button>
  );
}
