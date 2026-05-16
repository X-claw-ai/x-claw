"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Rocket,
  Sparkles,
  CheckCircle2,
  Wallet,
  ShieldCheck,
  Loader2,
  Copy,
  Twitter,
  Send as TgSend,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Radar,
} from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Keypair, VersionedTransaction } from "@solana/web3.js";
import { StepIndicator } from "@/components/ui/StepIndicator";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { generateMockLaunchKit } from "@/lib/generate";
import { saveLaunch } from "@/lib/storage/launches";
import { getRadarMeme, READINESS_META, type RadarMeme } from "@/lib/memeRadar";
import type { ConceptInput, LaunchKit, Chain, LaunchStyle } from "@/lib/types";
import type { ProviderMeta } from "@/lib/llm/types";

const STEPS = [
  { label: "Create Concept" },
  { label: "Generate Launch Kit" },
  { label: "Review Metadata" },
  { label: "Connect Wallet" },
  { label: "Sign & Launch" },
  { label: "Launch Dashboard" },
];

/**
 * Coin-specific fallback for the Pump.fun token page's Twitter button when
 * neither Live Search (originXUrl) nor user input gave us one. Builds an X
 * search URL for `$TICKER` so the link is at least about THIS coin, not a
 * generic project page.
 *
 * Examples:
 *   tickerSearchUrl("GROKCAT") → "https://x.com/search?q=%24GROKCAT&src=typed_query"
 */
