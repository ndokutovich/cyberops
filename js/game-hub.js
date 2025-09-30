    // Syndicate Hub System
CyberOpsGame.prototype.showSyndicateHub = function() {

    // Initialize logger if needed
    if (!this.logger && window.Logger) {
        this.logger = new window.Logger('GameHub');
    }

    // CRITICAL: Disable 3D mode if active
    if (this.is3DMode) {
        if (this.logger) this.logger.debug('🔄 Disabling 3D mode when entering Hub');
        this.cleanup3D();
    }

    // Stop mission music and cleanup music system
    if (this.musicSystem && this.cleanupMusicSystem) {
        if (this.logger) this.logger.debug('🛑 Stopping mission music when returning to hub');
        this.cleanupMusicSystem();
    }

    // Use screen manager to navigate to hub (fully declarative - no fallback)
    window.screenManager.navigateTo('hub');

    // Update hub stats after navigation completes
    setTimeout(() => {
        this.updateHubStats();
    }, 100);
}
    
CyberOpsGame.prototype.updateHubStats = function() {
        if (this.logger) this.logger.debug('🔍 updateHubStats called - checking data:');
        if (this.logger) this.logger.debug('- this.missions:', this.missions ? this.missions.length : 'UNDEFINED');
        if (this.logger) this.logger.debug('- this.activeAgents:', this.activeAgents ? this.activeAgents.length : 'UNDEFINED');
        if (this.logger) this.logger.info('- this.completedMissions:', this.completedMissions ? this.completedMissions.length : 'UNDEFINED');
        
        // EMERGENCY FIX: If missions is undefined, initialize it immediately
        if (!this.missions) {
            if (this.logger) this.logger.error('🚨 EMERGENCY: this.missions is undefined! Initializing now...');
            this.initializeHub();
        }
        
        // Update resource displays (with safety checks for test mode)
        const hubCredits = document.getElementById('hubCredits');
        if (hubCredits) hubCredits.textContent = this.credits.toLocaleString();

        const hubResearchPoints = document.getElementById('hubResearchPoints');
        if (hubResearchPoints) hubResearchPoints.textContent = this.researchPoints;

        const hubMissionsComplete = document.getElementById('hubMissionsComplete');
        if (hubMissionsComplete) hubMissionsComplete.textContent = `${this.completedMissions.length}/${this.missions.length}`;

        const hubActiveAgents = document.getElementById('hubActiveAgents');
        if (hubActiveAgents) hubActiveAgents.textContent = this.activeAgents.length;

        // Update world control
        const worldControlPercent = document.getElementById('worldControlPercent');
        if (worldControlPercent) worldControlPercent.textContent = `${this.worldControl}%`;

        const controlProgress = document.getElementById('controlProgress');
        if (controlProgress) controlProgress.style.width = `${this.worldControl}%`;
        
        // Update status indicators
        const availableMissions = this.missions.length - this.completedMissions.length;

        // Find and display next mission
        const missionStatusEl = document.getElementById('missionStatus');
        if (missionStatusEl) {
            let nextMissionName = null;
            for (let i = 0; i < this.missions.length; i++) {
                if (!this.completedMissions.includes(this.missions[i].id)) {
                    nextMissionName = this.missions[i].title;
                    break;
                }
            }

            if (nextMissionName) {
                missionStatusEl.innerHTML = `<span style="color: #00ff00;">➤</span> ${nextMissionName}`;
                missionStatusEl.style.color = '#00ff00';
            } else {
                missionStatusEl.textContent = 'All Complete ✓';
                missionStatusEl.style.color = '#ffa500';
            }
        }
        const agentStatus = document.getElementById('agentStatus');
        if (agentStatus) agentStatus.textContent = `${this.activeAgents.length} Active`;

        const arsenalStatus = document.getElementById('arsenalStatus');
        if (arsenalStatus) arsenalStatus.textContent = `${this.weapons.length + this.equipment.length} Items`;

        const researchStatus = document.getElementById('researchStatus');
        if (researchStatus) researchStatus.textContent = `${Math.floor(this.researchPoints / 50)} Projects`;

        // Update fallen agents status
        const fallenCount = this.fallenAgents ? this.fallenAgents.length : 0;
        const fallenStatus = document.getElementById('fallenStatus');
        if (fallenStatus) {
            fallenStatus.textContent = fallenCount === 0 ? '0 Heroes' :
                                      fallenCount === 1 ? '1 Hero' :
                                      `${fallenCount} Heroes`;
        }

        // Update intel status
        const intelStatus = document.getElementById('intelStatus');
        if (intelStatus) {
            const reportsUnlocked = (this.unlockedIntelReports || []).length;
            const totalIntel = this.totalIntelCollected || 0;
            if (reportsUnlocked > 0) {
                intelStatus.innerHTML = `<span style="color: #00ff00;">${reportsUnlocked}</span> Reports`;
            } else {
                intelStatus.textContent = `${totalIntel} Intel`;
            }
        }

        // Update character status
        const characterStatus = document.getElementById('characterStatus');
        if (characterStatus && this.activeAgents && this.activeAgents[0]) {
            const agent = this.activeAgents[0];
            const level = agent.level || 1;
            const xp = agent.xp || 0;
            characterStatus.textContent = `Level ${level}`;
        }
}
    
