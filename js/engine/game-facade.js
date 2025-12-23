/**
 * GameFacade - Game logic layer handling all game mechanics
 * This class is responsible for WHAT happens in the game
 * It does NOT know about rendering, audio playback, or input handling
 */

class GameFacade {
    constructor(gameServices, legacyGame) {
        this.logger = window.Logger ? new window.Logger('GameFacade') : null;

        // Store reference to legacy game for migration
        this.legacyGame = legacyGame;

        // Services - use provided services or window.GameServices if available
        this.services = gameServices || window.GameServices;
        if (!this.services) {
            if (this.logger) this.logger.error('GameFacade: No GameServices available, creating minimal stub');
            // Create a minimal stub to prevent crashes
            this.services = {
                agentService: { getAvailableAgents: () => [] },
                combatService: null,
                questService: null,
                resourceService: { addCredits: () => {}, addResearchPoints: () => {} }
            };
        }

        // Game state
        this.currentScreen = 'splash';
        this.isPaused = false;
        // REMOVED: this.gameSpeed - will be computed property!
        // REMOVED: this.targetGameSpeed - will be computed property!
        // REMOVED: this.autoSlowdownRange - will be computed property!
        // REMOVED: this.speedIndicatorFadeTime - will be computed property!

        // Mission state
        // REMOVED: this.currentMission - will be computed property!
        // REMOVED: this.currentMap - already a computed property!
        // REMOVED: this.missionObjectives - already a computed property!
        // REMOVED: this.extractionEnabled - already a computed property!

        // Entity state
        // REMOVED: this.agents - will be computed property!
        // REMOVED: this.enemies - will be computed property!
        // REMOVED: this.npcs - will be computed property!
        // REMOVED: this.projectiles - will be computed property!
        // REMOVED: this.effects - will be computed property!
        this.items = [];

        // Selection state
        // REMOVED: this.selectedAgent - will be computed property!
        this.selectedTarget = null;

        // Combat state
        // REMOVED: this.turnBasedMode - will be computed property!
        this.currentTurn = null;
        this.turnOrder = [];
        this.actionPoints = new Map();

        // Inventory state
        this.agentLoadouts = {};
        this.availableWeapons = [];
        this.availableArmor = [];
        this.availableUtility = [];

        // Campaign state
        this.currentCampaign = null;
        this.completedMissions = [];
        this.unlockedContent = [];

        // Dialog state
        this.activeDialogs = [];
        this.npcConversations = new Map();

        // Rendering-related state (needed by GameEngine)
        // REMOVED: All of these are now computed properties!
        // this.fogEnabled, this.fogOfWar, this.showPaths, this.debugMode,
        // this.usePathfinding, this.agentWaypoints, this.destinationIndicators,
        // this.squadSelectEffect, this.activeQuests, this.npcActiveQuests, this.is3DMode

        // Initialize subsystems
        this.initializeDefaultState();

        if (this.logger) this.logger.info('GameFacade initialized');
    }

    // ============================================
    // COMPUTED PROPERTIES - Single Source of Truth
    // ============================================

    /**
     * Game Speed - reads from legacy game
     */
    get gameSpeed() {
        if (this.legacyGame && this.legacyGame.gameSpeed !== undefined) {
            return this.legacyGame.gameSpeed;
        }
        return 1;
    }

    set gameSpeed(value) {
        if (this.legacyGame) {
            this.legacyGame.gameSpeed = value;
        }
    }

    /**
     * Target Game Speed - reads from legacy game
     */
    get targetGameSpeed() {
        if (this.legacyGame && this.legacyGame.targetGameSpeed !== undefined) {
            return this.legacyGame.targetGameSpeed;
        }
        return 1;
    }

    set targetGameSpeed(value) {
        if (this.legacyGame) {
            this.legacyGame.targetGameSpeed = value;
        }
    }

    /**
     * Auto Slowdown Range - reads from legacy game
     */
    get autoSlowdownRange() {
        if (this.legacyGame && this.legacyGame.autoSlowdownRange !== undefined) {
            return this.legacyGame.autoSlowdownRange;
        }
        return 10;
    }

    set autoSlowdownRange(value) {
        if (this.legacyGame) {
            this.legacyGame.autoSlowdownRange = value;
        }
    }

    /**
     * Speed Indicator Fade Time - reads from legacy game
     */
    get speedIndicatorFadeTime() {
        if (this.legacyGame && this.legacyGame.speedIndicatorFadeTime !== undefined) {
            return this.legacyGame.speedIndicatorFadeTime;
        }
        return 0;
    }

    set speedIndicatorFadeTime(value) {
        if (this.legacyGame) {
            this.legacyGame.speedIndicatorFadeTime = value;
        }
    }

    /**
     * Turn-Based Mode - reads from legacy game
     */
    get turnBasedMode() {
        if (this.legacyGame && this.legacyGame.turnBasedMode !== undefined) {
            return this.legacyGame.turnBasedMode;
        }
        return false;
    }

    set turnBasedMode(value) {
        if (this.legacyGame) {
            this.legacyGame.turnBasedMode = value;
        }
    }

    /**
     * Agents - reads from legacy game
     */
    get agents() {
        if (this.legacyGame && this.legacyGame.agents) {
            return this.legacyGame.agents;
        }
        return [];
    }

    set agents(value) {
        if (this.legacyGame) {
            this.legacyGame.agents = value;
        }
    }

    /**
     * Enemies - reads from legacy game
     */
    get enemies() {
        if (this.legacyGame && this.legacyGame.enemies) {
            return this.legacyGame.enemies;
        }
        return [];
    }

    set enemies(value) {
        if (this.legacyGame) {
            this.legacyGame.enemies = value;
        }
    }

    /**
     * NPCs - reads from legacy game
     */
    get npcs() {
        if (this.legacyGame && this.legacyGame.npcs) {
            return this.legacyGame.npcs;
        }
        return [];
    }

    set npcs(value) {
        if (this.legacyGame) {
            this.legacyGame.npcs = value;
        }
    }

    /**
     * Projectiles - reads from legacy game
     */
    get projectiles() {
        if (this.legacyGame && this.legacyGame.projectiles) {
            return this.legacyGame.projectiles;
        }
        return [];
    }

    set projectiles(value) {
        if (this.legacyGame) {
            this.legacyGame.projectiles = value;
        }
    }

    /**
     * Effects - reads from legacy game
     */
    get effects() {
        if (this.legacyGame && this.legacyGame.effects) {
            return this.legacyGame.effects;
        }
        return [];
    }

    set effects(value) {
        if (this.legacyGame) {
            this.legacyGame.effects = value;
        }
    }

    /**
     * Selected Agent - reads from legacy game
     */
    get selectedAgent() {
        if (this.legacyGame && this.legacyGame._selectedAgent) {
            return this.legacyGame._selectedAgent;
        }
        return null;
    }

    set selectedAgent(value) {
        if (this.legacyGame) {
            this.legacyGame._selectedAgent = value;
        }
    }

    /**
     * Fog of War - reads from legacy game
     */
    get fogOfWar() {
        if (this.legacyGame && this.legacyGame.fogOfWar) {
            return this.legacyGame.fogOfWar;
        }
        return null;
    }

    set fogOfWar(value) {
        if (this.legacyGame) {
            this.legacyGame.fogOfWar = value;
        }
    }

    /**
     * Fog Enabled - reads from legacy game
     */
    get fogEnabled() {
        if (this.legacyGame && this.legacyGame.fogEnabled !== undefined) {
            return this.legacyGame.fogEnabled;
        }
        return false;
    }

