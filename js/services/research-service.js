/**
 * ResearchService - Manages all research-related calculations and applications
 * Single source of truth for research data (loaded from campaign)
 * Integrates with FormulaService for calculations
 */
class ResearchService {
    constructor(formulaService) {
        if (!formulaService) {
            throw new Error('ResearchService requires FormulaService - dependency injection required');
        }
        this.formulaService = formulaService;

        // Research tree from campaign (REQUIRED - no fallback)
        this.researchTree = null;

        // Projects indexed by numeric ID for fast lookup
        this.projects = {};

        // Completed research tracking (array of project IDs)
        this.completedResearch = [];

        // Logger
        this.logger = window.Logger ? new window.Logger('ResearchService') : null;

        if (this.logger) this.logger.debug('ResearchService initialized');
    }

    /**
     * Initialize research tree from campaign config
     * REQUIRED - fails fast if no research tree provided
     * @param {Object} campaignConfig - Campaign configuration object
     */
    initialize(campaignConfig) {
        if (!campaignConfig?.progression?.researchTree) {
            throw new Error('ResearchService requires campaign research tree - no fallback available');
        }

        this.loadFromCampaign(campaignConfig.progression.researchTree);
    }

    /**
     * Load research tree from campaign data
     * @param {Object} researchTreeData - Research tree from campaign
     */
    loadFromCampaign(researchTreeData) {
        this.researchTree = researchTreeData;
        this.projects = {};
        let projectId = 1;

        Object.entries(researchTreeData).forEach(([categoryId, category]) => {
            if (category.projects) {
                category.projects.forEach(project => {
                    this.projects[projectId] = {
                        id: projectId,
                        stringId: project.id,
                        name: project.name,
                        cost: project.cost,
                        description: project.description,
                        category: categoryId,
                        effects: project.effects || {},
                        prereqs: project.prereqs || []
                    };
                    projectId++;
                });
            }
        });

        if (this.logger) this.logger.info(`📚 Loaded ${projectId - 1} research projects from campaign`);
    }

    /**
     * Get the research tree structure for UI
     * @returns {Object|null} Research tree with categories and projects
     */
    getResearchTree() {
        return this.researchTree;
    }

    /**
     * Get projects by category
     * @param {string} categoryId - Category ID
     * @returns {Array} Array of projects in that category
     */
    getProjectsByCategory(categoryId) {
        return this.getAllProjects().filter(p => p.category === categoryId);
    }

    /**
     * Get all research projects
     * @returns {Array} Array of research projects
     */
    getAllProjects() {
        return Object.values(this.projects);
    }

    /**
     * Get research project by numeric ID
     * @param {number} projectId - Project ID
     * @returns {Object} Research project
     */
    getProject(projectId) {
        return this.projects[projectId];
    }

    /**
     * Get research project by string ID
     * @param {string} stringId - Project string ID from campaign
     * @returns {Object} Research project
     */
    getProjectByStringId(stringId) {
        return this.getAllProjects().find(p => p.stringId === stringId);
    }

    /**
     * Complete a research project
     * @param {number} projectId - Project ID to complete
     * @param {Object} game - Game instance for resource deduction
     * @returns {boolean} Success status
     */
    completeResearch(projectId, game) {
        const project = this.getProject(projectId);
        if (!project) {
            if (this.logger) this.logger.error(`Project ${projectId} not found`);
            return false;
        }

        if (this.completedResearch.includes(projectId)) {
            if (this.logger) this.logger.warn(`Project ${project.name} already completed`);
            return false;
        }

        // Check prerequisites
        if (project.prereqs && project.prereqs.length > 0) {
            const prereqsMet = project.prereqs.every(prereqId => {
                const prereqProject = this.getProjectByStringId(prereqId);
                return prereqProject && this.completedResearch.includes(prereqProject.id);
            });
            if (!prereqsMet) {
                if (this.logger) this.logger.warn(`Prerequisites not met for ${project.name}`);
                return false;
            }
        }

        // Spend research points via ResourceService
        const resourceService = game?.gameServices?.resourceService || window.GameServices?.resourceService;
        if (!resourceService) {
            throw new Error('ResourceService required for research completion');
        }

        if (!resourceService.canAfford('researchPoints', project.cost)) {
            if (this.logger) this.logger.warn(`Cannot afford ${project.name} (cost: ${project.cost})`);
            return false;
        }
        resourceService.spend('researchPoints', project.cost, `research: ${project.name}`);

        this.completedResearch.push(projectId);
        if (this.logger) this.logger.info(`🔬 Research completed: ${project.name}`);

        return true;
    }

    /**
     * Get completed research IDs
     * @returns {Array} Array of completed project IDs
     */
    getCompletedResearch() {
        return [...this.completedResearch];
    }

    /**
     * Check if a specific research is completed by string ID
     * @param {string} stringId - Research string ID from campaign
     * @returns {boolean} True if completed
     */
    hasResearch(stringId) {
        const project = this.getProjectByStringId(stringId);
        return project && this.completedResearch.includes(project.id);
    }

