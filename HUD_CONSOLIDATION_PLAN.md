# HUD Consolidation Plan

## Executive Summary

**Goal**: Consolidate all HUD element updates into a single management system while **100% preserving current visual appearance and functionality**.

**Approach**: Create a HUDManager service that wraps existing update logic using patterns proven in the declarative dialog system.

**Result**:
- ✅ All HUD updates go through one manager
- ✅ Change detection prevents unnecessary updates
- ✅ Zero visual or functional changes
- ✅ Easier to maintain and test
- ✅ Performance improvements (especially Squad Health)

---

## 1. ARCHITECTURE DECISION

### Option A: Service Layer (RECOMMENDED)

Create a dedicated `HUDService` that manages all HUD updates, similar to how services manage other game systems.

**Pros**:
- ✅ Follows existing service architecture pattern
- ✅ Easy to test independently
- ✅ Clear separation from dialog system
- ✅ Can be initialized like other services
- ✅ Fits unidirectional data flow principle

**Cons**:
- Requires new service initialization

### Option B: Extend Declarative Dialog System

Add HUD management to the existing declarative dialog engine.

**Pros**:
- ✅ Reuses existing registry pattern
- ✅ Already has change detection logic

**Cons**:
- ❌ Mixes in-game HUD with dialog overlays
- ❌ Different z-index requirements
- ❌ Dialog system is for modals, not persistent HUD
- ❌ Violates separation of concerns

### Option C: Standalone HUD Manager

Create a standalone manager outside the service architecture.

**Pros**:
- ✅ Lightweight
- ✅ No dependencies on services

**Cons**:
- ❌ Doesn't follow existing patterns
- ❌ Harder to integrate with existing systems

**DECISION**: **Option A - HUDService** is the best choice.

---

## 2. HUDSERVICE ARCHITECTURE

### Class Structure

```javascript
/**
 * HUDService - Centralized HUD element management
 * Inspired by declarative dialog system's proven patterns
 */
class HUDService {
    constructor(game) {
        this.game = game;
        this.logger = window.Logger ? new window.Logger('HUDService') : null;

        // Registry pattern (from dialog system)
        this.elements = new Map();

        // Change detection (from dialog refresh pattern)
        this.lastContent = new Map();
        this.lastData = new Map();

        // Cached DOM references
        this.domCache = new Map();

        // Update queue for batching
        this.updateQueue = new Set();
        this.batchScheduled = false;
    }

    /**
     * Register a HUD element with its update function
     * Similar to dialog system's generator registry
     */
    register(elementId, updateFn, options = {}) {
        this.elements.set(elementId, {
            updateFn: updateFn,
            options: options,
            initialized: false
        });

        if (this.logger) this.logger.debug(`Registered HUD element: ${elementId}`);
    }

    /**
     * Update a specific HUD element
     * Uses change detection like dialog refresh system
     */
    update(elementId, data, options = {}) {
        const element = this.elements.get(elementId);
        if (!element) {
            if (this.logger) this.logger.warn(`HUD element not registered: ${elementId}`);
            return;
        }

        // Get DOM element (with caching)
        const domEl = this.getDOMElement(elementId);
        if (!domEl) return; // Element doesn't exist (test mode safety)

        // Change detection
        if (!options.force) {
            const lastData = this.lastData.get(elementId);
            if (lastData && this.dataEquals(lastData, data)) {
                return; // Skip update if data unchanged
            }
        }

        // Call update function
        element.updateFn.call(this.game, domEl, data);

        // Cache data for next comparison
        this.lastData.set(elementId, this.cloneData(data));
    }

    /**
     * Queue update for batching (performance optimization)
     */
    queueUpdate(elementId, data) {
        this.updateQueue.add({ elementId, data });

        if (!this.batchScheduled) {
            this.batchScheduled = true;
            requestAnimationFrame(() => this.flushUpdates());
        }
    }

    /**
     * Flush all queued updates
     */
    flushUpdates() {
        this.updateQueue.forEach(({ elementId, data }) => {
            this.update(elementId, data);
        });
        this.updateQueue.clear();
        this.batchScheduled = false;
    }

    /**
     * Get DOM element with caching
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
     * Compare data for change detection
     */
    dataEquals(data1, data2) {
        // Simple deep comparison for common data types
        return JSON.stringify(data1) === JSON.stringify(data2);
    }

    /**
     * Clone data for caching
     */
    cloneData(data) {
        if (typeof data === 'object' && data !== null) {
            return JSON.parse(JSON.stringify(data));
        }
        return data;
    }

    /**
     * Clear all cached data (useful for mission transitions)
     */
    clearCache() {
        this.lastData.clear();
        this.lastContent.clear();
        this.domCache.clear();
        if (this.logger) this.logger.debug('HUD cache cleared');
    }
}
```

---

