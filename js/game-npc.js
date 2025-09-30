/**
 * NPC and Dialog System for CyberOps: Syndicate
 * Handles neutral NPCs, dialog interactions, and quest management
 */

const npcLogger = window.Logger ? new window.Logger('NPCSystem') : null;
if (npcLogger) npcLogger.debug('🚀 Loading NPC system file...');

// Initialize NPC system
CyberOpsGame.prototype.initNPCSystem = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameNpc') : null;
    }
    this.npcs = [];
    this.dialogQueue = [];
    this.quests = {}; // Keep for NPC quest definitions (dialog handled here)
    // Quest completion tracking moved to MissionService
    this.npcInteractionRange = 3; // Distance for interaction (same as hack/bomb)

    if (this.logger) this.logger.info('💬 NPC System initialized');
};

// NPC constructor function (not ES6 class)
function NPC(config) {
    this.id = config.id || 'npc_' + Date.now();
    this.name = config.name || 'Citizen';
    this.x = config.x || 0;
    this.y = config.y || 0;
    this.sprite = config.sprite || '👤';
    this.avatar = config.avatar || '🤖';
    this.color = config.color || '#00ffff';
    this.dialog = config.dialog || [];
    this.quests = config.quests || [];
    this.currentDialogIndex = 0;
    this.interacted = false;
    this.hostile = false;
    this.alive = true;
    this.facingAngle = config.facingAngle || 0;

    // Movement patterns for ambient NPCs
    this.movementType = config.movementType || 'stationary'; // stationary, patrol, wander
    this.patrolPath = config.patrolPath || [];
    this.patrolIndex = 0;
    this.moveTimer = 0;
    this.targetX = this.x;
    this.targetY = this.y;
    this.speed = config.speed || 0.05;  // Reduced to match agent speed for natural movement

    // Quest state
    this.questsGiven = new Set();
    this.questsCompleted = new Set();
    this.dialogState = 'initial'; // initial, quest_given, quest_complete, final
}

// NPC prototype methods
NPC.prototype.update = function(game) {
    if (!this.alive) return;

        // Update movement
    if (this.movementType === 'patrol' && this.patrolPath.length > 0) {
        this.updatePatrol(game);
    } else if (this.movementType === 'wander') {
        this.updateWander(game);
    }

    // Move towards target
    if (this.targetX !== this.x || this.targetY !== this.y) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
            // Calculate next position - apply game speed multiplier like agents
            const moveSpeed = this.speed * (game.gameSpeed || 1);
            var nextX = this.x + (dx / dist) * moveSpeed;
            var nextY = this.y + (dy / dist) * moveSpeed;

            // Check map boundaries
            var mapWidth = game.currentMap ? game.currentMap.width : 50;
            var mapHeight = game.currentMap ? game.currentMap.height : 50;
            nextX = Math.max(0.5, Math.min(mapWidth - 0.5, nextX));
            nextY = Math.max(0.5, Math.min(mapHeight - 0.5, nextY));

            // Check for walls - use the existing isWall check pattern
            if (!game.isWall || !game.isWall(Math.floor(nextX), Math.floor(nextY))) {
                this.x = nextX;
                this.y = nextY;
                this.facingAngle = Math.atan2(dy, dx);
            } else {
                // Stop if we hit a wall
                this.targetX = this.x;
                this.targetY = this.y;
            }
        } else {
            this.x = this.targetX;
            this.y = this.targetY;
        }
    }
};

NPC.prototype.updatePatrol = function(game) {
        if (Math.abs(this.x - this.targetX) < 0.5 && Math.abs(this.y - this.targetY) < 0.5) {
            // Reached patrol point, move to next
            this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
            const nextPoint = this.patrolPath[this.patrolIndex];
            this.targetX = nextPoint.x;
            this.targetY = nextPoint.y;
        }
    }

NPC.prototype.updateWander = function(game) {
    this.moveTimer -= game.gameSpeed;
    if (this.moveTimer <= 0) {
        // Pick a new random nearby location
        const angle = Math.random() * Math.PI * 2;
        const distance = 2 + Math.random() * 3;
        var newX = this.x + Math.cos(angle) * distance;
        var newY = this.y + Math.sin(angle) * distance;

        // Clamp to map boundaries
        var mapWidth = game.currentMap ? game.currentMap.width : 50;
        var mapHeight = game.currentMap ? game.currentMap.height : 50;
        newX = Math.max(1, Math.min(mapWidth - 1, newX));
        newY = Math.max(1, Math.min(mapHeight - 1, newY));

        // Check if the target is walkable
        if (!game.isWall || !game.isWall(Math.floor(newX), Math.floor(newY))) {
            this.targetX = newX;
            this.targetY = newY;
        } else {
            // Try again immediately if we hit a wall
            this.moveTimer = 1;
        }

        this.moveTimer = 120 + Math.random() * 180; // Wait 2-5 seconds before next move
    }
};

