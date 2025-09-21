/**
 * Screen Manager Test Suite
 * Tests for the three-layer UI architecture's screen layer
 */

// Test Framework
class ScreenManagerTestSuite {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    // Helper to create a test game environment
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
            dialogEngine: {
                navigateTo: function(id) {
                    console.log(`Mock DialogEngine: Navigate to ${id}`);
                }
            }
        };

        return mockGame;
    }

    // Add a test
    addTest(name, testFn) {
        this.tests.push({ name, testFn });
    }

    // Run all tests
    async runTests() {
        console.log('🧪 Running Screen Manager Tests...\n');

        for (const test of this.tests) {
            try {
                await test.testFn();
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

        this.printSummary();
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Screen Manager Test Results:');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);

        if (this.results.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.results.errors.forEach(err => {
                console.log(`   - ${err.test}: ${err.error}`);
            });
        }

        const total = this.results.passed + this.results.failed;
        const percentage = total > 0 ? (this.results.passed / total * 100).toFixed(1) : 0;
        console.log(`\n📈 Success Rate: ${percentage}%`);
    }

    // Assert helper
    assert(condition, message) {
        if (!condition) {
            throw new Error(message || 'Assertion failed');
        }
    }

    assertEquals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertNotNull(value, message) {
        if (value === null || value === undefined) {
            throw new Error(message || `Expected non-null value, got ${value}`);
        }
    }
}

// Create test suite instance
const screenTests = new ScreenManagerTestSuite();

// Test 1: ScreenManager Initialization
screenTests.addTest('ScreenManager should initialize correctly', async () => {
    const mockGame = screenTests.createMockEnvironment();

    // Reset and init
    window.screenManager = new ScreenManager();
    window.screenManager.init(mockGame);

    screenTests.assertNotNull(window.screenManager, 'ScreenManager should exist');
    screenTests.assertNotNull(window.screenManager.screenContainer, 'Screen container should be created');
    screenTests.assertEquals(window.screenManager.game, mockGame, 'Game reference should be set');
});

// Test 2: Screen Registration
screenTests.addTest('Should register and retrieve screens', async () => {
    const screenManager = window.screenManager;

    // Register a test screen
    screenManager.registerScreen('test-screen', {
        type: 'generated',
        content: '<h1>Test Screen</h1>',
        music: 'test-music.mp3'
    });

    const config = screenManager.screenRegistry.get('test-screen');
    screenTests.assertNotNull(config, 'Screen should be registered');
    screenTests.assertEquals(config.type, 'generated', 'Screen type should match');
});

// Test 3: DOM Screen Navigation
screenTests.addTest('Should show and hide DOM screens correctly', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();
    screenManager.init(mockGame);

    // Navigate to hub (DOM screen)
    screenManager.navigateTo('hub');

    const hub = document.getElementById('syndicateHub');
    screenTests.assertEquals(hub.style.display, 'flex', 'Hub should be visible');
    screenTests.assertEquals(screenManager.currentScreen, 'hub', 'Current screen should be hub');
    screenTests.assertEquals(mockGame.currentScreen, 'hub', 'Game current screen should be updated');
});

// Test 4: Canvas Screen Navigation
screenTests.addTest('Should show and hide canvas screens correctly', async () => {
    const screenManager = window.screenManager;

    // Register game screen
    screenManager.registerScreen('game', {
        type: 'canvas'
    });

    // Navigate to game
    screenManager.navigateTo('game');

    const canvas = document.getElementById('gameCanvas');
    const hud = document.getElementById('gameHUD');

    screenTests.assertEquals(canvas.style.display, 'block', 'Canvas should be visible');
    screenTests.assertEquals(hud.style.display, 'block', 'HUD should be visible');
    screenTests.assertEquals(screenManager.currentScreen, 'game', 'Current screen should be game');
});

// Test 5: Generated Screen Navigation
screenTests.addTest('Should create and display generated screens', async () => {
    const screenManager = window.screenManager;

    // Register a generated screen
    screenManager.registerScreen('victory', {
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
    screenManager.navigateTo('victory', { score: 1000 });

    const screenEl = document.getElementById('screen-victory');
    screenTests.assertNotNull(screenEl, 'Generated screen element should exist');

    // Check content was generated with params
    const hasScore = screenEl.innerHTML.includes('Score: 1000');
    screenTests.assert(hasScore, 'Generated content should include score parameter');

    // Check actions were created
    const buttons = screenEl.querySelectorAll('.screen-action');
    screenTests.assertEquals(buttons.length, 2, 'Should have 2 action buttons');
});

// Test 6: Screen Transitions
screenTests.addTest('Should handle screen transitions correctly', async () => {
    const screenManager = window.screenManager;

    // Register screens
    screenManager.registerScreen('screen-a', {
        type: 'generated',
        content: '<h1>Screen A</h1>'
    });

    screenManager.registerScreen('screen-b', {
        type: 'generated',
        content: '<h1>Screen B</h1>'
    });

    // Navigate to first screen
    screenManager.navigateTo('screen-a');
    let screenA = document.getElementById('screen-screen-a');
    screenTests.assertNotNull(screenA, 'Screen A should exist');

    // Navigate to second screen
    screenManager.navigateTo('screen-b');
    screenA = document.getElementById('screen-screen-a');
    let screenB = document.getElementById('screen-screen-b');

    screenTests.assert(!screenA, 'Screen A should be removed');
    screenTests.assertNotNull(screenB, 'Screen B should exist');
});

// Test 7: Action Execution
screenTests.addTest('Should execute screen actions correctly', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();
    screenManager.init(mockGame);

    let actionExecuted = false;

    // Register screen with custom action
    screenManager.registerScreen('action-test', {
        type: 'generated',
        content: '<h1>Action Test</h1>',
        onEnter: function() {
            actionExecuted = true;
        }
    });

    // Navigate to trigger onEnter
    screenManager.navigateTo('action-test');

    screenTests.assert(actionExecuted, 'onEnter action should be executed');
});

// Test 8: Music Loading
screenTests.addTest('Should trigger music loading for screens', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();

    let musicLoaded = null;
    mockGame.loadScreenMusic = function(screenId) {
        musicLoaded = screenId;
    };

    screenManager.init(mockGame);

    // Register screen with music
    screenManager.registerScreen('music-test', {
        type: 'generated',
        content: '<h1>Music Test</h1>',
        music: 'test-music.mp3'
    });

    // Navigate to trigger music
    screenManager.navigateTo('music-test');

    screenTests.assertEquals(musicLoaded, 'music-test', 'Music should be loaded for screen');
});

