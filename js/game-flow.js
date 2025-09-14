    // Game Flow
CyberOpsGame.prototype.updateMenuState = function() {
        const hasProgress = this.completedMissions.length > 0 || this.currentMissionIndex > 0;
        const hasSavedGame = this.hasSavedGame();

        document.getElementById('campaignButton').style.display = hasProgress ? 'none' : 'block';
        document.getElementById('continueButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('hubButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('saveButton').style.display = hasProgress ? 'block' : 'none';
        document.getElementById('loadButton').style.display = hasSavedGame ? 'block' : 'none';
}

CyberOpsGame.prototype.startCampaign = function() {
        console.log('🚀 startCampaign() called - checking missions before showing hub...');
        console.log('- this.missions exists:', !!this.missions);
        console.log('- this.missions length:', this.missions ? this.missions.length : 'UNDEFINED');

        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.currentMissionIndex = 0;
        this.completedMissions = [];

        // EMERGENCY CHECK: Make sure missions are initialized before showing hub
        if (!this.missions || this.missions.length === 0) {
            console.error('🚨 EMERGENCY in startCampaign: missions not initialized! Calling initializeHub...');
            this.initializeHub();
        }

        this.showSyndicateHub();
}

CyberOpsGame.prototype.continueCampaign = function() {
        this.clearDemosceneTimer(); // Clear timer when user takes action
        this.showSyndicateHub();
}

CyberOpsGame.prototype.selectMission = function() {
        this.showMissionSelectDialog();
}

CyberOpsGame.prototype.showMissionSelectDialog = function() {
        const missionList = document.getElementById('missionList');
        missionList.innerHTML = '';

        this.missions.forEach((mission, index) => {
            const missionDiv = document.createElement('div');
            missionDiv.className = 'mission-option';

            const isCompleted = this.completedMissions.includes(mission.id);
            const isAvailable = index <= this.currentMissionIndex;
            const isLocked = !isAvailable;

            if (isLocked) {
                missionDiv.classList.add('locked');
            }

            missionDiv.innerHTML = `
                <div class="mission-info">
                    <div class="mission-name">Mission ${mission.id}: ${mission.title}</div>
                    <div class="mission-desc">${mission.description.substring(0, 100)}...</div>
                </div>
                <div class="mission-status ${isCompleted ? 'completed' : isAvailable ? 'available' : 'locked'}">
                    ${isCompleted ? '✓' : isAvailable ? '◉' : '🔒'}
                </div>
            `;

            if (isAvailable) {
            missionDiv.onclick = () => {
                this.closeMissionSelect();
                if (this.currentScreen === 'hub') {
                    document.getElementById('syndicateHub').style.display = 'none';
                } else {
                    document.getElementById('mainMenu').style.display = 'none';
                }
                this.startMissionFromHub(index);
            };
            }

            missionList.appendChild(missionDiv);
        });

        document.getElementById('missionSelectDialog').classList.add('show');
}

CyberOpsGame.prototype.closeMissionSelect = function() {
        document.getElementById('missionSelectDialog').classList.remove('show');

        // If we came from hub, show it again
        if (document.getElementById('syndicateHub').style.display === 'none') {
            document.getElementById('syndicateHub').style.display = 'flex';
        }
}

CyberOpsGame.prototype.showMissionBriefing = function(mission) {
        document.getElementById('missionBriefing').style.display = 'flex';
        document.getElementById('missionTitle').textContent = `Mission ${mission.id}: ${mission.title}`;
        document.getElementById('missionDesc').textContent = mission.description;

        const objList = document.getElementById('objectivesList');
        objList.innerHTML = '';
        mission.objectives.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'objective-item';
            div.textContent = '▸ ' + obj;
            objList.appendChild(div);
        });

        const squadSel = document.getElementById('squadSelection');
        squadSel.innerHTML = '';
        this.selectedAgents = [];

        // Use active agents from hub for mission briefing
        const availableAgentsForMission = this.activeAgents.length > 0 ? this.activeAgents : this.agentTemplates;

        // Calculate weapon distribution for preview
        let weaponAssignments = [];
        if (window.GameServices && window.GameServices.equipmentService) {
            weaponAssignments = window.GameServices.equipmentService.distributeWeapons(
                availableAgentsForMission,
                this.weapons || []
            );
        }

        availableAgentsForMission.forEach((agent, idx) => {
            const card = document.createElement('div');
            card.className = 'agent-card';
            const agentName = agent.name || `Agent ${idx + 1}`;
            const agentHealth = agent.health;
            const agentDamage = agent.damage;
            const agentSpeed = agent.speed;

            // Get weapon assignment for this agent
            const assignment = weaponAssignments[idx];
            const weaponInfo = assignment && assignment.weapon ?
                `<div style="color: #ffa500; font-size: 0.9em;">🔫 ${assignment.weapon.name}</div>` :
                '<div style="color: #888; font-size: 0.9em;">🔫 No weapon</div>';

            card.innerHTML = `
                <div style="font-weight: bold; color: #00ffff;">${agentName}</div>
                ${weaponInfo}
                <div style="font-size: 0.8em; margin-top: 5px;">
                    HP: ${agentHealth} | DMG: ${agentDamage}<br>
                    Speed: ${agentSpeed}
                </div>
            `;
            card.onclick = () => {
                const existing = this.selectedAgents.findIndex(a => a.template === idx);
                if (existing !== -1) {
                    this.selectedAgents.splice(existing, 1);
                    card.classList.remove('selected');
                } else if (this.selectedAgents.length < 4) {
                    this.selectedAgents.push({ template: idx, ...agent });
                    card.classList.add('selected');
                }
            };
            squadSel.appendChild(card);

            // Auto-select all available agents (up to 4)
            if (idx < Math.min(4, availableAgentsForMission.length)) {
                card.click();
            }
        });

        this.currentMission = mission;
}

