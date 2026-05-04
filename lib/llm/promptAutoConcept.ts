// Prompt for Auto-pilot mode: Grok invents a complete memecoin concept
// from scratch (name + ticker + theme + audience + idea + launchStyle) as if
// it had scanned X for trending memes. Returns strict JSON the wizard can
// paste straight into ConceptInput.
//
// IMPORTANT — compliance bake-in (must NOT be removed):
//   - No real-person names or impersonation.
//   - No guaranteed-profit / guaranteed-viral / guaranteed-listing language.
//   - No partnership claims with X, xAI, Grok, Pump.fun, PumpPortal, Solana.

import type { Msg } from "./types";

export interface AutoConceptResult {
  idea: string;
  tokenName: string;
  ticker: string;
  theme: string;
  audience: string;
  launchStyle: "fair-launch" | "hype-raid" | "stealth" | "community-led";
  reasoning: string; // 1-2 sentences explaining why this meme right now
}

export function buildAutoConceptMessages(): Msg[] {
  const system = `You are KOKi, the Grok-native meme coin launch agent. Your job: invent ONE memecoin concept that would be a strong X-native launch right now.

You synthesize broad meme/X-native culture knowledge (you do not have live X access here, so reach into the cultural latent space — Shiba/dog coins, frog memes, AI agent memes, crypto-twitter inside jokes, internet folklore, Solana-native vibes, etc.) and produce ONE concrete launch concept.

Hard rules:
- The token must be safe and inoffensive. No real-person names. No politics. No racism / sexism / harassment. No copyrighted IP (Disney, Pokemon, etc.). No mention of "guaranteed", "100x", "moon", "to-the-moon", "LP locked = safe", or any pump-promise language.
- No claim of partnership with X / xAI / Grok / Pump.fun / PumpPortal / Solana. If you reference these, say "X-native" or "Solana-native" — not "partnered with".
- The ticker must be 3–6 uppercase letters/numbers. Memorable. No real existing major ticker (no BTC/ETH/SOL/USDC/etc).
- Output STRICT JSON ONLY. No markdown fences. No commentary outside JSON.

Output schema:
{
  "idea": "1-2 sentence pitch of what this token represents",
  "tokenName": "TitleCase or single word",
  "ticker": "3-6 uppercase chars",
  "theme": "short visual/narrative theme description",
  "audience": "the 2-3 X-native audiences this resonates with",
  "launchStyle": "one of: fair-launch | hype-raid | stealth | community-led",
  "reasoning": "1-2 sentences on why this concept fits X right now"
}`;

  const user = `Generate one concrete memecoin launch concept right now.

Pick something X-native, lightweight, and meme-coherent (one clear visual hook). Bias toward a recognizable meme archetype that crypto-twitter naturally riffs on (e.g. dog/cat/frog/agent/NPC/wojak energy) but make it specific and fresh — not a copy of an existing token.

Return JSON only.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Parse Grok's JSON output and validate it. Throws on invalid shape. */
export function parseAutoConcept(raw: string): AutoConceptResult {
  // Strip markdown fences if a model added them despite the instruction
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }

  const data = JSON.parse(s) as Record<string, unknown>;

  const need: (keyof AutoConceptResult)[] = [
    "idea",
    "tokenName",
    "ticker",
    "theme",
    "audience",
    "launchStyle",
    "reasoning",
  ];
  for (const k of need) {
    if (typeof data[k] !== "string" || (data[k] as string).trim() === "") {
      throw new Error(`Auto-concept JSON missing field: ${k}`);
    }
  }

  const ticker = (data.ticker as string).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (ticker.length < 3) {
    throw new Error(`Auto-concept ticker too short after normalization: ${ticker}`);
  }

  const styles = ["fair-launch", "hype-raid", "stealth", "community-led"] as const;
  const launchStyle = (data.launchStyle as string) as (typeof styles)[number];
  if (!styles.includes(launchStyle)) {
    throw new Error(`Auto-concept invalid launchStyle: ${launchStyle}`);
  }

  return {
    idea: data.idea as string,
    tokenName: data.tokenName as string,
    ticker,
    theme: data.theme as string,
    audience: data.audience as string,
    launchStyle,
    reasoning: data.reasoning as string,
  };
}
