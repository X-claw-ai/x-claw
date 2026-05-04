// Local storage adapter for real Pump.fun launch records.
//
// MVP: stores per-browser. Replace with Supabase `launches` table when
// auth is wired (the schema in /supabase/schema.sql is ready).

import type { LaunchRecord } from "@/lib/types";

const KEY = "x-claw:launches";

export interface SavedLaunch extends LaunchRecord {
  /** real on-chain mint pubkey */
  mintPubkey?: string;
  /** Pump.fun IPFS metadata URI */
  metadataUri?: string;
  /** initial dev buy in SOL */
  devBuyInSol?: number;
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

export function saveLaunch(rec: SavedLaunch) {
  if (typeof window === "undefined") return;
  const all = readLaunches();
  // Newest first; cap at 200
  all.unshift(rec);
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 200)));
}

export function clearLaunches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
