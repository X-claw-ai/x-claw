// EVM/Robinhood Chain launch storage — replaces the old Solana/Pump.fun
// storage (mintPubkey / pumpUrl fields). Backed by localStorage on the
// client and by Supabase on the server. Every field is now EVM-shaped:
// `token` is a 0x address, `pool` is the Uniswap V3 pool address, and
// `explorerUrl` points at Robinhood Blockscout.
//
// Fields intentionally overlap with the old shape where the semantics
// are identical (id, tokenName, ticker, createdAt, status, metadataUri)
// so most render code just re-reads without changes.

const KEY = "hamr:launches:v2";

export type LaunchStatus = "draft" | "signing" | "launched" | "failed";

export interface SavedLaunch {
  id: string;
  createdAt: number;
  tokenName: string;
  ticker: string;
  /** ERC-20 contract address of the launched token. */
  token?: string;
  /** Uniswap V3 pool address paired against WETH. */
  pool?: string;
  /** Address of the wallet that signed the launch tx. */
  deployer?: string;
  /** IPFS or public URL of the launch logo. */
  logo?: string;
  /** Optional pointer to a JSON metadata blob (kept for backward compat). */
  metadataUri?: string;
  /** Robinhood Blockscout URL for the token / pool. */
  explorerUrl?: string;
  /** External Pons page for this token. */
  ponsUrl?: string;
  status: LaunchStatus;
  /** true if this record came from the demo / mock flow, not a real chain event. */
  mock?: boolean;
}

/** Read local launches from localStorage. Safe on server (returns []). */
export function readLaunches(): SavedLaunch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedLaunch[]) : [];
  } catch {
    return [];
  }
}

/** Append or upsert a launch record locally. */
export function saveLaunch(launch: SavedLaunch): SavedLaunch[] {
  const all = readLaunches();
  const idx = all.findIndex((l) => l.id === launch.id);
  if (idx >= 0) all[idx] = launch;
  else all.unshift(launch);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* quota, ignore */
  }
  return all;
}

/** Server + local wipe. `wallet` scopes the server DELETE. */
export async function clearLaunchesEverywhere(
  wallet?: string,
): Promise<{ serverDeleted: number }> {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  let serverDeleted = 0;
  if (wallet) {
    try {
      const res = await fetch(`/api/launches?wallet=${encodeURIComponent(wallet)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          deleted?: number;
        };
        serverDeleted = json.deleted ?? 0;
      }
    } catch {
      /* network, ignore */
    }
  }
  return { serverDeleted };
}
