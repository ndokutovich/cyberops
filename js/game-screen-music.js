// Screen Music Manager
// Handles music for all non-mission game screens using declarative config

CyberOpsGame.prototype.initScreenMusicSystem = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameScreenMusic') : null;
    }
    if (this.logger) this.logger.debug('🎵 Initializing screen music system...');

    this.screenMusic = {
        currentScreen: null,
        currentTrack: null,
        currentConfig: null,
        audioElements: {},
        fadeTimers: []
    };

    // Load the configuration
    if (typeof GAME_MUSIC_CONFIG !== 'undefined') {
        this.musicConfig = GAME_MUSIC_CONFIG;
        if (this.logger) this.logger.info('✅ Music configuration loaded');
    } else {
        if (this.logger) this.logger.warn('⚠️ Music configuration not found, using defaults');
        this.musicConfig = { screens: {}, global: {} };
    }
};

// Load music for a specific screen
CyberOpsGame.prototype.loadScreenMusic = function(screenName) {
    if (this.logger) this.logger.debug(`🎵 Loading music for screen: ${screenName}`);

    // Initialize if not already done
    if (!this.screenMusic) {
        if (this.logger) this.logger.warn('⚠️ Screen music system not initialized, initializing now...');
        this.initScreenMusicSystem();
    }

    // Stop current screen music
    if (this.screenMusic.currentTrack) {
        this.stopScreenMusic();
    }

    // Get configuration for this screen
    const screenConfig = getMusicConfigForScreen ? getMusicConfigForScreen(screenName) : null;
    if (!screenConfig || !screenConfig.tracks) {
        if (this.logger) this.logger.debug(`⚠️ No music configuration for screen: ${screenName}`);
        return;
    }

    this.screenMusic.currentScreen = screenName;
    this.screenMusic.currentConfig = screenConfig;

    // Play the main track for this screen
    const mainTrack = screenConfig.tracks.main || screenConfig.tracks.ambient || Object.values(screenConfig.tracks)[0];
    if (mainTrack) {
        this.playScreenTrack(mainTrack, 'main');
    }
};

// Play a specific track
CyberOpsGame.prototype.playScreenTrack = function(trackConfig, trackId) {
    if (!trackConfig) return;

    if (this.logger) this.logger.debug(`🎵 Playing track: ${trackId} from ${trackConfig.file || trackConfig.fallback}`);

    // Check if we should use procedural music
    if (trackConfig.procedural && (!trackConfig.file || !this.fileExists(trackConfig.file))) {
        this.playProceduralScreenMusic(trackConfig, trackId);
        return;
    }

    // Try to get or create audio element
    let audio = this.screenMusic.audioElements[trackId];
    if (!audio) {
        audio = new Audio();
        this.screenMusic.audioElements[trackId] = audio;
    }

    // Set source with fallback
    const musicFile = trackConfig.file || trackConfig.fallback;
    if (!musicFile) {
        if (this.logger) this.logger.error(`❌ No music file specified for ${trackId}`);
        return;
    }

    // Configure audio element
    audio.src = musicFile;
    audio.loop = trackConfig.loop !== false;
    audio.volume = 0; // Start at 0 for fade in

    // Handle start time with conditional logic
    if (trackConfig.startTime !== undefined) {
        if (this.logger) this.logger.debug(`🎵 Start time config: ${trackConfig.startTime}, condition: ${trackConfig.startTimeCondition}, splashSkipped: ${this.splashSkipped}`);

        // Check if there's a condition for using the start time
        if (trackConfig.startTimeCondition) {
            // Only apply startTime if condition is met
            if (trackConfig.startTimeCondition === 'splashSkipped' && this.splashSkipped) {
                if (this.logger) this.logger.debug(`🎵 Splash was skipped, seeking to ${trackConfig.startTime}s`);
                audio.currentTime = trackConfig.startTime;
            } else if (trackConfig.startTimeCondition === 'splashSkipped' && !this.splashSkipped) {
                if (this.logger) this.logger.debug(`🎵 Splash was NOT skipped, NOT seeking (continuing naturally)`);
            } else if (!trackConfig.startTimeCondition) {
                // No condition, always apply
                audio.currentTime = trackConfig.startTime;
            }
        } else {
            // No condition specified, always apply start time
            if (this.logger) this.logger.debug(`🎵 No condition, applying start time: ${trackConfig.startTime}`);
            audio.currentTime = trackConfig.startTime;
        }
    }

    // Stop current track with fade out
    if (this.screenMusic.currentTrack && this.screenMusic.currentTrack !== audio) {
        this.fadeOutScreenTrack(this.screenMusic.currentTrack, this.musicConfig.global?.fadeOutTime || 1000);
    }

    // Play new track
    audio.play().then(() => {
        if (this.logger) this.logger.info(`✅ Started playing: ${trackId}`);
        const targetVolume = (trackConfig.volume || 0.7) * (this.musicConfig.global?.musicVolume || 1);
        this.fadeInScreenTrack(audio, targetVolume, trackConfig.fadeIn || this.musicConfig.global?.fadeInTime || 2000);
        this.screenMusic.currentTrack = audio;

        // Handle delayed tracks
        if (trackConfig.delay) {
            setTimeout(() => {
                const delayedTrack = this.screenMusic.currentConfig.tracks[trackId + '_delayed'];
                if (delayedTrack) {
                    this.playScreenTrack(delayedTrack, trackId + '_delayed');
                }
            }, trackConfig.delay);
        }
    }).catch(error => {
        if (this.logger) this.logger.error(`❌ Failed to play music: ${error}`);
        // Try procedural fallback
        if (trackConfig.procedural !== false) {
            this.playProceduralScreenMusic(trackConfig, trackId);
        }
    });
};

