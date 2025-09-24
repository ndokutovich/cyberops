/**
 * GameController - Orchestrates GameEngine and GameFacade
 * This bridges the old CyberOpsGame with the new architecture
 */

class GameController {
    constructor(game) {
        this.logger = window.Logger ? new window.Logger('GameController') : null;

        // Reference to CyberOpsGame for backward compatibility
        this.legacyGame = game;

        // Initialize facade (game logic layer) with existing services and legacy game reference
        this.facade = new window.GameFacade(game.gameServices || window.GameServices, game);
        // Make facade globally accessible for backward compatibility
        window.gameFacade = this.facade;

        // Initialize engine (technical layer) using existing canvas and facade reference
        this.engine = new window.GameEngine(game.canvas, game.audioContext || null, this.facade);

        // Wire up connections
        this.setupConnections();

        // Sync initial state
        this.syncState();

        if (this.logger) this.logger.info('GameController initialized');
    }

    /**
     * Setup connections between engine and facade
     */
    setupConnections() {
        // Input processing pipeline
        this.lastInputState = null;

        // Render pipeline
        this.renderBridge = new RenderBridge(this.legacyGame, this.engine, this.facade);
    }

    /**
     * Sync state from legacy game to new architecture
     */
    syncState() {
        const game = this.legacyGame;

        // Track screen changes
        const prevScreen = this.facade.currentScreen;

        // Sync game state
        this.facade.currentScreen = game.currentScreen;
        this.facade.isPaused = game.isPaused;
        this.facade.gameSpeed = game.gameSpeed;
        this.facade.targetGameSpeed = game.targetGameSpeed || 1;
        this.facade.autoSlowdownRange = game.autoSlowdownRange || 10;
        this.facade.speedIndicatorFadeTime = game.speedIndicatorFadeTime || 0;

        // Log screen transitions
        if (prevScreen !== this.facade.currentScreen) {
            if (this.logger) this.logger.info(`📺 Screen transition: ${prevScreen} → ${this.facade.currentScreen}`);
        }

        // Sync entities
        if (game.agents) this.facade.agents = game.agents;
        if (game.enemies) this.facade.enemies = game.enemies;
        if (game.npcs) this.facade.npcs = game.npcs;
        if (game.projectiles) this.facade.projectiles = game.projectiles;

        // Sync mission state
        if (game.currentMissionDef) this.facade.currentMission = game.currentMissionDef;
        if (game.map) this.facade.currentMap = game.map;
        if (game.missionObjectives) this.facade.missionObjectives = game.missionObjectives;

        // Sync fog of war state
        if (game.fogOfWar) this.facade.fogOfWar = game.fogOfWar;
        if (game.fogEnabled !== undefined) this.facade.fogEnabled = game.fogEnabled;

        // Sync 3D mode state
        if (game.is3DMode !== undefined) this.facade.is3DMode = game.is3DMode;

        // Sync turn-based mode
        if (game.turnBasedMode !== undefined) this.facade.turnBasedMode = game.turnBasedMode;

        // Sync other important state
        if (game.agentWaypoints) this.facade.agentWaypoints = game.agentWaypoints;
        if (game.destinationIndicators) this.facade.destinationIndicators = game.destinationIndicators;
        if (game.squadSelectEffect) this.facade.squadSelectEffect = game.squadSelectEffect;
        if (game.showPaths !== undefined) this.facade.showPaths = game.showPaths;
        if (game.debugMode !== undefined) this.facade.debugMode = game.debugMode;
        if (game.usePathfinding !== undefined) this.facade.usePathfinding = game.usePathfinding;
        if (game.activeQuests) this.facade.activeQuests = game.activeQuests;
        if (game.npcActiveQuests) this.facade.npcActiveQuests = game.npcActiveQuests;

        // Sync camera
        this.engine.setCamera(game.cameraX, game.cameraY, game.zoom || 1);

        // Sync selection
        if (game._selectedAgent) this.facade.selectedAgent = game._selectedAgent;
    }

