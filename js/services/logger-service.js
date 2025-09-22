/**
 * Simple Logger Service inspired by Log4j
 * Provides structured logging with source tracking, timestamps, and log levels
 */

class LogLevel {
    static TRACE = 0;
    static DEBUG = 1;
    static INFO = 2;
    static WARN = 3;
    static ERROR = 4;
    static FATAL = 5;

    static toString(level) {
        switch(level) {
            case LogLevel.TRACE: return 'TRACE';
            case LogLevel.DEBUG: return 'DEBUG';
            case LogLevel.INFO: return 'INFO';
            case LogLevel.WARN: return 'WARN';
            case LogLevel.ERROR: return 'ERROR';
            case LogLevel.FATAL: return 'FATAL';
            default: return 'UNKNOWN';
        }
    }
}

class Logger {
    constructor(className) {
        this.className = className;
        this.enabled = true;
        this.minLevel = LogLevel.DEBUG; // Default to DEBUG in development
        this.showTimestamp = true;
        this.showSource = true;
        this.colorize = true;
        this.dateFormat = 'HH:mm:ss.SSS'; // Simple time format
    }

    // Configure logger settings
    configure(options) {
        if (options.enabled !== undefined) this.enabled = options.enabled;
        if (options.minLevel !== undefined) this.minLevel = options.minLevel;
        if (options.showTimestamp !== undefined) this.showTimestamp = options.showTimestamp;
        if (options.showSource !== undefined) this.showSource = options.showSource;
        if (options.colorize !== undefined) this.colorize = options.colorize;
        if (options.dateFormat !== undefined) this.dateFormat = options.dateFormat;
    }

    // Format timestamp
    formatTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const millis = String(now.getMilliseconds()).padStart(3, '0');

        if (this.dateFormat === 'ISO') {
            return now.toISOString();
        } else if (this.dateFormat === 'HH:mm:ss') {
            return `${hours}:${minutes}:${seconds}`;
        } else { // Default HH:mm:ss.SSS
            return `${hours}:${minutes}:${seconds}.${millis}`;
        }
    }

    // Get color codes for different log levels
    getColor(level) {
        if (!this.colorize) return ['', ''];

        switch(level) {
            case LogLevel.TRACE: return ['color: #888', '']; // Gray
            case LogLevel.DEBUG: return ['color: #00f', '']; // Blue
            case LogLevel.INFO: return ['color: #0a0', '']; // Green
            case LogLevel.WARN: return ['color: #fa0; font-weight: bold', '']; // Orange
            case LogLevel.ERROR: return ['color: #f00; font-weight: bold', '']; // Red
            case LogLevel.FATAL: return ['background: #f00; color: #fff; font-weight: bold; padding: 2px', '']; // Red bg
            default: return ['', ''];
        }
    }

    // Core logging method
    log(level, message, ...args) {
        if (!this.enabled || level < this.minLevel) return;

        const parts = [];
        const styles = [];

        // Add timestamp
        if (this.showTimestamp) {
            const timestamp = this.formatTimestamp();
            parts.push(`[${timestamp}]`);
        }

        // Add source class
        if (this.showSource) {
            parts.push(`[${this.className}]`);
        }

        // Add log level
        const levelStr = LogLevel.toString(level);
        const [levelStyle] = this.getColor(level);
        parts.push(`[${levelStr}]`);

        // Add message
        parts.push(message);

        // Format the complete log line
        const logLine = parts.join(' ');

        // Choose console method based on level
        let consoleMethod = console.log;
        if (level === LogLevel.WARN) consoleMethod = console.warn;
        else if (level === LogLevel.ERROR || level === LogLevel.FATAL) consoleMethod = console.error;

        // Output with styling if available
        if (this.colorize && levelStyle) {
            consoleMethod(`%c${logLine}`, levelStyle, ...args);
        } else {
            consoleMethod(logLine, ...args);
        }

        // Store in history for debugging
        this.addToHistory(level, logLine, args);
    }

    // Store log history (useful for debugging)
    addToHistory(level, message, args) {
        if (!Logger.history) Logger.history = [];
        Logger.history.push({
            timestamp: new Date(),
            level: level,
            source: this.className,
            message: message,
            args: args
        });

        // Keep only last 1000 entries
        if (Logger.history.length > 1000) {
            Logger.history.shift();
        }
    }

    // Convenience methods
    trace(message, ...args) {
        this.log(LogLevel.TRACE, message, ...args);
    }

    debug(message, ...args) {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    info(message, ...args) {
        this.log(LogLevel.INFO, message, ...args);
    }

    warn(message, ...args) {
        this.log(LogLevel.WARN, message, ...args);
    }

    error(message, ...args) {
        this.log(LogLevel.ERROR, message, ...args);
    }

    fatal(message, ...args) {
        this.log(LogLevel.FATAL, message, ...args);
    }

    // Group logging (useful for complex operations)
    group(label) {
        if (!this.enabled) return;
        console.group(`[${this.className}] ${label}`);
    }

    groupEnd() {
        if (!this.enabled) return;
        console.groupEnd();
    }

    // Performance timing
    time(label) {
        if (!this.enabled) return;
        const key = `${this.className}-${label}`;
        console.time(key);
        return key;
    }

    timeEnd(label) {
        if (!this.enabled) return;
        const key = `${this.className}-${label}`;
        console.timeEnd(key);
    }

    // Static methods for global access
    static getHistory(filter = {}) {
        if (!Logger.history) return [];

        let filtered = Logger.history;

        if (filter.source) {
            filtered = filtered.filter(entry => entry.source === filter.source);
        }

        if (filter.level !== undefined) {
            filtered = filtered.filter(entry => entry.level >= filter.level);
        }

        if (filter.since) {
            filtered = filtered.filter(entry => entry.timestamp >= filter.since);
        }

        return filtered;
    }

    static clearHistory() {
        Logger.history = [];
    }

    // Create a logger for a class
    static getLogger(className) {
        if (!Logger.instances) Logger.instances = {};

        if (!Logger.instances[className]) {
            Logger.instances[className] = new Logger(className);
        }

        return Logger.instances[className];
    }

    // Global configuration
    static configureAll(options) {
        if (!Logger.instances) return;

        Object.values(Logger.instances).forEach(logger => {
            logger.configure(options);
        });

        // Store global config for new instances
        Logger.globalConfig = options;
    }

    // Set global log level
    static setGlobalLogLevel(level) {
        Logger.configureAll({ minLevel: level });
    }

    // Enable/disable all loggers
    static enableAll(enabled = true) {
        Logger.configureAll({ enabled: enabled });
    }
}

// Export for use
window.Logger = Logger;
window.LogLevel = LogLevel;

// Create convenience function
window.getLogger = (className) => Logger.getLogger(className);