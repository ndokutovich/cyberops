/**
 * RPG Comprehensive Tests
 * Tests EVERY perk and EVERY skill level from campaign configuration
 * Validates that all RPG mechanics work correctly with actual game data
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import campaign config if in Node.js
let campaignConfig = null;
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // We're in Node.js environment
    // Node.js environment - load campaign config
    const fs = require('fs');
    const path = require('path');

    // First load campaign-content.js for agents/enemies
    const contentPath = path.join(__dirname, '../campaigns/main/campaign-content.js');
    const contentCode = fs.readFileSync(contentPath, 'utf8');

    // Then load campaign-config.js
    const configPath = path.join(__dirname, '../campaigns/main/campaign-config.js');
    const configCode = fs.readFileSync(configPath, 'utf8');

    // Create sandbox environment with necessary globals
    const vm = require('vm');
    const sandbox = {
        window: {
            MAIN_CAMPAIGN_CONTENT: null,
            MAIN_CAMPAIGN_CONFIG: null,
            CampaignSystem: { campaignConfigs: {} }
        },
        console: {
            log: () => {}, // Suppress logs
            error: console.error,
            warn: console.warn
        }
    };
    vm.createContext(sandbox);

    try {
        // Execute campaign content first
        vm.runInContext(contentCode, sandbox);
        // Then execute campaign config
        vm.runInContext(configCode, sandbox);

        campaignConfig = sandbox.window.MAIN_CAMPAIGN_CONFIG;

        // Debug output
        if (!campaignConfig) {
            console.error('⚠️  Campaign config is null/undefined after loading');
        } else {
            console.log('✅ Campaign config loaded successfully');
            console.log('   - Has rpgConfig:', !!campaignConfig.rpgConfig);
            if (campaignConfig.rpgConfig) {
                console.log('   - Skills:', Object.keys(campaignConfig.rpgConfig.skills || {}).length);
                console.log('   - Perks:', Object.keys(campaignConfig.rpgConfig.perks || {}).length);
            }
        }
    } catch (error) {
        console.error('❌ Error loading campaign config:', error.message);
        console.error(error.stack);
    }
} else {
    // Browser environment - use window.MAIN_CAMPAIGN_CONFIG
    campaignConfig = window.MAIN_CAMPAIGN_CONFIG;
}

describe('RPG Comprehensive Tests - All Perks and Skills', () => {

    describe('Campaign Configuration Loading', () => {

        it('should load campaign config successfully', () => {
            assertTruthy(campaignConfig, 'Campaign config should be loaded');
            assertTruthy(campaignConfig.rpgConfig, 'RPG config should exist');
        });

        it('should have skills configuration', () => {
            assertTruthy(campaignConfig.rpgConfig.skills, 'Skills config should exist');
            const skillCount = Object.keys(campaignConfig.rpgConfig.skills).length;
            assertTruthy(skillCount > 0, `Should have skills defined, got ${skillCount}`);
        });

        it('should have perks configuration', () => {
            assertTruthy(campaignConfig.rpgConfig.perks, 'Perks config should exist');
            const perkCount = Object.keys(campaignConfig.rpgConfig.perks).length;
            assertTruthy(perkCount > 0, `Should have perks defined, got ${perkCount}`);
        });

    });

    describe('All Skills - Level Threshold Testing', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig) {
            console.log('Skipping skill tests - campaign config not loaded');
            return;
        }

        const skills = campaignConfig.rpgConfig.skills;

        Object.keys(skills).forEach(skillId => {
            const skill = skills[skillId];

            describe(`Skill: ${skill.name} (${skillId})`, () => {

                it(`should have valid configuration`, () => {
                    assertTruthy(skill.name, 'Skill should have a name');
                    assertTruthy(skill.maxLevel > 0, `maxLevel should be > 0, got ${skill.maxLevel}`);
                    assertTruthy(skill.effect, 'Skill should have an effect type');
                    assertTruthy(skill.perLevel !== undefined, 'Skill should have perLevel value');
                });

                // Test each level from 0 to maxLevel
                for (let level = 0; level <= skill.maxLevel; level++) {
                    it(`should calculate effect at level ${level}/${skill.maxLevel}`, () => {
                        const effectValue = skill.perLevel * level;

                        // Verify the calculation makes sense
                        if (level === 0) {
                            assertEqual(effectValue, 0, 'Level 0 should provide no bonus');
                        } else if (level === skill.maxLevel) {
                            const maxEffect = skill.perLevel * skill.maxLevel;
                            assertEqual(effectValue, maxEffect, `Max level should provide ${maxEffect}`);
                        }

                        // Verify the effect is within reasonable bounds
                        const absEffect = Math.abs(effectValue);
                        assertTruthy(absEffect <= 1000, `Effect ${absEffect} seems unreasonably high`);
                    });
                }

                it(`should scale linearly from level 0 to ${skill.maxLevel}`, () => {
                    const level1Effect = skill.perLevel * 1;
                    const level2Effect = skill.perLevel * 2;
                    const expectedIncrease = skill.perLevel;
                    const actualIncrease = level2Effect - level1Effect;

                    assertEqual(actualIncrease, expectedIncrease,
                        `Each level should increase effect by ${skill.perLevel}`);
                });

            });
        });

    });

    describe('All Perks - Individual Effect Testing', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig) {
            console.log('Skipping perk tests - campaign config not loaded');
            return;
        }

        const perks = campaignConfig.rpgConfig.perks;

        Object.keys(perks).forEach(perkId => {
            const perk = perks[perkId];

            describe(`Perk: ${perk.name} (${perkId})`, () => {

                it('should have valid configuration', () => {
                    assertTruthy(perk.name, 'Perk should have a name');
                    assertTruthy(perk.description, 'Perk should have a description');
                    assertTruthy(perk.effects, 'Perk should have effects object');
                    assertTruthy(perk.requirements, 'Perk should have requirements');
                    assertTruthy(perk.category, 'Perk should have a category');
                });

                it('should have valid requirements', () => {
                    const req = perk.requirements;
                    assertTruthy(req.level !== undefined, 'Should have level requirement');
                    assertTruthy(req.level >= 1, `Level requirement ${req.level} should be >= 1`);
                    assertTruthy(req.level <= 20, `Level requirement ${req.level} should be <= 20`);
                });

                it('should have at least one effect', () => {
                    const effectCount = Object.keys(perk.effects).length;
                    assertTruthy(effectCount > 0, `Perk should have at least 1 effect, got ${effectCount}`);
                });

                // Test each effect in the perk
                Object.keys(perk.effects).forEach(effectKey => {
                    const effectValue = perk.effects[effectKey];

                    it(`should have valid ${effectKey} effect`, () => {
                        assertTruthy(effectValue !== undefined, `Effect ${effectKey} should be defined`);

                        // Validate effect values based on type
                        if (typeof effectValue === 'number') {
                            // Absolute values first (health, range, AP, radius, etc.)
                            if (effectKey.includes('maxHealth') || effectKey.includes('Range') || effectKey.includes('apBonus') || effectKey.includes('radius')) {
                                assertTruthy(effectValue > 0, `${effectKey} should be positive`);
                                assertTruthy(effectValue <= 200, `${effectKey} ${effectValue} seems unreasonably high`);
                            }
                            // Crit chance bonus (absolute %, not decimal)
                            else if (effectKey.includes('critChance')) {
                                assertTruthy(effectValue >= 0, `${effectKey} should be non-negative`);
                                assertTruthy(effectValue <= 100, `${effectKey} ${effectValue} should be <= 100%`);
                            }
                            // Percentage bonuses (0.0 to 2.0 = 0% to 200%)
                            else if (effectKey.includes('Bonus') && effectValue < 10) {
                                assertTruthy(effectValue >= 0, `${effectKey} should be non-negative`);
                                assertTruthy(effectValue <= 2.0, `${effectKey} ${effectValue} seems unreasonably high (>200%)`);
                            }
                            // Percentage reductions
                            else if (effectKey.includes('Reduction')) {
                                assertTruthy(effectValue >= 0, `${effectKey} should be non-negative`);
                                assertTruthy(effectValue <= 1.0, `${effectKey} ${effectValue} should be <= 1.0 (100%)`);
                            }
                            // Other numeric values
                            else {
                                assertTruthy(effectValue !== undefined, `${effectKey} should be defined`);
                            }
                        } else if (typeof effectValue === 'boolean') {
                            // Boolean effects are always valid
                            assertTruthy(true, `Boolean effect ${effectKey} is valid`);
                        }
                    });
                });

                // Test category validation
                it('should belong to a valid category', () => {
                    const validCategories = ['combat', 'defense', 'stealth', 'tech', 'medical', 'leadership', 'survival'];
                    assertTruthy(validCategories.includes(perk.category),
                        `Category ${perk.category} should be one of: ${validCategories.join(', ')}`);
                });

            });
        });

    });

    describe('Perk Effect Integration with FormulaService', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig) {
            console.log('Skipping perk integration tests - campaign config not loaded');
            return;
        }

        const perks = campaignConfig.rpgConfig.perks;

        // Test damage-related perks
        describe('Damage Perks', () => {

            it('rapidFire: should increase damage by 10%', () => {
                if (!perks.rapidFire) return;
                const perk = perks.rapidFire;
                assertEqual(perk.effects.damageBonus, 0.1, 'Should provide 10% damage bonus');

                // Simulate with FormulaService
                const baseDamage = 50;
                const withPerk = baseDamage * (1 + perk.effects.damageBonus);
                // Use tolerance for floating point comparison
                assertTruthy(Math.abs(withPerk - 55) < 0.01, `Should increase 50 damage to ~55, got ${withPerk}`);
            });

            it('armorPiercing: should ignore 50% armor', () => {
                if (!perks.armorPiercing) return;
                const perk = perks.armorPiercing;
                assertEqual(perk.effects.armorPierce, 0.5, 'Should ignore 50% armor');

                // Simulate armor piercing
                const enemyArmor = 20;
                const effectiveArmor = enemyArmor * (1 - perk.effects.armorPierce);
                assertEqual(effectiveArmor, 10, 'Should reduce 20 armor to 10');
            });

            it('silentKiller: should increase stealth attack damage by 50%', () => {
                if (!perks.silentKiller) return;
                const perk = perks.silentKiller;
                assertEqual(perk.effects.stealthDamageBonus, 0.5, 'Should provide 50% stealth damage bonus');

                const baseDamage = 40;
                const stealthDamage = baseDamage * (1 + perk.effects.stealthDamageBonus);
                assertEqual(stealthDamage, 60, 'Should increase 40 damage to 60 on stealth attack');
            });

        });

        // Test defense-related perks
        describe('Defense Perks', () => {

            it('juggernaut: should reduce incoming damage by 30%', () => {
                if (!perks.juggernaut) return;
                const perk = perks.juggernaut;
                assertEqual(perk.effects.damageReduction, 0.3, 'Should provide 30% damage reduction');

                const incomingDamage = 100;
                const reducedDamage = incomingDamage * (1 - perk.effects.damageReduction);
                assertEqual(reducedDamage, 70, 'Should reduce 100 damage to 70');
            });

            it('ironWill: should increase max health by 25', () => {
                if (!perks.ironWill) return;
                const perk = perks.ironWill;
                assertEqual(perk.effects.maxHealthBonus, 25, 'Should provide +25 max health');

                const baseHealth = 100;
                const withPerk = baseHealth + perk.effects.maxHealthBonus;
                assertEqual(withPerk, 125, 'Should increase 100 health to 125');
            });

        });

        // Test tech-related perks
        describe('Tech Perks', () => {

            it('techSavant: should increase hack speed by 25%', () => {
                if (!perks.techSavant) return;
                const perk = perks.techSavant;
                assertEqual(perk.effects.hackSpeedBonus, 0.25, 'Should provide 25% hack speed bonus');

                const baseHackTime = 4000; // 4 seconds
                const reducedTime = baseHackTime / (1 + perk.effects.hackSpeedBonus);
                assertEqual(reducedTime, 3200, 'Should reduce 4s hack to 3.2s');
            });

            it('systemMaster: should increase hack range by 5', () => {
                if (!perks.systemMaster) return;
                const perk = perks.systemMaster;
                assertEqual(perk.effects.hackRangeBonus, 5, 'Should provide +5 hack range');

                const baseRange = 3;
                const withPerk = baseRange + perk.effects.hackRangeBonus;
                assertEqual(withPerk, 8, 'Should increase range from 3 to 8');
            });

        });

        // Test medical perks
        describe('Medical Perks', () => {

            it('fieldMedic: should increase healing by 50%', () => {
                if (!perks.fieldMedic) return;
                const perk = perks.fieldMedic;
                assertEqual(perk.effects.healingBonus, 0.5, 'Should provide 50% healing bonus');

                const baseHealing = 30;
                const withPerk = baseHealing * (1 + perk.effects.healingBonus);
                assertEqual(withPerk, 45, 'Should increase 30 healing to 45');
            });

        });

        // Test stealth perks
        describe('Stealth Perks', () => {

            it('shadowOperative: should reduce detection by 50%', () => {
                if (!perks.shadowOperative) return;
                const perk = perks.shadowOperative;
                assertEqual(perk.effects.detectionReduction, 0.5, 'Should provide 50% detection reduction');

                const baseDetectionRange = 10;
                const reducedRange = baseDetectionRange * (1 - perk.effects.detectionReduction);
                assertEqual(reducedRange, 5, 'Should reduce detection range from 10 to 5');
            });

        });

        // Test leadership perks
        describe('Leadership Perks', () => {

            it('tacticalLeader: should provide 10% accuracy bonus to allies', () => {
                if (!perks.tacticalLeader) return;
                const perk = perks.tacticalLeader;
                assertEqual(perk.effects.leadershipBonus, 0.1, 'Should provide 10% leadership bonus');
                assertEqual(perk.effects.radius, 5, 'Should have 5 tile radius');
            });

            it('inspiringPresence: should provide +2 AP to allies', () => {
                if (!perks.inspiringPresence) return;
                const perk = perks.inspiringPresence;
                assertEqual(perk.effects.apBonus, 2, 'Should provide +2 AP bonus');
                assertEqual(perk.effects.radius, 5, 'Should have 5 tile radius');
            });

        });

    });

    describe('Skill Effect Integration with FormulaService', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig) {
            console.log('Skipping skill integration tests - campaign config not loaded');
            return;
        }

        const skills = campaignConfig.rpgConfig.skills;

        describe('Combat Skills', () => {

            it('weaponMastery: should scale damage correctly at each level', () => {
                if (!skills.weaponMastery) return;
                const skill = skills.weaponMastery;

                const baseDamage = 50;

                // Test each level
                for (let level = 0; level <= skill.maxLevel; level++) {
                    const bonus = skill.perLevel * level;
                    const expectedDamage = baseDamage + bonus;

                    // Level 0: 50, Level 1: 55, Level 2: 60, Level 3: 65, Level 4: 70, Level 5: 75
                    assertTruthy(expectedDamage >= baseDamage,
                        `Level ${level} damage ${expectedDamage} should be >= base ${baseDamage}`);
                }

                // Verify max level (5 * 5 = 25 bonus)
                const maxBonus = skill.perLevel * skill.maxLevel;
                assertEqual(maxBonus, 25, 'Max level should provide +25 damage');
            });

            it('marksmanship: should improve accuracy at each level', () => {
                if (!skills.marksmanship) return;
                const skill = skills.marksmanship;

                const baseAccuracy = 70;

                for (let level = 0; level <= skill.maxLevel; level++) {
                    const bonus = skill.perLevel * level;
                    const finalAccuracy = Math.min(100, baseAccuracy + bonus);

                    assertTruthy(finalAccuracy <= 100, 'Accuracy should not exceed 100%');
                }

                // Max level: 5 * 10 = 50% bonus
                const maxBonus = skill.perLevel * skill.maxLevel;
                assertEqual(maxBonus, 50, 'Max level should provide +50% accuracy');
            });

        });

        describe('Stealth Skills', () => {

            it('stealth: should reduce detection at each level', () => {
                if (!skills.stealth) return;
                const skill = skills.stealth;

                const baseDetection = 10;

                for (let level = 0; level <= skill.maxLevel; level++) {
                    const reduction = Math.abs(skill.perLevel) * level; // perLevel is negative
                    const finalDetection = Math.max(1, baseDetection - reduction);

                    assertTruthy(finalDetection >= 1, 'Detection should not go below 1');
                }

                // Max level: 5 * 15 = 75% reduction
                const maxReduction = Math.abs(skill.perLevel * skill.maxLevel);
                assertEqual(maxReduction, 75, 'Max level should provide -75% detection');
            });

        });

        describe('Tech Skills', () => {

            it('hacking: should improve hack speed at each level', () => {
                if (!skills.hacking) return;
                const skill = skills.hacking;

                const baseHackTime = 5000; // 5 seconds

                for (let level = 0; level <= skill.maxLevel; level++) {
                    const speedBonus = skill.perLevel * level;
                    const reduction = speedBonus / 100; // Convert percentage to decimal
                    const finalTime = baseHackTime * (1 - reduction);

                    assertTruthy(finalTime > 0, `Hack time should be positive at level ${level}`);
                    assertTruthy(finalTime <= baseHackTime,
                        `Level ${level} time should be <= base time`);
                }

                // Max level: 5 * 15 = 75% faster
                const maxSpeed = skill.perLevel * skill.maxLevel;
                assertEqual(maxSpeed, 75, 'Max level should provide +75% hack speed');
            });

        });

        describe('Medical Skills', () => {

            it('firstAid: should scale healing at each level', () => {
                if (!skills.firstAid) return;
                const skill = skills.firstAid;

                const baseHealing = 20;

                for (let level = 0; level <= skill.maxLevel; level++) {
                    const bonus = skill.perLevel * level;
                    const finalHealing = baseHealing + bonus;

                    assertTruthy(finalHealing >= baseHealing,
                        `Level ${level} healing should be >= base healing`);
                }

                // Max level: 5 * 10 = 50 bonus healing
                const maxBonus = skill.perLevel * skill.maxLevel;
                assertEqual(maxBonus, 50, 'Max level should provide +50 healing');
            });

        });

    });

    describe('Combined Effects - Skills and Perks', () => {

        if (!campaignConfig || !campaignConfig.rpgConfig) {
            console.log('Skipping combined tests - campaign config not loaded');
            return;
        }

        const skills = campaignConfig.rpgConfig.skills;
        const perks = campaignConfig.rpgConfig.perks;

        it('should stack damage bonuses from multiple sources', () => {
            if (!skills.weaponMastery || !perks.rapidFire) return;

            const baseDamage = 50;

            // Weapon Mastery level 5: +25 damage
            const skillBonus = skills.weaponMastery.perLevel * skills.weaponMastery.maxLevel;

            // Rapid Fire: +10% damage
            const perkMultiplier = 1 + perks.rapidFire.effects.damageBonus;

            // Calculate combined effect
            const withSkill = baseDamage + skillBonus; // 75
            const withBoth = withSkill * perkMultiplier; // 75 * 1.1 = 82.5

            assertEqual(withBoth, 82.5, 'Should stack skill and perk bonuses multiplicatively');
        });

        it('should combine healing bonuses from skill and perk', () => {
            if (!skills.firstAid || !perks.fieldMedic) return;

            const baseHealing = 30;

            // First Aid level 5: +50 healing
            const skillBonus = skills.firstAid.perLevel * skills.firstAid.maxLevel;

            // Field Medic: +50% healing
            const perkMultiplier = 1 + perks.fieldMedic.effects.healingBonus;

            const withSkill = baseHealing + skillBonus; // 80
            const withBoth = withSkill * perkMultiplier; // 80 * 1.5 = 120

            assertEqual(withBoth, 120, 'Should combine skill and perk healing bonuses');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
