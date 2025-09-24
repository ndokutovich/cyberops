// Main game loop - REMOVED
// Now using GameController.start() from new architecture
CyberOpsGame.prototype.gameLoop = function() {
    // Empty stub for compatibility
    // All game loop functionality now handled by GameController
}

// Projectile and effects update functions - REMOVED
// Now handled by GameController and GameFacade
CyberOpsGame.prototype.updateProjectilesOnly = function() {
    // Stub for compatibility - moved to GameFacade.updateProjectilesOnly()
}

CyberOpsGame.prototype.updateEffectsOnly = function() {
    // Stub for compatibility - moved to GameFacade.updateEffectsOnly()
}

// FPS Counter - STILL USED
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

// ============================================
// HELPER FUNCTIONS - STILL NEEDED
// ============================================

// Collision detection helper - STILL USED
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

// Movement validation - STILL USED
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

// ============================================
// MAIN UPDATE - MIGRATED TO GAMEFACADE
// ============================================

CyberOpsGame.prototype.update = function() {
    // STUB - This method has been fully migrated to GameFacade.update()
    // The new architecture handles all update logic through:
    // - GameController.update() - orchestration
    // - GameFacade.update() - game logic (551 lines migrated)
    //
    // This stub remains for compatibility with any legacy code that might call it directly
}

// ============================================
// MISSION AND GAME FLOW - STILL NEEDED
// ============================================

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

    // Check if extraction is enabled through MissionService
    const extractionEnabled = this.gameServices?.missionService?.extractionEnabled || this.extractionEnabled;
    if (!extractionEnabled) return;

    const atExtraction = this.agents.some(agent => {
        if (!agent.alive) return false;
        const dist = Math.sqrt(
            Math.pow(agent.x - this.map.extraction.x, 2) +
            Math.pow(agent.y - this.map.extraction.y, 2)
        );
        return dist < 2;
    });

    if (atExtraction) {
        // Complete mission through MissionService
        if (this.gameServices && this.gameServices.missionService) {
            this.gameServices.missionService.completeMission(true);
        }
        this.endMission(true);
    }
}

CyberOpsGame.prototype.endMission = function(victory) {
        // Clean up music system but keep music playing
        if (this.musicSystem && victory) {
            this.playVictoryMusic();
        }
        if (this.logger) this.logger.debug('🎵 Music continues after mission end');

        this.isPaused = true;

        // Switch to tactical view before showing end dialog
        if (this.is3DMode) {
            if (this.logger) this.logger.debug('📐 Switching to tactical view for mission end');
            this.cameraMode = 'tactical';
            this.disable3DMode();
        }

        // Release pointer lock so player can interact with dialogs
        if (document.pointerLockElement) {
            if (this.logger) this.logger.debug('🔓 Releasing pointer lock for mission end dialog');
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
            if (this.logger) this.logger.debug(`⚰️ Agents fallen in battle: ${fallenThisMission.join(', ')}`);
            if (this.logger) this.logger.debug(`📜 Added to Hall of Glory. Active agents remaining: ${this.activeAgents.length}`);
        }

        // Update campaign statistics and rewards
        if (victory) {
            this.totalCampaignTime += this.missionTimer;
            // Count actual enemies defeated in this mission
            this.totalEnemiesDefeated += this.enemies.filter(e => !e.alive).length;

            // Add to completed missions
            if (!this.completedMissions.includes(this.currentMission.id)) {
                if (this.logger) this.logger.info('📊 Adding mission to completed list:', {
                    missionId: this.currentMission.id,
                    currentIndex: this.currentMissionIndex,
                    completedBefore: [...this.completedMissions],
                    allMissionIds: this.missions.map(m => m.id)
                });
                this.completedMissions.push(this.currentMission.id);
                if (this.logger) this.logger.info('📊 Completed missions after:', [...this.completedMissions]);

                // Generate 2 new agents available for hire after each completed mission
                this.generateNewAgentsForHire();
            }

            // Award mission rewards
            if (this.currentMission.rewards) {
                // Use ResourceService for mission rewards (required)
                this.gameServices.resourceService.applyMissionRewards(this.currentMission.rewards);
            }
        }
        
        // Navigate to victory/defeat screen using screen manager
        setTimeout(() => {
            window.screenManager.navigateTo(victory ? 'victory' : 'defeat');
        }, 1000); // Brief delay for dramatic effect
}

