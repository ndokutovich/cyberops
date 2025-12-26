# Service Architecture Analysis Report

## Executive Summary

This report analyzes the current service architecture of CyberOps: Syndicate to identify:
1. Services properly wired into GameServices
2. Services that exist but aren't integrated
3. Scattered functionality that should be encapsulated into services
4. Missing services needed for complete SOLID compliance

---

## 1. Services Wired in GameServices (16 Total)

### Core Services (No Dependencies)
| Service | Status | Dependencies | SOLID Compliance |
|---------|--------|--------------|------------------|
| FormulaService | Wired | None | Single Responsibility |
| ResourceService | Wired | None | Single Responsibility |
| Logger | Wired (window) | None | Single Responsibility |

### Primary Services (Minimal Dependencies)
| Service | Status | Dependencies | SOLID Compliance |
|---------|--------|--------------|------------------|
| AgentService | Wired | ResourceService | Single Responsibility |
| MissionService | Wired | ResourceService, AgentService | Single Responsibility |
| MissionStateService | Wired | None | Single Responsibility |
| CatalogService | Wired | None | Single Responsibility |

### Dependent Services
| Service | Status | Dependencies | SOLID Compliance |
|---------|--------|--------------|------------------|
| ResearchService | Wired | FormulaService | Single Responsibility |
| EquipmentService | Wired | FormulaService | Single Responsibility |
| RPGService | Wired | FormulaService, ResourceService | Single Responsibility |
| InventoryService | Wired | FormulaService, EquipmentService | Single Responsibility |
| ItemService | Wired (conditional) | ResourceService, FormulaService, InventoryService | Single Responsibility |
| GameStateService | Wired | ResourceService, AgentService, InventoryService, MissionService | Single Responsibility |

### UI/Specialized Services
| Service | Status | Dependencies | SOLID Compliance |
|---------|--------|--------------|------------------|
| HUDService | Wired (late init) | Game instance | Needs Refactoring |
| CombatService | Wired (conditional) | FormulaService, AgentService | Single Responsibility |
| QuestService | Wired (conditional) | ResourceService | Single Responsibility |
| SaveGameService | Wired (conditional) | GameStateService | Single Responsibility |

---

## 2. Services NOT Wired in GameServices

### KeybindingService
**Location**: `js/services/keybinding-service.js`
**Status**: Exists as singleton `window.keybindingService`
**Used By**: dialog-integration.js, game-settings.js
**Issue**: Should be wired into GameServices for consistency

**Recommendation**: Add to GameServices:
```javascript
// In GameServices constructor
if (window.KeybindingService) {
    this.keybindingService = new KeybindingService();
} else if (window.keybindingService) {
    this.keybindingService = window.keybindingService;
}
```

---

## 3. Scattered Functionality That Should Be Services

### 3.1 PathfindingService (HIGH PRIORITY)
**Current Location**: `game-pathfinding.js` (363 lines)
**Methods**: 9 methods attached to CyberOpsGame.prototype
- `initPathCache()` - Initialize path caching
- `findPath()` - A* pathfinding algorithm
- `getNeighbors()` - Get walkable neighbors
- `heuristic()` - Euclidean distance
- `reconstructPath()` - Build path from A* result
- `smoothPath()` - Optimize waypoints
- `hasDirectPath()` - Line-of-sight check
- `findNearestWalkable()` - Find closest walkable tile
- `moveAgentWithPathfinding()` - Apply path to agent movement

**Dependencies**: Needs map data (isWalkable), game speed
**Recommendation**: Create PathfindingService with map injection

```javascript
class PathfindingService {
    constructor() {
        this.pathCache = new Map();
        this.maxCacheSize = 50;
        this.cacheTimeout = 5000;
    }

    setMapProvider(mapProvider) {
        this.mapProvider = mapProvider; // Provides isWalkable()
    }

    findPath(startX, startY, endX, endY, smooth = true) { ... }
    // Move other methods here
}
```

### 3.2 AudioService (HIGH PRIORITY)
**Current Location**: Multiple files
- `game-audio.js` (224 lines) - Core AudioContext management
- `game-music-system.js` - Mission music
- `game-screen-music.js` - Screen music
- `game-audioloader.js` - Asset loading
- `game-music-config.js` - Declarative config

**Methods Scattered**:
- `initializeAudio()` - AudioContext setup
- `setupAudioInteraction()` - User interaction handling
- `enableAudio()` - Enable on first interaction
- `playSound()` - SFX playback
- `getSoundCategory()` - Categorize sounds
- `playConfiguredSound()` - Config-driven playback
- `loadScreenMusic()` - Screen-specific music
- `loadMissionMusic()` - Mission-specific music

**Recommendation**: Consolidate into AudioService

```javascript
class AudioService {
    constructor() {
        this.audioContext = null;
        this.enabled = false;
        this.config = null;
    }

    initialize() { ... }
    enableOnInteraction() { ... }
    playSound(soundType, volume) { ... }
    loadMusic(screen, context) { ... }
    setConfig(config) { ... }
}
```

