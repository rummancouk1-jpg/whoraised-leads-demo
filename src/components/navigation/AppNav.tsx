"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const APP_MAX_W = "mx-auto w-full max-w-[1320px]";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="relative z-50 border-b border-white/[0.06] bg-[#0b0f14]/95 backdrop-blur-xl"
      aria-label="Primary"
    >
      <div
        className={`flex ${APP_MAX_W} items-center justify-between gap-4 px-5 py-2.5 sm:px-6`}
      >
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-2.5 rounded-lg outline-none ring-indigo-400/50 focus-visible:ring-2"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25 ring-1 ring-white/10 transition group-hover:shadow-indigo-500/40">
            <svg
              className="h-3.5 w-3.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <span className="hidden text-xs font-medium text-slate-400 transition group-hover:text-slate-300 sm:inline">
            WhoRaised
          </span>
        </Link>

        <div
          className="flex items-center rounded-lg border border-white/[0.08] bg-white/[0.03] p-0.5 shadow-inner shadow-black/20 ring-1 ring-white/[0.05] backdrop-blur-md"
          role="tablist"
          aria-label="Workspace views"
        >
          {NAV_ITEMS.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-md px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-indigo-400/50 sm:px-4 ${
                  active
                    ? "bg-white/[0.1] text-white shadow-sm shadow-black/30 ring-1 ring-white/[0.12]"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="hidden w-[72px] sm:block" aria-hidden />
      </div>
    </nav>
  );
}
