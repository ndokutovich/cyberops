/**
 * game-rpg-integration.js
 * Integrates RPG system with existing CyberOps game mechanics
 * Provides backwards-compatible wrappers and adapters
 */

// Helper to get RPG config - FAIL FAST if not found
CyberOpsGame.prototype.getRPGConfig = function() {
    // Try content loader first
    if (window.ContentLoader) {
        const config = window.ContentLoader.getContent('rpgConfig');
        if (config) return config;
    }
    // Try campaign config
    if (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
        return window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
    }
    // FAIL FAST - RPG config is required for RPG features
    throw new Error('RPG config not found in ContentLoader or MAIN_CAMPAIGN_CONFIG - campaign must provide RPG configuration');
};

// Integration layer for existing agent/enemy/NPC systems
CyberOpsGame.prototype.initRPGSystem = function() {
    if (this.logger) this.logger.debug('🎮 Initializing RPG System...');

    // Store original functions
    this._originalCreateAgent = this.createAgent;
    this._originalCreateEnemy = this.createEnemy;
    this._originalCreateNPC = this.createNPC;

    // Initialize RPG through GameServices (required)
    if (!window.GameServices || !window.GameServices.rpgService) {
        console.error('❌ GameServices.rpgService not available - RPG system cannot initialize');
        return;
    }

    // Use centralized RPG service
    window.GameServices.rpgService.initialize(this);

    // Store references locally for convenience
    this.rpgManager = window.GameServices.rpgService.rpgManager;
    this.inventoryManager = window.GameServices.rpgService.inventoryManager;
    this.shopManager = window.GameServices.rpgService.shopManager;

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
        if (this.logger) this.logger.error('❌ No RPG config found in campaign!');
    }

    // Sync existing hub equipment with RPG system
    this.syncEquipmentWithRPG();

    // Initialize existing entities with RPG stats
    this.upgradeExistingEntities();

    if (this.logger) this.logger.info('✅ RPG System initialized');
};

// RPG Manager - Central management of RPG mechanics
class RPGManager {
    constructor() {
        this.logger = window.Logger ? new window.Logger("RPGManager") : null;
        this.config = null;
        this.entities = new Map(); // Track all RPG entities
        this.experienceTable = [];
        this.levelUpCallbacks = []; // Callbacks for level up events

        // Generate experience table (no circular references)
        this.generateExperienceTable();
    }

    loadConfig(config) {
        this.config = config;
        // Don't call back to RPGService to avoid recursion
    }

    generateExperienceTable() {
        // Generate default experience table
        for (let level = 1; level <= 100; level++) {
            this.experienceTable[level] = Math.floor(100 * Math.pow(1.5, level - 1));
        }
    }

    getExperienceForLevel(level) {
        // Return experience required for a specific level
        return this.experienceTable[level] || 0;
    }

    getEntity(id) {
        // Get entity by ID from the entities map
        return this.entities.get(id);
    }

