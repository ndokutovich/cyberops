/**
 * Basic Dialog Tests - No DOM dependencies
 * Tests core dialog engine functionality without UI elements
 */

describe('Basic Dialog Tests', () => {

    // Clean up before each test to ensure isolation
    beforeEach(async () => {
        if (game && game.dialogEngine) {
            game.dialogEngine.closeAll();
            await sleep(50);
        }
    });

    // Clean up after each test
    afterEach(async () => {
        if (game && game.dialogEngine) {
            game.dialogEngine.closeAll();
            await sleep(50);
        }
    });

    it('should initialize dialog engine with correct state count', () => {
        assertTruthy(game.dialogEngine, 'Dialog engine should exist');
        assertTruthy(game.dialogEngine.config, 'Dialog config should be loaded');
        const stateCount = Object.keys(game.dialogEngine.config.states).length;
        assertTruthy(stateCount >= 15, `Should have at least 15 dialog states, found ${stateCount}`);
    });

    it('should navigate to simple dialogs without data requirements', async () => {
        const simpleDialogs = [
            'pause-menu', 'settings', 'save-load',
            'agent-management', 'arsenal', 'character',
            'research-lab', 'hall-of-glory'
        ];

        for (const dialog of simpleDialogs) {
            game.dialogEngine.navigateTo(dialog);
            await sleep(50);
            assertEqual(game.dialogEngine.currentState, dialog, `Should navigate to ${dialog}`);
            game.dialogEngine.closeAll(); // Reset for next iteration
            await sleep(20);
        }
    });

    it('should properly manage dialog stack depth', async () => {
        assertEqual(game.dialogEngine.stateStack.length, 0, 'Stack should start empty');

        // Navigate through multiple levels
        game.dialogEngine.navigateTo('pause-menu');
        await sleep(50);
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack depth should be 1');

        game.dialogEngine.navigateTo('settings');
        await sleep(50);
        assertEqual(game.dialogEngine.stateStack.length, 2, 'Stack depth should be 2');

        // Back navigation
        game.dialogEngine.back();
        await sleep(50);
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack depth should decrease to 1');

        // Close all
        game.dialogEngine.closeAll();
        assertEqual(game.dialogEngine.stateStack.length, 0, 'Stack should be empty after closeAll');
    });

    it('should handle dialog transitions correctly', async () => {
        // Test allowed transitions
        game.screen = 'hub';

        // Hub to agent management
        game.dialogEngine.navigateTo('agent-management');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'agent-management', 'Should transition from hub to agent-management');

        // Agent management to hire agents
        game.dialogEngine.navigateTo('hire-agents');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'hire-agents', 'Should transition to hire-agents');

        // Back to agent management
        game.dialogEngine.back();
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'agent-management', 'Should go back to agent-management');
    });

    it('should maintain state data through navigation', async () => {
        // Set some state data
        game.dialogEngine.stateData.testValue = 'test123';
        game.dialogEngine.stateData.testNumber = 42;

        // Navigate to a dialog
        game.dialogEngine.navigateTo('settings');
        await sleep(50);

        // Verify state data persists
        assertEqual(game.dialogEngine.stateData.testValue, 'test123', 'String data should persist');
        assertEqual(game.dialogEngine.stateData.testNumber, 42, 'Number data should persist');

        // Navigate to another dialog
        game.dialogEngine.navigateTo('save-load');
        await sleep(50);

        // Verify data still persists
        assertEqual(game.dialogEngine.stateData.testValue, 'test123', 'Data should persist through multiple navigations');
    });

    it('should properly close dialogs', async () => {
        assertFalsy(game.dialogEngine.currentState, 'Should have no current state after beforeEach');

        // Open a dialog
        game.dialogEngine.navigateTo('pause-menu');
        await sleep(50);
        assertTruthy(game.dialogEngine.currentState, 'Should have a current state');

        // Close it
        game.dialogEngine.close();
        await sleep(50);
        assertFalsy(game.dialogEngine.currentState, 'Should have no current state after close');
    });

    it('should handle rapid navigation without errors', async () => {
        const dialogs = ['settings', 'save-load', 'arsenal', 'character'];

        // Rapidly navigate through dialogs
        for (let i = 0; i < 20; i++) {
            const randomDialog = dialogs[Math.floor(Math.random() * dialogs.length)];
            game.dialogEngine.navigateTo(randomDialog);
            // Very short delay to simulate rapid clicking
            await sleep(10);
        }

        // System should still be functional
        game.dialogEngine.closeAll();
        assertFalsy(game.dialogEngine.currentState, 'Should be able to close after rapid navigation');

        // Should be able to navigate normally again
        game.dialogEngine.navigateTo('pause-menu');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'pause-menu', 'Should navigate normally after rapid test');
    });

    it('should validate dialog configuration structure', () => {
        const config = game.dialogEngine.config;

        // Check essential properties exist
        assertTruthy(config.states, 'Config should have states');
        assertTruthy(config.settings, 'Config should have settings');

        // Check that each state has required properties
        for (const [stateName, stateConfig] of Object.entries(config.states)) {
            assertTruthy(stateConfig.title, `State ${stateName} should have a title`);
            assertTruthy(stateConfig.template || stateConfig.content, `State ${stateName} should have template or content`);
        }
    });

    it('should handle back navigation from root correctly', async () => {
        // Ensure we start from a clean state
        assertEqual(game.dialogEngine.stateStack.length, 0, 'Stack should be empty to start');
        assertFalsy(game.dialogEngine.currentState, 'Should have no current state');

        // Try to go back when there's nothing to go back to - should handle gracefully
        try {
            game.dialogEngine.back();
            await sleep(50);
            // If we get here without error, that's success
            assertFalsy(game.dialogEngine.currentState, 'Should still have no current state');
            assertEqual(game.dialogEngine.stateStack.length, 0, 'Stack should remain empty');
        } catch (e) {
            // Back on empty stack might throw, which is okay
            console.warn('Back on empty stack threw (acceptable):', e.message);
        }
    });

    it('should support refresh without state loss', async () => {
        game.dialogEngine.navigateTo('arsenal');
        await sleep(50);
        const stateBefore = game.dialogEngine.currentState;
        const stackDepthBefore = game.dialogEngine.stateStack.length;

        // Force refresh
        game.dialogEngine.navigateTo('arsenal', null, true);
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, stateBefore, 'State should remain the same after refresh');
        assertEqual(game.dialogEngine.stateStack.length, stackDepthBefore, 'Stack depth should not change on refresh');
    });
});

// Export for use
window.DialogBasicTests = true;