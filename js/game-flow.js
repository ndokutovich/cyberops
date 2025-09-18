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
        console.log('🚀 startCampaign() called - checking missions before showing hub...');
        console.log('- this.missions exists:', !!this.missions);
        console.log('- this.missions length:', this.missions ? this.missions.length : 'UNDEFINED');

        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.currentMissionIndex = 0;
        this.completedMissions = [];

        // EMERGENCY CHECK: Make sure missions are initialized before showing hub
        if (!this.missions || this.missions.length === 0) {
            console.error('🚨 EMERGENCY in startCampaign: missions not initialized! Calling initializeHub...');
            this.initializeHub();
        }

        this.showSyndicateHub();
}

CyberOpsGame.prototype.continueCampaign = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.showSyndicateHub();
}

CyberOpsGame.prototype.selectMission = function() {
        this.showMissionSelectDialog();
}

CyberOpsGame.prototype.showMissionSelectDialog = function() {
        const missionList = document.getElementById('missionList');
        missionList.innerHTML = '';

        this.missions.forEach((mission, index) => {
            const missionDiv = document.createElement('div');
            missionDiv.className = 'mission-option';

            const isCompleted = this.completedMissions.includes(mission.id);
            const isAvailable = index <= this.currentMissionIndex;
            const isLocked = !isAvailable;

            if (isLocked) {
                missionDiv.classList.add('locked');
            }

            missionDiv.innerHTML = `
                <div class="mission-info">
                    <div class="mission-name">Mission ${mission.id}: ${mission.title}</div>
                    <div class="mission-desc">${mission.description.substring(0, 100)}...</div>
                </div>
                <div class="mission-status ${isCompleted ? 'completed' : isAvailable ? 'available' : 'locked'}">
                    ${isCompleted ? '✓' : isAvailable ? '◉' : '🔒'}
                </div>
            `;

            if (isAvailable) {
            missionDiv.onclick = () => {
                this.closeMissionSelect();
                if (this.currentScreen === 'hub') {
                    document.getElementById('syndicateHub').style.display = 'none';
                } else {
                    document.getElementById('mainMenu').style.display = 'none';
                }
                this.startMissionFromHub(index);
            };
            }

            missionList.appendChild(missionDiv);
        });

        document.getElementById('missionSelectDialog').classList.add('show');
}

CyberOpsGame.prototype.closeMissionSelect = function() {
        document.getElementById('missionSelectDialog').classList.remove('show');

        // If we came from hub, show it again
        if (document.getElementById('syndicateHub').style.display === 'none') {
            document.getElementById('syndicateHub').style.display = 'flex';
        }
}

CyberOpsGame.prototype.showMissionBriefing = function(mission) {
        document.getElementById('missionBriefing').style.display = 'flex';
        document.getElementById('missionTitle').textContent = `Mission ${mission.id}: ${mission.title}`;
        document.getElementById('missionDesc').textContent = mission.description;

        // Continue main theme music during briefing (don't change music yet)
        console.log('🎵 Mission briefing - keeping main theme music playing');
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
        this.selectedAgents = [];

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
            console.log(`⚠️ Only ${availableAgentsForMission.length} agents available, but mission allows ${maxAgentsForMission}`);
        }

        // Calculate weapon distribution for preview
        let weaponAssignments = [];
        if (window.GameServices && window.GameServices.equipmentService) {
            weaponAssignments = window.GameServices.equipmentService.distributeWeapons(
                availableAgentsForMission,
                this.weapons || []
            );
        }

        availableAgentsForMission.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            const agentName = agent.name || `Agent ${idx + 1}`;
            const agentHealth = agent.health;
            const agentDamage = agent.damage;
            const agentSpeed = agent.speed;

            // Get weapon assignment for this agent
            const assignment = weaponAssignments[idx];
            const weaponInfo = assignment && assignment.weapon ?
                `<div style="color: #ffa500; font-size: 0.9em;">🔫 ${assignment.weapon.name}</div>` :
                '<div style="color: #888; font-size: 0.9em;">🔫 No weapon</div>';

            card.innerHTML = `
                <div style="font-weight: bold; color: #00ffff;">${agentName}</div>
                ${weaponInfo}
                <div style="font-size: 0.8em; margin-top: 5px;">
                    HP: ${agentHealth} | DMG: ${agentDamage}<br>
                    Speed: ${agentSpeed}
                </div>
            `;
            card.onclick = () => {
                const existing = this.selectedAgents.findIndex(a => a.template === idx);
                if (existing !== -1) {
                    this.selectedAgents.splice(existing, 1);
                    card.classList.remove('selected');
                } else if (this.selectedAgents.length < maxAgentsForMission) {
                    this.selectedAgents.push({ template: idx, ...agent });
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
        if (this.selectedAgents.length === 0) {
            this.showHudDialog(
                'DEPLOYMENT ERROR',
                '⚠️ Mission deployment failed!<br><br>You must select at least one agent before deployment.<br><br>Select your squad from the agent roster and try again.',
                [{ text: 'UNDERSTOOD', action: 'close' }]
            );
            return;
        }

        // Auto-save before mission if enabled
        if (this.autoSaveEnabled) {
            console.log('🔄 Creating pre-mission autosave...');
            const missionName = this.currentMission ? this.currentMission.title : 'Unknown Mission';
            this.saveToSlot('pre_mission_autosave', `Pre-Mission: ${missionName}`);
        }

        document.getElementById('missionBriefing').style.display = 'none';
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

        this.currentScreen = 'game';
        this.initMission();

        // Initialize music system if needed
        if (!this.musicSystem) {
            this.initMusicSystem();
        }

        // Stop ALL existing music before starting mission
        console.log('🎵 Stopping all music for mission start');

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

            console.log('🎵 Loading mission music configuration');
            this.loadMissionMusic(this.currentMissionDef);
        }
}

