// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HamrToken} from "./HamrToken.sol";
import {HamrFeeLocker} from "./HamrFeeLocker.sol";
import {
    INonfungiblePositionManager,
    IWETH9,
    IERC20Minimal
} from "./interfaces/IUniswapV3.sol";

/// @title HamrLaunchpad — bonding-curve memecoin factory on Robinhood Chain
///
/// Mechanics (pump.fun-style curve + Pons-style V3 lock):
///   • launchToken(): deploys a fixed-supply 1B HamrToken, all held here.
///   • buy()/sell(): constant-product curve with virtual reserves
///     (1.5 ETH / 1.1B tokens). 800M tokens sell out at exactly 4.0 ETH
///     raised, then the curve closes.
///   • graduate(): wraps the 4.0 ETH, pairs it with the reserved 200M
///     tokens in a full-range Uniswap V3 position (1% tier) at the
///     curve's closing price, and locks the LP NFT in HamrFeeLocker
///     forever. Post-graduation trading happens on Uniswap.
///   • Fees: 0.0005 ETH launch fee + 1% on every curve trade, split
///     creator 75 / HAMR 25 via pull ledgers. After graduation the V3
///     pool's 1% swap fee accrues to the locker with the same split.
///
/// Security posture: immutable, no owner, no pause, no fund-touching
/// admin. Treasury is immutable. Pull payments only. Reentrancy guards
/// on all ETH paths. No unchecked math on value paths.
contract HamrLaunchpad {
    // ── Curve economics (see contracts/DESIGN.md for derivation) ──────
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000e18;
    uint256 public constant CURVE_SUPPLY = 800_000_000e18;
    uint256 public constant LP_SUPPLY = 200_000_000e18; // TOTAL - CURVE
    uint256 public constant VIRTUAL_ETH_START = 1.5 ether;
    uint256 public constant VIRTUAL_TOKEN_START = 1_100_000_000e18;
    uint256 public constant GRADUATION_RAISE = 4 ether; // exact by construction
    uint256 public constant LAUNCH_FEE = 0.0005 ether;
    uint256 public constant FEE_BPS = 100; // 1% curve trade fee
    uint256 public constant CREATOR_BPS = 7_500; // of the fee
    uint256 public constant BPS = 10_000;

    // ── Uniswap V3 (Robinhood Chain mainnet) ──────────────────────────
    uint24 public constant POOL_FEE = 10_000; // 1% tier
    int24 public constant TICK_LOWER = -887_200;
    int24 public constant TICK_UPPER = 887_200;

    IWETH9 public immutable weth;
    INonfungiblePositionManager public immutable positionManager;
    HamrFeeLocker public immutable locker;
    address public immutable treasury;

    struct Curve {
        address creator;
        uint128 virtualEth; // starts 1.5e18, grows with buys
        uint128 virtualToken; // starts 1.1e27, shrinks with buys
        uint128 realEth; // ETH actually held for this curve (≤ 4e18)
        uint128 tokensSold; // ≤ CURVE_SUPPLY
        bool graduated;
        bool exists;
    }

    mapping(address => Curve) public curves;
    /// All launched tokens, newest last (board pagination).
    address[] public allTokens;

    // Pull-payment fee ledgers (curve fees + launch fees, in ETH).
    mapping(address => uint256) public creatorFeesEth; // token → amount
    uint256 public protocolFeesEth; // aggregate

    bool private _entered;

    event TokenLaunched(
        address indexed token,
        address indexed creator,
        string name,
        string symbol,
        string logo
    );
    event CurveBuy(
        address indexed token,
        address indexed buyer,
        uint256 ethIn,
        uint256 tokensOut,
        uint256 newVirtualEth
    );
    event CurveSell(
        address indexed token,
        address indexed seller,
        uint256 tokensIn,
        uint256 ethOut,
        uint256 newVirtualEth
    );
    event Graduated(
        address indexed token,
        address indexed pool,
        uint256 tokenId,
        uint256 ethPaired,
        uint256 tokensPaired
    );
    event CreatorFeesClaimed(address indexed token, address indexed creator, uint256 amount);
    event ProtocolFeesClaimed(uint256 amount);

    modifier nonReentrant() {
        require(!_entered, "Hamr: reentrant");
        _entered = true;
        _;
        _entered = false;
    }

    constructor(
        address _weth,
        address _positionManager,
        address _locker,
        address _treasury
    ) {
        require(
            _weth != address(0) &&
                _positionManager != address(0) &&
                _locker != address(0) &&
                _treasury != address(0),
            "Hamr: zero addr"
        );
        weth = IWETH9(_weth);
        positionManager = INonfungiblePositionManager(_positionManager);
        locker = HamrFeeLocker(_locker);
        treasury = _treasury;
    }

    // ─────────────────────────────────────────────────────────────────
    // Launch
    // ─────────────────────────────────────────────────────────────────

    /// @notice Deploy a new memecoin and open its bonding curve.
    ///         Any ETH beyond LAUNCH_FEE becomes the creator's first buy.
    function launchToken(
        string calldata name_,
        string calldata symbol_,
        string calldata logo_,
        string calldata description_,
        string calldata twitterUrl_,
        string calldata telegramUrl_,
        string calldata websiteUrl_,
        uint256 minFirstBuyTokens
    ) external payable nonReentrant returns (address token) {
        require(msg.value >= LAUNCH_FEE, "Hamr: launch fee");
        require(bytes(name_).length > 0 && bytes(symbol_).length > 0, "Hamr: empty meta");

        token = address(
            new HamrToken(
                name_,
                symbol_,
                logo_,
                description_,
                twitterUrl_,
                telegramUrl_,
                websiteUrl_,
                msg.sender,
                TOTAL_SUPPLY
            )
        );

        curves[token] = Curve({
            creator: msg.sender,
            virtualEth: uint128(VIRTUAL_ETH_START),
            virtualToken: uint128(VIRTUAL_TOKEN_START),
            realEth: 0,
            tokensSold: 0,
            graduated: false,
            exists: true
        });
        allTokens.push(token);
        protocolFeesEth += LAUNCH_FEE;

        emit TokenLaunched(token, msg.sender, name_, symbol_, logo_);

        uint256 firstBuy = msg.value - LAUNCH_FEE;
        if (firstBuy > 0) {
            _buy(token, msg.sender, firstBuy, minFirstBuyTokens);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Curve trading
    // ─────────────────────────────────────────────────────────────────

    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        _buy(token, msg.sender, msg.value, minTokensOut);
    }

    function _buy(
        address token,
        address buyer,
        uint256 msgValue,
        uint256 minTokensOut
    ) internal {
        Curve storage c = curves[token];
        require(c.exists, "Hamr: unknown token");
        require(!c.graduated, "Hamr: graduated - trade on Uniswap");
        require(msgValue > 0, "Hamr: zero buy");

        // Cap the buy so realEth never exceeds the graduation raise.
        // grossNeeded is the msg.value that lands exactly on the cap
        // after the 1% fee comes off.
        uint256 remaining = GRADUATION_RAISE - c.realEth;
        uint256 grossNeeded = (remaining * BPS + (BPS - FEE_BPS) - 1) / (BPS - FEE_BPS); // ceil
        uint256 effective = msgValue > grossNeeded ? grossNeeded : msgValue;
        uint256 ethIn = (effective * (BPS - FEE_BPS)) / BPS;
        if (ethIn > remaining) ethIn = remaining; // rounding belt & braces
        uint256 fee = effective - ethIn;
        uint256 refund = msgValue - effective;

        // Constant product: tokensOut = vTok − (vEth·vTok)/(vEth+ethIn)
        uint256 vEth = c.virtualEth;
        uint256 vTok = c.virtualToken;
        uint256 newVTok = (vEth * vTok) / (vEth + ethIn);
        uint256 tokensOut = vTok - newVTok;
        uint256 curveLeft = CURVE_SUPPLY - c.tokensSold;
        if (tokensOut > curveLeft) {
            tokensOut = curveLeft; // rounding guard at the boundary
            newVTok = vTok - tokensOut;
        }
        require(tokensOut >= minTokensOut, "Hamr: slippage");
        require(tokensOut > 0, "Hamr: dust buy");

        // Effects
        c.virtualEth = uint128(vEth + ethIn);
        c.virtualToken = uint128(newVTok);
        c.realEth += uint128(ethIn);
        c.tokensSold += uint128(tokensOut);
        uint256 creatorCut = (fee * CREATOR_BPS) / BPS;
        creatorFeesEth[token] += creatorCut;
        protocolFeesEth += fee - creatorCut;

        // Interactions
        require(HamrToken(token).transfer(buyer, tokensOut), "Hamr: token xfer");
        if (refund > 0) {
            (bool ok, ) = buyer.call{value: refund}("");
            require(ok, "Hamr: refund");
        }

        emit CurveBuy(token, buyer, ethIn, tokensOut, c.virtualEth);

        // Curve complete → graduate in the same tx (gas is cents on L2,
        // and the token becomes instantly tradable on Uniswap).
        if (c.realEth >= GRADUATION_RAISE) {
            _graduate(token);
        }
    }

    function sell(
        address token,
        uint256 tokenAmount,
        uint256 minEthOut
    ) external nonReentrant {
        Curve storage c = curves[token];
        require(c.exists, "Hamr: unknown token");
        require(!c.graduated, "Hamr: graduated - trade on Uniswap");
        require(tokenAmount > 0, "Hamr: zero sell");
        require(tokenAmount <= c.tokensSold, "Hamr: exceeds curve");

        // Inverse curve move: ethOut = vEth − (vEth·vTok)/(vTok+amount)
        uint256 vEth = c.virtualEth;
        uint256 vTok = c.virtualToken;
        uint256 newVEth = (vEth * vTok) / (vTok + tokenAmount);
        uint256 ethGross = vEth - newVEth;
        require(ethGross <= c.realEth, "Hamr: reserve"); // invariant belt
        uint256 fee = (ethGross * FEE_BPS) / BPS;
        uint256 ethNet = ethGross - fee;
        require(ethNet >= minEthOut, "Hamr: slippage");

        // Effects
        c.virtualEth = uint128(newVEth);
        c.virtualToken = uint128(vTok + tokenAmount);
        c.realEth -= uint128(ethGross);
        c.tokensSold -= uint128(tokenAmount);
        uint256 creatorCut = (fee * CREATOR_BPS) / BPS;
        creatorFeesEth[token] += creatorCut;
        protocolFeesEth += fee - creatorCut;

        // Interactions (transferFrom needs prior approve)
        require(
            HamrToken(token).transferFrom(msg.sender, address(this), tokenAmount),
            "Hamr: token xfer"
        );
        (bool ok, ) = msg.sender.call{value: ethNet}("");
        require(ok, "Hamr: eth xfer");

        emit CurveSell(token, msg.sender, tokenAmount, ethNet, c.virtualEth);
    }

    // ─────────────────────────────────────────────────────────────────
    // Graduation
    // ─────────────────────────────────────────────────────────────────

    /// @notice Permissionless backup trigger (normally fires inside the
    ///         final buy). Safe to call by anyone once the raise is full.
    function graduate(address token) external nonReentrant {
        Curve storage c = curves[token];
        require(c.exists, "Hamr: unknown token");
        require(!c.graduated, "Hamr: already graduated");
        require(c.realEth >= GRADUATION_RAISE, "Hamr: curve not complete");
        _graduate(token);
    }

    function _graduate(address token) internal {
        Curve storage c = curves[token];
        c.graduated = true; // effects first

        uint256 ethAmount = c.realEth; // == GRADUATION_RAISE
        c.realEth = 0;

        // 1) Wrap the raise.
        weth.deposit{value: ethAmount}();

        // 2) Pool ordering + closing price. price(eth per token) = vEth/vTok.
        address t0 = token < address(weth) ? token : address(weth);
        address t1 = t0 == token ? address(weth) : token;
        uint160 sqrtPriceX96 = _sqrtPriceX96(
            t0 == token, // token0 is the memecoin?
            c.virtualEth,
            c.virtualToken
        );

        positionManager.createAndInitializePoolIfNecessary(t0, t1, POOL_FEE, sqrtPriceX96);

        // 3) Approvals + full-range mint, LP straight into the locker.
        require(HamrToken(token).approve(address(positionManager), LP_SUPPLY), "Hamr: approve");
        require(weth.approve(address(positionManager), ethAmount), "Hamr: approve w");

        (uint256 amount0Desired, uint256 amount1Desired) = t0 == token
            ? (LP_SUPPLY, ethAmount)
            : (ethAmount, LP_SUPPLY);

        (uint256 tokenId, , uint256 used0, uint256 used1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: t0,
                token1: t1,
                fee: POOL_FEE,
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(locker),
                deadline: block.timestamp
            })
        );

        // 4) Register the lock so harvest/claims know the creator.
        locker.register(token, c.creator, tokenId, t0, t1);

        // 5) Dust: unpaired tokens are burned (dead address), unpaired
        //    WETH goes to the treasury. Amounts here are rounding-level.
        uint256 tokenUsed = t0 == token ? used0 : used1;
        uint256 wethUsed = t0 == token ? used1 : used0;
        uint256 tokenDust = LP_SUPPLY - tokenUsed;
        uint256 wethDust = ethAmount - wethUsed;
        if (tokenDust > 0) {
            HamrToken(token).transfer(0x000000000000000000000000000000000000dEaD, tokenDust);
        }
        if (wethDust > 0) {
            weth.transfer(treasury, wethDust);
        }

        emit Graduated(token, _poolOf(t0, t1), tokenId, wethUsed, tokenUsed);
    }

    /// @dev sqrtPriceX96 = sqrt(price1/0) · 2^96 at the curve's close.
    function _sqrtPriceX96(
        bool tokenIsToken0,
        uint256 vEth,
        uint256 vTok
    ) internal pure returns (uint160) {
        if (tokenIsToken0) {
            // price = weth per token = vEth/vTok. vEth ≈ 5.5e18 (< 2^63)
            // so (vEth << 192)/vTok fits 256 bits.
            return uint160(_sqrt((vEth << 192) / vTok));
        }
        // price = token per weth = vTok/vEth. vTok ≈ 3e26 would overflow
        // a 192-bit shift, so scale by 2^128 and shift the root by 2^32.
        return uint160(_sqrt((vTok << 128) / vEth) << 32);
    }

    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function _poolOf(address, address) internal pure returns (address) {
        // Emitted for indexer convenience; read path resolves the pool
        // from the position instead, so a zero here is acceptable.
        return address(0);
    }

    // ─────────────────────────────────────────────────────────────────
    // Fee claims (pull payments)
    // ─────────────────────────────────────────────────────────────────

    function claimCreatorFees(address token) external nonReentrant {
        Curve storage c = curves[token];
        require(c.exists, "Hamr: unknown token");
        require(msg.sender == c.creator, "Hamr: not creator");
        uint256 amount = creatorFeesEth[token];
        require(amount > 0, "Hamr: nothing owed");
        creatorFeesEth[token] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Hamr: eth xfer");
        emit CreatorFeesClaimed(token, msg.sender, amount);
    }

    /// @notice Anyone may trigger; always pays the immutable treasury.
    function claimProtocolFees() external nonReentrant {
        uint256 amount = protocolFeesEth;
        require(amount > 0, "Hamr: nothing owed");
        protocolFeesEth = 0;
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "Hamr: eth xfer");
        emit ProtocolFeesClaimed(amount);
    }

    // ─────────────────────────────────────────────────────────────────
    // Views for the frontend
    // ─────────────────────────────────────────────────────────────────

    function tokenCount() external view returns (uint256) {
        return allTokens.length;
    }

    /// @notice Quote a buy: tokens received for `ethValue` (fee incl).
    function quoteBuy(address token, uint256 ethValue) external view returns (uint256) {
        Curve storage c = curves[token];
        if (!c.exists || c.graduated) return 0;
        uint256 ethIn = (ethValue * (BPS - FEE_BPS)) / BPS;
        uint256 remaining = GRADUATION_RAISE - c.realEth;
        if (ethIn > remaining) ethIn = remaining;
        uint256 newVTok = (uint256(c.virtualEth) * c.virtualToken) / (c.virtualEth + ethIn);
        uint256 tokensOut = c.virtualToken - newVTok;
        uint256 curveLeft = CURVE_SUPPLY - c.tokensSold;
        return tokensOut > curveLeft ? curveLeft : tokensOut;
    }

    /// @notice Quote a sell: net ETH received for `tokenAmount`.
    function quoteSell(address token, uint256 tokenAmount) external view returns (uint256) {
        Curve storage c = curves[token];
        if (!c.exists || c.graduated || tokenAmount > c.tokensSold) return 0;
        uint256 newVEth = (uint256(c.virtualEth) * c.virtualToken) /
            (uint256(c.virtualToken) + tokenAmount);
        uint256 ethGross = c.virtualEth - newVEth;
        return ethGross - (ethGross * FEE_BPS) / BPS;
    }

    /// @notice Progress toward graduation in basis points (0–10000).
    function graduationProgressBps(address token) external view returns (uint256) {
        Curve storage c = curves[token];
        if (!c.exists) return 0;
        if (c.graduated) return BPS;
        return (uint256(c.realEth) * BPS) / GRADUATION_RAISE;
    }
}
