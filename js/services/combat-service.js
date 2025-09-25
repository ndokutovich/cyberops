/**
 * CombatService - Manages all combat state and mechanics
 * Centralizes combat logic that was scattered across game-flow, game-turnbased, etc.
 */

class CombatService {
    constructor(formulaService, agentService) {
        this.logger = window.Logger ? new window.Logger('CombatService') : null;

        // Dependencies
        this.formulaService = formulaService;
        this.agentService = agentService;

        // Combat state
        this.inCombat = false;
        this.combatants = new Map(); // entity id -> combat data
        this.activeEffects = new Map(); // entity id -> array of effects
        this.combatLog = [];
        this.combatStartTime = 0;

        // Turn-based state
        this.turnBasedMode = false;
        this.turnOrder = [];
        this.currentTurnIndex = 0;
        this.actionPoints = new Map();
        this.turnHistory = [];

        // Cooldowns and timers
        this.cooldowns = new Map(); // entity id -> ability -> cooldown time

        // Overwatch/reaction state
        this.overwatchUnits = new Set();
        this.reactionRadius = 5;

        // Combat constants (can be overridden by campaign)
        this.config = {
            baseCooldown: 1000,
            criticalMultiplier: 2,
            dodgeBaseChance: 0.05,
            overwatchTriggerChance: 0.75,
            actionPointsConfig: {
                agent: 12,
                guard: 8,
                soldier: 10,
                heavy: 6,
                boss: 14
            },
            actionCosts: {
                move: 1,
                shoot: 4,
                grenade: 6,
                ability: 6,
                hack: 4,
                overwatch: 3,
                reload: 2
            }
        };

        if (this.logger) this.logger.info('CombatService initialized');
    }

    /**
     * Initialize combat with given entities
     */
    startCombat(friendlies, hostiles) {
        this.inCombat = true;
        this.combatStartTime = Date.now();
        this.combatants.clear();
        this.activeEffects.clear();
        this.combatLog = [];

        // Register combatants
        [...friendlies, ...hostiles].forEach(entity => {
            this.combatants.set(entity.id, {
                entity: entity,
                faction: friendlies.includes(entity) ? 'friendly' : 'hostile',
                team: friendlies.includes(entity) ? 'agent' : 'enemy',  // Added team property for elimination tracking
                kills: 0,
                damageDealt: 0,
                damageTaken: 0,
                shotsHit: 0,
                shotsFired: 0
            });
        });

        if (this.logger) this.logger.info(`Combat started with ${friendlies.length} friendlies and ${hostiles.length} hostiles`);

        // Initialize turn-based if enabled
        if (this.turnBasedMode) {
            this.initializeTurnOrder();
        }
    }

    /**
     * End combat
     */
    endCombat() {
        this.inCombat = false;

        // Calculate combat stats
        const stats = {
            duration: Date.now() - this.combatStartTime,
            friendlyCasualties: 0,
            hostileCasualties: 0,
            totalDamageDealt: 0,
            accuracy: 0
        };

        let totalHits = 0;
        let totalShots = 0;

        this.combatants.forEach((data, id) => {
            if (!data.entity.alive) {
                if (data.faction === 'friendly') {
                    stats.friendlyCasualties++;
                } else {
                    stats.hostileCasualties++;
                }
            }
            stats.totalDamageDealt += data.damageDealt;
            totalHits += data.shotsHit;
            totalShots += data.shotsFired;
        });

        stats.accuracy = totalShots > 0 ? (totalHits / totalShots) * 100 : 0;

        if (this.logger) this.logger.info('Combat ended', stats);

        // Clear combat state
        this.combatants.clear();
        this.activeEffects.clear();
        this.overwatchUnits.clear();

        return stats;
    }

