// Game Engine
class CyberOpsGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // Game State
        this.currentScreen = 'menu';
        this.isPaused = false;
        this.currentMission = null;
        this.currentMissionIndex = 0;
        this.missionTimer = 0;
        this.selectedAgents = [];
        this.completedMissions = [];
        
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
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.hideLoading();
        this.updateMenuState();
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
    
    // Game Flow
    updateMenuState() {
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;
        document.getElementById('campaignButton').style.display = hasProgress ? 'none' : 'block';
        document.getElementById('continueButton').style.display = hasProgress ? 'block' : 'none';
    }
    
    startCampaign() {
        this.currentMissionIndex = 0;
        this.completedMissions = [];
        document.getElementById('mainMenu').style.display = 'none';
        this.showMissionBriefing(this.missions[0]);
    }
    
    continueCampaign() {
        document.getElementById('mainMenu').style.display = 'none';
        if (this.currentMissionIndex < this.missions.length) {
            this.showMissionBriefing(this.missions[this.currentMissionIndex]);
        }
    }
    
    selectMission() {
        let msg = "Available Missions:\n\n";
        this.missions.forEach((m, i) => {
            const status = this.completedMissions.includes(m.id) ? "✓" : 
                          i <= this.currentMissionIndex ? "◉" : "🔒";
            msg += `${status} Mission ${m.id}: ${m.title}\n`;
        });
        
        const choice = prompt(msg + "\nEnter mission number:");
        if (choice) {
            const idx = parseInt(choice) - 1;
            if (idx >= 0 && idx <= this.currentMissionIndex) {
                document.getElementById('mainMenu').style.display = 'none';
                this.showMissionBriefing(this.missions[idx]);
            }
        }
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
        
        this.agentTemplates.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            card.innerHTML = `
                <div style="font-weight: bold; color: #00ffff;">${agent.name}</div>
                <div style="font-size: 0.8em; margin-top: 5px;">
                    HP: ${agent.health} | DMG: ${agent.damage}<br>
                    Speed: ${agent.speed}
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
            
            if (idx < 2) {
                card.click();
            }
        });
        
        this.currentMission = mission;
    }
    
    startMission() {
        if (this.selectedAgents.length === 0) {
            alert('Select at least one agent!');
            return;
        }
        
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'block';
        this.currentScreen = 'game';
        this.initMission();
    }
    
    initMission() {
        // Reset state
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.missionTimer = 0;
        this.isPaused = false;
        this.map = this.currentMission.map;
        
        // Spawn agents
        const spawn = this.map.spawn;
        this.selectedAgents.forEach((agentData, idx) => {
            this.agents.push({
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
                cooldowns: [0, 0, 0, 0, 0]
            });
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
            case 3: // Hack
                this.hackNearestTerminal(agent);
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
            if (dist < 3) {
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
        document.querySelector('.pause-button').textContent = this.isPaused ? '▶' : '⏸';
    }
    
    backToMenuFromBriefing() {
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }
    
    nextMission() {
        const victory = document.getElementById('endTitle').textContent.includes('COMPLETE');
        
        if (victory) {
            if (!this.completedMissions.includes(this.currentMission.id)) {
                this.completedMissions.push(this.currentMission.id);
            }
            
            if (this.currentMissionIndex < this.missions.length - 1) {
                this.currentMissionIndex++;
            }
        }
        
        document.getElementById('endScreen').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
        this.currentScreen = 'menu';
        this.updateMenuState();
        
        if (victory && this.currentMissionIndex < this.missions.length) {
            setTimeout(() => {
                if (confirm(`Well done! Ready for Mission ${this.currentMissionIndex + 1}?`)) {
                    this.continueCampaign();
                }
            }, 100);
        } else if (victory && this.currentMissionIndex >= this.missions.length - 1) {
            alert('🎉 All missions completed! More content coming soon!');
        }
    }
    
    showSettings() {
        alert('Settings: Sound, Graphics, and Controls options coming soon!');
    }
    
    hideLoading() {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 1500);
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
                if (dist < enemy.visionRange) {
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
                            if (agent.shield > 0) {
                                agent.shield -= proj.damage;
                            } else {
                                agent.health -= proj.damage;
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
        }
    }
    
    endMission(victory) {
        this.isPaused = true;
        
        document.getElementById('endTitle').textContent = victory ? 'MISSION COMPLETE' : 'MISSION FAILED';
        document.getElementById('endTitle').className = 'end-title ' + (victory ? 'victory' : 'defeat');
        
        document.getElementById('endTime').textContent = document.getElementById('missionTimer').textContent;
        document.getElementById('endEnemies').textContent = 
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
        
        document.getElementById('endObjectives').textContent = 
            `${completedObj}/${this.currentMission.objectives.length}`;
        document.getElementById('endSquad').textContent = 
            `${this.agents.filter(a => a.alive).length}/${this.agents.length} Survived`;
        
        document.getElementById('endScreen').style.display = 'flex';
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
