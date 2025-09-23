    // Save/Load System with Multiple Slots

// Show save list dialog
CyberOpsGame.prototype.showSaveList = function(mode = 'save') {
    // Use modal engine if available
    if (window.modalEngine) {
        this.showSaveListModalEngine(mode);
        return;
    }

    // Fallback to old system (with safety checks for test mode)
    this.saveListMode = mode; // 'save' or 'load'
    const dialog = document.getElementById('saveListDialog');

    // Safety check for test mode
    if (!dialog) {
        if (this.logger) this.logger.warn('saveListDialog not found - likely in test mode');
        return;
    }

    const title = dialog.querySelector('.dialog-title');
    if (title) {
        title.textContent = mode === 'save' ? '💾 SAVE GAME' : '📁 LOAD GAME';
    }

    this.refreshSaveList();
    dialog.classList.add('show');
}

// New modal engine version
CyberOpsGame.prototype.showSaveListModalEngine = function(mode = 'save') {
    this.saveListMode = mode;
    const saves = this.getAllSaves();

    // Build items list
    const items = saves.map((save, index) => {
        const saveDate = new Date(save.timestamp);
        const formattedDate = saveDate.toLocaleDateString() + ' ' + saveDate.toLocaleTimeString();

        return {
            icon: mode === 'save' ? '💾' : '📁',
            title: save.name || `Save Slot ${index + 1}`,
            subtitle: `
                📅 ${formattedDate} |
                🎯 Mission ${save.gameState.currentMissionIndex + 1} |
                💰 ${save.gameState.credits.toLocaleString()} credits
            `,
            actions: [
                {
                    type: mode === 'save' ? 'overwrite' : 'load',
                    label: mode === 'save' ? 'OVERWRITE' : 'LOAD',
                    handler: (item) => {
                        if (mode === 'save') {
                            this.overwriteSave(save.id);
                        } else {
                            this.loadSaveSlot(save.id);
                        }
                        if (this.activeSaveModal) {
                            this.activeSaveModal.close();
                        }
                    }
                },
                {
                    type: 'delete',
                    label: 'DELETE',
                    handler: (item) => {
                        this.deleteSave(save.id);
                        // Refresh the modal
                        if (this.activeSaveModal) {
                            this.activeSaveModal.close();
                            this.showSaveListModalEngine(mode);
                        }
                    }
                }
            ]
        };
    });

    // Add buttons
    const buttons = [];

    if (mode === 'save') {
        buttons.push({
            text: '➕ NEW SAVE',
            primary: true,
            action: () => {
                this.createNewSave();
                if (this.activeSaveModal) {
                    this.activeSaveModal.close();
                    this.showSaveListModalEngine(mode);
                }
            },
            closeAfter: false
        });
    }

    buttons.push({
        text: 'CLOSE',
        action: 'close'
    });

    // Show modal
    this.activeSaveModal = window.modalEngine.show({
        type: 'list',
        size: 'medium',
        title: mode === 'save' ? '💾 SAVE GAME' : '📁 LOAD GAME',
        items: items,
        buttons: buttons,
        emptyMessage: mode === 'save' ?
            'No saved games found. Click "NEW SAVE" to create one.' :
            'No saved games found. Start a new game first.',
        closeButton: true,
        backdrop: true,
        closeOnBackdrop: false,
        onClose: () => {
            this.activeSaveModal = null;
        }
    });
}

CyberOpsGame.prototype.closeSaveList = function() {
    // Close modal engine dialog if exists
    if (this.activeSaveModal) {
        this.activeSaveModal.close();
        this.activeSaveModal = null;
        return;
    }

    // Fallback to old system
    const dialog = document.getElementById('saveListDialog');
    if (dialog) {
        dialog.classList.remove('show');
    }
}