    /**
     * Check if research is completed by numeric ID
     * @param {number} projectId - Project ID
     * @returns {boolean} Is research completed
     */
    isResearchCompleted(projectId) {
        return this.completedResearch.includes(projectId);
    }

    /**
     * Check if research can be afforded
     * @param {number} projectId - Project ID
     * @param {number} availablePoints - Available research points
     * @returns {boolean} Can afford research
     */
    canAffordResearch(projectId, availablePoints) {
        const project = this.getProject(projectId);
        return project && availablePoints >= project.cost;
    }

    // ==================== BONUS CALCULATIONS (integrated with FormulaService) ====================

    /**
     * Calculate total research bonuses from completed research
     * @returns {Object} Combined effects object
     */
    calculateResearchBonuses() {
        const bonuses = {
            // Numeric bonuses (additive)
            damageBonus: 0,
            healthBonus: 0,
            speedBonus: 0,
            stealthBonus: 0,
            hackingBonus: 0,
            hackTimeReduction: 0,
            detectionReduction: 0,
            critBonus: 0,
            passiveHealing: 0,
            healPercent: 0,
            hackRangeBonus: 0,
            // Boolean flags (any true = true)
            medicalHealing: false,
            fieldRepair: false
        };

        this.completedResearch.forEach(projectId => {
            const project = this.getProject(projectId);
            if (project && project.effects) {
                Object.keys(project.effects).forEach(effect => {
                    if (typeof bonuses[effect] === 'boolean') {
                        bonuses[effect] = bonuses[effect] || project.effects[effect];
                    } else if (bonuses[effect] !== undefined) {
                        bonuses[effect] += project.effects[effect];
                    }
                });
            }
        });

        return bonuses;
    }

    /**
     * Get damage bonus for FormulaService integration
     * @returns {number} Damage bonus from research
     */
    getDamageBonus() {
        return this.calculateResearchBonuses().damageBonus;
    }

    /**
     * Get speed bonus for FormulaService integration
     * @returns {number} Speed bonus from research
     */
    getSpeedBonus() {
        return this.calculateResearchBonuses().speedBonus;
    }

    /**
     * Get stealth bonus for FormulaService integration
     * @returns {number} Stealth bonus percentage from research
     */
    getStealthBonus() {
        return this.calculateResearchBonuses().stealthBonus;
    }

    /**
     * Get hacking bonus for FormulaService integration
     * @returns {number} Hacking bonus percentage from research
     */
    getHackingBonus() {
        return this.calculateResearchBonuses().hackingBonus;
    }

    /**
     * Get critical hit bonus for FormulaService integration
     * @returns {number} Critical hit bonus percentage from research
     */
    getCritBonus() {
        return this.calculateResearchBonuses().critBonus;
    }

    /**
     * Get passive healing per turn
     * @returns {number} HP healed per turn when stationary
     */
    getPassiveHealing() {
        return this.calculateResearchBonuses().passiveHealing;
    }

    /**
     * Get heal percentage for between-mission healing
     * @returns {number} Percentage of health restored between missions
     */
    getHealPercent() {
        return this.calculateResearchBonuses().healPercent || 20; // Default 20% if medicalHealing but no percent
    }

    /**
     * Get hacking range bonus
     * @returns {number} Additional hack range tiles
     */
    getHackRangeBonus() {
        return this.calculateResearchBonuses().hackRangeBonus;
    }

    /**
     * Get detection reduction bonus
     * @returns {number} Detection range reduction percentage
     */
    getDetectionReduction() {
        return this.calculateResearchBonuses().detectionReduction;
    }

    /**
     * Check if medical healing research is completed
     * @returns {boolean} Has medical healing
     */
    hasMedicalHealing() {
        return this.hasResearch('medical_systems');
    }

    /**
     * Check if hacking research is completed
     * @returns {boolean} Has hacking protocols
     */
    hasHackingResearch() {
        return this.hasResearch('hacking_protocols') || this.hasResearch('neural_interface');
    }

    // ==================== AGENT APPLICATION ====================

