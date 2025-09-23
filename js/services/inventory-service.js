/**
 * InventoryService - Centralized inventory and equipment management
 * Single source of truth for all item operations (pickup, drop, equip, unequip, consume)
 */
class InventoryService {
    constructor(formulaService, equipmentService) {
        this.formulaService = formulaService;
        this.equipmentService = equipmentService;

        // Initialize logger
        this.logger = window.getLogger ? window.getLogger('InventoryService') : null;

        // Master inventory state
        this.inventory = {
            weapons: [],      // Array of {id, name, damage, range, cost, owned, equipped}
            armor: [],        // Array of {id, name, defense, cost, owned, equipped}
            utility: [],      // Array of {id, name, effect, cost, owned, equipped}
            consumables: [],  // Array of {id, name, effect, quantity}
            intel: 0,         // Intel collected
            credits: 0        // Credits (managed by game, tracked here for reference)
        };

        // Agent loadouts - tracks what each agent has equipped
        this.agentLoadouts = {};  // agentId -> {weapon: itemId, armor: itemId, utility: itemId}

        // Track items on the ground (collectables)
        this.groundItems = [];

        // Bind methods for external use
        this.pickupItem = this.pickupItem.bind(this);
        this.equipItem = this.equipItem.bind(this);
        this.unequipItem = this.unequipItem.bind(this);
        this.consumeItem = this.consumeItem.bind(this);
        this.getAgentEquipment = this.getAgentEquipment.bind(this);
    }

    /**
     * Initialize inventory from data (NOT from game object)
     */
    initialize(data = {}) {
        if (this.logger) this.logger.info('Initializing inventory from data');

        // Import weapons data
        if (data.weapons) {
            this.inventory.weapons = data.weapons.map(w => ({
                ...w,
                equipped: w.equipped || 0
            }));
            if (this.logger) this.logger.debug(`Imported ${data.weapons.length} weapons`);
        }

        // Import equipment data
        if (data.equipment) {
            if (this.logger) this.logger.debug(`Processing ${data.equipment.length} equipment items`);
            data.equipment.forEach(item => {
                let category = this.getItemCategory(item.type || item.slot);

                // For generic 'equipment' type, categorize based on item properties
                if (category === 'equipment') {
                    if (item.protection || item.defense) {
                        category = 'armor';
                    } else if (item.damage && !item.range) {
                        category = 'utility'; // Explosives
                    } else {
                        category = 'utility'; // Default for other equipment
                    }
                }

                if (category && this.inventory[category]) {
                    this.inventory[category].push({
                        ...item,
                        owned: item.owned || 1,
                        equipped: item.equipped || 0
                    });
                    if (this.logger) this.logger.debug(`Added ${item.name} to ${category}`);
                }
            });

            // Log final counts
            if (this.logger) {
                this.logger.info(`Equipment imported: ${this.inventory.armor.length} armor, ${this.inventory.utility.length} utility items`);
            }
        }

        // Import agent loadouts
        if (data.agentLoadouts) {
            this.agentLoadouts = { ...data.agentLoadouts };
        }

        // Import intel
        if (data.intel !== undefined) {
            this.inventory.intel = data.intel;
        }

        // Sync equipped counts from loadouts
        this.syncEquippedCounts();
    }

    /**
     * @deprecated Use initialize() instead
     */
    initializeFromGame(game) {
        if (this.logger) this.logger.warn('DEPRECATED: initializeFromGame called, use initialize() instead');
        // Extract data from game object for backward compatibility
        this.initialize({
            weapons: game.weapons,
            equipment: game.equipment,
            agentLoadouts: game.agentLoadouts,
            intel: game.intel
        });
    }

