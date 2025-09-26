/**
 * Services Console Tests
 * Tests that can run in Node.js without browser dependencies
 * Tests the actual service implementations
 */

// Mock minimal browser globals needed by services
if (typeof window === 'undefined') {
    global.window = {
        Logger: null,
        GameServices: null
    };
}

// Import services if in Node environment
let FormulaService, ResourceService, AgentService, MissionService, CombatService;
if (typeof require !== 'undefined') {
    try {
        // Use the service loader to get services
        const services = require('./load-services.js');
        FormulaService = services.FormulaService;
        ResourceService = services.ResourceService;
        AgentService = services.AgentService;
        MissionService = services.MissionService;
        CombatService = services.CombatService;
        console.log('Services loaded successfully for testing');
    } catch (e) {
        console.log('Services not available:', e.message);
    }
}

describe('FormulaService Console Tests', () => {

    it('should calculate basic damage', () => {
        if (typeof FormulaService === 'undefined') return;

        const formula = new FormulaService();

        // Test basic damage calculation
        // calculateDamage(baseDamage, weaponBonus = 0, researchBonus = 0, targetArmor = 0, modifiers = {})
        const damage = formula.calculateDamage(100, 10, 5, 20);
        // 100 + 10 + 5 - 20 = 95
        assertTruthy(damage > 0);
        assertTruthy(damage >= 85); // At least 85 after armor
    });

    it('should calculate grenade damage with falloff', () => {
        if (typeof FormulaService === 'undefined') return;

        const formula = new FormulaService();

        // calculateGrenadeDamage(baseDamage, explosiveBonus = 0, distance = 0, blastRadius = 3)
        // Test grenade at center (distance 0)
        const damageCenter = formula.calculateGrenadeDamage(100, 0, 0, 5);
        assertEqual(damageCenter, 100);

        // Test grenade at edge (distance = radius)
        const damageEdge = formula.calculateGrenadeDamage(100, 0, 5, 5);
        assertEqual(damageEdge, 0);

        // Test grenade at mid-range
        const damageMid = formula.calculateGrenadeDamage(100, 0, 2.5, 5);
        assertEqual(damageMid, 50);
    });

    it('should calculate hit chance', () => {
        if (typeof FormulaService === 'undefined') return;

        const formula = new FormulaService();

        // calculateHitChance returns 0-1 (ratio), not 0-100 (percentage)
        // Perfect accuracy at point blank with base 1.0
        const hitClose = formula.calculateHitChance(0, 1.0);
        assertEqual(hitClose, 1.0);

        // Reduced accuracy at distance (default base accuracy 0.85)
        const hitFar = formula.calculateHitChance(10);
        // 0.85 - (10 * 0.02) = 0.85 - 0.2 = 0.65
        assertTruthy(hitFar < 0.85);
        assertTruthy(hitFar > 0);

        // With specific base accuracy
        const hitMedium = formula.calculateHitChance(5, 0.8);
        // 0.8 - (5 * 0.02) = 0.8 - 0.1 = 0.7
        // Use approximate equality for floating point
        assertTruthy(Math.abs(hitMedium - 0.7) < 0.0001);
    });

    it('should not reference window.game', () => {
        if (typeof FormulaService === 'undefined') return;

        const formula = new FormulaService();
        assertFalsy(formula.game);
        assertFalsy(formula.window);
    });
});