CyberOpsGame.prototype.startMission = function() {
        if (this.selectedAgents.length === 0) {
            this.showHudDialog(
                'DEPLOYMENT ERROR',
                '⚠️ Mission deployment failed!<br><br>You must select at least one agent before deployment.<br><br>Select your squad from the agent roster and try again.',
                [{ text: 'UNDERSTOOD', action: 'close' }]
            );
            return;
        }

        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('gameHUD').style.display = 'block';
        this.currentScreen = 'game';
        this.initMission();

        // Start level-specific music
        const levelNumber = (this.currentMissionIndex % 5) + 1; // Cycle through 1-5 for any number of missions
        this.playLevelMusic(levelNumber);
}

CyberOpsGame.prototype.initMission = function() {
        // Reset state
        this.agents = [];
        this.enemies = [];
        this.projectiles = [];
        this.effects = [];
        this.missionTimer = 0;
        this.isPaused = false;

        // CRITICAL: Full 3D mode reset to prevent movement state carryover
        console.log('🔄 Resetting 3D mode state for new mission');

        // Reset all 3D movement keys
        this.keys3D = {
            w: false,
            a: false,
            s: false,
            d: false,
            shift: false
        };

        // Reset camera rotation
        this.cameraRotationX = 0;
        this.cameraRotationY = 0;

        // Reset mouse movement deltas
        this.mouseMovementX = 0;
        this.mouseMovementY = 0;

        // Ensure 3D mode is disabled at mission start
        this.is3DMode = false;

        // Clear any active pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }

        // Generate map based on mission map type
        this.map = this.generateMapFromType(this.currentMission.map);

        // Initialize fog of war
        this.initializeFogOfWar();

        // Spawn agents with equipment and research bonuses using services
        const spawn = this.map.spawn;

        // Prepare all selected agents for weapon distribution
        const baseAgents = this.selectedAgents.map(selectedAgent => {
            // Find the actual agent data from activeAgents (has research bonuses)
            return this.activeAgents.find(a => a.name === selectedAgent.name) || selectedAgent;
        });

        // Apply loadouts if equipment system is initialized
        let agentsWithLoadouts = baseAgents;
        if (this.agentLoadouts && this.applyLoadoutsToAgents) {
            agentsWithLoadouts = this.applyLoadoutsToAgents(baseAgents);
        }

        // Apply research modifiers
        let modifiedAgents;
        if (window.GameServices) {
            // Apply research bonuses (weapons already handled by loadouts)
            modifiedAgents = agentsWithLoadouts.map(agent => {
                return window.GameServices.researchService.applyResearchToAgent(
                    { ...agent },
                    this.completedResearch || []
                );
            });
        } else {
            // Fallback to old system
            modifiedAgents = agentsWithLoadouts.map(agent => {
                const modified = { ...agent };
                this.applyMissionResearchBonuses(modified);
                return modified;
            });
        }

        // Add mission-specific properties to each agent
        modifiedAgents.forEach((agent, idx) => {

            // Add mission-specific properties
            agent.id = 'agent_' + idx;
            agent.x = spawn.x + idx % 2;
            agent.y = spawn.y + Math.floor(idx / 2);
            agent.targetX = spawn.x + idx % 2;
            agent.targetY = spawn.y + Math.floor(idx / 2);
            agent.selected = idx === 0;
            agent.alive = true;
            agent.cooldowns = [0, 0, 0, 0, 0];
            agent.facingAngle = Math.PI / 2; // Default facing down/south

            // Ensure required properties exist
            agent.maxHealth = agent.maxHealth || agent.health;
            agent.protection = agent.protection || 0;
            agent.hackBonus = agent.hackBonus || 0;
            agent.stealthBonus = agent.stealthBonus || 0;

            this.agents.push(agent);
        });

            // Auto-select first agent for better UX
            if (this.agents.length > 0) {
                this.agents.forEach(a => a.selected = false);

                // Select first agent by default
                const firstAgent = this.agents[0];
                firstAgent.selected = true;
                this._selectedAgent = firstAgent;

                console.log('🎯 Auto-selected first agent for better UX:', firstAgent.name);
                console.log('👥 Available agents:', this.agents.map(a => a.name));
                console.log('✅ Press E to switch camera modes, Tab to change agents');

            // CRITICAL: Center camera on agents when mission starts to prevent NaN camera positions
            console.log('🎥 Before camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);

            // Calculate center point of all agents
            if (this.agents && this.agents.length > 0) {
                let totalX = 0;
                let totalY = 0;
                this.agents.forEach(agent => {
                    totalX += agent.x;
                    totalY += agent.y;
                });

                // Center camera on average agent position
                this.cameraX = Math.floor(totalX / this.agents.length - this.canvas.width / (2 * this.tileWidth));
                this.cameraY = Math.floor(totalY / this.agents.length - this.canvas.height / (2 * this.tileHeight));

                console.log('🎥 Manual camera centering completed - agents average pos:', {
                    avgX: totalX / this.agents.length,
                    avgY: totalY / this.agents.length,
                    cameraX: this.cameraX,
                    cameraY: this.cameraY
                });
            }

            console.log('🎥 After camera centering - cameraX:', this.cameraX, 'cameraY:', this.cameraY);
        } else {
            console.log('⚠️ No agents available to select!');
        }

        // Spawn enemies
        for (let i = 0; i < this.currentMission.enemies; i++) {
            const enemy = {
                id: 'enemy_' + i,
                x: 10 + Math.random() * 8,
                y: 10 + Math.random() * 8,
                health: 50,
                maxHealth: 50,
                speed: 2,
                damage: 10,
                alive: true,
                alertLevel: 0,
                visionRange: 5,
                // Add facing direction (random initial direction)
                facingAngle: Math.random() * Math.PI * 2
            };
            enemy.targetX = enemy.x;
            enemy.targetY = enemy.y;
            this.enemies.push(enemy);
        }

        // Set initial objective
        if (this.currentMission.id === 1) {
            document.getElementById('objectiveTracker').textContent =
                `Eliminate enemies: 0/${this.currentMission.enemies}`;
        } else {
            document.getElementById('objectiveTracker').textContent = 'Hack terminals: 0/3';
        }

        this.updateSquadHealth();
        this.centerCameraOnAgents();
}

CyberOpsGame.prototype.centerCameraOnAgents = function() {
        if (this.agents.length === 0) return;
        let avgX = 0, avgY = 0;
        this.agents.forEach(agent => {
            avgX += agent.x;
            avgY += agent.y;
        });
        avgX /= this.agents.length;
        avgY /= this.agents.length;

        const screenPos = this.worldToIsometric(avgX, avgY);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;
}

CyberOpsGame.prototype.centerCameraOnAgent = function(agent) {
        const screenPos = this.worldToIsometric(agent.x, agent.y);
        this.cameraX = this.canvas.width / 2 - screenPos.x * this.zoom;
        this.cameraY = this.canvas.height / 2 - screenPos.y * this.zoom;
}

CyberOpsGame.prototype.updateSquadHealth = function() {
        const container = document.getElementById('squadHealth');
        container.innerHTML = '';

        this.agents.forEach((agent, index) => {
            const bar = document.createElement('div');
            bar.className = 'agent-health-bar' + (agent.selected ? ' selected' : '');
            bar.innerHTML = `
                <div class="health-fill" style="width: ${(agent.health / agent.maxHealth) * 100}%"></div>
                <div class="agent-name">${agent.name} [${index + 1}]</div>
            `;
            container.appendChild(bar);
        });
}

CyberOpsGame.prototype.useAbility = function(abilityIndex) {
        if (this.isPaused) return;
        const agent = this.agents.find(a => a.selected);
        if (!agent || !agent.alive || agent.cooldowns[abilityIndex] > 0) return;

        switch (abilityIndex) {
            case 1: // Shoot
                this.shootNearestEnemy(agent);
                agent.cooldowns[1] = 60;
                break;
            case 2: // Grenade
                this.throwGrenade(agent);
                agent.cooldowns[2] = 180;
                break;
            case 3: // Hack/Interact
                if (this.currentMission.id === 3) {
                    this.plantNearestExplosive(agent);
                } else if (this.currentMission.id === 4) {
                    this.eliminateNearestTarget(agent);
                } else if (this.currentMission.id === 5) {
                    this.breachNearestGate(agent) || this.hackNearestTerminal(agent);
                } else {
                    this.hackNearestTerminal(agent);
                }
                agent.cooldowns[3] = 120;
                break;
            case 4: // Shield
                this.activateShield(agent);
                agent.cooldowns[4] = 300;
                break;
        }
        this.updateCooldownDisplay();
}

CyberOpsGame.prototype.shootNearestEnemy = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        this.enemies.forEach(enemy => {
            if (!enemy.alive) return;
            const dist = Math.sqrt(
                Math.pow(enemy.x - agent.x, 2) +
                Math.pow(enemy.y - agent.y, 2)
            );
            if (dist < minDist && dist < 10) {
                minDist = dist;
                nearest = enemy;
            }
        });

        if (nearest) {
            this.projectiles.push({
                x: agent.x,
                y: agent.y,
                targetX: nearest.x,
                targetY: nearest.y,
                targetEnemy: nearest, // Store the actual target
                damage: agent.damage,
                speed: 0.5,
                owner: agent.id
            });

            // Trigger recoil effect for shooting
            this.triggerFreezeEffect(50); // 50ms freeze for gun recoil
            this.triggerScreenShake(3, 5); // Light shake for shooting

            // Play shooting sound
            this.playSound('shoot', 0.4);

            // Vibration feedback
            if ('vibrate' in navigator) {
                navigator.vibrate(20);
            }

            this.alertEnemies(agent.x, agent.y, 8);
        }
}

