/**
 * Centralized Keyboard Handler
 * Single source of truth for all keyboard bindings and handlers
 */

// Handle interaction key (H) - Check for NPCs first, then use hack ability
CyberOpsGame.prototype.handleInteractionKey = function() {
    if (this.logger) this.logger.debug('🔑 H key pressed - handleInteractionKey called');

    if (this.currentScreen !== 'game') {
        if (this.logger) this.logger.debug('  ❌ Not in game screen');
        return;
    }

    // Check if there's a dialog active
    if (this.dialogActive) {
        if (this.logger) this.logger.debug('  ❌ Dialog already active');
        return; // Don't do anything if dialog is open
    }

    // Get the selected agent (or first agent)
    // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
    const agent = this.agents.find(a => this.isAgentSelected(a) && a.alive) || this.agents[0];
    if (!agent) {
        if (this.logger) this.logger.debug('  ❌ No agent available');
        return; // No agent available
    }

    if (this.logger) this.logger.debug(`  ✓ Agent found: ${agent.name} at (${agent.x.toFixed(1)}, ${agent.y.toFixed(1)})`);

    // Check for nearby NPC (only if NPC system is loaded)
    if (this.getNearbyNPC && this.interactWithNPC) {
        if (this.logger) this.logger.info('  ✓ NPC functions loaded, checking for nearby NPCs...');
        const nearbyNPC = this.getNearbyNPC(agent);
        if (nearbyNPC) {
            // Interact with NPC
            if (this.logger) this.logger.debug(`  💬 Found NPC: ${nearbyNPC.name} - initiating interaction`);
            this.interactWithNPC(agent, nearbyNPC);
            return;
        } else {
            if (this.logger) this.logger.debug('  ⚠️ No NPC nearby');
        }
    } else {
        if (this.logger) this.logger.info('  ⚠️ NPC functions not loaded');
    }

    // No NPC nearby or NPC system not loaded, use hack ability (ability 3)
    if (this.logger) this.logger.debug('  🔧 Using hack ability instead');
    this.useAbilityForAllSelected(3);
};

