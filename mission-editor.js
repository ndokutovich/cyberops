// CyberOps Mission Editor

// Event Logging System
class EventLogger {
    constructor() {
        this.events = [];
        this.maxEvents = 1000;
    }

    log(message, category = 'info', important = false) {
        const event = {
            timestamp: Date.now(),
            message,
            category,
            important
        };

        this.events.push(event);
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // Show important events in UI
        if (important) {
            this.showNotification(message, category);
        }

        // Console output only for critical errors in development
        if (window.DEBUG_MODE && category === 'error') {
            console.error(`[ERROR] ${message}`);
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: ${type === 'error' ? '#ff073a' : type === 'success' ? '#00ff41' : '#00ffff'};
            color: #0a0e27;
            border-radius: 4px;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    getEvents(category = null) {
        if (category) {
            return this.events.filter(e => e.category === category);
        }
        return this.events;
    }

    clear() {
        this.events = [];
    }
}

// Global event logger instance
const eventLogger = new EventLogger();

class MissionEditor {
    constructor() {
        this.canvas = document.getElementById('map-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tileSize = 32;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Current mission data
        this.mission = {
            name: 'New Mission',
            description: '',
            mapType: 'corporate',
            width: 80,
            height: 80,
            difficulty: 2,
            timeLimit: 0,
            credits: 5000,
            researchPoints: 2,
            tiles: [],
            entities: [],
            objectives: [],
            npcs: [],
            events: []
        };

        // Editor state
        this.currentTool = 'floor';
        this.currentTile = 0;
        this.brushMode = 'single';
        this.brushSize = 1;
        this.showGrid = true;
        this.snapToGrid = true;
        this.selectedEntity = null;
        this.isDragging = false;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Initialize systems
        this.eventLogger = eventLogger;
        this.contentLoader = null;
        this.gameServices = null;

        // RPG configuration
        this.rpgConfig = {
            classes: {},
            skills: {},
            stats: {
                primary: ['strength', 'agility', 'intelligence', 'endurance', 'tech', 'charisma']
            },
            items: {
                weapons: {},
                armor: {},
                consumables: {}
            }
        };

        // Formula configuration
        this.formulas = {
            damage: 'baseDamage + weaponDamage + (strength / 2)',
            critMultiplier: 2.0,
            armorReduction: 'damage * (100 / (100 + armor))',
            xpPerLevel: 'level * 100 + (level * level * 50)',
            skillPointsPerLevel: 3,
            maxLevel: 20
        };

        // Turn-based configuration
        this.turnBasedConfig = {
            defaultAgentAP: 12,
            defaultEnemyAP: 8,
            moveCost: 1,
            shootCost: 4,
            abilityCost: 6,
            hackCost: 4
        };

        // Theme configuration
        this.themeConfig = {
            colors: {
                primary: '#00ff41',
                secondary: '#00ffff',
                danger: '#ff073a',
                background: '#0a0e27'
            },
            strings: {
                currency: 'Credits',
                research: 'Research Points',
                agent: 'Agent',
                enemy: 'Enemy'
            },
            constants: {
                movementSpeed: 2.0,
                visionRange: 10,
                hackRange: 3,
                maxSquadSize: 6,
                baseHealth: 100,
                respawnTimer: 0
            }
        };

        this.init();
    }

    async init() {
        this.initMap();
        this.setupEventListeners();
        this.render();
        this.updatePropertiesPanel();

        // Initialize game systems
        await this.initializeGameSystems();

        // Load campaigns and populate dropdown
        await this.loadCampaigns();

        // Load campaign content (enemy types, etc.)
        await this.loadCampaignContent();

        this.eventLogger.log('Mission Editor initialized', 'system', true);
    }

    async initializeGameSystems() {
        try {
            // Load ContentLoader if available
            if (window.ContentLoader) {
                this.contentLoader = window.ContentLoader;
                this.eventLogger.log('ContentLoader connected', 'system');
            } else {
                // Try to load it
                const script = document.createElement('script');
                script.src = 'js/engine/content-loader.js';
                await new Promise((resolve) => {
                    script.onload = () => {
                        if (window.ContentLoader) {
                            this.contentLoader = new window.ContentLoader();
                            this.eventLogger.log('ContentLoader loaded', 'system');
                        }
                        resolve();
                    };
                    script.onerror = () => {
                        this.eventLogger.log('ContentLoader not available', 'warning');
                        resolve();
                    };
                    document.head.appendChild(script);
                });
            }

            // Load GameServices if available
            if (window.GameServices) {
                this.gameServices = window.GameServices;
                this.eventLogger.log('GameServices connected', 'system');
            } else {
                // Try to load services
                const scripts = [
                    'js/services/game-services.js',
                    'js/services/formula-service.js',
                    'js/services/equipment-service.js',
                    'js/services/rpg-service.js'
                ];

                for (const src of scripts) {
                    const script = document.createElement('script');
                    script.src = src;
                    await new Promise((resolve) => {
                        script.onload = resolve;
                        script.onerror = () => {
                            this.eventLogger.log(`Failed to load ${src}`, 'warning');
                            resolve();
                        };
                        document.head.appendChild(script);
                    });
                }

                if (window.GameServices) {
                    this.gameServices = new window.GameServices();
                    this.eventLogger.log('GameServices initialized', 'system');
                }
            }
        } catch (error) {
            this.eventLogger.log(`Failed to initialize game systems: ${error.message}`, 'error');
        }
    }

    async loadCampaignContent() {
        try {
            // Load campaign content file to get enemy types
            const script = document.createElement('script');
            script.src = 'campaigns/main/campaign-content.js';
            await new Promise((resolve) => {
                script.onload = resolve;
                script.onerror = () => {
                    eventLogger.log('Could not load campaign content, using defaults', 'warning');
                    resolve();
                };
                document.head.appendChild(script);
            });

            // Store enemy types if loaded
            if (window.MAIN_CAMPAIGN_CONTENT && window.MAIN_CAMPAIGN_CONTENT.enemyTypes) {
                this.enemyTypes = window.MAIN_CAMPAIGN_CONTENT.enemyTypes;
                this.eventLogger.log(`Loaded ${this.enemyTypes.length} enemy types from campaign`, 'success', true);
            } else {
                this.eventLogger.log('No enemy types loaded from campaign', 'warning', true);
                this.enemyTypes = [];
            }

            // Load RPG config if available
            if (window.MAIN_CAMPAIGN_CONFIG && window.MAIN_CAMPAIGN_CONFIG.rpgConfig) {
                this.rpgConfig = window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
                this.eventLogger.log('Loaded RPG configuration from campaign', 'success');
            }
        } catch (e) {
            this.eventLogger.log(`Failed to load campaign content: ${e.message}`, 'error', true);
        }
    }

    async loadCampaigns() {
        try {
            // Wait for campaign system to initialize
            if (typeof loadCampaignIndex === 'function') {
                await loadCampaignIndex();
            }

            // Populate mission dropdown
            const dropdown = document.getElementById('load-game-mission');

            // Check if there's a currently selected mission
            const currentValue = dropdown.value;
            const defaultText = currentValue && window.CAMPAIGN_MISSIONS && window.CAMPAIGN_MISSIONS[currentValue]
                ? `Current: ${window.CAMPAIGN_MISSIONS[currentValue].name || currentValue}`
                : 'Load Campaign Mission...';

            dropdown.innerHTML = `<option value="">${defaultText}</option>`;

            if (typeof CAMPAIGN_MISSIONS !== 'undefined' && Object.keys(CAMPAIGN_MISSIONS).length > 0) {
                // Group by campaign and act
                const campaigns = {};

                for (const [key, mission] of Object.entries(CAMPAIGN_MISSIONS)) {
                    const parts = key.split('-');
                    const campaign = parts[0];
                    const act = parts[1];
                    const missionNum = parts[2];

                    if (!campaigns[campaign]) campaigns[campaign] = {};
                    if (!campaigns[campaign][act]) campaigns[campaign][act] = [];

                    campaigns[campaign][act].push({
                        key: key,
                        num: missionNum,
                        mission: mission
                    });
                }

                // Add missions to dropdown organized by act
                for (const [campaignName, acts] of Object.entries(campaigns)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = `Campaign: ${campaignName.toUpperCase()}`;

                    for (const [actNum, missions] of Object.entries(acts)) {
                        // Sort missions by number
                        missions.sort((a, b) => a.num.localeCompare(b.num));

                        for (const missionData of missions) {
                            const option = document.createElement('option');
                            option.value = missionData.key;
                            option.textContent = `Act ${actNum}, Mission ${missionData.num}: ${missionData.mission.title || 'Untitled'}`;
                            optgroup.appendChild(option);
                        }
                    }

                    dropdown.appendChild(optgroup);
                }
            }
        } catch (error) {
            this.eventLogger.log(`Failed to load campaigns: ${error.message}`, 'error', true);
            const dropdown = document.getElementById('load-game-mission');
            dropdown.innerHTML = '<option value="">Failed to load campaigns</option>';
        }
    }

    initMap() {
        // Initialize empty map
        this.mission.tiles = [];
        for (let y = 0; y < this.mission.height; y++) {
            this.mission.tiles[y] = [];
            for (let x = 0; x < this.mission.width; x++) {
                this.mission.tiles[y][x] = 1; // Default to walls
            }
        }

        // Set canvas size
        this.canvas.width = this.mission.width * this.tileSize * this.zoom;
        this.canvas.height = this.mission.height * this.tileSize * this.zoom;

        this.saveToHistory();
    }

    setupEventListeners() {
        // Toolbar buttons
        document.getElementById('new-mission')?.addEventListener('click', () => this.newMission());
        document.getElementById('load-mission')?.addEventListener('click', () => this.loadMission());
        document.getElementById('save-mission')?.addEventListener('click', () => this.saveMission());
        document.getElementById('export-mission')?.addEventListener('click', () => this.exportMission());
        document.getElementById('import-mission')?.addEventListener('click', () => this.importMission());
        document.getElementById('test-mission')?.addEventListener('click', () => this.testMission());
        document.getElementById('validate-mission')?.addEventListener('click', () => this.validateMission());
        document.getElementById('campaign-config')?.addEventListener('click', () => this.showCampaignConfig());

        // Tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.currentTile = parseInt(btn.dataset.tile) || -1;
            });
        });

