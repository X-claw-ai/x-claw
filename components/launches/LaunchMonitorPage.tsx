"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Globe,
  Send,
  Loader2,
  ArrowDownUp,
  Flame,
  Copy,
  Check,
} from "lucide-react";
import {
  encodeFunctionData,
  formatEther,
  parseEther,
  type Address,
} from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { useHamrV2Token, useTokenBalance } from "@/lib/hamr/hooks";
import { hamrTokenAbi, fetchEthUsd, formatUsd, HIDDEN_TOKENS } from "@/lib/hamr";
import {
  HAMR_V2,
  V2_PARAMS,
  quoteV2,
  swapRouterAbi,
  ROUTER_ADDRESS_THIS,
} from "@/lib/hamr/v2";
import { explorerUrl } from "@/lib/robinhood/chain";
import { getPublicClient } from "@/lib/robinhood/client";
import { Badge } from "@/components/ui/Badge";
import PriceChart from "./PriceChart";
import { useTrades } from "./useTrades";
import HoldersTable from "./HoldersTable";
import TradesTable from "./TradesTable";
import CreatorFeesCard from "./CreatorFeesCard";
import { prepareFees } from "@/lib/hamr/txfees";
import { humanizeTxError } from "@/lib/hamr/errors";

// Token page for a HAMR coin. Every launch is a REAL Uniswap V3 pool
// from block one, so this page reads the pool directly (slot0 price,
// Swap-event history) and trades through the canonical SwapRouter —
// the exact same path Telegram bots and external wallets use.

interface Props {
  token: string;
}

