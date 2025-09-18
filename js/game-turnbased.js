// Turn-Based Mode System for CyberOps: Syndicate
// Provides toggleable turn-based tactical combat with AP and initiative

// Turn-based mode initialization
CyberOpsGame.prototype.initTurnBasedMode = function() {
    // Core turn-based properties
    this.turnBasedMode = false;
    this.gridSnapMovement = true; // Snap to tile centers
    this.turnQueue = [];
    this.currentTurnIndex = 0;
    this.currentTurnUnit = null;
    this.turnRound = 0;

    // Action Points configuration
    this.apConfig = {
        agent: 12,
        guard: 8,
        soldier: 10,
        heavy: 6,
        boss: 14,
        civilian: 6,
        npc: 8
    };

    // Action costs
    this.actionCosts = {
        move: 1,        // Per tile
        shoot: 4,       // Basic attack
        ability: 6,     // Special ability
        reload: 2,      // Reload weapon
        hack: 4,        // Hack terminal
        interact: 2,    // Interact with object
        overwatch: 3,   // Set overwatch
        sprint: 2       // Double move distance
    };

    // Movement preview
    this.movementPreviewTiles = [];
    this.hoveredTile = null;
    this.pathPreview = [];

    // Advanced movement system
    this.pendingMovement = null;      // Stores planned movement with path and AP cost
    this.movementMarker = null;       // Visual destination marker
    this.multiTurnPath = [];          // Path segments across multiple turns
    this.isExecutingMove = false;     // Currently animating movement
    this.moveAnimationQueue = [];     // Tiles to animate through
    this.pathConfirmMode = false;     // Waiting for path confirmation

    console.log('🎯 Turn-based mode initialized');
    if (this.logEvent) {
        this.logEvent('Turn-based mode activated', 'combat', true);
    }

    // Show AP display
    const apDisplay = document.getElementById('tbApDisplay');
    if (apDisplay) {
        apDisplay.style.display = 'block';
    }
};

// Toggle turn-based mode
CyberOpsGame.prototype.toggleTurnBasedMode = function() {
    this.turnBasedMode = !this.turnBasedMode;

    console.log('═══════════════════════════════════════════');
    console.log(`🎮 TURN-BASED MODE: ${this.turnBasedMode ? '▶️ ACTIVATING' : '⏹️ DEACTIVATING'}`);
    console.log('═══════════════════════════════════════════');

    if (this.turnBasedMode) {
        this.enterTurnBasedMode();
    } else {
        this.exitTurnBasedMode();
    }

    // Play mode switch sound
    if (this.audioSystem) {
        this.playSound('modeSwitch');
    }
};

// Toggle grid snap movement
CyberOpsGame.prototype.toggleGridSnap = function() {
    this.gridSnapMovement = !this.gridSnapMovement;
    console.log(`📐 Grid snap: ${this.gridSnapMovement ? 'ON' : 'OFF'}`);
};

// Enter turn-based mode
CyberOpsGame.prototype.enterTurnBasedMode = function() {
    // Pause real-time simulation
    this.turnBasedPause = true;

    // Build initial turn queue
    this.buildTurnQueue();

    // Start first turn
    if (this.turnQueue.length > 0) {
        this.startTurn(0);
    }

    // Show turn-based UI
    this.showTurnBasedUI = true;

    // Clear any existing paths
    this.agents.forEach(agent => {
        agent.path = [];
        agent.isMoving = false;
    });

    this.enemies.forEach(enemy => {
        enemy.path = [];
        enemy.isMoving = false;
    });
};

// Exit turn-based mode
CyberOpsGame.prototype.exitTurnBasedMode = function() {
    // Resume real-time
    this.turnBasedPause = false;

    // Clear turn queue
    this.turnQueue = [];
    this.currentTurnIndex = 0;
    this.currentTurnUnit = null;

    // Hide turn-based UI
    this.showTurnBasedUI = false;

    // Clear movement preview
    this.movementPreviewTiles = [];
    this.pathPreview = [];

    // Clear any movement targets to prevent animation glitches
    this.agents.forEach(agent => {
        agent.targetX = undefined;
        agent.targetY = undefined;
    });

    if (this.addNotification) {
        this.addNotification('Turn-based mode: OFF');
    }

    console.log('✅ TBM: Turn-based mode deactivated');
    if (this.logEvent) {
        this.logEvent('Turn-based mode deactivated', 'system');
    }

    // Hide AP display
    const apDisplay = document.getElementById('tbApDisplay');
    if (apDisplay) {
        apDisplay.style.display = 'none';
    }
};