NPC.prototype.getNextDialog = function(game) {
        // Check for quest completion
        const completedQuest = this.checkQuestCompletion(game);
        if (completedQuest) {
            return completedQuest;
        }

        // Check for available quests
        for (let quest of this.quests) {
            if (!this.questsGiven.has(quest.id) && !game.completedQuests.has(quest.id)) {
                if (this.checkQuestRequirements(quest, game)) {
                    const npc = this;  // Capture NPC reference
                    return {
                        text: quest.introDialog || `I have a task for you, ${game.playerName || 'Agent'}.`,
                        choices: [
                            {
                                text: "Tell me more",
                                action: function(game) {
                                    npc.giveQuest(quest, game);
                                }
                            },
                            {
                                text: "Not interested",
                                action: function(game) {
                                    npc.endDialog(game);
                                }
                            }
                        ]
                    };
                }
            }
        }

        // Default dialog
        if (this.dialog && this.dialog.length > 0) {
            const dialogIndex = Math.min(this.currentDialogIndex, this.dialog.length - 1);
            return this.dialog[dialogIndex];
        }

        const npc = this;
        return {
            text: "Hello there, Agent.",
            choices: [
                { text: "Goodbye", action: function(game) { npc.endDialog(game); } }
            ]
        };
    }

NPC.prototype.checkQuestRequirements = function(quest, game) {
        if (!quest.requirements) return true;

        // Check various requirement types
        if (quest.requirements.level && game.currentMissionIndex < quest.requirements.level) {
            return false;
        }

        if (quest.requirements.items) {
            for (let item of quest.requirements.items) {
                if (!game.inventory || !game.inventory[item]) {
                    return false;
                }
            }
        }

        if (quest.requirements.prerequisiteQuests) {
            for (let questId of quest.requirements.prerequisiteQuests) {
                if (!game.completedQuests.has(questId)) {
                    return false;
                }
            }
        }

        return true;
    }

NPC.prototype.checkQuestCompletion = function(game) {
        for (let questId of this.questsGiven) {
            const quest = game.quests[questId];
            if (quest && quest.active && !game.completedQuests.has(questId) && quest.checkCompletion(game)) {
                const npc = this;
                return {
                    text: quest.completionDialog || "Well done! You've completed the task.",
                    choices: [
                        {
                            text: "Claim reward",
                            action: function(game) {
                                npc.completeQuest(quest, game);
                                // After claiming reward, show a thank you message
                                game.showDialog({
                                    npc: npc,
                                    text: "Thank you for your help! Check back later for more work.",
                                    choices: [
                                        {
                                            text: "You're welcome",
                                            action: function(game) {
                                                npc.endDialog(game);
                                            }
                                        }
                                    ]
                                });
                            }
                        }
                    ]
                };
            }
        }
        return null;
    }

NPC.prototype.giveQuest = function(quest, game) {
        // USE QUEST SERVICE - REQUIRED
        if (!window.GameServices || !window.GameServices.questService) {
            if (game.logger) game.logger.error('QuestService not available!');
            return;
        }

        // Register quest with QuestService
        window.GameServices.questService.registerQuest({
            id: quest.id,
            name: quest.name,
            description: quest.description,
            type: quest.type || 'side',
            giver: this.id,
            objectives: quest.objectives || [{
                id: `${quest.id}_main`,
                type: 'custom',
                description: quest.description
            }],
            rewards: quest.reward || quest.rewards || {},
            prerequisites: quest.requirements || []
        });

        // Start the quest
        window.GameServices.questService.startQuest(quest.id);

        // Track that this NPC gave the quest
        this.questsGiven.add(quest.id);

        // Also keep in old system for now for UI compatibility
        game.quests[quest.id] = quest;
        quest.active = true;

        // Use introDialog if available, otherwise use description
        const questText = quest.introDialog || quest.description || `I have a task for you: ${quest.name}`;

        const npc = this;  // Capture NPC reference
        game.showDialog({
            npc: this,
            text: questText,
            choices: [
                {
                    text: "I'll do it",
                    action: function(gameInstance) {
                        gameInstance.addNotification(`📜 New Quest: ${quest.name}`);
                        if (gameInstance.logEvent) {
                            gameInstance.logEvent(`Quest accepted: ${quest.name} from ${npc.name}`, 'quest', true);
                        }
                        npc.endDialog(gameInstance);
                    }
                },
                {
                    text: "Not right now",
                    action: function(gameInstance) {
                        npc.endDialog(gameInstance);
                    }
                }
            ]
        });
    }

