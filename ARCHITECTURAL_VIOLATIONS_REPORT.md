# Architectural Violations Report

**Date**: 2025-10-02
**Scope**: Complete codebase architectural analysis

## 🚨 CRITICAL VIOLATIONS

### 1. **REDUNDANT SYNC - EXTRACTION STATE** ⚠️ (Actually OK!)

**Location**: `game-mission-executor.js:630`

```javascript
// REDUNDANT: This line does nothing because extractionEnabled is a computed property
this.extractionEnabled = this.gameServices.missionService.extractionEnabled;
```

**Status**: NOT A VIOLATION - Computed property already exists!

**Found**: `game-core.js:737-748`
```javascript
Object.defineProperty(CyberOpsGame.prototype, 'extractionEnabled', {
    get: function() {
        return this.gameServices?.missionService?.extractionEnabled ?? false;
    },
    set: function(value) {
        this.gameServices.missionService.extractionEnabled = value;
    }
});
```

**Analysis**:
- ✅ Unidirectional: Assignment flows through setter to MissionService
- ✅ Single source: MissionService owns the value
- ⚠️ REDUNDANT: The sync line is unnecessary (setter makes it a no-op)

**Fix Required**: Delete redundant line (cleanup, not critical)
```javascript
// DELETE this line - it's redundant due to computed property
// this.extractionEnabled = this.gameServices.missionService.extractionEnabled;
```

---

### 2. **MISSION STATE RESTORE - ACTUALLY OK!** ✅ (via setters)

**Location**: `mission-state-service.js:140-193`

```javascript
// These look like direct mutations, but they go through computed property setters!
game.credits = this.snapshot.credits;
game.researchPoints = this.snapshot.researchPoints;
game.worldControl = this.snapshot.worldControl;
game.selectedAgents = [...this.snapshot.selectedAgents];
game.currentMissionIndex = this.snapshot.currentMissionIndex;
```

**Analysis**: NOT A VIOLATION!

**Why it's OK**:
- ✅ `game.credits = X` → setter → `ResourceService.set('credits', X)`
- ✅ `game.researchPoints = X` → setter → `ResourceService.set('researchPoints', X)`
- ✅ `game.selectedAgents = X` → setter → `AgentService.setSelectedAgents(X)`
- ✅ All assignments flow through computed property setters to services

**Computed Property Setters** (from game-core.js):
```javascript
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    set: function(value) {
        this.gameServices.resourceService.set('credits', value, 'direct assignment');
    }
});
```

**Conclusion**: The assignments LOOK like violations but are actually using the unidirectional computed property architecture! This is CORRECT.

---

### 3. **SYNC PATTERN - EQUIPMENT** ⚠️

**Location**: `game-rpg-integration.js:786-816`

```javascript
CyberOpsGame.prototype.syncEquipmentWithRPG = function() {
    // Syncing hub equipment TO RPG inventory
    this.weapons.forEach(weapon => {
        if (weapon.owned > 0) {
            const rpgWeapon = { ...weapon };
            this.inventoryManager.addItemToGlobalInventory(rpgWeapon);
        }
    });
}
```

**Problem**:
- Creates duplicate state: `game.weapons` AND `inventoryManager`
- Sync function called multiple times (init + mission start)
- Risk of desynchronization

**Impact**: Equipment might differ between hub and RPG inventory

**Fix Required**: Make ONE system the owner
```javascript
// EITHER:
// 1. Make InventoryService own ALL weapons, game.weapons becomes computed
// OR:
// 2. Remove RPG inventory duplication, use game.weapons directly
```

---

### 4. **FALLBACK PATTERN - RPG CONFIG** ⚠️

**Location**: `game-rpg-integration.js:8-20`

```javascript
CyberOpsGame.prototype.getRPGConfig = function() {
    if (window.ContentLoader) {
        const config = window.ContentLoader.getContent('rpgConfig');
        if (config) return config;
    }
    // Fallback to campaign config
    if (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
        return window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
    }
    // Return empty config if none found
    return {};
};
```

