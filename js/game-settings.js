/**
 * Game Settings Management
 * Handles settings UI and keyboard customization
 */

// Show settings dialog
CyberOpsGame.prototype.showSettings = function() {
    // Close any existing dialogs
    this.closeDialog();

    // Create settings dialog
    const dialog = document.createElement('div');
    dialog.id = 'settingsDialog';
    dialog.className = 'hud-dialog show';
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'dialog-content';
    content.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%);
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 0;
        width: 90%;
        max-width: 800px;
        height: 85vh;
        max-height: 600px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
        padding: 15px 20px;
        background: rgba(0, 255, 255, 0.1);
        border-bottom: 1px solid #00ffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    header.innerHTML = `
        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">SYSTEM SETTINGS</div>
        <button onclick="game.closeSettingsDialog()" style="
            background: transparent;
            border: 1px solid #00ffff;
            color: #00ffff;
            padding: 5px 15px;
            cursor: pointer;
            border-radius: 5px;
        ">✕</button>
    `;

    // Tab navigation
    const tabNav = document.createElement('div');
    tabNav.style.cssText = `
        display: flex;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid #00ffff;
    `;

    const tabs = ['Keyboard', 'Audio', 'Graphics', 'Game'];
    tabs.forEach((tab, index) => {
        const tabBtn = document.createElement('button');
        tabBtn.textContent = tab.toUpperCase();
        tabBtn.style.cssText = `
            flex: 1;
            padding: 10px;
            background: ${index === 0 ? 'rgba(0, 255, 255, 0.2)' : 'transparent'};
            border: none;
            border-right: 1px solid rgba(0, 255, 255, 0.3);
            color: ${index === 0 ? '#00ffff' : '#888'};
            cursor: pointer;
            font-weight: ${index === 0 ? 'bold' : 'normal'};
        `;
        tabBtn.onclick = () => this.switchSettingsTab(tab.toLowerCase());
        tabBtn.id = `tab-${tab.toLowerCase()}`;
        tabNav.appendChild(tabBtn);
    });

    // Content area
    const contentArea = document.createElement('div');
    contentArea.id = 'settingsContent';
    contentArea.style.cssText = `
        flex: 1;
        padding: 20px;
        overflow-y: auto;
    `;

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
        padding: 15px 20px;
        background: rgba(0, 0, 0, 0.3);
        border-top: 1px solid #00ffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    footer.innerHTML = `
        <button onclick="game.resetSettings()" style="
            background: rgba(255, 0, 0, 0.2);
            border: 1px solid #ff4444;
            color: #ff4444;
            padding: 8px 20px;
            cursor: pointer;
            border-radius: 5px;
        ">RESET TO DEFAULTS</button>
        <div>
            <button onclick="game.applySettings()" style="
                background: rgba(0, 255, 0, 0.2);
                border: 1px solid #00ff00;
                color: #00ff00;
                padding: 8px 20px;
                cursor: pointer;
                border-radius: 5px;
                margin-right: 10px;
            ">APPLY</button>
            <button onclick="game.closeSettingsDialog()" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid #888;
                color: #888;
                padding: 8px 20px;
                cursor: pointer;
                border-radius: 5px;
            ">CANCEL</button>
        </div>
    `;

    // Assemble dialog
    content.appendChild(header);
    content.appendChild(tabNav);
    content.appendChild(contentArea);
    content.appendChild(footer);
    dialog.appendChild(content);
    document.body.appendChild(dialog);

    // Load keyboard settings by default
    this.loadKeyboardSettings();
};

// Switch settings tab
CyberOpsGame.prototype.switchSettingsTab = function(tab) {
    // Update tab buttons
    ['keyboard', 'audio', 'graphics', 'game'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.style.background = 'rgba(0, 255, 255, 0.2)';
                btn.style.color = '#00ffff';
                btn.style.fontWeight = 'bold';
            } else {
                btn.style.background = 'transparent';
                btn.style.color = '#888';
                btn.style.fontWeight = 'normal';
            }
        }
    });

    // Load content for selected tab
    switch(tab) {
        case 'keyboard':
            this.loadKeyboardSettings();
            break;
        case 'audio':
            this.loadAudioSettings();
            break;
        case 'graphics':
            this.loadGraphicsSettings();
            break;
        case 'game':
            this.loadGameSettings();
            break;
    }
};

// Load keyboard settings
CyberOpsGame.prototype.loadKeyboardSettings = function() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    let html = '<div style="color: #fff;">';

    if (window.KeybindingService) {
        const categories = window.KeybindingService.exportForUI();

        categories.forEach(cat => {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #00ffff; margin-bottom: 15px; border-bottom: 1px solid #00ffff; padding-bottom: 5px;">
                        ${cat.label}
                    </h3>
                    <div style="display: grid; gap: 10px;">
            `;

            cat.bindings.forEach(binding => {
                html += `
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 150px 100px;
                        align-items: center;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 5px;
                    ">
                        <span style="color: #ccc;">${binding.description}</span>
                        <input type="text"
                            id="key-${binding.action}"
                            value="${binding.key}"
                            readonly
                            style="
                                background: rgba(0, 0, 0, 0.5);
                                border: 1px solid #444;
                                color: #00ffff;
                                padding: 5px 10px;
                                text-align: center;
                                cursor: pointer;
                                border-radius: 3px;
                            "
                            onclick="game.startKeyRebind('${binding.action}')"
                        >
                        <button
                            onclick="game.resetKeyBinding('${binding.action}')"
                            style="
                                background: rgba(255, 0, 0, 0.1);
                                border: 1px solid #ff4444;
                                color: #ff4444;
                                padding: 5px 10px;
                                cursor: pointer;
                                border-radius: 3px;
                            "
                        >Reset</button>
                    </div>
                `;
            });

            html += '</div></div>';
        });
    } else {
        html += '<p style="color: #ff4444;">Keyboard binding service not loaded</p>';
    }

    html += '</div>';
    content.innerHTML = html;
};

