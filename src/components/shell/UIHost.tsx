"use client";

import { useCallback } from "react";
import dynamic from "next/dynamic";
import { useOutreach } from "@/contexts/OutreachContext";
import { useUIState } from "@/contexts/UIContext";
import { Shortcuts } from "./Shortcuts";
const ImportDialog = dynamic(() => import("@/components/outreach/DataDialogs").then(m=>m.ImportDialog));
const ExportDialog = dynamic(() => import("@/components/outreach/DataDialogs").then(m=>m.ExportDialog));
const LeadDrawer = dynamic(() => import("@/components/outreach/LeadDrawer").then(m=>m.LeadDrawer));
const CommandPalette = dynamic(() => import("./CommandPalette").then(m=>m.CommandPalette));
const ShortcutsDialog = dynamic(() => import("./Shortcuts").then(m=>m.ShortcutsDialog));

/** App-wide overlays: lead drawer, import/export, shortcuts and the palette, reachable from any page. */
export function UIHost() {
  const { leads } = useOutreach();
  const { selected, closeLead, dialog, setDialog, palette } = useUIState();
  const closeDialog = useCallback(() => setDialog(null), [setDialog]);
  const lead = leads.find(l => l.tracked_slug === selected);
  return <>
    <Shortcuts />
    {dialog === "import" && <ImportDialog onClose={closeDialog} />}
    {dialog === "export" && <ExportDialog onClose={closeDialog} />}
    {dialog === "shortcuts" && <ShortcutsDialog onClose={closeDialog} />}
    {lead && <LeadDrawer key={lead.tracked_slug} lead={lead} onClose={closeLead} />}
    {palette && <CommandPalette />}
  </>;
}
