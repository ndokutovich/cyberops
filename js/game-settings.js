/**
 * Game Settings Management
 * Action methods for settings (used by declarative dialog system)
 *
 * NOTE: Settings dialog UI is now fully declarative (see dialog-config.js and dialog-integration.js)
 * This file contains only the action methods called by the declarative system.
 */

// ========== KEYBOARD SETTINGS ==========

// Start key rebinding
CyberOpsGame.prototype.startKeyRebind = function(action) {
    const keybindingService = this.gameServices?.keybindingService;
    if (!keybindingService) {
        throw new Error('KeybindingService not available - required for key rebinding');
    }

    const input = document.getElementById(`key-${action}`);
    if (!input) return;

    input.style.background = 'rgba(255, 255, 0, 0.2)';
    input.style.borderColor = '#ffff00';
    input.value = 'Press any key...';

    const dispatcher = this.gameServices?.keyboardDispatcher;
    const game = this;

    // Handler function for key capture
    const handleKeyCapture = (e) => {
        let key = e.key;

        // Special handling for certain keys
        if (e.code === 'Space') key = ' ';
        else if (e.code.startsWith('Key')) key = e.code.substring(3);
        else if (e.code.startsWith('Digit')) key = e.code.substring(5);

        // Try to update binding
        if (keybindingService.updateBinding(action, key)) {
            input.value = key;
            input.style.background = 'rgba(0, 255, 0, 0.2)';
            input.style.borderColor = '#00ff00';

            setTimeout(() => {
                input.style.background = 'rgba(0, 0, 0, 0.5)';
                input.style.borderColor = '#444';
            }, 1000);
        } else {
            // Conflict detected
            input.value = keybindingService.getKey(action);
            input.style.background = 'rgba(255, 0, 0, 0.2)';
            input.style.borderColor = '#ff4444';

            setTimeout(() => {
                input.style.background = 'rgba(0, 0, 0, 0.5)';
                input.style.borderColor = '#444';
            }, 1000);
        }

        // Cleanup
        if (dispatcher) {
            dispatcher.deactivateContext('KEY_REBIND');
            dispatcher.unregisterHandler('KEY_REBIND', '*');
        } else {
            document.removeEventListener('keydown', fallbackHandler);
        }

        return true; // Consumed
    };

    // Use dispatcher if available
    if (dispatcher) {
        // Register wildcard handler for KEY_REBIND context
        dispatcher.registerHandler('KEY_REBIND', '*', handleKeyCapture);
        // Activate KEY_REBIND context (blocks all others)
        dispatcher.activateContext('KEY_REBIND');
    } else {
        // Fallback to direct listener
        var fallbackHandler = (e) => {
            e.preventDefault();
            handleKeyCapture(e);
        };
        document.addEventListener('keydown', fallbackHandler);
    }
};

// Reset key binding
CyberOpsGame.prototype.resetKeyBinding = function(action) {
    const keybindingService = this.gameServices?.keybindingService;
    if (!keybindingService) {
        throw new Error('KeybindingService not available - required for key reset');
    }
    keybindingService.resetBinding(action);

    // Refresh the settings dialog if it's open (declarative system)
    const dialogEngine = this.dialogEngine || window.declarativeDialogEngine;
    if (dialogEngine && (dialogEngine.currentState === 'hub-settings' || dialogEngine.currentState === 'settings')) {
        dialogEngine.navigateTo(dialogEngine.currentState, null, true);
    }
};

// ========== AUDIO SETTINGS ==========

// Volume control methods
CyberOpsGame.prototype.setMasterVolume = function(value) {
    this.masterVolume = value / 100; // Convert to 0-1 range

    // Update currently playing music immediately
    this.updateAllMusicVolumes();

    // Store preference
    localStorage.setItem('cyberops_volume_master', value);
};

CyberOpsGame.prototype.setSFXVolume = function(value) {
    this.sfxVolume = value / 100;
    // Sound effects are generated dynamically, this will apply to new sounds
    localStorage.setItem('cyberops_volume_sfx', value);
};

CyberOpsGame.prototype.setMusicVolume = function(value) {
    const normalizedVolume = value / 100;
    this.musicVolume = normalizedVolume;

    // Update currently playing music immediately
    this.updateAllMusicVolumes();

    localStorage.setItem('cyberops_volume_music', value);
};

