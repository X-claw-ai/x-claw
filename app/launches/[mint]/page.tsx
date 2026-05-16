import PageHeader from "@/components/shell/PageHeader";
import LaunchMonitorPage from "@/components/launches/LaunchMonitorPage";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

// /launches/[mint], Phase 05 (Monitor) of the agent loop.
export default function LaunchByMintPage({
  params,
}: {
  params: { mint: string };
}) {
  const mint = params.mint;
  return (
    <>
      <PageHeader
        eyebrow="Monitor · Phase 05"
        title="Post-launch monitor"
        description="Live on-chain monitoring + Grok-recommended next actions. Supply, top holders, creator wallet activity, and ready-to-post content all in one view."
        breadcrumbs={[
          { href: "/", label: "KOKi" },
          { href: "/launches", label: "Launches" },
          { label: shortMint(mint) },
        ]}
      />
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <PhaseProgress current="monitor" />
      </div>
      <LaunchMonitorPage mint={mint} />
    </>
  );
}

function shortMint(s: string): string {
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
