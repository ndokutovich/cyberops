/**
 * RenderingService - Centralized rendering management for all visual output
 * Handles canvas rendering, coordinate transforms, and visual effects
 */
class RenderingService {
    constructor() {
        // Canvas and context
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;

        // Rendering configuration
        this.config = {
            tileWidth: 64,
            tileHeight: 32,
            wallHeight: 20,
            enableFog: true,
            enableParticles: true,
            enableShadows: true,
            enableGlow: true,
            maxParticles: 100,
            renderScale: 1
        };

        // Visual state
        this.screenShake = {
            active: false,
            intensity: 0,
            duration: 0,
            elapsed: 0
        };

        this.screenFlash = {
            active: false,
            color: '#ffffff',
            opacity: 0,
            duration: 0,
            elapsed: 0
        };

        // Background effects
        this.backgroundParticles = [];
        this.backgroundGrid = {
            offset: { x: 0, y: 0 },
            cellSize: 50,
            color: '#0a1f1f',
            opacity: 0.3
        };

        // Render layers
        this.layers = {
            background: 0,
            map: 1,
            objects: 2,
            entities: 3,
            effects: 4,
            ui: 5
        };

        // Performance tracking
        this.stats = {
            fps: 0,
            frameTime: 0,
            lastFrameTime: 0,
            drawCalls: 0,
            particlesRendered: 0,
            tilesRendered: 0
        };

        // Debug flags
        this.debug = {
            showFPS: false,
            showVisionCones: false,
            showPaths: false,
            showCoordinates: false,
            showHitboxes: false,
            showPerformance: false
        };

        console.log('🎨 RenderingService initialized');
    }

    /**
     * Initialize rendering service with canvas
     */
    initialize(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Create offscreen canvas for performance
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = canvas.width;
        this.offscreenCanvas.height = canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // Set rendering defaults
        this.ctx.imageSmoothingEnabled = false;
        this.offscreenCtx.imageSmoothingEnabled = false;

        // Initialize background effects
        this.initializeBackgroundEffects();

        return this;
    }