    /**
     * Sync state from new architecture back to legacy game
     */
    syncBack() {
        const game = this.legacyGame;

        // Sync game state
        game.currentScreen = this.facade.currentScreen;
        game.isPaused = this.facade.isPaused;
        game.gameSpeed = this.facade.gameSpeed;
        game.targetGameSpeed = this.facade.targetGameSpeed;
        game.autoSlowdownRange = this.facade.autoSlowdownRange;
        game.speedIndicatorFadeTime = this.facade.speedIndicatorFadeTime;

        // Sync entities
        game.agents = this.facade.agents;
        game.enemies = this.facade.enemies;
        game.npcs = this.facade.npcs;
        game.projectiles = this.facade.projectiles;

        // Sync mission state
        game.currentMissionDef = this.facade.currentMission;
        game.map = this.facade.currentMap;
        game.missionObjectives = this.facade.missionObjectives;
        game.extractionEnabled = this.facade.extractionEnabled;

        // Sync fog of war state
        game.fogOfWar = this.facade.fogOfWar;
        game.fogEnabled = this.facade.fogEnabled;

        // Sync 3D mode state
        game.is3DMode = this.facade.is3DMode;

        // Sync other important state
        game.agentWaypoints = this.facade.agentWaypoints;
        game.destinationIndicators = this.facade.destinationIndicators;
        game.squadSelectEffect = this.facade.squadSelectEffect;
        game.showPaths = this.facade.showPaths;
        game.debugMode = this.facade.debugMode;
        game.usePathfinding = this.facade.usePathfinding;
        game.activeQuests = this.facade.activeQuests;
        game.npcActiveQuests = this.facade.npcActiveQuests;

        // Sync camera
        game.cameraX = this.engine.cameraX;
        game.cameraY = this.engine.cameraY;
        game.zoom = this.engine.zoom;

        // Sync selection
        game._selectedAgent = this.facade.selectedAgent;
    }

    /**
     * Start the game loop
     */
    start() {
        if (this.logger) this.logger.info('🚀 Starting new architecture game loop');

        // Use engine's render loop
        this.engine.startRenderLoop(
            (deltaTime) => this.update(deltaTime),
            (ctx) => this.render(ctx)
        );

        if (this.logger) this.logger.info('✅ Game loop started successfully');
    }

    /**
     * Update game logic
     */
    update(deltaTime) {
        // Sync current state from legacy game
        this.syncState();

        if (this.facade.currentScreen === 'game' && !this.facade.isPaused) {
            // Handle turn-based mode differently (like original)
            if (this.facade.turnBasedMode) {
                // In turn-based mode, update animations and effects only
                // TODO: Implement specialized turn-based update
                this.facade.updateTurnBasedAnimations(deltaTime);

                // Update fog of war based on agent positions
                if (this.legacyGame.updateFogOfWar) {
                    this.legacyGame.updateFogOfWar();
                }

                // Update visual effects
                if (this.legacyGame.updateVisualEffects) {
                    this.legacyGame.updateVisualEffects(deltaTime);
                }
            } else {
                // Normal real-time update - CRITICAL: Call update multiple times based on game speed!
                const updateCount = Math.floor(this.facade.gameSpeed || 1);
                for (let i = 0; i < updateCount; i++) {
                    this.facade.update(deltaTime);

                    // Update 3D if in 3D mode (inside loop like original)
                    if (this.facade.is3DMode && this.legacyGame.update3D) {
                        this.legacyGame.update3D();
                        this.legacyGame.update3DCamera();
                        this.legacyGame.sync3DTo2D();
                    }
                }

                // Only update these in real-time mode (outside loop like original)
                if (this.legacyGame.checkAutoSlowdown) {
                    this.legacyGame.checkAutoSlowdown();
                    // Re-sync game speed after auto-slowdown might have changed it
                    this.facade.gameSpeed = this.legacyGame.gameSpeed;
                    this.facade.targetGameSpeed = this.legacyGame.targetGameSpeed;
                    this.facade.speedIndicatorFadeTime = this.legacyGame.speedIndicatorFadeTime;
                }

                // Update music system based on game state
                if (this.legacyGame.musicSystem && this.legacyGame.updateMusicState) {
                    this.legacyGame.updateMusicState();
                }
            }
        }

        // Update visual effects outside of game update (for menus etc)
        if (this.facade.currentScreen !== 'game' && this.legacyGame.updateVisualEffects) {
            this.legacyGame.updateVisualEffects(deltaTime);
        }

        // Sync state back to legacy game after facade updates
        this.syncBack();

        // Log periodically (every 300 frames = ~5 seconds at 60fps)
        if (!this.frameCounter) this.frameCounter = 0;
        this.frameCounter++;
        if (this.frameCounter % 300 === 0) {
            if (this.logger) this.logger.debug(`🔄 New architecture: Frame ${this.frameCounter}, Screen: ${this.facade.currentScreen}`);
        }
    }

