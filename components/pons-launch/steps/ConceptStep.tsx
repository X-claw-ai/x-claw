"use client";

import { useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ConceptInput } from "../types";

// Step 1: Concept. Two lanes:
//   - Auto-pilot: KOKi agent scans X and picks a viral post itself.
//   - Manual: user types the idea, ticker, and (optional) source URL.
//
// The manual lane pre-fills from the `?meme=<id>` search-param upstream
// so a click from the Meme Radar lands here with the boxes already filled.

interface Props {
  initial: ConceptInput | null;
  onNext: (input: ConceptInput) => void | Promise<void>;
  loading: boolean;
}

export default function ConceptStep({ initial, onNext, loading }: Props) {
  const [autoPilot, setAutoPilot] = useState<boolean>(
    initial?.autoPilot ?? true,
  );
  const [idea, setIdea] = useState(initial?.idea ?? "");
  const [tokenName, setTokenName] = useState(initial?.tokenName ?? "");
  const [ticker, setTicker] = useState(initial?.ticker ?? "");
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");

  const canSubmit =
    autoPilot ||
    (idea.trim().length > 0 &&
      tokenName.trim().length > 0 &&
      ticker.trim().length > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;
    onNext({
      idea: idea.trim(),
      tokenName: tokenName.trim(),
      ticker: ticker.trim().toUpperCase(),
      sourceUrl: sourceUrl.trim() || undefined,
      autoPilot,
    });
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LaneCard
          selected={autoPilot}
          onSelect={() => setAutoPilot(true)}
          eyebrow="Auto-pilot"
          title="KOKi picks the meme"
          body="Grok scans X for the freshest viral moment, then drafts the whole launch kit for you."
        />
        <LaneCard
          selected={!autoPilot}
          onSelect={() => setAutoPilot(false)}
          eyebrow="Manual"
          title="You bring the idea"
          body="Type your concept, ticker, and (optional) source X post. KOKi handles the rest."
        />
      </div>

      {!autoPilot && (
        <div className="space-y-4">
          <Field label="Project idea">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              placeholder="e.g., X native community token for Grok-curious builders"
              className="input min-h-[88px]"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
            <Field label="Token name">
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="NostalgiaHiroba"
                className="input"
              />
            </Field>
            <Field label="Ticker">
              <input
                type="text"
                value={ticker}
                onChange={(e) =>
                  setTicker(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 10))
                }
                placeholder="HIROBA"
                className="input font-mono"
                maxLength={10}
              />
            </Field>
          </div>
          <Field label="Source X post URL (optional)">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://x.com/..."
              className="input"
            />
          </Field>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[12px] text-ink-300/70 font-medium">
          Grok drafts a full Pons-ready launch kit — you review before any
          wallet touches anything.
        </p>
        <button
          type="submit"
          disabled={!canSubmit || loading}
          className="btn btn-primary !py-3 !px-5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Sparkles className="h-4 w-4 animate-pulse" />
              {autoPilot ? "Scanning X…" : "Drafting kit…"}
            </>
          ) : (
            <>
              {autoPilot ? "Run Auto-pilot" : "Generate launch kit"}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function LaneCard(props: {
  selected: boolean;
  onSelect: () => void;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={props.onSelect}
      className={`card !p-5 text-left transition-all ${
        props.selected
          ? "border-koki-500 ring-2 ring-koki-500/40"
          : "hover:border-[var(--border-strong)]"
      }`}
    >
      <div className="eyebrow !text-[10px]">{props.eyebrow}</div>
      <div className="mt-1 text-[16px] font-black tracking-tight">{props.title}</div>
      <p className="mt-2 text-[12px] text-ink-300/72 leading-snug font-medium">
        {props.body}
      </p>
    </button>
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
