    // Game Loop
CyberOpsGame.prototype.gameLoop = function() {
        requestAnimationFrame(() => this.gameLoop());

        // Update FPS counter
        this.updateFPS();

        if (this.currentScreen === 'game' && !this.isPaused) {
            // Run update multiple times based on game speed
            const updateCount = Math.floor(this.gameSpeed);
            for (let i = 0; i < updateCount; i++) {
                this.update();
                // Update 3D if in 3D mode
                if (this.is3DMode) {
                    this.update3D();
                    this.update3DCamera();
                    this.sync3DTo2D();
                }
            }

            // Check for nearby enemies and auto-slowdown
            this.checkAutoSlowdown();

            // Update music system based on game state
            if (this.musicSystem && this.musicSystem.config) {
                this.updateMusicState();
            }
        }

        if (this.currentScreen === 'game') {
            if (this.is3DMode) {
                this.render3D();
                this.update3DHUD();
            } else {
                this.render();
            }
        }
}

// FPS Counter
CyberOpsGame.prototype.updateFPS = function() {
        this.frameCount++;
        const now = Date.now();
        const delta = now - this.lastFpsUpdate;

        if (delta >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / delta);
            this.frameCount = 0;
            this.lastFpsUpdate = now;
        }
}
    
// Collision detection helper
CyberOpsGame.prototype.isWalkable = function(x, y) {
        // Check map bounds
        if (x < 0 || x >= this.map.width || y < 0 || y >= this.map.height) {
            return false;
        }

        // Check tile - 0 is walkable, 1 is wall
        const tileX = Math.floor(x);
        const tileY = Math.floor(y);

        // Safety check for array access
        if (!this.map.tiles[tileY] || this.map.tiles[tileY][tileX] === undefined) {
            return false;
        }

        // Check if this is an unlocked door position
        if (this.map.doors) {
            for (let door of this.map.doors) {
                // Check if we're at a door position (with some tolerance for floating point)
                const atDoor = Math.abs(door.x - tileX) < 1 && Math.abs(door.y - tileY) < 1;
                if (atDoor && !door.locked) {
                    // Unlocked door - allow passage
                    return true;
                }
            }
        }

        return this.map.tiles[tileY][tileX] === 0;
}

// Movement is always with pathfinding - no simple movement fallback

