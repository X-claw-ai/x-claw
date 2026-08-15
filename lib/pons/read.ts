// Read-only helpers for Pons tokens.
//
// Uses viem `publicClient` (see lib/robinhood/client). Every function
// here is safe to call from the server (SSR, API routes) or the browser.
// A UI component that wants live prices should batch these into a single
// `Promise.all` — the Uniswap V3 pool + factory + locker are all on
// Robinhood Chain so latency is dominated by the RPC round-trip.

import { formatUnits, zeroAddress, type Address } from "viem";
import { getPublicClient } from "../robinhood/client";
import {
  ponsTokenAbi,
  ponsFactoryReadAbi,
  ponsLockerAbi,
  uniV3PoolSlot0Abi,
} from "./abi";
import { PONS_CONTRACTS } from "./constants";

export interface PonsTokenMeta {
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
  logo: string;
  description: string;
  pool: Address;
  socials: {
    twitter: string;
    telegram: string;
    discord: string;
    website: string;
    farcaster: string;
  };
}

/** Read every self-describing field off a Pons launch token. */
export async function readTokenMeta(token: Address): Promise<PonsTokenMeta> {
  const client = getPublicClient();
  const [name, symbol, decimals, totalSupply, logo, description, pool, socials] =
    await Promise.all([
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "name" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "symbol" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "decimals" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "totalSupply" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "logo" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "description" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "liquidityPool" }),
      client.readContract({ address: token, abi: ponsTokenAbi, functionName: "socials" }),
    ]);
  const s = socials as readonly [string, string, string, string, string];
  return {
    address: token,
    name: name as string,
    symbol: symbol as string,
    decimals: Number(decimals),
    totalSupply: totalSupply as bigint,
    logo: logo as string,
    description: description as string,
    pool: pool as Address,
    socials: {
      twitter: s[0],
      telegram: s[1],
      discord: s[2],
      website: s[3],
      farcaster: s[4],
    },
  };
}

export interface PonsLaunchState {
  deployer: Address;
  pairedToken: Address; // WETH
  positionId: bigint;
  dexId: bigint;
  launchConfigId: bigint;
  restrictionsEndBlock: bigint;
  supply: bigint;
  isToken0: boolean;
  poolFee: number;
  exists: boolean;
  initialBuyAmount: bigint;
}

/** Launch-level state (fixed at deploy) from the factory that made the token. */
export async function readLaunchState(
  token: Address,
  factory: Address = PONS_CONTRACTS.factory,
): Promise<PonsLaunchState | null> {
  const client = getPublicClient();
  const result = (await client.readContract({
    address: factory,
    abi: ponsFactoryReadAbi,
    functionName: "getLaunchedToken",
    args: [token],
  })) as {
    token: Address;
    deployer: Address;
    pairedToken: Address;
    positionManager: Address;
    positionId: bigint;
    dexId: bigint;
    launchConfigId: bigint;
    restrictionsEndBlock: bigint;
    supply: bigint;
    isToken0: boolean;
    poolFee: number;
    exists: boolean;
    initialBuyAmount: bigint;
  };
  if (!result || !result.exists) return null;
  return {
    deployer: result.deployer,
    pairedToken: result.pairedToken,
    positionId: result.positionId,
    dexId: result.dexId,
    launchConfigId: result.launchConfigId,
    restrictionsEndBlock: result.restrictionsEndBlock,
    supply: result.supply,
    isToken0: result.isToken0,
    poolFee: Number(result.poolFee),
    exists: result.exists,
    initialBuyAmount: result.initialBuyAmount,
  };
}

export interface PonsGraduation {
  pairedPrincipal: bigint;
  threshold: bigint;
  graduated: boolean;
  /** 0.0 – 1.0 progress toward graduation. */
  progress: number;
  progressPercent: number;
  pairedPrincipalEth: string;
  thresholdEth: string;
}

export async function readGraduation(
  token: Address,
  factory: Address = PONS_CONTRACTS.factory,
): Promise<PonsGraduation> {
  const client = getPublicClient();
  const [pairedPrincipal, threshold, graduated] = (await client.readContract({
    address: factory,
    abi: ponsFactoryReadAbi,
    functionName: "graduationStatus",
    args: [token],
  })) as [bigint, bigint, boolean];
  const progress =
    threshold > 0n
      ? Math.min(1, Number((pairedPrincipal * 10_000n) / threshold) / 10_000)
      : 0;
  return {
    pairedPrincipal,
    threshold,
    graduated,
    progress,
    progressPercent: Math.round(progress * 100),
    pairedPrincipalEth: formatUnits(pairedPrincipal, 18),
    thresholdEth: formatUnits(threshold, 18),
  };
}

/** Live pool price in WETH. Multiply by ETH/USD to get USD. */
export async function readPriceInWeth(
  pool: Address,
  isToken0: boolean,
): Promise<number> {
  const client = getPublicClient();
  const [sqrtPriceX96] = (await client.readContract({
    address: pool,
    abi: [uniV3PoolSlot0Abi],
    functionName: "slot0",
  })) as [bigint, number, number, number, number, number, boolean];
  const ratio = Number(sqrtPriceX96) / 2 ** 96;
  const token1PerToken0 = ratio * ratio;
  return isToken0 ? token1PerToken0 : 1 / token1PerToken0;
}

export interface PonsFeeSplit {
  creatorSharePercent: number;
  protocolSharePercent: number;
  creatorPayout: Address;
}

/**
 * Snapshotted fee split + payout wallet for a specific token. The docs
 * note the split is fixed at launch and NEVER changes afterward, so we
 * expose the values as-is instead of the current-factory constants.
 */
export async function readFeeSplit(
  token: Address,
  factory: Address = PONS_CONTRACTS.factory,
): Promise<PonsFeeSplit> {
  const client = getPublicClient();
  const [locker, launched] = await Promise.all([
    client.readContract({
      address: factory,
      abi: ponsFactoryReadAbi,
      functionName: "locker",
    }) as Promise<Address>,
    readLaunchState(token, factory),
  ]);
  const [protocolShare, redirect] = await Promise.all([
    client.readContract({
      address: locker,
      abi: ponsLockerAbi,
      functionName: "tokenProtocolFeeShares",
      args: [token],
    }) as Promise<bigint>,
    client.readContract({
      address: locker,
      abi: ponsLockerAbi,
      functionName: "feeRedirects",
      args: [token],
    }) as Promise<Address>,
  ]);
  const creatorPayout =
    redirect === zeroAddress ? (launched?.deployer ?? zeroAddress) : redirect;
  return {
    creatorSharePercent: 100 - Number(protocolShare),
    protocolSharePercent: Number(protocolShare),
    creatorPayout,
  };
}
