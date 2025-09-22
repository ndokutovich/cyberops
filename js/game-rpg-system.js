/**
 * RPG System Core Implementation
 * Base classes for all game entities with stats, inventory, and progression
 */

// Base Pawn class - all entities inherit from this
class RPGPawn {
    constructor(config = {}) {
        this.id = config.id || `pawn_${Date.now()}_${Math.random()}`;
        this.name = config.name || "Unknown";
        this.level = config.level || 1;
        this.xp = config.xp || 0;
        this.class = config.class || null;

        // Initialize stats from config
        this.initializeStats(config.stats);
        this.initializeDerivedStats();

        // Skills and perks
        this.skills = config.skills || {};
        this.perks = config.perks || [];
        this.availableStatPoints = config.statPoints || 0;
        this.availableSkillPoints = config.skillPoints || 0;
        this.availablePerkPoints = config.perkPoints || 0;

        // Status
        this.health = config.health || this.derivedStats.maxHealth;
        this.ap = config.ap || this.derivedStats.maxAP;
        this.alive = config.alive !== false;

        // Inventory
        this.inventory = new RPGInventory(this, config.inventorySize || 20);
        this.equipment = {
            primary: null,
            secondary: null,
            armor: null,
            helmet: null,
            accessory1: null,
            accessory2: null
        };

        // Effects and buffs
        this.activeEffects = [];
        this.statusEffects = [];

        // Combat stats
        this.combatStats = this.calculateCombatStats();
    }

    getRPGConfig() {
        // Try multiple sources for RPG config
        return window.RPG_CONFIG || window.ContentLoader?.getContent?.('rpgConfig') || null;
    }

    initializeStats(customStats = {}) {
        this.stats = {};

        // Handle both simple numbers and object format
        for (let statName in customStats) {
            const statValue = customStats[statName];

            if (typeof statValue === 'object' && statValue !== null) {
                // Already in object format
                this.stats[statName] = statValue;
            } else if (typeof statValue === 'number') {
                // Simple number - convert to object format
                this.stats[statName] = {
                    base: statValue,
                    bonus: 0,
                    multiplier: 1,
                    get value() {
                        return Math.floor((this.base + this.bonus) * this.multiplier);
                    }
                };
            }
        }

        // Add any missing stats from config with default values
        const rpgConfig = this.getRPGConfig();
        for (let statName in rpgConfig?.stats?.primary || {}) {
            if (!this.stats[statName]) {
                const statConfig = rpgConfig.stats.primary[statName];
                this.stats[statName] = {
                    base: statConfig?.baseValue || 10,
                    bonus: 0,
                    multiplier: 1,
                    get value() {
                        return Math.floor((this.base + this.bonus) * this.multiplier);
                    }
                };
            }
        }

        // Apply class bonuses if applicable
        const rpgConfig2 = this.getRPGConfig();
        if (this.class && rpgConfig2?.classes?.[this.class]) {
            const classData = rpgConfig2.classes[this.class];
            for (let stat in classData.statBonuses) {
                if (this.stats[stat]) {
                    this.stats[stat].bonus += classData.statBonuses[stat];
                }
            }
        }
    }

    initializeDerivedStats() {
        this.derivedStats = {};

        const rpgConfig3 = this.getRPGConfig();
        for (let statName in rpgConfig3?.stats?.derived || {}) {
            const derivedConfig = rpgConfig3.stats.derived[statName];
            Object.defineProperty(this.derivedStats, statName, {
                get: () => derivedConfig.formula(this.stats)
            });
        }
    }

    calculateCombatStats() {
        const stats = this.stats;
        const derived = this.derivedStats;

        return {
            damage: this.calculateDamage(),
            accuracy: 70 + stats.perception.value,
            critChance: 5 + stats.perception.value * 0.3,
            dodgeChance: stats.agility.value * 0.5,
            damageResistance: stats.endurance.value * 0.3,
            initiative: derived.initiative,
            speed: 2 + stats.agility.value * 0.05,
            sightRange: 5 + Math.floor(stats.perception.value / 10)
        };
    }

