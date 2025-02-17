// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IV3SwapRouter.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/IWrappedNative.sol";
import "../libraries/TransferHelper.sol";

/// @title AIVPSwap Library
/// @notice Library for handling token swaps through Uniswap V3 for the AIVP protocol
/// @dev Provides functionality for swapping ERC20 tokens and native tokens using Uniswap V3 pools
library UniswapHelper {
    /// @notice Uniswap V3 fee tiers in hundredths of a bip (i.e. 1e-6)
    /// @dev FEE_LOW = 0.05%, FEE_MEDIUM = 0.3%, FEE_HIGH = 1%
    uint24 private constant FEE_LOW = 500;
    uint24 private constant FEE_MEDIUM = 3000;
    uint24 private constant FEE_HIGH = 10000;

    /// @notice Error thrown when no Uniswap V3 pool exists for the token pair
    error NoPoolFound();

    /// @notice Swaps an exact amount of ERC20 tokens for another token
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenIn The address of the input token
    /// @param tokenOut The address of the output token (use address(0) for native token)
    /// @param amountIn The exact amount of input tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @param intermediary The intermediary token (e.g. WETH) for multi-hop if needed
    /// @return The amount of output tokens received
    function swapERC20(
        IV3SwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address intermediary
    ) internal returns (uint256) {
        return
            _swap(
                swapRouter,
                factory,
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMinimum,
                intermediary
            );
    }

    /// @notice Swaps an exact amount of native tokens for another token
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenOut The address of the output token
    /// @param amountIn The exact amount of native tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @return The amount of output tokens received
    function swapNativeToken(
        IV3SwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum
    ) internal returns (uint256) {
        IWrappedNative(tokenIn).deposit{value: amountIn}();
        return
            _swap(
                swapRouter,
                factory,
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMinimum,
                address(0)
            );
    }

     /// @notice Internal function to execute the swap through Uniswap V3.
    /// @dev First attempts a direct single-hop swap. If no direct pool is found, it falls back to a multi-hop swap using the provided intermediary.
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenIn The address of the input token
    /// @param tokenOut The address of the output token
    /// @param amountIn The exact amount of input tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @param intermediary The intermediary token (e.g. WETH) for multi-hop if needed
    /// @return amountOut The amount of output tokens received
    function _swap(
        IV3SwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        address intermediary
    ) private returns (uint256 amountOut) {
        // Approve tokens for swap
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);

        // --- Attempt a direct single-hop swap ---
        uint24 selectedFee;
        bool directPoolFound = false;
        {
            // Order tokens for pool lookup
            (address token0, address token1) = tokenIn < tokenOut
                ? (tokenIn, tokenOut)
                : (tokenOut, tokenIn);
            if (factory.getPool(token0, token1, FEE_MEDIUM) != address(0)) {
                selectedFee = FEE_MEDIUM;
                directPoolFound = true;
            } else if (factory.getPool(token0, token1, FEE_LOW) != address(0)) {
                selectedFee = FEE_LOW;
                directPoolFound = true;
            } else if (
                factory.getPool(token0, token1, FEE_HIGH) != address(0)
            ) {
                selectedFee = FEE_HIGH;
                directPoolFound = true;
            }
        }

        if (directPoolFound) {
            // Execute the direct swap
            amountOut = swapRouter.exactInputSingle(
                IV3SwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenOut,
                    fee: selectedFee,
                    recipient: msg.sender,
                    amountIn: amountIn,
                    amountOutMinimum: amountOutMinimum,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // --- Fallback: Multi-hop swap via the intermediary token ---
            require(
                intermediary != address(0),
                "Intermediary required for multi-hop"
            );

            // Find fee for tokenIn -> intermediary
            uint24 feeIn;
            bool poolFoundIn = false;
            {
                (address token0, address token1) = tokenIn < intermediary
                    ? (tokenIn, intermediary)
                    : (intermediary, tokenIn);
                if (factory.getPool(token0, token1, FEE_MEDIUM) != address(0)) {
                    feeIn = FEE_MEDIUM;
                    poolFoundIn = true;
                } else if (
                    factory.getPool(token0, token1, FEE_LOW) != address(0)
                ) {
                    feeIn = FEE_LOW;
                    poolFoundIn = true;
                } else if (
                    factory.getPool(token0, token1, FEE_HIGH) != address(0)
                ) {
                    feeIn = FEE_HIGH;
                    poolFoundIn = true;
                }
            }
            // Find fee for intermediary -> tokenOut
            uint24 feeOut;
            bool poolFoundOut = false;
            {
                (address token0, address token1) = intermediary < tokenOut
                    ? (intermediary, tokenOut)
                    : (tokenOut, intermediary);
                if (factory.getPool(token0, token1, FEE_MEDIUM) != address(0)) {
                    feeOut = FEE_MEDIUM;
                    poolFoundOut = true;
                } else if (
                    factory.getPool(token0, token1, FEE_LOW) != address(0)
                ) {
                    feeOut = FEE_LOW;
                    poolFoundOut = true;
                } else if (
                    factory.getPool(token0, token1, FEE_HIGH) != address(0)
                ) {
                    feeOut = FEE_HIGH;
                    poolFoundOut = true;
                }
            }
            if (!poolFoundIn || !poolFoundOut) {
                revert NoPoolFound();
            }

            // Build the multi-hop path: tokenIn -> feeIn -> intermediary -> feeOut -> tokenOut
            bytes memory path = abi.encodePacked(
                tokenIn,
                feeIn,
                intermediary,
                feeOut,
                tokenOut
            );

            // Execute the multi-hop swap
            amountOut = swapRouter.exactInput(
                IV3SwapRouter.ExactInputParams({
                    path: path,
                    recipient: msg.sender, 
                    amountIn: amountIn,
                    amountOutMinimum: amountOutMinimum
                })
            );
        }
    }
}