CyberOpsGame.prototype.canMoveTo = function(fromX, fromY, toX, toY) {
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

CyberOpsGame.prototype.update = function() {
        // Update visual effects FIRST (including freeze timers)
        if (this.updateVisualEffects) {
            this.updateVisualEffects(16.67); // ~60 FPS in milliseconds
        }

        // Check if frozen AFTER updating effects
        if (this.isFreezeActive && this.isFreezeActive()) {
            return; // Skip game update while frozen
        }

        this.missionTimer++;
        const seconds = Math.floor(this.missionTimer / 60);

        // Update team AI for unselected agents
        if (this.updateTeamAI) {
            this.updateTeamAI();
        }
        const minutes = Math.floor(seconds / 60);
        document.getElementById('missionTimer').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

        // Update fog of war
        this.updateFogOfWar();

        // Update agents
        this.agents.forEach(agent => {
            if (!agent.alive) return;

            // Initialize facing angle if not set
            if (agent.facingAngle === undefined) {
                agent.facingAngle = Math.PI / 2; // Default facing down
            }

            // In 3D mode, make non-controlled agents follow the player (if enabled)
            if (this.is3DMode && this.squadFollowing !== false && this._selectedAgent && agent !== this._selectedAgent) {
                // Calculate distance to leader
                const leaderDist = Math.sqrt(
                    Math.pow(agent.x - this._selectedAgent.x, 2) +
                    Math.pow(agent.y - this._selectedAgent.y, 2)
                );

                // Only update target if too far from leader (to avoid constant movement)
                if (leaderDist > 5) {
                    // Set follow target with offset for formation
                    const followDist = 2.5; // Distance to maintain from leader
                    const index = this.agents.filter(a => a.alive).indexOf(agent);
                    const squadSize = this.agents.filter(a => a.alive).length - 1;

                    // Create formation behind the leader based on their facing
                    const leaderFacing = this._selectedAgent.facingAngle || 0;
                    const formationAngle = leaderFacing + Math.PI; // Behind the leader

                    // Spread agents in a line formation behind leader
                    const offsetAngle = formationAngle + (Math.PI / 4) * ((index / squadSize) - 0.5);

                    // Calculate formation position
                    agent.targetX = this._selectedAgent.x + Math.cos(offsetAngle) * followDist;
                    agent.targetY = this._selectedAgent.y + Math.sin(offsetAngle) * followDist;
                } else if (leaderDist < 2) {
                    // Too close, stop moving
                    agent.targetX = agent.x;
                    agent.targetY = agent.y;
                }
            }

            // Check for waypoints first
            if (this.agentWaypoints && this.agentWaypoints[agent.id] && this.agentWaypoints[agent.id].length > 0) {
                const waypoints = this.agentWaypoints[agent.id];
                const currentWaypoint = waypoints[0];

                // Set target to current waypoint
                agent.targetX = currentWaypoint.x;
                agent.targetY = currentWaypoint.y;

                // Check if we've reached the waypoint
                const wpDx = currentWaypoint.x - agent.x;
                const wpDy = currentWaypoint.y - agent.y;
                const wpDist = Math.sqrt(wpDx * wpDx + wpDy * wpDy);

                if (wpDist < 0.5) {
                    // Reached waypoint, remove it and move to next
                    waypoints.shift();

                    // Update the main waypoints array reference
                    this.agentWaypoints[agent.id] = waypoints;

                    if (agent.selected) {
                        console.log(`✅ ${agent.name} reached waypoint, ${waypoints.length} remaining`);
                    }

                    // If there are more waypoints, update target to next one
                    if (waypoints.length > 0) {
                        agent.targetX = waypoints[0].x;
                        agent.targetY = waypoints[0].y;
                        console.log(`📍 Moving to next waypoint: (${waypoints[0].x.toFixed(1)}, ${waypoints[0].y.toFixed(1)})`);
                    }
                }
            }

            // Check for auto-hack when agent reaches terminal
            if (agent.autoHackTarget) {
                const hackDist = Math.sqrt(
                    Math.pow(agent.autoHackTarget.x - agent.x, 2) +
                    Math.pow(agent.autoHackTarget.y - agent.y, 2)
                );

                if (hackDist <= 1.5) {
                    // Reached terminal, hack it
                    if (!agent.autoHackTarget.hacked) {
                        agent.autoHackTarget.hacked = true;
                        this.hackedTerminals++;
                        this.addNotification("🖥️ Terminal hacked!");

                        // Play hack sound if available
                        if (this.playSound) {
                            this.playSound('hack');
                        }
                    }
                    agent.autoHackTarget = null; // Clear auto-hack flag
                }
            }

            // Check for auto-bomb when agent reaches explosive target
            if (agent.autoBombTarget) {
                const bombDist = Math.sqrt(
                    Math.pow(agent.autoBombTarget.x - agent.x, 2) +
                    Math.pow(agent.autoBombTarget.y - agent.y, 2)
                );

                if (bombDist <= 1.5) {
                    // Reached target, plant bomb
                    if (!agent.autoBombTarget.destroyed) {
                        agent.autoBombTarget.destroyed = true;
                        this.destroyedTargets = (this.destroyedTargets || 0) + 1;
                        this.addNotification("💣 Explosive planted!");

                        // Play bomb sound if available
                        if (this.playSound) {
                            this.playSound('explosion');
                        }

                        // Create explosion effect
                        if (this.createExplosion) {
                            this.createExplosion(agent.autoBombTarget.x, agent.autoBombTarget.y);
                        }
                    }
                    agent.autoBombTarget = null; // Clear auto-bomb flag
                }
            }

            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                // Always use pathfinding
                this.moveAgentWithPathfinding(agent);
            }
            // Agent is standing still - keep last facing direction

            // Check for collectable pickup
            if (this.map.collectables) {
                this.map.collectables.forEach(item => {
                    if (!item.collected) {
                        const dist = Math.sqrt(
                            Math.pow(item.x - agent.x, 2) +
                            Math.pow(item.y - agent.y, 2)
                        );
                        if (dist < 1) {
                            item.collected = true;
                            this.handleCollectablePickup(agent, item);
                            // Log item collection
                            if (this.logItemCollected) this.logItemCollected(agent, item);
                        }
                    }
                });
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
                    // Update facing angle when chasing
                    enemy.facingAngle = Math.atan2(dy, dx);

                    const moveSpeed = enemy.speed / 60;
                    const moveX = (dx / dist) * moveSpeed;
                    const moveY = (dy / dist) * moveSpeed;

                    const newX = enemy.x + moveX;
                    const newY = enemy.y + moveY;

                    // Check collision before moving
                    if (this.canMoveTo(enemy.x, enemy.y, newX, newY)) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Try to slide along walls
                        if (this.canMoveTo(enemy.x, enemy.y, newX, enemy.y)) {
                            enemy.x = newX;
                            enemy.facingAngle = dx > 0 ? 0 : Math.PI;
                        } else if (this.canMoveTo(enemy.x, enemy.y, enemy.x, newY)) {
                            enemy.y = newY;
                            enemy.facingAngle = dy > 0 ? Math.PI/2 : -Math.PI/2;
                        }
                    }
                } else {
                    enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.5);
                }
            } else {
                if (Math.random() < 0.01) {
                    // Generate new target position that is walkable
                    let attempts = 0;
                    let newTargetX, newTargetY;
                    do {
                        newTargetX = enemy.x + (Math.random() - 0.5) * 5;
                        newTargetY = enemy.y + (Math.random() - 0.5) * 5;
                        attempts++;
                    } while (!this.isWalkable(newTargetX, newTargetY) && attempts < 10);

                    if (attempts < 10) {
                        enemy.targetX = newTargetX;
                        enemy.targetY = newTargetY;
                    }
                }

                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0.1) {
                    // Update facing angle when patrolling
                    enemy.facingAngle = Math.atan2(dy, dx);

                    const moveSpeed = enemy.speed / 120;
                    const moveX = (dx / dist) * moveSpeed;
                    const moveY = (dy / dist) * moveSpeed;

                    const newX = enemy.x + moveX;
                    const newY = enemy.y + moveY;

                    // Check collision before moving
                    if (this.canMoveTo(enemy.x, enemy.y, newX, newY)) {
                        enemy.x = newX;
                        enemy.y = newY;
                    } else {
                        // Try to slide along walls
                        if (this.canMoveTo(enemy.x, enemy.y, newX, enemy.y)) {
                            enemy.x = newX;
                            enemy.facingAngle = dx > 0 ? 0 : Math.PI;
                        } else if (this.canMoveTo(enemy.x, enemy.y, enemy.x, newY)) {
                            enemy.y = newY;
                            enemy.facingAngle = dy > 0 ? Math.PI/2 : -Math.PI/2;
                        } else {
                            // If stuck, pick a new target
                            enemy.targetX = enemy.x;
                            enemy.targetY = enemy.y;
                        }
                    }
                }
            }
            
            // Check vision
            this.agents.forEach(agent => {
                if (!agent.alive) return;
                const dist = Math.sqrt(
                    Math.pow(agent.x - enemy.x, 2) + 
                    Math.pow(agent.y - enemy.y, 2)
                );
                
                // Apply stealth bonuses to reduce detection range
                const effectiveVisionRange = this.getStealthDetectionRange(agent);
                
                if (dist < effectiveVisionRange) {
                    enemy.alertLevel = 100;
                    enemy.targetX = agent.x;
                    enemy.targetY = agent.y;
                    
                    if (Math.random() < 0.02 && dist < 5) {
                        // Calculate damage using GameServices if available
                        let damage = enemy.damage;
                        if (window.GameServices && window.GameServices.formulaService) {
                            damage = window.GameServices.formulaService.calculateDamage(
                                enemy.damage || 10,
                                0, // No weapon bonus for enemies
                                0, // No research bonus for enemies
                                0, // Armor calculated on impact
                                { distance: dist }
                            );
                        }

                        this.projectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            targetX: agent.x,
                            targetY: agent.y,
                            targetAgent: agent, // Store the specific target agent
                            damage: damage,
                            speed: 0.3,
                            owner: enemy.id,
                            hostile: true
                        });
                    }
                }
            });
        });

        // Update NPCs (only if function exists)
        if (this.updateNPCs) {
            this.updateNPCs();
        }

        // Update projectiles
        this.projectiles = this.projectiles.filter(proj => {
            const dx = proj.targetX - proj.x;
            const dy = proj.targetY - proj.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 0.5) {
                if (proj.hostile) {
                    // Find the specific target agent
                    if (proj.targetAgent) {
                        // Damage only the specific target
                        const agent = proj.targetAgent;
                        if (agent && agent.alive) {
                            let actualDamage = proj.damage;

                            // Apply protection bonus from equipment
                            if (agent.protection) {
                                actualDamage = Math.max(1, actualDamage - agent.protection);
                            }

                            if (agent.shield > 0) {
                                agent.shield -= actualDamage;
                            } else {
                                agent.health -= actualDamage;
                                if (agent.health <= 0) {
                                    agent.alive = false;
                                    // Log agent death
                                    if (this.logDeath) this.logDeath(agent);
                                } else {
                                    // Log hit - use projectile owner or generic enemy
                                    if (this.logCombatHit) {
                                        const attacker = proj.owner ?
                                            this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy' } :
                                            { name: 'Enemy' };
                                        this.logCombatHit(attacker, agent, actualDamage);
                                    }
                                }
                            }
                            // Play hit sound
                            this.playSound('hit', 0.3);
                        }
                    } else {
                        // Fallback: find closest agent to impact point
                        let closestAgent = null;
                        let closestDist = Infinity;
                        this.agents.forEach(agent => {
                            const hitDist = Math.sqrt(
                                Math.pow(agent.x - proj.targetX, 2) +
                                Math.pow(agent.y - proj.targetY, 2)
                            );
                            if (hitDist < 1 && hitDist < closestDist) {
                                closestDist = hitDist;
                                closestAgent = agent;
                            }
                        });

                        if (closestAgent) {
                            let actualDamage = proj.damage;

                            // Apply protection
                            if (closestAgent.protection) {
                                actualDamage = Math.max(1, actualDamage - closestAgent.protection);
                            }
                            if (closestAgent.shield > 0) {
                                closestAgent.shield -= actualDamage;
                            } else {
                                closestAgent.health -= actualDamage;
                                if (closestAgent.health <= 0) {
                                    closestAgent.alive = false;
                                    // Log agent death
                                    if (this.logDeath) this.logDeath(closestAgent);
                                } else {
                                    // Log hit - use projectile owner or generic enemy
                                    if (this.logCombatHit) {
                                        const attacker = proj.owner ?
                                            this.enemies.find(e => e.id === proj.owner) || { name: 'Enemy' } :
                                            { name: 'Enemy' };
                                        this.logCombatHit(attacker, closestAgent, actualDamage);
                                    }
                                }
                            }
                            // Play hit sound
                            this.playSound('hit', 0.3);
                        }
                    }
                } else {
                    // Player projectile hitting enemy
                    if (proj.targetEnemy) {
                        // Damage only the specific target enemy
                        const enemy = proj.targetEnemy;
                        if (enemy && enemy.alive) {
                            // Use GameServices to calculate actual damage if available
                            let actualDamage = proj.damage;
                            if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                actualDamage = window.GameServices.calculateAttackDamage(
                                    proj.agent || { damage: proj.damage },
                                    enemy,
                                    { distance: 0 }
                                );
                            }

                            enemy.health -= actualDamage;
                            if (enemy.health <= 0) {
                                enemy.alive = false;
                                this.totalEnemiesDefeated++;

                                // Track enemy elimination for mission objectives
                                if (this.onEnemyEliminated) {
                                    this.onEnemyEliminated(enemy);
                                }

                                // Log enemy death
                                if (this.logDeath) this.logDeath(enemy);
                            } else {
                                // Log hit
                                if (this.logCombatHit) this.logCombatHit(proj.agent || { name: 'Agent' }, enemy, actualDamage);
                            }
                            // Play hit sound
                            this.playSound('hit', 0.3);
                        }
                    } else {
                        // Fallback: find closest enemy to impact point
                        let closestEnemy = null;
                        let closestDist = Infinity;
                        this.enemies.forEach(enemy => {
                            const hitDist = Math.sqrt(
                                Math.pow(enemy.x - proj.targetX, 2) +
                                Math.pow(enemy.y - proj.targetY, 2)
                            );
                            if (hitDist < 1 && hitDist < closestDist) {
                                closestDist = hitDist;
                                closestEnemy = enemy;
                            }
                        });

                        if (closestEnemy) {
                            // Use GameServices to calculate actual damage if available
                            let actualDamage = proj.damage;
                            if (window.GameServices && window.GameServices.calculateAttackDamage) {
                                actualDamage = window.GameServices.calculateAttackDamage(
                                    proj.agent || { damage: proj.damage },
                                    closestEnemy,
                                    { distance: 0 }
                                );
                            }

                            closestEnemy.health -= actualDamage;
                            if (closestEnemy.health <= 0) {
                                closestEnemy.alive = false;
                                this.totalEnemiesDefeated++;
                                // Log enemy death
                                if (this.logDeath) this.logDeath(closestEnemy);
                            } else {
                                // Log hit
                                if (this.logCombatHit) {
                                    const attacker = proj.agent || { name: 'Agent' };
                                    this.logCombatHit(attacker, closestEnemy, actualDamage);
                                }
                            }
                            // Play hit sound
                            this.playSound('hit', 0.3);
                        }
                    }
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
    
CyberOpsGame.prototype.checkMissionStatus = function() {
        const aliveAgents = this.agents.filter(a => a.alive).length;
        const aliveEnemies = this.enemies.filter(e => e.alive).length;
        const deadEnemies = this.enemies.filter(e => !e.alive).length;

        // Track objective status for mission complete modal
        if (!this.objectiveStatus) {
            this.objectiveStatus = {};
        }

        if (aliveAgents === 0) {
            this.endMission(false);
            return;
        }
        
        // Use the new mission system to check objectives
        if (this.checkMissionObjectives) {
            // New comprehensive mission system handles everything
            this.checkMissionObjectives();
        }
}

CyberOpsGame.prototype.checkExtractionPoint = function() {
    if (!this.map || !this.map.extraction) return;

    // Check if extraction is enabled (all objectives complete)
    if (!this.extractionEnabled) return;

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

CyberOpsGame.prototype.endMission = function(victory) {
        // Clean up music system but keep music playing
        if (this.musicSystem && victory) {
            this.playVictoryMusic();
        }
        console.log('🎵 Music continues after mission end');

        this.isPaused = true;

        // Switch to tactical view before showing end dialog
        if (this.is3DMode) {
            console.log('📐 Switching to tactical view for mission end');
            this.cameraMode = 'tactical';
            this.disable3DMode();
        }

        // Release pointer lock so player can interact with dialogs
        if (document.pointerLockElement) {
            console.log('🔓 Releasing pointer lock for mission end dialog');
            document.exitPointerLock();
        }

        // Handle fallen agents - move dead agents to Hall of Glory
        const fallenThisMission = [];
        this.agents.forEach(agent => {
            if (!agent.alive) {
                // Find the original agent data
                const originalAgent = this.activeAgents.find(a => a.name === agent.name);
                if (originalAgent) {
                    // Add to fallen with mission details
                    this.fallenAgents.push({
                        ...originalAgent,
                        fallenInMission: this.currentMission.title,
                        missionId: this.currentMission.id,
                        deathDate: new Date().toISOString(),
                        finalWords: this.generateFinalWords(originalAgent.name)
                    });
                    fallenThisMission.push(originalAgent.name);

                    // Remove from active roster
                    const index = this.activeAgents.indexOf(originalAgent);
                    if (index > -1) {
                        this.activeAgents.splice(index, 1);
                    }
                }
            }
        });

        if (fallenThisMission.length > 0) {
            console.log(`⚰️ Agents fallen in battle: ${fallenThisMission.join(', ')}`);
            console.log(`📜 Added to Hall of Glory. Active agents remaining: ${this.activeAgents.length}`);
        }

        // Update campaign statistics and rewards
        if (victory) {
            this.totalCampaignTime += this.missionTimer;
            // Count actual enemies defeated in this mission
            this.totalEnemiesDefeated += this.enemies.filter(e => !e.alive).length;

            // Add to completed missions
            if (!this.completedMissions.includes(this.currentMission.id)) {
                this.completedMissions.push(this.currentMission.id);

                // Generate 2 new agents available for hire after each completed mission
                this.generateNewAgentsForHire();
            }

            // Award mission rewards
            if (this.currentMission.rewards) {
                this.credits += this.currentMission.rewards.credits || 0;
                this.researchPoints += this.currentMission.rewards.researchPoints || 0;
                this.worldControl += this.currentMission.rewards.worldControl || 0;

                // Cap world control at 100%
                if (this.worldControl > 100) this.worldControl = 100;
            }
        }
        
        // Show intermission dialog instead of end screen
        setTimeout(() => {
            this.showIntermissionDialog(victory);
        }, 1000); // Brief delay for dramatic effect
}

// Unlock intel reports based on collection
CyberOpsGame.prototype.unlockIntelReport = function() {
    if (!this.unlockedIntelReports) this.unlockedIntelReports = [];

    // Define intel reports that unlock at certain thresholds
    const intelReports = [
        { threshold: 1, id: 'first', title: 'ENEMY PATROL ROUTES', content: 'Guards follow predictable patterns. Use this to your advantage.' },
        { threshold: 3, id: 'basic', title: 'SECURITY PROTOCOLS', content: 'Terminal hacking detected. Increased firewall protection on main servers.' },
        { threshold: 5, id: 'weapons', title: 'WEAPON SHIPMENTS', content: 'New military-grade weapons arriving. Expect heavier resistance.' },
        { threshold: 8, id: 'command', title: 'COMMAND STRUCTURE', content: 'Enemy leadership identified. High-value targets marked for elimination.' },
        { threshold: 10, id: 'fortress', title: 'FORTRESS BLUEPRINTS', content: 'Structural weaknesses found in enemy stronghold. Multiple entry points available.' },
        { threshold: 15, id: 'master', title: 'MASTER PLAN', content: 'Enemy preparing major offensive. Strike first or face overwhelming force.' },
        { threshold: 20, id: 'ultimate', title: 'PROJECT OMEGA', content: 'Top secret weapon system discovered. Must be destroyed at all costs.' }
    ];

    // Check which reports to unlock
    intelReports.forEach(report => {
        if (this.totalIntelCollected >= report.threshold) {
            if (!this.unlockedIntelReports.find(r => r.id === report.id)) {
                this.unlockedIntelReports.push(report);
                console.log(`🔓 NEW INTEL REPORT UNLOCKED: ${report.title}`);
            }
        }
    });
};

// Generate final words for fallen agents
CyberOpsGame.prototype.generateFinalWords = function(agentName) {
        const finalWords = [
            "Tell my family... I fought for freedom...",
            "It was... an honor... serving with you...",
            "Don't let them... win...",
            "Keep fighting... for all of us...",
            "The mission... must continue...",
            "Remember me... when you win...",
            "I regret... nothing...",
            "This is... a good death...",
            "Avenge... me...",
            "The Syndicate... lives on..."
        ];

        return finalWords[Math.floor(Math.random() * finalWords.length)];
}

// Generate new agents available for hire after mission completion
CyberOpsGame.prototype.generateNewAgentsForHire = function() {
    const firstNames = ['Marcus', 'Elena', 'Viktor', 'Sophia', 'Dmitri', 'Aria', 'Kane', 'Nova', 'Rex', 'Luna'];
    const lastNames = ['Stone', 'Black', 'Wolf', 'Steel', 'Cross', 'Hawk', 'Frost', 'Storm', 'Viper', 'Phoenix'];
    const callsigns = ['Reaper', 'Phantom', 'Striker', 'Wraith', 'Razor', 'Specter', 'Thunder', 'Shadow', 'Venom', 'Blade'];

    const specializations = [
        { type: 'stealth', skills: ['stealth', 'melee'], health: 85, speed: 5, damage: 20 },
        { type: 'hacker', skills: ['hacker', 'electronics'], health: 75, speed: 4, damage: 15 },
        { type: 'assault', skills: ['assault', 'heavy_weapons'], health: 130, speed: 3, damage: 28 },
        { type: 'sniper', skills: ['sniper', 'stealth'], health: 90, speed: 4, damage: 38 },
        { type: 'demolition', skills: ['demolition', 'assault'], health: 115, speed: 3, damage: 25 },
        { type: 'medic', skills: ['medic', 'support'], health: 100, speed: 4, damage: 18 }
    ];

    // Generate 2 new agents
    for (let i = 0; i < 2; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const callsign = callsigns[Math.floor(Math.random() * callsigns.length)];
        const spec = specializations[Math.floor(Math.random() * specializations.length)];

        const newAgent = {
            id: this.availableAgents.length + 1,
            name: `${firstName} "${callsign}" ${lastName}`,
            specialization: spec.type,
            skills: spec.skills,
            cost: 1000 + Math.floor(Math.random() * 500) + (this.completedMissions.length * 100),
            hired: false,
            health: spec.health + Math.floor(Math.random() * 20) - 10,
            speed: spec.speed,
            damage: spec.damage + Math.floor(Math.random() * 10) - 5
        };

        this.availableAgents.push(newAgent);
        console.log(`🆕 New agent available for hire: ${newAgent.name} (${newAgent.specialization})`);
    }

    // Log event
    if (this.logEvent) {
        this.logEvent('🆕 2 new agents are available for hire at the Hub!', 'system');
    }
}

// Handle collectable item pickup
CyberOpsGame.prototype.handleCollectablePickup = function(agent, item) {
    // Log the item pickup if event logging is enabled
    if (this.logItemPickup) {
        this.logItemPickup(agent, item);
    }

    // Track items collected this mission
    if (this.itemsCollectedThisMission && item.type) {
        this.itemsCollectedThisMission[item.type] = (this.itemsCollectedThisMission[item.type] || 0) + 1;
    }

    // Use GameServices for collectible calculations
    if (window.GameServices && window.GameServices.formulaService) {
        const effects = window.GameServices.formulaService.calculateCollectibleEffect(
            item,
            agent,
            {
                averageHealth: this.calculateAverageHealth ? this.calculateAverageHealth() : 100,
                lowAmmo: this.isLowOnAmmo ? this.isLowOnAmmo() : false,
                difficulty: this.currentDifficulty || 1
            }
        );

        // Apply effects
        if (effects.credits > 0) {
            this.credits += effects.credits;
            this.creditsThisMission = (this.creditsThisMission || 0) + effects.credits;
        }
        if (effects.health > 0) {
            agent.health = Math.min(agent.maxHealth, agent.health + effects.health);
        }
        if (effects.armor > 0) {
            agent.protection = (agent.protection || 0) + effects.armor;
        }
        if (effects.researchPoints > 0) {
            this.researchPoints += effects.researchPoints;
            this.researchPointsThisMission = (this.researchPointsThisMission || 0) + effects.researchPoints;

            // Track intel statistics if this was an intel item
            if (item.type === 'intel') {
                this.totalIntelCollected = (this.totalIntelCollected || 0) + 1;
                this.intelThisMission = (this.intelThisMission || 0) + 1;

                // Track intel by mission
                if (this.currentMission) {
                    const missionId = this.currentMission.id;
                    if (!this.intelByMission) this.intelByMission = {};
                    this.intelByMission[missionId] = (this.intelByMission[missionId] || 0) + 1;
                    console.log(`📁 Intel tracked for Mission ${missionId}: ${this.intelByMission[missionId]}`);
                }

                // Unlock intel reports based on collection
                this.unlockIntelReport();

                console.log(`📊 Total Intel: ${this.totalIntelCollected} documents`);
                console.log(`📋 Intel this mission: ${this.intelThisMission}`);
            }
        }
        if (effects.ammo > 0) {
            // Reset ability cooldowns
            agent.cooldowns = agent.cooldowns || [0, 0, 0, 0];
            agent.cooldowns[0] = Math.max(0, agent.cooldowns[0] - effects.ammo);
        }
        if (effects.explosives > 0) {
            agent.grenades = (agent.grenades || 0) + effects.explosives;
        }
        if (effects.keycard) {
            this.keycards = this.keycards || [];
            this.keycards.push(effects.keycard);
        }

        // Show message
        if (effects.message) {
            console.log(effects.message);
        }

        return;
    }

    // Collectables removed - all rewards come from mission completion
    console.warn('⚠️ Old collectable system called but no longer supported');

    // Visual feedback
    this.effects.push({
        type: 'pickup',
        x: item.x,
        y: item.y,
        text: item.type.toUpperCase(),
        duration: 30,
        frame: 0
    });
};

// Helper function to calculate average health of agents
CyberOpsGame.prototype.calculateAverageHealth = function() {
    if (!this.agents || this.agents.length === 0) return 100;

    const aliveAgents = this.agents.filter(a => a.alive);
    if (aliveAgents.length === 0) return 0;

    const totalHealth = aliveAgents.reduce((sum, agent) => sum + agent.health, 0);
    const totalMaxHealth = aliveAgents.reduce((sum, agent) => sum + (agent.maxHealth || 100), 0);

    return Math.floor((totalHealth / totalMaxHealth) * 100);
};

// Helper function to check if agents are low on ammo
CyberOpsGame.prototype.isLowOnAmmo = function() {
    if (!this.agents || this.agents.length === 0) return false;

    // Check if any agent has high cooldowns (indicating low ammo)
    return this.agents.some(agent => {
        if (!agent.cooldowns) return false;
        const avgCooldown = agent.cooldowns.reduce((a, b) => a + b, 0) / agent.cooldowns.length;
        return avgCooldown > 30; // Consider low ammo if cooldowns are high
    });
}

// Game speed control functions
CyberOpsGame.prototype.setGameSpeed = function(speed) {
    if (this.gameSpeed !== speed) {
        this.gameSpeed = speed; // Actually change the speed!
        this.targetGameSpeed = speed;
        this.lastSpeedChangeTime = Date.now();
        this.speedIndicatorFadeTime = 3000; // Show indicator for 3 seconds
        console.log(`⚡ Game speed changed to ${speed}x`);
    }
};

CyberOpsGame.prototype.cycleGameSpeed = function() {
    // Cycle through 1x -> 2x -> 4x -> 8x -> 16x -> 1x
    const speeds = [1, 2, 4, 8, 16];
    const currentIndex = speeds.indexOf(this.gameSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    this.setGameSpeed(speeds[nextIndex]);
};

CyberOpsGame.prototype.checkAutoSlowdown = function() {
    if (!this.agents || !this.enemies) return;

    // Check if any living enemy is near any living agent
    let enemyNearby = false;

    for (const agent of this.agents) {
        if (!agent.alive) continue;

        for (const enemy of this.enemies) {
            if (!enemy.alive) continue;

            const dx = agent.x - enemy.x;
            const dy = agent.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.autoSlowdownRange) {
                enemyNearby = true;
                break;
            }
        }
        if (enemyNearby) break;
    }

    // Auto-adjust speed based on enemy proximity
    if (enemyNearby && this.gameSpeed > 1) {
        // Slow down to 1x when enemies are near
        this.gameSpeed = 1;
        this.targetGameSpeed = 1;
        console.log('⚠️ Enemy detected - slowing to 1x speed');
        this.speedIndicatorFadeTime = 2000;
    } else if (!enemyNearby && this.targetGameSpeed > 1 && this.gameSpeed === 1) {
        // Speed back up when enemies are gone
        this.gameSpeed = this.targetGameSpeed;
        console.log(`✅ Area clear - resuming ${this.gameSpeed}x speed`);
        this.speedIndicatorFadeTime = 2000;
    }
};

// Check if a position is blocked by a door
CyberOpsGame.prototype.isDoorBlocking = function(x, y) {
        if (!this.map.doors) return false;

        for (let door of this.map.doors) {
            if (door.locked) {
                const dist = Math.sqrt(
                    Math.pow(door.x - x, 2) +
                    Math.pow(door.y - y, 2)
                );
                if (dist < 0.5) {
                    return true;
                }
            }
        }
        return false;
}

