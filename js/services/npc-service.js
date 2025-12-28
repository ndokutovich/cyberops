/**
 * NPCService - Centralized NPC lifecycle management
 * Handles NPC spawning, updates, interactions, and queries
 * Rendering remains in game-npc.js
 */

class NPCService {
    constructor(questService = null) {
        this.logger = window.Logger ? new window.Logger('NPCService') : null;

        // Dependencies
        this.questService = questService;

        // NPC state
        this.npcs = [];
        this.npcInteractionRange = 3;
        this.dialogQueue = [];
        this.quests = {}; // Quest definitions for NPC dialog

        // Interaction tracking
        this.npcInteractions = new Set();

        // Dialog state
        this.currentNPC = null;
        this.dialogActive = false;

        // NPC templates cache (loaded from campaign)
        this.npcTemplates = null;

        if (this.logger) this.logger.info('NPCService initialized');
    }

    /**
     * Initialize with game context (for map access, etc.)
     */
    initialize(gameContext) {
        this.gameContext = gameContext;
        if (this.logger) this.logger.debug('NPCService context initialized');
    }

    /**
     * Set NPC templates from campaign
     */
    setTemplates(campaignId, templates) {
        this.npcTemplates = { campaignId, templates };
        if (this.logger) this.logger.debug(`NPC templates set for campaign: ${campaignId}`);
    }

    /**
     * Clear all NPCs (for mission end)
     */
    clearNPCs() {
        this.npcs = [];
        this.quests = {};
        this.npcInteractions.clear();
        this.currentNPC = null;
        this.dialogActive = false;
        if (this.logger) this.logger.debug('NPCs cleared');
    }

    /**
     * Get all NPCs
     */
    getNPCs() {
        return this.npcs;
    }

    /**
     * Get NPC by ID
     */
    getNPC(npcId) {
        return this.npcs.find(npc => npc.id === npcId);
    }

    /**
     * Find a valid spawn position near the desired location
     */
    findValidSpawnPosition(desiredX, desiredY) {
        const game = this.gameContext;
        if (!game) {
            return { x: desiredX, y: desiredY };
        }

        // First check if desired position is valid
        if (!game.isWall || !game.isWall(Math.floor(desiredX), Math.floor(desiredY))) {
            return { x: desiredX, y: desiredY };
        }

        // Search in expanding circles for a valid position
        for (let radius = 1; radius <= 5; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
                const testX = desiredX + Math.cos(angle) * radius;
                const testY = desiredY + Math.sin(angle) * radius;

                // Check map bounds
                const mapWidth = game.currentMap ? game.currentMap.width : 50;
                const mapHeight = game.currentMap ? game.currentMap.height : 50;

                if (testX >= 1 && testX < mapWidth - 1 &&
                    testY >= 1 && testY < mapHeight - 1) {
                    // Check if position is not a wall
                    if (!game.isWall || !game.isWall(Math.floor(testX), Math.floor(testY))) {
                        if (this.logger) this.logger.debug(`📍 Adjusted NPC spawn from (${desiredX},${desiredY}) to (${testX},${testY})`);
                        return { x: testX, y: testY };
                    }
                }
            }
        }

