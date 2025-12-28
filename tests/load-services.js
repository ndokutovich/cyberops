/**
 * Service Loader for Node.js Testing
 * Simple solution to load services in console tests
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Function to load a service file
function loadService(servicePath) {
    const fullPath = path.resolve(__dirname, '..', servicePath);
    const code = fs.readFileSync(fullPath, 'utf8');

    // Create a NEW sandbox for EACH service to prevent overwrites
    const sandbox = {
        window: {
            Logger: null,
            GameServices: null
        },
        console: console,
        Math: Math,
        Date: Date,
        JSON: JSON,
        Object: Object,
        Array: Array,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Map: Map,
        Set: Set,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        module: { exports: {} }
    };

    // Create a new context for each service
    const context = vm.createContext(sandbox);

    // Run the service code in the sandbox
    vm.runInContext(code, context);

    // Return the exported service
    return context.module.exports || context.window[path.basename(servicePath, '.js')];
}

// Load all services
const services = {};

try {
    services.FormulaService = loadService('js/services/formula-service.js');
    console.log('✓ FormulaService loaded');
} catch (e) {
    console.log('✗ FormulaService failed:', e.message);
}

try {
    services.ResourceService = loadService('js/services/resource-service.js');
    console.log('✓ ResourceService loaded');
} catch (e) {
    console.log('✗ ResourceService failed:', e.message);
}

try {
    services.AgentService = loadService('js/services/agent-service.js');
    console.log('✓ AgentService loaded');
} catch (e) {
    console.log('✗ AgentService failed:', e.message);
}

try {
    services.MissionService = loadService('js/services/mission-service.js');
    console.log('✓ MissionService loaded');
} catch (e) {
    console.log('✗ MissionService failed:', e.message);
}

try {
    services.CombatService = loadService('js/services/combat-service.js');
    console.log('✓ CombatService loaded');
} catch (e) {
    console.log('✗ CombatService failed:', e.message);
}

try {
    services.InventoryService = loadService('js/services/inventory-service.js');
    console.log('✓ InventoryService loaded');
} catch (e) {
    console.log('✗ InventoryService failed:', e.message);
}

try {
    services.ResearchService = loadService('js/services/research-service.js');
    console.log('✓ ResearchService loaded');
} catch (e) {
    console.log('✗ ResearchService failed:', e.message);
}

try {
    services.QuestService = loadService('js/services/quest-service.js');
    console.log('✓ QuestService loaded');
} catch (e) {
    console.log('✗ QuestService failed:', e.message);
}

try {
    services.RPGService = loadService('js/services/rpg-service.js');
    console.log('✓ RPGService loaded');
} catch (e) {
    console.log('✗ RPGService failed:', e.message);
}

// Export loaded services
module.exports = services;