import type { Msg } from "./types";

const SYSTEM_PROMPT = `You are the X Post Generator inside X CLAW — a Creator Agent.
Your job: turn a topic into ready-to-post X content for a builder audience.

# Hard rules
1. Each tweet must be under 270 characters (leaving room for links).
2. NO guaranteed-profit, hype, or manipulation language. No "to the moon", "ape in", "guaranteed".
3. NO partnership claims. NO impersonation.
4. Match the requested tone honestly. If the tone is "promotional", stay grounded; do not exaggerate.
5. NEVER fabricate stats, prices, or partnerships.

# Voice
- X-native: short, punchy, builder voice.
- Concrete > vague. Specific names and details > superlatives.
- Use line breaks intentionally; threading via newlines is OK.
`;

export interface XPostRequest {
  topic: string;
  tone: "engaging" | "analytical" | "playful" | "promotional";
  audience?: string;
  count?: number;
  hashtags?: string;
  includeThread?: boolean;
}

export function buildXPostMessages(req: XPostRequest): Msg[] {
  const count = clamp(req.count ?? 5, 1, 10);
  const audience = req.audience?.trim() || "X-native crypto and AI builders";
  const hashtags = req.hashtags?.trim() || "(no specific hashtags)";

  const userPrompt = `Generate X content on the topic. Output strict JSON matching this schema:

{
  "posts": string[${count}],          // exactly ${count} standalone tweets, each under 270 chars
  "thread": {                          // 5-8 part thread, hook → body → conclusion
    "hook": string,                   // first tweet, the hook
    "body": string[],                 // 3-6 middle tweets
    "conclusion": string              // closing tweet with a clear takeaway
  }${req.includeThread === false ? " | null" : ""}
}

# Inputs
- Topic: ${escape(req.topic)}
- Tone: ${req.tone}
- Audience: ${audience}
- Hashtags / keywords to weave in (optional): ${hashtags}

Rules:
- Each post must stand alone (don't reference "previous post").
- Posts should differ in angle (story, hot take, data point, question, hook).
- The thread can echo any post but must add structure (hook → reasoning → conclusion).

Return ONLY the JSON.`;

  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

function escape(s: string): string {
  return String(s).replace(/[\r\n]+/g, " ").trim();
}
function clamp(n: number, min: number, max: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
