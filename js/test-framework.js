/**
 * Lightweight In-Browser Test Framework for CyberOps Game
 * No build process, no dependencies - just pure testing
 */

class TestFramework {
    constructor() {
        this.suites = new Map();
        this.results = [];
        this.currentSuite = null;
        this.currentTest = null;
        this.isRunning = false;  // Prevent multiple simultaneous runs
        this.executionCount = 0;  // Track how many times tests have run
        this.maxExecutions = 1;   // Prevent infinite loops
        this.stats = {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration: 0
        };
        this.config = {
            verbose: false,
            stopOnFailure: false,
            captureScreenshots: false,
            timeout: 2000  // Reduced from 5000 to prevent long waits
        };
    }

    // Test registration
    describe(suiteName, callback) {
        const suite = {
            name: suiteName,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };
        this.currentSuite = suite;
        this.suites.set(suiteName, suite);
        callback();
        this.currentSuite = null;
    }

    it(testName, callback) {
        if (!this.currentSuite) {
            throw new Error('it() must be called within describe()');
        }
        this.currentSuite.tests.push({
            name: testName,
            callback,
            skip: false
        });
    }

    xit(testName, callback) {
        if (!this.currentSuite) {
            throw new Error('xit() must be called within describe()');
        }
        this.currentSuite.tests.push({
            name: testName,
            callback,
            skip: true
        });
    }

    beforeEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = callback;
        }
    }

    afterEach(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = callback;
        }
    }

    beforeAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = callback;
        }
    }

    afterAll(callback) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = callback;
        }
    }

    // Test execution
    async run(suiteFilter = null) {
        // Prevent concurrent runs
        if (this.isRunning) {
            console.warn('⚠️ Tests are already running, skipping duplicate run');
            return this.results;
        }

        // Prevent infinite loops
        this.executionCount++;
        if (this.executionCount > this.maxExecutions) {
            console.error('❌ Test execution limit reached - possible infinite loop detected');
            return this.results;
        }

        this.isRunning = true;
        console.log(`🧪 Starting test run ${this.executionCount}...`);
        const startTime = performance.now();
        this.results = [];
        this.stats = { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 };

        for (const [suiteName, suite] of this.suites) {
            if (suiteFilter && !suiteName.includes(suiteFilter)) continue;

            console.group(`📦 ${suiteName}`);
            const suiteResult = await this.runSuite(suite);
            this.results.push(suiteResult);
            console.groupEnd();
        }

        this.stats.duration = performance.now() - startTime;
        this.printSummary();

        // Mark run as complete
        this.isRunning = false;

        return this.results;
    }

    async runSuite(suite) {
        const result = {
            name: suite.name,
            tests: [],
            passed: 0,
            failed: 0,
            skipped: 0
        };

        // Run beforeAll
        if (suite.beforeAll) {
            try {
                await this.runWithTimeout(suite.beforeAll());
            } catch (error) {
                console.error('beforeAll failed:', error);
                return result;
            }
        }

        // Run each test
        for (const test of suite.tests) {
            if (test.skip) {
                result.tests.push({ name: test.name, status: 'skipped' });
                result.skipped++;
                this.stats.skipped++;
                console.log(`⏭️  ${test.name} (skipped)`);
                continue;
            }

            // Run beforeEach
            if (suite.beforeEach) {
                try {
                    await this.runWithTimeout(suite.beforeEach());
                } catch (error) {
                    console.error('beforeEach failed:', error);
                }
            }

            // Run test
            const testResult = await this.runTest(test);
            result.tests.push(testResult);

            if (testResult.status === 'passed') {
                result.passed++;
                this.stats.passed++;
                console.log(`✅ ${test.name}`);
            } else {
                result.failed++;
                this.stats.failed++;
                console.error(`❌ ${test.name}`);
                if (testResult.error) {
                    console.error('   ', testResult.error);
                }
                if (this.config.stopOnFailure) {
                    break;
                }
            }

            // Run afterEach
            if (suite.afterEach) {
                try {
                    await this.runWithTimeout(suite.afterEach());
                } catch (error) {
                    console.error('afterEach failed:', error);
                }
            }

            this.stats.total++;
        }

        // Run afterAll
        if (suite.afterAll) {
            try {
                await this.runWithTimeout(suite.afterAll());
            } catch (error) {
                console.error('afterAll failed:', error);
            }
        }

        return result;
    }

    async runTest(test) {
        const result = {
            name: test.name,
            status: 'pending',
            error: null,
            duration: 0
        };

        const startTime = performance.now();
        try {
            await this.runWithTimeout(test.callback());
            result.status = 'passed';
        } catch (error) {
            result.status = 'failed';
            result.error = error.message || error;
            if (this.config.captureScreenshots && window.game) {
                result.screenshot = this.captureGameState();
            }
        }
        result.duration = performance.now() - startTime;

        return result;
    }

    async runWithTimeout(promise, timeout = this.config.timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
            )
        ]);
    }

    // Assertions
    assert(condition, message = 'Assertion failed') {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertDeepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(message || `Objects not equal:\nActual: ${JSON.stringify(actual, null, 2)}\nExpected: ${JSON.stringify(expected, null, 2)}`);
        }
    }

    assertContains(haystack, needle, message) {
        if (!haystack.includes(needle)) {
            throw new Error(message || `Expected "${haystack}" to contain "${needle}"`);
        }
    }

    assertTruthy(value, message) {
        if (!value) {
            throw new Error(message || `Expected truthy value, got ${value}`);
        }
    }

    assertFalsy(value, message) {
        if (value) {
            throw new Error(message || `Expected falsy value, got ${value}`);
        }
    }

    fail(message = 'Test failed') {
        throw new Error(message);
    }

    async assertThrows(callback, message) {
        let thrown = false;
        try {
            await callback();
        } catch (e) {
            thrown = true;
        }
        if (!thrown) {
            throw new Error(message || 'Expected function to throw');
        }
    }

    // Game-specific helpers
    captureGameState() {
        if (!window.game) return null;

        return {
            screen: game.screen,
            dialogStack: game.dialogEngine?.stateStack || [],
            currentDialog: game.dialogEngine?.currentState,
            agents: game.agents?.map(a => ({ name: a.name, health: a.health, x: a.x, y: a.y })),
            credits: game.credits,
            researchPoints: game.researchPoints,
            currentMission: game.currentMissionDef?.id
        };
    }

    async waitFor(condition, timeout = 5000, checkInterval = 100) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (await condition()) return true;
            await this.sleep(checkInterval);
        }
        throw new Error('Timeout waiting for condition');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Reporting
    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`Total:   ${this.stats.total}`);
        console.log(`✅ Passed: ${this.stats.passed}`);
        console.log(`❌ Failed: ${this.stats.failed}`);
        console.log(`⏭️  Skipped: ${this.stats.skipped}`);
        console.log(`⏱️  Duration: ${this.stats.duration.toFixed(2)}ms`);
        console.log('='.repeat(50));

        if (this.stats.failed === 0 && this.stats.passed > 0) {
            console.log('🎉 All tests passed!');
        } else if (this.stats.failed > 0) {
            console.log('💔 Some tests failed');
        }
    }

    generateHTMLReport() {
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Report - ${new Date().toISOString()}</title>
            <style>
                body { font-family: monospace; background: #1a1a1a; color: #0f0; padding: 20px; }
                .suite { margin: 20px 0; border: 1px solid #0f0; padding: 10px; }
                .suite-title { font-size: 18px; font-weight: bold; }
                .test { margin: 5px 0 5px 20px; }
                .test.passed { color: #0f0; }
                .test.failed { color: #f00; }
                .test.skipped { color: #888; }
                .error { color: #f00; margin-left: 40px; font-size: 12px; }
                .stats { border: 2px solid #0f0; padding: 10px; margin: 20px 0; }
                .stats h2 { margin: 0 0 10px 0; }
            </style>
        </head>
        <body>
            <h1>🧪 CyberOps Test Report</h1>
            <div class="stats">
                <h2>Summary</h2>
                <div>Total: ${this.stats.total}</div>
                <div>✅ Passed: ${this.stats.passed}</div>
                <div>❌ Failed: ${this.stats.failed}</div>
                <div>⏭️ Skipped: ${this.stats.skipped}</div>
                <div>⏱️ Duration: ${this.stats.duration.toFixed(2)}ms</div>
            </div>
            ${this.results.map(suite => `
                <div class="suite">
                    <div class="suite-title">📦 ${suite.name}</div>
                    ${suite.tests.map(test => `
                        <div class="test ${test.status}">
                            ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'}
                            ${test.name}
                            ${test.duration ? `(${test.duration.toFixed(2)}ms)` : ''}
                        </div>
                        ${test.error ? `<div class="error">${test.error}</div>` : ''}
                    `).join('')}
                </div>
            `).join('')}
        </body>
        </html>`;

        return html;
    }

    // Export results
    exportResults(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.results, null, 2);
        } else if (format === 'junit') {
            return this.generateJUnitXML();
        } else if (format === 'html') {
            return this.generateHTMLReport();
        }
    }

    generateJUnitXML() {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="CyberOps Tests" time="${this.stats.duration / 1000}" tests="${this.stats.total}" failures="${this.stats.failed}" skipped="${this.stats.skipped}">
    ${this.results.map(suite => `
    <testsuite name="${suite.name}" tests="${suite.tests.length}" failures="${suite.failed}" skipped="${suite.skipped}">
        ${suite.tests.map(test => `
        <testcase name="${test.name}" time="${(test.duration || 0) / 1000}">
            ${test.status === 'failed' ? `<failure message="${test.error}"/>` : ''}
            ${test.status === 'skipped' ? '<skipped/>' : ''}
        </testcase>`).join('')}
    </testsuite>`).join('')}
</testsuites>`;
        return xml;
    }
}

// Global test instance
window.testFramework = new TestFramework();

// Convenience methods
window.describe = (name, callback) => testFramework.describe(name, callback);
window.it = (name, callback) => testFramework.it(name, callback);
window.xit = (name, callback) => testFramework.xit(name, callback);
window.beforeEach = (callback) => testFramework.beforeEach(callback);
window.afterEach = (callback) => testFramework.afterEach(callback);
window.beforeAll = (callback) => testFramework.beforeAll(callback);
window.afterAll = (callback) => testFramework.afterAll(callback);

// Assertions
window.assert = (condition, message) => testFramework.assert(condition, message);
window.assertEqual = (actual, expected, message) => testFramework.assertEqual(actual, expected, message);
window.assertDeepEqual = (actual, expected, message) => testFramework.assertDeepEqual(actual, expected, message);
window.assertContains = (haystack, needle, message) => testFramework.assertContains(haystack, needle, message);
window.assertTruthy = (value, message) => testFramework.assertTruthy(value, message);
window.assertFalsy = (value, message) => testFramework.assertFalsy(value, message);
window.fail = (message) => testFramework.fail(message);
window.assertThrows = async (callback, message) => await testFramework.assertThrows(callback, message);

// Utilities
window.waitFor = async (condition, timeout, interval) => await testFramework.waitFor(condition, timeout, interval);
window.sleep = (ms) => testFramework.sleep(ms);