import PageHeader from "@/components/shell/PageHeader";
import LaunchMonitorPage from "@/components/launches/LaunchMonitorPage";
import { PhaseProgress } from "@/components/ui/PhaseProgress";

// Monitor page polls the HAMR launchpad via viem — must render in the browser
// only, otherwise wagmi's WalletConnect init crashes prerender on indexedDB.
export const dynamic = "force-dynamic";

// /launches/[mint], Phase 05 (Monitor) of the agent loop.
//
// The dynamic segment name is still `mint` for backward compatibility
// with radar / share links from the Solana era. Values are now EVM
// token addresses (0x...) instead of Solana mint pubkeys; the monitor
// component handles both shapes gracefully.
export default function LaunchByMintPage({
  params,
}: {
  params: { mint: string };
}) {
  const token = params.mint;
  return (
    <>
      <PageHeader
        eyebrow="Monitor, Phase 05"
        title="Post-launch monitor"
        description="Live curve state on Robinhood Chain — price, graduation progress, and Blockscout links, polled straight from the HAMR launchpad."
        breadcrumbs={[
          { href: "/", label: "HAMR" },
          { href: "/launches", label: "Launches" },
          { label: shortAddr(token) },
        ]}
      />
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <PhaseProgress current="monitor" />
      </div>
      <LaunchMonitorPage token={token} />
    </>
  );
}

function shortAddr(s: string): string {
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}