    set fogEnabled(value) {
        if (this.legacyGame) {
            this.legacyGame.fogEnabled = value;
        }
    }

    /**
     * 3D Mode - reads from legacy game
     */
    get is3DMode() {
        if (this.legacyGame && this.legacyGame.is3DMode !== undefined) {
            return this.legacyGame.is3DMode;
        }
        return false;
    }

    set is3DMode(value) {
        if (this.legacyGame) {
            this.legacyGame.is3DMode = value;
        }
    }

    /**
     * Agent Waypoints - reads from legacy game
     */
    get agentWaypoints() {
        if (this.legacyGame && this.legacyGame.agentWaypoints) {
            return this.legacyGame.agentWaypoints;
        }
        return {};
    }

    set agentWaypoints(value) {
        if (this.legacyGame) {
            this.legacyGame.agentWaypoints = value;
        }
    }

    /**
     * Use Pathfinding - reads from legacy game
     */
    get usePathfinding() {
        if (this.legacyGame && this.legacyGame.usePathfinding !== undefined) {
            return this.legacyGame.usePathfinding;
        }
        return true;
    }

    set usePathfinding(value) {
        if (this.legacyGame) {
            this.legacyGame.usePathfinding = value;
        }
    }

    /**
     * Destination Indicators - reads from legacy game
     */
    get destinationIndicators() {
        if (this.legacyGame && this.legacyGame.destinationIndicators) {
            return this.legacyGame.destinationIndicators;
        }
        return [];
    }

    set destinationIndicators(value) {
        if (this.legacyGame) {
            this.legacyGame.destinationIndicators = value;
        }
    }

    /**
     * Squad Select Effect - reads from legacy game
     */
    get squadSelectEffect() {
        if (this.legacyGame && this.legacyGame.squadSelectEffect) {
            return this.legacyGame.squadSelectEffect;
        }
        return null;
    }

    set squadSelectEffect(value) {
        if (this.legacyGame) {
            this.legacyGame.squadSelectEffect = value;
        }
    }

    /**
     * Show Paths - reads from legacy game
     */
    get showPaths() {
        if (this.legacyGame && this.legacyGame.showPaths !== undefined) {
            return this.legacyGame.showPaths;
        }
        return false;
    }

    set showPaths(value) {
        if (this.legacyGame) {
            this.legacyGame.showPaths = value;
        }
    }

    /**
     * Debug Mode - reads from legacy game
     */
    get debugMode() {
        if (this.legacyGame && this.legacyGame.debugMode !== undefined) {
            return this.legacyGame.debugMode;
        }
        return false;
    }

    set debugMode(value) {
        if (this.legacyGame) {
            this.legacyGame.debugMode = value;
        }
    }

    /**
     * Active Quests - reads from legacy game
     */
    get activeQuests() {
        if (this.legacyGame && this.legacyGame.activeQuests) {
            return this.legacyGame.activeQuests;
        }
        return {};
    }

    set activeQuests(value) {
        if (this.legacyGame) {
            this.legacyGame.activeQuests = value;
        }
    }

    /**
     * NPC Active Quests - reads from legacy game
     */
    get npcActiveQuests() {
        if (this.legacyGame && this.legacyGame.npcActiveQuests) {
            return this.legacyGame.npcActiveQuests;
        }
        return [];
    }

    set npcActiveQuests(value) {
        if (this.legacyGame) {
            this.legacyGame.npcActiveQuests = value;
        }
    }

    /**
     * Current Mission - reads from legacy game
     */
    get currentMission() {
        if (this.legacyGame && this.legacyGame.currentMissionDef) {
            return this.legacyGame.currentMissionDef;
        }
        return null;
    }

    set currentMission(value) {
        if (this.legacyGame) {
            this.legacyGame.currentMissionDef = value;
        }
    }

    /**
     * SINGLE SOURCE OF TRUTH for current map
     * Always reads from legacy game, never stores locally
     */
    get currentMap() {
        // ALWAYS read from legacy game (single source of truth)
        if (this.legacyGame && this.legacyGame.map) {
            return this.legacyGame.map;
        }
        return null;
    }

    /**
     * Setter redirects to legacy game to maintain single source of truth
     */
    set currentMap(value) {
        if (this.legacyGame) {
            this.legacyGame.map = value;
        }
    }

    /**
     * SINGLE SOURCE OF TRUTH for extraction state
     * Always reads from MissionService, never stores locally
     */
    get extractionEnabled() {
        // ALWAYS read from MissionService (single source of truth)
        if (this.gameServices && this.gameServices.missionService) {
            return this.gameServices.missionService.extractionEnabled;
        }
        // Fallback to legacy game if service not available
        if (this.legacyGame && this.legacyGame.extractionEnabled !== undefined) {
            return this.legacyGame.extractionEnabled;
        }
        return false;
    }

    /**
     * Setter redirects to MissionService to maintain single source of truth
     */
    set extractionEnabled(value) {
        if (this.gameServices && this.gameServices.missionService) {
            this.gameServices.missionService.extractionEnabled = value;
        } else if (this.legacyGame) {
            this.legacyGame.extractionEnabled = value;
        }
    }

    /**
     * Initialize default game state
     */
    initializeDefaultState() {
        // Load default campaign if available
        if (window.ContentLoader) {
            this.loadCampaign('main');
        }

        // Set up default agents
        this.initializeAgents();

        // Initialize default loadouts
        this.initializeLoadouts();
    }

    /**
     * Initialize available agents
     */
    initializeAgents() {
        // Guard against services not being available
        if (!this.services || !this.services.agentService) {
            if (this.logger) this.logger.warn('AgentService not available during initialization, skipping agent setup');
            this.agents = [];
            return;
        }

        const availableAgents = this.services.agentService.getAvailableAgents();
        this.agents = availableAgents.slice(0, 4).map((agent, index) => ({
            ...agent,
            // Keep original ID - no transformation!
            x: 0,
            y: 0,
            alive: true,
            health: agent.health || 100,
            maxHealth: agent.maxHealth || 100
        }));
    }

    /**
     * Initialize agent loadouts
     */
    initializeLoadouts() {
        if (!this.agents || this.agents.length === 0) {
            if (this.logger) this.logger.warn('No agents available during loadout initialization');
            return;
        }

        this.agents.forEach(agent => {
            this.agentLoadouts[agent.id] = {
                weapon: null,
                armor: null,
                utility: null,
                special: null
            };
        });
    }

    /**
     * Load a campaign
     */
    loadCampaign(campaignId) {
        if (!window.ContentLoader) {
            if (this.logger) this.logger.warn('ContentLoader not available');
            return;
        }

        const campaign = window.CampaignSystem?.getCampaign(campaignId);
        if (campaign) {
            this.currentCampaign = campaign;
            window.ContentLoader.loadCampaign(campaign, this);
            if (this.logger) this.logger.info(`Campaign loaded: ${campaignId}`);
        }
    }

    /**
     * Start a mission
     */
    startMission(missionId) {
        const mission = window.CampaignSystem?.getMission(this.currentCampaign?.id, missionId);
        if (!mission) {
            if (this.logger) this.logger.error(`Mission not found: ${missionId}`);
            return false;
        }

        // Reset mission state
        this.currentMission = mission;
        this.missionFailed = false;  // Reset mission failure flag
        // extractionEnabled is now computed from MissionService
        this.projectiles = [];
        this.items = [];

        // Load map
        this.loadMap(mission.map);

        // Setup objectives
        this.setupObjectives(mission.objectives);

        // Spawn entities
        this.spawnAgents(mission.map.spawn);
        this.spawnEnemies(mission.enemies || []);
        this.spawnNPCs(mission.npcs || []);

        // Switch to game screen
        this.currentScreen = 'game';

        // Initialize combat if CombatService available
        if (this.services.combatService && this.enemies.length > 0) {
            this.services.combatService.startCombat(this.agents, this.enemies);
        }

        if (this.logger) this.logger.info(`Mission started: ${missionId}`);
        return true;
    }

