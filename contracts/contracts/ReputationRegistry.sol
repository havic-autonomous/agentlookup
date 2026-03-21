// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IAgentRegistry {
    function slugTaken(string memory slug) external view returns (bool);
    function getAgent(string memory slug) external view returns (
        address owner,
        string memory slug_,
        string memory name,
        string memory metadataURI,
        uint256 registeredAt,
        uint256 updatedAt,
        bool active
    );
}

/// @title AgentLookup Reputation Registry
/// @notice On-chain reputation feedback for AI agents
contract ReputationRegistry is Ownable, ReentrancyGuard {
    struct Feedback {
        bytes32 agentSlugHash;   // Target agent
        address reviewer;        // Who gave feedback
        uint8 score;            // 0-100
        string category;        // "reliability", "quality", "speed", etc.
        string comment;         // Optional comment (keep short, gas)
        uint256 timestamp;
    }
    
    // agent => feedbacks
    mapping(bytes32 => Feedback[]) public agentFeedback;
    
    // agent => category => average scores (scaled by 100 for precision)
    mapping(bytes32 => mapping(string => uint256)) public averageScores;
    
    // agent => category => total feedback count for that category
    mapping(bytes32 => mapping(string => uint256)) public categoryFeedbackCount;
    
    // agent => total feedback count
    mapping(bytes32 => uint256) public totalFeedbackCount;
    
    // Events
    event FeedbackSubmitted(
        bytes32 indexed agentSlugHash, 
        address indexed reviewer, 
        uint8 score, 
        string category
    );
    event FeedbackUpdated(bytes32 indexed agentSlugHash, string category, uint256 newAverage);
    
    // Anti-sybil: one feedback per reviewer per agent per 30 days
    mapping(bytes32 => mapping(address => uint256)) public lastFeedbackTime;
    
    // Reference to AgentRegistry for verification
    IAgentRegistry public agentRegistry;
    
    // Feedback cooldown period (30 days)
    uint256 public constant FEEDBACK_COOLDOWN = 30 days;
    
    constructor(address _agentRegistry) Ownable(msg.sender) {
        require(_agentRegistry != address(0), "Invalid agent registry address");
        agentRegistry = IAgentRegistry(_agentRegistry);
    }
    
    /// @notice Submit feedback for an agent
    /// @param agentSlug The agent's slug identifier
    /// @param score Rating from 0-100
    /// @param category Category of feedback (e.g., "reliability", "quality")
    /// @param comment Optional comment (keep short for gas efficiency)
    function submitFeedback(
        string memory agentSlug,
        uint8 score,
        string memory category,
        string memory comment
    ) external nonReentrant {
        require(score <= 100, "Score must be between 0-100");
        require(bytes(category).length > 0, "Category cannot be empty");
        require(bytes(category).length <= 32, "Category too long");
        require(bytes(comment).length <= 280, "Comment too long"); // Twitter-like limit
        
        // Verify agent exists
        require(agentRegistry.slugTaken(agentSlug), "Agent does not exist");
        
        bytes32 slugHash = keccak256(abi.encodePacked(agentSlug));
        
        // Anti-sybil check: one feedback per reviewer per agent per 30 days
        require(
            block.timestamp >= lastFeedbackTime[slugHash][msg.sender] + FEEDBACK_COOLDOWN,
            "Must wait 30 days between feedback submissions"
        );
        
        // Create feedback entry
        Feedback memory newFeedback = Feedback({
            agentSlugHash: slugHash,
            reviewer: msg.sender,
            score: score,
            category: category,
            comment: comment,
            timestamp: block.timestamp
        });
        
        // Store feedback
        agentFeedback[slugHash].push(newFeedback);
        lastFeedbackTime[slugHash][msg.sender] = block.timestamp;
        
        // Update counters and averages
        _updateAverageScore(slugHash, category, score);
        
        emit FeedbackSubmitted(slugHash, msg.sender, score, category);
    }
    
    /// @notice Get agent's reputation summary
    /// @param agentSlug The agent's slug identifier
    /// @return totalFeedback Total number of feedback entries
    /// @return categories Array of categories with feedback
    /// @return averages Array of average scores for each category
    function getAgentReputation(string memory agentSlug) 
        external 
        view 
        returns (
            uint256 totalFeedback,
            string[] memory categories,
            uint256[] memory averages
        ) 
    {
        bytes32 slugHash = keccak256(abi.encodePacked(agentSlug));
        totalFeedback = totalFeedbackCount[slugHash];
        
        if (totalFeedback == 0) {
            return (0, new string[](0), new uint256[](0));
        }
        
        // Count unique categories
        string[] memory allCategories = new string[](agentFeedback[slugHash].length);
        uint256 uniqueCount = 0;
        
        for (uint256 i = 0; i < agentFeedback[slugHash].length; i++) {
            string memory cat = agentFeedback[slugHash][i].category;
            bool exists = false;
            
            for (uint256 j = 0; j < uniqueCount; j++) {
                if (keccak256(bytes(allCategories[j])) == keccak256(bytes(cat))) {
                    exists = true;
                    break;
                }
            }
            
            if (!exists) {
                allCategories[uniqueCount] = cat;
                uniqueCount++;
            }
        }
        
        // Create result arrays
        categories = new string[](uniqueCount);
        averages = new uint256[](uniqueCount);
        
        for (uint256 i = 0; i < uniqueCount; i++) {
            categories[i] = allCategories[i];
            averages[i] = averageScores[slugHash][allCategories[i]];
        }
    }
    
    /// @notice Get paginated feedback for an agent
    /// @param agentSlug The agent's slug identifier
    /// @param offset Starting index
    /// @param limit Maximum number of feedback entries to return
    /// @return feedbacks Array of feedback entries
    function getAgentFeedback(
        string memory agentSlug, 
        uint256 offset, 
        uint256 limit
    ) external view returns (Feedback[] memory feedbacks) {
        bytes32 slugHash = keccak256(abi.encodePacked(agentSlug));
        Feedback[] storage allFeedback = agentFeedback[slugHash];
        
        if (offset >= allFeedback.length || limit == 0) {
            return new Feedback[](0);
        }
        
        uint256 end = offset + limit;
        if (end > allFeedback.length) {
            end = allFeedback.length;
        }
        
        feedbacks = new Feedback[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            feedbacks[i - offset] = allFeedback[i];
        }
    }
    
    /// @notice Get feedback history for a reviewer
    /// @param reviewer Address of the reviewer
    /// @param limit Maximum number of feedback entries to return
    /// @return feedbacks Array of feedback entries by this reviewer
    function getReviewerHistory(address reviewer, uint256 limit) 
        external 
        view 
        returns (Feedback[] memory feedbacks) 
    {
        // Note: This is inefficient for large datasets. In production,
        // consider maintaining a separate mapping for reviewer history
        uint256 count = 0;
        uint256 totalAgents = 0; // This would need to be tracked or calculated
        
        // For MVP, we return empty array and suggest using events/subgraph
        return new Feedback[](0);
    }
    
    /// @notice Get average score for specific agent and category
    /// @param agentSlug The agent's slug identifier
    /// @param category The feedback category
    /// @return Average score (0-100, with decimal precision via scaling)
    function getCategoryScore(string memory agentSlug, string memory category) 
        external 
        view 
        returns (uint256) 
    {
        bytes32 slugHash = keccak256(abi.encodePacked(agentSlug));
        return averageScores[slugHash][category];
    }
    
    /// @notice Update the agent registry address (admin only)
    /// @param _agentRegistry New agent registry address
    function setAgentRegistry(address _agentRegistry) external onlyOwner {
        require(_agentRegistry != address(0), "Invalid address");
        agentRegistry = IAgentRegistry(_agentRegistry);
    }
    
    /// @dev Internal function to update average scores
    function _updateAverageScore(bytes32 slugHash, string memory category, uint8 score) private {
        uint256 currentCount = categoryFeedbackCount[slugHash][category];
        uint256 currentAverage = averageScores[slugHash][category];
        
        if (currentCount == 0) {
            averageScores[slugHash][category] = uint256(score) * 100; // Scale for precision
        } else {
            // Weighted average calculation
            uint256 totalScore = (currentAverage * currentCount) + (uint256(score) * 100);
            averageScores[slugHash][category] = totalScore / (currentCount + 1);
        }
        
        categoryFeedbackCount[slugHash][category]++;
        totalFeedbackCount[slugHash]++;
        
        emit FeedbackUpdated(slugHash, category, averageScores[slugHash][category]);
    }
}