// HAMR Launchpad v2 client — every launch is a REAL Uniswap V3 pool.
// Price/state come from the pool itself (slot0), trades are standard
// router swaps, and history is the pool's own Swap events. This is what
// makes every wallet/bot/aggregator able to trade a coin from block 1.

import { formatEther, parseAbi, parseAbiItem, type Address } from "viem";
import { getPublicClient } from "../robinhood/client";
import { readTokenMeta, type HamrTokenMeta } from "./read";

// ── Contracts (Robinhood Chain mainnet) ─────────────────────────────
export const HAMR_V2 = {
  launchpad: "0x24ad1b88e2af2c6447dc56c182a857c8c3459e18" as Address,
  locker: "0x7ce67aa556fa6bf73e6670ccc605b0ab0a69c0b7" as Address,
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address,
  positionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3" as Address,
  swapRouter: "0xCaf681a66D020601342297493863E78C959E5cb2" as Address,
  quoterV2: "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7" as Address,
} as const;

export const V2_PARAMS = {
  totalSupply: 1_000_000_000,
  launchFeeEth: "0.0005",
  poolFee: 10_000, // 1% tier
  /** Price range the one-sided position covers (ETH per token). */
  startPriceEth: Math.pow(1.0001, -204_200),
  endPriceEth: Math.pow(1.0001, -182_600),
  /** ETH absorbed when the range fully fills ("graduation"). */
  targetRaiseEth: 4,
} as const;

// ── ABIs ─────────────────────────────────────────────────────────────
export const launchpadV2Abi = parseAbi([
  "struct LaunchParams { string name; string symbol; string logo; string description; string twitterUrl; string telegramUrl; string websiteUrl; }",
  "function launchToken(LaunchParams p) payable returns (address token)",
  "function tokenCount() view returns (uint256)",
  "function allTokens(uint256) view returns (address)",
  "function poolOf(address token) view returns (address)",
  "function launches(address token) view returns (address creator, address pool, uint96 tokenId, bool exists)",
  "function treasury() view returns (address)",
  "function protocolFeesEth() view returns (uint256)",
  "function claimProtocolFees()",
  "event TokenLaunched(address indexed token, address indexed creator, address pool, uint256 tokenId, string name, string symbol, string logo)",
]);

export const poolAbi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() view returns (uint128)",
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
]);

export const poolSwapEvent = parseAbiItem(
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
);

export const tokenLaunchedV2Event = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed creator, address pool, uint256 tokenId, string name, string symbol, string logo)",
);

const erc20MiniAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
]);

export const quoterV2Abi = parseAbi([
  "struct QuoteExactInputSingleParams { address tokenIn; address tokenOut; uint256 amountIn; uint24 fee; uint160 sqrtPriceLimitX96; }",
  "function quoteExactInputSingle(QuoteExactInputSingleParams params) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
]);

export const swapRouterAbi = parseAbi([
  "struct ExactInputSingleParams { address tokenIn; address tokenOut; uint24 fee; address recipient; uint256 deadline; uint256 amountIn; uint256 amountOutMinimum; uint160 sqrtPriceLimitX96; }",
  "function exactInputSingle(ExactInputSingleParams params) payable returns (uint256 amountOut)",
  "function unwrapWETH9(uint256 amountMinimum, address recipient) payable",
  "function multicall(bytes[] data) payable returns (bytes[] results)",
  "function refundETH() payable",
]);

// ── Price math ───────────────────────────────────────────────────────

/** ETH per token from a pool's sqrtPriceX96, handling address order. */
export function priceEthFromSqrt(sqrtPriceX96: bigint, tokenIs0: boolean): number {
  const ratio = Number(sqrtPriceX96) / 2 ** 96; // sqrt(token1/token0)
  const p10 = ratio * ratio; // token1 per token0
  // tokenIs0: price(WETH per token) = token1/token0 = p10
  // tokenIs1: price(WETH per token) = token0/token1 = 1/p10
  return tokenIs0 ? p10 : 1 / p10;
}

/** 0–10000 progress of the price through the launch range. */
export function progressBpsFromPrice(priceEth: number): number {
  const { startPriceEth, endPriceEth } = V2_PARAMS;
  if (priceEth <= startPriceEth) return 0;
  if (priceEth >= endPriceEth) return 10_000;
  const t =
    Math.log(priceEth / startPriceEth) / Math.log(endPriceEth / startPriceEth);
  return Math.round(t * 10_000);
}

export function tokenIsToken0(token: Address): boolean {
  return token.toLowerCase() < HAMR_V2.weth.toLowerCase();
}

// ── Reads ────────────────────────────────────────────────────────────

export interface V2Snapshot {
  pool: Address;
  creator: Address;
  priceEth: number;
  progressBps: number;
  graduated: boolean; // price crossed the top of the range
}

export async function readPoolOf(token: Address): Promise<Address | null> {
  const client = getPublicClient();
  const pool = await client.readContract({
    address: HAMR_V2.launchpad,
    abi: launchpadV2Abi,
    functionName: "poolOf",
    args: [token],
  });
  return pool === "0x0000000000000000000000000000000000000000" ? null : pool;
}