CyberOpsGame.prototype.throwGrenade = function(agent) {
        setTimeout(() => {
            this.effects.push({
                type: 'explosion',
                x: agent.targetX,
                y: agent.targetY,
                radius: 3,
                damage: 50,
                duration: 30,
                frame: 0
            });

            // Big shake and freeze for grenade explosion
            this.triggerScreenShake(15, 30); // Strong shake for 0.5 seconds
            this.triggerFreezeEffect(150); // 150ms freeze for explosion impact

            // Play explosion sound
            this.playSound('explosion', 0.6);

            // Strong vibration for explosion
            if ('vibrate' in navigator) {
                navigator.vibrate([50, 30, 100]); // Pattern: short, pause, long
            }

            this.enemies.forEach(enemy => {
                const dist = Math.sqrt(
                    Math.pow(enemy.x - agent.targetX, 2) +
                    Math.pow(enemy.y - agent.targetY, 2)
                );
                if (dist < 3) {
                    enemy.health -= 50;
                    if (enemy.health <= 0) {
                        enemy.alive = false;
                    }
                }
            });

            this.alertEnemies(agent.targetX, agent.targetY, 10);
        }, 500);
}

// Screen effect helpers
CyberOpsGame.prototype.triggerScreenShake = function(intensity, duration) {
        if (!this.screenShake) return;
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
        this.screenShake.duration = duration;
}

