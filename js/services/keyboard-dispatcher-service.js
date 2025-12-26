/**
 * KeyboardDispatcherService - Unified keyboard handling with context-based priority
 *
 * This service provides a single document-level keyboard listener that dispatches
 * events to registered handlers based on active context priority.
 *
 * Context Priority (highest first):
 * 1. CUTSCENE - Blocks all below when active
 * 2. MODAL - ESC, 1-9 for NPC choices
 * 3. DIALOG - ESC, config-based keys
 * 4. KEY_REBIND - Captures next key for rebinding
 * 5. GAME - All gameplay keys
 * 6. GLOBAL - Audio enable, always-active handlers
 */

class KeyboardDispatcherService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('KeyboardDispatcher') : null;

        // Context priority order (higher index = higher priority)
        this.CONTEXTS = {
            GLOBAL: 0,      // Always-active handlers (audio enable)
            GAME: 1,        // Gameplay keys
            DIALOG: 2,      // Declarative dialog system
            MODAL: 3,       // Modal engine
            CUTSCENE: 4,    // Cutscene engine
            KEY_REBIND: 5   // Key capture for rebinding (highest - blocks everything)
        };

        // Active contexts (context name -> boolean)
        this.activeContexts = new Map();

        // Registered handlers per context
        // Map<contextName, Map<key, handler>>
        this.handlers = new Map();

        // Global handlers that always run (like audio enable)
        this.globalHandlers = [];

        // One-time handlers (removed after first trigger)
        this.oneTimeHandlers = [];

        // Key state tracking
        this.keysPressed = new Set();
        this.keys3D = { W: false, A: false, S: false, D: false };

        // Input field detection
        this.inputTags = ['INPUT', 'TEXTAREA', 'SELECT'];

        // Initialize
        this.initialized = false;
    }

    /**
     * Initialize the dispatcher - registers single document listener
     */
    initialize() {
        if (this.initialized) {
            if (this.logger) this.logger.warn('KeyboardDispatcher already initialized');
            return;
        }

        // Register single keydown handler
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Initialize all contexts as inactive
        Object.keys(this.CONTEXTS).forEach(ctx => {
            this.activeContexts.set(ctx, false);
            this.handlers.set(ctx, new Map());
        });

        // GAME context is active by default when in game screen
        this.activeContexts.set('GAME', true);

        this.initialized = true;
        if (this.logger) this.logger.info('✅ KeyboardDispatcherService initialized');
    }

    /**
     * Main keydown handler - dispatches to appropriate context
     */
    handleKeyDown(e) {
        // Skip if typing in input fields
        if (this.inputTags.includes(e.target.tagName)) {
            return;
        }

        // Track key state
        this.keysPressed.add(e.key.toLowerCase());

        // Track 3D movement keys
        this.update3DKeyState(e, true);

        // Run one-time handlers first (audio enable, etc.)
        this.runOneTimeHandlers(e);

        // Find highest priority active context with a handler for this key
        const handled = this.dispatchToContext(e);

        // Run global handlers if event wasn't consumed
        if (!handled) {
            this.runGlobalHandlers(e);
        }
    }

    /**
     * Main keyup handler
     */
    handleKeyUp(e) {
        // Clear key state
        this.keysPressed.delete(e.key.toLowerCase());

        // Track 3D movement keys
        this.update3DKeyState(e, false);
    }

    /**
     * Update 3D movement key state
     */
    update3DKeyState(e, pressed) {
        switch(e.code) {
            case 'KeyW': this.keys3D.W = pressed; break;
            case 'KeyA': this.keys3D.A = pressed; break;
            case 'KeyS': this.keys3D.S = pressed; break;
            case 'KeyD': this.keys3D.D = pressed; break;
        }
    }

    /**
     * Dispatch event to highest priority active context
     */
    dispatchToContext(e) {
        // Get contexts sorted by priority (highest first)
        const sortedContexts = Object.entries(this.CONTEXTS)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        for (const contextName of sortedContexts) {
            // Skip inactive contexts
            if (!this.activeContexts.get(contextName)) {
                continue;
            }

            // Get handlers for this context
            const contextHandlers = this.handlers.get(contextName);
            if (!contextHandlers) continue;

            // Look for handler matching this key (case-insensitive)
            const handler = contextHandlers.get(e.key) ||
                           contextHandlers.get(e.key.toUpperCase()) ||
                           contextHandlers.get(e.key.toLowerCase()) ||
                           contextHandlers.get(e.code);

            if (handler) {
                try {
                    e.preventDefault();
                    handler(e);

                    if (this.logger) this.logger.trace(`Key ${e.key} handled by ${contextName} context`);
                    return true; // Event consumed
                } catch (error) {
                    if (this.logger) this.logger.error(`Error in ${contextName} handler for ${e.key}:`, error);
                }
            }

            // Check for wildcard handler (handles ALL keys in this context)
            const wildcardHandler = contextHandlers.get('*');
            if (wildcardHandler) {
                try {
                    const result = wildcardHandler(e);
                    if (result === true) {
                        // Wildcard consumed the event
                        return true;
                    }
                } catch (error) {
                    if (this.logger) this.logger.error(`Error in ${contextName} wildcard handler:`, error);
                }
            }
        }

        return false; // Event not consumed
    }

    /**
     * Run one-time handlers (like audio enable)
     */
    runOneTimeHandlers(e) {
        const toRemove = [];

        this.oneTimeHandlers.forEach((handler, index) => {
            try {
                handler(e);
                toRemove.push(index);
            } catch (error) {
                if (this.logger) this.logger.error('Error in one-time handler:', error);
                toRemove.push(index); // Remove even on error
            }
        });

        // Remove triggered handlers (reverse order to preserve indices)
        toRemove.reverse().forEach(index => {
            this.oneTimeHandlers.splice(index, 1);
        });
    }

    /**
     * Run global handlers (always run, don't consume events)
     */
    runGlobalHandlers(e) {
        this.globalHandlers.forEach(handler => {
            try {
                handler(e);
            } catch (error) {
                if (this.logger) this.logger.error('Error in global handler:', error);
            }
        });
    }

    // ========== PUBLIC API ==========

    /**
     * Activate a context - events will be dispatched to its handlers
     * @param {string} contextName - One of CONTEXTS keys
     */
    activateContext(contextName) {
        if (!this.CONTEXTS.hasOwnProperty(contextName)) {
            throw new Error(`Unknown context: ${contextName}. Valid contexts: ${Object.keys(this.CONTEXTS).join(', ')}`);
        }

        this.activeContexts.set(contextName, true);
        if (this.logger) this.logger.debug(`Context activated: ${contextName}`);
    }

    /**
     * Deactivate a context - events will skip its handlers
     * @param {string} contextName - One of CONTEXTS keys
     */
    deactivateContext(contextName) {
        if (!this.CONTEXTS.hasOwnProperty(contextName)) {
            throw new Error(`Unknown context: ${contextName}. Valid contexts: ${Object.keys(this.CONTEXTS).join(', ')}`);
        }

        this.activeContexts.set(contextName, false);
        if (this.logger) this.logger.debug(`Context deactivated: ${contextName}`);
    }

    /**
     * Check if a context is active
     * @param {string} contextName - Context name
     * @returns {boolean}
     */
    isContextActive(contextName) {
        return this.activeContexts.get(contextName) || false;
    }

    /**
     * Register a key handler for a context
     * @param {string} contextName - Context name
     * @param {string} key - Key to handle (e.key value, or '*' for all)
     * @param {Function} handler - Handler function (receives KeyboardEvent)
     */
    registerHandler(contextName, key, handler) {
        if (!this.CONTEXTS.hasOwnProperty(contextName)) {
            throw new Error(`Unknown context: ${contextName}`);
        }

        if (typeof handler !== 'function') {
            throw new Error(`Handler must be a function, got ${typeof handler}`);
        }

        const contextHandlers = this.handlers.get(contextName);
        contextHandlers.set(key, handler);

        if (this.logger) this.logger.trace(`Registered handler for ${key} in ${contextName} context`);
    }

    /**
     * Register multiple handlers for a context at once
     * @param {string} contextName - Context name
     * @param {Object} bindings - Object of key -> handler mappings
     */
    registerHandlers(contextName, bindings) {
        Object.entries(bindings).forEach(([key, handler]) => {
            this.registerHandler(contextName, key, handler);
        });
    }

    /**
     * Unregister a key handler
     * @param {string} contextName - Context name
     * @param {string} key - Key to unregister
     */
    unregisterHandler(contextName, key) {
        const contextHandlers = this.handlers.get(contextName);
        if (contextHandlers) {
            contextHandlers.delete(key);
        }
    }

    /**
     * Clear all handlers for a context
     * @param {string} contextName - Context name
     */
    clearContext(contextName) {
        const contextHandlers = this.handlers.get(contextName);
        if (contextHandlers) {
            contextHandlers.clear();
        }
    }

    /**
     * Register a one-time handler (removed after first trigger)
     * @param {Function} handler - Handler function
     */
    registerOneTimeHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        this.oneTimeHandlers.push(handler);
    }

    /**
     * Register a global handler (always runs, doesn't block other handlers)
     * @param {Function} handler - Handler function
     */
    registerGlobalHandler(handler) {
        if (typeof handler !== 'function') {
            throw new Error('Handler must be a function');
        }
        this.globalHandlers.push(handler);
    }

    /**
     * Get current key state
     * @param {string} key - Key to check
     * @returns {boolean}
     */
    isKeyPressed(key) {
        return this.keysPressed.has(key.toLowerCase());
    }

    /**
     * Get 3D movement key states
     * @returns {Object} - { W, A, S, D } booleans
     */
    get3DKeyState() {
        return { ...this.keys3D };
    }

    /**
     * Get list of currently pressed keys
     * @returns {string[]}
     */
    getPressedKeys() {
        return Array.from(this.keysPressed);
    }

    /**
     * Get current highest priority active context
     * @returns {string|null}
     */
    getActiveContext() {
        const sortedContexts = Object.entries(this.CONTEXTS)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        for (const contextName of sortedContexts) {
            if (this.activeContexts.get(contextName)) {
                return contextName;
            }
        }
        return null;
    }

    /**
     * Debug: Get all registered handlers
     * @returns {Object}
     */
    getDebugInfo() {
        const info = {
            activeContexts: {},
            handlers: {},
            oneTimeHandlers: this.oneTimeHandlers.length,
            globalHandlers: this.globalHandlers.length,
            keysPressed: Array.from(this.keysPressed)
        };

        this.activeContexts.forEach((active, ctx) => {
            info.activeContexts[ctx] = active;
        });

        this.handlers.forEach((handlers, ctx) => {
            info.handlers[ctx] = Array.from(handlers.keys());
        });

        return info;
    }
}

// Export for GameServices
if (typeof window !== 'undefined') {
    window.KeyboardDispatcherService = KeyboardDispatcherService;
}
