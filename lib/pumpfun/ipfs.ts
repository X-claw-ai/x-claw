// ─────────────────────────────────────────────────────────────────────────
// Pump.fun IPFS metadata upload
//
// Pump.fun runs a public IPFS upload endpoint at:
//   POST https://pump.fun/api/ipfs
//
// It accepts multipart/form-data with the token image plus metadata fields
// (name, symbol, description, social links). It returns:
//   { metadata: {...}, metadataUri: "https://ipfs.io/ipfs/..." }
//
// We use this server-side so the user's browser never touches a third-party
// upload endpoint directly (better for CORS, better for error logs).
// ─────────────────────────────────────────────────────────────────────────

const PUMP_FUN_IPFS = "https://pump.fun/api/ipfs";

export interface PumpIpfsMetadata {
  name: string;
  symbol: string;
  description: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface PumpIpfsResult {
  metadataUri: string;
  metadata: Record<string, unknown>;
}

/**
 * Upload an image + metadata to Pump.fun's IPFS. Returns the metadata URI
 * we then pass to PumpPortal's `trade-local` endpoint.
 *
 * @param imageBlob - PNG/JPG/GIF blob of the token logo
 * @param meta - token metadata (name, symbol, description, links)
 */
export async function uploadPumpIpfs(
  imageBlob: Blob,
  meta: PumpIpfsMetadata
): Promise<PumpIpfsResult> {
  const form = new FormData();
  form.append("file", imageBlob, "logo.png");
  form.append("name", meta.name);
  form.append("symbol", meta.symbol);
  form.append("description", meta.description);
  form.append("twitter", meta.twitter ?? "");
  form.append("telegram", meta.telegram ?? "");
  form.append("website", meta.website ?? "");
  form.append("showName", "true");

  const res = await fetch(PUMP_FUN_IPFS, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Pump.fun IPFS upload failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const data = await res.json();
  if (!data?.metadataUri) {
    throw new Error("Pump.fun IPFS response missing metadataUri");
  }
  return { metadataUri: data.metadataUri, metadata: data.metadata ?? {} };
}

/**
 * Build a placeholder transparent PNG when the user did not upload a logo.
 * Pump.fun requires an image file; this gives them a tiny 1x1 PNG so the
 * call doesn't fail. (UI nudges the user to upload a real logo.)
 */
export function placeholderLogoBlob(): Blob {
  // 1x1 transparent PNG, base64 encoded
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/ePEEAAAAASUVORK5CYII=";
  const binary = Buffer.from(base64, "base64");
  return new Blob([binary], { type: "image/png" });
}