// Initialize keyboard system
CyberOpsGame.prototype.initKeyboardHandler = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameKeyboard') : null;
    }
    if (this.logger) this.logger.debug('🎮 initKeyboardHandler STARTING...');

    const game = this;
    const dispatcher = this.gameServices.keyboardDispatcher;
    const keybindingService = this.gameServices.keybindingService;

    // Define ACTION HANDLERS - action name → function
    // All actions from KeybindingService are executed here
    this.actionHandlers = {
        // Agent Selection
        selectAgent1: () => this.selectAgentByNumber(0),
        selectAgent2: () => this.selectAgentByNumber(1),
        selectAgent3: () => this.selectAgentByNumber(2),
        selectAgent4: () => this.selectAgentByNumber(3),
        selectAgent5: () => this.selectAgentByNumber(4),
        selectAgent6: () => this.selectAgentByNumber(5),
        cycleAgents: () => this.cycleAgents(),
        selectAllAgents: () => this.selectAllSquad(),

        // Combat Actions
        fire: () => this.useAbilityForAllSelected(1),
        grenade: () => this.useAbilityForAllSelected(2),
        hack: () => this.handleInteractionKey(),
        shield: () => this.useAbilityForAllSelected(4),
        reload: () => { /* reload not implemented yet */ },
        stealth: () => this.toggle3DMode(), // E key - 3D mode toggle

        // Team Commands
        teamHold: () => this.setTeamMode('hold'),
        teamPatrol: () => this.setTeamMode('patrol'),
        teamFollow: () => this.setTeamMode('follow'),

        // View/Camera
        zoomIn: () => { if (this.adjustZoom) this.adjustZoom(0.1); },
        zoomOut: () => { if (this.adjustZoom) this.adjustZoom(-0.1); },
        centerCamera: () => { if (this.centerCameraOnAgents) this.centerCameraOnAgents(); },
        toggleSquadFollow: () => this.toggleSquadFollowing(),

        // UI Controls
        toggleEventLog: () => this.toggleEventLog(),
        toggleHotkeyHelp: () => this.toggleHotkeyHelp(),
        characterSheet: () => this.openCharacterSheet(),
        inventory: () => this.openInventory(),
        missionProgress: () => this.dialogEngine?.navigateTo('mission-progress'),

        // Debug
        togglePaths: () => this.togglePathVisualization(),
        togglePathfinding: () => this.togglePathfinding(),
        toggleFogOfWar: () => this.toggleFogOfWar(),

        // Game Control
        toggleTurnBasedMode: () => {
            if (this.currentScreen === 'game') {
                this.toggleTurnBasedMode();
            } else {
                this.togglePause();
            }
        },
        endTurn: () => { if (this.turnBasedMode && this.endTurn) this.endTurn(); },
        gridSnap: () => { if (this.toggleGridSnap) this.toggleGridSnap(); },
        cycleSpeed: () => { if (this.cycleGameSpeed) this.cycleGameSpeed(); },
        quickSave: () => { if (this.quickSave) this.quickSave(); },
        quickLoad: () => { if (this.quickLoad) this.quickLoad(); }
    };

    // Special keys not rebindable (only Escape and debug keys)
    this.specialKeyHandlers = {
        'Escape': () => {
            if (this.dialogEngine && this.dialogEngine.stateStack && this.dialogEngine.stateStack.length > 0) {
                return; // Let dialog system handle it
            }
            if (this.currentScreen === 'game') {
                this.dialogEngine.navigateTo('pause-menu');
            }
        },
        '0': () => {
            if (this.currentScreen === 'game' && this.gameServices.missionService) {
                this.gameServices.missionService.enableExtraction();
                this.addNotification('DEBUG: Extraction enabled!');
            }
        }
    };

    if (this.logger) this.logger.debug('🎮 Registering keyboard handlers with dispatcher...');

    // Register wildcard handler that looks up actions from KeybindingService
    dispatcher.registerHandler('GAME', '*', (e) => {
        // Skip if not in game screen (except for special keys)
        if (game.currentScreen !== 'game') {
            // Allow Escape and special keys even outside game screen
            if (e.key !== 'Escape' && !this.specialKeyHandlers[e.key]) {
                return false;
            }
        }

        // First check special key handlers (not in KeybindingService)
        const specialHandler = this.specialKeyHandlers[e.key];
        if (specialHandler) {
            specialHandler();
            return true;
        }

        // Look up action from KeybindingService
        const action = keybindingService.getActionByKey(e.key);
        if (action && this.actionHandlers[action]) {
            if (this.logger) this.logger.trace(`Key '${e.key}' → action '${action}'`);
            this.actionHandlers[action]();
            return true;
        }

        return false; // Let other handlers process
    });

    // Use dispatcher's key state tracking
    Object.defineProperty(this, 'keysPressed', {
        get: function() {
            const pressed = {};
            dispatcher.getPressedKeys().forEach(k => pressed[k] = true);
            return pressed;
        }
    });

    Object.defineProperty(this, 'keys3D', {
        get: function() {
            return dispatcher.get3DKeyState();
        }
    });

    if (this.logger) this.logger.info('✅ Keyboard handler initialized with KeybindingService integration');
};

// Helper: Open character sheet
CyberOpsGame.prototype.openCharacterSheet = function() {
    if (this.logger) this.logger.debug('📊 Opening character sheet...');

    let agentToShow = null;
    if (this.currentScreen === 'game') {
        agentToShow = this._selectedAgent;
    } else if (this.currentScreen === 'hub' || this.currentScreen === 'menu') {
        agentToShow = this.activeAgents?.[0] || null;
    }

    if (agentToShow) {
        const agentId = agentToShow.id || agentToShow.name || agentToShow;
        if (typeof agentId === 'string') {
            this._selectedAgent = this.agents?.find(a => a.id === agentId || a.name === agentId) ||
                                 this.activeAgents?.find(a => a.id === agentId || a.name === agentId);
        } else if (agentId && typeof agentId === 'object') {
            this._selectedAgent = agentId;
        }
        this.dialogEngine?.navigateTo('character');
    } else {
        if (this.logger) this.logger.warn('No agent available for character sheet');
    }
};

// Helper: Open inventory
CyberOpsGame.prototype.openInventory = function() {
    if (this.currentScreen === 'game' && this._selectedAgent) {
        if (this.logger) this.logger.debug('🎒 Opening inventory for:', this._selectedAgent.name);
        if (this.showInventory) {
            this.showInventory(this._selectedAgent.id || this._selectedAgent.name);
        }
    }
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
        // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
        const current = aliveAgents.findIndex(a => this.isAgentSelected(a));
        const next = (current + 1) % aliveAgents.length;
        this.selectAgent(aliveAgents[next]);
    }
};