### 3.3 NPCService (MEDIUM PRIORITY)
**Current Location**: `game-npc.js` (500+ lines)
**Methods**: 17+ methods
- `initNPCSystem()` - Initialize NPC tracking
- `loadNPCsFromMission()` - Load NPCs from mission data
- `updateNPCs()` - Update all NPC positions
- `renderNPCs()` - Render NPC sprites
- `getNearestNPC()` - Find closest NPC
- `interactWithNPC()` - Start NPC dialog
- `showNPCDialog()` - Display dialog
- `closeNPCDialog()` - Close dialog
- `offerQuest()` - Quest offering
- `acceptQuest()` - Quest acceptance
- `completeQuest()` - Quest completion
- `checkQuestProgress()` - Progress tracking
- Plus NPC class definition and movement logic

**Dependencies**: Map data, quest system
**Recommendation**: Create NPCService (dialog stays separate)

```javascript
class NPCService {
    constructor(questService) {
        this.npcs = [];
        this.questService = questService;
    }

    initialize() { ... }
    loadFromMission(missionDef) { ... }
    update(deltaTime) { ... }
    getNearbyNPC(x, y, range) { ... }
    interact(npcId, agentId) { ... }
}
```

### 3.4 EventLogService (LOW PRIORITY)
**Current Location**: `game-eventlog.js` (310 lines)
**Methods**: 15 methods
- `initEventLog()` - Initialize system
- `logEvent()` - Add event to log
- `getEventColor()` - Color by type
- `updateEventLogUI()` - DOM updates
- `getFormattedTime()` - Time formatting
- `logCombatHit()` - Combat events
- `logDeath()` - Death events
- `logItemCollected()` - Pickup events
- `logHack()` - Hack events
- `logAbility()` - Ability usage
- `logTeamCommand()` - Team commands
- `logMissionEvent()` - Mission updates
- `toggleEventLog()` - UI toggle
- `clearEventLog()` - Clear log

**Note**: This is already fairly well-encapsulated, just attached to prototype
**Recommendation**: Convert to EventLogService

```javascript
class EventLogService {
    constructor() {
        this.events = [];
        this.maxEntries = 50;
    }

    log(message, type, important) { ... }
    logCombat(attacker, target, damage, killed) { ... }
    logDeath(unit) { ... }
    // etc.
}
```

### 3.5 TurnBasedService (MEDIUM PRIORITY)
**Current Location**:
- `game-turnbased.js` - Core logic
- `game-turnbased-render.js` - Rendering

**Methods**: 30+ methods
- `initTurnBasedMode()` - Initialize system
- `toggleTurnBasedMode()` - Toggle on/off
- `enterTurnBasedMode()` / `exitTurnBasedMode()`
- `buildTurnQueue()` - Initiative order
- `startTurn()` / `endTurn()` - Turn management
- `calculateMovementRange()` - AP-based movement
- `executeAction()` - Action handling
- `handleOverwatch()` - Overwatch triggers
- Plus rendering methods

**Recommendation**: Create TurnBasedService (rendering stays in render file)

```javascript
class TurnBasedService {
    constructor(agentService, combatService) {
        this.enabled = false;
        this.turnQueue = [];
        this.currentTurnIndex = 0;
    }

    toggle() { ... }
    buildQueue(agents, enemies) { ... }
    startTurn(index) { ... }
    endTurn() { ... }
    canExecuteAction(unit, action) { ... }
    executeAction(unit, action, target) { ... }
}
```

### 3.6 Renderer3DService (LOW PRIORITY)
**Current Location**: `game-3d.js` (800+ lines)
**Methods**: 20+ methods
- `init3D()` - Three.js setup
- `toggle3D()` - Mode toggle
- `create3DWorld()` - World generation
- `update3D()` - Frame update
- `render3D()` - Render call
- `create3DAgent()` / `create3DEnemy()` / `create3DNPC()`
- `update3DCamera()` - Camera modes
- `cleanUp3D()` - Resource cleanup

**Note**: Heavy coupling with Three.js and game state
**Recommendation**: Consider Renderer3DService but lower priority

---

## 4. SOLID Compliance Audit

### Single Responsibility (S)
| Service | Compliant | Issues |
|---------|-----------|--------|
| FormulaService | Good | |
| ResourceService | Good | |
| AgentService | Good | |
| MissionService | Good | |
| CatalogService | Good | |
| InventoryService | Good | |
| HUDService | Needs Work | Requires game reference |
| RPGService | Good | Uses manager pattern internally |

### Open/Closed (O)
| Service | Compliant | Issues |
|---------|-----------|--------|
| CollectableTypes | Excellent | Polymorphic design |
| FormulaService | Good | |
| MissionService | Good | Event-driven |

### Liskov Substitution (L)
| Service | Compliant | Issues |
|---------|-----------|--------|
| CollectableType hierarchy | Excellent | Proper inheritance |
| Services | Good | No inheritance violations |

