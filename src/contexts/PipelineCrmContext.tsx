"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type {
  LeadCrmContext,
  PipelineActivityEvent,
  PipelineActivityInput,
  PipelineHealthMetrics,
} from "@/types/crm-workflow";
import type { Lead } from "@/types/lead";
import type { PipelineBoardState, PipelineStage } from "@/types/pipeline";
import { findLeadStage } from "@/lib/pipeline-dnd";
import {
  buildBoardCrmContextMap,
  computePipelineHealth,
  createActivityEvent,
  stageChangeActivityLabel,
} from "@/lib/pipeline-intelligence";

export interface DrawerSelection {
  leadId: string;
  stageId: PipelineStage;
}

interface PipelineCrmContextValue {
  getLeadContext: (leadId: string) => LeadCrmContext | undefined;
  health: PipelineHealthMetrics;
  recordStageChange: (leadId: string, stage: PipelineStage) => void;
  pulseStage: PipelineStage | null;
  drawerSelection: DrawerSelection | null;
  openLeadDrawer: (lead: Lead, stageId: PipelineStage) => void;
  closeLeadDrawer: () => void;
  resolveDrawerLead: () => Lead | null;
  draftDialogLeadId: string | null;
  openDraftDialog: (leadId: string) => void;
  closeDraftDialog: () => void;
  resolveDraftDialogLead: () => Lead | null;
  onToggleSaved?: (leadId: string) => void;
}

const PipelineCrmCtx = createContext<PipelineCrmContextValue | null>(null);

export function PipelineCrmProvider({
  board,
  setBoard,
  children,
}: {
  board: PipelineBoardState;
  setBoard?: Dispatch<SetStateAction<PipelineBoardState>>;
  children: ReactNode;
}) {
  const [extraActivities, setExtraActivities] = useState<
    Record<string, PipelineActivityEvent[]>
  >({});
  const [pulseStage, setPulseStage] = useState<PipelineStage | null>(null);
  const [drawerSelection, setDrawerSelection] = useState<DrawerSelection | null>(
    null,
  );
  const [draftDialogLeadId, setDraftDialogLeadId] = useState<string | null>(
    null,
  );

  const contextMap = useMemo(
    () => buildBoardCrmContextMap(board, extraActivities),
    [board, extraActivities],
  );

  const health = useMemo(() => computePipelineHealth(board), [board]);

  const getLeadContext = useCallback(
    (leadId: string) => contextMap.get(leadId),
    [contextMap],
  );

  const resolveDrawerLead = useCallback((): Lead | null => {
    if (!drawerSelection) return null;
    const stage = findLeadStage(board, drawerSelection.leadId);
    if (!stage) return null;
    return board[stage].find((l) => l.id === drawerSelection.leadId) ?? null;
  }, [board, drawerSelection]);

  const openLeadDrawer = useCallback((lead: Lead, stageId: PipelineStage) => {
    setDrawerSelection({ leadId: lead.id, stageId });
  }, []);

  const closeLeadDrawer = useCallback(() => {
    setDrawerSelection(null);
  }, []);

  const openDraftDialog = useCallback((leadId: string) => {
    setDraftDialogLeadId(leadId);
  }, []);

  const closeDraftDialog = useCallback(() => {
    setDraftDialogLeadId(null);
  }, []);

  const resolveDraftDialogLead = useCallback((): Lead | null => {
    if (!draftDialogLeadId) return null;
    const stage = findLeadStage(board, draftDialogLeadId);
    if (!stage) return null;
    return board[stage].find((l) => l.id === draftDialogLeadId) ?? null;
  }, [board, draftDialogLeadId]);

  const onToggleSaved = useCallback(
    (leadId: string) => {
      if (!setBoard) return;
      setBoard((prev) => {
        const stage = findLeadStage(prev, leadId);
        if (!stage) return prev;
        return {
          ...prev,
          [stage]: prev[stage].map((l) =>
            l.id === leadId ? { ...l, saved: !l.saved } : l,
          ),
        };
      });
    },
    [setBoard],
  );

  const appendActivity = useCallback(
    (leadId: string, input: PipelineActivityInput) => {
      const event = createActivityEvent(leadId, input);
      setExtraActivities((prev) => ({
        ...prev,
        [leadId]: [event, ...(prev[leadId] ?? [])].slice(0, 8),
      }));
    },
    [],
  );

  const recordStageChange = useCallback(
    (leadId: string, stage: PipelineStage) => {
      appendActivity(leadId, {
        type: "stage_change",
        label: stageChangeActivityLabel(stage),
      });
      setPulseStage(stage);
      setDrawerSelection((prev) =>
        prev?.leadId === leadId ? { ...prev, stageId: stage } : prev,
      );
      window.setTimeout(() => setPulseStage(null), 520);
    },
    [appendActivity],
  );

  const value = useMemo(
    () => ({
      getLeadContext,
      health,
      recordStageChange,
      pulseStage,
      drawerSelection,
      openLeadDrawer,
      closeLeadDrawer,
      resolveDrawerLead,
      draftDialogLeadId,
      openDraftDialog,
      closeDraftDialog,
      resolveDraftDialogLead,
      onToggleSaved: setBoard ? onToggleSaved : undefined,
    }),
    [
      getLeadContext,
      health,
      recordStageChange,
      pulseStage,
      drawerSelection,
      openLeadDrawer,
      closeLeadDrawer,
      resolveDrawerLead,
      draftDialogLeadId,
      openDraftDialog,
      closeDraftDialog,
      resolveDraftDialogLead,
      setBoard,
      onToggleSaved,
    ],
  );

  return (
    <PipelineCrmCtx.Provider value={value}>{children}</PipelineCrmCtx.Provider>
  );
}

export function usePipelineCrm(): PipelineCrmContextValue {
  const ctx = useContext(PipelineCrmCtx);
  if (!ctx) {
    throw new Error("usePipelineCrm must be used within PipelineCrmProvider");
  }
  return ctx;
}

export function usePipelineCrmOptional(): PipelineCrmContextValue | null {
  return useContext(PipelineCrmCtx);
}
