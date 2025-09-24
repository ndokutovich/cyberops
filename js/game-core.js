// Game Engine - Core Constructor and Initialization
class CyberOpsGame {
    constructor() {
        this.logger = window.Logger ? new window.Logger("CyberOpsGame") : null;
        // Constants - will be loaded from campaign
        this.MUSIC_MENU_START_TIME = 10.6; // Default, overridden by campaign
        this.DEMOSCENE_IDLE_TIMEOUT = 15000; // Default, overridden by campaign
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize HUD elements
        this.gameHUD = document.getElementById('gameHUD');

        // Initialize canvas and core game state
        this.initializeCanvasAndState();

        // Initialize declarative dialog system
        if (typeof this.initializeDeclarativeDialogs === 'function') {
            this.initializeDeclarativeDialogs();
        }

        // Enable audio on first user interaction
        this.setupAudioInteraction();

        // Initialize audio volumes (0-1 range)
        this.masterVolume = 0.5;
        this.sfxVolume = 0.5;
        // Music volume now managed by declarative config

        // Game State
        this.currentScreen = 'splash';
        this.isPaused = false;
        this.currentMission = null;

        // Demoscene idle timer
        this.demosceneTimer = null;
        this.demosceneActive = false;

        // FPS counter
        this.fps = 0;
        this.frameCount = 0;
        this.lastFpsUpdate = Date.now();
        // Initialize services FIRST before any properties that use them
        this.gameServices = window.GameServices;

        // Initialize new architecture (GameEngine and GameFacade)
        if (window.GameController && window.GameEngine && window.GameFacade) {
            if (this.logger) this.logger.info('🏗️ Initializing new architecture...');
            this.gameController = new window.GameController(this);
        } else {
            if (this.logger) this.logger.error('❌ CRITICAL: New architecture not available!');
            throw new Error('GameController, GameEngine, or GameFacade not loaded');
        }

        this.currentMissionIndex = 0; // TODO: Move to MissionService
        this.missionTimer = 0; // TODO: Move to MissionService
        this.selectedAgents = [];
        this.totalCampaignTime = 0;
        this.totalEnemiesDefeated = 0;

        // Initialize services with default data if available
        if (this.gameServices) {
            if (this.gameServices.resourceService) {
                this.gameServices.resourceService.initialize({
                    credits: 10000,
                    researchPoints: 0,
                    worldControl: 0
                });
            }
            if (this.gameServices.agentService) {
                this.gameServices.agentService.initialize([]);
            }
            if (this.gameServices.gameStateService) {
                // Initialize auto-save system
                this.gameServices.gameStateService.initialize();
            }
        }

        // Hub Resources - ALL managed by services
        // NO fallback properties - services are the single source of truth
        this.weapons = [];
        this.equipment = [];
        this.completedResearch = [];

        // Intel System
        this.totalIntelCollected = 0;
        this.intelThisMission = 0;
        this.intelReports = [];
        this.intelByMission = {}; // Track intel per mission
        this.unlockedIntelReports = [];

        // EARLY INITIALIZE: Initialize missions immediately in constructor
        this.missions = [];
        if (this.logger) this.logger.info('🏗️ Early missions array initialized');

        // Isometric Settings - will be overridden by campaign
        this.tileWidth = 64; // Default, overridden by campaign
        this.tileHeight = 32; // Default, overridden by campaign
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        if (this.logger) this.logger.info('🎥 Camera initialized:', { cameraX: this.cameraX, cameraY: this.cameraY, tileWidth: this.tileWidth, tileHeight: this.tileHeight });

        // Input State
        this.touches = {};
        this.lastTouchDistance = 0;
        this.isDragging = false;
        this.mouseDown = false;

        // Game Objects
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.animatingTiles = [];

        // Map data
        this.map = null;

        // Fog of war system
        this.fogOfWar = null; // 2D array for fog state
        this.fogEnabled = true; // Toggle for fog of war visibility
        this.permanentFog = true; // If true, explored areas stay visible
        this.viewRadius = 8; // Base view radius for agents (doubled from 4)
        this.ghostViewBonus = 1.5; // Ghost agents see 50% further

        // 3D System
        this.scene3D = null;
        this.camera3D = null;
        this.renderer3D = null;
        this.canvas3D = null;
        this.container3D = document.getElementById('game3DContainer');
        this.hud3D = document.getElementById('game3DHUD');
        this.controls3D = null;
        this.is3DMode = false;
        this.cameraMode = 'tactical'; // 'tactical', 'isometric', 'third', 'first'

        // Track selectedAgent changes
        this._selectedAgent = null;
        if (this.logger) this.logger.info('🏗️ Constructor: _selectedAgent initialized as null');

        // CRITICAL: Add protection against accidental clearing
        this.selectionProtection = true;
        if (this.logger) this.logger.debug('🔧 selectionProtection set to:', this.selectionProtection);

        // Visual effects will be initialized by visual effects system

        // Game speed acceleration system
        this.gameSpeed = 1; // 1x, 2x, or 4x
        this.targetGameSpeed = 1; // Speed we're transitioning to
        this.speedTransitionTime = 0; // For smooth transitions
        this.autoSlowdownRange = 10; // Distance to detect enemies for auto-slowdown
        this.lastSpeedChangeTime = 0;
        this.speedIndicatorFadeTime = 0;

        // Sound effects - initialize early to prevent undefined errors
        this.soundEffects = {
            shoot: null,
            explosion: null,
            hack: null,
            shield: null,
            hit: null
        };

        this.keys3D = {
            W: false, A: false, S: false, D: false,
            mouse: { x: 0, y: 0, deltaX: 0, deltaY: 0 }
        };
        this.world3D = {
            agents: [],
            enemies: [],
            walls: [],
            terminals: [],
            ground: null
        };

        // Initialize pathfinding cache
        this.initPathCache();

        // NOW CALL THE INITIALIZATION FUNCTIONS IN THE CONSTRUCTOR
        if (this.logger) this.logger.debug('🔧 Initializing game systems...');

        // Initialize hub first (agents, equipment, etc.)
        if (this.logger) this.logger.debug('🏢 Setting up hub...');
        this.initializeHub();

        // Initialize mission system (required)
        if (this.logger) this.logger.debug('🆕 Initializing mission system...');
        if (this.initMissions) {
            this.initMissions();
        }

        // Initialize screen music system
        if (this.logger) this.logger.debug('🎵 Initializing screen music system...');
        if (this.initScreenMusicSystem) {
            this.initScreenMusicSystem();
        }

        // Initialize visual effects system
        if (this.logger) this.logger.debug('🎨 Initializing visual effects system...');
        if (this.initVisualEffects) {
            this.initVisualEffects();
        }

        if (this.logger) this.logger.info('✅ All systems initialized');

        // Initialize services with default data
        this.initializeServices();

        // Initialize equipment system
        if (this.logger) this.logger.debug('🔧 Initializing equipment system...');
        if (this.initializeEquipmentSystem) {
            this.initializeEquipmentSystem();
            if (this.logger) this.logger.info('✅ Equipment system initialized');
        }

        // Initialize 3D system - check if Three.js is loaded
        if (this.logger) this.logger.debug('🔍 Checking Three.js availability...');
        if (this.logger) this.logger.debug('- window.THREE exists:', !!window.THREE);
        if (this.logger) this.logger.debug('- typeof THREE:', typeof THREE);

        try {
            if (this.logger) this.logger.debug('🚀 About to call init3D()...');
            this.init3D();
            if (this.logger) this.logger.info('✅ init3D() call completed');
        } catch (error) {
            if (this.logger) this.logger.error('💥 ERROR in init3D():', error);
            if (this.logger) this.logger.error('Stack trace:', error.stack);
        }

        if (this.logger) this.logger.info('🏗️ Constructor completed - checking key data:');
        if (this.logger) this.logger.debug('- missions:', this.missions ? this.missions.length : 'undefined');
        if (this.logger) this.logger.debug('- activeAgents:', this.activeAgents ? this.activeAgents.length : 'undefined');
        if (this.logger) this.logger.info('- completedMissions:', this.completedMissions ? this.completedMissions.length : 'undefined');

        // CRITICAL CHECK: Make sure missions are really defined
        if (!this.missions) {
            if (this.logger) this.logger.error('🚨 CRITICAL ERROR: Constructor finished but this.missions is STILL undefined!');
            if (this.logger) this.logger.debug('🔧 Force calling initializeHub() again as emergency fix...');
            this.initializeHub();
        }
    }

