    // Game Flow
CyberOpsGame.prototype.updateMenuState = function() {
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;
        const hasSavedGame = this.hasSavedGame();

        document.getElementById('campaignButton').style.display = hasProgress ? 'none' : 'block';
        document.getElementById('continueButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('hubButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('saveButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('loadButton').style.display = hasSavedGame ? 'block' : 'none';
}

CyberOpsGame.prototype.startCampaign = function() {
        if (this.logger) this.logger.debug('🚀 startCampaign() called - checking missions before showing hub...');
        if (this.logger) this.logger.debug('- this.missions exists:', !!this.missions);
        if (this.logger) this.logger.debug('- this.missions length:', this.missions ? this.missions.length : 'UNDEFINED');

        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.currentMissionIndex = 0;
        // Mission tracking now handled by MissionService

        // Initialize game state for new campaign
        this.gameServices.resourceService.set('credits', this.startingCredits || 10000, 'new campaign');
        this.gameServices.resourceService.set('researchPoints', this.startingResearchPoints || 100, 'new campaign');
        this.gameServices.resourceService.set('worldControl', 0, 'new campaign');

        // Agents are already properly initialized by AgentService from campaign content
        // Agents with hired: true in campaign-content.js are already in activeAgents
        // No need to hire them again!

        // EMERGENCY CHECK: Make sure missions are initialized before showing hub
        if (!this.missions || this.missions.length === 0) {
            if (this.logger) this.logger.error('🚨 EMERGENCY in startCampaign: missions not initialized! Calling initializeHub...');
            this.initializeHub();
        }

        window.screenManager.navigateTo('hub');
}

// Alias for compatibility with screen system
CyberOpsGame.prototype.startNewGame = function() {
    // Close any open dialogs
    if (this.dialogEngine) {
        this.dialogEngine.closeAll();
    }

    // Start the campaign
    this.startCampaign();
}

CyberOpsGame.prototype.continueCampaign = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        window.screenManager.navigateTo('hub');
}

CyberOpsGame.prototype.selectMission = function() {
        // Use declarative dialog system for mission selection
        if (this.dialogEngine && this.dialogEngine.navigateTo) {
            // Save where we came from
            this.dialogReturnScreen = 'menu';
            // Don't hide main menu - let it serve as background
            // The dialog will overlay on top of it
            // Show mission select dialog
            this.dialogEngine.navigateTo('mission-select-hub');
        } else {
            if (this.logger) this.logger.error('Dialog engine not available for mission selection');
        }
}

// Old mission select dialog functions removed - now using declarative dialog system

CyberOpsGame.prototype.showMissionBriefing = function(mission) {
    // Always use declarative dialog system
    if (this.dialogEngine) {
        this.currentMission = mission;
        window.screenManager.navigateTo('mission-briefing', { selectedMission: mission });
        return;
    }
    if (this.logger) this.logger.error('Dialog engine not available for mission briefing');

        // Continue main theme music during briefing (don't change music yet)
        if (this.logger) this.logger.debug('🎵 Mission briefing - keeping main theme music playing');
        // Music will only change when mission actually starts

        const objList = document.getElementById('objectivesList');
        objList.innerHTML = '';
        mission.objectives.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'objective-item';
            // Handle both object and string formats for backward compatibility
            const objText = typeof obj === 'string' ? obj : (obj.description || obj.displayText || 'Complete objective');
            div.textContent = '▸ ' + objText;
            objList.appendChild(div);
        });

        const squadSel = document.getElementById('squadSelection');
        squadSel.innerHTML = '';
        // Reset selection through AgentService
        if (this.gameServices && this.gameServices.agentService) {
            this.gameServices.agentService.resetSelection();
        }

        // Calculate max agents for this mission
        // Use mission-specific settings if available, otherwise use defaults
        const maxAgentsForMission = this.getMaxAgentsForMission ?
            this.getMaxAgentsForMission(this.currentMissionIndex) :
            (this.currentMissionIndex === 0 ? 4 :
             this.currentMissionIndex < 3 ? 5 : 6);

        // Use active agents from hub for mission briefing
        const availableAgentsForMission = this.activeAgents.length > 0 ? this.activeAgents : this.agentTemplates;

        // Update squad info display
        const squadInfo = document.getElementById('squadInfo');
        if (squadInfo) {
            const agentStatus = availableAgentsForMission.length < maxAgentsForMission ?
                `<span style="color: #ffaa00;">⚠️ ${availableAgentsForMission.length}/${maxAgentsForMission} agents available - Hire more agents from the Hub!</span>` :
                `<span style="color: #00ff00;">✅ ${availableAgentsForMission.length}/${maxAgentsForMission} agents available</span>`;
            squadInfo.innerHTML = agentStatus;
        }

        // Show warning if not enough agents are hired for the mission
        if (availableAgentsForMission.length < maxAgentsForMission) {
            if (this.logger) this.logger.debug(`⚠️ Only ${availableAgentsForMission.length} agents available, but mission allows ${maxAgentsForMission}`);
        }

        availableAgentsForMission.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            const agentName = agent.name || `Agent ${idx + 1}`;
            const agentId = agent.id || agentName;
            const agentHealth = agent.health;
            const agentDamage = agent.damage;
            const agentSpeed = agent.speed;

            // Get actual equipped items from agentLoadouts
            let weaponInfo = '<div style="color: #888; font-size: 0.9em;">🔫 No weapon</div>';
            if (this.agentLoadouts && this.agentLoadouts[agentId]) {
                const loadout = this.agentLoadouts[agentId];

                // Show equipped weapon
                if (loadout.weapon) {
                    const weapon = this.getItemById ? this.getItemById('weapon', loadout.weapon) : null;
                    if (weapon) {
                        weaponInfo = `<div style="color: #ffa500; font-size: 0.9em;">🔫 ${weapon.name}</div>`;
                    }
                }

                // Show equipped armor
                if (loadout.armor) {
                    const armor = this.getItemById ? this.getItemById('armor', loadout.armor) : null;
                    if (armor) {
                        weaponInfo += `<div style="color: #00aaff; font-size: 0.9em;">🛡️ ${armor.name}</div>`;
                    }
                }

                // If nothing equipped, show unequipped message
                if (!loadout.weapon && !loadout.armor) {
                    weaponInfo = '<div style="color: #888; font-size: 0.9em;">🔫 No equipment</div>';
                }
            }

            card.innerHTML = `
                <div style="font-weight: bold; color: #00ffff;">${agentName}</div>
                ${weaponInfo}
                <div style="font-size: 0.8em; margin-top: 5px;">
                    HP: ${agentHealth} | DMG: ${agentDamage}<br>
                    Speed: ${agentSpeed}
                </div>
            `;
            card.onclick = () => {
                // NOTE: selectedAgents is now a computed property - need to get, modify, then set
                const currentSelection = [...this.selectedAgents]; // Get current selection
                const existing = currentSelection.findIndex(a => a.template === idx);
                if (existing !== -1) {
                    // Deselect - remove from array
                    currentSelection.splice(existing, 1);
                    this.selectedAgents = currentSelection; // Set modified array back
                    card.classList.remove('selected');
                } else if (currentSelection.length < maxAgentsForMission) {
                    // Select - add to array
                    currentSelection.push({ template: idx, ...agent });
                    this.selectedAgents = currentSelection; // Set modified array back
                    card.classList.add('selected');
                }
            };
            squadSel.appendChild(card);

            // Auto-select all available agents (up to mission max)
            if (idx < Math.min(maxAgentsForMission, availableAgentsForMission.length)) {
                card.click();
            }
        });

        this.currentMission = mission;
}