    calculateDamage() {
        const weapon = this.equipment.primary;
        if (!weapon) {
            // Unarmed damage based on strength
            return Math.floor(this.stats.strength.value * 0.5);
        }

        let baseDamage = weapon.stats.damage || 10;

        // Apply stat modifiers
        if (weapon.type === 'melee') {
            baseDamage += Math.floor(this.stats.strength.value * 1.5);
        } else if (weapon.type === 'ranged') {
            baseDamage += Math.floor(this.stats.perception.value * 0.5);
        } else if (weapon.type === 'energy') {
            baseDamage += Math.floor(this.stats.tech.value * 1.3);
        }

        // Apply skill modifiers
        if (this.skills.marksmanship && weapon.type === 'ranged') {
            baseDamage *= 1 + (this.skills.marksmanship.level * 0.1);
        }

        // Apply perk modifiers
        if (this.hasPerk('rapidFire') && weapon.type === 'ranged') {
            baseDamage *= 1.1;
        }

        return Math.floor(baseDamage);
    }

    // Level up system
    gainXP(amount) {
        const intBonus = this.stats.intelligence.value * 0.01;
        const finalXP = Math.floor(amount * (1 + intBonus));

        this.xp += finalXP;

        // Check for level up
        const requiredXP = this.getRequiredXPForLevel(this.level + 1);
        if (this.xp >= requiredXP) {
            this.levelUp();
        }

        return finalXP;
    }

    getRequiredXPForLevel(level) {
        const rpgConfig = this.getRPGConfig();
        return rpgConfig?.progression?.xpFormula?.(level) || (level * 100);
    }

    levelUp() {
        this.level++;

        const rpgConfig = this.getRPGConfig();

        // Award stat points
        this.availableStatPoints += rpgConfig?.progression?.statPointsPerLevel || 3;

        // Award skill points (modified by intelligence)
        const intBonus = Math.floor(this.stats.intelligence.value / 20);
        this.availableSkillPoints += (rpgConfig?.progression?.skillPointsPerLevel || 5) + intBonus;

        // Award perk points
        if (this.level % (rpgConfig?.progression?.perkPointsEvery || 3) === 0) {
            this.availablePerkPoints++;
        }

        // Check for level-specific rewards
        const levelReward = rpgConfig?.progression?.levelRewards?.[this.level];
        if (levelReward) {
            this.applyLevelReward(levelReward);
        }

        // Class-specific bonuses
        if (this.class && rpgConfig?.classes?.[this.class]?.levelBonuses?.[this.level]) {
            this.applyClassLevelBonus(rpgConfig.classes[this.class].levelBonuses[this.level]);
        }

        // Full heal on level up
        this.health = this.derivedStats.maxHealth;
        this.ap = this.derivedStats.maxAP;

        // Trigger level up effects
        this.triggerEffect('level_up');

        return {
            level: this.level,
            statPoints: this.availableStatPoints,
            skillPoints: this.availableSkillPoints,
            perkPoints: this.availablePerkPoints
        };
    }

    applyLevelReward(reward) {
        switch(reward.type) {
            case 'ability':
                this.unlockAbility(reward.id);
                break;
            case 'passive':
                this.addPassiveBonus(reward.id);
                break;
            case 'ultimate':
                this.unlockUltimate(reward.id);
                break;
        }
    }

    applyClassLevelBonus(bonus) {
        if (bonus.stats) {
            for (let stat in bonus.stats) {
                if (stat === 'all') {
                    // Bonus to all stats
                    for (let s in this.stats) {
                        this.stats[s].bonus += bonus.stats[stat];
                    }
                } else if (this.stats[stat]) {
                    this.stats[stat].bonus += bonus.stats[stat];
                }
            }
        }

        if (bonus.newPerk) {
            this.unlockPerk(bonus.newPerk);
        }

        if (bonus.newSkill) {
            this.unlockSkill(bonus.newSkill);
        }
    }

    // Stat management
    allocateStatPoint(statName) {
        if (this.availableStatPoints <= 0) return false;
        if (!this.stats[statName]) return false;

        const rpgConfig = this.getRPGConfig();
        const statConfig = rpgConfig?.stats?.primary?.[statName];
        if (!statConfig) return false;
        if (this.stats[statName].value >= statConfig.maxValue) return false;

        this.stats[statName].base++;
        this.availableStatPoints--;
        this.recalculateStats();

        return true;
    }

    // Skill management
    learnSkill(skillName) {
        if (this.availableSkillPoints <= 0) return false;

        const rpgConfig = this.getRPGConfig();
        const skillConfig = rpgConfig?.skills?.[skillName];
        if (!skillConfig) return false;

        // Check requirements
        for (let req in skillConfig.requirements) {
            if (this.stats[req] && this.stats[req].value < skillConfig.requirements[req]) {
                return false;
            }
        }

        // Check if already at max level
        if (this.skills[skillName]) {
            if (this.skills[skillName].level >= skillConfig.maxLevel) {
                return false;
            }

            const cost = skillConfig.cost(this.skills[skillName].level + 1);
            if (this.availableSkillPoints < cost) return false;

            this.skills[skillName].level++;
            this.availableSkillPoints -= cost;
        } else {
            const cost = skillConfig.cost(1);
            if (this.availableSkillPoints < cost) return false;

            this.skills[skillName] = {
                name: skillConfig.name,
                level: 1,
                effects: skillConfig.effects(1)
            };
            this.availableSkillPoints -= cost;
        }

        this.recalculateStats();
        this.triggerEffect('skill_unlock');
        return true;
    }

