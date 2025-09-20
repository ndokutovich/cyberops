/**
 * game-rpg-integration.js
 * Integrates RPG system with existing CyberOps game mechanics
 * Provides backwards-compatible wrappers and adapters
 */

// Helper to get RPG config
CyberOpsGame.prototype.getRPGConfig = function() {
    // Try content loader first
    if (window.ContentLoader) {
        const config = window.ContentLoader.getContent('rpgConfig');
        if (config) return config;
    }
    // Fallback to campaign config
    if (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
        return window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
    }
    // Return empty config if none found
    return {};
};

// Integration layer for existing agent/enemy/NPC systems
CyberOpsGame.prototype.initRPGSystem = function() {
    console.log('🎮 Initializing RPG System...');

    // Store original functions
    this._originalCreateAgent = this.createAgent;
    this._originalCreateEnemy = this.createEnemy;
    this._originalCreateNPC = this.createNPC;

    // Initialize RPG through GameServices if available
    if (window.GameServices && window.GameServices.rpgService) {
        // Use centralized RPG service
        window.GameServices.rpgService.initialize(this);

        // Store references locally for convenience
        this.rpgManager = window.GameServices.rpgService.rpgManager;
        this.inventoryManager = window.GameServices.rpgService.inventoryManager;
        this.shopManager = window.GameServices.rpgService.shopManager;
    } else {
        // Fallback to direct initialization
        this.rpgManager = new RPGManager();
        this.rpgManager.game = this;
        this.inventoryManager = new InventoryManager();
        this.inventoryManager.game = this;
        this.shopManager = new ShopManager();
        this.shopManager.game = this;
        // Load shops after game reference is set
        this.shopManager.loadShops();
    }

    // Load RPG config from campaign
    let rpgConfig = null;

    // Try to get from flexible content loader
    if (window.ContentLoader) {
        rpgConfig = window.ContentLoader.getContent('rpgConfig');
    }

    // Fallback to campaign config
    if (!rpgConfig && window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
        rpgConfig = window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
    }

    if (rpgConfig) {
        this.rpgManager.loadConfig(rpgConfig);
    } else {
        console.error('❌ No RPG config found in campaign!');
    }

    // Sync existing hub equipment with RPG system
    this.syncEquipmentWithRPG();

    // Initialize existing entities with RPG stats
    this.upgradeExistingEntities();

    console.log('✅ RPG System initialized');
};

// RPG Manager - Central management of RPG mechanics
class RPGManager {
    constructor() {
        this.config = null;
        this.entities = new Map(); // Track all RPG entities
        this.experienceTable = [];
        this.generateExperienceTable();
    }

    loadConfig(config) {
        this.config = config;
    }

    generateExperienceTable() {
        // Generate XP requirements for levels 1-100
        for (let level = 1; level <= 100; level++) {
            this.experienceTable[level] = Math.floor(100 * Math.pow(1.5, level - 1));
        }
    }

    createRPGAgent(baseAgent, classType = 'soldier') {
        console.log(`\n🎮 Creating RPG Agent: ${baseAgent.name}`);
        console.log(`   Class: ${classType}`);

        const classConfig = this.config?.classes?.[classType] || {};
        const rpgAgent = new RPGAgent({
            ...baseAgent,
            class: classType,
            level: baseAgent.level || 1,
            experience: baseAgent.experience || 0,
            stats: this.generateInitialStats(classType),
            skills: this.getClassSkills(classType),
            perks: []
        });

        console.log(`   Initial Stats:`, rpgAgent.stats);
        console.log(`   Starting Skills:`, rpgAgent.skills);

        // Copy existing agent properties
        Object.keys(baseAgent).forEach(key => {
            if (rpgAgent[key] === undefined) {
                rpgAgent[key] = baseAgent[key];
            }
        });

        // Calculate and store derived stats
        const derived = this.calculateDerivedStats(rpgAgent);
        rpgAgent.derivedStats = derived;  // Store derived stats on entity

        console.log(`   Derived Stats Summary:`);
        console.log(`   - Max Health: ${derived.maxHealth}`);
        console.log(`   - Max AP: ${derived.maxAP}`);
        console.log(`   - Crit Chance: ${derived.critChance.toFixed(1)}%`);
        console.log(`   - Dodge: ${derived.dodge.toFixed(1)}%`);

        // Register entity
        this.entities.set(baseAgent.id || baseAgent.name, rpgAgent);

        return rpgAgent;
    }

