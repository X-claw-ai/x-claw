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
// when the user clicks "Generate Launch Kit" or "Launch with KOKi".
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

const NOW = new Date().toISOString();

export const RADAR_MEMES: RadarMeme[] = [
  {
    id: "shibatoshi",
    name: "Shibatoshi",
    ticker: "SHIBATOSHI",
    shortDescription:
      "Shiba meets Satoshi — dog-coin nostalgia fused with Bitcoin maxi imagery, climbing X timelines.",
    scores: {
      trend: 94,
      xAttention: 96,
      communityMomentum: 91,
      memeCoinFit: 95,
      onchainRelevance: 88,
      launchTiming: 92,
    },
    launchReadiness: "high",
    concept: {
      idea:
        "Shibatoshi — Shiba + Satoshi meme narrative blending dog-coin OG energy with Bitcoin maxi imagery on X.",
      tokenName: "Shibatoshi",
      ticker: "SHIBATOSHI",
      chain: "solana",
      theme: "Shiba + Satoshi mythos · neon Bitcoin overlays · dog-coin OG aesthetics",
      audience: "Dog-coin OGs, Bitcoin maxis, X-native meme traders",
      launchStyle: "fair-launch",
    },
    source: "X · last 24h",
    detectedAt: NOW,
    sampleTweetCount: 2840,
  },
  {
    id: "grok-cat",
    name: "Grok Cat",
    ticker: "GROKCAT",
    shortDescription:
      "AI-cat archetype climbing X timelines. Grok-native energy, cat memes for the AI era.",
    scores: {
      trend: 88,
      xAttention: 92,
      communityMomentum: 85,
      memeCoinFit: 90,
      onchainRelevance: 81,
      launchTiming: 84,
    },
    launchReadiness: "medium",
    concept: {
      idea:
        "Grok Cat — an AI cat meme born on X, riding the Grok-native AI cat archetype.",
      tokenName: "Grok Cat",
      ticker: "GROKCAT",
      chain: "solana",
      theme: "AI cat character · cyber/grok aesthetics · neon-on-dark",
      audience: "AI-curious crypto natives, Grok power users, cat-meme traders",
      launchStyle: "hype-raid",
    },
    source: "X · last 24h",
    detectedAt: NOW,
    sampleTweetCount: 1420,
  },
  {
    id: "based-frog",
    name: "Based Frog",
    ticker: "BFROG",
    shortDescription:
      "Classic frog meme reborn for the on-chain culture wars on X.",
    scores: {
      trend: 82,
      xAttention: 84,
      communityMomentum: 86,
      memeCoinFit: 88,
      onchainRelevance: 80,
      launchTiming: 78,
    },
    launchReadiness: "medium",
    concept: {
      idea:
        "Based Frog — the classic frog meme reborn for on-chain culture wars on X.",
      tokenName: "Based Frog",
      ticker: "BFROG",
      chain: "solana",
      theme: "Classic frog meme reframed · on-chain culture overlay",
      audience: "Frog meme veterans, on-chain culture posters, /biz/-crypto crossover",
      launchStyle: "community-led",
    },
    source: "X · last 24h",
    detectedAt: NOW,
    sampleTweetCount: 980,
  },
  {
    id: "npc-whale",
    name: "NPC Whale",
    ticker: "NPCWHALE",
    shortDescription:
      "Whale-watching culture collides with the NPC meme. Early signal, watch closely.",
    scores: {
      trend: 79,
      xAttention: 81,
      communityMomentum: 76,
      memeCoinFit: 84,
      onchainRelevance: 83,
      launchTiming: 70,
    },
    launchReadiness: "watch",
    concept: {
      idea:
        "NPC Whale — whale-watching culture collides with NPC meme satire on X.",
      tokenName: "NPC Whale",
      ticker: "NPCWHALE",
      chain: "solana",
      theme: "Whale + NPC satire · pixel-art overlay · whale-alerts inspired",
      audience: "On-chain whale-watchers, NPC meme posters, alert-bot subscribers",
      launchStyle: "stealth",
    },
    source: "X · last 24h",
    detectedAt: NOW,
    sampleTweetCount: 540,
  },
];

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
