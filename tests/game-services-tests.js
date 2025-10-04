/**
 * GameServices Tests
 * Tests for the central service locator and orchestrator
 */

describe('GameServices Tests', () => {
    let services;

    beforeAll(() => {
        // Use the global GameServices instance from the game
        services = window.game?.gameServices || window.GameServices;
        if (!services) {
            console.warn('GameServices not available - tests will be skipped');
        }
    });

    describe('Service Initialization', () => {
        it('should initialize with all required services', () => {
            if (!services) return;

            assertTruthy(services.formulaService, 'Should have FormulaService');
            assertTruthy(services.resourceService, 'Should have ResourceService');
            assertTruthy(services.agentService, 'Should have AgentService');
            assertTruthy(services.inventoryService, 'Should have InventoryService');
            assertTruthy(services.equipmentService, 'Should have EquipmentService');
            assertTruthy(services.rpgService, 'Should have RPGService');
            assertTruthy(services.researchService, 'Should have ResearchService');
            assertTruthy(services.missionService, 'Should have MissionService');
            assertTruthy(services.gameStateService, 'Should have GameStateService');
        });

        it('should pass dependencies correctly during initialization', () => {
            if (!services) return;

            // Check that services receive their dependencies
            assertEqual(services.inventoryService.formulaService, services.formulaService,
                'InventoryService should receive FormulaService');
            assertEqual(services.inventoryService.equipmentService, services.equipmentService,
                'InventoryService should receive EquipmentService');
            assertEqual(services.equipmentService.formulaService, services.formulaService,
                'EquipmentService should receive FormulaService');
            assertEqual(services.rpgService.formulaService, services.formulaService,
                'RPGService should receive FormulaService');
        });

        it('should set window.GameServices globally', () => {
            // GameServices is created during game initialization
            assertTruthy(window.game?.gameServices, 'GameServices should be available on game instance');
        });
    });

    describe('Service Method Delegation', () => {
        it('should provide calculateAttackDamage method', () => {
            if (!services) return;

            assertTruthy(typeof services.calculateAttackDamage === 'function',
                'Should have calculateAttackDamage method');

            // Test basic damage calculation
            const attacker = {
                damage: 20,
                name: 'TestAgent',
                weapon: { type: 'rifle', damage: 10 }
            };
            const target = {
                protection: 5,
                name: 'TestEnemy'
            };

            const damage = services.calculateAttackDamage(attacker, target, {});
            assertTruthy(typeof damage === 'number', 'Should return numeric damage');
            assertTruthy(damage > 0, 'Damage should be positive');
        });
    });

    describe('Service Dependencies', () => {
        it('should initialize services in correct order', () => {
            if (!services) return;

            // FormulaService should be available to all services that need it
            const dependentServices = [
                services.inventoryService,
                services.equipmentService,
                services.rpgService,
                services.researchService
            ];

            dependentServices.forEach(service => {
                assertTruthy(service.formulaService,
                    `${service.constructor.name} should have FormulaService`);
            });
        });

        it('should handle GameStateService dependencies', () => {
            if (!services) return;
            const gameState = services.gameStateService;

            assertEqual(gameState.resourceService, services.resourceService,
                'GameStateService should have ResourceService');
            assertEqual(gameState.agentService, services.agentService,
                'GameStateService should have AgentService');
            assertEqual(gameState.inventoryService, services.inventoryService,
                'GameStateService should have InventoryService');
            assertEqual(gameState.missionService, services.missionService,
                'GameStateService should have MissionService');
        });
    });

    describe('Service Isolation', () => {
        it('should not have references to game object', () => {
            if (!services) return;

            // Check that services don't have game references
            assertFalsy(services.game, 'GameServices should not reference game');
            assertFalsy(services.formulaService.game, 'FormulaService should not reference game');
            assertFalsy(services.resourceService.game, 'ResourceService should not reference game');
            assertFalsy(services.agentService.game, 'AgentService should not reference game');
            assertFalsy(services.inventoryService.game, 'InventoryService should not reference game');
        });

        it('should allow services to communicate without game object', () => {
            if (!services) return;

            // Test service-to-service communication
            services.resourceService.set('credits', 1000, 'test');
            const credits = services.resourceService.get('credits');
            assertEqual(credits, 1000, 'Services should work independently');

            // Test inventory service working with resources
            const canAfford = services.resourceService.canAfford('credits', 500);
            assertTruthy(canAfford, 'ResourceService should track credits');
        });
    });
});

// Export for test runner
window.GameServicesTests = true;