/**
 * Centralized Keyboard Handler
 * Single source of truth for all keyboard bindings and handlers
 */

// Initialize keyboard system
CyberOpsGame.prototype.initKeyboardHandler = function() {
    // Actual keyboard mappings - declarative config
    this.keyBindings = {
        // Agent Selection (1-4 keys)
        '1': () => this.selectAgentByNumber(0),
        '2': () => this.selectAgentByNumber(1),
        '3': () => this.selectAgentByNumber(2),
        '4': () => this.selectAgentByNumber(3),

        // Agent Control
        'Tab': () => this.cycleAgents(),
        'T': () => this.selectAllSquad(),

        // Combat Actions - apply to all selected agents for keyboard shortcuts
        'F': () => this.useAbilityForAllSelected(1),  // Shoot
        'G': () => this.useAbilityForAllSelected(2),  // Grenade
        'H': () => this.useAbilityForAllSelected(3),  // Hack/Interact (only first agent)
        'Q': () => this.useAbilityForAllSelected(4),  // Shield

        // Team Commands (avoid conflicts)
        'X': () => this.setTeamMode('hold'),
        'C': () => this.setTeamMode('patrol'),
        'V': () => this.setTeamMode('follow'),

        // Camera/View
        'E': () => this.toggle3DMode(),
        'e': () => this.toggle3DMode(), // Handle both cases
        'L': () => this.toggleSquadFollowing(),

        // UI Controls
        'M': () => this.toggleEventLog(),
        '?': () => this.toggleHotkeyHelp(),
        '/': (e) => { if (e.shiftKey) this.toggleHotkeyHelp(); },

        // Debug
        'P': () => this.togglePathVisualization(),
        'O': () => this.togglePathfinding(),

        // Game Control
        ' ': () => this.togglePause(),
        'Escape': () => this.showPauseMenu()
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

        // Get the handler for this key
        const handler = this.keyBindings[e.key] || this.keyBindings[e.key.toUpperCase()];

        if (handler) {
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
    if (index < this.agents.length && this.agents[index].alive) {
        this.selectAgent(this.agents[index]);
    }
};

CyberOpsGame.prototype.cycleAgents = function() {
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
            { key: '1-4', action: 'Select Agent 1-4' },
            { key: 'Tab', action: 'Cycle Agents' },
            { key: 'T', action: 'Select All Squad' }
        ],
        'Combat': [
            { key: 'F', action: 'Fire/Shoot' },
            { key: 'G', action: 'Throw Grenade' },
            { key: 'H', action: 'Hack/Interact' },
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
            { key: 'M', action: 'Toggle Mission Log' }
        ],
        'Debug': [
            { key: 'P', action: 'Show Path Visualization' },
            { key: 'O', action: 'Toggle Pathfinding' },
            { key: '?', action: 'Show This Help' }
        ],
        'Game': [
            { key: 'Space', action: 'Pause Game' },
            { key: 'Esc', action: 'Pause Menu' }
        ]
    };
};