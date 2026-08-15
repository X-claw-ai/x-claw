"use client";

import { useCallback, useEffect, useReducer } from "react";
import { useSearchParams } from "next/navigation";
import ConceptStep from "./steps/ConceptStep";
import KitStep from "./steps/KitStep";
import ConnectStep from "./steps/ConnectStep";
import SignStep from "./steps/SignStep";
import SuccessStep from "./steps/SuccessStep";
import {
  INITIAL_WIZARD_STATE,
  type WizardState,
  type ConceptInput,
  type LaunchKit,
  type LaunchResult,
} from "./types";
import { saveLaunch } from "@/lib/storage/launches";

// The top-level Pons launch wizard.
//
// State is a small reducer so every step is a pure "given state → render"
// component that dispatches transitions. The wizard never fetches on
// mount — API calls only fire when the user submits a step.
//
// URL param `?meme=<id>` upstream can pre-fill the concept step; the
// legacy Pump.fun radar links continue to work because we accept the
// same param name and just deliver it to the concept form as `initial`.

type Action =
  | { type: "GO"; step: WizardState["step"] }
  | { type: "SET_CONCEPT"; concept: ConceptInput }
  | { type: "SET_KIT"; kit: LaunchKit }
  | { type: "SET_INITIAL_BUY"; value: string }
  | { type: "SET_RESULT"; result: LaunchResult }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_LOADING"; loading: boolean };

function reducer(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "GO":
      return { ...state, step: action.step, error: null };
    case "SET_CONCEPT":
      return { ...state, concept: action.concept };
    case "SET_KIT":
      return { ...state, kit: action.kit };
    case "SET_INITIAL_BUY":
      return { ...state, initialBuyEth: action.value };
    case "SET_RESULT":
      return { ...state, result: action.result, step: "success" };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
  }
}

