/**
 * MapService - Centralized map management
 * Handles map loading, tile queries, visibility/fog of war, collision detection
 */

class MapService {
    constructor() {
        // Map data
        this.mapData = null;
        this.width = 0;
        this.height = 0;
        this.tiles = [];
        this.spawn = null;
        this.extraction = null;
        this.terminals = [];
        this.doors = [];
        this.explosives = [];
        this.switches = [];
        this.gates = [];
        this.collectibles = [];
        this.waypoints = [];

        // Fog of war
        this.fogOfWar = null;
        this.fogEnabled = true;
        this.visibilityRadius = 8;

        // Tile types
        this.TILE_FLOOR = 0;
        this.TILE_WALL = 1;
        this.TILE_DOOR = 2;
        this.TILE_TERMINAL = 3;
        this.TILE_EXTRACTION = 4;

        // Event listeners
        this.listeners = new Map();

        // Bind methods
        this.loadMap = this.loadMap.bind(this);
        this.getTileAt = this.getTileAt.bind(this);
        this.setTileAt = this.setTileAt.bind(this);
        this.isWalkable = this.isWalkable.bind(this);
        this.canMoveTo = this.canMoveTo.bind(this);

        console.log('🗺️ MapService initialized');
    }

    /**
     * Load map from mission data
     */
    loadMap(mapData) {
        if (!mapData) {
            console.error('No map data provided');
            return false;
        }

        this.mapData = mapData;

        // Extract dimensions and tiles
        if (mapData.embedded && mapData.embedded.tiles) {
            // Embedded string-based map format
            const stringTiles = mapData.embedded.tiles;
            this.height = stringTiles.length;
            this.width = stringTiles[0] ? stringTiles[0].length : 0;

            // Convert string tiles to 2D array
            this.tiles = [];
            for (let y = 0; y < this.height; y++) {
                this.tiles[y] = [];
                const row = stringTiles[y];
                for (let x = 0; x < this.width; x++) {
                    const char = row[x] || '#';
                    // Convert characters to tile types
                    this.tiles[y][x] = this.charToTile(char);
                }
            }

            // Load other embedded data
            this.spawn = mapData.embedded.spawn || { x: 2, y: 2 };
            this.extraction = mapData.embedded.extraction || { x: this.width - 3, y: this.height - 3 };
            this.terminals = mapData.embedded.terminals || [];
            this.doors = mapData.embedded.doors || [];
            this.explosives = mapData.embedded.explosives || [];
            this.switches = mapData.embedded.switches || [];
            this.gates = mapData.embedded.gates || [];
            this.collectibles = mapData.embedded.collectibles || [];
            this.waypoints = mapData.embedded.waypoints || [];
        } else if (mapData.tiles) {
            // Direct 2D array format (legacy)
            this.tiles = mapData.tiles;
            this.height = this.tiles.length;
            this.width = this.tiles[0] ? this.tiles[0].length : 0;

            this.spawn = mapData.spawn || { x: 2, y: 2 };
            this.extraction = mapData.extraction || { x: this.width - 3, y: this.height - 3 };
            this.terminals = mapData.terminals || [];
            this.doors = mapData.doors || [];
            this.explosives = mapData.explosives || [];
            this.switches = mapData.switches || [];
            this.gates = mapData.gates || [];
            this.collectibles = mapData.collectibles || [];
            this.waypoints = mapData.waypoints || [];
        } else {
            console.error('Invalid map data format');
            return false;
        }

        // Initialize fog of war
        this.initializeFogOfWar();

        // Emit map loaded event
        this.emit('mapLoaded', {
            width: this.width,
            height: this.height,
            spawn: this.spawn,
            extraction: this.extraction
        });

        console.log(`🗺️ Map loaded: ${this.width}x${this.height}`);
        return true;
    }

    /**
     * Convert character to tile type
     */
    charToTile(char) {
        switch(char) {
            case '.': return this.TILE_FLOOR;
            case '#': return this.TILE_WALL;
            case 'D': return this.TILE_DOOR;
            case 'T': return this.TILE_TERMINAL;
            case 'E': return this.TILE_EXTRACTION;
            case ' ': return this.TILE_FLOOR;
            default: return this.TILE_WALL;
        }
    }

