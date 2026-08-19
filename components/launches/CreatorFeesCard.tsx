"use client";

import { useEffect, useState } from "react";
import { formatEther, type Address } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Coins, Loader2 } from "lucide-react";
import { hamrLockerAbi, fetchEthUsd, formatUsd } from "@/lib/hamr";
import { HAMR_V2 } from "@/lib/hamr/v2";
import { getPublicClient } from "@/lib/robinhood/client";
import { prepareFees } from "@/lib/hamr/txfees";
import { humanizeTxError } from "@/lib/hamr/errors";

// Creator-only fee card. The locked LP position earns the pool's 1% on
// every trade; `harvest` pulls accrued fees off the position and
// ledgers 75% to the creator, `claimCreator` pays the ledger out.
// One button does both, back to back.

interface Pending {
  ethAmt: number; // WETH side, in ETH
  tokAmt: number; // token side, whole tokens
}

export default function CreatorFeesCard({
  token,
  creator,
  symbol,
}: {
  token: Address;
  creator: string;
  symbol: string;
}) {
  const { address } = useAccount();
  const [pending, setPending] = useState<Pending | null>(null);
  const [step, setStep] = useState<"idle" | "harvest" | "claim">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ethUsd, setEthUsd] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isSuccess: mined } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const isCreator =
    Boolean(address) && address!.toLowerCase() === creator.toLowerCase();

  useEffect(() => {
    void fetchEthUsd().then((p) => p && setEthUsd(p));
  }, []);

  // Ledgered (already harvested) creator share.
  useEffect(() => {
    if (!isCreator) return;
    let cancelled = false;
    async function load() {
      try {
        const client = getPublicClient();
        const [t0, amt0, t1, amt1] = await client.readContract({
          address: HAMR_V2.locker,
          abi: hamrLockerAbi,
          functionName: "pendingCreator",
          args: [token],
        });
        if (cancelled) return;
        const wethLc = HAMR_V2.weth.toLowerCase();
        const ethSide = t0.toLowerCase() === wethLc ? amt0 : amt1;
        const tokSide = t0.toLowerCase() === wethLc ? amt1 : amt0;
        setPending({
          ethAmt: Number(formatEther(ethSide)),
          tokAmt: Number(formatEther(tokSide)),
        });
      } catch {
        /* keep previous */
      }
    }
    void load();
    const id = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isCreator, token, nonce]);

  useEffect(() => {
    if (mined) setNonce((n) => n + 1);
  }, [mined]);

  if (!isCreator) return null;

  async function harvestAndClaim() {
    setError(null);
    setDone(false);
    try {
      // 1) Pull fresh fees off the locked position into the ledger.
      setStep("harvest");
      const hFees = await prepareFees({
        account: address!,
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: "harvest",
        args: [token],
      });
      const hHash = await writeContractAsync({
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: "harvest",
        args: [token],
        ...hFees,
      });
      await getPublicClient().waitForTransactionReceipt({ hash: hHash });

      // 2) Pay the creator's 75% out.
      setStep("claim");
      const cFees = await prepareFees({
        account: address!,
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: "claimCreator",
        args: [token],
      });
      const cHash = await writeContractAsync({
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: "claimCreator",
        args: [token],
        ...cFees,
      });
      await getPublicClient().waitForTransactionReceipt({ hash: cHash });
      setDone(true);
      setNonce((n) => n + 1);
    } catch (err) {
      const msg = humanizeTxError(err);
      // claimCreator reverts with "nothing to claim" when the ledger is
      // empty — translate instead of scaring the creator.
      setError(
        /nothing/i.test(String(err))
          ? "No fees to claim yet — they accrue with every trade."
          : msg,
      );
    } finally {
      setStep("idle");
    }
  }

  const busy = step !== "idle";

  return (
    <div className="card !p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-koki-400" />
        <div className="text-[14px] font-black tracking-tight">
          Your creator fees
        </div>
        <span className="ml-auto text-[10px] font-bold text-ink-300/45 uppercase tracking-wider">
          75% of every trade
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-ink-1000/8 px-3 py-2.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/55">
            Claimable ETH
          </div>
          <div className="mt-0.5 text-[15px] font-black tabular-nums">
            {pending
              ? ethUsd
                ? formatUsd(pending.ethAmt * ethUsd)
                : pending.ethAmt.toFixed(5) + " ETH"
              : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-ink-1000/8 px-3 py-2.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/55">
            Claimable {symbol}
          </div>
          <div className="mt-0.5 text-[15px] font-black tabular-nums">
            {pending
              ? pending.tokAmt.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })
              : "—"}
          </div>
        </div>
      </div>

      <p className="text-[10.5px] text-ink-300/50 font-medium leading-relaxed">
        Shown = already harvested to your ledger. Claiming first harvests
        the newest fees off the locked position, then pays everything out
        (two quick signatures).
      </p>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-400 font-semibold break-words">
          {error}
        </div>
      )}
      {done && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-400 font-semibold">
          Fees claimed — check your wallet.
        </div>
      )}

      <button
        type="button"
        onClick={harvestAndClaim}
        disabled={busy}
        className="btn btn-primary w-full !py-2.5 disabled:opacity-50"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {step === "harvest"
              ? "Harvesting fees… (1/2)"
              : "Claiming… (2/2)"}
          </>
        ) : (
          "Harvest & claim"
        )}
      </button>
    </div>
  );
}
