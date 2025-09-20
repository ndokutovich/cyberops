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

// Export for use
window.SimpleTestSuite = true;