CyberOpsGame.prototype.startMission = function() {
        // NO AUTO-SELECTION - Use exactly what user selected
        if (this.logger) this.logger.debug('🔍 startMission called:');
        if (this.logger) this.logger.debug('  - this.selectedAgents:', this.selectedAgents?.length || 0);
        if (this.logger) this.logger.debug('  - this.activeAgents:', this.activeAgents?.length || 0);

        // Just log what's being used - no auto-selection
        if (this.selectedAgents?.length === 0) {
            if (this.logger) this.logger.warn('⚠️ Starting mission with 0 agents (user choice)');
        } else {
            if (this.logger) this.logger.info(`✅ Starting mission with ${this.selectedAgents?.length || 0} agents`);
        }

        // Auto-save before mission if enabled
        if (this.autoSaveEnabled) {
            if (this.logger) this.logger.debug('🔄 Creating pre-mission autosave...');
            const missionName = this.currentMission ? this.currentMission.title : 'Unknown Mission';
            this.saveToSlot('pre_mission_autosave', `Pre-Mission: ${missionName}`);
        }

        // Initialize InventoryService with current weapons before mission starts
        if (this.gameServices && this.gameServices.inventoryService) {
            if (this.weapons && this.weapons.length > 0) {
                // Ensure InventoryService has the current weapons
                this.gameServices.inventoryService.inventory.weapons = this.weapons.map(w => ({
                    ...w,
                    owned: w.owned || 1,
                    equipped: w.equipped || 0
                }));
                if (this.logger) this.logger.info(`📦 Synced ${this.weapons.length} weapons to InventoryService for mission`);
            }
            // Also sync equipment
            if (this.equipment && this.equipment.length > 0) {
                // Re-initialize to ensure all data is synced
                this.gameServices.inventoryService.initializeFromGame(this);
                if (this.logger) this.logger.info(`📦 Re-initialized InventoryService with game state`);
            }

            // Debug: Log agent loadouts status
            if (this.logger && this.agentLoadouts) {
                const loadoutKeys = Object.keys(this.agentLoadouts);
                this.logger.debug(`📋 Agent loadouts available: ${loadoutKeys.length} agents`);
                if (loadoutKeys.length > 0) {
                    this.logger.debug(`   Loadout IDs: ${loadoutKeys.join(', ')}`);
                    // Log first loadout as example
                    const firstKey = loadoutKeys[0];
                    const firstLoadout = this.agentLoadouts[firstKey];
                    if (firstLoadout && firstLoadout.weapon) {
                        this.logger.debug(`   Agent ${firstKey} has weapon: ${firstLoadout.weapon}`);
                    }
                }
            }
        }

        // Mission briefing now handled by screen manager
        const gameHUD = document.getElementById('gameHUD');
        gameHUD.style.display = 'block';
        // Don't override CSS positioning - it's already correctly set as fixed
        // Just ensure it's visible above the canvas

        // Squad health needs pointer events but not position changes
        const squadHealth = document.getElementById('squadHealth');
        if (squadHealth) {
            squadHealth.style.pointerEvents = 'auto';
            squadHealth.style.zIndex = '20';
        }

        // CRITICAL: Create mission snapshot BEFORE initMission
        // Must snapshot agents from hub BEFORE they're transformed for mission
        if (this.gameServices?.missionStateService) {
            if (this._retryInProgress) {
                // This is a retry - snapshot was already restored, keep it
                if (this.logger) this.logger.info('♻️ Retry in progress - using restored snapshot');
                this._retryInProgress = false; // Clear flag
            } else {
                // New mission attempt - clear any old snapshot and create fresh one
                if (this.gameServices.missionStateService.snapshot) {
                    if (this.logger) this.logger.warn('⚠️ Old snapshot exists - clearing before new mission');
                    this.gameServices.missionStateService.clearSnapshot();
                }

                // Create fresh snapshot for this mission attempt
                if (this.logger) this.logger.info('📸 Creating pre-mission snapshot');
                this.gameServices.missionStateService.createSnapshot(this);
            }
        }

        this.currentScreen = 'game';
        this.initMission();

        // Initialize music system if needed
        if (!this.musicSystem) {
            this.initMusicSystem();
        }

        // Stop ALL existing music before starting mission
        if (this.logger) this.logger.debug('🎵 Stopping all music for mission start');

        // Stop screen music system (handles all non-mission music)
        if (this.stopScreenMusic) {
            this.stopScreenMusic();
        }

        // Also cleanup any existing music system tracks
        if (this.musicSystem && this.cleanupMusicSystem) {
            this.cleanupMusicSystem();
            // Reinitialize after cleanup
            this.initMusicSystem();
        }

        // Load mission-specific music configuration
        if (this.currentMissionDef) {
            // Add default music config if mission doesn't have one
            if (!this.currentMissionDef.music) {
                // Map mission index to the appropriate level music
                const missionToMusic = {
                    0: 'main-01-001',  // Mission 1 -> Level 1 music
                    1: 'main-01-002',  // Mission 2 -> Level 2 music
                    2: 'main-01-003',  // Mission 3 -> Level 3 music
                    3: 'main-01-004',  // Mission 4 -> Level 4 music
                    4: 'main-02-001',  // Mission 5 -> Level 5 music
                    5: 'main-02-002'   // Mission 6 -> Level 1 music
                };

                const missionKey = missionToMusic[this.currentMissionIndex] || 'main-01-001';

                this.currentMissionDef.music = {
                    ambient: {
                        file: `music/missions/${missionKey}/ambient.mp3`,
                        volume: 0.6,
                        loop: true,
                        fadeIn: 2000
                    }
                };
            }

            if (this.logger) this.logger.debug('🎵 Loading mission music configuration');
            this.loadMissionMusic(this.currentMissionDef);
        }
}

