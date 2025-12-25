/**
 * CollectableTypes - Polymorphic collectable system
 * Each collectable type defines its own behavior for logging, effects, rendering, and sounds
 * Single source of truth for all collectable-related logic
 */

class CollectableType {
    constructor(config) {
        this.id = config.id;
        this.name = config.name;
        this.emoji = config.emoji;
        this.color = config.color || '#ffffff';
        this.sound = config.sound || 'pickup';
    }

    /**
     * Get log message for mission log
     * @param {Object} item - The collected item
     * @param {Object} context - Optional context (agent, gameState)
     * @returns {string} Formatted log message
     */
    getLogMessage(item, context = {}) {
        return `${this.emoji} ${this.name}`;
    }

    /**
     * Calculate pickup effects
     * @param {Object} item - The collected item
     * @param {Object} agent - The agent collecting
     * @param {Object} gameState - Current game state
     * @returns {Object} Effects to apply { credits, health, armor, etc. }
     */
    calculateEffect(item, agent, gameState = {}) {
        return { message: this.getLogMessage(item) };
    }

    /**
     * Get sprite/emoji for rendering
     * @param {Object} item - The item to render
     * @returns {string} Sprite identifier or emoji
     */
    getSprite(item) {
        return item.sprite || this.emoji;
    }

    /**
     * Get sound effect ID
     * @param {Object} item - The collected item
     * @returns {string} Sound effect ID
     */
    getSound(item) {
        return this.sound;
    }

    /**
     * Check if item should be visible (for quest-locked items)
     * @param {Object} item - The item
     * @param {Object} gameState - Current game state
     * @returns {boolean}
     */
    isVisible(item, gameState = {}) {
        if (item.questRequired && item.hidden) {
            const questActive = gameState.activeQuests?.[item.questRequired] ||
                               gameState.npcActiveQuests?.some(q => q.id === item.questRequired);
            return questActive;
        }
        return true;
    }
}

// ============================================================
// Specific Collectable Types
// ============================================================

class CreditsCollectable extends CollectableType {
    constructor() {
        super({
            id: 'credits',
            name: 'Credits',
            emoji: '💰',
            color: '#ffff00',
            sound: 'pickup'
        });
    }

    getLogMessage(item) {
        const value = item.value || 100;
        return `💰 +${value} credits`;
    }

    calculateEffect(item, agent, gameState) {
        const value = item.value || 100;
        return {
            credits: value,
            message: `💰 Collected ${value} credits`
        };
    }

    getSprite(item) {
        return item.sprite || '💰';
    }
}

class IntelCollectable extends CollectableType {
    constructor() {
        super({
            id: 'intel',
            name: 'Intel',
            emoji: '📄',
            color: '#00ffff',
            sound: 'pickup'
        });
    }

    getLogMessage(item) {
        const value = item.value || 10;
        return `📄 Intel (+${value} research)`;
    }

    calculateEffect(item, agent, gameState) {
        const value = item.value || 10;
        return {
            researchPoints: value,
            message: `📄 Collected intel (+${value} research points)`
        };
    }

    getSprite(item) {
        return item.sprite || '📄';
    }
}

class HealthCollectable extends CollectableType {
    constructor() {
        super({
            id: 'health',
            name: 'Health Pack',
            emoji: '❤️',
            color: '#ff0000',
            sound: 'heal'
        });
        this.defaultValue = 25;
    }

    getLogMessage(item) {
        const value = item.value || this.defaultValue;
        return `❤️ +${value} health`;
    }

    calculateEffect(item, agent, gameState) {
        const value = item.value || this.defaultValue;
        const currentHealth = agent?.health || 0;
        const maxHealth = agent?.maxHealth || 100;
        const actualHeal = Math.min(value, maxHealth - currentHealth);

        return {
            health: actualHeal,
            message: actualHeal > 0 ? `❤️ Restored ${actualHeal} health` : '❤️ Already at full health'
        };
    }

    getSprite(item) {
        return item.sprite || '❤️';
    }
}

