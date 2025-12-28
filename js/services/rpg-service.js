/**
 * RPGService - Manages RPG mechanics and integrations
 * Provides centralized access to RPG calculations and state
 */
if (typeof RPGService === 'undefined') {
    var RPGService = class RPGService {
    constructor(formulaService, resourceService) {
        this.formulaService = formulaService;
        this.resourceService = resourceService;
        this.rpgManager = null;
        this.inventoryManager = null;
        this.shopManager = null;

        // Bind methods for external access
        this.initialize = this.initialize.bind(this);
        this.setConfig = this.setConfig.bind(this);
        this.calculateRPGDamage = this.calculateRPGDamage.bind(this);
        this.grantExperience = this.grantExperience.bind(this);
    }

    /**
     * Initialize RPG system
     */
    initialize() {
        // Initialize managers
        this.rpgManager = new RPGManager();
        this.inventoryManager = new InventoryManager();

        // Pass dependencies to ShopManager (including resourceService for credits)
        this.shopManager = new ShopManager(this.rpgManager, this.inventoryManager, this.resourceService);

        // Get RPG config from campaign
        this.loadRPGConfig();

        // Set config and load shops after config is loaded
        if (this.shopManager && this.rpgConfig) {
            this.shopManager.setConfig(this.rpgConfig);
            this.shopManager.loadShops();
        }

        return true;
    }

    /**
     * Calculate RPG-enhanced damage
     * @param {Object} attacker - Attacking entity
     * @param {Object} target - Target entity
     * @param {string} weaponType - Type of weapon used
     * @returns {number} Calculated damage
     */
    calculateRPGDamage(attacker, target, weaponType = 'rifle') {
        // NO FALLBACKS - always calculate properly

        // Use RPG damage calculation with REAL-TIME equipment check
        // Get the agent's current loadout from the game
        let baseDamage = 20; // Default base damage
        let weaponBonus = 0;

        // Check for real-time equipped weapon from inventory service
        if (window.GameServices && window.GameServices.inventoryService) {
            const agentId = attacker.originalId || attacker.id || attacker.name;
            const loadout = window.GameServices.inventoryService.getAgentLoadout(agentId);

            if (loadout && loadout.weapon) {
                // Find the actual weapon from inventory
                const weapons = window.GameServices.inventoryService.getWeapons();
                const equippedWeapon = weapons.find(w => w.id === loadout.weapon);
                if (equippedWeapon) {
                    weaponBonus = equippedWeapon.damage || 0;
                }
            }
        }

        // Get agent's base damage (original damage without any weapons)
        if (attacker.baseDamage !== undefined) {
            baseDamage = attacker.baseDamage;
        } else {
            // Use the agent's stored damage value
            baseDamage = attacker.damage || 20;
        }

        let finalDamage = baseDamage + weaponBonus;

        // Get attacker stats
        const attackerRPG = attacker.rpgEntity;
        if (attackerRPG) {
            const strength = attackerRPG.stats?.strength?.value || 10;
            const damageBonus = Math.floor((strength - 10) / 2);
            finalDamage += damageBonus;

            // Check for crits
            const critChance = attackerRPG.derivedStats?.critChance || 5;
            if (Math.random() * 100 < critChance) {
                finalDamage *= 2;
                if (logger) logger.error('   💥 CRITICAL HIT!');
            }
        }

        // Apply target defenses
        const targetRPG = target.rpgEntity;
        if (targetRPG) {
            const armor = targetRPG.derivedStats?.damageResistance || 0;
            finalDamage = Math.max(1, finalDamage - armor);

            // Check dodge
            const dodgeChance = targetRPG.derivedStats?.dodge || 0;
            if (Math.random() * 100 < dodgeChance) {
                if (logger) logger.debug('   ⚡ DODGED!');
                return 0;
            }
        }

        return Math.round(finalDamage);
    }

    /**
     * Grant experience to entity
     * @param {Object} entity - Entity to grant XP to
     * @param {number} amount - Amount of XP
     */
    grantExperience(entity, amount) {
        if (!this.rpgManager || !entity.rpgEntity) return;

        this.rpgManager.grantExperience(entity.rpgEntity, amount);
    }

    /**
     * Convert weapon from InventoryService format to RPG item format
     * NO STORAGE - pure conversion function following unidirectional flow
     */
    convertWeaponToRPGItem(weapon) {
        return {
            id: `weapon_${weapon.id}`,
            name: weapon.name,
            type: 'weapon',
            slot: 'primary',
            weight: weapon.weight ?? 5,
            value: weapon.cost ?? 1000,
            stats: {
                damage: weapon.damage ?? 10
            },
            quantity: 1
        };
    }

    /**
     * Convert equipment from InventoryService format to RPG item format
     * NO STORAGE - pure conversion function following unidirectional flow
     */
    convertEquipmentToRPGItem(equipment) {
        const itemType = equipment.protection ? 'armor' : 'consumables';
        const rpgItem = {
            id: `${itemType}_${equipment.id}`,
            name: equipment.name,
            type: itemType,
            slot: equipment.protection ? 'armor' : null,
            weight: equipment.weight ?? 3,
            value: equipment.cost ?? 500,
            stats: {},
            quantity: 1
        };

        if (equipment.protection) rpgItem.stats.defense = equipment.protection;
        if (equipment.hackBonus) rpgItem.stats.hackBonus = equipment.hackBonus;
        if (equipment.stealthBonus) rpgItem.stats.stealthBonus = equipment.stealthBonus;

        return rpgItem;
    }

    /**
     * Sync equipment between hub and RPG systems
     * RENAMED to syncLoadouts - only syncs agent loadouts, no config mutation
     */
    syncEquipment() {
        // Just sync loadouts - no config mutation needed
        this.syncLoadouts();
    }

    /**
     * Sync agent loadouts with RPG inventories
     */
    syncLoadouts() {
        if (!this.inventoryManager) return;

        // Get data from services
        const agentService = window.GameServices?.agentService;
        const inventoryService = window.GameServices?.inventoryService;
        if (!agentService || !inventoryService) return;

        const agentsToSync = agentService.getActiveAgents();

        agentsToSync.forEach(agent => {
            const agentId = agent.id || agent.name;
            // Try to get loadout by original ID first (for mission agents), then by current ID
            const loadoutId = agent.originalId || agent.name || agentId;
            const loadout = inventoryService.getAgentLoadout(loadoutId);

            let inventory = this.inventoryManager.getInventory(agentId);
            if (!inventory) {
                const carryWeight = agent.rpgEntity?.derivedStats?.carryWeight || 100;
                inventory = this.inventoryManager.createInventory(agentId, carryWeight);
            }

            if (loadout && inventory) {
                inventory.clearEquipment();
                if (logger) logger.debug(`📦 Syncing loadout for ${agent.name}:`, loadout);

                // Sync equipped weapon
                if (loadout.weapon) {
                    const weapon = inventoryService.getItemById('weapon', loadout.weapon);
                    if (weapon) {
                        // Convert weapon to RPG format on-the-fly (no storage needed)
                        const rpgWeapon = this.convertWeaponToRPGItem(weapon);
                        inventory.items.push(rpgWeapon);
                        inventory.equipped.primary = rpgWeapon;
                        if (logger) logger.info(`   ✅ Equipped ${weapon.name} on ${agent.name}`);
                    }
                }

                // Sync equipped armor
                if (loadout.armor) {
                    const armor = inventoryService.getItemById('armor', loadout.armor);
                    if (armor) {
                        // Convert armor to RPG format on-the-fly (no storage needed)
                        const rpgArmor = this.convertEquipmentToRPGItem(armor);
                        inventory.items.push(rpgArmor);
                        inventory.equipped.armor = rpgArmor;
                        if (logger) logger.info(`   ✅ Equipped ${armor.name} on ${agent.name}`);
                    }
                }

                // Sync utility items
                if (loadout.utility) {
                    const utility = inventoryService.getItemById('equipment', loadout.utility);
                    if (utility) {
                        // Convert utility to RPG format on-the-fly (no storage needed)
                        const rpgUtility = this.convertEquipmentToRPGItem(utility);
                        inventory.items.push(rpgUtility);
                        if (logger) logger.info(`   ✅ Added ${utility.name} to ${agent.name}'s inventory`);
                    }
                }

                if (logger) logger.debug(`📦 Final inventory for ${agent.name}:`, {
                    items: inventory.items.length,
                    equipped: Object.keys(inventory.equipped)
                });
            }
        });
    }

    /**
     * Create RPG entity for agent
     * @param {Object} agent - Agent object
     * @param {string} className - RPG class name
     * @returns {Object} RPG entity
     */
    createRPGAgent(agent, className = 'soldier') {
        if (!this.rpgManager) return null;

        const rpgEntity = this.rpgManager.createRPGAgent(agent, className);
        agent.rpgEntity = rpgEntity;

        // Apply any pending saved data (from save/load)
        const agentId = agent.originalId || agent.id || agent.name;
        this.applyPendingEntityData(agentId, rpgEntity);
        // Also try by name as fallback
        if (agent.name && agent.name !== agentId) {
            this.applyPendingEntityData(agent.name, rpgEntity);
        }

        // Create inventory
        if (this.inventoryManager) {
            const derived = this.rpgManager.calculateDerivedStats(rpgEntity);
            this.inventoryManager.createInventory(agent.id || agent.name, derived.carryWeight);
        }

        return rpgEntity;
    }

    /**
     * Create RPG entity for enemy
     * @param {Object} enemy - Enemy object
     * @param {string} enemyType - Enemy type
     * @returns {Object} RPG entity
     */
    createRPGEnemy(enemy, enemyType = 'basic') {
        if (!this.rpgManager) return null;

        const rpgEntity = this.rpgManager.createRPGEnemy(enemy, enemyType);
        enemy.rpgEntity = rpgEntity;

        return rpgEntity;
    }

    /**
     * Load RPG config from campaign
     */
    loadRPGConfig() {
        let rpgConfig = null;

        // Try content loader
        if (window.ContentLoader) {
            rpgConfig = window.ContentLoader.getContent('rpgConfig');
        }

        // Fallback to campaign config
        if (!rpgConfig && window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
            rpgConfig = window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
        }

        if (rpgConfig) {
            this.rpgManager.loadConfig(rpgConfig);
            this.rpgConfig = rpgConfig;
        } else {
            if (logger) logger.error('❌ No RPG config found in campaign!');
        }
    }

    /**
     * Get RPG config from campaign
     */
    getRPGConfig() {
        return this.rpgConfig || this.rpgManager?.config || {};
    }

    /**
     * Set RPG config dynamically
     */
    setConfig(config) {
        this.rpgConfig = config;
        if (this.rpgManager) {
            this.rpgManager.loadConfig(config);
        }
    }

    /**
     * Get all character data for save system
     * Returns serializable data for all RPG entities
     * @returns {Object} Character data object for serialization
     */
    getAllCharacterData() {
        if (!this.rpgManager) {
            if (logger) logger.warn('⚠️ RPGManager not available for getAllCharacterData');
            return null;
        }

        const data = {
            entities: [],
            inventories: []
        };

        if (logger) logger.info(`📤 Saving RPG data, entities in rpgManager: ${this.rpgManager.entities.size}`);

        // Export all entities from RPGManager
        this.rpgManager.entities.forEach((entity, id) => {
            if (logger) logger.debug(`   Saving entity: ${id} (${entity.name})`);
            if (logger) logger.debug(`   - Level: ${entity.level}, Skills: ${JSON.stringify(entity.skills)}`);
            data.entities.push({
                id: id,
                name: entity.name,
                class: entity.class,
                level: entity.level,
                xp: entity.xp,
                experience: entity.experience,
                stats: entity.stats ? { ...entity.stats } : {},
                skills: entity.skills ? { ...entity.skills } : {},
                perks: entity.perks ? [...entity.perks] : [],
                availableStatPoints: entity.availableStatPoints || 0,
                availableSkillPoints: entity.availableSkillPoints || 0,
                availablePerkPoints: entity.availablePerkPoints || 0,
                derivedStats: entity.derivedStats ? { ...entity.derivedStats } : {}
            });
        });

        // Export inventories from InventoryManager
        if (this.inventoryManager) {
            this.inventoryManager.inventories.forEach((inventory, id) => {
                data.inventories.push({
                    id: id,
                    maxWeight: inventory.maxWeight,
                    items: inventory.items ? [...inventory.items] : [],
                    equipped: inventory.equipped ? { ...inventory.equipped } : {}
                });
            });
        }

        if (logger) logger.debug(`📊 getAllCharacterData: ${data.entities.length} entities, ${data.inventories.length} inventories`);
        return data;
    }

    /**
     * Load all character data from save system
     * Restores RPG entities and inventories from saved data
     * @param {Object} data - Character data object from save
     */
    loadAllCharacterData(data) {
        if (!data) {
            if (logger) logger.warn('⚠️ No RPG data to load');
            return;
        }

        if (!this.rpgManager) {
            if (logger) logger.error('❌ RPGManager not available for loadAllCharacterData');
            return;
        }

        // Load entities into RPGManager
        if (data.entities && Array.isArray(data.entities)) {
            if (logger) logger.info(`📥 Loading ${data.entities.length} RPG entities from save...`);
            data.entities.forEach(entityData => {
                if (logger) logger.debug(`   Processing entity: ${entityData.id} (${entityData.name})`);
                if (logger) logger.debug(`   - Level: ${entityData.level}, Skills: ${JSON.stringify(entityData.skills)}`);

                const existingEntity = this.rpgManager.entities.get(entityData.id);
                if (logger) logger.debug(`   - Existing entity in rpgManager: ${!!existingEntity}`);

                if (existingEntity) {
                    // Update existing entity
                    existingEntity.level = entityData.level;
                    existingEntity.xp = entityData.xp;
                    existingEntity.experience = entityData.experience;
                    if (entityData.stats) existingEntity.stats = { ...entityData.stats };
                    if (entityData.skills) existingEntity.skills = { ...entityData.skills };
                    if (entityData.perks) existingEntity.perks = [...entityData.perks];
                    existingEntity.availableStatPoints = entityData.availableStatPoints || 0;
                    existingEntity.availableSkillPoints = entityData.availableSkillPoints || 0;
                    existingEntity.availablePerkPoints = entityData.availablePerkPoints || 0;
                    if (entityData.derivedStats) existingEntity.derivedStats = { ...entityData.derivedStats };
                    if (logger) logger.info(`   ✅ Updated existing entity: ${entityData.id} (Level ${entityData.level})`);
                } else {
                    // Entity doesn't exist yet - store for later
                    if (logger) logger.info(`   📋 Storing pending data for: ${entityData.id} (will apply when agent created)`);
                    if (!this._pendingEntityData) this._pendingEntityData = new Map();
                    this._pendingEntityData.set(entityData.id, entityData);
                    // Also store by name as fallback
                    if (entityData.name) {
                        this._pendingEntityData.set(entityData.name, entityData);
                    }
                }
            });
            if (logger) logger.info(`📊 Processed ${data.entities.length} RPG entities, pending: ${this._pendingEntityData?.size || 0}`);
        }

        // Load inventories into InventoryManager
        if (data.inventories && Array.isArray(data.inventories) && this.inventoryManager) {
            data.inventories.forEach(invData => {
                let inventory = this.inventoryManager.inventories.get(invData.id);
                if (!inventory) {
                    inventory = this.inventoryManager.createInventory(invData.id, invData.maxWeight || 100);
                }
                if (invData.items) inventory.items = [...invData.items];
                if (invData.equipped) inventory.equipped = { ...invData.equipped };
            });
            if (logger) logger.info(`📦 Loaded ${data.inventories.length} inventories`);
        }
    }

    /**
     * Apply pending entity data when an agent is created
     * Called after agent load to restore saved RPG state
     * @param {string} agentId - Agent ID to check for pending data
     * @param {Object} entity - The RPG entity to update
     */
    applyPendingEntityData(agentId, entity) {
        if (logger) logger.debug(`🔍 applyPendingEntityData called for: ${agentId}`);
        if (logger) logger.debug(`   _pendingEntityData exists: ${!!this._pendingEntityData}`);
        if (this._pendingEntityData) {
            if (logger) logger.debug(`   _pendingEntityData keys: ${Array.from(this._pendingEntityData.keys()).join(', ')}`);
        }

        if (!this._pendingEntityData) return;

        const pendingData = this._pendingEntityData.get(agentId);
        if (logger) logger.debug(`   pendingData found: ${!!pendingData}`);

        if (pendingData && entity) {
            if (logger) logger.info(`📊 Applying pending RPG data to ${agentId}:`);
            if (logger) logger.debug(`   Level: ${pendingData.level}, XP: ${pendingData.xp}`);
            if (logger) logger.debug(`   Skills: ${JSON.stringify(pendingData.skills)}`);
            if (logger) logger.debug(`   Stats: ${JSON.stringify(pendingData.stats)}`);

            entity.level = pendingData.level;
            entity.xp = pendingData.xp;
            entity.experience = pendingData.experience;
            if (pendingData.stats) entity.stats = { ...pendingData.stats };
            if (pendingData.skills) entity.skills = { ...pendingData.skills };
            if (pendingData.perks) entity.perks = [...pendingData.perks];
            entity.availableStatPoints = pendingData.availableStatPoints || 0;
            entity.availableSkillPoints = pendingData.availableSkillPoints || 0;
            entity.availablePerkPoints = pendingData.availablePerkPoints || 0;
            if (pendingData.derivedStats) entity.derivedStats = { ...pendingData.derivedStats };

            this._pendingEntityData.delete(agentId);
            if (logger) logger.info(`   ✅ Applied pending RPG data to ${agentId}`);
        }
    }
    }; // End of RPGService class definition

    // Also expose on window for compatibility
    window.RPGService = RPGService;
}