NPC.prototype.completeQuest = function(quest, game) {
        game.completedQuests.add(quest.id);
        quest.active = false;
        quest.completed = true;
        quest.rewardClaimed = true;

        // Give rewards through ResourceService
        if (quest.rewards) {
            if (quest.rewards.credits) {
                window.GameServices.resourceService.add('credits', quest.rewards.credits, `quest: ${quest.id}`);
                game.addNotification(`💰 +${quest.rewards.credits} credits`);
            }

            if (quest.rewards.researchPoints) {
                window.GameServices.resourceService.add('researchPoints', quest.rewards.researchPoints, `quest: ${quest.id}`);
                game.addNotification(`🔬 +${quest.rewards.researchPoints} RP`);
            }

            // Distribute XP to all active agents
            if (quest.rewards.experience || quest.rewards.xp) {
                const xpReward = quest.rewards.experience || quest.rewards.xp;

                // Give XP to all agents in the mission
                if (game.agents && game.agents.length > 0) {
                    const xpPerAgent = Math.floor(xpReward / game.agents.length);

                    game.agents.forEach(agent => {
                        if (agent.rpgEntity && agent.health > 0) {
                            // Add experience directly to the rpgEntity
                            if (typeof agent.rpgEntity.addExperience === 'function') {
                                agent.rpgEntity.addExperience(xpPerAgent);
                            } else {
                                // Fallback: directly add to experience property
                                agent.rpgEntity.experience = (agent.rpgEntity.experience || 0) + xpPerAgent;
                                agent.rpgEntity.totalExperience = (agent.rpgEntity.totalExperience || 0) + xpPerAgent;
                            }
                            game.addNotification(`⭐ ${agent.name} gained ${xpPerAgent} XP`);

                            // Check for level up
                            const levelBefore = agent.rpgEntity.level || 1;
                            if (agent.rpgEntity.checkLevelUp) {
                                agent.rpgEntity.checkLevelUp();
                                if (agent.rpgEntity.level > levelBefore) {
                                    game.addNotification(`🎉 ${agent.name} reached level ${agent.rpgEntity.level}!`);
                                }
                            }
                        }
                    });
                } else {
                    // Fallback: add to global experience
                    game.experience = (game.experience || 0) + xpReward;
                    game.addNotification(`⭐ +${xpReward} XP`);
                }
            }

            if (quest.rewards.items) {
                game.inventory = game.inventory || {};
                for (let item of quest.rewards.items) {
                    game.inventory[item] = (game.inventory[item] || 0) + 1;
                    game.addNotification(`📦 Received: ${item}`);
                }
            }
        }

        this.dialogState = 'quest_complete';
        this.endDialog(game);
    }

NPC.prototype.endDialog = function(game) {
        game.closeNPCDialog();
        this.interacted = true;
        this.currentDialogIndex++;
    };

// Quest constructor function (not ES6 class)
function Quest(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.introDialog = config.introDialog;
    this.completionDialog = config.completionDialog;
    this.objectives = config.objectives || [];
    this.requirements = config.requirements || {};
    this.rewards = config.rewards || {};
    this.active = false;
    this.progress = {};

    // Initialize objective progress
    var self = this;
    this.objectives.forEach(function(obj) {
        self.progress[obj.id] = 0;
    });
}

Quest.prototype.checkCompletion = function(game) {
    for (var i = 0; i < this.objectives.length; i++) {
        if (!this.checkObjective(this.objectives[i], game)) {
            return false;
        }
    }
    return true;
};

Quest.prototype.checkObjective = function(objective, game) {
        switch(objective.type) {
            case 'kill':
                return (game.enemiesKilledThisMission || 0) >= objective.count;

            case 'collect':
                return game.inventory && game.inventory[objective.item] >= objective.count;

            case 'reach':
                if (!game.agents || game.agents.length === 0) return false;

                // Check if ANY agent is close to the objective
                for (let agent of game.agents) {
                    if (agent.alive) {
                        const dist = Math.sqrt(
                            Math.pow(agent.x - objective.x, 2) +
                            Math.pow(agent.y - objective.y, 2)
                        );
                        if (dist < 2) {
                            return true;  // Any agent reached the location
                        }
                    }
                }
                return false;

            case 'hack':
                // Check terminals hacked through MissionService
                if (game.gameServices && game.gameServices.missionService) {
                    const terminalsHacked = game.gameServices.missionService.trackers.terminalsHacked || 0;
                    return terminalsHacked >= (objective.count || 1);
                }
                return false;

            case 'interact':
                // Check for terminal hacking
                if (objective.targetId && objective.targetId.includes('terminal')) {
                    // Check if this specific terminal is hacked
                    if (game.terminals) {
                        const terminal = game.terminals.find(t =>
                            t.id === objective.targetId ||
                            (t.x === objective.x && t.y === objective.y)
                        );
                        return terminal && terminal.hacked;
                    }
                    return false; // No terminal hacked
                }
                return game.npcInteractions && game.npcInteractions.has(objective.npcId);

            case 'survive':
                return game.missionTimer >= objective.time;

            default:
                return false;
        }
    };

