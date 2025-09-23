# Mission System Complete Restoration

## 🔍 Analysis of Original System

### How It Was Supposed to Work

1. **Objective Display Format**
   - Objectives have `displayText` property: `"Hostiles eliminated: {current}/{required}"`
   - `OBJECTIVE_HANDLERS.getDisplayText()` replaces placeholders with actual values
   - Uses `game.missionTrackers[objective.tracker]` for current count
   - Shows in UI as: "Hostiles eliminated: 3/8"

2. **Mission Data Flow**
   ```
   Campaign File → convertToLegacyFormat() → this.missions[] → currentMissionDef
   ```

3. **Tracking System**
   - `missionTrackers` object stores counts (enemiesEliminated, terminalsHacked, etc.)
   - Updated when events happen (enemy killed, terminal hacked)
   - Used by `OBJECTIVE_HANDLERS` to check completion
   - Display system reads from these trackers

4. **NPC System**
   - NPCs defined in mission files
   - Loaded via `currentMissionDef.npcs`
   - Spawned by `spawnNPCs()` function

## ❌ What Broke

1. **MissionService Integration Issues**
   - Service was parsing objectives differently
   - Not preserving original `displayText` and `tracker` properties
   - `count` was at wrong level (should be top-level, not in target)

2. **Mission Definition Loading**
   - `currentMissionDef` wasn't getting full mission data
   - NPCs were missing because objectives were overwritten
   - Properties weren't being properly preserved

3. **Tracking Disconnect**
   - MissionService had its own tracking
   - Display system still needed `missionTrackers`
   - The two weren't synchronized

## ✅ Comprehensive Fix Applied

### 1. Fixed Mission Loading (`game-mission-integration.js`)
```javascript
// Ensure complete mission structure
if (this.currentMissionDef) {
    // Preserve objectives
    if (!this.currentMissionDef.objectives && mission && mission.objectives) {
        this.currentMissionDef.objectives = mission.objectives;
    }
    // Preserve NPCs
    if (!this.currentMissionDef.npcs && mission && mission.npcs) {
        this.currentMissionDef.npcs = mission.npcs;
    }
    // Preserve map data
    if (!this.currentMissionDef.map && mission && mission.map) {
        this.currentMissionDef.map = mission.map;
    }
}
```

### 2. Fixed Objective Parsing (`mission-service.js`)
```javascript
getObjectiveMaxProgress(objective) {
    // Check count at top level first (mission format)
    if (objective.count) {
        return objective.count;
    }
    // Then check in target
    if (objective.target) {
        return objective.target.count || objective.target.amount || 1;
    }
    return 1;
}
```

### 3. Synchronized Tracking Systems
- **Enemy Kills**: Updates both `missionTrackers.enemiesEliminated` AND `missionService.trackEvent()`
- **Terminal Hacks**: Updates both systems
- **Display**: Uses `missionTrackers` for display (preserves (1/8) format)
- **Completion**: MissionService checks completion logic

### 4. Fixed Objective State Management
```javascript
// Ensure objectives have required properties
this.currentMissionDef.objectives.forEach(obj => {
    if (obj.active === undefined) obj.active = true;
    if (obj.completed === undefined) obj.completed = false;
});
```

## 🎮 How It Works Now

### Mission Start Flow
1. Campaign file loads with full mission data
2. `initMissionUpdated()` sets `currentMissionDef` with ALL properties
3. MissionService starts with objectives
4. `missionTrackers` initialized for display
5. NPCs spawn from `currentMissionDef.npcs`
6. Objectives display with proper format

### During Mission
1. **Kill Enemy**:
   - `missionTrackers.enemiesEliminated++`
   - `missionService.trackEvent('enemyKilled')`
   - Display updates: "Hostiles eliminated: 1/8"

2. **Hack Terminal**:
   - `missionTrackers.terminalsHacked++`
   - `missionService.trackEvent('terminalHacked')`
   - Display updates accordingly

3. **Check Objectives**:
   - `OBJECTIVE_HANDLERS.checkComplete()` uses `missionTrackers`
   - `OBJECTIVE_HANDLERS.getDisplayText()` formats display
   - Shows: "Hostiles eliminated: 3/8" ✅

### Mission Complete
1. All required objectives complete
2. Extraction enables
3. Reach extraction point
4. Mission completes through both systems

## 📋 Verification Checklist

- ✅ Objectives show with count format (1/8)
- ✅ NPCs spawn on mission start
- ✅ Enemy kills tracked correctly
- ✅ Terminal hacks tracked correctly
- ✅ Mission completes when all objectives done
- ✅ Extraction enables properly
- ✅ J key shows mission list with objectives
- ✅ MissionService logs events

## 🔑 Key Insight

The system uses **dual tracking**:
- **MissionService**: For logic and state management
- **missionTrackers**: For display and legacy compatibility

Both must be kept in sync for the system to work correctly!

## 🎯 Result

All mission functionality has been restored:
- Objectives display with progress (1/8) ✅
- NPCs spawn correctly ✅
- Tracking works properly ✅
- Mission flow is complete ✅
- Both old and new systems work together ✅