    /**
     * Process input and convert to game actions
     */
    processInput(inputState) {
        // Check if input changed
        if (JSON.stringify(inputState) === JSON.stringify(this.lastInputState)) {
            return;
        }
        this.lastInputState = inputState;

        // Handle keyboard shortcuts
        if (inputState.keys.includes('escape')) {
            this.facade.handleAction('pause');
        }

        if (inputState.keys.includes(' ')) {
            this.facade.handleAction('toggleTurnBased');
        }

        // Handle mouse clicks (convert to world coordinates)
        if (inputState.mouse.down && this.facade.currentScreen === 'game') {
            const worldX = Math.floor(inputState.mouse.worldX);
            const worldY = Math.floor(inputState.mouse.worldY);

            // Check what was clicked
            const clickedEnemy = this.facade.enemies.find(e =>
                e.alive &&
                Math.abs(e.x - worldX) < 1 &&
                Math.abs(e.y - worldY) < 1
            );

            if (clickedEnemy) {
                this.facade.handleAction('attack', { targetId: clickedEnemy.id });
            } else {
                this.facade.handleAction('moveAgent', { x: worldX, y: worldY });
            }
        }

        // Handle agent selection (number keys)
        for (let i = 1; i <= 6; i++) {
            if (inputState.keys.includes(String(i))) {
                const agentIndex = i - 1;
                if (this.facade.agents[agentIndex]) {
                    this.facade.handleAction('selectAgent', {
                        agentId: this.facade.agents[agentIndex].id
                    });
                }
            }
        }
    }

    /**
     * Render game
     */
    render(ctx) {
        // Use engine's render method now that it's migrated
        this.engine.render();
    }

    /**
     * Handle screen transitions
     */
    switchScreen(screen) {
        this.facade.currentScreen = screen;
        this.legacyGame.currentScreen = screen;
    }

    /**
     * Start a mission (bridge method)
     */
    startMission(missionId) {
        // Use facade to start mission
        const success = this.facade.startMission(missionId);

        if (success) {
            // Sync to legacy game
            this.syncBack();

            // Switch screen
            this.switchScreen('game');
        }

        return success;
    }

    /**
     * Set game speed to a specific value
     * @param {number} speed - The speed multiplier (1, 2, 4, 8, 16)
     * @returns {boolean} True if speed was changed
     */
    setGameSpeed(speed) {
        const availableSpeeds = [1, 2, 4, 8, 16];

        if (!availableSpeeds.includes(speed)) {
            if (this.logger) this.logger.warn(`Invalid speed: ${speed}. Available speeds: ${availableSpeeds.join(', ')}`);
            return false;
        }

        if (this.facade.gameSpeed !== speed) {
            // Update facade speed
            this.facade.gameSpeed = speed;
            this.facade.targetGameSpeed = speed;

            // Update legacy game speed
            this.legacyGame.gameSpeed = speed;
            this.legacyGame.targetGameSpeed = speed;
            this.legacyGame.lastSpeedChangeTime = Date.now();
            this.legacyGame.speedIndicatorFadeTime = 3000; // Show indicator for 3 seconds

            // Update facade indicator
            this.facade.speedIndicatorFadeTime = 3000;

            if (this.logger) this.logger.debug(`⚡ Game speed changed to ${speed}x`);
            return true;
        }

        return false;
    }

