# AIVP – AI Value Protocol

AIVP is a blockchain-based protocol designed to verify, certify, and incentivize AI projects by recording their value on-chain. It cuts through the BS by addressing issues like lack of value verification, ethical concerns, and fraudulent practices—delivering a transparent, decentralized ecosystem where AI projects register, report their value, and get rewarded via token economics.

## Overview

- **Project Registration:**  
  AI projects register with detailed metadata (name, description, website, logo, socials) and pay a small fee (0.0001 ETH) to ensure commitment.
- **Value Processing:**  
  Projects report delivered value using native tokens or ERC20 tokens. A 5% fee is deducted, and 4.5% of that is automatically swapped for AIVP tokens via Uniswap V3.

- **Token Economics:**  
  The AIVP token acts as the medium of exchange, reward, and governance mechanism.

- **Upgradeable & Secure:**  
  Built with OpenZeppelin’s upgradeable contracts and role-based access control for robust security and future upgrades.

- **Interoperability:**  
  Designed to work across multiple EVM-compatible networks (e.g., Ethereum, Polygon, Base).

## Smart Contract Architecture

The main contract (`AIVP.sol`) implements the following core functions:

### Registration

- **`registerProject(RegistrationInfo calldata _info)`**  
  Registers a new project by storing its metadata (name, description, website, logo, socials). A small fee (0.0001 ETH) is required to prevent spam.

### Update

- **`updateProject(uint256 _projectId, RegistrationInfo calldata _info)`**  
  Allows admins (with DEFAULT_ADMIN_ROLE) to update existing project details.

### Value Processing

- **`processValueNativeToken(uint256 _projectId, uint256 _amount)`**  
  Processes native token value. It deducts a 5% fee (4.5% of which is swapped for AIVP tokens via Uniswap), updates the project’s token claim, and records the processed value.

- **`processValueERC20(uint256 _projectId, address _tokenAddress, uint256 _amount)`**  
  Similar to native token processing but handles ERC20 tokens.

### Fee Withdrawal

- **`withdrawPlatformFees(address _tokenAddress)`**  
  Admin-only function to withdraw accumulated fees (whether native or ERC20 tokens).

### Upgradeability & Access Control

- Utilizes OpenZeppelin’s UUPS upgradeable pattern and role-based access control to maintain a secure and maintainable contract.

## Deployment

The contract is deployed on Ethereum Sepolia at:

```bash
0xeEdaE880A3D99A2E513C33c811F1C34b2998462d
```

### Prerequisites

- **Solidity Version:** ^0.8.26
- **Libraries:** OpenZeppelin Contracts Upgradeable, Uniswap V3 Router/Factory interfaces
- **Tools:** Hardhat (or Truffle) for deployment and testing

### Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/WebDBTech/aivp-protocol-contracts.git
   cd aivp-protocol-contracts
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Configure Deployment:**

   Update hardhat.config.js (or your preferred configuration file) with the correct network settings and addresses for:

   - **AIVP Token**
   - **WETH Address**
   - **Uniswap V3 Router**
   - **Uniswap V3 Factory**

### Deployment Command (Using Hardhat)

    ```bash
    npx hardhat run scripts/deploy.js --network sepolia
    ```

## Usage

### Registering a Project

Call `registerProject` with a `RegistrationInfo` struct containing:

- `name` – Project name
- `description` – Project details
- `website` – URL of the project website
- `logo` – URL to the project logo
- `socials` – Array of social links

A payment of 0.0001 ETH is required to cover the registration fee.

### Reporting Value

- **Native Token Reporting:**  
  Use `processValueNativeToken` to report value in native tokens. A 5% fee is applied; 4.5% of the reported value is swapped for AIVP tokens using Uniswap and recorded.

- **ERC20 Token Reporting:**  
  Use `processValueERC20` to report value in any ERC20 token. The same fee mechanism is applied as in native token reporting.

### Withdrawing Fees

Admins can withdraw the protocol’s accumulated fees by calling `withdrawPlatformFees`.

## Testing

Run tests with Hardhat (or your preferred testing framework):

    ```bash
    npx hardhat test
    ```

## Contributing

No sugar-coating here—if you find a bug or have a constructive suggestion, open an issue or submit a pull request with clear details. We're all about solutions that work.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For security issues or other inquiries, reach out at: [security@aivp.io](mailto:security@aivp.io)
