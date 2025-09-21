/**
 * AIService - Centralized AI behavior and pathfinding
 * Handles enemy AI, pathfinding, vision, and decision making
 */

class AIService {
    constructor(mapService) {
        // Dependencies
        this.mapService = mapService;

        // AI State
        this.enemies = [];
        this.agents = []; // Reference to player agents for vision checks

        // AI Configuration
        this.config = {
            // Vision
            defaultVisionRange: 8,
            alertVisionBonus: 2,
            stealthDetectionModifier: 0.6,
            lineOfSightRequired: true,

            // Movement
            patrolSpeed: 1,
            alertSpeed: 2,
            chaseSpeed: 2.5,
            wallSlideEnabled: true,

            // Behavior
            alertDecayRate: 0.5,
            alertMaxLevel: 100,
            attackRange: 5,
            attackChance: 0.02,
            patrolChangeChance: 0.01,
            patrolRadius: 5,

            // Pathfinding
            pathfindingEnabled: true,
            maxPathLength: 50,
            pathRecalculateDistance: 2,
            pathfindingTimeout: 100 // ms
        };

        // Pathfinding cache
        this.pathCache = new Map();
        this.pathCacheTimeout = 1000; // ms

        // AI States enum
        this.AI_STATES = {
            IDLE: 'idle',
            PATROL: 'patrol',
            ALERT: 'alert',
            CHASE: 'chase',
            ATTACK: 'attack',
            SEARCH: 'search',
            RETURN: 'return',
            DEAD: 'dead'
        };

        // AI Types
        this.AI_TYPES = {
            GUARD: 'guard',
            PATROL: 'patrol',
            SNIPER: 'sniper',
            HEAVY: 'heavy',
            STEALTH: 'stealth',
            BOSS: 'boss'
        };

        // Event listeners
        this.listeners = new Map();

        // Bind methods
        this.update = this.update.bind(this);
        this.updateEnemy = this.updateEnemy.bind(this);
        this.findPath = this.findPath.bind(this);

        console.log('🤖 AIService initialized');
    }

    /**
     * Add enemy to AI system
     */
    addEnemy(enemy) {
        // Initialize AI properties if not present
        if (!enemy.state) enemy.state = this.AI_STATES.IDLE;
        if (!enemy.alertLevel) enemy.alertLevel = 0;
        if (!enemy.targetX) enemy.targetX = enemy.x;
        if (!enemy.targetY) enemy.targetY = enemy.y;
        if (!enemy.facingAngle) enemy.facingAngle = 0;
        if (!enemy.visionRange) enemy.visionRange = this.config.defaultVisionRange;
        if (!enemy.speed) enemy.speed = this.config.patrolSpeed;
        if (!enemy.path) enemy.path = [];
        if (!enemy.pathIndex) enemy.pathIndex = 0;
        if (!enemy.aiType) enemy.aiType = this.AI_TYPES.GUARD;
        if (!enemy.lastSeen) enemy.lastSeen = null;
        if (!enemy.patrolPath) enemy.patrolPath = [];
        if (!enemy.homePosition) enemy.homePosition = { x: enemy.x, y: enemy.y };

        this.enemies.push(enemy);
        return enemy;
    }