    /**
     * Cycle through available game speeds
     * @returns {number} The new game speed
     */
    cycleGameSpeed() {
        const speeds = [1, 2, 4, 8, 16];
        const currentSpeed = this.facade.gameSpeed || 1;
        const currentIndex = speeds.indexOf(currentSpeed);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newSpeed = speeds[nextIndex];

        this.setGameSpeed(newSpeed);
        return newSpeed;
    }

    /**
     * Get the current effective game speed (accounting for auto-slowdown)
     * @param {Object} context - Context object with enemy proximity info
     * @returns {number} Effective game speed
     */
    getEffectiveGameSpeed(context = {}) {
        let effectiveSpeed = this.facade.gameSpeed || 1;

        // Auto-slowdown when near enemies
        if (context.nearEnemies && effectiveSpeed > 1) {
            effectiveSpeed = Math.max(1, Math.floor(effectiveSpeed / 2));

            // Update target speed for smooth transition
            if (this.facade.targetGameSpeed !== effectiveSpeed) {
                this.facade.targetGameSpeed = effectiveSpeed;
                this.legacyGame.targetGameSpeed = effectiveSpeed;
                if (this.logger) this.logger.trace(`Auto-slowdown: ${this.facade.gameSpeed}x → ${effectiveSpeed}x (enemies nearby)`);
            }
        }

        // Auto-slowdown during combat
        if (context.inCombat && effectiveSpeed > 2) {
            effectiveSpeed = Math.min(effectiveSpeed, 2);

            if (this.facade.targetGameSpeed !== effectiveSpeed) {
                this.facade.targetGameSpeed = effectiveSpeed;
                this.legacyGame.targetGameSpeed = effectiveSpeed;
                if (this.logger) this.logger.trace(`Combat slowdown: ${this.facade.gameSpeed}x → ${effectiveSpeed}x`);
            }
        }

        return effectiveSpeed;
    }

    /**
     * Check and apply auto-slowdown based on enemy proximity
     * Moved from game-loop.js
     */
    checkAutoSlowdown() {
        const game = this.legacyGame;
        if (!game.agents || !game.enemies) return;

        // Check if any living enemy is near any living agent
        let enemyNearby = false;
        const autoSlowdownRange = game.autoSlowdownRange || 10;

        for (const agent of game.agents) {
            if (!agent.alive) continue;

            for (const enemy of game.enemies) {
                if (!enemy.alive) continue;

                const dx = agent.x - enemy.x;
                const dy = agent.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < autoSlowdownRange) {
                    enemyNearby = true;
                    break;
                }
            }
            if (enemyNearby) break;
        }

        // Auto-adjust speed based on enemy proximity
        const currentSpeed = this.facade.gameSpeed || 1;
        const targetSpeed = this.facade.targetGameSpeed || 1;

        if (enemyNearby && currentSpeed > 1) {
            // Slow down to 1x when enemies are near
            this.setGameSpeed(1);
            this.facade.targetGameSpeed = targetSpeed; // Preserve original target
            if (this.logger) this.logger.debug('⚠️ Enemy detected - slowing to 1x speed');
            this.legacyGame.speedIndicatorFadeTime = 2000;
            this.facade.speedIndicatorFadeTime = 2000;
        } else if (!enemyNearby && targetSpeed > 1 && currentSpeed === 1) {
            // Speed back up when enemies are gone
            this.setGameSpeed(targetSpeed);
            if (this.logger) this.logger.info(`✅ Area clear - resuming ${targetSpeed}x speed`);
            this.legacyGame.speedIndicatorFadeTime = 2000;
            this.facade.speedIndicatorFadeTime = 2000;
        }
    }

    /**
     * Clean up
     */
    dispose() {
        this.engine.dispose();
        this.facade.dispose();
    }
}

/**
 * RenderBridge - Bridges old rendering with new engine
 */
class RenderBridge {
    constructor(legacyGame, engine, facade) {
        this.game = legacyGame;
        this.engine = engine;
        this.facade = facade;
        this.logger = window.Logger ? new window.Logger('RenderBridge') : null;
    }

