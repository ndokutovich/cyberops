    // Save/Load System
CyberOpsGame.prototype.saveGame = function() {
        try {
            const saveData = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                gameState: {
                    currentMissionIndex: this.currentMissionIndex,
                    completedMissions: [...this.completedMissions],
                    totalCampaignTime: this.totalCampaignTime,
                    totalEnemiesDefeated: this.totalEnemiesDefeated,
                    currentScreen: this.currentScreen,
                    // Hub resources
                    credits: this.credits,
                    researchPoints: this.researchPoints,
                    worldControl: this.worldControl,
                    // Agent management
                    availableAgents: JSON.parse(JSON.stringify(this.availableAgents)),
                    activeAgents: JSON.parse(JSON.stringify(this.activeAgents)),
                    // Equipment and research
                    weapons: JSON.parse(JSON.stringify(this.weapons)),
                    equipment: JSON.parse(JSON.stringify(this.equipment)),
                    completedResearch: this.completedResearch || []
                }
            };

            localStorage.setItem('cyberops_savegame', JSON.stringify(saveData));

            const saveTime = new Date().toLocaleString();
            this.showHudDialog(
                '💾 GAME SAVED',
                `Your progress has been successfully saved.<br><br><strong>Save Details:</strong><br>• Missions Completed: ${this.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${this.currentMissionIndex + 1}<br>• Save Time: ${saveTime}`,
                [{ text: 'CONTINUE', action: 'close' }]
            );

            // Update menu to show load button
            this.updateMenuState();

        } catch (error) {
            console.error('Failed to save game:', error);
            this.showHudDialog(
                '❌ SAVE ERROR',
                'Failed to save game progress.<br><br>Please ensure you have sufficient storage space and try again.',
                [{ text: 'OK', action: 'close' }]
            );
        }
}

CyberOpsGame.prototype.loadGame = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action

        try {
            const savedData = localStorage.getItem('cyberops_savegame');
            if (!savedData) {
                this.showHudDialog(
                    '❌ NO SAVE FOUND',
                    'No saved game data was found.<br><br>Start a new campaign to begin playing.',
                    [{ text: 'OK', action: 'close' }]
                );
                return;
            }

            const saveData = JSON.parse(savedData);
            const saveTime = new Date(saveData.timestamp).toLocaleString();

            this.showHudDialog(
                '📁 LOAD GAME',
                `Found saved game from: ${saveTime}<br><br><strong>Save Details:</strong><br>• Missions Completed: ${saveData.gameState.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${saveData.gameState.currentMissionIndex + 1}<br><br>Load this save game?`,
                [
                    { text: 'LOAD GAME', action: () => this.performLoadGame(saveData) },
                    { text: 'CANCEL', action: 'close' }
                ]
            );

        } catch (error) {
            console.error('Failed to load game:', error);
            this.showHudDialog(
                '❌ LOAD ERROR',
                'Failed to load saved game.<br><br>The save file may be corrupted or incompatible.',
                [{ text: 'OK', action: 'close' }]
            );
        }
}

CyberOpsGame.prototype.performLoadGame = function(saveData) {
        try {
            // Restore game state
            this.currentMissionIndex = saveData.gameState.currentMissionIndex;
            this.completedMissions = [...saveData.gameState.completedMissions];
            this.totalCampaignTime = saveData.gameState.totalCampaignTime || 0;
            this.totalEnemiesDefeated = saveData.gameState.totalEnemiesDefeated || 0;

            // Restore hub data (if available)
            if (saveData.gameState.credits !== undefined) {
                this.credits = saveData.gameState.credits;
                this.researchPoints = saveData.gameState.researchPoints;
                this.worldControl = saveData.gameState.worldControl;
                this.availableAgents = saveData.gameState.availableAgents;
                this.activeAgents = saveData.gameState.activeAgents;
                this.weapons = saveData.gameState.weapons;
                this.equipment = saveData.gameState.equipment;
                this.completedResearch = saveData.gameState.completedResearch || [];
            }

            // Close dialog and update menu
            this.closeDialog();
            this.updateMenuState();
            this.updateHubStats(); // Update hub displays

            this.showHudDialog(
                '✅ GAME LOADED',
                `Game successfully loaded!<br><br>Welcome back, Commander.<br><br><strong>Progress:</strong><br>• Missions Completed: ${this.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${this.currentMissionIndex + 1}<br>• Credits: ${this.credits?.toLocaleString() || 'N/A'}<br>• Research Points: ${this.researchPoints?.toLocaleString() || 'N/A'}`,
                [{ text: 'CONTINUE', action: 'close' }]
            );

        } catch (error) {
            console.error('Failed to perform load:', error);
            this.showHudDialog(
                '❌ LOAD ERROR',
                'An error occurred while loading the game.<br><br>Please try again or start a new campaign.',
                [{ text: 'OK', action: 'close' }]
            );
        }
}

CyberOpsGame.prototype.hasSavedGame = function() {
        try {
            const savedData = localStorage.getItem('cyberops_savegame');
            return savedData !== null;
        } catch (error) {
            console.error('Error checking save game:', error);
            return false;
        }
}

CyberOpsGame.prototype.exitGame = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action

        this.showHudDialog(
            '🚪 EXIT TO START SCREEN',
            'Are you sure you want to return to the start screen?<br><br>This will end your current session. Make sure to save your progress!',
            [
                { text: 'SAVE & EXIT', action: () => this.saveAndExit() },
                { text: 'RETURN TO START', action: () => this.performExit() },
                { text: 'CANCEL', action: 'close' }
            ]
        );
}

CyberOpsGame.prototype.saveAndExit = function() {
        // Check if there's progress to save
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;

        if (hasProgress) {
            try {
                const saveData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    gameState: {
                        currentMissionIndex: this.currentMissionIndex,
                        completedMissions: [...this.completedMissions],
                        totalCampaignTime: this.totalCampaignTime,
                        totalEnemiesDefeated: this.totalEnemiesDefeated,
                        currentScreen: this.currentScreen
                    }
                };

                localStorage.setItem('cyberops_savegame', JSON.stringify(saveData));
            } catch (error) {
                console.error('Failed to save before exit:', error);
            }
        }

        this.performExit();
}

CyberOpsGame.prototype.performExit = function() {
        this.closeDialog();

        // Return to initial start screen
        this.returnToInitialScreen();
}

CyberOpsGame.prototype.returnToInitialScreen = function() {
        console.log('Returning to initial screen');

        // Stop all music
        this.stopMainMenuMusic();
        this.stopLevelMusic();
        this.stopCreditsMusic();

        // Clear demoscene timer and hide demoscene
        this.clearDemosceneTimer();
        this.demosceneActive = false;
        document.getElementById('demoscene').style.display = 'none';

        // Hide all game screens
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('syndicateHub').style.display = 'none';
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.querySelectorAll('.splash-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Reset screen state
        this.currentScreen = 'initial';

        // Reset audio state (will require new user interaction)
        this.audioEnabled = false;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Clear session storage audio permission (will require fresh start)
        sessionStorage.removeItem('cyberops_audio_enabled');

        // Show initial screen
        const initialScreen = document.getElementById('initialScreen');
        initialScreen.style.display = 'flex';

        console.log('Returned to initial screen - fresh start ready');
}

CyberOpsGame.prototype.checkForSavedGame = function() {
        // This is called during initialization to set up the menu properly
        // Will be used when the menu is displayed after splash screens
}