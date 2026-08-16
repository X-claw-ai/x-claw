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
