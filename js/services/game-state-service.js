/**
 * GameStateService - Centralized save/load and state management
 * Handles all game persistence, versioning, and state validation
 */
class GameStateService {
    constructor(resourceService = null, agentService = null, inventoryService = null, missionService = null) {
        // Logger
        this.logger = window.Logger ? new window.Logger('GameStateService') : null;

        // Service dependencies
        this.resourceService = resourceService;
        this.agentService = agentService;
        this.inventoryService = inventoryService;
        this.missionService = missionService;

        // Save management
        this.saveSlots = 5;
        this.currentSlot = 0;
        this.saveVersion = '1.0.0';

        // Auto-save configuration
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 60000; // 1 minute
        this.lastAutoSave = 0;
        this.autoSaveTimer = null;

        // State validation
        this.requiredFields = [
            'version',
            'timestamp',
            'currentScreen',
            'missionCount'
        ];

        // Event listeners
        this.listeners = {
            save: [],
            load: [],
            autoSave: [],
            error: [],
            any: []
        };
    }

    /**
     * Initialize service and start auto-save
     */
    initialize() {
        if (this.logger) this.logger.info('💾 GameStateService initialized');
        this.startAutoSave();
    }

    /**
     * Collect complete game state from all services and game
     */
    collectGameState(game) {
        const state = {
            // Metadata
            version: this.saveVersion,
            timestamp: Date.now(),
            playTime: game.playTime || 0,

            // Core game state
            currentScreen: game.currentScreen || 'hub',
            currentMission: game.currentMission || null,
            completedMissions: game.completedMissions || [],
            missionCount: game.missionCount || 0,

            // Resources (from ResourceService or game)
            resources: this.resourceService
                ? this.resourceService.exportState()
                : {
                    resources: {
                        credits: game.credits || 0,
                        researchPoints: game.researchPoints || 0,
                        worldControl: game.worldControl || 0,
                        intel: game.intel || 0
                    }
                },

            // Agents (from AgentService or game)
            agents: this.agentService
                ? this.agentService.exportState()
                : {
                    activeAgents: game.activeAgents || [],
                    availableAgents: game.availableAgents || [],
                    fallenAgents: game.fallenAgents || []
                },

            // Inventory (from InventoryService or game)
            inventory: this.inventoryService
                ? this.inventoryService.exportState()
                : {
                    weapons: game.weapons || [],
                    equipment: game.equipment || [],
                    agentLoadouts: game.agentLoadouts || {}
                },

            // Research and unlocks
            researchTree: game.researchTree || {},
            completedResearch: game.completedResearch || [],
            unlockedAbilities: game.unlockedAbilities || [],

            // Campaign progress
            campaignData: {
                currentAct: game.currentAct || 1,
                currentCampaign: game.currentCampaign || 'main',
                campaignProgress: game.campaignProgress || {}
            },

            // Settings
            settings: {
                soundEnabled: game.soundEnabled !== false,
                musicVolume: game.musicVolume || 0.5,
                sfxVolume: game.sfxVolume || 0.5,
                difficulty: game.difficulty || 'normal'
            },

            // Statistics
            statistics: {
                totalKills: game.totalKills || 0,
                totalDeaths: game.totalDeaths || 0,
                missionsCompleted: game.completedMissions?.length || 0,
                creditsEarned: game.totalCreditsEarned || 0,
                timeP

: game.totalPlayTime || 0
            },

            // Intel and collectibles
            collectedIntel: game.collectedIntel || [],
            unlockedLore: game.unlockedLore || [],

            // Milestones
            milestones: game.milestones || [],
            achievements: game.achievements || [],

            // Mission state (from MissionService)
            missionState: this.missionService
                ? this.missionService.exportState()
                : {
                    currentMission: game.currentMissionDef || null,
                    missionTrackers: game.missionTrackers || {},
                    extractionEnabled: game.extractionEnabled || false
                }
        };

        return state;
    }

