# HUD Service Verification Guide

## How to Verify New HUD System is Working

### 1. Check Browser Console for HUD Logs

When the game starts, you should see:
```
✅ HUDService initialized and registered
✅ Registered 10 HUD elements
```

When you navigate to the game screen:
```
🎨 Setting HUD mode: game-2d, elements: 8
```

During gameplay, you'll see frequent updates:
```
🎨 HUDService updated: missionTimer
🎨 HUDService updated: squadHealth
🎨 HUDService updated: objectiveTracker
🎨 HUDService updated: cooldown0
```

### 2. Old vs New Code Comparison

#### OLD CODE (Removed):
- **Mission Timer**: Direct DOM manipulation in `game-facade.js:1325-1329` ❌ DELETED
- **Squad Health**: Full rebuild every frame in `game-flow.js:1057-1145` ❌ DELETED (88 lines)
- **Cooldown Overlays**: Direct style updates in `game-flow.js:2160-2173` ❌ DELETED
- **Objective Tracker**: Direct textContent in `game-mission-executor.js:642-696` ❌ DELETED

#### NEW CODE (Active):
- **All HUD Updates**: Through `HUDService.update()` ✅ ACTIVE
- **Screen-Based Control**: `ScreenManager` calls `hudService.setMode()` ✅ ACTIVE
- **Change Detection**: Updates skipped if data unchanged ✅ ACTIVE
- **Optimized Rendering**: Squad health updates in-place, not full rebuild ✅ ACTIVE

### 3. Code Search Verification

Run these searches to confirm old code is gone:

```bash
# Should find ZERO results (except in HUDService itself):
grep -r "getElementById('missionTimer')" js/ --exclude-dir=services
grep -r "getElementById('squadHealth')" js/ --exclude-dir=services
grep -r "getElementById('objectiveTracker')" js/ --exclude-dir=services
grep -r "getElementById('cooldown" js/ --exclude-dir=services
```

### 4. Visual Verification in Game

1. **Start a Mission**: HUD should appear (Mission Timer, Squad Health, Objectives)
2. **Mission Timer**: Should count up (00:00, 00:01, 00:02...)
3. **Squad Health Bars**: Should update when agents take damage
4. **Select Agents**: Health bar should highlight when selected
5. **Use Abilities**: Cooldown overlays should show conic gradient
6. **Complete Objectives**: Objective tracker should update with ✅

### 5. Performance Check

**OLD SYSTEM** (before):
- Squad Health: Full DOM rebuild every frame (~60 times/second)
- No change detection: Updated even when nothing changed

**NEW SYSTEM** (now):
- Squad Health: In-place updates only when changed
- Change detection: Skips updates if data identical
- Expected: Smoother performance, less DOM thrashing

### 6. Screen Navigation Test

1. Go to Main Menu → HUD should be hidden
2. Go to Hub → HUD should be hidden
3. Start Mission → HUD should show (game-2d mode)
4. Open Pause Menu → HUD should stay visible
5. Return to Hub → HUD should hide again

Check console for mode changes:
```
🎨 Setting HUD mode: none, elements: 0
🎨 Setting HUD mode: game-2d, elements: 8
```

### 7. Architecture Verification

Check that HUDService is properly integrated:

```javascript
// In browser console:
game.gameServices.hudService  // Should exist
game.gameServices.hudService.elements.size  // Should be 10
game.gameServices.hudService.currentMode  // Should be 'game-2d' or 'none'
game.gameServices.hudService.visibleElements  // Should be Set with element IDs
```

### 8. Fail-Fast Verification

The new system should throw clear errors if misconfigured:

- HUD configured but service not initialized → Clear error message
- Element not registered → "HUD element not registered" error
- Missing DOM element in game mode → "DOM element not found" error

## Summary

✅ **New HUD is working if:**
- You see HUD logs in console
- HUD appears/disappears based on screen
- Performance is smooth
- No old DOM manipulation code found

❌ **Old HUD would show:**
- No HUD service logs
- Manual `getElementById` + `textContent` updates
- Full squad health rebuilds
- Performance stutters
