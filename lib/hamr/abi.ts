// ABIs for HAMR's own contracts — generated from the deployed source
// (contracts/src/*, verified compiling with solc 0.8.24 + viaIR).

import { parseAbi, parseAbiItem } from "viem";

export const hamrLaunchpadAbi = parseAbi([
  // ── Launch ───────────────────────────────────────────────────────
  "struct LaunchParams { string name; string symbol; string logo; string description; string twitterUrl; string telegramUrl; string websiteUrl; }",
  "function launchToken(LaunchParams p, uint256 minFirstBuyTokens) payable returns (address token)",
  // ── Curve trading ────────────────────────────────────────────────
  "function buy(address token, uint256 minTokensOut) payable",
  "function sell(address token, uint256 tokenAmount, uint256 minEthOut)",
  "function graduate(address token)",
  // ── Fees ─────────────────────────────────────────────────────────
  "function claimCreatorFees(address token)",
  "function claimProtocolFees()",
  "function creatorFeesEth(address token) view returns (uint256)",
  "function protocolFeesEth() view returns (uint256)",
  // ── Views ────────────────────────────────────────────────────────
  "function curves(address token) view returns (address creator, uint128 virtualEth, uint128 virtualToken, uint128 realEth, uint128 tokensSold, bool graduated, bool exists)",
  "function allTokens(uint256 i) view returns (address)",
  "function tokenCount() view returns (uint256)",
  "function quoteBuy(address token, uint256 ethValue) view returns (uint256)",
  "function quoteSell(address token, uint256 tokenAmount) view returns (uint256)",
  "function graduationProgressBps(address token) view returns (uint256)",
  "function treasury() view returns (address)",
  // ── Events ───────────────────────────────────────────────────────
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, string logo)",
  "event CurveBuy(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 newVirtualEth)",
  "event CurveSell(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 newVirtualEth)",
  "event Graduated(address indexed token, address indexed pool, uint256 tokenId, uint256 ethPaired, uint256 tokensPaired)",
]);

export const hamrTokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function logo() view returns (string)",
  "function description() view returns (string)",
  "function twitterUrl() view returns (string)",
  "function telegramUrl() view returns (string)",
  "function websiteUrl() view returns (string)",
  "function creator() view returns (address)",
]);

export const hamrLockerAbi = parseAbi([
  "function harvest(address token)",
  "function claimCreator(address token)",
  "function claimProtocol(address token)",
  "function pendingCreator(address token) view returns (address t0, uint256 amt0, address t1, uint256 amt1)",
  "function locks(address token) view returns (address creator, uint96 tokenId, address token0, address token1, bool exists)",
]);

export const tokenLaunchedEvent = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed creator, string name, string symbol, string logo)",
);
