// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Uniswap V3 Factory Interface
/// @notice Interface for interacting with the Uniswap V3 Factory contract
/// @dev This interface provides functionality to query Uniswap V3 pools
interface IUniswapV3Factory {
    /// @notice Fetches a pool address for a given pair of tokens and fee tier
    /// @param tokenA The contract address of the first token
    /// @param tokenB The contract address of the second token
    /// @param fee The fee tier of the pool - can be 500 (0.05%), 3000 (0.3%), or 10000 (1%)
    /// @return pool The address of the pool for the token pair and fee tier, or address(0) if it doesn't exist
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}
