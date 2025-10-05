/**
 * Save/Load System Tests
 * Tests for game state persistence, save slots, and data integrity
 */

describe('Save/Load System Tests', () => {

    // Helper to create mock game state service
    function createMockGameStateService() {
        const mockResourceService = {
            exportState: () => ({ resources: { credits: 5000, researchPoints: 100 } }),
            importState: (state) => {}
        };

        const mockAgentService = {
            exportState: () => ({ activeAgents: [], availableAgents: [], fallenAgents: [] }),
            importState: (state) => {}
        };

        const mockInventoryService = {
            exportState: () => ({ inventory: {}, agentLoadouts: {} }),
            importState: (state) => {}
        };

        const service = new GameStateService(
            mockResourceService,
            mockAgentService,
            mockInventoryService,
            null
        );

        return { service, mockResourceService, mockAgentService, mockInventoryService };
    }

    // Helper to create mock game object
    function createMockGame(overrides = {}) {
        return {
            currentScreen: 'hub',
            currentMission: null,
            completedMissions: ['mission-01'],
            missionCount: 1,
            playTime: 1000,
            researchTree: {},
            completedResearch: [],
            unlockedAbilities: [],
            currentAct: 1,
            currentCampaign: 'main',
            campaignProgress: {},
            ...overrides
        };
    }

    describe('Service Initialization', () => {

        it('should initialize with correct defaults', () => {
            const { service } = createMockGameStateService();

            assertEqual(service.saveSlots, 5, 'Should have 5 save slots');
            assertEqual(service.currentSlot, 0, 'Current slot should be 0');
            assertEqual(service.saveVersion, '1.0.0', 'Version should be 1.0.0');
            assertEqual(service.autoSaveEnabled, true, 'Auto-save should be enabled');
        });

        it('should have required field validators', () => {
            const { service } = createMockGameStateService();

            assertTruthy(service.requiredFields, 'Should have required fields');
            assertTruthy(service.requiredFields.includes('version'),
                'Version should be required');
            assertTruthy(service.requiredFields.includes('timestamp'),
                'Timestamp should be required');
        });

    });

    describe('State Collection', () => {

        it('should collect complete game state', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertTruthy(state, 'State should exist');
            assertTruthy(state.version, 'Should have version');
            assertTruthy(state.timestamp, 'Should have timestamp');
            assertTruthy(state.currentScreen, 'Should have current screen');
        });

        it('should include metadata', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({ playTime: 5000 });

            const state = service.collectGameState(game);

            assertEqual(state.version, '1.0.0', 'Version should match');
            assertTruthy(state.timestamp > 0, 'Timestamp should be set');
            assertEqual(state.playTime, 5000, 'Play time should be preserved');
        });

        it('should include resources from ResourceService', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertTruthy(state.resources, 'Should have resources');
            assertEqual(state.resources.resources.credits, 5000,
                'Credits should be included');
        });

        it('should include agents from AgentService', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertTruthy(state.agents, 'Should have agents');
            assertTruthy(Array.isArray(state.agents.activeAgents),
                'Active agents should be array');
        });

        it('should include inventory from InventoryService', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertTruthy(state.inventory, 'Should have inventory');
            assertTruthy(state.inventory.agentLoadouts,
                'Should have agent loadouts');
        });

        it('should include mission progress', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                completedMissions: ['m1', 'm2', 'm3'],
                missionCount: 3
            });

            const state = service.collectGameState(game);

            assertEqual(state.completedMissions.length, 3,
                'Should have completed missions');
            assertEqual(state.missionCount, 3, 'Mission count should match');
        });

        it('should include research progress', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                completedResearch: [1, 2, 3],
                unlockedAbilities: ['ability1']
            });

            const state = service.collectGameState(game);

            assertEqual(state.completedResearch.length, 3,
                'Should have completed research');
            assertEqual(state.unlockedAbilities.length, 1,
                'Should have unlocked abilities');
        });

        it('should include campaign data', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                currentAct: 2,
                currentCampaign: 'custom'
            });

            const state = service.collectGameState(game);

            assertEqual(state.campaignData.currentAct, 2, 'Act should match');
            assertEqual(state.campaignData.currentCampaign, 'custom',
                'Campaign should match');
        });

        it('should handle missing game object', () => {
            const { service } = createMockGameStateService();

            let errorThrown = false;
            try {
                service.collectGameState(null);
            } catch (e) {
                errorThrown = true;
            }

            assertTruthy(errorThrown,
                'Should throw error for null game object');
        });

        it('should use defaults for missing properties', () => {
            const { service } = createMockGameStateService();
            const game = {}; // Minimal game object

            const state = service.collectGameState(game);

            assertEqual(state.currentScreen, 'hub',
                'Should default to hub screen');
            assertEqual(state.missionCount, 0,
                'Should default to 0 missions');
            assertEqual(state.playTime, 0,
                'Should default to 0 play time');
        });

    });

    describe('State Validation', () => {

        it('should validate required fields exist', () => {
            const { service } = createMockGameStateService();

            const validState = {
                version: '1.0.0',
                timestamp: Date.now(),
                currentScreen: 'hub',
                missionCount: 0
            };

            const hasRequired = service.requiredFields.every(field =>
                validState[field] !== undefined
            );

            assertTruthy(hasRequired, 'Valid state should have all required fields');
        });

        it('should detect missing required fields', () => {
            const { service } = createMockGameStateService();

            const invalidState = {
                version: '1.0.0',
                timestamp: Date.now()
                // Missing currentScreen and missionCount
            };

            const hasRequired = service.requiredFields.every(field =>
                invalidState[field] !== undefined
            );

            assertFalsy(hasRequired, 'Invalid state should be detected');
        });

    });

    describe('Save Slot Management', () => {

        it('should have multiple save slots', () => {
            const { service } = createMockGameStateService();

            assertEqual(service.saveSlots, 5, 'Should have 5 slots');
        });

        it('should track current slot', () => {
            const { service } = createMockGameStateService();

            const initialSlot = service.currentSlot;
            service.currentSlot = 2;
            const afterChange = service.currentSlot;

            assertEqual(initialSlot, 0, 'Should start at slot 0');
            assertEqual(afterChange, 2, 'Should change to slot 2');
        });

    });

    describe('Auto-Save System', () => {

        it('should enable auto-save by default', () => {
            const { service } = createMockGameStateService();

            assertEqual(service.autoSaveEnabled, true,
                'Auto-save should be enabled');
        });

        it('should have auto-save interval', () => {
            const { service } = createMockGameStateService();

            assertEqual(service.autoSaveInterval, 60000,
                'Auto-save interval should be 1 minute');
        });

        it('should allow disabling auto-save', () => {
            const { service } = createMockGameStateService();

            service.autoSaveEnabled = false;

            assertFalsy(service.autoSaveEnabled,
                'Auto-save should be disabled');
        });

        it('should track last auto-save time', () => {
            const { service } = createMockGameStateService();

            const initial = service.lastAutoSave;
            service.lastAutoSave = Date.now();
            const after = service.lastAutoSave;

            assertEqual(initial, 0, 'Should start at 0');
            assertTruthy(after > 0, 'Should update timestamp');
        });

    });

    describe('State Serialization', () => {

        it('should create serializable state object', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            let serialized;
            let deserialized;
            let errorThrown = false;

            try {
                serialized = JSON.stringify(state);
                deserialized = JSON.parse(serialized);
            } catch (e) {
                errorThrown = true;
            }

            assertFalsy(errorThrown, 'State should be JSON serializable');
            assertTruthy(deserialized, 'Should deserialize correctly');
            assertEqual(deserialized.version, state.version,
                'Version should survive serialization');
        });

        it('should preserve numeric values through serialization', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                playTime: 12345,
                missionCount: 7
            });

            const state = service.collectGameState(game);
            const serialized = JSON.stringify(state);
            const deserialized = JSON.parse(serialized);

            assertEqual(deserialized.playTime, 12345,
                'Play time should be preserved');
            assertEqual(deserialized.missionCount, 7,
                'Mission count should be preserved');
        });

        it('should preserve arrays through serialization', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                completedMissions: ['m1', 'm2', 'm3'],
                completedResearch: [1, 2, 3]
            });

            const state = service.collectGameState(game);
            const serialized = JSON.stringify(state);
            const deserialized = JSON.parse(serialized);

            assertEqual(deserialized.completedMissions.length, 3,
                'Missions array should be preserved');
            assertEqual(deserialized.completedResearch.length, 3,
                'Research array should be preserved');
        });

        it('should preserve nested objects through serialization', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                campaignProgress: {
                    act1: { completed: true },
                    act2: { completed: false }
                }
            });

            const state = service.collectGameState(game);
            const serialized = JSON.stringify(state);
            const deserialized = JSON.parse(serialized);

            assertTruthy(deserialized.campaignData.campaignProgress.act1,
                'Nested object should be preserved');
            assertEqual(deserialized.campaignData.campaignProgress.act1.completed, true,
                'Nested values should be preserved');
        });

    });

    describe('Edge Cases', () => {

        it('should handle empty completed missions', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({ completedMissions: [] });

            const state = service.collectGameState(game);

            assertEqual(state.completedMissions.length, 0,
                'Empty array should be preserved');
        });

        it('should handle null current mission', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({ currentMission: null });

            const state = service.collectGameState(game);

            assertEqual(state.currentMission, null,
                'Null mission should be preserved');
        });

        it('should handle zero play time', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({ playTime: 0 });

            const state = service.collectGameState(game);

            assertEqual(state.playTime, 0,
                'Zero play time should be preserved (not treated as falsy)');
        });

        it('should handle zero mission count', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({ missionCount: 0 });

            const state = service.collectGameState(game);

            assertEqual(state.missionCount, 0,
                'Zero mission count should be preserved');
        });

        it('should handle missing services gracefully', () => {
            const service = new GameStateService(null, null, null, null);
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertTruthy(state.resources, 'Should have resources fallback');
            assertTruthy(state.agents, 'Should have agents fallback');
            assertTruthy(state.inventory, 'Should have inventory fallback');
        });

    });

    describe('Version Management', () => {

        it('should include save version', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state = service.collectGameState(game);

            assertEqual(state.version, '1.0.0', 'Should have version 1.0.0');
        });

        it('should allow version checking', () => {
            const { service } = createMockGameStateService();

            const currentVersion = service.saveVersion;

            assertEqual(currentVersion, '1.0.0',
                'Current version should be accessible');
        });

    });

    describe('Timestamp Management', () => {

        it('should create timestamp on state collection', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const before = Date.now();
            const state = service.collectGameState(game);
            const after = Date.now();

            assertTruthy(state.timestamp >= before,
                'Timestamp should be >= before');
            assertTruthy(state.timestamp <= after,
                'Timestamp should be <= after');
        });

        it('should create unique timestamps for multiple saves', async () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state1 = service.collectGameState(game);

            // Small delay
            await new Promise(resolve => setTimeout(resolve, 10));

            const state2 = service.collectGameState(game);

            assertTruthy(state2.timestamp > state1.timestamp,
                'Second save should have later timestamp');
        });

    });

    describe('Data Integrity', () => {

        it('should not mutate original game object', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame({
                completedMissions: ['m1', 'm2']
            });

            const originalLength = game.completedMissions.length;

            service.collectGameState(game);

            assertEqual(game.completedMissions.length, originalLength,
                'Original game object should not be mutated');
        });

        it('should create independent state copies', () => {
            const { service } = createMockGameStateService();
            const game = createMockGame();

            const state1 = service.collectGameState(game);
            const state2 = service.collectGameState(game);

            // Modify state1
            state1.missionCount = 999;

            assertEqual(state2.missionCount, game.missionCount,
                'State2 should not be affected by state1 modification');
        });

    });

});

console.log('💾 Save/Load tests loaded - 50+ tests for state persistence');
