/**
 * FormulaService - Centralized game mathematics and calculations
 * Follows SOLID principles with single responsibility and dependency injection
 */
class FormulaService {
    constructor() {
        // Initialize logger
        this.logger = window.getLogger ? window.getLogger('FormulaService') : null;
        if (this.logger) this.logger.debug('FormulaService initialized');

        // Game constants
        this.constants = {
            // Damage constants
            MIN_DAMAGE: 1,
            CRITICAL_MULTIPLIER: 1.5,
            HEADSHOT_MULTIPLIER: 2.0,

            // Movement constants
            BASE_MOVEMENT_COST: 1,
            DIAGONAL_MOVEMENT_COST: 1.414,

            // Vision constants
            BASE_VISION_RANGE: 8,
            GHOST_VISION_BONUS: 1.5,
            ENEMY_BASE_VISION: 5,
            MIN_VISION_RANGE: 2,

            // Combat constants
            BASE_HIT_CHANCE: 0.85,
            RANGE_PENALTY_PER_TILE: 0.02,
            COVER_DAMAGE_REDUCTION: 0.5,

            // Cooldown constants (in frames at 60fps)
            SHOOT_COOLDOWN: 60,
            GRENADE_COOLDOWN: 180,
            HACK_COOLDOWN: 120,
            SHIELD_COOLDOWN: 300,

            // Shield constants
            SHIELD_AMOUNT: 100,
            SHIELD_DURATION: 180,

            // Health constants
            MEDICAL_HEAL_PERCENT: 0.2,
            MAX_OVERHEAL_PERCENT: 1.0,

            // Experience/progression
            XP_PER_KILL: 100,
            XP_PER_OBJECTIVE: 250,
            XP_LEVEL_MULTIPLIER: 1.5,

            // Collectible constants
            CREDIT_BASE_VALUE: 50,
            CREDIT_RANGE: 100,
            HEALTH_PICKUP_VALUE: 25,
            ARMOR_PICKUP_VALUE: 5,
            INTEL_TO_RESEARCH_RATIO: 0.5,
            AMMO_REFILL_AMOUNT: 30,
            EXPLOSIVE_PICKUP_COUNT: 2,

            // Economy constants
            SELL_BACK_RATIO: 0.6,  // Sell items for 60% of purchase price
            MIN_SELL_VALUE: 50,    // Minimum credits for selling
            WEAPON_DEGRADATION: 0.9, // Used weapons worth 90% when selling
            MISSION_CREDIT_BASE: 1000,
            MISSION_CREDIT_MULTIPLIER: 1.2,
            UPKEEP_PER_AGENT: 100,  // Credits needed per agent per mission
            REPAIR_COST_RATIO: 0.3  // Repair cost is 30% of item value
        };
    }

    // ==================== COLLECTIBLE CALCULATIONS ====================

