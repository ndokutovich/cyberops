// Screen Management - Simplified to use declarative dialog system

CyberOpsGame.prototype.showIntermissionDialog = function(victory) {
    // Use screen manager for full-screen victory/defeat screens
    if (window.screenManager) {
        window.screenManager.navigateTo(victory ? 'victory' : 'defeat');
    } else {
        console.error('Screen manager not available for intermission');
    }
}

// Gather comprehensive mission summary data (still needed by dialog system)
CyberOpsGame.prototype.gatherMissionSummary = function(victory) {
    const summary = {
        mainObjectives: [],
        sideQuests: [],
        rewards: [],
        itemsCollected: this.itemsCollectedThisMission || {},
        completedMainObjectives: 0,
        totalMainObjectives: 0,
        intelCollected: this.intelThisMission || 0,
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

    // Gather main objectives from current mission definition
    if (this.currentMissionDef && this.currentMissionDef.objectives) {
        summary.totalMainObjectives = this.currentMissionDef.objectives.filter(o => o.required !== false).length;
        summary.totalObjectives = this.currentMissionDef.objectives.length;

        this.currentMissionDef.objectives.forEach(obj => {
            const completed = this.checkObjectiveComplete ? this.checkObjectiveComplete(obj) : false;

            // Build progress string for objectives with counters
            let progress = '';
            if (obj.tracker && this.missionTrackers) {
                const current = this.missionTrackers[obj.tracker] || 0;
                const required = obj.count || 1;
                progress = `${current}/${required}`;
            }

            summary.mainObjectives.push({
                name: obj.id,
                description: obj.description || obj.displayText || obj.id,
                completed: completed,
                required: obj.required !== false,
                progress: progress
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

    // Calculate rewards
    if (victory && this.currentMissionDef && this.currentMissionDef.rewards) {
        const rewards = this.currentMissionDef.rewards;
        if (rewards.credits) {
            summary.totalCredits = rewards.credits;
            summary.rewards.push({ icon: '💰', description: `${rewards.credits} Credits` });
        }
        if (rewards.researchPoints) {
            summary.totalResearchPoints = rewards.researchPoints;
            summary.rewards.push({ icon: '🔬', description: `${rewards.researchPoints} Research Points` });
        }
        if (rewards.worldControl) {
            summary.worldControl = rewards.worldControl;
            summary.rewards.push({ icon: '🌍', description: `+${rewards.worldControl}% World Control` });
        }
    }

    return summary;
}

// Legacy functions that redirect to declarative system
CyberOpsGame.prototype.continueToNextMission = function() {
    // This is handled by the victory screen's action handlers
    this.dialogEngine.executeAction('proceedToNextMission');
}

CyberOpsGame.prototype.tryAgainMission = function() {
    // This is handled by the defeat screen's retry action
    this.dialogEngine.executeAction('retryMission');
}

CyberOpsGame.prototype.backToMainMenuFromIntermission = function() {
    // Navigate back to main menu
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    }
}

CyberOpsGame.prototype.finishCampaign = function() {
    // This is handled by the victory screen's complete campaign action
    this.dialogEngine.executeAction('completeCampaign');
}

// Apply medical healing after missions
CyberOpsGame.prototype.applyMedicalHealing = function() {
    if (!this.agents) return;

    // Heal all surviving agents to full health
    this.agents.forEach(agent => {
        if (agent.alive) {
            agent.health = agent.maxHealth || 100;
        }
    });

    console.log('⚕️ All surviving agents healed to full health');
}

// Main menu navigation
CyberOpsGame.prototype.backToMainMenu = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    }
}

// Initial screen (alias for splash)
CyberOpsGame.prototype.showInitialScreen = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('splash');
    } else {
        console.error('Screen manager not available for initial screen');
    }
}

// Splash screen
CyberOpsGame.prototype.showSplashScreen = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('splash');
    } else {
        console.error('Screen manager not available for splash screen');
    }
}

// Main menu
CyberOpsGame.prototype.showMainMenu = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('main-menu');
    } else {
        console.error('Screen manager not available for main menu');
    }
}

// Credits
CyberOpsGame.prototype.showCredits = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('credits');
    } else {
        console.error('Screen manager not available for credits');
    }
}

// Game over
CyberOpsGame.prototype.showGameOver = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('defeat');
    } else {
        console.error('Screen manager not available for game over');
    }
}

// Campaign complete
CyberOpsGame.prototype.showGameComplete = function() {
    if (window.screenManager) {
        window.screenManager.navigateTo('victory');
    } else {
        console.error('Screen manager not available for campaign complete');
    }
}

// Tutorial
CyberOpsGame.prototype.showTutorial = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('tutorial');
    } else {
        console.error('Dialog engine not available for tutorial');
    }
}

// World map
CyberOpsGame.prototype.showWorldMap = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('world-map');
    } else {
        console.error('Dialog engine not available for world map');
    }
}

// Terminal hack
CyberOpsGame.prototype.showTerminalHack = function(terminal) {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('terminal-hack', { terminal: terminal });
    } else {
        console.error('Dialog engine not available for terminal hack');
    }
}