CyberOpsGame.prototype.initMission = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameFlow') : null;
    }
        // CRITICAL: Ensure 3D mode is off at mission start
        if (this.is3DMode) {
            if (this.logger) this.logger.debug('🔄 Resetting to 2D mode for mission start');
            this.cleanup3D();
        }

        // Log mission start
        if (this.logEvent && this.currentMission) {
            const missionNum = this.currentMission.missionNumber || this.currentMission.id;
            this.logEvent(`Mission ${missionNum}: ${this.currentMission.title} started`, 'mission', true);
        }

        // Reset state
        // NOTE: this.agents is now a computed property - don't reset it
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.missionTimer = 0;
        this.isPaused = false;

        // Initialize NPC system (NPCs will be spawned after mission definition is loaded)
        if (this.initNPCSystem) {
            if (this.logger) this.logger.debug('🎮 Initializing NPC system...');
            this.initNPCSystem();
        } else {
            if (this.logger) this.logger.warn('⚠️ NPC system not loaded - initNPCSystem not found');
        }

        // Mission tracking handled by MissionService now
        this.intelThisMission = 0;
        this.researchPointsThisMission = 0;
        this.creditsThisMission = 0;
        this.itemsCollectedThisMission = {
            intel: 0,
            health: 0,
            ammo: 0,
            credits: 0,
            armor: 0,
            explosives: 0,
            keycard: 0
        };
        this.objectiveStatus = {};

        // Initialize event log and team commands
        this.initEventLog();
        this.initTeamCommands();
        this.clearEventLog();
        this.logMissionEvent('start');

        // Initialize keyboard handler
        if (!this.keyboardInitialized) {
            this.initKeyboardHandler();
            this.keyboardInitialized = true;
            if (this.logger) this.logger.info('⌨️ Keyboard handler initialized');
        }

        // CRITICAL: Full 3D mode reset to prevent movement state carryover
        if (this.logger) this.logger.debug('🔄 Resetting 3D mode state for new mission');

        // Reset 3D world creation flag for new mission
        this.world3DCreated = false;

        // Reset all 3D movement keys
        this.keys3D = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false
        };

        // Reset camera rotation
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;

        // Reset mouse movement deltas
        this.mouseMovementX = 0;
        this.mouseMovementY = 0;

        // Ensure 3D mode is disabled at mission start
        this.is3DMode = false;

        // Clear any active pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Generate map based on mission map type
        // Handle both old format (string) and new format (object with embedded data)
        if (typeof this.currentMission.map === 'object') {
            if (this.currentMission.map.embedded && this.loadMapFromEmbeddedTiles) {
                // Mission has embedded tiles (new format) - load them directly
                if (this.logger) this.logger.debug('🗺️ Loading embedded tiles from mission');
                this.map = this.loadMapFromEmbeddedTiles(this.currentMission.map);
                if (this.logger) this.logger.info(`📍 Loaded embedded map: ${this.currentMission.map.type} (${this.map.width}x${this.map.height})`);
            } else if (this.currentMission.map.generation && this.generateMapFromEmbeddedDefinition) {
                // Mission has generation rules (old format) - generate from rules
                if (this.logger) this.logger.debug('🗺️ Generating map from rules');
                this.map = this.generateMapFromEmbeddedDefinition(this.currentMission.map);
                if (this.logger) this.logger.debug(`📍 Generated map: ${this.currentMission.map.type} (${this.map.width}x${this.map.height})`);
            } else {
                // No embedded map available - this should never happen in new architecture
                if (this.logger) this.logger.error('❌ Mission has no embedded map! All missions must have embedded maps.');
                throw new Error('Mission missing embedded map data');
            }
        } else {
            // Legacy string map type - this should never happen in new architecture
            if (this.logger) this.logger.error('❌ Mission using legacy string map type! All missions must have embedded maps.');
            throw new Error('Mission using legacy map format');
        }

        // DEBUG: Check if map was modified right after assignment
        if (this.logger) this.logger.info('🔍 IMMEDIATE CHECK - Map loaded:');
        if (this.logger) this.logger.debug('  tile[6][6]:', this.map.tiles[6][6], '(should be 0)');
        if (this.logger) this.logger.debug('  tile[3][3]:', this.map.tiles[3][3]);

        // MAP TRACE 5: After map assignment - Check ALL rooms
        if (this.logger) this.logger.debug('🔍 MAP TRACE 5 - After map assignment, checking ALL rooms:');

        // Check each room position
        const roomPositions = [
            {x: 5, y: 5}, {x: 25, y: 5}, {x: 45, y: 5}, {x: 65, y: 5},
            {x: 5, y: 25}, {x: 25, y: 25}, {x: 45, y: 25}, {x: 65, y: 25},
            {x: 5, y: 45}, {x: 25, y: 45}, {x: 45, y: 45}, {x: 65, y: 45},
            {x: 5, y: 65}, {x: 25, y: 65}, {x: 45, y: 65}, {x: 65, y: 65}
        ];

        roomPositions.forEach((room, idx) => {
            if (room.y + 10 < this.map.height && room.x + 10 < this.map.width) {
                // Check a small area of each room
                let sample = '';
                for (let dy = 0; dy < 3; dy++) {
                    for (let dx = 0; dx < 5; dx++) {
                        sample += this.map.tiles[room.y + dy][room.x + dx] === 0 ? '.' : '#';
                    }
                    if (dy < 2) sample += '|';
                }
                if (this.logger) this.logger.debug(`  Room ${idx+1} at (${room.x},${room.y}): ${sample}`);
            }
        });

        // Initialize fog of war
        this.initializeFogOfWar();

        // Spawn agents with equipment and research bonuses using services
        const spawn = this.map.spawn;

        // Determine number of agents based on mission settings
        // Use mission-specific settings if available
        const maxAgentsForMission = this.getMaxAgentsForMission ?
            this.getMaxAgentsForMission(this.currentMissionIndex) :
            (this.currentMissionIndex === 0 ? 4 :
             this.currentMissionIndex < 3 ? 5 : 6);

        // Debug agent availability
        if (this.logger) this.logger.debug('📊 Agent availability check:');
        if (this.logger) this.logger.debug('  - this.activeAgents:', this.activeAgents ? this.activeAgents.length : 'undefined');
        if (this.logger) this.logger.debug('  - this.selectedAgents:', this.selectedAgents ? this.selectedAgents.length : 'undefined');

        // Use all hired agents up to the mission limit
        const availableForMission = this.activeAgents ? this.activeAgents.slice(0, maxAgentsForMission) : [];

        // ALWAYS use exactly what was selected - no auto-selection
        let baseAgents;

        if (this.selectedAgents) {
            if (this.logger) this.logger.debug('📝 Selected agents structure:', this.selectedAgents);
            if (this.logger) this.logger.debug('  First selected agent:', this.selectedAgents[0]);

            // CRITICAL: Check if selectedAgents contains objects with positions
            if (this.selectedAgents.length > 0 && typeof this.selectedAgents[0] === 'object' && this.selectedAgents[0].x !== undefined) {
                if (this.logger) this.logger.warn(`⚠️ selectedAgents contains OBJECTS with positions! This is wrong for mission restart!`);
                if (this.logger) this.logger.warn(`   Agent 0 position: (${this.selectedAgents[0].x}, ${this.selectedAgents[0].y})`);
                if (this.logger) this.logger.warn(`   Agent 0 targetPos: (${this.selectedAgents[0].targetX}, ${this.selectedAgents[0].targetY})`);
            }

            if (this.logger) this.logger.debug('  Available agents for matching:', this.activeAgents?.map(a => ({id: a.id, name: a.name, x: a.x, y: a.y})));

            // Add selected agents first
            baseAgents = this.selectedAgents.map(selectedAgent => {
                // selectedAgent might be just an ID (string or number) OR a full agent object
                const isJustId = typeof selectedAgent === 'number' || typeof selectedAgent === 'string';
                const agentInfo = isJustId ? `ID ${selectedAgent}` : (selectedAgent.name || selectedAgent.id || 'unknown');
                if (this.logger) this.logger.debug('  Mapping selected agent:', agentInfo, '(type:', typeof selectedAgent, ')');

                if (this.activeAgents && this.activeAgents.length > 0) {
                    // Try to match by different criteria depending on what we have
                    let found;
                    if (isJustId) {
                        // If selectedAgent is just an ID, match by ID
                        // Convert both to string for comparison since IDs might be stored as strings
                        const idToMatch = String(selectedAgent);
                        found = this.activeAgents.find(a => {
                            const agentId = String(a.id);
                            if (this.logger) this.logger.trace(`    Comparing ${agentId} === ${idToMatch}`);
                            return agentId === idToMatch;
                        });
                    } else {
                        // If it's an object, try to match by name, id, or object reference
                        found = this.activeAgents.find(a =>
                            a.name === selectedAgent.name ||
                            String(a.id) === String(selectedAgent.id) ||
                            a === selectedAgent
                        );
                    }

                    if (found) {
                        if (this.logger) this.logger.info('    ✅ Found match in activeAgents:', found.name);
                        return found;
                    } else {
                        if (this.logger) this.logger.warn('    ⚠️ No match found for selected agent:', agentInfo);
                        if (this.logger) this.logger.debug('    Available IDs:', this.activeAgents.map(a => a.id));
                        return isJustId ? null : selectedAgent;
                    }
                }
                return isJustId ? null : selectedAgent;
            }).filter(agent => agent !== null);  // Remove any nulls from failed ID lookups

            if (this.logger) this.logger.info(`🎯 Selected ${baseAgents.length} agents from selection`);

            // Use EXACTLY what user selected - no modifications
            if (this.logger) {
                this.logger.info(`✅ Using exact selection of ${baseAgents.length} agents`);
            }
        } else {
            // No selection made - use empty array (no auto-selection)
            baseAgents = [];
            if (this.logger) this.logger.warn('⚠️ No agents selected - starting with 0 agents');
        }

        // Allow mission to start with 0 agents if that's what was selected
        if (baseAgents.length === 0) {
            if (this.logger) this.logger.warn('🚨 Starting mission with NO AGENTS - this may result in mission failure!');
        }

        if (this.logger) this.logger.debug(`🎯 Mission ${this.currentMissionIndex + 1}: Deploying ${baseAgents.length} agents (max: ${maxAgentsForMission})`);
        if (this.logger) this.logger.debug('  - Agent names:', baseAgents.map(a => a.name || 'unnamed'));

        // Apply loadouts if equipment system is initialized
        let agentsWithLoadouts = baseAgents;
        if (this.agentLoadouts && this.applyLoadoutsToAgents) {
            agentsWithLoadouts = this.applyLoadoutsToAgents(baseAgents);
        }

        // Sync equipment with RPG system for mission
        if (this.syncEquipmentWithRPG) {
            if (this.logger) this.logger.debug('🔄 Syncing equipment for mission start');
            this.syncEquipmentWithRPG();
        }

        // Apply research modifiers
        let modifiedAgents;
        if (window.GameServices && window.GameServices.researchService) {
            // Apply research bonuses (weapons already handled by loadouts)
            // CRITICAL: Pass agent reference directly, NOT a copy
            // If we copy the agent, changes (like death) won't sync with AgentService
            modifiedAgents = agentsWithLoadouts.map(agent => {
                return window.GameServices.researchService.applyResearchToAgent(
                    agent,  // Pass reference, not copy
                    this.completedResearch || []
                );
            });
        } else {
            // No research service available, use agents as-is
            modifiedAgents = agentsWithLoadouts;
        }

        // Safety check for modifiedAgents
        if (!modifiedAgents || modifiedAgents.length === 0) {
            if (this.logger) this.logger.error('❌ No modified agents available!');
            return;
        }

        // Add mission-specific properties to each agent
        modifiedAgents.forEach((agent, idx) => {
            // Debug agent data
            if (this.logger) this.logger.debug(`🔍 Processing agent ${idx}:`, {
                name: agent.name,
                id: agent.id,
                specialization: agent.specialization
            });

            // Keep original ID - no transformation needed!
            if (this.logger) {
                this.logger.debug(`✅ Keeping original agent ID for ${agent.name}: ${agent.id}`);
            }

            // Add mission-specific properties
            agent.type = 'agent'; // Add type for combat logging
            // IMPORTANT: Preserve the agent name!
            if (!agent.name && agent.id) {
                agent.name = agent.id;
            }

            // Re-index agent in AgentService with original ID
            if (window.GameServices && window.GameServices.agentService) {
                window.GameServices.agentService.indexAgent(agent);
                if (this.logger) {
                    this.logger.debug(`📇 Re-indexed agent in AgentService with ID: ${agent.id}`);
                }
            }
            agent.x = spawn.x + idx % 2;
            agent.y = spawn.y + Math.floor(idx / 2);
            agent.targetX = spawn.x + idx % 2;
            agent.targetY = spawn.y + Math.floor(idx / 2);
            if (this.logger) {
                this.logger.info(`🎯 Agent ${idx+1} (${agent.name}) positioned at spawn: pos=(${agent.x}, ${agent.y}), target=(${agent.targetX}, ${agent.targetY})`);
                this.logger.debug(`   Agent ID: ${agent.id}`);
            }
            agent.selected = idx === 0;
            agent.alive = true;
            agent.cooldowns = [0, 0, 0, 0, 0];
            agent.facingAngle = Math.PI / 2; // Default facing down/south

            // Assign unique colors to each agent for visualization
            const agentColors = [
                '#00ff00',  // Green - Agent 1
                '#00ffff',  // Cyan - Agent 2
                '#ffff00',  // Yellow - Agent 3
                '#ff00ff',  // Magenta - Agent 4
                '#ff8800',  // Orange - Agent 5
                '#8888ff'   // Light Blue - Agent 6
            ];
            agent.color = agentColors[idx % agentColors.length];
            if (this.logger) this.logger.debug(`🎨 Agent ${idx + 1}: ${agent.name} assigned color: ${agent.color}`);

            // Initialize RPG entity for agent if not already present
            // IMPORTANT: Check if this agent already has a persistent RPG entity
            const persistentAgent = this.activeAgents?.find(a =>
                a.name === agent.name || a.id === agent.id
            );

            if (persistentAgent?.rpgEntity) {
                // Preserve existing RPG entity with all XP and stats
                agent.rpgEntity = persistentAgent.rpgEntity;
                if (this.logger) this.logger.debug(`📊 Preserved RPG entity for agent: ${agent.name} (Level ${agent.rpgEntity.level}, XP: ${agent.rpgEntity.experience})`);
            } else if (!agent.rpgEntity) {
                const rpgManager = this.rpgManager || window.GameServices?.rpgService?.rpgManager;
                if (rpgManager) {
                    const rpgAgent = rpgManager.createRPGAgent(agent, agent.class || 'soldier');
                    agent.rpgEntity = rpgAgent;
                    if (this.logger) this.logger.debug(`📊 Created new RPG entity for agent: ${agent.name}`);
                } else {
                    // Create a basic RPG entity fallback
                    agent.rpgEntity = {
                        level: 1,
                        experience: 0,
                        stats: { strength: 10, agility: 10 },
                        availableStatPoints: 0,
                        availableSkillPoints: 0,
                        availablePerkPoints: 0
                    };
                    if (this.logger) this.logger.warn(`⚠️ Created fallback RPG entity for agent: ${agent.name}`);
                }
            }

            // Apply equipment from InventoryService
            if (this.gameServices?.inventoryService) {
                this.gameServices.inventoryService.applyAgentEquipment(agent);
            }

            // Ensure required properties exist
            // IMPORTANT: Set maxHealth first, then restore health to full for mission start
            agent.maxHealth = agent.maxHealth || agent.health || 100;
            agent.health = agent.maxHealth;  // Start mission with full health
            agent.protection = agent.protection || 0;
            // Initialize bonuses through service if not set
            if (!agent.hackBonus) agent.hackBonus = 0;
            if (!agent.stealthBonus) agent.stealthBonus = 0;

            // NOTE: Don't push to this.agents - it's a computed property!
            // Agents are already in activeAgents and will be returned by computed property
        });

        // CRITICAL: After re-indexing, verify selected agents have correct positions
        if (window.GameServices && window.GameServices.agentService && modifiedAgents.length > 0) {
            // Log current selectedAgents positions
            const currentSelected = window.GameServices.agentService.getSelectedAgents();
            if (this.logger) {
                this.logger.debug(`📍 Before update - selectedAgents positions:`);
                currentSelected.forEach((a, i) => {
                    this.logger.debug(`   Agent ${i}: ${a.name} at (${a.x}, ${a.y}) -> (${a.targetX}, ${a.targetY})`);
                });
            }

            // Update selection to get newly indexed agents
            const agentIds = modifiedAgents.map(a => a.id);
            window.GameServices.agentService.selectAgentsForMission(agentIds);

            // Log after update
            const updatedSelected = window.GameServices.agentService.getSelectedAgents();
            if (this.logger) {
                this.logger.debug(`📍 After update - selectedAgents positions:`);
                updatedSelected.forEach((a, i) => {
                    this.logger.debug(`   Agent ${i}: ${a.name} at (${a.x}, ${a.y}) -> (${a.targetX}, ${a.targetY})`);
                });
            }

            if (this.logger) this.logger.info(`✅ Updated AgentService with ${agentIds.length} mission agents`);
        }

        // CRITICAL: Re-initialize hold positions AFTER agents are positioned at spawn
        // initTeamCommands was called earlier when agents had wrong positions
        if (this.logger) this.logger.info(`🎯 Team mode: ${this.teamMode}, Modified agents: ${modifiedAgents.length}`);

        if (this.teamMode === 'hold' && modifiedAgents.length > 0) {
            if (this.logger) this.logger.info('🔄 Re-initializing hold positions with correct spawn positions');
            modifiedAgents.forEach(agent => {
                if (agent.alive) {
                    this.holdPositions[agent.id] = {
                        x: agent.x,
                        y: agent.y
                    };
                    if (this.logger) this.logger.info(`   ✓ Hold position for ${agent.name}: (${agent.x}, ${agent.y})`);
                }
            });
        } else {
            if (this.logger) this.logger.warn(`⚠️ Hold positions NOT re-initialized (teamMode: ${this.teamMode}, agents: ${modifiedAgents.length})`);
        }

            // Auto-select first agent for better UX
            // NOTE: Use modifiedAgents instead of this.agents (computed property)
            if (modifiedAgents.length > 0) {
                modifiedAgents.forEach(a => a.selected = false);

                // Select first agent by default
                const firstAgent = modifiedAgents[0];
                firstAgent.selected = true;
                this._selectedAgent = firstAgent;
                // Also set selectedAgent (without underscore) for compatibility
                this.selectedAgent = firstAgent;

                if (this.logger) this.logger.debug('🎯 Auto-selected first agent for better UX:', firstAgent.name || firstAgent.id);
                if (this.logger) this.logger.debug('👥 Available agents:', modifiedAgents.map(a => a.name || a.id));
                if (this.logger) this.logger.info('✅ Selected agent stored as:', this._selectedAgent?.name || this._selectedAgent?.id);
                if (this.logger) this.logger.info('✅ Press E to switch camera modes, Tab to change agents');

            // CRITICAL: Center camera on agents when mission starts to prevent NaN camera positions
            if (this.logger) this.logger.debug('🎥 Before camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);

            // Calculate center point of all agents
            // NOTE: Use modifiedAgents instead of this.agents (computed property)
            if (modifiedAgents && modifiedAgents.length > 0) {
                let totalX = 0;
                let totalY = 0;
                modifiedAgents.forEach(agent => {
                    totalX += agent.x;
                    totalY += agent.y;
                });

                // Center camera on average agent position
                this.cameraX = Math.floor(totalX / modifiedAgents.length - this.canvas.width / (2 * this.tileWidth));
                this.cameraY = Math.floor(totalY / modifiedAgents.length - this.canvas.height / (2 * this.tileHeight));

                if (this.logger) this.logger.info('🎥 Manual camera centering completed - agents average pos:', {
                    avgX: totalX / modifiedAgents.length,
                    avgY: totalY / modifiedAgents.length,
                    cameraX: this.cameraX,
                    cameraY: this.cameraY
                });
            }

            if (this.logger) this.logger.debug('🎥 After camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);
        } else {
            if (this.logger) this.logger.debug('⚠️ No agents available to select!');
        }

        // Spawn enemies with enhanced variety and positioning
        this.spawnMissionEnemies();

        // Set initial objective from mission definition
        if (this.updateObjectiveDisplay) {
            this.updateObjectiveDisplay();
        }

        this.updateSquadHealth();
        this.centerCameraOnAgents();

        // Sync camera back to engine
        if (window.gameEngine) {
            window.gameEngine.setCamera(this.cameraX, this.cameraY, this.zoom);
        }
}

// Enhanced enemy spawning system with variety and better positioning
CyberOpsGame.prototype.spawnMissionEnemies = function() {
    // Enemy types must be loaded from campaign
    const enemyTypes = this.campaignEnemyTypes;
    if (!enemyTypes || enemyTypes.length === 0) {
        if (this.logger) this.logger.error('⚠️ No enemy types loaded from campaign! Cannot spawn enemies.');
        return;
    }

    // Calculate total enemies based on mission difficulty
    // Base enemies + bonus based on mission index
    // Handle both old format (number) and new format (object with count property)
    const baseEnemies = typeof this.currentMission.enemies === 'number'
        ? this.currentMission.enemies
        : (this.currentMission.enemies?.count || 8);
    const bonusEnemies = Math.floor(this.currentMissionIndex * 2); // +2 enemies per mission
    const totalEnemies = baseEnemies + bonusEnemies;

    if (this.logger) this.logger.debug(`📊 Spawning ${totalEnemies} enemies (base: ${baseEnemies}, bonus: ${bonusEnemies})`);

    // Determine enemy composition based on mission
    let enemyComposition = [];

    // Dynamic difficulty scaling based on mission index
    const difficultyLevel = Math.min(this.currentMissionIndex, 4);

    // Scale enemy mix based on difficulty
    const guardRatio = Math.max(0.1, 0.6 - difficultyLevel * 0.125);
    const soldierRatio = 0.3;
    const eliteRatio = Math.min(0.3, difficultyLevel * 0.075);
    const heavyRatio = Math.min(0.2, difficultyLevel * 0.05);
    const sniperRatio = Math.min(0.2, difficultyLevel * 0.05);
    const commanderRatio = Math.min(0.3, difficultyLevel * 0.075);

    // Build enemy composition dynamically
    enemyComposition = []
        .concat(Array(Math.floor(totalEnemies * guardRatio)).fill('guard'))
        .concat(Array(Math.floor(totalEnemies * soldierRatio)).fill('soldier'))
        .concat(Array(Math.floor(totalEnemies * eliteRatio)).fill('elite'))
        .concat(Array(Math.floor(totalEnemies * heavyRatio)).fill('heavy'))
        .concat(Array(Math.floor(totalEnemies * sniperRatio)).fill('sniper'))
        .concat(Array(Math.floor(totalEnemies * commanderRatio)).fill('commander'));

    // Ensure we have exactly the right number of enemies
    while (enemyComposition.length < totalEnemies) {
        enemyComposition.push('guard');
    }
    enemyComposition = enemyComposition.slice(0, totalEnemies);

    // Get strategic positions based on map
    const strategicPositions = this.getStrategicEnemyPositions(totalEnemies);
    if (this.logger) this.logger.debug(`📍 Strategic positions for enemies:`, strategicPositions);
    if (this.logger) this.logger.debug(`📍 Map enemySpawns:`, this.map.enemySpawns);

    // Spawn enemies
    enemyComposition.forEach((enemyTypeName, i) => {
        const enemyTemplate = enemyTypes.find(t => t.type === enemyTypeName) || enemyTypes[0];
        const position = strategicPositions[i] || { x: 10 + Math.random() * 20, y: 10 + Math.random() * 20 };
        if (this.logger) this.logger.debug(`🎯 Spawning enemy ${i} (${enemyTypeName}) at:`, position);

        const enemy = {
            id: 'enemy_' + i,
            type: enemyTemplate.type,
            x: position.x,
            y: position.y,
            health: enemyTemplate.health + Math.floor(Math.random() * 20) - 10, // Some variation
            maxHealth: enemyTemplate.health,
            speed: enemyTemplate.speed + (Math.random() * 0.5 - 0.25),
            damage: enemyTemplate.damage + Math.floor(Math.random() * 5) - 2,
            alive: true,
            alertLevel: 0,
            visionRange: enemyTemplate.visionRange,
            color: enemyTemplate.color,
            facingAngle: Math.random() * Math.PI * 2,
            patrolRoute: position.patrol || null,
            weapon: enemyTemplate.weapon // Add weapon from template
        };
        enemy.targetX = enemy.x;
        enemy.targetY = enemy.y;

        // Add RPG entity for XP and leveling
        // Try to get rpgManager from various sources
        const rpgManager = this.rpgManager || window.GameServices?.rpgService?.rpgManager;

        if (rpgManager && window.RPGEnemy) {
            const rpgEnemy = rpgManager.createRPGEnemy(enemy, enemyTypeName);
            enemy.rpgEntity = rpgEnemy;
            enemy.level = rpgEnemy.level || 1;
            if (this.logger) this.logger.debug(`   📊 Added RPG entity to enemy - Level ${enemy.level}`);
        } else {
            if (this.logger) this.logger.warn(`   ⚠️ Could not add RPG entity to enemy:`, {
                hasRPGManager: !!this.rpgManager,
                hasGameServicesRPG: !!window.GameServices?.rpgService?.rpgManager,
                hasRPGEnemyClass: !!window.RPGEnemy
            });
            // Create a basic RPG entity fallback
            enemy.rpgEntity = {
                level: 1,
                experience: 0,
                stats: { strength: 10, agility: 10 }
            };
        }

        this.enemies.push(enemy);
        if (this.logger) this.logger.info(`✅ Enemy ${i} created: ${enemyTypeName} at exact position (${enemy.x}, ${enemy.y}) with health ${enemy.health}`);
    });

    if (this.logger) this.logger.debug(`⚔️ Enemy composition for mission ${this.currentMissionIndex + 1}:`,
        enemyComposition.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})
    );

    // Verify all enemy positions
    if (this.logger) this.logger.debug(`📍 FINAL ENEMY POSITIONS CHECK:`);
    this.enemies.forEach((enemy, idx) => {
        if (this.logger) this.logger.debug(`  Enemy ${idx}: ${enemy.type} at (${enemy.x}, ${enemy.y}) - alive: ${enemy.alive}`);
    });
};

