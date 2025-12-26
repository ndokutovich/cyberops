/**
 * PathfindingService - A* pathfinding algorithm
 * Single source of truth for all pathfinding operations
 *
 * Uses dependency injection for map provider (isWalkable check)
 */

class PathfindingService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('PathfindingService') : null;

        // Cache configuration
        this.pathCache = new Map();
        this.pathCacheTimeout = 5000; // Cache paths for 5 seconds
        this.maxPathCacheSize = 50;

        // Max iterations to prevent infinite loops on large maps
        this.maxIterations = 2000;

        // Map provider - must be set before use
        this.mapProvider = null;

        if (this.logger) this.logger.debug('PathfindingService initialized');
    }

    /**
     * Set the map provider (object with isWalkable method)
     * @param {Object} provider - Must have isWalkable(x, y) method
     */
    setMapProvider(provider) {
        if (!provider || typeof provider.isWalkable !== 'function') {
            throw new Error('Map provider must have isWalkable(x, y) method');
        }
        this.mapProvider = provider;
        if (this.logger) this.logger.debug('Map provider set');
    }

    /**
     * Check if a tile is walkable
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isWalkable(x, y) {
        if (!this.mapProvider) {
            throw new Error('Map provider not set - call setMapProvider first');
        }
        return this.mapProvider.isWalkable(x, y);
    }

    /**
     * Clear path cache (call when map changes)
     */
    clearCache() {
        this.pathCache.clear();
        if (this.logger) this.logger.debug('Path cache cleared');
    }

    /**
     * Find path using A* algorithm
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @param {boolean} smooth - Whether to smooth the path
     * @returns {Array|null} Array of {x, y} waypoints or null if no path
     */
    findPath(startX, startY, endX, endY, smooth = true) {
        if (!this.mapProvider) {
            throw new Error('Map provider not set - call setMapProvider first');
        }

        // Convert to grid coordinates
        const start = { x: Math.floor(startX), y: Math.floor(startY) };
        const end = { x: Math.floor(endX), y: Math.floor(endY) };

        // Check cache first
        const cacheKey = `${start.x},${start.y}-${end.x},${end.y}`;
        const cached = this.pathCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.pathCacheTimeout) {
            return [...cached.path]; // Return copy of cached path
        }

        // Check if end is walkable, find nearest if not
        if (!this.isWalkable(end.x, end.y)) {
            const nearestWalkable = this.findNearestWalkable(endX, endY);
            if (!nearestWalkable) return null;
            end.x = Math.floor(nearestWalkable.x);
            end.y = Math.floor(nearestWalkable.y);
        }

        let iterations = 0;

        // A* implementation
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();

        const startNode = {
            x: start.x,
            y: start.y,
            g: 0,
            h: this.heuristic(start, end),
            f: 0
        };
        startNode.f = startNode.g + startNode.h;

        openSet.push(startNode);

        while (openSet.length > 0 && iterations < this.maxIterations) {
            iterations++;

            // Get node with lowest f score
            let current = openSet[0];
            let currentIndex = 0;

            for (let i = 1; i < openSet.length; i++) {
                if (openSet[i].f < current.f) {
                    current = openSet[i];
                    currentIndex = i;
                }
            }

            // Remove current from openSet
            openSet.splice(currentIndex, 1);

            // Check if we reached the goal
            if (current.x === end.x && current.y === end.y) {
                const path = this.reconstructPath(cameFrom, current, smooth);

                // Cache the result
                if (this.pathCache.size >= this.maxPathCacheSize) {
                    const firstKey = this.pathCache.keys().next().value;
                    this.pathCache.delete(firstKey);
                }
                this.pathCache.set(cacheKey, {
                    path: [...path],
                    timestamp: Date.now()
                });

                return path;
            }

            // Add to closed set
            const key = `${current.x},${current.y}`;
            closedSet.add(key);

            // Check all neighbors
            const neighbors = this.getNeighbors(current.x, current.y);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                // Skip if in closed set
                if (closedSet.has(neighborKey)) continue;

                // Calculate tentative g score
                const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
                const moveCost = isDiagonal ? 1.414 : 1;
                const tentativeG = current.g + moveCost;

                // Find neighbor in open set
                let neighborNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!neighborNode) {
                    // Add new node
                    neighborNode = {
                        x: neighbor.x,
                        y: neighbor.y,
                        g: tentativeG,
                        h: this.heuristic(neighbor, end),
                        f: 0
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.push(neighborNode);
                    cameFrom.set(neighborKey, current);
                } else if (tentativeG < neighborNode.g) {
                    // Update existing node
                    neighborNode.g = tentativeG;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    cameFrom.set(neighborKey, current);
                }
            }
        }

        // No path found
        return null;
    }

    /**
     * Get walkable neighbors for 8-directional movement
     * @param {number} x
     * @param {number} y
     * @returns {Array} Array of {x, y}
     */
    getNeighbors(x, y) {
        const neighbors = [];

        // 8-directional movement
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;

                const nx = x + dx;
                const ny = y + dy;

                // Check if neighbor is walkable
                if (!this.isWalkable(nx, ny)) continue;

                // For diagonal movement, check if path is clear (prevent corner cutting)
                if (dx !== 0 && dy !== 0) {
                    if (!this.isWalkable(x + dx, y) || !this.isWalkable(x, y + dy)) {
                        continue;
                    }
                }

                neighbors.push({ x: nx, y: ny });
            }
        }

        return neighbors;
    }

    /**
     * Heuristic function (Euclidean distance)
     * @param {Object} a - {x, y}
     * @param {Object} b - {x, y}
     * @returns {number}
     */
    heuristic(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Reconstruct path from A* result
     * @param {Map} cameFrom
     * @param {Object} current
     * @param {boolean} smooth
     * @returns {Array}
     */
    reconstructPath(cameFrom, current, smooth = true) {
        const path = [{ x: current.x, y: current.y }];
        let key = `${current.x},${current.y}`;

        while (cameFrom.has(key)) {
            current = cameFrom.get(key);
            path.unshift({ x: current.x, y: current.y });
            key = `${current.x},${current.y}`;
        }

        // Smooth the path for more natural movement
        return smooth ? this.smoothPath(path) : path;
    }

    /**
     * Smooth path by removing unnecessary waypoints
     * @param {Array} path
     * @returns {Array}
     */
    smoothPath(path) {
        if (path.length <= 2) return path;

        const smoothed = [path[0]];
        let current = 0;

        while (current < path.length - 1) {
            let farthest = current + 1;

            // Find the farthest point we can reach directly
            for (let i = current + 2; i < path.length; i++) {
                if (this.hasDirectPath(path[current], path[i])) {
                    farthest = i;
                }
            }

            smoothed.push(path[farthest]);
            current = farthest;
        }

        return smoothed;
    }

    /**
     * Check if there's a direct walkable path between two points
     * @param {Object} start - {x, y}
     * @param {Object} end - {x, y}
     * @returns {boolean}
     */
    hasDirectPath(start, end) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));

        if (steps === 0) return true;

        const stepX = dx / steps;
        const stepY = dy / steps;

        for (let i = 0; i <= steps; i++) {
            const x = Math.floor(start.x + stepX * i);
            const y = Math.floor(start.y + stepY * i);

            if (!this.isWalkable(x, y)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Find nearest walkable position
     * @param {number} x
     * @param {number} y
     * @returns {Object|null} {x, y} or null
     */
    findNearestWalkable(x, y) {
        const startX = Math.floor(x);
        const startY = Math.floor(y);

        // Check if already walkable
        if (this.isWalkable(startX, startY)) {
            return { x: startX, y: startY };
        }

        // Search in expanding circles
        for (let radius = 1; radius <= 10; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / (4 * radius)) {
                const testX = startX + Math.floor(Math.cos(angle) * radius);
                const testY = startY + Math.floor(Math.sin(angle) * radius);

                if (this.isWalkable(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }

        return null;
    }
}

// Export class for GameServices to instantiate
if (typeof window !== 'undefined') {
    window.PathfindingService = PathfindingService;
}