    /**
     * Get item category based on type/slot
     */
    getItemCategory(type) {
        if (!type) return null;

        const typeStr = type.toLowerCase();
        if (typeStr.includes('weapon') || typeStr === 'primary' || typeStr === 'secondary') {
            return 'weapons';
        }
        if (typeStr.includes('armor') || typeStr === 'vest' || typeStr === 'shield') {
            return 'armor';
        }
        if (typeStr.includes('utility') || typeStr === 'medkit' || typeStr === 'scanner') {
            return 'utility';
        }
        if (typeStr.includes('consumable') || typeStr === 'stim' || typeStr === 'grenade') {
            return 'consumables';
        }
        // Handle generic 'equipment' type - categorize based on item properties
        if (typeStr === 'equipment') {
            // This will be determined by the actual item properties in categorizeEquipment
            return 'equipment';
        }
        return null;
    }

    /**
     * Pickup an item from the ground
     * @param {Object} agent - Agent picking up the item
     * @param {Object} item - Item to pickup {type, weapon, weaponDamage, weaponRange, name, etc}
     * @returns {boolean} Success
     */
    pickupItem(agent, item) {
        if (!item) return false;

        // Handle intel
        if (item.type === 'intel') {
            this.inventory.intel += (item.value || 1);
            if (this.logger) this.logger.info(`📊 Intel collected: +${item.value || 1} (Total: ${this.inventory.intel})`);
            return true;
        }

        // Handle credits
        if (item.type === 'credits' || item.type === 'money') {
            const value = item.value || 100;
            // Credits are managed by the game, just log
            if (this.logger) this.logger.info(`💰 Credits collected: +${value}`);
            return true;
        }

        // Handle weapons
        if (item.type === 'weapon' && item.weapon) {
            let weaponEntry = this.inventory.weapons.find(w => w.id === item.weapon);

            if (weaponEntry) {
                // Already have this weapon type, increment count
                weaponEntry.owned = (weaponEntry.owned || 0) + 1;
            } else {
                // New weapon type
                weaponEntry = {
                    id: item.weapon,
                    name: item.name || item.weapon.replace(/_/g, ' ').toUpperCase(),
                    damage: item.weaponDamage || item.damage || 10,
                    range: item.weaponRange || item.range || 5,
                    cost: Math.floor((item.weaponDamage || 10) * 50),
                    owned: 1,
                    equipped: 0
                };
                this.inventory.weapons.push(weaponEntry);
            }

            if (this.logger) this.logger.info(`🔫 Weapon picked up: ${weaponEntry.name} (Owned: ${weaponEntry.owned})`);

            // Auto-equip ONLY if agent has no weapon equipped
            // Use originalId for loadout management (this is the hub ID like "Alex 'Shadow' Chen")
            const loadoutId = agent.originalId || agent.name || agent.id;

            // Debug: log what ID we're using
            if (this.logger) {
                this.logger.debug(`🔍 Agent ID resolution for ${agent.name}:`, {
                    originalId: agent.originalId,
                    id: agent.id,
                    name: agent.name,
                    loadoutId: loadoutId
                });
            }

            // Check if agent already has a weapon in their loadout
            const currentLoadout = this.agentLoadouts[loadoutId];

            if (!currentLoadout || !currentLoadout.weapon) {
                // Ensure loadout exists
                if (!this.agentLoadouts[loadoutId]) {
                    this.agentLoadouts[loadoutId] = {
                        weapon: null,
                        armor: null,
                        utility: null
                    };
                }

                // Equip using the loadout ID (hub ID)
                this.equipItem(loadoutId, 'weapon', item.weapon);

                // Apply weapon to agent immediately
                agent.weapon = {
                    type: item.weapon,
                    damage: weaponEntry.damage,
                    range: weaponEntry.range
                };

                if (this.logger) this.logger.info(`⚔️ Auto-equipped ${weaponEntry.name} to ${agent.name} (no weapon equipped)`);
            } else {
                if (this.logger) this.logger.debug(`📦 Added ${weaponEntry.name} to inventory (${agent.name} already has ${currentLoadout.weapon} equipped)`);
            }

            return true;
        }

        // Handle armor
        if (item.type === 'armor' || item.slot === 'armor') {
            let armorEntry = this.inventory.armor.find(a => a.id === item.id);

            if (armorEntry) {
                armorEntry.owned = (armorEntry.owned || 0) + 1;
            } else {
                armorEntry = {
                    id: item.id || item.name,
                    name: item.name || 'Unknown Armor',
                    defense: item.defense || 5,
                    cost: item.cost || 1000,
                    owned: 1,
                    equipped: 0
                };
                this.inventory.armor.push(armorEntry);
            }

            if (this.logger) this.logger.info(`🛡️ Armor picked up: ${armorEntry.name} (Owned: ${armorEntry.owned})`);
            return true;
        }

        // Handle utility items
        if (item.type === 'utility' || item.slot === 'utility') {
            let utilityEntry = this.inventory.utility.find(u => u.id === item.id);

            if (utilityEntry) {
                utilityEntry.owned = (utilityEntry.owned || 0) + 1;
            } else {
                utilityEntry = {
                    id: item.id || item.name,
                    name: item.name || 'Unknown Utility',
                    effect: item.effect || 'No effect',
                    cost: item.cost || 500,
                    owned: 1,
                    equipped: 0
                };
                this.inventory.utility.push(utilityEntry);
            }

            if (this.logger) this.logger.info(`🔧 Utility picked up: ${utilityEntry.name} (Owned: ${utilityEntry.owned})`);
            return true;
        }

        // Handle consumables
        if (item.type === 'consumable') {
            let consumableEntry = this.inventory.consumables.find(c => c.id === item.id);

            if (consumableEntry) {
                consumableEntry.quantity = (consumableEntry.quantity || 0) + 1;
            } else {
                consumableEntry = {
                    id: item.id || item.name,
                    name: item.name || 'Unknown Consumable',
                    effect: item.effect || 'No effect',
                    quantity: 1
                };
                this.inventory.consumables.push(consumableEntry);
            }

            if (this.logger) this.logger.info(`💊 Consumable picked up: ${consumableEntry.name} (Quantity: ${consumableEntry.quantity})`);
            return true;
        }

        if (this.logger) this.logger.warn(`❓ Unknown item type: ${item.type}`);
        return false;
    }