// Unlock intel reports based on collection
CyberOpsGame.prototype.unlockIntelReport = function() {
    if (!this.unlockedIntelReports) this.unlockedIntelReports = [];

    // Intel reports must be loaded from campaign
    const intelReports = this.campaignIntelReports;
    if (!intelReports || intelReports.length === 0) {
        if (this.logger) this.logger.warn('⚠️ No intel reports loaded from campaign');
        return;
    }

    // Check which reports to unlock
    intelReports.forEach(report => {
        if (this.totalIntelCollected >= report.threshold) {
            if (!this.unlockedIntelReports.find(r => r.id === report.id)) {
                this.unlockedIntelReports.push(report);
                if (this.logger) this.logger.debug(`🔓 NEW INTEL REPORT UNLOCKED: ${report.title}`);
            }
        }
    });
};

// Generate final words for fallen agents
CyberOpsGame.prototype.generateFinalWords = function(agentName) {
        // Use final words from campaign if available
        const finalWords = (this.deathSystem && this.deathSystem.finalWords) ||
            ["The mission... must continue..."];

        return finalWords[Math.floor(Math.random() * finalWords.length)];
}

// Generate new agents available for hire after mission completion
CyberOpsGame.prototype.generateNewAgentsForHire = function() {
    // Use agent generation from campaign if available
    if (!this.agentGeneration) {
        if (this.logger) this.logger.warn('⚠️ No agent generation config loaded from campaign');
        return;
    }

    const gen = this.agentGeneration;
    const agentsToGenerate = gen.agentsPerMission || 2;

    // Generate new agents
    for (let i = 0; i < agentsToGenerate; i++) {
        const firstName = gen.firstNames[Math.floor(Math.random() * gen.firstNames.length)];
        const lastName = gen.lastNames[Math.floor(Math.random() * gen.lastNames.length)];
        const callsign = gen.callsigns[Math.floor(Math.random() * gen.callsigns.length)];
        const spec = gen.specializations[Math.floor(Math.random() * gen.specializations.length)];

        const newAgent = {
            id: this.availableAgents.length + 1,
            name: `${firstName} "${callsign}" ${lastName}`,
            specialization: spec.type,
            skills: spec.skills,
            cost: gen.baseCost + Math.floor(Math.random() * gen.maxCostVariance) + (this.completedMissions.length * gen.costIncreasePerMission),
            hired: false,
            health: spec.health + Math.floor(Math.random() * 20) - 10,
            speed: spec.speed,
            damage: spec.damage + Math.floor(Math.random() * 10) - 5
        };

        this.availableAgents.push(newAgent);
        if (this.logger) this.logger.debug(`🆕 New agent available for hire: ${newAgent.name} (${newAgent.specialization})`);
    }

    // Log event
    if (this.logEvent) {
        this.logEvent(`🆕 ${agentsToGenerate} new agents are available for hire at the Hub!`, 'system');
    }
}

// Handle collectable item pickup
CyberOpsGame.prototype.handleCollectablePickup = function(agent, item) {
    // Mark item as collected
    item.collected = true;

    // Log the item pickup if event logging is enabled
    if (this.logItemPickup) {
        this.logItemPickup(agent, item);
    }

    // ONLY use InventoryService - no fallback
    const inventoryService = this.gameServices.inventoryService;
    if (!inventoryService) {
        if (this.logger) this.logger.error('❌ InventoryService is required!');
        return;
    }

    // Handle credits separately (managed by game)
    if (item.credits) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.add('credits', item.credits, 'item pickup');
        } else {
            this.credits = (this.credits || 0) + item.credits;
        }
        this.creditsThisMission = (this.creditsThisMission || 0) + item.credits;
        this.addNotification(`💰 +${item.credits} credits`);
    }

    // Let InventoryService handle the pickup
    const success = inventoryService.pickupItem(agent, item);

    if (success) {
        // DO NOT replace the entire weapons array! This was wiping out all weapons!
        // The InventoryService maintains its own state, we don't need to sync back
        // Only sync if InventoryService has MORE weapons than the game (new weapon added)
        if (inventoryService.inventory.weapons.length > 0) {
            // Update game's weapons array with new/updated items from InventoryService
            // But preserve existing weapons that might not be in InventoryService
            inventoryService.inventory.weapons.forEach(invWeapon => {
                const existingWeapon = this.weapons.find(w => w.id === invWeapon.id);
                if (!existingWeapon) {
                    // New weapon, add it
                    this.weapons.push({...invWeapon});
                    if (this.logger) this.logger.debug(`📦 Added new weapon to game: ${invWeapon.name}`);
                } else {
                    // Update counts
                    existingWeapon.owned = invWeapon.owned;
                    existingWeapon.equipped = invWeapon.equipped;
                }
            });
        }

        // Track collected weapons for mission rewards
        if (item.type === 'weapon' && item.weapon) {
            this.collectedWeapons = this.collectedWeapons || [];
            this.collectedWeapons.push({
                type: item.weapon,
                name: item.name || item.weapon,
                damage: item.weaponDamage || item.damage || 10,
                range: item.weaponRange || item.range || 5
            });

            this.addNotification(`🔫 Picked up: ${item.name || item.weapon}`);
            if (this.logger) this.logger.debug(`🎯 Agent ${agent.name} picked up ${item.name || item.weapon} (damage: ${item.weaponDamage || item.damage || 10})`);

            // Check if auto-equipped
            const agentId = agent.originalId || agent.id || agent.name;
            const equipment = inventoryService.getAgentEquipment(agentId);
            if (equipment.weapon && equipment.weapon.id === item.weapon) {
                this.addNotification(`⚔️ ${agent.name} equipped ${item.name || item.weapon} (no weapon equipped)`);
            }
        }

        // Track intel
        if (item.type === 'intel') {
            this.totalIntelCollected = inventoryService.inventory.intel;
            this.intelThisMission = (this.intelThisMission || 0) + (item.value || 1);

            // Track intel by mission
            if (this.currentMission) {
                const missionId = this.currentMission.id;
                if (!this.intelByMission) this.intelByMission = {};
                this.intelByMission[missionId] = (this.intelByMission[missionId] || 0) + (item.value || 1);
                if (this.logger) this.logger.debug(`📁 Intel tracked for Mission ${missionId}: ${this.intelByMission[missionId]}`);
            }

            // Unlock intel reports
            if (this.unlockIntelReport) this.unlockIntelReport();
        }

        // Handle other item notifications
        if (item.type !== 'weapon' && item.type !== 'credits' && item.type !== 'intel') {
            this.addNotification(`📦 Collected: ${item.name || item.type}`);
        }
    }

    // Handle collectable effects
    this.handleCollectableEffects(agent, item);
};