CyberOpsGame.prototype.initMission = function() {
        // CRITICAL: Ensure 3D mode is off at mission start
        if (this.is3DMode) {
            console.log('🔄 Resetting to 2D mode for mission start');
            this.cleanup3D();
        }

        // Log mission start
        if (this.logEvent && this.currentMission) {
            this.logEvent(`Mission ${this.currentMission.id}: ${this.currentMission.title} started`, 'mission', true);
        }

        // Reset state
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.missionTimer = 0;
        this.isPaused = false;

        // Initialize NPC system (NPCs will be spawned after mission definition is loaded)
        if (this.initNPCSystem) {
            console.log('🎮 Initializing NPC system...');
            this.initNPCSystem();
        } else {
            console.warn('⚠️ NPC system not loaded - initNPCSystem not found');
        }

        // Reset mission tracking
        this.hackedTerminals = 0;  // Reset terminal hacking counter
        this.enemiesKilledThisMission = 0;  // Reset enemy kill counter
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
            console.log('⌨️ Keyboard handler initialized');
        }

        // CRITICAL: Full 3D mode reset to prevent movement state carryover
        console.log('🔄 Resetting 3D mode state for new mission');

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
                console.log('🗺️ Loading embedded tiles from mission');
                this.map = this.loadMapFromEmbeddedTiles(this.currentMission.map);
                console.log(`📍 Loaded embedded map: ${this.currentMission.map.type} (${this.map.width}x${this.map.height})`);
            } else if (this.currentMission.map.generation && this.generateMapFromEmbeddedDefinition) {
                // Mission has generation rules (old format) - generate from rules
                console.log('🗺️ Generating map from rules');
                this.map = this.generateMapFromEmbeddedDefinition(this.currentMission.map);
                console.log(`📍 Generated map: ${this.currentMission.map.type} (${this.map.width}x${this.map.height})`);
            } else {
                // No embedded map available - this should never happen in new architecture
                console.error('❌ Mission has no embedded map! All missions must have embedded maps.');
                throw new Error('Mission missing embedded map data');
            }
        } else {
            // Legacy string map type - this should never happen in new architecture
            console.error('❌ Mission using legacy string map type! All missions must have embedded maps.');
            throw new Error('Mission using legacy map format');
        }

        // DEBUG: Check if map was modified right after assignment
        console.log('🔍 IMMEDIATE CHECK - Map loaded:');
        console.log('  tile[6][6]:', this.map.tiles[6][6], '(should be 0)');
        console.log('  tile[3][3]:', this.map.tiles[3][3]);

        // MAP TRACE 5: After map assignment - Check ALL rooms
        console.log('🔍 MAP TRACE 5 - After map assignment, checking ALL rooms:');

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
                console.log(`  Room ${idx+1} at (${room.x},${room.y}): ${sample}`);
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

        // Use all hired agents up to the mission limit
        const availableForMission = this.activeAgents.slice(0, maxAgentsForMission);

        // If we have selectedAgents, prioritize them, otherwise use all available
        let baseAgents;
        if (this.selectedAgents && this.selectedAgents.length > 0) {
            // Add selected agents first
            baseAgents = this.selectedAgents.map(selectedAgent => {
                return this.activeAgents.find(a => a.name === selectedAgent.name) || selectedAgent;
            });

            // Add more hired agents if we have room
            const additionalAgents = availableForMission.filter(
                agent => !baseAgents.find(a => a.name === agent.name)
            );
            baseAgents = [...baseAgents, ...additionalAgents].slice(0, maxAgentsForMission);
        } else {
            baseAgents = availableForMission;
        }

        console.log(`🎯 Mission ${this.currentMissionIndex + 1}: Deploying ${baseAgents.length} agents (max: ${maxAgentsForMission})`);

        // Apply loadouts if equipment system is initialized
        let agentsWithLoadouts = baseAgents;
        if (this.agentLoadouts && this.applyLoadoutsToAgents) {
            agentsWithLoadouts = this.applyLoadoutsToAgents(baseAgents);
        }

        // Apply research modifiers
        let modifiedAgents;
        if (window.GameServices) {
            // Apply research bonuses (weapons already handled by loadouts)
            modifiedAgents = agentsWithLoadouts.map(agent => {
                return window.GameServices.researchService.applyResearchToAgent(
                    { ...agent },
                    this.completedResearch || []
                );
            });
        }

        // Add mission-specific properties to each agent
        modifiedAgents.forEach((agent, idx) => {

            // Add mission-specific properties
            agent.id = 'agent_' + idx;
            agent.x = spawn.x + idx % 2;
            agent.y = spawn.y + Math.floor(idx / 2);
            agent.targetX = spawn.x + idx % 2;
            agent.targetY = spawn.y + Math.floor(idx / 2);
            console.log(`🎯 Agent ${idx+1} (${agent.name}) placed at (${agent.x}, ${agent.y})`);
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
            console.log(`🎨 Agent ${idx + 1}: ${agent.name} assigned color: ${agent.color}`);

            // Ensure required properties exist
            agent.maxHealth = agent.maxHealth || agent.health;
            agent.protection = agent.protection || 0;
            agent.hackBonus = agent.hackBonus || 0;
            agent.stealthBonus = agent.stealthBonus || 0;

            this.agents.push(agent);
        });

            // Auto-select first agent for better UX
            if (this.agents.length > 0) {
                this.agents.forEach(a => a.selected = false);

                // Select first agent by default
                const firstAgent = this.agents[0];
                firstAgent.selected = true;
                this._selectedAgent = firstAgent;

                console.log('🎯 Auto-selected first agent for better UX:', firstAgent.name);
                console.log('👥 Available agents:', this.agents.map(a => a.name));
                console.log('✅ Press E to switch camera modes, Tab to change agents');

            // CRITICAL: Center camera on agents when mission starts to prevent NaN camera positions
            console.log('🎥 Before camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);

            // Calculate center point of all agents
            if (this.agents && this.agents.length > 0) {
                let totalX = 0;
                let totalY = 0;
                this.agents.forEach(agent => {
                    totalX += agent.x;
                    totalY += agent.y;
                });

                // Center camera on average agent position
                this.cameraX = Math.floor(totalX / this.agents.length - this.canvas.width / (2 * this.tileWidth));
                this.cameraY = Math.floor(totalY / this.agents.length - this.canvas.height / (2 * this.tileHeight));

                console.log('🎥 Manual camera centering completed - agents average pos:', {
                    avgX: totalX / this.agents.length,
                    avgY: totalY / this.agents.length,
                    cameraX: this.cameraX,
                    cameraY: this.cameraY
                });
            }

            console.log('🎥 After camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);
        } else {
            console.log('⚠️ No agents available to select!');
        }

        // Spawn enemies with enhanced variety and positioning
        this.spawnMissionEnemies();

        // Set initial objective from mission definition
        if (this.updateObjectiveDisplay) {
            this.updateObjectiveDisplay();
        }

        this.updateSquadHealth();
        this.centerCameraOnAgents();
}

// Enhanced enemy spawning system with variety and better positioning
CyberOpsGame.prototype.spawnMissionEnemies = function() {
    // Enemy types must be loaded from campaign
    const enemyTypes = this.campaignEnemyTypes;
    if (!enemyTypes || enemyTypes.length === 0) {
        console.error('⚠️ No enemy types loaded from campaign! Cannot spawn enemies.');
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

    console.log(`📊 Spawning ${totalEnemies} enemies (base: ${baseEnemies}, bonus: ${bonusEnemies})`);

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
    console.log(`📍 Strategic positions for enemies:`, strategicPositions);
    console.log(`📍 Map enemySpawns:`, this.map.enemySpawns);

    // Spawn enemies
    enemyComposition.forEach((enemyTypeName, i) => {
        const enemyTemplate = enemyTypes.find(t => t.type === enemyTypeName) || enemyTypes[0];
        const position = strategicPositions[i] || { x: 10 + Math.random() * 20, y: 10 + Math.random() * 20 };
        console.log(`🎯 Spawning enemy ${i} (${enemyTypeName}) at:`, position);

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
            patrolRoute: position.patrol || null
        };
        enemy.targetX = enemy.x;
        enemy.targetY = enemy.y;
        this.enemies.push(enemy);
        console.log(`✅ Enemy ${i} created: ${enemyTypeName} at exact position (${enemy.x}, ${enemy.y}) with health ${enemy.health}`);
    });

    console.log(`⚔️ Enemy composition for mission ${this.currentMissionIndex + 1}:`,
        enemyComposition.reduce((acc, type) => {
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {})
    );

    // Verify all enemy positions
    console.log(`📍 FINAL ENEMY POSITIONS CHECK:`);
    this.enemies.forEach((enemy, idx) => {
        console.log(`  Enemy ${idx}: ${enemy.type} at (${enemy.x}, ${enemy.y}) - alive: ${enemy.alive}`);
    });
};

// Get strategic enemy positions based on map type
CyberOpsGame.prototype.getStrategicEnemyPositions = function(count) {
    const positions = [];
    const mapWidth = this.map.width || 40;
    const mapHeight = this.map.height || 30;

    // First, try to use predefined enemy spawn points from the map
    if (this.map.enemySpawns && this.map.enemySpawns.length > 0) {
        console.log(`📍 Using ${this.map.enemySpawns.length} predefined enemy spawn points`);

        // Use all predefined spawns first
        for (let i = 0; i < Math.min(count, this.map.enemySpawns.length); i++) {
            const spawn = this.map.enemySpawns[i];
            // Check if spawn point is walkable
            const tileValue = this.map.tiles[spawn.y] && this.map.tiles[spawn.y][spawn.x];
            if (tileValue === 1) {
                console.log(`⚠️ WARNING: Enemy spawn ${i} at (${spawn.x}, ${spawn.y}) is in a WALL (tile=1)!`);
            } else {
                console.log(`✅ Enemy spawn ${i} at (${spawn.x}, ${spawn.y}) is walkable (tile=${tileValue})`);
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
}

CyberOpsGame.prototype.centerCameraOnAgent = function(agent) {
        const screenPos = this.worldToIsometric(agent.x, agent.y);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;
}

CyberOpsGame.prototype.updateSquadHealth = function() {
        const container = document.getElementById('squadHealth');
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

            bar.innerHTML = `
                <div class="health-fill" style="width: ${healthPercent}%"></div>
                <div class="agent-name">${agent.name} [${index + 1}]${!agent.alive ? ' ☠️' : ''}</div>
            `;

            // Add click handler to select this agent
            bar.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event bubbling
                e.preventDefault(); // Prevent default behavior
                console.log(`🖱️ Health bar CLICK event for ${agent.name}, alive: ${agent.alive}`);

                if (agent.alive) {
                    // Directly call selectAgent
                    this.selectAgent(agent);
                    console.log(`🎯 Selected ${agent.name} via health bar click`);
                }
            });

            // Also handle mousedown as backup
            bar.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                console.log(`🖱️ Health bar MOUSEDOWN for ${agent.name}, alive: ${agent.alive}`);

                // Try selecting on mousedown as well
                if (agent.alive) {
                    this.selectAgent(agent);
                    console.log(`🎯 Selected ${agent.name} via health bar mousedown`);
                }
            });

            container.appendChild(bar);
        });
}

