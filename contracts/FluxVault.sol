// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FluxVault
 * @notice Holds USDC for DCA plans. Users deposit on plan creation;
 *         the owner (server) withdraws daily amounts for swaps and
 *         refunds remaining balance on cancellation.
 */
contract FluxVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    struct Plan {
        address user;
        uint256 totalAmount;   // total USDC deposited (6 decimals ERC-20)
        uint256 remaining;     // USDC still in vault
        uint256 days_;         // total days
        uint256 daysExecuted;  // how many days have run
        bool active;
    }

    mapping(bytes32 => Plan) public plans;

    event PlanCreated(bytes32 indexed planId, address indexed user, uint256 totalAmount, uint256 days_);
    event DayExecuted(bytes32 indexed planId, uint256 amount, uint256 remaining);
    event PlanCancelled(bytes32 indexed planId, uint256 refunded);

    // USDC ERC-20 on Arc Testnet: 0x3600000000000000000000000000000000000000
    constructor(address usdcAddress, address initialOwner) Ownable(initialOwner) {
        usdc = IERC20(usdcAddress);
    }

    // User calls this to create a DCA plan and deposit USDC
    function createPlan(bytes32 planId, uint256 totalAmount, uint256 numDays) external {
        require(plans[planId].user == address(0), "Plan already exists");
        require(totalAmount > 0 && numDays > 0, "Invalid params");

        usdc.safeTransferFrom(msg.sender, address(this), totalAmount);

        plans[planId] = Plan({
            user: msg.sender,
            totalAmount: totalAmount,
            remaining: totalAmount,
            days_: numDays,
            daysExecuted: 0,
            active: true
        });

        emit PlanCreated(planId, msg.sender, totalAmount, numDays);
    }

    // Owner (server/cron) withdraws daily portion to execute swap
    function executeDay(bytes32 planId) external onlyOwner returns (uint256 amount) {
        Plan storage p = plans[planId];
        require(p.active, "Plan not active");
        require(p.daysExecuted < p.days_, "Plan complete");

        uint256 daysLeft = p.days_ - p.daysExecuted;
        amount = p.remaining / daysLeft; // even split of what's left

        p.remaining -= amount;
        p.daysExecuted += 1;
        if (p.daysExecuted == p.days_) p.active = false;

        usdc.safeTransfer(owner(), amount);
        emit DayExecuted(planId, amount, p.remaining);
    }

    // Owner or user can cancel — refund remaining USDC to user
    function cancelPlan(bytes32 planId) external {
        Plan storage p = plans[planId];
        require(p.active, "Plan not active");
        require(msg.sender == p.user || msg.sender == owner(), "Not authorized");

        uint256 refund = p.remaining;
        p.remaining = 0;
        p.active = false;

        if (refund > 0) usdc.safeTransfer(p.user, refund);
        emit PlanCancelled(planId, refund);
    }

    // View plan info
    function getPlan(bytes32 planId) external view returns (Plan memory) {
        return plans[planId];
    }

    // Daily amount per execution
    function dailyAmount(bytes32 planId) external view returns (uint256) {
        Plan memory p = plans[planId];
        if (!p.active || p.daysExecuted >= p.days_) return 0;
        uint256 daysLeft = p.days_ - p.daysExecuted;
        return p.remaining / daysLeft;
    }
}