// Get strategic enemy positions based on map type
CyberOpsGame.prototype.getStrategicEnemyPositions = function(count) {
    const positions = [];
    const mapWidth = this.map.width || 40;
    const mapHeight = this.map.height || 30;

    // First, try to use predefined enemy spawn points from the map
    if (this.map.enemySpawns && this.map.enemySpawns.length > 0) {
        if (this.logger) this.logger.debug(`📍 Using ${this.map.enemySpawns.length} predefined enemy spawn points`);

        // Use all predefined spawns first
        for (let i = 0; i < Math.min(count, this.map.enemySpawns.length); i++) {
            const spawn = this.map.enemySpawns[i];
            // Check if spawn point is walkable
            const tileValue = this.map.tiles[spawn.y] && this.map.tiles[spawn.y][spawn.x];
            if (tileValue === 1) {
                if (this.logger) this.logger.warn(`⚠️ WARNING: Enemy spawn ${i} at (${spawn.x}, ${spawn.y}) is in a WALL (tile=1)!`);
            } else {
                if (this.logger) this.logger.info(`✅ Enemy spawn ${i} at (${spawn.x}, ${spawn.y}) is walkable (tile=${tileValue})`);
            }
            positions.push({
                x: spawn.x,
                y: spawn.y
            });
        }

        // If we need more enemies than spawn points, duplicate some positions with slight offsets
        if (count > this.map.enemySpawns.length) {
            for (let i = this.map.enemySpawns.length; i < count; i++) {
                const baseSpawn = this.map.enemySpawns[i % this.map.enemySpawns.length];
                positions.push({
                    x: baseSpawn.x + Math.floor(Math.random() * 6 - 3),
                    y: baseSpawn.y + Math.floor(Math.random() * 6 - 3)
                });
            }
        }

        return positions;
    }

    // Dynamic key area generation based on map size
    // Create strategic points without knowing map type
    let keyAreas = [];

    // Generate 3-5 key areas based on map dimensions
    const numAreas = 3 + Math.floor(Math.random() * 3);

    // Always include key strategic points
    keyAreas.push(
        { x: mapWidth/2, y: mapHeight/2, radius: 8 },  // Center
        { x: mapWidth * 0.2, y: mapHeight * 0.2, radius: 6 },  // Corner 1
        { x: mapWidth * 0.8, y: mapHeight * 0.8, radius: 6 }   // Corner 2
    );

    // Add random strategic points
    for (let i = keyAreas.length; i < numAreas; i++) {
        keyAreas.push({
            x: 10 + Math.random() * (mapWidth - 20),
            y: 10 + Math.random() * (mapHeight - 20),
            radius: 5 + Math.random() * 5
        });
    }

    // Place enemies around key areas
    for (let i = 0; i < count; i++) {
        const area = keyAreas[i % keyAreas.length];
        const angle = (i / count) * Math.PI * 2;
        const distance = Math.random() * area.radius;

        const position = {
            x: Math.max(2, Math.min(mapWidth - 2, area.x + Math.cos(angle) * distance)),
            y: Math.max(2, Math.min(mapHeight - 2, area.y + Math.sin(angle) * distance))
        };

        // Add patrol route for some enemies
        if (Math.random() > 0.5) {
            position.patrol = [
                { x: position.x, y: position.y },
                { x: position.x + Math.random() * 10 - 5, y: position.y + Math.random() * 10 - 5 }
            ];
        }

        positions.push(position);
    }

    return positions;
};

