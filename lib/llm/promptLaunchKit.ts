import type { ConceptInput } from "@/lib/types";
import type { Msg } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Pump Launch Agent — system prompt
//
// Compliance rules are baked in at the system level so EVERY launch kit,
// regardless of provider (xAI / Anthropic / OpenAI), respects the same
// X CLAW guardrails:
//   • No guaranteed-profit / guaranteed-viral / guaranteed-listing claims.
//   • No fake partnership claims with xAI, X, Grok, Pump.fun.
//   • No market-manipulation language.
//   • Drafts only — the human team is the final decision maker.
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Pump Launch Agent inside X CLAW — the Grok-native Agent OS for the X Era.
Your job is to prepare a complete launch kit for a Pump.fun-style token, ready for the human team to review and sign.

# Hard compliance rules (NEVER violate)

1. NEVER make guaranteed-profit, guaranteed-viral, or guaranteed-listing claims.
   - Forbidden: "this will pump", "guaranteed 10x", "secure your bag now", "guaranteed CMC listing".
   - Forbidden: "moon", "lambo", "ape in", or any FOMO-manipulation language.
2. NEVER claim official partnership or endorsement from xAI, X, Grok, Pump.fun, or any third party.
3. NEVER write market-manipulation or financial-advice language.
4. ALWAYS frame outputs as drafts the team will review. The human is the final decision maker.
5. ALWAYS prefer concrete details over vague hype.

# Voice

- X-native: short, builder voice. No corporate filler. No emojis unless the project's theme genuinely calls for one (use sparingly).
- Honest: ground claims in what the project actually is and does.
- Specific: name the audience, the chain, the theme. Avoid empty superlatives.

# Output format

Respond with a STRICT JSON object matching the schema below. No prose before or after. No markdown fences.`;

export function buildLaunchKitMessages(input: ConceptInput): Msg[] {
  const userPrompt = `Generate a complete launch kit for the following project. Respond ONLY with a JSON object that matches this exact schema:

{
  "tokenName": string,
  "ticker": string,                    // 3-6 uppercase chars, A-Z and digits only
  "shortDescription": string,          // 1 sentence, under 180 chars
  "longDescription": string,           // 2-3 short paragraphs
  "mascotConcept": string,             // visual / character direction
  "pumpMetadata": {
    "name": string,
    "symbol": string,
    "description": string,             // mirrors shortDescription
    "twitter": string,                 // pass through input twitterUrl
    "telegram": string,                // pass through input telegramUrl
    "website": string,                 // pass through input websiteUrl
    "image": string                    // empty string in MVP; UI fills logo separately
  },
  "xBio": string,                      // X profile bio, under 160 chars
  "launchTweets": string[],            // EXACTLY 10 items, each under 280 chars
  "raidReplies": string[],             // EXACTLY 20 items, each under 240 chars
  "influencerDmTemplates": string[],   // EXACTLY 5 items, with {name} and {topic} placeholders
  "telegramAnnouncement": string,      // multi-line, ready to paste in TG
  "dexscreenerCopy": string,           // 1-2 sentences for the Dexscreener listing
  "cmcDescription": string,            // 2-3 sentences in CMC/CG style
  "sevenDayPlan": [                    // EXACTLY 7 items, day 1..7
    { "day": number, "title": string, "bullets": string[] }
  ],
  "dailyChecklist": string[]           // 5-8 items, action verbs first
}

# Project inputs

- Project idea: ${safe(input.idea)}
- Token name (proposed): ${safe(input.tokenName)}
- Ticker (proposed): ${safe(input.ticker)}
- Chain: ${safe(input.chain)}
- Theme / meme: ${safe(input.theme)}
- Target audience: ${safe(input.audience)}
- Launch style: ${safe(input.launchStyle)}
- Website: ${safe(input.websiteUrl) || "(none)"}
- X / Twitter: ${safe(input.twitterUrl) || "(none)"}
- Telegram: ${safe(input.telegramUrl) || "(none)"}

Return the JSON object only. No explanation. No markdown fences.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

function safe(s: string | undefined | null): string {
  if (!s) return "";
  return String(s).replace(/[\r\n]+/g, " ").trim();
}
