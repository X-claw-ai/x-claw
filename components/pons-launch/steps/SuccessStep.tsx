"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Rocket, Copy, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { LaunchResult, LaunchKit } from "../types";

// Step 5: Success. Show the deployed token/pool/tx with jump links to
// Blockscout + the live token page. Quick clipboard copies for
// sharing the token address on X.

interface Props {
  kit: LaunchKit;
  result: LaunchResult;
}

export default function SuccessStep({ kit, result }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-koki-500 text-ink-1000 mb-4">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-display text-display-md">
          <span className="stamp">{kit.tokenName}</span> is live.
        </h2>
        <p className="mt-3 text-ink-300/80 text-base font-medium">
          Live on the HAMR launchpad. ${kit.ticker} is trading on the curve now.
        </p>
      </div>

      <div className="card !p-5 space-y-3">
        <Row label="Token" value={result.token} />
        <Row label="Tx" value={result.txHash} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/launches/${result.token}`}
          className="btn btn-primary !py-3 !px-5"
        >
          <Rocket className="h-4 w-4" />
          Open token page
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <a
          href={result.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary !py-3 !px-5"
        >
          Blockscout
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

      </div>

      {(kit.launchTweets?.length ?? 0) > 0 && (
        <div className="card !p-5">
          <div className="eyebrow !text-[10px]">Kick off the launch</div>
          <div className="mt-2 text-[14px] font-black tracking-tight mb-3">
            First tweet
          </div>
          <TweetPanel text={kit.launchTweets![0]} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-ink-300/72">
          {label}
        </div>
        <div className="font-mono text-[12px] text-ink-300 truncate mt-0.5">
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch {
            /* ignore */
          }
        }}
        className="btn btn-secondary !py-1.5 !px-2.5 !text-xs shrink-0"
      >
        <Copy className="h-3 w-3" />
        {copied ? "✓" : ""}
      </button>
    </div>
  );
}

function TweetPanel({ text }: { text: string }) {
  const encoded = encodeURIComponent(text);
  const url = `https://twitter.com/intent/tweet?text=${encoded}`;
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-300/85 leading-relaxed font-medium whitespace-pre-wrap">
        {text}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary !py-2 !px-3 !text-xs inline-flex"
      >
        Post to X
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
