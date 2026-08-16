# HAMR Launchpad — Deployment Runbook (Robinhood Chain mainnet)

Chain id **4663** · RPC `https://rpc.mainnet.chain.robinhood.com`
Explorer `https://robinhoodchain.blockscout.com`

## Fixed inputs

| Name | Address |
|---|---|
| WETH | `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73` |
| Uniswap V3 NonfungiblePositionManager | `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3` |
| HAMR Treasury (dedicated EOA, Rabby) | `0xb0f74aacc4d237371736e45cb9a13dbe68ef3391` |

Build: solc 0.8.24 · optimizer on (runs 200) · **viaIR: true** · evmVersion paris
Source: `contracts/flat/HamrLaunchpad.flat.sol` (single file, used for verify too)

## Deploy order (3 signatures, Remix → Injected Provider/Rabby)

1. **HamrFeeLocker** — constructor:
   - `_positionManager` = `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3`
   - `_treasury` = `0xb0f74aacc4d237371736e45cb9a13dbe68ef3391`
   → record deployed address as `LOCKER`.

2. **HamrLaunchpad** — constructor:
   - `_weth` = `0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73`
   - `_positionManager` = `0x73991a25C818Bf1f1128dEAaB1492D45638DE0D3`
   - `_locker` = `LOCKER` (from step 1)
   - `_treasury` = `0xb0f74aacc4d237371736e45cb9a13dbe68ef3391`
   → record deployed address as `LAUNCHPAD`.

3. **Wire**: call `LOCKER.setLaunchpad(LAUNCHPAD)` from the SAME wallet
   that deployed the locker (one-shot, cannot be re-pointed).

## Post-deploy smoke test (small real ETH)

1. `launchToken(("Test","TEST","","test","","",""), 0)` with value
   0.0006 ETH (fee 0.0005 + 0.0001 first buy) → expect TokenLaunched
   + CurveBuy events, tokens in wallet.
2. `buy(token, 0)` with 0.001 ETH → CurveBuy.
3. approve + `sell(token, someAmount, 0)` → CurveSell, ETH back.
4. `claimProtocolFees()` → treasury receives launch fee + 25% cuts.
5. (Full graduation test = 4 ETH; optional, or wait for a real launch.)

## Verify on Blockscout

Contract → Verify & publish → single file:
- paste `flat/HamrLaunchpad.flat.sol`
- solc 0.8.24, optimization yes (200), **via-IR yes**, EVM paris
- Do this for all three deployed contracts (same file, pick contract name).

## Deployed addresses (fill in)

| Contract | Address | Tx |
|---|---|---|
| HamrFeeLocker | `` | |
| HamrLaunchpad | `` | |
