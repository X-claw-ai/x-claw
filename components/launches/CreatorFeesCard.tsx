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

  // Mobile-proof: two independent buttons, ONE signature each. We never
  // chain awaits across an app switch — WalletConnect regularly loses
  // the tx-hash callback when the user hops to their wallet app, which
  // stranded the old combined flow at step 1/2 forever. Progress is
  // confirmed by POLLING the on-chain ledger instead.
  async function readLedger(): Promise<bigint> {
    const [, amt0, , amt1] = await getPublicClient().readContract({
      address: HAMR_V2.locker,
      abi: hamrLockerAbi,
      functionName: "pendingCreator",
      args: [token],
    });
    return amt0 + amt1;
  }

  async function fire(
    fn: "harvest" | "claimCreator",
    label: "harvest" | "claim",
    confirmed: (before: bigint, now: bigint) => boolean,
  ) {
    setError(null);
    setDone(false);
    setStep(label);
    try {
      const before = await readLedger().catch(() => 0n);
      const fees = await prepareFees({
        account: address!,
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: fn,
        args: [token],
      });
      // Fire the signature request but DON'T trust its callback — race
      // it against on-chain confirmation via the ledger.
      let rejected = false;
      void writeContractAsync({
        address: HAMR_V2.locker,
        abi: hamrLockerAbi,
        functionName: fn,
        args: [token],
        ...fees,
      }).catch((err) => {
        // Real user rejection should stop the wait below; a lost mobile
        // callback should NOT — polling confirms those.
        if (/user rejected|user denied/i.test(String(err))) rejected = true;
      });
      const deadline = Date.now() + 90_000;
      let ok = false;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 3_000));
        if (rejected) throw new Error("User rejected the request");
        const now = await readLedger().catch(() => before);
        if (confirmed(before, now)) {
          ok = true;
          break;
        }
      }
      if (ok) {
        setDone(label === "claim");
        setNonce((n) => n + 1);
      } else {
        setError(
          "Still waiting for the transaction to land. If you approved it in your wallet, it may confirm shortly — the numbers above refresh automatically.",
        );
      }
    } catch (err) {
      const msg = humanizeTxError(err);
      setError(
        /nothing/i.test(String(err))
          ? "No fees to claim yet — they accrue with every trade."
          : msg,
      );
    } finally {
      setStep("idle");
    }
  }

  // Harvest confirmed when the ledger grows (or if it already held
  // something and the tx simply added ~0 — treat unchanged-but-nonzero
  // as done after the wallet resolves; the claim button is enabled
  // whenever the ledger is nonzero anyway).
  const doHarvest = () =>
    fire("harvest", "harvest", (before, now) => now > before || now > 0n);
  const doClaim = () =>
    fire("claimCreator", "claim", (before, now) => before > 0n && now === 0n);

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

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={doHarvest}
          disabled={busy}
          className="btn btn-secondary !py-2.5 disabled:opacity-50"
        >
          {step === "harvest" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Harvesting…
            </>
          ) : (
            "1 · Harvest"
          )}
        </button>
        <button
          type="button"
          onClick={doClaim}
          disabled={busy || !pending || (pending.ethAmt === 0 && pending.tokAmt === 0)}
          className="btn btn-primary !py-2.5 disabled:opacity-50"
        >
          {step === "claim" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Claiming…
            </>
          ) : (
            "2 · Claim all"
          )}
        </button>
      </div>

      {busy && (
        <p className="text-[11px] font-bold text-koki-300 text-center">
          Signature sent — open your wallet app to approve, then come back.
        </p>
      )}
    </div>
  );
}
