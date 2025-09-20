// Audio System - Core Audio Functionality Only
// Music is handled by:
// - game-screen-music.js for menu screens
// - game-music-system.js for missions

CyberOpsGame.prototype.initializeAudio = function() {
    // Initialize audio variables - DON'T create AudioContext yet!
    this.audioContext = null;
    this.audioEnabled = false; // Start with audio disabled

    console.log('Audio system initialized, waiting for user interaction...');
}

// Setup audio on first user interaction
CyberOpsGame.prototype.setupAudioInteraction = function() {
    const enableAudioOnClick = () => {
        if (!this.audioEnabled) {
            this.enableAudio();
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudioOnClick);
        document.removeEventListener('touchstart', enableAudioOnClick);
        document.removeEventListener('keydown', enableAudioOnClick);
    };

    // Add listeners for first user interaction
    document.addEventListener('click', enableAudioOnClick);
    document.addEventListener('touchstart', enableAudioOnClick);
    document.addEventListener('keydown', enableAudioOnClick);

    // Check if audio was previously enabled
    if (sessionStorage.getItem('audioEnabled') === 'true') {
        this.enableAudioImmediately();
    }
}

CyberOpsGame.prototype.enableAudioImmediately = function() {
    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioEnabled = true;

        console.log('Audio enabled from session storage');
        console.log('Audio context state:', this.audioContext.state);

        // Try to resume immediately, but setup fallback for user interaction
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed successfully from session');
                this.startAppropriateMusic();
            }).catch(() => {
                console.log('Audio resume failed, setting up one-time interaction handler');
                this.setupOneTimeResume();
            });
        } else {
            this.startAppropriateMusic();
        }

    } catch (error) {
        console.warn('Failed to create AudioContext from session:', error);
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
                console.log('Audio context resumed on user interaction');
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
        console.log('Audio already enabled');
        return;
    }

    try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioEnabled = true;

        // Store audio enabled state
        sessionStorage.setItem('audioEnabled', 'true');

        console.log('Audio context created successfully');
        console.log('Audio context state:', this.audioContext.state);

        // Resume if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('Audio context resumed');

                // Start the appropriate music
                this.startAppropriateMusic();
            });
        } else {
            // Start the appropriate music
            this.startAppropriateMusic();
        }

    } catch (error) {
        console.error('Failed to create AudioContext:', error);
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
        const audio = new Audio(filename);
        audio.volume = (config.volume || 0.5) * volume;
        return audio.play();
    };

    // Try to play primary file (WAV)
    tryPlayFile(config.file).catch(() => {
        // Try fallback file (MP3) if specified
        if (config.fallback) {
            console.log(`Primary SFX not found: ${config.file}, trying fallback: ${config.fallback}`);
            tryPlayFile(config.fallback).catch(() => {
                // Both files failed - stay silent
                console.log(`No audio files found for: ${soundType}, staying silent`);
            });
        } else {
            // No fallback file - stay silent
            console.log(`SFX file not found: ${config.file}, no fallback available for: ${soundType}`);
        }
    });
}

// Procedural sound generation removed - using only audio assets