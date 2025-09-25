/**
 * GameEngine - Technical layer handling rendering, audio, input
 * This class is responsible for HOW things are displayed/played/captured
 * It does NOT know about game rules, just technical execution
 */

class GameEngine {
    constructor(canvas, audioContext, facade) {
        this.logger = window.Logger ? new window.Logger('GameEngine') : null;

        // Core systems
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioContext = audioContext;
        this.facade = facade;

        // Camera state
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;

        // Rendering constants (from legacy game)
        this.tileWidth = 64;
        this.tileHeight = 32;

        // Rendering state
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();

        // Input state (raw input, not game interpretation)
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        this.keysPressed = new Set();

        // Audio state
        this.audioEnabled = false;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;
        this.currentMusic = null;
        this.soundCache = new Map();

        // 3D system (optional)
        this.threejs = null;
        this.renderer3D = null;
        this.scene3D = null;
        this.camera3D = null;
        this.is3DEnabled = false;

        // Initialize RenderingHelpers for entity rendering
        this.renderingHelpers = new RenderingHelpers(this.tileWidth, this.tileHeight);

        // Initialize UIRenderer for UI overlays
        this.uiRenderer = new UIRenderer();

        // Visual effects
        this.particles = [];
        this.screenShake = { intensity: 0, duration: 0 };

        // Skip input handlers if legacy game already has them
        // They will be synced via GameController
        if (!window.game) {
            this.initializeInputHandlers();
        }

        if (this.logger) this.logger.info('GameEngine initialized');
    }

