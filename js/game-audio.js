    // Audio System
CyberOpsGame.prototype.initializeAudio = function() {
        // Initialize audio variables - DON'T create AudioContext yet!
        this.audioContext = null;
        this.splashMusicNode = null;
        this.mainMenuMusicNode = null;
        this.levelMusicNode = null; // Fix: Added missing level music node
        this.creditsMusicNode = null; // Fix: Added missing credits music node
        this.audioEnabled = false; // Start with audio disabled
        this.splashMusicData = null;
        this.mainMenuMusicData = null;
        
        // Get HTML5 audio elements
        this.gameAudio = document.getElementById('gameMusic');
        
        // Get level music elements
        this.levelMusicElements = {
            1: document.getElementById('levelMusic1'),
            2: document.getElementById('levelMusic2'),
            3: document.getElementById('levelMusic3'),
            4: document.getElementById('levelMusic4'),
            5: document.getElementById('levelMusic5')
        };
        
        // Get credits music element
        this.creditsAudio = document.getElementById('creditsMusic');
        
        // Set initial volume for all audio elements
        if (this.gameAudio) this.gameAudio.volume = 0.25;
        
        Object.values(this.levelMusicElements).forEach(audio => {
            if (audio) {
                audio.volume = 0.3; // Slightly higher volume for level music
                audio.loop = true; // Loop level music
            }
        });
        
        // Set initial volume for credits music
        if (this.creditsAudio) {
            this.creditsAudio.volume = 0.2; // Lower volume for credits
        }
        
        // Track current level music
        this.currentLevelMusic = null;
        this.currentLevelMusicElement = null;
        
        // Track level music interval for procedural music
        this.levelMusicInterval = null;
        
        // Track credits music state
        this.creditsPlaying = false;
        
        console.log('Audio system initialized, waiting for user interaction...');
}
    
