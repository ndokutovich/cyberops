/**
 * Skill-Combat Integration Tests
 * Tests that skills learned via RPGManager properly affect combat calculations
 * through FormulaService.
 */

describe('Skill-Combat Integration Tests', () => {
    let game;
    let agent;
    let enemy;
    let rpgManager;
    let formulaService;

    beforeEach(() => {
        // Use the global game instance from test runner
        game = window.game;

        // Get services
        rpgManager = game.rpgManager || game.gameServices?.rpgService?.rpgManager;
        formulaService = game.gameServices?.formulaService;

        // Create test agent with RPG entity
        agent = {
            id: 'test_agent_combat',
            originalId: 'test_agent_combat',
            name: 'Test Combat Agent',
            damage: 20,
            damageBonus: 0,
            accuracyBonus: 0,
            defenseBonus: 0,
            rpgEntity: null
        };

        // Create RPG entity for agent if RPGManager available
        if (rpgManager && rpgManager.createRPGAgent) {
            agent.rpgEntity = rpgManager.createRPGAgent(agent, 'soldier');
            agent.rpgEntity.unspentSkillPoints = 5;
            // Store in manager's entities map
            const entityId = agent.originalId || agent.id || agent.name;
            rpgManager.entities.set(entityId, agent.rpgEntity);
        } else {
            // Fallback manual entity
            agent.rpgEntity = {
                id: agent.id,
                skills: {},
                unspentSkillPoints: 5
            };
        }

        // Create test enemy
        enemy = {
            id: 'test_enemy',
            name: 'Test Enemy',
            protection: 5
        };

        // Add agent to game's agents list
        if (!game.agents) game.agents = [];
        game.agents.push(agent);
    });

    afterEach(() => {
        // Clean up test agent
        if (game.agents) {
            const index = game.agents.indexOf(agent);
            if (index > -1) {
                game.agents.splice(index, 1);
            }
        }
        // Clean up from RPGManager
        if (rpgManager && rpgManager.entities) {
            rpgManager.entities.delete('test_agent_combat');
        }
    });

    it('should calculate base damage without skills', () => {
        if (!formulaService) {
            console.log('⏭️ Skipping: FormulaService not available');
            return;
        }

        const finalDamage = formulaService.calculateDamage(
            agent.damage,      // 20
            0,                 // weapon damage
            agent.damageBonus, // 0
            enemy.protection   // 5
        );

        // 20 + 0 + 0 - 5 = 15
        assertEqual(finalDamage, 15, 'Base damage should be 15 without skills');
    });

    it('should increase damage after learning marksmanship', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }
        if (!formulaService) {
            console.log('⏭️ Skipping: FormulaService not available');
            return;
        }

        // Learn marksmanship skill (should add +5 damage per level)
        const success = game.learnSkill(agent.id, 'marksmanship');
        assertTruthy(success, 'Should successfully learn marksmanship skill');

        // Verify skill was learned
        assertEqual(agent.rpgEntity.skills.marksmanship, 1, 'Marksmanship should be level 1');
        assertEqual(agent.damageBonus, 5, 'Agent should have +5 damage bonus');

        // Calculate new damage
        const finalDamage = formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 5 - 5 = 20
        assertEqual(finalDamage, 20, 'Damage should be 20 with marksmanship level 1');
    });

    it('should stack damage bonuses from multiple skill levels', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }
        if (!formulaService) {
            console.log('⏭️ Skipping: FormulaService not available');
            return;
        }

        // Learn marksmanship 3 times
        game.learnSkill(agent.id, 'marksmanship'); // Level 1: +5
        game.learnSkill(agent.id, 'marksmanship'); // Level 2: +5
        game.learnSkill(agent.id, 'marksmanship'); // Level 3: +5

        assertEqual(agent.rpgEntity.skills.marksmanship, 3, 'Marksmanship should be level 3');
        assertEqual(agent.damageBonus, 15, 'Agent should have +15 damage bonus');

        const finalDamage = formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 15 - 5 = 30
        assertEqual(finalDamage, 30, 'Damage should be 30 with marksmanship level 3');
    });

    it('should stack bonuses from different skills', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }
        if (!formulaService) {
            console.log('⏭️ Skipping: FormulaService not available');
            return;
        }

        // Learn marksmanship (combat skill, +5 damage)
        game.learnSkill(agent.id, 'marksmanship');

        // Learn heavy weapons (combat skill, +10 damage)
        game.learnSkill(agent.id, 'heavy_weapons');

        assertEqual(agent.rpgEntity.skills.marksmanship, 1, 'Marksmanship should be level 1');
        assertEqual(agent.rpgEntity.skills.heavy_weapons, 1, 'Heavy weapons should be level 1');
        assertEqual(agent.damageBonus, 15, 'Agent should have +15 total damage bonus (5+10)');

        const finalDamage = formulaService.calculateDamage(
            agent.damage,
            0,
            agent.damageBonus,
            enemy.protection
        );

        // 20 + 0 + 15 - 5 = 30
        assertEqual(finalDamage, 30, 'Damage should be 30 with both skills');
    });

    it('should respect unidirectional flow (Game → RPGManager → Entity)', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }
        if (!rpgManager) {
            console.log('⏭️ Skipping: RPGManager not available');
            return;
        }

        const initialSkillPoints = agent.rpgEntity.unspentSkillPoints;

        // Learn skill through game (should call RPGManager)
        const success = game.learnSkill(agent.id, 'marksmanship');

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
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }

        // Spend all skill points
        agent.rpgEntity.unspentSkillPoints = 0;

        const success = game.learnSkill(agent.id, 'marksmanship');

        assertEqual(success, false, 'Should fail to learn skill without points');
        assertEqual(agent.rpgEntity.skills.marksmanship || 0, 0, 'Skill level should remain 0');
        assertEqual(agent.damageBonus, 0, 'Damage bonus should remain 0');
    });

    it('should prevent learning skills beyond max level', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }

        // Marksmanship has maxLevel: 5
        agent.rpgEntity.unspentSkillPoints = 10;

        // Learn 5 times (should succeed)
        for (let i = 0; i < 5; i++) {
            const success = game.learnSkill(agent.id, 'marksmanship');
            assertTruthy(success, `Should learn level ${i + 1}`);
        }

        // Try to learn 6th time (should fail)
        const failedAttempt = game.learnSkill(agent.id, 'marksmanship');
        assertEqual(failedAttempt, false, 'Should fail to learn beyond max level');
        assertEqual(agent.rpgEntity.skills.marksmanship, 5, 'Skill should cap at level 5');
        assertEqual(agent.damageBonus, 25, 'Damage bonus should cap at +25 (5 * 5)');
    });

    it('should demonstrate real-world combat scenario with multiple skills', () => {
        if (!game.learnSkill) {
            console.log('⏭️ Skipping: learnSkill not available');
            return;
        }
        if (!formulaService) {
            console.log('⏭️ Skipping: FormulaService not available');
            return;
        }

        console.log(`\n  📊 Combat Scenario:`);
        console.log(`  Agent: ${agent.name} (Base damage: ${agent.damage})`);
        console.log(`  Enemy: ${enemy.name} (Protection: ${enemy.protection})`);

        // Initial damage
        let damage = formulaService.calculateDamage(
            agent.damage, 0, agent.damageBonus, enemy.protection
        );
        console.log(`  \n  Initial damage: ${damage}`);
        assertEqual(damage, 15, 'Initial damage should be 15');

        // Learn marksmanship twice
        game.learnSkill(agent.id, 'marksmanship');
        game.learnSkill(agent.id, 'marksmanship');
        damage = formulaService.calculateDamage(
            agent.damage, 0, agent.damageBonus, enemy.protection
        );
        console.log(`  After Marksmanship Lv2 (+10): ${damage}`);
        assertEqual(damage, 25, 'Damage should be 25 after Marksmanship Lv2');

        // Learn heavy weapons
        game.learnSkill(agent.id, 'heavy_weapons');
        damage = formulaService.calculateDamage(
            agent.damage, 0, agent.damageBonus, enemy.protection
        );
        console.log(`  After Heavy Weapons Lv1 (+10): ${damage}`);
        assertEqual(damage, 35, 'Damage should be 35 after Heavy Weapons Lv1');

        console.log(`  \n  Final bonus: +${agent.damageBonus} damage`);
        console.log(`  Skill points remaining: ${agent.rpgEntity.unspentSkillPoints}`);

        // Verify final state
        assertEqual(agent.damageBonus, 20, 'Total damage bonus should be +20');
        assertEqual(damage, 35, 'Final damage should be 35');
    });
});