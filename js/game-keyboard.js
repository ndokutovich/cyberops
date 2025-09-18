/**
 * Centralized Keyboard Handler
 * Single source of truth for all keyboard bindings and handlers
 */

// Handle interaction key (H) - Check for NPCs first, then use hack ability
CyberOpsGame.prototype.handleInteractionKey = function() {
    console.log('🔑 H key pressed - handleInteractionKey called');

    if (this.currentScreen !== 'game') {
        console.log('  ❌ Not in game screen');
        return;
    }

    // Check if there's a dialog active
    if (this.dialogActive) {
        console.log('  ❌ Dialog already active');
        return; // Don't do anything if dialog is open
    }

    // Get the selected agent (or first agent)
    const agent = this.agents.find(a => a.selected && a.alive) || this.agents[0];
    if (!agent) {
        console.log('  ❌ No agent available');
        return; // No agent available
    }

    console.log(`  ✓ Agent found: ${agent.name} at (${agent.x.toFixed(1)}, ${agent.y.toFixed(1)})`);

    // Check for nearby NPC (only if NPC system is loaded)
    if (this.getNearbyNPC && this.interactWithNPC) {
        console.log('  ✓ NPC functions loaded, checking for nearby NPCs...');
        const nearbyNPC = this.getNearbyNPC(agent);
        if (nearbyNPC) {
            // Interact with NPC
            console.log(`  💬 Found NPC: ${nearbyNPC.name} - initiating interaction`);
            this.interactWithNPC(agent, nearbyNPC);
            return;
        } else {
            console.log('  ⚠️ No NPC nearby');
        }
    } else {
        console.log('  ⚠️ NPC functions not loaded');
    }

    // No NPC nearby or NPC system not loaded, use hack ability (ability 3)
    console.log('  🔧 Using hack ability instead');
    this.useAbilityForAllSelected(3);
};

// Initialize keyboard system
CyberOpsGame.prototype.initKeyboardHandler = function() {
    // Actual keyboard mappings - declarative config
    this.keyBindings = {
        // Agent Selection (1-6 keys for up to 6 agents)
        '1': () => this.selectAgentByNumber(0),
        '2': () => this.selectAgentByNumber(1),
        '3': () => this.selectAgentByNumber(2),
        '4': () => this.selectAgentByNumber(3),
        '5': () => this.selectAgentByNumber(4),
        '6': () => this.selectAgentByNumber(5),

        // Agent Control
        'Tab': () => this.cycleAgents(),
        'T': () => this.selectAllSquad(),
        't': () => this.selectAllSquad(),

        // Combat Actions - apply to all selected agents for keyboard shortcuts
        'F': () => this.useAbilityForAllSelected(1),  // Shoot
        'f': () => this.useAbilityForAllSelected(1),  // Shoot
        'G': () => this.useAbilityForAllSelected(2),  // Grenade
        'g': () => this.useAbilityForAllSelected(2),  // Grenade
        'H': () => this.handleInteractionKey(),  // Hack/Interact with NPCs or use ability
        'h': () => this.handleInteractionKey(),  // Handle both cases
        'Q': () => this.useAbilityForAllSelected(4),  // Shield
        'q': () => this.useAbilityForAllSelected(4),  // Shield

        // Team Commands (avoid conflicts)
        'X': () => this.setTeamMode('hold'),
        'x': () => this.setTeamMode('hold'),
        'C': () => this.setTeamMode('patrol'),
        'c': () => this.setTeamMode('patrol'),
        'V': () => this.setTeamMode('follow'),
        'v': () => this.setTeamMode('follow'),

        // Camera/View
        'E': () => this.toggle3DMode(),
        'e': () => this.toggle3DMode(), // Handle both cases
        'L': () => this.toggleSquadFollowing(),
        'l': () => this.toggleSquadFollowing(),

        // UI Controls
        'M': () => this.toggleEventLog(),
        'm': () => this.toggleEventLog(),
        'J': () => this.showMissionList(),
        'j': () => this.showMissionList(),
        '?': () => this.toggleHotkeyHelp(),
        '/': (e) => { if (e.shiftKey) this.toggleHotkeyHelp(); },

        // Debug
        'P': () => this.togglePathVisualization(),
        'p': () => this.togglePathVisualization(),
        'O': () => this.togglePathfinding(),
        'o': () => this.togglePathfinding(),
        'U': () => this.toggleFogOfWar(),
        'u': () => this.toggleFogOfWar(),

        // Game Control
        ' ': () => {
            // Toggle turn-based mode in game, pause elsewhere
            if (this.currentScreen === 'game') {
                this.toggleTurnBasedMode();
            } else {
                this.togglePause();
            }
        },
        'Escape': () => this.showPauseMenu(),

        // Turn-based controls
        'Y': () => {
            // Y for "Yield turn" - end current turn
            if (this.turnBasedMode && this.currentScreen === 'game' && this.endTurn) {
                this.endTurn();
            }
        },
        'y': () => {
            if (this.turnBasedMode && this.currentScreen === 'game' && this.endTurn) {
                this.endTurn();
            }
        },
        'B': () => {
            // B for "Board snap" - grid snap toggle
            if (this.toggleGridSnap) {
                this.toggleGridSnap();
            }
        },
        'b': () => {
            if (this.toggleGridSnap) {
                this.toggleGridSnap();
            }
        },

        // Speed Control
        'Z': () => this.cycleGameSpeed(),
        'z': () => this.cycleGameSpeed()
    };

    // Movement keys for 3D mode (handled separately)
    this.movementKeys = ['W', 'A', 'S', 'D'];

    // Track key states
    this.keysPressed = {};
    this.keys3D = { W: false, A: false, S: false, D: false };

    // Setup event listeners
    this.setupKeyboardListeners();
};

