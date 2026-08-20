"use client";

// /admin — protocol fee console. Hidden URL, no nav link.
//
// Everything here is SAFE to expose: harvestAndDistribute() and
// claimProtocolFees() are permissionless on-chain and can only ever
// pay the treasury address. The page still gates its buttons to the
// treasury wallet to avoid confusing visitors who stumble in.
//
// Actions:
//   - per token:  harvestAndDistribute(token)  → collects the pool's
//     accrued 1% fees, ledgers 75/25, and pays the 25% (ETH-side WETH
//     + token-side) straight to the treasury. One signature.
//   - launchpad:  claimProtocolFees()          → accumulated 0.0005
//     launch fees, paid to the treasury. One signature.

import { useEffect, useState } from "react";
import { formatEther, parseAbi, type Address } from "viem";
import { useAccount, useWriteContract } from "wagmi";
import { Coins, Loader2, CheckCircle2, ShieldAlert } from "lucide-react";
import { hamrTokenAbi } from "@/lib/hamr";
import { HAMR_V2, launchpadV2Abi } from "@/lib/hamr/v2";
import { getPublicClient } from "@/lib/robinhood/client";
import { prepareFees } from "@/lib/hamr/txfees";
import { humanizeTxError } from "@/lib/hamr/errors";
import WalletPill from "@/components/shell/WalletPill";

const lockerAdminAbi = parseAbi([
  "function harvestAndDistribute(address token)",
  "function protocolOwed(address token, address currency) view returns (uint256)",
  "function treasury() view returns (address)",
]);

interface Row {
  token: Address;
  symbol: string;
  owedEth: number; // ledgered WETH side (pre-harvest extra not included)
  owedTok: number;
  status: "idle" | "busy" | "done" | "error";
  note?: string;
}

