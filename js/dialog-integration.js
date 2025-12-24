/**
 * Dialog Integration Adapter
 * Bridges the declarative dialog engine with existing game code
 * Provides backward compatibility while transitioning to fully declarative system
 */

// Integration adapter for CyberOpsGame
CyberOpsGame.prototype.initializeDeclarativeDialogs = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('DialogIntegration') : null;
    }
    if (this.logger) this.logger.debug('🎮 Initializing Declarative Dialog System');

    // Get the engine
    const engine = window.declarativeDialogEngine;
    if (!engine) {
        if (this.logger) this.logger.error('Declarative Dialog Engine not found!');
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

    if (this.logger) this.logger.info('✅ Declarative Dialog System ready');
};

// Register content generators
CyberOpsGame.prototype.registerDialogGenerators = function(engine) {
    // Store reference to game for shared components
    const game = this;

    // Shared agent roster component
    const generateAgentRoster = function(selectedAgentId, onClickAction, showWeapon = false) {
        let html = '<div class="agent-roster" style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 5px; max-height: 600px; overflow-y: auto;">';
        html += '<h3 style="color: #00ffff; margin-bottom: 15px;">SQUAD ROSTER</h3>';

        if (game.activeAgents && game.activeAgents.length > 0) {
            game.activeAgents.forEach((agent, index) => {
                // Ensure consistent comparison - convert both to string
                const isSelected = selectedAgentId && String(selectedAgentId) === String(agent.id);
                const clickHandler = onClickAction ? onClickAction.replace(/\{\{index\}\}/g, index).replace(/\{\{agentId\}\}/g, agent.id) : '';

                // Get weapon info if needed
                let weaponInfo = '';
                if (showWeapon) {
                    // Use agent ID directly - unified ID system
                    const loadoutId = agent.id;
                    const loadout = game.agentLoadouts?.[loadoutId] || {};
                    const weaponName = loadout.weapon && game.getItemById ? game.getItemById('weapon', loadout.weapon)?.name : 'None';
                    weaponInfo = `
                        <div style="color: #ffa500; font-size: 0.85em; margin-top: 5px;">
                            🔫 ${weaponName}
                        </div>
                    `;
                }

                html += `
                    <div class="roster-agent" style="
                        background: ${isSelected ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)'};
                        border: 1px solid ${isSelected ? '#00ffff' : 'rgba(0,255,255,0.3)'};
                        padding: 10px;
                        margin: 5px 0;
                        border-radius: 5px;
                        cursor: pointer;
                        transition: all 0.3s;"
                        ${clickHandler ? `onclick="${clickHandler}"` : ''}>
                        <div style="font-weight: bold; color: ${isSelected ? '#00ffff' : '#fff'}; margin-bottom: 5px;">
                            ${agent.name}
                        </div>
                        <div style="font-size: 0.85em; color: #888;">
                            ${agent.specialization || 'Operative'} Lvl ${agent.rpgEntity?.level || 1}
                        </div>
                        <div style="font-size: 0.85em; margin-top: 5px;">
                            <span style="color: #00ff00;">HP: ${agent.health}/${agent.maxHealth || agent.health}</span>
                        </div>
                        ${weaponInfo}
                    </div>
                `;
            });
        } else {
            html += '<div style="color: #888; text-align: center; padding: 20px;">No agents in squad</div>';
        }

        html += '</div>';
        return html;
    };
    // Button generators for context-aware close/return actions
    engine.registerGenerator('generateCharacterButtons', function() {
        // Check if we're in-game or in hub
        if (game.currentScreen === 'game') {
            return [{ text: '✖ CLOSE', action: 'close' }];
        } else {
            return [{ text: '← BACK TO HUB', action: 'execute:returnToHub' }];
        }
    });

    engine.registerGenerator('generateArsenalButtons', function() {
        // Check if we're in-game or in hub
        if (game.currentScreen === 'game') {
            return [{ text: '✖ CLOSE', action: 'close' }];
        } else {
            return [{ text: '← BACK TO HUB', action: 'execute:returnToHub' }];
        }
    });

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
                // Mission is locked if explicitly marked as locked, or if previous mission isn't completed
                // Allow access to any mission up to and including the first uncompleted mission
                let isLocked = mission.locked;
                if (!isLocked && index > 0) {
                    // Check if the previous mission has been completed
                    const prevMission = missions[index - 1];
                    if (prevMission && !completedMissions.includes(prevMission.id)) {
                        isLocked = true;
                    }
                }

                // Build display name: "Mission 1: Corporate Infiltration" or with subtitle "Mission 1: Data Heist"
                const displayName = mission.name || mission.title || 'Unknown Mission';
                const subtitle = mission.title && mission.name ? ` - ${mission.title}` : '';

                html += `
                    <div style="background: ${isCompleted ? 'rgba(0,255,0,0.1)' : isLocked ? 'rgba(128,128,128,0.1)' : 'rgba(0,255,255,0.1)'};
                               padding: 15px; margin: 10px 0; border-radius: 8px;
                               border: 1px solid ${isCompleted ? '#00ff00' : isLocked ? '#666' : '#00ffff'};">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <div style="font-weight: bold; color: ${isCompleted ? '#00ff00' : '#fff'};">
                                    Mission ${mission.missionNumber || index + 1}: ${displayName}${subtitle}
                                </div>
                                <div style="color: #ccc; margin: 10px 0;">
                                    ${mission.description || 'No description available.'}
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

    // Character Sheet - RPG system
    engine.registerGenerator('generateCharacterSheet', function() {
        // In mission context, filter to only mission agents
        if (this.currentScreen === 'game' && window.GameServices?.agentService) {
            const serviceAgents = window.GameServices.agentService.getActiveAgents();
            if (serviceAgents && serviceAgents.length > 0 && this.agents) {
                // Filter to only the agents in the current mission
                this.activeAgents = serviceAgents.filter(sa =>
                    this.agents.some(a => a.id === sa.id || a.name === sa.name)
                );
                const logger = window.Logger ? new window.Logger('DialogIntegration') : null;
                if (logger) logger.debug('📊 Character sheet using mission agents only:', this.activeAgents.length);
            }
        }

        let html = '<div class="character-sheet-content" style="display: grid; grid-template-columns: 250px 1fr; gap: 20px; height: 100%;">';

        // Left Panel - Agent Roster
        const rosterClickAction = `(function() {
            game.selectedAgent = game.activeAgents[{{index}}];  // Use setter, not direct assignment
            const dialogEngine = game.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
            if (dialogEngine && dialogEngine.navigateTo) {
                dialogEngine.navigateTo('character', null, true);
            }
        })()`;

        html += generateAgentRoster(this._selectedAgent?.id, rosterClickAction);

        // Right Panel - Character Details
        html += '<div class="character-details" style="overflow-y: auto; max-height: 600px;">';

        // Find selected agent
        let agent = this._selectedAgent || (this.activeAgents && this.activeAgents[0]);

        if (!agent) {
            html += '<div style="color: #888; text-align: center; padding: 40px;">Select an agent from the roster</div>';
            html += '</div></div>';
            return html;
        }

        // Initialize RPG entity if not present
        if (!agent.rpgEntity && this.rpgManager) {
            // Map specialization to correct RPG class
            const rpgClass = this.mapSpecializationToClass ?
                            this.mapSpecializationToClass(agent.specialization) || agent.class || 'soldier' :
                            agent.class || 'soldier';
            agent.rpgEntity = this.rpgManager.createRPGAgent(agent, rpgClass);
        }

        if (!agent.rpgEntity) {
            html += '<div style="color: #888; text-align: center; padding: 40px;">RPG system not initialized</div>';
            html += '</div></div>';
            return html;
        }

        const rpg = agent.rpgEntity;
        const derived = this.rpgManager?.calculateDerivedStats?.(rpg) || {};

        // Header with agent name and level
        html += `
            <h2 style="color: #00ffff; margin-bottom: 20px;">
                ${agent.name} - Level ${rpg.level || 1} ${rpg.class || 'Soldier'}
            </h2>
        `;

        html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">';

        // Primary Stats Panel
        html += `
            <div class="stats-panel" style="background: rgba(0,255,255,0.05); padding: 15px; border-radius: 5px;">
                <h3 style="color: #00ffff; margin-bottom: 10px;">Primary Stats</h3>
                <div class="stat-list">
        `;

        if (rpg.stats) {
            Object.entries(rpg.stats).forEach(([stat, value]) => {
                // Handle both object and number formats
                let statValue;
                if (typeof value === 'object' && value !== null) {
                    statValue = value.value || value.base || value.baseValue || 10;
                } else {
                    statValue = value || 0;
                }

                // Ensure it's a number
                statValue = typeof statValue === 'number' ? statValue : 10;

                html += `
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">${stat.charAt(0).toUpperCase() + stat.slice(1)}:</span>
                        <span style="color: #fff; font-weight: bold;">${statValue}</span>
                    </div>
                `;
            });
        }

        if (rpg.availableStatPoints > 0) {
            const agentIdForAllocation = agent.id || agent.name;
            const logger = window.Logger ? new window.Logger('DialogIntegration') : null;
            if (logger) logger.debug('Creating Allocate Points button for agent:', agentIdForAllocation);

            html += `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(0,255,255,0.3);">
                    <div style="color: #00ff00; margin-bottom: 10px;">${rpg.availableStatPoints} stat points available</div>
                    <button class="dialog-button" onclick="(function() {
                        const logger = window.Logger ? new window.Logger('AllocateButton') : null;
                        if (logger) logger.debug('Allocate button clicked for:', '${agentIdForAllocation}');
                        if (game.dialogEngine) {
                            // Store agent ID and reset pending changes in state data
                            game.dialogEngine.stateData = {
                                agentId: '${agentIdForAllocation}',
                                pendingChanges: {}
                            };
                            game.dialogEngine.navigateTo('stat-allocation');
                        } else {
                            // Fallback to old method
                            if (window.game && window.game.showStatAllocation) {
                                window.game.showStatAllocation('${agentIdForAllocation}');
                            }
                        }
                    })()">
                        Allocate Points
                    </button>
                </div>
            `;
        }

        html += '</div></div>';

        // Derived Stats Panel
        html += `
            <div class="derived-panel" style="background: rgba(255,0,255,0.05); padding: 15px; border-radius: 5px;">
                <h3 style="color: #ff00ff; margin-bottom: 10px;">Derived Stats</h3>
                <div class="derived-list">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">Max Health:</span>
                        <span style="color: #00ff00;">${derived.maxHealth}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">Max AP:</span>
                        <span style="color: #00ffff;">${derived.maxAP}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">Crit Chance:</span>
                        <span style="color: #ff6666;">${derived.critChance.toFixed(1)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">Dodge:</span>
                        <span style="color: #ffff00;">${derived.dodge.toFixed(1)}%</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span style="color: #ccc;">Carry Weight:</span>
                        <span style="color: #fff;">${derived.carryWeight} kg</span>
                    </div>
                </div>
            </div>
        `;

        html += '</div>'; // Close grid

        // Experience Bar
        const xpPercent = this.calculateXPPercent ? this.calculateXPPercent(rpg) : 0;
        const currentXP = rpg.experience || 0;
        const nextLevelXP = this.rpgManager?.experienceTable?.[rpg.level + 1] || 1000;

        if (this.logger) this.logger.debug(`🎨 XP Bar Display: ${currentXP}/${nextLevelXP} XP = ${xpPercent.toFixed(1)}% width`);

        html += `
            <div class="xp-panel" style="margin-top: 20px;">
                <h3 style="color: #00ff00; margin-bottom: 10px;">Experience - Level ${rpg.level || 1}</h3>
                <div style="background: rgba(0,0,0,0.3); height: 30px; border-radius: 15px; overflow: hidden; position: relative; border: 1px solid rgba(0,255,0,0.3);">
                    <div style="background: linear-gradient(90deg, #00ff00, #00ffff); width: ${Math.max(0, xpPercent)}%; height: 100%; transition: width 0.3s ease;"></div>
                    <span style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #fff; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
                        ${currentXP} / ${nextLevelXP} XP (${xpPercent.toFixed(0)}%)
                    </span>
                </div>
            </div>
        `;

        // Skills Panel
        html += `
            <div class="skills-panel" style="margin-top: 20px; background: rgba(0,100,200,0.05); padding: 15px; border-radius: 5px;">
                <h3 style="color: #00aaff; margin-bottom: 10px;">Skills</h3>
        `;

        // Skills is an object: { skillId: level }
        const learnedSkills = rpg.skills && typeof rpg.skills === 'object' ? Object.keys(rpg.skills) : [];

        // Get RPG config to look up skill details
        const rpgConfig = this.getRPGConfig ? this.getRPGConfig() :
                         (window.ContentLoader?.getContent('rpgConfig') ||
                          window.MAIN_CAMPAIGN_CONFIG?.rpgConfig ||
                          window.RPG_CONFIG);

        // Debug logging
        const logger = window.Logger ? new window.Logger('CharacterSheet') : null;
        if (logger) {
            logger.debug('Skills check:', {
                rpgSkills: rpg.skills,
                learnedSkills: learnedSkills,
                rpgConfig: rpgConfig ? 'found' : 'not found',
                skillsInConfig: rpgConfig?.skills ? Object.keys(rpgConfig.skills) : [],
                rpgConfigKeys: rpgConfig ? Object.keys(rpgConfig) : [],
                hasPerks: rpgConfig?.perks ? 'YES' : 'NO',
                perkCount: rpgConfig?.perks ? Object.keys(rpgConfig.perks).length : 0
            });
        }

        if (learnedSkills.length > 0 && rpgConfig?.skills) {

            html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
            learnedSkills.forEach(skillId => {
                const skillLevel = rpg.skills[skillId];
                const skillConfig = rpgConfig?.skills?.[skillId];
                if (skillConfig) {
                    html += `
                        <div style="background: rgba(0,255,255,0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(0,255,255,0.3);"
                             title="${skillConfig.description || ''}">
                            <span style="margin-right: 5px;">${skillConfig.icon || '⚡'}</span>
                            <span>${skillConfig.name}</span>
                            <span style="color: #00ff00; margin-left: 5px;">Lvl ${skillLevel}</span>
                        </div>
                    `;
                }
            });
            html += '</div>';
        } else {
            html += '<div style="color: #888;">No skills learned yet</div>';
        }

        if (rpg.availableSkillPoints > 0) {
            html += `
                <div style="margin-top: 15px;">
                    <div style="color: #00ff00; margin-bottom: 10px;">${rpg.availableSkillPoints} skill points available</div>
                    <button class="dialog-button" onclick="game.showSkillTree('${agent.id || agent.name}')">
                        Learn Skills
                    </button>
                </div>
            `;
        }

        html += '</div>';

        // Perks Panel
        html += `
            <div class="perks-panel" style="margin-top: 20px; background: rgba(200,100,0,0.05); padding: 15px; border-radius: 5px;">
                <h3 style="color: #ffaa00; margin-bottom: 10px;">Perks</h3>
        `;

        // Perks is an array of objects: [{ id, name, effects, cooldown }]
        const acquiredPerks = Array.isArray(rpg.perks) ? rpg.perks : [];

        // Get RPG config to look up perk details
        const rpgConfig2 = this.getRPGConfig ? this.getRPGConfig() :
                          (window.ContentLoader?.getContent('rpgConfig') ||
                           window.MAIN_CAMPAIGN_CONFIG?.rpgConfig ||
                           window.RPG_CONFIG);

        // Debug logging for perks
        if (logger) {
            logger.debug('Perks check:', {
                rpgPerks: rpg.perks,
                acquiredPerks: acquiredPerks,
                rpgConfig2: rpgConfig2 ? 'found' : 'not found',
                perksInConfig: rpgConfig2?.perks ? Object.keys(rpgConfig2.perks) : []
            });
        }

        if (acquiredPerks.length > 0 && rpgConfig2?.perks) {

            html += '<div style="display: flex; flex-wrap: wrap; gap: 10px;">';
            acquiredPerks.forEach(perk => {
                // Get full config for description and icon
                const perkConfig = rpgConfig2?.perks?.[perk.id];
                if (perkConfig) {
                    // Show perk effects if available
                    let effectsText = '';
                    if (perk.effects) {
                        const effects = Object.entries(perk.effects).map(([key, value]) => {
                            if (typeof value === 'number') {
                                return `${key}: ${value > 0 ? '+' : ''}${(value * 100).toFixed(0)}%`;
                            }
                            return `${key}: ${value}`;
                        }).join(', ');
                        effectsText = `\\n${effects}`;
                    }

                    html += `
                        <div style="background: rgba(255,170,0,0.1); padding: 10px; border-radius: 5px; border: 1px solid rgba(255,170,0,0.3);"
                             title="${perkConfig.description || ''}${effectsText}">
                            <span style="margin-right: 5px;">${perkConfig.icon || '🌟'}</span>
                            <span style="color: #ffaa00;">${perk.name || perkConfig.name}</span>
                        </div>
                    `;
                }
            });
            html += '</div>';
        } else {
            html += '<div style="color: #888;">No perks acquired yet</div>';
        }

        if (rpg.availablePerkPoints > 0) {
            html += `
                <div style="margin-top: 15px;">
                    <div style="color: #00ff00; margin-bottom: 10px;">${rpg.availablePerkPoints} perk points available</div>
                    <button class="dialog-button" onclick="game.showPerkSelection('${agent.id || agent.name}')">
                        Choose Perks
                    </button>
                </div>
            `;
        }

        html += '</div>'; // Close perks panel
        html += '</div>'; // Close character-details
        html += '</div>'; // Close character-sheet-content

        return html;
    });

    // Stat Allocation Generator
    engine.registerGenerator('generateStatAllocation', function() {
        const logger = window.Logger ? new window.Logger('DialogIntegration') : null;

        // Get the agent ID from the dialog state data
        const agentId = this.dialogEngine?.stateData?.agentId;
        if (!agentId) {
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Error: No agent selected for stat allocation</div>';
        }

        const agent = this.findAgentForRPG ? this.findAgentForRPG(agentId) : null;
        if (!agent || !agent.rpgEntity) {
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Error: Agent not found or has no RPG entity</div>';
        }

        const rpg = agent.rpgEntity;
        if (rpg.availableStatPoints <= 0) {
            return '<div style="color: #888; text-align: center; padding: 40px;">No stat points available</div>';
        }

        // Initialize pending changes if not set
        if (!this.dialogEngine.stateData.pendingChanges) {
            this.dialogEngine.stateData.pendingChanges = {};
        }
        const pending = this.dialogEngine.stateData.pendingChanges;

        let html = '<div class="stat-allocation-content" style="padding: 20px;">';

        // Points remaining
        const totalUsed = Object.values(pending).reduce((sum, val) => sum + val, 0);
        const pointsLeft = rpg.availableStatPoints - totalUsed;

        html += `
            <div class="points-remaining" style="text-align: center; padding: 15px; background: rgba(255,255,0,0.1); color: #ffff00; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-radius: 5px;">
                Points Remaining: <span id="points-left">${pointsLeft}</span>
            </div>
        `;

        // Stat allocation rows
        html += '<div class="stat-allocation-list">';

        Object.keys(rpg.stats).forEach(stat => {
            const currentValue = typeof rpg.stats[stat] === 'object' ?
                (rpg.stats[stat].value || rpg.stats[stat].base || 10) : rpg.stats[stat];
            const pendingValue = pending[stat] || 0;

            html += `
                <div class="stat-allocation-row" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; margin: 5px 0; background: rgba(0,255,255,0.05); border-radius: 5px;">
                    <span class="stat-name" style="color: #00ffff; font-weight: bold; width: 120px;">
                        ${stat.charAt(0).toUpperCase() + stat.slice(1)}
                    </span>
                    <span class="stat-current" style="color: #fff; width: 50px; text-align: center;">
                        ${currentValue}
                    </span>
                    <button class="dialog-button" style="width: 30px; height: 30px; padding: 0;"
                            onclick="game.allocateStatDeclarative('${agentId}', '${stat}', -1)"
                            ${pendingValue <= 0 ? 'disabled' : ''}>
                        -
                    </button>
                    <span class="stat-change" id="change-${stat}" style="color: #00ff00; width: 50px; text-align: center;">
                        ${pendingValue > 0 ? '+' + pendingValue : ''}
                    </span>
                    <button class="dialog-button" style="width: 30px; height: 30px; padding: 0;"
                            onclick="game.allocateStatDeclarative('${agentId}', '${stat}', 1)"
                            ${pointsLeft <= 0 ? 'disabled' : ''}>
                        +
                    </button>
                </div>
            `;
        });

        html += '</div>';
        html += '</div>';

        return html;
    });

    // Perk Selection Generator
    engine.registerGenerator('generatePerkSelection', function() {
        const logger = window.Logger ? new window.Logger('DialogIntegration') : null;

        // Get the agent ID from the dialog state data
        const agentId = this.dialogEngine?.stateData?.agentId;
        if (!agentId) {
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Error: No agent selected for perk selection</div>';
        }

        const agent = this.findAgentForRPG ? this.findAgentForRPG(agentId) : null;
        if (!agent || !agent.rpgEntity) {
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Error: Agent not found or has no RPG entity</div>';
        }

        const rpg = agent.rpgEntity;
        if (rpg.availablePerkPoints <= 0) {
            return '<div style="color: #888; text-align: center; padding: 40px;">No perk points available. Gain perk points every 3 levels.</div>';
        }

        // Get perks from campaign config
        const rpgConfig = this.getRPGConfig ? this.getRPGConfig() :
                         (window.ContentLoader?.getContent('rpgConfig') ||
                          window.MAIN_CAMPAIGN_CONFIG?.rpgConfig);
        const perks = rpgConfig?.perks || {};

        // Debug logging
        if (logger) {
            logger.debug(`🎯 Perk selection generator called for agent: ${agentId}`);
            logger.debug(`📦 RPG Config loaded:`, rpgConfig ? 'YES' : 'NO');
            logger.debug(`🎁 Perks available:`, Object.keys(perks).length);
            logger.debug(`🎯 Agent RPG entity:`, rpg);
            logger.debug(`💎 Available perk points:`, rpg.availablePerkPoints);
            if (!rpgConfig && logger) {
                logger.error(`❌ Could not load RPG config from any source!`);
                logger.debug(`- this.getRPGConfig exists: ${!!this.getRPGConfig}`);
                logger.debug(`- ContentLoader exists: ${!!window.ContentLoader}`);
                logger.debug(`- MAIN_CAMPAIGN_CONFIG exists: ${!!window.MAIN_CAMPAIGN_CONFIG}`);
            }
        }

        if (Object.keys(perks).length === 0) {
            if (logger) logger.error('❌ No perks found in rpgConfig!');
            return '<div style="color: #888; text-align: center; padding: 40px;">No perks available in this campaign</div>';
        }

        // Organize perks by category
        const categories = {};
        Object.entries(perks).forEach(([perkId, perk]) => {
            const category = perk.category || 'general';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push({ id: perkId, ...perk });
        });

        let html = '<div class="perk-selection-content" style="padding: 20px;">';

        // Points available
        html += `
            <div class="points-available" style="text-align: center; padding: 15px; background: rgba(255,255,0,0.1); color: #ffff00; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-radius: 5px;">
                Perk Points Available: ${rpg.availablePerkPoints}
            </div>
        `;

        // Show perks by category
        const categoryNames = {
            combat: '⚔️ Combat',
            defense: '🛡️ Defense',
            stealth: '👤 Stealth',
            tech: '💻 Tech',
            medical: '🏥 Medical',
            leadership: '👑 Leadership',
            survival: '❤️ Survival',
            general: '⭐ General'
        };

        Object.entries(categories).forEach(([category, categoryPerks]) => {
            const categoryName = categoryNames[category] || category;

            html += `<div class="perk-category" style="margin: 20px 0;">`;
            html += `<h3 style="color: #00ffff; border-bottom: 2px solid #00ffff; padding-bottom: 5px; margin-bottom: 15px;">${categoryName}</h3>`;
            html += '<div class="perk-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">';

            categoryPerks.forEach(perk => {
                // Check if agent already has this perk
                const hasPerk = rpg.hasPerk ? rpg.hasPerk(perk.id) : false;

                // Debug logging
                if (logger && perk.id === 'rapidFire') {
                    logger.debug(`Checking perk rapidFire: hasPerk=${hasPerk}`);
                    logger.debug(`Agent perks:`, rpg.perks);
                }

                // Check requirements
                let meetsRequirements = true;
                let requirementText = [];

                if (perk.requirements) {
                    if (perk.requirements.level && rpg.level < perk.requirements.level) {
                        meetsRequirements = false;
                        requirementText.push(`Level ${perk.requirements.level}`);
                    }

                    Object.entries(perk.requirements).forEach(([stat, value]) => {
                        if (stat !== 'level' && rpg.stats[stat]) {
                            const statValue = typeof rpg.stats[stat] === 'object' ?
                                rpg.stats[stat].value : rpg.stats[stat];
                            if (statValue < value) {
                                meetsRequirements = false;
                                requirementText.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)} ${value}`);
                            }
                        }
                    });
                }

                const canSelect = !hasPerk && meetsRequirements;
                const bgColor = hasPerk ? 'rgba(0,255,0,0.1)' :
                               !meetsRequirements ? 'rgba(100,100,100,0.1)' :
                               'rgba(0,255,255,0.05)';
                const borderColor = hasPerk ? '#00ff00' :
                                   !meetsRequirements ? '#666' :
                                   '#00ffff';

                html += `
                    <div class="perk-card" style="
                        padding: 15px;
                        background: ${bgColor};
                        border: 2px solid ${borderColor};
                        border-radius: 5px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    ">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 30px;">${perk.icon}</span>
                            <div style="flex: 1;">
                                <div style="color: #00ffff; font-weight: bold; font-size: 16px;">${perk.name}</div>
                                ${hasPerk ? '<div style="color: #00ff00; font-size: 12px;">✓ UNLOCKED</div>' : ''}
                            </div>
                        </div>
                        <div style="color: #ccc; font-size: 14px; line-height: 1.4;">${perk.description}</div>
                        ${requirementText.length > 0 ?
                            `<div style="color: ${meetsRequirements ? '#888' : '#ff6666'}; font-size: 12px;">
                                Requires: ${requirementText.join(', ')}
                            </div>` : ''}
                        ${canSelect ?
                            `<button class="dialog-button primary" style="margin-top: auto;"
                                     onclick="game.selectPerkDeclarative('${agentId}', '${perk.id}')">
                                SELECT PERK
                            </button>` :
                            hasPerk ?
                                `<button class="dialog-button" disabled style="margin-top: auto;">ALREADY UNLOCKED</button>` :
                                `<button class="dialog-button" disabled style="margin-top: auto;">REQUIREMENTS NOT MET</button>`
                        }
                    </div>
                `;
            });

            html += '</div>'; // perk-list
            html += '</div>'; // perk-category
        });

        html += '</div>'; // perk-selection-content

        return html;
    });

    // Arsenal/Equipment Management
    engine.registerGenerator('generateEquipmentManagement', function() {
        // Initialize equipment system if needed
        if (!this.agentLoadouts) {
            if (this.initializeEquipmentSystem) {
                this.initializeEquipmentSystem();
            } else {
                // Fallback initialization
                this.agentLoadouts = {};
                this.selectedEquipmentAgent = null;
                this.currentInventoryTab = 'weapons';
            }
        }

        // Properties are handled by getters/setters that route to services
        // No need to initialize empty arrays

        // Services are the single source of truth - NO FALLBACKS
        // The getters will return service data, no syncing needed

        // In mission context, get agents from AgentService (single source of truth)
        if (this.currentScreen === 'game' && window.GameServices?.agentService) {
            // Get the mission agents from AgentService
            // They were already re-indexed when the mission started
            const serviceAgents = window.GameServices.agentService.getActiveAgents();
            if (serviceAgents && serviceAgents.length > 0) {
                // Filter to only the agents in the current mission
                this.activeAgents = this.agents ?
                    serviceAgents.filter(sa => this.agents.some(a =>
                        a.id === sa.id || a.name === sa.name
                    )) : serviceAgents;
                const logger = window.Logger ? new window.Logger('DialogIntegration') : null;
                if (logger) logger.debug('📦 Using AgentService agents:', this.activeAgents.length);
            }
        }
        // NO FALLBACK - AgentService is the ONLY source of truth

        // Auto-select first agent if none selected
        if (!this.selectedEquipmentAgent && this.activeAgents && this.activeAgents.length > 0) {
            // In game mode, try to use the currently selected agent
            if (this.currentScreen === 'game' && this._selectedAgent) {
                // Use the agent's ID directly - unified ID system
                this.selectedEquipmentAgent = this._selectedAgent.id || this._selectedAgent.name;
            } else {
                this.selectedEquipmentAgent = this.activeAgents[0].id;
            }
        }

        // Initialize inventory tab if not set
        if (!this.currentInventoryTab) {
            this.currentInventoryTab = 'weapons';
        }

        let html = `
            <div class="equipment-management-content" style="display: flex; gap: 20px; height: 60vh; width: 100%; padding: 10px; box-sizing: border-box;">
        `;

        // Left Panel: Agents (using shared roster component)
        html += '<div style="flex: 1; min-width: 250px; display: flex; flex-direction: column; padding: 5px;">';

        const arsenalClickAction = `(function() {
            if (this.logger) this.logger.debug('Agent clicked:', '{{agentId}}');
            game.selectedEquipmentAgent = '{{agentId}}';
            game.dialogEngine.navigateTo('arsenal');
        })()`;

        // Use shared roster with weapon info enabled
        html += generateAgentRoster(this.selectedEquipmentAgent, arsenalClickAction, true);
        html += '</div>';

        // Center Panel: Current Loadout
        html += `
            <div style="flex: 1.2; min-width: 300px; display: flex; flex-direction: column; border: 2px solid magenta; padding: 5px;">
                <h3 style="color: #00ffff; margin-bottom: 15px;">🎯 CURRENT LOADOUT</h3>
        `;

        if (this.selectedEquipmentAgent) {
            if (this.logger) this.logger.debug('Looking for agent with ID:', this.selectedEquipmentAgent);
            if (this.logger) {
                this.logger.debug('Available agents:', this.activeAgents.map(a => ({ id: a.id, name: a.name })));
                this.logger.debug('Selected agent ID:', this.selectedEquipmentAgent);
                this.logger.debug('All loadouts:', Object.keys(this.agentLoadouts || {}));
            }
            const agent = this.activeAgents.find(a =>
                String(a.id) === String(this.selectedEquipmentAgent)
            );
            // Use agent ID directly - unified ID system
            const loadoutId = agent ? agent.id : this.selectedEquipmentAgent;
            const loadout = this.agentLoadouts[loadoutId] || {};

            if (agent) {
                if (this.logger) this.logger.debug('Found agent:', agent.name);
                html += `
                    <div style="background: rgba(0,255,255,0.05); padding: 15px; border-radius: 8px; flex: 1; overflow-y: auto;">
                        <h4 style="color: #fff; margin-bottom: 15px;">${agent.name}'s Loadout</h4>

                        <div style="margin-bottom: 15px;">
                            <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">PRIMARY WEAPON</div>
                            <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                `;

                if (loadout.weapon && this.getItemById) {
                    const weapon = this.getItemById('weapon', loadout.weapon);
                    html += `
                        <div>
                            <span style="color: #00ffff; font-weight: bold;">${weapon?.name || 'Unknown'}</span>
                            <span style="color: #888; font-size: 0.85em; margin-left: 10px;">DMG: ${weapon?.stats?.damage || weapon?.damage || 0}</span>
                        </div>
                        <button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em;"
                                onclick="(function() {
                                    if (game.unequipItem) {
                                        game.unequipItem('${loadoutId}', 'weapon');
                                        game.dialogEngine.navigateTo('arsenal');
                                    }
                                })()">
                            UNEQUIP
                        </button>
                    `;
                } else {
                    html += '<span style="color: #666;">Empty Slot</span>';
                }

                html += '</div></div>';

                // Armor slot
                html += `
                    <div style="margin-bottom: 15px;">
                        <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">ARMOR</div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                `;

                if (loadout.armor && this.getItemById) {
                    const armor = this.getItemById('equipment', loadout.armor);
                    html += `
                        <div>
                            <span style="color: #00ffff; font-weight: bold;">${armor?.name || 'Unknown'}</span>
                            <span style="color: #888; font-size: 0.85em; margin-left: 10px;">DEF: ${armor?.protection || 0}</span>
                        </div>
                        <button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em;"
                                onclick="(function() {
                                    if (game.unequipItem) {
                                        game.unequipItem('${loadoutId}', 'armor');
                                        game.dialogEngine.navigateTo('arsenal');
                                    }
                                })()">
                            UNEQUIP
                        </button>
                    `;
                } else {
                    html += '<span style="color: #666;">Empty Slot</span>';
                }

                html += '</div></div>';

                // Utility slot
                html += `
                    <div style="margin-bottom: 15px;">
                        <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">UTILITY</div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                `;

                if (loadout.utility && this.getItemById) {
                    const utility = this.getItemById('equipment', loadout.utility);
                    let stats = '';
                    if (utility?.hackBonus) stats += `HACK: +${utility.hackBonus} `;
                    if (utility?.stealthBonus) stats += `STEALTH: +${utility.stealthBonus}`;

                    html += `
                        <div>
                            <span style="color: #00ffff; font-weight: bold;">${utility?.name || 'Unknown'}</span>
                            <span style="color: #888; font-size: 0.85em; margin-left: 10px;">${stats}</span>
                        </div>
                        <button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em;"
                                onclick="(function() {
                                    if (game.unequipItem) {
                                        game.unequipItem('${loadoutId}', 'utility');
                                        game.dialogEngine.navigateTo('arsenal');
                                    }
                                })()">
                            UNEQUIP
                        </button>
                    `;
                } else {
                    html += '<span style="color: #666;">Empty Slot</span>';
                }

                html += '</div></div>';

                // Stats Preview
                html += `
                    <div style="margin-top: 20px;">
                        <h4 style="color: #ffa500; margin-bottom: 10px;">📊 STATS PREVIEW</h4>
                        <div style="background: rgba(255,165,0,0.1); padding: 10px; border-radius: 5px;">
                `;

                // Calculate stats with loadout
                let totalDamage = agent.damage || 25;
                let totalProtection = 0;
                let hackBonus = 0;
                let stealthBonus = 0;

                if (loadout.weapon && this.getItemById) {
                    const weapon = this.getItemById('weapon', loadout.weapon);
                    if (weapon) totalDamage += weapon.stats?.damage || weapon.damage || 0;
                }

                if (loadout.armor && this.getItemById) {
                    const armor = this.getItemById('equipment', loadout.armor);
                    if (armor) totalProtection += armor.protection || 0;
                }

                if (loadout.utility && this.getItemById) {
                    const utility = this.getItemById('equipment', loadout.utility);
                    if (utility) {
                        hackBonus += utility.hackBonus || 0;
                        stealthBonus += utility.stealthBonus || 0;
                    }
                }

                html += `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>Damage: <span style="color: #ff6666;">${totalDamage}</span></div>
                        <div>Protection: <span style="color: #00ffff;">${totalProtection}</span></div>
                        <div>Hack Bonus: <span style="color: #00ff00;">+${hackBonus}</span></div>
                        <div>Stealth Bonus: <span style="color: #ff00ff;">+${stealthBonus}</span></div>
                    </div>
                `;

                html += '</div></div></div>';
            } else {
                if (this.logger) this.logger.warn('Agent not found with ID:', this.selectedEquipmentAgent);
                html += '<div style="color: #ff0000; text-align: center; padding: 20px;">Error: Agent not found!</div>';
            }
        } else {
            html += '<div style="color: #888; text-align: center; padding: 20px;">Select an agent to view loadout</div>';
        }

        html += '</div>';

        // Right Panel: Inventory/Shop/Sell
        html += `
            <div style="flex: 1.5; min-width: 350px; display: flex; flex-direction: column; border: 2px solid yellow; padding: 5px;">
                <h3 style="color: #00ffff; margin-bottom: 15px;">📦 INVENTORY & SHOP</h3>

                <!-- Main Tab Selection -->
                <div style="margin-bottom: 10px; display: flex; gap: 5px;">
                    <button class="dialog-button" onclick="(function() {
                        game.currentInventoryMode = 'inventory';
                        game.currentInventoryTab = 'weapons';
                        game.dialogEngine.navigateTo('arsenal');
                    })()"
                            style="${this.currentInventoryMode === 'inventory' || !this.currentInventoryMode ? 'background: #00ffff; color: #000;' : ''}">
                        📦 Inventory
                    </button>
                    <button class="dialog-button" onclick="(function() {
                        game.currentInventoryMode = 'buy';
                        game.currentInventoryTab = 'weapons';
                        game.dialogEngine.navigateTo('arsenal');
                    })()"
                            style="${this.currentInventoryMode === 'buy' ? 'background: #00ff00; color: #000;' : ''}">
                        🛒 Buy
                    </button>
                    <button class="dialog-button" onclick="(function() {
                        game.currentInventoryMode = 'sell';
                        game.currentInventoryTab = 'weapons';
                        game.dialogEngine.navigateTo('arsenal');
                    })()"
                            style="${this.currentInventoryMode === 'sell' ? 'background: #ff6600; color: #000;' : ''}">
                        💰 Sell
                    </button>
                </div>

                <!-- Sub-tabs for Weapons/Equipment -->
                <div style="margin-bottom: 10px;">
                    <button class="dialog-button" onclick="(function() {
                        game.currentInventoryTab = 'weapons';
                        game.dialogEngine.navigateTo('arsenal');
                    })()"
                            style="margin-right: 5px; font-size: 0.9em; ${this.currentInventoryTab === 'weapons' ? 'background: #666; color: #fff;' : ''}">
                        🔫 Weapons
                    </button>
                    <button class="dialog-button" onclick="(function() {
                        game.currentInventoryTab = 'equipment';
                        game.dialogEngine.navigateTo('arsenal');
                    })()"
                            style="font-size: 0.9em; ${this.currentInventoryTab === 'equipment' ? 'background: #666; color: #fff;' : ''}">
                        🛡️ Equipment
                    </button>
                </div>

                <!-- Credits Display -->
                ${this.currentInventoryMode === 'buy' || this.currentInventoryMode === 'sell' ?
                    `<div style="color: #ffa500; margin-bottom: 10px; font-weight: bold;">
                        💳 Credits: ${this.credits}
                    </div>` : ''}

                <div style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px;">
        `;

        // Initialize inventory mode if not set
        if (!this.currentInventoryMode) {
            this.currentInventoryMode = 'inventory';
        }

        // Show weapons or equipment based on tab and mode
        if (!this.currentInventoryTab || this.currentInventoryTab === 'weapons') {
            const weapons = this.weapons || [];

            if (this.currentInventoryMode === 'inventory') {
                // INVENTORY MODE - Show owned weapons
                html += '<h4 style="color: #ffa500; margin-bottom: 10px;">🔫 OWNED WEAPONS</h4>';

                const ownedWeapons = weapons.filter(w => w.owned > 0);
                if (ownedWeapons.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No weapons owned</div>';
                } else {
                    ownedWeapons.forEach(weapon => {
                        const availableCount = this.getAvailableCount ? this.getAvailableCount('weapon', weapon.id) : weapon.owned || 0;

                        html += `
                            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: #fff; font-weight: bold;">${weapon.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            DMG: ${weapon.stats?.damage || weapon.damage || 0} | Owned: ${weapon.owned} | Available: ${availableCount}
                                        </div>
                                    </div>
                                    <div>
                                        ${availableCount > 0 && this.selectedEquipmentAgent ?
                                            `<button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em;"
                                                     onclick="(function() {
                                                         if (game.equipItem) {
                                                             game.equipItem('${game.selectedEquipmentAgent}', 'weapon', '${weapon.id}');
                                                             game.dialogEngine.navigateTo('arsenal');
                                                         }
                                                     })()">
                                                EQUIP
                                            </button>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

            } else if (this.currentInventoryMode === 'buy') {
                // BUY MODE - Show all weapons available for purchase
                html += '<h4 style="color: #00ff00; margin-bottom: 10px;">🛒 BUY WEAPONS</h4>';

                if (weapons.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No weapons available</div>';
                } else {
                    weapons.forEach(weapon => {
                        const weaponCost = weapon.value || weapon.cost || 0;
                        const canAfford = this.credits >= weaponCost;

                        html += `
                            <div style="background: rgba(0,255,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: ${canAfford ? '#fff' : '#666'}; font-weight: bold;">${weapon.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            DMG: ${weapon.stats?.damage || weapon.damage || 0} | Cost: ${weaponCost} | Owned: ${weapon.owned}
                                        </div>
                                    </div>
                                    <div>
                                        ${canAfford ?
                                            `<button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em; background: #00ff00; color: #000;"
                                                     onclick="(function() {
                                                         if (game.buyItemFromShop) {
                                                             game.buyItemFromShop('weapon', ${weapon.id});
                                                             game.dialogEngine.navigateTo('arsenal');
                                                         }
                                                     })()">
                                                BUY
                                            </button>` :
                                            '<span style="color: #ff0000; font-size: 0.85em;">Not enough credits</span>'}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

            } else if (this.currentInventoryMode === 'sell') {
                // SELL MODE - Show sellable weapons
                html += '<h4 style="color: #ff6600; margin-bottom: 10px;">💰 SELL WEAPONS</h4>';

                const sellableWeapons = weapons.filter(w => {
                    const available = this.getAvailableCount ? this.getAvailableCount('weapon', w.id) : w.owned || 0;
                    return available > 0;
                });

                if (sellableWeapons.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No weapons available to sell</div>';
                } else {
                    sellableWeapons.forEach(weapon => {
                        const availableCount = this.getAvailableCount ? this.getAvailableCount('weapon', weapon.id) : weapon.owned || 0;
                        const weaponValue = weapon.value || weapon.cost || 0;
                        const sellPrice = Math.floor(weaponValue * 0.6);

                        html += `
                            <div style="background: rgba(255,102,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: #fff; font-weight: bold;">${weapon.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            Available to sell: ${availableCount} | Sell price: ${sellPrice} credits
                                        </div>
                                    </div>
                                    <div>
                                        <button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em; background: #ff6600; color: #000;"
                                                onclick="(function() {
                                                    if (game.sellItem) {
                                                        game.sellItem('weapon', ${weapon.id});
                                                    }
                                                })()">
                                            SELL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        } else {
            // Equipment tab
            const equipment = this.equipment || [];

            if (this.currentInventoryMode === 'inventory') {
                // INVENTORY MODE - Show owned equipment
                html += '<h4 style="color: #ffa500; margin-bottom: 10px;">🛡️ OWNED EQUIPMENT</h4>';

                const ownedEquipment = equipment.filter(e => e.owned > 0);
                if (ownedEquipment.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No equipment owned</div>';
                } else {
                    ownedEquipment.forEach(item => {
                        const availableCount = this.getAvailableCount ? this.getAvailableCount('equipment', item.id) : item.owned || 0;
                        const slot = this.getEquipmentSlot ? this.getEquipmentSlot(item) : 'equipment';

                        let stats = '';
                        if (item.protection) stats += `DEF: ${item.protection} `;
                        if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
                        if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

                        html += `
                            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: #fff; font-weight: bold;">${item.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            ${stats}| Owned: ${item.owned} | Available: ${availableCount}
                                        </div>
                                    </div>
                                    <div>
                                        ${availableCount > 0 && this.selectedEquipmentAgent ?
                                            `<button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em;"
                                                     onclick="(function() {
                                                         if (game.equipItem) {
                                                             game.equipItem('${game.selectedEquipmentAgent}', '${slot}', '${item.id}');
                                                             game.dialogEngine.navigateTo('arsenal');
                                                         }
                                                     })()">
                                                EQUIP
                                            </button>` : ''}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

            } else if (this.currentInventoryMode === 'buy') {
                // BUY MODE - Show all equipment available for purchase
                html += '<h4 style="color: #00ff00; margin-bottom: 10px;">🛒 BUY EQUIPMENT</h4>';

                if (equipment.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No equipment available</div>';
                } else {
                    equipment.forEach(item => {
                        const canAfford = this.credits >= item.cost;

                        let stats = '';
                        if (item.protection) stats += `DEF: ${item.protection} `;
                        if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
                        if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

                        html += `
                            <div style="background: rgba(0,255,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: ${canAfford ? '#fff' : '#666'}; font-weight: bold;">${item.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            ${stats}| Cost: ${item.cost} | Owned: ${item.owned}
                                        </div>
                                    </div>
                                    <div>
                                        ${canAfford ?
                                            `<button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em; background: #00ff00; color: #000;"
                                                     onclick="(function() {
                                                         if (game.buyItemFromShop) {
                                                             game.buyItemFromShop('equipment', ${item.id});
                                                             game.dialogEngine.navigateTo('arsenal');
                                                         }
                                                     })()">
                                                BUY
                                            </button>` :
                                            '<span style="color: #ff0000; font-size: 0.85em;">Not enough credits</span>'}
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }

            } else if (this.currentInventoryMode === 'sell') {
                // SELL MODE - Show sellable equipment
                html += '<h4 style="color: #ff6600; margin-bottom: 10px;">💰 SELL EQUIPMENT</h4>';

                const sellableEquipment = equipment.filter(e => {
                    const available = this.getAvailableCount ? this.getAvailableCount('equipment', e.id) : e.owned || 0;
                    return available > 0;
                });

                if (sellableEquipment.length === 0) {
                    html += '<div style="color: #888; text-align: center; padding: 20px;">No equipment available to sell</div>';
                } else {
                    sellableEquipment.forEach(item => {
                        const availableCount = this.getAvailableCount ? this.getAvailableCount('equipment', item.id) : item.owned || 0;
                        const sellPrice = Math.floor(item.cost * 0.6);

                        let stats = '';
                        if (item.protection) stats += `DEF: ${item.protection} `;
                        if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
                        if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

                        html += `
                            <div style="background: rgba(255,102,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <div style="color: #fff; font-weight: bold;">${item.name}</div>
                                        <div style="color: #888; font-size: 0.85em;">
                                            ${stats}| Available: ${availableCount} | Sell price: ${sellPrice}
                                        </div>
                                    </div>
                                    <div>
                                        <button class="dialog-button" style="padding: 5px 10px; font-size: 0.9em; background: #ff6600; color: #000;"
                                                onclick="(function() {
                                                    if (game.sellItem) {
                                                        game.sellItem('equipment', ${item.id});
                                                    }
                                                })()">
                                            SELL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                }
            }
        }

        html += '</div></div>';
        html += '</div>'; // Close equipment-management-content

        // Action buttons at the bottom - only Optimize All now
        html += `
            <div style="margin-top: 20px; display: flex; justify-content: center;">
                <button class="dialog-button" onclick="(function() {
                    if (game.optimizeLoadouts) {
                        game.optimizeLoadouts();
                        // Small delay to let the optimization complete
                        setTimeout(() => game.dialogEngine.navigateTo('arsenal'), 100);
                    } else {
                        alert('Optimize function not available');
                    }
                })()">
                    🚀 OPTIMIZE ALL LOADOUTS
                </button>
            </div>
        `;

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
    // === SETTINGS TABS GENERATORS ===

    // Keyboard Settings Tab - Full key rebinding system
    engine.registerGenerator('generateKeyboardSettings', function() {
        let html = '<div style="color: #fff; overflow-y: auto; max-height: 500px;">';

        if (window.KeybindingService) {
            const categories = window.KeybindingService.exportForUI();

            categories.forEach(cat => {
                html += `
                    <div style="margin-bottom: 30px;">
                        <h3 style="color: #00ffff; margin-bottom: 15px; border-bottom: 1px solid #00ffff; padding-bottom: 5px;">
                            ${cat.label}
                        </h3>
                        <div style="display: grid; gap: 10px;">
                `;

                cat.bindings.forEach(binding => {
                    html += `
                        <div style="
                            display: grid;
                            grid-template-columns: 1fr 150px 100px;
                            align-items: center;
                            padding: 8px;
                            background: rgba(255, 255, 255, 0.05);
                            border-radius: 5px;
                        ">
                            <span style="color: #ccc;">${binding.description}</span>
                            <input type="text"
                                id="key-${binding.action}"
                                value="${binding.key}"
                                readonly
                                style="
                                    background: rgba(0, 0, 0, 0.5);
                                    border: 1px solid #444;
                                    color: #00ffff;
                                    padding: 5px 10px;
                                    text-align: center;
                                    cursor: pointer;
                                    border-radius: 3px;
                                "
                                onclick="game.startKeyRebind('${binding.action}')"
                            >
                            <button
                                onclick="game.resetKeyBinding('${binding.action}')"
                                style="
                                    background: rgba(255, 0, 0, 0.1);
                                    border: 1px solid #ff4444;
                                    color: #ff4444;
                                    padding: 5px 10px;
                                    cursor: pointer;
                                    border-radius: 3px;
                                "
                            >Reset</button>
                        </div>
                    `;
                });

                html += '</div></div>';
            });
        } else {
            html += '<p style="color: #ff4444;">Keyboard binding service not loaded</p>';
        }

        html += '</div>';
        return html;
    });

    // Audio Settings Tab
    engine.registerGenerator('generateAudioSettings', function() {
        // Get current state from localStorage or audioEnabled flag
        const audioEnabledSetting = localStorage.getItem('cyberops_audio_enabled');
        const audioEnabled = audioEnabledSetting !== null ? audioEnabledSetting === 'true' : this.audioEnabled;

        return `
            <div style="color: #fff;">
                <h3 style="color: #00ffff; margin-bottom: 20px;">AUDIO SETTINGS</h3>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${audioEnabled ? 'checked' : ''}
                            onchange="game.toggleAudioEnable(this.checked)"
                            style="margin-right: 10px;">
                        <span style="color: #00ffff; font-weight: bold;">Enable Audio</span>
                    </label>
                    <p style="color: #888; font-size: 0.9em; margin: 5px 0 0 24px;">
                        Enable or disable all game audio (music and sound effects)
                    </p>
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px;">
                        Master Volume <span id="master-volume-value" style="color: #888; font-size: 0.9em;">${Math.round((this.masterVolume || 0.5) * 100)}%</span>
                    </label>
                    <input type="range" min="0" max="100" value="${(this.masterVolume || 0.5) * 100}"
                        oninput="document.getElementById('master-volume-value').textContent = this.value + '%'"
                        onchange="game.setMasterVolume(this.value)"
                        style="width: 100%;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px;">
                        Sound Effects <span id="sfx-volume-value" style="color: #888; font-size: 0.9em;">${Math.round((this.sfxVolume || 0.5) * 100)}%</span>
                    </label>
                    <input type="range" min="0" max="100" value="${(this.sfxVolume || 0.5) * 100}"
                        oninput="document.getElementById('sfx-volume-value').textContent = this.value + '%'"
                        onchange="game.setSFXVolume(this.value)"
                        style="width: 100%;">
                </div>

                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px;">
                        Music <span id="music-volume-value" style="color: #888; font-size: 0.9em;">${Math.round((this.musicVolume || 0.3) * 100)}%</span>
                    </label>
                    <input type="range" min="0" max="100" value="${(this.musicVolume || 0.3) * 100}"
                        oninput="document.getElementById('music-volume-value').textContent = this.value + '%'"
                        onchange="game.setMusicVolume(this.value)"
                        style="width: 100%;">
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                    <p style="color: #888; margin: 0; font-size: 0.9em;">
                        💡 Note: Volume changes take effect immediately. Music playback requires user interaction first.
                    </p>
                </div>
            </div>
        `;
    });

    // Graphics Settings Tab
    engine.registerGenerator('generateGraphicsSettings', function() {
        const enableScreenShake = localStorage.getItem('cyberops_screenshake') !== 'false';
        const enable3DShadows = localStorage.getItem('cyberops_shadows') !== 'false';
        const showFPS = this.showFPS || false;

        return `
            <div style="color: #fff;">
                <h3 style="color: #00ffff; margin-bottom: 20px;">GRAPHICS SETTINGS</h3>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${enableScreenShake ? 'checked' : ''}
                            onchange="game.toggleScreenShake(this.checked)">
                        Enable Screen Shake
                    </label>
                </div>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${enable3DShadows ? 'checked' : ''}
                            onchange="game.toggle3DShadows(this.checked)">
                        Enable 3D Shadows (3D mode only)
                    </label>
                </div>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${showFPS ? 'checked' : ''}
                            onchange="game.toggleFPS(this.checked)">
                        Show FPS Counter
                    </label>
                </div>

                <div style="margin-top: 40px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                    <p style="color: #888; margin: 0;">
                        Note: Most graphics settings are optimized for performance.<br>
                        Advanced graphics options may be added in future updates.
                    </p>
                </div>
            </div>
        `;
    });

    // Game Settings Tab
    engine.registerGenerator('generateGameSettings', function() {
        const usePathfinding = this.usePathfinding !== false;
        const autoSave = localStorage.getItem('cyberops_autosave') !== 'false';

        return `
            <div style="color: #fff;">
                <h3 style="color: #00ffff; margin-bottom: 20px;">GAME SETTINGS</h3>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${usePathfinding ? 'checked' : ''}
                            onchange="game.togglePathfindingSetting(this.checked)">
                        Use Pathfinding (smarter agent movement)
                    </label>
                </div>

                <div style="margin-bottom: 20px;">
                    <label>
                        <input type="checkbox" ${autoSave ? 'checked' : ''}
                            onchange="game.toggleAutoSave(this.checked)">
                        Auto-Save Between Missions
                    </label>
                </div>

                <div style="margin-top: 40px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                    <h4 style="color: #00ffff; margin-bottom: 10px;">Default Team Mode</h4>
                    <select id="defaultTeamMode" style="width: 200px; padding: 5px; background: #222; color: #fff; border: 1px solid #444;"
                        onchange="game.setDefaultTeamMode(this.value)">
                        <option value="hold" ${this.defaultTeamMode === 'hold' ? 'selected' : ''}>Hold Position</option>
                        <option value="patrol" ${this.defaultTeamMode === 'patrol' ? 'selected' : ''}>Patrol Area</option>
                        <option value="follow" ${this.defaultTeamMode === 'follow' ? 'selected' : ''}>Follow Leader</option>
                    </select>
                    <p style="color: #888; margin-top: 10px; font-size: 0.9em;">
                        Sets the default behavior for unselected team members
                    </p>
                </div>

                <div style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 5px;">
                    <p style="color: #888; margin: 0;">
                        Note: Difficulty settings are balanced for the current campaign.<br>
                        Additional difficulty options may be added in future updates.
                    </p>
                </div>
            </div>
        `;
    });

    // NPC dialog - Enhanced to handle dialog trees, info text, and quests
    engine.registerGenerator('generateNPCDialog', function() {
        if (!this.currentNPC) {
            return '<p>No NPC selected</p>';
        }

        let html = '<div class="npc-dialog-content">';

        // Show main dialog text
        html += `<div class="npc-text" style="margin-bottom: 15px; line-height: 1.6;">${this.currentNPC.currentDialog || 'Hello, agent.'}</div>`;

        // Show additional info if available (from dialog.info)
        if (this.currentNPC.info) {
            html += `
                <div class="npc-info" style="margin-top: 15px; padding: 10px; background: rgba(0,100,200,0.1); border-left: 3px solid #0af; font-size: 0.9em; color: #ccc; line-height: 1.5;">
                    <strong style="color: #0af;">ℹ️ Info:</strong><br/>
                    ${this.currentNPC.info}
                </div>
            `;
        }

        // Show quest status if applicable
        if (this.currentNPC.quests && this.currentNPC.quests.length > 0) {
            html += '<div class="npc-quests" style="margin-top: 15px; padding: 10px; background: rgba(100,100,0,0.1); border-left: 3px solid #ff0;">';
            html += '<strong style="color: #ff0;">📜 Quests:</strong><br/>';
            this.currentNPC.quests.forEach(quest => {
                const icon = quest.completed ? '✅' : quest.active ? '🔄' : '❗';
                const color = quest.completed ? '#0f0' : quest.active ? '#ff0' : '#f80';
                const status = quest.completed ? 'Complete' : quest.active ? 'In Progress' : 'Available';
                html += `
                    <div style="color: ${color}; margin: 5px 0; padding: 5px 0;">
                        ${icon} <strong>${quest.name}</strong> - <em>${status}</em>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Render dialog choices INLINE (not as buttons at bottom)
        if (this.currentNPC.choices && this.currentNPC.choices.length > 0) {
            html += '<div class="npc-choices-list" style="margin-top: 20px; border-top: 2px solid rgba(0,255,255,0.3); padding-top: 15px;">';
            this.currentNPC.choices.forEach((choice, index) => {
                const num = index + 1;
                html += `
                    <div class="npc-choice-option"
                         onclick="if(window.game && window.game.currentNPC && window.game.currentNPC.choices && window.game.currentNPC.choices[${index}] && window.game.currentNPC.choices[${index}].executeAction) { window.game.currentNPC.choices[${index}].executeAction(); }"
                         style="padding: 12px 15px; margin: 8px 0; background: linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.05) 100%); border-left: 4px solid #0ff; cursor: pointer; transition: all 0.2s; border-radius: 4px;"
                         onmouseover="this.style.background='linear-gradient(90deg, rgba(0,255,255,0.25) 0%, rgba(0,255,255,0.15) 100%)'; this.style.borderLeftColor='#fff'; this.style.paddingLeft='20px';"
                         onmouseout="this.style.background='linear-gradient(90deg, rgba(0,255,255,0.1) 0%, rgba(0,255,255,0.05) 100%)'; this.style.borderLeftColor='#0ff'; this.style.paddingLeft='15px';">
                        <span style="color: #0ff; font-weight: bold; margin-right: 10px;">${num}.</span>
                        <span style="color: #fff; font-size: 1.05em;">${choice.text}</span>
                    </div>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    });

    // Loadouts content
    engine.registerGenerator('generateLoadoutsContent', function() {
        let html = '<div class="loadouts-content">';

        // Initialize equipment system if needed
        if (!this.agentLoadouts) {
            if (this.logger) this.logger.debug('📦 Initializing equipment system in loadouts dialog...');
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
                    if (this.logger) this.logger.debug(`📦 Created loadout for ${agent.name} (ID: ${agent.id})`);
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

            if (this.logger) this.logger.debug('📦 Displaying loadouts for agents:', this.activeAgents.map(a => `${a.name} (ID: ${a.id})`));
            if (this.logger) this.logger.debug('📦 Current agentLoadouts:', this.agentLoadouts);

            html += '<div style="max-height: 300px; overflow-y: auto;">';
            this.activeAgents.forEach(agent => {
                const loadout = this.agentLoadouts[agent.id] || {};
                if (this.logger) this.logger.debug(`📦 Agent ${agent.name} (ID: ${agent.id}) loadout:`, loadout);

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

    // NPC choices - Choices are rendered inline in generateNPCDialog, so no separate buttons needed
    engine.registerGenerator('generateNPCChoices', function() {
        // Return empty array - all choices including close are rendered inline
        return [];
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

    // Mission progress content generator (J key)
    engine.registerGenerator('generateMissionProgress', function() {
        // Gather comprehensive mission data (same as completion modal)
        const missionSummary = this.gatherMissionSummary ? this.gatherMissionSummary(false) : {
            mainObjectives: [],
            sideQuests: [],
            rewards: [],
            itemsCollected: {},
            completedMainObjectives: 0,
            totalMainObjectives: 0,
            intelCollected: 0,
            totalCredits: 0,
            totalResearchPoints: 0
        };

        // Build content with comprehensive layout
        let content = `
            <!-- Mission Header Info -->
            <div style="margin-bottom: 20px; padding: 15px; background: rgba(0,255,255,0.1); border-radius: 5px;">
                <h3 style="color: #ffff00; margin-bottom: 10px;">🎯 ${this.currentMission ? this.currentMission.title : 'Current Mission'}</h3>
                <div style="color: #ccc; display: flex; justify-content: space-around; flex-wrap: wrap;">
                    <div>⏱️ Time: ${Math.floor(this.missionTimer / 60)}:${String(this.missionTimer % 60).padStart(2, '0')}</div>
                    <div>👥 Squad: ${this.agents.filter(a => a.alive).length}/${this.agents.length}</div>
                    <div>🎯 Enemies: ${this.enemies.filter(e => !e.alive).length}/${this.enemies.length} eliminated</div>
                </div>
            </div>

            <!-- Primary Objectives -->
            <div style="margin-bottom: 20px;">
                <h3 style="color: #ffff00; margin-bottom: 10px;">📋 PRIMARY OBJECTIVES (${missionSummary.completedMainObjectives}/${missionSummary.totalMainObjectives})</h3>
                <div style="padding-left: 20px;">
        `;

        // Show primary objectives with detailed status
        if (missionSummary.mainObjectives.length > 0) {
            missionSummary.mainObjectives.forEach(obj => {
                const icon = obj.completed ? '✅' : obj.required ? '⬜' : '⭕';
                const color = obj.completed ? '#00ff00' : obj.required ? '#ffffff' : '#ffaa00';
                content += `
                    <div style="margin-bottom: 8px; color: ${color};">
                        ${icon} ${obj.description || obj.name}
                        ${obj.progress ? ` <span style="color: #00ffff;">[${obj.progress}]</span>` : ''}
                        ${!obj.required ? ' <span style="color: #888;">(Optional)</span>' : ''}
                    </div>
                `;
            });
        } else {
            content += '<div style="color: #888;">No objectives available</div>';
        }

        content += '</div></div>';

        // Side quests with comprehensive status
        content += `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #ff00ff; margin-bottom: 10px;">📜 SIDE QUESTS</h3>
                <div style="padding-left: 20px;">
        `;

        if (missionSummary.sideQuests.length > 0) {
            missionSummary.sideQuests.forEach(quest => {
                let icon, color, status;
                if (!quest.discovered) {
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

                content += `
                    <div style="margin-bottom: 8px; color: ${color}; ${!quest.discovered ? 'opacity: 0.5;' : ''}">
                        ${icon} ${quest.discovered ? quest.name : '???'} - ${status}
                        ${quest.discovered && quest.reward ? ` <span style="color: #ffd700;">(${quest.reward})</span>` : ''}
                    </div>
                `;
            });
        } else {
            content += '<div style="color: #888;">No quests discovered</div>';
        }

        content += '</div></div>';

        // Current Progress & Rewards
        content += `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #ffa500; margin-bottom: 10px;">💰 CURRENT PROGRESS</h3>
                <div style="padding-left: 20px; color: #ffffff;">
                    <div>💰 Credits earned: ${missionSummary.totalCredits || 0}</div>
                    <div>🔬 Research Points: ${missionSummary.totalResearchPoints || 0}</div>
                    <div>📄 Intel collected: ${missionSummary.intelCollected || 0}</div>
        `;

        // Show items collected
        if (missionSummary.itemsCollected && Object.keys(missionSummary.itemsCollected).length > 0) {
            const itemIcons = {
                health: '❤️',
                ammo: '🔫',
                armor: '🛡️',
                keycard: '🗝️',
                explosives: '💣'
            };

            for (let item in missionSummary.itemsCollected) {
                const count = missionSummary.itemsCollected[item];
                if (count > 0) {
                    content += `<div>${itemIcons[item] || '📦'} ${item}: ${count}</div>`;
                }
            }
        }

        content += '</div></div>';

        // Extraction Status
        content += `
            <div style="margin-bottom: 20px; padding: 15px; background: ${this.extractionEnabled ? 'rgba(0,255,0,0.1)' : 'rgba(255,255,0,0.1)'}; border-radius: 5px;">
                <div style="color: ${this.extractionEnabled ? '#00ff00' : '#ffff00'}; text-align: center; font-weight: bold;">
                    ${this.extractionEnabled ? '✅ EXTRACTION POINT ACTIVE - Head to extraction!' : '⏳ Complete objectives to activate extraction'}
                </div>
            </div>
        `;

        return content;
    });

    // RPG Shop generator
    engine.registerGenerator('generateRPGShop', function() {
        const shopId = this.dialogEngine?.stateData?.shopId || 'black_market';

        // Access shopManager through gameServices
        const shopManager = this.gameServices?.rpgService?.shopManager;
        if (!shopManager) {
            if (this.logger) this.logger.error('ShopManager not available');
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Shop system not initialized</div>';
        }

        // If no shops loaded, try to reload them
        if (shopManager.shops.size === 0) {
            if (this.logger) this.logger.warn('⚠️ No shops loaded, attempting to reload...');

            // Debug: Check what's available
            console.log('🔍 Debug - window.MAIN_CAMPAIGN_CONFIG exists?', !!window.MAIN_CAMPAIGN_CONFIG);
            console.log('🔍 Debug - window.MAIN_CAMPAIGN_CONFIG.rpgConfig exists?', !!window.MAIN_CAMPAIGN_CONFIG?.rpgConfig);
            console.log('🔍 Debug - rpgConfig.shops exists?', !!window.MAIN_CAMPAIGN_CONFIG?.rpgConfig?.shops);
            if (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig?.shops) {
                console.log('🔍 Debug - Shop keys:', Object.keys(window.MAIN_CAMPAIGN_CONFIG.rpgConfig.shops));
            }

            // Set config first
            const rpgConfig = window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || this.getRPGConfig?.() || {};
            if (rpgConfig && rpgConfig.shops) {
                shopManager.setConfig(rpgConfig);
                shopManager.loadShops();
                if (this.logger) this.logger.info(`✅ Reloaded ${shopManager.shops.size} shops`);
            } else {
                if (this.logger) this.logger.error('❌ Cannot reload shops - no rpgConfig.shops found');
                console.log('🔍 Debug - rpgConfig object:', rpgConfig);
                console.log('🔍 Debug - rpgConfig keys:', rpgConfig ? Object.keys(rpgConfig) : 'null/undefined');
            }
        }

        const shop = shopManager.shops.get(shopId);
        if (!shop) {
            if (this.logger) this.logger.error(`Shop not found: ${shopId} (Total shops: ${shopManager.shops.size})`);
            return '<div style="color: #ff6666; text-align: center; padding: 40px;">Shop not available</div>';
        }

        // Get current tab (default to 'buy')
        const currentTab = this.dialogEngine?.stateData?.shopTab || 'buy';

        // Get credits from ResourceService (team credits, not individual agent)
        const agentCredits = this.gameServices?.resourceService?.get('credits') || this.credits || 0;

        let html = '<div class="rpg-shop-content">';

        // Shop description
        html += `<div style="color: #00ffff; margin-bottom: 15px; text-align: center;">${shop.name}</div>`;
        if (shop.description) {
            html += `<div style="color: #ccc; margin-bottom: 20px; text-align: center; font-size: 0.9em;">${shop.description}</div>`;
        }

        // Agent credits display
        html += `<div style="color: #ffff00; margin-bottom: 20px; text-align: center; font-size: 1.1em;">Your Credits: ${agentCredits.toLocaleString()} ©</div>`;

        // Tab buttons
        html += `
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #00ffff;">
                <button class="dialog-button ${currentTab === 'buy' ? 'primary' : ''}"
                        onclick="game.switchRPGShopTab('${shopId}', 'buy')"
                        style="flex: 1; ${currentTab === 'buy' ? 'background: #00ffff; color: #000;' : ''}">
                    BUY
                </button>
                <button class="dialog-button ${currentTab === 'sell' ? 'primary' : ''}"
                        onclick="game.switchRPGShopTab('${shopId}', 'sell')"
                        style="flex: 1; ${currentTab === 'sell' ? 'background: #00ffff; color: #000;' : ''}">
                    SELL
                </button>
            </div>
        `;

        // Content based on tab - height controlled by CSS for #dialog-rpg-shop
        html += '<div class="shop-items-list">';

        if (currentTab === 'buy') {
            // Buy tab - show shop inventory
            if (!shop.inventory || shop.inventory.length === 0) {
                html += '<div style="color: #999; text-align: center; padding: 40px;">Shop is out of stock!</div>';
            } else {
                shop.inventory.forEach(item => {
                    const canAfford = agentCredits >= item.price;
                    const inStock = item.stock === -1 || item.stock > 0;

                    // Check how many of this item the player already owns
                    const inventoryObj = this.inventoryManager?.getInventory(this._selectedAgent?.id || this._selectedAgent?.name) || { items: [] };
                    const inventoryItems = inventoryObj.items || [];
                    const ownedItem = inventoryItems.find(invItem => invItem.id === item.id);
                    const ownedQuantity = ownedItem ? ownedItem.quantity : 0;

                    html += `
                        <div style="background: ${canAfford && inStock ? 'rgba(0,255,255,0.1)' : 'rgba(128,128,128,0.1)'};
                                   padding: 15px; margin-bottom: 10px; border-radius: 5px;
                                   border: 1px solid ${canAfford && inStock ? '#00ffff' : '#666'};">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: ${canAfford && inStock ? '#fff' : '#999'};">
                                        ${item.icon || '📦'} ${item.name}
                                        ${ownedQuantity > 0 ? `<span style="color: #00ff00; font-size: 0.85em; margin-left: 8px;">(Owned: ${ownedQuantity})</span>` : ''}
                                    </div>
                                    ${item.description ? `<div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">${item.description}</div>` : ''}
                                    <div style="color: #aaa; font-size: 0.85em;">
                                        ${item.damage ? `DMG: ${item.damage} ` : ''}
                                        ${item.defense ? `DEF: ${item.defense} ` : ''}
                                        ${item.weight ? `Weight: ${item.weight}kg` : ''}
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="color: #ffff00; font-weight: bold; margin-bottom: 5px;">${item.price} ©</div>
                                    ${item.stock !== -1 ? `<div style="color: #aaa; font-size: 0.85em;">Stock: ${item.stock}</div>` : ''}
                                    ${canAfford && inStock ?
                                        `<button class="dialog-button" onclick="game.buyRPGItem('${shopId}', '${item.id}')" style="margin-top: 5px;">BUY</button>` :
                                        `<button class="dialog-button" disabled style="margin-top: 5px; opacity: 0.5;">UNAVAILABLE</button>`
                                    }
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
        } else {
            // Sell tab - show agent's sellable items
            const inventoryObj = this.inventoryManager?.getInventory(this._selectedAgent?.id || this._selectedAgent?.name) || { items: [] };
            const inventoryItems = inventoryObj.items || [];
            const sellableItems = inventoryItems.filter(item => item.value && item.value > 0);

            if (sellableItems.length === 0) {
                html += '<div style="color: #999; text-align: center; padding: 40px;">No items to sell</div>';
            } else {
                html += '<div style="color: #ccc; margin-bottom: 15px; text-align: center; font-size: 0.9em;">Select items from your inventory to sell</div>';

                sellableItems.forEach(item => {
                    const sellPrice = Math.floor((item.value || 0) * 0.5); // 50% of value

                    html += `
                        <div style="background: rgba(255,255,0,0.1); padding: 15px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ffff00;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: #fff;">
                                        ${item.icon || '📦'} ${item.name}
                                    </div>
                                    ${item.description ? `<div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">${item.description}</div>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <div style="color: #00ff00; font-weight: bold; margin-bottom: 5px;">${sellPrice} ©</div>
                                    <button class="dialog-button" onclick="game.sellRPGItem('${shopId}', '${item.id}')" style="margin-top: 5px;">SELL</button>
                                </div>
                            </div>
                        </div>
                    `;
                });
            }
        }

        html += '</div>'; // Close scrollable content
        html += '</div>'; // Close rpg-shop-content

        return html;
    });

    // Save/Load UI generator - Enhanced version matching modal engine features
    engine.registerGenerator('generateSaveLoadUI', function() {
        // Get mode from state data or default to 'save'
        const mode = this.stateData?.saveLoadMode || 'save';
        const saves = this.getAllSaves ? this.getAllSaves() : [];

        let html = '<div class="save-load-ui" style="max-width: 800px; margin: 0 auto;">';

        // Mode tabs
        html += `
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.2);">
                <button class="dialog-button"
                        onclick="game.dialogEngine.stateData = { saveLoadMode: 'save' }; game.dialogEngine.navigateTo('save-load', null, true);"
                        style="flex: 1; background: ${mode === 'save' ? 'rgba(0,255,0,0.2)' : 'transparent'}; border-bottom: ${mode === 'save' ? '3px solid #00ff00' : 'none'};">
                    💾 SAVE GAME
                </button>
                <button class="dialog-button"
                        onclick="game.dialogEngine.stateData = { saveLoadMode: 'load' }; game.dialogEngine.navigateTo('save-load', null, true);"
                        style="flex: 1; background: ${mode === 'load' ? 'rgba(0,255,255,0.2)' : 'transparent'}; border-bottom: ${mode === 'load' ? '3px solid #00ffff' : 'none'};">
                    📁 LOAD GAME
                </button>
            </div>
        `;

        // NEW SAVE button for save mode
        if (mode === 'save') {
            html += `
                <div style="margin-bottom: 20px;">
                    <button class="dialog-button" onclick="game.createNewSave(); game.dialogEngine.navigateTo('save-load', null, true);"
                            style="width: 100%; background: rgba(0,255,0,0.1); border: 2px solid #00ff00; font-weight: bold;">
                        ➕ CREATE NEW SAVE
                    </button>
                </div>
            `;
        }

        // Save list
        html += '<div style="max-height: 400px; overflow-y: auto;">';

        if (saves.length === 0) {
            html += `
                <div style="text-align: center; padding: 60px 20px; color: #888;">
                    <div style="font-size: 3em; margin-bottom: 20px;">${mode === 'save' ? '💾' : '📁'}</div>
                    <div style="font-size: 1.2em; margin-bottom: 10px;">No saved games found</div>
                    <div style="font-size: 0.9em;">${mode === 'save' ? 'Click "CREATE NEW SAVE" to save your progress' : 'Start a new game first'}</div>
                </div>
            `;
        } else {
            saves.forEach((save, index) => {
                const saveDate = new Date(save.timestamp);
                const formattedDate = saveDate.toLocaleDateString() + ' ' + saveDate.toLocaleTimeString();
                const missionNum = (save.gameState?.currentMissionIndex ?? 0) + 1;
                const credits = (save.gameState?.credits ?? 0).toLocaleString();

                html += `
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="font-size: 2em;">${mode === 'save' ? '💾' : '📁'}</div>
                            <div style="flex: 1;">
                                <div style="font-weight: bold; font-size: 1.1em; color: #fff; margin-bottom: 5px;">
                                    ${save.name || `Save Slot ${index + 1}`}
                                </div>
                                <div style="color: #888; font-size: 0.85em;">
                                    📅 ${formattedDate} |
                                    🎯 Mission ${missionNum} |
                                    💰 ${credits} credits
                                </div>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="dialog-button"
                                        onclick="game.${mode === 'save' ? 'overwriteSave' : 'loadSaveSlot'}('${save.id}'); ${mode === 'load' ? 'game.dialogEngine.closeAll();' : 'game.dialogEngine.navigateTo(\'save-load\', null, true);'}"
                                        style="background: ${mode === 'save' ? 'rgba(255,165,0,0.2)' : 'rgba(0,255,0,0.2)'}; border-color: ${mode === 'save' ? '#ffa500' : '#00ff00'}; min-width: 100px;">
                                    ${mode === 'save' ? '⚠️ OVERWRITE' : '✓ LOAD'}
                                </button>
                                <button class="dialog-button"
                                        onclick="game.deleteSave('${save.id}'); game.dialogEngine.navigateTo('save-load', null, true);"
                                        style="background: rgba(255,0,0,0.2); border-color: #ff0000; min-width: 80px;">
                                    🗑️ DELETE
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        html += '</div>'; // Close scrollable list

        // Quick save/load buttons at bottom
        html += `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid rgba(255,255,255,0.2); display: flex; gap: 10px;">
                <button class="dialog-button" onclick="game.saveGame('quicksave'); game.dialogEngine.navigateTo('save-load', null, true);"
                        style="flex: 1; background: rgba(255,215,0,0.1); border-color: #ffd700;">
                    ⚡ QUICK SAVE
                </button>
                <button class="dialog-button" onclick="game.loadGame('quicksave'); game.dialogEngine.closeAll();"
                        style="flex: 1; background: rgba(255,215,0,0.1); border-color: #ffd700;">
                    ⚡ QUICK LOAD
                </button>
            </div>
        `;

        html += '</div>'; // Close save-load-ui
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

    // Confirm hire - uses selectedAgent from state
    engine.registerAction('confirmHire', function(context) {
        const selectedAgent = this.stateData.selectedAgent;

        if (this.logger) this.logger.debug('confirmHire action called');
        if (this.logger) this.logger.debug('Selected agent from state:', selectedAgent);

        if (!selectedAgent) {
            if (this.logger) this.logger.error('No agent selected for hire confirmation');
            this.back();
            return;
        }

        const agent = game.availableAgents.find(a => a.id === selectedAgent.id);

        if (this.logger) this.logger.debug('Found agent in availableAgents:', agent);
        if (this.logger) this.logger.debug('Agent details:', {
            id: agent?.id,
            name: agent?.name,
            hired: agent?.hired,
            cost: agent?.cost,
            playerCredits: game.credits,
            canAfford: game.credits >= (agent?.cost || 0)
        });

        if (agent && !agent.hired && game.credits >= agent.cost) {
            // Use AgentService to properly hire the agent (NO FALLBACK)
            if (!game.gameServices || !game.gameServices.agentService) {
                throw new Error('AgentService is required - legacy hiring removed');
            }

            const success = game.gameServices.agentService.hireAgent(agent.id);
            if (success) {
                if (this.logger) this.logger.info(`✅ Successfully hired ${agent.name} through AgentService`);

                // Initialize equipment loadout for new agent
                if (game.agentLoadouts && !game.agentLoadouts[agent.id]) {
                    game.agentLoadouts[agent.id] = {
                        weapon: null,
                        armor: null,
                        utility: null,
                        special: null
                    };
                    if (this.logger) this.logger.info(`Initialized loadout for ${agent.name}`);
                }
            }

            game.updateHubStats();

            if (this.logger) this.logger.info(`✅ Hired ${agent.name} for ${agent.cost} credits`);

            // Update the hub screen content if it's visible (without navigation)
            if (window.screenManager && window.screenManager.currentScreen === 'hub') {
                // Just update the agent count in the hub without re-navigating
                const agentCards = document.querySelectorAll('.hub-card');
                agentCards.forEach(card => {
                    const titleEl = card.querySelector('.card-title');
                    if (titleEl && titleEl.textContent === 'Active Agents') {
                        const valueEl = card.querySelector('.card-value');
                        if (valueEl) {
                            valueEl.textContent = game.activeAgents.length;
                        }
                    }
                });
            }

            // Navigate directly back to hire-agents (this will close the confirmation)
            this.navigateTo('hire-agents', null, true); // Force refresh to show updated list
        } else {
            if (this.logger) this.logger.error('Cannot hire agent - condition failed:', {
                agent: agent,
                agentExists: !!agent,
                isHired: agent?.hired,
                agentCost: agent?.cost,
                playerCredits: game.credits,
                canAfford: agent ? (game.credits >= agent.cost) : false
            });
            this.back();
        }
    });

    // Purchase item
    engine.registerAction('purchaseItem', function(itemId, context) {
        const item = this.stateData.selectedItem;
        if (item && game.credits >= item.price) {
            // Use ResourceService for payment (NO FALLBACK)
            if (!game.gameServices?.resourceService) {
                throw new Error('ResourceService is required - legacy shop removed');
            }
            game.gameServices.resourceService.spend('credits', item.price, `purchase ${item.name}`);

            // Update item owned count (PRESERVED LOGIC)
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
            game.dialogEngine.navigateTo('arsenal');
        }
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

        if (this.logger) this.logger.debug('🔧 showEquipmentForAgent called with:', agentId, '→ using ID:', actualAgentId);

        // Initialize equipment system if needed
        if (!game.agentLoadouts) {
            game.initializeEquipmentSystem();
        }

        // Set selected agent
        game.selectedEquipmentAgent = parseInt(actualAgentId);

        // Close declarative dialogs and open arsenal
        this.closeAll();
        game.dialogEngine.navigateTo('arsenal');
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

        // If we're in a mission, also update the mission agent's weapon property
        if (game.currentScreen === 'game' && game.agents) {
            // Try to find the mission agent using various ID formats
            const missionAgent = game.agents.find(a =>
                a.name === agentId ||
                String(a.id) === String(agentId)
            );

            if (missionAgent && weapon) {
                missionAgent.weapon = {
                    type: weapon.id,
                    damage: weapon.damage,
                    range: weapon.range || 5
                };
                if (game.logger) game.logger.info(`⚔️ Equipped ${weapon.name} to ${missionAgent.name} (damage: ${weapon.damage})`);
            } else {
                if (game.logger) game.logger.debug(`⚠️ Could not find mission agent for ID: ${agentId}`);
            }
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

    // Confirm stat allocation
    engine.registerAction('confirmStatAllocation', function() {
        if (game.confirmStatAllocation) {
            // Get agentId from state data
            const agentId = this.stateData?.agentId;
            game.confirmStatAllocation(agentId);
        }
    });

    // Generate skill tree content
    engine.registerGenerator('generateSkillTree', function() {
        // 'this' is game, but we can access dialog engine via _dialogEngineContext
        const dialogEngine = this._dialogEngineContext || this.dialogEngine;
        if (this.logger) this.logger.debug(`🎯 generateSkillTree called, stateData:`, dialogEngine?.stateData);

        const agentId = dialogEngine?.stateData?.agentId;
        if (!agentId) {
            if (this.logger) this.logger.error(`❌ No agentId in stateData:`, dialogEngine?.stateData);
            return '<p style="color: #ff0000;">No agent selected</p>';
        }

        if (this.logger) this.logger.debug(`🎯 Looking for agent with ID: ${agentId}`);
        const agent = this.findAgentForRPG(agentId);
        if (!agent || !agent.rpgEntity) {
            if (this.logger) this.logger.error(`❌ Agent not found or no RPG entity for ID: ${agentId}`);
            return '<p style="color: #ff0000;">Agent not found or has no RPG entity</p>';
        }

        const rpg = agent.rpgEntity;
        const rpgConfig = this.getRPGConfig ? this.getRPGConfig() : null;
        if (!rpgConfig?.skills) {
            return '<p style="color: #ff0000;">No skills configuration available</p>';
        }

        // Build skill tree HTML
        let html = `
            <div class="skill-tree-container" style="max-height: 500px; overflow-y: auto;">
                <div style="margin-bottom: 20px; padding: 10px; background: rgba(0,255,0,0.1); border-radius: 5px;">
                    <h3 style="color: #00ff00; margin: 0;">Agent: ${agent.name}</h3>
                    <p style="color: #00ff00; margin: 5px 0;">Available Skill Points: ${rpg.availableSkillPoints || 0}</p>
                </div>
        `;

        // Group skills by category
        const skillCategories = {
            combat: [],
            stealth: [],
            tech: [],
            support: []
        };

        // Categorize skills
        Object.entries(rpgConfig.skills).forEach(([skillId, skill]) => {
            if (skillId.includes('stealth') || skillId.includes('silent')) {
                skillCategories.stealth.push({ id: skillId, ...skill });
            } else if (skillId.includes('hack') || skillId.includes('tech') || skillId.includes('cyber')) {
                skillCategories.tech.push({ id: skillId, ...skill });
            } else if (skillId.includes('medic') || skillId.includes('heal') || skillId.includes('support')) {
                skillCategories.support.push({ id: skillId, ...skill });
            } else {
                skillCategories.combat.push({ id: skillId, ...skill });
            }
        });

        // Render each category
        Object.entries(skillCategories).forEach(([category, skills]) => {
            if (skills.length === 0) return;

            html += `
                <div style="margin-bottom: 20px;">
                    <h4 style="color: #ffaa00; text-transform: capitalize; margin-bottom: 10px;">
                        ${category} Skills
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
            `;

            skills.forEach(skill => {
                const currentLevel = rpg.skills?.[skill.id] || 0;
                const maxLevel = skill.maxLevel || 5;
                const canLearn = rpg.availableSkillPoints > 0 && currentLevel < maxLevel;

                html += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;
                                border: 1px solid ${canLearn ? '#00ff00' : '#666'};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h5 style="color: #00ffff; margin: 0;">${skill.name}</h5>
                                <p style="color: #aaa; margin: 5px 0; font-size: 0.9em;">${skill.description}</p>
                                <div style="color: #ffaa00;">
                                    Level: ${currentLevel} / ${maxLevel}
                                    ${skill.effect ? ` | Effect: +${currentLevel * (skill.perLevel || 1)} ${skill.effect}` : ''}
                                </div>
                            </div>
                            <div>
                                ${canLearn ? `
                                    <button class="dialog-button primary"
                                            onclick="window.declarativeDialogEngine.executeAction('learnSkill:${agentId}:${skill.id}')"
                                            style="padding: 5px 15px;">
                                        Learn (+1)
                                    </button>
                                ` : currentLevel >= maxLevel ? `
                                    <span style="color: #00ff00;">MAXED</span>
                                ` : `
                                    <span style="color: #666;">No Points</span>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += '</div>';
        return html;
    });

    // Learn skill action
    engine.registerAction('learnSkill', function(params) {
        const parts = params.split(':');
        const agentId = parts[0];
        const skillId = parts[1];

        if (game.logger) {
            game.logger.debug(`🎓 learnSkill action: params="${params}", agentId="${agentId}", skillId="${skillId}"`);
        }

        if (game.learnSkill) {
            const success = game.learnSkill(agentId, skillId);
            if (success) {
                // Re-set the agentId in state data for refresh
                this.stateData = this.stateData || {};
                this.stateData.agentId = agentId;

                // Always refresh the skill tree to show the updated skills
                // User can manually navigate back when done
                this.navigateTo('skill-tree', null, true);
            }
        }
    });

    // Select NPC choice - executes the action associated with the choice
    engine.registerAction('selectNPCChoice', function(choiceId) {
        if (game.logger) {
            game.logger.debug(`💬 selectNPCChoice action: choiceId="${choiceId}"`);
        }

        if (!game.currentNPC || !game.currentNPC.choices) {
            if (game.logger) game.logger.warn('No NPC or choices available');
            return;
        }

        const choice = game.currentNPC.choices.find(c => c.id == choiceId);
        if (!choice) {
            if (game.logger) game.logger.warn(`Choice ${choiceId} not found`);
            return;
        }

        // Execute the choice's action
        if (choice.executeAction) {
            choice.executeAction();
        }
    });
};

// Declarative wrapper functions removed - call dialogEngine.navigateTo() directly
// Old functions: showAgentManagementDeclarative, showEquipmentDeclarative, showResearchLabDeclarative, showIntelDeclarative

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
if (this.logger) this.logger.info('✨ Declarative Dialog System loaded and active');