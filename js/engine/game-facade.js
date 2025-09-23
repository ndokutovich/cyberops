/**
 * GameFacade - Game logic layer handling all game mechanics
 * This class is responsible for WHAT happens in the game
 * It does NOT know about rendering, audio playback, or input handling
 */

class GameFacade {
    constructor(gameServices) {
        this.logger = window.Logger ? new window.Logger('GameFacade') : null;

        // Services
        this.services = gameServices || new GameServices();

        // Game state
        this.currentScreen = 'splash';
        this.isPaused = false;
        this.gameSpeed = 1;

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
        } else {
            this.updateRealTime(deltaTime);
        }

        // Always update these
        this.updateProjectiles(deltaTime);
        this.updateObjectives();
        this.checkMissionCompletion();
    }

    /**
     * Update real-time mode
     */
    updateRealTime(deltaTime) {
        const speedMultiplier = this.gameSpeed;

        // Update agents
        this.agents.forEach(agent => {
            if (!agent.alive) return;

            // Move towards target
            if (agent.targetX !== undefined && agent.targetY !== undefined) {
                this.moveEntityTowards(agent, agent.targetX, agent.targetY, deltaTime * speedMultiplier);
            }

            // Auto-attack nearby enemies
            if (agent.autoAttack && !agent.attackCooldown) {
                const nearbyEnemy = this.findNearbyEnemy(agent);
                if (nearbyEnemy) {
                    this.performAttack(agent, nearbyEnemy);
                }
            }

            // Update cooldowns
            if (agent.attackCooldown) {
                agent.attackCooldown -= deltaTime * speedMultiplier;
                if (agent.attackCooldown <= 0) {
                    agent.attackCooldown = 0;
                }
            }
        });

        // Update enemies
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;

            // Simple AI - move towards nearest agent
            const target = this.findNearestAgent(enemy);
            if (target) {
                const distance = this.getDistance(enemy, target);
                if (distance > 2) {
                    this.moveEntityTowards(enemy, target.x, target.y, deltaTime * speedMultiplier * 0.5);
                } else if (!enemy.attackCooldown) {
                    this.performAttack(enemy, target);
                }
            }

            // Update cooldowns
            if (enemy.attackCooldown) {
                enemy.attackCooldown -= deltaTime * speedMultiplier;
                if (enemy.attackCooldown <= 0) {
                    enemy.attackCooldown = 0;
                }
            }
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
        // Use CombatService if available
        if (this.services.combatService) {
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

        // Fallback to old system if CombatService not available
        const damage = this.services.formulaService.calculateDamage(
            attacker.damage || 10,
            attacker.weaponDamage || 0,
            attacker.damageBonus || 0,
            target.protection || 0
        );

        // Apply damage
        target.health -= damage;
        if (target.health <= 0) {
            target.health = 0;
            target.alive = false;
            this.onEntityDeath(target);
        }

        // Create projectile
        this.createProjectile(attacker, target);

        // Set cooldown
        attacker.attackCooldown = 1000; // 1 second

        if (this.logger) this.logger.debug(`${attacker.id} attacked ${target.id} for ${damage} damage`);
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
        this.missionObjectives.forEach(objective => {
            if (objective.completed) return;

            switch (objective.type) {
                case 'eliminate':
                    if (objective.target.type === 'all_enemies') {
                        objective.completed = this.enemies.every(e => !e.alive);
                    } else if (objective.target.count) {
                        objective.completed = objective.progress >= objective.target.count;
                    }
                    break;

                case 'reach':
                    const extraction = this.currentMap?.extraction;
                    if (extraction) {
                        objective.completed = this.agents.some(agent =>
                            agent.alive &&
                            Math.abs(agent.x - extraction.x) < 2 &&
                            Math.abs(agent.y - extraction.y) < 2
                        );
                    }
                    break;
            }
        });

        // Enable extraction if all required objectives complete
        const requiredComplete = this.missionObjectives
            .filter(obj => obj.required)
            .every(obj => obj.completed);

        if (requiredComplete && !this.extractionEnabled) {
            this.extractionEnabled = true;
            if (this.logger) this.logger.info('Extraction enabled!');
        }
    }

    /**
     * Check mission completion
     */
    checkMissionCompletion() {
        if (!this.extractionEnabled) return;

        const extraction = this.currentMap?.extraction;
        if (!extraction) return;

        const allAgentsAtExtraction = this.agents
            .filter(a => a.alive)
            .every(agent =>
                Math.abs(agent.x - extraction.x) < 2 &&
                Math.abs(agent.y - extraction.y) < 2
            );

        if (allAgentsAtExtraction) {
            this.completeMission();
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

        // Use CombatService if available
        if (this.services.combatService) {
            this.services.combatService.setTurnBasedMode(this.turnBasedMode);

            // Sync turn state from CombatService
            if (this.turnBasedMode) {
                const turnInfo = this.services.combatService.getCurrentTurnInfo();
                if (turnInfo) {
                    this.currentTurn = turnInfo.entity;
                    this.actionPoints = this.services.combatService.actionPoints;
                }
            }
        } else if (this.turnBasedMode) {
            // Fallback to old system
            this.initializeTurnBasedMode();
        }
    }

    /**
     * Initialize turn-based mode (fallback)
     */
    initializeTurnBasedMode() {
        // Create turn order
        this.turnOrder = [
            ...this.agents.filter(a => a.alive),
            ...this.enemies.filter(e => e.alive)
        ].sort((a, b) => (b.initiative || 0) - (a.initiative || 0));

        // Initialize action points
        this.turnOrder.forEach(entity => {
            this.actionPoints.set(entity.id, entity.maxAP || 10);
        });

        // Start first turn
        this.startNextTurn();
    }

    /**
     * Start next turn
     */
    startNextTurn() {
        // Use CombatService if available
        if (this.services.combatService) {
            this.services.combatService.nextTurn();
            const turnInfo = this.services.combatService.getCurrentTurnInfo();
            if (turnInfo) {
                this.currentTurn = turnInfo.entity;
            }
            return;
        }

        // Fallback to old system
        if (this.turnOrder.length === 0) return;

        this.currentTurn = this.turnOrder.shift();
        this.turnOrder.push(this.currentTurn);

        // Restore AP for current entity
        this.actionPoints.set(this.currentTurn.id, this.currentTurn.maxAP || 10);

        if (this.logger) this.logger.debug(`Turn started: ${this.currentTurn.id}`);
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