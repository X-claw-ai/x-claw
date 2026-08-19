// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HamrToken} from "./HamrToken.sol";
import {HamrFeeLocker} from "./HamrFeeLocker.sol";
import {INonfungiblePositionManager, IERC20Minimal} from "./interfaces/IUniswapV3.sol";

/// @title HamrLaunchpadV2 — every launch IS a real Uniswap V3 pool
/// @notice v1 sold tokens along an internal virtual curve, which meant
///         nothing outside hamr.fun could quote or trade a coin until
///         graduation. v2 removes the curve entirely: `launchToken`
///         deploys the ERC-20, creates + initializes a Uniswap V3 pool
///         (1% tier, WETH pair), and mints the ENTIRE 1B supply as a
///         one-sided liquidity position across a fixed price range.
///
///         Consequences:
///         - Any wallet, aggregator, or bot that supports this chain's
///           Uniswap V3 can trade the coin from block one.
///         - The position NFT is sent straight to the HamrFeeLocker and
///           can never be withdrawn — liquidity is locked for life.
///         - The 1% pool fee accrues to the locked position; anyone can
///           `harvest()` on the locker, which ledgers 75% to the coin's
///           creator and 25% to the HAMR treasury (pull-payment).
///         - "Graduation" is a milestone, not a mechanism: when price
///           crosses the top of the range (~4 ETH absorbed), the curve
///           part of the position is fully converted to WETH.
///
///         Price range (both address orderings precomputed off-chain
///         with exact TickMath so the contract does zero math):
///           start ≈ 1.356e-9 ETH/token (tick ±204200)
///           end   ≈ 1.175e-8 ETH/token (tick ±182600), ≈8.7x
///           full fill absorbs ≈ 3.99 ETH into locked liquidity.
///         The pool is initialized one tick-spacing OUTSIDE the range so
///         the one-sided mint can never be frustrated by rounding.
contract HamrLaunchpadV2 {
    // ── Economics ─────────────────────────────────────────────────────
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 public constant LAUNCH_FEE = 0.0005 ether;
    uint24 public constant POOL_FEE = 10_000; // 1% tier, spacing 200

    // ── Precomputed range (token is token0: token < WETH) ────────────
    int24 internal constant TICK_LOWER_T0 = -204_200;
    int24 internal constant TICK_UPPER_T0 = -182_600;
    /// getSqrtRatioAtTick(-204400) — one spacing below the range.
    uint160 internal constant INIT_SQRT_T0 = 2888097751221226989622374;

    // ── Mirrored range (token is token1: WETH < token) ───────────────
    int24 internal constant TICK_LOWER_T1 = 182_600;
    int24 internal constant TICK_UPPER_T1 = 204_200;
    /// getSqrtRatioAtTick(204400) — one spacing above the range.
    uint160 internal constant INIT_SQRT_T1 = 2173438116051445792040715875261807;

    // ── Wiring ────────────────────────────────────────────────────────
    address public immutable weth;
    INonfungiblePositionManager public immutable positionManager;
    HamrFeeLocker public immutable locker;

    /// @notice HAMR treasury — receives the 0.0005 ETH launch fees.
    ///         Same self-rotation model as v1: only the current treasury
    ///         can hand off, and it only controls the protocol's fees.
    address public treasury;
    uint256 public protocolFeesEth;

    struct Launch {
        address creator;
        address pool;
        uint96 tokenId;
        bool exists;
    }

    address[] public allTokens;
    mapping(address => Launch) public launches;

    bool private _entered;

    struct LaunchParams {
        string name;
        string symbol;
        string logo;
        string description;
        string twitterUrl;
        string telegramUrl;
        string websiteUrl;
    }

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        address pool,
        uint256 tokenId,
        string name,
        string symbol,
        string logo
    );
    event ProtocolFeesClaimed(address indexed treasury, uint256 amount);
    event TreasuryRotated(address indexed from, address indexed to);

    modifier nonReentrant() {
        require(!_entered, "Hamr: reentrant");
        _entered = true;
        _;
        _entered = false;
    }

    constructor(address _weth, address _positionManager, address _locker, address _treasury) {
        require(
            _weth != address(0) &&
                _positionManager != address(0) &&
                _locker != address(0) &&
                _treasury != address(0),
            "Hamr: zero"
        );
        weth = _weth;
        positionManager = INonfungiblePositionManager(_positionManager);
        locker = HamrFeeLocker(_locker);
        treasury = _treasury;
    }

    /// @notice One signature: deploy the token, open a REAL Uniswap V3
    ///         pool, lock 100% of supply as one-sided liquidity forever.
    ///         Tradeable everywhere immediately. First buys happen as a
    ///         normal router swap (separate tx from the buyer's wallet).
    function launchToken(LaunchParams calldata p) external payable nonReentrant returns (address token) {
        require(msg.value == LAUNCH_FEE, "Hamr: fee is 0.0005 ETH");
        require(bytes(p.name).length > 0 && bytes(p.name).length <= 48, "Hamr: name");
        require(bytes(p.symbol).length > 0 && bytes(p.symbol).length <= 16, "Hamr: symbol");
        require(bytes(p.logo).length <= 512, "Hamr: logo too long");
        require(bytes(p.description).length <= 512, "Hamr: description too long");

        protocolFeesEth += msg.value;

        token = address(
            new HamrToken(
                p.name,
                p.symbol,
                p.logo,
                p.description,
                p.twitterUrl,
                p.telegramUrl,
                p.websiteUrl,
                msg.sender,
                TOTAL_SUPPLY
            )
        );

        bool tokenIs0 = token < weth;
        (address t0, address t1) = tokenIs0 ? (token, weth) : (weth, token);

        address pool = positionManager.createAndInitializePoolIfNecessary(
            t0,
            t1,
            POOL_FEE,
            tokenIs0 ? INIT_SQRT_T0 : INIT_SQRT_T1
        );

        require(IERC20Minimal(token).approve(address(positionManager), TOTAL_SUPPLY), "Hamr: approve");

        (uint256 tokenId, , , ) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: t0,
                token1: t1,
                fee: POOL_FEE,
                tickLower: tokenIs0 ? TICK_LOWER_T0 : TICK_LOWER_T1,
                tickUpper: tokenIs0 ? TICK_UPPER_T0 : TICK_UPPER_T1,
                amount0Desired: tokenIs0 ? TOTAL_SUPPLY : 0,
                amount1Desired: tokenIs0 ? 0 : TOTAL_SUPPLY,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(locker),
                deadline: block.timestamp
            })
        );

        locker.register(token, msg.sender, tokenId, t0, t1);

        launches[token] = Launch({
            creator: msg.sender,
            pool: pool,
            tokenId: uint96(tokenId),
            exists: true
        });
        allTokens.push(token);

        emit TokenLaunched(token, msg.sender, pool, tokenId, p.name, p.symbol, p.logo);
    }

    // ── Views ─────────────────────────────────────────────────────────

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    function poolOf(address token) external view returns (address) {
        return launches[token].pool;
    }

    // ── Protocol fees (launch fees only — trade fees live in the locker)

    /// @notice Anyone may trigger; always pays the current treasury.
    function claimProtocolFees() external nonReentrant {
        uint256 amount = protocolFeesEth;
        require(amount > 0, "Hamr: nothing to claim");
        protocolFeesEth = 0;
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "Hamr: transfer failed");
        emit ProtocolFeesClaimed(treasury, amount);
    }

    /// @notice Self-rotation only: the current treasury hands off to its
    ///         successor. No other admin surface exists on v2.
    function setTreasury(address newTreasury) external {
        require(msg.sender == treasury, "Hamr: not treasury");
        require(newTreasury != address(0), "Hamr: zero treasury");
        emit TreasuryRotated(treasury, newTreasury);
        treasury = newTreasury;
    }
}
