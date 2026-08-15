// Write side of Pons — build a launch transaction the caller's wallet
// can sign.
//
// Non-custodial: this module only PREPARES the transaction. It never
// takes a private key. Callers pass a viem WalletClient (from wagmi in
// components, or an injected signer server-side for the auto-pilot
// worker) and call `.writeContract(prepared)`.
//
// IMPORTANT: the exact `launch` function signature is not published in
// the Pons docs surface. We ship a placeholder here that mirrors the
// reserved shape and gate it behind `PONS_LAUNCH_ABI_VERIFIED`. When we
// confirm the real ABI on Robinhood Blockscout the guard flips off in
// one place and the caller path stays identical.

import { parseEther, type Address, type WalletClient } from "viem";
import { getPublicClient } from "../robinhood/client";
import { createLaunchAbi, ponsTokenLaunchedEvent } from "./abi";
import {
  PONS_CONTRACTS,
  PONS_EVENT_TOPICS,
  PONS_LAUNCH_PARAMS,
} from "./constants";

/** Flip this to `true` once the launch ABI is verified from a real tx. */
export const PONS_LAUNCH_ABI_VERIFIED = false;

export interface LaunchArgs {
  name: string;
  symbol: string;
  logo: string; // IPFS URI or public URL
  description: string;
  socials?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
  /** Optional creator "first buy" in ETH — helps warm the pool immediately. */
  initialBuyEth?: string;
}

/**
 * Build the parameters for wallet.writeContract(). Does NOT submit.
 * Callers use the return value like:
 *
 *   const prepared = buildLaunchTx({ ... });
 *   const hash = await walletClient.writeContract(prepared);
 */
export function buildLaunchTx(args: LaunchArgs) {
  if (!PONS_LAUNCH_ABI_VERIFIED) {
    // Loud fail is better than silent wrong-selector. The wizard should
    // surface a "Pons launch temporarily unavailable" banner while we
    // finalize the ABI. Reads keep working.
    throw new Error(
      "[pons/write] launch ABI not yet verified — waiting on Blockscout confirmation before enabling mainnet launches.",
    );
  }

  const s = args.socials ?? {};
  const value =
    parseEther(PONS_LAUNCH_PARAMS.launchFeeEth) +
    (args.initialBuyEth ? parseEther(args.initialBuyEth) : 0n);

  return {
    address: PONS_CONTRACTS.factory,
    abi: createLaunchAbi,
    functionName: "launch" as const,
    args: [
      args.name,
      args.symbol,
      args.logo,
      args.description,
      s.twitter ?? "",
      s.telegram ?? "",
      s.discord ?? "",
      s.website ?? "",
    ],
    value,
  };
}

/**
 * After the launch tx is mined, decode the TokenLaunched event to get
 * the deployed token address + pool. Returns null if the tx did not
 * include a Pons launch (e.g., wallet reverted or wrong contract).
 */
export async function decodeLaunchReceipt(txHash: `0x${string}`): Promise<{
  token: Address;
  pool: Address;
  deployer: Address;
  restrictionsEndBlock: bigint;
} | null> {
  const client = getPublicClient();
  const receipt = await client.waitForTransactionReceipt({ hash: txHash });

  const factoryAddr = PONS_CONTRACTS.factory.toLowerCase();
  const launchLog = receipt.logs.find(
    (l) =>
      l.address.toLowerCase() === factoryAddr &&
      l.topics?.[0] === PONS_EVENT_TOPICS.tokenLaunched,
  );
  if (!launchLog) return null;

  // Manual decode via the parsed event fragment.
  // token = indexed topic 1, deployer = indexed topic 2.
  const token = ("0x" + launchLog.topics[1]!.slice(26)) as Address;
  const deployer = ("0x" + launchLog.topics[2]!.slice(26)) as Address;
  // pool + restrictionsEndBlock live in the non-indexed data blob.
  // Use viem's decodeEventLog against ponsTokenLaunchedEvent instead of
  // hand-rolling ABI decode on the data hex.
  const { decodeEventLog } = await import("viem");
  const decoded = decodeEventLog({
    abi: [ponsTokenLaunchedEvent],
    data: launchLog.data,
    topics: launchLog.topics,
  });
  const dArgs = decoded.args as unknown as {
    pool: Address;
    restrictionsEndBlock: bigint;
  };
  return {
    token,
    deployer,
    pool: dArgs.pool,
    restrictionsEndBlock: dArgs.restrictionsEndBlock,
  };
}

/**
 * Server-side / auto-pilot helper: given an already-instantiated
 * WalletClient (typically hydrated from a private key on the server
 * for the auto-pilot worker), submit a launch tx and return the mined
 * token address. Never call this from client bundle.
 */
export async function submitLaunchWithWallet(
  wallet: WalletClient,
  args: LaunchArgs,
): Promise<{
  txHash: `0x${string}`;
  token: Address;
  pool: Address;
}> {
  const prepared = buildLaunchTx(args);
  const [account] = await wallet.getAddresses();
  const txHash = await wallet.writeContract({
    ...prepared,
    account,
    chain: wallet.chain,
  });
  const decoded = await decodeLaunchReceipt(txHash);
  if (!decoded) {
    throw new Error(
      `[pons/write] launch tx ${txHash} mined but TokenLaunched event missing`,
    );
  }
  return { txHash, token: decoded.token, pool: decoded.pool };
}