CyberOpsGame.prototype.enableAudioImmediately = function() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSplashMusic();
            this.generateMainMenuMusic();
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
        // Start appropriate music based on current screen
        setTimeout(() => {
            if (this.currentScreen === 'splash') {
                this.playSplashMusic();
            } else if (this.currentScreen === 'menu') {
                this.playMainMenuMusic();
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
            // Remove listeners
            document.removeEventListener('click', resumeHandler);
            document.removeEventListener('touchstart', resumeHandler);
            document.removeEventListener('keydown', resumeHandler);
        };
        
        document.addEventListener('click', resumeHandler, { once: true });
        document.addEventListener('touchstart', resumeHandler, { once: true });
        document.addEventListener('keydown', resumeHandler, { once: true });
}
    
CyberOpsGame.prototype.generateSplashMusic = function() {
        // Cyberpunk demoscene style splash melody (covers ~9 seconds of splashes)
        this.splashMusicData = {
            tempo: 140, // Faster, more energetic
            notes: [
                // Intro arpeggio (company logo - 3 seconds)
                { freq: 220.00, duration: 0.3 }, // A3
                { freq: 261.63, duration: 0.3 }, // C4
                { freq: 329.63, duration: 0.3 }, // E4
                { freq: 440.00, duration: 0.3 }, // A4
                { freq: 523.25, duration: 0.3 }, // C5
                { freq: 659.25, duration: 0.3 }, // E5
                { freq: 880.00, duration: 0.6 }, // A5
                { freq: 0, duration: 0.3 }, // Rest
                
                // Main pulse (studio logo - 3 seconds)
                { freq: 146.83, duration: 0.4 }, // D3 (bass)
                { freq: 293.66, duration: 0.2 }, // D4
                { freq: 369.99, duration: 0.2 }, // F#4
                { freq: 440.00, duration: 0.4 }, // A4
                { freq: 146.83, duration: 0.4 }, // D3 (bass)
                { freq: 293.66, duration: 0.2 }, // D4
                { freq: 392.00, duration: 0.2 }, // G4
                { freq: 466.16, duration: 0.4 }, // A#4
                { freq: 0, duration: 0.2 }, // Rest
                
                // Climax sequence (loading screen - 3 seconds)
                { freq: 174.61, duration: 0.3 }, // F3
                { freq: 220.00, duration: 0.3 }, // A3
                { freq: 277.18, duration: 0.3 }, // C#4
                { freq: 349.23, duration: 0.3 }, // F4
                { freq: 440.00, duration: 0.3 }, // A4
                { freq: 554.37, duration: 0.3 }, // C#5
                { freq: 698.46, duration: 0.6 }, // F5
                { freq: 880.00, duration: 0.6 }, // A5 (peak)
                { freq: 0, duration: 0.3 }, // Final rest
            ]
        };
        console.log('Cyberpunk splash music generated (9 seconds)');
}
    
CyberOpsGame.prototype.generateMainMenuMusic = function() {
        // Atmospheric cyberpunk main menu ambient (looping)
        this.mainMenuMusicData = {
            tempo: 85, // Slower, more atmospheric
            notes: [
                // Dark ambient pad
                { freq: 130.81, duration: 1.5 }, // C3 (deep bass)
                { freq: 164.81, duration: 1.0 }, // E3
                { freq: 196.00, duration: 1.0 }, // G3
                { freq: 220.00, duration: 1.5 }, // A3
                { freq: 0, duration: 0.5 }, // Rest
                
                // Cyberpunk arpeggiated sequence
                { freq: 261.63, duration: 0.4 }, // C4
                { freq: 311.13, duration: 0.4 }, // D#4
                { freq: 369.99, duration: 0.4 }, // F#4
                { freq: 440.00, duration: 0.8 }, // A4
                { freq: 523.25, duration: 0.4 }, // C5
                { freq: 622.25, duration: 0.4 }, // D#5
                { freq: 739.99, duration: 0.4 }, // F#5
                { freq: 880.00, duration: 1.2 }, // A5
                
                // Descending resolution
                { freq: 783.99, duration: 0.6 }, // G5
                { freq: 659.25, duration: 0.6 }, // E5
                { freq: 523.25, duration: 0.6 }, // C5
                { freq: 440.00, duration: 1.2 }, // A4
                { freq: 0, duration: 1.0 }, // Long rest before loop
            ]
        };
        console.log('Atmospheric cyberpunk menu music generated');
}
    
CyberOpsGame.prototype.playProcedualMusic = function(musicData) {
        if (!this.audioContext || !musicData) return null;
        
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime); // Slightly louder for better presence
        
        let currentTime = this.audioContext.currentTime;
        
        const playSequence = () => {
            musicData.notes.forEach((note) => {
                if (note.freq > 0) {
                    const oscillator = this.audioContext.createOscillator();
                    const noteGain = this.audioContext.createGain();
                    
                    // Use square wave for authentic 8-bit sound with slight variation
                    oscillator.type = note.freq < 300 ? 'sawtooth' : 'square'; // Bass uses sawtooth, highs use square
                    oscillator.frequency.setValueAtTime(note.freq, currentTime);
                    
                    // Enhanced envelope for more dynamic 8-bit sound
                    noteGain.gain.setValueAtTime(0, currentTime);
                    noteGain.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
                    noteGain.gain.linearRampToValueAtTime(0.3, currentTime + note.duration * 0.3);
                    noteGain.gain.exponentialRampToValueAtTime(0.05, currentTime + note.duration);
                    
                    oscillator.connect(noteGain);
                    noteGain.connect(gainNode);
                    
                    oscillator.start(currentTime);
                    oscillator.stop(currentTime + note.duration);
                }
                currentTime += note.duration;
            });
            
            // Schedule next repetition
            setTimeout(() => {
                if (gainNode.context.state === 'running') {
                    playSequence();
                }
            }, (currentTime - this.audioContext.currentTime) * 1000);
        };
        
        // Only play if audio context exists and is running
        if (this.audioContext && this.audioContext.state === 'running') {
            playSequence();
        } else if (this.audioContext) {
            console.log('Audio context not running, state:', this.audioContext.state);
        } else {
            console.log('Audio context not created yet');
        }
        
        return gainNode;
}
    