    /**
     * Load mission map
     */
    loadMap(mapData) {
        let map;
        if (mapData.embedded) {
            map = this.parseEmbeddedMap(mapData.embedded);
        } else {
            if (this.logger) this.logger.error('No embedded map data');
            map = this.generateEmptyMap(40, 40);
        }
        // Set via setter which redirects to legacy game
        this.currentMap = map;
    }

    /**
     * Parse embedded map from string array
     */
    parseEmbeddedMap(embedded) {
        const tiles = [];
        const tileArray = embedded.tiles;

        for (let y = 0; y < tileArray.length; y++) {
            const row = [];
            const line = tileArray[y];
            for (let x = 0; x < line.length; x++) {
                row.push({
                    x: x,
                    y: y,
                    type: line[x] === '#' ? 'wall' : 'floor',
                    visible: false,
                    explored: false
                });
            }
            tiles.push(row);
        }

        return {
            tiles: tiles,
            width: tiles[0]?.length || 0,
            height: tiles.length,
            spawn: embedded.spawn,
            extraction: embedded.extraction,
            terminals: embedded.terminals || [],
            doors: embedded.doors || [],
            items: embedded.items || []
        };
    }

    /**
     * Generate empty map
     */
    generateEmptyMap(width, height) {
        const tiles = [];
        for (let y = 0; y < height; y++) {
            const row = [];
            for (let x = 0; x < width; x++) {
                row.push({
                    x: x,
                    y: y,
                    type: 'floor',
                    visible: false,
                    explored: false
                });
            }
            tiles.push(row);
        }
        return { tiles, width, height };
    }

    /**
     * Setup mission objectives
     * @deprecated - Objectives are now handled by MissionService
     */
    setupObjectives(objectives) {
        // NO LONGER store objectives locally - MissionService is single source of truth
        // MissionService.startMission already sets up objectives
        if (this.logger) this.logger.debug('📋 Objectives setup delegated to MissionService');
    }

    /**
     * SINGLE SOURCE OF TRUTH for mission objectives
     * Always reads from MissionService, never stores locally
     */
    get missionObjectives() {
        // ALWAYS read from MissionService (single source of truth)
        if (this.gameServices && this.gameServices.missionService) {
            return this.gameServices.missionService.objectives;
        }
        // Fallback to legacy game if service not available
        if (this.legacyGame && this.legacyGame.currentMissionDef && this.legacyGame.currentMissionDef.objectives) {
            return this.legacyGame.currentMissionDef.objectives;
        }
        return [];
    }

    /**
     * Setter redirects to MissionService to maintain single source of truth
     */
    set missionObjectives(value) {
        if (this.logger) this.logger.warn('⚠️ Attempted to set missionObjectives - use MissionService instead');
        // Don't store locally - MissionService is the source of truth
    }

    /**
     * Spawn agents at start position
     */
    spawnAgents(spawnPoint) {
        if (!spawnPoint) return;

        this.agents.forEach((agent, index) => {
            agent.x = spawnPoint.x + index;
            agent.y = spawnPoint.y;
            agent.alive = true;
            agent.health = agent.maxHealth || 100;
        });
    }

    /**
     * Spawn enemies
     */
    spawnEnemies(enemyData) {
        this.enemies = enemyData.map((enemy, index) => ({
            ...enemy,
            id: `enemy_${index}`,
            alive: true,
            health: enemy.health || 50,
            maxHealth: enemy.health || 50
        }));
    }

    /**
     * Spawn NPCs
     */
    spawnNPCs(npcData) {
        if (this.logger) this.logger.debug(`👥 [FACADE] spawnNPCs called with ${npcData?.length || 0} NPCs`);
        if (this.logger) this.logger.debug(`👥 [FACADE] Current npcs before overwrite: ${this.npcs?.length || 0}`);

        this.npcs = npcData.map((npc, index) => {
            const npcEntity = {
                ...npc,
                id: npc.id || `npc_${index}`,
                interacted: false
            };

            // Register NPC quests with QuestService
            if (this.services.questService && npc.quests) {
                npc.quests.forEach(quest => {
                    this.services.questService.registerQuest({
                        ...quest,
                        giver: npcEntity.id
                    });
                });
            }

            return npcEntity;
        });

        if (this.logger) this.logger.debug(`👥 [FACADE] After spawnNPCs, npcs count: ${this.npcs?.length || 0}`);
        if (this.npcs && this.npcs.length > 0) {
            this.npcs.forEach((npc, idx) => {
                if (this.logger) this.logger.debug(`  [FACADE] NPC[${idx}]: ${npc.name || npc.id} at (${npc.x}, ${npc.y})`);
            });
        }
    }

    /**
     * Update game state (called every frame)
     */
    update(deltaTime) {
        if (this.currentScreen !== 'game' || this.isPaused) {
            // Log why we're not updating
            if (!this._lastUpdateSkipLog || Date.now() - this._lastUpdateSkipLog > 5000) {
                if (this.logger && (this.currentScreen !== 'game' || this.isPaused)) {
                    this.logger.trace(`⏸️ Update skipped - Screen: ${this.currentScreen}, Paused: ${this.isPaused}`);
                }
                this._lastUpdateSkipLog = Date.now();
            }
            return;
        }

        // Update based on game mode
        if (this.turnBasedMode) {
            this.updateTurnBased(deltaTime);
        }
        // Real-time updates happen in main update flow below, not in separate method

        // Always update these
        this.updateProjectiles(deltaTime);
        this.updateObjectives();
        this.checkMissionCompletion();

        // Log mission progress periodically
        if (!this.updateCounter) this.updateCounter = 0;
        this.updateCounter++;
        if (this.updateCounter % 600 === 0 && this.currentMission) {
            const aliveAgents = this.agents.filter(a => a.alive).length;
            const aliveEnemies = this.enemies.filter(e => e.alive).length;
            if (this.logger) {
                this.logger.debug(`📊 Mission Progress: ${aliveAgents} agents, ${aliveEnemies} enemies, Extraction: ${this.extractionEnabled ? 'ENABLED' : 'DISABLED'}`);
            }
        }
    }

    /**
     * Update real-time mode - REMOVED
     * This was causing issues by duplicating agent updates
     * All real-time updates now handled in main update() method
     */
    updateRealTime(deltaTime) {
        // Empty - all logic moved to main update() to match original structure
    }

    /**
     * Update turn-based animations only (for turn-based mode)
     * This only handles visual animations, not game logic
     */
    updateTurnBasedAnimations(deltaTime) {
        // Update agent movement animations only
        if (this.agents) {
            this.agents.forEach(agent => {
                if (agent.alive && agent.targetX !== undefined && agent.targetY !== undefined) {
                    // Smooth movement toward target
                    const dx = agent.targetX - agent.x;
                    const dy = agent.targetY - agent.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist > 0.5) {
                        const moveSpeed = (agent.speed || 2) * this.gameSpeed;
                        const moveStep = Math.min(moveSpeed * 0.1, dist); // Limit step size
                        agent.x += (dx / dist) * moveStep;
                        agent.y += (dy / dist) * moveStep;
                    } else {
                        // Reached destination, but keep target for movement system
                        agent.x = agent.targetX;
                        agent.y = agent.targetY;
                        // Don't clear targetX/targetY - they're needed for movement system
                    }
                }
            });
        }

