import type { LaunchRecord } from "./types";

// Static mock launch history for the MVP. Replace with /api/launch-history.
export const MOCK_LAUNCH_HISTORY: LaunchRecord[] = [
  {
    id: "lch_001",
    tokenName: "Sample ClawCoin",
    ticker: "CLAW",
    chain: "solana",
    status: "launched",
    createdAt: "2026-04-28T10:21:00Z",
    txSignature: "MockTx111111111111111111111111111111111111",
    pumpUrl: "https://pump.fun/coin/MOCK_CLAW",
    mock: true,
  },
  {
    id: "lch_002",
    tokenName: "GrokIndex",
    ticker: "GIDX",
    chain: "solana",
    status: "draft",
    createdAt: "2026-05-01T14:02:00Z",
    mock: true,
  },
  {
    id: "lch_003",
    tokenName: "AgentPilled",
    ticker: "PILL",
    chain: "solana",
    status: "pending-signature",
    createdAt: "2026-05-03T09:11:00Z",
    mock: true,
  },
];

export function mockTxSignature(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 88; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