Quest.prototype.getProgressString = function(game) {
    var parts = [];
    for (var i = 0; i < this.objectives.length; i++) {
        var objective = this.objectives[i];
        var completed = this.checkObjective(objective, game);
        var icon = completed ? '✅' : '⬜';
        parts.push(icon + ' ' + objective.description);
    }
    return parts.join('\n');
};

// Find a valid spawn position near the desired location
CyberOpsGame.prototype.findValidSpawnPosition = function(desiredX, desiredY) {
    // First check if desired position is valid
    if (!this.isWall || !this.isWall(Math.floor(desiredX), Math.floor(desiredY))) {
        return { x: desiredX, y: desiredY };
    }

    // Search in expanding circles for a valid position
    for (let radius = 1; radius <= 5; radius++) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const testX = desiredX + Math.cos(angle) * radius;
            const testY = desiredY + Math.sin(angle) * radius;

            // Check map bounds
            const mapWidth = this.currentMap ? this.currentMap.width : 50;
            const mapHeight = this.currentMap ? this.currentMap.height : 50;

            if (testX >= 1 && testX < mapWidth - 1 &&
                testY >= 1 && testY < mapHeight - 1) {
                // Check if position is not a wall
                if (!this.isWall || !this.isWall(Math.floor(testX), Math.floor(testY))) {
                    if (this.logger) this.logger.debug(`📍 Adjusted NPC spawn from (${desiredX},${desiredY}) to (${testX},${testY})`);
                    return { x: testX, y: testY };
                }
            }
        }
    }

    // Must have valid spawn position from map
    throw new Error(`No valid spawn position found near (${desiredX},${desiredY}). Check map definition.`);
};

// Add NPCs to the current map
CyberOpsGame.prototype.spawnNPCs = function() {
    if (!this.npcs) this.npcs = [];

    // Clear existing NPCs
    this.npcs = [];

    // Get NPCs for current mission/map
    const npcConfigs = this.getNPCsForMission(this.currentMissionIndex);

    for (let config of npcConfigs) {
        // Validate and adjust spawn position if needed
        const validPos = this.findValidSpawnPosition(config.x, config.y);
        config.x = validPos.x;
        config.y = validPos.y;

        const npc = new NPC(config);
        this.npcs.push(npc);
    }

    if (this.logger) this.logger.debug(`👥 Spawned ${this.npcs.length} NPCs for mission ${this.currentMissionIndex + 1}`);

    // Debug: Log NPC positions
    this.npcs.forEach(npc => {
        if (this.logger) this.logger.debug(`  - ${npc.name} at (${npc.x}, ${npc.y}) - ${npc.sprite}`);
    });
};

// Create NPC from mission definition
CyberOpsGame.prototype.createNPCFromDefinition = function(npcDef) {
    // Get templates from campaign if available
    const campaignId = this.currentCampaignId || 'main';
    const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES && window.CAMPAIGN_NPC_TEMPLATES[campaignId];

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
                quests.push(new Quest(questData));
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
};

// Get NPC configurations for each mission
CyberOpsGame.prototype.getNPCsForMission = function(missionIndex) {
    const configs = [];

    // Only use NPCs from mission definition
    if (this.currentMissionDef && this.currentMissionDef.npcs) {
        if (this.logger) this.logger.debug('📋 Loading NPCs from mission definition');
        this.currentMissionDef.npcs.forEach(npcDef => {
            const npcConfig = this.createNPCFromDefinition(npcDef);
            if (npcConfig) {
                configs.push(npcConfig);
            }
        });
    }

    // NPCs must come from mission files
    return configs;
};

