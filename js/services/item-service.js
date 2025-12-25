/**
 * ItemService - Manages collectable items and their effects
 *
 * This service handles all item pickup logic, effects application,
 * and inventory management for collectables in the game.
 *
 * Design principles:
 * - Single responsibility: Only handles item-related logic
 * - No game state dependencies: Uses services and parameters
 * - Clean dependency injection: Receives dependencies via constructor
 */

class ItemService {
    constructor(resourceService, formulaService, inventoryService) {
        this.resourceService = resourceService;
        this.formulaService = formulaService;
        this.inventoryService = inventoryService;

        // Initialize logger
        this.logger = window.Logger ? new window.Logger('ItemService') : null;

        // Track collected items for statistics
        this.itemsCollectedThisMission = {};
        this.weaponsCollectedThisMission = [];
        this.intelCollectedThisMission = 0;
        this.creditsCollectedThisMission = 0;
        this.totalIntelCollected = 0;
        this.intelByMission = {};
    }

    /**
     * Handle item pickup by an agent
     * Migrated from game-loop.js lines 316-377
     *
     * @param {Object} agent - The agent picking up the item
     * @param {Object} item - The item being picked up
     * @param {Object} context - Game context (mission, difficulty, etc.)
     * @returns {Object} - Result with notifications and effects applied
     */
    handleCollectablePickup(agent, item, context = {}) {
        const result = {
            success: true,
            notifications: [],
            effects: {},
            weaponEquipped: false
        };

        if (this.logger) this.logger.debug(`📦 ${agent.name} picking up ${item.type} at (${item.x}, ${item.y})`);

        // Add item to inventory service
        if (this.inventoryService) {
            // Pass agent object, not just ID - InventoryService expects (agent, item)
            const pickupResult = this.inventoryService.pickupItem(agent, item);

            if (pickupResult) {
                // Handle weapon-specific logic
                if (item.type === 'weapon' && item.weapon) {
                    this.weaponsCollectedThisMission.push({
                        type: item.weapon,
                        name: item.name || item.weapon,
                        damage: item.weaponDamage || item.damage || 10,
                        range: item.weaponRange || item.range || 5,
                        agentName: agent.name,
                        timestamp: Date.now()
                    });

                    result.notifications.push(`🔫 Picked up: ${item.name || item.weapon}`);

                    if (this.logger) this.logger.info(`🎯 Agent ${agent.name} picked up ${item.name || item.weapon} (damage: ${item.weaponDamage || item.damage || 10})`);

                    // Check if weapon was auto-equipped
                    const agentId = agent.originalId || agent.id || agent.name;
                    const equipment = this.inventoryService.getAgentEquipment(agentId);
                    if (equipment && equipment.weapon && equipment.weapon.id === item.weapon) {
                        result.weaponEquipped = true;
                        result.notifications.push(`⚔️ ${agent.name} equipped ${item.name || item.weapon}`);
                    }
                }

                // Credits are handled in handleCollectableEffects to avoid double-counting
                // Notifications for credits will be added there

                // Handle intel items
                if (item.type === 'intel') {
                    this.intelCollectedThisMission++;
                    this.totalIntelCollected++;

                    // Track by mission if provided
                    if (context.missionId) {
                        this.intelByMission[context.missionId] = (this.intelByMission[context.missionId] || 0) + 1;
                        if (this.logger) this.logger.debug(`📁 Intel tracked for Mission ${context.missionId}: ${this.intelByMission[context.missionId]}`);
                    }

                    result.notifications.push(`📁 Intel document collected`);
                }

                // Generic item notification
                if (item.type !== 'weapon' && item.type !== 'credits' && item.type !== 'intel') {
                    result.notifications.push(`📦 Collected: ${item.name || item.type}`);
                }
            }
        }

        // Apply item effects
        const effects = this.handleCollectableEffects(agent, item, context);
        result.effects = effects;

        // Add effect message to notifications (e.g., "💰 150 credits")
        if (effects && effects.message) {
            result.notifications.push(effects.message);
        }

        // Track item collection statistics
        this.itemsCollectedThisMission[item.type] = (this.itemsCollectedThisMission[item.type] || 0) + 1;

        return result;
    }