    // Perk management
    unlockPerk(perkName) {
        if (this.hasPerk(perkName)) return false;

        const rpgConfig = this.getRPGConfig();
        const perkConfig = rpgConfig?.perks?.[perkName];
        if (!perkConfig) return false;

        // Check requirements
        if (perkConfig.requirements) {
            if (perkConfig.requirements.level && this.level < perkConfig.requirements.level) {
                return false;
            }

            for (let stat in perkConfig.requirements) {
                if (stat !== 'level' && this.stats[stat]) {
                    if (this.stats[stat].value < perkConfig.requirements[stat]) {
                        return false;
                    }
                }
            }
        }

        // Check if we have perk points
        if (this.availablePerkPoints <= 0 && !perkConfig.free) {
            return false;
        }

        this.perks.push({
            id: perkName,
            name: perkConfig.name,
            effects: perkConfig.effects,
            cooldown: perkConfig.cooldown
        });

        if (!perkConfig.free) {
            this.availablePerkPoints--;
        }

        this.recalculateStats();
        this.triggerEffect('perk_unlock');
        return true;
    }

    hasPerk(perkName) {
        return this.perks.some(p => p.id === perkName);
    }

    // Equipment management
    equipItem(item, slot = null) {
        if (!slot) {
            // Auto-detect slot from item
            slot = item.slot;
        }

        if (!this.equipment.hasOwnProperty(slot)) {
            return false;
        }

        // Check requirements
        if (item.requirements) {
            for (let req in item.requirements) {
                if (req === 'level' && this.level < item.requirements.level) {
                    return false;
                }
                if (this.stats[req] && this.stats[req].value < item.requirements[req]) {
                    return false;
                }
            }
        }

        // Unequip current item if any
        const currentItem = this.equipment[slot];
        if (currentItem) {
            this.inventory.addItem(currentItem);
        }

        // Equip new item
        this.equipment[slot] = item;
        this.inventory.removeItem(item);

        this.recalculateStats();
        return true;
    }

    unequipItem(slot) {
        const item = this.equipment[slot];
        if (!item) return false;

        if (!this.inventory.addItem(item)) {
            return false; // Inventory full
        }

        this.equipment[slot] = null;
        this.recalculateStats();
        return true;
    }

    // Combat actions
    takeDamage(damage, source = null, damageType = 'physical') {
        let finalDamage = damage;

        // Apply damage resistance
        if (damageType === 'physical') {
            finalDamage -= this.combatStats.damageResistance;
        }

        // Apply armor
        if (this.equipment.armor) {
            finalDamage -= this.equipment.armor.stats.damageReduction || 0;
        }

        // Apply perk modifiers
        if (this.hasPerk('juggernaut')) {
            finalDamage *= 0.7;
        }

        finalDamage = Math.max(1, Math.floor(finalDamage));

        this.health -= finalDamage;

        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
            this.onDeath(source);
        }