export async function readV2Snapshot(token: Address): Promise<V2Snapshot | null> {
  const client = getPublicClient();
  const [creator, pool, , exists] = await client.readContract({
    address: HAMR_V2.launchpad,
    abi: launchpadV2Abi,
    functionName: "launches",
    args: [token],
  });
  if (!exists) return null;
  const [sqrtPriceX96] = await client.readContract({
    address: pool,
    abi: poolAbi,
    functionName: "slot0",
  });
  const priceEth = priceEthFromSqrt(sqrtPriceX96, tokenIsToken0(token));
  const progressBps = progressBpsFromPrice(priceEth);
  return {
    pool,
    creator,
    priceEth,
    progressBps,
    graduated: progressBps >= 10_000,
  };
}

/** Everything the token page needs, in one read pass. */
export interface V2FullSnapshot extends V2Snapshot {
  meta: HamrTokenMeta;
  /** Real ETH sitting in the pool (the "raised" number). */
  wethInPoolEth: number;
  /** Tokens the pool has sold so far (whole tokens). */
  tokensSold: number;
}

export async function readV2FullSnapshot(
  token: Address,
): Promise<V2FullSnapshot | null> {
  const base = await readV2Snapshot(token);
  if (!base) return null;
  const client = getPublicClient();
  const [meta, wethBal, tokenBal] = await Promise.all([
    readTokenMeta(token),
    client.readContract({
      address: HAMR_V2.weth,
      abi: erc20MiniAbi,
      functionName: "balanceOf",
      args: [base.pool],
    }),
    client.readContract({
      address: token,
      abi: erc20MiniAbi,
      functionName: "balanceOf",
      args: [base.pool],
    }),
  ]);
  return {
    ...base,
    meta,
    wethInPoolEth: Number(formatEther(wethBal)),
    tokensSold: Math.max(
      0,
      V2_PARAMS.totalSupply - Number(formatEther(tokenBal)),
    ),
  };
}

/** Newest-first token list from the v2 factory. */
export async function listV2Tokens(limit = 50): Promise<Address[]> {
  const client = getPublicClient();
  const count = Number(
    await client.readContract({
      address: HAMR_V2.launchpad,
      abi: launchpadV2Abi,
      functionName: "tokenCount",
    }),
  );
  const idx: number[] = [];
  for (let i = count - 1; i >= 0 && idx.length < limit; i--) idx.push(i);
  return Promise.all(
    idx.map((i) =>
      client.readContract({
        address: HAMR_V2.launchpad,
        abi: launchpadV2Abi,
        functionName: "allTokens",
        args: [BigInt(i)],
      }),
    ),
  );
}

/** Router-grade quote via QuoterV2 (simulated — same call bots make). */
export async function quoteV2(params: {
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
}): Promise<bigint> {
  const client = getPublicClient();
  const { result } = await client.simulateContract({
    address: HAMR_V2.quoterV2,
    abi: quoterV2Abi,
    functionName: "quoteExactInputSingle",
    args: [
      {
        tokenIn: params.tokenIn,
        tokenOut: params.tokenOut,
        amountIn: params.amountIn,
        fee: V2_PARAMS.poolFee,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });
  return result[0];
}

// ── Trade history (pool Swap events) ────────────────────────────────

export interface V2Trade {
  price: number;
  ts: number;
  ethAmount: number;
  tokenAmount: number;
  kind: "buy" | "sell";
  trader: string;
  txHash?: string;
}

export async function readV2Trades(
  token: Address,
  pool: Address,
  maxEvents = 300,
  maxBlockLookups = 120,
): Promise<V2Trade[]> {
  const client = getPublicClient();
  const logs = await client.getLogs({
    address: pool,
    event: poolSwapEvent,
    fromBlock: 0n,
    toBlock: "latest",
  });
  const tokenIs0 = tokenIsToken0(token);
  const sliced = logs.slice(-maxEvents);

  const uniqueBlocks = [...new Set(sliced.map((l) => l.blockNumber))].slice(
    -maxBlockLookups,
  );
  const tsEntries = await Promise.all(
    uniqueBlocks.map(async (bn) => {
      try {
        const b = await client.getBlock({ blockNumber: bn });
        return [bn.toString(), Number(b.timestamp)] as const;
      } catch {
        return [bn.toString(), 0] as const;
      }
    }),
  );
  const tsMap = new Map(tsEntries);

  const out: V2Trade[] = [];
  for (const l of sliced) {
    const a = l.args as {
      recipient?: string;
      amount0?: bigint;
      amount1?: bigint;
      sqrtPriceX96?: bigint;
    };
    if (
      typeof a.amount0 !== "bigint" ||
      typeof a.amount1 !== "bigint" ||
      typeof a.sqrtPriceX96 !== "bigint"
    )
      continue;
    const tokenDelta = tokenIs0 ? a.amount0 : a.amount1; // pool's perspective
    const wethDelta = tokenIs0 ? a.amount1 : a.amount0;
    // Pool pays out tokens (negative) on a BUY.
    const kind: "buy" | "sell" = tokenDelta < 0n ? "buy" : "sell";
    out.push({
      price: priceEthFromSqrt(a.sqrtPriceX96, tokenIs0),
      ts: tsMap.get(l.blockNumber.toString()) ?? 0,
      ethAmount: Math.abs(Number(formatEther(wethDelta))),
      tokenAmount: Math.abs(Number(formatEther(tokenDelta))),
      kind,
      trader: a.recipient ?? "",
      txHash: l.transactionHash ?? undefined,
    });
  }
  return out;
}