    createRPGEnemy(baseEnemy, type = 'basic') {
        const enemyConfig = this.config?.enemies?.[type] || {};
        const rpgEnemy = new RPGEnemy({
            ...baseEnemy,
            type: type,
            level: baseEnemy.level || 1,
            stats: this.generateEnemyStats(type, baseEnemy.level || 1)
        });

        // Copy existing enemy properties
        Object.keys(baseEnemy).forEach(key => {
            if (rpgEnemy[key] === undefined) {
                rpgEnemy[key] = baseEnemy[key];
            }
        });

        this.entities.set(baseEnemy.id || `enemy_${Date.now()}`, rpgEnemy);

        return rpgEnemy;
    }

    createRPGNPC(baseNPC) {
        const rpgNPC = new RPGNPC({
            ...baseNPC,
            stats: this.generateNPCStats(baseNPC.type || 'civilian')
        });

        // Preserve existing NPC properties
        Object.keys(baseNPC).forEach(key => {
            if (rpgNPC[key] === undefined) {
                rpgNPC[key] = baseNPC[key];
            }
        });

        this.entities.set(baseNPC.id || baseNPC.name, rpgNPC);

        return rpgNPC;
    }

    generateInitialStats(classType) {
        const classConfig = this.config?.classes?.[classType];

        // Start with default base values - ensure they're numbers, not objects
        const stats = {
            strength: 10,
            agility: 10,
            intellect: 10,
            tech: 10,
            charisma: 10,
            perception: 10,
            endurance: 10
        };

        // Apply class modifiers if available
        if (classConfig && classConfig.statModifiers) {
            Object.keys(classConfig.statModifiers).forEach(stat => {
                if (stats[stat] !== undefined) {
                    stats[stat] += classConfig.statModifiers[stat];
                }
            });
        }

        // Log final stats to verify they're numbers
        console.log(`   Generated stats for ${classType}:`, stats);

        return stats;
    }

    generateEnemyStats(type, level) {
        // Scale enemy stats based on level
        const baseMultiplier = 0.5 + (level * 0.1);
        return {
            strength: Math.floor(10 * baseMultiplier),
            agility: Math.floor(10 * baseMultiplier),
            intellect: Math.floor(5 * baseMultiplier),
            tech: Math.floor(5 * baseMultiplier),
            charisma: Math.floor(3 * baseMultiplier),
            perception: Math.floor(8 * baseMultiplier),
            endurance: Math.floor(10 * baseMultiplier)
        };
    }

    generateNPCStats(type) {
        // Simple stats for NPCs
        return {
            strength: 5,
            agility: 5,
            intellect: 10,
            tech: 8,
            charisma: 10,
            perception: 8,
            endurance: 5
        };
    }

    getClassSkills(classType) {
        const classConfig = this.config?.classes?.[classType];
        return classConfig?.startingSkills || [];
    }

    calculateDerivedStats(entity) {
        const stats = entity.stats || {};
        const derived = {};

        // Extract numeric values from stats (handle both objects and numbers)
        const getStatValue = (stat) => {
            const value = stats[stat];
            if (typeof value === 'object' && value !== null) {
                return value.baseValue || value.value || 10;
            }
            return value || 10;
        };

        const strength = getStatValue('strength');
        const agility = getStatValue('agility');
        const intellect = getStatValue('intellect');
        const tech = getStatValue('tech');
        const charisma = getStatValue('charisma');
        const perception = getStatValue('perception');
        const endurance = getStatValue('endurance');

        // Calculate max health
        derived.maxHealth = 100 + (endurance * 10);
        console.log(`📊 Max Health: 100 + (${endurance} * 10) = ${derived.maxHealth}`);

        // Calculate max AP
        derived.maxAP = 6 + Math.floor(agility / 10);
        console.log(`📊 Max AP: 6 + floor(${agility} / 10) = ${derived.maxAP}`);

        // Calculate crit chance
        derived.critChance = 5 + (perception * 0.5);
        console.log(`📊 Crit Chance: 5 + (${perception} * 0.5) = ${derived.critChance}%`);

        // Calculate dodge
        derived.dodge = agility * 0.5;
        console.log(`📊 Dodge: ${agility} * 0.5 = ${derived.dodge}%`);

        // Calculate carry weight
        derived.carryWeight = 50 + (strength * 5);
        console.log(`📊 Carry Weight: 50 + (${strength} * 5) = ${derived.carryWeight}kg`);

        console.log('📊 Final derived stats:', derived);
        return derived;
    }