CyberOpsGame.prototype.playSplashMusic = function() {
        console.log('playSplashMusic called:');
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- gameAudio exists:', !!this.gameAudio);
        console.log('- gameAudio element:', this.gameAudio);
        
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping splash music');
            return;
        }
        
        if (!this.gameAudio) {
            console.warn('Game audio element not found, falling back to procedural music');
            this.playProceduralSplashMusic();
            return;
        }
        
        console.log('Starting splash music from beginning...');
        console.log('- gameAudio.src:', this.gameAudio.src || this.gameAudio.currentSrc);
        console.log('- gameAudio.readyState:', this.gameAudio.readyState);
        console.log('- gameAudio.networkState:', this.gameAudio.networkState);
        
        // Start from beginning (splash part: 0-10.6 seconds)
        this.gameAudio.currentTime = 0;
        this.gameAudio.play().then(() => {
            console.log('✅ Game music started successfully from splash section');
            console.log('- currentTime:', this.gameAudio.currentTime);
            console.log('- duration:', this.gameAudio.duration);
        }).catch(error => {
            console.warn('❌ Failed to play game music:', error);
            console.log('Falling back to procedural splash music...');
            // Fallback to procedural music if WAV fails
            this.playProceduralSplashMusic();
        });
}
    
CyberOpsGame.prototype.stopSplashMusic = function() {
        // Don't actually stop the music - just note that splash section is over
        console.log('Splash music section completed, transitioning to menu section');
        
        // Stop procedural music if it's playing as fallback
        if (this.splashMusicNode) {
            this.splashMusicNode.disconnect();
            this.splashMusicNode = null;
        }
}
    
CyberOpsGame.prototype.playMainMenuMusic = function() {
        console.log('playMainMenuMusic called:');
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- gameAudio exists:', !!this.gameAudio);
        console.log('- MUSIC_MENU_START_TIME:', this.MUSIC_MENU_START_TIME);
        
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping main menu music');
            return;
        }
        
        if (!this.gameAudio) {
            console.warn('Game audio element not found, falling back to procedural music');
            this.playProceduralMainMenuMusic();
            return;
        }
        
        console.log('Transitioning to main menu music section...');
        console.log('- Current time before seek:', this.gameAudio.currentTime);
        console.log('- Seeking to:', this.MUSIC_MENU_START_TIME);
        
        // Seek to main menu section (after 10.6 seconds of splash music)
        this.gameAudio.currentTime = this.MUSIC_MENU_START_TIME;
        
        // Make sure music is playing
        if (this.gameAudio.paused) {
            this.gameAudio.play().then(() => {
                console.log('✅ Game music resumed from menu section (' + this.MUSIC_MENU_START_TIME + 's)');
                console.log('- Actual currentTime after seek:', this.gameAudio.currentTime);
            }).catch(error => {
                console.warn('❌ Failed to resume game music at menu section:', error);
                console.log('Falling back to procedural main menu music...');
                // Fallback to procedural music if WAV fails
                this.playProceduralMainMenuMusic();
            });
        } else {
            console.log('✅ Game music seeked to menu section (' + this.MUSIC_MENU_START_TIME + 's)');
            console.log('- Actual currentTime after seek:', this.gameAudio.currentTime);
        }
}
    
CyberOpsGame.prototype.stopMainMenuMusic = function() {
        if (this.gameAudio && !this.gameAudio.paused) {
            this.gameAudio.pause();
            this.gameAudio.currentTime = 0;
            console.log('Game music stopped completely');
        }
        
        // Stop procedural music if it's playing as fallback
        if (this.mainMenuMusicNode) {
            this.mainMenuMusicNode.disconnect();
            this.mainMenuMusicNode = null;
        }
        
        if (this.mainMenuMusicInterval) {
            clearInterval(this.mainMenuMusicInterval);
            this.mainMenuMusicInterval = null;
        }
}

    // Level Music System
CyberOpsGame.prototype.playLevelMusic = function(levelNumber) {
        console.log(`🎵 playLevelMusic(${levelNumber}) called:`);
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- levelMusicElements:', this.levelMusicElements);
        
        if (!this.audioEnabled) {
            console.log('❌ Audio not enabled, skipping level music');
            return;
        }
        
        console.log(`🎮 Starting level ${levelNumber} music...`);
        
        // Stop any current level music (starting new level)
        this.stopLevelMusic();
        
        // Stop main menu music  
        this.stopMainMenuMusic();
        
        // Get the audio element for this level
        const levelAudio = this.levelMusicElements[levelNumber];
        console.log(`- levelAudio for level ${levelNumber}:`, levelAudio);

        if (!levelAudio) {
            console.warn(`❌ No audio element found for level ${levelNumber}, trying dynamic load`);
            this.tryDynamicMusicLoad(levelNumber);
            return;
        }

        console.log(`- levelAudio.src:`, levelAudio.src || levelAudio.currentSrc);
        console.log(`- levelAudio.readyState:`, levelAudio.readyState);

        // Set current level music tracking
        this.currentLevelMusic = levelNumber;
        this.currentLevelMusicElement = levelAudio;

        // Apply volume settings
        levelAudio.volume = (this.musicVolume || 0.3) * (this.masterVolume || 1);

        // Play the level music
        levelAudio.currentTime = 0;
        levelAudio.play().then(() => {
            console.log(`✅ Level ${levelNumber} music started successfully`);
        }).catch(async error => {
            console.warn(`❌ Failed to play level ${levelNumber} music:`, error);
            console.log('🎵 Trying dynamic load with MP3 fallback...');
            await this.tryDynamicMusicLoad(levelNumber);
        });
}
    