        return finalDamage;
    }

    heal(amount) {
        const maxHealth = this.derivedStats.maxHealth;
        const healed = Math.min(amount, maxHealth - this.health);
        this.health = Math.min(this.health + amount, maxHealth);
        return healed;
    }

    useAP(amount) {
        if (this.ap < amount) return false;
        this.ap -= amount;
        return true;
    }

    restoreAP(amount) {
        const maxAP = this.derivedStats.maxAP;
        this.ap = Math.min(this.ap + amount, maxAP);
    }

    resetTurn() {
        this.ap = this.derivedStats.maxAP;

        // Apply per-turn effects
        this.updateEffects();
    }

    // Effect management
    addEffect(effect) {
        this.activeEffects.push({
            ...effect,
            startTime: Date.now(),
            turnsRemaining: effect.duration
        });
        this.recalculateStats();
    }

    updateEffects() {
        this.activeEffects = this.activeEffects.filter(effect => {
            if (effect.turnsRemaining !== undefined) {
                effect.turnsRemaining--;
                return effect.turnsRemaining > 0;
            }
            return true;
        });
        this.recalculateStats();
    }

    triggerEffect(effectType, params = {}) {
        // This will be overridden by the game to trigger VFX/SFX
        if (this.onEffectTrigger) {
            this.onEffectTrigger(effectType, params);
        }
    }

    // Utility methods
    recalculateStats() {
        this.initializeDerivedStats();
        this.combatStats = this.calculateCombatStats();
    }

    onDeath(source) {
        // Override in subclasses
        this.triggerEffect('death');
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            level: this.level,
            xp: this.xp,
            class: this.class,
            stats: Object.keys(this.stats).reduce((obj, key) => {
                obj[key] = this.stats[key].base;
                return obj;
            }, {}),
            skills: this.skills,
            perks: this.perks.map(p => p.id),
            health: this.health,
            ap: this.ap,
            alive: this.alive,
            statPoints: this.availableStatPoints,
            skillPoints: this.availableSkillPoints,
            perkPoints: this.availablePerkPoints,
            inventory: this.inventory.toJSON(),
            equipment: Object.keys(this.equipment).reduce((obj, key) => {
                obj[key] = this.equipment[key] ? this.equipment[key].id : null;
                return obj;
            }, {})
        };
    }

    static fromJSON(data) {
        return new RPGPawn(data);
    }
}

// Inventory system
class RPGInventory {
    constructor(maxWeight = 100, maxSize = 20) {
        this.maxWeight = maxWeight;
        this.maxSize = maxSize;
        this.owner = null; // Will be set later

        // Delegate to InventoryService if available
        this.inventoryService = window.GameServices?.inventoryService;

        // Fallback storage if service not available
        this.items = [];
        this.credits = 0;
        this.equipped = {};
        this.currentWeight = 0;
    }

    addItem(item, quantity = 1) {
        // Always use InventoryService
        return this.inventoryService.pickupItem({
            ...item,
            quantity: quantity
        });
    }

    removeItem(item, quantity = 1) {
        // Always use InventoryService
        return this.inventoryService.consumeItem(item.id, quantity);

        return true;
    }

    hasItem(itemId, quantity = 1) {
        const item = this.items.find(i => i.id === itemId);
        return item && item.quantity >= quantity;
    }

    getTotalWeight() {
        let weight = this.items.reduce((total, item) => {
            return total + (item.weight || 1) * (item.quantity || 1);
        }, 0);

        // Add equipped items weight
        Object.values(this.equipped).forEach(item => {
            if (item) {
                weight += item.weight || 1;
            }
        });

        return weight;
    }

    // Clear all equipped items
    clearEquipment() {
        this.equipped = {};
        return true;
    }

    // Equip item to slot
    equipItem(itemId, slot) {
        // Find item in inventory
        const itemIndex = this.items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) {
            // Item not in inventory, but allow equipping from config
            const rpgConfig = this.game?.getRPGConfig ? this.game.getRPGConfig() :
                             (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || {});
            if (rpgConfig?.items) {
                // Search all item categories for the item
                let foundItem = null;
                for (const category of Object.keys(rpgConfig.items)) {
                    if (rpgConfig.items[category][itemId]) {
                        foundItem = rpgConfig.items[category][itemId];
                        break;
                    }
                }
                if (foundItem) {
                    this.equipped[slot] = { ...foundItem, id: itemId };
                    return true;
                }
            }
            return false;
        }

        const item = this.items[itemIndex];

        // Unequip current item in slot if any
        if (this.equipped[slot]) {
            this.addItem(this.equipped[slot], 1);
        }

        // Equip new item
        this.equipped[slot] = item;
        this.items.splice(itemIndex, 1);

        return true;
    }

    // Get item from inventory
    getItem(itemId) {
        return this.items.find(i => i.id === itemId);
    }

    toJSON() {
        return {
            items: this.items,
            credits: this.credits,
            maxSize: this.maxSize,
            equipped: this.equipped
        };
    }
}

// Agent class - extends Pawn with player-specific features
class RPGAgent extends RPGPawn {
    constructor(config) {
        super(config);

        this.type = 'agent';
        this.team = 'player';
        this.specialization = config.specialization || config.class;

        // Agent-specific properties
        this.morale = 100;
        this.loyalty = config.loyalty || 100;
        this.cooldowns = config.cooldowns || [0, 0, 0, 0];

        // Position and movement
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.targetX = undefined;
        this.targetY = undefined;
        this.path = null;
        this.selected = false;

        // Visual properties
        this.color = config.color || '#00ff00';
        this.facingAngle = 0;
    }

