// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICollateralVault {
    function getCollateral(address user) external view returns (uint256);
}

interface IMockUSDT {
    function mint(address to, uint256 amount) external;
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
}

contract BorrowRouter {
    ICollateralVault public immutable vault;
    IMockUSDT public immutable mockUSDT;
    uint256 public constant BNB_PRICE_USDT = 400e18;

    mapping(address => uint256) public borrowed;

    event Borrowed(address indexed user, uint256 amount);
    event Repaid(address indexed user, uint256 amount);

    constructor(address _vault, address _mockUSDT) {
        vault = ICollateralVault(_vault);
        mockUSDT = IMockUSDT(_mockUSDT);
    }

    function borrow(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");

        uint256 userCollateral = vault.getCollateral(msg.sender);
        require(userCollateral > 0, "NO_COLLATERAL");

        uint256 collateralValueInUsdt = (userCollateral * BNB_PRICE_USDT) / 1e18;
        uint256 maxBorrow = collateralValueInUsdt / 2;
        require(borrowed[msg.sender] + amount <= maxBorrow, "EXCEEDS_50_PERCENT_LIMIT");

        borrowed[msg.sender] += amount;
        mockUSDT.mint(msg.sender, amount);

        emit Borrowed(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        require(amount > 0, "ZERO_AMOUNT");
        require(borrowed[msg.sender] >= amount, "REPAY_TOO_HIGH");

        bool ok = mockUSDT.transferFrom(msg.sender, address(this), amount);
        require(ok, "TRANSFER_FAILED");

        mockUSDT.burn(amount);
        borrowed[msg.sender] -= amount;

        emit Repaid(msg.sender, amount);
    }
}
