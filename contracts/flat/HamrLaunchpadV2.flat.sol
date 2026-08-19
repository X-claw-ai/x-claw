// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;



// ── Flattened build for compile + Blockscout verify ──

// solc 0.8.24 | optimizer 200 | viaIR | evm paris



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
    /// @notice HAMR treasury. Rotatable ONLY by itself (setTreasury) —
    ///         start from a dedicated EOA, hand off to a multisig later.
    ///         Not an admin key: affects only the protocol's own 25%.
    address public treasury;
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
    event TreasuryRotated(address indexed from, address indexed to);

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

    /// @notice Anyone may trigger; funds always go to the current treasury.
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

    /// @notice Self-rotation only: current treasury hands off to its
    ///         successor. Mirrors HamrLaunchpad.setTreasury.
    function setTreasury(address newTreasury) external {
        require(msg.sender == treasury, "Locker: not treasury");
        require(newTreasury != address(0), "Locker: zero treasury");
        treasury = newTreasury;
        emit TreasuryRotated(msg.sender, newTreasury);
    }

    /// @notice View helper for the dashboard "Claimable" card.
    function pendingCreator(
        address token
    ) external view returns (address t0, uint256 amt0, address t1, uint256 amt1) {
        Lock memory l = locks[token];
        return (l.token0, creatorOwed[token][l.token0], l.token1, creatorOwed[token][l.token1]);
    }
}

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
