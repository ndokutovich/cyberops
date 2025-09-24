/**
 * GameController - Orchestrates GameEngine and GameFacade
 * This bridges the old CyberOpsGame with the new architecture
 */

class GameController {
    constructor(game) {
        this.logger = window.Logger ? new window.Logger('GameController') : null;

        // Reference to CyberOpsGame for backward compatibility
        this.legacyGame = game;

        // Initialize engine (technical layer) using existing canvas
        this.engine = new window.GameEngine(game.canvas, game.audioContext || null);

        // Initialize facade (game logic layer) with existing services
        this.facade = new window.GameFacade(game.gameServices || window.GameServices);

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

        // Let legacy game do its updates for now
        // We'll gradually migrate these to facade
        if (this.legacyGame.currentScreen === 'game' && !this.legacyGame.isPaused) {
            // Call the main update function (not updateGame which doesn't exist)
            if (this.legacyGame.update) {
                this.legacyGame.update(deltaTime);
            }
        }

        // Update visual effects
        if (this.legacyGame.updateVisualEffects) {
            this.legacyGame.updateVisualEffects(deltaTime);
        }

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
        // For now, just use the legacy game's render method entirely
        // We'll gradually migrate this
        if (this.legacyGame.render) {
            this.legacyGame.render();
        } else {
            // Fallback to new rendering if old one not available
            const gameState = this.facade.getGameState();
            switch (gameState.screen) {
                case 'game':
                    this.renderBridge.renderGame(ctx, gameState);
                    break;
                case 'menu':
                    this.renderBridge.renderMenu(ctx);
                    break;
                case 'hub':
                    this.renderBridge.renderHub(ctx);
                    break;
            }
        }
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