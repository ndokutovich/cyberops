/**
 * NPC and Dialog System for CyberOps: Syndicate
 * Handles neutral NPCs, dialog interactions, and quest management
 */

// Initialize NPC system
CyberOpsGame.prototype.initNPCSystem = function() {
    this.npcs = [];
    this.activeDialog = null;
    this.dialogQueue = [];
    this.quests = {};
    this.completedQuests = new Set();
    this.npcInteractionRange = 2.5; // Distance for interaction

    console.log('💬 NPC System initialized');
};

// NPC class definition
class NPC {
    constructor(config) {
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
        this.speed = config.speed || 0.5;

        // Quest state
        this.questsGiven = new Set();
        this.dialogState = 'initial'; // initial, quest_given, quest_complete, final
    }

    update(game) {
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
                this.x += (dx / dist) * this.speed * game.gameSpeed;
                this.y += (dy / dist) * this.speed * game.gameSpeed;
                this.facingAngle = Math.atan2(dy, dx);
            } else {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }
    }

    updatePatrol(game) {
        if (Math.abs(this.x - this.targetX) < 0.5 && Math.abs(this.y - this.targetY) < 0.5) {
            // Reached patrol point, move to next
            this.patrolIndex = (this.patrolIndex + 1) % this.patrolPath.length;
            const nextPoint = this.patrolPath[this.patrolIndex];
            this.targetX = nextPoint.x;
            this.targetY = nextPoint.y;
        }
    }

    updateWander(game) {
        this.moveTimer -= game.gameSpeed;
        if (this.moveTimer <= 0) {
            // Pick a new random nearby location
            const angle = Math.random() * Math.PI * 2;
            const distance = 2 + Math.random() * 3;
            this.targetX = this.x + Math.cos(angle) * distance;
            this.targetY = this.y + Math.sin(angle) * distance;
            this.moveTimer = 120 + Math.random() * 180; // Wait 2-5 seconds before next move
        }
    }

    getNextDialog(game) {
        // Check for quest completion
        const completedQuest = this.checkQuestCompletion(game);
        if (completedQuest) {
            return completedQuest;
        }

        // Check for available quests
        for (let quest of this.quests) {
            if (!this.questsGiven.has(quest.id) && !game.completedQuests.has(quest.id)) {
                if (this.checkQuestRequirements(quest, game)) {
                    return {
                        text: quest.introDialog || `I have a task for you, ${game.playerName || 'Agent'}.`,
                        choices: [
                            {
                                text: "Tell me more",
                                action: () => this.giveQuest(quest, game)
                            },
                            {
                                text: "Not interested",
                                action: () => this.endDialog(game)
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

        return {
            text: "Hello there, Agent.",
            choices: [
                { text: "Goodbye", action: () => this.endDialog(game) }
            ]
        };
    }

    checkQuestRequirements(quest, game) {
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

    checkQuestCompletion(game) {
        for (let questId of this.questsGiven) {
            const quest = game.quests[questId];
            if (quest && quest.checkCompletion(game)) {
                return {
                    text: quest.completionDialog || "Well done! You've completed the task.",
                    choices: [
                        {
                            text: "Claim reward",
                            action: () => this.completeQuest(quest, game)
                        }
                    ]
                };
            }
        }
        return null;
    }

    giveQuest(quest, game) {
        this.questsGiven.add(quest.id);
        game.quests[quest.id] = quest;
        quest.active = true;

        game.showDialog({
            npc: this,
            text: quest.description,
            choices: [
                {
                    text: "I'll do it",
                    action: () => {
                        game.addNotification(`📜 New Quest: ${quest.name}`);
                        this.endDialog(game);
                    }
                }
            ]
        });
    }

    completeQuest(quest, game) {
        game.completedQuests.add(quest.id);
        quest.active = false;

        // Give rewards
        if (quest.rewards) {
            if (quest.rewards.credits) {
                game.credits = (game.credits || 0) + quest.rewards.credits;
                game.addNotification(`💰 +${quest.rewards.credits} credits`);
            }

            if (quest.rewards.researchPoints) {
                game.researchPoints = (game.researchPoints || 0) + quest.rewards.researchPoints;
                game.addNotification(`🔬 +${quest.rewards.researchPoints} RP`);
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

    endDialog(game) {
        game.closeDialog();
        this.interacted = true;
        this.currentDialogIndex++;
    }
}

// Quest class
class Quest {
    constructor(config) {
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
        this.objectives.forEach(obj => {
            this.progress[obj.id] = 0;
        });
    }

    checkCompletion(game) {
        for (let objective of this.objectives) {
            if (!this.checkObjective(objective, game)) {
                return false;
            }
        }
        return true;
    }

    checkObjective(objective, game) {
        switch(objective.type) {
            case 'kill':
                return (game.enemiesKilledThisMission || 0) >= objective.count;

            case 'collect':
                return game.inventory && game.inventory[objective.item] >= objective.count;

            case 'reach':
                const agent = game.agents[0];
                if (!agent) return false;
                const dist = Math.sqrt(
                    Math.pow(agent.x - objective.x, 2) +
                    Math.pow(agent.y - objective.y, 2)
                );
                return dist < 2;

            case 'interact':
                return game.npcInteractions && game.npcInteractions.has(objective.npcId);

            case 'survive':
                return game.missionTimer >= objective.time;

            default:
                return false;
        }
    }

    getProgressString(game) {
        const parts = [];
        for (let objective of this.objectives) {
            const completed = this.checkObjective(objective, game);
            const icon = completed ? '✅' : '⬜';
            parts.push(`${icon} ${objective.description}`);
        }
        return parts.join('\\n');
    }
}

// Add NPCs to the current map
CyberOpsGame.prototype.spawnNPCs = function() {
    if (!this.npcs) this.npcs = [];

    // Clear existing NPCs
    this.npcs = [];

    // Get NPCs for current mission/map
    const npcConfigs = this.getNPCsForMission(this.currentMissionIndex);

    for (let config of npcConfigs) {
        const npc = new NPC(config);
        this.npcs.push(npc);
    }

    console.log(`👥 Spawned ${this.npcs.length} NPCs for mission ${this.currentMissionIndex + 1}`);
};

// Get NPC configurations for each mission
CyberOpsGame.prototype.getNPCsForMission = function(missionIndex) {
    const configs = [];

    switch(missionIndex) {
        case 0: // Mission 1 - Corporate
            configs.push({
                id: 'informant_1',
                name: 'Data Broker',
                x: 15,
                y: 15,
                sprite: '🕵️',
                avatar: '🕵️',
                color: '#00ff00',
                movementType: 'stationary',
                dialog: [
                    {
                        text: "I've been monitoring corporate communications. They're hiding something big.",
                        choices: [
                            { text: "What kind of information?", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "Security protocols, guard rotations... for the right price.",
                                    choices: [
                                        { text: "How much?", action: function(game) {
                                            if (game.credits >= 100) {
                                                game.credits -= 100;
                                                game.addNotification("💰 -100 credits");
                                                game.addNotification("📍 Guard positions revealed!");
                                                game.revealEnemyPositions = true;
                                                this.endDialog(game);
                                            } else {
                                                game.showDialog({
                                                    npc: this,
                                                    text: "Come back when you have 100 credits.",
                                                    choices: [{ text: "I'll be back", action: () => this.endDialog(game) }]
                                                });
                                            }
                                        }},
                                        { text: "Too expensive", action: () => this.endDialog(game) }
                                    ]
                                });
                            }},
                            { text: "Not interested", action: () => this.endDialog(game) }
                        ]
                    }
                ],
                quests: [
                    new Quest({
                        id: 'corp_sabotage',
                        name: 'Corporate Sabotage',
                        description: 'Hack 3 terminals to disrupt their operations.',
                        introDialog: 'The corporation has been exploiting workers. Help me teach them a lesson.',
                        completionDialog: 'Excellent work! Their systems are in chaos.',
                        objectives: [
                            { id: 'hack1', type: 'interact', description: 'Hack terminal 1', targetId: 'terminal_1' },
                            { id: 'hack2', type: 'interact', description: 'Hack terminal 2', targetId: 'terminal_2' },
                            { id: 'hack3', type: 'interact', description: 'Hack terminal 3', targetId: 'terminal_3' }
                        ],
                        rewards: { credits: 500, researchPoints: 50 }
                    })
                ]
            });

            configs.push({
                id: 'janitor_1',
                name: 'Maintenance Worker',
                x: 25,
                y: 20,
                sprite: '🧹',
                avatar: '👷',
                color: '#ffff00',
                movementType: 'patrol',
                patrolPath: [
                    { x: 25, y: 20 },
                    { x: 30, y: 20 },
                    { x: 30, y: 25 },
                    { x: 25, y: 25 }
                ],
                dialog: [
                    {
                        text: "Been working here 20 years... seen things you wouldn't believe.",
                        choices: [
                            { text: "Like what?", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "Secret meetings, black ops teams... There's a hidden passage in the east wing.",
                                    choices: [
                                        { text: "Thanks for the tip", action: () => {
                                            game.addNotification("🗺️ Secret passage location marked!");
                                            this.endDialog(game);
                                        }}
                                    ]
                                });
                            }},
                            { text: "Stay safe", action: () => this.endDialog(game) }
                        ]
                    }
                ]
            });
            break;

        case 1: // Mission 2 - Government
            configs.push({
                id: 'hacker_1',
                name: 'Underground Hacker',
                x: 20,
                y: 10,
                sprite: '💻',
                avatar: '🤓',
                color: '#ff00ff',
                movementType: 'stationary',
                dialog: [
                    {
                        text: "The government's firewall... it's not as strong as they think.",
                        choices: [
                            { text: "Can you help me get in?", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "I can disable their alarms for 60 seconds. Use it wisely.",
                                    choices: [
                                        { text: "Do it", action: () => {
                                            game.alarmsDisabled = true;
                                            game.alarmDisableTimer = 60 * 60; // 60 seconds
                                            game.addNotification("🔇 Alarms disabled for 60 seconds!");
                                            this.endDialog(game);
                                        }},
                                        { text: "Maybe later", action: () => this.endDialog(game) }
                                    ]
                                });
                            }},
                            { text: "I'll manage", action: () => this.endDialog(game) }
                        ]
                    }
                ],
                quests: [
                    new Quest({
                        id: 'data_theft',
                        name: 'Data Liberation',
                        description: 'Steal classified documents from 3 government terminals.',
                        introDialog: 'The people deserve to know the truth. Help me expose their lies.',
                        completionDialog: 'The truth will set us free. Here\\'s your payment.',
                        objectives: [
                            { id: 'doc1', type: 'collect', item: 'classified_doc', count: 3, description: 'Collect 3 classified documents' }
                        ],
                        rewards: { credits: 750, researchPoints: 75 }
                    })
                ]
            });
            break;

        case 2: // Mission 3 - Industrial
            configs.push({
                id: 'engineer_1',
                name: 'Disgruntled Engineer',
                x: 18,
                y: 22,
                sprite: '⚙️',
                avatar: '👨‍🔧',
                color: '#ff8800',
                movementType: 'wander',
                dialog: [
                    {
                        text: "They're manufacturing something terrible in the restricted zone.",
                        choices: [
                            { text: "What are they making?", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "Autonomous killing machines. We have to stop them!",
                                    choices: [
                                        { text: "I'll help", action: () => {
                                            game.addNotification("🎯 New objective: Destroy the prototype!");
                                            this.endDialog(game);
                                        }},
                                        { text: "That's not my mission", action: () => this.endDialog(game) }
                                    ]
                                });
                            }},
                            { text: "Good luck with that", action: () => this.endDialog(game) }
                        ]
                    }
                ],
                quests: [
                    new Quest({
                        id: 'destroy_prototype',
                        name: 'Stop the Machines',
                        description: 'Destroy the prototype war machines before they go online.',
                        introDialog: 'If these machines go online, thousands will die. Plant explosives at these coordinates.',
                        completionDialog: 'You\\'ve saved countless lives today. Thank you.',
                        objectives: [
                            { id: 'plant1', type: 'interact', description: 'Plant explosive at production line', targetId: 'prod_line' },
                            { id: 'plant2', type: 'interact', description: 'Plant explosive at control room', targetId: 'control_room' },
                            { id: 'escape', type: 'reach', description: 'Escape to extraction point', x: 5, y: 5 }
                        ],
                        rewards: { credits: 1000, researchPoints: 100, items: ['EMP_grenade'] }
                    })
                ]
            });
            break;

        case 3: // Mission 4 - Underground
            configs.push({
                id: 'resistance_leader',
                name: 'Resistance Leader',
                x: 15,
                y: 18,
                sprite: '🦾',
                avatar: '🎭',
                color: '#00ffff',
                movementType: 'stationary',
                dialog: [
                    {
                        text: "You're the agent they sent? We need your help against the Syndicate.",
                        choices: [
                            { text: "What do you need?", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "Intel, weapons, and someone with your skills. Are you in?",
                                    choices: [
                                        { text: "I'm in", action: () => {
                                            game.resistanceAllied = true;
                                            game.addNotification("🤝 Allied with the Resistance!");
                                            this.endDialog(game);
                                        }},
                                        { text: "I work alone", action: () => this.endDialog(game) }
                                    ]
                                });
                            }},
                            { text: "Not interested", action: () => this.endDialog(game) }
                        ]
                    }
                ]
            });
            break;

        case 4: // Mission 5 - Final
            configs.push({
                id: 'double_agent',
                name: 'Double Agent',
                x: 22,
                y: 15,
                sprite: '🕴️',
                avatar: '😈',
                color: '#ff0000',
                movementType: 'stationary',
                dialog: [
                    {
                        text: "I've been waiting for you... I have information about the Syndicate leader.",
                        choices: [
                            { text: "Tell me everything", action: function(game) {
                                game.showDialog({
                                    npc: this,
                                    text: "The leader has a weakness - an old injury. Aim for the left shoulder.",
                                    choices: [
                                        { text: "Why help me?", action: function(game) {
                                            game.showDialog({
                                                npc: this,
                                                text: "Let's just say... I have my reasons. Good luck.",
                                                choices: [
                                                    { text: "Thanks", action: () => {
                                                        game.bossWeaknessRevealed = true;
                                                        game.addNotification("🎯 Boss weakness revealed!");
                                                        this.endDialog(game);
                                                    }}
                                                ]
                                            });
                                        }},
                                        { text: "It's a trap!", action: () => {
                                            this.hostile = true;
                                            game.addNotification("⚠️ The double agent attacks!");
                                            this.endDialog(game);
                                        }}
                                    ]
                                });
                            }},
                            { text: "I don't trust you", action: () => this.endDialog(game) }
                        ]
                    }
                ]
            });
            break;
    }

    return configs;
};

