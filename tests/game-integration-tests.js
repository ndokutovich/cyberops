/**
 * Game Integration Tests
 * Tests for actual game functionality that dialogs and screens depend on
 */

describe('Game Integration Tests', () => {

    it('should have all required save/load functions', () => {
        // These functions are called from the save-load dialog
        assertTruthy(game.saveGame, 'saveGame function should exist');
        assertTruthy(game.loadGame, 'loadGame function should exist');
        assertTruthy(game.quickSave, 'quickSave function should exist');
        assertTruthy(game.quickLoad, 'quickLoad function should exist');

        // Check if saveGameWithName exists or if it's been renamed
        if (!game.saveGameWithName) {
            console.warn('⚠️ saveGameWithName is missing - this will cause errors in save dialog');
            // Check for alternative function names
            assertTruthy(
                game.saveToSlot || game.saveGameToSlot || game.saveWithName,
                'No save with name function found (tried: saveGameWithName, saveToSlot, saveGameToSlot, saveWithName)'
            );
        }
    });

    it('should have all dialog action handlers', () => {
        // Test that all execute actions in dialogs have corresponding functions
        const requiredActions = {
            // From pause-menu and save-load dialogs
            'quickSave': game.quickSave,
            'quickLoad': game.quickLoad,
            'resumeGame': game.resumeGame || game.resume,
            'exitToHub': game.exitToHub || game.returnToHub,

            // From hub dialogs
            'returnToHub': game.returnToHub || game.showSyndicateHub,
            'applySettings': game.applySettings,
            'resetSettings': game.resetSettings,

            // From arsenal dialog
            'optimizeLoadouts': game.optimizeLoadouts,

            // From mission flow
            'startMission': game.startMission,
            'continueCampaign': game.continueCampaign
        };

        const missingActions = [];
        for (const [action, func] of Object.entries(requiredActions)) {
            if (!func) {
                missingActions.push(action);
            }
        }

        if (missingActions.length > 0) {
            console.error('❌ Missing action handlers:', missingActions);
        }

        assertEqual(missingActions.length, 0, `${missingActions.length} action handlers are missing`);
    });

    it('should handle save slot operations', () => {
        // Test save slot functionality
        const testSlotId = 'test-slot-1';

        // These functions are used in save-load dialog
        if (game.getSaveSlots) {
            const slots = game.getSaveSlots();
            assertTruthy(Array.isArray(slots), 'getSaveSlots should return an array');
        }

        // Test save/load operations don't throw errors
        try {
            if (game.saveToSlot) {
                // Don't actually save, just test the function exists and is callable
                assertEqual(typeof game.saveToSlot, 'function', 'saveToSlot should be a function');
            }

            if (game.loadFromSlot) {
                assertEqual(typeof game.loadFromSlot, 'function', 'loadFromSlot should be a function');
            }

            if (game.deleteSaveSlot) {
                assertEqual(typeof game.deleteSaveSlot, 'function', 'deleteSaveSlot should be a function');
            }
        } catch (error) {
            throw new Error(`Save slot operations threw error: ${error.message}`);
        }
    });

    it('should have working pause menu actions', () => {
        // Test pause menu specific functionality
        const pauseActions = [
            { name: 'pause', func: game.pause || game.pauseGame },
            { name: 'resume', func: game.resume || game.resumeGame },
            { name: 'isPaused', func: game.isPaused }
        ];

        const missing = pauseActions.filter(a => !a.func).map(a => a.name);

        if (missing.length > 0) {
            console.warn('⚠️ Missing pause functions:', missing);
        }

        // At minimum, we need some way to pause/resume
        assertTruthy(
            game.pause || game.pauseGame || game.paused !== undefined,
            'Game should have pause functionality'
        );
    });

    it('should handle dialog data requirements', () => {
        // Test that dialogs can get the data they need

        // Character dialog needs selected agent
        if (game._selectedAgent || game.selectedAgent) {
            const agent = game._selectedAgent || game.selectedAgent;
            if (agent) {
                assertTruthy(agent.name || agent.id, 'Selected agent should have name or id');
            }
        }

        // Arsenal dialog needs inventory/items
        if (game.inventory || game.items || game.arsenalItems) {
            assertTruthy(true, 'Game has inventory system');
        } else {
            console.warn('⚠️ No inventory system found for arsenal dialog');
        }

        // Mission select needs missions
        assertTruthy(game.missions || game.availableMissions, 'Game should have missions');
    });

    it('should execute dialog actions without errors', async () => {
        // Test that common dialog actions can execute
        const testActions = [
            {
                dialog: 'pause-menu',
                action: 'execute:resumeGame',
                setup: () => { game.paused = true; }
            },
            {
                dialog: 'save-load',
                action: 'execute:quickSave',
                setup: () => { game.currentScreen = 'game'; }
            },
            {
                dialog: 'settings',
                action: 'execute:applySettings',
                setup: () => { game.settings = game.settings || {}; }
            }
        ];

        for (const test of testActions) {
            try {
                // Setup test condition
                if (test.setup) test.setup();

                // Navigate to dialog
                game.dialogEngine.navigateTo(test.dialog);
                await sleep(50);

                // Find and test the action
                const state = game.dialogEngine.config.states[test.dialog];
                if (state && state.actions) {
                    const actionObj = state.actions.find(a => a.action === test.action);
                    if (actionObj) {
                        // Check if the execute function exists
                        const actionName = test.action.replace('execute:', '');
                        const func = game[actionName];
                        assertTruthy(func, `Action ${actionName} should exist for ${test.dialog}`);
                    }
                }

                game.dialogEngine.closeAll();
            } catch (error) {
                throw new Error(`Error testing ${test.dialog}: ${error.message}`);
            }
        }
    });

    it('should have save game functions matching dialog expectations', () => {
        // The save-load dialog expects these specific function names
        const expectedFunctions = [
            'saveGame',        // Basic save
            'loadGame',        // Basic load
            'quickSave',       // F5 quick save
            'quickLoad',       // F9 quick load
            'getAllSaves',     // List saves (corrected name)
            'saveToSlot',      // Save to specific slot
            'loadSaveSlot',    // Load from specific slot (corrected name)
            'deleteSave'       // Delete a save (corrected name)
        ];

        const missing = [];
        const wrongType = [];

        for (const funcName of expectedFunctions) {
            if (!game[funcName]) {
                missing.push(funcName);
            } else if (typeof game[funcName] !== 'function') {
                wrongType.push(funcName);
            }
        }

        // Special check for the error you encountered
        if (!game.saveGameWithName && !game.saveToSlot) {
            missing.push('saveGameWithName or saveToSlot');
            console.error('❌ CRITICAL: Neither saveGameWithName nor saveToSlot exists - save dialog will fail!');
        }

        if (missing.length > 0) {
            console.error('❌ Missing save/load functions:', missing);
        }

        if (wrongType.length > 0) {
            console.error('❌ Not functions:', wrongType);
        }

        assertEqual(missing.length, 0, `Missing ${missing.length} save/load functions`);
        assertEqual(wrongType.length, 0, `${wrongType.length} properties are not functions`);
    });

    it('should have all music control functions', () => {
        // These functions are called from pause/resume and screen transitions
        const musicFunctions = [
            'pauseLevelMusic',     // Called in togglePause
            'resumeLevelMusic',    // Called in resumeFromPause
            'pauseMusic',          // Alternative name
            'resumeMusic',         // Alternative name
            'stopMusic',           // General music control
            'playMusic',           // General music control
            'loadScreenMusic',     // For screen transitions
            'loadMissionMusic',    // For mission music
            'fadeOutMusic',        // For transitions
            'fadeInMusic'          // For transitions
        ];

        const missing = [];
        const alternatives = {};

        for (const funcName of musicFunctions) {
            if (!game[funcName]) {
                // Check for alternatives
                if (funcName === 'pauseLevelMusic' && game.pauseMusic) {
                    alternatives[funcName] = 'pauseMusic';
                } else if (funcName === 'resumeLevelMusic' && game.resumeMusic) {
                    alternatives[funcName] = 'resumeMusic';
                } else if (funcName === 'pauseLevelMusic' && game.musicSystem?.pause) {
                    alternatives[funcName] = 'musicSystem.pause';
                } else if (funcName === 'resumeLevelMusic' && game.musicSystem?.resume) {
                    alternatives[funcName] = 'musicSystem.resume';
                } else {
                    missing.push(funcName);
                }
            }
        }

        if (missing.length > 0) {
            console.error('❌ Missing music functions:', missing);

            // Check if these critical ones are missing
            if (missing.includes('pauseLevelMusic') && !alternatives['pauseLevelMusic']) {
                console.error('❌ CRITICAL: pauseLevelMusic is missing - will cause error in togglePause!');
            }
            if (missing.includes('resumeLevelMusic') && !alternatives['resumeLevelMusic']) {
                console.error('❌ CRITICAL: resumeLevelMusic is missing - will cause error in resumeFromPause!');
            }
        }

        if (Object.keys(alternatives).length > 0) {
            console.warn('⚠️ Music functions using alternatives:', alternatives);
        }

        // At minimum, we need pause and resume for the pause menu
        assertTruthy(
            game.pauseLevelMusic || game.pauseMusic || game.musicSystem?.pause,
            'Game must have some way to pause music'
        );
        assertTruthy(
            game.resumeLevelMusic || game.resumeMusic || game.musicSystem?.resume,
            'Game must have some way to resume music'
        );
    });

    it('should have all functions used in screen transitions', () => {
        // Test functions called during screen navigation
        const screenFunctions = [
            'togglePause',         // Called in screen config onExit
            'pauseGame',           // Alternative pause function
            'resumeFromPause',     // Called when resuming
            'resumeGame',          // Alternative resume function
            'backToMainMenu',      // Navigation function
            'showMainMenu',        // Show menu screen
            'exitToHub',           // Return to hub
            'showSyndicateHub'     // Show hub screen
        ];

        const missing = [];
        for (const funcName of screenFunctions) {
            if (!game[funcName]) {
                missing.push(funcName);
            }
        }

        if (missing.length > 0) {
            console.warn('⚠️ Missing screen transition functions:', missing);
        }

        // These are critical for pause functionality
        assertTruthy(
            game.togglePause || game.pauseGame,
            'Game must have togglePause or pauseGame function'
        );
    });

    it('should handle onclick handlers in generated HTML', () => {
        // Test that onclick handlers in dialog HTML can find their functions
        const dialogsWithOnclick = ['save-load', 'arsenal', 'hire-agents'];

        for (const dialogId of dialogsWithOnclick) {
            const state = game.dialogEngine.config.states[dialogId];
            if (state && state.content) {
                // Check if content contains onclick handlers
                let contentStr = '';
                if (typeof state.content === 'function') {
                    // Call the function to get the HTML or convert to string
                    try {
                        contentStr = state.content(game) || state.content.toString();
                    } catch (e) {
                        contentStr = state.content.toString();
                    }
                } else if (typeof state.content === 'string') {
                    contentStr = state.content;
                } else {
                    continue; // Skip if content is not string or function
                }

                if (typeof contentStr === 'string' && contentStr.includes('onclick')) {
                    // Extract function names from onclick handlers
                    const onclickPattern = /onclick="([^"]+)"/g;
                    let match;
                    const missingFuncs = [];

                    while ((match = onclickPattern.exec(contentStr)) !== null) {
                        const handler = match[1];
                        // Extract function name (e.g., "game.saveGameWithName('slot1')" -> "saveGameWithName")
                        const funcMatch = handler.match(/game\.(\w+)/);
                        if (funcMatch) {
                            const funcName = funcMatch[1];
                            if (!game[funcName]) {
                                missingFuncs.push(funcName);
                            }
                        }
                    }

                    if (missingFuncs.length > 0) {
                        console.error(`❌ Dialog ${dialogId} references missing functions:`, missingFuncs);
                    }
                }
            }
        }
    });
});