CyberOpsGame.prototype.showMissionsFromHub = function() {
    // Save where we came from
    this.dialogReturnScreen = 'hub';
    // Don't hide the hub - let it serve as background
    // The dialog will overlay on top of it

    // Use the declarative dialog system
    if (this.dialogEngine && this.dialogEngine.navigateTo) {
        this.dialogEngine.navigateTo('mission-select-hub');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available for mission selection');
    }
}

// Start next uncompleted mission
CyberOpsGame.prototype.startNextMission = function() {
    // Find the next uncompleted mission
    let nextMission = null;
    let nextMissionIndex = -1;

    for (let i = 0; i < this.missions.length; i++) {
        const mission = this.missions[i];
        if (!this.completedMissions.includes(mission.id)) {
            nextMission = mission;
            nextMissionIndex = i;
            break;
        }
    }

    if (nextMission) {
        // Hide hub using screen manager
        // Hub hiding is handled by screen navigation

        // Set current mission index and start briefing
        this.currentMissionIndex = nextMissionIndex;
        this.currentMission = nextMission;
        window.screenManager.navigateTo('mission-briefing', { selectedMission: nextMission });
    } else {
        // All missions completed
        this.showHudDialog(
            '🎆 ALL MISSIONS COMPLETE',
            `Congratulations Commander!<br><br>
            You have completed all available missions.<br>
            The city is safe thanks to your efforts!<br><br>
            <div style="color: #ffa500;">Total Missions Completed: ${this.completedMissions.length}/${this.missions.length}</div>`,
            [
                { text: 'VIEW ACHIEVEMENTS', action: () => { this.closeDialog(); this.showHallOfGlory(); } },
                { text: 'OK', action: 'close' }
            ]
        );
    }
}
    
    // Fix mission briefing for hub flow
CyberOpsGame.prototype.startMissionFromHub = function(missionIndex) {
        // Close any open dialogs first
        if (this.dialogEngine && this.dialogEngine.closeAll) {
            this.dialogEngine.closeAll();
        }

        // Navigation handled by screen manager
        // No need to manually hide screens

        const mission = this.missions[missionIndex];
        this.currentMissionIndex = missionIndex;
        this.currentMission = mission;
        window.screenManager.navigateTo('mission-briefing', { selectedMission: mission });
}
    
CyberOpsGame.prototype.showHallOfGlory = function() {
    // Navigation handled by screen manager - no need to hide hub

    // Use the declarative dialog system
    if (this.dialogEngine && this.dialogEngine.navigateTo) {
        this.dialogEngine.navigateTo('hall-of-glory');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available for Hall of Glory');
    }
}

// Return to hub from declarative dialog
CyberOpsGame.prototype.returnToHub = function() {
    // Close any open dialogs
    if (this.dialogEngine && this.dialogEngine.closeAll) {
        this.dialogEngine.closeAll();
    }

    // Don't restart music when returning from dialogs - let it continue playing
    // Music will only restart when coming from missions (handled in showSyndicateHub)
    if (this.logger) this.logger.debug('🎵 Returning to hub from dialog - music continues playing');

    // Check where we came from and return to the appropriate screen
    // Use the saved return screen if available
    const returnTo = this.dialogReturnScreen || this.currentScreen;

    if (returnTo === 'menu') {
        // We're already showing main menu, just ensure hub is hidden
        // Navigation handled by screen manager
        window.screenManager.navigateTo('main-menu');
    } else {
        // Already in hub, just update
        this.currentScreen = 'hub';
        this.updateHubStats();
    }

    // Clear the return screen flag
    this.dialogReturnScreen = null;
}

// Agent Management - Now uses declarative dialog
CyberOpsGame.prototype.showAgentManagement = function() {
    if (window.dialogManager && window.dialogManager.open) {
        window.dialogManager.open('agent-management');
    }
}
// Content generators moved to declarative dialog system
    
// Arsenal - Now uses declarative dialog
CyberOpsGame.prototype.showArsenal = function() {
    if (window.dialogManager && window.dialogManager.open) {
        window.dialogManager.open('equipment-arsenal');
    }
}
// Content generators moved to declarative dialog system
    
