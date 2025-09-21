/**
 * ProjectileService - Centralized projectile management
 * Handles creation, physics, collision, and damage for all projectiles
 */

class ProjectileService {
    constructor() {
        // Active projectiles
        this.projectiles = [];

        // Projectile configuration
        this.config = {
            // Physics
            defaultSpeed: 0.3,
            gravity: 0,
            drag: 0,

            // Collision
            hitRadius: 0.5,
            penetration: false,
            bounces: 0,

            // Damage
            damageOnImpact: true,
            splashDamage: false,
            splashRadius: 0,

            // Visual
            trailEnabled: true,
            trailLength: 5,

            // Performance
            maxProjectiles: 100,
            autoCleanup: true,
            maxLifetime: 5000 // ms
        };

        // Projectile types
        this.PROJECTILE_TYPES = {
            BULLET: 'bullet',
            LASER: 'laser',
            PLASMA: 'plasma',
            GRENADE: 'grenade',
            ROCKET: 'rocket',
            ARROW: 'arrow',
            ENERGY: 'energy'
        };

        // Projectile ID counter
        this.nextId = 1;

        // Event listeners
        this.listeners = new Map();

        // Statistics
        this.stats = {
            totalFired: 0,
            totalHits: 0,
            totalMisses: 0,
            friendlyFire: 0
        };

        // Bind methods
        this.update = this.update.bind(this);
        this.createProjectile = this.createProjectile.bind(this);
        this.fireProjectile = this.fireProjectile.bind(this);

        console.log('🎯 ProjectileService initialized');
    }

    /**
     * Create a projectile
     */
    createProjectile(options) {
        // Check max projectiles
        if (this.projectiles.length >= this.config.maxProjectiles) {
            if (this.config.autoCleanup) {
                // Remove oldest projectile
                this.projectiles.shift();
            } else {
                console.warn('Max projectiles reached');
                return null;
            }
        }

        const projectile = {
            id: this.nextId++,
            type: options.type || this.PROJECTILE_TYPES.BULLET,
            x: options.x || 0,
            y: options.y || 0,
            z: options.z || 0,
            targetX: options.targetX || 0,
            targetY: options.targetY || 0,
            targetZ: options.targetZ || 0,
            velocityX: 0,
            velocityY: 0,
            velocityZ: 0,
            speed: options.speed || this.config.defaultSpeed,
            damage: options.damage || 10,
            owner: options.owner || null,
            hostile: options.hostile !== undefined ? options.hostile : true,
            targetAgent: options.targetAgent || null,
            targetEnemy: options.targetEnemy || null,
            penetration: options.penetration || this.config.penetration,
            bounces: options.bounces || this.config.bounces,
            bouncesRemaining: options.bounces || this.config.bounces,
            lifetime: 0,
            maxLifetime: options.maxLifetime || this.config.maxLifetime,
            trail: [],
            active: true,

            // Additional properties from original implementation
            shooter: options.shooter || null,
            weaponType: options.weaponType || 'rifle',

            // RPG properties
            critical: options.critical || false,
            criticalMultiplier: options.criticalMultiplier || 2,

            // Special effects
            effects: options.effects || [],
            color: options.color || '#ffff00',
            size: options.size || 2,

            // Physics
            gravity: options.gravity !== undefined ? options.gravity : this.config.gravity,
            drag: options.drag !== undefined ? options.drag : this.config.drag,

            // Splash damage
            splashDamage: options.splashDamage || this.config.splashDamage,
            splashRadius: options.splashRadius || this.config.splashRadius
        };

        // Calculate initial velocity
        const dx = projectile.targetX - projectile.x;
        const dy = projectile.targetY - projectile.y;
        const dz = projectile.targetZ - projectile.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > 0) {
            projectile.velocityX = (dx / distance) * projectile.speed;
            projectile.velocityY = (dy / distance) * projectile.speed;
            projectile.velocityZ = (dz / distance) * projectile.speed;
        }

        // Add to projectiles list
        this.projectiles.push(projectile);

        // Update stats
        this.stats.totalFired++;