**Problem**:
- Violates fail-fast principle
- Returns empty config silently if not found
- Should throw error instead

**Impact**: Silent failures, hard to debug

**Fix Required**: Fail-fast
```javascript
CyberOpsGame.prototype.getRPGConfig = function() {
    if (window.ContentLoader) {
        const config = window.ContentLoader.getContent('rpgConfig');
        if (config) return config;
    }
    if (window.MAIN_CAMPAIGN_CONFIG?.rpgConfig) {
        return window.MAIN_CAMPAIGN_CONFIG.rpgConfig;
    }
    // FAIL FAST
    throw new Error('RPG config not found in ContentLoader or MAIN_CAMPAIGN_CONFIG');
};
```

---

### 5. **FALLBACK PATTERN - SERVICES** ⚠️

**Location**: `services/equipment-service.js:7`

```javascript
this.formulaService = formulaService || new FormulaService();
```

**Problem**:
- Creates fallback instance if not provided
- Violates fail-fast principle
- Could create duplicate service instances

**Impact**: Multiple formula service instances, inconsistent calculations

**Fix Required**: Fail-fast in constructor
```javascript
constructor(formulaService) {
    if (!formulaService) {
        throw new Error('EquipmentService requires FormulaService');
    }
    this.formulaService = formulaService;
}
```

---

### 6. **MASSIVE FALLBACK PATTERN - GAME STATE** ⚠️

**Location**: `services/game-state-service.js:61-121` (60+ fallback lines!)

```javascript
playTime: game.playTime || 0,
currentScreen: game.currentScreen || 'hub',
currentMission: game.currentMission || null,
completedMissions: game.completedMissions || [],
// ... 50+ more lines of || fallbacks
```

**Problem**:
- 60+ lines of soft fallbacks with `||`
- Hides missing data issues
- Violates fail-fast principle

**Impact**: Silent data loss, invalid saves accepted

**Fix Required**: Validate required fields
```javascript
captureState(game) {
    // Validate required fields first
    if (!game.agents) throw new Error('Invalid game state: missing agents');
    if (!game.credits === undefined) throw new Error('Invalid game state: missing credits');

    return {
        agents: game.agents,  // No fallback
        credits: game.credits,  // No fallback
        // Optional fields can use ?? for null/undefined
        playTime: game.playTime ?? 0
    };
}
```

---

## ⚠️ MODERATE VIOLATIONS

### 7. **CONTROLLER SYNC - ACCEPTABLE BUT WET** 🟡

**Location**: `game-controller.js:44-101`

```javascript
syncState() {
    // Sync UI state FROM game TO facade
    this.facade.currentScreen = game.currentScreen;
    this.facade.isPaused = game.isPaused;

    // Sync camera FROM engine TO game
    game.cameraX = this.engine.cameraX;
    game.cameraY = this.engine.cameraY;
    game.zoom = this.engine.zoom;
}
```

**Status**: ACCEPTABLE per architecture docs, but could be cleaner

**Reasoning**:
- Game loop needs this for transition coordination
- Only 2 properties synced from game (UI state)
- Camera sync is necessary for legacy compatibility

**Improvement Possible**: Use event system instead of polling
```javascript
// Instead of sync every frame, use events:
engine.on('cameraChange', (x, y, zoom) => {
    game.cameraX = x;
    game.cameraY = y;
    game.zoom = zoom;
});
```

---

### 8. **CONTENT LOADER MUTATION** 🟡

**Location**: `engine/content-loader.js:254`

```javascript
game.campaignEnemyTypes = this.currentCampaign.enemies;
```

**Problem**:
- ContentLoader directly mutating game property
- Should use service or provide via getter

**Impact**: Tight coupling between loader and game

