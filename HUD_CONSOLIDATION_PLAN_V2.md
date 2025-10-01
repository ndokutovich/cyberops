# HUD Consolidation Plan V2 - Fail Fast & Screen-Based

## Executive Summary

**Philosophy Change**:
- ❌ No fallback code
- ✅ Fail fast if HUDService not available
- ✅ Move code, don't copy
- ✅ Screen-based HUD configuration (integrated with ScreenManager)

**Key Insight**: The ScreenManager already controls screen visibility. We can extend it to also control **which HUD elements are visible per screen**.

---

## 1. ARCHITECTURE OVERVIEW

### Current State
```
ScreenManager → Shows/hides screens (splash, menu, hub, game)
Game Code     → Manually shows/hides gameHUD
Game Code     → Manually updates HUD elements
```

### New State
```
ScreenManager → Shows/hides screens
              → Shows/hides HUD based on screen config ✨ NEW
HUDService    → Manages all HUD element updates ✨ NEW
              → Single source of truth for HUD
```

---

## 2. SCREEN-BASED HUD CONFIGURATION

### Add `hud` Property to Screen Config

**screen-config.js** - Add HUD configuration to each screen:

```javascript
const SCREEN_CONFIG = {
    'vendor-splash': {
        type: 'generated',
        background: '#000',
        hud: 'none',  // ✨ NEW: No HUD on splash
        // ... rest of config
    },

    'main-menu': {
        type: 'generated',
        hud: 'none',  // ✨ NEW: No HUD on menu
        // ... rest of config
    },

    'hub': {
        type: 'dom',
        elementId: 'hub',
        hud: 'none',  // ✨ NEW: Hub has its own UI, no game HUD
        // ... rest of config
    },

    'game': {
        type: 'canvas',
        hud: 'game-2d',  // ✨ NEW: Show 2D game HUD
        hudElements: [   // ✨ NEW: Which elements to show
            'missionTimer',
            'objectiveTracker',
            'squadHealth',
            'actionBar',
            'eventLog',
            'minimap',
            'teamCommands',
            'fogButton'
        ],
        // ... rest of config
    },

    'game-3d': {  // ✨ NEW: 3D mode as separate screen state
        type: 'canvas',
        hud: 'game-3d',
        hudElements: [
            'missionTimer',
            'objectiveTracker',
            'squadHealth',
            'actionBar',
            'eventLog',
            'minimap',
            'crosshair',
            'modeIndicator'
        ],
        // ... rest of config
    }
};
```

---

## 3. HUDSERVICE ARCHITECTURE (FAIL-FAST)

### File: `js/services/hud-service.js`

```javascript
/**
 * HUDService - Centralized HUD management
 * FAIL-FAST: No fallbacks, throws errors if not properly initialized
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

        // FAIL FAST: Element must be visible
        if (!this.visibleElements.has(elementId)) {
            if (this.logger) this.logger.warn(`Skipping update for hidden element: ${elementId}`);
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

        if (this.logger) this.logger.trace(`Updated HUD element: ${elementId}`);
    }

    /**
     * Set HUD mode and visibility - called by ScreenManager
     */
    setMode(mode, visibleElements = []) {
        if (this.logger) this.logger.info(`🎨 Setting HUD mode: ${mode}`);

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
     * Get DOM element with cache - FAIL FAST option
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
     * Data comparison for change detection
     */
    dataEquals(data1, data2) {
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
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HUDService;
}
```

---

## 4. INTEGRATE WITH SCREENMANAGER

### Modify `js/screen-manager.js`

**Add HUD control to screen navigation**:

```javascript
class ScreenManager {
    constructor() {
        // ... existing properties ...
        this.hudService = null; // ✨ NEW
    }

    init(game) {
        this.game = game;

        // ✨ NEW: Get HUDService reference
        this.hudService = game.gameServices?.hudService;
        if (!this.hudService) {
            throw new Error('ScreenManager requires HUDService');
        }

        // ... rest of init ...
    }

    enterScreen(screenId, config, params) {
        // ✨ NEW: Set HUD mode based on screen config
        if (config.hud !== undefined) {
            const hudMode = config.hud;
            const hudElements = config.hudElements || [];

            if (this.logger) logger.debug(`Setting HUD mode: ${hudMode} for screen: ${screenId}`);

            this.hudService.setMode(hudMode, hudElements);
        }

        // ... rest of existing enterScreen logic ...
    }

    // REMOVE all manual gameHUD.style.display code
    // showCanvasScreen() - remove gameHUD manipulation
    // hideCanvasScreen() - remove gameHUD manipulation
}
```

