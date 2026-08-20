import { NextResponse, type NextRequest } from "next/server";

// ── Coming-soon gate ────────────────────────────────────────────────
// Flip this single flag to open/close the site. While true, every page
// rewrites to /coming-soon. APIs, static assets, and _next stay live so
// the launch flip is instant with no cold surprises.
const COMING_SOON = true;

// ── Private preview bypass ──────────────────────────────────────────
// Visit any page with ?preview=<secret> once: a 30-day cookie is set
// and the coming-soon gate stops applying to THAT browser only.
// Everyone else keeps seeing the gate.
const PREVIEW_SECRET = "hamrboss-0820";
const PREVIEW_COOKIE = "hamr_preview";

export function middleware(req: NextRequest) {
  if (!COMING_SOON) return NextResponse.next();
  const { pathname, searchParams } = req.nextUrl;

  // Entering with the secret — set the cookie and let them straight in.
  if (searchParams.get("preview") === PREVIEW_SECRET) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("preview");
    const res = NextResponse.redirect(clean);
    res.cookies.set(PREVIEW_COOKIE, PREVIEW_SECRET, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
    });
    return res;
  }

  // Already blessed — full site.
  if (req.cookies.get(PREVIEW_COOKIE)?.value === PREVIEW_SECRET) {
    return NextResponse.next();
  }

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
