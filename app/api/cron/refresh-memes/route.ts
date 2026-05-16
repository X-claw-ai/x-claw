import { NextResponse, type NextRequest } from "next/server";
import { callLLM } from "@/lib/llm/router";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Msg } from "@/lib/llm/types";

// ─────────────────────────────────────────────────────────────────────────
// /api/cron/refresh-memes — pre-warmed x_search cache
//
// Runs every 30 minutes via Vercel Cron. Hits xAI's expensive `x_search`
// tool once, pulls the freshest viral X memes that would make good
// memecoin anchors, and writes them to public.cached_memes. /api/auto-
// launch then reads from the cache (instant) instead of re-running
// x_search on every user click (20-40s).
//
// Auth: Vercel signs cron requests with a CRON_SECRET header. We refuse
// any request that doesn't carry the expected secret.
//
// Quality preservation: this runs the SAME flagship model (grok-4-latest)
// and the SAME x_search tool the synchronous path used to use, so output
// fidelity is identical — we're just pre-paying the 20-40s wait.
// ─────────────────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const maxDuration = 180;

interface CachedMeme {
  x_url: string;
  x_author: string;
  image_url: string | null;
  summary: string;
  meme_angle: string | null;
  engagement_score: number | null;
}

interface RefreshResponse {
  ok: boolean;
  inserted?: number;
  batchId?: string;
  citations?: string[];
  rawCount?: number;
  error?: string;
}

