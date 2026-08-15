import PageHeader from "@/components/shell/PageHeader";
import PonsLaunchWizard from "@/components/pons-launch/PonsLaunchWizard";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

// /launch, Phase 03 (Generate) and Phase 04 (Launch) of the agent loop.
// Wired to the Pons launch wizard: Grok drafts the launch kit, then the
// user's wallet signs one transaction to the Pons factory on Robinhood
// Chain. See components/pons-launch/PonsLaunchWizard for the state
// machine.
export default function LaunchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Generate, Launch"
        title="Launch your memecoin"
        description="Drop your meme idea (or arrive from the radar). Grok drafts the launch kit. You review, sign once, and the agent launches it on Pons on Robinhood Chain. Your wallet is the only signer."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { label: "Launch" },
        ]}
      />
      <div className="mx-auto max-w-5xl px-6 pt-8">
        <PhaseProgress current="generate" />
      </div>
      <PonsLaunchWizard />
    </>
  );
}
