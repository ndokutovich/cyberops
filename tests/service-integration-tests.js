/**
 * Service Integration Tests
 * Tests for AgentService and ResourceService integration
 */

describe('Service Integration Tests', () => {
    let game;

    beforeAll(() => {
        game = window.game;
    });

    describe('ResourceService Integration', () => {
        it('should access credits through compatibility layer', () => {
            // Set credits using service
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 1000, 'test');
                assertEqual(game.credits, 1000, 'Credits should be 1000');

                // Verify service has the value
                const serviceCredits = game.gameServices.resourceService.get('credits');
                assertEqual(serviceCredits, 1000, 'Service should have same credits');
            }
        });

        it('should spend credits through service', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 5000, 'test');

                const success = game.gameServices.resourceService.spend('credits', 1000, 'test');
                assertTruthy(success, 'Should be able to spend 1000 credits');
                assertEqual(game.credits, 4000, 'Credits should be 4000 after spending');
            }
        });

        it('should prevent overspending', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 500, 'test');

                const success = game.gameServices.resourceService.spend('credits', 1000, 'test');
                assertFalsy(success, 'Should not be able to spend more than available');
                assertEqual(game.credits, 500, 'Credits should remain 500');
            }
        });

        it('should handle research points', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('researchPoints', 100, 'test');
                assertEqual(game.researchPoints, 100, 'Research points should be 100');

                game.gameServices.resourceService.add('researchPoints', 50, 'test');
                assertEqual(game.researchPoints, 150, 'Research points should be 150');
            }
        });

        it('should handle transactions', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 1000, 'test');
                game.gameServices.resourceService.set('researchPoints', 100, 'test');

                const success = game.gameServices.resourceService.transaction([
                    { resource: 'credits', amount: 500, operation: 'spend' },
                    { resource: 'researchPoints', amount: 50, operation: 'add' }
                ], 'test transaction');

                assertTruthy(success, 'Transaction should succeed');
                assertEqual(game.credits, 500, 'Credits should be 500');
                assertEqual(game.researchPoints, 150, 'Research points should be 150');
            }
        });
    });

    describe('AgentService Integration', () => {
        beforeEach(() => {
            // Initialize with test agents
            if (game.gameServices?.agentService) {
                game.gameServices.agentService.initialize([
                    { id: 'test1', name: 'Alpha', cost: 1000, hired: false },
                    { id: 'test2', name: 'Beta', cost: 1500, hired: true },
                    { id: 'test3', name: 'Gamma', cost: 2000, hired: false }
                ]);
            }
        });

        it('should access agents through compatibility layer', () => {
            const available = game.availableAgents;
            const active = game.activeAgents;

            assertTruthy(Array.isArray(available), 'Available agents should be array');
            assertTruthy(Array.isArray(active), 'Active agents should be array');

            if (game.gameServices?.agentService) {
                assertEqual(available.length, 2, 'Should have 2 available agents');
                assertEqual(active.length, 1, 'Should have 1 active agent');
            }
        });

        it('should hire agent with credit deduction', () => {
            if (game.gameServices?.agentService && game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 5000, 'test');

                const success = game.gameServices.agentService.hireAgent('test1');
                assertTruthy(success, 'Should be able to hire agent');

                const active = game.activeAgents;
                assertEqual(active.length, 2, 'Should have 2 active agents');
                assertEqual(game.credits, 4000, 'Credits should be deducted');
            }
        });

        it('should not hire without sufficient credits', () => {
            if (game.gameServices?.agentService && game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 500, 'test');

                const success = game.gameServices.agentService.hireAgent('test3'); // Costs 2000
                assertFalsy(success, 'Should not be able to hire expensive agent');

                assertEqual(game.credits, 500, 'Credits should remain unchanged');
            }
        });

        it('should handle agent damage and death', () => {
            if (game.gameServices?.agentService) {
                const agent = game.gameServices.agentService.getAgent('test2');
                assertTruthy(agent, 'Should find agent Beta');

                // Damage agent
                game.gameServices.agentService.damageAgent('test2', 50, 'test');
                assertEqual(agent.health, 50, 'Agent health should be 50');

                // Kill agent
                game.gameServices.agentService.damageAgent('test2', 60, 'test');
                assertFalsy(agent.alive, 'Agent should be dead');

                const fallen = game.fallenAgents;
                assertEqual(fallen.length, 1, 'Should have 1 fallen agent');
            }
        });

        it('should find agents by multiple identifiers', () => {
            if (game.gameServices?.agentService) {
                const byId = game.gameServices.agentService.getAgent('test1');
                const byName = game.gameServices.agentService.getAgent('Alpha');

                assertTruthy(byId, 'Should find agent by ID');
                assertTruthy(byName, 'Should find agent by name');
                assertEqual(byId.id, byName.id, 'Should be same agent');
            }
        });
    });

    describe('Save/Load Integration', () => {
        it('should export service states', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 7777, 'test');
                game.gameServices.resourceService.set('researchPoints', 333, 'test');

                const resourceState = game.gameServices.resourceService.exportState();
                assertTruthy(resourceState, 'Should export resource state');
                assertEqual(resourceState.resources.credits, 7777, 'Exported credits should match');
                assertEqual(resourceState.resources.researchPoints, 333, 'Exported research should match');
            }
        });

        it('should import service states', () => {
            if (game.gameServices?.resourceService) {
                const state = {
                    resources: {
                        credits: 9999,
                        researchPoints: 555,
                        worldControl: 25
                    }
                };

                game.gameServices.resourceService.importState(state);

                assertEqual(game.credits, 9999, 'Credits should be imported');
                assertEqual(game.researchPoints, 555, 'Research points should be imported');
                assertEqual(game.worldControl, 25, 'World control should be imported');
            }
        });
    });

    describe('Read-Only Properties', () => {
        it('should read credits through compatibility layer', () => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', 1000, 'test');
                assertEqual(game.credits, 1000, 'Should read credits');

                // Verify reading via service
                const serviceCredits = game.gameServices.resourceService.get('credits');
                assertEqual(serviceCredits, 1000, 'Service should have same value');
            }
        });

        it('should work with legacy agent arrays', () => {
            // This tests that old code accessing arrays directly still works
            const agents = game.activeAgents;
            assertTruthy(Array.isArray(agents), 'Should return array');

            // Test array methods work
            const names = agents.map(a => a.name);
            assertTruthy(Array.isArray(names), 'Array methods should work');
        });
    });
});