    /**
     * Initialize background particle effects
     */
    initializeBackgroundEffects() {
        // Create cyberpunk particles
        for (let i = 0; i < 50; i++) {
            this.backgroundParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 0.5 + 0.1,
                opacity: Math.random() * 0.5 + 0.2,
                color: Math.random() > 0.5 ? '#00ffcc' : '#ff00ff'
            });
        }
    }

    /**
     * Main render frame
     */
    renderFrame(gameState, camera) {
        if (!this.ctx || !this.canvas) return;

        const startTime = performance.now();
        this.stats.drawCalls = 0;

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply screen shake if active
        const shakeOffset = this.getScreenShake();

        // Save context state
        this.ctx.save();

        // Apply camera transform with shake
        this.ctx.translate(
            camera.x + shakeOffset.x,
            camera.y + shakeOffset.y
        );

        // Apply zoom
        if (camera.zoom !== 1) {
            this.ctx.scale(camera.zoom, camera.zoom);
        }

        // Render layers in order
        this.renderBackground(gameState);
        this.renderMap(gameState);
        this.renderObjects(gameState);
        this.renderEntities(gameState);
        this.renderEffects(gameState);

        // Restore context state (removes camera transform)
        this.ctx.restore();

        // Render UI layer (no camera transform)
        this.renderUI(gameState);

        // Render screen flash
        if (this.screenFlash.active) {
            this.renderScreenFlash();
        }

        // Debug rendering
        if (this.debug.showFPS) {
            this.renderFPS();
        }

        // Update performance stats
        this.updateStats(startTime);
    }

    /**
     * Render background layer
     */
    renderBackground(gameState) {
        // Parallax grid
        if (this.config.enableParticles) {
            this.renderParallaxGrid();
            this.renderBackgroundParticles();
        }

        // Cyberpunk glow corners
        this.renderCornerGlows();
    }

    /**
     * Render parallax grid effect
     */
    renderParallaxGrid() {
        const ctx = this.ctx;
        const gridSize = this.backgroundGrid.cellSize;
        const offsetX = this.backgroundGrid.offset.x % gridSize;
        const offsetY = this.backgroundGrid.offset.y % gridSize;

        ctx.save();
        ctx.strokeStyle = this.backgroundGrid.color;
        ctx.globalAlpha = this.backgroundGrid.opacity;
        ctx.lineWidth = 1;

        // Draw grid lines
        for (let x = -gridSize; x < this.canvas.width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + offsetX, 0);
            ctx.lineTo(x + offsetX, this.canvas.height);
            ctx.stroke();
        }

        for (let y = -gridSize; y < this.canvas.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y + offsetY);
            ctx.lineTo(this.canvas.width, y + offsetY);
            ctx.stroke();
        }

        ctx.restore();
        this.stats.drawCalls += 2;
    }

    /**
     * Render background particles
     */
    renderBackgroundParticles() {
        const ctx = this.ctx;
        const time = Date.now() * 0.001;

        ctx.save();
        this.backgroundParticles.forEach((particle, index) => {
            // Update particle position
            particle.y -= particle.speed;
            if (particle.y < -10) {
                particle.y = this.canvas.height + 10;
                particle.x = Math.random() * this.canvas.width;
            }

            // Pulse effect
            const pulse = Math.sin(time * 2 + index) * 0.2 + 0.8;

            // Draw particle
            ctx.fillStyle = particle.color;
            ctx.globalAlpha = particle.opacity * pulse;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        this.stats.particlesRendered = this.backgroundParticles.length;
        this.stats.drawCalls++;
    }

    /**
     * Render corner glow effects
     */
    renderCornerGlows() {
        const ctx = this.ctx;
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time) * 0.1 + 0.9;

        ctx.save();
        ctx.globalAlpha = 0.1 * pulse;

        // Top-left glow
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 200);
        glowGradient.addColorStop(0, '#00ffcc');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, 200, 200);

        // Bottom-right glow
        const glowGradient2 = ctx.createRadialGradient(
            this.canvas.width, this.canvas.height, 0,
            this.canvas.width, this.canvas.height, 200
        );
        glowGradient2.addColorStop(0, '#ff00ff');
        glowGradient2.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient2;
        ctx.fillRect(this.canvas.width - 200, this.canvas.height - 200, 200, 200);

        ctx.restore();
        this.stats.drawCalls += 2;
    }

    /**
     * Render map tiles
     */
    renderMap(gameState) {
        if (!gameState.map || !gameState.mapService) return;

        const mapService = gameState.mapService;
        const visibleTiles = this.getVisibleTiles(gameState.camera, mapService);

        visibleTiles.forEach(({ x, y }) => {
            const tile = mapService.getTileAt(x, y);
            if (tile) {
                this.renderTile(x, y, tile, mapService);
            }
        });

        this.stats.tilesRendered = visibleTiles.length;
    }

    /**
     * Render a single tile
     */
    renderTile(x, y, tile, mapService) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(x, y);

        // Check fog of war
        const fogState = mapService.getFogState ? mapService.getFogState(x, y) : 'visible';

        ctx.save();

        // Apply fog coloring
        switch (fogState) {
            case 'unexplored':
                ctx.fillStyle = '#000';
                break;
            case 'explored':
                ctx.fillStyle = '#112';
                ctx.globalAlpha = 0.7;
                break;
            default:
                ctx.fillStyle = tile.type === '#' ? '#223' : '#112';
        }

        // Draw tile
        ctx.beginPath();
        ctx.moveTo(iso.x, iso.y);
        ctx.lineTo(iso.x + this.config.tileWidth / 2, iso.y + this.config.tileHeight / 2);
        ctx.lineTo(iso.x, iso.y + this.config.tileHeight);
        ctx.lineTo(iso.x - this.config.tileWidth / 2, iso.y + this.config.tileHeight / 2);
        ctx.closePath();
        ctx.fill();

        // Draw wall height if wall
        if (tile.type === '#') {
            ctx.fillStyle = '#334';
            ctx.fillRect(
                iso.x - this.config.tileWidth / 2,
                iso.y - this.config.wallHeight,
                this.config.tileWidth,
                this.config.wallHeight
            );
        }

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render game objects (terminals, doors, items, etc.)
     */
    renderObjects(gameState) {
        // Render terminals
        if (gameState.terminals) {
            gameState.terminals.forEach(terminal =>
                this.renderTerminal(terminal, gameState)
            );
        }

        // Render doors
        if (gameState.doors) {
            gameState.doors.forEach(door =>
                this.renderDoor(door, gameState)
            );
        }

        // Render collectables
        if (gameState.collectables) {
            gameState.collectables.forEach(item =>
                this.renderCollectable(item, gameState)
            );
        }

        // Render extraction point
        if (gameState.extractionPoint && gameState.extractionEnabled) {
            this.renderExtractionPoint(gameState.extractionPoint);
        }
    }

    /**
     * Render a terminal
     */
    renderTerminal(terminal, gameState) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(terminal.x, terminal.y);

        ctx.save();
        ctx.fillStyle = terminal.hacked ? '#0f0' : '#0ff';
        ctx.fillRect(iso.x - 10, iso.y - 20, 20, 20);

        // Hacking indicator
        if (terminal.hacking) {
            const progress = terminal.hackProgress || 0;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(iso.x - 12, iso.y - 22, 24, 24);

            ctx.fillStyle = '#0f0';
            ctx.fillRect(iso.x - 10, iso.y + 5, 20 * progress, 3);
        }

        // Terminal ID
        ctx.fillStyle = '#fff';
        ctx.font = '10px monospace';
        ctx.fillText('T', iso.x - 3, iso.y - 5);

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render a door
     */
    renderDoor(door, gameState) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(door.x, door.y);

        ctx.save();

        // Door frame
        ctx.strokeStyle = door.locked ? '#f00' : '#0f0';
        ctx.lineWidth = 3;
        ctx.strokeRect(iso.x - 15, iso.y - 25, 30, 30);

        // Lock indicator
        if (door.locked) {
            ctx.fillStyle = '#f00';
            ctx.beginPath();
            ctx.arc(iso.x, iso.y - 10, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(iso.x - 3, iso.y - 10);
            ctx.lineTo(iso.x + 3, iso.y - 10);
            ctx.stroke();
        }

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render a collectable item
     */
    renderCollectable(item, gameState) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(item.x, item.y);
        const time = Date.now() * 0.001;
        const bob = Math.sin(time * 2) * 3;

        ctx.save();

        // Item glow
        if (this.config.enableGlow) {
            ctx.shadowColor = this.getItemColor(item.type);
            ctx.shadowBlur = 10 + Math.sin(time * 3) * 3;
        }

        // Item sprite
        ctx.fillStyle = this.getItemColor(item.type);
        ctx.fillRect(iso.x - 8, iso.y - 15 + bob, 16, 16);

        // Item icon
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.getItemIcon(item.type), iso.x, iso.y - 5 + bob);

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render extraction point
     */
    renderExtractionPoint(extraction) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(extraction.x, extraction.y);
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * 2) * 0.3 + 0.7;

        ctx.save();

        // Pulsing circle
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 2;
        ctx.globalAlpha = pulse;

        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(iso.x, iso.y, 20 + i * 10, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Exit arrow
        ctx.fillStyle = '#0f0';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(iso.x, iso.y - 10);
        ctx.lineTo(iso.x + 5, iso.y);
        ctx.lineTo(iso.x - 5, iso.y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render entities (agents, enemies, NPCs)
     */
    renderEntities(gameState) {
        // Render enemies
        if (gameState.enemies) {
            gameState.enemies.forEach(enemy =>
                this.renderEnemy(enemy, gameState)
            );
        }

        // Render agents
        if (gameState.agents) {
            gameState.agents.forEach(agent =>
                this.renderAgent(agent, gameState)
            );
        }

        // Render NPCs (delegated to NPC system if exists)
        if (gameState.npcs && gameState.renderNPCs) {
            gameState.renderNPCs();
        }
    }

    /**
     * Render an agent
     */
    renderAgent(agent, gameState) {
        if (!agent || agent.health <= 0) return;

        const ctx = this.ctx;
        const iso = this.worldToIsometric(agent.x, agent.y);

        ctx.save();

        // Selection indicator
        if (agent.selected) {
            ctx.strokeStyle = '#0ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(iso.x, iso.y, 20, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Agent body
        ctx.fillStyle = agent.color || '#00ff00';
        ctx.beginPath();
        ctx.arc(iso.x, iso.y - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Direction indicator
        const angle = agent.facing || 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(iso.x, iso.y - 10);
        ctx.lineTo(
            iso.x + Math.cos(angle) * 12,
            iso.y - 10 + Math.sin(angle) * 12
        );
        ctx.stroke();

        // Health bar
        this.renderHealthBar(iso.x, iso.y - 30, agent.health, agent.maxHealth);

        // Shield if active
        if (agent.shield > 0) {
            this.renderShield(iso.x, iso.y - 10, agent.shield);
        }

        ctx.restore();
        this.stats.drawCalls += 3;
    }

    /**
     * Render an enemy
     */
    renderEnemy(enemy, gameState) {
        if (!enemy || enemy.health <= 0) return;

        const ctx = this.ctx;
        const iso = this.worldToIsometric(enemy.x, enemy.y);

        ctx.save();

        // Alert indicator
        if (enemy.alertLevel > 0) {
            ctx.strokeStyle = enemy.alertLevel > 50 ? '#f00' : '#ff0';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(iso.x, iso.y, 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Enemy body
        ctx.fillStyle = enemy.color || '#ff0000';
        ctx.beginPath();
        ctx.arc(iso.x, iso.y - 10, 7, 0, Math.PI * 2);
        ctx.fill();

        // Type indicator
        if (enemy.type) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(enemy.type[0].toUpperCase(), iso.x, iso.y - 7);
        }

        // Health bar
        this.renderHealthBar(iso.x, iso.y - 25, enemy.health, enemy.maxHealth);

        // Vision cone if debug enabled
        if (this.debug.showVisionCones) {
            this.renderVisionCone(enemy);
        }

        ctx.restore();
        this.stats.drawCalls += 2;
    }

    /**
     * Render health bar
     */
    renderHealthBar(x, y, health, maxHealth) {
        const ctx = this.ctx;
        const width = 30;
        const height = 4;
        const percentage = Math.max(0, Math.min(1, health / maxHealth));

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x - width/2, y, width, height);

        // Health fill
        ctx.fillStyle = percentage > 0.5 ? '#0f0' :
                       percentage > 0.25 ? '#ff0' : '#f00';
        ctx.fillRect(x - width/2, y, width * percentage, height);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - width/2, y, width, height);
    }

    /**
     * Render shield effect
     */
    renderShield(x, y, shieldStrength) {
        const ctx = this.ctx;
        const time = Date.now() * 0.001;
        const pulse = Math.sin(time * 3) * 0.2 + 0.8;

        ctx.save();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = shieldStrength / 100 * pulse;

        // Hexagonal shield
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const px = x + Math.cos(angle) * 15;
            const py = y + Math.sin(angle) * 15;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Render visual effects
     */
    renderEffects(gameState) {
        // Render projectiles
        if (gameState.projectileService) {
            gameState.projectileService.projectiles.forEach(projectile =>
                this.renderProjectile(projectile)
            );
        }

        // Render visual effects
        if (gameState.effectsService) {
            const effects = gameState.effectsService.getRenderData();
            effects.effects.forEach(effect =>
                this.renderEffect(effect)
            );
        }

        // Render animations
        if (gameState.animationService) {
            const animations = gameState.animationService.getRenderData();
            animations.floatingTexts.forEach(text =>
                this.renderFloatingText(text)
            );
        }
    }

    /**
     * Render projectile
     */
    renderProjectile(projectile) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(projectile.x, projectile.y);

        ctx.save();

        // Projectile trail
        ctx.strokeStyle = projectile.color || '#ff0';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(
            iso.x - projectile.vx * 3,
            iso.y - projectile.vy * 3
        );
        ctx.lineTo(iso.x, iso.y);
        ctx.stroke();

        // Projectile head
        ctx.fillStyle = projectile.color || '#ff0';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(iso.x, iso.y, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render visual effect
     */
    renderEffect(effect) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(effect.x, effect.y);

        ctx.save();

        switch (effect.type) {
            case 'explosion':
                this.renderExplosion(iso.x, iso.y, effect);
                break;
            case 'hack':
                this.renderHackEffect(iso.x, iso.y, effect);
                break;
            case 'hit':
                this.renderHitEffect(iso.x, iso.y, effect);
                break;
            case 'shield':
                this.renderShieldEffect(iso.x, iso.y, effect);
                break;
        }

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render explosion effect
     */
    renderExplosion(x, y, effect) {
        const ctx = this.ctx;
        const progress = effect.lifetime / effect.maxLifetime;
        const radius = effect.radius * (1 + progress);
        const opacity = 1 - progress;

        ctx.fillStyle = effect.color || '#ff6600';
        ctx.globalAlpha = opacity * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = effect.color || '#ff6600';
        ctx.lineWidth = 2;
        ctx.globalAlpha = opacity;
        ctx.stroke();
    }

    /**
     * Render hack effect
     */
    renderHackEffect(x, y, effect) {
        const ctx = this.ctx;
        const time = Date.now() * 0.01;

        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.8;

        // Digital pattern
        for (let i = 0; i < 5; i++) {
            const offset = i * 10;
            ctx.beginPath();
            ctx.moveTo(x - 20 + offset, y - 20);
            ctx.lineTo(x - 20 + offset, y + 20);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x - 20, y - 20 + offset);
            ctx.lineTo(x + 20, y - 20 + offset);
            ctx.stroke();
        }

        // Binary text
        ctx.fillStyle = '#0f0';
        ctx.font = '10px monospace';
        ctx.fillText('01', x + Math.sin(time) * 10, y - 25);
        ctx.fillText('10', x - 25, y + Math.cos(time) * 10);
    }

    /**
     * Render floating text
     */
    renderFloatingText(text) {
        const ctx = this.ctx;
        const iso = this.worldToIsometric(text.x, text.y);

        ctx.save();
        ctx.fillStyle = text.color;
        ctx.font = text.font;
        ctx.textAlign = 'center';
        ctx.globalAlpha = text.opacity;
        ctx.fillText(text.text, iso.x, iso.y);
        ctx.restore();

        this.stats.drawCalls++;
    }

    /**
     * Render UI layer
     */
    renderUI(gameState) {
        // Render minimap
        if (gameState.showMinimap) {
            this.renderMinimap(gameState);
        }

        // Render speed indicator
        if (gameState.gameSpeed && gameState.gameSpeed !== 1) {
            this.renderSpeedIndicator(gameState.gameSpeed);
        }

        // Render hotkey help
        if (gameState.showHelp) {
            this.renderHotkeyHelp();
        }
    }

    /**
     * Render minimap
     */
    renderMinimap(gameState) {
        const ctx = this.ctx;
        const size = 150;
        const x = this.canvas.width - size - 10;
        const y = 10;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, size, size);

        // Border
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Scale factor
        const scale = size / Math.max(gameState.mapWidth, gameState.mapHeight);

        // Draw agents
        ctx.fillStyle = '#0f0';
        gameState.agents.forEach(agent => {
            if (agent.health > 0) {
                ctx.fillRect(
                    x + agent.x * scale - 1,
                    y + agent.y * scale - 1,
                    3, 3
                );
            }
        });

        // Draw enemies
        ctx.fillStyle = '#f00';
        gameState.enemies.forEach(enemy => {
            if (enemy.health > 0) {
                ctx.fillRect(
                    x + enemy.x * scale - 1,
                    y + enemy.y * scale - 1,
                    2, 2
                );
            }
        });

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render speed indicator
     */
    renderSpeedIndicator(speed) {
        const ctx = this.ctx;
        const x = this.canvas.width / 2;
        const y = 50;

        ctx.save();
        ctx.fillStyle = speed === 4 ? '#f00' : speed === 2 ? '#ff0' : '#0f0';
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${speed}x SPEED`, x, y);
        ctx.restore();

        this.stats.drawCalls++;
    }

    /**
     * Render hotkey help overlay
     */
    renderHotkeyHelp() {
        const ctx = this.ctx;
        const x = 10;
        let y = 100;

        const hotkeys = [
            'H - Hack/Interact',
            'G - Grenade',
            'S - Shield',
            'Tab - Cycle agents',
            'E - Toggle 3D',
            'Z - Change speed',
            'M - Toggle minimap',
            'F1 - Toggle help'
        ];

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 5, y - 20, 200, hotkeys.length * 20 + 10);

        ctx.fillStyle = '#0ff';
        ctx.font = '14px monospace';
        hotkeys.forEach(key => {
            ctx.fillText(key, x, y);
            y += 20;
        });

        ctx.restore();
        this.stats.drawCalls++;
    }

    /**
     * Render FPS counter
     */
    renderFPS() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = '#0f0';
        ctx.font = '12px monospace';
        ctx.fillText(`FPS: ${Math.round(this.stats.fps)}`, 10, 20);
        ctx.fillText(`Draw calls: ${this.stats.drawCalls}`, 10, 35);
        ctx.restore();
    }

    /**
     * Render screen flash effect
     */
    renderScreenFlash() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = this.screenFlash.color;
        ctx.globalAlpha = this.screenFlash.opacity;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }

    /**
     * Apply screen shake
     */
    applyScreenShake(intensity, duration) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
        this.screenShake.elapsed = 0;
    }

    /**
     * Apply screen flash
     */
    applyScreenFlash(color, opacity, duration) {
        this.screenFlash.active = true;
        this.screenFlash.color = color;
        this.screenFlash.opacity = opacity;
        this.screenFlash.duration = duration;
        this.screenFlash.elapsed = 0;
    }

    /**
     * Get current screen shake offset
     */
    getScreenShake() {
        if (!this.screenShake.active) {
            return { x: 0, y: 0 };
        }

        const progress = this.screenShake.elapsed / this.screenShake.duration;
        if (progress >= 1) {
            this.screenShake.active = false;
            return { x: 0, y: 0 };
        }

        const intensity = this.screenShake.intensity * (1 - progress);
        return {
            x: (Math.random() - 0.5) * intensity * 2,
            y: (Math.random() - 0.5) * intensity * 2
        };
    }

    /**
     * Update rendering service
     */
    update(deltaTime) {
        // Update screen shake
        if (this.screenShake.active) {
            this.screenShake.elapsed += deltaTime;
            if (this.screenShake.elapsed >= this.screenShake.duration) {
                this.screenShake.active = false;
            }
        }

        // Update screen flash
        if (this.screenFlash.active) {
            this.screenFlash.elapsed += deltaTime;
            const progress = this.screenFlash.elapsed / this.screenFlash.duration;
            this.screenFlash.opacity = this.screenFlash.opacity * (1 - progress);

            if (progress >= 1) {
                this.screenFlash.active = false;
            }
        }

        // Update background effects
        this.backgroundGrid.offset.x += 0.1;
        this.backgroundGrid.offset.y += 0.05;
    }

    /**
     * Convert world coordinates to isometric screen coordinates
     */
    worldToIsometric(x, y) {
        return {
            x: (x - y) * this.config.tileWidth / 2,
            y: (x + y) * this.config.tileHeight / 2
        };
    }

    /**
     * Get visible tiles based on camera
     */
    getVisibleTiles(camera, mapService) {
        const tiles = [];
        const buffer = 5; // Extra tiles around viewport

        // Calculate visible bounds
        const startX = Math.max(0, Math.floor(-camera.x / this.config.tileWidth) - buffer);
        const endX = Math.min(mapService.width,
            Math.ceil((this.canvas.width - camera.x) / this.config.tileWidth) + buffer);
        const startY = Math.max(0, Math.floor(-camera.y / this.config.tileHeight) - buffer);
        const endY = Math.min(mapService.height,
            Math.ceil((this.canvas.height - camera.y) / this.config.tileHeight) + buffer);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                tiles.push({ x, y });
            }
        }

        return tiles;
    }

    /**
     * Get item color based on type
     */
    getItemColor(type) {
        const colors = {
            health: '#0f0',
            ammo: '#ff0',
            credits: '#0ff',
            research: '#f0f',
            weapon: '#f80',
            equipment: '#08f'
        };
        return colors[type] || '#fff';
    }

    /**
     * Get item icon based on type
     */
    getItemIcon(type) {
        const icons = {
            health: '+',
            ammo: '⁍',
            credits: '$',
            research: '⚗',
            weapon: '▸',
            equipment: '◆'
        };
        return icons[type] || '?';
    }

    /**
     * Update performance stats
     */
    updateStats(startTime) {
        const frameTime = performance.now() - startTime;
        this.stats.frameTime = frameTime;
        this.stats.fps = 1000 / frameTime;
    }

    /**
     * Resize canvas
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;

        // Reset rendering context settings
        this.ctx.imageSmoothingEnabled = false;
        this.offscreenCtx.imageSmoothingEnabled = false;
    }

    /**
     * Get rendering statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Set debug flag
     */
    setDebug(flag, value) {
        if (this.debug.hasOwnProperty(flag)) {
            this.debug[flag] = value;
        }
    }

    /**
     * Toggle debug flag
     */
    toggleDebug(flag) {
        if (this.debug.hasOwnProperty(flag)) {
            this.debug[flag] = !this.debug[flag];
        }
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.RenderingService = RenderingService;
}