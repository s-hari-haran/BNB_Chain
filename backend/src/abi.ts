export const vaultAbi = [
  "function notifyHealth(address user, uint256 riskProbabilityBps) external",
  "function vaults(address user) external view returns (uint256 collateral, uint256 borrowed, uint8 mode, uint256 maxProbability, bool protectedMode)",
  "event AutoProtectionTriggered(address indexed user, uint256 repaidAmount, uint256 riskProbabilityBps)"
];
