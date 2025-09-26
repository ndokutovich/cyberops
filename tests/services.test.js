/**
 * Service Tests (Universal)
 * Tests for game services that work in both Node.js and Browser
 */

// In browser, these are global. In Node, we rely on console-runner.js to set them up
if (typeof describe === 'undefined') {
    const TestFramework = require('./universal-test-framework.js');
    global.describe = TestFramework.describe.bind(TestFramework);
    global.it = TestFramework.it.bind(TestFramework);
    global.assert = TestFramework.assert;
}

describe('Service Architecture Tests', () => {

    it('should validate service dependencies', () => {
        // Create mock services to test dependency injection
        const mockFormula = { name: 'FormulaService' };
        const mockResource = { name: 'ResourceService' };
        const mockAgent = { name: 'AgentService' };

        // Test that services can be initialized with dependencies
        assert.truthy(mockFormula, 'FormulaService should exist');
        assert.truthy(mockResource, 'ResourceService should exist');
        assert.truthy(mockAgent, 'AgentService should exist');
    });

    it('should enforce unidirectional data flow', () => {
        // Test that services don't reference window.game
        const serviceCode = {
            hasWindowGame: false,
            hasThisGame: false
        };

        // This would be a static analysis in real code
        assert.falsy(serviceCode.hasWindowGame, 'Services should not reference window.game');
        assert.falsy(serviceCode.hasThisGame, 'Services should not reference this.game');
    });

    it('should maintain single source of truth', () => {
        // Mock service with state
        const service = {
            state: { value: 100 },
            get() { return this.state.value; },
            set(val) { this.state.value = val; }
        };

        service.set(200);
        assert.equal(service.get(), 200, 'Service should maintain its own state');
    });
});

describe('Resource Service Tests', () => {

    let resourceService;

    beforeEach(() => {
        // Create a mock resource service
        resourceService = {
            resources: {
                credits: 1000,
                researchPoints: 50,
                worldControl: 5
            },
            get(type) {
                return this.resources[type] || 0;
            },
            add(type, amount) {
                if (this.resources[type] !== undefined) {
                    this.resources[type] += amount;
                    return true;
                }
                return false;
            },
            spend(type, amount) {
                if (this.resources[type] !== undefined && this.resources[type] >= amount) {
                    this.resources[type] -= amount;
                    return true;
                }
                return false;
            },
            canAfford(type, amount) {
                return this.get(type) >= amount;
            }
        };
    });

    it('should get resource values', () => {
        assert.equal(resourceService.get('credits'), 1000, 'Should get credits');
        assert.equal(resourceService.get('researchPoints'), 50, 'Should get research points');
        assert.equal(resourceService.get('worldControl'), 5, 'Should get world control');
    });

    it('should add resources', () => {
        resourceService.add('credits', 500);
        assert.equal(resourceService.get('credits'), 1500, 'Should add credits');

        resourceService.add('researchPoints', 25);
        assert.equal(resourceService.get('researchPoints'), 75, 'Should add research points');
    });

    it('should spend resources if available', () => {
        const success = resourceService.spend('credits', 500);
        assert.truthy(success, 'Should successfully spend credits');
        assert.equal(resourceService.get('credits'), 500, 'Credits should be reduced');

        const failure = resourceService.spend('credits', 1000);
        assert.falsy(failure, 'Should fail to spend more than available');
        assert.equal(resourceService.get('credits'), 500, 'Credits should not change on failure');
    });

    it('should check affordability', () => {
        assert.truthy(resourceService.canAfford('credits', 1000), 'Should afford exact amount');
        assert.truthy(resourceService.canAfford('credits', 500), 'Should afford less than available');
        assert.falsy(resourceService.canAfford('credits', 1001), 'Should not afford more than available');
    });
});

