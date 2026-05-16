import PageHeader from "@/components/shell/PageHeader";
import PumpLaunchWizard from "@/components/pump-launch/PumpLaunchWizard";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

// /launch, Phase 03 (Generate) and Phase 04 (Launch) of the agent loop.
export default function LaunchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Generate · Launch"
        title="Launch your memecoin"
        description="Drop your meme idea (or arrive from the radar). Grok drafts the launch kit. You review, sign once, and the agent launches it on Pump.fun. Your wallet is the only signer."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { label: "Launch" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <PhaseProgress current="generate" />
      </div>
      <PumpLaunchWizard />
    </>
  );
}
