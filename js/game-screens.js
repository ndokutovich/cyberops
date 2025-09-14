CyberOpsGame.prototype.showIntermissionDialog = function(victory) {
        // Hide game HUD
        document.getElementById('gameHUD').style.display = 'none';
        
        // Update dialog title and message
        const title = victory ? 'MISSION COMPLETE' : 'MISSION FAILED';
        const statusIcon = victory ? '✅' : '❌';
        const statusText = victory ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED';
        const statusColor = victory ? '#00ff00' : '#ff0000';
        
        document.getElementById('intermissionTitle').textContent = title;
        document.querySelector('.status-icon').textContent = statusIcon;
        document.querySelector('.status-text').textContent = statusText;
        document.querySelector('.status-text').style.color = statusColor;
        document.querySelector('.status-text').style.textShadow = `0 0 10px ${statusColor}`;
        
        // Update mission statistics
        document.getElementById('intermissionTime').textContent = document.getElementById('missionTimer').textContent;
        document.getElementById('intermissionEnemies').textContent = 
            this.enemies.filter(e => !e.alive).length + '/' + this.enemies.length;
        
        let completedObj = 0;
        if (this.currentMission.id === 1) {
            if (this.enemies.every(e => !e.alive)) completedObj++;
            if (victory) completedObj++;
            if (this.agents.filter(a => a.alive).length >= 2) completedObj++;
        } else {
            completedObj = this.map.terminals.filter(t => t.hacked).length;
            if (victory) completedObj++;
        }
        
        document.getElementById('intermissionObjectives').textContent = 
            `${completedObj}/${this.currentMission.objectives.length}`;
        document.getElementById('intermissionSquad').textContent = 
            `${this.agents.filter(a => a.alive).length}/${this.agents.length} Survived`;
        
        // Create action buttons based on mission outcome and progress
        const actionsContainer = document.getElementById('intermissionActions');
        actionsContainer.innerHTML = '';
        
        if (victory && this.currentMissionIndex < this.missions.length - 1) {
            // There's a next mission - show Continue button
            this.currentMissionIndex++;
            const continueBtn = document.createElement('button');
            continueBtn.className = 'menu-button';
            continueBtn.textContent = 'CONTINUE';
            continueBtn.onclick = () => this.continueToNextMission();
            actionsContainer.appendChild(continueBtn);
        } else if (victory) {
            // All missions completed - show Game Complete
            const completeBtn = document.createElement('button');
            completeBtn.className = 'menu-button';
            completeBtn.textContent = 'FINISH';
            completeBtn.onclick = () => this.finishCampaign();
            actionsContainer.appendChild(completeBtn);
        }
        
        // Always show Try Again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'menu-button';
        tryAgainBtn.textContent = 'TRY AGAIN';
        tryAgainBtn.onclick = () => this.tryAgainMission();
        actionsContainer.appendChild(tryAgainBtn);
        
        // Always show Main Menu button
        const mainMenuBtn = document.createElement('button');
        mainMenuBtn.className = 'menu-button';
        mainMenuBtn.textContent = 'MAIN MENU';
        mainMenuBtn.onclick = () => this.backToMainMenuFromIntermission();
        actionsContainer.appendChild(mainMenuBtn);
        
        // Show the dialog
        document.getElementById('intermissionDialog').classList.add('show');
}
    
CyberOpsGame.prototype.continueToNextMission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');

        // Apply medical healing between missions if researched
        this.applyMedicalHealing();

        // Return to hub after mission completion
        this.showSyndicateHub();
}
    
CyberOpsGame.prototype.tryAgainMission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        // Restart current mission - need to decrement since we incremented when showing dialog
        const currentMissionIndex = this.currentMissionIndex - 1;
        this.currentMission = this.missions[currentMissionIndex];
        this.startMission();
}
    
CyberOpsGame.prototype.finishCampaign = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.showGameCompleteScreen();
}
    
CyberOpsGame.prototype.backToMainMenuFromIntermission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.backToMainMenu();
}

CyberOpsGame.prototype.showGameCompleteScreen = function() {
        // Start credits music when game is completed
        this.playCreditsMusic();
        
        // Hide other screens
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'none';
        
        // Calculate final stats
        const totalMinutes = Math.floor(this.totalCampaignTime / 3600);
        const totalSeconds = Math.floor((this.totalCampaignTime % 3600) / 60);
        const timeString = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
        
        // Update stats display
        document.getElementById('finalMissions').textContent = `${this.completedMissions.length}/${this.missions.length}`;
        document.getElementById('finalTime').textContent = timeString;
        document.getElementById('finalEnemies').textContent = this.totalEnemiesDefeated;
        
        // Show completion screen
        document.getElementById('gameCompleteScreen').style.display = 'flex';
        this.currentScreen = 'complete';
}

CyberOpsGame.prototype.showCredits = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        
        // Don't restart credits music if it's already playing
        if (!this.creditsPlaying) {
            this.playCreditsMusic();
        }
        
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'flex';
        this.currentScreen = 'credits';
}