// Start key rebinding
CyberOpsGame.prototype.startKeyRebind = function(action) {
    const input = document.getElementById(`key-${action}`);
    if (!input) return;

    input.style.background = 'rgba(255, 255, 0, 0.2)';
    input.style.borderColor = '#ffff00';
    input.value = 'Press any key...';

    // Listen for next key press
    const handler = (e) => {
        e.preventDefault();

        let key = e.key;

        // Special handling for certain keys
        if (e.code === 'Space') key = ' ';
        else if (e.code.startsWith('Key')) key = e.code.substring(3);
        else if (e.code.startsWith('Digit')) key = e.code.substring(5);

        // Try to update binding
        if (window.KeybindingService.updateBinding(action, key)) {
            input.value = key;
            input.style.background = 'rgba(0, 255, 0, 0.2)';
            input.style.borderColor = '#00ff00';

            setTimeout(() => {
                input.style.background = 'rgba(0, 0, 0, 0.5)';
                input.style.borderColor = '#444';
            }, 1000);
        } else {
            // Conflict detected
            input.value = window.KeybindingService.getKey(action);
            input.style.background = 'rgba(255, 0, 0, 0.2)';
            input.style.borderColor = '#ff4444';

            setTimeout(() => {
                input.style.background = 'rgba(0, 0, 0, 0.5)';
                input.style.borderColor = '#444';
            }, 1000);
        }

        document.removeEventListener('keydown', handler);
    };

    document.addEventListener('keydown', handler);
};

// Reset key binding
CyberOpsGame.prototype.resetKeyBinding = function(action) {
    window.KeybindingService.resetBinding(action);
    this.loadKeyboardSettings();
};

