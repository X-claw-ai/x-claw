import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, supabaseEnabled } from "@/lib/supabase/server";

// Global trollbox — no login. Reads are public, writes go through this
// route so every guardrail is enforced server-side:
//   - 280 char cap, 1+ chars
//   - NO links of any kind (memecoin chat is a phishing magnet)
//   - per-IP rate limit: 1 message / 4s, via a hashed-IP column
//   - only the latest slice is ever returned
//
// The client polls GET every few seconds — plenty "live" for a trollbox
// and needs zero extra infra.

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_LEN = 280;
const RATE_MS = 4_000;
const PAGE = 100;

// Any URL-ish content is rejected outright.
const LINKY =
  /(https?:\/\/|www\.|t\.me\/|discord\.gg|\.com\b|\.io\b|\.fun\b|\.xyz\b|\.net\b|\.org\b|\.gg\b|\.app\b)/i;

function ipHash(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`hamr-chat|${ip}`).digest("hex").slice(0, 32);
}

export async function GET() {
  if (!supabaseEnabled()) {
    return NextResponse.json({ ok: true, messages: [] });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ ok: true, messages: [] });
  const { data, error } = await sb
    .from("chat_messages")
    .select("id,name,wallet,body,created_at")
    .order("id", { ascending: false })
    .limit(PAGE);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json(
    { ok: true, messages: (data ?? []).reverse() },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(req: NextRequest) {
  let body: { name?: string; wallet?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const text = (body.body ?? "").trim();
  const name = (body.name ?? "").trim().slice(0, 24) || "clip";
  const wallet = /^0x[0-9a-fA-F]{40}$/.test(body.wallet ?? "")
    ? body.wallet!.toLowerCase()
    : null;

  if (text.length === 0 || text.length > MAX_LEN) {
    return NextResponse.json(
      { ok: false, error: `Message must be 1–${MAX_LEN} characters.` },
      { status: 400 },
    );
  }
  if (LINKY.test(text)) {
    return NextResponse.json(
      { ok: false, error: "Links aren't allowed in chat." },
      { status: 400 },
    );
  }

  if (!supabaseEnabled()) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 500 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({ ok: false, error: "Chat not configured" }, { status: 500 });
  }

  const hash = ipHash(req);

  // Rate limit: reject if this IP posted within the window.
  const since = new Date(Date.now() - RATE_MS).toISOString();
  const { count } = await sb
    .from("chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", hash)
    .gte("created_at", since);
  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { ok: false, error: "Slow down — one message every few seconds." },
      { status: 429 },
    );
  }

  const { error } = await sb.from("chat_messages").insert({
    name,
    wallet,
    body: text,
    ip_hash: hash,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
