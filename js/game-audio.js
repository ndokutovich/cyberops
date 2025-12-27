// Audio System - Core Audio Functionality Only
// Music is handled by:
// - game-screen-music.js for menu screens
// - game-music-system.js for missions

CyberOpsGame.prototype.initializeAudio = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameAudio') : null;
    }
    // Initialize audio variables - DON'T create AudioContext yet!
    this.audioContext = null;
    this.audioEnabled = false; // Start with audio disabled

    if (this.logger) this.logger.info('Audio system initialized, waiting for user interaction...');
}

// Setup audio on first user interaction
CyberOpsGame.prototype.setupAudioInteraction = function() {
    const enableAudioOnClick = () => {
        if (!this.audioEnabled) {
            this.enableAudio();
        }
        // Remove listeners after first interaction (for click/touch only)
        document.removeEventListener('click', enableAudioOnClick);
        document.removeEventListener('touchstart', enableAudioOnClick);
    };

    // Add listeners for first user interaction (click and touch)
    document.addEventListener('click', enableAudioOnClick);
    document.addEventListener('touchstart', enableAudioOnClick);

    // Use keyboard dispatcher for keydown
    const dispatcher = this.gameServices?.keyboardDispatcher;
    if (!dispatcher) {
        throw new Error('KeyboardDispatcherService not available - required for audio keyboard handling');
    }

    // Register one-time handler via dispatcher
    dispatcher.registerOneTimeHandler(() => {
        if (!this.audioEnabled) {
            this.enableAudio();
        }
    });

    // Check if audio was previously enabled
    if (sessionStorage.getItem('audioEnabled') === 'true') {
        this.enableAudioImmediately();
    }
}

CyberOpsGame.prototype.enableAudioImmediately = function() {
    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioEnabled = true;

        if (this.logger) this.logger.debug('Audio enabled from session storage');
        if (this.logger) this.logger.debug('Audio context state:', this.audioContext.state);

        // Try to resume immediately, but setup fallback for user interaction
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                if (this.logger) this.logger.info('Audio context resumed successfully from session');
                this.startAppropriateMusic();
            }).catch(() => {
                if (this.logger) this.logger.error('Audio resume failed, setting up one-time interaction handler');
                this.setupOneTimeResume();
            });
        } else {
            this.startAppropriateMusic();
        }

    } catch (error) {
        if (this.logger) this.logger.warn('Failed to create AudioContext from session:', error);
        this.audioEnabled = false;
    }
}

CyberOpsGame.prototype.startAppropriateMusic = function() {
    // Start appropriate music based on current screen using new systems
    setTimeout(() => {
        if (this.loadScreenMusic) {
            if (this.currentScreen === 'splash') {
                this.loadScreenMusic('splash');
            } else if (this.currentScreen === 'menu') {
                this.loadScreenMusic('menu');
            }
        }
    }, 100);
}

CyberOpsGame.prototype.setupOneTimeResume = function() {
    const resumeHandler = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                if (this.logger) this.logger.debug('Audio context resumed on user interaction');
                this.startAppropriateMusic();
            });
        }
        document.removeEventListener('click', resumeHandler);
        document.removeEventListener('touchstart', resumeHandler);
    };

    document.addEventListener('click', resumeHandler);
    document.addEventListener('touchstart', resumeHandler);
}

CyberOpsGame.prototype.enableAudio = function() {
    if (this.audioEnabled) {
        if (this.logger) this.logger.debug('Audio already enabled');
        return;
    }

    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioEnabled = true;

        // Store audio enabled state
        sessionStorage.setItem('audioEnabled', 'true');

        if (this.logger) this.logger.info('Audio context created successfully');
        if (this.logger) this.logger.debug('Audio context state:', this.audioContext.state);

        // Resume if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                if (this.logger) this.logger.debug('Audio context resumed');

                // Start the appropriate music
                this.startAppropriateMusic();
            });
        } else {
            // Start the appropriate music
            this.startAppropriateMusic();
        }

    } catch (error) {
        if (this.logger) this.logger.error('Failed to create AudioContext:', error);
        this.audioEnabled = false;
    }
}

// Procedural music removed - using only audio assets

// Sound effect playback (combat, UI sounds, etc.)
CyberOpsGame.prototype.playSound = function(soundType, volume = 0.5) {
    if (!this.audioEnabled || !this.audioContext) {
        return;
    }

    // Get sound config from the music config if available
    if (typeof getSoundEffectConfig !== 'undefined') {
        const category = this.getSoundCategory(soundType);
        const config = getSoundEffectConfig(category, soundType);
        if (config) {
            this.playConfiguredSound(config, volume, soundType);
        }
    }
    // No procedural fallback - stay silent if no audio files
}

CyberOpsGame.prototype.getSoundCategory = function(soundType) {
    const soundCategories = {
        'click': 'ui',
        'hover': 'ui',
        'error': 'ui',
        'success': 'ui',
        'shoot': 'combat',
        'explosion': 'combat',
        'hit': 'combat',
        'shield': 'combat',
        'hack': 'interaction',
        'door': 'interaction',
        'terminal': 'interaction',
        'pickup': 'interaction',
        'footstep': 'movement',
        'move': 'movement'
    };

    return soundCategories[soundType] || 'ui';
}

CyberOpsGame.prototype.playConfiguredSound = function(config, volume, soundType) {
    if (!config.file) {
        return; // No sound file, stay silent
    }

    const tryPlayFile = (filename) => {
        return new Promise((resolve, reject) => {
            const audio = new Audio(filename);
            audio.volume = (config.volume || 0.5) * volume;

            // Handle successful load
            audio.oncanplaythrough = () => {
                audio.play()
                    .then(resolve)
                    .catch(err => {
                        // Autoplay restriction - not a file error
                        if (err.name === 'NotAllowedError') {
                            reject({ type: 'autoplay', error: err });
                        } else {
                            reject({ type: 'play', error: err });
                        }
                    });
            };

            // Handle load error (file not found)
            audio.onerror = () => reject({ type: 'load', error: audio.error });
        });
    };

    // Try primary file first
    tryPlayFile(config.file).catch((err) => {
        if (err.type === 'autoplay') {
            // Autoplay blocked - try fallback anyway (might work after interaction)
            if (config.fallback) {
                tryPlayFile(config.fallback).catch(() => {});
            }
            return;
        }

        // Primary file failed to load, try fallback
        if (config.fallback) {
            if (this.logger) this.logger.debug(`Primary SFX not found: ${config.file}, trying fallback`);
            tryPlayFile(config.fallback).catch((fallbackErr) => {
                if (fallbackErr.type !== 'autoplay') {
                    if (this.logger) this.logger.debug(`No audio files found for: ${soundType}`);
                }
            });
        }
    });
}

// Procedural sound generation removed - using only audio assets