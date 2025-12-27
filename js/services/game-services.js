/**
 * GameServices - Service locator and manager for all game services
 * Provides centralized access to all calculation services
 */
if (typeof GameServices === 'undefined') {
    var GameServices = class GameServices {
    constructor() {
        // Logger instance
        this.logger = window.Logger ? new window.Logger('GameServices') : null;

        try {
            // Initialize core services first
            if (this.logger) this.logger.debug('Initializing FormulaService...');
            this.formulaService = new FormulaService();

            if (this.logger) this.logger.debug('Initializing ResourceService...');
            this.resourceService = new ResourceService();

            if (this.logger) this.logger.debug('Initializing AgentService...');
            this.agentService = new AgentService(this.resourceService);

            // Mission services
            if (this.logger) this.logger.debug('Initializing MissionService...');
            this.missionService = new MissionService(this.resourceService, this.agentService);

            if (this.logger) this.logger.debug('Initializing MissionStateService...');
            this.missionStateService = new MissionStateService(); // Mission state isolation

            // Initialize dependent services
            if (this.logger) this.logger.debug('Initializing ResearchService...');
            this.researchService = new ResearchService(this.formulaService);

            if (this.logger) this.logger.debug('Initializing EquipmentService...');
            this.equipmentService = new EquipmentService(this.formulaService);

            if (this.logger) this.logger.debug('Initializing RPGService...');
            this.rpgService = new RPGService(this.formulaService, this.resourceService);

            if (this.logger) this.logger.debug('Initializing CatalogService...');
            this.catalogService = new CatalogService();

            if (this.logger) this.logger.debug('Initializing InventoryService...');
            this.inventoryService = new InventoryService(this.formulaService, this.equipmentService);
        } catch (error) {
            console.error('❌ CRITICAL: GameServices initialization failed:', error);
            if (this.logger) this.logger.fatal('GameServices initialization failed', error);
            throw error;
        }

        // Item service for collectable handling
        if (window.ItemService) {
            this.itemService = new ItemService(this.resourceService, this.formulaService, this.inventoryService);
            if (this.logger) this.logger.debug('ItemService initialized');
        }

        // Game state service (needs most other services)
        this.gameStateService = new GameStateService(
            this.resourceService,
            this.agentService,
            this.inventoryService,
            this.missionService
        );

        // HUD service (initialized later when game is ready)
        this.hudService = null;

        // NEW SERVICES: Combat, Quest, Enemy, and SaveGame
        // Combat service for centralized combat state management
        if (window.CombatService) {
            this.combatService = new CombatService(this.formulaService, this.agentService);
            if (this.logger) this.logger.debug('CombatService initialized');
        }

        // Enemy service for centralized enemy lifecycle management
        if (window.EnemyService) {
            this.enemyService = new EnemyService();
            if (this.logger) this.logger.debug('EnemyService initialized');
        }

        // Quest service for quest and objective tracking
        if (window.QuestService) {
            this.questService = new QuestService(this.resourceService);
            if (this.logger) this.logger.debug('QuestService initialized');
        }

        // SaveGame service for save/load operations
        if (window.SaveGameService) {
            this.saveGameService = new SaveGameService(this.gameStateService);
            if (this.logger) this.logger.debug('SaveGameService initialized');
        }

        // Keybinding service for keyboard shortcut management
        if (window.KeybindingService) {
            this.keybindingService = new KeybindingService();
            if (this.logger) this.logger.debug('KeybindingService initialized');
        } else {
            throw new Error('KeybindingService is required but not loaded');
        }

        // Pathfinding service for A* pathfinding
        if (window.PathfindingService) {
            this.pathfindingService = new PathfindingService();
            if (this.logger) this.logger.debug('PathfindingService initialized');
        } else {
            throw new Error('PathfindingService is required but not loaded');
        }

        // Keyboard dispatcher service for unified keyboard handling
        if (window.KeyboardDispatcherService) {
            this.keyboardDispatcher = new KeyboardDispatcherService();
            this.keyboardDispatcher.initialize();
            if (this.logger) this.logger.debug('KeyboardDispatcherService initialized');
        } else {
            throw new Error('KeyboardDispatcherService is required but not loaded');
        }

        // Settings service for centralized settings management
        if (window.SettingsService) {
            this.settingsService = new SettingsService();
            if (this.logger) this.logger.debug('SettingsService initialized');
        } else {
            throw new Error('SettingsService is required but not loaded');
        }

        // Audio service for centralized audio management
        if (window.AudioService) {
            this.audioService = new AudioService();
            this.audioService.setKeyboardDispatcher(this.keyboardDispatcher);
            this.audioService.initialize();
            if (this.logger) this.logger.debug('AudioService initialized');
        } else {
            if (this.logger) this.logger.warn('AudioService not loaded - audio functionality unavailable');
        }

        // Coordinate service for all coordinate transformations
        if (window.CoordinateService) {
            this.coordinateService = new CoordinateService();
            if (this.logger) this.logger.debug('CoordinateService initialized');
        } else {
            if (this.logger) this.logger.warn('CoordinateService not loaded - using legacy coordinate methods');
        }

        // Dialog state service for centralized dialog navigation
        if (window.DialogStateService) {
            this.dialogStateService = new DialogStateService();
            if (this.logger) this.logger.debug('DialogStateService initialized');
        } else {
            if (this.logger) this.logger.warn('DialogStateService not loaded - using legacy dialog access');
        }

        // Bind context for methods that might be called externally
        this.calculateAgentStats = this.calculateAgentStats.bind(this);
        this.applyAllModifiers = this.applyAllModifiers.bind(this);
        this.calculateAttackDamage = this.calculateAttackDamage.bind(this);

        if (this.logger) this.logger.debug('GameServices initialized with all services');
    }

    /**
     * Proxy methods for test compatibility
     * Tests may access these through window.GameServices instead of services
     */
    getAgent(identifier) {
        return this.agentService?.getAgent(identifier);
    }

    initializeAgents(campaignAgents) {
        return this.agentService?.initialize(campaignAgents);
    }

    /**
     * Initialize HUD service - requires game reference
     * Called from game initialization
     */
    initializeHUD(game) {
        if (!game) {
            throw new Error('GameServices.initializeHUD requires game instance');
        }

        this.hudService = new HUDService(game);
        this.hudService.registerAllElements();

        if (this.logger) this.logger.info('✅ HUDService initialized and registered');
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
        else if (this.inventoryService) {
            // Debug log attacker info
            if (this.logger) {
                this.logger.debug(`🎯 Looking up equipment for attacker:`, {
                    id: attacker.id,
                    originalId: attacker.originalId,
                    name: attacker.name,
                    hasWeapon: !!attacker.weapon
                });
            }

            // Try multiple ID formats since agent IDs can vary between hub and mission
            const possibleIds = [
                attacker.originalId,
                String(attacker.originalId),  // Try as string too
                attacker.id,
                attacker.name
            ].filter(id => id != null);

            if (this.logger) {
                this.logger.debug(`🔍 Trying IDs for loadout lookup: ${possibleIds.join(', ')}`);

                // Debug: Show all existing loadouts
                const allLoadouts = this.inventoryService.getAllLoadouts();
                const loadoutKeys = Object.keys(allLoadouts);
                this.logger.debug(`📦 Existing loadout keys in InventoryService: ${loadoutKeys.join(', ')}`);

                // Show loadout contents for each key
                loadoutKeys.forEach(key => {
                    const loadout = allLoadouts[key];
                    if (loadout && loadout.weapon) {
                        this.logger.debug(`  - Loadout[${key}]: weapon=${loadout.weapon}`);
                    }
                });
            }

            // Try each possible ID to find the loadout
            let loadout = null;
            let foundId = null;
            for (const agentId of possibleIds) {
                loadout = this.inventoryService.getAgentLoadout(agentId);
                if (this.logger) {
                    this.logger.debug(`  Checking ID '${agentId}': ${loadout ? 'Found loadout' : 'No loadout'}, weapon: ${loadout?.weapon || 'none'}`);
                }
                if (loadout && loadout.weapon) {
                    foundId = agentId;
                    break;
                }
            }

            if (loadout && loadout.weapon) {
                // Find the actual weapon from the loadout
                const equippedWeapon = this.inventoryService.getItemById('weapon', loadout.weapon);
                if (equippedWeapon) {
                    weaponBonus = equippedWeapon.damage || 0;
                    if (this.logger) {
                        this.logger.info(`✅ Found equipped weapon: ${equippedWeapon.name} with damage ${weaponBonus} (using ID: ${foundId})`);
                    }
                    if (this.formulaService && this.formulaService.logger) {
                        this.formulaService.logger.debug(`🔫 Using loadout weapon damage: ${weaponBonus} from ${equippedWeapon.name} (agent ID: ${foundId})`);
                    }
                } else if (this.logger) {
                    this.logger.warn(`⚠️ Loadout has weapon ID ${loadout.weapon} but weapon not found in inventory`);
                }
            } else {
                if (this.logger) {
                    this.logger.warn(`⚠️ No weapon loadout found for agent. Tried IDs: ${possibleIds.join(', ')}`);
                }
                if (this.formulaService && this.formulaService.logger) {
                    this.formulaService.logger.debug(`⚠️ No weapon loadout found for agent. Tried IDs: ${possibleIds.join(', ')}`);
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
    }; // End of GameServices class definition

    // Create singleton instance
    const gameServicesInstance = new GameServices();

    // Export both class and singleton
    window.GameServices = gameServicesInstance;
    window.GameServicesClass = GameServices; // Keep class available if needed
}