CyberOpsGame.prototype.restartCampaign = function() {
        // Stop credits music when restarting
        this.stopCreditsMusic();
        
        // Reset all progress
        this.currentMissionIndex = 0;
        this.completedMissions = [];
        this.totalCampaignTime = 0;
        this.totalEnemiesDefeated = 0;
        
        // Hide completion screen and start new campaign
        document.getElementById('gameCompleteScreen').style.display = 'none';
        this.showMissionBriefing(this.missions[0]);
}

CyberOpsGame.prototype.backToMainMenu = function() {
        // Stop all music including credits (returning to main menu)
        this.stopLevelMusic();
        this.stopCreditsMusic();
        
        // Hide all screens and dialogs
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('intermissionDialog').classList.remove('show');
        document.getElementById('hudDialog').classList.remove('show');
        document.getElementById('missionSelectDialog').classList.remove('show');
        
        // Show main menu
        document.getElementById('mainMenu').style.display = 'flex';
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
}
    
CyberOpsGame.prototype.showInitialScreen = function() {
        console.log('Showing initial start screen');
        this.currentScreen = 'initial';
        
        const initialScreen = document.getElementById('initialScreen');
        const resetButton = document.getElementById('resetButton');
        
        initialScreen.style.display = 'flex';
        
        // Remove existing event listener and add new one to avoid duplicates
        resetButton.replaceWith(resetButton.cloneNode(true));
        const newResetButton = document.getElementById('resetButton');
        
        // Handle reset button click
        newResetButton.addEventListener('click', () => {
            this.startGameExperience();
        });
}

CyberOpsGame.prototype.startGameExperience = function() {
        console.log('Starting game experience...');
        
        // Enable audio immediately on user interaction
        this.enableAudioOnInteraction();
        
        // Hide initial screen
        document.getElementById('initialScreen').style.display = 'none';
        
        // Check for saved game
        this.checkForSavedGame();
        
        // Start splash screens
        this.showSplashScreens();
}

CyberOpsGame.prototype.enableAudioOnInteraction = function() {
        this.audioEnabled = true;
        
        try {
            // Create AudioContext after user interaction (only once)
            if (!this.audioContext) {
                console.log('Creating AudioContext after user interaction...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Generate music data
                this.generateSplashMusic();
                this.generateMainMenuMusic();
                
                console.log('AudioContext created successfully!');
            }
            console.log('Audio context state:', this.audioContext.state);
            
            // Initialize audio elements if not done yet
            if (!this.audioElementsInitialized) {
                console.log('🎵 Initializing audio elements...');
                this.gameAudio = document.getElementById('gameMusic');
                this.creditsAudio = document.getElementById('creditsMusic');
                
                // Initialize level music elements
                this.levelMusicElements = {};
                for (let i = 1; i <= 5; i++) {
                    this.levelMusicElements[i] = document.getElementById(`levelMusic${i}`);
                }
                this.audioElementsInitialized = true;
            }
            
            // Debug audio elements
            console.log('Checking audio elements:');
            console.log('gameAudio:', !!this.gameAudio);
            console.log('creditsAudio:', !!this.creditsAudio);
            console.log('levelMusicElements count:', Object.keys(this.levelMusicElements).length);
            
            // Store permission for this session
            sessionStorage.setItem('cyberops_audio_enabled', 'true');
            
        } catch (error) {
            console.warn('Failed to create AudioContext:', error);
            this.audioEnabled = false;
        }
}
    
CyberOpsGame.prototype.showSplashScreens = function() {
        console.log('Starting splash sequence');
        this.currentScreen = 'splash'; // Set screen state for skip functionality
        
        // Setup click skip functionality
        this.setupSplashSkip();
        
        // Start splash music immediately (audio is enabled from user interaction)
        console.log('Attempting to start splash music. audioEnabled:', this.audioEnabled);
        if (this.audioEnabled) {
            console.log('Audio is enabled, calling playSplashMusic()');
            this.playSplashMusic();
        } else {
            console.log('Audio not enabled yet - will start when user interacts');
        }
        
        // Show company logo
        const companyLogo = document.getElementById('companyLogo');
        companyLogo.style.display = 'flex';
        companyLogo.classList.add('show');
        console.log('Showing company logo splash');
        
        this.splashTimeout1 = setTimeout(() => {
            if (this.splashSkipped) return;
            companyLogo.classList.remove('show');
            setTimeout(() => {
                companyLogo.style.display = 'none';
            }, 1000); // Wait for fade-out transition
            console.log('Hiding company logo, showing studio logo');
            
            // Show studio logo
            const studioLogo = document.getElementById('studioLogo');
            studioLogo.style.display = 'flex';
            studioLogo.classList.add('show');
            
            this.splashTimeout2 = setTimeout(() => {
                if (this.splashSkipped) return;
                // Add explode fade-out effect
                studioLogo.classList.add('fade-out-explode');
                console.log('Studio logo explode animation');
                
                this.splashTimeout3 = setTimeout(() => {
                    if (this.splashSkipped) return;
                    studioLogo.classList.remove('show', 'fade-out-explode');
                    setTimeout(() => {
                        studioLogo.style.display = 'none';
                    }, 1000); // Wait for fade-out transition
                    console.log('Hiding studio logo, showing loading screen');
                    
                    // Show loading screen
                    const loadingScreen = document.getElementById('loadingScreen');
                    loadingScreen.style.display = 'flex';
                    
                    // Start progress bar animation
                    this.animateProgressBar(() => {
                        // After flash effect completes in animateProgressBar
                        loadingScreen.style.display = 'none';
                        
                        // Show main menu with fade-in effect
                        const mainMenu = document.getElementById('mainMenu');
                        mainMenu.style.display = 'flex';
                        mainMenu.style.opacity = '0';
                        mainMenu.classList.remove('fade-in-from-flash'); // Reset
                        
                        setTimeout(() => {  
                            mainMenu.classList.add('fade-in-from-flash');
                        }, 50);
                        
                        this.currentScreen = 'menu';
                        this.updateMenuState();
                        
                        // Let music continue naturally - no seeking needed for smooth progression
                        if (this.audioEnabled && this.gameAudio) {
                            console.log('Natural splash progression - music continues seamlessly without seeking');
                            // No currentTime change - let music flow naturally
                        }
                        
                        console.log('🎬 Natural splash progression - starting demoscene timer');
                        this.startDemosceneIdleTimer();
                        
                        // Remove splash click handlers
                        this.removeSplashClickHandlers();
                        
                        // Clean up after animation
                        setTimeout(() => {
                            mainMenu.classList.remove('fade-in-from-flash');
                            mainMenu.style.opacity = '';
                        }, 4600); // Match new animation duration
                    });
                }, 500); // Explode animation duration
            }, 3000);  // Studio logo duration 
        }, 3000);  // Company logo duration
}
    
CyberOpsGame.prototype.setupSplashSkip = function() {
        this.splashSkipped = false;
        
        const skipHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (!this.splashSkipped && this.currentScreen === 'splash') {
                // Don't skip immediately - first start music for current splash screen
                if (!this.audioEnabled) {
                    // This will trigger audio activation and start splash music
                    console.log('Starting audio from splash screen click...');
                    return; // Let the audio interaction handler take care of it
                } else {
                    // Audio is already enabled, now skip
                    this.skipToMainMenu();
                }
            }
        };
        
        // Add click listeners to all splash screens
        document.getElementById('companyLogo').addEventListener('click', skipHandler);
        document.getElementById('studioLogo').addEventListener('click', skipHandler);
        document.getElementById('loadingScreen').addEventListener('click', skipHandler);
        
        // Store handler for cleanup
        this.splashClickHandler = skipHandler;
}
    
