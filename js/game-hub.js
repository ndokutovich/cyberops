    // Syndicate Hub System
CyberOpsGame.prototype.showSyndicateHub = function() {
        // Hide all other screens
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('hallOfGlory').style.display = 'none';
        document.getElementById('intermissionDialog').classList.remove('show');
        document.getElementById('hudDialog').classList.remove('show');

        // Show hub
        document.getElementById('syndicateHub').style.display = 'flex';
        this.currentScreen = 'hub';
        
        // Log music continuation in hub
        if (this.currentLevelMusic) {
            console.log(`🎵 Level ${this.currentLevelMusic} music continues playing in Syndicate Hub`);
        }
        
        this.updateHubStats();
}
    
CyberOpsGame.prototype.updateHubStats = function() {
        console.log('🔍 updateHubStats called - checking data:');
        console.log('- this.missions:', this.missions ? this.missions.length : 'UNDEFINED');
        console.log('- this.activeAgents:', this.activeAgents ? this.activeAgents.length : 'UNDEFINED');
        console.log('- this.completedMissions:', this.completedMissions ? this.completedMissions.length : 'UNDEFINED');
        
        // EMERGENCY FIX: If missions is undefined, initialize it immediately
        if (!this.missions) {
            console.error('🚨 EMERGENCY: this.missions is undefined! Initializing now...');
            this.initializeHub();
        }
        
        // Update resource displays
        document.getElementById('hubCredits').textContent = this.credits.toLocaleString();
        document.getElementById('hubResearchPoints').textContent = this.researchPoints;
        document.getElementById('hubMissionsComplete').textContent = `${this.completedMissions.length}/${this.missions.length}`;
        document.getElementById('hubActiveAgents').textContent = this.activeAgents.length;
        
        // Update world control
        document.getElementById('worldControlPercent').textContent = `${this.worldControl}%`;
        document.getElementById('controlProgress').style.width = `${this.worldControl}%`;
        
        // Update status indicators
        const availableMissions = this.missions.length - this.completedMissions.length;
        document.getElementById('missionStatus').textContent = `${availableMissions} Available`;
        document.getElementById('agentStatus').textContent = `${this.activeAgents.length} Active`;
        document.getElementById('arsenalStatus').textContent = `${this.weapons.length + this.equipment.length} Items`;
        document.getElementById('researchStatus').textContent = `${Math.floor(this.researchPoints / 50)} Projects`;

        // Update fallen agents status
        const fallenCount = this.fallenAgents ? this.fallenAgents.length : 0;
        const fallenStatus = document.getElementById('fallenStatus');
        if (fallenStatus) {
            fallenStatus.textContent = fallenCount === 0 ? '0 Heroes' :
                                      fallenCount === 1 ? '1 Hero' :
                                      `${fallenCount} Heroes`;
        }
}
    
CyberOpsGame.prototype.showMissionsFromHub = function() {
        document.getElementById('syndicateHub').style.display = 'none';
        this.showMissionSelectDialog();
}
    
    // Fix mission briefing for hub flow
CyberOpsGame.prototype.startMissionFromHub = function(missionIndex) {
        const mission = this.missions[missionIndex];
        this.currentMissionIndex = missionIndex;
        this.showMissionBriefing(mission);
}
    
CyberOpsGame.prototype.showHallOfGlory = function() {
        // Hide other screens
        document.getElementById('syndicateHub').style.display = 'none';

        // Show Hall of Glory
        const hallScreen = document.getElementById('hallOfGlory');
        hallScreen.style.display = 'block';

        const noFallenMsg = document.getElementById('noFallenMessage');
        const fallenList = document.getElementById('fallenAgentsList');

        if (this.fallenAgents.length === 0) {
            noFallenMsg.style.display = 'block';
            fallenList.style.display = 'none';
        } else {
            noFallenMsg.style.display = 'none';
            fallenList.style.display = 'grid';
            fallenList.innerHTML = '';

            // Display each fallen agent
            this.fallenAgents.forEach(agent => {
                const agentCard = document.createElement('div');
                agentCard.className = 'fallen-agent-card';
                agentCard.innerHTML = `
                    <div class="fallen-agent-header">
                        <div class="fallen-agent-name">${agent.name}</div>
                        <div class="fallen-agent-class">${agent.specialization.toUpperCase()}</div>
                    </div>
                    <div class="fallen-agent-details">
                        <div class="fallen-detail">
                            <span class="detail-label">Fallen in:</span>
                            <span class="detail-value">${agent.fallenInMission}</span>
                        </div>
                        <div class="fallen-detail">
                            <span class="detail-label">Final words:</span>
                            <span class="detail-value">"${agent.finalWords}"</span>
                        </div>
                        <div class="fallen-detail">
                            <span class="detail-label">Skills:</span>
                            <span class="detail-value">${agent.skills.join(', ')}</span>
                        </div>
                    </div>
                    <div class="fallen-agent-footer">
                        Rest in peace, soldier
                    </div>
                `;
                fallenList.appendChild(agentCard);
            });
        }
}

