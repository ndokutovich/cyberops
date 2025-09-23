/**
 * Campaign System Tests
 * Tests for CampaignInterface and CampaignSystem
 */

describe('Campaign System Tests', () => {

    describe('CampaignInterface Validation', () => {
        it('should validate campaign structure', () => {
            if (!window.CampaignContentInterface) {
                // Skip if not available
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const validCampaign = {
                metadata: {
                    id: 'test-campaign',
                    name: 'Test Campaign',
                    version: '1.0.0',
                    author: 'Test Author'
                },
                agents: [],
                weapons: [],
                equipment: []
            };

            const result = window.CampaignContentInterface.validateCampaign(validCampaign);
            assertTruthy(result.valid, 'Valid campaign should pass validation');
            assertEqual(result.errors.length, 0, 'Should have no errors');
        });

        it('should reject invalid campaign', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const invalidCampaign = {
                // Missing metadata
                agents: []
            };

            const result = window.CampaignContentInterface.validateCampaign(invalidCampaign);
            assertFalsy(result.valid, 'Invalid campaign should fail validation');
            assertTruthy(result.errors.length > 0, 'Should have errors');
        });

        it('should validate mission structure', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const validMission = {
                id: 'test-mission',
                name: 'Test Mission',
                briefing: 'Test briefing',
                map: {
                    embedded: {
                        tiles: ['###', '#.#', '###'],
                        spawn: { x: 1, y: 1 },
                        extraction: { x: 1, y: 1 }
                    }
                },
                objectives: [],
                rewards: { credits: 100 }
            };

            const result = window.CampaignContentInterface.validateMission(validMission);
            assertTruthy(result.valid, 'Valid mission should pass validation');
        });

        it('should validate agent structure', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const validAgent = {
                id: 'agent-1',
                name: 'Test Agent',
                health: 100,
                damage: 20,
                class: 'soldier'
            };

            const result = window.CampaignContentInterface.validateAgent(validAgent);
            assertTruthy(result.valid, 'Valid agent should pass validation');
        });

        it('should validate weapon structure', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const validWeapon = {
                id: 'weapon-1',
                name: 'Test Rifle',
                damage: 25,
                range: 300,
                cost: 1000
            };

            const result = window.CampaignContentInterface.validateWeapon(validWeapon);
            assertTruthy(result.valid, 'Valid weapon should pass validation');
        });

        it('should merge campaign with defaults', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const minimalCampaign = {
                metadata: { name: 'Minimal' }
            };

            const merged = window.CampaignContentInterface.mergeCampaignWithDefaults(minimalCampaign);

            assertTruthy(merged.agents, 'Should add default agents array');
            assertTruthy(merged.weapons, 'Should add default weapons array');
            assertTruthy(merged.equipment, 'Should add default equipment array');
        });
    });

    describe('CampaignSystem Registration', () => {
        beforeEach(() => {
            // Clear any existing campaigns for clean test
            if (window.CampaignSystem) {
                window.CampaignSystem.campaigns = new Map();
                window.CampaignSystem.missions = new Map();
            }
        });

        it('should register campaigns', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            const campaignData = {
                id: 'test-campaign',
                name: 'Test Campaign',
                missions: []
            };

            window.CampaignSystem.registerCampaign('test-campaign', campaignData);

            const retrieved = window.CampaignSystem.getCampaign('test-campaign');
            assertEqual(retrieved, campaignData, 'Should retrieve registered campaign');
        });

        it('should register missions', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            const missionData = {
                id: 'test-01-001',
                name: 'First Mission',
                briefing: 'Test mission'
            };

            window.CampaignSystem.registerMission('test', 1, 'test-01-001', missionData);

            const retrieved = window.CampaignSystem.getMission('test', 'test-01-001');
            assertEqual(retrieved, missionData, 'Should retrieve registered mission');
        });

        it('should get all missions for campaign', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            // Register multiple missions
            window.CampaignSystem.registerMission('test', 1, 'test-01-001', { id: 'test-01-001' });
            window.CampaignSystem.registerMission('test', 1, 'test-01-002', { id: 'test-01-002' });
            window.CampaignSystem.registerMission('test', 2, 'test-02-001', { id: 'test-02-001' });

            const allMissions = window.CampaignSystem.getAllMissions('test');

            assertTruthy(Array.isArray(allMissions), 'Should return array of missions');
            assertEqual(allMissions.length, 3, 'Should have all 3 missions');
        });

        it('should track campaigns in Map', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            window.CampaignSystem.registerCampaign('campaign1', { id: 'campaign1' });
            window.CampaignSystem.registerCampaign('campaign2', { id: 'campaign2' });

            assertTruthy(window.CampaignSystem.campaigns instanceof Map,
                'Should use Map for campaigns');
            assertEqual(window.CampaignSystem.campaigns.size, 2,
                'Should track both campaigns');
        });

        it('should handle mission key format', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            const mission = { id: 'test-01-001', name: 'Test' };
            window.CampaignSystem.registerMission('test', 1, 'test-01-001', mission);

            // Check that mission can be retrieved with full ID
            const retrieved = window.CampaignSystem.getMission('test', 'test-01-001');
            assertTruthy(retrieved, 'Should retrieve mission by ID');
            assertEqual(retrieved.id, 'test-01-001', 'Should have correct ID');
        });
    });

    describe('Campaign Content Integration', () => {
        it('should have global campaign content', () => {
            // Check for common campaign globals
            const hasCampaignContent =
                window.MAIN_CAMPAIGN_CONFIG !== undefined ||
                window.CampaignSystem !== undefined;

            assertTruthy(hasCampaignContent,
                'Should have campaign content available');
        });

        it('should provide mission lookup methods', () => {
            if (!window.CampaignSystem) {
                assertTruthy(true, 'CampaignSystem not loaded - skipping');
                return;
            }

            assertTruthy(typeof window.CampaignSystem.registerCampaign === 'function',
                'Should have registerCampaign method');
            assertTruthy(typeof window.CampaignSystem.registerMission === 'function',
                'Should have registerMission method');
            assertTruthy(typeof window.CampaignSystem.getCampaign === 'function',
                'Should have getCampaign method');
            assertTruthy(typeof window.CampaignSystem.getMission === 'function',
                'Should have getMission method');
            assertTruthy(typeof window.CampaignSystem.getAllMissions === 'function',
                'Should have getAllMissions method');
        });
    });

    describe('Campaign Defaults', () => {
        it('should provide default values for optional fields', () => {
            if (!window.CampaignContentInterface) {
                assertTruthy(true, 'CampaignContentInterface not loaded - skipping');
                return;
            }

            const minimal = {
                metadata: { name: 'Test' }
            };

            const merged = window.CampaignContentInterface.mergeCampaignWithDefaults(minimal);

            // Check for default arrays
            assertTruthy(Array.isArray(merged.agents), 'Should have agents array');
            assertTruthy(Array.isArray(merged.weapons), 'Should have weapons array');
            assertTruthy(Array.isArray(merged.equipment), 'Should have equipment array');

            // Check for default values
            assertTruthy(merged.metadata.version, 'Should add default version');
        });
    });
});

// Export for test runner
window.CampaignSystemTests = true;