// Setup keyboard event listeners
CyberOpsGame.prototype.setupKeyboardListeners = function() {
    // Prevent duplicate listeners
    if (this.keyboardListenersSetup) {
        console.log('⚠️ Keyboard listeners already setup, skipping...');
        return;
    }
    this.keyboardListenersSetup = true;

    // Main keyboard handler
    document.addEventListener('keydown', (e) => {
        // Don't process if typing in an input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Track key state
        this.keysPressed[e.key] = true;

        // Handle 3D movement keys
        if (this.is3DMode && this.currentScreen === 'game') {
            switch(e.code) {
                case 'KeyW': this.keys3D.W = true; break;
                case 'KeyA': this.keys3D.A = true; break;
                case 'KeyS': this.keys3D.S = true; break;
                case 'KeyD': this.keys3D.D = true; break;
                case 'KeyR':
                    // Cycle through 3D actions
                    if (!this.action3DMode) this.action3DMode = 'move';
                    const modes = ['move', 'attack', 'hack'];
                    const currentIndex = modes.indexOf(this.action3DMode);
                    this.action3DMode = modes[(currentIndex + 1) % modes.length];
                    console.log('3D Action mode:', this.action3DMode);
                    break;
            }
        }

        // Only process game keys when in game screen
        if (this.currentScreen !== 'game' && e.key !== 'Escape') return;

        // Get the handler for this key - try both cases and the code
        const handler = this.keyBindings[e.key] ||
                       this.keyBindings[e.key.toUpperCase()] ||
                       this.keyBindings[e.key.toLowerCase()];

        if (handler) {
            console.log(`⌨️ Key pressed: ${e.key}, executing handler`);
            e.preventDefault();
            handler(e);
        }
    });

    // Key up handler for movement
    document.addEventListener('keyup', (e) => {
        // Clear key state
        this.keysPressed[e.key] = false;

        // Handle 3D movement key release
        if (this.is3DMode && this.currentScreen === 'game') {
            switch(e.code) {
                case 'KeyW': this.keys3D.W = false; break;
                case 'KeyA': this.keys3D.A = false; break;
                case 'KeyS': this.keys3D.S = false; break;
                case 'KeyD': this.keys3D.D = false; break;
            }
        }
    });
};

// Individual action handlers
CyberOpsGame.prototype.selectAgentByNumber = function(index) {
    // In turn-based mode, don't allow switching
    if (this.turnBasedMode && this.currentTurnUnit) {
        if (this.logEvent) {
            this.logEvent(`Can't switch agents - it's ${this.currentTurnUnit.unit.name}'s turn!`, 'warning');
        }
        return;
    }

    if (index < this.agents.length && this.agents[index].alive) {
        this.selectAgent(this.agents[index]);
    }
};

CyberOpsGame.prototype.cycleAgents = function() {
    // In turn-based mode, don't allow cycling
    if (this.turnBasedMode && this.currentTurnUnit) {
        if (this.logEvent) {
            this.logEvent(`Can't cycle agents - it's ${this.currentTurnUnit.unit.name}'s turn!`, 'warning');
        }
        return;
    }

    const aliveAgents = this.agents.filter(a => a.alive);
    if (aliveAgents.length > 0) {
        const current = aliveAgents.findIndex(a => a.selected);
        const next = (current + 1) % aliveAgents.length;
        this.selectAgent(aliveAgents[next]);
    }
};

