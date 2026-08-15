import { NextResponse } from "next/server";

// DEPRECATED, multi-vertical model retired. Returns an empty catalog.
// /agents redirects to /launch in next.config.mjs. This route stays as a
// no-op so any external integrations don't 404 abruptly.
export async function GET() {
  return NextResponse.json({
    ok: true,
    deprecated: true,
    note: "HAMR retired the multi-vertical catalog. Use /api/meme-radar.",
    templates: [],
  });
}
