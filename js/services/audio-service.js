/**
 * AudioService - Centralized audio management
 * Unifies music, sound effects, and audio configuration
 */
class AudioService {
    constructor() {
        // Audio context and nodes
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;

        // Volume settings
        this.volumes = {
            master: 1.0,
            music: 0.5,
            sfx: 0.8,
            voice: 0.9
        };

        // Audio state
        this.enabled = false;
        this.initialized = false;

        // Current playing tracks
        this.currentMusic = null;
        this.currentAmbient = null;
        this.activeSounds = new Map(); // Track active sound effects

        // Music state
        this.musicState = 'menu'; // menu, game, combat, stealth, victory, defeat
        this.previousMusicState = null;

        // Audio buffers cache
        this.audioBuffers = new Map();
        this.loadingBuffers = new Map(); // Prevent duplicate loading

        // Fade timers
        this.fadeTimers = new Map();

        // Configuration
        this.config = {
            fadeInTime: 2000,
            fadeOutTime: 1000,
            crossfadeTime: 1500,
            maxSimultaneousSounds: 20
        };

        // Event listeners
        this.listeners = {
            stateChange: [],
            volumeChange: [],
            trackStart: [],
            trackEnd: [],
            error: [],
            any: []
        };
    }

    /**
     * Initialize audio system
     */
    async initialize() {
        if (this.initialized) return true;

        try {
            // Create audio context
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Create gain nodes
            this.masterGain = this.audioContext.createGain();
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();

            // Connect nodes
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            this.masterGain.connect(this.audioContext.destination);

            // Set initial volumes
            this.updateVolumes();

            // Handle context suspension
            if (this.audioContext.state === 'suspended') {
                await this.resumeContext();
            }

            this.initialized = true;
            this.enabled = true;

            console.log('🔊 AudioService initialized');
            return true;

        } catch (error) {
            console.error('❌ Failed to initialize AudioService:', error);
            this.notifyListeners('error', { error, operation: 'initialize' });
            return false;
        }
    }

    /**
     * Resume audio context after user interaction
     */
    async resumeContext() {
        if (!this.audioContext) return false;

        try {
            await this.audioContext.resume();
            this.enabled = true;
            console.log('🔊 Audio context resumed');
            return true;
        } catch (error) {
            console.error('❌ Failed to resume audio context:', error);
            return false;
        }
    }

    /**
     * Play music track
     */
    async playMusic(trackPath, options = {}) {
        if (!this.initialized) await this.initialize();
        if (!this.enabled) return null;

        const {
            loop = true,
            fadeIn = true,
            fadeInTime = this.config.fadeInTime,
            volume = 1.0,
            crossfade = true
        } = options;

        try {
            // Stop current music if crossfading
            if (this.currentMusic && crossfade) {
                this.stopMusic({ fadeOut: true, fadeOutTime: this.config.crossfadeTime });
            } else if (this.currentMusic) {
                this.stopMusic();
            }

            // Load audio buffer
            const buffer = await this.loadAudioBuffer(trackPath);
            if (!buffer) return null;

            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;

            // Create gain for this track
            const trackGain = this.audioContext.createGain();
            trackGain.gain.value = fadeIn ? 0 : volume;

            // Connect nodes
            source.connect(trackGain);
            trackGain.connect(this.musicGain);

            // Apply fade in
            if (fadeIn) {
                trackGain.gain.linearRampToValueAtTime(
                    volume,
                    this.audioContext.currentTime + fadeInTime / 1000
                );
            }

            // Start playback
            source.start(0);

            // Store reference
            this.currentMusic = {
                source,
                gain: trackGain,
                path: trackPath,
                startTime: Date.now()
            };

            // Handle end event
            source.onended = () => {
                if (this.currentMusic && this.currentMusic.source === source) {
                    this.currentMusic = null;
                    this.notifyListeners('trackEnd', { path: trackPath, type: 'music' });
                }
            };

            // Notify listeners
            this.notifyListeners('trackStart', { path: trackPath, type: 'music' });

            console.log(`🎵 Playing music: ${trackPath}`);
            return source;

        } catch (error) {
            console.error(`❌ Failed to play music ${trackPath}:`, error);
            this.notifyListeners('error', { error, operation: 'playMusic', track: trackPath });
            return null;
        }
    }