// Try to dynamically load music with format fallback
CyberOpsGame.prototype.tryDynamicMusicLoad = async function(levelNumber) {
        console.log(`🎵 Attempting dynamic music load for level ${levelNumber}`);

        // If we have the audio loader, use it
        if (this.loadAudioFile) {
            try {
                const audio = await this.loadAudioFile(`game-level-${levelNumber}`);
                if (audio) {
                    audio.loop = true;
                    audio.volume = (this.musicVolume || 0.3) * (this.masterVolume || 1);

                    // Stop any current music
                    this.stopLevelMusic();

                    // Play the loaded audio
                    audio.play();
                    this.currentLevelMusicElement = audio;
                    this.currentLevelMusic = levelNumber;
                    console.log(`✅ Successfully loaded and playing level ${levelNumber} music via dynamic load`);
                    return;
                }
            } catch (err) {
                console.log(`Dynamic load failed: ${err.message}`);
            }
        }

        // If dynamic load fails or unavailable, try creating new audio element with multiple sources
        console.log('Trying manual audio element creation with format fallback...');
        const audio = new Audio();
        audio.loop = true;
        audio.volume = (this.musicVolume || 0.3) * (this.masterVolume || 1);

        // Try formats in order
        const formats = [
            { ext: '.wav', type: 'audio/wav' },
            { ext: '.mp3', type: 'audio/mpeg' },
            { ext: '.ogg', type: 'audio/ogg' }
        ];

        let loaded = false;
        for (const format of formats) {
            if (!loaded) {
                const url = `game-level-${levelNumber}${format.ext}`;
                console.log(`Trying ${url}...`);

                await new Promise((resolve) => {
                    audio.src = url;

                    const loadHandler = () => {
                        console.log(`✅ Loaded ${url} successfully`);
                        loaded = true;

                        // Stop any current music
                        this.stopLevelMusic();

                        // Play the audio
                        audio.play().then(() => {
                            this.currentLevelMusicElement = audio;
                            this.currentLevelMusic = levelNumber;
                            console.log(`✅ Playing level ${levelNumber} music from ${url}`);
                        }).catch(err => {
                            console.log(`Failed to play ${url}: ${err.message}`);
                        });

                        audio.removeEventListener('canplaythrough', loadHandler);
                        audio.removeEventListener('error', errorHandler);
                        resolve();
                    };

                    const errorHandler = () => {
                        console.log(`Failed to load ${url}`);
                        audio.removeEventListener('canplaythrough', loadHandler);
                        audio.removeEventListener('error', errorHandler);
                        resolve();
                    };

                    audio.addEventListener('canplaythrough', loadHandler, { once: true });
                    audio.addEventListener('error', errorHandler, { once: true });

                    // Timeout after 2 seconds
                    setTimeout(resolve, 2000);
                });
            }
        }

        // If all formats fail, fall back to procedural music
        if (!loaded) {
            console.log('All audio formats failed, falling back to procedural music');
            this.playProceduralLevelMusic(levelNumber);
        }
};

