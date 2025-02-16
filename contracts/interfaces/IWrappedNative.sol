// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Wrapped Native Token Interface
/// @notice Interface for interacting with wrapped versions of native blockchain tokens (e.g. WETH)
/// @dev Implements basic deposit/withdraw functionality to wrap/unwrap native tokens
interface IWrappedNative {
    /// @notice Deposits native tokens to receive wrapped tokens
    /// @dev The amount deposited is determined by msg.value
    function deposit() external payable;

    /// @notice Withdraws native tokens by burning wrapped tokens
    /// @param amount The amount of wrapped tokens to burn and withdraw as native tokens
    /// @dev Caller must have sufficient wrapped token balance
    function withdraw(uint256 amount) external;
}
