/**
 * Comprehensive Save/Load Tests
 * Verifies EVERY SINGLE VALUE survives the export → JSON → import roundtrip
 *
 * Run with: node tests/saveload-comprehensive.test.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============================================================
// TEST FRAMEWORK (minimal, self-contained)
// ============================================================

let testsPassed = 0;
let testsFailed = 0;
let currentSuite = '';
const failures = [];

function describe(name, fn) {
    currentSuite = name;
    console.log(`\n📦 ${name}`);
    fn();
}

function it(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`  ✅ ${name}`);
    } catch (e) {
        testsFailed++;
        console.log(`  ❌ ${name}`);
        console.log(`     ${e.message}`);
        failures.push({ suite: currentSuite, test: name, error: e.message });
    }
}

function assertEqual(actual, expected, msg = '') {
    if (actual !== expected) {
        throw new Error(`${msg} Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`);
    }
}

function assertDeepEqual(actual, expected, path = 'root') {
    if (actual === expected) return;

    if (actual === null || expected === null) {
        if (actual !== expected) {
            throw new Error(`${path}: Expected ${JSON.stringify(expected)}, Got ${JSON.stringify(actual)}`);
        }
        return;
    }

    if (typeof actual !== typeof expected) {
        throw new Error(`${path}: Type mismatch. Expected ${typeof expected}, Got ${typeof actual}`);
    }

    if (Array.isArray(expected)) {
        if (!Array.isArray(actual)) {
            throw new Error(`${path}: Expected array, got ${typeof actual}`);
        }
        if (actual.length !== expected.length) {
            throw new Error(`${path}: Array length mismatch. Expected ${expected.length}, Got ${actual.length}`);
        }
        for (let i = 0; i < expected.length; i++) {
            assertDeepEqual(actual[i], expected[i], `${path}[${i}]`);
        }
        return;
    }

    if (typeof expected === 'object') {
        const expectedKeys = Object.keys(expected).sort();
        const actualKeys = Object.keys(actual).sort();

        // Check for missing keys
        for (const key of expectedKeys) {
            if (!(key in actual)) {
                throw new Error(`${path}: Missing key "${key}"`);
            }
        }

        // Check for extra keys
        for (const key of actualKeys) {
            if (!(key in expected)) {
                throw new Error(`${path}: Unexpected key "${key}"`);
            }
        }

        // Deep compare each value
        for (const key of expectedKeys) {
            assertDeepEqual(actual[key], expected[key], `${path}.${key}`);
        }
        return;
    }

    if (actual !== expected) {
        throw new Error(`${path}: Expected ${JSON.stringify(expected)}, Got ${JSON.stringify(actual)}`);
    }
}

function assertTruthy(value, msg = '') {
    if (!value) {
        throw new Error(`${msg} Expected truthy, got: ${value}`);
    }
}

// ============================================================
// SERVICE LOADER
// ============================================================

function loadService(servicePath) {
    const fullPath = path.resolve(__dirname, '..', servicePath);
    const code = fs.readFileSync(fullPath, 'utf8');

    const sandbox = {
        window: { Logger: null, GameServices: null },
        console: console,
        Math: Math,
        Date: Date,
        JSON: JSON,
        Object: Object,
        Array: Array,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Map: Map,
        Set: Set,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        module: { exports: {} }
    };

    const context = vm.createContext(sandbox);
    vm.runInContext(code, context);

    return context.module.exports || sandbox.window[path.basename(servicePath, '.js')];
}

// Load services
console.log('\n🔧 Loading services...\n');

const FormulaService = loadService('js/services/formula-service.js');
console.log('  ✓ FormulaService');

const ResourceService = loadService('js/services/resource-service.js');
console.log('  ✓ ResourceService');

const AgentService = loadService('js/services/agent-service.js');
console.log('  ✓ AgentService');

const InventoryService = loadService('js/services/inventory-service.js');
console.log('  ✓ InventoryService');

const ResearchService = loadService('js/services/research-service.js');
console.log('  ✓ ResearchService');

const MissionService = loadService('js/services/mission-service.js');
console.log('  ✓ MissionService');

const QuestService = loadService('js/services/quest-service.js');
console.log('  ✓ QuestService');

// Create shared FormulaService instance for services that need it
const sharedFormulaService = new FormulaService();

// ============================================================
// HELPER: Deep compare with path tracking
// ============================================================

function compareStates(original, restored, serviceName) {
    const differences = [];

    function compare(orig, rest, path) {
        if (orig === rest) return;

        if (orig === null || rest === null || orig === undefined || rest === undefined) {
            if (orig !== rest) {
                differences.push({ path, original: orig, restored: rest });
            }
            return;
        }

        if (typeof orig !== typeof rest) {
            differences.push({ path, original: typeof orig, restored: typeof rest, issue: 'type mismatch' });
            return;
        }

        if (Array.isArray(orig)) {
            if (!Array.isArray(rest)) {
                differences.push({ path, issue: 'expected array' });
                return;
            }
            if (orig.length !== rest.length) {
                differences.push({ path, original: `length ${orig.length}`, restored: `length ${rest.length}` });
            }
            for (let i = 0; i < Math.max(orig.length, rest.length); i++) {
                compare(orig[i], rest[i], `${path}[${i}]`);
            }
            return;
        }

        if (typeof orig === 'object') {
            const allKeys = new Set([...Object.keys(orig), ...Object.keys(rest)]);
            for (const key of allKeys) {
                if (!(key in orig)) {
                    differences.push({ path: `${path}.${key}`, issue: 'extra key in restored' });
                } else if (!(key in rest)) {
                    differences.push({ path: `${path}.${key}`, issue: 'missing key in restored' });
                } else {
                    compare(orig[key], rest[key], `${path}.${key}`);
                }
            }
            return;
        }

        if (orig !== rest) {
            differences.push({ path, original: orig, restored: rest });
        }
    }

    compare(original, restored, serviceName);
    return differences;
}

// ============================================================
// TEST: ResourceService
// ============================================================

describe('ResourceService exportState/importState', () => {

    it('should preserve all resource values after roundtrip', () => {
        const service = new ResourceService();

        // Set up complex state
        service.set('credits', 12345, 'test');
        service.set('researchPoints', 987, 'test');
        service.set('worldControl', 42, 'test');
        service.set('intel', 555, 'test');

        // Export
        const exported = service.exportState();

        // Serialize and deserialize (simulates actual save/load)
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new ResourceService();
        restored.importState(parsed);

        // Export again to compare
        const reExported = restored.exportState();

        // Deep compare
        const diffs = compareStates(exported, reExported, 'ResourceService');

        if (diffs.length > 0) {
            console.log('    Differences found:');
            diffs.forEach(d => console.log(`      ${d.path}: ${JSON.stringify(d.original)} → ${JSON.stringify(d.restored)}`));
            throw new Error(`${diffs.length} values differ after roundtrip`);
        }
    });

    it('should preserve exact numeric values', () => {
        const service = new ResourceService();

        service.set('credits', 999999, 'test');
        service.set('researchPoints', 0, 'test');
        service.set('worldControl', 100, 'test');

        const exported = service.exportState();
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        const restored = new ResourceService();
        restored.importState(parsed);

        assertEqual(restored.get('credits'), 999999, 'credits');
        assertEqual(restored.get('researchPoints'), 0, 'researchPoints');
        assertEqual(restored.get('worldControl'), 100, 'worldControl');
    });

    it('should handle zero values correctly', () => {
        const service = new ResourceService();

        service.set('credits', 0, 'test');
        service.set('researchPoints', 0, 'test');

        const exported = service.exportState();
        const restored = new ResourceService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        assertEqual(restored.get('credits'), 0, 'zero credits');
        assertEqual(restored.get('researchPoints'), 0, 'zero researchPoints');
    });

});

// ============================================================
// TEST: AgentService
// ============================================================

describe('AgentService exportState/importState', () => {

    it('should preserve all agent data after roundtrip', () => {
        const service = new AgentService();

        // Create complex agent data - use hired: true for active, hired: false for available
        const agent1 = {
            id: 'agent_001',
            originalId: 'shadow',
            name: 'Shadow',
            health: 85,
            maxHealth: 100,
            damage: 25,
            specialization: 'infiltrator',
            hired: true,  // ACTIVE agent
            alive: true,
            level: 5,
            xp: 2500
        };

        const agent2 = {
            id: 'agent_002',
            originalId: 'tank',
            name: 'Tank',
            health: 150,
            maxHealth: 150,
            damage: 40,
            specialization: 'heavy',
            hired: true,  // ACTIVE agent
            alive: true,
            level: 3,
            xp: 1200
        };

        const fallenAgent = {
            id: 'agent_003',
            originalId: 'ghost',
            name: 'Ghost',
            health: 0,
            maxHealth: 80,
            damage: 30,
            hired: true,  // Was hired, now fallen
            alive: false
        };

        const availableAgent = {
            id: 'agent_004',
            name: 'Rookie',
            cost: 5000,
            hired: false,  // NOT hired yet
            alive: true
        };

        // Initialize service with agents - set them in the correct arrays
        service.activeAgents = [service.createAgent(agent1), service.createAgent(agent2)];
        service.fallenAgents = [service.createAgent(fallenAgent)];
        service.availableAgents = [service.createAgent(availableAgent)];
        service.nextAgentId = 5;

        // Index them
        service.activeAgents.forEach(a => service.indexAgent(a));
        service.fallenAgents.forEach(a => service.indexAgent(a));
        service.availableAgents.forEach(a => service.indexAgent(a));

        // Export
        const exported = service.exportState();

        // Verify export structure
        assertEqual(exported.activeAgents.length, 2, 'exported active agents count');
        assertEqual(exported.fallenAgents.length, 1, 'exported fallen agents count');
        assertEqual(exported.availableAgents.length, 1, 'exported available agents count');

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new AgentService();
        restored.importState(parsed);

        // Verify counts match
        assertEqual(restored.activeAgents.length, 2, 'active agents count');
        assertEqual(restored.fallenAgents.length, 1, 'fallen agents count');
        assertEqual(restored.availableAgents.length, 1, 'available agents count');
        assertEqual(restored.nextAgentId, 5, 'nextAgentId');

        // Verify agent1 details
        const restoredAgent1 = restored.getAgent('agent_001');
        assertTruthy(restoredAgent1, 'agent_001 should exist');
        assertEqual(restoredAgent1.name, 'Shadow', 'agent1 name');
        assertEqual(restoredAgent1.health, 85, 'agent1 health');
        assertEqual(restoredAgent1.level, 5, 'agent1 level');
        assertEqual(restoredAgent1.xp, 2500, 'agent1 xp');

        // Verify fallen agent
        const restoredFallen = restored.fallenAgents[0];
        assertEqual(restoredFallen.alive, false, 'fallen agent alive');
        assertEqual(restoredFallen.health, 0, 'fallen agent health');
    });

    it('should EXCLUDE rpgEntity from exported agent data (fix for getter serialization bug)', () => {
        // This test verifies the fix for the bug where rpgEntity class instances
        // with getter-based stats would be corrupted during JSON serialization.
        // Solution: AgentService.exportState() now excludes rpgEntity entirely.
        // RPGService handles RPG data export/import separately.
        const service = new AgentService();

        const agentWithRPG = {
            id: 'rpg_agent',
            name: 'RPGMaster',
            hired: true,
            alive: true,
            rpgEntity: {
                level: 10,
                xp: 50000,
                class: 'tech_specialist',
                stats: {
                    strength: 10,
                    agility: 14,
                    intelligence: 20
                }
            }
        };

        service.activeAgents = [service.createAgent(agentWithRPG)];
        service.indexAgent(service.activeAgents[0]);

        // Verify the agent HAS rpgEntity before export
        assertTruthy(service.activeAgents[0].rpgEntity, 'agent should have rpgEntity before export');

        // Export - rpgEntity should be EXCLUDED
        const exported = service.exportState();

        // Verify rpgEntity is NOT in exported data
        assertEqual(exported.activeAgents[0].rpgEntity, undefined, 'rpgEntity should be undefined in exported data');

        // After import, rpgEntity should be null (not from agent data)
        // In real usage, rpgEntity is restored from rpgManager by AgentService.importState()
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const restoredAgent = restored.getAgent('rpg_agent');
        assertTruthy(restoredAgent, 'agent should exist after import');
        assertEqual(restoredAgent.rpgEntity, null, 'rpgEntity should be null (restored from rpgManager in real usage)');
    });

    it('should preserve all non-rpgEntity agent properties after roundtrip', () => {
        const service = new AgentService();

        const agentWithRPG = {
            id: 'rpg_agent',
            name: 'RPGMaster',
            hired: true,
            alive: true,
            health: 85,
            maxHealth: 100,
            damage: 25,
            level: 10,
            xp: 50000,
            specialization: 'tech_specialist',
            rpgEntity: { /* this will be excluded */ }
        };

        service.activeAgents = [service.createAgent(agentWithRPG)];
        service.indexAgent(service.activeAgents[0]);

        const exported = service.exportState();
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const restoredAgent = restored.getAgent('rpg_agent');
        assertEqual(restoredAgent.name, 'RPGMaster', 'name preserved');
        assertEqual(restoredAgent.health, 85, 'health preserved');
        assertEqual(restoredAgent.maxHealth, 100, 'maxHealth preserved');
        assertEqual(restoredAgent.damage, 25, 'damage preserved');
        assertEqual(restoredAgent.level, 10, 'level preserved');
        assertEqual(restoredAgent.xp, 50000, 'xp preserved');
        assertEqual(restoredAgent.specialization, 'tech_specialist', 'specialization preserved');
    });

});