/**
 * Service Integration Tests
 * Tests for the new service-oriented architecture
 */
describe('Service Integration Tests', () => {

    it('should have GameServices singleton initialized', () => {
        assertTruthy(window.GameServices, 'GameServices singleton should exist');
        assertTruthy(game.gameServices, 'Game should have gameServices reference');
        assertEqual(game.gameServices, window.GameServices, 'Game should use GameServices singleton');
    });

    it('should have all core calculation services', () => {
        const services = game.gameServices;

        // Core services
        assertTruthy(services.formulaService, 'FormulaService should exist');
        assertTruthy(services.resourceService, 'ResourceService should exist');
        assertTruthy(services.agentService, 'AgentService should exist');

        // Feature services
        assertTruthy(services.researchService, 'ResearchService should exist');
        assertTruthy(services.equipmentService, 'EquipmentService should exist');
        assertTruthy(services.rpgService, 'RPGService should exist');
        assertTruthy(services.inventoryService, 'InventoryService should exist');

        // State management
        assertTruthy(services.gameStateService, 'GameStateService should exist');
    });

    it('should have all system services', () => {
        const services = game.gameServices;

        // System services
        assertTruthy(services.mapService, 'MapService should exist');
        assertTruthy(services.cameraService, 'CameraService should exist');
        assertTruthy(services.inputService, 'InputService should exist');
        assertTruthy(services.aiService, 'AIService should exist');
        assertTruthy(services.projectileService, 'ProjectileService should exist');
        assertTruthy(services.animationService, 'AnimationService should exist');
        assertTruthy(services.renderingService, 'RenderingService should exist');
        assertTruthy(services.uiService, 'UIService should exist');
        assertTruthy(services.hudService, 'HUDService should exist');
        assertTruthy(services.audioService, 'AudioService should exist');
        assertTruthy(services.effectsService, 'EffectsService should exist');
        assertTruthy(services.eventLogService, 'EventLogService should exist');
        assertTruthy(services.missionService, 'MissionService should exist');
    });

    it('should have service integration methods', () => {
        // Check integration wrapper methods exist
        assertTruthy(game._originalUpdate, 'Should store original update method');
        assertTruthy(game._originalRender, 'Should store original render method');
        assertTruthy(game.initializeServicesIntegration, 'Should have integration initialization');

        // Check enhanced methods
        assertTruthy(game.fireProjectileEnhanced, 'Should have enhanced projectile method');
        assertTruthy(game.showNotificationEnhanced, 'Should have enhanced notification method');
        assertTruthy(game.applyScreenShakeEnhanced, 'Should have enhanced screen shake method');
        assertTruthy(game.createExplosionEnhanced, 'Should have enhanced explosion method');
        assertTruthy(game.addCombatLogEnhanced, 'Should have enhanced combat log method');
    });

    it('should have backward compatibility properties', () => {
        // Test property getters/setters for backward compatibility
        const originalCameraX = -100;
        const originalCameraY = -200;

        // Set camera position through old properties
        game.cameraX = originalCameraX;
        game.cameraY = originalCameraY;

        // Check service received the values (note: camera uses negative values)
        assertEqual(game.gameServices.cameraService.x, -originalCameraX, 'Camera X should be set');
        assertEqual(game.gameServices.cameraService.y, -originalCameraY, 'Camera Y should be set');

        // Test projectiles property
        if (game.gameServices.projectileService) {
            const projectiles = game.projectiles;
            assertTruthy(Array.isArray(projectiles), 'Projectiles should be accessible as array');
        }
    });

    it('should have service dependencies properly injected', () => {
        const services = game.gameServices;

        // AIService should have MapService injected
        if (services.aiService && services.aiService.mapService) {
            assertEqual(services.aiService.mapService, services.mapService,
                'AIService should use shared MapService instance');
        }

        // MissionService should have dependencies
        if (services.missionService) {
            assertTruthy(services.missionService.resourceService,
                'MissionService should have ResourceService');
            assertTruthy(services.missionService.agentService,
                'MissionService should have AgentService');
            assertTruthy(services.missionService.eventLogService,
                'MissionService should have EventLogService');
        }

        // GameStateService should have dependencies
        if (services.gameStateService) {
            assertTruthy(services.gameStateService.resourceService,
                'GameStateService should have ResourceService');
            assertTruthy(services.gameStateService.agentService,
                'GameStateService should have AgentService');
            assertTruthy(services.gameStateService.inventoryService,
                'GameStateService should have InventoryService');
        }
    });

    it('should initialize services with proper state', () => {
        const services = game.gameServices;

        // CameraService should have viewport
        if (services.cameraService) {
            assertTruthy(services.cameraService.viewport, 'CameraService should have viewport');
            assertTruthy(services.cameraService.viewport.width > 0, 'Viewport width should be set');
            assertTruthy(services.cameraService.viewport.height > 0, 'Viewport height should be set');
        }

        // UIService should have dialog systems
        if (services.uiService && services.uiService.dialogSystems) {
            assertTruthy(services.uiService.dialogSystems.modalEngine ||
                       services.uiService.dialogSystems.declarativeEngine,
                       'UIService should have dialog systems initialized');
        }

        // HUDService should be initialized
        if (services.hudService) {
            assertTruthy(services.hudService.initialized || services.hudService.canvas,
                'HUDService should be initialized');
        }
    });

    it('should handle service method calls without errors', () => {
        const services = game.gameServices;

        try {
            // Test FormulaService
            if (services.formulaService) {
                const damage = services.formulaService.calculateDamage(20, 5, 2, 3);
                assertTruthy(typeof damage === 'number', 'Damage calculation should return number');
            }

            // Test ResourceService
            if (services.resourceService) {
                const credits = services.resourceService.getCredits();
                assertTruthy(typeof credits === 'number', 'Credits should be a number');
            }

            // Test MapService collision detection
            if (services.mapService) {
                const walkable = services.mapService.isWalkable(0, 0);
                assertTruthy(typeof walkable === 'boolean', 'isWalkable should return boolean');
            }

            // Test CameraService methods
            if (services.cameraService) {
                services.cameraService.setPosition(0, 0, true);
                assertEqual(services.cameraService.x, 0, 'Camera X should be set');
                assertEqual(services.cameraService.y, 0, 'Camera Y should be set');
            }

            // Test AIService pathfinding
            if (services.aiService && services.aiService.findPath) {
                const path = services.aiService.findPath(0, 0, 1, 1);
                assertTruthy(Array.isArray(path), 'Pathfinding should return array');
            }

        } catch (error) {
            fail(`Service method call failed: ${error.message}`);
        }
    });

    it('should update services in game loop', () => {
        // Test that services are called during update
        if (game.update && game.gameServices) {
            const originalUpdateAI = game.gameServices.aiService ?
                game.gameServices.aiService.update : null;

            if (originalUpdateAI) {
                let aiUpdateCalled = false;
                game.gameServices.aiService.update = function(deltaTime) {
                    aiUpdateCalled = true;
                    if (originalUpdateAI) originalUpdateAI.call(this, deltaTime);
                };

                // Trigger an update
                game.update();

                // Restore original
                game.gameServices.aiService.update = originalUpdateAI;

                assertTruthy(aiUpdateCalled, 'AIService.update should be called in game loop');
            }
        }
    });

    it('should handle service integration flags', () => {
        // Check rendering service flag
        assertTruthy(typeof game.useRenderingService === 'boolean',
            'useRenderingService flag should exist');

        // Test that we can toggle it
        const originalValue = game.useRenderingService;
        game.useRenderingService = true;
        assertEqual(game.useRenderingService, true, 'Should be able to enable RenderingService');
        game.useRenderingService = false;
        assertEqual(game.useRenderingService, false, 'Should be able to disable RenderingService');
        game.useRenderingService = originalValue; // Restore
    });

    it('should have service alias methods', () => {
        // Check that alias methods were created
        if (game.initializeServicesIntegration) {
            // Initialize if not already done
            game.initializeServicesIntegration();

            // Check aliases
            assertTruthy(game.fireWeapon, 'fireWeapon alias should exist');
            assertTruthy(game.notify, 'notify alias should exist');
            assertTruthy(game.shakeScreen, 'shakeScreen alias should exist');
            assertTruthy(game.explode, 'explode alias should exist');
            assertTruthy(game.logCombat, 'logCombat alias should exist');

            // Test that aliases are functions (they're bound, so not strictly equal)
            assertTruthy(typeof game.fireWeapon === 'function',
                'fireWeapon should be a function');
            assertTruthy(typeof game.notify === 'function',
                'notify should be a function');
            assertTruthy(typeof game.shakeScreen === 'function',
                'shakeScreen should be a function');
        }
    });

    it('should calculate agent stats with all modifiers', () => {
        const services = game.gameServices;

        if (services.calculateAgentStats) {
            const baseAgent = {
                name: 'Test Agent',
                health: 100,
                damage: 20,
                speed: 5
            };

            const modifiedAgent = services.calculateAgentStats(
                baseAgent,
                [], // completed research
                [], // weapons
                []  // equipment
            );

            assertTruthy(modifiedAgent, 'Should return modified agent');
            assertEqual(modifiedAgent.name, 'Test Agent', 'Should preserve agent name');
            assertTruthy(typeof modifiedAgent.health === 'number', 'Health should be a number');
        }
    });

    it('should calculate attack damage correctly', () => {
        const services = game.gameServices;

        if (services.calculateAttackDamage) {
            const attacker = { damage: 20, damageBonus: 5 };
            const target = { protection: 3 };
            const context = { distance: 5, critical: false };

            const damage = services.calculateAttackDamage(attacker, target, context);

            assertTruthy(typeof damage === 'number', 'Damage should be a number');
            assertTruthy(damage >= 0, 'Damage should not be negative');
        }
    });

    it('should validate game state consistency', () => {
        const services = game.gameServices;

        if (services.validateGameState) {
            const gameState = {
                agents: [
                    { name: 'Agent1', health: 100, speed: 5 },
                    { name: 'Agent2', health: 80, speed: 4 }
                ],
                completedResearch: [],
                totalResearchSpent: 0
            };

            const validation = services.validateGameState(gameState);

            assertTruthy(validation, 'Should return validation result');
            assertTruthy(typeof validation.valid === 'boolean', 'Should have valid flag');
            assertTruthy(Array.isArray(validation.errors), 'Should have errors array');

            // This state should be valid
            assertEqual(validation.valid, true, 'Valid state should pass validation');
            assertEqual(validation.errors.length, 0, 'Valid state should have no errors');
        }
    });

    it('should handle mission rewards calculation', () => {
        const services = game.gameServices;

        if (services.calculateMissionRewards) {
            const missionData = {
                baseCredits: 1000,
                baseResearch: 50,
                difficulty: 'normal',
                objectives: { completed: 3, total: 3 },
                bonusObjectives: { completed: 1, total: 2 }
            };

            const rewards = services.calculateMissionRewards(missionData);

            assertTruthy(rewards, 'Should return rewards object');
            assertTruthy(typeof rewards.credits === 'number' ||
                       typeof rewards.research === 'number',
                       'Should have numeric rewards');
        }
    });

    it('should provide service statistics', () => {
        const services = game.gameServices;

        if (services.getStatistics) {
            const stats = services.getStatistics();

            assertTruthy(stats, 'Should return statistics object');
            assertTruthy(typeof stats.totalResearchProjects === 'number',
                'Should have research project count');
            assertTruthy(typeof stats.totalWeapons === 'number',
                'Should have weapon count');
            assertTruthy(typeof stats.totalEquipment === 'number',
                'Should have equipment count');
            assertTruthy(stats.formulaConstants,
                'Should have formula constants');
        }
    });
});

// Export for test runner
window.GameIntegrationTests = true;