// Handle collectable effects (separated for cleaner code)
CyberOpsGame.prototype.handleCollectableEffects = function(agent, item) {

    if (item.item) {
        // Add to inventory
        this.inventory = this.inventory || {};
        this.inventory[item.item] = (this.inventory[item.item] || 0) + 1;
        this.addNotification(`📦 Collected: ${item.name || item.item}`);

        // Track intel specifically
        if (item.item.includes('intel') || item.name?.toLowerCase().includes('intel')) {
            this.totalIntelCollected = (this.totalIntelCollected || 0) + 1;
            this.intelThisMission = (this.intelThisMission || 0) + 1;

            // Track intel by mission
            if (this.currentMission) {
                const missionId = this.currentMission.id;
                if (!this.intelByMission) this.intelByMission = {};
                this.intelByMission[missionId] = (this.intelByMission[missionId] || 0) + 1;
                if (this.logger) this.logger.debug(`📁 Intel tracked for Mission ${missionId}: ${this.intelByMission[missionId]}`);
            }

            // Unlock intel reports based on collection
            if (this.unlockIntelReport) this.unlockIntelReport();

            if (this.logger) this.logger.debug(`📊 Total Intel: ${this.totalIntelCollected} documents`);
        }
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
            // Use ResourceService for credits (required)
            this.gameServices.resourceService.add('credits', effects.credits, 'item pickup');
            this.creditsThisMission = (this.creditsThisMission || 0) + effects.credits;
        }
        if (effects.health > 0) {
            agent.health = Math.min(agent.maxHealth, agent.health + effects.health);
        }
        if (effects.armor > 0) {
            agent.protection = (agent.protection || 0) + effects.armor;
        }
        if (effects.researchPoints > 0) {
            // Use ResourceService for research points (required)
            this.gameServices.resourceService.add('researchPoints', effects.researchPoints, 'item pickup');
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
                    if (this.logger) this.logger.debug(`📁 Intel tracked for Mission ${missionId}: ${this.intelByMission[missionId]}`);
                }

                // Unlock intel reports based on collection
                this.unlockIntelReport();

                if (this.logger) this.logger.debug(`📊 Total Intel: ${this.totalIntelCollected} documents`);
                if (this.logger) this.logger.debug(`📋 Intel this mission: ${this.intelThisMission}`);
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
            if (this.logger) this.logger.debug(effects.message);
        }

        return;
    }

    // Collectables removed - all rewards come from mission completion
    if (this.logger) this.logger.warn('⚠️ Old collectable system called but no longer supported');

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
        if (this.logger) this.logger.debug(`⚡ Game speed changed to ${speed}x`);
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
        if (this.logger) this.logger.debug('⚠️ Enemy detected - slowing to 1x speed');
        this.speedIndicatorFadeTime = 2000;
    } else if (!enemyNearby && this.targetGameSpeed > 1 && this.gameSpeed === 1) {
        // Speed back up when enemies are gone
        this.gameSpeed = this.targetGameSpeed;
        if (this.logger) this.logger.info(`✅ Area clear - resuming ${this.gameSpeed}x speed`);
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


