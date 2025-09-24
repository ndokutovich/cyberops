# Architecture Migration Plan

## Overview
Migrate from monolithic game structure to clean separation:
- **GameFacade**: Game logic (from game-loop.js)
- **GameEngine**: Rendering (from game-rendering.js)
- **Services**: State management (replace direct `this.*` access)

## Phase 1: Mapping References

### Common `this.*` to Service Mappings

| Old Reference | New Service Access |
|--------------|-------------------|
| `this.agents` | `this.legacyGame.agents` (temporary) / `this.services.agentService.getActiveAgents()` |
| `this.enemies` | `this.legacyGame.enemies` (temporary) |
| `this.projectiles` | `this.projectiles` (stays in facade) |
| `this.effects` | `this.effects` (stays in facade) |
| `this.map` | `this.currentMap` (facade property) |
| `this.gameServices` | `this.services` |
| `this.logger` | `this.logger` (already exists) |
| `this.missionTimer` | `this.missionTimer` (facade property) |
| `this._selectedAgent` | `this.selectedAgent` (facade property) |
| `this.is3DMode` | `this.legacyGame.is3DMode` (temporary) |
| `this.agentWaypoints` | `this.agentWaypoints` (facade property) |
| `this.updateFogOfWar()` | `this.legacyGame.updateFogOfWar()` (temporary) |
| `this.updateTeamAI()` | `this.legacyGame.updateTeamAI()` (temporary) |
| `this.updateNPCs()` | `this.legacyGame.updateNPCs()` (temporary) |
| `this.moveAgentWithPathfinding()` | `this.legacyGame.moveAgentWithPathfinding()` (temporary) |
| `this.canMoveTo()` | `this.legacyGame.canMoveTo()` (temporary) |
| `this.isWalkable()` | `this.legacyGame.isWalkable()` (temporary) |
| `this.handleCollectablePickup()` | `this.legacyGame.handleCollectablePickup()` (temporary) |
| `this.addNotification()` | `this.legacyGame.addNotification()` (temporary) |
| `this.playSound()` | `this.engine.playSFX()` |
| `this.updateSquadHealth()` | `this.legacyGame.updateSquadHealth()` (temporary) |
| `this.updateCooldownDisplay()` | `this.legacyGame.updateCooldownDisplay()` (temporary) |
| `this.checkMissionStatus()` | `this.legacyGame.checkMissionStatus()` (temporary) |
| `this.getStealthDetectionRange()` | `this.legacyGame.getStealthDetectionRange()` (temporary) |
| `this.onEnemyEliminated()` | `this.legacyGame.onEnemyEliminated()` (temporary) |
| `this.onEntityDeath()` | `this.legacyGame.onEntityDeath()` (temporary) |
| `this.logDeath()` | `this.legacyGame.logDeath()` (temporary) |
| `this.logCombatHit()` | `this.legacyGame.logCombatHit()` (temporary) |
| `this.logItemCollected()` | `this.legacyGame.logItemCollected()` (temporary) |

### Rendering References (for GameEngine)