    /**
     * Handle and apply collectable effects
     * Migrated from game-loop.js lines 380-495
     *
     * @param {Object} agent - The agent receiving effects
     * @param {Object} item - The item providing effects
     * @param {Object} context - Game context for calculations
     * @returns {Object} - Applied effects
     */
    handleCollectableEffects(agent, item, context = {}) {
        // Use FormulaService to calculate effects
        if (this.formulaService) {
            const gameContext = {
                averageHealth: context.averageHealth || 100,
                lowAmmo: context.lowAmmo || false,
                difficulty: context.difficulty || 1
            };

            const effects = this.formulaService.calculateCollectibleEffect(item, agent, gameContext);

            // Apply credits
            if (effects.credits > 0 && this.resourceService) {
                this.resourceService.add('credits', effects.credits, `${item.type} pickup by ${agent.name}`);
                this.creditsCollectedThisMission += effects.credits;
            }

            // Apply health
            if (effects.health > 0) {
                const oldHealth = agent.health;
                agent.health = Math.min(agent.maxHealth || 100, agent.health + effects.health);
                const actualHealing = agent.health - oldHealth;

                if (actualHealing > 0 && this.logger) {
                    this.logger.info(`❤️ ${agent.name} healed for ${actualHealing} HP`);
                }
            }

            // Apply armor
            if (effects.armor > 0) {
                agent.protection = (agent.protection || 0) + effects.armor;
                if (this.logger) this.logger.info(`🛡️ ${agent.name} gained ${effects.armor} armor`);
            }

            // Apply research points
            if (effects.researchPoints > 0 && this.resourceService) {
                this.resourceService.add('researchPoints', effects.researchPoints, `${item.type} pickup by ${agent.name}`);

                // Track intel if this was an intel item
                if (item.type === 'intel') {
                    this.totalIntelCollected++;
                    this.intelCollectedThisMission++;

                    if (context.missionId) {
                        this.intelByMission[context.missionId] = (this.intelByMission[context.missionId] || 0) + 1;
                    }

                    if (this.logger) {
                        this.logger.info(`📊 Total Intel: ${this.totalIntelCollected} documents`);
                        this.logger.debug(`📋 Intel this mission: ${this.intelCollectedThisMission}`);
                    }
                }
            }

            // Apply ammo (reduces cooldowns)
            if (effects.ammo > 0) {
                agent.cooldowns = agent.cooldowns || [0, 0, 0, 0];
                for (let i = 0; i < agent.cooldowns.length; i++) {
                    agent.cooldowns[i] = Math.max(0, agent.cooldowns[i] - effects.ammo);
                }
                if (this.logger) this.logger.info(`🔫 ${agent.name} reloaded ammunition`);
            }

            // Apply explosives
            if (effects.explosives > 0) {
                agent.grenades = (agent.grenades || 0) + effects.explosives;
                if (this.logger) this.logger.info(`💣 ${agent.name} gained ${effects.explosives} grenades`);
            }

            // Apply keycards
            if (effects.keycard) {
                // Store keycard in context for game to handle
                effects.keycardType = effects.keycard;
                if (this.logger) this.logger.info(`🔑 ${agent.name} found a ${effects.keycard} keycard`);
            }

            // Log any custom message
            if (effects.message && this.logger) {
                this.logger.debug(effects.message);
            }

            return effects;
        }

        // Fallback if no formula service
        if (this.logger) this.logger.warn('⚠️ FormulaService not available for item effects calculation');
        return {};
    }

    /**
     * Reset mission statistics
     * Called at the start of a new mission
     */
    resetMissionStats() {
        this.itemsCollectedThisMission = {};
        this.weaponsCollectedThisMission = [];
        this.intelCollectedThisMission = 0;
        this.creditsCollectedThisMission = 0;

        if (this.logger) this.logger.debug('📊 Mission statistics reset');
    }

    /**
     * Get mission statistics
     * @returns {Object} Statistics for the current mission
     */
    getMissionStats() {
        return {
            itemsCollected: this.itemsCollectedThisMission,
            weaponsCollected: this.weaponsCollectedThisMission,
            intelCollected: this.intelCollectedThisMission,
            creditsCollected: this.creditsCollectedThisMission,
            totalIntel: this.totalIntelCollected
        };
    }

    /**
     * Get intel collected for a specific mission
     * @param {string} missionId - Mission ID
     * @returns {number} Intel count for the mission
     */
    getIntelForMission(missionId) {
        return this.intelByMission[missionId] || 0;
    }

    /**
     * Check if team is low on ammo
     * Migrated from game-loop.js lines 511-520
     *
     * @param {Array} agents - Array of agents
     * @returns {boolean} True if team is low on ammo
     */
    isTeamLowOnAmmo(agents) {
        if (!agents || agents.length === 0) return false;

        // Check if any agent has high cooldowns (indicating low ammo)
        return agents.some(agent => {
            if (!agent.cooldowns) return false;
            const avgCooldown = agent.cooldowns.reduce((a, b) => a + b, 0) / agent.cooldowns.length;
            return avgCooldown > 30; // Consider low ammo if cooldowns are high
        });
    }

    /**
     * Calculate average team health
     * Migrated from game-loop.js lines 498-508
     *
     * @param {Array} agents - Array of agents
     * @returns {number} Average health percentage
     */
    calculateAverageHealth(agents) {
        if (!agents || agents.length === 0) return 100;

        const aliveAgents = agents.filter(a => a.alive);
        if (aliveAgents.length === 0) return 0;

        const totalHealth = aliveAgents.reduce((sum, agent) => sum + agent.health, 0);
        const totalMaxHealth = aliveAgents.reduce((sum, agent) => sum + (agent.maxHealth || 100), 0);

        return Math.floor((totalHealth / totalMaxHealth) * 100);
    }

    /**
     * Create visual effect for item pickup
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} type - Item type
     * @returns {Object} Visual effect object
     */
    createPickupEffect(x, y, type) {
        return {
            type: 'pickup',
            x: x,
            y: y,
            text: type.toUpperCase(),
            duration: 30,
            frame: 0,
            color: this.getItemColor(type)
        };
    }

    /**
     * Get color for item type - uses CollectableRegistry
     * @param {string} type - Item type
     * @returns {string} Color hex code
     */
    getItemColor(type) {
        // Use CollectableRegistry for polymorphic color lookup
        if (window.CollectableRegistry) {
            return window.CollectableRegistry.getColor(type);
        }

        // Fallback colors
        const colors = {
            'health': '#ff0000',
            'credits': '#ffff00',
            'intel': '#00ff00',
            'weapon': '#ff00ff',
            'keycard': '#ff00ff',
            'explosives': '#ff6600'
        };
        return colors[type] || '#ffffff';
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ItemService;
}

if (typeof window !== 'undefined') {
    window.ItemService = ItemService;
}