**Fix Required**: Use computed property or service
```javascript
// In game-utils.js
Object.defineProperty(CyberOpsGame.prototype, 'campaignEnemyTypes', {
    get: function() {
        return window.ContentLoader?.getCurrentCampaign()?.enemies ?? [];
    }
});
```

---

## ✅ GOOD PATTERNS FOUND

### 1. **COMPUTED PROPERTIES WITH SETTERS - EXCELLENT** ✅✅✅

**Location**: `game-core.js:490-780` (16 computed properties!)

```javascript
// Resources flow through ResourceService
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    get: function() {
        return this.gameServices.resourceService.get('credits');
    },
    set: function(value) {
        this.gameServices.resourceService.set('credits', value, 'direct assignment');
    }
});

// Agents flow through AgentService
Object.defineProperty(CyberOpsGame.prototype, 'activeAgents', {
    get: function() {
        return this.gameServices?.agentService?.activeAgents ?? [];
    },
    set: function(agents) {
        if (this.gameServices?.agentService) {
            this.gameServices.agentService.setActiveAgents(agents);
        }
    }
});

// Mission data flows through MissionService
Object.defineProperty(CyberOpsGame.prototype, 'extractionEnabled', {
    get: function() {
        return this.gameServices?.missionService?.extractionEnabled ?? false;
    },
    set: function(value) {
        this.gameServices.missionService.extractionEnabled = value;
    }
});
```

**Properties with Computed Getters/Setters**:
1. `credits` → ResourceService
2. `researchPoints` → ResourceService
3. `worldControl` → ResourceService
4. `weapons` → InventoryService
5. `equipment` → InventoryService
6. `agentLoadouts` → InventoryService
7. `availableAgents` → AgentService
8. `activeAgents` → AgentService
9. `fallenAgents` → AgentService
10. `selectedAgents` → AgentService (with filtering)
11. `agents` → AgentService (computed from active + selected)
12. `completedMissions` → MissionService
13. `missionTrackers` → MissionService
14. `extractionEnabled` → MissionService
15. `currentMissionDef` → MissionService
16. `completedQuests` → Game state

**Why This Is EXCELLENT**:
- ✅ **100% Unidirectional**: All writes flow through setters to services
- ✅ **Backward Compatible**: `game.credits = 1000` still works
- ✅ **Single Source**: Services own the data, game proxies it
- ✅ **No Sync Needed**: Assignment automatically updates service
- ✅ **Fail-Safe**: Missing service returns safe defaults (0, [], false)

**This solves the "Extraction Bug" problem mentioned in CLAUDE.md!**

### 2. **HUDService - PERFECT** ✅

- Fail-fast constructor: `if (!game) throw new Error()`
- No fallbacks: `throw new Error('HUD element not registered')`
- Clean separation: HUD only touches DOM, not game state

### 3. **MissionService - SINGLE SOURCE** ✅

- Objectives tracked ONLY in MissionService
- No duplicate tracking
- Other code reads from service, doesn't store copies

### 4. **GameFacade - COMPUTED PROPERTIES** ✅

```javascript
get agents() { return this.legacyGame?.agents ?? []; }
get enemies() { return this.legacyGame?.enemies ?? []; }
```

- All properties computed from source
- No bidirectional sync
- Fail-fast with required legacyGame

---

## 📊 SUMMARY STATISTICS

### Violations by Severity

- 🚨 **CRITICAL** (Must Fix): 3
  - Sync patterns: 1 (equipment sync)
  - Fallback patterns: 2 (RPG config, service constructors)

- ⚠️ **MODERATE** (Should Fix): 3
  - Game state fallbacks: 1 (60+ fallback lines)
  - Controller sync: 1 (acceptable but improvable)
  - Content loader mutation: 1

- ✅ **NOT VIOLATIONS** (Misidentified): 2
  - Extraction sync: Redundant but harmless (uses computed property)
  - Mission state restore: Works correctly through setters