CyberOpsGame.prototype.stopLevelMusic = function() {
        console.log('🛑 stopLevelMusic() called:');
        console.log('- currentLevelMusicElement exists:', !!this.currentLevelMusicElement);
        console.log('- currentLevelMusic:', this.currentLevelMusic);
        console.log('- levelMusicNode exists:', !!this.levelMusicNode);
        
        if (this.currentLevelMusicElement) {
            this.currentLevelMusicElement.pause();
            this.currentLevelMusicElement.currentTime = 0;
            console.log(`✅ Level ${this.currentLevelMusic} HTML5 music stopped`);
        }
        
        this.currentLevelMusic = null;
        this.currentLevelMusicElement = null;
        
        // Also stop any procedural level music
        if (this.levelMusicNode) {
            this.levelMusicNode.disconnect();
            this.levelMusicNode = null;
            console.log('✅ Procedural level music stopped');
        }
        
        // Clear level music interval
        if (this.levelMusicInterval) {
            clearInterval(this.levelMusicInterval);
            this.levelMusicInterval = null;
            console.log('✅ Level music interval cleared');
        }
}
    
CyberOpsGame.prototype.pauseLevelMusic = function() {
        if (this.currentLevelMusicElement && !this.currentLevelMusicElement.paused) {
            this.currentLevelMusicElement.pause();
            console.log(`Level ${this.currentLevelMusic} music paused`);
        }
}
    
CyberOpsGame.prototype.resumeLevelMusic = function() {
        if (this.currentLevelMusicElement && this.currentLevelMusicElement.paused) {
            this.currentLevelMusicElement.play().then(() => {
                console.log(`Level ${this.currentLevelMusic} music resumed`);
            }).catch(error => {
                console.warn('Failed to resume level music:', error);
            });
        }
}
    
    // Fallback procedural music for levels
CyberOpsGame.prototype.playProceduralLevelMusic = function(levelNumber) {
        console.log(`🎵 playProceduralLevelMusic(${levelNumber}) called:`);
        console.log('- audioContext:', this.audioContext);
        console.log('- audioContext state:', this.audioContext ? this.audioContext.state : 'null');
        
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural level music');
            return;
        }
        
        console.log(`🎶 Playing procedural music for level ${levelNumber} as fallback`);
        
        // Generate different music data based on level
        const levelMusicData = this.generateLevelMusicData(levelNumber);
        console.log('- levelMusicData generated:', levelMusicData);
        
        // Stop any existing level music node first
        if (this.levelMusicNode) {
            console.log('- Stopping previous procedural level music');
            this.levelMusicNode.disconnect();
            this.levelMusicNode = null;
        }
        
        // Clear any level music interval
        if (this.levelMusicInterval) {
            clearInterval(this.levelMusicInterval);
            this.levelMusicInterval = null;
        }
        
        this.levelMusicNode = this.playProcedualMusic(levelMusicData);
        console.log('- levelMusicNode created:', !!this.levelMusicNode);
        
        // Set up loop interval for continuous play (in case the music stops)
        const totalDuration = levelMusicData.notes.reduce((sum, note) => sum + note.duration, 0) * 1000; // Convert to milliseconds
        this.levelMusicInterval = setInterval(() => {
            if (this.levelMusicNode && this.audioContext && this.audioContext.state === 'running') {
                // Music should be looping via the playProcedualMusic function
                console.log(`🔄 Level ${levelNumber} procedural music loop check - still running`);
            }
        }, totalDuration + 1000); // Check slightly after each loop should complete
}
    
CyberOpsGame.prototype.generateLevelMusicData = function(levelNumber) {
        // Create different musical themes for each level
        const levelThemes = {
            1: { // Corporate Infiltration - Tense, electronic
                tempo: 120,
                baseFreq: 220,
                pattern: [1, 0.75, 1, 1.25, 0.5, 1, 1.5, 0.75]
            },
            2: { // Government Hack - Dark, methodical  
                tempo: 100,
                baseFreq: 196,
                pattern: [1, 1, 0.5, 1.5, 1, 0.75, 1.25, 1]
            },
            3: { // Industrial Sabotage - Heavy, rhythmic
                tempo: 140,
                baseFreq: 146,
                pattern: [2, 1, 2, 1, 1.5, 1, 2, 0.5]
            },
            4: { // Assassination - Stealthy, ambient
                tempo: 90,
                baseFreq: 261,
                pattern: [0.5, 1, 0.75, 1.5, 0.5, 1.25, 1, 0.75]
            },
            5: { // Final Fortress - Epic, intense
                tempo: 160,
                baseFreq: 174,
                pattern: [2, 1.5, 2, 1, 1.5, 2, 1, 1.5]
            }
        };
        
        const theme = levelThemes[levelNumber] || levelThemes[1];
        const notes = [];
        
        // Generate notes based on theme pattern
        theme.pattern.forEach(multiplier => {
            notes.push({ freq: theme.baseFreq * multiplier, duration: 0.5 });
        });
        
        return {
            tempo: theme.tempo,
            notes: notes
        };
}

    // Credits Music System
