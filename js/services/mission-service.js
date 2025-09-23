/**
 * MissionService - Centralized mission state and objective management
 * Handles mission lifecycle, objectives, and completion tracking
 */
class MissionService {
    constructor(resourceService = null, agentService = null) {
        // Logger
        this.logger = window.Logger ? new window.Logger('MissionService') : null;

        // Service dependencies
        this.resourceService = resourceService;
        this.agentService = agentService;

        // Current mission state
        this.currentMission = null;
        this.missionStatus = 'idle'; // idle, briefing, active, completed, failed
        this.missionStartTime = 0;
        this.missionTimer = 0;

        // Mission objectives
        this.objectives = [];
        this.completedObjectives = new Set();
        this.failedObjectives = new Set();

        // Mission trackers
        this.trackers = {
            enemiesEliminated: 0,
            enemiesEliminatedByType: {}, // Track by type: guard, soldier, heavy, etc.
            itemsCollected: 0,
            terminalsHacked: 0,
            areasReached: 0,
            timeElapsed: 0,
            agentsLost: 0,
            damageTaken: 0,
            damageDealt: 0,
            alertsTriggered: 0,
            civiliansCasualties: 0
        };

        // Track specific interacted objects
        this.interactedObjects = new Set();

        // Per-objective timers
        this.objectiveTimers = {};

        // Mission history
        this.completedMissions = [];
        this.failedMissions = [];
        this.missionStats = new Map(); // missionId -> stats

        // Quest tracking (NPCs manage quest dialog, we track state)
        this.activeQuests = new Map(); // questId -> quest
        this.completedQuests = new Set();
        this.questProgress = new Map(); // questId -> progress

        // Extraction state
        this.extractionEnabled = false;
        this.extractionPoint = null;
        this.extractionTimer = 0;

        // Configuration
        this.config = {
            autoExtraction: true,
            objectiveTimeout: 0, // 0 = no timeout
            bonusObjectiveRewards: 1.5,
            failurePenalty: 0.5
        };

        // Event listeners
        this.listeners = {
            start: [],
            complete: [],
            fail: [],
            objectiveComplete: [],
            objectiveFail: [],
            extractionEnabled: [],
            update: [],
            any: []
        };
    }

    /**
     * Start a mission
     */
    startMission(missionData) {
        if (this.missionStatus === 'active') {
            if (this.logger) this.logger.warn('⚠️ Mission already in progress');
            return false;
        }

        // Set current mission
        this.currentMission = {
            id: missionData.id,
            name: missionData.name || 'Unknown Mission',
            type: missionData.type || 'standard',
            difficulty: missionData.difficulty || 'normal',
            rewards: missionData.rewards || {},
            map: missionData.map || null,
            briefing: missionData.briefing || '',
            extractionPoint: missionData.extractionPoint || null
        };

        // Initialize objectives
        this.objectives = this.parseObjectives(missionData.objectives || []);
        this.completedObjectives.clear();
        this.failedObjectives.clear();

        // Reset trackers
        Object.keys(this.trackers).forEach(key => {
            if (key === 'enemiesEliminatedByType') {
                this.trackers[key] = {};
            } else {
                this.trackers[key] = 0;
            }
        });

        // Reset object tracking
        this.interactedObjects.clear();
        this.objectiveTimers = {};

        // Set extraction point
        this.extractionPoint = missionData.extractionPoint || missionData.map?.extraction;
        this.extractionEnabled = false;
        this.extractionTimer = 0;

        // Update status
        this.missionStatus = 'active';
        this.missionStartTime = Date.now();
        this.missionTimer = 0;

        // Log event
        if (this.logger) {
            this.logger.info(`🎯 Mission started: ${this.currentMission.name}`, {
                missionId: this.currentMission.id,
                difficulty: this.currentMission.difficulty
            });
        }

        // Notify listeners
        this.notifyListeners('start', { mission: this.currentMission });

        return true;
    }