class ArmorCollectable extends CollectableType {
    constructor() {
        super({
            id: 'armor',
            name: 'Armor',
            emoji: '🛡️',
            color: '#4444ff',
            sound: 'pickup'
        });
        this.defaultValue = 5;
    }

    getLogMessage(item) {
        const value = item.value || this.defaultValue;
        return `🛡️ +${value} armor`;
    }

    calculateEffect(item, agent, gameState) {
        const value = item.value || this.defaultValue;
        return {
            armor: value,
            message: `🛡️ +${value} armor`
        };
    }

    getSprite(item) {
        return item.sprite || '🛡️';
    }
}

class KeycardCollectable extends CollectableType {
    constructor() {
        super({
            id: 'keycard',
            name: 'Keycard',
            emoji: '🗝️',
            color: '#ff00ff',
            sound: 'pickup'
        });
    }

    getLogMessage(item) {
        const level = item.name || item.level || 'Access';
        return `🗝️ ${level} Keycard`;
    }

    calculateEffect(item, agent, gameState) {
        const level = item.name || item.level || 'Access';
        return {
            keycard: level,
            message: `🗝️ Collected ${level} keycard`
        };
    }

    getSprite(item) {
        return item.sprite || '🗝️';
    }
}

class ExplosivesCollectable extends CollectableType {
    constructor() {
        super({
            id: 'explosives',
            name: 'Explosives',
            emoji: '💣',
            color: '#ff6600',
            sound: 'pickup'
        });
        this.defaultValue = 2;
    }

    getLogMessage(item) {
        const count = item.value || this.defaultValue;
        return `💣 +${count} explosives`;
    }

    calculateEffect(item, agent, gameState) {
        const count = item.value || this.defaultValue;
        return {
            explosives: count,
            message: `💣 Collected ${count} explosives`
        };
    }

    getSprite(item) {
        return item.sprite || '💣';
    }
}

class WeaponCollectable extends CollectableType {
    constructor() {
        super({
            id: 'weapon',
            name: 'Weapon',
            emoji: '⚔️',
            color: '#ff4444',
            sound: 'pickup'
        });
    }

    getLogMessage(item) {
        const name = item.name || item.weapon || 'Weapon';
        const damage = item.weaponDamage || item.damage;
        return damage ? `⚔️ ${name} (${damage} dmg)` : `⚔️ ${name}`;
    }

    calculateEffect(item, agent, gameState) {
        const name = item.name || item.weapon || 'Weapon';
        return {
            weapon: {
                name: name,
                damage: item.weaponDamage || item.damage || 10,
                range: item.weaponRange || item.range || 200
            },
            message: `⚔️ Picked up ${name}`
        };
    }

    getSprite(item) {
        return item.sprite || '🔫';
    }
}

class QuestCollectable extends CollectableType {
    constructor() {
        super({
            id: 'collectable',
            name: 'Item',
            emoji: '📦',
            color: '#aa00ff',
            sound: 'pickup'
        });
    }

    getLogMessage(item) {
        const sprite = item.sprite || '📦';
        const name = item.name || item.item || 'Item';
        const parts = [];

        // Show what the item gives
        if (item.credits) {
            parts.push(`+${item.credits} credits`);
        }
        if (item.health) {
            parts.push(`+${item.health} health`);
        }
        if (item.researchPoints) {
            parts.push(`+${item.researchPoints} research`);
        }
        if (item.item && !item.credits && !item.health) {
            // Quest item with no immediate reward
            parts.push('quest item');
        }

        if (parts.length > 0) {
            return `${sprite} ${name} (${parts.join(', ')})`;
        }
        return `${sprite} ${name}`;
    }

    calculateEffect(item, agent, gameState) {
        const name = item.name || item.item || 'Item';
        const questItem = item.item || item.questItem;

        const effects = {
            message: this.getLogMessage(item)
        };

        if (questItem) effects.questItem = questItem;
        if (item.credits) effects.credits = item.credits;
        if (item.health) effects.health = item.health;
        if (item.researchPoints) effects.researchPoints = item.researchPoints;

        return effects;
    }