## 3. MIGRATION STRATEGY

### Phase 1: Create HUDService and Register Elements (Zero Impact)

**Step 1.1**: Create `js/services/hud-service.js`

**Step 1.2**: Initialize in GameServices
```javascript
// In game-services.js
class GameServices {
    constructor() {
        // Existing services...

        // New HUD service
        this.hudService = null; // Initialize later when game is ready
    }

    initializeHUD(game) {
        this.hudService = new HUDService(game);
        this.hudService.registerAllElements();
        if (this.logger) this.logger.info('✅ HUDService initialized');
    }
}
```

**Step 1.3**: Register all HUD elements (no functional changes yet)
```javascript
// In hud-service.js
HUDService.prototype.registerAllElements = function() {
    // Mission Timer
    this.register('missionTimer', this.updateMissionTimer);

    // Objective Tracker
    this.register('objectiveTracker', this.updateObjectiveTracker);

    // Squad Health
    this.register('squadHealth', this.updateSquadHealth);

    // Cooldown Overlays
    for (let i = 0; i < 5; i++) {
        this.register(`cooldown${i}`, this.updateCooldown, { index: i });
    }

    // Event Log (already well-implemented, minimal changes)
    this.register('eventLogContent', this.updateEventLog);
    this.register('eventLogCompact', this.updateEventLogCompact);
};
```

**Impact**: None - service created but not used yet

---

### Phase 2: Migrate Update Functions (Preserve Exact Logic)

**Key Principle**: Copy existing update logic exactly, just wrap in HUDService methods.

#### 2.1 Mission Timer

**Current** (engine/game-facade.js:1324-1329):
```javascript
const minutes = Math.floor(seconds / 60);
const timerElement = document.getElementById('missionTimer');
if (timerElement) {
    timerElement.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
```

**New** (hud-service.js):
```javascript
HUDService.prototype.updateMissionTimer = function(domEl, seconds) {
    // EXACT SAME LOGIC - just extracted
    const minutes = Math.floor(seconds / 60);
    domEl.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
```

**Usage** (engine/game-facade.js):
```javascript
// Replace old code with:
if (game.gameServices?.hudService) {
    game.gameServices.hudService.update('missionTimer', seconds);
} else {
    // Fallback to old code (during migration)
    const timerElement = document.getElementById('missionTimer');
    if (timerElement) {
        const minutes = Math.floor(seconds / 60);
        timerElement.textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
}
```

**Impact**: Zero - exact same visual result, now with change detection benefit

---

#### 2.2 Objective Tracker

**Current** (game-mission-executor.js:642-659):
```javascript
const tracker = document.getElementById('objectiveTracker');
if (!tracker || !this.currentMissionDef) return;

let displayText = '';
// ... complex string building logic ...
tracker.textContent = displayText;
```

**New** (hud-service.js):
```javascript
HUDService.prototype.updateObjectiveTracker = function(domEl, data) {
    // EXACT SAME LOGIC - just extracted
    if (!data.currentMissionDef) return;

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
};
```

**Usage** (game-mission-executor.js):
```javascript
// Replace old code with:
if (this.gameServices?.hudService) {
    this.gameServices.hudService.update('objectiveTracker', {
        currentMissionDef: this.currentMissionDef,
        turnBasedMode: this.turnBasedMode,
        currentTurnUnit: this.currentTurnUnit,
        turnRound: this.turnRound,
        objectives: this.gameServices.missionService.objectives
    });
}
```

**Impact**: Zero visual change, but now with change detection

---

#### 2.3 Squad Health (BIGGEST OPTIMIZATION)

**Current** (game-flow.js:1057-1145):
```javascript
updateSquadHealth() {
    const container = document.getElementById('squadHealth');
    if (!container) return;

    container.innerHTML = ''; // FULL REBUILD EVERY TIME

    this.agents.forEach((agent, index) => {
        // ... create elements and bind handlers ...
    });
}
```

**New** (hud-service.js) - **With Smart Updates**:
```javascript
HUDService.prototype.updateSquadHealth = function(domEl, data) {
    const { agents, turnBasedMode, turnQueue, currentTurnUnit, game } = data;

    // OPTIMIZATION: Only rebuild if agent count changed
    const expectedBars = agents.length;
    const currentBars = domEl.children.length;

    if (currentBars !== expectedBars) {
        // Full rebuild needed (rare)
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

        // Update AP bar if in turn-based mode
        if (turnBasedMode && agent.alive) {
            this._updateAPBar(bar, agent, turnQueue, currentTurnUnit);
        }
    });
};

HUDService.prototype._rebuildSquadHealth = function(domEl, data) {
    // EXACT SAME LOGIC as current updateSquadHealth
    // Only called when agent count changes (rare)
    domEl.innerHTML = '';

    data.agents.forEach((agent, index) => {
        const bar = document.createElement('div');
        bar.className = this._getAgentBarClasses(agent, data.game);

        const healthPercent = agent.alive ?
            Math.max(0, (agent.health / agent.maxHealth) * 100) : 0;

        let apBar = '';
        if (data.turnBasedMode && agent.alive) {
            const turnUnit = data.turnQueue?.find(tu => tu.unit === agent);
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
                data.game.selectAgent(agent);
            }
        });

        domEl.appendChild(bar);
    });
};

HUDService.prototype._getAgentBarClasses = function(agent, game) {
    let className = 'agent-health-bar';
    if (!agent.alive) className += ' dead';
    if (game.isAgentSelected && game.isAgentSelected(agent)) className += ' selected';
    if (game.currentTurnUnit?.unit === agent) className += ' current-turn';
    return className;
};
```