        // Must have valid spawn position from map
        throw new Error(`No valid spawn position found near (${desiredX},${desiredY}). Check map definition.`);
    }

    /**
     * Spawn NPCs for a mission
     */
    spawnNPCs(missionDef, missionIndex) {
        // Clear existing NPCs
        this.npcs = [];

        if (this.logger) {
            this.logger.debug(`👥 spawnNPCs called - missionIndex: ${missionIndex}`);
            this.logger.debug(`👥 missionDef.npcs: ${missionDef?.npcs?.length || 0}`);
        }

        // Get NPCs for current mission/map
        const npcConfigs = this.getNPCsForMission(missionDef);

        if (this.logger) this.logger.debug(`👥 getNPCsForMission returned: ${npcConfigs.length} configs`);

        for (let config of npcConfigs) {
            // Validate and adjust spawn position if needed
            const validPos = this.findValidSpawnPosition(config.x, config.y);
            config.x = validPos.x;
            config.y = validPos.y;

            // Create NPC using the NPC class from game-npc.js
            const npc = new window.NPC(config);
            this.npcs.push(npc);
        }

        if (this.logger) {
            this.logger.debug(`👥 Spawned ${this.npcs.length} NPCs for mission ${missionIndex + 1}`);
            this.npcs.forEach(npc => {
                this.logger.debug(`  - ${npc.name} at (${npc.x}, ${npc.y}) - ${npc.sprite}`);
            });
        }

        return this.npcs;
    }

    /**
     * Get NPC configurations for a mission
     */
    getNPCsForMission(missionDef) {
        const configs = [];

        // Only use NPCs from mission definition
        if (missionDef && missionDef.npcs) {
            if (this.logger) this.logger.debug('📋 Loading NPCs from mission definition');
            missionDef.npcs.forEach(npcDef => {
                const npcConfig = this.createNPCFromDefinition(npcDef);
                if (npcConfig) {
                    configs.push(npcConfig);
                }
            });
        }

        return configs;
    }

    /**
     * Create NPC from mission definition
     */
    createNPCFromDefinition(npcDef) {
        // Get templates from campaign
        const campaignId = this.npcTemplates?.campaignId ||
                          (this.gameContext?.currentCampaignId) || 'main';
        const npcTemplates = this.npcTemplates?.templates ||
                            (window.CAMPAIGN_NPC_TEMPLATES && window.CAMPAIGN_NPC_TEMPLATES[campaignId]);

        if (!npcTemplates || !npcTemplates[npcDef.id]) {
            if (this.logger) this.logger.warn(`No NPC template found for: ${npcDef.id} in campaign: ${campaignId}`);
            return null;
        }

        const template = npcTemplates[npcDef.id];

        // Create quests from template data
        const quests = [];
        if (template.quests && npcDef.quests) {
            template.quests.forEach(questData => {
                if (npcDef.quests.includes(questData.id)) {
                    quests.push(new window.Quest(questData));
                }
            });
        }

        return {
            id: npcDef.id,
            name: template.name,
            x: npcDef.spawn.x,
            y: npcDef.spawn.y,
            sprite: template.sprite,
            avatar: template.avatar,
            color: template.color,
            movementType: template.movementType,
            questState: {},
            dialog: template.dialog,
            quests: quests
        };
    }

    /**
     * Find nearby NPC that can be interacted with
     */
    getNearbyNPC(agent) {
        if (!this.npcs || this.npcs.length === 0) {
            if (this.logger) this.logger.debug('    ❌ No NPCs array');
            return null;
        }

        if (this.logger) this.logger.debug(`    Checking ${this.npcs.length} NPCs, range: ${this.npcInteractionRange}`);

        for (let npc of this.npcs) {
            if (!npc.alive) {
                if (this.logger) this.logger.debug(`    - ${npc.name}: dead`);
                continue;
            }

            const dist = Math.sqrt(
                Math.pow(npc.x - agent.x, 2) +
                Math.pow(npc.y - agent.y, 2)
            );

            if (this.logger) this.logger.debug(`    - ${npc.name} at (${npc.x.toFixed(1)}, ${npc.y.toFixed(1)}): distance = ${dist.toFixed(2)}`);

            if (dist <= this.npcInteractionRange) {
                if (this.logger) this.logger.debug(`    ✓ NPC in range!`);
                return npc;
            }
        }

        if (this.logger) this.logger.debug('    ❌ No NPC in range');
        return null;
    }

    /**
     * Update all NPCs
     */
    updateNPCs() {
        if (!this.npcs) return;

        const game = this.gameContext;
        if (!game) return;

        for (let npc of this.npcs) {
            npc.update(game);

            // Check quest completion every frame (not just on interaction)
            if (npc.questsGiven && npc.questsGiven.size > 0) {
                for (let questId of npc.questsGiven) {
                    const quest = this.quests[questId];

                    // Only check active quests that haven't been completed
                    if (quest && quest.active && !game.completedQuests?.has(questId)) {
                        // Check if all objectives are complete
                        if (quest.checkCompletion && quest.checkCompletion(game)) {
                            // Mark as ready to complete (but don't auto-complete)
                            if (!quest.readyToComplete) {
                                quest.readyToComplete = true;
                                if (game.addNotification) {
                                    game.addNotification(`✅ Quest Complete: Return to ${npc.name} for reward`);
                                }
                                if (this.logger) this.logger.info(`✅ Quest "${quest.name}" ready to complete`);
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Check if there's an NPC interaction pending
     */
    hasInteraction(npcId) {
        return this.npcInteractions.has(npcId);
    }

    /**
     * Track an NPC interaction
     */
    trackInteraction(npcId) {
        this.npcInteractions.add(npcId);
    }

    /**
     * Get all quests
     */
    getQuests() {
        return this.quests;
    }

    /**
     * Register a quest
     */
    registerQuest(questId, quest) {
        this.quests[questId] = quest;
    }

    /**
     * Get active quest list
     */
    getActiveQuests() {
        const active = [];
        for (let questId in this.quests) {
            const quest = this.quests[questId];
            if (quest.active) {
                active.push(quest);
            }
        }
        return active;
    }

    /**
     * Save state for save/load system
     */
    saveState() {
        return {
            npcInteractions: Array.from(this.npcInteractions),
            quests: this.quests,
            npcs: this.npcs.map(npc => ({
                id: npc.id,
                x: npc.x,
                y: npc.y,
                alive: npc.alive,
                questsGiven: Array.from(npc.questsGiven || []),
                questsCompleted: Array.from(npc.questsCompleted || []),
                dialogState: npc.dialogState,
                currentDialogIndex: npc.currentDialogIndex
            }))
        };
    }

    /**
     * Load state from save
     */
    loadState(state) {
        if (!state) return;

        this.npcInteractions = new Set(state.npcInteractions || []);
        this.quests = state.quests || {};

        // Restore NPC state (positions, quest states)
        if (state.npcs && this.npcs) {
            state.npcs.forEach(savedNpc => {
                const npc = this.npcs.find(n => n.id === savedNpc.id);
                if (npc) {
                    npc.x = savedNpc.x;
                    npc.y = savedNpc.y;
                    npc.alive = savedNpc.alive;
                    npc.questsGiven = new Set(savedNpc.questsGiven || []);
                    npc.questsCompleted = new Set(savedNpc.questsCompleted || []);
                    npc.dialogState = savedNpc.dialogState;
                    npc.currentDialogIndex = savedNpc.currentDialogIndex || 0;
                }
            });
        }

        if (this.logger) this.logger.info('NPC state loaded');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.NPCService = NPCService;
}