    getSprite(item) {
        return item.sprite || '📦';
    }

    isVisible(item, gameState = {}) {
        // Quest collectables require their quest to be active
        if (item.questRequired) {
            const questActive = gameState.activeQuests?.[item.questRequired] ||
                               gameState.npcActiveQuests?.some(q => q.id === item.questRequired);
            return questActive;
        }
        return !item.hidden;
    }
}

// ============================================================
// Registry - Single access point for all collectable types
// ============================================================

class CollectableRegistry {
    static types = new Map();
    static initialized = false;

    /**
     * Initialize registry with all collectable types
     */
    static initialize() {
        if (this.initialized) return;

        this.register(new CreditsCollectable());
        this.register(new IntelCollectable());
        this.register(new HealthCollectable());
        this.register(new ArmorCollectable());
        this.register(new KeycardCollectable());
        this.register(new ExplosivesCollectable());
        this.register(new WeaponCollectable());
        this.register(new QuestCollectable());

        this.initialized = true;
        console.log('📦 CollectableRegistry initialized with', this.types.size, 'types');
    }

    /**
     * Register a collectable type
     */
    static register(type) {
        this.types.set(type.id, type);
    }

    /**
     * Get collectable type by ID
     * @param {string} id - Type ID (e.g., 'credits', 'health')
     * @returns {CollectableType|null}
     */
    static get(id) {
        if (!this.initialized) this.initialize();
        return this.types.get(id) || null;
    }

    /**
     * Get all registered types
     * @returns {Array<CollectableType>}
     */
    static getAll() {
        if (!this.initialized) this.initialize();
        return Array.from(this.types.values());
    }

    /**
     * Check if a type is registered
     * @param {string} id - Type ID
     * @returns {boolean}
     */
    static has(id) {
        if (!this.initialized) this.initialize();
        return this.types.has(id);
    }

    // ============================================================
    // Convenience methods that delegate to type instances
    // ============================================================

    /**
     * Get log message for an item
     * @param {Object} item - Item with type property
     * @param {Object} context - Optional context
     * @returns {string}
     */
    static getLogMessage(item, context = {}) {
        const type = this.get(item.type);
        if (type) {
            return type.getLogMessage(item, context);
        }
        return item.name || item.type || 'item';
    }

    /**
     * Calculate effect for an item
     * @param {Object} item - Item with type property
     * @param {Object} agent - Agent collecting
     * @param {Object} gameState - Game state
     * @returns {Object}
     */
    static calculateEffect(item, agent, gameState = {}) {
        const type = this.get(item.type);
        if (type) {
            return type.calculateEffect(item, agent, gameState);
        }
        return { message: `Collected ${item.name || item.type}` };
    }

    /**
     * Get sprite for an item
     * @param {Object} item - Item with type property
     * @returns {string}
     */
    static getSprite(item) {
        const type = this.get(item.type);
        if (type) {
            return type.getSprite(item);
        }
        return item.sprite || '📦';
    }

    /**
     * Get color for an item type
     * @param {string} typeId - Type ID
     * @returns {string}
     */
    static getColor(typeId) {
        const type = this.get(typeId);
        return type?.color || '#ffffff';
    }

    /**
     * Get sound for an item
     * @param {Object} item - Item with type property
     * @returns {string}
     */
    static getSound(item) {
        const type = this.get(item.type);
        if (type) {
            return type.getSound(item);
        }
        return 'pickup';
    }

    /**
     * Check if item should be visible
     * @param {Object} item - Item to check
     * @param {Object} gameState - Game state
     * @returns {boolean}
     */
    static isVisible(item, gameState = {}) {
        const type = this.get(item.type);
        if (type) {
            return type.isVisible(item, gameState);
        }
        return !item.hidden;
    }
}

// Auto-initialize on load
CollectableRegistry.initialize();

// Export for use
if (typeof window !== 'undefined') {
    window.CollectableType = CollectableType;
    window.CollectableRegistry = CollectableRegistry;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CollectableType, CollectableRegistry };
}
