import PageHeader from "@/components/shell/PageHeader";
import LaunchMonitorPage from "@/components/launches/LaunchMonitorPage";

// /launches/[mint]
//
// Per-token monitoring dashboard mirroring the agent loop:
//   03 Intelligence  · supply + top holders + creator wallet activity
//   01 Attention     · post-launch X content
//   02 Community     · launch-wizard reuse
//   04 Execution     · original launch tx + metadata
export default function LaunchByMintPage({
  params,
}: {
  params: { mint: string };
}) {
  const mint = params.mint;
  return (
    <>
      <PageHeader
        eyebrow="Launch monitor"
        title="Token monitor"
        description="Live on-chain monitoring for the launched token. Supply, holders, and ready-to-post content all in one view."
        breadcrumbs={[
          { href: "/", label: "X CLAW" },
          { href: "/launches", label: "Launches" },
          { label: shortMint(mint) },
        ]}
      />
      <LaunchMonitorPage mint={mint} />
    </>
  );
}

function shortMint(s: string): string {
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
