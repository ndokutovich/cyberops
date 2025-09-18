CyberOpsGame.prototype.showIntermissionDialog = function(victory) {
        // Hide game HUD
        document.getElementById('gameHUD').style.display = 'none';

        // Update dialog title and message (use campaign text if available)
        const uiText = this.uiText || {};
        const title = victory ? (uiText.missionComplete || 'MISSION COMPLETE') : (uiText.missionFailed || 'MISSION FAILED');
        const statusIcon = victory ? '✅' : '❌';
        const statusText = victory ? (uiText.missionAccomplished || 'MISSION ACCOMPLISHED') : (uiText.missionFailed || 'MISSION FAILED');
        const statusColor = victory ? '#00ff00' : '#ff0000';

        document.getElementById('intermissionTitle').textContent = title;
        document.querySelector('.status-icon').textContent = statusIcon;
        document.querySelector('.status-text').textContent = statusText;
        document.querySelector('.status-text').style.color = statusColor;
        document.querySelector('.status-text').style.textShadow = `0 0 10px ${statusColor}`;

        // Update mission statistics
        document.getElementById('intermissionTime').textContent = document.getElementById('missionTimer').textContent;
        document.getElementById('intermissionEnemies').textContent =
            this.enemies.filter(e => !e.alive).length + '/' + this.enemies.length;

        // Gather comprehensive mission data
        const missionSummary = this.gatherMissionSummary(victory);

        // Display main objectives count
        document.getElementById('intermissionObjectives').textContent =
            `${missionSummary.completedMainObjectives}/${missionSummary.totalMainObjectives}`;
        document.getElementById('intermissionSquad').textContent =
            `${this.agents.filter(a => a.alive).length}/${this.agents.length} Survived`;

        // Update intel and rewards statistics
        document.getElementById('intermissionIntel').textContent =
            `${missionSummary.intelCollected} document${missionSummary.intelCollected !== 1 ? 's' : ''}`;
        document.getElementById('intermissionResearch').textContent =
            `+${missionSummary.totalResearchPoints} RP`;

        // Add detailed breakdown after the basic stats
        const statsContainer = document.querySelector('.intermission-stats');

        // Clear existing breakdown sections
        ['objectivesBreakdown', 'questsBreakdown', 'rewardsBreakdown', 'itemsBreakdown', 'newAgentsNotice'].forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.remove();
        });

        // Add main objectives breakdown
        if (missionSummary.mainObjectives.length > 0) {
            const objectivesSection = document.createElement('div');
            objectivesSection.id = 'objectivesBreakdown';
            objectivesSection.className = 'stat-section';
            objectivesSection.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,255,255,0.3);';

            let html = '<div style="color: #00ffff; margin-bottom: 8px; font-weight: bold;">PRIMARY OBJECTIVES:</div>';
            missionSummary.mainObjectives.forEach(obj => {
                const icon = obj.completed ? '✅' : obj.required ? '❌' : '⭕';
                const color = obj.completed ? '#00ff00' : obj.required ? '#ff6666' : '#ffaa00';
                html += `
                    <div style="margin-left: 15px; color: ${color}; font-size: 0.9em;">
                        ${icon} ${obj.description || obj.name}
                        ${obj.progress ? ` (${obj.progress})` : ''}
                    </div>`;
            });
            objectivesSection.innerHTML = html;
            statsContainer.appendChild(objectivesSection);
        }

        // Add side quests breakdown
        if (missionSummary.sideQuests.length > 0) {
            const questsSection = document.createElement('div');
            questsSection.id = 'questsBreakdown';
            questsSection.className = 'stat-section';
            questsSection.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,255,255,0.3);';

            let html = '<div style="color: #ff00ff; margin-bottom: 8px; font-weight: bold;">SIDE QUESTS:</div>';
            missionSummary.sideQuests.forEach(quest => {
                let icon, color, status;
                if (!quest.discovered) {
                    // Undiscovered quest - show greyed out
                    icon = '❓';
                    color = '#666666';
                    status = 'Not discovered';
                } else if (quest.completed && quest.rewardClaimed) {
                    icon = '✅';
                    color = '#00ff00';
                    status = 'Completed';
                } else if (quest.completed && !quest.rewardClaimed) {
                    icon = '🎁';
                    color = '#ffd700';
                    status = 'Ready to claim';
                } else if (quest.failed) {
                    icon = '❌';
                    color = '#ff6666';
                    status = 'Failed';
                } else {
                    icon = '🔄';
                    color = '#ffff00';
                    status = 'In progress';
                }

                html += `
                    <div style="margin-left: 15px; color: ${color}; font-size: 0.9em; ${!quest.discovered ? 'opacity: 0.5;' : ''}">
                        ${icon} ${quest.discovered ? quest.name : '???'} - ${status}
                        ${quest.discovered && quest.reward ? ` (Reward: ${quest.reward})` : ''}
                    </div>`;
            });
            questsSection.innerHTML = html;
            statsContainer.appendChild(questsSection);
        }

        // Add rewards breakdown
        if (missionSummary.rewards.length > 0) {
            const rewardsSection = document.createElement('div');
            rewardsSection.id = 'rewardsBreakdown';
            rewardsSection.className = 'stat-section';
            rewardsSection.style.cssText = 'margin-top: 15px; padding: 10px; background: rgba(255,215,0,0.1); border: 1px solid rgba(255,215,0,0.3); border-radius: 5px;';

            let html = '<div style="color: #ffd700; margin-bottom: 8px; font-weight: bold;">REWARDS EARNED:</div>';
            missionSummary.rewards.forEach(reward => {
                html += `
                    <div style="margin-left: 15px; color: #ffff00; font-size: 0.9em;">
                        ${reward.icon} ${reward.description}
                    </div>`;
            });
            rewardsSection.innerHTML = html;
            statsContainer.appendChild(rewardsSection);
        }

        // Add new agents notification for victory
        if (victory && !this.completedMissions.includes(this.currentMission.id)) {
            const newAgentsSection = document.createElement('div');
            newAgentsSection.id = 'newAgentsNotice';
            newAgentsSection.className = 'stat-section';
            newAgentsSection.style.cssText = 'margin-top: 15px; padding: 10px; background: rgba(0,255,0,0.1); border: 1px solid rgba(0,255,0,0.3); border-radius: 5px;';
            newAgentsSection.innerHTML = `
                <div style="color: #00ff00; font-weight: bold; text-align: center;">
                    🆕 2 NEW AGENTS AVAILABLE FOR HIRE AT THE HUB!
                </div>`;
            statsContainer.appendChild(newAgentsSection);
        }

        // Add items collected breakdown
        if (missionSummary.itemsCollected && Object.keys(missionSummary.itemsCollected).length > 0) {
            const itemsSection = document.createElement('div');
            itemsSection.id = 'itemsBreakdown';
            itemsSection.className = 'stat-section';
            itemsSection.style.cssText = 'margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,255,255,0.3);';

            const itemIcons = {
                intel: '📄',
                health: '❤️',
                ammo: '🔫',
                credits: '💰',
                armor: '🛡️',
                explosives: '💣',
                keycard: '🗝️'
            };

            let itemsHTML = '<div style="color: #ffa500; margin-bottom: 8px; font-weight: bold;">ITEMS COLLECTED:</div>';
            let hasItems = false;

            for (let itemType in missionSummary.itemsCollected) {
                const count = missionSummary.itemsCollected[itemType];
                if (count > 0) {
                    hasItems = true;
                    itemsHTML += `
                        <div style="margin-left: 15px; color: #ccc; font-size: 0.9em;">
                            ${itemIcons[itemType] || '•'} ${itemType}: ${count}
                        </div>`;
                }
            }

            if (hasItems) {
                itemsSection.innerHTML = itemsHTML;
                statsContainer.appendChild(itemsSection);
            }
        }

        // Create action buttons based on mission outcome and progress
        const actionsContainer = document.getElementById('intermissionActions');
        actionsContainer.innerHTML = '';

        // Store reference to 'this' for all button callbacks
        const gameInstance = this;

        if (victory && this.currentMissionIndex < this.missions.length - 1) {
            // There's a next mission - show Continue button
            // Mark that we completed this mission
            this.missionJustCompleted = true;
            const continueBtn = document.createElement('button');
            continueBtn.className = 'menu-button';
            continueBtn.textContent = 'CONTINUE';
            continueBtn.onclick = function() { gameInstance.continueToNextMission(); };
            actionsContainer.appendChild(continueBtn);
        } else if (victory) {
            // All missions completed - show Game Complete
            this.missionJustCompleted = true;
            const completeBtn = document.createElement('button');
            completeBtn.className = 'menu-button';
            completeBtn.textContent = 'FINISH';
            completeBtn.onclick = function() { gameInstance.finishCampaign(); };
            actionsContainer.appendChild(completeBtn);
        } else {
            // Mission failed - don't advance
            this.missionJustCompleted = false;
        }

        // Always show Try Again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'menu-button';
        // Show different text based on autosave status
        const hasAutosave = localStorage.getItem('cyberops_save_pre_mission_autosave') !== null;
        tryAgainBtn.textContent = hasAutosave ? '🔄 TRY AGAIN (RESTORE SAVE)' : 'TRY AGAIN';
        tryAgainBtn.title = hasAutosave ?
            'Restore your team from the pre-mission autosave' :
            'Retry mission with current team state (enable autosave in settings for better experience)';
        tryAgainBtn.onclick = function() { gameInstance.tryAgainMission(); };
        actionsContainer.appendChild(tryAgainBtn);

        // Always show Main Menu button
        const mainMenuBtn = document.createElement('button');
        mainMenuBtn.className = 'menu-button';
        mainMenuBtn.textContent = 'MAIN MENU';
        mainMenuBtn.onclick = function() { gameInstance.backToMainMenuFromIntermission(); };
        actionsContainer.appendChild(mainMenuBtn);
        
        // Show the dialog
        document.getElementById('intermissionDialog').classList.add('show');
}

