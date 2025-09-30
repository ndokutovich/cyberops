// Mission System Integration
// This file bridges the new mission system with the existing game code

// Initialize module logger
const integrationLogger = window.Logger ? new window.Logger('MissionIntegration') : null;
if (integrationLogger) integrationLogger.info('🚀 game-mission-integration.js LOADED');

// Override the existing mission loading to use the new system
CyberOpsGame.prototype.initMissions = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameMissionIntegration') : null;
    }
    if (this.logger) this.logger.debug('🎮 Initializing comprehensive mission system...');

    // Initialize mission and quest systems
    this.initMissionSystem();
    this.initQuestSystem();

    // Missions will be loaded by campaign-integration.js
    if (!this.missions) {
        this.missions = [];
    }

    if (this.logger) this.logger.info(`📋 Mission system initialized`);
};

// Override the hackNearestTerminal function to use the new system
CyberOpsGame.prototype.hackNearestTerminal = function(agent) {
    // Use the new generic action system
    return this.useActionAbility(agent);
};

// Override plantNearestExplosive
CyberOpsGame.prototype.plantNearestExplosive = function(agent) {
    // Use the new generic action system
    return this.useActionAbility(agent);
};

// Override eliminateNearestTarget
CyberOpsGame.prototype.eliminateNearestTarget = function(agent) {
    // For eliminate objectives, we still shoot enemies
    return this.shootNearestEnemy(agent);
};

// Override breachNearestGate
CyberOpsGame.prototype.breachNearestGate = function(agent) {
    // Use the new generic action system
    return this.useActionAbility(agent);
};

// Update the ability usage to use the new system
CyberOpsGame.prototype.useAbilityForAllSelectedUpdated = function(abilityIndex) {
    if (this.isPaused) return;

    const selectedAgents = this.agents.filter(a => a.selected && a.alive);
    if (selectedAgents.length === 0) return;

    let anyUsed = false;

    selectedAgents.forEach((agent, index) => {
        if (agent.cooldowns[abilityIndex] > 0) return;

        switch (abilityIndex) {
            case 1: // Shoot
                this.shootNearestEnemy(agent);
                agent.cooldowns[1] = 60;
                anyUsed = true;
                break;

            case 2: // Grenade
                this.throwGrenade(agent);
                agent.cooldowns[2] = 180;
                anyUsed = true;
                break;

            case 3: // Action key - use new system
                if (index === 0) { // Only first agent for interactions
                    if (this.useActionAbility(agent)) {
                        agent.cooldowns[3] = 120;
                        anyUsed = true;
                    }
                }
                break;

            case 4: // Shield
                this.activateShield(agent);
                agent.cooldowns[4] = 300;
                anyUsed = true;
                break;
        }
    });

    if (anyUsed) {
        this.updateCooldownDisplay();
    }
};

// Replace the old useAbilityForAllSelected
CyberOpsGame.prototype.useAbilityForAllSelected = CyberOpsGame.prototype.useAbilityForAllSelectedUpdated;