    /**
     * Equip an item to an agent
     * @param {string} agentId - Agent ID
     * @param {string} slot - Slot type (weapon, armor, utility)
     * @param {string} itemId - Item ID to equip
     * @returns {boolean} Success
     */
    equipItem(agentId, slot, itemId) {
        // Initialize agent loadout if needed
        if (!this.agentLoadouts[agentId]) {
            this.agentLoadouts[agentId] = {
                weapon: null,
                armor: null,
                utility: null
            };
        }

        const loadout = this.agentLoadouts[agentId];

        // Unequip current item in slot if any
        if (loadout[slot]) {
            this.unequipItem(agentId, slot);
        }

        // Find the item in inventory
        const category = this.getItemCategory(slot);
        if (!category) return false;

        // Handle both string and numeric IDs
        const item = this.inventory[category].find(i =>
            i.id == itemId || // Loose equality to handle string/number mismatch
            (typeof i.id === 'string' && typeof itemId === 'number' && i.id == String(itemId)) ||
            (typeof i.id === 'number' && typeof itemId === 'string' && String(i.id) == itemId)
        );
        if (!item) {
            if (this.logger) {
                this.logger.error(`❌ Item not found: ${itemId} (type: ${typeof itemId})`);
                this.logger.debug(`   Available items in ${category}:`, this.inventory[category].map(i => `${i.id} (${typeof i.id})`));
            }
            return false;
        }

        // Check if we have any unequipped items
        const availableCount = item.owned - item.equipped;
        if (availableCount <= 0) {
            if (this.logger) this.logger.warn(`❌ No unequipped ${item.name} available`);
            return false;
        }

        // Equip the item
        loadout[slot] = itemId;
        item.equipped = (item.equipped || 0) + 1;

        if (this.logger) {
            this.logger.info(`✅ Equipped ${item.name} to agent ${agentId} in ${slot} slot`);
            this.logger.debug(`📊 ${item.name}: ${item.equipped}/${item.owned} equipped`);
        }

        return true;
    }

