/**
 * AgentService - Centralized agent management
 * Handles all agent lifecycle, lookups, and state management
 */
class AgentService {
    constructor(resourceService = null) {
        // Logger instance
        this.logger = window.Logger ? new window.Logger('AgentService') : null;

        // Agent collections
        this.availableAgents = [];  // Can be hired
        this.activeAgents = [];      // Currently hired
        this.fallenAgents = [];      // Memorial/graveyard
        this.selectedAgents = [];    // Selected for mission

        // Agent lookup maps for fast access
        this.agentById = new Map();
        this.agentByName = new Map();

        // Service dependencies
        this.resourceService = resourceService;

        // Event listeners
        this.listeners = {
            hire: [],
            death: [],
            revive: [],
            select: [],
            update: [],
            any: []
        };

        // Agent ID counter
        this.nextAgentId = 1;

        if (this.logger) this.logger.debug('AgentService initialized');
    }

    /**
     * Initialize with campaign agents
     */
    initialize(campaignAgents = []) {
        if (this.logger) this.logger.info(`👥 Initializing AgentService with ${campaignAgents.length} agents`);

        // Clear existing data
        this.availableAgents = [];
        this.activeAgents = [];
        this.agentById.clear();
        this.agentByName.clear();

        // Process campaign agents
        campaignAgents.forEach(agentData => {
            const agent = this.createAgent(agentData);

            if (agentData.hired) {
                this.activeAgents.push(agent);
            } else {
                this.availableAgents.push(agent);
            }

            this.indexAgent(agent);
        });

        if (this.logger) this.logger.info(`✅ AgentService initialized: ${this.activeAgents.length} active, ${this.availableAgents.length} available`);
    }

    /**
     * Create a standardized agent object
     */
    createAgent(data) {
        const agent = {
            // Core identity
            id: data.id || this.nextAgentId++,
            originalId: data.originalId || data.id,
            name: data.name || `Agent ${data.id}`,

            // Status
            hired: data.hired || false,
            alive: data.alive !== undefined ? data.alive : true,
            health: data.health || 100,
            maxHealth: data.maxHealth || data.health || 100,

            // Combat stats
            damage: data.damage || 10,
            speed: data.speed || 5,
            protection: data.protection || 0,

            // Specialization
            specialization: data.specialization || 'soldier',
            skills: data.skills || [],

            // Cost and bio
            cost: data.cost || 1000,
            bio: data.bio || 'No biography available',

            // RPG integration
            level: data.level || 1,
            xp: data.xp || 0,
            rpgEntity: data.rpgEntity || null,

            // Equipment (managed by InventoryService)
            weapon: data.weapon || null,
            armor: data.armor || null,
            utility: data.utility || null,

            // Mission state
            x: data.x || 0,
            y: data.y || 0,
            moveTarget: data.moveTarget || null,
            cooldowns: data.cooldowns || []
        };

        return agent;
    }

    /**
     * Index agent for fast lookup
     */
    indexAgent(agent) {
        this.agentById.set(agent.id, agent);
        this.agentById.set(String(agent.id), agent); // Also index string version
        this.agentByName.set(agent.name, agent);

        // Also index by originalId if different
        if (agent.originalId && agent.originalId !== agent.id) {
            this.agentById.set(agent.originalId, agent);
            this.agentById.set(String(agent.originalId), agent);
        }

        // Ensure agent is in activeAgents if not already there
        // This is important for mission agents that get re-indexed with new IDs
        if (!this.activeAgents.includes(agent)) {
            // Check if we already have this agent with different ID
            const existingIndex = this.activeAgents.findIndex(a =>
                (a.originalId && a.originalId === agent.originalId) ||
                a.name === agent.name
            );

            if (existingIndex >= 0) {
                // Replace existing agent with the re-indexed one
                this.activeAgents[existingIndex] = agent;
            } else if (agent.hired !== false) {
                // Add new agent if it's hired (not in availableAgents)
                this.activeAgents.push(agent);
            }
        }
    }

    /**
     * Get agent by ID (handles multiple ID formats)
     */
    getAgent(identifier) {
        // Try as ID first
        let agent = this.agentById.get(identifier);
        if (agent) return agent;

        // Try as string ID
        agent = this.agentById.get(String(identifier));
        if (agent) return agent;

        // Try as name
        agent = this.agentByName.get(identifier);
        if (agent) return agent;

        // Try finding by any matching property
        const allAgents = [...this.activeAgents, ...this.availableAgents];
        return allAgents.find(a =>
            a.id == identifier ||
            a.originalId == identifier ||
            a.name === identifier
        );
    }

    /**
     * Get all active (hired) agents
     */
    getActiveAgents() {
        return [...this.activeAgents];
    }

    /**
     * Get all available (unhired) agents
     */
    getAvailableAgents() {
        return [...this.availableAgents];
    }

    /**
     * Clear all agents from all lists
     */
    clearAllAgents() {
        this.activeAgents = [];
        this.availableAgents = [];
        this.fallenAgents = [];
        if (this.logger) this.logger.info('🗑️ Cleared all agents');
    }

