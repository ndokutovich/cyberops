const fs = require('fs');
const path = require('path');

// Map of message patterns to log levels
const logLevelPatterns = {
    ERROR: [/error/i, /failed/i, /exception/i, /critical/i, /fatal/i],
    WARN: [/warning/i, /warn/i, /deprecated/i, /missing/i, /not found/i, /invalid/i],
    INFO: [/loaded/i, /initialized/i, /started/i, /completed/i, /saved/i, /success/i, /✅/],
    DEBUG: [/debug/i, /checking/i, /trying/i, /looking/i, /found/i, /setting/i]
};

// Determine log level based on message content
function determineLogLevel(line) {
    const messageLower = line.toLowerCase();
    
    // Check if it's console.error
    if (line.includes('console.error')) return 'error';
    
    // Check if it's console.warn
    if (line.includes('console.warn')) return 'warn';
    
    // Check message content patterns
    for (const [level, patterns] of Object.entries(logLevelPatterns)) {
        for (const pattern of patterns) {
            if (pattern.test(line)) {
                return level.toLowerCase();
            }
        }
    }
    
    // Default to debug for console.log
    return 'debug';
}

// Extract the module/class name from file path and content
function extractModuleName(filePath, content) {
    const fileName = path.basename(filePath, '.js');
    
    // Check for CyberOpsGame prototype methods
    if (content.includes('CyberOpsGame.prototype')) {
        return 'CyberOpsGame';
    }
    
    // Check for class definitions
    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
        return classMatch[1];
    }
    
    // Use filename as fallback (convert kebab-case to PascalCase)
    return fileName.split('-').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
    ).join('');
}

// Process a single file
function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Skip if it's the logger service itself
    if (filePath.includes('logger-service.js')) {
        return { filePath, changes: 0 };
    }
    
    const moduleName = extractModuleName(filePath, content);
    let changes = 0;
    let needsLoggerInit = false;
    
    // Check if file already has logger initialization
    const hasLoggerInit = content.includes('new Logger(') || content.includes('new window.Logger(');
    
    // Replace console statements
    const consoleRegex = /console\.(log|warn|error)\s*\(/g;
    let match;
    const replacements = [];
    
    while ((match = consoleRegex.exec(content)) !== null) {
        const lineStart = content.lastIndexOf('\n', match.index) + 1;
        const lineEnd = content.indexOf('\n', match.index);
        const line = content.substring(lineStart, lineEnd === -1 ? content.length : lineEnd);
        const indent = line.match(/^\s*/)[0];
        
        // Determine if we're in a method/function or global scope
        const beforeMatch = content.substring(0, match.index);
        const inFunction = (beforeMatch.match(/function\s*\(/g) || []).length > 
                          (beforeMatch.match(/^\s*\}/gm) || []).length;
        const inMethod = beforeMatch.includes('prototype.');
        
        // Determine logger reference
        let loggerRef;
        if (inMethod || (inFunction && content.includes('this.'))) {
            loggerRef = 'if (this.logger) this.logger';
            needsLoggerInit = true;
        } else {
            loggerRef = 'if (logger) logger';
            needsLoggerInit = true;
        }
        
        const logLevel = determineLogLevel(line);
        const logType = match[1]; // log, warn, or error
        
        // Create replacement
        replacements.push({
            start: match.index,
            end: match.index + `console.${logType}`.length,
            replacement: `${loggerRef}.${logLevel}`,
            original: `console.${logType}`
        });
        
        changes++;
    }
    
    // Apply replacements in reverse order to maintain positions
    replacements.reverse().forEach(r => {
        content = content.substring(0, r.start) + r.replacement + content.substring(r.end);
    });
    
    // Add logger initialization if needed
    if (needsLoggerInit && !hasLoggerInit && changes > 0) {
        // For CyberOpsGame methods, add to constructor
        if (moduleName === 'CyberOpsGame') {
            const constructorMatch = content.match(/constructor\s*\([^)]*\)\s*{/);
            if (constructorMatch) {
                const insertPos = constructorMatch.index + constructorMatch[0].length;
                content = content.substring(0, insertPos) + 
                    '\n        this.logger = window.Logger ? new window.Logger("CyberOpsGame") : null;' +
                    content.substring(insertPos);
            }
        } 
        // For standalone functions, add at the beginning of the function
        else {
            // Find first function and add logger there
            const funcMatch = content.match(/(function\s+\w+\s*\([^)]*\)\s*{|prototype\.\w+\s*=\s*function\s*\([^)]*\)\s*{)/);
            if (funcMatch) {
                const insertPos = funcMatch.index + funcMatch[0].length;
                content = content.substring(0, insertPos) + 
                    `\n    const logger = window.Logger ? new window.Logger('${moduleName}') : null;` +
                    content.substring(insertPos);
            }
        }
    }
    
    // Write back if changed
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        return { filePath, changes };
    }
    
    return { filePath, changes: 0 };
}

// Process all JS files
function processAllFiles() {
    const jsDir = path.join('js');
    const results = [];
    
    function walkDir(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                walkDir(fullPath);
            } else if (file.endsWith('.js')) {
                const result = processFile(fullPath);
                if (result.changes > 0) {
                    results.push(result);
                    console.log(`✅ Processed ${result.filePath}: ${result.changes} changes`);
                }
            }
        }
    }
    
    walkDir(jsDir);
    
    console.log('\n📊 Summary:');
    console.log(`Total files processed: ${results.length}`);
    console.log(`Total changes made: ${results.reduce((sum, r) => sum + r.changes, 0)}`);
}

// Run the conversion
console.log('🚀 Starting console to logger conversion...\n');
processAllFiles();
console.log('\n✅ Conversion complete!');