CyberOpsGame.prototype.triggerFreezeEffect = function(duration) {
        if (!this.freezeEffect) return;
        this.freezeEffect.active = true;
        this.freezeEffect.duration = duration;
        this.freezeEffect.startTime = Date.now();
}

// Initialize fog of war for the current map
CyberOpsGame.prototype.initializeFogOfWar = function() {
        if (!this.map) return;

        this.fogOfWar = [];
        for (let y = 0; y < this.map.height; y++) {
            this.fogOfWar[y] = [];
            for (let x = 0; x < this.map.width; x++) {
                // 0 = unexplored, 1 = explored but not visible, 2 = visible
                this.fogOfWar[y][x] = 0;
            }
        }
}

// Update fog of war based on agent positions
CyberOpsGame.prototype.updateFogOfWar = function() {
        if (!this.fogOfWar || !this.agents) return;

        // Initialize line of sight cache if needed
        if (!this.losCache) {
            this.losCache = new Map();
            this.losCacheFrame = 0;
        }

        // Clear cache every 30 frames to handle map changes
        this.losCacheFrame++;
        if (this.losCacheFrame > 30) {
            this.losCache.clear();
            this.losCacheFrame = 0;
        }

        // Reset visibility (but keep explored areas if permanent fog)
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.permanentFog) {
                    // Keep explored areas visible but dimmed
                    if (this.fogOfWar[y][x] === 2) {
                        this.fogOfWar[y][x] = 1;
                    }
                } else {
                    // Tactical fog - reset all to unexplored
                    if (this.fogOfWar[y][x] !== 0) {
                        this.fogOfWar[y][x] = 0;
                    }
                }
            }
        }

        // Update visibility for each agent
        this.agents.forEach(agent => {
            if (!agent.alive) return;

            // Calculate view radius (Ghost agents see further)
            let viewDist = this.viewRadius;
            if (agent.name && agent.name.includes('Ghost')) {
                viewDist = Math.floor(viewDist * this.ghostViewBonus);
            }

            // Cache agent position for this update
            const agentX = Math.floor(agent.x);
            const agentY = Math.floor(agent.y);

            // Reveal tiles in view radius - optimized with early exit
            for (let dy = -viewDist; dy <= viewDist; dy++) {
                for (let dx = -viewDist; dx <= viewDist; dx++) {
                    const tx = agentX + dx;
                    const ty = agentY + dy;

                    if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
                        // Quick distance check before expensive sqrt
                        const distSq = dx * dx + dy * dy;
                        if (distSq <= viewDist * viewDist) {
                            // Check cache first
                            const cacheKey = `${agentX},${agentY}-${tx},${ty}`;
                            let hasLOS = this.losCache.get(cacheKey);

                            if (hasLOS === undefined) {
                                // Not in cache, calculate and store
                                hasLOS = this.hasLineOfSight(agent.x, agent.y, tx, ty);
                                this.losCache.set(cacheKey, hasLOS);
                            }

                            if (hasLOS) {
                                this.fogOfWar[ty][tx] = 2; // Fully visible
                            }
                        }
                    }
                }
            }
        });
}

