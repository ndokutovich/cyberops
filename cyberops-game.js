// Game Engine
class CyberOpsGame {
    constructor() {
        // Constants
        this.MUSIC_MENU_START_TIME = 10.6; // Exact duration when splash screens end and menu music should start
        this.DEMOSCENE_IDLE_TIMEOUT = 15000; // 15 seconds of idle time before demoscene starts
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
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
        this.weapons = [];
        this.equipment = [];
        
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
        this.map = null;
        
        // Mission Data
        this.missions = [
            {
                id: 1,
                title: "First Strike",
                description: "Intelligence has identified a rogue AI facility in the industrial sector. Your mission is to infiltrate the compound and eliminate all hostile units.",
                objectives: [
                    "Eliminate all enemy units",
                    "Reach the extraction point",
                    "Keep at least 2 agents alive"
                ],
                map: this.generateMap1(),
                enemies: 5,
                difficulty: 'easy'
            },
            {
                id: 2,
                title: "Data Heist",
                description: "A corporate data center contains critical intelligence on Project Nexus. Infiltrate the facility, hack the mainframe, and extract.",
                objectives: [
                    "Hack 3 terminals",
                    "Reach the extraction point",
                    "Optional: Remain undetected"
                ],
                map: this.generateMap2(),
                enemies: 8,
                difficulty: 'medium'
            }
        ];
        
        // Agent Templates
        this.agentTemplates = [
            { name: "Ghost", health: 100, speed: 5, damage: 25, ability: "cloak" },
            { name: "Tank", health: 150, speed: 3, damage: 20, ability: "shield" },
            { name: "Hacker", health: 80, speed: 4, damage: 15, ability: "hack" },
            { name: "Assault", health: 100, speed: 4, damage: 30, ability: "burst" }
        ];
        
        this.initializeHub();
        this.init();
    }
    
    initializeHub() {
        // Initialize available agents with skills
        this.availableAgents = [
            { id: 1, name: 'Alex "Shadow" Chen', specialization: 'stealth', skills: ['stealth', 'melee'], cost: 1000, hired: true, health: 90, speed: 5, damage: 18 },
            { id: 2, name: 'Maya "Code" Rodriguez', specialization: 'hacker', skills: ['hacker', 'electronics'], cost: 1200, hired: true, health: 70, speed: 4, damage: 12 },
            { id: 3, name: 'Jake "Tank" Morrison', specialization: 'assault', skills: ['assault', 'heavy_weapons'], cost: 1100, hired: true, health: 140, speed: 3, damage: 25 },
            { id: 4, name: 'Lisa "Ghost" Park', specialization: 'sniper', skills: ['sniper', 'stealth'], cost: 1300, hired: false, health: 85, speed: 4, damage: 35 },
            { id: 5, name: 'Rico "Boom" Santos', specialization: 'demolition', skills: ['demolition', 'assault'], cost: 1250, hired: false, health: 110, speed: 3, damage: 22 },
            { id: 6, name: 'Zoe "Wire" Kim', specialization: 'hacker', skills: ['hacker', 'drone_control'], cost: 1400, hired: false, health: 75, speed: 4, damage: 15 }
        ];
        
        // Set up initial active agents (first 4 hired) - restore original 4 agents
        this.availableAgents[3].hired = true; // Hire the 4th agent (Lisa "Ghost" Park)
        this.activeAgents = this.availableAgents.filter(agent => agent.hired);
        
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
        
        // Update missions with expanded content
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
    }
    
