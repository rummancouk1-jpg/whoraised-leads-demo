import type { ReactNode } from "react";

interface DrawerSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

export function DrawerSection({
  id,
  title,
  children,
  className = "",
}: DrawerSectionProps) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 rounded-lg border border-slate-200/70 bg-white/80 p-3.5 shadow-sm ring-1 ring-slate-900/[0.03] ${className}`}
    >
      <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}
