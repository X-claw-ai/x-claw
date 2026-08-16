// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {INonfungiblePositionManager, IERC20Minimal} from "./interfaces/IUniswapV3.sol";

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
