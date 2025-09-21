/**
 * MissionService - Centralized mission state and objective management
 * Handles mission lifecycle, objectives, and completion tracking
 */
class MissionService {
    constructor(resourceService = null, agentService = null, eventLogService = null) {
        // Service dependencies
        this.resourceService = resourceService;
        this.agentService = agentService;
        this.eventLogService = eventLogService;

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

        // Mission history
        this.completedMissions = [];
        this.failedMissions = [];
        this.missionStats = new Map(); // missionId -> stats

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
            console.warn('⚠️ Mission already in progress');
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
            this.trackers[key] = 0;
        });

        // Set extraction point
        this.extractionPoint = missionData.extractionPoint || missionData.map?.extraction;
        this.extractionEnabled = false;
        this.extractionTimer = 0;

        // Update status
        this.missionStatus = 'active';
        this.missionStartTime = Date.now();
        this.missionTimer = 0;

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logMission('start', this.currentMission.name, {
                missionId: this.currentMission.id,
                difficulty: this.currentMission.difficulty
            });
        }

        // Notify listeners
        this.notifyListeners('start', { mission: this.currentMission });

        console.log(`🎯 Mission started: ${this.currentMission.name}`);
        return true;
    }

    /**
     * Parse mission objectives
     */
    parseObjectives(objectiveData) {
        return objectiveData.map((obj, index) => ({
            id: obj.id || `obj_${index}`,
            type: obj.type || 'custom',
            description: obj.description || 'Complete objective',
            required: obj.required !== false,
            bonus: obj.bonus || false,
            hidden: obj.hidden || false,
            target: obj.target || {},
            progress: 0,
            maxProgress: this.getObjectiveMaxProgress(obj),
            status: 'pending', // pending, active, completed, failed
            rewards: obj.rewards || {}
        }));
    }

    /**
     * Get objective max progress
     */
    getObjectiveMaxProgress(objective) {
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
                console.log('⏰ Extraction timer expired');
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
            case 'enemyKilled':
                this.trackers.enemiesEliminated++;
                this.checkObjectiveProgress('eliminate', { enemy: eventData.enemyType });
                break;

            case 'itemCollected':
                this.trackers.itemsCollected++;
                this.checkObjectiveProgress('collect', { item: eventData.itemType });
                break;

            case 'terminalHacked':
                this.trackers.terminalsHacked++;
                this.checkObjectiveProgress('hack', { terminal: eventData.terminalId });
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
                    if (!objective.target.type || objective.target.type === data.enemy) {
                        objective.progress++;
                        progressMade = true;
                    }
                    break;

                case 'collect':
                    if (!objective.target.type || objective.target.type === data.item) {
                        objective.progress++;
                        progressMade = true;
                    }
                    break;

                case 'hack':
                    if (!objective.target.id || objective.target.id === data.terminal) {
                        objective.progress++;
                        progressMade = true;
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
                objectivesUpdated = true;

                // Check if completed
                if (objective.progress >= objective.maxProgress) {
                    this.completeObjective(objective.id);
                }
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

        console.log(`✅ Objective completed: ${objective.description}`);

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

        console.log(`❌ Objective failed: ${objective.description}`);

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

        console.log('🚁 Extraction point activated!');
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

        console.log(`🏆 Mission completed: ${this.currentMission.name}`);
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

        console.log(`💀 Mission failed: ${this.currentMission.name} - ${reason}`);
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
        Object.keys(this.trackers).forEach(key => {
            this.trackers[key] = 0;
        });
        console.log('🔄 Mission service reset');
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
                    console.error(`Error in mission listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                console.error('Error in global mission listener:', e);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MissionService;
}