    onDeath(source) {
        super.onDeath(source);

        // Add to hall of glory
        if (window.game && window.game.addToHallOfGlory) {
            window.game.addToHallOfGlory(this);
        }
    }
}

// Enemy class - extends Pawn with AI features
class RPGEnemy extends RPGPawn {
    constructor(config) {
        super(config);

        this.type = config.enemyType || 'guard';
        this.team = 'enemy';

        // Enemy-specific properties
        this.alertLevel = 0;
        this.patrolPath = config.patrolPath || [];
        this.behavior = config.behavior || 'aggressive';
        this.visionRange = this.combatStats.sightRange;

        // Position
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.targetX = config.x || 0;
        this.targetY = config.y || 0;

        // Visual
        this.facingAngle = Math.random() * Math.PI * 2;
    }

    onDeath(source) {
        super.onDeath(source);

        // Drop loot
        if (Math.random() < 0.3) {
            this.dropLoot();
        }

        // Award XP to killer
        if (source && source.gainXP) {
            const rpgConfig = this.getRPGConfig();
            const xp = rpgConfig?.progression?.xpSources?.enemyKill?.(
                this.level,
                source.level
            );
            source.gainXP(xp);
        }
    }

    dropLoot() {
        // Generate random loot based on level
        const lootTable = this.generateLootTable();
        return lootTable[Math.floor(Math.random() * lootTable.length)];
    }

    generateLootTable() {
        const items = [];

        // Credits
        items.push({
            type: 'credits',
            amount: 50 + this.level * 20 + Math.floor(Math.random() * 50)
        });

        // Chance for consumables
        if (Math.random() < 0.4) {
            items.push({
                type: 'item',
                id: 'medkit',
                quantity: 1
            });
        }

        // Chance for equipment based on level
        if (this.level >= 5 && Math.random() < 0.1) {
            const rpgConfig = this.getRPGConfig();
            const weapons = Object.keys(rpgConfig?.items?.weapons || {});
            items.push({
                type: 'item',
                id: weapons[Math.floor(Math.random() * weapons.length)]
            });
        }

        return items;
    }
}

// NPC class - extends Pawn with dialog and quest features
class RPGNPC extends RPGPawn {
    constructor(config) {
        super(config);

        this.type = 'npc';
        this.team = 'neutral';

        // NPC-specific properties
        this.faction = config.faction || 'neutral';
        this.profession = config.profession || 'citizen';
        this.dialog = config.dialog || [];
        this.quests = config.quests || [];
        this.shop = config.shop || null;

        // Position
        this.x = config.x || 0;
        this.y = config.y || 0;

        // Interaction state
        this.hasInteracted = false;
        this.questsGiven = [];
        this.questsCompleted = [];
    }

    interact(player) {
        const interaction = {
            dialog: this.getAvailableDialog(player),
            quests: this.getAvailableQuests(player),
            shop: this.shop,
            trading: this.canTrade(player)
        };

        this.hasInteracted = true;

        return interaction;
    }

    getAvailableDialog(player) {
        // Filter dialog based on conditions
        return this.dialog.filter(d => {
            if (d.condition) {
                return this.evaluateCondition(d.condition, player);
            }
            return true;
        });
    }

    getAvailableQuests(player) {
        return this.quests.filter(q => {
            // Not already given
            if (this.questsGiven.includes(q.id)) return false;

            // Check requirements
            if (q.requirements) {
                if (q.requirements.level && player.level < q.requirements.level) {
                    return false;
                }
                if (q.requirements.faction && player.reputation[q.requirements.faction] < q.requirements.reputation) {
                    return false;
                }
            }

            return true;
        });
    }

    canTrade(player) {
        return this.shop !== null && (!this.shop.requirements ||
            this.evaluateCondition(this.shop.requirements, player));
    }

    evaluateCondition(condition, player) {
        // Evaluate quest/dialog conditions
        switch(condition.type) {
            case 'level':
                return player.level >= condition.value;
            case 'quest':
                return player.hasCompletedQuest(condition.questId);
            case 'item':
                return player.inventory.hasItem(condition.itemId, condition.quantity || 1);
            case 'reputation':
                return player.reputation[condition.faction] >= condition.value;
            default:
                return true;
        }
    }
}

// Export the RPG system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        RPGPawn,
        RPGAgent,
        RPGEnemy,
        RPGNPC,
        RPGInventory
    };
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.RPGPawn = RPGPawn;
    window.RPGAgent = RPGAgent;
    window.RPGEnemy = RPGEnemy;
    window.RPGNPC = RPGNPC;
    window.RPGInventory = RPGInventory;
}