        // Update projectiles and visual effects
        this.updateProjectilesOnly(); // Use dedicated function for TB mode
        this.updateEffectsOnly(); // Update effects animations
    }

    /**
     * Update projectiles only (for turn-based mode)
     */
    updateProjectilesOnly() {
        if (!this.projectiles) return;

        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.5) {
                // Hit logic here (simplified for TB mode)
                return false;
            }

            // Move projectile
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
            return true;
        });
    }

    /**
     * Update effects only (for turn-based mode)
     */
    updateEffectsOnly() {
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            return effect.frame < effect.duration;
        });
    }

    /**
     * Update turn-based mode
     */
    updateTurnBased(deltaTime) {
        // Handle current turn
        if (!this.currentTurn && this.turnOrder.length > 0) {
            this.startNextTurn();
        }

        // Animate movements
        [...this.agents, ...this.enemies].forEach(entity => {
            if (entity.targetX !== undefined && entity.targetY !== undefined) {
                this.moveEntityTowards(entity, entity.targetX, entity.targetY, deltaTime);
            }
        });
    }

    /**
     * Move entity towards target
     */
    moveEntityTowards(entity, targetX, targetY, deltaTime) {
        const dx = targetX - entity.x;
        const dy = targetY - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
            const speed = entity.speed || 2;
            const moveDistance = Math.min(speed * deltaTime * 0.001, distance);
            entity.x += (dx / distance) * moveDistance;
            entity.y += (dy / distance) * moveDistance;
        } else {
            entity.x = targetX;
            entity.y = targetY;
            entity.targetX = undefined;
            entity.targetY = undefined;
        }
    }

    /**
     * Perform attack
     */
    performAttack(attacker, target) {
        // CombatService is required
        if (!this.services.combatService) {
            if (this.logger) this.logger.error('CombatService not available!');
            return null;
        }

        const result = this.services.combatService.performAttack(attacker.id, target.id);

        if (result && result.hit) {
            // Create visual projectile
            this.createProjectile(attacker, target);

            // UNIDIRECTIONAL: CombatService already handled damage/death
            // For agents: AgentService is single source of truth
            // For enemies: CombatService updated entity directly
            // State is already correct - no sync needed
            if (result.killed) {
                this.onEntityDeath(target);
            }
        }

        return result;
    }

    /**
     * Create projectile
     */
    createProjectile(from, to) {
        this.projectiles.push({
            x: from.x,
            y: from.y,
            targetX: to.x,
            targetY: to.y,
            speed: 20,
            damage: from.damage || 10
        });
    }

    /**
     * Update projectiles
     */
    updateProjectiles(deltaTime) {
        this.projectiles = this.projectiles.filter(projectile => {
            const dx = projectile.targetX - projectile.x;
            const dy = projectile.targetY - projectile.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0.5) {
                const moveDistance = projectile.speed * deltaTime * 0.001;
                projectile.x += (dx / distance) * moveDistance;
                projectile.y += (dy / distance) * moveDistance;
                return true; // Keep projectile
            }

            return false; // Remove projectile
        });
    }

    /**
     * Handle entity death
     */
    onEntityDeath(entity) {
        if (entity.id.startsWith('enemy_')) {
            // Track through MissionService (single source of truth)
            if (this.gameServices && this.gameServices.missionService) {
                this.gameServices.missionService.trackEvent('eliminate', {
                    type: entity.type || 'unknown'
                });
            }
        }
    }

    /**
     * Update mission objectives
     */
    updateObjectives() {
        // Delegate to MissionService if available - it's the source of truth
        const game = this.legacyGame;

        // NO SYNCING NEEDED - extractionEnabled is now a computed property
        // that always reads from MissionService directly

        // Just check objectives if available
        if (game && game.checkMissionObjectives) {
            game.checkMissionObjectives();
        }
    }

    /**
     * Check mission completion
     */
    checkMissionCompletion() {
        const game = this.legacyGame;

        // CRITICAL: Check for mission failure - all agents dead
        // NOTE: this.agents is a computed property that filters out dead agents
        // So we need to check if selectedAgents exist but no agents are alive

        // GUARD: Skip failure check during first 60 frames (1 second) of mission
        // This prevents false positive during mission initialization
        if (game && game.missionTimer > 60 && game.selectedAgents && game.selectedAgents.length > 0) {
            const aliveAgents = this.agents.filter(a => a.alive).length;
            if (aliveAgents === 0) {
                // All agents are dead - mission failed!
                if (!this.missionFailed) {
                    this.missionFailed = true;
                    if (this.logger) this.logger.info('☠️ MISSION FAILED - All agents eliminated');

                    // Switch to defeat screen
                    if (game && game.currentScreen === 'game') {
                        game.currentScreen = 'defeat';

                        // Log the defeat event
                        if (game.logEvent) {
                            game.logEvent('MISSION FAILED - All operatives lost', 'death', true);
                        }

                        // Play defeat music if available
                        if (game.playMusic) {
                            game.playMusic('defeat');
                        }
                    }
                }
                return; // Don't check for victory if mission failed
            }
        }

        // Add a log to verify this is being called
        if (!this._lastMissionCheckLog || Date.now() - this._lastMissionCheckLog > 5000) {
            if (this.logger) {
                const missionDef = game?.currentMissionDef;
                const objectives = game?.gameServices?.missionService?.objectives || missionDef?.objectives;
                this.logger.debug(`🎯 Mission check - Game: ${!!game}, MissionDef: ${!!missionDef}, Objectives: ${objectives?.length || 0}`);

                if (objectives && objectives.length > 0) {
                    const completed = objectives.filter(o => o.status === 'completed' || o.completed).length;
                    this.logger.debug(`📋 Objectives progress: ${completed}/${objectives.length} completed`);
                }
            }
            this._lastMissionCheckLog = Date.now();
        }

        // Check if extraction is enabled (from either source)
        const extractionEnabledLocal = game?.extractionEnabled;
        const extractionEnabledService = game?.gameServices?.missionService?.extractionEnabled;

        // Log extraction state periodically
        if (!this._lastExtractionStateLog || Date.now() - this._lastExtractionStateLog > 3000) {
            if (this.logger && (extractionEnabledLocal !== undefined || extractionEnabledService !== undefined)) {
                this.logger.debug(`🚁 Extraction state - Local: ${extractionEnabledLocal}, Service: ${extractionEnabledService}`);
            }
            this._lastExtractionStateLog = Date.now();
        }

        if (extractionEnabledLocal || extractionEnabledService) {
            // Log extraction check (once per second)
            if (!this._lastExtractionCheck || Date.now() - this._lastExtractionCheck > 1000) {
                if (this.logger) {
                    this.logger.debug(`🚁 Extraction check active - Local: ${extractionEnabledLocal}, Service: ${extractionEnabledService}`);
                }
                this._lastExtractionCheck = Date.now();
            }

            // Check if agents reached extraction point
            if (game && game.checkExtractionPoint) {
                game.checkExtractionPoint();
            }
        } else {
            // Log once per 5 seconds when extraction is not enabled
            if (!this._lastExtractionNotEnabledLog || Date.now() - this._lastExtractionNotEnabledLog > 5000) {
                if (this.logger) {
                    this.logger.trace(`⏳ Extraction not yet enabled - waiting for objectives completion`);
                }
                this._lastExtractionNotEnabledLog = Date.now();
            }
        }

        // Also check quest completion and survival timers
        if (game && game.checkQuestCompletion) {
            game.checkQuestCompletion();
        }

        if (game && game.updateSurvivalTimers && game.lastUpdateTime) {
            const deltaTime = (Date.now() - game.lastUpdateTime) / 1000;
            game.updateSurvivalTimers(deltaTime);
            game.lastUpdateTime = Date.now();
        } else if (game) {
            game.lastUpdateTime = Date.now();
        }
    }

    /**
     * Complete mission
     */
    completeMission() {
        if (!this.currentMission) return;

        // Add to completed missions
        this.completedMissions.push(this.currentMission.id);

        // Apply rewards
        if (this.currentMission.rewards) {
            const rewards = this.currentMission.rewards;
            if (rewards.credits) {
                this.services.resourceService.addCredits(rewards.credits);
            }
            if (rewards.researchPoints) {
                this.services.resourceService.addResearchPoints(rewards.researchPoints);
            }
        }

        // Switch to victory screen
        this.currentScreen = 'victory';

        if (this.logger) this.logger.info(`Mission completed: ${this.currentMission.id}`);
    }

    /**
     * Handle input action (interpreted from GameEngine input)
     */
    handleAction(action, params) {
        switch (action) {
            case 'selectAgent':
                this.selectAgent(params.agentId);
                break;
            case 'moveAgent':
                this.moveSelectedAgent(params.x, params.y);
                break;
            case 'attack':
                this.attackTarget(params.targetId);
                break;
            case 'useAbility':
                this.useAbility(params.abilityId);
                break;
            case 'interact':
                this.interactWithObject(params.objectId);
                break;
            case 'pause':
                this.togglePause();
                break;
            case 'toggleTurnBased':
                this.toggleTurnBasedMode();
                break;
        }
    }

    /**
     * Select agent
     */
    selectAgent(agentId) {
        this.selectedAgent = this.agents.find(a => a.id === agentId);
        if (this.logger) this.logger.debug(`Selected agent: ${agentId}`);
    }

    /**
     * Move selected agent
     */
    moveSelectedAgent(x, y) {
        if (!this.selectedAgent) return;

        if (this.turnBasedMode) {
            const cost = this.calculateMovementCost(this.selectedAgent, x, y);
            const ap = this.actionPoints.get(this.selectedAgent.id) || 0;

            if (ap >= cost) {
                this.selectedAgent.targetX = x;
                this.selectedAgent.targetY = y;
                this.actionPoints.set(this.selectedAgent.id, ap - cost);
            }
        } else {
            this.selectedAgent.targetX = x;
            this.selectedAgent.targetY = y;
        }
    }

    /**
     * Calculate movement cost in AP
     */
    calculateMovementCost(entity, targetX, targetY) {
        const distance = Math.abs(entity.x - targetX) + Math.abs(entity.y - targetY);
        return Math.ceil(distance);
    }

    /**
     * Toggle pause
     */
    togglePause() {
        this.isPaused = !this.isPaused;
    }

    /**
     * Toggle turn-based mode
     */
    toggleTurnBasedMode() {
        this.turnBasedMode = !this.turnBasedMode;

        // CombatService is required for turn-based mode
        if (!this.services.combatService) {
            if (this.logger) this.logger.error('CombatService not available for turn-based mode!');
            this.turnBasedMode = false;
            return;
        }

        this.services.combatService.setTurnBasedMode(this.turnBasedMode);

        // Sync turn state from CombatService
        if (this.turnBasedMode) {
            const turnInfo = this.services.combatService.getCurrentTurnInfo();
            if (turnInfo) {
                this.currentTurn = turnInfo.entity;
                this.actionPoints = this.services.combatService.actionPoints;
            }
        }
    }

    /**
     * Start next turn
     */
    startNextTurn() {
        // CombatService is required
        if (!this.services.combatService) {
            if (this.logger) this.logger.error('CombatService not available!');
            return;
        }

        this.services.combatService.nextTurn();
        const turnInfo = this.services.combatService.getCurrentTurnInfo();
        if (turnInfo) {
            this.currentTurn = turnInfo.entity;
        }
    }

    /**
     * Get distance between entities
     */
    getDistance(entity1, entity2) {
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Find nearest agent to entity
     */
    findNearestAgent(entity) {
        return this.agents
            .filter(a => a.alive)
            .reduce((nearest, agent) => {
                const distance = this.getDistance(entity, agent);
                if (!nearest || distance < this.getDistance(entity, nearest)) {
                    return agent;
                }
                return nearest;
            }, null);
    }

    /**
     * Find nearby enemy for agent
     */
    findNearbyEnemy(agent) {
        return this.enemies
            .filter(e => e.alive && this.getDistance(agent, e) < 5)
            .sort((a, b) => this.getDistance(agent, a) - this.getDistance(agent, b))[0];
    }

    /**
     * Get current game state for rendering
     */
    getGameState() {
        return {
            screen: this.currentScreen,
            map: this.currentMap,
            agents: this.agents,
            enemies: this.enemies,
            npcs: this.npcs,
            projectiles: this.projectiles,
            items: this.items,
            selectedAgent: this.selectedAgent,
            objectives: this.missionObjectives,
            extractionEnabled: this.extractionEnabled,
            turnBasedMode: this.turnBasedMode,
            currentTurn: this.currentTurn,
            actionPoints: this.actionPoints,
            isPaused: this.isPaused
        };
    }

    /**
     * Main update loop - migrated from game-loop.js
     */
    update(deltaTime) {
        // Access legacy game for transition period
        const game = this.legacyGame;
        if (!game) return;

        // Log update call periodically to debug extraction issue
        if (!this._lastUpdateLog || Date.now() - this._lastUpdateLog > 5000) {
            if (this.logger) this.logger.debug('🔄 GameFacade.update() running...');
            this._lastUpdateLog = Date.now();
        }

        // Update visual effects FIRST (including freeze timers)
        if (game.updateVisualEffects) {
            game.updateVisualEffects(deltaTime);
        }

        // Check if frozen AFTER updating effects
        if (game.isFreezeActive && game.isFreezeActive()) {
            return; // Skip game update while frozen
        }

        // Original - simple increment (speed comes from multiple update calls)
        game.missionTimer++;
        const seconds = Math.floor(game.missionTimer / 60);

        // Update team AI for unselected agents
        if (game.updateTeamAI) {
            game.updateTeamAI();
        }

        // Update mission timer via HUDService
        const hudService = game.gameServices?.hudService;
        if (hudService) {
            hudService.update('missionTimer', seconds);
        }

        // Update fog of war
        if (game.updateFogOfWar) {
            game.updateFogOfWar();
        }

        // Check for auto-slowdown near enemies
        if (game.checkAutoSlowdown) {
            game.checkAutoSlowdown();
        }

        // Removed duplicate update logic - already handled above

        // Update agents - use facade's agents array
        this.agents.forEach(agent => {
            if (!agent.alive) return;

            // Initialize facing angle if not set
            if (agent.facingAngle === undefined) {
                agent.facingAngle = Math.PI / 2; // Default facing down
            }

            // In 3D mode, make non-controlled agents follow the player (if enabled)
            if (game.is3DMode && game.squadFollowing !== false && this.selectedAgent && agent !== this.selectedAgent) {
                // Calculate distance to leader
                const leaderDist = Math.sqrt(
                    Math.pow(agent.x - this.selectedAgent.x, 2) +
                    Math.pow(agent.y - this.selectedAgent.y, 2)
                );

                // Only update target if too far from leader (to avoid constant movement)
                if (leaderDist > 5) {
                    // Set follow target with offset for formation
                    const followDist = 2.5; // Distance to maintain from leader
                    const index = this.agents.filter(a => a.alive).indexOf(agent);
                    const squadSize = this.agents.filter(a => a.alive).length - 1;

                    // Create formation behind the leader based on their facing
                    const leaderFacing = this.selectedAgent.facingAngle || 0;
                    const formationAngle = leaderFacing + Math.PI; // Behind the leader

                    // Spread agents in a line formation behind leader
                    const offsetAngle = formationAngle + (Math.PI / 4) * ((index / squadSize) - 0.5);

                    // Calculate formation position
                    const newTargetX = this.selectedAgent.x + Math.cos(offsetAngle) * followDist;
                    const newTargetY = this.selectedAgent.y + Math.sin(offsetAngle) * followDist;

                    if (this.logger) this.logger.info(`🎯 3D Follow: ${agent.name} moving to formation (${newTargetX.toFixed(1)}, ${newTargetY.toFixed(1)})`);

                    agent.targetX = newTargetX;
                    agent.targetY = newTargetY;
                } else if (leaderDist < 2) {
                    // Too close, stop moving
                    if (this.logger) this.logger.debug(`🛑 3D Follow: ${agent.name} too close, stopping`);
                    agent.targetX = agent.x;
                    agent.targetY = agent.y;
                }
            }

            // Check for waypoints first
            if (game.agentWaypoints && game.agentWaypoints[agent.id] && game.agentWaypoints[agent.id].length > 0) {
                const waypoints = game.agentWaypoints[agent.id];
                const currentWaypoint = waypoints[0];

                // Set target to current waypoint
                agent.targetX = currentWaypoint.x;
                agent.targetY = currentWaypoint.y;

                // Check if we've reached the waypoint
                const wpDx = currentWaypoint.x - agent.x;
                const wpDy = currentWaypoint.y - agent.y;
                const wpDist = Math.sqrt(wpDx * wpDx + wpDy * wpDy);

                if (wpDist < 0.5) {
                    // Reached waypoint, remove it and move to next
                    waypoints.shift();

                    // Update the main waypoints array reference
                    game.agentWaypoints[agent.id] = waypoints;

                    // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
                    if (game.isAgentSelected && game.isAgentSelected(agent)) {
                        if (this.logger) this.logger.info(`✅ ${agent.name} reached waypoint, ${waypoints.length} remaining`);
                    }

                    // If there are more waypoints, update target to next one
                    if (waypoints.length > 0) {
                        agent.targetX = waypoints[0].x;
                        agent.targetY = waypoints[0].y;
                        if (this.logger) this.logger.debug(`📍 Moving to next waypoint: (${waypoints[0].x.toFixed(1)}, ${waypoints[0].y.toFixed(1)})`);
                    }
                }
            }

            // Check for auto-hack when agent reaches terminal
            if (agent.autoHackTarget) {
                const hackDist = Math.sqrt(
                    Math.pow(agent.autoHackTarget.x - agent.x, 2) +
                    Math.pow(agent.autoHackTarget.y - agent.y, 2)
                );

                if (hackDist <= 1.5) {
                    // Reached terminal, hack it
                    if (!agent.autoHackTarget.hacked) {
                        agent.autoHackTarget.hacked = true;

                        // Track through MissionService
                        if (this.services && this.services.missionService) {
                            this.services.missionService.trackEvent('terminal', {
                                id: agent.autoHackTarget.id || 'unknown'
                            });
                        }

                        game.addNotification("🖥️ Terminal hacked!");

                        // Play hack sound if available
                        if (game.playSound) {
                            game.playSound('hack');
                        }
                    }
                    agent.autoHackTarget = null; // Clear auto-hack flag
                }
            }

            // Check for auto-bomb when agent reaches explosive target
            if (agent.autoBombTarget) {
                const bombDist = Math.sqrt(
                    Math.pow(agent.autoBombTarget.x - agent.x, 2) +
                    Math.pow(agent.autoBombTarget.y - agent.y, 2)
                );

                if (bombDist <= 1.5) {
                    // Reached target, plant bomb
                    if (!agent.autoBombTarget.destroyed) {
                        agent.autoBombTarget.destroyed = true;
                        game.destroyedTargets = (game.destroyedTargets || 0) + 1;
                        game.addNotification("💣 Explosive planted!");

                        // Play bomb sound if available
                        if (game.playSound) {
                            game.playSound('explosion');
                        }

                        // Create explosion effect
                        if (game.createExplosion) {
                            game.createExplosion(agent.autoBombTarget.x, agent.autoBombTarget.y);
                        }
                    }
                    agent.autoBombTarget = null; // Clear auto-bomb flag
                }
            }

            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                // Always use pathfinding
                game.moveAgentWithPathfinding(agent);
            }
            // Agent is standing still - keep last facing direction

            // Check for collectable pickup
            if (this.currentMap && this.currentMap.collectables) {
                this.currentMap.collectables.forEach(item => {
                    if (!item.collected) {
                        // Check if quest is required and active
                        if (item.questRequired) {
                            // Check both mission activeQuests (object) and NPC quests (array)
                            const missionQuestActive = game.activeQuests && game.activeQuests[item.questRequired];
                            const npcQuestActive = game.npcActiveQuests && game.npcActiveQuests.some(q => q.id === item.questRequired);
                            const questActive = missionQuestActive || npcQuestActive;
                            if (!questActive) return; // Skip if quest not active
                        }

                        const dist = Math.sqrt(
                            Math.pow(item.x - agent.x, 2) +
                            Math.pow(item.y - agent.y, 2)
                        );
                        if (dist < 1) {
                            item.collected = true;
                            if (this.logger) {
                                this.logger.debug(`📦 Pickup by agent:`, {
                                    name: agent.name,
                                    id: agent.id,
                                    originalId: agent.originalId,
                                    index: this.agents.indexOf(agent)
                                });
                            }
                            game.handleCollectablePickup(agent, item);
                            // Log item collection
                            if (game.logItemCollected) game.logItemCollected(agent, item);
                        }
                    }
                });
            }

            for (let i = 0; i < agent.cooldowns.length; i++) {
                if (agent.cooldowns[i] > 0) agent.cooldowns[i]--;
            }

            if (agent.shieldDuration > 0) {
                agent.shieldDuration--;
                if (agent.shieldDuration === 0) agent.shield = 0;
            }
        });

        // Update enemies - use facade's enemies array
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            if (enemy.alertLevel > 0) {
                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.5) {
                    // Update facing angle when chasing
                    enemy.facingAngle = Math.atan2(dy, dx);

                    const moveSpeed = enemy.speed / 60;  // Original - NO speed multiplier
                    const moveX = (dx / dist) * moveSpeed;
                    const moveY = (dy / dist) * moveSpeed;

                    const newX = enemy.x + moveX;
                    const newY = enemy.y + moveY;

                    // Check collision before moving
                    if (this.canMoveTo(enemy.x, enemy.y, newX, newY)) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Try to slide along walls
                        if (this.canMoveTo(enemy.x, enemy.y, newX, enemy.y)) {
                            enemy.x = newX;
                            enemy.facingAngle = dx > 0 ? 0 : Math.PI;
                        } else if (this.canMoveTo(enemy.x, enemy.y, enemy.x, newY)) {
                            enemy.y = newY;
                            enemy.facingAngle = dy > 0 ? Math.PI/2 : -Math.PI/2;
                        }
                    }
                } else {
                    enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.5);  // Original - NO multiplier
                }
            } else {
                if (Math.random() < 0.01) {  // Original - NO speed multiplier
                    // Generate new target position that is walkable
                    let attempts = 0;
                    let newTargetX, newTargetY;
                    do {
                        newTargetX = enemy.x + (Math.random() - 0.5) * 5;
                        newTargetY = enemy.y + (Math.random() - 0.5) * 5;
                        attempts++;
                    } while (!this.isWalkable(newTargetX, newTargetY) && attempts < 10);

                    if (attempts < 10) {
                        enemy.targetX = newTargetX;
                        enemy.targetY = newTargetY;
                    }
                }

                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.1) {
                    // Update facing angle when patrolling
                    enemy.facingAngle = Math.atan2(dy, dx);

                    const moveSpeed = enemy.speed / 120;  // Original - NO speed multiplier
                    const moveX = (dx / dist) * moveSpeed;
                    const moveY = (dy / dist) * moveSpeed;

                    const newX = enemy.x + moveX;
                    const newY = enemy.y + moveY;

                    // Check collision before moving
                    if (this.canMoveTo(enemy.x, enemy.y, newX, newY)) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Try to slide along walls
                        if (this.canMoveTo(enemy.x, enemy.y, newX, enemy.y)) {
                            enemy.x = newX;
                            enemy.facingAngle = dx > 0 ? 0 : Math.PI;
                        } else if (this.canMoveTo(enemy.x, enemy.y, enemy.x, newY)) {
                            enemy.y = newY;
                            enemy.facingAngle = dy > 0 ? Math.PI/2 : -Math.PI/2;
                        } else {
                            // If stuck, pick a new target
                            enemy.targetX = enemy.x;
                            enemy.targetY = enemy.y;
                        }
                    }
                }
            }

            // Check vision
            this.agents.forEach(agent => {
                if (!agent.alive) return;
                const dist = Math.sqrt(
                    Math.pow(agent.x - enemy.x, 2) +
                    Math.pow(agent.y - enemy.y, 2)
                );

                // Apply stealth bonuses to reduce detection range
                const effectiveVisionRange = game.getStealthDetectionRange ? game.getStealthDetectionRange(agent) : 8;

                if (dist < effectiveVisionRange) {
                    enemy.alertLevel = 100;
                    enemy.targetX = agent.x;
                    enemy.targetY = agent.y;

                    if (Math.random() < 0.02 && dist < 5) {  // Original - NO speed multiplier
                        // Calculate damage using GameServices
                        let damage = enemy.damage || 10;
                        if (window.GameServices && window.GameServices.calculateAttackDamage) {
                            // Use unified damage calculation
                            damage = window.GameServices.calculateAttackDamage(
                                enemy,
                                agent,
                                { weaponType: 'rifle', distance: dist }
                            );
                        }

                        this.projectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            targetX: agent.x,
                            targetY: agent.y,
                            targetAgent: agent, // Store the specific target agent
                            damage: damage,
                            speed: 0.3,
                            owner: enemy.id,
                            hostile: true,
                            shooter: enemy, // Store shooter for RPG calculations
                            weaponType: enemy.weaponType || 'rifle'
                        });

                        // Create 3D tracer if in 3D mode (red for enemy shots)
                        if (game.is3DMode && game.create3DProjectileTracer) {
                            game.create3DProjectileTracer(enemy.x, enemy.y, agent.x, agent.y, 0xff0000);
                        }
                    }
                }
            });
        });

        // Update NPCs (only if function exists)
        if (game.updateNPCs) {
            game.updateNPCs();
        }

        // Update projectiles - use facade's projectiles array
        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.5) {
                if (proj.hostile) {
                    // Find the specific target agent
                    if (proj.targetAgent) {
                        // Damage only the specific target
                        const agent = proj.targetAgent;
                        if (agent && agent.alive) {
                            let actualDamage = proj.damage;

                            // Apply protection bonus from equipment
                            if (agent.protection) {
                                actualDamage = Math.max(1, actualDamage - agent.protection);
                            }

                            // CRITICAL: Use AgentService for agent damage (single source of truth)
                            const agentId = agent.originalId || agent.id || agent.name;
                            if (window.GameServices.agentService) {
                                window.GameServices.agentService.damageAgent(agentId, actualDamage, 'enemy projectile');

                                // Check if agent died
                                const agentData = window.GameServices.agentService.getAgent(agentId);
                                if (agentData && !agentData.alive) {
                                    if (game.logDeath) game.logDeath(agent);
                                } else {
                                    // Log hit
                                    if (game.logCombatHit) {
                                        const attacker = proj.owner ?
                                            this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy' } :
                                            { name: 'Enemy' };
                                        game.logCombatHit(attacker, agent, actualDamage);
                                    }
                                }
                            }
                            // Play hit sound
                            game.playSound('hit', 0.3);
                        }
                    } else {
                        // Fallback: find closest agent to impact point
                        let closestAgent = null;
                        let closestDist = Infinity;
                        this.agents.forEach(agent => {
                            const hitDist = Math.sqrt(
                                Math.pow(agent.x - proj.targetX, 2) +
                                Math.pow(agent.y - proj.targetY, 2)
                            );
                            if (hitDist < 1 && hitDist < closestDist) {
                                closestDist = hitDist;
                                closestAgent = agent;
                            }
                        });

                        if (closestAgent) {
                            let actualDamage = proj.damage;

                            // Apply protection
                            if (closestAgent.protection) {
                                actualDamage = Math.max(1, actualDamage - closestAgent.protection);
                            }
                            if (closestAgent.shield > 0) {
                                closestAgent.shield -= actualDamage;
                            } else {
                                // CRITICAL: Use AgentService for agent damage (single source of truth)
                                const agentId = closestAgent.originalId || closestAgent.id || closestAgent.name;
                                if (window.GameServices.agentService) {
                                    window.GameServices.agentService.damageAgent(agentId, actualDamage, 'enemy projectile');

                                    // Check if agent died
                                    const agentData = window.GameServices.agentService.getAgent(agentId);
                                    const isDead = agentData && !agentData.alive;

                                    // Log hit with kill information
                                    if (game.logCombatHit) {
                                        const attacker = proj.owner ?
                                            this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy', type: 'enemy' } :
                                            { name: 'Enemy', type: 'enemy' };
                                        game.logCombatHit(attacker, closestAgent, actualDamage, isDead);
                                    }

                                    if (isDead) {
                                        // Additional death logging if needed
                                        // if (game.logDeath) game.logDeath(closestAgent);
                                    }
                                }
                            }
                            // Play hit sound
                            game.playSound('hit', 0.3);
                        }
                    }
                } else {
                    // Player projectile hitting enemy
                    if (proj.targetEnemy) {
                        // Damage only the specific target enemy
                        const enemy = proj.targetEnemy;
                        if (enemy && enemy.alive) {
                            // Use GameServices to calculate actual damage if available
                            // Check if this is a visual-only projectile (damage already applied by CombatService)
                            let damageResult = { isDead: false };
                            let actualDamage = proj.damage;

                            if (!proj.visualOnly) {
                                // Apply damage only if NOT visual-only
                                if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                    actualDamage = window.GameServices.calculateAttackDamage(
                                        proj.agent || { damage: proj.damage },
                                        enemy,
                                        { distance: 0 }
                                    );
                                }

                                // Use FormulaService to apply damage
                                damageResult = window.GameServices.formulaService.applyDamage(enemy, actualDamage);
                            } else {
                                // Visual-only projectile - damage was already applied by CombatService
                                // Check if enemy is already dead from that damage
                                damageResult.isDead = enemy.health <= 0;
                            }

                            // Only log hits for non-visual projectiles
                            // Visual-only projectiles are from CombatService which logs its own hits
                            if (!proj.visualOnly && game.logCombatHit) {
                                game.logCombatHit(
                                    proj.agent || proj.shooter || { name: 'Agent', type: 'agent' },
                                    enemy,
                                    actualDamage || proj.damage,
                                    damageResult.isDead  // Pass killed status
                                );
                            }

                            if (damageResult.isDead) {
                                game.totalEnemiesDefeated++;

                                if (this.logger) this.logger.debug(`⚔️ ENEMY KILLED! Details:`, {
                                    enemyType: enemy.type,
                                    enemyHasRPG: !!enemy.rpgEntity,
                                    shooterFromProj: proj.shooter?.name || proj.agent?.name || 'unknown',
                                    shooterHasRPG: !!(proj.shooter?.rpgEntity || proj.agent?.rpgEntity)
                                });

                                // Track enemy elimination for mission objectives
                                if (game.onEnemyEliminated) {
                                    if (this.logger) this.logger.info('🎯 Calling onEnemyEliminated...');
                                    game.onEnemyEliminated(enemy);
                                }

                                // Grant XP for kills!
                                const killer = proj.shooter || proj.agent || null;
                                if (game.onEntityDeath && killer) {
                                    if (this.logger) this.logger.debug(`📞 Calling onEntityDeath...`);
                                    game.onEntityDeath(enemy, killer);
                                }

                                // Don't log death separately since we already logged it with the hit
                                // if (game.logDeath) game.logDeath(enemy);
                            }
                            // Play hit sound
                            game.playSound('hit', 0.3);
                        }
                    } else {
                        // Fallback: find closest enemy to impact point
                        let closestEnemy = null;
                        let closestDist = Infinity;
                        this.enemies.forEach(enemy => {
                            const hitDist = Math.sqrt(
                                Math.pow(enemy.x - proj.targetX, 2) +
                                Math.pow(enemy.y - proj.targetY, 2)
                            );
                            if (hitDist < 1 && hitDist < closestDist) {
                                closestDist = hitDist;
                                closestEnemy = enemy;
                            }
                        });

                        if (closestEnemy) {
                            // Check if this is a visual-only projectile
                            let damageResult = { isDead: false };
                            let actualDamage = proj.damage;

                            if (!proj.visualOnly) {
                                // Apply damage only if NOT visual-only
                                if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                    actualDamage = window.GameServices.calculateAttackDamage(
                                        proj.agent || { damage: proj.damage },
                                        closestEnemy,
                                        { distance: 0 }
                                    );
                                }

                                // Use FormulaService to apply damage
                                damageResult = window.GameServices.formulaService.applyDamage(closestEnemy, actualDamage);
                            } else {
                                // Visual-only projectile - damage was already applied by CombatService
                                damageResult.isDead = closestEnemy.health <= 0;
                            }

                            // Only log hits for non-visual projectiles
                            // Visual-only projectiles are from CombatService which logs its own hits
                            if (!proj.visualOnly && game.logCombatHit) {
                                const attacker = proj.agent || proj.shooter || { name: 'Agent', type: 'agent' };
                                game.logCombatHit(attacker, closestEnemy, actualDamage || proj.damage, damageResult.isDead);
                            }

                            if (damageResult.isDead) {
                                game.totalEnemiesDefeated++;

                                // Track enemy elimination for mission objectives
                                if (game.onEnemyEliminated) {
                                    if (this.logger) this.logger.info('🎯 Calling onEnemyEliminated (fallback path)...');
                                    game.onEnemyEliminated(closestEnemy);
                                }

                                // Grant XP for kills
                                const killer = proj.shooter || proj.agent || null;
                                if (game.onEntityDeath && killer) {
                                    game.onEntityDeath(closestEnemy, killer);
                                }
                            }
                            // Play hit sound
                            game.playSound('hit', 0.3);
                        }
                    }
                }
                return false;
            }

            // Original - NO speed multiplier (speed comes from multiple update calls)
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
            return true;
        });

        // Update effects - Original simple increment (speed comes from multiple update calls)
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            return effect.frame < effect.duration;
        });

        game.updateSquadHealth();
        // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
        if (this.agents.some(a => game.isAgentSelected && game.isAgentSelected(a))) {
            game.updateCooldownDisplay();
        }

        // Call the comprehensive mission update that handles objectives AND extraction
        if (game.updateMissionObjectives) {
            game.updateMissionObjectives();
        } else {
            // Fallback to simple status check if new system not available
            if (game.checkMissionStatus) {
                game.checkMissionStatus();
            }
        }
    }

    // ============================================
    // MOVEMENT & COLLISION HELPERS
    // Migrated from game-loop.js
    // ============================================

    /**
     * Check if a position is walkable
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if position is walkable
     */
    isWalkable(x, y) {
        // Check map bounds
        if (!this.currentMap || x < 0 || x >= this.currentMap.width || y < 0 || y >= this.currentMap.height) {
            return false;
        }

        // Check tile - 0 is walkable, 1 is wall
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Safety check for array access
        if (!this.currentMap.tiles[tileY] || this.currentMap.tiles[tileY][tileX] === undefined) {
            return false;
        }

        // Check if this is an unlocked door position
        if (this.currentMap.doors) {
            for (let door of this.currentMap.doors) {
                // Check if we're at a door position (with some tolerance for floating point)
                const atDoor = Math.abs(door.x - tileX) < 1 && Math.abs(door.y - tileY) < 1;
                if (atDoor && !door.locked) {
                    // Unlocked door - allow passage
                    return true;
                }
            }
        }

        return this.currentMap.tiles[tileY][tileX] === 0;
    }

    /**
     * Check if movement from one position to another is valid
     * @param {number} fromX - Starting X coordinate
     * @param {number} fromY - Starting Y coordinate
     * @param {number} toX - Target X coordinate
     * @param {number} toY - Target Y coordinate
     * @returns {boolean} - True if movement is valid
     */
    canMoveTo(fromX, fromY, toX, toY) {
        // Check if target position is walkable
        if (!this.isWalkable(toX, toY)) {
            return false;
        }

        // Check if blocked by a locked door
        if (this.isDoorBlocking(toX, toY)) {
            return false;
        }

        // Check corners for diagonal movement to prevent clipping through walls
        const dx = toX - fromX;
        const dy = toY - fromY;

        // If moving diagonally, check both adjacent tiles
        if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
            // Check horizontal then vertical path
            if (!this.isWalkable(toX, fromY) || !this.isWalkable(fromX, toY)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if a position is blocked by a locked door
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if blocked by locked door
     */
    isDoorBlocking(x, y) {
        if (!this.currentMap || !this.currentMap.doors) return false;

        for (let door of this.currentMap.doors) {
            if (door.locked) {
                const dist = Math.sqrt(
                    Math.pow(door.x - x, 2) +
                    Math.pow(door.y - y, 2)
                );
                if (dist < 0.5) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Clean up
     */
    dispose() {
        // Clean up any resources
        // NOTE: agents is now a computed property - don't reset it
        this.enemies = [];
        this.npcs = [];
        this.projectiles = [];
        this.items = [];

        if (this.logger) this.logger.info('GameFacade disposed');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.GameFacade = GameFacade;
}