    /**
     * Unequip an item from an agent
     * @param {string} agentId - Agent ID
     * @param {string} slot - Slot type (weapon, armor, utility)
     * @returns {boolean} Success
     */
    unequipItem(agentId, slot) {
        if (!this.agentLoadouts[agentId]) return false;

        const loadout = this.agentLoadouts[agentId];
        const itemId = loadout[slot];

        if (!itemId) {
            if (this.logger) this.logger.warn(`❌ No item equipped in ${slot} slot for agent ${agentId}`);
            return false;
        }

        // Find the item in inventory
        const category = this.getItemCategory(slot);
        if (!category) return false;

        // Handle both string and numeric IDs
        const item = this.inventory[category].find(i =>
            i.id == itemId || // Loose equality to handle string/number mismatch
            (typeof i.id === 'string' && typeof itemId === 'number' && i.id == String(itemId)) ||
            (typeof i.id === 'number' && typeof itemId === 'string' && String(i.id) == itemId)
        );
        if (!item) {
            if (this.logger) this.logger.warn(`⚠️ Equipped item not found in inventory: ${itemId} (type: ${typeof itemId}`);
            loadout[slot] = null;
            return false;
        }

        // Unequip the item
        loadout[slot] = null;
        item.equipped = Math.max(0, (item.equipped || 0) - 1);

        if (this.logger) {
            this.logger.info(`✅ Unequipped ${item.name} from agent ${agentId}`);
            this.logger.debug(`📊 ${item.name}: ${item.equipped}/${item.owned} equipped`);
        }

        return true;
    }

    /**
     * Consume an item (e.g., medkit, stim)
     * @param {string} agentId - Agent using the item
     * @param {string} itemId - Item to consume
     * @returns {Object} Effect result
     */
    consumeItem(agentId, itemId) {
        const consumable = this.inventory.consumables.find(c => c.id === itemId);

        if (!consumable || consumable.quantity <= 0) {
            if (this.logger) this.logger.warn(`❌ Consumable not available: ${itemId}`);
            return null;
        }

        consumable.quantity--;
        if (this.logger) this.logger.info(`💊 Used ${consumable.name} (Remaining: ${consumable.quantity})`);

        return {
            success: true,
            effect: consumable.effect,
            remaining: consumable.quantity
        };
    }

    /**
     * Buy an item
     * @param {string} type - Item type (weapon, armor, utility)
     * @param {Object} itemData - Item data from shop/equipment service
     * @param {number} cost - Item cost
     * @returns {Object} Purchase result {success, newTotal}
     */
    buyItem(type, itemData, cost) {
        const category = this.getItemCategory(type);
        if (!category) return { success: false, error: 'Invalid item type' };

        const items = this.inventory[category];
        // Handle both string and numeric IDs
        let existingItem = items.find(i =>
            i.id == itemData.id ||
            (typeof i.id === 'string' && typeof itemData.id === 'number' && i.id == String(itemData.id)) ||
            (typeof i.id === 'number' && typeof itemData.id === 'string' && String(i.id) == itemData.id)
        );

        if (existingItem) {
            // Already own this item, increment count
            existingItem.owned = (existingItem.owned || 0) + 1;
            if (this.logger) this.logger.info(`🛒 Purchased another ${existingItem.name} (Total owned: ${existingItem.owned})`);
        } else {
            // New item type
            const newItem = {
                id: itemData.id,
                name: itemData.name,
                cost: cost || itemData.cost || 1000,
                owned: 1,
                equipped: 0
            };

            // Copy relevant stats based on type
            if (category === 'weapons') {
                newItem.damage = itemData.damage || 10;
                newItem.range = itemData.range || 5;
            } else if (category === 'armor') {
                newItem.defense = itemData.defense || itemData.protection || 5;
            } else if (category === 'utility') {
                newItem.effect = itemData.effect || 'No effect';
                if (itemData.hackBonus) newItem.hackBonus = itemData.hackBonus;
                if (itemData.stealthBonus) newItem.stealthBonus = itemData.stealthBonus;
            }

            items.push(newItem);
            if (this.logger) this.logger.info(`🛒 Purchased new item: ${newItem.name}`);
        }

        return {
            success: true,
            newTotal: existingItem ? existingItem.owned : 1
        };
    }