// Gather comprehensive mission summary data
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
        totalResearchPoints: 0
    };

    // Gather main objectives from current mission definition
    if (this.currentMissionDef && this.currentMissionDef.objectives) {
        summary.totalMainObjectives = this.currentMissionDef.objectives.filter(o => o.required !== false).length;

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

            if (completed && obj.required !== false) {
                summary.completedMainObjectives++;
            }
        });
    }

    // Gather side quests (both active and potential)
    // First, add active/completed quests from game.quests
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

    // Add undiscovered quests from NPCs (greyed out)
    if (this.npcs) {
        this.npcs.forEach(npc => {
            if (npc.quests) {
                npc.quests.forEach(quest => {
                    // Check if this quest is already in our list
                    const alreadyListed = summary.sideQuests.find(q =>
                        q.name === quest.name || q.name === quest.id
                    );

                    // If not listed and not given yet, add as undiscovered
                    if (!alreadyListed && (!npc.questsGiven || !npc.questsGiven.has(quest.id))) {
                        let reward = '';
                        if (quest.rewards) {
                            const rewards = [];
                            if (quest.rewards.credits) rewards.push(`${quest.rewards.credits} credits`);
                            if (quest.rewards.researchPoints) rewards.push(`${quest.rewards.researchPoints} RP`);
                            reward = rewards.join(', ');
                        }

                        summary.sideQuests.push({
                            name: quest.name || quest.id,
                            completed: false,
                            failed: false,
                            rewardClaimed: false,
                            discovered: false,
                            reward: reward
                        });
                    }
                });
            }
        });
    }

    console.log('📋 Side quests collected:', summary.sideQuests.length, summary.sideQuests);

    // The NPCs quests are already collected above in the two previous sections
    // No need to add them again here

    // Calculate total rewards
    const baseCredits = this.creditsThisMission || 0;
    const baseRP = this.researchPointsThisMission || 0;

    // Add mission rewards if victory
    if (victory) {
        if (this.currentMissionDef && this.currentMissionDef.rewards) {
            summary.totalCredits += this.currentMissionDef.rewards.credits || 0;
            summary.totalResearchPoints += this.currentMissionDef.rewards.researchPoints || 0;
        } else if (this.currentMission && this.currentMission.rewards) {
            summary.totalCredits += this.currentMission.rewards.credits || 0;
            summary.totalResearchPoints += this.currentMission.rewards.researchPoints || 0;
        }
    }

    // Add collected rewards
    summary.totalCredits += baseCredits;
    summary.totalResearchPoints += baseRP;

    // Add quest rewards
    if (this.quests) {
        for (let questId in this.quests) {
            const quest = this.quests[questId];
            if (quest.completed && quest.rewards) {
                summary.totalCredits += quest.rewards.credits || 0;
                summary.totalResearchPoints += quest.rewards.researchPoints || 0;
            }
        }
    }

    // Build rewards list
    if (summary.totalCredits > 0) {
        summary.rewards.push({
            icon: '💰',
            description: `${summary.totalCredits} Credits`
        });
    }

    if (summary.totalResearchPoints > 0) {
        summary.rewards.push({
            icon: '🔬',
            description: `${summary.totalResearchPoints} Research Points`
        });
    }

    if (summary.intelCollected > 0) {
        summary.rewards.push({
            icon: '📄',
            description: `${summary.intelCollected} Intel Documents`
        });
    }

    // Add special rewards
    if (victory && !this.completedMissions.includes(this.currentMission.id)) {
        summary.rewards.push({
            icon: '👥',
            description: '2 New Agents Available'
        });
    }

    // Add item rewards
    const specialItems = ['keycard', 'explosives', 'armor'];
    specialItems.forEach(item => {
        if (summary.itemsCollected[item] && summary.itemsCollected[item] > 0) {
            const itemIcons = {
                keycard: '🗝️',
                explosives: '💣',
                armor: '🛡️'
            };
            summary.rewards.push({
                icon: itemIcons[item] || '📦',
                description: `${summary.itemsCollected[item]} ${item}`
            });
        }
    });

    return summary;
}