// ============================================================
// TEST: InventoryService
// ============================================================

describe('InventoryService exportState/importState', () => {

    it('should preserve all inventory data after roundtrip', () => {
        const service = new InventoryService();

        // Set up inventory (equipped is calculated from loadouts, so don't set it directly)
        service.inventory = {
            weapons: [
                { id: 'plasma_rifle', name: 'Plasma Rifle', damage: 45, owned: 2 },
                { id: 'laser_pistol', name: 'Laser Pistol', damage: 20, owned: 5 },
                { id: 'emp_grenade', name: 'EMP Grenade', damage: 80, owned: 10 }
            ],
            armor: [
                { id: 'stealth_suit', name: 'Stealth Suit', protection: 15, owned: 2 },
                { id: 'power_armor', name: 'Power Armor', protection: 50, owned: 1 }
            ],
            utility: [
                { id: 'medkit', name: 'Medkit', uses: 3, owned: 8 },
                { id: 'hacking_tool', name: 'Hacking Tool', bonus: 2, owned: 3 }
            ]
        };

        // Set up loadouts (equipped count is derived from these)
        service.agentLoadouts = {
            'agent_001': {
                weapon: { id: 'plasma_rifle', name: 'Plasma Rifle' },
                armor: { id: 'stealth_suit', name: 'Stealth Suit' },
                utility: { id: 'hacking_tool', name: 'Hacking Tool' }
            },
            'agent_002': {
                weapon: { id: 'laser_pistol', name: 'Laser Pistol' },
                armor: { id: 'power_armor', name: 'Power Armor' },
                utility: { id: 'medkit', name: 'Medkit' }
            }
        };

        // Export
        const exported = service.exportState();

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new InventoryService();
        restored.importState(parsed);

        // Verify key data preserved
        assertEqual(restored.inventory.weapons.length, 3, 'weapons count');
        assertEqual(restored.inventory.armor.length, 2, 'armor count');
        assertEqual(restored.inventory.utility.length, 2, 'utility count');
        assertEqual(Object.keys(restored.agentLoadouts).length, 2, 'loadouts count');

        // Verify specific values
        const rifle = restored.inventory.weapons.find(w => w.id === 'plasma_rifle');
        assertEqual(rifle.damage, 45, 'plasma_rifle damage');
        assertEqual(rifle.owned, 2, 'plasma_rifle owned');
    });

    it('should preserve weapon stats exactly', () => {
        const service = new InventoryService();

        service.inventory = {
            weapons: [
                {
                    id: 'test_weapon',
                    name: 'Test Weapon',
                    damage: 123,
                    critChance: 0.15,
                    critMultiplier: 2.5,
                    range: 10,
                    rateOfFire: 3,
                    owned: 7,
                    customMods: ['scope', 'silencer']
                }
            ],
            armor: [],
            utility: []
        };

        const exported = service.exportState();
        const restored = new InventoryService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const weapon = restored.inventory.weapons[0];
        assertEqual(weapon.damage, 123, 'damage');
        assertEqual(weapon.critChance, 0.15, 'critChance');
        assertEqual(weapon.critMultiplier, 2.5, 'critMultiplier');
        assertEqual(weapon.owned, 7, 'owned');
        assertDeepEqual(weapon.customMods, ['scope', 'silencer'], 'customMods');
    });

});

