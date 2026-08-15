// Read Pons launches off the chain via TokenLaunched events.
//
// The public RPC caps `eth_getLogs` ranges (docs warn: "The public RPC
// times out on wide eth_getLogs ranges. Backfill in bounded block chunks
// from each contract's start block."), so we chunk in 10k-block windows
// and merge the results.

import type { Address } from "viem";
import { getPublicClient } from "../robinhood/client";
import { ponsTokenLaunchedEvent } from "./abi";
import { PONS_CONTRACTS } from "./constants";

const CHUNK = 10_000n;

export interface LaunchEvent {
  token: Address;
  deployer: Address;
  pool: Address;
  pairToken: Address;
  restrictionsEndBlock: bigint;
  initialBuyAmount: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

/**
 * List Pons launches from `fromBlock` (default: factory start) to `head`
 * (default: current). Chunked, safe against the public-RPC range limit.
 * For heavy production indexing, run this once, persist to Supabase,
 * then subscribe to new blocks with a websocket transport instead of
 * re-querying every render.
 */
export async function listLaunches(opts: {
  factory?: Address;
  fromBlock?: bigint;
  toBlock?: bigint;
  limit?: number;
} = {}): Promise<LaunchEvent[]> {
  const client = getPublicClient();
  const factory = opts.factory ?? PONS_CONTRACTS.factory;
  const from =
    opts.fromBlock ??
    (factory === PONS_CONTRACTS.factory
      ? PONS_CONTRACTS.factoryStartBlock
      : PONS_CONTRACTS.legacyFactoryStartBlock);
  const to = opts.toBlock ?? (await client.getBlockNumber());
  const limit = opts.limit ?? Number.POSITIVE_INFINITY;

  const out: LaunchEvent[] = [];
  for (let start = from; start <= to; start += CHUNK) {
    const end = start + CHUNK - 1n < to ? start + CHUNK - 1n : to;
    const logs = await client.getLogs({
      address: factory,
      event: ponsTokenLaunchedEvent,
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) {
      const a = log.args as unknown as {
        token: Address;
        deployer: Address;
        pool: Address;
        pairToken: Address;
        restrictionsEndBlock: bigint;
        initialBuyAmount: bigint;
      };
      out.push({
        token: a.token,
        deployer: a.deployer,
        pool: a.pool,
        pairToken: a.pairToken,
        restrictionsEndBlock: a.restrictionsEndBlock,
        initialBuyAmount: a.initialBuyAmount,
        blockNumber: log.blockNumber!,
        txHash: log.transactionHash!,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