    /**
     * Parse mission objectives
     */
    parseObjectives(objectiveData) {
        return objectiveData.map((obj, index) => {
            // Parse target - handle both old and new mission formats
            let target = {};
            if (typeof obj.target === 'string') {
                // Simple target like 'all' or enemy type
                target.type = obj.target;
            } else if (obj.target) {
                target = obj.target;
            }

            // Add count to target if at top level
            if (obj.count) {
                target.count = obj.count;
            }

            return {
                id: obj.id || `obj_${index}`,
                type: obj.type || 'custom',
                description: obj.description || 'Complete objective',
                displayText: obj.displayText || obj.description || 'Complete objective', // Preserve displayText
                required: obj.required !== false,
                bonus: obj.bonus || false,
                hidden: obj.hidden || false,
                target: target,
                tracker: obj.tracker, // Preserve tracker for compatibility
                progress: 0,
                maxProgress: this.getObjectiveMaxProgress(obj),
                status: 'pending', // pending, active, completed, failed
                active: true, // Add active flag for compatibility
                completed: false, // Add completed flag for compatibility
                rewards: obj.rewards || {}
            };
        });
    }

    /**
     * Get objective max progress
     */
    getObjectiveMaxProgress(objective) {
        // Check count at top level first (mission format), then in target
        if (objective.count) {
            return objective.count;
        }
        if (objective.target) {
            return objective.target.count || objective.target.amount || 1;
        }
        return 1;
    }

    /**
     * Update mission progress
     */
    update(deltaTime) {
        if (this.missionStatus !== 'active') return;

        // Update timer
        this.missionTimer += deltaTime;
        this.trackers.timeElapsed = Math.floor(this.missionTimer / 1000);

        // Update per-objective timers for survive objectives
        this.objectives.forEach(obj => {
            if (obj.type === 'survive' && obj.status === 'active') {
                if (!this.objectiveTimers[obj.id]) {
                    this.objectiveTimers[obj.id] = 0;
                }
                this.objectiveTimers[obj.id] += deltaTime / 1000; // Convert to seconds

                // Check if survival time met
                if (this.objectiveTimers[obj.id] >= obj.target.duration) {
                    obj.progress = obj.maxProgress;
                    this.completeObjective(obj.id);
                }
            }
        });

        // Check objective timeouts
        if (this.config.objectiveTimeout > 0) {
            if (this.trackers.timeElapsed > this.config.objectiveTimeout) {
                this.failMission('Time limit exceeded');
                return;
            }
        }

        // Update extraction timer
        if (this.extractionEnabled && this.extractionTimer > 0) {
            this.extractionTimer -= deltaTime;
            if (this.extractionTimer <= 0) {
                if (this.logger) this.logger.info('⏰ Extraction timer expired');
            }
        }

        // Check win/lose conditions
        this.checkMissionStatus();
    }

