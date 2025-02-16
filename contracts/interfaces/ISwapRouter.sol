// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title Swap Router Interface
/// @notice Interface for executing swaps on Uniswap V3
interface ISwapRouter {
    /// @notice Parameters for single-hop exact input swaps
    /// @param tokenIn The contract address of the input token
    /// @param tokenOut The contract address of the output token
    /// @param fee The pool's fee in hundredths of a bip (i.e. 1e-6)
    /// @param recipient The address that will receive the output tokens
    /// @param deadline The Unix timestamp after which the transaction will revert
    /// @param amountIn The exact amount of input tokens to send
    /// @param amountOutMinimum The minimum amount of output tokens that must be received
    /// @param sqrtPriceLimitX96 The price limit for the trade, encoded as a sqrt(price) Q64.96 value
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    /// @notice Swaps an exact amount of input tokens for as many output tokens as possible
    /// @param params The parameters for the swap, encoded as ExactInputSingleParams
    /// @return amountOut The amount of output tokens received
    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external payable returns (uint256 amountOut);
}
