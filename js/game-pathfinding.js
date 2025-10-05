// A* Pathfinding Algorithm for CyberOps Game

// Initialize pathfinding cache
CyberOpsGame.prototype.initPathCache = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GamePathfinding') : null;
    }
    this.pathCache = new Map();
    this.pathCacheTimeout = 5000; // Cache paths for 5 seconds
    this.maxPathCacheSize = 50; // Limit cache size
}

CyberOpsGame.prototype.findPath = function(startX, startY, endX, endY, smooth = true) {
    // Convert to grid coordinates
    const start = { x: Math.floor(startX), y: Math.floor(startY) };
    const end = { x: Math.floor(endX), y: Math.floor(endY) };

    // Check cache first
    const cacheKey = `${start.x},${start.y}-${end.x},${end.y}`;
    const cached = this.pathCache?.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.pathCacheTimeout) {
        return [...cached.path]; // Return copy of cached path
    }

    // Check if start and end are valid
    if (!this.isWalkable(end.x, end.y)) {
        // Find nearest walkable position to target
        const nearestWalkable = this.findNearestWalkable(endX, endY);
        if (!nearestWalkable) return null;
        end.x = Math.floor(nearestWalkable.x);
        end.y = Math.floor(nearestWalkable.y);
    }

    // Limit pathfinding iterations to prevent performance issues
    // Increased to handle large maps (80x80 = 6400 tiles max)
    const maxIterations = 2000;
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

    while (openSet.length > 0 && iterations < maxIterations) {
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
            if (this.pathCache) {
                // Clean old cache entries if needed
                if (this.pathCache.size >= this.maxPathCacheSize) {
                    const firstKey = this.pathCache.keys().next().value;
                    this.pathCache.delete(firstKey);
                }
                this.pathCache.set(cacheKey, {
                    path: [...path],
                    timestamp: Date.now()
                });
            }

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

// Get walkable neighbors
CyberOpsGame.prototype.getNeighbors = function(x, y) {
    const neighbors = [];

    // 8-directional movement
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;

            const nx = x + dx;
            const ny = y + dy;

            // Check if neighbor is walkable
            if (!this.isWalkable(nx, ny)) continue;

            // For diagonal movement, check if path is clear
            if (dx !== 0 && dy !== 0) {
                // Check both adjacent cells to prevent corner cutting
                if (!this.isWalkable(x + dx, y) || !this.isWalkable(x, y + dy)) {
                    continue;
                }
            }

            neighbors.push({ x: nx, y: ny });
        }
    }

    return neighbors;
}

// Heuristic function (Euclidean distance)
CyberOpsGame.prototype.heuristic = function(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

// Reconstruct path from A* result
CyberOpsGame.prototype.reconstructPath = function(cameFrom, current, smooth = true) {
    const path = [{ x: current.x, y: current.y }];
    let key = `${current.x},${current.y}`;

    while (cameFrom.has(key)) {
        current = cameFrom.get(key);
        path.unshift({ x: current.x, y: current.y });
        key = `${current.x},${current.y}`;
    }

    // Smooth the path for more natural movement (unless disabled)
    return smooth ? this.smoothPath(path) : path;
}

// Smooth path by removing unnecessary waypoints
CyberOpsGame.prototype.smoothPath = function(path) {
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

// Check if there's a direct walkable path between two points
CyberOpsGame.prototype.hasDirectPath = function(start, end) {
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

// Find nearest walkable position
CyberOpsGame.prototype.findNearestWalkable = function(x, y) {
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

// Apply pathfinding to agent movement
CyberOpsGame.prototype.moveAgentWithPathfinding = function(agent) {
    try {
        // Only recalculate path if target changed significantly
        const targetKey = `${Math.floor(agent.targetX)},${Math.floor(agent.targetY)}`;

        // Only recalculate path if destination actually changed
        if (!agent.path || agent.lastTargetKey !== targetKey) {
            // Check if we're already very close to the target (within 1 tile)
            const distToTarget = Math.sqrt(
                Math.pow(agent.targetX - agent.x, 2) +
                Math.pow(agent.targetY - agent.y, 2)
            );

            // If very close and clicking same area, don't recalculate
            if (distToTarget < 1 && agent.lastTargetKey === targetKey) {
                return;
            }

            const newPath = this.findPath(agent.x, agent.y, agent.targetX, agent.targetY);

            // Only reset if we got a valid new path
            if (newPath && newPath.length > 0) {
                agent.path = newPath;
                agent.lastTargetKey = targetKey;
                agent.currentPathIndex = 0;

                // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
                if (this.isAgentSelected(agent)) {
                    const agentIdentifier = agent.name || agent.id || 'unknown';
                    if (this.logger) this.logger.debug(`📍 Path calculated for ${agentIdentifier}: ${agent.path.length} waypoints`);
                }
            }
        }

        if (!agent.path || agent.path.length === 0) {
            // No path found, stop
            agent.targetX = agent.x;
            agent.targetY = agent.y;
            return;
        }

        // Move towards current waypoint
        let waypoint = agent.path[agent.currentPathIndex];

        // Safety check for waypoint
        if (!waypoint) {
            const agentName = agent.name || agent.id || 'unknown agent';
            if (this.logger) this.logger.error(`❌ Invalid waypoint for ${agentName} at index ${agent.currentPathIndex}`);
            agent.path = null;
            return;
        }

        const dx = waypoint.x - agent.x;
        const dy = waypoint.y - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.3) {
            // Reached waypoint, move to next
            agent.currentPathIndex++;

            if (agent.currentPathIndex >= agent.path.length) {
                // Reached destination
                agent.path = null;
                agent.x = agent.targetX;
                agent.y = agent.targetY;
                return;
            }

            waypoint = agent.path[agent.currentPathIndex];
        }

        // Move towards waypoint - with safety checks
        if (dist > 0) {
            // Original - NO speed multiplier (speed comes from multiple update calls)
            const moveSpeed = agent.speed / 60;
            const moveX = (dx / dist) * moveSpeed;
            const moveY = (dy / dist) * moveSpeed;

            // Safety check for NaN
            if (!isNaN(moveX) && !isNaN(moveY)) {
                agent.x += moveX;
                agent.y += moveY;

                // Update facing angle
                agent.facingAngle = Math.atan2(dy, dx);
            } else {
                const agentName = agent.name || agent.id || 'unknown agent';
                if (this.logger) this.logger.error(`❌ Invalid movement for ${agentName}: dist=${dist}, dx=${dx}, dy=${dy}`);
            }
        }
    } catch (error) {
        const agentName = agent.name || agent.id || 'unknown agent';
        if (this.logger) this.logger.error(`❌ Pathfinding error for ${agentName}:`, error);
        // Reset to safe state
        agent.path = null;
        agent.targetX = agent.x;
        agent.targetY = agent.y;
    }
}