    /**
     * Track an event for objectives
     */
    trackEvent(eventType, eventData = {}) {
        if (this.missionStatus !== 'active') return;

        // Update trackers
        switch (eventType) {
            case 'eliminate':
                this.trackers.enemiesEliminated++;

                // Track by type
                const enemyType = eventData.type || 'unknown';
                if (!this.trackers.enemiesEliminatedByType[enemyType]) {
                    this.trackers.enemiesEliminatedByType[enemyType] = 0;
                }
                this.trackers.enemiesEliminatedByType[enemyType]++;

                if (this.logger) this.logger.info(`🎯 Enemy eliminated: ${enemyType} (${this.trackers.enemiesEliminated} total, ${this.trackers.enemiesEliminatedByType[enemyType]} ${enemyType})`);
                this.checkObjectiveProgress('eliminate', { enemy: enemyType });
                break;

            case 'collect':
                this.trackers.itemsCollected++;
                if (this.logger) this.logger.debug(`📦 Item collected: ${eventData.type || 'unknown'}`);
                this.checkObjectiveProgress('collect', { item: eventData.type });
                break;

            case 'terminal':
                this.trackers.terminalsHacked++;

                // Track specific object
                const terminalId = eventData.id;
                if (terminalId) {
                    this.interactedObjects.add(terminalId);
                }

                if (this.logger) this.logger.info(`💻 Terminal hacked: ${terminalId || 'unknown'}`);
                // Check both 'hack' and 'interact' type objectives for terminals
                this.checkObjectiveProgress('hack', { terminal: terminalId, id: terminalId });
                this.checkObjectiveProgress('interact', { terminal: terminalId, id: terminalId });
                break;

            case 'areaReached':
                this.trackers.areasReached++;
                this.checkObjectiveProgress('reach', { area: eventData.areaId });
                break;

            case 'agentLost':
                this.trackers.agentsLost++;
                this.checkObjectiveProgress('survive', { agentsLost: this.trackers.agentsLost });
                break;

            case 'damageTaken':
                this.trackers.damageTaken += eventData.amount || 0;
                break;

            case 'damageDealt':
                this.trackers.damageDealt += eventData.amount || 0;
                break;

            case 'alertTriggered':
                this.trackers.alertsTriggered++;
                this.checkObjectiveProgress('stealth', { alerts: this.trackers.alertsTriggered });
                break;

            case 'civilianKilled':
                this.trackers.civiliansCasualties++;
                this.checkObjectiveProgress('protect', { casualties: this.trackers.civiliansCasualties });
                break;

            case 'interact':
                // Generic interaction event for explosives, switches, gates, etc.
                const targetId = eventData.id;

                if (targetId) {
                    this.interactedObjects.add(targetId);
                }

                // Track specific interaction types
                if (eventData.type === 'explosive') {
                    this.trackers.explosivesPlanted++;
                    if (this.logger) this.logger.info(`💣 Explosive planted: ${targetId || 'unknown'}`);
                } else if (eventData.type === 'switch') {
                    this.trackers.switchesActivated++;
                    if (this.logger) this.logger.info(`🔌 Switch activated: ${targetId || 'unknown'}`);
                } else if (eventData.type === 'gate') {
                    this.trackers.gatesBreached++;
                    if (this.logger) this.logger.info(`🚪 Gate breached: ${targetId || 'unknown'}`);
                }

                this.checkObjectiveProgress('interact', eventData);
                break;
        }

        // Log event
        if (this.eventLogService) {
            this.eventLogService.log('mission', eventType, eventData);
        }
    }

