"use client";

import { useAccount, useBalance } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowLeft, ArrowRight, Wallet, AlertTriangle } from "lucide-react";
import { formatEther } from "viem";
import { PONS_LAUNCH_PARAMS } from "@/lib/pons";
import { ROBINHOOD_CHAIN_ID } from "@/lib/robinhood/chain";

// Step 3: Connect + review deploy cost. This is a soft step — no signing
// happens here. We just make sure the user is on Robinhood Chain, has
// enough ETH to cover the launch fee + optional first-buy, and let them
// dial in an initial buy amount.

interface Props {
  initialBuyEth: string;
  onInitialBuyChange: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function ConnectStep({
  initialBuyEth,
  onInitialBuyChange,
  onBack,
  onNext,
}: Props) {
  const { address, isConnected, chainId } = useAccount();
  const wrongChain = isConnected && chainId !== ROBINHOOD_CHAIN_ID;
  const { data: bal } = useBalance({
    address,
    chainId: ROBINHOOD_CHAIN_ID,
    query: { enabled: Boolean(address) && !wrongChain },
  });

  const launchFee = Number(PONS_LAUNCH_PARAMS.launchFeeEth);
  const buyAmt = Number(initialBuyEth) || 0;
  const total = launchFee + buyAmt;
  const balanceEth = bal ? Number(formatEther(bal.value)) : 0;
  const sufficient = isConnected && !wrongChain && balanceEth >= total;

  return (
    <div className="space-y-6">
      <div className="card !p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-koki-500 text-ink-1000 flex items-center justify-center border border-[var(--border-strong)]">
            <Wallet className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72">
              Signing wallet
            </div>
            <div className="text-[13px] font-black tracking-tight truncate">
              {isConnected && address
                ? `${address.slice(0, 6)}…${address.slice(-4)}`
                : "Not connected"}
            </div>
          </div>
        </div>
        <ConnectButton
          showBalance={false}
          accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
          chainStatus="icon"
        />
      </div>

      {wrongChain && (
        <div className="card !p-4 !border-red-500/60 !bg-red-500/10 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div className="text-[12px] text-red-400 font-semibold leading-relaxed">
            Your wallet is on the wrong network. Pons launches only work on
            Robinhood Chain (id {ROBINHOOD_CHAIN_ID}). Use the connect button
            above to switch.
          </div>
        </div>
      )}

      <div className="card !p-5 space-y-4">
        <div className="eyebrow !text-[10px]">Launch parameters</div>
        <Row label="Supply" value={`${(1_000_000_000).toLocaleString()} (fixed)`} />
        <Row label="Pool fee" value="1%" />
        <Row label="Quote token" value="WETH" />
        <Row label="Graduation threshold" value={`${PONS_LAUNCH_PARAMS.graduationThresholdEth} ETH`} />

        <label className="block pt-2">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72 mb-1.5">
            Initial buy (ETH, optional)
          </span>
          <input
            type="number"
            step="0.001"
            min="0"
            value={initialBuyEth}
            onChange={(e) => onInitialBuyChange(e.target.value)}
            placeholder="0"
            className="input font-mono"
          />
          <span className="mt-1.5 block text-[11px] text-ink-300/60 font-medium">
            Warms the pool immediately after launch. Set 0 to just deploy.
          </span>
        </label>

        <div className="border-t border-[var(--border)] pt-3 space-y-1.5">
          <Row label="Launch fee" value={`${PONS_LAUNCH_PARAMS.launchFeeEth} ETH`} />
          <Row label="Your first buy" value={`${buyAmt.toFixed(4)} ETH`} />
          <Row
            label="You will spend"
            value={`${total.toFixed(4)} ETH`}
            strong
          />
          {isConnected && !wrongChain && bal && (
            <Row
              label="Wallet balance"
              value={`${balanceEth.toFixed(4)} ETH`}
              muted
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary !py-2.5 !px-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!sufficient}
          className="btn btn-primary !py-2.5 !px-4 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !isConnected
              ? "Connect a wallet first"
              : wrongChain
                ? "Switch to Robinhood Chain"
                : !sufficient
                  ? "Not enough ETH for the launch fee"
                  : ""
          }
        >
          Continue
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`text-[11px] font-bold uppercase tracking-wider ${
          muted ? "text-ink-300/50" : "text-ink-300/72"
        }`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${
          strong
            ? "text-[15px] font-black tracking-tight"
            : muted
              ? "text-[12px] font-semibold text-ink-300/70"
              : "text-[13px] font-extrabold"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
