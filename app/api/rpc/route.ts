import { NextResponse, type NextRequest } from "next/server";

// Same-origin JSON-RPC proxy for Robinhood Chain.
//
// WHY: browsers talk to the public RPC directly for reads (gas
// estimation, blocks, logs). That endpoint intermittently rejects some
// regions/IPs with HTTP 4xx, which surfaced as "eth_getBlockByNumber:
// RPC endpoint returned HTTP client error" during launches. Routing
// through our own domain means every visitor hits hamr.fun (no CORS,
// no geo-blocks) and Vercel's egress talks to the RPC.
//
// Scope: read-path only-ish — method allowlist keeps this from being
// an open proxy. Wallets submit transactions through their own RPC,
// so eth_sendRawTransaction is allowed for completeness but nothing
// non-Ethereum ever passes through.

export const runtime = "nodejs";
export const maxDuration = 30;

// NOTE: must stay the DIRECT endpoint — the chain config's default RPC
// now points at this proxy, so reading it here would loop.
const UPSTREAM =
  process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com";

const METHOD_OK = /^(eth_|net_|web3_)[a-zA-Z0-9_]+$/;

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

function methodAllowed(call: RpcCall): boolean {
  return typeof call.method === "string" && METHOD_OK.test(call.method);
}

export async function POST(req: NextRequest) {
  let body: RpcCall | RpcCall[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 },
    );
  }

  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > 300 || !calls.every(methodAllowed)) {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32601, message: "Method not allowed" } },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      // Never cache RPC responses.
      cache: "no-store",
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32000,
          message: `Upstream RPC unreachable: ${err instanceof Error ? err.message : "unknown"}`,
        },
      },
      { status: 502 },
    );
  }
}