CyberOpsGame.prototype.continueToNextMission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');

        // Advance to next mission only if we just completed one
        if (this.missionJustCompleted) {
            this.currentMissionIndex++;
            this.missionJustCompleted = false;
        }

        // Apply medical healing between missions if researched
        this.applyMedicalHealing();

        // Return to hub after mission completion
        this.showSyndicateHub();
}
    
CyberOpsGame.prototype.tryAgainMission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');

        // Try to load the pre-mission autosave
        const preMissionSave = localStorage.getItem('cyberops_save_pre_mission_autosave');

        if (preMissionSave) {
            try {
                const saveData = JSON.parse(preMissionSave);
                console.log('📁 Loading pre-mission autosave to restore agent states...');

                // Restore the game state from before the mission
                this.performLoadGame(saveData);

                // After loading, immediately start the mission again
                setTimeout(() => {
                    this.currentMission = this.missions[this.currentMissionIndex];
                    console.log(`Restarting Mission ${this.currentMission.id}: ${this.currentMission.title} with restored agents`);
                    this.startMission();
                }, 100);

                return;
            } catch (error) {
                console.error('Failed to load pre-mission save:', error);
            }
        }

        // Fallback: If no autosave exists, warn the user
        console.warn('No pre-mission autosave found.');

        // Show warning dialog to user
        this.showHudDialog(
            '⚠️ NO AUTOSAVE FOUND',
            'Unable to restore pre-mission state. Dead agents cannot be revived.<br><br>' +
            'Enable "Auto-Save Between Missions" in Settings → Game to allow retrying missions with your original team.',
            [
                { text: 'CONTINUE ANYWAY', action: () => {
                    this.closeDialog();
                    this.currentMission = this.missions[this.currentMissionIndex];
                    this.startMission();
                }},
                { text: 'RETURN TO HUB', action: () => {
                    this.closeDialog();
                    this.showSyndicateHub();
                }}
            ]
        );
}
    
