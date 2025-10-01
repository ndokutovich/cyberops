/**
 * Team Command System
 * Manages AI behavior for unselected team members
 */

// Initialize team command system
CyberOpsGame.prototype.initTeamCommands = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameTeamcommands') : null;
    }
    this.teamMode = 'hold'; // Default mode: hold (changed from follow)
    this.patrolPoints = {}; // Store patrol points for each agent
    this.holdPositions = {}; // Store hold positions for each agent
    this.autoFireRange = 5; // Range for automatic firing

    // Set initial hold positions for all agents
    if (this.agents) {
        this.agents.forEach(agent => {
            if (agent.alive) {
                // CRITICAL: Validate agent position before storing as hold position
                const agentX = agent.x !== undefined ? agent.x : 0;
                const agentY = agent.y !== undefined ? agent.y : 0;

                this.holdPositions[agent.id] = {
                    x: agentX,
                    y: agentY
                };

                if (this.logger) {
                    this.logger.debug(`🎯 Initial hold position for ${agent.name || agent.id}: (${agentX}, ${agentY})`);
                }

                // WARN if position is (0,0) - likely a bug
                if (agentX === 0 && agentY === 0) {
                    if (this.logger) this.logger.warn(`⚠️ Agent ${agent.name || agent.id} has position (0,0) at initTeamCommands!`);
                }
            }
        });
    }
};

// Set team mode for unselected agents
CyberOpsGame.prototype.setTeamMode = function(mode) {
    this.teamMode = mode;

    // Update button states
    document.getElementById('holdBtn').style.background = mode === 'hold' ?
        'rgba(0, 150, 255, 0.9)' : 'rgba(0, 100, 200, 0.8)';
    document.getElementById('patrolBtn').style.background = mode === 'patrol' ?
        'rgba(0, 200, 150, 0.9)' : 'rgba(0, 150, 100, 0.8)';
    document.getElementById('followBtn').style.background = mode === 'follow' ?
        'rgba(200, 150, 0, 0.9)' : 'rgba(150, 100, 0, 0.8)';

    // Set positions based on mode
    this.agents.forEach(agent => {
        // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
        if (!this.isAgentSelected(agent) && agent.alive) {
            switch(mode) {
                case 'hold':
                    // Store current position as hold position (not spawn - use where agent currently is)
                    this.holdPositions[agent.id] = {
                        x: agent.x,
                        y: agent.y
                    };
                    agent.targetX = agent.x;
                    agent.targetY = agent.y;
                    if (this.logger) this.logger.debug(`🎯 Hold position set for ${agent.name || agent.id}: (${agent.x}, ${agent.y})`);
                    break;

                case 'patrol':
                    // Set up patrol points around current position
                    this.patrolPoints[agent.id] = [
                        { x: agent.x - 2, y: agent.y - 2 },
                        { x: agent.x + 2, y: agent.y - 2 },
                        { x: agent.x + 2, y: agent.y + 2 },
                        { x: agent.x - 2, y: agent.y + 2 }
                    ];
                    agent.patrolIndex = 0;
                    break;

                case 'follow':
                    // Clear hold and patrol data
                    delete this.holdPositions[agent.id];
                    delete this.patrolPoints[agent.id];
                    break;
            }
        }
    });

    // Log the command
    if (this.logEvent) {
        const modeText = mode === 'hold' ? 'HOLD POSITION' :
                        mode === 'patrol' ? 'PATROL AREA' :
                        'FOLLOW LEADER';
        this.logEvent(`Team command: ${modeText}`, 'command', true);
    }
};

