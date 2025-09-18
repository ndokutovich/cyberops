// CyberOps Mission Editor
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

        this.init();
    }

    async init() {
        this.initMap();
        this.setupEventListeners();
        this.render();
        this.updatePropertiesPanel();

        // Load campaigns and populate dropdown
        await this.loadCampaigns();

        // Load campaign content (enemy types, etc.)
        await this.loadCampaignContent();
    }

    async loadCampaignContent() {
        try {
            // Load campaign content file to get enemy types
            const script = document.createElement('script');
            script.src = 'campaigns/main/campaign-content.js';
            await new Promise((resolve) => {
                script.onload = resolve;
                script.onerror = () => {
                    console.warn('Could not load campaign content, using defaults');
                    resolve();
                };
                document.head.appendChild(script);
            });

            // Store enemy types if loaded
            if (window.MAIN_CAMPAIGN_CONTENT && window.MAIN_CAMPAIGN_CONTENT.enemyTypes) {
                this.enemyTypes = window.MAIN_CAMPAIGN_CONTENT.enemyTypes;
                console.log(`✅ Loaded ${this.enemyTypes.length} enemy types from campaign`);
            } else {
                // Fallback to defaults
                this.enemyTypes = [
                    { type: 'guard', health: 50, speed: 2, damage: 10, visionRange: 5, color: '#ff6666' },
                    { type: 'soldier', health: 75, speed: 2.5, damage: 15, visionRange: 6, color: '#ff8888' },
                    { type: 'elite', health: 100, speed: 3, damage: 20, visionRange: 7, color: '#ffaaaa' },
                    { type: 'heavy', health: 150, speed: 1.5, damage: 25, visionRange: 4, color: '#ff4444' }
                ];
            }
        } catch (e) {
            console.error('Failed to load campaign content:', e);
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
            dropdown.innerHTML = '<option value="">Load Campaign Mission...</option>';

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
            console.error('Failed to load campaigns:', error);
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
        document.getElementById('new-mission').addEventListener('click', () => this.newMission());
        document.getElementById('load-mission').addEventListener('click', () => this.loadMission());
        document.getElementById('save-mission').addEventListener('click', () => this.saveMission());
        document.getElementById('export-mission').addEventListener('click', () => this.exportMission());
        document.getElementById('import-mission').addEventListener('click', () => this.importMission());
        document.getElementById('test-mission').addEventListener('click', () => this.testMission());
        document.getElementById('validate-mission').addEventListener('click', () => this.validateMission());
        document.getElementById('campaign-config').addEventListener('click', () => this.showCampaignConfig());

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
        document.getElementById('show-grid').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });

        document.getElementById('snap-to-grid').addEventListener('change', (e) => {
            this.snapToGrid = e.target.checked;
        });

        document.getElementById('zoom-level').addEventListener('input', (e) => {
            this.zoom = parseFloat(e.target.value);
            this.canvas.width = this.mission.width * this.tileSize * this.zoom;
            this.canvas.height = this.mission.height * this.tileSize * this.zoom;
            this.render();
        });

        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
        });

        // Mission properties
        document.getElementById('mission-name').addEventListener('change', (e) => {
            this.mission.name = e.target.value;
        });

        document.getElementById('mission-desc').addEventListener('change', (e) => {
            this.mission.description = e.target.value;
        });

        document.getElementById('map-type').addEventListener('change', (e) => {
            this.mission.mapType = e.target.value;
        });

        document.getElementById('map-width').addEventListener('change', (e) => {
            this.resizeMap(parseInt(e.target.value), this.mission.height);
        });

        document.getElementById('map-height').addEventListener('change', (e) => {
            this.resizeMap(this.mission.width, parseInt(e.target.value));
        });

        // Quick actions
        document.getElementById('generate-room').addEventListener('click', () => this.generateRoom());
        document.getElementById('generate-corridor').addEventListener('click', () => this.generateCorridor());
        document.getElementById('clear-map').addEventListener('click', () => this.clearMap());
        document.getElementById('auto-walls').addEventListener('click', () => this.autoWalls());

        // Objectives
        document.getElementById('add-objective').addEventListener('click', () => this.showObjectiveDialog());

        // NPCs
        document.getElementById('add-npc').addEventListener('click', () => this.showNPCDialog());

        // Events
        document.getElementById('add-event').addEventListener('click', () => this.addEvent());

        // Dialog buttons
        document.getElementById('save-objective').addEventListener('click', () => this.saveObjective());
        document.getElementById('cancel-objective').addEventListener('click', () => this.hideObjectiveDialog());
        document.getElementById('save-npc').addEventListener('click', () => this.saveNPC());
        document.getElementById('cancel-npc').addEventListener('click', () => this.hideNPCDialog());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));

        // File input
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileLoad(e));

        // Load game mission dropdown
        document.getElementById('load-game-mission').addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadGameMission(e.target.value);
                e.target.value = ''; // Reset dropdown
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
            } else {
                // Place entity
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

        if (this.isDrawing) {
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
        } else {
            this.selectedEntity = null;
            this.hideEntityProperties();
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
        html += `<label>Position: X: ${entity.x}, Y: ${entity.y}</label>`;

        switch (entity.type) {
            case 'enemy':
                // Build dropdown from campaign enemy types
                const enemyOptions = this.enemyTypes ?
                    this.enemyTypes.map(enemy =>
                        `<option value="${enemy.type}" ${entity.enemyType === enemy.type ? 'selected' : ''}>${enemy.type.charAt(0).toUpperCase() + enemy.type.slice(1)}</option>`
                    ).join('') :
                    `<option value="guard" ${entity.enemyType === 'guard' ? 'selected' : ''}>Guard</option>
                    <option value="soldier" ${entity.enemyType === 'soldier' ? 'selected' : ''}>Soldier</option>
                    <option value="elite" ${entity.enemyType === 'elite' ? 'selected' : ''}>Elite</option>
                    <option value="boss" ${entity.enemyType === 'boss' ? 'selected' : ''}>Boss</option>`;

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
                        <input type="text" id="entity-npc-name" value="${entity.name || 'NPC'}">
                    </label>
                    <button class="action-btn" onclick="editor.editNPCDialog(${entity.id})">Edit Dialog</button>
                    <button class="action-btn" onclick="editor.editNPCQuests(${entity.id})">Edit Quests</button>
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
            <button class="action-btn" onclick="editor.updateEntity(${entity.id})">Update</button>
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

        switch (entity.type) {
            case 'enemy':
                entity.enemyType = document.getElementById('entity-enemy-type').value;
                entity.alertLevel = parseInt(document.getElementById('entity-alert').value);
                break;
            case 'npc':
                entity.name = document.getElementById('entity-npc-name').value;
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
            div.innerHTML = `
                <span>${npc.name} at (${npc.x}, ${npc.y})</span>
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

        if (index >= 0) {
            const npc = this.mission.npcs[index];
            document.getElementById('npc-name').value = npc.name;
            document.getElementById('npc-type').value = npc.type || 'civilian';
            document.getElementById('npc-x').value = npc.x;
            document.getElementById('npc-y').value = npc.y;
            document.getElementById('npc-dialog').value = JSON.stringify(npc.dialog || [], null, 2);
            document.getElementById('npc-quests-data').value = JSON.stringify(npc.quests || [], null, 2);
        } else {
            document.getElementById('npc-name').value = 'New NPC';
            document.getElementById('npc-type').value = 'civilian';
            document.getElementById('npc-x').value = 40;
            document.getElementById('npc-y').value = 40;
            document.getElementById('npc-dialog').value = '[]';
            document.getElementById('npc-quests-data').value = '[]';
        }

        this.editingNPCIndex = index;
    }

    hideNPCDialog() {
        document.getElementById('npc-dialog').style.display = 'none';
    }

    saveNPC() {
        try {
            const npc = {
                name: document.getElementById('npc-name').value,
                type: document.getElementById('npc-type').value,
                x: parseInt(document.getElementById('npc-x').value),
                y: parseInt(document.getElementById('npc-y').value),
                dialog: JSON.parse(document.getElementById('npc-dialog').value),
                quests: JSON.parse(document.getElementById('npc-quests-data').value)
            };

            if (this.editingNPCIndex >= 0) {
                this.mission.npcs[this.editingNPCIndex] = npc;
            } else {
                this.mission.npcs.push(npc);
                // Also add to entities
                this.mission.entities.push({
                    type: 'npc',
                    x: npc.x,
                    y: npc.y,
                    id: Date.now(),
                    name: npc.name
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

    removeNPC(index) {
        this.mission.npcs.splice(index, 1);
        this.updatePropertiesPanel();
        this.saveToHistory();
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
        const name = this.mission.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        localStorage.setItem(`mission_${name}`, JSON.stringify(this.mission));
        alert(`Mission "${this.mission.name}" saved to browser storage!`);
    }

    loadMission() {
        const saved = Object.keys(localStorage)
            .filter(k => k.startsWith('mission_'))
            .map(k => k.replace('mission_', ''));

        if (saved.length === 0) {
            alert('No saved missions found.');
            return;
        }

        const name = prompt(`Available missions:\n${saved.join('\n')}\n\nEnter mission name:`);
        if (!name) return;

        const data = localStorage.getItem(`mission_${name}`);
        if (data) {
            this.mission = JSON.parse(data);
            this.canvas.width = this.mission.width * this.tileSize * this.zoom;
            this.canvas.height = this.mission.height * this.tileSize * this.zoom;
            this.render();
            this.updatePropertiesPanel();
            this.saveToHistory();
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

    generateEmbeddedMapData(mapData) {
        // Convert full tile array to embedded format with spawn and extraction points
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
        const timestamp = new Date().toISOString();
        const campaignId = document.getElementById('campaign-id').value || 'main';
        const actNumber = document.getElementById('act-number').value || '01';
        const missionNumber = document.getElementById('mission-number').value || '001';
        const actName = document.getElementById('act-name').value || 'Act 1';
        const maxAgents = parseInt(document.getElementById('max-agents').value) || 4;
        const requiredAgents = parseInt(document.getElementById('required-agents').value) || 2;
        const recommendedAgents = parseInt(document.getElementById('recommended-agents').value) || 3;

        // Create filename with campaign-act-mission format
        const filename = `${campaignId}-${actNumber}-${missionNumber}`;

        // Generate the embedded map data from tiles
        const embeddedMap = this.generateEmbeddedMapData(gameData.mapData);

        // Create the modular mission file content matching campaign system format
        let jsContent = `// Campaign: ${campaignId}
// Act: ${parseInt(actNumber)} - ${actName}
// Mission: ${missionNumber} - ${this.mission.name}
// Generated: ${timestamp}
// This file should be saved as: campaigns/${campaignId}/act${parseInt(actNumber)}/${filename}.js

(function() {
    // Register mission with campaign system
    if (typeof REGISTER_MISSION !== 'undefined') {
        REGISTER_MISSION({
            id: '${filename}',
            campaign: '${campaignId}',
            act: ${parseInt(actNumber)},
            actName: '${actName}',
            missionNumber: ${parseInt(missionNumber)},
            name: '${this.mission.name}',
            description: '${this.mission.description || ''}',
            briefing: \`${this.mission.description || 'Complete all objectives'}\`,

            // Map configuration with embedded data
            mapConfig: {
                type: '${this.mission.mapType}',
                width: ${gameData.mapData.width},
                height: ${gameData.mapData.height},
                embedded: ${JSON.stringify(embeddedMap, null, 8)}
            },

            // Mission objectives
            objectives: ${JSON.stringify(this.mission.objectives || [], null, 8)},

            // Enemy spawns
            enemies: ${JSON.stringify(gameData.mapData.enemies || [], null, 8)},

            // NPCs with dialog and quests
            npcs: ${JSON.stringify(gameData.mapData.npcs || [], null, 8)},

            // Interactive objects
            interactables: {
                terminals: ${JSON.stringify(gameData.mapData.terminals || [], null, 12)},
                explosives: ${JSON.stringify(gameData.mapData.explosives || [], null, 12)},
                switches: ${JSON.stringify(gameData.mapData.switches || [], null, 12)},
                gates: ${JSON.stringify(gameData.mapData.gates || [], null, 12)}
            },

            // Agent configuration
            agentConfig: {
                maxAgents: ${maxAgents},
                requiredAgents: ${requiredAgents},
                recommendedAgents: ${recommendedAgents}
            },

            // Rewards
            rewards: {
                credits: ${this.mission.credits || 5000},
                researchPoints: ${this.mission.researchPoints || 2}
            },

            // Mission settings
            settings: {
                timeLimit: ${this.mission.timeLimit || 0},
                difficulty: ${this.mission.difficulty || 2}
            }
        });
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
        console.log(instructions);
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
        const gameWindow = window.open('cyberops-game.html?test_mission=true', '_blank');

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

        console.log('Loading campaign mission:', missionDef.name);

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

        // Add NPCs from embedded mission data
        if (missionDef.npcs) {
            missionDef.npcs.forEach((npc, index) => {
                // Handle multiple position formats: spawn, position, or x/y directly
                const npcX = npc.spawn ? npc.spawn.x : (npc.position ? npc.position.x : npc.x);
                const npcY = npc.spawn ? npc.spawn.y : (npc.position ? npc.position.y : npc.y);

                if (npcX !== undefined && npcY !== undefined) {
                    this.mission.npcs.push({
                        name: npc.name,
                        type: npc.type || 'civilian',
                        x: npcX,
                        y: npcY,
                        dialog: npc.dialog || [],
                        quests: npc.quests || []
                    });

                    // Also add as entity
                    this.mission.entities.push({
                        type: 'npc',
                        x: npcX,
                        y: npcY,
                        name: npc.name,
                        id: Date.now() + 600 + index
                    });
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

        console.log(`✅ Loaded mission: ${missionDef.name}`);
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
            console.log('Loading embedded tiles...');

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
                console.log('Loaded string-based embedded tiles');
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
            console.error('No generation rules or embedded tiles in map definition');
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

        console.log('Generated map from embedded definition:', mapDef.width + 'x' + mapDef.height);
    }

    showCampaignConfig() {
        const dialog = document.getElementById('campaign-dialog');
        dialog.style.display = 'block';

        // Populate campaign overview
        const overview = document.getElementById('campaign-overview');
        const structure = document.getElementById('campaign-structure');

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
        document.getElementById('campaign-close').onclick = () => {
            dialog.style.display = 'none';
        };

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

    console.log('Loaded mission: ${missionKey}');
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

            console.log('Campaign exported as ZIP:', campaignName);
            alert(`Campaign exported successfully!\\n\\nExtract to game folder to install.`);

        } catch (error) {
            console.error('Failed to export campaign:', error);
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

        console.log('Campaign exported as JSON:', campaignData.name);
    }
}

// Initialize editor when page loads
let editor;
window.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for campaign missions to load
    setTimeout(() => {
        // Initialize global CAMPAIGN_MISSIONS if not already
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};

        editor = new MissionEditor();

        // Check if missions loaded
        console.log('Campaign missions loaded:', Object.keys(window.CAMPAIGN_MISSIONS || {}));
    }, 100);
});