// Check if there's a clear line of sight between two points
CyberOpsGame.prototype.hasLineOfSight = function(x1, y1, x2, y2) {
        // Use integer coordinates for Bresenham's algorithm
        const startX = Math.floor(x1);
        const startY = Math.floor(y1);
        const endX = Math.floor(x2);
        const endY = Math.floor(y2);

        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);
        const sx = startX < endX ? 1 : -1;
        const sy = startY < endY ? 1 : -1;
        let err = dx - dy;

        let x = startX;
        let y = startY;
        let steps = 0;
        const maxSteps = dx + dy + 10; // Prevent infinite loops

        while (steps < maxSteps) {
            // Check if current tile blocks vision
            if (x >= 0 && x < this.map.width && y >= 0 && y < this.map.height) {
                if (this.map.tiles[y] && this.map.tiles[y][x] === 1) {
                    // Wall blocks vision
                    return false;
                }
            }

            // Check if we've reached the target
            if (x === endX && y === endY) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }

            steps++;
        }

        return true;
}

// Sound effect helper
CyberOpsGame.prototype.playSound = function(soundName, volume = 0.5) {
        // Use Web Audio API to synthesize sounds since files don't exist
        this.playSynthSound(soundName, volume);
}

// Synthesized sound effects using Web Audio API
CyberOpsGame.prototype.playSynthSound = function(soundName, volume = 0.5) {
        // Create audio context if not exists
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                return; // No audio support
            }
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        try {
            if (soundName === 'shoot') {
                // Laser/gun sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(800, now);
                osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

                gain.gain.setValueAtTime(volume * 0.3, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.1);

            } else if (soundName === 'explosion') {
                // Explosion sound
                const noise = ctx.createBufferSource();
                const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
                const data = buffer.getChannelData(0);

                for (let i = 0; i < data.length; i++) {
                    data[i] = (Math.random() - 0.5) * 2;
                }

                noise.buffer = buffer;

                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(3000, now);
                filter.frequency.exponentialRampToValueAtTime(400, now + 0.2);

                gain.gain.setValueAtTime(volume * 0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start(now);

            } else if (soundName === 'hit') {
                // Impact sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

                gain.gain.setValueAtTime(volume * 0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.05);

            } else if (soundName === 'hack') {
                // Digital/hack sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(400, now);

                // Create beeping pattern
                for (let i = 0; i < 3; i++) {
                    const t = now + i * 0.1;
                    gain.gain.setValueAtTime(volume * 0.2, t);
                    gain.gain.setValueAtTime(0, t + 0.05);
                }

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.3);

            } else if (soundName === 'shield') {
                // Shield activation sound
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);

                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(volume * 0.3, now + 0.1);
                gain.gain.linearRampToValueAtTime(0, now + 0.2);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now);
                osc.stop(now + 0.2);
            }
        } catch (e) {
            console.log('Synth sound failed:', soundName, e);
        }
}

