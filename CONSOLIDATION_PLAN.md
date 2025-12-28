# Code Consolidation Plan

## Overview

Analysis completed: 2025-12-28
Total candidates: 7
Estimated lines to consolidate: ~2,500+

---

## HIGH PRIORITY

### 1. CoordinateService (NEW)

**Problem**: Coordinate transformation logic duplicated across 9 files with slight variations.

**Files Affected**:
- `js/game-flow.js` - worldToIsometric, screenToWorld
- `js/engine/game-engine.js` - Multiple implementations
- `js/engine/game-controller.js` - screenToWorldX/Y methods
- `js/game-turnbased-render.js` - Post-restore coordinate handling
- `js/game-events.js` - screenToWorld methods
- `js/game-visual-effects.js` - Position calculations
- `js/game-teamcommands.js` - Formation calculations
- `js/game-3d.js` - 3D world conversion
- `js/game-rendering.js` - Isometric conversions

**Estimated Code**: ~300-400 lines

**Solution**: Create `js/services/coordinate-service.js`
- Single source of truth for all coordinate conversions
- Handles camera offset logic automatically
- Prevents coordinate system bugs in turn-based overlays

**Status**: [x] COMPLETED (2025-12-28)
- Created js/services/coordinate-service.js
- Registered in GameServices
- Updated game-events.js to delegate
- Updated game-engine.js to delegate

---

### 2. MissionService Expansion (EXISTING)

**Problem**: Objective checking methods scattered in mission-executor instead of MissionService.

**Files Affected**:
- `js/services/mission-service.js` - Primary tracking (expand this)
- `js/game-mission-executor.js` - checkMissionObjectives, checkStealthObjective, checkMainframeCaptured, checkNoCivilianCasualties, checkAgentsAlive
- `js/game-screens.js` - gatherMissionSummary duplicates queries

**Estimated Code**: ~350+ lines

**Solution**: Move all objective checking to MissionService
- Generic objective validator
- Eliminate scattered check* methods
- Single query interface for mission summary

**Status**: [x] COMPLETED (2025-12-28)
- Added validator registry to MissionService
- Added built-in validators (stealth, mainframeCaptured, noCivilianCasualties, agentsAlive, timeLimit, allEnemiesEliminated)
- Added registerValidator(), evaluateCustomObjective(), evaluateAllCustomObjectives()
- Updated game-mission-executor.js to use service validators
- Removed old check* methods from game-mission-executor.js

---

### 3. DialogStateService (NEW)

**Problem**: Dialog navigation scattered across 26+ files with multiple fallback patterns.

**Files Affected**:
- `js/game-dialogs.js` - Old imperative methods
- `js/game-hub.js` - showSyndicateHub, updateHubStats
- `js/game-screens.js` - showIntermissionDialog
- `js/game-equipment.js` - closeEquipmentDialog, refreshEquipmentUI with fallbacks
- `js/game-npc.js` - showHUD, showDialog
- `js/modal-engine.js` - Legacy modal system
- `js/dialog-integration.js` - Generator functions
- `js/game-rpg-ui.js` - Character sheet display

**Estimated Code**: ~350+ lines

**Solution**: Create `js/services/dialog-state-service.js`
- Centralized dialog navigation
- Single interface (no more fallback checks)
- Automatic state persistence

**Status**: [x] COMPLETED (2025-12-28)
- Created js/services/dialog-state-service.js
- Registered in GameServices
- Added navigateTo(), back(), close(), closeAll()
- Added convenience methods (showSettings, showCharacter, showInventory, etc.)

**Caller Migration Status**:
- [x] game-equipment.js - refreshEquipmentUI (6 locations) - COMPLETE
- [x] game-settings.js - resetKeyBinding, applySettings (4 locations) - COMPLETE
- [x] game-rpg-integration.js - XP gain character refresh (1 location) - COMPLETE
- [x] game-rpg-ui.js - ALL usages (15+ locations) - COMPLETE
- [x] dialog-integration.js - rosterClickAction, saveLoadUI (2 locations) - COMPLETE
- [x] game-hub.js - 14 usages - COMPLETE (2025-12-28)
- [x] game-flow.js - 8 usages - COMPLETE (2025-12-28)
- [x] game-keyboard.js - 4 usages - COMPLETE (2025-12-28)
- [x] game-saveload.js - 4 usages - COMPLETE (2025-12-28)
- [x] game-dialogs.js - 2 usages - COMPLETE (2025-12-28)
- [x] game-screens.js - 7 usages - COMPLETE (2025-12-28)
- [x] game-npc.js - 4 usages - COMPLETE (2025-12-28)
- [x] game-mission-executor.js - 1 usage - COMPLETE (2025-12-28)
- [x] game-utils.js - 3 usages - COMPLETE (2025-12-28)

