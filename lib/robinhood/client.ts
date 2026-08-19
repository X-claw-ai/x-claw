// Shared viem clients for Robinhood Chain.
//
// - `publicClient` reads from the chain (safe on server + browser).
// - Wallet clients (write path) come from wagmi in components; do not
//   instantiate a WalletClient here.
//
// Cached at module scope so we're not spinning up a fresh HTTP transport
// on every RPC call.

import { createPublicClient, http, type PublicClient } from "viem";
import { robinhoodChain } from "./chain";

let cached: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (cached) return cached;
  // Browsers go through our same-origin /api/rpc proxy — the public
  // Robinhood RPC geo/rate-blocks some visitors' IPs directly, and the
  // proxy sidesteps that entirely. Server-side code talks to the RPC
  // directly (Vercel egress is not blocked).
  const url = typeof window !== "undefined" ? "/api/rpc" : undefined;
  cached = createPublicClient({
    chain: robinhoodChain,
    transport: http(url, {
      batch: { wait: 16 },
      retryCount: 5,
      retryDelay: 400,
      timeout: 15_000,
    }),
  }) as PublicClient;
  return cached;
}