CyberOpsGame.prototype.hackNearestTerminal = function(agent) {
        if (!this.map.terminals) return;

        this.map.terminals.forEach(terminal => {
            if (terminal.hacked) return;
            const dist = Math.sqrt(
                Math.pow(terminal.x - agent.x, 2) +
                Math.pow(terminal.y - agent.y, 2)
            );

            // Apply hacking bonus from equipment and research
            let hackRange = 3;
            if (agent.hackBonus) {
                hackRange += agent.hackBonus / 100 * 2; // Bonus increases range
            }

            if (dist < hackRange) {
                terminal.hacked = true;
                this.effects.push({
                    type: 'hack',
                    x: terminal.x,
                    y: terminal.y,
                    duration: 60,
                    frame: 0
                });

                // Play hack sound
                this.playSound('hack', 0.5);

                // Unlock doors linked to this terminal
                if (this.map.doors) {
                    this.map.doors.forEach(door => {
                        if (door.linkedTerminal === terminal.id) {
                            door.locked = false;
                            console.log(`🔓 Door at (${door.x}, ${door.y}) unlocked by terminal ${terminal.id}`);
                        }
                    });
                }
            }
        });
}

CyberOpsGame.prototype.activateShield = function(agent) {
        agent.shield = 100;
        agent.shieldDuration = 180;
        this.effects.push({
            type: 'shield',
            target: agent.id,
            duration: 180,
            frame: 0
        });

        // Play shield sound
        this.playSound('shield', 0.4);
}