// Research Lab - Now uses declarative dialog
CyberOpsGame.prototype.showResearchLab = function() {
    if (window.dialogManager && window.dialogManager.open) {
        window.dialogManager.open('research-lab');
    }
}

// DEPRECATED - Old implementation kept for reference only
CyberOpsGame.prototype.showResearchLabOld = function() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Research Points: ${this.researchPoints.toLocaleString()}</div>`;
        
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE RESEARCH</h3>';
        content += `<div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #00ffff; margin: 10px 0;">
            <strong style="color: #00ffff;">CYBER WARFARE ENHANCEMENT</strong><br>
            Progress: 75% | Est. Completion: 2 missions<br>
            Benefit: +15% hacking success rate
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #ff00ff; margin: 10px 0;">
            <strong style="color: #ff00ff;">ADVANCED COMBAT TRAINING</strong><br>
            Progress: 45% | Est. Completion: 4 missions<br>
            Benefit: +10 damage for all agents
        </div>`;
        
        content += '<h3 style="color: #ff00ff; margin: 30px 0 15px 0;">AVAILABLE RESEARCH</h3>';
        
        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons', category: 'combat' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate', category: 'stealth' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents', category: 'combat' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed', category: 'tech' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions', category: 'support' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents', category: 'tactical' }
        ];
        
        researchProjects.forEach(project => {
            const canAfford = this.researchPoints >= project.cost;
            const completed = this.completedResearch && this.completedResearch.includes(project.id);
            
            content += `
                <div style="background: ${completed ? 'rgba(0,255,0,0.1)' : canAfford ? 'rgba(255,0,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${completed ? '#00ff00' : canAfford ? '#ff00ff' : '#666'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: ${completed ? '#00ff00' : canAfford ? '#fff' : '#999'};">
                                ${project.name} ${completed ? '✅' : ''}
                            </div>
                            <div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">
                                ${project.description}<br>
                                Category: ${project.category}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #ff00ff; font-weight: bold; margin-bottom: 5px;">${project.cost} RP</div>
                            <button onclick="game.startResearch(${project.id})" 
                                    style="background: ${completed ? '#006600' : canAfford ? '#1e3c72' : '#666'}; 
                                           color: ${completed ? '#fff' : canAfford ? '#fff' : '#999'}; 
                                           border: 1px solid ${completed ? '#00ff00' : canAfford ? '#ff00ff' : '#888'}; 
                                           padding: 8px 15px; border-radius: 4px; cursor: ${completed ? 'not-allowed' : canAfford ? 'pointer' : 'not-allowed'};"
                                    ${completed || !canAfford ? 'disabled' : ''}>
                                ${completed ? 'COMPLETED' : canAfford ? 'RESEARCH' : 'INSUFFICIENT RP'}
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '🔬 RESEARCH LABORATORY',
            content,
            [
                { text: 'BACK', action: () => { this.closeDialog(); window.screenManager.navigateTo('hub'); } }
            ]
        );
}
    
CyberOpsGame.prototype.startResearch = function(projectId) {
        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons', category: 'combat' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate', category: 'stealth' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents', category: 'combat' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed', category: 'tech' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions', category: 'support' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents', category: 'tactical' }
        ];
        
        const project = researchProjects.find(p => p.id === projectId);
        if (!project || this.researchPoints < project.cost) return;
        
        // Initialize completed research array if not exists
        if (!this.completedResearch) this.completedResearch = [];
        
        // Check if already researched
        if (this.completedResearch.includes(projectId)) {
            this.showHudDialog(
                '⚠️ RESEARCH COMPLETE',
                `${project.name} has already been researched!`,
                [{ text: 'OK', action: () => this.showResearchLab() }]
            );
            return;
        }
        
        // UNIDIRECTIONAL: Only use ResourceService - no fallback
        if (!this.gameServices || !this.gameServices.resourceService) {
            if (this.logger) this.logger.error('❌ ResourceService not available for research!');
            this.showHudDialog(
                '⚠️ ERROR',
                'Service initialization error. Please refresh the game.',
                [{ text: 'OK' }]
            );
            return;
        }
        this.gameServices.resourceService.spend('researchPoints', project.cost, `research: ${project.name}`);
        this.completedResearch.push(projectId);
        
        // Apply research benefits
        this.applyResearchBenefits(project);

        // Close the declarative dialog first to prevent z-index issues
        if (this.dialogEngine && this.dialogEngine.close) {
            this.dialogEngine.close();
        }

        // Show completion dialog
        setTimeout(() => {
            this.showHudDialog(
                '🎯 RESEARCH COMPLETED',
                `${project.name} research has been completed!<br><br>
                <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <strong>${project.name}</strong><br>
                    Category: ${project.category}<br>
                    Benefit: ${project.description}
                </div>
                Research Points Remaining: ${this.researchPoints.toLocaleString()}`,
                [
                    { text: 'CONTINUE RESEARCH', action: () => {
                        this.closeDialog();
                        // Re-open the declarative research dialog
                        if (this.dialogEngine && this.dialogEngine.navigateTo) {
                            this.dialogEngine.navigateTo('research-lab');
                        }
                    }},
                    { text: 'BACK TO HUB', action: () => { this.closeDialog(); window.screenManager.navigateTo('hub'); } }
                ]
            );
        }, 100);
        
        this.updateHubStats();
}
    