    /**
     * Apply loaded state to game and services
     */
    applyGameState(game, state) {
        if (!this.validateSaveData(state)) {
            if (this.logger) this.logger.error('❌ Invalid save data');
            return false;
        }

        try {
            // Apply metadata
            game.playTime = state.playTime || 0;

            // Apply core game state
            game.currentScreen = state.currentScreen || 'hub';
            game.currentMission = state.currentMission || null;
            game.completedMissions = state.completedMissions || [];
            game.missionCount = state.missionCount || 0;

            // Apply resources
            if (this.resourceService && state.resources) {
                this.resourceService.importState(state.resources);
            } else if (state.resources?.resources) {
                game.credits = state.resources.resources.credits || 0;
                game.researchPoints = state.resources.resources.researchPoints || 0;
                game.worldControl = state.resources.resources.worldControl || 0;
                game.intel = state.resources.resources.intel || 0;
            }

            // Apply agents
            if (this.agentService && state.agents) {
                this.agentService.importState(state.agents);
            } else if (state.agents) {
                game.activeAgents = state.agents.activeAgents || [];
                game.availableAgents = state.agents.availableAgents || [];
                game.fallenAgents = state.agents.fallenAgents || [];
            }

            // Apply inventory
            if (this.inventoryService && state.inventory) {
                this.inventoryService.importState(state.inventory);
            } else if (state.inventory) {
                game.weapons = state.inventory.weapons || [];
                game.equipment = state.inventory.equipment || [];
                game.agentLoadouts = state.inventory.agentLoadouts || {};
            }

            // Apply research and unlocks
            game.researchTree = state.researchTree || {};
            game.completedResearch = state.completedResearch || [];
            game.unlockedAbilities = state.unlockedAbilities || [];

            // Apply campaign progress
            if (state.campaignData) {
                game.currentAct = state.campaignData.currentAct || 1;
                game.currentCampaign = state.campaignData.currentCampaign || 'main';
                game.campaignProgress = state.campaignData.campaignProgress || {};
            }

            // Apply settings
            // Apply mission state
            if (this.missionService && state.missionState) {
                this.missionService.importState(state.missionState);
            } else if (state.missionState) {
                game.currentMissionDef = state.missionState.currentMission;
                game.missionTrackers = state.missionState.missionTrackers || {};
                game.extractionEnabled = state.missionState.extractionEnabled || false;
            }

            // Apply settings
            if (state.settings) {
                game.soundEnabled = state.settings.soundEnabled !== false;
                game.musicVolume = state.settings.musicVolume || 0.5;
                game.sfxVolume = state.settings.sfxVolume || 0.5;
                game.difficulty = state.settings.difficulty || 'normal';
            }

            // Apply statistics
            if (state.statistics) {
                game.totalKills = state.statistics.totalKills || 0;
                game.totalDeaths = state.statistics.totalDeaths || 0;
                game.totalCreditsEarned = state.statistics.creditsEarned || 0;
                game.totalPlayTime = state.statistics.timeP

 || 0;
            }

            // Apply collectibles
            game.collectedIntel = state.collectedIntel || [];
            game.unlockedLore = state.unlockedLore || [];

            // Apply milestones
            game.milestones = state.milestones || [];
            game.achievements = state.achievements || [];

            if (this.logger) this.logger.info('✅ Game state applied successfully');
            return true;

        } catch (error) {
            if (this.logger) this.logger.error('❌ Error applying game state:', error);
            this.notifyListeners('error', { error, operation: 'apply' });
            return false;
        }
    }

    /**
     * Save game to specified slot
     */
    saveGame(game, slot = this.currentSlot, isAutoSave = false) {
        try {
            const state = this.collectGameState(game);
            const saveKey = `cyberops_save_slot_${slot}`;

            // Add save metadata
            state.saveSlot = slot;
            state.isAutoSave = isAutoSave;
            state.saveName = isAutoSave
                ? `Auto-Save ${new Date().toLocaleString()}`
                : `Save ${slot + 1} - ${new Date().toLocaleString()}`;

            // Store in localStorage
            localStorage.setItem(saveKey, JSON.stringify(state));

            // Update save index
            this.updateSaveIndex(slot, state);

            // Update current slot if not auto-save
            if (!isAutoSave) {
                this.currentSlot = slot;
            }

            // Notify listeners
            this.notifyListeners(isAutoSave ? 'autoSave' : 'save', {
                slot,
                saveName: state.saveName,
                timestamp: state.timestamp
            });

            if (this.logger) this.logger.info(`💾 Game saved to slot ${slot}${isAutoSave ? ' (auto-save)' : ''}`);
            return true;

        } catch (error) {
            if (this.logger) this.logger.error('❌ Error saving game:', error);
            this.notifyListeners('error', { error, operation: 'save' });
            return false;
        }
    }

