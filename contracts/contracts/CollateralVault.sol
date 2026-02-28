// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IBorrowRouter {
    function borrowed(address user) external view returns (uint256);
}

contract CollateralVault {
    mapping(address => uint256) public collateral;
    address public owner;
    address public borrowRouter;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "ONLY_OWNER");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setBorrowRouter(address _borrowRouter) external onlyOwner {
        require(_borrowRouter != address(0), "ZERO_ROUTER");
        borrowRouter = _borrowRouter;
    }

    function deposit() external payable {
        require(msg.value > 0, "ZERO_DEPOSIT");
        collateral[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw() external {
        uint256 userCollateral = collateral[msg.sender];
        require(userCollateral > 0, "NO_COLLATERAL");

        if (borrowRouter != address(0)) {
            uint256 outstandingBorrow = IBorrowRouter(borrowRouter).borrowed(msg.sender);
            require(outstandingBorrow == 0, "REPAY_FIRST");
        }

        collateral[msg.sender] = 0;
        (bool ok, ) = payable(msg.sender).call{value: userCollateral}("");
        require(ok, "WITHDRAW_FAILED");

        emit Withdrawn(msg.sender, userCollateral);
    }

    function getUserCollateral() external view returns (uint256) {
        return collateral[msg.sender];
    }

    function getCollateral(address user) external view returns (uint256) {
        return collateral[user];
    }
}
