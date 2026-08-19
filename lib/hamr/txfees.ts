// Gas + fee prefetch through OUR RPC path (the /api/rpc proxy in the
// browser). WHY: when viem writes through an injected wallet, it fills
// missing gas/fee fields by querying the WALLET's provider — and the
// wallet forwards those reads to whatever RPC it has configured for the
// chain. For users whose wallet still points at the geo/rate-blocked
// public endpoint, that surfaced as "eth_getBlockByNumber: RPC endpoint
// returned HTTP client error" mid-launch. Supplying gas + EIP-1559 fees
// upfront means viem skips those wallet-side reads entirely.

import type { Abi, Address } from "viem";
import { getPublicClient } from "../robinhood/client";

export interface PreparedFees {
  gas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/** Best-effort — returns {} on any failure so the caller can fall back
 *  to the wallet's own estimation (old behavior). */
export async function prepareFees(params: {
  account: Address;
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
  value?: bigint;
}): Promise<PreparedFees> {
  const client = getPublicClient();
  const out: PreparedFees = {};
  try {
    const gas = await client.estimateContractGas({
      account: params.account,
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args as unknown[],
      value: params.value,
    });
    // 25% headroom — curve state can move between estimate and mine.
    out.gas = (gas * 125n) / 100n;
  } catch {
    /* estimation revert or RPC hiccup — let the wallet try */
  }
  try {
    const fees = await client.estimateFeesPerGas();
    if (fees.maxFeePerGas) {
      // 2x headroom on the base fee so the tx never stalls on a bump.
      out.maxFeePerGas = fees.maxFeePerGas * 2n;
      out.maxPriorityFeePerGas = fees.maxPriorityFeePerGas ?? 0n;
    }
  } catch {
    /* same — optional */
  }
  return out;
}