CyberOpsGame.prototype.plantNearestExplosive = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.explosiveTargets) return false;

        this.map.explosiveTargets.forEach(target => {
            if (target.planted) return;
            const dist = Math.sqrt(
                Math.pow(target.x - agent.x, 2) +
                Math.pow(target.y - agent.y, 2)
            );
            if (dist < minDist && dist < 3) {
                minDist = dist;
                nearest = target;
            }
        });

        if (nearest) {
            nearest.planted = true;
            this.effects.push({
                type: 'explosive',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 60
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.eliminateNearestTarget = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.targets) return false;

        this.map.targets.forEach(target => {
            if (target.eliminated) return;
            const dist = Math.sqrt(
                Math.pow(target.x - agent.x, 2) +
                Math.pow(target.y - agent.y, 2)
            );
            if (dist < minDist && dist < 3) {
                minDist = dist;
                nearest = target;
            }
        });

        if (nearest) {
            nearest.eliminated = true;
            this.effects.push({
                type: 'eliminate',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 60
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.breachNearestGate = function(agent) {
        let nearest = null;
        let minDist = Infinity;

        if (!this.map.gates) return false;

        this.map.gates.forEach(gate => {
            if (gate.breached) return;
            const dist = Math.sqrt(
                Math.pow(gate.x - agent.x, 2) +
                Math.pow(gate.y - agent.y, 2)
            );
            if (dist < minDist && dist < 4) {
                minDist = dist;
                nearest = gate;
            }
        });

        if (nearest) {
            nearest.breached = true;
            this.effects.push({
                type: 'breach',
                x: nearest.x,
                y: nearest.y,
                frame: 0,
                duration: 80
            });
        }

        return !!nearest;
}

CyberOpsGame.prototype.alertEnemies = function(x, y, radius) {
        this.enemies.forEach(enemy => {
            const dist = Math.sqrt(
                Math.pow(enemy.x - x, 2) +
                Math.pow(enemy.y - y, 2)
            );
            if (dist < radius) {
                enemy.alertLevel = Math.min(100, enemy.alertLevel + 50);
                enemy.targetX = x;
                enemy.targetY = y;
            }
        });
}

CyberOpsGame.prototype.updateCooldownDisplay = function() {
        const agent = this.agents.find(a => a.selected);
        if (!agent) return;

        for (let i = 0; i < 5; i++) {
            const overlay = document.getElementById('cooldown' + i);
            if (overlay) {
                const maxCooldown = [0, 60, 180, 120, 300][i];
                const progress = agent.cooldowns[i] / maxCooldown;
                overlay.style.background = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;
            }
        }
}

CyberOpsGame.prototype.togglePause = function() {
        this.isPaused = !this.isPaused;
        const pauseButton = document.querySelector('.pause-button');

        if (this.isPaused) {
            pauseButton.textContent = '▶';
            this.pauseLevelMusic();

            // Release pointer lock when pausing in 3D mode
            if (document.pointerLockElement) {
                console.log('🔓 Releasing pointer lock for pause menu');
                document.exitPointerLock();
            }

            this.showPauseMenu();
        } else {
            pauseButton.textContent = '⏸';
            this.resumeLevelMusic();
            this.closePauseMenu();
        }
}

CyberOpsGame.prototype.showPauseMenu = function() {
        this.showHudDialog(
            '⏸ GAME PAUSED',
            `<div style="text-align: center;">
                <div style="background: rgba(0,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #fff; margin-bottom: 15px;">Mission Status</h3>
                    <div style="color: #ccc;">
                        <div>Mission: ${this.currentMission.title}</div>
                        <div>Time: ${Math.floor(this.missionTimer / 60)}:${String(this.missionTimer % 60).padStart(2, '0')}</div>
                        <div>Agents Alive: ${this.agents.filter(a => a.alive).length}/${this.agents.length}</div>
                        <div>Enemies Remaining: ${this.enemies.filter(e => e.alive).length}/${this.enemies.length}</div>
                    </div>
                </div>
            </div>`,
            [
                { text: 'RESUME', action: () => this.resumeFromPause() },
                { text: 'SURRENDER', action: () => this.surrenderMission() },
                { text: 'RETURN TO HUB', action: () => this.returnToHubFromMission() },
                { text: 'SETTINGS', action: () => this.showSettingsFromPause() }
            ]
        );
}

CyberOpsGame.prototype.closePauseMenu = function() {
        this.closeDialog();
}

CyberOpsGame.prototype.resumeFromPause = function() {
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';
        this.closeDialog();
}

CyberOpsGame.prototype.surrenderMission = function() {
        this.showHudDialog(
            '⚠️ SURRENDER MISSION',
            'Are you sure you want to surrender this mission?<br><br><strong>Warning:</strong> You will lose all progress and return to the Syndicate Hub without rewards.',
            [
                { text: 'CONFIRM SURRENDER', action: () => this.performSurrender() },
                { text: 'CANCEL', action: () => this.showPauseMenu() }
            ]
        );
}

CyberOpsGame.prototype.performSurrender = function() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';

        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';

        // Return to hub
        this.showSyndicateHub();
}

CyberOpsGame.prototype.returnToHubFromMission = function() {
        this.showHudDialog(
            '🏢 RETURN TO HUB',
            'Return to Syndicate Hub?<br><br><strong>Note:</strong> Your mission progress will be saved and you can resume later.',
            [
                { text: 'RETURN TO HUB', action: () => this.performReturnToHub() },
                { text: 'CANCEL', action: () => this.showPauseMenu() }
            ]
        );
}

CyberOpsGame.prototype.performReturnToHub = function() {
        this.closeDialog();
        this.isPaused = false;
        document.querySelector('.pause-button').textContent = '⏸';

        // Keep level music playing in the hub for atmosphere
        console.log('🎵 Keeping level music playing in hub');

        // Hide game elements
        document.getElementById('gameHUD').style.display = 'none';

        // Save mission state (could be implemented later for mission resumption)
        this.showSyndicateHub();
}

CyberOpsGame.prototype.showSettingsFromPause = function() {
        this.showHudDialog(
            'SYSTEM SETTINGS',
            'Settings panel is currently under development.<br><br>Available options will include:<br>• Audio Controls<br>• Graphics Quality<br>• Control Mapping<br>• Game Preferences',
            [
                { text: 'BACK', action: () => this.showPauseMenu() }
            ]
        );
}

CyberOpsGame.prototype.backToMenuFromBriefing = function() {
        document.getElementById('missionBriefing').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
}

    // Removed - replaced by intermission dialog system

CyberOpsGame.prototype.showSettings = function() {
        this.showHudDialog(
            'SYSTEM SETTINGS',
            'Settings panel is currently under development.<br><br>Available options will include:<br>• Audio Controls<br>• Graphics Quality<br>• Control Mapping<br>• Game Preferences',
            [{ text: 'OK', action: 'close' }]
        );
}