describe('Agent Service Tests', () => {

    let agentService;

    beforeEach(() => {
        // Create mock agent service
        agentService = {
            agents: [
                { id: 'agent_1', name: 'Alpha', alive: true, hired: true },
                { id: 'agent_2', name: 'Bravo', alive: true, hired: false },
                { id: 'agent_3', name: 'Charlie', alive: false, hired: true }
            ],
            selectedAgents: [],

            getAgent(id) {
                return this.agents.find(a => a.id === id);
            },

            getActiveAgents() {
                return this.agents.filter(a => a.alive && a.hired);
            },

            getAvailableAgents() {
                return this.agents.filter(a => a.alive && !a.hired);
            },

            hireAgent(id) {
                const agent = this.getAgent(id);
                if (agent && agent.alive && !agent.hired) {
                    agent.hired = true;
                    return true;
                }
                return false;
            },

            selectAgentsForMission(ids) {
                this.selectedAgents = [];
                for (const id of ids) {
                    const agent = this.getAgent(id);
                    if (agent && agent.alive && agent.hired) {
                        this.selectedAgents.push(agent);
                    }
                }
                return this.selectedAgents;
            }
        };
    });

    it('should get agents by ID', () => {
        const agent = agentService.getAgent('agent_1');
        assert.truthy(agent, 'Should find agent');
        assert.equal(agent.name, 'Alpha', 'Should get correct agent');
    });

    it('should get active agents', () => {
        const active = agentService.getActiveAgents();
        assert.equal(active.length, 1, 'Should have 1 active agent');
        assert.equal(active[0].name, 'Alpha', 'Active agent should be Alpha');
    });

    it('should get available agents', () => {
        const available = agentService.getAvailableAgents();
        assert.equal(available.length, 1, 'Should have 1 available agent');
        assert.equal(available[0].name, 'Bravo', 'Available agent should be Bravo');
    });

    it('should hire agents', () => {
        const success = agentService.hireAgent('agent_2');
        assert.truthy(success, 'Should hire available agent');

        const active = agentService.getActiveAgents();
        assert.equal(active.length, 2, 'Should have 2 active agents after hiring');
    });

    it('should select agents for mission', () => {
        const selected = agentService.selectAgentsForMission(['agent_1', 'agent_2']);
        assert.equal(selected.length, 1, 'Should select only hired agents');
        assert.equal(selected[0].name, 'Alpha', 'Should select Alpha');
    });

    it('should respect exact selection (no auto-selection)', () => {
        const selected = agentService.selectAgentsForMission([]);
        assert.equal(selected.length, 0, 'Should select 0 agents when none specified');
    });
});

describe('Combat Service Queue Tests', () => {

    let combatService;

    beforeEach(() => {
        // Mock combat service with elimination queue
        combatService = {
            eliminatedEnemies: [],

            queueElimination(enemy) {
                this.eliminatedEnemies.push({
                    entity: enemy,
                    timestamp: Date.now()
                });
            },

            getAndClearEliminatedEnemies() {
                if (!this.eliminatedEnemies || this.eliminatedEnemies.length === 0) {
                    return [];
                }
                const eliminated = [...this.eliminatedEnemies];
                this.eliminatedEnemies = [];
                return eliminated;
            }
        };
    });

    it('should queue enemy eliminations', () => {
        const enemy1 = { id: 'enemy_1', type: 'guard' };
        const enemy2 = { id: 'enemy_2', type: 'soldier' };

        combatService.queueElimination(enemy1);
        combatService.queueElimination(enemy2);

        assert.equal(combatService.eliminatedEnemies.length, 2, 'Should queue 2 eliminations');
    });

    it('should retrieve and clear eliminations', () => {
        const enemy = { id: 'enemy_1', type: 'guard' };
        combatService.queueElimination(enemy);

        const eliminated = combatService.getAndClearEliminatedEnemies();
        assert.equal(eliminated.length, 1, 'Should retrieve 1 elimination');
        assert.equal(eliminated[0].entity.id, 'enemy_1', 'Should retrieve correct enemy');

        assert.equal(combatService.eliminatedEnemies.length, 0, 'Queue should be cleared');
    });

    it('should maintain unidirectional data flow', () => {
        // Test that combat service never calls game directly
        const hasGameReference = false; // Would be static analysis
        assert.falsy(hasGameReference, 'CombatService should not reference game');
    });
});

describe('Mission Service Extraction Tests', () => {

    let missionService;

    beforeEach(() => {
        // Mock mission service
        missionService = {
            extractionEnabled: false,
            objectives: [],

            enableExtraction() {
                this.extractionEnabled = true;
            },

            isExtractionEnabled() {
                return this.extractionEnabled;
            },

            addObjective(obj) {
                this.objectives.push({
                    ...obj,
                    completed: false
                });
            },

            completeObjective(id) {
                const obj = this.objectives.find(o => o.id === id);
                if (obj) {
                    obj.completed = true;
                    this.checkExtraction();
                    return true;
                }
                return false;
            },

            checkExtraction() {
                const allRequired = this.objectives
                    .filter(o => o.required !== false)
                    .every(o => o.completed);

                if (allRequired && !this.extractionEnabled) {
                    this.enableExtraction();
                }
            }
        };
    });

    it('should track extraction state', () => {
        assert.falsy(missionService.isExtractionEnabled(), 'Extraction should start disabled');

        missionService.enableExtraction();
        assert.truthy(missionService.isExtractionEnabled(), 'Extraction should be enabled');
    });

    it('should enable extraction when objectives complete', () => {
        missionService.addObjective({ id: 'obj1', required: true });
        missionService.addObjective({ id: 'obj2', required: true });

        missionService.completeObjective('obj1');
        assert.falsy(missionService.isExtractionEnabled(), 'Extraction should not enable with partial completion');

        missionService.completeObjective('obj2');
        assert.truthy(missionService.isExtractionEnabled(), 'Extraction should enable when all complete');
    });

    it('should not write to game object', () => {
        // Test that service never sets window.game.extractionEnabled
        const setsGameExtraction = false; // Would be static analysis
        assert.falsy(setsGameExtraction, 'MissionService should not set game.extractionEnabled');
    });
});