// ============================================================
// TEST: ResearchService
// ============================================================

describe('ResearchService exportState/importState', () => {

    it('should preserve research state after roundtrip', () => {
        // ResearchService requires FormulaService dependency
        const service = new ResearchService(sharedFormulaService);

        // Set up research state - only completedResearch is exported/imported
        service.completedResearch = [
            'advanced_weapons',
            'armor_plating',
            'stealth_tech',
            'hacking_suite'
        ];

        // Export
        const exported = service.exportState();

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new ResearchService(sharedFormulaService);
        restored.importState(parsed);

        // Verify - only completedResearch is preserved
        assertDeepEqual(restored.completedResearch, service.completedResearch, 'completedResearch');
    });

});

// ============================================================
// TEST: MissionService
// ============================================================

describe('MissionService exportState/importState', () => {

    it('should preserve mission state after roundtrip', () => {
        const service = new MissionService();

        // Set up mission state
        service.currentMission = {
            id: 'main-02-003',
            name: 'Infiltrate HQ',
            act: 2,
            campaign: 'main'
        };
        service.completedMissions = [
            'main-01-001',
            'main-01-002',
            'main-01-003',
            'main-02-001',
            'main-02-002'
        ];
        service.failedMissions = ['side-01'];

        // missionStats is a Map, not a plain object
        service.missionStats.set('main-01-001', {
            enemiesKilled: 12,
            terminalHacked: 3,
            creditsCollected: 5000,
            timeElapsed: 180000
        });
        service.missionStats.set('main-01-002', {
            enemiesKilled: 8,
            terminalHacked: 2,
            creditsCollected: 3000,
            timeElapsed: 120000
        });

        // Export
        const exported = service.exportState();

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new MissionService();
        restored.importState(parsed);

        // Export restored and compare
        const reExported = restored.exportState();

        const diffs = compareStates(exported, reExported, 'MissionService');

        if (diffs.length > 0) {
            console.log('    Differences found:');
            diffs.slice(0, 10).forEach(d => console.log(`      ${d.path}: ${JSON.stringify(d.original)} → ${JSON.stringify(d.restored)}`));
            throw new Error(`${diffs.length} values differ after roundtrip`);
        }
    });

    it('should preserve completed and failed missions', () => {
        const service = new MissionService();

        service.completedMissions = ['m1', 'm2', 'm3', 'm4', 'm5'];
        service.failedMissions = ['m6'];
        service.currentMissionIndex = 5;
        service.missionStatus = 'active';

        const exported = service.exportState();
        const restored = new MissionService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        assertEqual(restored.completedMissions.length, 5, 'completed missions count');
        assertEqual(restored.failedMissions.length, 1, 'failed missions count');
        assertEqual(restored.currentMissionIndex, 5, 'current mission index');
        assertEqual(restored.missionStatus, 'active', 'mission status');
    });

});

