/**
 * HUDService - Centralized HUD management
 * FAIL-FAST: No fallbacks, throws errors if not properly initialized
 *
 * Inspired by declarative dialog system's proven patterns:
 * - Registry pattern for elements
 * - Change detection to skip unnecessary updates
 * - Screen-based visibility control
 */

class HUDService {
    constructor(game) {
        if (!game) {
            throw new Error('HUDService requires game instance');
        }

        this.game = game;
        this.logger = window.Logger ? new window.Logger('HUDService') : null;

        // Registry pattern from dialog system
        this.elements = new Map();

        // Change detection (from dialog refresh pattern)
        this.lastData = new Map();

        // DOM cache
        this.domCache = new Map();

        // Current HUD mode
        this.currentMode = null; // 'none', 'game-2d', 'game-3d'

        // Visible elements
        this.visibleElements = new Set();

        if (this.logger) this.logger.info('✅ HUDService created');
    }

    /**
     * Register HUD element - FAIL FAST if invalid
     */
    register(elementId, updateFn) {
        if (!elementId || typeof elementId !== 'string') {
            throw new Error('HUDService.register: elementId must be a non-empty string');
        }
        if (!updateFn || typeof updateFn !== 'function') {
            throw new Error(`HUDService.register: updateFn must be a function (element: ${elementId})`);
        }

        this.elements.set(elementId, { updateFn });

        if (this.logger) this.logger.debug(`Registered HUD element: ${elementId}`);
    }

    /**
     * Update HUD element - FAIL FAST if not registered
     */
    update(elementId, data) {
        const element = this.elements.get(elementId);
        if (!element) {
            throw new Error(`HUD element not registered: ${elementId}`);
        }

        // Skip if element not visible
        if (!this.visibleElements.has(elementId)) {
            if (this.logger) this.logger.trace(`Skipping update for hidden element: ${elementId}`);
            return;
        }

        // Get DOM element - FAIL FAST if missing during game
        const domEl = this.getDOMElement(elementId);
        if (!domEl) {
            // Only throw in game mode, allow in test mode
            if (this.game.currentScreen === 'game') {
                throw new Error(`DOM element not found: ${elementId} (screen: ${this.game.currentScreen})`);
            }
            return;
        }

        // Change detection
        const lastData = this.lastData.get(elementId);
        if (lastData && this.dataEquals(lastData, data)) {
            return; // Skip - no change
        }

        // Call update function with game context
        element.updateFn.call(this.game, domEl, data);

        // Cache data
        this.lastData.set(elementId, this.cloneData(data));
    }

    /**
     * Set HUD mode and visibility - called by ScreenManager
     */
    setMode(mode, visibleElements = []) {
        if (this.logger) this.logger.info(`🎨 Setting HUD mode: ${mode}, elements: ${visibleElements.length}`);

        this.currentMode = mode;
        this.visibleElements = new Set(visibleElements);

        // Get HUD containers
        const gameHUD = document.getElementById('gameHUD');
        const game3DHUD = document.getElementById('game3DHUD');

        // FAIL FAST: HUD containers must exist
        if (mode !== 'none' && !gameHUD) {
            throw new Error('gameHUD element not found');
        }

        switch (mode) {
            case 'none':
                if (gameHUD) gameHUD.style.display = 'none';
                if (game3DHUD) game3DHUD.style.display = 'none';
                break;

            case 'game-2d':
                if (gameHUD) gameHUD.style.display = 'block';
                if (game3DHUD) game3DHUD.style.display = 'none';
                break;

            case 'game-3d':
                if (gameHUD) gameHUD.style.display = 'none';
                if (game3DHUD) game3DHUD.style.display = 'block';
                break;

            default:
                throw new Error(`Unknown HUD mode: ${mode}`);
        }

        // Clear cache when mode changes
        this.lastData.clear();
    }

    /**
     * Get DOM element with cache
     */
    getDOMElement(elementId) {
        if (!this.domCache.has(elementId)) {
            const el = document.getElementById(elementId);
            if (el) {
                this.domCache.set(elementId, el);
            }
        }
        return this.domCache.get(elementId);
    }

    /**
     * Clear cache - called on mission transitions
     */
    clearCache() {
        this.lastData.clear();
        this.domCache.clear();
        if (this.logger) this.logger.debug('HUD cache cleared');
    }

    /**
     * Get HUD status for debugging
     */
    getStatus() {
        return {
            currentMode: this.currentMode,
            registeredElements: Array.from(this.elements.keys()),
            visibleElements: Array.from(this.visibleElements),
            cachedData: Array.from(this.lastData.keys()),
            totalElements: this.elements.size
        };
    }