| Old Reference | New Reference |
|--------------|--------------|
| `this.ctx` | `this.ctx` (engine has it) |
| `this.canvas` | `this.canvas` (engine has it) |
| `this.cameraX` | `this.cameraX` (engine has it) |
| `this.cameraY` | `this.cameraY` (engine has it) |
| `this.zoom` | `this.zoom` (engine has it) |
| `this.tileWidth` | `this.tileWidth` (engine has it) |
| `this.tileHeight` | `this.tileHeight` (engine has it) |
| `this.worldToIsometric()` | `this.worldToIsometric()` (engine has it) |
| `this.agents` | `this.facade.agents` |
| `this.enemies` | `this.facade.enemies` |
| `this.projectiles` | `this.facade.projectiles` |
| `this.effects` | `this.facade.effects` |
| `this.npcs` | `this.facade.npcs` |
| `this.map` | `this.facade.currentMap` |
| `this.fogEnabled` | `this.facade.fogEnabled` |
| `this.fogOfWar` | `this.facade.fogOfWar` |
| `this.turnBasedMode` | `this.facade.turnBasedMode` |
| `this.showPaths` | `this.facade.showPaths` |
| `this.debugMode` | `this.facade.debugMode` |
| `this.usePathfinding` | `this.facade.usePathfinding` |
| `this.agentWaypoints` | `this.facade.agentWaypoints` |
| `this.destinationIndicators` | `this.facade.destinationIndicators` |
| `this.squadSelectEffect` | `this.facade.squadSelectEffect` |
| `this.activeQuests` | `this.facade.activeQuests` |
| `this.npcActiveQuests` | `this.facade.npcActiveQuests` |
| `this.render2DBackgroundEffects()` | `this.render2DBackgroundEffects()` (move to engine) |
| `this.renderMap()` | `this.renderMap()` (move to engine) |
| `this.renderFogOfWar()` | `this.renderFogOfWar()` (move to engine) |
| `this.renderCover()` | `this.renderCover()` (move to engine) |
| `this.renderTerminal()` | `this.renderTerminal()` (move to engine) |
| `this.renderMarker()` | `this.legacyGame.renderMarker()` (temporary) |
| `this.renderExplosiveTarget()` | `this.legacyGame.renderExplosiveTarget()` (temporary) |
| `this.renderAssassinationTarget()` | `this.legacyGame.renderAssassinationTarget()` (temporary) |
| `this.renderGate()` | `this.legacyGame.renderGate()` (temporary) |
| `this.renderExtractionPoint()` | `this.legacyGame.renderExtractionPoint()` (temporary) |
| `this.renderDoor()` | `this.renderDoor()` (move to engine) |
| `this.renderCollectable()` | `this.legacyGame.renderCollectable()` (temporary) |
| `this.renderEnemy()` | `this.legacyGame.renderEnemy()` (temporary) |
| `this.renderNPCs()` | `this.legacyGame.renderNPCs()` (temporary) |
| `this.renderQuestHUD()` | `this.legacyGame.renderQuestHUD()` (temporary) |
| `this.renderAgent()` | `this.legacyGame.renderAgent()` (temporary) |
| `this.renderPath()` | `this.renderPath()` (move to engine) |
| `this.renderProjectile()` | `this.legacyGame.renderProjectile()` (temporary) |
| `this.renderEffect()` | `this.legacyGame.renderEffect()` (temporary) |
| `this.renderParticles()` | `this.legacyGame.renderParticles()` (temporary) |
| `this.drawTeamModeIndicators()` | `this.legacyGame.drawTeamModeIndicators()` (temporary) |
| `this.renderTurnBasedOverlay()` | `this.legacyGame.renderTurnBasedOverlay()` (temporary) |
| `this.renderScreenFlash()` | `this.legacyGame.renderScreenFlash()` (temporary) |
| `this.renderHotkeyHelp()` | `this.legacyGame.renderHotkeyHelp()` (temporary) |
| `this.renderSpeedIndicator()` | `this.legacyGame.renderSpeedIndicator()` (temporary) |
| `this.renderFPS()` | `this.legacyGame.renderFPS()` (temporary) |
| `this.renderMinimap()` | `this.legacyGame.renderMinimap()` (temporary) |
| `this.getScreenShakeOffset()` | `this.legacyGame.getScreenShakeOffset()` (temporary) |

## Phase 2: Method Migration

### 2.1 Move to GameFacade (from game-loop.js) ✅ COMPLETE
1. ✅ Copy `update()` method - 551 lines migrated
2. ✅ Add `legacyGame` parameter to constructor
3. ✅ Replace `this.*` with mappings above
4. ✅ Test update still works

Migrated methods:
- ✅ `update()` - Main update loop (551 lines) - FULLY MIGRATED
- ✅ Projectile updates integrated into update()
- ✅ Effect updates integrated into update()
- Helper methods still accessed via legacyGame (temporary)

