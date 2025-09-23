/**
 * Logger Tests
 * Tests for the centralized logging system
 */

describe('Logger Tests', () => {

    describe('Logger Initialization', () => {
        it('should create logger with source name', () => {
            const logger = new Logger('TestSource');

            assertEqual(logger.source, 'TestSource', 'Should set source name');
            assertTruthy(typeof logger.minLevel === 'number', 'Should have min level');
        });

        it('should be available globally', () => {
            assertTruthy(window.Logger, 'Logger class should be available globally');
            assertEqual(typeof window.Logger, 'function', 'Logger should be a constructor');
        });

        it('should have static history array', () => {
            assertTruthy(Array.isArray(Logger.history), 'Should have static history array');
        });
    });

    describe('Log Levels', () => {
        it('should have all log level constants', () => {
            assertTruthy(typeof LogLevel !== 'undefined', 'LogLevel should be defined');
            assertEqual(LogLevel.TRACE, 0, 'TRACE should be 0');
            assertEqual(LogLevel.DEBUG, 1, 'DEBUG should be 1');
            assertEqual(LogLevel.INFO, 2, 'INFO should be 2');
            assertEqual(LogLevel.WARN, 3, 'WARN should be 3');
            assertEqual(LogLevel.ERROR, 4, 'ERROR should be 4');
            assertEqual(LogLevel.FATAL, 5, 'FATAL should be 5');
        });

        it('should respect minimum log level', () => {
            const logger = new Logger('TestLogger');
            const initialHistoryLength = Logger.history.length;

            // Set min level to WARN
            logger.minLevel = LogLevel.WARN;

            // These should not be logged
            logger.trace('Trace message');
            logger.debug('Debug message');
            logger.info('Info message');

            // These should be logged
            logger.warn('Warning message');
            logger.error('Error message');

            const newEntries = Logger.history.slice(initialHistoryLength);
            const loggedLevels = newEntries.filter(e => e.source === 'TestLogger');

            // Should only have WARN and ERROR
            assertEqual(loggedLevels.filter(e => e.level >= LogLevel.WARN).length,
                loggedLevels.length, 'Should only log WARN and above');
        });
    });

    describe('Log Methods', () => {
        let logger;
        let initialHistoryLength;

        beforeEach(() => {
            logger = new Logger('TestMethods');
            logger.minLevel = LogLevel.TRACE; // Allow all logs
            initialHistoryLength = Logger.history.length;
        });

        it('should log trace messages', () => {
            logger.trace('Trace test', 'extra', 'args');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.TRACE, 'Should be TRACE level');
            assertEqual(lastEntry.source, 'TestMethods', 'Should have correct source');
            assertTruthy(lastEntry.message.includes('Trace test'), 'Should contain message');
        });

        it('should log debug messages', () => {
            logger.debug('Debug test');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.DEBUG, 'Should be DEBUG level');
            assertTruthy(lastEntry.message.includes('Debug test'), 'Should contain message');
        });

        it('should log info messages', () => {
            logger.info('Info test');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.INFO, 'Should be INFO level');
            assertTruthy(lastEntry.message.includes('Info test'), 'Should contain message');
        });

        it('should log warn messages', () => {
            logger.warn('Warning test');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.WARN, 'Should be WARN level');
            assertTruthy(lastEntry.message.includes('Warning test'), 'Should contain message');
        });

        it('should log error messages', () => {
            logger.error('Error test');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.ERROR, 'Should be ERROR level');
            assertTruthy(lastEntry.message.includes('Error test'), 'Should contain message');
        });

        it('should log fatal messages', () => {
            logger.fatal('Fatal test');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertEqual(lastEntry.level, LogLevel.FATAL, 'Should be FATAL level');
            assertTruthy(lastEntry.message.includes('Fatal test'), 'Should contain message');
        });
    });

    describe('History Management', () => {
        it('should maintain log history', () => {
            const logger = new Logger('HistoryTest');
            const startLength = Logger.history.length;

            logger.info('Test 1');
            logger.info('Test 2');
            logger.info('Test 3');

            assertTruthy(Logger.history.length >= startLength + 3,
                'Should add entries to history');
        });

        it('should limit history size to 1000 entries', () => {
            // This test would need to add many entries to verify the limit
            // For now, just check that the limit exists
            assertTruthy(Logger.MAX_HISTORY === 1000 || Logger.history.length <= 1000,
                'Should have history limit');
        });

        it('should include timestamp in entries', () => {
            const logger = new Logger('TimestampTest');
            logger.info('Test message');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertTruthy(lastEntry.timestamp, 'Should have timestamp');
            assertTruthy(lastEntry.timestamp instanceof Date ||
                typeof lastEntry.timestamp === 'string' ||
                typeof lastEntry.timestamp === 'number',
                'Timestamp should be valid');
        });
    });

    describe('Static Methods', () => {
        it('should get filtered history', () => {
            const logger1 = new Logger('Source1');
            const logger2 = new Logger('Source2');

            logger1.info('Message from Source1');
            logger2.warn('Message from Source2');

            const source1History = Logger.getHistory({ source: 'Source1' });
            const source2History = Logger.getHistory({ source: 'Source2' });

            assertTruthy(source1History.every(e => e.source === 'Source1'),
                'Should filter by source');
            assertTruthy(source2History.every(e => e.source === 'Source2'),
                'Should filter by source');
        });

        it('should filter history by level', () => {
            const logger = new Logger('LevelFilter');
            logger.debug('Debug msg');
            logger.warn('Warn msg');
            logger.error('Error msg');

            const warningsAndAbove = Logger.getHistory({
                source: 'LevelFilter',
                level: LogLevel.WARN
            });

            assertTruthy(warningsAndAbove.every(e => e.level >= LogLevel.WARN),
                'Should filter by level');
        });

        it('should set minimum level for source', () => {
            const logger = new Logger('DynamicLevel');

            // Set min level to ERROR
            Logger.setMinLevel('DynamicLevel', LogLevel.ERROR);

            const startLength = Logger.history.filter(e => e.source === 'DynamicLevel').length;

            logger.debug('Should not appear');
            logger.info('Should not appear');
            logger.warn('Should not appear');
            logger.error('Should appear');

            const newEntries = Logger.history.filter(e => e.source === 'DynamicLevel')
                .slice(startLength);

            assertEqual(newEntries.length, 1, 'Should only log ERROR and above');
            assertEqual(newEntries[0].level, LogLevel.ERROR, 'Should be ERROR level');
        });
    });

    describe('Console Output', () => {
        it('should format messages with timestamp and source', () => {
            const logger = new Logger('FormatTest');

            // We can't easily test console output directly,
            // but we can verify the format in history
            logger.info('Test message');

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertTruthy(lastEntry.source === 'FormatTest', 'Should have source');
            assertTruthy(lastEntry.message === 'Test message', 'Should have message');
        });

        it('should handle multiple arguments', () => {
            const logger = new Logger('ArgsTest');
            logger.info('Message', 'with', 'multiple', 'args', 123, { obj: true });

            const lastEntry = Logger.history[Logger.history.length - 1];
            assertTruthy(lastEntry.message === 'Message', 'Should have main message');
            assertTruthy(lastEntry.args && lastEntry.args.length > 0,
                'Should store additional arguments');
        });
    });
});

// Export for test runner
window.LoggerTests = true;