    /**
     * Data comparison for change detection
     */
    dataEquals(data1, data2) {
        // Remove non-serializable properties before comparison
        const clean1 = this.cleanForComparison(data1);
        const clean2 = this.cleanForComparison(data2);
        return JSON.stringify(clean1) === JSON.stringify(clean2);
    }

    /**
     * Clone data for caching
     */
    cloneData(data) {
        if (typeof data === 'object' && data !== null) {
            // Remove non-serializable properties before cloning
            const cleanData = this.cleanForComparison(data);
            return JSON.parse(JSON.stringify(cleanData));
        }
        return data;
    }

    /**
     * Remove non-serializable properties (like game reference)
     */
    cleanForComparison(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        // Create shallow copy and remove game reference
        const cleaned = { ...data };
        delete cleaned.game;

        // Clean agents array
        if (cleaned.agents && Array.isArray(cleaned.agents)) {
            cleaned.agents = cleaned.agents.map(agent => {
                // Only keep essential agent properties for comparison
                return {
                    id: agent.id,
                    name: agent.name,
                    health: agent.health,
                    maxHealth: agent.maxHealth,
                    alive: agent.alive
                };
            });
        }

        // Clean turnQueue (contains unit references that may have circular refs)
        if (cleaned.turnQueue && Array.isArray(cleaned.turnQueue)) {
            cleaned.turnQueue = cleaned.turnQueue.map(tu => ({
                ap: tu.ap,
                maxAp: tu.maxAp,
                unitId: tu.unit?.id || tu.unit?.name  // Only store ID, not full object
            }));
        }

        // Clean currentTurnUnit
        if (cleaned.currentTurnUnit) {
            cleaned.currentTurnUnit = {
                ap: cleaned.currentTurnUnit.ap,
                maxAp: cleaned.currentTurnUnit.maxAp,
                unitId: cleaned.currentTurnUnit.unit?.id || cleaned.currentTurnUnit.unit?.name
            };
        }

        return cleaned;
    }

    // ============================================
    // UPDATE FUNCTIONS (moved from scattered locations)
    // ============================================

    /**
     * Update mission timer
     * MOVED FROM: engine/game-facade.js:1324-1329
     */
    updateMissionTimer(domEl, seconds) {
        const minutes = Math.floor(seconds / 60);
        domEl.textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }

    /**
     * Update objective tracker
     * MOVED FROM: game-mission-executor.js:642-678
     */
    updateObjectiveTracker(domEl, data) {
        let displayText = '';

        // Add turn-based info if active
        if (data.turnBasedMode) {
            let tbInfo = `[TB Mode] `;
            if (data.currentTurnUnit) {
                const unitName = data.currentTurnUnit.unit.name || `Agent ${data.currentTurnUnit.unit.id}`;
                const ap = data.currentTurnUnit.ap;
                const maxAp = data.currentTurnUnit.maxAp;
                tbInfo += `${unitName}'s Turn (${ap}/${maxAp} AP) | Round ${data.turnRound || 1} | `;
            }
            displayText += tbInfo;
        }

        // Build objective list
        const objectives = data.objectives;
        if (objectives && objectives.length > 0) {
            objectives.forEach(obj => {
                const icon = obj.completed ? '✅' : '⏳';
                displayText += `${icon} ${obj.description} `;
            });
        }

        domEl.textContent = displayText;
    }

    /**
     * Update squad health bars
     * MOVED FROM: game-flow.js:1057-1145
     * OPTIMIZED: Only updates changed properties instead of full rebuild
     */
    updateSquadHealth(domEl, data) {
        const { agents, turnBasedMode, turnQueue, currentTurnUnit, game } = data;

        // Check if full rebuild needed
        const expectedBars = agents.length;
        const currentBars = domEl.children.length;

        if (currentBars !== expectedBars) {
            // Full rebuild needed (rare - only when agent count changes)
            this._rebuildSquadHealth(domEl, data);
            return;
        }

        // OPTIMIZATION: Update existing bars in-place
        agents.forEach((agent, index) => {
            const bar = domEl.children[index];
            if (!bar) return;

            // Update classes only if changed
            const expectedClasses = this._getAgentBarClasses(agent, game);
            if (bar.className !== expectedClasses) {
                bar.className = expectedClasses;
            }

            // Update health fill only if health changed
            const healthPercent = agent.alive ?
                Math.max(0, (agent.health / agent.maxHealth) * 100) : 0;
            const healthFill = bar.querySelector('.health-fill');
            if (healthFill) {
                const expectedWidth = `${healthPercent}%`;
                if (healthFill.style.width !== expectedWidth) {
                    healthFill.style.width = expectedWidth;
                }
            }

            // Update agent name if needed
            const agentName = bar.querySelector('.agent-name');
            if (agentName) {
                const expectedName = `${agent.name} [${index + 1}]${!agent.alive ? ' ☠️' : ''}`;
                if (agentName.textContent !== expectedName) {
                    agentName.textContent = expectedName;
                }
            }

            // Update AP bar if in turn-based mode
            if (turnBasedMode && agent.alive) {
                this._updateAPBar(bar, agent, turnQueue, currentTurnUnit);
            } else {
                // Remove AP bar if not in turn-based mode
                const apBar = bar.querySelector('.ap-bar');
                if (apBar) {
                    apBar.remove();
                }
            }
        });
    }