    initializeCanvasAndState() {
        if (this.logger) this.logger.debug('🎨 Initializing canvas and game state');

        // Isometric Settings - already set above
        // this.tileWidth and this.tileHeight already initialized
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;

        // Input State
        this.touches = {};
        this.lastTouchDistance = 0;
        this.isDragging = false;
        this.mouseDown = false;

        // Game Objects
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.animatingTiles = [];

        // Audio system
        this.splashSkipped = false;
        this.audioEnabled = false;

        // Get canvas elements (already set in constructor)
        // this.canvas and this.ctx already initialized

        // Set initial canvas size
        this.resizeCanvas();

        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });

        if (this.logger) this.logger.info('✅ Canvas and game state initialized');
    }

    initializeAudio() {
        // Audio initialization now handled by game-audio.js and music systems
        if (this.logger) this.logger.debug('🎵 Audio initialization delegated to modular systems');
    }
} // Close the CyberOpsGame class

CyberOpsGame.prototype.loadMissionData = function() {
        if (this.logger) this.logger.info('📋 Loading mission data... (stub - missions loaded in initializeHub)');

        // Missions are now loaded in initializeHub() to ensure proper initialization order
        // This avoids conflicts between loadMissionData and initializeHub
}

CyberOpsGame.prototype.initializeHub = function() {
        if (this.logger) this.logger.debug('🏢 Initializing Syndicate Hub...');

        // Agents must be loaded from campaign
        if (!this.availableAgents || this.availableAgents.length === 0) {
            if (this.logger) this.logger.warn('⚠️ No agents loaded from campaign! Campaign content required.');
            this.availableAgents = [];
            this.activeAgents = [];
        }

        if (this.logger) this.logger.info('✅ Active agents:', this.activeAgents.length, 'agents hired');
        if (this.logger) this.logger.debug('🎯 Active agents:', this.activeAgents.map(a => a.name));

        // Weapons must be loaded from campaign
        if (!this.weapons || this.weapons.length === 0) {
            if (this.logger) this.logger.warn('⚠️ No weapons loaded from campaign! Campaign content required.');
            this.weapons = [];
        }

        // Equipment must be loaded from campaign
        if (!this.equipment || this.equipment.length === 0) {
            if (this.logger) this.logger.warn('⚠️ No equipment loaded from campaign! Campaign content required.');
            this.equipment = [];
        }

        // Missions will be loaded by campaign system
        // Initialize empty array here, will be populated by campaign-integration.js
        if (!this.missions || this.missions.length === 0) {
            this.missions = [];
            if (this.logger) this.logger.info('📋 Missions array initialized, waiting for campaign system to populate');
        }

        if (this.logger) this.logger.info('🏢 Hub initialized successfully:', {
            availableAgents: this.availableAgents.length,
            activeAgents: this.activeAgents.length,
            weapons: this.weapons.length,
            equipment: this.equipment.length,
            missions: this.missions.length
        });

        if (this.logger) this.logger.info('✅ MISSIONS CHECK: this.missions is now', this.missions ? 'DEFINED' : 'STILL UNDEFINED');
}

