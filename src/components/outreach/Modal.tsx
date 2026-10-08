"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { createPortal } from "react-dom";

export function Modal({ title, onClose, drawer = false, children }: { title: string; onClose: () => void; drawer?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, true);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const background = [...document.body.children].filter(element => !element.contains(ref.current));
    const previousInert = background.map(element => element.hasAttribute("inert"));
    background.forEach(element => element.setAttribute("inert", ""));
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; background.forEach((element, index) => { if (!previousInert[index]) element.removeAttribute("inert"); }); document.removeEventListener("keydown", escape); };
  }, [onClose]);
  return typeof document === "undefined" ? null : createPortal(<div className={`gg-modal-backdrop ${drawer ? "gg-drawer-backdrop" : ""}`} onClick={onClose}>
    <div ref={ref} className={`gg-modal ${drawer ? "gg-drawer drawer-panel-enter" : "draft-dialog-enter"}`} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={e => e.stopPropagation()}>
      <header className="gg-modal-header"><div><p className="gg-eyebrow">GG Outreach</p><h2 id="modal-title">{title}</h2></div><button className="gg-button gg-secondary" onClick={onClose} aria-label="Close dialog">Close</button></header>
      <div className="gg-modal-body">{children}</div>
    </div>
  </div>, document.body);
}
