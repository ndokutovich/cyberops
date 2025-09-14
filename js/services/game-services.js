/**
 * GameServices - Service locator and manager for all game services
 * Provides centralized access to all calculation services
 */
class GameServices {
    constructor() {
        // Initialize services with dependency injection
        this.formulaService = new FormulaService();
        this.researchService = new ResearchService(this.formulaService);
        this.equipmentService = new EquipmentService(this.formulaService);

        // Bind context for methods that might be called externally
        this.calculateAgentStats = this.calculateAgentStats.bind(this);
        this.applyAllModifiers = this.applyAllModifiers.bind(this);
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
     * @param {Object} context - Attack context {distance, cover, critical}
     * @returns {number} Final damage
     */
    calculateAttackDamage(attacker, target, context = {}) {
        const baseDamage = attacker.damage || 0;
        const weaponBonus = attacker.weaponDamage || 0;
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
        // First distribute weapons optimally
        const weaponAssignments = this.equipmentService.distributeWeapons(
            roster,
            gameState.weapons || []
        );

        return roster.map((agent, index) => {
            const assignment = weaponAssignments[index];

            // Apply research bonuses first
            let modifiedAgent = this.researchService.applyResearchToAgent(
                { ...agent },
                gameState.completedResearch || []
            );

            // Then apply equipment with the assigned weapon
            modifiedAgent = this.equipmentService.applyEquipmentToAgent(
                modifiedAgent,
                [], // Empty weapon inventory since we're using assigned weapon
                gameState.equipment || [],
                assignment ? assignment.weapon : null
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