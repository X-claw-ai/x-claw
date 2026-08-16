// ABI fragments for Pons contracts.
// Reads are lifted verbatim from https://docs.ponsfamily.com/.
//
// The write side (createToken / launch) is not published in the docs at
// the surface level; we call it via the fully-typed factory ABI once the
// concrete function name is confirmed against Robinhood Blockscout. For
// the initial scaffold we expose a placeholder `createLaunchAbi` that
// PonsLaunchWizard imports — that keeps the wallet path wired end-to-end
// and lets us swap in the real signature the moment we verify it.

import { parseAbi, parseAbiItem } from "viem";

// -------- Read side --------
// The launched token is self-describing on chain.
export const ponsTokenAbi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function logo() view returns (string)",
  "function description() view returns (string)",
  "function liquidityPool() view returns (address)",
  "function socials() view returns (string twitter, string telegram, string discord, string website, string farcaster)",
]);

// Launch-level parameters live on the factory that deployed the token.
export const ponsFactoryReadAbi = parseAbi([
  "function getLaunchedToken(address token) view returns ((address token, address deployer, address pairedToken, address positionManager, uint256 positionId, uint256 dexId, uint256 launchConfigId, uint256 restrictionsEndBlock, uint256 supply, bool isToken0, uint24 poolFee, bool exists, uint256 initialBuyAmount) launched)",
  "function graduationStatus(address token) view returns (uint256 pairedPrincipal, uint256 threshold, bool graduated)",
  "function locker() view returns (address)",
]);

// Locker: fee split + creator payout for a specific token.
export const ponsLockerAbi = parseAbi([
  "function tokenProtocolFeeShares(address token) view returns (uint256)",
  "function feeRedirects(address token) view returns (address)",
  "function protocolFeeRecipient() view returns (address)",
]);

// Uniswap V3 pool slot0 — needed for pricing.
export const uniV3PoolSlot0Abi = parseAbiItem(
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
);

// -------- Events --------
export const ponsTokenLaunchedEvent = parseAbiItem(
  "event TokenLaunched(address indexed token, address indexed deployer, address indexed dexFactory, address pairToken, address pool, uint256 dexId, uint256 launchConfigId, uint256 positionId, uint256 restrictionsEndBlock, uint256 initialBuyAmount)",
);

// -------- Write side --------
// VERIFIED 2026-08-16 against the PonsLaunchFactory source published on
// Robinhood Blockscout (contract 0xA5aA…1feB, is_verified: true).
//
//   launchToken(
//     (string name, string symbol, string logo, string description,
//      (string twitter, string telegram, string discord, string website,
//       string farcaster) socials,
//      address feeWallet) params,
//     uint256 launchConfigId,
//     uint256 dexId,
//     bytes32 salt
//   ) payable returns (address)
//
// ⚠️ ACCESS CONTROL: the factory enforces a launcher whitelist. Every
// recent non-whitelisted launchToken tx on Blockscout reverted with
// custom error NotWhitelisted() (selector 0x584a7938). Direct signing
// from arbitrary user wallets will revert until HAMR's launcher address
// is whitelisted by the Pons team — see PONS_DIRECT_LAUNCH_ENABLED in
// lib/pons/write.ts.
export const createLaunchAbi = parseAbi([
  "struct PonsSocials { string twitter; string telegram; string discord; string website; string farcaster; }",
  "struct PonsLaunchParams { string name; string symbol; string logo; string description; PonsSocials socials; address feeWallet; }",
  "function launchToken(PonsLaunchParams params, uint256 launchConfigId, uint256 dexId, bytes32 salt) payable returns (address token)",
]);
