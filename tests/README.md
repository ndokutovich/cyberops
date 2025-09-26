# CyberOps Game - Testing System

## 🌐 Dual-Mode Testing Architecture

This project features a **universal testing system** that allows tests to run in both **Node.js (console)** and **browser** environments using a single test collection. Tests are written once and run anywhere!

## 🚀 Quick Start

### Console Testing (No Browser Required)

```bash
# Run all console-compatible tests
npm test

# Watch mode - auto-runs on file changes
npm run test:watch

# Verbose mode - detailed output
npm run test:verbose

# Filter tests
npm test services    # Run only service tests
node tests/console-runner.js "resource"  # Run tests containing "resource"
```

### Browser Testing (GUI & DOM Tests)

```bash
# Start a local server
npm start
# or
python -m http.server 8000

# Open in browser
http://localhost:8000/test-runner.html
```

## 📁 Test File Structure

```
tests/
├── universal-test-framework.js   # Core framework (works in both environments)
├── console-runner.js              # Node.js test runner
├── test-loader.js                 # Browser test auto-loader
├── README.md                      # This file
│
├── *.test.js                      # Universal tests (work in both environments)
│   ├── services.test.js          # Service architecture tests
│   ├── architecture.test.js      # (future) Architecture validation
│   └── formulas.test.js          # (future) Formula calculations
│
└── *-tests.js                     # Browser-only tests (require DOM)
    ├── dialog-test-suite.js      # Dialog conversion tests
    ├── dialog-basic-tests.js     # Basic dialog navigation
    ├── state-machine-tests.js    # State transitions
    └── dialog-state-audit.js     # State coverage audit
```

## ✍️ Writing Universal Tests

Tests that work in both environments follow this pattern:

```javascript
// services.test.js

// Framework is auto-loaded in both environments
describe('My Test Suite', () => {

    let service;

    beforeEach(() => {
        // Setup before each test
        service = createMockService();
    });

    afterEach(() => {
        // Cleanup after each test
        service = null;
    });

    it('should do something', () => {
        // Your test
        const result = service.doSomething();
        assert.equal(result, expected);
    });

    it('should handle async operations', async () => {
        // Async tests supported
        const result = await service.fetchData();
        assert.truthy(result);
    });

    it_skip('should skip this test', () => {
        // This test will be skipped
    });
});
```

## 🎯 Available Assertions

```javascript
assert.equal(actual, expected, message)       // Strict equality
assert.deepEqual(actual, expected, message)   // Deep object comparison
assert.truthy(value, message)                 // Check truthy
assert.falsy(value, message)                  // Check falsy
assert.throws(fn, message)                    // Check if throws
assert.rejects(asyncFn, message)              // Check if async rejects
assert.includes(array, item, message)         // Array includes
assert.notIncludes(array, item, message)      // Array doesn't include
```

## 🏃 Console Runner Features

### Command Line Options

```bash
node tests/console-runner.js [options] [filter]

Options:
  --filter=PATTERN  Run only tests matching pattern
  --verbose, -v     Show detailed output
  --watch, -w       Watch for file changes
  --help, -h        Show help

Examples:
  node tests/console-runner.js                    # Run all tests
  node tests/console-runner.js --verbose          # Verbose output
  node tests/console-runner.js "service"          # Filter by name
  node tests/console-runner.js --watch            # Watch mode
```

### Watch Mode

In watch mode, tests automatically re-run when any `.js` file changes in the tests directory.

## 🌐 Browser Test Runner

The browser test runner (`test-runner.html`) provides:

- **🚀 RUN ALL TESTS** - Runs both universal and browser-only tests
- **🌐 UNIVERSAL TESTS** - Runs only console-compatible tests
- **💬 TEST DIALOGS** - Tests dialog system (browser-only)
- **🔄 TEST STATE MACHINE** - Tests state transitions
- **🔍 AUDIT STATES** - Audits dialog coverage
- **📋 TEST SUMMARY** - Shows test statistics
- **🩺 DIAGNOSTICS** - Debug helper

### Visual Features

- Real-time test output with color coding
- Progress bar showing pass rate
- Export results as JSON, HTML, or JUnit XML
- Verbose and stop-on-failure modes
- Auto-run via URL parameter: `test-runner.html?auto=true`

## 🔄 Test Discovery

### Console Mode
Tests are auto-discovered by finding all `*.test.js` files in:
- `tests/` directory
- `tests/console-suites/` directory (if exists)

### Browser Mode
Tests are loaded via `test-loader.js` which maintains a registry of:
- Universal tests (`*.test.js`)
- Browser-only tests (`*-tests.js`)

## 🎨 Test Output

### Console Output (with colors)
```
📦 Service Architecture Tests
  ✓ should validate service dependencies (2ms)
  ✓ should enforce unidirectional data flow (1ms)
  ✗ should maintain single source of truth
    Expected 100, got 200

Total: 3 | Passed: 2 | Failed: 1 | Skipped: 0
Time: 45ms
```

### Browser Output
Same information displayed in the browser UI with:
- Green for passed tests
- Red for failed tests
- Yellow for skipped tests
- Expandable error details

## 📝 Best Practices

1. **Name test files consistently**:
   - Universal tests: `feature.test.js`
   - Browser-only: `feature-tests.js`

2. **Keep tests focused**:
   - One concept per test
   - Use descriptive test names
   - Avoid dependencies between tests

3. **Use appropriate hooks**:
   - `beforeAll` - Setup once per suite
   - `beforeEach` - Setup before each test
   - `afterEach` - Cleanup after each test
   - `afterAll` - Cleanup once per suite

4. **Mock external dependencies**:
   ```javascript
   const mock = TestFramework.createMock();
   mock.returnValue = 42;
   service.dependency = mock;
   // ... test
   assert.equal(mock.calls.length, 1);
   ```

5. **Test both success and failure cases**

## 🔧 Troubleshooting

### Tests not found
- Ensure test files end with `.test.js`
- Check file is in `tests/` directory
- Verify `describe()` and `it()` syntax

### Tests fail in one environment
- Check for environment-specific code
- Mock browser globals in Node tests
- Skip DOM-dependent tests in universal files

### Watch mode not working
- Ensure Node.js version >= 14
- Check file system permissions
- Try manual refresh if auto-detection fails

## 🚦 CI/CD Integration

```yaml
# GitHub Actions example
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
      - run: npm test
```

## 📊 Test Coverage Goals

- **Universal Tests**: Core business logic, services, formulas
- **Browser Tests**: UI interactions, DOM manipulation, visual elements
- **Integration Tests**: End-to-end workflows (planned)
- **Performance Tests**: Load and stress testing (planned)

## 🎉 Summary

This dual-mode testing system provides:

✅ **Single test collection** - Write once, run anywhere
✅ **No build step** - Tests run directly
✅ **Auto-discovery** - New tests automatically included
✅ **Watch mode** - Instant feedback during development
✅ **Visual runner** - Great for debugging DOM issues
✅ **CI-ready** - Easy integration with pipelines

Happy testing! 🧪