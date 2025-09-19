/**
 * Dialog Integration Adapter
 * Bridges the declarative dialog engine with existing game code
 * Provides backward compatibility while transitioning to fully declarative system
 */

// Integration adapter for CyberOpsGame
CyberOpsGame.prototype.initializeDeclarativeDialogs = function() {
    console.log('🎮 Initializing Declarative Dialog System');

    // Get the engine
    const engine = window.declarativeDialogEngine;
    if (!engine) {
        console.error('Declarative Dialog Engine not found!');
        return;
    }

    // Register game-specific content generators
    this.registerDialogGenerators(engine);

    // Register game-specific validators
    this.registerDialogValidators(engine);

    // Register game-specific actions
    this.registerDialogActions(engine);

    // Initialize with config if not already done
    if (!engine.config && window.DIALOG_CONFIG) {
        engine.initialize(window.DIALOG_CONFIG);
    }

    // Store reference
    this.dialogEngine = engine;

    console.log('✅ Declarative Dialog System ready');
};

// Register content generators
CyberOpsGame.prototype.registerDialogGenerators = function(engine) {
    // Agent overview
    engine.registerGenerator('generateAgentOverview', function() {
        let html = '<div class="agent-overview">';

        if (!this.activeAgents || this.activeAgents.length === 0) {
            html += '<p style="color: #888; text-align: center; padding: 20px;">No active agents. Hire agents to build your team.</p>';
        } else {
            html += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE AGENTS</h3>';
            this.activeAgents.forEach(agent => {
                html += `
                    <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                        <div style="font-weight: bold; color: #fff;">${agent.name}</div>
                        <div style="color: #ccc; font-size: 0.9em;">
                            Specialization: ${agent.specialization || 'Operative'} |
                            Health: ${agent.health}/${agent.maxHealth || 100} |
                            Damage: ${agent.damage || 25}
                        </div>
                    </div>
                `;
            });
        }

        // Available count
        const availableCount = this.availableAgents ?
            this.availableAgents.filter(a => !a.hired).length : 0;

        if (availableCount > 0) {
            html += `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #00ffff;">
                    <p style="color: #00ff00;">${availableCount} agents available for hire</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    });

    // Equipment overview
    engine.registerGenerator('generateEquipmentOverview', function() {
        let html = '<div class="equipment-overview">';

        const weaponCount = this.weapons ? this.weapons.reduce((sum, w) => sum + w.owned, 0) : 0;
        const equipmentCount = this.equipment ? this.equipment.reduce((sum, e) => sum + e.owned, 0) : 0;

        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 5px;">
                    <h4 style="color: #00ffff;">Weapons</h4>
                    <p style="font-size: 24px; color: #fff;">${weaponCount}</p>
                </div>
                <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 5px;">
                    <h4 style="color: #ff00ff;">Equipment</h4>
                    <p style="font-size: 24px; color: #fff;">${equipmentCount}</p>
                </div>
            </div>
        `;

        html += `<p style="color: #ffff00;">Credits: ${this.credits || 0}</p>`;
        html += '</div>';

        return html;
    });

    // Hall of Glory - memorial for fallen agents
    engine.registerGenerator('generateHallOfGlory', function() {
        let html = '<div class="hall-of-glory">';

        const fallenAgents = this.fallenAgents || [];

        if (fallenAgents.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">🎖️</div>
                    <h3 style="color: #888;">No fallen heroes yet</h3>
                    <p style="color: #666;">May your agents always return home</p>
                </div>
            `;
        } else {
            html += '<h3 style="color: #ff6666; margin-bottom: 15px;">FALLEN OPERATIVES</h3>';
            html += '<div style="max-height: 400px; overflow-y: auto;">';

            fallenAgents.forEach(agent => {
                html += `
                    <div style="background: rgba(255,0,0,0.1); padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid rgba(255,0,0,0.3);">
                        <div style="font-weight: bold; color: #ff6666; font-size: 18px;">${agent.name}</div>
                        <div style="color: #ccc; margin: 5px 0;">
                            ${agent.specialization || 'Operative'} |
                            Missions Completed: ${agent.missionsCompleted || 0}
                        </div>
                        <div style="color: #888; font-style: italic;">
                            ${agent.causeOfDeath || 'Fell in combat'}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Mission Selection - for hub mission selector
    engine.registerGenerator('generateMissionSelection', function() {
        let html = '<div class="mission-select-hub">';

        const missions = this.missions || [];
        const completedMissions = this.completedMissions || [];

        if (missions.length === 0) {
            html += '<p style="color: #888; text-align: center; padding: 40px;">No missions available.</p>';
        } else {
            html += '<div style="max-height: 500px; overflow-y: auto;">';

            missions.forEach((mission, index) => {
                const isCompleted = completedMissions.includes(mission.id);
                const isLocked = mission.locked || index > this.currentMissionIndex;

                html += `
                    <div style="background: ${isCompleted ? 'rgba(0,255,0,0.1)' : isLocked ? 'rgba(128,128,128,0.1)' : 'rgba(0,255,255,0.1)'};
                               padding: 15px; margin: 10px 0; border-radius: 8px;
                               border: 1px solid ${isCompleted ? '#00ff00' : isLocked ? '#666' : '#00ffff'};">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <div style="font-weight: bold; color: ${isCompleted ? '#00ff00' : '#fff'};">
                                    Mission ${mission.id}: ${mission.name || mission.title}
                                </div>
                                <div style="color: #ccc; margin: 10px 0;">
                                    ${mission.briefing || mission.description || 'No briefing available.'}
                                </div>
                                <div style="color: #888;">
                                    Reward: ${mission.rewards?.credits || 0} credits |
                                    RP: ${mission.rewards?.researchPoints || 0}
                                </div>
                            </div>
                            <div>
                                ${isCompleted ?
                                    '<button class="dialog-button" disabled>COMPLETED</button>' :
                                    isLocked ?
                                    '<button class="dialog-button" disabled>LOCKED</button>' :
                                    `<button class="dialog-button" onclick="game.startMissionFromHub(${index}); game.dialogEngine.closeAll();">SELECT</button>`}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Agent Management - merged view for agents
    engine.registerGenerator('generateAgentManagement', function() {
        let html = '<div class="agent-management">';

        if (!this.activeAgents || this.activeAgents.length === 0) {
            html += '<p style="color: #888; text-align: center; padding: 20px;">No active agents. Hire agents to build your team.</p>';
        } else {
            html += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE SQUAD</h3>';
            html += '<div style="max-height: 400px; overflow-y: auto;">';

            this.activeAgents.forEach(agent => {
                html += `
                    <div style="background: rgba(0,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 5px;">
                        <div style="font-weight: bold; color: #fff; font-size: 18px;">${agent.name}</div>
                        <div style="color: #ccc; margin: 5px 0;">
                            ${agent.specialization || 'Operative'} |
                            Health: ${agent.health}/${agent.maxHealth || 100} |
                            Damage: ${agent.damage || 25}
                        </div>
                    </div>
                `;
            });

            html += '</div>';
        }

        const availableCount = this.availableAgents ?
            this.availableAgents.filter(a => !a.hired).length : 0;

        if (availableCount > 0) {
            html += `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #00ffff;">
                    <p style="color: #00ff00;">${availableCount} agents available for hire</p>
                </div>
            `;
        }

        html += '</div>';
        return html;
    });

    // Intel Data - merged intel and missions view
    engine.registerGenerator('generateIntelData', function() {
        let html = '<div class="intel-data">';

        const totalIntel = this.totalIntelCollected || 0;
        const missionsAvailable = this.missions ?
            this.missions.filter(m => !this.completedMissions.includes(m.id)).length : 0;
        const completedCount = this.completedMissions ? this.completedMissions.length : 0;

        html += `
            <h3 style="color: #00ffff; margin-bottom: 15px;">INTELLIGENCE & MISSIONS</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #00ffff;">Intel Collected</h4>
                    <p style="font-size: 24px; color: #fff;">${totalIntel}</p>
                </div>
                <div style="background: rgba(0,255,0,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #00ff00;">Missions Complete</h4>
                    <p style="font-size: 24px; color: #fff;">${completedCount}</p>
                </div>
                <div style="background: rgba(255,165,0,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #ffa500;">Available</h4>
                    <p style="font-size: 24px; color: #fff;">${missionsAvailable}</p>
                </div>
            </div>
        `;

        // Show world control
        html += `
            <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #ff00ff;">World Control</span>
                    <span style="font-size: 24px; color: #ffff00;">${this.worldControl || 0}%</span>
                </div>
            </div>
        `;

        html += '</div>';
        return html;
    });

    // Research Lab - full research view
    engine.registerGenerator('generateResearchLab', function() {
        let html = '<div class="research-lab">';

        html += `<h3 style="color: #00ffff; margin-bottom: 15px;">RESEARCH POINTS: ${this.researchPoints || 0}</h3>`;

        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents' }
        ];

        html += '<div style="max-height: 400px; overflow-y: auto;">';

        researchProjects.forEach(project => {
            const canAfford = this.researchPoints >= project.cost;
            const completed = this.completedResearch && this.completedResearch.includes(project.id);

            html += `
                <div style="background: ${completed ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,255,0.1)'};
                           padding: 15px; margin: 10px 0; border-radius: 8px;
                           border: 1px solid ${completed ? '#00ff00' : '#ff00ff'};">
                    <div style="display: flex; justify-content: space-between;">
                        <div>
                            <div style="font-weight: bold; color: ${completed ? '#00ff00' : '#fff'};">
                                ${project.name} ${completed ? '✅' : ''}
                            </div>
                            <div style="color: #ccc;">${project.description}</div>
                            <div style="color: #ff00ff;">Cost: ${project.cost} RP</div>
                        </div>
                        <div>
                            ${completed ?
                                '<span style="color: #00ff00;">COMPLETED</span>' :
                                canAfford ?
                                `<button class="dialog-button" onclick="game.startResearch(${project.id})">RESEARCH</button>` :
                                '<span style="color: #666;">INSUFFICIENT</span>'}
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        html += '</div>';
        return html;
    });

    // Research Projects list
    engine.registerGenerator('researchProjects', function() {
        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons', category: 'combat' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate', category: 'stealth' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents', category: 'combat' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed', category: 'tech' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions', category: 'support' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents', category: 'tactical' }
        ];

        let html = '<div style="max-height: 400px; overflow-y: auto;">';
        html += `<div style="color: #00ffff; margin-bottom: 20px;">Available Research Points: <span style="font-size: 1.5em; font-weight: bold;">${this.researchPoints || 0}</span></div>`;

        researchProjects.forEach(project => {
            const canAfford = this.researchPoints >= project.cost;
            const completed = this.completedResearch && this.completedResearch.includes(project.id);

            html += `
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
                            <button class="dialog-button research-btn" data-project-id="${project.id}"
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

        html += '</div>';

        // Add click handlers
        setTimeout(() => {
            document.querySelectorAll('.research-btn:not([disabled])').forEach(btn => {
                btn.onclick = (e) => {
                    const projectId = parseInt(e.target.dataset.projectId);
                    if (game.startResearch) {
                        game.startResearch(projectId);
                    }
                };
            });
        }, 100);

        return html;
    });

    // Research overview
    engine.registerGenerator('generateResearchOverview', function() {
        let html = '<div class="research-overview">';

        html += `<h3 style="color: #00ffff;">Research Points: ${this.researchPoints || 0}</h3>`;

        const completedCount = this.completedResearch ? this.completedResearch.length : 0;
        const totalProjects = 6; // From research projects list

        html += `
            <div style="margin: 20px 0;">
                <div style="background: rgba(0,0,0,0.3); height: 30px; border-radius: 15px; overflow: hidden;">
                    <div style="background: linear-gradient(90deg, #00ff00, #00ffff);
                                width: ${(completedCount / totalProjects) * 100}%;
                                height: 100%;
                                display: flex;
                                align-items: center;
                                justify-content: center;">
                        <span style="color: #000; font-weight: bold;">${completedCount}/${totalProjects}</span>
                    </div>
                </div>
            </div>
        `;

        if (completedCount > 0) {
            html += '<h4 style="color: #00ff00;">Completed Research:</h4>';
            html += '<ul style="color: #ccc;">';
            // List completed research
            html += '</ul>';
        }

        html += '</div>';
        return html;
    });

    // Intel overview
    engine.registerGenerator('generateIntelOverview', function() {
        let html = '<div class="intel-overview">';

        const totalIntel = this.totalIntelCollected || 0;
        const reportsUnlocked = this.unlockedIntelReports ? this.unlockedIntelReports.length : 0;
        const missionsAvailable = this.missions ?
            this.missions.filter(m => !this.completedMissions.includes(m.id)).length : 0;

        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #00ffff;">Intel Collected</h4>
                    <p style="font-size: 24px; color: #fff;">${totalIntel}</p>
                </div>
                <div style="background: rgba(0,255,0,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #00ff00;">Reports Unlocked</h4>
                    <p style="font-size: 24px; color: #fff;">${reportsUnlocked}</p>
                </div>
                <div style="background: rgba(255,165,0,0.1); padding: 15px; border-radius: 5px; text-align: center;">
                    <h4 style="color: #ffa500;">Missions Available</h4>
                    <p style="font-size: 24px; color: #fff;">${missionsAvailable}</p>
                </div>
            </div>
        `;

        html += '</div>';
        return html;
    });

    // Settings form with full keyboard layout
    engine.registerGenerator('generateSettingsForm', function() {
        let html = '<div class="settings-form" style="max-height: 500px; overflow-y: auto;">';

        // Volume Controls
        html += `
            <h3 style="color: #00ffff; border-bottom: 1px solid #00ffff; padding-bottom: 10px; margin-bottom: 20px;">🔊 AUDIO SETTINGS</h3>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">Master Volume</label>
                <input type="range" min="0" max="100" value="${(this.masterVolume || 0.7) * 100}"
                       id="master-volume" onchange="game.setMasterVolume(this.value)" style="width: 100%;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">Music Volume</label>
                <input type="range" min="0" max="100" value="${(this.musicVolume || 0.5) * 100}"
                       id="music-volume" onchange="game.setMusicVolume(this.value)" style="width: 100%;">
            </div>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">SFX Volume</label>
                <input type="range" min="0" max="100" value="${(this.sfxVolume || 0.5) * 100}"
                       id="sfx-volume" onchange="game.setSFXVolume(this.value)" style="width: 100%;">
            </div>
        `;

        // Display Settings
        html += `
            <h3 style="color: #00ffff; border-bottom: 1px solid #00ffff; padding-bottom: 10px; margin: 30px 0 20px 0;">🖥️ DISPLAY SETTINGS</h3>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">
                    <input type="checkbox" id="show-fps" ${this.showFPS ? 'checked' : ''} onchange="game.toggleFPS(this.checked)">
                    Show FPS Counter
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">
                    <input type="checkbox" id="show-debug" ${this.debugMode ? 'checked' : ''} onchange="game.toggleDebugMode(this.checked)">
                    Debug Mode
                </label>
            </div>
        `;

        // Keyboard Controls
        html += `
            <h3 style="color: #00ffff; border-bottom: 1px solid #00ffff; padding-bottom: 10px; margin: 30px 0 20px 0;">⌨️ KEYBOARD CONTROLS</h3>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">WASD/Arrows</span> - Move camera</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">Space</span> - Center on selected</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">Tab</span> - Cycle agents</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">1-6</span> - Select agent</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">H</span> - Hack/Interact</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">G</span> - Use grenade</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">E</span> - Toggle 3D mode</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">Z</span> - Game speed</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">J</span> - Mission list</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">P/Esc</span> - Pause menu</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">+/-</span> - Zoom in/out</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">F</span> - Follow mode</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">Shift+Click</span> - Waypoint</div>
                    <div style="color: #fff;"><span style="color: #00ff00; font-weight: bold;">Ctrl+[1-6]</span> - Squad group</div>
                </div>
            </div>
        `;

        // Game Settings
        html += `
            <h3 style="color: #00ffff; border-bottom: 1px solid #00ffff; padding-bottom: 10px; margin: 30px 0 20px 0;">🎮 GAMEPLAY</h3>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">
                    <input type="checkbox" id="auto-save" ${this.autosaveEnabled ? 'checked' : ''} onchange="game.toggleAutosave(this.checked)">
                    Enable Autosave
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <label style="color: #00ffff;">
                    <input type="checkbox" id="turn-based" ${this.turnBasedMode ? 'checked' : ''} onchange="game.toggleTurnBased(this.checked)">
                    Turn-Based Mode (Experimental)
                </label>
            </div>
            <div style="margin-bottom: 20px;">
                <button class="dialog-button" onclick="game.resetSettings()" style="background: #ff0000; border-color: #ff0000;">
                    RESET TO DEFAULTS
                </button>
            </div>
        `;

        html += '</div>';
        return html;
    });

    // NPC dialog
    engine.registerGenerator('generateNPCDialog', function() {
        if (!this.currentNPC) {
            return '<p>No NPC selected</p>';
        }

        return `
            <div class="npc-text">
                ${this.currentNPC.currentDialog || 'Hello, agent.'}
            </div>
        `;
    });

    // Loadouts content
    engine.registerGenerator('generateLoadoutsContent', function() {
        let html = '<div class="loadouts-content">';

        // Initialize equipment system if needed
        if (!this.agentLoadouts) {
            console.log('📦 Initializing equipment system in loadouts dialog...');
            this.initializeEquipmentSystem();
        }

        // Also ensure loadouts exist for all current agents
        if (this.activeAgents && this.activeAgents.length > 0 && this.agentLoadouts) {
            this.activeAgents.forEach(agent => {
                if (!this.agentLoadouts[agent.id]) {
                    this.agentLoadouts[agent.id] = {
                        weapon: null,
                        armor: null,
                        utility: null,
                        special: null
                    };
                    console.log(`📦 Created loadout for ${agent.name} (ID: ${agent.id})`);
                }
            });
        }

        if (!this.activeAgents || this.activeAgents.length === 0) {
            html += '<p style="color: #888;">No agents to equip. Hire agents first.</p>';
        } else {
            html += '<h3 style="color: #00ffff;">Agent Equipment Management</h3>';

            // Show equipment inventory summary
            const weaponCount = this.weapons ? this.weapons.reduce((sum, w) => sum + w.owned, 0) : 0;
            const armorCount = this.equipment ? this.equipment.filter(e => e.type === 'armor').reduce((sum, e) => sum + e.owned, 0) : 0;

            html += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                        <div style="color: #888; font-size: 0.9em;">Available Weapons</div>
                        <div style="color: #00ffff; font-size: 1.5em;">${weaponCount}</div>
                    </div>
                    <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
                        <div style="color: #888; font-size: 0.9em;">Available Armor</div>
                        <div style="color: #00ffff; font-size: 1.5em;">${armorCount}</div>
                    </div>
                </div>
            `;

            console.log('📦 Displaying loadouts for agents:', this.activeAgents.map(a => `${a.name} (ID: ${a.id})`));
            console.log('📦 Current agentLoadouts:', this.agentLoadouts);

            html += '<div style="max-height: 300px; overflow-y: auto;">';
            this.activeAgents.forEach(agent => {
                const loadout = this.agentLoadouts[agent.id] || {};
                console.log(`📦 Agent ${agent.name} (ID: ${agent.id}) loadout:`, loadout);

                // Calculate equipped items count
                let equippedCount = 0;
                if (loadout.weapon) equippedCount++;
                if (loadout.armor) equippedCount++;
                if (loadout.utility) equippedCount++;

                html += `
                    <div style="background: rgba(0,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid rgba(0,255,255,0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div>
                                <div style="font-weight: bold; color: #fff; font-size: 1.1em;">${agent.name}</div>
                                <div style="color: #888; font-size: 0.9em;">
                                    ${agent.specialization || 'Operative'} |
                                    HP: ${agent.health}/${agent.maxHealth || 100}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #00ff00; font-size: 0.9em;">
                                    ${equippedCount}/3 Equipped
                                </div>
                            </div>
                        </div>

                        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px;">
                `;

                // Show current equipment
                if (loadout.weapon && this.getItemById) {
                    const weapon = this.getItemById('weapon', loadout.weapon);
                    if (weapon) {
                        html += `<div style="color: #ffff00; font-size: 0.9em; margin: 3px 0;">🔫 ${weapon.name}</div>`;
                    }
                }
                if (loadout.armor && this.getItemById) {
                    const armor = this.getItemById('armor', loadout.armor);
                    if (armor) {
                        html += `<div style="color: #00ffff; font-size: 0.9em; margin: 3px 0;">🛡️ ${armor.name}</div>`;
                    }
                }
                if (loadout.utility && this.getItemById) {
                    const utility = this.getItemById('utility', loadout.utility);
                    if (utility) {
                        html += `<div style="color: #ff00ff; font-size: 0.9em; margin: 3px 0;">🔧 ${utility.name}</div>`;
                    }
                }

                if (equippedCount === 0) {
                    html += '<div style="color: #666; font-size: 0.9em;">No equipment</div>';
                }

                html += `
                        </div>

                        <button class="dialog-button"
                                data-action="execute:showEquipmentForAgent:${agent.id}"
                                style="margin-top: 10px; width: 100%;">
                            MANAGE EQUIPMENT
                        </button>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Sell items content
    engine.registerGenerator('generateSellItemsContent', function() {
        let html = '<div class="sell-items-content">';

        const sellableItems = [];
        if (this.weapons) {
            this.weapons.forEach(w => {
                if (w.owned > 0) sellableItems.push({ ...w, type: 'weapon' });
            });
        }
        if (this.equipment) {
            this.equipment.forEach(e => {
                if (e.owned > 0) sellableItems.push({ ...e, type: 'equipment' });
            });
        }

        if (sellableItems.length === 0) {
            html += '<p style="color: #888;">No items to sell.</p>';
        } else {
            html += '<h3 style="color: #ff6666;">Items Available to Sell</h3>';
            sellableItems.forEach(item => {
                const sellPrice = Math.floor((item.cost || 100) * 0.5);
                html += `
                    <div style="background: rgba(255,0,0,0.1); padding: 10px; margin: 10px 0; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <div style="font-weight: bold;">${item.name}</div>
                                <div style="color: #aaa;">Owned: ${item.owned} | Type: ${item.type}</div>
                            </div>
                            <div>
                                <div style="color: #ffff00;">Sell for: ${sellPrice} credits</div>
                                <button class="dialog-button" style="margin-top: 5px;">SELL</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>';
        return html;
    });

    // NPC choices
    engine.registerGenerator('generateNPCChoices', function() {
        if (!this.currentNPC || !this.currentNPC.choices) {
            return [{ text: 'Continue', action: 'close' }];
        }

        return this.currentNPC.choices.map(choice => ({
            text: choice.text,
            action: `execute:selectNPCChoice:${choice.id}`
        }));
    });

    // Weapon selection
    engine.registerGenerator('generateWeaponSelection', function() {
        const agentId = window.declarativeDialogEngine.stateData['agent-equipment']?.dynamicId;
        if (!agentId) return '<p style="color: #888;">No agent selected</p>';

        const agent = this.activeAgents.find(a => a.id === parseInt(agentId));
        if (!agent) return '<p style="color: #888;">Agent not found</p>';

        let html = '<div class="weapon-selection">';
        html += `<h4 style="color: #00ffff; margin-bottom: 15px;">Select Weapon for ${agent.name}</h4>`;

        if (!this.weapons || this.weapons.length === 0) {
            html += '<p style="color: #888;">No weapons available</p>';
        } else {
            html += '<div style="max-height: 400px; overflow-y: auto;">';

            this.weapons.forEach(weapon => {
                if (weapon.owned > 0) {
                    const isEquipped = this.agentLoadouts?.[agentId]?.weapon === weapon.id;

                    html += `
                        <div style="background: rgba(255,255,0,0.05); padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid rgba(255,255,0,0.3);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: bold; color: #ffff00;">${weapon.name}</div>
                                    <div style="color: #ccc; font-size: 0.9em;">
                                        Damage: ${weapon.damage || 10} |
                                        Range: ${weapon.range || 'Medium'} |
                                        Owned: ${weapon.owned}
                                    </div>
                                </div>
                                ${isEquipped
                                    ? '<span style="color: #00ff00;">✓ EQUIPPED</span>'
                                    : `<button class="dialog-button" data-action="execute:equipWeapon:${agentId}:${weapon.id}">EQUIP</button>`
                                }
                            </div>
                        </div>
                    `;
                }
            });

            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Armor selection
    engine.registerGenerator('generateArmorSelection', function() {
        const agentId = window.declarativeDialogEngine.stateData['agent-equipment']?.dynamicId;
        if (!agentId) return '<p style="color: #888;">No agent selected</p>';

        const agent = this.activeAgents.find(a => a.id === parseInt(agentId));
        if (!agent) return '<p style="color: #888;">Agent not found</p>';

        let html = '<div class="armor-selection">';
        html += `<h4 style="color: #00ffff; margin-bottom: 15px;">Select Armor for ${agent.name}</h4>`;

        const armorItems = this.equipment?.filter(e => e.type === 'armor') || [];

        if (armorItems.length === 0) {
            html += '<p style="color: #888;">No armor available</p>';
        } else {
            html += '<div style="max-height: 400px; overflow-y: auto;">';

            armorItems.forEach(armor => {
                if (armor.owned > 0) {
                    const isEquipped = this.agentLoadouts?.[agentId]?.armor === armor.id;

                    html += `
                        <div style="background: rgba(0,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid rgba(0,255,255,0.3);">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-weight: bold; color: #00ffff;">${armor.name}</div>
                                    <div style="color: #ccc; font-size: 0.9em;">
                                        Protection: ${armor.protection || 5} |
                                        Weight: ${armor.weight || 'Medium'} |
                                        Owned: ${armor.owned}
                                    </div>
                                </div>
                                ${isEquipped
                                    ? '<span style="color: #00ff00;">✓ EQUIPPED</span>'
                                    : `<button class="dialog-button" data-action="execute:equipArmor:${agentId}:${armor.id}">EQUIP</button>`
                                }
                            </div>
                        </div>
                    `;
                }
            });

            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Agent equipment
    engine.registerGenerator('generateAgentEquipment', function() {
        const agentId = window.declarativeDialogEngine.stateData['agent-equipment']?.dynamicId;

        if (!agentId) {
            return '<p style="color: #888;">No agent selected</p>';
        }

        const agent = this.activeAgents.find(a => a.id === parseInt(agentId));

        if (!agent) {
            return '<p style="color: #888;">Agent not found</p>';
        }

        let html = '<div class="agent-equipment-detail">';

        // Agent info
        html += `
            <div style="background: rgba(0,255,255,0.1); padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h3 style="color: #00ffff; margin-bottom: 10px;">${agent.name}</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>Health: ${agent.health}/${agent.maxHealth || 100}</div>
                    <div>Damage: ${agent.damage || 25}</div>
                    <div>Speed: ${agent.speed || 1}</div>
                    <div>Specialization: ${agent.specialization || 'Operative'}</div>
                </div>
            </div>
        `;

        // Current equipment
        html += `
            <h4 style="color: #00ff00; margin-bottom: 10px;">Current Equipment</h4>
            <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px;">
        `;

        if (agent.weapon || agent.armor || agent.gadget) {
            if (agent.weapon) {
                html += `<div style="margin: 5px 0;">🔫 Weapon: ${agent.weapon.name}</div>`;
            }
            if (agent.armor) {
                html += `<div style="margin: 5px 0;">🛡️ Armor: ${agent.armor.name}</div>`;
            }
            if (agent.gadget) {
                html += `<div style="margin: 5px 0;">🔧 Gadget: ${agent.gadget.name}</div>`;
            }
        } else {
            html += '<p style="color: #888;">No equipment equipped</p>';
        }

        html += '</div>';
        html += '</div>';

        return html;
    });
    // Intel reports generator
    engine.registerGenerator('generateIntelReports', function() {
        let html = '<div class="intel-reports">';

        if (!this.unlockedIntelReports || this.unlockedIntelReports.length === 0) {
            html += '<p style="color: #888; text-align: center; padding: 20px;">No intel reports unlocked. Complete missions to gather intel.</p>';
        } else {
            html += '<h4 style="color: #00ffff; margin-bottom: 15px;">UNLOCKED INTEL REPORTS</h4>';

            html += '<div style="max-height: 400px; overflow-y: auto;">';
            this.unlockedIntelReports.forEach(report => {
                html += `
                    <div style="background: rgba(0,255,255,0.05); padding: 15px; margin: 10px 0; border-radius: 5px; border: 1px solid rgba(0,255,255,0.2);">
                        <div style="font-weight: bold; color: #00ffff; margin-bottom: 10px;">${report.title}</div>
                        <div style="color: #ccc; font-size: 0.9em; line-height: 1.5;">${report.content}</div>
                        <div style="color: #888; font-size: 0.8em; margin-top: 10px;">Source: ${report.source || 'Unknown'}</div>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(0,255,255,0.3);">
                <div style="color: #ffff00;">Total Intel Collected: ${this.totalIntelCollected || 0}</div>
            </div>
        `;

        html += '</div>';
        return html;
    });

    // Campaign progress generator
    engine.registerGenerator('generateCampaignProgress', function() {
        let html = '<div class="campaign-progress">';

        const totalMissions = this.missions ? this.missions.length : 0;
        const completedMissions = this.completedMissions ? this.completedMissions.length : 0;
        const progressPercent = totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0;

        html += `
            <h4 style="color: #00ffff; margin-bottom: 20px;">CAMPAIGN STATUS</h4>

            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>Mission Progress</span>
                        <span style="color: #00ff00;">${completedMissions}/${totalMissions}</span>
                    </div>
                    <div style="background: rgba(0,0,0,0.5); height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #00ff00, #00ffff);
                                    width: ${progressPercent}%;
                                    height: 100%;
                                    transition: width 0.3s;"></div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
                    <div>
                        <div style="color: #888; font-size: 0.9em;">World Control</div>
                        <div style="color: #ffff00; font-size: 1.5em;">${this.worldControl || 0}%</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 0.9em;">Enemies Defeated</div>
                        <div style="color: #ff0000; font-size: 1.5em;">${this.totalEnemiesDefeated || 0}</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 0.9em;">Credits Earned</div>
                        <div style="color: #00ff00; font-size: 1.5em;">${this.totalCreditsEarned || 0}</div>
                    </div>
                    <div>
                        <div style="color: #888; font-size: 0.9em;">Total Play Time</div>
                        <div style="color: #fff; font-size: 1.5em;">${Math.floor((this.totalCampaignTime || 0) / 60)}h</div>
                    </div>
                </div>
            </div>
        `;

        // Show recent completed missions
        if (this.completedMissions && this.completedMissions.length > 0) {
            html += '<h5 style="color: #00ff00; margin-bottom: 10px;">Recent Victories</h5>';
            html += '<div style="max-height: 200px; overflow-y: auto;">';

            const recentMissions = this.completedMissions.slice(-5).reverse();
            recentMissions.forEach(missionId => {
                const mission = this.missions?.find(m => m.id === missionId);
                if (mission) {
                    html += `
                        <div style="background: rgba(0,255,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                            <span style="color: #00ff00;">✓</span> ${mission.name}
                        </div>
                    `;
                }
            });

            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Tech tree generator
    engine.registerGenerator('generateTechTree', function() {
        let html = '<div class="tech-tree">';

        html += '<h4 style="color: #00ffff; margin-bottom: 15px;">RESEARCH TREE</h4>';

        // Placeholder tech tree - would be loaded from campaign
        const techCategories = [
            { name: 'Weapons', color: '#ff0000', techs: ['Laser Rifle', 'Plasma Cannon', 'EMP Grenade'] },
            { name: 'Armor', color: '#00ffff', techs: ['Kevlar Vest', 'Nanofiber Suit', 'Power Armor'] },
            { name: 'Cybernetics', color: '#ff00ff', techs: ['Neural Link', 'Augmented Eyes', 'Reflex Booster'] },
            { name: 'Hacking', color: '#00ff00', techs: ['Firewall Breaker', 'Virus Upload', 'System Override'] }
        ];

        techCategories.forEach(category => {
            html += `
                <div style="margin-bottom: 20px;">
                    <h5 style="color: ${category.color}; margin-bottom: 10px;">${category.name}</h5>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            `;

            category.techs.forEach(tech => {
                const isUnlocked = this.completedResearch?.includes(tech);
                html += `
                    <div style="background: rgba(255,255,255,0.05);
                                padding: 10px;
                                border-radius: 5px;
                                border: 1px solid ${isUnlocked ? category.color : '#333'};
                                opacity: ${isUnlocked ? '1' : '0.5'};">
                        ${isUnlocked ? '✓ ' : ''}${tech}
                    </div>
                `;
            });

            html += '</div></div>';
        });

        html += '</div>';
        return html;
    });

    // Research progress generator
    engine.registerGenerator('generateResearchProgress', function() {
        let html = '<div class="research-progress">';

        const currentPoints = this.researchPoints || 0;
        const completedCount = this.completedResearch?.length || 0;

        html += `
            <h4 style="color: #00ffff; margin-bottom: 20px;">RESEARCH STATUS</h4>

            <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="color: #888; font-size: 0.9em;">Available Points</div>
                    <div style="color: #00ffff; font-size: 3em; font-weight: bold;">${currentPoints}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 5px;">
                        <div style="color: #888; font-size: 0.9em;">Projects Completed</div>
                        <div style="color: #00ff00; font-size: 2em;">${completedCount}</div>
                    </div>
                    <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 5px;">
                        <div style="color: #888; font-size: 0.9em;">Total Points Spent</div>
                        <div style="color: #ff00ff; font-size: 2em;">${completedCount * 100}</div>
                    </div>
                </div>
            </div>
        `;

        if (this.activeResearch) {
            html += `
                <div style="margin-top: 20px;">
                    <h5 style="color: #ffff00;">Active Research</h5>
                    <div style="background: rgba(255,255,0,0.1); padding: 15px; border-radius: 5px;">
                        <div style="font-weight: bold;">${this.activeResearch.name}</div>
                        <div style="color: #888; font-size: 0.9em;">Progress: ${this.activeResearch.progress}%</div>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    });

    // Pause menu content generator
    engine.registerGenerator('generatePauseMenuContent', function() {
        let html = '<div style="text-align: center;">';

        if (this.pauseMenuData) {
            html += `
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #fff; margin-bottom: 15px;">Mission Status</h3>
                    <div style="color: #ccc;">
                        <div>Mission: ${this.pauseMenuData.missionTitle}</div>
                        <div>Time: ${this.pauseMenuData.missionTime}</div>
                        <div>Agents Alive: ${this.pauseMenuData.agentsAlive}/${this.pauseMenuData.totalAgents}</div>
                        <div>Enemies Remaining: ${this.pauseMenuData.enemiesRemaining}/${this.pauseMenuData.totalEnemies}</div>
                    </div>
                </div>
            `;
        } else {
            html += '<p style="color: #888;">Game is paused</p>';
        }

        html += '</div>';
        return html;
    });

    // Save/Load UI generator
    engine.registerGenerator('generateSaveLoadUI', function() {
        let html = '<div class="save-load-ui">';

        html += `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <h4 style="color: #00ff00; margin-bottom: 15px;">SAVE GAME</h4>
                    <div style="background: rgba(0,255,0,0.05); padding: 15px; border-radius: 5px;">
                        <input type="text"
                               id="save-name-input"
                               placeholder="Enter save name..."
                               style="width: 100%; padding: 10px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid #00ff00; border-radius: 5px; margin-bottom: 10px;">
                        <button class="dialog-button" onclick="game.saveGameWithName(document.getElementById('save-name-input').value)">
                            SAVE GAME
                        </button>
                    </div>
                </div>

                <div>
                    <h4 style="color: #00ffff; margin-bottom: 15px;">LOAD GAME</h4>
                    <div style="background: rgba(0,255,255,0.05); padding: 15px; border-radius: 5px; max-height: 300px; overflow-y: auto;">
        `;

        // List saved games
        const saves = this.getSavedGames ? this.getSavedGames() : [];
        if (saves.length === 0) {
            html += '<p style="color: #888;">No saved games found</p>';
        } else {
            saves.forEach((save, index) => {
                html += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-weight: bold;">${save.name || `Save ${index + 1}`}</div>
                                <div style="color: #888; font-size: 0.8em;">${save.date || 'Unknown date'}</div>
                            </div>
                            <button class="dialog-button" onclick="game.loadGameSlot(${index})">LOAD</button>
                        </div>
                    </div>
                `;
            });
        }

        html += `
                    </div>
                </div>
            </div>

            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                <div style="color: #888; font-size: 0.9em; text-align: center;">
                    Autosave: ${this.autosaveEnabled ? 'Enabled' : 'Disabled'}
                </div>
            </div>
        `;

        html += '</div>';
        return html;
    });
};

// Register validators
CyberOpsGame.prototype.registerDialogValidators = function(engine) {
    // Has agents
    engine.registerValidator('hasAgents', function() {
        return this.activeAgents && this.activeAgents.length > 0;
    });

    // Has credits
    engine.registerValidator('hasCredits', function() {
        return this.credits > 0;
    });

    // Has research points
    engine.registerValidator('hasResearchPoints', function() {
        return this.researchPoints > 0;
    });

    // Agent selected
    engine.registerValidator('agentSelected', function() {
        return window.declarativeDialogEngine.stateData.selectedAgent != null;
    });

    // Can afford selected item
    engine.registerValidator('canAffordSelectedItem', function() {
        const item = window.declarativeDialogEngine.stateData.selectedItem;
        return item && this.credits >= item.price;
    });
};

// Register action handlers
CyberOpsGame.prototype.registerDialogActions = function(engine) {
    const game = this;

    // Hire agent
    engine.registerAction('hireAgent', function(agentId, context) {
        if (!agentId) {
            agentId = this.stateData.selectedAgent?.id;
        }

        const agent = game.availableAgents.find(a => a.id === parseInt(agentId));
        if (agent && !agent.hired && game.credits >= agent.cost) {
            game.credits -= agent.cost;
            agent.hired = true;
            game.activeAgents.push(agent);
            game.updateHubStats();

            // Show success notification
            this.navigateTo('hire-success', { agent });

            // Return to hire list after delay
            setTimeout(() => {
                this.back();
                this.actionRegistry.get('refresh')();
            }, 2000);
        }
    });

    // Purchase item
    engine.registerAction('purchaseItem', function(itemId, context) {
        const item = this.stateData.selectedItem;
        if (item && game.credits >= item.price) {
            game.credits -= item.price;

            if (item.type === 'weapon' && game.weapons) {
                const weapon = game.weapons.find(w => w.id === item.id);
                if (weapon) weapon.owned++;
            } else if (game.equipment) {
                const equip = game.equipment.find(e => e.id === item.id);
                if (equip) equip.owned++;
            }

            game.updateHubStats();

            // Show success and return
            setTimeout(() => {
                this.back();
                this.actionRegistry.get('refresh')();
            }, 1500);
        }
    });

    // Resume game
    engine.registerAction('resumeGame', function() {
        if (game.isPaused) {
            game.resumeFromPause();
        }
        this.closeAll();
    });

    // Exit to hub
    engine.registerAction('exitToHub', function() {
        this.closeAll();
        game.backToMainMenu();
        setTimeout(() => {
            game.showSyndicateHub();
        }, 100);
    });

    // Start mission
    engine.registerAction('startMission', function(missionId) {
        const mission = this.stateData.selectedMission;
        if (mission) {
            this.closeAll();
            game.startMissionFromHub(mission.index);
        }
    });

    // Select RPG agent for character sheet
    engine.registerAction('selectRPGAgent', function(agentId) {
        const agent = game.activeAgents.find(a => a.id === parseInt(agentId));
        if (agent) {
            game.selectedRPGAgent = agent;
            // Refresh the current dialog
            if (this.renderState) {
                this.renderState(this.currentState.id, this.stateData);
            }
        }
    });

    // Open equipment manager from character sheet
    engine.registerAction('openEquipmentManager', function() {
        if (game.dialogEngine) {
            game.dialogEngine.closeAll();
        }
        game.showEquipmentManagement();
    });

    // Apply settings
    engine.registerAction('applySettings', function() {
        const musicVolume = document.getElementById('music-volume');
        const sfxVolume = document.getElementById('sfx-volume');
        const showFPS = document.getElementById('show-fps');

        if (musicVolume) game.musicVolume = musicVolume.value / 100;
        if (sfxVolume) game.sfxVolume = sfxVolume.value / 100;
        if (showFPS) game.showFPS = showFPS.checked;

        // Apply volumes to audio systems
        if (game.audioManager) {
            game.audioManager.setMusicVolume(game.musicVolume);
            game.audioManager.setSFXVolume(game.sfxVolume);
        }

        this.back();
    });

    // Reset settings to defaults
    engine.registerAction('resetSettings', function() {
        // Reset to defaults
        game.musicVolume = 0.5;
        game.sfxVolume = 0.5;
        game.showFPS = false;

        // Apply to audio systems
        if (game.audioManager) {
            game.audioManager.setMusicVolume(game.musicVolume);
            game.audioManager.setSFXVolume(game.sfxVolume);
        }

        // Refresh dialog to show updated values
        this.actionRegistry.get('refresh')();
    });

    // Dismiss agent
    engine.registerAction('dismissAgent', function(agentId) {
        const index = game.activeAgents.findIndex(a => a.id === parseInt(agentId));
        if (index !== -1) {
            const agent = game.activeAgents[index];
            game.activeAgents.splice(index, 1);
            agent.hired = false;
            game.updateHubStats();
            this.actionRegistry.get('refresh')();
        }
    });

    // Show equipment for specific agent
    engine.registerAction('showEquipmentForAgent', function(agentId) {
        // Parse agent ID - it might come as a string with extra context
        // The agentId parameter might be "1 3" where 1 is the ID we want
        const actualAgentId = String(agentId).split(' ')[0];

        console.log('🔧 showEquipmentForAgent called with:', agentId, '→ using ID:', actualAgentId);

        // Initialize equipment system if needed
        if (!game.agentLoadouts) {
            game.initializeEquipmentSystem();
        }

        // Set selected agent
        game.selectedEquipmentAgent = parseInt(actualAgentId);

        // Close declarative dialogs and open legacy equipment dialog
        this.closeAll();
        game.showEquipmentManagement();
    });

    // Equip weapon
    engine.registerAction('equipWeapon', function(params) {
        const [agentId, weaponId] = params.split(':');

        if (!game.agentLoadouts) {
            game.initializeEquipmentSystem();
        }

        // Update loadout
        if (!game.agentLoadouts[agentId]) {
            game.agentLoadouts[agentId] = {};
        }
        game.agentLoadouts[agentId].weapon = parseInt(weaponId);

        // Update agent stats if needed
        const agent = game.activeAgents.find(a => a.id === parseInt(agentId));
        const weapon = game.weapons.find(w => w.id === parseInt(weaponId));
        if (agent && weapon) {
            agent.weaponEquipped = weapon;
        }

        // Refresh the current dialog
        this.actionRegistry.get('refresh')();
    });

    // Equip armor
    engine.registerAction('equipArmor', function(params) {
        const [agentId, armorId] = params.split(':');

        if (!game.agentLoadouts) {
            game.initializeEquipmentSystem();
        }

        // Update loadout
        if (!game.agentLoadouts[agentId]) {
            game.agentLoadouts[agentId] = {};
        }
        game.agentLoadouts[agentId].armor = parseInt(armorId);

        // Update agent stats if needed
        const agent = game.activeAgents.find(a => a.id === parseInt(agentId));
        const armor = game.equipment.find(e => e.id === parseInt(armorId) && e.type === 'armor');
        if (agent && armor) {
            agent.armorEquipped = armor;
        }

        // Refresh the current dialog
        this.actionRegistry.get('refresh')();
    });

    // Quick save
    engine.registerAction('quickSave', function() {
        if (game.saveGame) {
            game.saveGame('quicksave');
            // Show notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,255,0,0.9);
                color: #000;
                padding: 20px 40px;
                border-radius: 10px;
                font-weight: bold;
                z-index: 100000;
            `;
            notification.textContent = 'GAME SAVED';
            document.body.appendChild(notification);

            setTimeout(() => notification.remove(), 2000);
        }
    });

    // Quick load
    engine.registerAction('quickLoad', function() {
        if (game.loadGame) {
            game.loadGame('quicksave');
            this.closeAll();
        }
    });
};

// Override hub dialog methods to use declarative system
CyberOpsGame.prototype.showAgentManagementDeclarative = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('agent-management');
    } else {
        // Fallback to old system
        this.showAgentManagement();
    }
};

CyberOpsGame.prototype.showEquipmentDeclarative = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('equipment-arsenal');
    } else {
        this.showArsenal();
    }
};

CyberOpsGame.prototype.showResearchLabDeclarative = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('research-lab');
    } else {
        this.showResearchLab();
    }
};

CyberOpsGame.prototype.showIntelDeclarative = function() {
    if (this.dialogEngine) {
        this.dialogEngine.navigateTo('intel-missions');
    } else {
        this.showIntelligence();
    }
};

// Helper to check if declarative system is ready
CyberOpsGame.prototype.useDeclarativeDialogs = function() {
    return this.dialogEngine && this.dialogEngine.config && window.ENABLE_DECLARATIVE_DIALOGS;
};

// Initialize on game load
const originalInitGameForDialogs = CyberOpsGame.prototype.initGame;
CyberOpsGame.prototype.initGame = function() {
    // Call original init
    if (originalInitGameForDialogs) {
        originalInitGameForDialogs.call(this);
    }

    // Initialize declarative dialogs
    this.initializeDeclarativeDialogs();
};

// Declarative dialogs are always enabled
console.log('✨ Declarative Dialog System loaded and active');