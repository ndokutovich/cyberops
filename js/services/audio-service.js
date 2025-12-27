/**
 * AudioService - Centralized audio management
 * Single source of truth for all audio: music, sound effects, loading, playback
 *
 * Consolidates:
 * - game-audio.js (core audio)
 * - game-audioloader.js (format detection, loading)
 * - game-music-system.js (mission music)
 * - game-screen-music.js (screen/menu music)
 * - game-music-config.js (configuration - kept separate as data)
 */

class AudioService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('AudioService') : null;

        // Core audio state
        this.audioContext = null;
        this.audioEnabled = false;
        this.masterVolume = 1.0;
        this.musicVolume = 0.7;
        this.sfxVolume = 0.8;

        // Audio format support
        this.audioSupport = { wav: false, mp3: false, ogg: false };
        this.audioFormats = ['.wav', '.mp3', '.ogg'];

        // Caching
        this.audioCache = new Map();
        this.bufferCache = new Map();

        // Screen music state
        this.screenMusic = {
            currentScreen: null,
            currentTrack: null,
            currentConfig: null,
            audioElements: {},
            fadeTimers: []
        };

        // Mission music state
        this.missionMusic = {
            currentTrack: null,
            currentTrackType: null,
            currentPriority: 0,
            fadeTimers: [],
            tracks: {},
            audioPool: [],
            maxAudioElements: 6,
            combatState: false,
            stealthState: false,
            alertState: false,
            config: null
        };

        // Sound effect state
        this.sfxCooldowns = new Map();

        // Configuration (loaded from GAME_MUSIC_CONFIG)
        this.config = null;

        // Splash skip tracking
        this.splashSkipped = false;

        // Keyboard dispatcher reference (for one-time enable)
        this.keyboardDispatcher = null;

        if (this.logger) this.logger.debug('AudioService created');
    }

    /**
     * Initialize the audio service
     */
    initialize(config = null) {
        // Load configuration
        if (config) {
            this.config = config;
        } else if (typeof GAME_MUSIC_CONFIG !== 'undefined') {
            this.config = GAME_MUSIC_CONFIG;
            if (this.logger) this.logger.info('Loaded GAME_MUSIC_CONFIG');
        } else {
            this.config = { screens: {}, global: {}, soundEffects: {} };
            if (this.logger) this.logger.warn('No music configuration found, using defaults');
        }

        // Apply global settings
        if (this.config.global) {
            this.masterVolume = this.config.global.masterVolume ?? 1.0;
            this.musicVolume = this.config.global.musicVolume ?? 0.7;
            this.sfxVolume = this.config.global.sfxVolume ?? 0.8;
        }

        // Detect audio format support
        this.detectAudioSupport();

        // Initialize mission music audio pool
        this.initMissionMusicPool();

        if (this.logger) this.logger.info('AudioService initialized');
    }

    /**
     * Set keyboard dispatcher for one-time audio enable
     */
    setKeyboardDispatcher(dispatcher) {
        this.keyboardDispatcher = dispatcher;
    }

    // ========================================================================
    // CORE AUDIO
    // ========================================================================

    /**
     * Detect browser audio format support
     */
    detectAudioSupport() {
        const audio = document.createElement('audio');
        this.audioSupport = {
            wav: audio.canPlayType('audio/wav') !== '',
            mp3: audio.canPlayType('audio/mpeg') !== '',
            ogg: audio.canPlayType('audio/ogg') !== ''
        };
        if (this.logger) this.logger.debug('Audio format support:', this.audioSupport);
    }

    /**
     * Setup audio interaction handlers for first user interaction
     */
    setupAudioInteraction() {
        const enableAudioOnClick = () => {
            if (!this.audioEnabled) {
                this.enableAudio();
            }
            document.removeEventListener('click', enableAudioOnClick);
            document.removeEventListener('touchstart', enableAudioOnClick);
        };

        document.addEventListener('click', enableAudioOnClick);
        document.addEventListener('touchstart', enableAudioOnClick);

        // Register one-time keyboard handler if available
        if (this.keyboardDispatcher?.registerOneTimeHandler) {
            this.keyboardDispatcher.registerOneTimeHandler(() => {
                if (!this.audioEnabled) this.enableAudio();
            });
        }

        // Check if audio was previously enabled
        if (sessionStorage.getItem('audioEnabled') === 'true') {
            this.enableAudioImmediately();
        }
    }

    /**
     * Enable audio immediately (from session storage)
     */
    enableAudioImmediately() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioEnabled = true;

            if (this.logger) this.logger.debug('Audio enabled from session storage');

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    if (this.logger) this.logger.info('Audio context resumed from session');
                }).catch(() => {
                    if (this.logger) this.logger.warn('Audio resume failed, waiting for interaction');
                    this.setupOneTimeResume();
                });
            }
        } catch (error) {
            if (this.logger) this.logger.warn('Failed to create AudioContext from session:', error);
            this.audioEnabled = false;
        }
    }

    /**
     * Setup one-time resume handler
     */
    setupOneTimeResume() {
        const resumeHandler = () => {
            if (this.audioContext?.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    if (this.logger) this.logger.debug('Audio context resumed on interaction');
                });
            }
            document.removeEventListener('click', resumeHandler);
            document.removeEventListener('touchstart', resumeHandler);
        };

        document.addEventListener('click', resumeHandler);
        document.addEventListener('touchstart', resumeHandler);
    }

    /**
     * Enable audio on first user interaction
     */
    enableAudio() {
        if (this.audioEnabled) {
            if (this.logger) this.logger.debug('Audio already enabled');
            return;
        }

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioEnabled = true;

            sessionStorage.setItem('audioEnabled', 'true');

            if (this.logger) this.logger.info('Audio context created successfully');

            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    if (this.logger) this.logger.debug('Audio context resumed');
                });
            }
        } catch (error) {
            if (this.logger) this.logger.error('Failed to create AudioContext:', error);
            this.audioEnabled = false;
        }
    }

    /**
     * Check if audio is enabled and ready
     */
    isReady() {
        return this.audioEnabled && this.audioContext?.state === 'running';
    }

    // ========================================================================
    // AUDIO LOADING
    // ========================================================================

    /**
     * Get supported formats to try
     */
    getSupportedFormats() {
        const formats = [];
        if (this.audioSupport.wav) formats.push('.wav');
        if (this.audioSupport.mp3) formats.push('.mp3');
        if (this.audioSupport.ogg) formats.push('.ogg');
        return formats;
    }

    /**
     * Load audio file with format fallback
     */
    async loadAudioFile(baseName, baseFolder = '') {
        // Check cache
        if (this.audioCache.has(baseName)) {
            return this.audioCache.get(baseName);
        }

        const formats = this.getSupportedFormats();

        for (const format of formats) {
            const url = baseFolder + baseName + format;
            try {
                const audio = await this.tryLoadAudio(url);
                if (audio) {
                    if (this.logger) this.logger.debug(`Loaded ${baseName}${format}`);
                    this.audioCache.set(baseName, audio);
                    return audio;
                }
            } catch (err) {
                // Try next format
            }
        }

        if (this.logger) this.logger.warn(`Could not load audio: ${baseName}`);
        return null;
    }

    /**
     * Try to load a specific audio URL
     */
    tryLoadAudio(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();

            const onLoad = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
                resolve(audio);
            };

            const onError = () => {
                audio.removeEventListener('canplaythrough', onLoad);
                audio.removeEventListener('error', onError);
                reject(new Error(`Failed to load ${url}`));
            };

            audio.addEventListener('canplaythrough', onLoad, { once: true });
            audio.addEventListener('error', onError, { once: true });

            audio.src = url;
            audio.load();

            // Timeout after 5 seconds
            setTimeout(() => reject(new Error(`Timeout loading ${url}`)), 5000);
        });
    }

    /**
     * Load audio as Web Audio API buffer
     */
    async loadAudioBuffer(baseName, baseFolder = '') {
        if (!this.audioContext) return null;

        const cacheKey = `buffer_${baseName}`;
        if (this.bufferCache.has(cacheKey)) {
            return this.bufferCache.get(cacheKey);
        }

        const formats = this.getSupportedFormats();

        for (const format of formats) {
            const url = baseFolder + baseName + format;
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const arrayBuffer = await response.arrayBuffer();
                    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                    if (this.logger) this.logger.debug(`Loaded buffer: ${baseName}${format}`);
                    this.bufferCache.set(cacheKey, audioBuffer);
                    return audioBuffer;
                }
            } catch (err) {
                // Try next format
            }
        }

        if (this.logger) this.logger.warn(`Could not load audio buffer: ${baseName}`);
        return null;
    }

    /**
     * Play audio buffer through Web Audio API
     */
    playAudioBuffer(buffer, volume = 1.0) {
        if (!this.audioContext || !buffer) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.value = volume * this.sfxVolume * this.masterVolume;

        source.start(0);
        return source;
    }

    /**
     * Preload common sounds
     */
    async preloadSounds(sounds = ['shoot', 'explosion', 'hit', 'hack', 'shield']) {
        if (this.logger) this.logger.debug('Preloading sounds...');

        for (const sound of sounds) {
            if (this.audioContext) {
                await this.loadAudioBuffer(`sfx-${sound}`);
            }
        }

        if (this.logger) this.logger.debug('Sound preloading complete');
    }

    // ========================================================================
    // SOUND EFFECTS
    // ========================================================================

    /**
     * Play a sound effect
     */
    playSound(soundType, volume = 0.5) {
        // Only check audioEnabled - audioContext is only needed for procedural audio
        if (!this.audioEnabled) return;

        // Get sound config
        const category = this.getSoundCategory(soundType);
        const config = this.getSoundEffectConfig(category, soundType);

        if (config) {
            this.playConfiguredSound(config, volume, soundType);
        }
    }

    /**
     * Get sound category
     */
    getSoundCategory(soundType) {
        const categories = {
            'click': 'ui', 'hover': 'ui', 'error': 'ui', 'success': 'ui',
            'shoot': 'combat', 'explosion': 'combat', 'hit': 'combat', 'shield': 'combat',
            'hack': 'interaction', 'door': 'interaction', 'terminal': 'interaction',
            'pickup': 'interaction', 'plant': 'interaction', 'type': 'interaction',
            'footstep': 'movement', 'move': 'movement'
        };
        return categories[soundType] || 'ui';
    }

    /**
     * Get sound effect configuration
     */
    getSoundEffectConfig(category, effect) {
        return this.config?.soundEffects?.[category]?.[effect] || null;
    }

    /**
     * Play configured sound
     */
    playConfiguredSound(config, volume, soundType) {
        if (!config.file) return;

        // Check cooldown
        const cooldown = this.config?.soundEffects?.global?.cooldowns?.[soundType] || 0;
        if (cooldown > 0) {
            const lastPlayed = this.sfxCooldowns.get(soundType) || 0;
            if (Date.now() - lastPlayed < cooldown) return;
            this.sfxCooldowns.set(soundType, Date.now());
        }

        const tryPlayFile = (filename) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio(filename);
                audio.volume = (config.volume || 0.5) * volume * this.sfxVolume * this.masterVolume;

                audio.oncanplaythrough = () => {
                    audio.play().then(resolve).catch(reject);
                };

                audio.onerror = () => reject(new Error('Load failed'));
            });
        };

        tryPlayFile(config.file).catch(() => {
            if (config.fallback) {
                tryPlayFile(config.fallback).catch(() => {
                    if (this.logger) this.logger.debug(`No audio for: ${soundType}`);
                });
            }
        });
    }

    // ========================================================================
    // SCREEN MUSIC
    // ========================================================================

    /**
     * Initialize mission music audio pool
     */
    initMissionMusicPool() {
        for (let i = 0; i < this.missionMusic.maxAudioElements; i++) {
            const audio = document.createElement('audio');
            audio.preload = 'none';
            this.missionMusic.audioPool.push({
                element: audio,
                inUse: false,
                type: null
            });
        }
    }

    /**
     * Get music config for a screen
     */
    getMusicConfigForScreen(screenName) {
        const screenNameMap = {
            'main-menu': 'menu',
            'mission-briefing': 'briefing',
            'mission-loadout': 'loadout'
        };

        const configName = screenNameMap[screenName] || screenName;
        return this.config?.screens?.[configName] || null;
    }

    /**
     * Load music for a specific screen
     */
    loadScreenMusic(screenName) {
        if (this.logger) this.logger.info(`🎵 loadScreenMusic called for: ${screenName}`);
        if (this.logger) this.logger.debug(`🎵 audioEnabled: ${this.audioEnabled}, hasConfig: ${!!this.config}`);

        // Stop current screen music
        if (this.screenMusic.currentTrack) {
            this.stopScreenMusic();
        }

        const screenConfig = this.getMusicConfigForScreen(screenName);
        if (this.logger) this.logger.debug(`🎵 screenConfig found: ${!!screenConfig}, hasTracks: ${!!screenConfig?.tracks}`);
        if (!screenConfig?.tracks) {
            if (this.logger) this.logger.debug(`No music config for: ${screenName}`);
            return;
        }

        this.screenMusic.currentScreen = screenName;
        this.screenMusic.currentConfig = screenConfig;

        // Play main track
        const mainTrack = screenConfig.tracks.main || screenConfig.tracks.ambient ||
                          Object.values(screenConfig.tracks)[0];
        if (mainTrack) {
            this.playScreenTrack(mainTrack, 'main');
        }
    }

    /**
     * Play a screen track
     */
    playScreenTrack(trackConfig, trackId) {
        if (!trackConfig) return;

        if (this.logger) this.logger.info(`🎵 playScreenTrack: ${trackId}, file: ${trackConfig.file || trackConfig.fallback}`);

        let audio = this.screenMusic.audioElements[trackId];
        if (!audio) {
            audio = new Audio();
            this.screenMusic.audioElements[trackId] = audio;
        }

        const musicFile = trackConfig.file || trackConfig.fallback;
        if (!musicFile) {
            if (this.logger) this.logger.error(`No music file for ${trackId}`);
            return;
        }

        audio.src = musicFile;
        audio.loop = trackConfig.loop !== false;
        audio.volume = 0;

        const configVolume = trackConfig.volume ?? 0.7;

        // Handle start time with conditions
        if (trackConfig.startTime !== undefined) {
            if (trackConfig.startTimeCondition === 'splashSkipped' && this.splashSkipped) {
                audio.currentTime = trackConfig.startTime;
            } else if (!trackConfig.startTimeCondition) {
                audio.currentTime = trackConfig.startTime;
            }
        }

        // Fade out current track
        if (this.screenMusic.currentTrack && this.screenMusic.currentTrack !== audio) {
            this.fadeOutAudio(this.screenMusic.currentTrack, this.config?.global?.fadeOutTime || 1000);
        }

        audio.play().then(() => {
            if (this.logger) this.logger.info(`🎵 ✅ Started playing: ${trackId}`);

            const targetVolume = this.calculateVolume(configVolume);
            this.fadeInAudio(audio, targetVolume, trackConfig.fadeIn || this.config?.global?.fadeInTime || 2000);
            this.screenMusic.currentTrack = audio;
        }).catch(error => {
            if (this.logger) this.logger.error(`🎵 ❌ Failed to play ${trackId}: ${error.message || error}`);
            // Log additional details for debugging
            if (this.logger) this.logger.error(`🎵 Audio state: src=${audio.src}, readyState=${audio.readyState}, error=${audio.error?.message || 'none'}`);
        });
    }

    /**
     * Stop screen music
     */
    stopScreenMusic() {
        if (this.logger) this.logger.debug('Stopping screen music');

        if (this.screenMusic.currentTrack) {
            this.fadeOutAudio(this.screenMusic.currentTrack, 500);
            this.screenMusic.currentTrack = null;
        }

        // Stop all audio elements
        Object.values(this.screenMusic.audioElements).forEach(audio => {
            if (audio && !audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        });

        // Clear fade timers
        this.screenMusic.fadeTimers.forEach(timer => clearInterval(timer));
        this.screenMusic.fadeTimers = [];
    }

    /**
     * Transition screen music
     */
    transitionScreenMusic(fromScreen, toScreen) {
        const screenNameMap = {
            'main-menu': 'menu',
            'mission-briefing': 'briefing',
            'mission-loadout': 'loadout'
        };

        const fromKey = screenNameMap[fromScreen] || fromScreen;
        const toKey = screenNameMap[toScreen] || toScreen;

        if (this.logger) this.logger.debug(`Music transition: ${fromScreen} -> ${toScreen}`);

        // Special case: splash to menu
        if (fromKey === 'splash' && toKey === 'menu') {
            if (!this.splashSkipped) {
                // Continue same track
                this.screenMusic.currentScreen = toKey;
                this.screenMusic.currentConfig = this.getMusicConfigForScreen(toKey);
                return;
            }
        }

        const fromConfig = this.getMusicConfigForScreen(fromKey);
        const transitionKey = `to${toKey.charAt(0).toUpperCase() + toKey.slice(1)}`;
        const transition = fromConfig?.transitions?.[transitionKey];

        if (transition) {
            switch (transition.type) {
                case 'continue':
                    this.screenMusic.currentScreen = toKey;
                    this.screenMusic.currentConfig = this.getMusicConfigForScreen(toKey);
                    if (transition.volumeAdjust && this.screenMusic.currentTrack) {
                        const newVol = this.screenMusic.currentTrack.volume * transition.volumeAdjust;
                        this.fadeToVolume(this.screenMusic.currentTrack, newVol, 500);
                    }
                    break;

                case 'fadeOut':
                    this.fadeOutAudio(this.screenMusic.currentTrack, transition.duration || 1000);
                    setTimeout(() => this.loadScreenMusic(toKey), transition.duration || 1000);
                    break;

                case 'crossfade':
                    this.crossfadeToScreen(toKey, transition.duration || 1500);
                    break;

                case 'skip':
                    if (transition.skipTime !== undefined && this.screenMusic.currentTrack) {
                        this.screenMusic.currentTrack.currentTime = transition.skipTime;
                        this.splashSkipped = true;
                    }
                    this.screenMusic.currentScreen = toKey;
                    this.screenMusic.currentConfig = this.getMusicConfigForScreen(toKey);
                    break;

                case 'restart':
                    if (this.screenMusic.currentTrack) {
                        this.screenMusic.currentTrack.currentTime = 0;
                        if (this.screenMusic.currentTrack.paused) {
                            this.screenMusic.currentTrack.play();
                        }
                    }
                    this.screenMusic.currentScreen = toKey;
                    this.screenMusic.currentConfig = this.getMusicConfigForScreen(toKey);
                    break;

                case 'ramp':
                    this.rampAndTransition(toKey, transition);
                    break;

                default:
                    this.loadScreenMusic(toKey);
            }
        } else {
            const toConfig = this.getMusicConfigForScreen(toKey);
            if (toConfig?.tracks) {
                this.loadScreenMusic(toKey);
            } else {
                this.screenMusic.currentScreen = toKey;
                this.screenMusic.currentConfig = toConfig;
            }
        }
    }

    /**
     * Crossfade to screen
     */
    crossfadeToScreen(toScreen, duration) {
        const fadeOutDuration = duration / 2;

        if (this.screenMusic.currentTrack) {
            this.fadeOutAudio(this.screenMusic.currentTrack, fadeOutDuration);
        }

        setTimeout(() => {
            this.loadScreenMusic(toScreen);
        }, fadeOutDuration / 2);
    }

    // ========================================================================
    // MISSION MUSIC
    // ========================================================================

    /**
     * Load mission music configuration
     */
    loadMissionMusic(missionDef) {
        if (!missionDef?.music) {
            if (this.logger) this.logger.debug('No mission music config, using defaults');
            this.loadDefaultMissionMusic();
            return;
        }

        if (this.logger) this.logger.debug(`Loading mission music: ${missionDef.name}`);
        this.missionMusic.config = missionDef.music;
        this.playMissionTrack('ambient');
    }

    /**
     * Load default mission music
     */
    loadDefaultMissionMusic() {
        this.missionMusic.config = this.config?.missions?.default || {
            ambient: { fallback: 'music/global/ambient_generic.mp3', volume: 0.6, loop: true, fadeIn: 2000 },
            combat: { fallback: 'music/global/combat_generic.mp3', volume: 0.8, loop: true, fadeIn: 500, priority: 2 }
        };
        this.playMissionTrack('ambient');
    }

    /**
     * Play mission track
     */
    playMissionTrack(trackType, eventId = null) {
        if (!this.missionMusic.config) return;

        let trackConfig;
        if (trackType === 'event' && eventId) {
            trackConfig = this.missionMusic.config.events?.find(e => e.id === eventId);
        } else {
            trackConfig = this.missionMusic.config[trackType];
        }

        if (!trackConfig) {
            if (this.logger) this.logger.warn(`Track not found: ${trackType}`);
            return;
        }

        const priority = trackConfig.priority || 0;
        if (priority < this.missionMusic.currentPriority) return;

        const audioSlot = this.missionMusic.audioPool.find(s => !s.inUse);
        if (!audioSlot) {
            if (this.logger) this.logger.error('No available audio slots');
            return;
        }

        const audio = audioSlot.element;
        const musicFile = trackConfig.file || trackConfig.fallback;

        if (!musicFile) {
            if (this.logger) this.logger.error(`No music file for ${trackType}`);
            return;
        }

        audio.src = musicFile;
        audio.loop = trackConfig.loop !== false;
        audio.volume = 0;

        audioSlot.inUse = true;
        audioSlot.type = trackType;

        if (this.missionMusic.currentTrack) {
            this.fadeOutAudio(this.missionMusic.currentTrack, 1000);
        }

        const configVolume = trackConfig.volume ?? 0.7;

        audio.play().then(() => {
            if (this.logger) this.logger.info(`Mission track started: ${trackType}`);

            const targetVolume = this.calculateVolume(configVolume);
            this.fadeInAudio(audio, targetVolume, trackConfig.fadeIn || 1000);

            this.missionMusic.currentTrack = audio;
            this.missionMusic.currentTrackType = trackType;
            this.missionMusic.currentPriority = priority;
            this.missionMusic.tracks[trackType] = audio;
        }).catch(error => {
            if (this.logger) this.logger.error(`Failed to play mission track: ${error}`);
            audioSlot.inUse = false;
            audioSlot.type = null;
        });
    }

    /**
     * Update mission music based on game state
     */
    updateMusicState(agents, enemies, hasLineOfSight) {
        if (!this.missionMusic.config || !agents) return;

        let newCombatState = false;
        let newStealthState = false;
        let newAlertState = false;

        for (const enemy of enemies || []) {
            if (!enemy.alive) continue;

            for (const agent of agents) {
                if (!agent.alive) continue;

                const dist = Math.sqrt(
                    Math.pow(enemy.x - agent.x, 2) + Math.pow(enemy.y - agent.y, 2)
                );

                if (dist < 10 && hasLineOfSight(enemy, agent)) {
                    newCombatState = true;
                    break;
                }

                if (dist < 15 && !hasLineOfSight(enemy, agent)) {
                    newStealthState = true;
                }
            }

            if (enemy.alertLevel > 0) {
                newAlertState = true;
            }
        }

        // Handle state changes
        if (newAlertState && !this.missionMusic.alertState) {
            this.playMissionTrack('alert');
        } else if (newCombatState && !this.missionMusic.combatState) {
            this.playMissionTrack('combat');
        } else if (newStealthState && !this.missionMusic.stealthState && !newCombatState && !newAlertState) {
            this.playMissionTrack('stealth');
        } else if (!newCombatState && !newStealthState && !newAlertState &&
                   (this.missionMusic.combatState || this.missionMusic.stealthState || this.missionMusic.alertState)) {
            this.playMissionTrack('ambient');
        }

        this.missionMusic.combatState = newCombatState;
        this.missionMusic.stealthState = newStealthState;
        this.missionMusic.alertState = newAlertState;
    }

    /**
     * Play victory music
     */
    playVictoryMusic() {
        if (this.logger) this.logger.debug('Playing victory music');
        this.missionMusic.currentPriority = 10;
        this.playMissionTrack('victory');
    }

    /**
     * Cleanup mission music
     */
    cleanupMissionMusic() {
        if (this.logger) this.logger.debug('Cleaning up mission music');

        this.missionMusic.fadeTimers.forEach(timer => clearInterval(timer));
        this.missionMusic.fadeTimers = [];

        for (const slot of this.missionMusic.audioPool) {
            if (slot.element) {
                slot.element.pause();
                slot.element.src = '';
            }
            slot.inUse = false;
            slot.type = null;
        }

        this.missionMusic.currentTrack = null;
        this.missionMusic.currentTrackType = null;
        this.missionMusic.currentPriority = 0;
        this.missionMusic.combatState = false;
        this.missionMusic.stealthState = false;
        this.missionMusic.alertState = false;
    }

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Calculate final volume from config volume
     */
    calculateVolume(configVolume) {
        let master = this.masterVolume;
        let music = this.musicVolume;

        // Normalize if stored as percentages
        if (master > 1) master = master / 100;
        if (music > 1) music = music / 100;

        return Math.max(0, Math.min(1, configVolume * master * music));
    }

    /**
     * Fade in audio
     */
    fadeInAudio(audio, targetVolume, duration) {
        if (!audio) return;

        const clampedTarget = Math.max(0, Math.min(1, targetVolume));
        const steps = 20;
        const stepTime = duration / steps;
        const volumeStep = clampedTarget / steps;
        let currentStep = 0;

        const fadeTimer = setInterval(() => {
            currentStep++;
            try {
                audio.volume = Math.max(0, Math.min(1, volumeStep * currentStep));
            } catch (e) {
                clearInterval(fadeTimer);
                return;
            }

            if (currentStep >= steps) {
                clearInterval(fadeTimer);
                try {
                    audio.volume = clampedTarget;
                } catch (e) { /* ignore */ }
            }
        }, stepTime);

        this.screenMusic.fadeTimers.push(fadeTimer);
    }

    /**
     * Fade out audio
     */
    fadeOutAudio(audio, duration) {
        if (!audio) return;

        let startVolume;
        try {
            startVolume = audio.volume || 0;
        } catch (e) {
            return;
        }

        if (startVolume === 0) return;

        const steps = 20;
        const stepTime = duration / steps;
        const volumeStep = startVolume / steps;
        let currentStep = 0;

        const fadeTimer = setInterval(() => {
            currentStep++;
            try {
                audio.volume = Math.max(0, startVolume - (volumeStep * currentStep));
            } catch (e) {
                clearInterval(fadeTimer);
                return;
            }

            if (currentStep >= steps) {
                clearInterval(fadeTimer);
                try {
                    audio.pause();
                    audio.volume = 0;
                    audio.currentTime = 0;
                } catch (e) { /* ignore */ }

                // Release mission music slot if applicable
                const slot = this.missionMusic.audioPool.find(s => s.element === audio);
                if (slot) {
                    slot.inUse = false;
                    slot.type = null;
                }
            }
        }, stepTime);

        this.screenMusic.fadeTimers.push(fadeTimer);
    }

    /**
     * Fade to specific volume
     */
    fadeToVolume(audio, targetVolume, duration) {
        if (!audio) return;

        const steps = 20;
        const stepTime = duration / steps;
        const startVolume = audio.volume;
        const volumeStep = (targetVolume - startVolume) / steps;
        let currentStep = 0;

        const fadeTimer = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(0, Math.min(1, startVolume + (volumeStep * currentStep)));

            if (currentStep >= steps) {
                clearInterval(fadeTimer);
                audio.volume = Math.max(0, Math.min(1, targetVolume));
            }
        }, stepTime);

        this.screenMusic.fadeTimers.push(fadeTimer);
    }

    /**
     * Play procedural screen music as fallback
     */
    playProceduralScreenMusic(trackConfig, trackId) {
        if (this.logger) this.logger.debug(`Generating procedural music for ${trackId}`);

        if (!this.audioContext) {
            if (this.logger) this.logger.warn('AudioContext not available for procedural music');
            return;
        }

        // Determine style based on screen or config
        let style = 'ambient';
        if (this.screenMusic.currentScreen === 'menu') style = 'chiptune';
        else if (this.screenMusic.currentScreen === 'combat') style = 'combat';
        else if (this.screenMusic.currentScreen === 'credits') style = 'chiptune';

        const proceduralConfig = this.config?.procedural?.styles?.[style] || {
            waveforms: ['sine'],
            tempo: [120],
            scales: ['major']
        };

        // Generate and play procedural music
        if (this.playProceduralMusic) {
            const musicData = {
                tempo: proceduralConfig.tempo[0],
                waveform: proceduralConfig.waveforms[0],
                scale: proceduralConfig.scales[0],
                volume: trackConfig?.volume || 0.5
            };
            this.playProceduralMusic(musicData);
        }
    }

    /**
     * Ramp volume and transition
     */
    rampAndTransition(toScreen, config) {
        if (this.screenMusic.currentTrack && config.volumeRamp) {
            const currentVolume = this.screenMusic.currentTrack.volume;
            const rampVolume = currentVolume * config.volumeRamp;

            // Ramp up
            this.fadeToVolume(this.screenMusic.currentTrack, rampVolume, config.duration / 2);

            // Then transition
            setTimeout(() => {
                this.loadScreenMusic(toScreen);
            }, config.duration / 2);
        } else {
            this.loadScreenMusic(toScreen);
        }
    }

    /**
     * Adjust screen music volume dynamically
     */
    adjustScreenMusicVolume(volumeMultiplier, duration = 500) {
        if (this.screenMusic.currentTrack) {
            const targetVolume = this.screenMusic.currentTrack.volume * volumeMultiplier;
            this.fadeToVolume(this.screenMusic.currentTrack, targetVolume, duration);
        }
    }

    /**
     * Set master volume
     */
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.logger) this.logger.debug(`Master volume: ${this.masterVolume}`);
    }

    /**
     * Set music volume
     */
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.logger) this.logger.debug(`Music volume: ${this.musicVolume}`);
    }

    /**
     * Set SFX volume
     */
    setSFXVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.logger) this.logger.debug(`SFX volume: ${this.sfxVolume}`);
    }

    /**
     * Mark splash as skipped
     */
    markSplashSkipped() {
        this.splashSkipped = true;
    }

    /**
     * Export state for saving
     */
    exportState() {
        return {
            masterVolume: this.masterVolume,
            musicVolume: this.musicVolume,
            sfxVolume: this.sfxVolume,
            audioEnabled: this.audioEnabled
        };
    }

    /**
     * Import state from save
     */
    importState(state) {
        if (state.masterVolume !== undefined) this.masterVolume = state.masterVolume;
        if (state.musicVolume !== undefined) this.musicVolume = state.musicVolume;
        if (state.sfxVolume !== undefined) this.sfxVolume = state.sfxVolume;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioService;
}

// Export to window
if (typeof window !== 'undefined') {
    window.AudioService = AudioService;
}