    /**
     * Calculate collectible pickup value
     * @param {Object} item - Collectible item
     * @param {Object} agent - Agent picking up item
     * @param {Object} gameState - Current game state
     * @returns {Object} Pickup effects
     */
    calculateCollectibleEffect(item, agent, gameState = {}) {
        const effects = {
            credits: 0,
            health: 0,
            armor: 0,
            researchPoints: 0,
            ammo: 0,
            explosives: 0,
            message: ''
        };

        switch(item.type) {
            case 'credits':
                // Credits with potential research bonus
                const creditValue = item.value || (this.constants.CREDIT_BASE_VALUE +
                    Math.floor(Math.random() * this.constants.CREDIT_RANGE));
                effects.credits = creditValue;
                effects.message = `💰 Collected ${creditValue} credits`;
                break;

            case 'health':
                // Health with overheal prevention
                const healAmount = Math.min(
                    item.value || this.constants.HEALTH_PICKUP_VALUE,
                    agent.maxHealth - agent.health
                );
                effects.health = healAmount;
                effects.message = healAmount > 0 ?
                    `❤️ Healed ${healAmount} HP` :
                    '❤️ Health already full';
                break;

            case 'armor':
                // Stackable armor
                const armorValue = item.value || this.constants.ARMOR_PICKUP_VALUE;
                effects.armor = armorValue;
                effects.message = `🛡️ Armor upgraded (+${armorValue} protection)`;
                break;

            case 'intel':
                // Intel converts to research points
                const intelValue = item.value || 20;
                const researchValue = Math.floor(intelValue * this.constants.INTEL_TO_RESEARCH_RATIO);
                effects.researchPoints = researchValue;
                effects.message = `📄 Collected intel (+${researchValue} research points)`;
                break;

            case 'ammo':
                // Ammo refills abilities
                effects.ammo = item.value || this.constants.AMMO_REFILL_AMOUNT;
                effects.message = `🔫 Collected ammo (+${effects.ammo} rounds)`;
                break;

            case 'explosives':
                // Explosive pickups
                effects.explosives = item.value || this.constants.EXPLOSIVE_PICKUP_COUNT;
                effects.message = `💣 Collected ${effects.explosives} explosives`;
                break;

            case 'keycard':
                // Special keycards for doors/objectives
                effects.keycard = item.color || 'blue';
                effects.message = `🗝️ Collected ${effects.keycard} keycard`;
                break;
        }

        return effects;
    }

    /**
     * Calculate item spawn probability based on game state
     * @param {string} itemType - Type of item
     * @param {Object} gameState - Current game state
     * @returns {number} Spawn probability (0-1)
     */
    calculateItemSpawnProbability(itemType, gameState = {}) {
        const baseProbabilities = {
            credits: 0.3,
            health: 0.25,
            armor: 0.15,
            intel: 0.1,
            ammo: 0.2,
            explosives: 0.05,
            keycard: 0.02
        };

        let probability = baseProbabilities[itemType] || 0.1;

        // Adjust based on game state
        if (itemType === 'health' && gameState.averageHealth < 50) {
            probability *= 1.5;
        }
        if (itemType === 'ammo' && gameState.lowAmmo) {
            probability *= 1.3;
        }
        if (itemType === 'credits' && gameState.difficulty > 3) {
            probability *= 0.8;
        }

        return Math.min(1, probability);
    }

    // ==================== DAMAGE CALCULATIONS ====================

    /**
     * Calculate final damage after all modifiers
     * @param {number} baseDamage - Base damage amount
     * @param {number} weaponBonus - Weapon damage bonus
     * @param {number} researchBonus - Research damage bonus
     * @param {number} targetArmor - Target's armor value
     * @param {Object} modifiers - Additional modifiers {critical, headshot, cover}
     * @returns {number} Final damage amount
     */
    calculateDamage(baseDamage, weaponBonus = 0, researchBonus = 0, targetArmor = 0, modifiers = {}) {
        // Calculate raw damage
        let damage = baseDamage + weaponBonus + researchBonus;

        // Apply multipliers
        if (modifiers.critical) {
            damage *= this.constants.CRITICAL_MULTIPLIER;
        }
        if (modifiers.headshot) {
            damage *= this.constants.HEADSHOT_MULTIPLIER;
        }
        if (modifiers.cover) {
            damage *= this.constants.COVER_DAMAGE_REDUCTION;
        }

        // Apply armor reduction
        damage = Math.max(this.constants.MIN_DAMAGE, damage - targetArmor);

        const finalDamage = Math.floor(damage);
        if (this.logger) {
            this.logger.trace(`Damage calculated: base=${baseDamage}, weapon=${weaponBonus}, final=${finalDamage}`);
        }
        return finalDamage;
    }

    /**
     * Calculate damage after armor reduction
     * @param {number} incomingDamage - Incoming damage amount
     * @param {number} armor - Armor value
     * @returns {number} Damage after armor
     */
    calculateDamageAfterArmor(incomingDamage, armor = 0) {
        return Math.max(this.constants.MIN_DAMAGE, Math.floor(incomingDamage - armor));
    }