// Build turn queue based on initiative
CyberOpsGame.prototype.buildTurnQueue = function() {
    const allUnits = [];

    // Add agents
    this.agents.forEach(agent => {
        if (agent.alive) {
            allUnits.push({
                unit: agent,
                type: 'agent',
                team: 'player',
                initiative: this.calculateInitiative(agent),
                ap: this.apConfig.agent,
                maxAp: this.apConfig.agent,
                hasActed: false,
                overwatching: false
            });
        }
    });

    // Add enemies
    this.enemies.forEach(enemy => {
        if (enemy.alive) {
            allUnits.push({
                unit: enemy,
                type: enemy.type || 'guard',
                team: 'enemy',
                initiative: this.calculateInitiative(enemy),
                ap: this.apConfig[enemy.type] || this.apConfig.guard,
                maxAp: this.apConfig[enemy.type] || this.apConfig.guard,
                hasActed: false,
                overwatching: false
            });
        }
    });

    // Add NPCs if they can act
    if (this.npcs) {
        this.npcs.forEach(npc => {
            if (npc.canAct && npc.alive) {
                allUnits.push({
                    unit: npc,
                    type: 'npc',
                    team: npc.team || 'neutral',
                    initiative: this.calculateInitiative(npc),
                    ap: this.apConfig.npc,
                    maxAp: this.apConfig.npc,
                    hasActed: false,
                    overwatching: false
                });
            }
        });
    }

    // Sort by initiative (highest first)
    allUnits.sort((a, b) => b.initiative - a.initiative);

    this.turnQueue = allUnits;
    this.turnRound++;

    // Add notification and log for new round
    if (this.turnRound > 1) {
        const msg = `Round ${this.turnRound} begins!`;
        if (this.addNotification) this.addNotification(msg);
        if (this.logEvent) this.logEvent(msg, 'combat', true);
    }

    console.log(`📋 TBM Queue: ${allUnits.length} units | Round ${this.turnRound}`);
    console.log('📋 Turn order:', allUnits.map(u =>
        `${u.unit.name || u.type} (Initiative: ${u.initiative}, AP: ${u.ap})`
    ).join(' → '));
};

// Calculate initiative for a unit
CyberOpsGame.prototype.calculateInitiative = function(unit) {
    // Base initiative
    let initiative = 10;

    // Add speed bonus
    if (unit.speed) {
        initiative += unit.speed * 2;
    }

    // Add random factor (1d6)
    initiative += Math.floor(Math.random() * 6) + 1;

    // Add any buffs/debuffs
    if (unit.buffs) {
        initiative += unit.buffs.initiative || 0;
    }

    return initiative;
};

// Update the dedicated AP display
CyberOpsGame.prototype.updateTurnBasedAPDisplay = function() {
    const apValue = document.getElementById('tbApValue');
    if (!apValue || !this.currentTurnUnit) return;

    const unit = this.currentTurnUnit;
    const unitName = unit.unit.name || `${unit.type} ${unit.unit.id}`;

    // Update the display
    apValue.textContent = `${unit.ap} / ${unit.maxAp}`;
    apValue.style.color = unit.ap > 0 ? '#ffff00' : '#ff4444';

    // Update the title too
    const apDisplay = document.getElementById('tbApDisplay');
    if (apDisplay) {
        const titleDiv = apDisplay.querySelector('div:first-child');
        if (titleDiv) {
            titleDiv.textContent = `${unitName.toUpperCase()} AP`;
        }
    }
};

// Start a unit's turn
CyberOpsGame.prototype.startTurn = function(index) {
    this.currentTurnIndex = index;
    const turnData = this.turnQueue[index];

    if (!turnData) {
        // End of round, rebuild queue
        this.buildTurnQueue();
        if (this.turnQueue.length > 0) {
            this.startTurn(0);
        }
        return;
    }

    this.currentTurnUnit = turnData;

    // Update AP display
    this.updateTurnBasedAPDisplay();

    // Reset unit's AP if new round
    if (index === 0) {
        turnData.ap = turnData.maxAp;
    }

    // Calculate movement range
    this.calculateMovementRange(turnData);

    // Handle AI turns
    if (turnData.team === 'enemy') {
        setTimeout(() => this.executeAITurn(turnData), 500);
    } else if (turnData.team === 'player') {
        // Deselect all agents
        this.agents.forEach(a => a.selected = false);
        // Select the current unit
        turnData.unit.selected = true;
        this._selectedAgent = turnData.unit;
        console.log(`🎯 Auto-selected: ${turnData.unit.name}`);

        // Add visual notification and log
        const turnMsg = `${turnData.unit.name}'s turn (${turnData.ap} AP)`;
        if (this.addNotification) this.addNotification(turnMsg);
        if (this.logEvent) this.logEvent(turnMsg, 'combat');
    }

    console.log('───────────────────────────────────────────');
    console.log(`🎮 TURN ${this.currentTurnIndex + 1}/${this.turnQueue.length}: ${turnData.unit.name || turnData.type}`);
    console.log(`   Team: ${turnData.team} | AP: ${turnData.ap}/${turnData.maxAp}`);
    console.log('───────────────────────────────────────────');
};

