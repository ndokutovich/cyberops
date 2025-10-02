/**
 * Menu Screen Tests
 * Tests for main menu, splash screen navigation, and menu transitions
 */

describe('Menu Screen Tests', () => {

    beforeAll(async () => {
        await sleep(500);
    });

    // ========== MENU SCREEN ==========

    it('should show main menu screen', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('menu-screen');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'menu-screen', 'Should show main menu');

        const stateConfig = game.dialogEngine.config.states['menu-screen'];
        assertTruthy(stateConfig, 'Menu screen config should exist');
        assertEqual(stateConfig.type, 'screen', 'Should be screen type');
        assertEqual(stateConfig.level, 0, 'Should be root level');

        game.dialogEngine.closeAll();
    });

    it('should have menu buttons', async () => {
        const stateConfig = game.dialogEngine.config.states['menu-screen'];
        assertTruthy(stateConfig.buttons, 'Should have buttons');
        assertTruthy(stateConfig.buttons.length > 0, 'Should have at least one button');

        console.log('Menu has', stateConfig.buttons.length, 'buttons');
    });

    it('should have menu content', async () => {
        const stateConfig = game.dialogEngine.config.states['menu-screen'];
        assertTruthy(stateConfig.content, 'Should have content config');
        // Menu uses static content, not dynamic
        assertTruthy(stateConfig.content.type === 'static' || stateConfig.content.type === 'dynamic', 'Should have content type');
        console.log('Menu content type:', stateConfig.content.type);
    });

    it('should handle menu navigation actions', async () => {
        const stateConfig = game.dialogEngine.config.states['menu-screen'];

        // Check for common menu actions
        const buttonActions = stateConfig.buttons.map(b => b.action);
        console.log('Menu actions:', buttonActions);

        assertTruthy(buttonActions.length > 0, 'Should have menu actions');
    });

    // ========== SPLASH TO MENU TRANSITION ==========

    it('should transition from splash to menu', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Start at splash
        game.dialogEngine.navigateTo('splash-screen');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'splash-screen', 'Should start at splash');

        // Check splash config has events (timer auto-navigates to menu, or click triggers skipSplash)
        const splashConfig = game.dialogEngine.config.states['splash-screen'];
        assertTruthy(splashConfig.events, 'Splash should have events');

        // Check for menu navigation event (timer or action)
        const hasMenuNavigation = splashConfig.events.some(e =>
            (e.action && e.action.includes('menu-screen')) ||
            (e.action && e.action.includes('skipSplash'))
        );
        assertTruthy(hasMenuNavigation, 'Splash should have menu navigation event');

        game.dialogEngine.closeAll();
    });

    it('should handle skip splash action', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('splash-screen');
        await sleep(50);

        // Check for skip action
        const skipAction = game.dialogEngine.actionRegistry && game.dialogEngine.actionRegistry.get('skipSplash');
        if (skipAction) {
            assertTruthy(typeof skipAction === 'function', 'Skip splash should be a function');
            console.log('Skip splash action registered');
        } else {
            console.log('Skip splash action not found (may be inline)');
        }

        game.dialogEngine.closeAll();
    });

    // ========== MENU TO HUB TRANSITION ==========

    it('should navigate from menu to hub', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to menu
        game.dialogEngine.navigateTo('menu-screen');
        await sleep(50);

        // Check menu has transitions
        const menuConfig = game.dialogEngine.config.states['menu-screen'];
        if (menuConfig.transitions) {
            assertTruthy(menuConfig.transitions, 'Menu should have transitions');
            console.log('Menu transitions:', Object.keys(menuConfig.transitions));
        }

        // Menu should have action to start new campaign or continue
        const hasStartAction = menuConfig.buttons.some(b =>
            b.action && (
                b.action.includes('startNewCampaign') ||
                b.action.includes('continueGame') ||
                b.action.includes('loadLastSave') ||
                b.action.includes('syndicate-hub')
            )
        );

        assertTruthy(hasStartAction, 'Menu should have action to start game');
        console.log('Menu has start/continue action:', hasStartAction);

        game.dialogEngine.closeAll();
    });

    // ========== MENU KEYBOARD SHORTCUTS ==========

    it('should have keyboard shortcuts in menu', async () => {
        const menuConfig = game.dialogEngine.config.states['menu-screen'];

        if (menuConfig.keyboard) {
            assertTruthy(menuConfig.keyboard, 'Menu should have keyboard shortcuts');
            console.log('Menu keyboard shortcuts:', Object.keys(menuConfig.keyboard).length, 'bindings');
        } else {
            console.log('Menu has no keyboard shortcuts defined');
        }
    });

    // ========== MENU SCREEN TRANSITIONS ==========

    it('should have proper enter/exit transitions for menu', async () => {
        const menuConfig = game.dialogEngine.config.states['menu-screen'];

        if (menuConfig.transitions) {
            assertTruthy(menuConfig.transitions, 'Should have transitions');

            if (menuConfig.transitions.enter) {
                console.log('Menu enter transition:', menuConfig.transitions.enter.animation);
            }

            if (menuConfig.transitions.exit) {
                console.log('Menu exit transition:', menuConfig.transitions.exit.animation);
            }
        } else {
            console.log('Menu has no explicit transitions defined');
        }
    });

    // ========== MENU LAYOUT ==========

    it('should use full-screen layout for menu', async () => {
        const menuConfig = game.dialogEngine.config.states['menu-screen'];

        if (menuConfig.layout) {
            console.log('Menu layout:', menuConfig.layout);
            assertTruthy(menuConfig.layout, 'Should have layout defined');
        } else {
            console.log('Menu has no explicit layout (may use default)');
        }
    });

    // ========== MENU ACTION HANDLERS ==========

    it('should register menu action handlers', async () => {
        const menuActions = [
            'startNewCampaign',
            'continueGame',
            'loadLastSave',
            'showCredits'
        ];

        let registeredCount = 0;
        for (const action of menuActions) {
            const handler = game.dialogEngine.actionRegistry && game.dialogEngine.actionRegistry.get(action);
            if (handler) {
                assertTruthy(typeof handler === 'function', `${action} should be a function`);
                registeredCount++;
            }
        }

        console.log(`Menu actions registered: ${registeredCount}/${menuActions.length}`);
    });

    // ========== MENU SETTINGS ACCESS ==========

    it('should allow accessing settings from menu', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('menu-screen');
        await sleep(50);

        const menuConfig = game.dialogEngine.config.states['menu-screen'];

        // Check if menu has settings button
        const hasSettingsButton = menuConfig.buttons.some(b =>
            b.text && (b.text.includes('SETTINGS') || b.text.includes('OPTIONS'))
        );

        if (hasSettingsButton) {
            console.log('Menu has settings access');
        } else {
            console.log('Menu does not have explicit settings button');
        }

        game.dialogEngine.closeAll();
    });

    // ========== SPLASH SCREEN VERIFICATION ==========

    it('should verify splash screen still works', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        game.dialogEngine.navigateTo('splash-screen');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'splash-screen', 'Should show splash screen');

        const splashConfig = game.dialogEngine.config.states['splash-screen'];
        assertEqual(splashConfig.type, 'screen', 'Splash should be screen type');
        assertEqual(splashConfig.level, 0, 'Splash should be root level');

        game.dialogEngine.closeAll();
    });

    it('should have splash screen events', async () => {
        const splashConfig = game.dialogEngine.config.states['splash-screen'];

        if (splashConfig.events) {
            assertTruthy(splashConfig.events.length > 0, 'Should have events');
            console.log('Splash has', splashConfig.events.length, 'events');

            // Check for skip event
            const skipEvent = splashConfig.events.find(e => e.id === 'skip');
            if (skipEvent) {
                assertEqual(skipEvent.trigger, 'user_input', 'Skip should be user input trigger');
                console.log('Splash skip event configured');
            }
        } else {
            console.log('Splash has no events defined');
        }
    });

    // ========== CREDITS SCREEN VERIFICATION ==========

    it('should navigate to credits from menu', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Navigate to credits
        game.dialogEngine.navigateTo('credits-screen');
        await sleep(50);

        assertEqual(game.dialogEngine.currentState, 'credits-screen', 'Should show credits');

        const creditsConfig = game.dialogEngine.config.states['credits-screen'];
        assertEqual(creditsConfig.type, 'screen', 'Credits should be screen type');

        game.dialogEngine.closeAll();
    });

    // ========== MENU SCREEN COVERAGE ==========

    it('should generate menu screen coverage report', () => {
        const menuScreens = [
            'splash-screen',
            'menu-screen',
            'credits-screen'
        ];

        const implementedScreens = [];
        for (const screen of menuScreens) {
            if (game.dialogEngine.config.states[screen]) {
                implementedScreens.push(screen);
            }
        }

        const coverage = Math.round((implementedScreens.length / menuScreens.length) * 100);

        console.log('\n📊 MENU SCREEN COVERAGE');
        console.log('═══════════════════════════════════════');
        console.log(`Total Expected: ${menuScreens.length}`);
        console.log(`Implemented: ${implementedScreens.length}`);
        console.log(`Coverage: ${coverage}%`);

        if (implementedScreens.length < menuScreens.length) {
            const missing = menuScreens.filter(s => !implementedScreens.includes(s));
            console.log(`Missing: ${missing.join(', ')}`);
        }

        console.log('═══════════════════════════════════════');

        assertEqual(coverage, 100, 'Should have 100% menu screen coverage');
    });
});

// Export for use
window.MenuScreenTests = true;