CyberOpsGame.prototype.applyResearchBenefits = function(project) {
    // Apply research to all active agents via ResearchService
    this.activeAgents = this.activeAgents.map(agent =>
        this.gameServices.researchService.applyResearchToAgent(
            agent,
            this.completedResearch || []
        )
    );

    // Special handling for Medical Systems
    if (project.id === 5) {
        this.applyMedicalHealing();
    }
}
    
    // Apply equipment bonuses to mission agents
CyberOpsGame.prototype.applyEquipmentBonuses = function(agent) {
    // Apply equipment bonuses via EquipmentService
    return this.gameServices.equipmentService.applyEquipmentToAgent(
        agent,
        this.weapons || [],
        this.equipment || []
    );
}
    
    // Apply research bonuses during missions
CyberOpsGame.prototype.applyMissionResearchBonuses = function(agent) {
    // Apply mission-specific research bonuses via ResearchService
    return this.gameServices.researchService.applyResearchToAgent(
        agent,
        this.completedResearch || []
    );
}
    
    // Apply medical healing between missions
CyberOpsGame.prototype.applyMedicalHealing = function() {
        if (!this.completedResearch || !this.completedResearch.includes(5)) return;
        
        this.activeAgents.forEach(agent => {
            const healAmount = Math.floor(agent.maxHealth * 0.2);
            agent.health = Math.min(agent.health + healAmount, agent.maxHealth);
        });
}
    
    // Apply stealth bonus for detection  
CyberOpsGame.prototype.getStealthDetectionRange = function(agent) {
        let baseRange = 5; // Default enemy vision range
        
        if (agent.stealthBonus) {
            // Stealth bonus reduces enemy detection range
            baseRange = Math.max(2, baseRange - (agent.stealthBonus / 20));
        }
        
        return baseRange;
}
    
    // Fix missing medical healing call after mission completion
CyberOpsGame.prototype.completeMissionRewards = function(victory) {
        if (victory && this.currentMission.rewards) {
            // UNIDIRECTIONAL: Apply mission rewards via ResourceService only
            if (this.gameServices && this.gameServices.resourceService) {
                this.gameServices.resourceService.applyMissionRewards(this.currentMission.rewards);
            }
            
            // Apply medical healing if researched
            this.applyMedicalHealing();
            
            // Update hub stats
            this.updateHubStats();
        }
}
    
// Intelligence - Now uses declarative dialog
CyberOpsGame.prototype.showIntelligence = function() {
    if (window.dialogManager && window.dialogManager.open) {
        window.dialogManager.open('intelligence');
    }
}

