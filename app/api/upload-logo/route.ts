import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin, supabaseEnabled } from "@/lib/supabase/server";

// Uploads a token logo (base64 data URL from the wizard — either a
// user-picked file on the manual lane or the viral post's image on
// Auto-pilot) into Supabase Storage and returns a short public URL.
//
// WHY: the logo string is stored ON-CHAIN by launchToken(). A base64
// data URL is 50-500KB of calldata — megagas. A hosted URL is ~80
// bytes. So every data-URL logo must pass through here before signing.

export const runtime = "nodejs";
export const maxDuration = 30;

const BUCKET = "token-logos";
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — plenty for a logo

export async function POST(req: NextRequest) {
  let body: { dataUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const dataUrl = body.dataUrl ?? "";
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|gif|webp));base64,(.+)$/);
  if (!m) {
    return NextResponse.json(
      { ok: false, error: "dataUrl must be a base64 image data URL" },
      { status: 400 },
    );
  }
  const [, contentType, b64] = m;
  const buf = Buffer.from(b64, "base64");
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: `Image too large (${buf.byteLength} bytes, max 4MB)` },
      { status: 413 },
    );
  }

  if (!supabaseEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Storage not configured" },
      { status: 500 },
    );
  }
  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json(
      { ok: false, error: "Storage client missing" },
      { status: 500 },
    );
  }

  // Bucket is created lazily on first upload; "already exists" is fine.
  await sb.storage
    .createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES })
    .catch(() => null);

  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const name = `${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(name, buf, {
    contentType,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(name);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