---

## 5. UPDATE FUNCTIONS - MOVE CODE (NOT COPY)

### 5.1 Mission Timer

**DELETE from `engine/game-facade.js:1324-1329`**:
```javascript
// DELETE THIS CODE:
const minutes = Math.floor(seconds / 60);
const timerElement = document.getElementById('missionTimer');
if (timerElement) {
    timerElement.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
```

**MOVE TO `hud-service.js`** as update function:
```javascript
HUDService.prototype.updateMissionTimer = function(domEl, seconds) {
    // MOVED CODE (exact same logic)
    const minutes = Math.floor(seconds / 60);
    domEl.textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};
```

**REPLACE in `engine/game-facade.js`** with single line:
```javascript
// Line 1324-1329 becomes:
game.gameServices.hudService.update('missionTimer', seconds);
```

---

### 5.2 Objective Tracker

**DELETE from `game-mission-executor.js:642-678`**:
```javascript
// DELETE THIS ENTIRE FUNCTION:
CyberOpsGame.prototype.updateObjectiveDisplay = function() {
    const tracker = document.getElementById('objectiveTracker');
    // ... ~40 lines of code ...
};
```

**MOVE TO `hud-service.js`**:
```javascript
HUDService.prototype.updateObjectiveTracker = function(domEl, data) {
    // MOVED CODE - exact same logic, just uses 'data' parameter
    let displayText = '';

    if (data.turnBasedMode) {
        let tbInfo = `[TB Mode] `;
        if (data.currentTurnUnit) {
            const unitName = data.currentTurnUnit.unit.name || `Agent ${data.currentTurnUnit.unit.id}`;
            tbInfo += `${unitName}'s Turn (${data.currentTurnUnit.ap}/${data.currentTurnUnit.maxAp} AP) | Round ${data.turnRound || 1} | `;
        }
        displayText += tbInfo;
    }

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

**REPLACE calls** with:
```javascript
// Wherever updateObjectiveDisplay() was called:
this.gameServices.hudService.update('objectiveTracker', {
    turnBasedMode: this.turnBasedMode,
    currentTurnUnit: this.currentTurnUnit,
    turnRound: this.turnRound,
    objectives: this.gameServices.missionService.objectives
});
```

---

### 5.3 Squad Health (BIGGEST CHANGE)

**DELETE from `game-flow.js:1057-1145`**:
```javascript
// DELETE THIS ENTIRE FUNCTION:
CyberOpsGame.prototype.updateSquadHealth = function() {
    // ... ~90 lines ...
};
```

**MOVE TO `hud-service.js`** with optimization:
```javascript
HUDService.prototype.updateSquadHealth = function(domEl, data) {
    const { agents, turnBasedMode, turnQueue, currentTurnUnit, game } = data;

    // Check if full rebuild needed
    const expectedBars = agents.length;
    const currentBars = domEl.children.length;

    if (currentBars !== expectedBars) {
        // MOVED CODE: Full rebuild (rare case)
        this._rebuildSquadHealth(domEl, data);
        return;
    }

    // OPTIMIZATION: Update in-place
    agents.forEach((agent, index) => {
        const bar = domEl.children[index];
        if (!bar) return;

        // Update only changed properties
        const expectedClasses = this._getAgentBarClasses(agent, game);
        if (bar.className !== expectedClasses) {
            bar.className = expectedClasses;
        }

        const healthPercent = agent.alive ?
            Math.max(0, (agent.health / agent.maxHealth) * 100) : 0;
        const healthFill = bar.querySelector('.health-fill');
        if (healthFill) {
            const expectedWidth = `${healthPercent}%`;
            if (healthFill.style.width !== expectedWidth) {
                healthFill.style.width = expectedWidth;
            }
        }

        // Update AP bar if needed
        if (turnBasedMode && agent.alive) {
            this._updateAPBar(bar, agent, turnQueue, currentTurnUnit);
        }
    });
};

HUDService.prototype._rebuildSquadHealth = function(domEl, data) {
    // MOVED CODE: Original rebuild logic (exact same)
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
    if (game.isAgentSelected(agent)) className += ' selected';
    if (game.currentTurnUnit?.unit === agent) className += ' current-turn';
    return className;
};

HUDService.prototype._updateAPBar = function(bar, agent, turnQueue, currentTurnUnit) {
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
};
```