CyberOpsGame.prototype.finishCampaign = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.showGameCompleteScreen();
}
    
CyberOpsGame.prototype.backToMainMenuFromIntermission = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.backToMainMenu();
}

// Add close function for intermission dialog X button
CyberOpsGame.prototype.closeIntermissionDialog = function() {
        document.getElementById('intermissionDialog').classList.remove('show');
        // Go back to main menu when closing intermission dialog
        this.backToMainMenu();
}

CyberOpsGame.prototype.showGameCompleteScreen = function() {
        // Start credits music when game is completed
        if (this.loadScreenMusic) {
            console.log('🎵 Loading victory music');
            this.loadScreenMusic('victory');
        } else {
            // Fallback - shouldn't happen
            console.warn('Screen music system not available for victory screen');
        }
        
        // Hide other screens
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'none';
        
        // Calculate final stats
        const totalMinutes = Math.floor(this.totalCampaignTime / 3600);
        const totalSeconds = Math.floor((this.totalCampaignTime % 3600) / 60);
        const timeString = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
        
        // Update stats display
        document.getElementById('finalMissions').textContent = `${this.completedMissions.length}/${this.missions.length}`;
        document.getElementById('finalTime').textContent = timeString;
        document.getElementById('finalEnemies').textContent = this.totalEnemiesDefeated;
        
        // Show completion screen
        document.getElementById('gameCompleteScreen').style.display = 'flex';
        this.currentScreen = 'complete';
}