    applyStatModifiers(entity, modifiers) {
        Object.keys(modifiers).forEach(stat => {
            if (entity.stats[stat] !== undefined) {
                entity.stats[stat] += modifiers[stat];
            }
        });

        // Recalculate derived stats
        entity.derivedStats = this.calculateDerivedStats(entity);
    }

    grantExperience(entity, amount) {
        if (!entity.experience) entity.experience = 0;
        const oldXP = entity.experience;
        entity.experience += amount;

        const currentLevel = entity.level || 1;
        const requiredXP = this.experienceTable[currentLevel + 1];
        const progressPercent = ((entity.experience / requiredXP) * 100).toFixed(1);

        console.log(`\n📈 XP GAIN:`);
        console.log(`   ${entity.name} gained ${amount} XP`);
        console.log(`   XP Progress: ${oldXP} → ${entity.experience} / ${requiredXP} (${progressPercent}%)`);
        console.log(`   Current Level: ${currentLevel}`);

        // Check for level up
        if (entity.experience >= requiredXP) {
            console.log(`   🎉 LEVEL UP TRIGGERED!`);
            this.levelUp(entity);
        } else {
            const xpToNext = requiredXP - entity.experience;
            console.log(`   XP to next level: ${xpToNext}`);
        }

        // Log XP gain
        if (this.game && this.game.logEvent) {
            this.game.logEvent(`${entity.name} gained ${amount} XP! (${progressPercent}% to level ${currentLevel + 1})`, 'progression');
        }
    }

    levelUp(entity) {
        const oldLevel = entity.level || 1;
        entity.level = oldLevel + 1;

        console.log(`\n🎊 LEVEL UP!`);
        console.log(`   ${entity.name}: Level ${oldLevel} → ${entity.level}`);
        console.log(`   Class: ${entity.class || 'Soldier'}`);

        // Award stat points based on class
        const classConfig = this.config?.classes?.[entity.class];
        const statPoints = classConfig?.statPointsPerLevel || 3;
        const skillPoints = classConfig?.skillPointsPerLevel || 1;

        entity.unspentStatPoints = (entity.unspentStatPoints || 0) + statPoints;
        entity.unspentSkillPoints = (entity.unspentSkillPoints || 0) + skillPoints;

        console.log(`   Rewards:`);
        console.log(`   +${statPoints} Stat Points (Total unspent: ${entity.unspentStatPoints})`);
        console.log(`   +${skillPoints} Skill Points (Total unspent: ${entity.unspentSkillPoints})`);

        // Check for new perks
        const availablePerks = this.getAvailablePerks(entity);
        if (availablePerks.length > 0 && entity.level % 3 === 0) {
            entity.unspentPerkPoints = (entity.unspentPerkPoints || 0) + 1;
            console.log(`   +1 Perk Point! (Total unspent: ${entity.unspentPerkPoints})`);
        }

        // Heal on level up
        const derivedStats = this.calculateDerivedStats(entity);
        const oldHealth = entity.health || 100;
        entity.health = derivedStats.maxHealth;
        console.log(`   Health restored: ${oldHealth} → ${entity.health}`);

        console.log(`   Available perks: ${availablePerks.length}`);
        if (availablePerks.length > 0) {
            console.log(`   Perks you can choose:`, availablePerks.map(p => p.name));
        }

        // Notify
        if (this.game && this.game.logEvent) {
            this.game.logEvent(`🎊 ${entity.name} reached Level ${entity.level}!`, 'progression', true);
            this.game.logEvent(`Gained ${statPoints} stat points and ${skillPoints} skill points!`, 'progression');
        }
    }

