/**
 * EventLogService - Centralized event logging and history
 * Provides structured logging with filtering and search capabilities
 */
class EventLogService {
    constructor() {
        // Event storage
        this.events = [];
        this.maxEvents = 1000;
        this.maxDisplayEvents = 100;

        // Event categories
        this.categories = {
            COMBAT: 'combat',
            MOVEMENT: 'movement',
            ITEM: 'item',
            QUEST: 'quest',
            SYSTEM: 'system',
            DIALOG: 'dialog',
            RESOURCE: 'resource',
            MISSION: 'mission',
            ERROR: 'error'
        };

        // Event priorities
        this.priorities = {
            LOW: 0,
            NORMAL: 1,
            HIGH: 2,
            CRITICAL: 3
        };

        // Filters
        this.filters = {
            categories: new Set(),
            minPriority: 0,
            searchText: '',
            timeRange: null // { start: Date, end: Date }
        };

        // Templates for consistent formatting
        this.templates = {
            combat: {
                attack: '{attacker} attacks {target} for {damage} damage',
                kill: '{killer} eliminates {victim}',
                miss: '{attacker} misses {target}',
                critical: '💥 CRITICAL! {attacker} deals {damage} to {target}',
                heal: '{healer} heals {target} for {amount} HP'
            },
            item: {
                pickup: '{agent} picks up {item}',
                drop: '{agent} drops {item}',
                equip: '{agent} equips {item}',
                unequip: '{agent} unequips {item}',
                use: '{agent} uses {item}'
            },
            quest: {
                start: '📋 Quest started: {quest}',
                complete: '✅ Quest completed: {quest}',
                fail: '❌ Quest failed: {quest}',
                objective: '📍 Objective: {objective}'
            },
            mission: {
                start: '🎯 Mission started: {mission}',
                complete: '🏆 Mission completed: {mission}',
                fail: '💀 Mission failed: {mission}',
                extract: '🚁 Extraction point activated'
            },
            resource: {
                gain: '💰 +{amount} {resource}',
                spend: '💸 -{amount} {resource}',
                trade: '{agent} trades {give} for {receive}'
            }
        };

        // Statistics
        this.stats = {
            totalLogged: 0,
            byCategory: {},
            byPriority: {}
        };

        // Initialize stats
        Object.values(this.categories).forEach(cat => {
            this.stats.byCategory[cat] = 0;
        });
        Object.values(this.priorities).forEach(pri => {
            this.stats.byPriority[pri] = 0;
        });

        // Event listeners
        this.listeners = {
            log: [],
            clear: [],
            filter: [],
            any: []
        };
    }

    /**
     * Log an event
     */
    log(category, type, data = {}, priority = this.priorities.NORMAL) {
        const event = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            category,
            type,
            priority,
            data,
            message: this.formatMessage(category, type, data),
            turn: data.turn || null,
            mission: data.mission || null,
            agent: data.agent || null
        };

        // Add to events
        this.events.push(event);

        // Trim if too many events
        if (this.events.length > this.maxEvents) {
            this.events.shift();
        }

        // Update statistics
        this.stats.totalLogged++;
        this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;
        this.stats.byPriority[priority] = (this.stats.byPriority[priority] || 0) + 1;

        // Notify listeners
        this.notifyListeners('log', event);

        // Console log for critical events
        if (priority >= this.priorities.HIGH) {
            console.log(`📝 [${category.toUpperCase()}] ${event.message}`);
        }