// Load audio settings
CyberOpsGame.prototype.loadAudioSettings = function() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    content.innerHTML = `
        <div style="color: #fff;">
            <h3 style="color: #00ffff; margin-bottom: 20px;">AUDIO SETTINGS</h3>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">Master Volume</label>
                <input type="range" min="0" max="100" value="${this.masterVolume || 50}"
                    onchange="game.setMasterVolume(this.value)"
                    style="width: 100%;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">Sound Effects</label>
                <input type="range" min="0" max="100" value="${this.sfxVolume || 50}"
                    onchange="game.setSFXVolume(this.value)"
                    style="width: 100%;">
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 10px;">Music</label>
                <input type="range" min="0" max="100" value="${this.musicVolume || 30}"
                    onchange="game.setMusicVolume(this.value)"
                    style="width: 100%;">
            </div>

            <div>
                <label>
                    <input type="checkbox" ${this.muteAll ? '' : 'checked'}>
                    Enable Audio
                </label>
            </div>
        </div>
    `;
};

// Load graphics settings
CyberOpsGame.prototype.loadGraphicsSettings = function() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    // Load saved settings or defaults
    const enableScreenShake = localStorage.getItem('cyberops_screenshake') !== 'false';
    const enable3DShadows = localStorage.getItem('cyberops_shadows') !== 'false';
    const showFPS = this.showFPS || false;

    content.innerHTML = `
        <div style="color: #fff;">
            <h3 style="color: #00ffff; margin-bottom: 20px;">GRAPHICS SETTINGS</h3>

            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" ${enableScreenShake ? 'checked' : ''}
                        onchange="game.toggleScreenShake(this.checked)">
                    Enable Screen Shake
                </label>
            </div>

            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" ${enable3DShadows ? 'checked' : ''}
                        onchange="game.toggle3DShadows(this.checked)">
                    Enable 3D Shadows (3D mode only)
                </label>
            </div>

            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" ${showFPS ? 'checked' : ''}
                        onchange="game.toggleFPS(this.checked)">
                    Show FPS Counter
                </label>
            </div>

            <div style="margin-top: 40px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                <p style="color: #888; margin: 0;">
                    Note: Most graphics settings are optimized for performance.<br>
                    Advanced graphics options may be added in future updates.
                </p>
            </div>
        </div>
    `;
};

// Load game settings
CyberOpsGame.prototype.loadGameSettings = function() {
    const content = document.getElementById('settingsContent');
    if (!content) return;

    // Load current settings
    const usePathfinding = this.usePathfinding !== false;
    const autoSave = localStorage.getItem('cyberops_autosave') !== 'false';

    content.innerHTML = `
        <div style="color: #fff;">
            <h3 style="color: #00ffff; margin-bottom: 20px;">GAME SETTINGS</h3>

            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" ${usePathfinding ? 'checked' : ''}
                        onchange="game.togglePathfindingSetting(this.checked)">
                    Use Pathfinding (smarter agent movement)
                </label>
            </div>

            <div style="margin-bottom: 20px;">
                <label>
                    <input type="checkbox" ${autoSave ? 'checked' : ''}
                        onchange="game.toggleAutoSave(this.checked)">
                    Auto-Save Between Missions
                </label>
            </div>

            <div style="margin-top: 40px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                <h4 style="color: #00ffff; margin-bottom: 10px;">Default Team Mode</h4>
                <select id="defaultTeamMode" style="width: 200px; padding: 5px; background: #222; color: #fff; border: 1px solid #444;"
                    onchange="game.setDefaultTeamMode(this.value)">
                    <option value="hold" ${this.defaultTeamMode === 'hold' ? 'selected' : ''}>Hold Position</option>
                    <option value="patrol" ${this.defaultTeamMode === 'patrol' ? 'selected' : ''}>Patrol Area</option>
                    <option value="follow" ${this.defaultTeamMode === 'follow' ? 'selected' : ''}>Follow Leader</option>
                </select>
                <p style="color: #888; margin-top: 10px; font-size: 0.9em;">
                    Sets the default behavior for unselected team members
                </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                <p style="color: #888; margin: 0;">
                    Note: Difficulty settings are balanced for the current campaign.<br>
                    Additional difficulty options may be added in future updates.
                </p>
            </div>
        </div>
    `;
};

// Close settings dialog
CyberOpsGame.prototype.closeSettingsDialog = function() {
    const dialog = document.getElementById('settingsDialog');
    if (dialog) {
        dialog.remove();
    }
};