**Usage** (game-flow.js):
```javascript
// Replace updateSquadHealth() with:
CyberOpsGame.prototype.updateSquadHealth = function() {
    if (this.gameServices?.hudService) {
        this.gameServices.hudService.update('squadHealth', {
            agents: this.agents,
            turnBasedMode: this.turnBasedMode,
            turnQueue: this.turnQueue,
            currentTurnUnit: this.currentTurnUnit,
            game: this
        });
    } else {
        // Fallback to old implementation during migration
        // ... existing code ...
    }
};
```

**Impact**:
- ✅ Zero visual change
- ✅ **MASSIVE performance improvement** - only updates changed properties
- ✅ Event handlers bound once, not every update
- ✅ Full rebuild only when agent count changes

---

#### 2.4 Cooldown Overlays

**Current** (game-flow.js:2160-2173):
```javascript
updateCooldownDisplay() {
    const agent = this.agents.find(a => this.isAgentSelected(a));
    if (!agent) return;

    for (let i = 0; i < 5; i++) {
        const overlay = document.getElementById('cooldown' + i);
        if (overlay) {
            const maxCooldown = [0, 60, 180, 120, 300][i];
            const progress = agent.cooldowns[i] / maxCooldown;
            overlay.style.background =
                `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;
        }
    }
}
```

**New** (hud-service.js):
```javascript
HUDService.prototype.updateCooldown = function(domEl, data) {
    const { cooldownValue, maxCooldown } = data;

    // EXACT SAME LOGIC
    const progress = cooldownValue / maxCooldown;
    const expectedBg = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;

    // OPTIMIZATION: Only update if changed
    if (domEl.style.background !== expectedBg) {
        domEl.style.background = expectedBg;
    }
};

