"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigateSession } from "@/lib/session-navigation";
import { useUIState } from "@/contexts/UIContext";
import { BoardIcon, HomeIcon, LogoutIcon, MailIcon, MoonIcon, SearchIcon, SunIcon, SystemIcon } from "@/components/ui/Icons";

const NAV_ITEMS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/pipeline", label: "Pipeline", Icon: BoardIcon },
  { href: "/email", label: "Email", Icon: MailIcon },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function useShortcutLabel() {
  const [label, setLabel] = useState("");
  useEffect(() => { const t = setTimeout(() => setLabel(/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K"), 0); return () => clearTimeout(t); }, []);
  return label;
}

export function AppNav() {
  const pathname = usePathname();
  const { setPalette, theme, cycleTheme } = useUIState();
  const shortcut = useShortcutLabel();
  const themeName = theme === "system" ? "System" : theme === "light" ? "Light" : "Dark";
  const ThemeIcon = theme === "system" ? SystemIcon : theme === "light" ? SunIcon : MoonIcon;
  const logout = async () => { const response = await fetch("/api/auth", { method: "DELETE" }); if (response.ok) navigateSession("/login"); };

  return (
    <>
      <header className="gg-topbar">
        <div className="gg-topbar-inner">
          <Link href="/" prefetch={false} aria-label="GG Outreach home" className="gg-brand">
            <span className="gg-brand-mark" aria-hidden="true">GG</span>
            <span className="gg-brand-name">GG Outreach</span>
          </Link>

          <nav className="gg-nav" aria-label="Primary">
            {NAV_ITEMS.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return <Link key={href} href={href} prefetch={false} aria-current={active ? "page" : undefined} className={`gg-nav-link ${active ? "gg-nav-active" : ""}`}>{label}</Link>;
            })}
          </nav>

          <div className="gg-topbar-actions">
            <button className="gg-search-trigger" onClick={() => setPalette(true)} aria-label="Search or run a command" aria-keyshortcuts="Control+K Meta+K">
              <SearchIcon /><span className="gg-search-text">Search or jump to…</span>{shortcut && <kbd className="gg-kbd" aria-hidden="true">{shortcut}</kbd>}
            </button>
            <button className="gg-icon-button" onClick={cycleTheme} aria-label={`Appearance: ${themeName}. Switch appearance`} title={`Appearance: ${themeName}`}><ThemeIcon /></button>
            <button className="gg-logout" onClick={logout}><LogoutIcon /><span>Log out</span></button>
          </div>
        </div>
      </header>

      <nav className="gg-tabbar" aria-label="Mobile">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return <Link key={href} href={href} prefetch={false} aria-current={active ? "page" : undefined} className={`gg-tab ${active ? "gg-tab-active" : ""}`}><Icon /><span>{label}</span></Link>;
        })}
        <button className="gg-tab" onClick={() => setPalette(true)} aria-label="Search or run a command"><SearchIcon /><span>Search</span></button>
      </nav>
    </>
  );
}
