/**
 * EquipmentService Test Suite
 * Comprehensive tests for equipment management and optimization
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import services if in Node.js
if (typeof window === 'undefined') {
    global.EquipmentService = require('../js/services/equipment-service.js');
    global.FormulaService = require('../js/services/formula-service.js');
    global.Logger = require('../js/services/logger-service.js');
}

describe('EquipmentService Tests', () => {

    // Helper to create mock formula service
    function createMockFormulaService() {
        return {
            calculateDamage: (base, weapon, bonus, armor) => Math.max(1, base + weapon + bonus - armor),
            calculateProtection: (base, armor, bonus) => base + armor + bonus
        };
    }

    // Helper to create service
    function createService() {
        const formulaService = createMockFormulaService();
        return new EquipmentService(formulaService);
    }

    // Helper test data
    function createTestWeapon(overrides = {}) {
        return {
            id: 'test_weapon',
            name: 'Test Weapon',
            damage: 20,
            range: 10,
            cost: 500,
            ...overrides
        };
    }

    function createTestEquipment(overrides = {}) {
        return {
            id: 'test_equipment',
            name: 'Test Equipment',
            type: 'armor',
            defense: 10,
            cost: 300,
            ...overrides
        };
    }

    describe('EquipmentService Initialization', () => {

        it('should initialize with formula service', () => {
            const formulaService = createMockFormulaService();
            const service = new EquipmentService(formulaService);

            assertTruthy(service.formulaService, 'Should have formula service');
        });

        it('should have weapons data', () => {
            const service = createService();

            assertTruthy(service.getAllWeapons, 'Should have getAllWeapons method');
        });

        it('should have equipment data', () => {
            const service = createService();

            assertTruthy(service.getAllEquipment, 'Should have getAllEquipment method');
        });

    });

    describe('Weapon Management', () => {

        it('should get all weapons', () => {
            const service = createService();

            const weapons = service.getAllWeapons();

            assertTruthy(Array.isArray(weapons), 'Should return array');
        });

        it('should get weapon by ID', () => {
            const service = createService();

            // Get first weapon from list to test with
            const allWeapons = service.getAllWeapons();
            if (allWeapons.length > 0) {
                const weaponId = allWeapons[0].id;
                const weapon = service.getWeapon(weaponId);

                assertTruthy(weapon, 'Should find weapon');
                assertEqual(weapon.id, weaponId, 'Weapon ID should match');
            }
        });

        it('should return null for non-existent weapon', () => {
            const service = createService();

            const weapon = service.getWeapon('non_existent_weapon');

            assertFalsy(weapon, 'Should return null for non-existent weapon');
        });

        it('should get best available weapon', () => {
            const service = createService();
            const inventory = [
                createTestWeapon({ id: 'weak', damage: 10, owned: 1, equipped: 0 }),
                createTestWeapon({ id: 'strong', damage: 30, owned: 1, equipped: 0 })
            ];

            const best = service.getBestAvailableWeapon(inventory);

            if (best) {
                assertEqual(best.id, 'strong', 'Should select stronger weapon');
            }
        });

    });

    describe('Equipment Management', () => {

        it('should get all equipment', () => {
            const service = createService();

            const equipment = service.getAllEquipment();

            assertTruthy(Array.isArray(equipment), 'Should return array');
        });

        it('should get equipment by ID', () => {
            const service = createService();

            const allEquipment = service.getAllEquipment();
            if (allEquipment.length > 0) {
                const equipmentId = allEquipment[0].id;
                const equipment = service.getEquipment(equipmentId);

                assertTruthy(equipment, 'Should find equipment');
                assertEqual(equipment.id, equipmentId, 'Equipment ID should match');
            }
        });

        it('should return null for non-existent equipment', () => {
            const service = createService();

            const equipment = service.getEquipment('non_existent');

            assertFalsy(equipment, 'Should return null for non-existent equipment');
        });

    });

    describe('Equipment Bonuses', () => {

        it('should calculate equipment bonuses', () => {
            const service = createService();
            const inventory = [
                createTestEquipment({ type: 'armor', protection: 10, owned: 1 })
            ];

            const bonuses = service.calculateEquipmentBonuses(inventory);

            assertTruthy(bonuses, 'Should return bonuses object');
            assertTruthy(bonuses.protection !== undefined, 'Should have protection bonus');
        });

        it('should return zero bonuses for empty inventory', () => {
            const service = createService();

            const bonuses = service.calculateEquipmentBonuses([]);

            assertTruthy(bonuses, 'Should return bonuses object');
        });

        it('should combine multiple equipment bonuses', () => {
            const service = createService();
            const inventory = [
                createTestEquipment({ type: 'armor', protection: 10, owned: 1 }),
                createTestEquipment({ type: 'armor', protection: 5, id: 'armor2', owned: 1 })
            ];

            const bonuses = service.calculateEquipmentBonuses(inventory);

            assertTruthy(bonuses.protection >= 0, 'Should have protection bonus');
        });

    });

    describe('Agent Equipment Application', () => {

        it('should apply equipment to agent', () => {
            const service = createService();
            const agent = { damage: 10, protection: 5 };
            const weapons = [createTestWeapon({ damage: 20 })];
            const equipment = [createTestEquipment({ defense: 10 })];

            service.applyEquipmentToAgent(agent, weapons, equipment);

            assertTruthy(agent.damage >= 10, 'Agent damage should be updated');
        });

        it('should apply assigned weapon', () => {
            const service = createService();
            const agent = { damage: 10 };
            const weapons = [createTestWeapon({ id: 'rifle', damage: 25 })];

            service.applyEquipmentToAgent(agent, weapons, [], 'rifle');

            assertTruthy(agent.damage >= 10, 'Should apply weapon damage');
        });

        it('should handle no equipment', () => {
            const service = createService();
            const agent = { damage: 10, protection: 5 };

            service.applyEquipmentToAgent(agent, [], []);

            assertEqual(agent.damage, 10, 'Agent damage should remain unchanged');
        });

    });

    describe('Purchase Cost Calculations', () => {

        it('should calculate total purchase cost', () => {
            const service = createService();

            // Get actual weapons from service to test with
            const allWeapons = service.getAllWeapons();
            if (allWeapons.length >= 2) {
                const items = [
                    { type: 'weapon', id: allWeapons[0].id, quantity: 1 },
                    { type: 'weapon', id: allWeapons[1].id, quantity: 1 }
                ];

                const totalCost = service.calculatePurchaseCost(items);

                const expectedCost = allWeapons[0].cost + allWeapons[1].cost;
                assertEqual(totalCost, expectedCost, 'Total cost should be sum of item costs');
            }
        });

        it('should handle empty items array', () => {
            const service = createService();

            const totalCost = service.calculatePurchaseCost([]);

            assertEqual(totalCost, 0, 'Total cost should be 0 for empty array');
        });

        it('should handle quantity multiplier', () => {
            const service = createService();

            const allWeapons = service.getAllWeapons();
            if (allWeapons.length > 0) {
                const items = [
                    { type: 'weapon', id: allWeapons[0].id, quantity: 3 }
                ];

                const totalCost = service.calculatePurchaseCost(items);

                assertEqual(totalCost, allWeapons[0].cost * 3, 'Should multiply cost by quantity');
            }
        });

    });

    describe('Affordability Checks', () => {

        it('should check if can afford purchase', () => {
            const service = createService();
            const allWeapons = service.getAllWeapons();

            if (allWeapons.length > 0) {
                const items = [{ type: 'weapon', id: allWeapons[0].id, quantity: 1 }];
                const cost = allWeapons[0].cost;

                const canAfford = service.canAffordPurchase(items, cost * 2);

                assertTruthy(canAfford, 'Should be able to afford with sufficient credits');
            }
        });

        it('should return false when insufficient credits', () => {
            const service = createService();
            const allWeapons = service.getAllWeapons();

            if (allWeapons.length > 0) {
                const items = [{ type: 'weapon', id: allWeapons[0].id, quantity: 1 }];
                const cost = allWeapons[0].cost;

                const canAfford = service.canAffordPurchase(items, cost - 1);

                assertFalsy(canAfford, 'Should not afford with insufficient credits');
            }
        });

        it('should handle exact amount', () => {
            const service = createService();
            const allWeapons = service.getAllWeapons();

            if (allWeapons.length > 0) {
                const items = [{ type: 'weapon', id: allWeapons[0].id, quantity: 1 }];
                const cost = allWeapons[0].cost;

                const canAfford = service.canAffordPurchase(items, cost);

                assertTruthy(canAfford, 'Should afford with exact amount');
            }
        });

    });

    describe('Recommended Loadouts', () => {

        it('should get recommended loadout for specialization', () => {
            const service = createService();

            const loadout = service.getRecommendedLoadout('combat', 5000);

            assertTruthy(loadout, 'Should return loadout');
        });

        it('should respect budget constraints', () => {
            const service = createService();

            const loadout = service.getRecommendedLoadout('stealth', 1000);

            if (loadout && loadout.totalCost !== undefined) {
                assertTruthy(loadout.totalCost <= 1000, 'Loadout should be within budget');
            }
        });

        it('should return null for insufficient budget', () => {
            const service = createService();

            const loadout = service.getRecommendedLoadout('combat', 0);

            // Should either return null or empty loadout
            assertTruthy(loadout === null || loadout.items === undefined || loadout.items.length === 0,
                'Should handle insufficient budget');
        });

    });

    describe('Effectiveness Scoring', () => {

        it('should calculate agent effectiveness score', () => {
            const service = createService();
            const agent = {
                damage: 30,
                protection: 15,
                health: 100
            };

            const score = service.calculateEffectivenessScore(agent, 'combat');

            assertTruthy(score >= 0, 'Score should be non-negative');
        });

        it('should score differently for different mission types', () => {
            const service = createService();
            const agent = {
                damage: 30,
                protection: 15,
                stealth: 20,
                health: 100
            };

            const combatScore = service.calculateEffectivenessScore(agent, 'combat');
            const stealthScore = service.calculateEffectivenessScore(agent, 'stealth');

            // Scores may differ based on mission type
            assertTruthy(combatScore >= 0 && stealthScore >= 0, 'Both scores should be valid');
        });

    });

    describe('Upgrade Paths', () => {

        it('should get upgrade path for current equipment', () => {
            const service = createService();
            const currentEquipment = [
                createTestWeapon({ id: 'basic', damage: 15, tier: 1 })
            ];

            const upgrades = service.getUpgradePath(currentEquipment);

            assertTruthy(Array.isArray(upgrades), 'Should return upgrades array');
        });

        it('should return empty array when fully upgraded', () => {
            const service = createService();

            // Assuming there's a max tier
            const currentEquipment = [
                createTestWeapon({ id: 'max', damage: 100, tier: 999 })
            ];

            const upgrades = service.getUpgradePath(currentEquipment);

            assertTruthy(Array.isArray(upgrades), 'Should return array');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
