// Mission Executor System
// Generic mission execution engine that interprets mission definitions
// No hardcoded mission-specific logic

CyberOpsGame.prototype.initMissionSystem = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameMissionExecutor') : null;
    }
    // All tracking now handled by MissionService
    // Only keeping quest tracking here for backward compatibility
    this.activeQuests = {};

    if (this.logger) this.logger.info('🎮 Mission system initialized');
};

// Load mission data based on index
CyberOpsGame.prototype.loadMissionData = function(missionIndex) {
    // Get from missions array (campaign system)
    let missionDef = this.missions && this.missions[missionIndex];

    if (!missionDef) {
        if (this.logger) this.logger.error('❌ Mission definition not found for index:', missionIndex);
        if (this.logger) this.logger.error('Campaign system is required. Check campaigns/main/ folder.');
        return null;
    }

    // Convert definition to game mission format
    const mission = {
        id: missionDef.id,
        name: missionDef.name,
        title: missionDef.title,
        description: missionDef.description,
        briefing: missionDef.briefing,
        map: missionDef.map.type,
        // Use objectiveStrings for display if available, otherwise extract descriptions
        objectives: missionDef.objectiveStrings || missionDef.objectives.map(obj =>
            obj.description || obj.displayText || 'Complete objective'
        ),
        rewards: missionDef.rewards,
        enemies: missionDef.enemies.count
    };

    // Store full definition for reference
    this.currentMissionDef = missionDef;

    return mission;
};

// Initialize mission from definition
CyberOpsGame.prototype.initMissionFromDefinition = function() {
    // Check for test mission from editor
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('test_mission') === 'true') {
        const testMissionData = sessionStorage.getItem('test_mission');
        if (testMissionData) {
            try {
                const testMission = JSON.parse(testMissionData);
                if (this.logger) this.logger.debug('🧪 Loading test mission from editor:', testMission.name);

                // Override current mission with test mission
                this.currentMissionDef = {
                    id: 'test_mission',
                    name: testMission.name,
                    description: testMission.description,
                    briefing: testMission.description || 'Test mission from editor',
                    objectives: testMission.objectives || [],
                    map: {
                        type: testMission.mapType,
                        customData: testMission
                    },
                    enemies: {
                        count: testMission.entities ? testMission.entities.filter(e => e.type === 'enemy').length : 0
                    },
                    rewards: {
                        credits: testMission.credits || 5000,
                        researchPoints: testMission.researchPoints || 2
                    }
                };
            } catch (e) {
                if (this.logger) this.logger.error('Failed to load test mission:', e);
            }
        }
    }

    const missionDef = this.currentMissionDef;
    if (!missionDef) return;

    // MissionService handles all tracking now

    // Generate map with objects
    this.generateMapWithObjects(missionDef.map);

    // NPCs are spawned by the existing spawnNPCs() function in game-flow.js
    // which is called during initMission()
    // So we don't need to spawn them here
    // if (missionDef.npcs) {
    //     this.spawnMissionNPCs(missionDef.npcs);
    // }

    // Setup enemy configuration
    this.setupMissionEnemies(missionDef.enemies);

    // Initialize objective displays
    this.updateObjectiveDisplay();

    if (this.logger) this.logger.info('📋 Mission initialized from definition:', missionDef.name);
};

// Generate map with mission-defined objects
CyberOpsGame.prototype.generateMapWithObjects = function(mapDef) {
    if (this.logger) this.logger.debug('🗺️ generateMapWithObjects called with mapDef:', mapDef);
    if (this.logger) this.logger.debug('- useDeclarativeMap:', mapDef?.useDeclarativeMap);
    if (this.logger) this.logger.debug('- generateMapFromDefinition exists:', typeof generateMapFromDefinition !== 'undefined');
    if (this.logger) this.logger.debug('- current map exists:', !!this.map);
    if (this.logger) this.logger.debug('- current map has tiles:', !!(this.map && this.map.tiles));

    // FIXED: Don't regenerate map if it already exists!
    if (this.map && this.map.tiles) {
        if (this.logger) this.logger.debug(`📍 Map already generated (${this.map.width}x${this.map.height}), skipping regeneration`);
        // Map was already generated by initMissionOriginal, don't overwrite it!
    } else {
        // Check for custom map from editor
        if (mapDef.customData) {
            if (this.logger) this.logger.debug('🗺️ Loading custom map from editor');
            this.loadCustomMapFromEditor(mapDef.customData);
        } else if (mapDef.embedded) {
            // Mission has embedded tile data (new format)
            if (this.logger) this.logger.debug(`🗺️ Loading embedded tiles for: ${mapDef.name || mapDef.type}`);
            this.map = this.loadMapFromEmbeddedTiles(mapDef);
            if (!this.map || !this.map.tiles) {
                if (this.logger) this.logger.error('❌ Failed to load embedded tiles!');
                if (this.logger) this.logger.error('Map object:', this.map);
            } else {
                if (this.logger) this.logger.info(`📍 Loaded embedded map: ${mapDef.type} (${this.map.width}x${this.map.height})`);
                if (this.logger) this.logger.debug(`   Tiles array: ${this.map.tiles.length} rows`);
            }
        } else if (mapDef.generation) {
            // Mission has generation rules (old format)
            if (this.logger) this.logger.debug(`🗺️ Generating map from rules: ${mapDef.name || mapDef.type}`);
            this.map = this.generateMapFromEmbeddedDefinition(mapDef);
            if (!this.map || !this.map.tiles) {
                if (this.logger) this.logger.error('❌ Failed to generate map from definition!');
                if (this.logger) this.logger.error('Map object:', this.map);
            } else {
                if (this.logger) this.logger.debug(`📍 Generated map: ${mapDef.type} (${this.map.width}x${this.map.height})`);
                if (this.logger) this.logger.debug(`   Tiles array: ${this.map.tiles.length} rows`);
            }
        } else {
            // No embedded map - this should never happen in new architecture
            if (this.logger) this.logger.error(`❌ Map type ${mapDef.type} has no embedded data! All maps must be embedded.`);
            throw new Error('Map missing embedded data');
        }
    }

    // Add mission-specific objects (but don't override existing ones)
    if (mapDef.objects) {
        // Initialize object arrays if needed
        if (!this.map.terminals) this.map.terminals = [];
        if (!this.map.doors) this.map.doors = [];
        if (!this.map.explosiveTargets) this.map.explosiveTargets = [];
        if (!this.map.switches) this.map.switches = [];
        if (!this.map.gates) this.map.gates = [];

        mapDef.objects.forEach(obj => {
            switch(obj.type) {
                case 'terminal':
                    // Don't add terminals if the map already has them
                    // This preserves the original map's terminal positions
                    if (this.map.terminals.length === 0) {
                        this.map.terminals.push({
                            id: obj.id,
                            x: obj.x,
                            y: obj.y,
                            hacked: false,
                            hackTime: obj.hackTime || 3,
                            security: obj.security || 'normal'
                        });
                    }
                    break;

                case 'door':
                    this.map.doors.push({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        locked: obj.locked || false,
                        keycard: obj.keycard || null
                    });
                    break;

                case 'explosive':
                    this.map.explosiveTargets.push({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        planted: false,
                        plantTime: obj.plantTime || 5
                    });
                    break;

                case 'switch':
                    this.map.switches.push({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        activated: false,
                        disables: obj.disables
                    });
                    break;

                case 'gate':
                    this.map.gates.push({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        breached: false
                    });
                    break;
            }
        });
    }

    // Only override spawn and extraction points if explicitly provided
    // This preserves the original map's spawn/extraction points
    if (mapDef.spawn) {
        this.map.spawn = mapDef.spawn;
    }
    if (mapDef.extraction) {
        this.map.extraction = mapDef.extraction;
    }
};

