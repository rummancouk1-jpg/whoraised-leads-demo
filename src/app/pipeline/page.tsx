import { PipelineView } from "@/components/pipeline/PipelineView";

export const metadata = {
  title: "Pipeline · WhoRaised Leads Demo",
  description: "Kanban pipeline view for funded startup leads",
};

export default function PipelinePage() {
  return <PipelineView />;
}
