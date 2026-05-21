import { forwardRef, type HTMLAttributes } from "react";

interface PipelineCardDragHandleProps {
  handleProps: HTMLAttributes<HTMLElement>;
}

export const PipelineCardDragHandle = forwardRef<
  HTMLButtonElement,
  PipelineCardDragHandleProps
>(function PipelineCardDragHandle({ handleProps }, ref) {
  const { className, ...rest } = handleProps;

  return (
    <button
      ref={ref}
      type="button"
      className={`shrink-0 rounded p-0.5 text-slate-500 transition-colors duration-150 ease-out hover:bg-white/[0.06] hover:text-slate-300 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 ${className ?? ""}`}
      aria-label="Drag to move card"
      onClick={(e) => e.stopPropagation()}
      style={{ touchAction: "none" }}
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
});