// Check for nearby NPCs that can be interacted with
CyberOpsGame.prototype.getNearbyNPC = function(agent) {
    if (!this.npcs) {
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
};

// Interact with an NPC
CyberOpsGame.prototype.interactWithNPC = function(agent, npc) {
    if (!npc || !npc.alive) return;

    if (this.logger) this.logger.debug(`💬 Agent interacting with NPC: ${npc.name}`);

    // Face the NPC
    const dx = npc.x - agent.x;
    const dy = npc.y - agent.y;
    agent.facingAngle = Math.atan2(dy, dx);
    npc.facingAngle = Math.atan2(-dy, -dx);

    // Get dialog
    const dialog = npc.getNextDialog(this);

    // Debug: Check what dialog was returned
    if (this.logger) this.logger.debug('Dialog returned from getNextDialog:', dialog);
    if (!dialog.text) {
        if (this.logger) this.logger.warn('⚠️ Dialog has no text! Dialog object:', dialog);
    }

    // Add context-sensitive options based on nearby objects
    const contextChoices = this.getContextualChoices(agent, npc);

    // Combine NPC dialog choices with context choices
    const allChoices = [...(dialog.choices || [])];

    // Add context choices at the end
    if (contextChoices.length > 0) {
        // Add separator if there are existing choices
        if (allChoices.length > 0) {
            // Context choices go after NPC-specific choices
            contextChoices.forEach(choice => {
                allChoices.push(choice);
            });
        } else {
            // If no NPC choices, just use context choices
            allChoices.push(...contextChoices);
        }
    }

    // Always add a goodbye option at the end
    if (!allChoices.find(c => c.text === "Goodbye" || c.text === "Leave")) {
        const game = this;  // Capture game reference
        allChoices.push({
            text: "Goodbye",
            action: function() {
                // Use npc.endDialog with proper context
                npc.endDialog(game);
            }
        });
    }

    // Show dialog UI
    this.showDialog({
        npc: npc,
        text: dialog.text,
        choices: allChoices
    });

    // Track interaction
    this.npcInteractions = this.npcInteractions || new Set();
    this.npcInteractions.add(npc.id);
};

// Get contextual dialog choices based on nearby objects
CyberOpsGame.prototype.getContextualChoices = function(agent, npc) {
    const choices = [];

    // Check for nearby terminals
    if (this.terminals) {
        for (let terminal of this.terminals) {
            const dist = Math.sqrt(
                Math.pow(terminal.x - npc.x, 2) +
                Math.pow(terminal.y - npc.y, 2)
            );

            // If terminal is within 3 units of NPC
            if (dist <= 3 && !terminal.hacked) {
                choices.push({
                    text: "🖥️ Hack the nearby terminal",
                    action: function(game) {
                        // Close dialog first
                        game.closeNPCDialog();

                        // Move agent to terminal and hack it
                        agent.targetX = terminal.x;
                        agent.targetY = terminal.y;

                        // Set a flag to auto-hack when agent reaches terminal
                        agent.autoHackTarget = terminal;

                        game.addNotification("📍 Moving to terminal...");
                    }
                });
                break; // Only add one terminal option
            }
        }
    }

    // Check for nearby explosive targets
    if (this.explosiveTargets) {
        for (let target of this.explosiveTargets) {
            const dist = Math.sqrt(
                Math.pow(target.x - npc.x, 2) +
                Math.pow(target.y - npc.y, 2)
            );

            // If explosive target is within 3 units of NPC
            if (dist <= 3 && !target.destroyed) {
                choices.push({
                    text: "💣 Plant bomb on nearby target",
                    action: function(game) {
                        // Close dialog first
                        game.closeNPCDialog();

                        // Move agent to target and plant bomb
                        agent.targetX = target.x;
                        agent.targetY = target.y;

                        // Set a flag to auto-bomb when agent reaches target
                        agent.autoBombTarget = target;

                        game.addNotification("📍 Moving to plant explosive...");
                    }
                });
                break; // Only add one bomb option
            }
        }
    }

    // Check for nearby enemies
    let nearbyEnemies = 0;
    if (this.enemies) {
        for (let enemy of this.enemies) {
            if (!enemy.alive) continue;

            const dist = Math.sqrt(
                Math.pow(enemy.x - npc.x, 2) +
                Math.pow(enemy.y - npc.y, 2)
            );

            if (dist <= 5) {
                nearbyEnemies++;
            }
        }

        if (nearbyEnemies > 0) {
            choices.push({
                text: `⚠️ Ask about the ${nearbyEnemies} guard${nearbyEnemies > 1 ? 's' : ''} nearby`,
                action: function(game) {
                    game.showDialog({
                        npc: npc,
                        text: nearbyEnemies > 1 ?
                            "Those guards? They patrol this area regularly. Be careful - they shoot on sight!" :
                            "That guard? He's been here all day. Very trigger-happy, I'd avoid him.",
                        choices: [
                            {
                                text: "Thanks for the warning",
                                action: function(game) {
                                    // Go back to main dialog
                                    game.interactWithNPC(agent, npc);
                                }
                            }
                        ]
                    });
                }
            });
        }
    }

    return choices;
};

// Show dialog UI - Using Modal Engine
CyberOpsGame.prototype.showDialog = function(dialogData) {
    // Pause the game during dialog
    this.dialogActive = true;
    this.pauseGame();

    // Modal engine is required
    if (!window.modalEngine) {
        if (this.logger) this.logger.error('Modal engine not available!');
        return;
    }
        // Close any existing NPC dialog before showing new one
        if (this.activeNPCModal) {
            this.closeNPCDialog();
        }

        // Convert choices to modal engine format
        const modalChoices = dialogData.choices ? dialogData.choices.map((choice, index) => {
            return {
                text: choice.text,
                action: () => {
                    if (choice.action) {
                        // Call action with NPC as context and game as parameter (matching original system)
                        choice.action.call(dialogData.npc, this);
                    }
                },
                closeAfter: false  // We handle closing manually
            };
        }) : [];

        // Create NPC dialog with modal engine
        this.activeNPCModal = window.modalEngine.show({
            type: 'npc',
            position: 'bottom',
            avatar: dialogData.npc.avatar || '👤',
            name: dialogData.npc.name,
            text: dialogData.text,
            choices: modalChoices,
            closeButton: true,
            backdrop: true,
            closeOnBackdrop: false,
            onClose: () => {
                // Don't set activeNPCModal = null here, it's handled in closeNPCDialog
                this.dialogActive = false;
                this.resumeGame();
            }
        });
};

// Check if an objective is complete
CyberOpsGame.prototype.checkObjectiveComplete = function(obj) {
    if (!obj) return false;

    // Handle new objective format from MISSION_DEFINITIONS
    if (typeof OBJECTIVE_TYPES !== 'undefined') {
        switch(obj.type) {
            case OBJECTIVE_TYPES.INTERACT:
                // Check through MissionService if available
                if (this.gameServices && this.gameServices.missionService) {
                    // Check if this specific object has been interacted with
                    const objId = obj.target?.id || obj.tracker;
                    if (objId && this.gameServices.missionService.interactedObjects.has(objId)) {
                        return true;
                    }
                    // Check interaction count if using a tracker
                    if (obj.tracker) {
                        const tracker = this.gameServices.missionService.trackers[obj.tracker] || 0;
                        const required = obj.count || 1;
                        return tracker >= required;
                    }
                }
                return false;

            case OBJECTIVE_TYPES.ELIMINATE:
                // Check through MissionService if available
                if (this.gameServices && this.gameServices.missionService) {
                    const tracker = this.gameServices.missionService.trackers.enemiesEliminated || 0;
                    return tracker >= (obj.count || 1);
                }
                // Fallback for quest system
                if (obj.target === 'all') {
                    return false; // Let MissionService handle this
                }
                return false;

            case OBJECTIVE_TYPES.REACH:
                if (obj.target === 'extraction') {
                    return this.missionComplete || false;
                }
                return false;

            case OBJECTIVE_TYPES.SURVIVE:
                const survivalTime = obj.duration || obj.time || 0;
                return this.missionTimer >= survivalTime;

            case OBJECTIVE_TYPES.COLLECT:
                // Check through MissionService if available
                if (this.gameServices && this.gameServices.missionService) {
                    const tracker = this.gameServices.missionService.trackers.itemsCollected || 0;
                    return tracker >= (obj.count || 1);
                }
                return false;

            case OBJECTIVE_TYPES.CUSTOM:
                if (obj.checkFunction && this[obj.checkFunction]) {
                    return this[obj.checkFunction](obj);
                }
                return false;
        }
    }

    // Check objective type
    switch(obj.type) {
        case 'hack':
            // Check through MissionService
            if (this.gameServices && this.gameServices.missionService) {
                return this.gameServices.missionService.trackers.terminalsHacked >= (obj.count || 1);
            }
            return false;

        case 'eliminate_all':
            // Check through MissionService
            if (this.gameServices && this.gameServices.missionService) {
                return this.gameServices.missionService.trackers.enemiesEliminated >= (obj.count || this.totalEnemiesInMission);
            }
            return false;

        case 'reach_extraction':
        case 'extract':
            return this.missionComplete || false;

        case 'survive':
            return this.missionTimer >= (obj.time || 0);

        case 'collect':
            return this.inventory && this.inventory[obj.item] >= (obj.count || 1);

        default:
            return false;
    }
};

// Show mission progress screen (uses same comprehensive system as completion modal)
CyberOpsGame.prototype.showMissionList = function() {
    if (this.logger) this.logger.debug('📜 Showing mission progress');

    // Use declarative dialog system
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('mission-progress');
        return;
    }

    // No fallback - declarative system is required
    if (this.logger) this.logger.error('❌ DeclarativeDialogEngine is required for mission progress dialog');
};

