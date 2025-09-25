# Bidirectional Data Flow Investigation

## Executive Summary

This investigation identifies **10 major areas** where bidirectional data flows create architectural problems in the CyberOps game codebase. These issues cause state desynchronization, race conditions, and bugs like the extraction point not enabling properly.

## Critical Finding

The codebase extensively uses **bidirectional syncing** instead of **single source of truth** patterns, leading to:
- State inconsistencies
- Race conditions
- Difficult-to-debug issues
- Maintenance complexity

## Identified Bidirectional Flows

### 1. 🔴 CRITICAL: Mission Objectives (HIGH IMPACT)

**Current State:**
- Stored in `MissionService.objectives`
- Duplicated in `game.currentMissionDef.objectives`
- Synced bidirectionally in `game-mission-integration.js`

**Problems:**
- Updates to one don't always propagate to the other
- Race conditions during objective completion
- Extraction state depends on both sources

**Files Affected:**
- `js/services/mission-service.js`
- `js/game-mission-integration.js`
- `js/game-mission-executor.js`

**Recommended Fix:**
```javascript
// Single source: MissionService
get objectives() {
    return this.gameServices.missionService.objectives;
}
```

### 2. 🔴 CRITICAL: Extraction Enabled State (HIGH IMPACT)

**Current State:**
- `MissionService.extractionEnabled`
- `game.extractionEnabled`
- `GameFacade.extractionEnabled`
- Complex bidirectional syncing between all three

**Problems:**
- State desynchronization causing extraction failures
- Multiple update paths create race conditions
- Visual indicator doesn't match logical state

**Files Affected:**
- `js/services/mission-service.js` (lines 266-276)
- `js/engine/game-facade.js` (lines 1174-1187)
- `js/game-mission-executor.js`

**Status:** ✅ FIXED - Now uses computed property pattern

### 3. 🟡 MEDIUM: Current Mission Definition

**Current State:**
- `game.currentMissionDef`
- `MissionService.currentMission`
- `GameFacade.currentMissionDef`

**Problems:**
- Three copies of same data
- Updates not consistently propagated
- Mission data can become stale

**Files Affected:**
- `js/game-mission-integration.js`
- `js/services/mission-service.js`
- `js/engine/game-facade.js`

**Recommended Fix:**
```javascript
// Single source: MissionService
get currentMissionDef() {
    return this.gameServices.missionService.currentMission;
}
```

### 4. 🟡 MEDIUM: Agent Loadouts & Inventory

**Current State:**
- `game.agentLoadouts`
- `RPGService.inventoryManager`
- `InventoryService`
- Complex multi-way syncing

**Problems:**
- Equipment changes don't always sync
- Inventory counts become inconsistent
- Multiple update paths cause conflicts

**Files Affected:**
- `js/game-equipment.js`
- `js/services/rpg-service.js`
- `js/services/inventory-service.js`

**Recommended Fix:**
Single source in InventoryService with computed getters elsewhere

### 5. 🟡 MEDIUM: Map State

**Current State:**
- `game.map`
- `GameFacade.map`
- Bidirectional sync on mission start

**Problems:**
- Map modifications may not sync
- Door states, terminal states can desync
- Dynamic map changes lost

**Files Affected:**
- `js/engine/game-facade.js` (lines 1142-1155)
- `js/game-mission-integration.js`

### 6. 🟢 LOW: Game Speed

**Current State:**
- `game.gameSpeed`
- `GameFacade.gameSpeed`
- Both can be modified independently

**Problems:**
- Speed changes may not propagate
- UI may show wrong speed

**Files Affected:**
- `js/engine/game-facade.js`
- `js/game-loop.js`

### 7. 🟢 LOW: Turn-Based Mode State

**Current State:**
- `game.turnBasedMode`
- `GameFacade.turnBasedMode`
- Synced on toggle

**Problems:**
- State can desync if toggled rapidly
- UI state may not match game state

**Files Affected:**
- `js/game-turnbased.js`
- `js/engine/game-facade.js`

### 8. 🟢 LOW: Agents in Mission

**Current State:**
- `game.agents`
- `GameFacade.agents`
- Synced at mission start

**Problems:**
- Agent state changes may not sync
- Health/position updates can be lost

**Files Affected:**
- `js/engine/game-facade.js`
- `js/game-flow.js`

### 9. 🔴 CRITICAL: Mission Trackers (HIGH IMPACT)

**Current State:**
```javascript
// Multiple tracking locations:
MissionService.trackers = {
    enemiesEliminated: 0,
    terminalsHacked: 0,
    itemsCollected: 0
};

// Also tracked in:
game.missionTrackers = { /* same data */ };
```

**Problems:**
- Duplicate tracking causes count mismatches
- Objective completion checks use different sources
- Race conditions in updates

**Files Affected:**
- `js/services/mission-service.js`
- `js/game-mission-executor.js`

### 10. 🟡 MEDIUM: Active/Selected Agents

