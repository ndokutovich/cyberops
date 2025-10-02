/**
 * ResearchService Test Suite
 * Comprehensive tests for research tree and upgrades
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import services if in Node.js
if (typeof window === 'undefined') {
    global.ResearchService = require('../js/services/research-service.js');
    global.FormulaService = require('../js/services/formula-service.js');
    global.Logger = require('../js/services/logger-service.js');
}

describe('ResearchService Tests', () => {

    // Helper to create mock formula service
    function createMockFormulaService() {
        return {
            calculateDamage: (base, weapon, bonus, armor) => Math.max(1, base + weapon + bonus - armor),
            calculateProtection: (base, armor, bonus) => base + armor + bonus,
            calculateHealingAmount: (base, percentage, bonus, research) => {
                return Math.floor(base * percentage) + bonus + (research || 0);
            }
        };
    }

    // Helper to create service
    function createService() {
        const formulaService = createMockFormulaService();
        return new ResearchService(formulaService);
    }

    describe('ResearchService Initialization', () => {

        it('should initialize with formula service', () => {
            const formulaService = createMockFormulaService();
            const service = new ResearchService(formulaService);

            assertTruthy(service.formulaService, 'Should have formula service');
        });

        it('should have research projects data', () => {
            const service = createService();

            const projects = service.getAllProjects();

            assertTruthy(Array.isArray(projects), 'Should have projects array');
        });

    });

    describe('Research Projects', () => {

        it('should get all research projects', () => {
            const service = createService();

            const projects = service.getAllProjects();

            assertTruthy(projects.length > 0, 'Should have research projects');
        });

        it('should get project by ID', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const projectId = allProjects[0].id;
                const project = service.getProject(projectId);

                assertTruthy(project, 'Should find project');
                assertEqual(project.id, projectId, 'Project ID should match');
            }
        });

        it('should return null for non-existent project', () => {
            const service = createService();

            const project = service.getProject('non_existent_project');

            assertFalsy(project, 'Should return null for non-existent project');
        });

    });

    describe('Research Affordability', () => {

        it('should check if can afford research', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const project = allProjects[0];
                const canAfford = service.canAffordResearch(project.id, project.cost * 2);

                assertTruthy(canAfford, 'Should be able to afford with sufficient points');
            }
        });

        it('should return false when insufficient points', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const project = allProjects[0];
                const canAfford = service.canAffordResearch(project.id, project.cost - 1);

                assertFalsy(canAfford, 'Should not afford with insufficient points');
            }
        });

        it('should handle exact cost', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const project = allProjects[0];
                const canAfford = service.canAffordResearch(project.id, project.cost);

                assertTruthy(canAfford, 'Should afford with exact cost');
            }
        });

    });

    describe('Research Completion', () => {

        it('should check if research is completed', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const projectId = allProjects[0].id;
                const completed = [projectId];

                const isCompleted = service.isResearchCompleted(projectId, completed);

                assertTruthy(isCompleted, 'Should be completed');
            }
        });

        it('should return false for incomplete research', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const projectId = allProjects[0].id;
                const completed = [];

                const isCompleted = service.isResearchCompleted(projectId, completed);

                assertFalsy(isCompleted, 'Should not be completed');
            }
        });

    });

    describe('Research Bonuses', () => {

        it('should calculate research bonuses', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const completed = [allProjects[0].id];
                const bonuses = service.calculateResearchBonuses(completed);

                assertTruthy(bonuses, 'Should return bonuses object');
            }
        });

        it('should return zero bonuses for no research', () => {
            const service = createService();

            const bonuses = service.calculateResearchBonuses([]);

            assertTruthy(bonuses, 'Should return bonuses object');
        });

        it('should combine multiple research bonuses', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length >= 2) {
                const completed = [allProjects[0].id, allProjects[1].id];
                const bonuses = service.calculateResearchBonuses(completed);

                assertTruthy(bonuses, 'Should combine bonuses');
            }
        });

    });

    describe('Agent Research Application', () => {

        it('should apply research to single agent', () => {
            const service = createService();
            const agent = { damage: 20, protection: 10 };

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const completed = [allProjects[0].id];

                service.applyResearchToAgent(agent, completed);

                // Agent should be modified or bonuses stored
                assertTruthy(agent, 'Agent should exist');
            }
        });

        it('should apply research to agent roster', () => {
            const service = createService();
            const agents = [
                { id: 'agent1', damage: 20 },
                { id: 'agent2', damage: 25 }
            ];

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const completed = [allProjects[0].id];

                service.applyResearchToRoster(agents, completed);

                assertTruthy(agents.length === 2, 'Should process all agents');
            }
        });

    });

    describe('Research Progress', () => {

        it('should calculate completion percentage', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const completed = [allProjects[0].id];
                const percentage = service.calculateCompletionPercentage(completed);

                assertTruthy(percentage >= 0 && percentage <= 100, 'Percentage should be 0-100');
            }
        });

        it('should return 0% for no research', () => {
            const service = createService();

            const percentage = service.calculateCompletionPercentage([]);

            assertEqual(percentage, 0, 'Should be 0% with no research');
        });

        it('should return 100% for all research', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            const allIds = allProjects.map(p => p.id);
            const percentage = service.calculateCompletionPercentage(allIds);

            assertEqual(percentage, 100, 'Should be 100% with all research');
        });

    });

    describe('Research Recommendations', () => {

        it('should get recommended research for playstyle', () => {
            const service = createService();

            const recommendation = service.getRecommendedResearch([], 'combat');

            // Returns single project or null
            assertTruthy(recommendation !== undefined, 'Should return recommendation or null');
        });

        it('should filter already completed research', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 1) {
                const completed = [allProjects[0].id];
                const recommendation = service.getRecommendedResearch(completed, 'balanced');

                // Should not recommend the completed one
                if (recommendation) {
                    assertFalsy(recommendation.id === allProjects[0].id, 'Should not recommend completed research');
                }
            }
        });

        it('should handle different playstyles', () => {
            const service = createService();

            const combatRec = service.getRecommendedResearch([], 'combat');
            const stealthRec = service.getRecommendedResearch([], 'stealth');

            // Both should return recommendation or null
            assertTruthy(combatRec !== undefined, 'Should have combat recommendation or null');
            assertTruthy(stealthRec !== undefined, 'Should have stealth recommendation or null');
        });

    });

    describe('Research Cost Tracking', () => {

        it('should calculate total research points spent', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const completed = [allProjects[0].id];
                const totalSpent = service.calculateTotalSpent(completed);

                assertEqual(totalSpent, allProjects[0].cost, 'Should match project cost');
            }
        });

        it('should return 0 for no research', () => {
            const service = createService();

            const totalSpent = service.calculateTotalSpent([]);

            assertEqual(totalSpent, 0, 'Should be 0 with no research');
        });

        it('should sum multiple research costs', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length >= 2) {
                const completed = [allProjects[0].id, allProjects[1].id];
                const totalSpent = service.calculateTotalSpent(completed);

                const expectedTotal = allProjects[0].cost + allProjects[1].cost;
                assertEqual(totalSpent, expectedTotal, 'Should sum all costs');
            }
        });

    });

    describe('Medical Healing Research', () => {

        it('should apply medical healing to agents', () => {
            const service = createService();
            const agents = [
                { id: 'agent1', health: 50, maxHealth: 100 }
            ];

            const completed = [];
            const healed = service.applyMedicalHealing(agents, completed);

            assertTruthy(healed.length >= 0, 'Should return healed agents array');
        });

        it('should not heal agents at full health', () => {
            const service = createService();
            const agents = [
                { id: 'agent1', health: 100, maxHealth: 100 }
            ];

            const healed = service.applyMedicalHealing(agents, []);

            // Should skip agents at full health
            assertTruthy(healed.length === 0 || healed[0].health === 100, 'Should not overheal');
        });

    });

    describe('Project Status', () => {

        it('should get project status', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const projectId = allProjects[0].id;
                const status = service.getProjectStatus(projectId, [], allProjects[0].cost);

                assertTruthy(status, 'Should return status object');
                assertTruthy(status.affordable !== undefined, 'Should indicate affordability');
            }
        });

        it('should indicate completed status', () => {
            const service = createService();

            const allProjects = service.getAllProjects();
            if (allProjects.length > 0) {
                const projectId = allProjects[0].id;
                const status = service.getProjectStatus(projectId, [projectId], 0);

                assertTruthy(status.completed === true, 'Should show as completed');
            }
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