        // Brush mode buttons
        document.querySelectorAll('.brush-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.brushMode = btn.dataset.brush;
            });
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Settings
        document.getElementById('show-grid')?.addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });

        document.getElementById('snap-to-grid')?.addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });

        document.getElementById('zoom-level')?.addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            this.canvas.width = this.mission.width * this.tileSize * this.zoom;
            this.canvas.height = this.mission.height * this.tileSize * this.zoom;
            this.render();
        });

        document.getElementById('brush-size')?.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
        });

        // Mission properties
        document.getElementById('mission-name')?.addEventListener('change', (e) => {
            this.mission.name = e.target.value;
        });

        document.getElementById('mission-desc')?.addEventListener('change', (e) => {
            this.mission.description = e.target.value;
        });

        document.getElementById('map-type')?.addEventListener('change', (e) => {
            this.mission.mapType = e.target.value;
        });

        document.getElementById('map-width')?.addEventListener('change', (e) => {
            this.resizeMap(parseInt(e.target.value), this.mission.height);
        });

        document.getElementById('map-height')?.addEventListener('change', (e) => {
            this.resizeMap(this.mission.width, parseInt(e.target.value));
        });

        // Quick actions
        document.getElementById('generate-room')?.addEventListener('click', () => this.generateRoom());
        document.getElementById('generate-corridor')?.addEventListener('click', () => this.generateCorridor());
        document.getElementById('clear-map')?.addEventListener('click', () => this.clearMap());
        document.getElementById('auto-walls')?.addEventListener('click', () => this.autoWalls());

        // Objectives
        document.getElementById('add-objective')?.addEventListener('click', () => this.showObjectiveDialog());

        // NPCs
        document.getElementById('add-npc')?.addEventListener('click', () => this.showNPCDialog());

        // Events
        document.getElementById('add-event')?.addEventListener('click', () => this.addEvent());

        // Dialog buttons
        document.getElementById('save-objective')?.addEventListener('click', () => this.saveObjective());
        document.getElementById('cancel-objective')?.addEventListener('click', () => this.hideObjectiveDialog());
        document.getElementById('save-npc')?.addEventListener('click', () => this.saveNPC());
        document.getElementById('cancel-npc')?.addEventListener('click', () => this.hideNPCDialog());

        // Quest and Dialog tree editors - removed after simplifying NPC controls
        // document.getElementById('add-dialog-node')?.addEventListener('click', () => this.addDialogNode());
        // document.getElementById('add-quest')?.addEventListener('click', () => this.addQuest());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // File input
        document.getElementById('file-input')?.addEventListener('change', (e) => this.handleFileLoad(e));

        // Load game mission dropdown
        document.getElementById('load-game-mission')?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadGameMission(e.target.value);
                // Don't reset - the loadGameMission will update the dropdown properly
            }
        });
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (this.tileSize * this.zoom));
        const y = Math.floor((e.clientY - rect.top) / (this.tileSize * this.zoom));

        this.startX = x;
        this.startY = y;

        if (e.button === 0) { // Left click
            if (this.currentTool === 'patrol-route') {
                this.addPatrolPoint(x, y);
            } else if (this.currentTile >= 0) {
                this.isDrawing = true;
                this.applyTool(x, y);
            } else if (this.currentTool === 'select') {
                this.selectEntity(x, y);
            } else if (this.currentTool !== 'select') {
                // Place entity only if not in select mode
                this.placeEntity(x, y);
            }
        } else if (e.button === 2) { // Right click
            // Erase or pan
            if (this.brushMode === 'erase') {
                this.isDrawing = true;
                this.eraseTile(x, y);
            } else {
                this.isDragging = true;
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (this.tileSize * this.zoom));
        const y = Math.floor((e.clientY - rect.top) / (this.tileSize * this.zoom));

        // Update coordinates display
        document.getElementById('coordinates').textContent = `X: ${x}, Y: ${y}`;

        // Update cursor style based on tool
        if (this.currentTool === 'select') {
            // Check if we're hovering over an entity
            const hoveredEntity = this.mission.entities.find(e => e.x === x && e.y === y);
            this.canvas.style.cursor = hoveredEntity ? 'move' : 'default';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }

        // Handle entity dragging with select tool
        if (this.draggingEntity && this.currentTool === 'select' && e.buttons === 1) {
            // Only update position if we've actually moved to a new tile
            if (x !== this.draggingEntity.x || y !== this.draggingEntity.y) {
                // Validate new position
                if (x >= 0 && x < this.mission.width && y >= 0 && y < this.mission.height) {
                    // Update entity position
                    this.draggingEntity.x = x;
                    this.draggingEntity.y = y;

                    // Also update spawn position for NPCs
                    if (this.draggingEntity.type === 'npc') {
                        if (this.draggingEntity.spawn) {
                            this.draggingEntity.spawn.x = x;
                            this.draggingEntity.spawn.y = y;
                        }
                        // Update in mission.npcs array too
                        const npcInMission = this.mission.npcs.find(n => n.id === this.draggingEntity.id);
                        if (npcInMission) {
                            npcInMission.x = x;
                            npcInMission.y = y;
                            if (npcInMission.spawn) {
                                npcInMission.spawn.x = x;
                                npcInMission.spawn.y = y;
                            }
                        }
                    }

                    // Refresh display
                    this.renderEntities();
                    this.showEntityProperties(this.draggingEntity);
                    this.updatePropertiesPanel();
                }
            }
        } else if (this.isDrawing) {
            if (this.brushMode === 'line') {
                this.render();
                this.drawLine(this.startX, this.startY, x, y, true);
            } else if (this.brushMode === 'rect') {
                this.render();
                this.drawRectangle(this.startX, this.startY, x, y, true);
            } else {
                this.applyTool(x, y);
            }
        }

        if (this.isDragging) {
            this.offsetX += e.movementX;
            this.offsetY += e.movementY;
            this.render();
        }
    }

    handleMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / (this.tileSize * this.zoom));
        const y = Math.floor((e.clientY - rect.top) / (this.tileSize * this.zoom));

        // If we were dragging an entity, save the changes to history
        if (this.draggingEntity && this.currentTool === 'select') {
            this.saveToHistory();
            this.draggingEntity = null;
        }

        if (this.isDrawing) {
            if (this.brushMode === 'line') {
                this.drawLine(this.startX, this.startY, x, y, false);
            } else if (this.brushMode === 'rect') {
                this.drawRectangle(this.startX, this.startY, x, y, false);
            } else if (this.brushMode === 'fill') {
                this.floodFill(x, y);
            }
            this.saveToHistory();
        }

        this.isDrawing = false;
        this.isDragging = false;
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.25, Math.min(4, this.zoom * delta));
        document.getElementById('zoom-level').value = this.zoom;
        this.canvas.width = this.mission.width * this.tileSize * this.zoom;
        this.canvas.height = this.mission.height * this.tileSize * this.zoom;
        this.render();
    }

    handleKeyboard(e) {
        // ESC - Finish patrol route editing
        if (e.key === 'Escape' && this.editingPatrolRoute) {
            e.preventDefault();
            this.finishPatrolRoute();
            return;
        }
        // V - Select tool
        if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            const selectBtn = document.querySelector('.tool-btn[data-tool="select"]');
            if (selectBtn) {
                selectBtn.classList.add('active');
                this.currentTool = 'select';
                this.currentTile = -1;
            }
        }
        // Ctrl+Z - Undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
        }
        // Ctrl+Y - Redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            this.redo();
        }
        // Ctrl+S - Save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            this.saveMission();
        }
        // Delete - Remove selected entity
        if (e.key === 'Delete' && this.selectedEntity) {
            this.removeEntity(this.selectedEntity);
        }
        // G - Toggle grid
        if (e.key === 'g') {
            this.showGrid = !this.showGrid;
            document.getElementById('show-grid').checked = this.showGrid;
            this.render();
        }
    }

    applyTool(x, y) {
        if (x < 0 || x >= this.mission.width || y < 0 || y >= this.mission.height) return;

        if (this.brushMode === 'single' || this.brushMode === 'line' || this.brushMode === 'rect') {
            for (let dy = 0; dy < this.brushSize; dy++) {
                for (let dx = 0; dx < this.brushSize; dx++) {
                    const tx = x + dx;
                    const ty = y + dy;
                    if (tx < this.mission.width && ty < this.mission.height) {
                        this.mission.tiles[ty][tx] = this.currentTile;
                    }
                }
            }
        }

        this.render();
    }

    eraseTile(x, y) {
        if (x < 0 || x >= this.mission.width || y < 0 || y >= this.mission.height) return;
        this.mission.tiles[y][x] = 1; // Set to wall
        this.render();
    }

    drawLine(x1, y1, x2, y2, preview) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (!preview) {
                this.applyTool(x1, y1);
            } else {
                this.renderTilePreview(x1, y1);
            }

            if (x1 === x2 && y1 === y2) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x1 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y1 += sy;
            }
        }
    }

    drawRectangle(x1, y1, x2, y2, preview) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                if (!preview) {
                    this.applyTool(x, y);
                } else {
                    this.renderTilePreview(x, y);
                }
            }
        }
    }

    floodFill(x, y) {
        if (x < 0 || x >= this.mission.width || y < 0 || y >= this.mission.height) return;

        const targetTile = this.mission.tiles[y][x];
        if (targetTile === this.currentTile) return;

        const stack = [[x, y]];
        const visited = new Set();

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            const key = `${cx},${cy}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (cx < 0 || cx >= this.mission.width || cy < 0 || cy >= this.mission.height) continue;
            if (this.mission.tiles[cy][cx] !== targetTile) continue;

            this.mission.tiles[cy][cx] = this.currentTile;

            stack.push([cx + 1, cy]);
            stack.push([cx - 1, cy]);
            stack.push([cx, cy + 1]);
            stack.push([cx, cy - 1]);
        }

        this.render();
        this.saveToHistory();
    }

    placeEntity(x, y) {
        const entity = {
            type: this.currentTool,
            x: x,
            y: y,
            id: Date.now()
        };

        // Remove existing entity at this position if same type
        this.mission.entities = this.mission.entities.filter(e =>
            !(e.x === x && e.y === y && e.type === this.currentTool)
        );

        // Special handling for different entity types
        switch (this.currentTool) {
            case 'spawn-point':
                // Only one spawn point allowed
                this.mission.entities = this.mission.entities.filter(e => e.type !== 'spawn-point');
                break;
            case 'extraction':
                // Only one extraction point allowed
                this.mission.entities = this.mission.entities.filter(e => e.type !== 'extraction');
                break;
            case 'enemy':
                entity.enemyType = 'guard';
                entity.patrolRoute = [];
                entity.alertLevel = 0;
                entity.health = 100;
                entity.level = 1;
                entity.ap = 8;
                entity.damage = 10;
                entity.armor = 0;
                entity.visionRange = 10;
                entity.speed = 2.0;
                entity.alertRange = 15;
                entity.aiType = 'patrol';
                // Show dialog for detailed configuration
                this.showEnemyDialog(this.mission.entities.length);
                break;
            case 'npc':
                entity.name = 'NPC';
                entity.dialog = [];
                entity.quests = [];
                break;
            case 'waypoint':
                entity.label = 'Waypoint';
                break;
            case 'item':
                entity.itemType = 'credits';
                entity.value = 100;
                break;
        }

        this.mission.entities.push(entity);
        this.renderEntities();
        this.saveToHistory();
    }

    selectEntity(x, y) {
        const entity = this.mission.entities.find(e => e.x === x && e.y === y);
        if (entity) {
            this.selectedEntity = entity;
            this.showEntityProperties(entity);
            // Store the drag start position for entity dragging
            this.draggingEntity = entity;
            this.dragStartX = x;
            this.dragStartY = y;
        } else {
            this.selectedEntity = null;
            this.hideEntityProperties();
            this.draggingEntity = null;
        }
        this.renderEntities();
    }

    removeEntity(entity) {
        this.mission.entities = this.mission.entities.filter(e => e.id !== entity.id);
        this.selectedEntity = null;
        this.hideEntityProperties();
        this.renderEntities();
        this.saveToHistory();
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tiles
        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                const tile = this.mission.tiles[y][x];
                this.renderTile(x, y, tile);
            }
        }

        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }

        // Draw patrol routes for enemies
        this.mission.entities.filter(e => e.type === 'enemy' && e.patrolRoute && e.patrolRoute.length > 0).forEach(enemy => {
            this.drawEnemyPatrolRoute(enemy);
        });

        // Draw current patrol route being edited
        if (this.editingPatrolRoute) {
            this.drawPatrolRoute();
        }

        // Render entities
        this.renderEntities();
    }

    drawEnemyPatrolRoute(enemy) {
        const size = this.tileSize * this.zoom;
        this.ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([3, 3]);

        // Draw lines between points
        this.ctx.beginPath();
        for (let i = 0; i < enemy.patrolRoute.length; i++) {
            const point = enemy.patrolRoute[i];
            const px = point.x * size + size / 2 + this.offsetX;
            const py = point.y * size + size / 2 + this.offsetY;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }

        // Connect back to start for loop
        if (enemy.patrolRoute.length > 1) {
            const firstPoint = enemy.patrolRoute[0];
            const fpx = firstPoint.x * size + size / 2 + this.offsetX;
            const fpy = firstPoint.y * size + size / 2 + this.offsetY;
            this.ctx.lineTo(fpx, fpy);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    renderTile(x, y, tileType) {
        const size = this.tileSize * this.zoom;
        const px = x * size + this.offsetX;
        const py = y * size + this.offsetY;

        // Tile colors
        const colors = {
            0: '#4a4a8e', // Floor
            1: '#2a2a4e', // Wall
            2: '#8a6a3e', // Door
            3: '#00ff00', // Terminal
            4: '#5a5a5a'  // Cover
        };

        this.ctx.fillStyle = colors[tileType] || '#000000';
        this.ctx.fillRect(px, py, size, size);

        // Add border for walls
        if (tileType === 1) {
            this.ctx.strokeStyle = '#1a1a3e';
            this.ctx.strokeRect(px, py, size, size);
        }
    }

    renderTilePreview(x, y) {
        const size = this.tileSize * this.zoom;
        const px = x * size + this.offsetX;
        const py = y * size + this.offsetY;

        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
        this.ctx.fillRect(px, py, size, size);
    }

    renderEntities() {
        const overlay = document.getElementById('entity-overlay');
        overlay.innerHTML = '';

        this.mission.entities.forEach(entity => {
            const marker = document.createElement('div');
            marker.className = `entity-marker ${entity.type}`;
            marker.style.left = `${entity.x * this.tileSize * this.zoom + this.offsetX}px`;
            marker.style.top = `${entity.y * this.tileSize * this.zoom + this.offsetY}px`;
            marker.style.width = `${this.tileSize * this.zoom - 4}px`;
            marker.style.height = `${this.tileSize * this.zoom - 4}px`;

            // Add label
            const labelMap = {
                'spawn-point': 'S',
                'extraction': 'E',
                'enemy': 'X',
                'npc': 'N',
                'waypoint': 'W',
                'item': 'I',
                'explosive': 'B',
                'switch': 'SW',
                'gate': 'G'
            };
            marker.textContent = labelMap[entity.type] || '?';

            // Highlight selected
            if (this.selectedEntity && this.selectedEntity.id === entity.id) {
                marker.style.boxShadow = '0 0 10px #00ffff';
                marker.style.zIndex = '1000';
            }

            marker.addEventListener('click', () => {
                this.selectedEntity = entity;
                this.showEntityProperties(entity);
                this.renderEntities();
            });

            overlay.appendChild(marker);
        });
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 0.5;

        const size = this.tileSize * this.zoom;

        for (let x = 0; x <= this.mission.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * size + this.offsetX, this.offsetY);
            this.ctx.lineTo(x * size + this.offsetX, this.mission.height * size + this.offsetY);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.mission.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.offsetX, y * size + this.offsetY);
            this.ctx.lineTo(this.mission.width * size + this.offsetX, y * size + this.offsetY);
            this.ctx.stroke();
        }
    }

    generateRoom() {
        // Prompt for room position and size
        const x = parseInt(prompt('Room X position:', '10'));
        const y = parseInt(prompt('Room Y position:', '10'));
        const width = parseInt(prompt('Room width:', '12'));
        const height = parseInt(prompt('Room height:', '12'));

        if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) return;

        // Clear room area
        for (let dy = 0; dy < height; dy++) {
            for (let dx = 0; dx < width; dx++) {
                const tx = x + dx;
                const ty = y + dy;
                if (tx < this.mission.width && ty < this.mission.height) {
                    // Add walls on edges, floor inside
                    if (dx === 0 || dx === width - 1 || dy === 0 || dy === height - 1) {
                        this.mission.tiles[ty][tx] = 1; // Wall
                    } else {
                        this.mission.tiles[ty][tx] = 0; // Floor
                    }
                }
            }
        }

        // Add door
        const doorX = x + Math.floor(width / 2);
        if (doorX < this.mission.width) {
            this.mission.tiles[y][doorX] = 2; // Door
        }

        this.render();
        this.saveToHistory();
    }

    generateCorridor() {
        const direction = prompt('Direction (horizontal/vertical):', 'horizontal');
        const position = parseInt(prompt('Position (Y for horizontal, X for vertical):', '40'));
        const width = parseInt(prompt('Corridor width:', '3'));

        if (isNaN(position) || isNaN(width)) return;

        if (direction === 'horizontal') {
            for (let x = 0; x < this.mission.width; x++) {
                for (let w = 0; w < width; w++) {
                    const y = position + w;
                    if (y < this.mission.height) {
                        this.mission.tiles[y][x] = 0; // Floor
                    }
                }
            }
        } else {
            for (let y = 0; y < this.mission.height; y++) {
                for (let w = 0; w < width; w++) {
                    const x = position + w;
                    if (x < this.mission.width) {
                        this.mission.tiles[y][x] = 0; // Floor
                    }
                }
            }
        }

        this.render();
        this.saveToHistory();
    }

    clearMap() {
        if (!confirm('Clear entire map?')) return;

        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                this.mission.tiles[y][x] = 1; // Wall
            }
        }

        this.mission.entities = [];
        this.render();
        this.saveToHistory();
    }

    autoWalls() {
        // Add walls around floor tiles
        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                if (this.mission.tiles[y][x] === 0) { // Floor
                    // Check neighbors
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < this.mission.width &&
                                ny >= 0 && ny < this.mission.height) {
                                if (this.mission.tiles[ny][nx] === undefined) {
                                    this.mission.tiles[ny][nx] = 1; // Wall
                                }
                            }
                        }
                    }
                }
            }
        }

        this.render();
        this.saveToHistory();
    }

    resizeMap(newWidth, newHeight) {
        const oldTiles = this.mission.tiles;
        const oldWidth = this.mission.width;
        const oldHeight = this.mission.height;

        this.mission.width = newWidth;
        this.mission.height = newHeight;

        // Create new tile array
        this.mission.tiles = [];
        for (let y = 0; y < newHeight; y++) {
            this.mission.tiles[y] = [];
            for (let x = 0; x < newWidth; x++) {
                if (y < oldHeight && x < oldWidth) {
                    this.mission.tiles[y][x] = oldTiles[y][x];
                } else {
                    this.mission.tiles[y][x] = 1; // Wall
                }
            }
        }

        // Update canvas size
        this.canvas.width = this.mission.width * this.tileSize * this.zoom;
        this.canvas.height = this.mission.height * this.tileSize * this.zoom;

        this.render();
        this.saveToHistory();
    }

    showEntityProperties(entity) {
        const propsDiv = document.getElementById('entity-properties');
        const content = document.getElementById('entity-props-content');

        let html = `<label>Type: ${entity.type}</label>`;
        html += `
            <label>Position X:
                <input type="number" id="entity-pos-x" value="${entity.x}" min="0" max="${this.mission.width - 1}">
            </label>
            <label>Position Y:
                <input type="number" id="entity-pos-y" value="${entity.y}" min="0" max="${this.mission.height - 1}">
            </label>
        `;

        switch (entity.type) {
            case 'enemy':
                // Build dropdown from campaign enemy types
                const enemyOptions = this.enemyTypes && this.enemyTypes.length > 0 ?
                    this.enemyTypes.map(enemy =>
                        `<option value="${enemy.type}" ${entity.enemyType === enemy.type ? 'selected' : ''}>${enemy.type.charAt(0).toUpperCase() + enemy.type.slice(1)}</option>`
                    ).join('') :
                    '<option value="">No enemy types loaded</option>';

                html += `
                    <label>Enemy Type:
                        <select id="entity-enemy-type">
                            ${enemyOptions}
                        </select>
                    </label>
                    <label>Alert Level:
                        <input type="number" id="entity-alert" value="${entity.alertLevel || 0}" min="0" max="3">
                    </label>
                    <button class="action-btn" onclick="editor.startPatrolRouteEditor('${entity.id}')">Edit Patrol Route</button>
                    ${entity.patrolRoute && entity.patrolRoute.length > 0 ?
                        `<div style="margin-top: 10px; font-size: 11px; color: #88ff88;">
                            Patrol points: ${entity.patrolRoute.length}
                            <button class="action-btn" style="font-size: 11px; padding: 4px;" onclick="editor.clearPatrolRoute('${entity.id}')">Clear Route</button>
                        </div>` : ''}
                `;
                break;
            case 'npc':
                html += `
                    <label>Name:
                        <input type="text" id="entity-npc-name" value="${entity.name || 'NPC'}" readonly style="background: #222;">
                    </label>
                    <p style="color: #888; font-size: 12px;">
                        This NPC references template: <strong>${entity.id}</strong><br>
                        Edit the template in Campaign Editor → NPCs tab
                    </p>
                `;
                break;
            case 'waypoint':
                html += `
                    <label>Label:
                        <input type="text" id="entity-waypoint-label" value="${entity.label || 'Waypoint'}">
                    </label>
                `;
                break;
            case 'item':
                html += `
                    <label>Item Type:
                        <select id="entity-item-type">
                            <option value="credits" ${entity.itemType === 'credits' ? 'selected' : ''}>Credits</option>
                            <option value="medkit" ${entity.itemType === 'medkit' ? 'selected' : ''}>Medkit</option>
                            <option value="ammo" ${entity.itemType === 'ammo' ? 'selected' : ''}>Ammo</option>
                            <option value="keycard" ${entity.itemType === 'keycard' ? 'selected' : ''}>Keycard</option>
                            <option value="data" ${entity.itemType === 'data' ? 'selected' : ''}>Data</option>
                        </select>
                    </label>
                    <label>Value:
                        <input type="number" id="entity-item-value" value="${entity.value || 100}" min="0">
                    </label>
                `;
                break;
        }

        html += `
            <button class="action-btn" onclick="editor.updateEntity('${entity.id}')">Update</button>
            <button class="action-btn" style="background: #ff0066;" onclick="editor.removeEntity(editor.selectedEntity)">Delete</button>
        `;

        content.innerHTML = html;
        propsDiv.style.display = 'block';
    }

    hideEntityProperties() {
        document.getElementById('entity-properties').style.display = 'none';
    }

    updateEntity(entityId) {
        const entity = this.mission.entities.find(e => e.id === entityId);
        if (!entity) return;

        // Update position for all entity types
        const newX = parseInt(document.getElementById('entity-pos-x').value);
        const newY = parseInt(document.getElementById('entity-pos-y').value);

        // Validate positions
        if (newX >= 0 && newX < this.mission.width && newY >= 0 && newY < this.mission.height) {
            entity.x = newX;
            entity.y = newY;

            // Also update spawn position for NPCs if they have it
            if (entity.type === 'npc' && entity.spawn) {
                entity.spawn.x = newX;
                entity.spawn.y = newY;
            }
        }

        switch (entity.type) {
            case 'enemy':
                entity.enemyType = document.getElementById('entity-enemy-type').value;
                entity.alertLevel = parseInt(document.getElementById('entity-alert').value);
                break;
            case 'npc':
                // NPC names come from templates, not editable here
                // entity.name is display-only and comes from the template
                // Also update in the mission.npcs array if it exists there
                const npcInMission = this.mission.npcs.find(n => n.id === entity.id);
                if (npcInMission) {
                    npcInMission.x = newX;
                    npcInMission.y = newY;
                    if (npcInMission.spawn) {
                        npcInMission.spawn.x = newX;
                        npcInMission.spawn.y = newY;
                    }
                }
                break;
            case 'waypoint':
                entity.label = document.getElementById('entity-waypoint-label').value;
                break;
            case 'item':
                entity.itemType = document.getElementById('entity-item-type').value;
                entity.value = parseInt(document.getElementById('entity-item-value').value);
                break;
        }

        this.renderEntities();
        this.updatePropertiesPanel();  // Update NPC list if name changed
        this.saveToHistory();
    }

    updatePropertiesPanel() {
        // Update objectives list
        const objList = document.getElementById('objectives-list');
        objList.innerHTML = '';
        this.mission.objectives.forEach((obj, index) => {
            const div = document.createElement('div');
            div.className = 'objective-item';
            div.innerHTML = `
                <span>${obj.type}: ${obj.description || obj.target}</span>
                <span class="delete-btn" onclick="editor.removeObjective(${index})">✖</span>
            `;
            div.addEventListener('click', () => this.editObjective(index));
            objList.appendChild(div);
        });

        // Update NPCs list
        const npcsList = document.getElementById('npcs-list');
        npcsList.innerHTML = '';
        this.mission.npcs.forEach((npc, index) => {
            const div = document.createElement('div');
            div.className = 'npc-item';
            // NPCs use id and spawn coordinates
            const npcName = npc.name || npc.id || 'NPC';
            const npcX = npc.spawn?.x || npc.x || 0;
            const npcY = npc.spawn?.y || npc.y || 0;
            div.innerHTML = `
                <span>${npcName} at (${npcX}, ${npcY})</span>
                <span class="delete-btn" onclick="editor.removeNPC(${index})">✖</span>
            `;
            div.addEventListener('click', () => this.editNPC(index));
            npcsList.appendChild(div);
        });
    }

    showObjectiveDialog(index = -1) {
        const dialog = document.getElementById('objective-dialog');
        dialog.style.display = 'flex';

        if (index >= 0) {
            const obj = this.mission.objectives[index];
            document.getElementById('obj-type').value = obj.type;
            document.getElementById('obj-target').value = obj.target || '';
            document.getElementById('obj-count').value = obj.count || 1;
            document.getElementById('obj-desc').value = obj.description || '';
            document.getElementById('obj-required').checked = obj.required !== false;
            document.getElementById('obj-hidden').checked = obj.hidden === true;
        } else {
            document.getElementById('obj-type').value = 'interact';
            document.getElementById('obj-target').value = '';
            document.getElementById('obj-count').value = 1;
            document.getElementById('obj-desc').value = '';
            document.getElementById('obj-required').checked = true;
            document.getElementById('obj-hidden').checked = false;
        }

        this.editingObjectiveIndex = index;
    }

    hideObjectiveDialog() {
        document.getElementById('objective-dialog').style.display = 'none';
    }

    saveObjective() {
        const obj = {
            type: document.getElementById('obj-type').value,
            target: document.getElementById('obj-target').value,
            count: parseInt(document.getElementById('obj-count').value),
            description: document.getElementById('obj-desc').value,
            required: document.getElementById('obj-required').checked,
            hidden: document.getElementById('obj-hidden').checked
        };

        if (this.editingObjectiveIndex >= 0) {
            this.mission.objectives[this.editingObjectiveIndex] = obj;
        } else {
            this.mission.objectives.push(obj);
        }

        this.updatePropertiesPanel();
        this.hideObjectiveDialog();
        this.saveToHistory();
    }

    editObjective(index) {
        this.showObjectiveDialog(index);
    }

    removeObjective(index) {
        this.mission.objectives.splice(index, 1);
        this.updatePropertiesPanel();
        this.saveToHistory();
    }

    showNPCDialog(index = -1) {
        const dialog = document.getElementById('npc-dialog');
        dialog.style.display = 'flex';

        // Populate NPC template dropdown from campaign
        this.populateNPCTemplates();

        if (index >= 0) {
            const npc = this.mission.npcs[index];

            // Set template selection
            const templateSelect = document.getElementById('npc-template-select');
            templateSelect.value = npc.id || '';

            // Set position
            document.getElementById('npc-x').value = npc.x;
            document.getElementById('npc-y').value = npc.y;

            // Load quest checkboxes for this NPC
            if (npc.id) {
                this.loadNPCQuestCheckboxes(npc.id, npc.quests || []);
            }
        } else {
            // New NPC
            document.getElementById('npc-template-select').value = '';
            document.getElementById('npc-x').value = 10;
            document.getElementById('npc-y').value = 10;
            document.getElementById('quest-checkboxes').innerHTML =
                '<p style="opacity: 0.7; font-size: 12px;">Select an NPC template first</p>';
        }

        this.editingNPCIndex = index;
    }

    // Populate NPC template dropdown from campaign
    populateNPCTemplates() {
        const select = document.getElementById('npc-template-select');
        const campaignId = this.currentCampaignId || 'main';
        const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES?.[campaignId];

        // Clear existing options except the first
        while (select.options.length > 1) {
            select.remove(1);
        }

        if (npcTemplates) {
            Object.keys(npcTemplates).forEach(npcId => {
                const template = npcTemplates[npcId];
                const option = document.createElement('option');
                option.value = npcId;
                option.textContent = `${template.name} (${npcId})`;
                select.appendChild(option);
            });
        }

        // Add change handler
        select.onchange = () => {
            const selectedId = select.value;
            if (selectedId) {
                this.loadNPCTemplateInfo(selectedId);
                this.loadNPCQuestCheckboxes(selectedId, []);
            } else {
                document.getElementById('npc-template-info').style.display = 'none';
                document.getElementById('quest-checkboxes').innerHTML =
                    '<p style="opacity: 0.7; font-size: 12px;">Select an NPC template first</p>';
            }
        };
    }

    // Show info about selected NPC template
    loadNPCTemplateInfo(npcId) {
        const campaignId = this.currentCampaignId || 'main';
        const template = window.CAMPAIGN_NPC_TEMPLATES?.[campaignId]?.[npcId];

        if (template) {
            const infoDiv = document.getElementById('npc-template-info');
            const contentDiv = document.getElementById('npc-info-content');

            contentDiv.innerHTML = `
                <p><strong>Name:</strong> ${template.name}</p>
                <p><strong>Sprite:</strong> ${template.sprite}</p>
                <p><strong>Type:</strong> ${template.movementType || 'stationary'}</p>
                ${template.dialog?.length ? '<p><strong>Has Dialog:</strong> Yes</p>' : ''}
                ${template.quests?.length ? `<p><strong>Available Quests:</strong> ${template.quests.length}</p>` : ''}
            `;

            infoDiv.style.display = 'block';
        }
    }

    // Load quest checkboxes for selected NPC
    loadNPCQuestCheckboxes(npcId, activeQuests = []) {
        const campaignId = this.currentCampaignId || 'main';
        const template = window.CAMPAIGN_NPC_TEMPLATES?.[campaignId]?.[npcId];
        const container = document.getElementById('quest-checkboxes');

        if (!template || !template.quests || template.quests.length === 0) {
            container.innerHTML = '<p style="opacity: 0.7; font-size: 12px;">This NPC has no quests</p>';
            return;
        }

        container.innerHTML = '';
        template.quests.forEach(quest => {
            const label = document.createElement('label');
            label.style.cssText = 'display: block; margin: 5px 0; font-size: 13px;';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = quest.id;
            checkbox.checked = activeQuests.includes(quest.id);
            checkbox.style.marginRight = '8px';

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${quest.name || quest.id}`));

            if (quest.description) {
                const desc = document.createElement('span');
                desc.style.cssText = 'display: block; margin-left: 20px; font-size: 11px; opacity: 0.7;';
                desc.textContent = quest.description;
                label.appendChild(desc);
            }

            container.appendChild(label);
        });
    }

    // Load dialog tree into visual editor
    loadDialogTree(dialogData) {
        const container = document.getElementById('dialog-nodes');
        container.innerHTML = '';

        if (Array.isArray(dialogData)) {
            dialogData.forEach((node, index) => {
                this.createDialogNodeElement(node, index, container);
            });
        }
    }

    // Create a visual dialog node
    createDialogNodeElement(node, index, container) {
        const nodeEl = document.createElement('div');
        nodeEl.className = 'dialog-node';
        nodeEl.dataset.index = index;

        const greeting = node.greeting || node.text || 'Dialog node';
        const options = node.options || [];

        nodeEl.innerHTML = `
            <div class="node-header">
                <div class="node-title">Dialog ${index + 1}</div>
                <div class="node-actions">
                    <button class="mini-btn" onclick="editor.editDialogNode(${index})">Edit</button>
                    <button class="mini-btn delete" onclick="editor.removeDialogNode(${index})">Delete</button>
                </div>
            </div>
            <input type="text" class="tree-input" value="${greeting}" placeholder="Greeting text" data-field="greeting">
            <div class="dialog-options">
                ${options.map((opt, i) => `
                    <div class="dialog-option">
                        Option ${i + 1}: ${opt.text || 'Option'}
                    </div>
                `).join('')}
            </div>
        `;

        container.appendChild(nodeEl);
    }

    // Load quest tree into visual editor
    loadQuestTree(questData) {
        const container = document.getElementById('quest-list');
        container.innerHTML = '';

        // Quest data can be an array of quest IDs or quest objects
        if (Array.isArray(questData)) {
            questData.forEach((quest, index) => {
                if (typeof quest === 'string') {
                    // Just a quest ID reference
                    this.createQuestReferenceElement(quest, index, container);
                } else {
                    // Full quest object
                    this.createQuestElement(quest, index, container);
                }
            });
        }
    }

    // Create a visual quest element
    createQuestElement(quest, index, container) {
        const questEl = document.createElement('div');
        questEl.className = 'quest-item';
        questEl.dataset.index = index;

        const questName = quest.name || quest.id || 'Quest';
        const description = quest.description || '';
        const objectives = quest.objectives || [];
        const rewards = quest.rewards || {};

        questEl.innerHTML = `
            <div class="quest-header">
                <div class="quest-title">${questName}</div>
                <div class="quest-actions">
                    <button class="mini-btn" onclick="editor.editQuest(${index})">Edit</button>
                    <button class="mini-btn delete" onclick="editor.removeQuest(${index})">Delete</button>
                </div>
            </div>
            <input type="text" class="tree-input" value="${quest.id || ''}" placeholder="Quest ID" data-field="id">
            <input type="text" class="tree-input" value="${questName}" placeholder="Quest Name" data-field="name">
            <textarea class="tree-input" placeholder="Description" data-field="description">${description}</textarea>
            <div class="quest-objectives">
                ${objectives.map((obj, i) => `
                    <div class="objective-item">
                        ${obj.type || 'objective'}: ${obj.description || obj.id || ''}
                    </div>
                `).join('')}
            </div>
            <div class="quest-rewards">
                ${rewards.credits ? `<span class="reward-badge">💰 ${rewards.credits}</span>` : ''}
                ${rewards.experience ? `<span class="reward-badge">⭐ ${rewards.experience} XP</span>` : ''}
                ${rewards.researchPoints ? `<span class="reward-badge">🔬 ${rewards.researchPoints} RP</span>` : ''}
            </div>
        `;

        container.appendChild(questEl);
    }

    // Create a quest reference element (just ID)
    createQuestReferenceElement(questId, index, container) {
        const questEl = document.createElement('div');
        questEl.className = 'quest-item';
        questEl.dataset.index = index;

        questEl.innerHTML = `
            <div class="quest-header">
                <div class="quest-title">Quest Reference: ${questId}</div>
                <div class="quest-actions">
                    <button class="mini-btn delete" onclick="editor.removeQuest(${index})">Delete</button>
                </div>
            </div>
            <input type="text" class="tree-input" value="${questId}" placeholder="Quest ID" data-field="questId">
        `;

        container.appendChild(questEl);
    }

    hideNPCDialog() {
        document.getElementById('npc-dialog').style.display = 'none';
    }

    saveNPC() {
        try {
            const templateSelect = document.getElementById('npc-template-select');
            const npcId = templateSelect.value;

            if (!npcId) {
                alert('Please select an NPC template');
                return;
            }

            // Get selected quests
            const questCheckboxes = document.querySelectorAll('#quest-checkboxes input[type="checkbox"]:checked');
            const activeQuests = Array.from(questCheckboxes).map(cb => cb.value);

            // Get position
            const x = parseInt(document.getElementById('npc-x').value);
            const y = parseInt(document.getElementById('npc-y').value);

            // Get template info for display name
            const campaignId = this.currentCampaignId || 'main';
            const template = window.CAMPAIGN_NPC_TEMPLATES?.[campaignId]?.[npcId];
            const displayName = template?.name || npcId;

            // Create NPC data matching the mission file format
            const npcData = {
                id: npcId,
                spawn: { x, y },
                quests: activeQuests
            };

            // For editor display, add extra fields
            const editorNpc = {
                ...npcData,
                name: displayName,
                x: x,
                y: y
            };

            if (this.editingNPCIndex >= 0) {
                // Update existing
                this.mission.npcs[this.editingNPCIndex] = editorNpc;

                // Also update in entities
                const entity = this.mission.entities.find(e =>
                    e.type === 'npc' && e.id === npcId
                );
                if (entity) {
                    entity.x = x;
                    entity.y = y;
                    entity.name = displayName;
                    entity.quests = activeQuests;
                }
            } else {
                // Add new
                this.mission.npcs.push(editorNpc);

                // Also add to entities for map rendering
                this.mission.entities.push({
                    type: 'npc',
                    x: x,
                    y: y,
                    id: npcId,
                    name: displayName,
                    quests: activeQuests
                });
            }

            this.updatePropertiesPanel();
            this.renderEntities();
            this.hideNPCDialog();
            this.saveToHistory();
        } catch (e) {
            alert('Invalid JSON format: ' + e.message);
        }
    }

    editNPC(index) {
        this.showNPCDialog(index);
    }

    // Gather dialog data from visual editor
    gatherDialogData() {
        const nodes = document.querySelectorAll('#dialog-nodes .dialog-node');
        const dialogData = [];

        nodes.forEach(node => {
            const greeting = node.querySelector('input[data-field="greeting"]').value;
            // For now, just save the greeting text
            // Full dialog tree editing would need more complex UI
            if (greeting) {
                dialogData.push({
                    greeting: greeting,
                    options: [] // Would be edited in detail dialog
                });
            }
        });

        // If no visual data, fallback to JSON
        if (dialogData.length === 0) {
            try {
                return JSON.parse(document.getElementById('npc-dialog').value);
            } catch {
                return [];
            }
        }

        return dialogData;
    }

    // Gather quest data from visual editor
    gatherQuestData() {
        const items = document.querySelectorAll('#quest-list .quest-item');
        const questData = [];

        items.forEach(item => {
            const idField = item.querySelector('input[data-field="id"]');
            const questIdField = item.querySelector('input[data-field="questId"]');

            if (questIdField) {
                // Just a quest ID reference
                questData.push(questIdField.value);
            } else if (idField) {
                // Full quest object
                const quest = {
                    id: idField.value,
                    name: item.querySelector('input[data-field="name"]')?.value || '',
                    description: item.querySelector('textarea[data-field="description"]')?.value || ''
                };
                questData.push(quest);
            }
        });

        // If no visual data, fallback to JSON
        if (questData.length === 0) {
            try {
                return JSON.parse(document.getElementById('npc-quests-data').value);
            } catch {
                return [];
            }
        }

        return questData;
    }

    // Add a new dialog node
    addDialogNode() {
        const container = document.getElementById('dialog-nodes');
        const index = container.children.length;
        const newNode = {
            greeting: 'Hello, traveler.',
            options: []
        };
        this.createDialogNodeElement(newNode, index, container);
    }

    // Add a new quest
    addQuest() {
        const container = document.getElementById('quest-list');
        const index = container.children.length;

        // Prompt for quest type
        const isReference = confirm('Add quest reference (OK) or create new quest (Cancel)?');

        if (isReference) {
            this.createQuestReferenceElement('quest_id', index, container);
        } else {
            const newQuest = {
                id: `quest_${Date.now()}`,
                name: 'New Quest',
                description: 'Quest description',
                objectives: [],
                rewards: {}
            };
            this.createQuestElement(newQuest, index, container);
        }
    }

    // Remove dialog node
    removeDialogNode(index) {
        const container = document.getElementById('dialog-nodes');
        const nodes = container.querySelectorAll('.dialog-node');
        if (nodes[index]) {
            nodes[index].remove();
            // Re-index remaining nodes
            this.reindexDialogNodes();
        }
    }

    // Remove quest
    removeQuest(index) {
        const container = document.getElementById('quest-list');
        const items = container.querySelectorAll('.quest-item');
        if (items[index]) {
            items[index].remove();
            // Re-index remaining quests
            this.reindexQuests();
        }
    }

    // Re-index dialog nodes after deletion
    reindexDialogNodes() {
        const nodes = document.querySelectorAll('#dialog-nodes .dialog-node');
        nodes.forEach((node, index) => {
            node.dataset.index = index;
            const title = node.querySelector('.node-title');
            if (title) title.textContent = `Dialog ${index + 1}`;
        });
    }

    // Re-index quests after deletion
    reindexQuests() {
        const items = document.querySelectorAll('#quest-list .quest-item');
        items.forEach((item, index) => {
            item.dataset.index = index;
        });
    }

    // Placeholder for detailed dialog editing
    editDialogNode(index) {
        alert('Full dialog tree editing would open a detailed editor here. For now, edit the greeting text directly or use the JSON fallback.');
    }

    // Placeholder for detailed quest editing
    editQuest(index) {
        alert('Full quest editing would open a detailed editor here. For now, edit the fields directly or use the JSON fallback.');
    }

    removeNPC(index) {
        this.mission.npcs.splice(index, 1);
        this.updatePropertiesPanel();
        this.saveToHistory();
    }

    // Legacy NPC editing functions - no longer used after simplification
    editNPCDialog(entityId) {
        // Deprecated - NPCs are now edited via Campaign Editor
        this.eventLogger.log('NPC editing has moved to Campaign Editor → NPCs tab', 'info');
        alert('To edit NPC templates, use Campaign Editor → NPCs tab');
    }

    // Legacy NPC quest editing - no longer used after simplification
    editNPCQuests(entityId) {
        // Deprecated - NPCs are now edited via Campaign Editor
        this.eventLogger.log('NPC quest editing has moved to Campaign Editor → NPCs tab', 'info');
        alert('To edit NPC templates and quests, use Campaign Editor → NPCs tab');
    }

    showEnemyDialog(index = -1) {
        const dialog = document.getElementById('enemy-dialog');
        if (!dialog) return;

        dialog.style.display = 'flex';

        if (index >= 0 && index < this.mission.entities.length) {
            const enemy = this.mission.entities[index];
            if (enemy.type === 'enemy') {
                document.getElementById('enemy-type').value = enemy.enemyType || 'guard';
                document.getElementById('enemy-x').value = enemy.x;
                document.getElementById('enemy-y').value = enemy.y;
                document.getElementById('enemy-level').value = enemy.level || 1;
                document.getElementById('enemy-health').value = enemy.health || 100;
                document.getElementById('enemy-ap').value = enemy.ap || 8;
                document.getElementById('enemy-damage').value = enemy.damage || 10;
                document.getElementById('enemy-armor').value = enemy.armor || 0;
                document.getElementById('enemy-vision').value = enemy.visionRange || 10;
                document.getElementById('enemy-speed').value = enemy.speed || 2.0;
                document.getElementById('enemy-alert-range').value = enemy.alertRange || 15;
                document.getElementById('enemy-ai').value = enemy.aiType || 'patrol';
                document.getElementById('enemy-patrol').value = JSON.stringify(enemy.patrolRoute || []);
            }
        }

        // Setup save/cancel handlers
        const saveBtn = document.getElementById('save-enemy');
        const cancelBtn = document.getElementById('cancel-enemy');

        const saveHandler = () => {
            this.saveEnemyDialog(index);
            saveBtn.removeEventListener('click', saveHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        const cancelHandler = () => {
            dialog.style.display = 'none';
            saveBtn.removeEventListener('click', saveHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };

        saveBtn.addEventListener('click', saveHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    }

    saveEnemyDialog(index) {
        const dialog = document.getElementById('enemy-dialog');
        if (index >= 0 && index < this.mission.entities.length) {
            const enemy = this.mission.entities[index];
            if (enemy.type === 'enemy') {
                enemy.enemyType = document.getElementById('enemy-type').value;
                enemy.x = parseInt(document.getElementById('enemy-x').value);
                enemy.y = parseInt(document.getElementById('enemy-y').value);
                enemy.level = parseInt(document.getElementById('enemy-level').value);
                enemy.health = parseInt(document.getElementById('enemy-health').value);
                enemy.ap = parseInt(document.getElementById('enemy-ap').value);
                enemy.damage = parseInt(document.getElementById('enemy-damage').value);
                enemy.armor = parseInt(document.getElementById('enemy-armor').value);
                enemy.visionRange = parseInt(document.getElementById('enemy-vision').value);
                enemy.speed = parseFloat(document.getElementById('enemy-speed').value);
                enemy.alertRange = parseInt(document.getElementById('enemy-alert-range').value);
                enemy.aiType = document.getElementById('enemy-ai').value;

                try {
                    enemy.patrolRoute = JSON.parse(document.getElementById('enemy-patrol').value);
                } catch (e) {
                    enemy.patrolRoute = [];
                }

                this.renderEntities();
                this.saveToHistory();
                this.eventLogger.log('Enemy updated', 'success');
            }
        }
        dialog.style.display = 'none';
    }

    addEvent() {
        const eventType = prompt('Event type (timer/trigger/condition):', 'trigger');
        const event = {
            type: eventType,
            time: eventType === 'timer' ? 30 : 0,
            condition: '',
            action: ''
        };
        this.mission.events.push(event);
        this.updateEventsTimeline();
        this.saveToHistory();
    }

    updateEventsTimeline() {
        const timeline = document.getElementById('events-timeline');
        timeline.innerHTML = '<strong>Events:</strong><br>';
        this.mission.events.forEach((event, index) => {
            timeline.innerHTML += `${index + 1}. ${event.type}: ${event.condition || event.time}s<br>`;
        });
    }

    saveToHistory() {
        // Remove future history if we're not at the end
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Add current state
        this.history.push(JSON.stringify(this.mission));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.mission = JSON.parse(this.history[this.historyIndex]);
            this.render();
            this.updatePropertiesPanel();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.mission = JSON.parse(this.history[this.historyIndex]);
            this.render();
            this.updatePropertiesPanel();
        }
    }

    newMission() {
        if (!confirm('Create new mission? Unsaved changes will be lost.')) return;

        this.mission = {
            name: 'New Mission',
            description: '',
            mapType: 'corporate',
            width: 80,
            height: 80,
            difficulty: 2,
            timeLimit: 0,
            credits: 5000,
            researchPoints: 2,
            tiles: [],
            entities: [],
            objectives: [],
            npcs: [],
            events: []
        };

        this.initMap();
        this.updatePropertiesPanel();
    }

    saveMission() {
        // Update mission with turn-based settings
        const tbEnabled = document.getElementById('tb-enabled');
        const tbForced = document.getElementById('tb-forced');
        const tbDefaultAP = document.getElementById('tb-default-ap');
        const tbInitiative = document.getElementById('tb-initiative');

        if (tbEnabled && tbEnabled.checked) {
            this.mission.turnBased = {
                enabled: true,
                forced: tbForced?.checked || false,
                defaultAgentAP: parseInt(tbDefaultAP?.value) || 12,
                initiativeMode: tbInitiative?.value || 'speed'
            };
        }

        const name = this.mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        localStorage.setItem(`mission_${name}`, JSON.stringify(this.mission));
        this.eventLogger.log(`Mission "${this.mission.name}" saved`, 'success', true);
    }

    loadMission() {
        // Get both local saved missions and campaign missions
        const saved = Object.keys(localStorage)
            .filter(k => k.startsWith('mission_'))
            .map(k => k.replace('mission_', ''));

        const campaignMissions = window.CAMPAIGN_MISSIONS ? Object.keys(window.CAMPAIGN_MISSIONS) : [];

        if (saved.length === 0 && campaignMissions.length === 0) {
            alert('No missions found.\nYou can:\n1. Create a new mission\n2. Import a campaign (Campaign > Import)');
            return;
        }

        let availableList = '';
        if (saved.length > 0) {
            availableList += 'LOCAL SAVED MISSIONS:\n' + saved.map(s => `  ${s}`).join('\n');
        }
        if (campaignMissions.length > 0) {
            if (availableList) availableList += '\n\n';
            availableList += 'CAMPAIGN MISSIONS:\n' + campaignMissions.map(m => {
                const mission = window.CAMPAIGN_MISSIONS[m];
                return `  ${m}: ${mission.name || 'Unnamed'}`;
            }).join('\n');
        }

        const name = prompt(`${availableList}\n\nEnter mission name or ID:`);
        if (!name) return;

        // Try loading from localStorage first
        const data = localStorage.getItem(`mission_${name}`);
        if (data) {
            this.mission = JSON.parse(data);
            this.canvas.width = this.mission.width * this.tileSize * this.zoom;
            this.canvas.height = this.mission.height * this.tileSize * this.zoom;
            this.render();
            this.updatePropertiesPanel();
            this.saveToHistory();
            this.eventLogger.log(`Loaded mission from localStorage: ${name}`, 'info', true);
        } else if (window.CAMPAIGN_MISSIONS && window.CAMPAIGN_MISSIONS[name]) {
            // Try loading from campaign missions
            this.loadMissionFromCampaign(name);
        } else {
            alert('Mission not found.');
        }
    }

    exportMission() {
        // Ask user what format to export
        const exportFormat = prompt(
            'Export format:\n' +
            '1 - Editor format (for backup/sharing)\n' +
            '2 - Game-ready format (to integrate into game)\n' +
            '3 - Both formats\n\n' +
            'Enter 1, 2, or 3:',
            '1'
        );

        if (!exportFormat) return;

        if (exportFormat === '1' || exportFormat === '3') {
            // Export editor format
            this.exportEditorFormat();
        }

        if (exportFormat === '2' || exportFormat === '3') {
            // Export game-ready format
            this.exportGameFormat();
        }
    }

    exportEditorFormat() {
        const dataStr = JSON.stringify(this.mission, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileDefaultName = `${this.mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_editor.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    exportGameFormat() {
        // Convert editor format to game format
        const gameData = this.convertToGameFormat();

        // Create a JavaScript file that can be directly integrated
        const jsContent = this.generateGameIntegrationFile(gameData);

        // Get filename from campaign structure
        const campaignId = document.getElementById('campaign-id').value || 'main';
        const actNumber = document.getElementById('act-number').value || '01';
        const missionNumber = document.getElementById('mission-number').value || '001';
        const filename = `${campaignId}-${actNumber}-${missionNumber}`;

        const dataUri = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(jsContent);
        const exportFileDefaultName = filename + '.js';

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();

        // Also show integration instructions
        this.showIntegrationInstructions(exportFileDefaultName);
    }

    convertToGameFormat() {
        const gameFormat = {
            missionDef: {
                id: this.mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase(),
                name: this.mission.name,
                description: this.mission.description,
                objectives: this.mission.objectives,
                rewards: {
                    credits: this.mission.credits,
                    researchPoints: this.mission.researchPoints
                }
            },
            mapData: {
                width: this.mission.width,
                height: this.mission.height,
                tiles: this.mission.tiles,
                spawn: null,
                extraction: null,
                terminals: [],
                doors: [],
                enemies: [],
                npcs: [],
                items: [],
                explosives: [],
                switches: [],
                gates: []
            }
        };

        // Process entities
        this.mission.entities.forEach(entity => {
            switch (entity.type) {
                case 'spawn-point':
                    gameFormat.mapData.spawn = { x: entity.x, y: entity.y };
                    break;
                case 'extraction':
                    gameFormat.mapData.extraction = { x: entity.x, y: entity.y };
                    break;
                case 'terminal':
                    gameFormat.mapData.terminals.push({
                        x: entity.x,
                        y: entity.y,
                        hacked: false,
                        id: gameFormat.mapData.terminals.length
                    });
                    break;
                case 'enemy':
                    gameFormat.mapData.enemies.push({
                        x: entity.x,
                        y: entity.y,
                        type: entity.enemyType || 'guard',
                        patrol: entity.patrolRoute || []
                    });
                    break;
                case 'npc':
                    gameFormat.mapData.npcs.push({
                        x: entity.x,
                        y: entity.y,
                        name: entity.name || 'NPC',
                        dialog: entity.dialog || [],
                        quests: entity.quests || []
                    });
                    break;
                case 'item':
                    gameFormat.mapData.items.push({
                        x: entity.x,
                        y: entity.y,
                        type: entity.itemType,
                        value: entity.value
                    });
                    break;
                case 'explosive':
                    gameFormat.mapData.explosives.push({
                        x: entity.x,
                        y: entity.y,
                        id: `explosive_${gameFormat.mapData.explosives.length}`,
                        planted: false
                    });
                    break;
                case 'switch':
                    gameFormat.mapData.switches.push({
                        x: entity.x,
                        y: entity.y,
                        id: `switch_${gameFormat.mapData.switches.length}`,
                        activated: false,
                        target: entity.target || null
                    });
                    break;
                case 'gate':
                    gameFormat.mapData.gates.push({
                        x: entity.x,
                        y: entity.y,
                        id: `gate_${gameFormat.mapData.gates.length}`,
                        breached: false
                    });
                    break;
            }
        });

        // Add door tiles
        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                if (this.mission.tiles[y][x] === 2) { // Door tile
                    gameFormat.mapData.doors.push({ x, y, locked: false });
                }
            }
        }

        return gameFormat;
    }

    generateEmbeddedTileStrings() {
        // Convert tile array to string format like in campaign files
        const tileStrings = [];

        for (let y = 0; y < this.mission.height; y++) {
            let row = '';
            for (let x = 0; x < this.mission.width; x++) {
                const tile = this.mission.tiles[y][x];
                // Map tile values to characters
                if (tile === 0) {
                    row += '.'; // Floor
                } else if (tile === 1) {
                    row += '#'; // Wall
                } else if (tile === 2) {
                    row += 'D'; // Door
                } else {
                    row += '.'; // Default to floor for unknown
                }
            }
            tileStrings.push(row);
        }

        return tileStrings;
    }

    generateEmbeddedMapData(mapData) {
        // This function is now deprecated - use generateEmbeddedTileStrings instead
        // Kept for backward compatibility
        const embeddedData = {
            spawn: mapData.spawn,
            extraction: mapData.extraction,
            customTiles: []
        };

        // Only include non-floor tiles in customTiles for efficiency
        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                const tileValue = mapData.tiles[y][x];
                if (tileValue !== 0) { // Not a floor tile
                    embeddedData.customTiles.push({
                        x: x,
                        y: y,
                        type: tileValue
                    });
                }
            }
        }

        return embeddedData;
    }

    generateGameIntegrationFile(gameData) {
        const campaignId = document.getElementById('campaign-id').value || 'main';
        const actNumber = document.getElementById('act-number').value || '01';
        const missionNumber = document.getElementById('mission-number').value || '001';
        const actName = document.getElementById('act-name').value || 'Beginning Operations';
        const maxAgents = parseInt(document.getElementById('max-agents').value) || 4;
        const requiredAgents = parseInt(document.getElementById('required-agents').value) || 2;
        const recommendedAgents = parseInt(document.getElementById('recommended-agents').value) || 3;

        // Get mission title for header comment
        const missionTitle = this.mission.title || 'Mission';

        // Create filename with campaign-act-mission format
        const missionId = `${campaignId}-${actNumber}-${missionNumber}`;

        // Convert tiles to string array format for embedded map
        const tileStrings = this.generateEmbeddedTileStrings();

        // Find spawn and extraction points from entities
        let spawn = null;
        let extraction = null;
        const terminals = [];
        const doors = [];
        const npcs = [];

        // Process entities
        this.mission.entities.forEach(entity => {
            switch(entity.type) {
                case 'spawn-point':
                    spawn = { x: entity.x, y: entity.y };
                    break;
                case 'extraction':
                    extraction = { x: entity.x, y: entity.y };
                    break;
                case 'terminal':
                    terminals.push({
                        x: entity.x,
                        y: entity.y,
                        id: `t${terminals.length + 1}`,
                        hackTime: 3000,
                        hacked: false
                    });
                    break;
                case 'npc':
                    npcs.push({
                        x: entity.x,
                        y: entity.y,
                        id: entity.id || `npc_${npcs.length + 1}`,
                        name: entity.name || 'NPC',
                        dialog: entity.dialog || [],
                        quests: entity.quests || []
                    });
                    break;
            }
        });

        // Check for doors in tiles
        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                if (this.mission.tiles[y][x] === 2) {
                    doors.push({ x, y, locked: false });
                }
            }
        }

        // Format tile strings for output with proper indentation
        const formattedTiles = tileStrings.map(row =>
            `                    "${row}"`
        ).join(',\n');

        // Generate the EXACT format used in campaign files
        let jsContent = `// Mission: ${this.mission.name} - ${missionTitle}
// Campaign: Main Campaign
// Act: ${parseInt(actNumber)} - ${actName}
// Mission: ${missionNumber}

(function() {
    const mission = {
        id: '${missionId}',
        campaign: '${campaignId}',
        act: ${parseInt(actNumber)},
        missionNumber: ${parseInt(missionNumber)},

        // Basic Info
        name: '${this.mission.name}',
        title: '${missionTitle}',
        description: '${this.mission.description || ''}',
        briefing: '${this.mission.description || 'Complete all objectives.'}',

        // Agent Configuration
        agents: {
            max: ${maxAgents},
            required: ${requiredAgents},
            recommended: ${recommendedAgents}
        },

        // Map Configuration with generation rules
        map: {
            type: '${this.mission.mapType}',
            name: '${this.mission.name}',
            width: ${this.mission.width},
            height: ${this.mission.height},
            spawn: ${spawn ? `{ x: ${spawn.x}, y: ${spawn.y} }` : 'null'},
            extraction: ${extraction ? `{ x: ${extraction.x}, y: ${extraction.y} }` : 'null'},

            // Map generation rules - the game will generate this procedurally
            generation: {
                baseType: 'walls',

                // Create corridors
                corridors: [
                    { type: 'horizontal', startY: 10, endY: 70, stepY: 15, width: 2 },
                    { type: 'vertical', startX: 10, endX: 70, stepX: 10, width: 2 }
                ],

                // Clear specific areas
                clearAreas: [
                    { x1: 0, y1: 75, x2: 10, y2: 79 },  // Spawn area
                    { x1: 75, y1: 0, x2: 79, y2: 5 },   // Extraction area
                ],

                // Create rooms
                rooms: [
                    { x: 10, y: 10, width: 15, height: 10, type: 'office' },
                    { x: 30, y: 20, width: 20, height: 15, type: 'server' }
                ]
            },

            embedded: {
                tiles: [
${formattedTiles}
                ],
                spawn: ${spawn ? `{ x: ${spawn.x}, y: ${spawn.y} }` : 'null'},
                extraction: ${extraction ? `{ x: ${extraction.x}, y: ${extraction.y} }` : 'null'},`;

        // Add terminals if any
        if (terminals.length > 0) {
            jsContent += `\n                terminals: ${JSON.stringify(terminals, null, 20).replace(/\n/g, '\n                ')},`;
        }

        // Add doors if any
        if (doors.length > 0) {
            jsContent += `\n                doors: ${JSON.stringify(doors, null, 20).replace(/\n/g, '\n                ')},`;
        }

        // Add NPCs if any
        if (npcs.length > 0) {
            jsContent += `\n                npcs: ${JSON.stringify(npcs, null, 20).replace(/\n/g, '\n                ')}`;
        } else {
            // Remove trailing comma if no NPCs
            jsContent = jsContent.replace(/,$/, '');
        }

        jsContent += `
            }
        },

        // Objectives
        objectives: ${JSON.stringify(this.mission.objectives || [], null, 8).replace(/\n/g, '\n        ')},

        // Rewards
        rewards: {
            credits: ${this.mission.credits || 5000},
            researchPoints: ${this.mission.researchPoints || 2},
            worldControl: 1
        },

        // Enemy configuration
        enemies: {
            count: ${gameData.mapData.enemies ? gameData.mapData.enemies.length : 8},
            types: ['guard', 'enforcer', 'hacker'],
            spawns: []
        }
    };

    // Self-registration with campaign system
    if (typeof CampaignSystem !== 'undefined' && CampaignSystem.registerMission) {
        CampaignSystem.registerMission('${campaignId}', ${parseInt(actNumber)}, '${missionId}', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['${missionId}'] = mission;
    }
})();`;

        return jsContent;
    }

    showIntegrationInstructions(filename) {
        const campaignId = document.getElementById('campaign-id').value || 'main';
        const actNumber = document.getElementById('act-number').value || '01';
        const missionNumber = document.getElementById('mission-number').value || '001';

        const instructions = `
CAMPAIGN MISSION SYSTEM - Integration Instructions
================================================

FILE: ${filename}.js
CAMPAIGN: ${campaignId}
ACT: ${actNumber}
MISSION: ${missionNumber}

INTEGRATION STEPS:
==================
1. Create campaign folder structure:
   campaigns/${campaignId}/act${parseInt(actNumber)}/

2. Save the exported file as:
   campaigns/${campaignId}/act${parseInt(actNumber)}/${filename}.js

3. Add to mission-editor.html (if not already):
   <script src="campaigns/${campaignId}/act${parseInt(actNumber)}/${filename}.js"></script>

4. The mission will be automatically registered!

CAMPAIGN STRUCTURE:
==================
campaigns/
├── main/           (Main campaign)
│   ├── act1/
│   │   ├── main-01-001.js
│   │   ├── main-01-002.js
│   │   └── main-01-003.js
│   └── act2/
│       ├── main-02-001.js
│       └── main-02-002.js
├── dlc1/           (DLC campaigns)
└── custom/         (User missions)

EMBEDDED MAP SYSTEM:
===================
Maps are now embedded directly in mission files:
- No separate map data files needed
- Efficient storage (only non-floor tiles)
- Complete map preservation
- Easy distribution

MISSION FEATURES:
================
✅ Embedded map data (spawn, extraction, tiles)
✅ Mission objectives with types
✅ Enemy spawns and patrol routes
✅ NPCs with dialogs and quests
✅ Interactive objects (terminals, explosives, switches, gates)
✅ Agent configuration per mission
✅ Rewards and difficulty settings

TESTING:
========
1. Open mission-editor.html
2. Use "Load Game Mission" to verify
3. Click "Test Mission" to play

GIT WORKFLOW:
============
# Before changes
git status

# Add your mission
git add campaigns/${campaignId}/act${parseInt(actNumber)}/${filename}.js

# Commit
git commit -m "Add mission: ${this.mission.name}"

# Push to repository
git push

ADVANTAGES:
==========
✅ Organized campaign structure
✅ Act-based progression
✅ Embedded maps (no external dependencies)
✅ Campaign metadata support
✅ Easy mission sharing
✅ Clean version control
        `;

        alert(instructions.trim());
        this.eventLogger.log(instructions, 'info');
    }

    importMission() {
        document.getElementById('file-input').click();
    }

    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.mission = JSON.parse(e.target.result);
                this.canvas.width = this.mission.width * this.tileSize * this.zoom;
                this.canvas.height = this.mission.height * this.tileSize * this.zoom;
                this.render();
                this.updatePropertiesPanel();
                this.saveToHistory();
                alert('Mission imported successfully!');
            } catch (err) {
                alert('Error loading mission: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    validateMission() {
        const errors = [];
        const warnings = [];

        // Check for spawn point
        if (!this.mission.entities.find(e => e.type === 'spawn-point')) {
            errors.push('No spawn point defined');
        }

        // Check for extraction point
        if (!this.mission.entities.find(e => e.type === 'extraction')) {
            warnings.push('No extraction point defined');
        }

        // Check for objectives
        if (this.mission.objectives.length === 0) {
            warnings.push('No objectives defined');
        }

        // Check map connectivity (simple flood fill from spawn)
        const spawn = this.mission.entities.find(e => e.type === 'spawn-point');
        if (spawn) {
            const reachable = this.checkReachability(spawn.x, spawn.y);
            const extraction = this.mission.entities.find(e => e.type === 'extraction');
            if (extraction && !reachable.has(`${extraction.x},${extraction.y}`)) {
                errors.push('Extraction point not reachable from spawn');
            }
        }

        // Check for isolated areas
        let floorTiles = 0;
        for (let y = 0; y < this.mission.height; y++) {
            for (let x = 0; x < this.mission.width; x++) {
                if (this.mission.tiles[y][x] === 0) floorTiles++;
            }
        }
        if (floorTiles < 50) {
            warnings.push('Very few walkable tiles');
        }

        // Display results
        let message = 'Validation Results:\n\n';
        if (errors.length > 0) {
            message += 'ERRORS:\n' + errors.join('\n') + '\n\n';
        }
        if (warnings.length > 0) {
            message += 'WARNINGS:\n' + warnings.join('\n');
        }
        if (errors.length === 0 && warnings.length === 0) {
            message = 'Mission is valid! ✅';
        }

        alert(message);
    }

    checkReachability(startX, startY) {
        const visited = new Set();
        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const key = `${x},${y}`;

            if (visited.has(key)) continue;
            visited.add(key);

            if (x < 0 || x >= this.mission.width || y < 0 || y >= this.mission.height) continue;
            if (this.mission.tiles[y][x] === 1) continue; // Wall

            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        return visited;
    }

    testMission() {
        // Export mission and launch game with it
        const missionData = JSON.stringify(this.mission);
        sessionStorage.setItem('test_mission', missionData);

        // Open game in new window with test parameter
        const gameWindow = window.open('index.html?test_mission=true', '_blank');

        if (!gameWindow) {
            alert('Please allow popups to test the mission.');
        }
    }

    loadGameMission(missionId) {
        // Check if campaign missions are loaded
        if (typeof CAMPAIGN_MISSIONS === 'undefined') {
            alert('Campaign missions not loaded. Please refresh the page.');
            return;
        }

        let missionDef = CAMPAIGN_MISSIONS[missionId];
        if (!missionDef) {
            // Try loading by index for backward compatibility
            const missions = Object.values(CAMPAIGN_MISSIONS);
            if (missions[missionId]) {
                missionDef = missions[missionId];
            } else {
                alert('Mission not found: ' + missionId);
                return;
            }
        }

        this.eventLogger.log(`Loading campaign mission: ${missionDef.name}`, 'info');

        // Update the dropdown selection to reflect the loaded mission
        const dropdown = document.getElementById('load-game-mission');
        if (dropdown) {
            // Set the value
            dropdown.value = missionId;

            // Update the caption to show current mission
            const firstOption = dropdown.options[0];
            if (firstOption && firstOption.value === '') {
                firstOption.text = `Current: ${missionDef.name || missionId}`;
            }
        }

        // Close the campaign dialog if it's open
        const campaignDialog = document.getElementById('campaign-dialog');
        if (campaignDialog && campaignDialog.style.display !== 'none') {
            campaignDialog.style.display = 'none';
        }

        // Mission now has embedded map data
        const mapDef = missionDef.map;
        if (!mapDef || (!mapDef.generation && !mapDef.embedded)) {
            alert('Mission does not have map data (neither generation nor embedded)');
            return;
        }

        // Convert game mission to editor format
        this.mission = {
            name: missionDef.name,
            description: missionDef.description,
            mapType: mapDef.type || 'custom',
            width: mapDef.width || 80,
            height: mapDef.height || 80,
            difficulty: missionDef.difficulty || 2,
            timeLimit: 0,
            credits: missionDef.rewards.credits,
            researchPoints: missionDef.rewards.researchPoints || missionDef.rewards.experience || 2,
            tiles: [],
            entities: [],
            objectives: missionDef.objectives || [],
            npcs: missionDef.npcs || [],
            events: []
        };

        // Generate map tiles from embedded definition
        this.generateMapFromEmbeddedDefinition(mapDef);

        // Add spawn point from map definition (check embedded first, then root)
        const spawn = mapDef.embedded?.spawn || mapDef.spawn;
        if (spawn) {
            this.mission.entities.push({
                type: 'spawn-point',
                x: spawn.x,
                y: spawn.y,
                id: Date.now()
            });
        }

        // Add extraction point from map definition (check embedded first, then root)
        const extraction = mapDef.embedded?.extraction || mapDef.extraction;
        if (extraction) {
            this.mission.entities.push({
                type: 'extraction',
                x: extraction.x,
                y: extraction.y,
                id: Date.now() + 1
            });
        }

        // Add enemies from map definition
        if (mapDef.enemySpawns) {
            mapDef.enemySpawns.forEach((spawn, index) => {
                this.mission.entities.push({
                    type: 'enemy',
                    x: spawn.x,
                    y: spawn.y,
                    enemyType: spawn.type || 'guard',
                    alertLevel: 0,
                    patrolRoute: spawn.patrol || [],
                    id: Date.now() + 100 + index
                });
            });
        } else if (missionDef.enemies && missionDef.enemies.spawns) {
            // Fallback to mission-defined spawns
            missionDef.enemies.spawns.forEach((spawn, index) => {
                this.mission.entities.push({
                    type: 'enemy',
                    x: spawn.x,
                    y: spawn.y,
                    enemyType: spawn.type || 'guard',
                    alertLevel: 0,
                    patrolRoute: spawn.patrol || [],
                    id: Date.now() + 100 + index
                });
            });
        }

        // Add terminals from map definition
        if (mapDef.terminals) {
            mapDef.terminals.forEach((terminal, index) => {
                this.mission.entities.push({
                    type: 'terminal',
                    x: terminal.x,
                    y: terminal.y,
                    id: Date.now() + 200 + index
                });
            });
        }

        // Add doors as entities (optional, for visualization)
        if (mapDef.doors) {
            mapDef.doors.forEach((door, index) => {
                // Mark door tiles
                if (door.x < this.mission.width && door.y < this.mission.height) {
                    this.mission.tiles[door.y][door.x] = 2; // Door tile type
                }
            });
        }

        // Add NPCs from map definition
        if (mapDef.npcs) {
            mapDef.npcs.forEach((npc, index) => {
                const npcX = npc.spawn ? npc.spawn.x : (npc.position ? npc.position.x : npc.x);
                const npcY = npc.spawn ? npc.spawn.y : (npc.position ? npc.position.y : npc.y);

                if (npcX !== undefined && npcY !== undefined) {
                    this.mission.entities.push({
                        type: 'npc',
                        x: npcX,
                        y: npcY,
                        id: npc.id || `npc_${index}`,
                        name: npc.name || npc.id || 'NPC',
                        dialog: npc.dialog || [],
                        quests: npc.quests || []
                    });
                }
            });
        }

        // Add collectables as items
        if (mapDef.collectables) {
            mapDef.collectables.forEach((item, index) => {
                this.mission.entities.push({
                    type: 'item',
                    x: item.x,
                    y: item.y,
                    itemType: item.type || 'credits',
                    value: 100,
                    id: Date.now() + 600 + index
                });
            });
        }

        // Add mission-specific objects
        if (missionDef.map.objects) {
            missionDef.map.objects.forEach((obj, index) => {
                if (obj.type === 'terminal' && !mapDef.terminals) {
                    this.mission.entities.push({
                        type: 'terminal',
                        x: obj.x,
                        y: obj.y,
                        id: Date.now() + 700 + index
                    });
                } else if (obj.type === 'explosive') {
                    this.mission.entities.push({
                        type: 'explosive',
                        x: obj.x,
                        y: obj.y,
                        id: Date.now() + 800 + index
                    });
                } else if (obj.type === 'switch') {
                    this.mission.entities.push({
                        type: 'switch',
                        x: obj.x,
                        y: obj.y,
                        id: Date.now() + 900 + index
                    });
                } else if (obj.type === 'gate') {
                    this.mission.entities.push({
                        type: 'gate',
                        x: obj.x,
                        y: obj.y,
                        id: Date.now() + 1000 + index
                    });
                }
            });
        }

        // Add NPCs from embedded mission data (but don't duplicate if already added above at line 2259)
        // Clear the npcs array first to avoid duplication since it was copied at line 2259
        this.mission.npcs = [];

        if (missionDef.npcs) {
            missionDef.npcs.forEach((npc, index) => {
                // Handle multiple position formats: spawn, position, or x/y directly
                const npcX = npc.spawn ? npc.spawn.x : (npc.position ? npc.position.x : npc.x);
                const npcY = npc.spawn ? npc.spawn.y : (npc.position ? npc.position.y : npc.y);

                if (npcX !== undefined && npcY !== undefined) {
                    const npcData = {
                        id: npc.id,
                        name: npc.name || npc.id,
                        type: npc.type || 'civilian',
                        x: npcX,
                        y: npcY,
                        dialog: npc.dialog || [],
                        quests: npc.quests || []
                    };

                    this.mission.npcs.push(npcData);

                    // CRITICAL: Also add to entities so NPCs render on the map
                    // Check if not already in entities (avoid duplicates from mapDef.npcs)
                    const alreadyExists = this.mission.entities.some(e =>
                        e.type === 'npc' && e.x === npcX && e.y === npcY
                    );

                    if (!alreadyExists) {
                        this.mission.entities.push({
                            type: 'npc',
                            x: npcX,
                            y: npcY,
                            id: npc.id || `npc_${index}`,
                            name: npc.name || npc.id || 'NPC',
                            dialog: npc.dialog || [],
                            quests: npc.quests || []
                        });
                    }
                }
            });
        }

        // Update canvas size
        this.canvas.width = this.mission.width * this.tileSize * this.zoom;
        this.canvas.height = this.mission.height * this.tileSize * this.zoom;

        // Update UI
        document.getElementById('mission-name').value = this.mission.name;
        document.getElementById('mission-desc').value = this.mission.description;
        document.getElementById('map-type').value = this.mission.mapType;
        document.getElementById('map-width').value = this.mission.width;
        document.getElementById('map-height').value = this.mission.height;
        document.getElementById('credits-reward').value = this.mission.credits;
        document.getElementById('research-reward').value = this.mission.researchPoints;

        this.render();
        this.updatePropertiesPanel();
        this.saveToHistory();

        this.eventLogger.log(`Loaded mission: ${missionDef.name}`, 'success', true);

        // Show a temporary notification that the mission was loaded
        const notification = document.createElement('div');
        notification.innerHTML = `✅ Loaded: ${missionDef.name || missionId}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00ff41;
            color: #1a1a2e;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    startPatrolRouteEditor(entityId) {
        const entity = this.mission.entities.find(e => e.id == entityId);
        if (!entity || entity.type !== 'enemy') return;

        // Enter patrol route editing mode
        this.editingPatrolRoute = {
            entityId: entityId,
            points: entity.patrolRoute ? [...entity.patrolRoute] : []
        };

        alert('Click on the map to add patrol points. Press ESC to finish.');
        this.currentTool = 'patrol-route';
        this.render();
    }

    clearPatrolRoute(entityId) {
        const entity = this.mission.entities.find(e => e.id == entityId);
        if (!entity) return;

        entity.patrolRoute = [];
        this.showEntityProperties(entity);
        this.render();
        this.saveToHistory();
    }

    addPatrolPoint(x, y) {
        if (!this.editingPatrolRoute) return;

        this.editingPatrolRoute.points.push({ x, y });
        this.render();
        this.drawPatrolRoute();
    }

    finishPatrolRoute() {
        if (!this.editingPatrolRoute) return;

        const entity = this.mission.entities.find(e => e.id == this.editingPatrolRoute.entityId);
        if (entity) {
            entity.patrolRoute = this.editingPatrolRoute.points;
            this.showEntityProperties(entity);
            this.saveToHistory();
        }

        this.editingPatrolRoute = null;
        this.currentTool = 'select';
        this.render();
    }

    drawPatrolRoute() {
        if (!this.editingPatrolRoute || this.editingPatrolRoute.points.length === 0) return;

        const size = this.tileSize * this.zoom;
        this.ctx.strokeStyle = '#ff00ff';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);

        // Draw lines between points
        this.ctx.beginPath();
        for (let i = 0; i < this.editingPatrolRoute.points.length; i++) {
            const point = this.editingPatrolRoute.points[i];
            const px = point.x * size + size / 2 + this.offsetX;
            const py = point.y * size + size / 2 + this.offsetY;

            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }

        // Connect back to start for loop
        if (this.editingPatrolRoute.points.length > 1) {
            const firstPoint = this.editingPatrolRoute.points[0];
            const fpx = firstPoint.x * size + size / 2 + this.offsetX;
            const fpy = firstPoint.y * size + size / 2 + this.offsetY;
            this.ctx.lineTo(fpx, fpy);
        }

        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Draw points
        this.editingPatrolRoute.points.forEach((point, index) => {
            const px = point.x * size + size / 2 + this.offsetX;
            const py = point.y * size + size / 2 + this.offsetY;

            this.ctx.fillStyle = '#ff00ff';
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw index
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px monospace';
            this.ctx.fillText(index + 1, px + 6, py - 6);
        });
    }

    generateMapFromType(mapType) {
        const width = this.mission.width;
        const height = this.mission.height;

        // Initialize empty map
        this.mission.tiles = [];
        for (let y = 0; y < height; y++) {
            this.mission.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                this.mission.tiles[y][x] = 1; // Default to walls
            }
        }

        // Generate map using the EXACT same logic as the game
        switch (mapType) {
            case 'corporate':
                // Create main corridors - EXACT SAME AS GAME
                // Horizontal main corridors
                for (let y = 10; y < height - 10; y += 15) {
                    for (let x = 1; x < width - 1; x++) {
                        this.mission.tiles[y][x] = 0;
                        if (y + 1 < height) this.mission.tiles[y + 1][x] = 0;
                    }
                }

                // Vertical main corridors
                for (let x = 10; x < width - 10; x += 15) {
                    for (let y = 1; y < height - 1; y++) {
                        this.mission.tiles[y][x] = 0;
                        if (x + 1 < width) this.mission.tiles[y][x + 1] = 0;
                    }
                }

                // Clear spawn area (bottom left) - EXPANDED for better access
                for (let x = 0; x <= 10; x++) {
                    for (let y = 75; y <= 79; y++) {
                        if (y < height && x < width) {
                            this.mission.tiles[y][x] = 0;
                        }
                    }
                }

                // Clear extraction area (top right)
                for (let x = 75; x <= 79; x++) {
                    for (let y = 1; y <= 5; y++) {
                        if (y < height && x < width) {
                            this.mission.tiles[y][x] = 0;
                        }
                    }
                }

                // Connect spawn to main corridor system
                for (let y = 70; y < 79; y++) {
                    if (y < height) {
                        this.mission.tiles[y][2] = 0;
                        this.mission.tiles[y][3] = 0;
                    }
                }
                for (let x = 2; x < 11; x++) {
                    if (x < width) this.mission.tiles[70][x] = 0;
                }

                // Connect extraction to main corridor system
                for (let y = 2; y < 11; y++) {
                    if (y < height) {
                        this.mission.tiles[y][77] = 0;
                        this.mission.tiles[y][78] = 0;
                    }
                }
                for (let x = 70; x < 79; x++) {
                    if (x < width) this.mission.tiles[10][x] = 0;
                }

                // Create office rooms - ORIGINAL PATTERN
                for (let rx = 5; rx < width - 10; rx += 20) {
                    for (let ry = 5; ry < height - 10; ry += 20) {
                        // Room boundaries
                        for (let x = rx; x < rx + 12; x++) {
                            for (let y = ry; y < ry + 12; y++) {
                                if (x < width - 1 && y < height - 1) {
                                    this.mission.tiles[y][x] = 0;
                                }
                            }
                        }

                        // Add internal walls for cubicles
                        if (rx % 40 === 5) {
                            for (let i = 2; i < 10; i += 3) {
                                if (ry + i < height - 1 && rx + 6 < width - 1) {
                                    this.mission.tiles[ry + i][rx + 6] = 1;
                                }
                            }
                        }
                    }
                }

                // Re-clear the corridors that might have been overwritten by room walls
                // Horizontal main corridors
                for (let y = 10; y < height - 10; y += 15) {
                    for (let x = 1; x < width - 1; x++) {
                        this.mission.tiles[y][x] = 0;
                        if (y + 1 < height) this.mission.tiles[y + 1][x] = 0;
                    }
                }

                // Vertical main corridors
                for (let x = 10; x < width - 10; x += 15) {
                    for (let y = 1; y < height - 1; y++) {
                        this.mission.tiles[y][x] = 0;
                        if (x + 1 < width) this.mission.tiles[y][x + 1] = 0;
                    }
                }

                // Re-clear spawn and extraction connections
                for (let y = 70; y < 79; y++) {
                    if (y < height) {
                        this.mission.tiles[y][2] = 0;
                        this.mission.tiles[y][3] = 0;
                    }
                }
                for (let x = 2; x < 11; x++) {
                    if (x < width) this.mission.tiles[70][x] = 0;
                }
                for (let y = 2; y < 11; y++) {
                    if (y < height) {
                        this.mission.tiles[y][77] = 0;
                        this.mission.tiles[y][78] = 0;
                    }
                }
                for (let x = 70; x < 79; x++) {
                    if (x < width) this.mission.tiles[10][x] = 0;
                }
                break;

            case 'government':
            case 'research':
                // Similar to corporate but can have variations
                // For now, use similar pattern
                for (let y = 10; y < height - 10; y += 15) {
                    for (let x = 1; x < width - 1; x++) {
                        this.mission.tiles[y][x] = 0;
                        if (y + 1 < height) this.mission.tiles[y + 1][x] = 0;
                    }
                }
                for (let x = 10; x < width - 10; x += 15) {
                    for (let y = 1; y < height - 1; y++) {
                        this.mission.tiles[y][x] = 0;
                        if (x + 1 < width) this.mission.tiles[y][x + 1] = 0;
                    }
                }

                // Create rooms
                for (let rx = 5; rx < width - 10; rx += 20) {
                    for (let ry = 5; ry < height - 10; ry += 20) {
                        for (let x = rx; x < rx + 12 && x < width - 1; x++) {
                            for (let y = ry; y < ry + 12 && y < height - 1; y++) {
                                this.mission.tiles[y][x] = 0;
                            }
                        }
                    }
                }
                break;

            case 'industrial':
                // Large open areas with machinery
                for (let y = 5; y < this.mission.height - 5; y += 25) {
                    for (let x = 5; x < this.mission.width - 5; x += 30) {
                        // Large warehouse spaces
                        for (let dx = 0; dx < 25 && x + dx < this.mission.width - 1; dx++) {
                            for (let dy = 0; dy < 20 && y + dy < this.mission.height - 1; dy++) {
                                this.mission.tiles[y + dy][x + dx] = 0;
                            }
                        }
                    }
                }

                // Connect with wide corridors
                for (let y = 15; y < this.mission.height - 15; y += 25) {
                    for (let x = 0; x < this.mission.width; x++) {
                        for (let w = -2; w <= 2; w++) {
                            if (y + w > 0 && y + w < this.mission.height - 1) {
                                this.mission.tiles[y + w][x] = 0;
                            }
                        }
                    }
                }
                break;

            case 'slums':
                // Irregular maze-like structure
                // Start with some main paths
                for (let i = 0; i < 5; i++) {
                    const y = Math.floor(Math.random() * (this.mission.height - 20)) + 10;
                    for (let x = 0; x < this.mission.width; x++) {
                        this.mission.tiles[y][x] = 0;
                        if (y > 0) this.mission.tiles[y - 1][x] = 0;
                        if (y < this.mission.height - 1) this.mission.tiles[y + 1][x] = 0;
                    }
                }

                for (let i = 0; i < 5; i++) {
                    const x = Math.floor(Math.random() * (this.mission.width - 20)) + 10;
                    for (let y = 0; y < this.mission.height; y++) {
                        this.mission.tiles[y][x] = 0;
                        if (x > 0) this.mission.tiles[y][x - 1] = 0;
                        if (x < this.mission.width - 1) this.mission.tiles[y][x + 1] = 0;
                    }
                }

                // Add random small buildings
                for (let i = 0; i < 20; i++) {
                    const x = Math.floor(Math.random() * (this.mission.width - 15)) + 5;
                    const y = Math.floor(Math.random() * (this.mission.height - 15)) + 5;
                    const w = Math.floor(Math.random() * 6) + 4;
                    const h = Math.floor(Math.random() * 6) + 4;

                    for (let dx = 0; dx < w && x + dx < this.mission.width - 1; dx++) {
                        for (let dy = 0; dy < h && y + dy < this.mission.height - 1; dy++) {
                            this.mission.tiles[y + dy][x + dx] = 0;
                        }
                    }
                }
                break;

            default:
                // Simple open map with border walls
                for (let y = 1; y < this.mission.height - 1; y++) {
                    for (let x = 1; x < this.mission.width - 1; x++) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
                break;
        }
    }

    generateMapFromEmbeddedDefinition(mapDef) {
        // Initialize tiles array
        this.mission.tiles = [];
        for (let y = 0; y < mapDef.height; y++) {
            this.mission.tiles[y] = [];
            for (let x = 0; x < mapDef.width; x++) {
                this.mission.tiles[y][x] = 0; // Default to walkable
            }
        }

        // Check if we have embedded tiles (new format)
        if (mapDef.embedded && mapDef.embedded.tiles) {
            this.eventLogger.log('Loading embedded tiles...', 'info');

            // Check if tiles are in string array format (new efficient format)
            if (typeof mapDef.embedded.tiles[0] === 'string') {
                const tileMap = {
                    '#': 1,  // wall
                    '.': 0,  // floor
                    'D': 0,  // door (walkable)
                    'W': 1,  // window (blocks)
                    'T': 0,  // terminal (walkable)
                    'C': 0,  // cover (walkable)
                    'E': 0,  // explosive (walkable)
                    'G': 0,  // gate (walkable)
                    'S': 0   // switch (walkable)
                };

                for (let y = 0; y < mapDef.height; y++) {
                    const row = mapDef.embedded.tiles[y] || '';
                    for (let x = 0; x < mapDef.width; x++) {
                        const char = row[x] || '.';
                        this.mission.tiles[y][x] = tileMap[char] !== undefined ? tileMap[char] : 0;
                    }
                }
                this.eventLogger.log('Loaded string-based embedded tiles', 'success');
            } else if (mapDef.embedded.customTiles) {
                // Old object-based format
                mapDef.embedded.customTiles.forEach(tile => {
                    if (tile.y >= 0 && tile.y < mapDef.height &&
                        tile.x >= 0 && tile.x < mapDef.width) {
                        this.mission.tiles[tile.y][tile.x] = tile.type;
                    }
                });
            }

            // Load items from embedded data
            if (mapDef.embedded.items) {
                mapDef.embedded.items.forEach(item => {
                    this.mission.entities.push({
                        type: item.type,
                        x: item.x,
                        y: item.y,
                        id: item.id || this.mission.entities.length
                    });
                });
            }

            return; // Done loading embedded tiles
        }

        // Otherwise use generation rules (old format)
        const gen = mapDef.generation;
        if (!gen) {
            this.eventLogger.log('No generation rules or embedded tiles in map definition', 'error', true);
            return;
        }

        // Set base tile type
        if (gen.baseType === 'walls') {
            for (let y = 0; y < mapDef.height; y++) {
                for (let x = 0; x < mapDef.width; x++) {
                    this.mission.tiles[y][x] = 1;
                }
            }
        }

        // Add borders if specified
        if (gen.borders) {
            for (let x = 0; x < mapDef.width; x++) {
                this.mission.tiles[0][x] = 1;
                this.mission.tiles[mapDef.height - 1][x] = 1;
            }
            for (let y = 0; y < mapDef.height; y++) {
                this.mission.tiles[y][0] = 1;
                this.mission.tiles[y][mapDef.width - 1] = 1;
            }
        }

        // Generate grid-based rooms
        if (gen.rooms && gen.rooms.type === 'grid') {
            const rooms = gen.rooms;
            for (let x = rooms.startX; x < mapDef.width - rooms.roomWidth; x += rooms.stepX) {
                for (let y = rooms.startY; y < mapDef.height - rooms.roomHeight; y += rooms.stepY) {
                    // Clear room interior
                    for (let rx = x; rx < x + rooms.roomWidth && rx < mapDef.width; rx++) {
                        for (let ry = y; ry < y + rooms.roomHeight && ry < mapDef.height; ry++) {
                            this.mission.tiles[ry][rx] = 0;
                        }
                    }
                }
            }
        }

        // Add corridors
        if (gen.corridors) {
            gen.corridors.forEach(corridor => {
                if (corridor.type === 'horizontal') {
                    for (let y = corridor.startY; y <= corridor.endY && y < mapDef.height; y += corridor.stepY) {
                        for (let x = 0; x < mapDef.width; x++) {
                            for (let w = 0; w < corridor.width && y + w < mapDef.height; w++) {
                                this.mission.tiles[y + w][x] = 0;
                            }
                        }
                    }
                } else if (corridor.type === 'vertical') {
                    for (let x = corridor.startX; x <= corridor.endX && x < mapDef.width; x += corridor.stepX) {
                        for (let y = 0; y < mapDef.height; y++) {
                            for (let w = 0; w < corridor.width && x + w < mapDef.width; w++) {
                                this.mission.tiles[y][x + w] = 0;
                            }
                        }
                    }
                }
            });
        }

        // Clear specific areas
        if (gen.clearAreas) {
            gen.clearAreas.forEach(area => {
                for (let x = area.x1; x <= area.x2 && x < mapDef.width; x++) {
                    for (let y = area.y1; y <= area.y2 && y < mapDef.height; y++) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
            });
        }

        // Industrial map generation
        if (gen.docks) {
            gen.docks.forEach(dock => {
                for (let x = dock.x1; x <= dock.x2 && x < mapDef.width; x++) {
                    for (let y = dock.y1; y <= dock.y2 && y < mapDef.height; y++) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
            });
        }

        // Residential map buildings
        if (gen.buildings) {
            gen.buildings.forEach(building => {
                for (let x = building.x; x < building.x + building.width && x < mapDef.width; x++) {
                    for (let y = building.y; y < building.y + building.height && y < mapDef.height; y++) {
                        this.mission.tiles[y][x] = 1; // Buildings are walls
                    }
                }
            });
        }

        // Fortress map courtyards
        if (gen.courtyards) {
            gen.courtyards.forEach(court => {
                for (let x = court.x1; x <= court.x2 && x < mapDef.width; x++) {
                    for (let y = court.y1; y <= court.y2 && y < mapDef.height; y++) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
            });
        }

        // Clear spawn and extraction areas
        if (mapDef.spawn) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const y = mapDef.spawn.y + dy;
                    const x = mapDef.spawn.x + dx;
                    if (y >= 0 && y < mapDef.height && x >= 0 && x < mapDef.width) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
            }
        }

        if (mapDef.extraction) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const y = mapDef.extraction.y + dy;
                    const x = mapDef.extraction.x + dx;
                    if (y >= 0 && y < mapDef.height && x >= 0 && x < mapDef.width) {
                        this.mission.tiles[y][x] = 0;
                    }
                }
            }
        }

        this.eventLogger.log(`Generated map from embedded definition: ${mapDef.width}x${mapDef.height}`, 'success');
    }

    async showCampaignConfig() {
        const dialog = document.getElementById('campaign-dialog');
        dialog.style.display = 'block';

        // Check if campaign manager exists and is ready
        if (window.campaignManager && window.campaignManager.isInitialized) {
            window.campaignManager.switchTab('overview');
        } else {
            // Wait for campaign manager to be ready
            await new Promise(resolve => {
                const checkInit = setInterval(() => {
                    if (window.campaignManager && window.campaignManager.isInitialized) {
                        clearInterval(checkInit);
                        resolve();
                    }
                }, 100);
                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkInit);
                    resolve();
                }, 5000);
            });

            if (window.campaignManager && window.campaignManager.isInitialized) {
                window.campaignManager.switchTab('overview');
            } else {
                this.eventLogger.log('Campaign manager not ready', 'error', true);
            }
        }

        // Old code for backward compatibility - skip if elements don't exist
        const overview = document.getElementById('campaign-overview');
        const structure = document.getElementById('campaign-structure');

        if (!overview || !structure) {
            this.eventLogger.log('Using new campaign management UI', 'info');
            return;
        }

        if (!CAMPAIGN_MISSIONS || Object.keys(CAMPAIGN_MISSIONS).length === 0) {
            overview.innerHTML = '<p style="color: #ff073a;">No campaigns loaded</p>';
            structure.innerHTML = '<p style="color: #ff073a;">No missions found</p>';
            return;
        }

        // Group missions by campaign and act
        const campaigns = {};
        let totalMissions = 0;
        let totalCredits = 0;
        let totalResearch = 0;

        for (const [key, mission] of Object.entries(CAMPAIGN_MISSIONS)) {
            const parts = key.split('-');
            const campaign = parts[0];
            const act = parts[1];
            const missionNum = parts[2];

            if (!campaigns[campaign]) campaigns[campaign] = {};
            if (!campaigns[campaign][act]) campaigns[campaign][act] = [];

            campaigns[campaign][act].push({
                key: key,
                num: missionNum,
                mission: mission
            });

            totalMissions++;
            totalCredits += (mission.rewards?.credits || 0);
            totalResearch += (mission.rewards?.researchPoints || 0);
        }

        // Display overview
        overview.innerHTML = `
            <p>Total Missions: ${totalMissions}</p>
            <p>Total Credits Available: ${totalCredits}</p>
            <p>Total Research Points: ${totalResearch}</p>
            <p>Campaigns: ${Object.keys(campaigns).join(', ')}</p>
        `;

        // Display structure
        let structureHTML = '';
        for (const [campaignName, acts] of Object.entries(campaigns)) {
            structureHTML += `<h4 style="color: #00ff41;">Campaign: ${campaignName.toUpperCase()}</h4>`;

            for (const [actNum, missions] of Object.entries(acts)) {
                structureHTML += `<h5 style="color: #0099ff; margin-left: 20px;">Act ${actNum}</h5>`;

                // Sort missions by number
                missions.sort((a, b) => a.num.localeCompare(b.num));

                for (const missionData of missions) {
                    const m = missionData.mission;
                    structureHTML += `
                        <div style="margin-left: 40px; margin-bottom: 10px; padding: 5px; background: #16213e; border-left: 3px solid #00ff41;">
                            <strong>${missionData.key}</strong>: ${m.title || 'Untitled'}<br>
                            <span style="color: #888;">Difficulty: ${m.difficulty || 'Unknown'} |
                            Credits: ${m.rewards?.credits || 0} |
                            Research: ${m.rewards?.researchPoints || 0}</span>
                        </div>
                    `;
                }
            }
        }
        structure.innerHTML = structureHTML;

        // Setup dialog buttons
        const closeBtn = document.getElementById('campaign-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                dialog.style.display = 'none';
            };
        }

        document.getElementById('campaign-export').onclick = () => {
            this.exportCampaign();
        };
    }

    async exportCampaign() {
        if (!CAMPAIGN_MISSIONS || Object.keys(CAMPAIGN_MISSIONS).length === 0) {
            alert('No campaign data to export');
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded. Falling back to JSON export.');
            this.exportCampaignJSON();
            return;
        }

        const campaignName = document.getElementById('campaign-name').value || 'main';

        try {
            const zip = new JSZip();

            // Create folder structure: campaigns/[campaign-name]/
            const campaignFolder = zip.folder(`campaigns/${campaignName}`);

            // Group missions by act
            const missionsByAct = {};

            for (const [key, mission] of Object.entries(CAMPAIGN_MISSIONS)) {
                const parts = key.split('-');
                const act = `act${parts[1]}`;

                if (!missionsByAct[act]) {
                    missionsByAct[act] = {};
                }

                missionsByAct[act][key] = mission;
            }

            // Create act folders and mission files
            for (const [actName, missions] of Object.entries(missionsByAct)) {
                const actFolder = campaignFolder.folder(actName);

                for (const [missionKey, missionData] of Object.entries(missions)) {
                    // Create mission file content
                    const missionContent = `// Mission: ${missionData.title || missionKey}
// Generated by CyberOps Mission Editor
// ${new Date().toISOString()}

(function() {
    window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};

    window.CAMPAIGN_MISSIONS['${missionKey}'] = ${JSON.stringify(missionData, null, 4)};

    console.log('✅ Loaded mission: ' + '${missionKey}');
})();
`;

                    actFolder.file(`${missionKey}.js`, missionContent);
                }
            }

            // Create campaign info file
            const campaignInfo = {
                name: campaignName,
                totalMissions: Object.keys(CAMPAIGN_MISSIONS).length,
                acts: Object.keys(missionsByAct).length,
                totalResearchPoints: parseInt(document.getElementById('campaign-research').value),
                totalCreditsGoal: parseInt(document.getElementById('campaign-credits').value),
                exportDate: new Date().toISOString()
            };

            campaignFolder.file('campaign-info.json', JSON.stringify(campaignInfo, null, 2));

            // Create README
            const readme = `# Campaign: ${campaignName.toUpperCase()}

## Installation
1. Extract this ZIP to your game's root directory
2. The folder structure will be: campaigns/${campaignName}/
3. Restart the game to load the new campaign

## Contents
- ${Object.keys(missionsByAct).length} Acts
- ${Object.keys(CAMPAIGN_MISSIONS).length} Total Missions
- Total Research Points: ${campaignInfo.totalResearchPoints}
- Credits Goal: ${campaignInfo.totalCreditsGoal}

## Mission List
${Object.entries(CAMPAIGN_MISSIONS).map(([key, m]) => `- ${key}: ${m.title || 'Untitled'}`).join('\\n')}

Generated: ${new Date().toLocaleString()}
`;

            campaignFolder.file('README.md', readme);

            // Generate ZIP file
            const blob = await zip.generateAsync({ type: 'blob' });

            // Download ZIP
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaign_${campaignName}_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);

            this.eventLogger.log(`Campaign exported as ZIP: ${campaignName}`, 'success', true);
            alert(`Campaign exported successfully!\\n\\nExtract to game folder to install.`);

        } catch (error) {
            this.eventLogger.log(`Failed to export campaign: ${error.message}`, 'error', true);
            alert('Failed to create ZIP. Falling back to JSON export.');
            this.exportCampaignJSON();
        }
    }

    // Fallback JSON export
    exportCampaignJSON() {
        const campaignData = {
            name: document.getElementById('campaign-name').value,
            totalResearchPoints: parseInt(document.getElementById('campaign-research').value),
            totalCreditsGoal: parseInt(document.getElementById('campaign-credits').value),
            missions: CAMPAIGN_MISSIONS,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(campaignData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign_${campaignData.name}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.eventLogger.log(`Campaign exported as JSON: ${campaignData.name}`, 'success', true);
    }
}

// Campaign Management System
class CampaignManager {
    constructor(editor) {
        this.editor = editor;
        this.currentCampaign = null;
        this.currentCampaignId = null;
        this.db = null;
        this.isInitialized = false;

        // Start initialization
        this.initialize();
    }

    async initialize() {
        try {
            await this.initIndexedDB();
            await this.loadCampaignContent();
            this.setupEventListeners();
            this.isInitialized = true;
            this.editor.eventLogger.log('CampaignManager fully initialized', 'success');
        } catch (error) {
            // Log full error details
            console.error('CampaignManager initialization error:', error);
            const errorMsg = error ? (error.message || error.toString()) : 'Unknown error';
            this.editor.eventLogger.log(`Failed to initialize CampaignManager: ${errorMsg}`, 'error', true);

            // Create a default campaign even if IndexedDB fails
            this.createDefaultCampaign();
            this.setupEventListeners();
            this.isInitialized = true;
        }
    }

    createDefaultCampaign() {
        this.currentCampaign = {
            id: 'main',
            name: 'Corporate Domination',
            description: 'Take control of the city\'s corporate infrastructure',
            startingResources: {
                credits: 10000,
                researchPoints: 150,
                worldControl: 15
            },
            missions: [], // Initialize missions array
            agents: [],
            weapons: [],
            equipment: [],
            npcs: {},  // Initialize NPCs
            enemyTypes: [],
            researchTree: {},
            intelReports: [],
            abilities: [],
            milestones: [],
            gameConfig: {},
            agentGeneration: {},
            deathSystem: {},
            skillDefinitions: {},
            uiText: {},
            gameplayConstants: {},
            music: {}
        };
        this.currentCampaignId = this.currentCampaign.id;
    }

    // Initialize IndexedDB for campaign storage
    // Note: Missions are stored embedded within campaign objects, not as separate records
    // This simplifies export/import and ensures campaigns are self-contained units
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('CampaignDatabase', 2);

            request.onerror = () => {
                this.editor.eventLogger.log('Failed to open IndexedDB', 'error', true);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.editor.eventLogger.log('IndexedDB initialized', 'success');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                try {
                    const db = event.target.result;

                    // Create campaigns store if it doesn't exist
                    if (!db.objectStoreNames.contains('campaigns')) {
                        const campaignsStore = db.createObjectStore('campaigns', { keyPath: 'id' });
                        campaignsStore.createIndex('name', 'name', { unique: false });
                        campaignsStore.createIndex('lastModified', 'lastModified', { unique: false });
                    }

                    // Note: missions are stored as part of the campaign object, not separately

                    this.editor.eventLogger.log('IndexedDB schema created/updated', 'success');
                } catch (upgradeError) {
                    console.error('IndexedDB upgrade error:', upgradeError);
                    this.editor.eventLogger.log(`IndexedDB upgrade failed: ${upgradeError.message}`, 'error', true);
                }
            };
        });
    }

    // Sanitize campaign data for IndexedDB storage (remove functions)
    sanitizeCampaignForStorage(campaign) {
        // Deep clone the campaign to avoid modifying the original
        const cleanCampaign = JSON.parse(JSON.stringify(campaign, (key, value) => {
            // Skip functions - they can't be stored in IndexedDB
            if (typeof value === 'function') {
                // Store function as a string identifier for later reconstruction
                if (key === 'action') {
                    // For NPC dialog actions, store as string command
                    return 'function:showShop'; // Will be handled by game code
                }
                return undefined; // Skip other functions
            }
            return value;
        }));

        // Additional cleanup for NPCs if they have dialog with functions
        if (cleanCampaign.npcs) {
            Object.values(cleanCampaign.npcs).forEach(npc => {
                if (npc.dialog && Array.isArray(npc.dialog)) {
                    npc.dialog.forEach(dialogNode => {
                        if (dialogNode.options) {
                            dialogNode.options.forEach(option => {
                                // Convert function actions to string identifiers
                                if (typeof option.action === 'function') {
                                    option.action = 'function:custom';
                                }
                            });
                        }
                    });
                }
            });
        }

        return cleanCampaign;
    }

    // Save campaign to IndexedDB
    async saveCampaignToDB(campaign) {
        // Check if database is initialized
        if (!this.db) {
            this.editor.eventLogger.log('IndexedDB not initialized, cannot save campaign', 'warning');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['campaigns'], 'readwrite');
            const store = transaction.objectStore('campaigns');

            // Create a clean copy without functions for IndexedDB storage
            const cleanCampaign = this.sanitizeCampaignForStorage(campaign);
            cleanCampaign.lastModified = new Date().toISOString();
            const request = store.put(cleanCampaign);

            request.onsuccess = () => {
                this.editor.eventLogger.log(`Campaign "${campaign.name}" saved to IndexedDB`, 'success');
                resolve();
            };

            request.onerror = () => {
                this.editor.eventLogger.log(`Failed to save campaign: ${request.error}`, 'error', true);
                reject(request.error);
            };
        });
    }

    // Load all campaigns from IndexedDB
    async loadAllCampaigns() {
        // Check if database is initialized
        if (!this.db) {
            this.editor.eventLogger.log('IndexedDB not initialized, cannot load campaigns', 'warning');
            return Promise.resolve([]);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['campaigns'], 'readonly');
            const store = transaction.objectStore('campaigns');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Load specific campaign from IndexedDB
    async loadCampaignFromDB(campaignId) {
        // Check if database is initialized
        if (!this.db) {
            this.editor.eventLogger.log('IndexedDB not initialized, cannot load campaign', 'warning');
            return Promise.resolve(null);
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['campaigns'], 'readonly');
            const store = transaction.objectStore('campaigns');
            const request = store.get(campaignId);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // Delete campaign from IndexedDB
    async deleteCampaignFromDB(campaignId) {
        // Check if database is initialized
        if (!this.db) {
            this.editor.eventLogger.log('IndexedDB not initialized, cannot delete campaign', 'warning');
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['campaigns'], 'readwrite');
            const campaignStore = transaction.objectStore('campaigns');

            // Delete campaign (missions are embedded within the campaign object)
            const deleteRequest = campaignStore.delete(campaignId);

            deleteRequest.onsuccess = () => {
                this.editor.eventLogger.log(`Campaign "${campaignId}" deleted from IndexedDB`, 'success', true);
            };

            transaction.oncomplete = () => {
                resolve();
            };

            transaction.onerror = () => {
                reject(transaction.error);
            };
        });
    }

    async loadCampaignContent() {
        try {
            // Try to load last used campaign from localStorage
            const lastCampaignId = localStorage.getItem('lastCampaignId');

            if (lastCampaignId && this.db) {
                const campaign = await this.loadCampaignFromDB(lastCampaignId);
                if (campaign) {
                this.currentCampaign = campaign;
                this.currentCampaignId = lastCampaignId;

                // Sync missions to global CAMPAIGN_MISSIONS
                this.syncMissionsToGlobal();

                // Ensure NPCs are loaded from templates
                if (!this.currentCampaign.npcs) {
                    this.currentCampaign.npcs = {};
                }
                const dbCampaignId = this.currentCampaign.id || 'main';
                if (window.CAMPAIGN_NPC_TEMPLATES && window.CAMPAIGN_NPC_TEMPLATES[dbCampaignId]) {
                    const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES[dbCampaignId];
                    Object.keys(npcTemplates).forEach(npcId => {
                        if (!this.currentCampaign.npcs[npcId]) {
                            this.currentCampaign.npcs[npcId] = { ...npcTemplates[npcId] };
                        }
                    });
                    this.editor.eventLogger.log(`Loaded ${Object.keys(npcTemplates).length} NPC templates for campaign`, 'success');
                }

                this.editor.eventLogger.log(`Loaded campaign "${campaign.name}" from IndexedDB`, 'success');
                return;
                }
            }

            // Fall back to window.MAIN_CAMPAIGN_CONTENT
            if (window.MAIN_CAMPAIGN_CONTENT) {
                this.currentCampaign = window.MAIN_CAMPAIGN_CONTENT;
                this.currentCampaignId = this.currentCampaign.id;

                // If the campaign doesn't have missions but CAMPAIGN_MISSIONS exists, add them
                if (!this.currentCampaign.missions && window.CAMPAIGN_MISSIONS) {
                    this.currentCampaign.missions = Object.values(window.CAMPAIGN_MISSIONS);
                    this.editor.eventLogger.log(`Added ${this.currentCampaign.missions.length} missions from CAMPAIGN_MISSIONS to campaign`, 'success');
                }

                // Sync missions to global CAMPAIGN_MISSIONS (in case we loaded from IndexedDB)
                this.syncMissionsToGlobal();

                // Load NPCs from templates if not already in campaign
                if (!this.currentCampaign.npcs) {
                    this.currentCampaign.npcs = {};
                }
                const campaignId = this.currentCampaign.id || 'main';
                if (window.CAMPAIGN_NPC_TEMPLATES && window.CAMPAIGN_NPC_TEMPLATES[campaignId]) {
                    const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES[campaignId];
                    Object.keys(npcTemplates).forEach(npcId => {
                        if (!this.currentCampaign.npcs[npcId]) {
                            this.currentCampaign.npcs[npcId] = { ...npcTemplates[npcId] };
                        }
                    });
                    this.editor.eventLogger.log(`Loaded ${Object.keys(npcTemplates).length} NPC templates`, 'success');
                }

                this.editor.eventLogger.log('Loaded existing campaign content from window', 'success');
                // Save it to IndexedDB for future use (now with missions)
                if (this.db) {
                    await this.saveCampaignToDB(this.currentCampaign);
                }
            } else {
                // Create default campaign structure
                this.createDefaultCampaign();
                this.editor.eventLogger.log('Created new campaign structure', 'info');

                // Add missions from CAMPAIGN_MISSIONS if available
                if (window.CAMPAIGN_MISSIONS) {
                    this.currentCampaign.missions = Object.values(window.CAMPAIGN_MISSIONS);
                    this.editor.eventLogger.log(`Added ${this.currentCampaign.missions.length} missions to default campaign`, 'success');
                }

                // Load NPCs from templates
                const defaultCampaignId = this.currentCampaign.id || 'main';
                if (window.CAMPAIGN_NPC_TEMPLATES && window.CAMPAIGN_NPC_TEMPLATES[defaultCampaignId]) {
                    const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES[defaultCampaignId];
                    Object.keys(npcTemplates).forEach(npcId => {
                        if (!this.currentCampaign.npcs[npcId]) {
                            this.currentCampaign.npcs[npcId] = { ...npcTemplates[npcId] };
                        }
                    });
                    this.editor.eventLogger.log(`Loaded ${Object.keys(npcTemplates).length} NPC templates to default campaign`, 'success');
                }

                // Save the default campaign to IndexedDB
                if (this.db) {
                    await this.saveCampaignToDB(this.currentCampaign);
                    this.editor.eventLogger.log('Default campaign saved to storage', 'success');
                }
            }
        } catch (error) {
            console.error('Error in loadCampaignContent:', error);
            const errorMsg = error ? (error.message || error.toString()) : 'Unknown error';

            // Provide specific error messages for common issues
            if (error.message && error.message.includes('could not be cloned')) {
                this.editor.eventLogger.log('Campaign contains functions that cannot be saved to storage. Creating clean version...', 'warning', true);
            } else {
                this.editor.eventLogger.log(`Error loading campaign content: ${errorMsg}`, 'error', true);
            }

            // Fallback: Create a default campaign if none exists
            // This ensures the editor always has a working campaign to edit
            if (!this.currentCampaign) {
                this.editor.eventLogger.log('Creating default campaign as fallback...', 'info');
                this.createDefaultCampaign();
                // Don't try to save the default campaign if IndexedDB is having issues
            }
        }
    }

    setupEventListeners() {
        // Close button
        const closeBtn = document.getElementById('campaign-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const dialog = document.getElementById('campaign-dialog');
                if (dialog) {
                    dialog.style.display = 'none';
                }
            });
        }

        // Tab switching
        document.querySelectorAll('.campaign-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Campaign selector
        document.getElementById('campaign-switch')?.addEventListener('click', () => this.switchCampaign());
        document.getElementById('campaign-delete')?.addEventListener('click', () => this.deleteCurrentCampaign());

        // Campaign actions
        document.getElementById('campaign-new')?.addEventListener('click', () => this.createNewCampaign());
        document.getElementById('campaign-duplicate')?.addEventListener('click', () => this.duplicateCampaign());
        document.getElementById('campaign-import-zip')?.addEventListener('click', () => this.importFromZip());
        document.getElementById('campaign-import-dir')?.addEventListener('click', () => this.importFromDirectory());
        document.getElementById('campaign-export-zip')?.addEventListener('click', () => this.exportToZip());
        document.getElementById('campaign-save')?.addEventListener('click', () => this.saveChanges());
        document.getElementById('campaign-save-overview')?.addEventListener('click', () => this.saveChanges());

        // Content editing buttons
        document.getElementById('add-agent')?.addEventListener('click', () => this.addAgent());
        document.getElementById('add-weapon')?.addEventListener('click', () => this.addWeapon());
        document.getElementById('add-equipment')?.addEventListener('click', () => this.addEquipment());
        document.getElementById('add-enemy')?.addEventListener('click', () => this.addEnemyType());
        document.getElementById('add-research')?.addEventListener('click', () => this.addResearchItem());
        document.getElementById('add-intel')?.addEventListener('click', () => this.addIntelReport());

        // Mission editing buttons
        document.getElementById('add-mission')?.addEventListener('click', async () => await this.addMission());
        document.getElementById('add-act')?.addEventListener('click', async () => await this.addAct());
        document.getElementById('reorder-missions')?.addEventListener('click', () => this.reorderMissions());
        document.getElementById('import-mission-file')?.addEventListener('click', () => this.importMissionFile());

        // RPG Configuration buttons
        document.getElementById('add-class')?.addEventListener('click', () => this.addRPGClass());
        document.getElementById('add-skill')?.addEventListener('click', () => this.addRPGSkill());
        document.getElementById('add-stat')?.addEventListener('click', () => this.addRPGStat());
        document.getElementById('add-armor')?.addEventListener('click', () => this.addRPGArmor());
        document.getElementById('add-consumable')?.addEventListener('click', () => this.addRPGConsumable());

        // Formula configuration inputs
        document.getElementById('formula-damage')?.addEventListener('change', (e) => this.updateFormula('damage', e.target.value));
        document.getElementById('formula-crit')?.addEventListener('change', (e) => this.updateFormula('critMultiplier', parseFloat(e.target.value)));
        document.getElementById('formula-armor')?.addEventListener('change', (e) => this.updateFormula('armorReduction', e.target.value));
        document.getElementById('formula-xp')?.addEventListener('change', (e) => this.updateFormula('xpPerLevel', e.target.value));
        document.getElementById('formula-skillpoints')?.addEventListener('change', (e) => this.updateFormula('skillPointsPerLevel', parseInt(e.target.value)));
        document.getElementById('formula-maxlevel')?.addEventListener('change', (e) => this.updateFormula('maxLevel', parseInt(e.target.value)));

        // Turn-based configuration inputs
        document.getElementById('tb-agent-ap')?.addEventListener('change', (e) => this.updateTurnBased('defaultAgentAP', parseInt(e.target.value)));
        document.getElementById('tb-enemy-ap')?.addEventListener('change', (e) => this.updateTurnBased('defaultEnemyAP', parseInt(e.target.value)));
        document.getElementById('tb-move-cost')?.addEventListener('change', (e) => this.updateTurnBased('moveCost', parseInt(e.target.value)));
        document.getElementById('tb-shoot-cost')?.addEventListener('change', (e) => this.updateTurnBased('shootCost', parseInt(e.target.value)));
        document.getElementById('tb-ability-cost')?.addEventListener('change', (e) => this.updateTurnBased('abilityCost', parseInt(e.target.value)));
        document.getElementById('tb-hack-cost')?.addEventListener('change', (e) => this.updateTurnBased('hackCost', parseInt(e.target.value)));

        // Theme configuration inputs
        document.getElementById('theme-primary')?.addEventListener('change', (e) => this.updateTheme('colors', 'primary', e.target.value));
        document.getElementById('theme-secondary')?.addEventListener('change', (e) => this.updateTheme('colors', 'secondary', e.target.value));
        document.getElementById('theme-danger')?.addEventListener('change', (e) => this.updateTheme('colors', 'danger', e.target.value));
        document.getElementById('theme-background')?.addEventListener('change', (e) => this.updateTheme('colors', 'background', e.target.value));

        // UI strings
        document.getElementById('ui-currency')?.addEventListener('change', (e) => this.updateTheme('strings', 'currency', e.target.value));
        document.getElementById('ui-research')?.addEventListener('change', (e) => this.updateTheme('strings', 'research', e.target.value));
        document.getElementById('ui-agent')?.addEventListener('change', (e) => this.updateTheme('strings', 'agent', e.target.value));
        document.getElementById('ui-enemy')?.addEventListener('change', (e) => this.updateTheme('strings', 'enemy', e.target.value));

        // Gameplay constants
        document.getElementById('const-movespeed')?.addEventListener('change', (e) => this.updateTheme('constants', 'movementSpeed', parseFloat(e.target.value)));
        document.getElementById('const-vision')?.addEventListener('change', (e) => this.updateTheme('constants', 'visionRange', parseInt(e.target.value)));
        document.getElementById('const-hackrange')?.addEventListener('change', (e) => this.updateTheme('constants', 'hackRange', parseInt(e.target.value)));
        document.getElementById('const-squadsize')?.addEventListener('change', (e) => this.updateTheme('constants', 'maxSquadSize', parseInt(e.target.value)));
        document.getElementById('const-health')?.addEventListener('change', (e) => this.updateTheme('constants', 'baseHealth', parseInt(e.target.value)));
        document.getElementById('const-respawn')?.addEventListener('change', (e) => this.updateTheme('constants', 'respawnTimer', parseInt(e.target.value)));

        // Inventory configuration
        document.getElementById('inv-carry-weight')?.addEventListener('change', (e) => this.updateInventoryConfig('carryWeight', parseInt(e.target.value)));
        document.getElementById('inv-weight-penalty')?.addEventListener('change', (e) => this.updateInventoryConfig('weightPenalty', parseInt(e.target.value)));
        document.getElementById('inv-max-slots')?.addEventListener('change', (e) => this.updateInventoryConfig('maxSlots', parseInt(e.target.value)));
        document.getElementById('inv-stack-size')?.addEventListener('change', (e) => this.updateInventoryConfig('stackSize', parseInt(e.target.value)));
        document.getElementById('inv-start-credits')?.addEventListener('change', (e) => this.updateInventoryConfig('startingInventory.credits', parseInt(e.target.value)));
        document.getElementById('inv-start-ammo-primary')?.addEventListener('change', (e) => this.updateInventoryConfig('startingInventory.ammoPrimary', parseInt(e.target.value)));
        document.getElementById('inv-start-ammo-secondary')?.addEventListener('change', (e) => this.updateInventoryConfig('startingInventory.ammoSecondary', parseInt(e.target.value)));
        document.getElementById('inv-start-medkits')?.addEventListener('change', (e) => this.updateInventoryConfig('startingInventory.medkits', parseInt(e.target.value)));
        document.getElementById('save-inventory-config')?.addEventListener('click', () => this.saveInventoryConfig());

        // File input handlers
        document.getElementById('import-zip-input')?.addEventListener('change', (e) => this.handleZipImport(e));
        document.getElementById('import-dir-input')?.addEventListener('change', (e) => this.handleDirectoryImport(e));
    }

    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.campaign-tab-content').forEach(content => {
            content.style.display = 'none';
        });

        // Show selected tab
        document.getElementById(`tab-${tabName}`).style.display = 'block';

        // Update tab buttons
        document.querySelectorAll('.campaign-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Load content for the selected tab
        this.loadTabContent(tabName);

        // Load campaign selector if on overview tab
        if (tabName === 'overview') {
            this.loadCampaignSelector();
        }
    }

    loadTabContent(tabName) {
        switch(tabName) {
            case 'overview':
                this.loadOverview();
                break;
            case 'missions':
                this.loadMissions();
                break;
            case 'agents':
                this.loadAgents();
                break;
            case 'weapons':
                this.loadWeaponsEquipment();
                break;
            case 'enemies':
                this.loadEnemyTypes();
                break;
            case 'research':
                this.loadResearchTree();
                break;
            case 'intel':
                this.loadIntelReports();
                break;
            case 'music':
                this.loadMusicConfig();
                break;
            case 'rpg':
                this.loadRPGTab();
                break;
            case 'formulas':
                this.loadFormulasTab();
                break;
            case 'theme':
                this.loadThemeTab();
                break;
            case 'inventory':
                this.loadInventoryTab();
                break;
            case 'npcs':
                this.loadNPCs();
                break;
        }
    }

    loadInventoryTab() {
        if (!this.currentCampaign.inventoryConfig) {
            this.currentCampaign.inventoryConfig = {
                carryWeight: 100,
                weightPenalty: 50,
                maxSlots: 30,
                stackSize: 99,
                startingInventory: {
                    credits: 1000,
                    ammoPrimary: 120,
                    ammoSecondary: 60,
                    medkits: 3
                }
            };
        }

        if (!this.currentCampaign.agentLoadouts) {
            this.currentCampaign.agentLoadouts = {};
        }

        // Load inventory settings
        const config = this.currentCampaign.inventoryConfig;
        if (document.getElementById('inv-carry-weight')) {
            document.getElementById('inv-carry-weight').value = config.carryWeight || 100;
            document.getElementById('inv-weight-penalty').value = config.weightPenalty || 50;
            document.getElementById('inv-max-slots').value = config.maxSlots || 30;
            document.getElementById('inv-stack-size').value = config.stackSize || 99;
            document.getElementById('inv-start-credits').value = config.startingInventory?.credits || 1000;
            document.getElementById('inv-start-ammo-primary').value = config.startingInventory?.ammoPrimary || 120;
            document.getElementById('inv-start-ammo-secondary').value = config.startingInventory?.ammoSecondary || 60;
            document.getElementById('inv-start-medkits').value = config.startingInventory?.medkits || 3;
        }

        // Load agent loadouts
        this.loadAgentLoadouts();
    }

    loadNPCs() {
        const npcsList = document.getElementById('npc-templates-list');
        if (!npcsList) {
            this.eventLogger.log('NPCs list element not found', 'error');
            return;
        }

        // Get campaign NPCs if they exist
        const campaignId = this.currentCampaign?.id || 'main';
        const npcTemplates = window.CAMPAIGN_NPC_TEMPLATES?.[campaignId] || {};

        // Initialize NPCs in campaign if not exists
        if (!this.currentCampaign.npcs) {
            this.currentCampaign.npcs = {};
        }

        // Merge templates with campaign NPCs
        Object.keys(npcTemplates).forEach(npcId => {
            if (!this.currentCampaign.npcs[npcId]) {
                this.currentCampaign.npcs[npcId] = { ...npcTemplates[npcId] };
            }
        });

        // Display NPC list
        npcsList.innerHTML = '';

        const npcIds = Object.keys(this.currentCampaign.npcs);
        if (npcIds.length === 0) {
            npcsList.innerHTML = '<p style="color: #888;">No NPCs defined. Click "Add New NPC Template" to create one.</p>';
        } else {
            npcIds.forEach((npcId, index) => {
                const npc = this.currentCampaign.npcs[npcId];
                const npcDiv = document.createElement('div');
                npcDiv.style.cssText = 'border: 1px solid #00ff41; padding: 10px; margin-bottom: 10px; background: rgba(0,255,65,0.05); position: relative;';

                // Escape the npcId for use in HTML attributes
                const escapedId = npcId.replace(/'/g, "\\'").replace(/"/g, "&quot;");

                npcDiv.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="color: #00ff41; margin: 0;">${npc.sprite || '👤'} ${npc.name || npcId}</h4>
                            <p style="color: #888; margin: 5px 0; font-size: 12px;">ID: ${npcId}</p>
                            <p style="color: #00ffff; margin: 5px 0;">Quests: ${npc.quests?.length || 0}</p>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button onclick="window.campaignManager.editNPCTemplate('${escapedId}')"
                                    style="background: #00ff41; color: #000; border: none; padding: 5px 10px; cursor: pointer;">
                                Edit
                            </button>
                            <button onclick="window.campaignManager.deleteNPCTemplate('${escapedId}')"
                                    style="background: #ff0000; color: #fff; border: none; padding: 5px 10px; cursor: pointer;">
                                Delete
                            </button>
                        </div>
                    </div>
                `;

                npcsList.appendChild(npcDiv);
            });
        }
    }

    loadAgentLoadouts() {
        const loadoutsList = document.getElementById('loadouts-list');
        if (!loadoutsList) return;

        loadoutsList.innerHTML = '';

        if (!this.currentCampaign.agents) {
            loadoutsList.innerHTML = '<p style="color: #888;">No agents defined. Add agents in the Agents tab first.</p>';
            return;
        }

        this.currentCampaign.agents.forEach((agent, index) => {
            const loadout = this.currentCampaign.agentLoadouts[agent.id] || {
                weapon: null,
                armor: null,
                utility: null,
                items: []
            };

            const loadoutDiv = document.createElement('div');
            loadoutDiv.style.cssText = 'border: 1px solid #00ff41; padding: 15px; margin-bottom: 10px; background: rgba(0,255,65,0.05);';
            loadoutDiv.innerHTML = `
                <h5 style="color: #00ff41; margin-top: 0;">${agent.name}</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="color: #00ffff; font-size: 12px;">Primary Weapon</label>
                        <select onchange="campaignManager.updateLoadout('${agent.id}', 'weapon', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="">None</option>
                            ${this.getWeaponOptions(loadout.weapon)}
                        </select>
                    </div>
                    <div>
                        <label style="color: #00ffff; font-size: 12px;">Armor</label>
                        <select onchange="campaignManager.updateLoadout('${agent.id}', 'armor', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="">None</option>
                            ${this.getArmorOptions(loadout.armor)}
                        </select>
                    </div>
                    <div>
                        <label style="color: #00ffff; font-size: 12px;">Utility</label>
                        <select onchange="campaignManager.updateLoadout('${agent.id}', 'utility', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="">None</option>
                            ${this.getUtilityOptions(loadout.utility)}
                        </select>
                    </div>
                </div>
            `;
            loadoutsList.appendChild(loadoutDiv);
        });
    }

    getWeaponOptions(selected) {
        if (!this.currentCampaign.weapons) return '';
        return this.currentCampaign.weapons.map(w =>
            `<option value="${w.id}" ${selected == w.id ? 'selected' : ''}>${w.name}</option>`
        ).join('');
    }

    getArmorOptions(selected) {
        if (!this.currentCampaign.equipment) return '';
        return this.currentCampaign.equipment
            .filter(e => e.protection > 0)
            .map(e => `<option value="${e.id}" ${selected == e.id ? 'selected' : ''}>${e.name}</option>`)
            .join('');
    }

    getUtilityOptions(selected) {
        if (!this.currentCampaign.equipment) return '';
        return this.currentCampaign.equipment
            .filter(e => !e.protection || e.protection === 0)
            .map(e => `<option value="${e.id}" ${selected == e.id ? 'selected' : ''}>${e.name}</option>`)
            .join('');
    }

    updateLoadout(agentId, slot, value) {
        if (!this.currentCampaign.agentLoadouts) {
            this.currentCampaign.agentLoadouts = {};
        }
        if (!this.currentCampaign.agentLoadouts[agentId]) {
            this.currentCampaign.agentLoadouts[agentId] = {
                weapon: null,
                armor: null,
                utility: null,
                items: []
            };
        }
        this.currentCampaign.agentLoadouts[agentId][slot] = value || null;
        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log(`Updated loadout for agent ${agentId}`, 'info');
    }

    async addNPCTemplate() {
        const npcId = prompt('Enter unique NPC ID (e.g., "merchant", "guard", "informant"):');
        if (!npcId || npcId.trim() === '') return;

        if (!this.currentCampaign.npcs) {
            this.currentCampaign.npcs = {};
        }

        if (this.currentCampaign.npcs[npcId]) {
            alert('NPC with this ID already exists!');
            return;
        }

        // Create new NPC template
        this.currentCampaign.npcs[npcId] = {
            name: 'New NPC',
            sprite: '👤',
            dialog: [
                { text: 'Hello, traveler.', options: [] }
            ],
            quests: []
        };

        await this.saveCampaignToDB(this.currentCampaign);
        this.loadNPCs();
        this.editNPCTemplate(npcId);
    }

    editNPCTemplate(npcId) {
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc) {
            this.editor.eventLogger.log(`NPC ${npcId} not found`, 'error');
            return;
        }

        // Escape the npcId for use in HTML attributes
        const escapedId = npcId.replace(/'/g, "\\'").replace(/"/g, "&quot;");

        // Create edit dialog
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center; z-index: 10000;';

        const content = document.createElement('div');
        content.className = 'dialog-content';
        content.style.cssText = 'background: #0a0e27; border: 2px solid #00ff41; padding: 20px; min-width: 600px; max-width: 800px; max-height: 80vh; overflow-y: auto;';

        content.innerHTML = `
            <h2 style="color: #00ff41;">Edit NPC Template: ${npcId}</h2>

            <label style="color: #00ffff;">Name:
                <input type="text" id="npc-name" value="${(npc.name || '').replace(/"/g, '&quot;')}"
                       style="width: 100%; background: #111; border: 1px solid #00ff41; color: #fff; padding: 5px;">
            </label>

            <label style="color: #00ffff; margin-top: 10px; display: block;">Sprite (Emoji):
                <input type="text" id="npc-sprite" value="${npc.sprite || '👤'}" maxlength="2"
                       style="width: 100px; background: #111; border: 1px solid #00ff41; color: #fff; padding: 5px; font-size: 20px;">
            </label>

            <h3 style="color: #00ff41; margin-top: 20px;">General Dialog</h3>
            <p style="color: #888; font-size: 12px; margin: 5px 0;">
                Optional generic dialog nodes. Most dialog comes from quest intro/completion text below.
            </p>
            <div id="npc-dialog-editor" style="border: 1px solid #333; padding: 10px; background: #111;">
                ${this.generateDialogEditor(npc.dialog || [])}
            </div>

            <h3 style="color: #00ff41; margin-top: 20px;">Quests</h3>
            <div id="npc-quests-editor" style="border: 1px solid #333; padding: 10px; background: #111;">
                ${this.generateQuestsEditor(npc.quests || [], npcId)}
            </div>

            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="window.campaignManager.saveNPCTemplate('${escapedId}')"
                        style="background: #00ff41; color: #000; border: none; padding: 10px 20px; cursor: pointer;">
                    Save NPC
                </button>
                <button onclick="this.parentElement.parentElement.parentElement.remove()"
                        style="background: #ff0000; color: #fff; border: none; padding: 10px 20px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        dialog.appendChild(content);
        document.body.appendChild(dialog);
    }

    generateDialogEditor(dialogs) {
        if (!dialogs || dialogs.length === 0) {
            dialogs = [{ text: 'Hello!', options: [] }];
        }

        let html = '<div id="dialog-nodes">';
        dialogs.forEach((node, index) => {
            html += `
                <div style="border: 1px solid #00ff41; padding: 10px; margin-bottom: 10px;">
                    <label style="color: #00ffff;">Dialog ${index + 1}:
                        <textarea data-dialog-index="${index}"
                                  style="width: 100%; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px; height: 60px;"
                                  placeholder="General dialog text (not quest-related)...">
${node.text || ''}
                        </textarea>
                    </label>
                    <button onclick="window.campaignManager.removeDialogNode(${index})"
                            style="background: #ff0000; color: #fff; border: none; padding: 5px 10px; cursor: pointer; margin-top: 5px;">
                        Remove
                    </button>
                </div>
            `;
        });
        html += '</div>';
        html += `<button onclick="window.campaignManager.addDialogNode()"
                         style="background: #00ff41; color: #000; border: none; padding: 5px 15px; cursor: pointer;">
                    Add Dialog Node
                 </button>`;
        return html;
    }

    generateObjectivesEditor(objectives, questIndex) {
        if (!objectives || objectives.length === 0) {
            objectives = [];
        }

        let html = '<div style="border: 1px solid #444; padding: 10px; background: #1a1a1a;">';

        objectives.forEach((obj, objIndex) => {
            const escapeHtml = (str) => (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            html += `
                <div data-objective-index="${objIndex}" style="border: 1px solid #666; padding: 8px; margin-bottom: 8px; background: #222;">
                    <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                        <select data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.type"
                                onchange="window.campaignManager.updateObjectiveType(${questIndex}, ${objIndex}, this.value)"
                                style="background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                            <option value="hack" ${obj.type === 'hack' ? 'selected' : ''}>Hack</option>
                            <option value="eliminate" ${obj.type === 'eliminate' ? 'selected' : ''}>Eliminate</option>
                            <option value="collect" ${obj.type === 'collect' ? 'selected' : ''}>Collect</option>
                            <option value="reach" ${obj.type === 'reach' ? 'selected' : ''}>Reach Location</option>
                            <option value="interact" ${obj.type === 'interact' ? 'selected' : ''}>Interact</option>
                        </select>

                        ${obj.type === 'collect' ? `
                            <input type="text" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.item"
                                   value="${escapeHtml(obj.item)}" placeholder="Item ID"
                                   style="width: 120px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                        ` : ''}

                        ${obj.type === 'reach' ? `
                            X: <input type="number" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.x"
                                      value="${obj.x || 0}" placeholder="X"
                                      style="width: 50px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                            Y: <input type="number" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.y"
                                      value="${obj.y || 0}" placeholder="Y"
                                      style="width: 50px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                        ` : ''}

                        ${obj.type === 'interact' ? `
                            <input type="text" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.target"
                                   value="${escapeHtml(obj.target)}" placeholder="Target (explosive, switch, etc)"
                                   style="width: 150px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                        ` : ''}

                        ${(obj.type === 'hack' || obj.type === 'eliminate' || obj.type === 'collect' || obj.type === 'interact') ? `
                            Count: <input type="number" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.count"
                                          value="${obj.count || 1}" min="1"
                                          style="width: 50px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                        ` : ''}

                        <button onclick="window.campaignManager.removeObjective(${questIndex}, ${objIndex})"
                                style="background: #ff0000; color: #fff; border: none; padding: 3px 8px; cursor: pointer;">
                            ×
                        </button>
                    </div>
                    <input type="text" data-quest-index="${questIndex}" data-objective-index="${objIndex}" data-field="objectives.description"
                           value="${escapeHtml(obj.description)}" placeholder="Objective description..."
                           style="width: 100%; margin-top: 5px; background: #333; border: 1px solid #00ff41; color: #fff; padding: 3px;">
                </div>
            `;
        });

        html += `
            <button onclick="window.campaignManager.addObjective(${questIndex})"
                    style="background: #00ff41; color: #000; border: none; padding: 5px 10px; cursor: pointer; margin-top: 5px;">
                + Add Objective
            </button>
        `;

        html += '</div>';
        return html;
    }

    generateQuestsEditor(quests, npcId) {
        if (!quests || quests.length === 0) {
            quests = [];
        }

        let html = '<div id="quest-list">';
        quests.forEach((quest, index) => {
            // Escape values for HTML attributes
            const escapeHtml = (str) => (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            html += `
                <div style="border: 1px solid #00ffff; padding: 10px; margin-bottom: 10px;">
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <input type="text" data-quest-index="${index}" data-field="id"
                               value="${escapeHtml(quest.id)}" placeholder="Quest ID"
                               style="width: 150px; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                        <input type="text" data-quest-index="${index}" data-field="name"
                               value="${escapeHtml(quest.name)}" placeholder="Quest Name"
                               style="flex: 1; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                        <button onclick="window.campaignManager.removeQuestFromNPC('${npcId.replace(/'/g, "\\'")}', ${index})"
                                style="background: #ff0000; color: #fff; border: none; padding: 5px 10px; cursor: pointer;">
                            Remove
                        </button>
                    </div>
                    <div style="margin-top: 10px;">
                        <textarea data-quest-index="${index}" data-field="description"
                                  style="width: 100%; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px; height: 40px;"
                                  placeholder="Quest description...">${escapeHtml(quest.description)}</textarea>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="color: #88ff88; font-size: 12px;">Intro Dialog:</label>
                        <textarea data-quest-index="${index}" data-field="introDialog"
                                  style="width: 100%; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px; height: 40px; margin-top: 5px;"
                                  placeholder="Dialog when quest is given...">${escapeHtml(quest.introDialog)}</textarea>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="color: #88ff88; font-size: 12px;">Completion Dialog:</label>
                        <textarea data-quest-index="${index}" data-field="completionDialog"
                                  style="width: 100%; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px; height: 40px; margin-top: 5px;"
                                  placeholder="Dialog when quest is completed...">${escapeHtml(quest.completionDialog)}</textarea>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="color: #88ff88; font-size: 12px;">Objectives (Completion Conditions):</label>
                        <div id="quest-${index}-objectives" style="margin-top: 5px;">
                            ${this.generateObjectivesEditor(quest.objectives || [], index)}
                        </div>
                    </div>
                    <div style="margin-top: 10px;">
                        <label style="color: #88ff88; font-size: 12px;">Rewards:</label>
                        <div style="display: flex; gap: 10px; margin-top: 5px;">
                            <input type="number" data-quest-index="${index}" data-field="rewards.credits"
                                   value="${quest.rewards?.credits || 0}" placeholder="Credits"
                                   style="width: 100px; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                            <input type="number" data-quest-index="${index}" data-field="rewards.researchPoints"
                                   value="${quest.rewards?.researchPoints || 0}" placeholder="Research"
                                   style="width: 100px; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                            <input type="number" data-quest-index="${index}" data-field="rewards.experience"
                                   value="${quest.rewards?.experience || 0}" placeholder="XP"
                                   style="width: 100px; background: #222; border: 1px solid #00ff41; color: #fff; padding: 5px;">
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        html += `<button onclick="window.campaignManager.addQuestToNPC('${npcId.replace(/'/g, "\\'")}')"
                         style="background: #00ff41; color: #000; border: none; padding: 5px 15px; cursor: pointer;">
                    Add Quest
                 </button>`;
        return html;
    }

    async addDialogNode() {
        // Find the NPC template being edited
        const dialogEl = document.querySelector('.dialog');
        if (!dialogEl) return;

        const npcIdInput = dialogEl.querySelector('#edit-npc-id');
        if (!npcIdInput) return;

        const npcId = npcIdInput.textContent;
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc) return;

        if (!npc.dialog) {
            npc.dialog = [];
        }

        // Add new dialog node
        npc.dialog.push({
            text: 'Hello there!',
            options: []
        });

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    async removeDialogNode(index) {
        if (!confirm('Are you sure you want to remove this dialog node?')) return;

        // Find the NPC template being edited
        const dialogEl = document.querySelector('.dialog');
        if (!dialogEl) return;

        const npcIdInput = dialogEl.querySelector('#edit-npc-id');
        if (!npcIdInput) return;

        const npcId = npcIdInput.textContent;
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc || !npc.dialog) return;

        // Remove the dialog node
        npc.dialog.splice(index, 1);

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    // Legacy functions - no longer needed as we use quest editing in NPC templates
    addQuest() {
        console.warn('addQuest() is deprecated. Use addQuestToNPC(npcId) instead');
    }

    removeQuest(index) {
        console.warn('removeQuest() is deprecated. Use removeQuestFromNPC(npcId, questIndex) instead');
    }

    async saveNPCTemplate(npcId) {
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc) return;

        // Get basic info
        npc.name = document.getElementById('npc-name')?.value || 'Unnamed NPC';
        npc.sprite = document.getElementById('npc-sprite')?.value || '👤';

        // Get dialog nodes
        const dialogTextareas = document.querySelectorAll('[data-dialog-index]');
        npc.dialog = Array.from(dialogTextareas).map(textarea => ({
            text: textarea.value,
            options: []  // Simplified for now
        }));

        // Get quests
        const questInputs = document.querySelectorAll('[data-quest-index]');
        const questsMap = {};
        questInputs.forEach(input => {
            const index = input.dataset.questIndex;
            const field = input.dataset.field;
            if (!questsMap[index]) questsMap[index] = { rewards: {} };

            // Handle nested rewards fields
            if (field.startsWith('rewards.')) {
                const rewardField = field.split('.')[1];
                if (!questsMap[index].rewards) questsMap[index].rewards = {};
                questsMap[index].rewards[rewardField] = parseInt(input.value) || 0;
            } else {
                questsMap[index][field] = input.value;
            }
        });

        // Convert to array and filter out incomplete quests
        npc.quests = Object.values(questsMap).filter(q => q.id && q.name).map(q => {
            // Ensure rewards object exists even if empty
            if (!q.rewards) q.rewards = {};
            return q;
        });

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.loadNPCs();

        // Close dialog
        const dialog = document.querySelector('.dialog');
        if (dialog) dialog.remove();

        this.editor.eventLogger.log(`Saved NPC template: ${npcId}`, 'success');
    }

    async deleteNPCTemplate(npcId) {
        if (!confirm(`Are you sure you want to delete NPC "${npcId}"?`)) return;

        delete this.currentCampaign.npcs[npcId];
        await this.saveCampaignToDB(this.currentCampaign);
        this.loadNPCs();
        this.editor.eventLogger.log(`Deleted NPC template: ${npcId}`, 'info');
    }

    // Quest objective helper functions
    async updateObjectiveType(questIndex, objIndex, newType) {
        // Find the NPC template being edited
        const dialogEl = document.querySelector('.dialog');
        if (!dialogEl) return;

        const npcIdInput = dialogEl.querySelector('#edit-npc-id');
        if (!npcIdInput) return;

        const npcId = npcIdInput.textContent;
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc || !npc.quests || !npc.quests[questIndex]) return;

        const quest = npc.quests[questIndex];
        if (!quest.objectives || !quest.objectives[objIndex]) return;

        const objective = quest.objectives[objIndex];
        objective.type = newType;

        // Reset fields based on type
        switch(newType) {
            case 'hack':
            case 'eliminate':
                objective.count = objective.count || 1;
                delete objective.x;
                delete objective.y;
                delete objective.item;
                delete objective.targetId;
                break;
            case 'reach':
                objective.x = objective.x || 0;
                objective.y = objective.y || 0;
                delete objective.count;
                delete objective.item;
                delete objective.targetId;
                break;
            case 'collect':
                objective.item = objective.item || 'item_id';
                objective.count = objective.count || 1;
                delete objective.x;
                delete objective.y;
                delete objective.targetId;
                break;
            case 'interact':
                objective.targetId = objective.targetId || 'target_id';
                delete objective.count;
                delete objective.x;
                delete objective.y;
                delete objective.item;
                break;
        }

        // Save and refresh the dialog
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId); // Refresh the dialog
    }

    async addObjective(questIndex) {
        // Find the NPC template being edited
        const dialogEl = document.querySelector('.dialog');
        if (!dialogEl) return;

        const npcIdInput = dialogEl.querySelector('#edit-npc-id');
        if (!npcIdInput) return;

        const npcId = npcIdInput.textContent;
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc || !npc.quests || !npc.quests[questIndex]) return;

        const quest = npc.quests[questIndex];
        if (!quest.objectives) {
            quest.objectives = [];
        }

        // Add new objective with default values
        quest.objectives.push({
            id: `obj_${Date.now()}`,
            type: 'hack',
            description: 'New objective',
            count: 1
        });

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    async removeObjective(questIndex, objIndex) {
        if (!confirm('Are you sure you want to remove this objective?')) return;

        // Find the NPC template being edited
        const dialogEl = document.querySelector('.dialog');
        if (!dialogEl) return;

        const npcIdInput = dialogEl.querySelector('#edit-npc-id');
        if (!npcIdInput) return;

        const npcId = npcIdInput.textContent;
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc || !npc.quests || !npc.quests[questIndex]) return;

        const quest = npc.quests[questIndex];
        if (!quest.objectives || !quest.objectives[objIndex]) return;

        // Remove the objective
        quest.objectives.splice(objIndex, 1);

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    async addQuestToNPC(npcId) {
        const npc = this.currentCampaign.npcs[npcId];
        if (!npc) return;

        if (!npc.quests) {
            npc.quests = [];
        }

        // Add new quest with default values
        npc.quests.push({
            id: `quest_${Date.now()}`,
            name: 'New Quest',
            description: 'Quest description',
            introDialog: 'Quest introduction dialog',
            completionDialog: 'Quest completion dialog',
            objectives: [
                {
                    id: 'obj_1',
                    type: 'hack',
                    description: 'Complete the objective',
                    count: 1
                }
            ],
            rewards: {
                credits: 500,
                experience: 100
            }
        });

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    async removeQuestFromNPC(npcId, questIndex) {
        if (!confirm('Are you sure you want to remove this quest?')) return;

        const npc = this.currentCampaign.npcs[npcId];
        if (!npc || !npc.quests) return;

        npc.quests.splice(questIndex, 1);

        // Save and refresh
        await this.saveCampaignToDB(this.currentCampaign);
        this.editNPCTemplate(npcId);
    }

    loadFormulasTab() {
        if (!this.currentCampaign.formulas) {
            this.currentCampaign.formulas = this.editor.formulas; // Use defaults
        }

        // Load formula values into inputs
        if (document.getElementById('formula-damage')) {
            document.getElementById('formula-damage').value = this.currentCampaign.formulas.damage || 'baseDamage + weaponDamage + (strength / 2)';
            document.getElementById('formula-crit').value = this.currentCampaign.formulas.critMultiplier || 2.0;
            document.getElementById('formula-armor').value = this.currentCampaign.formulas.armorReduction || 'damage * (100 / (100 + armor))';
            document.getElementById('formula-xp').value = this.currentCampaign.formulas.xpPerLevel || 'level * 100 + (level * level * 50)';
            document.getElementById('formula-skillpoints').value = this.currentCampaign.formulas.skillPointsPerLevel || 3;
            document.getElementById('formula-maxlevel').value = this.currentCampaign.formulas.maxLevel || 20;
        }

        if (!this.currentCampaign.turnBasedConfig) {
            this.currentCampaign.turnBasedConfig = this.editor.turnBasedConfig; // Use defaults
        }

        // Load turn-based values
        if (document.getElementById('tb-agent-ap')) {
            document.getElementById('tb-agent-ap').value = this.currentCampaign.turnBasedConfig.defaultAgentAP || 12;
            document.getElementById('tb-enemy-ap').value = this.currentCampaign.turnBasedConfig.defaultEnemyAP || 8;
            document.getElementById('tb-move-cost').value = this.currentCampaign.turnBasedConfig.moveCost || 1;
            document.getElementById('tb-shoot-cost').value = this.currentCampaign.turnBasedConfig.shootCost || 4;
            document.getElementById('tb-ability-cost').value = this.currentCampaign.turnBasedConfig.abilityCost || 6;
            document.getElementById('tb-hack-cost').value = this.currentCampaign.turnBasedConfig.hackCost || 4;
        }
    }

    loadThemeTab() {
        if (!this.currentCampaign.themeConfig) {
            this.currentCampaign.themeConfig = this.editor.themeConfig; // Use defaults
        }

        // Load colors
        if (document.getElementById('theme-primary')) {
            document.getElementById('theme-primary').value = this.currentCampaign.themeConfig.colors?.primary || '#00ff41';
            document.getElementById('theme-secondary').value = this.currentCampaign.themeConfig.colors?.secondary || '#00ffff';
            document.getElementById('theme-danger').value = this.currentCampaign.themeConfig.colors?.danger || '#ff073a';
            document.getElementById('theme-background').value = this.currentCampaign.themeConfig.colors?.background || '#0a0e27';
        }

        // Load UI strings
        if (document.getElementById('ui-currency')) {
            document.getElementById('ui-currency').value = this.currentCampaign.themeConfig.strings?.currency || 'Credits';
            document.getElementById('ui-research').value = this.currentCampaign.themeConfig.strings?.research || 'Research Points';
            document.getElementById('ui-agent').value = this.currentCampaign.themeConfig.strings?.agent || 'Agent';
            document.getElementById('ui-enemy').value = this.currentCampaign.themeConfig.strings?.enemy || 'Enemy';
        }

        // Load gameplay constants
        if (document.getElementById('const-movespeed')) {
            document.getElementById('const-movespeed').value = this.currentCampaign.themeConfig.constants?.movementSpeed || 2.0;
            document.getElementById('const-vision').value = this.currentCampaign.themeConfig.constants?.visionRange || 10;
            document.getElementById('const-hackrange').value = this.currentCampaign.themeConfig.constants?.hackRange || 3;
            document.getElementById('const-squadsize').value = this.currentCampaign.themeConfig.constants?.maxSquadSize || 6;
            document.getElementById('const-health').value = this.currentCampaign.themeConfig.constants?.baseHealth || 100;
            document.getElementById('const-respawn').value = this.currentCampaign.themeConfig.constants?.respawnTimer || 0;
        }
    }

    loadOverview() {
        // Check if campaign is loaded
        if (!this.currentCampaign) {
            this.editor.eventLogger.log('Campaign not yet loaded', 'warning');
            return;
        }

        // Update overview fields
        const idField = document.getElementById('campaign-id-edit');
        const nameField = document.getElementById('campaign-name-edit');
        const descField = document.getElementById('campaign-desc');

        if (idField) idField.value = this.currentCampaign.id || 'main';
        if (nameField) nameField.value = this.currentCampaign.name || 'New Campaign';
        if (descField) descField.value = this.currentCampaign.description || '';

        if (this.currentCampaign.startingResources) {
            const creditsField = document.getElementById('start-credits');
            const researchField = document.getElementById('start-research');
            const controlField = document.getElementById('start-control');

            if (creditsField) creditsField.value = this.currentCampaign.startingResources.credits || 10000;
            if (researchField) researchField.value = this.currentCampaign.startingResources.researchPoints || 150;
            if (controlField) controlField.value = this.currentCampaign.startingResources.worldControl || 15;
        }
    }

    loadMissions() {
        const container = document.getElementById('campaign-structure');

        // Initialize missions array if not exists
        if (!this.currentCampaign.missions) {
            this.currentCampaign.missions = [];
        }

        // Sync with CAMPAIGN_MISSIONS if available and missions array is empty
        if (window.CAMPAIGN_MISSIONS && Object.keys(window.CAMPAIGN_MISSIONS).length > 0) {
            if (this.currentCampaign.missions.length === 0) {
                this.currentCampaign.missions = Object.values(window.CAMPAIGN_MISSIONS);
            }
        }

        let html = '<div style="font-family: monospace;">';

        // Group missions by act
        const missionsByAct = {};
        for (const mission of this.currentCampaign.missions) {
            const act = mission.act || 1;
            if (!missionsByAct[act]) {
                missionsByAct[act] = [];
            }
            missionsByAct[act].push(mission);
        }

        // Sort acts
        const sortedActs = Object.keys(missionsByAct).sort((a, b) => parseInt(a) - parseInt(b));

        // Display missions
        for (const act of sortedActs) {
            const missions = missionsByAct[act];
            html += `
                <div style="margin-bottom: 20px; border: 1px solid #00ff41; padding: 10px; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="color: #00ff41; margin: 0;">ACT ${act}: ${this.getActTitle(parseInt(act))}</h4>
                        <div>
                            <button onclick="campaignManager.addMissionToAct(${act})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 4px 8px; cursor: pointer; margin: 0 2px;">➕ Add Mission</button>
                            <button onclick="campaignManager.deleteAct(${act})" style="background: #ff073a; color: white; border: none; padding: 4px 8px; cursor: pointer; margin: 0 2px;">🗑️ Delete Act</button>
                        </div>
                    </div>
                    <ul style="list-style: none; padding-left: 10px; margin-top: 10px;">
            `;

            // Sort missions by number
            missions.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

            for (let i = 0; i < missions.length; i++) {
                const mission = missions[i];
                const missionIndex = this.currentCampaign.missions.indexOf(mission);
                const isFirst = i === 0;
                const isLast = i === missions.length - 1;

                html += `
                    <li style="margin: 8px 0; padding: 10px; background: rgba(0,255,65,0.05); border-left: 3px solid #ff9800; position: relative;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="display: flex; flex-direction: column; gap: 2px;">
                                    ${!isFirst ? `<button onclick="campaignManager.quickMoveUp(${missionIndex})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 2px 6px; cursor: pointer; font-size: 10px;" title="Move Up">▲</button>` : '<span style="height: 20px;"></span>'}
                                    ${!isLast ? `<button onclick="campaignManager.quickMoveDown(${missionIndex})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 2px 6px; cursor: pointer; font-size: 10px;" title="Move Down">▼</button>` : '<span style="height: 20px;"></span>'}
                                </div>
                                <div style="flex: 1;">
                                    <span style="color: #ff9800;">▶</span>
                                    <strong style="color: #00ff41;">${mission.id}</strong>:
                                    <span style="color: #88ff88;">${mission.name || 'Unnamed Mission'}</span>
                                    <br>
                                    <small style="color: #888; margin-left: 20px;">${mission.description || mission.briefing || 'No description'}</small>
                                </div>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button onclick="campaignManager.editMission(${missionIndex})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 4px 8px; cursor: pointer;">✏️ Edit</button>
                                <button onclick="editor.loadGameMission('${mission.id}')" style="background: #00ffff; color: #1a1a2e; border: none; padding: 4px 8px; cursor: pointer;">🗺️ Map Editor</button>
                                <button onclick="campaignManager.duplicateMission(${missionIndex})" style="background: #ff9800; color: white; border: none; padding: 4px 8px; cursor: pointer;">📋</button>
                                <button onclick="campaignManager.deleteMission(${missionIndex})" style="background: #ff073a; color: white; border: none; padding: 4px 8px; cursor: pointer;">🗑️</button>
                            </div>
                        </div>
                    </li>
                `;
            }
            html += '</ul></div>';
        }

        if (sortedActs.length === 0) {
            html += '<p style="color: #888; text-align: center;">No missions defined. Click "Add New Mission" to create one.</p>';
        }

        html += '</div>';
        container.innerHTML = html;
    }

    loadAgents() {
        const container = document.getElementById('agents-list');
        let html = '';

        if (this.currentCampaign.agents && this.currentCampaign.agents.length > 0) {
            this.currentCampaign.agents.forEach((agent, index) => {
                html += this.createAgentCard(agent, index);
            });
        } else {
            html = '<p style="color: #888;">No agents defined. Click "Add New Agent" to create one.</p>';
        }

        container.innerHTML = html;
    }

    createAgentCard(agent, index) {
        return `
            <div style="border: 1px solid #00ff41; padding: 10px; margin: 10px 0; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="color: #00ff41; margin: 0;">${agent.name || 'Unnamed Agent'}</h4>
                    <button onclick="campaignManager.deleteAgent(${index})" style="background: #ff073a; color: white; border: none; padding: 5px 10px; cursor: pointer;">Delete</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 10px;">
                    <label>Name: <input type="text" value="${agent.name || ''}" onchange="campaignManager.updateAgent(${index}, 'name', this.value)" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                    <label>Specialization: <input type="text" value="${agent.specialization || ''}" onchange="campaignManager.updateAgent(${index}, 'specialization', this.value)" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                    <label>Cost: <input type="number" value="${agent.cost || 1000}" onchange="campaignManager.updateAgent(${index}, 'cost', parseInt(this.value))" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                    <label>Health: <input type="number" value="${agent.health || 100}" onchange="campaignManager.updateAgent(${index}, 'health', parseInt(this.value))" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                    <label>Speed: <input type="number" value="${agent.speed || 4}" onchange="campaignManager.updateAgent(${index}, 'speed', parseInt(this.value))" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                    <label>Damage: <input type="number" value="${agent.damage || 15}" onchange="campaignManager.updateAgent(${index}, 'damage', parseInt(this.value))" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                </div>
                <div style="margin-top: 10px;">
                    <label>Bio: <textarea onchange="campaignManager.updateAgent(${index}, 'bio', this.value)" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;" rows="2">${agent.bio || ''}</textarea></label>
                </div>
                <div style="margin-top: 10px;">
                    <label>Skills (comma-separated): <input type="text" value="${(agent.skills || []).join(', ')}" onchange="campaignManager.updateAgent(${index}, 'skills', this.value.split(',').map(s => s.trim()))" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 3px;"></label>
                </div>
                <div style="margin-top: 10px;">
                    <label><input type="checkbox" ${agent.hired ? 'checked' : ''} onchange="campaignManager.updateAgent(${index}, 'hired', this.checked)"> Hired by default</label>
                </div>
            </div>
        `;
    }

    addAgent() {
        if (!this.currentCampaign.agents) {
            this.currentCampaign.agents = [];
        }

        const newAgent = {
            id: this.currentCampaign.agents.length + 1,
            name: 'New Agent',
            specialization: 'assault',
            skills: ['combat'],
            cost: 1000,
            hired: false,
            health: 100,
            speed: 4,
            damage: 15,
            bio: 'A new operative'
        };

        this.currentCampaign.agents.push(newAgent);
        this.loadAgents();
    }

    updateAgent(index, field, value) {
        if (this.currentCampaign.agents && this.currentCampaign.agents[index]) {
            this.currentCampaign.agents[index][field] = value;
        }
    }

    deleteAgent(index) {
        if (confirm('Are you sure you want to delete this agent?')) {
            this.currentCampaign.agents.splice(index, 1);
            this.loadAgents();
        }
    }

    // Weapon CRUD operations
    addWeapon() {
        if (!this.currentCampaign.weapons) {
            this.currentCampaign.weapons = [];
        }

        const newWeapon = {
            id: this.currentCampaign.weapons.length + 1,
            name: 'New Weapon',
            type: 'weapon',
            cost: 500,
            owned: 0,
            damage: 20,
            description: 'Weapon description',
            // RPG properties
            weight: 5,
            range: 10,
            accuracy: 80,
            critChance: 5,
            ammoCapacity: 30,
            fireRate: 'auto',
            slot: 'primary',
            requirements: {
                level: 1,
                strength: 10
            }
        };

        this.currentCampaign.weapons.push(newWeapon);
        this.loadWeaponsEquipment();
    }

    updateWeapon(index, field, value) {
        if (this.currentCampaign.weapons && this.currentCampaign.weapons[index]) {
            this.currentCampaign.weapons[index][field] = value;
        }
    }

    deleteWeapon(index) {
        if (confirm('Delete this weapon?')) {
            this.currentCampaign.weapons.splice(index, 1);
            this.loadWeaponsEquipment();
        }
    }

    // Equipment CRUD operations
    addEquipment() {
        if (!this.currentCampaign.equipment) {
            this.currentCampaign.equipment = [];
        }

        const newEquipment = {
            id: this.currentCampaign.equipment.length + 1,
            name: 'New Equipment',
            type: 'equipment',
            cost: 300,
            owned: 0,
            description: 'Equipment description',
            // RPG properties
            weight: 2,
            slot: 'utility',
            protection: 0,
            hackBonus: 0,
            stealthBonus: 0,
            carryCapacity: 0,
            uses: -1,  // -1 = unlimited
            requirements: {
                level: 1
            }
        };

        this.currentCampaign.equipment.push(newEquipment);
        this.loadWeaponsEquipment();
    }

    updateEquipment(index, field, value) {
        if (this.currentCampaign.equipment && this.currentCampaign.equipment[index]) {
            this.currentCampaign.equipment[index][field] = value;
        }
    }

    deleteEquipment(index) {
        if (confirm('Delete this equipment?')) {
            this.currentCampaign.equipment.splice(index, 1);
            this.loadWeaponsEquipment();
        }
    }

    // Enemy Type CRUD operations
    addEnemyType() {
        if (!this.currentCampaign.enemyTypes) {
            this.currentCampaign.enemyTypes = [];
        }

        const newEnemy = {
            type: 'new_enemy',
            health: 50,
            speed: 2,
            damage: 10,
            visionRange: 5,
            color: '#ff6666',
            aiType: 'patrol',
            alertRange: 8,
            description: 'Enemy description'
        };

        this.currentCampaign.enemyTypes.push(newEnemy);
        this.loadEnemyTypes();
    }

    updateEnemyType(index, field, value) {
        if (this.currentCampaign.enemyTypes && this.currentCampaign.enemyTypes[index]) {
            this.currentCampaign.enemyTypes[index][field] = value;
        }
    }

    deleteEnemyType(index) {
        if (confirm('Delete this enemy type?')) {
            this.currentCampaign.enemyTypes.splice(index, 1);
            this.loadEnemyTypes();
        }
    }

    // Research CRUD operations
    addResearchItem(tier) {
        if (!this.currentCampaign.researchTree) {
            this.currentCampaign.researchTree = {};
        }
        if (!this.currentCampaign.researchTree[tier]) {
            this.currentCampaign.researchTree[tier] = [];
        }

        const newResearch = {
            id: `new_research_${Date.now()}`,
            name: 'New Research',
            cost: 100,
            description: 'Research description',
            effect: { type: 'boost', value: 0.1 }
        };

        this.currentCampaign.researchTree[tier].push(newResearch);
        this.loadResearchTree();
    }

    updateResearchItem(tier, index, field, value) {
        if (this.currentCampaign.researchTree &&
            this.currentCampaign.researchTree[tier] &&
            this.currentCampaign.researchTree[tier][index]) {
            this.currentCampaign.researchTree[tier][index][field] = value;
        }
    }

    deleteResearchItem(tier, index) {
        if (confirm('Delete this research item?')) {
            this.currentCampaign.researchTree[tier].splice(index, 1);
            this.loadResearchTree();
        }
    }

    // Intel Report CRUD operations
    addIntelReport() {
        if (!this.currentCampaign.intelReports) {
            this.currentCampaign.intelReports = [];
        }

        const newReport = {
            id: `intel_${Date.now()}`,
            threshold: this.currentCampaign.intelReports.length + 1,
            title: 'NEW INTEL',
            content: 'Intel report content',
            reward: { credits: 500 }
        };

        this.currentCampaign.intelReports.push(newReport);
        this.loadIntelReports();
    }

    updateIntelReport(index, field, value) {
        if (this.currentCampaign.intelReports && this.currentCampaign.intelReports[index]) {
            this.currentCampaign.intelReports[index][field] = value;
        }
    }

    deleteIntelReport(index) {
        if (confirm('Delete this intel report?')) {
            this.currentCampaign.intelReports.splice(index, 1);
            this.loadIntelReports();
        }
    }

    // Mission CRUD operations
    async addMission() {
        const act = prompt('Which act should this mission belong to? (1-5)', '1');
        if (!act) return;

        if (!this.currentCampaign.missions) {
            this.currentCampaign.missions = [];
        }

        const missionsInAct = this.currentCampaign.missions.filter(m => m.act === parseInt(act));
        const missionId = `${this.currentCampaign.id}-${act.padStart(2, '0')}-${(missionsInAct.length + 1).toString().padStart(3, '0')}`;

        // Create a simple 40x40 starter map
        const mapWidth = 40;
        const mapHeight = 40;
        const tiles = [];
        for (let y = 0; y < mapHeight; y++) {
            let row = '';
            for (let x = 0; x < mapWidth; x++) {
                // Create a border of walls with floor inside
                if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
                    row += '#';
                } else if ((x % 8 === 0 || y % 8 === 0) && x > 4 && x < mapWidth - 4 && y > 4 && y < mapHeight - 4) {
                    // Add some internal walls for structure
                    row += '#';
                } else {
                    row += '.';
                }
            }
            tiles.push(row);
        }

        const newMission = {
            id: missionId,
            campaign: this.currentCampaign.id,
            act: parseInt(act),
            missionNumber: missionsInAct.length + 1,
            name: 'New Mission',
            title: 'Mission Title',
            description: 'Mission description',
            briefing: 'Mission briefing text',
            agents: {
                max: 4,
                required: 2,
                recommended: 3
            },
            map: {
                type: 'corporate',
                name: 'New Map',
                width: mapWidth,
                height: mapHeight,
                spawn: { x: 2, y: mapHeight - 2 },
                extraction: { x: mapWidth - 2, y: 2 },
                // Include embedded map data so it can be loaded in the editor
                embedded: {
                    tiles: tiles,
                    spawn: { x: 2, y: mapHeight - 2 },
                    extraction: { x: mapWidth - 2, y: 2 },
                    items: [],
                    doors: [],
                    coverCount: 20
                },
                terminals: [],
                enemySpawns: [],
                coverPositions: 20
            },
            objectives: [
                {
                    id: 'eliminate_all',
                    type: 'eliminate',
                    target: 'all',
                    count: 5,
                    required: true,
                    description: 'Eliminate all hostiles'
                }
            ],
            enemies: {
                count: 5,
                types: ['guard', 'soldier']
            },
            rewards: {
                credits: 2000,
                researchPoints: 50,
                experience: 500
            }
        };

        this.currentCampaign.missions.push(newMission);

        // Also add to CAMPAIGN_MISSIONS so it can be loaded in the map editor
        if (typeof CAMPAIGN_MISSIONS !== 'undefined') {
            CAMPAIGN_MISSIONS[missionId] = newMission;
        }

        this.loadMissions();
        await this.saveCampaignToDB(this.currentCampaign); // Save to IndexedDB

        // Refresh the mission dropdown in the editor
        this.refreshMissionList();

        alert(`Mission "${newMission.id}" created in Act ${act}`);
    }

    editMission(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        // Create a mission edit dialog
        const editHtml = `
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a2e; border: 2px solid #00ff41; padding: 20px; z-index: 10000; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3 style="color: #00ff41;">Edit Mission: ${mission.id}</h3>
                <div style="display: grid; gap: 10px;">
                    <label>Name: <input type="text" id="edit-mission-name" value="${mission.name || ''}" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;"></label>
                    <label>Title: <input type="text" id="edit-mission-title" value="${mission.title || ''}" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;"></label>
                    <label>Description: <textarea id="edit-mission-desc" rows="3" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;">${mission.description || ''}</textarea></label>
                    <label>Briefing: <textarea id="edit-mission-briefing" rows="4" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;">${mission.briefing || ''}</textarea></label>
                    <label>Max Agents: <input type="number" id="edit-mission-max-agents" value="${mission.agents?.max || 4}" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;"></label>
                    <label>Credits Reward: <input type="number" id="edit-mission-credits" value="${mission.rewards?.credits || 0}" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;"></label>
                    <label>Research Points: <input type="number" id="edit-mission-research" value="${mission.rewards?.researchPoints || 0}" style="width: 100%; background: #0a0e27; color: #00ff41; border: 1px solid #00ff41; padding: 5px;"></label>
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="campaignManager.saveMissionEdit(${index})" style="padding: 10px; background: #00ff41; color: #1a1a2e; border: none; cursor: pointer;">Save</button>
                    <button onclick="document.getElementById('mission-edit-dialog').remove()" style="padding: 10px; background: #ff073a; color: white; border: none; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        // Remove any existing dialog
        const existingDialog = document.getElementById('mission-edit-dialog');
        if (existingDialog) existingDialog.remove();

        // Add new dialog
        const dialog = document.createElement('div');
        dialog.id = 'mission-edit-dialog';
        dialog.innerHTML = editHtml;
        document.body.appendChild(dialog);
    }

    saveMissionEdit(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        mission.name = document.getElementById('edit-mission-name').value;
        mission.title = document.getElementById('edit-mission-title').value;
        mission.description = document.getElementById('edit-mission-desc').value;
        mission.briefing = document.getElementById('edit-mission-briefing').value;

        if (!mission.agents) mission.agents = {};
        mission.agents.max = parseInt(document.getElementById('edit-mission-max-agents').value);

        if (!mission.rewards) mission.rewards = {};
        mission.rewards.credits = parseInt(document.getElementById('edit-mission-credits').value);
        mission.rewards.researchPoints = parseInt(document.getElementById('edit-mission-research').value);

        // Remove dialog
        document.getElementById('mission-edit-dialog').remove();

        // Reload missions display
        this.loadMissions();

        alert('Mission updated successfully!');
    }

    async duplicateMission(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        const newMission = JSON.parse(JSON.stringify(mission));

        // Generate a proper new mission ID based on act and number
        const missionsInAct = this.currentCampaign.missions.filter(m => m.act === mission.act);
        const newMissionNumber = missionsInAct.length + 1;
        newMission.id = `${this.currentCampaign.id}-${mission.act.toString().padStart(2, '0')}-${newMissionNumber.toString().padStart(3, '0')}`;
        newMission.name = mission.name + ' (Copy)';
        newMission.missionNumber = newMissionNumber;

        this.currentCampaign.missions.push(newMission);

        // Also add to CAMPAIGN_MISSIONS so it can be loaded in the map editor
        if (typeof CAMPAIGN_MISSIONS !== 'undefined') {
            CAMPAIGN_MISSIONS[newMission.id] = newMission;
        }

        this.loadMissions();
        await this.saveCampaignToDB(this.currentCampaign); // Save to IndexedDB

        // Refresh the mission dropdown in the editor
        this.refreshMissionList();

        alert(`Mission duplicated as "${newMission.id}"`);
    }

    async deleteMission(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        if (confirm(`Delete mission "${mission.name}"?\nThis cannot be undone!`)) {
            // Remove from CAMPAIGN_MISSIONS
            if (typeof CAMPAIGN_MISSIONS !== 'undefined' && CAMPAIGN_MISSIONS[mission.id]) {
                delete CAMPAIGN_MISSIONS[mission.id];
            }

            this.currentCampaign.missions.splice(index, 1);
            this.loadMissions();
            await this.saveCampaignToDB(this.currentCampaign); // Save to IndexedDB

            // Refresh the mission dropdown in the editor
            this.refreshMissionList();
        }
    }

    async addMissionToAct(act) {
        if (!this.currentCampaign.missions) {
            this.currentCampaign.missions = [];
        }

        const missionsInAct = this.currentCampaign.missions.filter(m => m.act === parseInt(act));
        const missionId = `${this.currentCampaign.id}-${act.toString().padStart(2, '0')}-${(missionsInAct.length + 1).toString().padStart(3, '0')}`;

        // Create a simple 40x40 starter map
        const mapWidth = 40;
        const mapHeight = 40;
        const tiles = [];
        for (let y = 0; y < mapHeight; y++) {
            let row = '';
            for (let x = 0; x < mapWidth; x++) {
                // Create a border of walls with floor inside
                if (x === 0 || x === mapWidth - 1 || y === 0 || y === mapHeight - 1) {
                    row += '#';
                } else if ((x % 8 === 0 || y % 8 === 0) && x > 4 && x < mapWidth - 4 && y > 4 && y < mapHeight - 4) {
                    // Add some internal walls for structure
                    row += '#';
                } else {
                    row += '.';
                }
            }
            tiles.push(row);
        }

        const newMission = {
            id: missionId,
            campaign: this.currentCampaign.id,
            act: parseInt(act),
            missionNumber: missionsInAct.length + 1,
            name: `Mission ${missionsInAct.length + 1}`,
            title: 'New Mission',
            description: 'Mission description',
            briefing: 'Mission briefing',
            agents: { max: 4, required: 2, recommended: 3 },
            map: {
                type: 'corporate',
                name: 'New Map',
                width: mapWidth,
                height: mapHeight,
                spawn: { x: 2, y: mapHeight - 2 },
                extraction: { x: mapWidth - 2, y: 2 },
                // Include embedded map data so it can be loaded in the editor
                embedded: {
                    tiles: tiles,
                    spawn: { x: 2, y: mapHeight - 2 },
                    extraction: { x: mapWidth - 2, y: 2 },
                    items: [],
                    doors: [],
                    coverCount: 20
                },
                terminals: [],
                enemySpawns: [],
                coverPositions: 20
            },
            objectives: [
                {
                    id: 'eliminate_all',
                    type: 'eliminate',
                    target: 'all',
                    count: 5,
                    required: true,
                    description: 'Eliminate all hostiles'
                }
            ],
            enemies: { count: 5, types: ['guard'] },
            rewards: { credits: 2000, researchPoints: 50 }
        };

        this.currentCampaign.missions.push(newMission);

        // Also add to CAMPAIGN_MISSIONS so it can be loaded in the map editor
        if (typeof CAMPAIGN_MISSIONS !== 'undefined') {
            CAMPAIGN_MISSIONS[missionId] = newMission;
        }

        this.loadMissions();
        await this.saveCampaignToDB(this.currentCampaign); // Save to IndexedDB

        // Refresh the mission dropdown in the editor
        this.refreshMissionList();
    }

    deleteAct(act) {
        const missionsInAct = this.currentCampaign.missions.filter(m => m.act === parseInt(act));
        if (missionsInAct.length > 0) {
            if (confirm(`Delete Act ${act} with ${missionsInAct.length} missions?\nThis will delete all missions in this act!`)) {
                // Remove missions from CAMPAIGN_MISSIONS
                missionsInAct.forEach(mission => {
                    if (typeof CAMPAIGN_MISSIONS !== 'undefined' && CAMPAIGN_MISSIONS[mission.id]) {
                        delete CAMPAIGN_MISSIONS[mission.id];
                    }
                });

                this.currentCampaign.missions = this.currentCampaign.missions.filter(m => m.act !== parseInt(act));
                this.loadMissions();

                // Save to IndexedDB and refresh mission list
                this.saveCampaignToDB(this.currentCampaign);
                this.refreshMissionList();
            }
        } else {
            alert('This act has no missions');
        }
    }

    async addAct() {
        const acts = [...new Set(this.currentCampaign.missions.map(m => m.act))];
        const newAct = Math.max(...acts, 0) + 1;
        await this.addMissionToAct(newAct);
        alert(`Act ${newAct} created with first mission`);
    }

    reorderMissions() {
        // Create a reordering dialog
        const reorderHtml = `
            <div id="reorder-dialog" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #1a1a2e; border: 2px solid #00ff41; padding: 20px; z-index: 10000; max-width: 600px; max-height: 80vh; overflow-y: auto;">
                <h3 style="color: #00ff41;">Reorder Missions</h3>
                <p style="color: #888;">Use the arrows to move missions up or down within their acts.</p>
                <div id="reorder-list" style="margin: 20px 0;">
                    ${this.generateReorderList()}
                </div>
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button onclick="campaignManager.saveReorder()" style="padding: 10px; background: #00ff41; color: #1a1a2e; border: none; cursor: pointer;">Save Order</button>
                    <button onclick="document.getElementById('reorder-dialog').remove()" style="padding: 10px; background: #ff073a; color: white; border: none; cursor: pointer;">Cancel</button>
                </div>
            </div>
        `;

        // Remove any existing dialog
        const existingDialog = document.getElementById('reorder-dialog');
        if (existingDialog) existingDialog.remove();

        // Add new dialog
        const dialog = document.createElement('div');
        dialog.innerHTML = reorderHtml;
        document.body.appendChild(dialog);
    }

    generateReorderList() {
        if (!this.currentCampaign.missions || this.currentCampaign.missions.length === 0) {
            return '<p style="color: #888;">No missions to reorder.</p>';
        }

        // Group missions by act
        const missionsByAct = {};
        this.currentCampaign.missions.forEach((mission, index) => {
            const act = mission.act || 1;
            if (!missionsByAct[act]) {
                missionsByAct[act] = [];
            }
            mission._index = index; // Store original index
            missionsByAct[act].push(mission);
        });

        let html = '';
        const sortedActs = Object.keys(missionsByAct).sort((a, b) => parseInt(a) - parseInt(b));

        for (const act of sortedActs) {
            const missions = missionsByAct[act];
            missions.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

            const actTitle = this.getActTitle(parseInt(act));
            html += `<div style="margin-bottom: 20px;">
                <h4 style="color: #00ff41;">Act ${act}: ${actTitle}</h4>
                <ul style="list-style: none; padding: 0;">`;

            missions.forEach((mission, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === missions.length - 1;

                html += `
                    <li style="margin: 5px 0; padding: 10px; background: rgba(0,255,65,0.1); border: 1px solid #00ff41; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #00ff41;">${mission.id}: ${mission.name}</span>
                        <div style="display: flex; gap: 5px;">
                            ${!isFirst ? `<button onclick="campaignManager.moveMissionUp(${mission._index})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 5px 10px; cursor: pointer;">↑</button>` : '<span style="width: 30px;"></span>'}
                            ${!isLast ? `<button onclick="campaignManager.moveMissionDown(${mission._index})" style="background: #00ff41; color: #1a1a2e; border: none; padding: 5px 10px; cursor: pointer;">↓</button>` : '<span style="width: 30px;"></span>'}
                        </div>
                    </li>
                `;
            });

            html += '</ul></div>';
        }

        return html;
    }

    moveMissionUp(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        // Find missions in the same act
        const samAct = this.currentCampaign.missions.filter(m => m.act === mission.act);
        samAct.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

        const currentPos = samAct.indexOf(mission);
        if (currentPos > 0) {
            // Swap mission numbers
            const temp = mission.missionNumber;
            mission.missionNumber = samAct[currentPos - 1].missionNumber;
            samAct[currentPos - 1].missionNumber = temp;

            // Refresh the dialog
            document.getElementById('reorder-list').innerHTML = this.generateReorderList();
        }
    }

    moveMissionDown(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        // Find missions in the same act
        const samAct = this.currentCampaign.missions.filter(m => m.act === mission.act);
        samAct.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

        const currentPos = samAct.indexOf(mission);
        if (currentPos < samAct.length - 1) {
            // Swap mission numbers
            const temp = mission.missionNumber;
            mission.missionNumber = samAct[currentPos + 1].missionNumber;
            samAct[currentPos + 1].missionNumber = temp;

            // Refresh the dialog
            document.getElementById('reorder-list').innerHTML = this.generateReorderList();
        }
    }

    async saveReorder() {
        // Update mission IDs based on new order
        this.currentCampaign.missions.forEach(mission => {
            const oldId = mission.id;
            const newId = `${this.currentCampaign.id}-${mission.act.toString().padStart(2, '0')}-${mission.missionNumber.toString().padStart(3, '0')}`;

            if (oldId !== newId) {
                mission.id = newId;

                // Update in CAMPAIGN_MISSIONS
                if (window.CAMPAIGN_MISSIONS) {
                    delete window.CAMPAIGN_MISSIONS[oldId];
                    window.CAMPAIGN_MISSIONS[newId] = mission;
                }
            }
        });

        // Save to database
        await this.saveCampaignToDB(this.currentCampaign);

        // Refresh displays
        this.loadMissions();
        this.refreshMissionList();

        // Close dialog
        document.getElementById('reorder-dialog').remove();

        alert('Mission order saved successfully!');
    }

    importMissionFile() {
        alert('Mission file import feature coming soon! Use the main import to load complete campaigns.');
    }

    // Quick reorder functions for the main list
    async quickMoveUp(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        // Find missions in the same act
        const sameAct = this.currentCampaign.missions.filter(m => m.act === mission.act);
        sameAct.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

        const currentPos = sameAct.indexOf(mission);
        if (currentPos > 0) {
            // Swap mission numbers
            const temp = mission.missionNumber;
            mission.missionNumber = sameAct[currentPos - 1].missionNumber;
            sameAct[currentPos - 1].missionNumber = temp;

            // Update IDs
            const oldId = mission.id;
            mission.id = `${this.currentCampaign.id}-${mission.act.toString().padStart(2, '0')}-${mission.missionNumber.toString().padStart(3, '0')}`;

            const prevOldId = sameAct[currentPos - 1].id;
            sameAct[currentPos - 1].id = `${this.currentCampaign.id}-${sameAct[currentPos - 1].act.toString().padStart(2, '0')}-${sameAct[currentPos - 1].missionNumber.toString().padStart(3, '0')}`;

            // Update CAMPAIGN_MISSIONS
            if (window.CAMPAIGN_MISSIONS) {
                delete window.CAMPAIGN_MISSIONS[oldId];
                delete window.CAMPAIGN_MISSIONS[prevOldId];
                window.CAMPAIGN_MISSIONS[mission.id] = mission;
                window.CAMPAIGN_MISSIONS[sameAct[currentPos - 1].id] = sameAct[currentPos - 1];
            }

            // Save and refresh
            await this.saveCampaignToDB(this.currentCampaign);
            this.loadMissions();
            this.refreshMissionList();
        }
    }

    async quickMoveDown(index) {
        const mission = this.currentCampaign.missions[index];
        if (!mission) return;

        // Find missions in the same act
        const sameAct = this.currentCampaign.missions.filter(m => m.act === mission.act);
        sameAct.sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));

        const currentPos = sameAct.indexOf(mission);
        if (currentPos < sameAct.length - 1) {
            // Swap mission numbers
            const temp = mission.missionNumber;
            mission.missionNumber = sameAct[currentPos + 1].missionNumber;
            sameAct[currentPos + 1].missionNumber = temp;

            // Update IDs
            const oldId = mission.id;
            mission.id = `${this.currentCampaign.id}-${mission.act.toString().padStart(2, '0')}-${mission.missionNumber.toString().padStart(3, '0')}`;

            const nextOldId = sameAct[currentPos + 1].id;
            sameAct[currentPos + 1].id = `${this.currentCampaign.id}-${sameAct[currentPos + 1].act.toString().padStart(2, '0')}-${sameAct[currentPos + 1].missionNumber.toString().padStart(3, '0')}`;

            // Update CAMPAIGN_MISSIONS
            if (window.CAMPAIGN_MISSIONS) {
                delete window.CAMPAIGN_MISSIONS[oldId];
                delete window.CAMPAIGN_MISSIONS[nextOldId];
                window.CAMPAIGN_MISSIONS[mission.id] = mission;
                window.CAMPAIGN_MISSIONS[sameAct[currentPos + 1].id] = sameAct[currentPos + 1];
            }

            // Save and refresh
            await this.saveCampaignToDB(this.currentCampaign);
            this.loadMissions();
            this.refreshMissionList();
        }
    }

    // Get a descriptive title for an act number
    getActTitle(actNumber) {
        const actTitles = {
            1: 'Beginning Operations',
            2: 'Escalation',
            3: 'Corporate Warfare',
            4: 'Global Expansion',
            5: 'Final Confrontation',
            6: 'Aftermath',
            7: 'New Horizons',
            8: 'Ultimate Challenge'
        };

        // Allow custom act titles from campaign
        if (this.currentCampaign && this.currentCampaign.actTitles && this.currentCampaign.actTitles[actNumber]) {
            return this.currentCampaign.actTitles[actNumber];
        }

        return actTitles[actNumber] || `Chapter ${actNumber}`;
    }

    // Load weapons and equipment
    loadWeaponsEquipment() {
        const weaponsContainer = document.getElementById('weapons-list');
        const equipmentContainer = document.getElementById('equipment-list');

        // Load weapons
        let weaponsHtml = '';
        if (this.currentCampaign.weapons && this.currentCampaign.weapons.length > 0) {
            this.currentCampaign.weapons.forEach((weapon, index) => {
                weaponsHtml += this.createWeaponCard(weapon, index);
            });
        } else {
            weaponsHtml = '<p style="color: #888; text-align: center;">No weapons defined. Click "Add Weapon" to create one.</p>';
        }
        weaponsContainer.innerHTML = weaponsHtml;

        // Load equipment
        let equipmentHtml = '';
        if (this.currentCampaign.equipment && this.currentCampaign.equipment.length > 0) {
            this.currentCampaign.equipment.forEach((item, index) => {
                equipmentHtml += this.createEquipmentCard(item, index);
            });
        } else {
            equipmentHtml = '<p style="color: #888; text-align: center;">No equipment defined. Click "Add Equipment" to create one.</p>';
        }
        equipmentContainer.innerHTML = equipmentHtml;
    }

    createWeaponCard(weapon, index) {
        return `
            <div style="border: 1px solid #00ff41; padding: 15px; margin-bottom: 15px; background: rgba(0,255,65,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Name</label>
                        <input type="text" value="${weapon.name || ''}"
                               onchange="campaignManager.updateWeapon(${index}, 'name', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Type</label>
                        <input type="text" value="${weapon.type || 'weapon'}"
                               onchange="campaignManager.updateWeapon(${index}, 'type', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Cost</label>
                        <input type="number" value="${weapon.cost || 0}"
                               onchange="campaignManager.updateWeapon(${index}, 'cost', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Damage</label>
                        <input type="number" value="${weapon.damage || 0}"
                               onchange="campaignManager.updateWeapon(${index}, 'damage', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Weight</label>
                        <input type="number" value="${weapon.weight || 5}"
                               onchange="campaignManager.updateWeapon(${index}, 'weight', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Range</label>
                        <input type="number" value="${weapon.range || 10}"
                               onchange="campaignManager.updateWeapon(${index}, 'range', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Accuracy %</label>
                        <input type="number" value="${weapon.accuracy || 80}" min="0" max="100"
                               onchange="campaignManager.updateWeapon(${index}, 'accuracy', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Crit Chance %</label>
                        <input type="number" value="${weapon.critChance || 5}" min="0" max="100"
                               onchange="campaignManager.updateWeapon(${index}, 'critChance', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Ammo Capacity</label>
                        <input type="number" value="${weapon.ammoCapacity || 30}"
                               onchange="campaignManager.updateWeapon(${index}, 'ammoCapacity', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Fire Rate</label>
                        <select onchange="campaignManager.updateWeapon(${index}, 'fireRate', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="single" ${weapon.fireRate === 'single' ? 'selected' : ''}>Single</option>
                            <option value="burst" ${weapon.fireRate === 'burst' ? 'selected' : ''}>Burst</option>
                            <option value="auto" ${weapon.fireRate === 'auto' ? 'selected' : ''}>Auto</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Slot</label>
                        <select onchange="campaignManager.updateWeapon(${index}, 'slot', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="primary" ${weapon.slot === 'primary' ? 'selected' : ''}>Primary</option>
                            <option value="secondary" ${weapon.slot === 'secondary' ? 'selected' : ''}>Secondary</option>
                            <option value="melee" ${weapon.slot === 'melee' ? 'selected' : ''}>Melee</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Req. Level</label>
                        <input type="number" value="${weapon.requirements?.level || 1}" min="1" max="20"
                               onchange="campaignManager.updateWeapon(${index}, 'requirements', {level: parseInt(this.value), strength: campaignManager.currentCampaign.weapons[${index}].requirements?.strength || 10})"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Owned</label>
                        <input type="number" value="${weapon.owned || 0}"
                               onchange="campaignManager.updateWeapon(${index}, 'owned', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Range (optional)</label>
                        <input type="number" value="${weapon.range || ''}"
                               onchange="campaignManager.updateWeapon(${index}, 'range', parseInt(this.value) || null)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #00ff41; font-size: 11px;">Description</label>
                        <input type="text" value="${weapon.description || ''}"
                               onchange="campaignManager.updateWeapon(${index}, 'description', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                </div>
                <button class="action-btn" style="background: #ff0000; margin-top: 10px;"
                        onclick="campaignManager.deleteWeapon(${index})">Delete Weapon</button>
            </div>
        `;
    }

    createEquipmentCard(item, index) {
        return `
            <div style="border: 1px solid #00ff41; padding: 15px; margin-bottom: 15px; background: rgba(0,255,65,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Name</label>
                        <input type="text" value="${item.name || ''}"
                               onchange="campaignManager.updateEquipment(${index}, 'name', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Type</label>
                        <input type="text" value="${item.type || 'equipment'}"
                               onchange="campaignManager.updateEquipment(${index}, 'type', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Cost</label>
                        <input type="number" value="${item.cost || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'cost', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Weight</label>
                        <input type="number" value="${item.weight || 2}"
                               onchange="campaignManager.updateEquipment(${index}, 'weight', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Protection</label>
                        <input type="number" value="${item.protection || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'protection', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Hack Bonus</label>
                        <input type="number" value="${item.hackBonus || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'hackBonus', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Stealth Bonus</label>
                        <input type="number" value="${item.stealthBonus || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'stealthBonus', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Carry Capacity</label>
                        <input type="number" value="${item.carryCapacity || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'carryCapacity', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Slot</label>
                        <select onchange="campaignManager.updateEquipment(${index}, 'slot', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                            <option value="armor" ${item.slot === 'armor' ? 'selected' : ''}>Armor</option>
                            <option value="utility" ${item.slot === 'utility' ? 'selected' : ''}>Utility</option>
                            <option value="consumable" ${item.slot === 'consumable' ? 'selected' : ''}>Consumable</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Uses (-1 = ∞)</label>
                        <input type="number" value="${item.uses || -1}" min="-1"
                               onchange="campaignManager.updateEquipment(${index}, 'uses', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Owned</label>
                        <input type="number" value="${item.owned || 0}"
                               onchange="campaignManager.updateEquipment(${index}, 'owned', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Protection</label>
                        <input type="number" value="${item.protection || ''}"
                               onchange="campaignManager.updateEquipment(${index}, 'protection', parseInt(this.value) || null)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Hack Bonus</label>
                        <input type="number" value="${item.hackBonus || ''}"
                               onchange="campaignManager.updateEquipment(${index}, 'hackBonus', parseInt(this.value) || null)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ff41; font-size: 11px;">Stealth Bonus</label>
                        <input type="number" value="${item.stealthBonus || ''}"
                               onchange="campaignManager.updateEquipment(${index}, 'stealthBonus', parseInt(this.value) || null)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #00ff41; font-size: 11px;">Description</label>
                        <input type="text" value="${item.description || ''}"
                               onchange="campaignManager.updateEquipment(${index}, 'description', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ff41; color: #00ff41; padding: 5px;">
                    </div>
                </div>
                <button class="action-btn" style="background: #ff0000; margin-top: 10px;"
                        onclick="campaignManager.deleteEquipment(${index})">Delete Equipment</button>
            </div>
        `;
    }

    loadEnemyTypes() {
        const container = document.getElementById('enemies-list');

        let html = '';
        if (this.currentCampaign.enemyTypes && this.currentCampaign.enemyTypes.length > 0) {
            this.currentCampaign.enemyTypes.forEach((enemy, index) => {
                html += this.createEnemyCard(enemy, index);
            });
        } else {
            html = '<p style="color: #888; text-align: center;">No enemy types defined. Click "Add Enemy Type" to create one.</p>';
        }
        container.innerHTML = html;
    }

    createEnemyCard(enemy, index) {
        return `
            <div style="border: 1px solid #ff0000; padding: 15px; margin-bottom: 15px; background: rgba(255,0,0,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Type</label>
                        <input type="text" value="${enemy.type || ''}"
                               onchange="campaignManager.updateEnemyType(${index}, 'type', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Health</label>
                        <input type="number" value="${enemy.health || 0}"
                               onchange="campaignManager.updateEnemyType(${index}, 'health', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Speed</label>
                        <input type="number" step="0.5" value="${enemy.speed || 0}"
                               onchange="campaignManager.updateEnemyType(${index}, 'speed', parseFloat(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Damage</label>
                        <input type="number" value="${enemy.damage || 0}"
                               onchange="campaignManager.updateEnemyType(${index}, 'damage', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Vision Range</label>
                        <input type="number" value="${enemy.visionRange || 5}"
                               onchange="campaignManager.updateEnemyType(${index}, 'visionRange', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Color (hex)</label>
                        <input type="text" value="${enemy.color || '#ff6666'}"
                               onchange="campaignManager.updateEnemyType(${index}, 'color', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">AI Type</label>
                        <select onchange="campaignManager.updateEnemyType(${index}, 'aiType', this.value)"
                                style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                            <option value="patrol" ${enemy.aiType === 'patrol' ? 'selected' : ''}>Patrol</option>
                            <option value="guard" ${enemy.aiType === 'guard' ? 'selected' : ''}>Guard</option>
                            <option value="hunter" ${enemy.aiType === 'hunter' ? 'selected' : ''}>Hunter</option>
                            <option value="sniper" ${enemy.aiType === 'sniper' ? 'selected' : ''}>Sniper</option>
                        </select>
                    </div>
                    <div>
                        <label style="color: #ff6666; font-size: 11px;">Alert Range</label>
                        <input type="number" value="${enemy.alertRange || 8}"
                               onchange="campaignManager.updateEnemyType(${index}, 'alertRange', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #ff6666; font-size: 11px;">Description</label>
                        <input type="text" value="${enemy.description || ''}"
                               onchange="campaignManager.updateEnemyType(${index}, 'description', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #ff6666; color: #ff6666; padding: 5px;">
                    </div>
                </div>
                <button class="action-btn" style="background: #ff0000; margin-top: 10px;"
                        onclick="campaignManager.deleteEnemyType(${index})">Delete Enemy Type</button>
            </div>
        `;
    }

    loadResearchTree() {
        const container = document.getElementById('research-tree');

        if (!this.currentCampaign.researchTree) {
            this.currentCampaign.researchTree = {};
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 20px;">';

        // Display each tier
        ['tier1', 'tier2', 'tier3'].forEach(tier => {
            html += `
                <div style="border-left: 3px solid #00ffff; padding-left: 15px;">
                    <h4 style="color: #00ffff; margin-bottom: 15px;">${tier.toUpperCase()}</h4>
                    <div style="display: flex; flex-direction: column; gap: 15px;">
            `;

            if (this.currentCampaign.researchTree[tier]) {
                this.currentCampaign.researchTree[tier].forEach((item, index) => {
                    html += this.createResearchCard(item, tier, index);
                });
            }

            html += `
                    </div>
                    <button class="action-btn" style="margin-top: 10px;"
                            onclick="campaignManager.addResearchItem('${tier}')">
                        Add ${tier} Research
                    </button>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    createResearchCard(item, tier, index) {
        return `
            <div style="border: 1px solid #00ffff; padding: 15px; background: rgba(0,255,255,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="color: #00ffff; font-size: 11px;">ID</label>
                        <input type="text" value="${item.id || ''}"
                               onchange="campaignManager.updateResearchItem('${tier}', ${index}, 'id', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ffff; font-size: 11px;">Name</label>
                        <input type="text" value="${item.name || ''}"
                               onchange="campaignManager.updateResearchItem('${tier}', ${index}, 'name', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ffff; font-size: 11px;">Cost</label>
                        <input type="number" value="${item.cost || 0}"
                               onchange="campaignManager.updateResearchItem('${tier}', ${index}, 'cost', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #00ffff; font-size: 11px;">Requires (comma-separated IDs)</label>
                        <input type="text" value="${(item.requires || []).join(', ')}"
                               onchange="campaignManager.updateResearchItem('${tier}', ${index}, 'requires', this.value ? this.value.split(',').map(s => s.trim()) : [])"
                               style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #00ffff; font-size: 11px;">Description</label>
                        <input type="text" value="${item.description || ''}"
                               onchange="campaignManager.updateResearchItem('${tier}', ${index}, 'description', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #00ffff; font-size: 11px;">Effect (JSON)</label>
                        <textarea onchange="try { campaignManager.updateResearchItem('${tier}', ${index}, 'effect', JSON.parse(this.value)); } catch(e) { alert('Invalid JSON'); }"
                                  style="width: 100%; background: #111; border: 1px solid #00ffff; color: #00ffff; padding: 5px; font-family: monospace;"
                                  rows="2">${JSON.stringify(item.effect || {}, null, 2)}</textarea>
                    </div>
                </div>
                <button class="action-btn" style="background: #ff0000; margin-top: 10px;"
                        onclick="campaignManager.deleteResearchItem('${tier}', ${index})">Delete Research</button>
            </div>
        `;
    }

    loadIntelReports() {
        const container = document.getElementById('intel-list');

        let html = '';
        if (this.currentCampaign.intelReports && this.currentCampaign.intelReports.length > 0) {
            this.currentCampaign.intelReports.forEach((report, index) => {
                html += this.createIntelCard(report, index);
            });
        } else {
            html = '<p style="color: #888; text-align: center;">No intel reports defined. Click "Add Intel Report" to create one.</p>';
        }

        container.innerHTML = html;
    }

    createIntelCard(report, index) {
        return `
            <div style="border: 1px solid #ffaa00; padding: 15px; margin-bottom: 15px; background: rgba(255,170,0,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <div>
                        <label style="color: #ffaa00; font-size: 11px;">ID</label>
                        <input type="text" value="${report.id || ''}"
                               onchange="campaignManager.updateIntelReport(${index}, 'id', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #ffaa00; color: #ffaa00; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ffaa00; font-size: 11px;">Intel Threshold</label>
                        <input type="number" value="${report.threshold || 0}"
                               onchange="campaignManager.updateIntelReport(${index}, 'threshold', parseInt(this.value))"
                               style="width: 100%; background: #111; border: 1px solid #ffaa00; color: #ffaa00; padding: 5px;">
                    </div>
                    <div>
                        <label style="color: #ffaa00; font-size: 11px;">Title</label>
                        <input type="text" value="${report.title || ''}"
                               onchange="campaignManager.updateIntelReport(${index}, 'title', this.value)"
                               style="width: 100%; background: #111; border: 1px solid #ffaa00; color: #ffaa00; padding: 5px;">
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #ffaa00; font-size: 11px;">Content</label>
                        <textarea onchange="campaignManager.updateIntelReport(${index}, 'content', this.value)"
                                  style="width: 100%; background: #111; border: 1px solid #ffaa00; color: #ffaa00; padding: 5px;"
                                  rows="3">${report.content || ''}</textarea>
                    </div>
                    <div style="grid-column: 1 / -1;">
                        <label style="color: #ffaa00; font-size: 11px;">Rewards (JSON)</label>
                        <textarea onchange="try { campaignManager.updateIntelReport(${index}, 'reward', JSON.parse(this.value)); } catch(e) { alert('Invalid JSON'); }"
                                  style="width: 100%; background: #111; border: 1px solid #ffaa00; color: #ffaa00; padding: 5px; font-family: monospace;"
                                  rows="2">${JSON.stringify(report.reward || {}, null, 2)}</textarea>
                    </div>
                </div>
                <button class="action-btn" style="background: #ff0000; margin-top: 10px;"
                        onclick="campaignManager.deleteIntelReport(${index})">Delete Intel Report</button>
            </div>
        `;
    }

    loadMusicConfig() {
        const container = document.getElementById('music-config');

        if (!this.currentCampaign.music) {
            this.currentCampaign.music = {
                screens: {},
                missions: {}
            };
        }

        let html = `
            <div style="display: flex; flex-direction: column; gap: 20px;">
                <!-- Screen Music -->
                <div style="border-left: 3px solid #ff00ff; padding-left: 15px;">
                    <h4 style="color: #ff00ff; margin-bottom: 15px;">SCREEN MUSIC</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        ${this.createScreenMusicCard('splash')}
                        ${this.createScreenMusicCard('menu')}
                        ${this.createScreenMusicCard('hub')}
                        ${this.createScreenMusicCard('credits')}
                    </div>
                </div>

                <!-- Mission Music -->
                <div style="border-left: 3px solid #ff00ff; padding-left: 15px;">
                    <h4 style="color: #ff00ff; margin-bottom: 15px;">MISSION MUSIC DEFAULTS</h4>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 15px;">
                        ${this.createMissionMusicCard()}
                    </div>
                </div>

                <!-- Sound Effects Configuration -->
                <div style="border-left: 3px solid #ff00ff; padding-left: 15px;">
                    <h4 style="color: #ff00ff; margin-bottom: 15px;">SOUND EFFECTS</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <label style="color: #ff00ff; font-size: 11px;">
                            Master Volume
                            <input type="range" min="0" max="100" value="${(this.currentCampaign.music.masterVolume || 1) * 100}"
                                   onchange="campaignManager.updateMusicConfig('masterVolume', this.value / 100)"
                                   style="width: 100%;">
                        </label>
                        <label style="color: #ff00ff; font-size: 11px;">
                            Music Volume
                            <input type="range" min="0" max="100" value="${(this.currentCampaign.music.musicVolume || 0.7) * 100}"
                                   onchange="campaignManager.updateMusicConfig('musicVolume', this.value / 100)"
                                   style="width: 100%;">
                        </label>
                        <label style="color: #ff00ff; font-size: 11px;">
                            SFX Volume
                            <input type="range" min="0" max="100" value="${(this.currentCampaign.music.sfxVolume || 0.8) * 100}"
                                   onchange="campaignManager.updateMusicConfig('sfxVolume', this.value / 100)"
                                   style="width: 100%;">
                        </label>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    createScreenMusicCard(screen) {
        const screenMusic = this.currentCampaign.music.screens && this.currentCampaign.music.screens[screen] || {};
        const tracks = screenMusic.tracks || {};
        const main = tracks.main || {};

        return `
            <div style="border: 1px solid #ff00ff; padding: 10px; background: rgba(255,0,255,0.05); border-radius: 5px;">
                <h5 style="color: #ff00ff; margin: 0 0 10px 0;">${screen.toUpperCase()}</h5>
                <label style="color: #ff00ff; font-size: 11px;">
                    File
                    <input type="text" value="${main.file || ''}"
                           onchange="campaignManager.updateScreenMusic('${screen}', 'file', this.value)"
                           style="width: 100%; background: #111; border: 1px solid #ff00ff; color: #ff00ff; padding: 3px;">
                </label>
                <label style="color: #ff00ff; font-size: 11px;">
                    Volume (0-1)
                    <input type="number" step="0.1" min="0" max="1" value="${main.volume || 0.5}"
                           onchange="campaignManager.updateScreenMusic('${screen}', 'volume', parseFloat(this.value))"
                           style="width: 100%; background: #111; border: 1px solid #ff00ff; color: #ff00ff; padding: 3px;">
                </label>
                <label style="color: #ff00ff; font-size: 11px;">
                    <input type="checkbox" ${main.loop ? 'checked' : ''}
                           onchange="campaignManager.updateScreenMusic('${screen}', 'loop', this.checked)">
                    Loop
                </label>
            </div>
        `;
    }

    createMissionMusicCard() {
        const missionMusic = this.currentCampaign.music.missions || {};
        const defaults = missionMusic.default || {};

        return `
            <div style="border: 1px solid #ff00ff; padding: 15px; background: rgba(255,0,255,0.05); border-radius: 5px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                    ${['ambient', 'combat', 'stealth', 'alert', 'victory'].map(type => `
                        <div>
                            <h6 style="color: #ff00ff; margin: 0 0 5px 0;">${type.toUpperCase()}</h6>
                            <label style="color: #ff00ff; font-size: 11px;">
                                File
                                <input type="text" value="${defaults[type] ? defaults[type].file || '' : ''}"
                                       onchange="campaignManager.updateMissionMusic('${type}', 'file', this.value)"
                                       style="width: 100%; background: #111; border: 1px solid #ff00ff; color: #ff00ff; padding: 3px;">
                            </label>
                            <label style="color: #ff00ff; font-size: 11px;">
                                Volume
                                <input type="number" step="0.1" min="0" max="1"
                                       value="${defaults[type] ? defaults[type].volume || 0.5 : 0.5}"
                                       onchange="campaignManager.updateMissionMusic('${type}', 'volume', parseFloat(this.value))"
                                       style="width: 100%; background: #111; border: 1px solid #ff00ff; color: #ff00ff; padding: 3px;">
                            </label>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Music configuration update methods
    updateMusicConfig(field, value) {
        if (!this.currentCampaign.music) {
            this.currentCampaign.music = {};
        }
        this.currentCampaign.music[field] = value;
    }

    updateScreenMusic(screen, field, value) {
        if (!this.currentCampaign.music) {
            this.currentCampaign.music = { screens: {} };
        }
        if (!this.currentCampaign.music.screens) {
            this.currentCampaign.music.screens = {};
        }
        if (!this.currentCampaign.music.screens[screen]) {
            this.currentCampaign.music.screens[screen] = { tracks: { main: {} } };
        }
        if (!this.currentCampaign.music.screens[screen].tracks) {
            this.currentCampaign.music.screens[screen].tracks = { main: {} };
        }
        if (!this.currentCampaign.music.screens[screen].tracks.main) {
            this.currentCampaign.music.screens[screen].tracks.main = {};
        }

        this.currentCampaign.music.screens[screen].tracks.main[field] = value;
    }

    updateMissionMusic(type, field, value) {
        if (!this.currentCampaign.music) {
            this.currentCampaign.music = { missions: {} };
        }
        if (!this.currentCampaign.music.missions) {
            this.currentCampaign.music.missions = {};
        }
        if (!this.currentCampaign.music.missions.default) {
            this.currentCampaign.music.missions.default = {};
        }
        if (!this.currentCampaign.music.missions.default[type]) {
            this.currentCampaign.music.missions.default[type] = {};
        }

        this.currentCampaign.music.missions.default[type][field] = value;
    }

    // Import/Export functionality
    async importFromZip() {
        document.getElementById('import-zip-input').click();
    }

    async handleZipImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const zip = await JSZip.loadAsync(file);

            // Look for campaign-content.js
            const contentFile = zip.file(/campaign-content\.js$/)[0];
            if (contentFile) {
                const content = await contentFile.async('string');

                // Parse the JavaScript file to extract the campaign object
                // This is a simple approach - in production you'd want better parsing
                const match = content.match(/const\s+\w+\s*=\s*({[\s\S]*});/);
                if (match) {
                    this.currentCampaign = eval('(' + match[1] + ')');
                    alert('Campaign imported successfully!');
                    this.loadTabContent('overview');
                }
            }

            // Import missions
            const missionFiles = zip.file(/\.js$/);
            let missionCount = 0;
            for (const file of missionFiles) {
                if (file.name.includes('act')) {
                    const content = await file.async('string');
                    // Execute the mission file to register it
                    eval(content);
                    missionCount++;
                }
            }

            this.editor.eventLogger.log(`Campaign imported from ZIP with ${missionCount} missions`, 'success', true);

            // Refresh the mission list in the editor
            this.refreshMissionList();

            // Update the main campaign content if we have it
            if (this.currentCampaign) {
                window.MAIN_CAMPAIGN_CONTENT = this.currentCampaign;
                this.currentCampaignId = this.currentCampaign.id;

                // Save to IndexedDB
                if (this.db) {
                    await this.saveCampaignToDB(this.currentCampaign);
                }

                // Reload campaign selector
                await this.loadCampaignSelector();
            }

            alert(`Campaign imported successfully!\nLoaded ${missionCount} missions.\nCampaign saved to browser storage.`);
        } catch (error) {
            this.editor.eventLogger.log(`Failed to import ZIP: ${error.message}`, 'error', true);
            alert('Failed to import campaign from ZIP file');
        }
    }

    importFromDirectory() {
        document.getElementById('import-dir-input').click();
    }

    async handleDirectoryImport(e) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        try {
            let missionCount = 0;

            // Process each file
            for (const file of files) {
                if (file.name === 'campaign-content.js') {
                    const content = await this.readFile(file);
                    // Parse campaign content
                    const match = content.match(/const\s+\w+\s*=\s*({[\s\S]*});/);
                    if (match) {
                        this.currentCampaign = eval('(' + match[1] + ')');
                    }
                } else if (file.name.endsWith('.js') && file.webkitRelativePath.includes('act')) {
                    // Mission file
                    const content = await this.readFile(file);
                    eval(content); // Register the mission
                    missionCount++;
                }
            }

            // Refresh the mission list in the editor
            this.refreshMissionList();

            // Update the main campaign content if we have it
            if (this.currentCampaign) {
                window.MAIN_CAMPAIGN_CONTENT = this.currentCampaign;
                this.currentCampaignId = this.currentCampaign.id;

                // Save to IndexedDB
                if (this.db) {
                    await this.saveCampaignToDB(this.currentCampaign);
                }
            }

            this.loadTabContent('overview');

            // Reload campaign selector
            await this.loadCampaignSelector();

            this.editor.eventLogger.log(`Campaign imported from directory with ${missionCount} missions`, 'success', true);
            alert(`Campaign imported successfully from directory!\nLoaded ${missionCount} missions.\nCampaign saved to browser storage.`);
        } catch (error) {
            this.editor.eventLogger.log(`Failed to import directory: ${error.message}`, 'error', true);
            alert('Failed to import campaign from directory');
        }
    }

    // Refresh mission list after import
    refreshMissionList() {
        // First sync missions to global
        this.syncMissionsToGlobal();

        // Update the mission list for the editor
        if (this.editor) {
            // Call the editor's loadCampaigns method to refresh the dropdown
            this.editor.loadCampaigns();
        }

        // Also update the load-game-mission dropdown directly
        const dropdown = document.getElementById('load-game-mission');
        if (dropdown && window.CAMPAIGN_MISSIONS) {
            // Check if there's a currently selected mission
            const currentValue = dropdown.value;
            const defaultText = currentValue && window.CAMPAIGN_MISSIONS[currentValue]
                ? `Current: ${window.CAMPAIGN_MISSIONS[currentValue].name || currentValue}`
                : 'Load Campaign Mission...';

            dropdown.innerHTML = `<option value="">${defaultText}</option>`;

            // Group by campaign and act
            const campaigns = {};

            for (const [key, mission] of Object.entries(window.CAMPAIGN_MISSIONS)) {
                const parts = key.split('-');
                const campaign = parts[0] || 'main';
                const act = parts[1] || '01';

                if (!campaigns[campaign]) {
                    campaigns[campaign] = {};
                }
                if (!campaigns[campaign][act]) {
                    campaigns[campaign][act] = [];
                }

                campaigns[campaign][act].push({ key, mission });
            }

            // Create optgroups for each campaign/act
            for (const [campaignName, acts] of Object.entries(campaigns)) {
                for (const [actNum, missions] of Object.entries(acts)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = `${campaignName.toUpperCase()} - Act ${parseInt(actNum)}`;

                    missions.sort((a, b) => {
                        const aNum = parseInt(a.key.split('-')[2]) || 0;
                        const bNum = parseInt(b.key.split('-')[2]) || 0;
                        return aNum - bNum;
                    });

                    for (const { key, mission } of missions) {
                        const option = document.createElement('option');
                        option.value = key;
                        option.textContent = `${mission.name || mission.title || 'Untitled'}`;
                        optgroup.appendChild(option);
                    }

                    dropdown.appendChild(optgroup);
                }
            }

            this.editor.eventLogger.log(`Refreshed mission list with ${Object.keys(window.CAMPAIGN_MISSIONS).length} missions`, 'success');
        }

        // Also update the missions tab if it's currently shown
        const missionsTab = document.getElementById('tab-missions');
        if (missionsTab && missionsTab.style.display !== 'none') {
            this.loadMissions();
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    async exportToZip() {
        try {
            const zip = new JSZip();
            const campaignId = this.currentCampaign.id || 'main';

            // Create campaign folder
            const campaignFolder = zip.folder(`campaigns/${campaignId}`);

            // Export campaign-content.js
            const contentJs = this.generateCampaignContentFile();
            campaignFolder.file('campaign-content.js', contentJs);

            // Export npcs.js if we have NPCs
            if (this.currentCampaign.npcs && Object.keys(this.currentCampaign.npcs).length > 0) {
                const npcsJs = this.generateNPCsFile();
                campaignFolder.file('npcs.js', npcsJs);
            }

            // Export campaign.json
            const campaignJson = {
                id: campaignId,
                name: this.currentCampaign.name,
                description: this.currentCampaign.description,
                acts: [] // TODO: Generate acts from missions
            };
            campaignFolder.file('campaign.json', JSON.stringify(campaignJson, null, 2));

            // Export missions
            for (const [id, mission] of Object.entries(window.CAMPAIGN_MISSIONS || {})) {
                const act = mission.act || 1;
                const actFolder = campaignFolder.folder(`act${act}`);
                const missionJs = this.editor.generateGameIntegrationFile({
                    missionDef: mission,
                    mapData: mission.map
                });
                actFolder.file(`${id}.js`, missionJs);
            }

            // Generate and download ZIP
            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `campaign_${campaignId}_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);

            this.editor.eventLogger.log('Campaign exported to ZIP', 'success', true);
            alert('Campaign exported successfully!');
        } catch (error) {
            this.eventLogger.log(`Failed to export campaign: ${error.message}`, 'error', true);
            alert('Failed to export campaign to ZIP');
        }
    }

    generateCampaignContentFile() {
        return `// ${this.currentCampaign.name || 'Campaign'} Content Definition
// This file contains all game content (agents, weapons, equipment, enemies, research, intel)
// Generated by Mission Editor

(function() {
    const ${this.currentCampaign.id || 'main'}CampaignContent = ${JSON.stringify(this.currentCampaign, null, 8).replace(/\n/g, '\n    ')};

    // Export for use by the game
    if (typeof window !== 'undefined') {
        window.MAIN_CAMPAIGN_CONTENT = ${this.currentCampaign.id || 'main'}CampaignContent;
    }

    // Export for Node.js if needed
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ${this.currentCampaign.id || 'main'}CampaignContent;
    }
})();`;
    }

    generateNPCsFile() {
        const campaignId = this.currentCampaign.id || 'main';
        return `// NPC Templates for ${this.currentCampaign.name || 'Campaign'}
// These are referenced by mission files
// Generated by Mission Editor

(function() {
    const npcTemplates = ${JSON.stringify(this.currentCampaign.npcs || {}, null, 8).replace(/\n/g, '\n    ')};

    // Export for use by missions
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_NPC_TEMPLATES = window.CAMPAIGN_NPC_TEMPLATES || {};
        window.CAMPAIGN_NPC_TEMPLATES['${campaignId}'] = npcTemplates;
    }
})();`;
    }

    async saveChanges() {
        const statusEl = document.getElementById('save-status');

        try {
            // Update campaign from form fields if they exist
            const idField = document.getElementById('campaign-id-edit');
            const nameField = document.getElementById('campaign-name-edit');
            const descField = document.getElementById('campaign-desc');

            if (idField) this.currentCampaign.id = idField.value;
            if (nameField) this.currentCampaign.name = nameField.value;
            if (descField) this.currentCampaign.description = descField.value;

            const creditsField = document.getElementById('start-credits');
            const researchField = document.getElementById('start-research');
            const controlField = document.getElementById('start-control');

            if (creditsField || researchField || controlField) {
                this.currentCampaign.startingResources = {
                    credits: parseInt(creditsField?.value || 10000),
                    researchPoints: parseInt(researchField?.value || 150),
                    worldControl: parseInt(controlField?.value || 15)
                };
            }

            // Update the current campaign ID if it changed
            this.currentCampaignId = this.currentCampaign.id;

            // Save to IndexedDB
            if (this.db) {
                await this.saveCampaignToDB(this.currentCampaign);

                // Update status
                if (statusEl) {
                    statusEl.textContent = `✅ Campaign "${this.currentCampaign.name}" saved to browser storage at ${new Date().toLocaleTimeString()}`;
                    statusEl.style.color = '#00ff41';
                }

                // Reload campaign selector to reflect any name/ID changes
                await this.loadCampaignSelector();
            } else {
                throw new Error('IndexedDB not available');
            }

            // Update global
            window.MAIN_CAMPAIGN_CONTENT = this.currentCampaign;

            // Save current campaign ID
            localStorage.setItem('lastCampaignId', this.currentCampaign.id);

            this.editor.eventLogger.log('Campaign saved', 'success', true);

            // Show alert only if no status element
            if (!statusEl) {
                alert('Campaign saved to browser storage!');
            }
        } catch (error) {
            this.editor.eventLogger.log(`Failed to save campaign: ${error.message}`, 'error', true);

            if (statusEl) {
                statusEl.textContent = `❌ Failed to save: ${error.message}`;
                statusEl.style.color = '#ff073a';
            } else {
                alert(`Failed to save campaign: ${error.message}`);
            }
        }
    }

    async loadCampaignSelector() {
        const selector = document.getElementById('campaign-selector');
        if (!selector || !this.db) return;

        const campaigns = await this.loadAllCampaigns();

        selector.innerHTML = '';

        if (campaigns.length === 0) {
            selector.innerHTML = '<option value="">No campaigns found</option>';
        } else {
            campaigns.forEach(campaign => {
                const option = document.createElement('option');
                option.value = campaign.id;
                const lastMod = campaign.lastModified ? new Date(campaign.lastModified).toLocaleDateString() : 'Unknown';
                option.textContent = `${campaign.name} (${campaign.id}) - ${lastMod}`;
                if (campaign.id === this.currentCampaignId) {
                    option.selected = true;
                }
                selector.appendChild(option);
            });
        }
    }

    async switchCampaign() {
        const selector = document.getElementById('campaign-selector');
        const campaignId = selector.value;

        if (!campaignId) {
            alert('Please select a campaign to load');
            return;
        }

        if (campaignId === this.currentCampaignId) {
            alert('This campaign is already loaded');
            return;
        }

        // Save current campaign before switching
        if (confirm('Save current campaign before switching?')) {
            await this.saveChanges();
        }

        // Load the selected campaign
        const campaign = await this.loadCampaignFromDB(campaignId);
        if (campaign) {
            this.currentCampaign = campaign;
            this.currentCampaignId = campaignId;

            // Update global
            window.MAIN_CAMPAIGN_CONTENT = this.currentCampaign;

            // Sync missions with CAMPAIGN_MISSIONS
            this.syncMissionsToGlobal();

            // Save as last used
            localStorage.setItem('lastCampaignId', campaignId);

            // Reload the UI
            this.loadTabContent('overview');

            // Refresh mission list
            this.refreshMissionList();

            alert(`Loaded campaign: ${campaign.name}`);
        } else {
            alert('Failed to load campaign');
        }
    }

    // Sync missions from currentCampaign to CAMPAIGN_MISSIONS global
    syncMissionsToGlobal() {
        if (!window.CAMPAIGN_MISSIONS) {
            window.CAMPAIGN_MISSIONS = {};
        }

        // Clear existing missions
        Object.keys(window.CAMPAIGN_MISSIONS).forEach(key => {
            delete window.CAMPAIGN_MISSIONS[key];
        });

        // Add all missions from current campaign
        if (this.currentCampaign && this.currentCampaign.missions) {
            this.currentCampaign.missions.forEach(mission => {
                window.CAMPAIGN_MISSIONS[mission.id] = mission;
            });
            this.editor.eventLogger.log(`Synced ${this.currentCampaign.missions.length} missions to CAMPAIGN_MISSIONS`, 'success');
        }
    }

    async deleteCurrentCampaign() {
        const selector = document.getElementById('campaign-selector');
        const campaignId = selector.value;

        if (!campaignId) {
            alert('Please select a campaign to delete');
            return;
        }

        const campaign = await this.loadCampaignFromDB(campaignId);
        if (!campaign) {
            alert('Campaign not found');
            return;
        }

        if (!confirm(`Delete campaign "${campaign.name}"?\nThis cannot be undone!`)) {
            return;
        }

        await this.deleteCampaignFromDB(campaignId);

        // If we deleted the current campaign, create a new one
        if (campaignId === this.currentCampaignId) {
            this.createNewCampaign();
        }

        // Reload the selector
        await this.loadCampaignSelector();

        alert(`Campaign "${campaign.name}" deleted`);
    }

    createNewCampaign() {
        if (confirm('Create a new campaign? Current unsaved changes will be lost.')) {
            this.currentCampaign = {
                id: 'new_campaign',
                name: 'New Campaign',
                description: 'A new campaign',
                startingResources: {
                    credits: 10000,
                    researchPoints: 150,
                    worldControl: 15
                },
                agents: [],
                weapons: [],
                equipment: [],
                enemyTypes: [],
                researchTree: {},
                intelReports: [],
                music: {}
            };
            window.CAMPAIGN_MISSIONS = {};
            this.loadTabContent('overview');
            alert('New campaign created!');
        }
    }

    duplicateCampaign() {
        const newId = prompt('Enter ID for duplicated campaign:', this.currentCampaign.id + '_copy');
        if (newId) {
            this.currentCampaign = JSON.parse(JSON.stringify(this.currentCampaign));
            this.currentCampaign.id = newId;
            this.currentCampaign.name = this.currentCampaign.name + ' (Copy)';
            this.loadTabContent('overview');
            alert('Campaign duplicated!');
        }
    }

    // RPG Configuration Methods
    addRPGClass() {
        const name = prompt('Enter class name:');
        if (name) {
            if (!this.currentCampaign.rpgConfig) {
                this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
            }
            if (!this.currentCampaign.rpgConfig.classes) {
                this.currentCampaign.rpgConfig.classes = {};
            }

            const classId = name.toLowerCase().replace(/\s+/g, '_');
            this.currentCampaign.rpgConfig.classes[classId] = {
                name: name,
                description: '',
                baseStats: {
                    strength: 10,
                    agility: 10,
                    intelligence: 10,
                    endurance: 10,
                    tech: 10,
                    charisma: 10
                },
                startingSkills: [],
                healthPerLevel: 10,
                apBonus: 0
            };

            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
            this.editor.eventLogger.log(`Added RPG class: ${name}`, 'success', true);
        }
    }

    addRPGSkill() {
        const name = prompt('Enter skill name:');
        if (name) {
            if (!this.currentCampaign.rpgConfig) {
                this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
            }
            if (!this.currentCampaign.rpgConfig.skills) {
                this.currentCampaign.rpgConfig.skills = {};
            }

            const skillId = name.toLowerCase().replace(/\s+/g, '_');
            this.currentCampaign.rpgConfig.skills[skillId] = {
                name: name,
                description: '',
                maxRank: 5,
                requirements: [],
                effects: []
            };

            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
            this.editor.eventLogger.log(`Added RPG skill: ${name}`, 'success', true);
        }
    }

    addRPGStat() {
        const name = prompt('Enter stat name:');
        if (name) {
            if (!this.currentCampaign.rpgConfig) {
                this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
            }
            if (!this.currentCampaign.rpgConfig.stats) {
                this.currentCampaign.rpgConfig.stats = { primary: [], secondary: [] };
            }
            if (!this.currentCampaign.rpgConfig.stats.primary) {
                this.currentCampaign.rpgConfig.stats.primary = [];
            }

            this.currentCampaign.rpgConfig.stats.primary.push(name.toLowerCase());

            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
            this.editor.eventLogger.log(`Added RPG stat: ${name}`, 'success', true);
        }
    }

    addRPGArmor() {
        const name = prompt('Enter armor name:');
        if (name) {
            if (!this.currentCampaign.rpgConfig) {
                this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
            }
            if (!this.currentCampaign.rpgConfig.items) {
                this.currentCampaign.rpgConfig.items = { weapons: {}, armor: {}, consumables: {} };
            }
            if (!this.currentCampaign.rpgConfig.items.armor) {
                this.currentCampaign.rpgConfig.items.armor = {};
            }

            const armorId = name.toLowerCase().replace(/\s+/g, '_');
            this.currentCampaign.rpgConfig.items.armor[armorId] = {
                name: name,
                description: '',
                slot: 'armor',
                defense: 5,
                weight: 10,
                value: 1000,
                requirements: {}
            };

            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
            this.editor.eventLogger.log(`Added armor: ${name}`, 'success', true);
        }
    }

    addRPGConsumable() {
        const name = prompt('Enter consumable name:');
        if (name) {
            if (!this.currentCampaign.rpgConfig) {
                this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
            }
            if (!this.currentCampaign.rpgConfig.items) {
                this.currentCampaign.rpgConfig.items = { weapons: {}, armor: {}, consumables: {} };
            }
            if (!this.currentCampaign.rpgConfig.items.consumables) {
                this.currentCampaign.rpgConfig.items.consumables = {};
            }

            const itemId = name.toLowerCase().replace(/\s+/g, '_');
            this.currentCampaign.rpgConfig.items.consumables[itemId] = {
                name: name,
                description: '',
                uses: 1,
                effect: 'heal',
                value: 50,
                weight: 1
            };

            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
            this.editor.eventLogger.log(`Added consumable: ${name}`, 'success', true);
        }
    }

    loadRPGTab() {
        if (!this.currentCampaign.rpgConfig) {
            this.currentCampaign.rpgConfig = { classes: {}, skills: {}, stats: {}, items: {} };
        }

        // Load classes
        const classesList = document.getElementById('classes-list');
        if (classesList) {
            classesList.innerHTML = '';
            if (this.currentCampaign.rpgConfig.classes) {
                for (const [id, cls] of Object.entries(this.currentCampaign.rpgConfig.classes)) {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 10px; margin: 5px 0; background: #1a1a2e; border: 1px solid #00ff41; border-radius: 4px;';
                    div.innerHTML = `
                        <strong>${cls.name}</strong>
                        <button onclick="campaignManager.deleteRPGClass('${id}')" style="float: right; background: #ff073a; color: white; border: none; padding: 2px 8px; cursor: pointer;">Delete</button>
                        <div style="font-size: 0.9em; color: #00ffff; margin-top: 5px;">
                            HP/Level: ${cls.healthPerLevel || 10}, AP Bonus: ${cls.apBonus || 0}
                        </div>
                    `;
                    classesList.appendChild(div);
                }
            }
        }

        // Load skills
        const skillsList = document.getElementById('skills-list');
        if (skillsList) {
            skillsList.innerHTML = '';
            if (this.currentCampaign.rpgConfig.skills) {
                for (const [id, skill] of Object.entries(this.currentCampaign.rpgConfig.skills)) {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 10px; margin: 5px 0; background: #1a1a2e; border: 1px solid #00ff41; border-radius: 4px;';
                    div.innerHTML = `
                        <strong>${skill.name}</strong>
                        <button onclick="campaignManager.deleteRPGSkill('${id}')" style="float: right; background: #ff073a; color: white; border: none; padding: 2px 8px; cursor: pointer;">Delete</button>
                        <div style="font-size: 0.9em; color: #00ffff; margin-top: 5px;">
                            Max Rank: ${skill.maxRank || 5}
                        </div>
                    `;
                    skillsList.appendChild(div);
                }
            }
        }

        // Load stats
        const statsList = document.getElementById('stats-list');
        if (statsList) {
            statsList.innerHTML = '';
            if (this.currentCampaign.rpgConfig.stats && this.currentCampaign.rpgConfig.stats.primary) {
                this.currentCampaign.rpgConfig.stats.primary.forEach((stat, index) => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 10px; margin: 5px 0; background: #1a1a2e; border: 1px solid #00ff41; border-radius: 4px;';
                    div.innerHTML = `
                        <strong>${stat}</strong>
                        <button onclick="campaignManager.deleteRPGStat(${index})" style="float: right; background: #ff073a; color: white; border: none; padding: 2px 8px; cursor: pointer;">Delete</button>
                    `;
                    statsList.appendChild(div);
                });
            }
        }
    }

    deleteRPGClass(id) {
        if (confirm(`Delete class ${id}?`)) {
            delete this.currentCampaign.rpgConfig.classes[id];
            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
        }
    }

    deleteRPGSkill(id) {
        if (confirm(`Delete skill ${id}?`)) {
            delete this.currentCampaign.rpgConfig.skills[id];
            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
        }
    }

    deleteRPGStat(index) {
        if (confirm(`Delete stat?`)) {
            this.currentCampaign.rpgConfig.stats.primary.splice(index, 1);
            this.loadRPGTab();
            this.saveCampaignToDB(this.currentCampaign);
        }
    }

    // Formula Methods
    updateFormula(key, value) {
        if (!this.currentCampaign.formulas) {
            this.currentCampaign.formulas = {};
        }
        this.currentCampaign.formulas[key] = value;
        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log(`Updated formula: ${key}`, 'info');
    }

    updateTurnBased(key, value) {
        if (!this.currentCampaign.turnBasedConfig) {
            this.currentCampaign.turnBasedConfig = {};
        }
        this.currentCampaign.turnBasedConfig[key] = value;
        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log(`Updated turn-based setting: ${key}`, 'info');
    }

    updateTheme(category, key, value) {
        if (!this.currentCampaign.themeConfig) {
            this.currentCampaign.themeConfig = { colors: {}, strings: {}, constants: {} };
        }
        if (!this.currentCampaign.themeConfig[category]) {
            this.currentCampaign.themeConfig[category] = {};
        }
        this.currentCampaign.themeConfig[category][key] = value;
        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log(`Updated theme ${category}: ${key}`, 'info');
    }

    updateInventoryConfig(path, value) {
        if (!this.currentCampaign.inventoryConfig) {
            this.currentCampaign.inventoryConfig = {
                carryWeight: 100,
                weightPenalty: 50,
                maxSlots: 30,
                stackSize: 99,
                startingInventory: {
                    credits: 1000,
                    ammoPrimary: 120,
                    ammoSecondary: 60,
                    medkits: 3
                }
            };
        }

        // Handle nested path (e.g., 'startingInventory.credits')
        const keys = path.split('.');
        let obj = this.currentCampaign.inventoryConfig;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) {
                obj[keys[i]] = {};
            }
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;

        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log(`Updated inventory config: ${path}`, 'info');
    }

    saveInventoryConfig() {
        this.saveCampaignToDB(this.currentCampaign);
        this.editor.eventLogger.log('Inventory configuration saved', 'success', true);
    }
}

// Initialize editor and campaign manager when page loads
let editor;
let campaignManager;
window.addEventListener('DOMContentLoaded', async () => {
    // Initialize global CAMPAIGN_MISSIONS if not already
    window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};

    // Wait for campaign missions to load from files first
    // Initialize the editor FIRST
    editor = new MissionEditor();

    // Then load campaign index
    if (typeof loadCampaignIndex === 'function') {
        try {
            await loadCampaignIndex();
            editor.eventLogger.log('Campaign missions loaded from files', 'success');
        } catch (e) {
            editor.eventLogger.log('Could not load campaign missions from files', 'warning');
        }
    }

    // Initialize campaign manager (which will load from IndexedDB if available)
    window.campaignManager = new CampaignManager(editor);
    campaignManager = window.campaignManager;  // Keep local reference for compatibility

    // Wait for campaign manager to initialize and load from IndexedDB
    setTimeout(async () => {
        // If campaign manager loaded missions from IndexedDB, they should override file missions
        if (campaignManager && campaignManager.isInitialized) {
            campaignManager.refreshMissionList();
            editor.eventLogger.log('Mission list refreshed after campaign manager initialization', 'success');

            // Also reload the campaigns dropdown in the editor
            await editor.loadCampaigns();
            editor.eventLogger.log('Editor mission dropdown refreshed', 'success');
        }

        // Check if missions loaded
        editor.eventLogger.log(`Campaign missions loaded: ${Object.keys(window.CAMPAIGN_MISSIONS || {}).length} missions`, 'info');
    }, 500); // Increased timeout to ensure everything is loaded
});