CyberOpsGame.prototype.centerCameraOnAgents = function() {
        if (this.agents.length === 0) return;
        let avgX = 0, avgY = 0;
        this.agents.forEach(agent => {
            avgX += agent.x;
            avgY += agent.y;
        });
        avgX /= this.agents.length;
        avgY /= this.agents.length;

        const screenPos = this.worldToIsometric(avgX, avgY);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;

        // Sync camera back to engine
        if (window.gameEngine) {
            window.gameEngine.setCamera(this.cameraX, this.cameraY, this.zoom);
        }
}

CyberOpsGame.prototype.centerCameraOnAgent = function(agent) {
        const screenPos = this.worldToIsometric(agent.x, agent.y);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;

        // Sync camera back to engine
        if (window.gameEngine) {
            window.gameEngine.setCamera(this.cameraX, this.cameraY, this.zoom);
        }
}

CyberOpsGame.prototype.updateSquadHealth = function() {
        const container = document.getElementById('squadHealth');
        if (!container) return; // Skip if element doesn't exist (e.g., in tests)

        container.innerHTML = '';

        this.agents.forEach((agent, index) => {
            const bar = document.createElement('div');

            // Add dead class if agent is not alive
            let className = 'agent-health-bar';
            if (!agent.alive) {
                className += ' dead';
            }
            if (agent.selected) {
                className += ' selected';
            }
            bar.className = className;

            bar.style.pointerEvents = 'auto'; // Explicitly enable pointer events
            bar.style.cursor = agent.alive ? 'pointer' : 'not-allowed'; // Change cursor for dead agents

            // Calculate health percentage, ensuring it's 0 for dead agents
            const healthPercent = agent.alive ? Math.max(0, (agent.health / agent.maxHealth) * 100) : 0;

            // Get TB info if in turn-based mode
            let tbInfo = '';
            let apBar = '';
            let turnIndicator = '';

            if (this.turnBasedMode && agent.alive) {
                // Find this unit in turn queue
                const turnUnit = this.turnQueue?.find(tu => tu.unit === agent);
                if (turnUnit) {
                    const apPercent = (turnUnit.ap / turnUnit.maxAp) * 100;
                    apBar = `<div class="ap-bar">
                        <div class="ap-fill" style="width: ${apPercent}%"></div>
                        <div class="ap-text">${turnUnit.ap}/${turnUnit.maxAp} AP</div>
                    </div>`;

                    // Check if this is current turn
                    if (this.currentTurnUnit?.unit === agent) {
                        turnIndicator = ' 🌟'; // Star for current turn
                        bar.className += ' current-turn';
                    }

                    // Show initiative order
                    const turnIndex = this.turnQueue.indexOf(turnUnit);
                    if (turnIndex >= 0) {
                        tbInfo = ` [T${turnIndex + 1}]`;
                    }
                }
            }

            bar.innerHTML = `
                <div class="health-fill" style="width: ${healthPercent}%"></div>
                <div class="agent-name">${agent.name} [${index + 1}]${!agent.alive ? ' ☠️' : ''}${tbInfo}${turnIndicator}</div>
                ${apBar}
            `;

            // Add click handler to select this agent
            bar.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                e.preventDefault(); // Prevent default behavior
                if (this.logger) this.logger.debug(`🖱️ Health bar CLICK event for ${agent.name}, alive: ${agent.alive}`);

                if (agent.alive) {
                    // Directly call selectAgent
                    this.selectAgent(agent);
                    if (this.logger) this.logger.debug(`🎯 Selected ${agent.name} via health bar click`);
                }
            });

            // Also handle mousedown as backup
            bar.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (this.logger) this.logger.debug(`🖱️ Health bar MOUSEDOWN for ${agent.name}, alive: ${agent.alive}`);

                // Try selecting on mousedown as well
                if (agent.alive) {
                    this.selectAgent(agent);
                    if (this.logger) this.logger.debug(`🎯 Selected ${agent.name} via health bar mousedown`);
                }
            });

            container.appendChild(bar);
        });
}

CyberOpsGame.prototype.useAbility = function(abilityIndex) {
        if (this.isPaused) return;
        const agent = this.agents.find(a => a.selected);
        if (!agent || !agent.alive || agent.cooldowns[abilityIndex] > 0) return;

        // In turn-based mode, check AP and handle differently
        if (this.turnBasedMode) {
            if (!this.currentTurnUnit || this.currentTurnUnit.unit !== agent) {
                if (this.logEvent) {
                    this.logEvent("Not this agent's turn!", 'warning');
                }
                return;
            }

            const apCost = this.actionCosts ? (this.actionCosts.shoot || 4) : 4;
            if (this.currentTurnUnit.ap < apCost) {
                if (this.logEvent) {
                    this.logEvent(`Not enough AP! Need ${apCost} AP`, 'warning');
                }
                return;
            }
        }

        switch (abilityIndex) {
            case 1: // Shoot
                this.shootNearestEnemy(agent);

                // Deduct AP in turn-based mode
                if (this.turnBasedMode && this.currentTurnUnit) {
                    this.currentTurnUnit.ap -= (this.actionCosts ? (this.actionCosts.shoot || 4) : 4);
                    if (this.updateTurnBasedAPDisplay) {
                        this.updateTurnBasedAPDisplay();
                    }
                    if (this.logEvent) {
                        this.logEvent(`${agent.name} fired weapon (Cost: 4 AP)`, 'combat');
                    }
                } else {
                    agent.cooldowns[1] = 60;
                }
                break;
            case 2: // Grenade
                if (this.turnBasedMode && this.currentTurnUnit) {
                    const grenadeCost = 6;
                    if (this.currentTurnUnit.ap < grenadeCost) {
                        if (this.logEvent) {
                            this.logEvent(`Not enough AP! Need ${grenadeCost} AP`, 'warning');
                        }
                        return;
                    }
                    this.throwGrenade(agent);
                    this.currentTurnUnit.ap -= grenadeCost;
                    if (this.updateTurnBasedAPDisplay) {
                        this.updateTurnBasedAPDisplay();
                    }
                    if (this.logEvent) {
                        this.logEvent(`${agent.name} threw grenade (Cost: ${grenadeCost} AP)`, 'combat');
                    }
                } else {
                    this.throwGrenade(agent);
                    agent.cooldowns[2] = 180;
                }
                break;
            case 3: // Hack/Interact - Use generic action system
                if (this.turnBasedMode && this.currentTurnUnit) {
                    const hackCost = 3;
                    if (this.currentTurnUnit.ap < hackCost) {
                        if (this.logEvent) {
                            this.logEvent(`Not enough AP! Need ${hackCost} AP`, 'warning');
                        }
                        return;
                    }
                    // The new mission system handles all interactions generically
                    if (this.useActionAbility) {
                        this.useActionAbility(agent);
                    }
                    this.currentTurnUnit.ap -= hackCost;
                    if (this.updateTurnBasedAPDisplay) {
                        this.updateTurnBasedAPDisplay();
                    }
                    if (this.logEvent) {
                        this.logEvent(`${agent.name} hacked/interacted (Cost: ${hackCost} AP)`, 'action');
                    }
                } else {
                    // The new mission system handles all interactions generically
                    if (this.useActionAbility) {
                        this.useActionAbility(agent);
                    }
                    agent.cooldowns[3] = 120;
                }
                break;
            case 4: // Shield
                if (this.turnBasedMode && this.currentTurnUnit) {
                    const shieldCost = 2;
                    if (this.currentTurnUnit.ap < shieldCost) {
                        if (this.logEvent) {
                            this.logEvent(`Not enough AP! Need ${shieldCost} AP`, 'warning');
                        }
                        return;
                    }
                    this.activateShield(agent);
                    this.currentTurnUnit.ap -= shieldCost;
                    if (this.updateTurnBasedAPDisplay) {
                        this.updateTurnBasedAPDisplay();
                    }
                    if (this.logEvent) {
                        this.logEvent(`${agent.name} activated shield (Cost: ${shieldCost} AP)`, 'combat');
                    }
                } else {
                    this.activateShield(agent);
                    agent.cooldowns[4] = 300;
                }
                break;
        }
        this.updateCooldownDisplay();
}