    init() {
        this.setupEventListeners();
        this.initializeAudio();
        // Hide all game screens initially
        document.getElementById('mainMenu').style.display = 'none';
        document.querySelectorAll('.splash-screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Show initial start screen first
        this.showInitialScreen();
        this.gameLoop();
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
        });
    }
    
    setupEventListeners() {
        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Keyboard Events
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    // Touch Handlers
    handleTouchStart(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            this.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            };
        }
        
        if (e.touches.length === 1) {
            this.isDragging = false;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const prev = this.touches[touch.identifier];
            if (prev) {
                const dx = touch.clientX - prev.startX;
                const dy = touch.clientY - prev.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 10) {
                    this.isDragging = true;
                    this.cameraX += touch.clientX - prev.x;
                    this.cameraY += touch.clientY - prev.y;
                }
                
                prev.x = touch.clientX;
                prev.y = touch.clientY;
            }
        } else if (e.touches.length === 2) {
            this.isDragging = true;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (this.lastTouchDistance > 0) {
                const scale = distance / this.lastTouchDistance;
                this.zoom = Math.max(0.5, Math.min(2, this.zoom * scale));
            }
            
            this.lastTouchDistance = distance;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        for (let touch of e.changedTouches) {
            const touchData = this.touches[touch.identifier];
            if (touchData) {
                const dx = touch.clientX - touchData.startX;
                const dy = touch.clientY - touchData.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const duration = Date.now() - touchData.startTime;
                
                if (!this.isDragging && distance < 10 && duration < 300) {
                    this.handleTap(touch.clientX, touch.clientY);
                }
                
                delete this.touches[touch.identifier];
            }
        }
        
        if (e.touches.length === 0) {
            this.isDragging = false;
        }
    }
    
    // Mouse Handlers
    handleMouseDown(e) {
        this.mouseDown = true;
        this.mouseStartX = e.clientX;
        this.mouseStartY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.isDragging = false;
    }
    
    handleMouseMove(e) {
        if (this.mouseDown) {
            const dx = e.clientX - this.mouseStartX;
            const dy = e.clientY - this.mouseStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10) {
                this.isDragging = true;
                this.cameraX += e.clientX - this.lastMouseX;
                this.cameraY += e.clientY - this.lastMouseY;
            }
            
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
    }
    
    handleMouseUp(e) {
        if (this.mouseDown) {
            const dx = e.clientX - this.mouseStartX;
            const dy = e.clientY - this.mouseStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (!this.isDragging && distance < 10) {
                this.handleTap(e.clientX, e.clientY);
            }
        }
        this.mouseDown = false;
        this.isDragging = false;
    }
    
    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.5, Math.min(2, this.zoom * delta));
    }
    
    handleTap(x, y) {
        if (this.currentScreen !== 'game' || this.isPaused) return;
        
        // Check if clicking on HUD elements
        const squadHealth = document.getElementById('squadHealth');
        const rect = squadHealth.getBoundingClientRect();
        
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            const relativeY = y - rect.top;
            const barIndex = Math.floor(relativeY / 30);
            
            if (barIndex >= 0 && barIndex < this.agents.length) {
                const agent = this.agents[barIndex];
                if (agent && agent.alive) {
                    this.selectAgent(agent);
                    return;
                }
            }
        }
        
        // Convert to world coordinates
        const worldPos = this.screenToWorld(x, y);
        
        // Check if clicking on an agent
        let agentClicked = false;
        for (let agent of this.agents) {
            if (!agent.alive) continue;
            const dist = Math.sqrt(
                Math.pow(agent.x - worldPos.x, 2) + 
                Math.pow(agent.y - worldPos.y, 2)
            );
            if (dist < 1.5) {
                this.selectAgent(agent);
                agentClicked = true;
                break;
            }
        }
        
        // If no agent clicked, move selected agent
        if (!agentClicked) {
            this.showTouchIndicator(x, y);
            const selected = this.agents.find(a => a.selected);
            if (selected && selected.alive) {
                selected.targetX = worldPos.x;
                selected.targetY = worldPos.y;
            }
        }
    }
    
    selectAgent(agent) {
        this.agents.forEach(a => a.selected = false);
        agent.selected = true;
        this.updateSquadHealth();
        this.updateCooldownDisplay();
        this.centerCameraOnAgent(agent);
        
        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
    }
    
    handleKeyPress(e) {
        if (this.currentScreen !== 'game') return;
        
        // Number keys to select agents
        if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (idx < this.agents.length && this.agents[idx].alive) {
                this.selectAgent(this.agents[idx]);
            }
        }
        
        // Tab to cycle agents
        if (e.key === 'Tab') {
            e.preventDefault();
            const aliveAgents = this.agents.filter(a => a.alive);
            if (aliveAgents.length > 0) {
                const current = aliveAgents.findIndex(a => a.selected);
                const next = (current + 1) % aliveAgents.length;
                this.selectAgent(aliveAgents[next]);
            }
        }
        
        // Space to pause
        if (e.key === ' ') {
            e.preventDefault();
            this.togglePause();
        }
    }
    
    showTouchIndicator(x, y) {
        const indicator = document.createElement('div');
        indicator.className = 'touch-indicator';
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 500);
    }
    
    // Coordinate Conversion
    screenToWorld(screenX, screenY) {
        const x = (screenX - this.cameraX) / this.zoom;
        const y = (screenY - this.cameraY) / this.zoom;
        return this.screenToIsometric(x, y);
    }
    
    worldToScreen(worldX, worldY) {
        const iso = this.worldToIsometric(worldX, worldY);
        return {
            x: iso.x * this.zoom + this.cameraX,
            y: iso.y * this.zoom + this.cameraY
        };
    }
    
    worldToIsometric(x, y) {
        return {
            x: (x - y) * this.tileWidth / 2,
            y: (x + y) * this.tileHeight / 2
        };
    }
    
    screenToIsometric(x, y) {
        return {
            x: (x / (this.tileWidth / 2) + y / (this.tileHeight / 2)) / 2,
            y: (y / (this.tileHeight / 2) - x / (this.tileWidth / 2)) / 2
        };
    }
    
    // Map Generation
    generateMap1() {
        const width = 20;
        const height = 20;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 17, y: 17 },
            cover: [],
            terminals: []
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || x === width - 1 || y === 0 || y === height - 1) ? 1 : 0;
            }
        }
        
        map.cover = [
            { x: 5, y: 5 }, { x: 10, y: 5 }, { x: 15, y: 5 },
            { x: 5, y: 10 }, { x: 15, y: 10 },
            { x: 5, y: 15 }, { x: 10, y: 15 }, { x: 15, y: 15 }
        ];
        
        return map;
    }
    
    generateMap2() {
        const width = 25;
        const height = 25;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 12 },
            extraction: { x: 22, y: 12 },
            cover: [],
            terminals: [
                { x: 8, y: 8, hacked: false },
                { x: 16, y: 8, hacked: false },
                { x: 12, y: 16, hacked: false }
            ]
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    map.tiles[y][x] = 1;
                } else if (x === 12 && (y < 8 || y > 16)) {
                    map.tiles[y][x] = 1;
                } else if (y === 12 && (x < 5 || x > 19)) {
                    map.tiles[y][x] = 1;
                } else {
                    map.tiles[y][x] = 0;
                }
            }
        }
        
        for (let i = 0; i < 15; i++) {
            map.cover.push({
                x: 3 + Math.floor(Math.random() * 19),
                y: 3 + Math.floor(Math.random() * 19)
            });
        }
        
        return map;
    }
    
    generateMapFromType(mapType) {
        // Handle both old system (actual map objects) and new system (string types)
        if (typeof mapType === 'object' && mapType.spawn) {
            return mapType; // Already a map object
        }
        
        // Generate map based on string type
        switch (mapType) {
            case 'corporate':
                return this.generateCorporateMap();
            case 'government':
                return this.generateGovernmentMap();
            case 'industrial':
                return this.generateIndustrialMap();
            case 'residential':
                return this.generateResidentialMap();
            case 'fortress':
                return this.generateFortressMap();
            default:
                // Fallback to basic map
                return this.generateMap1();
        }
    }
    
    generateCorporateMap() {
        const width = 22;
        const height = 22;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 19, y: 19 },
            cover: [],
            terminals: []
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }
        
        // Add office cubicles as cover
        for (let i = 0; i < 8; i++) {
            map.cover.push({
                x: 5 + (i % 3) * 5,
                y: 5 + Math.floor(i / 3) * 4
            });
        }
        
        return map;
    }
    
    generateGovernmentMap() {
        const width = 25;
        const height = 25;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 12 },
            extraction: { x: 22, y: 12 },
            cover: [],
            terminals: [
                { x: 8, y: 8, hacked: false },
                { x: 16, y: 8, hacked: false },
                { x: 12, y: 16, hacked: false }
            ]
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }
        
        // Add security barriers as cover
        for (let i = 0; i < 6; i++) {
            map.cover.push({
                x: 6 + (i % 2) * 12,
                y: 6 + Math.floor(i / 2) * 6
            });
        }
        
        return map;
    }
    
    generateIndustrialMap() {
        const width = 28;
        const height = 20;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 25, y: 17 },
            cover: [],
            terminals: [],
            explosiveTargets: [
                { x: 20, y: 6, planted: false, name: "Power Generator" },
                { x: 15, y: 10, planted: false, name: "Control Panel" },
                { x: 22, y: 14, planted: false, name: "Main Server" }
            ]
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }
        
        // Add industrial machinery as cover
        for (let i = 0; i < 12; i++) {
            map.cover.push({
                x: 4 + (i % 4) * 6,
                y: 4 + Math.floor(i / 4) * 4
            });
        }
        
        return map;
    }
    
    generateResidentialMap() {
        const width = 30;
        const height = 25;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 27, y: 22 },
            cover: [],
            terminals: [],
            targets: [
                { x: 20, y: 12, eliminated: false, name: "Primary Target", type: "primary" },
                { x: 15, y: 8, eliminated: false, name: "Secondary Target A", type: "secondary" },
                { x: 25, y: 16, eliminated: false, name: "Secondary Target B", type: "secondary" }
            ]
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }
        
        // Add houses and gardens as cover
        for (let i = 0; i < 15; i++) {
            map.cover.push({
                x: 4 + (i % 5) * 5,
                y: 4 + Math.floor(i / 5) * 6
            });
        }
        
        return map;
    }
    
    generateFortressMap() {
        const width = 35;
        const height = 30;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 15 },
            extraction: { x: 32, y: 15 },
            cover: [],
            terminals: [
                { x: 30, y: 12, hacked: false, name: "Sector Alpha Control" },
                { x: 30, y: 18, hacked: false, name: "Sector Beta Control" },
                { x: 28, y: 15, hacked: false, name: "Main Mainframe" }
            ],
            gates: [
                { x: 10, y: 15, breached: false, name: "Main Gate" }
            ]
        };
        
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }
        
        // Add fortress walls and defensive positions
        for (let i = 0; i < 20; i++) {
            map.cover.push({
                x: 5 + (i % 5) * 5,
                y: 5 + Math.floor(i / 5) * 5
            });
        }
        
        return map;
    }
    
    // Game Flow
    updateMenuState() {
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;
        const hasSavedGame = this.hasSavedGame();
        
        document.getElementById('campaignButton').style.display = hasProgress ? 'none' : 'block';
        document.getElementById('continueButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('hubButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('saveButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('loadButton').style.display = hasSavedGame ? 'block' : 'none';
    }
    
    startCampaign() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.currentMissionIndex = 0;
        this.completedMissions = [];
        this.showSyndicateHub();
    }
    
    continueCampaign() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.showSyndicateHub();
    }
    
    selectMission() {
        this.showMissionSelectDialog();
    }

    showMissionSelectDialog() {
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

    closeMissionSelect() {
        document.getElementById('missionSelectDialog').classList.remove('show');
    }
    
    showMissionBriefing(mission) {
        document.getElementById('missionBriefing').style.display = 'flex';
        document.getElementById('missionTitle').textContent = `Mission ${mission.id}: ${mission.title}`;
        document.getElementById('missionDesc').textContent = mission.description;
        
        const objList = document.getElementById('objectivesList');
        objList.innerHTML = '';
        mission.objectives.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'objective-item';
            div.textContent = '▸ ' + obj;
            objList.appendChild(div);
        });
        
        const squadSel = document.getElementById('squadSelection');
        squadSel.innerHTML = '';
        this.selectedAgents = [];
        
        // Use active agents from hub for mission briefing
        const availableAgentsForMission = this.activeAgents.length > 0 ? this.activeAgents : this.agentTemplates;
        
        availableAgentsForMission.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            const agentName = agent.name || `Agent ${idx + 1}`;
            const agentHealth = agent.health;
            const agentDamage = agent.damage;
            const agentSpeed = agent.speed;
            
            card.innerHTML = `
                <div style="font-weight: bold; color: #00ffff;">${agentName}</div>
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
                } else if (this.selectedAgents.length < 4) {
                    this.selectedAgents.push({ template: idx, ...agent });
                    card.classList.add('selected');
                }
            };
            squadSel.appendChild(card);
            
            // Auto-select all available agents (up to 4)
            if (idx < Math.min(4, availableAgentsForMission.length)) {
                card.click();
            }
        });
        
        this.currentMission = mission;
    }
    
    startMission() {
        if (this.selectedAgents.length === 0) {
            this.showHudDialog(
                'DEPLOYMENT ERROR',
                '⚠️ Mission deployment failed!<br><br>You must select at least one agent before deployment.<br><br>Select your squad from the agent roster and try again.',
                [{ text: 'UNDERSTOOD', action: 'close' }]
            );
            return;
        }
        
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'block';
        this.currentScreen = 'game';
        this.initMission();
        
        // Start level-specific music
        const levelNumber = (this.currentMissionIndex % 5) + 1; // Cycle through 1-5 for any number of missions
        this.playLevelMusic(levelNumber);
    }
    
    initMission() {
        // Reset state
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.missionTimer = 0;
        this.isPaused = false;
        
        // Generate map based on mission map type
        this.map = this.generateMapFromType(this.currentMission.map);
        
        // Spawn agents with equipment and research bonuses
        const spawn = this.map.spawn;
        this.selectedAgents.forEach((agentData, idx) => {
            const agent = {
                id: 'agent_' + idx,
                x: spawn.x + idx % 2,
                y: spawn.y + Math.floor(idx / 2),
                targetX: spawn.x + idx % 2,
                targetY: spawn.y + Math.floor(idx / 2),
                health: agentData.health,
                maxHealth: agentData.health,
                speed: agentData.speed,
                damage: agentData.damage,
                name: agentData.name,
                selected: idx === 0,
                alive: true,
                cooldowns: [0, 0, 0, 0, 0],
                // Equipment bonuses
                protection: 0,
                hackBonus: 0,
                stealthBonus: 0
            };
            
            // Apply equipment bonuses
            this.applyEquipmentBonuses(agent);
            
            // Apply research bonuses
            this.applyMissionResearchBonuses(agent);
            
            this.agents.push(agent);
        });
        
        // Spawn enemies
        for (let i = 0; i < this.currentMission.enemies; i++) {
            const enemy = {
                id: 'enemy_' + i,
                x: 10 + Math.random() * 8,
                y: 10 + Math.random() * 8,
                health: 50,
                maxHealth: 50,
                speed: 2,
                damage: 10,
                alive: true,
                alertLevel: 0,
                visionRange: 5
            };
            enemy.targetX = enemy.x;
            enemy.targetY = enemy.y;
            this.enemies.push(enemy);
        }
        
        // Set initial objective
        if (this.currentMission.id === 1) {
            document.getElementById('objectiveTracker').textContent = 
                `Eliminate enemies: 0/${this.currentMission.enemies}`;
        } else {
            document.getElementById('objectiveTracker').textContent = 'Hack terminals: 0/3';
        }
        
        this.updateSquadHealth();
        this.centerCameraOnAgents();
    }
    
    centerCameraOnAgents() {
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
    
    centerCameraOnAgent(agent) {
        const screenPos = this.worldToIsometric(agent.x, agent.y);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;
    }
    
    updateSquadHealth() {
        const container = document.getElementById('squadHealth');
        container.innerHTML = '';
        
        this.agents.forEach((agent, index) => {
            const bar = document.createElement('div');
            bar.className = 'agent-health-bar' + (agent.selected ? ' selected' : '');
            bar.innerHTML = `
                <div class="health-fill" style="width: ${(agent.health / agent.maxHealth) * 100}%"></div>
                <div class="agent-name">${agent.name} [${index + 1}]</div>
            `;
            container.appendChild(bar);
        });
    }
    
    useAbility(abilityIndex) {
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
            case 3: // Hack/Interact
                if (this.currentMission.id === 3) {
                    this.plantNearestExplosive(agent);
                } else if (this.currentMission.id === 4) {
                    this.eliminateNearestTarget(agent);
                } else if (this.currentMission.id === 5) {
                    this.breachNearestGate(agent) || this.hackNearestTerminal(agent);
                } else {
                    this.hackNearestTerminal(agent);
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
    
    shootNearestEnemy(agent) {
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
                damage: agent.damage,
                speed: 0.5,
                owner: agent.id
            });
            this.alertEnemies(agent.x, agent.y, 8);
        }
    }
    
    throwGrenade(agent) {
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
            
            this.enemies.forEach(enemy => {
                const dist = Math.sqrt(
                    Math.pow(enemy.x - agent.targetX, 2) + 
                    Math.pow(enemy.y - agent.targetY, 2)
                );
                if (dist < 3) {
                    enemy.health -= 50;
                    if (enemy.health <= 0) enemy.alive = false;
                }
            });
            
            this.alertEnemies(agent.targetX, agent.targetY, 10);
        }, 500);
    }
    
    hackNearestTerminal(agent) {
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
                this.effects.push({
                    type: 'hack',
                    x: terminal.x,
                    y: terminal.y,
                    duration: 60,
                    frame: 0
                });
            }
        });
    }
    
    activateShield(agent) {
        agent.shield = 100;
        agent.shieldDuration = 180;
        this.effects.push({
            type: 'shield',
            target: agent.id,
            duration: 180,
            frame: 0
        });
    }
    
    plantNearestExplosive(agent) {
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
    
    eliminateNearestTarget(agent) {
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
    
    breachNearestGate(agent) {
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
    
    alertEnemies(x, y, radius) {
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
    
    updateCooldownDisplay() {
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
    
    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseButton = document.querySelector('.pause-button');
        
        if (this.isPaused) {
            pauseButton.textContent = '▶';
            this.pauseLevelMusic();
            this.showPauseMenu();
        } else {
            pauseButton.textContent = '⏸';
            this.resumeLevelMusic();
            this.closePauseMenu();
        }
    }
    
    showPauseMenu() {
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
    
    closePauseMenu() {
        this.closeDialog();
    }
    
    resumeFromPause() {
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';
        this.closeDialog();
    }
    
    surrenderMission() {
        this.showHudDialog(
            '⚠️ SURRENDER MISSION',
            'Are you sure you want to surrender this mission?<br><br><strong>Warning:</strong> You will lose all progress and return to the Syndicate Hub without rewards.',
            [
                { text: 'CONFIRM SURRENDER', action: () => this.performSurrender() },
                { text: 'CANCEL', action: () => this.showPauseMenu() }
            ]
        );
    }
    
    performSurrender() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';
        
        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';
        
        // Return to hub
        this.showSyndicateHub();
    }
    
    returnToHubFromMission() {
        this.showHudDialog(
            '🏢 RETURN TO HUB',
            'Return to Syndicate Hub?<br><br><strong>Note:</strong> Your mission progress will be saved and you can resume later.',
            [
                { text: 'RETURN TO HUB', action: () => this.performReturnToHub() },
                { text: 'CANCEL', action: () => this.showPauseMenu() }
            ]
        );
    }
    
    performReturnToHub() {
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
    
    showSettingsFromPause() {
        this.showHudDialog(
            'SYSTEM SETTINGS',
            'Settings panel is currently under development.<br><br>Available options will include:<br>• Audio Controls<br>• Graphics Quality<br>• Control Mapping<br>• Game Preferences',
            [
                { text: 'BACK', action: () => this.showPauseMenu() }
            ]
        );
    }
    
    backToMenuFromBriefing() {
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }
    
    // Removed - replaced by intermission dialog system
    
    showSettings() {
        this.showHudDialog(
            'SYSTEM SETTINGS',
            'Settings panel is currently under development.<br><br>Available options will include:<br>• Audio Controls<br>• Graphics Quality<br>• Control Mapping<br>• Game Preferences',
            [{ text: 'OK', action: 'close' }]
        );
    }
    
    // Save/Load System
    saveGame() {
        try {
            const saveData = {
                version: '2.0',
                timestamp: new Date().toISOString(),
                gameState: {
                    currentMissionIndex: this.currentMissionIndex,
                    completedMissions: [...this.completedMissions],
                    totalCampaignTime: this.totalCampaignTime,
                    totalEnemiesDefeated: this.totalEnemiesDefeated,
                    currentScreen: this.currentScreen,
                    // Hub resources
                    credits: this.credits,
                    researchPoints: this.researchPoints,
                    worldControl: this.worldControl,
                    // Agent management
                    availableAgents: JSON.parse(JSON.stringify(this.availableAgents)),
                    activeAgents: JSON.parse(JSON.stringify(this.activeAgents)),
                    // Equipment and research
                    weapons: JSON.parse(JSON.stringify(this.weapons)),
                    equipment: JSON.parse(JSON.stringify(this.equipment)),
                    completedResearch: this.completedResearch || []
                }
            };
            
            localStorage.setItem('cyberops_savegame', JSON.stringify(saveData));
            
            const saveTime = new Date().toLocaleString();
            this.showHudDialog(
                '💾 GAME SAVED',
                `Your progress has been successfully saved.<br><br><strong>Save Details:</strong><br>• Missions Completed: ${this.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${this.currentMissionIndex + 1}<br>• Save Time: ${saveTime}`,
                [{ text: 'CONTINUE', action: 'close' }]
            );
            
            // Update menu to show load button
            this.updateMenuState();
            
        } catch (error) {
            console.error('Failed to save game:', error);
            this.showHudDialog(
                '❌ SAVE ERROR',
                'Failed to save game progress.<br><br>Please ensure you have sufficient storage space and try again.',
                [{ text: 'OK', action: 'close' }]
            );
        }
    }
    
    loadGame() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        
        try {
            const savedData = localStorage.getItem('cyberops_savegame');
            if (!savedData) {
                this.showHudDialog(
                    '❌ NO SAVE FOUND',
                    'No saved game data was found.<br><br>Start a new campaign to begin playing.',
                    [{ text: 'OK', action: 'close' }]
                );
                return;
            }
            
            const saveData = JSON.parse(savedData);
            const saveTime = new Date(saveData.timestamp).toLocaleString();
            
            this.showHudDialog(
                '📁 LOAD GAME',
                `Found saved game from: ${saveTime}<br><br><strong>Save Details:</strong><br>• Missions Completed: ${saveData.gameState.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${saveData.gameState.currentMissionIndex + 1}<br><br>Load this save game?`,
                [
                    { text: 'LOAD GAME', action: () => this.performLoadGame(saveData) },
                    { text: 'CANCEL', action: 'close' }
                ]
            );
            
        } catch (error) {
            console.error('Failed to load game:', error);
            this.showHudDialog(
                '❌ LOAD ERROR',
                'Failed to load saved game.<br><br>The save file may be corrupted or incompatible.',
                [{ text: 'OK', action: 'close' }]
            );
        }
    }
    
    performLoadGame(saveData) {
        try {
            // Restore game state
            this.currentMissionIndex = saveData.gameState.currentMissionIndex;
            this.completedMissions = [...saveData.gameState.completedMissions];
            this.totalCampaignTime = saveData.gameState.totalCampaignTime || 0;
            this.totalEnemiesDefeated = saveData.gameState.totalEnemiesDefeated || 0;
            
            // Restore hub data (if available)
            if (saveData.gameState.credits !== undefined) {
                this.credits = saveData.gameState.credits;
                this.researchPoints = saveData.gameState.researchPoints;
                this.worldControl = saveData.gameState.worldControl;
                this.availableAgents = saveData.gameState.availableAgents;
                this.activeAgents = saveData.gameState.activeAgents;
                this.weapons = saveData.gameState.weapons;
                this.equipment = saveData.gameState.equipment;
                this.completedResearch = saveData.gameState.completedResearch || [];
            }
            
            // Close dialog and update menu
            this.closeDialog();
            this.updateMenuState();
            this.updateHubStats(); // Update hub displays
            
            this.showHudDialog(
                '✅ GAME LOADED',
                `Game successfully loaded!<br><br>Welcome back, Commander.<br><br><strong>Progress:</strong><br>• Missions Completed: ${this.completedMissions.length}/${this.missions.length}<br>• Current Mission: ${this.currentMissionIndex + 1}<br>• Credits: ${this.credits?.toLocaleString() || 'N/A'}<br>• Research Points: ${this.researchPoints?.toLocaleString() || 'N/A'}`,
                [{ text: 'CONTINUE', action: 'close' }]
            );
            
        } catch (error) {
            console.error('Failed to perform load:', error);
            this.showHudDialog(
                '❌ LOAD ERROR',
                'An error occurred while loading the game.<br><br>Please try again or start a new campaign.',
                [{ text: 'OK', action: 'close' }]
            );
        }
    }
    
    hasSavedGame() {
        try {
            const savedData = localStorage.getItem('cyberops_savegame');
            return savedData !== null;
        } catch (error) {
            console.error('Error checking save game:', error);
            return false;
        }
    }
    
    exitGame() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        
        this.showHudDialog(
            '🚪 EXIT TO START SCREEN',
            'Are you sure you want to return to the start screen?<br><br>This will end your current session. Make sure to save your progress!',
            [
                { text: 'SAVE & EXIT', action: () => this.saveAndExit() },
                { text: 'RETURN TO START', action: () => this.performExit() },
                { text: 'CANCEL', action: 'close' }
            ]
        );
    }
    
    saveAndExit() {
        // Check if there's progress to save
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;
        
        if (hasProgress) {
            try {
                const saveData = {
                    version: '1.0',
                    timestamp: new Date().toISOString(),
                    gameState: {
                        currentMissionIndex: this.currentMissionIndex,
                        completedMissions: [...this.completedMissions],
                        totalCampaignTime: this.totalCampaignTime,
                        totalEnemiesDefeated: this.totalEnemiesDefeated,
                        currentScreen: this.currentScreen
                    }
                };
                
                localStorage.setItem('cyberops_savegame', JSON.stringify(saveData));
            } catch (error) {
                console.error('Failed to save before exit:', error);
            }
        }
        
        this.performExit();
    }
    
    performExit() {
        this.closeDialog();
        
        // Return to initial start screen
        this.returnToInitialScreen();
    }

    returnToInitialScreen() {
        console.log('Returning to initial screen');
        
        // Stop all music
        this.stopMainMenuMusic();
        this.stopLevelMusic();
        this.stopCreditsMusic();
        
        // Clear demoscene timer and hide demoscene
        this.clearDemosceneTimer();
        this.demosceneActive = false;
        document.getElementById('demoscene').style.display = 'none';
        
        // Hide all game screens
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('syndicateHub').style.display = 'none';
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.querySelectorAll('.splash-screen').forEach(screen => {
            screen.style.display = 'none';
        });
        
        // Reset screen state
        this.currentScreen = 'initial';
        
        // Reset audio state (will require new user interaction)
        this.audioEnabled = false;
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        // Clear session storage audio permission (will require fresh start)
        sessionStorage.removeItem('cyberops_audio_enabled');
        
        // Show initial screen
        const initialScreen = document.getElementById('initialScreen');
        initialScreen.style.display = 'flex';
        
        console.log('Returned to initial screen - fresh start ready');
    }
    
    checkForSavedGame() {
        // This is called during initialization to set up the menu properly
        // Will be used when the menu is displayed after splash screens
    }
    
    // Syndicate Hub System
    showSyndicateHub() {
        // Hide all other screens
        document.getElementById('mainMenu').style.display = 'none';
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('intermissionDialog').classList.remove('show');
        document.getElementById('hudDialog').classList.remove('show');
        
        // Show hub
        document.getElementById('syndicateHub').style.display = 'flex';
        this.currentScreen = 'hub';
        
        // Log music continuation in hub
        if (this.currentLevelMusic) {
            console.log(`🎵 Level ${this.currentLevelMusic} music continues playing in Syndicate Hub`);
        }
        
        this.updateHubStats();
    }
    
    updateHubStats() {
        // Update resource displays
        document.getElementById('hubCredits').textContent = this.credits.toLocaleString();
        document.getElementById('hubResearchPoints').textContent = this.researchPoints;
        document.getElementById('hubMissionsComplete').textContent = `${this.completedMissions.length}/${this.missions.length}`;
        document.getElementById('hubActiveAgents').textContent = this.activeAgents.length;
        
        // Update world control
        document.getElementById('worldControlPercent').textContent = `${this.worldControl}%`;
        document.getElementById('controlProgress').style.width = `${this.worldControl}%`;
        
        // Update status indicators
        const availableMissions = this.missions.length - this.completedMissions.length;
        document.getElementById('missionStatus').textContent = `${availableMissions} Available`;
        document.getElementById('agentStatus').textContent = `${this.activeAgents.length} Active`;
        document.getElementById('arsenalStatus').textContent = `${this.weapons.length + this.equipment.length} Items`;
        document.getElementById('researchStatus').textContent = `${Math.floor(this.researchPoints / 50)} Projects`;
    }
    
    showMissionsFromHub() {
        document.getElementById('syndicateHub').style.display = 'none';
        this.showMissionSelectDialog();
    }
    
    // Fix mission briefing for hub flow
    startMissionFromHub(missionIndex) {
        const mission = this.missions[missionIndex];
        this.currentMissionIndex = missionIndex;
        this.showMissionBriefing(mission);
    }
    
    showAgentManagement() {
        this.showHudDialog(
            '👥 AGENT MANAGEMENT',
            this.generateAgentManagementContent(),
            [
                { text: 'HIRE AGENTS', action: () => this.showHiringDialog() },
                { text: 'MANAGE SQUAD', action: () => this.showSquadManagement() },
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
    }
    
    generateAgentManagementContent() {
        let content = '<div style="max-height: 300px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE AGENTS</h3>';
        
        this.activeAgents.forEach(agent => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${agent.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Specialization: ${agent.specialization} | 
                        Skills: ${agent.skills.join(', ')} | 
                        Health: ${agent.health} | Damage: ${agent.damage}
                    </div>
                </div>`;
        });
        
        const availableAgents = this.availableAgents.filter(agent => !agent.hired);
        if (availableAgents.length > 0) {
            content += '<h3 style="color: #ff00ff; margin-top: 20px; margin-bottom: 15px;">AVAILABLE FOR HIRE</h3>';
            availableAgents.forEach(agent => {
                content += `
                    <div style="background: rgba(255,0,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                        <div style="font-weight: bold; color: #fff;">${agent.name}</div>
                        <div style="color: #ccc; font-size: 0.9em;">
                            Cost: ${agent.cost} credits | 
                            Skills: ${agent.skills.join(', ')} | 
                            Health: ${agent.health} | Damage: ${agent.damage}
                        </div>
                    </div>`;
            });
        }
        
        content += '</div>';
        return content;
    }
    
    showArsenal() {
        this.showHudDialog(
            '🔫 ARSENAL & EQUIPMENT',
            this.generateArsenalContent(),
            [
                { text: 'BUY EQUIPMENT', action: () => this.showShopDialog() },
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
    }
    
    generateArsenalContent() {
        let content = '<div style="max-height: 300px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">WEAPONS</h3>';
        
        this.weapons.forEach(weapon => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${weapon.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Owned: ${weapon.owned} | Damage: ${weapon.damage} | Type: ${weapon.type}
                    </div>
                </div>`;
        });
        
        content += '<h3 style="color: #ff00ff; margin-top: 20px; margin-bottom: 15px;">EQUIPMENT</h3>';
        this.equipment.forEach(item => {
            let stats = '';
            if (item.protection) stats += `Protection: ${item.protection}`;
            if (item.hackBonus) stats += `Hack Bonus: ${item.hackBonus}%`;
            if (item.stealthBonus) stats += `Stealth Bonus: ${item.stealthBonus}%`;
            if (item.damage) stats += `Damage: ${item.damage}`;
            
            content += `
                <div style="background: rgba(255,0,255,0.1); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="font-weight: bold; color: #fff;">${item.name}</div>
                    <div style="color: #ccc; font-size: 0.9em;">
                        Owned: ${item.owned} | ${stats}
                    </div>
                </div>`;
        });
        
        content += '</div>';
        return content;
    }
    
    showResearchLab() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Research Points: ${this.researchPoints.toLocaleString()}</div>`;
        
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE RESEARCH</h3>';
        content += `<div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #00ffff; margin: 10px 0;">
            <strong style="color: #00ffff;">CYBER WARFARE ENHANCEMENT</strong><br>
            Progress: 75% | Est. Completion: 2 missions<br>
            Benefit: +15% hacking success rate
        </div>
        <div style="background: rgba(0,0,0,0.3); padding: 15px; border-left: 3px solid #ff00ff; margin: 10px 0;">
            <strong style="color: #ff00ff;">ADVANCED COMBAT TRAINING</strong><br>
            Progress: 45% | Est. Completion: 4 missions<br>
            Benefit: +10 damage for all agents
        </div>`;
        
        content += '<h3 style="color: #ff00ff; margin: 30px 0 15px 0;">AVAILABLE RESEARCH</h3>';
        
        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons', category: 'combat' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate', category: 'stealth' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents', category: 'combat' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed', category: 'tech' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions', category: 'support' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents', category: 'tactical' }
        ];
        
        researchProjects.forEach(project => {
            const canAfford = this.researchPoints >= project.cost;
            const completed = this.completedResearch && this.completedResearch.includes(project.id);
            
            content += `
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
                            <button onclick="game.startResearch(${project.id})" 
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
        
        content += '</div>';
        
        this.showHudDialog(
            '🔬 RESEARCH LABORATORY',
            content,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
    }
    
    startResearch(projectId) {
        const researchProjects = [
            { id: 1, name: 'Weapon Upgrades', cost: 150, description: '+5 damage to all weapons', category: 'combat' },
            { id: 2, name: 'Stealth Technology', cost: 200, description: '+20% stealth success rate', category: 'stealth' },
            { id: 3, name: 'Combat Systems', cost: 175, description: '+15 health to all agents', category: 'combat' },
            { id: 4, name: 'Hacking Protocols', cost: 225, description: '+25% hacking speed', category: 'tech' },
            { id: 5, name: 'Medical Systems', cost: 300, description: 'Auto-heal 20% health between missions', category: 'support' },
            { id: 6, name: 'Advanced Tactics', cost: 250, description: '+1 movement speed to all agents', category: 'tactical' }
        ];
        
        const project = researchProjects.find(p => p.id === projectId);
        if (!project || this.researchPoints < project.cost) return;
        
        // Initialize completed research array if not exists
        if (!this.completedResearch) this.completedResearch = [];
        
        // Check if already researched
        if (this.completedResearch.includes(projectId)) {
            this.showHudDialog(
                '⚠️ RESEARCH COMPLETE',
                `${project.name} has already been researched!`,
                [{ text: 'OK', action: () => this.showResearchLab() }]
            );
            return;
        }
        
        // Complete research
        this.researchPoints -= project.cost;
        this.completedResearch.push(projectId);
        
        // Apply research benefits
        this.applyResearchBenefits(project);
        
        this.showHudDialog(
            '🎯 RESEARCH COMPLETED',
            `${project.name} research has been completed!<br><br>
            <div style="background: rgba(255,0,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${project.name}</strong><br>
                Category: ${project.category}<br>
                Benefit: ${project.description}
            </div>
            Research Points Remaining: ${this.researchPoints.toLocaleString()}`,
            [
                { text: 'CONTINUE RESEARCH', action: () => this.showResearchLab() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
    }
    
    applyResearchBenefits(project) {
        // Apply research benefits to game systems
        switch (project.id) {
            case 1: // Weapon Upgrades
                this.activeAgents.forEach(agent => {
                    agent.damage += 5;
                });
                break;
            case 2: // Stealth Technology
                // Stealth bonus will be applied during missions
                break;
            case 3: // Combat Systems
                this.activeAgents.forEach(agent => {
                    agent.health += 15;
                    agent.maxHealth = agent.health;
                });
                break;
            case 4: // Hacking Protocols
                // Hacking bonus will be applied during missions
                break;
            case 5: // Medical Systems
                // Auto-heal will be applied between missions
                this.applyMedicalHealing();
                break;
            case 6: // Advanced Tactics
                this.activeAgents.forEach(agent => {
                    agent.speed += 1;
                });
                break;
        }
    }
    
    // Apply equipment bonuses to mission agents
    applyEquipmentBonuses(agent) {
        // Apply bonuses from owned equipment
        this.equipment.forEach(item => {
            if (item.owned > 0) {
                if (item.protection) agent.protection += item.protection;
                if (item.hackBonus) agent.hackBonus += item.hackBonus;
                if (item.stealthBonus) agent.stealthBonus += item.stealthBonus;
                if (item.damage) agent.damage += item.damage;
            }
        });
    }
    
    // Apply research bonuses during missions
    applyMissionResearchBonuses(agent) {
        if (!this.completedResearch) return;
        
        this.completedResearch.forEach(researchId => {
            switch (researchId) {
                case 2: // Stealth Technology
                    agent.stealthBonus += 20;
                    break;
                case 4: // Hacking Protocols
                    agent.hackBonus += 25;
                    break;
            }
        });
    }
    
    // Apply medical healing between missions
    applyMedicalHealing() {
        if (!this.completedResearch || !this.completedResearch.includes(5)) return;
        
        this.activeAgents.forEach(agent => {
            const healAmount = Math.floor(agent.maxHealth * 0.2);
            agent.health = Math.min(agent.health + healAmount, agent.maxHealth);
        });
    }
    
    // Apply stealth bonus for detection  
    getStealthDetectionRange(agent) {
        let baseRange = 5; // Default enemy vision range
        
        if (agent.stealthBonus) {
            // Stealth bonus reduces enemy detection range
            baseRange = Math.max(2, baseRange - (agent.stealthBonus / 20));
        }
        
        return baseRange;
    }
    
    // Fix missing medical healing call after mission completion
    completeMissionRewards(victory) {
        if (victory && this.currentMission.rewards) {
            this.credits += this.currentMission.rewards.credits || 0;
            this.researchPoints += this.currentMission.rewards.researchPoints || 0;
            this.worldControl += this.currentMission.rewards.worldControl || 0;
            
            // Apply medical healing if researched
            this.applyMedicalHealing();
            
            // Update hub stats
            this.updateHubStats();
        }
    }
    
    showIntelligence() {
        this.showHudDialog(
            '📡 INTELLIGENCE NETWORK',
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 20px;">CURRENT INTELLIGENCE REPORTS</h3>
                    <div style="text-align: left; margin: 15px 0;">
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #00ffff; margin: 10px 0;">
                            <strong style="color: #00ffff;">PRIORITY ALERT:</strong><br>
                            Increased security detected at government facilities
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #ff00ff; margin: 10px 0;">
                            <strong style="color: #ff00ff;">SURVEILLANCE:</strong><br>
                            New patrol patterns identified in industrial sectors
                        </div>
                        <div style="background: rgba(0,0,0,0.3); padding: 10px; border-left: 3px solid #ffff00; margin: 10px 0;">
                            <strong style="color: #ffff00;">NETWORK CHATTER:</strong><br>
                            Enemy communications suggest major operation planning
                        </div>
                    </div>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
    }
    
    // Agent Hiring System
    showHiringDialog() {
        const availableAgents = this.availableAgents.filter(agent => !agent.hired);
        
        if (availableAgents.length === 0) {
            this.showHudDialog(
                '👥 NO AGENTS AVAILABLE',
                'All available agents have already been hired!<br><br>Check back later for new recruits.',
                [{ text: 'OK', action: () => { this.closeDialog(); this.showSyndicateHub(); } }]
            );
            return;
        }
        
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Credits: ${this.credits.toLocaleString()}</div>`;
        
        availableAgents.forEach(agent => {
            const canAfford = this.credits >= agent.cost;
            content += `
                <div style="background: ${canAfford ? 'rgba(0,255,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canAfford ? '#00ffff' : '#666'};">
                    <div style="font-weight: bold; color: ${canAfford ? '#fff' : '#999'};">${agent.name}</div>
                    <div style="color: #ccc; font-size: 0.9em; margin: 5px 0;">
                        Specialization: ${agent.specialization}<br>
                        Skills: ${agent.skills.join(', ')}<br>
                        Health: ${agent.health} | Damage: ${agent.damage} | Speed: ${agent.speed}
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                        <span style="color: #00ffff; font-weight: bold;">Cost: ${agent.cost.toLocaleString()} credits</span>
                        <button onclick="game.hireAgent(${agent.id})" 
                                style="background: ${canAfford ? '#1e3c72' : '#666'}; 
                                       color: ${canAfford ? '#fff' : '#999'}; 
                                       border: 1px solid ${canAfford ? '#00ffff' : '#888'}; 
                                       padding: 8px 15px; border-radius: 4px; cursor: ${canAfford ? 'pointer' : 'not-allowed'};"
                                ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? 'HIRE' : 'INSUFFICIENT FUNDS'}
                        </button>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '👥 HIRE AGENTS',
            content,
            [
                { text: 'BACK', action: () => this.showAgentManagement() }
            ]
        );
    }
    
    hireAgent(agentId) {
        const agent = this.availableAgents.find(a => a.id === agentId);
        if (!agent || agent.hired || this.credits < agent.cost) return;
        
        // Deduct credits and hire agent
        this.credits -= agent.cost;
        agent.hired = true;
        this.activeAgents.push(agent);
        
        this.showHudDialog(
            '✅ AGENT HIRED',
            `${agent.name} has been successfully recruited to your syndicate!<br><br>
            <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${agent.name}</strong><br>
                Specialization: ${agent.specialization}<br>
                Skills: ${agent.skills.join(', ')}<br>
                Health: ${agent.health} | Damage: ${agent.damage}
            </div>
            Credits Remaining: ${this.credits.toLocaleString()}`,
            [
                { text: 'HIRE MORE', action: () => this.showHiringDialog() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
    }
    
    // Squad Management System
    showSquadManagement() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">ACTIVE SQUAD MEMBERS</h3>';
        
        this.activeAgents.forEach(agent => {
            content += `
                <div style="background: rgba(0,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px; border: 1px solid #00ffff;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <div style="font-weight: bold; color: #fff; margin-bottom: 5px;">${agent.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Specialization: ${agent.specialization}<br>
                                Skills: ${agent.skills.join(', ')}<br>
                                Health: ${agent.health} | Damage: ${agent.damage} | Speed: ${agent.speed}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <button onclick="game.manageAgentEquipment(${agent.id})" 
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff; 
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">
                                EQUIP
                            </button>
                            <br>
                            <button onclick="game.viewAgentDetails(${agent.id})" 
                                    style="background: #1e3c72; color: #fff; border: 1px solid #00ffff; 
                                           padding: 6px 12px; border-radius: 4px; cursor: pointer; margin: 2px;">
                                DETAILS
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '⚙️ SQUAD MANAGEMENT',
            content,
            [
                { text: 'BACK', action: () => this.showAgentManagement() }
            ]
        );
    }
    
    manageAgentEquipment(agentId) {
        const agent = this.activeAgents.find(a => a.id === agentId);
        if (!agent) return;
        
        this.showHudDialog(
            `🔧 ${agent.name.toUpperCase()} - EQUIPMENT`,
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 15px;">${agent.name}</h3>
                    <div style="color: #ccc; margin-bottom: 20px;">
                        Current Equipment: Basic Loadout<br>
                        Weapons: Standard Issue<br>
                        Armor: Light Protection
                    </div>
                    <p style="color: #ccc; font-style: italic;">
                        Advanced equipment system coming in future updates!<br>
                        For now, all agents use standard loadouts.
                    </p>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => this.showSquadManagement() }
            ]
        );
    }
    
    viewAgentDetails(agentId) {
        const agent = this.activeAgents.find(a => a.id === agentId);
        if (!agent) return;
        
        this.showHudDialog(
            `📋 ${agent.name.toUpperCase()} - PROFILE`,
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px;">
                    <h3 style="color: #fff; margin-bottom: 15px;">${agent.name}</h3>
                    <div style="text-align: left; color: #ccc;">
                        <strong style="color: #00ffff;">Specialization:</strong> ${agent.specialization}<br>
                        <strong style="color: #00ffff;">Skills:</strong> ${agent.skills.join(', ')}<br>
                        <strong style="color: #00ffff;">Health:</strong> ${agent.health} HP<br>
                        <strong style="color: #00ffff;">Damage:</strong> ${agent.damage} DMG<br>
                        <strong style="color: #00ffff;">Speed:</strong> ${agent.speed} SPD<br>
                        <strong style="color: #00ffff;">Cost:</strong> ${agent.cost.toLocaleString()} credits<br>
                        <strong style="color: #00ffff;">Status:</strong> Active
                    </div>
                </div>
            </div>`,
            [
                { text: 'BACK', action: () => this.showSquadManagement() }
            ]
        );
    }
    
    // Equipment Shop System
    showShopDialog() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += `<div style="color: #00ffff; margin-bottom: 20px; text-align: center;">Available Credits: ${this.credits.toLocaleString()}</div>`;
        
        content += '<h3 style="color: #00ffff; margin: 20px 0 15px 0;">WEAPONS</h3>';
        this.weapons.forEach(weapon => {
            const canBuy = this.credits >= weapon.cost;
            content += `
                <div style="background: ${canBuy ? 'rgba(0,255,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canBuy ? '#00ffff' : '#666'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: ${canBuy ? '#fff' : '#999'};">${weapon.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Owned: ${weapon.owned} | Damage: ${weapon.damage} | Type: ${weapon.type}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">${weapon.cost.toLocaleString()} credits</div>
                            <button onclick="game.buyItem('weapon', ${weapon.id})" 
                                    style="background: ${canBuy ? '#1e3c72' : '#666'}; 
                                           color: ${canBuy ? '#fff' : '#999'}; 
                                           border: 1px solid ${canBuy ? '#00ffff' : '#888'}; 
                                           padding: 8px 15px; border-radius: 4px; cursor: ${canBuy ? 'pointer' : 'not-allowed'};"
                                    ${!canBuy ? 'disabled' : ''}>
                                ${canBuy ? 'BUY' : 'INSUFFICIENT FUNDS'}
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '<h3 style="color: #ff00ff; margin: 20px 0 15px 0;">EQUIPMENT</h3>';
        this.equipment.forEach(item => {
            const canBuy = this.credits >= item.cost;
            let stats = '';
            if (item.protection) stats += `Protection: ${item.protection}`;
            if (item.hackBonus) stats += `Hack Bonus: ${item.hackBonus}%`;
            if (item.stealthBonus) stats += `Stealth Bonus: ${item.stealthBonus}%`;
            if (item.damage) stats += `Damage: ${item.damage}`;
            
            content += `
                <div style="background: ${canBuy ? 'rgba(255,0,255,0.1)' : 'rgba(128,128,128,0.1)'}; 
                           padding: 15px; margin: 10px 0; border-radius: 8px; 
                           border: 1px solid ${canBuy ? '#ff00ff' : '#666'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: ${canBuy ? '#fff' : '#999'};">${item.name}</div>
                            <div style="color: #ccc; font-size: 0.9em;">
                                Owned: ${item.owned} | ${stats}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="color: #ff00ff; font-weight: bold; margin-bottom: 5px;">${item.cost.toLocaleString()} credits</div>
                            <button onclick="game.buyItem('equipment', ${item.id})" 
                                    style="background: ${canBuy ? '#1e3c72' : '#666'}; 
                                           color: ${canBuy ? '#fff' : '#999'}; 
                                           border: 1px solid ${canBuy ? '#ff00ff' : '#888'}; 
                                           padding: 8px 15px; border-radius: 4px; cursor: ${canBuy ? 'pointer' : 'not-allowed'};"
                                    ${!canBuy ? 'disabled' : ''}>
                                ${canBuy ? 'BUY' : 'INSUFFICIENT FUNDS'}
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        
        content += '</div>';
        
        this.showHudDialog(
            '🛒 EQUIPMENT SHOP',
            content,
            [
                { text: 'BACK', action: () => this.showArsenal() }
            ]
        );
    }
    
    buyItem(type, itemId) {
        const items = type === 'weapon' ? this.weapons : this.equipment;
        const item = items.find(i => i.id === itemId);
        
        if (!item || this.credits < item.cost) return;
        
        // Purchase item
        this.credits -= item.cost;
        item.owned += 1;
        
        this.showHudDialog(
            '✅ PURCHASE SUCCESSFUL',
            `${item.name} has been added to your arsenal!<br><br>
            <div style="background: rgba(0,255,255,0.1); padding: 15px; border-radius: 8px; margin: 15px 0;">
                <strong>${item.name}</strong><br>
                Type: ${item.type}<br>
                ${type === 'weapon' ? `Damage: ${item.damage}` : `Stats: Various bonuses`}<br>
                Now Owned: ${item.owned}
            </div>
            Credits Remaining: ${this.credits.toLocaleString()}`,
            [
                { text: 'BUY MORE', action: () => this.showShopDialog() },
                { text: 'BACK TO HUB', action: () => { this.closeDialog(); this.showSyndicateHub(); } }
            ]
        );
        
        this.updateHubStats();
    }

    // HUD Dialog System
    showHudDialog(title, message, buttons) {
        document.getElementById('dialogTitle').textContent = title;
        document.getElementById('dialogBody').innerHTML = message;
        
        const actionsDiv = document.getElementById('dialogActions');
        actionsDiv.innerHTML = '';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'menu-button';
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.action === 'close') {
                    this.closeDialog();
                } else if (typeof btn.action === 'function') {
                    btn.action();
                    this.closeDialog();
                }
            };
            actionsDiv.appendChild(button);
        });
        
        document.getElementById('hudDialog').classList.add('show');
    }

    closeDialog() {
        document.getElementById('hudDialog').classList.remove('show');
    }

    showIntermissionDialog(victory) {
        // Hide game HUD
        document.getElementById('gameHUD').style.display = 'none';
        
        // Update dialog title and message
        const title = victory ? 'MISSION COMPLETE' : 'MISSION FAILED';
        const statusIcon = victory ? '✅' : '❌';
        const statusText = victory ? 'MISSION ACCOMPLISHED' : 'MISSION FAILED';
        const statusColor = victory ? '#00ff00' : '#ff0000';
        
        document.getElementById('intermissionTitle').textContent = title;
        document.querySelector('.status-icon').textContent = statusIcon;
        document.querySelector('.status-text').textContent = statusText;
        document.querySelector('.status-text').style.color = statusColor;
        document.querySelector('.status-text').style.textShadow = `0 0 10px ${statusColor}`;
        
        // Update mission statistics
        document.getElementById('intermissionTime').textContent = document.getElementById('missionTimer').textContent;
        document.getElementById('intermissionEnemies').textContent = 
            this.enemies.filter(e => !e.alive).length + '/' + this.enemies.length;
        
        let completedObj = 0;
        if (this.currentMission.id === 1) {
            if (this.enemies.every(e => !e.alive)) completedObj++;
            if (victory) completedObj++;
            if (this.agents.filter(a => a.alive).length >= 2) completedObj++;
        } else {
            completedObj = this.map.terminals.filter(t => t.hacked).length;
            if (victory) completedObj++;
        }
        
        document.getElementById('intermissionObjectives').textContent = 
            `${completedObj}/${this.currentMission.objectives.length}`;
        document.getElementById('intermissionSquad').textContent = 
            `${this.agents.filter(a => a.alive).length}/${this.agents.length} Survived`;
        
        // Create action buttons based on mission outcome and progress
        const actionsContainer = document.getElementById('intermissionActions');
        actionsContainer.innerHTML = '';
        
        if (victory && this.currentMissionIndex < this.missions.length - 1) {
            // There's a next mission - show Continue button
            this.currentMissionIndex++;
            const continueBtn = document.createElement('button');
            continueBtn.className = 'menu-button';
            continueBtn.textContent = 'CONTINUE';
            continueBtn.onclick = () => this.continueToNextMission();
            actionsContainer.appendChild(continueBtn);
        } else if (victory) {
            // All missions completed - show Game Complete
            const completeBtn = document.createElement('button');
            completeBtn.className = 'menu-button';
            completeBtn.textContent = 'FINISH';
            completeBtn.onclick = () => this.finishCampaign();
            actionsContainer.appendChild(completeBtn);
        }
        
        // Always show Try Again button
        const tryAgainBtn = document.createElement('button');
        tryAgainBtn.className = 'menu-button';
        tryAgainBtn.textContent = 'TRY AGAIN';
        tryAgainBtn.onclick = () => this.tryAgainMission();
        actionsContainer.appendChild(tryAgainBtn);
        
        // Always show Main Menu button
        const mainMenuBtn = document.createElement('button');
        mainMenuBtn.className = 'menu-button';
        mainMenuBtn.textContent = 'MAIN MENU';
        mainMenuBtn.onclick = () => this.backToMainMenuFromIntermission();
        actionsContainer.appendChild(mainMenuBtn);
        
        // Show the dialog
        document.getElementById('intermissionDialog').classList.add('show');
    }
    
    continueToNextMission() {
        document.getElementById('intermissionDialog').classList.remove('show');
        // Return to hub after mission completion
        this.showSyndicateHub();
    }
    
    tryAgainMission() {
        document.getElementById('intermissionDialog').classList.remove('show');
        // Restart current mission - need to decrement since we incremented when showing dialog
        const currentMissionIndex = this.currentMissionIndex - 1;
        this.currentMission = this.missions[currentMissionIndex];
        this.startMission();
    }
    
    finishCampaign() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.showGameCompleteScreen();
    }
    
    backToMainMenuFromIntermission() {
        document.getElementById('intermissionDialog').classList.remove('show');
        this.backToMainMenu();
    }

    showGameCompleteScreen() {
        // Start credits music when game is completed
        this.playCreditsMusic();
        
        // Hide other screens
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'none';
        
        // Calculate final stats
        const totalMinutes = Math.floor(this.totalCampaignTime / 3600);
        const totalSeconds = Math.floor((this.totalCampaignTime % 3600) / 60);
        const timeString = `${String(totalMinutes).padStart(2, '0')}:${String(totalSeconds).padStart(2, '0')}`;
        
        // Update stats display
        document.getElementById('finalMissions').textContent = `${this.completedMissions.length}/${this.missions.length}`;
        document.getElementById('finalTime').textContent = timeString;
        document.getElementById('finalEnemies').textContent = this.totalEnemiesDefeated;
        
        // Show completion screen
        document.getElementById('gameCompleteScreen').style.display = 'flex';
        this.currentScreen = 'complete';
    }

    showCredits() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        
        // Don't restart credits music if it's already playing
        if (!this.creditsPlaying) {
            this.playCreditsMusic();
        }
        
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'flex';
        this.currentScreen = 'credits';
    }

    restartCampaign() {
        // Stop credits music when restarting
        this.stopCreditsMusic();
        
        // Reset all progress
        this.currentMissionIndex = 0;
        this.completedMissions = [];
        this.totalCampaignTime = 0;
        this.totalEnemiesDefeated = 0;
        
        // Hide completion screen and start new campaign
        document.getElementById('gameCompleteScreen').style.display = 'none';
        this.showMissionBriefing(this.missions[0]);
    }

    backToMainMenu() {
        // Stop all music including credits (returning to main menu)
        this.stopLevelMusic();
        this.stopCreditsMusic();
        
        // Hide all screens and dialogs
        document.getElementById('gameCompleteScreen').style.display = 'none';
        document.getElementById('creditsScreen').style.display = 'none';
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('intermissionDialog').classList.remove('show');
        document.getElementById('hudDialog').classList.remove('show');
        document.getElementById('missionSelectDialog').classList.remove('show');
        
        // Show main menu
        document.getElementById('mainMenu').style.display = 'flex';
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
    }
    
    showInitialScreen() {
        console.log('Showing initial start screen');
        this.currentScreen = 'initial';
        
        const initialScreen = document.getElementById('initialScreen');
        const resetButton = document.getElementById('resetButton');
        
        initialScreen.style.display = 'flex';
        
        // Remove existing event listener and add new one to avoid duplicates
        resetButton.replaceWith(resetButton.cloneNode(true));
        const newResetButton = document.getElementById('resetButton');
        
        // Handle reset button click
        newResetButton.addEventListener('click', () => {
            this.startGameExperience();
        });
    }

    startGameExperience() {
        console.log('Starting game experience...');
        
        // Enable audio immediately on user interaction
        this.enableAudioOnInteraction();
        
        // Hide initial screen
        document.getElementById('initialScreen').style.display = 'none';
        
        // Check for saved game
        this.checkForSavedGame();
        
        // Start splash screens
        this.showSplashScreens();
    }

    enableAudioOnInteraction() {
        this.audioEnabled = true;
        
        try {
            // Create AudioContext after user interaction
            console.log('Creating AudioContext after user interaction...');
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Generate music data
            this.generateSplashMusic();
            this.generateMainMenuMusic();
            
            console.log('AudioContext created successfully!');
            console.log('Audio context state:', this.audioContext.state);
            
            // Debug audio elements
            console.log('Checking audio elements:');
            console.log('gameAudio:', this.gameAudio);
            console.log('creditsAudio:', this.creditsAudio);
            console.log('levelMusicElements:', this.levelMusicElements);
            
            // Store permission for this session
            sessionStorage.setItem('cyberops_audio_enabled', 'true');
            
        } catch (error) {
            console.warn('Failed to create AudioContext:', error);
            this.audioEnabled = false;
        }
    }
    
    showSplashScreens() {
        console.log('Starting splash sequence');
        this.currentScreen = 'splash'; // Set screen state for skip functionality
        
        // Setup click skip functionality
        this.setupSplashSkip();
        
        // Start splash music immediately (audio is enabled from user interaction)
        console.log('Attempting to start splash music. audioEnabled:', this.audioEnabled);
        if (this.audioEnabled) {
            console.log('Audio is enabled, calling playSplashMusic()');
            this.playSplashMusic();
        } else {
            console.log('Audio not enabled yet - will start when user interacts');
        }
        
        // Show company logo
        const companyLogo = document.getElementById('companyLogo');
        companyLogo.style.display = 'flex';
        companyLogo.classList.add('show');
        console.log('Showing company logo splash');
        
        this.splashTimeout1 = setTimeout(() => {
            if (this.splashSkipped) return;
            companyLogo.classList.remove('show');
            setTimeout(() => {
                companyLogo.style.display = 'none';
            }, 1000); // Wait for fade-out transition
            console.log('Hiding company logo, showing studio logo');
            
            // Show studio logo
            const studioLogo = document.getElementById('studioLogo');
            studioLogo.style.display = 'flex';
            studioLogo.classList.add('show');
            
            this.splashTimeout2 = setTimeout(() => {
                if (this.splashSkipped) return;
                // Add explode fade-out effect
                studioLogo.classList.add('fade-out-explode');
                console.log('Studio logo explode animation');
                
                this.splashTimeout3 = setTimeout(() => {
                    if (this.splashSkipped) return;
                    studioLogo.classList.remove('show', 'fade-out-explode');
                    setTimeout(() => {
                        studioLogo.style.display = 'none';
                    }, 1000); // Wait for fade-out transition
                    console.log('Hiding studio logo, showing loading screen');
                    
                    // Show loading screen
                    const loadingScreen = document.getElementById('loadingScreen');
                    loadingScreen.style.display = 'flex';
                    
                    // Start progress bar animation
                    this.animateProgressBar(() => {
                        // After flash effect completes in animateProgressBar
                        loadingScreen.style.display = 'none';
                        
                        // Show main menu with fade-in effect
                        const mainMenu = document.getElementById('mainMenu');
                        mainMenu.style.display = 'flex';
                        mainMenu.style.opacity = '0';
                        mainMenu.classList.remove('fade-in-from-flash'); // Reset
                        
                        setTimeout(() => {  
                            mainMenu.classList.add('fade-in-from-flash');
                        }, 50);
                        
                        this.currentScreen = 'menu';
                        this.updateMenuState();
                        
                        // Let music continue naturally - no seeking needed for smooth progression
                        if (this.audioEnabled && this.gameAudio) {
                            console.log('Natural splash progression - music continues seamlessly without seeking');
                            // No currentTime change - let music flow naturally
                        }
                        
                        console.log('🎬 Natural splash progression - starting demoscene timer');
                        this.startDemosceneIdleTimer();
                        
                        // Remove splash click handlers
                        this.removeSplashClickHandlers();
                        
                        // Clean up after animation
                        setTimeout(() => {
                            mainMenu.classList.remove('fade-in-from-flash');
                            mainMenu.style.opacity = '';
                        }, 4600); // Match new animation duration
                    });
                }, 500); // Explode animation duration
            }, 3000);  // Studio logo duration 
        }, 3000);  // Company logo duration
    }
    
    setupSplashSkip() {
        this.splashSkipped = false;
        
        const skipHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            if (!this.splashSkipped && this.currentScreen === 'splash') {
                // Don't skip immediately - first start music for current splash screen
                if (!this.audioEnabled) {
                    // This will trigger audio activation and start splash music
                    console.log('Starting audio from splash screen click...');
                    return; // Let the audio interaction handler take care of it
                } else {
                    // Audio is already enabled, now skip
                    this.skipToMainMenu();
                }
            }
        };
        
        // Add click listeners to all splash screens
        document.getElementById('companyLogo').addEventListener('click', skipHandler);
        document.getElementById('studioLogo').addEventListener('click', skipHandler);
        document.getElementById('loadingScreen').addEventListener('click', skipHandler);
        
        // Store handler for cleanup
        this.splashClickHandler = skipHandler;
    }
    
    skipToMainMenu() {
        this.splashSkipped = true;
        
        // Clear all splash timeouts
        if (this.splashTimeout1) clearTimeout(this.splashTimeout1);
        if (this.splashTimeout2) clearTimeout(this.splashTimeout2);
        if (this.splashTimeout3) clearTimeout(this.splashTimeout3);
        if (this.progressAnimationFrame) cancelAnimationFrame(this.progressAnimationFrame);
        
        // Hide all splash screens immediately
        document.getElementById('companyLogo').style.display = 'none';
        document.getElementById('studioLogo').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'none';
        
        // Remove any classes
        const companyLogo = document.getElementById('companyLogo');
        const studioLogo = document.getElementById('studioLogo');
        companyLogo.classList.remove('show');
        studioLogo.classList.remove('show', 'fade-out-explode');
        
        // Skip directly to main menu with fade effect
        this.finalizeSplashToMenu();
    }
    
    finalizeSplashToMenu() {
        console.log('🎬 finalizeSplashToMenu() called - transitioning to main menu');
        
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        mainMenu.style.opacity = '0';
        mainMenu.classList.remove('fade-in-from-flash');
        
        setTimeout(() => {
            mainMenu.classList.add('fade-in-from-flash');
        }, 50);
        
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        console.log('🎬 Starting demoscene idle timer from finalizeSplashToMenu');
        // Start demoscene idle timer
        this.startDemosceneIdleTimer();
        
        // Seek to main menu section if skipped, or let it continue naturally
        if (this.audioEnabled) {
            if (this.splashSkipped) {
                // If skipped, seek to 10.7 seconds (main menu section)
                console.log('Splash skipped - seeking to menu music section');
                this.playMainMenuMusic();
            } else {
                // If natural progression, music continues seamlessly without seeking
                console.log('Natural splash transition - music continues without artifacts');
                // No currentTime change - avoid audio artifacts from seeking
            }
        }
        
        // Remove splash click handlers
        this.removeSplashClickHandlers();
        
        // Clean up after animation
        setTimeout(() => {
            mainMenu.classList.remove('fade-in-from-flash');
            mainMenu.style.opacity = '';
        }, 4600);
    }

    removeSplashClickHandlers() {
        if (this.splashClickHandler) {
            document.getElementById('companyLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('studioLogo').removeEventListener('click', this.splashClickHandler);
            document.getElementById('loadingScreen').removeEventListener('click', this.splashClickHandler);
            this.splashClickHandler = null;
        }
    }

    // Demoscene Attract Mode System
    startDemosceneIdleTimer() {
        console.log('🎬 startDemosceneIdleTimer() called:');
        console.log('- currentScreen:', this.currentScreen);
        console.log('- demosceneActive:', this.demosceneActive);
        console.log('- DEMOSCENE_IDLE_TIMEOUT:', this.DEMOSCENE_IDLE_TIMEOUT);
        
        // Clear existing timer
        this.clearDemosceneTimer();
        
        if (this.currentScreen === 'menu' && !this.demosceneActive) {
            console.log('✅ Starting demoscene idle timer (' + this.DEMOSCENE_IDLE_TIMEOUT + ' ms)');
            this.demosceneTimer = setTimeout(() => {
                console.log('⏰ Demoscene timer fired! Checking conditions...');
                console.log('- currentScreen at timeout:', this.currentScreen);
                console.log('- demosceneActive at timeout:', this.demosceneActive);
                if (this.currentScreen === 'menu' && !this.demosceneActive) {
                    console.log('🎬 Starting demoscene!');
                    this.showDemoscene();
                } else {
                    console.log('❌ Demoscene conditions not met at timeout');
                }
            }, this.DEMOSCENE_IDLE_TIMEOUT);
        } else {
            console.log('❌ Not starting demoscene timer - conditions not met');
            console.log('  - currentScreen === "menu":', this.currentScreen === 'menu');
            console.log('  - !demosceneActive:', !this.demosceneActive);
        }
    }
    
    clearDemosceneTimer() {
        if (this.demosceneTimer) {
            clearTimeout(this.demosceneTimer);
            this.demosceneTimer = null;
        }
    }
    
    showDemoscene() {
        if (this.currentScreen !== 'menu') return;
        
        console.log('Starting demoscene attract mode');
        this.demosceneActive = true;
        this.currentScreen = 'demoscene';
        
        // Hide main menu
        document.getElementById('mainMenu').style.display = 'none';
        
        // Show demoscene
        const demosceneScreen = document.getElementById('demoscene');
        demosceneScreen.style.display = 'flex';
        
        // Add click handler to interrupt demoscene
        this.setupDemosceneInterrupt();
        
        // Add subtle animation delays for visual appeal
        this.animateDemosceneElements();
    }
    
    setupDemosceneInterrupt() {
        const demosceneScreen = document.getElementById('demoscene');
        
        const interruptHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.interruptDemoscene();
        };
        
        // Add listeners for any interaction
        demosceneScreen.addEventListener('click', interruptHandler, { once: true });
        demosceneScreen.addEventListener('touchstart', interruptHandler, { once: true });
        demosceneScreen.addEventListener('keydown', interruptHandler, { once: true });
        
        // Store handler for cleanup
        this.demosceneInterruptHandler = interruptHandler;
    }
    
    interruptDemoscene() {
        if (!this.demosceneActive) return;
        
        console.log('Demoscene interrupted, returning to main menu');
        this.demosceneActive = false;
        this.currentScreen = 'menu';
        
        // Hide demoscene
        document.getElementById('demoscene').style.display = 'none';
        
        // Show main menu
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        
        // Restart idle timer
        this.startDemosceneIdleTimer();
        
        // Clean up interrupt handlers
        this.removeDemosceneInterruptHandlers();
    }
    
    removeDemosceneInterruptHandlers() {
        const demosceneScreen = document.getElementById('demoscene');
        if (this.demosceneInterruptHandler && demosceneScreen) {
            demosceneScreen.removeEventListener('click', this.demosceneInterruptHandler);
            demosceneScreen.removeEventListener('touchstart', this.demosceneInterruptHandler);
            demosceneScreen.removeEventListener('keydown', this.demosceneInterruptHandler);
            this.demosceneInterruptHandler = null;
        }
    }
    
    animateDemosceneElements() {
        // Add staggered animation delays to lore sections
        const loreSections = document.querySelectorAll('.lore-section');
        loreSections.forEach((section, index) => {
            section.style.animationDelay = `${index * 0.3}s`;
        });
        
        // Add staggered animation delays to features
        const featureItems = document.querySelectorAll('.feature-item');
        featureItems.forEach((item, index) => {
            item.style.animationDelay = `${0.5 + index * 0.2}s`;
        });
        
        // Animate stat bars with proper widths
        setTimeout(() => {
            const corporateFill = document.querySelector('.corporate-fill');
            const resistanceFill = document.querySelector('.resistance-fill');
            const syndicateFill = document.querySelector('.syndicate-fill');
            
            if (corporateFill) corporateFill.style.width = '87%';
            if (resistanceFill) resistanceFill.style.width = '13%';
            if (syndicateFill) syndicateFill.style.width = '7%';
        }, 1000);
    }

    // User Activity Detection (for resetting demoscene timer)
    resetDemosceneTimer() {
        if (this.currentScreen === 'menu' && !this.demosceneActive) {
            this.startDemosceneIdleTimer();
        }
    }
    
    // Audio System
    initializeAudio() {
        // Initialize audio variables - DON'T create AudioContext yet!
        this.audioContext = null;
        this.splashMusicNode = null;
        this.mainMenuMusicNode = null;
        this.levelMusicNode = null; // Fix: Added missing level music node
        this.creditsMusicNode = null; // Fix: Added missing credits music node
        this.audioEnabled = false; // Start with audio disabled
        this.splashMusicData = null;
        this.mainMenuMusicData = null;
        
        // Get HTML5 audio elements
        this.gameAudio = document.getElementById('gameMusic');
        
        // Get level music elements
        this.levelMusicElements = {
            1: document.getElementById('levelMusic1'),
            2: document.getElementById('levelMusic2'),
            3: document.getElementById('levelMusic3'),
            4: document.getElementById('levelMusic4'),
            5: document.getElementById('levelMusic5')
        };
        
        // Get credits music element
        this.creditsAudio = document.getElementById('creditsMusic');
        
        // Set initial volume for all audio elements
        if (this.gameAudio) this.gameAudio.volume = 0.25;
        
        Object.values(this.levelMusicElements).forEach(audio => {
            if (audio) {
                audio.volume = 0.3; // Slightly higher volume for level music
                audio.loop = true; // Loop level music
            }
        });
        
        // Set initial volume for credits music
        if (this.creditsAudio) {
            this.creditsAudio.volume = 0.2; // Lower volume for credits
        }
        
        // Track current level music
        this.currentLevelMusic = null;
        this.currentLevelMusicElement = null;
        
        // Track level music interval for procedural music
        this.levelMusicInterval = null;
        
        // Track credits music state
        this.creditsPlaying = false;
        
        console.log('Audio system initialized, waiting for user interaction...');
    }
    
    enableAudioImmediately() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSplashMusic();
            this.generateMainMenuMusic();
            this.audioEnabled = true;
            
            console.log('Audio enabled from session storage');
            console.log('Audio context state:', this.audioContext.state);
            
            // Try to resume immediately, but setup fallback for user interaction
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed successfully from session');
                    this.startAppropriateMusic();
                }).catch(() => {
                    console.log('Audio resume failed, setting up one-time interaction handler');
                    this.setupOneTimeResume();
                });
            } else {
                this.startAppropriateMusic();
            }
            
        } catch (error) {
            console.warn('Failed to create AudioContext from session:', error);
            this.audioEnabled = false;
        }
    }

    startAppropriateMusic() {
        // Start appropriate music based on current screen
        setTimeout(() => {
            if (this.currentScreen === 'splash') {
                this.playSplashMusic();
            } else if (this.currentScreen === 'menu') {
                this.playMainMenuMusic();
            }
        }, 100);
    }

    setupOneTimeResume() {
        const resumeHandler = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('Audio context resumed on user interaction');
                    this.startAppropriateMusic();
                });
            }
            // Remove listeners
            document.removeEventListener('click', resumeHandler);
            document.removeEventListener('touchstart', resumeHandler);
            document.removeEventListener('keydown', resumeHandler);
        };
        
        document.addEventListener('click', resumeHandler, { once: true });
        document.addEventListener('touchstart', resumeHandler, { once: true });
        document.addEventListener('keydown', resumeHandler, { once: true });
    }
    
    generateSplashMusic() {
        // Cyberpunk demoscene style splash melody (covers ~9 seconds of splashes)
        this.splashMusicData = {
            tempo: 140, // Faster, more energetic
            notes: [
                // Intro arpeggio (company logo - 3 seconds)
                { freq: 220.00, duration: 0.3 }, // A3
                { freq: 261.63, duration: 0.3 }, // C4
                { freq: 329.63, duration: 0.3 }, // E4
                { freq: 440.00, duration: 0.3 }, // A4
                { freq: 523.25, duration: 0.3 }, // C5
                { freq: 659.25, duration: 0.3 }, // E5
                { freq: 880.00, duration: 0.6 }, // A5
                { freq: 0, duration: 0.3 }, // Rest
                
                // Main pulse (studio logo - 3 seconds)
                { freq: 146.83, duration: 0.4 }, // D3 (bass)
                { freq: 293.66, duration: 0.2 }, // D4
                { freq: 369.99, duration: 0.2 }, // F#4
                { freq: 440.00, duration: 0.4 }, // A4
                { freq: 146.83, duration: 0.4 }, // D3 (bass)
                { freq: 293.66, duration: 0.2 }, // D4
                { freq: 392.00, duration: 0.2 }, // G4
                { freq: 466.16, duration: 0.4 }, // A#4
                { freq: 0, duration: 0.2 }, // Rest
                
                // Climax sequence (loading screen - 3 seconds)
                { freq: 174.61, duration: 0.3 }, // F3
                { freq: 220.00, duration: 0.3 }, // A3
                { freq: 277.18, duration: 0.3 }, // C#4
                { freq: 349.23, duration: 0.3 }, // F4
                { freq: 440.00, duration: 0.3 }, // A4
                { freq: 554.37, duration: 0.3 }, // C#5
                { freq: 698.46, duration: 0.6 }, // F5
                { freq: 880.00, duration: 0.6 }, // A5 (peak)
                { freq: 0, duration: 0.3 }, // Final rest
            ]
        };
        console.log('Cyberpunk splash music generated (9 seconds)');
    }
    
    generateMainMenuMusic() {
        // Atmospheric cyberpunk main menu ambient (looping)
        this.mainMenuMusicData = {
            tempo: 85, // Slower, more atmospheric
            notes: [
                // Dark ambient pad
                { freq: 130.81, duration: 1.5 }, // C3 (deep bass)
                { freq: 164.81, duration: 1.0 }, // E3
                { freq: 196.00, duration: 1.0 }, // G3
                { freq: 220.00, duration: 1.5 }, // A3
                { freq: 0, duration: 0.5 }, // Rest
                
                // Cyberpunk arpeggiated sequence
                { freq: 261.63, duration: 0.4 }, // C4
                { freq: 311.13, duration: 0.4 }, // D#4
                { freq: 369.99, duration: 0.4 }, // F#4
                { freq: 440.00, duration: 0.8 }, // A4
                { freq: 523.25, duration: 0.4 }, // C5
                { freq: 622.25, duration: 0.4 }, // D#5
                { freq: 739.99, duration: 0.4 }, // F#5
                { freq: 880.00, duration: 1.2 }, // A5
                
                // Descending resolution
                { freq: 783.99, duration: 0.6 }, // G5
                { freq: 659.25, duration: 0.6 }, // E5
                { freq: 523.25, duration: 0.6 }, // C5
                { freq: 440.00, duration: 1.2 }, // A4
                { freq: 0, duration: 1.0 }, // Long rest before loop
            ]
        };
        console.log('Atmospheric cyberpunk menu music generated');
    }
    
    playProcedualMusic(musicData) {
        if (!this.audioContext || !musicData) return null;
        
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime); // Slightly louder for better presence
        
        let currentTime = this.audioContext.currentTime;
        
        const playSequence = () => {
            musicData.notes.forEach((note) => {
                if (note.freq > 0) {
                    const oscillator = this.audioContext.createOscillator();
                    const noteGain = this.audioContext.createGain();
                    
                    // Use square wave for authentic 8-bit sound with slight variation
                    oscillator.type = note.freq < 300 ? 'sawtooth' : 'square'; // Bass uses sawtooth, highs use square
                    oscillator.frequency.setValueAtTime(note.freq, currentTime);
                    
                    // Enhanced envelope for more dynamic 8-bit sound
                    noteGain.gain.setValueAtTime(0, currentTime);
                    noteGain.gain.linearRampToValueAtTime(0.4, currentTime + 0.02);
                    noteGain.gain.linearRampToValueAtTime(0.3, currentTime + note.duration * 0.3);
                    noteGain.gain.exponentialRampToValueAtTime(0.05, currentTime + note.duration);
                    
                    oscillator.connect(noteGain);
                    noteGain.connect(gainNode);
                    
                    oscillator.start(currentTime);
                    oscillator.stop(currentTime + note.duration);
                }
                currentTime += note.duration;
            });
            
            // Schedule next repetition
            setTimeout(() => {
                if (gainNode.context.state === 'running') {
                    playSequence();
                }
            }, (currentTime - this.audioContext.currentTime) * 1000);
        };
        
        // Only play if audio context exists and is running
        if (this.audioContext && this.audioContext.state === 'running') {
            playSequence();
        } else if (this.audioContext) {
            console.log('Audio context not running, state:', this.audioContext.state);
        } else {
            console.log('Audio context not created yet');
        }
        
        return gainNode;
    }
    
    playSplashMusic() {
        console.log('playSplashMusic called:');
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- gameAudio exists:', !!this.gameAudio);
        console.log('- gameAudio element:', this.gameAudio);
        
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping splash music');
            return;
        }
        
        if (!this.gameAudio) {
            console.warn('Game audio element not found, falling back to procedural music');
            this.playProceduralSplashMusic();
            return;
        }
        
        console.log('Starting splash music from beginning...');
        console.log('- gameAudio.src:', this.gameAudio.src || this.gameAudio.currentSrc);
        console.log('- gameAudio.readyState:', this.gameAudio.readyState);
        console.log('- gameAudio.networkState:', this.gameAudio.networkState);
        
        // Start from beginning (splash part: 0-10.6 seconds)
        this.gameAudio.currentTime = 0;
        this.gameAudio.play().then(() => {
            console.log('✅ Game music started successfully from splash section');
            console.log('- currentTime:', this.gameAudio.currentTime);
            console.log('- duration:', this.gameAudio.duration);
        }).catch(error => {
            console.warn('❌ Failed to play game music:', error);
            console.log('Falling back to procedural splash music...');
            // Fallback to procedural music if WAV fails
            this.playProceduralSplashMusic();
        });
    }
    
    stopSplashMusic() {
        // Don't actually stop the music - just note that splash section is over
        console.log('Splash music section completed, transitioning to menu section');
        
        // Stop procedural music if it's playing as fallback
        if (this.splashMusicNode) {
            this.splashMusicNode.disconnect();
            this.splashMusicNode = null;
        }
    }
    
    playMainMenuMusic() {
        console.log('playMainMenuMusic called:');
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- gameAudio exists:', !!this.gameAudio);
        console.log('- MUSIC_MENU_START_TIME:', this.MUSIC_MENU_START_TIME);
        
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping main menu music');
            return;
        }
        
        if (!this.gameAudio) {
            console.warn('Game audio element not found, falling back to procedural music');
            this.playProceduralMainMenuMusic();
            return;
        }
        
        console.log('Transitioning to main menu music section...');
        console.log('- Current time before seek:', this.gameAudio.currentTime);
        console.log('- Seeking to:', this.MUSIC_MENU_START_TIME);
        
        // Seek to main menu section (after 10.6 seconds of splash music)
        this.gameAudio.currentTime = this.MUSIC_MENU_START_TIME;
        
        // Make sure music is playing
        if (this.gameAudio.paused) {
            this.gameAudio.play().then(() => {
                console.log('✅ Game music resumed from menu section (' + this.MUSIC_MENU_START_TIME + 's)');
                console.log('- Actual currentTime after seek:', this.gameAudio.currentTime);
            }).catch(error => {
                console.warn('❌ Failed to resume game music at menu section:', error);
                console.log('Falling back to procedural main menu music...');
                // Fallback to procedural music if WAV fails
                this.playProceduralMainMenuMusic();
            });
        } else {
            console.log('✅ Game music seeked to menu section (' + this.MUSIC_MENU_START_TIME + 's)');
            console.log('- Actual currentTime after seek:', this.gameAudio.currentTime);
        }
    }
    
    stopMainMenuMusic() {
        if (this.gameAudio && !this.gameAudio.paused) {
            this.gameAudio.pause();
            this.gameAudio.currentTime = 0;
            console.log('Game music stopped completely');
        }
        
        // Stop procedural music if it's playing as fallback
        if (this.mainMenuMusicNode) {
            this.mainMenuMusicNode.disconnect();
            this.mainMenuMusicNode = null;
        }
        
        if (this.mainMenuMusicInterval) {
            clearInterval(this.mainMenuMusicInterval);
            this.mainMenuMusicInterval = null;
        }
    }

    // Level Music System
    playLevelMusic(levelNumber) {
        console.log(`🎵 playLevelMusic(${levelNumber}) called:`);
        console.log('- audioEnabled:', this.audioEnabled);
        console.log('- levelMusicElements:', this.levelMusicElements);
        
        if (!this.audioEnabled) {
            console.log('❌ Audio not enabled, skipping level music');
            return;
        }
        
        console.log(`🎮 Starting level ${levelNumber} music...`);
        
        // Stop any current level music (starting new level)
        this.stopLevelMusic();
        
        // Stop main menu music  
        this.stopMainMenuMusic();
        
        // Get the audio element for this level
        const levelAudio = this.levelMusicElements[levelNumber];
        console.log(`- levelAudio for level ${levelNumber}:`, levelAudio);
        
        if (!levelAudio) {
            console.warn(`❌ No audio element found for level ${levelNumber}, falling back to procedural music`);
            this.playProceduralLevelMusic(levelNumber);
            return;
        }
        
        console.log(`- levelAudio.src:`, levelAudio.src || levelAudio.currentSrc);
        console.log(`- levelAudio.readyState:`, levelAudio.readyState);
        
        // Set current level music tracking
        this.currentLevelMusic = levelNumber;
        this.currentLevelMusicElement = levelAudio;
        
        // Play the level music
        levelAudio.currentTime = 0;
        levelAudio.play().then(() => {
            console.log(`✅ Level ${levelNumber} music started successfully`);
        }).catch(error => {
            console.warn(`❌ Failed to play level ${levelNumber} music:`, error);
            console.log('🎵 Falling back to procedural level music...');
            this.playProceduralLevelMusic(levelNumber);
        });
    }
    
    stopLevelMusic() {
        console.log('🛑 stopLevelMusic() called:');
        console.log('- currentLevelMusicElement exists:', !!this.currentLevelMusicElement);
        console.log('- currentLevelMusic:', this.currentLevelMusic);
        console.log('- levelMusicNode exists:', !!this.levelMusicNode);
        
        if (this.currentLevelMusicElement) {
            this.currentLevelMusicElement.pause();
            this.currentLevelMusicElement.currentTime = 0;
            console.log(`✅ Level ${this.currentLevelMusic} HTML5 music stopped`);
        }
        
        this.currentLevelMusic = null;
        this.currentLevelMusicElement = null;
        
        // Also stop any procedural level music
        if (this.levelMusicNode) {
            this.levelMusicNode.disconnect();
            this.levelMusicNode = null;
            console.log('✅ Procedural level music stopped');
        }
        
        // Clear level music interval
        if (this.levelMusicInterval) {
            clearInterval(this.levelMusicInterval);
            this.levelMusicInterval = null;
            console.log('✅ Level music interval cleared');
        }
    }
    
    pauseLevelMusic() {
        if (this.currentLevelMusicElement && !this.currentLevelMusicElement.paused) {
            this.currentLevelMusicElement.pause();
            console.log(`Level ${this.currentLevelMusic} music paused`);
        }
    }
    
    resumeLevelMusic() {
        if (this.currentLevelMusicElement && this.currentLevelMusicElement.paused) {
            this.currentLevelMusicElement.play().then(() => {
                console.log(`Level ${this.currentLevelMusic} music resumed`);
            }).catch(error => {
                console.warn('Failed to resume level music:', error);
            });
        }
    }
    
    // Fallback procedural music for levels
    playProceduralLevelMusic(levelNumber) {
        console.log(`🎵 playProceduralLevelMusic(${levelNumber}) called:`);
        console.log('- audioContext:', this.audioContext);
        console.log('- audioContext state:', this.audioContext ? this.audioContext.state : 'null');
        
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural level music');
            return;
        }
        
        console.log(`🎶 Playing procedural music for level ${levelNumber} as fallback`);
        
        // Generate different music data based on level
        const levelMusicData = this.generateLevelMusicData(levelNumber);
        console.log('- levelMusicData generated:', levelMusicData);
        
        // Stop any existing level music node first
        if (this.levelMusicNode) {
            console.log('- Stopping previous procedural level music');
            this.levelMusicNode.disconnect();
            this.levelMusicNode = null;
        }
        
        // Clear any level music interval
        if (this.levelMusicInterval) {
            clearInterval(this.levelMusicInterval);
            this.levelMusicInterval = null;
        }
        
        this.levelMusicNode = this.playProcedualMusic(levelMusicData);
        console.log('- levelMusicNode created:', !!this.levelMusicNode);
        
        // Set up loop interval for continuous play (in case the music stops)
        const totalDuration = levelMusicData.notes.reduce((sum, note) => sum + note.duration, 0) * 1000; // Convert to milliseconds
        this.levelMusicInterval = setInterval(() => {
            if (this.levelMusicNode && this.audioContext && this.audioContext.state === 'running') {
                // Music should be looping via the playProcedualMusic function
                console.log(`🔄 Level ${levelNumber} procedural music loop check - still running`);
            }
        }, totalDuration + 1000); // Check slightly after each loop should complete
    }
    
    generateLevelMusicData(levelNumber) {
        // Create different musical themes for each level
        const levelThemes = {
            1: { // Corporate Infiltration - Tense, electronic
                tempo: 120,
                baseFreq: 220,
                pattern: [1, 0.75, 1, 1.25, 0.5, 1, 1.5, 0.75]
            },
            2: { // Government Hack - Dark, methodical  
                tempo: 100,
                baseFreq: 196,
                pattern: [1, 1, 0.5, 1.5, 1, 0.75, 1.25, 1]
            },
            3: { // Industrial Sabotage - Heavy, rhythmic
                tempo: 140,
                baseFreq: 146,
                pattern: [2, 1, 2, 1, 1.5, 1, 2, 0.5]
            },
            4: { // Assassination - Stealthy, ambient
                tempo: 90,
                baseFreq: 261,
                pattern: [0.5, 1, 0.75, 1.5, 0.5, 1.25, 1, 0.75]
            },
            5: { // Final Fortress - Epic, intense
                tempo: 160,
                baseFreq: 174,
                pattern: [2, 1.5, 2, 1, 1.5, 2, 1, 1.5]
            }
        };
        
        const theme = levelThemes[levelNumber] || levelThemes[1];
        const notes = [];
        
        // Generate notes based on theme pattern
        theme.pattern.forEach(multiplier => {
            notes.push({ freq: theme.baseFreq * multiplier, duration: 0.5 });
        });
        
        return {
            tempo: theme.tempo,
            notes: notes
        };
    }

    // Credits Music System
    playCreditsMusic() {
        if (!this.audioEnabled) {
            console.log('Audio not enabled, skipping credits music');
            return;
        }
        
        if (this.creditsPlaying) {
            console.log('Credits music already playing, not restarting');
            return; // Don't restart if already playing
        }
        
        console.log('Starting credits music...');
        console.log('- creditsAudio exists:', !!this.creditsAudio);
        console.log('- creditsAudio element:', this.creditsAudio);
        
        // Stop any current level music and main menu music (credits starting)
        this.stopLevelMusic();
        this.stopMainMenuMusic();
        
        if (!this.creditsAudio) {
            console.warn('No credits audio element found, falling back to procedural music');
            this.playProceduralCreditsMusic();
            return;
        }
        
        console.log('- creditsAudio.src:', this.creditsAudio.src || this.creditsAudio.currentSrc);
        console.log('- creditsAudio.readyState:', this.creditsAudio.readyState);
        
        this.creditsPlaying = true;
        
        // Play the credits music
        this.creditsAudio.currentTime = 0;
        this.creditsAudio.play().then(() => {
            console.log('✅ Credits music started successfully');
        }).catch(error => {
            console.warn('❌ Failed to play credits music:', error);
            console.log('Falling back to procedural credits music...');
            this.playProceduralCreditsMusic();
        });
    }
    
    stopCreditsMusic() {
        if (this.creditsAudio && this.creditsPlaying) {
            this.creditsAudio.pause();
            this.creditsAudio.currentTime = 0;
            console.log('Credits music stopped');
        }
        
        this.creditsPlaying = false;
        
        // Also stop procedural credits music if it's playing
        if (this.creditsMusicNode) {
            this.creditsMusicNode.disconnect();
            this.creditsMusicNode = null;
        }
    }
    
    // Fallback procedural credits music
    playProceduralCreditsMusic() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural credits music');
            return;
        }
        
        console.log('🎵 Playing procedural credits music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        this.creditsPlaying = true;
        
        // Generate triumphant, celebratory music data for credits
        const creditsMusicData = {
            tempo: 110, // Moderate, celebratory tempo
            notes: [
                { freq: 261.63, duration: 1.0 }, // C4
                { freq: 329.63, duration: 1.0 }, // E4
                { freq: 392.00, duration: 1.0 }, // G4
                { freq: 523.25, duration: 1.5 }, // C5
                { freq: 659.25, duration: 0.5 }, // E5
                { freq: 783.99, duration: 0.5 }, // G5
                { freq: 1046.5, duration: 2.0 }, // C6 (high, triumphant)
                { freq: 783.99, duration: 1.0 }, // G5
                { freq: 659.25, duration: 1.0 }, // E5
                { freq: 523.25, duration: 1.5 }, // C5
                { freq: 0, duration: 1.0 }, // Rest
            ]
        };
        
        console.log('- Credits music data:', creditsMusicData);
        this.creditsMusicNode = this.playProcedualMusic(creditsMusicData);
    }
    
    // Fallback procedural music functions
    playProceduralSplashMusic() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural splash music');
            return;
        }
        if (!this.splashMusicData) {
            console.log('❌ No splash music data available for procedural music');
            return;
        }
        console.log('🎵 Playing procedural splash music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        console.log('- Splash music data:', this.splashMusicData);
        this.splashMusicNode = this.playProcedualMusic(this.splashMusicData);
    }
    
    playProceduralMainMenuMusic() {
        if (!this.audioContext) {
            console.log('❌ No AudioContext available for procedural main menu music');
            return;
        }
        if (!this.mainMenuMusicData) {
            console.log('❌ No main menu music data available for procedural music');
            return;
        }
        console.log('🎵 Playing procedural main menu music as fallback');
        console.log('- AudioContext state:', this.audioContext.state);
        console.log('- Main menu music data:', this.mainMenuMusicData);
        this.mainMenuMusicNode = this.playProcedualMusic(this.mainMenuMusicData);
        // Loop the music every ~13 seconds
        this.mainMenuMusicInterval = setInterval(() => {
            if (this.mainMenuMusicNode) {
                this.mainMenuMusicNode.disconnect();
            }
            this.mainMenuMusicNode = this.playProcedualMusic(this.mainMenuMusicData);
        }, 13000);
    }
    
    // Setup audio interaction handler (browser autoplay policy)
    setupAudioInteraction() {
        const enableAudio = () => {
            if (!this.audioEnabled) {
                this.audioEnabled = true;
                
                try {
                    // NOW create AudioContext after user interaction
                    console.log('Creating AudioContext after user interaction...');
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    
                    // Generate music data
                    this.generateSplashMusic();
                    this.generateMainMenuMusic();
                    
                    console.log('AudioContext created successfully!');
                    console.log('Audio context state:', this.audioContext.state);
                    
                    // Start appropriate music based on current screen
                    if (this.currentScreen === 'splash') {
                        this.playSplashMusic();
                    } else if (this.currentScreen === 'menu') {
                        this.playMainMenuMusic();
                    }
                    
                    console.log('Audio enabled after user interaction');
                    console.log('Current screen:', this.currentScreen);
                    
                    // Store permission in session storage to avoid re-asking after F5
                    sessionStorage.setItem('cyberops_audio_enabled', 'true');
                    
                } catch (error) {
                    console.warn('Failed to create AudioContext:', error);
                    this.audioEnabled = false;
                }
            }
        };
        
        // Listen for any user interaction to enable audio
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        
        const setupInteraction = (event) => {
            enableAudio();
            
            // After enabling audio, check if this was a skip click
            if (event.type === 'click' && this.currentScreen === 'splash') {
                // Give audio a moment to start, then allow skipping
                setTimeout(() => {
                    if (event.target.closest('#companyLogo') || 
                        event.target.closest('#studioLogo') || 
                        event.target.closest('#loadingScreen')) {
                        console.log('Skip triggered after audio enabled');
                        this.skipToMainMenu();
                    }
                }, 500); // Half second to hear splash music before skipping
            }
            
            // Remove all listeners after first interaction
            interactionEvents.forEach(eventType => {
                document.removeEventListener(eventType, setupInteraction);
            });
        };
        
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, setupInteraction, { once: true });
        });
    }
    
    // Handle audio resume (used internally)
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            return this.audioContext.resume().then(() => {
                console.log('Audio context resumed successfully');
                return true;
            }).catch(() => {
                console.log('Failed to resume audio context');
                return false;
            });
        }
        return Promise.resolve(true);
    }
    
    animateProgressBar(callback) {
        const progressBar = document.querySelector('.loading-progress');
        const gameTitle = document.querySelector('.loading-screen .game-title');
        
        // Reset progress bar
        progressBar.style.width = '0%';
        progressBar.style.transition = 'width 3s ease-out';
        
        // Start progress animation
        setTimeout(() => {
            progressBar.style.width = '100%';
        }, 100);
        
        // After progress completes, trigger beam effect
        setTimeout(() => {
            // Add beam effect to game title
            if (gameTitle) {
                gameTitle.classList.add('beam-sweep');
                
                // After beam completes, trigger flash effect
                setTimeout(() => {
                    gameTitle.classList.remove('beam-sweep');
                    
                    // Trigger flash/blind effect
                    this.triggerFlashTransition(() => {
                        if (callback) callback();
                    });
                }, 1000); // Beam animation duration
            } else {
                if (callback) callback();
            }
        }, 3000); // Progress bar duration
    }
    
    triggerFlashTransition(callback) {
        // Create flash overlay
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'flash-overlay';
        document.body.appendChild(flashOverlay);
        
        // Trigger flash animation
        setTimeout(() => {
            flashOverlay.classList.add('flash-active');
            
            // Right after flash peaks, immediately hide loading and show menu
            setTimeout(() => {
                // Call callback immediately (hides loading, shows menu)
                if (callback) callback();
                
                // Then start flash fade out
                flashOverlay.classList.add('flash-fade-out');
                
                // Remove overlay after fade completes
                setTimeout(() => {
                    document.body.removeChild(flashOverlay);
                }, 150); // Quick fade out
            }, 200); // Flash peak duration
        }, 50); // Brief delay before flash starts
    }
    
    // Game Loop
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        if (this.currentScreen === 'game' && !this.isPaused) {
            this.update();
        }
        
        if (this.currentScreen === 'game') {
            this.render();
        }
    }
    
    update() {
        this.missionTimer++;
        const seconds = Math.floor(this.missionTimer / 60);
        const minutes = Math.floor(seconds / 60);
        document.getElementById('missionTimer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        
        // Update agents
        this.agents.forEach(agent => {
            if (!agent.alive) return;
            
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.1) {
                const moveSpeed = agent.speed / 60;
                agent.x += (dx / dist) * moveSpeed;
                agent.y += (dy / dist) * moveSpeed;
            }
            
            for (let i = 0; i < agent.cooldowns.length; i++) {
                if (agent.cooldowns[i] > 0) agent.cooldowns[i]--;
            }
            
            if (agent.shieldDuration > 0) {
                agent.shieldDuration--;
                if (agent.shieldDuration === 0) agent.shield = 0;
            }
        });
        
        // Update enemies
        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            
            if (enemy.alertLevel > 0) {
                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.5) {
                    const moveSpeed = enemy.speed / 60;
                    enemy.x += (dx / dist) * moveSpeed;
                    enemy.y += (dy / dist) * moveSpeed;
                } else {
                    enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.5);
                }
            } else {
                if (Math.random() < 0.01) {
                    enemy.targetX = enemy.x + (Math.random() - 0.5) * 5;
                    enemy.targetY = enemy.y + (Math.random() - 0.5) * 5;
                }
                
                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.1) {
                    const moveSpeed = enemy.speed / 120;
                    enemy.x += (dx / dist) * moveSpeed;
                    enemy.y += (dy / dist) * moveSpeed;
                }
            }
            
            // Check vision
            this.agents.forEach(agent => {
                if (!agent.alive) return;
                const dist = Math.sqrt(
                    Math.pow(agent.x - enemy.x, 2) + 
                    Math.pow(agent.y - enemy.y, 2)
                );
                
                // Apply stealth bonuses to reduce detection range
                const effectiveVisionRange = this.getStealthDetectionRange(agent);
                
                if (dist < effectiveVisionRange) {
                    enemy.alertLevel = 100;
                    enemy.targetX = agent.x;
                    enemy.targetY = agent.y;
                    
                    if (Math.random() < 0.02 && dist < 5) {
                        this.projectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            targetX: agent.x,
                            targetY: agent.y,
                            damage: enemy.damage,
                            speed: 0.3,
                            owner: enemy.id,
                            hostile: true
                        });
                    }
                }
            });
        });
        
        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 0.5) {
                if (proj.hostile) {
                    this.agents.forEach(agent => {
                        const hitDist = Math.sqrt(
                            Math.pow(agent.x - proj.targetX, 2) + 
                            Math.pow(agent.y - proj.targetY, 2)
                        );
                        if (hitDist < 1) {
                            let actualDamage = proj.damage;
                            
                            // Apply protection bonus from equipment
                            if (agent.protection) {
                                actualDamage = Math.max(1, actualDamage - agent.protection);
                            }
                            
                            if (agent.shield > 0) {
                                agent.shield -= actualDamage;
                            } else {
                                agent.health -= actualDamage;
                                if (agent.health <= 0) agent.alive = false;
                            }
                        }
                    });
                } else {
                    this.enemies.forEach(enemy => {
                        const hitDist = Math.sqrt(
                            Math.pow(enemy.x - proj.targetX, 2) + 
                            Math.pow(enemy.y - proj.targetY, 2)
                        );
                        if (hitDist < 1) {
                            enemy.health -= proj.damage;
                            if (enemy.health <= 0) enemy.alive = false;
                        }
                    });
                }
                return false;
            }
            
            proj.x += (dx / dist) * proj.speed;
            proj.y += (dy / dist) * proj.speed;
            return true;
        });
        
        // Update effects
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            return effect.frame < effect.duration;
        });
        
        this.updateSquadHealth();
        if (this.agents.some(a => a.selected)) {
            this.updateCooldownDisplay();
        }
        
        this.checkMissionStatus();
    }
    
    checkMissionStatus() {
        const aliveAgents = this.agents.filter(a => a.alive).length;
        const aliveEnemies = this.enemies.filter(e => e.alive).length;
        const deadEnemies = this.enemies.filter(e => !e.alive).length;
        
        if (aliveAgents === 0) {
            this.endMission(false);
            return;
        }
        
        if (this.currentMission.id === 1) {
            document.getElementById('objectiveTracker').textContent = 
                aliveEnemies > 0 ? 
                `Eliminate enemies: ${deadEnemies}/${this.currentMission.enemies}` :
                'All enemies eliminated! Reach extraction!';
            
            if (aliveEnemies === 0) {
                const atExtraction = this.agents.some(agent => {
                    if (!agent.alive) return false;
                    const dist = Math.sqrt(
                        Math.pow(agent.x - this.map.extraction.x, 2) + 
                        Math.pow(agent.y - this.map.extraction.y, 2)
                    );
                    return dist < 2;
                });
                
                if (atExtraction) {
                    this.endMission(true);
                }
            }
        } else if (this.currentMission.id === 2) {
            const hackedCount = this.map.terminals.filter(t => t.hacked).length;
            const allHacked = hackedCount === this.map.terminals.length;
            
            document.getElementById('objectiveTracker').textContent = 
                !allHacked ? 
                `Hack terminals: ${hackedCount}/${this.map.terminals.length}` :
                'All terminals hacked! Reach extraction!';
            
            if (allHacked) {
                const atExtraction = this.agents.some(agent => {
                    if (!agent.alive) return false;
                    const dist = Math.sqrt(
                        Math.pow(agent.x - this.map.extraction.x, 2) + 
                        Math.pow(agent.y - this.map.extraction.y, 2)
                    );
                    return dist < 2;
                });
                
                if (atExtraction) {
                    this.endMission(true);
                }
            }
        } else if (this.currentMission.id === 3) {
            // Industrial Sabotage - Plant explosives on 3 targets
            const plantedCount = this.map.explosiveTargets ? this.map.explosiveTargets.filter(t => t.planted).length : 0;
            const allPlanted = plantedCount === 3;
            
            document.getElementById('objectiveTracker').textContent = 
                aliveEnemies > 0 ? 
                `Eliminate security: ${deadEnemies}/${this.currentMission.enemies} | Explosives: ${plantedCount}/3` :
                allPlanted ? 'All objectives complete! Extract all agents!' : 
                `Plant explosives: ${plantedCount}/3 | Eliminate remaining security`;
            
            if (aliveEnemies === 0 && allPlanted) {
                const atExtraction = this.agents.some(agent => {
                    if (!agent.alive) return false;
                    const dist = Math.sqrt(
                        Math.pow(agent.x - this.map.extraction.x, 2) + 
                        Math.pow(agent.y - this.map.extraction.y, 2)
                    );
                    return dist < 2;
                });
                
                if (atExtraction) {
                    this.endMission(true);
                }
            }
        } else if (this.currentMission.id === 4) {
            // Assassination Contract - Eliminate targets
            const primaryEliminated = this.map.targets ? this.map.targets.filter(t => t.type === 'primary' && t.eliminated).length : 0;
            const secondaryEliminated = this.map.targets ? this.map.targets.filter(t => t.type === 'secondary' && t.eliminated).length : 0;
            const allTargetsEliminated = primaryEliminated === 1 && secondaryEliminated === 2;
            
            document.getElementById('objectiveTracker').textContent = 
                `Primary targets: ${primaryEliminated}/1 | Secondary targets: ${secondaryEliminated}/2 | Witnesses: ${deadEnemies}/${this.currentMission.enemies}`;
            
            if (allTargetsEliminated && aliveEnemies === 0) {
                const atExtraction = this.agents.some(agent => {
                    if (!agent.alive) return false;
                    const dist = Math.sqrt(
                        Math.pow(agent.x - this.map.extraction.x, 2) + 
                        Math.pow(agent.y - this.map.extraction.y, 2)
                    );
                    return dist < 2;
                });
                
                if (atExtraction) {
                    this.endMission(true);
                }
            }
        } else if (this.currentMission.id === 5) {
            // Final Convergence - Breach gate, control sectors, capture mainframe
            const gateBreached = this.map.gates ? this.map.gates.filter(g => g.breached).length > 0 : false;
            const sectorsControlled = this.map.terminals ? this.map.terminals.filter(t => t.hacked).length : 0;
            const allObjectives = gateBreached && sectorsControlled === 3 && aliveEnemies === 0;
            
            document.getElementById('objectiveTracker').textContent = 
                `Gate: ${gateBreached ? 'Breached' : 'Secured'} | Sectors: ${sectorsControlled}/3 | Security: ${deadEnemies}/${this.currentMission.enemies}`;
            
            if (allObjectives) {
                this.endMission(true);
            }
        }
    }
    
    endMission(victory) {
        // Keep level music playing until next mission starts
        console.log('🎵 Level music continues after mission end');
        
        this.isPaused = true;
        
        // Update campaign statistics and rewards
        if (victory) {
            this.totalCampaignTime += this.missionTimer;
            // Count total available enemies for completed missions, not just killed ones
            this.totalEnemiesDefeated += this.currentMission.enemies;
            
            // Add to completed missions
            if (!this.completedMissions.includes(this.currentMission.id)) {
                this.completedMissions.push(this.currentMission.id);
            }
            
            // Award mission rewards
            if (this.currentMission.rewards) {
                this.credits += this.currentMission.rewards.credits || 0;
                this.researchPoints += this.currentMission.rewards.researchPoints || 0;
                this.worldControl += this.currentMission.rewards.worldControl || 0;
                
                // Cap world control at 100%
                if (this.worldControl > 100) this.worldControl = 100;
            }
        }
        
        // Show intermission dialog instead of end screen
        setTimeout(() => {
            this.showIntermissionDialog(victory);
        }, 1000); // Brief delay for dramatic effect
    }
    
    // Rendering
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.translate(this.cameraX, this.cameraY);
        ctx.scale(this.zoom, this.zoom);
        
        if (this.map) {
            this.renderMap();
            
            if (this.map.cover) {
                this.map.cover.forEach(cover => {
                    this.renderCover(cover.x, cover.y);
                });
            }
            
            if (this.map.terminals) {
                this.map.terminals.forEach(terminal => {
                    this.renderTerminal(terminal.x, terminal.y, terminal.hacked);
                });
            }
            
            if (this.map.explosiveTargets) {
                this.map.explosiveTargets.forEach(target => {
                    this.renderExplosiveTarget(target.x, target.y, target.planted);
                });
            }
            
            if (this.map.targets) {
                this.map.targets.forEach(target => {
                    this.renderAssassinationTarget(target.x, target.y, target.type, target.eliminated);
                });
            }
            
            if (this.map.gates) {
                this.map.gates.forEach(gate => {
                    this.renderGate(gate.x, gate.y, gate.breached);
                });
            }
            
            if (this.map.extraction) {
                this.renderExtractionPoint(this.map.extraction.x, this.map.extraction.y);
            }
        }
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) this.renderEnemy(enemy);
        });
        
        this.agents.forEach(agent => {
            if (agent.alive) this.renderAgent(agent);
        });
        
        this.projectiles.forEach(proj => {
            this.renderProjectile(proj);
        });
        
        this.effects.forEach(effect => {
            this.renderEffect(effect);
        });
        
        ctx.restore();
        
        this.renderMinimap();
    }
    
    renderMap() {
        const ctx = this.ctx;
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const tile = this.map.tiles[y][x];
                const isoPos = this.worldToIsometric(x, y);
                
                ctx.save();
                ctx.translate(isoPos.x, isoPos.y);
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.tileWidth / 2, this.tileHeight / 2);
                ctx.lineTo(0, this.tileHeight);
                ctx.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
                ctx.closePath();
                
                if (tile === 0) {
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fill();
                    ctx.strokeStyle = '#16213e';
                } else {
                    ctx.fillStyle = '#0f0f1e';
                    ctx.fill();
                    ctx.strokeStyle = '#2a2a3e';
                    ctx.fillStyle = '#1f1f3e';
                    ctx.fillRect(-this.tileWidth / 2, -20, this.tileWidth, 20);
                }
                
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            }
        }
    }
    
    renderCover(x, y) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.fillStyle = '#2a4a6a';
        ctx.fillRect(-15, -10, 30, 20);
        
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(0, -20);
        ctx.lineTo(15, -10);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = '#3a5a7a';
        ctx.fill();
        
        ctx.restore();
    }
    
    renderTerminal(x, y, hacked) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.fillStyle = hacked ? '#00ff00' : '#ff0000';
        ctx.fillRect(-10, -20, 20, 25);
        
        ctx.fillStyle = hacked ? '#00ff0044' : '#ff000044';
        ctx.fillRect(-8, -18, 16, 10);
        
        ctx.shadowColor = hacked ? '#00ff00' : '#ff0000';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = hacked ? '#00ff00' : '#ff0000';
        ctx.strokeRect(-10, -20, 20, 25);
        
        ctx.restore();
    }
    
    renderExtractionPoint(x, y) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        const pulse = Math.sin(this.missionTimer * 0.05) * 0.3 + 0.7;
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.3})`;
        ctx.fill();
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', 0, 0);
        
        ctx.restore();
    }
    
    renderAgent(agent) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(agent.x, agent.y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (agent.selected) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        if (agent.shield > 0) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, -10, 25, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.fillStyle = '#4a7c8c';
        ctx.fillRect(-10, -25, 20, 30);
        
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-8, -23, 16, 5);
        
        if (agent.health < agent.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-15, -35, 30, 4);
            
            const healthPercent = agent.health / agent.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                            healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(-15, -35, 30 * healthPercent, 4);
        }
        
        ctx.restore();
    }
    
    renderEnemy(enemy) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(enemy.x, enemy.y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (enemy.alertLevel > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${enemy.alertLevel / 100})`;
            ctx.beginPath();
            ctx.arc(0, -30, 5, 0, Math.PI * 2);
            ctx.fill();
            
            if (enemy.alertLevel > 50) {
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!', 0, -27);
            }
        }
        
        ctx.fillStyle = '#8c4a4a';
        ctx.fillRect(-10, -25, 20, 30);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-8, -23, 16, 5);
        
        if (enemy.alertLevel < 50) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, enemy.visionRange * 20, -Math.PI / 4, Math.PI / 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-15, -35, 30, 4);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-15, -35, 30 * (enemy.health / enemy.maxHealth), 4);
        }
        
        ctx.restore();
    }
    
    renderProjectile(proj) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(proj.x, proj.y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.strokeStyle = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const trailPos = this.worldToIsometric(
            proj.x - (proj.targetX - proj.x) * 0.1,
            proj.y - (proj.targetY - proj.y) * 0.1
        );
        ctx.lineTo(trailPos.x - isoPos.x, trailPos.y - isoPos.y);
        ctx.stroke();
        
        ctx.shadowColor = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.beginPath();
        ctx.arc(0, -10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    renderEffect(effect) {
        const ctx = this.ctx;
        
        if (effect.type === 'explosion') {
            const isoPos = this.worldToIsometric(effect.x, effect.y);
            
            ctx.save();
            ctx.translate(isoPos.x, isoPos.y);
            
            const progress = effect.frame / effect.duration;
            const radius = effect.radius * 20 * (1 + progress);
            const opacity = 1 - progress;
            
            ctx.fillStyle = `rgba(255, 100, 0, ${opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 200, 0, ${opacity})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else if (effect.type === 'hack') {
            const isoPos = this.worldToIsometric(effect.x, effect.y);
            
            ctx.save();
            ctx.translate(isoPos.x, isoPos.y);
            
            const progress = effect.frame / effect.duration;
            ctx.strokeStyle = `rgba(0, 255, 0, ${1 - progress})`;
            ctx.lineWidth = 2;
            
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, -20, 10 + i * 10 * progress, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.fillStyle = `rgba(0, 255, 0, ${1 - progress})`;
            ctx.font = '10px monospace';
            ctx.fillText('01001', -20, -30 - progress * 20);
            ctx.fillText('11010', 10, -25 - progress * 15);
            
            ctx.restore();
        } else if (effect.type === 'shield') {
            const agent = this.agents.find(a => a.id === effect.target);
            if (agent) {
                const isoPos = this.worldToIsometric(agent.x, agent.y);
                
                ctx.save();
                ctx.translate(isoPos.x, isoPos.y);
                
                const pulse = Math.sin(effect.frame * 0.1) * 0.2 + 0.8;
                ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.5})`;
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i;
                    const x = Math.cos(angle) * 25;
                    const y = Math.sin(angle) * 15 - 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                
                ctx.restore();
            }
        }
    }
    
    renderMinimap() {
        const minimap = document.getElementById('minimapContent');
        
        if (!this.minimapCanvas) {
            this.minimapCanvas = document.createElement('canvas');
            this.minimapCanvas.width = 120;
            this.minimapCanvas.height = 120;
            minimap.appendChild(this.minimapCanvas);
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
        
        const mctx = this.minimapCtx;
        mctx.clearRect(0, 0, 120, 120);
        
        if (!this.map) return;
        
        const scale = 120 / Math.max(this.map.width, this.map.height);
        
        mctx.fillStyle = '#1a1a2e';
        mctx.fillRect(0, 0, 120, 120);
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.tiles[y][x] === 1) {
                    mctx.fillStyle = '#0f0f1e';
                    mctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        this.agents.forEach(agent => {
            if (agent.alive) {
                mctx.fillStyle = agent.selected ? '#00ffff' : '#4a7c8c';
                mctx.fillRect(agent.x * scale - 2, agent.y * scale - 2, 4, 4);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                mctx.fillStyle = enemy.alertLevel > 0 ? '#ff0000' : '#8c4a4a';
                mctx.fillRect(enemy.x * scale - 2, enemy.y * scale - 2, 4, 4);
            }
        });
        
        if (this.map.extraction) {
            mctx.strokeStyle = '#00ffff';
            mctx.beginPath();
            mctx.arc(
                this.map.extraction.x * scale,
                this.map.extraction.y * scale,
                5, 0, Math.PI * 2
            );
            mctx.stroke();
        }
    }
    
    renderExplosiveTarget(x, y, planted) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (planted) {
            // Render planted explosive (red, pulsing)
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.strokeStyle = '#ff6666';
        } else {
            // Render target structure (gray)
            ctx.fillStyle = '#666666';
            ctx.strokeStyle = '#999999';
        }
        
        ctx.lineWidth = 2;
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeRect(-15, -15, 30, 30);
        
        // Add warning symbol or checkmark
        ctx.fillStyle = planted ? '#ffff00' : '#ffaa00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planted ? 'BOMB' : 'TARGET', 0, 0);
        
        ctx.restore();
    }
    
    renderAssassinationTarget(x, y, type, eliminated) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (eliminated) {
            // Render eliminated target (dark red)
            ctx.fillStyle = '#440000';
            ctx.strokeStyle = '#ff0000';
        } else if (type === 'primary') {
            // Primary target (bright red)
            ctx.fillStyle = '#cc0000';
            ctx.strokeStyle = '#ff6666';
        } else {
            // Secondary target (orange)
            ctx.fillStyle = '#cc6600';
            ctx.strokeStyle = '#ff9966';
        }
        
        const pulse = eliminated ? 0.3 : Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -10, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add target symbol
        ctx.fillStyle = eliminated ? '#666666' : '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(eliminated ? 'DEAD' : (type === 'primary' ? 'P' : 'S'), 0, -10);
        
        ctx.restore();
    }
    
    renderGate(x, y, breached) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (breached) {
            // Render breached gate (broken, smoking)
            ctx.fillStyle = '#333333';
            ctx.strokeStyle = '#666666';
        } else {
            // Render intact gate (metallic)
            ctx.fillStyle = '#555555';
            ctx.strokeStyle = '#888888';
        }
        
        ctx.lineWidth = 3;
        ctx.fillRect(-25, -20, 50, 40);
        ctx.strokeRect(-25, -20, 50, 40);
        
        // Add gate details
        if (breached) {
            // Add explosion/damage effects
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(-20, -15, 15, 10);
            ctx.fillRect(5, -10, 15, 8);
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BREACH', 0, 0);
        } else {
            // Add lock symbol
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GATE', 0, 0);
        }
        
        ctx.restore();
    }
}

// Initialize game
const game = new CyberOpsGame();

// Prevent pull-to-refresh
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) return;
    if (document.documentElement.scrollTop === 0) {
        e.preventDefault();
    }
}, { passive: false });

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        game.setupCanvas();
        if (game.currentScreen === 'game') {
            game.centerCameraOnAgents();
        }
    }, 100);
});
