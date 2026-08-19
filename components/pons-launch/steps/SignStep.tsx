"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, decodeEventLog, type Address } from "viem";
import { ArrowLeft, Rocket } from "lucide-react";
import {
  HAMR_V2,
  V2_PARAMS,
  launchpadV2Abi,
  swapRouterAbi,
} from "@/lib/hamr/v2";
import { prepareFees } from "@/lib/hamr/txfees";
import { humanizeTxError } from "@/lib/hamr/errors";
import { getPublicClient } from "@/lib/robinhood/client";
import { explorerUrl } from "@/lib/robinhood/chain";
import type { LaunchKit, LaunchResult } from "../types";

// Step 4: Sign & submit — DIRECT signing on HAMR's v2 launchpad.
//
// One wallet signature calls launchToken(): deploys the ERC-20 (1B
// supply), creates + initializes a REAL Uniswap V3 pool, and locks the
// entire supply as one-sided liquidity forever. The coin is tradeable
// from every wallet/bot the moment the tx mines. If the creator set a
// first buy, it runs as a normal router swap right after (2nd
// signature) — the same trade anyone else would make.

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
  const [buying, setBuying] = useState(false);
  const finishing = useRef(false);

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

  // ── Shared finisher: optional first buy, then hand off ────────────
  // Both success paths (receipt decode + mobile poller) funnel here so
  // the dev-buy runs exactly once and the redirect always happens.
  async function finish(token: Address, txHash: `0x${string}`) {
    if (finishing.current) return;
    finishing.current = true;
    setHandled(true);

    const buyWei = initialBuyEth ? parseEther(initialBuyEth) : 0n;
    if (buyWei > 0n && address) {
      setBuying(true);
      try {
        const deadline = BigInt(Math.floor(Date.now() / 1000)) + 600n;
        const params = {
          tokenIn: HAMR_V2.weth,
          tokenOut: token,
          fee: V2_PARAMS.poolFee,
          recipient: address,
          deadline,
          amountIn: buyWei,
          amountOutMinimum: 0n, // creator's own launch — no slippage guard
          sqrtPriceLimitX96: 0n,
        } as const;
        const fees = await prepareFees({
          account: address,
          address: HAMR_V2.swapRouter,
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [params],
          value: buyWei,
        });
        // Race a timeout so a lost mobile callback can't strand the UI —
        // the swap still lands on-chain either way.
        await Promise.race([
          writeContractAsync({
            address: HAMR_V2.swapRouter,
            abi: swapRouterAbi,
            functionName: "exactInputSingle",
            args: [params],
            value: buyWei,
            ...fees,
          }),
          new Promise((resolve) => setTimeout(resolve, 45_000)),
        ]);
      } catch {
        /* launch already succeeded — the buy is best-effort */
      } finally {
        setBuying(false);
      }
    }

    onSuccess({
      token,
      pool: "0x0000000000000000000000000000000000000000",
      txHash,
      ponsUrl: `/launches/${token}`,
      explorerUrl: explorerUrl("token", token),
    });
  }

  // Receipt landed → decode TokenLaunched for the new token address.
  useEffect(() => {
    if (!receipt || !submittedHash || handled) return;
    let token: Address | null = null;
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: launchpadV2Abi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "TokenLaunched") {
          token = (decoded.args as { token: Address }).token;
          break;
        }
      } catch {
        /* not our event, keep scanning */
      }
    }
    if (!token) {
      setHandled(true);
      setLocalError(
        "Launch tx mined but the TokenLaunched event was missing. Check the tx on Blockscout.",
      );
    } else {
      void finish(token, submittedHash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, submittedHash, handled]);

  const [uploading, setUploading] = useState(false);

  // ── Mobile-wallet safety net ──────────────────────────────────────
  // On WalletConnect (mobile), the dapp regularly never receives the tx
  // hash after the user confirms — the promise just hangs. So we
  // snapshot tokenCount() before asking for the signature and poll: if
  // a NEW token appears whose creator is this wallet, the launch
  // succeeded regardless of whether the callback ever came home.
  const [watchFrom, setWatchFrom] = useState<bigint | null>(null);

  useEffect(() => {
    if (watchFrom === null || handled || !address) return;
    let cancelled = false;
    const client = getPublicClient();

    async function poll() {
      try {
        const count = await client.readContract({
          address: HAMR_V2.launchpad,
          abi: launchpadV2Abi,
          functionName: "tokenCount",
        });
        if (cancelled || count <= watchFrom!) return;
        // Scan only the tokens minted since we started watching.
        for (let i = Number(watchFrom); i < Number(count); i++) {
          const token = await client.readContract({
            address: HAMR_V2.launchpad,
            abi: launchpadV2Abi,
            functionName: "allTokens",
            args: [BigInt(i)],
          });
          const [creator, , , exists] = await client.readContract({
            address: HAMR_V2.launchpad,
            abi: launchpadV2Abi,
            functionName: "launches",
            args: [token],
          });
          if (exists && creator.toLowerCase() === address!.toLowerCase()) {
            if (cancelled) return;
            void finish(
              token,
              submittedHash ??
                ("0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`),
            );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchFrom, handled, address, submittedHash]);

  async function handleSign() {
    setLocalError(null);
    resetWrite();
    if (!isConnected || !address) {
      setLocalError("Connect your wallet first.");
      return;
    }
    const s = kit.socials ?? {};
    const feeWei = parseEther(V2_PARAMS.launchFeeEth);

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
          address: HAMR_V2.launchpad,
          abi: launchpadV2Abi,
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
      ] as const;
      // Gas + fees via OUR rpc proxy — the user's wallet may have a
      // broken RPC configured for this chain, and viem would otherwise
      // route these reads through it.
      const fees = await prepareFees({
        account: address,
        address: HAMR_V2.launchpad,
        abi: launchpadV2Abi,
        functionName: "launchToken",
        args: launchArgs,
        value: feeWei,
      });
      await writeContractAsync({
        address: HAMR_V2.launchpad,
        abi: launchpadV2Abi,
        functionName: "launchToken",
        args: launchArgs,
        value: feeWei,
        ...fees,
      });
    } catch (err) {
      setLocalError(humanizeTxError(err));
    }
  }

  const errMsg =
    localError ??
    (writeError && !handled ? humanizeTxError(writeError) : null) ??
    (receiptError ? humanizeTxError(receiptError) : null);

  const busy = writePending || mining || uploading || buying;

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
          <li>Pays the {V2_PARAMS.launchFeeEth} ETH launch fee</li>
          <li>Deploys the ERC-20 with a fixed 1B supply</li>
          <li>
            Opens a REAL Uniswap V3 pool — the entire supply locked as
            liquidity forever, tradeable from any wallet or bot instantly
          </li>
          {initialBuyEth && Number(initialBuyEth) > 0 && (
            <li>
              Then buys {initialBuyEth} ETH of the token via the router
              (a second quick signature)
            </li>
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
            : buying
              ? "First buy — confirm in wallet…"
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