    /**
     * Stop current music
     */
    stopMusic(options = {}) {
        if (!this.currentMusic) return;

        const {
            fadeOut = false,
            fadeOutTime = this.config.fadeOutTime
        } = options;

        try {
            if (fadeOut && this.currentMusic.gain) {
                // Fade out
                const gain = this.currentMusic.gain;
                const currentVolume = gain.gain.value;

                gain.gain.cancelScheduledValues(this.audioContext.currentTime);
                gain.gain.setValueAtTime(currentVolume, this.audioContext.currentTime);
                gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + fadeOutTime / 1000);

                // Stop after fade
                setTimeout(() => {
                    if (this.currentMusic) {
                        this.currentMusic.source.stop();
                        this.currentMusic = null;
                    }
                }, fadeOutTime);

            } else {
                // Stop immediately
                this.currentMusic.source.stop();
                this.currentMusic = null;
            }

            console.log('🛑 Music stopped');

        } catch (error) {
            console.error('❌ Error stopping music:', error);
        }
    }

    /**
     * Play sound effect
     */
    async playSound(soundPath, options = {}) {
        if (!this.initialized) await this.initialize();
        if (!this.enabled) return null;

        const {
            volume = 1.0,
            pitch = 1.0,
            loop = false,
            position = null, // For 3D sound { x, y, z }
            maxDistance = 1000
        } = options;

        try {
            // Check simultaneous sounds limit
            if (this.activeSounds.size >= this.config.maxSimultaneousSounds) {
                // Remove oldest sound
                const oldest = [...this.activeSounds.entries()][0];
                if (oldest) {
                    oldest[1].source.stop();
                    this.activeSounds.delete(oldest[0]);
                }
            }

            // Load audio buffer
            const buffer = await this.loadAudioBuffer(soundPath);
            if (!buffer) return null;

            // Create source
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.loop = loop;
            source.playbackRate.value = pitch;

            // Create gain
            const gainNode = this.audioContext.createGain();
            gainNode.gain.value = volume;

            // Handle 3D positioning if provided
            let pannerNode = null;
            if (position) {
                pannerNode = this.audioContext.createPanner();
                pannerNode.panningModel = 'HRTF';
                pannerNode.distanceModel = 'inverse';
                pannerNode.refDistance = 1;
                pannerNode.maxDistance = maxDistance;
                pannerNode.rolloffFactor = 1;
                pannerNode.setPosition(position.x || 0, position.y || 0, position.z || 0);

                // Connect: source -> gain -> panner -> sfx
                source.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(this.sfxGain);
            } else {
                // Connect: source -> gain -> sfx
                source.connect(gainNode);
                gainNode.connect(this.sfxGain);
            }

            // Start playback
            source.start(0);

            // Track active sound
            const soundId = Date.now() + Math.random();
            this.activeSounds.set(soundId, {
                source,
                gain: gainNode,
                panner: pannerNode,
                path: soundPath,
                startTime: Date.now()
            });

            // Handle end event
            source.onended = () => {
                this.activeSounds.delete(soundId);
            };

            return source;

        } catch (error) {
            console.error(`❌ Failed to play sound ${soundPath}:`, error);
            return null;
        }
    }

    /**
     * Play procedural sound (generated)
     */
    playProceduralSound(type, options = {}) {
        if (!this.initialized || !this.enabled) return null;

        const {
            volume = 1.0,
            duration = 200,
            frequency = 440
        } = options;

        try {
            const now = this.audioContext.currentTime;

            // Create oscillator
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Configure based on type
            switch (type) {
                case 'shoot':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.value = 100;
                    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    break;

                case 'explosion':
                    oscillator.type = 'sawtooth';
                    oscillator.frequency.value = 50;
                    oscillator.frequency.exponentialRampToValueAtTime(20, now + 0.5);
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    break;

                case 'hit':
                    oscillator.type = 'square';
                    oscillator.frequency.value = frequency;
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
                    break;

                case 'beep':
                    oscillator.type = 'sine';
                    oscillator.frequency.value = frequency;
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.setValueAtTime(volume, now + duration / 2000);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
                    break;

                default:
                    oscillator.type = 'sine';
                    oscillator.frequency.value = frequency;
                    gainNode.gain.setValueAtTime(volume, now);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);
            }

            // Connect and play
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            oscillator.start(now);
            oscillator.stop(now + duration / 1000 + 0.1);

            return oscillator;

        } catch (error) {
            console.error(`❌ Failed to play procedural sound ${type}:`, error);
            return null;
        }
    }

    /**
     * Set music state (triggers appropriate music)
     */
    setMusicState(newState) {
        if (this.musicState === newState) return;

        this.previousMusicState = this.musicState;
        this.musicState = newState;

        // Notify listeners
        this.notifyListeners('stateChange', {
            from: this.previousMusicState,
            to: newState
        });

        console.log(`🎵 Music state: ${this.previousMusicState} → ${newState}`);
    }

    /**
     * Load audio buffer
     */
    async loadAudioBuffer(path) {
        // Check cache
        if (this.audioBuffers.has(path)) {
            return this.audioBuffers.get(path);
        }

        // Check if already loading
        if (this.loadingBuffers.has(path)) {
            return await this.loadingBuffers.get(path);
        }

        // Start loading
        const loadPromise = this.fetchAndDecodeAudio(path);
        this.loadingBuffers.set(path, loadPromise);

        try {
            const buffer = await loadPromise;
            this.audioBuffers.set(path, buffer);
            this.loadingBuffers.delete(path);
            return buffer;
        } catch (error) {
            this.loadingBuffers.delete(path);
            throw error;
        }
    }

    /**
     * Fetch and decode audio file
     */
    async fetchAndDecodeAudio(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            return audioBuffer;

        } catch (error) {
            console.error(`❌ Failed to load audio ${path}:`, error);
            throw error;
        }
    }

    /**
     * Update volumes
     */
    updateVolumes() {
        if (!this.initialized) return;

        this.masterGain.gain.value = this.volumes.master;
        this.musicGain.gain.value = this.volumes.music;
        this.sfxGain.gain.value = this.volumes.sfx;
    }

    /**
     * Set volume
     */
    setVolume(type, value) {
        value = Math.max(0, Math.min(1, value));
        this.volumes[type] = value;
        this.updateVolumes();

        // Notify listeners
        this.notifyListeners('volumeChange', { type, value });

        console.log(`🔊 ${type} volume: ${Math.round(value * 100)}%`);
    }

    /**
     * Get volume
     */
    getVolume(type) {
        return this.volumes[type] || 0;
    }

    /**
     * Stop all sounds
     */
    stopAllSounds() {
        // Stop music
        this.stopMusic();

        // Stop all active sounds
        this.activeSounds.forEach(sound => {
            try {
                sound.source.stop();
            } catch (e) {
                // Ignore if already stopped
            }
        });
        this.activeSounds.clear();

        console.log('🛑 All sounds stopped');
    }

    /**
     * Pause/resume
     */
    setPaused(paused) {
        if (!this.audioContext) return;

        if (paused && this.audioContext.state === 'running') {
            this.audioContext.suspend();
            console.log('⏸️ Audio paused');
        } else if (!paused && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
            console.log('▶️ Audio resumed');
        }
    }

    /**
     * Update 3D listener position
     */
    setListenerPosition(x, y, z) {
        if (!this.audioContext || !this.audioContext.listener) return;

        const listener = this.audioContext.listener;

        // Set position
        if (listener.positionX) {
            listener.positionX.value = x;
            listener.positionY.value = y;
            listener.positionZ.value = z;
        } else if (listener.setPosition) {
            listener.setPosition(x, y, z);
        }
    }

    /**
     * Preload audio files
     */
    async preloadAudio(paths) {
        const promises = paths.map(path => this.loadAudioBuffer(path).catch(e => {
            console.warn(`Failed to preload ${path}:`, e);
            return null;
        }));

        const results = await Promise.all(promises);
        const successCount = results.filter(r => r !== null).length;

        console.log(`📦 Preloaded ${successCount}/${paths.length} audio files`);
        return successCount;
    }

    /**
     * Add event listener
     */
    addListener(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        } else if (eventType === 'any' || eventType === '*') {
            this.listeners.any.push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(eventType, callback) {
        const list = eventType === 'any' || eventType === '*'
            ? this.listeners.any
            : this.listeners[eventType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(eventType, data) {
        // Specific listeners
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in audio listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                console.error('Error in global audio listener:', e);
            }
        });
    }

    /**
     * Get service info
     */
    getInfo() {
        return {
            initialized: this.initialized,
            enabled: this.enabled,
            state: this.musicState,
            volumes: { ...this.volumes },
            activeSounds: this.activeSounds.size,
            cachedBuffers: this.audioBuffers.size,
            hasMusic: !!this.currentMusic
        };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAllSounds();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.audioBuffers.clear();
        this.loadingBuffers.clear();
        this.activeSounds.clear();

        this.initialized = false;
        this.enabled = false;

        console.log('🔇 AudioService destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
}