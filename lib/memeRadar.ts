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
// when the user clicks "Generate Launch Kit" or "Launch with X CLAW".
// ─────────────────────────────────────────────────────────────────────────

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

// Real-time radar feed. Empty until the X API + Grok trend search + on-chain
// indexer pipeline is wired in via /api/meme-radar. The UI shows a clean
// "Real-time trends are connecting" empty state when this is [].
//
// To re-enable a curated demo feed for marketing screenshots, drop a few
// RadarMeme entries back here — but the live product should ship empty so
// nothing on screen pretends to be a real trend it isn't.
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