CyberOpsGame.prototype.toggle3DMode = function() {
    // RESTORED ORIGINAL FUNCTIONALITY - Cycles through tactical/third/first modes
    if (this.logger) this.logger.debug('🔑 E key detected! Checking conditions...');
    if (this.logger) this.logger.debug('  - currentScreen:', this.currentScreen);
    if (this.logger) this.logger.debug('  - _selectedAgent exists:', !!this._selectedAgent);
    if (this.logger) this.logger.debug('  - _selectedAgent details:', this._selectedAgent ? this._selectedAgent.name : 'none');
    if (this.logger) this.logger.debug('  - 3D system available:', !!this.scene3D);

    // Only works in game screen
    if (this.currentScreen !== 'game') {
        if (this.logger) this.logger.debug('⚠️ Cannot toggle 3D mode - not in game screen');
        return;
    }

    // Initialize 3D system if needed
    if (!this.scene3D) {
        if (this.logger) this.logger.debug('🎮 Initializing 3D system first...');
        this.init3D();
    }

    // Auto-select first agent if none selected
    if (!this._selectedAgent && this.agents && this.agents.length > 0) {
        const firstAlive = this.agents.find(a => a.alive);
        if (firstAlive) {
            // Use setter to properly sync .selected flags
            this.selectedAgent = firstAlive;
            if (this.logger) this.logger.debug('🎯 Auto-selected first alive agent for E key:', firstAlive.name);
        }
    }

    if (this._selectedAgent && this.scene3D) {
        if (this.logger) this.logger.info('✅ All conditions met! Switching camera mode...');
        this.switchCameraMode();
    } else {
        if (this.logger) this.logger.debug('❌ Conditions not met for camera switch:');
        if (!this._selectedAgent) if (this.logger) this.logger.debug('  - No agent selected');
        if (!this.scene3D) if (this.logger) this.logger.debug('  - 3D system not available');
    }
};

CyberOpsGame.prototype.toggleSquadFollowing = function() {
    this.squadFollowing = this.squadFollowing !== false ? false : true;
    if (this.logger) this.logger.debug('👥 Squad Following:', this.squadFollowing ? 'ON' : 'OFF');
};

CyberOpsGame.prototype.togglePathVisualization = function() {
    this.showPaths = !this.showPaths;
    if (this.logger) this.logger.debug('🛤️ Path visualization:', this.showPaths ? 'ON' : 'OFF');
};

CyberOpsGame.prototype.togglePathfinding = function() {
    this.usePathfinding = !this.usePathfinding;
    if (this.logger) this.logger.debug('🧭 Pathfinding:', this.usePathfinding ? 'ON' : 'OFF');

    // Clear existing paths when toggling
    this.agents.forEach(agent => {
        agent.path = null;
        agent.lastTargetKey = null;
    });
};

CyberOpsGame.prototype.toggleHotkeyHelp = function() {
    this.showHotkeyHelp = !this.showHotkeyHelp;
    if (this.logger) this.logger.debug('❓ Hotkey help:', this.showHotkeyHelp ? 'SHOWN' : 'HIDDEN');
};

// Get current key bindings for display (from KeybindingService)
CyberOpsGame.prototype.getKeyBindingsDisplay = function() {
    const keybindingService = this.gameServices.keybindingService;
    const categories = keybindingService.getAllBindings();
    const result = {};

    const categoryLabels = {
        agents: 'Agent Control',
        combat: 'Combat',
        abilities: 'Abilities',
        team: 'Team Commands',
        movement: 'Movement',
        view: 'Camera & View',
        ui: 'User Interface',
        game: 'Game Control',
        debug: 'Debug'
    };

    for (const [category, bindings] of Object.entries(categories)) {
        const label = categoryLabels[category] || category;
        result[label] = bindings.map(b => ({
            key: b.key,
            action: b.description
        }));
    }

    // Add non-rebindable keys
    result['System'] = [
        { key: 'Esc', action: 'Pause Menu / Close Dialog' },
        { key: 'WASD', action: '3D Camera Movement' }
    ];

    return result;
};