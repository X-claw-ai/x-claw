import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

// ─────────────────────────────────────────────────────────────────────────
// Wallet Tracking Agent — server-side data collection
//
// Pulls a public on-chain summary for any Solana address using only the
// configured RPC. No third-party API key required, but we honor HELIUS_API_KEY
// for richer data when present.
//
// Returns a snapshot the Grok summarizer can describe in plain English.
// ─────────────────────────────────────────────────────────────────────────

export interface TokenHolding {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
}

export interface RecentTx {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: string | null;
}

export interface WalletReport {
  address: string;
  solBalance: number;
  tokenCount: number;
  topTokens: TokenHolding[];
  recentTxs: RecentTx[];
  rpcUrl: string;
  enrichedBy?: "helius";
}

const TOKEN_PROGRAM = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);
const TOKEN_2022_PROGRAM = new PublicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export async function buildWalletReport(
  address: string,
  rpcUrl: string
): Promise<WalletReport> {
  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    throw new Error("That doesn't look like a valid Solana address.");
  }

  const conn = new Connection(rpcUrl, "confirmed");

  // Run every RPC call in parallel.
  const [lamports, classicTokens, t22Tokens, sigs] = await Promise.all([
    conn.getBalance(pubkey, "confirmed"),
    conn.getParsedTokenAccountsByOwner(pubkey, {
      programId: TOKEN_PROGRAM,
    }),
    conn
      .getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_2022_PROGRAM,
      })
      .catch(() => ({ value: [] as Awaited<ReturnType<Connection["getParsedTokenAccountsByOwner"]>>["value"] })),
    conn.getSignaturesForAddress(pubkey, { limit: 25 }),
  ]);

  const allTokenAccounts = [...classicTokens.value, ...t22Tokens.value];

  const tokens: TokenHolding[] = allTokenAccounts
    .map((acct) => {
      const info = acct.account.data.parsed?.info;
      const mint = String(info?.mint ?? "");
      const tokenAmount = info?.tokenAmount;
      const decimals = Number(tokenAmount?.decimals ?? 0);
      const amount = Number(tokenAmount?.amount ?? 0);
      const uiAmount = Number(tokenAmount?.uiAmount ?? 0);
      return { mint, amount, decimals, uiAmount };
    })
    .filter((t) => t.uiAmount > 0)
    .sort((a, b) => b.uiAmount - a.uiAmount);

  const recentTxs: RecentTx[] = sigs.map((s) => ({
    signature: s.signature,
    slot: s.slot,
    blockTime: s.blockTime ?? null,
    err: s.err ? JSON.stringify(s.err) : null,
  }));

  return {
    address,
    solBalance: lamports / LAMPORTS_PER_SOL,
    tokenCount: tokens.length,
    topTokens: tokens.slice(0, 12),
    recentTxs,
    rpcUrl,
  };
}

/**
 * Build a compact, model-friendly digest of the wallet report. Used as the
 * user prompt content for the Grok summarizer so the model sees structured
 * facts without bloating the context window.
 */
export function digestWalletReport(r: WalletReport): string {
  const lines: string[] = [];
  lines.push(`Wallet: ${r.address}`);
  lines.push(`SOL balance: ${r.solBalance.toFixed(4)}`);
  lines.push(`Token positions: ${r.tokenCount} total (top ${r.topTokens.length} shown)`);
  if (r.topTokens.length) {
    lines.push("Top tokens (mint · uiAmount):");
    for (const t of r.topTokens) {
      lines.push(`  - ${t.mint} · ${t.uiAmount}`);
    }
  }
  lines.push("");
  lines.push(`Recent ${r.recentTxs.length} transactions (signature · slot · err):`);
  for (const tx of r.recentTxs) {
    const ts = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : "?";
    lines.push(
      `  - ${tx.signature} · slot ${tx.slot} · ${ts} · ${tx.err ? "ERR" : "ok"}`
    );
  }
  return lines.join("\n");
}
