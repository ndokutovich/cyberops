/**
 * DialogStateService - Centralized dialog navigation and state management
 *
 * Provides single point of access for all dialog operations, eliminating
 * scattered fallback patterns (this.dialogEngine || window.dialogEngine || window.declarativeDialogEngine)
 *
 * ARCHITECTURE: This service wraps the DeclarativeDialogEngine and provides
 * a consistent API for all dialog operations across the codebase.
 */

class DialogStateService {
    constructor() {
        // Logger
        this.logger = window.Logger ? new window.Logger('DialogStateService') : null;

        // Cached engine reference
        this._engine = null;

        // State data cache for dialogs
        this.stateData = {};

        // Navigation history for debugging
        this.navigationHistory = [];
        this.maxHistorySize = 50;

        if (this.logger) this.logger.debug('DialogStateService initialized');
    }

    /**
     * Get the dialog engine instance (lazy initialization)
     * Handles all fallback patterns in one place
     */
    get engine() {
        if (this._engine) return this._engine;

        // Check all possible locations
        this._engine = window.declarativeDialogEngine ||
                       window.dialogEngine ||
                       window.game?.dialogEngine;

        if (!this._engine && this.logger) {
            this.logger.warn('Dialog engine not yet available');
        }

        return this._engine;
    }

    /**
     * Set the engine reference explicitly
     * Called during game initialization
     */
    setEngine(engine) {
        this._engine = engine;
        if (this.logger) this.logger.debug('Dialog engine set');
    }

    // ========== NAVIGATION ==========

    /**
     * Navigate to a dialog state
     * @param {string} stateId - The dialog state to navigate to
     * @param {Object} data - Optional data to pass to the dialog
     * @param {boolean} refresh - Whether to refresh if already on this state
     * @returns {boolean} Success status
     */
    navigateTo(stateId, data = null, refresh = false) {
        const engine = this.engine;
        if (!engine) {
            if (this.logger) this.logger.error(`Cannot navigate to ${stateId}: engine not available`);
            return false;
        }

        // Store data for the dialog
        if (data) {
            this.stateData[stateId] = data;
            if (engine.stateData) {
                engine.stateData[stateId] = data;
            }
        }

        // Track navigation
        this.addToHistory('navigate', stateId, data);

        // Navigate
        if (engine.navigateTo) {
            engine.navigateTo(stateId, data, refresh);
            return true;
        }

        if (this.logger) this.logger.error(`Engine missing navigateTo method`);
        return false;
    }

    /**
     * Navigate back to previous dialog
     * @returns {boolean} Success status
     */
    back() {
        const engine = this.engine;
        if (!engine) {
            if (this.logger) this.logger.error('Cannot go back: engine not available');
            return false;
        }

        this.addToHistory('back', engine.currentState);

        if (engine.back) {
            engine.back();
            return true;
        }

        if (this.logger) this.logger.error('Engine missing back method');
        return false;
    }

    /**
     * Close the current dialog
     * @returns {boolean} Success status
     */
    close() {
        const engine = this.engine;
        if (!engine) {
            if (this.logger) this.logger.error('Cannot close: engine not available');
            return false;
        }

        this.addToHistory('close', engine.currentState);

        if (engine.close) {
            engine.close();
            return true;
        }

        if (this.logger) this.logger.error('Engine missing close method');
        return false;
    }

    /**
     * Close all dialogs
     * @returns {boolean} Success status
     */
    closeAll() {
        const engine = this.engine;
        if (!engine) return false;

        this.addToHistory('closeAll', engine.currentState);

        if (engine.closeAll) {
            engine.closeAll();
            return true;
        }

        // Fallback to close
        return this.close();
    }

    // ========== STATE ACCESS ==========

    /**
     * Get current dialog state ID
     */
    get currentState() {
        return this.engine?.currentState || null;
    }

    /**
     * Check if a dialog is currently open
     */
    get isOpen() {
        return !!this.engine?.currentState;
    }

    /**
     * Get data for a specific dialog state
     */
    getStateData(stateId) {
        return this.stateData[stateId] || this.engine?.stateData?.[stateId] || null;
    }

    /**
     * Set data for a specific dialog state
     */
    setStateData(stateId, data) {
        this.stateData[stateId] = data;
        if (this.engine?.stateData) {
            this.engine.stateData[stateId] = data;
        }
    }

