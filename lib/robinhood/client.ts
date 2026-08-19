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
  cached = createPublicClient({
    chain: robinhoodChain,
    // The public Robinhood RPC intermittently returns HTTP 4xx under
    // load. Batch JSON-RPC calls to cut request count and retry with
    // backoff so a transient limiter never surfaces as a user error.
    transport: http(undefined, {
      batch: { wait: 16 },
      retryCount: 5,
      retryDelay: 400,
      timeout: 15_000,
    }),
  }) as PublicClient;
  return cached;
}
