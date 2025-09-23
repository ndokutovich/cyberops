/**
 * RPG Managers Tests
 * Tests for RPGManager, InventoryManager, and ShopManager
 */

describe('RPG Managers Tests', () => {

    // Test RPGManager
    describe('RPGManager', () => {
        let rpgManager;

        beforeEach(() => {
            rpgManager = new RPGManager();
        });

        it('should initialize with empty entities map', () => {
            assertTruthy(rpgManager.entities instanceof Map, 'Entities should be a Map');
            assertEqual(rpgManager.entities.size, 0, 'Should start with no entities');
        });

        it('should generate experience table', () => {
            assertTruthy(rpgManager.experienceTable, 'Should have experience table');
            assertTruthy(rpgManager.experienceTable.length > 0, 'Experience table should not be empty');

            // Check progressive values
            for (let i = 2; i < 10; i++) {
                assertTruthy(
                    rpgManager.experienceTable[i] > rpgManager.experienceTable[i-1],
                    `Level ${i} should require more XP than level ${i-1}`
                );
            }
        });

        it('should create RPG agent with correct stats', () => {
            const baseAgent = {
                name: 'Test Agent',
                health: 100,
                damage: 20
            };

            const rpgAgent = rpgManager.createRPGAgent(baseAgent, 'soldier');

            assertTruthy(rpgAgent, 'Should create RPG agent');
            assertEqual(rpgAgent.name, 'Test Agent', 'Should preserve name');
            assertEqual(rpgAgent.level, 1, 'Should start at level 1');
            assertEqual(rpgAgent.experience, 0, 'Should start with 0 XP');
            assertTruthy(rpgAgent.stats, 'Should have stats');
            assertTruthy(rpgAgent.skills, 'Should have skills');
        });

        it('should track entities in map', () => {
            const agent = { name: 'Agent1', health: 100 };
            const rpgAgent = rpgManager.createRPGAgent(agent, 'soldier');

            assertTruthy(rpgManager.entities.has(rpgAgent), 'Should track entity in map');
            assertEqual(rpgManager.entities.size, 1, 'Should have one entity');
        });

        it('should grant experience and check level up', () => {
            const agent = { name: 'Agent1', health: 100 };
            const rpgAgent = rpgManager.createRPGAgent(agent, 'soldier');

            const startLevel = rpgAgent.level;
            const xpForNextLevel = rpgManager.getExperienceForLevel(2);

            // Grant enough XP to level up
            rpgManager.grantExperience(rpgAgent, xpForNextLevel);

            assertTruthy(rpgAgent.experience >= xpForNextLevel, 'Should have enough XP');
            assertEqual(rpgAgent.level, startLevel + 1, 'Should level up');
        });

        it('should calculate derived stats correctly', () => {
            const agent = { name: 'Agent1', health: 100 };
            const rpgAgent = rpgManager.createRPGAgent(agent, 'soldier');

            const derivedStats = rpgManager.calculateDerivedStats(rpgAgent);

            assertTruthy(derivedStats, 'Should calculate derived stats');
            assertTruthy(typeof derivedStats.maxHealth === 'number', 'Should have maxHealth');
            assertTruthy(typeof derivedStats.carryWeight === 'number', 'Should have carryWeight');
            assertTruthy(typeof derivedStats.critChance === 'number', 'Should have critChance');
        });

        it('should register and trigger level up callbacks', () => {
            const agent = { name: 'Agent1', health: 100 };
            const rpgAgent = rpgManager.createRPGAgent(agent, 'soldier');

            let callbackTriggered = false;
            let callbackEntity = null;

            // Register callback
            rpgManager.levelUpCallbacks.push((entity, level, rewards) => {
                callbackTriggered = true;
                callbackEntity = entity;
            });

            // Level up the agent
            const xpForNextLevel = rpgManager.getExperienceForLevel(2);
            rpgManager.grantExperience(rpgAgent, xpForNextLevel);

            assertTruthy(callbackTriggered, 'Level up callback should be triggered');
            assertEqual(callbackEntity, rpgAgent, 'Callback should receive correct entity');
        });
    });

    // Test InventoryManager
    describe('InventoryManager', () => {
        let inventoryManager;

        beforeEach(() => {
            inventoryManager = new InventoryManager();
        });

        it('should create inventory for owner', () => {
            const inventory = inventoryManager.createInventory('player1', 100);

            assertTruthy(inventory, 'Should create inventory');
            assertEqual(inventory.maxWeight, 100, 'Should set max weight');
            assertEqual(inventory.currentWeight, 0, 'Should start with 0 weight');
        });

        it('should retrieve inventory by owner ID', () => {
            inventoryManager.createInventory('player1', 100);
            const retrieved = inventoryManager.getInventory('player1');

            assertTruthy(retrieved, 'Should retrieve inventory');
            assertEqual(retrieved.maxWeight, 100, 'Should be same inventory');
        });

        it('should track multiple inventories', () => {
            inventoryManager.createInventory('player1', 100);
            inventoryManager.createInventory('player2', 150);
            inventoryManager.createInventory('npc1', 50);

            assertEqual(inventoryManager.inventories.size, 3, 'Should track 3 inventories');

            const inv1 = inventoryManager.getInventory('player1');
            const inv2 = inventoryManager.getInventory('player2');

            assertEqual(inv1.maxWeight, 100, 'Player 1 inventory correct');
            assertEqual(inv2.maxWeight, 150, 'Player 2 inventory correct');
        });
    });

    // Test ShopManager
    describe('ShopManager', () => {
        let shopManager;
        let mockRPGManager;
        let mockInventoryManager;

        beforeEach(() => {
            // Create mock managers
            mockRPGManager = {
                entities: new Map()
            };

            mockInventoryManager = {
                getInventory: (id) => {
                    return {
                        addItem: () => true,
                        removeItem: () => true,
                        getItem: (itemId) => ({ id: itemId, quantity: 5, value: 100 })
                    };
                }
            };

            shopManager = new ShopManager(mockRPGManager, mockInventoryManager);
        });

        it('should initialize with dependencies', () => {
            assertTruthy(shopManager.rpgManager, 'Should have RPG manager');
            assertTruthy(shopManager.inventoryManager, 'Should have inventory manager');
            assertEqual(shopManager.shops.size, 0, 'Should start with no shops');
        });

        it('should set and use config', () => {
            const config = {
                shops: {
                    generalStore: {
                        name: 'General Store',
                        itemCategories: ['weapons', 'armor']
                    }
                }
            };

            shopManager.setConfig(config);
            assertEqual(shopManager.rpgConfig, config, 'Should set config');
        });

        it('should load shops from config', () => {
            const config = {
                shops: {
                    weaponShop: {
                        name: 'Weapon Shop',
                        itemCategories: ['weapons'],
                        priceMultiplier: 1.2
                    },
                    armorShop: {
                        name: 'Armor Shop',
                        itemCategories: ['armor'],
                        priceMultiplier: 0.9
                    }
                }
            };

            shopManager.setConfig(config);
            shopManager.loadShops();

            assertEqual(shopManager.shops.size, 2, 'Should load 2 shops');
            assertTruthy(shopManager.shops.has('weaponShop'), 'Should have weapon shop');
            assertTruthy(shopManager.shops.has('armorShop'), 'Should have armor shop');
        });

        it('should generate shop inventory', () => {
            const shop = {
                itemCategories: ['weapons'],
                priceMultiplier: 1.0,
                infiniteStock: true
            };

            const inventory = shopManager.generateShopInventory(shop);

            assertTruthy(Array.isArray(inventory), 'Should return inventory array');
            // Note: Will be empty without proper config, but structure is tested
        });
    });

    // Test Independence from Game
    describe('Manager Independence', () => {
        it('should not reference game object', () => {
            const rpgManager = new RPGManager();
            const inventoryManager = new InventoryManager();
            const shopManager = new ShopManager(rpgManager, inventoryManager);

            assertFalsy(rpgManager.game, 'RPGManager should not have game reference');
            assertFalsy(inventoryManager.game, 'InventoryManager should not have game reference');
            assertFalsy(shopManager.game, 'ShopManager should not have game reference');
        });

        it('should not have circular references to services', () => {
            const rpgManager = new RPGManager();

            assertFalsy(rpgManager.rpgService, 'RPGManager should not reference RPGService');
            assertFalsy(rpgManager.gameServices, 'RPGManager should not reference GameServices');
        });
    });
});

// Export for test runner
window.RPGManagersTests = true;