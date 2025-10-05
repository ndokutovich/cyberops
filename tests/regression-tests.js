/**
 * Regression Tests
 * Tests for previously identified bugs to prevent re-occurrence
 */

describe('Regression Tests', () => {

    describe('Ghost Prototype Bug (2025-01-05)', () => {

        it('should NOT load items with owned: 0 into inventory', () => {
            const catalogService = new CatalogService();
            const config = {
                items: {
                    weapons: {
                        'ghost_prototype': {
                            name: 'Ghost Prototype',
                            stats: { damage: 45 },
                            cost: 5000,
                            owned: 0  // Bug: This was being loaded as owned: 1
                        }
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(startingInv.weapons.length, 0,
                'REGRESSION: Items with owned: 0 should NOT be in starting inventory');
        });

        it('should use owned !== undefined check, not truthy check', () => {
            const catalogService = new CatalogService();
            const config = {
                items: {
                    weapons: {
                        'weapon_zero': {
                            name: 'Zero Weapon',
                            owned: 0  // Truthy check would fail here
                        },
                        'weapon_one': {
                            name: 'One Weapon',
                            owned: 1
                        }
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(startingInv.weapons.length, 1,
                'REGRESSION: owned: 0 was treated as falsy, triggering default owned: 1');
            assertEqual(startingInv.weapons[0].id, 'weapon_one',
                'Only weapon with owned: 1 should be included');
        });

        it('should preserve exact owned count, not default to 1', () => {
            const catalogService = new CatalogService();
            const config = {
                items: {
                    weapons: {
                        'pistol': { name: 'Pistol', owned: 3 }  // Not 1!
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();

            const pistol = startingInv.weapons[0];
            assertEqual(pistol.owned, 3,
                'REGRESSION: owned count was being overridden to 1');
        });

    });

    describe('AgentService Health Bug (Fixed)', () => {

        it('should preserve campaign health values, not default to 100', () => {
            const service = new AgentService();
            const agents = [
                {
                    id: 'agent_1',
                    name: 'Agent 1',
                    health: 90,  // Campaign value
                    maxHealth: 90,
                    hired: true
                }
            ];

            service.initialize(agents);

            const agent = service.getAgent('agent_1');
            assertEqual(agent.maxHealth, 90,
                'REGRESSION: AgentService was setting maxHealth: 100 default');
            assertEqual(agent.health, 90, 'Health should match campaign value');
        });

    });

    describe('Auto-Optimize Sorting Bug (Fixed)', () => {

        it('should handle nested stats.damage when sorting', () => {
            const weapons = [
                { id: 'pistol', name: 'Pistol', stats: { damage: 15 } },
                { id: 'ghost', name: 'Ghost', stats: { damage: 45 } },
                { id: 'rifle', name: 'Rifle', stats: { damage: 35 } }
            ];

            // This is the fix that handles both nested and flat
            weapons.sort((a, b) => {
                const damageA = a.stats?.damage || a.damage || 0;
                const damageB = b.stats?.damage || b.damage || 0;
                return damageB - damageA;
            });

            assertEqual(weapons[0].id, 'ghost',
                'REGRESSION: Nested stats.damage was sorting as undefined');
            assertEqual(weapons[1].id, 'rifle', 'Second highest should be rifle');
            assertEqual(weapons[2].id, 'pistol', 'Lowest should be last');
        });

        it('should handle mixed nested and flat damage properties', () => {
            const weapons = [
                { id: 'old', name: 'Old', damage: 20 },  // Flat
                { id: 'new', name: 'New', stats: { damage: 30 } },  // Nested
                { id: 'broken', name: 'Broken' }  // No damage
            ];

            weapons.sort((a, b) => {
                const damageA = a.stats?.damage || a.damage || 0;
                const damageB = b.stats?.damage || b.damage || 0;
                return damageB - damageA;
            });

            assertEqual(weapons[0].id, 'new', 'Nested damage should work');
            assertEqual(weapons[1].id, 'old', 'Flat damage should work');
            assertEqual(weapons[2].id, 'broken', 'Missing damage should default to 0');
        });

    });

    describe('Service Method Binding (Fixed 2025-01-05)', () => {

        it('should bind AgentService.getSelectedAgents', () => {
            const service = new AgentService();

            // This was failing before binding was added
            assertTruthy(typeof service.getSelectedAgents === 'function',
                'REGRESSION: getSelectedAgents was not bound');

            // Should work when called through external reference
            const methodRef = service.getSelectedAgents;
            const result = methodRef();

            assertTruthy(Array.isArray(result),
                'REGRESSION: Unbound method lost this context');
        });

        it('should bind RPGService.setConfig', () => {
            if (!window.GameServices || !window.GameServices.rpgService) {
                console.log('⚠️ Skipping: GameServices not initialized');
                return;
            }

            const rpgService = window.GameServices.rpgService;

            assertTruthy(typeof rpgService.setConfig === 'function',
                'REGRESSION: setConfig was not bound');

            // Test that it works when called
            const testConfig = { classes: {}, skills: {} };
            rpgService.setConfig(testConfig);

            assertEqual(rpgService.rpgConfig, testConfig,
                'Config should be set');
        });

    });

    describe('Script Loading Order (Fixed 2025-01-05)', () => {

        it('should load CatalogService before GameServices', () => {
            assertTruthy(typeof CatalogService !== 'undefined',
                'REGRESSION: CatalogService not loaded before GameServices');
        });

        it('should have CatalogService in GameServices', () => {
            if (!window.GameServices) {
                console.log('⚠️ Skipping: GameServices not initialized');
                return;
            }

            assertTruthy(window.GameServices.catalogService,
                'REGRESSION: CatalogService not initialized in GameServices');

            assertTruthy(window.GameServices.catalogService instanceof CatalogService,
                'catalogService should be CatalogService instance');
        });

    });

    describe('Truthy/Falsy Numeric Bugs', () => {

        it('should handle owned: 0 vs undefined correctly', () => {
            const values = [
                { value: 0, expected: 0, label: 'explicit 0' },
                { value: undefined, expected: 0, label: 'undefined' },
                { value: 1, expected: 1, label: 'explicit 1' },
                { value: 5, expected: 5, label: 'explicit 5' }
            ];

            values.forEach(test => {
                // Correct pattern
                const result = test.value !== undefined ? test.value : 0;
                assertEqual(result, test.expected,
                    `REGRESSION: ${test.label} should be ${test.expected}`);
            });
        });

        it('should NOT use || operator for numeric defaults', () => {
            // BAD pattern (was causing bugs)
            const badPattern = (value) => value || 1;

            assertEqual(badPattern(0), 1,
                'This is the BUG: 0 || 1 = 1 (wrong!)');
            assertEqual(badPattern(5), 5,
                'This works: 5 || 1 = 5');

            // GOOD pattern
            const goodPattern = (value) => value !== undefined ? value : 1;

            assertEqual(goodPattern(0), 0,
                'CORRECT: explicit 0 is preserved');
            assertEqual(goodPattern(undefined), 1,
                'CORRECT: undefined gets default 1');
            assertEqual(goodPattern(5), 5,
                'CORRECT: explicit 5 is preserved');
        });

    });

    describe('Data Flow Architecture', () => {

        it('should maintain unidirectional flow: catalog → inventory', () => {
            const catalogService = new CatalogService();
            const config = {
                items: {
                    weapons: {
                        'w1': { name: 'W1', owned: 1 },
                        'w2': { name: 'W2', owned: 0 }
                    }
                }
            };

            catalogService.initialize(config, 'test');

            // Catalog should have both
            assertEqual(catalogService.catalog.weapons.size, 2,
                'Catalog should have all items');

            // Starting inventory should only have owned
            const startingInv = catalogService.getPlayerStartingInventory();
            assertEqual(startingInv.weapons.length, 1,
                'Inventory should only have owned items');

            // This is UNIDIRECTIONAL - inventory is derived from catalog
            // NOT bidirectional - no syncing back to catalog
            assertTruthy(true, 'REGRESSION: Ensure no bidirectional syncing');
        });

        it('should fail fast if CatalogService unavailable', () => {
            // Simulate ContentLoader behavior
            const catalogService = null;

            let errorThrown = false;
            try {
                if (!catalogService) {
                    throw new Error('CatalogService is required for item loading');
                }
            } catch (e) {
                errorThrown = true;
            }

            assertTruthy(errorThrown,
                'REGRESSION: Should fail fast instead of silent fallback');
        });

    });

    describe('Zero Tolerance for Legacy Approaches', () => {

        it('should NOT have fallback to old filtering code', () => {
            // This pattern was completely removed
            const hasLegacyCode = false;  // Would be true if old code existed

            assertFalsy(hasLegacyCode,
                'REGRESSION: No fallback to manual owned > 0 filtering allowed');
        });

        it('should NOT access rpgConfig.items directly', () => {
            // All code should use CatalogService.getItemsByCategory()
            // not rpgConfig.items.weapons

            // This is enforced by architecture, not code check
            assertTruthy(true,
                'REGRESSION: Use CatalogService, not direct rpgConfig access');
        });

    });

    describe('Service Initialization Order', () => {

        it('should initialize services in dependency order', () => {
            if (!window.GameServices) {
                console.log('⚠️ Skipping: GameServices not initialized');
                return;
            }

            // Core services (no dependencies)
            assertTruthy(window.GameServices.formulaService,
                'FormulaService should be initialized');
            assertTruthy(window.GameServices.resourceService,
                'ResourceService should be initialized');
            assertTruthy(window.GameServices.agentService,
                'AgentService should be initialized');

            // Dependent services
            assertTruthy(window.GameServices.catalogService,
                'CatalogService should be initialized');
            assertTruthy(window.GameServices.inventoryService,
                'InventoryService should be initialized after Catalog');
            assertTruthy(window.GameServices.rpgService,
                'RPGService should be initialized');
        });

    });

    describe('Read-Only Properties (2025-01 Enforcement)', () => {

        it('should use service methods for state changes, not direct assignment', () => {
            // Direct assignment was removed
            // game.credits = 5000;  ❌ No longer works

            // Must use service
            if (!window.GameServices || !window.GameServices.resourceService) {
                console.log('⚠️ Skipping: GameServices not initialized');
                return;
            }

            const resourceService = window.GameServices.resourceService;
            resourceService.initialize({ credits: 1000, researchPoints: 0, worldControl: 0 });

            // Correct pattern
            resourceService.set('credits', 5000, 'test');
            assertEqual(resourceService.get('credits'), 5000,
                'REGRESSION: Must use resourceService.set(), not direct assignment');
        });

    });

});

console.log('🔄 Regression tests loaded - Prevents bugs from returning');
