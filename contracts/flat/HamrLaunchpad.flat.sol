// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

// ═══ HAMR Launchpad — flattened single-file build ═══
// Used for Remix compilation and Blockscout verification.

// ───────────────────────── src/interfaces/IUniswapV3.sol ─────────────────────────

/// Minimal Uniswap V3 periphery/core interfaces used by the HAMR
/// launchpad. Only the functions we actually call — keeps the audit
/// surface small and avoids a dependency install.

interface IWETH9 {
    function deposit() external payable;
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface IERC20Minimal {
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 value) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    function createAndInitializePoolIfNecessary(
        address token0,
        address token1,
        uint24 fee,
        uint160 sqrtPriceX96
    ) external payable returns (address pool);

    function mint(
        MintParams calldata params
    )
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    function collect(
        CollectParams calldata params
    ) external payable returns (uint256 amount0, uint256 amount1);

    function positions(
        uint256 tokenId
    )
        external
        view
        returns (
            uint96 nonce,
            address operator,
            address token0,
            address token1,
            uint24 fee,
            int24 tickLower,
            int24 tickUpper,
            uint128 liquidity,
            uint256 feeGrowthInside0LastX128,
            uint256 feeGrowthInside1LastX128,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        );

    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

// ───────────────────────── src/HamrToken.sol ─────────────────────────

/// @title HamrToken — fixed-supply memecoin deployed by the HAMR launchpad
/// @notice Deliberately boring ERC-20: no owner, no mint, no burn hooks,
///         no pause, no fees-on-transfer. The entire 1B supply is minted
///         once to the launchpad, which sells 800M along the bonding
///         curve and locks 200M + raised ETH into Uniswap V3 at
///         graduation. On-chain metadata (logo/description/socials) is
///         immutable after deployment so indexers can trust it.
contract HamrToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;

    // ── Immutable launch metadata ─────────────────────────────────────
    string public logo; // IPFS URI or https URL
    string public description; // short on-chain description
    string public twitterUrl;
    string public telegramUrl;
    string public websiteUrl;
    /// @notice The launchpad that deployed this token.
    address public immutable launchpad;
    /// @notice Wallet that created the launch (fee recipient on the curve).
    address public immutable creator;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _logo,
        string memory _description,
        string memory _twitterUrl,
        string memory _telegramUrl,
        string memory _websiteUrl,
        address _creator,
        uint256 _supply
    ) {
        name = _name;
        symbol = _symbol;
        logo = _logo;
        description = _description;
        twitterUrl = _twitterUrl;
        telegramUrl = _telegramUrl;
        websiteUrl = _websiteUrl;
        creator = _creator;
        launchpad = msg.sender;
        totalSupply = _supply;
        balanceOf[msg.sender] = _supply;
        emit Transfer(address(0), msg.sender, _supply);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "HamrToken: allowance");
            unchecked {
                allowance[from][msg.sender] = allowed - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "HamrToken: zero to");
        uint256 bal = balanceOf[from];
        require(bal >= value, "HamrToken: balance");
        unchecked {
            balanceOf[from] = bal - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }
}

// ───────────────────────── src/HamrFeeLocker.sol ─────────────────────────


