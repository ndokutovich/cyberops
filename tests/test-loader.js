/**
 * Test Loader
 * Dynamically loads all test files for browser test runner
 * Auto-discovers and includes both console tests and browser-only tests
 */

(function() {
    'use strict';

    // Test file registry
    const testFiles = [
        // Universal tests (work in both Node and Browser)
        'services.test.js',
        'services-console.test.js',
        'facade-architecture.test.js',

        // Browser-only tests (require DOM)
        'campaign-system-tests.js',
        'complete-dialog-tests.js',
        'content-loader-tests.js',
        'diagnostic-test.js',
        'dialog-basic-tests.js',
        'dialog-test-suite.js',
        'game-integration-tests.js',
        'game-services-tests.js',
        'logger-tests.js',
        'modal-dialog-tests.js',
        'rpg-managers-tests.js',
        'rpg-stat-allocation.test.js',  // New test
        'screen-dialog-tests.js',
        'screen-layer-tests.js',
        'screen-manager-tests.js',
        'service-integration-tests.js',
        'services-comprehensive-tests.js',
        'simple-test-suite.js',
        'state-machine-tests.js'
    ];

    // Test loader state
    let loadedCount = 0;
    let failedCount = 0;
    const loadErrors = [];

    // Load a test file
    function loadTestFile(fileName) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = `tests/${fileName}`;

            script.onload = () => {
                loadedCount++;
                console.log(`✅ Loaded: ${fileName}`);
                resolve({ success: true, file: fileName });
            };

            script.onerror = () => {
                failedCount++;
                const error = `Failed to load: ${fileName}`;
                loadErrors.push(error);
                console.error(`❌ ${error}`);
                resolve({ success: false, file: fileName, error });
            };

            document.head.appendChild(script);
        });
    }

    // Load universal test framework first
    function loadFramework() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'tests/universal-test-framework.js';

            script.onload = () => {
                console.log('✅ Universal Test Framework loaded');
                resolve();
            };

            script.onerror = () => {
                console.error('❌ Failed to load Universal Test Framework');
                reject(new Error('Framework load failed'));
            };

            document.head.appendChild(script);
        });
    }

    // Auto-discover test files (in real implementation, would use server API)
    function discoverTestFiles() {
        // For now, use the hardcoded list
        // In production, this could fetch from server or use a manifest
        return testFiles;
    }

    // Load all tests
    async function loadAllTests() {
        console.log('📦 Loading test files...\n');

        try {
            // Load framework first
            await loadFramework();

            // Discover and load all test files
            const files = discoverTestFiles();
            const loadPromises = files.map(file => loadTestFile(file));
            const results = await Promise.all(loadPromises);

            // Summary
            console.log('\n' + '='.repeat(60));
            console.log(`Test Loading Summary`);
            console.log('='.repeat(60));
            console.log(`Total files: ${files.length}`);
            console.log(`Successfully loaded: ${loadedCount}`);
            console.log(`Failed to load: ${failedCount}`);

            if (loadErrors.length > 0) {
                console.log('\nLoad Errors:');
                loadErrors.forEach(err => console.error(`  • ${err}`));
            }

            // Notify test runner
            if (window.onTestsLoaded) {
                window.onTestsLoaded({
                    total: files.length,
                    loaded: loadedCount,
                    failed: failedCount,
                    errors: loadErrors
                });
            }

            return results;

        } catch (error) {
            console.error('Fatal error loading tests:', error);
            throw error;
        }
    }

    // Export loader API
    window.TestLoader = {
        loadAllTests,
        discoverTestFiles,
        getLoadedCount: () => loadedCount,
        getFailedCount: () => failedCount,
        getLoadErrors: () => loadErrors
    };

    // Auto-load if in test runner page
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            if (document.getElementById('test-runner-container')) {
                loadAllTests();
            }
        });
    } else if (document.getElementById('test-runner-container')) {
        // Already loaded, run immediately
        loadAllTests();
    }

})();