// Update mission initialization to use the new system
CyberOpsGame.prototype.initMissionUpdated = function() {
    if (this.logger) this.logger.info('🚀 initMissionUpdated STARTED');

    // Reset mission failure flag
    this.missionFailed = false;

    // Call the original init for basic setup
    if (this.initMissionOriginal) {
        if (this.logger) this.logger.info('📞 Calling initMissionOriginal');
        this.initMissionOriginal.call(this);
    } else {
        if (this.logger) this.logger.error('❌ initMissionOriginal NOT FOUND!');
    }

    // Initialize from mission definition - get the FULL mission data
    const mission = this.missions && this.missions[this.currentMissionIndex];
    if (this.logger) this.logger.info('📋 Mission from array:', mission ? Object.keys(mission) : 'NULL');

    // Use the mission directly - it has been processed by convertToLegacyFormat
    // and contains objectives, npcs, etc. properly formatted
    // The _campaignData is just the raw data and might not have everything
    if (mission) {
        this.currentMissionDef = mission;
        if (this.logger) this.logger.info('📋 Using processed mission data with objectives');
    } else {
        this.currentMissionDef = null;
    }
    if (this.logger) {
        this.logger.info('📋 currentMissionDef set to:', this.currentMissionDef ? this.currentMissionDef.name : 'NULL');
        if (this.currentMissionDef) {
            this.logger.info('📋 Mission has these properties:', Object.keys(this.currentMissionDef));
            this.logger.info('📋 Objectives present?', !!this.currentMissionDef.objectives);
            if (this.currentMissionDef.objectives) {
                this.logger.info('📋 Number of objectives:', this.currentMissionDef.objectives.length);
            }
        }
    }

    // No need to copy properties - we're using the mission directly now
    // which already has all the data from convertToLegacyFormat

    if (this.logger) {
        this.logger.debug('🎯 Setting currentMissionDef for mission', this.currentMissionIndex);
        this.logger.debug('Mission has objectives?', !!(this.currentMissionDef && this.currentMissionDef.objectives));
        this.logger.debug('Mission has NPCs?', !!(this.currentMissionDef && this.currentMissionDef.npcs));
        if (this.currentMissionDef) {
            this.logger.debug('Mission properties:', Object.keys(this.currentMissionDef));
            if (this.currentMissionDef.objectives) {
                this.logger.debug('Number of objectives:', this.currentMissionDef.objectives.length);
                this.logger.debug('First objective:', this.currentMissionDef.objectives[0]);
            }
            if (this.currentMissionDef.npcs) {
                this.logger.debug('Number of NPCs:', this.currentMissionDef.npcs.length);
            }
        }
    }

    // Mission tracking now handled entirely by MissionService
    // No need for local missionTrackers anymore

    // Initialize from definition if we have a valid mission
    if (this.currentMissionDef) {
        if (this.logger) this.logger.info('📋 BEFORE initMissionFromDefinition - objectives?', !!this.currentMissionDef.objectives);
        this.initMissionFromDefinition();
        if (this.logger) this.logger.info('📋 AFTER initMissionFromDefinition - objectives?', !!this.currentMissionDef.objectives);
    } else {
        if (this.logger) this.logger.warn('⚠️ Cannot initialize mission - no mission definition found');
    }

    // Spawn NPCs AFTER mission definition is initialized
    if (this.spawnNPCs) {
        if (this.logger) this.logger.info('🎮 Spawning NPCs for mission after definition loaded...');
        this.spawnNPCs();
    }

    // Start mission through MissionService AFTER everything is set up
    if (window.GameServices && window.GameServices.missionService && this.currentMissionDef) {
        if (this.logger) this.logger.info('📋 BEFORE MissionService.startMission - objectives?', !!this.currentMissionDef.objectives);
        window.GameServices.missionService.startMission(this.currentMissionDef);

        // IMPORTANT: Keep a reference to MissionService objectives for backward compatibility
        // This ensures the game can find objectives even if code checks currentMissionDef.objectives
        this.currentMissionDef.objectives = window.GameServices.missionService.objectives;
        if (this.logger) this.logger.info('🔗 Linked MissionService objectives to currentMissionDef');
        if (this.logger) this.logger.info('📋 AFTER linking - objectives count:', this.currentMissionDef.objectives ? this.currentMissionDef.objectives.length : 0);
    } else if (!window.GameServices || !window.GameServices.missionService) {
        if (this.logger) this.logger.warn('⚠️ MissionService not available, objectives may not track properly');
    }

    // The objectives initialization is now handled by MissionService
    // Just verify they exist
    if (this.currentMissionDef && this.currentMissionDef.objectives) {
        if (this.logger) this.logger.info('✅ Mission initialized with objectives:', this.currentMissionDef.objectives.length);
    } else {
        if (this.logger) this.logger.error('❌ CRITICAL: No objectives at end of initMissionUpdated!', {
            hasDef: !!this.currentMissionDef,
            hasObjectives: !!(this.currentMissionDef && this.currentMissionDef.objectives),
            missionService: !!(window.GameServices && window.GameServices.missionService),
            serviceObjectives: window.GameServices && window.GameServices.missionService ? window.GameServices.missionService.objectives.length : 0
        });
    }
};