CyberOpsGame.prototype.playCreditsMusic = function() {
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping credits music');
            return;
        }
        
        if (this.creditsPlaying) {
            console.log('Credits music already playing, not restarting');
            return; // Don't restart if already playing
        }
        
        console.log('Starting credits music...');
        console.log('- creditsAudio exists:', !!this.creditsAudio);
        console.log('- creditsAudio element:', this.creditsAudio);
        
        // Stop any current level music and main menu music (credits starting)
        this.stopLevelMusic();
        this.stopMainMenuMusic();
        
        if (!this.creditsAudio) {
            console.warn('No credits audio element found, falling back to procedural music');
            this.playProceduralCreditsMusic();
            return;
        }
        
        console.log('- creditsAudio.src:', this.creditsAudio.src || this.creditsAudio.currentSrc);
        console.log('- creditsAudio.readyState:', this.creditsAudio.readyState);
        
        this.creditsPlaying = true;
        
        // Play the credits music
        this.creditsAudio.currentTime = 0;
        this.creditsAudio.play().then(() => {
            console.log('✅ Credits music started successfully');
        }).catch(error => {
            console.warn('❌ Failed to play credits music:', error);
            console.log('Falling back to procedural credits music...');
            this.playProceduralCreditsMusic();
        });
}
    
CyberOpsGame.prototype.stopCreditsMusic = function() {
        if (this.creditsAudio && this.creditsPlaying) {
            this.creditsAudio.pause();
            this.creditsAudio.currentTime = 0;
            console.log('Credits music stopped');
        }
        
        this.creditsPlaying = false;
        
        // Also stop procedural credits music if it's playing
        if (this.creditsMusicNode) {
            this.creditsMusicNode.disconnect();
            this.creditsMusicNode = null;
        }
}
    
    // Fallback procedural credits music
CyberOpsGame.prototype.playProceduralCreditsMusic = function() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural credits music');
            return;
        }
        
        console.log('🎵 Playing procedural credits music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        this.creditsPlaying = true;
        
        // Generate triumphant, celebratory music data for credits
        const creditsMusicData = {
            tempo: 110, // Moderate, celebratory tempo
            notes: [
                { freq: 261.63, duration: 1.0 }, // C4
                { freq: 329.63, duration: 1.0 }, // E4
                { freq: 392.00, duration: 1.0 }, // G4
                { freq: 523.25, duration: 1.5 }, // C5
                { freq: 659.25, duration: 0.5 }, // E5
                { freq: 783.99, duration: 0.5 }, // G5
                { freq: 1046.5, duration: 2.0 }, // C6 (high, triumphant)
                { freq: 783.99, duration: 1.0 }, // G5
                { freq: 659.25, duration: 1.0 }, // E5
                { freq: 523.25, duration: 1.5 }, // C5
                { freq: 0, duration: 1.0 }, // Rest
            ]
        };
        
        console.log('- Credits music data:', creditsMusicData);
        this.creditsMusicNode = this.playProcedualMusic(creditsMusicData);
}
    
    // Fallback procedural music functions
CyberOpsGame.prototype.playProceduralSplashMusic = function() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural splash music');
            return;
        }
        if (!this.splashMusicData) {
            console.log('❌ No splash music data available for procedural music');
            return;
        }
        console.log('🎵 Playing procedural splash music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        console.log('- Splash music data:', this.splashMusicData);
        this.splashMusicNode = this.playProcedualMusic(this.splashMusicData);
}
    
CyberOpsGame.prototype.playProceduralMainMenuMusic = function() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural main menu music');
            return;
        }
        if (!this.mainMenuMusicData) {
            console.log('❌ No main menu music data available for procedural music');
            return;
        }
        console.log('🎵 Playing procedural main menu music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        console.log('- Main menu music data:', this.mainMenuMusicData);
        this.mainMenuMusicNode = this.playProcedualMusic(this.mainMenuMusicData);
        // Loop the music every ~13 seconds
        this.mainMenuMusicInterval = setInterval(() => {
            if (this.mainMenuMusicNode) {
                this.mainMenuMusicNode.disconnect();
            }
            this.mainMenuMusicNode = this.playProcedualMusic(this.mainMenuMusicData);
        }, 13000);
}
    
    // Setup audio interaction handler (browser autoplay policy)
