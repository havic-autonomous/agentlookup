const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentRegistry", function () {
  let agentRegistry;
  let owner, addr1, addr2;
  
  const registrationFee = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
    agentRegistry = await AgentRegistry.deploy(registrationFee);
    await agentRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await agentRegistry.owner()).to.equal(owner.address);
    });

    it("Should set the registration fee", async function () {
      expect(await agentRegistry.registrationFee()).to.equal(registrationFee);
    });

    it("Should start with zero agents", async function () {
      expect(await agentRegistry.totalAgents()).to.equal(0);
    });
  });

  describe("Agent Registration", function () {
    it("Should register an agent successfully", async function () {
      const slug = "alex-claw";
      const name = "Alex Claw";
      const metadataURI = "https://example.com/metadata.json";

      await expect(
        agentRegistry.connect(addr1).register(slug, name, metadataURI, {
          value: registrationFee
        })
      )
        .to.emit(agentRegistry, "AgentRegistered")
        .withArgs(
          ethers.keccak256(ethers.toUtf8Bytes(slug)),
          slug,
          addr1.address,
          name
        );

      expect(await agentRegistry.totalAgents()).to.equal(1);
      expect(await agentRegistry.slugTaken(slug)).to.be.true;
    });

    it("Should fail with insufficient fee", async function () {
      const slug = "alex-claw";
      const name = "Alex Claw";
      const metadataURI = "https://example.com/metadata.json";
      const insufficientFee = ethers.parseEther("0.005");

      await expect(
        agentRegistry.connect(addr1).register(slug, name, metadataURI, {
          value: insufficientFee
        })
      ).to.be.revertedWith("Insufficient registration fee");
    });

    it("Should fail with empty slug", async function () {
      await expect(
        agentRegistry.connect(addr1).register("", "Alex Claw", "https://example.com", {
          value: registrationFee
        })
      ).to.be.revertedWith("Slug cannot be empty");
    });

    it("Should fail with empty name", async function () {
      await expect(
        agentRegistry.connect(addr1).register("alex-claw", "", "https://example.com", {
          value: registrationFee
        })
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should fail if slug already exists", async function () {
      const slug = "alex-claw";
      const name = "Alex Claw";
      const metadataURI = "https://example.com/metadata.json";

      // First registration
      await agentRegistry.connect(addr1).register(slug, name, metadataURI, {
        value: registrationFee
      });

      // Second registration with same slug should fail
      await expect(
        agentRegistry.connect(addr2).register(slug, "Different Name", metadataURI, {
          value: registrationFee
        })
      ).to.be.revertedWith("Slug already exists");
    });
  });

  describe("Agent Management", function () {
    let slugHash;
    const slug = "alex-claw";
    const name = "Alex Claw";
    const metadataURI = "https://example.com/metadata.json";

    beforeEach(async function () {
      await agentRegistry.connect(addr1).register(slug, name, metadataURI, {
        value: registrationFee
      });
      slugHash = ethers.keccak256(ethers.toUtf8Bytes(slug));
    });

    it("Should update metadata by owner", async function () {
      const newMetadataURI = "https://example.com/new-metadata.json";

      await expect(
        agentRegistry.connect(addr1).updateMetadata(slug, newMetadataURI)
      )
        .to.emit(agentRegistry, "AgentUpdated")
        .withArgs(slugHash, newMetadataURI);

      const agent = await agentRegistry.getAgent(slug);
      expect(agent.metadataURI).to.equal(newMetadataURI);
    });

    it("Should fail to update metadata by non-owner", async function () {
      const newMetadataURI = "https://example.com/new-metadata.json";

      await expect(
        agentRegistry.connect(addr2).updateMetadata(slug, newMetadataURI)
      ).to.be.revertedWith("Only owner can update");
    });

    it("Should deactivate agent by owner", async function () {
      await expect(
        agentRegistry.connect(addr1).deactivate(slug)
      )
        .to.emit(agentRegistry, "AgentDeactivated")
        .withArgs(slugHash);

      const agent = await agentRegistry.getAgent(slug);
      expect(agent.active).to.be.false;
    });

    it("Should transfer ownership", async function () {
      await expect(
        agentRegistry.connect(addr1).transfer(slug, addr2.address)
      )
        .to.emit(agentRegistry, "AgentTransferred")
        .withArgs(slugHash, addr1.address, addr2.address);

      const agent = await agentRegistry.getAgent(slug);
      expect(agent.owner).to.equal(addr2.address);

      // Check owner agents mapping is updated
      const addr1Agents = await agentRegistry.getOwnerAgents(addr1.address);
      const addr2Agents = await agentRegistry.getOwnerAgents(addr2.address);
      
      expect(addr1Agents.length).to.equal(0);
      expect(addr2Agents.length).to.equal(1);
      expect(addr2Agents[0]).to.equal(slugHash);
    });

    it("Should fail to transfer to zero address", async function () {
      await expect(
        agentRegistry.connect(addr1).transfer(slug, ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid new owner");
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      // Register multiple agents
      await agentRegistry.connect(addr1).register("alex-claw", "Alex Claw", "uri1", {
        value: registrationFee
      });
      await agentRegistry.connect(addr1).register("priya-verma", "Priya Verma", "uri2", {
        value: registrationFee
      });
      await agentRegistry.connect(addr2).register("bot-trader", "Bot Trader", "uri3", {
        value: registrationFee
      });
    });

    it("Should return correct agent data", async function () {
      const agent = await agentRegistry.getAgent("alex-claw");
      
      expect(agent.owner).to.equal(addr1.address);
      expect(agent.slug).to.equal("alex-claw");
      expect(agent.name).to.equal("Alex Claw");
      expect(agent.metadataURI).to.equal("uri1");
      expect(agent.active).to.be.true;
      expect(agent.registeredAt).to.be.gt(0);
      expect(agent.updatedAt).to.be.gt(0);
    });

    it("Should return owner agents", async function () {
      const addr1Agents = await agentRegistry.getOwnerAgents(addr1.address);
      const addr2Agents = await agentRegistry.getOwnerAgents(addr2.address);

      expect(addr1Agents.length).to.equal(2);
      expect(addr2Agents.length).to.equal(1);
    });

    it("Should check slug availability", async function () {
      expect(await agentRegistry.slugTaken("alex-claw")).to.be.true;
      expect(await agentRegistry.slugTaken("non-existent")).to.be.false;
    });

    it("Should fail to get non-existent agent", async function () {
      await expect(
        agentRegistry.getAgent("non-existent")
      ).to.be.revertedWith("Agent does not exist");
    });
  });
});