**Current State:**
- `game.activeAgents`
- `AgentService.activeAgents`
- `GameFacade` references both

**Problems:**
- Agent selection state can desync
- Active agent list inconsistencies

**Files Affected:**
- `js/services/agent-service.js`
- `js/engine/game-facade.js`

## Impact Analysis

### High Impact (Fix First)
1. **Mission Objectives** - Causes mission completion failures
2. **Extraction State** - ✅ Already fixed
3. **Mission Trackers** - Causes objective tracking failures

### Medium Impact (Fix Next)
4. **Current Mission Definition** - Causes stale mission data
5. **Agent Loadouts** - Causes equipment inconsistencies
6. **Map State** - Causes dynamic map issues

### Low Impact (Fix Later)
7. **Game Speed** - Minor UI issues
8. **Turn-Based Mode** - Rare desync issues
9. **Agents in Mission** - Minor state issues
10. **Active Agents** - Selection issues

## Recommended Architecture Pattern

### Single Source of Truth Pattern

```javascript
class ServiceLayer {
    // Services own their data
    missionService = { objectives: [], extractionEnabled: false };
    agentService = { agents: [], activeAgents: [] };
    inventoryService = { loadouts: {}, inventory: {} };
}

class GameFacade {
    // Facade uses computed properties (getters)
    get objectives() {
        return this.services.missionService.objectives;
    }

    get extractionEnabled() {
        return this.services.missionService.extractionEnabled;
    }

    // No local state storage for service-owned data
    // No bidirectional syncing
}

class Game {
    // Legacy compatibility layer
    get objectives() {
        return this.facade.objectives;
    }
}
```

### Benefits of Single Source Pattern
1. **No sync needed** - Data exists in one place
2. **No race conditions** - Single update path
3. **Easier debugging** - Clear data flow
4. **Better performance** - No sync overhead
5. **Cleaner architecture** - Clear ownership

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
- [x] Extraction state (COMPLETED)
- [ ] Mission objectives
- [ ] Mission trackers

### Phase 2: Medium Priority (Next Sprint)
- [ ] Current mission definition
- [ ] Agent loadouts/inventory
- [ ] Map state

### Phase 3: Low Priority (Future)
- [ ] Game speed
- [ ] Turn-based mode
- [ ] Agents in mission
- [ ] Active agents

## Code Examples

### Before (Bidirectional)
```javascript
// Multiple sources of truth
class MissionService {
    enableExtraction() {
        this.extractionEnabled = true;
        // Sync to game
        if (window.game) {
            window.game.extractionEnabled = true;
        }
        // Sync to facade
        if (window.GameFacade) {
            window.GameFacade.extractionEnabled = true;
        }
    }
}
```

### After (Single Source)
```javascript
// Single source of truth
class MissionService {
    enableExtraction() {
        this.extractionEnabled = true;
        // That's it! No syncing needed
    }
}

class GameFacade {
    // Computed property reads from source
    get extractionEnabled() {
        return this.services.missionService.extractionEnabled;
    }
}
```

## Testing Strategy

### Unit Tests Needed
```javascript
describe('Single Source of Truth', () => {
    it('should have no bidirectional references', () => {
        // Services should not reference game or facade
        expect(MissionService.prototype.game).toBeUndefined();
        expect(MissionService.prototype.facade).toBeUndefined();
    });

    it('should use computed properties in facade', () => {
        const facade = new GameFacade();
        facade.services.missionService.extractionEnabled = true;
        expect(facade.extractionEnabled).toBe(true);
    });
});
```

## Migration Guide

### Step 1: Identify Bidirectional Flow
```javascript
// Look for patterns like:
this.game.someProperty = value;
this.facade.someProperty = value;
window.game.someProperty = value;
```

### Step 2: Choose Single Source
Decide which component should own the data:
- Services own business logic data
- UI components own UI state
- Game owns game loop state

### Step 3: Convert to Computed Properties
```javascript
// Replace stored properties with getters
get property() {
    return this.service.property;
}
```

### Step 4: Remove Sync Code
Delete all bidirectional syncing logic

### Step 5: Test Thoroughly
Verify no state desync issues remain

## Conclusion

The extraction point bug was a symptom of a larger architectural problem: **extensive bidirectional data flows** throughout the codebase. By refactoring to a **single source of truth** pattern with computed properties, we can eliminate entire classes of bugs and make the codebase more maintainable.

The successful fix of the extraction state issue proves this approach works. Applying the same pattern to the other 9 identified areas will significantly improve code quality and reliability.

## Next Steps

1. **Immediate**: Fix mission objectives and trackers (HIGH impact)
2. **Short-term**: Refactor medium-impact bidirectional flows
3. **Long-term**: Establish coding standards requiring single source of truth
4. **Documentation**: Update CLAUDE.md with architectural patterns to follow

---

*Investigation completed: 2025-09-25*
*Extraction state issue: FIXED ✅*
*Remaining issues: 9 identified, prioritized for fixing*