// Stop current screen music
CyberOpsGame.prototype.stopScreenMusic = function() {
    if (this.logger) this.logger.debug('🛑 stopScreenMusic called');

    if (!this.screenMusic) {
        if (this.logger) this.logger.info('⚠️ Screen music system not initialized');
        return;
    }

    if (this.screenMusic.currentTrack) {
        if (this.logger) this.logger.debug('🛑 Stopping current track:', this.screenMusic.currentTrack.src);
        this.fadeOutScreenTrack(this.screenMusic.currentTrack, 500); // Faster fade for mission start
        this.screenMusic.currentTrack = null;
    }

    // Also check for any audio elements that might be playing
    Object.values(this.screenMusic.audioElements || {}).forEach(audio => {
        if (audio && !audio.paused) {
            if (this.logger) this.logger.debug('🛑 Stopping audio element:', audio.src);
            audio.pause();
            audio.currentTime = 0;
        }
    });

    // Clear all fade timers
    if (this.screenMusic.fadeTimers) {
        this.screenMusic.fadeTimers.forEach(timer => clearTimeout(timer));
        this.screenMusic.fadeTimers = [];
    }
};

// Fade in track for screen music
CyberOpsGame.prototype.fadeInScreenTrack = function(audio, targetVolume, duration) {
    if (!audio) return;

    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fadeTimer = setInterval(() => {
        currentStep++;
        audio.volume = Math.min(volumeStep * currentStep, targetVolume);

        if (currentStep >= steps) {
            clearInterval(fadeTimer);
            audio.volume = targetVolume;
        }
    }, stepTime);

    this.screenMusic.fadeTimers.push(fadeTimer);
};

// Fade out track for screen music
CyberOpsGame.prototype.fadeOutScreenTrack = function(audio, duration) {
    if (!audio || audio.volume === 0) return;

    const steps = 20;
    const stepTime = duration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const fadeTimer = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(startVolume - (volumeStep * currentStep), 0);

        if (currentStep >= steps) {
            clearInterval(fadeTimer);
            audio.pause();
            audio.volume = 0;
            audio.currentTime = 0;
        }
    }, stepTime);

    this.screenMusic.fadeTimers.push(fadeTimer);
};

