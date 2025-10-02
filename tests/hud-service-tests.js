/**
 * HUDService Tests
 * Tests HUD management, element registration, and update logic
 */

// Node.js environment setup
if (typeof window === 'undefined') {
    // Mock document for Node.js
    global.document = {
        _elements: {},
        getElementById: function(id) {
            if (!this._elements[id]) {
                this._elements[id] = {
                    id: id,
                    style: { display: 'block', background: '' },
                    textContent: '',
                    innerHTML: '',
                    className: '',
                    children: [],
                    appendChild: function(child) { this.children.push(child); },
                    querySelector: function(selector) { return null; },
                    remove: function() {}
                };
            }
            return this._elements[id];
        },
        createElement: function(tag) {
            return {
                tagName: tag,
                id: '',
                className: '',
                innerHTML: '',
                textContent: '',
                style: {},
                children: [],
                appendChild: function(child) { this.children.push(child); },
                querySelector: function(selector) { return null; },
                addEventListener: function(event, handler) {},
                remove: function() {}
            };
        },
        body: {
            appendChild: function(el) {},
            removeChild: function(el) {}
        }
    };

    // Load HUDService
    const HUDService = require('../js/services/hud-service.js');
    global.HUDService = HUDService;
}

// Browser compatibility: Create required DOM elements
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Debug: Check what elements exist
    console.log('[HUD Tests] gameHUD exists?', !!document.getElementById('gameHUD'));
    console.log('[HUD Tests] game3DHUD exists?', !!document.getElementById('game3DHUD'));

    // Create gameHUD if it doesn't exist
    if (!document.getElementById('gameHUD')) {
        console.log('[HUD Tests] Creating gameHUD element');
        const gameHUD = document.createElement('div');
        gameHUD.id = 'gameHUD';
        gameHUD.style.display = 'none';
        document.body.appendChild(gameHUD);
    }

    // Create game3DHUD if it doesn't exist
    if (!document.getElementById('game3DHUD')) {
        console.log('[HUD Tests] Creating game3DHUD element');
        const game3DHUD = document.createElement('div');
        game3DHUD.id = 'game3DHUD';
        game3DHUD.style.display = 'none';
        document.body.appendChild(game3DHUD);
    }
}