    /**
     * Get the navigation stack
     */
    get navigationStack() {
        return this.engine?.stateStack || [];
    }

    // ========== ACTIONS ==========

    /**
     * Execute a dialog action
     * @param {string} action - Action string (e.g., 'buyItem:weapon_01')
     * @returns {boolean} Success status
     */
    executeAction(action) {
        const engine = this.engine;
        if (!engine) {
            if (this.logger) this.logger.error(`Cannot execute action ${action}: engine not available`);
            return false;
        }

        this.addToHistory('action', action);

        if (engine.executeAction) {
            engine.executeAction(action);
            return true;
        }

        if (this.logger) this.logger.error('Engine missing executeAction method');
        return false;
    }

    /**
     * Refresh the current dialog
     * @returns {boolean} Success status
     */
    refresh() {
        const currentState = this.currentState;
        if (!currentState) return false;

        return this.navigateTo(currentState, null, true);
    }

    /**
     * Switch to a specific tab in the current dialog
     * @param {string} tabId - Tab to switch to
     * @returns {boolean} Success status
     */
    switchTab(tabId) {
        const engine = this.engine;
        if (!engine) return false;

        if (engine.switchTab) {
            engine.switchTab(tabId);
            return true;
        }

        return false;
    }

    // ========== HELPERS ==========

    /**
     * Check if a specific dialog state is available
     */
    hasState(stateId) {
        return this.engine?.config?.states?.[stateId] !== undefined;
    }

    /**
     * Get list of available dialog states
     */
    getAvailableStates() {
        return Object.keys(this.engine?.config?.states || {});
    }

    /**
     * Add entry to navigation history
     */
    addToHistory(action, state, data = null) {
        this.navigationHistory.push({
            action,
            state,
            data,
            timestamp: Date.now()
        });

        // Trim history
        while (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
    }

    /**
     * Get recent navigation history
     */
    getHistory(count = 10) {
        return this.navigationHistory.slice(-count);
    }

    /**
     * Clear navigation history
     */
    clearHistory() {
        this.navigationHistory = [];
    }

    // ========== CONVENIENCE METHODS ==========

    /**
     * Show a specific hub dialog
     */
    showHubDialog(dialogId, data = null) {
        const hubDialogs = ['agent-management', 'arsenal', 'research-lab', 'intel-missions',
                           'tech-tree', 'hall-of-glory', 'hub-settings', 'world-map'];

        if (hubDialogs.includes(dialogId)) {
            return this.navigateTo(dialogId, data);
        }

        if (this.logger) this.logger.warn(`Unknown hub dialog: ${dialogId}`);
        return false;
    }

    /**
     * Show a game menu dialog
     */
    showGameDialog(dialogId, data = null) {
        const gameDialogs = ['pause-menu', 'settings', 'character', 'inventory', 'mission-objectives'];

        if (gameDialogs.includes(dialogId)) {
            return this.navigateTo(dialogId, data);
        }

        if (this.logger) this.logger.warn(`Unknown game dialog: ${dialogId}`);
        return false;
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - { title, message, onConfirm, onCancel }
     */
    showConfirmation(options) {
        const engine = this.engine;
        if (!engine) return false;

        // Store confirmation data
        this.setStateData('confirmation', options);

        return this.navigateTo('confirmation', options);
    }

    /**
     * Show settings dialog (from hub or game)
     */
    showSettings() {
        // Determine which settings to show based on current context
        const currentScreen = window.game?.currentScreen;

        if (currentScreen === 'hub') {
            return this.navigateTo('hub-settings');
        } else if (currentScreen === 'game') {
            return this.navigateTo('settings');
        }

        // Default to hub settings
        return this.navigateTo('hub-settings');
    }

    /**
     * Show character sheet for an agent
     */
    showCharacter(agentId = null) {
        if (agentId) {
            this.setStateData('character', { agentId });
        }
        return this.navigateTo('character');
    }

    /**
     * Show inventory for an agent
     */
    showInventory(agentId = null) {
        if (agentId) {
            this.setStateData('inventory', { agentId });
        }
        return this.navigateTo('inventory');
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogStateService;
}

// Make available globally
window.DialogStateService = DialogStateService;