    /**
     * Convert tile type to character
     */
    tileToChar(tile) {
        switch(tile) {
            case this.TILE_FLOOR: return '.';
            case this.TILE_WALL: return '#';
            case this.TILE_DOOR: return 'D';
            case this.TILE_TERMINAL: return 'T';
            case this.TILE_EXTRACTION: return 'E';
            default: return '#';
        }
    }

    /**
     * Get tile at position
     */
    getTileAt(x, y) {
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return this.TILE_WALL; // Out of bounds is wall
        }

        if (!this.tiles[tileY] || this.tiles[tileY][tileX] === undefined) {
            return this.TILE_WALL;
        }

        return this.tiles[tileY][tileX];
    }

    /**
     * Set tile at position
     */
    setTileAt(x, y, tileType) {
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return false;
        }

        if (!this.tiles[tileY]) {
            this.tiles[tileY] = [];
        }

        const oldTile = this.tiles[tileY][tileX];
        this.tiles[tileY][tileX] = tileType;

        this.emit('tileChanged', {
            x: tileX,
            y: tileY,
            oldType: oldTile,
            newType: tileType
        });

        return true;
    }

    /**
     * Check if position is walkable
     */
    isWalkable(x, y) {
        // Check map bounds
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Safety check for array access
        if (!this.tiles[tileY] || this.tiles[tileY][tileX] === undefined) {
            return false;
        }

        // Check if this is an unlocked door position
        if (this.doors) {
            for (let door of this.doors) {
                // Check if we're at a door position (with some tolerance for floating point)
                const atDoor = Math.abs(door.x - tileX) < 1 && Math.abs(door.y - tileY) < 1;
                if (atDoor && !door.locked) {
                    // Unlocked door - allow passage
                    return true;
                }
            }
        }

        // Check tile type
        return this.tiles[tileY][tileX] === this.TILE_FLOOR;
    }

    /**
     * Check if movement from one position to another is possible
     */
    canMoveTo(fromX, fromY, toX, toY) {
        // Check if target position is walkable
        if (!this.isWalkable(toX, toY)) {
            return false;
        }

        // Check if blocked by a locked door
        if (this.isDoorBlocking(toX, toY)) {
            return false;
        }

        // Check corners for diagonal movement to prevent clipping through walls
        const dx = toX - fromX;
        const dy = toY - fromY;

        // If moving diagonally, check both adjacent tiles
        if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
            // Check horizontal then vertical path
            if (!this.isWalkable(toX, fromY) || !this.isWalkable(fromX, toY)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if position is blocked by a locked door
     */
    isDoorBlocking(x, y) {
        if (!this.doors) return false;

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        for (let door of this.doors) {
            const atDoor = Math.abs(door.x - tileX) < 1 && Math.abs(door.y - tileY) < 1;
            if (atDoor && door.locked) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get door at position
     */
    getDoorAt(x, y) {
        if (!this.doors) return null;

        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        for (let door of this.doors) {
            if (Math.abs(door.x - tileX) < 0.5 && Math.abs(door.y - tileY) < 0.5) {
                return door;
            }
        }

        return null;
    }

    /**
     * Unlock door at position or by terminal ID
     */
    unlockDoor(x, y, terminalId = null) {
        if (terminalId) {
            // Unlock doors linked to terminal
            let unlockedCount = 0;
            for (let door of this.doors) {
                if (door.linkedTerminal === terminalId && door.locked) {
                    door.locked = false;
                    unlockedCount++;

                    this.emit('doorUnlocked', {
                        door: door,
                        terminalId: terminalId
                    });
                }
            }
            return unlockedCount > 0;
        } else {
            // Unlock door at position
            const door = this.getDoorAt(x, y);
            if (door && door.locked) {
                door.locked = false;

                this.emit('doorUnlocked', {
                    door: door,
                    position: { x, y }
                });

                return true;
            }
        }

        return false;
    }

    /**
     * Initialize fog of war
     */
    initializeFogOfWar() {
        this.fogOfWar = [];
        for (let y = 0; y < this.height; y++) {
            this.fogOfWar[y] = [];
            for (let x = 0; x < this.width; x++) {
                // 0 = unexplored, 1 = explored but not visible, 2 = visible
                this.fogOfWar[y][x] = 0;
            }
        }
    }

    /**
     * Update fog of war visibility
     */
    updateFogOfWar(viewerPositions) {
        if (!this.fogEnabled || !this.fogOfWar) return;

        // First pass: Mark all visible tiles as explored
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.fogOfWar[y][x] === 2) {
                    this.fogOfWar[y][x] = 1; // Was visible, now explored
                }
            }
        }

        // Second pass: Mark currently visible tiles
        for (const pos of viewerPositions) {
            this.updateVisibilityFrom(pos.x, pos.y, pos.visionRange || this.visibilityRadius);
        }
    }

    /**
     * Update visibility from a position
     */
    updateVisibilityFrom(viewerX, viewerY, visionRange) {
        const startX = Math.max(0, Math.floor(viewerX - visionRange));
        const endX = Math.min(this.width - 1, Math.ceil(viewerX + visionRange));
        const startY = Math.max(0, Math.floor(viewerY - visionRange));
        const endY = Math.min(this.height - 1, Math.ceil(viewerY + visionRange));

        for (let y = startY; y <= endY; y++) {
            for (let x = startX; x <= endX; x++) {
                const distance = Math.sqrt(
                    Math.pow(x - viewerX, 2) +
                    Math.pow(y - viewerY, 2)
                );

                if (distance <= visionRange) {
                    // Check line of sight
                    if (this.hasLineOfSight(viewerX, viewerY, x, y)) {
                        this.fogOfWar[y][x] = 2; // Fully visible
                    }
                }
            }
        }
    }

    /**
     * Check line of sight between two positions
     */
    hasLineOfSight(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let x = Math.floor(x1);
        let y = Math.floor(y1);
        const endX = Math.floor(x2);
        const endY = Math.floor(y2);

        while (true) {
            // Check if current position blocks sight (is a wall)
            if (x !== endX || y !== endY) {
                if (!this.isWalkable(x, y)) {
                    return false;
                }
            }

            if (x === endX && y === endY) {
                break;
            }

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return true;
    }

    /**
     * Get fog state at position
     */
    getFogAt(x, y) {
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        if (!this.fogOfWar || !this.fogEnabled) {
            return 2; // Fully visible if fog disabled
        }

        if (tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.height) {
            return 0; // Unexplored if out of bounds
        }

        return this.fogOfWar[tileY][tileX];
    }

    /**
     * Check if position is visible
     */
    isVisible(x, y) {
        return this.getFogAt(x, y) === 2;
    }

    /**
     * Check if position has been explored
     */
    isExplored(x, y) {
        return this.getFogAt(x, y) >= 1;
    }

    /**
     * Set fog enabled state
     */
    setFogEnabled(enabled) {
        this.fogEnabled = enabled;

        if (!enabled && this.fogOfWar) {
            // Make everything visible when fog disabled
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    this.fogOfWar[y][x] = 2;
                }
            }
        } else if (enabled) {
            // Reset fog when enabled
            this.initializeFogOfWar();
        }

        this.emit('fogStateChanged', { enabled });
    }

    /**
     * Get terminal at position
     */
    getTerminalAt(x, y) {
        if (!this.terminals) return null;

        for (let terminal of this.terminals) {
            const distance = Math.sqrt(
                Math.pow(terminal.x - x, 2) +
                Math.pow(terminal.y - y, 2)
            );
            if (distance < 2) { // Within interaction range
                return terminal;
            }
        }

        return null;
    }

    /**
     * Get collectible at position
     */
    getCollectibleAt(x, y) {
        if (!this.collectibles) return null;

        for (let i = 0; i < this.collectibles.length; i++) {
            const item = this.collectibles[i];
            const distance = Math.sqrt(
                Math.pow(item.x - x, 2) +
                Math.pow(item.y - y, 2)
            );
            if (distance < 1) { // Pickup range
                return { item, index: i };
            }
        }

        return null;
    }

    /**
     * Remove collectible at index
     */
    removeCollectible(index) {
        if (this.collectibles && index >= 0 && index < this.collectibles.length) {
            const removed = this.collectibles.splice(index, 1)[0];
            this.emit('collectibleRemoved', { item: removed, index });
            return removed;
        }
        return null;
    }

    /**
     * Find nearest walkable position
     */
    findNearestWalkable(x, y, maxDistance = 5) {
        // Start from the position and spiral outward
        for (let radius = 1; radius <= maxDistance; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    // Only check positions at current radius
                    if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
                        const checkX = Math.floor(x + dx);
                        const checkY = Math.floor(y + dy);

                        if (this.isWalkable(checkX, checkY)) {
                            return { x: checkX, y: checkY };
                        }
                    }
                }
            }
        }

        return null; // No walkable position found
    }

    /**
     * Get all entities at position (terminals, doors, etc.)
     */
    getEntitiesAt(x, y, radius = 2) {
        const entities = [];

        // Check terminals
        if (this.terminals) {
            for (let terminal of this.terminals) {
                const distance = Math.sqrt(
                    Math.pow(terminal.x - x, 2) +
                    Math.pow(terminal.y - y, 2)
                );
                if (distance <= radius) {
                    entities.push({ type: 'terminal', data: terminal });
                }
            }
        }

        // Check doors
        if (this.doors) {
            for (let door of this.doors) {
                const distance = Math.sqrt(
                    Math.pow(door.x - x, 2) +
                    Math.pow(door.y - y, 2)
                );
                if (distance <= radius) {
                    entities.push({ type: 'door', data: door });
                }
            }
        }

        // Check explosives
        if (this.explosives) {
            for (let explosive of this.explosives) {
                const distance = Math.sqrt(
                    Math.pow(explosive.x - x, 2) +
                    Math.pow(explosive.y - y, 2)
                );
                if (distance <= radius) {
                    entities.push({ type: 'explosive', data: explosive });
                }
            }
        }

        // Check switches
        if (this.switches) {
            for (let switchObj of this.switches) {
                const distance = Math.sqrt(
                    Math.pow(switchObj.x - x, 2) +
                    Math.pow(switchObj.y - y, 2)
                );
                if (distance <= radius) {
                    entities.push({ type: 'switch', data: switchObj });
                }
            }
        }

        // Check gates
        if (this.gates) {
            for (let gate of this.gates) {
                const distance = Math.sqrt(
                    Math.pow(gate.x - x, 2) +
                    Math.pow(gate.y - y, 2)
                );
                if (distance <= radius) {
                    entities.push({ type: 'gate', data: gate });
                }
            }
        }

        return entities;
    }

    /**
     * Export map state
     */
    exportState() {
        return {
            mapData: this.mapData,
            width: this.width,
            height: this.height,
            tiles: this.tiles.map(row => [...row]), // Deep copy
            fogOfWar: this.fogOfWar ? this.fogOfWar.map(row => [...row]) : null,
            fogEnabled: this.fogEnabled,
            doors: this.doors ? this.doors.map(d => ({...d})) : [],
            collectibles: this.collectibles ? [...this.collectibles] : []
        };
    }

    /**
     * Import map state
     */
    importState(state) {
        if (state.mapData) this.mapData = state.mapData;
        if (state.width !== undefined) this.width = state.width;
        if (state.height !== undefined) this.height = state.height;
        if (state.tiles) this.tiles = state.tiles.map(row => [...row]);
        if (state.fogOfWar) this.fogOfWar = state.fogOfWar.map(row => [...row]);
        if (state.fogEnabled !== undefined) this.fogEnabled = state.fogEnabled;
        if (state.doors) this.doors = state.doors.map(d => ({...d}));
        if (state.collectibles) this.collectibles = [...state.collectibles];
    }

    /**
     * Reset map
     */
    reset() {
        this.mapData = null;
        this.width = 0;
        this.height = 0;
        this.tiles = [];
        this.spawn = null;
        this.extraction = null;
        this.terminals = [];
        this.doors = [];
        this.explosives = [];
        this.switches = [];
        this.gates = [];
        this.collectibles = [];
        this.waypoints = [];
        this.fogOfWar = null;

        this.emit('mapReset');
    }

    /**
     * Add event listener
     */
    addListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    removeListener(event, callback) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => callback(data));
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            dimensions: { width: this.width, height: this.height },
            spawn: this.spawn,
            extraction: this.extraction,
            fogEnabled: this.fogEnabled,
            entityCounts: {
                terminals: this.terminals.length,
                doors: this.doors.length,
                collectibles: this.collectibles.length,
                explosives: this.explosives.length,
                switches: this.switches.length,
                gates: this.gates.length
            }
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.MapService = MapService;
}