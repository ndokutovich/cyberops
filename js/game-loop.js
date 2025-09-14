    // Game Loop
CyberOpsGame.prototype.gameLoop = function() {
        requestAnimationFrame(() => this.gameLoop());

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
    
CyberOpsGame.prototype.update = function() {
        this.missionTimer++;
        const seconds = Math.floor(this.missionTimer / 60);
        const minutes = Math.floor(seconds / 60);
        document.getElementById('missionTimer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        
        // Update agents
        this.agents.forEach(agent => {
            if (!agent.alive) return;
            
            const dx = agent.targetX - agent.x;
            const dy = agent.targetY - agent.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0.1) {
                const moveSpeed = agent.speed / 60;
                agent.x += (dx / dist) * moveSpeed;
                agent.y += (dy / dist) * moveSpeed;
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
                    const moveSpeed = enemy.speed / 60;
                    enemy.x += (dx / dist) * moveSpeed;
                    enemy.y += (dy / dist) * moveSpeed;
                } else {
                    enemy.alertLevel = Math.max(0, enemy.alertLevel - 0.5);
                }
            } else {
                if (Math.random() < 0.01) {
                    enemy.targetX = enemy.x + (Math.random() - 0.5) * 5;
                    enemy.targetY = enemy.y + (Math.random() - 0.5) * 5;
                }
                
                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0.1) {
                    const moveSpeed = enemy.speed / 120;
                    enemy.x += (dx / dist) * moveSpeed;
                    enemy.y += (dy / dist) * moveSpeed;
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
                    this.agents.forEach(agent => {
                        const hitDist = Math.sqrt(
                            Math.pow(agent.x - proj.targetX, 2) + 
                            Math.pow(agent.y - proj.targetY, 2)
                        );
                        if (hitDist < 1) {
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
                        }
                    });
                } else {
                    this.enemies.forEach(enemy => {
                        const hitDist = Math.sqrt(
                            Math.pow(enemy.x - proj.targetX, 2) + 
                            Math.pow(enemy.y - proj.targetY, 2)
                        );
                        if (hitDist < 1) {
                            enemy.health -= proj.damage;
                            if (enemy.health <= 0) enemy.alive = false;
                        }
                    });
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

        // Release pointer lock so player can interact with dialogs
        if (document.pointerLockElement) {
            console.log('🔓 Releasing pointer lock for mission end dialog');
            document.exitPointerLock();
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
    