CyberOpsGame.prototype.setupAudioInteraction = function() {
        const enableAudio = () => {
            if (!this.audioEnabled) {
                this.audioEnabled = true;
                
                try {
                    // NOW create AudioContext after user interaction
                    console.log('Creating AudioContext after user interaction...');
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Generate music data
                    this.generateSplashMusic();
                    this.generateMainMenuMusic();
                    
                    console.log('AudioContext created successfully!');
                    console.log('Audio context state:', this.audioContext.state);
                    
                    // Start appropriate music based on current screen
                    if (this.currentScreen === 'splash') {
                        this.playSplashMusic();
                    } else if (this.currentScreen === 'menu') {
                        this.playMainMenuMusic();
                    }
                    
                    console.log('Audio enabled after user interaction');
                    console.log('Current screen:', this.currentScreen);
                    
                    // Store permission in session storage to avoid re-asking after F5
                    sessionStorage.setItem('cyberops_audio_enabled', 'true');
                    
                } catch (error) {
                    console.warn('Failed to create AudioContext:', error);
                    this.audioEnabled = false;
                }
            }
        };
        
        // Listen for any user interaction to enable audio
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        
        const setupInteraction = (event) => {
            enableAudio();
            
            // After enabling audio, check if this was a skip click
            if (event.type === 'click' && this.currentScreen === 'splash') {
                // Give audio a moment to start, then allow skipping
                setTimeout(() => {
                    if (event.target.closest('#companyLogo') || 
                        event.target.closest('#studioLogo') || 
                        event.target.closest('#loadingScreen')) {
                        console.log('Skip triggered after audio enabled');
                        this.skipToMainMenu();
                    }
                }, 500); // Half second to hear splash music before skipping
            }
            
            // Remove all listeners after first interaction
            interactionEvents.forEach(eventType => {
                document.removeEventListener(eventType, setupInteraction);
            });
        };
        
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, setupInteraction, { once: true });
        });
}
    
    // Handle audio resume (used internally)
CyberOpsGame.prototype.resumeAudioContext = function() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume().then(() => {
                console.log('Audio context resumed successfully');
                return true;
            }).catch(() => {
                console.log('Failed to resume audio context');
                return false;
            });
        }
        return Promise.resolve(true);
}
    
CyberOpsGame.prototype.animateProgressBar = function(callback) {
        const progressBar = document.querySelector('.loading-progress');
        const gameTitle = document.querySelector('.loading-screen .game-title');
        
        // Reset progress bar
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 3s ease-out';
        
        // Start progress animation
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
        
        // After progress completes, trigger beam effect
        setTimeout(() => {
            // Add beam effect to game title
            if (gameTitle) {
                gameTitle.classList.add('beam-sweep');
                
                // After beam completes, trigger flash effect
                setTimeout(() => {
                    gameTitle.classList.remove('beam-sweep');
                    
                    // Trigger flash/blind effect
                    this.triggerFlashTransition(() => {
                        if (callback) callback();
                    });
                }, 1000); // Beam animation duration
            } else {
                if (callback) callback();
            }
        }, 3000); // Progress bar duration
}
    
CyberOpsGame.prototype.triggerFlashTransition = function(callback) {
        // Create flash overlay
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'flash-overlay';
        document.body.appendChild(flashOverlay);
        
        // Trigger flash animation
        setTimeout(() => {
            flashOverlay.classList.add('flash-active');
            
            // Right after flash peaks, immediately hide loading and show menu
            setTimeout(() => {
                // Call callback immediately (hides loading, shows menu)
                if (callback) callback();
                
                // Then start flash fade out
                flashOverlay.classList.add('flash-fade-out');
                
                // Remove overlay after fade completes
                setTimeout(() => {
                    document.body.removeChild(flashOverlay);
                }, 150); // Quick fade out
            }, 200); // Flash peak duration
        }, 50); // Brief delay before flash starts
}
    
