/**
 * Game Services Integration
 * Integrates all the new services into the existing game loop
 * This preserves existing functionality while using services where available
 */

// Store original update method for fallback (render is fully replaced by RenderingService)
CyberOpsGame.prototype._originalUpdate = CyberOpsGame.prototype.update;

/**
 * Enhanced update method that integrates services
 */
CyberOpsGame.prototype.update = function() {
    // Call original update first to maintain existing functionality
    if (this._originalUpdate) {
        this._originalUpdate.call(this);
    }

    // If services are available, update them too
    if (this.gameServices) {
        const deltaTime = 16.67; // ~60 FPS

        // Update AI Service
        if (this.gameServices.aiService && this.enemies) {
            // Sync enemies with AI service
            this.enemies.forEach(enemy => {
                if (!enemy._addedToAI) {
                    this.gameServices.aiService.addEnemy(enemy);
                    enemy._addedToAI = true;
                }
            });

            // Let AI service update enemy behaviors
            this.gameServices.aiService.update(deltaTime);
        }

        // Update Projectile Service
        if (this.gameServices.projectileService) {
            // Sync projectiles
            if (this.projectiles && this.projectiles.length > 0) {
                this.gameServices.projectileService.projectiles = this.projectiles;
            }

            // Update projectiles through service
            this.gameServices.projectileService.update(deltaTime, {
                agents: this.agents,
                enemies: this.enemies,
                walls: this.map ? this.map.walls : []
            });

            // Sync back
            this.projectiles = this.gameServices.projectileService.projectiles;
        }

        // Update Animation Service
        if (this.gameServices.animationService) {
            this.gameServices.animationService.update(deltaTime);
        }

        // Update Camera Service (handle shake, follow, etc.)
        if (this.gameServices.cameraService) {
            this.gameServices.cameraService.update(deltaTime);

            // Sync camera position
            if (this._selectedAgent && this.gameServices.cameraService.followEntity) {
                this.gameServices.cameraService.followEntity(this._selectedAgent);
            }
        }

        // Update Map Service fog of war
        if (this.gameServices.mapService && this.agents) {
            const viewerPositions = this.agents
                .filter(agent => agent.health > 0)
                .map(agent => ({
                    x: agent.x,
                    y: agent.y,
                    visionRange: agent.visionRange || 8
                }));

            this.gameServices.mapService.updateFogOfWar(viewerPositions);
        }

        // Update HUD Service - DISABLED to prevent conflicts with old HUD
        // TODO: Remove old HUD system first, then re-enable this
        /*
        if (this.gameServices.hudService) {
            // Only show HUD when in game or certain screens
            const hudScreens = ['game', 'mission', 'combat'];
            const shouldShowHUD = hudScreens.includes(this.screen) ||
                                  hudScreens.includes(this.currentScreen);

            // Show or hide HUD based on current screen
            if (shouldShowHUD && !this.gameServices.hudService.state.visible) {
                this.gameServices.hudService.show();
            } else if (!shouldShowHUD && this.gameServices.hudService.state.visible) {
                this.gameServices.hudService.hide();
            }

            // Only update HUD if it's visible
            if (this.gameServices.hudService.state.visible) {
                // Update agent status
                this.gameServices.hudService.updateAgentStatus(this.agents);

                // Update mission objectives
                if (this.currentObjectives) {
                    this.gameServices.hudService.updateMissionObjectives(this.currentObjectives);
                }

                // Update resources
                this.gameServices.hudService.updateResources({
                    credits: this.credits || 0,
                    research: this.researchPoints || 0,
                    control: this.worldControl || 0
                });
            }
        }
        */

        // Update Input Service
        if (this.gameServices.inputService && !this.gameServices.inputService._initialized) {
            this.gameServices.inputService.initialize(this.canvas, {
                enableTouch: true,
                enableKeyboard: true,
                enableMouse: true
            });
            this.gameServices.inputService._initialized = true;

            // Wire up input events
            this.gameServices.inputService.on('click', (data) => {
                if (this.handleClick) {
                    this.handleClick({
                        clientX: data.x,
                        clientY: data.y
                    });
                }
            });

            this.gameServices.inputService.on('rightclick', (data) => {
                if (this.handleRightClick) {
                    this.handleRightClick({
                        clientX: data.x,
                        clientY: data.y
                    });
                }
            });
        }
    }
};

/**
 * Render method that uses RenderingService
 * The old render implementation has been completely removed
 */
