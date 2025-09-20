/**
 * Test Summary Generator
 * Provides a comprehensive overview of all test suites
 */

class TestSummary {
    static async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            suites: [],
            totals: {
                suites: 0,
                tests: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                duration: 0
            }
        };

        // Get all test suites
        const suites = testFramework.suites;

        for (const [suiteName, suite] of suites) {
            const suiteInfo = {
                name: suiteName,
                tests: suite.tests.length,
                testList: suite.tests.map(t => ({
                    name: t.name,
                    skip: t.skip
                }))
            };

            report.suites.push(suiteInfo);
            report.totals.suites++;
            report.totals.tests += suite.tests.length;
            report.totals.skipped += suite.tests.filter(t => t.skip).length;
        }

        return report;
    }

    static printReport(report) {
        console.log('═══════════════════════════════════════════════════════');
        console.log('                  TEST SUITE OVERVIEW                  ');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Generated: ${new Date(report.timestamp).toLocaleString()}`);
        console.log('');

        console.log('📊 SUMMARY');
        console.log('─────────────────────────────────────────────');
        console.log(`Total Suites: ${report.totals.suites}`);
        console.log(`Total Tests:  ${report.totals.tests}`);
        console.log(`Skipped:      ${report.totals.skipped}`);
        console.log('');

        console.log('📦 TEST SUITES');
        console.log('─────────────────────────────────────────────');

        for (const suite of report.suites) {
            console.log(`\n${suite.name} (${suite.tests} tests)`);
            for (const test of suite.testList) {
                const status = test.skip ? '⏭️ SKIP' : '📝 TEST';
                console.log(`  ${status}: ${test.name}`);
            }
        }

        console.log('\n═══════════════════════════════════════════════════════');
    }

    static async analyzeTestCoverage() {
        const coverage = {
            byCategory: {
                core: [],
                dialog: [],
                state: [],
                integration: [],
                unit: []
            },
            byArea: {
                initialization: [],
                navigation: [],
                data: [],
                persistence: [],
                ui: [],
                validation: []
            }
        };

        // Categorize tests
        for (const [suiteName, suite] of testFramework.suites) {
            for (const test of suite.tests) {
                // Category classification
                if (suiteName.includes('Basic') || suiteName.includes('Simple')) {
                    coverage.byCategory.core.push(test.name);
                } else if (suiteName.includes('Dialog')) {
                    coverage.byCategory.dialog.push(test.name);
                } else if (suiteName.includes('State')) {
                    coverage.byCategory.state.push(test.name);
                }

                // Area classification
                if (test.name.includes('initialize') || test.name.includes('loaded')) {
                    coverage.byArea.initialization.push(test.name);
                } else if (test.name.includes('navigate') || test.name.includes('navigation')) {
                    coverage.byArea.navigation.push(test.name);
                } else if (test.name.includes('data') || test.name.includes('state')) {
                    coverage.byArea.data.push(test.name);
                }
            }
        }

        return coverage;
    }

    static getTestStats() {
        const stats = {
            total: 0,
            byStatus: {
                ready: 0,      // Can run without issues
                domDependent: 0, // Needs DOM elements
                dataDependent: 0 // Needs specific data
            },
            bySuite: {}
        };

        // Known DOM-dependent suites
        const domDependentSuites = ['Dialog Conversion Tests', 'State Machine Transition Tests'];

        for (const [suiteName, suite] of testFramework.suites) {
            const testCount = suite.tests.length;
            stats.total += testCount;
            stats.bySuite[suiteName] = testCount;

            if (domDependentSuites.includes(suiteName)) {
                stats.byStatus.domDependent += testCount;
            } else {
                stats.byStatus.ready += testCount;
            }
        }

        return stats;
    }
}

// Make available globally
window.TestSummary = TestSummary;

// Auto-generate report when loaded
console.log('📋 Test Summary Module Loaded - Use TestSummary.generateReport() for overview');