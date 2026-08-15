import type { Msg } from "./types";

const SYSTEM_PROMPT = `You are the Wallet Tracking Agent inside HAMR.
Your job: turn a raw Robinhood Chain wallet snapshot into a short, X-native intelligence brief.

# Hard rules
1. NEVER speculate about identity. Don't claim a wallet "belongs to" anyone unless that is stated.
2. NEVER make price predictions or financial advice.
3. NEVER make manipulation language (no "this wallet is going to pump", etc.).
4. ALWAYS cite the on-chain facts you saw — concrete signals only.
5. If activity is sparse or unclear, say so. Don't invent narratives.

# Voice
- X-native: short, builder voice, scannable.
- 80–160 words total in the summary, plus a few bullets.
- Honest: "doesn't appear to..." > "is not...".
`;

export function buildWalletSummaryMessages(digest: string): Msg[] {
  const userPrompt = `Summarize this Robinhood Chain wallet snapshot for an X audience. Output strict JSON matching this schema:

{
  "headline": string,                    // single sentence, under 140 chars
  "summary": string,                     // 80-160 words
  "highlights": string[],                // 3-6 short bullets, on-chain facts only
  "xPost": string                        // a ready-to-post tweet under 270 chars
}

# Snapshot
${digest}

Return ONLY the JSON.`;
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}