// DEPRECATED - Old implementation kept for reference only
CyberOpsGame.prototype.showIntelligenceOld = function() {
    // Initialize intel system if needed
    if (!this.intelByMission) this.intelByMission = {};
    if (!this.unlockedIntelReports) this.unlockedIntelReports = [];

    // Debug logging
    if (this.logger) this.logger.debug('📡 Intel Modal Debug:', {
        totalIntel: this.totalIntelCollected,
        thisMission: this.intelThisMission,
        byMission: this.intelByMission,
        unlockedReports: this.unlockedIntelReports?.length || 0
    });

    // Generate content based on actual intel collected
    let content = '<div style="max-height: 500px; overflow-y: auto;">';

    // Intel Statistics Section
    content += `
        <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #00ffff; margin-bottom: 15px;">📊 INTELLIGENCE STATISTICS</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                    <div style="color: #888; font-size: 0.9em;">Total Intel Collected</div>
                    <div style="color: #00ffff; font-size: 1.5em; font-weight: bold;">${this.totalIntelCollected || 0}</div>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                    <div style="color: #888; font-size: 0.9em;">Research Points Earned</div>
                    <div style="color: #ff00ff; font-size: 1.5em; font-weight: bold;">${Math.floor((this.totalIntelCollected || 0) * 25)}</div>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                    <div style="color: #888; font-size: 0.9em;">Reports Unlocked</div>
                    <div style="color: #00ff00; font-size: 1.5em; font-weight: bold;">${(this.unlockedIntelReports || []).length}/7</div>
                </div>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                    <div style="color: #888; font-size: 0.9em;">Next Report At</div>
                    <div style="color: #ffa500; font-size: 1.5em; font-weight: bold;">${this.getNextIntelThreshold()}</div>
                </div>
            </div>
        </div>
    `;

    // Intel by Mission
    content += `
        <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #ff00ff; margin-bottom: 15px;">🗺️ MISSION INTEL</h3>
            <div style="text-align: left;">
    `;

    if (this.intelByMission && Object.keys(this.intelByMission).length > 0) {
        Object.keys(this.intelByMission).forEach(missionId => {
            const mission = this.missions.find(m => m.id === parseInt(missionId));
            const missionName = mission ? mission.title : `Mission ${missionId}`;
            content += `
                <div style="background: rgba(0,0,0,0.3); padding: 8px; margin: 5px 0; border-radius: 3px;">
                    <span style="color: #fff;">${missionName}:</span>
                    <span style="color: #00ffff; margin-left: 10px;">${this.intelByMission[missionId]} documents</span>
                </div>
            `;
        });
    } else {
        content += '<div style="color: #888; text-align: center; padding: 10px;">No intel collected yet</div>';
    }

    content += '</div></div>';

    // Unlocked Intel Reports
    content += `
        <div style="background: rgba(0,255,0,0.05); padding: 15px; border-radius: 8px;">
            <h3 style="color: #00ff00; margin-bottom: 15px;">🔓 DECLASSIFIED REPORTS</h3>
    `;

    if (this.unlockedIntelReports && this.unlockedIntelReports.length > 0) {
        this.unlockedIntelReports.forEach(report => {
            const colors = {
                first: '#00ffff',
                basic: '#00ff00',
                weapons: '#ffa500',
                command: '#ff00ff',
                fortress: '#ff0000',
                master: '#ffff00',
                ultimate: '#ff00ff'
            };

            content += `
                <div style="background: rgba(0,0,0,0.5); padding: 12px; margin: 10px 0; border-left: 3px solid ${colors[report.id] || '#fff'}; border-radius: 3px;">
                    <strong style="color: ${colors[report.id] || '#fff'};">${report.title}</strong><br>
                    <span style="color: #ccc; font-size: 0.9em;">${report.content}</span>
                </div>
            `;
        });
    } else {
        content += '<div style="color: #888; text-align: center; padding: 20px;">Collect more intel to unlock classified reports</div>';
    }

    content += '</div></div>';

    this.showHudDialog(
        '📡 INTELLIGENCE NETWORK',
        content,
        [
            { text: 'RESEARCH LAB', action: () => { this.transitionDialog(() => this.showResearchLab()); } },
            { text: 'BACK', action: () => { this.closeDialog(); window.screenManager.navigateTo('hub'); } }
        ]
    );
};

// Helper function to get next intel threshold
CyberOpsGame.prototype.getNextIntelThreshold = function() {
    const thresholds = [1, 3, 5, 8, 10, 15, 20];
    const current = this.totalIntelCollected || 0;

    for (let threshold of thresholds) {
        if (current < threshold) {
            return `${threshold} intel`;
        }
    }

    return 'All unlocked!';
}
    
    // Agent Hiring System
CyberOpsGame.prototype.showHiringDialog = function() {
        const availableAgents = this.availableAgents.filter(agent => !agent.hired);
        
        if (availableAgents.length === 0) {
            this.showHudDialog(
                '👥 NO AGENTS AVAILABLE',
                'All available agents have already been hired!<br><br>Check back later for new recruits.',
                [{ text: 'OK', action: () => { this.closeDialog(); window.screenManager.navigateTo('hub'); } }]
            );
            return;
        }
        
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Credits: ${this.credits.toLocaleString()}</div>`;
        
        availableAgents.forEach(agent => {
            const canAfford = this.credits >= agent.cost;
            content += `
                <div style="background: ${canAfford ? 'rgba(0,255,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canAfford ? '#00ffff' : '#666'};">
                    <div style="font-weight: bold; color: ${canAfford ? '#fff' : '#999'};">${agent.name}</div>
                    <div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">
                        Specialization: ${agent.specialization}<br>
                        Skills: ${agent.skills.join(', ')}<br>
                        Health: ${agent.health} | Damage: ${agent.damage} | Speed: ${agent.speed}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span style="color: #00ffff; font-weight: bold;">Cost: ${agent.cost.toLocaleString()} credits</span>
                        <button data-agent-id="${agent.id}"
                                class="hire-agent-btn"
                                style="background: ${canAfford ? '#1e3c72' : '#666'};
                                       color: ${canAfford ? '#fff' : '#999'};
                                       border: 1px solid ${canAfford ? '#00ffff' : '#888'};
                                       padding: 8px 15px; border-radius: 4px; cursor: ${canAfford ? 'pointer' : 'not-allowed'};"
                                ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? 'HIRE' : 'INSUFFICIENT FUNDS'}
                        </button>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '👥 HIRE AGENTS',
            content,
            [
                { text: 'BACK TO AGENTS', action: () => { this.transitionDialog(() => this.showAgentManagement()); } },
                { text: 'CLOSE', action: () => { this.closeDialog(); } }
            ]
        );

        // Add event delegation for hire buttons after a short delay to ensure DOM is ready
        setTimeout(() => {
            // Try to find buttons in modal engine
            const modalContainer = document.getElementById('modalEngineContainer');

            const containers = [modalContainer].filter(c => c);

            containers.forEach(container => {
                const hireButtons = container.querySelectorAll('.hire-agent-btn:not([disabled])');
                hireButtons.forEach(btn => {
                    btn.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const agentId = parseInt(btn.dataset.agentId);
                        if (this.logger) this.logger.debug('Hiring agent:', agentId);
                        this.hireAgent(agentId);
                    };
                });
            });
        }, 100);
}
    
