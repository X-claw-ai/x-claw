"use client";

import { useEffect, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import { ArrowLeft, Rocket } from "lucide-react";
import { HAMR_CONTRACTS, HAMR_CURVE, hamrLaunchpadAbi } from "@/lib/hamr";
import { prepareFees } from "@/lib/hamr/txfees";
import { readCurve } from "@/lib/hamr/read";
import { getPublicClient } from "@/lib/robinhood/client";
import { explorerUrl } from "@/lib/robinhood/chain";
import type { LaunchKit, LaunchResult } from "../types";

// Step 4: Sign & submit — DIRECT signing on HAMR's own launchpad.
//
// One wallet signature calls launchToken() on our factory: deploys the
// ERC-20 (1B supply), opens the bonding curve, and (optionally) executes
// the creator's first buy in the same transaction. No handoff, no
// whitelist — this is our contract.

interface Props {
  kit: LaunchKit;
  initialBuyEth: string;
  onBack: () => void;
  onSuccess: (r: LaunchResult) => void;
}

export default function SignStep({ kit, initialBuyEth, onBack, onSuccess }: Props) {
  const { address, isConnected } = useAccount();
  const [localError, setLocalError] = useState<string | null>(null);
  const [handled, setHandled] = useState(false);

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

  // Receipt landed → decode TokenLaunched for the new token address.
  // useEffect (not render-time) so onSuccess can safely update the parent.
  useEffect(() => {
    if (!receipt || !submittedHash || handled) return;
    setHandled(true);
    let token: `0x${string}` | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: hamrLaunchpadAbi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TokenLaunched") {
          token = (decoded.args as { token: `0x${string}` }).token;
          break;
        }
      } catch {
        /* not our event, keep scanning */
      }
    }
    if (!token) {
      setLocalError(
        "Launch tx mined but the TokenLaunched event was missing. Check the tx on Blockscout.",
      );
    } else {
      onSuccess({
        token,
        pool: "0x0000000000000000000000000000000000000000",
        txHash: submittedHash,
        ponsUrl: `/launches/${token}`,
        explorerUrl: explorerUrl("token", token),
      });
    }
  }, [receipt, submittedHash, handled, onSuccess]);

  const [uploading, setUploading] = useState(false);

  // ── Mobile-wallet safety net ──────────────────────────────────────
  // On WalletConnect (mobile), the dapp regularly never receives the tx
  // hash after the user confirms in their wallet app — the promise from
  // writeContractAsync just hangs and the UI sticks on "Confirm in
  // wallet…". So the moment we ask for a signature we also snapshot
  // tokenCount() and poll the chain: if a NEW token appears whose curve
  // creator is this wallet, the launch succeeded regardless of whether
  // the RPC callback ever came home.
  const [watchFrom, setWatchFrom] = useState<bigint | null>(null);

  useEffect(() => {
    if (watchFrom === null || handled || !address) return;
    let cancelled = false;
    const client = getPublicClient();

    async function poll() {
      try {
        const count = await client.readContract({
          address: HAMR_CONTRACTS.launchpad,
          abi: hamrLaunchpadAbi,
          functionName: "tokenCount",
        });
        if (cancelled || count <= watchFrom!) return;
        // Scan only the tokens minted since we started watching.
        for (let i = Number(watchFrom); i < Number(count); i++) {
          const token = await client.readContract({
            address: HAMR_CONTRACTS.launchpad,
            abi: hamrLaunchpadAbi,
            functionName: "allTokens",
            args: [BigInt(i)],
          });
          const curve = await readCurve(token);
          if (
            curve.exists &&
            curve.creator.toLowerCase() === address!.toLowerCase()
          ) {
            if (cancelled) return;
            setHandled(true);
            onSuccess({
              token,
              pool: "0x0000000000000000000000000000000000000000",
              txHash:
                submittedHash ??
                ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`),
              ponsUrl: `/launches/${token}`,
              explorerUrl: explorerUrl("token", token),
            });
            return;
          }
        }
      } catch {
        /* RPC hiccup — next tick retries */
      }
    }

    const id = setInterval(poll, 4_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [watchFrom, handled, address, submittedHash, onSuccess]);

  async function handleSign() {
    setLocalError(null);
    resetWrite();
    if (!isConnected || !address) {
      setLocalError("Connect your wallet first.");
      return;
    }
    const s = kit.socials ?? {};
    const feeWei = parseEther(HAMR_CURVE.launchFeeEth);
    const buyWei = initialBuyEth ? parseEther(initialBuyEth) : 0n;

    // Logos are stored ON-CHAIN as a string. A base64 data URL would be
    // hundreds of KB of calldata — host it first and store the short URL.
    let logoUrl = kit.logoUrl ?? "";
    if (logoUrl.startsWith("data:")) {
      setUploading(true);
      try {
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ dataUrl: logoUrl }),
        });
        const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (json.ok && json.url) {
          logoUrl = json.url;
        } else {
          logoUrl = ""; // never send a data URL on-chain
        }
      } catch {
        logoUrl = "";
      } finally {
        setUploading(false);
      }
    }

    try {
      // Snapshot BEFORE the signature request so the poller only ever
      // matches tokens created after this moment.
      try {
        const count = await getPublicClient().readContract({
          address: HAMR_CONTRACTS.launchpad,
          abi: hamrLaunchpadAbi,
          functionName: "tokenCount",
        });
        setWatchFrom(count);
      } catch {
        setWatchFrom(0n);
      }
      const launchArgs = [
        {
          name: kit.tokenName,
          symbol: kit.ticker,
          logo: logoUrl,
          description: kit.shortDescription,
          twitterUrl: s.twitter ?? "",
          telegramUrl: s.telegram ?? "",
          websiteUrl: s.website ?? "",
        },
        0n, // minFirstBuyTokens — creator sets their own slippage at 0
      ] as const;
      // Gas + fees via OUR rpc proxy — the user's wallet may have a
      // broken RPC configured for this chain, and viem would otherwise
      // route these reads through it (the "eth_getBlockByNumber" launch
      // failures some users hit).
      const fees = await prepareFees({
        account: address,
        address: HAMR_CONTRACTS.launchpad,
        abi: hamrLaunchpadAbi,
        functionName: "launchToken",
        args: launchArgs,
        value: feeWei + buyWei,
      });
      await writeContractAsync({
        address: HAMR_CONTRACTS.launchpad,
        abi: hamrLaunchpadAbi,
        functionName: "launchToken",
        args: launchArgs,
        value: feeWei + buyWei,
        ...fees,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Wallet rejected the launch tx",
      );
    }
  }

  const errMsg =
    localError ??
    (writeError instanceof Error ? writeError.message : null) ??
    (receiptError instanceof Error ? receiptError.message : null);

  const busy = writePending || mining || uploading;

  return (
    <div className="space-y-6">
      <div className="card !p-5 space-y-4">
        <div>
          <div className="eyebrow !text-[10px]">Final review</div>
          <div className="mt-1 text-display text-[26px] leading-tight">
            Launch {kit.tokenName}
          </div>
          <div className="text-[12px] font-extrabold text-ink-300/70">
            ${kit.ticker} · HAMR launchpad · Robinhood Chain
          </div>
        </div>
        <p className="text-[13px] text-ink-300/85 font-medium leading-relaxed">
          Your wallet will prompt to sign one transaction that:
        </p>
        <ol className="text-[12px] text-ink-300/85 font-semibold space-y-1.5 list-decimal list-inside">
          <li>Pays the {HAMR_CURVE.launchFeeEth} ETH launch fee</li>
          <li>Deploys the ERC-20 with a fixed 1B supply</li>
          <li>
            Opens the bonding curve — graduates to a locked Uniswap V3
            pool at {HAMR_CURVE.graduationRaiseEth} ETH raised
          </li>
          {initialBuyEth && Number(initialBuyEth) > 0 && (
            <li>Buys {initialBuyEth} ETH of the token as your first buy</li>
          )}
          <li>
            Routes 75% of every trade fee to you, forever (claim any time)
          </li>
        </ol>
      </div>

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
          disabled={busy}
          className="btn btn-primary !py-3 !px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Rocket className="h-4 w-4" />
          {uploading
            ? "Uploading logo…"
            : writePending
              ? "Confirm in wallet…"
              : mining
                ? "Launching on-chain…"
                : "Launch now"}
        </button>
      </div>
    </div>
  );
}
