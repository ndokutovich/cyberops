/**
 * Diagnostic Test
 * Simple test to check what's available in the test environment
 */

describe('Diagnostic Tests', () => {

    it('should check environment setup', () => {
        console.warn('=== DIAGNOSTIC TEST START ===');

        // Check if window exists
        console.warn('1. window exists:', typeof window !== 'undefined');

        // Check if CampaignContentInterface exists
        console.warn('2. window.CampaignContentInterface exists:', typeof window.CampaignContentInterface);

        if (window.CampaignContentInterface) {
            console.warn('3. CampaignContentInterface properties:');
            console.warn('   - validateCampaign:', typeof window.CampaignContentInterface.validateCampaign);
            console.warn('   - mergeCampaignWithDefaults:', typeof window.CampaignContentInterface.mergeCampaignWithDefaults);
            console.warn('   - getDefaultCampaign:', typeof window.CampaignContentInterface.getDefaultCampaign);

            // Try a simple validation
            try {
                const result = window.CampaignContentInterface.validateCampaign({});
                console.warn('4. Simple validation result:', result);
            } catch (e) {
                console.error('4. Validation error:', e);
            }

            // Try a simple merge
            try {
                const merged = window.CampaignContentInterface.mergeCampaignWithDefaults({ metadata: { name: 'Test' } });
                console.warn('5. Simple merge result keys:', merged ? Object.keys(merged) : 'null');
                console.warn('   - Has agents:', !!merged?.agents);
                console.warn('   - Agents is array:', Array.isArray(merged?.agents));
            } catch (e) {
                console.error('5. Merge error:', e);
            }
        }

        // Check ContentLoader
        console.warn('6. ContentLoader exists:', typeof ContentLoader);
        if (typeof ContentLoader !== 'undefined') {
            try {
                const loader = new ContentLoader();
                console.warn('7. ContentLoader instance created:', !!loader);
            } catch (e) {
                console.error('7. ContentLoader instantiation error:', e);
            }
        }

        // Check other globals
        console.warn('8. Other globals:');
        console.warn('   - Logger:', typeof Logger);
        console.warn('   - GameServices:', typeof GameServices);
        console.warn('   - CyberOpsGame:', typeof CyberOpsGame);

        console.warn('=== DIAGNOSTIC TEST END ===');

        // Always pass this test - it's just for diagnostics
        assertTruthy(true, 'Diagnostic test complete');
    });
});

// Export for test runner
window.DiagnosticTests = true;