    /**
     * Initialize input event handlers
     */
    initializeInputHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.mouseDown = true;
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mouseDown = false;
        });

        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keysPressed.add(e.key.toLowerCase());
        });

        window.addEventListener('keyup', (e) => {
            this.keysPressed.delete(e.key.toLowerCase());
        });
    }

    /**
     * Get current input state (for GameFacade to interpret)
     */
    getInputState() {
        return {
            mouse: {
                x: this.mouseX,
                y: this.mouseY,
                down: this.mouseDown,
                worldX: this.screenToWorldX(this.mouseX),
                worldY: this.screenToWorldY(this.mouseY)
            },
            keys: Array.from(this.keysPressed)
        };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorldX(screenX) {
        return (screenX - this.cameraX) / this.zoom;
    }

    screenToWorldY(screenY) {
        return (screenY - this.cameraY) / this.zoom;
    }

    /**
     * Set camera position
     */
    setCamera(x, y, zoom = this.zoom) {
        this.cameraX = x;
        this.cameraY = y;
        this.zoom = zoom;
    }

    /**
     * Update FPS counter - calculates average FPS over 1 second
     * Migrated from game-loop.js
     */
    updateFPS() {
        this.frameCount++;
        const now = Date.now();
        const delta = now - this.lastFpsUpdate;

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // Update legacy game FPS if exists
            if (this.facade && this.facade.legacyGame) {
                this.facade.legacyGame.fps = this.fps;
            }
        }
    }

    /**
     * Start render loop
     */
    startRenderLoop(updateCallback, renderCallback) {
        if (this.logger) this.logger.info('🎮 Starting GameEngine render loop');

        const loop = () => {
            requestAnimationFrame(loop);

            // Calculate FPS
            const now = performance.now();
            const delta = now - this.lastFrameTime;
            this.lastFrameTime = now;
            this.fps = Math.round(1000 / delta);

            // Update game logic
            if (updateCallback) {
                updateCallback(delta);
            }

            // Ensure canvas size is current
            if (this.canvas.width !== window.innerWidth || this.canvas.height !== window.innerHeight) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            }

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Render game content (camera transform applied inside legacy render)
            if (renderCallback) {
                renderCallback(this.ctx);
            }

            // Update FPS display if exists
            if (window.game && window.game.fps !== undefined) {
                window.game.fps = this.fps;
            }

            // Track render loop activity
            if (!this.renderFrameCount) this.renderFrameCount = 0;
            this.renderFrameCount++;
            if (this.renderFrameCount % 600 === 0) {
                if (this.logger) this.logger.debug(`🖼️ Rendering: Frame ${this.renderFrameCount}, FPS: ${this.fps}`);
            }
        };

        loop();
    }

    /**
     * Render all UI overlays using UIRenderer
     */
    renderUIOverlays() {
        const game = this.facade.legacyGame;
        const ctx = this.ctx;
        const canvas = this.canvas;

        // Render FPS counter
        if (this.fps !== undefined) {
            this.uiRenderer.renderFPS(ctx, this.fps, canvas.width, canvas.height);
        }

        // Render hotkey help
        if (game && game.showHotkeyHelp) {
            this.uiRenderer.renderHotkeyHelp(ctx, game.showHotkeyHelp, canvas.width, canvas.height);
        }

        // Render speed indicator
        if (!this.facade.turnBasedMode && this.facade.gameSpeed !== undefined) {
            this.uiRenderer.renderSpeedIndicator(ctx, this.facade.gameSpeed, canvas.width, canvas.height);
        }

        // Render turn-based indicator
        if (this.facade.turnBasedMode && this.facade.currentTurn) {
            const actionPoints = this.facade.actionPoints ? this.facade.actionPoints.get(this.facade.currentTurn) : 0;
            this.uiRenderer.renderTurnBasedIndicator(
                ctx,
                this.facade.turnBasedMode,
                this.facade.currentTurn,
                actionPoints,
                canvas.width,
                canvas.height
            );
        }

        // Render minimap
        const minimapContainer = document.getElementById('minimapContent');
        if (minimapContainer && this.facade.currentMap) {
            this.uiRenderer.renderMinimap(
                this.facade.currentMap,
                this.facade.agents,
                this.facade.enemies,
                minimapContainer,
                this.facade.currentMap.extraction,
                this.facade.extractionEnabled
            );
        }
    }

    /**
     * Render FPS counter - DEPRECATED (use renderUIOverlays)
     */
    renderFPS() {
        if (this.showFPS) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '12px monospace';
            this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
        }
    }

    /**
     * Play a sound effect
     */
    playSFX(soundId, volume = 1.0) {
        if (!this.audioEnabled || !this.audioContext) return;

        const finalVolume = volume * this.sfxVolume;

        // Check cache
        if (this.soundCache.has(soundId)) {
            const buffer = this.soundCache.get(soundId);
            this.playAudioBuffer(buffer, finalVolume);
        } else {
            // Load and cache
            this.loadSound(soundId).then(buffer => {
                this.soundCache.set(soundId, buffer);
                this.playAudioBuffer(buffer, finalVolume);
            });
        }
    }

    /**
     * Play audio buffer
     */
    playAudioBuffer(buffer, volume) {
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = volume;

        source.start(0);
    }

    /**
     * Load sound file
     */
    async loadSound(soundId) {
        // This would load from actual files
        // For now, return empty buffer
        return this.audioContext.createBuffer(1, 1, 22050);
    }

    /**
     * Play background music
     */
    playMusic(musicId, volume = 1.0, loop = true) {
        if (!this.audioEnabled) return;

        // Stop current music
        if (this.currentMusic) {
            this.currentMusic.pause();
        }

        // Create new audio element
        const audio = new Audio(`music/${musicId}.mp3`);
        audio.volume = volume * this.musicVolume;
        audio.loop = loop;
        audio.play().catch(e => {
            if (this.logger) this.logger.warn('Music playback failed:', e);
        });

        this.currentMusic = audio;
    }

    /**
     * Stop music
     */
    stopMusic() {
        if (this.currentMusic) {
            this.currentMusic.pause();
            this.currentMusic = null;
        }
    }

    /**
     * Add screen shake effect
     */
    addScreenShake(intensity, duration) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
    }

    /**
     * Initialize 3D rendering (if Three.js available)
     */
    init3D(container) {
        if (!window.THREE) {
            if (this.logger) this.logger.warn('Three.js not loaded, 3D disabled');
            return false;
        }

        // Create renderer
        this.renderer3D = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer3D.setSize(window.innerWidth, window.innerHeight);
        this.renderer3D.shadowMap.enabled = true;
        container.appendChild(this.renderer3D.domElement);

        // Create scene
        this.scene3D = new THREE.Scene();
        this.scene3D.fog = new THREE.Fog(0x000033, 10, 100);

        // Create camera
        this.camera3D = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.is3DEnabled = true;
        if (this.logger) this.logger.info('3D rendering initialized');
        return true;
    }

    /**
     * Render 3D scene
     */
    render3D() {
        if (!this.is3DEnabled || !this.renderer3D) return;
        this.renderer3D.render(this.scene3D, this.camera3D);
    }

    /**
     * World to isometric conversion (needed for rendering)
     */
    worldToIsometric(x, y) {
        const isoX = (x - y) * this.tileWidth / 2;
        const isoY = (x + y) * this.tileHeight / 2;
        return { x: isoX, y: isoY };
    }

    /**
     * Initialize 2D background effects
     */
    init2DBackgroundEffects() {
        // Initialize background particles for 2D mode
        this.bgParticles2D = [];
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            this.bgParticles2D.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff',
                opacity: Math.random() * 0.5 + 0.3
            });
        }
    }

    /**
     * Render 2D background effects
     */
    render2DBackgroundEffects() {
        const ctx = this.ctx;

        // Initialize particles if not already done
        if (!this.bgParticles2D) {
            this.init2DBackgroundEffects();
        }

        // Draw grid pattern with parallax effect
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 0.5;

        const gridSize = 50;
        const parallaxFactor = 0.3;
        const offsetX = (this.cameraX * parallaxFactor) % gridSize;
        const offsetY = (this.cameraY * parallaxFactor) % gridSize;

        // Draw vertical lines
        for (let x = offsetX - gridSize; x < this.canvas.width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = offsetY - gridSize; y < this.canvas.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw and update particles with parallax
        const particleParallax = 0.5;

        this.bgParticles2D.forEach(particle => {
            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around screen edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Draw particle with parallax offset
            const drawX = particle.x + (this.cameraX * particleParallax);
            const drawY = particle.y + (this.cameraY * particleParallax);

            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;

            ctx.beginPath();
            ctx.arc(drawX, drawY, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw corner glows
        const time = Date.now() * 0.001;
        const corners = [
            { x: 0, y: 0 },
            { x: this.canvas.width, y: 0 },
            { x: 0, y: this.canvas.height },
            { x: this.canvas.width, y: this.canvas.height }
        ];

        corners.forEach((corner, index) => {
            const opacity = 0.1 + Math.sin(time * 2 + index) * 0.05;
            const size = 150 + Math.sin(time * 3 + index) * 30;

            ctx.save();
            ctx.globalAlpha = opacity;

            const gradient = ctx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, size);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(0.5, '#00ffff40');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(corner.x - size, corner.y - size, size * 2, size * 2);
            ctx.restore();
        });
    }

    /**
     * Main render method - FULLY migrated from game-rendering.js (407 lines)
     */
    render() {
        const ctx = this.ctx;
        const game = this.facade.legacyGame;

        // Check if we should render in 3D mode instead
        if (this.facade.is3DMode && game.render3D) {
            game.render3D();
            return;
        }

        // Fill background with dark color
        ctx.fillStyle = '#0a0e1a';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render background effects first (before camera transform)
        this.render2DBackgroundEffects();

        ctx.save();

        // Apply screen shake effect from visual effects system
        let shakeX = 0, shakeY = 0;
        if (game.getScreenShakeOffset) {
            const shakeOffset = game.getScreenShakeOffset();
            shakeX = shakeOffset.x;
            shakeY = shakeOffset.y;
        }

        ctx.translate(this.cameraX + shakeX, this.cameraY + shakeY);
        ctx.scale(this.zoom, this.zoom);

        // Render squad selection effect
        if (this.facade.squadSelectEffect && this.facade.squadSelectEffect.active) {
            const elapsed = Date.now() - this.facade.squadSelectEffect.startTime;
            if (elapsed < this.facade.squadSelectEffect.duration) {
                const progress = elapsed / this.facade.squadSelectEffect.duration;
                const alpha = (1 - progress) * 0.5;

                ctx.save();
                ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.restore();
            } else {
                this.facade.squadSelectEffect.active = false;
            }
        }

        // Render map and all its elements
        if (this.facade.currentMap) {
            this.renderMap();
            this.renderFogOfWar();
            this.renderMapElements();
        }

        // Render entities
        this.renderEnemies();
        this.renderNPCs();
        this.renderAgents();

        // Render effects
        this.renderProjectiles();
        this.renderEffects();

        // Render additional visual elements
        if (game.renderParticles) {
            game.renderParticles(ctx);
        }

        if (game.drawTeamModeIndicators) {
            game.drawTeamModeIndicators(ctx);
        }

        ctx.restore();

        // Render overlays (after restoring context)
        if (this.facade.turnBasedMode && game.renderTurnBasedOverlay) {
            game.renderTurnBasedOverlay();
        }

        if (game.renderScreenFlash) {
            game.renderScreenFlash(ctx);
        }

        // Render UI elements using UIRenderer
        this.renderUIOverlays();
    }

    /**
     * Render the map tiles
     */
    renderMap() {
        const ctx = this.ctx;
        const map = this.facade.currentMap;

        // Safety check for map tiles
        if (!map || !map.tiles || map.tiles.length === 0) {
            if (this.logger) this.logger.error('❌ Map tiles not initialized in renderMap!');
            return;
        }

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (!map.tiles[y]) {
                    if (this.logger) this.logger.error(`❌ Map tiles row ${y} is undefined!`);
                    continue;
                }
                const tile = map.tiles[y][x];
                const isoPos = this.worldToIsometric(x, y);

                ctx.save();
                ctx.translate(isoPos.x, isoPos.y);

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.tileWidth / 2, this.tileHeight / 2);
                ctx.lineTo(0, this.tileHeight);
                ctx.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
                ctx.closePath();

                if (tile === 0) {
                    // Walkable floor - MUCH brighter when fog is disabled
                    ctx.fillStyle = this.facade.fogEnabled ? '#1a1a2e' : '#6a8ace';
                    ctx.fill();
                    ctx.strokeStyle = this.facade.fogEnabled ? '#16213e' : '#80a0ff';

                    // Add stronger glow when fog is disabled
                    if (!this.facade.fogEnabled) {
                        ctx.shadowColor = '#8888ff';
                        ctx.shadowBlur = 4;
                    }
                } else {
                    // Wall - also MUCH brighter when fog is disabled
                    ctx.fillStyle = this.facade.fogEnabled ? '#0f0f1e' : '#4a4a8e';
                    ctx.fill();
                    ctx.strokeStyle = this.facade.fogEnabled ? '#2a2a3e' : '#6060a0';
                    ctx.fillStyle = this.facade.fogEnabled ? '#1f1f3e' : '#5555aa';
                    ctx.fillRect(-this.tileWidth / 2, -20, this.tileWidth, 20);

                    // Add stronger glow when fog is disabled
                    if (!this.facade.fogEnabled) {
                        ctx.shadowColor = '#aaaaff';
                        ctx.shadowBlur = 5;
                    }
                }

                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                ctx.restore();
            }
        }
    }

    /**
     * Render fog of war overlay
     */
    renderFogOfWar() {
        if (!this.facade.fogOfWar || !this.facade.fogEnabled) {
            return; // Skip rendering when fog is disabled
        }

        const ctx = this.ctx;
        const map = this.facade.currentMap;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const fogState = this.facade.fogOfWar[y][x];

                if (fogState === 0) {
                    // Unexplored - fully dark (black)
                    const isoPos = this.worldToIsometric(x + 0.5, y + 0.5);
                    ctx.save();
                    ctx.translate(isoPos.x, isoPos.y);
                    ctx.fillStyle = 'rgba(0, 0, 0, 1)';  // Completely black
                    ctx.fillRect(-this.tileWidth/2, -this.tileHeight, this.tileWidth, this.tileHeight * 2);
                    ctx.restore();
                } else if (fogState === 1) {
                    // Explored but not visible - very light blue tint for visibility
                    const isoPos = this.worldToIsometric(x + 0.5, y + 0.5);
                    ctx.save();
                    ctx.translate(isoPos.x, isoPos.y);
                    ctx.fillStyle = 'rgba(10, 20, 40, 0.15)';  // Very transparent dark blue - only 15% opacity
                    ctx.fillRect(-this.tileWidth/2, -this.tileHeight, this.tileWidth, this.tileHeight * 2);
                    ctx.restore();
                }
                // fogState === 2 is fully visible, no overlay needed
            }
        }
    }

    /**
     * Render all map elements (terminals, doors, collectables, etc.)
     */
    renderMapElements() {
        const map = this.facade.currentMap;
        const game = this.facade.legacyGame;

        if (!map) return;

        // Render cover
        if (map.cover) {
            map.cover.forEach(cover => {
                if (this.shouldRenderInFog(cover.x, cover.y)) {
                    this.renderingHelpers.renderCover(cover.x, cover.y, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }

        // Render terminals
        if (map.terminals) {
            map.terminals.forEach(terminal => {
                if (this.shouldRenderInFog(terminal.x, terminal.y)) {
                    this.renderingHelpers.renderTerminal(terminal.x, terminal.y, terminal.hacked, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }

        // Render doors
        if (map.doors) {
            map.doors.forEach(door => {
                if (this.shouldRenderInFog(door.x, door.y)) {
                    this.renderingHelpers.renderDoor(door.x, door.y, door.locked, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }

        // Render collectables
        if (map.collectables) {
            map.collectables.forEach(item => {
                if (!item.collected) {
                    // Check if quest is required and active
                    if (item.questRequired && item.hidden) {
                        const missionQuestActive = this.facade.activeQuests && this.facade.activeQuests[item.questRequired];
                        const npcQuestActive = this.facade.npcActiveQuests && this.facade.npcActiveQuests.some(q => q.id === item.questRequired);
                        const questActive = missionQuestActive || npcQuestActive;
                        if (!questActive) return;
                    }

                    if (this.shouldRenderInFog(item.x, item.y)) {
                        const displaySprite = item.sprite || item.type;
                        this.renderingHelpers.renderCollectable(item.x, item.y, displaySprite, this.ctx, (x, y) => this.worldToIsometric(x, y));
                    }
                }
            });
        }

        // Render extraction point
        if (map.extraction && this.shouldRenderInFog(map.extraction.x, map.extraction.y)) {
            // SINGLE SOURCE OF TRUTH: Facade's getter always reads from MissionService
            const extractionEnabled = this.facade.extractionEnabled || false;
            this.renderingHelpers.renderExtractionPoint(map.extraction.x, map.extraction.y, extractionEnabled, this.ctx, (x, y) => this.worldToIsometric(x, y));
        }

        // Delegate other map elements to legacy game for now
        if (map.items) {
            map.items.forEach(item => {
                if (this.shouldRenderInFog(item.x, item.y)) {
                    if (item.type === 'marker') {
                        this.renderingHelpers.renderMarker(item.x, item.y, item.sprite || '📍', item.name, this.ctx, (x, y) => this.worldToIsometric(x, y));
                    }
                }
            });
        }

        if (map.explosiveTargets) {
            map.explosiveTargets.forEach(target => {
                if (this.shouldRenderInFog(target.x, target.y)) {
                    this.renderingHelpers.renderExplosiveTarget(target.x, target.y, target.planted, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }

        if (map.targets) {
            map.targets.forEach(target => {
                if (this.shouldRenderInFog(target.x, target.y)) {
                    this.renderingHelpers.renderAssassinationTarget(target.x, target.y, target.type, target.eliminated, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }

        if (map.gates) {
            map.gates.forEach(gate => {
                if (this.shouldRenderInFog(gate.x, gate.y)) {
                    this.renderingHelpers.renderGate(gate.x, gate.y, gate.breached, this.ctx, (x, y) => this.worldToIsometric(x, y));
                }
            });
        }
    }

    /**
     * Check if a position should be rendered based on fog of war
     */
    shouldRenderInFog(x, y) {
        if (!this.facade.fogEnabled || !this.facade.fogOfWar) {
            return true; // Render everything when fog is disabled
        }

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        if (this.facade.fogOfWar[tileY] && this.facade.fogOfWar[tileY][tileX] === 0) {
            return false; // Don't render in unexplored areas
        }

        return true;
    }

    // Note: renderCover, renderTerminal, and renderDoor methods have been moved to RenderingHelpers
    // These stub methods are kept for backward compatibility if needed



    /**
     * Render enemies
     */
    renderEnemies() {
        this.facade.enemies.forEach(enemy => {
            if (enemy.alive && this.shouldRenderInFog(enemy.x, enemy.y)) {
                this.renderingHelpers.renderEnemy(enemy, this.ctx, (x, y) => this.worldToIsometric(x, y));
            }
        });
    }

    /**
     * Render NPCs
     */
    renderNPCs() {
        const ctx = this.ctx;
        const game = this.facade.legacyGame;

        if (game.renderNPCs) {
            game.renderNPCs(ctx);
        }

        if (game.renderQuestHUD) {
            game.renderQuestHUD(ctx);
        }
    }

    /**
     * Render agents with paths and waypoints
     */
    renderAgents() {
        const ctx = this.ctx;
        const game = this.facade.legacyGame;

        this.facade.agents.forEach(agent => {
            if (agent.alive) {
                // Render path if exists (for debugging)
                if (agent.selected && this.facade.showPaths) {
                    // Render A* pathfinding path
                    if (agent.path) {
                        this.renderingHelpers.renderPath(agent.path, agent.currentPathIndex, agent.color, this.ctx, (x, y) => this.worldToIsometric(x, y));
                    }

                    // Render shift-click waypoints
                    if (this.facade.agentWaypoints && this.facade.agentWaypoints[agent.id] &&
                        this.facade.agentWaypoints[agent.id].length > 0) {
                        this.renderWaypoints(agent, this.facade.agentWaypoints[agent.id]);
                    }
                }

                this.renderingHelpers.renderAgent(agent, this.ctx, (x, y) => this.worldToIsometric(x, y));
            }
        });

        // Render destination indicators
        this.renderDestinationIndicators();
    }

    /**
     * Render agent path for debugging
     */
    renderPath(path, currentIndex = 0, agentColor = '#00ff00') {
        if (!path || path.length < 2) return;

        const ctx = this.ctx;
        ctx.save();

        // Parse the agent's color and create a semi-transparent version
        const color = agentColor || '#00ff00';

        // Draw path line using agent's color
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const pos = this.worldToIsometric(path[i].x, path[i].y);
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        }
        ctx.stroke();

        // Draw waypoints
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        for (let i = 0; i < path.length; i++) {
            const pos = this.worldToIsometric(path[i].x, path[i].y);

            if (i < currentIndex) {
                // Visited waypoints - gray
                ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            } else if (i === currentIndex) {
                // Current waypoint - bright agent color
                ctx.fillStyle = color;
            } else {
                // Future waypoints - semi-transparent agent color
                ctx.fillStyle = color + '88';
            }

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render waypoints for an agent
     */
    renderWaypoints(agent, waypoints) {
        const ctx = this.ctx;

        // Debug: Log once per second
        if (!this.lastWaypointLog || Date.now() - this.lastWaypointLog > 1000) {
            if (this.logger) this.logger.debug(`📍 P pressed - Showing ${waypoints.length} waypoints for ${agent.name}`);
            this.lastWaypointLog = Date.now();
        }

        ctx.save();

        // Draw waypoint path - match selection circle cyan style
        ctx.strokeStyle = '#00ffff'; // Cyan to match selection
        ctx.lineWidth = 1.5; // Thinner line for subtlety
        ctx.setLineDash([5, 5]); // Keep dashed pattern
        ctx.globalAlpha = 0.3; // More subtle transparency

        ctx.beginPath();
        const agentScreen = this.worldToIsometric(agent.x, agent.y);
        ctx.moveTo(agentScreen.x, agentScreen.y);

        // Draw lines to each waypoint
        waypoints.forEach((wp, index) => {
            const wpScreen = this.worldToIsometric(wp.x, wp.y);
            ctx.lineTo(wpScreen.x, wpScreen.y);
        });
        ctx.stroke();

        // Draw waypoint markers - match selection circle style
        waypoints.forEach((wp, index) => {
            const wpScreen = this.worldToIsometric(wp.x, wp.y);

            // Reset line dash for circles
            ctx.setLineDash([]);

            // Match selection circle style - cyan with transparency
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.3; // Subtle transparency like selection circles

            // Draw circle outline only, no fill - matches selection style
            ctx.beginPath();
            ctx.arc(wpScreen.x, wpScreen.y, 10, 0, Math.PI * 2);
            ctx.stroke();

            // Inner smaller circle for emphasis
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(wpScreen.x, wpScreen.y, 5, 0, Math.PI * 2);
            ctx.stroke();

            // Waypoint number - subtle cyan text
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#00ffff';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${index + 1}`, wpScreen.x, wpScreen.y);

            // Show coordinates below waypoint
            if (this.facade.showPaths || this.facade.usePathfinding || this.facade.debugMode) {
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = '#00ffff';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(`[${Math.round(wp.x)},${Math.round(wp.y)}]`, wpScreen.x, wpScreen.y + 15);
            }
        });

        ctx.restore();
    }

    /**
     * Render destination indicators
     */
    renderDestinationIndicators() {
        if (!this.facade.destinationIndicators || this.facade.destinationIndicators.length === 0) {
            return;
        }

        const ctx = this.ctx;

        this.facade.destinationIndicators.forEach((indicator, index) => {
            const elapsed = Date.now() - indicator.timestamp;
            if (elapsed < 5000) { // Show for 5 seconds
                const alpha = Math.max(0.3, 1 - elapsed / 5000); // Keep minimum alpha of 0.3
                ctx.save();
                ctx.globalAlpha = alpha;

                // Draw destination marker - match waypoint cyan style
                const screenPos = this.worldToIsometric(indicator.x, indicator.y);

                // Use cyan color to match waypoints
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 2;

                // Outer circle with subtle pulse
                const pulseSize = 15 + Math.sin(elapsed * 0.005) * 3;
                ctx.globalAlpha = alpha * 0.4; // More transparent
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, pulseSize, 0, Math.PI * 2);
                ctx.stroke();

                // Inner circle
                ctx.globalAlpha = alpha * 0.3;
                ctx.beginPath();
                ctx.arc(screenPos.x, screenPos.y, 8, 0, Math.PI * 2);
                ctx.stroke();

                // Simple crosshair - subtle cyan
                ctx.globalAlpha = alpha * 0.5;
                ctx.lineWidth = 1;
                ctx.beginPath();
                // Horizontal line
                ctx.moveTo(screenPos.x - 12, screenPos.y);
                ctx.lineTo(screenPos.x - 4, screenPos.y);
                ctx.moveTo(screenPos.x + 4, screenPos.y);
                ctx.lineTo(screenPos.x + 12, screenPos.y);
                // Vertical line
                ctx.moveTo(screenPos.x, screenPos.y - 12);
                ctx.lineTo(screenPos.x, screenPos.y - 4);
                ctx.moveTo(screenPos.x, screenPos.y + 4);
                ctx.lineTo(screenPos.x, screenPos.y + 12);
                ctx.stroke();

                // Show coordinates near destination indicator
                if (this.facade.showPaths || this.facade.usePathfinding || this.facade.debugMode) {
                    ctx.globalAlpha = alpha * 0.7;
                    ctx.fillStyle = '#00ffff';
                    ctx.font = '9px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    ctx.fillText(`[${Math.round(indicator.x)},${Math.round(indicator.y)}]`, screenPos.x, screenPos.y + 20);
                }

                ctx.restore();
            }
        });

        // Clean up old indicators
        this.facade.destinationIndicators = this.facade.destinationIndicators.filter(
            ind => Date.now() - ind.timestamp < 5000
        );
    }

    /**
     * Render projectiles
     */
    renderProjectiles() {
        this.facade.projectiles.forEach(proj => {
            this.renderingHelpers.renderProjectile(proj, this.ctx, (x, y) => this.worldToIsometric(x, y));
        });
    }

    /**
     * Render visual effects
     */
    renderEffects() {
        const ctx = this.ctx;
        const game = this.facade.legacyGame;

        this.facade.effects.forEach(effect => {
            this.renderingHelpers.renderEffect(effect, this.ctx, (x, y) => this.worldToIsometric(x, y));
        });
    }


    /**
     * Clean up resources
     */
    dispose() {
        // Stop music
        this.stopMusic();

        // Clear audio cache
        this.soundCache.clear();

        // Dispose 3D resources
        if (this.renderer3D) {
            this.renderer3D.dispose();
        }

        if (this.logger) this.logger.info('GameEngine disposed');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.GameEngine = GameEngine;
}