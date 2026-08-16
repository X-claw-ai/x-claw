import PageHeader from "@/components/shell/PageHeader";
import PonsLaunchWizard from "@/components/pons-launch/PonsLaunchWizard";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

// wagmi + WalletConnect touch indexedDB during hydration, which throws
// during Next.js prerender. Skip static generation for this route so the
// wallet stack only ever runs in the browser.
export const dynamic = "force-dynamic";

// /launch, Phase 03 (Generate) and Phase 04 (Launch) of the agent loop.
// Launch wizard: the agent drafts the kit, then the
// user's wallet signs one transaction to the HAMR factory on Robinhood
// Chain. See components/pons-launch/PonsLaunchWizard for the state
// machine.
export default function LaunchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Generate, Launch"
        title="Launch your memecoin"
        description="Drop your meme idea (or arrive from the radar). The HAMR agent drafts the launch kit. You review, sign once, and the agent launches it on the HAMR launchpad on Robinhood Chain. Your wallet is the only signer."
        breadcrumbs={[
          { href: "/", label: "HAMR" },
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
