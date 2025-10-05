/**
 * Campaign Comprehensive Tests
 * Tests EVERY agent, weapon, armor, and enemy from campaign configuration
 * Validates that all campaign content has valid data and works correctly
 */

(function() {
// Load campaign config
let campaignConfig = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');

    const contentPath = path.join(__dirname, '../campaigns/main/campaign-content.js');
    const configPath = path.join(__dirname, '../campaigns/main/campaign-config.js');

    const sandbox = {
        window: {
            MAIN_CAMPAIGN_CONTENT: null,
            MAIN_CAMPAIGN_CONFIG: null,
            CampaignSystem: { campaignConfigs: {} }
        },
        console: { log: () => {}, error: console.error, warn: console.warn }
    };
    vm.createContext(sandbox);

    vm.runInContext(fs.readFileSync(contentPath, 'utf8'), sandbox);
    vm.runInContext(fs.readFileSync(configPath, 'utf8'), sandbox);

    campaignConfig = sandbox.window.MAIN_CAMPAIGN_CONFIG;
} else {
    campaignConfig = window.MAIN_CAMPAIGN_CONFIG;
}

describe('Campaign Content Comprehensive Tests', () => {

    describe('All Agents Validation', () => {

        if (!campaignConfig || !campaignConfig.agents) {
            console.log('Skipping agent tests - campaign config not loaded');
            return;
        }

        campaignConfig.agents.forEach(agent => {

            describe(`Agent: ${agent.name} (${agent.id})`, () => {

                it('should have valid core properties', () => {
                    assertTruthy(agent.id, 'Agent must have ID');
                    assertTruthy(agent.name, 'Agent must have name');
                    assertTruthy(agent.class, 'Agent must have class');
                    assertTruthy(agent.specialization, 'Agent must have specialization');
                });

                it('should have valid health stats', () => {
                    assertTruthy(agent.health > 0, `Health ${agent.health} must be > 0`);
                    assertTruthy(agent.health <= 200, `Health ${agent.health} seems too high`);

                    if (agent.maxHealth) {
                        assertEqual(agent.health, agent.maxHealth,
                            'Health should equal maxHealth for starting agents');
                    }
                });

                it('should have valid combat stats', () => {
                    assertTruthy(agent.damage >= 0, `Damage ${agent.damage} must be >= 0`);
                    assertTruthy(agent.damage <= 100, `Damage ${agent.damage} seems too high`);

                    assertTruthy(agent.speed > 0, `Speed ${agent.speed} must be > 0`);
                    assertTruthy(agent.speed <= 10, `Speed ${agent.speed} seems too high`);

                    assertTruthy(agent.protection >= 0, `Protection ${agent.protection} must be >= 0`);
                    assertTruthy(agent.protection <= 50, `Protection ${agent.protection} seems too high`);
                });

                it('should have valid cost if hireable', () => {
                    if (agent.cost !== undefined) {
                        assertTruthy(agent.cost >= 0, `Cost ${agent.cost} must be >= 0`);
                        assertTruthy(agent.cost <= 100000, `Cost ${agent.cost} seems unreasonably high`);
                    }
                });

                it('should have valid hire status', () => {
                    assertTruthy(typeof agent.hired === 'boolean',
                        'Hired must be boolean');
                });

                it('should have valid class from RPG config', () => {
                    if (campaignConfig.rpgConfig && campaignConfig.rpgConfig.classes) {
                        const validClasses = Object.keys(campaignConfig.rpgConfig.classes);
                        assertTruthy(validClasses.includes(agent.class),
                            `Class ${agent.class} should be one of: ${validClasses.join(', ')}`);
                    }
                });

            });
        });

    });

    describe('All Weapons Validation', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig || !campaignConfig.rpgConfig.items) {
            console.log('Skipping weapon tests - RPG items not loaded');
            return;
        }

        const weapons = campaignConfig.rpgConfig.items.weapons || {};

        Object.keys(weapons).forEach(weaponId => {
            const weapon = weapons[weaponId];

            describe(`Weapon: ${weapon.name} (${weaponId})`, () => {

                it('should have valid core properties', () => {
                    assertTruthy(weapon.name, 'Weapon must have name');
                    assertTruthy(weapon.cost !== undefined, 'Weapon must have cost');
                });

                it('should have valid damage (flat or nested)', () => {
                    const damage = weapon.stats?.damage || weapon.damage;
                    assertTruthy(damage !== undefined, 'Weapon must have damage');
                    assertTruthy(damage > 0, `Damage ${damage} must be > 0`);
                    assertTruthy(damage <= 200, `Damage ${damage} seems unreasonably high`);
                });

                it('should have valid cost', () => {
                    assertTruthy(weapon.cost >= 0, `Cost ${weapon.cost} must be >= 0`);
                    assertTruthy(weapon.cost <= 100000, `Cost ${weapon.cost} seems unreasonably high`);
                });

                it('should have valid owned count', () => {
                    if (weapon.owned !== undefined) {
                        assertTruthy(weapon.owned >= 0, `Owned ${weapon.owned} must be >= 0`);
                        assertTruthy(weapon.owned <= 100, `Owned ${weapon.owned} seems unreasonably high`);
                    }
                });

                it('should have valid range if specified', () => {
                    const range = weapon.stats?.range || weapon.range;
                    if (range !== undefined) {
                        assertTruthy(range > 0, `Range ${range} must be > 0`);
                        assertTruthy(range <= 50, `Range ${range} seems unreasonably high`);
                    }
                });

            });
        });

    });

    describe('All Armor Validation', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig || !campaignConfig.rpgConfig.items) {
            console.log('Skipping armor tests - RPG items not loaded');
            return;
        }

        const armor = campaignConfig.rpgConfig.items.armor || {};

        Object.keys(armor).forEach(armorId => {
            const item = armor[armorId];

            describe(`Armor: ${item.name} (${armorId})`, () => {

                it('should have valid core properties', () => {
                    assertTruthy(item.name, 'Armor must have name');
                    assertTruthy(item.cost !== undefined, 'Armor must have cost');
                });

                it('should have valid protection', () => {
                    const protection = item.stats?.protection || item.protection || item.defense;
                    assertTruthy(protection !== undefined, 'Armor must have protection/defense');
                    assertTruthy(protection > 0, `Protection ${protection} must be > 0`);
                    assertTruthy(protection <= 100, `Protection ${protection} seems unreasonably high`);
                });

                it('should have valid cost', () => {
                    assertTruthy(item.cost >= 0, `Cost ${item.cost} must be >= 0`);
                    assertTruthy(item.cost <= 100000, `Cost ${item.cost} seems unreasonably high`);
                });

                it('should have valid owned count', () => {
                    if (item.owned !== undefined) {
                        assertTruthy(item.owned >= 0, `Owned ${item.owned} must be >= 0`);
                    }
                });

            });
        });

    });

    describe('All Enemies Validation', () => {

        if (!campaignConfig || !campaignConfig.enemies) {
            console.log('Skipping enemy tests - enemies not loaded');
            return;
        }

        campaignConfig.enemies.forEach(enemy => {

            describe(`Enemy: ${enemy.name} (${enemy.id})`, () => {

                it('should have valid core properties', () => {
                    assertTruthy(enemy.id, 'Enemy must have ID');
                    assertTruthy(enemy.name, 'Enemy must have name');
                    assertTruthy(enemy.type, 'Enemy must have type');
                });

                it('should have valid health', () => {
                    assertTruthy(enemy.health > 0, `Health ${enemy.health} must be > 0`);
                    assertTruthy(enemy.health <= 500, `Health ${enemy.health} seems too high`);
                });

                it('should have valid combat stats', () => {
                    assertTruthy(enemy.damage >= 0, `Damage ${enemy.damage} must be >= 0`);
                    assertTruthy(enemy.damage <= 150, `Damage ${enemy.damage} seems too high`);

                    assertTruthy(enemy.speed > 0, `Speed ${enemy.speed} must be > 0`);
                    assertTruthy(enemy.speed <= 20, `Speed ${enemy.speed} seems too high`);
                });

                it('should have valid AI type', () => {
                    const validAI = ['patrol', 'guard', 'aggressive', 'defensive', 'stationary'];
                    if (enemy.ai) {
                        assertTruthy(validAI.includes(enemy.ai),
                            `AI ${enemy.ai} should be one of: ${validAI.join(', ')}`);
                    }
                });

                it('should have valid detection range if specified', () => {
                    if (enemy.detectionRange !== undefined) {
                        assertTruthy(enemy.detectionRange > 0,
                            `Detection range ${enemy.detectionRange} must be > 0`);
                        assertTruthy(enemy.detectionRange <= 50,
                            `Detection range ${enemy.detectionRange} seems too high`);
                    }
                });

            });
        });

    });

    describe('Item Balance Validation', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig || !campaignConfig.rpgConfig.items) {
            console.log('Skipping balance tests - RPG items not loaded');
            return;
        }

        it('should have balanced damage-to-cost ratios for weapons', () => {
            const weapons = campaignConfig.rpgConfig.items.weapons || {};
            const ratios = [];

            Object.keys(weapons).forEach(id => {
                const weapon = weapons[id];
                const damage = weapon.stats?.damage || weapon.damage || 0;
                const cost = weapon.cost || 1;
                const ratio = damage / cost;

                ratios.push({ id, name: weapon.name, damage, cost, ratio });
            });

            // Check that no weapon is absurdly overpowered
            ratios.forEach(item => {
                assertTruthy(item.ratio <= 0.1,
                    `${item.name}: damage/cost ratio ${item.ratio.toFixed(4)} is too high (>0.1)`);
            });

            // Log for manual review
            console.log('📊 Weapon Balance:');
            ratios.sort((a, b) => b.ratio - a.ratio);
            ratios.slice(0, 5).forEach(item => {
                console.log(`  ${item.name}: ${item.damage} dmg / ${item.cost} = ${item.ratio.toFixed(4)}`);
            });
        });

        it('should have balanced protection-to-cost ratios for armor', () => {
            const armor = campaignConfig.rpgConfig.items.armor || {};
            const ratios = [];

            Object.keys(armor).forEach(id => {
                const item = armor[id];
                const protection = item.stats?.protection || item.protection || item.defense || 0;
                const cost = item.cost || 1;
                const ratio = protection / cost;

                ratios.push({ id, name: item.name, protection, cost, ratio });
            });

            // Check balance
            ratios.forEach(item => {
                assertTruthy(item.ratio <= 0.1,
                    `${item.name}: protection/cost ratio ${item.ratio.toFixed(4)} is too high (>0.1)`);
            });
        });

    });

    describe('Starting Inventory Validation', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig || !campaignConfig.rpgConfig.items) {
            console.log('Skipping starting inventory tests');
            return;
        }

        it('should have at least one starting weapon', () => {
            const weapons = campaignConfig.rpgConfig.items.weapons || {};
            const startingWeapons = Object.values(weapons).filter(w => (w.owned || 0) > 0);

            assertTruthy(startingWeapons.length > 0,
                'Player should start with at least one weapon');
        });

        it('should not start with overpowered items', () => {
            const weapons = campaignConfig.rpgConfig.items.weapons || {};

            Object.values(weapons).forEach(weapon => {
                if ((weapon.owned || 0) > 0) {
                    const damage = weapon.stats?.damage || weapon.damage || 0;
                    assertTruthy(damage <= 30,
                        `Starting weapon ${weapon.name} has damage ${damage} which seems too high`);
                }
            });
        });

        it('should have balanced starting resources', () => {
            if (campaignConfig.startingResources) {
                const credits = campaignConfig.startingResources.credits;
                const research = campaignConfig.startingResources.researchPoints;

                assertTruthy(credits >= 0, 'Starting credits must be >= 0');
                assertTruthy(credits <= 100000, `Starting credits ${credits} seems too high`);

                assertTruthy(research >= 0, 'Starting research points must be >= 0');
                assertTruthy(research <= 1000, `Starting research ${research} seems too high`);
            }
        });

    });

    describe('RPG Class Validation', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig || !campaignConfig.rpgConfig.classes) {
            console.log('Skipping class validation');
            return;
        }

        const classes = campaignConfig.rpgConfig.classes;

        Object.keys(classes).forEach(classId => {
            const classData = classes[classId];

            describe(`Class: ${classData.name} (${classId})`, () => {

                it('should have valid configuration', () => {
                    assertTruthy(classData.name, 'Class must have name');
                    assertTruthy(classData.description, 'Class must have description');
                    assertTruthy(classData.baseStats, 'Class must have baseStats');
                });

                it('should have valid base stats', () => {
                    const stats = classData.baseStats;
                    const statNames = ['strength', 'agility', 'intelligence', 'endurance', 'tech', 'charisma'];

                    statNames.forEach(statName => {
                        if (stats[statName] !== undefined) {
                            assertTruthy(stats[statName] >= 1,
                                `${statName} ${stats[statName]} must be >= 1`);
                            assertTruthy(stats[statName] <= 20,
                                `${statName} ${stats[statName]} seems too high`);
                        }
                    });
                });

                it('should have balanced stat total', () => {
                    const stats = classData.baseStats;
                    const total = (stats.strength || 0) +
                                (stats.agility || 0) +
                                (stats.intelligence || 0) +
                                (stats.endurance || 0) +
                                (stats.tech || 0) +
                                (stats.charisma || 0);

                    assertTruthy(total >= 30, `Stat total ${total} seems too low`);
                    assertTruthy(total <= 90, `Stat total ${total} seems too high`);
                });

            });
        });

    });

});

})(); // End IIFE

console.log('📊 Campaign Comprehensive Tests loaded - validates all agents, weapons, armor, enemies');
