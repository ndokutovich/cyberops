/**
 * Screen Layer Test Suite
 * Tests for the three-layer UI architecture's screen management layer
 * Integrates with existing dialog test suite
 */

class ScreenLayerTests {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    // Helper to create a mock game environment
    createMockEnvironment() {
        // Mock DOM elements
        if (!document.getElementById('screenContainer')) {
            const container = document.createElement('div');
            container.id = 'screenContainer';
            document.body.appendChild(container);
        }

        if (!document.getElementById('syndicateHub')) {
            const hub = document.createElement('div');
            hub.id = 'syndicateHub';
            hub.className = 'game-screen';
            hub.style.display = 'none';
            document.body.appendChild(hub);
        }

        if (!document.getElementById('gameCanvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'gameCanvas';
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
        }

        if (!document.getElementById('gameHUD')) {
            const hud = document.createElement('div');
            hud.id = 'gameHUD';
            hud.style.display = 'none';
            document.body.appendChild(hud);
        }

        // Mock game object
        const mockGame = {
            currentScreen: null,
            splashSkipped: false,
            currentMission: { id: 'test-mission', name: 'Test Mission' },
            startMission: function() {
                console.log('Mock: Starting mission');
                this.currentScreen = 'game';
            },
            startNewGame: function() {
                console.log('Mock: Starting new game');
            },
            continueCampaign: function() {
                console.log('Mock: Continuing campaign');
            },
            loadScreenMusic: function(screenId) {
                console.log(`Mock: Loading music for ${screenId}`);
            },
            dialogEngine: window.dialogEngine || {
                navigateTo: function(id) {
                    console.log(`Mock DialogEngine: Navigate to ${id}`);
                }
            }
        };

        return mockGame;
    }

    // Run all screen tests
    async runTests() {
        console.log('\n📺 Running Screen Layer Tests...\n');

        // Initialize screen manager if needed
        if (!window.screenManager) {
            console.log('❌ ScreenManager not loaded');
            return {
                passed: 0,
                failed: 1,
                errors: ['ScreenManager not found']
            };
        }

        const mockGame = this.createMockEnvironment();
        window.screenManager.init(mockGame);

        // Define test cases
        const tests = [
            this.testScreenManagerInitialization,
            this.testScreenRegistration,
            this.testDOMScreenNavigation,
            this.testCanvasScreenNavigation,
            this.testGeneratedScreenNavigation,
            this.testScreenTransitions,
            this.testPointerEventsManagement,
            this.testScreenDialogSeparation,
            this.testCompleteScreenFlow,
            this.testScreenMusicIntegration,
            this.testScreenActionExecution,
            this.testScreenConfigs
        ];

        // Run each test
        for (const test of tests) {
            try {
                await test.call(this);
                this.results.passed++;
                console.log(`✅ ${test.name}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({
                    test: test.name,
                    error: error.message
                });
                console.error(`❌ ${test.name}: ${error.message}`);
            }
        }

        return this.results;
    }

    // Test 1: ScreenManager Initialization
    async testScreenManagerInitialization() {
        const sm = window.screenManager;
        if (!sm) throw new Error('ScreenManager not initialized');
        if (!sm.screenContainer) throw new Error('Screen container not created');
        if (!sm.screenRegistry) throw new Error('Screen registry not created');
    }

    // Test 2: Screen Registration
    async testScreenRegistration() {
        const sm = window.screenManager;

        // Register a test screen
        sm.registerScreen('test-screen', {
            type: 'generated',
            content: '<h1>Test Screen</h1>',
            music: 'test-music.mp3'
        });

        const config = sm.screenRegistry.get('test-screen');
        if (!config) throw new Error('Screen not registered');
        if (config.type !== 'generated') throw new Error('Screen type mismatch');
    }

    // Test 3: DOM Screen Navigation
    async testDOMScreenNavigation() {
        const sm = window.screenManager;

        // Navigate to hub (DOM screen)
        sm.navigateTo('hub');

        const hub = document.getElementById('syndicateHub');
        if (hub.style.display !== 'flex') throw new Error('Hub not visible');
        if (sm.currentScreen !== 'hub') throw new Error('Current screen not updated');
    }

    // Test 4: Canvas Screen Navigation
    async testCanvasScreenNavigation() {
        const sm = window.screenManager;

        // Register game screen
        sm.registerScreen('game', {
            type: 'canvas'
        });

        // Navigate to game
        sm.navigateTo('game');

        const canvas = document.getElementById('gameCanvas');
        const hud = document.getElementById('gameHUD');

        if (canvas.style.display !== 'block') throw new Error('Canvas not visible');
        if (hud.style.display !== 'block') throw new Error('HUD not visible');
        if (sm.currentScreen !== 'game') throw new Error('Current screen not game');
    }

    // Test 5: Generated Screen Navigation
    async testGeneratedScreenNavigation() {
        const sm = window.screenManager;

        // Register a generated screen
        sm.registerScreen('victory', {
            type: 'generated',
            content: function(params) {
                return `<h1>Victory!</h1><p>Score: ${params?.score || 0}</p>`;
            },
            background: 'linear-gradient(45deg, gold, orange)',
            actions: [
                { text: 'Continue', action: 'navigate:hub', primary: true },
                { text: 'Quit', action: 'execute:exitGame' }
            ]
        });

        // Navigate with params
        sm.navigateTo('victory', { score: 1000 });

        const screenEl = document.getElementById('screen-victory');
        if (!screenEl) throw new Error('Generated screen not created');

        // Check content was generated with params
        if (!screenEl.innerHTML.includes('Score: 1000')) {
            throw new Error('Parameters not passed to generated content');
        }

        // Check actions were created
        const buttons = screenEl.querySelectorAll('.screen-action');
        if (buttons.length !== 2) throw new Error('Action buttons not created');
    }

    // Test 6: Screen Transitions
    async testScreenTransitions() {
        const sm = window.screenManager;

        // Register screens
        sm.registerScreen('screen-a', {
            type: 'generated',
            content: '<h1>Screen A</h1>'
        });

        sm.registerScreen('screen-b', {
            type: 'generated',
            content: '<h1>Screen B</h1>'
        });

        // Navigate to first screen
        sm.navigateTo('screen-a');
        let screenA = document.getElementById('screen-screen-a');
        if (!screenA) throw new Error('Screen A not created');

        // Navigate to second screen
        sm.navigateTo('screen-b');
        screenA = document.getElementById('screen-screen-a');
        let screenB = document.getElementById('screen-screen-b');

        if (screenA) throw new Error('Screen A not removed');
        if (!screenB) throw new Error('Screen B not created');
    }

    // Test 7: Pointer Events Management
    async testPointerEventsManagement() {
        const sm = window.screenManager;

        // Navigate to DOM screen (hub)
        sm.navigateTo('hub');
        if (sm.screenContainer.style.pointerEvents !== 'none') {
            throw new Error('Pointer events not disabled for DOM screen');
        }

        // Register and navigate to generated screen
        sm.registerScreen('interactive', {
            type: 'generated',
            content: '<button>Click me</button>'
        });

        sm.navigateTo('interactive');
        if (sm.screenContainer.style.pointerEvents !== 'auto') {
            throw new Error('Pointer events not enabled for generated screen');
        }
    }

    // Test 8: Screen/Dialog Separation
    async testScreenDialogSeparation() {
        const sm = window.screenManager;
        const mockGame = this.createMockEnvironment();

        let dialogOpened = false;
        mockGame.dialogEngine = {
            navigateTo: function(id) {
                dialogOpened = true;
            }
        };

        sm.init(mockGame);

        // Navigate to a screen
        sm.navigateTo('hub');
        if (sm.currentScreen !== 'hub') throw new Error('Not on hub screen');

        // Opening a dialog should not change the current screen
        mockGame.dialogEngine.navigateTo('character');
        if (!dialogOpened) throw new Error('Dialog not opened');
        if (sm.currentScreen !== 'hub') throw new Error('Screen changed when dialog opened');
    }

    // Test 9: Complete Screen Flow
    async testCompleteScreenFlow() {
        const sm = window.screenManager;

        // Register all main screens
        const screens = [
            { id: 'splash', type: 'generated', content: '<h1>Splash</h1>' },
            { id: 'menu', type: 'generated', content: '<h1>Menu</h1>' },
            { id: 'hub', type: 'dom', elementId: 'syndicateHub' },
            { id: 'mission-briefing', type: 'generated', content: '<h1>Briefing</h1>' },
            { id: 'loadout-select', type: 'generated', content: '<h1>Loadout</h1>' },
            { id: 'game', type: 'canvas' },
            { id: 'victory', type: 'generated', content: '<h1>Victory</h1>' }
        ];

        screens.forEach(screen => {
            sm.registerScreen(screen.id, screen);
        });

        // Test flow
        const flow = ['splash', 'menu', 'hub', 'mission-briefing', 'loadout-select', 'game', 'victory', 'hub'];

        for (const screenId of flow) {
            sm.navigateTo(screenId);
            if (sm.currentScreen !== screenId) {
                throw new Error(`Failed to navigate to ${screenId}`);
            }
        }
    }

    // Test 10: Screen Music Integration
    async testScreenMusicIntegration() {
        const sm = window.screenManager;
        const mockGame = this.createMockEnvironment();

        let musicLoaded = null;
        mockGame.loadScreenMusic = function(screenId) {
            musicLoaded = screenId;
        };

        sm.init(mockGame);

        // Register screen with music
        sm.registerScreen('music-test', {
            type: 'generated',
            content: '<h1>Music Test</h1>',
            music: 'test-music.mp3'
        });

        // Navigate to trigger music
        sm.navigateTo('music-test');

        if (musicLoaded !== 'music-test') {
            throw new Error('Music not loaded for screen');
        }
    }

    // Test 11: Screen Action Execution
    async testScreenActionExecution() {
        const sm = window.screenManager;
        const mockGame = this.createMockEnvironment();
        sm.init(mockGame);

        let actionExecuted = false;

        // Register screen with custom action
        sm.registerScreen('action-test', {
            type: 'generated',
            content: '<h1>Action Test</h1>',
            onEnter: function() {
                actionExecuted = true;
            }
        });

        // Navigate to trigger onEnter
        sm.navigateTo('action-test');

        if (!actionExecuted) {
            throw new Error('onEnter action not executed');
        }
    }

    // Test 12: Screen Config Validation
    async testScreenConfigs() {
        const sm = window.screenManager;

        // Test all required screen types
        const validTypes = ['dom', 'canvas', 'generated'];

        validTypes.forEach(type => {
            sm.registerScreen(`test-${type}`, { type });
            const config = sm.screenRegistry.get(`test-${type}`);
            if (!config || config.type !== type) {
                throw new Error(`Failed to register ${type} screen`);
            }
        });

        // Test that non-existent screens are handled
        try {
            sm.navigateTo('non-existent-screen');
            // Should log error but not crash
        } catch (error) {
            throw new Error('Failed to handle non-existent screen gracefully');
        }
    }
}

// Export for use in test runner
window.ScreenLayerTests = ScreenLayerTests;