    getAvailablePerks(entity) {
        if (!this.config?.perks) return [];

        return Object.entries(this.config.perks)
            .filter(([id, perk]) => {
                // Check requirements
                if (perk.requirements) {
                    if (perk.requirements.level && entity.level < perk.requirements.level) return false;
                    if (perk.requirements.stats) {
                        for (let stat in perk.requirements.stats) {
                            if (entity.stats[stat] < perk.requirements.stats[stat]) return false;
                        }
                    }
                    if (perk.requirements.skills) {
                        for (let skill of perk.requirements.skills) {
                            if (!entity.skills || !entity.skills.includes(skill)) return false;
                        }
                    }
                }

                // Check if already has perk
                if (entity.perks && entity.perks.includes(id)) return false;

                return true;
            })
            .map(([id, perk]) => ({ id, ...perk }));
    }
}

// Inventory Manager
class InventoryManager {
    constructor() {
        this.inventories = new Map();
    }

    createInventory(ownerId, maxWeight = 100) {
        const inventory = new RPGInventory(maxWeight);
        this.inventories.set(ownerId, inventory);
        return inventory;
    }

    getInventory(ownerId) {
        return this.inventories.get(ownerId);
    }

    transferItem(fromId, toId, itemId, quantity = 1) {
        const fromInv = this.getInventory(fromId);
        const toInv = this.getInventory(toId);

        if (!fromInv || !toInv) return false;

        const item = fromInv.getItem(itemId);
        if (!item) return false;

        if (toInv.canAddItem(item, quantity)) {
            fromInv.removeItem(itemId, quantity);
            toInv.addItem(item, quantity);
            return true;
        }

        return false;
    }
}

// Shop Manager
class ShopManager {
    constructor() {
        this.shops = new Map();
        this.game = null; // Will be set when game initializes
    }

    loadShops() {
        // Load shops from config
        const rpgConfig = this.game?.getRPGConfig ? this.game.getRPGConfig() :
                         (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || {});
        if (rpgConfig?.shops) {
            Object.entries(rpgConfig.shops).forEach(([id, shop]) => {
                this.shops.set(id, {
                    ...shop,
                    inventory: this.generateShopInventory(shop)
                });
            });
        }
    }

    generateShopInventory(shop) {
        const inventory = [];

        if (shop.itemCategories) {
            shop.itemCategories.forEach(category => {
                // Get items from config matching category
                const rpgConfig = this.game?.getRPGConfig ? this.game.getRPGConfig() :
                                 (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || {});
                if (rpgConfig?.items?.[category]) {
                    Object.entries(rpgConfig.items[category]).forEach(([id, item]) => {
                        inventory.push({
                            id,
                            ...item,
                            stock: shop.infiniteStock ? -1 : (item.stock || 10),
                            price: Math.floor(item.value * (shop.priceMultiplier || 1))
                        });
                    });
                }
            });
        }

        return inventory;
    }

    buyItem(shopId, itemId, quantity = 1, buyerId) {
        const shop = this.shops.get(shopId);
        if (!shop) return false;

        const item = shop.inventory.find(i => i.id === itemId);
        if (!item) return false;

        const totalCost = item.price * quantity;

        // Check buyer has enough credits (assuming credits stored on entity)
        const buyer = this.game?.rpgManager?.entities.get(buyerId);
        if (!buyer || (buyer.credits || 0) < totalCost) return false;

        // Check stock
        if (item.stock !== -1 && item.stock < quantity) return false;

        // Process transaction
        buyer.credits -= totalCost;
        if (item.stock !== -1) item.stock -= quantity;

        // Add to buyer inventory
        const inventory = this.game?.inventoryManager?.getInventory(buyerId);
        if (inventory) {
            inventory.addItem(item, quantity);
        }

        return true;
    }

    sellItem(shopId, itemId, quantity = 1, sellerId) {
        const shop = this.shops.get(shopId);
        if (!shop) return false;

        const inventory = this.game?.inventoryManager?.getInventory(sellerId);
        if (!inventory) return false;

        const item = inventory.getItem(itemId);
        if (!item || item.quantity < quantity) return false;

        // Calculate sell price (usually lower than buy price)
        const sellPrice = Math.floor(item.value * 0.5 * (shop.priceMultiplier || 1));
        const totalValue = sellPrice * quantity;

        // Process transaction
        const seller = this.game?.rpgManager?.entities.get(sellerId);
        if (seller) {
            seller.credits = (seller.credits || 0) + totalValue;
            inventory.removeItem(itemId, quantity);

            // Add back to shop inventory if not infinite stock
            const shopItem = shop.inventory.find(i => i.id === itemId);
            if (shopItem && shopItem.stock !== -1) {
                shopItem.stock += quantity;
            }

            return true;
        }

        return false;
    }
}