    /**
     * Load game from specified slot
     */
    loadGame(game, slot = this.currentSlot) {
        try {
            const saveKey = `cyberops_save_slot_${slot}`;
            const savedData = localStorage.getItem(saveKey);

            if (!savedData) {
                if (this.logger) this.logger.warn(`⚠️ No save found in slot ${slot}`);
                return false;
            }

            const state = JSON.parse(savedData);

            // Check version compatibility
            if (!this.checkVersionCompatibility(state.version)) {
                if (this.logger) this.logger.warn('⚠️ Save version incompatible, attempting migration...');
                this.migrateSaveData(state);
            }

            // Apply state
            const success = this.applyGameState(game, state);

            if (success) {
                this.currentSlot = slot;

                // Notify listeners
                this.notifyListeners('load', {
                    slot,
                    saveName: state.saveName,
                    timestamp: state.timestamp
                });

                if (this.logger) this.logger.info(`✅ Game loaded from slot ${slot}`);
            }

            return success;

        } catch (error) {
            if (this.logger) this.logger.error('❌ Error loading game:', error);
            this.notifyListeners('error', { error, operation: 'load' });
            return false;
        }
    }

    /**
     * Quick save (to current slot)
     */
    quickSave(game) {
        return this.saveGame(game, this.currentSlot, false);
    }

    /**
     * Quick load (from current slot)
     */
    quickLoad(game) {
        return this.loadGame(game, this.currentSlot);
    }

    /**
     * Auto-save functionality
     */
    startAutoSave() {
        if (!this.autoSaveEnabled) return;

        // Clear existing timer
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        // Start new timer
        this.autoSaveTimer = setInterval(() => {
            if (window.game && window.game.currentScreen === 'game') {
                // Only auto-save during gameplay
                this.saveGame(window.game, 0, true); // Slot 0 for auto-save
                this.lastAutoSave = Date.now();
            }
        }, this.autoSaveInterval);

        if (this.logger) this.logger.info('⏰ Auto-save enabled');
    }

