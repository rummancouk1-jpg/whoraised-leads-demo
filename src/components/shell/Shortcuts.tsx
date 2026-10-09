"use client";

import { useEffect, useRef } from "react";
import { useOutreach } from "@/contexts/OutreachContext";
import { useUIState } from "@/contexts/UIContext";
import { Modal } from "@/components/outreach/Modal";

const typing = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
};
const dialogOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]');

/** Global keyboard layer: ⌘K, "/", "?", "g then h/p/e", j/k to walk rows, ⌘Z to undo. Never fires while typing. */
export function Shortcuts() {
  const ui = useUIState();
  const { undoLast } = useOutreach();
  const chord = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);
  const latest = useRef({ ui, undoLast });
  useEffect(() => { latest.current = { ui, undoLast }; });
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const { ui, undoLast } = latest.current;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); ui.setPalette(!ui.palette); return; }
      if (e.defaultPrevented || e.altKey) return;
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) { if (typing(e.target) || dialogOpen()) return; e.preventDefault(); undoLast(); return; }
      if (mod || typing(e.target) || dialogOpen()) return;
      if (armed.current) {
        armed.current = false; if (chord.current) clearTimeout(chord.current);
        const dest = ({ h: "/", p: "/pipeline", e: "/email" } as const)[e.key.toLowerCase() as "h" | "p" | "e"];
        if (dest) { e.preventDefault(); ui.go(dest); }
        return;
      }
      if (e.key === "g") { armed.current = true; chord.current = setTimeout(() => { armed.current = false; }, 1200); return; }
      if (e.key === "/") { const search = document.getElementById("lead-search") as HTMLInputElement | null; e.preventDefault(); if (search) { search.focus(); search.select(); } else ui.setPalette(true); return; }
      if (e.key === "?") { e.preventDefault(); ui.setDialog("shortcuts"); return; }
      if (e.key === "j" || e.key === "k") {
        const rows = [...document.querySelectorAll<HTMLElement>(".gg-name-button, .gg-card-name")];
        if (!rows.length) return;
        e.preventDefault();
        const at = rows.indexOf(document.activeElement as HTMLElement);
        rows[Math.max(0, Math.min(rows.length - 1, at + (e.key === "j" ? 1 : -1)))].focus();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);
  return null;
}

const ROWS: [string[], string][] = [
  [["⌘/Ctrl", "K"], "Open the command palette"],
  [["/"], "Focus lead search"],
  [["G", "H"], "Go to Home"],
  [["G", "P"], "Go to Pipeline"],
  [["G", "E"], "Go to Email"],
  [["J"], "Next lead in the list or board"],
  [["K"], "Previous lead"],
  [["Enter"], "Open the focused lead"],
  [["⌘/Ctrl", "Z"], "Undo the last stage move"],
  [["?"], "Show this list"],
  [["Esc"], "Close a dialog, drawer or palette"],
];
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  return <Modal title="Keyboard shortcuts" onClose={onClose}>
    <p>On a phone or tablet, use the Search tab for everything the palette does, and the stage menu on each pipeline card instead of dragging.</p>
    <dl className="gg-shortcuts">{ROWS.map(([keys, label]) => <div key={label}><dt>{keys.map((k, i) => <span key={k}>{i > 0 && <span className="gg-then" aria-hidden="true">{keys[0] === "G" ? "then" : "+"}</span>}<kbd className="gg-kbd">{k}</kbd></span>)}</dt><dd>{label}</dd></div>)}</dl>
  </Modal>;
}