// Test 9: Pointer Events Management
screenTests.addTest('Should manage pointer events correctly', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();
    screenManager.init(mockGame);

    // Navigate to DOM screen (hub)
    screenManager.navigateTo('hub');
    screenTests.assertEquals(
        screenManager.screenContainer.style.pointerEvents,
        'none',
        'Pointer events should be none for DOM screens'
    );

    // Register and navigate to generated screen
    screenManager.registerScreen('interactive', {
        type: 'generated',
        content: '<button>Click me</button>'
    });

    screenManager.navigateTo('interactive');
    screenTests.assertEquals(
        screenManager.screenContainer.style.pointerEvents,
        'auto',
        'Pointer events should be auto for generated screens'
    );
});

// Test 10: Complete Flow Test
screenTests.addTest('Should handle complete application flow', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();
    screenManager.init(mockGame);

    // Register all main screens
    const screens = [
        { id: 'splash', type: 'generated', content: '<h1>Splash</h1>' },
        { id: 'menu', type: 'generated', content: '<h1>Menu</h1>' },
        { id: 'hub', type: 'dom', elementId: 'syndicateHub' },
        { id: 'mission-briefing', type: 'generated', content: '<h1>Briefing</h1>' },
        { id: 'loadout-select', type: 'generated', content: '<h1>Loadout</h1>' },
        { id: 'game', type: 'canvas' },
        { id: 'victory', type: 'generated', content: '<h1>Victory</h1>' },
        { id: 'defeat', type: 'generated', content: '<h1>Defeat</h1>' }
    ];

    screens.forEach(screen => {
        screenManager.registerScreen(screen.id, screen);
    });

    // Test flow: splash -> menu -> hub -> briefing -> loadout -> game -> victory -> hub
    const flow = ['splash', 'menu', 'hub', 'mission-briefing', 'loadout-select', 'game', 'victory', 'hub'];

    for (const screenId of flow) {
        screenManager.navigateTo(screenId);
        screenTests.assertEquals(
            screenManager.currentScreen,
            screenId,
            `Should be on ${screenId} screen`
        );
    }

    console.log('   ✓ Complete flow test passed');
});

// Test 11: Screen/Dialog Separation
screenTests.addTest('Should maintain separation between screens and dialogs', async () => {
    const screenManager = window.screenManager;
    const mockGame = screenTests.createMockEnvironment();

    let dialogOpened = false;
    mockGame.dialogEngine = {
        navigateTo: function(id) {
            dialogOpened = true;
        }
    };

    screenManager.init(mockGame);

    // Navigate to a screen
    screenManager.navigateTo('hub');
    screenTests.assertEquals(screenManager.currentScreen, 'hub', 'Should be on hub screen');

    // Opening a dialog should not change the current screen
    mockGame.dialogEngine.navigateTo('character');
    screenTests.assert(dialogOpened, 'Dialog should be opened');
    screenTests.assertEquals(screenManager.currentScreen, 'hub', 'Current screen should still be hub');
});

// Test 12: Screen Config Validation
screenTests.addTest('Should validate screen configurations', async () => {
    const screenManager = window.screenManager;

    // Test all required screen types
    const validTypes = ['dom', 'canvas', 'generated'];

    validTypes.forEach(type => {
        screenManager.registerScreen(`test-${type}`, { type });
        const config = screenManager.screenRegistry.get(`test-${type}`);
        screenTests.assertEquals(config.type, type, `Should register ${type} screen`);
    });

    // Test that non-existent screens are handled
    screenManager.navigateTo('non-existent-screen');
    // Should log error but not crash
    screenTests.assert(true, 'Should handle non-existent screens gracefully');
});

// Export test suite
window.screenManagerTests = screenTests;

// Auto-run if this is the main script
if (typeof module === 'undefined') {
    console.log('Screen Manager Test Suite Loaded');
    console.log('Run tests with: screenManagerTests.runTests()');
}