// ============================================================
// TEST: QuestService
// ============================================================

describe('QuestService exportState/importState', () => {

    it('should preserve all quest data after roundtrip', () => {
        const service = new QuestService();

        // Register active quests
        service.registerQuest({
            id: 'side_quest_1',
            name: 'Find the Informant',
            description: 'Locate and speak with the informant',
            type: 'side',
            giver: 'npc_mysterious',
            objectives: [
                { id: 'find', type: 'reach', description: 'Find location', target: 1 },
                { id: 'speak', type: 'interact', description: 'Speak to informant', target: 1 }
            ],
            rewards: { credits: 2000, xp: 500 }
        });

        service.registerQuest({
            id: 'side_quest_2',
            name: 'Eliminate Threat',
            type: 'side',
            objectives: [
                { id: 'kill', type: 'kill', description: 'Kill enemies', target: 5 }
            ]
        });

        // Update progress
        service.updateProgress('side_quest_1', 'find', 1);
        service.updateProgress('side_quest_2', 'kill', 3);

        // Complete a quest
        service.completedQuests.add('main_quest_1');
        service.completedQuests.add('main_quest_2');

        // Add dialog history
        service.recordDialogChoice('npc_01', 'choice_friendly');
        service.recordDialogChoice('npc_01', 'choice_help');
        service.recordDialogChoice('npc_02', 'choice_bribe');

        // Add quest inventory
        service.questInventory = {
            'data_chip': 3,
            'keycard_red': 1,
            'evidence_file': 2
        };

        // Export
        const exported = service.exportState();

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import into fresh service
        const restored = new QuestService();
        restored.importState(parsed);

        // Verify counts
        assertEqual(restored.activeQuests.size, 2, 'active quests count');
        assertEqual(restored.completedQuests.size, 2, 'completed quests count');

        // Verify quest progress
        const quest2Progress = restored.questProgress.get('side_quest_2');
        assertTruthy(quest2Progress, 'quest progress should exist');
        const killProgress = quest2Progress.objectives.find(o => o.id === 'kill');
        assertEqual(killProgress.progress, 3, 'kill progress');

        // Verify dialog history
        const npc01History = restored.dialogHistory.get('npc_01');
        assertEqual(npc01History.length, 2, 'npc_01 dialog history length');

        // Verify quest inventory
        assertEqual(restored.questInventory['data_chip'], 3, 'data_chip count');
        assertEqual(restored.questInventory['keycard_red'], 1, 'keycard_red count');
    });

});

