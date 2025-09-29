/**
 * Skill-Combat Integration Test
 *
 * Tests that skills learned via RPGManager properly affect combat calculations
 * through FormulaService.
 */

// Import test framework
const TestFramework = require('../js/test-framework.js');
const { describe, it, assertEqual, assertTruthy } = TestFramework;

describe('Skill-Combat Integration', () => {
    let game;
    let agent;
    let enemy;

    beforeEach(() => {
        // Mock minimal game environment
        game = {
            logger: {
                debug: () => {},
                info: () => {},
                warn: () => {},
                error: () => {}
            },
            rpgManager: {
                entities: new Map(),
                config: {
                    skills: {
                        'marksmanship': {
                            id: 'marksmanship',
                            name: 'Marksmanship',
                            category: 'combat',
                            description: 'Improved weapon accuracy',
                            effect: 'damage',
                            perLevel: 5,
                            maxLevel: 5
                        },
                        'heavy_weapons': {
                            id: 'heavy_weapons',
                            name: 'Heavy Weapons',
                            category: 'combat',
                            description: 'Increased damage with heavy weapons',
                            effect: 'damage',
                            perLevel: 10,
                            maxLevel: 3
                        }
                    }
                },
                learnSkill: function(entityId, skillId) {
                    const entity = this.entities.get(entityId);
                    if (!entity || entity.unspentSkillPoints <= 0) return false;

                    const skillConfig = this.config.skills[skillId];
                    if (!skillConfig) return false;

                    const currentLevel = entity.skills[skillId] || 0;
                    if (currentLevel >= skillConfig.maxLevel) return false;

                    entity.skills[skillId] = currentLevel + 1;
                    entity.unspentSkillPoints--;
                    return true;
                }
            },
            gameServices: {
                formulaService: {
                    calculateDamage: function(baseDamage, weaponDamage, damageBonus, protection) {
                        const totalDamage = baseDamage + weaponDamage + damageBonus;
                        const finalDamage = Math.max(1, totalDamage - protection);
                        return finalDamage;
                    }
                }
            },
            applySkillEffects: function(agent, skillId, skillConfig) {
                const skillLevel = agent.rpgEntity.skills[skillId] || 0;
                if (skillLevel === 0) return;

                const perLevel = skillConfig.perLevel || 1;

                switch (skillConfig.effect) {
                    case 'damage':
                        agent.damageBonus = (agent.damageBonus || 0) + perLevel;
                        break;
                    case 'accuracy':
                        agent.accuracyBonus = (agent.accuracyBonus || 0) + perLevel;
                        break;
                    case 'defense':
                        agent.defenseBonus = (agent.defenseBonus || 0) + perLevel;
                        break;
                }
            },
            learnSkill: function(agentId, skillId) {
                const agent = this.agents.find(a => a.id === agentId);
                if (!agent || !agent.rpgEntity) return false;

                const entityId = agent.originalId || agent.id || agent.name;
                const success = this.rpgManager.learnSkill(entityId, skillId);

                if (success) {
                    const skillConfig = this.rpgManager.config.skills[skillId];
                    if (skillConfig) {
                        this.applySkillEffects(agent, skillId, skillConfig);
                    }
                }

                return success;
            },
            agents: []
        };

        // Create test agent with RPG entity
        agent = {
            id: 'test_agent',
            originalId: 'test_agent',
            name: 'Test Agent',
            damage: 20,
            damageBonus: 0,
            accuracyBonus: 0,
            defenseBonus: 0,
            rpgEntity: {
                id: 'test_agent',
                skills: {},
                unspentSkillPoints: 5
            }
        };

        game.agents.push(agent);
        game.rpgManager.entities.set('test_agent', agent.rpgEntity);

        // Create test enemy
        enemy = {
            id: 'test_enemy',
            name: 'Test Enemy',
            protection: 5
        };
    });

    it('should calculate base damage without skills', () => {
        const baseDamage = agent.damage; // 20
        const weaponDamage = 0;
        const damageBonus = agent.damageBonus; // 0
        const protection = enemy.protection; // 5

        const finalDamage = game.gameServices.formulaService.calculateDamage(
            baseDamage,
            weaponDamage,
            damageBonus,
            protection
        );

        // 20 + 0 + 0 - 5 = 15
        assertEqual(finalDamage, 15, 'Base damage should be 15 without skills');
    });

    it('should increase damage after learning marksmanship', () => {
        // Learn marksmanship skill (should add +5 damage per level)
        const success = game.learnSkill('test_agent', 'marksmanship');
        assertTruthy(success, 'Should successfully learn marksmanship skill');

        // Verify skill was learned
        assertEqual(agent.rpgEntity.skills.marksmanship, 1, 'Marksmanship should be level 1');
        assertEqual(agent.damageBonus, 5, 'Agent should have +5 damage bonus');

        // Calculate new damage
        const finalDamage = game.gameServices.formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 5 - 5 = 20
        assertEqual(finalDamage, 20, 'Damage should be 20 with marksmanship level 1');
    });

    it('should stack damage bonuses from multiple skill levels', () => {
        // Learn marksmanship 3 times
        game.learnSkill('test_agent', 'marksmanship'); // Level 1: +5
        game.learnSkill('test_agent', 'marksmanship'); // Level 2: +5
        game.learnSkill('test_agent', 'marksmanship'); // Level 3: +5

        assertEqual(agent.rpgEntity.skills.marksmanship, 3, 'Marksmanship should be level 3');
        assertEqual(agent.damageBonus, 15, 'Agent should have +15 damage bonus');

        const finalDamage = game.gameServices.formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 15 - 5 = 30
        assertEqual(finalDamage, 30, 'Damage should be 30 with marksmanship level 3');
    });

    it('should stack bonuses from different skills', () => {
        // Learn marksmanship (combat skill, +5 damage)
        game.learnSkill('test_agent', 'marksmanship');

        // Learn heavy weapons (combat skill, +10 damage)
        game.learnSkill('test_agent', 'heavy_weapons');

        assertEqual(agent.rpgEntity.skills.marksmanship, 1, 'Marksmanship should be level 1');
        assertEqual(agent.rpgEntity.skills.heavy_weapons, 1, 'Heavy weapons should be level 1');
        assertEqual(agent.damageBonus, 15, 'Agent should have +15 total damage bonus (5+10)');

        const finalDamage = game.gameServices.formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 15 - 5 = 30
        assertEqual(finalDamage, 30, 'Damage should be 30 with both skills');
    });

    it('should respect unidirectional flow (Game → RPGManager → Entity)', () => {
        const initialSkillPoints = agent.rpgEntity.unspentSkillPoints;

        // Learn skill through game (should call RPGManager)
        const success = game.learnSkill('test_agent', 'marksmanship');

        assertTruthy(success, 'Should successfully learn skill');
        assertEqual(
            agent.rpgEntity.unspentSkillPoints,
            initialSkillPoints - 1,
            'RPG entity skill points should decrease'
        );
        assertEqual(
            agent.rpgEntity.skills.marksmanship,
            1,
            'RPG entity should have skill recorded'
        );
        assertEqual(
            agent.damageBonus,
            5,
            'Agent should have bonus applied'
        );
    });

    it('should prevent learning skills without skill points', () => {
        // Spend all skill points
        agent.rpgEntity.unspentSkillPoints = 0;

        const success = game.learnSkill('test_agent', 'marksmanship');

        assertEqual(success, false, 'Should fail to learn skill without points');
        assertEqual(agent.rpgEntity.skills.marksmanship || 0, 0, 'Skill level should remain 0');
        assertEqual(agent.damageBonus, 0, 'Damage bonus should remain 0');
    });

    it('should prevent learning skills beyond max level', () => {
        // Marksmanship has maxLevel: 5
        agent.rpgEntity.unspentSkillPoints = 10;

        // Learn 5 times (should succeed)
        for (let i = 0; i < 5; i++) {
            const success = game.learnSkill('test_agent', 'marksmanship');
            assertTruthy(success, `Should learn level ${i + 1}`);
        }

        // Try to learn 6th time (should fail)
        const failedAttempt = game.learnSkill('test_agent', 'marksmanship');
        assertEqual(failedAttempt, false, 'Should fail to learn beyond max level');
        assertEqual(agent.rpgEntity.skills.marksmanship, 5, 'Skill should cap at level 5');
        assertEqual(agent.damageBonus, 25, 'Damage bonus should cap at +25 (5 * 5)');
    });
});

// Run tests
console.log('==========================================');
console.log('SKILL-COMBAT INTEGRATION TEST');
console.log('==========================================\n');

TestFramework.run();