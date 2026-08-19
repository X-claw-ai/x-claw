// Robinhood Chain — Arbitrum-based L2 for tokenized stocks + RWA + memes.
// Launched 2026-07-01. Chain ID 4663. All HAMR launches live here from
// the migration onward. viem `defineChain` gives wagmi/RainbowKit and
// any server-side viem client a first-class chain object.
//
// Public RPC works fine for reads; heavy indexers should upgrade to a
// premium RPC (env: ROBINHOOD_RPC_URL) to avoid the public endpoint's
// eth_getLogs range limits.

import { defineChain } from "viem";

export const ROBINHOOD_CHAIN_ID = 4663 as const;

/** Direct upstream RPC — server-side reads and the /api/rpc proxy hit
 *  this. Browsers and wallets should use the proxy instead. */
export const ROBINHOOD_DIRECT_RPC =
  process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

// The chain's default RPC MUST be an absolute URL: WalletConnect's
// provider builds an HTTP client from it and throws on relative paths
// ("Provided URL is not compatible with HTTP connection: /api/rpc"),
// which silently killed every mobile wallet connect. If the env is set
// to a relative proxy path, anchor it to the production origin.
const rawPublicRpc =
  process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL || "https://hamr.fun/api/rpc";
const PUBLIC_RPC_ABSOLUTE = rawPublicRpc.startsWith("http")
  ? rawPublicRpc
  : `https://hamr.fun${rawPublicRpc.startsWith("/") ? "" : "/"}${rawPublicRpc}`;

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    // The default RPC is our same-origin proxy (absolute form). This is
    // what wallet_addEthereumChain hands to MetaMask/Rabby when a user
    // adds Robinhood Chain from the site — so THEIR wallet's internal
    // reads (fee estimation, blocks) also route through hamr.fun instead
    // of the public endpoint, which geo/rate-blocks some users.
    default: {
      http: [PUBLIC_RPC_ABSOLUTE],
    },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  // No known verified contracts multicall on Robinhood Chain yet — leave
  // wagmi's `multicall3` config unset so it falls back to per-call reads.
  testnet: false,
});

/** Wrap a token or tx hash in a Blockscout explorer URL. */
export function explorerUrl(
  kind: "tx" | "address" | "token" | "block",
  value: string,
): string {
  const base = robinhoodChain.blockExplorers.default.url.replace(/\/$/, "");
  return `${base}/${kind}/${value}`;
}