// Override agent creation to use RPG system
CyberOpsGame.prototype.createAgent = function(agent) {
    // Call original function first
    if (this._originalCreateAgent) {
        this._originalCreateAgent.call(this, agent);
    }

    // Enhance with RPG stats if system is initialized
    if (this.rpgManager) {
        const rpgAgent = this.rpgManager.createRPGAgent(agent, agent.class || 'soldier');

        // Update agent properties based on RPG stats
        const derived = this.rpgManager.calculateDerivedStats(rpgAgent);
        agent.maxHealth = derived.maxHealth;
        agent.health = agent.health || derived.maxHealth;
        agent.maxAP = derived.maxAP;
        agent.ap = agent.ap || derived.maxAP;
        agent.critChance = derived.critChance;
        agent.dodge = derived.dodge;

        // Store RPG reference
        agent.rpgEntity = rpgAgent;

        // Create inventory
        if (this.inventoryManager) {
            this.inventoryManager.createInventory(agent.id || agent.name, derived.carryWeight);
        }
    }

    return agent;
};

// Override enemy creation
CyberOpsGame.prototype.createEnemy = function(enemy) {
    // Call original if exists
    if (this._originalCreateEnemy) {
        this._originalCreateEnemy.call(this, enemy);
    }

    // Enhance with RPG stats
    if (this.rpgManager) {
        const rpgEnemy = this.rpgManager.createRPGEnemy(enemy, enemy.type || 'basic');

        // Update enemy properties
        const derived = this.rpgManager.calculateDerivedStats(rpgEnemy);
        enemy.maxHealth = derived.maxHealth;
        enemy.health = enemy.health || derived.maxHealth;
        enemy.damage = 10 + (rpgEnemy.stats.strength || 10);

        // Store RPG reference
        enemy.rpgEntity = rpgEnemy;
    }

    return enemy;
};

// Override NPC creation
CyberOpsGame.prototype.createNPC = function(npc) {
    // Call original if exists
    if (this._originalCreateNPC) {
        this._originalCreateNPC.call(this, npc);
    }

    // Enhance with RPG stats
    if (this.rpgManager) {
        const rpgNPC = this.rpgManager.createRPGNPC(npc);

        // Store RPG reference
        npc.rpgEntity = rpgNPC;
    }

    return npc;
};

// Upgrade existing entities to RPG system
CyberOpsGame.prototype.upgradeExistingEntities = function() {
    // Upgrade agents
    if (this.agents) {
        this.agents.forEach(agent => {
            if (!agent.rpgEntity && this.rpgManager) {
                const rpgAgent = this.rpgManager.createRPGAgent(agent, agent.class || 'soldier');
                agent.rpgEntity = rpgAgent;

                // Create inventory
                if (this.inventoryManager) {
                    const derived = this.rpgManager.calculateDerivedStats(rpgAgent);
                    this.inventoryManager.createInventory(agent.id || agent.name, derived.carryWeight);
                }
            }
        });
    }

    // Upgrade enemies
    if (this.enemies) {
        this.enemies.forEach(enemy => {
            if (!enemy.rpgEntity && this.rpgManager) {
                const rpgEnemy = this.rpgManager.createRPGEnemy(enemy, enemy.type || 'basic');
                enemy.rpgEntity = rpgEnemy;
            }
        });
    }

    // Upgrade NPCs
    if (this.npcs) {
        this.npcs.forEach(npc => {
            if (!npc.rpgEntity && this.rpgManager) {
                const rpgNPC = this.rpgManager.createRPGNPC(npc);
                npc.rpgEntity = rpgNPC;
            }
        });
    }
};

