/**
 * MissionStateService
 * Handles mission state isolation - missions operate on snapshots, changes only persist on victory
 *
 * Architecture:
 * - Before mission: Create snapshot of game state
 * - During mission: All changes are isolated
 * - On victory: Merge mission results back to game state
 * - On defeat/retry: Restore snapshot, discard mission state
 */
class MissionStateService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('MissionStateService') : null;

        // Pre-mission snapshot
        this.snapshot = null;
        this.missionActive = false;

        // Mission results (accumulated during mission)
        this.missionResults = {
            xpGained: new Map(),      // agentId -> xp
            itemsFound: [],            // items picked up
            resourcesEarned: {},       // credits, research, etc
            agentDeaths: [],           // agents that died
            objectivesCompleted: []    // completed objectives
        };
    }

    /**
     * Create snapshot before mission starts
     * This is the "save point" we restore on retry
     */
    createSnapshot(game) {
        if (this.logger) this.logger.info('📸 Creating pre-mission snapshot');

        // SIMPLE APPROACH: Just save the ENTIRE AgentService state
        // This includes activeAgents, availableAgents, fallenAgents, and all agent data
        const agentServiceState = game.gameServices?.agentService ?
            game.gameServices.agentService.exportState() : null;

        // DEBUG: Log agent positions at snapshot time
        if (this.logger && agentServiceState && agentServiceState.activeAgents) {
            this.logger.debug(`📍 Snapshot agent positions:`);
            agentServiceState.activeAgents.forEach((agent, i) => {
                this.logger.debug(`   Agent ${i} (${agent.name}): pos=(${agent.x}, ${agent.y}), target=(${agent.targetX}, ${agent.targetY})`);
            });
        }

        this.snapshot = {
            // Complete AgentService state (ALL agents with full data)
            agentServiceState: agentServiceState,

            // Selected agents for this mission (ONLY IDs, not objects!)
            // CRITICAL: Convert to IDs if they're objects
            selectedAgents: (game.selectedAgents || []).map(agent =>
                typeof agent === 'object' ? agent.id : agent
            ),

            // Resources (DON'T spend on retry)
            credits: game.credits || 0,
            researchPoints: game.researchPoints || 0,
            worldControl: game.worldControl || 0,

            // Inventory state
            inventory: game.gameServices?.inventoryService ?
                JSON.parse(JSON.stringify(game.gameServices.inventoryService.exportState())) : null,

            // RPG state (XP, stats - don't gain on retry)
            rpgState: game.gameServices?.rpgService ?
                this.snapshotRPGState(game) : null,

            // Mission index
            currentMissionIndex: game.currentMissionIndex,

            // Timestamp
            timestamp: Date.now()
        };

        this.missionActive = true;
        this.resetMissionResults();

        if (this.logger) {
            const agentCount = agentServiceState ? agentServiceState.activeAgents.length : 0;
            this.logger.info(`✅ Snapshot created with ${agentCount} active agents`);
            this.logger.debug(`   Selected agents for mission: ${this.snapshot.selectedAgents.join(', ')}`);
            this.logger.debug(`   Credits: ${this.snapshot.credits}, Research: ${this.snapshot.researchPoints}`);
        }
        return this.snapshot;
    }

    /**
     * Snapshot RPG state (XP, level, stats)
     */
    snapshotRPGState(game) {
        if (!game.gameServices?.rpgService) return null;

        const rpgService = game.gameServices.rpgService;
        const snapshot = {
            entities: [] // Array of [agentId, entityData] pairs for JSON serialization
        };

        // Snapshot each agent's RPG state
        if (game.selectedAgents) {
            game.selectedAgents.forEach(agentId => {
                const entity = rpgService.rpgManager?.getEntity(agentId);
                if (entity) {
                    snapshot.entities.push([agentId, {
                        xp: entity.xp,
                        level: entity.level,
                        skillPoints: entity.skillPoints,
                        stats: { ...entity.stats },
                        skills: { ...entity.skills }
                    }]);
                }
            });
        }

        return snapshot;
    }

    /**
     * Restore snapshot (on defeat/retry)
     * Returns restored game state
     */
    restoreSnapshot(game) {
        if (!this.snapshot) {
            if (this.logger) this.logger.error('❌ No snapshot to restore!');
            return false;
        }

        try {
            if (this.logger) {
                this.logger.info('⏮️ Restoring pre-mission snapshot');
                const agentCount = this.snapshot.agentServiceState ? this.snapshot.agentServiceState.activeAgents.length : 0;
                this.logger.debug(`   Snapshot has ${agentCount} active agents`);
                this.logger.debug(`   Selected agents: ${this.snapshot.selectedAgents.join(', ')}`);
            }

            // Restore resources (credits not spent on retry)
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.set('credits', this.snapshot.credits, 'mission retry');
                game.gameServices.resourceService.set('researchPoints', this.snapshot.researchPoints, 'mission retry');
                game.gameServices.resourceService.set('worldControl', this.snapshot.worldControl, 'mission retry');
            }
            if (this.logger) this.logger.debug('✓ Resources restored');

            // Restore inventory
            if (this.snapshot.inventory && game.gameServices?.inventoryService) {
                game.gameServices.inventoryService.importState(this.snapshot.inventory);
                if (this.logger) this.logger.debug('✓ Inventory restored');
            }

            // Restore RPG state (XP not gained on retry)
            if (this.snapshot.rpgState && game.gameServices?.rpgService) {
                this.restoreRPGState(game, this.snapshot.rpgState);
                if (this.logger) this.logger.debug('✓ RPG state restored');
            }

            // SIMPLE APPROACH: Just restore the ENTIRE AgentService state
            // This automatically restores ALL agents (active, available, fallen) with all their data
            if (this.snapshot.agentServiceState && game.gameServices?.agentService) {
                if (this.logger) this.logger.debug('→ Restoring complete AgentService state...');

                // DEBUG: Log positions BEFORE import
                if (this.logger && this.snapshot.agentServiceState.activeAgents) {
                    this.logger.debug(`📍 Snapshot activeAgents positions (being restored):`);
                    this.snapshot.agentServiceState.activeAgents.forEach((agent, i) => {
                        this.logger.debug(`   Agent ${i} (${agent.name}): pos=(${agent.x}, ${agent.y}), target=(${agent.targetX}, ${agent.targetY})`);
                    });
                }

                game.gameServices.agentService.importState(this.snapshot.agentServiceState);

                // DEBUG: Log positions AFTER import
                if (this.logger && game.activeAgents) {
                    this.logger.debug(`📍 After restore - activeAgents positions:`);
                    game.activeAgents.forEach((agent, i) => {
                        this.logger.debug(`   Agent ${i} (${agent.name}): pos=(${agent.x}, ${agent.y}), target=(${agent.targetX}, ${agent.targetY})`);
                    });
                }

                if (this.logger) {
                    this.logger.debug(`✓ AgentService state restored`);
                    this.logger.debug(`   Active agents: ${game.activeAgents.length}`);
                    this.logger.debug(`   Available agents: ${game.gameServices.agentService.availableAgents.length}`);
                    this.logger.debug(`   Fallen agents: ${game.gameServices.agentService.fallenAgents.length}`);
                }

                // NOTE: game.agents is now a computed property
                // It will automatically update when we restore selectedAgents
            }

            // Restore selected agents (this will automatically update game.agents via computed property)
            game.selectedAgents = [...this.snapshot.selectedAgents];
            game.currentMissionIndex = this.snapshot.currentMissionIndex;

            if (this.logger) {
                this.logger.info('✅ Snapshot restored successfully');
                this.logger.debug(`   game.agents rebuilt: ${game.agents?.length || 0} agents`);
                this.logger.debug(`   game.selectedAgents: ${game.selectedAgents?.length || 0} agents`);
                this.logger.debug(`   game.activeAgents: ${game.activeAgents?.length || 0} agents`);
            }
            return true;
        } catch (error) {
            if (this.logger) this.logger.error('❌ Error restoring snapshot:', error);
            return false;
        }
    }

    /**
     * Restore RPG state from snapshot
     */
    restoreRPGState(game, rpgSnapshot) {
        if (!game.gameServices?.rpgService) return;

        const rpgService = game.gameServices.rpgService;

        // Iterate over array of [agentId, entityData] pairs
        rpgSnapshot.entities.forEach(([agentId, entityData]) => {
            const entity = rpgService.rpgManager?.getEntity(agentId);
            if (entity) {
                entity.xp = entityData.xp;
                entity.level = entityData.level;
                entity.skillPoints = entityData.skillPoints;
                entity.stats = { ...entityData.stats };
                entity.skills = { ...entityData.skills };
            }
        });

        if (this.logger) this.logger.info('✅ RPG state restored from snapshot');
    }

    /**
     * Reset mission results tracking
     */
    resetMissionResults() {
        this.missionResults = {
            xpGained: new Map(),
            itemsFound: [],
            resourcesEarned: {},
            agentDeaths: [],
            objectivesCompleted: []
        };
    }

    /**
     * Track XP gained during mission
     */
    addXP(agentId, amount) {
        const current = this.missionResults.xpGained.get(agentId) || 0;
        this.missionResults.xpGained.set(agentId, current + amount);
    }

    /**
     * Track item found during mission
     */
    addItem(item) {
        this.missionResults.itemsFound.push(item);
    }

    /**
     * Track resources earned during mission
     */
    addResources(type, amount) {
        this.missionResults.resourcesEarned[type] =
            (this.missionResults.resourcesEarned[type] || 0) + amount;
    }

    /**
     * Track agent death during mission
     */
    trackAgentDeath(agentId) {
        if (!this.missionResults.agentDeaths.includes(agentId)) {
            this.missionResults.agentDeaths.push(agentId);
        }
    }

    /**
     * Merge mission results on victory
     */
    mergeResults(game) {
        if (!this.snapshot) {
            if (this.logger) this.logger.warn('⚠️ No snapshot - cannot merge results');
            return;
        }

        if (this.logger) this.logger.info('✅ Mission victory - merging results');

        // Apply XP gains
        this.missionResults.xpGained.forEach((xp, agentId) => {
            if (game.gameServices?.rpgService?.rpgManager) {
                game.gameServices.rpgService.rpgManager.addXP(agentId, xp);
                if (this.logger) this.logger.info(`📈 Agent ${agentId} gained ${xp} XP`);
            }
        });

        // Add items found
        this.missionResults.itemsFound.forEach(item => {
            if (game.gameServices?.inventoryService) {
                game.gameServices.inventoryService.addItem(item);
                if (this.logger) this.logger.info(`📦 Found item: ${item.name}`);
            }
        });

        // Add resources earned
        Object.entries(this.missionResults.resourcesEarned).forEach(([type, amount]) => {
            if (game.gameServices?.resourceService) {
                game.gameServices.resourceService.add(type, amount, 'mission reward');
                if (this.logger) this.logger.info(`💰 Earned ${amount} ${type}`);
            }
        });

        // Process agent deaths (permanent on victory)
        this.missionResults.agentDeaths.forEach(agentId => {
            // Agent stays dead - already in fallenAgents from killAgent
            if (this.logger) this.logger.info(`☠️ Agent ${agentId} death is permanent`);
        });

        // Clear snapshot after successful merge
        this.snapshot = null;
        this.missionActive = false;
        this.resetMissionResults();

        if (this.logger) this.logger.info('✅ Mission results merged successfully');
    }

    /**
     * Discard mission state on defeat (no merge)
     */
    discardMission() {
        if (this.logger) this.logger.info('❌ Mission failed - discarding mission state');

        // Just reset - snapshot will be restored on retry
        this.resetMissionResults();
        // Keep snapshot for retry
        // missionActive stays true until retry or return to hub
    }

    /**
     * Clear snapshot (when returning to hub after defeat)
     */
    clearSnapshot() {
        this.snapshot = null;
        this.missionActive = false;
        this.resetMissionResults();
        if (this.logger) this.logger.info('🧹 Mission snapshot cleared');
    }

    /**
     * Check if mission is active
     */
    isMissionActive() {
        return this.missionActive;
    }

    /**
     * Get snapshot info
     */
    getSnapshotInfo() {
        if (!this.snapshot) return null;

        const agentCount = this.snapshot.agentServiceState ?
            this.snapshot.agentServiceState.activeAgents.length : 0;

        return {
            timestamp: this.snapshot.timestamp,
            agentCount: agentCount,
            credits: this.snapshot.credits,
            missionIndex: this.snapshot.currentMissionIndex
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionStateService;
}
