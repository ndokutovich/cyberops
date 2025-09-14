    // Game Loop
CyberOpsGame.prototype.gameLoop = function() {
        requestAnimationFrame(() => this.gameLoop());

        // Update FPS counter
        this.updateFPS();

        if (this.currentScreen === 'game' && !this.isPaused) {
            this.update();
            // Update 3D if in 3D mode
            if (this.is3DMode) {
                this.update3D();
                this.update3DCamera();
                this.sync3DTo2D();
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

        return this.map.tiles[tileY][tileX] === 0;
}

// Simple movement without pathfinding (fallback)
CyberOpsGame.prototype.moveAgentSimple = function(agent) {
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0.1) {
            // Update facing angle when moving
            agent.facingAngle = Math.atan2(dy, dx);

            const moveSpeed = agent.speed / 60;
            const moveX = (dx / dist) * moveSpeed;
            const moveY = (dy / dist) * moveSpeed;

            const newX = agent.x + moveX;
            const newY = agent.y + moveY;

            // Check collision before moving
            if (this.canMoveTo(agent.x, agent.y, newX, newY)) {
                agent.x = newX;
                agent.y = newY;
            } else {
                // Try to slide along walls
                // Try horizontal movement only
                if (this.canMoveTo(agent.x, agent.y, newX, agent.y)) {
                    agent.x = newX;
                    agent.facingAngle = dx > 0 ? 0 : Math.PI;
                }
                // Try vertical movement only
                else if (this.canMoveTo(agent.x, agent.y, agent.x, newY)) {
                    agent.y = newY;
                    agent.facingAngle = dy > 0 ? Math.PI/2 : -Math.PI/2;
                }
            }
        }
}

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
        // Check if frozen
        if (this.freezeEffect && this.freezeEffect.active) {
            const now = Date.now();
            if (now - this.freezeEffect.startTime < this.freezeEffect.duration) {
                return; // Skip update while frozen
            } else {
                this.freezeEffect.active = false;
            }
        }

        // Update screen shake
        if (this.screenShake && this.screenShake.active) {
            this.screenShake.duration--;
            if (this.screenShake.duration <= 0) {
                this.screenShake.active = false;
                this.screenShake.intensity = 0;
            }
        }

        this.missionTimer++;
        const seconds = Math.floor(this.missionTimer / 60);
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

            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                // Try pathfinding first, with fallback to simple movement
                if (this.usePathfinding !== false) {
                    this.moveAgentWithPathfinding(agent);
                } else {
                    // Fallback to simple movement
                    this.moveAgentSimple(agent);
                }
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
                        this.projectiles.push({
                            x: enemy.x,
                            y: enemy.y,
                            targetX: agent.x,
                            targetY: agent.y,
                            targetAgent: agent, // Store the specific target agent
                            damage: enemy.damage,
                            speed: 0.3,
                            owner: enemy.id,
                            hostile: true
                        });
                    }
                }
            });
        });
        
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
                                if (agent.health <= 0) agent.alive = false;
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
                            if (closestAgent.protection) {
                                actualDamage = Math.max(1, actualDamage - closestAgent.protection);
                            }
                            if (closestAgent.shield > 0) {
                                closestAgent.shield -= actualDamage;
                            } else {
                                closestAgent.health -= actualDamage;
                                if (closestAgent.health <= 0) closestAgent.alive = false;
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
                            enemy.health -= proj.damage;
                            if (enemy.health <= 0) {
                                enemy.alive = false;
                                this.totalEnemiesDefeated++;
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
                            closestEnemy.health -= proj.damage;
                            if (closestEnemy.health <= 0) {
                                closestEnemy.alive = false;
                                this.totalEnemiesDefeated++;
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
        
        if (aliveAgents === 0) {
            this.endMission(false);
            return;
        }
        
        if (this.currentMission.id === 1) {
            document.getElementById('objectiveTracker').textContent = 
                aliveEnemies > 0 ? 
                `Eliminate enemies: ${deadEnemies}/${this.currentMission.enemies}` :
                'All enemies eliminated! Reach extraction!';
            
            if (aliveEnemies === 0) {
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
        } else if (this.currentMission.id === 2) {
            const hackedCount = this.map.terminals.filter(t => t.hacked).length;
            const allHacked = hackedCount === this.map.terminals.length;
            
            document.getElementById('objectiveTracker').textContent = 
                !allHacked ? 
                `Hack terminals: ${hackedCount}/${this.map.terminals.length}` :
                'All terminals hacked! Reach extraction!';
            
            if (allHacked) {
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
        } else if (this.currentMission.id === 3) {
            // Industrial Sabotage - Plant explosives on 3 targets
            const plantedCount = this.map.explosiveTargets ? this.map.explosiveTargets.filter(t => t.planted).length : 0;
            const allPlanted = plantedCount === 3;
            
            document.getElementById('objectiveTracker').textContent = 
                aliveEnemies > 0 ? 
                `Eliminate security: ${deadEnemies}/${this.currentMission.enemies} | Explosives: ${plantedCount}/3` :
                allPlanted ? 'All objectives complete! Extract all agents!' : 
                `Plant explosives: ${plantedCount}/3 | Eliminate remaining security`;
            
            if (aliveEnemies === 0 && allPlanted) {
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
        } else if (this.currentMission.id === 4) {
            // Assassination Contract - Eliminate targets
            const primaryEliminated = this.map.targets ? this.map.targets.filter(t => t.type === 'primary' && t.eliminated).length : 0;
            const secondaryEliminated = this.map.targets ? this.map.targets.filter(t => t.type === 'secondary' && t.eliminated).length : 0;
            const allTargetsEliminated = primaryEliminated === 1 && secondaryEliminated === 2;
            
            document.getElementById('objectiveTracker').textContent = 
                `Primary targets: ${primaryEliminated}/1 | Secondary targets: ${secondaryEliminated}/2 | Witnesses: ${deadEnemies}/${this.currentMission.enemies}`;
            
            if (allTargetsEliminated && aliveEnemies === 0) {
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
        } else if (this.currentMission.id === 5) {
            // Final Convergence - Breach gate, control sectors, capture mainframe
            const gateBreached = this.map.gates ? this.map.gates.filter(g => g.breached).length > 0 : false;
            const sectorsControlled = this.map.terminals ? this.map.terminals.filter(t => t.hacked).length : 0;
            const allObjectives = gateBreached && sectorsControlled === 3 && aliveEnemies === 0;
            
            document.getElementById('objectiveTracker').textContent = 
                `Gate: ${gateBreached ? 'Breached' : 'Secured'} | Sectors: ${sectorsControlled}/3 | Security: ${deadEnemies}/${this.currentMission.enemies}`;
            
            if (allObjectives) {
                this.endMission(true);
            }
        }
}
    
CyberOpsGame.prototype.endMission = function(victory) {
        // Keep level music playing until next mission starts
        console.log('🎵 Level music continues after mission end');

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
            // Count total available enemies for completed missions, not just killed ones
            this.totalEnemiesDefeated += this.currentMission.enemies;
            
            // Add to completed missions
            if (!this.completedMissions.includes(this.currentMission.id)) {
                this.completedMissions.push(this.currentMission.id);
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

// Handle collectable item pickup
CyberOpsGame.prototype.handleCollectablePickup = function(agent, item) {
        switch(item.type) {
            case 'credits':
                this.credits += item.value;
                console.log(`💰 Collected ${item.value} credits`);
                break;

            case 'ammo':
                // Refill ammo for abilities
                console.log(`🔫 Collected ammo`);
                break;

            case 'health':
                const healAmount = Math.min(item.value, agent.maxHealth - agent.health);
                agent.health += healAmount;
                console.log(`❤️ Healed ${healAmount} HP`);
                break;

            case 'keycard':
                // Could unlock special doors
                console.log(`🗝️ Collected keycard`);
                break;

            case 'intel':
                this.researchPoints += Math.floor(item.value / 2);
                console.log(`📄 Collected intel (+${Math.floor(item.value / 2)} research points)`);
                break;

            case 'armor':
                agent.protection = (agent.protection || 0) + 5;
                console.log(`🛡️ Armor upgraded (+5 protection)`);
                break;

            case 'explosives':
                // Add explosive charges
                console.log(`💣 Collected explosives`);
                break;
        }

        // Visual feedback
        this.effects.push({
            type: 'pickup',
            x: item.x,
            y: item.y,
            text: item.type.toUpperCase(),
            duration: 30,
            frame: 0
        });

        // Play pickup sound
        this.playSound('hit', 0.2);
}

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

