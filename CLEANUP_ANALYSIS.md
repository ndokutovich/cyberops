# Cleanup Analysis - Code That Can Be Removed

## game-loop.js (1167 lines total)

### Can Remove (Already Migrated):
1. **gameLoop()** - Lines 3-6 - Empty stub, handled by GameController
2. **updateProjectilesOnly()** - Lines 10-12 - Empty stub, in GameFacade
3. **updateEffectsOnly()** - Lines 14-16 - Empty stub, in GameFacade
4. **update()** - Lines 90-642 - **552 LINES** - Fully migrated to GameFacade

### Must Keep (Still Used):
1. **updateFPS()** - Lines 19-29 - Still used for FPS counter
2. **isWalkable()** - Lines 32-63 - Used by pathfinding and collision
3. **canMoveTo()** - Lines 64-89 - Used by movement validation
4. **checkMissionStatus()** - Lines 643-664 - Used by mission system
5. **checkExtractionPoint()** - Lines 665-689 - Used by extraction logic
6. **endMission()** - Lines 690-777 - Used by mission completion
7. **handleCollectablePickup()** - Lines 849-948 - Used by item system
8. **handleCollectableEffects()** - Lines 949-1066 - Used by item effects
9. **setGameSpeed()** - Lines 1092-1101 - Used by speed control
10. **cycleGameSpeed()** - Lines 1102-1109 - Used by speed control
11. **checkAutoSlowdown()** - Lines 1110-1149 - Used by auto-slowdown
12. **isDoorBlocking()** - Lines 1150-1167 - Used by collision

**Total Removable: ~570 lines**

## game-rendering.js (1540 lines total)

### Can Remove (Already Migrated to GameEngine):
1. **render()** - Lines 119-527 - **408 LINES** - Fully migrated
2. **render2DBackgroundEffects()** - Lines 25-118 - **93 LINES** - Migrated
3. **renderMap()** - Lines 528-600 - **72 LINES** - Migrated
4. **renderFogOfWar()** - Lines 645-678 - **33 LINES** - Migrated
5. **renderDoor()** - Lines 679-714 - **35 LINES** - Migrated
6. **renderPath()** - Lines 715-768 - **53 LINES** - Migrated

### Must Keep (Still Referenced):
1. **init2DBackgroundEffects()** - Lines 2-24 - Initialization
2. **renderCover()** - Lines 601-622 - Called from engine
3. **renderTerminal()** - Lines 623-644 - Called from engine
4. **renderCollectable()** - Lines 769-868 - Called from legacy
5. **renderExtractionPoint()** - Lines 869-899 - Called from legacy
6. **renderAgent()** - Lines 900-985 - Called from legacy
7. **renderEnemy()** - Lines 986-1051 - Called from legacy
8. **renderProjectile()** - Lines 1052-1079 - Called from legacy
9. **renderEffect()** - Lines 1080-1158 - Called from legacy
10. **renderFPS()** - Lines 1159-1180 - UI element
11. **renderHotkeyHelp()** - Lines 1181-1229 - UI element
12. **renderMinimap()** - Lines 1230-1339 - UI element
13. **renderMarker()** - Lines 1340-1365 - Mission objects
14. **renderExplosiveTarget()** - Lines 1366-1397 - Mission objects
15. **renderAssassinationTarget()** - Lines 1398-1437 - Mission objects
16. **renderGate()** - Lines 1438-1482 - Mission objects
17. **renderSpeedIndicator()** - Lines 1483-1540 - UI element

**Total Removable: ~694 lines**

## Summary

### What We CAN Remove:
- **game-loop.js**: ~570 lines (mainly the huge update() method)
- **game-rendering.js**: ~694 lines (mainly render() and helper methods)
- **Total**: ~1264 lines of code

### What We MUST Keep:
- Helper functions (isWalkable, canMoveTo, isDoorBlocking)
- Mission-specific functions (checkMissionStatus, checkExtractionPoint, endMission)
- Item/collectable functions (handleCollectablePickup, handleCollectableEffects)
- Game speed functions (setGameSpeed, cycleGameSpeed, checkAutoSlowdown)
- Specialized render functions not yet migrated (enemies, agents, projectiles, effects, UI)
- FPS and UI rendering functions

### Recommendation:
1. Remove the migrated code from game-loop.js and game-rendering.js
2. Keep the files as they contain essential helper functions
3. Consider future migration of specialized render functions to GameEngine
4. Consider future migration of mission logic to MissionService

### Files That CANNOT Be Deleted:
- **game-loop.js** - Contains essential helper functions
- **game-rendering.js** - Contains specialized renderers still in use

### Next Steps:
1. Remove the identified migrated code blocks
2. Add clear comments indicating what's migrated vs what remains
3. Test thoroughly after removal
4. Consider future complete migration of remaining functions