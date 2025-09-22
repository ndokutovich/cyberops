/**
 * GameServices - Service locator and manager for all game services
 * Provides centralized access to all calculation services
 */
class GameServices {
    constructor() {
        // Logger instance
        this.logger = window.Logger ? new window.Logger('GameServices') : null;

        // Initialize core services first
        this.formulaService = new FormulaService();
        this.resourceService = new ResourceService();
        this.agentService = new AgentService(this.resourceService);

        // Initialize dependent services
        this.researchService = new ResearchService(this.formulaService);
        this.equipmentService = new EquipmentService(this.formulaService);
        this.rpgService = new RPGService(this.formulaService);
        this.inventoryService = new InventoryService(this.formulaService, this.equipmentService);

        // Bind context for methods that might be called externally
        this.calculateAgentStats = this.calculateAgentStats.bind(this);
        this.applyAllModifiers = this.applyAllModifiers.bind(this);
        this.calculateAttackDamage = this.calculateAttackDamage.bind(this);

        if (this.logger) this.logger.debug('GameServices initialized with all services');
    }

    /**
     * Calculate complete agent stats with all modifiers
     * @param {Object} baseAgent - Base agent data
     * @param {Array} completedResearch - Completed research IDs
     * @param {Array} weaponInventory - Weapon inventory
     * @param {Array} equipmentInventory - Equipment inventory
     * @returns {Object} Fully modified agent
     */
    calculateAgentStats(baseAgent, completedResearch = [], weaponInventory = [], equipmentInventory = []) {
        // Start with base agent
        let agent = { ...baseAgent };

        // Apply research bonuses
        agent = this.researchService.applyResearchToAgent(agent, completedResearch);

        // Apply equipment bonuses
        agent = this.equipmentService.applyEquipmentToAgent(agent, weaponInventory, equipmentInventory);

        return agent;
    }

    /**
     * Calculate damage for an attack
     * @param {Object} attacker - Attacking agent
     * @param {Object} target - Target agent/enemy
     * @param {Object} context - Attack context {distance, cover, critical, weaponType}
     * @returns {number} Final damage
     */
    calculateAttackDamage(attacker, target, context = {}) {
        // Use RPG service if entities have RPG data
        if (this.rpgService && (attacker.rpgEntity || target.rpgEntity)) {
            return this.rpgService.calculateRPGDamage(
                attacker,
                target,
                context.weaponType || 'rifle'
            );
        }

        // Fallback to traditional calculation with REAL-TIME equipment check
        let baseDamage = 20; // Default base damage
        let weaponBonus = 0;

        // First check if attacker already has weapon data (from equipped weapon)
        if (attacker.weapon && attacker.weapon.damage) {
            weaponBonus = attacker.weapon.damage;
            if (this.formulaService && this.formulaService.logger) {
                this.formulaService.logger.debug(`⚔️ Using equipped weapon damage: ${weaponBonus} from ${attacker.weapon.type}`);
            }
        }
        // Otherwise check for real-time equipped weapon from loadout
        else if (window.game && window.game.agentLoadouts) {
            const agentId = attacker.originalId || attacker.id || attacker.name;
            const loadout = window.game.agentLoadouts[agentId];

            if (loadout && loadout.weapon && window.game.weapons) {
                // Find the actual weapon from the loadout
                const equippedWeapon = window.game.weapons.find(w => w.id === loadout.weapon);
                if (equippedWeapon) {
                    weaponBonus = equippedWeapon.damage || 0;
                    if (this.formulaService && this.formulaService.logger) {
                        this.formulaService.logger.debug(`🔫 Using loadout weapon damage: ${weaponBonus} from ${equippedWeapon.name}`);
                    }
                }
            }
        }

        // Get agent's base damage
        if (attacker.baseDamage !== undefined) {
            baseDamage = attacker.baseDamage;
        } else {
            baseDamage = attacker.damage || 20;
        }

        const researchBonus = attacker.damageBonus || 0;
        const targetArmor = target.protection || 0;

        return this.formulaService.calculateDamage(
            baseDamage,
            weaponBonus,
            researchBonus,
            targetArmor,
            context
        );
    }

    /**
     * Calculate grenade damage at position
     * @param {Object} agent - Agent throwing grenade
     * @param {number} targetDistance - Distance to target
     * @returns {number} Damage at distance
     */
    calculateGrenadeDamage(agent, targetDistance) {
        const baseDamage = 50; // Base grenade damage
        const explosiveBonus = agent.explosiveDamage || 0;
        const blastRadius = agent.blastRadius || 3;

        return this.formulaService.calculateGrenadeDamage(
            baseDamage,
            explosiveBonus,
            targetDistance,
            blastRadius
        );
    }

