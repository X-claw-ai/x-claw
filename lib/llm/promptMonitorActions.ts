import type { Msg } from "./types";

// ─────────────────────────────────────────────────────────────────────────
// Monitor — Suggested next actions
//
// Given a token's current state (supply, top holders share, basic activity),
// ask Grok to recommend the next 4-6 actions a launching team should take.
// Used on /launches/[mint].
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Monitor phase of the X CLAW Grok-native Meme Coin Launch Agent.

Job: given a freshly-launched memecoin's on-chain state and a few signals, recommend 4-6 concrete next actions for the launching team. Each action should be a short imperative sentence with a clear "why".

Hard rules:
1. NEVER recommend manipulation, wash trading, or anything that hides risk from holders.
2. NEVER guarantee outcomes.
3. Surface real risks (concentration, low liquidity, slow X engagement) honestly.
4. Bias toward visible, community-trust-building actions.

Voice: X-native, builder-honest. Imperative + 1-line reason.`;

export interface MonitorContext {
  tokenName: string;
  ticker: string;
  mint: string;
  supplyUiAmount: number;
  top10SharePct: number;
  recentTxCount: number;
  hoursSinceLaunch?: number;
}

export function buildMonitorActionsMessages(ctx: MonitorContext): Msg[] {
  const userPrompt = `Recommend 4-6 next actions for this freshly-launched memecoin. Output strict JSON:

{
  "headline": string,                          // 1 sentence overall read on the token's first hours
  "riskSignals": string[],                     // 0-4 short signals you'd flag (or empty if none)
  "actions": [{                                // EXACTLY 4-6 items
    "title": string,                           // imperative, short (e.g. "Pin a launch thread")
    "why": string,                             // 1 sentence reason
    "priority": "now" | "today" | "watch"
  }]
}

# Token state
- Name: ${ctx.tokenName}
- Ticker: $${ctx.ticker}
- Mint: ${ctx.mint}
- Total supply: ${ctx.supplyUiAmount}
- Top-10 holder share: ${ctx.top10SharePct.toFixed(1)}%
- Recent on-chain transactions sample: ${ctx.recentTxCount}
- Hours since launch (approx): ${ctx.hoursSinceLaunch ?? "unknown"}

Return ONLY the JSON.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

export interface MonitorActionsResult {
  headline: string;
  riskSignals: string[];
  actions: { title: string; why: string; priority: "now" | "today" | "watch" }[];
}

export function localStubMonitorActions(ctx: MonitorContext): MonitorActionsResult {
  const concentrated = ctx.top10SharePct > 60;
  return {
    headline: concentrated
      ? `${ctx.tokenName} is live but top-10 holders own ${ctx.top10SharePct.toFixed(1)}% — surface this clearly to the community.`
      : `${ctx.tokenName} is live. Use the next 24 hours to convert attention into committed holders.`,
    riskSignals: concentrated
      ? [
          `Top-10 holder concentration is high (${ctx.top10SharePct.toFixed(1)}%). Disclose holders, plan a fairness post.`,
          `Low recent transaction count (${ctx.recentTxCount}) — momentum may stall without raid coordination.`,
        ]
      : [
          `Recent transaction count is ${ctx.recentTxCount}. Watch for stalls.`,
        ],
    actions: [
      { title: "Pin a launch thread on X", why: "Make the canonical entry point for new arrivals.", priority: "now" },
      { title: "Post the founder announcement", why: "Builds trust by attaching a name + face to the launch.", priority: "now" },
      { title: "Open Telegram / Discord raid mission", why: "Coordinate the first 30 minutes of community amplification.", priority: "now" },
      { title: "Disclose holder distribution", why: "Honest disclosure beats people noticing concentration on Solscan first.", priority: "today" },
      { title: "Submit Dexscreener listing copy", why: "Improves first-impression for traders arriving from search.", priority: "today" },
      { title: "Track top wallets daily", why: "Spot whale activity and front-run rugs/dumps with timely community comms.", priority: "watch" },
    ],
  };
}
