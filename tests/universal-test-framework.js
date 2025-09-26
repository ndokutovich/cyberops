/**
 * Universal Test Framework
 * Works in both Node.js and Browser environments
 * Provides a unified API for test registration and execution
 */

(function(global) {
    'use strict';

    // Detect environment
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

    // Test state
    const testSuites = [];
    const testResults = [];
    let currentSuite = null;
    let currentTest = null;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    // Color codes for console output (Node.js only)
    const colors = {
        reset: isNode ? '\x1b[0m' : '',
        red: isNode ? '\x1b[31m' : '',
        green: isNode ? '\x1b[32m' : '',
        yellow: isNode ? '\x1b[33m' : '',
        blue: isNode ? '\x1b[34m' : '',
        magenta: isNode ? '\x1b[35m' : '',
        cyan: isNode ? '\x1b[36m' : '',
        gray: isNode ? '\x1b[90m' : ''
    };

    // Test framework API
    const TestFramework = {
        // Environment flags
        isNode,
        isBrowser,

        // Test registration functions
        describe(name, fn) {
            const suite = {
                name,
                tests: [],
                beforeEach: null,
                afterEach: null,
                beforeAll: null,
                afterAll: null
            };

            currentSuite = suite;
            testSuites.push(suite);

            // Execute suite definition
            if (typeof fn === 'function') {
                fn();
            }

            currentSuite = null;
            return suite;
        },

        it(name, fn) {
            if (!currentSuite) {
                throw new Error('it() must be called inside describe()');
            }

            currentSuite.tests.push({
                name,
                fn,
                skip: false
            });
        },

        it_skip(name, fn) {
            if (!currentSuite) {
                throw new Error('it.skip() must be called inside describe()');
            }

            currentSuite.tests.push({
                name,
                fn,
                skip: true
            });
        },

        // Alias for compatibility with existing tests
        xit(name, fn) {
            return TestFramework.it_skip(name, fn);
        },

        beforeEach(fn) {
            if (currentSuite) {
                currentSuite.beforeEach = fn;
            }
        },

        afterEach(fn) {
            if (currentSuite) {
                currentSuite.afterEach = fn;
            }
        },

        beforeAll(fn) {
            if (currentSuite) {
                currentSuite.beforeAll = fn;
            }
        },

        afterAll(fn) {
            if (currentSuite) {
                currentSuite.afterAll = fn;
            }
        },

        // Assertion functions
        assert: {
            equal(actual, expected, message) {
                if (actual !== expected) {
                    throw new Error(message || `Expected ${expected}, got ${actual}`);
                }
            },

            deepEqual(actual, expected, message) {
                if (JSON.stringify(actual) !== JSON.stringify(expected)) {
                    throw new Error(message || `Objects not equal:\nActual: ${JSON.stringify(actual)}\nExpected: ${JSON.stringify(expected)}`);
                }
            },

            truthy(value, message) {
                if (!value) {
                    throw new Error(message || `Expected truthy value, got ${value}`);
                }
            },

            falsy(value, message) {
                if (value) {
                    throw new Error(message || `Expected falsy value, got ${value}`);
                }
            },

            throws(fn, message) {
                let threw = false;
                try {
                    fn();
                } catch (e) {
                    threw = true;
                }
                if (!threw) {
                    throw new Error(message || 'Expected function to throw');
                }
            },

            async rejects(fn, message) {
                let threw = false;
                try {
                    await fn();
                } catch (e) {
                    threw = true;
                }
                if (!threw) {
                    throw new Error(message || 'Expected async function to reject');
                }
            },

            includes(array, item, message) {
                if (!array.includes(item)) {
                    throw new Error(message || `Array does not include ${item}`);
                }
            },

            notIncludes(array, item, message) {
                if (array.includes(item)) {
                    throw new Error(message || `Array should not include ${item}`);
                }
            }
        },

        // Test runner
        async run(options = {}) {
            const { filter = null, reporter = 'console', verbose = false } = options;

            // Reset counters
            totalTests = 0;
            passedTests = 0;
            failedTests = 0;
            skippedTests = 0;
            testResults.length = 0;

            // Start time
            const startTime = Date.now();

            // Log header
            this.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
            this.log(colors.cyan + 'Running Tests' + colors.reset);
            this.log(colors.cyan + '='.repeat(60) + colors.reset + '\n');

            // Run each suite
            for (const suite of testSuites) {
                if (filter && !suite.name.includes(filter)) {
                    continue;
                }

                this.log(colors.blue + `\n📦 ${suite.name}` + colors.reset);

                // Run beforeAll
                if (suite.beforeAll) {
                    try {
                        await suite.beforeAll();
                    } catch (error) {
                        this.log(colors.red + `  ❌ beforeAll failed: ${error.message}` + colors.reset);
                        continue;
                    }
                }

                // Run each test
                for (const test of suite.tests) {
                    totalTests++;

                    if (test.skip) {
                        skippedTests++;
                        this.log(colors.yellow + `  ⊘ ${test.name} (skipped)` + colors.reset);
                        testResults.push({
                            suite: suite.name,
                            test: test.name,
                            status: 'skipped'
                        });
                        continue;
                    }

                    try {
                        // Run beforeEach
                        if (suite.beforeEach) {
                            await suite.beforeEach();
                        }

                        // Run test
                        const testStart = Date.now();
                        await test.fn();
                        const testTime = Date.now() - testStart;

                        // Run afterEach
                        if (suite.afterEach) {
                            await suite.afterEach();
                        }

                        passedTests++;
                        this.log(colors.green + `  ✓ ${test.name}` + (verbose ? ` (${testTime}ms)` : '') + colors.reset);

                        testResults.push({
                            suite: suite.name,
                            test: test.name,
                            status: 'passed',
                            time: testTime
                        });
                    } catch (error) {
                        failedTests++;
                        this.log(colors.red + `  ✗ ${test.name}` + colors.reset);
                        this.log(colors.gray + `    ${error.message}` + colors.reset);

                        testResults.push({
                            suite: suite.name,
                            test: test.name,
                            status: 'failed',
                            error: error.message,
                            stack: error.stack
                        });

                        // Run afterEach even if test failed
                        if (suite.afterEach) {
                            try {
                                await suite.afterEach();
                            } catch (e) {
                                // Ignore afterEach errors
                            }
                        }
                    }
                }

                // Run afterAll
                if (suite.afterAll) {
                    try {
                        await suite.afterAll();
                    } catch (error) {
                        this.log(colors.red + `  ❌ afterAll failed: ${error.message}` + colors.reset);
                    }
                }
            }

            // Summary
            const totalTime = Date.now() - startTime;
            this.log('\n' + colors.cyan + '='.repeat(60) + colors.reset);
            this.log(colors.cyan + 'Test Summary' + colors.reset);
            this.log(colors.cyan + '='.repeat(60) + colors.reset);

            const summaryColor = failedTests > 0 ? colors.red : colors.green;
            this.log(`${summaryColor}Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests} | Skipped: ${skippedTests}${colors.reset}`);
            this.log(`Time: ${totalTime}ms`);

            if (failedTests > 0) {
                this.log('\n' + colors.red + 'Failed Tests:' + colors.reset);
                testResults.filter(r => r.status === 'failed').forEach(r => {
                    this.log(colors.red + `  • ${r.suite} > ${r.test}` + colors.reset);
                    if (verbose && r.stack) {
                        this.log(colors.gray + r.stack.split('\n').map(l => '    ' + l).join('\n') + colors.reset);
                    }
                });
            }

            // Return results
            return {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                skipped: skippedTests,
                time: totalTime,
                results: testResults,
                success: failedTests === 0
            };
        },

        // Clear all registered tests
        clear() {
            testSuites.length = 0;
            testResults.length = 0;
            currentSuite = null;
            currentTest = null;
        },

        // Get all registered suites
        getSuites() {
            return testSuites;
        },

        // Get test results
        getResults() {
            return testResults;
        },

        // Logging (works in both environments)
        log(message) {
            if (isNode) {
                console.log(message);
            } else if (isBrowser) {
                // In browser, strip color codes and log
                const cleanMessage = message
                    .replace(/\x1b\[\d+m/g, '');
                console.log(cleanMessage);

                // Also update DOM if test output element exists
                const outputEl = document.getElementById('test-output');
                if (outputEl) {
                    outputEl.textContent += cleanMessage + '\n';
                }
            }
        },

        // Utility: sleep function for async tests
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },

        // Mock functions for testing
        createMock() {
            const calls = [];
            const mock = function(...args) {
                calls.push(args);
                return mock.returnValue;
            };
            mock.calls = calls;
            mock.returnValue = undefined;
            mock.reset = () => {
                calls.length = 0;
                mock.returnValue = undefined;
            };
            return mock;
        }
    };

    // Export based on environment
    if (isNode) {
        // Node.js
        module.exports = TestFramework;
    } else if (isBrowser) {
        // Browser
        global.UniversalTestFramework = TestFramework;

        // Also expose common functions globally for convenience
        global.describe = TestFramework.describe.bind(TestFramework);
        global.it = TestFramework.it.bind(TestFramework);
        global.it_skip = TestFramework.it_skip.bind(TestFramework);
        global.beforeEach = TestFramework.beforeEach.bind(TestFramework);
        global.afterEach = TestFramework.afterEach.bind(TestFramework);
        global.beforeAll = TestFramework.beforeAll.bind(TestFramework);
        global.afterAll = TestFramework.afterAll.bind(TestFramework);
        global.assert = TestFramework.assert;
    }

})(typeof global !== 'undefined' ? global : window);