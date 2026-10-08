import { Skeleton } from "@/components/ui/Skeleton";
import { STAGES } from "@/types/outreach";

/** Placeholder columns with the loaded board's dimensions, so nothing shifts when the board arrives. */
export function BoardSkeleton() {
  return <div className="gg-board" aria-hidden="true">{STAGES.map(stage => <section className="gg-column" key={stage}><h3><span className="gg-stage-dot" />{stage}</h3><div className="gg-column-body">{[0, 1, 2].map(i => <div className="gg-skel-card" key={i}><Skeleton className="gg-sk-name" /><Skeleton className="gg-sk-chip" style={{ marginTop: 14 }} /><Skeleton className="gg-sk-line" style={{ marginTop: 18 }} /></div>)}</div></section>)}</div>;
}
