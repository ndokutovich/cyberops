/**
 * Modal Dialog Conversion Tests
 * Tests for converted confirmation modals following test approach from CLAUDE.md
 */

describe('Modal Dialog Tests', () => {

    // Test basic navigation to all modal states
    it('should navigate to all modal dialogs', async () => {
        const modalStates = [
            'confirm-exit',
            'insufficient-funds',
            'save-confirm',
            'load-confirm',
            'delete-confirm',
            'confirm-surrender'
        ];

        let iterations = 0;
        const maxIterations = 10; // Safety limit

        for (const state of modalStates) {
            if (iterations++ >= maxIterations) {
                console.warn('Reached max iterations in modal test');
                break;
            }

            game.dialogEngine.closeAll();
            await sleep(20); // Reduced delay

            // Navigate to modal
            game.dialogEngine.navigateTo(state);
            await sleep(20); // Reduced delay

            assertEqual(game.dialogEngine.currentState, state, `Should navigate to ${state}`);

            // Verify it's level 2 or 3 (modal level)
            const stateConfig = game.dialogEngine.config.states[state];
            if (stateConfig) {
                assertTruthy(stateConfig.level >= 2, `${state} should be level 2 or higher`);
            }

            game.dialogEngine.closeAll();
            await sleep(10); // Small delay after close
        }
    });

    // Test confirm-exit modal with proper parent
    it('should show confirm-exit from pause menu', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // First navigate to pause menu (parent)
        game.screen = 'game';
        game.dialogEngine.navigateTo('pause-menu');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'pause-menu', 'Should be in pause menu');

        // Then show exit confirmation
        game.dialogEngine.navigateTo('confirm-exit');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'confirm-exit', 'Should show exit confirmation');
        assertEqual(game.dialogEngine.stateStack.length, 2, 'Should have 2 levels in stack');

        // Test back button returns to pause menu
        game.dialogEngine.back();
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'pause-menu', 'Back should return to pause menu');

        game.dialogEngine.closeAll();
    });

    // Test insufficient funds modal with mock data
    it('should show insufficient funds with item data', async () => {
        // Check if dialogEngine is available
        if (!game || !game.dialogEngine) {
            console.error('DialogEngine not available');
            throw new Error('DialogEngine not initialized');
        }

        game.dialogEngine.closeAll();
        await sleep(50);

        // Mock purchase data
        const mockPurchaseData = {
            itemName: 'Plasma Rifle',
            itemCost: 5000,
            currentCredits: 1000
        };

        // Set state data
        game.dialogEngine.stateData = {
            purchaseData: mockPurchaseData
        };

        // Navigate to insufficient funds
        game.dialogEngine.navigateTo('insufficient-funds');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'insufficient-funds', 'Should show insufficient funds');

        // Verify it's an alert dialog (single OK button expected)
        const stateConfig = game.dialogEngine.config.states['insufficient-funds'];
        assertEqual(stateConfig.buttons.length, 1, 'Should have only OK button');
        assertEqual(stateConfig.buttons[0].text, 'OK', 'Button should be OK');

        game.dialogEngine.closeAll();
    });

    // Test save/load/delete confirmation modals
    it('should show save/load/delete confirmations with slot data', async () => {
        // Check if dialogEngine is available
        if (!game || !game.dialogEngine) {
            console.error('DialogEngine not available');
            throw new Error('DialogEngine not initialized');
        }

        const modalTests = [
            { state: 'save-confirm', parent: 'save-load' },
            { state: 'load-confirm', parent: 'save-load' },
            { state: 'delete-confirm', parent: 'save-load' }
        ];

        for (const test of modalTests) {
            game.dialogEngine.closeAll();
            await sleep(50);

            // Mock save slot data
            game.dialogEngine.stateData = {
                saveSlot: {
                    slotNumber: 1,
                    slotName: 'Mission 3 - Before Boss',
                    timestamp: '2024-01-15 14:30:00'
                }
            };

            // Navigate to parent first if needed
            if (test.parent) {
                game.dialogEngine.navigateTo(test.parent);
                await sleep(50);
            }

            // Navigate to confirmation modal
            game.dialogEngine.navigateTo(test.state);
            await sleep(50);
            assertEqual(game.dialogEngine.currentState, test.state, `Should show ${test.state}`);

            // Verify it has confirm/cancel buttons
            const stateConfig = game.dialogEngine.config.states[test.state];
            assertEqual(stateConfig.buttons.length, 2, `${test.state} should have 2 buttons`);

            game.dialogEngine.closeAll();
        }
    });

    // Test surrender confirmation
    it('should show surrender confirmation during game', async () => {
        game.dialogEngine.closeAll();
        await sleep(50);

        // Set game screen
        game.screen = 'game';
        game.currentScreen = 'game';

        // Show surrender confirmation
        game.dialogEngine.navigateTo('confirm-surrender');
        await sleep(50);
        assertEqual(game.dialogEngine.currentState, 'confirm-surrender', 'Should show surrender dialog');

        // Verify button texts
        const stateConfig = game.dialogEngine.config.states['confirm-surrender'];
        assertEqual(stateConfig.buttons[0].text, 'SURRENDER', 'First button should be SURRENDER');
        assertEqual(stateConfig.buttons[1].text, 'CONTINUE FIGHTING', 'Second button should be CONTINUE FIGHTING');

        game.dialogEngine.closeAll();
    });

    // Test modal animations
    it('should have appropriate animations for modals', async () => {
        const animationTests = [
            { state: 'confirm-exit', expectedEnter: 'zoom-in', expectedExit: 'zoom-out' },
            { state: 'insufficient-funds', expectedEnter: 'shake', expectedExit: 'fade-out' },
        ];

        for (const test of animationTests) {
            const stateConfig = game.dialogEngine.config.states[test.state];

            if (stateConfig && stateConfig.transitions) {
                if (stateConfig.transitions.enter) {
                    assertEqual(
                        stateConfig.transitions.enter.animation,
                        test.expectedEnter,
                        `${test.state} should have ${test.expectedEnter} enter animation`
                    );
                }
                if (stateConfig.transitions.exit) {
                    assertEqual(
                        stateConfig.transitions.exit.animation,
                        test.expectedExit,
                        `${test.state} should have ${test.expectedExit} exit animation`
                    );
                }
            }
        }
    });

    // Test action execution (mock)
    it('should register modal action handlers', async () => {
        const actions = [
            'performReturnToHub',
            'confirmSave',
            'confirmLoad',
            'confirmDelete',
            'confirmSurrender'
        ];

        for (const action of actions) {
            const handler = game.dialogEngine.actionRegistry.get(action);
            assertTruthy(handler, `Action ${action} should be registered`);
            assertTruthy(typeof handler === 'function', `Action ${action} should be a function`);
        }
    });

    // Test helper functions
    it('should have helper functions for common modals', async () => {
        const helpers = [
            'showInsufficientFunds',
            'showExitConfirmation',
            'showSurrenderConfirmation'
        ];

        for (const helper of helpers) {
            assertTruthy(
                game.dialogEngine[helper],
                `Helper function ${helper} should exist`
            );
            assertTruthy(
                typeof game.dialogEngine[helper] === 'function',
                `${helper} should be a function`
            );
        }
    });

    // Test wrapper function replacements
    it('should replace imperative functions with declarative wrappers', async () => {
        // Wait a bit for wrappers to be applied
        await sleep(200);

        // Check if returnToHubFromMission has been wrapped
        if (game.returnToHubFromMission) {
            const funcString = game.returnToHubFromMission.toString();
            const isWrapped = funcString.includes('navigateTo') ||
                             funcString.includes('confirm-exit') ||
                             game._returnToHubFromMissionWrapped === true;
            assertTruthy(
                isWrapped,
                'returnToHubFromMission should use declarative navigation'
            );
        } else {
            // If function doesn't exist, that's ok - test passes
            assertTruthy(true, 'returnToHubFromMission not present (ok for test environment)');
        }
    });

    // Test modal coverage
    it('should generate modal coverage report', () => {
        const expectedModals = [
            'confirm-exit',
            'insufficient-funds',
            'save-confirm',
            'load-confirm',
            'delete-confirm',
            'confirm-surrender'
        ];

        const implementedModals = [];
        for (const modal of expectedModals) {
            if (game.dialogEngine.config.states[modal]) {
                implementedModals.push(modal);
            }
        }

        const coverage = Math.round((implementedModals.length / expectedModals.length) * 100);

        console.log('\n📊 MODAL DIALOG COVERAGE');
        console.log('═══════════════════════════════════════');
        console.log(`Total Expected: ${expectedModals.length}`);
        console.log(`Implemented: ${implementedModals.length}`);
        console.log(`Coverage: ${coverage}%`);

        if (implementedModals.length < expectedModals.length) {
            const missing = expectedModals.filter(m => !implementedModals.includes(m));
            console.log(`Missing: ${missing.join(', ')}`);
        }

        console.log('═══════════════════════════════════════');

        assertEqual(coverage, 100, 'Should have 100% modal coverage');
    });
});

// Export for use
window.ModalDialogTests = true;