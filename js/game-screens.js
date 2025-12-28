// Screen Management - Simplified to use declarative dialog system

CyberOpsGame.prototype.showIntermissionDialog = function(victory) {

    // Initialize logger if needed
    if (!this.logger && window.Logger) {
        this.logger = new window.Logger('GameScreens');
    }
    // Preserve agent RPG states before transitioning
    if (this.agents && this.activeAgents) {
        this.agents.forEach(agent => {
            if (agent.rpgEntity) {
                // Find the corresponding active agent and update its RPG entity
                const activeAgent = this.activeAgents.find(a =>
                    a.name === agent.name || a.originalId === agent.originalId
                );
                if (activeAgent) {
                    activeAgent.rpgEntity = agent.rpgEntity;
                    if (this.logger) this.logger.debug(`💾 Preserved RPG state for ${agent.name}: Level ${agent.rpgEntity.level}, XP: ${agent.rpgEntity.experience}`);
                }
            }
        });
    }

    // Use screen manager for full-screen victory/defeat screens
    if (window.screenManager) {
        window.screenManager.navigateTo(victory ? 'victory' : 'defeat');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for intermission');
    }
}

// Gather comprehensive mission summary data (still needed by dialog system)
CyberOpsGame.prototype.gatherMissionSummary = function(victory) {
    // Get item stats from ItemService if available
    const itemService = this.gameServices?.itemService;
    const itemStats = itemService?.getMissionStats?.() || {};

    // DEBUG: Log ItemService stats
    if (this.logger) {
        this.logger.info(`💰 [DEBUG] gatherMissionSummary - itemStats:`, {
            hasItemService: !!itemService,
            creditsCollected: itemStats.creditsCollected,
            intelCollected: itemStats.intelCollected,
            itemsCollected: itemStats.itemsCollected
        });
    }

    const summary = {
        mainObjectives: [],
        sideQuests: [],
        rewards: [],
        itemsCollected: itemStats.itemsCollected || this.itemsCollectedThisMission || {},
        weaponsCollected: itemStats.weaponsCollected || [],
        completedMainObjectives: 0,
        totalMainObjectives: 0,
        intelCollected: itemStats.intelCollected || this.intelThisMission || 0,
        creditsCollected: itemStats.creditsCollected || 0,
        totalCredits: 0,
        totalResearchPoints: 0,
        enemiesKilled: this.enemies ? this.enemies.filter(e => !e.alive).length : 0,
        totalEnemies: this.enemies ? this.enemies.length : 0,
        agentsLost: this.agents ? this.agents.filter(a => !a.alive).length : 0,
        objectivesCompleted: 0,
        totalObjectives: 0,
        missionTime: document.getElementById('missionTimer') ? document.getElementById('missionTimer').textContent : '00:00',
        worldControl: 0,
        bonusObjectives: []
    };

    // Get objectives from MissionService (single source of truth)
    if (!this.gameServices?.missionService?.objectives) {
        throw new Error('MissionService.objectives not available - required for mission summary');
    }
    const objectives = this.gameServices.missionService.objectives;

    // DEBUG: Log objective progress values
    if (this.logger) {
        objectives.forEach(obj => {
            this.logger.info(`📋 [gatherMissionSummary] Objective: ${obj.id}, progress=${obj.progress}/${obj.maxProgress}, status=${obj.status}`);
        });
    }

    if (objectives) {
        summary.totalMainObjectives = objectives.filter(o => o.required !== false).length;
        summary.totalObjectives = objectives.length;

        objectives.forEach(obj => {
            // Check completion from MissionService (single source of truth)
            const completed = obj.status === 'completed' || this.gameServices.missionService.completedObjectives.has(obj.id);

            // Build formatted description with progress
            let displayText = obj.displayText || obj.description || obj.id;

            // Replace placeholders with actual progress values
            if (obj.progress !== undefined && obj.maxProgress !== undefined) {
                displayText = displayText.replace('{current}', obj.progress);
                displayText = displayText.replace('{required}', obj.maxProgress);
                displayText = displayText.replace('({current}/{required})', `(${obj.progress}/${obj.maxProgress})`);
            } else if (obj.tracker && this.gameServices && this.gameServices.missionService) {
                const tracker = this.gameServices.missionService.trackers[obj.tracker] || 0;
                const required = obj.count || 1;
                displayText = displayText.replace('{current}', tracker);
                displayText = displayText.replace('{required}', required);
            }

            // Build progress string for display
            let progressStr = '';
            if (obj.progress !== undefined && obj.maxProgress !== undefined) {
                progressStr = `${obj.progress}/${obj.maxProgress}`;
            }

            summary.mainObjectives.push({
                name: obj.id,
                description: displayText,
                completed: completed,
                required: obj.required !== false,
                progress: progressStr
            });

            if (completed) {
                summary.objectivesCompleted++;
                if (obj.required !== false) {
                    summary.completedMainObjectives++;
                } else {
                    summary.bonusObjectives.push(obj.description || obj.id);
                }
            }
        });
    }

    // Gather side quests
    if (this.quests) {
        for (let questId in this.quests) {
            const quest = this.quests[questId];
            if (quest.active || quest.completed) {
                let reward = '';
                if (quest.rewards) {
                    const rewards = [];
                    if (quest.rewards.credits) rewards.push(`${quest.rewards.credits} credits`);
                    if (quest.rewards.researchPoints) rewards.push(`${quest.rewards.researchPoints} RP`);
                    reward = rewards.join(', ');
                }

                summary.sideQuests.push({
                    name: quest.name || questId,
                    completed: quest.completed || false,
                    failed: quest.failed || false,
                    rewardClaimed: quest.rewardClaimed || false,
                    discovered: true,
                    reward: reward
                });
            }
        }
    }

    // Always include credits collected during mission
    summary.totalCredits = summary.creditsCollected || 0;

    // Calculate rewards (show potential rewards if not victory yet)
    if (this.currentMissionDef && this.currentMissionDef.rewards) {
        const rewards = this.currentMissionDef.rewards;
        if (rewards.credits) {
            if (victory) {
                summary.totalCredits += rewards.credits;
            }
            summary.rewards.push({ icon: '💰', description: `${rewards.credits} Credits` });
        }
        if (rewards.researchPoints) {
            if (victory) {
                summary.totalResearchPoints = rewards.researchPoints;
            }
            summary.rewards.push({ icon: '🔬', description: `${rewards.researchPoints} Research Points` });
        }
        if (rewards.worldControl) {
            summary.worldControl = rewards.worldControl;
            summary.rewards.push({ icon: '🌍', description: `+${rewards.worldControl}% World Control` });
        }
    }

    return summary;
}