        // Emit event
        this.emit('projectileFired', { projectile });

        return projectile;
    }

    /**
     * Fire a projectile (convenience method)
     */
    fireProjectile(from, to, options = {}) {
        const projectileOptions = {
            x: from.x,
            y: from.y,
            z: from.z || 0,
            targetX: to.x,
            targetY: to.y,
            targetZ: to.z || 0,
            ...options
        };

        return this.createProjectile(projectileOptions);
    }

    /**
     * Fire at target entity
     */
    fireAtTarget(shooter, target, options = {}) {
        const projectileOptions = {
            x: shooter.x,
            y: shooter.y,
            z: shooter.z || 0,
            targetX: target.x,
            targetY: target.y,
            targetZ: target.z || 0,
            owner: shooter.id || shooter.name,
            targetAgent: target.isAgent ? target : null,
            targetEnemy: target.isEnemy ? target : null,
            hostile: shooter.hostile !== undefined ? shooter.hostile : true,
            damage: shooter.damage || 10,
            shooter: shooter,
            ...options
        };

        return this.createProjectile(projectileOptions);
    }

    /**
     * Update all projectiles
     */
    update(deltaTime, entities = {}) {
        const frameDelta = deltaTime / 16.67; // Normalize to 60fps

        // Filter active projectiles and update
        this.projectiles = this.projectiles.filter(proj => {
            if (!proj.active) return false;

            // Update lifetime
            proj.lifetime += deltaTime;
            if (proj.lifetime > proj.maxLifetime) {
                this.handleProjectileExpire(proj);
                return false;
            }

            // Update trail
            if (this.config.trailEnabled) {
                proj.trail.push({ x: proj.x, y: proj.y });
                if (proj.trail.length > this.config.trailLength) {
                    proj.trail.shift();
                }
            }

            // Apply physics
            this.updatePhysics(proj, frameDelta);

            // Check collision
            const hit = this.checkCollision(proj, entities);
            if (hit) {
                this.handleImpact(proj, hit, entities);

                // Check if projectile should continue (penetration/bounce)
                if (proj.penetration) {
                    // Continue through target
                    return true;
                } else if (proj.bouncesRemaining > 0) {
                    // Bounce off surface
                    this.handleBounce(proj, hit);
                    proj.bouncesRemaining--;
                    return true;
                } else {
                    // Projectile destroyed on impact
                    return false;
                }
            }

            // Check if projectile reached target position (for non-homing)
            const distToTarget = Math.sqrt(
                Math.pow(proj.targetX - proj.x, 2) +
                Math.pow(proj.targetY - proj.y, 2)
            );

            if (distToTarget < this.config.hitRadius) {
                this.handleReachTarget(proj, entities);
                return false;
            }

            return true; // Keep projectile active
        });
    }

    /**
     * Update projectile physics
     */
    updatePhysics(projectile, frameDelta) {
        // Apply gravity
        if (projectile.gravity) {
            projectile.velocityY += projectile.gravity * frameDelta;
        }

        // Apply drag
        if (projectile.drag) {
            projectile.velocityX *= (1 - projectile.drag * frameDelta);
            projectile.velocityY *= (1 - projectile.drag * frameDelta);
            projectile.velocityZ *= (1 - projectile.drag * frameDelta);
        }

        // Update position
        projectile.x += projectile.velocityX * frameDelta;
        projectile.y += projectile.velocityY * frameDelta;
        projectile.z += projectile.velocityZ * frameDelta;
    }

    /**
     * Check collision with entities and environment
     */
    checkCollision(projectile, entities) {
        // Check collision with agents
        if (entities.agents && projectile.hostile) {
            for (const agent of entities.agents) {
                if (!agent.alive) continue;

                const distance = this.getDistance(projectile, agent);
                if (distance < this.config.hitRadius) {
                    return {
                        type: 'agent',
                        entity: agent,
                        position: { x: agent.x, y: agent.y }
                    };
                }
            }
        }

        // Check collision with enemies
        if (entities.enemies && !projectile.hostile) {
            for (const enemy of entities.enemies) {
                if (!enemy.alive) continue;

                const distance = this.getDistance(projectile, enemy);
                if (distance < this.config.hitRadius) {
                    return {
                        type: 'enemy',
                        entity: enemy,
                        position: { x: enemy.x, y: enemy.y }
                    };
                }
            }
        }

        // Check collision with walls (if map service provided)
        if (entities.mapService) {
            const tileX = Math.floor(projectile.x);
            const tileY = Math.floor(projectile.y);

            if (!entities.mapService.isWalkable(tileX, tileY)) {
                return {
                    type: 'wall',
                    position: { x: tileX + 0.5, y: tileY + 0.5 }
                };
            }
        }

        return null;
    }

    /**
     * Handle projectile impact
     */
    handleImpact(projectile, hit, entities) {
        // Deal damage based on hit type
        if (hit.type === 'agent' || hit.type === 'enemy') {
            this.dealDamage(projectile, hit.entity, entities);
        }

        // Splash damage
        if (projectile.splashDamage && projectile.splashRadius > 0) {
            this.dealSplashDamage(projectile, hit.position, entities);
        }

        // Update stats
        this.stats.totalHits++;

        // Emit event
        this.emit('projectileHit', {
            projectile,
            hit,
            damage: projectile.damage
        });

        // Create impact effect
        if (entities.effectsService) {
            entities.effectsService.createEffect('hit', hit.position.x, hit.position.y, {
                color: projectile.color
            });
        }

        // Play impact sound
        if (entities.audioService) {
            entities.audioService.playSound('hit', {
                volume: 0.3,
                position: hit.position
            });
        }
    }

    /**
     * Deal damage to target
     */
    dealDamage(projectile, target, entities) {
        let damage = projectile.damage;

        // Apply critical hit
        if (projectile.critical) {
            damage *= projectile.criticalMultiplier;
        }

        // Apply protection/armor
        if (target.protection) {
            damage = Math.max(1, damage - target.protection);
        }

        // Apply shield
        if (target.shield && target.shield > 0) {
            const shieldDamage = Math.min(target.shield, damage);
            target.shield -= shieldDamage;
            damage -= shieldDamage;
        }

        // Apply remaining damage to health
        if (damage > 0) {
            target.health -= damage;

            // Check if killed
            if (target.health <= 0) {
                target.alive = false;
                target.health = 0;

                // Emit death event
                this.emit('targetKilled', {
                    projectile,
                    target,
                    killer: projectile.shooter || projectile.owner
                });
            }
        }

        // Create damage number
        if (entities.effectsService) {
            entities.effectsService.createDamageNumber(
                target.x,
                target.y,
                Math.floor(damage),
                projectile.critical ? '#ff0000' : '#ffff00'
            );
        }

        // Log combat hit
        if (entities.eventLogService) {
            entities.eventLogService.logCombat('hit',
                projectile.shooter || { name: 'Unknown' },
                target,
                damage
            );
        }
    }

    /**
     * Deal splash damage
     */
    dealSplashDamage(projectile, position, entities) {
        const affectedEntities = [];

        // Check agents
        if (entities.agents) {
            for (const agent of entities.agents) {
                if (!agent.alive) continue;

                const distance = this.getDistance(position, agent);
                if (distance <= projectile.splashRadius) {
                    const falloff = 1 - (distance / projectile.splashRadius);
                    const splashDamage = projectile.damage * falloff * 0.5;

                    this.dealDamage(
                        { ...projectile, damage: splashDamage },
                        agent,
                        entities
                    );

                    affectedEntities.push(agent);
                }
            }
        }

        // Check enemies
        if (entities.enemies) {
            for (const enemy of entities.enemies) {
                if (!enemy.alive) continue;

                const distance = this.getDistance(position, enemy);
                if (distance <= projectile.splashRadius) {
                    const falloff = 1 - (distance / projectile.splashRadius);
                    const splashDamage = projectile.damage * falloff * 0.5;

                    this.dealDamage(
                        { ...projectile, damage: splashDamage },
                        enemy,
                        entities
                    );

                    affectedEntities.push(enemy);
                }
            }
        }

        // Create explosion effect
        if (entities.effectsService) {
            entities.effectsService.createEffect('explosion', position.x, position.y, {
                scale: projectile.splashRadius
            });
        }

        return affectedEntities;
    }

    /**
     * Handle projectile bounce
     */
    handleBounce(projectile, hit) {
        // Simple bounce physics - reverse velocity component
        if (hit.type === 'wall') {
            // Determine which component to reverse based on hit normal
            // Simplified - just reverse both for now
            projectile.velocityX *= -0.8; // Some energy loss
            projectile.velocityY *= -0.8;
        }

        this.emit('projectileBounce', { projectile, hit });
    }

    /**
     * Handle projectile reaching target position
     */
    handleReachTarget(projectile, entities) {
        // Check if specific target was set
        if (projectile.targetAgent) {
            const distance = this.getDistance(projectile, projectile.targetAgent);
            if (distance < 1 && projectile.targetAgent.alive) {
                this.dealDamage(projectile, projectile.targetAgent, entities);
                this.stats.totalHits++;
            } else {
                this.stats.totalMisses++;
            }
        } else if (projectile.targetEnemy) {
            const distance = this.getDistance(projectile, projectile.targetEnemy);
            if (distance < 1 && projectile.targetEnemy.alive) {
                this.dealDamage(projectile, projectile.targetEnemy, entities);
                this.stats.totalHits++;
            } else {
                this.stats.totalMisses++;
            }
        } else {
            // No specific target - area reached
            this.stats.totalMisses++;
        }

        this.emit('projectileReachTarget', { projectile });
    }

    /**
     * Handle projectile expiration
     */
    handleProjectileExpire(projectile) {
        this.stats.totalMisses++;
        this.emit('projectileExpire', { projectile });
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
     * Clear all projectiles
     */
    clearAll() {
        this.projectiles = [];
    }

    /**
     * Get all projectiles
     */
    getProjectiles() {
        return this.projectiles;
    }

    /**
     * Get projectiles by owner
     */
    getProjectilesByOwner(ownerId) {
        return this.projectiles.filter(p => p.owner === ownerId);
    }

    /**
     * Remove specific projectile
     */
    removeProjectile(projectileId) {
        const index = this.projectiles.findIndex(p => p.id === projectileId);
        if (index !== -1) {
            this.projectiles.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Set configuration
     */
    setConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            activeProjectiles: this.projectiles.length,
            accuracy: this.stats.totalFired > 0
                ? (this.stats.totalHits / this.stats.totalFired * 100).toFixed(1) + '%'
                : '0%'
        };
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.stats = {
            totalFired: 0,
            totalHits: 0,
            totalMisses: 0,
            friendlyFire: 0
        };
    }

    /**
     * Export state
     */
    exportState() {
        return {
            projectiles: this.projectiles.map(p => ({
                id: p.id,
                type: p.type,
                x: p.x,
                y: p.y,
                velocityX: p.velocityX,
                velocityY: p.velocityY,
                damage: p.damage,
                owner: p.owner,
                hostile: p.hostile,
                lifetime: p.lifetime
            })),
            stats: { ...this.stats },
            config: { ...this.config }
        };
    }

    /**
     * Import state
     */
    importState(state) {
        if (state.projectiles) {
            this.projectiles = state.projectiles;
        }
        if (state.stats) {
            this.stats = { ...state.stats };
        }
        if (state.config) {
            Object.assign(this.config, state.config);
        }
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
            activeProjectiles: this.projectiles.length,
            maxProjectiles: this.config.maxProjectiles,
            stats: this.getStatistics(),
            oldestProjectile: this.projectiles.length > 0
                ? this.projectiles[0].lifetime
                : 0,
            types: this.projectiles.reduce((acc, p) => {
                acc[p.type] = (acc[p.type] || 0) + 1;
                return acc;
            }, {})
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.ProjectileService = ProjectileService;
}