export default function PonsLaunchWizard() {
  const params = useSearchParams();
  const memeId = params.get("meme");
  const [state, dispatch] = useReducer(reducer, INITIAL_WIZARD_STATE);

  // Prefill from ?meme=<id> — if the radar redirects here we pull the
  // concept off /api/meme-analyze and drop it into the concept form.
  useEffect(() => {
    if (!memeId) return;
    let cancelled = false;
    fetch(`/api/meme-analyze?meme=${encodeURIComponent(memeId)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (json: {
          ok?: boolean;
          concept?: {
            idea?: string;
            tokenName?: string;
            ticker?: string;
            sourceUrl?: string;
          };
        } | null) => {
          if (cancelled || !json || !json.ok || !json.concept) return;
          const c = json.concept;
          dispatch({
            type: "SET_CONCEPT",
            concept: {
              idea: c.idea ?? "",
              tokenName: c.tokenName ?? "",
              ticker: c.ticker ?? "",
              sourceUrl: c.sourceUrl,
              autoPilot: false,
            },
          });
        },
      )
      .catch(() => {
        /* silent — user can still type manually */
      });
    return () => {
      cancelled = true;
    };
  }, [memeId]);

  const generateKit = useCallback(async (concept: ConceptInput) => {
    dispatch({ type: "SET_LOADING", loading: true });
    dispatch({ type: "SET_ERROR", error: null });
    try {
      if (concept.autoPilot) {
        const res = await fetch("/api/auto-launch", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ preview: true }),
        });
        if (!res.ok) throw new Error(`Auto-pilot failed (${res.status})`);
        const json = await res.json();
        const derived: ConceptInput = {
          idea: json?.concept?.idea ?? "",
          tokenName: json?.concept?.tokenName ?? "",
          ticker: json?.concept?.ticker ?? "",
          sourceUrl: json?.concept?.sourceUrl,
          autoPilot: true,
        };
        dispatch({ type: "SET_CONCEPT", concept: derived });
        dispatch({ type: "SET_KIT", kit: coerceKit(json.kit ?? json) });
      } else {
        dispatch({ type: "SET_CONCEPT", concept });
        const res = await fetch("/api/generate-launch-kit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(concept),
        });
        if (!res.ok) throw new Error(`Kit generation failed (${res.status})`);
        const json = await res.json();
        dispatch({ type: "SET_KIT", kit: coerceKit(json) });
      }
      dispatch({ type: "GO", step: "kit" });
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        error: err instanceof Error ? err.message : "Kit generation failed",
      });
    } finally {
      dispatch({ type: "SET_LOADING", loading: false });
    }
  }, []);

  const regenerate = useCallback(async () => {
    if (!state.concept) return;
    await generateKit(state.concept);
  }, [state.concept, generateKit]);

  const handleSuccess = useCallback(
    (result: LaunchResult) => {
      // Local history so /dashboard picks it up. Server persistence is
      // handled by /api/launch-history once P9 lands.
      if (state.kit) {
        saveLaunch({
          id: result.token,
          createdAt: Date.now(),
          tokenName: state.kit.tokenName,
          ticker: state.kit.ticker,
          token: result.token,
          pool: result.pool,
          logo: state.kit.logoUrl,
          explorerUrl: result.explorerUrl,
          ponsUrl: result.ponsUrl,
          status: "launched",
        });
      }
      dispatch({ type: "SET_RESULT", result });
    },
    [state.kit],
  );

  return (
    <section className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <StepHeader current={state.step} />

      {state.error && state.step !== "sign" && (
        <div className="card !p-4 !border-red-500/50 !bg-red-500/10 text-[12px] text-red-300 font-semibold leading-relaxed break-words mb-6">
          {state.error}
        </div>
      )}

      {state.step === "concept" && (
        <ConceptStep
          initial={state.concept}
          loading={state.loading}
          onNext={generateKit}
        />
      )}
      {state.step === "kit" && state.kit && (
        <KitStep
          kit={state.kit}
          loading={state.loading}
          onBack={() => dispatch({ type: "GO", step: "concept" })}
          onNext={(edited) => {
            dispatch({ type: "SET_KIT", kit: edited });
            dispatch({ type: "GO", step: "connect" });
          }}
          onRegenerate={regenerate}
        />
      )}
      {state.step === "connect" && (
        <ConnectStep
          initialBuyEth={state.initialBuyEth}
          onInitialBuyChange={(v) =>
            dispatch({ type: "SET_INITIAL_BUY", value: v })
          }
          onBack={() => dispatch({ type: "GO", step: "kit" })}
          onNext={() => dispatch({ type: "GO", step: "sign" })}
        />
      )}
      {state.step === "sign" && state.kit && (
        <SignStep
          kit={state.kit}
          initialBuyEth={state.initialBuyEth}
          onBack={() => dispatch({ type: "GO", step: "connect" })}
          onSuccess={handleSuccess}
        />
      )}
      {state.step === "success" && state.result && state.kit && (
        <SuccessStep kit={state.kit} result={state.result} />
      )}
    </section>
  );
}

/** Best-effort mapping from the /api/generate-launch-kit response to
 *  our internal LaunchKit shape. Fields we don't know default to the
 *  concept values so the wizard always has something to render. */
function coerceKit(raw: Record<string, unknown>): LaunchKit {
  const anyRaw = raw as Record<string, unknown>;
  const kit = (anyRaw.kit as Record<string, unknown>) ?? anyRaw;
  const provider =
    typeof anyRaw.provider === "string"
      ? (anyRaw.provider as string)
      : typeof kit.provider === "string"
        ? (kit.provider as string)
        : undefined;
  return {
    tokenName: String(kit.tokenName ?? kit.name ?? ""),
    ticker: String(kit.ticker ?? kit.symbol ?? ""),
    shortDescription: String(
      kit.shortDescription ??
        kit.description ??
        kit.onchainDescription ??
        "",
    ),
    longDescription:
      typeof kit.longDescription === "string"
        ? (kit.longDescription as string)
        : undefined,
    logoUrl:
      (typeof kit.logoUrl === "string" && (kit.logoUrl as string)) ||
      (typeof kit.imageDataUrl === "string" && (kit.imageDataUrl as string)) ||
      (typeof anyRaw.imageDataUrl === "string" && (anyRaw.imageDataUrl as string)) ||
      undefined,
    provider,
    model: typeof anyRaw.model === "string" ? (anyRaw.model as string) : undefined,
    mock: Boolean(anyRaw.mock),
    socials: kit.socials as LaunchKit["socials"],
    launchTweets: Array.isArray(kit.launchTweets)
      ? (kit.launchTweets as string[])
      : undefined,
    raidReplies: Array.isArray(kit.raidReplies)
      ? (kit.raidReplies as string[])
      : undefined,
    extras: kit as Record<string, unknown>,
  };
}

function StepHeader({ current }: { current: WizardState["step"] }) {
  const steps: { key: WizardState["step"]; label: string }[] = [
    { key: "concept", label: "Concept" },
    { key: "kit", label: "Kit" },
    { key: "connect", label: "Connect" },
    { key: "sign", label: "Launch" },
    { key: "success", label: "Live" },
  ];
  const currentIdx = steps.findIndex((s) => s.key === current);
  return (
    <div className="mb-8 flex items-center justify-between gap-1.5">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div
            key={s.key}
            className={`flex-1 rounded-md border px-2 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider transition-colors ${
              active
                ? "border-koki-500 text-koki-500 bg-koki-500/10"
                : done
                  ? "border-[var(--border-strong)] text-ink-300"
                  : "border-[var(--border)] text-ink-300/45"
            }`}
          >
            0{i + 1} · {s.label}
          </div>
        );
      })}
    </div>
  );
}