CyberOpsGame.prototype.showCredits = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        
        // Start credits music if not already playing
        if (!this.creditsPlaying) {
            if (this.loadScreenMusic) {
                console.log('🎵 Loading credits music');
                this.loadScreenMusic('credits');
            } else {
                // Fallback - shouldn't happen
                console.warn('Screen music system not available for credits');
            }
        }

        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'flex';
        this.currentScreen = 'credits';
}

CyberOpsGame.prototype.restartCampaign = function() {
        // Stop credits music when restarting
        if (this.stopScreenMusic) {
            this.stopScreenMusic();
        }
        
        // Reset all progress
        this.currentMissionIndex = 0;
        this.completedMissions = [];
        this.totalCampaignTime = 0;
        this.totalEnemiesDefeated = 0;
        
        // Hide completion screen and start new campaign
        document.getElementById('gameCompleteScreen').style.display = 'none';
        this.showMissionBriefing(this.missions[0]);
}

CyberOpsGame.prototype.backToMainMenu = function() {
        // CRITICAL: Disable 3D mode if active
        if (this.is3DMode) {
            console.log('🔄 Disabling 3D mode when returning to menu');
            this.cleanup3D();
        }

        // Stop all music including credits (returning to main menu)
        // Level music handled by mission music system
        if (this.stopScreenMusic) {
            this.stopScreenMusic();
        }

        // Also cleanup music system if active
        if (this.musicSystem && this.cleanupMusicSystem) {
            this.cleanupMusicSystem();
        }

        // Hide all screens and dialogs
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('syndicateHub').style.display = 'none';  // Hide hub
        document.getElementById('intermissionDialog').classList.remove('show');
        document.getElementById('hudDialog').classList.remove('show');
        document.getElementById('missionSelectDialog').classList.remove('show');
        
        // Show main menu
        document.getElementById('mainMenu').style.display = 'flex';
        this.currentScreen = 'menu';
        this.updateMenuState();

        // Use new screen music system ONLY
        if (this.loadScreenMusic) {
            console.log('🎵 Loading menu music');
            this.loadScreenMusic('menu');
        }
        // Removed fallback to prevent duplicate audio

        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
}
    
// Original implementation - just show loading screen with CSS animation
CyberOpsGame.prototype.animateProgressBar = function(callback) {
    // Just wait for the CSS animation to play (2 seconds)
    // The flash effect is handled by the fade-in-from-flash CSS class on the menu
    setTimeout(() => {
        if (callback) callback();
    }, 2000); // 2 seconds for the loading animation
};