    /**
     * Perform attack action
     */
    performAttack(attackerId, targetId, weaponType = 'primary') {
        const attacker = this.getCombatant(attackerId);
        const target = this.getCombatant(targetId);

        if (!attacker || !target) {
            if (this.logger) this.logger.warn('Invalid attack: attacker or target not found');
            return null;
        }

        // Check cooldown
        if (this.isOnCooldown(attackerId, 'attack')) {
            if (this.logger) this.logger.debug('Attack blocked by cooldown');
            return null;
        }

        // Check action points in turn-based mode
        if (this.turnBasedMode) {
            const cost = this.config.actionCosts.shoot;
            if (!this.canAffordAction(attackerId, cost)) {
                if (this.logger) this.logger.debug('Not enough action points for attack');
                return null;
            }
            this.spendActionPoints(attackerId, cost);
        }

        // Calculate hit chance
        const distance = this.getDistance(attacker.entity, target.entity);
        // FormulaService expects (distance, baseAccuracy, modifiers) not (attacker, target, distance)
        const baseAccuracy = attacker.entity.accuracy || 0.7;  // Default 70% base accuracy
        const hitChance = this.formulaService.calculateHitChance(
            distance,
            baseAccuracy,
            {}  // No modifiers for now
        );

        const hitRoll = Math.random();
        const isHit = hitRoll < hitChance;

        if (this.logger) {
            this.logger.debug(`🎲 Attack roll: ${hitRoll.toFixed(3)} vs ${hitChance.toFixed(3)} (distance: ${distance.toFixed(1)})`);
        }

        // Track shot fired
        attacker.shotsFired++;

        const result = {
            attacker: attackerId,
            target: targetId,
            hit: isHit,
            damage: 0,
            critical: false,
            killed: false
        };

        if (isHit) {
            // Track hit
            attacker.shotsHit++;

            // Calculate damage using GameServices for proper equipment handling
            let baseDamage;
            if (window.GameServices && window.GameServices.calculateAttackDamage) {
                // Debug: Check what we're passing
                if (this.logger) {
                    this.logger.debug(`🎯 Attacker entity:`, {
                        id: attacker.entity.id,
                        originalId: attacker.entity.originalId,
                        name: attacker.entity.name,
                        damage: attacker.entity.damage
                    });
                }
                // Use GameServices which properly handles equipment loadouts
                baseDamage = window.GameServices.calculateAttackDamage(
                    attacker.entity,
                    target.entity,
                    { isRanged: true }
                );
                if (this.logger) this.logger.debug(`Using GameServices damage calculation: ${baseDamage}`);
            } else {
                // Fallback to basic calculation
                const weaponDamage = attacker.entity.weaponDamage || 0;
                baseDamage = this.formulaService.calculateDamage(
                    attacker.entity.damage || 10,
                    weaponDamage,
                    attacker.entity.damageBonus || 0,
                    target.entity.protection || 0
                );
                if (this.logger) this.logger.warn(`Using fallback damage calculation (no equipment bonus): ${baseDamage}`);
            }

            // Check for critical hit
            const critChance = attacker.entity.critChance || 0.1;
            if (Math.random() < critChance) {
                result.critical = true;
                result.damage = baseDamage * this.config.criticalMultiplier;
            } else {
                result.damage = baseDamage;
            }

            // Apply damage
            this.applyDamage(targetId, result.damage);

            // Track combat stats
            attacker.damageDealt += result.damage;
            target.damageTaken += result.damage;

            // Check if target died
            if (target.entity.health <= 0) {
                result.killed = true;
                attacker.kills++;
                this.onEntityDeath(targetId);
            }
        }

        // Set cooldown
        this.setCooldown(attackerId, 'attack', this.config.baseCooldown);

        // Log combat event
        this.logCombatEvent({
            type: 'attack',
            timestamp: Date.now(),
            ...result
        });

        // Trigger overwatch reactions
        if (isHit && !this.turnBasedMode) {
            this.triggerOverwatch(attackerId);
        }

        return result;
    }

