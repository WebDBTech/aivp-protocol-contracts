// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title AIVP Protocol Interface
/// @notice Interface for the AI Value Protocol (AIVP) which enables project registration and value processing
interface IAIVP {
    /// @notice Structure containing project registration information
    /// @param name Name of the project
    /// @param description Description of the project
    /// @param website Project's website URL
    /// @param logo Project's logo URL/hash
    /// @param socials Array of social media links
    struct RegistrationInfo {
        string name;
        string description;
        string website;
        string logo;
        string[] socials;
    }

    /// @notice Structure containing details about processed value for a token
    /// @param token Address of the token that was processed (address(0) for native token)
    /// @param amount Amount of tokens processed
    struct ValueProcessed {
        address token;
        uint256 amount;
    }

    /// @notice Structure containing project details and metrics
    /// @param owner Address of the project owner
    /// @param name Name of the project
    /// @param description Description of the project
    /// @param website Project's website URL
    /// @param logo Project's logo URL/hash
    /// @param socials Array of social media links
    /// @param isVerified Verification status of the project
    struct Project {
        uint256 id;
        address owner;
        string name;
        string description;
        string website;
        string logo;
        string[] socials;
        ValueProcessed[] valueProcessed;
        bool isVerified;
        uint256 claimedAIVP;
    }

    /// @notice Error thrown when insufficient fee is provided for registration or value processing
    /// @dev Thrown when msg.value is less than required fee amount
    error InsufficientFee();

    /// @notice Error thrown when invalid project registration information is provided
    /// @dev Thrown when required fields are empty or invalid
    error InvalidRegistrationInfo();

    /// @notice Error thrown when attempting to interact with a non-existent project
    /// @dev Thrown when accessing a project ID that hasn't been registered
    error ProjectNotFound();

    /// @notice Error thrown when caller lacks permission for an operation
    /// @dev Thrown when non-owner attempts to modify project details
    error Unauthorized();

    /// @notice Emitted when a new project is registered
    /// @param projectId Unique identifier of the registered project
    /// @param name Name of the registered project
    event ProjectRegistered(uint256 indexed projectId, string name);

    /// @notice Emitted when value is processed for a project
    /// @param projectId ID of the project receiving the value
    /// @param amount Amount of value processed
    event ValueAdded(uint256 indexed projectId, address token, uint256 amount);

    /// @notice Registers a new project in the protocol
    /// @param _regsitraionInfo Project registration details
    /// @dev Requires payment of registration fee in native token
    function registerProject(
        RegistrationInfo calldata _regsitraionInfo
    ) external payable;

    /// @notice Updates an existing project's information
    /// @param _projectId ID of the project to update
    /// @param _registrationInfo New project details
    /// @dev Can only be called by the project owner
    function updateProject(
        uint256 _projectId,
        RegistrationInfo calldata _registrationInfo
    ) external;

    /// @notice Processes native token value for a project
    /// @param _projectId ID of the project
    /// @param _amount Amount of native tokens to process
    /// @dev Takes a 5% protocol fee, of which 4.5% is converted to AIVP tokens
    function processValueNativeToken(
        uint256 _projectId,
        uint256 _amount
    ) external payable;

    /// @notice Processes ERC20 token value for a project
    /// @param _projectId ID of the project
    /// @param _token Address of the ERC20 token
    /// @param _amount Amount of tokens to process
    /// @dev Takes a 5% protocol fee, of which 4.5% is converted to AIVP tokens
    function processValueERC20(
        uint256 _projectId,
        address _token,
        uint256 _amount
    ) external;
}