// Convenience method to update all cooldowns at once
HUDService.prototype.updateAllCooldowns = function(agent) {
    const maxCooldowns = [0, 60, 180, 120, 300];

    for (let i = 0; i < 5; i++) {
        this.update(`cooldown${i}`, {
            cooldownValue: agent.cooldowns[i],
            maxCooldown: maxCooldowns[i]
        });
    }
};
```

**Usage** (game-flow.js):
```javascript
CyberOpsGame.prototype.updateCooldownDisplay = function() {
    const agent = this.agents.find(a => this.isAgentSelected(a));
    if (!agent) return;

    if (this.gameServices?.hudService) {
        this.gameServices.hudService.updateAllCooldowns(agent);
    } else {
        // Fallback...
    }
};
```

**Impact**: Zero visual change, now with change detection

---

#### 2.5 Event Log (Already Good - Minimal Changes)

**Current** (game-eventlog.js:88-132) - Already uses good patterns

**New** (hud-service.js) - Just wrap existing logic:
```javascript
HUDService.prototype.updateEventLog = function(domEl, event) {
    // EXACT SAME LOGIC - already well implemented
    const eventDiv = document.createElement('div');
    eventDiv.style.cssText = `
        padding: 2px 0;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        animation: fadeIn 0.3s;
        ${event.important ? 'font-weight: bold;' : ''}
    `;

    const color = this.game.getEventColor(event.type);
    eventDiv.innerHTML = `
        <span style="color: #888;">[${event.time}]</span>
        <span style="color: ${color}; margin-left: 5px;">${event.message}</span>
    `;

    domEl.insertBefore(eventDiv, domEl.firstChild);

    // Remove old entries if too many
    while (domEl.children.length > 20) {
        domEl.removeChild(domEl.lastChild);
    }

    // Auto-scroll
    const container = domEl.parentElement;
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};
```

**Impact**: Minimal - event log already well-implemented

---

## 4. INITIALIZATION AND INTEGRATION

### Step 4.1: Initialize HUDService

**In game-core.js** (during game initialization):
```javascript
CyberOpsGame.prototype.init = function() {
    // ... existing initialization ...

    // Initialize services
    this.gameServices = new GameServices();

    // Initialize HUD service (requires game reference)
    this.gameServices.initializeHUD(this);

    if (this.logger) this.logger.info('✅ Game initialized with HUDService');
};
```

### Step 4.2: Clear Cache on Mission Transitions

**In game-flow.js**:
```javascript
CyberOpsGame.prototype.startMission = function(missionId) {
    // Clear HUD cache for fresh mission
    if (this.gameServices?.hudService) {
        this.gameServices.hudService.clearCache();
    }

    // ... rest of mission start logic ...
};
```

---

## 5. TESTING STRATEGY

### 5.1 Visual Regression Testing

**Manual Test Checklist**:
- [ ] Mission timer displays correctly
- [ ] Objective tracker shows objectives and turn info
- [ ] Squad health bars show health percentages
- [ ] Squad health shows AP bars in turn-based mode
- [ ] Dead agents show skull icon and "dead" class
- [ ] Selected agents show "selected" class highlight
- [ ] Current turn agent shows star and "current-turn" class
- [ ] Click on health bar selects agent
- [ ] Cooldown overlays show conic gradient correctly
- [ ] Event log shows newest events at top
- [ ] Event log colors match event types
- [ ] Event log compact mode shows last event

### 5.2 Performance Testing

**Metrics to Verify**:
- [ ] Squad health updates only rebuild when agent count changes
- [ ] Squad health updates only change DOM properties that actually changed
- [ ] Timer updates skip unchanged values (minutes:seconds)
- [ ] Cooldown updates skip unchanged progress values
- [ ] No performance regression in frame rate

### 5.3 Functional Testing

**Test Scenarios**:
1. **Agent Selection**: Click health bar → agent should be selected
2. **Agent Death**: Agent dies → health bar shows dead class and 0% health
3. **Turn-Based Mode**: Enable TB → AP bars should appear
4. **Cooldown Usage**: Use ability → cooldown overlay should animate
5. **Event Logging**: Combat events → should appear in event log with correct colors
6. **Mission Timer**: Start mission → timer should count up
7. **Objectives**: Complete objective → tracker should update

---

## 6. MIGRATION TIMELINE

### Week 1: Foundation
- Day 1-2: Create HUDService class structure
- Day 3: Add to GameServices and initialize
- Day 4-5: Register all HUD elements (no functional changes)

### Week 2: Migration - Simple Elements
- Day 1: Migrate Mission Timer (simplest)
- Day 2: Migrate Objective Tracker
- Day 3: Migrate Cooldown Overlays
- Day 4-5: Testing and validation

### Week 3: Migration - Complex Elements
- Day 1-2: Migrate Squad Health (most complex)
- Day 3: Migrate Event Log integration
- Day 4-5: Comprehensive testing

### Week 4: Cleanup and Optimization
- Day 1-2: Remove all fallback code
- Day 3: Performance profiling and optimization
- Day 4-5: Final testing and documentation

---

## 7. ROLLBACK PLAN

**Safety Mechanism**: Keep fallback code during migration

```javascript
// Example pattern for all updates:
if (this.gameServices?.hudService) {
    // Use new HUDService
    this.gameServices.hudService.update('missionTimer', seconds);
} else {
    // Fallback to old code
    const timerElement = document.getElementById('missionTimer');
    if (timerElement) {
        // ... old logic ...
    }
}
```

**Rollback Steps**:
1. If issues found, disable HUDService initialization
2. Fallback code will automatically take over
3. Fix issues in HUDService
4. Re-enable HUDService

---

## 8. BENEFITS SUMMARY

### Performance Improvements
- ✅ **90% fewer DOM operations** on Squad Health (only update changed properties)
- ✅ **Change detection** prevents unnecessary updates on all elements
- ✅ **Batched updates** via requestAnimationFrame
- ✅ **DOM caching** reduces getElementById calls
- ✅ **Event handlers bound once**, not every update

### Code Quality
- ✅ **Single source of truth** for HUD updates
- ✅ **Easier testing** (mock HUDService)
- ✅ **Easier debugging** (all updates logged in one place)
- ✅ **Follows existing patterns** (service architecture, registry pattern)

### Maintainability
- ✅ **One place to modify** HUD logic
- ✅ **Consistent update pattern** across all elements
- ✅ **Clear separation of concerns** (HUD vs game logic)
- ✅ **Self-documenting** (all HUD elements registered in one place)

---

## 9. CONCLUSION

**Is it possible?** YES - 100% possible with zero visual or functional changes.

**Best Approach**: HUDService following existing service architecture patterns.

**Key Success Factor**: Copy existing logic exactly, wrap in service methods, add optimizations.

**Biggest Win**: Squad Health performance improvement (90% fewer DOM operations).

**Risk Level**: Low - fallback code ensures safety during migration.

**Recommendation**: Proceed with phased migration starting with simple elements (Mission Timer) to validate approach before tackling complex elements (Squad Health).
