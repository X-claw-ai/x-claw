import { NextResponse, type NextRequest } from "next/server";

// Server-side proxy that fetches an image from X's CDN (pbs.twimg.com) and
// returns it as a base64 data URL the client can stuff into a Pump.fun
// IPFS upload. Done server-side because:
//   1. The browser would hit CORS on pbs.twimg.com.
//   2. Doing the fetch on the server lets us validate the URL host before
//      ever touching it, the client can't trick us into proxying arbitrary
//      content from the open web.
//
// Used by the auto-pilot flow: when Grok's x_search returns an originImageUrl,
// the wizard calls this route, gets back a data URL, and uses it as the
// token's logoDataUrl when uploading to Pump.fun's IPFS endpoint.

export const runtime = "nodejs";
export const maxDuration = 30;

// Whitelist of acceptable hosts. pbs.twimg.com is X's media CDN.
const ALLOWED_HOSTS = new Set([
  "pbs.twimg.com",
  "video.twimg.com",
]);

// Cap response size, Pump.fun IPFS rejects huge files anyway, and we don't
// want to blow up the lambda memory if Grok hands us a giant URL.
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

interface FetchImageResponse {
  ok: boolean;
  imageDataUrl?: string;
  contentType?: string;
  error?: string;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: "url param required" },
      { status: 400 },
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: "Invalid URL" },
      { status: 400 },
    );
  }

  if (parsed.protocol !== "https:") {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: "https:// only" },
      { status: 400 },
    );
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: `Host not allowed: ${parsed.hostname}` },
      { status: 400 },
    );
  }

  // For X media, request the highest-quality variant. The `name=large`
  // query param tells X to serve the original-resolution copy.
  if (parsed.hostname === "pbs.twimg.com" && !parsed.searchParams.has("name")) {
    parsed.searchParams.set("name", "large");
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      headers: {
        // Some X CDN paths return 403 without a referer; identify ourselves.
        "User-Agent": "HAMR-agent/1.0 (+https://hamr.fun)",
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.9,*/*;q=0.5",
      },
      cache: "no-store",
    });
  } catch (err) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: `Network error: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: `Upstream ${upstream.status} ${upstream.statusText}` },
      { status: 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: `Upstream returned non-image content-type: ${contentType}` },
      { status: 502 },
    );
  }

  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json<FetchImageResponse>(
      { ok: false, error: `Image too large (${buf.byteLength} bytes)` },
      { status: 413 },
    );
  }

  const base64 = Buffer.from(buf).toString("base64");
  const imageDataUrl = `data:${contentType};base64,${base64}`;

  return NextResponse.json<FetchImageResponse>({
    ok: true,
    imageDataUrl,
    contentType,
  });
}
