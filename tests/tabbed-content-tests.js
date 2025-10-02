/**
 * Tabbed Content Tests
 * Tests for the declarative dialog engine's tabbed content functionality
 */

describe('Tabbed Content Functionality', () => {

    // ========== TAB SWITCHING ==========

    it('should switch tabs in settings dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        // Default tab should be first (keyboard)
        assertEqual(game.dialogEngine.activeTab, 'keyboard', 'Should start with keyboard tab');

        // Switch to audio tab
        game.dialogEngine.switchTab('audio');
        await sleep(50);

        assertEqual(game.dialogEngine.activeTab, 'audio', 'Should switch to audio tab');

        // Switch to graphics tab
        game.dialogEngine.switchTab('graphics');
        await sleep(50);

        assertEqual(game.dialogEngine.activeTab, 'graphics', 'Should switch to graphics tab');

        // Switch to game tab
        game.dialogEngine.switchTab('game');
        await sleep(50);

        assertEqual(game.dialogEngine.activeTab, 'game', 'Should switch to game tab');

        game.dialogEngine.closeAll();
    });

    it('should update DOM when switching tabs', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        const dialogEl = document.getElementById('dialog-hub-settings');
        assertTruthy(dialogEl, 'Dialog should be in DOM');

        // Check initial keyboard tab is visible
        const keyboardContent = dialogEl.querySelector('#tab-content-keyboard');
        assertTruthy(keyboardContent, 'Keyboard content should exist');
        assertEqual(keyboardContent.style.display, 'block', 'Keyboard content should be visible');

        // Audio content should be hidden
        const audioContent = dialogEl.querySelector('#tab-content-audio');
        assertTruthy(audioContent, 'Audio content should exist');
        assertEqual(audioContent.style.display, 'none', 'Audio content should be hidden');

        // Switch to audio tab
        game.dialogEngine.switchTab('audio');
        await sleep(50);

        // Now audio should be visible
        assertEqual(audioContent.style.display, 'block', 'Audio content should now be visible');
        // Keyboard should be hidden
        assertEqual(keyboardContent.style.display, 'none', 'Keyboard content should now be hidden');

        game.dialogEngine.closeAll();
    });

    it('should style active tab button correctly', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        const dialogEl = document.getElementById('dialog-hub-settings');
        const tabButtons = dialogEl.querySelectorAll('.tab-button');

        // First button (keyboard) should have active class
        assertTruthy(tabButtons[0].classList.contains('active'), 'First tab button should have active class');

        // Switch to second tab
        game.dialogEngine.switchTab('audio');
        await sleep(50);

        // First button should no longer be active
        assertFalsy(tabButtons[0].classList.contains('active'), 'First tab button should not have active class');
        // Second button should be active
        assertTruthy(tabButtons[1].classList.contains('active'), 'Second tab button should have active class');

        game.dialogEngine.closeAll();
    });

    // ========== GENERATOR EXECUTION ==========

    it('should execute generators for each tab', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        const dialogEl = document.getElementById('dialog-hub-settings');

        // Check keyboard content was generated
        const keyboardContent = dialogEl.querySelector('#tab-content-keyboard');
        assertTruthy(keyboardContent.innerHTML.includes('KEYBOARD'), 'Keyboard content should be generated');

        // Check audio content was generated
        const audioContent = dialogEl.querySelector('#tab-content-audio');
        assertTruthy(audioContent.innerHTML.includes('AUDIO'), 'Audio content should be generated');

        // Check graphics content was generated
        const graphicsContent = dialogEl.querySelector('#tab-content-graphics');
        assertTruthy(graphicsContent.innerHTML.includes('GRAPHICS'), 'Graphics content should be generated');

        // Check game content was generated
        const gameContent = dialogEl.querySelector('#tab-content-game');
        assertTruthy(gameContent.innerHTML.includes('GAME'), 'Game content should be generated');

        game.dialogEngine.closeAll();
    });

    it('should generate keyboard settings with KeybindingService', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        const dialogEl = document.getElementById('dialog-hub-settings');
        const keyboardContent = dialogEl.querySelector('#tab-content-keyboard');

        // Should have key binding inputs
        const keyInputs = keyboardContent.querySelectorAll('input[type="text"][readonly]');
        assertTruthy(keyInputs.length > 0, 'Should have key binding inputs');

        // Should have reset buttons
        const resetButtons = keyboardContent.querySelectorAll('button');
        assertTruthy(resetButtons.length > 0, 'Should have reset buttons');

        game.dialogEngine.closeAll();
    });

    it('should generate audio settings with volume sliders', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        game.dialogEngine.switchTab('audio');
        await sleep(50);

        const dialogEl = document.getElementById('dialog-hub-settings');
        const audioContent = dialogEl.querySelector('#tab-content-audio');

        // Should have range inputs for volumes
        const rangeInputs = audioContent.querySelectorAll('input[type="range"]');
        assertTruthy(rangeInputs.length >= 3, 'Should have at least 3 volume sliders');

        game.dialogEngine.closeAll();
    });

    it('should generate graphics settings with checkboxes', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        game.dialogEngine.switchTab('graphics');
        await sleep(50);

        const dialogEl = document.getElementById('dialog-hub-settings');
        const graphicsContent = dialogEl.querySelector('#tab-content-graphics');

        // Should have checkboxes for settings
        const checkboxes = graphicsContent.querySelectorAll('input[type="checkbox"]');
        assertTruthy(checkboxes.length >= 2, 'Should have at least 2 checkboxes');

        game.dialogEngine.closeAll();
    });

    it('should generate game settings with options', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        game.dialogEngine.switchTab('game');
        await sleep(50);

        const dialogEl = document.getElementById('dialog-hub-settings');
        const gameContent = dialogEl.querySelector('#tab-content-game');

        // Should have checkboxes
        const checkboxes = gameContent.querySelectorAll('input[type="checkbox"]');
        assertTruthy(checkboxes.length >= 1, 'Should have checkboxes');

        // Should have team mode selector
        const teamModeSelect = gameContent.querySelector('#defaultTeamMode');
        assertTruthy(teamModeSelect, 'Should have team mode select');

        game.dialogEngine.closeAll();
    });

    // ========== TAB PERSISTENCE ==========

    it('should persist active tab across refresh', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        // Switch to audio tab
        game.dialogEngine.switchTab('audio');
        await sleep(50);

        assertEqual(game.dialogEngine.activeTab, 'audio', 'Should be on audio tab');

        // Refresh dialog
        game.dialogEngine.navigateTo('hub-settings', null, true);
        await sleep(100);

        // Should still be on audio tab
        assertEqual(game.dialogEngine.activeTab, 'audio', 'Should still be on audio tab after refresh');

        game.dialogEngine.closeAll();
    });

    // ========== PAUSE MENU SETTINGS ==========

    it('should also work in pause menu settings dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('settings');
        await sleep(100);

        const stateConfig = game.dialogEngine.config.states['settings'];
        assertEqual(stateConfig.content.type, 'tabbed', 'Settings should also use tabbed content');
        assertEqual(stateConfig.content.tabs.length, 4, 'Should have 4 tabs');

        const dialogEl = document.getElementById('dialog-settings');
        assertTruthy(dialogEl, 'Settings dialog should be in DOM');

        const tabButtons = dialogEl.querySelectorAll('.tab-button');
        assertEqual(tabButtons.length, 4, 'Should have 4 tab buttons');

        game.dialogEngine.closeAll();
    });

    // ========== ERROR HANDLING ==========

    it('should handle invalid tab ID gracefully', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('hub-settings');
        await sleep(100);

        // Try to switch to non-existent tab
        game.dialogEngine.switchTab('invalid-tab-id');
        await sleep(50);

        // Should still have valid state
        assertTruthy(game.dialogEngine.currentState === 'hub-settings', 'Should still be in hub-settings');

        game.dialogEngine.closeAll();
    });
});
