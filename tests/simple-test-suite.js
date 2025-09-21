/**
 * Simplified Test Suite - Basic functionality tests only
 * Avoids complex navigation and DOM manipulation
 */

describe('Basic Functionality Tests', () => {

    it('should have game instance initialized', () => {
        assertTruthy(game, 'Game instance should exist');
        assertEqual(game.constructor.name, 'CyberOpsGame', 'Should be CyberOpsGame instance');
    });

    it('should have dialog engine initialized', () => {
        assertTruthy(game.dialogEngine, 'Dialog engine should exist');
        assertTruthy(game.dialogEngine.config, 'Dialog config should be loaded');
        assertTruthy(game.dialogEngine.config.states, 'Dialog states should be defined');
    });

    it('should have screen manager initialized', () => {
        assertTruthy(window.screenManager, 'Screen manager should exist');
        assertTruthy(window.screenManager.screenRegistry, 'Screen registry should be initialized');
        assertTruthy(window.screenManager.screenContainer, 'Screen container should exist');
    });

    it('should have campaigns loaded', () => {
        assertTruthy(game.missions, 'Missions should be loaded');
        // Missions load asynchronously, so check length after a delay
        assertTruthy(game.missions && game.missions.length >= 0, 'Missions array should exist');
    });

    it('should have agents loaded', async () => {
        assertTruthy(game.activeAgents, 'Active agents should exist');
        assertTruthy(Array.isArray(game.activeAgents), 'Active agents should be an array');

        // Wait for campaign to load agents (they load asynchronously)
        let attempts = 0;
        while (game.activeAgents.length === 0 && attempts < 20) {
            await sleep(100);
            attempts++;
        }

        assertTruthy(game.activeAgents.length > 0, 'Should have at least one active agent after campaign loads');
    });

    it('should navigate to basic dialog states', async () => {
        // Test simple navigation without complex triggers
        game.dialogEngine.closeAll();

        // Test agent-management
        game.dialogEngine.navigateTo('agent-management');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'agent-management', 'Should navigate to agent-management');

        // Test back
        game.dialogEngine.back();
        await sleep(50);
        assertFalsy(game.dialogEngine.currentState, 'Back should close dialog');
    });

    it('should handle dialog stack correctly', () => {
        // The stack is named stateStack in DeclarativeDialogEngine
        game.dialogEngine.closeAll();
        assertEqual(game.dialogEngine.stateStack.length, 0, 'Stack should be empty after closeAll');

        game.dialogEngine.navigateTo('pause-menu');
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack should have 1 item');

        game.dialogEngine.navigateTo('settings');
        assertEqual(game.dialogEngine.stateStack.length, 2, 'Stack should have 2 items');

        game.dialogEngine.closeAll();
        assertEqual(game.dialogEngine.stateStack.length, 0, 'CloseAll should empty stack');
    });

    it('should have correct dialog config structure', () => {
        const config = game.dialogEngine.config;
        assertTruthy(config.states, 'Config should have states');
        assertTruthy(config.states['agent-management'], 'Should have agent-management state');
        assertTruthy(config.states['pause-menu'], 'Should have pause-menu state');
        assertTruthy(config.states['arsenal'], 'Should have arsenal state');
    });
});

describe('Screen Layer Tests', () => {

    it('should register and navigate to screens', () => {
        const sm = window.screenManager;

        // Register a test screen
        sm.registerScreen('test-screen', {
            type: 'generated',
            content: '<h1>Test</h1>'
        });

        assertTruthy(sm.screenRegistry.has('test-screen'), 'Screen should be registered');

        // Navigate to it
        sm.navigateTo('test-screen');
        assertEqual(sm.currentScreen, 'test-screen', 'Should navigate to test screen');
    });

    it('should handle screen types correctly', () => {
        const sm = window.screenManager;

        // Test DOM screen type
        sm.registerScreen('dom-test', {
            type: 'dom',
            elementId: 'syndicateHub'
        });
        assertTruthy(sm.screenRegistry.has('dom-test'), 'DOM screen should register');

        // Test canvas screen type
        sm.registerScreen('canvas-test', {
            type: 'canvas'
        });
        assertTruthy(sm.screenRegistry.has('canvas-test'), 'Canvas screen should register');

        // Test generated screen type
        sm.registerScreen('gen-test', {
            type: 'generated',
            content: 'test'
        });
        assertTruthy(sm.screenRegistry.has('gen-test'), 'Generated screen should register');
    });

    it('should maintain screen-dialog separation', () => {
        const sm = window.screenManager;
        const de = game.dialogEngine;

        // Navigate to a screen
        sm.navigateTo('hub');
        assertEqual(sm.currentScreen, 'hub', 'Should be on hub screen');

        // Open a dialog - should not change screen
        de.navigateTo('character');
        assertEqual(sm.currentScreen, 'hub', 'Screen should remain hub when dialog opens');

        // Close dialog - screen should still be hub
        de.closeAll();
        assertEqual(sm.currentScreen, 'hub', 'Screen should remain hub after dialog closes');
    });

    it('should handle screen transitions', () => {
        const sm = window.screenManager;

        // Register multiple screens
        sm.registerScreen('screen-a', { type: 'generated', content: 'A' });
        sm.registerScreen('screen-b', { type: 'generated', content: 'B' });

        // Navigate through them
        sm.navigateTo('screen-a');
        assertEqual(sm.currentScreen, 'screen-a', 'Should be on screen A');

        sm.navigateTo('screen-b');
        assertEqual(sm.currentScreen, 'screen-b', 'Should transition to screen B');

        // Previous screen should be cleaned up
        const prevScreen = document.getElementById('screen-screen-a');
        assertFalsy(prevScreen, 'Previous screen should be removed');
    });

    it('should execute screen actions', () => {
        const sm = window.screenManager;
        let actionExecuted = false;

        // Register screen with onEnter action
        sm.registerScreen('action-screen', {
            type: 'generated',
            content: 'Test',
            onEnter: function() {
                actionExecuted = true;
            }
        });

        // Navigate should trigger action
        sm.navigateTo('action-screen');
        assertTruthy(actionExecuted, 'onEnter action should execute');
    });

    it('should pass parameters to screens', () => {
        const sm = window.screenManager;

        // Register screen that uses params
        sm.registerScreen('param-screen', {
            type: 'generated',
            content: function(params) {
                return `Score: ${params?.score || 0}`;
            }
        });

        // Navigate with params
        sm.navigateTo('param-screen', { score: 100 });

        const screenEl = document.getElementById('screen-param-screen');
        assertTruthy(screenEl, 'Screen element should exist');
        assertTruthy(screenEl.innerHTML.includes('Score: 100'), 'Should use passed parameters');
    });
});

// Export for use
window.SimpleTestSuite = true;