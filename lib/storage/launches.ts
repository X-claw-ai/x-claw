// Launch history adapter — localStorage by default, Supabase when configured.
//
// The client always keeps an offline localStorage copy so the user never
// loses history if Supabase is down or the API is unreachable. When
// Supabase is wired (Vercel env vars set), every saved launch is also
// POSTed to /api/launches (server uses the SERVICE_ROLE key to insert).

import type { LaunchRecord } from "@/lib/types";

const KEY = "x-claw:launches"; // legacy key — preserved so existing users keep history

export interface SavedLaunch extends LaunchRecord {
  /** real on-chain mint pubkey */
  mintPubkey?: string;
  /** Pump.fun IPFS metadata URI */
  metadataUri?: string;
  /** initial dev buy in SOL */
  devBuyInSol?: number;
  /** signer wallet pubkey at time of launch */
  walletPubkey?: string;
}

export function readLaunches(): SavedLaunch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr as SavedLaunch[];
  } catch {
    return [];
  }
}

/**
 * Save locally (always) + sync to Supabase (best-effort, fire-and-forget).
 * The Supabase sync never throws — failures are silent so the user's UX
 * never degrades on network or env issues.
 */
export function saveLaunch(rec: SavedLaunch) {
  if (typeof window === "undefined") return;
  const all = readLaunches();
  all.unshift(rec);
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));

  // Best-effort Supabase sync. Only if we have the launch fields the API needs.
  if (rec.mintPubkey && rec.walletPubkey && rec.ticker && rec.tokenName) {
    void fetch("/api/launches", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        walletPubkey: rec.walletPubkey,
        mintPubkey: rec.mintPubkey,
        ticker: rec.ticker,
        tokenName: rec.tokenName,
        chain: rec.chain,
        status: rec.status,
        txSignature: rec.txSignature,
        pumpUrl: rec.pumpUrl,
        metadataUri: rec.metadataUri,
        devBuyInSol: rec.devBuyInSol,
        mock: rec.mock ?? false,
      }),
    }).catch(() => {
      /* ignore — localStorage already has the record */
    });
  }
}

/**
 * Hydrate from Supabase (when available) — merges remote launches into
 * the local cache so the user's history follows them across devices/browsers.
 */
export async function hydrateFromSupabase(walletPubkey: string): Promise<SavedLaunch[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(`/api/launches?wallet=${encodeURIComponent(walletPubkey)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) return readLaunches();
    const json = (await res.json()) as {
      ok: boolean;
      persisted?: boolean;
      launches?: Array<{
        wallet_pubkey: string;
        mint_pubkey: string;
        ticker: string;
        token_name: string;
        chain: string;
        status: string;
        tx_signature: string | null;
        pump_url: string | null;
        metadata_uri: string | null;
        dev_buy_sol: number | null;
        mock: boolean;
        created_at: string;
      }>;
    };
    if (!json.ok || !json.persisted || !json.launches) return readLaunches();

    const remote: SavedLaunch[] = json.launches.map((r) => ({
      id: r.mint_pubkey,
      tokenName: r.token_name,
      ticker: r.ticker,
      chain: r.chain as SavedLaunch["chain"],
      status: r.status as SavedLaunch["status"],
      txSignature: r.tx_signature ?? undefined,
      pumpUrl: r.pump_url ?? undefined,
      mintPubkey: r.mint_pubkey,
      metadataUri: r.metadata_uri ?? undefined,
      devBuyInSol: r.dev_buy_sol ?? undefined,
      walletPubkey: r.wallet_pubkey,
      mock: r.mock,
      createdAt: r.created_at,
    }));

    // Merge: remote takes precedence; local-only entries kept.
    const local = readLaunches();
    const remoteMints = new Set(remote.map((r) => r.mintPubkey));
    const merged = [
      ...remote,
      ...local.filter((l) => !l.mintPubkey || !remoteMints.has(l.mintPubkey)),
    ];
    window.localStorage.setItem(KEY, JSON.stringify(merged.slice(0, 200)));
    return merged;
  } catch {
    return readLaunches();
  }
}

export function clearLaunches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  // Also drop the cached meme images so the dashboard doesn't show
  // stale orphaned art if the user re-launches the same mint pubkey.
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith("koki:img:")) window.localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Clear locally + tell Supabase to drop this wallet's launches too.
 * Returns the number of server-side rows that were deleted (0 if Supabase
 * isn't configured). The local cache is wiped regardless.
 */
export async function clearLaunchesEverywhere(walletPubkey?: string): Promise<{
  localCleared: boolean;
  serverDeleted: number;
}> {
  clearLaunches();
  if (!walletPubkey) {
    return { localCleared: true, serverDeleted: 0 };
  }
  try {
    const res = await fetch(
      `/api/launches?wallet=${encodeURIComponent(walletPubkey)}`,
      { method: "DELETE" },
    );
    if (!res.ok) return { localCleared: true, serverDeleted: 0 };
    const json = (await res.json()) as { deleted?: number };
    return { localCleared: true, serverDeleted: json.deleted ?? 0 };
  } catch {
    return { localCleared: true, serverDeleted: 0 };
  }
}
