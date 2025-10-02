/**
 * FormulaService Test Suite
 * Comprehensive tests for all formula calculations
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import FormulaService if in Node.js
if (typeof window === 'undefined') {
    global.FormulaService = require('../js/services/formula-service.js');
    global.Logger = require('../js/services/logger-service.js');
}

describe('FormulaService Tests', () => {

    // Helper function to create FormulaService instance
    function createService() {
        return new FormulaService();
    }

    describe('FormulaService Initialization', () => {

        it('should initialize with correct constants', () => {
            const service = createService();

            assertTruthy(service, 'Service should be created');
            assertTruthy(service.constants, 'Constants should exist');
            assertEqual(service.constants.MIN_DAMAGE, 1, 'MIN_DAMAGE should be 1');
            assertEqual(service.constants.CRITICAL_MULTIPLIER, 1.5, 'CRITICAL_MULTIPLIER should be 1.5');
            assertEqual(service.constants.HEADSHOT_MULTIPLIER, 2.0, 'HEADSHOT_MULTIPLIER should be 2.0');
        });

        it('should have all required constant categories', () => {
            const service = createService();
            const constants = service.constants;

            // Damage constants
            assertTruthy(constants.MIN_DAMAGE !== undefined, 'Should have MIN_DAMAGE');
            assertTruthy(constants.CRITICAL_MULTIPLIER !== undefined, 'Should have CRITICAL_MULTIPLIER');

            // Movement constants
            assertTruthy(constants.BASE_MOVEMENT_COST !== undefined, 'Should have BASE_MOVEMENT_COST');
            assertTruthy(constants.DIAGONAL_MOVEMENT_COST !== undefined, 'Should have DIAGONAL_MOVEMENT_COST');

            // Vision constants
            assertTruthy(constants.BASE_VISION_RANGE !== undefined, 'Should have BASE_VISION_RANGE');

            // Economy constants
            assertTruthy(constants.SELL_BACK_RATIO !== undefined, 'Should have SELL_BACK_RATIO');
        });

    });

    describe('Collectible Effect Calculations', () => {

        it('should calculate credits collectible', () => {
            const service = createService();
            const item = { type: 'credits', value: 100 };
            const agent = { health: 50, maxHealth: 100 };

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.credits, 100, 'Credits should be 100');
            assertTruthy(effects.message.includes('credits'), 'Message should mention credits');
        });

        it('should calculate health pickup with overheal prevention', () => {
            const service = createService();
            const item = { type: 'health', value: 30 };
            const agent = { health: 80, maxHealth: 100 };

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.health, 20, 'Should only heal to max health (20 HP)');
            assertTruthy(effects.message.includes('Healed'), 'Message should indicate healing');
        });

        it('should not heal when health is full', () => {
            const service = createService();
            const item = { type: 'health', value: 30 };
            const agent = { health: 100, maxHealth: 100 };

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.health, 0, 'Should not heal when full');
            assertTruthy(effects.message.includes('already full'), 'Message should indicate full health');
        });

        it('should calculate armor pickup', () => {
            const service = createService();
            const item = { type: 'armor', value: 5 };
            const agent = {};

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.armor, 5, 'Armor should be 5');
            assertTruthy(effects.message.includes('Armor'), 'Message should mention armor');
        });

        it('should convert intel to research points', () => {
            const service = createService();
            const item = { type: 'intel', value: 20 };
            const agent = {};

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.researchPoints, 10, 'Intel should convert to 10 research points (50% ratio)');
            assertTruthy(effects.message.includes('intel'), 'Message should mention intel');
        });

        it('should calculate ammo pickup', () => {
            const service = createService();
            const item = { type: 'ammo', value: 30 };
            const agent = {};

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.ammo, 30, 'Ammo should be 30');
        });

        it('should calculate explosives pickup', () => {
            const service = createService();
            const item = { type: 'explosives', value: 2 };
            const agent = {};

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.explosives, 2, 'Explosives should be 2');
        });

        it('should handle keycard pickup', () => {
            const service = createService();
            const item = { type: 'keycard', color: 'red' };
            const agent = {};

            const effects = service.calculateCollectibleEffect(item, agent);

            assertEqual(effects.keycard, 'red', 'Keycard color should be red');
            assertTruthy(effects.message.includes('keycard'), 'Message should mention keycard');
        });

    });

    describe('Damage Calculations', () => {

        it('should calculate basic damage', () => {
            const service = createService();

            const damage = service.calculateDamage(20, 10, 5, 0);

            assertEqual(damage, 35, 'Damage should be 20 + 10 + 5 = 35');
        });

        it('should apply critical hit multiplier', () => {
            const service = createService();

            const damage = service.calculateDamage(20, 0, 0, 0, { critical: true });

            assertEqual(damage, 30, 'Critical damage should be 20 * 1.5 = 30');
        });

        it('should apply headshot multiplier', () => {
            const service = createService();

            const damage = service.calculateDamage(20, 0, 0, 0, { headshot: true });

            assertEqual(damage, 40, 'Headshot damage should be 20 * 2.0 = 40');
        });

        it('should apply cover reduction', () => {
            const service = createService();

            const damage = service.calculateDamage(20, 0, 0, 0, { cover: true });

            assertEqual(damage, 10, 'Cover damage should be 20 * 0.5 = 10');
        });

        it('should reduce damage by armor', () => {
            const service = createService();

            const damage = service.calculateDamage(30, 0, 0, 10);

            assertEqual(damage, 20, 'Armor should reduce damage by 10');
        });

        it('should enforce minimum damage', () => {
            const service = createService();

            const damage = service.calculateDamage(5, 0, 0, 100);

            assertEqual(damage, 1, 'Minimum damage should be 1');
        });

        it('should combine all modifiers', () => {
            const service = createService();

            // 20 base + 10 weapon + 5 research = 35
            // Critical: 35 * 1.5 = 52.5
            // Headshot: 52.5 * 2.0 = 105
            // Armor: 105 - 5 = 100
            const damage = service.calculateDamage(20, 10, 5, 5, {
                critical: true,
                headshot: true
            });

            assertEqual(damage, 100, 'Combined modifiers should result in 100 damage');
        });

    });

    describe('Grenade Damage Calculations', () => {

        it('should calculate direct hit damage', () => {
            const service = createService();

            const damage = service.calculateGrenadeDamage(50, 10, 0, 3);

            assertEqual(damage, 60, 'Direct hit should deal full damage (50 + 10)');
        });

        it('should apply falloff at distance', () => {
            const service = createService();

            const damage = service.calculateGrenadeDamage(60, 0, 1.5, 3);

            // Falloff: 1 - (1.5 / 3) = 0.5
            // Damage: 60 * 0.5 = 30
            assertEqual(damage, 30, 'Damage at 1.5 tiles should be 50% (30)');
        });

        it('should deal zero damage outside blast radius', () => {
            const service = createService();

            const damage = service.calculateGrenadeDamage(50, 0, 4, 3);

            assertEqual(damage, 0, 'Damage outside blast radius should be 0');
        });

        it('should calculate damage at edge of blast radius', () => {
            const service = createService();

            const damage = service.calculateGrenadeDamage(60, 0, 3, 3);

            assertEqual(damage, 0, 'Damage at exact blast radius should be 0');
        });

    });

    describe('Economy Calculations', () => {

        it('should calculate sell price with condition', () => {
            const service = createService();
            const item = { cost: 1000 };

            const sellPrice = service.calculateSellPrice(item, 1.0);

            // 1000 * 0.6 * 1.0 = 600
            assertEqual(sellPrice, 600, 'Perfect condition should sell for 60% (600)');
        });

        it('should reduce sell price for damaged items', () => {
            const service = createService();
            const item = { cost: 1000 };

            const sellPrice = service.calculateSellPrice(item, 0.5);

            // 1000 * 0.6 * 0.5 = 300
            assertEqual(sellPrice, 300, 'Damaged item should sell for 30% (300)');
        });

        it('should enforce minimum sell value', () => {
            const service = createService();
            const item = { cost: 10 };

            const sellPrice = service.calculateSellPrice(item, 0.1);

            assertEqual(sellPrice, 50, 'Should enforce minimum sell value of 50');
        });

        it('should calculate upkeep costs', () => {
            const service = createService();

            const upkeep = service.calculateUpkeep(4, 1);

            // 4 agents * 100 = 400
            assertEqual(upkeep, 400, 'Base upkeep should be 400 for 4 agents');
        });

        it('should increase upkeep with difficulty', () => {
            const service = createService();

            const upkeep = service.calculateUpkeep(4, 3);

            // 4 * 100 = 400
            // Multiplier: 1 + (3-1)*0.2 = 1.4
            // 400 * 1.4 = 560
            assertEqual(upkeep, 560, 'Difficulty 3 should increase upkeep to 560');
        });

        it('should calculate repair costs', () => {
            const service = createService();
            const item = { cost: 1000 };

            const repairCost = service.calculateRepairCost(item, 0.5);

            // 1000 * 0.3 * 0.5 = 150
            assertEqual(repairCost, 150, 'Repair cost should be 150 for 50% damage');
        });

    });

    describe('Vision Calculations', () => {

        it('should calculate base vision range', () => {
            const service = createService();

            const range = service.calculateVisionRange();

            assertEqual(range, 8, 'Base vision should be 8');
        });

        it('should apply ghost vision bonus', () => {
            const service = createService();

            const range = service.calculateVisionRange(8, true);

            assertEqual(range, 12, 'Ghost vision should be 8 * 1.5 = 12');
        });

        it('should apply fog modifier', () => {
            const service = createService();

            const range = service.calculateVisionRange(8, false, 0.5);

            assertEqual(range, 4, 'Fog should reduce vision to 4');
        });

        it('should enforce minimum vision range', () => {
            const service = createService();

            const range = service.calculateVisionRange(10, false, 0.1);

            // 10 * 0.1 = 1 (floored)
            assertEqual(range, 1, 'Vision with 0.1 fog should be 1');
        });

    });

    describe('Detection Range Calculations', () => {

        it('should calculate base detection range', () => {
            const service = createService();

            const range = service.calculateDetectionRange();

            assertEqual(range, 5, 'Base detection should be 5');
        });

        it('should reduce detection with stealth bonus', () => {
            const service = createService();

            // stealthBonus is a percentage
            // 5 - (5 * 0.4) = 5 - 2 = 3
            const range = service.calculateDetectionRange(5, 40, 0);

            assertEqual(range, 3, 'Stealth bonus 40% should reduce detection by 2');
        });

        it('should increase detection with alert level', () => {
            const service = createService();

            // alertBonus = (alertLevel / 100) * 2
            // (100 / 100) * 2 = 2
            // 5 + 2 = 7
            const range = service.calculateDetectionRange(5, 0, 100);

            assertEqual(range, 7, 'Alert level 100 should increase detection by 2');
        });

        it('should enforce minimum detection range', () => {
            const service = createService();

            // 100% stealth should reduce to minimum
            const range = service.calculateDetectionRange(5, 100, 0);

            assertEqual(range, 2, 'Minimum detection should be 2 (MIN_VISION_RANGE)');
        });

    });

    describe('Movement Calculations', () => {

        it('should calculate horizontal movement cost', () => {
            const service = createService();

            const cost = service.calculateMovementCost(0, 0, 3, 0);

            // Straight movement returns BASE_MOVEMENT_COST * terrain = 1 * 1 = 1
            assertEqual(cost, 1, 'Horizontal movement should cost 1');
        });

        it('should calculate vertical movement cost', () => {
            const service = createService();

            const cost = service.calculateMovementCost(0, 0, 0, 3);

            // Straight movement returns BASE_MOVEMENT_COST * terrain = 1 * 1 = 1
            assertEqual(cost, 1, 'Vertical movement should cost 1');
        });

        it('should calculate diagonal movement cost', () => {
            const service = createService();

            const cost = service.calculateMovementCost(0, 0, 3, 3);

            // Diagonal movement returns DIAGONAL_MOVEMENT_COST * terrain = 1.414 * 1 = 1.414
            assertEqual(cost, 1.414, 'Diagonal movement should cost 1.414');
        });

        it('should apply terrain modifier', () => {
            const service = createService();

            const cost = service.calculateMovementCost(0, 0, 2, 0, 2.0);

            // Straight movement: BASE_MOVEMENT_COST * terrain = 1 * 2.0 = 2
            assertEqual(cost, 2, 'Difficult terrain should double cost to 2');
        });

    });

    describe('Hit Chance Calculations', () => {

        it('should calculate base hit chance', () => {
            const service = createService();

            const chance = service.calculateHitChance(0);

            assertEqual(chance, 0.85, 'Base hit chance should be 85%');
        });

        it('should reduce hit chance with distance', () => {
            const service = createService();

            const chance = service.calculateHitChance(5);

            // 0.85 - (5 * 0.02) = 0.75
            assertEqual(chance, 0.75, 'Hit chance at 5 tiles should be 75%');
        });

        it('should apply cover penalty', () => {
            const service = createService();

            const chance = service.calculateHitChance(0, null, { cover: true });

            // 0.85 - 0.3 = 0.55
            assertEqual(chance, 0.55, 'Cover should reduce hit chance by 30% (0.3)');
        });

        it('should reduce hit chance at long range', () => {
            const service = createService();

            const chance = service.calculateHitChance(10);

            // 0.85 - (10 * 0.02) = 0.85 - 0.2 = 0.65
            // Debug: log actual value
            if (chance !== 0.65) {
                console.log('DEBUG: Expected 0.65, got:', chance);
            }
            assertTruthy(Math.abs(chance - 0.65) < 0.01, `Hit chance at 10 tiles should be ~65%, got ${chance}`);
        });

        it('should enforce minimum hit chance of 10%', () => {
            const service = createService();

            const chance = service.calculateHitChance(100);

            // Would be negative, but clamped to min 0.1
            assertEqual(chance, 0.1, 'Minimum hit chance should be 10%');
        });

    });

    describe('Hacking Calculations', () => {

        it('should calculate base hacking range', () => {
            const service = createService();

            const range = service.calculateHackingRange();

            assertEqual(range, 3, 'Base hacking range should be 3');
        });

        it('should apply hack bonus', () => {
            const service = createService();

            const range = service.calculateHackingRange(4, 50, false);

            // 4 + (4 * 0.5) = 4 + 2 = 6
            assertEqual(range, 6, 'Hack bonus 50% should increase range by 2');
        });

        it('should apply research bonus', () => {
            const service = createService();

            const range = service.calculateHackingRange(4, 0, true);

            // 4 + (4 * 0.25) = 4 + 1 = 5
            assertEqual(range, 5, 'Hacking research should increase range by 25%');
        });

        it('should calculate hacking speed', () => {
            const service = createService();

            const speed = service.calculateHackingSpeed(180);

            assertEqual(speed, 180, 'Base hacking speed should be 180 frames');
        });

        it('should reduce hacking time with research', () => {
            const service = createService();

            const speed = service.calculateHackingSpeed(180, 0, true);

            // 180 * 0.75 = 135 (research makes 25% faster, so time is 75%)
            assertEqual(speed, 135, 'Research should reduce hacking time to 75% (135 frames)');
        });

    });

    describe('XP and Progression', () => {

        it('should calculate XP required for level 2', () => {
            const service = createService();

            const xpRequired = service.calculateXPRequired(1);

            assertEqual(xpRequired, 1000, 'Level 2 should require 1000 XP');
        });

        it('should increase XP requirement exponentially', () => {
            const service = createService();

            const level2XP = service.calculateXPRequired(1);
            const level3XP = service.calculateXPRequired(2);

            assertTruthy(level3XP > level2XP, 'Level 3 should require more XP than level 2');
            assertEqual(level3XP, 1500, 'Level 3 should require 1500 XP');
        });

    });

    describe('Shield Calculations', () => {

        it('should fully absorb damage with sufficient shield', () => {
            const service = createService();

            const result = service.calculateShieldAbsorption(30, 50);

            assertEqual(result.healthDamage, 0, 'Shield should absorb all damage');
            assertEqual(result.remainingShield, 20, 'Shield should be reduced by 30');
        });

        it('should pass overflow damage to health', () => {
            const service = createService();

            const result = service.calculateShieldAbsorption(30, 20);

            assertEqual(result.healthDamage, 10, 'Overflow damage should be 10');
            assertEqual(result.remainingShield, 0, 'Shield should be depleted');
        });

        it('should handle no shield', () => {
            const service = createService();

            const result = service.calculateShieldAbsorption(30, 0);

            assertEqual(result.healthDamage, 30, 'All damage should go to health');
            assertEqual(result.remainingShield, 0, 'Shield should remain at 0');
        });

    });

    describe('Healing Calculations', () => {

        it('should calculate healing with percentage', () => {
            const service = createService();

            const healing = service.calculateHealing(100, 0.2, 0);

            assertEqual(healing, 20, 'Should heal 20% of max health');
        });

        it('should add flat healing bonus', () => {
            const service = createService();

            const healing = service.calculateHealing(100, 0.2, 10);

            assertEqual(healing, 30, 'Should heal 20 + 10 = 30');
        });

        it('should calculate medical healing without research', () => {
            const service = createService();

            const healing = service.calculateMedicalHealing(50, 100, false);

            // Returns currentHealth when no research
            assertEqual(healing, 50, 'Should return current health without medical research');
        });

        it('should calculate medical healing with research', () => {
            const service = createService();

            const healing = service.calculateMedicalHealing(50, 100, true);

            // calculateHealing(100, 0.2) = 100 * 0.2 = 20
            // 50 + 20 = 70, capped at 100
            assertEqual(healing, 70, 'Should heal to 70 HP with medical research');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