CyberOpsGame.prototype.showInitialScreen = function() {
        console.log('Showing initial start screen');
        this.currentScreen = 'initial';
        
        const initialScreen = document.getElementById('initialScreen');
        const resetButton = document.getElementById('resetButton');
        
        initialScreen.style.display = 'flex';
        
        // Remove existing event listener and add new one to avoid duplicates
        resetButton.replaceWith(resetButton.cloneNode(true));
        const newResetButton = document.getElementById('resetButton');
        
        // Handle reset button click
        newResetButton.addEventListener('click', () => {
            this.startGameExperience();
        });
}

CyberOpsGame.prototype.startGameExperience = function() {
        console.log('Starting game experience...');
        
        // Enable audio immediately on user interaction
        this.enableAudioOnInteraction();
        
        // Hide initial screen
        document.getElementById('initialScreen').style.display = 'none';
        
        // Check for saved game
        this.checkForSavedGame();
        
        // Start splash screens
        this.showSplashScreens();
}

CyberOpsGame.prototype.enableAudioOnInteraction = function() {
        this.audioEnabled = true;
        
        try {
            // Create AudioContext after user interaction (only once)
            if (!this.audioContext) {
                console.log('Creating AudioContext after user interaction...');
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                console.log('AudioContext created successfully!');
            }
            console.log('Audio context state:', this.audioContext.state);
            
            // Audio elements now managed by music systems
            
            // Store permission for this session
            sessionStorage.setItem('cyberops_audio_enabled', 'true');
            
        } catch (error) {
            console.warn('Failed to create AudioContext:', error);
            this.audioEnabled = false;
        }
}
    
CyberOpsGame.prototype.showSplashScreens = function() {
        console.log('Starting splash sequence');
        this.currentScreen = 'splash'; // Set screen state for skip functionality
        
        // Setup click skip functionality
        this.setupSplashSkip();
        
        // Start splash music immediately (audio is enabled from user interaction)
        console.log('Attempting to start splash music. audioEnabled:', this.audioEnabled);
        if (this.audioEnabled) {
            console.log('Audio is enabled, loading splash music');
            if (this.loadScreenMusic) {
                this.loadScreenMusic('splash');
            }
        } else {
            console.log('Audio not enabled yet - will start when user interacts');
        }
        
        // Show company logo
        const companyLogo = document.getElementById('companyLogo');
        companyLogo.style.display = 'flex';
        companyLogo.classList.add('show');
        console.log('Showing company logo splash');
        
        this.splashTimeout1 = setTimeout(() => {
            if (this.splashSkipped) return;
            companyLogo.classList.remove('show');
            setTimeout(() => {
                companyLogo.style.display = 'none';
            }, 1000); // Wait for fade-out transition
            console.log('Hiding company logo, showing studio logo');
            
            // Show studio logo
            const studioLogo = document.getElementById('studioLogo');
            studioLogo.style.display = 'flex';
            studioLogo.classList.add('show');
            
            this.splashTimeout2 = setTimeout(() => {
                if (this.splashSkipped) return;
                // Add explode fade-out effect
                studioLogo.classList.add('fade-out-explode');
                console.log('Studio logo explode animation');
                
                this.splashTimeout3 = setTimeout(() => {
                    if (this.splashSkipped) return;
                    studioLogo.classList.remove('show', 'fade-out-explode');
                    setTimeout(() => {
                        studioLogo.style.display = 'none';
                    }, 1000); // Wait for fade-out transition
                    console.log('Hiding studio logo, showing loading screen');
                    
                    // Show loading screen
                    const loadingScreen = document.getElementById('loadingScreen');
                    loadingScreen.style.display = 'flex';
                    
                    // Start progress bar animation
                    this.animateProgressBar(() => {
                        // After flash effect completes in animateProgressBar
                        loadingScreen.style.display = 'none';
                        
                        // Show main menu with fade-in effect
                        const mainMenu = document.getElementById('mainMenu');
                        mainMenu.style.display = 'flex';
                        mainMenu.style.opacity = '0';
                        mainMenu.classList.remove('fade-in-from-flash'); // Reset
                        
                        setTimeout(() => {  
                            mainMenu.classList.add('fade-in-from-flash');
                        }, 50);
                        
                        this.currentScreen = 'menu';
                        this.updateMenuState();
                        
                        // Music transitions now handled by screen music system
                        console.log('Natural splash progression - handled by screen music system');
                        
                        console.log('🎬 Natural splash progression - starting demoscene timer');
                        this.startDemosceneIdleTimer();
                        
                        // Remove splash click handlers
                        this.removeSplashClickHandlers();
                        
                        // Clean up after animation
                        setTimeout(() => {
                            mainMenu.classList.remove('fade-in-from-flash');
                            mainMenu.style.opacity = '';
                        }, 4600); // Match new animation duration
                    });
                }, 500); // Explode animation duration
            }, 3000);  // Studio logo duration 
        }, 3000);  // Company logo duration
}
    