    createRPGAgent(baseAgent, classType = 'soldier') {
        // Direct implementation - don't call RPGService to avoid recursion
        if (this.logger) this.logger.debug(`\n🎮 Creating RPG Agent: ${baseAgent.name}`);
        if (this.logger) this.logger.debug(`   Class: ${classType}`);

        const classConfig = this.config?.classes?.[classType] || {};
        const rpgAgent = new RPGAgent({
            id: baseAgent.id || baseAgent.name, // Ensure ID is set
            ...baseAgent,
            class: classType,
            level: baseAgent.level || 1,
            xp: baseAgent.experience || baseAgent.xp || 0, // RPGAgent uses 'xp', not 'experience'
            stats: this.generateInitialStats(classType),
            // Preserve agent's existing skills or use class defaults
            skills: baseAgent.skills || this.getClassSkills(classType),
            // Preserve agent's existing perks or use empty array
            perks: baseAgent.perks || [],
            // Give starting points for customization
            statPoints: 3,
            skillPoints: 1,
            perkPoints: 1
        });

        // Add experience property for compatibility
        rpgAgent.experience = rpgAgent.xp;

        if (this.logger) this.logger.debug(`   Initial Stats:`, rpgAgent.stats);

        // Copy existing agent properties
        Object.keys(baseAgent).forEach(key => {
            if (rpgAgent[key] === undefined) {
                rpgAgent[key] = baseAgent[key];
            }
        });

        // Calculate and store derived stats
        const derived = this.calculateDerivedStats(rpgAgent);
        rpgAgent.derivedStats = derived;

        if (this.logger) this.logger.debug(`   Derived Stats Summary:`);
        if (this.logger) this.logger.debug(`   - Max Health: ${derived.maxHealth}`);
        if (this.logger) this.logger.debug(`   - Max AP: ${derived.maxAP}`);

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

    // Learn a skill for an entity (unidirectional flow)
    learnSkill(entityId, skillId) {
        // Try both numeric and string versions of the ID
        let entity = this.entities.get(entityId);

        if (!entity && typeof entityId === 'string') {
            // Try parsing as number
            const numericId = parseInt(entityId, 10);
            if (!isNaN(numericId)) {
                entity = this.entities.get(numericId);
                if (this.logger && entity) {
                    this.logger.debug(`🎓 Found entity using numeric ID: ${numericId}`);
                }
            }
        } else if (!entity && typeof entityId === 'number') {
            // Try as string
            entity = this.entities.get(String(entityId));
            if (this.logger && entity) {
                this.logger.debug(`🎓 Found entity using string ID: "${entityId}"`);
            }
        }

        if (!entity) {
            if (this.logger) {
                this.logger.error(`❌ Entity not found: ${entityId} (type: ${typeof entityId})`);
                this.logger.debug(`🎓 Available entity IDs: ${Array.from(this.entities.keys()).join(', ')}`);
            }
            return false;
        }

        if (this.logger) {
            this.logger.debug(`🎓 Learning skill: entityId=${entityId}, skillId=${skillId}`);
            this.logger.debug(`🎓 Entity availableSkillPoints: ${entity.availableSkillPoints}`);
            this.logger.debug(`🎓 Entity skills: ${JSON.stringify(entity.skills || {})}`);
        }

        // Check if entity has available skill points
        if (!entity.availableSkillPoints || entity.availableSkillPoints <= 0) {
            if (this.logger) this.logger.warn(`⚠️ No skill points available for ${entityId} (has ${entity.availableSkillPoints})`);
            return false;
        }

        // Get skill config
        const skillConfig = this.config?.skills?.[skillId];
        if (!skillConfig) {
            if (this.logger) this.logger.error(`Skill not found: ${skillId}`);
            return false;
        }

        // Check current level
        const currentLevel = entity.skills?.[skillId] || 0;
        const maxLevel = skillConfig.maxLevel || 5;

        if (currentLevel >= maxLevel) {
            if (this.logger) this.logger.warn(`Skill ${skillId} already at max level`);
            return false;
        }

        // Learn the skill (modify entity managed by RPGManager)
        if (!entity.skills) entity.skills = {};
        entity.skills[skillId] = currentLevel + 1;
        entity.availableSkillPoints--;

        if (this.logger) {
            this.logger.info(`✨ ${entityId} learned ${skillConfig.name} (Level ${entity.skills[skillId]})`);
        }

        return true;
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
        // Use RPGService if available
        if (this.rpgService && this.rpgService.generateInitialStats) {
            return this.rpgService.generateInitialStats(classType);
        }

        // Fallback to default stats
        return {
            strength: 10,
            agility: 10,
            intellect: 10,
            tech: 10,
            charisma: 10,
            perception: 10,
            endurance: 10
        };
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
        // Use RPGService if available
        if (this.rpgService && this.rpgService.calculateDerivedStats) {
            return this.rpgService.calculateDerivedStats(entity);
        }

        // Fallback to basic derived stats
        return {
            maxHealth: 100,
            maxAP: 6,
            critChance: 5,
            dodge: 5,
            carryWeight: 100
        };
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
        // Direct implementation - don't call back to RPGService to avoid recursion
        // Handle both 'xp' and 'experience' properties for compatibility
        if (!entity.experience && !entity.xp) {
            entity.experience = 0;
            entity.xp = 0;
        }
        const oldXP = entity.experience || entity.xp || 0;
        entity.experience = (entity.experience || entity.xp || 0) + amount;
        entity.xp = entity.experience; // Keep both in sync

        const currentLevel = entity.level || 1;
        const requiredXP = this.experienceTable[currentLevel + 1];
        const progressPercent = ((entity.experience / requiredXP) * 100).toFixed(1);

        if (this.logger) this.logger.debug(`\n📈 XP GAIN:`);
        if (this.logger) this.logger.debug(`   ${entity.name} gained ${amount} XP`);
        if (this.logger) this.logger.debug(`   XP Progress: ${oldXP} → ${entity.experience} / ${requiredXP} (${progressPercent}%)`);

        // Check for level up
        if ((entity.experience || entity.xp) >= requiredXP) {
            if (this.logger) this.logger.debug(`   🎉 LEVEL UP TRIGGERED!`);
            this.levelUp(entity);
        }

        return entity;
    }

    levelUp(entity) {
        const oldLevel = entity.level || 1;
        entity.level = oldLevel + 1;

        if (this.logger) this.logger.debug(`\n🎊 LEVEL UP!`);
        if (this.logger) this.logger.debug(`   ${entity.name}: Level ${oldLevel} → ${entity.level}`);
        if (this.logger) this.logger.debug(`   Class: ${entity.class || 'Soldier'}`);

        // Award stat points based on class
        const classConfig = this.config?.classes?.[entity.class];
        const statPoints = classConfig?.statPointsPerLevel || 3;
        const skillPoints = classConfig?.skillPointsPerLevel || 1;

        entity.availableStatPoints = (entity.availableStatPoints || 0) + statPoints;
        entity.availableSkillPoints = (entity.availableSkillPoints || 0) + skillPoints;

        if (this.logger) this.logger.debug(`   Rewards:`);
        if (this.logger) this.logger.debug(`   +${statPoints} Stat Points (Total: ${entity.availableStatPoints})`);
        if (this.logger) this.logger.debug(`   +${skillPoints} Skill Points (Total: ${entity.availableSkillPoints})`);

        // Check for new perks
        const availablePerks = this.getAvailablePerks(entity);
        if (availablePerks.length > 0 && entity.level % 3 === 0) {
            entity.availablePerkPoints = (entity.availablePerkPoints || 0) + 1;
            if (this.logger) this.logger.debug(`   +1 Perk Point! (Total: ${entity.availablePerkPoints})`);
        }

        // Heal on level up
        const derivedStats = this.calculateDerivedStats(entity);
        const oldHealth = entity.health || 100;
        entity.health = derivedStats.maxHealth;
        if (this.logger) this.logger.debug(`   Health restored: ${oldHealth} → ${entity.health}`);

        if (this.logger) this.logger.debug(`   Available perks: ${availablePerks.length}`);
        if (availablePerks.length > 0) {
            if (this.logger) this.logger.debug(`   Perks you can choose:`, availablePerks.map(p => p.name));
        }

        // Trigger level up callbacks
        const rewards = {
            statPoints,
            skillPoints,
            perkPoints: entity.availablePerkPoints || 0
        };
        this.levelUpCallbacks.forEach(callback => {
            try {
                callback(entity, entity.level, rewards);
            } catch (error) {
                if (this.logger) this.logger.error('Level up callback error:', error);
            }
        });

        // Notify
        if (this.game && this.game.logEvent) {
            this.game.logEvent(`🎊 ${entity.name} reached Level ${entity.level}!`, 'progression', true);
            this.game.logEvent(`Gained ${statPoints} stat points and ${skillPoints} skill points!`, 'progression');
        }

        // Show level up notification if the game has the UI method
        if (this.game && this.game.showLevelUpNotification) {
            // Find the agent that leveled up
            const agent = this.game.agents?.find(a => a.rpgEntity === entity) ||
                         this.game.activeAgents?.find(a => a.rpgEntity === entity);
            if (agent) {
                this.game.showLevelUpNotification(agent);
            }
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
    constructor(rpgManager = null, inventoryManager = null, resourceService = null) {
        this.shops = new Map();
        this.rpgManager = rpgManager;
        this.inventoryManager = inventoryManager;
        this.resourceService = resourceService;
        this.rpgConfig = null;
    }

    setConfig(config) {
        this.rpgConfig = config;
    }

    loadShops() {
        // Load shops from config
        const rpgConfig = this.rpgConfig || window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || {};

        console.log('🛒 loadShops called - rpgConfig has shops?', !!rpgConfig?.shops);
        if (rpgConfig?.shops) {
            console.log('🛒 Shop IDs in config:', Object.keys(rpgConfig.shops));
            Object.entries(rpgConfig.shops).forEach(([id, shop]) => {
                const inventory = this.generateShopInventory(shop);
                this.shops.set(id, {
                    ...shop,
                    inventory: inventory
                });
                console.log(`🛒 Loaded shop: ${id} (${shop.name}) with ${inventory.length} items`);
            });
        } else {
            console.warn('⚠️ No shops found in rpgConfig');
        }
        console.log('🛒 Total shops loaded:', this.shops.size);
    }

    generateShopInventory(shop) {
        const inventory = [];
        const rpgConfig = this.rpgConfig || window.MAIN_CAMPAIGN_CONFIG?.rpgConfig || {};

        console.log('🛒 generateShopInventory - shop has categories?', !!shop.itemCategories);
        console.log('🛒 rpgConfig has items?', !!rpgConfig?.items);

        if (shop.itemCategories) {
            shop.itemCategories.forEach(category => {
                console.log(`🛒 Looking for items in category: ${category}`);
                if (rpgConfig?.items?.[category]) {
                    console.log(`  ✓ Found ${Object.keys(rpgConfig.items[category]).length} items in ${category}`);
                    Object.entries(rpgConfig.items[category]).forEach(([id, item]) => {
                        inventory.push({
                            id,
                            ...item,
                            stock: shop.infiniteStock ? -1 : (item.stock || 10),
                            price: Math.floor(item.value * (shop.priceMultiplier || 1))
                        });
                    });
                } else {
                    console.warn(`  ✗ No items found in category: ${category}`);
                }
            });
        }

        // Add exclusive items for this shop
        if (shop.exclusiveItems && Array.isArray(shop.exclusiveItems)) {
            console.log(`🛒 Adding ${shop.exclusiveItems.length} exclusive items`);
            shop.exclusiveItems.forEach(itemId => {
                // Search for the exclusive item in all categories
                let foundItem = null;
                let foundId = itemId;

                if (rpgConfig?.items) {
                    for (const [category, items] of Object.entries(rpgConfig.items)) {
                        for (const [id, item] of Object.entries(items)) {
                            if (id === itemId || item.id === itemId) {
                                foundItem = item;
                                foundId = id;
                                console.log(`  ✓ Found exclusive item "${item.name}" in ${category}`);
                                break;
                            }
                        }
                        if (foundItem) break;
                    }
                }

                if (foundItem) {
                    inventory.push({
                        id: foundId,
                        ...foundItem,
                        stock: shop.infiniteStock ? -1 : 1,  // Unique items usually have limited stock
                        price: Math.floor(foundItem.value * (shop.priceMultiplier || 1))
                    });
                } else {
                    console.warn(`  ✗ Exclusive item not found: ${itemId}`);
                }
            });
        }

        return inventory;
    }

    getShop(shopId) {
        return this.shops.get(shopId);
    }

    buyItem(shopId, itemId, quantity = 1, buyerId) {
        const shop = this.shops.get(shopId);
        if (!shop) return false;

        const item = shop.inventory.find(i => i.id === itemId);
        if (!item) return false;

        const totalCost = item.price * quantity;

        // Check team has enough credits (use ResourceService)
        const teamCredits = this.resourceService?.get('credits') || 0;
        if (teamCredits < totalCost) return false;

        // Check stock
        if (item.stock !== -1 && item.stock < quantity) return false;

        // Process transaction - deduct from team credits
        if (this.resourceService) {
            this.resourceService.spend('credits', totalCost, `Bought ${item.name}`);
        }

        if (item.stock !== -1) item.stock -= quantity;

        // Add to buyer inventory
        const inventory = this.inventoryManager?.getInventory(buyerId);
        if (inventory) {
            inventory.addItem(item, quantity);
        }

        return true;
    }

    sellItem(shopId, itemId, quantity = 1, sellerId) {
        const shop = this.shops.get(shopId);
        if (!shop) return false;

        const inventory = this.inventoryManager?.getInventory(sellerId);
        if (!inventory) return false;

        const item = inventory.getItem(itemId);
        if (!item || item.quantity < quantity) return false;

        // Calculate sell price (usually lower than buy price)
        const sellPrice = Math.floor(item.value * 0.5 * (shop.priceMultiplier || 1));
        const totalValue = sellPrice * quantity;

        // Process transaction - add to team credits
        if (this.resourceService) {
            this.resourceService.add('credits', totalValue, `Sold ${item.name}`);
        }

        inventory.removeItem(itemId, quantity);

        // Add back to shop inventory if not infinite stock
        const shopItem = shop.inventory.find(i => i.id === itemId);
        if (shopItem && shopItem.stock !== -1) {
            shopItem.stock += quantity;
        }

        return true;
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
            } else if (agent.rpgEntity && this.rpgManager) {
                // Re-register existing entity in Map (for hub context)
                const entityId = agent.originalId || agent.id || agent.name;
                this.rpgManager.entities.set(entityId, agent.rpgEntity);
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
    if (this.logger) this.logger.debug('🔄 Syncing agent loadouts with RPG inventory...');

    // Use GameServices if available (recommended path)
    if (window.GameServices && window.GameServices.rpgService) {
        window.GameServices.rpgService.syncEquipment();
        if (this.logger) this.logger.info('✅ Equipment sync complete via GameServices');
        return;
    }

    // DEPRECATED fallback path - should not be used
    if (this.logger) this.logger.warn('⚠️ GameServices not available, equipment sync skipped');
};

// Enhanced combat calculation using RPG stats
CyberOpsGame.prototype.calculateDamage = function(attacker, target, weaponType = 'rifle') {
    // ALWAYS use GameServices - NO FALLBACKS
    if (!window.GameServices || !window.GameServices.calculateAttackDamage) {
        if (this.logger) this.logger.error('⚠️ CRITICAL: GameServices not available! No damage calculation possible.');
        return 0; // No damage if service not available
    }

    return window.GameServices.calculateAttackDamage(attacker, target, { weaponType });
};

// REMOVED: Old fallback damage calculation code - everything now goes through GameServices

// Handle entity death with XP rewards
CyberOpsGame.prototype.onEntityDeath = function(entity, killer) {
    if (this.logger) this.logger.debug('💀 onEntityDeath called:', {
        entity: entity?.type || entity?.name || 'unknown',
        entityHasRPG: !!entity?.rpgEntity,
        killer: killer?.name || 'unknown',
        killerHasRPG: !!killer?.rpgEntity
    });

    // Grant XP to killer
    if (killer && killer.rpgEntity && entity.rpgEntity) {
        const xpReward = this.calculateXPReward(entity);
        if (this.logger) this.logger.debug(`🎯 Granting ${xpReward} XP to ${killer.name}`);
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

        // Refresh character dialog if it's open to show new XP
        const characterDialog = document.getElementById('dialog-character');
        if (characterDialog && characterDialog.style.display !== 'none') {
            // Check if the killer is the currently selected agent
            if (killer === this._selectedAgent ||
                (killer.id && this._selectedAgent?.id === killer.id) ||
                (killer.name && this._selectedAgent?.name === killer.name)) {
                // Refresh the dialog to show updated XP
                const dialogEngine = this.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
                if (dialogEngine && dialogEngine.navigateTo) {
                    dialogEngine.navigateTo('character', null, true);
                }
            }
        }
    } else {
        // Debug why XP wasn't granted
        if (!killer) if (this.logger) this.logger.warn('No killer for entity death');
        if (!killer?.rpgEntity) if (this.logger) this.logger.warn('Killer has no rpgEntity:', killer);
        if (!entity?.rpgEntity) if (this.logger) this.logger.warn('Dead entity has no rpgEntity:', entity);
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
    this.applyCombatSkillEffects(agent, skill, target);

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
// Apply combat skill effects (damage, healing, buffs, debuffs) - used during battle
CyberOpsGame.prototype.applyCombatSkillEffects = function(agent, skill, target) {
    if (skill.damage && target) {
        const damage = this.calculateSkillDamage(agent, skill);

        // CRITICAL: Check if target is an agent, use AgentService if so
        const targetId = target.originalId || target.id || target.name;
        const isAgent = window.GameServices?.agentService?.getAgent(targetId);

        if (isAgent) {
            // Agent damage - delegate to AgentService (single source of truth)
            window.GameServices.agentService.damageAgent(targetId, damage, `skill:${skill.name}`);
        } else {
            // Enemy damage - use FormulaService
            window.GameServices.formulaService.applyDamage(target, damage);
        }

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

if (this.logger) this.logger.info('🎮 RPG Integration loaded');