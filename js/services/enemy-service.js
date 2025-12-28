/**
 * EnemyService - Centralized enemy lifecycle management
 * Single source of truth for all enemy operations
 * Mirrors AgentService pattern for consistency
 */
class EnemyService {
    constructor() {
        this.logger = window.Logger ? new window.Logger('EnemyService') : null;

        // Core enemy storage
        this.enemies = [];

        // Event listeners for external notifications
        this.listeners = new Map();

        // Statistics tracking
        this.stats = {
            totalSpawned: 0,
            totalKilled: 0,
            totalDamageDealt: 0
        };

        if (this.logger) this.logger.debug('EnemyService initialized');
    }

    // ========== LIFECYCLE METHODS ==========

    /**
     * Spawn a new enemy
     * @param {Object} data - Enemy configuration
     * @returns {Object} Created enemy
     */
    spawnEnemy(data) {
        if (!data) {
            if (this.logger) this.logger.warn('spawnEnemy called with no data');
            return null;
        }

        const enemy = {
            id: data.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: data.type || 'guard',
            x: data.x ?? 0,
            y: data.y ?? 0,
            health: data.health ?? 100,
            maxHealth: data.maxHealth ?? data.health ?? 100,
            damage: data.damage ?? 15,
            speed: data.speed ?? 2,
            detectionRange: data.detectionRange ?? 8,
            alive: true,
            alerted: false,
            alertLevel: 0,
            targetAgent: null,
            path: null,
            lastKnownPlayerPos: null,
            // RPG entity if provided
            rpgEntity: data.rpgEntity || null,
            // Any additional properties
            ...data
        };

        this.enemies.push(enemy);
        this.stats.totalSpawned++;

        if (this.logger) this.logger.debug(`👹 Enemy spawned: ${enemy.type} (${enemy.id}) at (${enemy.x}, ${enemy.y})`);
        this.notifyListeners('spawn', enemy);

        return enemy;
    }