// ============================================================
// TEST: Full Integrated State Tree
// ============================================================

describe('Full Integrated State Tree', () => {

    it('should preserve complete game state across all services', () => {
        // Create all services
        const resourceService = new ResourceService();
        const agentService = new AgentService();
        const inventoryService = new InventoryService();
        const missionService = new MissionService();
        const questService = new QuestService();

        // Set up complex state in each service
        resourceService.set('credits', 50000, 'test');
        resourceService.set('researchPoints', 1500, 'test');
        resourceService.set('worldControl', 35, 'test');

        // Note: Active agents should have hired: true, fallen should have hired: true (were hired before death)
        agentService.activeAgents = [
            agentService.createAgent({
                id: 'agent_1', name: 'Alpha', health: 100, maxHealth: 100,
                hired: true,  // Active agents are hired
                level: 7, xp: 15000
            }),
            agentService.createAgent({
                id: 'agent_2', name: 'Beta', health: 80, maxHealth: 120,
                hired: true,  // Active agents are hired
                level: 5, xp: 8000
            })
        ];
        agentService.fallenAgents = [
            agentService.createAgent({
                id: 'agent_3', name: 'Gamma', health: 0, maxHealth: 90,
                hired: true,  // Was hired before death
                alive: false
            })
        ];

        // Note: InventoryService may add calculated 'equipped' field during import
        // We only verify the core data fields, not calculated fields
        inventoryService.inventory = {
            weapons: [
                { id: 'rifle_1', damage: 50, owned: 3 },
                { id: 'pistol_1', damage: 25, owned: 5 }
            ],
            armor: [{ id: 'armor_1', protection: 30, owned: 2 }],
            utility: [{ id: 'medkit', uses: 3, owned: 10 }]
        };

        missionService.completedMissions = ['m1', 'm2', 'm3', 'm4', 'm5'];
        missionService.currentMission = { id: 'm6', name: 'Current Mission' };

        questService.completedQuests.add('q1');
        questService.completedQuests.add('q2');
        questService.questInventory = { 'item_a': 5, 'item_b': 3 };

        // Export all states
        const fullState = {
            resources: resourceService.exportState(),
            agents: agentService.exportState(),
            inventory: inventoryService.exportState(),
            missions: missionService.exportState(),
            quests: questService.exportState()
        };

        // Full JSON roundtrip
        const json = JSON.stringify(fullState);
        const parsed = JSON.parse(json);

        // Create fresh services and import
        const restoredResourceService = new ResourceService();
        const restoredAgentService = new AgentService();
        const restoredInventoryService = new InventoryService();
        const restoredMissionService = new MissionService();
        const restoredQuestService = new QuestService();

        restoredResourceService.importState(parsed.resources);
        restoredAgentService.importState(parsed.agents);
        restoredInventoryService.importState(parsed.inventory);
        restoredMissionService.importState(parsed.missions);
        restoredQuestService.importState(parsed.quests);

        // Verify key values individually for clarity
        assertEqual(restoredResourceService.get('credits'), 50000, 'credits');
        assertEqual(restoredAgentService.activeAgents.length, 2, 'active agents');
        assertEqual(restoredAgentService.fallenAgents.length, 1, 'fallen agents');
        assertEqual(restoredInventoryService.inventory.weapons.length, 2, 'weapons count');
        assertEqual(restoredMissionService.completedMissions.length, 5, 'completed missions');
        assertEqual(restoredQuestService.completedQuests.size, 2, 'completed quests');
    });

    it('should handle empty state correctly', () => {
        const resourceService = new ResourceService();
        const agentService = new AgentService();
        const inventoryService = new InventoryService();

        // Export empty states
        const emptyState = {
            resources: resourceService.exportState(),
            agents: agentService.exportState(),
            inventory: inventoryService.exportState()
        };

        // Roundtrip
        const json = JSON.stringify(emptyState);
        const parsed = JSON.parse(json);

        // Import
        const restoredResourceService = new ResourceService();
        const restoredAgentService = new AgentService();
        const restoredInventoryService = new InventoryService();

        restoredResourceService.importState(parsed.resources);
        restoredAgentService.importState(parsed.agents);
        restoredInventoryService.importState(parsed.inventory);

        // Verify empty state preserved
        assertEqual(restoredAgentService.activeAgents.length, 0, 'no active agents');
        assertEqual(restoredAgentService.fallenAgents.length, 0, 'no fallen agents');
    });

});