// Save original and replace
if (!CyberOpsGame.prototype.initMissionOriginal) {
    if (integrationLogger) integrationLogger.info('🔄 REPLACING initMission with updated version');
    CyberOpsGame.prototype.initMissionOriginal = CyberOpsGame.prototype.initMission;
    CyberOpsGame.prototype.initMission = CyberOpsGame.prototype.initMissionUpdated;
} else {
    if (integrationLogger) integrationLogger.warn('⚠️ initMission ALREADY REPLACED');
}

// Update the game loop to check objectives
CyberOpsGame.prototype.updateMissionObjectives = function() {
    // CRITICAL: Check for mission failure - all agents dead
    if (this.agents && this.agents.length > 0) {
        const aliveAgents = this.agents.filter(a => a.alive).length;
        if (aliveAgents === 0) {
            // All agents are dead - mission failed!
            if (!this.missionFailed) {
                this.missionFailed = true;
                this.isPaused = true; // Pause game to prevent pause menu from showing
                if (this.logger) this.logger.info('☠️ MISSION FAILED - All agents eliminated');

                // Switch to defeat screen using ScreenManager
                window.screenManager.navigateTo('defeat');

                // Stop music and play defeat sound
                if (this.audioInitialized && this.musicContext) {
                    this.fadeOutMusic(1000);
                }
                if (this.playSound) {
                    this.playSound('defeat', 0.7);
                }
            }
            return; // Don't check objectives if mission failed
        }
    }

    // CRITICAL: Process combat events from CombatService (unidirectional data flow)
    if (window.GameServices && window.GameServices.combatService) {
        // Process combat events for logging
        const combatEvents = window.GameServices.combatService.getAndClearCombatEvents();
        if (combatEvents && combatEvents.length > 0) {
            combatEvents.forEach(event => {
                if (event.type === 'attack' && event.hit && this.logCombatHit) {
                    // Log the combat hit using game's logging system
                    this.logCombatHit(event.attacker, event.target, event.damage, event.killed);
                }
            });
        }

        // Process enemy eliminations
        const eliminated = window.GameServices.combatService.getAndClearEliminatedEnemies();
        if (eliminated && eliminated.length > 0) {
            if (this.logger) this.logger.info(`🎯 Processing ${eliminated.length} queued enemy eliminations from CombatService`);
            eliminated.forEach(elimination => {
                if (this.onEnemyEliminated) {
                    if (this.logger) this.logger.debug(`🎯 Processing enemy: ${elimination.entityId}`);
                    this.onEnemyEliminated(elimination.entity);
                } else {
                    if (this.logger) this.logger.error(`❌ onEnemyEliminated function not found!`);
                }

                // Grant XP for the kill!
                if (this.onEntityDeath && elimination.killerEntity) {
                    if (this.logger) this.logger.debug(`💰 Granting XP: ${elimination.entityId} killed by ${elimination.killerId}`);
                    this.onEntityDeath(elimination.entity, elimination.killerEntity);
                }
            });
        }
    } else {
        if (!this._combatServiceWarningShown) {
            if (this.logger) this.logger.warn(`⚠️ CombatService not available in updateMissionObjectives`);
            this._combatServiceWarningShown = true;
        }
    }

    // Check mission objectives each frame
    if (this.checkMissionObjectives) {
        this.checkMissionObjectives();
    } else {
        if (this.logger) this.logger.error('⚠️ checkMissionObjectives NOT FOUND!');
    }

    // Check quest objectives
    this.checkQuestCompletion();

    // Update survival timers
    if (this.lastUpdateTime) {
        const deltaTime = (Date.now() - this.lastUpdateTime) / 1000;
        this.updateSurvivalTimers(deltaTime);
    }
    this.lastUpdateTime = Date.now();

    // Check if agents reached extraction point
    // UNIDIRECTIONAL: Only read from MissionService, never from game
    const extractionEnabled = window.GameServices?.missionService?.extractionEnabled;

    if (extractionEnabled) {
        // Add debug log to see if this is running (once per second)
        if (!this._lastExtractionCheck || Date.now() - this._lastExtractionCheck > 1000) {
            if (this.logger) {
                this.logger.debug(`🚁 Extraction check active from MissionService: ${extractionEnabled}`);
            }
            this._lastExtractionCheck = Date.now();
        }
        this.checkExtractionPoint();
    } else {
        // Log once per 5 seconds when extraction is not enabled
        if (!this._lastExtractionNotEnabledLog || Date.now() - this._lastExtractionNotEnabledLog > 5000) {
            if (this.logger) {
                this.logger.trace(`⏳ Extraction not yet enabled - waiting for objectives completion`);
            }
            this._lastExtractionNotEnabledLog = Date.now();
        }
    }
};