export default function LaunchMonitorPage({ token }: Props) {
  const isEvmAddr = /^0x[0-9a-fA-F]{40}$/.test(token);
  // Delisted test launches: hidden from the board AND from direct URLs.
  const isHidden = isEvmAddr && HIDDEN_TOKENS.has(token.toLowerCase());
  const tokenAddr = isEvmAddr && !isHidden ? (token as Address) : undefined;
  const { snap, loading, error, refresh } = useHamrV2Token(tokenAddr);
  const { data: trades, failed: tradesFailed } = useTrades(tokenAddr);
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () =>
      fetchEthUsd().then((p) => {
        if (!cancelled && p) setEthUsd(p);
      });
    void tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const tokenExplorer = useMemo(
    () => (isEvmAddr ? explorerUrl("token", token) : null),
    [isEvmAddr, token],
  );

  if (isHidden) {
    return (
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-12 space-y-5">
        <div className="card !p-8">
          <div className="eyebrow">Token not available</div>
          <p className="mt-3 text-[13px] font-medium text-ink-300/80 leading-relaxed">
            This token has been delisted from HAMR.fun.
          </p>
          <Link href="/launches" className="mt-6 inline-flex btn btn-primary !py-2.5 !px-4">
            All launches
          </Link>
        </div>
        {/* Fees keep accruing on-chain even for delisted launches — the
            creator (and only the creator) can still claim from here. */}
        <HiddenCreatorClaim token={token as Address} />
      </section>
    );
  }

  if (!isEvmAddr) {
    return (
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-12">
        <div className="card !p-8">
          <div className="eyebrow">Not a token address</div>
          <p className="mt-3 text-[13px] font-medium text-ink-300/80 leading-relaxed">
            <code className="font-mono">{token}</code> isn&apos;t an EVM
            address, so there&apos;s nothing to load.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/launches" className="btn btn-primary !py-2.5 !px-4">
              All launches
            </Link>
            <Link href="/launch" className="btn btn-secondary !py-2.5 !px-4">
              Launch a coin
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-12">
        <div className="card !p-10 flex flex-col items-center gap-3 text-ink-300/70">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-[13px] font-semibold">Reading the pool…</p>
        </div>
      </section>
    );
  }

  if (!snap) {
    return (
      <section className="mx-auto max-w-4xl px-4 md:px-6 py-12">
        <div className="card !p-8">
          <div className="eyebrow">Unknown token</div>
          <p className="mt-3 text-[13px] font-medium text-ink-300/80 leading-relaxed">
            This address wasn&apos;t launched through the HAMR launchpad.
            {error ? ` (${error})` : ""}
          </p>
          <a
            href={tokenExplorer ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex btn btn-secondary !py-2 !px-3.5 !text-xs"
          >
            Check on Blockscout
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </section>
    );
  }

  const { meta, progressBps, graduated, wethInPoolEth } = snap;
  // Market cap is CIRCULATING: burned (dead-address) supply excluded.
  const marketCapEth = snap.priceEth * snap.circulating;

  return (
    <section className="mx-auto max-w-5xl px-4 md:px-6 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start">
        {/* ── Left column: identity + pool state ──────────────────── */}
        <div className="space-y-5 min-w-0">
          {/* Header */}
          <div className="card !p-5 md:!p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-koki-500 border border-[var(--border-strong)] overflow-hidden relative">
                {meta.logo ? (
                  <Image
                    src={meta.logo}
                    alt={meta.name}
                    fill
                    sizes="64px"
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-black text-ink-1000 text-lg">
                    {meta.symbol.slice(0, 3)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-display text-[26px] leading-tight truncate">
                  {meta.name}
                </div>
                <div className="text-[12px] font-extrabold text-ink-300/70">
                  ${meta.symbol} · HAMR launchpad
                </div>
              </div>
              <Badge tone={graduated ? "live" : "neutral"}>
                {graduated ? "Graduated" : "Live pool"}
              </Badge>
            </div>

            {meta.description && (
              <p className="mt-4 text-[13px] text-ink-300/85 font-medium leading-relaxed">
                {meta.description}
              </p>
            )}

            {/* Socials — read from chain, set at launch */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <CopyCa address={token} />
              {meta.twitterUrl && (
                <SocialChip href={meta.twitterUrl} label="X / Twitter" />
              )}
              {meta.telegramUrl && (
                <SocialChip href={meta.telegramUrl} label="Telegram" icon="tg" />
              )}
              {meta.websiteUrl && (
                <SocialChip href={meta.websiteUrl} label="Website" icon="web" />
              )}
              <a
                href={tokenExplorer ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-extrabold text-ink-300/80 hover:text-ink-300 hover:border-[var(--border-strong)] transition-colors"
              >
                Blockscout
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Price chart — straight from the pool's Swap events */}
          <PriceChart
            data={trades}
            failed={tradesFailed}
            ethUsd={ethUsd}
            supply={snap.circulating}
          />

          {/* Launch-range progress */}
          <div className="card !p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="eyebrow !text-[10px]">Launch curve</div>
                <div className="mt-1 text-[16px] font-black tracking-tight">
                  {(progressBps / 100).toFixed(1)}%{" "}
                  <span className="text-ink-300/50 font-bold">
                    to graduation
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] font-bold text-ink-300/60 uppercase tracking-wider">
                  ETH in pool
                </div>
                <div className="text-[13px] font-extrabold tabular-nums">
                  {wethInPoolEth.toFixed(4)} / {V2_PARAMS.targetRaiseEth} ETH
                </div>
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-ink-1000/15 overflow-hidden">
              <div
                className="h-full bg-koki-500 transition-all duration-700"
                style={{ width: `${Math.max(1, progressBps / 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-300/55 font-medium leading-relaxed">
              This is a real Uniswap V3 pool from block one — tradeable
              from any wallet, bot, or aggregator. All liquidity is locked
              forever; graduation just marks the launch range filling
              (~{V2_PARAMS.targetRaiseEth} ETH). Creator earns 75% of every
              trade fee, always.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Price"
              value={
                snap.priceEth > 0
                  ? ethUsd
                    ? formatUsd(snap.priceEth * ethUsd)
                    : snap.priceEth.toLocaleString(undefined, {
                        maximumSignificantDigits: 3,
                      }) + " ETH"
                  : "—"
              }
            />
            <StatCard
              label="Market cap"
              value={
                ethUsd
                  ? formatUsd(marketCapEth * ethUsd)
                  : marketCapEth.toFixed(2) + " ETH"
              }
            />
            <StatCard
              label="Liquidity"
              value={
                ethUsd
                  ? formatUsd(wethInPoolEth * ethUsd)
                  : wethInPoolEth.toFixed(4) + " ETH"
              }
            />
            <StatCard
              label="24h volume"
              value={
                trades
                  ? ethUsd
                    ? formatUsd(trades.volume24hEth * ethUsd)
                    : trades.volume24hEth.toFixed(4) + " ETH"
                  : "—"
              }
            />
            <StatCard
              label="ATH"
              value={
                trades
                  ? ethUsd
                    ? formatUsd(trades.athPriceEth * ethUsd)
                    : trades.athPriceEth.toLocaleString(undefined, {
                        maximumSignificantDigits: 3,
                      }) + " ETH"
                  : "—"
              }
            />
            <StatCard
              label="Trades"
              value={trades ? String(trades.tradeCount) : "—"}
            />
            <StatCard
              label="Sold"
              value={(snap.tokensSold / 1e6).toFixed(1) + "M"}
            />
            <StatCard
              label={snap.burned > 0 ? "Supply · burned" : "Supply"}
              value={
                snap.burned > 0
                  ? `${(snap.circulating / 1e6).toFixed(0)}M · 🔥${(snap.burned / 1e6).toFixed(1)}M`
                  : "1B fixed"
              }
            />
          </div>

          {/* Live trade feed — same pool events as the chart */}
          <TradesTable data={trades} failed={tradesFailed} />

          {/* Holders — rebuilt live from Transfer events */}
          {tokenAddr && (
            <HoldersTable
              token={tokenAddr}
              creator={meta.creator}
              pool={snap.pool}
            />
          )}
        </div>

        {/* ── Right column: trade box (always live — it's a real pool) */}
        <div className="lg:sticky lg:top-24 space-y-4">
          {graduated && (
            <div className="card !p-4 flex items-center gap-2.5">
              <Flame className="h-4 w-4 text-koki-500 shrink-0" />
              <p className="text-[12px] text-ink-300/80 font-semibold leading-snug">
                Launch range filled — trading continues right here and on
                every DEX.
              </p>
            </div>
          )}
          <TradeBox
            token={tokenAddr!}
            symbol={meta.symbol}
            onTraded={refresh}
          />
          {/* Creator-only: harvest + claim the 75% fee share */}
          <CreatorFeesCard
            token={tokenAddr!}
            creator={meta.creator}
            symbol={meta.symbol}
          />
        </div>
      </div>
    </section>
  );
}

// ── Hidden-token creator claim ──────────────────────────────────────
// Reads the on-chain creator + symbol, then defers to CreatorFeesCard
// (which renders nothing unless the connected wallet IS the creator).
function HiddenCreatorClaim({ token }: { token: Address }) {
  const { address } = useAccount();
  const [info, setInfo] = useState<{ creator: string; symbol: string } | null>(
    null,
  );
  useEffect(() => {
    let cancelled = false;
    const client = getPublicClient();
    Promise.all([
      client.readContract({ address: token, abi: hamrTokenAbi, functionName: "creator" }),
      client.readContract({ address: token, abi: hamrTokenAbi, functionName: "symbol" }),
    ])
      .then(([creator, symbol]) => {
        if (!cancelled) setInfo({ creator, symbol });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);
  if (!info) return null;
  const isCreator =
    Boolean(address) && address!.toLowerCase() === info.creator.toLowerCase();
  return (
    <>
      {!isCreator && (
        <div className="card !p-4 text-[12px] font-semibold text-ink-300/70 leading-relaxed">
          Accrued trade fees remain claimable by the creator wallet{" "}
          <span className="font-mono text-koki-300 break-all">{info.creator}</span>
          {address ? (
            <>
              {" "}— you are connected as{" "}
              <span className="font-mono break-all">{address}</span>. Switch to
              the creator wallet to claim.
            </>
          ) : (
            <> — connect that wallet to claim.</>
          )}
        </div>
      )}
      <CreatorFeesCard token={token} creator={info.creator} symbol={info.symbol} />
    </>
  );
}

// ── Trade box — canonical Uniswap SwapRouter, same path as any bot ──

const MAX_UINT = 2n ** 256n - 1n;

function TradeBox({
  token,
  symbol,
  onTraded,
}: {
  token: Address;
  symbol: string;
  onTraded: () => void;
}) {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<bigint | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const {
    writeContractAsync,
    data: txHash,
    isPending,
    reset,
  } = useWriteContract();
  const { isLoading: mining, isSuccess: mined } = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const balance = useTokenBalance(token, address, txHash ?? "init");

  const { data: allowance } = useReadContract({
    address: token,
    abi: hamrTokenAbi,
    functionName: "allowance",
    args: address ? [address, HAMR_V2.swapRouter] : undefined,
    query: { enabled: Boolean(address) && side === "sell" },
  });

  // Refresh parent after a confirmed trade (once per hash).
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  useEffect(() => {
    if (mined && txHash && lastRefreshed !== txHash) {
      setLastRefreshed(txHash);
      onTraded();
    }
  }, [mined, txHash, lastRefreshed, onTraded]);

  async function updateQuote(next: string, s: "buy" | "sell") {
    setAmount(next);
    setQuote(null);
    const n = Number(next);
    if (!next || Number.isNaN(n) || n <= 0) return;
    setQuoting(true);
    try {
      const q = await quoteV2(
        s === "buy"
          ? {
              tokenIn: HAMR_V2.weth,
              tokenOut: token,
              amountIn: parseEther(next),
            }
          : {
              tokenIn: token,
              tokenOut: HAMR_V2.weth,
              amountIn: parseEther(next),
            },
      );
      setQuote(q);
    } catch {
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }

  async function submit() {
    setLocalError(null);
    reset();
    if (!isConnected || !address) {
      setLocalError("Connect your wallet first.");
      return;
    }
    const n = Number(amount);
    if (!amount || Number.isNaN(n) || n <= 0) {
      setLocalError("Enter an amount.");
      return;
    }
    const minOut = quote ? (quote * 98n) / 100n : 0n; // 2% slippage
    try {
      if (side === "buy") {
        // ETH in → router wraps to WETH internally (tokenIn = WETH9).
        const value = parseEther(amount);
        // Preflight: on this chain an underfunded estimate surfaces as a
        // bare "reverted", which tells the user nothing. Check the REAL
        // balance first and say exactly what's missing.
        try {
          const bal = await getPublicClient().getBalance({ address });
          const gasBuffer = parseEther("0.00003");
          if (bal < value + gasBuffer) {
            setLocalError(
              `Not enough ETH on Robinhood Chain — this wallet holds ${Number(
                formatEther(bal),
              ).toFixed(5)} ETH, but this buy needs ${amount} ETH + gas. ` +
                "Bridge or top up Robinhood Chain ETH and try again.",
            );
            return;
          }
        } catch {
          /* balance read hiccup — let the wallet handle it */
        }
        const params = {
          tokenIn: HAMR_V2.weth,
          tokenOut: token,
          fee: V2_PARAMS.poolFee,
          recipient: address,
          amountIn: value,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: 0n,
        } as const;
        const fees = await prepareFees({
          account: address,
          address: HAMR_V2.swapRouter,
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [params],
          value,
        });
        await writeContractAsync({
          address: HAMR_V2.swapRouter,
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [params],
          value,
          ...fees,
        });
      } else {
        const tokenWei = parseEther(amount);
        if (balance !== null && balance < tokenWei) {
          setLocalError(
            `You hold ${(Number(balance) / 1e18).toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })} ${symbol} — can't sell ${amount}.`,
          );
          return;
        }
        if ((allowance ?? 0n) < tokenWei) {
          // One-time max approve, then the sell in a second signature.
          const approveArgs = [HAMR_V2.swapRouter, MAX_UINT] as const;
          const aFees = await prepareFees({
            account: address,
            address: token,
            abi: hamrTokenAbi,
            functionName: "approve",
            args: approveArgs,
          });
          await writeContractAsync({
            address: token,
            abi: hamrTokenAbi,
            functionName: "approve",
            args: approveArgs,
            ...aFees,
          });
        }
        // Token → WETH lands ON the router (SwapRouter02 sentinel
        // address(2) = the router itself), then unwrapWETH9 sends
        // native ETH home. Single multicall signature.
        const swapData = encodeFunctionData({
          abi: swapRouterAbi,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: token,
              tokenOut: HAMR_V2.weth,
              fee: V2_PARAMS.poolFee,
              recipient: ROUTER_ADDRESS_THIS,
              amountIn: tokenWei,
              amountOutMinimum: minOut,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
        const unwrapData = encodeFunctionData({
          abi: swapRouterAbi,
          functionName: "unwrapWETH9",
          args: [minOut, address],
        });
        const mcArgs = [[swapData, unwrapData]] as const;
        const sFees = await prepareFees({
          account: address,
          address: HAMR_V2.swapRouter,
          abi: swapRouterAbi,
          functionName: "multicall",
          args: mcArgs,
        });
        await writeContractAsync({
          address: HAMR_V2.swapRouter,
          abi: swapRouterAbi,
          functionName: "multicall",
          args: mcArgs,
          ...sFees,
        });
      }
      setAmount("");
      setQuote(null);
    } catch (err) {
      setLocalError(humanizeTxError(err));
    }
  }

  const busy = isPending || mining;
  const balNum = balance !== null ? Number(balance) / 1e18 : null;

  return (
    <div className="card !p-5 space-y-4">
      {/* Buy / Sell tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-ink-1000/10">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setSide(s);
              setAmount("");
              setQuote(null);
              setLocalError(null);
            }}
            className={`py-2 rounded-lg text-[13px] font-black tracking-tight transition-colors ${
              side === s
                ? s === "buy"
                  ? "bg-koki-500 text-white"
                  : "bg-ink-300 text-white"
                : "text-ink-300/60 hover:text-ink-300"
            }`}
          >
            {s === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72">
            {side === "buy" ? "Spend (ETH)" : `Sell (${symbol})`}
          </span>
          {side === "sell" && balNum !== null && (
            <button
              type="button"
              onClick={() =>
                updateQuote((balNum > 0 ? balNum : 0).toString(), "sell")
              }
              className="text-[10px] font-extrabold text-koki-500 hover:underline"
            >
              Max {balNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </button>
          )}
        </div>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={amount}
          onChange={(e) => updateQuote(e.target.value, side)}
          placeholder="0.0"
          className="input font-mono !text-[16px]"
        />
        {side === "buy" && (
          <div className="mt-2 flex gap-1.5">
            {["0.01", "0.05", "0.1", "0.5"].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => updateQuote(v, "buy")}
                className="flex-1 py-1.5 rounded-md border border-[var(--border)] text-[11px] font-extrabold text-ink-300/75 hover:border-[var(--border-strong)] hover:text-ink-300 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote — live from Uniswap QuoterV2 */}
      <div className="flex items-center justify-between rounded-lg bg-ink-1000/8 px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-300/60">
          <ArrowDownUp className="h-3 w-3" />
          You receive
        </span>
        <span className="text-[13px] font-extrabold tabular-nums">
          {quoting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : quote !== null ? (
            side === "buy" ? (
              `${(Number(quote) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${symbol}`
            ) : (
              `${Number(formatEther(quote)).toFixed(5)} ETH`
            )
          ) : (
            "—"
          )}
        </span>
      </div>

      {localError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-400 font-semibold break-words">
          {localError}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className={`w-full !py-3 btn ${side === "buy" ? "btn-primary" : "btn-secondary"} disabled:opacity-50`}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {isPending ? "Confirm in wallet…" : "Trading…"}
          </>
        ) : side === "buy" ? (
          `Buy ${symbol}`
        ) : (
          `Sell ${symbol}`
        )}
      </button>

      <p className="text-[10px] text-ink-300/45 font-medium text-center">
        Real Uniswap V3 pool · 1% fee, 75% to the creator · 2% max slippage
      </p>
    </div>
  );
}

// ── Bits ─────────────────────────────────────────────────────────────

function SocialChip({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon?: "tg" | "web";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-extrabold text-ink-300/80 hover:text-ink-300 hover:border-[var(--border-strong)] transition-colors"
    >
      {icon === "tg" ? (
        <Send className="h-3 w-3" />
      ) : icon === "web" ? (
        <Globe className="h-3 w-3" />
      ) : (
        <svg viewBox="0 0 1200 1227" className="h-3 w-3 fill-current" aria-hidden="true">
          <path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.491 750.218 842.672 1226.37H1200L714.137 519.284h.026ZM569.165 687.828l-47.468-67.894-377.686-540.24h162.604l304.797 435.991 47.468 67.894 396.2 566.721H892.476L569.165 687.854v-.026Z" />
        </svg>
      )}
      {label}
    </a>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card !p-3.5">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/55">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-black tracking-tight tabular-nums truncate">
        {value}
      </div>
    </div>
  );
}


/** Contract address chip — click to copy the full CA. */
function CopyCa({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(address).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        });
      }}
      title={address}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3 py-1.5 text-[11px] font-extrabold text-ink-300/80 hover:text-ink-300 hover:border-koki-500/60 transition-colors font-mono"
    >
      CA: {address.slice(0, 6)}…{address.slice(-4)}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