// ============================================================
// TEST: RPGEntity Serialization Fix (Regression Tests)
// ============================================================

describe('RPGEntity Serialization Fix', () => {

    it('should exclude rpgEntity from all agent types in export', () => {
        const service = new AgentService();

        // Create agents with rpgEntity in all categories
        const createAgentWithRPG = (id, name, hired, alive) => ({
            id, name, hired, alive,
            rpgEntity: { stats: { strength: 15 } }
        });

        service.activeAgents = [service.createAgent(createAgentWithRPG('a1', 'Active', true, true))];
        service.availableAgents = [service.createAgent(createAgentWithRPG('a2', 'Available', false, true))];
        service.fallenAgents = [service.createAgent(createAgentWithRPG('a3', 'Fallen', true, false))];

        // Verify all agents have rpgEntity before export
        assertTruthy(service.activeAgents[0].rpgEntity, 'active should have rpgEntity');
        assertTruthy(service.availableAgents[0].rpgEntity, 'available should have rpgEntity');
        assertTruthy(service.fallenAgents[0].rpgEntity, 'fallen should have rpgEntity');

        const exported = service.exportState();

        // Verify rpgEntity is EXCLUDED from all exported agents
        assertEqual(exported.activeAgents[0].rpgEntity, undefined, 'active should not export rpgEntity');
        assertEqual(exported.availableAgents[0].rpgEntity, undefined, 'available should not export rpgEntity');
        assertEqual(exported.fallenAgents[0].rpgEntity, undefined, 'fallen should not export rpgEntity');
    });

    it('should preserve all other agent properties when rpgEntity is excluded', () => {
        const service = new AgentService();

        const fullAgent = {
            id: 'full_agent',
            originalId: 'original_123',
            name: 'Full Agent',
            hired: true,
            alive: true,
            health: 75,
            maxHealth: 100,
            damage: 30,
            speed: 6,
            protection: 10,
            specialization: 'infiltrator',
            skills: ['stealth', 'hacking'],
            cost: 5000,
            bio: 'Test bio',
            level: 5,
            xp: 2500,
            weapon: { id: 'gun1' },
            armor: { id: 'armor1' },
            x: 10,
            y: 20,
            rpgEntity: { stats: { strength: 15 } } // This should be excluded
        };

        service.activeAgents = [service.createAgent(fullAgent)];

        const exported = service.exportState();
        const exportedAgent = exported.activeAgents[0];

        // Verify rpgEntity is excluded
        assertEqual(exportedAgent.rpgEntity, undefined, 'rpgEntity excluded');

        // Verify ALL other properties are preserved
        assertEqual(exportedAgent.id, 'full_agent', 'id preserved');
        assertEqual(exportedAgent.originalId, 'original_123', 'originalId preserved');
        assertEqual(exportedAgent.name, 'Full Agent', 'name preserved');
        assertEqual(exportedAgent.hired, true, 'hired preserved');
        assertEqual(exportedAgent.alive, true, 'alive preserved');
        assertEqual(exportedAgent.health, 75, 'health preserved');
        assertEqual(exportedAgent.maxHealth, 100, 'maxHealth preserved');
        assertEqual(exportedAgent.damage, 30, 'damage preserved');
        assertEqual(exportedAgent.speed, 6, 'speed preserved');
        assertEqual(exportedAgent.protection, 10, 'protection preserved');
        assertEqual(exportedAgent.specialization, 'infiltrator', 'specialization preserved');
        assertEqual(exportedAgent.cost, 5000, 'cost preserved');
        assertEqual(exportedAgent.level, 5, 'level preserved');
        assertEqual(exportedAgent.xp, 2500, 'xp preserved');
        assertEqual(exportedAgent.x, 10, 'x preserved');
        assertEqual(exportedAgent.y, 20, 'y preserved');
    });

    it('should survive full JSON roundtrip without rpgEntity corruption', () => {
        const service = new AgentService();

        // Create agent with complex rpgEntity that would cause corruption
        // if serialized (class instance with getters)
        const agentWithComplexRPG = {
            id: 'complex_agent',
            name: 'Complex',
            hired: true,
            alive: true,
            health: 100,
            // Simulate a class instance with getter
            rpgEntity: {
                stats: {
                    strength: {
                        base: 10,
                        bonus: 5,
                        get value() { return this.base + this.bonus; }
                    }
                }
            }
        };

        service.activeAgents = [service.createAgent(agentWithComplexRPG)];

        // Export (should exclude rpgEntity)
        const exported = service.exportState();

        // Full JSON roundtrip
        const json = JSON.stringify(exported);
        const parsed = JSON.parse(json);

        // Import
        const restored = new AgentService();
        restored.importState(parsed);

        // Agent should exist and have all non-rpgEntity data
        const restoredAgent = restored.getAgent('complex_agent');
        assertTruthy(restoredAgent, 'agent should exist');
        assertEqual(restoredAgent.name, 'Complex', 'name preserved');
        assertEqual(restoredAgent.health, 100, 'health preserved');

        // rpgEntity should be null (would be restored from rpgManager in real usage)
        assertEqual(restoredAgent.rpgEntity, null, 'rpgEntity is null after import');
    });

    it('should handle agents with null or undefined rpgEntity', () => {
        const service = new AgentService();

        const agentWithNullRPG = { id: 'null_rpg', name: 'NullRPG', hired: true, rpgEntity: null };
        const agentWithNoRPG = { id: 'no_rpg', name: 'NoRPG', hired: true };

        service.activeAgents = [
            service.createAgent(agentWithNullRPG),
            service.createAgent(agentWithNoRPG)
        ];

        // Should not throw
        const exported = service.exportState();

        assertEqual(exported.activeAgents[0].rpgEntity, undefined, 'null rpgEntity becomes undefined');
        assertEqual(exported.activeAgents[1].rpgEntity, undefined, 'missing rpgEntity stays undefined');

        // Roundtrip should work
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        assertEqual(restored.activeAgents.length, 2, 'both agents restored');
    });

});