**Remaining dialogEngine usages (expected - infrastructure)**:
- dialog-integration.js (44) - Integration adapter, must use dialogEngine
- declarative-dialog-engine.js (5) - The engine itself
- services/dialog-state-service.js (3) - Wrapper service
- screen-manager.js (12) - Screen infrastructure
- screen-config.js (7) - Configuration
- cutscene-engine.js (2), cutscene-integration.js (2) - Cutscene system
- modal-engine.js (1) - Cross-reference
- test-framework.js (2) - Testing

**Fallbacks Eliminated**:
- [x] CoordinateService fallbacks removed (game-events.js, game-engine.js)
- [x] MissionService window function fallback removed
- [x] DialogEngine fallback patterns replaced with DialogStateService
- [x] ALL game files migrated to use DialogStateService (2025-12-28)

---

## MEDIUM PRIORITY

### 4. EquipmentService Consolidation (EXISTING)

**Problem**: Initialization spread across 5 files; agentLoadouts manually managed alongside service.

**Files Affected**:
- `js/game-equipment.js` - initializeEquipmentSystem, agentLoadouts
- `js/game-hub.js` - Equipment panel updates
- `js/game-core.js` - Initial equipment setup
- `js/game-flow.js` - Equipment init in campaign start
- `js/services/equipment-service.js` - Exists but underutilized

**Estimated Code**: ~330+ lines

**Solution**: Move all initialization to EquipmentService, remove manual tracking

**Status**: [ ] Not Started

---

### 5. NPCService (NEW)

**Problem**: NPC lifecycle split between game-npc.js (1,469 lines) and quest-service.js.

**Files Affected**:
- `js/game-npc.js` - 30+ methods mixing rendering and state
- `js/services/quest-service.js` - Separate quest tracking
- `js/game-mission-executor.js` - NPC interaction
- `js/game-flow.js` - NPC spawning

**Estimated Code**: ~750+ lines

**Solution**: Create NPCService for lifecycle; game-npc.js becomes rendering-only

**Status**: [ ] Not Started

---

### 6. MissionSetupService (NEW)

**Problem**: Entity spawning fragmented across multiple files.

**Files Affected**:
- `js/game-mission-executor.js` - setupMissionEnemies, spawnMissionNPCs
- `js/game-flow.js` - Multiple spawn calls
- `js/game-core.js` - Initial agent setup

**Estimated Code**: ~100+ lines

**Solution**: Centralize mission entity initialization

**Status**: [ ] Not Started

---

### 7. HubStateService (NEW)

**Problem**: updateHubStats is 100+ lines of direct DOM manipulation for computed values.

**Files Affected**:
- `js/game-hub.js` - showSyndicateHub, updateHubStats
- `js/game-flow.js` - Hub navigation
- `js/screen-manager.js` - Hub screen routing

**Estimated Code**: ~200+ lines

**Solution**: Convert to computed properties/reactive state

**Status**: [ ] Not Started

---

## Progress Tracking

| Task | Status | Date | Lines Changed |
|------|--------|------|---------------|
| AudioService | DONE | 2025-12-28 | -415 (wrappers removed) |
| CoordinateService | DONE | 2025-12-28 | +280 (new service) |
| MissionService Expansion | DONE | 2025-12-28 | +120 (validators), -20 (old checks) |
| DialogStateService | DONE | 2025-12-28 | +340 (service), +60 (migration) |
| DialogStateService Migration | DONE | 2025-12-28 | 14 files, ~55 usages migrated |
| EquipmentService | - | - | - |
| NPCService | - | - | - |
| MissionSetupService | - | - | - |
| HubStateService | - | - | - |
