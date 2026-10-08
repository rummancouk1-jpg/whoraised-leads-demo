"use client";

import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, useDraggable, useDroppable, type KeyboardCoordinateGetter } from "@dnd-kit/core";
import { useOutreach } from "@/contexts/OutreachContext";
import { fitScore, leadGroup } from "@/lib/outreach";
import { STAGES, type Lead, type Stage } from "@/types/outreach";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { GripIcon } from "@/components/ui/Icons";

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
  const { weights, moveStage } = useOutreach();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({ id: overlay ? `overlay:${lead.tracked_slug}` : lead.tracked_slug, disabled: overlay });
  return <article ref={setNodeRef} className={`gg-pipeline-card ${isDragging ? "gg-drag-source" : ""}`} data-lead={lead.tracked_slug}>
    <div className="gg-card-top"><span className="gg-avatar" aria-hidden>{lead.name.slice(0, 2).toUpperCase()}</span><button className="gg-card-name" onClick={() => onOpen(lead)}>{lead.name}<small>{lead.handle}</small></button><button ref={setActivatorNodeRef} className="gg-drag-handle" {...attributes} {...listeners} aria-label={`Drag ${lead.name}`} title="Drag to stage; keyboard: Space, arrows, Space"><GripIcon /></button></div>
    <div className="gg-card-tags"><span>{lead.platform}</span><span>{lead.niche}</span><span>{leadGroup(lead)}</span></div>
    <div className="gg-card-footer"><div><small>Audience · Signups</small><strong>{lead.audience_size.toLocaleString()} · {lead.signups}</strong></div><span className="gg-score">{lead.priority_score ?? fitScore(lead, weights).score}</span></div>
    <div className="gg-card-actions">
      <select className="gg-card-stage" aria-label={`Stage for ${lead.name}`} value={lead.stage} disabled={overlay} onChange={e => moveStage(lead.tracked_slug, e.target.value as Stage)}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select>
      <button className="gg-card-draft" onClick={() => onOpen(lead)}>Outreach draft ↗</button>
    </div>
  </article>;
}
function Column({ stage, leads, onOpen }: { stage: Stage; leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}` });
  return <section className={`gg-column ${isOver ? "gg-column-over" : ""}`} data-stage={stage} ref={setNodeRef} aria-label={`${stage}, ${leads.length} leads`}><h3><span className={`gg-stage-dot gg-stage-${stage.toLowerCase()}`} aria-hidden="true" />{stage}<span className="gg-column-count">{leads.length}</span></h3><div className="gg-column-body">{leads.map(l => <Card key={l.tracked_slug} lead={l} onOpen={onOpen} />)}{!leads.length && <p className="gg-column-empty">Drop a lead here, or import leads with stage {stage}.</p>}</div></section>;
}
export function Board({ leads, onOpen }: { leads: Lead[]; onOpen: (lead: Lead) => void }) {
  const { moveStage } = useOutreach();
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: stageCoordinates, scrollBehavior: reduced ? "auto" : "smooth" }));
  const jump = (stage: Stage) => document.querySelector<HTMLElement>(`.gg-column[data-stage="${stage}"]`)?.scrollIntoView({ inline: "start", block: "nearest", behavior: reduced ? "auto" : "smooth" });
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActive(leads.find(l => l.tracked_slug === e.active.id) ?? null)} onDragCancel={() => setActive(null)} onDragEnd={e => { const stage = String(e.over?.id ?? "").replace(/^stage:/, "") as Stage; if (STAGES.includes(stage)) moveStage(String(e.active.id), stage); setActive(null); }}>
    <nav className="gg-stage-jump" aria-label="Jump to stage">{STAGES.map(s => <button key={s} className="gg-stagechip" onClick={() => jump(s)}><span className={`gg-stage-dot gg-stage-${s.toLowerCase()}`} aria-hidden="true" /><span className="gg-stagechip-name">{s}</span><strong>{leads.filter(l => l.stage === s).length}</strong></button>)}</nav>
    <div className={`gg-board pipeline-board-scroll ${active ? "gg-dragging" : ""}`} role="region" aria-label="Lead pipeline board" tabIndex={0}>{STAGES.map(s => <Column key={s} stage={s} leads={leads.filter(l => l.stage === s)} onOpen={onOpen} />)}</div>
    <DragOverlay dropAnimation={reduced ? null : { duration: 200, easing: "cubic-bezier(.2,.9,.3,1.1)" }}>{active && <div className="gg-overlay-card" aria-hidden="true" inert><Card lead={active} onOpen={onOpen} overlay /></div>}</DragOverlay>
  </DndContext>;
}
