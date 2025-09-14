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
        this.setupCanvas();

        // Enable audio on first user interaction
        this.setupAudioInteraction();

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

        // Screen effects (shake, freeze, etc.)
        this.screenShake = {
            active: false,
            intensity: 0,
            duration: 0,
            offsetX: 0,
            offsetY: 0
        };
        this.freezeEffect = {
            active: false,
            duration: 0,
            startTime: 0
        };

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
        console.log('🔧 About to call setupCanvas()...');
        this.setupCanvas();
        console.log('✅ setupCanvas() completed');

        console.log('🔧 About to call loadMissionData()...');
        this.loadMissionData();
        console.log('✅ loadMissionData() completed');

        console.log('🔧 About to call initializeHub()...');
        this.initializeHub();
        console.log('✅ initializeHub() completed');

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

    setupCanvas() {
        console.log('🎨 setupCanvas() - setting up canvas and game state');

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
        this.gameAudio = null;
        this.levelMusicElements = {};
        this.currentLevelMusic = null;
        this.currentLevelMusicElement = null;
        this.creditsAudio = null;
        this.creditsPlaying = false;
        this.levelMusicNode = null;
        this.creditsMusicNode = null;
        this.levelMusicInterval = null;
        this.splashSkipped = false;
        this.audioEnabled = false;
        this.audioElementsInitialized = false;

        // Get canvas elements
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Set canvas size
        this.resizeCanvas();

        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });

        console.log('✅ setupCanvas() internal work completed');
    }

    initializeAudio() {
        console.log('🎵 Initializing audio system...');

        // Initialize HTML5 audio elements
        this.gameAudio = document.getElementById('gameMusic');
        this.creditsAudio = document.getElementById('creditsMusic');

        // Initialize level music elements
        this.levelMusicElements = {};
        for (let i = 1; i <= 5; i++) {
            this.levelMusicElements[i] = document.getElementById(`levelMusic${i}`);
        }

        // Initialize sound effects
        this.soundEffects.shoot = document.getElementById('shootSound');
        this.soundEffects.explosion = document.getElementById('explosionSound');
        this.soundEffects.hack = document.getElementById('hackSound');
        this.soundEffects.shield = document.getElementById('shieldSound');
        this.soundEffects.hit = document.getElementById('hitSound');

        console.log('🔍 Audio elements initialized:');
        console.log('- gameAudio:', !!this.gameAudio);
        console.log('- creditsAudio:', !!this.creditsAudio);
        console.log('- levelMusicElements count:', Object.keys(this.levelMusicElements).length);
        console.log('- soundEffects loaded:', Object.keys(this.soundEffects).filter(k => this.soundEffects[k]).length);

        // Check for saved audio permission
        const savedPermission = sessionStorage.getItem('cyberops_audio_enabled');
        if (savedPermission === 'true') {
            console.log('Audio permission found in session, enabling immediately...');
            this.audioEnabled = true;
            this.enableAudioOnInteraction();
        }
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
} // Close the CyberOpsGame class

CyberOpsGame.prototype.loadMissionData = function() {
        console.log('📋 Loading mission data... (stub - missions loaded in initializeHub)');

        // Missions are now loaded in initializeHub() to ensure proper initialization order
        // This avoids conflicts between loadMissionData and initializeHub
}

CyberOpsGame.prototype.initializeHub = function() {
        console.log('🏢 Initializing Syndicate Hub...');

        // Initialize available agents with skills
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

        console.log('✅ Active agents restored:', this.activeAgents.length, 'agents hired');
        console.log('🎯 Active agents:', this.activeAgents.map(a => a.name));

        // Initialize weapons and equipment
        this.weapons = [
            { id: 1, name: 'Silenced Pistol', type: 'weapon', cost: 500, owned: 3, damage: 15 },
            { id: 2, name: 'Assault Rifle', type: 'weapon', cost: 800, owned: 1, damage: 25 },
            { id: 3, name: 'Sniper Rifle', type: 'weapon', cost: 1200, owned: 0, damage: 40 },
            { id: 4, name: 'SMG', type: 'weapon', cost: 600, owned: 2, damage: 20 }
        ];

        this.equipment = [
            { id: 1, name: 'Body Armor', type: 'equipment', cost: 300, owned: 3, protection: 10 },
            { id: 2, name: 'Hacking Kit', type: 'equipment', cost: 400, owned: 2, hackBonus: 20 },
            { id: 3, name: 'Explosives Kit', type: 'equipment', cost: 600, owned: 1, damage: 50 },
            { id: 4, name: 'Stealth Suit', type: 'equipment', cost: 800, owned: 1, stealthBonus: 25 }
        ];

        // Update missions with expanded content (restore 5 missions instead of 2)
        this.missions = [
            {
                id: 1,
                title: 'Data Heist',
                description: 'Infiltrate SecureCorp and steal critical data while avoiding detection.',
                map: 'corporate',
                enemies: 8,
                objectives: ['Eliminate all hostiles', 'Avoid civilian casualties', 'Keep at least 2 agents alive'],
                requiredSkills: [],
                rewards: { credits: 2000, researchPoints: 50, worldControl: 5 }
            },
            {
                id: 2,
                title: 'Network Breach',
                description: 'Hack into government systems and extract classified information.',
                map: 'government',
                enemies: 6,
                objectives: ['Hack all terminals', 'Extract data', 'Escape undetected'],
                requiredSkills: ['hacker'],
                rewards: { credits: 2500, researchPoints: 75, worldControl: 8 }
            },
            {
                id: 3,
                title: 'Sabotage Operation',
                description: 'Infiltrate industrial facility and sabotage critical infrastructure.',
                map: 'industrial',
                enemies: 10,
                objectives: ['Plant explosives on 3 targets', 'Eliminate security team', 'Extract all agents'],
                requiredSkills: ['demolition'],
                rewards: { credits: 3000, researchPoints: 100, worldControl: 10 }
            },
            {
                id: 4,
                title: 'Assassination Contract',
                description: 'Eliminate high-value targets while maintaining stealth and precision.',
                map: 'residential',
                enemies: 12,
                objectives: ['Eliminate primary target', 'Eliminate secondary targets', 'No witnesses'],
                requiredSkills: ['sniper'],
                rewards: { credits: 4000, researchPoints: 125, worldControl: 12 }
            },
            {
                id: 5,
                title: 'Final Convergence',
                description: 'Assault the Syndicate\'s main headquarters and seize control.',
                map: 'fortress',
                enemies: 15,
                objectives: ['Breach main gate', 'Control all sectors', 'Capture the mainframe'],
                requiredSkills: ['hacker', 'assault', 'demolition'],
                rewards: { credits: 5000, researchPoints: 200, worldControl: 25 }
            }
        ];

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
        this.showInitialScreen();

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

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
}