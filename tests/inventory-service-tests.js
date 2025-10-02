/**
 * InventoryService Test Suite
 * Comprehensive tests for inventory and equipment management
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import services if in Node.js
if (typeof window === 'undefined') {
    global.InventoryService = require('../js/services/inventory-service.js');
    global.FormulaService = require('../js/services/formula-service.js');
    global.EquipmentService = require('../js/services/equipment-service.js');
    global.Logger = require('../js/services/logger-service.js');
    // Mock getLogger
    global.window = global.window || {};
    global.window.getLogger = () => null;
}

describe('InventoryService Tests', () => {

    // Helper to create mock formula service
    function createMockFormulaService() {
        return {
            calculateDamage: (base, weapon, bonus) => base + weapon + bonus
        };
    }

    // Helper to create mock equipment service
    function createMockEquipmentService() {
        return {
            weapons: {
                'plasma_rifle': { id: 'plasma_rifle', name: 'Plasma Rifle', damage: 25, cost: 1000 }
            },
            equipment: {
                'armor_vest': { id: 'armor_vest', name: 'Armor Vest', defense: 10, cost: 500 }
            }
        };
    }

    // Helper to create service
    function createService() {
        const formulaService = createMockFormulaService();
        const equipmentService = createMockEquipmentService();
        return new InventoryService(formulaService, equipmentService);
    }

    // Helper test data
    function createTestWeapon(overrides = {}) {
        return {
            id: 'test_weapon',
            name: 'Test Weapon',
            damage: 20,
            range: 10,
            cost: 500,
            owned: 1,
            equipped: 0,
            ...overrides
        };
    }

    function createTestArmor(overrides = {}) {
        return {
            id: 'test_armor',
            name: 'Test Armor',
            defense: 5,
            cost: 300,
            owned: 1,
            equipped: 0,
            ...overrides
        };
    }

    describe('InventoryService Initialization', () => {

        it('should initialize with empty inventory', () => {
            const service = createService();

            assertEqual(service.inventory.weapons.length, 0, 'Should have no weapons');
            assertEqual(service.inventory.armor.length, 0, 'Should have no armor');
            assertEqual(service.inventory.intel, 0, 'Should have no intel');
        });

        it('should initialize with provided data', () => {
            const service = createService();
            const data = {
                weapons: [createTestWeapon()],
                equipment: [createTestArmor({ type: 'armor' })]
            };

            service.initialize(data);

            assertEqual(service.inventory.weapons.length, 1, 'Should have 1 weapon');
            assertEqual(service.inventory.armor.length, 1, 'Should have 1 armor');
        });

        it('should initialize agent loadouts', () => {
            const service = createService();
            const data = {
                agentLoadouts: {
                    'agent_1': { weapon: 'plasma_rifle', armor: 'armor_vest' }
                }
            };

            service.initialize(data);

            assertTruthy(service.agentLoadouts['agent_1'], 'Should have agent loadout');
            assertEqual(service.agentLoadouts['agent_1'].weapon, 'plasma_rifle', 'Weapon should be plasma_rifle');
        });

    });

    describe('Item Category Detection', () => {

        it('should detect weapon category', () => {
            const service = createService();

            assertEqual(service.getItemCategory('weapon'), 'weapons', 'Should detect weapon');
            assertEqual(service.getItemCategory('primary'), 'weapons', 'Should detect primary as weapon');
        });

        it('should detect armor category', () => {
            const service = createService();

            assertEqual(service.getItemCategory('armor'), 'armor', 'Should detect armor');
            assertEqual(service.getItemCategory('vest'), 'armor', 'Should detect vest as armor');
        });

        it('should detect utility category', () => {
            const service = createService();

            assertEqual(service.getItemCategory('utility'), 'utility', 'Should detect utility');
            assertEqual(service.getItemCategory('medkit'), 'utility', 'Should detect medkit as utility');
        });

        it('should detect consumable category', () => {
            const service = createService();

            assertEqual(service.getItemCategory('consumable'), 'consumables', 'Should detect consumable');
            assertEqual(service.getItemCategory('stim'), 'consumables', 'Should detect stim as consumable');
        });

    });

    describe('Item Pickup', () => {

        it('should pickup intel items', () => {
            const service = createService();
            const agent = { id: 'agent_1' };
            const item = { type: 'intel', value: 10 };

            const result = service.pickupItem(agent, item);

            assertTruthy(result, 'Pickup should succeed');
            assertEqual(service.inventory.intel, 10, 'Intel should be 10');
        });

        it('should pickup weapon items', () => {
            const service = createService();
            const agent = { id: 'agent_1' };
            const weapon = {
                type: 'weapon',
                weapon: 'Laser Pistol',
                weaponDamage: 15,
                weaponRange: 8
            };

            service.pickupItem(agent, weapon);

            assertTruthy(service.inventory.weapons.length > 0, 'Should have weapons');
        });

    });

    describe('Equipment Management', () => {

        it('should equip item to agent', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1' })]
            });

            const result = service.equipItem('agent_1', 'weapon', 'rifle_1');

            assertTruthy(result, 'Equip should succeed');
            assertEqual(service.agentLoadouts['agent_1'].weapon, 'rifle_1', 'Weapon should be equipped');
        });

        it('should unequip item from agent', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1' })]
            });

            service.equipItem('agent_1', 'weapon', 'rifle_1');
            const result = service.unequipItem('agent_1', 'weapon');

            assertTruthy(result, 'Unequip should succeed');
            assertEqual(service.agentLoadouts['agent_1'].weapon, null, 'Weapon should be unequipped');
        });

        it('should track equipped counts', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', equipped: 0 })]
            });

            service.equipItem('agent_1', 'weapon', 'rifle_1');
            service.syncEquippedCounts();

            const weapon = service.getItemById('weapons', 'rifle_1');
            assertEqual(weapon.equipped, 1, 'Equipped count should be 1');
        });

        it('should get agent equipment', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1' })],
                agentLoadouts: {
                    'agent_1': { weapon: 'rifle_1' }
                }
            });

            const equipment = service.getAgentEquipment('agent_1');

            assertTruthy(equipment.weapon, 'Should have weapon');
            assertEqual(equipment.weapon.id, 'rifle_1', 'Weapon ID should match');
        });

    });

    describe('Buy and Sell Operations', () => {

        it('should buy an item', () => {
            const service = createService();

            const result = service.buyItem('weapons', {
                id: 'new_rifle',
                name: 'New Rifle',
                damage: 30
            }, 1000);

            assertTruthy(result, 'Buy should succeed');
            assertEqual(service.inventory.weapons.length, 1, 'Should have 1 weapon');
            assertEqual(service.inventory.weapons[0].owned, 1, 'Should own 1');
        });

        it('should increase count when buying existing item', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', owned: 1 })]
            });

            service.buyItem('weapons', createTestWeapon({ id: 'rifle_1' }), 500);

            const weapon = service.getItemById('weapons', 'rifle_1');
            assertEqual(weapon.owned, 2, 'Should own 2');
        });

        it('should sell an item', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', owned: 2, cost: 500 })]
            });

            const result = service.sellItem('weapons', 'rifle_1');

            assertTruthy(result.success, 'Sell should succeed');
            assertEqual(result.price, 300, 'Sell price should be 60% of cost');

            const weapon = service.getItemById('weapons', 'rifle_1');
            assertEqual(weapon.owned, 1, 'Should own 1 after selling');
        });

        it('should not sell equipped items', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', owned: 1, equipped: 1 })],
                agentLoadouts: {
                    'agent_1': { weapon: 'rifle_1' }
                }
            });

            const result = service.sellItem('weapons', 'rifle_1');

            assertFalsy(result.success, 'Should not sell equipped item');
        });

    });

    describe('Loadout Management', () => {

        it('should get agent loadout', () => {
            const service = createService();
            service.initialize({
                agentLoadouts: {
                    'agent_1': { weapon: 'rifle_1', armor: 'vest_1' }
                }
            });

            const loadout = service.getAgentLoadout('agent_1');

            assertEqual(loadout.weapon, 'rifle_1', 'Weapon should match');
            assertEqual(loadout.armor, 'vest_1', 'Armor should match');
        });

        it('should set agent loadout', () => {
            const service = createService();

            service.setAgentLoadout('agent_1', {
                weapon: 'new_rifle',
                armor: 'new_vest'
            });

            const loadout = service.agentLoadouts['agent_1'];
            assertEqual(loadout.weapon, 'new_rifle', 'Weapon should be set');
            assertEqual(loadout.armor, 'new_vest', 'Armor should be set');
        });

        it('should get all loadouts', () => {
            const service = createService();
            service.initialize({
                agentLoadouts: {
                    'agent_1': { weapon: 'rifle_1' },
                    'agent_2': { weapon: 'rifle_2' }
                }
            });

            const allLoadouts = service.getAllLoadouts();

            assertEqual(Object.keys(allLoadouts).length, 2, 'Should have 2 loadouts');
        });

    });

    describe('Inventory Queries', () => {

        it('should get weapons list', () => {
            const service = createService();
            service.initialize({
                weapons: [
                    createTestWeapon({ id: 'rifle_1' }),
                    createTestWeapon({ id: 'rifle_2' })
                ]
            });

            const weapons = service.getWeapons();

            assertEqual(weapons.length, 2, 'Should have 2 weapons');
        });

        it('should get equipment list', () => {
            const service = createService();
            service.initialize({
                equipment: [
                    createTestArmor({ id: 'vest_1', type: 'armor' }),
                    createTestArmor({ id: 'vest_2', type: 'armor' })
                ]
            });

            const equipment = service.getEquipment();

            assertTruthy(equipment.length > 0, 'Should have equipment');
        });

        it('should get item by ID', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', name: 'Special Rifle' })]
            });

            const item = service.getItemById('weapons', 'rifle_1');

            assertTruthy(item, 'Item should exist');
            assertEqual(item.name, 'Special Rifle', 'Name should match');
        });

        it('should return null for non-existent item', () => {
            const service = createService();

            const item = service.getItemById('weapons', 'non_existent');

            assertFalsy(item, 'Should return null for non-existent item');
        });

        it('should get inventory summary', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon()],
                equipment: [createTestArmor({ type: 'armor' })]
            });

            const summary = service.getInventorySummary();

            assertEqual(summary.weapons.length, 1, 'Should have 1 weapon');
            assertEqual(summary.armor.length, 1, 'Should have 1 armor');
        });

    });

    describe('Equipment Synchronization', () => {

        it('should sync equipped counts from loadouts', () => {
            const service = createService();
            service.initialize({
                weapons: [
                    createTestWeapon({ id: 'rifle_1', equipped: 0 }),
                    createTestWeapon({ id: 'rifle_2', equipped: 0 })
                ],
                agentLoadouts: {
                    'agent_1': { weapon: 'rifle_1' },
                    'agent_2': { weapon: 'rifle_1' }
                }
            });

            service.syncEquippedCounts();

            const rifle1 = service.getItemById('weapons', 'rifle_1');
            const rifle2 = service.getItemById('weapons', 'rifle_2');

            assertEqual(rifle1.equipped, 2, 'Rifle 1 should be equipped twice');
            assertEqual(rifle2.equipped, 0, 'Rifle 2 should not be equipped');
        });

    });

    describe('State Management', () => {

        it('should export state', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon()],
                agentLoadouts: { 'agent_1': { weapon: 'test_weapon' } }
            });

            const state = service.exportState();

            assertTruthy(state.inventory, 'Should export inventory');
            assertTruthy(state.agentLoadouts, 'Should export loadouts');
            assertEqual(state.inventory.weapons.length, 1, 'Should have 1 weapon');
        });

        it('should import state', () => {
            const service = createService();

            const state = {
                inventory: {
                    weapons: [createTestWeapon()],
                    armor: [],
                    utility: [],
                    consumables: [],
                    intel: 50
                },
                agentLoadouts: {
                    'agent_1': { weapon: 'test_weapon' }
                }
            };

            service.importState(state);

            assertEqual(service.inventory.weapons.length, 1, 'Should import weapons');
            assertEqual(service.inventory.intel, 50, 'Should import intel');
            assertTruthy(service.agentLoadouts['agent_1'], 'Should import loadouts');
        });

    });

    describe('Item Updates', () => {

        it('should update item count', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', owned: 5 })]
            });

            service.updateItemCount('weapon', 'rifle_1', 3);

            const weapon = service.getItemById('weapons', 'rifle_1');
            assertEqual(weapon.owned, 8, 'Count should increase by 3');
        });

        it('should not reduce count below zero', () => {
            const service = createService();
            service.initialize({
                weapons: [createTestWeapon({ id: 'rifle_1', owned: 5, equipped: 3 })]
            });

            service.updateItemCount('weapon', 'rifle_1', -10);

            const weapon = service.getItemById('weapons', 'rifle_1');
            assertEqual(weapon.owned, 0, 'Should not go below zero');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