// Use ability for all selected agents (keyboard shortcuts)
CyberOpsGame.prototype.useAbilityForAllSelected = function(abilityIndex) {
        if (this.isPaused) return;

        // In turn-based mode, just call the single agent version
        if (this.turnBasedMode) {
            this.useAbility(abilityIndex);
            return;
        }

        const selectedAgents = this.agents.filter(a => a.selected && a.alive);
        if (selectedAgents.length === 0) return;

        let anyUsed = false;

        selectedAgents.forEach((agent, index) => {
            if (agent.cooldowns[abilityIndex] > 0) return;

            switch (abilityIndex) {
                case 1: // Shoot - all agents shoot
                    this.shootNearestEnemy(agent);
                    agent.cooldowns[1] = 60;
                    anyUsed = true;
                    break;
                case 2: // Grenade - all agents throw
                    this.throwGrenade(agent);
                    agent.cooldowns[2] = 180;
                    anyUsed = true;
                    break;
                case 3: // Hack/Interact - only first agent
                    if (index === 0) {
                        // Use generic action system for all interactions
                        let actionPerformed = false;
                        if (this.useActionAbility) {
                            actionPerformed = this.useActionAbility(agent);
                        }
                        if (actionPerformed) {
                            agent.cooldowns[3] = 120;
                            anyUsed = true;
                        }
                    }
                    break;
                case 4: // Shield - all agents activate
                    this.activateShield(agent);
                    agent.cooldowns[4] = 300;
                    anyUsed = true;
                    break;
            }
        });

        if (anyUsed) {
            this.updateCooldownDisplay();
        }
}

CyberOpsGame.prototype.shootNearestEnemy = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dist = Math.sqrt(
                Math.pow(enemy.x - agent.x, 2) +
                Math.pow(enemy.y - agent.y, 2)
            );
            if (dist < minDist && dist < 10) {
                minDist = dist;
                nearest = enemy;
            }
        });

        if (nearest) {
            // USE COMBAT SERVICE - REQUIRED
            if (!window.GameServices || !window.GameServices.combatService) {
                if (this.logger) this.logger.error('CombatService not available!');
                return;
            }

            // Initialize combat if not already in combat
            if (!window.GameServices.combatService.inCombat) {
                window.GameServices.combatService.startCombat(this.agents, this.enemies);
            }

            // Perform attack through CombatService
            const attackerId = agent.id || agent.name || `agent_${this.agents.indexOf(agent)}`;
            const targetId = nearest.id || nearest.name || `enemy_${this.enemies.indexOf(nearest)}`;
            const result = window.GameServices.combatService.performAttack(attackerId, targetId);

            if (result) {
                // Create projectile for visual feedback ONLY - damage already applied by CombatService
                this.projectiles.push({
                    x: agent.x,
                    y: agent.y,
                    targetX: nearest.x,
                    targetY: nearest.y,
                    targetEnemy: nearest,
                    damage: result.damage || 0,
                    speed: 0.5,
                    owner: agent.id,
                    shooter: agent,
                    agent: agent,  // Added for logCombatHit compatibility
                    weaponType: agent.weapon?.type || 'rifle',
                    visualOnly: true  // CRITICAL: Don't apply damage on hit - CombatService already did!
                });

                // UNIDIRECTIONAL: CombatService already updated entity state
                // For agents: AgentService is single source of truth
                // For enemies: CombatService updated entity directly

                if (this.logger) {
                    if (result.hit) {
                        this.logger.info(`🎯 ${agent.name} hit for ${result.damage} damage${result.critical ? ' (CRITICAL!)' : ''}`);
                    } else {
                        this.logger.info(`❌ ${agent.name} missed`);
                    }
                }
            }

            // Trigger recoil effect for shooting
            if (this.triggerVisualEffect) {
                this.triggerVisualEffect('freezeEffects', 'shoot', agent);
                this.triggerVisualEffect('screenShake', 'shoot', agent);
            }

            // Play shooting sound
            this.playSound('shoot', 0.4);

            // Vibration feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(20);
            }

            this.alertEnemies(agent.x, agent.y, 8);
        }
}

CyberOpsGame.prototype.throwGrenade = function(agent) {
        // Find nearest enemy for grenade target
        let targetX = agent.x + 5; // Default: throw forward
        let targetY = agent.y;
        let nearestEnemy = null;
        let minDist = Infinity;

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dist = Math.sqrt(
                Math.pow(enemy.x - agent.x, 2) +
                Math.pow(enemy.y - agent.y, 2)
            );
            if (dist < minDist && dist < 15) { // Grenade range
                minDist = dist;
                nearestEnemy = enemy;
            }
        });

        if (nearestEnemy) {
            targetX = nearestEnemy.x;
            targetY = nearestEnemy.y;

            if (this.logEvent) {
                this.logEvent(`${agent.name} threw grenade at enemy!`, 'combat');
            }
        } else {
            // No enemy in range, throw in facing direction
            if (this.logEvent) {
                this.logEvent(`${agent.name} threw grenade (no target in range)`, 'combat');
            }
        }

        // Store final target for the explosion
        const grenadeX = targetX;
        const grenadeY = targetY;

        setTimeout(() => {
            this.effects.push({
                type: 'explosion',
                x: grenadeX,
                y: grenadeY,
                radius: 3,
                damage: 50,
                duration: 30,
                frame: 0
            });

            // Big shake and freeze for grenade explosion
            if (this.triggerVisualEffect) {
                this.triggerVisualEffect('freezeEffects', 'explosion', { x: grenadeX, y: grenadeY });
                this.triggerVisualEffect('screenShake', 'explosion', { x: grenadeX, y: grenadeY });
            }

            // Play explosion sound
            this.playSound('explosion', 0.6);

            // Strong vibration for explosion
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 30, 100]); // Pattern: short, pause, long
            }

            // Deal damage to enemies in blast radius
            let enemiesHit = 0;
            this.enemies.forEach(enemy => {
                if (!enemy.alive) return;
                const dist = Math.sqrt(
                    Math.pow(enemy.x - grenadeX, 2) +
                    Math.pow(enemy.y - grenadeY, 2)
                );
                if (dist < 3) {
                    // Use RPG damage calculation if available
                    let damage = 50;
                    if (this.calculateDamage) {
                        damage = this.calculateDamage(agent, enemy, 'grenade');
                    }

                    // Use FormulaService to apply damage
                    window.GameServices.formulaService.applyDamage(enemy, damage);
                    enemiesHit++;

                    if (enemy.health <= 0) {
                        enemy.alive = false;
                        this.totalEnemiesDefeated++;

                        // Track enemy elimination for mission objectives
                        // onEnemyEliminated already tracks through MissionService
                        if (this.onEnemyEliminated) {
                            this.onEnemyEliminated(enemy);
                        }

                        if (this.logger) this.logger.debug(`💥 Grenade killed enemy at (${enemy.x}, ${enemy.y})`);

                        if (this.logEvent) {
                            this.logEvent(`Grenade eliminated enemy!`, 'combat');
                        }

                        // Grant XP for grenade kills!
                        if (this.onEntityDeath) {
                            if (this.logger) this.logger.debug(`🎯 Granting XP for grenade kill`);
                            this.onEntityDeath(enemy, agent);
                        }
                    } else {
                        if (this.logEvent) {
                            this.logEvent(`Grenade damaged enemy (50 damage)`, 'combat');
                        }
                    }
                }
            });

            if (enemiesHit === 0 && this.logEvent) {
                this.logEvent(`Grenade exploded (no enemies hit)`, 'combat');
            }

            this.alertEnemies(grenadeX, grenadeY, 10);
        }, 500);
}

// Screen effect helpers - now handled by visual effects system
// Legacy functions moved to game-visual-effects.js for compatibility

// Initialize fog of war for the current map
CyberOpsGame.prototype.initializeFogOfWar = function() {
        if (!this.map) return;

        this.fogOfWar = [];
        for (let y = 0; y < this.map.height; y++) {
            this.fogOfWar[y] = [];
            for (let x = 0; x < this.map.width; x++) {
                // 0 = unexplored, 1 = explored but not visible, 2 = visible
                this.fogOfWar[y][x] = 0;
            }
        }
}