    /**
     * Calculate grenade damage with falloff
     * @param {number} baseDamage - Base grenade damage
     * @param {number} explosiveBonus - Explosive equipment bonus
     * @param {number} distance - Distance from explosion center
     * @param {number} blastRadius - Explosion radius
     * @returns {number} Damage at distance
     */
    calculateGrenadeDamage(baseDamage, explosiveBonus = 0, distance = 0, blastRadius = 3) {
        const totalDamage = baseDamage + explosiveBonus;

        if (distance <= 0) {
            return totalDamage; // Direct hit
        }

        if (distance > blastRadius) {
            return 0; // Outside blast radius
        }

        // Linear falloff
        const falloff = 1 - (distance / blastRadius);
        return Math.floor(totalDamage * falloff);
    }

    // ==================== ECONOMY CALCULATIONS ====================

    /**
     * Calculate sell price for an item
     * @param {Object} item - Item to sell
     * @param {number} condition - Item condition (0-1, 1 = perfect)
     * @returns {number} Sell price in credits
     */
    calculateSellPrice(item, condition = 1) {
        const basePrice = item.cost || 0;
        const sellValue = basePrice * this.constants.SELL_BACK_RATIO * condition;
        return Math.max(this.constants.MIN_SELL_VALUE, Math.floor(sellValue));
    }

    /**
     * Calculate mission upkeep costs
     * @param {number} agentCount - Number of agents
     * @param {number} missionDifficulty - Mission difficulty level
     * @returns {number} Total upkeep cost
     */
    calculateUpkeep(agentCount, missionDifficulty = 1) {
        const baseUpkeep = agentCount * this.constants.UPKEEP_PER_AGENT;
        const difficultyMultiplier = 1 + (missionDifficulty - 1) * 0.2;
        return Math.floor(baseUpkeep * difficultyMultiplier);
    }

    /**
     * Calculate repair cost for damaged equipment
     * @param {Object} item - Item to repair
     * @param {number} damagePercent - Damage percentage (0-1)
     * @returns {number} Repair cost
     */
    calculateRepairCost(item, damagePercent) {
        const itemValue = item.cost || 0;
        return Math.floor(itemValue * this.constants.REPAIR_COST_RATIO * damagePercent);
    }

    /**
     * Calculate economic balance score
     * @param {Object} gameState - Current game state
     * @returns {Object} Economic analysis
     */
    analyzeEconomy(gameState) {
        const income = gameState.totalEarned || 0;
        const expenses = gameState.totalSpent || 0;
        const netWorth = gameState.credits + this.calculateInventoryValue(gameState);
        const burnRate = expenses / Math.max(1, gameState.missionsCompleted || 1);

        return {
            netWorth,
            profitMargin: income > 0 ? (income - expenses) / income : 0,
            burnRate,
            missionsToBreakEven: Math.ceil((expenses - income) / this.constants.MISSION_CREDIT_BASE),
            economicHealth: netWorth > burnRate * 5 ? 'Healthy' : netWorth > burnRate * 2 ? 'Stable' : 'Critical'
        };
    }

    /**
     * Calculate total inventory value
     * @param {Object} gameState - Game state with weapons and equipment
     * @returns {number} Total value in credits
     */
    calculateInventoryValue(gameState) {
        let totalValue = 0;

        // Add weapon values
        if (gameState.weapons) {
            gameState.weapons.forEach(weapon => {
                if (weapon.owned > 0) {
                    totalValue += this.calculateSellPrice(weapon, this.constants.WEAPON_DEGRADATION) * weapon.owned;
                }
            });
        }

        // Add equipment values
        if (gameState.equipment) {
            gameState.equipment.forEach(item => {
                if (item.owned > 0) {
                    totalValue += this.calculateSellPrice(item) * item.owned;
                }
            });
        }

        return totalValue;
    }

    // ==================== VISION CALCULATIONS ====================