// Play procedural music as fallback
CyberOpsGame.prototype.playProceduralScreenMusic = function(trackConfig, trackId) {
    if (this.logger) this.logger.debug(`🎹 Generating procedural music for ${trackId}`);

    if (!this.audioContext) {
        if (this.logger) this.logger.warn('⚠️ AudioContext not available for procedural music');
        return;
    }

    // Determine style based on screen or config
    let style = 'ambient';
    if (this.screenMusic.currentScreen === 'menu') style = 'chiptune';
    else if (this.screenMusic.currentScreen === 'combat') style = 'combat';
    else if (this.screenMusic.currentScreen === 'credits') style = 'chiptune';

    const proceduralConfig = this.musicConfig.procedural?.styles[style] || {
        waveforms: ['sine'],
        tempo: [120],
        scales: ['major']
    };

    // Generate and play procedural music
    // This would connect to the existing procedural music system
    if (this.playProceduralMusic) {
        const musicData = {
            tempo: proceduralConfig.tempo[0],
            waveform: proceduralConfig.waveforms[0],
            scale: proceduralConfig.scales[0],
            volume: trackConfig.volume || 0.5
        };
        this.playProceduralMusic(musicData);
    }
};

// Handle screen transitions
CyberOpsGame.prototype.transitionScreenMusic = function(fromScreen, toScreen) {
    // Map screen IDs to music config keys
    const screenNameMap = {
        'main-menu': 'menu',
        'mission-briefing': 'briefing',
        'mission-loadout': 'loadout'
    };

    // Use mapped names for music config lookups
    const fromMusicKey = screenNameMap[fromScreen] || fromScreen;
    const toMusicKey = screenNameMap[toScreen] || toScreen;

    if (this.logger) this.logger.debug(`🎵 Music transition: ${fromScreen} → ${toScreen} (${fromMusicKey} → ${toMusicKey}), splashSkipped: ${this.splashSkipped}`);

    // Special case: splash to menu
    if (fromMusicKey === 'splash' && toMusicKey === 'menu') {
        if (!this.splashSkipped) {
            if (this.logger) this.logger.debug('🎵 Natural splash→menu transition - continuing same track');
            // Don't reload, just update the current screen reference
            this.screenMusic.currentScreen = toMusicKey;
            const menuConfig = getMusicConfigForScreen ? getMusicConfigForScreen(toMusicKey) : null;
            this.screenMusic.currentConfig = menuConfig;
            return;  // Music continues playing seamlessly
        } else {
            if (this.logger) this.logger.debug('🎵 Splash was SKIPPED - need to reload music with seek');
            // Fall through to load menu music with startTime applied
            this.loadScreenMusic(toMusicKey);
            return;
        }
    }

    const fromConfig = getMusicConfigForScreen ? getMusicConfigForScreen(fromMusicKey) : null;
    // Build transition key using the music config key, not screen name
    const transitionKey = `to${toMusicKey.charAt(0).toUpperCase() + toMusicKey.slice(1)}`;
    const transitionConfig = fromConfig?.transitions?.[transitionKey];

    if (this.logger) this.logger.debug(`🎵 Transition config for ${transitionKey}: ${transitionConfig?.type || 'none'}`);

    if (transitionConfig) {
        switch (transitionConfig.type) {
            case 'crossfade':
                this.crossfadeToScreen(toMusicKey, transitionConfig.duration);
                break;
            case 'fadeOut':
                this.fadeOutScreenTrack(this.screenMusic.currentTrack, transitionConfig.duration);
                setTimeout(() => this.loadScreenMusic(toMusicKey), transitionConfig.duration);
                break;
            case 'ramp':
                this.rampAndTransition(toMusicKey, transitionConfig);
                break;
            case 'skip':
                // Skip transition - jump to specific time
                if (transitionConfig.skipTime !== undefined && this.screenMusic.currentTrack) {
                    if (this.logger) this.logger.debug(`🎵 Skip transition - jumping to ${transitionConfig.skipTime} seconds`);
                    this.screenMusic.currentTrack.currentTime = transitionConfig.skipTime;
                    this.splashSkipped = true;  // Mark that we skipped
                }
                this.screenMusic.currentScreen = toMusicKey;
                const skipToConfig = getMusicConfigForScreen ? getMusicConfigForScreen(toMusicKey) : null;
                this.screenMusic.currentConfig = skipToConfig;
                break;
            case 'continue':
                // Don't stop or change music, just update screen
                if (this.logger) this.logger.debug(`🎵 Continue transition - music keeps playing, updating screen to ${toMusicKey}`);
                this.screenMusic.currentScreen = toMusicKey;
                const toConfig = getMusicConfigForScreen ? getMusicConfigForScreen(toMusicKey) : null;
                this.screenMusic.currentConfig = toConfig;

                // Verify music is still playing
                if (this.screenMusic.currentTrack) {
                    if (this.logger) this.logger.debug(`🎵 Music still playing: ${!this.screenMusic.currentTrack.paused}, time: ${this.screenMusic.currentTrack.currentTime.toFixed(1)}s`);
                } else {
                    if (this.logger) this.logger.warn('🎵 WARNING: No current track during continue transition!');
                }

                // Handle optional volume adjustment
                if (transitionConfig.volumeAdjust && this.screenMusic.currentTrack) {
                    const newVolume = this.screenMusic.currentTrack.volume * transitionConfig.volumeAdjust;
                    this.fadeToVolume(this.screenMusic.currentTrack, newVolume, 500);
                }
                break;
            case 'restart':
                // Restart the current music from beginning
                if (this.logger) this.logger.debug(`🎵 Restart transition - restarting music from beginning for ${toMusicKey}`);
                if (this.screenMusic.currentTrack) {
                    this.screenMusic.currentTrack.currentTime = 0;
                    // Make sure it's playing
                    if (this.screenMusic.currentTrack.paused) {
                        this.screenMusic.currentTrack.play();
                    }
                }
                this.screenMusic.currentScreen = toMusicKey;
                const restartConfig = getMusicConfigForScreen ? getMusicConfigForScreen(toMusicKey) : null;
                this.screenMusic.currentConfig = restartConfig;
                break;
            default:
                this.loadScreenMusic(toMusicKey);
        }
    } else {
        // No transition config found - check if destination has music
        const toConfig = getMusicConfigForScreen ? getMusicConfigForScreen(toMusicKey) : null;

        if (toConfig && toConfig.tracks) {
            // Destination has its own music - load it
            if (this.logger) this.logger.debug(`🎵 No transition config, but ${toMusicKey} has tracks - loading new music`);
            this.loadScreenMusic(toMusicKey);
        } else {
            // Destination has no music - continue current music
            if (this.logger) this.logger.debug(`🎵 No transition config and ${toMusicKey} has no tracks - continuing current music`);
            this.screenMusic.currentScreen = toMusicKey;
            this.screenMusic.currentConfig = toConfig;
        }
    }
};

