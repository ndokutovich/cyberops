#!/usr/bin/env node

/**
 * Console Test Runner
 * Runs tests in Node.js environment without browser
 */

const fs = require('fs');
const path = require('path');

// Load universal test framework
const TestFramework = require('./universal-test-framework.js');

// Make framework functions global for tests
global.describe = TestFramework.describe.bind(TestFramework);
global.it = TestFramework.it.bind(TestFramework);
global.it_skip = TestFramework.it_skip.bind(TestFramework);
global.xit = TestFramework.xit.bind(TestFramework);  // Alias for it_skip
global.beforeEach = TestFramework.beforeEach.bind(TestFramework);
global.afterEach = TestFramework.afterEach.bind(TestFramework);
global.beforeAll = TestFramework.beforeAll.bind(TestFramework);
global.afterAll = TestFramework.afterAll.bind(TestFramework);
global.assert = TestFramework.assert;
global.sleep = TestFramework.sleep;

// Also add individual assertion functions for compatibility
global.assertEqual = TestFramework.assert.equal;
global.assertDeepEqual = TestFramework.assert.deepEqual;
global.assertTruthy = TestFramework.assert.truthy;
global.assertFalsy = TestFramework.assert.falsy;
global.assertThrows = TestFramework.assert.throws;
global.assertRejects = TestFramework.assert.rejects;
global.assertIncludes = TestFramework.assert.includes;
global.assertNotIncludes = TestFramework.assert.notIncludes;

// Mock browser globals for tests that check for them
global.window = {
    Logger: null,
    GameServices: null,
    CombatService: null,
    FormulaService: null,
    ResourceService: null,
    AgentService: null,
    MissionService: null
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    filter: null,
    verbose: false,
    watch: false
};

args.forEach(arg => {
    if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
    } else if (arg === '--watch' || arg === '-w') {
        options.watch = true;
    } else if (arg.startsWith('--filter=')) {
        options.filter = arg.split('=')[1];
    } else if (!arg.startsWith('-')) {
        options.filter = arg;
    }
});

// Auto-discover test files
function discoverTestFiles() {
    const testFiles = [];
    const testsDir = __dirname;

    // Find all test files (multiple patterns)
    const files = fs.readdirSync(testsDir);
    files.forEach(file => {
        // Include various test file patterns
        if (file.endsWith('.test.js') ||
            file.endsWith('-tests.js') ||
            file.endsWith('-test.js') ||
            (file.includes('test') && file.endsWith('.js'))) {

            // Exclude non-test files
            if (!file.includes('console-runner') &&
                !file.includes('test-loader') &&
                !file.includes('test-framework') &&
                !file.includes('test-diagnostic') &&
                !file.includes('test-summary')) {
                testFiles.push(path.join(testsDir, file));
            }
        }
    });

    // Also check subdirectories
    const consoleSuiteDir = path.join(testsDir, 'console-suites');
    if (fs.existsSync(consoleSuiteDir)) {
        const suiteFiles = fs.readdirSync(consoleSuiteDir);
        suiteFiles.forEach(file => {
            if (file.endsWith('.js') && file.includes('test')) {
                testFiles.push(path.join(consoleSuiteDir, file));
            }
        });
    }

    return testFiles;
}

// Load test files
function loadTests() {
    // Clear any previously loaded tests
    TestFramework.clear();

    // Clear require cache to reload test files
    Object.keys(require.cache).forEach(key => {
        if (key.includes('.test.js')) {
            delete require.cache[key];
        }
    });

    const testFiles = discoverTestFiles();

    console.log(`Found ${testFiles.length} test files:\n`);
    testFiles.forEach(file => {
        const fileName = path.basename(file);
        console.log(`  📄 ${fileName}`);
        try {
            require(file);
        } catch (error) {
            console.error(`Failed to load ${fileName}: ${error.message}`);
        }
    });

    return testFiles.length;
}

// Run tests
async function runTests() {
    console.clear();
    console.log('🚀 Console Test Runner\n');

    const fileCount = loadTests();
    if (fileCount === 0) {
        console.log('No test files found! Create files ending with .test.js');
        return;
    }

    const results = await TestFramework.run({
        filter: options.filter,
        verbose: options.verbose
    });

    // Exit code based on results
    if (!options.watch) {
        process.exit(results.success ? 0 : 1);
    }

    return results;
}

// Watch mode
async function watchMode() {
    console.log('👀 Watch mode enabled. Press Ctrl+C to exit.\n');

    // Initial run
    await runTests();

    // Watch for changes
    const testsDir = __dirname;
    let debounceTimer = null;

    fs.watch(testsDir, { recursive: true }, (eventType, filename) => {
        if (!filename?.endsWith('.js')) return;

        // Debounce to avoid multiple runs
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.clear();
            console.log(`\n🔄 File changed: ${filename}\n`);
            await runTests();
        }, 200);
    });
}

// Show help
function showHelp() {
    console.log(`
Console Test Runner
Usage: node console-runner.js [options] [filter]

Options:
  --filter=PATTERN  Run only tests matching pattern
  --verbose, -v     Show detailed output
  --watch, -w       Watch for file changes
  --help, -h        Show this help

Examples:
  node console-runner.js                    # Run all tests
  node console-runner.js --verbose          # Run with detailed output
  node console-runner.js "service"          # Run tests containing "service"
  node console-runner.js --watch            # Watch mode
`);
}

// Main
async function main() {
    if (args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }

    if (options.watch) {
        await watchMode();
    } else {
        await runTests();
    }
}

// Handle errors
process.on('unhandledRejection', error => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});

// Run
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});