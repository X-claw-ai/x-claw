// ─────────────────────────────────────────────────────────────────────────
// PumpPortal `trade-local` adapter (server-side proxy)
//
// PumpPortal exposes a non-custodial endpoint that returns an UNSIGNED
// Solana transaction. The client wallet then signs and submits it. This
// matches the KOKi security model:
//   Agent prepares → User approves → Wallet signs → Action executes.
//
// Endpoint:
//   POST https://pumpportal.fun/api/trade-local
//
// Request payload (for token creation):
//   {
//     "publicKey":      "<creator wallet pubkey>",
//     "action":         "create",
//     "tokenMetadata":  { "name": "...", "symbol": "...", "uri": "<ipfs uri>" },
//     "mint":           "<mint pubkey (base58)>",
//     "denominatedInSol": "true",
//     "amount":         0.001,        // initial dev buy in SOL
//     "slippage":       10,           // percent
//     "priorityFee":    0.0005,       // SOL
//     "pool":           "pump"
//   }
//
// Response: a binary body containing a serialized VersionedTransaction the
// client must deserialize, sign, and submit.
// ─────────────────────────────────────────────────────────────────────────

const PUMP_PORTAL_LOCAL = "https://pumpportal.fun/api/trade-local";

export interface CreateTokenTxParams {
  publicKey: string; // creator wallet pubkey (base58)
  mint: string; // new token mint pubkey (base58)
  metadataUri: string;
  name: string;
  symbol: string;
  /** Initial dev buy amount in SOL. 0 to skip dev buy. */
  amountInSol?: number;
  /** Slippage percent. Default 10. */
  slippage?: number;
  /** Priority fee in SOL. Default 0.0005. */
  priorityFee?: number;
  /** "pump" for the standard bonding-curve pool. */
  pool?: "pump";
}

export interface CreateTokenTxResult {
  /** Serialized VersionedTransaction bytes (unsigned by wallet, may be partially signed). */
  txBytes: Uint8Array;
}

export async function buildCreateTokenTx(
  params: CreateTokenTxParams
): Promise<CreateTokenTxResult> {
  const body = {
    publicKey: params.publicKey,
    action: "create",
    tokenMetadata: {
      name: params.name,
      symbol: params.symbol,
      uri: params.metadataUri,
    },
    mint: params.mint,
    denominatedInSol: "true",
    amount: params.amountInSol ?? 0,
    slippage: params.slippage ?? 10,
    priorityFee: params.priorityFee ?? 0.0005,
    pool: params.pool ?? "pump",
  };

  const res = await fetch(PUMP_PORTAL_LOCAL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `PumpPortal trade-local failed (${res.status}): ${text.slice(0, 400)}`
    );
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new Error("PumpPortal returned an empty transaction body");
  }
  return { txBytes: new Uint8Array(buf) };
}
