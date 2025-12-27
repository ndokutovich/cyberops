/**
 * Game Settings Management
 * Action methods for settings (used by declarative dialog system)
 *
 * NOTE: All settings are managed by SettingsService (single source of truth)
 * This file contains the action methods that apply settings to the game.
 */

// ========== KEYBOARD SETTINGS ==========

// Start key rebinding
CyberOpsGame.prototype.startKeyRebind = function(action) {
    const keybindingService = this.gameServices.keybindingService;
    const dispatcher = this.gameServices.keyboardDispatcher;

    const input = document.getElementById(`key-${action}`);
    if (!input) return;

    input.style.background = 'rgba(255, 255, 0, 0.2)';
    input.style.borderColor = '#ffff00';
    input.value = 'Press any key...';

    const handleKeyCapture = (e) => {
        let key = e.key;
        if (e.code === 'Space') key = 'Space';
        else if (e.code.startsWith('Key')) key = e.code.substring(3);
        else if (e.code.startsWith('Digit')) key = e.code.substring(5);

        if (keybindingService.updateBinding(action, key)) {
            input.value = key;
            input.style.background = 'rgba(0, 255, 0, 0.2)';
            input.style.borderColor = '#00ff00';
        } else {
            input.value = keybindingService.getKey(action);
            input.style.background = 'rgba(255, 0, 0, 0.2)';
            input.style.borderColor = '#ff4444';
        }

        setTimeout(() => {
            input.style.background = 'rgba(0, 0, 0, 0.5)';
            input.style.borderColor = '#444';
        }, 1000);

        dispatcher.deactivateContext('KEY_REBIND');
        dispatcher.unregisterHandler('KEY_REBIND', '*');
        return true;
    };

    dispatcher.registerHandler('KEY_REBIND', '*', handleKeyCapture);
    dispatcher.activateContext('KEY_REBIND');
};

// Reset key binding
CyberOpsGame.prototype.resetKeyBinding = function(action) {
    const keybindingService = this.gameServices.keybindingService;
    keybindingService.resetBinding(action);

    // Refresh the settings dialog if it's open - use DialogStateService
    const dialogService = this.gameServices?.dialogStateService;
    if (dialogService && (dialogService.currentState === 'hub-settings' || dialogService.currentState === 'settings')) {
        dialogService.refresh();
    }
};

// ========== AUDIO SETTINGS ==========

CyberOpsGame.prototype.setMasterVolume = function(value) {
    const settings = this.gameServices.settingsService;
    const normalizedValue = value / 100; // Convert slider 0-100 to 0-1
    settings.masterVolume = normalizedValue;
    this.masterVolume = normalizedValue;
    this.updateAllMusicVolumes();
};

CyberOpsGame.prototype.setSFXVolume = function(value) {
    const settings = this.gameServices.settingsService;
    const normalizedValue = value / 100;
    settings.sfxVolume = normalizedValue;
    this.sfxVolume = normalizedValue;
};

CyberOpsGame.prototype.setMusicVolume = function(value) {
    const settings = this.gameServices.settingsService;
    const normalizedValue = value / 100;
    settings.musicVolume = normalizedValue;
    this.musicVolume = normalizedValue;
    this.updateAllMusicVolumes();
};

// Helper to update all currently playing music volumes
CyberOpsGame.prototype.updateAllMusicVolumes = function() {
    let masterVol = this.masterVolume ?? 0.5;
    let musicVol = this.musicVolume ?? 0.3;
    // Normalize if stored as percentages (0-100) instead of decimals (0-1)
    if (masterVol > 1) masterVol = masterVol / 100;
    if (musicVol > 1) musicVol = musicVol / 100;
    const userVolume = masterVol * musicVol;

    const audioService = this.gameServices?.audioService;
    if (!audioService) return;

    // Update screen music (menu, hub, etc.)
    const screenMusic = audioService.screenMusic;
    if (screenMusic?.currentTrack) {
        const configVolume = screenMusic.currentTrack.getAttribute('data-config-volume');
        const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
        try {
            screenMusic.currentTrack.volume = Math.max(0, Math.min(1, baseVolume * userVolume));
        } catch (e) { /* ignore */ }
    }

    // Also update any other screen music audio elements
    if (screenMusic?.audioElements) {
        Object.values(screenMusic.audioElements).forEach(audio => {
            if (audio && !audio.paused) {
                const configVolume = audio.getAttribute('data-config-volume');
                const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
                try {
                    audio.volume = Math.max(0, Math.min(1, baseVolume * userVolume));
                } catch (e) { /* ignore */ }
            }
        });
    }

    // Update mission music (in-game)
    const missionMusic = audioService.missionMusic;
    if (missionMusic?.currentTrack) {
        const configVolume = missionMusic.currentTrack.getAttribute('data-config-volume');
        const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
        try {
            missionMusic.currentTrack.volume = Math.max(0, Math.min(1, baseVolume * userVolume));
        } catch (e) { /* ignore */ }
    }

    // Also update mission music audio elements
    if (missionMusic?.audioElements) {
        Object.values(missionMusic.audioElements).forEach(audio => {
            if (audio && !audio.paused) {
                const configVolume = audio.getAttribute('data-config-volume');
                const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
                try {
                    audio.volume = Math.max(0, Math.min(1, baseVolume * userVolume));
                } catch (e) { /* ignore */ }
            }
        });
    }
};