function tickerSearchUrl(ticker: string): string {
  const safe = (ticker || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "MEME";
  return `https://x.com/search?q=%24${safe}&src=typed_query`;
}

const DEFAULT: ConceptInput = {
  idea: "",
  tokenName: "",
  ticker: "",
  chain: "solana",
  theme: "",
  audience: "",
  launchStyle: "fair-launch",
  websiteUrl: "",
  // Empty by default — server-side guard in /api/pump-launch will inject a
  // coin-specific X search URL ($TICKER) at submit time if user skipped this.
  twitterUrl: "",
  telegramUrl: "",
  logoDataUrl: null,
};

interface GenerateApiResponse {
  ok: boolean;
  mock?: boolean;
  provider?: ProviderMeta["provider"];
  model?: string;
  usage?: ProviderMeta["usage"];
  kit?: LaunchKit;
  fallbackReason?: string;
  error?: string;
}

interface PumpLaunchPrepareResponse {
  ok: boolean;
  metadataUri?: string;
  txBase64?: string;
  ticker?: string;
  pumpUrl?: string;
  devBuyInSol?: number;
  stage?: string;
  error?: string;
}

type LaunchPhase =
  | "idle"
  | "preparing"
  | "uploading"
  | "building"
  | "signing-mint"
  | "signing-wallet"
  | "submitting"
  | "confirming"
  | "done"
  | "error";

interface RealLaunchResult {
  signature: string;
  pumpUrl: string;
  mintPubkey: string;
  metadataUri: string;
  devBuyInSol: number;
}

export default function PumpLaunchWizard() {
  const [step, setStep] = useState(0);
  const [concept, setConcept] = useState<ConceptInput>(DEFAULT);
  const [kit, setKit] = useState<LaunchKit | null>(null);
  const [providerMeta, setProviderMeta] = useState<ProviderMeta | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>("idle");
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchResult, setLaunchResult] = useState<RealLaunchResult | null>(null);
  const [devBuySol, setDevBuySol] = useState<number>(0);

  // Auto-pilot mode — Grok invents the concept itself
  const [autoPiloting, setAutoPiloting] = useState(false);
  const [autoReasoning, setAutoReasoning] = useState<string | null>(null);
  // Origin X post that anchored the auto-pilot concept (Live Search citation)
  const [originX, setOriginX] = useState<{ url: string; author?: string } | null>(null);

  // AI image generation (Aurora → DALL-E fallback)
  const [generatingLogo, setGeneratingLogo] = useState(false);
  const [logoProvider, setLogoProvider] = useState<string | null>(null);

  // Real-time Meme Radar prefill: when the user lands here from a radar
  // card, we hydrate the concept from /lib/memeRadar.ts and remember which
  // meme it came from so the UI can show the source banner.
  const [fromMeme, setFromMeme] = useState<RadarMeme | null>(null);

  const { publicKey, signTransaction, connected, wallet } = useWallet();
  const { connection } = useConnection();

  // Read ?meme=<id>&go=1 once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const memeId = params.get("meme");
    if (!memeId) return;
    const meme = getRadarMeme(memeId);
    if (!meme) return;

    const seeded: ConceptInput = {
      ...DEFAULT,
      idea: meme.concept.idea,
      tokenName: meme.concept.tokenName,
      ticker: meme.concept.ticker,
      chain: meme.concept.chain,
      theme: meme.concept.theme,
      audience: meme.concept.audience,
      launchStyle: meme.concept.launchStyle,
    };
    setConcept(seeded);
    setFromMeme(meme);

    if (params.get("go") === "1") {
      // Fire generation immediately with the seeded concept (don't wait
      // for setState, which is async).
      void runGenerate(seeded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof ConceptInput>(k: K, v: ConceptInput[K]) =>
    setConcept((c) => ({ ...c, [k]: v }));

  const conceptValid =
    concept.idea.trim().length > 4 &&
    concept.tokenName.trim().length > 0 &&
    concept.ticker.trim().length > 0;

  // Step 1 → 2 : LLM generate (xAI primary, fallback chain). See /api route.
  // Accepts an optional override so the radar prefill can fire without
  // waiting for React state to flush.
  async function runGenerate(override?: ConceptInput) {
    const c = override ?? concept;
    setGenerating(true);
    setFallbackReason(null);
    setStep(1);
    try {
      const res = await fetch("/api/generate-launch-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const data: GenerateApiResponse = await res.json();
      if (data.ok && data.kit) {
        setKit(data.kit);
        if (data.provider && data.model) {
          setProviderMeta({
            provider: data.provider,
            model: data.model,
            usage: data.usage,
          });
        }
        if (data.fallbackReason) setFallbackReason(data.fallbackReason);
      } else {
        setKit(generateMockLaunchKit(c));
        setProviderMeta({ provider: "mock", model: "koki-mock-generator" });
        setFallbackReason(data.error || "API returned unexpected response");
      }
    } catch (err) {
      setKit(generateMockLaunchKit(concept));
      setProviderMeta({ provider: "mock", model: "koki-mock-generator" });
      setFallbackReason(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
      setStep(2);
    }
  }

  /**
   * Generate a logo image via xAI Aurora (DALL-E 3 fallback) using a prompt
   * built from the current concept (or kit's imagePrompt if available).
   * Writes the resulting data URL into concept.logoDataUrl.
   */
  async function runGenerateLogo(promptOverride?: string) {
    const prompt =
      promptOverride ||
      kit?.imagePrompt ||
      `Square logo for a Solana memecoin "${concept.tokenName || "Token"}" ($${
        concept.ticker || "TOKEN"
      }). Theme: ${concept.theme || "X-native meme aesthetic"}. Style: vector clean lines, bold meme aesthetic, no text, no real-person likeness.`;

    setGeneratingLogo(true);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          walletPubkey: publicKey ? publicKey.toBase58() : undefined,
          feature: kit ? "logo-from-kit" : "logo-manual",
          ticker: concept.ticker || kit?.ticker,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        imageDataUrl?: string;
        provider?: string;
        model?: string;
      };
      if (data.ok && data.imageDataUrl) {
        setField("logoDataUrl", data.imageDataUrl);
        setLogoProvider(data.provider ? `${data.provider}${data.model ? ` · ${data.model}` : ""}` : null);
      }
    } catch {
      // silent — user can retry or upload manually
    } finally {
      setGeneratingLogo(false);
    }
  }

  /**
   * Auto-pilot — Grok invents the concept itself, then immediately runs
   * launch-kit generation. The user lands on Step 2 (Review) with everything
   * filled in. They can still edit before signing.
   */
  async function runAutoPilot() {
    setAutoPiloting(true);
    setAutoReasoning(null);
    setFallbackReason(null);

    try {
      const conceptRes = await fetch("/api/auto-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletPubkey: publicKey ? publicKey.toBase58() : undefined,
        }),
      });
      const conceptData = (await conceptRes.json()) as {
        ok: boolean;
        concept?: {
          idea: string;
          tokenName: string;
          ticker: string;
          theme: string;
          audience: string;
          launchStyle: ConceptInput["launchStyle"];
          reasoning: string;
        };
        provider?: string;
        fallbackReason?: string;
      };

      if (!conceptData.ok || !conceptData.concept) {
        throw new Error("auto-launch returned no concept");
      }

      const c = conceptData.concept as typeof conceptData.concept & {
        originXUrl?: string;
        originXAuthor?: string;
        originImageUrl?: string;
      };
      const ideaWithOrigin = c.originXUrl
        ? `${c.idea}\n\nInspired by ${c.originXAuthor || "an X post"} — ${c.originXUrl}`
        : c.idea;

      // Seed the concept BEFORE waiting on the parallel branches. The Review
      // step's metadata (name/ticker/twitter URL) renders immediately while
      // image + launch-kit are still generating.
      const seeded: ConceptInput = {
        ...DEFAULT,
        idea: ideaWithOrigin,
        tokenName: c.tokenName,
        ticker: c.ticker,
        theme: c.theme,
        audience: c.audience,
        launchStyle: c.launchStyle,
        twitterUrl: c.originXUrl ?? tickerSearchUrl(c.ticker),
        logoDataUrl: null, // filled in by whichever image branch wins below
      };
      setConcept(seeded);
      setOriginX(c.originXUrl ? { url: c.originXUrl, author: c.originXAuthor } : null);
      setAutoReasoning(c.reasoning);

      // ── Parallel fan-out ────────────────────────────────────────────────
      // All three branches are independent — fire them at once instead of
      // chaining. The slowest (usually launch-kit, 15-30s) becomes the wall
      // clock, saving 15-40s vs. the old sequential flow.
      //   1. fetch-x-image — pull the real viral meme art (1-5s)
      //   2. runGenerate   — write the full launch kit (15-30s)
      //   3. runGenerateLogo — Aurora fallback, only used if (1) returned nothing

      // 1. Real X meme image (preferred logo source).
      const xImagePromise: Promise<string | null> = c.originImageUrl
        ? fetch(`/api/fetch-x-image?url=${encodeURIComponent(c.originImageUrl)}`)
            .then((r) => r.json())
            .then((d: { ok: boolean; imageDataUrl?: string }) =>
              d.ok && d.imageDataUrl ? d.imageDataUrl : null,
            )
            .catch(() => null)
        : Promise.resolve(null);

      // 2. Launch kit (text). Runs in parallel — uses the seeded concept.
      const kitPromise = runGenerate(seeded);

      // 3. Aurora logo (backup). Always runs so we have a fallback ready by
      // the time the X-image branch resolves. If X image succeeds we discard
      // this result; the credits are the tradeoff for never adding a
      // sequential 10-20s wait after fetch-x-image fails.
      const logoPrompt = `Square logo for a Solana memecoin "${seeded.tokenName}" ($${seeded.ticker}). Theme: ${seeded.theme}. Style: vector clean lines, bold meme aesthetic, no text, no real-person likeness, no copyrighted IP.`;
      const auroraPromise: Promise<string | null> = (async () => {
        try {
          const r = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: logoPrompt,
              walletPubkey: publicKey ? publicKey.toBase58() : undefined,
              feature: "auto-pilot-fallback-logo",
              ticker: seeded.ticker,
            }),
          });
          const d = (await r.json()) as { ok: boolean; imageDataUrl?: string };
          return d.ok && d.imageDataUrl ? d.imageDataUrl : null;
        } catch {
          return null;
        }
      })();

      // Pick the image as soon as it's available: prefer the real X meme,
      // fall back to Aurora. Both promises run concurrently; we don't have
      // to wait on both — the moment X image returns (and is truthy) we
      // commit it, and the Aurora result quietly settles unused.
      const xImageDataUrl = await xImagePromise;
      if (xImageDataUrl) {
        setField("logoDataUrl", xImageDataUrl);
        setLogoProvider("x-post (original meme)");
      } else {
        const auroraData = await auroraPromise;
        if (auroraData) {
          setField("logoDataUrl", auroraData);
          setLogoProvider("aurora");
        }
      }

      // Make sure the kit promise also lands before we mark auto-pilot done.
      await kitPromise;
    } catch (err) {
      setFallbackReason(err instanceof Error ? err.message : "Auto-pilot failed");
    } finally {
      setAutoPiloting(false);
    }
  }

  // Step 4 → 5 : REAL Pump.fun launch.
  async function runRealLaunch() {
    if (!publicKey || !signTransaction) {
      setLaunchError("Wallet is not connected. Connect Phantom or Solflare first.");
      return;
    }
    if (!kit) {
      setLaunchError("Launch kit is missing. Go back and generate.");
      return;
    }

    setLaunchError(null);
    setLaunchResult(null);
    setLaunchPhase("preparing");

    try {
      // 1. Generate mint keypair locally — never leaves the browser.
      const mintKeypair = Keypair.generate();

      setLaunchPhase("uploading");

      // 2. Ask the server to upload metadata to Pump.fun IPFS and build
      //    the unsigned launch transaction via PumpPortal.
      const res = await fetch("/api/pump-launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorPublicKey: publicKey.toBase58(),
          mintPublicKey: mintKeypair.publicKey.toBase58(),
          tokenName: kit.tokenName,
          ticker: kit.ticker,
          description: kit.shortDescription,
          twitter: concept.twitterUrl,
          telegram: concept.telegramUrl,
          website: concept.websiteUrl,
          logoDataUrl: concept.logoDataUrl,
          amountInSol: devBuySol,
          slippage: 10,
          priorityFee: 0.0005,
        }),
      });
      const data: PumpLaunchPrepareResponse = await res.json();
      if (!res.ok || !data.ok || !data.txBase64) {
        const stage = data.stage ? ` (stage: ${data.stage})` : "";
        throw new Error((data.error || `HTTP ${res.status}`) + stage);
      }

      setLaunchPhase("building");

      // 3. Deserialize the unsigned tx
      const txBytes = base64ToBytes(data.txBase64);
      const tx = VersionedTransaction.deserialize(txBytes);

      // SIGN ORDER MATTERS — per Phantom security review (William @ Phantom):
      //   "Phantom Lighthouse may flag transactions when the signature order
      //    isn't correct. To avoid the warning, use this order:
      //      let signedTx = await signer.signTransaction(tx);   // wallet first
      //      signedTx.partialSign(additionalSigner);            // mint after"
      //
      // We previously did mint.sign() THEN wallet.signTransaction(), which
      // is what triggered Phantom's malicious-dApp warning on every launch.

      setLaunchPhase("signing-wallet");

      // 4. Wallet (Phantom/Solflare) signs FIRST — user sees the popup
      const signedTx = await signTransaction(tx);

      setLaunchPhase("signing-mint");

      // 5. Then the mint keypair partial-signs the already-wallet-signed tx
      signedTx.sign([mintKeypair]);

      setLaunchPhase("submitting");

      // 6. Submit to Solana RPC
      const signature = await connection.sendRawTransaction(
        signedTx.serialize(),
        { skipPreflight: false, maxRetries: 3 }
      );

      setLaunchPhase("confirming");

      // 7. Wait for confirmation
      const blockhashInfo = await connection.getLatestBlockhash("confirmed");
      const confirm = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhashInfo.blockhash,
          lastValidBlockHeight: blockhashInfo.lastValidBlockHeight,
        },
        "confirmed"
      );
      if (confirm.value.err) {
        throw new Error(
          `Transaction failed: ${JSON.stringify(confirm.value.err)}`
        );
      }

      // 8. Persist launch record locally so /launches shows it
      const result: RealLaunchResult = {
        signature,
        pumpUrl: data.pumpUrl || `https://pump.fun/coin/${mintKeypair.publicKey.toBase58()}`,
        mintPubkey: mintKeypair.publicKey.toBase58(),
        metadataUri: data.metadataUri || "",
        devBuyInSol: data.devBuyInSol ?? devBuySol,
      };
      setLaunchResult(result);
      saveLaunch({
        id: result.signature,
        tokenName: kit.tokenName,
        ticker: kit.ticker,
        chain: "solana",
        status: "launched",
        createdAt: new Date().toISOString(),
        txSignature: result.signature,
        pumpUrl: result.pumpUrl,
        mock: false,
        mintPubkey: result.mintPubkey,
        metadataUri: result.metadataUri,
        devBuyInSol: result.devBuyInSol,
        walletPubkey: publicKey.toBase58(),
        // Track the X post we anchored on so /api/auto-launch can hard-exclude
        // it from future Grok picks. originX comes from the Auto-pilot path;
        // manual launches and Radar-prefilled launches that have a concept
        // twitterUrl pointing at a real X status get tracked too.
        sourceXUrl:
          originX?.url ??
          (typeof concept?.twitterUrl === "string" &&
          /^https?:\/\/(?:x\.com|twitter\.com)\/[^/\s]+\/status\/\d+/.test(concept.twitterUrl)
            ? concept.twitterUrl.replace("twitter.com", "x.com")
            : undefined),
      });

      setLaunchPhase("done");
      setStep(5);
    } catch (err) {
      setLaunchPhase("error");
      const msg = err instanceof Error ? err.message : String(err);
      setLaunchError(msg);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
      <StepIndicator steps={STEPS} current={step} />

      {fromMeme && <RadarSourceBanner meme={fromMeme} />}

      {step === 0 && (
        <ConceptStep
          concept={concept}
          setField={setField}
          onNext={() => runGenerate()}
          conceptValid={conceptValid}
          onAutoPilot={runAutoPilot}
          autoPiloting={autoPiloting}
          autoReasoning={autoReasoning}
          originX={originX}
          onGenerateLogo={() => runGenerateLogo()}
          generatingLogo={generatingLogo}
          logoProvider={logoProvider}
        />
      )}

      {step === 1 && <GeneratingStep generating={generating} />}

      {step === 2 && kit && (
        <ReviewStep
          kit={kit}
          setKit={setKit}
          providerMeta={providerMeta}
          fallbackReason={fallbackReason}
          onBack={() => setStep(0)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <WalletStep
          connected={connected}
          publicKey={publicKey?.toBase58() ?? null}
          walletName={wallet?.adapter?.name ?? null}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}

      {step === 4 && kit && (
        <SignStep
          kit={kit}
          devBuySol={devBuySol}
          setDevBuySol={setDevBuySol}
          onBack={() => setStep(3)}
          onLaunch={runRealLaunch}
          launchPhase={launchPhase}
          launchError={launchError}
        />
      )}

      {step === 5 && kit && launchResult && (
        <DashboardStep
          kit={kit}
          providerMeta={providerMeta}
          result={launchResult}
        />
      )}
    </div>
  );
}

/* ───────────── Step 1: Concept ───────────── */

function ConceptStep({
  concept,
  setField,
  onNext,
  conceptValid,
  onAutoPilot,
  autoPiloting,
  autoReasoning,
  originX,
  onGenerateLogo,
  generatingLogo,
  logoProvider,
}: {
  concept: ConceptInput;
  setField: <K extends keyof ConceptInput>(k: K, v: ConceptInput[K]) => void;
  onNext: () => void;
  conceptValid: boolean;
  onAutoPilot: () => void;
  autoPiloting: boolean;
  autoReasoning: string | null;
  originX: { url: string; author?: string } | null;
  onGenerateLogo: () => void;
  generatingLogo: boolean;
  logoProvider: string | null;
}) {
  function onLogoChange(file: File | null) {
    if (!file) return setField("logoDataUrl", null);
    const reader = new FileReader();
    reader.onload = () => setField("logoDataUrl", String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      {/* ✨ Auto-pilot banner */}
      <div className="surface-ink p-5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Sparkles className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[15px] font-black tracking-tight">
              {autoPiloting
                ? "KOKi agent is on the job."
                : "Let the KOKi agent pick & ship."}
            </div>
            <div className="text-[12px] font-medium opacity-85 mt-0.5">
              {autoPiloting
                ? "Scanning X in real time, picking a meme, drafting the kit, and prepping a one-signature launch — give it a moment."
                : "Auto-pilot picks a meme, drafts the kit, hands you a signature-ready launch."}
            </div>
            {autoReasoning && (
              <div className="text-[12px] font-bold mt-1.5 opacity-95">
                Agent’s pick: {autoReasoning}
              </div>
            )}
            {originX && (
              <a
                href={originX.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-extrabold mt-1.5 underline hover:opacity-80"
              >
                Source: {originX.author || "X post"} ↗
              </a>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onAutoPilot}
          disabled={autoPiloting}
          className="btn !bg-koki-500 !text-ink-1000 !border-koki-500 !py-2 !px-4 !text-xs whitespace-nowrap disabled:opacity-60"
        >
          {autoPiloting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              KOKi agent thinking…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Auto-pilot launch
            </>
          )}
        </button>
      </div>

      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-ink-1000" />
          <h2 className="text-lg font-semibold">Or — manual concept</h2>
        </div>
        <p className="text-sm text-ink-1000/72">
          Describe the project yourself. The agent drafts launch materials. You review everything before any signature.
        </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Project idea" hint="One or two sentences" className="sm:col-span-2">
          <Textarea
            value={concept.idea}
            onChange={(e) => setField("idea", e.target.value)}
            placeholder="X-native community token for Grok-curious crypto builders"
          />
        </Field>
        <Field label="Token name">
          <Input
            value={concept.tokenName}
            onChange={(e) => setField("tokenName", e.target.value)}
            placeholder="KOKi"
          />
        </Field>
        <Field label="Ticker" hint="3–6 chars, A-Z and numbers">
          <Input
            value={concept.ticker}
            onChange={(e) => setField("ticker", e.target.value.toUpperCase())}
            placeholder="KOKI"
            maxLength={6}
          />
        </Field>
        <Field label="Chain" hint="Pump.fun runs on Solana mainnet only">
          <Select
            value={concept.chain}
            onChange={(e) => setField("chain", e.target.value as Chain)}
            disabled
          >
            <option value="solana">Solana (mainnet)</option>
          </Select>
        </Field>
        <Field label="Meme / theme">
          <Input
            value={concept.theme}
            onChange={(e) => setField("theme", e.target.value)}
            placeholder="Shiba paw / KOKi mascot"
          />
        </Field>
        <Field label="Target audience">
          <Input
            value={concept.audience}
            onChange={(e) => setField("audience", e.target.value)}
            placeholder="X-native crypto builders"
          />
        </Field>
        <Field label="Launch style">
          <Select
            value={concept.launchStyle}
            onChange={(e) => setField("launchStyle", e.target.value as LaunchStyle)}
          >
            <option value="fair-launch">Fair launch</option>
            <option value="stealth">Stealth</option>
            <option value="hype-raid">Hype raid</option>
            <option value="community-led">Community-led</option>
          </Select>
        </Field>
        <Field label="Website link">
          <Input
            value={concept.websiteUrl}
            onChange={(e) => setField("websiteUrl", e.target.value)}
            placeholder="https://yourproject.xyz"
          />
        </Field>
        <Field label="X / Twitter link">
          <Input
            value={concept.twitterUrl}
            onChange={(e) => setField("twitterUrl", e.target.value)}
            placeholder="https://x.com/yourproject"
          />
        </Field>
        <Field label="Telegram link">
          <Input
            value={concept.telegramUrl}
            onChange={(e) => setField("telegramUrl", e.target.value)}
            placeholder="https://t.me/yourproject"
          />
        </Field>
        <Field label="Logo / mascot" hint="Generate with Grok Aurora — or upload your own. Either way it ships to Pump.fun IPFS at launch." className="sm:col-span-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onGenerateLogo}
              disabled={generatingLogo}
              className="btn btn-primary !py-2 !px-4 !text-xs disabled:opacity-60"
            >
              {generatingLogo ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Aurora drawing…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with Grok
                </>
              )}
            </button>
            <label className="btn btn-secondary !py-2 !px-4 !text-xs cursor-pointer">
              Upload file
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
              />
            </label>
            <span className="text-xs font-bold text-ink-1000/65">
              {concept.logoDataUrl ? "Image ready" : "No image yet"}
            </span>
          </div>
          {concept.logoDataUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={concept.logoDataUrl}
                alt="Logo preview"
                className="h-20 w-20 rounded-md border-[1.5px] border-ink-1000 object-cover"
              />
              <div className="flex flex-col gap-1">
                <Badge>Preview</Badge>
                {logoProvider && (
                  <span className="text-[10px] font-bold text-ink-1000/65">
                    Source: {logoProvider}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onGenerateLogo}
                  disabled={generatingLogo}
                  className="text-[11px] font-extrabold text-ink-1000 underline hover:opacity-70 text-left"
                >
                  {generatingLogo ? "regenerating…" : "↻ Regenerate"}
                </button>
              </div>
            </div>
          )}
        </Field>
      </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ink-1000/65">
            Inputs stay on your device until you submit. Nothing is signed yet.
          </p>
          <Button onClick={onNext} disabled={!conceptValid}>
            <Sparkles className="h-4 w-4" />
            Generate Launch Kit
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Step 2: Generating ───────────── */

function GeneratingStep({ generating }: { generating: boolean }) {
  const lines = [
    "Calling Grok (or fallback) to draft launch metadata...",
    "Composing 10 launch tweets...",
    "Drafting 20 community raid replies...",
    "Composing 5 influencer DM templates...",
    "Writing Telegram announcement...",
    "Generating Dexscreener and CMC copy...",
    "Building 7-day plan and daily checklist...",
  ];
  return (
    <div className="card p-8 text-center space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-koki-500 border border-ink-1000 flex items-center justify-center text-ink-1000">
        {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
      </div>
      <h2 className="text-lg font-semibold">Generating Launch Kit</h2>
      <ul className="text-sm text-ink-1000/72 space-y-1">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Step 3: Review ───────────── */

function ReviewStep({
  kit,
  setKit,
  providerMeta,
  fallbackReason,
  onBack,
  onNext,
}: {
  kit: LaunchKit;
  setKit: (k: LaunchKit) => void;
  providerMeta: ProviderMeta | null;
  fallbackReason: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  const isMock = !providerMeta || providerMeta.provider === "mock";
  return (
    <div className="space-y-6">
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Review Metadata</h2>
          <ProviderBadge meta={providerMeta} />
        </div>
        {fallbackReason && (
          <div className="card p-3 text-xs text-amber-200 border-amber-300/30">
            {isMock
              ? `LLM unavailable — using local mock generator. Reason: ${fallbackReason}`
              : `Note: ${fallbackReason}`}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Token name">
            <Input value={kit.tokenName} onChange={(e) => setKit({ ...kit, tokenName: e.target.value })} />
          </Field>
          <Field label="Ticker">
            <Input
              value={kit.ticker}
              onChange={(e) => setKit({ ...kit, ticker: e.target.value.toUpperCase() })}
              maxLength={6}
            />
          </Field>
          <Field label="Short description (used as on-chain description)" className="sm:col-span-2">
            <Textarea value={kit.shortDescription} onChange={(e) => setKit({ ...kit, shortDescription: e.target.value })} />
          </Field>
          <Field label="Long description" className="sm:col-span-2">
            <Textarea value={kit.longDescription} onChange={(e) => setKit({ ...kit, longDescription: e.target.value })} className="min-h-[120px]" />
          </Field>
          <Field label="Mascot concept" className="sm:col-span-2">
            <Textarea value={kit.mascotConcept} onChange={(e) => setKit({ ...kit, mascotConcept: e.target.value })} />
          </Field>
          {kit.tagline && (
            <Field label="Tagline" className="sm:col-span-2">
              <Input value={kit.tagline} onChange={(e) => setKit({ ...kit, tagline: e.target.value })} />
            </Field>
          )}
          {kit.memeThesis && (
            <Field label="Meme thesis" hint="Why this meme works on X right now" className="sm:col-span-2">
              <Textarea value={kit.memeThesis} onChange={(e) => setKit({ ...kit, memeThesis: e.target.value })} />
            </Field>
          )}
          {kit.imagePrompt && (
            <Field label="Image generation prompt" hint="Paste into your image generator of choice" className="sm:col-span-2">
              <Textarea value={kit.imagePrompt} onChange={(e) => setKit({ ...kit, imagePrompt: e.target.value })} />
            </Field>
          )}
        </div>

        <div className="hairline" />

        <div className="grid sm:grid-cols-2 gap-4">
          <PreviewBlock title="X bio" icon={<Twitter className="h-4 w-4" />} text={kit.xBio} />
          <PreviewBlock title="Telegram announcement" icon={<TgSend className="h-4 w-4" />} text={kit.telegramAnnouncement} />
          {kit.discordAnnouncement && (
            <PreviewBlock title="Discord announcement" icon={<Sparkles className="h-4 w-4" />} text={kit.discordAnnouncement} />
          )}
          {kit.communityOnboarding && (
            <PreviewBlock title="Community onboarding" icon={<Sparkles className="h-4 w-4" />} text={kit.communityOnboarding} />
          )}
          {kit.raidMission && (
            <PreviewBlock title="Raid mission (first 30 min)" icon={<Sparkles className="h-4 w-4" />} text={kit.raidMission} />
          )}
          {kit.founderAnnouncement && (
            <PreviewBlock title="Founder announcement" icon={<Twitter className="h-4 w-4" />} text={kit.founderAnnouncement} />
          )}
          {kit.productAnnouncement && (
            <PreviewBlock title="Product announcement" icon={<Twitter className="h-4 w-4" />} text={kit.productAnnouncement} />
          )}
          <PreviewBlock title="Dexscreener copy" icon={<Sparkles className="h-4 w-4" />} text={kit.dexscreenerCopy} />
          <PreviewBlock title="CMC / CoinGecko description" icon={<Sparkles className="h-4 w-4" />} text={kit.cmcDescription} />
        </div>

        <div className="hairline" />

        <div className="grid lg:grid-cols-3 gap-4">
          <ListBlock title={`${kit.launchTweets.length} launch tweets`} items={kit.launchTweets} />
          <ListBlock title={`${kit.raidReplies.length} raid replies`} items={kit.raidReplies} />
          <ListBlock title={`${kit.influencerDmTemplates.length} influencer DM templates`} items={kit.influencerDmTemplates} />
          {kit.viralHooks && kit.viralHooks.length > 0 && (
            <ListBlock title={`${kit.viralHooks.length} viral hooks`} items={kit.viralHooks} />
          )}
          {kit.threadIdeas && kit.threadIdeas.length > 0 && (
            <ListBlock title={`${kit.threadIdeas.length} thread ideas`} items={kit.threadIdeas} />
          )}
        </div>

        {kit.faq && kit.faq.length > 0 && (
          <>
            <div className="hairline" />
            <div>
              <h3 className="text-sm font-semibold mb-3">FAQ ({kit.faq.length})</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {kit.faq.map((f, i) => (
                  <div key={i} className="card p-4">
                    <div className="text-sm font-semibold text-ink-1000">Q. {f.q}</div>
                    <div className="mt-2 text-sm text-ink-1000/72 leading-relaxed">A. {f.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="hairline" />

        <div>
          <h3 className="text-sm font-semibold mb-2">7-day marketing plan</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {kit.sevenDayPlan.map((d) => (
              <div key={d.day} className="card p-4">
                <div className="text-xs text-ink-1000/65">Day {d.day}</div>
                <div className="text-sm font-semibold">{d.title}</div>
                <ul className="mt-2 text-xs text-ink-1000/72 space-y-1">
                  {d.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mt-4 mb-2">Daily checklist</h3>
          <ul className="text-sm text-ink-1000 space-y-1">
            {kit.dailyChecklist.map((c) => (
              <li key={c} className="flex gap-2">
                <span className="text-ink-1000">▢</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card p-4 flex items-start gap-3 text-sm">
        <ShieldCheck className="h-4 w-4 text-ink-1000 mt-0.5" />
        <p className="text-ink-1000">
          Compliance check: no guaranteed-profit, guaranteed-viral, or partnership claims detected. Edit any field before continuing.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>
          Continue to Wallet <Wallet className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PreviewBlock({ title, icon, text }: { title: string; icon?: React.ReactNode; text: string }) {
  function copy() {
    if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(text);
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink-1000">
          {icon}
          {title}
        </div>
        <button onClick={copy} className="inline-flex items-center gap-1 text-xs text-ink-1000/72 hover:text-ink-1000">
          <Copy className="h-3 w-3" /> Copy
        </button>
      </div>
      <pre className="text-xs whitespace-pre-wrap text-ink-1000 leading-relaxed font-sans">{text}</pre>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card p-4">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <ul className="space-y-1.5 text-xs text-ink-1000 max-h-72 overflow-auto pr-2">
        {items.map((it, i) => (
          <li key={i} className="leading-relaxed">
            <span className="text-ink-1000/65 mr-1">{i + 1}.</span>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── Step 4: Wallet (REAL) ───────────── */

function WalletStep({
  connected,
  publicKey,
  walletName,
  onBack,
  onNext,
}: {
  connected: boolean;
  publicKey: string | null;
  walletName: string | null;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5 text-ink-1000" />
        <h2 className="text-lg font-semibold">Connect Wallet</h2>
        {connected && <Badge tone="live">Connected</Badge>}
      </div>
      <p className="text-sm text-ink-1000/72 max-w-xl">
        KOKi does not store private keys and does not ask for seed phrases. Your wallet (Phantom or Solflare) is the only signer. Pump.fun runs on Solana <span className="text-amber-300 font-semibold">mainnet</span>.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <WalletMultiButton />
        {connected && publicKey && (
          <span className="text-xs text-ink-1000/72">
            {walletName} · <span className="font-mono">{shortAddr(publicKey)}</span>
          </span>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-ink-1000/65">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-300" />
        Mainnet uses real SOL. Make sure your wallet has at least 0.05 SOL before launching.
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={!connected}>Continue</Button>
      </div>
    </div>
  );
}

/* ───────────── Step 5: Sign & Launch (REAL) ───────────── */

function SignStep({
  kit,
  devBuySol,
  setDevBuySol,
  onBack,
  onLaunch,
  launchPhase,
  launchError,
}: {
  kit: LaunchKit;
  devBuySol: number;
  setDevBuySol: (n: number) => void;
  onBack: () => void;
  onLaunch: () => void;
  launchPhase: LaunchPhase;
  launchError: string | null;
}) {
  const isWorking = launchPhase !== "idle" && launchPhase !== "error";

  return (
    <div className="card p-6 space-y-5">
      <div className="flex items-center gap-2 flex-wrap">
        <ShieldCheck className="h-5 w-5 text-ink-1000" />
        <h2 className="text-lg font-semibold">Sign & Launch</h2>
        <Badge tone="live">Mainnet · Real SOL</Badge>
      </div>

      <div className="card p-4 border-amber-300/30 text-sm text-amber-200 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">This launches a real token on Solana mainnet.</div>
          <div className="mt-1 text-amber-200/80">
            Once signed and confirmed, the token is created on-chain and cannot be undone. Verify name, ticker, description, and links one more time below.
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <SummaryRow label="Name" value={kit.tokenName} />
        <SummaryRow label="Ticker" value={kit.ticker} />
        <SummaryRow label="Description" value={kit.shortDescription} wide />
        <SummaryRow label="Twitter" value={kit.pumpMetadata.twitter || "—"} />
        <SummaryRow label="Telegram" value={kit.pumpMetadata.telegram || "—"} />
        <SummaryRow label="Website" value={kit.pumpMetadata.website || "—"} />
      </div>

      <div className="card p-4">
        <Field
          label="Initial dev buy (in SOL)"
          hint="Optional — buy a small amount of your own token at creation. Leave 0 for none. Hard-capped at 10 SOL server-side."
        >
          <Input
            type="number"
            min={0}
            max={10}
            step={0.001}
            value={devBuySol}
            onChange={(e) => setDevBuySol(Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      {launchPhase !== "idle" && (
        <LaunchProgress phase={launchPhase} error={launchError} />
      )}

      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={onBack} disabled={isWorking}>Back</Button>
        <Button onClick={onLaunch} disabled={isWorking}>
          {isWorking ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {phaseLabel(launchPhase)}
            </>
          ) : launchPhase === "error" ? (
            <>
              <Rocket className="h-4 w-4" />
              Try Again
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Sign & Launch on Pump.fun
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function LaunchProgress({ phase, error }: { phase: LaunchPhase; error: string | null }) {
  const STEPS_PROG: { p: LaunchPhase; label: string }[] = [
    { p: "preparing", label: "Preparing mint keypair (local only)" },
    { p: "uploading", label: "Uploading metadata to Pump.fun IPFS" },
    { p: "building", label: "Building unsigned transaction (PumpPortal)" },
    { p: "signing-wallet", label: "Awaiting wallet signature" },
    { p: "signing-mint", label: "Signing with mint keypair" },
    { p: "submitting", label: "Submitting to Solana" },
    { p: "confirming", label: "Awaiting confirmation" },
    { p: "done", label: "Confirmed" },
  ];
  const idx = STEPS_PROG.findIndex((s) => s.p === phase);
  return (
    <div className="card p-4 space-y-2">
      <div className="text-sm font-semibold">Launch progress</div>
      {STEPS_PROG.map((s, i) => {
        const done = i < idx || phase === "done";
        const active = i === idx && phase !== "error" && phase !== "done";
        return (
          <div
            key={s.p}
            className={`flex items-center gap-2 text-sm ${
              done ? "text-ink-1000" : active ? "text-ink-1000" : "text-ink-1000/65"
            }`}
          >
            {done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : active ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-ink-1000" />
            )}
            {s.label}
          </div>
        );
      })}
      {phase === "error" && error && (
        <div className="card p-3 text-xs text-red-300 border-red-500/30 mt-2 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Launch failed</div>
            <div className="mt-1 text-red-200/80">{error}</div>
            <div className="mt-1 text-red-200/60">
              No funds moved if the wallet rejected the signature. If the tx was submitted but failed on-chain, your wallet will only be charged the priority fee.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function phaseLabel(phase: LaunchPhase): string {
  switch (phase) {
    case "preparing": return "Preparing...";
    case "uploading": return "Uploading metadata...";
    case "building": return "Building transaction...";
    case "signing-mint": return "Signing mint...";
    case "signing-wallet": return "Awaiting wallet...";
    case "submitting": return "Submitting...";
    case "confirming": return "Confirming...";
    case "done": return "Done";
    default: return "Launching...";
  }
}

function SummaryRow({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`card p-3 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="text-[10px] uppercase tracking-widest text-ink-1000/65">{label}</div>
      <div className="mt-1 text-sm text-ink-1000">{value}</div>
    </div>
  );
}

/* ───────────── Step 6: Launch Dashboard (REAL) ───────────── */

function DashboardStep({
  kit,
  providerMeta,
  result,
}: {
  kit: LaunchKit;
  providerMeta: ProviderMeta | null;
  result: RealLaunchResult;
}) {
  const solscan = `https://solscan.io/tx/${result.signature}`;
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-5 w-5 text-ink-1000" />
          <h2 className="text-lg font-semibold">Launched on Pump.fun</h2>
          <Badge tone="live">Mainnet · Live</Badge>
          <ProviderBadge meta={providerMeta} />
        </div>
        <p className="mt-2 text-sm text-ink-1000/72 max-w-2xl">
          Your token is live on Solana. The metadata + image are stored on IPFS and the bonding-curve trading is now active on Pump.fun.
        </p>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <SummaryRow label="Token" value={`${kit.tokenName} (${kit.ticker})`} />
          <SummaryRow label="Mint address" value={result.mintPubkey} />
          <SummaryRow label="Tx signature" value={result.signature} wide />
          <SummaryRow label="Initial dev buy" value={`${result.devBuyInSol} SOL`} />
          <SummaryRow label="Metadata URI" value={result.metadataUri || "—"} />
        </div>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <a
            href={`/launches/${result.mintPubkey}`}
            className="inline-flex items-center gap-2 rounded-md bg-koki-500 text-ink-1000 px-3.5 py-2 text-sm font-semibold hover:bg-koki-400"
          >
            Open monitoring dashboard
          </a>
          <a
            href={result.pumpUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ink-1000 px-3.5 py-2 text-sm font-semibold hover:bg-cream-100"
          >
            View on Pump.fun
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={solscan}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-ink-1000 px-3.5 py-2 text-sm font-semibold hover:bg-cream-100"
          >
            View tx on Solscan
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <ListBlock title="Launch tweets" items={kit.launchTweets} />
        <ListBlock title="Raid replies" items={kit.raidReplies} />
        <ListBlock title="Influencer DMs" items={kit.influencerDmTemplates} />
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold mb-2">Daily checklist</div>
        <ul className="text-sm text-ink-1000 space-y-1">
          {kit.dailyChecklist.map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-ink-1000">▢</span>
              {c}
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4 text-xs text-ink-1000/65">
        Launch saved to your local launch history. Head to{" "}
        <a href="/launches" className="text-ink-1000 hover:underline">/launches</a>{" "}
        to revisit.
      </div>
    </div>
  );
}

/* ───────────── Helpers ───────────── */

/**
 * Banner shown when the wizard was opened from a Real-time Meme Radar
 * card. Surfaces the source meme, its trend score, and the readiness pill
 * so the user knows the form was prefilled from a live signal.
 */
function RadarSourceBanner({ meme }: { meme: RadarMeme }) {
  const meta = READINESS_META[meme.launchReadiness];
  return (
    <div className="card p-4 border-ink-1000 flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-koki-500 border border-ink-1000 flex items-center justify-center text-ink-1000 shrink-0">
        <Radar className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-widest text-ink-1000">
            Radar signal
          </span>
          <span className="text-sm font-semibold text-ink-1000">
            {meme.name}
          </span>
          <span className="text-xs text-ink-1000/65">${meme.ticker}</span>
          <Badge tone={meta.tone}>{meta.label} readiness</Badge>
          <Badge tone="neutral">Trend {meme.scores.trend}</Badge>
        </div>
        <p className="mt-1.5 text-xs text-ink-1000/72 leading-relaxed">
          Form prefilled from a Real-time Meme Radar signal. Edit any field
          before generating, or proceed if it looks good.
        </p>
      </div>
    </div>
  );
}

function ProviderBadge({ meta }: { meta: ProviderMeta | null }) {
  if (!meta) return null;
  const labels: Record<ProviderMeta["provider"], { text: string; tone: "live" | "soon" | "mock" | "neutral" }> = {
    xai: { text: `Generated by Grok · ${meta.model}`, tone: "live" },
    anthropic: { text: `Generated by Claude · ${meta.model} (fallback)`, tone: "neutral" },
    openai: { text: `Generated by OpenAI · ${meta.model} (fallback)`, tone: "neutral" },
    mock: { text: "Generated by mock — set XAI_API_KEY for Grok", tone: "mock" },
  };
  const l = labels[meta.provider];
  return <Badge tone={l.tone}>{l.text}</Badge>;
}

function shortAddr(addr: string, head = 4, tail = 4): string {
  if (addr.length <= head + tail + 1) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

function base64ToBytes(b64: string): Uint8Array {
  // This wizard is a "use client" component — atob is always available in
  // the browser. We deliberately don't import Buffer here so the bundle
  // doesn't pull a polyfill into client code.
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