// Spawn mission NPCs with their quests
CyberOpsGame.prototype.spawnMissionNPCs = function(npcDefs) {
    // Mission NPCs are handled by the existing spawnNPCs function
    // This is just a placeholder for future NPC system integration
    if (this.logger) this.logger.debug('📍 Mission NPCs will be spawned by existing NPC system');

    // The existing game-npc.js handles NPC spawning based on mission index
    // So we don't need to do anything here - NPCs are already spawned
};

// Setup mission enemies configuration
CyberOpsGame.prototype.setupMissionEnemies = function(enemyDef) {
    // Enemy spawning is handled by the existing enemy spawn system
    // This just stores configuration for reference
    if (enemyDef) {
        this.missionEnemyConfig = enemyDef;
        if (this.logger) this.logger.debug('⚔️ Enemy configuration stored:', enemyDef.count, 'enemies');
    }
};

// Generic action handler (replaces all the specific hackNearestTerminal, etc.)
CyberOpsGame.prototype.useActionAbility = function(agent) {
    if (!this.currentMissionDef) return false;

    let actionPerformed = false;

    // SINGLE SOURCE: Check MissionService objectives to see what actions are available
    if (!this.gameServices || !this.gameServices.missionService) return false;
    const objectives = this.gameServices.missionService.objectives;
    if (!objectives || objectives.length === 0) return false;

    objectives.forEach(obj => {
        if (actionPerformed) return; // Only perform one action
        if (obj.completed) return; // Skip completed objectives

        // Check if this objective uses the action key
        if (obj.actionKey === 'H' || obj.type === OBJECTIVE_TYPES.INTERACT) {
            const range = obj.actionRange || 3;

            // Find nearest valid target
            let nearestTarget = null;
            let nearestDist = Infinity;

            // Get targets based on objective target type
            let targets = this.getInteractionTargets(obj.target);

            targets.forEach(target => {
                // Skip if already interacted
                if (target.hacked || target.planted || target.activated || target.breached) return;

                // Skip if not the right specific target
                if (obj.specific && !obj.specific.includes(target.id)) return;

                const dist = Math.sqrt(
                    Math.pow(target.x - agent.x, 2) +
                    Math.pow(target.y - agent.y, 2)
                );

                if (dist < nearestDist && dist <= range) {
                    nearestDist = dist;
                    nearestTarget = target;
                }
            });

            if (nearestTarget) {
                // Perform the interaction
                this.performInteraction(agent, obj.target, nearestTarget);
                actionPerformed = true;

                // Handle the objective tracking
                OBJECTIVE_HANDLERS.handleInteraction(agent, obj.target, nearestTarget.id, this);
            }
        }
    });

    // If no mission objective requires interaction, still allow interactions with objects
    // This allows players to interact even when not required by objectives
    if (!actionPerformed) {
        const interactionRange = 3;
        const allTargets = [];

        // Collect all interactable objects
        if (this.map) {
            // Terminals - push the actual object reference, not a copy
            if (this.map.terminals) {
                this.map.terminals.forEach(t => {
                    if (!t.hacked) {
                        t.type = INTERACTION_TARGETS.TERMINAL; // Add type directly to original
                        allTargets.push(t);
                    }
                });
            }

            // Explosive targets
            if (this.map.explosiveTargets) {
                this.map.explosiveTargets.forEach(e => {
                    if (!e.planted) {
                        e.type = INTERACTION_TARGETS.EXPLOSIVE;
                        allTargets.push(e);
                    }
                });
            }

            // Switches
            if (this.map.switches) {
                this.map.switches.forEach(s => {
                    if (!s.activated) {
                        s.type = INTERACTION_TARGETS.SWITCH;
                        allTargets.push(s);
                    }
                });
            }

            // Gates
            if (this.map.gates) {
                this.map.gates.forEach(g => {
                    if (!g.breached) {
                        g.type = INTERACTION_TARGETS.GATE;
                        allTargets.push(g);
                    }
                });
            }

            // Doors (if implemented)
            if (this.map.doors) {
                this.map.doors.forEach(d => {
                    if (d.locked) {
                        d.type = INTERACTION_TARGETS.DOOR;
                        allTargets.push(d);
                    }
                });
            }
        }

        // Find nearest target
        let nearestTarget = null;
        let nearestDist = Infinity;

        allTargets.forEach(target => {
            const dist = Math.sqrt(
                Math.pow(target.x - agent.x, 2) +
                Math.pow(target.y - agent.y, 2)
            );

            if (dist < nearestDist && dist <= interactionRange) {
                nearestDist = dist;
                nearestTarget = target;
            }
        });

        // Interact with nearest target
        if (nearestTarget) {
            this.performInteraction(agent, nearestTarget.type, nearestTarget);

            // Track interaction through MissionService
            if (this.gameServices && this.gameServices.missionService) {
                switch(nearestTarget.type) {
                    case INTERACTION_TARGETS.TERMINAL:
                        this.gameServices.missionService.trackEvent('terminal', {
                            id: nearestTarget.id
                        });
                        if (this.logger) this.logger.debug(`🖥️ Terminal hacked!`);
                        break;
                    case INTERACTION_TARGETS.EXPLOSIVE:
                        this.gameServices.missionService.trackEvent('interact', {
                            type: nearestTarget.type,
                            targetId: nearestTarget.id
                        });
                        if (this.logger) this.logger.debug(`💣 Explosive planted!`);
                        break;
                    case INTERACTION_TARGETS.SWITCH:
                        this.gameServices.missionService.trackEvent('interact', {
                            type: nearestTarget.type,
                            targetId: nearestTarget.id
                        });
                        if (this.logger) this.logger.debug(`🔌 Switch activated!`);
                        break;
                    case INTERACTION_TARGETS.GATE:
                        this.gameServices.missionService.trackEvent('interact', {
                            type: nearestTarget.type,
                            targetId: nearestTarget.id
                        });
                        if (this.logger) this.logger.debug(`🚪 Gate breached!`);
                        break;
                }
            }

            actionPerformed = true;
        }
    }

    // Also check active quests
    if (!actionPerformed && this.activeQuests) {
        Object.values(this.activeQuests).forEach(quest => {
            if (actionPerformed) return;

            quest.objectives.forEach(questObj => {
                if (actionPerformed) return;

                if (questObj.type === OBJECTIVE_TYPES.INTERACT) {
                    // Similar logic for quest objectives
                    const targets = this.getInteractionTargets(questObj.target);
                    // ... (similar target finding and interaction)
                }
            });
        });
    }

    return actionPerformed;
};

