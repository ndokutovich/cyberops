/**
 * Dynamic Audio Loader with format fallback support
 * Tries to load audio files in order: WAV -> MP3 -> OGG -> Synthesized fallback
 */

CyberOpsGame.prototype.initAudioLoader = function() {
    // Cache for loaded audio buffers
    this.audioCache = new Map();

    // Supported audio formats in order of preference
    this.audioFormats = ['.wav', '.mp3', '.ogg'];

    // Track which formats are supported by browser
    this.detectAudioSupport();
};

// Detect browser audio format support
CyberOpsGame.prototype.detectAudioSupport = function() {
    const audio = document.createElement('audio');
    this.audioSupport = {
        wav: audio.canPlayType('audio/wav') !== '',
        mp3: audio.canPlayType('audio/mpeg') !== '',
        ogg: audio.canPlayType('audio/ogg') !== ''
    };

    console.log('Audio format support:', this.audioSupport);
};

// Load audio file with format fallback
CyberOpsGame.prototype.loadAudioFile = async function(baseName, baseFolder = '') {
    // Check cache first
    if (this.audioCache.has(baseName)) {
        return this.audioCache.get(baseName);
    }

    // Build list of formats to try based on browser support
    const formatsToTry = [];
    if (this.audioSupport.wav) formatsToTry.push('.wav');
    if (this.audioSupport.mp3) formatsToTry.push('.mp3');
    if (this.audioSupport.ogg) formatsToTry.push('.ogg');

    // Try each format
    for (const format of formatsToTry) {
        const url = baseFolder + baseName + format;
        try {
            const audio = await this.tryLoadAudio(url);
            if (audio) {
                console.log(`Successfully loaded ${baseName}${format}`);
                this.audioCache.set(baseName, audio);
                return audio;
            }
        } catch (err) {
            console.log(`Failed to load ${url}, trying next format...`);
        }
    }

    // All formats failed
    console.warn(`Could not load audio file ${baseName} in any format`);
    return null;
};

// Try to load a specific audio URL
CyberOpsGame.prototype.tryLoadAudio = function(url) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();

        // Set up event handlers
        audio.addEventListener('canplaythrough', () => {
            resolve(audio);
        }, { once: true });

        audio.addEventListener('error', () => {
            reject(new Error(`Failed to load ${url}`));
        }, { once: true });

        // Start loading
        audio.src = url;
        audio.load();

        // Timeout after 5 seconds
        setTimeout(() => {
            reject(new Error(`Timeout loading ${url}`));
        }, 5000);
    });
};

// Load audio with Web Audio API for more control
CyberOpsGame.prototype.loadAudioBuffer = async function(baseName, baseFolder = '') {
    if (!this.audioContext) {
        return null;
    }

    // Check buffer cache
    const cacheKey = `buffer_${baseName}`;
    if (this.audioCache.has(cacheKey)) {
        return this.audioCache.get(cacheKey);
    }

    // Build list of formats to try
    const formatsToTry = [];
    if (this.audioSupport.wav) formatsToTry.push('.wav');
    if (this.audioSupport.mp3) formatsToTry.push('.mp3');
    if (this.audioSupport.ogg) formatsToTry.push('.ogg');

    // Try each format
    for (const format of formatsToTry) {
        const url = baseFolder + baseName + format;
        try {
            const response = await fetch(url);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                console.log(`Successfully loaded buffer for ${baseName}${format}`);
                this.audioCache.set(cacheKey, audioBuffer);
                return audioBuffer;
            }
        } catch (err) {
            console.log(`Failed to load buffer from ${url}, trying next format...`);
        }
    }

    console.warn(`Could not load audio buffer for ${baseName} in any format`);
    return null;
};

// Play audio buffer through Web Audio API
CyberOpsGame.prototype.playAudioBuffer = function(buffer, volume = 1.0) {
    if (!this.audioContext || !buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Apply volume settings
    gainNode.gain.value = volume * (this.sfxVolume || 1) * (this.masterVolume || 1);

    source.start(0);
    return source;
};

// Enhanced playSound with full fallback chain
CyberOpsGame.prototype.playSoundEnhanced = async function(soundName, volume = 0.5) {
    // Priority 1: Try HTML audio element (already has WAV/MP3 fallback in HTML)
    const audioElement = document.getElementById(soundName + 'Sound');
    if (audioElement && audioElement.readyState >= 2) {
        try {
            const audio = audioElement.cloneNode(true);
            audio.volume = volume * (this.sfxVolume || 1) * (this.masterVolume || 1);
            await audio.play();
            return;
        } catch (err) {
            console.log(`HTML audio failed for ${soundName}`);
        }
    }

    // Priority 2: Try loading file dynamically
    try {
        const audio = await this.loadAudioFile(`sfx-${soundName}`);
        if (audio) {
            audio.volume = volume * (this.sfxVolume || 1) * (this.masterVolume || 1);
            audio.currentTime = 0;
            await audio.play();
            return;
        }
    } catch (err) {
        console.log(`Dynamic load failed for ${soundName}`);
    }

    // Priority 3: Try Web Audio API buffer
    if (this.audioContext) {
        try {
            const buffer = await this.loadAudioBuffer(`sfx-${soundName}`);
            if (buffer) {
                this.playAudioBuffer(buffer, volume);
                return;
            }
        } catch (err) {
            console.log(`Buffer load failed for ${soundName}`);
        }
    }

    // Priority 4: Fall back to synthesized sound
    console.log(`All audio methods failed for ${soundName}, using synthesized`);
    this.playSynthSound(soundName, volume);
};

// Preload common sound effects
CyberOpsGame.prototype.preloadSounds = async function() {
    const sounds = ['shoot', 'explosion', 'hit', 'hack', 'shield'];

    console.log('Preloading sound effects...');

    for (const sound of sounds) {
        // Try to preload as audio buffer for best performance
        if (this.audioContext) {
            await this.loadAudioBuffer(`sfx-${sound}`);
        }
        // Also ensure HTML elements are loaded
        const element = document.getElementById(sound + 'Sound');
        if (element) {
            element.load();
        }
    }

    console.log('Sound preloading complete');
};

// Initialize audio loader on game start
if (typeof window !== 'undefined') {
    // Hook into game initialization
    const originalInit = CyberOpsGame.prototype.initializeAudio;
    CyberOpsGame.prototype.initializeAudio = function() {
        // Call original
        if (originalInit) {
            originalInit.call(this);
        }

        // Initialize audio loader
        this.initAudioLoader();

        // Preload sounds after a short delay
        setTimeout(() => {
            this.preloadSounds().catch(err => {
                console.warn('Sound preloading failed:', err);
            });
        }, 1000);
    };
}