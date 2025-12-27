/**
 * SettingsService - Single source of truth for all game settings
 *
 * Centralizes all localStorage-based settings with:
 * - Typed getters/setters
 * - Default values
 * - Change notifications
 * - Validation
 */

class SettingsService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('SettingsService') : null;

        // Storage key prefix
        this.PREFIX = 'cyberops_';

        // Setting definitions with defaults and types
        this.definitions = {
            // Audio
            audio_enabled: { default: true, type: 'boolean' },
            volume_master: { default: 1.0, type: 'number', min: 0, max: 1 },
            volume_sfx: { default: 0.8, type: 'number', min: 0, max: 1 },
            volume_music: { default: 0.7, type: 'number', min: 0, max: 1 },

            // Visual
            screenshake: { default: true, type: 'boolean' },
            shadows: { default: true, type: 'boolean' },
            showfps: { default: false, type: 'boolean' },
            freeze: { default: true, type: 'boolean' },
            particles: { default: true, type: 'boolean' },

            // Gameplay
            pathfinding: { default: true, type: 'boolean' },
            autosave: { default: true, type: 'boolean' },
            default_team_mode: { default: 'follow', type: 'string', values: ['follow', 'hold', 'patrol'] }
        };

        // Cache for performance
        this.cache = new Map();

        // Listeners for setting changes
        this.listeners = new Map();

        // Load all settings into cache
        this.loadAll();

        if (this.logger) this.logger.info('SettingsService initialized');
    }

    /**
     * Load all settings from localStorage into cache
     */
    loadAll() {
        for (const [key, def] of Object.entries(this.definitions)) {
            const stored = localStorage.getItem(this.PREFIX + key);
            if (stored !== null) {
                this.cache.set(key, this.parseValue(stored, def.type));
            } else {
                this.cache.set(key, def.default);
            }
        }
    }

    /**
     * Parse a stored string value to its proper type
     */
    parseValue(value, type) {
        switch (type) {
            case 'boolean':
                return value === 'true';
            case 'number':
                return parseFloat(value);
            case 'string':
            default:
                return value;
        }
    }

    /**
     * Get a setting value
     * @param {string} key - Setting key (without prefix)
     * @returns {*} Setting value or default
     */
    get(key) {
        if (!this.definitions[key]) {
            if (this.logger) this.logger.warn(`Unknown setting: ${key}`);
            return undefined;
        }

        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        return this.definitions[key].default;
    }

    /**
     * Set a setting value
     * @param {string} key - Setting key (without prefix)
     * @param {*} value - New value
     * @returns {boolean} Success
     */
    set(key, value) {
        const def = this.definitions[key];
        if (!def) {
            if (this.logger) this.logger.warn(`Unknown setting: ${key}`);
            return false;
        }

        // Validate type
        if (!this.validateValue(value, def)) {
            if (this.logger) this.logger.warn(`Invalid value for ${key}: ${value}`);
            return false;
        }

        const oldValue = this.cache.get(key);

        // Update cache
        this.cache.set(key, value);

        // Persist to localStorage
        localStorage.setItem(this.PREFIX + key, String(value));

        // Notify listeners
        if (oldValue !== value) {
            this.notifyListeners(key, value, oldValue);
        }

        if (this.logger) this.logger.debug(`Setting ${key} = ${value}`);
        return true;
    }

    /**
     * Validate a value against its definition
     */
    validateValue(value, def) {
        switch (def.type) {
            case 'boolean':
                return typeof value === 'boolean';
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) return false;
                if (def.min !== undefined && value < def.min) return false;
                if (def.max !== undefined && value > def.max) return false;
                return true;
            case 'string':
                if (typeof value !== 'string') return false;
                if (def.values && !def.values.includes(value)) return false;
                return true;
            default:
                return true;
        }
    }

    /**
     * Reset a setting to its default value
     * @param {string} key - Setting key
     */
    reset(key) {
        const def = this.definitions[key];
        if (def) {
            this.set(key, def.default);
        }
    }

    /**
     * Reset all settings to defaults
     */
    resetAll() {
        for (const [key, def] of Object.entries(this.definitions)) {
            this.set(key, def.default);
        }
        if (this.logger) this.logger.info('All settings reset to defaults');
    }

    /**
     * Add a listener for setting changes
     * @param {string} key - Setting key to watch (or '*' for all)
     * @param {Function} callback - Called with (key, newValue, oldValue)
     * @returns {Function} Unsubscribe function
     */
    onChange(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        this.listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.get(key)?.delete(callback);
        };
    }

    /**
     * Notify listeners of a setting change
     */
    notifyListeners(key, newValue, oldValue) {
        // Notify specific key listeners
        this.listeners.get(key)?.forEach(cb => {
            try {
                cb(key, newValue, oldValue);
            } catch (e) {
                if (this.logger) this.logger.error(`Listener error for ${key}:`, e);
            }
        });

        // Notify wildcard listeners
        this.listeners.get('*')?.forEach(cb => {
            try {
                cb(key, newValue, oldValue);
            } catch (e) {
                if (this.logger) this.logger.error('Wildcard listener error:', e);
            }
        });
    }

    // ========== Convenience Getters ==========

    // Audio
    get audioEnabled() { return this.get('audio_enabled'); }
    set audioEnabled(v) { this.set('audio_enabled', v); }

    get masterVolume() { return this.get('volume_master'); }
    set masterVolume(v) { this.set('volume_master', v); }

    get sfxVolume() { return this.get('volume_sfx'); }
    set sfxVolume(v) { this.set('volume_sfx', v); }

    get musicVolume() { return this.get('volume_music'); }
    set musicVolume(v) { this.set('volume_music', v); }

    // Visual
    get screenShakeEnabled() { return this.get('screenshake'); }
    set screenShakeEnabled(v) { this.set('screenshake', v); }

    get shadowsEnabled() { return this.get('shadows'); }
    set shadowsEnabled(v) { this.set('shadows', v); }

    get showFPS() { return this.get('showfps'); }
    set showFPS(v) { this.set('showfps', v); }

    get freezeEffectsEnabled() { return this.get('freeze'); }
    set freezeEffectsEnabled(v) { this.set('freeze', v); }

    get particlesEnabled() { return this.get('particles'); }
    set particlesEnabled(v) { this.set('particles', v); }

    // Gameplay
    get pathfindingEnabled() { return this.get('pathfinding'); }
    set pathfindingEnabled(v) { this.set('pathfinding', v); }

    get autosaveEnabled() { return this.get('autosave'); }
    set autosaveEnabled(v) { this.set('autosave', v); }

    get defaultTeamMode() { return this.get('default_team_mode'); }
    set defaultTeamMode(v) { this.set('default_team_mode', v); }

    /**
     * Export all settings for UI display
     */
    exportForUI() {
        const categories = {
            audio: {
                label: 'Audio',
                settings: [
                    { key: 'audio_enabled', label: 'Enable Audio', type: 'boolean' },
                    { key: 'volume_master', label: 'Master Volume', type: 'slider', min: 0, max: 1 },
                    { key: 'volume_sfx', label: 'SFX Volume', type: 'slider', min: 0, max: 1 },
                    { key: 'volume_music', label: 'Music Volume', type: 'slider', min: 0, max: 1 }
                ]
            },
            visual: {
                label: 'Visual',
                settings: [
                    { key: 'screenshake', label: 'Screen Shake', type: 'boolean' },
                    { key: 'shadows', label: '3D Shadows', type: 'boolean' },
                    { key: 'showfps', label: 'Show FPS', type: 'boolean' },
                    { key: 'particles', label: 'Particle Effects', type: 'boolean' }
                ]
            },
            gameplay: {
                label: 'Gameplay',
                settings: [
                    { key: 'pathfinding', label: 'Pathfinding', type: 'boolean' },
                    { key: 'autosave', label: 'Auto-Save', type: 'boolean' },
                    { key: 'default_team_mode', label: 'Default Team Mode', type: 'select', values: ['follow', 'hold', 'patrol'] }
                ]
            }
        };

        // Add current values
        for (const category of Object.values(categories)) {
            for (const setting of category.settings) {
                setting.value = this.get(setting.key);
            }
        }

        return categories;
    }
}

// Export for GameServices
if (typeof window !== 'undefined') {
    window.SettingsService = SettingsService;
}
