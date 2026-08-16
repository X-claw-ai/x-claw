"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import type { LaunchKit } from "../types";

// Step 2: Kit review. Shows what Grok drafted so the user can approve,
// tweak the name/ticker/description, or re-generate before the wallet
// step. All edits stay client-side until they confirm on the sign step.

interface Props {
  kit: LaunchKit;
  onBack: () => void;
  onNext: (edited: LaunchKit) => void;
  onRegenerate: () => void | Promise<void>;
  loading: boolean;
}

export default function KitStep({
  kit,
  onBack,
  onNext,
  onRegenerate,
  loading,
}: Props) {
  const [tokenName, setTokenName] = useState(kit.tokenName);
  const [ticker, setTicker] = useState(kit.ticker);
  const [shortDescription, setShortDescription] = useState(
    kit.shortDescription ?? "",
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onNext({
      ...kit,
      tokenName: tokenName.trim(),
      ticker: ticker.trim().toUpperCase(),
      shortDescription: shortDescription.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-start gap-4">
        {/* Logo preview */}
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-koki-500 border border-[var(--border-strong)] overflow-hidden relative">
          {kit.logoUrl ? (
            <Image
              src={kit.logoUrl}
              alt={kit.tokenName}
              fill
              sizes="80px"
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center font-black text-ink-1000">
              ${kit.ticker.slice(0, 4)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="eyebrow !text-[10px]">
            AI-generated draft
            {kit.mock ? " (mock)" : ""}
          </div>
          <div className="mt-1 text-display text-[26px] leading-tight truncate">
            {tokenName || "Your token"}
          </div>
          <div className="text-[12px] font-extrabold text-ink-300/70">
            ${ticker || "TICKER"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
        <Field label="Token name">
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            className="input"
            maxLength={40}
          />
        </Field>
        <Field label="Ticker">
          <input
            type="text"
            value={ticker}
            onChange={(e) =>
              setTicker(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 10))
            }
            className="input font-mono"
            maxLength={10}
          />
        </Field>
      </div>

      <Field label="Short description (used on chain)">
        <textarea
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          rows={3}
          className="input min-h-[88px]"
          maxLength={500}
        />
      </Field>

      {(kit.launchTweets?.length ?? 0) > 0 && (
        <details className="card !p-4">
          <summary className="cursor-pointer text-[12px] font-extrabold tracking-tight text-ink-300 select-none">
            + {kit.launchTweets!.length} launch tweets drafted
          </summary>
          <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-300/85 font-medium">
            {kit.launchTweets!.slice(0, 3).map((t, i) => (
              <li key={i} className="p-2.5 rounded-md bg-ink-1000/10">
                {t}
              </li>
            ))}
            {kit.launchTweets!.length > 3 && (
              <li className="text-ink-300/60 text-[11px] italic">
                …plus {kit.launchTweets!.length - 3} more in the full kit
              </li>
            )}
          </ul>
        </details>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary !py-2.5 !px-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={loading}
            className="btn btn-secondary !py-2.5 !px-3 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Regenerate
          </button>
          <button
            type="submit"
            disabled={loading || !tokenName || !ticker}
            className="btn btn-primary !py-2.5 !px-4 disabled:opacity-50"
          >
            Continue
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