// Sync existing hub equipment with RPG inventory system
CyberOpsGame.prototype.syncEquipmentWithRPG = function() {
    console.log('🔄 Syncing hub equipment with RPG inventory...');
    console.log('   Weapons in game:', this.weapons?.length || 0, 'items');
    console.log('   Equipment in game:', this.equipment?.length || 0, 'items');
    if (this.weapons && this.weapons.length > 0) {
        console.log('   First weapon:', this.weapons[0].name, 'owned:', this.weapons[0].owned);
    }

    // Use GameServices if available
    if (window.GameServices && window.GameServices.rpgService) {
        window.GameServices.rpgService.syncEquipment(this);
        console.log('✅ Equipment sync complete via GameServices');
        return;
    }

    // Fallback to local sync
    // Ensure systems are initialized
    if (!this.inventoryManager || !this.rpgManager) {
        console.warn('⚠️ RPG systems not initialized, skipping sync');
        return;
    }

    // Sync weapons from hub to RPG inventory
    if (this.weapons) {
        this.weapons.forEach(weapon => {
            if (weapon.owned > 0) {
                // Convert hub weapon to RPG item format
                const rpgWeapon = {
                    id: `weapon_${weapon.id}`,
                    name: weapon.name,
                    type: 'weapon',
                    slot: 'primary',
                    weight: weapon.weight || 5,
                    value: weapon.cost || 1000,
                    stats: {
                        damage: weapon.damage || 10,
                        accuracy: weapon.accuracy || 80,
                        range: weapon.range || 10
                    },
                    quantity: weapon.owned
                };

                // Add to RPG config if not exists
                const rpgConfig = this.getRPGConfig();
                if (rpgConfig.items && !rpgConfig.items.weapons[rpgWeapon.id]) {
                    rpgConfig.items.weapons[rpgWeapon.id] = rpgWeapon;
                }

                console.log(`   ✅ Synced weapon: ${weapon.name} (x${weapon.owned})`);
            }
        });
    }

    // Sync equipment/armor from hub to RPG inventory
    if (this.equipment) {
        this.equipment.forEach(item => {
            if (item.owned > 0) {
                const itemType = item.protection ? 'armor' : 'consumables';
                const slot = item.protection ? 'armor' : null;

                // Convert hub equipment to RPG item format
                const rpgItem = {
                    id: `${itemType}_${item.id}`,
                    name: item.name,
                    type: itemType,
                    slot: slot,
                    weight: item.weight || 3,
                    value: item.cost || 500,
                    stats: {},
                    quantity: item.owned
                };

                // Add relevant stats
                if (item.protection) rpgItem.stats.defense = item.protection;
                if (item.hackBonus) rpgItem.stats.hackBonus = item.hackBonus;
                if (item.stealthBonus) rpgItem.stats.stealthBonus = item.stealthBonus;
                if (item.explosiveDamage) rpgItem.stats.explosiveDamage = item.explosiveDamage;

                // Add to RPG config if not exists
                const rpgConfig = this.getRPGConfig();
                if (rpgConfig.items && !rpgConfig.items[itemType][rpgItem.id]) {
                    rpgConfig.items[itemType][rpgItem.id] = rpgItem;
                }

                console.log(`   ✅ Synced ${itemType}: ${item.name} (x${item.owned})`);
            }
        });
    }

    // Sync agent loadouts to RPG inventories
    if (this.agentLoadouts) {
        // Get all agents (active agents in hub, or agents array in mission)
        const agentsToSync = this.activeAgents || this.agents || [];

        agentsToSync.forEach(agent => {
            const agentId = agent.id || agent.name;
            const loadout = this.agentLoadouts[agentId];

            // Create or get inventory
            let inventory = this.inventoryManager.getInventory(agentId);
            if (!inventory && this.inventoryManager) {
                const carryWeight = agent.rpgEntity?.derivedStats?.carryWeight || 100;
                inventory = this.inventoryManager.createInventory(agentId, carryWeight);
            }

            if (loadout && inventory) {
                // Clear current inventory equipment
                inventory.clearEquipment();

                // Equip weapon from loadout
                if (loadout.weapon) {
                    const weapon = this.getItemById('weapon', loadout.weapon);
                    if (weapon) {
                        const rpgWeaponId = `weapon_${loadout.weapon}`;
                        // Add weapon to inventory items if not there
                        if (!inventory.items.find(i => i.id === rpgWeaponId)) {
                            const rpgConfig = this.getRPGConfig();
                            const rpgWeapon = rpgConfig?.items?.weapons?.[rpgWeaponId];
                            if (rpgWeapon) {
                                inventory.items.push({
                                    ...rpgWeapon,
                                    quantity: 1,
                                    instanceId: `${rpgWeaponId}_${Date.now()}`
                                });
                            }
                        }
                        inventory.equipItem(rpgWeaponId, 'primary');
                        console.log(`   ✅ Equipped ${weapon.name} on ${agent.name}`);
                    }
                }

                // Equip armor from loadout
                if (loadout.armor) {
                    const armor = this.getItemById('armor', loadout.armor);
                    if (armor) {
                        const rpgArmorId = `armor_${loadout.armor}`;
                        // Add armor to inventory items if not there
                        if (!inventory.items.find(i => i.id === rpgArmorId)) {
                            const rpgConfig = this.getRPGConfig();
                            const rpgArmor = rpgConfig?.items?.armor?.[rpgArmorId];
                            if (rpgArmor) {
                                inventory.items.push({
                                    ...rpgArmor,
                                    quantity: 1,
                                    instanceId: `${rpgArmorId}_${Date.now()}`
                                });
                            }
                        }
                        inventory.equipItem(rpgArmorId, 'armor');
                        console.log(`   ✅ Equipped ${armor.name} on ${agent.name}`);
                    }
                }

                // Add utility items to inventory
                if (loadout.utility) {
                    const utility = this.getItemById('equipment', loadout.utility);
                    if (utility) {
                        const rpgUtilityId = `consumables_${loadout.utility}`;
                        const rpgConfig = this.getRPGConfig();
                        const rpgUtility = rpgConfig?.items?.consumables?.[rpgUtilityId];
                        if (rpgUtility && !inventory.items.find(i => i.id === rpgUtilityId)) {
                            inventory.addItem(rpgUtility, 1);
                            console.log(`   ✅ Added ${utility.name} to ${agent.name}'s inventory`);
                        }
                    }
                }
            }
        });
    }

    console.log('✅ Equipment sync complete');
};

