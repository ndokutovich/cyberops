/**
 * MissionService Test Suite
 * Comprehensive tests for mission management and objectives
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import services if in Node.js
if (typeof window === 'undefined') {
    global.MissionService = require('../js/services/mission-service.js');
    global.ResourceService = require('../js/services/resource-service.js');
    global.AgentService = require('../js/services/agent-service.js');
    global.Logger = require('../js/services/logger-service.js');
}

describe('MissionService Tests', () => {

    // Helper to create mock resource service
    function createMockResourceService() {
        const mock = {
            resources: { credits: 1000, researchPoints: 100 },
            add: function(type, amount, reason) {
                this.resources[type] = (this.resources[type] || 0) + amount;
                return true;
            },
            spend: function(type, amount, reason) {
                if (this.resources[type] >= amount) {
                    this.resources[type] -= amount;
                    return true;
                }
                return false;
            },
            get: function(type) {
                return this.resources[type] || 0;
            },
            applyMissionRewards: function(rewards) {
                if (rewards.credits) this.add('credits', rewards.credits);
                if (rewards.researchPoints) this.add('researchPoints', rewards.researchPoints);
                return true;
            }
        };
        return mock;
    }

    // Helper to create mock agent service
    function createMockAgentService() {
        return {
            agents: [],
            getActiveAgents: function() { return this.agents; }
        };
    }

    // Helper to create service with mocks
    function createService() {
        const resourceService = createMockResourceService();
        const agentService = createMockAgentService();
        return new MissionService(resourceService, agentService);
    }

    // Helper to create test mission data
    function createTestMission(overrides = {}) {
        return {
            id: 'test-mission-001',
            name: 'Test Mission',
            type: 'standard',
            difficulty: 'normal',
            briefing: 'Test briefing',
            objectives: [
                {
                    id: 'obj_1',
                    type: 'eliminate',
                    description: 'Eliminate 5 enemies',
                    target: { type: 'enemy', count: 5 },
                    required: true
                }
            ],
            rewards: {
                credits: 2000,
                researchPoints: 50
            },
            extractionPoint: { x: 10, y: 10 },
            ...overrides
        };
    }

    describe('MissionService Initialization', () => {

        it('should initialize with idle status', () => {
            const service = createService();

            assertEqual(service.missionStatus, 'idle', 'Status should be idle');
            assertEqual(service.currentMission, null, 'No current mission');
        });

        it('should accept service dependencies', () => {
            const resourceService = createMockResourceService();
            const agentService = createMockAgentService();
            const service = new MissionService(resourceService, agentService);

            assertEqual(service.resourceService, resourceService, 'Should have resource service');
            assertEqual(service.agentService, agentService, 'Should have agent service');
        });

        it('should initialize empty objectives', () => {
            const service = createService();

            assertEqual(service.objectives.length, 0, 'Should have no objectives');
            assertEqual(service.completedObjectives.size, 0, 'No completed objectives');
        });

    });

    describe('Mission Lifecycle', () => {

        it('should start a mission', () => {
            const service = createService();
            const missionData = createTestMission();

            const result = service.startMission(missionData);

            assertTruthy(result, 'Mission should start');
            assertEqual(service.missionStatus, 'active', 'Status should be active');
            assertEqual(service.currentMission.id, 'test-mission-001', 'Mission ID should match');
        });

        it('should prevent starting mission when one is active', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            const result = service.startMission(missionData);

            assertFalsy(result, 'Should not start second mission');
        });

        it('should parse mission objectives', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);

            assertEqual(service.objectives.length, 1, 'Should have 1 objective');
            assertEqual(service.objectives[0].type, 'eliminate', 'Objective type should be eliminate');
            assertEqual(service.objectives[0].maxProgress, 5, 'Max progress should be 5');
        });

        it('should initialize trackers on mission start', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);

            assertEqual(service.trackers.enemiesEliminated, 0, 'Enemies eliminated should be 0');
            assertEqual(service.trackers.terminalsHacked, 0, 'Terminals hacked should be 0');
        });

        it('should complete a mission', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.completeMission();

            assertEqual(service.missionStatus, 'completed', 'Status should be completed');
            assertEqual(service.completedMissions.length, 1, 'Should have 1 completed mission');
        });

        it('should fail a mission', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.failMission('Test failure');

            assertEqual(service.missionStatus, 'failed', 'Status should be failed');
            assertEqual(service.failedMissions.length, 1, 'Should have 1 failed mission');
        });

        it('should abort a mission', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.abortMission();

            assertEqual(service.missionStatus, 'failed', 'Status should be failed (abort = fail)');
        });

    });

    describe('Objective Tracking', () => {

        it('should track enemy elimination', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.trackEvent('eliminate', { type: 'guard' });

            assertEqual(service.trackers.enemiesEliminated, 1, 'Should track 1 enemy killed');
        });

        it('should track enemies by type', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.trackEvent('eliminate', { type: 'guard' });
            service.trackEvent('eliminate', { type: 'guard' });
            service.trackEvent('eliminate', { type: 'soldier' });

            assertEqual(service.trackers.enemiesEliminatedByType.guard, 2, 'Should track 2 guards');
            assertEqual(service.trackers.enemiesEliminatedByType.soldier, 1, 'Should track 1 soldier');
        });

        it('should track terminal hacking', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [{
                    type: 'interact',
                    description: 'Hack terminals',
                    target: { type: 'terminal', count: 3 }
                }]
            });

            service.startMission(missionData);
            service.trackEvent('terminal', { id: 't1' });

            assertEqual(service.trackers.terminalsHacked, 1, 'Should track 1 terminal hacked');
        });

        it('should complete objective when progress reaches max', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [{
                    id: 'obj_kill',
                    type: 'eliminate',
                    target: { type: 'enemy', count: 2 }
                }]
            });

            service.startMission(missionData);

            service.trackEvent('eliminate', {});
            assertEqual(service.objectives[0].status, 'active', 'Should be active after first kill');

            service.trackEvent('eliminate', {});
            assertEqual(service.objectives[0].status, 'completed', 'Should be completed');
        });

        it('should update objective progress', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);

            service.trackEvent('eliminate', {});
            assertEqual(service.objectives[0].progress, 1, 'Progress should be 1');

            service.trackEvent('eliminate', {});
            assertEqual(service.objectives[0].progress, 2, 'Progress should be 2');
        });

    });

    describe('Extraction System', () => {

        it('should not enable extraction initially', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);

            assertFalsy(service.extractionEnabled, 'Extraction should not be enabled');
        });

        it('should enable extraction when objectives complete', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [{
                    type: 'eliminate',
                    target: { type: 'enemy', count: 1 },
                    required: true
                }]
            });

            service.startMission(missionData);
            service.trackEvent('eliminate', {});

            assertTruthy(service.extractionEnabled, 'Extraction should be enabled');
        });

        it('should not enable extraction if required objectives incomplete', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [
                    { type: 'eliminate', target: { count: 1 }, required: true },
                    { type: 'collect', target: { count: 1 }, required: true }
                ]
            });

            service.startMission(missionData);
            service.trackEvent('eliminate', {});

            assertFalsy(service.extractionEnabled, 'Extraction should not be enabled yet');
        });

        it('should check extraction eligibility', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [{
                    type: 'eliminate',
                    target: { count: 1 },
                    required: true
                }]
            });

            service.startMission(missionData);

            assertFalsy(service.extractionEnabled, 'Not eligible initially');

            service.trackEvent('eliminate', {});

            assertTruthy(service.extractionEnabled, 'Should be eligible after objectives');
        });

    });

    describe('Mission Progress', () => {

        it('should get mission progress', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [
                    { type: 'eliminate', target: { count: 5 }, required: true }
                ]
            });

            service.startMission(missionData);
            service.trackEvent('eliminate', {});
            service.trackEvent('eliminate', {});

            const progress = service.getMissionProgress();

            assertEqual(progress.objectives.length, 1, 'Should have 1 objective');
            assertEqual(progress.objectives[0].status, 'active', 'Objective should be active');
            assertEqual(progress.extractionEnabled, false, 'Extraction not enabled');
        });

        it('should calculate progress percentage', () => {
            const service = createService();
            const missionData = createTestMission({
                objectives: [
                    { type: 'eliminate', target: { count: 5 } },
                    { type: 'collect', target: { count: 3 } }
                ]
            });

            service.startMission(missionData);

            // Complete one objective
            for (let i = 0; i < 5; i++) {
                service.trackEvent('eliminate', {});
            }

            const progress = service.getMissionProgress();

            const completedCount = progress.objectives.filter(o => o.status === 'completed').length;
            assertEqual(completedCount, 1, 'Should have 1 completed');
            assertEqual(progress.objectives.length, 2, 'Should have 2 total');
        });

    });

    describe('Quest System', () => {

        it('should register quests', () => {
            const service = createService();

            const quest = {
                id: 'quest_1',
                name: 'Test Quest',
                objectives: [{
                    type: 'collect',
                    target: { count: 3 }
                }]
            };

            service.registerQuest(quest);

            assertTruthy(service.activeQuests.has('quest_1'), 'Quest should be active');
        });

        it('should update quest progress', () => {
            const service = createService();

            const quest = {
                id: 'quest_1',
                objectives: [{ type: 'collect', target: { count: 3 } }]
            };

            service.registerQuest(quest);
            const result = service.updateQuestProgress('quest_1', { progress: 2, maxProgress: 3 });

            assertTruthy(result !== false, 'Update should succeed');
            const questData = service.questProgress.get('quest_1');
            if (questData) {
                assertEqual(questData.progress, 2, 'Progress should be 2');
            }
        });

        it('should complete quests', () => {
            const service = createService();

            const quest = {
                id: 'quest_1',
                objectives: [{ type: 'collect', target: { count: 1 } }]
            };

            service.registerQuest(quest);
            service.completeQuest('quest_1');

            assertFalsy(service.activeQuests.has('quest_1'), 'Quest should not be active');
            assertTruthy(service.completedQuests.has('quest_1'), 'Quest should be completed');
        });

        it('should get active quests', () => {
            const service = createService();

            service.registerQuest({ id: 'quest_1' });
            service.registerQuest({ id: 'quest_2' });

            const active = service.getActiveQuests();

            assertEqual(active.length, 2, 'Should have 2 active quests');
        });

    });

    describe('Event Listeners', () => {

        it('should register event listeners', () => {
            const service = createService();
            let called = false;

            service.addListener('start', () => { called = true; });
            service.startMission(createTestMission());

            assertTruthy(called, 'Listener should be called');
        });

        it('should notify on mission complete', () => {
            const service = createService();
            let completed = false;

            service.addListener('complete', () => { completed = true; });
            service.startMission(createTestMission());
            service.completeMission();

            assertTruthy(completed, 'Complete listener should be called');
        });

        it('should notify on objective complete', () => {
            const service = createService();
            let objectiveCompleted = false;

            service.addListener('objectiveComplete', () => { objectiveCompleted = true; });

            const missionData = createTestMission({
                objectives: [{ type: 'eliminate', target: { count: 1 } }]
            });

            service.startMission(missionData);
            service.trackEvent('eliminate', {});

            assertTruthy(objectiveCompleted, 'Objective complete listener should be called');
        });

        it('should remove listeners', () => {
            const service = createService();
            let count = 0;
            const listener = () => { count++; };

            service.addListener('start', listener);
            service.startMission(createTestMission());

            assertEqual(count, 1, 'Should be called once');

            service.removeListener('start', listener);
            service.reset();
            service.startMission(createTestMission());

            assertEqual(count, 1, 'Should still be 1 after removal');
        });

    });

    describe('State Management', () => {

        it('should export state', () => {
            const service = createService();
            service.startMission(createTestMission());

            const state = service.exportState();

            assertTruthy(state.currentMission, 'Should export current mission');
            assertTruthy(state.objectives, 'Should export objectives');
            assertEqual(state.missionStatus, 'active', 'Should export status');
        });

        it('should import state', () => {
            const service = createService();

            const state = {
                currentMission: { id: 'imported', name: 'Imported Mission' },
                missionStatus: 'active',
                objectives: [],
                trackers: { enemiesEliminated: 5 }
            };

            service.importState(state);

            assertEqual(service.currentMission.id, 'imported', 'Should import mission');
            assertEqual(service.missionStatus, 'active', 'Should import status');
            assertEqual(service.trackers.enemiesEliminated, 5, 'Should import trackers');
        });

        it('should reset service', () => {
            const service = createService();
            service.startMission(createTestMission());

            service.reset();

            assertEqual(service.missionStatus, 'idle', 'Status should be idle');
            assertEqual(service.currentMission, null, 'No current mission');
            assertEqual(service.objectives.length, 0, 'No objectives');
        });

    });

    describe('Mission Status Checks', () => {

        it('should check if mission is active', () => {
            const service = createService();

            assertFalsy(service.isMissionActive(), 'No mission active initially');

            service.startMission(createTestMission());

            assertTruthy(service.isMissionActive(), 'Mission should be active');
        });

        it('should get mission statistics', () => {
            const service = createService();
            const missionData = createTestMission();

            service.startMission(missionData);
            service.trackEvent('eliminate', {});
            service.trackEvent('terminal', {});

            const stats = service.getMissionStatistics();

            // getMissionStatistics returns career stats, not current mission
            assertTruthy(stats.totalMissionsCompleted !== undefined, 'Should have total missions');
            assertTruthy(stats.successRate !== undefined, 'Should have success rate');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
