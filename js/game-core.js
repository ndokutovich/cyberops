// Game Engine - Core Constructor and Initialization
class CyberOpsGame {
    constructor() {
        // Constants
        this.MUSIC_MENU_START_TIME = 10.6; // Exact duration when splash screens end and menu music should start
        this.DEMOSCENE_IDLE_TIMEOUT = 15000; // 15 seconds of idle time before demoscene starts
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Initialize HUD elements
        this.gameHUD = document.getElementById('gameHUD');

        // Initialize canvas and core game state
        this.initializeCanvasAndState();

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
        this.currentMissionIndex = 0;
        this.missionTimer = 0;
        this.selectedAgents = [];
        this.completedMissions = [];
        this.totalCampaignTime = 0;
        this.totalEnemiesDefeated = 0;

        // Hub Resources
        this.credits = 5000;
        this.researchPoints = 150;
        this.worldControl = 15;
        this.availableAgents = [];
        this.activeAgents = [];
        this.fallenAgents = []; // Hall of Glory - agents who died in missions
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
        console.log('🏗️ Early missions array initialized');

        // Isometric Settings - CRITICAL: Initialize camera here to prevent NaN
        this.tileWidth = 64;
        this.tileHeight = 32;
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1;
        console.log('🎥 Camera initialized:', { cameraX: this.cameraX, cameraY: this.cameraY, tileWidth: this.tileWidth, tileHeight: this.tileHeight });

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
        console.log('🏗️ Constructor: _selectedAgent initialized as null');

        // CRITICAL: Add protection against accidental clearing
        this.selectionProtection = true;
        console.log('🔧 selectionProtection set to:', this.selectionProtection);

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
        console.log('🔧 Initializing game systems...');

        // Initialize hub first (agents, equipment, etc.)
        console.log('🏢 Setting up hub...');
        this.initializeHub();

        // Initialize mission system (required)
        console.log('🆕 Initializing mission system...');
        if (this.initMissions) {
            this.initMissions();
        }

        // Initialize screen music system
        console.log('🎵 Initializing screen music system...');
        if (this.initScreenMusicSystem) {
            this.initScreenMusicSystem();
        }

        // Initialize visual effects system
        console.log('🎨 Initializing visual effects system...');
        if (this.initVisualEffects) {
            this.initVisualEffects();
        }

        console.log('✅ All systems initialized');

        // Initialize equipment system
        console.log('🔧 Initializing equipment system...');
        if (this.initializeEquipmentSystem) {
            this.initializeEquipmentSystem();
            console.log('✅ Equipment system initialized');
        }

        // Initialize 3D system - check if Three.js is loaded
        console.log('🔍 Checking Three.js availability...');
        console.log('- window.THREE exists:', !!window.THREE);
        console.log('- typeof THREE:', typeof THREE);

        try {
            console.log('🚀 About to call init3D()...');
            this.init3D();
            console.log('✅ init3D() call completed');
        } catch (error) {
            console.error('💥 ERROR in init3D():', error);
            console.error('Stack trace:', error.stack);
        }

        console.log('🏗️ Constructor completed - checking key data:');
        console.log('- missions:', this.missions ? this.missions.length : 'undefined');
        console.log('- activeAgents:', this.activeAgents ? this.activeAgents.length : 'undefined');
        console.log('- completedMissions:', this.completedMissions ? this.completedMissions.length : 'undefined');

        // CRITICAL CHECK: Make sure missions are really defined
        if (!this.missions) {
            console.error('🚨 CRITICAL ERROR: Constructor finished but this.missions is STILL undefined!');
            console.log('🔧 Force calling initializeHub() again as emergency fix...');
            this.initializeHub();
        }
    }

    initializeCanvasAndState() {
        console.log('🎨 Initializing canvas and game state');

        // Isometric Settings
        this.tileWidth = 64;
        this.tileHeight = 32;
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

        console.log('✅ Canvas and game state initialized');
    }

    initializeAudio() {
        // Audio initialization now handled by game-audio.js and music systems
        console.log('🎵 Audio initialization delegated to modular systems');
    }
} // Close the CyberOpsGame class

CyberOpsGame.prototype.loadMissionData = function() {
        console.log('📋 Loading mission data... (stub - missions loaded in initializeHub)');

        // Missions are now loaded in initializeHub() to ensure proper initialization order
        // This avoids conflicts between loadMissionData and initializeHub
}

