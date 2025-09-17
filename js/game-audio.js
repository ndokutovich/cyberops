// Audio System - Core Audio Functionality Only
// Music is handled by:
// - game-screen-music.js for menu screens
// - game-music-system.js for missions
// - game-audio-redirects.js for backward compatibility

CyberOpsGame.prototype.initializeAudio = function() {
    // Initialize audio variables - DON'T create AudioContext yet!
    this.audioContext = null;
    this.audioEnabled = false; // Start with audio disabled

    console.log('Audio system initialized, waiting for user interaction...');
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
            this.playConfiguredSound(config, volume);
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

CyberOpsGame.prototype.playConfiguredSound = function(config, volume) {
    if (!config.file && !config.procedural) {
        return;
    }

    if (config.file) {
        // Try to play HTML audio file
        const audio = new Audio(config.file);
        audio.volume = (config.volume || 0.5) * volume;
        audio.play().catch(() => {
            // Fall back to procedural if file fails
            if (config.procedural) {
                this.playProceduralSound(config.type, volume);
            }
        });
    } else if (config.procedural) {
        this.playProceduralSound(config.type, volume);
    }
}

CyberOpsGame.prototype.playProceduralSound = function(soundType, volume) {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    // Configure sound based on type
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

        case 'shield':
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.setValueAtTime(volume * 0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            break;

        case 'click':
            oscillator.type = 'sine';
            oscillator.frequency.value = 600;
            gainNode.gain.setValueAtTime(volume * 0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
            break;

        case 'hack':
            oscillator.type = 'triangle';
            oscillator.frequency.value = 400;
            gainNode.gain.setValueAtTime(volume * 0.15, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
            break;

        default:
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            gainNode.gain.setValueAtTime(volume * 0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
    }

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 1); // Stop after 1 second max
}