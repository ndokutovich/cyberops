/**
 * Campaign Content Interface
 * Defines the contract between engine and campaign content
 * The engine ONLY knows about these interfaces, not specific content
 */

class CampaignContentInterface {
    constructor() {
        // Define the schema version for compatibility
        this.schemaVersion = "1.0.0";

        // Define required and optional content sections
        this.requiredSections = [
            'metadata',
            'agents',
            'weapons',
            'equipment',
            'enemies',
            'missions'
        ];

        this.optionalSections = [
            'rpgConfig',
            'economy',
            'combat',
            'progression',
            'audio',
            'ui',
            'formulas'
        ];
    }

    /**
     * Validate campaign content against interface
     * @param {Object} campaign - Campaign data to validate
     * @returns {Object} Validation result with errors array
     */
    validateCampaign(campaign) {
        const errors = [];
        const warnings = [];

        // First check if campaign exists
        if (!campaign) {
            errors.push("Campaign is null or undefined");
            return { valid: false, errors, warnings };
        }

        // Check required sections - this is the critical check!
        for (const section of this.requiredSections) {
            if (!campaign[section]) {
                errors.push(`Missing required section: ${section}`);
            }
        }

        // Validate metadata separately (already in required sections, but check content)
        if (campaign.metadata) {
            if (!campaign.metadata.name) errors.push("Campaign must have a name");
            if (!campaign.metadata.version) warnings.push("Campaign should specify version");
        }

        // Validate agents structure if present
        if (campaign.agents && Array.isArray(campaign.agents)) {
            campaign.agents.forEach((agent, idx) => {
                if (!agent.id) errors.push(`Agent ${idx} missing ID`);
                if (!agent.name) errors.push(`Agent ${idx} missing name`);
                if (!agent.class && campaign.rpgConfig) warnings.push(`Agent ${agent.name} has no class`);
            });
        }

        console.log('[VALIDATE] Campaign:', campaign);
        console.log('[VALIDATE] Errors:', errors);
        console.log('[VALIDATE] Valid?', errors.length === 0);

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate a mission structure
     * @param {Object} mission - Mission data to validate
     * @returns {Object} Validation result
     */
    validateMission(mission) {
        const errors = [];
        const warnings = [];

        if (!mission.id) errors.push("Mission must have an ID");
        if (!mission.name) errors.push("Mission must have a name");
        if (!mission.briefing) warnings.push("Mission should have briefing");
        if (!mission.map) errors.push("Mission must have a map");
        if (!mission.objectives || !Array.isArray(mission.objectives)) {
            warnings.push("Mission should have objectives");
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate an agent structure
     * @param {Object} agent - Agent data to validate
     * @returns {Object} Validation result
     */
    validateAgent(agent) {
        const errors = [];
        const warnings = [];

        if (!agent.id) errors.push("Agent must have an ID");
        if (!agent.name) errors.push("Agent must have a name");
        if (!agent.health && agent.health !== 0) warnings.push("Agent should have health");
        if (!agent.damage && agent.damage !== 0) warnings.push("Agent should have damage");

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Validate a weapon structure
     * @param {Object} weapon - Weapon data to validate
     * @returns {Object} Validation result
     */
    validateWeapon(weapon) {
        const errors = [];
        const warnings = [];

        if (!weapon.id) errors.push("Weapon must have an ID");
        if (!weapon.name) errors.push("Weapon must have a name");
        if (!weapon.damage && weapon.damage !== 0) errors.push("Weapon must have damage");
        if (!weapon.cost && weapon.cost !== 0) warnings.push("Weapon should have cost");

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get default campaign structure
     * @returns {Object} Default campaign object
     */
    getDefaultCampaign() {
        return {
            metadata: {
                id: "custom",
                name: "Custom Campaign",
                version: "1.0.0",
                author: "Unknown",
                description: "A custom campaign",
                schemaVersion: this.schemaVersion
            },

            // Core content
            agents: [],
            weapons: [],
            equipment: [],
            enemies: [],
            missions: [],

            // RPG Configuration (optional but recommended)
            rpgConfig: {
                classes: {},
                skills: {},
                stats: {
                    primary: ['strength', 'agility', 'intelligence', 'endurance', 'tech', 'charisma'],
                    derived: {} // Calculated from primary
                },
                levelCurve: {
                    type: "exponential",
                    baseXP: 100,
                    multiplier: 1.5
                }
            },

            // Economy configuration
            economy: {
                startingCredits: 5000,
                startingResearchPoints: 100,
                sellValueMultiplier: 0.5,
                repairCostMultiplier: 0.3
            },

            // Combat formulas and balance
            combat: {
                formulaSet: "standard", // or "realistic", "arcade", "custom"
                damageVariance: 0.2,
                criticalMultiplier: 2.0,
                dodgeBaseChance: 0.05,
                armorEffectiveness: 1.0,
                customFormulas: {} // For formulaSet: "custom"
            },

            // Progression and unlocks
            progression: {
                researchTree: {},
                unlockSchedule: [],
                milestones: [],
                achievements: []
            },

            // Audio configuration
            audio: {
                musicVolume: 0.7,
                sfxVolume: 0.8,
                tracks: {
                    menu: null, // Path to menu music
                    hub: null,
                    combat: null,
                    stealth: null,
                    victory: null,
                    defeat: null
                },
                soundEffects: {} // Custom sound mappings
            },

            // UI customization
            ui: {
                theme: "cyberpunk", // or "military", "scifi", "fantasy", "custom"
                primaryColor: "#00ffff",
                secondaryColor: "#ff00ff",
                dangerColor: "#ff0000",
                successColor: "#00ff00",
                strings: {
                    // Localization support
                    en: this.getDefaultStrings()
                }
            },

            // Formula configurations
            formulas: {
                damage: {
                    type: "standard",
                    config: {}
                },
                experience: {
                    type: "standard",
                    config: {}
                },
                movement: {
                    type: "standard",
                    config: {}
                }
            }
        };
    }

    /**
     * Get default UI strings
     * @returns {Object} Default strings for English
     */
    getDefaultStrings() {
        return {
            // Menu strings
            menu: {
                newGame: "New Game",
                continue: "Continue",
                options: "Options",
                credits: "Credits",
                exit: "Exit"
            },

            // Hub strings
            hub: {
                arsenal: "Arsenal",
                research: "Research",
                missions: "Missions",
                agents: "Agents",
                save: "Save Game",
                load: "Load Game"
            },

            // Combat strings
            combat: {
                shoot: "Shoot",
                grenade: "Grenade",
                hack: "Hack",
                shield: "Shield",
                move: "Move",
                endTurn: "End Turn"
            },

            // RPG strings
            rpg: {
                level: "Level",
                experience: "Experience",
                stats: "Stats",
                skills: "Skills",
                inventory: "Inventory",
                equipment: "Equipment"
            },

            // Messages
            messages: {
                missionComplete: "Mission Complete!",
                missionFailed: "Mission Failed",
                agentDown: "{agent} has been eliminated!",
                levelUp: "{agent} reached level {level}!",
                itemAcquired: "Acquired {item}",
                notEnoughCredits: "Insufficient credits",
                saveComplete: "Game saved successfully",
                loadComplete: "Game loaded successfully"
            }
        };
    }

    /**
     * Merge campaign with defaults
     * @param {Object} campaign - Partial campaign data
     * @returns {Object} Complete campaign with defaults
     */
    mergeCampaignWithDefaults(campaign) {
        // Version marker to ensure new code is loaded
        console.log('[MERGE] Version: 2024-12-23-v4-fixed');

        const defaults = this.getDefaultCampaign();

        // Deep copy defaults first
        const result = JSON.parse(JSON.stringify(defaults));

        // Now overlay campaign properties on top
        if (campaign) {
            for (const key in campaign) {
                if (campaign[key] !== undefined) {
                    if (key === 'metadata' && result.metadata) {
                        // Special handling for metadata - merge it
                        result.metadata = Object.assign({}, result.metadata, campaign.metadata);
                    } else if (typeof campaign[key] === 'object' && campaign[key] !== null && !Array.isArray(campaign[key])) {
                        // For other objects, merge them
                        result[key] = Object.assign({}, result[key] || {}, campaign[key]);
                    } else {
                        // For primitives and arrays, replace
                        result[key] = campaign[key];
                    }
                }
            }
        }

        console.log('[MERGE] Result keys:', Object.keys(result));
        console.log('[MERGE] Has agents?', 'agents' in result, Array.isArray(result.agents));

        return result;
    }

    /**
     * Convert legacy content to new format
     * @param {Object} legacyGame - Old game instance
     * @returns {Object} Campaign in new format
     */
    convertLegacyContent(legacyGame) {
        const campaign = this.getDefaultCampaign();

        // Convert agents
        if (legacyGame.availableAgents) {
            campaign.agents = legacyGame.availableAgents.map(agent => ({
                id: agent.id || agent.name,
                name: agent.name,
                portrait: agent.portrait,
                health: agent.health || 100,
                damage: agent.damage || 10,
                class: agent.class || "soldier",
                hiringCost: agent.hiringCost || 1000,
                backstory: agent.backstory || "",
                stats: agent.stats || {}
            }));
        }

        // Convert weapons
        if (legacyGame.weapons) {
            campaign.weapons = legacyGame.weapons.map(weapon => ({
                id: weapon.id,
                name: weapon.name,
                damage: weapon.damage,
                range: weapon.range,
                ammo: weapon.ammo,
                cost: weapon.cost,
                weight: weapon.weight || 5,
                requiredLevel: weapon.requiredLevel || 1
            }));
        }

        // RPG config should come from campaign file

        return campaign;
    }
}

// Export for use
window.CampaignContentInterface = new CampaignContentInterface();