// End current turn
CyberOpsGame.prototype.endTurn = function() {
    const current = this.turnQueue[this.currentTurnIndex];
    if (current) {
        current.hasActed = true;
        console.log(`✅ TBM: Turn ended for ${current.unit.name || current.type}`);
        console.log(`   Final AP: ${current.ap}/${current.maxAp}`);
    }

    // Move to next unit
    let nextIndex = this.currentTurnIndex + 1;

    // Check if round is over
    if (nextIndex >= this.turnQueue.length) {
        // New round
        this.buildTurnQueue();
        nextIndex = 0;
    }

    this.startTurn(nextIndex);
};

// Calculate movement range for current unit
CyberOpsGame.prototype.calculateMovementRange = function(turnData) {
    if (!turnData || !turnData.unit) return;

    const unit = turnData.unit;
    const ap = turnData.ap;

    // Clear previous preview
    this.movementPreviewTiles = [];

    // Use 1:1 world coordinates as tiles
    const startX = Math.round(unit.x);
    const startY = Math.round(unit.y);

    // Use BFS to find all reachable tiles
    const visited = new Set();
    const queue = [{x: startX, y: startY, cost: 0}];
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const current = queue.shift();

        // Add to preview if within AP range
        if (current.cost <= ap) {
            this.movementPreviewTiles.push({
                x: current.x,
                y: current.y,
                cost: current.cost
            });

            // Check all adjacent tiles
            const neighbors = [
                {x: current.x - 1, y: current.y},
                {x: current.x + 1, y: current.y},
                {x: current.x, y: current.y - 1},
                {x: current.x, y: current.y + 1},
                // Diagonals (optional, cost more)
                {x: current.x - 1, y: current.y - 1},
                {x: current.x + 1, y: current.y - 1},
                {x: current.x - 1, y: current.y + 1},
                {x: current.x + 1, y: current.y + 1}
            ];

            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.y}`;

                // Skip if already visited or out of bounds
                if (visited.has(key) || !this.isTileWalkable(neighbor.x, neighbor.y)) {
                    continue;
                }

                // Calculate movement cost (diagonal = 1.5 AP, rounded up)
                const isDiagonal = neighbor.x !== current.x && neighbor.y !== current.y;
                const moveCost = isDiagonal ? 2 : 1;
                const totalCost = current.cost + moveCost;

                if (totalCost <= ap) {
                    visited.add(key);
                    queue.push({x: neighbor.x, y: neighbor.y, cost: totalCost});
                }
            }
        }
    }
};

// Check if tile is walkable
CyberOpsGame.prototype.isTileWalkable = function(tileX, tileY) {
    // Check bounds
    if (tileX < 0 || tileX >= this.mapWidth || tileY < 0 || tileY >= this.mapHeight) {
        return false;
    }

    // Check collision map
    if (this.collisionMap && this.collisionMap[tileY] && this.collisionMap[tileY][tileX] === 1) {
        return false;
    }

    // Check for units blocking (1:1 world coords)
    const tileWorldX = tileX;
    const tileWorldY = tileY;

    // Check agents
    for (const agent of this.agents) {
        if (agent.alive && Math.round(agent.x) === tileWorldX &&
            Math.round(agent.y) === tileWorldY) {
            return false;
        }
    }

    // Check enemies
    for (const enemy of this.enemies) {
        if (enemy.alive && Math.round(enemy.x) === tileWorldX &&
            Math.round(enemy.y) === tileWorldY) {
            return false;
        }
    }

    return true;
};


// Handle turn-based movement - two-phase system: preview then confirm
CyberOpsGame.prototype.handleTurnBasedMovement = function(targetX, targetY) {
    if (!this.currentTurnUnit || this.currentTurnUnit.team !== 'player') {
        return false;
    }

    const unit = this.currentTurnUnit.unit;
    const turnData = this.currentTurnUnit;  // Use currentTurnUnit directly, not from index

    // Snap to grid if needed
    const tileX = this.gridSnapMovement ? Math.round(targetX) : Math.floor(targetX);
    const tileY = this.gridSnapMovement ? Math.round(targetY) : Math.floor(targetY);

    // Check if clicking on the movement marker (confirming movement)
    if (this.pendingMovement && this.movementMarker) {
        const markerDist = Math.abs(tileX - this.movementMarker.x) + Math.abs(tileY - this.movementMarker.y);
        console.log('🎯 TBM: Checking marker click', {
            clickPos: { x: tileX, y: tileY },
            markerPos: this.movementMarker,
            distance: markerDist,
            willConfirm: markerDist <= 1
        });

        if (markerDist <= 1) {
            // Confirm and execute the pending movement
            console.log('✅ TBM: Confirming movement to marker');
            this.executePendingMovement();
            return true;
        }
    }

    // Otherwise, create a new movement preview
    console.log(`📍 TBM: Planning movement to (${tileX}, ${tileY})`);

    // Calculate path using A* or similar
    const path = this.calculatePathToTarget(unit, tileX, tileY);

    if (!path || path.length === 0) {
        console.log('❌ TBM: No valid path to target');
        if (this.addNotification) {
            this.addNotification('No valid path!');
        }
        return false;
    }

    // Calculate actual movement cost (path.length - 1 since first tile is current position)
    const actualCost = path.length - 1;

    // Calculate how many turns this will take
    const pathSegments = this.calculateMultiTurnPath(path, turnData.ap);

    // Store the pending movement
    this.pendingMovement = {
        path: path,
        segments: pathSegments,
        totalCost: actualCost,
        destination: { x: tileX, y: tileY },
        unit: unit
    };

    // Place movement marker at destination
    this.movementMarker = { x: tileX, y: tileY };

    // Update path preview for rendering
    this.pathPreview = path;
    this.multiTurnPath = pathSegments;

    // Show confirmation prompt
    const turnsNeeded = pathSegments.length;
    const apCost = Math.min(actualCost, turnData.ap);

    if (this.addNotification) {
        if (turnsNeeded === 1) {
            this.addNotification(`📍 Path planned (${apCost} AP) - Click marker to confirm`);
        } else {
            this.addNotification(`📍 Path planned (${turnsNeeded} turns) - Click marker to confirm`);
        }
    }

    console.log(`📍 TBM: Path preview created - ${turnsNeeded} turn(s), ${apCost} AP this turn`);
    return true;
};

// Calculate multi-turn path segments
CyberOpsGame.prototype.calculateMultiTurnPath = function(path, currentAP) {
    const segments = [];
    let remainingPath = [...path];
    let turnAP = currentAP;
    let turnNumber = 0;

    while (remainingPath.length > 1) {
        const segment = {
            turn: turnNumber,
            tiles: [],
            cost: 0,
            color: this.getTurnColor(turnNumber)
        };

        // Take as many tiles as AP allows
        while (remainingPath.length > 0 && segment.cost < turnAP) {
            const tile = remainingPath.shift();
            segment.tiles.push(tile);
            // Only count cost if there's more path (don't count starting position)
            if (segment.tiles.length > 1) {
                segment.cost++;
            }
        }

        segments.push(segment);

        // If path not complete, prepare for next turn
        if (remainingPath.length > 0) {
            // Add the last tile of this segment as first tile of next (for continuity)
            remainingPath.unshift(segment.tiles[segment.tiles.length - 1]);
            turnNumber++;
            turnAP = this.apConfig[this.currentTurnUnit.type] || 12;
        }
    }

    return segments;
};

// Get color for turn number
CyberOpsGame.prototype.getTurnColor = function(turnNumber) {
    const colors = [
        'rgba(0, 255, 0, 0.5)',   // Turn 0 - Green
        'rgba(255, 255, 0, 0.5)',  // Turn 1 - Yellow
        'rgba(255, 128, 0, 0.5)',  // Turn 2 - Orange
        'rgba(255, 0, 0, 0.5)',    // Turn 3+ - Red
    ];
    return colors[Math.min(turnNumber, colors.length - 1)];
};

// Execute the confirmed movement
CyberOpsGame.prototype.executePendingMovement = function() {
    if (!this.pendingMovement) {
        console.log('❌ TBM: No pending movement to execute');
        return;
    }

    const movement = this.pendingMovement;
    const turnData = this.currentTurnUnit;  // Use currentTurnUnit directly
    const unit = movement.unit;

    console.log('🚀 TBM: Executing pending movement', {
        unit: unit.name,
        segments: movement.segments.length,
        firstSegmentTiles: movement.segments[0]?.tiles.length
    });

    // Get this turn's segment
    const currentSegment = movement.segments[0];
    if (!currentSegment) {
        console.log('❌ TBM: No current segment found');
        return;
    }

    // Set up animated movement
    this.isExecutingMove = true;
    this.moveAnimationQueue = [...currentSegment.tiles];

    // Start animation
    this.animateTurnBasedMovement(unit, () => {
        // Movement complete callback
        console.log('✅ TBM: Movement animation complete');

        // Clear pending movement FIRST to stop rendering old path
        this.pendingMovement = null;
        this.movementMarker = null;
        this.pathPreview = [];
        this.multiTurnPath = [];
        this.isExecutingMove = false;

        // Then deduct AP
        turnData.ap -= currentSegment.cost;
        this.updateTurnBasedAPDisplay();

        // Finally recalculate movement range with new AP
        this.calculateMovementRange(turnData);

        // Log movement
        const moveMsg = `${unit.name || 'Unit'} moved (Cost: ${currentSegment.cost} AP, Remaining: ${turnData.ap}/${turnData.maxAp} AP)`;
        console.log(`🚶 TBM Movement Complete: ${moveMsg}`);
        if (this.logEvent) this.logEvent(moveMsg, 'movement');

        if (this.addNotification) {
            this.addNotification(`Moved ${currentSegment.cost} tiles (${turnData.ap} AP remaining)`);
        }

        // Auto-end turn if no AP left
        if (turnData.ap <= 0) {
            setTimeout(() => this.endTurn(), 500);
        }
    });
};

// Animate movement along path
CyberOpsGame.prototype.animateTurnBasedMovement = function(unit, onComplete) {
    console.log('🎬 TBM: animateTurnBasedMovement called', {
        unit: unit.name,
        queueLength: this.moveAnimationQueue?.length,
        currentPos: { x: unit.x, y: unit.y }
    });

    if (!this.moveAnimationQueue || this.moveAnimationQueue.length === 0) {
        console.log('✅ TBM: Animation queue empty, movement complete');
        if (onComplete) onComplete();
        return;
    }

    // Get next tile in path
    const nextTile = this.moveAnimationQueue[0];
    console.log('🎯 TBM: Moving to next tile', nextTile);

    // Set target for smooth animation
    unit.targetX = nextTile.x;
    unit.targetY = nextTile.y;

    // Use existing movement animation system with game speed multiplier
    // The movement is handled by game-loop.js, we just need to wait for arrival
    const checkArrival = setInterval(() => {
        const dx = Math.abs(unit.x - nextTile.x);
        const dy = Math.abs(unit.y - nextTile.y);

        if (dx < 0.1 && dy < 0.1) {
            // Arrived at tile
            clearInterval(checkArrival);

            // Snap to exact position
            unit.x = nextTile.x;
            unit.y = nextTile.y;
            unit.targetX = undefined;
            unit.targetY = undefined;

            // Remove this tile from queue
            this.moveAnimationQueue.shift();

            // Continue to next tile
            this.animateTurnBasedMovement(unit, onComplete);
        }
    }, 50 / this.gameSpeed); // Adjust check interval based on game speed
};

// Calculate path to target using A* (without smoothing for turn-based)
CyberOpsGame.prototype.calculatePathToTarget = function(unit, targetX, targetY) {
    console.log('📐 TBM: Calculating path', {
        from: { x: Math.round(unit.x), y: Math.round(unit.y) },
        to: { x: targetX, y: targetY },
        hasFindPath: !!this.findPathTurnBased
    });

    // Use turn-based specific pathfinding (every tile matters)
    if (this.findPathTurnBased) {
        const path = this.findPathTurnBased(
            Math.round(unit.x), Math.round(unit.y),
            targetX, targetY
        );
        console.log('📐 TBM: Path found via A*', { length: path?.length });
        return path;
    }

    console.log('⚠️ TBM: Using fallback linear path');
    // Simple line path as fallback
    const path = [];
    const dx = targetX - Math.round(unit.x);
    const dy = targetY - Math.round(unit.y);
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    for (let i = 0; i <= steps; i++) {
        path.push({
            x: Math.round(unit.x) + Math.round(dx * i / steps),
            y: Math.round(unit.y) + Math.round(dy * i / steps)
        });
    }

    return path;
};

// Execute AI turn
CyberOpsGame.prototype.executeAITurn = function(turnData) {
    if (!turnData || !turnData.unit || !turnData.unit.alive) {
        this.endTurn();
        return;
    }

    const enemy = turnData.unit;
    let apUsed = 0;

    // Simple AI: Move towards nearest agent and attack
    const nearestAgent = this.findNearestAgent(enemy);

    if (nearestAgent) {
        const distance = Math.sqrt(
            Math.pow(nearestAgent.x - enemy.x, 2) +
            Math.pow(nearestAgent.y - enemy.y, 2)
        );

        // If in range, attack
        if (distance < 200 && turnData.ap >= this.actionCosts.shoot) {
            // TODO: Implement enemy shooting in turn-based mode
            // For now, just consume AP without shooting
            console.log(`🎯 Enemy would shoot at ${nearestAgent.name} (not implemented)`);
            apUsed += this.actionCosts.shoot;
            turnData.ap -= this.actionCosts.shoot;
            this.updateTurnBasedAPDisplay();
        }

        // If has AP, move closer
        if (turnData.ap > 0 && distance > 100) {
            // Calculate move direction
            const angle = Math.atan2(nearestAgent.y - enemy.y, nearestAgent.x - enemy.x);
            const moveDistance = Math.min(turnData.ap, distance - 100);

            enemy.x += Math.cos(angle) * moveDistance;
            enemy.y += Math.sin(angle) * moveDistance;

            turnData.ap = 0; // Used all remaining AP for movement
            this.updateTurnBasedAPDisplay();
        }
    }

    // End AI turn after delay
    setTimeout(() => this.endTurn(), 1000);
};

// Find nearest agent to enemy
CyberOpsGame.prototype.findNearestAgent = function(enemy) {
    let nearest = null;
    let minDistance = Infinity;

    this.agents.forEach(agent => {
        if (agent.alive) {
            const dist = Math.sqrt(
                Math.pow(agent.x - enemy.x, 2) +
                Math.pow(agent.y - enemy.y, 2)
            );
            if (dist < minDistance) {
                minDistance = dist;
                nearest = agent;
            }
        }
    });

    return nearest;
};

// Turn-based pathfinding that returns EVERY tile (no smoothing)
CyberOpsGame.prototype.findPathTurnBased = function(startX, startY, endX, endY) {
    // Use the existing A* pathfinding
    if (!this.findPath) return null;

    // Temporarily store the smoothPath function
    const originalSmooth = this.smoothPath;

    // Replace with identity function (no smoothing)
    this.smoothPath = function(path) { return path; };

    // Get the full path
    const fullPath = this.findPath(startX, startY, endX, endY);

    // Restore original smoothPath
    this.smoothPath = originalSmooth;

    return fullPath;
};

// Update turn-based preview on mouse move
CyberOpsGame.prototype.updateTurnBasedPreview = function(mouseX, mouseY) {
    if (!this.turnBasedMode || !this.currentTurnUnit) return;

    // Use 1:1 world coordinates
    const tileX = Math.floor(mouseX);
    const tileY = Math.floor(mouseY);

    // Update hovered tile
    this.hoveredTile = {x: tileX, y: tileY};

    // Calculate path preview
    if (this.currentTurnUnit.team === 'player') {
        const unit = this.currentTurnUnit.unit;
        const startX = Math.round(unit.x);
        const startY = Math.round(unit.y);

        // Simple path preview (could use A* for accuracy)
        this.pathPreview = this.calculatePath(startX, startY, tileX, tileY);
    }
};

// Simple path calculation for preview
CyberOpsGame.prototype.calculatePath = function(startX, startY, endX, endY) {
    const path = [];

    // Simple line for now (should use A* pathfinding)
    const dx = endX - startX;
    const dy = endY - startY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) return path;

    const xStep = dx / steps;
    const yStep = dy / steps;

    for (let i = 0; i <= steps; i++) {
        path.push({
            x: Math.round(startX + xStep * i),
            y: Math.round(startY + yStep * i)
        });
    }

    return path;
};

console.log('🎯 Turn-based mode system loaded');