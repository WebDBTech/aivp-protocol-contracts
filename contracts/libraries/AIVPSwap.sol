// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ISwapRouter.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/IWrappedNative.sol";

/// @title AIVPSwap Library
/// @notice Library for handling token swaps through Uniswap V3 for the AIVP protocol
/// @dev Provides functionality for swapping ERC20 tokens and native tokens using Uniswap V3 pools
library AIVPSwap {
    using SafeERC20 for IERC20;

    /// @notice Uniswap V3 fee tiers in hundredths of a bip (i.e. 1e-6)
    /// @dev FEE_LOW = 0.05%, FEE_MEDIUM = 0.3%, FEE_HIGH = 1%
    uint24 private constant FEE_LOW = 500;
    uint24 private constant FEE_MEDIUM = 3000;
    uint24 private constant FEE_HIGH = 10000;

    /// @notice Error thrown when attempting to use swapERC20 with native token input
    error UseSwapNativeTokenForNativeInput();
    /// @notice Error thrown when msg.value doesn't match the specified amountIn for native token swaps
    error NativeTokenAmountMismatch();
    /// @notice Error thrown when no Uniswap V3 pool exists for the token pair
    error NoPoolFound();
    /// @notice Error thrown when native token transfer fails
    error NativeTokenTransferFailed();

    /// @notice Swaps an exact amount of ERC20 tokens for another token
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenIn The address of the input token
    /// @param tokenOut The address of the output token (use address(0) for native token)
    /// @param amountIn The exact amount of input tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @param deadline The Unix timestamp after which the transaction will revert
    /// @return The amount of output tokens received
    function swapERC20(
        ISwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) internal returns (uint256) {
        if (tokenIn == address(0)) revert UseSwapNativeTokenForNativeInput();

        // Cache address to save gas
        address router = address(swapRouter);

        // Transfer and approve in single call where possible
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(router, amountIn);

        return
            _swap(
                swapRouter,
                factory,
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMinimum,
                deadline
            );
    }

    /// @notice Swaps an exact amount of native tokens for another token
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenOut The address of the output token
    /// @param amountIn The exact amount of native tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @param deadline The Unix timestamp after which the transaction will revert
    /// @return The amount of output tokens received
    function swapNativeToken(
        ISwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn, 
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) internal returns (uint256) {
        if (msg.value != amountIn) revert NativeTokenAmountMismatch();

        // Wrap ETH
        IWrappedNative(tokenIn).deposit{value: amountIn}();

        return
            _swap(
                swapRouter,
                factory,
                tokenIn,
                tokenOut,
                amountIn,
                amountOutMinimum,
                deadline
            );
    }

    /// @notice Internal function to execute the swap through Uniswap V3
    /// @dev Finds the best pool and executes the swap with the specified parameters
    /// @param swapRouter The Uniswap V3 SwapRouter contract
    /// @param factory The Uniswap V3 Factory contract
    /// @param tokenIn The address of the input token
    /// @param tokenOut The address of the output token
    /// @param amountIn The exact amount of input tokens to swap
    /// @param amountOutMinimum The minimum amount of output tokens to receive
    /// @param deadline The Unix timestamp after which the transaction will revert
    /// @return amountOut The amount of output tokens received
    function _swap(
        ISwapRouter swapRouter,
        IUniswapV3Factory factory,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint256 deadline
    ) private returns (uint256 amountOut) {
        // Find pool with lowest fee
        uint24 selectedFee;
        {
            // Order tokens for pool lookup
            (address token0, address token1) = tokenIn < tokenOut
                ? (tokenIn, tokenOut)
                : (tokenOut, tokenIn);

            // Check pools in order of most common first
            if (factory.getPool(token0, token1, FEE_MEDIUM) != address(0)) {
                selectedFee = FEE_MEDIUM;
            } else if (factory.getPool(token0, token1, FEE_LOW) != address(0)) {
                selectedFee = FEE_LOW;
            } else if (
                factory.getPool(token0, token1, FEE_HIGH) != address(0)
            ) {
                selectedFee = FEE_HIGH;
            } else {
                revert NoPoolFound();
            }
        }

        // Perform swap
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: selectedFee,
                recipient: address(this),
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );

        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
    }
}
