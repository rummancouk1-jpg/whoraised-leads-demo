"use client";

import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, useDraggable, useDroppable, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { useOutreach } from "@/contexts/OutreachContext";
import { fitScore, leadGroup } from "@/lib/outreach";
import { STAGES, type Lead, type Stage } from "@/types/outreach";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const stageCoordinates: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  if (!["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.code)) return undefined;
  event.preventDefault();
  const columns = STAGES.map(s => ({ id: `stage:${s}`, rect: context.droppableRects.get(`stage:${s}`) })).filter(c => c.rect);
  const current = columns.findIndex(c => c.id === context.over?.id);
  const direction = event.code === "ArrowRight" || event.code === "ArrowDown" ? 1 : -1;
  const next = columns[Math.max(0, Math.min(columns.length - 1, (current < 0 ? 0 : current) + direction))];
  if (!next?.rect || !context.collisionRect) return currentCoordinates;
  return { x: currentCoordinates.x + next.rect.left + next.rect.width / 2 - (context.collisionRect.left + context.collisionRect.width / 2), y: currentCoordinates.y + next.rect.top + Math.min(100, next.rect.height / 2) - (context.collisionRect.top + context.collisionRect.height / 2) };
};
function Card({ lead, onOpen, overlay = false }: { lead: Lead; onOpen: (lead: Lead) => void; overlay?: boolean }) {
  const { weights } = useOutreach();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: overlay ? `overlay:${lead.tracked_slug}` : lead.tracked_slug, disabled: overlay });
  return <article ref={setNodeRef} className={`gg-pipeline-card ${isDragging ? "gg-drag-source" : ""}`} data-lead={lead.tracked_slug}>
    <div className="gg-card-top"><span className="gg-avatar" aria-hidden>{lead.name.slice(0, 2).toUpperCase()}</span><button className="gg-card-name" onClick={() => onOpen(lead)}>{lead.name}<small>{lead.handle}</small></button><button ref={setActivatorNodeRef} className="gg-drag-handle" {...attributes} {...listeners} aria-label={`Drag ${lead.name}`} title="Drag to stage; keyboard: Space, arrows, Space">⠿</button></div>
    <div className="gg-card-tags"><span>{lead.platform}</span><span>{lead.niche}</span><span>{leadGroup(lead)}</span></div>
    <div className="gg-card-footer"><div><small>Audience · Signups</small><strong>{lead.audience_size.toLocaleString()} · {lead.signups}</strong></div><span className="gg-score">{lead.priority_score ?? fitScore(lead, weights).score}</span></div>
    <button className="gg-card-draft" onClick={() => onOpen(lead)}>Outreach draft ↗</button>
  </article>;
}
function Column({ stage, leads, onOpen }: { stage: Stage; leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}` });
  return <section className={`gg-column ${isOver ? "gg-column-over" : ""}`} data-stage={stage} ref={setNodeRef}><h3><span className={`gg-stage-dot gg-stage-${stage.toLowerCase()}`} />{stage}<span className="gg-column-count">{leads.length}</span></h3><div className="gg-column-body">{leads.map(l => <Card key={l.tracked_slug} lead={l} onOpen={onOpen} />)}{!leads.length && <p className="gg-column-empty">Drop a lead here, or import leads with stage {stage}.</p>}</div></section>;
}
export function Board({ leads, onOpen }: { leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const { update } = useOutreach();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: stageCoordinates, scrollBehavior: reduced ? "auto" : "smooth" }));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActive(leads.find(l => l.tracked_slug === e.active.id) ?? null)} onDragCancel={() => setActive(null)} onDragEnd={e => { const stage = String(e.over?.id ?? "").replace(/^stage:/, "") as Stage; if (STAGES.includes(stage)) update(String(e.active.id), { stage }); setActive(null); }}>
    <div className="gg-board pipeline-board-scroll" role="region" aria-label="Lead pipeline board" tabIndex={0}>{STAGES.map(s => <Column key={s} stage={s} leads={leads.filter(l => l.stage === s)} onOpen={onOpen} />)}</div>
    <DragOverlay dropAnimation={reduced ? null : { duration: 180, easing: "ease-out" }}>{active && <div className="gg-overlay-card" aria-hidden="true" inert><Card lead={active} onOpen={onOpen} overlay /></div>}</DragOverlay>
  </DndContext>;
}