    /**
     * Add an available agent
     * @param {Object} agent - Agent to add
     */
    addAvailableAgent(agent) {
        if (!agent) return false;

        // Ensure agent has required properties
        agent.hired = agent.hired || false;
        agent.alive = agent.alive !== false;
        agent.health = agent.health || agent.maxHealth || 100;
        agent.maxHealth = agent.maxHealth || agent.health || 100;

        this.availableAgents.push(agent);
        if (this.logger) this.logger.debug(`➕ Added available agent: ${agent.name}`);
        return true;
    }

    /**
     * Get fallen agents
     */
    getFallenAgents() {
        return [...this.fallenAgents];
    }

    /**
     * Get agents selected for mission
     */
    getSelectedAgents() {
        return [...this.selectedAgents];
    }

    /**
     * Hire an agent
     */
    hireAgent(agentId) {
        const agent = this.getAgent(agentId);
        if (!agent) {
            if (this.logger) this.logger.error(`❌ Agent not found: ${agentId}`);
            return false;
        }

        // Check if already hired
        if (agent.hired) {
            if (this.logger) this.logger.warn(`⚠️ Agent ${agent.name} is already hired`);
            return false;
        }

        // Check resources if ResourceService is available
        if (this.resourceService && !this.resourceService.canAfford('credits', agent.cost)) {
            if (this.logger) this.logger.warn(`⚠️ Cannot afford to hire ${agent.name} (cost: ${agent.cost})`);
            return false;
        }

        // Deduct cost
        if (this.resourceService) {
            this.resourceService.spend('credits', agent.cost, `hired ${agent.name}`);
        }

        // Move from available to active
        const index = this.availableAgents.indexOf(agent);
        if (index > -1) {
            this.availableAgents.splice(index, 1);
        }

        agent.hired = true;
        this.activeAgents.push(agent);

        // Notify listeners
        this.notifyListeners('hire', { agent, cost: agent.cost });

        if (this.logger) this.logger.info(`✅ Hired ${agent.name} for ${agent.cost} credits`);
        return true;
    }

    /**
     * Handle agent death
     */
    killAgent(agentId, killer = null) {
        const agent = this.getAgent(agentId);
        if (!agent) return false;

        if (!agent.alive) {
            if (this.logger) this.logger.warn(`⚠️ Agent ${agent.name} is already dead`);
            return false;
        }

        agent.alive = false;
        agent.health = 0;

        // Move to fallen if hired
        if (agent.hired) {
            const index = this.activeAgents.indexOf(agent);
            if (index > -1) {
                this.activeAgents.splice(index, 1);
            }
            this.fallenAgents.push(agent);
        }

        // Notify listeners
        this.notifyListeners('death', { agent, killer });

        if (this.logger) this.logger.info(`💀 ${agent.name} has fallen${killer ? ` to ${killer}` : ''}`);
        return true;
    }

    /**
     * Revive a fallen agent
     */
    reviveAgent(agentId, cost = 5000) {
        const agent = this.fallenAgents.find(a =>
            a.id == agentId ||
            a.originalId == agentId ||
            a.name === agentId
        );

        if (!agent) {
            if (this.logger) this.logger.error(`❌ Fallen agent not found: ${agentId}`);
            return false;
        }

        // Check resources
        if (this.resourceService && !this.resourceService.canAfford('credits', cost)) {
            if (this.logger) this.logger.warn(`⚠️ Cannot afford revival (cost: ${cost})`);
            return false;
        }

        // Deduct cost
        if (this.resourceService) {
            this.resourceService.spend('credits', cost, `revived ${agent.name}`);
        }

        // Revive agent
        agent.alive = true;
        agent.health = agent.maxHealth || 100;
        agent.hired = true;

        // Move from fallen to active
        const index = this.fallenAgents.indexOf(agent);
        if (index > -1) {
            this.fallenAgents.splice(index, 1);
        }
        this.activeAgents.push(agent);

        // Re-index
        this.indexAgent(agent);

        // Notify listeners
        this.notifyListeners('revive', { agent, cost });

        if (this.logger) this.logger.info(`✨ ${agent.name} has been revived for ${cost} credits`);
        return true;
    }

    /**
     * Select agents for mission - NO AUTO-SELECTION
     */
    selectAgentsForMission(agentIds) {
        this.selectedAgents = [];

        for (const id of agentIds) {
            const agent = this.getAgent(id);
            if (agent && agent.alive && agent.hired) {
                this.selectedAgents.push(agent);
            } else {
                if (this.logger) this.logger.warn(`⚠️ Cannot select agent: ${id}`);
            }
        }

        // Notify listeners
        this.notifyListeners('select', { agents: this.selectedAgents });

        if (this.logger) this.logger.info(`👥 Selected ${this.selectedAgents.length} agents for mission (user's exact choice)`);
        return this.selectedAgents;
    }

