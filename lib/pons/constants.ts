// Pons protocol addresses on Robinhood Chain.
// Source: https://docs.ponsfamily.com/#contracts (verified 2026-08-22).
//
// Deployed contracts are immutable per docs. New versions ship as new
// factory + locker addresses; keep legacy addresses here so /launches
// pages for older tokens still resolve. Anything read-only (getLaunched,
// graduationStatus, price) works against the factory the token was
// deployed through, not necessarily the current one.

import type { Address } from "viem";

/** Fee split, protocol treasury, and burn behavior. */
export const PONS_FEE_SPLIT = {
  // Applies to tokens launched through the ACTIVE factory (block 8991118+).
  creator: 70,
  protocol: 30,
} as const;

/** Fixed launch parameters (docs "Overview → How launches work"). */
export const PONS_LAUNCH_PARAMS = {
  supply: 1_000_000_000n * 10n ** 18n, // 1e9 tokens, 18 decimals
  supplyHumanReadable: 1_000_000_000,
  poolFeeBps: 10_000, // Uniswap V3 fee tier = 1%
  launchFeeEth: "0.0005", // 0.0005 ETH per launch, paid to factory
  graduationThresholdEth: "4.2", // 4.2 ETH paired to graduate
} as const;

/** Pons contracts on Robinhood Chain (mainnet). */
export const PONS_CONTRACTS = {
  // Current — used for every NEW launch KOKi ships.
  factory: "0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB" as Address,
  factoryStartBlock: 8_991_118n,
  locker: "0x736D76699C26D0d966744cAe304C000d471f7F35" as Address,

  // Legacy — kept for reading older tokens that pre-date the split change.
  legacyFactory: "0x0c37a24F5D23A486FA692d1500881d698B1F77a4" as Address,
  legacyFactoryStartBlock: 8_600_612n,
  legacyLocker: "0x31ca5E101941A93A7DD6d0497928700625CF54B5" as Address,

  // Uniswap V3 stack that Pons launches settle into.
  v3Factory: "0x1f7d7550B1b028f7571E69A784071F0205FD2EfA" as Address,
  positionManager: "0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3" as Address,
  swapRouter: "0xCaf681a66D020601342297493863E78C959E5cb2" as Address,
  quoterV2: "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7" as Address,

  // Quote currency. All Pons tokens pair against WETH only.
  weth: "0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73" as Address,

  // PONS itself — useful as a reference token when validating an
  // integration against known onchain state (docs "Reference token").
  ponsToken: "0x39dBED3a2bd333467115dE45665cC57F813C4571" as Address,
  ponsPool: "0x10CC6BD38112cAc182db90B6a71d8Bb5939526bA" as Address,
} as const;

/** Onchain event topics for indexing. */
export const PONS_EVENT_TOPICS = {
  // event TokenLaunched(address indexed token, address indexed deployer, ...)
  tokenLaunched:
    "0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a",
  // Uniswap V3 pool Swap event
  swap:
    "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67",
} as const;
