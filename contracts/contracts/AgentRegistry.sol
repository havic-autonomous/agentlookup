// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title AgentLookup Agent Registry
/// @notice On-chain identity registry for AI agents on Base L2
/// @dev Compatible with ERC-8004 agent identity standard
contract AgentRegistry is Ownable, ReentrancyGuard {
    struct AgentIdentity {
        address owner;          // Operator wallet
        string slug;            // Unique identifier (e.g., "alex-claw")
        string name;            // Agent display name
        string metadataURI;     // IPFS/HTTP URI to full profile JSON
        uint256 registeredAt;   // Block timestamp
        uint256 updatedAt;      // Last update timestamp
        bool active;            // Agent status
    }
    
    // Mappings
    mapping(bytes32 => AgentIdentity) public agents;  // keccak256(slug) => identity
    mapping(address => bytes32[]) public ownerAgents;  // owner => agent slugs
    mapping(bytes32 => bool) public slugExists;       // keccak256(slug) => exists
    
    // Events
    event AgentRegistered(bytes32 indexed slugHash, string slug, address indexed owner, string name);
    event AgentUpdated(bytes32 indexed slugHash, string metadataURI);
    event AgentDeactivated(bytes32 indexed slugHash);
    event AgentTransferred(bytes32 indexed slugHash, address indexed from, address indexed to);
    event RegistrationFeeUpdated(uint256 oldFee, uint256 newFee);
    
    // Registration fee (can be 0 for MVP)
    uint256 public registrationFee;
    
    // Total agents count
    uint256 public totalAgents;
    
    constructor(uint256 _registrationFee) Ownable(msg.sender) {
        registrationFee = _registrationFee;
    }
    
    /// @notice Register a new agent identity
    /// @param slug Unique identifier for the agent (e.g., "alex-claw")
    /// @param name Display name of the agent
    /// @param metadataURI URI pointing to agent metadata JSON
    function register(
        string memory slug,
        string memory name,
        string memory metadataURI
    ) external payable nonReentrant {
        require(bytes(slug).length > 0, "Slug cannot be empty");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(msg.value >= registrationFee, "Insufficient registration fee");
        
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(!slugExists[slugHash], "Slug already exists");
        
        AgentIdentity memory newAgent = AgentIdentity({
            owner: msg.sender,
            slug: slug,
            name: name,
            metadataURI: metadataURI,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            active: true
        });
        
        agents[slugHash] = newAgent;
        ownerAgents[msg.sender].push(slugHash);
        slugExists[slugHash] = true;
        totalAgents++;
        
        emit AgentRegistered(slugHash, slug, msg.sender, name);
    }
    
    /// @notice Update agent metadata (owner only)
    /// @param slug Agent slug to update
    /// @param metadataURI New metadata URI
    function updateMetadata(string memory slug, string memory metadataURI) external {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(slugExists[slugHash], "Agent does not exist");
        require(agents[slugHash].owner == msg.sender, "Only owner can update");
        
        agents[slugHash].metadataURI = metadataURI;
        agents[slugHash].updatedAt = block.timestamp;
        
        emit AgentUpdated(slugHash, metadataURI);
    }
    
    /// @notice Deactivate agent (owner only)
    /// @param slug Agent slug to deactivate
    function deactivate(string memory slug) external {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(slugExists[slugHash], "Agent does not exist");
        require(agents[slugHash].owner == msg.sender, "Only owner can deactivate");
        
        agents[slugHash].active = false;
        agents[slugHash].updatedAt = block.timestamp;
        
        emit AgentDeactivated(slugHash);
    }
    
    /// @notice Transfer agent ownership (current owner only)
    /// @param slug Agent slug to transfer
    /// @param newOwner New owner address
    function transfer(string memory slug, address newOwner) external {
        require(newOwner != address(0), "Invalid new owner");
        
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(slugExists[slugHash], "Agent does not exist");
        require(agents[slugHash].owner == msg.sender, "Only owner can transfer");
        
        address oldOwner = agents[slugHash].owner;
        agents[slugHash].owner = newOwner;
        agents[slugHash].updatedAt = block.timestamp;
        
        // Update ownerAgents mapping
        _removeAgentFromOwner(oldOwner, slugHash);
        ownerAgents[newOwner].push(slugHash);
        
        emit AgentTransferred(slugHash, oldOwner, newOwner);
    }
    
    /// @notice Get agent identity by slug
    /// @param slug Agent slug
    /// @return AgentIdentity struct
    function getAgent(string memory slug) external view returns (AgentIdentity memory) {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        require(slugExists[slugHash], "Agent does not exist");
        return agents[slugHash];
    }
    
    /// @notice Get all agent slugs owned by an address
    /// @param owner Owner address
    /// @return Array of agent slug hashes
    function getOwnerAgents(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }
    
    /// @notice Check if a slug exists
    /// @param slug Slug to check
    /// @return True if slug exists
    function slugTaken(string memory slug) external view returns (bool) {
        bytes32 slugHash = keccak256(abi.encodePacked(slug));
        return slugExists[slugHash];
    }
    
    /// @notice Set registration fee (admin only)
    /// @param fee New registration fee in wei
    function setRegistrationFee(uint256 fee) external onlyOwner {
        uint256 oldFee = registrationFee;
        registrationFee = fee;
        emit RegistrationFeeUpdated(oldFee, fee);
    }
    
    /// @notice Withdraw collected fees (admin only)
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Fee withdrawal failed");
    }
    
    /// @notice Get contract balance
    /// @return Balance in wei
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /// @dev Internal function to remove agent from owner's list
    function _removeAgentFromOwner(address owner, bytes32 slugHash) private {
        bytes32[] storage ownerSlots = ownerAgents[owner];
        for (uint256 i = 0; i < ownerSlots.length; i++) {
            if (ownerSlots[i] == slugHash) {
                ownerSlots[i] = ownerSlots[ownerSlots.length - 1];
                ownerSlots.pop();
                break;
            }
        }
    }
}