    /**
     * Apply research bonuses to an agent (modifies in-place)
     * @param {Object} agent - Agent object to modify
     * @returns {Object} Modified agent (same reference)
     */
    applyResearchToAgent(agent) {
        const bonuses = this.calculateResearchBonuses();

        // Apply permanent stat bonuses
        if (bonuses.damageBonus > 0) {
            agent.damage = (agent.damage || 0) + bonuses.damageBonus;
        }

        if (bonuses.healthBonus > 0) {
            agent.maxHealth = (agent.maxHealth || agent.health || 100) + bonuses.healthBonus;
            if (window.GameServices?.agentService) {
                window.GameServices.agentService.healAgent(agent.id, bonuses.healthBonus);
            } else {
                agent.health = (agent.health || 0) + bonuses.healthBonus;
            }
        }

        if (bonuses.speedBonus > 0) {
            agent.speed = (agent.speed || 0) + bonuses.speedBonus;
        }

        // Store percentage bonuses for runtime use
        if (bonuses.stealthBonus > 0) {
            agent.stealthBonus = (agent.stealthBonus || 0) + bonuses.stealthBonus;
        }

        if (bonuses.hackingBonus > 0) {
            agent.hackBonus = (agent.hackBonus || 0) + bonuses.hackingBonus;
        }

        if (bonuses.critBonus > 0) {
            agent.critBonus = (agent.critBonus || 0) + bonuses.critBonus;
        }

        if (bonuses.hackRangeBonus > 0) {
            agent.hackRangeBonus = (agent.hackRangeBonus || 0) + bonuses.hackRangeBonus;
        }

        if (bonuses.detectionReduction > 0) {
            agent.detectionReduction = (agent.detectionReduction || 0) + bonuses.detectionReduction;
        }

        if (bonuses.passiveHealing > 0) {
            agent.passiveHealing = (agent.passiveHealing || 0) + bonuses.passiveHealing;
        }

        return agent;
    }

    /**
     * Apply research effects to all agents in a roster
     * @param {Array} agents - Array of agents
     * @returns {Array} Modified agents array
     */
    applyResearchToRoster(agents) {
        return agents.map(agent => this.applyResearchToAgent(agent));
    }

    /**
     * Apply medical healing between missions (uses FormulaService)
     * Uses configurable healPercent from research effects
     * @param {Array} agents - Array of agents
     * @returns {Array} Healed agents
     */
    applyMedicalHealing(agents) {
        if (!this.hasMedicalHealing()) {
            return agents;
        }

        const healPercent = this.getHealPercent();

        return agents.map(agent => {
            const maxHealth = agent.maxHealth || agent.health || 100;
            const healAmount = Math.floor(maxHealth * (healPercent / 100));
            const healedHealth = Math.min(agent.health + healAmount, maxHealth);

            if (this.logger && healedHealth > agent.health) {
                this.logger.debug(`💊 ${agent.name} healed ${healedHealth - agent.health} HP (${healPercent}%)`);
            }

            return {
                ...agent,
                health: healedHealth
            };
        });
    }

    // ==================== STATISTICS ====================

    /**
     * Calculate research completion percentage
     * @returns {number} Completion percentage (0-100)
     */
    calculateCompletionPercentage() {
        const totalProjects = Object.keys(this.projects).length;
        if (totalProjects === 0) return 0;
        return Math.floor((this.completedResearch.length / totalProjects) * 100);
    }

    /**
     * Calculate total research points spent
     * @returns {number} Total points spent
     */
    calculateTotalSpent() {
        return this.completedResearch.reduce((total, projectId) => {
            const project = this.getProject(projectId);
            return total + (project ? project.cost : 0);
        }, 0);
    }

    /**
     * Get next recommended research based on playstyle
     * @param {string} playstyle - Playstyle preference
     * @returns {Object|null} Recommended research project
     */
    getRecommendedResearch(playstyle = 'balanced') {
        const availableProjects = this.getAllProjects().filter(
            project => !this.isResearchCompleted(project.id)
        );

        if (availableProjects.length === 0) return null;

        const priorityMap = {
            combat: ['combat', 'support', 'tech', 'stealth'],
            stealth: ['stealth', 'tech', 'support', 'combat'],
            tech: ['tech', 'stealth', 'support', 'combat'],
            balanced: ['combat', 'support', 'tech', 'stealth']
        };

        const priorities = priorityMap[playstyle] || priorityMap.balanced;

        for (const category of priorities) {
            const project = availableProjects.find(p => p.category === category);
            if (project) return project;
        }

        return availableProjects[0];
    }

    /**
     * Get research project status for UI
     * @param {number} projectId - Project ID
     * @param {number} availablePoints - Available research points
     * @returns {Object} Status object
     */
    getProjectStatus(projectId, availablePoints = 0) {
        const project = this.getProject(projectId);
        if (!project) {
            return { completed: false, affordable: false, locked: true };
        }

        // Check prerequisites
        let locked = false;
        if (project.prereqs && project.prereqs.length > 0) {
            locked = !project.prereqs.every(prereqId => {
                const prereqProject = this.getProjectByStringId(prereqId);
                return prereqProject && this.completedResearch.includes(prereqProject.id);
            });
        }

        return {
            completed: this.isResearchCompleted(projectId),
            affordable: this.canAffordResearch(projectId, availablePoints),
            locked
        };
    }

    // ==================== PERSISTENCE ====================

    /**
     * Export research state for save system
     * @returns {Object} Serializable state
     */
    exportState() {
        return {
            completedResearch: [...this.completedResearch]
        };
    }

    /**
     * Import research state from save system
     * @param {Object} state - Saved state
     */
    importState(state) {
        if (state?.completedResearch) {
            this.completedResearch = [...state.completedResearch];
            if (this.logger) this.logger.info(`📚 Restored ${this.completedResearch.length} completed research projects`);
        }
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResearchService;
}
