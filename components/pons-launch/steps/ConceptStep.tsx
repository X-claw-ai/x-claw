"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, ExternalLink, Loader2, Check } from "lucide-react";
import type { ConceptInput, AutoPhase } from "../types";

// Step 1: Concept. Two lanes:
//   - Auto-pilot: HAMR agent scans X and picks a viral post itself.
//   - Manual: user types the idea, ticker, and (optional) source URL.
//
// The manual lane pre-fills from the `?meme=<id>` search-param upstream
// so a click from the Meme Radar lands here with the boxes already filled.

interface Props {
  initial: ConceptInput | null;
  onNext: (input: ConceptInput) => void | Promise<void>;
  loading: boolean;
  /** Auto-pilot pipeline stage — drives the staged progress panel. */
  phase?: AutoPhase;
  /** The concept Auto-pilot locked (set once phase === "drafting"). */
  picked?: ConceptInput | null;
}

export default function ConceptStep({
  initial,
  onNext,
  loading,
  phase,
  picked,
}: Props) {
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

  // Auto-pilot is running — replace the whole form with a staged
  // progress panel so the user sees, instantly, what's happening.
  if (loading && phase) {
    return <AutoPilotProgress phase={phase} picked={picked ?? null} />;
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <LaneCard
          selected={autoPilot}
          onSelect={() => setAutoPilot(true)}
          eyebrow="Auto-pilot"
          title="HAMR picks the meme"
          body="The HAMR agent scans X for the freshest viral moment, then drafts the whole launch kit for you."
        />
        <LaneCard
          selected={!autoPilot}
          onSelect={() => setAutoPilot(false)}
          eyebrow="Manual"
          title="You bring the idea"
          body="Type your concept, ticker, and (optional) source X post. HAMR handles the rest."
        />
      </div>

      {!autoPilot && (
        <div className="space-y-4">
          <Field label="Project idea">
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              rows={3}
              placeholder="e.g., X native community token for onchain builders"
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
          The agent drafts a full launch kit — you review before any
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

/** Staged progress panel shown while Auto-pilot runs.
 *
 *  scanning — searching X for the top viral post of the last 24h.
 *  drafting — post locked; shows WHICH meme was picked (name, ticker,
 *             idea, and a link to the original X post) while the full
 *             launch kit is written. */
function AutoPilotProgress({
  phase,
  picked,
}: {
  phase: NonNullable<AutoPhase>;
  picked: ConceptInput | null;
}) {
  const scanningDone = phase === "drafting";
  return (
    <div className="card !p-6 space-y-5">
      {/* Stage 1 — scan X */}
      <div className="flex items-start gap-3">
        <StageIcon done={scanningDone} active={phase === "scanning"} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-black tracking-tight">
            Scanning X for the top viral meme right now
          </div>
          <p className="mt-0.5 text-[12px] text-ink-300/70 font-medium leading-snug">
            Live search over the last 24 hours, ranked by raw view count.
            Posts already used by earlier launches are excluded.
          </p>
        </div>
      </div>

      {/* Stage 2 — draft the kit */}
      <div className="flex items-start gap-3">
        <StageIcon done={false} active={phase === "drafting"} />
        <div className="flex-1 min-w-0">
          <div
            className={`text-[14px] font-black tracking-tight ${
              phase === "drafting" ? "" : "text-ink-300/40"
            }`}
          >
            Drafting the full launch kit
          </div>
          {phase === "drafting" && picked ? (
            <div className="mt-2 rounded-xl border border-[var(--border-strong)] bg-cream-50 p-3.5 space-y-1.5">
              <div className="text-[15px] font-black tracking-tight truncate">
                {picked.tokenName}{" "}
                <span className="text-ink-300/60 font-extrabold">
                  ${picked.ticker}
                </span>
              </div>
              {picked.idea && (
                <p className="text-[12px] text-ink-300/75 font-medium leading-snug line-clamp-3">
                  {picked.idea}
                </p>
              )}
              {picked.sourceUrl && (
                <a
                  href={picked.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12px] font-extrabold text-koki-500 hover:underline"
                >
                  View the viral post on X
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="mt-0.5 text-[12px] text-ink-300/40 font-medium">
              Name, ticker, description, and 10 launch tweets.
            </p>
          )}
        </div>
      </div>

      <p className="text-[11px] text-ink-300/50 font-medium">
        Usually 30–60 seconds end to end. Nothing touches your wallet until
        you approve the kit.
      </p>
    </div>
  );
}

function StageIcon({ done, active }: { done: boolean; active: boolean }) {
  if (done) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-koki-500 text-white">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (active) {
    return (
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-koki-500 text-koki-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-[var(--border)]" />
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