// Close dialog
// Close NPC dialog specifically - Now works with Modal Engine
CyberOpsGame.prototype.closeNPCDialog = function() {
    // Close modal engine dialog if exists
    if (this.activeNPCModal) {
        const modalToClose = this.activeNPCModal;
        this.activeNPCModal = null;  // Clear reference immediately
        modalToClose.close();  // But close the actual modal
    }

    this.dialogActive = false;
    this.resumeGame();
};

// Update NPCs
CyberOpsGame.prototype.updateNPCs = function() {
    if (!this.npcs) return;

    for (let npc of this.npcs) {
        npc.update(this);
    }
};

// Render quest objective markers
CyberOpsGame.prototype.renderQuestMarkers = function(ctx) {
    if (!this.quests) return;

    // Check all active quests for location objectives
    for (let questId in this.quests) {
        const quest = this.quests[questId];
        if (!quest.active) continue;

        quest.objectives.forEach(obj => {
            // Render markers for reach objectives
            if (obj.type === 'reach' && obj.x !== undefined && obj.y !== undefined) {
                // Skip rendering if in fog and location is unexplored
                if (this.fogEnabled && this.fogOfWar) {
                    const tileX = Math.floor(obj.x);
                    const tileY = Math.floor(obj.y);
                    if (this.fogOfWar[tileY] && this.fogOfWar[tileY][tileX] === 0) {
                        return; // Don't render in unexplored areas
                    }
                }

                // Use the same coordinate conversion as agents and NPCs
                const screenPos = this.worldToIsometric(obj.x, obj.y);

                // Check if on screen
                if (screenPos.x < -50 || screenPos.x > this.canvas.width + 50 ||
                    screenPos.y < -50 || screenPos.y > this.canvas.height + 50) {
                    return;
                }

                ctx.save();
                ctx.translate(screenPos.x, screenPos.y);

                // Draw pulsing marker
                const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;

                // Outer circle
                ctx.strokeStyle = `rgba(255, 255, 0, ${pulse})`;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.stroke();

                // Inner circle
                ctx.fillStyle = `rgba(255, 255, 0, ${pulse * 0.3})`;
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();

                // Objective icon
                ctx.fillStyle = `rgba(255, 255, 0, ${pulse})`;
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('!', 0, 0);

                // Description
                ctx.font = '10px Arial';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(obj.description || 'Objective', 0, 30);

                ctx.restore();
            }

            // Render markers for interact objectives (terminals, etc)
            if (obj.type === 'interact' && obj.targetId) {
                // Look for the target in the map (you might need to store these positions)
                // For now, we'll skip this as it requires more map data
            }
        });
    }
};