CyberOpsGame.prototype.toggle3DMode = function() {
    // RESTORED ORIGINAL FUNCTIONALITY - Cycles through tactical/third/first modes
    console.log('🔑 E key detected! Checking conditions...');
    console.log('  - currentScreen:', this.currentScreen);
    console.log('  - _selectedAgent exists:', !!this._selectedAgent);
    console.log('  - _selectedAgent details:', this._selectedAgent ? this._selectedAgent.name : 'none');
    console.log('  - 3D system available:', !!this.scene3D);

    // Only works in game screen
    if (this.currentScreen !== 'game') {
        console.log('⚠️ Cannot toggle 3D mode - not in game screen');
        return;
    }

    // Initialize 3D system if needed
    if (!this.scene3D) {
        console.log('🎮 Initializing 3D system first...');
        this.init3D();
    }

    // Auto-select first agent if none selected
    if (!this._selectedAgent && this.agents && this.agents.length > 0) {
        const firstAlive = this.agents.find(a => a.alive);
        if (firstAlive) {
            this._selectedAgent = firstAlive;
            firstAlive.selected = true;
            console.log('🎯 Auto-selected first alive agent for E key:', firstAlive.name);
        }
    }

    if (this._selectedAgent && this.scene3D) {
        console.log('✅ All conditions met! Switching camera mode...');
        this.switchCameraMode();
    } else {
        console.log('❌ Conditions not met for camera switch:');
        if (!this._selectedAgent) console.log('  - No agent selected');
        if (!this.scene3D) console.log('  - 3D system not available');
    }
};

CyberOpsGame.prototype.toggleSquadFollowing = function() {
    this.squadFollowing = this.squadFollowing !== false ? false : true;
    console.log('👥 Squad Following:', this.squadFollowing ? 'ON' : 'OFF');
};

CyberOpsGame.prototype.togglePathVisualization = function() {
    this.showPaths = !this.showPaths;
    console.log('🛤️ Path visualization:', this.showPaths ? 'ON' : 'OFF');
};

CyberOpsGame.prototype.togglePathfinding = function() {
    this.usePathfinding = !this.usePathfinding;
    console.log('🧭 Pathfinding:', this.usePathfinding ? 'ON' : 'OFF');

    // Clear existing paths when toggling
    this.agents.forEach(agent => {
        agent.path = null;
        agent.lastTargetKey = null;
    });
};

CyberOpsGame.prototype.toggleHotkeyHelp = function() {
    this.showHotkeyHelp = !this.showHotkeyHelp;
    console.log('❓ Hotkey help:', this.showHotkeyHelp ? 'SHOWN' : 'HIDDEN');
};

// Get current key bindings for display
CyberOpsGame.prototype.getKeyBindingsDisplay = function() {
    return {
        'Agent Control': [
            { key: '1-6', action: 'Select Agent 1-6' },
            { key: 'Tab', action: 'Cycle Agents' },
            { key: 'T', action: 'Select All Squad' }
        ],
        'Combat': [
            { key: 'F', action: 'Fire/Shoot' },
            { key: 'G', action: 'Throw Grenade' },
            { key: 'H', action: 'Hack/Interact with NPCs' },
            { key: 'Q', action: 'Activate Shield' }
        ],
        'Team Commands': [
            { key: 'X', action: 'Hold Position' },
            { key: 'C', action: 'Patrol Area' },
            { key: 'V', action: 'Follow Leader' }
        ],
        'Movement (3D)': [
            { key: 'WASD', action: 'Move Camera' },
            { key: 'R', action: 'Cycle Action Mode' }
        ],
        'View': [
            { key: 'E', action: 'Toggle 2D/3D Mode' },
            { key: 'L', action: 'Toggle Squad Following' },
            { key: 'M', action: 'Toggle Mission Log' },
            { key: 'J', action: 'Show Mission List' }
        ],
        'Debug': [
            { key: 'P', action: 'Show Path Visualization' },
            { key: 'O', action: 'Toggle Pathfinding' },
            { key: 'U', action: 'Toggle Fog of War' },
            { key: '?', action: 'Show This Help' }
        ],
        'Game': [
            { key: 'Space', action: 'Toggle Turn-Based Mode' },
            { key: 'Y', action: 'Yield/End Turn (Turn-Based)' },
            { key: 'B', action: 'Board/Grid Snap (Turn-Based)' },
            { key: 'Esc', action: 'Pause Menu' },
            { key: 'Z', action: 'Cycle Speed (1x/2x/4x)' }
        ]
    };
};