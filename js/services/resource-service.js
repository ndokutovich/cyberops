/**
 * ResourceService - Centralized resource management
 * Handles credits, research points, world control with validation and events
 */
class ResourceService {
    constructor() {
        // Logger instance
        this.logger = window.Logger ? new window.Logger('ResourceService') : null;

        // Core resources
        this.resources = {
            credits: 0,
            researchPoints: 0,
            worldControl: 0,
            intel: 0  // For future use
        };

        // Resource constraints
        this.constraints = {
            credits: { min: 0, max: 999999999 },
            researchPoints: { min: 0, max: 999999 },
            worldControl: { min: 0, max: 100 },
            intel: { min: 0, max: 999999 }
        };

        // Track resource changes for debugging and rollback
        this.history = [];
        this.maxHistory = 100;

        // Event callbacks for UI updates
        this.listeners = {
            credits: [],
            researchPoints: [],
            worldControl: [],
            intel: [],
            any: []  // Called for any resource change
        };

        // Transaction tracking (for undo/rollback if needed)
        this.pendingTransaction = null;

        if (this.logger) this.logger.debug('ResourceService initialized');
    }

    /**
     * Initialize resources from saved state or defaults
     */
    initialize(initialState = {}) {
        this.resources.credits = this.clamp('credits', initialState.credits || 10000);
        this.resources.researchPoints = this.clamp('researchPoints', initialState.researchPoints || 0);
        this.resources.worldControl = this.clamp('worldControl', initialState.worldControl || 0);
        this.resources.intel = this.clamp('intel', initialState.intel || 0);

        if (this.logger) this.logger.info('💰 ResourceService initialized:', this.resources);
    }

    /**
     * Get current value of a resource
     */
    get(resourceType) {
        return this.resources[resourceType] || 0;
    }

    /**
     * Get all resources
     */
    getAll() {
        return { ...this.resources };
    }

    /**
     * Convenience method to get credits
     */
    getCredits() {
        return this.get('credits');
    }

    /**
     * Convenience method to get research points
     */
    getResearchPoints() {
        return this.get('researchPoints');
    }

    /**
     * Convenience method to get world control
     */
    getWorldControl() {
        return this.get('worldControl');
    }

    /**
     * Convenience method to set credits
     */
    setCredits(value) {
        return this.set('credits', value, 'initialization');
    }

    /**
     * Convenience method to set research points
     */
    setResearchPoints(value) {
        return this.set('researchPoints', value, 'initialization');
    }

    /**
     * Set a resource to a specific value (with validation)
     */
    set(resourceType, value, reason = 'direct set') {
        if (!this.resources.hasOwnProperty(resourceType)) {
            if (this.logger) this.logger.error(`❌ Invalid resource type: ${resourceType}`);
            return false;
        }

        const oldValue = this.resources[resourceType];
        const newValue = this.clamp(resourceType, value);

        if (oldValue === newValue) return true; // No change

        // Record change
        this.recordHistory(resourceType, oldValue, newValue, reason);

        // Apply change
        this.resources[resourceType] = newValue;

        // Notify listeners
        this.notifyListeners(resourceType, oldValue, newValue);

        if (this.logger) this.logger.debug(`💰 ${resourceType}: ${oldValue} → ${newValue} (${reason})`);
        return true;
    }

    /**
     * Add to a resource (handles rewards, income)
     */
    add(resourceType, amount, reason = 'addition') {
        if (amount < 0) {
            return this.spend(resourceType, Math.abs(amount), reason);
        }

        const currentValue = this.get(resourceType);
        return this.set(resourceType, currentValue + amount, reason);
    }

    /**
     * Spend from a resource (with affordability check)
     */
    spend(resourceType, amount, reason = 'purchase') {
        if (amount < 0) {
            return this.add(resourceType, Math.abs(amount), reason);
        }

        const currentValue = this.get(resourceType);

        // Check affordability
        if (currentValue < amount) {
            if (this.logger) this.logger.warn(`⚠️ Cannot afford ${amount} ${resourceType} (have: ${currentValue})`);
            return false;
        }

        return this.set(resourceType, currentValue - amount, reason);
    }

    /**
     * Check if player can afford a cost
     */
    canAfford(resourceType, amount) {
        return this.get(resourceType) >= amount;
    }