CyberOpsGame.prototype.showAgentManagement = function() {
        this.showHudDialog(
            '👥 AGENT MANAGEMENT',
            this.generateAgentManagementContent(),
            [
                { text: 'HIRE AGENTS', action: () => this.showHiringDialog() },
                { text: 'MANAGE SQUAD', action: () => this.showSquadManagement() },
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
}
    
CyberOpsGame.prototype.generateAgentManagementContent = function() {
        let content = '<div style="max-height: 300px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE AGENTS</h3>';
        
        this.activeAgents.forEach(agent => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${agent.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Specialization: ${agent.specialization} | 
                        Skills: ${agent.skills.join(', ')} | 
                        Health: ${agent.health} | Damage: ${agent.damage}
                    </div>
                </div>`;
        });
        
        const availableAgents = this.availableAgents.filter(agent => !agent.hired);
        if (availableAgents.length > 0) {
            content += '<h3 style="color: #ff00ff; margin-top: 20px; margin-bottom: 15px;">AVAILABLE FOR HIRE</h3>';
            availableAgents.forEach(agent => {
                content += `
                    <div style="background: rgba(255,0,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                        <div style="font-weight: bold; color: #fff;">${agent.name}</div>
                        <div style="color: #ccc; font-size: 0.9em;">
                            Cost: ${agent.cost} credits | 
                            Skills: ${agent.skills.join(', ')} | 
                            Health: ${agent.health} | Damage: ${agent.damage}
                        </div>
                    </div>`;
            });
        }
        
        content += '</div>';
        return content;
}
    
CyberOpsGame.prototype.showArsenal = function() {
        this.showHudDialog(
            '🔫 ARSENAL & EQUIPMENT',
            this.generateArsenalContent(),
            [
                { text: 'BUY EQUIPMENT', action: () => this.showShopDialog() },
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
}
    
CyberOpsGame.prototype.generateArsenalContent = function() {
        let content = '<div style="max-height: 300px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">WEAPONS</h3>';
        
        this.weapons.forEach(weapon => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${weapon.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Owned: ${weapon.owned} | Damage: ${weapon.damage} | Type: ${weapon.type}
                    </div>
                </div>`;
        });
        
        content += '<h3 style="color: #ff00ff; margin-top: 20px; margin-bottom: 15px;">EQUIPMENT</h3>';
        this.equipment.forEach(item => {
            let stats = '';
            if (item.protection) stats += `Protection: ${item.protection}`;
            if (item.hackBonus) stats += `Hack Bonus: ${item.hackBonus}%`;
            if (item.stealthBonus) stats += `Stealth Bonus: ${item.stealthBonus}%`;
            if (item.damage) stats += `Damage: ${item.damage}`;
            
            content += `
                <div style="background: rgba(255,0,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${item.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Owned: ${item.owned} | ${stats}
                    </div>
                </div>`;
        });
        
        content += '</div>';
        return content;
}
    
CyberOpsGame.prototype.showResearchLab = function() {
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
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
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
        
        // Complete research
        this.researchPoints -= project.cost;
        this.completedResearch.push(projectId);
        
        // Apply research benefits
        this.applyResearchBenefits(project);
        
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
                { text: 'CONTINUE RESEARCH', action: () => this.showResearchLab() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
}
    
CyberOpsGame.prototype.applyResearchBenefits = function(project) {
        // Apply research benefits to game systems
        switch (project.id) {
            case 1: // Weapon Upgrades
                this.activeAgents.forEach(agent => {
                    agent.damage += 5;
                });
                break;
            case 2: // Stealth Technology
                // Stealth bonus will be applied during missions
                break;
            case 3: // Combat Systems
                this.activeAgents.forEach(agent => {
                    agent.health += 15;
                    agent.maxHealth = agent.health;
                });
                break;
            case 4: // Hacking Protocols
                // Hacking bonus will be applied during missions
                break;
            case 5: // Medical Systems
                // Auto-heal will be applied between missions
                this.applyMedicalHealing();
                break;
            case 6: // Advanced Tactics
                this.activeAgents.forEach(agent => {
                    agent.speed += 1;
                });
                break;
        }
}
    
    // Apply equipment bonuses to mission agents
CyberOpsGame.prototype.applyEquipmentBonuses = function(agent) {
        // Apply bonuses from owned equipment
        this.equipment.forEach(item => {
            if (item.owned > 0) {
                if (item.protection) agent.protection += item.protection;
                if (item.hackBonus) agent.hackBonus += item.hackBonus;
                if (item.stealthBonus) agent.stealthBonus += item.stealthBonus;
                if (item.damage) agent.damage += item.damage;
            }
        });
}
    
    // Apply research bonuses during missions
CyberOpsGame.prototype.applyMissionResearchBonuses = function(agent) {
        if (!this.completedResearch) return;
        
        this.completedResearch.forEach(researchId => {
            switch (researchId) {
                case 2: // Stealth Technology
                    agent.stealthBonus += 20;
                    break;
                case 4: // Hacking Protocols
                    agent.hackBonus += 25;
                    break;
            }
        });
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
            this.credits += this.currentMission.rewards.credits || 0;
            this.researchPoints += this.currentMission.rewards.researchPoints || 0;
            this.worldControl += this.currentMission.rewards.worldControl || 0;
            
            // Apply medical healing if researched
            this.applyMedicalHealing();
            
            // Update hub stats
            this.updateHubStats();
        }
}
    
CyberOpsGame.prototype.showIntelligence = function() {
        this.showHudDialog(
            '📡 INTELLIGENCE NETWORK',
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 20px;">CURRENT INTELLIGENCE REPORTS</h3>
                    <div style="text-align: left; margin: 15px 0;">
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #00ffff; margin: 10px 0;">
                            <strong style="color: #00ffff;">PRIORITY ALERT:</strong><br>
                            Increased security detected at government facilities
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #ff00ff; margin: 10px 0;">
                            <strong style="color: #ff00ff;">SURVEILLANCE:</strong><br>
                            New patrol patterns identified in industrial sectors
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #ffff00; margin: 10px 0;">
                            <strong style="color: #ffff00;">NETWORK CHATTER:</strong><br>
                            Enemy communications suggest major operation planning
                        </div>
                    </div>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
}
    
    // Agent Hiring System
CyberOpsGame.prototype.showHiringDialog = function() {
        const availableAgents = this.availableAgents.filter(agent => !agent.hired);
        
        if (availableAgents.length === 0) {
            this.showHudDialog(
                '👥 NO AGENTS AVAILABLE',
                'All available agents have already been hired!<br><br>Check back later for new recruits.',
                [{ text: 'OK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }]
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
                        <button onclick="game.hireAgent(${agent.id})" 
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
                { text: 'BACK', action: () => this.showAgentManagement() }
            ]
        );
}
    
CyberOpsGame.prototype.hireAgent = function(agentId) {
        const agent = this.availableAgents.find(a => a.id === agentId);
        if (!agent || agent.hired || this.credits < agent.cost) return;
        
        // Deduct credits and hire agent
        this.credits -= agent.cost;
        agent.hired = true;
        this.activeAgents.push(agent);
        
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
                { text: 'HIRE MORE', action: () => this.showHiringDialog() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
}
    
    // Squad Management System
CyberOpsGame.prototype.showSquadManagement = function() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE SQUAD MEMBERS</h3>';
        
        this.activeAgents.forEach(agent => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #00ffff;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">${agent.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Specialization: ${agent.specialization}<br>
                                Skills: ${agent.skills.join(', ')}<br>
                                Health: ${agent.health} | Damage: ${agent.damage} | Speed: ${agent.speed}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <button onclick="game.manageAgentEquipment(${agent.id})" 
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff; 
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">
                                EQUIP
                            </button>
                            <br>
                            <button onclick="game.viewAgentDetails(${agent.id})" 
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff; 
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">
                                DETAILS
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '⚙️ SQUAD MANAGEMENT',
            content,
            [
                { text: 'BACK', action: () => this.showAgentManagement() }
            ]
        );
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
                { text: 'BACK', action: () => this.showSquadManagement() }
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
                { text: 'BACK', action: () => this.showSquadManagement() }
            ]
        );
}
    
    // Equipment Shop System
CyberOpsGame.prototype.showShopDialog = function() {
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
                { text: 'BACK', action: () => this.showArsenal() }
            ]
        );
}
    
CyberOpsGame.prototype.buyItem = function(type, itemId) {
        const items = type === 'weapon' ? this.weapons : this.equipment;
        const item = items.find(i => i.id === itemId);
        
        if (!item || this.credits < item.cost) return;
        
        // Purchase item
        this.credits -= item.cost;
        item.owned += 1;
        
        this.showHudDialog(
            '✅ PURCHASE SUCCESSFUL',
            `${item.name} has been added to your arsenal!<br><br>
            <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${item.name}</strong><br>
                Type: ${item.type}<br>
                ${type === 'weapon' ? `Damage: ${item.damage}` : `Stats: Various bonuses`}<br>
                Now Owned: ${item.owned}
            </div>
            Credits Remaining: ${this.credits.toLocaleString()}`,
            [
                { text: 'BUY MORE', action: () => this.showShopDialog() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
}

