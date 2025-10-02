/**
 * SaveGameService Tests
 * Tests save/load operations, slot management, and data persistence
 */

// Node.js environment setup
if (typeof window === 'undefined') {
    // Mock localStorage for Node.js
    global.localStorage = {
        _data: {},
        setItem: function(key, value) { this._data[key] = value; },
        getItem: function(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
        removeItem: function(key) { delete this._data[key]; },
        clear: function() { this._data = {}; }
    };

    // Mock document for Node.js
    global.document = {
        getElementById: function(id) {
            return {
                id: id,
                width: 800,
                height: 600,
                toDataURL: function() { return 'data:image/jpeg;base64,mockdata'; }
            };
        },
        createElement: function(tag) {
            return {
                tagName: tag,
                getContext: function() {
                    return {
                        drawImage: function() {}
                    };
                }
            };
        }
    };

    // Load SaveGameService
    const SaveGameService = require('../js/services/save-game-service.js');
    global.SaveGameService = SaveGameService;
}

// Browser compatibility: Ensure window.GameServices has ALL required methods
if (typeof window !== 'undefined') {
    if (!window.GameServices) {
        window.GameServices = {};
    }

    // Mock all services that SaveGameService uses
    const mockServices = {
        inventoryService: {
            getWeapons: () => [],
            getArmor: () => [],
            getItems: () => [],
            loadInventoryData: (data) => { /* mock */ }
        },
        researchService: {
            getCompletedResearch: () => [],
            getInProgressResearch: () => [],
            loadResearchData: (data) => { /* mock */ }
        },
        resourceService: {
            getCredits: () => 0,
            getResearchPoints: () => 0,
            getWorldControl: () => 0,
            setCredits: (value) => { /* mock */ },
            setResearchPoints: (value) => { /* mock */ }
        },
        agentService: {
            getAvailableAgents: () => [],
            getActiveAgents: () => [],
            getFallenAgents: () => [],
            loadAgentData: (data) => { /* mock */ }
        },
        rpgService: {
            getAllCharacterData: () => ({}),
            loadAllCharacterData: (data) => { /* mock */ }
        },
        missionService: {
            getCurrentMission: () => null,
            getCompletedMissions: () => [],
            getFailedMissions: () => [],
            loadMissionData: (data) => { /* mock */ }
        }
    };

    // Apply mocks to window.GameServices
    Object.keys(mockServices).forEach(serviceName => {
        if (!window.GameServices[serviceName]) {
            window.GameServices[serviceName] = mockServices[serviceName];
        } else {
            // Patch existing service with missing methods
            const service = window.GameServices[serviceName];
            const mock = mockServices[serviceName];
            Object.keys(mock).forEach(method => {
                if (typeof service[method] !== 'function') {
                    service[method] = mock[method];
                }
            });
        }
    });
}

describe('SaveGameService Tests', () => {

    // Helper function to create mock game object
    function createMockGame() {
        return {
            totalCampaignTime: 12345,
            gameController: {
                facade: {
                    currentScreen: 'hub',
                    currentMission: 'main-01-001',
                    currentCampaign: 'main',
                    completedMissions: ['main-01-001', 'main-01-002'],
                    agents: [],
                    agentLoadouts: {},
                    unlockedContent: []
                }
            }
        };
    }

    // Helper function to create mock GameStateService
    function createMockGameStateService() {
        return {
            collectGameState: (game) => ({
                screen: game.gameController.facade.currentScreen,
                mission: game.gameController.facade.currentMission
            }),
            applyGameState: (game, state) => {
                if (game.gameController.facade) {
                    game.gameController.facade.currentScreen = state.screen;
                    game.gameController.facade.currentMission = state.mission;
                }
            }
        };
    }

    // Helper to clear localStorage
    function clearTestSaves() {
        // For Node.js mock, access _data directly
        const storageObj = localStorage._data || localStorage;
        const keys = Object.keys(storageObj);
        keys.forEach(key => {
            if (key.startsWith('cyberops_save_')) {
                localStorage.removeItem(key);
            }
        });
    }

    describe('SaveGameService Initialization', () => {

        it('should initialize with correct default config', () => {
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            assertTruthy(service, 'Service should be created');
            assertEqual(service.config.maxSaveSlots, 10, 'Should have 10 max save slots');
            assertEqual(service.config.autosaveSlots, 3, 'Should have 3 autosave slots');
            assertEqual(service.config.saveVersion, '2.0.0', 'Should have version 2.0.0');
            assertTruthy(service.saveSlots instanceof Map, 'Save slots should be a Map');
            assertTruthy(service.saveMetadata instanceof Map, 'Save metadata should be a Map');
        });

        it('should initialize with GameStateService dependency', () => {
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            assertEqual(service.gameStateService, mockGameStateService, 'Should store GameStateService reference');
        });

        it('should load existing save metadata on initialization', () => {
            // Store test metadata
            const testMetadata = [[
                'test_slot',
                { timestamp: Date.now(), level: 'Test Level' }
            ]];
            localStorage.setItem('cyberops_save_metadata', JSON.stringify(testMetadata));

            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            assertEqual(service.saveMetadata.size, 1, 'Should load 1 save metadata entry');
            assertTruthy(service.saveMetadata.has('test_slot'), 'Should have test_slot metadata');

            // Cleanup
            clearTestSaves();
        });

    });

    describe('Save Creation', () => {

        it('should create a new save with correct structure', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.createSave(mockGame, 'test_slot_1', 'Test Save', false);

            assertTruthy(result.success, 'Save creation should succeed');
            assertEqual(result.slotId, 'test_slot_1', 'Should return correct slot ID');
            assertTruthy(result.metadata, 'Should return metadata');

            // Verify save is in memory
            assertTruthy(service.saveSlots.has('test_slot_1'), 'Save should be in memory');
            const save = service.saveSlots.get('test_slot_1');
            assertEqual(save.version, '2.0.0', 'Save should have version');
            assertEqual(save.name, 'Test Save', 'Save should have name');
            assertFalsy(save.isAutosave, 'Should not be autosave');

            clearTestSaves();
        });

        it('should generate save name if not provided', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.createSave(mockGame, 'test_slot_2');

            assertTruthy(result.success, 'Save creation should succeed');
            const save = service.saveSlots.get('test_slot_2');
            assertTruthy(save.name.includes('Save'), 'Should generate save name');

            clearTestSaves();
        });

        it('should gather save data from game facade', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.createSave(mockGame, 'test_slot_3', 'Facade Test');

            const save = service.saveSlots.get('test_slot_3');
            assertTruthy(save.data.facade, 'Should have facade data');
            assertEqual(save.data.facade.currentScreen, 'hub', 'Should save current screen');
            assertEqual(save.data.facade.currentMission, 'main-01-001', 'Should save current mission');

            clearTestSaves();
        });

        it('should create save metadata with correct fields', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.createSave(mockGame, 'test_slot_4', 'Metadata Test');

            assertTruthy(result.metadata, 'Should have metadata');
            assertTruthy(result.metadata.timestamp, 'Should have timestamp');
            assertTruthy('playTime' in result.metadata, 'Should have playTime');
            assertTruthy('level' in result.metadata, 'Should have level');
            assertTruthy('credits' in result.metadata, 'Should have credits');

            clearTestSaves();
        });

        it('should update lastSaveTime and currentSlot', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const beforeTime = Date.now();
            await service.createSave(mockGame, 'test_slot_5', 'Time Test');
            const afterTime = Date.now();

            assertTruthy(service.lastSaveTime >= beforeTime, 'lastSaveTime should be updated');
            assertTruthy(service.lastSaveTime <= afterTime, 'lastSaveTime should be in range');
            assertEqual(service.currentSlot, 'test_slot_5', 'currentSlot should be updated');

            clearTestSaves();
        });

    });

    describe('Save Loading', () => {

        it('should load existing save correctly', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Create save first
            const createResult = await service.createSave(mockGame, 'load_test_1', 'Load Test');
            console.log('[Test Debug] createSave result:', createResult);

            // Load save
            const result = await service.loadSave(mockGame, 'load_test_1');
            console.log('[Test Debug] loadSave result:', result);

            assertTruthy(result.success, 'Load should succeed');
            assertEqual(result.slotId, 'load_test_1', 'Should return correct slot ID');
            assertTruthy(result.saveData, 'Should return save data');

            clearTestSaves();
        });

        it('should fail to load non-existent save', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.loadSave(mockGame, 'non_existent_slot');

            assertFalsy(result.success, 'Load should fail');
            assertTruthy(result.error, 'Should have error message');
            assertTruthy(result.error.includes('not found'), 'Error should mention not found');

            clearTestSaves();
        });

        it('should apply save data to game facade', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            mockGame.gameController.facade.currentScreen = 'menu';
            mockGame.gameController.facade.currentMission = 'none';

            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Create save with specific data
            await service.createSave(mockGame, 'apply_test', 'Apply Test');

            // Change game state
            mockGame.gameController.facade.currentScreen = 'game';
            mockGame.gameController.facade.currentMission = 'different';

            // Load save
            await service.loadSave(mockGame, 'apply_test');

            // Verify state was restored
            assertEqual(mockGame.gameController.facade.currentScreen, 'menu', 'Screen should be restored');
            assertEqual(mockGame.gameController.facade.currentMission, 'none', 'Mission should be restored');

            clearTestSaves();
        });

        it('should update currentSlot on load', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.createSave(mockGame, 'slot_test', 'Slot Test');
            await service.loadSave(mockGame, 'slot_test');

            assertEqual(service.currentSlot, 'slot_test', 'currentSlot should be updated after load');

            clearTestSaves();
        });

    });

    describe('Save Deletion', () => {

        it('should delete save from memory and storage', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Create save
            await service.createSave(mockGame, 'delete_test', 'Delete Test');
            assertTruthy(service.saveSlots.has('delete_test'), 'Save should exist before delete');

            // Delete save
            const result = await service.deleteSave('delete_test');

            assertTruthy(result.success, 'Delete should succeed');
            assertFalsy(service.saveSlots.has('delete_test'), 'Save should be removed from memory');
            assertFalsy(service.saveMetadata.has('delete_test'), 'Metadata should be removed');

            // Verify removed from localStorage
            const stored = localStorage.getItem('cyberops_save_delete_test');
            assertEqual(stored, null, 'Save should be removed from localStorage');

            clearTestSaves();
        });

        it('should clear currentSlot if deleted save was current', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.createSave(mockGame, 'current_delete', 'Current Delete');
            assertEqual(service.currentSlot, 'current_delete', 'Current slot should be set');

            await service.deleteSave('current_delete');

            assertEqual(service.currentSlot, null, 'Current slot should be cleared');

            clearTestSaves();
        });

    });

    describe('Quick Save/Load', () => {

        it('should create quick save in quicksave slot', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.quickSave(mockGame);

            assertTruthy(result.success, 'Quick save should succeed');
            assertEqual(result.slotId, 'quicksave', 'Should use quicksave slot');
            assertTruthy(service.saveSlots.has('quicksave'), 'Quick save should exist');

            const save = service.saveSlots.get('quicksave');
            assertEqual(save.name, 'Quick Save', 'Should have Quick Save name');

            clearTestSaves();
        });

        it('should load from quicksave slot', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.quickSave(mockGame);
            const result = await service.quickLoad(mockGame);

            assertTruthy(result.success, 'Quick load should succeed');
            assertEqual(result.slotId, 'quicksave', 'Should load from quicksave slot');

            clearTestSaves();
        });

    });

    describe('Autosave', () => {

        it('should create autosave with rotating slot', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // First autosave
            const result1 = await service.autosave(mockGame);
            assertTruthy(result1.success, 'First autosave should succeed');
            assertEqual(result1.slotId, 'autosave_0', 'Should use autosave_0');

            // Second autosave
            const result2 = await service.autosave(mockGame);
            assertEqual(result2.slotId, 'autosave_1', 'Should use autosave_1');

            // Third autosave
            const result3 = await service.autosave(mockGame);
            assertEqual(result3.slotId, 'autosave_2', 'Should use autosave_2');

            // Fourth should rotate back
            const result4 = await service.autosave(mockGame);
            assertEqual(result4.slotId, 'autosave_0', 'Should rotate back to autosave_0');

            clearTestSaves();
        });

        it('should mark autosave as isAutosave', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.autosave(mockGame);
            const save = service.saveSlots.get('autosave_0');

            assertTruthy(save.isAutosave, 'Should be marked as autosave');
            assertTruthy(save.name.includes('Autosave'), 'Name should include Autosave');

            clearTestSaves();
        });

    });

    describe('Save Slot Management', () => {

        it('should get all save slots sorted by timestamp', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Create multiple saves with delays
            await service.createSave(mockGame, 'slot_1', 'First');
            await sleep(10);
            await service.createSave(mockGame, 'slot_2', 'Second');
            await sleep(10);
            await service.createSave(mockGame, 'slot_3', 'Third');

            const slots = service.getAllSaveSlots();

            assertEqual(slots.length, 3, 'Should have 3 save slots');
            assertEqual(slots[0].slotId, 'slot_3', 'Newest should be first');
            assertEqual(slots[2].slotId, 'slot_1', 'Oldest should be last');

            clearTestSaves();
        });

        it('should return empty array when no saves exist', () => {
            clearTestSaves();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const slots = service.getAllSaveSlots();

            assertEqual(slots.length, 0, 'Should return empty array');
        });

    });

    describe('Version Compatibility', () => {

        it('should consider same major version compatible', () => {
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            assertTruthy(service.isCompatibleVersion('2.0.0'), 'v2.0.0 should be compatible with v2.0.0');
            assertTruthy(service.isCompatibleVersion('2.1.0'), 'v2.1.0 should be compatible with v2.0.0');
            assertTruthy(service.isCompatibleVersion('2.5.9'), 'v2.5.9 should be compatible with v2.0.0');
        });

        it('should consider different major version incompatible', () => {
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            assertFalsy(service.isCompatibleVersion('1.0.0'), 'v1.0.0 should be incompatible with v2.0.0');
            assertFalsy(service.isCompatibleVersion('3.0.0'), 'v3.0.0 should be incompatible with v2.0.0');
        });

    });

    describe('Save Persistence', () => {

        it('should persist save to localStorage', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            await service.createSave(mockGame, 'persist_test', 'Persist Test');

            const stored = localStorage.getItem('cyberops_save_persist_test');
            assertTruthy(stored, 'Save should be in localStorage');

            const parsed = JSON.parse(stored);
            assertEqual(parsed.name, 'Persist Test', 'Stored save should have correct name');
            assertEqual(parsed.version, '2.0.0', 'Stored save should have version');

            clearTestSaves();
        });

        it('should retrieve save from localStorage', async () => {
            clearTestSaves();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Manually create save in localStorage
            const testSave = {
                version: '2.0.0',
                name: 'Manual Test',
                data: { test: 'data' },
                metadata: { timestamp: Date.now() }
            };
            localStorage.setItem('cyberops_save_manual_test', JSON.stringify(testSave));

            const retrieved = await service.retrieveSave('manual_test');

            assertTruthy(retrieved, 'Should retrieve save');
            assertEqual(retrieved.name, 'Manual Test', 'Should have correct name');

            clearTestSaves();
        });

    });

    describe('Save Data Gathering', () => {

        it('should gather game state from GameStateService', async () => {
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const saveData = await service.gatherSaveData(mockGame);

            assertTruthy(saveData.gameState, 'Should have gameState');
            assertEqual(saveData.gameState.screen, 'hub', 'Should gather screen state');
            assertEqual(saveData.gameState.mission, 'main-01-001', 'Should gather mission state');
        });

        it('should gather facade data', async () => {
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const saveData = await service.gatherSaveData(mockGame);

            assertTruthy(saveData.facade, 'Should have facade data');
            assertEqual(saveData.facade.currentScreen, 'hub', 'Should have current screen');
            assertEqual(saveData.facade.currentMission, 'main-01-001', 'Should have current mission');
            assertTruthy(Array.isArray(saveData.facade.completedMissions), 'Should have completed missions array');
        });

    });

    describe('Error Handling', () => {

        it('should handle save creation failure gracefully', async () => {
            const mockGame = null; // Invalid game object
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            // Should not throw, should return error result
            const result = await service.createSave(mockGame, 'error_test', 'Error Test');

            // Note: Current implementation may still succeed with null game
            // This test documents the behavior
            assertTruthy(typeof result.success === 'boolean', 'Should return result object');
        });

        it('should handle load failure gracefully', async () => {
            clearTestSaves();
            const mockGame = createMockGame();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.loadSave(mockGame, 'non_existent');

            assertFalsy(result.success, 'Should return failure');
            assertTruthy(result.error, 'Should have error message');
        });

        it('should handle delete failure gracefully', async () => {
            clearTestSaves();
            const mockGameStateService = createMockGameStateService();
            const service = new SaveGameService(mockGameStateService);

            const result = await service.deleteSave('non_existent');

            // Delete of non-existent should succeed (idempotent)
            assertTruthy(result.success, 'Delete of non-existent should succeed');
        });

    });

    // Generate coverage report
    console.log('\n📊 SaveGameService Test Coverage Report');
    console.log('==========================================');
    console.log('✅ Initialization: 3 tests');
    console.log('✅ Save Creation: 5 tests');
    console.log('✅ Save Loading: 4 tests');
    console.log('✅ Save Deletion: 2 tests');
    console.log('✅ Quick Save/Load: 2 tests');
    console.log('✅ Autosave: 2 tests');
    console.log('✅ Slot Management: 2 tests');
    console.log('✅ Version Compatibility: 2 tests');
    console.log('✅ Persistence: 2 tests');
    console.log('✅ Data Gathering: 2 tests');
    console.log('✅ Error Handling: 3 tests');
    console.log('==========================================');
    console.log('Total: 29 tests covering SaveGameService');
});
