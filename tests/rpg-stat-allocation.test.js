/**
 * RPG Stat Allocation Tests
 * Tests for the "Allocate Points" button and related RPG UI functions
 */

// Test that can run in both browser and console environments
describe('RPG Stat Allocation Tests', () => {

    let game;
    let mockAgentService;
    let testAgent;

    beforeEach(() => {
        // Create a test agent with RPG entity
        testAgent = {
            id: 'test_agent_1',
            name: 'Test Agent',
            originalId: 'agent_001',
            health: 100,
            maxHealth: 100,
            rpgEntity: {
                level: 5,
                unspentStatPoints: 3,
                stats: {
                    strength: 10,
                    agility: 8,
                    intelligence: 12,
                    endurance: 9,
                    tech: 7,
                    charisma: 6
                }
            }
        };

        // Create mock AgentService
        mockAgentService = {
            activeAgents: [testAgent],
            getAgent: function(agentId) {
                // Return agent if ID matches any of the identifiers
                if (agentId === testAgent.id ||
                    agentId === testAgent.name ||
                    agentId === testAgent.originalId) {
                    return testAgent;
                }
                return null;
            },
            getActiveAgents: function() {
                return this.activeAgents;
            },
            indexAgent: function(agent) {
                // Simulate the real indexAgent behavior
                if (!this.activeAgents.includes(agent)) {
                    const existingIndex = this.activeAgents.findIndex(a =>
                        (a.originalId && a.originalId === agent.originalId) ||
                        a.name === agent.name
                    );
                    if (existingIndex >= 0) {
                        this.activeAgents[existingIndex] = agent;
                    } else {
                        this.activeAgents.push(agent);
                    }
                }
            }
        };

        // Set up mock GameServices
        if (typeof window !== 'undefined') {
            window.GameServices = {
                agentService: mockAgentService
            };
        } else {
            global.window = {
                GameServices: {
                    agentService: mockAgentService
                }
            };
        }

        // Create game instance if CyberOpsGame exists
        if (typeof CyberOpsGame !== 'undefined') {
            game = new CyberOpsGame();
            game.agents = [];  // Empty mission agents
            game.activeAgents = [];  // Empty hub agents
        }
    });

    afterEach(() => {
        // Clean up
        if (typeof window !== 'undefined') {
            delete window.GameServices;
        }
        if (typeof document !== 'undefined') {
            // Remove any stat allocation dialogs
            const dialogs = document.querySelectorAll('.stat-allocation');
            dialogs.forEach(d => d.remove());
        }
    });

    it('should find agent through AgentService', () => {
        if (!game) return; // Skip if not in browser

        // Test finding by ID
        const agentById = game.findAgentForRPG('test_agent_1');
        assertTruthy(agentById);
        assertEqual(agentById.id, 'test_agent_1');

        // Test finding by name
        const agentByName = game.findAgentForRPG('Test Agent');
        assertTruthy(agentByName);
        assertEqual(agentByName.name, 'Test Agent');

        // Test finding by originalId
        const agentByOriginalId = game.findAgentForRPG('agent_001');
        assertTruthy(agentByOriginalId);
        assertEqual(agentByOriginalId.originalId, 'agent_001');
    });

    it('should find agent with mission ID format', () => {
        if (!game) return; // Skip if not in browser

        // Simulate mission agent with agent_0 format
        const missionAgent = {
            id: 'agent_0',  // Mission format ID
            name: 'Test Agent',
            originalId: 'test_agent_1',  // Original hub ID
            health: 100,
            maxHealth: 100,
            rpgEntity: {
                level: 5,
                unspentStatPoints: 3,
                stats: {
                    strength: 10,
                    agility: 8,
                    intelligence: 12,
                    endurance: 9,
                    tech: 7,
                    charisma: 6
                }
            }
        };

        // Update mock to return mission agent
        mockAgentService.getAgent = function(agentId) {
            // Should be able to find by any ID
            if (agentId === 'agent_0' ||
                agentId === 'test_agent_1' ||
                agentId === 'Test Agent') {
                return missionAgent;
            }
            return null;
        };

        // Also test that indexAgent properly updates activeAgents
        mockAgentService.indexAgent(missionAgent);
        assertTruthy(mockAgentService.activeAgents.includes(missionAgent));

        // Should find agent by mission ID
        const agentByMissionId = game.findAgentForRPG('agent_0');
        assertTruthy(agentByMissionId);
        assertEqual(agentByMissionId.id, 'agent_0');
        assertEqual(agentByMissionId.originalId, 'test_agent_1');

        // Should still find by original ID
        const agentByOriginalId = game.findAgentForRPG('test_agent_1');
        assertTruthy(agentByOriginalId);
        assertEqual(agentByOriginalId.originalId, 'test_agent_1');
    });

    it('should not find agent from direct arrays when AgentService is available', () => {
        if (!game) return; // Skip if not in browser

        // Add agent to direct arrays (simulating old behavior)
        game.agents = [{
            id: 'mission_agent',
            name: 'Mission Agent',
            rpgEntity: { unspentStatPoints: 5 }
        }];

        game.activeAgents = [{
            id: 'hub_agent',
            name: 'Hub Agent',
            rpgEntity: { unspentStatPoints: 5 }
        }];

        // These should NOT be found because AgentService doesn't have them
        const missionAgent = game.findAgentForRPG('mission_agent');
        assertFalsy(missionAgent);

        const hubAgent = game.findAgentForRPG('hub_agent');
        assertFalsy(hubAgent);

        // But our test agent should still be found through AgentService
        const serviceAgent = game.findAgentForRPG('test_agent_1');
        assertTruthy(serviceAgent);
    });

    it('should fall back to direct arrays when AgentService not available', () => {
        if (!game) return; // Skip if not in browser

        // Remove AgentService
        delete window.GameServices;

        // Add agents to direct arrays
        game.agents = [testAgent];

        // Should find agent from direct array now
        const agent = game.findAgentForRPG('test_agent_1');
        assertTruthy(agent);
        assertEqual(agent.id, 'test_agent_1');
    });

    it('should show stat allocation dialog when agent has unspent points', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Call showStatAllocation
        game.showStatAllocation('test_agent_1');

        // Check if dialog was created
        const dialog = document.querySelector('.stat-allocation');
        assertTruthy(dialog);

        // Check if points remaining is shown correctly
        const pointsLeft = document.getElementById('points-left');
        assertTruthy(pointsLeft);
        assertEqual(pointsLeft.textContent, '3');

        // Check if stat rows are created
        const statRows = dialog.querySelectorAll('.stat-allocation-row');
        assertEqual(statRows.length, 6); // 6 stats
    });

    it('should not show dialog when agent has no unspent points', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Set unspent points to 0
        testAgent.rpgEntity.unspentStatPoints = 0;

        // Call showStatAllocation
        game.showStatAllocation('test_agent_1');

        // Check that dialog was NOT created
        const dialog = document.querySelector('.stat-allocation');
        assertFalsy(dialog);
    });

    it('should not show dialog when agent not found', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Try to show dialog for non-existent agent
        game.showStatAllocation('non_existent_agent');

        // Check that dialog was NOT created
        const dialog = document.querySelector('.stat-allocation');
        assertFalsy(dialog);
    });

    it('should update pending changes when allocating stats', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Show dialog first
        game.showStatAllocation('test_agent_1');
        const dialog = document.querySelector('.stat-allocation');
        assertTruthy(dialog);

        // Allocate a point to strength
        game.allocateStat('test_agent_1', 'strength', 1);

        // Check that pending changes were updated
        const pending = JSON.parse(dialog.dataset.pendingChanges);
        assertEqual(pending.strength, 1);

        // Check that UI was updated
        const changeDisplay = document.getElementById('change-strength');
        assertEqual(changeDisplay.textContent, '+1');

        // Check that points left was decremented
        const pointsLeft = document.getElementById('points-left');
        assertEqual(pointsLeft.textContent, '2'); // Started with 3, used 1
    });

    it('should not allocate more points than available', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Show dialog
        game.showStatAllocation('test_agent_1');

        // Try to allocate 4 points (but only have 3)
        game.allocateStat('test_agent_1', 'strength', 1);
        game.allocateStat('test_agent_1', 'strength', 1);
        game.allocateStat('test_agent_1', 'strength', 1);
        game.allocateStat('test_agent_1', 'strength', 1); // This should not work

        const dialog = document.querySelector('.stat-allocation');
        const pending = JSON.parse(dialog.dataset.pendingChanges);

        // Should only have allocated 3 points
        assertEqual(pending.strength, 3);

        const pointsLeft = document.getElementById('points-left');
        assertEqual(pointsLeft.textContent, '0');
    });

    it('should apply stat changes on confirm', () => {
        if (!game || typeof document === 'undefined') return; // Skip if not in browser

        // Set up RPG manager mock
        game.rpgManager = {
            calculateDerivedStats: function(rpgEntity) {
                return {
                    maxHealth: 100 + (rpgEntity.stats.endurance * 10),
                    maxAP: 10 + Math.floor(rpgEntity.stats.agility / 2)
                };
            }
        };

        // Show dialog
        game.showStatAllocation('test_agent_1');

        // Allocate points
        game.allocateStat('test_agent_1', 'strength', 2);
        game.allocateStat('test_agent_1', 'agility', 1);

        // Confirm allocation
        game.confirmStatAllocation('test_agent_1');

        // Check that stats were updated
        assertEqual(testAgent.rpgEntity.stats.strength, 12); // Was 10, added 2
        assertEqual(testAgent.rpgEntity.stats.agility, 9);   // Was 8, added 1

        // Check that unspent points were reduced
        assertEqual(testAgent.rpgEntity.unspentStatPoints, 0); // Was 3, spent 3

        // Check that dialog was closed
        const dialog = document.querySelector('.stat-allocation');
        assertFalsy(dialog);
    });
});

