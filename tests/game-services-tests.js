/**
 * GameServices Tests
 * Tests for the central service locator and orchestrator
 */

describe('GameServices Tests', () => {

    describe('Service Initialization', () => {
        it('should initialize with all required services', () => {
            const services = new GameServices();

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
            const services = new GameServices();

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
            assertTruthy(window.GameServices, 'GameServices should be available globally');
            assertTruthy(window.GameServices instanceof GameServices,
                'Global GameServices should be instance of GameServices class');
        });
    });

    describe('Service Method Delegation', () => {
        it('should provide calculateAttackDamage method', () => {
            const services = new GameServices();

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
            const services = new GameServices();

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
            const services = new GameServices();
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
            const services = new GameServices();

            // Check that services don't have game references
            assertFalsy(services.game, 'GameServices should not reference game');
            assertFalsy(services.formulaService.game, 'FormulaService should not reference game');
            assertFalsy(services.resourceService.game, 'ResourceService should not reference game');
            assertFalsy(services.agentService.game, 'AgentService should not reference game');
            assertFalsy(services.inventoryService.game, 'InventoryService should not reference game');
        });

        it('should allow services to communicate without game object', () => {
            const services = new GameServices();

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