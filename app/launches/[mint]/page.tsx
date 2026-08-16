import LaunchMonitorPage from "@/components/launches/LaunchMonitorPage";

// Monitor page polls the HAMR launchpad via viem — must render in the browser
// only, otherwise wagmi's WalletConnect init crashes prerender on indexedDB.
export const dynamic = "force-dynamic";

// /launches/[mint] — the token page. Pump.fun style: no marketing header,
// no agent-phase strip. The token IS the page: identity, chart, curve,
// trade box.
//
// The dynamic segment name is still `mint` for backward compatibility
// with radar / share links from the Solana era. Values are now EVM
// token addresses (0x...).
export default function LaunchByMintPage({
  params,
}: {
  params: { mint: string };
}) {
  return <LaunchMonitorPage token={params.mint} />;
}