    /**
     * Rebuild squad health bars from scratch
     * Only called when agent count changes
     */
    _rebuildSquadHealth(domEl, data) {
        const { agents, turnBasedMode, turnQueue, currentTurnUnit, game } = data;

        domEl.innerHTML = '';

        agents.forEach((agent, index) => {
            const bar = document.createElement('div');
            bar.className = this._getAgentBarClasses(agent, game);

            bar.style.pointerEvents = 'auto';
            bar.style.cursor = agent.alive ? 'pointer' : 'not-allowed';

            const healthPercent = agent.alive ?
                Math.max(0, (agent.health / agent.maxHealth) * 100) : 0;

            let apBar = '';
            if (turnBasedMode && agent.alive) {
                const turnUnit = turnQueue?.find(tu => tu.unit === agent);
                if (turnUnit) {
                    const apPercent = (turnUnit.ap / turnUnit.maxAp) * 100;
                    apBar = `<div class="ap-bar">
                        <div class="ap-fill" style="width: ${apPercent}%"></div>
                        <div class="ap-text">${turnUnit.ap}/${turnUnit.maxAp} AP</div>
                    </div>`;
                }
            }

            bar.innerHTML = `
                <div class="health-fill" style="width: ${healthPercent}%"></div>
                <div class="agent-name">${agent.name} [${index + 1}]${!agent.alive ? ' ☠️' : ''}</div>
                ${apBar}
            `;

            // Bind click handler ONCE
            bar.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                if (agent.alive) {
                    game.selectAgent(agent);
                }
            });

            bar.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                if (agent.alive) {
                    game.selectAgent(agent);
                }
            });

            domEl.appendChild(bar);
        });
    }

    /**
     * Get agent bar CSS classes
     */
    _getAgentBarClasses(agent, game) {
        let className = 'agent-health-bar';
        if (!agent.alive) className += ' dead';
        if (game.isAgentSelected(agent)) className += ' selected';
        if (game.currentTurnUnit?.unit === agent) className += ' current-turn';
        return className;
    }

    /**
     * Update AP bar for turn-based mode
     */
    _updateAPBar(bar, agent, turnQueue, currentTurnUnit) {
        const turnUnit = turnQueue?.find(tu => tu.unit === agent);
        if (!turnUnit) return;

        let apBarEl = bar.querySelector('.ap-bar');
        if (!apBarEl) {
            // Create AP bar if it doesn't exist
            apBarEl = document.createElement('div');
            apBarEl.className = 'ap-bar';
            bar.appendChild(apBarEl);
        }

        const apPercent = (turnUnit.ap / turnUnit.maxAp) * 100;
        apBarEl.innerHTML = `
            <div class="ap-fill" style="width: ${apPercent}%"></div>
            <div class="ap-text">${turnUnit.ap}/${turnUnit.maxAp} AP</div>
        `;
    }

    /**
     * Update single cooldown overlay
     * MOVED FROM: game-flow.js:2160-2173
     */
    updateCooldown(domEl, data) {
        const { cooldownValue, maxCooldown } = data;
        const progress = cooldownValue / maxCooldown;
        const expectedBg = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;

        // Only update if changed
        if (domEl.style.background !== expectedBg) {
            domEl.style.background = expectedBg;
        }
    }

    /**
     * Update all cooldown overlays for an agent
     */
    updateAllCooldowns(agent) {
        const maxCooldowns = [0, 60, 180, 120, 300];
        for (let i = 0; i < 5; i++) {
            this.update(`cooldown${i}`, {
                cooldownValue: agent.cooldowns[i],
                maxCooldown: maxCooldowns[i]
            });
        }
    }

    /**
     * Register all HUD elements with their update functions
     */
    registerAllElements() {
        // Mission Timer (bind to preserve this context)
        this.register('missionTimer', this.updateMissionTimer.bind(this));

        // Objective Tracker (bind to preserve this context)
        this.register('objectiveTracker', this.updateObjectiveTracker.bind(this));

        // Squad Health (bind to preserve this context)
        this.register('squadHealth', this.updateSquadHealth.bind(this));

        // Cooldown Overlays (5 buttons) - bind to preserve this context
        for (let i = 0; i < 5; i++) {
            this.register(`cooldown${i}`, this.updateCooldown.bind(this));
        }

        if (this.logger) this.logger.info(`✅ Registered ${this.elements.size} HUD elements`);
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HUDService;
}