    /**
     * Perform a transaction (multiple resource changes atomically)
     */
    transaction(changes, reason = 'transaction') {
        // Validate all changes first
        const validationResults = [];

        for (const change of changes) {
            const { resource, amount, operation = 'add' } = change;

            if (operation === 'spend' || (operation === 'add' && amount < 0)) {
                const spendAmount = Math.abs(amount);
                if (!this.canAfford(resource, spendAmount)) {
                    if (this.logger) this.logger.warn(`⚠️ Transaction failed: Cannot afford ${spendAmount} ${resource}`);
                    return false;
                }
            }

            validationResults.push(change);
        }

        // Apply all changes
        const results = [];
        for (const change of validationResults) {
            const { resource, amount, operation = 'add' } = change;

            let success;
            if (operation === 'set') {
                success = this.set(resource, amount, reason);
            } else if (operation === 'spend') {
                success = this.spend(resource, amount, reason);
            } else {
                success = this.add(resource, amount, reason);
            }

            results.push({ resource, success });
        }

        return results.every(r => r.success);
    }

    /**
     * Apply mission rewards
     */
    applyMissionRewards(rewards) {
        const changes = [];

        if (rewards.credits) {
            changes.push({ resource: 'credits', amount: rewards.credits });
        }
        if (rewards.researchPoints) {
            changes.push({ resource: 'researchPoints', amount: rewards.researchPoints });
        }
        if (rewards.worldControl) {
            changes.push({ resource: 'worldControl', amount: rewards.worldControl });
        }
        if (rewards.intel) {
            changes.push({ resource: 'intel', amount: rewards.intel });
        }

        return this.transaction(changes, 'mission reward');
    }

    /**
     * Purchase an item
     */
    purchase(cost, itemName = 'item') {
        if (typeof cost === 'number') {
            return this.spend('credits', cost, `purchase: ${itemName}`);
        } else if (typeof cost === 'object') {
            // Handle multi-resource costs
            const changes = [];
            for (const [resource, amount] of Object.entries(cost)) {
                changes.push({ resource, amount, operation: 'spend' });
            }
            return this.transaction(changes, `purchase: ${itemName}`);
        }

        return false;
    }

    /**
     * Sell an item
     */
    sell(value, itemName = 'item') {
        const salePrice = typeof value === 'number' ? value : Math.floor(value.cost * 0.6);
        return this.add('credits', salePrice, `sold: ${itemName}`);
    }

    /**
     * Register a listener for resource changes
     */
    addListener(resourceType, callback) {
        if (resourceType === 'any' || resourceType === '*') {
            this.listeners.any.push(callback);
        } else if (this.listeners[resourceType]) {
            this.listeners[resourceType].push(callback);
        }
    }

    /**
     * Remove a listener
     */
    removeListener(resourceType, callback) {
        const list = resourceType === 'any' || resourceType === '*'
            ? this.listeners.any
            : this.listeners[resourceType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of a resource change
     */
    notifyListeners(resourceType, oldValue, newValue) {
        const change = { resource: resourceType, oldValue, newValue, delta: newValue - oldValue };

        // Specific listeners
        if (this.listeners[resourceType]) {
            this.listeners[resourceType].forEach(callback => {
                try {
                    callback(change);
                } catch (e) {
                    if (this.logger) this.logger.error('Error in resource listener:', e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback(change);
            } catch (e) {
                if (this.logger) this.logger.error('Error in global resource listener:', e);
            }
        });
    }

    /**
     * Clamp a value to resource constraints
     */
    clamp(resourceType, value) {
        const constraint = this.constraints[resourceType];
        if (!constraint) return value;

        return Math.max(constraint.min, Math.min(constraint.max, value));
    }

    /**
     * Record resource change in history
     */
    recordHistory(resourceType, oldValue, newValue, reason) {
        this.history.push({
            timestamp: Date.now(),
            resource: resourceType,
            oldValue,
            newValue,
            delta: newValue - oldValue,
            reason
        });

        // Trim history if too long
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Get recent history (for debugging)
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * Export state for saving
     */
    exportState() {
        return {
            resources: { ...this.resources },
            history: this.history.slice(-10) // Only save recent history
        };
    }

    /**
     * Import state from save
     */
    importState(state) {
        if (state.resources) {
            this.resources = { ...state.resources };

            // Validate all resources are within constraints
            for (const [type, value] of Object.entries(this.resources)) {
                this.resources[type] = this.clamp(type, value);
            }
        }

        if (state.history) {
            this.history = state.history;
        }

        if (this.logger) this.logger.info('💰 ResourceService state imported:', this.resources);
    }

    /**
     * Reset to default state
     */
    reset() {
        this.initialize({
            credits: 10000,
            researchPoints: 0,
            worldControl: 0,
            intel: 0
        });
        this.history = [];
        if (this.logger) this.logger.info('💰 ResourceService reset to defaults');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResourceService;
}