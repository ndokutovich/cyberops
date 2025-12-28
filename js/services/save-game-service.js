/**
 * SaveGameService - Centralized save/load system
 * Manages save slots, versioning, and persistence
 */

class SaveGameService {
    constructor(gameStateService) {
        this.logger = window.Logger ? new window.Logger('SaveGameService') : null;

        // Dependencies
        this.gameStateService = gameStateService;

        // Save configuration
        this.config = {
            maxSaveSlots: 10,
            autosaveSlots: 3,
            saveVersion: '2.0.0',
            compressionEnabled: false,
            cloudSyncEnabled: false
        };

        // Save state
        this.saveSlots = new Map(); // slot id -> save data
        this.currentSlot = null;
        this.lastSaveTime = 0;
        this.autosaveInterval = 300000; // 5 minutes
        this.autosaveTimer = null;
        this.autosaveIndex = 0;

        // Save metadata cache
        this.saveMetadata = new Map(); // slot id -> metadata only

        // Initialize save system
        this.initialize();

        if (this.logger) this.logger.info('SaveGameService initialized');
    }

    /**
     * Initialize save system
     */
    initialize() {
        // Load save metadata from localStorage
        this.loadSaveMetadata();

        // Start autosave timer
        this.startAutosave();
    }

    /**
     * Create a new save
     */
    /**
     * Create a new save
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     * @param {string} slotId - Save slot ID
     * @param {string} name - Save name
     * @param {boolean} isAutosave - Whether this is an autosave
     */
    async createSave(game, slotId, name = null, isAutosave = false) {
        try {
            // Gather game state from all services - pass game parameter
            const saveData = await this.gatherSaveData(game);

            // Create save object
            const save = {
                version: this.config.saveVersion,
                timestamp: Date.now(),
                name: name || this.generateSaveName(isAutosave),
                isAutosave: isAutosave,
                playTime: this.calculatePlayTime(game?.totalCampaignTime || 0),
                data: saveData,
                metadata: this.createSaveMetadata(saveData)
            };

            // Compress if enabled
            if (this.config.compressionEnabled) {
                save.data = await this.compressSaveData(save.data);
                save.compressed = true;
            }

            // Store save
            this.saveSlots.set(slotId, save);
            this.saveMetadata.set(slotId, save.metadata);

            // Persist to storage
            await this.persistSave(slotId, save);

            this.lastSaveTime = Date.now();
            this.currentSlot = slotId;

            if (this.logger) this.logger.info(`Game saved to slot ${slotId}`, save.metadata);

            return {
                success: true,
                slotId: slotId,
                metadata: save.metadata
            };

        } catch (error) {
            if (this.logger) this.logger.error('Failed to create save', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load a save
     */
    /**
     * Load a save
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     * @param {string} slotId - Save slot ID
     */
    async loadSave(game, slotId) {
        try {
            // Get save from storage
            let save = this.saveSlots.get(slotId);

            if (!save) {
                save = await this.retrieveSave(slotId);
                if (!save) {
                    throw new Error(`Save slot ${slotId} not found`);
                }
            }

            // Check version compatibility
            if (!this.isCompatibleVersion(save.version)) {
                // Try to migrate save
                save = await this.migrateSave(save);
            }

            // Decompress if needed
            let saveData = save.data;
            if (save.compressed) {
                saveData = await this.decompressSaveData(saveData);
            }

            // Apply save data to game - pass game parameter
            await this.applySaveData(game, saveData);

            this.currentSlot = slotId;

            if (this.logger) this.logger.info(`Game loaded from slot ${slotId}`);

            return {
                success: true,
                slotId: slotId,
                saveData: saveData
            };

        } catch (error) {
            if (this.logger) this.logger.error('Failed to load save', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete a save
     */
    async deleteSave(slotId) {
        try {
            // Remove from memory
            this.saveSlots.delete(slotId);
            this.saveMetadata.delete(slotId);

            // Remove from storage
            await this.removeSave(slotId);

            if (this.currentSlot === slotId) {
                this.currentSlot = null;
            }

            if (this.logger) this.logger.info(`Save deleted from slot ${slotId}`);

            return { success: true };

        } catch (error) {
            if (this.logger) this.logger.error('Failed to delete save', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Quick save
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     */
    async quickSave(game) {
        return await this.createSave(game, 'quicksave', 'Quick Save', false);
    }

    /**
     * Quick load
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     */
    async quickLoad(game) {
        return await this.loadSave(game, 'quicksave');
    }

    /**
     * Autosave
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     */
    async autosave(game) {
        // Rotate through autosave slots
        const slotId = `autosave_${this.autosaveIndex}`;
        this.autosaveIndex = (this.autosaveIndex + 1) % this.config.autosaveSlots;

        const result = await this.createSave(game, slotId, null, true);

        if (this.logger) this.logger.debug(`Autosave to ${slotId}`, result);

        return result;
    }

    /**
     * Start autosave timer
     */
    startAutosave() {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
        }

        // NOTE: Autosave timer needs game instance - should be started by game
        // For now, disable automatic timer to avoid window.game access
        if (this.logger) this.logger.warn('Autosave timer not started - requires game instance');
    }

    /**
     * Stop autosave timer
     */
    stopAutosave() {
        if (this.autosaveTimer) {
            clearInterval(this.autosaveTimer);
            this.autosaveTimer = null;
        }
    }

    /**
     * Gather save data from all game systems using unified exportState() pattern
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     */
    async gatherSaveData(game) {
        const saveData = {};

        // Get game state from GameStateService - use parameter instead of window.game
        if (this.gameStateService && game) {
            saveData.gameState = this.gameStateService.collectGameState(game);
        }

        // Get data from GameFacade if available - use parameter
        if (game?.gameController?.facade) {
            const facade = game.gameController.facade;
            saveData.facade = {
                currentScreen: facade.currentScreen,
                currentMission: facade.currentMission,
                currentCampaign: facade.currentCampaign,
                completedMissions: facade.completedMissions,
                agents: facade.agents,
                agentLoadouts: facade.agentLoadouts,
                unlockedContent: facade.unlockedContent
            };
        }

        // ============================================================
        // UNIFIED exportState() PATTERN FOR ALL SERVICES
        // Each service exports its complete state as simple JSON
        // ============================================================
        if (window.GameServices) {
            const services = window.GameServices;

            // Resource state (credits, research points, world control)
            if (services.resourceService?.exportState) {
                saveData.resources = services.resourceService.exportState();
            }

            // Agent state (available, active, fallen agents with full data)
            if (services.agentService?.exportState) {
                saveData.agents = services.agentService.exportState();
            }

            // Inventory state (weapons, armor, items, loadouts)
            if (services.inventoryService?.exportState) {
                saveData.inventory = services.inventoryService.exportState();
            }

            // Research state (completed, in-progress research)
            if (services.researchService?.exportState) {
                saveData.research = services.researchService.exportState();
            }

            // RPG state (entities, skills, stats, perks, inventories)
            // CRITICAL: Must be loaded BEFORE agents in applySaveData
            if (services.rpgService?.exportState) {
                saveData.rpg = services.rpgService.exportState();
            }

            // Mission state (current, completed, failed missions)
            if (services.missionService?.exportState) {
                saveData.missions = services.missionService.exportState();
            }

            // Quest state (active, completed quests, quest items)
            if (services.questService?.exportState) {
                saveData.quests = services.questService.exportState();
            }

            // Audio state (current track, volume settings)
            if (services.audioService?.exportState) {
                saveData.audio = services.audioService.exportState();
            }
        }

        if (this.logger) {
            this.logger.debug('Save data gathered using unified exportState()', {
                hasResources: !!saveData.resources,
                hasAgents: !!saveData.agents,
                hasInventory: !!saveData.inventory,
                hasResearch: !!saveData.research,
                hasRpg: !!saveData.rpg,
                hasMissions: !!saveData.missions,
                hasQuests: !!saveData.quests
            });
        }

        return saveData;
    }

    /**
     * Apply save data to game systems using unified importState() pattern
     * @param {Object} game - Game instance passed as parameter (unidirectional)
     * @param {Object} saveData - Save data to apply
     */
    async applySaveData(game, saveData) {
        // Apply to GameStateService - use parameter
        if (this.gameStateService && saveData.gameState && game) {
            this.gameStateService.applyGameState(game, saveData.gameState);
        }

        // Apply to GameFacade if available - use parameter
        if (game?.gameController?.facade && saveData.facade) {
            const facade = game.gameController.facade;
            Object.assign(facade, saveData.facade);
        }

        // ============================================================
        // UNIFIED importState() PATTERN FOR ALL SERVICES
        // CRITICAL: Load order matters! RPG must be before Agents
        // ============================================================
        if (window.GameServices && saveData) {
            const services = window.GameServices;

            // 1. FIRST: Load RPG state to populate _pendingEntityData
            //    This MUST happen before agents so pending data can be applied
            if (services.rpgService?.importState && saveData.rpg) {
                if (this.logger) this.logger.debug('Loading RPG state FIRST (before agents)');
                services.rpgService.importState(saveData.rpg);
            }

            // 2. Resources (no dependencies)
            if (services.resourceService?.importState && saveData.resources) {
                services.resourceService.importState(saveData.resources);
            }

            // 3. Agents (will apply pending RPG data from step 1)
            if (services.agentService?.importState && saveData.agents) {
                if (this.logger) this.logger.debug('Loading agents (will apply pending RPG data)');
                services.agentService.importState(saveData.agents);
            }

            // 4. Inventory (after agents to link loadouts)
            if (services.inventoryService?.importState && saveData.inventory) {
                services.inventoryService.importState(saveData.inventory);
            }

            // 5. Research (no dependencies)
            if (services.researchService?.importState && saveData.research) {
                services.researchService.importState(saveData.research);
            }

            // 6. Missions (no dependencies)
            if (services.missionService?.importState && saveData.missions) {
                services.missionService.importState(saveData.missions);
            }

            // 7. Quests (no dependencies)
            if (services.questService?.importState && saveData.quests) {
                services.questService.importState(saveData.quests);
            }

            // 8. Audio (no dependencies)
            if (services.audioService?.importState && saveData.audio) {
                services.audioService.importState(saveData.audio);
            }

            if (this.logger) {
                this.logger.info('Save data applied using unified importState()', {
                    rpgLoaded: !!saveData.rpg,
                    resourcesLoaded: !!saveData.resources,
                    agentsLoaded: !!saveData.agents,
                    inventoryLoaded: !!saveData.inventory,
                    researchLoaded: !!saveData.research,
                    missionsLoaded: !!saveData.missions,
                    questsLoaded: !!saveData.quests
                });
            }
        }
    }

    /**
     * Create save metadata
     */
    createSaveMetadata(saveData) {
        return {
            timestamp: Date.now(),
            playTime: this.calculatePlayTime(),
            level: saveData.missions?.current?.name || 'Hub',
            credits: saveData.resources?.credits || 0,
            activeAgents: saveData.agents?.active?.length || 0,
            completedMissions: saveData.missions?.completed?.length || 0,
            screenshot: this.captureScreenshot() // Base64 thumbnail
        };
    }

    /**
     * Generate save name
     */
    generateSaveName(isAutosave) {
        if (isAutosave) {
            return `Autosave - ${new Date().toLocaleString()}`;
        }
        return `Save - ${new Date().toLocaleString()}`;
    }

    /**
     * Calculate play time
     * @param {number} totalCampaignTime - Total campaign time passed as parameter (unidirectional)
     */
    calculatePlayTime(totalCampaignTime = 0) {
        // Use parameter instead of accessing window.game directly
        return totalCampaignTime || 0;
    }

    /**
     * Capture screenshot for save thumbnail
     */
    captureScreenshot() {
        try {
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) return null;

            // Create thumbnail canvas
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            thumbCanvas.width = 160;
            thumbCanvas.height = 90;

            // Draw scaled down version
            thumbCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 160, 90);

            // Return as base64
            return thumbCanvas.toDataURL('image/jpeg', 0.5);
        } catch (error) {
            if (this.logger) this.logger.warn('Failed to capture screenshot', error);
            return null;
        }
    }

    /**
     * Persist save to localStorage
     */
    async persistSave(slotId, save) {
        try {
            const key = `cyberops_save_${slotId}`;
            const saveString = JSON.stringify(save);
            localStorage.setItem(key, saveString);

            // Update metadata list
            this.updateMetadataList();
        } catch (error) {
            if (this.logger) this.logger.error('Failed to persist save', error);
            throw error;
        }
    }

    /**
     * Retrieve save from localStorage
     */
    async retrieveSave(slotId) {
        try {
            const key = `cyberops_save_${slotId}`;
            const saveString = localStorage.getItem(key);

            if (!saveString) return null;

            return JSON.parse(saveString);
        } catch (error) {
            if (this.logger) this.logger.error('Failed to retrieve save', error);
            return null;
        }
    }

    /**
     * Remove save from localStorage
     */
    async removeSave(slotId) {
        try {
            const key = `cyberops_save_${slotId}`;
            localStorage.removeItem(key);

            // Update metadata list
            this.updateMetadataList();
        } catch (error) {
            if (this.logger) this.logger.error('Failed to remove save', error);
            throw error;
        }
    }

    /**
     * Load save metadata from localStorage
     */
    loadSaveMetadata() {
        try {
            const metadataString = localStorage.getItem('cyberops_save_metadata');
            if (metadataString) {
                const metadata = JSON.parse(metadataString);
                this.saveMetadata = new Map(metadata);
            }
        } catch (error) {
            if (this.logger) this.logger.warn('Failed to load save metadata', error);
        }
    }

    /**
     * Update metadata list in localStorage
     */
    updateMetadataList() {
        try {
            const metadata = Array.from(this.saveMetadata.entries());
            localStorage.setItem('cyberops_save_metadata', JSON.stringify(metadata));
        } catch (error) {
            if (this.logger) this.logger.warn('Failed to update metadata list', error);
        }
    }

    /**
     * Get all save slots
     */
    getAllSaveSlots() {
        const slots = [];

        this.saveMetadata.forEach((metadata, slotId) => {
            slots.push({
                slotId: slotId,
                ...metadata
            });
        });

        // Sort by timestamp (newest first)
        slots.sort((a, b) => b.timestamp - a.timestamp);

        return slots;
    }

    /**
     * Check version compatibility
     */
    isCompatibleVersion(version) {
        // Simple version check - can be more sophisticated
        const [major] = version.split('.');
        const [currentMajor] = this.config.saveVersion.split('.');
        return major === currentMajor;
    }

    /**
     * Migrate save to current version
     */
    async migrateSave(save) {
        if (this.logger) this.logger.info(`Migrating save from v${save.version} to v${this.config.saveVersion}`);

        // Add migration logic based on version differences
        // For now, just update version and hope for the best
        save.version = this.config.saveVersion;

        return save;
    }

    /**
     * Compress save data (placeholder - would use actual compression library)
     */
    async compressSaveData(data) {
        // In real implementation, use a compression library like pako
        return JSON.stringify(data);
    }

    /**
     * Decompress save data (placeholder)
     */
    async decompressSaveData(data) {
        // In real implementation, use a compression library like pako
        return typeof data === 'string' ? JSON.parse(data) : data;
    }

    /**
     * Export save to file
     */
    exportSave(slotId) {
        try {
            const save = this.saveSlots.get(slotId);
            if (!save) {
                throw new Error(`Save slot ${slotId} not found`);
            }

            const saveString = JSON.stringify(save, null, 2);
            const blob = new Blob([saveString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `cyberops_save_${slotId}_${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);

            if (this.logger) this.logger.info(`Save exported from slot ${slotId}`);
        } catch (error) {
            if (this.logger) this.logger.error('Failed to export save', error);
        }
    }

    /**
     * Import save from file
     */
    async importSave(file, slotId = null) {
        try {
            const text = await file.text();
            const save = JSON.parse(text);

            // Validate save structure
            if (!save.version || !save.data) {
                throw new Error('Invalid save file format');
            }

            // Use provided slot or generate new one
            const targetSlot = slotId || `imported_${Date.now()}`;

            // Store save
            this.saveSlots.set(targetSlot, save);
            this.saveMetadata.set(targetSlot, save.metadata);
            await this.persistSave(targetSlot, save);

            if (this.logger) this.logger.info(`Save imported to slot ${targetSlot}`);

            return { success: true, slotId: targetSlot };
        } catch (error) {
            if (this.logger) this.logger.error('Failed to import save', error);
            return { success: false, error: error.message };
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.SaveGameService = SaveGameService;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SaveGameService;
}