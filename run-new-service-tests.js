#!/usr/bin/env node
/**
 * Quick test runner for new service tests
 */

const TestFramework = require('./tests/universal-test-framework.js');

// Setup global test functions
global.describe = TestFramework.describe.bind(TestFramework);
global.it = TestFramework.it.bind(TestFramework);
global.assertEqual = TestFramework.assert.equal;
global.assertTruthy = TestFramework.assert.truthy;
global.assertFalsy = TestFramework.assert.falsy;
global.assertThrows = TestFramework.assert.throws;
global.sleep = TestFramework.sleep;

// Mock browser globals
global.window = {
    Logger: class MockLogger {
        constructor(name) {
            this.name = name;
        }
        trace(...args) {}
        debug(...args) {}
        info(...args) {}
        warn(...args) {}
        error(...args) {}
        fatal(...args) {}
    }
};

global.localStorage = {
    _data: {},
    setItem(key, value) { this._data[key] = value; },
    getItem(key) { return this._data.hasOwnProperty(key) ? this._data[key] : null; },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; }
};

global.document = {
    _elements: {},
    getElementById(id) {
        if (!this._elements[id]) {
            this._elements[id] = {
                id,
                style: { display: 'block', background: '' },
                textContent: '',
                innerHTML: '',
                className: '',
                children: [],
                width: 800,
                height: 600,
                appendChild(child) { this.children.push(child); },
                querySelector() { return null; },
                remove() {},
                toDataURL() { return 'data:image/jpeg;base64,mockdata'; }
            };
        }
        return this._elements[id];
    },
    createElement(tag) {
        return {
            tagName: tag,
            id: '',
            className: '',
            innerHTML: '',
            textContent: '',
            style: {},
            children: [],
            appendChild(child) { this.children.push(child); },
            querySelector() { return null; },
            addEventListener() {},
            remove() {},
            getContext() {
                return { drawImage() {} };
            }
        };
    },
    body: {
        appendChild() {},
        removeChild() {}
    }
};

// Load services
const SaveGameService = require('./js/services/save-game-service.js');
const HUDService = require('./js/services/hud-service.js');
const MissionStateService = require('./js/services/mission-state-service.js');

global.SaveGameService = SaveGameService;
global.HUDService = HUDService;
global.MissionStateService = MissionStateService;

console.log('\n🚀 Running New Service Tests\n');

// Load test files
require('./tests/save-game-service-tests.js');
require('./tests/hud-service-tests.js');
require('./tests/mission-state-service-tests.js');

// Run tests
TestFramework.run({ verbose: false }).then(results => {
    console.log('\n📊 Final Results');
    console.log('================');
    console.log(`Total: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);

    if (results.failed > 0) {
        console.log('\n❌ Failed Tests:');
        if (results.failures && results.failures.length > 0) {
            results.failures.forEach((f, i) => {
                console.log(`\n${i + 1}. ${f.testName}`);
                console.log(`   Error: ${f.error.message}`);
            });
        }
        process.exit(1);
    } else {
        console.log('\n✅ All tests passed!');
        process.exit(0);
    }
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