    /**
     * Check objective progress
     */
    checkObjectiveProgress(type, data = {}) {
        let objectivesUpdated = false;

        this.objectives.forEach(objective => {
            if (objective.status !== 'pending' && objective.status !== 'active') return;
            if (objective.type !== type && objective.type !== 'custom') return;

            // Update progress based on type
            let progressMade = false;

            switch (objective.type) {
                case 'eliminate':
                    // Check if target matches
                    if (!objective.target.type || objective.target.type === 'all' || objective.target.type === 'enemy') {
                        // Any enemy counts
                        objective.progress++;
                        progressMade = true;
                    } else if (objective.target.type === data.type) {
                        // Specific type must match (data.type is the enemy type)
                        objective.progress++;
                        progressMade = true;
                    }

                    // Use TRACE to avoid spam
                    if (progressMade && this.logger) {
                        this.logger.trace(`🎯 Eliminate progress: ${objective.progress}/${objective.maxProgress}`);
                    }
                    break;

                case 'collect':
                    if (!objective.target.type || objective.target.type === data.item) {
                        objective.progress++;
                        progressMade = true;
                    }
                    break;

                case 'interact':  // Support both 'interact' and 'hack' types
                case 'hack':
                    // Check if this is for the right target type
                    if (objective.target && objective.target.type === 'terminal') {
                        // This is a terminal objective
                        if (!objective.target.id) {
                            // Any terminal counts
                            objective.progress++;
                            progressMade = true;
                        } else if (objective.target.id === data.id || objective.target.id === data.terminal) {
                            // Specific terminal must match
                            objective.progress++;
                            progressMade = true;
                        }
                    } else if (!objective.target || !objective.target.type) {
                        // No specific target type, treat as generic hack/interact
                        if (!objective.target || !objective.target.id) {
                            // Any interaction counts
                            objective.progress++;
                            progressMade = true;
                        } else if (objective.target.id === data.id || objective.target.id === data.terminal) {
                            // Specific target must match
                            objective.progress++;
                            progressMade = true;
                        }
                    } else if (objective.target && objective.target.specific && Array.isArray(objective.target.specific)) {
                        // Check if all specific terminals are hacked
                        const allHacked = objective.target.specific.every(id =>
                            this.interactedObjects.has(id)
                        );
                        if (allHacked) {
                            objective.progress = objective.maxProgress;
                            progressMade = true;
                        }
                    }
                    break;

                case 'reach':
                    if (!objective.target.id || objective.target.id === data.area) {
                        objective.progress = objective.maxProgress;
                        progressMade = true;
                    }
                    break;

                case 'survive':
                    // Check if too many agents lost
                    if (data.agentsLost > (objective.target.maxLosses || 0)) {
                        this.failObjective(objective.id);
                        return;
                    }
                    break;

                case 'stealth':
                    // Check if too many alerts
                    if (data.alerts > (objective.target.maxAlerts || 0)) {
                        this.failObjective(objective.id);
                        return;
                    }
                    break;

                case 'protect':
                    // Check if too many casualties
                    if (data.casualties > (objective.target.maxCasualties || 0)) {
                        this.failObjective(objective.id);
                        return;
                    }
                    break;

                case 'custom':
                    // Custom objectives need external completion
                    break;
            }

            if (progressMade) {
                objective.status = 'active';
                objective.active = true; // For compatibility
                objectivesUpdated = true;

                // Check if completed
                if (objective.progress >= objective.maxProgress) {
                    this.completeObjective(objective.id);
                } else {
                    // Update completed flag for compatibility
                    objective.completed = false;
                }

                // Only log at INFO when progress is actually made, not every frame
                if (this.logger) this.logger.debug(`📋 Objective progress: "${objective.description}" - ${objective.progress}/${objective.maxProgress}`);
            }
        });

        if (objectivesUpdated) {
            this.checkExtractionEligibility();
        }
    }

    /**
     * Complete an objective
     */
    completeObjective(objectiveId) {
        const objective = this.objectives.find(o => o.id === objectiveId);
        if (!objective || objective.status === 'completed') return;

        objective.status = 'completed';
        objective.completed = true; // For compatibility with game-mission-executor
        objective.progress = objective.maxProgress;
        this.completedObjectives.add(objectiveId);

        // Apply rewards if any
        if (objective.rewards && this.resourceService) {
            this.resourceService.applyMissionRewards(objective.rewards);
        }

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logQuest('objective', objective.description, {
                objectiveId,
                bonus: objective.bonus
            });
        }

        // Notify listeners
        this.notifyListeners('objectiveComplete', { objective });

        if (this.logger) this.logger.info(`✅ Objective completed: ${objective.description}`);