        return event;
    }

    /**
     * Format message using templates
     */
    formatMessage(category, type, data) {
        // Check for template
        const categoryTemplates = this.templates[category];
        if (categoryTemplates && categoryTemplates[type]) {
            let message = categoryTemplates[type];

            // Replace placeholders
            Object.keys(data).forEach(key => {
                const value = data[key];
                const displayValue = typeof value === 'object' ? (value.name || value.id || 'unknown') : value;
                message = message.replace(`{${key}}`, displayValue);
            });

            return message;
        }

        // Default formatting
        return this.defaultFormat(category, type, data);
    }

    /**
     * Default message formatting
     */
    defaultFormat(category, type, data) {
        const parts = [`[${category.toUpperCase()}]`, type];

        // Add key data points
        if (data.agent) parts.push(`Agent: ${data.agent}`);
        if (data.target) parts.push(`Target: ${data.target}`);
        if (data.value) parts.push(`Value: ${data.value}`);
        if (data.message) parts.push(data.message);

        return parts.join(' - ');
    }

    /**
     * Log combat event
     */
    logCombat(type, attacker, target, damage = 0, extra = {}) {
        return this.log(this.categories.COMBAT, type, {
            attacker: attacker?.name || attacker,
            target: target?.name || target,
            damage,
            ...extra
        }, damage > 50 ? this.priorities.HIGH : this.priorities.NORMAL);
    }

    /**
     * Log item event
     */
    logItem(type, agent, item, extra = {}) {
        return this.log(this.categories.ITEM, type, {
            agent: agent?.name || agent,
            item: item?.name || item,
            ...extra
        });
    }

    /**
     * Log quest event
     */
    logQuest(type, quest, extra = {}) {
        return this.log(this.categories.QUEST, type, {
            quest: quest?.name || quest,
            ...extra
        }, type === 'complete' ? this.priorities.HIGH : this.priorities.NORMAL);
    }

    /**
     * Log mission event
     */
    logMission(type, mission, extra = {}) {
        return this.log(this.categories.MISSION, type, {
            mission: mission?.name || mission,
            ...extra
        }, this.priorities.HIGH);
    }

    /**
     * Log resource event
     */
    logResource(type, resource, amount, extra = {}) {
        return this.log(this.categories.RESOURCE, type, {
            resource,
            amount,
            ...extra
        });
    }

    /**
     * Log system event
     */
    logSystem(message, data = {}) {
        return this.log(this.categories.SYSTEM, 'info', {
            message,
            ...data
        });
    }

    /**
     * Log error
     */
    logError(message, error = null, data = {}) {
        return this.log(this.categories.ERROR, 'error', {
            message,
            error: error?.message || error,
            stack: error?.stack,
            ...data
        }, this.priorities.CRITICAL);
    }

    /**
     * Get filtered events
     */
    getEvents(limit = this.maxDisplayEvents) {
        let filtered = [...this.events];

        // Apply category filter
        if (this.filters.categories.size > 0) {
            filtered = filtered.filter(e => this.filters.categories.has(e.category));
        }

        // Apply priority filter
        if (this.filters.minPriority > 0) {
            filtered = filtered.filter(e => e.priority >= this.filters.minPriority);
        }

        // Apply search filter
        if (this.filters.searchText) {
            const search = this.filters.searchText.toLowerCase();
            filtered = filtered.filter(e =>
                e.message.toLowerCase().includes(search) ||
                e.type.toLowerCase().includes(search) ||
                JSON.stringify(e.data).toLowerCase().includes(search)
            );
        }

        // Apply time range filter
        if (this.filters.timeRange) {
            filtered = filtered.filter(e =>
                e.timestamp >= this.filters.timeRange.start &&
                e.timestamp <= this.filters.timeRange.end
            );
        }

        // Sort by timestamp (newest first)
        filtered.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        return filtered.slice(0, limit);
    }

    /**
     * Get events by category
     */
    getEventsByCategory(category, limit = this.maxDisplayEvents) {
        return this.events
            .filter(e => e.category === category)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Get events by priority
     */
    getEventsByPriority(minPriority, limit = this.maxDisplayEvents) {
        return this.events
            .filter(e => e.priority >= minPriority)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Get recent events
     */
    getRecentEvents(seconds = 60, limit = this.maxDisplayEvents) {
        const cutoff = Date.now() - (seconds * 1000);
        return this.events
            .filter(e => e.timestamp > cutoff)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Search events
     */
    searchEvents(searchText, limit = this.maxDisplayEvents) {
        const search = searchText.toLowerCase();
        return this.events
            .filter(e =>
                e.message.toLowerCase().includes(search) ||
                e.type.toLowerCase().includes(search) ||
                JSON.stringify(e.data).toLowerCase().includes(search)
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    /**
     * Set filter
     */
    setFilter(filterType, value) {
        switch (filterType) {
            case 'category':
                if (value) {
                    this.filters.categories.add(value);
                } else {
                    this.filters.categories.clear();
                }
                break;
            case 'priority':
                this.filters.minPriority = value;
                break;
            case 'search':
                this.filters.searchText = value;
                break;
            case 'timeRange':
                this.filters.timeRange = value;
                break;
        }

        // Notify listeners
        this.notifyListeners('filter', { type: filterType, value });
    }

    /**
     * Clear filter
     */
    clearFilter(filterType) {
        if (filterType) {
            this.setFilter(filterType, null);
        } else {
            // Clear all filters
            this.filters.categories.clear();
            this.filters.minPriority = 0;
            this.filters.searchText = '';
            this.filters.timeRange = null;
        }
    }

    /**
     * Format event for display
     */
    formatEvent(event) {
        const time = new Date(event.timestamp).toLocaleTimeString();
        const categoryIcon = this.getCategoryIcon(event.category);
        const priorityColor = this.getPriorityColor(event.priority);

        return {
            time,
            icon: categoryIcon,
            color: priorityColor,
            message: event.message,
            raw: event
        };
    }

    /**
     * Get category icon
     */
    getCategoryIcon(category) {
        const icons = {
            combat: '⚔️',
            movement: '👣',
            item: '📦',
            quest: '📋',
            system: '⚙️',
            dialog: '💬',
            resource: '💰',
            mission: '🎯',
            error: '❌'
        };
        return icons[category] || '📝';
    }

    /**
     * Get priority color
     */
    getPriorityColor(priority) {
        const colors = {
            0: '#888888', // LOW
            1: '#ffffff', // NORMAL
            2: '#ffff00', // HIGH
            3: '#ff0000'  // CRITICAL
        };
        return colors[priority] || '#ffffff';
    }

    /**
     * Clear events
     */
    clearEvents(category = null) {
        if (category) {
            this.events = this.events.filter(e => e.category !== category);
        } else {
            this.events = [];
        }

        // Notify listeners
        this.notifyListeners('clear', { category });

        console.log(`🧹 Cleared events${category ? ` for category: ${category}` : ''}`);
    }

    /**
     * Export events
     */
    exportEvents(format = 'json') {
        if (format === 'json') {
            return JSON.stringify(this.events, null, 2);
        } else if (format === 'csv') {
            const headers = ['Timestamp', 'Category', 'Type', 'Priority', 'Message'];
            const rows = this.events.map(e => [
                new Date(e.timestamp).toISOString(),
                e.category,
                e.type,
                e.priority,
                e.message.replace(/,/g, ';')
            ]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        } else if (format === 'text') {
            return this.events.map(e =>
                `[${new Date(e.timestamp).toLocaleString()}] [${e.category.toUpperCase()}] ${e.message}`
            ).join('\n');
        }
        return '';
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalEvents: this.events.length,
            totalLogged: this.stats.totalLogged,
            byCategory: { ...this.stats.byCategory },
            byPriority: { ...this.stats.byPriority },
            oldestEvent: this.events[0]?.timestamp,
            newestEvent: this.events[this.events.length - 1]?.timestamp
        };
    }

    /**
     * Add custom template
     */
    addTemplate(category, type, template) {
        if (!this.templates[category]) {
            this.templates[category] = {};
        }
        this.templates[category][type] = template;
    }

    /**
     * Add event listener
     */
    addListener(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        } else if (eventType === 'any' || eventType === '*') {
            this.listeners.any.push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(eventType, callback) {
        const list = eventType === 'any' || eventType === '*'
            ? this.listeners.any
            : this.listeners[eventType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(eventType, data) {
        // Specific listeners
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in log listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                console.error('Error in global log listener:', e);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventLogService;
}