describe('RPG Service Integration Tests', () => {

    it('should use AgentService as single source of truth', () => {
        if (typeof CyberOpsGame === 'undefined') return;

        let getAgentCalled = false;
        const mockAgent = {
            id: 'test_1',
            name: 'Test',
            rpgEntity: { unspentStatPoints: 5 }
        };

        // Mock AgentService
        window.GameServices = {
            agentService: {
                getAgent: function(id) {
                    getAgentCalled = true;
                    return id === 'test_1' ? mockAgent : null;
                }
            }
        };

        const game = new CyberOpsGame();

        // Add different agent to direct arrays (should be ignored)
        game.agents = [{ id: 'wrong_1', name: 'Wrong' }];
        game.activeAgents = [{ id: 'wrong_2', name: 'Also Wrong' }];

        // Find agent - should use service
        const found = game.findAgentForRPG('test_1');

        assertTruthy(getAgentCalled);
        assertEqual(found.id, 'test_1');
        assertEqual(found.name, 'Test');
    });

    it('should handle AgentService returning null gracefully', () => {
        if (typeof CyberOpsGame === 'undefined') return;

        window.GameServices = {
            agentService: {
                getAgent: function(id) {
                    return null; // Agent not found
                }
            }
        };

        const game = new CyberOpsGame();

        // Should not throw error
        const agent = game.findAgentForRPG('non_existent');
        assertFalsy(agent);

        // Should not show dialog for missing agent
        if (typeof document !== 'undefined') {
            game.showStatAllocation('non_existent');
            const dialog = document.querySelector('.stat-allocation');
            assertFalsy(dialog);
        }
    });
});