// Check for nearby NPCs that can be interacted with
CyberOpsGame.prototype.getNearbyNPC = function(agent) {
    if (!this.npcs) return null;

    for (let npc of this.npcs) {
        if (!npc.alive) continue;

        const dist = Math.sqrt(
            Math.pow(npc.x - agent.x, 2) +
            Math.pow(npc.y - agent.y, 2)
        );

        if (dist <= this.npcInteractionRange) {
            return npc;
        }
    }

    return null;
};

// Interact with an NPC
CyberOpsGame.prototype.interactWithNPC = function(agent, npc) {
    if (!npc || !npc.alive) return;

    console.log(`💬 Agent interacting with NPC: ${npc.name}`);

    // Face the NPC
    const dx = npc.x - agent.x;
    const dy = npc.y - agent.y;
    agent.facingAngle = Math.atan2(dy, dx);
    npc.facingAngle = Math.atan2(-dy, -dx);

    // Get dialog
    const dialog = npc.getNextDialog(this);

    // Show dialog UI
    this.showDialog({
        npc: npc,
        text: dialog.text,
        choices: dialog.choices
    });

    // Track interaction
    this.npcInteractions = this.npcInteractions || new Set();
    this.npcInteractions.add(npc.id);
};

// Show dialog UI
CyberOpsGame.prototype.showDialog = function(dialogData) {
    // Pause the game during dialog
    this.dialogActive = true;
    this.pauseGame();

    // Create or get dialog container
    let dialogContainer = document.getElementById('npcDialogContainer');
    if (!dialogContainer) {
        dialogContainer = document.createElement('div');
        dialogContainer.id = 'npcDialogContainer';
        dialogContainer.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 600px;
            background: linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(20,20,40,0.95) 100%);
            border: 2px solid #00ffff;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            box-shadow: 0 0 30px rgba(0,255,255,0.5);
            font-family: 'Courier New', monospace;
        `;
        document.body.appendChild(dialogContainer);
    }

    // Build dialog content
    let html = `
        <div style="display: flex; gap: 20px; margin-bottom: 15px;">
            <div style="font-size: 48px; line-height: 1;">${dialogData.npc.avatar}</div>
            <div style="flex: 1;">
                <div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">
                    ${dialogData.npc.name}
                </div>
                <div id="dialogText" style="color: #fff; min-height: 40px;">
                    <span class="typing-text"></span><span class="cursor">_</span>
                </div>
            </div>
        </div>
        <div id="dialogChoices" style="display: none;">
    `;

    // Add choices
    if (dialogData.choices && dialogData.choices.length > 0) {
        dialogData.choices.forEach((choice, index) => {
            html += `
                <button class="dialog-choice" data-index="${index}" style="
                    display: block;
                    width: 100%;
                    padding: 10px;
                    margin: 5px 0;
                    background: rgba(0,255,255,0.1);
                    border: 1px solid #00ffff;
                    color: #fff;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s;
                ">
                    ${index + 1}. ${choice.text}
                </button>
            `;
        });
    }

    html += '</div>';
    dialogContainer.innerHTML = html;
    dialogContainer.style.display = 'block';

    // Add hover effects to choices
    const choiceButtons = dialogContainer.querySelectorAll('.dialog-choice');
    choiceButtons.forEach(btn => {
        btn.onmouseover = () => {
            btn.style.background = 'rgba(0,255,255,0.3)';
            btn.style.transform = 'translateX(5px)';
        };
        btn.onmouseout = () => {
            btn.style.background = 'rgba(0,255,255,0.1)';
            btn.style.transform = 'translateX(0)';
        };
        btn.onclick = () => {
            const index = parseInt(btn.dataset.index);
            const choice = dialogData.choices[index];
            if (choice.action) {
                choice.action.call(dialogData.npc, this);
            }
        };
    });

    // Type out the text with effect
    this.typeText(dialogData.text, () => {
        document.getElementById('dialogChoices').style.display = 'block';
    });

    // Store active dialog
    this.activeDialog = dialogData;
};

// Type text effect
CyberOpsGame.prototype.typeText = function(text, callback) {
    const textElement = document.querySelector('.typing-text');
    const cursor = document.querySelector('.cursor');
    if (!textElement) return;

    let index = 0;
    textElement.textContent = '';

    const typeInterval = setInterval(() => {
        if (index < text.length) {
            textElement.textContent += text[index];
            index++;

            // Play typing sound (optional)
            if (this.playSound) {
                this.playSound('type', 0.1);
            }
        } else {
            clearInterval(typeInterval);
            if (callback) callback();
        }
    }, 30); // Typing speed
};

// Close dialog
CyberOpsGame.prototype.closeDialog = function() {
    const dialogContainer = document.getElementById('npcDialogContainer');
    if (dialogContainer) {
        dialogContainer.style.display = 'none';
    }

    this.dialogActive = false;
    this.resumeGame();
    this.activeDialog = null;
};

// Update NPCs
CyberOpsGame.prototype.updateNPCs = function() {
    if (!this.npcs) return;

    for (let npc of this.npcs) {
        npc.update(this);
    }
};

// Render NPCs
CyberOpsGame.prototype.renderNPCs = function(ctx) {
    if (!this.npcs) return;

    for (let npc of this.npcs) {
        if (!npc.alive) continue;

        const screenPos = this.worldToScreen(npc.x, npc.y);

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

        // Draw quest indicator
        if (npc.quests && npc.quests.length > 0) {
            let hasAvailableQuest = false;
            for (let quest of npc.quests) {
                if (!npc.questsGiven.has(quest.id) && !this.completedQuests.has(quest.id)) {
                    if (npc.checkQuestRequirements(quest, this)) {
                        hasAvailableQuest = true;
                        break;
                    }
                }
            }

            if (hasAvailableQuest) {
                // Draw exclamation mark for available quest
                ctx.fillStyle = '#ffff00';
                ctx.font = 'bold 20px Arial';
                ctx.fillText('!', 15, -15);
            } else if (npc.questsGiven.size > 0) {
                // Check for completed quests
                let hasCompletedQuest = false;
                for (let questId of npc.questsGiven) {
                    const quest = this.quests[questId];
                    if (quest && quest.checkCompletion(this)) {
                        hasCompletedQuest = true;
                        break;
                    }
                }

                if (hasCompletedQuest) {
                    // Draw question mark for quest turn-in
                    ctx.fillStyle = '#00ff00';
                    ctx.font = 'bold 20px Arial';
                    ctx.fillText('?', 15, -15);
                }
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

console.log('💬 NPC System loaded successfully');