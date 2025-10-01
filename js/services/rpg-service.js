/**
 * RPGService - Manages RPG mechanics and integrations
 * Provides centralized access to RPG calculations and state
 */
class RPGService {
    constructor(formulaService, resourceService) {
        this.formulaService = formulaService;
        this.resourceService = resourceService;
        this.rpgManager = null;
        this.inventoryManager = null;
        this.shopManager = null;
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
     * Sync equipment between hub and RPG systems
     */
    syncEquipment() {
        if (!this.inventoryManager) return;

        // Get data from services
        const inventoryService = window.GameServices?.inventoryService;
        if (!inventoryService) return;

        // Sync weapons from inventory service
        const weapons = inventoryService.getWeapons();
        weapons.forEach(weapon => {
            if (weapon.owned > 0) {
                const rpgWeapon = {
                    id: `weapon_${weapon.id}`,
                    name: weapon.name,
                    type: 'weapon',
                    slot: 'primary',
                    weight: weapon.weight || 5,
                    value: weapon.cost || 1000,
                    stats: {
                        damage: weapon.damage || 10
                    },
                    quantity: weapon.owned
                };

                const rpgConfig = this.getRPGConfig();
                if (rpgConfig.items && !rpgConfig.items.weapons[rpgWeapon.id]) {
                    rpgConfig.items.weapons[rpgWeapon.id] = rpgWeapon;
                }
            }
        });

        // Sync equipment from inventory service
        const equipment = inventoryService.getEquipment();
        equipment.forEach(item => {
            if (item.owned > 0) {
                const itemType = item.protection ? 'armor' : 'consumables';
                const rpgItem = {
                    id: `${itemType}_${item.id}`,
                    name: item.name,
                    type: itemType,
                    slot: item.protection ? 'armor' : null,
                    weight: item.weight || 3,
                    value: item.cost || 500,
                    stats: {},
                    quantity: item.owned
                };

                if (item.protection) rpgItem.stats.defense = item.protection;
                if (item.hackBonus) rpgItem.stats.hackBonus = item.hackBonus;
                if (item.stealthBonus) rpgItem.stats.stealthBonus = item.stealthBonus;

                const rpgConfig = this.getRPGConfig();
                if (rpgConfig.items && !rpgConfig.items[itemType][rpgItem.id]) {
                    rpgConfig.items[itemType][rpgItem.id] = rpgItem;
                }
            }
        });

        // Sync loadouts to inventories
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
                        const rpgWeaponId = `weapon_${loadout.weapon}`;
                        const rpgConfig = this.getRPGConfig();
                        const rpgWeapon = rpgConfig?.items?.weapons?.[rpgWeaponId];
                        if (rpgWeapon) {
                            // Add to inventory first, then equip
                            const itemToAdd = {
                                ...rpgWeapon,
                                id: rpgWeaponId,
                                quantity: 1
                            };
                            inventory.items.push(itemToAdd);
                            inventory.equipped.primary = itemToAdd;
                            if (logger) logger.info(`   ✅ Equipped ${weapon.name} on ${agent.name}`);
                        }
                    }
                }

                // Sync equipped armor
                if (loadout.armor) {
                    const armor = inventoryService.getItemById('armor', loadout.armor);
                    if (armor) {
                        const rpgArmorId = `armor_${loadout.armor}`;
                        const rpgConfig = this.getRPGConfig();
                        const rpgArmor = rpgConfig?.items?.armor?.[rpgArmorId];
                        if (rpgArmor) {
                            // Add to inventory first, then equip
                            const itemToAdd = {
                                ...rpgArmor,
                                id: rpgArmorId,
                                quantity: 1
                            };
                            inventory.items.push(itemToAdd);
                            inventory.equipped.armor = itemToAdd;
                            if (logger) logger.info(`   ✅ Equipped ${armor.name} on ${agent.name}`);
                        }
                    }
                }

                // Sync utility items
                if (loadout.utility) {
                    const utility = inventoryService.getItemById('equipment', loadout.utility);
                    if (utility) {
                        const rpgUtilityId = `consumables_${loadout.utility}`;
                        const rpgConfig = this.getRPGConfig();
                        const rpgUtility = rpgConfig?.items?.consumables?.[rpgUtilityId];
                        if (rpgUtility) {
                            // Add to inventory
                            const itemToAdd = {
                                ...rpgUtility,
                                id: rpgUtilityId,
                                quantity: 1
                            };
                            inventory.items.push(itemToAdd);
                            if (logger) logger.info(`   ✅ Added ${utility.name} to ${agent.name}'s inventory`);
                        }
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
}