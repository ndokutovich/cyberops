/**
 * GameEngine - Technical layer handling rendering, audio, input
 * This class is responsible for HOW things are displayed/played/captured
 * It does NOT know about game rules, just technical execution
 */

class GameEngine {
    constructor(canvas, audioContext) {
        this.logger = window.Logger ? new window.Logger('GameEngine') : null;

        // Core systems
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audioContext = audioContext;

        // Camera state
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;

        // Rendering state
        this.lastFrameTime = performance.now();
        this.fps = 60;
        this.frameCount = 0;

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

        // Visual effects
        this.particles = [];
        this.screenShake = { intensity: 0, duration: 0 };

        this.initializeInputHandlers();

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
     * Start render loop
     */
    startRenderLoop(updateCallback, renderCallback) {
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

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Apply camera transform
            this.ctx.save();
            this.ctx.translate(this.cameraX, this.cameraY);
            this.ctx.scale(this.zoom, this.zoom);

            // Apply screen shake if active
            if (this.screenShake.duration > 0) {
                const shake = this.screenShake.intensity;
                this.ctx.translate(
                    (Math.random() - 0.5) * shake,
                    (Math.random() - 0.5) * shake
                );
                this.screenShake.duration -= delta;
            }

            // Render game content
            if (renderCallback) {
                renderCallback(this.ctx);
            }

            this.ctx.restore();

            // Render UI (after restore, so it's not affected by camera)
            this.renderFPS();
        };

        loop();
    }

    /**
     * Render FPS counter
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