/**
 * Test Diagnostic Tool
 * Helps identify which specific tests are failing
 */

class TestDiagnostic {
    static async runDiagnostics() {
        console.log('🔍 Running Test Diagnostics...');

        const results = {
            suites: {},
            failures: [],
            passes: [],
            skipped: []
        };

        // Get the last test run results
        if (window.testFramework && window.testFramework.results) {
            for (const suite of window.testFramework.results) {
                results.suites[suite.name] = {
                    total: suite.tests.length,
                    passed: suite.passed || 0,
                    failed: suite.failed || 0,
                    skipped: suite.skipped || 0,
                    failures: []
                };

                for (const test of suite.tests) {
                    if (test.status === 'failed') {
                        results.failures.push({
                            suite: suite.name,
                            test: test.name,
                            error: test.error
                        });
                        results.suites[suite.name].failures.push(test.name);
                    } else if (test.status === 'passed') {
                        results.passes.push({
                            suite: suite.name,
                            test: test.name
                        });
                    } else if (test.status === 'skipped') {
                        results.skipped.push({
                            suite: suite.name,
                            test: test.name
                        });
                    }
                }
            }
        }

        // Print diagnostic report
        console.log('\n═══════════════════════════════════════════════');
        console.log('              TEST DIAGNOSTIC REPORT');
        console.log('═══════════════════════════════════════════════');

        if (results.failures.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            for (const failure of results.failures) {
                console.log(`  Suite: ${failure.suite}`);
                console.log(`  Test:  ${failure.test}`);
                console.log(`  Error: ${failure.error}`);
                console.log('  ---');
            }
        }

        console.log('\n📊 SUITE BREAKDOWN:');
        for (const [suiteName, suiteData] of Object.entries(results.suites)) {
            console.log(`\n${suiteName}:`);
            console.log(`  Total:   ${suiteData.total}`);
            console.log(`  Passed:  ${suiteData.passed}`);
            console.log(`  Failed:  ${suiteData.failed}`);
            console.log(`  Skipped: ${suiteData.skipped}`);
            if (suiteData.failures.length > 0) {
                console.log(`  Failed tests: ${suiteData.failures.join(', ')}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════');

        return results;
    }

    static identifyProblemTests() {
        const problems = [];

        // Known problematic patterns
        const problematicNavigations = [
            'hire-confirm',  // Requires agent data
            'hire-success',  // Requires transaction data
            'npc-interaction' // Requires NPC data
        ];

        // Check if any test is trying to navigate to these
        if (window.testFramework && window.testFramework.suites) {
            for (const [suiteName, suite] of window.testFramework.suites) {
                for (const test of suite.tests) {
                    const testString = test.callback.toString();
                    for (const problemNav of problematicNavigations) {
                        if (testString.includes(problemNav)) {
                            problems.push({
                                suite: suiteName,
                                test: test.name,
                                issue: `Tries to navigate to ${problemNav} which requires special data`
                            });
                        }
                    }
                }
            }
        }

        if (problems.length > 0) {
            console.log('\n⚠️ PROBLEMATIC TESTS FOUND:');
            for (const problem of problems) {
                console.log(`  ${problem.suite} - ${problem.test}`);
                console.log(`    Issue: ${problem.issue}`);
            }
        }

        return problems;
    }
}

// Make available globally
window.TestDiagnostic = TestDiagnostic;

console.log('🩺 Test Diagnostic Tool Loaded - Use TestDiagnostic.runDiagnostics() after running tests');