// Legacy functions that redirect to declarative system via DialogStateService
CyberOpsGame.prototype.continueToNextMission = function() {
    // This is handled by the victory screen's action handlers
    this.gameServices?.dialogStateService?.executeAction('proceedToNextMission');
}

CyberOpsGame.prototype.tryAgainMission = function() {
    // This is handled by the defeat screen's retry action
    this.gameServices?.dialogStateService?.executeAction('retryMission');
}

CyberOpsGame.prototype.backToMainMenuFromIntermission = function() {
    // Navigate back to main menu
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    }
}

CyberOpsGame.prototype.finishCampaign = function() {
    // This is handled by the victory screen's complete campaign action
    this.gameServices?.dialogStateService?.executeAction('completeCampaign');
}

// Apply medical healing after missions
CyberOpsGame.prototype.applyMedicalHealing = function() {
    if (!this.agents) return;

    // Heal all surviving agents to full health via AgentService
    if (this.gameServices?.agentService) {
        this.gameServices.agentService.fullHealAllAgents();
    } else {
        this.agents.forEach(agent => {
            if (agent.alive) {
                agent.health = agent.maxHealth || 100;
            }
        });
    }

    if (this.logger) this.logger.debug('⚕️ All surviving agents healed to full health');
}

// Main menu navigation
CyberOpsGame.prototype.backToMainMenu = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    }
}

// Initial screen (now starts with vendor splash)
CyberOpsGame.prototype.showInitialScreen = function() {
    if (window.screenManager) {
        // Start with vendor splash which will chain to studio → game splash → menu
        window.screenManager.navigateTo('vendor-splash');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for initial screen');
    }
}

// Splash screen
CyberOpsGame.prototype.showSplashScreen = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('splash');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for splash screen');
    }
}

// Main menu
CyberOpsGame.prototype.showMainMenu = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for main menu');
    }
}

// Credits
CyberOpsGame.prototype.showCredits = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('credits');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for credits');
    }
}

// Game over
CyberOpsGame.prototype.showGameOver = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('defeat');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for game over');
    }
}

// Campaign complete
CyberOpsGame.prototype.showGameComplete = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('victory');
    } else {
        if (this.logger) this.logger.error('Screen manager not available for campaign complete');
    }
}

// Tutorial
CyberOpsGame.prototype.showTutorial = function() {
    if (this.gameServices?.dialogStateService) {
        this.gameServices.dialogStateService.navigateTo('tutorial');
    } else {
        if (this.logger) this.logger.error('DialogStateService not available for tutorial');
    }
}

// showWorldMap removed - duplicate of game-hub.js version

// Terminal hack
CyberOpsGame.prototype.showTerminalHack = function(terminal) {
    if (this.gameServices?.dialogStateService) {
        this.gameServices.dialogStateService.navigateTo('terminal-hack', { terminal: terminal });
    } else {
        if (this.logger) this.logger.error('DialogStateService not available for terminal hack');
    }
}