// Get interaction targets by type
CyberOpsGame.prototype.getInteractionTargets = function(targetType) {
    switch(targetType) {
        case INTERACTION_TARGETS.TERMINAL:
            return this.map.terminals || [];
        case INTERACTION_TARGETS.EXPLOSIVE:
            return this.map.explosiveTargets || [];
        case INTERACTION_TARGETS.DOOR:
            return this.map.doors || [];
        case INTERACTION_TARGETS.SWITCH:
            return this.map.switches || [];
        case INTERACTION_TARGETS.GATE:
            return this.map.gates || [];
        case INTERACTION_TARGETS.NPC:
            return this.npcs || [];
        default:
            return [];
    }
};

// Perform interaction with target
CyberOpsGame.prototype.performInteraction = function(agent, targetType, target) {
    if (this.logger) this.logger.debug(`🎯 ${agent.name} interacting with ${targetType} at (${target.x}, ${target.y})`);

    switch(targetType) {
        case INTERACTION_TARGETS.TERMINAL:
            target.hacked = true;
            this.effects.push({
                type: 'hack',
                x: target.x,
                y: target.y,
                duration: 60,
                frame: 0
            });
            if (this.playSound) this.playSound('hack', 0.5);
            if (this.logEvent) {
                this.logEvent(`${agent.name} hacked terminal at [${target.x}, ${target.y}]`, 'hack', true);
            }
            this.addNotification('🖥️ Terminal hacked!');
            break;

        case INTERACTION_TARGETS.EXPLOSIVE:
            target.planted = true;
            this.effects.push({
                type: 'explosive',
                x: target.x,
                y: target.y,
                duration: 60,
                frame: 0
            });
            if (this.playSound) this.playSound('plant', 0.5);
            if (this.logEvent) {
                this.logEvent(`${agent.name} planted explosives at [${target.x}, ${target.y}]`, 'player', true);
            }
            this.addNotification('💣 Explosives planted!');
            break;

        case INTERACTION_TARGETS.SWITCH:
            target.activated = true;
            // Handle what the switch disables
            if (target.disables === 'alarms') {
                this.alarmsDisabled = true;
                this.addNotification('🔇 Alarms disabled!');
                if (this.logEvent) {
                    this.logEvent(`${agent.name} disabled the alarm system`, 'player', true);
                }
            }
            break;

        case INTERACTION_TARGETS.GATE:
            target.breached = true;
            this.effects.push({
                type: 'breach',
                x: target.x,
                y: target.y,
                duration: 80,
                frame: 0
            });
            if (this.logEvent) {
                this.logEvent(`${agent.name} breached gate at [${target.x}, ${target.y}]`, 'player', true);
            }
            this.addNotification('🚪 Gate breached!');
            break;
    }
};