    /**
     * Remove enemy from AI system
     */
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            this.enemies.splice(index, 1);
        }
    }

    /**
     * Clear all enemies
     */
    clearEnemies() {
        this.enemies = [];
        this.pathCache.clear();
    }

    /**
     * Set player agents for vision checks
     */
    setAgents(agents) {
        this.agents = agents;
    }

    /**
     * Update all enemy AI
     */
    update(deltaTime) {
        if (!this.enemies || this.enemies.length === 0) return;

        for (const enemy of this.enemies) {
            if (!enemy.alive || enemy.state === this.AI_STATES.DEAD) continue;

            this.updateEnemy(enemy, deltaTime);
        }
    }

    /**
     * Update individual enemy AI
     */
    updateEnemy(enemy, deltaTime) {
        // Update vision and detection
        this.updateVision(enemy);

        // State machine
        switch (enemy.state) {
            case this.AI_STATES.IDLE:
                this.updateIdleState(enemy, deltaTime);
                break;

            case this.AI_STATES.PATROL:
                this.updatePatrolState(enemy, deltaTime);
                break;

            case this.AI_STATES.ALERT:
                this.updateAlertState(enemy, deltaTime);
                break;

            case this.AI_STATES.CHASE:
                this.updateChaseState(enemy, deltaTime);
                break;

            case this.AI_STATES.ATTACK:
                this.updateAttackState(enemy, deltaTime);
                break;

            case this.AI_STATES.SEARCH:
                this.updateSearchState(enemy, deltaTime);
                break;

            case this.AI_STATES.RETURN:
                this.updateReturnState(enemy, deltaTime);
                break;
        }

        // Update facing direction based on movement
        this.updateFacing(enemy);
    }

    /**
     * Update enemy vision and detection
     */
    updateVision(enemy) {
        if (!this.agents || this.agents.length === 0) return;

        let closestAgent = null;
        let closestDistance = Infinity;

        // Check each agent
        for (const agent of this.agents) {
            if (!agent.alive) continue;

            const distance = this.getDistance(enemy, agent);

            // Calculate effective vision range
            let visionRange = enemy.visionRange;
            if (enemy.state === this.AI_STATES.ALERT || enemy.state === this.AI_STATES.CHASE) {
                visionRange += this.config.alertVisionBonus;
            }

            // Apply stealth modifiers
            if (agent.stealthBonus) {
                visionRange *= (1 - agent.stealthBonus * 0.1);
            }

            // Check if in vision range
            if (distance <= visionRange) {
                // Check line of sight if required
                if (this.config.lineOfSightRequired && this.mapService) {
                    if (!this.mapService.hasLineOfSight(enemy.x, enemy.y, agent.x, agent.y)) {
                        continue;
                    }
                }

                // Agent detected
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestAgent = agent;
                }
            }
        }

        // Handle detection
        if (closestAgent) {
            enemy.lastSeen = {
                x: closestAgent.x,
                y: closestAgent.y,
                time: Date.now(),
                agent: closestAgent
            };

            // Transition to alert/chase
            if (enemy.state === this.AI_STATES.IDLE || enemy.state === this.AI_STATES.PATROL) {
                this.transitionToAlert(enemy, closestAgent);
            } else if (enemy.state === this.AI_STATES.ALERT) {
                this.transitionToChase(enemy, closestAgent);
            }

            // Update target for chase
            if (enemy.state === this.AI_STATES.CHASE || enemy.state === this.AI_STATES.ATTACK) {
                enemy.targetX = closestAgent.x;
                enemy.targetY = closestAgent.y;
                enemy.targetAgent = closestAgent;
            }
        }
    }

    /**
     * Update idle state
     */
    updateIdleState(enemy, deltaTime) {
        // Randomly start patrolling
        if (Math.random() < this.config.patrolChangeChance) {
            this.transitionToPatrol(enemy);
        }
    }

    /**
     * Update patrol state
     */
    updatePatrolState(enemy, deltaTime) {
        // Move along patrol path or random patrol
        if (enemy.patrolPath && enemy.patrolPath.length > 0) {
            // Predefined patrol path
            this.followPatrolPath(enemy, deltaTime);
        } else {
            // Random patrol
            this.randomPatrol(enemy, deltaTime);
        }
    }

    /**
     * Update alert state
     */
    updateAlertState(enemy, deltaTime) {
        // Look around for threats
        enemy.facingAngle += 0.05; // Rotate to search

        // Decay alert level
        enemy.alertLevel = Math.max(0, enemy.alertLevel - this.config.alertDecayRate);

        if (enemy.alertLevel <= 0) {
            // Return to patrol
            this.transitionToPatrol(enemy);
        } else if (enemy.lastSeen && Date.now() - enemy.lastSeen.time < 2000) {
            // Recent sighting - chase
            this.transitionToChase(enemy, enemy.lastSeen.agent);
        }
    }

    /**
     * Update chase state
     */
    updateChaseState(enemy, deltaTime) {
        if (!enemy.targetAgent || !enemy.targetAgent.alive) {
            this.transitionToSearch(enemy);
            return;
        }

        const distance = this.getDistance(enemy, enemy.targetAgent);

        // Check if in attack range
        if (distance <= this.config.attackRange) {
            this.transitionToAttack(enemy);
        } else {
            // Move towards target
            this.moveTowards(enemy, enemy.targetX, enemy.targetY, this.config.chaseSpeed, deltaTime);

            // Check if lost sight
            if (enemy.lastSeen && Date.now() - enemy.lastSeen.time > 3000) {
                this.transitionToSearch(enemy);
            }
        }
    }

    /**
     * Update attack state
     */
    updateAttackState(enemy, deltaTime) {
        if (!enemy.targetAgent || !enemy.targetAgent.alive) {
            this.transitionToSearch(enemy);
            return;
        }

        const distance = this.getDistance(enemy, enemy.targetAgent);

        // Attack if in range
        if (distance <= this.config.attackRange) {
            if (Math.random() < this.config.attackChance) {
                this.performAttack(enemy, enemy.targetAgent);
            }
        } else {
            // Target moved away - chase
            this.transitionToChase(enemy, enemy.targetAgent);
        }
    }

    /**
     * Update search state
     */
    updateSearchState(enemy, deltaTime) {
        // Search last known position
        if (enemy.lastSeen) {
            const distance = this.getDistance(enemy, enemy.lastSeen);

            if (distance > 1) {
                this.moveTowards(enemy, enemy.lastSeen.x, enemy.lastSeen.y, this.config.alertSpeed, deltaTime);
            } else {
                // Reached last position - look around
                enemy.facingAngle += 0.03;

                // Give up after some time
                if (Date.now() - enemy.lastSeen.time > 5000) {
                    enemy.lastSeen = null;
                    this.transitionToReturn(enemy);
                }
            }
        } else {
            this.transitionToReturn(enemy);
        }
    }

    /**
     * Update return state
     */
    updateReturnState(enemy, deltaTime) {
        const distance = this.getDistance(enemy, enemy.homePosition);

        if (distance > 1) {
            this.moveTowards(enemy, enemy.homePosition.x, enemy.homePosition.y, this.config.patrolSpeed, deltaTime);
        } else {
            // Reached home - go idle
            enemy.state = this.AI_STATES.IDLE;
            enemy.alertLevel = 0;
        }
    }

    /**
     * Move enemy towards position
     */
    moveTowards(enemy, targetX, targetY, speed, deltaTime) {
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
            // Calculate move speed
            const moveSpeed = (speed * deltaTime) / 1000; // Convert to units per frame

            // Use pathfinding if enabled
            if (this.config.pathfindingEnabled) {
                this.moveWithPathfinding(enemy, targetX, targetY, moveSpeed);
            } else {
                // Simple movement
                const moveX = (dx / distance) * moveSpeed;
                const moveY = (dy / distance) * moveSpeed;

                const newX = enemy.x + moveX;
                const newY = enemy.y + moveY;

                // Check collision
                if (this.canMoveTo(enemy.x, enemy.y, newX, newY)) {
                    enemy.x = newX;
                    enemy.y = newY;
                } else if (this.config.wallSlideEnabled) {
                    // Try to slide along walls
                    this.tryWallSlide(enemy, newX, newY, moveX, moveY);
                }
            }

            // Update facing
            enemy.facingAngle = Math.atan2(dy, dx);
        }
    }

    /**
     * Move with pathfinding
     */
    moveWithPathfinding(enemy, targetX, targetY, moveSpeed) {
        // Check if we need a new path
        if (!enemy.path || enemy.path.length === 0 ||
            this.getDistance(enemy.path[enemy.path.length - 1], {x: targetX, y: targetY}) > this.config.pathRecalculateDistance) {

            // Find new path
            const path = this.findPath(enemy.x, enemy.y, targetX, targetY);
            if (path && path.length > 0) {
                enemy.path = path;
                enemy.pathIndex = 0;
            }
        }

        // Follow path
        if (enemy.path && enemy.pathIndex < enemy.path.length) {
            const nextPoint = enemy.path[enemy.pathIndex];
            const dx = nextPoint.x - enemy.x;
            const dy = nextPoint.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 0.5) {
                // Reached waypoint
                enemy.pathIndex++;
            } else {
                // Move towards waypoint
                const moveX = (dx / distance) * moveSpeed;
                const moveY = (dy / distance) * moveSpeed;

                enemy.x += moveX;
                enemy.y += moveY;
            }
        }
    }

    /**
     * Try to slide along walls
     */
    tryWallSlide(enemy, targetX, targetY, moveX, moveY) {
        // Try horizontal movement
        if (this.canMoveTo(enemy.x, enemy.y, targetX, enemy.y)) {
            enemy.x = targetX;
            enemy.facingAngle = moveX > 0 ? 0 : Math.PI;
        }
        // Try vertical movement
        else if (this.canMoveTo(enemy.x, enemy.y, enemy.x, targetY)) {
            enemy.y = targetY;
            enemy.facingAngle = moveY > 0 ? Math.PI/2 : -Math.PI/2;
        }
    }

    /**
     * Follow predefined patrol path
     */
    followPatrolPath(enemy, deltaTime) {
        if (!enemy.patrolPath || enemy.patrolPath.length === 0) return;

        if (!enemy.patrolIndex) enemy.patrolIndex = 0;

        const target = enemy.patrolPath[enemy.patrolIndex];
        const distance = this.getDistance(enemy, target);

        if (distance < 1) {
            // Reached patrol point
            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPath.length;
        } else {
            // Move to patrol point
            this.moveTowards(enemy, target.x, target.y, this.config.patrolSpeed, deltaTime);
        }
    }

    /**
     * Random patrol behavior
     */
    randomPatrol(enemy, deltaTime) {
        const dx = enemy.targetX - enemy.x;
        const dy = enemy.targetY - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.5 || Math.random() < this.config.patrolChangeChance) {
            // Pick new random target
            this.pickRandomPatrolTarget(enemy);
        } else {
            // Move to target
            this.moveTowards(enemy, enemy.targetX, enemy.targetY, this.config.patrolSpeed, deltaTime);
        }
    }

    /**
     * Pick random patrol target
     */
    pickRandomPatrolTarget(enemy) {
        let attempts = 0;
        let newX, newY;

        do {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * this.config.patrolRadius;
            newX = enemy.homePosition.x + Math.cos(angle) * distance;
            newY = enemy.homePosition.y + Math.sin(angle) * distance;
            attempts++;
        } while (!this.isWalkable(newX, newY) && attempts < 10);

        if (attempts < 10) {
            enemy.targetX = newX;
            enemy.targetY = newY;
        }
    }

    /**
     * State transitions
     */
    transitionToAlert(enemy, target) {
        enemy.state = this.AI_STATES.ALERT;
        enemy.alertLevel = this.config.alertMaxLevel;
        enemy.speed = this.config.alertSpeed;

        this.emit('enemyAlert', { enemy, target });
    }

    transitionToChase(enemy, target) {
        enemy.state = this.AI_STATES.CHASE;
        enemy.alertLevel = this.config.alertMaxLevel;
        enemy.speed = this.config.chaseSpeed;
        enemy.targetAgent = target;

        this.emit('enemyChase', { enemy, target });
    }

    transitionToAttack(enemy) {
        enemy.state = this.AI_STATES.ATTACK;
        enemy.alertLevel = this.config.alertMaxLevel;

        this.emit('enemyAttack', { enemy, target: enemy.targetAgent });
    }

    transitionToSearch(enemy) {
        enemy.state = this.AI_STATES.SEARCH;
        enemy.alertLevel = Math.max(50, enemy.alertLevel);
        enemy.speed = this.config.alertSpeed;
        enemy.targetAgent = null;
    }

    transitionToReturn(enemy) {
        enemy.state = this.AI_STATES.RETURN;
        enemy.alertLevel = 0;
        enemy.speed = this.config.patrolSpeed;
        enemy.targetAgent = null;
    }

    transitionToPatrol(enemy) {
        enemy.state = this.AI_STATES.PATROL;
        enemy.alertLevel = 0;
        enemy.speed = this.config.patrolSpeed;
        enemy.targetAgent = null;

        // Pick initial patrol target
        if (!enemy.patrolPath || enemy.patrolPath.length === 0) {
            this.pickRandomPatrolTarget(enemy);
        }
    }

    /**
     * Perform attack
     */
    performAttack(enemy, target) {
        this.emit('enemyShoot', {
            enemy,
            target,
            damage: enemy.damage || 10,
            position: { x: enemy.x, y: enemy.y },
            targetPosition: { x: target.x, y: target.y }
        });
    }

    /**
     * Update enemy facing direction
     */
    updateFacing(enemy) {
        // Facing is updated during movement
        // This method can be used for additional facing logic
    }

    /**
     * A* Pathfinding implementation
     */
    findPath(startX, startY, endX, endY) {
        // Check cache
        const cacheKey = `${Math.floor(startX)},${Math.floor(startY)}-${Math.floor(endX)},${Math.floor(endY)}`;
        if (this.pathCache.has(cacheKey)) {
            const cached = this.pathCache.get(cacheKey);
            if (Date.now() - cached.time < this.pathCacheTimeout) {
                return cached.path;
            }
        }

        const startTime = Date.now();
        const openList = [];
        const closedList = new Set();
        const startNode = {
            x: Math.floor(startX),
            y: Math.floor(startY),
            g: 0,
            h: this.heuristic(startX, startY, endX, endY),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;

        openList.push(startNode);

        while (openList.length > 0 && Date.now() - startTime < this.config.pathfindingTimeout) {
            // Find node with lowest f score
            let currentIndex = 0;
            for (let i = 1; i < openList.length; i++) {
                if (openList[i].f < openList[currentIndex].f) {
                    currentIndex = i;
                }
            }

            const current = openList.splice(currentIndex, 1)[0];
            const currentKey = `${current.x},${current.y}`;

            // Check if we reached the goal
            if (Math.abs(current.x - Math.floor(endX)) < 1 &&
                Math.abs(current.y - Math.floor(endY)) < 1) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({ x: node.x + 0.5, y: node.y + 0.5 });
                    node = node.parent;
                }

                // Cache result
                this.pathCache.set(cacheKey, { path, time: Date.now() });
                return path;
            }

            closedList.add(currentKey);

            // Check neighbors
            const neighbors = [
                { x: current.x + 1, y: current.y },
                { x: current.x - 1, y: current.y },
                { x: current.x, y: current.y + 1 },
                { x: current.x, y: current.y - 1 },
                // Diagonals
                { x: current.x + 1, y: current.y + 1 },
                { x: current.x - 1, y: current.y + 1 },
                { x: current.x + 1, y: current.y - 1 },
                { x: current.x - 1, y: current.y - 1 }
            ];

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedList.has(neighborKey)) continue;
                if (!this.isWalkable(neighbor.x, neighbor.y)) continue;

                const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
                const g = current.g + (isDiagonal ? 1.414 : 1);
                const h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
                const f = g + h;

                // Check if neighbor is in open list
                const existingIndex = openList.findIndex(n => n.x === neighbor.x && n.y === neighbor.y);

                if (existingIndex === -1) {
                    // Add to open list
                    openList.push({
                        x: neighbor.x,
                        y: neighbor.y,
                        g, h, f,
                        parent: current
                    });
                } else if (g < openList[existingIndex].g) {
                    // Update existing node
                    openList[existingIndex].g = g;
                    openList[existingIndex].f = f;
                    openList[existingIndex].parent = current;
                }
            }
        }

        // No path found - return empty array instead of null for consistency
        return [];
    }

    /**
     * Heuristic for A* pathfinding
     */
    heuristic(x1, y1, x2, y2) {
        // Manhattan distance
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Check if position is walkable
     */
    isWalkable(x, y) {
        if (this.mapService) {
            return this.mapService.isWalkable(x, y);
        }
        // Fallback - always walkable if no map service
        return true;
    }

    /**
     * Check if can move from one position to another
     */
    canMoveTo(fromX, fromY, toX, toY) {
        if (this.mapService) {
            return this.mapService.canMoveTo(fromX, fromY, toX, toY);
        }
        // Fallback
        return this.isWalkable(toX, toY);
    }

    /**
     * Get distance between two positions
     */
    getDistance(pos1, pos2) {
        const dx = pos2.x - pos1.x;
        const dy = pos2.y - pos1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Set AI configuration
     */
    setConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
        }
    }

    /**
     * Get AI configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Export AI state
     */
    exportState() {
        return {
            enemies: this.enemies.map(e => ({
                x: e.x,
                y: e.y,
                state: e.state,
                alertLevel: e.alertLevel,
                targetX: e.targetX,
                targetY: e.targetY,
                facingAngle: e.facingAngle,
                aiType: e.aiType,
                alive: e.alive
            })),
            config: { ...this.config }
        };
    }

    /**
     * Import AI state
     */
    importState(state) {
        if (state.config) {
            Object.assign(this.config, state.config);
        }

        // Enemy state would need to be matched with existing enemies
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
            enemyCount: this.enemies.length,
            aliveEnemies: this.enemies.filter(e => e.alive).length,
            alertedEnemies: this.enemies.filter(e => e.alertLevel > 0).length,
            states: {
                idle: this.enemies.filter(e => e.state === this.AI_STATES.IDLE).length,
                patrol: this.enemies.filter(e => e.state === this.AI_STATES.PATROL).length,
                alert: this.enemies.filter(e => e.state === this.AI_STATES.ALERT).length,
                chase: this.enemies.filter(e => e.state === this.AI_STATES.CHASE).length,
                attack: this.enemies.filter(e => e.state === this.AI_STATES.ATTACK).length
            },
            pathCacheSize: this.pathCache.size
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.AIService = AIService;
}