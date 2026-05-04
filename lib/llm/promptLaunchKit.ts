import type { ConceptInput } from "@/lib/types";
import type { Msg } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Pump Launch Agent — system prompt (Phase 3: Generate)
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Generate phase of the KOKi Grok-native Meme Coin Launch Agent.
Your job is to produce a complete launch kit for a Pump.fun-style token, ready for the human team to review and sign.

# Hard compliance rules (NEVER violate)

1. NEVER make guaranteed-profit, guaranteed-viral, or guaranteed-listing claims.
   - Forbidden: "this will pump", "guaranteed 10x", "secure your bag now", "guaranteed CMC listing".
2. NEVER claim official partnership or endorsement from xAI, X, Grok, Pump.fun, or any third party.
3. NEVER write market-manipulation or financial-advice language.
4. ALWAYS frame outputs as drafts the team will review. The human is the final decision maker.
5. ALWAYS prefer concrete details over vague hype.

# Voice

- X-native: short, builder voice. No corporate filler.
- Honest: ground claims in what the project is and does.
- Specific: name the audience, the chain, the theme. Avoid empty superlatives.

# Output

Respond with a STRICT JSON object matching the schema below. No prose before or after. No markdown fences.`;

export function buildLaunchKitMessages(input: ConceptInput): Msg[] {
  const userPrompt = `Generate a complete launch kit. Respond ONLY with a JSON object that matches this exact schema:

{
  "tokenName": string,
  "ticker": string,                      // 3-6 uppercase chars, A-Z and digits only
  "shortDescription": string,            // 1 sentence, under 180 chars
  "longDescription": string,             // 2-3 short paragraphs
  "memeThesis": string,                  // 2-3 sentences explaining why this meme works on X right now
  "tagline": string,                     // single short line, under 80 chars
  "mascotConcept": string,
  "imagePrompt": string,                 // image-gen prompt for the logo
  "pumpMetadata": {
    "name": string,
    "symbol": string,
    "description": string,
    "twitter": string,
    "telegram": string,
    "website": string,
    "image": string                      // empty string in MVP
  },
  "xBio": string,                        // X profile bio, under 160 chars
  "launchTweets": string[],              // EXACTLY 10, each under 270 chars
  "viralHooks": string[],                // EXACTLY 5 short standalone hooks
  "threadIdeas": string[],               // EXACTLY 5 thread topic ideas (1 sentence each)
  "raidReplies": string[],               // EXACTLY 20, each under 240 chars
  "influencerDmTemplates": string[],     // EXACTLY 5, with {name} and {topic} placeholders
  "founderAnnouncement": string,         // multi-line, founder voice
  "productAnnouncement": string,         // multi-line, product launch voice
  "telegramAnnouncement": string,
  "discordAnnouncement": string,
  "communityOnboarding": string,         // welcome + first 3 actions
  "raidMission": string,                 // first-30-min raid plan
  "faq": [{ "q": string, "a": string }], // EXACTLY 5 to 7 items
  "dexscreenerCopy": string,
  "cmcDescription": string,
  "sevenDayPlan": [{ "day": number, "title": string, "bullets": string[] }],  // EXACTLY 7
  "dailyChecklist": string[]             // 5-8 items, action verbs first
}

# Project inputs

- Project idea: ${safe(input.idea)}
- Token name: ${safe(input.tokenName)}
- Ticker: ${safe(input.ticker)}
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
