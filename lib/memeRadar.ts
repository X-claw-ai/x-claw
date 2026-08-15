// ─────────────────────────────────────────────────────────────────────────
// Real-time Meme Radar — data layer
//
// Today: hand-curated mock memes so the UI can be demoed without external
// keys. The shape is designed so a real signal pipeline can drop in later
// (X API search, Grok/xAI live trends, social listening APIs, on-chain
// indexers) without changing the radar UI or wizard prefill.
//
// Each radar meme carries a `concept` block that maps cleanly onto the
// existing PumpLaunchWizard `ConceptInput`. This is what gets prefilled
// when the user clicks "Generate Launch Kit" or "Launch with HAMR".
// ─────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { ConceptInput, LaunchStyle } from "./types";

export type LaunchReadiness = "high" | "medium" | "watch";

export interface MemeScores {
  /** Overall trend score (0-100). The headline number on the card. */
  trend: number;
  /** Volume of mentions / impressions on X. */
  xAttention: number;
  /** Replies, RT-graph, off-X TG/Discord chatter. */
  communityMomentum: number;
  /** Likelihood of crypto-native trader fit. */
  memeCoinFit: number;
  /** On-chain references, related token activity, wallet chatter. */
  onchainRelevance: number;
  /** Pre/post-peak timing — higher = launch window is now. */
  launchTiming: number;
}

export interface RadarMeme {
  id: string;
  name: string;
  ticker: string;
  shortDescription: string;
  scores: MemeScores;
  launchReadiness: LaunchReadiness;
  /** Concept block ready to prefill the launch wizard. */
  concept: Omit<ConceptInput, "websiteUrl" | "twitterUrl" | "telegramUrl" | "logoDataUrl"> & {
    launchStyle: LaunchStyle;
  };
  /** Display-only context (mocked today, real signals later). */
  source: string;
  detectedAt: string; // ISO
  sampleTweetCount: number;
}

// Real-time radar feed.
//
// Today: hand-curated MOCK data (4 memes) so the full Detect → Analyze
// flow is demoable. Each card carries a clear "MOCK" badge in the UI and
// the dashboard explains the live-data pipeline status.
//
// REAL INTEGRATION (later, swap RADAR_MEMES with a live fetch):
//   - xAI / Grok API trends
//   - X API v2 recent search + trends
//   - Trending keyword APIs
//   - Social listening (Discord, TG)
//   - On-chain indexers (Helius / Birdeye)
//
// The /api/meme-radar route is the seam — it returns RADAR_MEMES today
// and a real merged feed later, no UI changes needed.

// Empty by default — the radar shows an empty state until the live signal
// pipeline (X API · Grok trends · on-chain indexers) is wired in. The 4-meme
// hand-curated MOCK is preserved in the git history; flip the array back on
// for demos.
export const RADAR_MEMES: RadarMeme[] = [];

export function getRadarMeme(id: string): RadarMeme | undefined {
  return RADAR_MEMES.find((m) => m.id === id);
}

export type ReadinessTone = "live" | "neutral" | "soon" | "mock";

export const READINESS_META: Record<
  LaunchReadiness,
  { label: string; tone: ReadinessTone; description: string }
> = {
  high: {
    label: "High",
    tone: "live",
    description: "Launch window is now. Top quartile across all signals.",
  },
  medium: {
    label: "Medium",
    tone: "neutral",
    description: "Strong but not peaked. Worth a fast first move.",
  },
  watch: {
    label: "Watch",
    tone: "soon",
    description: "Early signal. Track first; wait for momentum to confirm.",
  },
};