// Hook into the game loop
CyberOpsGame.prototype.gameLoopUpdated = function() {
    // Call original game loop
    if (this.gameLoopOriginal) {
        this.gameLoopOriginal.call(this);
    }

    // Update mission objectives
    if (this.currentScreen === 'game' && !this.isPaused) {
        this.updateMissionObjectives();
    }
};

// Save original and replace
if (!CyberOpsGame.prototype.gameLoopOriginal) {
    if (integrationLogger) integrationLogger.info('🔄 REPLACING gameLoop with updated version');
    CyberOpsGame.prototype.gameLoopOriginal = CyberOpsGame.prototype.gameLoop;
    CyberOpsGame.prototype.gameLoop = CyberOpsGame.prototype.gameLoopUpdated;
} else {
    if (integrationLogger) integrationLogger.warn('⚠️ gameLoop ALREADY REPLACED');
}

// Interaction tracking now handled by MissionService
CyberOpsGame.prototype.performInteractionUpdated = function(agent, targetType, target) {
    // Call the new performInteraction
    this.performInteraction(agent, targetType, target);

    // MissionService handles all tracking now
};

// Override the original hackNearestTerminal completely
CyberOpsGame.prototype.hackNearestTerminal = function(agent) {
    if (!this.map || !this.map.terminals) return false;

    let nearestTerminal = null;
    let nearestDist = Infinity;

    this.map.terminals.forEach(terminal => {
        if (terminal.hacked) return;

        const dist = Math.sqrt(
            Math.pow(terminal.x - agent.x, 2) +
            Math.pow(terminal.y - agent.y, 2)
        );

        // Apply hacking bonus from equipment and research
        let hackRange = 3;
        if (agent.hackBonus) {
            hackRange += agent.hackBonus / 100 * 2;
        }

        if (dist < hackRange && dist < nearestDist) {
            nearestDist = dist;
            nearestTerminal = terminal;
        }
    });

    if (nearestTerminal) {
        // Mark as hacked
        nearestTerminal.hacked = true;

        // Track ONLY through MissionService
        if (window.GameServices && window.GameServices.missionService) {
            window.GameServices.missionService.trackEvent('terminal', {
                id: nearestTerminal.id || 'unknown'
            });
        }

        if (this.logger) this.logger.debug(`🖥️ Terminal hacked!`);

        // Log the hacking event
        if (this.logEvent) {
            this.logEvent(`${agent.name} hacked terminal at [${nearestTerminal.x}, ${nearestTerminal.y}]`, 'hack', true);
        }

        // Visual effect
        this.effects.push({
            type: 'hack',
            x: nearestTerminal.x,
            y: nearestTerminal.y,
            duration: 60,
            frame: 0
        });

        // Sound effect
        if (this.playSound) {
            this.playSound('hack', 0.5);
        }

        // Handle interaction for objectives
        OBJECTIVE_HANDLERS.handleInteraction(agent, INTERACTION_TARGETS.TERMINAL, nearestTerminal.id || 'terminal', this);

        return true;
    }

    return false;
};

// Update enemy elimination tracking
CyberOpsGame.prototype.onEnemyDeath = function(enemy) {
    // Track elimination through MissionService
    this.onEnemyEliminated(enemy);
};

// Don't automatically reinitialize - let campaign-integration handle this
// The missions are already loaded from game-core.js and we want to preserve them
// unless explicitly using the new campaign system

if (integrationLogger) integrationLogger.info('✅ Mission system integration loaded');