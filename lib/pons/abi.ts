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
// PLACEHOLDER — waiting on verified ABI from Robinhood Blockscout for the
// exact `create/launch` function selector. Do not treat this as final;
// the wizard imports `createLaunchAbi` so we can swap this the second we
// confirm the real signature by inspecting a live launch transaction on
// the explorer. `TokenLaunched` will still surface reliably regardless.
export const createLaunchAbi = parseAbi([
  // Reserved shape: (name, symbol, logoUrl, description, socials, initialBuyEth)
  // TODO(pons-live): confirm via Blockscout ABI + first-launch tx before
  //                  removing the placeholder guard in lib/pons/write.ts.
  "function launch(string name, string symbol, string logo, string description, string twitter, string telegram, string discord, string website) payable returns (address token)",
]);