    /**
     * Stop auto-save
     */
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
        if (this.logger) this.logger.info('⏰ Auto-save disabled');
    }

    /**
     * Get all save slots info
     */
    getSaveSlots() {
        const slots = [];

        for (let i = 0; i < this.saveSlots; i++) {
            const saveKey = `cyberops_save_slot_${i}`;
            const savedData = localStorage.getItem(saveKey);

            if (savedData) {
                try {
                    const state = JSON.parse(savedData);
                    slots.push({
                        slot: i,
                        exists: true,
                        saveName: state.saveName || `Save ${i + 1}`,
                        timestamp: state.timestamp,
                        date: new Date(state.timestamp).toLocaleString(),
                        playTime: state.playTime || 0,
                        missionCount: state.missionCount || 0,
                        isAutoSave: state.isAutoSave || false,
                        currentScreen: state.currentScreen || 'unknown'
                    });
                } catch (e) {
                    slots.push({ slot: i, exists: false, error: true });
                }
            } else {
                slots.push({ slot: i, exists: false });
            }
        }

        return slots;
    }

    /**
     * Delete a save slot
     */
    deleteSave(slot) {
        const saveKey = `cyberops_save_slot_${slot}`;
        localStorage.removeItem(saveKey);
        this.updateSaveIndex(slot, null);
        if (this.logger) this.logger.info(`🗑️ Deleted save in slot ${slot}`);
    }

    /**
     * Validate save data structure
     */
    validateSaveData(state) {
        if (!state || typeof state !== 'object') {
            return false;
        }

        // Check required fields
        for (const field of this.requiredFields) {
            if (!(field in state)) {
                if (this.logger) this.logger.warn(`⚠️ Missing required field: ${field}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Check version compatibility
     */
    checkVersionCompatibility(saveVersion) {
        if (!saveVersion) return false;

        const [saveMajor] = saveVersion.split('.').map(Number);
        const [currentMajor] = this.saveVersion.split('.').map(Number);

        // Major version must match
        return saveMajor === currentMajor;
    }

    /**
     * Migrate old save data to current version
     */
    migrateSaveData(state) {
        // Add any necessary migrations here
        if (this.logger) this.logger.info('🔄 Migrating save data from', state.version, 'to', this.saveVersion);

        // Example migrations:
        // v0.9.0 -> v1.0.0: Add inventory service data
        if (!state.inventory && state.weapons) {
            state.inventory = {
                weapons: state.weapons,
                equipment: state.equipment || [],
                agentLoadouts: state.agentLoadouts || {}
            };
        }

        state.version = this.saveVersion;
        return state;
    }

    /**
     * Update save index for save slot listing
     */
    updateSaveIndex(slot, state) {
        const indexKey = 'cyberops_save_index';
        let index = {};

        try {
            const savedIndex = localStorage.getItem(indexKey);
            if (savedIndex) {
                index = JSON.parse(savedIndex);
            }
        } catch (e) {
            if (this.logger) this.logger.warn('Could not parse save index');
        }

        if (state) {
            index[slot] = {
                timestamp: state.timestamp,
                saveName: state.saveName,
                missionCount: state.missionCount
            };
        } else {
            delete index[slot];
        }

        localStorage.setItem(indexKey, JSON.stringify(index));
    }

    /**
     * Export save to file
     */
    exportSave(slot) {
        const saveKey = `cyberops_save_slot_${slot}`;
        const savedData = localStorage.getItem(saveKey);

        if (!savedData) {
            if (this.logger) this.logger.warn(`⚠️ No save found in slot ${slot}`);
            return null;
        }

        const blob = new Blob([savedData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `cyberops_save_${slot}_${timestamp}.json`;

        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        if (this.logger) this.logger.info(`📤 Exported save from slot ${slot}`);
        return filename;
    }

    /**
     * Import save from file
     */
    async importSave(file, slot) {
        try {
            const text = await file.text();
            const state = JSON.parse(text);

            if (!this.validateSaveData(state)) {
                throw new Error('Invalid save file format');
            }

            const saveKey = `cyberops_save_slot_${slot}`;
            localStorage.setItem(saveKey, text);
            this.updateSaveIndex(slot, state);

            if (this.logger) this.logger.info(`📥 Imported save to slot ${slot}`);
            return true;

        } catch (error) {
            if (this.logger) this.logger.error('❌ Error importing save:', error);
            return false;
        }
    }

    /**
     * Add event listener
     */
    addListener(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        } else if (eventType === 'any' || eventType === '*') {
            this.listeners.any.push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(eventType, callback) {
        const list = eventType === 'any' || eventType === '*'
            ? this.listeners.any
            : this.listeners[eventType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(eventType, data) {
        // Specific listeners
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    if (this.logger) this.logger.error(`Error in state listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                if (this.logger) this.logger.error('Error in global state listener:', e);
            }
        });
    }

    /**
     * Get service info
     */
    getInfo() {
        return {
            saveSlots: this.saveSlots,
            currentSlot: this.currentSlot,
            version: this.saveVersion,
            autoSaveEnabled: this.autoSaveEnabled,
            autoSaveInterval: this.autoSaveInterval,
            lastAutoSave: this.lastAutoSave
        };
    }

    /**
     * Get all saves from localStorage
     */
    getAllSaves() {
        const saves = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('cyberops_save_')) {
                try {
                    const saveData = JSON.parse(localStorage.getItem(key));
                    saveData.id = key.replace('cyberops_save_', '');
                    saves.push(saveData);
                } catch (e) {
                    if (this.logger) this.logger.error('Invalid save data:', key);
                }
            }
        }
        // Sort by timestamp, newest first
        return saves.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * Delete a save slot
     */
    deleteSave(slotId) {
        localStorage.removeItem(`cyberops_save_${slotId}`);
        if (this.logger) this.logger.info('🗑️ Deleted save slot:', slotId);
        this.notifyListeners('saveDeleted', { slotId });
    }

    /**
     * Rename a save slot
     */
    renameSave(slotId, newName) {
        const saveKey = `cyberops_save_${slotId}`;
        const saveData = localStorage.getItem(saveKey);
        if (saveData) {
            try {
                const save = JSON.parse(saveData);
                save.name = newName;
                localStorage.setItem(saveKey, JSON.stringify(save));
                if (this.logger) this.logger.info('✏️ Renamed save slot:', slotId, 'to', newName);
                this.notifyListeners('saveRenamed', { slotId, newName });
            } catch (e) {
                if (this.logger) this.logger.error('Failed to rename save:', e);
            }
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameStateService;
}