import type { Msg } from "./types";
import type { RadarMeme } from "@/lib/memeRadar";

// ─────────────────────────────────────────────────────────────────────────
// Phase 2 — Analyze
//
// Given a detected meme signal, ask Grok to score launch readiness and
// produce a tight intelligence brief. The output drives the /analyze page
// before the user enters the Generate flow.
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Analyze step of the KOKi Grok-native Meme Coin Launch Agent.

Job: assess whether a detected meme is a viable memecoin launch opportunity, score launch readiness, and explain why concisely.

Hard rules (NEVER violate):
1. NEVER claim guaranteed profit, guaranteed pump, guaranteed listing.
2. NEVER recommend market manipulation tactics.
3. NEVER make legal or financial advice.
4. ALWAYS surface real risks honestly.
5. If the meme is weak, say so. "Avoid" is a valid output.

Voice: X-native, builder-honest, scannable.`;

export function buildMemeAnalysisMessages(meme: RadarMeme): Msg[] {
  const userPrompt = `Analyze this detected meme as a memecoin launch opportunity. Output strict JSON matching the schema:

{
  "launchReadiness": "High" | "Medium" | "Watch" | "Avoid",
  "summary": string,                     // 2-3 sentence honest take, under 320 chars
  "whyItHasPotential": string[],         // 3-5 short bullets, on-chain or X-native facts
  "keyRisks": string[],                  // 3-5 short bullets, real risks
  "bestLaunchAngle": string,             // 1-2 sentences — the strongest angle to lead with
  "recommendedAudience": string,         // 1 sentence — sharper version of inputs
  "recommendedTiming": string,           // 1 sentence — when to launch and why
  "criteria": {                          // each 0-100, used to compute readiness
    "viralPotential": number,
    "memeClarity": number,
    "xEngagementPotential": number,
    "communityFit": number,
    "tickerStrength": number,
    "narrativeStrength": number,
    "onchainRelevance": number,
    "launchTiming": number,
    "saturationRisk": number,
    "brandLegalRisk": number
  }
}

# Detected meme
- Name: ${meme.name}
- Ticker (suggested): ${meme.ticker}
- Description: ${meme.shortDescription}
- Theme: ${meme.concept.theme}
- Audience: ${meme.concept.audience}
- Source: ${meme.source}
- Sample post count: ${meme.sampleTweetCount}
- Existing radar scores: trend=${meme.scores.trend}, X attention=${meme.scores.xAttention}, community=${meme.scores.communityMomentum}, on-chain=${meme.scores.onchainRelevance}, timing=${meme.scores.launchTiming}, fit=${meme.scores.memeCoinFit}

Return ONLY the JSON.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}
