/**
 * Centralized Keyboard Binding Service
 * Manages all keyboard shortcuts to prevent conflicts
 */

class KeybindingService {
    constructor() {
        // Initialize logger
        this.logger = window.Logger ? new window.Logger('KeybindingService') : null;

        this.bindings = new Map();
        this.categories = new Map();
        this.activeContext = 'game'; // game, menu, dialog, etc.

        // Initialize default bindings
        this.initializeDefaults();

        // Load user preferences if any
        this.loadUserBindings();

        if (this.logger) this.logger.debug('KeybindingService initialized');
    }

    initializeDefaults() {
        // Movement & Selection
        this.registerBinding('selectAgent1', '1', 'Select Agent 1', 'agents');
        this.registerBinding('selectAgent2', '2', 'Select Agent 2', 'agents');
        this.registerBinding('selectAgent3', '3', 'Select Agent 3', 'agents');
        this.registerBinding('selectAgent4', '4', 'Select Agent 4', 'agents');
        this.registerBinding('selectAgent5', '5', 'Select Agent 5', 'agents');
        this.registerBinding('selectAgent6', '6', 'Select Agent 6', 'agents');
        this.registerBinding('cycleAgents', 'Tab', 'Cycle Agents', 'agents');
        this.registerBinding('selectAllAgents', 'T', 'Select All Agents', 'agents');

        // Combat Actions
        this.registerBinding('fire', 'F', 'Fire/Shoot', 'combat');
        this.registerBinding('grenade', 'G', 'Throw Grenade', 'combat');
        this.registerBinding('reload', 'R', 'Reload', 'combat');

        // Abilities
        this.registerBinding('hack', 'H', 'Hack/Interact', 'abilities');
        this.registerBinding('shield', 'Q', 'Activate Shield', 'abilities');
        this.registerBinding('stealth', 'E', 'Stealth Mode', 'abilities');

        // Team Commands - Changed to avoid conflicts
        this.registerBinding('teamHold', 'X', 'Team: Hold Position', 'team');
        this.registerBinding('teamPatrol', 'C', 'Team: Patrol Area', 'team');
        this.registerBinding('teamFollow', 'V', 'Team: Follow Leader', 'team');

        // Camera & View
        // Removed toggle3D from '3' key - E key already handles 3D mode toggle
        this.registerBinding('zoomIn', '=', 'Zoom In', 'view');
        this.registerBinding('zoomOut', '-', 'Zoom Out', 'view');
        this.registerBinding('centerCamera', 'Home', 'Center Camera', 'view');

        // Debug & UI
        this.registerBinding('togglePaths', 'P', 'Toggle Path Visualization', 'debug');
        this.registerBinding('togglePathfinding', 'O', 'Toggle Pathfinding', 'debug');
        this.registerBinding('toggleHotkeyHelp', '?', 'Toggle Hotkey Help', 'ui');
        this.registerBinding('toggleSquadFollow', 'L', 'Toggle Squad Following', 'movement');

        // Game Control
        this.registerBinding('pause', ' ', 'Pause Game', 'game');
        this.registerBinding('quickSave', 'F5', 'Quick Save', 'game');
        this.registerBinding('quickLoad', 'F9', 'Quick Load', 'game');

        // Event Log
        this.registerBinding('toggleEventLog', 'M', 'Toggle Mission Log', 'ui');
    }

    registerBinding(action, defaultKey, description, category = 'general') {
        // Check for conflicts
        const existingAction = this.getActionByKey(defaultKey);
        if (existingAction && existingAction !== action) {
            if (this.logger) this.logger.warn(`⚠️ Key conflict: ${defaultKey} is already bound to ${existingAction}`);
            return false;
        }

        this.bindings.set(action, {
            key: defaultKey,
            description: description,
            category: category,
            customizable: true
        });

        // Track categories
        if (!this.categories.has(category)) {
            this.categories.set(category, []);
        }
        this.categories.get(category).push(action);

        return true;
    }

    getBinding(action) {
        return this.bindings.get(action);
    }

    getKey(action) {
        const binding = this.bindings.get(action);
        return binding ? binding.key : null;
    }

    getActionByKey(key) {
        for (const [action, binding] of this.bindings) {
            if (binding.key === key || binding.key === key.toUpperCase()) {
                return action;
            }
        }
        return null;
    }