CyberOpsGame.prototype.hireAgent = function(agentId) {
        const agent = this.availableAgents.find(a => a.id === agentId);
        const currentCredits = this.gameServices?.resourceService?.get('credits') || this.credits;
        if (!agent || agent.hired || currentCredits < agent.cost) return;

        // UNIDIRECTIONAL: Only use AgentService for hiring
        if (!this.gameServices || !this.gameServices.agentService) {
            if (this.logger) this.logger.error('❌ AgentService not available for hiring!');
            this.showHudDialog(
                '⚠️ ERROR',
                'Service initialization error. Please refresh the game.',
                [{ text: 'OK' }]
            );
            return;
        }
        const success = this.gameServices.agentService.hireAgent(agentId);
        if (!success) return;
        
        this.showHudDialog(
            '✅ AGENT HIRED',
            `${agent.name} has been successfully recruited to your syndicate!<br><br>
            <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${agent.name}</strong><br>
                Specialization: ${agent.specialization}<br>
                Skills: ${agent.skills.join(', ')}<br>
                Health: ${agent.health} | Damage: ${agent.damage}
            </div>
            Credits Remaining: ${this.credits.toLocaleString()}`,
            [
                { text: 'HIRE MORE', action: () => { this.transitionDialog(() => this.showHiringDialog()); } },
                { text: 'VIEW SQUAD', action: () => { this.closeDialog(); this.showEquipmentManagement(); } },
                { text: 'BACK TO AGENTS', action: () => { this.closeDialog(); this.showAgentManagement(); } }
            ]
        );
        
        this.updateHubStats();
}
    
    // Squad Management System - Redirect to new equipment interface
CyberOpsGame.prototype.showSquadManagement = function() {
    // Initialize equipment system if needed
    if (!this.agentLoadouts) {
        this.initializeEquipmentSystem();
    }

    // Close current dialog and show equipment management
    this.closeDialog();
    this.showEquipmentManagement();
}
    
CyberOpsGame.prototype.manageAgentEquipment = function(agentId) {
        const agent = this.activeAgents.find(a => a.id === agentId);
        if (!agent) return;
        
        this.showHudDialog(
            `🔧 ${agent.name.toUpperCase()} - EQUIPMENT`,
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 15px;">${agent.name}</h3>
                    <div style="color: #ccc; margin-bottom: 20px;">
                        Current Equipment: Basic Loadout<br>
                        Weapons: Standard Issue<br>
                        Armor: Light Protection
                    </div>
                    <p style="color: #ccc; font-style: italic;">
                        Advanced equipment system coming in future updates!<br>
                        For now, all agents use standard loadouts.
                    </p>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showSquadManagement(); } }
            ]
        );
}
    
CyberOpsGame.prototype.viewAgentDetails = function(agentId) {
        const agent = this.activeAgents.find(a => a.id === agentId);
        if (!agent) return;
        
        this.showHudDialog(
            `📋 ${agent.name.toUpperCase()} - PROFILE`,
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 15px;">${agent.name}</h3>
                    <div style="text-align: left; color: #ccc;">
                        <strong style="color: #00ffff;">Specialization:</strong> ${agent.specialization}<br>
                        <strong style="color: #00ffff;">Skills:</strong> ${agent.skills.join(', ')}<br>
                        <strong style="color: #00ffff;">Health:</strong> ${agent.health} HP<br>
                        <strong style="color: #00ffff;">Damage:</strong> ${agent.damage} DMG<br>
                        <strong style="color: #00ffff;">Speed:</strong> ${agent.speed} SPD<br>
                        <strong style="color: #00ffff;">Cost:</strong> ${agent.cost.toLocaleString()} credits<br>
                        <strong style="color: #00ffff;">Status:</strong> Active
                    </div>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showSquadManagement(); } }
            ]
        );
}
    
    // Equipment Shop System