    /**
     * Apply damage to entity
     */
    applyDamage(entityId, damage) {
        const combatant = this.getCombatant(entityId);
        if (!combatant) return;

        combatant.entity.health = Math.max(0, combatant.entity.health - damage);

        if (this.logger) this.logger.debug(`${entityId} took ${damage} damage, health: ${combatant.entity.health}`);
    }

    /**
     * Apply effect to entity
     */
    applyEffect(entityId, effect) {
        if (!this.activeEffects.has(entityId)) {
            this.activeEffects.set(entityId, []);
        }

        const effects = this.activeEffects.get(entityId);
        effects.push({
            ...effect,
            startTime: Date.now(),
            duration: effect.duration || 0
        });

        if (this.logger) this.logger.debug(`Applied ${effect.type} effect to ${entityId}`);
    }

    /**
     * Update effects (called each frame)
     */
    updateEffects(deltaTime) {
        const now = Date.now();

        this.activeEffects.forEach((effects, entityId) => {
            // Filter out expired effects
            const activeEffects = effects.filter(effect => {
                if (effect.duration && (now - effect.startTime) > effect.duration) {
                    this.onEffectExpired(entityId, effect);
                    return false;
                }
                return true;
            });

            // Apply ongoing effects
            activeEffects.forEach(effect => {
                switch (effect.type) {
                    case 'poison':
                        this.applyDamage(entityId, effect.damagePerSecond * deltaTime / 1000);
                        break;
                    case 'burn':
                        this.applyDamage(entityId, effect.damagePerSecond * deltaTime / 1000);
                        break;
                    case 'slow':
                        const entity = this.getCombatant(entityId);
                        if (entity) {
                            entity.entity.speedMultiplier = effect.slowAmount || 0.5;
                        }
                        break;
                    case 'stun':
                        // Handled by checking in canAct()
                        break;
                }
            });

            this.activeEffects.set(entityId, activeEffects);
        });
    }

    /**
     * Check if entity can act
     */
    canAct(entityId) {
        const effects = this.activeEffects.get(entityId) || [];

        // Check for stun
        if (effects.some(e => e.type === 'stun')) {
            return false;
        }

        // Check turn-based constraints
        if (this.turnBasedMode) {
            const currentTurn = this.turnOrder[this.currentTurnIndex];
            if (currentTurn?.id !== entityId) {
                return false;
            }
        }

        return true;
    }

    /**
     * Initialize turn order for turn-based combat
     */
    initializeTurnOrder() {
        // Get all alive combatants
        const entities = [];
        this.combatants.forEach(data => {
            if (data.entity.alive) {
                entities.push(data.entity);
            }
        });

        // Sort by initiative (speed + random factor)
        this.turnOrder = entities.sort((a, b) => {
            const initiativeA = (a.speed || 1) + Math.random() * 5;
            const initiativeB = (b.speed || 1) + Math.random() * 5;
            return initiativeB - initiativeA;
        });

        // Initialize action points
        this.turnOrder.forEach(entity => {
            const type = entity.type || 'agent';
            const maxAP = this.config.actionPointsConfig[type] || 10;
            this.actionPoints.set(entity.id, maxAP);
            entity.maxAP = maxAP;
        });

        this.currentTurnIndex = 0;

        if (this.logger) this.logger.info('Turn order initialized', this.turnOrder.map(e => e.id));
    }

    /**
     * Start next turn
     */
    nextTurn() {
        if (!this.turnBasedMode || this.turnOrder.length === 0) return;

        // Record turn in history
        const currentEntity = this.turnOrder[this.currentTurnIndex];
        if (currentEntity) {
            this.turnHistory.push({
                entity: currentEntity.id,
                actions: [],
                timestamp: Date.now()
            });
        }

        // Move to next entity
        this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;

        // Skip dead entities
        let attempts = 0;
        while (attempts < this.turnOrder.length) {
            const entity = this.turnOrder[this.currentTurnIndex];
            if (entity.alive) {
                break;
            }
            this.currentTurnIndex = (this.currentTurnIndex + 1) % this.turnOrder.length;
            attempts++;
        }

        // Refresh action points for new turn entity
        const newTurnEntity = this.turnOrder[this.currentTurnIndex];
        if (newTurnEntity) {
            this.actionPoints.set(newTurnEntity.id, newTurnEntity.maxAP || 10);

            if (this.logger) this.logger.debug(`Turn started: ${newTurnEntity.id}`);
        }
    }

