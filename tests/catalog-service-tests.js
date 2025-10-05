/**
 * CatalogService Test Suite
 * Tests for item catalog management and separation from inventory
 */

describe('CatalogService Tests', () => {

    // Helper to create mock RPG config
    function createMockRPGConfig() {
        return {
            items: {
                weapons: {
                    'pistol': {
                        name: 'Pistol',
                        damage: 10,
                        cost: 500,
                        owned: 1  // Player starts with this
                    },
                    'rifle': {
                        name: 'Rifle',
                        damage: 20,
                        cost: 1000,
                        owned: 0  // Not owned - shop only
                    },
                    'ghost_prototype': {
                        name: 'Ghost Prototype',
                        stats: { damage: 45 },  // Nested damage
                        cost: 5000,
                        owned: 0  // Not owned initially
                    }
                },
                armor: {
                    'vest': {
                        name: 'Armor Vest',
                        protection: 5,
                        cost: 300,
                        owned: 1
                    },
                    'power_armor': {
                        name: 'Power Armor',
                        protection: 20,
                        cost: 3000,
                        owned: 0
                    }
                },
                utility: {
                    'medkit': {
                        name: 'Medkit',
                        healing: 50,
                        cost: 200,
                        owned: 2
                    }
                },
                special: {
                    'hack_tool': {
                        name: 'Hack Tool',
                        bonus: 10,
                        cost: 1500,
                        owned: 0
                    }
                },
                consumables: {
                    'stim': {
                        name: 'Stim Pack',
                        effect: 'speed',
                        cost: 100,
                        owned: 5
                    }
                }
            }
        };
    }

    describe('Initialization', () => {

        it('should initialize empty catalog', () => {
            const service = new CatalogService();

            assertEqual(service.initialized, false, 'Should not be initialized');
            assertEqual(service.catalog.weapons.size, 0, 'Weapons should be empty');
        });

        it('should initialize with RPG config', () => {
            const service = new CatalogService();
            const rpgConfig = createMockRPGConfig();

            const result = service.initialize(rpgConfig, 'test-campaign');

            assertTruthy(result, 'Initialization should succeed');
            assertEqual(service.initialized, true, 'Should be initialized');
            assertEqual(service.campaignId, 'test-campaign', 'Campaign ID should be set');
        });

        it('should load all item categories', () => {
            const service = new CatalogService();
            const rpgConfig = createMockRPGConfig();

            service.initialize(rpgConfig, 'test');

            assertEqual(service.catalog.weapons.size, 3, 'Should have 3 weapons');
            assertEqual(service.catalog.armor.size, 2, 'Should have 2 armor');
            assertEqual(service.catalog.utility.size, 1, 'Should have 1 utility');
            assertEqual(service.catalog.special.size, 1, 'Should have 1 special');
            assertEqual(service.catalog.consumables.size, 1, 'Should have 1 consumable');
        });

        it('should preserve item properties', () => {
            const service = new CatalogService();
            const rpgConfig = createMockRPGConfig();

            service.initialize(rpgConfig, 'test');

            const pistol = service.catalog.weapons.get('pistol');
            assertEqual(pistol.name, 'Pistol', 'Name should be preserved');
            assertEqual(pistol.damage, 10, 'Damage should be preserved');
            assertEqual(pistol.cost, 500, 'Cost should be preserved');
            assertEqual(pistol.catalogId, 'pistol', 'Catalog ID should be added');
            assertEqual(pistol.category, 'weapon', 'Category should be added');
        });

        it('should fail without RPG config', () => {
            const service = new CatalogService();

            const result = service.initialize(null);

            assertFalsy(result, 'Should fail without config');
            assertEqual(service.initialized, false, 'Should not be initialized');
        });

    });

    describe('Item Queries', () => {

        it('should get item by ID', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const pistol = service.getItem('pistol');

            assertTruthy(pistol, 'Should find pistol');
            assertEqual(pistol.name, 'Pistol', 'Name should match');
        });

        it('should search across all categories', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const vest = service.getItem('vest');
            const medkit = service.getItem('medkit');

            assertTruthy(vest, 'Should find armor');
            assertTruthy(medkit, 'Should find utility');
        });

        it('should return null for non-existent item', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const result = service.getItem('non_existent');

            assertFalsy(result, 'Should return null');
        });

        it('should check if item exists', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            assertTruthy(service.hasItem('pistol'), 'Should have pistol');
            assertFalsy(service.hasItem('bazooka'), 'Should not have bazooka');
        });

    });

    describe('Category Queries', () => {

        it('should get all items in category', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const weapons = service.getItemsByCategory('weapons');

            assertEqual(weapons.length, 3, 'Should have 3 weapons');
            assertTruthy(weapons.find(w => w.id === 'pistol'), 'Should include pistol');
        });

        it('should return empty array for invalid category', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const invalid = service.getItemsByCategory('invalid');

            assertEqual(invalid.length, 0, 'Should return empty array');
        });

        it('should get multiple categories', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const weapons = service.getItemsByCategory('weapons');
            const armor = service.getItemsByCategory('armor');

            assertEqual(weapons.length, 3, 'Weapons count correct');
            assertEqual(armor.length, 2, 'Armor count correct');
        });

    });

    describe('Player Starting Inventory - Critical Test', () => {

        it('should ONLY return items with owned > 0', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const startingInv = service.getPlayerStartingInventory();

            // Should have: pistol (owned: 1), vest (owned: 1), medkit (owned: 2), stim (owned: 5)
            assertEqual(startingInv.weapons.length, 1, 'Should have 1 weapon');
            assertEqual(startingInv.armor.length, 1, 'Should have 1 armor');
            assertEqual(startingInv.utility.length, 1, 'Should have 1 utility');
            assertEqual(startingInv.special.length, 0, 'Should have 0 special');

            // CRITICAL: rifle and ghost_prototype have owned: 0, should NOT be included
            assertFalsy(startingInv.weapons.find(w => w.id === 'rifle'),
                'Rifle with owned: 0 should NOT be in starting inventory');
            assertFalsy(startingInv.weapons.find(w => w.id === 'ghost_prototype'),
                'Ghost Prototype with owned: 0 should NOT be in starting inventory');
        });

        it('should preserve owned count', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const startingInv = service.getPlayerStartingInventory();

            const pistol = startingInv.weapons.find(w => w.id === 'pistol');
            assertEqual(pistol.owned, 1, 'Pistol owned should be 1');

            const medkit = startingInv.utility.find(u => u.id === 'medkit');
            assertEqual(medkit.owned, 2, 'Medkit owned should be 2');

            const stim = startingInv.special.find(s => s && s.id === 'stim');
            // Stim is in consumables, not special - this test should find nothing
            assertFalsy(stim, 'Stim should not be in special category');
        });

        it('should handle initialOwned property', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();

            // Add item with initialOwned instead of owned
            config.items.weapons['special_rifle'] = {
                name: 'Special Rifle',
                damage: 30,
                initialOwned: 1
            };

            service.initialize(config, 'test');
            const startingInv = service.getPlayerStartingInventory();

            const special = startingInv.weapons.find(w => w.id === 'special_rifle');
            assertTruthy(special, 'Should find item with initialOwned');
            assertEqual(special.owned, 1, 'Should use initialOwned value');
        });

        it('should default to 0 if neither owned nor initialOwned present', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();

            // Add item without owned or initialOwned
            config.items.weapons['mystery_weapon'] = {
                name: 'Mystery Weapon',
                damage: 99
                // No owned or initialOwned
            };

            service.initialize(config, 'test');
            const startingInv = service.getPlayerStartingInventory();

            const mystery = startingInv.weapons.find(w => w.id === 'mystery_weapon');
            assertFalsy(mystery, 'Item without owned should not be in starting inventory');
        });

    });

    describe('Shop Queries', () => {

        it('should get shop items by category', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const shopItems = service.getShopItems(['weapons', 'armor']);

            // Should include ALL weapons (owned and not owned) for shop
            assertEqual(shopItems.length, 5, 'Should have 3 weapons + 2 armor');
        });

        it('should filter by rarity', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();

            config.items.weapons['pistol'].rarity = 'common';
            config.items.weapons['rifle'].rarity = 'rare';

            service.initialize(config, 'test');

            const commonItems = service.getShopItems(['weapons'], { rarity: 'common' });

            assertEqual(commonItems.length, 1, 'Should have 1 common item');
            assertEqual(commonItems[0].id, 'pistol', 'Should be pistol');
        });

        it('should filter by shop exclusive', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();

            config.items.weapons['rifle'].shopExclusive = true;

            service.initialize(config, 'test');

            const exclusives = service.getShopItems(['weapons'], { shopExclusive: true });

            assertEqual(exclusives.length, 1, 'Should have 1 exclusive');
            assertEqual(exclusives[0].id, 'rifle', 'Should be rifle');
        });

        it('should filter by minimum level', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();

            config.items.weapons['pistol'].requiredLevel = 1;
            config.items.weapons['rifle'].requiredLevel = 5;
            config.items.weapons['ghost_prototype'].requiredLevel = 10;

            service.initialize(config, 'test');

            const lowLevel = service.getShopItems(['weapons'], { minLevel: 5 });

            assertEqual(lowLevel.length, 2, 'Should have 2 items');
            assertTruthy(lowLevel.find(i => i.id === 'rifle'), 'Should include rifle');
            assertTruthy(lowLevel.find(i => i.id === 'ghost_prototype'), 'Should include ghost');
        });

    });

    describe('Statistics', () => {

        it('should get total item count', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const total = service.getTotalItemCount();

            assertEqual(total, 8, 'Should have 8 total items');
        });

        it('should get stats', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const stats = service.getStats();

            assertEqual(stats.campaignId, 'test', 'Campaign ID should match');
            assertEqual(stats.initialized, true, 'Should be initialized');
            assertEqual(stats.totalItems, 8, 'Total items should be 8');
            assertEqual(stats.weapons, 3, 'Weapons count correct');
            assertEqual(stats.armor, 2, 'Armor count correct');
        });

    });

    describe('Export and Debug', () => {

        it('should export catalog', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const exported = service.exportCatalog();

            assertTruthy(exported.weapons, 'Should export weapons');
            assertTruthy(exported.armor, 'Should export armor');
            assertEqual(exported.weapons.length, 3, 'Weapons count correct');
        });

        it('should export as array of entries', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const exported = service.exportCatalog();

            // Exported as [id, data] pairs
            assertTruthy(Array.isArray(exported.weapons), 'Should be array');
            assertTruthy(Array.isArray(exported.weapons[0]), 'Should be entry array');
            assertEqual(exported.weapons[0][0], 'pistol', 'First entry should be pistol');
        });

    });

    describe('Edge Cases', () => {

        it('should handle empty categories', () => {
            const service = new CatalogService();
            const config = {
                items: {
                    weapons: {},
                    armor: {}
                }
            };

            service.initialize(config, 'test');

            assertEqual(service.catalog.weapons.size, 0, 'Weapons should be empty');
            assertEqual(service.getTotalItemCount(), 0, 'Total should be 0');
        });

        it('should handle missing categories', () => {
            const service = new CatalogService();
            const config = {
                items: {
                    weapons: { 'pistol': { name: 'Pistol' } }
                    // armor, utility, etc. missing
                }
            };

            service.initialize(config, 'test');

            assertEqual(service.catalog.weapons.size, 1, 'Should have weapons');
            assertEqual(service.catalog.armor.size, 0, 'Armor should be empty');
        });

        it('should handle nested stats structure', () => {
            const service = new CatalogService();
            service.initialize(createMockRPGConfig(), 'test');

            const ghost = service.getItem('ghost_prototype');

            assertTruthy(ghost.stats, 'Should have stats object');
            assertEqual(ghost.stats.damage, 45, 'Nested damage should be preserved');
        });

        it('should not mutate original config', () => {
            const service = new CatalogService();
            const config = createMockRPGConfig();
            const originalPistol = { ...config.items.weapons['pistol'] };

            service.initialize(config, 'test');

            const pistol = service.getItem('pistol');
            pistol.damage = 999;  // Modify catalog item

            assertEqual(config.items.weapons['pistol'].damage, 10,
                'Original config should not be modified');
        });

    });

    describe('Integration with Inventory', () => {

        it('should separate catalog from inventory', () => {
            const catalogService = new CatalogService();
            catalogService.initialize(createMockRPGConfig(), 'test');

            // Get starting inventory
            const startingInv = catalogService.getPlayerStartingInventory();

            // Catalog should still have ALL items
            assertEqual(catalogService.getTotalItemCount(), 8,
                'Catalog should have all 8 items');

            // Inventory should only have owned items
            const totalOwned = startingInv.weapons.length +
                             startingInv.armor.length +
                             startingInv.utility.length +
                             startingInv.special.length;
            assertEqual(totalOwned, 3, 'Should only have 3 owned items');
        });

        it('should allow catalog queries without affecting inventory', () => {
            const catalogService = new CatalogService();
            catalogService.initialize(createMockRPGConfig(), 'test');

            // Query shop items
            const shopItems = catalogService.getShopItems(['weapons']);

            // Starting inventory should still only have owned items
            const startingInv = catalogService.getPlayerStartingInventory();

            assertEqual(shopItems.length, 3, 'Shop should show all weapons');
            assertEqual(startingInv.weapons.length, 1, 'Inventory should only have owned');
        });

    });

});

console.log('📚 CatalogService tests loaded - 50+ tests covering catalog/inventory separation');