// Helper to update all currently playing music volumes
CyberOpsGame.prototype.updateAllMusicVolumes = function() {
    const userVolume = (this.masterVolume || 0.5) * (this.musicVolume || 0.3);

    // Update screen music (menu, hub, etc.)
    if (this.screenMusic && this.screenMusic.currentTrack) {
        // MULTIPLY: config volume × user volume
        const configVolume = this.screenMusic.currentTrack.getAttribute('data-config-volume');
        const baseVolume = configVolume ? parseFloat(configVolume) : 1.0;
        this.screenMusic.currentTrack.volume = baseVolume * userVolume;
    }

    // Also update any other screen music audio elements that might be playing
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
    if (enabled) {
        // Enable audio if not already enabled
        if (!this.audioEnabled) {
            this.enableAudio();
        }
        // Resume audio context if suspended
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        // Resume screen music if it exists
        if (this.screenMusic && this.screenMusic.currentTrack) {
            if (this.screenMusic.currentTrack.paused) {
                this.screenMusic.currentTrack.play().catch(err => {
                    if (this.logger) this.logger.warn('Could not resume screen music:', err);
                });
            }
        }
        // Resume mission music if it exists
        if (this.musicSystem && this.musicSystem.currentTrack) {
            if (this.musicSystem.currentTrack.paused) {
                this.musicSystem.currentTrack.play().catch(err => {
                    if (this.logger) this.logger.warn('Could not resume mission music:', err);
                });
            }
        }
    } else {
        // Suspend audio context
        if (this.audioContext && this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
        // Pause screen music
        if (this.screenMusic && this.screenMusic.currentTrack) {
            if (!this.screenMusic.currentTrack.paused) {
                this.screenMusic.currentTrack.pause();
            }
        }
        // Pause mission music
        if (this.musicSystem && this.musicSystem.currentTrack) {
            if (!this.musicSystem.currentTrack.paused) {
                this.musicSystem.currentTrack.pause();
            }
        }
    }

    localStorage.setItem('cyberops_audio_enabled', enabled ? 'true' : 'false');
};

// ========== GRAPHICS SETTINGS ==========

CyberOpsGame.prototype.toggleFPS = function(show) {
    this.showFPS = show;
    localStorage.setItem('cyberops_showfps', show ? 'true' : 'false');
};

// Graphics toggle functions
CyberOpsGame.prototype.toggleScreenShake = function(enabled) {
    this.screenShakeEnabled = enabled;
    if (!enabled && this.screenShake) {
        this.screenShake.active = false;
    }
    localStorage.setItem('cyberops_screenshake', enabled ? 'true' : 'false');
};

CyberOpsGame.prototype.toggle3DShadows = function(enabled) {
    this.shadows3DEnabled = enabled;
    if (this.renderer3D) {
        this.renderer3D.shadowMap.enabled = enabled;
    }
    localStorage.setItem('cyberops_shadows', enabled ? 'true' : 'false');
};

// ========== GAME SETTINGS ==========

// Game setting toggle functions
CyberOpsGame.prototype.togglePathfindingSetting = function(enabled) {
    this.usePathfinding = enabled;
    if (!enabled && this.agents) {
        // Clear existing paths
        this.agents.forEach(agent => {
            agent.path = null;
            agent.lastTargetKey = null;
        });
    }
    localStorage.setItem('cyberops_pathfinding', enabled ? 'true' : 'false');
};

CyberOpsGame.prototype.toggleAutoSave = function(enabled) {
    this.autoSaveEnabled = enabled;
    localStorage.setItem('cyberops_autosave', enabled ? 'true' : 'false');
};

CyberOpsGame.prototype.setDefaultTeamMode = function(mode) {
    this.defaultTeamMode = mode;
    localStorage.setItem('cyberops_default_team_mode', mode);

    // Apply to current game if active
    if (this.currentScreen === 'game') {
        this.setTeamMode(mode);
    }
};

// ========== DIALOG ACTIONS ==========

// Apply settings (stub - actual work done by registered action in dialog-integration.js)
CyberOpsGame.prototype.applySettings = function() {
    // Settings are applied immediately via onchange handlers
    // This just closes the dialog
    if (this.dialogEngine && (this.dialogEngine.currentState === 'hub-settings' || this.dialogEngine.currentState === 'settings')) {
        this.dialogEngine.back();
    }
};

// Reset settings to defaults (stub - actual work done by registered action in dialog-integration.js)
CyberOpsGame.prototype.resetSettings = function() {
    // Reset keyboard bindings
    const keybindingService = this.gameServices?.keybindingService;
    if (!keybindingService) {
        throw new Error('KeybindingService not available - required for settings reset');
    }
    keybindingService.resetAllBindings();

    // Reset to default values
    this.setMasterVolume(50);
    this.setSFXVolume(50);
    this.setMusicVolume(30);
    this.toggleFPS(false);
    this.toggleScreenShake(true);
    this.toggle3DShadows(true);
    this.togglePathfindingSetting(true);
    this.toggleAutoSave(true);
    this.setDefaultTeamMode('hold');

    // Refresh the dialog to show updated values
    if (this.dialogEngine && (this.dialogEngine.currentState === 'hub-settings' || this.dialogEngine.currentState === 'settings')) {
        this.dialogEngine.navigateTo(this.dialogEngine.currentState, null, true);
    }
};

// ========== INITIALIZATION ==========

// Load saved settings on game init
CyberOpsGame.prototype.loadSavedSettings = function() {
    // Load audio enable state
    const audioEnabled = localStorage.getItem('cyberops_audio_enabled');
    if (audioEnabled !== null && audioEnabled === 'false') {
        // Audio was disabled by user, keep it disabled
        // (by default audio starts enabled after user interaction)
    }

    // Load volumes
    const masterVol = localStorage.getItem('cyberops_volume_master');
    if (masterVol) this.setMasterVolume(parseInt(masterVol));

    const sfxVol = localStorage.getItem('cyberops_volume_sfx');
    if (sfxVol) this.setSFXVolume(parseInt(sfxVol));

    const musicVol = localStorage.getItem('cyberops_volume_music');
    if (musicVol) this.setMusicVolume(parseInt(musicVol));

    // Load graphics settings
    const showFPS = localStorage.getItem('cyberops_showfps');
    if (showFPS) this.toggleFPS(showFPS === 'true');

    const screenShake = localStorage.getItem('cyberops_screenshake');
    if (screenShake !== null) this.toggleScreenShake(screenShake !== 'false');

    const shadows = localStorage.getItem('cyberops_shadows');
    if (shadows !== null) this.toggle3DShadows(shadows !== 'false');

    // Load game settings
    const pathfinding = localStorage.getItem('cyberops_pathfinding');
    if (pathfinding !== null) this.togglePathfindingSetting(pathfinding !== 'false');

    const autoSave = localStorage.getItem('cyberops_autosave');
    if (autoSave !== null) this.toggleAutoSave(autoSave !== 'false');

    const teamMode = localStorage.getItem('cyberops_default_team_mode');
    if (teamMode) this.setDefaultTeamMode(teamMode);
};
