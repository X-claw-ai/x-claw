# HAMR Launchpad — Contract Design

Bonding-curve memecoin launchpad on Robinhood Chain (chain id 4663).
Replaces the Pons integration: no launcher whitelist, all fees flow to
HAMR + creators, direct in-app signing from hamr.fun.

## Economics

| Parameter | Value | Notes |
|---|---|---|
| Total supply | 1,000,000,000 (18 dec) | fixed, minted once to the launchpad |
| Curve allocation | 800,000,000 | sold along the bonding curve |
| LP allocation | 200,000,000 | paired with raised ETH at graduation |
| Virtual ETH reserve (start) | 1.5 ETH | sets the initial price |
| Virtual token reserve (start) | 1,100,000,000 | 1.1B (300M remains virtual at completion) |
| Graduation raise | 4.0 ETH (real) | reached exactly when 800M sold |
| Launch fee | 0.0005 ETH | one-time, to protocol treasury |
| Curve trade fee | 1% of ETH side | on both buys and sells |
| Post-graduation pool | Uniswap V3, 1% tier | LP NFT locked forever in FeeLocker |
| Fee split | creator 75 / HAMR 25 | curve fees AND V3 LP fees |

Derivation: constant product (x + Δx)(y − Δy) = xy with x=1.5, y=1.1e9.
Selling 800M leaves y=300M ⇒ x' = (1.5×1.1e9)/3e8 = 5.5 ⇒ real raise
= 5.5 − 1.5 = **4.0 ETH exactly**. Start FDV ≈ 1.36 ETH, graduation FDV
≈ 18.3 ETH (~13.4×).

## Contracts

### 1. `HamrLaunchpad.sol` (singleton — factory + curve + graduation)
- `launchToken(name, symbol, logo, description, socials) payable`
  → deploys `HamrToken` (1B to launchpad), stores curve state, emits
  `TokenLaunched`. Requires launch fee. Optional same-tx first buy with
  any ETH above the fee.
- `buy(token, minTokensOut) payable` — 1% fee off msg.value, rest moves
  the curve. Caps at graduation: excess ETH refunded. Auto-triggers
  graduation when the 4.0 ETH raise completes.
- `sell(token, tokenAmount, minEthOut)` — inverse curve move, 1% fee
  off the ETH output.
- `graduate(token)` — permissionless backup trigger. Wraps ETH → WETH,
  creates/initializes the V3 pool at the curve's closing price, mints a
  full-range position (200M + 4.0 ETH), transfers the LP NFT to the
  FeeLocker, registers the creator. Leftover dust → protocol ledger.
- Pull-payment fee ledger: `claimCreatorFees(token)` /
  `claimProtocolFees()`. No admin function can touch user funds.

### 2. `HamrToken.sol`
Minimal fixed-supply ERC-20 (no owner, no mint, no pause) + immutable
metadata strings (logo URI, description, socials) readable on-chain.

### 3. `HamrFeeLocker.sol`
- Receives graduation LP NFTs (only from the launchpad, only from the
  canonical position manager).
- `harvest(token)` — permissionless; collects accrued V3 fees and
  splits them 75/25 into per-address ledgers (WETH and token sides
  tracked separately).
- `claimCreator(token)` / `claimProtocol(token)` — pull withdrawals.
- LP NFT can never leave the locker: no transfer/withdraw function
  exists. Liquidity is locked for the life of the chain.

## Security posture (no-audit mitigations)
- No upgradeability, no proxies — bytecode is what it is.
- No admin key with access to funds. Treasury address is immutable.
- Pull payments everywhere (no push transfers that can DoS).
- Checks-effects-interactions + reentrancy guards on ETH paths.
- Curve math uses uint256 with explicit caps; no unchecked blocks on
  value paths.
- Same battle-tested pattern as pump.fun/Pons — no novel mechanisms.

## External addresses (Robinhood Chain mainnet)
- Uniswap V3 factory `0x1f7d7550B1b028f7571E69A784071F0205FD2EfA`
- NonfungiblePositionManager `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3`
- WETH `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
- Fee tier 10000 (1%), tick spacing 200, full range ±887200.

## Rollout
1. Foundry tests (curve math invariants, graduation, fee ledgers).
2. Testnet deploy + full cycle: launch → buys/sells → graduate →
   harvest → both claims.
3. Mainnet deploy, verify on Blockscout.
4. Frontend swap (`lib/hamr`), remove Pons integration + copy.