// Render quest list in HUD
CyberOpsGame.prototype.renderQuestHUD = function(ctx) {
    if (!this.quests || Object.keys(this.quests).length === 0) return;

    const questList = [];
    for (let questId in this.quests) {
        const quest = this.quests[questId];
        if (quest.active) {
            questList.push(quest);
        }
    }

    if (questList.length === 0) return;

    // Draw quest panel
    const panelX = 10;
    const panelY = 150;
    const panelWidth = 250;
    const lineHeight = 18;

    ctx.save();

    // Panel background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;

    let totalHeight = 30 + questList.length * 60; // Approximate height
    ctx.fillRect(panelX, panelY, panelWidth, totalHeight);
    ctx.strokeRect(panelX, panelY, panelWidth, totalHeight);

    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('📜 ACTIVE MISSIONS', panelX + 10, panelY + 20);

    let yOffset = panelY + 40;

    // List each quest
    questList.forEach(quest => {
        // Quest name
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px Courier New';
        ctx.fillText('▸ ' + quest.name, panelX + 10, yOffset);
        yOffset += lineHeight;

        // Quest objectives
        quest.objectives.forEach(obj => {
            const completed = quest.checkObjective ? quest.checkObjective(obj, this) : false;
            const icon = completed ? '✓' : '○';
            const color = completed ? '#00ff00' : '#aaaaaa';

            ctx.fillStyle = color;
            ctx.font = '11px Courier New';
            ctx.fillText('  ' + icon + ' ' + obj.description, panelX + 15, yOffset);
            yOffset += lineHeight;
        });

        yOffset += 10; // Space between quests
    });

    ctx.restore();
};