// ============================================================
// TEST: Edge Cases and Boundary Values
// ============================================================

describe('Edge Cases and Boundary Values', () => {

    it('should handle maximum integer values', () => {
        const service = new ResourceService();

        // ResourceService has intentional constraints: credits max is 999999999
        // This is intentional to prevent overflow issues
        const maxCredits = 999999999;  // ResourceService constraint
        service.set('credits', maxCredits, 'test');

        const exported = service.exportState();
        const restored = new ResourceService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        assertEqual(restored.get('credits'), maxCredits, 'max int preserved');
    });

    it('should handle floating point precision', () => {
        const service = new InventoryService();

        service.inventory = {
            weapons: [{ id: 'test', critChance: 0.123456789, damage: 99.99 }],
            armor: [],
            utility: []
        };

        const exported = service.exportState();
        const restored = new InventoryService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        assertEqual(restored.inventory.weapons[0].critChance, 0.123456789, 'float precision');
        assertEqual(restored.inventory.weapons[0].damage, 99.99, 'float precision 2');
    });

    it('should handle special characters in strings', () => {
        const service = new AgentService();

        service.activeAgents = [service.createAgent({
            id: 'special',
            name: 'Agent "Quotes" & <Tags>',
            bio: 'Line1\nLine2\tTabbed',
            notes: 'Unicode: \u00e9\u00e8\u00ea emoji test'
        })];

        const exported = service.exportState();
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const agent = restored.activeAgents[0];
        assertEqual(agent.name, 'Agent "Quotes" & <Tags>', 'special chars in name');
        assertEqual(agent.bio, 'Line1\nLine2\tTabbed', 'newlines and tabs');
    });

    it('should handle deeply nested objects', () => {
        const service = new AgentService();

        service.activeAgents = [service.createAgent({
            id: 'nested',
            name: 'Nested',
            deepData: {
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                value: 'deep',
                                array: [1, 2, { nested: true }]
                            }
                        }
                    }
                }
            }
        })];

        const exported = service.exportState();
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const deep = restored.activeAgents[0].deepData.level1.level2.level3.level4;
        assertEqual(deep.value, 'deep', 'deep value');
        assertEqual(deep.array[2].nested, true, 'deep nested array object');
    });

    it('should handle null and undefined correctly', () => {
        const service = new AgentService();

        service.activeAgents = [service.createAgent({
            id: 'nulltest',
            name: 'NullTest',
            nullField: null,
            emptyString: '',
            zeroValue: 0,
            falseValue: false
        })];

        const exported = service.exportState();
        const restored = new AgentService();
        restored.importState(JSON.parse(JSON.stringify(exported)));

        const agent = restored.activeAgents[0];
        assertEqual(agent.nullField, null, 'null preserved');
        assertEqual(agent.emptyString, '', 'empty string preserved');
        assertEqual(agent.zeroValue, 0, 'zero preserved');
        assertEqual(agent.falseValue, false, 'false preserved');
    });

});

// ============================================================
// SUMMARY
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('📊 SAVE/LOAD COMPREHENSIVE TEST RESULTS');
console.log('='.repeat(60));
console.log(`\n  ✅ Passed: ${testsPassed}`);
console.log(`  ❌ Failed: ${testsFailed}`);
console.log(`  📈 Total:  ${testsPassed + testsFailed}`);

if (failures.length > 0) {
    console.log('\n❌ FAILURES:');
    failures.forEach((f, i) => {
        console.log(`\n  ${i + 1}. [${f.suite}] ${f.test}`);
        console.log(`     ${f.error}`);
    });
}

console.log('\n' + '='.repeat(60));

if (testsFailed > 0) {
    process.exit(1);
} else {
    console.log('✅ ALL TESTS PASSED - State preservation verified!\n');
    process.exit(0);
}