    /**
     * Check if entity can afford action
     */
    canAffordAction(entityId, cost) {
        const ap = this.actionPoints.get(entityId) || 0;
        return ap >= cost;
    }

    /**
     * Spend action points
     */
    spendActionPoints(entityId, cost) {
        const current = this.actionPoints.get(entityId) || 0;
        this.actionPoints.set(entityId, Math.max(0, current - cost));
    }

    /**
     * Set entity on overwatch
     */
    setOverwatch(entityId) {
        if (!this.canAffordAction(entityId, this.config.actionCosts.overwatch)) {
            return false;
        }

        this.spendActionPoints(entityId, this.config.actionCosts.overwatch);
        this.overwatchUnits.add(entityId);

        if (this.logger) this.logger.debug(`${entityId} set on overwatch`);
        return true;
    }

    /**
     * Trigger overwatch reactions
     */
    triggerOverwatch(movingEntityId) {
        const mover = this.getCombatant(movingEntityId);
        if (!mover) return;

        this.overwatchUnits.forEach(watcherId => {
            const watcher = this.getCombatant(watcherId);
            if (!watcher || watcher.faction === mover.faction) return;

            // Check if in range
            const distance = this.getDistance(watcher.entity, mover.entity);
            if (distance <= this.reactionRadius) {
                // Check trigger chance
                if (Math.random() < this.config.overwatchTriggerChance) {
                    this.performAttack(watcherId, movingEntityId, 'overwatch');
                    this.overwatchUnits.delete(watcherId); // Remove from overwatch after firing
                }
            }
        });
    }

    /**
     * Handle entity death
     */
    onEntityDeath(entityId) {
        const combatant = this.getCombatant(entityId);
        if (!combatant) return;

        combatant.entity.alive = false;
        combatant.entity.health = 0;

        // Remove from turn order if turn-based
        if (this.turnBasedMode) {
            const index = this.turnOrder.findIndex(e => e.id === entityId);
            if (index >= 0) {
                this.turnOrder.splice(index, 1);
                // Adjust current turn index if needed
                if (this.currentTurnIndex >= this.turnOrder.length && this.turnOrder.length > 0) {
                    this.currentTurnIndex = 0;
                }
            }
        }

        // Remove from overwatch
        this.overwatchUnits.delete(entityId);

        // Clear effects
        this.activeEffects.delete(entityId);

        if (this.logger) this.logger.info(`${entityId} died in combat`);

        // CRITICAL: Store death event for game to retrieve
        // Game will check this during its update cycle (unidirectional flow)
        if (this.logger) this.logger.debug(`🔍 Checking elimination queue for ${entityId}: team=${combatant.team}, faction=${combatant.faction}`);
        if (combatant.team === 'enemy') {
            if (!this.eliminatedEnemies) {
                this.eliminatedEnemies = [];
            }
            this.eliminatedEnemies.push({
                entity: combatant.entity,
                timestamp: Date.now(),
                entityId: entityId
            });
            if (this.logger) this.logger.info(`🎯 Enemy elimination queued for processing: ${entityId} (total queued: ${this.eliminatedEnemies.length})`);
        } else {
            if (this.logger) this.logger.debug(`⚠️ Not queuing ${entityId} for elimination - team is '${combatant.team}', not 'enemy'`);
        }
    }

