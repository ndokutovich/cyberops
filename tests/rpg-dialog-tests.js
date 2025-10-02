/**
 * RPG Dialog Tests
 * Tests for RPG system dialogs: stat allocation, perk selection, skill tree, research lab, tech tree
 */

describe('RPG Dialog Tests', () => {

    let mockAgent;

    beforeAll(async () => {
        await sleep(500);
    });

    beforeEach(() => {
        // Create mock agent with RPG data
        mockAgent = {
            id: 'test_agent_rpg',
            name: 'Test Agent',
            rpgEntity: {
                stats: {
                    strength: 10,
                    agility: 10,
                    intelligence: 10,
                    endurance: 10
                },
                skills: {
                    marksmanship: 1
                },
                availableStatPoints: 5,
                availableSkillPoints: 3,
                level: 5,
                experience: 1000
            }
        };
    });

    // ========== STAT ALLOCATION ==========

    it('should show stat allocation dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to character first (parent)
        game.dialogEngine.navigateTo('character');
        await sleep(50);

        // Then navigate to stat allocation (child)
        game.dialogEngine.navigateTo('stat-allocation');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'stat-allocation', 'Should show stat allocation');

        const stateConfig = game.dialogEngine.config.states['stat-allocation'];
        assertEqual(stateConfig.parent, 'character', 'Should be child of character');
        assertEqual(stateConfig.level, 2, 'Should be level 2');
        assertEqual(stateConfig.title, '📈 ALLOCATE STAT POINTS', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have stat allocation content generator', async () => {
        const stateConfig = game.dialogEngine.config.states['stat-allocation'];
        assertTruthy(stateConfig.content, 'Should have content config');
        assertEqual(stateConfig.content.type, 'dynamic', 'Should have dynamic content');
        assertEqual(stateConfig.content.generator, 'generateStatAllocation', 'Should use stat allocation generator');
    });

    it('should have confirm and cancel buttons for stat allocation', async () => {
        const stateConfig = game.dialogEngine.config.states['stat-allocation'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertTruthy(stateConfig.buttons.type === 'static', 'Should have static buttons');
        assertTruthy(stateConfig.buttons.items, 'Should have button items');
        assertEqual(stateConfig.buttons.items.length, 2, 'Should have 2 buttons');

        const confirmButton = stateConfig.buttons.items[0];
        assertEqual(confirmButton.text, 'CONFIRM', 'First button should be confirm');
        assertEqual(confirmButton.style, 'primary', 'Confirm should be primary style');

        const cancelButton = stateConfig.buttons.items[1];
        assertEqual(cancelButton.text, 'CANCEL', 'Second button should be cancel');
    });

    it('should have proper styles for stat allocation', async () => {
        const stateConfig = game.dialogEngine.config.states['stat-allocation'];
        assertTruthy(stateConfig.styles, 'Should have custom styles');
        assertEqual(stateConfig.styles.width, '500px', 'Should have 500px width');
        assertEqual(stateConfig.styles.height, '80vh', 'Should have 80vh height');
    });

    // ========== PERK SELECTION ==========

    it('should show perk selection dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to character first
        game.dialogEngine.navigateTo('character');
        await sleep(50);

        // Then navigate to perk selection
        game.dialogEngine.navigateTo('perk-selection');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'perk-selection', 'Should show perk selection');

        const stateConfig = game.dialogEngine.config.states['perk-selection'];
        assertEqual(stateConfig.parent, 'character', 'Should be child of character');
        assertEqual(stateConfig.level, 2, 'Should be level 2');
        assertEqual(stateConfig.title, '⭐ SELECT PERK', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have perk selection content generator', async () => {
        const stateConfig = game.dialogEngine.config.states['perk-selection'];
        assertTruthy(stateConfig.content, 'Should have content config');
        assertEqual(stateConfig.content.type, 'dynamic', 'Should have dynamic content');
        assertEqual(stateConfig.content.generator, 'generatePerkSelection', 'Should use perk selection generator');
    });

    it('should have back and close buttons for perk selection', async () => {
        const stateConfig = game.dialogEngine.config.states['perk-selection'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertEqual(stateConfig.buttons.length, 2, 'Should have 2 buttons');
        assertEqual(stateConfig.buttons[0].text, '← BACK', 'First button should be back');
        assertEqual(stateConfig.buttons[1].text, 'CLOSE', 'Second button should be close');
    });

    it('should have keyboard shortcuts for perk selection', async () => {
        const stateConfig = game.dialogEngine.config.states['perk-selection'];
        assertTruthy(stateConfig.keyboard, 'Should have keyboard shortcuts');
        assertEqual(stateConfig.keyboard.Escape, 'back', 'Escape should go back');
    });

    it('should have proper layout for perk selection', async () => {
        const stateConfig = game.dialogEngine.config.states['perk-selection'];
        assertEqual(stateConfig.layout, 'large-layout', 'Should use large layout');
        assertTruthy(stateConfig.styles, 'Should have custom styles');
        assertEqual(stateConfig.styles.width, '700px', 'Should have 700px width');
    });

    // ========== SKILL TREE ==========

    it('should show skill tree dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to character first
        game.dialogEngine.navigateTo('character');
        await sleep(50);

        // Then navigate to skill tree
        game.dialogEngine.navigateTo('skill-tree');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'skill-tree', 'Should show skill tree');

        const stateConfig = game.dialogEngine.config.states['skill-tree'];
        assertEqual(stateConfig.parent, 'character', 'Should be child of character');
        assertEqual(stateConfig.level, 2, 'Should be level 2');
        assertEqual(stateConfig.title, '🎯 SKILL TREE', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have skill tree content generator', async () => {
        const stateConfig = game.dialogEngine.config.states['skill-tree'];
        assertTruthy(stateConfig.content, 'Should have content config');
        assertEqual(stateConfig.content.type, 'dynamic', 'Should have dynamic content');
        assertEqual(stateConfig.content.generator, 'generateSkillTree', 'Should use skill tree generator');
    });

    it('should have close button for skill tree', async () => {
        const stateConfig = game.dialogEngine.config.states['skill-tree'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertTruthy(stateConfig.buttons.type === 'static', 'Should have static buttons');
        assertTruthy(stateConfig.buttons.items, 'Should have button items');
        assertEqual(stateConfig.buttons.items.length, 1, 'Should have 1 button');
        assertEqual(stateConfig.buttons.items[0].text, 'CLOSE', 'Should have close button');
    });

    it('should have large layout for skill tree', async () => {
        const stateConfig = game.dialogEngine.config.states['skill-tree'];
        assertEqual(stateConfig.layout, 'large-layout', 'Should use large layout');
        assertTruthy(stateConfig.styles, 'Should have custom styles');
        assertEqual(stateConfig.styles.width, '700px', 'Should have 700px width');
        assertEqual(stateConfig.styles.height, '80vh', 'Should have 80vh height');
    });

    // ========== RESEARCH LAB ==========

    it('should show research lab dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('research-lab');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'research-lab', 'Should show research lab');

        const stateConfig = game.dialogEngine.config.states['research-lab'];
        assertEqual(stateConfig.parent, 'hub', 'Should be child of hub');
        assertEqual(stateConfig.level, 1, 'Should be level 1');
        assertEqual(stateConfig.title, '🔬 RESEARCH LABORATORY', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have research lab content generator', async () => {
        const stateConfig = game.dialogEngine.config.states['research-lab'];
        assertTruthy(stateConfig.content, 'Should have content config');
        assertEqual(stateConfig.content.type, 'dynamic', 'Should have dynamic content');
        assertEqual(stateConfig.content.generator, 'generateResearchLab', 'Should use research lab generator');
    });

    it('should have tech tree button in research lab', async () => {
        const stateConfig = game.dialogEngine.config.states['research-lab'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertEqual(stateConfig.buttons.length, 2, 'Should have 2 buttons');
        assertEqual(stateConfig.buttons[0].text, 'VIEW TECH TREE', 'Should have view tech tree button');
        assertEqual(stateConfig.buttons[0].action, 'navigate:tech-tree', 'Should navigate to tech tree');
        assertEqual(stateConfig.buttons[1].text, 'CLOSE', 'Should have close button');
    });

    // ========== TECH TREE ==========

    it('should show tech tree dialog', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to research lab first
        game.dialogEngine.navigateTo('research-lab');
        await sleep(50);

        // Then navigate to tech tree
        game.dialogEngine.navigateTo('tech-tree');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'tech-tree', 'Should show tech tree');

        const stateConfig = game.dialogEngine.config.states['tech-tree'];
        assertEqual(stateConfig.parent, 'research-lab', 'Should be child of research-lab');
        assertEqual(stateConfig.level, 2, 'Should be level 2');
        assertEqual(stateConfig.title, 'TECH TREE', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have tech tree content generator', async () => {
        const stateConfig = game.dialogEngine.config.states['tech-tree'];
        assertTruthy(stateConfig.content, 'Should have content config');
        assertEqual(stateConfig.content.type, 'dynamic', 'Should have dynamic content');
        assertEqual(stateConfig.content.generator, 'generateTechTree', 'Should use tech tree generator');
    });

    it('should have back button in tech tree', async () => {
        const stateConfig = game.dialogEngine.config.states['tech-tree'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertEqual(stateConfig.buttons.length, 1, 'Should have 1 button');
        assertEqual(stateConfig.buttons[0].text, 'BACK', 'Should have back button');
        assertEqual(stateConfig.buttons[0].action, 'back', 'Should go back');
    });

    // ========== RPG DIALOG NAVIGATION FLOW ==========

    it('should navigate through character -> stat allocation flow', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Start at character
        game.dialogEngine.navigateTo('character');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'character', 'Should be at character');
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack should have 1 level');

        // Navigate to stat allocation
        game.dialogEngine.navigateTo('stat-allocation');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'stat-allocation', 'Should be at stat allocation');
        assertEqual(game.dialogEngine.stateStack.length, 2, 'Stack should have 2 levels');

        // Go back to character
        game.dialogEngine.back();
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'character', 'Should be back at character');
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack should have 1 level');

        game.dialogEngine.closeAll();
    });

    it('should navigate through research-lab -> tech-tree flow', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Start at research lab
        game.dialogEngine.navigateTo('research-lab');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'research-lab', 'Should be at research lab');
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack should have 1 level');

        // Navigate to tech tree
        game.dialogEngine.navigateTo('tech-tree');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'tech-tree', 'Should be at tech tree');
        assertEqual(game.dialogEngine.stateStack.length, 2, 'Stack should have 2 levels');

        // Go back to research lab
        game.dialogEngine.back();
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'research-lab', 'Should be back at research lab');
        assertEqual(game.dialogEngine.stateStack.length, 1, 'Stack should have 1 level');

        game.dialogEngine.closeAll();
    });

    // ========== HIRE SUCCESS NOTIFICATION ==========

    it('should show hire success notification', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate through hire flow
        game.dialogEngine.navigateTo('agent-management');
        await sleep(50);
        game.dialogEngine.navigateTo('hire-agents');
        await sleep(50);

        // Navigate to hire success (would normally happen after confirmation)
        game.dialogEngine.stateData = { agent: mockAgent };
        game.dialogEngine.navigateTo('hire-success');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'hire-success', 'Should show hire success');

        const stateConfig = game.dialogEngine.config.states['hire-success'];
        assertEqual(stateConfig.parent, 'hire-agents', 'Should be child of hire-agents');
        assertEqual(stateConfig.level, 3, 'Should be level 3');
        assertEqual(stateConfig.title, 'AGENT HIRED', 'Should have correct title');

        game.dialogEngine.closeAll();
    });

    it('should have auto-close for hire success', async () => {
        const stateConfig = game.dialogEngine.config.states['hire-success'];
        assertTruthy(stateConfig.autoClose, 'Should have auto-close config');
        assertEqual(stateConfig.autoClose.timeout, 2000, 'Should auto-close after 2 seconds');
        assertEqual(stateConfig.autoClose.action, 'back', 'Should go back when auto-closing');
    });

    it('should use notification layout for hire success', async () => {
        const stateConfig = game.dialogEngine.config.states['hire-success'];
        assertEqual(stateConfig.layout, 'notification', 'Should use notification layout');
    });

    // ========== RPG DIALOG COVERAGE ==========

    it('should generate RPG dialog coverage report', () => {
        const rpgDialogs = [
            'stat-allocation',
            'perk-selection',
            'skill-tree',
            'research-lab',
            'tech-tree',
            'hire-success'
        ];

        const implementedDialogs = [];
        for (const dialog of rpgDialogs) {
            if (game.dialogEngine.config.states[dialog]) {
                implementedDialogs.push(dialog);
            }
        }

        const coverage = Math.round((implementedDialogs.length / rpgDialogs.length) * 100);

        console.log('\n📊 RPG DIALOG COVERAGE');
        console.log('═══════════════════════════════════════');
        console.log(`Total Expected: ${rpgDialogs.length}`);
        console.log(`Implemented: ${implementedDialogs.length}`);
        console.log(`Coverage: ${coverage}%`);

        if (implementedDialogs.length < rpgDialogs.length) {
            const missing = rpgDialogs.filter(d => !implementedDialogs.includes(d));
            console.log(`Missing: ${missing.join(', ')}`);
        }

        console.log('═══════════════════════════════════════');

        assertEqual(coverage, 100, 'Should have 100% RPG dialog coverage');
    });
});

// Export for use
window.RPGDialogTests = true;