function buildRefreshMessages(): Msg[] {
  const system = `You are KOKi's meme scout. Your job: scan X for the FRESHEST high-engagement viral posts in the LAST 48 HOURS and return 12-20 of them as a JSON array. We want the stuff people are ACTUALLY talking about right now — not random cute pictures.

Use the x_search tool AGGRESSIVELY. Run multiple queries with different angles to build a wide candidate pool, then filter HARD:
  - trending viral memes today
  - top liked X posts last 24 hours
  - viral images crypto twitter
  - what's everyone laughing at on X this week
  - AI agent jokes trending
  - dog meme viral / cat meme viral / frog meme viral

HARD ENGAGEMENT FLOOR. Reject any post that doesn't clearly meet AT LEAST ONE of:
  • 100,000+ views, OR
  • 10,000+ likes, OR
  • 5,000+ retweets/reposts
If you can't see engagement numbers in the search result, the post probably isn't big enough — skip it.

HARD CONTENT FILTER. Each post must be:
✓ Organic cultural content — joke, image, observation, format, character, screenshot
✓ Has an attached image (we use it as the eventual token logo)
✗ NOT a token shill — no "$TICKER buy now", "CA:", pump.fun links, dexscreener links, "fair launch live", "send it"
✗ NOT from a memecoin alpha account or pump caller
✗ NOT a token chart screenshot or a reply chain promoting an existing coin

Test: would this post still be funny/memorable if crypto didn't exist? If yes → eligible. If no → skip.

SPECIFICITY: the summary must point at something CONCRETE — a named character, a specific event, a recognizable visual, an exact punchline. REJECT generic placeholders like "a dog sitting on a fence" or "a cat with a beautiful coat" — those aren't viral, they're stock photos.

VARIETY: don't return 20 cats. Mix dog/frog/AI/NPC/format/screenshot/event/character so different users get different vibes.

Return STRICT JSON ONLY in this exact shape — no markdown fences, no prose around it:

{
  "memes": [
    {
      "x_url": "https://x.com/<handle>/status/<id>",
      "x_author": "@handle",
      "image_url": "https://pbs.twimg.com/media/<id>?format=jpg&name=large  OR  null",
      "summary": "1-2 sentence description pointing at a SPECIFIC recognizable thing",
      "meme_angle": "1 sentence on why this has memecoin potential",
      "engagement_score": 0.0-1.0
    },
    ...
  ]
}

Target: 12-20 memes. All x_url and image_url values MUST come from real x_search results, never fabricated. If a post has no image, set image_url to null and prefer a different post. If your search just doesn't yield 12 posts that clear the engagement floor, return fewer entries rather than padding with weak picks.`;

  const user = `Refresh the meme cache. Pull 12-20 viral X posts from the LAST 48 HOURS that each clear the engagement floor (100K+ views OR 10K+ likes OR 5K+ reposts). Variety matters — mix dog/frog/AI/NPC/format/screenshot. Generic descriptions are a fail. JSON only.`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

function parseRefreshOutput(raw: string): CachedMeme[] {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  const data = JSON.parse(s) as { memes?: unknown };
  if (!Array.isArray(data.memes)) {
    throw new Error("refresh output missing `memes` array");
  }

  const urlPattern = /^https?:\/\/(?:x\.com|twitter\.com)\/[^/\s]+\/status\/\d+/;
  const imgPattern = /^https?:\/\/pbs\.twimg\.com\/(?:media|tweet_video_thumb|amplify_video_thumb|ext_tw_video_thumb)\/[^\s]+/;
  const handlePattern = /^@[A-Za-z0-9_]{1,15}$/;
  const shillSignal = /\b(?:CA|contract)\s*[:=]?\s*[1-9A-HJ-NP-Za-km-z]{32,}|pump\.fun\/coin|dexscreener|0x[0-9a-f]{40}|fair\s*launch\s*live|sending\s+it\s+now|buy\s+now\s+\$[A-Z]{2,8}/i;

  const out: CachedMeme[] = [];
  for (const m of data.memes as Array<Record<string, unknown>>) {
    if (typeof m.x_url !== "string") continue;
    const xUrl = (m.x_url as string).trim().replace("twitter.com", "x.com");
    if (!urlPattern.test(xUrl)) continue;

    const author = typeof m.x_author === "string" ? (m.x_author as string).trim() : "";
    if (!handlePattern.test(author)) continue;

    let imageUrl: string | null = null;
    if (typeof m.image_url === "string" && imgPattern.test((m.image_url as string).trim())) {
      imageUrl = (m.image_url as string).trim();
    }

    const summary = typeof m.summary === "string" ? (m.summary as string).trim() : "";
    if (summary.length < 5) continue;

    const memeAngle = typeof m.meme_angle === "string" ? (m.meme_angle as string).trim() : null;
    const score = typeof m.engagement_score === "number" ? m.engagement_score : null;

    // Defensive shill check — never cache a post whose summary mentions token mechanics.
    if (shillSignal.test(`${summary} ${memeAngle ?? ""} ${xUrl}`)) continue;

    out.push({ x_url: xUrl, x_author: author, image_url: imageUrl, summary, meme_angle: memeAngle, engagement_score: score });
  }

  return out;
}

export async function GET(req: NextRequest) {
  // Auth: Vercel cron requests carry an Authorization: Bearer <CRON_SECRET> header.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const ok =
    !cronSecret /* allow if no secret configured (dev / first-deploy) */ ||
    authHeader === `Bearer ${cronSecret}`;
  if (!ok) {
    return NextResponse.json<RefreshResponse>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json<RefreshResponse>(
      { ok: false, error: "Supabase not configured (set SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 },
    );
  }

  // Run x_search via xAI Responses API. We pre-pay the 20-40s wait here so
  // user-facing /api/auto-launch can be instant.
  const today = new Date();
  // 48-hour window — we want the freshest stuff people are talking about
  // RIGHT NOW. The cron runs every 30 minutes, so 48h gives plenty of
  // depth without dragging in stale posts that peaked 5 days ago.
  const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const isoDate = (d: Date) => d.toISOString().slice(0, 10);

  let llmRes;
  try {
    llmRes = await callLLM({
      messages: buildRefreshMessages(),
      responseFormat: "json",
      maxTokens: 2400,
      temperature: 0.9,
      model: process.env.XAI_MODEL_AUTO_CONCEPT || "grok-4.3",
      feature: "cron-refresh-memes",
      liveSearch: {
        fromDate: isoDate(twoDaysAgo),
        toDate: isoDate(today),
        maxResults: 50, // bigger pool — most candidates will fail the engagement floor
        enableImageUnderstanding: true,
      },
    });
  } catch (err) {
    return NextResponse.json<RefreshResponse>(
      { ok: false, error: `LLM call failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let memes: CachedMeme[];
  try {
    memes = parseRefreshOutput(llmRes.content);
  } catch (err) {
    return NextResponse.json<RefreshResponse>(
      { ok: false, error: `Parse failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }

  if (memes.length === 0) {
    return NextResponse.json<RefreshResponse>(
      { ok: false, error: "No usable memes in LLM output", citations: llmRes.citations },
      { status: 200 },
    );
  }

  // Atomic swap: insert under a new batch_id, then purge old batches. Auto-launch
  // only ever reads rows where expires_at > now(), so the swap is invisible to
  // any concurrent reader.
  const batchId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 90 * 60 * 1000).toISOString();

  const rows = memes.map((m) => ({
    x_url: m.x_url,
    x_author: m.x_author,
    image_url: m.image_url,
    summary: m.summary,
    meme_angle: m.meme_angle,
    engagement_score: m.engagement_score,
    batch_id: batchId,
    expires_at: expiresAt,
  }));

  // Use upsert so a meme that came back two refreshes in a row doesn't error
  // on the unique(x_url) constraint.
  const { error: insertErr } = await sb
    .from("cached_memes")
    .upsert(rows, { onConflict: "x_url", ignoreDuplicates: false });
  if (insertErr) {
    return NextResponse.json<RefreshResponse>(
      { ok: false, error: `Insert failed: ${insertErr.message}` },
      { status: 500 },
    );
  }

  // Purge anything older than the new batch — keeps the table bounded.
  await sb.from("cached_memes").delete().neq("batch_id", batchId);

  return NextResponse.json<RefreshResponse>({
    ok: true,
    inserted: rows.length,
    batchId,
    citations: llmRes.citations,
    rawCount: memes.length,
  });
}