    /**
     * Toggle agent selection for mission
     */
    toggleAgentSelection(agentId) {
        const currentIds = this.selectedAgents.map(a => a.id || a.originalId);
        const index = currentIds.indexOf(agentId);

        let newSelection;
        if (index > -1) {
            // Remove agent
            newSelection = currentIds.filter(id => id !== agentId);
        } else if (currentIds.length < 4) {
            // Add agent (max 4)
            newSelection = [...currentIds, agentId];
        } else {
            // Max reached
            if (this.logger) this.logger.warn('⚠️ Maximum 4 agents can be selected');
            return this.selectedAgents;
        }

        // Update selection
        return this.selectAgentsForMission(newSelection);
    }

    /**
     * Reset selection state (for new mission selection)
     */
    resetSelection() {
        this.selectedAgents = [];
        if (this.logger) this.logger.debug('🔄 Reset agent selection state');
    }

    /**
     * Update agent stats
     */
    updateAgent(agentId, updates) {
        const agent = this.getAgent(agentId);
        if (!agent) return false;

        // Apply updates
        const oldValues = {};
        for (const [key, value] of Object.entries(updates)) {
            if (key !== 'id' && key !== 'originalId') { // Don't change IDs
                oldValues[key] = agent[key];
                agent[key] = value;
            }
        }

        // Handle special cases
        if (updates.health !== undefined) {
            agent.health = Math.max(0, Math.min(agent.maxHealth, updates.health));
            if (agent.health <= 0 && agent.alive) {
                this.killAgent(agentId);
            }
        }

        // Notify listeners
        this.notifyListeners('update', { agent, updates, oldValues });

        return true;
    }

    /**
     * Heal agent
     */
    healAgent(agentId, amount) {
        const agent = this.getAgent(agentId);
        if (!agent || !agent.alive) return false;

        const oldHealth = agent.health;
        agent.health = Math.min(agent.maxHealth, agent.health + amount);

        if (this.logger) this.logger.debug(`💚 Healed ${agent.name}: ${oldHealth} → ${agent.health}`);
        return true;
    }

    /**
     * Damage agent
     */
    damageAgent(agentId, amount, source = null) {
        const agent = this.getAgent(agentId);
        if (!agent || !agent.alive) return false;

        const oldHealth = agent.health;
        agent.health = Math.max(0, agent.health - amount);

        if (this.logger) this.logger.debug(`💔 ${agent.name} damaged: ${oldHealth} → ${agent.health}${source ? ` by ${source}` : ''}`);

        if (agent.health <= 0) {
            this.killAgent(agentId, source);
        }

        return true;
    }

    /**
     * Get agent statistics
     */
    getStatistics() {
        return {
            total: this.activeAgents.length + this.availableAgents.length,
            active: this.activeAgents.length,
            available: this.availableAgents.length,
            fallen: this.fallenAgents.length,
            selected: this.selectedAgents.length,
            alive: this.activeAgents.filter(a => a.alive).length,
            totalCost: this.activeAgents.reduce((sum, a) => sum + a.cost, 0)
        };
    }

    /**
     * Add event listener
     */
    addListener(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        } else if (eventType === 'any' || eventType === '*') {
            this.listeners.any.push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(eventType, callback) {
        const list = eventType === 'any' || eventType === '*'
            ? this.listeners.any
            : this.listeners[eventType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(eventType, data) {
        // Specific listeners
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    if (this.logger) this.logger.error(`Error in agent listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                if (this.logger) this.logger.error('Error in global agent listener:', e);
            }
        });
    }

    /**
     * Export state for saving
     */
    exportState() {
        return {
            availableAgents: this.availableAgents,
            activeAgents: this.activeAgents,
            fallenAgents: this.fallenAgents,
            selectedAgents: this.selectedAgents.map(a => a.id),
            nextAgentId: this.nextAgentId
        };
    }

    /**
     * Import state from save
     */
    importState(state) {
        if (state.availableAgents) this.availableAgents = state.availableAgents.map(a => this.createAgent(a));
        if (state.activeAgents) this.activeAgents = state.activeAgents.map(a => this.createAgent(a));
        if (state.fallenAgents) this.fallenAgents = state.fallenAgents.map(a => this.createAgent(a));
        if (state.nextAgentId) this.nextAgentId = state.nextAgentId;

        // Re-index all agents
        this.agentById.clear();
        this.agentByName.clear();
        [...this.availableAgents, ...this.activeAgents, ...this.fallenAgents].forEach(a => this.indexAgent(a));

        // Restore selected agents
        if (state.selectedAgents) {
            this.selectedAgents = state.selectedAgents.map(id => this.getAgent(id)).filter(a => a);
        }

        if (this.logger) this.logger.info('👥 AgentService state imported');
    }

    /**
     * Reset to initial state
     */
    reset() {
        this.availableAgents = [];
        this.activeAgents = [];
        this.fallenAgents = [];
        this.selectedAgents = [];
        this.agentById.clear();
        this.agentByName.clear();
        this.nextAgentId = 1;
        if (this.logger) this.logger.info('👥 AgentService reset');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AgentService;
}