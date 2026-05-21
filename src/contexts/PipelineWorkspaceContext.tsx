"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LeadCrmContext, PipelineHealthMetrics } from "@/types/crm-workflow";
import type { LeadWorkspaceMeta } from "@/types/pipeline-workspace";
import {
  DEFAULT_PIPELINE_FILTERS,
  type PipelineFilters,
  type PipelineViewId,
} from "@/types/pipeline-workspace";
import type { PipelineBoardState } from "@/types/pipeline";
import { PIPELINE_COLUMNS } from "@/types/pipeline";
import {
  countActiveCustomFilters,
  countVisibleLeads,
  filterPipelineBoard,
  getViewById,
  mergePipelineFilters,
} from "@/lib/pipeline-filters";
import {
  WORKSPACE_TEAM,
  buildWorkspaceMetaMap,
  formatWorkspaceTimestamp,
  getLeadWorkspaceMeta,
} from "@/lib/pipeline-workspace";
import { computePipelineHealth } from "@/lib/pipeline-intelligence";

interface PipelineWorkspaceContextValue {
  fullBoard: PipelineBoardState;
  displayBoard: PipelineBoardState;
  activeViewId: PipelineViewId;
  activeViewLabel: string;
  customFilters: PipelineFilters;
  activeFilterCount: number;
  visibleCount: number;
  totalCount: number;
  filteredHealth: PipelineHealthMetrics;
  lastUpdatedLabel: string;
  filterPanelOpen: boolean;
  setActiveView: (id: PipelineViewId) => void;
  setCustomFilters: (filters: PipelineFilters) => void;
  patchCustomFilters: (patch: Partial<PipelineFilters>) => void;
  resetCustomFilters: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  toggleFilterPanel: () => void;
  getWorkspaceMeta: (leadId: string) => LeadWorkspaceMeta;
  teamPresence: typeof WORKSPACE_TEAM;
}

const PipelineWorkspaceCtx = createContext<PipelineWorkspaceContextValue | null>(
  null,
);

export function PipelineWorkspaceProvider({
  fullBoard,
  getCrmContext,
  children,
}: {
  fullBoard: PipelineBoardState;
  getCrmContext: (leadId: string) => LeadCrmContext | undefined;
  children: ReactNode;
}) {
  const [activeViewId, setActiveViewId] = useState<PipelineViewId>("all");
  const [customFilters, setCustomFilters] = useState<PipelineFilters>(
    DEFAULT_PIPELINE_FILTERS,
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());

  const totalCount = useMemo(() => countVisibleLeads(fullBoard), [fullBoard]);

  const workspaceMetaMap = useMemo(() => {
    const ids = PIPELINE_COLUMNS.flatMap((c) =>
      fullBoard[c.id].map((l) => l.id),
    );
    return buildWorkspaceMetaMap(ids);
  }, [fullBoard]);

  const displayBoard = useMemo(
    () => filterPipelineBoard(fullBoard, activeViewId, customFilters, getCrmContext),
    [fullBoard, activeViewId, customFilters, getCrmContext],
  );

  const visibleCount = useMemo(
    () => countVisibleLeads(displayBoard),
    [displayBoard],
  );

  const filteredHealth = useMemo(
    () => computePipelineHealth(displayBoard),
    [displayBoard],
  );

  const activeFilterCount = useMemo(
    () => countActiveCustomFilters(activeViewId, customFilters),
    [activeViewId, customFilters],
  );

  const bumpUpdated = useCallback(() => {
    setLastUpdatedAt(Date.now());
  }, []);

  const setActiveView = useCallback(
    (id: PipelineViewId) => {
      setActiveViewId(id);
      bumpUpdated();
    },
    [bumpUpdated],
  );

  const handleSetCustomFilters = useCallback(
    (filters: PipelineFilters) => {
      setCustomFilters(filters);
      bumpUpdated();
    },
    [bumpUpdated],
  );

  const patchCustomFilters = useCallback(
    (patch: Partial<PipelineFilters>) => {
      setCustomFilters((prev) => ({ ...prev, ...patch }));
      bumpUpdated();
    },
    [bumpUpdated],
  );

  const resetCustomFilters = useCallback(() => {
    setCustomFilters(DEFAULT_PIPELINE_FILTERS);
    bumpUpdated();
  }, [bumpUpdated]);

  const getWorkspaceMeta = useCallback(
    (leadId: string) =>
      workspaceMetaMap.get(leadId) ?? getLeadWorkspaceMeta(leadId),
    [workspaceMetaMap],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "f" && !e.metaKey && !e.ctrlKey && !inField) {
        e.preventDefault();
        setFilterPanelOpen((o) => !o);
      }
      if (e.key === "Escape" && filterPanelOpen) {
        e.preventDefault();
        setFilterPanelOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filterPanelOpen]);

  const value = useMemo(
    () => ({
      fullBoard,
      displayBoard,
      activeViewId,
      activeViewLabel: getViewById(activeViewId).label,
      customFilters,
      activeFilterCount,
      visibleCount,
      totalCount,
      filteredHealth,
      lastUpdatedLabel: formatWorkspaceTimestamp(lastUpdatedAt),
      filterPanelOpen,
      setActiveView,
      setCustomFilters: handleSetCustomFilters,
      patchCustomFilters,
      resetCustomFilters,
      setFilterPanelOpen,
      toggleFilterPanel: () => setFilterPanelOpen((o) => !o),
      getWorkspaceMeta,
      teamPresence: WORKSPACE_TEAM,
    }),
    [
      fullBoard,
      displayBoard,
      activeViewId,
      customFilters,
      activeFilterCount,
      visibleCount,
      totalCount,
      filteredHealth,
      lastUpdatedAt,
      filterPanelOpen,
      setActiveView,
      handleSetCustomFilters,
      patchCustomFilters,
      resetCustomFilters,
      getWorkspaceMeta,
    ],
  );

  return (
    <PipelineWorkspaceCtx.Provider value={value}>
      {children}
    </PipelineWorkspaceCtx.Provider>
  );
}

export function usePipelineWorkspace(): PipelineWorkspaceContextValue {
  const ctx = useContext(PipelineWorkspaceCtx);
  if (!ctx) {
    throw new Error(
      "usePipelineWorkspace must be used within PipelineWorkspaceProvider",
    );
  }
  return ctx;
}

export function usePipelineWorkspaceOptional(): PipelineWorkspaceContextValue | null {
  return useContext(PipelineWorkspaceCtx);
}

export { mergePipelineFilters };
