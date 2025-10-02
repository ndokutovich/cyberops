/**
 * ResearchService - Manages all research-related calculations and applications
 * Follows single responsibility principle
 */
class ResearchService {
    constructor(formulaService) {
        if (!formulaService) {
            throw new Error('ResearchService requires FormulaService - dependency injection required');
        }
        this.formulaService = formulaService;

        // Research project definitions
        this.projects = {
            1: {
                id: 1,
                name: 'Weapon Upgrades',
                cost: 150,
                description: '+5 damage to all weapons',
                category: 'combat',
                effects: {
                    damageBonus: 5
                }
            },
            2: {
                id: 2,
                name: 'Stealth Technology',
                cost: 200,
                description: '+20% stealth success rate',
                category: 'stealth',
                effects: {
                    stealthBonus: 20
                }
            },
            3: {
                id: 3,
                name: 'Combat Systems',
                cost: 175,
                description: '+15 health to all agents',
                category: 'combat',
                effects: {
                    healthBonus: 15
                }
            },
            4: {
                id: 4,
                name: 'Hacking Protocols',
                cost: 225,
                description: '+25% hacking speed',
                category: 'tech',
                effects: {
                    hackingBonus: 25
                }
            },
            5: {
                id: 5,
                name: 'Medical Systems',
                cost: 300,
                description: 'Auto-heal 20% health between missions',
                category: 'support',
                effects: {
                    medicalHealing: true
                }
            },
            6: {
                id: 6,
                name: 'Advanced Tactics',
                cost: 250,
                description: '+1 movement speed to all agents',
                category: 'tactical',
                effects: {
                    speedBonus: 1
                }
            }
        };
    }

    /**
     * Get all research projects
     * @returns {Array} Array of research projects
     */
    getAllProjects() {
        return Object.values(this.projects);
    }

    /**
     * Get research project by ID
     * @param {number} projectId - Project ID
     * @returns {Object} Research project
     */
    getProject(projectId) {
        return this.projects[projectId];
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

    /**
     * Check if research is already completed
     * @param {number} projectId - Project ID
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {boolean} Is research completed
     */
    isResearchCompleted(projectId, completedResearch = []) {
        return completedResearch.includes(projectId);
    }

    /**
     * Calculate total research bonuses from completed research
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {Object} Combined effects object
     */
    calculateResearchBonuses(completedResearch = []) {
        const bonuses = {
            damageBonus: 0,
            healthBonus: 0,
            speedBonus: 0,
            stealthBonus: 0,
            hackingBonus: 0,
            medicalHealing: false
        };

        completedResearch.forEach(projectId => {
            const project = this.getProject(projectId);
            if (project && project.effects) {
                Object.keys(project.effects).forEach(effect => {
                    if (typeof bonuses[effect] === 'boolean') {
                        bonuses[effect] = bonuses[effect] || project.effects[effect];
                    } else {
                        bonuses[effect] += project.effects[effect];
                    }
                });
            }
        });

        return bonuses;
    }

    /**
     * Apply research bonuses to an agent
     * @param {Object} agent - Agent object to modify
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {Object} Modified agent
     */
    applyResearchToAgent(agent, completedResearch = []) {
        const bonuses = this.calculateResearchBonuses(completedResearch);

        // CRITICAL: Modify agent IN-PLACE, don't create a copy
        // If we copy the agent, changes (like death) won't sync with AgentService

        // Apply permanent stat bonuses
        if (bonuses.damageBonus > 0) {
            agent.damage = (agent.damage || 0) + bonuses.damageBonus;
        }

        if (bonuses.healthBonus > 0) {
            agent.health = (agent.health || 0) + bonuses.healthBonus;
            agent.maxHealth = (agent.maxHealth || agent.health) + bonuses.healthBonus;
        }

        if (bonuses.speedBonus > 0) {
            agent.speed = (agent.speed || 0) + bonuses.speedBonus;
        }

        // Apply percentage bonuses (these are applied during gameplay)
        if (bonuses.stealthBonus > 0) {
            agent.stealthBonus = (agent.stealthBonus || 0) + bonuses.stealthBonus;
        }

        if (bonuses.hackingBonus > 0) {
            agent.hackBonus = (agent.hackBonus || 0) + bonuses.hackingBonus;
        }

        return agent;  // Return same reference
    }

    /**
     * Apply research effects to all agents in a roster
     * @param {Array} agents - Array of agents
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {Array} Modified agents array
     */
    applyResearchToRoster(agents, completedResearch = []) {
        return agents.map(agent => this.applyResearchToAgent(agent, completedResearch));
    }

    /**
     * Calculate research completion percentage
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {number} Completion percentage (0-100)
     */
    calculateCompletionPercentage(completedResearch = []) {
        const totalProjects = Object.keys(this.projects).length;
        const completedCount = completedResearch.length;
        return Math.floor((completedCount / totalProjects) * 100);
    }

    /**
     * Get next recommended research based on playstyle
     * @param {Array} completedResearch - Array of completed research IDs
     * @param {string} playstyle - Playstyle preference ('combat', 'stealth', 'tech', 'balanced')
     * @returns {Object|null} Recommended research project
     */
    getRecommendedResearch(completedResearch = [], playstyle = 'balanced') {
        const availableProjects = this.getAllProjects().filter(
            project => !this.isResearchCompleted(project.id, completedResearch)
        );

        if (availableProjects.length === 0) {
            return null;
        }

        // Sort by playstyle preference
        const priorityMap = {
            combat: ['combat', 'tactical', 'support', 'tech', 'stealth'],
            stealth: ['stealth', 'tech', 'tactical', 'support', 'combat'],
            tech: ['tech', 'stealth', 'support', 'tactical', 'combat'],
            balanced: ['combat', 'support', 'tactical', 'tech', 'stealth']
        };

        const priorities = priorityMap[playstyle] || priorityMap.balanced;

        // Find first available project matching priority
        for (const category of priorities) {
            const project = availableProjects.find(p => p.category === category);
            if (project) {
                return project;
            }
        }

        // Return first available if no category match
        return availableProjects[0];
    }

    /**
     * Calculate total research points spent
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {number} Total points spent
     */
    calculateTotalSpent(completedResearch = []) {
        return completedResearch.reduce((total, projectId) => {
            const project = this.getProject(projectId);
            return total + (project ? project.cost : 0);
        }, 0);
    }

    /**
     * Apply medical healing between missions
     * @param {Array} agents - Array of agents
     * @param {Array} completedResearch - Array of completed research IDs
     * @returns {Array} Healed agents
     */
    applyMedicalHealing(agents, completedResearch = []) {
        const hasMedicalResearch = this.isResearchCompleted(5, completedResearch);

        if (!hasMedicalResearch) {
            return agents;
        }

        return agents.map(agent => {
            const healedHealth = this.formulaService.calculateMedicalHealing(
                agent.health,
                agent.maxHealth || agent.health,
                true
            );

            return {
                ...agent,
                health: healedHealth
            };
        });
    }

    /**
     * Get research project status for UI
     * @param {number} projectId - Project ID
     * @param {Array} completedResearch - Completed research IDs
     * @param {number} availablePoints - Available research points
     * @returns {Object} Status object {completed, affordable, locked}
     */
    getProjectStatus(projectId, completedResearch = [], availablePoints = 0) {
        const project = this.getProject(projectId);
        if (!project) {
            return { completed: false, affordable: false, locked: true };
        }

        return {
            completed: this.isResearchCompleted(projectId, completedResearch),
            affordable: this.canAffordResearch(projectId, availablePoints),
            locked: false
        };
    }
}

// Export as singleton
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResearchService;
}