// Check mission objectives
CyberOpsGame.prototype.checkMissionObjectives = function() {
    if (!this.currentMissionDef) {
        if (this.logger) this.logger.debug('⚠️ No currentMissionDef - new mission system not active');
        return;
    }

    let allRequiredComplete = true;
    let anyIncomplete = false;

    // SINGLE SOURCE: Always use MissionService objectives
    if (!this.gameServices || !this.gameServices.missionService) {
        if (this.logger) this.logger.warn('⚠️ MissionService not available');
        return;
    }

    const objectives = this.gameServices.missionService.objectives;
    if (!objectives || objectives.length === 0) {
        if (this.logger) this.logger.warn('⚠️ No objectives in MissionService');
        return;
    }

    // Use TRACE level to avoid spam
    if (this.logger) this.logger.trace('📋 Using MissionService objectives (single source of truth)');

    // Ensure objectives have required properties
    objectives.forEach(obj => {
        if (obj.active === undefined) obj.active = true;
        if (obj.completed === undefined) obj.completed = false;
    });

    // Only log at TRACE level to avoid spam (this runs every frame)
    if (this.logger) this.logger.trace(`🔍 Checking ${objectives.length} objectives`);

    objectives.forEach(obj => {
        if (this.logger) this.logger.trace(`  Checking objective: ${obj.id || obj.description}`);

        // Check if prerequisites are met
        if (obj.triggerAfter) {
            const prereqsMet = obj.triggerAfter.every(prereqId => {
                const prereq = objectives.find(o => o.id === prereqId);
                // Check if prerequisite is completed (MissionService tracks this)
                return prereq && (prereq.completed || prereq.status === 'completed');
            });
            if (!prereqsMet) {
                obj.active = false;
                return;
            } else {
                obj.active = true;
            }
        } else {
            obj.active = true;
        }

        // Check custom objectives with checkFunction
        if (obj.type === 'custom' && obj.checkFunction && !obj.completed) {
            let checkResult = false;

            // Try to find and call the check function
            try {
                // First check if it's a window function (from exported mission)
                if (window[obj.checkFunction]) {
                    checkResult = window[obj.checkFunction](this, obj, this.gameServices?.missionService);
                    if (this.logger) this.logger.trace(`  Custom check ${obj.checkFunction}: ${checkResult}`);
                }
                // Also check if it's a game method
                else if (this[obj.checkFunction]) {
                    checkResult = this[obj.checkFunction](obj);
                    if (this.logger) this.logger.trace(`  Game method ${obj.checkFunction}: ${checkResult}`);
                }

                // If custom check returns true, complete the objective
                if (checkResult && !obj.completed) {
                    if (this.gameServices?.missionService) {
                        this.gameServices.missionService.completeObjective(obj.id);
                    } else {
                        obj.completed = true;
                        obj.status = 'completed';
                    }
                    if (this.logger) this.logger.info(`✅ Custom objective completed via ${obj.checkFunction}: ${obj.description}`);
                }
            } catch (error) {
                if (this.logger) this.logger.error(`❌ Error in custom check function ${obj.checkFunction}:`, error);
            }
        }

        // MissionService already tracks completion, just check if status changed
        const wasComplete = obj.completed || (obj.status === 'completed');
        const isNowComplete = obj.status === 'completed' || obj.completed === true;

        // Handle newly completed objectives
        if (!wasComplete && isNowComplete) {
            // This is important - log at INFO level when objective actually completes
            if (this.logger) this.logger.info(`✅ Objective completed: ${obj.description}`);
            this.addNotification(`✅ ${obj.description}`);

            // Give optional objective rewards immediately
            if (!obj.required && obj.rewards) {
                this.giveRewards(obj.rewards);
            }

            // Trigger any events
            if (obj.onComplete) {
                this.triggerMissionEvent(obj.onComplete);
            }
        }

        // Track overall completion
        // Check if objective is complete (MissionService uses 'status', legacy uses 'completed')
        const isComplete = obj.status === 'completed' || obj.completed === true;

        // Treat objectives without 'required' field as required by default
        const isRequired = obj.required !== false;
        if (isRequired && !isComplete) {
            allRequiredComplete = false;
        }
        if (!isComplete) {
            anyIncomplete = true;
        }
    });

    // Update objective display
    this.updateObjectiveDisplay();

    // Check for mission completion
    if (allRequiredComplete) {
        // MissionService handles extraction enablement automatically through trackEvent()
        // Just sync the state, don't enable it here to avoid duplicate calls
        if (this.gameServices && this.gameServices.missionService) {
            // Sync extraction state from MissionService
            this.extractionEnabled = this.gameServices.missionService.extractionEnabled;

            // Update objective display via HUDService
            const hudService = this.gameServices?.hudService;
            if (hudService) {
                hudService.update('objectiveTracker', {
                    objectives: [{
                        description: 'All objectives complete! Reach extraction point!',
                        completed: false
                    }]
                });
            }
        }
    }
};

// Update objective display
CyberOpsGame.prototype.updateObjectiveDisplay = function() {
    if (!this.currentMissionDef) {
        if (this.logger) this.logger.warn('📋 updateObjectiveDisplay: No missionDef');
        return;
    }

    // SINGLE SOURCE: Always use MissionService objectives
    if (!this.gameServices || !this.gameServices.missionService) {
        return;
    }

    const objectives = this.gameServices.missionService.objectives;
    if (!objectives || objectives.length === 0) {
        return;
    }

    // Show primary objective
    const primaryObj = objectives.find(o => o.required && (o.active !== false) && (o.status !== 'completed'));
    // Only log display updates at TRACE level to avoid spam
    if (this.logger) {
        this.logger.trace(`📋 Updating objective display:`);
        this.logger.trace(`  - Objectives count: ${objectives.length}`);
        this.logger.trace(`  - Primary objective: ${primaryObj ? primaryObj.description : 'none'}`);
        if (primaryObj && primaryObj.progress !== undefined) {
            this.logger.trace(`  - Progress: ${primaryObj.progress}/${primaryObj.maxProgress}`);
        }
    }

    // Build objective list for HUDService
    const objectiveList = [];
    objectives.forEach(obj => {
        objectiveList.push({
            description: OBJECTIVE_HANDLERS.getDisplayText(obj, this),
            completed: obj.status === 'completed'
        });
    });

    // Update via HUDService
    const hudService = this.gameServices?.hudService;
    if (hudService) {
        hudService.update('objectiveTracker', {
            turnBasedMode: this.turnBasedMode,
            currentTurnUnit: this.currentTurnUnit,
            turnRound: this.turnRound,
            objectives: objectiveList
        });
    }

    // Also update the mission list dialog if it's open
    const missionDialog = document.querySelector('.mission-list-dialog');
    if (missionDialog && missionDialog.style.display !== 'none') {
        // Refresh the mission list
        this.showMissionList();
    }
};

// Give rewards to player
CyberOpsGame.prototype.giveRewards = function(rewards) {
    if (rewards.credits) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.add('credits', rewards.credits, 'mission reward');
        } else {
            this.credits = (this.credits || 0) + rewards.credits;
        }
        this.addNotification(`💰 +${rewards.credits} credits`);
    }
    if (rewards.researchPoints) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.add('researchPoints', rewards.researchPoints, 'mission reward');
        } else {
            this.researchPoints = (this.researchPoints || 0) + rewards.researchPoints;
        }
        this.addNotification(`🔬 +${rewards.researchPoints} research points`);
    }
    if (rewards.experience) {
        this.experience = (this.experience || 0) + rewards.experience;
        this.addNotification(`⭐ +${rewards.experience} XP`);
    }
    if (rewards.unlock) {
        if (!this.unlocked) this.unlocked = new Set();
        this.unlocked.add(rewards.unlock);
        this.addNotification(`🔓 Unlocked: ${rewards.unlock}`);
    }
};