    /**
     * Calculate agent vision range
     * @param {number} baseRange - Base vision range
     * @param {boolean} isGhost - Is Ghost agent
     * @param {number} fogModifier - Fog of war modifier
     * @returns {number} Final vision range
     */
    calculateVisionRange(baseRange = null, isGhost = false, fogModifier = 1.0) {
        let range = baseRange || this.constants.BASE_VISION_RANGE;

        if (isGhost) {
            range *= this.constants.GHOST_VISION_BONUS;
        }

        range *= fogModifier;

        return Math.floor(range);
    }

    /**
     * Calculate enemy detection range
     * @param {number} baseRange - Base detection range
     * @param {number} stealthBonus - Agent stealth bonus (percentage)
     * @param {number} alertLevel - Enemy alert level (0-100)
     * @returns {number} Final detection range
     */
    calculateDetectionRange(baseRange = null, stealthBonus = 0, alertLevel = 0) {
        let range = baseRange || this.constants.ENEMY_BASE_VISION;

        // Stealth reduces detection range
        const stealthReduction = range * (stealthBonus / 100);
        range -= stealthReduction;

        // Alert level increases detection
        const alertBonus = (alertLevel / 100) * 2;
        range += alertBonus;

        return Math.max(this.constants.MIN_VISION_RANGE, Math.floor(range));
    }

    // ==================== MOVEMENT CALCULATIONS ====================