CyberOpsGame.prototype.refreshSaveList = function() {
    const content = document.getElementById('saveListContent');
    content.innerHTML = '';

    // Get all saves from localStorage
    const saves = this.getAllSaves();

    if (saves.length === 0) {
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #888;">
                <div style="font-size: 48px; margin-bottom: 20px;">📭</div>
                <div>No saved games found</div>
                <div style="font-size: 0.9em; margin-top: 10px;">Create a new save to get started</div>
            </div>`;
        return;
    }

    // Display each save slot
    saves.forEach((save, index) => {
        const saveDate = new Date(save.timestamp);
        const formattedDate = saveDate.toLocaleDateString() + ' ' + saveDate.toLocaleTimeString();

        content.innerHTML += `
            <div style="background: rgba(0,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #00ffff;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">
                            ${save.name || `Save Slot ${index + 1}`}
                        </div>
                        <div style="color: #ccc; font-size: 0.9em;">
                            📅 ${formattedDate}<br>
                            🎯 Mission ${save.gameState.currentMissionIndex + 1} of ${this.missions.length}<br>
                            ✅ ${save.gameState.completedMissions.length} missions completed<br>
                            💰 ${save.gameState.credits.toLocaleString()} credits |
                            🔬 ${save.gameState.researchPoints} RP |
                            🌍 ${save.gameState.worldControl}% control
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 5px;">
                        ${this.saveListMode === 'save' ?
                            `<button onclick="game.overwriteSave('${save.id}')"
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff;
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                OVERWRITE
                            </button>` :
                            `<button onclick="game.loadSaveSlot('${save.id}')"
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff;
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                                LOAD
                            </button>`
                        }
                        <button onclick="game.renameSave('${save.id}')"
                                style="background: #3c721e; color: #fff; border: 1px solid #00ff00;
                                       padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                            RENAME
                        </button>
                        <button onclick="game.deleteSave('${save.id}')"
                                style="background: #721e1e; color: #fff; border: 1px solid #ff0000;
                                       padding: 6px 12px; border-radius: 4px; cursor: pointer;">
                            DELETE
                        </button>
                    </div>
                </div>
            </div>`;
    });
}

CyberOpsGame.prototype.getAllSaves = function() {
    // Use GameStateService only
    if (this.gameServices && this.gameServices.gameStateService) {
        return this.gameServices.gameStateService.getAllSaves();
    }
    return [];
}

CyberOpsGame.prototype.createNewSave = function() {
    const saveName = prompt('Enter a name for this save:', `Save ${this.getAllSaves().length + 1}`);
    if (!saveName) return;

    const saveId = Date.now().toString();
    this.saveToSlot(saveId, saveName);
}

CyberOpsGame.prototype.saveToSlot = function(slotId, name) {
    // Use GameStateService ONLY - no fallback
    const success = this.gameServices.gameStateService.saveGame(this, slotId, false);
    if (success) {
        this.showHudDialog(
            '✅ SAVED',
            `Game saved as "${name}"<br><br>Missions: ${this.completedMissions.length}/${this.missions.length}<br>Credits: ${this.credits.toLocaleString()}`,
            [{ text: 'OK', action: () => {
                this.closeDialog();
                this.refreshSaveList();
            }}]
        );
    } else {
        this.showHudDialog(
            '❌ SAVE ERROR',
            'Failed to save game progress.',
            [{ text: 'OK', action: 'close' }]
        );
    }
    return success;
}

// Override/update existing save
CyberOpsGame.prototype.overwriteSave = function(slotId) {
    const saves = this.getAllSaves();
    const save = saves.find(s => s.id === slotId);
    if (!save) return;

    const confirm = window.confirm(`Overwrite save "${save.name}"?`);
    if (!confirm) return;

    this.saveToSlot(slotId, save.name);
}

// Delete save
CyberOpsGame.prototype.deleteSave = function(slotId) {
    const saves = this.getAllSaves();
    const save = saves.find(s => s.id === slotId);
    if (!save) return;

    const confirm = window.confirm(`Delete save "${save.name}"? This cannot be undone.`);
    if (!confirm) return;

    // Use GameStateService only
    if (this.gameServices && this.gameServices.gameStateService) {
        this.gameServices.gameStateService.deleteSave(slotId);
    }
    this.refreshSaveList();

    this.showHudDialog(
        '🗑️ DELETED',
        `Save "${save.name}" has been deleted.`,
        [{ text: 'OK', action: 'close' }]
    );
}

// Rename save
CyberOpsGame.prototype.renameSave = function(slotId) {
    const saves = this.getAllSaves();
    const save = saves.find(s => s.id === slotId);
    if (!save) return;

    const newName = prompt('Enter new name:', save.name);
    if (!newName || newName === save.name) return;

    // Use GameStateService only
    if (this.gameServices && this.gameServices.gameStateService) {
        this.gameServices.gameStateService.renameSave(slotId, newName);
    }
    this.refreshSaveList();
}

// Load specific save slot
CyberOpsGame.prototype.loadSaveSlot = function(slotId) {
    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameSaveload') : null;
    }

    // Get save info first to show confirmation
    const saves = this.getAllSaves();
    const saveData = saves.find(s => s.id === slotId);

    if (!saveData) {
        this.showHudDialog(
            '❌ ERROR',
            'Save file not found or corrupted.',
            [{ text: 'OK', action: 'close' }]
        );
        return;
    }

    const saveTime = new Date(saveData.timestamp).toLocaleString();
    this.showHudDialog(
        '📁 LOAD GAME',
        `Load "${saveData.name}"?<br><br>Saved: ${saveTime}<br>Mission: ${saveData.gameState.currentMissionIndex + 1}/${this.missions.length}`,
        [
            { text: 'LOAD', action: () => {
                // Load through GameStateService only
                const success = this.gameServices.gameStateService.loadGame(this, slotId);
                if (success) {
                    this.closeSaveList();
                    // Navigate to hub
                    this.changeScreen('hub');
                    this.showHudDialog(
                        '✅ GAME LOADED',
                        `Game loaded successfully!<br><br>Mission: ${this.currentMissionIndex + 1}/${this.missions.length}<br>Credits: ${this.credits.toLocaleString()}`,
                        [{ text: 'CONTINUE', action: 'close' }]
                    );
                } else {
                    this.showHudDialog(
                        '❌ LOAD ERROR',
                        'Failed to load game state.',
                        [{ text: 'OK', action: 'close' }]
                    );
                }
            }},
            { text: 'CANCEL', action: 'close' }
        ]
    );
}

// Quick save - saves to automatic slot
CyberOpsGame.prototype.quickSave = function() {
    const quickSaveId = 'quicksave';
    const timestamp = new Date().toLocaleString();
    this.saveToSlot(quickSaveId, `Quick Save - ${timestamp}`);
}

CyberOpsGame.prototype.quickLoad = function() {
    // Check for quicksave via GameStateService
    const saves = this.getAllSaves();
    const quickSave = saves.find(s => s.id === 'quicksave');

    if (quickSave) {
        this.loadSaveSlot('quicksave');
    } else {
        // Fall back to most recent save
        if (saves.length > 0) {
            this.loadSaveSlot(saves[0].id);
        } else {
            if (this.logger) this.logger.warn('No saves available for quick load');
            if (this.showHudDialog) {
                this.showHudDialog(
                    '⚠️ No Saves Found',
                    'No saved games available to load.',
                    [{ text: 'OK', action: 'close' }]
                );
            }
        }
    }
}

// Update the original saveGame to use the new system
CyberOpsGame.prototype.saveGame = function() {
    // Show save list in save mode
    this.showSaveList('save');
}

// Update the original loadGame to use the new system
CyberOpsGame.prototype.loadGame = function() {
    this.clearDemosceneTimer();
    // Use GameStateService directly
    return this.gameServices.gameStateService.loadGame(this, 'quicksave');
}

// Legacy performLoadGame removed - loading is done directly in loadSaveSlot

// Legacy load code completely removed - all loading through GameStateService

CyberOpsGame.prototype.hasSavedGame = function() {
    // Check via GameStateService
    if (this.gameServices && this.gameServices.gameStateService) {
        const saves = this.gameServices.gameStateService.getAllSaves();
        return saves.length > 0;
    }
    return false;
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

        if (hasProgress && this.gameServices && this.gameServices.gameStateService) {
            try {
                // Use GameStateService to save
                const slotId = 'autosave_exit';
                this.gameServices.gameStateService.saveGame(this, slotId, false);
            } catch (error) {
                if (this.logger) this.logger.error('Failed to save before exit:', error);
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
        if (this.logger) this.logger.debug('Returning to initial screen');

        // Stop all music
        if (this.stopScreenMusic) {
            this.stopScreenMusic();
        }

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

        if (this.logger) this.logger.debug('Returned to initial screen - fresh start ready');
}

CyberOpsGame.prototype.checkForSavedGame = function() {
        // This is called during initialization to set up the menu properly
        // Will be used when the menu is displayed after splash screens
}

// Save game with a specific name (called from save dialog)
CyberOpsGame.prototype.saveGameWithName = function(name) {
    if (!name || name.trim() === '') {
        name = `Save ${this.getAllSaves().length + 1}`;
    }
    const saveId = Date.now().toString();
    this.saveToSlot(saveId, name.trim());

    // Close the dialog if it's open
    if (this.dialogEngine) {
        this.dialogEngine.closeAll();
    }

    // Show confirmation
    if (this.showHudDialog) {
        this.showHudDialog(
            '💾 Game Saved',
            `Game saved as "${name.trim()}"`,
            [{ text: 'OK', action: 'close' }]
        );
    }
}