export default function AdminPage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [treasury, setTreasury] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [launchFees, setLaunchFees] = useState<number | null>(null);
  const [lfStatus, setLfStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const isTreasury =
    Boolean(address && treasury) &&
    address!.toLowerCase() === treasury!.toLowerCase();

  async function loadAll() {
    const client = getPublicClient();
    const [tre, count, lf] = await Promise.all([
      client.readContract({ address: HAMR_V2.locker, abi: lockerAdminAbi, functionName: "treasury" }),
      client.readContract({ address: HAMR_V2.launchpad, abi: launchpadV2Abi, functionName: "tokenCount" }),
      client.readContract({ address: HAMR_V2.launchpad, abi: launchpadV2Abi, functionName: "protocolFeesEth" }),
    ]);
    setTreasury(tre);
    setLaunchFees(Number(formatEther(lf)));
    const tokens = await Promise.all(
      Array.from({ length: Number(count) }, (_, i) =>
        client.readContract({
          address: HAMR_V2.launchpad,
          abi: launchpadV2Abi,
          functionName: "allTokens",
          args: [BigInt(i)],
        }),
      ),
    );
    const out: Row[] = await Promise.all(
      tokens.map(async (t) => {
        const [symbol, owedW, owedT] = await Promise.all([
          client.readContract({ address: t, abi: hamrTokenAbi, functionName: "symbol" }).catch(() => "?"),
          client.readContract({ address: HAMR_V2.locker, abi: lockerAdminAbi, functionName: "protocolOwed", args: [t, HAMR_V2.weth] }).catch(() => 0n),
          client.readContract({ address: HAMR_V2.locker, abi: lockerAdminAbi, functionName: "protocolOwed", args: [t, t] }).catch(() => 0n),
        ]);
        return {
          token: t,
          symbol,
          owedEth: Number(formatEther(owedW)),
          owedTok: Number(formatEther(owedT)),
          status: "idle" as const,
        };
      }),
    );
    setRows(out);
  }

  useEffect(() => {
    void loadAll().catch((e) => setGlobalErr(String(e).slice(0, 140)));
  }, []);

  function setRow(token: Address, patch: Partial<Row>) {
    setRows((rs) =>
      rs ? rs.map((r) => (r.token === token ? { ...r, ...patch } : r)) : rs,
    );
  }

  async function harvestOne(token: Address) {
    setRow(token, { status: "busy", note: undefined });
    try {
      const fees = await prepareFees({
        account: address!,
        address: HAMR_V2.locker,
        abi: lockerAdminAbi,
        functionName: "harvestAndDistribute",
        args: [token],
      });
      const hash = await writeContractAsync({
        address: HAMR_V2.locker,
        abi: lockerAdminAbi,
        functionName: "harvestAndDistribute",
        args: [token],
        ...fees,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      setRow(token, { status: "done", note: "sent to treasury" });
    } catch (err) {
      setRow(token, { status: "error", note: humanizeTxError(err).slice(0, 90) });
    }
  }

  async function claimAll() {
    if (!rows) return;
    for (const r of rows) {
      if (r.status === "done") continue;
      // eslint-disable-next-line no-await-in-loop
      await harvestOne(r.token);
    }
    await claimLaunchFees();
    await loadAll().catch(() => {});
  }

  async function claimLaunchFees() {
    setLfStatus("busy");
    try {
      const fees = await prepareFees({
        account: address!,
        address: HAMR_V2.launchpad,
        abi: launchpadV2Abi,
        functionName: "claimProtocolFees",
        args: [],
      });
      const hash = await writeContractAsync({
        address: HAMR_V2.launchpad,
        abi: launchpadV2Abi,
        functionName: "claimProtocolFees",
        args: [],
        ...fees,
      });
      await getPublicClient().waitForTransactionReceipt({ hash });
      setLfStatus("done");
    } catch (err) {
      setLfStatus(/nothing/i.test(String(err)) ? "done" : "error");
      if (!/nothing/i.test(String(err))) setGlobalErr(humanizeTxError(err));
    }
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-14 space-y-5">
      <div className="card !p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Coins className="h-5 w-5 text-koki-400" />
          <div>
            <div className="text-[18px] font-black tracking-tight">
              Protocol fee console
            </div>
            <div className="text-[11px] font-bold text-ink-300/50">
              25% trade fees + launch fees → treasury
            </div>
          </div>
          <div className="ml-auto">
            <WalletPill />
          </div>
        </div>

        {!isTreasury ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-300 font-semibold inline-flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Connect the treasury wallet ({treasury ? `${treasury.slice(0, 6)}…${treasury.slice(-4)}` : "…"}) to enable claims.
          </div>
        ) : (
          <button
            type="button"
            onClick={claimAll}
            className="btn btn-primary w-full !py-3"
          >
            Claim EVERYTHING (one signature per item)
          </button>
        )}

        {globalErr && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-400 font-semibold break-words">
            {globalErr}
          </div>
        )}
      </div>

      {/* Launch fees */}
      <div className="card !p-5 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-black">Launch fees</div>
          <div className="text-[12px] font-bold text-ink-300/60 tabular-nums">
            {launchFees === null ? "—" : `${launchFees.toFixed(4)} ETH accrued`}
          </div>
        </div>
        {lfStatus === "done" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
        ) : (
          <button
            type="button"
            disabled={!isTreasury || lfStatus === "busy" || !launchFees}
            onClick={claimLaunchFees}
            className="btn btn-secondary !py-2 !px-4 disabled:opacity-40"
          >
            {lfStatus === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim"}
          </button>
        )}
      </div>

      {/* Per-token trade fees */}
      <div className="card !p-5 space-y-3">
        <div className="text-[13px] font-black">
          Trade fees per token (harvest + pay in one tx)
        </div>
        {rows === null ? (
          <div className="h-8 rounded bg-ink-1000/10 animate-pulse" />
        ) : (
          rows.map((r) => (
            <div
              key={r.token}
              className="flex items-center gap-3 border-b border-[var(--border)] last:border-b-0 pb-2.5 last:pb-0"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-extrabold">${r.symbol}</div>
                <div className="text-[10.5px] font-semibold text-ink-300/50 tabular-nums">
                  ledgered: {r.owedEth.toFixed(5)} ETH ·{" "}
                  {r.owedTok.toLocaleString(undefined, { maximumFractionDigits: 0 })} tok
                  {r.note ? ` · ${r.note}` : ""}
                </div>
              </div>
              {r.status === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <button
                  type="button"
                  disabled={!isTreasury || r.status === "busy"}
                  onClick={() => harvestOne(r.token)}
                  className="btn btn-secondary !py-1.5 !px-3 !text-xs disabled:opacity-40 shrink-0"
                >
                  {r.status === "busy" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Harvest & send"
                  )}
                </button>
              )}
            </div>
          ))
        )}
        <p className="text-[10.5px] text-ink-300/45 font-medium">
          "ledgered" shows already-harvested amounts — Harvest & send also
          pulls everything newly accrued on the position, then pays the
          treasury in the same transaction.
        </p>
      </div>
    </section>
  );
}