**CREATE NEW wrapper function in `game-flow.js`**:
```javascript
// REPLACE old updateSquadHealth with simple wrapper:
CyberOpsGame.prototype.updateSquadHealth = function() {
    this.gameServices.hudService.update('squadHealth', {
        agents: this.agents,
        turnBasedMode: this.turnBasedMode,
        turnQueue: this.turnQueue,
        currentTurnUnit: this.currentTurnUnit,
        game: this
    });
};
```

---

### 5.4 Cooldown Overlays

**DELETE from `game-flow.js:2160-2173`**:
```javascript
// DELETE THIS FUNCTION:
CyberOpsGame.prototype.updateCooldownDisplay = function() {
    // ... cooldown logic ...
};
```

**MOVE TO `hud-service.js`**:
```javascript
HUDService.prototype.updateCooldown = function(domEl, data) {
    const { cooldownValue, maxCooldown } = data;
    const progress = cooldownValue / maxCooldown;
    const expectedBg = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;

    // Only update if changed
    if (domEl.style.background !== expectedBg) {
        domEl.style.background = expectedBg;
    }
};

// Helper for updating all cooldowns
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

**CREATE wrapper in `game-flow.js`**:
```javascript
CyberOpsGame.prototype.updateCooldownDisplay = function() {
    const agent = this.agents.find(a => this.isAgentSelected(a));
    if (!agent) return;
    this.gameServices.hudService.updateAllCooldowns(agent);
};
```

---

## 6. REGISTRATION - Add to HUDService

```javascript
HUDService.prototype.registerAllElements = function() {
    // Mission Timer
    this.register('missionTimer', this.updateMissionTimer);

    // Objective Tracker
    this.register('objectiveTracker', this.updateObjectiveTracker);

    // Squad Health
    this.register('squadHealth', this.updateSquadHealth);

    // Cooldown Overlays (5 buttons)
    for (let i = 0; i < 5; i++) {
        this.register(`cooldown${i}`, this.updateCooldown);
    }

    // Event Log (keep existing implementation)
    // No registration needed - already well-implemented in game-eventlog.js

    if (this.logger) this.logger.info(`✅ Registered ${this.elements.size} HUD elements`);
};
```

---

## 7. INITIALIZATION SEQUENCE

### File: `js/game-core.js`

```javascript
CyberOpsGame.prototype.init = function() {
    // ... existing initialization ...

    // Initialize GameServices
    this.gameServices = new GameServices();

    // ✨ NEW: Initialize HUDService FIRST (before ScreenManager needs it)
    this.gameServices.hudService = new HUDService(this);
    this.gameServices.hudService.registerAllElements();

    // Initialize ScreenManager (will use HUDService)
    window.screenManager = new ScreenManager();
    screenManager.init(this);

    if (this.logger) this.logger.info('✅ Game initialized with HUDService');
};
```

---

## 8. MIGRATION STEPS (FAIL-FAST, NO FALLBACKS)

### Phase 1: Create Infrastructure (Day 1)
1. Create `js/services/hud-service.js` with fail-fast HUDService class
2. Add to GameServices initialization
3. Register all HUD elements
4. Add `hud` property to all screens in `screen-config.js`
5. Integrate HUDService with ScreenManager

**Test**: Game should start, HUDService should initialize, no visual changes yet

### Phase 2: Migrate Simple Elements (Day 2)
1. **Mission Timer**:
   - MOVE update logic to `HUDService.updateMissionTimer`
   - DELETE old code from game-facade.js
   - REPLACE with `hudService.update('missionTimer', seconds)`
2. **Test**: Timer should work exactly as before

3. **Cooldown Overlays**:
   - MOVE update logic to `HUDService.updateCooldown`
   - DELETE old code from game-flow.js
   - REPLACE with `hudService.updateAllCooldowns(agent)`
4. **Test**: Cooldowns should work exactly as before

### Phase 3: Migrate Complex Elements (Day 3)
1. **Objective Tracker**:
   - MOVE update logic to `HUDService.updateObjectiveTracker`
   - DELETE old code from game-mission-executor.js
   - REPLACE with hudService.update call
2. **Test**: Objectives should display correctly

3. **Squad Health** (most complex):
   - MOVE update logic to `HUDService.updateSquadHealth`
   - ADD optimization for in-place updates
   - DELETE old code from game-flow.js
   - REPLACE with wrapper function
4. **Test**: Health bars should work, agent selection should work

### Phase 4: Screen-Based HUD Switching (Day 4)
1. Test HUD visibility on different screens:
   - Splash: no HUD ✓
   - Menu: no HUD ✓
   - Hub: no HUD ✓
   - Game: 2D HUD ✓
   - 3D Mode: 3D HUD ✓
2. Verify smooth transitions between screens

### Phase 5: Cleanup (Day 5)
1. Remove ALL manual `gameHUD.style.display` code
2. Remove ALL `getElementById` calls for HUD elements
3. Verify all HUD updates go through HUDService
4. Performance profiling

---

## 9. FAIL-FAST ERROR MESSAGES

**Clear, actionable errors**:

```javascript
// HUDService not initialized
throw new Error('HUDService requires game instance');