// Complete mission
CyberOpsGame.prototype.completeMission = function(victory) {
    if (this.logger) this.logger.info('🎯 Mission complete!', victory ? 'Victory!' : 'Failed');

    // Use MissionService to complete the mission
    if (this.gameServices && this.gameServices.missionService) {
        if (victory) {
            const result = this.gameServices.missionService.completeMission(true);
            // MissionService already applies rewards via ResourceService
            if (this.logger && result) {
                this.logger.info('🎆 Mission stats:', result.stats);
            }

            // CRITICAL: Merge mission results on victory
            // This applies XP gains, items found, and accepts permanent agent deaths
            if (this.gameServices.missionStateService) {
                if (this.logger) this.logger.info('✅ Merging mission results to game state');
                this.gameServices.missionStateService.mergeResults(this);
            }
        } else {
            this.gameServices.missionService.failMission('Mission failed');
            // Don't merge results on defeat - either retry (restore) or return to hub (manual sync)
        }
    } else {
        // Fallback if MissionService not available
        if (victory && this.currentMissionDef) {
            this.giveRewards(this.currentMissionDef.rewards);
        }
    }

    // Navigate to victory/defeat screen using screen manager
    window.screenManager.navigateTo(victory ? 'victory' : 'defeat');
};

// Custom objective check functions
CyberOpsGame.prototype.checkStealthObjective = function(objective) {
    // Check if alarms have been triggered
    return !this.alarmsTriggered;
};

CyberOpsGame.prototype.checkMainframeCaptured = function(objective) {
    // Check if all prerequisites are met (handled by triggerAfter)
    // If this function is called, prerequisites are already met
    return true;
};

CyberOpsGame.prototype.checkNoCivilianCasualties = function(objective) {
    // Check if any civilians have been killed
    return (this.civilianCasualties || 0) === 0;
};

CyberOpsGame.prototype.checkAgentsAlive = function(objective) {
    // Check if minimum number of agents are still alive
    const minAgents = objective.minAgents || 2;
    const aliveAgents = this.agents ? this.agents.filter(a => a.alive).length : 0;
    return aliveAgents >= minAgents;
};

// Handle enemy elimination
CyberOpsGame.prototype.onEnemyEliminated = function(enemy) {
    if (this.logger) this.logger.info('🎯 onEnemyEliminated CALLED');

    // Track ONLY in MissionService (single source of truth)
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.trackEvent('eliminate', {
            type: enemy.type || 'unknown'
        });
        if (this.logger) this.logger.info('📊 Tracked enemy elimination in MissionService');
    }

    // Handle weapon drops (40% chance)
    if (enemy.weapon && enemy.weapon.dropChance) {
        const dropRoll = Math.random();
        if (dropRoll < enemy.weapon.dropChance) {
            // Create a weapon collectable at enemy's position
            if (!this.map.collectables) {
                this.map.collectables = [];
            }

            const weaponDrop = {
                type: 'weapon',
                x: enemy.x,
                y: enemy.y,
                id: 'weapon_drop_' + Date.now() + '_' + Math.random(),
                name: enemy.weapon.type.replace(/_/g, ' ').toUpperCase(),
                sprite: '🔫',
                weapon: enemy.weapon.type,
                weaponDamage: enemy.weapon.damage,
                weaponRange: enemy.weapon.range,
                collected: false
            };

            this.map.collectables.push(weaponDrop);
            this.addNotification(`💥 ${enemy.type} dropped ${weaponDrop.name}!`);
            if (this.logger) this.logger.debug(`🔫 Weapon dropped at (${enemy.x}, ${enemy.y}): ${weaponDrop.name}`);
        }
    }

    // Check objectives
    this.checkMissionObjectives();
};

// Handle item collection
CyberOpsGame.prototype.onItemCollected = function(itemType) {
    // Track through MissionService
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.trackEvent('collect', {
            type: itemType,
            count: 1
        });
    }

    // Check objectives
    this.checkMissionObjectives();
};

// Update survival timers
CyberOpsGame.prototype.updateSurvivalTimers = function(deltaTime) {
    // Survival timers now handled by MissionService.update()
    // MissionService tracks per-objective timers internally
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.update(deltaTime * 1000); // Convert seconds to milliseconds
    }
};

// Initialize quest system
CyberOpsGame.prototype.initQuestSystem = function() {
    // Quest tracking now handled by MissionService
    this.quests = {};  // Keep for NPC quest definitions
    if (this.logger) this.logger.info('📜 Quest system initialized');
};

// Give quest to player
CyberOpsGame.prototype.giveQuest = function(questId) {
    const questDef = QUEST_DEFINITIONS[questId];
    if (!questDef) return false;

    // Check requirements
    if (questDef.requirements) {
        if (questDef.requirements.level && this.currentMissionIndex < questDef.requirements.level) {
            return false;
        }
        if (questDef.requirements.credits && (this.credits || 0) < questDef.requirements.credits) {
            return false;
        }
        if (questDef.requirements.completedQuests) {
            const hasRequired = questDef.requirements.completedQuests.every(qId =>
                this.completedQuests.has(qId)
            );
            if (!hasRequired) return false;
        }
    }

    // Add to active quests
    this.activeQuests[questId] = {
        ...questDef,
        startTime: Date.now(),
        objectives: questDef.objectives.map(o => ({ ...o, completed: false }))
    };

    this.addNotification(`📜 New Quest: ${questDef.name}`);
    return true;
};

// Check quest completion
CyberOpsGame.prototype.checkQuestCompletion = function() {
    if (!this.activeQuests) return;

    Object.entries(this.activeQuests).forEach(([questId, quest]) => {
        if (!quest || !quest.objectives) return;

        let allComplete = true;

        quest.objectives.forEach(obj => {
            // Quest completion should also use MissionService
            // For now, keep quest system separate as it's NPC-driven
            if (!obj.completed) allComplete = false;
        });

        if (allComplete) {
            this.completeQuest(questId);
        }
    });
};

