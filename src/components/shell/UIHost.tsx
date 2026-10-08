"use client";

import { useCallback } from "react";
import { useOutreach } from "@/contexts/OutreachContext";
import { useUIState } from "@/contexts/UIContext";
import { ImportDialog, ExportDialog } from "@/components/outreach/DataDialogs";
import { LeadDrawer } from "@/components/outreach/LeadDrawer";
import { CommandPalette } from "./CommandPalette";
import { Shortcuts, ShortcutsDialog } from "./Shortcuts";

/** App-wide overlays: lead drawer, import/export, shortcuts and the palette, reachable from any page. */
export function UIHost() {
  const { leads } = useOutreach();
  const { selected, closeLead, dialog, setDialog } = useUIState();
  const closeDialog = useCallback(() => setDialog(null), [setDialog]);
  const lead = leads.find(l => l.tracked_slug === selected);
  return <>
    <Shortcuts />
    {dialog === "import" && <ImportDialog onClose={closeDialog} />}
    {dialog === "export" && <ExportDialog onClose={closeDialog} />}
    {dialog === "shortcuts" && <ShortcutsDialog onClose={closeDialog} />}
    {lead && <LeadDrawer key={lead.tracked_slug} lead={lead} onClose={closeLead} />}
    <CommandPalette />
  </>;
}
