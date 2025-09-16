// Mission System Integration
// This file bridges the new mission system with the existing game code

// Override the existing mission loading to use the new system
CyberOpsGame.prototype.initMissions = function() {
    console.log('🎮 Initializing comprehensive mission system...');

    // Initialize mission and quest systems
    this.initMissionSystem();
    this.initQuestSystem();

    // Missions will be loaded by campaign-integration.js
    if (!this.missions) {
        this.missions = [];
    }

    console.log(`📋 Mission system initialized`);
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
    // Call the original init for basic setup
    if (this.initMissionOriginal) {
        this.initMissionOriginal.call(this);
    }

    // Initialize from mission definition
    this.currentMissionDef = this.missions && this.missions[this.currentMissionIndex];
    console.log('🎯 Setting currentMissionDef for mission', this.currentMissionIndex, ':', this.currentMissionDef);
    this.initMissionFromDefinition();

    // Track terminal hacking properly
    if (!this.missionTrackers) this.missionTrackers = {};
    this.missionTrackers.terminalsHacked = 0;
    this.missionTrackers.enemiesEliminated = 0;
    this.missionTrackers.explosivesPlanted = 0;
    this.missionTrackers.switchesActivated = 0;
    this.missionTrackers.intelCollected = 0;
};

// Save original and replace
if (!CyberOpsGame.prototype.initMissionOriginal) {
    console.log('🔄 Replacing initMission with updated version');
    CyberOpsGame.prototype.initMissionOriginal = CyberOpsGame.prototype.initMission;
    CyberOpsGame.prototype.initMission = CyberOpsGame.prototype.initMissionUpdated;
} else {
    console.log('⚠️ initMission already replaced');
}

// Update the game loop to check objectives
CyberOpsGame.prototype.updateMissionObjectives = function() {
    // Check mission objectives each frame
    this.checkMissionObjectives();

    // Check quest objectives
    this.checkQuestCompletion();

    // Update survival timers
    if (this.lastUpdateTime) {
        const deltaTime = (Date.now() - this.lastUpdateTime) / 1000;
        this.updateSurvivalTimers(deltaTime);
    }
    this.lastUpdateTime = Date.now();

    // Check if agents reached extraction point
    if (this.extractionEnabled) {
        this.checkExtractionPoint();
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
    CyberOpsGame.prototype.gameLoopOriginal = CyberOpsGame.prototype.gameLoop;
    CyberOpsGame.prototype.gameLoop = CyberOpsGame.prototype.gameLoopUpdated;
}

// Fix the hackedTerminals tracking
CyberOpsGame.prototype.performInteractionUpdated = function(agent, targetType, target) {
    // Call the new performInteraction
    this.performInteraction(agent, targetType, target);

    // Update legacy counters for backward compatibility
    switch(targetType) {
        case INTERACTION_TARGETS.TERMINAL:
            this.hackedTerminals = (this.missionTrackers.terminalsHacked || 0);
            break;
        case INTERACTION_TARGETS.EXPLOSIVE:
            this.explosivesPlanted = (this.missionTrackers.explosivesPlanted || 0);
            break;
    }
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

        // Update trackers
        if (!this.missionTrackers) this.missionTrackers = {};
        this.missionTrackers.terminalsHacked = (this.missionTrackers.terminalsHacked || 0) + 1;

        // Update legacy counter
        this.hackedTerminals = this.missionTrackers.terminalsHacked;

        console.log(`🖥️ Terminal hacked! Total: ${this.hackedTerminals}`);

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
    // Track elimination
    this.onEnemyEliminated(enemy);

    // Update legacy counter
    this.enemiesKilledThisMission = this.missionTrackers.enemiesEliminated || 0;
};

// Don't automatically reinitialize - let campaign-integration handle this
// The missions are already loaded from game-core.js and we want to preserve them
// unless explicitly using the new campaign system

console.log('✅ Mission system integration loaded');