    /**
     * Sell an item
     * @param {string} type - Item type (weapon, armor, utility)
     * @param {string} itemId - Item ID to sell
     * @returns {Object} Sale result {success, price, remaining}
     */
    sellItem(type, itemId) {
        const category = this.getItemCategory(type);
        if (!category) return { success: false, error: 'Invalid item type' };

        const items = this.inventory[category];
        // Handle both string and numeric IDs
        const item = items.find(i =>
            i.id == itemId ||
            (typeof i.id === 'string' && typeof itemId === 'number' && i.id == String(itemId)) ||
            (typeof i.id === 'number' && typeof itemId === 'string' && String(i.id) == itemId)
        );

        if (!item || item.owned <= 0) {
            return { success: false, error: 'Item not owned' };
        }

        // Check if item is equipped
        const availableCount = (item.owned || 0) - (item.equipped || 0);
        if (availableCount <= 0) {
            return { success: false, error: 'Item is equipped' };
        }

        // Sell one item
        item.owned--;
        const sellPrice = item.cost ? Math.floor(item.cost * 0.6) : 100;

        if (this.logger) {
            this.logger.info(`💰 Sold ${item.name} for ${sellPrice} credits`);
            this.logger.debug(`📊 ${item.name}: ${item.equipped}/${item.owned} equipped`);
        }

        return {
            success: true,
            price: sellPrice,
            remaining: item.owned
        };
    }

    /**
     * Get all equipment for an agent
     * @param {string} agentId - Agent ID
     * @returns {Object} Agent's equipped items
     */
    getAgentEquipment(agentId) {
        const loadout = this.agentLoadouts[agentId] || {
            weapon: null,
            armor: null,
            utility: null
        };

        const equipment = {};

        // Get weapon details
        if (loadout.weapon) {
            equipment.weapon = this.inventory.weapons.find(w => w.id === loadout.weapon);
        }

        // Get armor details
        if (loadout.armor) {
            equipment.armor = this.inventory.armor.find(a => a.id === loadout.armor);
        }

        // Get utility details
        if (loadout.utility) {
            equipment.utility = this.inventory.utility.find(u => u.id === loadout.utility);
        }

        return equipment;
    }

    /**
     * Get inventory summary for UI display
     */
    getInventorySummary() {
        return {
            weapons: this.inventory.weapons.filter(w => w.owned > 0),
            armor: this.inventory.armor.filter(a => a.owned > 0),
            utility: this.inventory.utility.filter(u => u.owned > 0),
            consumables: this.inventory.consumables.filter(c => c.quantity > 0),
            intel: this.inventory.intel,
            credits: this.inventory.credits
        };
    }

    /**
     * Sync equipped counts from loadouts
     * Ensures equipped counts match actual loadout state
     */
    syncEquippedCounts() {
        // Reset all equipped counts
        this.inventory.weapons.forEach(w => w.equipped = 0);
        this.inventory.armor.forEach(a => a.equipped = 0);
        this.inventory.utility.forEach(u => u.equipped = 0);

        // Count equipped items from loadouts
        Object.values(this.agentLoadouts).forEach(loadout => {
            if (loadout.weapon) {
                // Handle both string and numeric IDs
                const weapon = this.inventory.weapons.find(w =>
                    w.id == loadout.weapon ||
                    (typeof w.id === 'string' && typeof loadout.weapon === 'number' && w.id == String(loadout.weapon)) ||
                    (typeof w.id === 'number' && typeof loadout.weapon === 'string' && String(w.id) == loadout.weapon)
                );
                if (weapon) weapon.equipped++;
            }
            if (loadout.armor) {
                const armor = this.inventory.armor.find(a =>
                    a.id == loadout.armor ||
                    (typeof a.id === 'string' && typeof loadout.armor === 'number' && a.id == String(loadout.armor)) ||
                    (typeof a.id === 'number' && typeof loadout.armor === 'string' && String(a.id) == loadout.armor)
                );
                if (armor) armor.equipped++;
            }
            if (loadout.utility) {
                const utility = this.inventory.utility.find(u =>
                    u.id == loadout.utility ||
                    (typeof u.id === 'string' && typeof loadout.utility === 'number' && u.id == String(loadout.utility)) ||
                    (typeof u.id === 'number' && typeof loadout.utility === 'string' && String(u.id) == loadout.utility)
                );
                if (utility) utility.equipped++;
            }
        });

        if (this.logger) this.logger.debug('📊 Synced equipped counts from loadouts');
    }

