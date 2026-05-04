import { Connection, PublicKey } from "@solana/web3.js";

// ─────────────────────────────────────────────────────────────────────────
// Token Info — public on-chain snapshot for a given mint.
//
// Returns total supply, decimals, and the top largest holders. Pure RPC,
// no API keys required.
// ─────────────────────────────────────────────────────────────────────────

export interface TokenInfo {
  mint: string;
  supply: { uiAmount: number; amount: string; decimals: number };
  largestAccounts: { address: string; amount: string; uiAmount: number }[];
}

export async function fetchTokenInfo(
  mintAddress: string,
  rpcUrl: string
): Promise<TokenInfo> {
  let mint: PublicKey;
  try {
    mint = new PublicKey(mintAddress);
  } catch {
    throw new Error("Invalid mint address.");
  }

  const conn = new Connection(rpcUrl, "confirmed");

  const [supply, largest] = await Promise.all([
    conn.getTokenSupply(mint),
    conn.getTokenLargestAccounts(mint),
  ]);

  return {
    mint: mintAddress,
    supply: {
      uiAmount: supply.value.uiAmount ?? 0,
      amount: supply.value.amount,
      decimals: supply.value.decimals,
    },
    largestAccounts: largest.value.map((a) => ({
      address: a.address.toBase58(),
      amount: a.amount,
      uiAmount: a.uiAmount ?? 0,
    })),
  };
}