// Enhanced combat calculation using RPG stats
CyberOpsGame.prototype.calculateDamage = function(attacker, target, weaponType = 'rifle') {
    // ALWAYS use GameServices - NO FALLBACKS
    if (!window.GameServices || !window.GameServices.calculateAttackDamage) {
        console.error('⚠️ CRITICAL: GameServices not available! No damage calculation possible.');
        return 0; // No damage if service not available
    }

    return window.GameServices.calculateAttackDamage(attacker, target, { weaponType });
};

// REMOVED: Old fallback damage calculation code - everything now goes through GameServices

// Handle entity death with XP rewards
CyberOpsGame.prototype.onEntityDeath = function(entity, killer) {
    // Grant XP to killer
    if (killer && killer.rpgEntity && entity.rpgEntity) {
        const xpReward = this.calculateXPReward(entity);
        this.rpgManager.grantExperience(killer.rpgEntity, xpReward);

        // Show XP gain notification
        if (this.logEvent) {
            this.logEvent(`💀 ${killer.name} killed ${entity.type || 'enemy'} (+${xpReward} XP)`, 'combat', true);
        }

        // Create floating XP text effect
        if (entity.x && entity.y) {
            this.effects = this.effects || [];
            this.effects.push({
                type: 'text',
                text: `+${xpReward} XP`,
                x: entity.x,
                y: entity.y,
                color: '#FFD700',
                duration: 60,
                dy: -0.5
            });
        }
    } else {
        // Debug why XP wasn't granted
        if (!killer) console.warn('No killer for entity death');
        if (!killer?.rpgEntity) console.warn('Killer has no rpgEntity:', killer);
        if (!entity?.rpgEntity) console.warn('Dead entity has no rpgEntity:', entity);
    }

    // Drop loot
    if (entity.rpgEntity && entity.rpgEntity.inventory) {
        this.dropLoot(entity);
    }
};

// Calculate XP reward based on entity level
CyberOpsGame.prototype.calculateXPReward = function(entity) {
    const baseXP = 100;
    const levelDiff = (entity.level || 1) - (this._selectedAgent?.level || 1);
    const multiplier = Math.max(0.1, 1 + (levelDiff * 0.2));
    return Math.floor(baseXP * multiplier);
};

// Drop loot from defeated enemies
CyberOpsGame.prototype.dropLoot = function(entity) {
    if (!entity.x || !entity.y) return;

    // Create loot container at entity position
    const loot = {
        x: entity.x,
        y: entity.y,
        type: 'loot',
        items: [],
        credits: Math.floor(Math.random() * 100 * (entity.level || 1))
    };

    // Add items from inventory
    if (entity.rpgEntity?.inventory) {
        // Drop some items based on loot table
        // This would use loot tables from config
    }

    // Add to world
    if (!this.lootContainers) this.lootContainers = [];
    this.lootContainers.push(loot);
};

