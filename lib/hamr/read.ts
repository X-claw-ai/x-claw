// Read side of the HAMR launchpad — stateless viem calls, safe on
// server and client. Hooks in ./hooks.ts wrap these with polling.

import { formatEther, type Address } from "viem";
import { getPublicClient } from "../robinhood/client";
import { hamrLaunchpadAbi, hamrTokenAbi } from "./abi";
import { HAMR_CONTRACTS, HAMR_CURVE } from "./constants";

export interface HamrCurveState {
  creator: Address;
  virtualEth: bigint;
  virtualToken: bigint;
  realEth: bigint;
  tokensSold: bigint;
  graduated: boolean;
  exists: boolean;
}

export interface HamrTokenMeta {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  twitterUrl: string;
  telegramUrl: string;
  websiteUrl: string;
  creator: Address;
}

export interface HamrTokenSnapshot {
  meta: HamrTokenMeta;
  curve: HamrCurveState;
  /** 0–10000 progress toward the 4 ETH graduation raise. */
  progressBps: number;
  /** Spot price in ETH per token at the current curve position. */
  priceEth: number;
  /** ETH still needed to graduate. */
  remainingEth: number;
}

export async function readCurve(token: Address): Promise<HamrCurveState> {
  const client = getPublicClient();
  const [creator, virtualEth, virtualToken, realEth, tokensSold, graduated, exists] =
    await client.readContract({
      address: HAMR_CONTRACTS.launchpad,
      abi: hamrLaunchpadAbi,
      functionName: "curves",
      args: [token],
    });
  return { creator, virtualEth, virtualToken, realEth, tokensSold, graduated, exists };
}

export async function readTokenMeta(token: Address): Promise<HamrTokenMeta> {
  const client = getPublicClient();
  const c = { address: token, abi: hamrTokenAbi } as const;
  const [name, symbol, logo, description, twitterUrl, telegramUrl, websiteUrl, creator] =
    await Promise.all([
      client.readContract({ ...c, functionName: "name" }),
      client.readContract({ ...c, functionName: "symbol" }),
      client.readContract({ ...c, functionName: "logo" }),
      client.readContract({ ...c, functionName: "description" }),
      client.readContract({ ...c, functionName: "twitterUrl" }),
      client.readContract({ ...c, functionName: "telegramUrl" }),
      client.readContract({ ...c, functionName: "websiteUrl" }),
      client.readContract({ ...c, functionName: "creator" }),
    ]);
  return { name, symbol, logo, description, twitterUrl, telegramUrl, websiteUrl, creator };
}

export async function readSnapshot(token: Address): Promise<HamrTokenSnapshot | null> {
  const curve = await readCurve(token);
  if (!curve.exists) return null;
  const meta = await readTokenMeta(token);
  const vEth = Number(formatEther(curve.virtualEth));
  const vTok = Number(curve.virtualToken) / 1e18;
  const priceEth = vTok > 0 ? vEth / vTok : 0;
  const raised = Number(formatEther(curve.realEth));
  const progressBps = curve.graduated
    ? 10_000
    : Math.min(10_000, Math.round((raised / HAMR_CURVE.graduationRaiseEth) * 10_000));
  return {
    meta,
    curve,
    progressBps,
    priceEth,
    remainingEth: Math.max(0, HAMR_CURVE.graduationRaiseEth - raised),
  };
}

export async function quoteBuy(token: Address, ethValue: bigint): Promise<bigint> {
  return getPublicClient().readContract({
    address: HAMR_CONTRACTS.launchpad,
    abi: hamrLaunchpadAbi,
    functionName: "quoteBuy",
    args: [token, ethValue],
  });
}

export async function quoteSell(token: Address, tokenAmount: bigint): Promise<bigint> {
  return getPublicClient().readContract({
    address: HAMR_CONTRACTS.launchpad,
    abi: hamrLaunchpadAbi,
    functionName: "quoteSell",
    args: [token, tokenAmount],
  });
}

export async function readTokenBalance(token: Address, owner: Address): Promise<bigint> {
  return getPublicClient().readContract({
    address: token,
    abi: hamrTokenAbi,
    functionName: "balanceOf",
    args: [owner],
  });
}

/** Newest-first list of launched token addresses (board fallback). */
export async function listTokens(limit = 50): Promise<Address[]> {
  const client = getPublicClient();
  const count = Number(
    await client.readContract({
      address: HAMR_CONTRACTS.launchpad,
      abi: hamrLaunchpadAbi,
      functionName: "tokenCount",
    }),
  );
  const out: Address[] = [];
  for (let i = count - 1; i >= 0 && out.length < limit; i--) {
    out.push(
      await client.readContract({
        address: HAMR_CONTRACTS.launchpad,
        abi: hamrLaunchpadAbi,
        functionName: "allTokens",
        args: [BigInt(i)],
      }),
    );
  }
  return out;
}