    /**
     * Calculate hacking range for agent
     * @param {Object} agent - Agent attempting hack
     * @param {Array} completedResearch - Completed research IDs
     * @returns {number} Hacking range in tiles
     */
    calculateHackingRange(agent, completedResearch = []) {
        const baseRange = 3;
        const hackBonus = agent.hackBonus || 0;
        const hasHackingResearch = this.researchService.isResearchCompleted(4, completedResearch);

        return this.formulaService.calculateHackingRange(
            baseRange,
            hackBonus,
            hasHackingResearch
        );
    }

    /**
     * Calculate enemy detection range for agent
     * @param {Object} agent - Agent being detected
     * @param {number} enemyAlertLevel - Enemy alert level
     * @returns {number} Detection range
     */
    calculateDetectionRange(agent, enemyAlertLevel = 0) {
        const stealthBonus = agent.stealthBonus || 0;
        return this.formulaService.calculateDetectionRange(null, stealthBonus, enemyAlertLevel);
    }

    /**
     * Apply all modifiers to a roster of agents
     * @param {Array} roster - Array of base agents
     * @param {Object} gameState - Current game state with research and inventory
     * @returns {Array} Modified roster
     */
    applyAllModifiers(roster, gameState) {
        // NOTE: Weapon distribution is now handled by agentLoadouts system
        // Each agent's equipment is manually configured in the Arsenal

        return roster.map((agent, index) => {
            // Apply research bonuses first
            let modifiedAgent = this.researchService.applyResearchToAgent(
                { ...agent },
                gameState.completedResearch || []
            );

            // Apply equipment bonuses (weapon assignment now handled by loadouts)
            modifiedAgent = this.equipmentService.applyEquipmentToAgent(
                modifiedAgent,
                gameState.weapons || [],
                gameState.equipment || [],
                null // No auto-assigned weapon
            );

            return modifiedAgent;
        });
    }

    /**
     * Calculate mission rewards with bonuses
     * @param {Object} missionData - Mission completion data
     * @returns {Object} Calculated rewards
     */
    calculateMissionRewards(missionData) {
        return this.formulaService.calculateMissionRewards(missionData);
    }

    /**
     * Get recommended purchases based on budget and needs
     * @param {Object} gameState - Current game state
     * @returns {Object} Recommendations {research, weapons, equipment}
     */
    getRecommendations(gameState) {
        const recommendations = {
            research: null,
            weapons: [],
            equipment: []
        };

        // Get recommended research
        recommendations.research = this.researchService.getRecommendedResearch(
            gameState.completedResearch || [],
            gameState.playstyle || 'balanced'
        );

        // Get recommended equipment for each agent
        if (gameState.activeAgents) {
            gameState.activeAgents.forEach(agent => {
                const loadout = this.equipmentService.getRecommendedLoadout(
                    agent.specialization,
                    gameState.credits || 0
                );
                recommendations.equipment.push({
                    agent: agent.name,
                    items: loadout
                });
            });
        }

        return recommendations;
    }

    /**
     * Validate game state for consistency
     * @param {Object} gameState - Game state to validate
     * @returns {Object} Validation result {valid, errors}
     */
    validateGameState(gameState) {
        const errors = [];

        // Check agent stats are within bounds
        if (gameState.agents) {
            gameState.agents.forEach(agent => {
                if (agent.health < 0) {
                    errors.push(`Agent ${agent.name} has negative health`);
                }
                if (agent.speed < 1) {
                    errors.push(`Agent ${agent.name} has invalid speed`);
                }
            });
        }

        // Check research consistency
        if (gameState.completedResearch) {
            const totalCost = this.researchService.calculateTotalSpent(gameState.completedResearch);
            if (totalCost > gameState.totalResearchSpent) {
                errors.push('Research cost mismatch');
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get service statistics for debugging
     * @returns {Object} Service statistics
     */
    getStatistics() {
        return {
            totalResearchProjects: Object.keys(this.researchService.projects).length,
            totalWeapons: Object.keys(this.equipmentService.weapons).length,
            totalEquipment: Object.keys(this.equipmentService.equipment).length,
            formulaConstants: this.formulaService.constants
        };
    }
}

// Create singleton instance
const gameServices = new GameServices();

// Export for use in game
if (typeof window !== 'undefined') {
    window.GameServices = gameServices;
}