CyberOpsGame.prototype.setupSplashSkip = function() {
        this.splashSkipped = false;
        
        const skipHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (!this.splashSkipped && this.currentScreen === 'splash') {
                // Don't skip immediately - first start music for current splash screen
                if (!this.audioEnabled) {
                    // This will trigger audio activation and start splash music
                    console.log('Starting audio from splash screen click...');
                    return; // Let the audio interaction handler take care of it
                } else {
                    // Audio is already enabled, now skip
                    this.skipToMainMenu();
                }
            }
        };
        
        // Add click listeners to all splash screens
        document.getElementById('companyLogo').addEventListener('click', skipHandler);
        document.getElementById('studioLogo').addEventListener('click', skipHandler);
        document.getElementById('loadingScreen').addEventListener('click', skipHandler);
        
        // Store handler for cleanup
        this.splashClickHandler = skipHandler;
}
    
CyberOpsGame.prototype.skipToMainMenu = function() {
        this.splashSkipped = true;
        
        // Clear all splash timeouts
        if (this.splashTimeout1) clearTimeout(this.splashTimeout1);
        if (this.splashTimeout2) clearTimeout(this.splashTimeout2);
        if (this.splashTimeout3) clearTimeout(this.splashTimeout3);
        if (this.progressAnimationFrame) cancelAnimationFrame(this.progressAnimationFrame);
        
        // Hide all splash screens immediately
        document.getElementById('companyLogo').style.display = 'none';
        document.getElementById('studioLogo').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
        
        // Remove any classes
        const companyLogo = document.getElementById('companyLogo');
        const studioLogo = document.getElementById('studioLogo');
        companyLogo.classList.remove('show');
        studioLogo.classList.remove('show', 'fade-out-explode');
        
        // Skip directly to main menu with fade effect
        this.finalizeSplashToMenu();
}
    
CyberOpsGame.prototype.finalizeSplashToMenu = function() {
        console.log('🎬 finalizeSplashToMenu() called - transitioning to main menu');
        
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        mainMenu.style.opacity = '0';
        mainMenu.classList.remove('fade-in-from-flash');
        
        setTimeout(() => {
            mainMenu.classList.add('fade-in-from-flash');
        }, 50);
        
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        console.log('🎬 Starting demoscene idle timer from finalizeSplashToMenu');
        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
        
        // Handle music transition from splash to menu
        if (this.transitionScreenMusic) {
            // Use the new declarative transition system
            console.log('🎵 Transitioning music from splash to menu');
            this.transitionScreenMusic('splash', 'menu');
        } else if (this.audioEnabled) {
            // Fallback to old system if needed
            if (this.splashSkipped) {
                console.log('Splash skipped - seeking to menu music section');
                if (this.loadScreenMusic) {
                    this.loadScreenMusic('menu');
                }
            } else {
                console.log('Natural splash transition - music continues without artifacts');
            }
        }
        
        // Remove splash click handlers
        this.removeSplashClickHandlers();
        
        // Clean up after animation
        setTimeout(() => {
            mainMenu.classList.remove('fade-in-from-flash');
            mainMenu.style.opacity = '';
        }, 4600);
}

CyberOpsGame.prototype.removeSplashClickHandlers = function() {
        if (this.splashClickHandler) {
            document.getElementById('companyLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('studioLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('loadingScreen').removeEventListener('click', this.splashClickHandler);
            this.splashClickHandler = null;
        }
}

