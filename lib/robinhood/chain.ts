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

export const robinhoodChain = defineChain({
  id: ROBINHOOD_CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ROBINHOOD_RPC_URL ||
          "https://rpc.mainnet.chain.robinhood.com",
      ],
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
