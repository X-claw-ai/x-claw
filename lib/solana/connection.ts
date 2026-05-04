import { Connection } from "@solana/web3.js";

// Solana RPC connection. Defaults to mainnet-beta public RPC if no env var
// is set. Public RPC is rate-limited and unreliable for production traffic;
// use Helius / QuickNode / Triton for live launches.
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://api.mainnet-beta.solana.com";

export function getConnection(): Connection {
  return new Connection(RPC_URL, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 60_000,
  });
}
