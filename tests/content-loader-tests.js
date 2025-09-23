/**
 * ContentLoader Tests
 * Tests for the dynamic content loading system
 */

describe('ContentLoader Tests', () => {

    describe('ContentLoader Initialization', () => {
        it('should initialize with empty state', () => {
            const loader = new ContentLoader();

            assertFalsy(loader.currentCampaign, 'Should have no current campaign');
            assertTruthy(loader.contentCache instanceof Map, 'Should have content cache Map');
            assertTruthy(loader.formulas instanceof Map, 'Should have formulas Map');
            assertTruthy(typeof loader.strings === 'object', 'Should have strings object');
        });

        it('should be available globally', () => {
            assertTruthy(window.ContentLoader, 'ContentLoader should be available globally');
            assertTruthy(window.ContentLoader instanceof ContentLoader,
                'Global ContentLoader should be instance of ContentLoader class');
        });
    });

    describe('Campaign Loading', () => {
        it('should validate campaign before loading', async () => {
            const loader = new ContentLoader();
            const invalidCampaign = { /* missing required fields */ };

            // Mock the validation
            const originalValidate = window.CampaignContentInterface?.validateCampaign;
            let validationCalled = false;

            if (window.CampaignContentInterface) {
                window.CampaignContentInterface.validateCampaign = (campaign) => {
                    validationCalled = true;
                    return { valid: false, errors: ['Missing metadata'] };
                };
            }

            const mockGame = {};
            const result = await loader.loadCampaign(invalidCampaign, mockGame);

            assertFalsy(result, 'Should reject invalid campaign');

            // Restore original
            if (window.CampaignContentInterface && originalValidate) {
                window.CampaignContentInterface.validateCampaign = originalValidate;
            }
        });

        it('should load valid campaign components', async () => {
            const loader = new ContentLoader();
            const validCampaign = {
                metadata: { name: 'Test Campaign', version: '1.0' },
                agents: [{ id: 'agent1', name: 'Test Agent' }],
                weapons: [{ id: 'weapon1', name: 'Test Weapon', damage: 10 }],
                equipment: [{ id: 'armor1', name: 'Test Armor', protection: 5 }],
                rpgConfig: { classes: {}, items: {} }
            };

            // Mock validation to succeed
            const originalValidate = window.CampaignContentInterface?.validateCampaign;
            if (window.CampaignContentInterface) {
                window.CampaignContentInterface.validateCampaign = () => ({
                    valid: true,
                    warnings: []
                });
                window.CampaignContentInterface.mergeCampaignWithDefaults = (c) => c;
            }

            const mockGame = {
                gameServices: {
                    rpgService: { setConfig: () => {} },
                    formulaService: { setFormulas: () => {}, setCombatConfig: () => {} }
                }
            };

            const result = await loader.loadCampaign(validCampaign, mockGame);
            assertTruthy(result, 'Should load valid campaign');
            assertEqual(loader.currentCampaign, validCampaign, 'Should store current campaign');

            // Restore
            if (window.CampaignContentInterface && originalValidate) {
                window.CampaignContentInterface.validateCampaign = originalValidate;
            }
        });
    });

    describe('Content Management', () => {
        it('should cache loaded content', () => {
            const loader = new ContentLoader();

            // Simulate caching
            const testAgents = [{ id: 'agent1', name: 'Agent 1' }];
            loader.contentCache.set('agents', testAgents);

            const retrieved = loader.getContent('agents');
            assertEqual(retrieved, testAgents, 'Should retrieve cached content');
        });

        it('should store RPG config in cache', () => {
            const loader = new ContentLoader();
            const rpgConfig = {
                classes: { soldier: {} },
                items: { weapons: {} }
            };

            loader.contentCache.set('rpgConfig', rpgConfig);
            const retrieved = loader.getContent('rpgConfig');

            assertEqual(retrieved, rpgConfig, 'Should cache RPG config');
        });
    });

    describe('String Management', () => {
        it('should get string by key', () => {
            const loader = new ContentLoader();
            loader.strings = {
                menu: {
                    newGame: 'New Game',
                    continue: 'Continue'
                },
                game: {
                    victory: 'Victory!'
                }
            };

            assertEqual(loader.getString('menu.newGame'), 'New Game',
                'Should get nested string');
            assertEqual(loader.getString('game.victory'), 'Victory!',
                'Should get game string');
        });

        it('should handle missing strings gracefully', () => {
            const loader = new ContentLoader();
            loader.strings = {};

            const result = loader.getString('missing.key');
            assertEqual(result, 'missing.key',
                'Should return key when string not found');
        });

        it('should support parameter replacement', () => {
            const loader = new ContentLoader();
            loader.strings = {
                messages: {
                    welcome: 'Welcome, {agent}!'
                }
            };

            const result = loader.getString('messages.welcome', { agent: 'Ghost' });
            assertEqual(result, 'Welcome, Ghost!',
                'Should replace parameters');
        });
    });

    describe('Formula Loading', () => {
        it('should load standard damage formula', () => {
            const loader = new ContentLoader();

            const damage = loader.standardDamageFormula(
                { damage: 20 },
                { protection: 5 },
                { damage: 10 }
            );

            assertTruthy(typeof damage === 'number', 'Should return numeric damage');
            assertTruthy(damage > 0, 'Damage should be positive');
        });

        it('should load different formula sets', () => {
            const loader = new ContentLoader();
            const mockGame = {
                gameServices: {
                    formulaService: {
                        setFormulas: function(formulas) {
                            this.formulas = formulas;
                        },
                        setCombatConfig: function(config) {
                            this.config = config;
                        }
                    }
                }
            };

            loader.loadCombatFormulas(mockGame);

            // Check that formulas are set
            assertTruthy(loader.formulas.has('damage'), 'Should have damage formula');
            assertTruthy(loader.formulas.has('hitChance'), 'Should have hit chance formula');
            assertTruthy(loader.formulas.has('critical'), 'Should have critical formula');
        });
    });

    describe('Service Integration', () => {
        it('should initialize services when loading content', () => {
            const loader = new ContentLoader();
            let agentServiceCalled = false;
            let inventoryServiceCalled = false;

            // Mock services
            window.GameServices = {
                agentService: {
                    clearAllAgents: () => { agentServiceCalled = true; },
                    addAvailableAgent: () => {}
                },
                inventoryService: {
                    initialize: () => { inventoryServiceCalled = true; }
                },
                resourceService: {
                    setCredits: () => {},
                    setResearchPoints: () => {}
                }
            };

            // Load agents
            loader.currentCampaign = {
                agents: [{ id: 'test', name: 'Test' }]
            };
            loader.loadAgents({});

            assertTruthy(agentServiceCalled, 'Should call AgentService');

            // Load equipment
            loader.currentCampaign = {
                weapons: [{ id: 'w1', name: 'Weapon' }]
            };
            loader.loadEquipment({});

            assertTruthy(inventoryServiceCalled, 'Should call InventoryService');
        });
    });
});

// Export for test runner
window.ContentLoaderTests = true;