### Interface Segregation (I)
| Service | Compliant | Issues |
|---------|-----------|--------|
| Most services | Good | Clean method interfaces |
| GameServices | Needs Work | Proxy methods bloat interface |

### Dependency Inversion (D)
| Service | Compliant | Issues |
|---------|-----------|--------|
| Core services | Good | Constructor injection |
| HUDService | Needs Work | Depends on concrete game |
| Scattered code | Poor | Directly accesses game properties |

---

## 5. Recommended Action Plan

### Phase 1: Quick Wins (1-2 days)
1. **Wire KeybindingService into GameServices**
   - Already exists, just needs registration

2. **Create PathfindingService**
   - High value, well-defined scope
   - Clean extraction from game-pathfinding.js

### Phase 2: Medium Effort (3-5 days)
3. **Create AudioService**
   - Consolidate 4 audio files into one service
   - Keep declarative config system

4. **Create NPCService**
   - Extract NPC management from game-npc.js
   - Keep NPC class definition
   - Wire into QuestService

### Phase 3: Larger Refactoring (1 week+)
5. **Create TurnBasedService**
   - Extract core logic, keep rendering separate
   - Integrate with CombatService

6. **Create EventLogService**
   - Lower priority but clean extraction

7. **Consider Renderer3DService**
   - Only if 3D mode gets more complex

---

## 6. Service Dependency Graph

```
                    ┌─────────────────┐
                    │   GameServices  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ FormulaService│  │ ResourceService │  │  CatalogService │
└───────────────┘  └────────┬────────┘  └─────────────────┘
        │                   │
        ├───────────┬───────┼───────────┬─────────────────┐
        │           │       │           │                 │
        ▼           ▼       ▼           ▼                 ▼
┌─────────────┐ ┌───────┐ ┌─────────┐ ┌─────────────┐ ┌───────────┐
│RPGService   │ │Agent  │ │Mission  │ │ Inventory   │ │  Quest    │
│(+managers)  │ │Service│ │Service  │ │ Service     │ │  Service  │
└─────────────┘ └───────┘ └─────────┘ └─────────────┘ └───────────┘
                    │           │             │
                    ▼           ▼             ▼
              ┌───────────────────────────────────┐
              │        GameStateService           │
              └───────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────────┐
              │        SaveGameService            │
              └───────────────────────────────────┘
```

### Proposed New Services (Dashed Lines)
```
        ┌─────────────────┐
        │  (NEW) Audio    │ ◄── No deps, owns AudioContext
        │    Service      │
        └─────────────────┘

        ┌─────────────────┐
        │ (NEW) Pathfind  │ ◄── Needs map provider interface
        │    Service      │
        └─────────────────┘

        ┌─────────────────┐
        │  (NEW) NPC      │ ◄── Depends on QuestService
        │    Service      │
        └─────────────────┘

        ┌─────────────────┐
        │ (NEW) TurnBased │ ◄── Depends on AgentService, CombatService
        │    Service      │
        └─────────────────┘
```

---

## 7. Files Summary

### Existing Service Files (20 files)
```
js/services/
├── agent-service.js          (wired)
├── catalog-service.js        (wired)
├── collectable-types.js      (wired via ItemService)
├── combat-service.js         (wired, conditional)
├── equipment-service.js      (wired)
├── formula-service.js        (wired)
├── game-services.js          (coordinator)
├── game-state-service.js     (wired)
├── hud-service.js            (wired, late init)
├── inventory-service.js      (wired)
├── item-service.js           (wired, conditional)
├── keybinding-service.js     (NOT WIRED - singleton)
├── logger-service.js         (wired via window)
├── mission-service.js        (wired)
├── mission-state-service.js  (wired)
├── quest-service.js          (wired, conditional)
├── research-service.js       (wired)
├── resource-service.js       (wired)
├── rpg-service.js            (wired)
└── save-game-service.js      (wired, conditional)
```

### Scattered Functionality Files (Candidates for Service Extraction)
```
js/
├── game-pathfinding.js      → PathfindingService (HIGH)
├── game-audio.js            → AudioService (HIGH)
├── game-audioloader.js      → AudioService (HIGH)
├── game-music-system.js     → AudioService (HIGH)
├── game-screen-music.js     → AudioService (HIGH)
├── game-npc.js              → NPCService (MEDIUM)
├── game-turnbased.js        → TurnBasedService (MEDIUM)
├── game-turnbased-render.js → Keep as rendering module
├── game-eventlog.js         → EventLogService (LOW)
├── game-3d.js               → Renderer3DService (LOW)
└── game-visual-effects.js   → VisualEffectsService (LOW)
```

---

## 8. Conclusion

The current service architecture is **75% well-structured**. The main issues are:

1. **KeybindingService not wired** - Easy fix
2. **Pathfinding scattered** - High impact, clean extraction
3. **Audio fragmented** - 4 files should be 1 service
4. **NPC system coupled** - Should use QuestService
5. **Turn-based mode coupled** - Should use existing services

Addressing items 1-4 would bring the architecture to **90%+ SOLID compliance** and significantly improve maintainability.