// Complete quest
CyberOpsGame.prototype.completeQuest = function(questId) {
    const quest = this.activeQuests[questId];
    if (!quest) return;

    // Give rewards
    this.giveRewards(quest.rewards);

    // Mark as completed
    this.completedQuests.add(questId);
    delete this.activeQuests[questId];

    // Unlock next quests
    if (quest.rewards.unlocks) {
        quest.rewards.unlocks.forEach(unlockedQuestId => {
            // Make quest available from NPCs
            if (this.logger) this.logger.debug(`🔓 Unlocked quest: ${unlockedQuestId}`);
        });
    }

    this.addNotification(`✅ Quest Complete: ${quest.name}`);
};

// Load custom map from editor
CyberOpsGame.prototype.loadCustomMapFromEditor = function(customData) {
    if (this.logger) this.logger.debug('📝 Loading custom map from editor:', customData.name);

    // Create map structure
    this.map = {
        width: customData.width,
        height: customData.height,
        tiles: customData.tiles,
        terminals: [],
        doors: [],
        explosiveTargets: [],
        switches: [],
        gates: [],
        items: []
    };

    // Set spawn and extraction points from entities
    const spawnEntity = customData.entities.find(e => e.type === 'spawn-point');
    const extractEntity = customData.entities.find(e => e.type === 'extraction');

    if (spawnEntity) {
        this.map.spawnPoint = { x: spawnEntity.x, y: spawnEntity.y };
    }
    if (extractEntity) {
        this.map.extractionPoint = { x: extractEntity.x, y: extractEntity.y };
    }

    // Process entities
    customData.entities.forEach(entity => {
        switch (entity.type) {
            case 'enemy':
                if (!this.enemies) this.enemies = [];
                this.enemies.push({
                    x: entity.x,
                    y: entity.y,
                    type: entity.enemyType || 'guard',
                    health: 100,
                    maxHealth: 100,
                    alertLevel: entity.alertLevel || 0,
                    patrolRoute: entity.patrolRoute || [],
                    visionCone: {
                        angle: Math.PI / 4,
                        range: 8,
                        direction: 0
                    },
                    speed: 0.02,
                    state: 'patrol'
                });
                break;

            case 'npc':
                if (!this.npcs) this.npcs = [];
                this.npcs.push({
                    id: `npc_${entity.id}`,
                    name: entity.name || 'NPC',
                    x: entity.x,
                    y: entity.y,
                    type: entity.npcType || 'civilian',
                    dialog: entity.dialog || [],
                    quests: entity.quests || [],
                    interacted: false
                });
                break;

            case 'waypoint':
                if (!this.map.waypoints) this.map.waypoints = [];
                this.map.waypoints.push({
                    x: entity.x,
                    y: entity.y,
                    label: entity.label || 'Waypoint'
                });
                break;

            case 'item':
                this.map.items.push({
                    x: entity.x,
                    y: entity.y,
                    type: entity.itemType || 'credits',
                    value: entity.value || 100,
                    collected: false
                });
                break;

            case 'terminal':
                this.map.terminals.push({
                    x: entity.x,
                    y: entity.y,
                    hacked: false,
                    hackTime: 3
                });
                break;

            case 'explosive':
                this.map.explosiveTargets.push({
                    x: entity.x,
                    y: entity.y,
                    planted: false,
                    plantTime: 5
                });
                break;

            case 'switch':
                this.map.switches.push({
                    x: entity.x,
                    y: entity.y,
                    activated: false
                });
                break;

            case 'gate':
                this.map.gates.push({
                    x: entity.x,
                    y: entity.y,
                    breached: false,
                    breachTime: 8
                });
                break;
        }
    });

    // Process NPCs from the separate NPCs array (if provided)
    if (customData.npcs && customData.npcs.length > 0) {
        customData.npcs.forEach(npc => {
            // Check if NPC already exists at this position
            const exists = this.npcs && this.npcs.find(n => n.x === npc.x && n.y === npc.y);
            if (!exists) {
                if (!this.npcs) this.npcs = [];
                this.npcs.push({
                    id: `npc_custom_${Date.now()}_${Math.random()}`,
                    name: npc.name,
                    x: npc.x,
                    y: npc.y,
                    type: npc.type || 'civilian',
                    dialog: npc.dialog || [],
                    quests: npc.quests || [],
                    interacted: false
                });
            }
        });
    }

    if (this.logger) this.logger.info('✅ Custom map loaded:', {
        size: `${this.map.width}x${this.map.height}`,
        enemies: this.enemies ? this.enemies.length : 0,
        npcs: this.npcs ? this.npcs.length : 0,
        terminals: this.map.terminals.length,
        items: this.map.items.length
    });
};

