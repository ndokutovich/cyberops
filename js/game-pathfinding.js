/**
 * Pathfinding Integration - Thin wrapper connecting game to PathfindingService
 *
 * All actual pathfinding logic is in services/pathfinding-service.js
 * This file provides game integration and agent movement handling
 */

// Initialize pathfinding - connects to PathfindingService
CyberOpsGame.prototype.initPathCache = function() {
    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GamePathfinding') : null;
    }

    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available - required for pathfinding');
    }

    // Set this game instance as the map provider
    // PathfindingService will call our isWalkable() method
    pathfindingService.setMapProvider(this);

    if (this.logger) this.logger.debug('Pathfinding initialized with PathfindingService');
};

// Delegate to PathfindingService
CyberOpsGame.prototype.findPath = function(startX, startY, endX, endY, smooth = true) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.findPath(startX, startY, endX, endY, smooth);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.getNeighbors = function(x, y) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.getNeighbors(x, y);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.heuristic = function(a, b) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.heuristic(a, b);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.reconstructPath = function(cameFrom, current, smooth = true) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.reconstructPath(cameFrom, current, smooth);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.smoothPath = function(path) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.smoothPath(path);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.hasDirectPath = function(start, end) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.hasDirectPath(start, end);
};

// Delegate to PathfindingService
CyberOpsGame.prototype.findNearestWalkable = function(x, y) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }
    return pathfindingService.findNearestWalkable(x, y);
};

/**
 * Apply pathfinding to agent movement
 * This method is game-specific (handles agent state) so stays here
 */
CyberOpsGame.prototype.moveAgentWithPathfinding = function(agent) {
    const pathfindingService = this.gameServices?.pathfindingService;
    if (!pathfindingService) {
        throw new Error('PathfindingService not available');
    }

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

            const newPath = pathfindingService.findPath(agent.x, agent.y, agent.targetX, agent.targetY);

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
};
