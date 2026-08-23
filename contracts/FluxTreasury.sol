// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FluxTreasury
 * @notice Collects swap fees for FluxAgent on Arc Testnet.
 *         The owner (deployer) can withdraw accumulated fees at any time.
 */
contract FluxTreasury is Ownable {
    using SafeERC20 for IERC20;

    // Fee basis points (10 = 0.1%)
    uint256 public feeBps = 10;

    event FeeReceived(address indexed token, address indexed from, uint256 amount);
    event FeeWithdrawn(address indexed token, address indexed to, uint256 amount);
    event FeeBpsUpdated(uint256 oldBps, uint256 newBps);

    constructor(address initialOwner) Ownable(initialOwner) {}

    // Accept native USDC (ETH-like) fees
    receive() external payable {
        emit FeeReceived(address(0), msg.sender, msg.value);
    }

    // Deposit ERC-20 fee (EURC, cirBTC, etc.)
    function depositFee(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit FeeReceived(token, msg.sender, amount);
    }

    // Withdraw native token
    function withdrawNative(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        to.transfer(amount);
        emit FeeWithdrawn(address(0), to, amount);
    }

    // Withdraw ERC-20 token
    function withdrawToken(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit FeeWithdrawn(token, to, amount);
    }

    // Update fee rate (owner only, max 5%)
    function setFeeBps(uint256 newBps) external onlyOwner {
        require(newBps <= 500, "Fee too high");
        emit FeeBpsUpdated(feeBps, newBps);
        feeBps = newBps;
    }

    // View balances
    function nativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function tokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}
