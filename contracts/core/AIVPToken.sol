// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import {ERC20BurnableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import {ERC20PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import {ERC20PermitUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import {ERC20VotesUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {NoncesUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/// @title AIVP Token Contract
/// @notice Implementation of the AIVP token with governance and upgradeability features
/// @dev Extends multiple OpenZeppelin upgradeable contracts for enhanced functionality
contract AIVPToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    OwnableUpgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    /// @notice Prevents implementation contract from being initialized
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the AIVP token contract
    /// @dev Sets up the token with its name, symbol, and initial configuration
    /// @param initialOwner The address that will be granted ownership of the contract
    function initialize(address initialOwner) public initializer {
        __ERC20_init("AVIP", "AIVP");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __Ownable_init(initialOwner);
        __ERC20Permit_init("AVIP");
        __ERC20Votes_init();
        __UUPSUpgradeable_init();
    }

    /// @notice Pauses all token transfers
    /// @dev Can only be called by the contract owner
    function pause() public onlyOwner {
        _pause();
    }

    /// @notice Unpauses token transfers
    /// @dev Can only be called by the contract owner
    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Mints new tokens
    /// @dev Can only be called by the contract owner
    /// @param to The address that will receive the minted tokens
    /// @param amount The amount of tokens to mint
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /// @notice Returns the current timestamp as the clock value
    /// @return The current block timestamp cast to uint48
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    /// @notice Returns the description of the clock mode
    /// @return String indicating that timestamp is used for clock mode
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Can only be called by the contract owner
    /// @param newImplementation Address of the new implementation contract
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // The following functions are overrides required by Solidity.

    /// @notice Updates token balances and voting power
    /// @dev Internal function that extends the parent _update implementation
    /// @param from The address tokens are transferred from
    /// @param to The address tokens are transferred to
    /// @param value The amount of tokens transferred
    function _update(
        address from,
        address to,
        uint256 value
    )
        internal
        override(
            ERC20Upgradeable,
            ERC20PausableUpgradeable,
            ERC20VotesUpgradeable
        )
    {
        super._update(from, to, value);
    }

    /// @notice Gets the current nonce for an address
    /// @dev Required override to resolve inheritance conflict
    /// @param owner The address to get the nonce for
    /// @return The current nonce for the given address
    function nonces(
        address owner
    )
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
