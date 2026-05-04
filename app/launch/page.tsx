import PageHeader from "@/components/shell/PageHeader";
import PumpLaunchWizard from "@/components/pump-launch/PumpLaunchWizard";

// /launch
//
// The X CLAW memecoin launch agent. One flow, end-to-end:
//   Concept → Generate kit → Review → Connect wallet → Sign → Launched.
//
// On Solana mainnet only. Real SOL. Real tokens.
export default function LaunchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Launch agent"
        title="Launch your memecoin"
        description="Drop your meme idea. Grok drafts the launch kit. You review, sign once, and the agent launches it on Pump.fun. Your wallet is the only signer."
        breadcrumbs={[
          { href: "/", label: "X CLAW" },
          { label: "Launch" },
        ]}
      />
      <PumpLaunchWizard />
    </>
  );
}