// Apply settings
CyberOpsGame.prototype.applySettings = function() {
    // Save all settings
    if (window.KeybindingService) {
        window.KeybindingService.saveUserBindings();
    }

    // Save other settings to localStorage
    const settings = {
        masterVolume: this.masterVolume,
        sfxVolume: this.sfxVolume,
        musicVolume: this.musicVolume,
        showFPS: this.showFPS,
        usePathfinding: this.usePathfinding
    };
    localStorage.setItem('cyberops_settings', JSON.stringify(settings));

    this.closeSettingsDialog();
};

// Reset all settings
CyberOpsGame.prototype.resetSettings = function() {
    if (confirm('Reset all settings to defaults?')) {
        if (window.KeybindingService) {
            window.KeybindingService.resetAllBindings();
        }

        // Reset other settings (values in 0-1 range)
        this.masterVolume = 0.5;
        this.sfxVolume = 0.5;
        this.musicVolume = 0.3;
        this.showFPS = false;
        this.usePathfinding = true;

        localStorage.removeItem('cyberops_settings');

        // Reload current tab
        const activeTab = document.querySelector('[id^="tab-"][style*="rgba(0, 255, 255"]');
        if (activeTab) {
            const tabName = activeTab.id.replace('tab-', '');
            this.switchSettingsTab(tabName);
        }
    }
};

// Settings from pause menu
CyberOpsGame.prototype.showSettingsFromPause = function() {
    this.showSettings();
};

// Volume control methods
CyberOpsGame.prototype.setMasterVolume = function(value) {
    this.masterVolume = value / 100; // Convert to 0-1 range

    // Apply to all game audio elements
    if (this.gameAudio) {
        this.gameAudio.volume = this.masterVolume * 0.25;
    }

    // Apply to level music
    const levelMusics = ['level1Music', 'level2Music', 'level3Music', 'level4Music', 'level5Music'];
    levelMusics.forEach(musicId => {
        const audio = document.getElementById(musicId);
        if (audio) {
            audio.volume = this.masterVolume * 0.3;
        }
    });

    // Apply to credits music
    if (this.creditsAudio) {
        this.creditsAudio.volume = this.masterVolume * 0.2;
    }

    // Store preference
    localStorage.setItem('cyberops_volume_master', value);
};

CyberOpsGame.prototype.setSFXVolume = function(value) {
    this.sfxVolume = value / 100;
    // Sound effects are generated dynamically, this will apply to new sounds
    localStorage.setItem('cyberops_volume_sfx', value);
};

CyberOpsGame.prototype.setMusicVolume = function(value) {
    this.musicVolume = value / 100;

    // Apply to current music if playing
    if (this.currentMusicElement) {
        this.currentMusicElement.volume = this.musicVolume;
    }

    localStorage.setItem('cyberops_volume_music', value);
};

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

// Load saved settings on game init
CyberOpsGame.prototype.loadSavedSettings = function() {
    // Load volume settings
    const masterVol = localStorage.getItem('cyberops_volume_master');
    if (masterVol) this.setMasterVolume(parseInt(masterVol));

    const sfxVol = localStorage.getItem('cyberops_volume_sfx');
    if (sfxVol) this.setSFXVolume(parseInt(sfxVol));

    const musicVol = localStorage.getItem('cyberops_volume_music');
    if (musicVol) this.setMusicVolume(parseInt(musicVol));

    // Load graphics settings
    this.showFPS = localStorage.getItem('cyberops_showfps') === 'true';
    this.screenShakeEnabled = localStorage.getItem('cyberops_screenshake') !== 'false';
    this.shadows3DEnabled = localStorage.getItem('cyberops_shadows') !== 'false';

    // Load game settings
    this.usePathfinding = localStorage.getItem('cyberops_pathfinding') !== 'false';
    this.autoSaveEnabled = localStorage.getItem('cyberops_autosave') !== 'false';
    this.defaultTeamMode = localStorage.getItem('cyberops_default_team_mode') || 'hold';
};