// Load map from embedded tiles (new format)
CyberOpsGame.prototype.loadMapFromEmbeddedTiles = function(mapDef) {
    if (this.logger) this.logger.debug('🔧 Loading map from embedded tiles');
    if (this.logger) this.logger.debug('   Map definition:', {
        width: mapDef.width,
        height: mapDef.height,
        hasEmbedded: !!mapDef.embedded,
        type: mapDef.type
    });

    const map = {
        width: mapDef.width,
        height: mapDef.height,
        spawn: mapDef.embedded.spawn || mapDef.spawn,
        extraction: mapDef.embedded.extraction || mapDef.extraction,
        tiles: [],
        items: [],
        doors: mapDef.embedded.doors || mapDef.doors || [],
        terminals: [],
        coverPositions: mapDef.embedded.coverCount || mapDef.coverPositions || 0,
        enemySpawns: mapDef.enemySpawns || []
    };

    // DEBUG: Log spawn and extraction to verify they're not swapped
    if (this.logger) {
        this.logger.info(`🎯 MAP LOADING - Spawn: (${map.spawn?.x}, ${map.spawn?.y}), Extraction: (${map.extraction?.x}, ${map.extraction?.y})`);
    }

    // Parse embedded tiles from 2D array format
    const tilesData = mapDef.embedded.tiles;

    // Check if tiles are in 2D string array format (new efficient format)
    if (typeof tilesData[0] === 'string') {
        if (this.logger) this.logger.debug('   Using efficient string-based tile format');

        // Decode character-based tile format
        const tileMap = {
            '#': 1,  // wall
            '.': 0,  // floor
            'D': 0,  // door (walkable)
            'W': 1,  // window (blocks)
            'T': 0,  // terminal (walkable)
            'C': 0,  // cover (walkable)
            'E': 0,  // explosive (walkable)
            'G': 0,  // gate (walkable initially)
            'S': 0   // switch (walkable)
        };

        for (let y = 0; y < mapDef.height; y++) {
            map.tiles[y] = [];
            const row = tilesData[y] || '';
            for (let x = 0; x < mapDef.width; x++) {
                const char = row[x] || '.';
                map.tiles[y][x] = tileMap[char] !== undefined ? tileMap[char] : 0;
            }
        }
    } else {
        // Handle old format or initialize as floor
        for (let y = 0; y < mapDef.height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < mapDef.width; x++) {
                map.tiles[y][x] = 0;
            }
        }

        // Apply custom tiles if in old format
        if (mapDef.embedded && mapDef.embedded.customTiles) {
            if (this.logger) this.logger.debug(`   Applying ${mapDef.embedded.customTiles.length} custom tiles`);
            mapDef.embedded.customTiles.forEach(tile => {
                if (tile.y >= 0 && tile.y < mapDef.height &&
                    tile.x >= 0 && tile.x < mapDef.width) {
                    map.tiles[tile.y][tile.x] = tile.type;
                }
            });
        }
    }

    // Add items from embedded data (terminals, explosives, etc)
    if (mapDef.embedded.items) {
        mapDef.embedded.items.forEach(item => {
            if (item.type === 'terminal') {
                map.terminals.push({
                    x: item.x,
                    y: item.y,
                    hacked: false,
                    id: item.id
                });
            }
            // Store other items too
            map.items.push(item);
        });
    }

    if (this.logger) this.logger.info('✅ Map loaded from embedded tiles');
    return map;
};