// Shop - Now uses declarative dialog
CyberOpsGame.prototype.showShopDialog = function() {
    if (window.dialogManager && window.dialogManager.open) {
        window.dialogManager.open('shop');
    }
}

// Settings - Uses original implementation from game-settings.js
CyberOpsGame.prototype.showSettingsFromHub = function() {
    // Just call the original settings dialog
    this.showSettings();
}

// DEPRECATED - Old implementation kept for reference only
CyberOpsGame.prototype.showShopDialogOld = function() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Credits: ${this.credits.toLocaleString()}</div>`;
        
        content += '<h3 style="color: #00ffff; margin: 20px 0 15px 0;">WEAPONS</h3>';
        this.weapons.forEach(weapon => {
            const canBuy = this.credits >= weapon.cost;
            content += `
                <div style="background: ${canBuy ? 'rgba(0,255,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canBuy ? '#00ffff' : '#666'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: ${canBuy ? '#fff' : '#999'};">${weapon.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Owned: ${weapon.owned} | Damage: ${weapon.damage} | Type: ${weapon.type}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">${weapon.cost.toLocaleString()} credits</div>
                            <button onclick="game.buyItem('weapon', ${weapon.id})" 
                                    style="background: ${canBuy ? '#1e3c72' : '#666'}; 
                                           color: ${canBuy ? '#fff' : '#999'}; 
                                           border: 1px solid ${canBuy ? '#00ffff' : '#888'}; 
                                           padding: 8px 15px; border-radius: 4px; cursor: ${canBuy ? 'pointer' : 'not-allowed'};"
                                    ${!canBuy ? 'disabled' : ''}>
                                ${canBuy ? 'BUY' : 'INSUFFICIENT FUNDS'}
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '<h3 style="color: #ff00ff; margin: 20px 0 15px 0;">EQUIPMENT</h3>';
        this.equipment.forEach(item => {
            const canBuy = this.credits >= item.cost;
            let stats = '';
            if (item.protection) stats += `Protection: ${item.protection}`;
            if (item.hackBonus) stats += `Hack Bonus: ${item.hackBonus}%`;
            if (item.stealthBonus) stats += `Stealth Bonus: ${item.stealthBonus}%`;
            if (item.damage) stats += `Damage: ${item.damage}`;
            
            content += `
                <div style="background: ${canBuy ? 'rgba(255,0,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canBuy ? '#ff00ff' : '#666'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: ${canBuy ? '#fff' : '#999'};">${item.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Owned: ${item.owned} | ${stats}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #ff00ff; font-weight: bold; margin-bottom: 5px;">${item.cost.toLocaleString()} credits</div>
                            <button onclick="game.buyItem('equipment', ${item.id})" 
                                    style="background: ${canBuy ? '#1e3c72' : '#666'}; 
                                           color: ${canBuy ? '#fff' : '#999'}; 
                                           border: 1px solid ${canBuy ? '#ff00ff' : '#888'}; 
                                           padding: 8px 15px; border-radius: 4px; cursor: ${canBuy ? 'pointer' : 'not-allowed'};"
                                    ${!canBuy ? 'disabled' : ''}>
                                ${canBuy ? 'BUY' : 'INSUFFICIENT FUNDS'}
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '🛒 EQUIPMENT SHOP',
            content,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showArsenal(); } }
            ]
        );
}
    
// buyItem is now in game-equipment.js and uses InventoryService

// Generate world map content for dialog system
CyberOpsGame.prototype.generateWorldMapContent = function() {
    if (this.logger) this.logger.debug('🗺️ Generating world map content...');

    // Define world regions with mission data
    const regions = [
        {
            id: 'north_america',
            name: 'North America',
            control: 25,
            status: 'contested',
            cities: ['New York', 'Chicago', 'Los Angeles'],
            missions: this.missions ? this.missions.filter(m => m.region === 'north_america') : []
        },
        {
            id: 'europe',
            name: 'Europe',
            control: 15,
            status: 'hostile',
            cities: ['London', 'Berlin', 'Moscow'],
            missions: this.missions ? this.missions.filter(m => m.region === 'europe') : []
        },
        {
            id: 'asia',
            name: 'Asia',
            control: 10,
            status: 'hostile',
            cities: ['Tokyo', 'Beijing', 'Seoul'],
            missions: this.missions ? this.missions.filter(m => m.region === 'asia') : []
        },
        {
            id: 'south_america',
            name: 'South America',
            control: 35,
            status: 'friendly',
            cities: ['Rio', 'Buenos Aires', 'Bogota'],
            missions: this.missions ? this.missions.filter(m => m.region === 'south_america') : []
        },
        {
            id: 'africa',
            name: 'Africa',
            control: 5,
            status: 'locked',
            cities: ['Cairo', 'Lagos', 'Johannesburg'],
            missions: this.missions ? this.missions.filter(m => m.region === 'africa') : []
        },
        {
            id: 'oceania',
            name: 'Oceania',
            control: 20,
            status: 'contested',
            cities: ['Sydney', 'Melbourne', 'Auckland'],
            missions: this.missions ? this.missions.filter(m => m.region === 'oceania') : []
        }
    ];

    // Count completed missions
    const completedCount = this.completedMissions ? this.completedMissions.length : 0;
    const totalMissions = this.missions ? this.missions.length : 0;

    // Generate region HTML using CSS classes
    const regionCards = regions.map(region => {
        const statusClass = region.status === 'friendly' ? 'controlled' : '';
        const borderColor = {
            friendly: '#0f0',
            contested: '#ff0',
            hostile: '#f00',
            locked: '#666'
        }[region.status];

        const missionCount = region.missions.length;
        const completedInRegion = region.missions.filter(m =>
            this.completedMissions && this.completedMissions.includes(m.id)
        ).length;

        return `
            <div class="region-card ${statusClass}"
                 style="border-color: ${borderColor}; ${region.status === 'locked' ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                 ${region.status !== 'locked' ? `onclick="game.selectRegion('${region.id}')"` : ''}>
                <h3>${region.name}</h3>
                <div class="region-stats">
                    <p>Control: ${region.control}%</p>
                    <p>Status: ${region.status.toUpperCase()}</p>
                    <p>Cities: ${region.cities.join(', ')}</p>
                    <p>Missions: ${completedInRegion}/${missionCount}</p>
                </div>
                ${missionCount > 0 && region.status !== 'locked' ?
                    `<div class="mission-available">
                        <span class="mission-icon">⚡</span>
                        <p>Mission Available</p>
                    </div>` :
                    region.status === 'locked' ?
                    '<div style="color: #f00; margin-top: 10px; text-align: center;">🔒 Locked</div>' :
                    ''
                }
            </div>
        `;
    }).join('');

    const worldControl = regions.reduce((sum, r) => sum + r.control, 0) / regions.length;

    // Create HTML content using proper CSS classes
    let mapContent = '<div class="world-map-container">';
    mapContent += '<div class="map-header">';
    mapContent += '<h2>SYNDICATE GLOBAL CONTROL</h2>';
    mapContent += '<div class="control-bar">';
    mapContent += '<div class="control-fill" style="width: ' + worldControl + '%;"></div>';
    mapContent += '</div>';
    mapContent += '<div style="text-align: center; color: #0ff; margin: 10px 0;">';
    mapContent += 'Global Control: ' + Math.round(worldControl) + '% | ';
    mapContent += 'Missions: ' + completedCount + '/' + totalMissions + ' | ';
    mapContent += 'Access Level: L' + (Math.floor(completedCount / 3) + 1);
    mapContent += '</div>';
    mapContent += '</div>';

    mapContent += '<div class="regions-grid">';
    mapContent += regionCards;
    mapContent += '</div>';

    mapContent += '<div class="map-legend">';
    mapContent += '<span class="legend-item controlled">● Controlled</span>';
    mapContent += '<span class="legend-item contested">● Contested</span>';
    mapContent += '<span class="legend-item hostile">● Hostile</span>';
    mapContent += '</div>';
    mapContent += '</div>';

    if (this.logger) this.logger.debug('🗺️ Map HTML content length:', mapContent.length);

    // Return the HTML content for the dialog system
    return mapContent;
};

// Select a region from the world map
CyberOpsGame.prototype.selectRegion = function(regionId) {
    if (this.logger) this.logger.debug(`🗺️ Selected region: ${regionId}`);

    // Get missions for this region
    const regionMissions = this.missions ? this.missions.filter(m => m.region === regionId) : [];
    if (this.logger) this.logger.debug(`🗺️ Found ${regionMissions.length} missions in ${regionId}`);

    // Store selected region and its missions for filtering
    this.selectedRegion = regionId;
    this.filteredMissions = regionMissions;

    // Close world map dialog
    this.closeDialog();

    // Open mission selection dialog with filtered missions
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('mission-select-hub', {
            region: regionId,
            missions: regionMissions
        });
    }
};

// ============= New Dialog Manager Content Generators =============
