// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {
    mapping(address => bool) public minters;

    constructor() ERC20("Mock USDT", "mUSDT") Ownable(msg.sender) {}

    modifier onlyMinter() {
        require(minters[msg.sender], "ONLY_MINTER");
        _;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    function burn(uint256 amount) external onlyMinter {
        _burn(msg.sender, amount);
    }
}