// Generate map from embedded mission definition (old format with generation rules)
CyberOpsGame.prototype.generateMapFromEmbeddedDefinition = function(mapDef) {
    if (this.logger) this.logger.debug('🔧 Starting map generation from embedded definition');
    if (this.logger) this.logger.debug('   Map definition:', {
        width: mapDef.width,
        height: mapDef.height,
        hasGeneration: !!mapDef.generation,
        type: mapDef.type
    });

    const map = {
        width: mapDef.width,
        height: mapDef.height,
        spawn: mapDef.spawn,
        extraction: mapDef.extraction,
        tiles: [],
        items: [],
        doors: mapDef.doors || [],
        terminals: mapDef.terminals || [],
        explosiveTargets: mapDef.explosiveTargets || [],
        gates: mapDef.gates || [],
        switches: mapDef.switches || [],
        turrets: mapDef.turrets || [],
        targets: mapDef.targets || [],
        civilians: mapDef.civilians || [],
        hazards: mapDef.hazards || [],
        collectables: mapDef.collectables || [],
        boss: mapDef.boss || null,
        coverPositions: mapDef.coverPositions || 60,
        enemySpawns: mapDef.enemySpawns || []
    };

    // Initialize tiles array
    for (let y = 0; y < map.height; y++) {
        map.tiles[y] = [];
        for (let x = 0; x < map.width; x++) {
            map.tiles[y][x] = 0; // Default to walkable
        }
    }

    const gen = mapDef.generation;
    if (!gen) {
        if (this.logger) this.logger.error('No generation rules in embedded map definition');
        return map;
    }

    // Set base tile type
    if (gen.baseType === 'walls') {
        // Fill with walls
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                map.tiles[y][x] = 1;
            }
        }
    }

    // Add borders if specified
    if (gen.borders) {
        for (let x = 0; x < map.width; x++) {
            map.tiles[0][x] = 1;
            map.tiles[map.height - 1][x] = 1;
        }
        for (let y = 0; y < map.height; y++) {
            map.tiles[y][0] = 1;
            map.tiles[y][map.width - 1] = 1;
        }
    }

    // Generate grid-based rooms (corporate, government)
    if (gen.rooms && gen.rooms.type === 'grid') {
        const rooms = gen.rooms;
        for (let x = rooms.startX; x < map.width - rooms.roomWidth; x += rooms.stepX) {
            for (let y = rooms.startY; y < map.height - rooms.roomHeight; y += rooms.stepY) {
                // Clear room interior
                for (let rx = x; rx < x + rooms.roomWidth && rx < map.width; rx++) {
                    for (let ry = y; ry < y + rooms.roomHeight && ry < map.height; ry++) {
                        map.tiles[ry][rx] = 0;
                    }
                }
            }
        }
    }

    // Add corridors
    if (gen.corridors) {
        gen.corridors.forEach(corridor => {
            if (corridor.type === 'horizontal') {
                for (let y = corridor.startY; y <= corridor.endY && y < map.height; y += corridor.stepY) {
                    for (let x = 0; x < map.width; x++) {
                        for (let w = 0; w < corridor.width && y + w < map.height; w++) {
                            map.tiles[y + w][x] = 0;
                        }
                    }
                }
            } else if (corridor.type === 'vertical') {
                for (let x = corridor.startX; x <= corridor.endX && x < map.width; x += corridor.stepX) {
                    for (let y = 0; y < map.height; y++) {
                        for (let w = 0; w < corridor.width && x + w < map.width; w++) {
                            map.tiles[y][x + w] = 0;
                        }
                    }
                }
            }
        });
    }

    // Clear specific areas
    if (gen.clearAreas) {
        gen.clearAreas.forEach(area => {
            for (let x = area.x1; x <= area.x2 && x < map.width; x++) {
                for (let y = area.y1; y <= area.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Industrial map generation
    if (gen.docks) {
        gen.docks.forEach(dock => {
            for (let x = dock.x1; x <= dock.x2 && x < map.width; x++) {
                for (let y = dock.y1; y <= dock.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    if (gen.catwalks) {
        gen.catwalks.forEach(walk => {
            for (let x = walk.x1; x <= walk.x2 && x < map.width; x++) {
                for (let y = walk.y1; y <= walk.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    if (gen.assemblyLines) {
        gen.assemblyLines.forEach(line => {
            for (let x = line.x; x < line.x + line.width && x < map.width; x++) {
                for (let y = line.y; y < line.y + line.height && y < map.height; y++) {
                    map.tiles[y][x] = 1; // Assembly lines are obstacles
                }
            }
        });
    }

    if (gen.controlRooms) {
        gen.controlRooms.forEach(room => {
            // Clear room interior
            for (let x = room.x + 1; x < room.x + room.width - 1 && x < map.width; x++) {
                for (let y = room.y + 1; y < room.y + room.height - 1 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Residential map generation
    if (gen.buildings) {
        gen.buildings.forEach(building => {
            for (let x = building.x; x < building.x + building.width && x < map.width; x++) {
                for (let y = building.y; y < building.y + building.height && y < map.height; y++) {
                    map.tiles[y][x] = 1; // Buildings are walls
                }
            }
        });
    }

    if (gen.park) {
        const park = gen.park;
        for (let x = park.x; x < park.x + park.width && x < map.width; x++) {
            for (let y = park.y; y < park.y + park.height && y < map.height; y++) {
                map.tiles[y][x] = 0;
            }
        }
    }

    if (gen.alleyways) {
        gen.alleyways.forEach(alley => {
            for (let x = alley.x1; x <= alley.x2 && x < map.width; x++) {
                for (let y = alley.y1; y <= alley.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Fortress map generation
    if (gen.courtyards) {
        gen.courtyards.forEach(court => {
            for (let x = court.x1; x <= court.x2 && x < map.width; x++) {
                for (let y = court.y1; y <= court.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    if (gen.core) {
        for (let x = gen.core.x1; x <= gen.core.x2 && x < map.width; x++) {
            for (let y = gen.core.y1; y <= gen.core.y2 && y < map.height; y++) {
                map.tiles[y][x] = 0;
            }
        }
    }

    if (gen.gateways) {
        gen.gateways.forEach(gateway => {
            for (let x = gateway.x1; x <= gateway.x2 && x < map.width; x++) {
                for (let y = gateway.y1; y <= gateway.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    if (gen.towers) {
        gen.towers.forEach(tower => {
            const r = tower.radius;
            for (let x = Math.max(0, tower.x - r); x <= Math.min(map.width - 1, tower.x + r); x++) {
                for (let y = Math.max(0, tower.y - r); y <= Math.min(map.height - 1, tower.y + r); y++) {
                    const dist = Math.sqrt((x - tower.x) ** 2 + (y - tower.y) ** 2);
                    if (dist <= r) {
                        map.tiles[y][x] = 0;
                    }
                }
            }
        });
    }

    if (gen.passages) {
        gen.passages.forEach(passage => {
            for (let x = passage.x1; x <= passage.x2 && x < map.width; x++) {
                for (let y = passage.y1; y <= passage.y2 && y < map.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Carve passages around doors to ensure they're accessible
    if (mapDef.doors) {
        mapDef.doors.forEach(door => {
            // Clear the door tile and adjacent tiles
            map.tiles[door.y][door.x] = 0;
            if (door.y > 0) map.tiles[door.y - 1][door.x] = 0;
            if (door.y < map.height - 1) map.tiles[door.y + 1][door.x] = 0;
            if (door.x > 0) map.tiles[door.y][door.x - 1] = 0;
            if (door.x < map.width - 1) map.tiles[door.y][door.x + 1] = 0;
        });
    }

    // CRITICAL: Clear spawn and extraction areas LAST to override any walls
    // Clear larger area around spawn point (5x5 area)
    if (map.spawn) {
        if (this.logger) this.logger.debug(`🎯 Clearing spawn area at (${map.spawn.x}, ${map.spawn.y})`);
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const y = map.spawn.y + dy;
                const x = map.spawn.x + dx;
                if (y >= 0 && y < map.height && x >= 0 && x < map.width) {
                    map.tiles[y][x] = 0;
                    // Log what we're clearing
                    if (Math.abs(dy) <= 1 && Math.abs(dx) <= 1) {
                        if (this.logger) this.logger.debug(`  Clearing tile at (${x}, ${y})`);
                    }
                }
            }
        }
    }

    // Clear larger area around extraction point (5x5 area)
    if (map.extraction) {
        if (this.logger) this.logger.debug(`🚁 Clearing extraction area at (${map.extraction.x}, ${map.extraction.y})`);
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                const y = map.extraction.y + dy;
                const x = map.extraction.x + dx;
                if (y >= 0 && y < map.height && x >= 0 && x < map.width) {
                    map.tiles[y][x] = 0;
                    // Log what we're clearing
                    if (Math.abs(dy) <= 1 && Math.abs(dx) <= 1) {
                        if (this.logger) this.logger.debug(`  Clearing tile at (${x}, ${y})`);
                    }
                }
            }
        }

        // Double-check extraction point is clear
        if (map.tiles[map.extraction.y] && map.tiles[map.extraction.y][map.extraction.x] !== 0) {
            if (this.logger) this.logger.error('❌ Extraction point still blocked after clearing!');
            map.tiles[map.extraction.y][map.extraction.x] = 0;
        }
    }

    // Generate cover positions
    const coverCount = mapDef.coverPositions || 60;
    for (let i = 0; i < coverCount; i++) {
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.floor(Math.random() * map.width);
            const y = Math.floor(Math.random() * map.height);
            if (map.tiles[y][x] === 0) {
                map.items.push({
                    type: 'cover',
                    x: x,
                    y: y
                });
                break;
            }
            attempts++;
        }
    }

    if (this.logger) this.logger.debug(`📦 Generated embedded map "${mapDef.name}" (${map.width}x${map.height})`);
    if (this.logger) this.logger.debug(`   - Doors: ${map.doors.length}, Terminals: ${map.terminals.length}`);
    if (this.logger) this.logger.debug(`   - Enemy spawns: ${map.enemySpawns.length}`);
    if (this.logger) this.logger.warn(`   - Tiles array: ${map.tiles ? map.tiles.length + ' rows' : 'MISSING!'}`);

    // Validate tiles array before returning
    if (!map.tiles || map.tiles.length === 0) {
        if (this.logger) this.logger.error('❌ Map tiles array is missing or empty!');
    }

    return map;
};