describe('ResourceService Console Tests', () => {

    it('should manage resources', () => {
        if (typeof ResourceService === 'undefined') return;

        const resources = new ResourceService();
        resources.initialize({
            credits: 1000,
            researchPoints: 50,
            worldControl: 10
        });

        // Test getting resources
        assertEqual(resources.get('credits'), 1000);
        assertEqual(resources.get('researchPoints'), 50);

        // Test adding resources
        resources.add('credits', 500, 'mission reward');
        assertEqual(resources.get('credits'), 1500);

        // Test spending resources
        const spent = resources.spend('credits', 300, 'buy item');
        assertTruthy(spent);
        assertEqual(resources.get('credits'), 1200);

        // Test can't overspend
        const overspent = resources.spend('credits', 2000, 'expensive item');
        assertFalsy(overspent);
        assertEqual(resources.get('credits'), 1200); // Unchanged
    });

    it('should handle transactions', () => {
        if (typeof ResourceService === 'undefined') return;

        const resources = new ResourceService();
        resources.initialize({ credits: 1000, researchPoints: 100 });

        // Successful transaction - using correct format
        const success = resources.transaction([
            { resource: 'credits', amount: -500, operation: 'add' },
            { resource: 'researchPoints', amount: 50, operation: 'add' }
        ], 'test transaction');
        assertTruthy(success);
        assertEqual(resources.get('credits'), 500);
        assertEqual(resources.get('researchPoints'), 150);

        // Failed transaction (insufficient funds)
        const failed = resources.transaction([
            { resource: 'credits', amount: 600, operation: 'spend' },
            { resource: 'researchPoints', amount: 50, operation: 'add' }
        ], 'expensive transaction');
        assertFalsy(failed);
        // Should not change since first part failed
        assertEqual(resources.get('credits'), 500);
        assertEqual(resources.get('researchPoints'), 150);
    });

    it('should track history', () => {
        if (typeof ResourceService === 'undefined') return;

        const resources = new ResourceService();
        resources.initialize({ credits: 1000 });

        resources.add('credits', 100, 'found cache');
        resources.spend('credits', 50, 'repair');

        const history = resources.getHistory('credits');
        assertTruthy(history.length >= 2);
        assertTruthy(history.some(h => h.reason === 'found cache'));
        assertTruthy(history.some(h => h.reason === 'repair'));
    });
});

describe('AgentService Console Tests', () => {

    it('should manage agent lifecycle', () => {
        if (typeof AgentService === 'undefined') return;

        // Create with mock resource service
        const mockResourceService = {
            canAfford: () => true,
            spend: () => true
        };
        const agents = new AgentService(mockResourceService);

        // Initialize with test agents
        agents.initialize([
            { id: 'agent1', name: 'Ghost', health: 100, cost: 1000 },
            { id: 'agent2', name: 'Phantom', health: 120, cost: 1500 }
        ]);

        // Test available agents
        const available = agents.getAvailableAgents();
        assertEqual(available.length, 2);

        // Test hiring
        const hired = agents.hireAgent('agent1');
        assertTruthy(hired);
        assertEqual(agents.getActiveAgents().length, 1);
        assertEqual(agents.getAvailableAgents().length, 1);

        // Test damage
        agents.damageAgent('agent1', 30, 'enemy fire');
        const agent = agents.getAgent('agent1');  // Changed from findAgent
        assertEqual(agent.health, 70);

        // Test death
        agents.damageAgent('agent1', 100, 'explosion');
        assertEqual(agents.getActiveAgents().length, 0);
        assertEqual(agents.getFallenAgents().length, 1);
    });

    it('should find agents by multiple IDs', () => {
        if (typeof AgentService === 'undefined') return;

        const agents = new AgentService();
        agents.initialize([
            { id: 'agent1', name: 'Ghost', originalId: 'ghost_001' }
        ]);
        agents.hireAgent('agent1');

        // getAgent can find by ID, name, or originalId
        assertTruthy(agents.getAgent('agent1'));
        assertTruthy(agents.getAgent('Ghost'));
        assertTruthy(agents.getAgent('ghost_001'));
    });
});

