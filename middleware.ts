import { NextResponse, type NextRequest } from "next/server";

// ── Coming-soon gate ────────────────────────────────────────────────
// Flip this single flag to open/close the site. While true, every page
// rewrites to /coming-soon. APIs, static assets, and _next stay live so
// the launch flip is instant with no cold surprises.
const COMING_SOON = true;

export function middleware(req: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (pathname === "/coming-soon") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  // Everything except API routes, Next internals, and files (images,
  // fonts, favicon — anything with an extension).
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
