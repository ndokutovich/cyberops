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

// Simple procedural music generator (kept for compatibility)
CyberOpsGame.prototype.playProceduralMusic = function(musicData) {
    if (!this.audioContext || !this.audioEnabled) {
        console.log('Cannot play procedural music: audio not enabled');
        return null;
    }

    try {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = musicData.waveform || 'sine';
        oscillator.frequency.value = musicData.frequency || 440;

        gainNode.gain.value = musicData.volume || 0.1;

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start();

        return oscillator;
    } catch (error) {
        console.error('Error playing procedural music:', error);
        return null;
    }
}

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
            return;
        }
    }

    // Fallback to procedural sounds
    this.playProceduralSound(soundType, volume);
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
    if (!config.file && !config.procedural) {
        return;
    }

    const tryPlayFile = (filename) => {
        const audio = new Audio(filename);
        audio.volume = (config.volume || 0.5) * volume;
        return audio.play();
    };

    if (config.file) {
        // Try to play primary file (WAV)
        tryPlayFile(config.file).catch(() => {
            // Try fallback file (MP3) if specified
            if (config.fallback) {
                console.log(`Primary SFX not found: ${config.file}, trying fallback: ${config.fallback}`);
                tryPlayFile(config.fallback).catch(() => {
                    // Fall back to procedural if both files fail
                    console.log(`Fallback SFX also not found: ${config.fallback}, using procedural for: ${soundType}`);
                    this.playProceduralSound(soundType, volume);
                });
            } else {
                // Fall back to procedural if no fallback file specified
                console.log(`SFX file not found: ${config.file}, using procedural for: ${soundType}`);
                this.playProceduralSound(soundType, volume);
            }
        });
    } else if (config.procedural) {
        this.playProceduralSound(soundType, volume);
    }
}

CyberOpsGame.prototype.playProceduralSound = function(soundType, volume) {
    if (!this.audioContext) return;

    // Get template from config if available
    let template = null;
    if (typeof GAME_MUSIC_CONFIG !== 'undefined' &&
        GAME_MUSIC_CONFIG.proceduralSettings &&
        GAME_MUSIC_CONFIG.proceduralSettings.templates) {
        template = GAME_MUSIC_CONFIG.proceduralSettings.templates[soundType];
    }

    // Special handling for noise-based sounds
    if (template && template.waveform === 'noise') {
        this.playNoiseSound(soundType, volume, template);
        return;
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Use template if available, otherwise fallback to hardcoded
    if (template) {
        // Apply waveform
        oscillator.type = template.waveform === 'noise' ? 'sawtooth' : template.waveform;

        // Apply frequency with random variation if specified
        let freq = template.frequency || 440;
        if (template.randomPitch) {
            freq *= (1 + (Math.random() - 0.5) * 2 * template.randomPitch);
        }
        oscillator.frequency.value = freq;

        // Apply modulation if specified
        if (template.modulation) {
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            lfo.frequency.value = template.modulation.rate || 10;
            lfoGain.gain.value = template.modulation.depth || 100;
            lfo.connect(lfoGain);
            lfoGain.connect(oscillator.frequency);
            lfo.start();
            lfo.stop(this.audioContext.currentTime + (template.duration / 1000 || 1));
        }

        // Apply envelope
        const now = this.audioContext.currentTime;
        const env = template.envelope;
        if (env) {
            const attack = (env.attack || 0) / 1000;
            const decay = (env.decay || 100) / 1000;
            const sustain = (env.sustain || 0) / 1000;
            const release = (env.release || 0) / 1000;

            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(volume, now + attack);
            gainNode.gain.linearRampToValueAtTime(volume * 0.7, now + attack + decay);
            if (sustain > 0) {
                gainNode.gain.setValueAtTime(volume * 0.7, now + attack + decay + sustain);
            }
            gainNode.gain.linearRampToValueAtTime(0.01, now + attack + decay + sustain + release);
        } else {
            // Simple fade out
            gainNode.gain.setValueAtTime(volume, now);
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (template.duration / 1000 || 0.1));
        }

        // Apply filter if specified
        if (template.filter) {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = template.filter.type || 'lowpass';
            filter.frequency.value = template.filter.frequency || 1000;
            oscillator.connect(filter);
            filter.connect(gainNode);
        } else {
            oscillator.connect(gainNode);
        }

    } else {
        // Fallback to original hardcoded sounds
        switch(soundType) {
            case 'shoot':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 300;
                gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
                break;
            case 'explosion':
                oscillator.type = 'sawtooth';
                oscillator.frequency.value = 50;
                gainNode.gain.setValueAtTime(volume * 0.5, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
                break;
            case 'hit':
                oscillator.type = 'square';
                oscillator.frequency.value = 150;
                gainNode.gain.setValueAtTime(volume * 0.2, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
                break;
            case 'plant':
                oscillator.type = 'square';
                oscillator.frequency.value = 200;
                gainNode.gain.setValueAtTime(volume * 0.3, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
                break;
            case 'type':
                oscillator.type = 'sine';
                oscillator.frequency.value = 1000 + Math.random() * 200;
                gainNode.gain.setValueAtTime(volume * 0.05, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.03);
                break;
            default:
                oscillator.type = 'sine';
                oscillator.frequency.value = 440;
                gainNode.gain.setValueAtTime(volume * 0.1, this.audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        }
        oscillator.connect(gainNode);
    }

    gainNode.connect(this.audioContext.destination);
    oscillator.start();

    // Stop after duration or 1 second
    const duration = template ? (template.duration / 1000 || 1) : 1;
    oscillator.stop(this.audioContext.currentTime + duration);
}

// Helper function for noise-based sounds
CyberOpsGame.prototype.playNoiseSound = function(soundType, volume, template) {
    if (!this.audioContext) return;

    const bufferSize = 4096;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const gainNode = this.audioContext.createGain();

    // Apply filter for colored noise
    if (template.filter) {
        const filter = this.audioContext.createBiquadFilter();
        filter.type = template.filter.type || 'lowpass';
        filter.frequency.value = template.filter.frequency || 200;
        noise.connect(filter);
        filter.connect(gainNode);
    } else {
        noise.connect(gainNode);
    }

    // Apply envelope
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + (template.duration / 1000 || 0.1));

    gainNode.connect(this.audioContext.destination);
    noise.start();
    noise.stop(now + (template.duration / 1000 || 0.1));
}