### 2.2 Move to GameEngine (from game-rendering.js) ✅ COMPLETE
1. ✅ Copy `render()` method - 407 lines migrated
2. ✅ Add `facade` parameter to access game state
3. ✅ Replace `this.*` with mappings above
4. ✅ Test rendering still works

Migrated methods:
- ✅ `render()` - Main render (407 lines) - FULLY MIGRATED
- ✅ `render2DBackgroundEffects()` - Background particles and grid
- ✅ `renderMap()` - Map rendering with fog support
- ✅ `renderFogOfWar()` - Fog overlay rendering
- ✅ `renderMapElements()` - All map objects (terminals, doors, etc.)
- ✅ `renderCover()` - Cover object rendering
- ✅ `renderTerminal()` - Terminal rendering
- ✅ `renderDoor()` - Door rendering
- ✅ `renderEnemies()` - Enemy rendering with fog check
- ✅ `renderNPCs()` - NPC rendering (delegated)
- ✅ `renderAgents()` - Agent rendering with paths
- ✅ `renderPath()` - Pathfinding visualization
- ✅ `renderWaypoints()` - Shift-click waypoint rendering
- ✅ `renderDestinationIndicators()` - Movement target indicators
- ✅ `renderProjectiles()` - Projectile rendering
- ✅ `renderEffects()` - Visual effect rendering
- ✅ `worldToIsometric()` - Coordinate conversion
- ✅ `shouldRenderInFog()` - Fog visibility check
- Other render methods delegated to legacy (temporary)

## Phase 3: Integration ✅ COMPLETE

### 3.1 Update GameController ✅ COMPLETE
1. ✅ Changed `update()` to call `this.facade.update()`
2. ✅ Changed `render()` to call `this.engine.render()`
3. ✅ Passed necessary references between engine and facade

### 3.2 State Synchronization
- GameController still syncs state initially
- But actual updates happen in new architecture
- Gradually remove sync as we migrate more

## Phase 4: Cleanup

### 4.1 Remove Old Code
1. Delete stubbed methods from game-loop.js
2. Delete moved methods from game-rendering.js
3. Remove duplicate state variables
4. Update all references to use new architecture

### 4.2 Testing Points
After each phase:
- [ ] Game loads without errors
- [ ] Agents can move
- [ ] Enemies update properly
- [ ] Projectiles work
- [ ] Rendering is correct
- [ ] No console errors

## Migration Order

1. **Start with GameFacade.update()** - Get logic working
2. **Then GameEngine.render()** - Get rendering working
3. **Fix integration issues** - Make them work together
4. **Remove old code** - Clean up

## Key Principle
Use `this.legacyGame.*` as a temporary bridge. This allows incremental migration without breaking everything at once. Later we can move these methods properly into the new architecture.

## Success Metrics ✅ ACHIEVED
- ✅ Lines moved from game-loop.js to GameFacade: **551 lines**
- ✅ Lines moved from game-rendering.js to GameEngine: **~800 lines** (407 main + helpers)
- ✅ Total lines migrated: **~1350 lines**
- ✅ New architecture actually doing the work: **YES**

## Migration Summary

### GameFacade (Game Logic)
- **551 lines** of update logic migrated
- All entity arrays owned by facade
- All game state managed by facade
- Temporary delegation to legacy for helper methods

### GameEngine (Rendering)
- **~800 lines** of rendering logic migrated
- Full main render method (407 lines)
- All essential render helpers
- Background effects system
- Fog of war system
- Path and waypoint visualization
- Complete entity rendering

### Architecture Benefits
1. **Clean Separation**: Logic (WHAT) vs Rendering (HOW)
2. **Incremental Migration**: Using legacyGame as bridge
3. **No Breaking Changes**: Game still works during migration
4. **Service-Oriented**: Ready for full service integration
5. **Maintainable**: Clear responsibilities for each layer