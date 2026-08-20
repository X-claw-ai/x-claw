// HAMR's own launchpad on Robinhood Chain — deployed 2026-08-16.
// See contracts/DEPLOY.md for txs and the full runbook.

import type { Address } from "viem";

export const HAMR_CONTRACTS = {
  /** Factory + bonding curve + graduation, all in one. */
  launchpad: "0xEac5CB9B5e7F32074Aa232EE54e62196cc236b8e" as Address,
  /** Permanent LP lock + 75/25 fee splitter. */
  locker: "0x93dd19970Ca4CD2Bd405014c9247A0f33DA0f926" as Address,
  /** Canonical WETH on Robinhood Chain (all pools pair vs WETH). */
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address,
} as const;

/** Curve economics — mirrors the on-chain constants exactly. */
export const HAMR_CURVE = {
  totalSupply: 1_000_000_000, // 1B, 18 decimals
  curveSupply: 800_000_000, // sold along the curve
  lpSupply: 200_000_000, // paired at graduation
  virtualEthStart: 1.5,
  virtualTokenStart: 1_100_000_000,
  graduationRaiseEth: 4, // exact by construction
  launchFeeEth: "0.0005",
  tradeFeeBps: 100, // 1% on curve buys/sells
  creatorFeeBps: 7_500, // creator's share of every fee (75%)
  poolFeeBps: 10_000, // Uniswap V3 1% tier post-graduation
} as const;

/** Tokens hidden from the board/trending (test launches). They still
 *  exist on-chain — direct /launches/<address> URLs keep working — but
 *  the site's lists filter them out. */
export const HIDDEN_TOKENS = new Set<string>([
  "0xfeb0eeb54526372ed319e1119a2a16c48a57e60f", // HTEST
  "0x82a75d3efcfd6c3b6686f24e461e611153a9d148", // HAM
  "0xf7814af7add678ed288d8c66cdf0b7d046558272", // POTBOI
  "0x737bad994bef78176b96b2ede7f7520099ea4618", // JAKET (4th test)
  "0x75cc26bdcd8f0bc348e022a66bf84b715c3d423d", // Hamr V2 Test (v2 smoke)
  "0xd50fee5e8b9d76ef686045cce68ea5bfd4703d10", // HAMRGUY (v2 test launch)
  "0xc4fa5dfc396e1839e4dc551ec1d5ffb9c12ef1d1", // EARUP (v2 test launch)
]);
