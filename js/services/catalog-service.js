/**
 * CatalogService - Item Catalog and Database
 *
 * Single source of truth for ALL items that exist in the game world.
 * This is the "database" - what items CAN exist, not what players own.
 *
 * Responsibilities:
 * - Store complete item catalog from campaign config
 * - Provide query methods for item lookups
 * - Filter items for shops (by category, rarity, etc.)
 * - Validate item references
 * - NO ownership tracking (that's InventoryService's job)
 *
 * Design principles:
 * - Read-only catalog (immutable after initialization)
 * - No game state dependencies
 * - Clean separation from inventory
 */

class CatalogService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('CatalogService') : null;

        // Item catalog - ALL items that exist in game
        this.catalog = {
            weapons: new Map(),      // id -> weapon definition
            armor: new Map(),        // id -> armor definition
            utility: new Map(),      // id -> utility definition
            special: new Map(),      // id -> special item definition
            consumables: new Map()   // id -> consumable definition
        };

        // Metadata
        this.initialized = false;
        this.campaignId = null;
    }

    /**
     * Initialize catalog from campaign configuration
     * @param {Object} rpgConfig - Campaign RPG configuration
     * @param {string} campaignId - Campaign identifier
     */
    initialize(rpgConfig, campaignId = 'unknown') {
        if (!rpgConfig || !rpgConfig.items) {
            if (this.logger) this.logger.error('Cannot initialize: rpgConfig.items not found');
            return false;
        }

        this.campaignId = campaignId;

        // Load weapons into catalog
        if (rpgConfig.items.weapons) {
            Object.entries(rpgConfig.items.weapons).forEach(([id, weapon]) => {
                this.catalog.weapons.set(id, {
                    id,
                    ...weapon,
                    catalogId: id,  // Original catalog ID
                    category: 'weapon'
                });
            });
            if (this.logger) this.logger.debug(`📚 Loaded ${this.catalog.weapons.size} weapons into catalog`);
        }

        // Load armor into catalog
        if (rpgConfig.items.armor) {
            Object.entries(rpgConfig.items.armor).forEach(([id, armor]) => {
                this.catalog.armor.set(id, {
                    id,
                    ...armor,
                    catalogId: id,
                    category: 'armor'
                });
            });
            if (this.logger) this.logger.debug(`📚 Loaded ${this.catalog.armor.size} armor into catalog`);
        }

        // Load utility items into catalog
        if (rpgConfig.items.utility) {
            Object.entries(rpgConfig.items.utility).forEach(([id, utility]) => {
                this.catalog.utility.set(id, {
                    id,
                    ...utility,
                    catalogId: id,
                    category: 'utility'
                });
            });
            if (this.logger) this.logger.debug(`📚 Loaded ${this.catalog.utility.size} utility items into catalog`);
        }

        // Load special items into catalog
        if (rpgConfig.items.special) {
            Object.entries(rpgConfig.items.special).forEach(([id, special]) => {
                this.catalog.special.set(id, {
                    id,
                    ...special,
                    catalogId: id,
                    category: 'special'
                });
            });
            if (this.logger) this.logger.debug(`📚 Loaded ${this.catalog.special.size} special items into catalog`);
        }

        // Load consumables into catalog
        if (rpgConfig.items.consumables) {
            Object.entries(rpgConfig.items.consumables).forEach(([id, consumable]) => {
                this.catalog.consumables.set(id, {
                    id,
                    ...consumable,
                    catalogId: id,
                    category: 'consumable'
                });
            });
            if (this.logger) this.logger.debug(`📚 Loaded ${this.catalog.consumables.size} consumables into catalog`);
        }

        this.initialized = true;

        const totalItems = this.getTotalItemCount();
        if (this.logger) this.logger.info(`✅ Catalog initialized for campaign '${campaignId}' with ${totalItems} total items`);

        return true;
    }

    /**
     * Get item by ID from any category
     * @param {string} itemId - Item ID
     * @returns {Object|null} Item definition or null
     */
    getItem(itemId) {
        // Search all categories
        for (const [categoryName, categoryMap] of Object.entries(this.catalog)) {
            if (categoryMap.has(itemId)) {
                return categoryMap.get(itemId);
            }
        }

        if (this.logger) this.logger.warn(`Item not found in catalog: ${itemId}`);
        return null;
    }

    /**
     * Get all items in a category
     * @param {string} category - Category name (weapons, armor, utility, special, consumables)
     * @returns {Array} Array of item definitions
     */
    getItemsByCategory(category) {
        if (!this.catalog[category]) {
            if (this.logger) this.logger.warn(`Invalid category: ${category}`);
            return [];
        }

        return Array.from(this.catalog[category].values());
    }

    /**
     * Get items owned by player (from their starting inventory)
     * This filters the catalog for items where owned > 0
     * @returns {Object} Player's starting inventory
     */
    getPlayerStartingInventory() {
        const inventory = {
            weapons: [],
            armor: [],
            utility: [],
            special: []
        };

        // Filter weapons
        this.catalog.weapons.forEach(weapon => {
            const owned = weapon.owned !== undefined ? weapon.owned :
                         (weapon.initialOwned !== undefined ? weapon.initialOwned : 0);
            if (owned > 0) {
                inventory.weapons.push({ ...weapon, owned });
            }
        });

        // Filter armor
        this.catalog.armor.forEach(armor => {
            const owned = armor.owned !== undefined ? armor.owned :
                         (armor.initialOwned !== undefined ? armor.initialOwned : 0);
            if (owned > 0) {
                inventory.armor.push({ ...armor, owned });
            }
        });

        // Filter utility
        this.catalog.utility.forEach(utility => {
            const owned = utility.owned !== undefined ? utility.owned :
                         (utility.initialOwned !== undefined ? utility.initialOwned : 0);
            if (owned > 0) {
                inventory.utility.push({ ...utility, owned });
            }
        });

        // Filter special
        this.catalog.special.forEach(special => {
            const owned = special.owned !== undefined ? special.owned :
                         (special.initialOwned !== undefined ? special.initialOwned : 0);
            if (owned > 0) {
                inventory.special.push({ ...special, owned });
            }
        });

        if (this.logger) {
            const totalOwned = inventory.weapons.length + inventory.armor.length +
                             inventory.utility.length + inventory.special.length;
            this.logger.debug(`📦 Player starts with ${totalOwned} items from catalog`);
        }

        return inventory;
    }

    /**
     * Get items for shop by category and filters
     * @param {Array<string>} categories - Item categories to include
     * @param {Object} filters - Optional filters (rarity, shopExclusive, etc.)
     * @returns {Array} Filtered items for shop
     */
    getShopItems(categories = [], filters = {}) {
        const shopItems = [];

        categories.forEach(category => {
            if (!this.catalog[category]) return;

            this.catalog[category].forEach(item => {
                let includeItem = true;

                // Apply filters
                if (filters.shopExclusive && item.shopExclusive !== filters.shopExclusive) {
                    includeItem = false;
                }

                if (filters.rarity && item.rarity !== filters.rarity) {
                    includeItem = false;
                }

                if (filters.minLevel && (item.requiredLevel || 0) < filters.minLevel) {
                    includeItem = false;
                }

                if (includeItem) {
                    shopItems.push({ ...item });
                }
            });
        });

        return shopItems;
    }

    /**
     * Check if item exists in catalog
     * @param {string} itemId - Item ID
     * @returns {boolean} True if exists
     */
    hasItem(itemId) {
        return this.getItem(itemId) !== null;
    }

    /**
     * Get total item count across all categories
     * @returns {number} Total items
     */
    getTotalItemCount() {
        return this.catalog.weapons.size +
               this.catalog.armor.size +
               this.catalog.utility.size +
               this.catalog.special.size +
               this.catalog.consumables.size;
    }

    /**
     * Get catalog statistics
     * @returns {Object} Catalog stats
     */
    getStats() {
        return {
            campaignId: this.campaignId,
            initialized: this.initialized,
            totalItems: this.getTotalItemCount(),
            weapons: this.catalog.weapons.size,
            armor: this.catalog.armor.size,
            utility: this.catalog.utility.size,
            special: this.catalog.special.size,
            consumables: this.catalog.consumables.size
        };
    }

    /**
     * Export catalog for debugging
     * @returns {Object} Full catalog
     */
    exportCatalog() {
        return {
            weapons: Array.from(this.catalog.weapons.entries()),
            armor: Array.from(this.catalog.armor.entries()),
            utility: Array.from(this.catalog.utility.entries()),
            special: Array.from(this.catalog.special.entries()),
            consumables: Array.from(this.catalog.consumables.entries())
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CatalogService;
}

if (typeof window !== 'undefined') {
    window.CatalogService = CatalogService;
}