describe('HUDService Tests', () => {

    // Helper function to create mock game object
    function createMockGame() {
        return {
            currentScreen: 'game',
            isAgentSelected: (agent) => agent.id === 'agent_1',
            selectAgent: (agent) => { /* mock */ },
            currentTurnUnit: null,
            turnBasedMode: false
        };
    }

    // Helper to create mock DOM element
    function createMockDOMElement(id) {
        const el = document.createElement('div');
        el.id = id;
        el.style.display = 'block';
        return el;
    }

    // Helper to setup DOM for tests
    function setupTestDOM() {
        // Create gameHUD container
        let gameHUD = document.getElementById('gameHUD');
        if (!gameHUD) {
            gameHUD = createMockDOMElement('gameHUD');
            document.body.appendChild(gameHUD);
        }

        // Create game3DHUD container
        let game3DHUD = document.getElementById('game3DHUD');
        if (!game3DHUD) {
            game3DHUD = createMockDOMElement('game3DHUD');
            document.body.appendChild(game3DHUD);
        }

        // Create test elements
        const elements = ['missionTimer', 'objectiveTracker', 'squadHealth', 'cooldown0'];
        elements.forEach(id => {
            let el = document.getElementById(id);
            if (!el) {
                el = createMockDOMElement(id);
                gameHUD.appendChild(el);
            }
        });

        return { gameHUD, game3DHUD };
    }

    // Helper to cleanup test DOM and recreate elements
    function cleanupTestDOM() {
        const toRemove = ['gameHUD', 'game3DHUD'];
        toRemove.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });

        // Recreate elements for next test (browser only)
        if (typeof window !== 'undefined' && typeof document !== 'undefined') {
            if (!document.getElementById('gameHUD')) {
                const gameHUD = document.createElement('div');
                gameHUD.id = 'gameHUD';
                gameHUD.style.display = 'none';
                document.body.appendChild(gameHUD);
            }
            if (!document.getElementById('game3DHUD')) {
                const game3DHUD = document.createElement('div');
                game3DHUD.id = 'game3DHUD';
                game3DHUD.style.display = 'none';
                document.body.appendChild(game3DHUD);
            }
        }
    }

    describe('HUDService Initialization', () => {

        it('should require game instance', () => {
            assertThrows(() => {
                new HUDService(null);
            }, 'Should throw error without game instance');
        });

        it('should initialize with correct properties', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            assertTruthy(service.game, 'Should have game reference');
            assertTruthy(service.elements instanceof Map, 'Should have elements Map');
            assertTruthy(service.lastData instanceof Map, 'Should have lastData Map');
            assertTruthy(service.domCache instanceof Map, 'Should have domCache Map');
            assertEqual(service.currentMode, null, 'Should start with null mode');
            assertTruthy(service.visibleElements instanceof Set, 'Should have visibleElements Set');
        });

        it('should have logger if available', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            if (window.Logger) {
                assertTruthy(service.logger, 'Should have logger when Logger is available');
            }
        });

    });

    describe('Element Registration', () => {

        it('should register element with valid parameters', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const updateFn = (domEl, data) => { domEl.textContent = data; };
            service.register('testElement', updateFn);

            assertTruthy(service.elements.has('testElement'), 'Element should be registered');
            assertEqual(service.elements.size, 1, 'Should have 1 registered element');
        });

        it('should throw error for invalid elementId', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            assertThrows(() => {
                service.register('', () => {});
            }, 'Should throw for empty elementId');

            assertThrows(() => {
                service.register(null, () => {});
            }, 'Should throw for null elementId');

            assertThrows(() => {
                service.register(123, () => {});
            }, 'Should throw for non-string elementId');
        });

        it('should throw error for invalid updateFn', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            assertThrows(() => {
                service.register('testElement', null);
            }, 'Should throw for null updateFn');

            assertThrows(() => {
                service.register('testElement', 'not a function');
            }, 'Should throw for non-function updateFn');
        });

        it('should register multiple elements', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.register('element1', (domEl, data) => {});
            service.register('element2', (domEl, data) => {});
            service.register('element3', (domEl, data) => {});

            assertEqual(service.elements.size, 3, 'Should have 3 registered elements');
            assertTruthy(service.elements.has('element1'), 'Should have element1');
            assertTruthy(service.elements.has('element2'), 'Should have element2');
            assertTruthy(service.elements.has('element3'), 'Should have element3');
        });

    });

    describe('HUD Mode Management', () => {

        it('should set mode to none', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.setMode('none');

            assertEqual(service.currentMode, 'none', 'Mode should be none');
            assertEqual(service.visibleElements.size, 0, 'No elements should be visible');

            const gameHUD = document.getElementById('gameHUD');
            const game3DHUD = document.getElementById('game3DHUD');
            if (gameHUD) assertEqual(gameHUD.style.display, 'none', 'gameHUD should be hidden');
            if (game3DHUD) assertEqual(game3DHUD.style.display, 'none', 'game3DHUD should be hidden');

            cleanupTestDOM();
        });

        it('should set mode to game-2d', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.setMode('game-2d', ['element1', 'element2']);

            assertEqual(service.currentMode, 'game-2d', 'Mode should be game-2d');
            assertEqual(service.visibleElements.size, 2, 'Should have 2 visible elements');
            assertTruthy(service.visibleElements.has('element1'), 'element1 should be visible');

            const gameHUD = document.getElementById('gameHUD');
            const game3DHUD = document.getElementById('game3DHUD');
            if (gameHUD) assertEqual(gameHUD.style.display, 'block', 'gameHUD should be visible');
            if (game3DHUD) assertEqual(game3DHUD.style.display, 'none', 'game3DHUD should be hidden');

            cleanupTestDOM();
        });

        it('should set mode to game-3d', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.setMode('game-3d', ['hud3d-element']);

            assertEqual(service.currentMode, 'game-3d', 'Mode should be game-3d');

            const gameHUD = document.getElementById('gameHUD');
            const game3DHUD = document.getElementById('game3DHUD');
            if (gameHUD) assertEqual(gameHUD.style.display, 'none', 'gameHUD should be hidden');
            if (game3DHUD) assertEqual(game3DHUD.style.display, 'block', 'game3DHUD should be visible');

            cleanupTestDOM();
        });

        it('should throw for unknown mode', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            assertThrows(() => {
                service.setMode('invalid-mode');
            }, 'Should throw for unknown mode');

            cleanupTestDOM();
        });

        it('should clear cache when mode changes', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            // Add some cached data
            service.lastData.set('test', { value: 123 });
            assertEqual(service.lastData.size, 1, 'Should have cached data');

            // Change mode
            service.setMode('game-2d');

            assertEqual(service.lastData.size, 0, 'Cache should be cleared on mode change');

            cleanupTestDOM();
        });

    });

    describe('Element Update', () => {

        it('should call update function for visible element', () => {
            setupTestDOM();

            // Create testElement in DOM for browser compatibility
            let testEl = document.getElementById('testElement');
            if (!testEl) {
                testEl = createMockDOMElement('testElement');
                const gameHUD = document.getElementById('gameHUD');
                if (gameHUD) {
                    gameHUD.appendChild(testEl);
                } else {
                    document.body.appendChild(testEl);
                }
            }

            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            let updateCalled = false;
            let capturedData = null;
            service.register('testElement', (domEl, data) => {
                updateCalled = true;
                capturedData = data;
                domEl.textContent = data.value;
            });

            service.setMode('game-2d', ['testElement']);
            service.update('testElement', { value: 'test' });

            assertTruthy(updateCalled, 'Update function should be called');
            assertEqual(capturedData.value, 'test', 'Should receive correct data');

            // Verify the DOM element was updated (get it from service's cache)
            const domEl = service.getDOMElement('testElement');
            if (domEl) {
                assertEqual(domEl.textContent, 'test', 'DOM should be updated');
            }

            cleanupTestDOM();
        });

        it('should skip update for hidden element', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            let updateCalled = false;
            service.register('hiddenElement', (domEl, data) => {
                updateCalled = true;
            });

            service.setMode('game-2d', []); // No visible elements
            service.update('hiddenElement', { value: 'test' });

            assertFalsy(updateCalled, 'Update function should not be called for hidden element');

            cleanupTestDOM();
        });

        it('should throw for unregistered element', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            assertThrows(() => {
                service.update('unregisteredElement', {});
            }, 'Should throw for unregistered element');
        });

        it('should skip update if data unchanged', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            let updateCount = 0;
            service.register('testElement', (domEl, data) => {
                updateCount++;
            });

            let testEl = document.getElementById('testElement');
            if (!testEl) {
                testEl = createMockDOMElement('testElement');
                const gameHUD = document.getElementById('gameHUD');
                if (gameHUD) {
                    gameHUD.appendChild(testEl);
                } else {
                    document.body.appendChild(testEl);
                }
            }

            service.setMode('game-2d', ['testElement']);

            // First update
            service.update('testElement', { value: 123 });
            assertEqual(updateCount, 1, 'Should call update first time');

            // Second update with same data
            service.update('testElement', { value: 123 });
            assertEqual(updateCount, 1, 'Should skip update with unchanged data');

            // Third update with different data
            service.update('testElement', { value: 456 });
            assertEqual(updateCount, 2, 'Should call update with changed data');

            testEl.remove();
            cleanupTestDOM();
        });

    });

    describe('Update Functions', () => {

        it('should update mission timer correctly', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const domEl = createMockDOMElement('timer');
            service.updateMissionTimer(domEl, 125); // 2 minutes 5 seconds

            assertEqual(domEl.textContent, '02:05', 'Should format timer as MM:SS');

            service.updateMissionTimer(domEl, 0);
            assertEqual(domEl.textContent, '00:00', 'Should handle zero');

            service.updateMissionTimer(domEl, 599); // 9 minutes 59 seconds
            assertEqual(domEl.textContent, '09:59', 'Should handle large numbers');
        });

        it('should update objective tracker with objectives', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const domEl = createMockDOMElement('tracker');
            const data = {
                turnBasedMode: false,
                objectives: [
                    { description: 'Objective 1', completed: true },
                    { description: 'Objective 2', completed: false }
                ]
            };

            service.updateObjectiveTracker(domEl, data);

            assertTruthy(domEl.textContent.includes('✅'), 'Should show completed icon');
            assertTruthy(domEl.textContent.includes('⏳'), 'Should show pending icon');
            assertTruthy(domEl.textContent.includes('Objective 1'), 'Should show objective 1');
            assertTruthy(domEl.textContent.includes('Objective 2'), 'Should show objective 2');
        });

        it('should update objective tracker with turn-based info', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const domEl = createMockDOMElement('tracker');
            const mockUnit = { name: 'Agent Smith', ap: 8, maxAp: 12 };
            const data = {
                turnBasedMode: true,
                currentTurnUnit: { unit: mockUnit, ap: 8, maxAp: 12 },
                turnRound: 3,
                objectives: []
            };

            service.updateObjectiveTracker(domEl, data);

            assertTruthy(domEl.textContent.includes('[TB Mode]'), 'Should show TB mode');
            assertTruthy(domEl.textContent.includes('Agent Smith'), 'Should show unit name');
            assertTruthy(domEl.textContent.includes('8/12 AP'), 'Should show AP');
            assertTruthy(domEl.textContent.includes('Round 3'), 'Should show round');
        });

        it('should update cooldown overlay', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const domEl = createMockDOMElement('cooldown');
            const data = { cooldownValue: 30, maxCooldown: 60 };

            service.updateCooldown(domEl, data);

            assertTruthy(domEl.style.background, 'Should set background style');
            assertTruthy(domEl.style.background.includes('conic-gradient'), 'Should use conic gradient');
        });

    });

    describe('Cache Management', () => {

        it('should cache DOM elements', () => {
            setupTestDOM();
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const testEl = createMockDOMElement('cacheTest');
            document.body.appendChild(testEl);

            // First call should add to cache
            const el1 = service.getDOMElement('cacheTest');
            assertEqual(service.domCache.size, 1, 'Should cache DOM element');

            // Second call should use cache
            const el2 = service.getDOMElement('cacheTest');
            assertTruthy(el1 === el2, 'Should return same cached element');

            testEl.remove();
            cleanupTestDOM();
        });

        it('should clear all caches', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            // Add data to caches
            service.lastData.set('test1', { value: 1 });
            service.domCache.set('test2', document.createElement('div'));

            assertEqual(service.lastData.size, 1, 'Should have data cache');
            assertEqual(service.domCache.size, 1, 'Should have DOM cache');

            service.clearCache();

            assertEqual(service.lastData.size, 0, 'Data cache should be cleared');
            assertEqual(service.domCache.size, 0, 'DOM cache should be cleared');
        });

    });

    describe('Status and Debugging', () => {

        it('should return correct status', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.register('element1', () => {});
            service.register('element2', () => {});
            service.setMode('game-2d', ['element1']);

            const status = service.getStatus();

            assertEqual(status.currentMode, 'game-2d', 'Should report current mode');
            assertEqual(status.totalElements, 2, 'Should report total elements');
            assertEqual(status.registeredElements.length, 2, 'Should list registered elements');
            assertEqual(status.visibleElements.length, 1, 'Should list visible elements');
            assertTruthy(status.registeredElements.includes('element1'), 'Should include element1');
        });

    });

    describe('Data Comparison', () => {

        it('should detect equal data', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const data1 = { value: 123, text: 'test' };
            const data2 = { value: 123, text: 'test' };

            assertTruthy(service.dataEquals(data1, data2), 'Should detect equal data');
        });

        it('should detect different data', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const data1 = { value: 123 };
            const data2 = { value: 456 };

            assertFalsy(service.dataEquals(data1, data2), 'Should detect different data');
        });

        it('should clone data correctly', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const original = { value: 123, nested: { count: 5 } };
            const cloned = service.cloneData(original);

            assertEqual(cloned.value, 123, 'Should clone value');
            assertEqual(cloned.nested.count, 5, 'Should clone nested data');
            assertTruthy(cloned !== original, 'Should be different object');
        });

        it('should remove game reference in comparison', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const data1 = { value: 123, game: mockGame };
            const data2 = { value: 123, game: createMockGame() };

            // Should be equal because game reference is removed
            assertTruthy(service.dataEquals(data1, data2), 'Should ignore game reference');
        });

        it('should clean agents array for comparison', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            const agent1 = { id: 'a1', name: 'Agent 1', health: 100, maxHealth: 100, alive: true, extraProp: 'test' };
            const agent2 = { id: 'a1', name: 'Agent 1', health: 100, maxHealth: 100, alive: true, differentProp: 'other' };

            const data1 = { agents: [agent1] };
            const data2 = { agents: [agent2] };

            // Should be equal because only essential agent properties are compared
            assertTruthy(service.dataEquals(data1, data2), 'Should only compare essential agent properties');
        });

    });

    describe('Register All Elements', () => {

        it('should register all standard HUD elements', () => {
            const mockGame = createMockGame();
            const service = new HUDService(mockGame);

            service.registerAllElements();

            assertTruthy(service.elements.has('missionTimer'), 'Should register missionTimer');
            assertTruthy(service.elements.has('objectiveTracker'), 'Should register objectiveTracker');
            assertTruthy(service.elements.has('squadHealth'), 'Should register squadHealth');

            // Should register 5 cooldown overlays
            for (let i = 0; i < 5; i++) {
                assertTruthy(service.elements.has(`cooldown${i}`), `Should register cooldown${i}`);
            }

            // Total: missionTimer + objectiveTracker + squadHealth + 5 cooldowns = 8
            assertEqual(service.elements.size, 8, 'Should register 8 elements total');
        });

    });

    // Generate coverage report
    console.log('\n📊 HUDService Test Coverage Report');
    console.log('==========================================');
    console.log('✅ Initialization: 3 tests');
    console.log('✅ Element Registration: 4 tests');
    console.log('✅ HUD Mode Management: 5 tests');
    console.log('✅ Element Update: 4 tests');
    console.log('✅ Update Functions: 4 tests');
    console.log('✅ Cache Management: 2 tests');
    console.log('✅ Status/Debugging: 1 test');
    console.log('✅ Data Comparison: 5 tests');
    console.log('✅ Register All Elements: 1 test');
    console.log('==========================================');
    console.log('Total: 29 tests covering HUDService');
});