// Element not registered
throw new Error(`HUD element not registered: ${elementId}`);

// DOM element missing in game mode
throw new Error(`DOM element not found: ${elementId} (screen: ${this.game.currentScreen})`);

// Unknown HUD mode
throw new Error(`Unknown HUD mode: ${mode}`);

// ScreenManager missing HUDService
throw new Error('ScreenManager requires HUDService');
```

---

## 10. BENEFITS SUMMARY

### Philosophy Benefits
✅ **Fail Fast**: Errors caught immediately, not silently ignored
✅ **No Fallbacks**: Single code path, easier to reason about
✅ **Code Moved**: Original code deleted, not duplicated
✅ **Clear Ownership**: HUDService owns all HUD logic

### Integration Benefits
✅ **Screen-Based HUD**: Each screen declares its HUD needs
✅ **Automatic HUD Control**: ScreenManager handles HUD visibility
✅ **No Manual Control**: No more `gameHUD.style.display = ...` scattered everywhere
✅ **Declarative Config**: HUD requirements declared in screen config

### Performance Benefits
✅ **Change Detection**: Skip updates when data unchanged
✅ **In-Place Updates**: Squad health only updates changed properties (90% faster)
✅ **Event Handlers Once**: No re-binding handlers every update

### Code Quality Benefits
✅ **Single Source of Truth**: All HUD logic in HUDService
✅ **Centralized Updates**: All updates go through `.update()`
✅ **Clear Errors**: Fail-fast gives immediate, actionable feedback
✅ **Easier Testing**: Mock HUDService, test screen configs independently

---

## 11. EXAMPLE: SCREEN TRANSITION WITH HUD

```javascript
// OLD WAY (scattered code):
// In multiple files:
document.getElementById('gameHUD').style.display = 'block';
game.updateSquadHealth();
game.updateCooldownDisplay();
game.updateObjectiveDisplay();

// NEW WAY (declarative):
screenManager.navigateTo('game');
// ↓ ScreenManager reads config:
// {
//   hud: 'game-2d',
//   hudElements: ['missionTimer', 'squadHealth', ...]
// }
// ↓ Automatically calls:
hudService.setMode('game-2d', hudElements);
// ↓ HUD appears, ready for updates
```

---

## CONCLUSION

**Answer**: YES, absolutely possible!

**Best Approach**:
1. Create HUDService with fail-fast philosophy
2. Integrate HUD control with ScreenManager via `hud` config property
3. Move (not copy) update logic to HUDService
4. Delete old scattered code
5. Single code path, clear errors, better performance

**Timeline**: 5 days for complete migration with testing

**Risk**: Low - fail-fast errors catch issues immediately during development