    /**
     * Get and clear eliminated enemies queue (for game to process)
     * This maintains unidirectional data flow - game pulls from service
     */
    getAndClearEliminatedEnemies() {
        if (!this.eliminatedEnemies || this.eliminatedEnemies.length === 0) {
            return [];
        }

        if (this.logger) this.logger.debug(`📤 Retrieving ${this.eliminatedEnemies.length} queued eliminations`);
        const eliminated = [...this.eliminatedEnemies];
        this.eliminatedEnemies = [];
        return eliminated;
    }

    /**
     * Handle effect expiration
     */
    onEffectExpired(entityId, effect) {
        const entity = this.getCombatant(entityId);
        if (!entity) return;

        // Remove effect modifiers
        switch (effect.type) {
            case 'slow':
                entity.entity.speedMultiplier = 1;
                break;
        }

        if (this.logger) this.logger.debug(`${effect.type} effect expired on ${entityId}`);
    }

    /**
     * Get combatant data
     */
    getCombatant(entityId) {
        return this.combatants.get(entityId);
    }

    /**
     * Check if on cooldown
     */
    isOnCooldown(entityId, ability) {
        const entityCooldowns = this.cooldowns.get(entityId);
        if (!entityCooldowns) return false;

        const cooldownEnd = entityCooldowns[ability];
        if (!cooldownEnd) return false;

        return Date.now() < cooldownEnd;
    }

    /**
     * Set cooldown
     */
    setCooldown(entityId, ability, duration) {
        if (!this.cooldowns.has(entityId)) {
            this.cooldowns.set(entityId, {});
        }

        this.cooldowns.get(entityId)[ability] = Date.now() + duration;
    }

    /**
     * Update cooldowns (called each frame)
     */
    updateCooldowns(deltaTime) {
        const now = Date.now();

        this.cooldowns.forEach((abilities, entityId) => {
            Object.keys(abilities).forEach(ability => {
                if (abilities[ability] <= now) {
                    delete abilities[ability];
                }
            });
        });
    }

    /**
     * Calculate distance between entities
     */
    getDistance(entity1, entity2) {
        const dx = entity2.x - entity1.x;
        const dy = entity2.y - entity1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Log combat event
     */
    logCombatEvent(event) {
        this.combatLog.push(event);

        // Keep log size reasonable
        if (this.combatLog.length > 1000) {
            this.combatLog.shift();
        }
    }

    /**
     * Get combat statistics
     */
    getCombatStats() {
        const stats = {
            inCombat: this.inCombat,
            duration: this.inCombat ? Date.now() - this.combatStartTime : 0,
            combatants: this.combatants.size,
            friendlies: 0,
            hostiles: 0,
            casualties: 0,
            activeEffects: 0
        };

        this.combatants.forEach(data => {
            if (data.faction === 'friendly') {
                stats.friendlies++;
            } else {
                stats.hostiles++;
            }

            if (!data.entity.alive) {
                stats.casualties++;
            }
        });

        this.activeEffects.forEach(effects => {
            stats.activeEffects += effects.length;
        });

        return stats;
    }

    /**
     * Get current turn info for turn-based mode
     */
    getCurrentTurnInfo() {
        if (!this.turnBasedMode || this.turnOrder.length === 0) {
            return null;
        }

        const currentEntity = this.turnOrder[this.currentTurnIndex];
        if (!currentEntity) return null;

        return {
            entity: currentEntity,
            entityId: currentEntity.id,
            actionPoints: this.actionPoints.get(currentEntity.id) || 0,
            maxActionPoints: currentEntity.maxAP || 10,
            turnIndex: this.currentTurnIndex,
            totalTurns: this.turnOrder.length
        };
    }

    /**
     * Toggle turn-based mode
     */
    setTurnBasedMode(enabled) {
        this.turnBasedMode = enabled;

        if (enabled && this.inCombat) {
            this.initializeTurnOrder();
        }

        if (this.logger) this.logger.info(`Turn-based mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.CombatService = CombatService;
}