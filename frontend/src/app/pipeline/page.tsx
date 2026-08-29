import { redirect } from "next/navigation";

// /pipeline → /pipeline/new (flagship pipeline entry point)
export default function PipelineIndexPage() {
  redirect("/pipeline/new");
}
