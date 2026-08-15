import { redirect } from "next/navigation";
import PageHeader from "@/components/shell/PageHeader";
import MemeAnalysisView from "@/components/analyze/MemeAnalysisView";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

export default function AnalyzePage({
  searchParams,
}: {
  searchParams: { meme?: string };
}) {
  const memeId = searchParams.meme;
  if (!memeId) redirect("/dashboard");

  return (
    <>
      <PageHeader
        eyebrow="Analyze"
        title="Launch readiness analysis"
        description="HAMR scores the detected meme across 10 criteria and surfaces the best angle, audience, timing, and key risks."
        breadcrumbs={[
          { href: "/", label: "HAMR" },
          { href: "/dashboard", label: "Radar" },
          { label: "Analyze" },
        ]}
      />
      <section className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <PhaseProgress current="analyze" />
        <MemeAnalysisView memeId={memeId} />
      </section>
    </>
  );
}