    /**
     * Damage an enemy
     * @param {string} enemyId - Enemy ID
     * @param {number} amount - Damage amount
     * @param {string} source - Damage source for logging
     * @returns {boolean} Success
     */
    damageEnemy(enemyId, amount, source = null) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy || !enemy.alive) return false;

        const oldHealth = enemy.health;
        enemy.health = Math.max(0, enemy.health - amount);
        this.stats.totalDamageDealt += amount;

        if (this.logger) this.logger.debug(`💔 Enemy ${enemy.type} damaged: ${oldHealth} → ${enemy.health}${source ? ` by ${source}` : ''}`);

        if (enemy.health <= 0) {
            this.killEnemy(enemyId, source);
        }

        this.notifyListeners('damage', { enemy, amount, source });
        return true;
    }

    /**
     * Heal an enemy
     * @param {string} enemyId - Enemy ID
     * @param {number} amount - Heal amount
     * @returns {boolean} Success
     */
    healEnemy(enemyId, amount) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy || !enemy.alive) return false;

        const oldHealth = enemy.health;
        enemy.health = Math.min(enemy.maxHealth, enemy.health + amount);

        if (this.logger) this.logger.debug(`💚 Enemy ${enemy.type} healed: ${oldHealth} → ${enemy.health}`);
        return true;
    }

    /**
     * Kill an enemy
     * @param {string} enemyId - Enemy ID
     * @param {string} source - Kill source for logging
     * @returns {boolean} Success
     */
    killEnemy(enemyId, source = null) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy) return false;

        if (enemy.alive) {
            enemy.alive = false;
            enemy.health = 0;
            this.stats.totalKilled++;

            if (this.logger) this.logger.info(`💀 Enemy killed: ${enemy.type} (${enemy.id})${source ? ` by ${source}` : ''}`);
            this.notifyListeners('kill', { enemy, source });
        }

        return true;
    }

    /**
     * Clear all enemies (for mission reset)
     */
    clearAll() {
        const count = this.enemies.length;
        this.enemies = [];

        if (this.logger) this.logger.debug(`🧹 Cleared ${count} enemies`);
        this.notifyListeners('clear', { count });
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            totalSpawned: 0,
            totalKilled: 0,
            totalDamageDealt: 0
        };
    }

    // ========== QUERY METHODS ==========

    /**
     * Get enemy by ID
     * @param {string} enemyId - Enemy ID
     * @returns {Object|null} Enemy or null
     */
    getEnemy(enemyId) {
        if (!enemyId) return null;
        return this.enemies.find(e => e.id === enemyId) || null;
    }

    /**
     * Get enemy at position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} tolerance - Position tolerance (default 0.5)
     * @returns {Object|null} Enemy or null
     */
    getEnemyAt(x, y, tolerance = 0.5) {
        return this.enemies.find(e =>
            e.alive &&
            Math.abs(e.x - x) <= tolerance &&
            Math.abs(e.y - y) <= tolerance
        ) || null;
    }

    /**
     * Get all alive enemies
     * @returns {Array} Alive enemies
     */
    getAliveEnemies() {
        return this.enemies.filter(e => e.alive);
    }

    /**
     * Get all dead enemies
     * @returns {Array} Dead enemies
     */
    getDeadEnemies() {
        return this.enemies.filter(e => !e.alive);
    }

    /**
     * Get all enemies
     * @returns {Array} All enemies
     */
    getAllEnemies() {
        return this.enemies;
    }

    /**
     * Get enemies by type
     * @param {string} type - Enemy type
     * @returns {Array} Matching enemies
     */
    getEnemiesByType(type) {
        return this.enemies.filter(e => e.type === type);
    }

    /**
     * Get enemies in range of position
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} range - Detection range
     * @param {boolean} aliveOnly - Only include alive enemies
     * @returns {Array} Enemies in range
     */
    getEnemiesInRange(x, y, range, aliveOnly = true) {
        return this.enemies.filter(e => {
            if (aliveOnly && !e.alive) return false;
            const dx = e.x - x;
            const dy = e.y - y;
            return Math.sqrt(dx * dx + dy * dy) <= range;
        });
    }

    /**
     * Get nearest enemy to position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {boolean} aliveOnly - Only consider alive enemies
     * @returns {Object|null} Nearest enemy or null
     */
    getNearestEnemy(x, y, aliveOnly = true) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const enemy of this.enemies) {
            if (aliveOnly && !enemy.alive) continue;

            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < nearestDist) {
                nearest = enemy;
                nearestDist = dist;
            }
        }

        return nearest;
    }

    /**
     * Check if any enemy is alerted
     * @returns {boolean} True if any enemy alerted
     */
    isAnyAlerted() {
        return this.enemies.some(e => e.alive && e.alerted);
    }

    /**
     * Get highest alert level
     * @returns {number} Highest alert level (0-3)
     */
    getHighestAlertLevel() {
        return this.enemies.reduce((max, e) =>
            e.alive ? Math.max(max, e.alertLevel || 0) : max, 0
        );
    }

    // ========== STATE METHODS ==========

    /**
     * Set enemy alert state
     * @param {string} enemyId - Enemy ID
     * @param {boolean} alerted - Alert state
     * @param {number} alertLevel - Alert level (0-3)
     */
    setAlertState(enemyId, alerted, alertLevel = 1) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy || !enemy.alive) return false;

        enemy.alerted = alerted;
        enemy.alertLevel = alertLevel;

        if (this.logger) this.logger.debug(`⚠️ Enemy ${enemy.type} alert: ${alerted} (level ${alertLevel})`);
        this.notifyListeners('alert', { enemy, alerted, alertLevel });
        return true;
    }

    /**
     * Update enemy position
     * @param {string} enemyId - Enemy ID
     * @param {number} x - New X
     * @param {number} y - New Y
     */
    updatePosition(enemyId, x, y) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy) return false;

        enemy.x = x;
        enemy.y = y;
        return true;
    }

    /**
     * Set enemy target
     * @param {string} enemyId - Enemy ID
     * @param {Object|null} target - Target agent or null
     */
    setTarget(enemyId, target) {
        const enemy = this.getEnemy(enemyId);
        if (!enemy) return false;

        enemy.targetAgent = target;
        if (target) {
            enemy.lastKnownPlayerPos = { x: target.x, y: target.y };
        }
        return true;
    }

    // ========== STATISTICS ==========

    /**
     * Get enemy statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        return {
            total: this.enemies.length,
            alive: this.getAliveEnemies().length,
            dead: this.getDeadEnemies().length,
            alerted: this.enemies.filter(e => e.alive && e.alerted).length,
            ...this.stats
        };
    }

    // ========== EVENT SYSTEM ==========

    /**
     * Add event listener
     * @param {string} event - Event name (spawn, damage, kill, alert, clear)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return () => this.listeners.get(event)?.delete(callback);
    }

    /**
     * Notify listeners of event
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    notifyListeners(event, data) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            handlers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    if (this.logger) this.logger.error(`Error in ${event} listener:`, error);
                }
            });
        }
    }

    // ========== SERIALIZATION ==========

    /**
     * Export enemies for save
     * @returns {Object} Serialized data
     */
    exportForSave() {
        return {
            enemies: this.enemies.map(e => ({
                id: e.id,
                type: e.type,
                x: e.x,
                y: e.y,
                health: e.health,
                maxHealth: e.maxHealth,
                alive: e.alive,
                alerted: e.alerted,
                alertLevel: e.alertLevel
            })),
            stats: { ...this.stats }
        };
    }

    /**
     * Import enemies from save
     * @param {Object} data - Saved data
     */
    importFromSave(data) {
        if (!data) return;

        if (data.enemies) {
            this.enemies = data.enemies.map(e => ({
                ...e,
                path: null,
                targetAgent: null,
                lastKnownPlayerPos: null
            }));
        }

        if (data.stats) {
            this.stats = { ...data.stats };
        }

        if (this.logger) this.logger.debug(`📥 Imported ${this.enemies.length} enemies from save`);
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.EnemyService = EnemyService;
}
