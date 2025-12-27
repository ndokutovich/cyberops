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

    // Refresh the settings dialog if it's open
    const dialogEngine = this.dialogEngine || window.declarativeDialogEngine;
    if (dialogEngine && (dialogEngine.currentState === 'hub-settings' || dialogEngine.currentState === 'settings')) {
        dialogEngine.navigateTo(dialogEngine.currentState, null, true);
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
    const userVolume = (this.masterVolume || 0.5) * (this.musicVolume || 0.3);

    // Update screen music (menu, hub, etc.)
    if (this.screenMusic && this.screenMusic.currentTrack) {
        const configVolume = this.screenMusic.currentTrack.getAttribute('data-config-volume');
        const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
        this.screenMusic.currentTrack.volume = baseVolume * userVolume;
    }

    // Also update any other screen music audio elements
    if (this.screenMusic && this.screenMusic.audioElements) {
        Object.values(this.screenMusic.audioElements).forEach(audio => {
            if (audio && !audio.paused) {
                const configVolume = audio.getAttribute('data-config-volume');
                const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
                audio.volume = baseVolume * userVolume;
            }
        });
    }

    // Update mission music (in-game)
    if (this.musicSystem && this.musicSystem.currentTrack) {
        const configVolume = this.musicSystem.currentTrack.getAttribute('data-config-volume');
        const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
        this.musicSystem.currentTrack.volume = baseVolume * userVolume;
    }

    // Also update mission music audio elements
    if (this.musicSystem && this.musicSystem.audioElements) {
        Object.values(this.musicSystem.audioElements).forEach(audio => {
            if (audio && !audio.paused) {
                const configVolume = audio.getAttribute('data-config-volume');
                const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
                audio.volume = baseVolume * userVolume;
            }
        });
    }
};

CyberOpsGame.prototype.toggleAudioEnable = function(enabled) {
    const settings = this.gameServices.settingsService;
    settings.audioEnabled = enabled;

    if (enabled) {
        if (!this.audioEnabled) {
            this.enableAudio();
        }
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        if (this.screenMusic && this.screenMusic.currentTrack && this.screenMusic.currentTrack.paused) {
            this.screenMusic.currentTrack.play().catch(err => {
                if (this.logger) this.logger.warn('Could not resume screen music:', err);
            });
        }
        if (this.musicSystem && this.musicSystem.currentTrack && this.musicSystem.currentTrack.paused) {
            this.musicSystem.currentTrack.play().catch(err => {
                if (this.logger) this.logger.warn('Could not resume mission music:', err);
            });
        }
    } else {
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        if (this.screenMusic && this.screenMusic.currentTrack && !this.screenMusic.currentTrack.paused) {
            this.screenMusic.currentTrack.pause();
        }
        if (this.musicSystem && this.musicSystem.currentTrack && !this.musicSystem.currentTrack.paused) {
            this.musicSystem.currentTrack.pause();
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