// Update team AI behavior
CyberOpsGame.prototype.updateTeamAI = function() {
    if (!this.agents) return;

    this.agents.forEach(agent => {
        // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
        if (!this.isAgentSelected(agent) && agent.alive) {
            // Check for nearby enemies and auto-fire
            const nearbyEnemy = this.findNearestEnemy(agent);
            if (nearbyEnemy && this.getDistance(agent, nearbyEnemy) <= this.autoFireRange) {
                this.autoFireAtEnemy(agent, nearbyEnemy);
            }

            // Track position before team behavior
            const beforeX = agent.targetX;
            const beforeY = agent.targetY;

            // Execute team mode behavior
            switch(this.teamMode) {
                case 'hold':
                    this.executeHoldBehavior(agent);
                    break;

                case 'patrol':
                    this.executePatrolBehavior(agent);
                    break;

                case 'follow':
                    this.executeFollowBehavior(agent);
                    break;
            }

            // Log if target changed
            if (agent.targetX !== beforeX || agent.targetY !== beforeY) {
                // Only log if positions are defined
                if (this.logger && beforeX !== undefined && beforeY !== undefined && agent.targetX !== undefined && agent.targetY !== undefined) {
                    this.logger.info(`🎯 TeamAI [${this.teamMode}] changed ${agent.name} target: (${beforeX.toFixed(1)}, ${beforeY.toFixed(1)}) → (${agent.targetX.toFixed(1)}, ${agent.targetY.toFixed(1)})`);
                }
            }
        }
    });
};

// Hold position behavior
CyberOpsGame.prototype.executeHoldBehavior = function(agent) {
    const holdPos = this.holdPositions[agent.id];
    if (!holdPos) {
        if (this.logger) this.logger.warn(`⚠️ No hold position for agent ${agent.name} (ID: ${agent.id})`);
        return;
    }

    // WARN if hold position is (0,0) - likely a bug
    if (holdPos.x === 0 && holdPos.y === 0) {
        if (this.logger) {
            this.logger.error(`🚨 HOLD POSITION IS (0,0) for ${agent.name}! Agent at (${agent.x}, ${agent.y})`);
        }
    }

    // Stay at hold position
    agent.targetX = holdPos.x;
    agent.targetY = holdPos.y;

    // Face nearest enemy if any
    const enemy = this.findNearestEnemy(agent);
    if (enemy) {
        agent.facingAngle = Math.atan2(enemy.y - agent.y, enemy.x - agent.x);
    }
};

// Patrol behavior
CyberOpsGame.prototype.executePatrolBehavior = function(agent) {
    const patrolPoints = this.patrolPoints[agent.id];
    if (!patrolPoints || patrolPoints.length === 0) return;

    // Check if reached current patrol point
    const currentPoint = patrolPoints[agent.patrolIndex || 0];
    const dist = this.getDistance(agent, currentPoint);

    if (dist < 0.5) {
        // Move to next patrol point
        agent.patrolIndex = ((agent.patrolIndex || 0) + 1) % patrolPoints.length;
        const nextPoint = patrolPoints[agent.patrolIndex];
        agent.targetX = nextPoint.x;
        agent.targetY = nextPoint.y;
    } else {
        // Continue to current patrol point
        agent.targetX = currentPoint.x;
        agent.targetY = currentPoint.y;
    }
};

// Follow behavior (existing squad following logic)
CyberOpsGame.prototype.executeFollowBehavior = function(agent) {
    // Find selected leader
    // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
    const leader = this.agents.find(a => this.isAgentSelected(a) && a.alive);
    if (!leader) return;

    // Follow at a distance
    const followDistance = 2;
    const dx = leader.x - agent.x;
    const dy = leader.y - agent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > followDistance) {
        // Move closer to leader
        const moveRatio = (dist - followDistance) / dist;
        agent.targetX = agent.x + dx * moveRatio;
        agent.targetY = agent.y + dy * moveRatio;
    }
};