CyberOpsGame.prototype.useAbility = function(abilityIndex) {
        if (this.isPaused) return;
        const agent = this.agents.find(a => a.selected);
        if (!agent || !agent.alive || agent.cooldowns[abilityIndex] > 0) return;

        switch (abilityIndex) {
            case 1: // Shoot
                this.shootNearestEnemy(agent);
                agent.cooldowns[1] = 60;
                break;
            case 2: // Grenade
                this.throwGrenade(agent);
                agent.cooldowns[2] = 180;
                break;
            case 3: // Hack/Interact - Use generic action system
                // The new mission system handles all interactions generically
                if (this.useActionAbility) {
                    this.useActionAbility(agent);
                }
                agent.cooldowns[3] = 120;
                break;
            case 4: // Shield
                this.activateShield(agent);
                agent.cooldowns[4] = 300;
                break;
        }
        this.updateCooldownDisplay();
}

// Use ability for all selected agents (keyboard shortcuts)
CyberOpsGame.prototype.useAbilityForAllSelected = function(abilityIndex) {
        if (this.isPaused) return;

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
            this.projectiles.push({
                x: agent.x,
                y: agent.y,
                targetX: nearest.x,
                targetY: nearest.y,
                targetEnemy: nearest, // Store the actual target
                damage: agent.damage,
                speed: 0.5,
                owner: agent.id
            });

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
        setTimeout(() => {
            this.effects.push({
                type: 'explosion',
                x: agent.targetX,
                y: agent.targetY,
                radius: 3,
                damage: 50,
                duration: 30,
                frame: 0
            });

            // Big shake and freeze for grenade explosion
            if (this.triggerVisualEffect) {
                this.triggerVisualEffect('freezeEffects', 'explosion', { x: agent.targetX, y: agent.targetY });
                this.triggerVisualEffect('screenShake', 'explosion', { x: agent.targetX, y: agent.targetY });
            }

            // Play explosion sound
            this.playSound('explosion', 0.6);

            // Strong vibration for explosion
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 30, 100]); // Pattern: short, pause, long
            }

            this.enemies.forEach(enemy => {
                const dist = Math.sqrt(
                    Math.pow(enemy.x - agent.targetX, 2) +
                    Math.pow(enemy.y - agent.targetY, 2)
                );
                if (dist < 3) {
                    enemy.health -= 50;
                    if (enemy.health <= 0) {
                        enemy.alive = false;
                        this.totalEnemiesDefeated++;

                        // Track enemy elimination for mission objectives
                        if (this.onEnemyEliminated) {
                            this.onEnemyEliminated(enemy);
                        }

                        console.log(`💥 Grenade killed enemy at (${enemy.x}, ${enemy.y})`);
                    }
                }
            });

            this.alertEnemies(agent.targetX, agent.targetY, 10);
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
    console.log('🌫️ Fog of War:', this.fogEnabled ? 'ENABLED' : 'DISABLED');

    // Check specific tiles
    if (this.map && this.map.tiles) {
        console.log('🔍 Checking specific tile values:');
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
            console.log(`  Tile[${pos.y}][${pos.x}] = ${tileValue} (${tileValue === 0 ? 'walkable' : 'wall'})`);
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

        console.log('=== MAP STRUCTURE DEBUG ===');
        console.log('Map size:', mapSample.width, 'x', mapSample.height);
        console.log('First room area (5,5 to 15,15):');
        Object.entries(mapSample.roomArea).forEach(([key, val]) => {
            console.log(`  ${key}: ${val}`);
        });
        console.log('Corridor area at y=25:');
        Object.entries(mapSample.corridorArea).forEach(([key, val]) => {
            console.log(`  ${key}: ${val}`);
        });
        console.log('Full map (0,0 to 30,20) - "." = walkable, "#" = wall:');
        mapSample.fullMap.forEach((row, index) => {
            console.log(`Row ${index.toString().padStart(2, '0')}: ${row}`);
        });

        // Also log as JSON for easy copy
        console.log('JSON for analysis:', JSON.stringify(mapSample));

        // Show a visual map of the center area
        console.log('\n🗺️ Visual map of center area (35,35) to (55,55):');
        for (let y = 35; y <= 55; y++) {
            let row = '';
            for (let x = 35; x <= 55; x++) {
                row += this.map.tiles[y][x] === 0 ? '.' : '#';
            }
            console.log(`Row ${y}: ${row}`);
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
                            console.log(`Audio playback failed for ${soundName}: ${err.message}`);
                            this.playSynthSound(soundName, volume);
                        });
                    }
                    return;
                } catch (err) {
                    console.log(`Error cloning/playing ${soundName}: ${err.message}`);
                }
            } else {
                // Audio not ready, check if it has a source that failed to load
                console.log(`Audio element ${soundName} not ready (readyState: ${audioElement.readyState})`);

                // Try to reload it
                audioElement.load();

                // For now, use synthesized sound
                this.playSynthSound(soundName, volume);
                return;
            }
        } else {
            console.log(`No audio element found for ${soundName}`);
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
            console.log('Synth sound failed:', soundName, e);
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

                // Increment the hackedTerminals counter for quest tracking
                this.hackedTerminals = (this.hackedTerminals || 0) + 1;

                // Also update mission trackers for the new system
                if (this.missionTrackers) {
                    this.missionTrackers.terminalsHacked = (this.missionTrackers.terminalsHacked || 0) + 1;
                }

                console.log(`🖥️ Terminal hacked! Total: ${this.hackedTerminals}`);

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

                            console.log(`🔓 Door at (${door.x}, ${door.y}) unlocked by terminal ${terminal.id}`);
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

CyberOpsGame.prototype.togglePause = function() {
        this.isPaused = !this.isPaused;
        const pauseButton = document.querySelector('.pause-button');

        if (this.isPaused) {
            pauseButton.textContent = '▶';
            this.pauseLevelMusic();

            // Release pointer lock when pausing in 3D mode
            if (document.pointerLockElement) {
                console.log('🔓 Releasing pointer lock for pause menu');
                document.exitPointerLock();
            }

            this.showPauseMenu();
        } else {
            pauseButton.textContent = '⏸';
            this.resumeLevelMusic();
            this.closePauseMenu();
        }
}

CyberOpsGame.prototype.showPauseMenu = function() {
        this.showHudDialog(
            '⏸ GAME PAUSED',
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #fff; margin-bottom: 15px;">Mission Status</h3>
                    <div style="color: #ccc;">
                        <div>Mission: ${this.currentMission.title}</div>
                        <div>Time: ${Math.floor(this.missionTimer / 60)}:${String(this.missionTimer % 60).padStart(2, '0')}</div>
                        <div>Agents Alive: ${this.agents.filter(a => a.alive).length}/${this.agents.length}</div>
                        <div>Enemies Remaining: ${this.enemies.filter(e => e.alive).length}/${this.enemies.length}</div>
                    </div>
                </div>
            </div>`,
            [
                { text: 'RESUME', action: () => this.resumeFromPause() },
                { text: 'SURRENDER', action: () => this.surrenderMission() },
                { text: 'RETURN TO HUB', action: () => this.returnToHubFromMission() },
                { text: 'SETTINGS', action: () => this.showSettingsFromPause() }
            ]
        );
}

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
                { text: 'CANCEL', action: () => this.showPauseMenu() }
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
        this.showSyndicateHub();
}

CyberOpsGame.prototype.returnToHubFromMission = function() {
        this.showHudDialog(
            '🏢 RETURN TO HUB',
            'Return to Syndicate Hub?<br><br><strong>Note:</strong> Your mission progress will be saved and you can resume later.',
            [
                { text: 'RETURN TO HUB', action: () => this.performReturnToHub() },
                { text: 'CANCEL', action: () => this.showPauseMenu() }
            ]
        );
}

CyberOpsGame.prototype.performReturnToHub = function() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';

        // Keep level music playing in the hub for atmosphere
        console.log('🎵 Keeping level music playing in hub');

        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';

        // Save mission state (could be implemented later for mission resumption)
        this.showSyndicateHub();
}

// Moved to game-settings.js

CyberOpsGame.prototype.backToMenuFromBriefing = function() {
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
}

    // Removed - replaced by intermission dialog system

// Moved to game-settings.js