// Toggle fog of war visibility
CyberOpsGame.prototype.toggleFogOfWar = function() {
    this.fogEnabled = !this.fogEnabled;
    this.addNotification(this.fogEnabled ? '🌫️ Fog of War enabled' : '👁️ Fog of War disabled');
    if (this.logger) this.logger.debug('🌫️ Fog of War:', this.fogEnabled ? 'ENABLED' : 'DISABLED');

    // Check specific tiles
    if (this.map && this.map.tiles) {
        if (this.logger) this.logger.debug('🔍 Checking specific tile values:');
        const tilesToCheck = [
            {x: 40, y: 50},
            {x: 30, y: 30},
            {x: 25, y: 25},
            {x: 26, y: 26},
            {x: 27, y: 27},
            {x: 45, y: 45},
            {x: 46, y: 46},
            {x: 47, y: 47}
        ];
        tilesToCheck.forEach(pos => {
            const tileValue = this.map.tiles[pos.y][pos.x];
            if (this.logger) this.logger.debug(`  Tile[${pos.y}][${pos.x}] = ${tileValue} (${tileValue === 0 ? 'walkable' : 'wall'})`);
        });
    }

    // Debug: Log map structure when fog is disabled
    if (!this.fogEnabled && this.map && this.map.tiles) {
        // Create a smaller sample of the map for analysis
        const mapSample = {
            width: this.map.width,
            height: this.map.height,
            roomArea: {},
            corridorArea: {},
            fullMap: []
        };

        // Check first room area (ACTUALLY at x:5-16, y:5-16)
        for (let y = 5; y <= 15; y++) {
            let row = '';
            for (let x = 5; x <= 15; x++) {
                const tile = this.map.tiles[y][x];
                row += tile === 0 ? '.' : '#';
            }
            mapSample.roomArea[`row_${y}`] = row;
        }

        // Check corridor area at y=25
        for (let y = 24; y <= 27; y++) {
            let row = '';
            for (let x = 10; x <= 20; x++) {
                const tile = this.map.tiles[y][x];
                row += tile === 0 ? '.' : '#';
            }
            mapSample.corridorArea[`row_${y}`] = row;
        }

        // Get full map as string (limited to 20x20 for visibility)
        for (let y = 0; y < Math.min(20, this.map.height); y++) {
            let row = '';
            for (let x = 0; x < Math.min(30, this.map.width); x++) {
                const tile = this.map.tiles[y][x];
                row += tile === 0 ? '.' : '#';
            }
            mapSample.fullMap.push(row);
        }

        if (this.logger) this.logger.debug('=== MAP STRUCTURE DEBUG ===');
        if (this.logger) this.logger.debug('Map size:', mapSample.width, 'x', mapSample.height);
        if (this.logger) this.logger.debug('First room area (5,5 to 15,15):');
        Object.entries(mapSample.roomArea).forEach(([key, val]) => {
            if (this.logger) this.logger.debug(`  ${key}: ${val}`);
        });
        if (this.logger) this.logger.debug('Corridor area at y=25:');
        Object.entries(mapSample.corridorArea).forEach(([key, val]) => {
            if (this.logger) this.logger.debug(`  ${key}: ${val}`);
        });
        if (this.logger) this.logger.debug('Full map (0,0 to 30,20) - "." = walkable, "#" = wall:');
        mapSample.fullMap.forEach((row, index) => {
            if (this.logger) this.logger.debug(`Row ${index.toString().padStart(2, '0')}: ${row}`);
        });

        // Also log as JSON for easy copy
        if (this.logger) this.logger.debug('JSON for analysis:', JSON.stringify(mapSample));

        // Show a visual map of the center area
        if (this.logger) this.logger.debug('\n🗺️ Visual map of center area (35,35) to (55,55):');
        for (let y = 35; y <= 55; y++) {
            let row = '';
            for (let x = 35; x <= 55; x++) {
                row += this.map.tiles[y][x] === 0 ? '.' : '#';
            }
            if (this.logger) this.logger.debug(`Row ${y}: ${row}`);
        }
    }

    // Update button text
    const fogBtn = document.getElementById('fogBtn');
    if (fogBtn) {
        fogBtn.innerHTML = this.fogEnabled ? '🌫️ FOG: ON' : '👁️ FOG: OFF';
        fogBtn.style.background = this.fogEnabled ? 'rgba(100, 50, 150, 0.8)' : 'rgba(50, 150, 100, 0.8)';
        fogBtn.style.borderColor = this.fogEnabled ? '#9966ff' : '#66ff99';
    }

    // Handle fog state changes
    if (!this.fogEnabled && this.fogOfWar) {
        // Disabling fog - reveal entire map
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                this.fogOfWar[y][x] = 2; // Make everything visible
            }
        }
    } else if (this.fogEnabled && this.fogOfWar) {
        // Re-enabling fog - reset to unexplored except current visible areas
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                // Reset to unexplored
                this.fogOfWar[y][x] = 0;
            }
        }
        // Immediately update visibility based on current agent positions
        this.updateFogOfWar();
    }
}

// Update fog of war based on agent positions
CyberOpsGame.prototype.updateFogOfWar = function() {
        if (!this.fogOfWar || !this.agents || !this.fogEnabled) return;

        // Initialize line of sight cache if needed
        if (!this.losCache) {
            this.losCache = new Map();
            this.losCacheFrame = 0;
        }

        // Clear cache every 30 frames to handle map changes
        this.losCacheFrame++;
        if (this.losCacheFrame > 30) {
            this.losCache.clear();
            this.losCacheFrame = 0;
        }

        // Reset visibility (but keep explored areas if permanent fog)
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.permanentFog) {
                    // Keep explored areas visible but dimmed
                    if (this.fogOfWar[y][x] === 2) {
                        this.fogOfWar[y][x] = 1;
                    }
                } else {
                    // Tactical fog - reset all to unexplored
                    if (this.fogOfWar[y][x] !== 0) {
                        this.fogOfWar[y][x] = 0;
                    }
                }
            }
        }

        // Update visibility for each agent
        this.agents.forEach(agent => {
            if (!agent.alive) return;

            // Calculate view radius (Ghost agents see further)
            let viewDist = this.viewRadius;
            if (agent.name && agent.name.includes('Ghost')) {
                viewDist = Math.floor(viewDist * this.ghostViewBonus);
            }

            // Cache agent position for this update
            const agentX = Math.floor(agent.x);
            const agentY = Math.floor(agent.y);

            // Reveal tiles in view radius - optimized with early exit
            for (let dy = -viewDist; dy <= viewDist; dy++) {
                for (let dx = -viewDist; dx <= viewDist; dx++) {
                    const tx = agentX + dx;
                    const ty = agentY + dy;

                    if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
                        // Quick distance check before expensive sqrt
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= viewDist * viewDist) {
                            // Check cache first
                            const cacheKey = `${agentX},${agentY}-${tx},${ty}`;
                            let hasLOS = this.losCache.get(cacheKey);

                            if (hasLOS === undefined) {
                                // Not in cache, calculate and store
                                hasLOS = this.hasLineOfSight(agent.x, agent.y, tx, ty);
                                this.losCache.set(cacheKey, hasLOS);
                            }

                            if (hasLOS) {
                                this.fogOfWar[ty][tx] = 2; // Fully visible
                            }
                        }
                    }
                }
            }
        });
}

// Check if there's a clear line of sight between two points
CyberOpsGame.prototype.hasLineOfSight = function(x1, y1, x2, y2) {
        // Use integer coordinates for Bresenham's algorithm
        const startX = Math.floor(x1);
        const startY = Math.floor(y1);
        const endX = Math.floor(x2);
        const endY = Math.floor(y2);

        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let x = startX;
        let y = startY;
        let steps = 0;
        const maxSteps = dx + dy + 10; // Prevent infinite loops

        while (steps < maxSteps) {
            // Check if current tile blocks vision
            if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
                if (this.map.tiles[y] && this.map.tiles[y][x] === 1) {
                    // Wall blocks vision
                    return false;
                }
            }

            // Check if we've reached the target
            if (x === endX && y === endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }

            steps++;
        }

        return true;
}

// Sound effect helper with MP3 fallback
CyberOpsGame.prototype.playSound = function(soundName, volume = 0.5) {
        // First try to play HTML audio element if it exists
        const audioElement = document.getElementById(soundName + 'Sound');
        if (audioElement) {
            // Check if the audio element can actually play
            if (audioElement.readyState >= 2) { // HAVE_CURRENT_DATA or better
                try {
                    // Clone and play
                    const audio = audioElement.cloneNode(true);
                    audio.volume = volume * (this.sfxVolume || 1) * (this.masterVolume || 1);
                    const playPromise = audio.play();

                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            if (this.logger) this.logger.error(`Audio playback failed for ${soundName}: ${err.message}`);
                            this.playSynthSound(soundName, volume);
                        });
                    }
                    return;
                } catch (err) {
                    if (this.logger) this.logger.error(`Error cloning/playing ${soundName}: ${err.message}`);
                }
            } else {
                // Audio not ready, check if it has a source that failed to load
                if (this.logger) this.logger.debug(`Audio element ${soundName} not ready (readyState: ${audioElement.readyState})`);

                // Try to reload it
                audioElement.load();

                // For now, use synthesized sound
                this.playSynthSound(soundName, volume);
                return;
            }
        } else {
            if (this.logger) this.logger.debug(`No audio element found for ${soundName}`);
        }

        // Fall back to synthesized sounds
        this.playSynthSound(soundName, volume);
}

// Synthesized sound effects using Web Audio API
CyberOpsGame.prototype.playSynthSound = function(soundName, volume = 0.5) {
        // Create audio context if not exists
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                return; // No audio support
            }
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        try {
            if (soundName === 'shoot') {
                // Laser/gun sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

                gain.gain.setValueAtTime(volume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.1);

            } else if (soundName === 'explosion') {
                // Explosion sound
                const noise = ctx.createBufferSource();
                const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() - 0.5) * 2;
                }

                noise.buffer = buffer;

                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3000, now);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.2);

                gain.gain.setValueAtTime(volume * 0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start(now);

            } else if (soundName === 'hit') {
                // Impact sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

                gain.gain.setValueAtTime(volume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.05);

            } else if (soundName === 'hack') {
                // Digital/hack sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);

                // Create beeping pattern
                for (let i = 0; i < 3; i++) {
                    const t = now + i * 0.1;
                    gain.gain.setValueAtTime(volume * 0.2, t);
                    gain.gain.setValueAtTime(0, t + 0.05);
                }

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.3);

            } else if (soundName === 'shield') {
                // Shield activation sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            if (this.logger) this.logger.error('Synth sound failed:', soundName, e);
        }
}