CyberOpsGame.prototype.skipToMainMenu = function() {
        this.splashSkipped = true;
        
        // Clear all splash timeouts
        if (this.splashTimeout1) clearTimeout(this.splashTimeout1);
        if (this.splashTimeout2) clearTimeout(this.splashTimeout2);
        if (this.splashTimeout3) clearTimeout(this.splashTimeout3);
        if (this.progressAnimationFrame) cancelAnimationFrame(this.progressAnimationFrame);
        
        // Hide all splash screens immediately
        document.getElementById('companyLogo').style.display = 'none';
        document.getElementById('studioLogo').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
        
        // Remove any classes
        const companyLogo = document.getElementById('companyLogo');
        const studioLogo = document.getElementById('studioLogo');
        companyLogo.classList.remove('show');
        studioLogo.classList.remove('show', 'fade-out-explode');
        
        // Skip directly to main menu with fade effect
        this.finalizeSplashToMenu();
}
    
CyberOpsGame.prototype.finalizeSplashToMenu = function() {
        console.log('🎬 finalizeSplashToMenu() called - transitioning to main menu');
        
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        mainMenu.style.opacity = '0';
        mainMenu.classList.remove('fade-in-from-flash');
        
        setTimeout(() => {
            mainMenu.classList.add('fade-in-from-flash');
        }, 50);
        
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        console.log('🎬 Starting demoscene idle timer from finalizeSplashToMenu');
        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
        
        // Seek to main menu section if skipped, or let it continue naturally
        if (this.audioEnabled) {
            if (this.splashSkipped) {
                // If skipped, seek to 10.7 seconds (main menu section)
                console.log('Splash skipped - seeking to menu music section');
                this.playMainMenuMusic();
            } else {
                // If natural progression, music continues seamlessly without seeking
                console.log('Natural splash transition - music continues without artifacts');
                // No currentTime change - avoid audio artifacts from seeking
            }
        }
        
        // Remove splash click handlers
        this.removeSplashClickHandlers();
        
        // Clean up after animation
        setTimeout(() => {
            mainMenu.classList.remove('fade-in-from-flash');
            mainMenu.style.opacity = '';
        }, 4600);
}

CyberOpsGame.prototype.removeSplashClickHandlers = function() {
        if (this.splashClickHandler) {
            document.getElementById('companyLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('studioLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('loadingScreen').removeEventListener('click', this.splashClickHandler);
            this.splashClickHandler = null;
        }
}

