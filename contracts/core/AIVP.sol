// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IV3SwapRouter.sol";
import "../interfaces/IUniswapV3Factory.sol";
import "../interfaces/IAIVP.sol";
import "../libraries/UniswapHelper.sol";
import "../libraries/TransferHelper.sol";

/**
 * @title AIVP (AI Value Protocol)
 * @notice Main contract for managing AI project registration and value processing
 * @dev Implements upgradeable pattern with access control
 * @custom:security-contact security@aivp.io
 */
contract AIVP is
    Initializable,
    IAIVP,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    // Constants
    /// @notice Fee required for self-registration of projects (0.0001 ETH)
    uint256 private constant SELF_REGISTRATION_FEE = 0.0001 ether;
    /// @notice Role identifier for accounts that can upgrade the contract
    bytes32 private constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    /// @notice Numerator for protocol fee calculation (5% fee)
    uint256 private constant PROTOCOL_FEE_NUMERATOR = 500;
    /// @notice Numerator for AIVP token share calculation (90% of protocol fee)
    uint256 private constant AIVP_SHARE_NUMERATOR = 9000;
    /// @notice Denominator for fee calculation
    uint256 private constant SHARE_DENOMINATOR = 10000;
    /// @notice Time offset for swap deadline (5 minutes)
    uint256 private constant SWAP_DEADLINE_OFFSET = 300;

    // State variables
    /// @notice Counter for generating unique project IDs
    uint256 private projectIdCounter;
    /// @notice Address of the AIVP token contract
    address public aivpToken;
    /// @notice Address of the WETH token contract
    address public weth;
    /// @notice Interface for Uniswap V3 Router
    IV3SwapRouter public swapRouter;
    /// @notice Interface for Uniswap V3 Factory
    IUniswapV3Factory public swapFactory;

    // Mappings
    /// @notice Maps project IDs to their corresponding Project structs
    mapping(uint256 => Project) public projects;
    /// @notice Maps owner addresses to arrays of their project IDs
    mapping(address => uint256[]) public projectsByOwner;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract with required addresses
    /// @param _aivpToken Address of the AIVP token contract
    /// @param _weth Address of the WETH token contract
    /// @param _router Address of the Uniswap V3 Router
    /// @param _factory Address of the Uniswap V3 Factory
    function initialize(
        address _aivpToken,
        address _weth,
        address _router,
        address _factory
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        if (
            _aivpToken == address(0) ||
            _weth == address(0) ||
            _router == address(0) ||
            _factory == address(0)
        ) revert("Invalid addresses");

        aivpToken = _aivpToken;
        weth = _weth;
        swapRouter = IV3SwapRouter(_router);
        swapFactory = IUniswapV3Factory(_factory);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /// @notice Registers a new project in the protocol
    /// @param _info Project registration details including name, description, etc.
    /// @dev Requires payment of SELF_REGISTRATION_FEE in native token
    function registerProject(RegistrationInfo calldata _info) external payable {
        if (msg.value < SELF_REGISTRATION_FEE) revert InsufficientFee();
        if (!_isValidRegistrationInfo(_info)) revert InvalidRegistrationInfo();

        uint256 projectId = projectIdCounter++;
        Project storage newProject = projects[projectId];

        newProject.id = projectId;
        newProject.owner = msg.sender;
        newProject.name = _info.name;
        newProject.description = _info.description;
        newProject.website = _info.website;
        newProject.logo = _info.logo;

        uint256 socialsLength = _info.socials.length;
        for (uint256 i; i < socialsLength; ) {
            newProject.socials.push(_info.socials[i]);
            unchecked {
                ++i;
            }
        }

        projectsByOwner[msg.sender].push(projectId);

        emit ProjectRegistered(projectId, _info.name);
    }

    /// @notice Updates an existing project's information
    /// @param _projectId ID of the project to update
    /// @param _info New project details
    /// @dev Can only be called by accounts with DEFAULT_ADMIN_ROLE
    function updateProject(
        uint256 _projectId,
        RegistrationInfo calldata _info
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_isValidRegistrationInfo(_info)) revert InvalidRegistrationInfo();

        Project storage project = projects[_projectId];
        project.name = _info.name;
        project.description = _info.description;
        project.website = _info.website;
        project.logo = _info.logo;

        uint256 socialsLength = _info.socials.length;
        project.socials = new string[](socialsLength);

        for (uint256 i; i < socialsLength; ) {
            project.socials[i] = _info.socials[i];
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Retrieves all projects owned by a specific address
    /// @param _owner Address of the project owner
    /// @return Array of Project structs owned by the address
    function getProjectsByOwner(
        address _owner
    ) external view returns (Project[] memory) {
        uint256[] memory projectIds = projectsByOwner[_owner];
        uint256 projectsLength = projectIds.length;
        Project[] memory userProjects = new Project[](projectsLength);

        for (uint256 i; i < projectsLength; ) {
            userProjects[i] = projects[projectIds[i]];
            unchecked {
                ++i;
            }
        }

        return userProjects;
    }

    /// @notice Get all registered projects
    /// @dev Returns an array of all projects that have been registered
    /// @return Project[] Array containing all registered project details
    function getAllProjects() external view returns (Project[] memory) {
        uint256 projectsLength = projectIdCounter;
        Project[] memory allProjects = new Project[](projectsLength);

        for (uint256 i; i < projectsLength; ) {
            allProjects[i] = projects[i];
            unchecked {
                ++i;
            }
        }

        return allProjects;
    }

    /// @notice Process native token value for a project
    /// @param _projectId ID of the project
    /// @param _amount Amount of native tokens to process
    /// @dev Takes a 5% protocol fee, of which 4.5% is converted to AIVP tokens
    function processValueNativeToken(
        uint256 _projectId,
        uint256 _amount
    ) external payable {
        if (projects[_projectId].owner == address(0)) revert ProjectNotFound();

        uint256 protocolShare = (_amount * PROTOCOL_FEE_NUMERATOR) /
            SHARE_DENOMINATOR; // 5%
        uint256 aivpShare = (protocolShare * AIVP_SHARE_NUMERATOR) /
            SHARE_DENOMINATOR; // 4.5%

        if (msg.value < protocolShare) revert InsufficientFee();

        uint256 aivpTokenAmount = UniswapHelper.swapNativeToken(
            swapRouter,
            swapFactory,
            weth,
            aivpToken,
            aivpShare,
            0
        );

        projects[_projectId].claimedAIVP += aivpTokenAmount;
        _addTokenToProject(_projectId, address(0), _amount);

        emit ValueAdded(_projectId, address(0), _amount);
    }

    /// @notice Process ERC20 token value for a project
    /// @param _projectId ID of the project
    /// @param _tokenAddress Address of the ERC20 token
    /// @param _amount Amount of tokens to process
    /// @dev Takes a 5% protocol fee, of which 4.5% is converted to AIVP tokens
    function processValueERC20(
        uint256 _projectId,
        address _tokenAddress,
        uint256 _amount
    ) external {
        if (projects[_projectId].owner == address(0)) revert ProjectNotFound();

        uint256 protocolShare = (_amount * PROTOCOL_FEE_NUMERATOR) /
            SHARE_DENOMINATOR; // 5%
        uint256 aivpShare = (protocolShare * AIVP_SHARE_NUMERATOR) /
            SHARE_DENOMINATOR; // 4.5%

        TransferHelper.safeTransferFrom(
            _tokenAddress,
            msg.sender,
            address(this),
            protocolShare
        );

        uint256 aivpTokenAmount = UniswapHelper.swapERC20(
            swapRouter,
            swapFactory,
            _tokenAddress,
            aivpToken,
            aivpShare,
            0,
            weth
        );

        projects[_projectId].claimedAIVP += aivpTokenAmount;
        _addTokenToProject(_projectId, _tokenAddress, _amount);

        emit ValueAdded(_projectId, _tokenAddress, _amount);
    }

    /// @notice Adds or updates token amount for a project
    /// @param _projectId ID of the project
    /// @param _tokenAddress Address of the token (address(0) for native token)
    /// @param _amount Amount of tokens to add
    /// @dev Internal function to track processed value per token
    function _addTokenToProject(
        uint256 _projectId,
        address _tokenAddress,
        uint256 _amount
    ) private {
        ValueProcessed[] storage valueProcessed = projects[_projectId]
            .valueProcessed;
        uint256 len = valueProcessed.length;

        unchecked {
            for (uint256 i; i < len; ) {
                if (valueProcessed[i].token == _tokenAddress) {
                    valueProcessed[i].amount += _amount;
                    return;
                }
                ++i;
            }
        }

        valueProcessed.push(ValueProcessed(_tokenAddress, _amount));
    }

    /// @notice Allows admin to withdraw accumulated platform fees
    /// @param _tokenAddress Address of token to withdraw (address(0) for native token)
    /// @dev Only callable by accounts with DEFAULT_ADMIN_ROLE
    function withdrawPlatformFees(
        address _tokenAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_tokenAddress == address(0)) {
            uint256 balance = address(this).balance;
            (bool success, ) = msg.sender.call{value: balance}("");
            require(success, "Transfer failed");
        } else {
            IERC20 token = IERC20(_tokenAddress);
            uint256 balance = token.balanceOf(address(this));
            require(token.transfer(msg.sender, balance), "Transfer failed");
        }
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @param newImplementation Address of new implementation contract
    /// @dev Only callable by accounts with UPGRADER_ROLE
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}

    /// @notice Validates project registration information
    /// @param _info Registration information to validate
    /// @return bool True if information is valid, false otherwise
    /// @dev Checks that required fields are not empty
    function _isValidRegistrationInfo(
        RegistrationInfo calldata _info
    ) private pure returns (bool) {
        return
            bytes(_info.name).length > 0 &&
            bytes(_info.description).length > 0 &&
            bytes(_info.website).length > 0 &&
            bytes(_info.logo).length > 0;
    }

    /// @notice Allows contract to receive native token payments
    receive() external payable {}
}