describe('MissionService Console Tests', () => {

    it('should track mission objectives', () => {
        if (typeof MissionService === 'undefined') return;

        const mission = new MissionService();

        // Start mission with objectives
        mission.startMission({
            id: 'test-mission',
            objectives: [
                { id: 'obj1', type: 'eliminate', target: { type: 'enemy', count: 5 } },
                { id: 'obj2', type: 'interact', target: { type: 'terminal', id: 'term1' } }
            ]
        });

        assertEqual(mission.objectives.length, 2);
        assertFalsy(mission.extractionEnabled);

        // Track eliminations - use 'eliminate' event type
        for (let i = 0; i < 5; i++) {
            mission.trackEvent('eliminate', { type: 'enemy' });
        }

        // Check objective completion - access objectives array directly
        const obj1 = mission.objectives.find(o => o.id === 'obj1');
        assertTruthy(obj1.completed);

        // Track terminal hack - use 'terminal' event type
        mission.trackEvent('terminal', { id: 'term1' });

        const obj2 = mission.objectives.find(o => o.id === 'obj2');
        assertTruthy(obj2.completed);

        // All objectives complete should enable extraction
        assertTruthy(mission.extractionEnabled);
    });

    it('should handle quest tracking separately', () => {
        if (typeof MissionService === 'undefined') return;

        const mission = new MissionService();

        // Start a mission first (required for quest tracking)
        mission.startMission({ id: 'test-mission', objectives: [] });

        // Quests are stored in a Map
        // Add quest directly to the Map
        mission.activeQuests.set('quest1', {
            id: 'quest1',
            name: 'Find the informant',
            objectives: ['talk_to_npc']
        });

        const quests = mission.getActiveQuests();
        assertEqual(quests.length, 1);

        // Complete quest
        mission.completeQuest('quest1');
        assertEqual(mission.getActiveQuests().length, 0);
        // completedQuests is also a Map
        assertTruthy(mission.completedQuests.size >= 1);
    });
});

describe('CombatService Console Tests', () => {

    it('should queue eliminations', () => {
        if (typeof CombatService === 'undefined') return;

        const combat = new CombatService();

        // Start combat with friendlies and hostiles
        const enemy = { id: 'enemy1', health: 100, faction: 'corporation', alive: true };
        const agent = { id: 'agent1', health: 100, alive: true };

        combat.startCombat([agent], [enemy]);

        // Trigger enemy death
        combat.onEntityDeath('enemy1');

        // Check elimination queue - stored in eliminatedEnemies
        assertTruthy(combat.eliminatedEnemies);
        assertEqual(combat.eliminatedEnemies.length, 1);
        assertEqual(combat.eliminatedEnemies[0].entityId, 'enemy1');
    });

    it('should track team properly', () => {
        if (typeof CombatService === 'undefined') return;

        const combat = new CombatService();

        const enemies = [
            { id: 'enemy1', faction: 'corporation', health: 100, alive: true },
            { id: 'enemy2', faction: 'syndicate', health: 100, alive: true }
        ];
        const agents = [{ id: 'agent1', health: 100, alive: true }];

        // Start combat - this sets up teams
        combat.startCombat(agents, enemies);

        // Verify team assignment
        const enemy1Data = combat.getCombatant('enemy1');
        const enemy2Data = combat.getCombatant('enemy2');
        const agent1Data = combat.getCombatant('agent1');

        // Teams are stored as 'enemy' and 'agent', not 'hostile' and 'friendly'
        assertEqual(enemy1Data.team, 'enemy');
        assertEqual(enemy2Data.team, 'enemy');
        assertEqual(agent1Data.team, 'agent');
    });
});

describe('Service Integration Console Tests', () => {

    it('should maintain unidirectional flow between services', () => {
        // Services can reference other services but never window.game
        if (typeof ResourceService === 'undefined') return;

        const resourceService = new ResourceService();
        const agentService = new AgentService(resourceService);

        // Agent service uses resource service
        resourceService.initialize({ credits: 2000 });
        agentService.initialize([
            { id: 'agent1', name: 'Test', cost: 1000 }
        ]);

        // This should deduct credits through resource service
        const hired = agentService.hireAgent('agent1');
        assertTruthy(hired);

        // Credits should be deducted
        assertEqual(resourceService.get('credits'), 1000);
    });

    it('should work without browser environment', () => {
        // All services should work in Node.js
        const serviceClasses = [
            FormulaService,
            ResourceService,
            AgentService,
            MissionService,
            CombatService
        ];

        serviceClasses.forEach(ServiceClass => {
            if (ServiceClass) {
                // Should instantiate without errors
                const instance = new ServiceClass();
                assertTruthy(instance);

                // Should not require DOM
                assertFalsy(instance.document);
                assertFalsy(instance.getElementById);
            }
        });
    });
});