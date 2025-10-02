/**
 * ResourceService Test Suite
 * Comprehensive tests for resource management
 */

// Import test framework
if (typeof describe === 'undefined') {
    const { describe, it, assertEqual, assertTruthy, assertFalsy, sleep } = require('../js/test-framework.js');
}

// Import ResourceService if in Node.js
if (typeof window === 'undefined') {
    global.ResourceService = require('../js/services/resource-service.js');
    global.Logger = require('../js/services/logger-service.js');
}

describe('ResourceService Tests', () => {

    // Helper function to create ResourceService instance
    function createService() {
        return new ResourceService();
    }

    describe('ResourceService Initialization', () => {

        it('should initialize with zero resources', () => {
            const service = createService();

            assertEqual(service.get('credits'), 0, 'Credits should start at 0');
            assertEqual(service.get('researchPoints'), 0, 'Research points should start at 0');
            assertEqual(service.get('worldControl'), 0, 'World control should start at 0');
        });

        it('should initialize with provided values', () => {
            const service = createService();
            service.initialize({ credits: 5000, researchPoints: 100, worldControl: 25 });

            assertEqual(service.get('credits'), 5000, 'Credits should be 5000');
            assertEqual(service.get('researchPoints'), 100, 'Research points should be 100');
            assertEqual(service.get('worldControl'), 25, 'World control should be 25');
        });

        it('should have correct constraints', () => {
            const service = createService();

            assertEqual(service.constraints.credits.min, 0, 'Credits min should be 0');
            assertEqual(service.constraints.worldControl.max, 100, 'World control max should be 100');
        });

    });

    describe('Get Operations', () => {

        it('should get resource values', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            assertEqual(service.get('credits'), 1000, 'Should get correct credits');
        });

        it('should get all resources', () => {
            const service = createService();
            service.initialize({ credits: 1000, researchPoints: 50 });

            const all = service.getAll();

            assertEqual(all.credits, 1000, 'Should have correct credits');
            assertEqual(all.researchPoints, 50, 'Should have correct research points');
        });

        it('should have convenience getters', () => {
            const service = createService();
            service.initialize({ credits: 2000, researchPoints: 75, worldControl: 30 });

            assertEqual(service.getCredits(), 2000, 'getCredits() should work');
            assertEqual(service.getResearchPoints(), 75, 'getResearchPoints() should work');
            assertEqual(service.getWorldControl(), 30, 'getWorldControl() should work');
        });

    });

    describe('Set Operations', () => {

        it('should set resource values', () => {
            const service = createService();

            service.set('credits', 1500);

            assertEqual(service.get('credits'), 1500, 'Credits should be set to 1500');
        });

        it('should clamp values to constraints', () => {
            const service = createService();

            service.set('worldControl', 150);

            assertEqual(service.get('worldControl'), 100, 'World control should be clamped to 100');
        });

        it('should prevent negative values', () => {
            const service = createService();

            service.set('credits', -100);

            assertEqual(service.get('credits'), 0, 'Credits should be clamped to 0');
        });

        it('should have convenience setters', () => {
            const service = createService();

            service.setCredits(3000);
            service.setResearchPoints(150);

            assertEqual(service.getCredits(), 3000, 'setCredits() should work');
            assertEqual(service.getResearchPoints(), 150, 'setResearchPoints() should work');
        });

        it('should record history for changes', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.set('credits', 1500, 'test reason');

            const history = service.getHistory(1);
            assertEqual(history[0].oldValue, 1000, 'History should record old value');
            assertEqual(history[0].newValue, 1500, 'History should record new value');
            assertEqual(history[0].reason, 'test reason', 'History should record reason');
        });

    });

    describe('Add Operations', () => {

        it('should add to resources', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.add('credits', 500);

            assertEqual(service.get('credits'), 1500, 'Credits should be 1500');
        });

        it('should handle negative adds as spends', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            const result = service.add('credits', -200);

            assertEqual(service.get('credits'), 800, 'Credits should be 800');
            assertTruthy(result, 'Should succeed');
        });

        it('should clamp additions to max', () => {
            const service = createService();
            service.initialize({ worldControl: 95 });

            service.add('worldControl', 10);

            assertEqual(service.get('worldControl'), 100, 'World control should be clamped to 100');
        });

    });

    describe('Spend Operations', () => {

        it('should spend resources', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            const result = service.spend('credits', 300);

            assertTruthy(result, 'Spend should succeed');
            assertEqual(service.get('credits'), 700, 'Credits should be 700');
        });

        it('should fail when insufficient resources', () => {
            const service = createService();
            service.initialize({ credits: 100 });

            const result = service.spend('credits', 200);

            assertFalsy(result, 'Spend should fail');
            assertEqual(service.get('credits'), 100, 'Credits should remain 100');
        });

        it('should handle negative spends as adds', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            const result = service.spend('credits', -200);

            assertEqual(service.get('credits'), 1200, 'Credits should be 1200');
            assertTruthy(result, 'Should succeed');
        });

    });

    describe('Affordability Checks', () => {

        it('should check if can afford', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            assertTruthy(service.canAfford('credits', 500), 'Should be able to afford 500');
            assertTruthy(service.canAfford('credits', 1000), 'Should be able to afford 1000');
            assertFalsy(service.canAfford('credits', 1001), 'Should not afford 1001');
        });

    });

    describe('Transaction Operations', () => {

        it('should perform multi-resource transaction', () => {
            const service = createService();
            service.initialize({ credits: 1000, researchPoints: 100 });

            const result = service.transaction([
                { resource: 'credits', amount: 200, operation: 'spend' },
                { resource: 'researchPoints', amount: 50, operation: 'add' }
            ]);

            assertTruthy(result, 'Transaction should succeed');
            assertEqual(service.get('credits'), 800, 'Credits should be 800');
            assertEqual(service.get('researchPoints'), 150, 'Research points should be 150');
        });

        it('should rollback on insufficient resources', () => {
            const service = createService();
            service.initialize({ credits: 100, researchPoints: 100 });

            const result = service.transaction([
                { resource: 'credits', amount: 200, operation: 'spend' }, // Can't afford
                { resource: 'researchPoints', amount: 50, operation: 'add' }
            ]);

            assertFalsy(result, 'Transaction should fail');
            assertEqual(service.get('credits'), 100, 'Credits should remain 100');
            assertEqual(service.get('researchPoints'), 100, 'Research points should remain 100');
        });

        it('should handle set operations in transactions', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            const result = service.transaction([
                { resource: 'credits', amount: 5000, operation: 'set' }
            ]);

            assertTruthy(result, 'Transaction should succeed');
            assertEqual(service.get('credits'), 5000, 'Credits should be set to 5000');
        });

    });

    describe('Mission Rewards', () => {

        it('should apply mission rewards', () => {
            const service = createService();
            service.initialize({ credits: 1000, researchPoints: 0, worldControl: 0 });

            const result = service.applyMissionRewards({
                credits: 2000,
                researchPoints: 50,
                worldControl: 5
            });

            assertTruthy(result, 'Should apply rewards');
            assertEqual(service.get('credits'), 3000, 'Credits should be 3000');
            assertEqual(service.get('researchPoints'), 50, 'Research points should be 50');
            assertEqual(service.get('worldControl'), 5, 'World control should be 5');
        });

        it('should handle partial rewards', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.applyMissionRewards({ credits: 500 });

            assertEqual(service.get('credits'), 1500, 'Credits should be 1500');
        });

    });

    describe('Purchase Operations', () => {

        it('should purchase with simple cost', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            const result = service.purchase(300, 'Test Item');

            assertTruthy(result, 'Purchase should succeed');
            assertEqual(service.get('credits'), 700, 'Credits should be 700');
        });

        it('should fail purchase when insufficient credits', () => {
            const service = createService();
            service.initialize({ credits: 100 });

            const result = service.purchase(300, 'Test Item');

            assertFalsy(result, 'Purchase should fail');
            assertEqual(service.get('credits'), 100, 'Credits should remain 100');
        });

        it('should handle multi-resource costs', () => {
            const service = createService();
            service.initialize({ credits: 1000, researchPoints: 100 });

            const result = service.purchase({
                credits: 500,
                researchPoints: 50
            }, 'Expensive Item');

            assertTruthy(result, 'Purchase should succeed');
            assertEqual(service.get('credits'), 500, 'Credits should be 500');
            assertEqual(service.get('researchPoints'), 50, 'Research points should be 50');
        });

    });

    describe('Sell Operations', () => {

        it('should sell item for credits', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.sell(500, 'Test Item');

            assertEqual(service.get('credits'), 1500, 'Credits should be 1500');
        });

        it('should calculate sell price from object', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.sell({ cost: 1000 }, 'Test Item');

            // 1000 * 0.6 = 600
            assertEqual(service.get('credits'), 1600, 'Credits should be 1600 (60% of 1000)');
        });

    });

    describe('Event Listeners', () => {

        it('should notify specific listeners', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            let notified = false;
            let changeData = null;

            service.addListener('credits', (change) => {
                notified = true;
                changeData = change;
            });

            service.add('credits', 500);

            assertTruthy(notified, 'Listener should be notified');
            assertEqual(changeData.oldValue, 1000, 'Should receive old value');
            assertEqual(changeData.newValue, 1500, 'Should receive new value');
            assertEqual(changeData.delta, 500, 'Should receive delta');
        });

        it('should notify global listeners', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            let notifications = 0;

            service.addListener('any', () => {
                notifications++;
            });

            service.add('credits', 100);
            service.add('researchPoints', 50);

            assertEqual(notifications, 2, 'Should receive 2 notifications');
        });

        it('should remove listeners', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            let count = 0;
            const listener = () => { count++; };

            service.addListener('credits', listener);
            service.add('credits', 100);

            assertEqual(count, 1, 'Should be called once');

            service.removeListener('credits', listener);
            service.add('credits', 100);

            assertEqual(count, 1, 'Should still be 1 after removal');
        });

    });

    describe('History Tracking', () => {

        it('should track resource changes', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.add('credits', 500, 'reward');
            service.spend('credits', 200, 'purchase');

            const history = service.getHistory(2);

            assertEqual(history.length, 2, 'Should have 2 history entries');
            assertEqual(history[0].reason, 'reward', 'First entry should be reward');
            assertEqual(history[1].reason, 'purchase', 'Second entry should be purchase');
        });

        it('should limit history size', () => {
            const service = createService();
            service.maxHistory = 5;

            for (let i = 0; i < 10; i++) {
                service.add('credits', 1);
            }

            assertTruthy(service.history.length <= 5, 'History should be limited to 5');
        });

    });

    describe('State Management', () => {

        it('should export state', () => {
            const service = createService();
            service.initialize({ credits: 1000, researchPoints: 100 });

            const state = service.exportState();

            assertEqual(state.resources.credits, 1000, 'Exported credits should be 1000');
            assertEqual(state.resources.researchPoints, 100, 'Exported research points should be 100');
            assertTruthy(state.history, 'Should export history');
        });

        it('should import state', () => {
            const service = createService();

            service.importState({
                resources: {
                    credits: 5000,
                    researchPoints: 200,
                    worldControl: 50,
                    intel: 100
                }
            });

            assertEqual(service.get('credits'), 5000, 'Credits should be imported');
            assertEqual(service.get('researchPoints'), 200, 'Research points should be imported');
            assertEqual(service.get('worldControl'), 50, 'World control should be imported');
        });

        it('should validate imported values', () => {
            const service = createService();

            service.importState({
                resources: {
                    worldControl: 150  // Over max
                }
            });

            assertEqual(service.get('worldControl'), 100, 'Should clamp to max (100)');
        });

        it('should reset to defaults', () => {
            const service = createService();
            service.initialize({ credits: 5000, researchPoints: 500 });

            service.reset();

            assertEqual(service.get('credits'), 10000, 'Credits should reset to 10000');
            assertEqual(service.get('researchPoints'), 0, 'Research points should reset to 0');
            assertEqual(service.history.length, 0, 'History should be cleared');
        });

    });

    describe('Constraint Validation', () => {

        it('should enforce minimum values', () => {
            const service = createService();
            service.initialize({ credits: 1000 });

            service.spend('credits', 2000);

            assertEqual(service.get('credits'), 1000, 'Credits should not go negative');
        });

        it('should enforce maximum values', () => {
            const service = createService();

            service.set('worldControl', 200);

            assertEqual(service.get('worldControl'), 100, 'World control should be capped at 100');
        });

    });

});

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { describe, it };
}