CyberOpsGame.prototype.initializeHub = function() {
        console.log('🏢 Initializing Syndicate Hub...');

        // Only initialize with defaults if not loaded from campaign
        if (!this.availableAgents || this.availableAgents.length === 0) {
            console.log('📋 No campaign agents loaded, using defaults');
            // Initialize available agents with skills - 4 hired, 2 available for hire
            this.availableAgents = [
                { id: 1, name: 'Alex "Shadow" Chen', specialization: 'stealth', skills: ['stealth', 'melee'], cost: 1000, hired: true, health: 90, speed: 5, damage: 18 },
                { id: 2, name: 'Maya "Code" Rodriguez', specialization: 'hacker', skills: ['hacker', 'electronics'], cost: 1200, hired: true, health: 70, speed: 4, damage: 12 },
                { id: 3, name: 'Jake "Tank" Morrison', specialization: 'assault', skills: ['assault', 'heavy_weapons'], cost: 1100, hired: true, health: 140, speed: 3, damage: 25 },
                { id: 4, name: 'Lisa "Ghost" Park', specialization: 'sniper', skills: ['sniper', 'stealth'], cost: 1300, hired: true, health: 85, speed: 4, damage: 35 },
                { id: 5, name: 'Rico "Boom" Santos', specialization: 'demolition', skills: ['demolition', 'assault'], cost: 1250, hired: false, health: 110, speed: 3, damage: 22 },
                { id: 6, name: 'Zoe "Wire" Kim', specialization: 'hacker', skills: ['hacker', 'drone_control'], cost: 1400, hired: false, health: 75, speed: 4, damage: 15 }
            ];

            // Set up initial active agents (first 4 hired) - restore original 4 agents
            this.activeAgents = this.availableAgents.filter(agent => agent.hired);
        }

        console.log('✅ Active agents:', this.activeAgents.length, 'agents hired');
        console.log('🎯 Active agents:', this.activeAgents.map(a => a.name));

        // Only initialize with defaults if not loaded from campaign
        if (!this.weapons || this.weapons.length === 0) {
            console.log('📋 No campaign weapons loaded, using defaults');
            // Initialize weapons
            this.weapons = [
                { id: 1, name: 'Silenced Pistol', type: 'weapon', cost: 500, owned: 3, damage: 15 },
                { id: 2, name: 'Assault Rifle', type: 'weapon', cost: 800, owned: 1, damage: 25 },
                { id: 3, name: 'Sniper Rifle', type: 'weapon', cost: 1200, owned: 0, damage: 40 },
                { id: 4, name: 'SMG', type: 'weapon', cost: 600, owned: 2, damage: 20 }
            ];
        }

        // Only initialize with defaults if not loaded from campaign
        if (!this.equipment || this.equipment.length === 0) {
            console.log('📋 No campaign equipment loaded, using defaults');
            this.equipment = [
                { id: 1, name: 'Body Armor', type: 'equipment', cost: 300, owned: 3, protection: 10 },
                { id: 2, name: 'Hacking Kit', type: 'equipment', cost: 400, owned: 2, hackBonus: 20 },
                { id: 3, name: 'Explosives Kit', type: 'equipment', cost: 600, owned: 1, damage: 50 },
                { id: 4, name: 'Stealth Suit', type: 'equipment', cost: 800, owned: 1, stealthBonus: 25 }
            ];
        }

        // Missions will be loaded by campaign system
        // Initialize empty array here, will be populated by campaign-integration.js
        if (!this.missions || this.missions.length === 0) {
            this.missions = [];
            console.log('📋 Missions array initialized, waiting for campaign system to populate');
        }

        console.log('🏢 Hub initialized successfully:', {
            availableAgents: this.availableAgents.length,
            activeAgents: this.activeAgents.length,
            weapons: this.weapons.length,
            equipment: this.equipment.length,
            missions: this.missions.length
        });

        console.log('✅ MISSIONS CHECK: this.missions is now', this.missions ? 'DEFINED' : 'STILL UNDEFINED');
}

CyberOpsGame.prototype.init = function() {
        this.setupEventListeners();
        this.initializeAudio();

        // Hide all game screens initially
        document.getElementById('mainMenu').style.display = 'none';
        document.querySelectorAll('.splash-screen').forEach(screen => {
            screen.style.display = 'none';
        });

        // Show initial start screen first
        if (this.showInitialScreen) {
            this.showInitialScreen();
        } else {
            console.warn('showInitialScreen not yet loaded, skipping initial screen');
        }

        // Add debug info for game state
        setInterval(() => {
            if (this.currentScreen === 'game') {
                console.log('🎮 Game state check - Selected agent:', this._selectedAgent ? this._selectedAgent.name : 'none',
                           'Screen:', this.currentScreen, 'Total agents:', this.agents?.length || 0, 'Alive agents:',
                           this.agents?.filter(a => a.alive).length || 0);
            }
        }, 5000); // Log every 5 seconds when in game
        this.gameLoop();
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