    /**
     * Render game screen
     */
    renderGame(ctx, gameState) {
        // Render map
        if (gameState.map) {
            this.renderMap(ctx, gameState.map);
        }

        // Render entities
        this.renderEntities(ctx, gameState);

        // Render effects
        this.renderProjectiles(ctx, gameState.projectiles);

        // Use legacy rendering for UI elements
        if (this.game.renderHUD) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for HUD
            this.game.renderHUD();
            ctx.restore();
        }

        // Render turn-based overlay if active
        if (gameState.turnBasedMode) {
            this.renderTurnBasedOverlay(ctx, gameState);
        }
    }

    /**
     * Render map
     */
    renderMap(ctx, map) {
        if (!map.tiles) return;

        // Use legacy isometric conversion
        const tileWidth = 64;
        const tileHeight = 32;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const tile = map.tiles[y][x];
                if (!tile) continue;

                // Convert to isometric
                const isoX = (x - y) * (tileWidth / 2);
                const isoY = (x + y) * (tileHeight / 2);

                // Render tile
                if (tile.type === 'wall') {
                    ctx.fillStyle = '#444';
                    ctx.fillRect(isoX - 1, isoY - 1, tileWidth + 2, tileHeight + 2);
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(isoX, isoY, tileWidth, tileHeight);
                }

                // Add grid lines
                ctx.strokeStyle = '#333';
                ctx.strokeRect(isoX, isoY, tileWidth, tileHeight);
            }
        }
    }

    /**
     * Render entities
     */
    renderEntities(ctx, gameState) {
        // Render enemies
        gameState.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            this.renderEntity(ctx, enemy, '#ff4444');
        });

        // Render NPCs
        gameState.npcs.forEach(npc => {
            this.renderEntity(ctx, npc, '#ffff44');
        });

        // Render agents
        gameState.agents.forEach(agent => {
            if (!agent.alive) return;
            const color = agent === gameState.selectedAgent ? '#44ff44' : '#4444ff';
            this.renderEntity(ctx, agent, color);
        });
    }

    /**
     * Render single entity
     */
    renderEntity(ctx, entity, color) {
        // Use legacy world to isometric conversion
        const iso = this.game.worldToIsometric(entity.x, entity.y);

        // Draw entity
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(iso.x + 32, iso.y + 16, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw health bar
        if (entity.health !== undefined && entity.maxHealth) {
            const healthPercent = entity.health / entity.maxHealth;
            ctx.fillStyle = 'red';
            ctx.fillRect(iso.x + 16, iso.y - 10, 32, 4);
            ctx.fillStyle = 'green';
            ctx.fillRect(iso.x + 16, iso.y - 10, 32 * healthPercent, 4);
        }
    }

    /**
     * Render projectiles
     */
    renderProjectiles(ctx, projectiles) {
        ctx.fillStyle = '#ffff00';
        projectiles.forEach(projectile => {
            const iso = this.game.worldToIsometric(projectile.x, projectile.y);
            ctx.beginPath();
            ctx.arc(iso.x + 32, iso.y + 16, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * Render turn-based overlay
     */
    renderTurnBasedOverlay(ctx, gameState) {
        // Show current turn
        if (gameState.currentTurn) {
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.fillStyle = 'white';
            ctx.font = '20px monospace';
            ctx.fillText(`Current Turn: ${gameState.currentTurn.name || gameState.currentTurn.id}`, 10, 60);

            // Show AP
            const ap = gameState.actionPoints.get(gameState.currentTurn.id) || 0;
            ctx.fillText(`Action Points: ${ap}`, 10, 85);
            ctx.restore();
        }
    }

    /**
     * Render menu screen
     */
    renderMenu(ctx) {
        // Use legacy menu rendering for now
        if (this.game.renderMenuScreen) {
            this.game.renderMenuScreen();
        }
    }

    /**
     * Render hub screen
     */
    renderHub(ctx) {
        // Use legacy hub rendering for now
        if (this.game.renderHubScreen) {
            this.game.renderHubScreen();
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.GameController = GameController;
}