// Auto-fire at enemy
CyberOpsGame.prototype.autoFireAtEnemy = function(agent, enemy) {
    // Check if can fire (cooldown)
    if (!agent.lastAutoFire) agent.lastAutoFire = 0;

    const currentTime = Date.now();
    if (currentTime - agent.lastAutoFire < 1000) return; // 1 second cooldown

    // Calculate damage using GameServices for equipped weapon bonuses
    let damage = agent.damage || 10;
    if (window.GameServices && window.GameServices.calculateAttackDamage) {
        damage = window.GameServices.calculateAttackDamage(
            agent,
            enemy,
            { distance: this.getDistance(agent, enemy) }
        );
    }

    // Create projectile with proper agent references for logging
    this.projectiles.push({
        x: agent.x,
        y: agent.y,
        targetX: enemy.x,
        targetY: enemy.y,
        targetEnemy: enemy,
        damage: damage,  // Use calculated damage with equipment
        speed: 0.3,
        owner: agent.id,
        shooter: agent,  // Added for combat logging
        agent: agent,    // Added for logCombatHit compatibility
        hostile: false
    });

    agent.lastAutoFire = currentTime;

    // Log the auto-fire
    this.logEvent(`${agent.name} auto-engaged enemy`, 'combat');
};

// Find nearest enemy to agent
CyberOpsGame.prototype.findNearestEnemy = function(agent) {
    if (!this.enemies) return null;

    let nearest = null;
    let minDist = Infinity;

    this.enemies.forEach(enemy => {
        if (enemy.alive) {
            const dist = this.getDistance(agent, enemy);
            if (dist < minDist && this.hasLineOfSight(agent.x, agent.y, enemy.x, enemy.y)) {
                minDist = dist;
                nearest = enemy;
            }
        }
    });

    return nearest;
};

// Calculate distance between two points
CyberOpsGame.prototype.getDistance = function(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

// Keyboard shortcuts for team commands
CyberOpsGame.prototype.handleTeamCommandKeys = function(key) {
    switch(key.toUpperCase()) {
        case 'H':
            this.setTeamMode('hold');
            break;
        case 'P':
            this.setTeamMode('patrol');
            break;
        case 'F':
            if (!this.keys['Shift']) { // Don't interfere with shoot action
                this.setTeamMode('follow');
            }
            break;
    }
};

// Visual indicators for team mode
CyberOpsGame.prototype.drawTeamModeIndicators = function(ctx) {
    if (!this.agents) return;

    ctx.save();

    this.agents.forEach(agent => {
        // UNIDIRECTIONAL: Use isAgentSelected() instead of checking .selected flag
        if (!this.isAgentSelected(agent) && agent.alive) {
            const screenPos = this.worldToIsometric(agent.x, agent.y);

            // Draw mode indicator
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';

            switch(this.teamMode) {
                case 'hold':
                    ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
                    ctx.fillText('HOLD', screenPos.x, screenPos.y - 40);

                    // Draw hold position circle
                    const holdPos = this.holdPositions[agent.id];
                    if (holdPos) {
                        const holdScreen = this.worldToIsometric(holdPos.x, holdPos.y);
                        ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(holdScreen.x, holdScreen.y, 20, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;

                case 'patrol':
                    ctx.fillStyle = 'rgba(0, 255, 100, 0.8)';
                    ctx.fillText('PATROL', screenPos.x, screenPos.y - 40);

                    // Draw patrol path
                    const patrolPoints = this.patrolPoints[agent.id];
                    if (patrolPoints && patrolPoints.length > 0) {
                        ctx.strokeStyle = 'rgba(0, 255, 100, 0.3)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        patrolPoints.forEach((point, index) => {
                            const pointScreen = this.worldToIsometric(point.x, point.y);
                            if (index === 0) {
                                ctx.moveTo(pointScreen.x, pointScreen.y);
                            } else {
                                ctx.lineTo(pointScreen.x, pointScreen.y);
                            }
                        });
                        ctx.closePath();
                        ctx.stroke();
                    }
                    break;

                case 'follow':
                    ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
                    ctx.fillText('FOLLOW', screenPos.x, screenPos.y - 40);
                    break;
            }
        }
    });

    ctx.restore();
};