        // Check extraction eligibility
        this.checkExtractionEligibility();
    }

    /**
     * Fail an objective
     */
    failObjective(objectiveId) {
        const objective = this.objectives.find(o => o.id === objectiveId);
        if (!objective || objective.status === 'failed') return;

        objective.status = 'failed';
        this.failedObjectives.add(objectiveId);

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logQuest('objective_failed', objective.description, {
                objectiveId,
                required: objective.required
            });
        }

        // Notify listeners
        this.notifyListeners('objectiveFail', { objective });

        if (this.logger) this.logger.warn(`❌ Objective failed: ${objective.description}`);

        // Check if mission failed
        if (objective.required) {
            this.failMission(`Required objective failed: ${objective.description}`);
        }
    }

    /**
     * Check extraction eligibility
     */
    checkExtractionEligibility() {
        if (this.extractionEnabled) return;

        // Check if all required objectives are complete
        const requiredObjectives = this.objectives.filter(o => o.required);
        const completedRequired = requiredObjectives.every(o => o.status === 'completed');

        if (completedRequired) {
            this.enableExtraction();
        }
    }

    /**
     * Enable extraction
     */
    enableExtraction() {
        if (this.extractionEnabled) return;

        this.extractionEnabled = true;
        this.extractionTimer = 0;

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logMission('extract', 'Extraction point activated');
        }

        // Notify listeners
        this.notifyListeners('extractionEnabled', {
            point: this.extractionPoint,
            autoExtraction: this.config.autoExtraction
        });

        if (this.logger) this.logger.info('🚁 Extraction point activated!');
    }

    /**
     * Complete mission
     */
    completeMission(extracted = true) {
        if (this.missionStatus !== 'active') return;

        const missionTime = Date.now() - this.missionStartTime;

        // Calculate completion stats
        const stats = {
            missionId: this.currentMission.id,
            missionName: this.currentMission.name,
            completed: true,
            extracted,
            time: missionTime,
            objectivesCompleted: this.completedObjectives.size,
            objectivesTotal: this.objectives.length,
            bonusObjectives: this.objectives.filter(o => o.bonus && o.status === 'completed').length,
            ...this.trackers
        };

        // Calculate rewards
        let rewards = { ...this.currentMission.rewards };

        // Apply bonus multiplier for bonus objectives
        const bonusCount = stats.bonusObjectives;
        if (bonusCount > 0) {
            const multiplier = 1 + (bonusCount * 0.25);
            if (rewards.credits) rewards.credits = Math.floor(rewards.credits * multiplier);
            if (rewards.researchPoints) rewards.researchPoints = Math.floor(rewards.researchPoints * multiplier);
        }

        // Apply rewards
        if (this.resourceService) {
            this.resourceService.applyMissionRewards(rewards);
        }

        // Save to history
        this.completedMissions.push(this.currentMission.id);
        this.missionStats.set(this.currentMission.id, stats);

        // Update status
        this.missionStatus = 'completed';

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logMission('complete', this.currentMission.name, stats);
        }

        // Notify listeners
        this.notifyListeners('complete', { mission: this.currentMission, stats, rewards });

        if (this.logger) this.logger.info(`🏆 Mission completed: ${this.currentMission.name}`);
        return { stats, rewards };
    }

    /**
     * Fail mission
     */
    failMission(reason = 'Unknown') {
        if (this.missionStatus !== 'active') return;

        const missionTime = Date.now() - this.missionStartTime;

        // Calculate failure stats
        const stats = {
            missionId: this.currentMission.id,
            missionName: this.currentMission.name,
            completed: false,
            reason,
            time: missionTime,
            objectivesCompleted: this.completedObjectives.size,
            objectivesTotal: this.objectives.length,
            ...this.trackers
        };

        // Apply penalty if configured
        if (this.config.failurePenalty > 0 && this.resourceService) {
            const penalty = Math.floor(1000 * this.config.failurePenalty);
            this.resourceService.spend('credits', penalty, `Mission failure: ${reason}`);
        }

        // Save to history
        this.failedMissions.push(this.currentMission.id);
        this.missionStats.set(this.currentMission.id, stats);

        // Update status
        this.missionStatus = 'failed';

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logMission('fail', this.currentMission.name, { reason, ...stats });
        }

        // Notify listeners
        this.notifyListeners('fail', { mission: this.currentMission, reason, stats });

        if (this.logger) this.logger.warn(`💀 Mission failed: ${this.currentMission.name} - ${reason}`);
        return { stats, reason };
    }

    /**
     * Abort mission
     */
    abortMission() {
        if (this.missionStatus === 'active') {
            this.failMission('Mission aborted');
        }
    }

    /**
     * Check mission status
     */
    checkMissionStatus() {
        if (this.missionStatus !== 'active') return;

        // Check for automatic failure conditions
        if (this.agentService) {
            const aliveAgents = this.agentService.getActiveAgents().filter(a => a.alive);
            if (aliveAgents.length === 0) {
                this.failMission('All agents eliminated');
                return;
            }
        }

        // Check if all objectives are either completed or failed
        const allResolved = this.objectives.every(o =>
            o.status === 'completed' || o.status === 'failed'
        );

        if (allResolved && this.config.autoExtraction) {
            // Check if we can complete the mission
            const requiredComplete = this.objectives
                .filter(o => o.required)
                .every(o => o.status === 'completed');

            if (requiredComplete) {
                this.completeMission(true);
            } else {
                this.failMission('Required objectives not completed');
            }
        }
    }

    /**
     * Get mission progress
     */
    getMissionProgress() {
        if (!this.currentMission) return null;

        return {
            mission: this.currentMission,
            status: this.missionStatus,
            time: Math.floor(this.missionTimer / 1000),
            objectives: this.objectives.map(o => ({
                id: o.id,
                description: o.description,
                progress: o.progress,
                maxProgress: o.maxProgress,
                status: o.status,
                required: o.required,
                bonus: o.bonus
            })),
            extractionEnabled: this.extractionEnabled,
            trackers: { ...this.trackers }
        };
    }

    /**
     * Get mission statistics
     */
    getMissionStatistics(missionId = null) {
        if (missionId) {
            return this.missionStats.get(missionId) || null;
        }

        return {
            totalMissions: this.completedMissions.length + this.failedMissions.length,
            completed: this.completedMissions.length,
            failed: this.failedMissions.length,
            successRate: this.completedMissions.length / Math.max(1, this.completedMissions.length + this.failedMissions.length),
            totalTime: Array.from(this.missionStats.values()).reduce((sum, s) => sum + s.time, 0),
            totalKills: Array.from(this.missionStats.values()).reduce((sum, s) => sum + s.enemiesEliminated, 0)
        };
    }

    /**
     * Is mission active
     */
    isMissionActive() {
        return this.missionStatus === 'active';
    }

    /**
     * Reset mission state
     */
    reset() {
        this.currentMission = null;
        this.missionStatus = 'idle';
        this.objectives = [];
        this.completedObjectives.clear();
        this.failedObjectives.clear();
        this.extractionEnabled = false;

        // Reset all trackers
        Object.keys(this.trackers).forEach(key => {
            if (key === 'enemiesEliminatedByType') {
                this.trackers[key] = {};
            } else {
                this.trackers[key] = 0;
            }
        });

        // Reset object and timer tracking
        this.interactedObjects.clear();
        this.objectiveTimers = {};

        if (this.logger) this.logger.info('🔄 Mission service reset');
    }

    /**
     * Export state
     */
    exportState() {
        return {
            currentMission: this.currentMission,
            missionStatus: this.missionStatus,
            completedMissions: [...this.completedMissions],
            failedMissions: [...this.failedMissions],
            missionStats: Array.from(this.missionStats.entries())
        };
    }

    /**
     * Import state
     */
    importState(state) {
        if (state.currentMission) this.currentMission = state.currentMission;
        if (state.missionStatus) this.missionStatus = state.missionStatus;
        if (state.completedMissions) this.completedMissions = [...state.completedMissions];
        if (state.failedMissions) this.failedMissions = [...state.failedMissions];
        if (state.missionStats) {
            this.missionStats = new Map(state.missionStats);
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
                    if (this.logger) this.logger.error(`Error in mission listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                if (this.logger) this.logger.error('Error in global mission listener:', e);
            }
        });
    }

    // =====================
    // QUEST MANAGEMENT
    // =====================

    /**
     * Register a quest from an NPC
     * NPCs still manage dialog, we track state
     */
    registerQuest(quest) {
        if (!quest || !quest.id) {
            if (this.logger) this.logger.warn('Invalid quest data');
            return false;
        }

        // Add to active quests
        this.activeQuests.set(quest.id, {
            ...quest,
            startTime: Date.now(),
            progress: 0
        });

        // Initialize progress tracking
        this.questProgress.set(quest.id, {
            objectives: quest.objectives || [],
            completed: [],
            failed: []
        });

        if (this.logger) this.logger.info(`📜 Quest registered: ${quest.name || quest.id}`);
        this.notifyListeners('questRegistered', { quest });
        return true;
    }

    /**
     * Track quest progress
     */
    updateQuestProgress(questId, progressData) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        const progress = this.questProgress.get(questId);
        if (!progress) return false;

        // Update progress
        Object.assign(progress, progressData);

        // Check completion
        if (this.checkQuestCompletion(questId)) {
            this.completeQuest(questId);
        }

        this.notifyListeners('questProgress', { questId, progress });
        return true;
    }

    /**
     * Check if a quest is completed
     */
    checkQuestCompletion(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        const progress = this.questProgress.get(questId);
        if (!progress) return false;

        // Check if all required objectives are completed
        const requiredObjectives = quest.objectives?.filter(obj => obj.required) || [];
        const completedRequired = requiredObjectives.every(obj =>
            progress.completed.includes(obj.id)
        );

        return completedRequired;
    }

    /**
     * Complete a quest
     */
    completeQuest(questId, claimed = false) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        // Move to completed
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);

        // Apply rewards if claimed
        if (claimed && quest.rewards) {
            this.applyQuestRewards(quest.rewards);
        }

        if (this.logger) this.logger.info(`✅ Quest completed: ${quest.name || questId}`);
        this.notifyListeners('questCompleted', { questId, quest, claimed });
        return true;
    }

    /**
     * Apply quest rewards
     */
    applyQuestRewards(rewards) {
        if (!rewards) return;

        // Apply credits
        if (rewards.credits && this.resourceService) {
            this.resourceService.add('credits', rewards.credits, 'quest reward');
        }

        // Apply research points
        if (rewards.researchPoints && this.resourceService) {
            this.resourceService.add('researchPoints', rewards.researchPoints, 'quest reward');
        }

        // Apply items (handled by inventory service if available)
        if (rewards.items) {
            this.notifyListeners('questItems', { items: rewards.items });
        }

        if (this.logger) this.logger.debug('Quest rewards applied', rewards);
    }

    /**
     * Get all active quests
     */
    getActiveQuests() {
        return Array.from(this.activeQuests.values());
    }

    /**
     * Get quest by ID
     */
    getQuest(questId) {
        return this.activeQuests.get(questId);
    }

    /**
     * Export state for saving
     */
    exportState() {
        return {
            // Current mission
            currentMission: this.currentMission,
            missionStatus: this.missionStatus,
            missionTimer: this.missionTimer,

            // Objectives
            objectives: this.objectives,
            completedObjectives: Array.from(this.completedObjectives),
            failedObjectives: Array.from(this.failedObjectives),

            // Trackers
            trackers: { ...this.trackers },

            // History
            completedMissions: this.completedMissions,
            failedMissions: this.failedMissions,
            missionStats: Array.from(this.missionStats.entries()),

            // Extraction
            extractionEnabled: this.extractionEnabled,
            extractionPoint: this.extractionPoint,

            // Quests
            activeQuests: Array.from(this.activeQuests.entries()),
            completedQuests: Array.from(this.completedQuests),
            questProgress: Array.from(this.questProgress.entries())
        };
    }

    /**
     * Import state from save
     */
    importState(state) {
        if (!state) return;

        // Current mission
        this.currentMission = state.currentMission || null;
        this.missionStatus = state.missionStatus || 'idle';
        this.missionTimer = state.missionTimer || 0;

        // Objectives
        this.objectives = state.objectives || [];
        this.completedObjectives = new Set(state.completedObjectives || []);
        this.failedObjectives = new Set(state.failedObjectives || []);

        // Trackers
        this.trackers = { ...this.trackers, ...(state.trackers || {}) };

        // History
        this.completedMissions = state.completedMissions || [];
        this.failedMissions = state.failedMissions || [];
        this.missionStats = new Map(state.missionStats || []);

        // Extraction
        this.extractionEnabled = state.extractionEnabled || false;
        this.extractionPoint = state.extractionPoint || null;

        // Quests
        this.activeQuests = new Map(state.activeQuests || []);
        this.completedQuests = new Set(state.completedQuests || []);
        this.questProgress = new Map(state.questProgress || []);

        if (this.logger) this.logger.debug('Mission state imported');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionService;
}