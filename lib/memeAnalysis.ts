import type { RadarMeme } from "./memeRadar";

// Shared analysis result shape — produced by /api/meme-analyze.
export interface MemeAnalysis {
  launchReadiness: "High" | "Medium" | "Watch" | "Avoid";
  summary: string;
  whyItHasPotential: string[];
  keyRisks: string[];
  bestLaunchAngle: string;
  recommendedAudience: string;
  recommendedTiming: string;
  criteria: {
    viralPotential: number;
    memeClarity: number;
    xEngagementPotential: number;
    communityFit: number;
    tickerStrength: number;
    narrativeStrength: number;
    onchainRelevance: number;
    launchTiming: number;
    saturationRisk: number;
    brandLegalRisk: number;
  };
}

// Deterministic local stub — used when no LLM provider is configured.
// Ensures /analyze always renders something demoable.
export function localStubAnalysis(meme: RadarMeme): MemeAnalysis {
  const readinessMap: Record<string, MemeAnalysis["launchReadiness"]> = {
    high: "High",
    medium: "Medium",
    watch: "Watch",
  };
  const readiness = readinessMap[meme.launchReadiness] ?? "Watch";
  return {
    launchReadiness: readiness,
    summary: `${meme.name} is a ${readiness.toLowerCase()}-readiness signal: a ${meme.shortDescription.toLowerCase()} The meme reads cleanly and has crypto-native pull, with risk concentrated in saturation and timing.`,
    whyItHasPotential: [
      `Trend score ${meme.scores.trend}/100 across X (last 24h, ${meme.sampleTweetCount.toLocaleString()} sample posts).`,
      `Audience overlap with X-native crypto traders is high — ${meme.concept.audience}.`,
      `Theme is concrete: ${meme.concept.theme}.`,
      `Ticker $${meme.ticker} is short, memorable, and chain-friendly.`,
    ],
    keyRisks: [
      "Saturation: similar memes may be launched concurrently. Speed matters.",
      "Brand-adjacent imagery — keep visuals original to avoid takedowns.",
      "Liquidity decay if community engagement isn't activated within 24h.",
      "On-chain copycats may front-run the launch ticker.",
    ],
    bestLaunchAngle: `Lead with the ${meme.concept.theme.split("·")[0].trim()} angle — that's the highest-resonance hook in the current X conversation.`,
    recommendedAudience: meme.concept.audience,
    recommendedTiming:
      "Launch within 24–48 hours of trend peak. Coordinate community raid in the first 30 minutes.",
    criteria: {
      viralPotential: meme.scores.trend,
      memeClarity: 78,
      xEngagementPotential: meme.scores.xAttention,
      communityFit: meme.scores.communityMomentum,
      tickerStrength: meme.ticker.length <= 6 ? 88 : 65,
      narrativeStrength: 80,
      onchainRelevance: meme.scores.onchainRelevance,
      launchTiming: meme.scores.launchTiming,
      saturationRisk: 100 - meme.scores.trend, // higher trend = more competition
      brandLegalRisk: 25,
    },
  };
}

export const READINESS_TONES: Record<
  MemeAnalysis["launchReadiness"],
  "live" | "info" | "soon" | "danger"
> = {
  High: "live",
  Medium: "info",
  Watch: "soon",
  Avoid: "danger",
};