CyberOpsGame.prototype.init = function() {
        this.setupEventListeners();
        this.initializeAudio();

        // Initialize RPG system
        if (this.initRPGSystem) {
            this.initRPGSystem();
            if (this.logger) this.logger.info('✅ RPG system initialized in core');
        } else {
            if (this.logger) this.logger.warn('⚠️ RPG system not found during initialization');
        }

        // Initialize turn-based mode system
        if (this.initTurnBasedMode) {
            this.initTurnBasedMode();
        }

        // Hide all game screens initially
        document.getElementById('mainMenu').style.display = 'none';
        document.querySelectorAll('.splash-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Initialize screen manager
        if (window.screenManager) {
            window.screenManager.init(this);
        }

        // Set up the initial START EXPERIENCE screen
        const initialScreen = document.getElementById('initialScreen');
        const resetButton = document.getElementById('resetButton');

        if (initialScreen && resetButton) {
            // Make sure initial screen is visible
            initialScreen.style.display = 'flex';

            // Set up button click handler
            resetButton.onclick = () => {
                if (this.logger) this.logger.debug('🚀 START EXPERIENCE clicked - enabling audio and starting game');

                // Enable audio context on user interaction
                this.enableAudio();

                // Hide the initial screen
                initialScreen.style.display = 'none';

                // Start the ScreenManager flow with splash screen
                if (window.screenManager) {
                    if (this.logger) this.logger.debug('📺 Navigating to splash screen');
                    window.screenManager.navigateTo('splash');
                } else {
                    if (this.logger) this.logger.error('Screen manager not available!');
                }
            };
        } else {
            // Fallback if initial screen not found
            if (this.logger) this.logger.warn('⚠️ Initial screen not found, starting directly with splash');
            setTimeout(() => {
                if (window.screenManager) {
                    window.screenManager.navigateTo('splash');
                }
            }, 100);
        }

        // Add debug info for game state
        setInterval(() => {
            if (this.currentScreen === 'game') {
                if (this.logger) this.logger.debug('🎮 Game state check - Selected agent:', this._selectedAgent ? this._selectedAgent.name : 'none',
                           'Screen:', this.currentScreen, 'Total agents:', this.agents?.length || 0, 'Alive agents:',
                           this.agents?.filter(a => a.alive).length || 0);
            }
        }, 5000); // Log every 5 seconds when in game

        // START NEW ARCHITECTURE GAME LOOP
        if (this.gameController) {
            if (this.logger) this.logger.info('🚀 Starting game loop via GameController');
            this.gameController.start();
        } else {
            if (this.logger) this.logger.error('❌ GameController not initialized! Cannot start game.');
        }
}

CyberOpsGame.prototype.setupCanvas = function() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Ensure canvas doesn't block HUD elements
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '1'; // Behind HUD elements

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
}