CyberOpsGame.prototype.toggleAudioEnable = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.audioEnabled = enabled;

    const audioService = this.gameServices?.audioService;
    if (enabled) {
        if (!this.audioEnabled && audioService) {
            audioService.enableAudio();
            this.audioContext = audioService.audioContext;
            this.audioEnabled = audioService.audioEnabled;
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        const screenMusic = audioService?.screenMusic;
        const missionMusic = audioService?.missionMusic;
        if (screenMusic?.currentTrack?.paused) {
            screenMusic.currentTrack.play().catch(err => {
                if (this.logger) this.logger.warn('Could not resume screen music:', err);
            });
        }
        if (missionMusic?.currentTrack?.paused) {
            missionMusic.currentTrack.play().catch(err => {
                if (this.logger) this.logger.warn('Could not resume mission music:', err);
            });
        }
    } else {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        const screenMusic = audioService?.screenMusic;
        const missionMusic = audioService?.missionMusic;
        if (screenMusic?.currentTrack && !screenMusic.currentTrack.paused) {
            screenMusic.currentTrack.pause();
        }
        if (missionMusic?.currentTrack && !missionMusic.currentTrack.paused) {
            missionMusic.currentTrack.pause();
        }
    }
};

// ========== GRAPHICS SETTINGS ==========

CyberOpsGame.prototype.toggleFPS = function(show) {
    const settings = this.gameServices.settingsService;
    settings.showFPS = show;
    this.showFPS = show;
};

CyberOpsGame.prototype.toggleScreenShake = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.screenShakeEnabled = enabled;
    this.screenShakeEnabled = enabled;
    if (!enabled && this.screenShake) {
        this.screenShake.active = false;
    }
};

CyberOpsGame.prototype.toggle3DShadows = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.shadowsEnabled = enabled;
    this.shadows3DEnabled = enabled;
    if (this.renderer3D) {
        this.renderer3D.shadowMap.enabled = enabled;
    }
};

// ========== GAME SETTINGS ==========

CyberOpsGame.prototype.togglePathfindingSetting = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.pathfindingEnabled = enabled;
    this.usePathfinding = enabled;
    if (!enabled && this.agents) {
        this.agents.forEach(agent => {
            agent.path = null;
            agent.lastTargetKey = null;
        });
    }
};

CyberOpsGame.prototype.toggleAutoSave = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.autosaveEnabled = enabled;
    this.autoSaveEnabled = enabled;
};

CyberOpsGame.prototype.setDefaultTeamMode = function(mode) {
    const settings = this.gameServices.settingsService;
    settings.defaultTeamMode = mode;
    this.defaultTeamMode = mode;

    if (this.currentScreen === 'game') {
        this.setTeamMode(mode);
    }
};

// ========== DIALOG ACTIONS ==========

CyberOpsGame.prototype.applySettings = function() {
    // Settings are applied immediately via onchange handlers
    if (this.dialogEngine && (this.dialogEngine.currentState === 'hub-settings' || this.dialogEngine.currentState === 'settings')) {
        this.dialogEngine.back();
    }
};

CyberOpsGame.prototype.resetSettings = function() {
    const settings = this.gameServices.settingsService;
    const keybindingService = this.gameServices.keybindingService;

    // Reset keyboard bindings
    keybindingService.resetAllBindings();

    // Reset all settings to defaults
    settings.resetAll();

    // Apply defaults to game state
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.musicVolume = settings.musicVolume;
    this.showFPS = settings.showFPS;
    this.screenShakeEnabled = settings.screenShakeEnabled;
    this.shadows3DEnabled = settings.shadowsEnabled;
    this.usePathfinding = settings.pathfindingEnabled;
    this.autoSaveEnabled = settings.autosaveEnabled;
    this.defaultTeamMode = settings.defaultTeamMode;

    this.updateAllMusicVolumes();

    // Refresh the dialog
    if (this.dialogEngine && (this.dialogEngine.currentState === 'hub-settings' || this.dialogEngine.currentState === 'settings')) {
        this.dialogEngine.navigateTo(this.dialogEngine.currentState, null, true);
    }
};

// ========== INITIALIZATION ==========

// Load saved settings on game init
CyberOpsGame.prototype.loadSavedSettings = function() {
    const settings = this.gameServices.settingsService;

    // Apply settings to game state (SettingsService already loaded from localStorage)
    this.masterVolume = settings.masterVolume;
    this.sfxVolume = settings.sfxVolume;
    this.musicVolume = settings.musicVolume;
    this.showFPS = settings.showFPS;
    this.screenShakeEnabled = settings.screenShakeEnabled;
    this.shadows3DEnabled = settings.shadowsEnabled;
    this.usePathfinding = settings.pathfindingEnabled;
    this.autoSaveEnabled = settings.autosaveEnabled;
    this.defaultTeamMode = settings.defaultTeamMode;

    // Apply audio enabled state
    if (!settings.audioEnabled && this.audioContext) {
        this.audioContext.suspend();
    }

    this.updateAllMusicVolumes();
};