// Render NPCs
CyberOpsGame.prototype.renderNPCs = function(ctx) {
    if (!this.npcs) return;

    // Render quest objective markers first
    this.renderQuestMarkers(ctx);

    for (let npc of this.npcs) {
        if (!npc.alive) continue;

        // Skip rendering if in fog and location is unexplored
        if (this.fogEnabled && this.fogOfWar) {
            const tileX = Math.floor(npc.x);
            const tileY = Math.floor(npc.y);
            if (this.fogOfWar[tileY] && this.fogOfWar[tileY][tileX] === 0) {
                continue; // Don't render in unexplored areas
            }
        }

        // Use the same coordinate conversion as agents (worldToIsometric for 2D view)
        const screenPos = this.worldToIsometric(npc.x, npc.y);

        // Check if on screen
        if (screenPos.x < -50 || screenPos.x > this.canvas.width + 50 ||
            screenPos.y < -50 || screenPos.y > this.canvas.height + 50) {
            continue;
        }

        // Draw NPC
        ctx.save();
        ctx.translate(screenPos.x, screenPos.y);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, 10, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw NPC sprite
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(npc.sprite, 0, -5);

        // Draw name
        ctx.font = '10px Arial';
        ctx.fillStyle = npc.color;
        ctx.fillText(npc.name, 0, -25);

        // Draw interaction indicator if nearby
        const agent = this.agents[0];
        if (agent) {
            const dist = Math.sqrt(
                Math.pow(npc.x - agent.x, 2) +
                Math.pow(npc.y - agent.y, 2)
            );

            if (dist <= this.npcInteractionRange) {
                // Pulsing interaction indicator
                const pulse = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
                ctx.fillStyle = `rgba(0,255,255,${pulse})`;
                ctx.font = '16px Arial';
                ctx.fillText('H', 0, -40);

                // Draw interaction prompt
                ctx.fillStyle = '#00ffff';
                ctx.font = '10px Arial';
                ctx.fillText('[H] Talk', 0, -50);
            }
        }

        // Draw quest indicator with enhanced visuals
        if (npc.quests && npc.quests.length > 0) {
            let questIndicator = null;
            let indicatorColor = null;
            let hasAvailableQuest = false;
            let hasCompletedQuest = false;
            let hasInProgressQuest = false;

            // Check quest status
            for (let quest of npc.quests) {
                // Skip quests that have been completed and rewards claimed
                if (quest.rewardClaimed) {
                    continue;
                }

                if (!npc.questsGiven.has(quest.id) && !this.completedQuests.has(quest.id)) {
                    if (npc.checkQuestRequirements(quest, this)) {
                        hasAvailableQuest = true;
                    }
                } else if (npc.questsGiven.has(quest.id)) {
                    // Quest was given, check if complete
                    if (quest.checkCompletion && quest.checkCompletion(this)) {
                        hasCompletedQuest = true;
                    } else {
                        hasInProgressQuest = true;
                    }
                }
            }

            // Determine indicator based on priority: completed > available > in progress
            if (hasCompletedQuest) {
                // Quest ready to turn in - golden question mark
                questIndicator = '❓';
                indicatorColor = '#ffd700';
            } else if (hasAvailableQuest) {
                // Quest available - yellow exclamation
                questIndicator = '❗';
                indicatorColor = '#ffff00';
            } else if (hasInProgressQuest) {
                // Quest in progress - grey question mark
                questIndicator = '❓';
                indicatorColor = '#888888';
            }

            // Draw the indicator with animation
            if (questIndicator) {
                ctx.save();
                // Animated bobbing effect
                const bobOffset = Math.sin(Date.now() * 0.003) * 3;

                // Position above NPC head
                ctx.translate(0, -40 + bobOffset);

                // Draw glow effect
                ctx.shadowColor = indicatorColor;
                ctx.shadowBlur = 10;
                ctx.font = 'bold 24px Arial';
                ctx.fillStyle = indicatorColor;
                ctx.textAlign = 'center';
                ctx.fillText(questIndicator, 0, 0);

                // Draw again without shadow for clearer visibility
                ctx.shadowBlur = 0;
                ctx.fillText(questIndicator, 0, 0);
                ctx.restore();
            }
        }

        ctx.restore();
    }
};

// Add notification system for quest updates
CyberOpsGame.prototype.addNotification = function(text) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 10px 20px;
        background: linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,50,50,0.9) 100%);
        border: 1px solid #00ffff;
        border-radius: 5px;
        color: #fff;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        z-index: 9999;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = text;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .cursor {
        animation: blink 1s infinite;
    }
    @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Pause and resume game functions
CyberOpsGame.prototype.pauseGame = function() {
    if (!this.gamePaused) {
        this.gamePaused = true;
        this.lastPauseTime = Date.now();
    }
};

CyberOpsGame.prototype.resumeGame = function() {
    if (this.gamePaused) {
        this.gamePaused = false;
        const pauseDuration = Date.now() - this.lastPauseTime;
        // Adjust timers if needed
    }
};

if (this.logger) this.logger.info('💬 NPC System loaded successfully');