CyberOpsGame.prototype.render = function() {
    // Always use RenderingService (old implementation removed)
    if (this.gameServices && this.gameServices.renderingService) {
        // Initialize rendering service if needed
        if (!this.gameServices.renderingService.canvas) {
            this.gameServices.renderingService.initialize(this.canvas);
        }

        // Build game state for renderer
        const gameState = {
            map: this.map,
            mapService: this.gameServices.mapService,
            mapWidth: this.map ? this.map.width : 100,
            mapHeight: this.map ? this.map.height : 100,
            agents: this.agents,
            enemies: this.enemies,
            npcs: this.npcs,
            projectileService: this.gameServices.projectileService,
            effectsService: this.gameServices.effectsService,
            animationService: this.gameServices.animationService,
            terminals: this.terminals,
            doors: this.doors,
            collectables: this.collectables || this.collectibles,
            extractionPoint: this.extractionPoint,
            extractionEnabled: this.extractionEnabled,
            showMinimap: this.showMinimap,
            mode3D: this.mode3D,
            waypoints: this.waypoints,
            nearInteractable: this.nearInteractable,
            worldToIsometric: this.worldToIsometric.bind(this),
            walls: this.map ? this.map.walls : [],
            renderNPCs: this.renderNPCs ? this.renderNPCs.bind(this) : null,
            gameSpeed: this.gameSpeed,
            showHelp: this.showHotkeyHelp
        };

        const camera = {
            x: this.cameraX || 0,
            y: this.cameraY || 0,
            zoom: this.cameraZoom || 1
        };

        // Use RenderingService for main rendering
        this.gameServices.renderingService.renderFrame(gameState, camera);

        // Render HUD through HUDService - DISABLED to prevent conflicts
        // TODO: Remove old HUD system first, then re-enable this
        /*
        if (this.gameServices.hudService) {
            this.gameServices.hudService.renderCanvasHUD(this.ctx, gameState);
        }
        */
    } else {
        // No fallback - RenderingService is required
        console.error('❌ RenderingService not available!');
    }
};

/**
 * Fire projectile using ProjectileService if available
 */
CyberOpsGame.prototype.fireProjectileEnhanced = function(from, to, options = {}) {
    if (this.gameServices && this.gameServices.projectileService) {
        // Use ProjectileService
        this.gameServices.projectileService.fireProjectile(from, to, options);

        // Sync projectiles
        this.projectiles = this.gameServices.projectileService.projectiles;

        // Play sound through AudioService if available
        if (this.gameServices.audioService) {
            this.gameServices.audioService.playSound(options.soundEffect || 'shoot');
        }
    } else if (this.fireProjectile) {
        // Fall back to original method
        this.fireProjectile(from, to, options);
    }
};

/**
 * Show notification using UIService if available
 */
CyberOpsGame.prototype.showNotificationEnhanced = function(message, type = 'info', options = {}) {
    if (this.gameServices && this.gameServices.uiService) {
        this.gameServices.uiService.showNotification(message, type, options);
    } else {
        // Fallback to console or basic notification
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
};

/**
 * Apply screen shake using RenderingService
 */
CyberOpsGame.prototype.applyScreenShakeEnhanced = function(intensity, duration) {
    if (this.gameServices) {
        // Use both services for comprehensive shake
        if (this.gameServices.renderingService) {
            this.gameServices.renderingService.applyScreenShake(intensity, duration);
        }
        if (this.gameServices.cameraService) {
            this.gameServices.cameraService.shake(intensity, duration);
        }
    } else if (this.applyScreenShake) {
        // Fallback to original
        this.applyScreenShake(intensity, duration);
    }
};

/**
 * Create explosion effect using multiple services
 */
CyberOpsGame.prototype.createExplosionEnhanced = function(x, y, options = {}) {
    if (this.gameServices) {
        // Create visual effect
        if (this.gameServices.effectsService) {
            this.gameServices.effectsService.createEffect('explosion', x, y, options);
        }

        // Add screen shake
        this.applyScreenShakeEnhanced(options.shakeIntensity || 10, options.shakeDuration || 500);

        // Play sound
        if (this.gameServices.audioService) {
            this.gameServices.audioService.playSound('explosion');
        }

        // Show damage text through AnimationService
        if (this.gameServices.animationService && options.damage) {
            this.gameServices.animationService.createFloatingText(
                x, y,
                `-${options.damage}`,
                { color: '#ff0000', duration: 1500 }
            );
        }
    } else if (this.createExplosion) {
        // Fallback to original
        this.createExplosion(x, y, options);
    }
};

/**
 * Add combat log entry using HUDService
 */
CyberOpsGame.prototype.addCombatLogEnhanced = function(message, type = 'info') {
    if (this.gameServices && this.gameServices.hudService) {
        this.gameServices.hudService.addCombatLogEntry(message, type);
    }

    // Also add to EventLogService if available
    if (this.gameServices && this.gameServices.eventLogService) {
        this.gameServices.eventLogService.addEvent({
            type: 'combat',
            subtype: type,
            message: message,
            timestamp: Date.now()
        });
    }
};

/**
 * Initialize services integration
 * Call this after game initialization
 */
CyberOpsGame.prototype.initializeServicesIntegration = function() {
    console.log('🔗 Initializing services integration...');

    // Create alias methods that use services
    this.fireWeapon = this.fireProjectileEnhanced.bind(this);
    this.notify = this.showNotificationEnhanced.bind(this);
    this.shakeScreen = this.applyScreenShakeEnhanced.bind(this);
    this.explode = this.createExplosionEnhanced.bind(this);
    this.logCombat = this.addCombatLogEnhanced.bind(this);

    // RenderingService is always used (old implementation removed)
    this.useRenderingService = true; // Always true now

    // Initialize HUD if service available but keep it hidden
    // DISABLED to prevent conflicts with old HUD
    /*
    if (this.gameServices && this.gameServices.hudService && !this.gameServices.hudService.initialized) {
        this.gameServices.hudService.initialize(this.canvas);
        // Make sure it stays hidden until we're in game
        this.gameServices.hudService.hide();
    }
    */

    console.log('✅ Services integration complete');
};

// Auto-initialize on game start
if (window.game) {
    setTimeout(() => {
        if (window.game.initializeServicesIntegration) {
            window.game.initializeServicesIntegration();
        }
    }, 100);
}

console.log('🔌 Game Services Integration loaded');