// Skill usage with RPG mechanics
CyberOpsGame.prototype.useSkill = function(agent, skillId, target) {
    if (!agent.rpgEntity) return false;

    const rpgConfig = this.getRPGConfig();
    const skill = rpgConfig?.skills?.[skillId];
    if (!skill) return false;

    // Check if agent has skill
    if (!agent.rpgEntity.skills?.includes(skillId)) {
        if (this.logEvent) {
            this.logEvent(`${agent.name} doesn't know ${skill.name}!`, 'warning');
        }
        return false;
    }

    // Check cooldown
    if (agent.skillCooldowns?.[skillId] > 0) {
        if (this.logEvent) {
            this.logEvent(`${skill.name} is on cooldown!`, 'warning');
        }
        return false;
    }

    // Check AP cost
    if (this.turnBasedMode && agent.ap < (skill.apCost || 2)) {
        if (this.logEvent) {
            this.logEvent(`Not enough AP for ${skill.name}!`, 'warning');
        }
        return false;
    }

    // Apply skill effects
    this.applySkillEffects(agent, skill, target);

    // Consume AP
    if (this.turnBasedMode) {
        agent.ap -= (skill.apCost || 2);
    }

    // Set cooldown
    if (!agent.skillCooldowns) agent.skillCooldowns = {};
    agent.skillCooldowns[skillId] = skill.cooldown || 0;

    // Trigger VFX/SFX
    if (skill.vfx) {
        this.playVFX(skill.vfx, target || agent);
    }
    if (skill.sfx) {
        this.playSFX(skill.sfx);
    }

    return true;
};

// Apply skill effects
CyberOpsGame.prototype.applySkillEffects = function(agent, skill, target) {
    if (skill.damage && target) {
        const damage = this.calculateSkillDamage(agent, skill);
        target.health -= damage;

        if (this.logEvent) {
            this.logEvent(`${skill.name} dealt ${damage} damage!`, 'combat');
        }
    }

    if (skill.heal) {
        const healTarget = target || agent;
        const healAmount = skill.heal + (agent.rpgEntity.stats.intellect || 10) * 2;
        healTarget.health = Math.min(healTarget.maxHealth, healTarget.health + healAmount);

        if (this.logEvent) {
            this.logEvent(`${skill.name} healed ${healAmount} HP!`, 'heal');
        }
    }

    if (skill.buff) {
        // Apply temporary stat buffs
        this.applyBuff(target || agent, skill.buff);
    }

    if (skill.debuff && target) {
        // Apply debuffs to target
        this.applyDebuff(target, skill.debuff);
    }
};

// Calculate skill damage with stat modifiers
CyberOpsGame.prototype.calculateSkillDamage = function(agent, skill) {
    let damage = skill.damage || 0;

    if (agent.rpgEntity) {
        const stats = agent.rpgEntity.stats;

        // Apply stat scaling
        if (skill.scaling) {
            Object.entries(skill.scaling).forEach(([stat, scale]) => {
                damage += (stats[stat] || 10) * scale;
            });
        }
    }

    return Math.floor(damage);
};

// Initialize RPG system when game starts
const _originalInit = CyberOpsGame.prototype.init;
CyberOpsGame.prototype.init = function() {
    // Initialize RPG system first
    this.initRPGSystem();

    // Call original init
    if (_originalInit) {
        _originalInit.call(this);
    }
};

// Update skill cooldowns each turn
const _originalUpdateGame = CyberOpsGame.prototype.updateGame;
CyberOpsGame.prototype.updateGame = function(deltaTime) {
    // Update cooldowns
    if (this.agents) {
        this.agents.forEach(agent => {
            if (agent.skillCooldowns) {
                Object.keys(agent.skillCooldowns).forEach(skillId => {
                    if (agent.skillCooldowns[skillId] > 0) {
                        agent.skillCooldowns[skillId] -= deltaTime / 1000;
                        if (agent.skillCooldowns[skillId] <= 0) {
                            delete agent.skillCooldowns[skillId];
                        }
                    }
                });
            }
        });
    }

    // Call original update
    if (_originalUpdateGame) {
        _originalUpdateGame.call(this, deltaTime);
    }
};

console.log('🎮 RPG Integration loaded');