/// @title HamrFeeLocker — permanent LP lock + 75/25 fee splitter
/// @notice Holds the Uniswap V3 LP NFT minted at graduation, forever.
///         There is NO function that can move the NFT out — liquidity
///         is locked for the life of the chain. Anyone can `harvest`
///         accrued swap fees; amounts are ledgered 75% to the token's
///         creator and 25% to the HAMR treasury, then withdrawn pull-
///         style so neither side can block the other.
contract HamrFeeLocker {
    uint256 public constant CREATOR_BPS = 7_500; // 75%
    uint256 public constant BPS = 10_000;

    INonfungiblePositionManager public immutable positionManager;
    /// @notice HAMR treasury — immutable, set once at deploy.
    address public immutable treasury;
    /// @notice The launchpad allowed to register graduated tokens.
    ///         One-shot wiring: settable exactly once by the deployer.
    address public launchpad;
    address private immutable _deployer;

    struct Lock {
        address creator;
        uint96 tokenId; // position ids fit comfortably
        address token0;
        address token1;
        bool exists;
    }

    /// token address → lock info
    mapping(address => Lock) public locks;

    /// Pull-payment ledgers, per token, per side of the pair.
    /// owed[token][currency][beneficiary] — flattened into explicit maps
    /// for gas + clarity. Currency is the actual ERC-20 address (WETH or
    /// the memecoin itself).
    mapping(address => mapping(address => uint256)) public creatorOwed; // token → currency → amount
    mapping(address => mapping(address => uint256)) public protocolOwed; // token → currency → amount

    bool private _entered;

    event LaunchpadSet(address launchpad);
    event Registered(address indexed token, address indexed creator, uint256 tokenId);
    event Harvested(address indexed token, uint256 amount0, uint256 amount1);
    event CreatorClaimed(address indexed token, address indexed currency, uint256 amount);
    event ProtocolClaimed(address indexed token, address indexed currency, uint256 amount);

    modifier nonReentrant() {
        require(!_entered, "Locker: reentrant");
        _entered = true;
        _;
        _entered = false;
    }

    constructor(address _positionManager, address _treasury) {
        require(_positionManager != address(0) && _treasury != address(0), "Locker: zero");
        positionManager = INonfungiblePositionManager(_positionManager);
        treasury = _treasury;
        _deployer = msg.sender;
    }

    /// @notice One-shot wiring of the launchpad address. The deployer
    ///         cannot re-point it later, and has no other powers.
    function setLaunchpad(address _launchpad) external {
        require(msg.sender == _deployer, "Locker: not deployer");
        require(launchpad == address(0), "Locker: already set");
        require(_launchpad != address(0), "Locker: zero");
        launchpad = _launchpad;
        emit LaunchpadSet(_launchpad);
    }

    /// @notice Called by the launchpad right after it mints the
    ///         graduation LP position with this locker as recipient.
    function register(
        address token,
        address creator,
        uint256 tokenId,
        address token0,
        address token1
    ) external {
        require(msg.sender == launchpad, "Locker: not launchpad");
        require(!locks[token].exists, "Locker: registered");
        require(creator != address(0), "Locker: zero creator");
        locks[token] = Lock({
            creator: creator,
            tokenId: uint96(tokenId),
            token0: token0,
            token1: token1,
            exists: true
        });
        emit Registered(token, creator, tokenId);
    }

    /// @notice Accept LP NFTs only from the canonical position manager.
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view returns (bytes4) {
        require(msg.sender == address(positionManager), "Locker: bad NFT");
        return this.onERC721Received.selector;
    }

    /// @notice Permissionless: collect accrued V3 swap fees for `token`
    ///         and split them into the pull ledgers. HAMR runs a cron
    ///         that calls this daily; anyone else may too.
    function harvest(address token) public nonReentrant {
        Lock memory l = locks[token];
        require(l.exists, "Locker: unknown token");

        (uint256 amount0, uint256 amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: l.tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        if (amount0 > 0) _ledger(token, l.token0, amount0);
        if (amount1 > 0) _ledger(token, l.token1, amount1);
        emit Harvested(token, amount0, amount1);
    }

    function _ledger(address token, address currency, uint256 amount) internal {
        uint256 creatorCut = (amount * CREATOR_BPS) / BPS;
        creatorOwed[token][currency] += creatorCut;
        protocolOwed[token][currency] += amount - creatorCut;
    }

    /// @notice Creator pulls their accrued 75% (both currencies).
    function claimCreator(address token) external nonReentrant {
        Lock memory l = locks[token];
        require(l.exists, "Locker: unknown token");
        require(msg.sender == l.creator, "Locker: not creator");
        _payout(token, l.token0, creatorOwed, l.creator);
        _payout(token, l.token1, creatorOwed, l.creator);
    }

    /// @notice Anyone may trigger; funds always go to the immutable treasury.
    function claimProtocol(address token) external nonReentrant {
        Lock memory l = locks[token];
        require(l.exists, "Locker: unknown token");
        _payout(token, l.token0, protocolOwed, treasury);
        _payout(token, l.token1, protocolOwed, treasury);
    }

    function _payout(
        address token,
        address currency,
        mapping(address => mapping(address => uint256)) storage owed,
        address to
    ) internal {
        uint256 amount = owed[token][currency];
        if (amount == 0) return;
        owed[token][currency] = 0;
        require(IERC20Minimal(currency).transfer(to, amount), "Locker: transfer");
        if (to == treasury) {
            emit ProtocolClaimed(token, currency, amount);
        } else {
            emit CreatorClaimed(token, currency, amount);
        }
    }

    /// @notice Convenience: harvest + both claims in one tx (cron use).
    function harvestAndDistribute(address token) external {
        harvest(token);
        this.claimProtocol(token);
    }

    /// @notice View helper for the dashboard "Claimable" card.
    function pendingCreator(
        address token
    ) external view returns (address t0, uint256 amt0, address t1, uint256 amt1) {
        Lock memory l = locks[token];
        return (l.token0, creatorOwed[token][l.token0], l.token1, creatorOwed[token][l.token1]);
    }
}

// ───────────────────────── src/HamrLaunchpad.sol ─────────────────────────


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

    /// @dev Packed into a struct to keep launchToken's stack shallow —
    ///      eight loose string params blow the EVM's 16-slot limit
    ///      ("stack too deep"). Same pattern Pons uses.
    struct LaunchParams {
        string name;
        string symbol;
        string logo;
        string description;
        string twitterUrl;
        string telegramUrl;
        string websiteUrl;
    }

    /// @notice Deploy a new memecoin and open its bonding curve.
    ///         Any ETH beyond LAUNCH_FEE becomes the creator's first buy.
    function launchToken(
        LaunchParams calldata p,
        uint256 minFirstBuyTokens
    ) external payable nonReentrant returns (address token) {
        require(msg.value >= LAUNCH_FEE, "Hamr: launch fee");
        require(bytes(p.name).length > 0 && bytes(p.symbol).length > 0, "Hamr: empty meta");

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

        emit TokenLaunched(token, msg.sender, p.name, p.symbol, p.logo);

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

    /// @dev Split across two frames (_graduate → _mintLp) so neither
    ///      blows the EVM's 16-slot stack limit without needing viaIR.
    function _graduate(address token) internal {
        Curve storage c = curves[token];
        c.graduated = true; // effects first

        uint256 ethAmount = c.realEth; // == GRADUATION_RAISE
        c.realEth = 0;

        // 1) Wrap the raise.
        weth.deposit{value: ethAmount}();

        // 2) Pool ordering + closing price. price(eth per token) = vEth/vTok.
        bool tokenIs0 = token < address(weth);

        positionManager.createAndInitializePoolIfNecessary(
            tokenIs0 ? token : address(weth),
            tokenIs0 ? address(weth) : token,
            POOL_FEE,
            _sqrtPriceX96(tokenIs0, c.virtualEth, c.virtualToken)
        );

        // 3) Approvals + full-range mint, LP straight into the locker.
        HamrToken(token).approve(address(positionManager), LP_SUPPLY);
        weth.approve(address(positionManager), ethAmount);

        (uint256 tokenId, uint256 tokenUsed, uint256 wethUsed) = _mintLp(
            token,
            tokenIs0,
            ethAmount
        );

        // 4) Register the lock so harvest/claims know the creator.
        locker.register(
            token,
            c.creator,
            tokenId,
            tokenIs0 ? token : address(weth),
            tokenIs0 ? address(weth) : token
        );

        // 5) Dust: unpaired tokens are burned (dead address), unpaired
        //    WETH goes to the treasury. Amounts here are rounding-level.
        if (LP_SUPPLY > tokenUsed) {
            HamrToken(token).transfer(
                0x000000000000000000000000000000000000dEaD,
                LP_SUPPLY - tokenUsed
            );
        }
        if (ethAmount > wethUsed) {
            weth.transfer(treasury, ethAmount - wethUsed);
        }

        emit Graduated(token, address(0), tokenId, wethUsed, tokenUsed);
    }

    function _mintLp(
        address token,
        bool tokenIs0,
        uint256 ethAmount
    ) internal returns (uint256 tokenId, uint256 tokenUsed, uint256 wethUsed) {
        (uint256 a0, uint256 a1) = tokenIs0
            ? (LP_SUPPLY, ethAmount)
            : (ethAmount, LP_SUPPLY);

        (uint256 id, , uint256 used0, uint256 used1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: tokenIs0 ? token : address(weth),
                token1: tokenIs0 ? address(weth) : token,
                fee: POOL_FEE,
                tickLower: TICK_LOWER,
                tickUpper: TICK_UPPER,
                amount0Desired: a0,
                amount1Desired: a1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(locker),
                deadline: block.timestamp
            })
        );
        tokenId = id;
        tokenUsed = tokenIs0 ? used0 : used1;
        wethUsed = tokenIs0 ? used1 : used0;
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

