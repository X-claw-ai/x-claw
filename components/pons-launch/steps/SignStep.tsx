"use client";

import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";

import { ArrowLeft, Rocket, ExternalLink, AlertTriangle } from "lucide-react";
import {
  PONS_LAUNCH_PARAMS,
  PONS_DIRECT_LAUNCH_ENABLED,
  buildLaunchTx,
  decodeLaunchReceipt,
} from "@/lib/pons";
import { explorerUrl } from "@/lib/robinhood/chain";
import type { LaunchKit, LaunchResult } from "../types";

// Step 4: Sign & submit.
//
// Two paths:
//   1. PONS_DIRECT_LAUNCH_ENABLED = true  → wallet signs launchToken()
//      on the factory directly (ABI verified from Blockscout source).
//   2. PONS_DIRECT_LAUNCH_ENABLED = false → guided handoff to the
//      official Pons launchpad UI. This is the CURRENT state: the Pons
//      factory whitelists launcher addresses and reverts everyone else
//      with NotWhitelisted(), so in-app signing would only burn gas.
//      The kit copies to clipboard so paste-in is one action.
//
// The moment Pons whitelists a HAMR launcher, flipping the flag in
// lib/pons/write.ts switches every user to in-app signing without
// touching this UI.

interface Props {
  kit: LaunchKit;
  initialBuyEth: string;
  onBack: () => void;
  onSuccess: (r: LaunchResult) => void;
}

export default function SignStep({ kit, initialBuyEth, onBack, onSuccess }: Props) {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    writeContractAsync,
    data: submittedHash,
    isPending: writePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: mining,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: submittedHash,
    query: { enabled: Boolean(submittedHash) },
  });

  // When the receipt lands, decode the TokenLaunched event and hand off
  // to onSuccess. We do it eagerly (once) so the parent can advance to
  // the success step without the user clicking again.
  if (receipt && submittedHash && !localError) {
    // Fire and forget — the parent gets the final result via onSuccess.
    void (async () => {
      try {
        const decoded = await decodeLaunchReceipt(submittedHash);
        if (!decoded) {
          setLocalError(
            "Launch tx mined but Pons TokenLaunched event was missing. Check the tx on Blockscout.",
          );
          return;
        }
        onSuccess({
          token: decoded.token as `0x${string}`,
          pool: decoded.pool as `0x${string}`,
          txHash: submittedHash,
          ponsUrl: `https://www.ponsfamily.com/launchpad/${decoded.token}`,
          explorerUrl: explorerUrl("token", decoded.token),
        });
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Failed to decode launch receipt",
        );
      }
    })();
  }

  async function handleSign() {
    setLocalError(null);
    resetWrite();
    if (!PONS_DIRECT_LAUNCH_ENABLED) {
      setLocalError(
        "The Pons factory currently only accepts whitelisted launcher addresses — use the official launchpad handoff below while HAMR's whitelist request is pending.",
      );
      return;
    }
    if (!isConnected || !address) {
      setLocalError("Connect your wallet first.");
      return;
    }
    try {
      const prepared = buildLaunchTx({
        name: kit.tokenName,
        symbol: kit.ticker,
        logo: kit.logoUrl ?? "",
        description: kit.shortDescription,
        socials: kit.socials,
        feeWallet: address,
        initialBuyEth: initialBuyEth || undefined,
      });
      await writeContractAsync(prepared);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Wallet rejected the launch tx",
      );
    }
  }

  async function copyKit() {
    const blob = JSON.stringify(
      {
        name: kit.tokenName,
        symbol: kit.ticker,
        logo: kit.logoUrl,
        description: kit.shortDescription,
        socials: kit.socials,
      },
      null,
      2,
    );
    try {
      await navigator.clipboard.writeText(blob);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked, silent */
    }
  }

  const errMsg =
    localError ??
    (writeError instanceof Error ? writeError.message : null) ??
    (receiptError instanceof Error ? receiptError.message : null);

  const busy = writePending || mining;

  return (
    <div className="space-y-6">
      <div className="card !p-5 space-y-4">
        <div>
          <div className="eyebrow !text-[10px]">Final review</div>
          <div className="mt-1 text-display text-[26px] leading-tight">
            Launch {kit.tokenName}
          </div>
          <div className="text-[12px] font-extrabold text-ink-300/70">
            ${kit.ticker} · on Pons · Robinhood Chain
          </div>
        </div>
        <p className="text-[13px] text-ink-300/85 font-medium leading-relaxed">
          Your wallet will prompt to sign one transaction that:
        </p>
        <ol className="text-[12px] text-ink-300/85 font-semibold space-y-1.5 list-decimal list-inside">
          <li>Pays {PONS_LAUNCH_PARAMS.launchFeeEth} ETH launch fee</li>
          <li>Deploys the ERC-20 with fixed 1B supply</li>
          <li>Opens a Uniswap V3 WETH pool with locked liquidity</li>
          {initialBuyEth && Number(initialBuyEth) > 0 && (
            <li>Buys {initialBuyEth} ETH of the token into your wallet</li>
          )}
        </ol>
      </div>

      {!PONS_DIRECT_LAUNCH_ENABLED && (
        <div className="card !p-5 !border-amber-500/40 !bg-amber-500/5 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-[12px] font-semibold text-amber-200 leading-relaxed">
              Pons currently allows launches only from whitelisted launcher addresses (the factory reverts everyone else). While HAMR's whitelist request is pending, copy the kit and
              finish on the official Pons launchpad — you get the same
              token address either way.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyKit}
              className="btn btn-secondary !py-2 !px-3 !text-xs"
            >
              {copied ? "Copied ✓" : "Copy launch kit"}
            </button>
            <a
              href="https://www.ponsfamily.com/launchpad/create"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary !py-2 !px-3 !text-xs"
            >
              Open Pons create
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      )}

      {errMsg && (
        <div className="card !p-4 !border-red-500/50 !bg-red-500/10 text-[12px] text-red-300 font-semibold leading-relaxed break-words">
          {errMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="btn btn-secondary !py-2.5 !px-4 disabled:opacity-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={handleSign}
          disabled={busy || !PONS_DIRECT_LAUNCH_ENABLED}
          className="btn btn-primary !py-2.5 !px-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className={`h-3.5 w-3.5 ${busy ? "animate-pulse" : ""}`} />
          {mining
            ? "Confirming…"
            : writePending
              ? "Waiting for wallet…"
              : "Sign & launch"}
        </button>
      </div>
    </div>
  );
}