// Initialize services with game data
CyberOpsGame.prototype.initializeServices = function() {
    if (!this.gameServices) {
        if (this.logger) this.logger.error('❌ GameServices not available during initialization');
        return;
    }

    // Initialize ResourceService with current values
    this.gameServices.resourceService.initialize({
        credits: this._credits || 10000,
        researchPoints: this._researchPoints || 0,
        worldControl: this._worldControl || 0
    });

    // Initialize AgentService with campaign agents (if loaded)
    if (this._availableAgents || this._activeAgents) {
        const campaignAgents = [];

        // Add available agents
        if (this._availableAgents) {
            this._availableAgents.forEach(agent => {
                campaignAgents.push({ ...agent, hired: false });
            });
        }

        // Add active agents
        if (this._activeAgents) {
            this._activeAgents.forEach(agent => {
                campaignAgents.push({ ...agent, hired: true });
            });
        }

        // Add fallen agents
        if (this._fallenAgents) {
            this._fallenAgents.forEach(agent => {
                campaignAgents.push({ ...agent, hired: true, alive: false });
            });
        }

        this.gameServices.agentService.initialize(campaignAgents);
    }

    if (this.logger) this.logger.info('✅ Services initialized with game data');
}

// Define compatibility layer properties for backward compatibility
// These delegate to the services when available, fallback to internal properties
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    get: function() {
        if (!this.gameServices || !this.gameServices.resourceService) return 0;
        return this.gameServices.resourceService.get('credits');
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.resourceService) return;
        this.gameServices.resourceService.set('credits', value, 'direct assignment');
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'researchPoints', {
    get: function() {
        if (!this.gameServices || !this.gameServices.resourceService) return 0;
        return this.gameServices.resourceService.get('researchPoints');
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.resourceService) return;
        this.gameServices.resourceService.set('researchPoints', value, 'direct assignment');
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'worldControl', {
    get: function() {
        if (!this.gameServices || !this.gameServices.resourceService) return 0;
        return this.gameServices.resourceService.get('worldControl');
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.resourceService) return;
        this.gameServices.resourceService.set('worldControl', value, 'direct assignment');
    },
    enumerable: true,
    configurable: true
});

