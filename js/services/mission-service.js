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
                triggerAfter: obj.triggerAfter || null, // Preserve triggerAfter for sequential objectives
                checkFunction: obj.checkFunction || null, // Preserve checkFunction for custom objectives
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

        // Note: checkMissionStatus is called from game's updateMissionObjectives
        // We don't call it here since it needs the game instance
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
                    // Normalize target - can be string or object
                    const targetType = typeof objective.target === 'string'
                        ? objective.target
                        : (objective.target?.type || null);
                    const targetId = typeof objective.target === 'object'
                        ? objective.target?.id
                        : null;

                    // Check if interaction type matches objective target
                    if (targetType === 'explosive' && data.type === 'explosive') {
                        // Explosive planting objective
                        objective.progress++;
                        progressMade = true;
                        if (this.logger) this.logger.info(`💣 Explosive objective progress: ${objective.progress}/${objective.maxProgress}`);
                    } else if (targetType === 'terminal' || data.type === 'terminal') {
                        // Terminal hacking objective
                        if (!targetId) {
                            // Any terminal counts
                            objective.progress++;
                            progressMade = true;
                        } else if (targetId === data.id || targetId === data.terminal) {
                            // Specific terminal must match
                            objective.progress++;
                            progressMade = true;
                        }
                    } else if (targetType === 'switch' && data.type === 'switch') {
                        // Switch activation objective
                        objective.progress++;
                        progressMade = true;
                    } else if (targetType === 'gate' && data.type === 'gate') {
                        // Gate breach objective
                        objective.progress++;
                        progressMade = true;
                    } else if (!targetType) {
                        // No specific target type, any interaction counts
                        if (!targetId) {
                            objective.progress++;
                            progressMade = true;
                        } else if (targetId === data.id || targetId === data.terminal) {
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

        if (this.logger) {
            this.logger.info(`📋 Objective marked complete: ${objective.description}`);
            this.logger.debug(`  Status: ${objective.status}, Required: ${objective.required !== false}`);
        }

        // Immediately check if this enables extraction
        this.checkExtractionEligibility();

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
        // EXCLUDE extraction-type objectives (reach extraction) to avoid circular dependency
        // Also exclude objectives with unmet triggerAfter prerequisites
        const requiredObjectives = this.objectives.filter(o => {
            if (o.required === false) {
                if (this.logger) this.logger.trace(`  Skipping optional: ${o.id}`);
                return false;
            }
            // Skip "reach extraction" objectives - they complete AFTER extraction is enabled
            // Note: After parsing, o.target is an object like { type: 'extraction' }
            if (o.type === 'reach' && o.target && o.target.type === 'extraction') {
                if (this.logger) this.logger.trace(`  Skipping extraction objective: ${o.id}`);
                return false;
            }
            // Skip "survive" objectives - they run concurrently with extraction, not as prerequisites
            // These are time-based challenges that continue even after extraction is enabled
            if (o.type === 'survive') {
                if (this.logger) this.logger.trace(`  Skipping survive objective: ${o.id}`);
                return false;
            }
            // Skip objectives whose prerequisites aren't met yet
            if (o.triggerAfter && o.triggerAfter.length > 0) {
                const prereqsMet = o.triggerAfter.every(prereqId => {
                    const prereq = this.objectives.find(p => p.id === prereqId);
                    return prereq && (prereq.completed || prereq.status === 'completed');
                });
                if (!prereqsMet) {
                    if (this.logger) this.logger.trace(`  Skipping (prereqs not met): ${o.id}`);
                    return false;
                }
            }
            if (this.logger) this.logger.trace(`  Including in check: ${o.id} (status: ${o.status}, completed: ${o.completed})`);
            return true;
        });

        if (this.logger) {
            this.logger.debug(`🔍 Extraction check: ${requiredObjectives.length} objectives to check`);
            requiredObjectives.forEach(o => {
                this.logger.debug(`  - ${o.id}: status=${o.status}, completed=${o.completed}, progress=${o.progress}/${o.maxProgress}`);
            });
        }

        const completedRequired = requiredObjectives.every(o => o.status === 'completed' || o.completed === true);

        // Debug logging for objective completion
        if (!this._lastCompletionState && completedRequired) {
            if (this.logger) {
                this.logger.info(`✅ All required objectives complete!`);
                requiredObjectives.forEach(o => {
                    this.logger.debug(`  - ${o.description}: ${o.status || (o.completed ? 'completed' : 'incomplete')}`);
                });
            }
        }
        this._lastCompletionState = completedRequired;

        if (completedRequired && !this.extractionEnabled) {
            this.enableExtraction();
        }
    }

    /**
     * Enable extraction
     */
    enableExtraction() {
        if (this.extractionEnabled) {
            // Already enabled, don't spam
            return;
        }

        this.extractionEnabled = true;
        this.extractionTimer = 0;

        // SINGLE SOURCE OF TRUTH: Only set on MissionService
        // Game should read from window.GameServices.missionService.extractionEnabled
        // NO DIRECT SETTING - maintains unidirectional data flow

        // Log detailed extraction enablement
        if (this.logger) {
            this.logger.info('🚁 EXTRACTION POINT ACTIVATED!');
            this.logger.info('📋 All required objectives completed!');

            // Log which objectives are complete
            const completedObjs = this.objectives.filter(obj => obj.status === 'completed' || obj.completed);
            const requiredComplete = completedObjs.filter(obj => obj.required !== false);
            const optionalComplete = completedObjs.filter(obj => obj.required === false);

            if (requiredComplete.length > 0) {
                this.logger.info(`✅ Required objectives complete (${requiredComplete.length}): ${requiredComplete.map(obj => obj.description).join(', ')}`);
            }
            if (optionalComplete.length > 0) {
                this.logger.info(`🎁 Optional objectives complete (${optionalComplete.length}): ${optionalComplete.map(obj => obj.description).join(', ')}`);
            }

            // Log remaining objectives if any
            const incompleteObjs = this.objectives.filter(obj => obj.status !== 'completed' && !obj.completed);
            if (incompleteObjs.length > 0) {
                this.logger.debug(`⏳ Optional objectives remaining: ${incompleteObjs.map(obj => obj.description).join(', ')}`);
            }
        }

        // Log event
        if (this.eventLogService) {
            this.eventLogService.logMission('extract', 'Extraction point activated');
        }

        // Notify listeners
        this.notifyListeners('extractionEnabled', {
            point: this.extractionPoint,
            autoExtraction: this.config.autoExtraction
        });
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

    // ============================================
    // MISSION HELPERS - Migrated from game-loop.js
    // ============================================

    /**
     * Unlock intel reports based on collection threshold
     * Migrated from game-loop.js lines 209-228
     *
     * @param {number} totalIntelCollected - Total intel collected
     * @param {Array} campaignIntelReports - Intel reports from campaign
     * @returns {Array} Newly unlocked reports
     */
    unlockIntelReports(totalIntelCollected, campaignIntelReports = []) {
        if (!this.unlockedIntelReports) {
            this.unlockedIntelReports = [];
        }

        const newlyUnlocked = [];

        // Check which reports to unlock
        campaignIntelReports.forEach(report => {
            if (totalIntelCollected >= report.threshold) {
                if (!this.unlockedIntelReports.find(r => r.id === report.id)) {
                    this.unlockedIntelReports.push(report);
                    newlyUnlocked.push(report);
                    if (this.logger) this.logger.info(`🔓 NEW INTEL REPORT UNLOCKED: ${report.title}`);
                }
            }
        });

        return newlyUnlocked;
    }

    /**
     * Get all unlocked intel reports
     * @returns {Array} Unlocked intel reports
     */
    getUnlockedIntelReports() {
        return this.unlockedIntelReports || [];
    }

    /**
     * Generate final words for a fallen agent
     * Migrated from game-loop.js lines 231-237
     *
     * @param {string} agentName - Name of the fallen agent
     * @param {Object} deathSystem - Death system config from campaign
     * @returns {string} Final words
     */
    generateFinalWords(agentName, deathSystem = null) {
        // Use final words from campaign if available
        const finalWords = (deathSystem && deathSystem.finalWords) || [
            "The mission... must continue...",
            "Tell my family... I tried...",
            "It was... an honor...",
            "Complete... the objective...",
            "Don't let it... be for nothing...",
            "Remember me... in the hub...",
            "The syndicate... lives on...",
            "Victory... at any cost..."
        ];

        const selectedWords = finalWords[Math.floor(Math.random() * finalWords.length)];

        if (this.logger) this.logger.info(`💀 ${agentName}: "${selectedWords}"`);

        return selectedWords;
    }

    /**
     * Generate new agents available for hire
     * Migrated from game-loop.js lines 240-277
     *
     * @param {Object} agentGeneration - Agent generation config from campaign
     * @param {number} completedMissionCount - Number of missions completed
     * @param {number} currentAgentCount - Current number of available agents
     * @returns {Array} Newly generated agents
     */
    generateNewAgentsForHire(agentGeneration, completedMissionCount = 0, currentAgentCount = 0) {
        if (!agentGeneration) {
            if (this.logger) this.logger.warn('⚠️ No agent generation config provided');
            return [];
        }

        const gen = agentGeneration;
        const agentsToGenerate = gen.agentsPerMission || 2;
        const newAgents = [];

        // Generate new agents
        for (let i = 0; i < agentsToGenerate; i++) {
            const firstName = gen.firstNames[Math.floor(Math.random() * gen.firstNames.length)];
            const lastName = gen.lastNames[Math.floor(Math.random() * gen.lastNames.length)];
            const callsign = gen.callsigns[Math.floor(Math.random() * gen.callsigns.length)];
            const spec = gen.specializations[Math.floor(Math.random() * gen.specializations.length)];

            const newAgent = {
                id: `agent_gen_${Date.now()}_${i}`,
                name: `${firstName} "${callsign}" ${lastName}`,
                specialization: spec.type,
                skills: spec.skills,
                cost: gen.baseCost +
                      Math.floor(Math.random() * gen.maxCostVariance) +
                      (completedMissionCount * gen.costIncreasePerMission),
                hired: false,
                health: spec.health + Math.floor(Math.random() * 20) - 10,
                maxHealth: spec.health + Math.floor(Math.random() * 20) - 10,
                speed: spec.speed,
                damage: spec.damage + Math.floor(Math.random() * 10) - 5,
                protection: spec.protection || 0,
                generated: true,
                generatedAt: Date.now()
            };

            // Ensure health values are reasonable
            newAgent.health = Math.max(50, Math.min(150, newAgent.health));
            newAgent.maxHealth = newAgent.health;

            newAgents.push(newAgent);

            if (this.logger) {
                this.logger.info(`🆕 New agent available for hire: ${newAgent.name} (${newAgent.specialization})`);
            }
        }

        return newAgents;
    }

    /**
     * Get mission statistics summary
     * @returns {Object} Mission statistics
     */
    getMissionStatistics() {
        return {
            totalMissionsCompleted: this.completedMissions.length,
            totalMissionsFailed: this.failedMissions.length,
            successRate: this.completedMissions.length > 0
                ? (this.completedMissions.length / (this.completedMissions.length + this.failedMissions.length) * 100).toFixed(1)
                : 0,
            currentStreak: this.getCurrentWinStreak(),
            bestStreak: this.getBestWinStreak(),
            totalEnemiesEliminated: this.getTotalEnemiesEliminated(),
            totalIntelCollected: this.getTotalIntelCollected()
        };
    }

    /**
     * Get current win streak
     * @returns {number} Current consecutive wins
     */
    getCurrentWinStreak() {
        let streak = 0;
        const allMissions = [...this.completedMissions, ...this.failedMissions]
            .sort((a, b) => (b.completedAt || b.failedAt) - (a.completedAt || a.failedAt));

        for (const mission of allMissions) {
            if (mission.failed) break;
            streak++;
        }

        return streak;
    }

    /**
     * Get best win streak
     * @returns {number} Best consecutive wins ever
     */
    getBestWinStreak() {
        let bestStreak = 0;
        let currentStreak = 0;

        const allMissions = [...this.completedMissions, ...this.failedMissions]
            .sort((a, b) => (a.completedAt || a.failedAt) - (b.completedAt || b.failedAt));

        for (const mission of allMissions) {
            if (mission.failed) {
                bestStreak = Math.max(bestStreak, currentStreak);
                currentStreak = 0;
            } else {
                currentStreak++;
            }
        }

        return Math.max(bestStreak, currentStreak);
    }

    /**
     * Get total enemies eliminated across all missions
     * @returns {number} Total enemies eliminated
     */
    getTotalEnemiesEliminated() {
        let total = 0;
        this.missionStats.forEach(stats => {
            total += stats.enemiesEliminated || 0;
        });
        return total;
    }

    /**
     * Get total intel collected across all missions
     * @returns {number} Total intel collected
     */
    getTotalIntelCollected() {
        let total = 0;
        this.missionStats.forEach(stats => {
            total += stats.intelCollected || 0;
        });
        return total;
    }

    /**
     * Check mission status and handle mission failure/completion
     * @param {Object} game - Game instance for accessing agents, enemies, etc
     */
    checkMissionStatus(game) {
        const aliveAgents = game.agents.filter(a => a.alive).length;

        // Track objective status for mission complete modal
        if (!game.objectiveStatus) {
            game.objectiveStatus = {};
        }

        if (aliveAgents === 0) {
            this.endMission(game, false);
            return;
        }

        // Use the new mission system to check objectives
        if (game.checkMissionObjectives) {
            // New comprehensive mission system handles everything
            game.checkMissionObjectives();
        }
    }

    /**
     * Check if agents are at extraction point
     * @param {Object} game - Game instance
     */
    checkExtractionPoint(game) {
        if (!game.map || !game.map.extraction) {
            if (this.logger) this.logger.debug('❌ No map or extraction point');
            return;
        }

        // Check if extraction is enabled
        if (!this.extractionEnabled && !game.extractionEnabled) {
            // Only log once per second to avoid spam
            if (!this._lastExtractionDisabledLog || Date.now() - this._lastExtractionDisabledLog > 1000) {
                if (this.logger) this.logger.debug('❌ Extraction not enabled yet (objectives incomplete?)');
                this._lastExtractionDisabledLog = Date.now();
            }
            return;
        }

        // Prevent multiple extraction triggers
        if (this.missionStatus !== 'active') {
            if (this.logger) this.logger.debug(`❌ Mission status is ${this.missionStatus}, not active`);
            return;
        }

        const extractionX = game.map.extraction.x;
        const extractionY = game.map.extraction.y;

        // Log extraction point location once
        if (!this._extractionPointLogged) {
            if (this.logger) this.logger.info(`🎯 Extraction point location: (${extractionX}, ${extractionY})`);
            this._extractionPointLogged = true;
        }

        // Find closest agent and check all agents
        let closestAgent = null;
        let closestDist = Infinity;
        let agentsNearExtraction = [];

        const atExtraction = game.agents.some(agent => {
            if (!agent.alive) return false;

            const dist = Math.sqrt(
                Math.pow(agent.x - extractionX, 2) +
                Math.pow(agent.y - extractionY, 2)
            );

            // Track closest agent
            if (dist < closestDist) {
                closestDist = dist;
                closestAgent = agent;
            }

            // Log detailed position for very close agents
            if (dist < 5) {
                if (this.logger) this.logger.info(`📍 Agent ${agent.name} at (${agent.x.toFixed(1)}, ${agent.y.toFixed(1)}) - dist to extraction (${extractionX}, ${extractionY}): ${dist.toFixed(2)}`);
            }

            // Log all agents within reasonable distance
            if (dist < 10) {
                agentsNearExtraction.push({name: agent.name, dist: dist.toFixed(2)});
            }

            // Check if within extraction radius - increase radius to 3 for better detection
            const withinRadius = dist < 3;
            if (withinRadius && this.logger) {
                this.logger.info(`🎉 Agent ${agent.name} IS AT EXTRACTION! Distance: ${dist.toFixed(2)}`);
            }

            return withinRadius;
        });

        // Log closest agent periodically (every second)
        if (!this._lastClosestLog || Date.now() - this._lastClosestLog > 1000) {
            if (closestAgent && this.logger) {
                // Always log at INFO level to make sure we see it
                this.logger.info(`📍 Closest to extraction: ${closestAgent.name} at (${closestAgent.x.toFixed(1)}, ${closestAgent.y.toFixed(1)}) - Distance: ${closestDist.toFixed(2)} units from (${extractionX}, ${extractionY})`);
                if (agentsNearExtraction.length > 0) {
                    this.logger.info(`👥 Agents near extraction (<10 units): ${agentsNearExtraction.map(a => `${a.name}(${a.dist})`).join(', ')}`);
                }
            }
            this._lastClosestLog = Date.now();
        }

        if (atExtraction) {
            if (this.logger) {
                this.logger.info('✅ EXTRACTION TRIGGERED! Agent reached extraction point!');
                this.logger.info(`📊 Final status - MissionStatus: ${this.missionStatus}, Closest: ${closestAgent?.name} at ${closestDist.toFixed(2)} units`);
            }
            // Set status immediately to prevent re-entry
            this.missionStatus = 'extracting';
            this.completeMission(true);
            this.endMission(game, true);
        }
    }

    /**
     * End the mission with victory or defeat
     * @param {Object} game - Game instance
     * @param {boolean} victory - Whether mission was successful
     */
    endMission(game, victory) {
        // Clean up music system but keep music playing
        if (game.musicSystem && victory) {
            game.playVictoryMusic();
        }
        if (this.logger) this.logger.debug('🎵 Music continues after mission end');

        game.isPaused = true;

        // Switch to tactical view before showing end dialog
        if (game.is3DMode) {
            if (this.logger) this.logger.debug('📐 Switching to tactical view for mission end');
            game.cameraMode = 'tactical';
            game.disable3DMode();
        }

        // Release pointer lock so player can interact with dialogs
        if (document.pointerLockElement) {
            if (this.logger) this.logger.debug('🔓 Releasing pointer lock for mission end dialog');
            document.exitPointerLock();
        }

        // Handle fallen agents - move dead agents to Hall of Glory
        const fallenThisMission = [];
        game.agents.forEach(agent => {
            if (!agent.alive) {
                // Find the original agent data
                const originalAgent = game.activeAgents.find(a => a.name === agent.name);
                if (originalAgent) {
                    // Add to fallen with mission details
                    game.fallenAgents.push({
                        ...originalAgent,
                        fallenInMission: game.currentMission.title,
                        missionId: game.currentMission.id,
                        deathDate: new Date().toISOString(),
                        finalWords: this.generateFinalWords(originalAgent.name)
                    });
                    fallenThisMission.push(originalAgent.name);

                    // Remove from active roster
                    const index = game.activeAgents.indexOf(originalAgent);
                    if (index > -1) {
                        game.activeAgents.splice(index, 1);
                    }
                }
            }
        });

        if (fallenThisMission.length > 0) {
            if (this.logger) this.logger.debug(`⚰️ Agents fallen in battle: ${fallenThisMission.join(', ')}`);
            if (this.logger) this.logger.debug(`📜 Added to Hall of Glory. Active agents remaining: ${game.activeAgents.length}`);
        }

        // Update campaign statistics and rewards
        if (victory) {
            game.totalCampaignTime += game.missionTimer;
            // Count actual enemies defeated in this mission
            game.totalEnemiesDefeated += game.enemies.filter(e => !e.alive).length;

            // Add to completed missions
            if (!game.completedMissions.includes(game.currentMission.id)) {
                if (this.logger) this.logger.info('📊 Adding mission to completed list:', {
                    missionId: game.currentMission.id,
                    currentIndex: game.currentMissionIndex,
                    completedBefore: [...game.completedMissions],
                    allMissionIds: game.missions.map(m => m.id)
                });
                game.completedMissions.push(game.currentMission.id);
                if (this.logger) this.logger.info('📊 Completed missions after:', [...game.completedMissions]);

                // Generate new agents available for hire
                const newAgents = this.generateNewAgentsForHire(
                    game.agentGeneration || window.ContentLoader?.getContent('agents') || null,
                    game.completedMissions.length,
                    game.availableAgents ? game.availableAgents.length : 0
                );

                // Add generated agents to available pool
                if (newAgents && newAgents.length > 0) {
                    if (!game.availableAgents) game.availableAgents = [];
                    game.availableAgents.push(...newAgents);

                    if (game.logEvent && newAgents.length > 0) {
                        game.logEvent(`🆕 ${newAgents.length} new agents are available for hire at the Hub!`, 'system');
                    }
                }
            }

            // Award mission rewards
            if (game.currentMission.rewards && game.gameServices?.resourceService) {
                // Use ResourceService for mission rewards
                game.gameServices.resourceService.applyMissionRewards(game.currentMission.rewards);
            }
        }

        // Play outro cutscene if available, then navigate to victory/defeat
        setTimeout(() => {
            if (victory && game.currentMission) {
                const missionId = game.currentMission.id;
                const cutsceneId = `mission-${missionId.replace('main-', '')}-outro`;

                // Check if outro cutscene exists
                if (window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
                    // Navigate to cutscene screen - cutscene's onComplete handles next navigation
                    // (navigate:victory for regular missions, cutscene:game-finale for final)
                    if (this.logger) this.logger.info(`🎬 Playing mission outro: ${cutsceneId}`);
                    window.screenManager.navigateTo('cutscene', { cutsceneId: cutsceneId });
                } else {
                    // No outro cutscene - go to victory screen
                    window.screenManager.navigateTo('victory');
                }
            } else {
                // Defeat - navigate directly (no outro cutscene for defeats)
                window.screenManager.navigateTo(victory ? 'victory' : 'defeat');
            }
        }, 1000); // Brief delay for dramatic effect
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