    /**
     * Export inventory state for saving
     */
    exportState() {
        return {
            inventory: this.inventory,
            agentLoadouts: this.agentLoadouts
        };
    }

    /**
     * Import inventory state from save
     */
    importState(state) {
        if (state.inventory) {
            this.inventory = state.inventory;
        }
        if (state.agentLoadouts) {
            this.agentLoadouts = state.agentLoadouts;
        }
        this.syncEquippedCounts();
    }

    /**
     * Apply agent equipment (for backwards compatibility)
     * This syncs the inventory's weapon data to the agent object
     */
    applyAgentEquipment(agent) {
        const agentId = agent.originalId || agent.id || agent.name;
        const equipment = this.getAgentEquipment(agentId);

        if (equipment.weapon) {
            agent.weapon = {
                type: equipment.weapon.id,
                damage: equipment.weapon.damage,
                range: equipment.weapon.range
            };
        }

        if (equipment.armor) {
            agent.armor = equipment.armor.defense || 0;
        }

        if (equipment.utility) {
            // Apply utility effects if needed
            agent.utilityEffect = equipment.utility.effect;
        }

        return agent;
    }

    /**
     * Update item count (for buying/selling)
     */
    updateItemCount(type, itemId, change) {
        let items;
        if (type === 'weapon') {
            items = this.inventory.weapons;
        } else if (type === 'armor') {
            items = this.inventory.armor;
        } else if (type === 'utility' || type === 'equipment') {
            items = this.inventory.utility;
        }

        if (items) {
            const item = items.find(i => i.id === itemId);
            if (item) {
                item.owned = Math.max(0, (item.owned || 0) + change);
                return true;
            }
        }
        return false;
    }

    /**
     * Get all weapons (for service access)
     */
    getWeapons() {
        return this.inventory.weapons || [];
    }

    /**
     * Get all equipment (armor and utility combined)
     */
    getEquipment() {
        return [
            ...(this.inventory.armor || []),
            ...(this.inventory.utility || [])
        ];
    }

    /**
     * Get specific agent's loadout
     */
    getAgentLoadout(agentId) {
        return this.agentLoadouts[agentId] || {
            weapon: null,
            armor: null,
            utility: null,
            special: null
        };
    }

    /**
     * Get all agent loadouts
     */
    getAllLoadouts() {
        return this.agentLoadouts || {};
    }

    /**
     * Get item by type and ID
     * @param {string} type - Item type ('weapon', 'armor', or 'equipment')
     * @param {string} itemId - Item ID
     * @returns {Object|null} Item data or null if not found
     */
    getItemById(type, itemId) {
        if (type === 'weapon') {
            return this.inventory.weapons.find(w => w.id === itemId) || null;
        } else if (type === 'armor') {
            return this.inventory.equipment.find(e => e.id === itemId && e.protection) || null;
        } else {
            return this.inventory.equipment.find(e => e.id === itemId) || null;
        }
    }

    /**
     * Set agent's loadout
     */
    setAgentLoadout(agentId, loadout) {
        if (!this.agentLoadouts) {
            this.agentLoadouts = {};
        }
        this.agentLoadouts[agentId] = loadout;
        this.syncEquippedCounts();
        return true;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryService;
}