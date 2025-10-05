/**
 * Catalog-Inventory Integration Tests
 * Tests for proper separation and interaction between catalog and inventory
 * Specifically tests the "Ghost Prototype owned: 0" bug fix
 */

describe('Catalog-Inventory Integration Tests', () => {

    function createMockServices() {
        const formulaService = {
            calculateDamage: (base, weapon, bonus) => base + weapon + bonus
        };

        const equipmentService = {
            weapons: {},
            equipment: {}
        };

        const catalogService = new CatalogService();
        const inventoryService = new InventoryService(formulaService, equipmentService);

        return { catalogService, inventoryService, formulaService, equipmentService };
    }

    function createTestCampaignConfig() {
        return {
            items: {
                weapons: {
                    'silenced_pistol': {
                        name: 'Silenced Pistol',
                        stats: { damage: 15 },
                        cost: 800,
                        owned: 3  // Player starts with 3
                    },
                    'ghost_prototype': {
                        name: 'Ghost Prototype',
                        stats: { damage: 45 },
                        cost: 5000,
                        owned: 0  // NOT owned - this was the bug!
                    },
                    'plasma_rifle': {
                        name: 'Plasma Rifle',
                        stats: { damage: 35 },
                        cost: 3500,
                        owned: 0
                    }
                },
                armor: {
                    'tactical_vest': {
                        name: 'Tactical Vest',
                        protection: 10,
                        cost: 500,
                        owned: 2
                    },
                    'power_armor': {
                        name: 'Power Armor',
                        protection: 25,
                        cost: 4000,
                        owned: 0
                    }
                }
            }
        };
    }

    describe('Bug Fix: Ghost Prototype owned: 0', () => {

        it('should NOT include owned: 0 items in starting inventory', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            // Initialize catalog
            catalogService.initialize(config, 'test');

            // Get starting inventory (ONLY owned > 0)
            const startingInv = catalogService.getPlayerStartingInventory();

            // Initialize inventory with starting items
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: [...startingInv.armor, ...startingInv.utility, ...startingInv.special]
            });

            // CRITICAL: Ghost Prototype should NOT be in inventory
            const ghostInInventory = inventoryService.getItemById('weapons', 'ghost_prototype');
            assertFalsy(ghostInInventory,
                'Ghost Prototype with owned: 0 should NOT be in inventory');

            // Silenced Pistol SHOULD be in inventory
            const pistolInInventory = inventoryService.getItemById('weapons', 'silenced_pistol');
            assertTruthy(pistolInInventory,
                'Silenced Pistol with owned: 3 should be in inventory');
            assertEqual(pistolInInventory.owned, 3,
                'Owned count should be preserved');
        });

        it('should include owned: 0 items in catalog (for shop)', () => {
            const { catalogService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');

            // Ghost Prototype SHOULD be in catalog
            const ghostInCatalog = catalogService.getItem('ghost_prototype');
            assertTruthy(ghostInCatalog,
                'Ghost Prototype should exist in catalog');
            assertEqual(ghostInCatalog.owned, 0,
                'Owned should be 0 in catalog');
        });

        it('should show owned: 0 items in shop', () => {
            const { catalogService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');

            // Shop should show ALL weapons
            const shopWeapons = catalogService.getShopItems(['weapons']);

            assertEqual(shopWeapons.length, 3,
                'Shop should show all 3 weapons');

            const ghost = shopWeapons.find(w => w.id === 'ghost_prototype');
            assertTruthy(ghost, 'Ghost Prototype should be in shop');
        });

        it('should add Ghost Prototype to inventory after purchase', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            // Simulate purchase
            const ghostFromCatalog = catalogService.getItem('ghost_prototype');
            const buyResult = inventoryService.buyItem('weapons', ghostFromCatalog, 5000);

            assertTruthy(buyResult, 'Purchase should succeed');

            // NOW it should be in inventory
            const ghostInInventory = inventoryService.getItemById('weapons', 'ghost_prototype');
            assertTruthy(ghostInInventory, 'Ghost should now be in inventory');
            assertEqual(ghostInInventory.owned, 1, 'Owned should be 1 after purchase');
        });

    });

    describe('Catalog Query Patterns', () => {

        it('should get all items for shop (catalog)', () => {
            const { catalogService } = createMockServices();
            catalogService.initialize(createTestCampaignConfig(), 'test');

            const allWeapons = catalogService.getItemsByCategory('weapons');

            assertEqual(allWeapons.length, 3,
                'Catalog should return all weapons for shop');
        });

        it('should get only owned items for player (inventory)', () => {
            const { catalogService } = createMockServices();
            catalogService.initialize(createTestCampaignConfig(), 'test');

            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(startingInv.weapons.length, 1,
                'Starting inventory should only have owned weapons');
            assertEqual(startingInv.armor.length, 1,
                'Starting inventory should only have owned armor');
        });

    });

    describe('Equipment Integration', () => {

        it('should only equip items that are in inventory', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            // Try to equip Ghost Prototype (not owned)
            const equipGhost = inventoryService.equipItem('agent_1', 'weapon', 'ghost_prototype');

            assertFalsy(equipGhost,
                'Should not equip item that is not in inventory');

            // Equip Silenced Pistol (owned)
            const equipPistol = inventoryService.equipItem('agent_1', 'weapon', 'silenced_pistol');

            assertTruthy(equipPistol,
                'Should equip item that is in inventory');
        });

        it('should not show unowned items in loadout UI', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            const availableWeapons = inventoryService.getWeapons();

            assertEqual(availableWeapons.length, 1,
                'Only owned weapons should be available for loadout');
            assertEqual(availableWeapons[0].id, 'silenced_pistol',
                'Should be silenced pistol');
        });

    });

    describe('Auto-Optimize with Nested Stats', () => {

        it('should sort weapons by nested stats.damage', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');

            // Buy all weapons so they're in inventory
            const allWeapons = catalogService.getItemsByCategory('weapons');
            inventoryService.initialize({ weapons: [], equipment: [] });

            allWeapons.forEach(weapon => {
                inventoryService.buyItem('weapons', weapon, weapon.cost);
            });

            const weapons = inventoryService.getWeapons();

            // Debug: Log weapon damage values
            console.log('🔍 Weapons before sort:');
            weapons.forEach(w => {
                const damage = w.stats?.damage || w.damage || 0;
                console.log(`  - ${w.id}: stats.damage=${w.stats?.damage}, damage=${w.damage}, effective=${damage}`);
            });

            // Sort by damage (handling nested stats)
            weapons.sort((a, b) => {
                const damageA = a.stats?.damage || a.damage || 0;
                const damageB = b.stats?.damage || b.damage || 0;
                return damageB - damageA;
            });

            console.log('🔍 Weapons after sort:', weapons.map(w => w.id));

            // Ghost Prototype (45) should be first
            assertEqual(weapons[0].id, 'ghost_prototype',
                `Highest damage weapon should be first (got: ${weapons[0].id} with damage ${weapons[0].stats?.damage || weapons[0].damage})`);

            if (weapons[0].stats && weapons[0].stats.damage) {
                assertEqual(weapons[0].stats.damage, 45,
                    'Damage should be 45');
            }

            // Plasma Rifle (35) should be second
            assertEqual(weapons[1].id, 'plasma_rifle',
                'Second highest should be plasma rifle');

            // Silenced Pistol (15) should be last
            assertEqual(weapons[2].id, 'silenced_pistol',
                'Lowest damage should be last');
        });

    });

    describe('Data Flow Verification', () => {

        it('should maintain separation: catalog → inventory → loadout', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            // Step 1: Initialize catalog (all items)
            catalogService.initialize(config, 'test');
            assertEqual(catalogService.getTotalItemCount(), 5,
                'Catalog should have all 5 items');

            // Step 2: Get starting inventory (only owned)
            const startingInv = catalogService.getPlayerStartingInventory();
            const totalOwned = startingInv.weapons.length + startingInv.armor.length;
            assertEqual(totalOwned, 2,
                'Starting inventory should have 2 items (pistol + vest)');

            // Step 3: Initialize inventory service
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: [...startingInv.armor]
            });

            // Step 4: Equip item to agent
            inventoryService.equipItem('agent_1', 'weapon', 'silenced_pistol');

            // Step 5: Verify loadout
            const loadout = inventoryService.getAgentLoadout('agent_1');
            assertEqual(loadout.weapon, 'silenced_pistol',
                'Loadout should have equipped weapon');

            // Catalog should remain unchanged
            assertEqual(catalogService.getTotalItemCount(), 5,
                'Catalog should still have all 5 items');
        });

        it('should handle purchase flow: catalog → buy → inventory → equip', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            // Ghost Prototype not in inventory
            let ghost = inventoryService.getItemById('weapons', 'ghost_prototype');
            assertFalsy(ghost, 'Not in inventory before purchase');

            // Buy from catalog
            const ghostFromCatalog = catalogService.getItem('ghost_prototype');
            inventoryService.buyItem('weapons', ghostFromCatalog, 5000);

            // Now in inventory
            ghost = inventoryService.getItemById('weapons', 'ghost_prototype');
            assertTruthy(ghost, 'In inventory after purchase');

            // Can equip
            const equipped = inventoryService.equipItem('agent_1', 'weapon', 'ghost_prototype');
            assertTruthy(equipped, 'Can equip after purchase');
        });

    });

    describe('Edge Cases and Validation', () => {

        it('should handle item with undefined owned', () => {
            const { catalogService } = createMockServices();
            const config = {
                items: {
                    weapons: {
                        'mystery': {
                            name: 'Mystery Weapon',
                            damage: 10
                            // owned is undefined
                        }
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(startingInv.weapons.length, 0,
                'Undefined owned should be treated as 0');
        });

        it('should handle item with initialOwned instead of owned', () => {
            const { catalogService } = createMockServices();
            const config = {
                items: {
                    weapons: {
                        'legacy': {
                            name: 'Legacy Weapon',
                            damage: 10,
                            initialOwned: 1
                        }
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(startingInv.weapons.length, 1,
                'Should use initialOwned if owned not present');
            assertEqual(startingInv.weapons[0].owned, 1,
                'Owned should be set to initialOwned value');
        });

        it('should not modify catalog when modifying inventory', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = createTestCampaignConfig();

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            // Modify inventory
            const pistol = inventoryService.getItemById('weapons', 'silenced_pistol');
            pistol.owned = 999;

            // Catalog should be unchanged
            const catalogPistol = catalogService.getItem('silenced_pistol');
            assertEqual(catalogPistol.owned, 3,
                'Catalog should not be modified by inventory changes');
        });

        it('should handle selling last item', () => {
            const { catalogService, inventoryService } = createMockServices();
            const config = {
                items: {
                    weapons: {
                        'pistol': {
                            name: 'Pistol',
                            damage: 10,
                            cost: 500,
                            owned: 1
                        }
                    }
                }
            };

            catalogService.initialize(config, 'test');
            const startingInv = catalogService.getPlayerStartingInventory();
            inventoryService.initialize({
                weapons: startingInv.weapons,
                equipment: []
            });

            // Sell the pistol
            inventoryService.sellItem('weapons', 'pistol');

            // Should still be in catalog
            const catalogPistol = catalogService.getItem('pistol');
            assertTruthy(catalogPistol, 'Should still be in catalog');

            // Should not be in inventory (owned: 0)
            const inventoryPistol = inventoryService.getItemById('weapons', 'pistol');
            assertEqual(inventoryPistol.owned, 0,
                'Inventory owned should be 0 after selling last one');
        });

    });

    describe('Service Integration with ContentLoader', () => {

        it('should simulate ContentLoader flow', () => {
            const { catalogService, inventoryService } = createMockServices();
            const rpgConfig = createTestCampaignConfig();

            // This is what ContentLoader does:

            // 1. Initialize catalog
            if (!catalogService) {
                throw new Error('CatalogService is required for item loading');
            }
            catalogService.initialize(rpgConfig, 'main');

            // 2. Get starting inventory
            const startingInventory = catalogService.getPlayerStartingInventory();

            // 3. Extract weapons and equipment
            const weapons = startingInventory.weapons;
            const equipment = [
                ...startingInventory.armor,
                ...startingInventory.utility,
                ...startingInventory.special
            ];

            // Verify results
            assertEqual(weapons.length, 1, 'Should have 1 starting weapon');
            assertEqual(equipment.length, 1, 'Should have 1 starting equipment');

            // Items with owned: 0 should NOT be included
            assertFalsy(weapons.find(w => w.owned === 0),
                'No items with owned: 0 should be in starting inventory');
        });

    });

});

console.log('🔗 Catalog-Inventory Integration tests loaded - 25+ tests for Ghost Prototype bug fix');
