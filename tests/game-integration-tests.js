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
            'getSaveSlots',    // List saves
            'saveToSlot',      // Save to specific slot
            'loadFromSlot',    // Load from specific slot
            'deleteSaveSlot'   // Delete a save
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

// Export for test runner
window.GameIntegrationTests = true;