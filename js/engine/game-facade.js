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
        this.gameSpeed = 1;
        this.targetGameSpeed = 1;
        this.autoSlowdownRange = 10;
        this.speedIndicatorFadeTime = 0;

        // Mission state
        this.currentMission = null;
        this.currentMap = null;
        this.missionObjectives = [];
        this.extractionEnabled = false;

        // Entity state
        this.agents = [];
        this.enemies = [];
        this.npcs = [];
        this.projectiles = [];
        this.effects = [];
        this.items = [];

        // Selection state
        this.selectedAgent = null;
        this.selectedTarget = null;

        // Combat state
        this.turnBasedMode = false;
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
        this.fogEnabled = false;
        this.fogOfWar = null;
        this.showPaths = false;
        this.debugMode = false;
        this.usePathfinding = true;
        this.agentWaypoints = {};
        this.destinationIndicators = [];
        this.squadSelectEffect = null;
        this.activeQuests = null;
        this.npcActiveQuests = [];
        this.is3DMode = false;

        // Initialize subsystems
        this.initializeDefaultState();

        if (this.logger) this.logger.info('GameFacade initialized');
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
        const availableAgents = this.services.agentService.getAvailableAgents();
        this.agents = availableAgents.slice(0, 4).map((agent, index) => ({
            ...agent,
            id: `agent_${index}`,
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
        this.extractionEnabled = false;
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
        if (mapData.embedded) {
            this.currentMap = this.parseEmbeddedMap(mapData.embedded);
        } else {
            if (this.logger) this.logger.error('No embedded map data');
            this.currentMap = this.generateEmptyMap(40, 40);
        }
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
     */
    setupObjectives(objectives) {
        this.missionObjectives = objectives.map(obj => ({
            ...obj,
            completed: false,
            progress: 0
        }));
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
    }

    /**
     * Update game state (called every frame)
     */
    update(deltaTime) {
        if (this.currentScreen !== 'game' || this.isPaused) {
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

            // Update target health locally for immediate feedback
            target.health -= result.damage;
            if (result.killed) {
                target.alive = false;
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
            // Update objective counters
            const eliminateObjective = this.missionObjectives.find(obj => obj.type === 'eliminate');
            if (eliminateObjective) {
                eliminateObjective.progress++;
            }
        }
    }

    /**
     * Update mission objectives
     */
    updateObjectives() {
        // Delegate to MissionService if available - it's the source of truth
        const game = this.legacyGame;
        if (game && game.checkMissionObjectives) {
            game.checkMissionObjectives();

            // Sync extraction state from MissionService
            if (game.gameServices && game.gameServices.missionService) {
                this.extractionEnabled = game.gameServices.missionService.extractionEnabled;
            } else {
                // Fallback to game's extraction state
                this.extractionEnabled = game.extractionEnabled || false;
            }
        }
    }

    /**
     * Check mission completion
     */
    checkMissionCompletion() {
        // Delegate to legacy game's extraction checking
        const game = this.legacyGame;
        if (game && game.checkExtractionPoint) {
            game.checkExtractionPoint();
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
        const minutes = Math.floor(seconds / 60);
        const timerElement = document.getElementById('missionTimer');
        if (timerElement) {
            timerElement.textContent =
                `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
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
                    agent.targetX = this.selectedAgent.x + Math.cos(offsetAngle) * followDist;
                    agent.targetY = this.selectedAgent.y + Math.sin(offsetAngle) * followDist;
                } else if (leaderDist < 2) {
                    // Too close, stop moving
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

                    if (agent.selected) {
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

                            // Use FormulaService to apply damage properly
                            const damageResult = window.GameServices.formulaService.applyDamage(agent, actualDamage);
                            if (damageResult.isDead) {
                                // Log agent death
                                if (game.logDeath) game.logDeath(agent);
                            } else {
                                // Log hit - use projectile owner or generic enemy
                                if (game.logCombatHit) {
                                    const attacker = proj.owner ?
                                        this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy' } :
                                        { name: 'Enemy' };
                                    game.logCombatHit(attacker, agent, actualDamage);
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
                                // Use FormulaService to apply damage
                                const damageResult = window.GameServices.formulaService.applyDamage(closestAgent, actualDamage);
                                if (damageResult.isDead) {
                                    // Log agent death
                                    if (game.logDeath) game.logDeath(closestAgent);
                                } else {
                                    // Log hit - use projectile owner or generic enemy
                                    if (game.logCombatHit) {
                                        const attacker = proj.owner ?
                                            this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy' } :
                                            { name: 'Enemy' };
                                        game.logCombatHit(attacker, closestAgent, actualDamage);
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
                            let actualDamage = proj.damage;
                            if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                actualDamage = window.GameServices.calculateAttackDamage(
                                    proj.agent || { damage: proj.damage },
                                    enemy,
                                    { distance: 0 }
                                );
                            }

                            // Use FormulaService to apply damage
                            const damageResult = window.GameServices.formulaService.applyDamage(enemy, actualDamage);
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
                                    game.onEnemyEliminated(enemy);
                                }

                                // Grant XP for kills!
                                const killer = proj.shooter || proj.agent || null;
                                if (game.onEntityDeath && killer) {
                                    if (this.logger) this.logger.debug(`📞 Calling onEntityDeath...`);
                                    game.onEntityDeath(enemy, killer);
                                }

                                // Log enemy death
                                if (game.logDeath) game.logDeath(enemy);
                            } else {
                                // Log hit
                                if (game.logCombatHit) game.logCombatHit(proj.agent || { name: 'Agent' }, enemy, actualDamage);
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
                            // Use GameServices to calculate actual damage if available
                            let actualDamage = proj.damage;
                            if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                actualDamage = window.GameServices.calculateAttackDamage(
                                    proj.agent || { damage: proj.damage },
                                    closestEnemy,
                                    { distance: 0 }
                                );
                            }

                            // Use FormulaService to apply damage
                            const damageResult = window.GameServices.formulaService.applyDamage(closestEnemy, actualDamage);
                            if (damageResult.isDead) {
                                game.totalEnemiesDefeated++;
                                // Log enemy death
                                if (game.logDeath) game.logDeath(closestEnemy);
                            } else {
                                // Log hit
                                if (game.logCombatHit) {
                                    const attacker = proj.agent || { name: 'Agent' };
                                    game.logCombatHit(attacker, closestEnemy, actualDamage);
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
        if (this.agents.some(a => a.selected)) {
            game.updateCooldownDisplay();
        }

        game.checkMissionStatus();
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
        this.agents = [];
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