CyberOpsGame.prototype.hackNearestTerminal = function(agent) {
        if (!this.map.terminals) return;

        this.map.terminals.forEach(terminal => {
            if (terminal.hacked) return;
            const dist = Math.sqrt(
                Math.pow(terminal.x - agent.x, 2) +
                Math.pow(terminal.y - agent.y, 2)
            );

            // Apply hacking bonus from equipment and research
            let hackRange = 3;
            if (agent.hackBonus) {
                hackRange += agent.hackBonus / 100 * 2; // Bonus increases range
            }

            if (dist < hackRange) {
                terminal.hacked = true;

                // Track through MissionService
                if (this.gameServices && this.gameServices.missionService) {
                    this.gameServices.missionService.trackEvent('terminal', {
                        id: terminal.id || 'unknown'
                    });
                }

                if (this.logger) this.logger.debug(`🖥️ Terminal hacked!`);

                // Log the hacking event
                if (this.logEvent) {
                    this.logEvent(`${agent.name} hacked terminal at [${terminal.x}, ${terminal.y}]`, 'hack', true);
                }

                this.effects.push({
                    type: 'hack',
                    x: terminal.x,
                    y: terminal.y,
                    duration: 60,
                    frame: 0
                });

                // Play hack sound
                this.playSound('hack', 0.5);

                // Unlock doors linked to this terminal
                if (this.map.doors) {
                    this.map.doors.forEach(door => {
                        if (door.linkedTerminal === terminal.id) {
                            door.locked = false;
                            // Clear the wall tiles at the door position to allow passage
                            const doorX = Math.floor(door.x);
                            const doorY = Math.floor(door.y);

                            // Clear a 3x3 area around the door to ensure passage
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    const tileY = doorY + dy;
                                    const tileX = doorX + dx;
                                    if (this.map.tiles[tileY] && this.map.tiles[tileY][tileX] !== undefined) {
                                        this.map.tiles[tileY][tileX] = 0; // Make walkable
                                    }
                                }
                            }

                            // Also clear a path in the main directions for corridors
                            for (let i = -2; i <= 2; i++) {
                                // Horizontal corridor
                                if (this.map.tiles[doorY] && this.map.tiles[doorY][doorX + i] !== undefined) {
                                    this.map.tiles[doorY][doorX + i] = 0;
                                }
                                // Vertical corridor
                                if (this.map.tiles[doorY + i] && this.map.tiles[doorY + i][doorX] !== undefined) {
                                    this.map.tiles[doorY + i][doorX] = 0;
                                }
                            }

                            if (this.logger) this.logger.debug(`🔓 Door at (${door.x}, ${door.y}) unlocked by terminal ${terminal.id}`);
                            this.addNotification(`🔓 Door at [${door.x}, ${door.y}] is now open!`);
                        }
                    });
                }
            }
        });
}

CyberOpsGame.prototype.activateShield = function(agent) {
        agent.shield = 100;
        agent.shieldDuration = 180;
        this.effects.push({
            type: 'shield',
            target: agent.id,
            duration: 180,
            frame: 0
        });

        // Play shield sound
        this.playSound('shield', 0.4);
}

CyberOpsGame.prototype.plantNearestExplosive = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.explosiveTargets) return false;

        this.map.explosiveTargets.forEach(target => {
            if (target.planted) return;
            const dist = Math.sqrt(
                Math.pow(target.x - agent.x, 2) +
                Math.pow(target.y - agent.y, 2)
            );
            if (dist < minDist && dist < 3) {
                minDist = dist;
                nearest = target;
            }
        });

        if (nearest) {
            nearest.planted = true;
            this.effects.push({
                type: 'explosive',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 60
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.eliminateNearestTarget = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.targets) return false;

        this.map.targets.forEach(target => {
            if (target.eliminated) return;
            const dist = Math.sqrt(
                Math.pow(target.x - agent.x, 2) +
                Math.pow(target.y - agent.y, 2)
            );
            if (dist < minDist && dist < 3) {
                minDist = dist;
                nearest = target;
            }
        });

        if (nearest) {
            nearest.eliminated = true;
            this.effects.push({
                type: 'eliminate',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 60
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.breachNearestGate = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.gates) return false;

        this.map.gates.forEach(gate => {
            if (gate.breached) return;
            const dist = Math.sqrt(
                Math.pow(gate.x - agent.x, 2) +
                Math.pow(gate.y - agent.y, 2)
            );
            if (dist < minDist && dist < 4) {
                minDist = dist;
                nearest = gate;
            }
        });

        if (nearest) {
            nearest.breached = true;
            this.effects.push({
                type: 'breach',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 80
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.alertEnemies = function(x, y, radius) {
        this.enemies.forEach(enemy => {
            const dist = Math.sqrt(
                Math.pow(enemy.x - x, 2) +
                Math.pow(enemy.y - y, 2)
            );
            if (dist < radius) {
                enemy.alertLevel = Math.min(100, enemy.alertLevel + 50);
                enemy.targetX = x;
                enemy.targetY = y;
            }
        });
}

CyberOpsGame.prototype.updateCooldownDisplay = function() {
        const agent = this.agents.find(a => a.selected);
        if (!agent) return;

        for (let i = 0; i < 5; i++) {
            const overlay = document.getElementById('cooldown' + i);
            if (overlay) {
                const maxCooldown = [0, 60, 180, 120, 300][i];
                const progress = agent.cooldowns[i] / maxCooldown;
                overlay.style.background = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;
            }
        }
}

// Music pause/resume functions for pause menu
CyberOpsGame.prototype.pauseLevelMusic = function() {
    // Pause any active music
    if (this.missionAudio) {
        Object.values(this.missionAudio).forEach(audio => {
            if (audio && !audio.paused) {
                audio.dataset.wasPlaying = 'true';
                audio.pause();
            }
        });
    }
    if (this.currentMusic && !this.currentMusic.paused) {
        this.currentMusic.pause();
    }
}

CyberOpsGame.prototype.resumeLevelMusic = function() {
    // Resume any paused music
    if (this.missionAudio) {
        Object.values(this.missionAudio).forEach(audio => {
            if (audio && audio.paused && audio.dataset?.wasPlaying === 'true') {
                audio.play().catch(e => { if (this.logger) this.logger.warn('Could not resume audio:', e); });
                delete audio.dataset.wasPlaying;
            }
        });
    }
    if (this.currentMusic && this.currentMusic.paused) {
        this.currentMusic.play().catch(e => { if (this.logger) this.logger.warn('Could not resume music:', e); });
    }
}

// Aliases and helper functions
CyberOpsGame.prototype.pauseMusic = function() { return this.pauseLevelMusic(); }
CyberOpsGame.prototype.resumeMusic = function() { return this.resumeLevelMusic(); }
CyberOpsGame.prototype.stopMusic = function() {
    this.pauseLevelMusic();
    if (this.currentMusic) this.currentMusic.currentTime = 0;
}
CyberOpsGame.prototype.playMusic = function() { return this.resumeLevelMusic(); }
CyberOpsGame.prototype.fadeOutMusic = function() { this.pauseLevelMusic(); }
CyberOpsGame.prototype.fadeInMusic = function() { this.resumeLevelMusic(); }
CyberOpsGame.prototype.isPaused = function() { return this.paused === true; }
CyberOpsGame.prototype.exitToHub = function() {
    return this.returnToHub ? this.returnToHub() : this.showSyndicateHub();
}

CyberOpsGame.prototype.togglePause = function() {
        this.isPaused = !this.isPaused;
        const pauseButton = document.querySelector('.pause-button');

        if (this.isPaused) {
            pauseButton.textContent = '▶';
            this.pauseLevelMusic();

            // Release pointer lock when pausing in 3D mode
            if (document.pointerLockElement) {
                if (this.logger) this.logger.debug('🔓 Releasing pointer lock for pause menu');
                document.exitPointerLock();
            }

            // Store mission status for the pause menu dialog
            this.pauseMenuData = {
                missionTitle: this.currentMission?.title || 'Unknown',
                missionTime: `${Math.floor(this.missionTimer / 60)}:${String(this.missionTimer % 60).padStart(2, '0')}`,
                agentsAlive: this.agents.filter(a => a.alive).length,
                totalAgents: this.agents.length,
                enemiesRemaining: this.enemies.filter(e => e.alive).length,
                totalEnemies: this.enemies.length
            };
            if (this.dialogEngine) {
                this.dialogEngine.navigateTo('pause-menu');
            }
        } else {
            pauseButton.textContent = '⏸';
            this.resumeLevelMusic();
            this.closePauseMenu();
        }
}

// showPauseMenu removed - now using declarative dialog system
// All calls replaced with inline pauseMenuData setup + this.dialogEngine.navigateTo('pause-menu');

CyberOpsGame.prototype.closePauseMenu = function() {
        this.closeDialog();
        // Also resume the game when closing pause menu
        if (this.isPaused) {
            this.isPaused = false;
            const pauseButton = document.querySelector('.pause-button');
            if (pauseButton) {
                pauseButton.textContent = '⏸';
            }
            this.resumeLevelMusic();
        }
}

CyberOpsGame.prototype.resumeFromPause = function() {
        this.isPaused = false;
        const pauseButton = document.querySelector('.pause-button');
        if (pauseButton) {
            pauseButton.textContent = '⏸';
        }
        this.resumeLevelMusic();
        this.closeDialog();
}

CyberOpsGame.prototype.surrenderMission = function() {
        this.showHudDialog(
            '⚠️ SURRENDER MISSION',
            'Are you sure you want to surrender this mission?<br><br><strong>Warning:</strong> You will lose all progress and return to the Syndicate Hub without rewards.',
            [
                { text: 'CONFIRM SURRENDER', action: () => this.performSurrender() },
                { text: 'CANCEL', action: () => this.dialogEngine.navigateTo('pause-menu') }
            ]
        );
}

CyberOpsGame.prototype.performSurrender = function() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';

        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';

        // Return to hub
        window.screenManager.navigateTo('hub');
}

CyberOpsGame.prototype.returnToHubFromMission = function() {
        this.showHudDialog(
            '🏢 RETURN TO HUB',
            'Return to Syndicate Hub?<br><br><strong>Note:</strong> Your mission progress will be saved and you can resume later.',
            [
                { text: 'RETURN TO HUB', action: () => this.performReturnToHub() },
                { text: 'CANCEL', action: () => this.dialogEngine.navigateTo('pause-menu') }
            ]
        );
}

CyberOpsGame.prototype.performReturnToHub = function() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';

        // Preserve agent RPG states before leaving mission
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

        // Keep level music playing in the hub for atmosphere
        if (this.logger) this.logger.debug('🎵 Keeping level music playing in hub');

        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';

        // Save mission state (could be implemented later for mission resumption)
        window.screenManager.navigateTo('hub');
}

// Moved to game-settings.js

CyberOpsGame.prototype.backToMenuFromBriefing = function() {
        // Use screen manager to navigate back to main menu
        if (window.screenManager) {
            window.screenManager.navigateTo('main-menu');
        }
}

    // Removed - replaced by intermission dialog system

// Moved to game-settings.js