    /**
     * Calculate movement cost between two points
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} terrainCost - Terrain movement cost modifier
     * @returns {number} Movement cost
     */
    calculateMovementCost(x1, y1, x2, y2, terrainCost = 1.0) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);

        // Diagonal movement
        if (dx > 0 && dy > 0) {
            return this.constants.DIAGONAL_MOVEMENT_COST * terrainCost;
        }

        // Straight movement
        return this.constants.BASE_MOVEMENT_COST * terrainCost;
    }

    /**
     * Calculate movement speed with modifiers
     * @param {number} baseSpeed - Base movement speed
     * @param {number} researchBonus - Research speed bonus
     * @param {Object} conditions - Conditions {wounded, slowed, boosted}
     * @returns {number} Final movement speed
     */
    calculateMovementSpeed(baseSpeed, researchBonus = 0, conditions = {}) {
        let speed = baseSpeed + researchBonus;

        if (conditions.wounded) {
            speed *= 0.5; // 50% speed when wounded
        }
        if (conditions.slowed) {
            speed *= 0.7; // 30% slow effect
        }
        if (conditions.boosted) {
            speed *= 1.3; // 30% speed boost
        }

        return Math.max(1, Math.floor(speed));
    }

    // ==================== HEALTH CALCULATIONS ====================

    /**
     * Calculate healing amount
     * @param {number} maxHealth - Maximum health
     * @param {number} healPercent - Heal percentage
     * @param {number} healBonus - Flat healing bonus
     * @returns {number} Healing amount
     */
    calculateHealing(maxHealth, healPercent = 0, healBonus = 0) {
        const percentHeal = Math.floor(maxHealth * healPercent);
        return percentHeal + healBonus;
    }

    /**
     * Calculate medical system healing between missions
     * @param {number} currentHealth - Current health
     * @param {number} maxHealth - Maximum health
     * @param {boolean} hasMedicalResearch - Has medical systems research
     * @returns {number} New health value
     */
    calculateMedicalHealing(currentHealth, maxHealth, hasMedicalResearch = false) {
        if (!hasMedicalResearch) {
            return currentHealth;
        }

        const healAmount = this.calculateHealing(maxHealth, this.constants.MEDICAL_HEAL_PERCENT);
        return Math.min(maxHealth, currentHealth + healAmount);
    }

    // ==================== COMBAT CALCULATIONS ====================

    /**
     * Calculate hit chance
     * @param {number} distance - Distance to target
     * @param {number} baseAccuracy - Base accuracy (0-1)
     * @param {Object} modifiers - Modifiers {cover, moving, suppressed}
     * @returns {number} Hit chance (0-1)
     */
    calculateHitChance(distance, baseAccuracy = null, modifiers = {}) {
        let chance = baseAccuracy || this.constants.BASE_HIT_CHANCE;

        // Range penalty
        chance -= distance * this.constants.RANGE_PENALTY_PER_TILE;

        // Apply modifiers
        if (modifiers.cover) {
            chance -= 0.3; // 30% penalty for target in cover
        }
        if (modifiers.moving) {
            chance -= 0.2; // 20% penalty for moving target
        }
        if (modifiers.suppressed) {
            chance -= 0.4; // 40% penalty when suppressed
        }

        return Math.max(0.1, Math.min(1.0, chance));
    }

    /**
     * Calculate shield absorption
     * @param {number} incomingDamage - Incoming damage
     * @param {number} currentShield - Current shield amount
     * @returns {Object} {shieldDamage, healthDamage, remainingShield}
     */
    calculateShieldAbsorption(incomingDamage, currentShield) {
        if (currentShield <= 0) {
            return {
                shieldDamage: 0,
                healthDamage: incomingDamage,
                remainingShield: 0
            };
        }

        const shieldDamage = Math.min(incomingDamage, currentShield);
        const healthDamage = Math.max(0, incomingDamage - currentShield);
        const remainingShield = Math.max(0, currentShield - incomingDamage);

        return {
            shieldDamage,
            healthDamage,
            remainingShield
        };
    }

    // ==================== HACKING CALCULATIONS ====================

    /**
     * Calculate hacking range
     * @param {number} baseRange - Base hacking range
     * @param {number} hackBonus - Hacking bonus percentage
     * @param {boolean} hasHackingResearch - Has hacking research
     * @returns {number} Final hacking range
     */
    calculateHackingRange(baseRange = 3, hackBonus = 0, hasHackingResearch = false) {
        let range = baseRange;

        // Apply equipment bonus
        range += range * (hackBonus / 100);

        // Apply research bonus
        if (hasHackingResearch) {
            range += range * 0.25; // 25% increase from research
        }

        return Math.floor(range);
    }

    /**
     * Calculate hacking speed
     * @param {number} baseTime - Base hacking time (frames)
     * @param {number} hackBonus - Hacking bonus percentage
     * @param {boolean} hasHackingResearch - Has hacking research
     * @returns {number} Hacking time in frames
     */
    calculateHackingSpeed(baseTime = 180, hackBonus = 0, hasHackingResearch = false) {
        let time = baseTime;

        // Apply equipment bonus
        const equipmentReduction = time * (hackBonus / 100);
        time -= equipmentReduction;

        // Apply research bonus
        if (hasHackingResearch) {
            time *= 0.75; // 25% faster
        }

        return Math.max(30, Math.floor(time)); // Minimum 0.5 seconds
    }

    // ==================== PROGRESSION CALCULATIONS ====================

    /**
     * Calculate experience required for next level
     * @param {number} currentLevel - Current level
     * @returns {number} XP required
     */
    calculateXPRequired(currentLevel) {
        const baseXP = 1000;
        return Math.floor(baseXP * Math.pow(this.constants.XP_LEVEL_MULTIPLIER, currentLevel - 1));
    }

    /**
     * Calculate mission rewards
     * @param {Object} missionData - Mission completion data
     * @returns {Object} {credits, researchPoints, worldControl}
     */
    calculateMissionRewards(missionData) {
        const baseRewards = missionData.rewards || {};
        let credits = baseRewards.credits || 0;
        let researchPoints = baseRewards.researchPoints || 0;
        let worldControl = baseRewards.worldControl || 0;

        // Bonus for no casualties
        if (missionData.noCasualties) {
            credits *= 1.5;
            researchPoints *= 1.5;
        }

        // Penalty for casualties
        const casualtyPenalty = 1 - (missionData.casualties * 0.1);
        credits *= casualtyPenalty;

        // Bonus for speed
        if (missionData.completionTime < missionData.parTime) {
            researchPoints += 25;
        }

        return {
            credits: Math.floor(credits),
            researchPoints: Math.floor(researchPoints),
            worldControl: Math.min(100, worldControl)
        };
    }

    // ==================== UTILITY CALCULATIONS ====================

    /**
     * Calculate distance between two points
     * @param {number} x1 - Point 1 X
     * @param {number} y1 - Point 1 Y
     * @param {number} x2 - Point 2 X
     * @param {number} y2 - Point 2 Y
     * @returns {number} Euclidean distance
     */
    calculateDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate Manhattan distance (grid distance)
     * @param {number} x1 - Point 1 X
     * @param {number} y1 - Point 1 Y
     * @param {number} x2 - Point 2 X
     * @param {number} y2 - Point 2 Y
     * @returns {number} Manhattan distance
     */
    calculateManhattanDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    /**
     * Check if point is within range
     * @param {number} x1 - Origin X
     * @param {number} y1 - Origin Y
     * @param {number} x2 - Target X
     * @param {number} y2 - Target Y
     * @param {number} range - Maximum range
     * @returns {boolean} Is within range
     */
    isWithinRange(x1, y1, x2, y2, range) {
        const distance = this.calculateDistance(x1, y1, x2, y2);
        return distance <= range;
    }

    /**
     * Apply damage to an entity (handles shields, health, death)
     * @param {Object} target - Target entity to damage
     * @param {number} damage - Amount of damage to apply
     * @returns {Object} Damage result {actualDamage, shieldDamage, healthDamage, isDead}
     */
    applyDamage(target, damage) {
        let shieldDamage = 0;
        let healthDamage = 0;
        let remainingDamage = damage;

        // Apply to shield first if available
        if (target.shield > 0) {
            shieldDamage = Math.min(target.shield, remainingDamage);
            target.shield -= shieldDamage;
            remainingDamage -= shieldDamage;
        }

        // Apply remaining damage to health
        if (remainingDamage > 0) {
            healthDamage = Math.min(target.health, remainingDamage);
            target.health -= healthDamage;
        }

        // Check if entity died
        const isDead = target.health <= 0;
        if (isDead) {
            target.alive = false;
            target.health = 0;
        }

        if (this.logger) {
            this.logger.debug(`Applied ${damage} damage to ${target.name || 'entity'}: shield -${shieldDamage}, health -${healthDamage}, isDead=${isDead}`);
        }

        return {
            actualDamage: shieldDamage + healthDamage,
            shieldDamage,
            healthDamage,
            isDead
        };
    }

    /**
     * Heal an entity
     * @param {Object} target - Target entity to heal
     * @param {number} amount - Amount to heal
     * @returns {number} Actual amount healed
     */
    healEntity(target, amount) {
        const maxHealth = target.maxHealth || 100;
        const oldHealth = target.health;
        target.health = Math.min(maxHealth, target.health + amount);
        return target.health - oldHealth;
    }

    /**
     * Apply stat modification to an entity (training, upgrades, etc)
     * @param {Object} entity - Entity to modify
     * @param {string} stat - Stat name to modify
     * @param {number} value - Amount to add/modify
     * @param {boolean} isPercentage - Whether value is a percentage
     * @returns {Object} Modified stat info
     */
    modifyStat(entity, stat, value, isPercentage = false) {
        const oldValue = entity[stat] || 0;
        let newValue;

        if (isPercentage) {
            newValue = oldValue * (1 + value / 100);
        } else {
            newValue = oldValue + value;
        }

        // Apply stat-specific limits
        switch (stat) {
            case 'accuracy':
                newValue = Math.min(Math.max(newValue, 0), 100);
                break;
            case 'health':
                entity.maxHealth = (entity.maxHealth || 100) + value;
                newValue = Math.min(newValue, entity.maxHealth);
                break;
            case 'speed':
                newValue = Math.max(newValue, 1);
                break;
        }

        entity[stat] = newValue;

        return {
            stat,
            oldValue,
            newValue,
            change: newValue - oldValue
        };
    }
}

// Export as singleton
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormulaService;
}