// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

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
