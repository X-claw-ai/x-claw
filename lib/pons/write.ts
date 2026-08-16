// Write side of Pons — build a launch transaction the caller's wallet
// can sign.
//
// Non-custodial: this module only PREPARES the transaction. It never
// takes a private key. Callers pass a viem WalletClient (from wagmi in
// components, or an injected signer server-side for the auto-pilot
// worker) and call `.writeContract(prepared)`.
//
// STATUS (2026-08-16): the real ABI IS now verified from the published
// PonsLaunchFactory source on Robinhood Blockscout — launchToken(params
// tuple, launchConfigId, dexId, salt) payable. See lib/pons/abi.ts.
//
// The remaining blocker is ACCESS CONTROL, not the ABI: the factory
// whitelists launcher addresses, and every non-whitelisted launchToken
// call on mainnet reverts with custom error NotWhitelisted(). Until the
// Pons team whitelists a HAMR launcher, direct in-app signing would just
// burn the user's gas — so the gate below stays closed and the wizard
// hands off to the official Pons launchpad UI instead.

import { parseEther, type Address, type WalletClient } from "viem";
import { getPublicClient } from "../robinhood/client";
import { createLaunchAbi, ponsTokenLaunchedEvent } from "./abi";
import {
  PONS_CONTRACTS,
  PONS_EVENT_TOPICS,
  PONS_LAUNCH_PARAMS,
} from "./constants";

/** The launchToken ABI is confirmed against the verified factory source. */
export const PONS_LAUNCH_ABI_VERIFIED = true;

/**
 * Master gate for in-app signing. Flip to true ONLY after the Pons team
 * whitelists a HAMR launcher address — the factory reverts with
 * NotWhitelisted() for everyone else, so enabling this early would send
 * users a transaction that is guaranteed to fail.
 */
export const PONS_DIRECT_LAUNCH_ENABLED = false;

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
    farcaster?: string;
  };
  /** Recipient of the creator's 70% fee share. Usually the signer. */
  feeWallet: Address;
  /** Optional creator "first buy" in ETH — helps warm the pool immediately. */
  initialBuyEth?: string;
}

/** Random 32-byte salt for the deterministic token address derivation. */
export function randomLaunchSalt(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

/**
 * Build the parameters for wallet.writeContract(). Does NOT submit.
 * Callers use the return value like:
 *
 *   const prepared = buildLaunchTx({ ... });
 *   const hash = await walletClient.writeContract(prepared);
 */
export function buildLaunchTx(args: LaunchArgs) {
  if (!PONS_DIRECT_LAUNCH_ENABLED) {
    // Loud fail is better than a guaranteed NotWhitelisted() revert that
    // costs the user gas. The wizard surfaces the official-launchpad
    // handoff while HAMR's launcher whitelist request is pending.
    throw new Error(
      "[pons/write] direct launches are gated — the Pons factory only accepts whitelisted launcher addresses (NotWhitelisted). Use the official Pons launchpad handoff.",
    );
  }

  const s = args.socials ?? {};
  const value =
    parseEther(PONS_LAUNCH_PARAMS.launchFeeEth) +
    (args.initialBuyEth ? parseEther(args.initialBuyEth) : 0n);

  return {
    address: PONS_CONTRACTS.factory,
    abi: createLaunchAbi,
    functionName: "launchToken" as const,
    args: [
      {
        name: args.name,
        symbol: args.symbol,
        logo: args.logo,
        description: args.description,
        socials: {
          twitter: s.twitter ?? "",
          telegram: s.telegram ?? "",
          discord: s.discord ?? "",
          website: s.website ?? "",
          farcaster: s.farcaster ?? "",
        },
        feeWallet: args.feeWallet,
      },
      0n, // launchConfigId — the default WETH config (observed in live txs)
      0n, // dexId — Uniswap V3 (observed in live txs)
      randomLaunchSalt(),
    ] as const,
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