    isKeyBound(key) {
        return this.getActionByKey(key) !== null;
    }

    updateBinding(action, newKey) {
        // Check if action exists
        if (!this.bindings.has(action)) {
            if (this.logger) this.logger.error(`Action ${action} not found`);
            return false;
        }

        // Check for conflicts
        const existingAction = this.getActionByKey(newKey);
        if (existingAction && existingAction !== action) {
            if (this.logger) this.logger.warn(`Cannot bind ${newKey} to ${action}: already used by ${existingAction}`);
            return false;
        }

        // Update the binding
        const binding = this.bindings.get(action);
        binding.key = newKey;

        // Save to localStorage
        this.saveUserBindings();

        return true;
    }

    resetBinding(action) {
        // Reset to default
        this.initializeDefaults();
        this.saveUserBindings();
    }

    resetAllBindings() {
        this.bindings.clear();
        this.categories.clear();
        this.initializeDefaults();
        localStorage.removeItem('cyberops_keybindings');
    }

    getBindingsByCategory(category) {
        const actions = this.categories.get(category) || [];
        return actions.map(action => ({
            action: action,
            ...this.bindings.get(action)
        }));
    }

    getAllCategories() {
        return Array.from(this.categories.keys());
    }

    getAllBindings() {
        const result = {};
        for (const category of this.categories.keys()) {
            result[category] = this.getBindingsByCategory(category);
        }
        return result;
    }

    saveUserBindings() {
        const customBindings = {};
        for (const [action, binding] of this.bindings) {
            customBindings[action] = binding.key;
        }
        localStorage.setItem('cyberops_keybindings', JSON.stringify(customBindings));
    }

    loadUserBindings() {
        const saved = localStorage.getItem('cyberops_keybindings');
        if (saved) {
            try {
                const customBindings = JSON.parse(saved);
                for (const [action, key] of Object.entries(customBindings)) {
                    if (this.bindings.has(action)) {
                        const binding = this.bindings.get(action);
                        binding.key = key;
                    }
                }
            } catch (e) {
                if (this.logger) this.logger.error('Failed to load custom keybindings:', e);
            }
        }
    }

    // Check if a key event matches a binding
    matchesBinding(action, event) {
        const binding = this.bindings.get(action);
        if (!binding) return false;

        const key = binding.key;

        // Handle special keys
        if (key === ' ' && event.key === ' ') return true;
        if (key === 'Tab' && event.key === 'Tab') return true;
        if (key === '?' && event.key === '?' || (event.key === '/' && event.shiftKey)) return true;

        // Handle function keys
        if (key.startsWith('F') && event.key === key) return true;

        // Handle regular keys (case insensitive)
        if (event.key.toUpperCase() === key.toUpperCase()) return true;

        // Handle KeyCode format (e.g., 'KeyP')
        if (event.code === `Key${key.toUpperCase()}`) return true;

        return false;
    }

    // Generate help text
    getHelpText() {
        const categories = this.getAllBindings();
        let helpText = [];

        const categoryOrder = ['agents', 'combat', 'abilities', 'team', 'movement', 'view', 'ui', 'game', 'debug'];

        for (const category of categoryOrder) {
            if (categories[category]) {
                helpText.push(`\n${category.toUpperCase()}:`);
                for (const binding of categories[category]) {
                    helpText.push(`  ${binding.key.padEnd(8)} - ${binding.description}`);
                }
            }
        }

        return helpText.join('\n');
    }

    // Export bindings for display in settings
    exportForUI() {
        const categories = this.getAllBindings();
        const categoryLabels = {
            agents: 'Agent Control',
            combat: 'Combat',
            abilities: 'Abilities',
            team: 'Team Commands',
            movement: 'Movement',
            view: 'Camera & View',
            ui: 'User Interface',
            game: 'Game Control',
            debug: 'Debug'
        };

        const result = [];
        for (const [category, bindings] of Object.entries(categories)) {
            result.push({
                category: category,
                label: categoryLabels[category] || category,
                bindings: bindings
            });
        }
        return result;
    }
}

// Export class for GameServices to instantiate
if (typeof window !== 'undefined') {
    window.KeybindingService = KeybindingService;
}