- ✅ **EXCELLENT PATTERNS** (Keep These): 4
  - **16 Computed Properties with Setters** (game-core.js) ⭐
  - HUDService architecture
  - MissionService single source
  - GameFacade computed properties

### Updated Violation Count

**Before Analysis**: Appeared to be 8 violations
**After Understanding Computed Properties**: Actually 6 violations (3 critical, 3 moderate)
**Misidentified as Violations**: 2 (working correctly via setters)

### Files with Most Violations

1. `game-state-service.js` - 60+ fallback lines
2. `mission-state-service.js` - Direct game mutation
3. `game-rpg-integration.js` - Sync patterns + fallbacks
4. `game-mission-executor.js` - Bidirectional sync
5. `equipment-service.js` - Fallback in constructor

---

## 🎯 PRIORITY FIX RECOMMENDATIONS

### High Priority (Fix First)

1. **Remove extraction state sync** - Easy fix, prevents future bugs
2. **MissionStateService restore through services** - Critical for clean architecture
3. **Fail-fast in service constructors** - Prevents silent failures

### Medium Priority

4. **Equipment sync pattern** - Requires design decision
5. **Game state fallbacks** - Needs validation layer
6. **ContentLoader mutation** - Use computed property

### Low Priority (Nice to Have)

7. **Controller sync to events** - Works but could be cleaner

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Quick Wins (1-2 hours)
- Add extractionEnabled computed property
- Remove extraction sync line
- Add fail-fast to service constructors

### Phase 2: Service Architecture (3-4 hours)
- Fix MissionStateService to restore through services
- Remove game property mutations from services
- Add proper validation to GameStateService

### Phase 3: Equipment System (4-6 hours)
- Design decision: Who owns equipment?
- Implement single source of truth
- Remove sync functions

### Phase 4: Cleanup (1-2 hours)
- Fix ContentLoader to use computed properties
- Document architecture patterns
- Add architectural tests

---

## 📝 ARCHITECTURAL PRINCIPLES CHECKLIST

From CLAUDE.md Core Principle #1:

- ✅ **Unidirectional Data Flow**: EXCELLENT (16 computed properties with setters!)
- ✅ **No Bidirectional Syncing**: GOOD (what looked like sync is actually setters)
- ✅ **Single Source of Truth**: EXCELLENT (services own data, game proxies)
- ⚠️ **Fail Fast**: PARTIAL (some fallbacks remain)
- ✅ **DRY**: GOOD (no major duplication)
- ⚠️ **No Sync Logic**: MOSTLY GOOD (only equipment sync remains)

**Score**: 4/6 principles fully adhered to, 2/6 partially adhered to

**Major Achievement**: The computed property architecture in `game-core.js` provides a nearly perfect unidirectional data flow implementation!

---

## 🎓 LESSONS LEARNED

1. **Computed Properties with Setters = Perfect Unidirectional Flow** ⭐
   - Allows backward-compatible syntax (`game.credits = 1000`)
   - All writes flow through setter to service
   - No sync needed - assignment automatically updates service
   - This is the IDEAL pattern for service integration

2. **Code Can LOOK Wrong But BE Right**
   - `game.credits = X` looks like direct mutation
   - But it actually calls setter → service
   - Need to understand the architecture before judging

3. **Fallbacks hide problems** instead of fixing them
   - 60+ `||` fallbacks in GameStateService
   - Should validate instead of providing defaults

4. **Equipment sync pattern** needs resolution
   - Duplicate state between systems
   - Need single owner decision

5. **Fail-fast** reveals issues during development, not production
   - Service constructors should require dependencies
   - Don't create fallback instances

---

## 🚀 NEXT STEPS

1. Review this report
2. Prioritize fixes based on impact
3. Implement Phase 1 quick wins
4. Create architectural tests to prevent regressions
5. Update CLAUDE.md with additional guidelines