// Inventory-related properties that delegate to InventoryService
Object.defineProperty(CyberOpsGame.prototype, 'weapons', {
    get: function() {
        if (!this.gameServices || !this.gameServices.inventoryService) return [];
        return this.gameServices.inventoryService.getWeapons();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.inventoryService) return;
        // For bulk assignment during initialization
        if (Array.isArray(value)) {
            this.gameServices.inventoryService.inventory.weapons = value;
        }
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'equipment', {
    get: function() {
        if (!this.gameServices || !this.gameServices.inventoryService) return [];
        return this.gameServices.inventoryService.getEquipment();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.inventoryService) return;
        // For bulk assignment during initialization
        if (Array.isArray(value)) {
            // Split equipment into armor and utility
            const armor = value.filter(e => e.type === 'armor');
            const utility = value.filter(e => e.type !== 'armor');
            this.gameServices.inventoryService.inventory.armor = armor;
            this.gameServices.inventoryService.inventory.utility = utility;
        }
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'agentLoadouts', {
    get: function() {
        if (!this.gameServices || !this.gameServices.inventoryService) return {};
        return this.gameServices.inventoryService.getAllLoadouts();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.inventoryService) return;
        // For bulk assignment
        if (typeof value === 'object') {
            this.gameServices.inventoryService.agentLoadouts = value;
        }
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'availableAgents', {
    get: function() {
        if (!this.gameServices || !this.gameServices.agentService) return [];
        return this.gameServices.agentService.getAvailableAgents();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.agentService) return;
        // For bulk assignment, reinitialize the service
        if (Array.isArray(value)) {
            const allAgents = [];
            value.forEach(agent => {
                allAgents.push({ ...agent, hired: false });
            });
            // Add existing active agents
            const active = this.gameServices.agentService.getActiveAgents();
            active.forEach(agent => {
                allAgents.push({ ...agent, hired: true });
            });
            this.gameServices.agentService.initialize(allAgents);
        }
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'activeAgents', {
    get: function() {
        if (!this.gameServices || !this.gameServices.agentService) return [];
        return this.gameServices.agentService.getActiveAgents();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.agentService) return;
        // For bulk assignment, reinitialize the service
        if (Array.isArray(value)) {
            const allAgents = [];
            // Add existing available agents
            const available = this.gameServices.agentService.getAvailableAgents();
            available.forEach(agent => {
                allAgents.push({ ...agent, hired: false });
            });
            // Add new active agents
            value.forEach(agent => {
                allAgents.push({ ...agent, hired: true });
            });
            this.gameServices.agentService.initialize(allAgents);
        }
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'fallenAgents', {
    get: function() {
        if (!this.gameServices || !this.gameServices.agentService) return [];
        return this.gameServices.agentService.getFallenAgents();
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.agentService) return;
        // Fallen agents are managed internally by the service
        // Setting fallen agents requires re-initializing with proper state
        if (value && Array.isArray(value)) {
            const currentState = this.gameServices.agentService.exportState();
            currentState.fallenAgents = value;
            this.gameServices.agentService.importState(currentState);
        }
    },
    enumerable: true,
    configurable: true
});

// Mission-related compatibility properties
Object.defineProperty(CyberOpsGame.prototype, 'completedMissions', {
    get: function() {
        if (!this.gameServices || !this.gameServices.missionService) return [];
        return this.gameServices.missionService.completedMissions;
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.missionService) return;
        this.gameServices.missionService.completedMissions = value;
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'missionTrackers', {
    get: function() {
        if (!this.gameServices || !this.gameServices.missionService) return {};
        return this.gameServices.missionService.trackers;
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.missionService) return;
        Object.assign(this.gameServices.missionService.trackers, value);
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'extractionEnabled', {
    get: function() {
        if (!this.gameServices || !this.gameServices.missionService) return false;
        return this.gameServices.missionService.extractionEnabled;
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.missionService) return;
        this.gameServices.missionService.extractionEnabled = value;
    },
    enumerable: true,
    configurable: true
});

Object.defineProperty(CyberOpsGame.prototype, 'currentMissionDef', {
    get: function() {
        if (!this.gameServices || !this.gameServices.missionService) return null;
        return this.gameServices.missionService.currentMission;
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.missionService) return;
        this.gameServices.missionService.currentMission = value;
    },
    enumerable: true,
    configurable: true
});

// Quest-related compatibility (NPCs still manage quest dialog)
Object.defineProperty(CyberOpsGame.prototype, 'completedQuests', {
    get: function() {
        if (!this.gameServices || !this.gameServices.missionService) return new Set();
        return this.gameServices.missionService.completedQuests;
    },
    set: function(value) {
        if (!this.gameServices || !this.gameServices.missionService) return;
        if (value instanceof Set) {
            this.gameServices.missionService.completedQuests = value;
        } else if (Array.isArray(value)) {
            this.gameServices.missionService.completedQuests = new Set(value);
        }
    },
    enumerable: true,
    configurable: true
});

// ============================================
// METHOD STUBS - Backward compatibility layer
// These were in game-loop.js, now moved here for compatibility
// ============================================

// Mission-related stubs that delegate to MissionService
CyberOpsGame.prototype.checkMissionStatus = function() {
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.checkMissionStatus(this);
    }
};

CyberOpsGame.prototype.checkExtractionPoint = function() {
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.checkExtractionPoint(this);
    }
};

CyberOpsGame.prototype.endMission = function(victory) {
    if (this.gameServices && this.gameServices.missionService) {
        this.gameServices.missionService.endMission(this, victory);
    }
};

CyberOpsGame.prototype.unlockIntelReport = function() {
    const totalIntel = this.totalIntelCollected || 0;
    if (this.gameServices && this.gameServices.missionService) {
        const unlocked = this.gameServices.missionService.unlockIntelReports(totalIntel, this.unlockedIntelReports);
        if (unlocked && unlocked.length > 0) {
            this.unlockedIntelReports = this.unlockedIntelReports || [];
            for (const report of unlocked) {
                if (!this.unlockedIntelReports.includes(report)) {
                    this.unlockedIntelReports.push(report);
                }
            }
        }
    }
};

CyberOpsGame.prototype.generateFinalWords = function(agentName) {
    if (this.gameServices && this.gameServices.missionService) {
        return this.gameServices.missionService.generateFinalWords(agentName);
    }
    return "";
};

CyberOpsGame.prototype.generateNewAgentsForHire = function() {
    const agentPool = this.agentGeneration || window.ContentLoader?.getContent('agents') || null;
    const completedMissionCount = this.completedMissions ? this.completedMissions.length : 0;
    const currentAgentCount = this.availableAgents ? this.availableAgents.length : 0;

    if (this.gameServices && this.gameServices.missionService) {
        const newAgents = this.gameServices.missionService.generateNewAgentsForHire(
            agentPool,
            completedMissionCount,
            currentAgentCount
        );

        if (newAgents && newAgents.length > 0) {
            if (!this.availableAgents) this.availableAgents = [];
            this.availableAgents.push(...newAgents);

            if (this.logEvent && newAgents.length > 0) {
                this.logEvent(`🆕 ${newAgents.length} new agents are available for hire at the Hub!`, 'system');
            }
        }
    }
};

// Item-related stubs that delegate to ItemService
CyberOpsGame.prototype.handleCollectablePickup = function(agent, item) {
    if (!this.gameServices || !this.gameServices.itemService) return;

    const context = {
        missionId: this.currentMission ? this.currentMission.id : null,
        difficulty: this.currentDifficulty || 1,
        averageHealth: this.calculateAverageHealth(),
        lowAmmo: this.isLowOnAmmo()
    };

    const result = this.gameServices.itemService.handleCollectablePickup(agent, item, context);

    if (result && result.notifications) {
        result.notifications.forEach(msg => this.addNotification(msg));
    }

    if (result && result.success) {
        const effect = this.gameServices.itemService.createPickupEffect(item.x, item.y, item.type);
        this.effects.push(effect);
    }

    if (result && result.effects && result.effects.keycardType) {
        this.keycards = this.keycards || [];
        this.keycards.push(result.effects.keycardType);
    }
};

CyberOpsGame.prototype.handleCollectableEffects = function(agent, item) {
    if (!this.gameServices || !this.gameServices.itemService) return;

    const context = {
        missionId: this.currentMission ? this.currentMission.id : null,
        difficulty: this.currentDifficulty || 1,
        averageHealth: this.calculateAverageHealth(),
        lowAmmo: this.isLowOnAmmo()
    };

    this.gameServices.itemService.handleCollectableEffects(agent, item, context);
};

CyberOpsGame.prototype.calculateAverageHealth = function() {
    if (this.gameServices && this.gameServices.itemService) {
        return this.gameServices.itemService.calculateAverageHealth(this.agents);
    }
    return 100;
};

CyberOpsGame.prototype.isLowOnAmmo = function() {
    if (this.gameServices && this.gameServices.itemService) {
        return this.gameServices.itemService.isTeamLowOnAmmo(this.agents);
    }
    return false;
};

// Speed control stubs that delegate to GameController
CyberOpsGame.prototype.setGameSpeed = function(speed) {
    if (this.gameController) {
        this.gameController.setGameSpeed(speed);
    }
};

CyberOpsGame.prototype.cycleGameSpeed = function() {
    if (this.gameController) {
        this.gameController.cycleGameSpeed();
    }
};

CyberOpsGame.prototype.checkAutoSlowdown = function() {
    if (this.gameController) {
        this.gameController.checkAutoSlowdown();
    }
};

// FPS update stub that delegates to GameEngine
CyberOpsGame.prototype.updateFPS = function() {
    if (this.gameEngine && this.gameEngine.updateFPS) {
        this.gameEngine.updateFPS();
    }
};

// Movement validation stubs that delegate to GameFacade
CyberOpsGame.prototype.isWalkable = function(x, y) {
    if (window.gameFacade) {
        return window.gameFacade.isWalkable(x, y);
    }
    return false;
};

CyberOpsGame.prototype.canMoveTo = function(fromX, fromY, toX, toY) {
    if (window.gameFacade) {
        return window.gameFacade.canMoveTo(fromX, fromY, toX, toY);
    }
    return false;
};

CyberOpsGame.prototype.isDoorBlocking = function(x, y) {
    if (window.gameFacade) {
        return window.gameFacade.isDoorBlocking(x, y);
    }
    return false;
};