// Crossfade between screens
CyberOpsGame.prototype.crossfadeToScreen = function(toScreen, duration) {
    const fadeOutDuration = duration / 2;
    const fadeInDuration = duration / 2;

    // Start fading out current
    if (this.screenMusic.currentTrack) {
        this.fadeOutScreenTrack(this.screenMusic.currentTrack, fadeOutDuration);
    }

    // Start new track at low volume
    setTimeout(() => {
        this.loadScreenMusic(toScreen);
    }, fadeOutDuration / 2);
};

// Ramp volume and transition
CyberOpsGame.prototype.rampAndTransition = function(toScreen, config) {
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
};

// Handle dynamic volume changes (e.g., when dialogs open)
CyberOpsGame.prototype.adjustScreenMusicVolume = function(volumeMultiplier, duration = 500) {
    if (this.screenMusic.currentTrack) {
        const targetVolume = this.screenMusic.currentTrack.volume * volumeMultiplier;
        this.fadeToVolume(this.screenMusic.currentTrack, targetVolume, duration);
    }
};

// Helper to fade to specific volume
CyberOpsGame.prototype.fadeToVolume = function(audio, targetVolume, duration) {
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
            audio.volume = targetVolume;
        }
    }, stepTime);

    this.screenMusic.fadeTimers.push(fadeTimer);
};

// Check if file exists (simplified check)
CyberOpsGame.prototype.fileExists = function(filepath) {
    // In a real implementation, this would check if the file is accessible
    // For now, return true for known files
    const knownFiles = [
        'game-music.mp3', 'game-credits.mp3',
        'game-level-1.mp3', 'game-level-2.mp3', 'game-level-3.mp3',
        'game-level-4.mp3', 'game-level-5.mp3',
        'sfx-explosion.mp3', 'sfx-shield.mp3'
    ];

    return knownFiles.includes(filepath.split('/').pop());
};

// Initialize on load
if (this.logger) this.logger.info('🎵 Screen music manager loaded');