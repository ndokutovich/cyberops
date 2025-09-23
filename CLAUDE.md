# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CyberOps: Syndicate is a browser-based cyberpunk tactical game built with vanilla JavaScript, HTML5 Canvas, and Three.js for 3D rendering. The game features isometric tactical combat, resource management, and a strategic campaign system.

## Architecture

The game uses a modular JavaScript architecture with the main `CyberOpsGame` class split across multiple files for better organization. All functionality remains exactly the same, just divided into logical modules:

### JavaScript Modules (js/ directory)
- **game-core.js**: Core constructor and initialization
- **game-events.js**: Event handlers and input management
- **game-flow.js**: Game flow, missions, and abilities
- **game-saveload.js**: Save/load system
- **game-hub.js**: Syndicate hub management
- **game-dialogs.js**: Dialog and HUD systems
- **game-screens.js**: Screen management and transitions
- **game-demoscene.js**: Demoscene attract mode
- **game-audio.js**: Core audio system (AudioContext and sound effects)
- **game-music-config.js**: Declarative configuration for all audio (music, SFX, effects)
- **game-music-system.js**: Mission music system with dynamic state-based switching
- **game-screen-music.js**: Screen music system (menu, hub, credits, etc.)
- **game-loop.js**: Main game loop and update logic (includes game speed system)
- **game-rendering.js**: All rendering functions
- **game-3d.js**: Three.js 3D system with NPC support
- **game-utils.js**: Utility functions and getters/setters
- **game-keyboard.js**: Centralized keyboard handling system
- **game-npc.js**: NPC system - loads NPCs from campaign files, no hardcoded content
- **game-campaign-integration.js**: Loads campaigns and missions from external files
- **game-pathfinding.js**: A* pathfinding algorithm
- **game-teamcommands.js**: Team movement and formation commands
- **game-mission-executor.js**: Generic mission execution engine
- **game-mission-integration.js**: Bridges new system with existing code
- **game-init.js**: Game instantiation and initialization
- **game-rpg-system.js**: Core RPG mechanics (character progression, stats calculation)
- **game-rpg-integration.js**: Integrates RPG system with existing game mechanics
- **game-rpg-ui.js**: RPG user interface (character sheets, inventory, shop)
- **game-turnbased.js**: Turn-based mode logic (AP system, initiative, turn management)
- **game-turnbased-render.js**: Rendering for turn-based overlays and UI elements
- **game-equipment.js**: Agent equipment management (loadouts, inventory, shop)

### Declarative Dialog System (js/ directory)
- **declarative-dialog-engine.js**: Core declarative dialog engine with state machine
- **dialog-config.js**: Complete dialog configuration (states, transitions, layouts)
- **dialog-integration.js**: Integration adapter connecting declarative system to game

### Testing Framework (tests/ directory)
- **js/test-framework.js**: Core BDD-style test framework with async support
- **tests/simple-test-suite.js**: Basic engine tests
- **tests/dialog-basic-tests.js**: Dialog navigation tests
- **tests/dialog-test-suite.js**: Comprehensive dialog conversion tests
- **tests/state-machine-tests.js**: State machine transition validation
- **tests/dialog-state-audit.js**: Complete state and transition coverage audit
- **tests/dialog-state-full-coverage.js**: 100% coverage with mock data
- **test-runner.html**: Test runner with visual interface

### Campaign Files (campaigns/ directory)
- **campaigns/main/**: Main campaign with 5 acts
  - **act1/**: Missions main-01-001.js through main-01-003.js
  - **act2/**: Missions main-02-001.js and main-02-002.js
  - Each mission file contains complete embedded map data and all mission-specific content

### REMOVED/DEPRECATED FILES
- **game-maps.js**: DELETED - no procedural generation, all maps embedded
- **game-maps-data.js**: DELETED - maps now embedded in mission files
- **game-missions-data.js**: DELETED - missions now in campaign files
- **game-rpg-config.js**: DELETED - RPG config moved to campaign definitions

### Engine Layer (js/engine/ directory)
- **campaign-interface.js**: Validates campaign content structure and contracts
- **content-loader.js**: Dynamically loads campaign content into game systems
- **engine-integration.js**: Bridge between content system and existing engine

### Service Layer (js/services/ directory)
- **logger-service.js**: Centralized logging system with timestamp and source tracking
- **resource-service.js**: Centralized resource management (credits, research points, world control)
- **agent-service.js**: Complete agent lifecycle management (hire, kill, revive, damage, selection)
- **mission-service.js**: SINGLE SOURCE OF TRUTH for all mission tracking and objectives
- **game-state-service.js**: Game state management and auto-save functionality
- **event-log-service.js**: Event history and logging for gameplay events
- **game-services.js**: Service locator pattern for dependency injection
- **formula-service.js**: Centralized damage and combat formulas
- **equipment-service.js**: Equipment management and optimization
- **inventory-service.js**: Centralized inventory and item management
- **research-service.js**: Research tree progression
- **rpg-service.js**: RPG system integration service with managers

### Other Files
- **index.html**: Main entry point with PWA support and module loading
- **cyberops-game.css** (3500+ lines): All styling including animations, HUD, screen transitions, RPG UI, and turn-based overlays
- **manifest.json**: PWA manifest for app installation
- **service-worker.js**: Service worker for offline functionality

### Library Files (lib/ directory)
- **lib/three.module.min.js**: Three.js r180 ES6 module
- **lib/three.core.min.js**: Three.js core dependencies
- **lib/three-loader.js**: Module loader that converts Three.js ES6 module to global scope

### Music Files (music/ directory)
- **music/global/**: Shared music tracks (menu, credits, fallbacks)
  - ambient_generic.mp3, menu.mp3, credits.mp3
- **music/missions/**: Mission-specific music
  - main-01-001/ambient.mp3 (Level 1 music)
  - main-01-002/ambient.mp3 (Level 2 music)
  - main-01-003/ambient.mp3 (Level 3 music)
  - main-01-004/ambient.mp3 (Level 4 music)
  - main-02-001/ambient.mp3 (Level 5 music)
  - main-02-002/ambient.mp3 (Level 1 music reused)

### Key Systems in CyberOpsGame Class

- **Screen Management**: splash, menu, hub, briefing, loadout, game, victory, defeat screens
- **Mission System**: Declarative JSON-based missions with dynamic objectives and extraction
- **Combat System**: Isometric tactical combat with agents, enemies, projectiles, line-of-sight
- **3D Mode**: Optional Three.js-based 3D view with multiple camera modes, includes NPC rendering
- **Audio System**: Fully declarative audio configuration
  - **Screen Music**: Handles all menus with smart transitions (splash skip seeks to 10.6s)
  - **Mission Music**: Dynamic multi-track system (ambient, combat, stealth, alert, victory)
  - **Sound Effects**: WAV → MP3 → Procedural fallback chain
  - **Contextual SFX**: Environment and state-based sound modifications
  - Event-triggered changes based on game state
  - Fully configurable via JSON without code changes
- **Resource Management**: Credits, research points, world control percentage
- **Agent System**: Agent selection, abilities, equipment, movement, and combat
- **NPC System**: Interactive NPCs with dialog trees, quest system, context-sensitive actions
- **RPG System**: Comprehensive character progression with:
  - **Character Classes**: Soldier, Infiltrator, Tech Specialist, Medic, Heavy Weapons, Recon
  - **Primary Stats**: Strength, Agility, Intelligence, Endurance, Tech, Charisma
  - **Skills System**: Combat, stealth, hacking, medical, and social skills
  - **Inventory Management**: Weight-based inventory with equipment slots
  - **Experience & Leveling**: XP gain from missions and combat
  - **Equipment Bonuses**: Stats affected by equipped weapons and armor
- **Game Speed**: Adjustable game speed (1x/2x/4x) with auto-slowdown near enemies
- **Turn-Based Mode**: Tactical combat with action points and initiative system
- **Keyboard System**: Centralized keyboard handling with customizable bindings
- **Interaction System**: Universal H key for terminals, explosives, switches, gates, NPCs
- **Objective Tracking**: Real-time mission progress with extraction point activation

## Major Recent Architectural Changes

### 1. Complete Engine/Content Separation (3rd Normal Form)

The game has undergone a fundamental restructuring to achieve complete separation between engine mechanics and game content, similar to database normalization principles.

#### What Changed
- **Before**: RPG configuration, agent definitions, weapons, and game content were hardcoded in engine files
- **After**: ALL content now lives in campaign definitions, engine knows HOW things work but not WHAT exists

#### Key Components
- **Engine Layer**: Generic systems that understand mechanics (combat, movement, inventory)
- **Content Layer**: Campaign-specific data (agents, weapons, missions, RPG config)
- **Integration Layer**: ContentLoader and CampaignInterface bridge the two layers

#### Benefits
- **Theme Flexibility**: Can create fantasy, sci-fi, or any theme without changing engine code
- **Modding Support**: Easy to create custom campaigns
- **Clean Architecture**: Clear separation of concerns
- **Maintainability**: Engine bugs vs content bugs are clearly separated

### 2. Service-Oriented Architecture Pattern

The game uses a **clean service-oriented architecture** with complete separation between services and game logic. This eliminates circular dependencies and ensures maintainable code.

#### GameServices System
```javascript
class GameServices {
    // Core services (no dependencies)
    formulaService    // Centralized combat calculations
    resourceService   // Resource management (credits, research points)
    agentService      // Agent lifecycle management
    missionService    // Mission tracking (single source of truth)

    // Dependent services (use core services)
    equipmentService  // Equipment management (uses FormulaService)
    rpgService        // RPG integration (uses FormulaService)
    researchService   // Tech tree (uses FormulaService)
    inventoryService  // Inventory (uses Formula & Equipment services)
}
```

#### Critical Architecture Rules
- **NO Game References in Services**: Services NEVER reference the game object
- **NO Circular Dependencies**: Services only depend on other services, never back to game
- **Dependency Injection**: Services receive dependencies via constructor
- **Single Source of Truth**: Each service owns its domain completely
- **Service-to-Service Communication**: Services interact through clean interfaces

### 3. Dynamic Content Loading System

Complete overhaul of how game content is loaded and managed.

#### ContentLoader Features
- **Dynamic Loading**: Campaigns loaded at runtime, not compile time
- **Validation**: CampaignInterface validates content structure
- **Hot Swapping**: Can switch campaigns without code changes
- **Fallback System**: Graceful degradation if content missing

#### Campaign Configuration Structure
```javascript
{
    meta: { name, version, author },
    agents: [...],
    weapons: [...],
    equipment: [...],
    rpgConfig: {
        classes: {...},
        skills: {...},
        stats: {...}
    },
    missions: [...],
    ui: { strings: {...}, theme: {...} }
}
```

### 4. Turn-Based Mode System

Complete tactical turn-based combat system with action points and initiative management.

#### Core Features
- **Action Points (AP)**: Units have limited actions per turn
- **Initiative System**: Turn order based on unit speed/type
- **Movement Preview**: Visual range and path preview before committing
- **Two-Click System**: First click previews, second confirms action
- **Grid Snapping**: Movement snaps to tile centers for precision

#### Turn-Based Components
- `game-turnbased.js`: Core turn-based logic and state management
- `game-turnbased-render.js`: Specialized rendering for overlays and UI

#### Action Point System
```javascript
apConfig: {
    agent: 12,
    guard: 8,
    soldier: 10,
    heavy: 6,
    boss: 14
}

actionCosts: {
    move: 1,        // Per tile
    shoot: 4,       // Basic attack
    ability: 6,     // Special ability
    hack: 4,        // Hack terminal
    overwatch: 3    // Set overwatch
}
```

#### Visual Feedback
- **Movement Range**: Green tiles show reachable areas
- **Path Preview**: Yellow line shows planned movement
- **Turn Queue**: UI shows upcoming turn order
- **AP Display**: Current/max AP shown for active unit

### 5. RPG System Integration

Comprehensive character progression system seamlessly integrated with existing mechanics.

#### RPG Features
- **Character Classes**: Soldier, Infiltrator, Tech Specialist, Medic, Heavy, Recon
- **Primary Stats**: Strength, Agility, Intelligence, Endurance, Tech, Charisma
- **Skill System**: Combat, stealth, hacking, medical, social skills
- **Inventory Management**: Weight-based system with equipment slots
- **Experience & Leveling**: XP from combat and mission completion

#### Integration Points
- **Combat Enhancement**: RPG stats affect damage, crits, dodge
- **Equipment Synergy**: Items provide stat bonuses
- **Backward Compatibility**: Works with non-RPG campaigns
- **Service Architecture**: Clean integration via RPGService

### 6. Mission Editor Enhancements

Professional-grade campaign and mission editing capabilities.

#### Editor Features
- **Full CRUD Operations**: Create, read, update, delete all content
- **IndexedDB Persistence**: Campaigns saved in browser storage
- **Import/Export**: ZIP archive support for sharing
- **Visual Map Editor**: Paint tiles, place objects, set spawns
- **Mission Reordering**: Drag-drop or arrow-based ordering
- **Live Testing**: Test missions directly from editor

#### Campaign Management
- **Act Organization**: Group missions into narrative acts
- **Metadata Editing**: Author, version, description
- **Asset Management**: NPCs, terminals, doors, items
- **Objective Builder**: Visual objective creation

### 7. Progressive Web App (PWA) Support

Full PWA implementation for installable, offline-capable gameplay.

#### PWA Components
- **Service Worker**: Caches assets for offline play
- **Web Manifest**: Enables installation on devices
- **Icon Set**: Multiple resolutions for all platforms
- **Offline Mode**: Play without internet connection

#### Caching Strategy
```javascript
CORE_ASSETS = [
    '/index.html',
    '/js/game-*.js',
    '/campaigns/main/*.js',
    '/assets/logo-*.png'
]
```

#### Benefits
- **Installable**: Add to home screen like native app
- **Offline Play**: Full game available without internet
- **Auto Updates**: Service worker manages updates
- **Performance**: Cached assets load instantly

### 8. Flexible Campaign System

Campaigns can completely transform the game experience.

#### Campaign Capabilities
- **Total Conversion**: Change from cyberpunk to fantasy or any theme
- **Custom Formulas**: Define combat calculations per campaign
- **UI Theming**: Colors, fonts, terminology all configurable
- **Gameplay Constants**: Movement speed, vision range, etc.
- **Audio Configuration**: Music and SFX per campaign

#### Example: Fantasy Campaign
```javascript
{
    meta: { name: "Realm of Shadows" },
    agents: [
        { name: "Warrior", health: 150, damage: 25 },
        { name: "Mage", health: 80, mana: 200 }
    ],
    rpgConfig: {
        classes: {
            warrior: { baseStats: { strength: 16 } },
            mage: { baseStats: { intelligence: 18 } }
        }
    }
}
```

### 9. Event Logging System

Replaced notification system with comprehensive event logging for better debugging and player feedback.

#### Event Categories
- **Combat**: Attack, damage, death events
- **System**: Turn changes, mode switches
- **Mission**: Objective updates, extraction
- **RPG**: Level ups, skill usage

#### Benefits
- **Performance**: No UI blocking from notifications
- **History**: Complete event log for debugging
- **Filtering**: View events by category
- **Persistence**: Can save logs for bug reports

### 10. Enhanced Coordinate System

Improved handling of coordinate transformations, especially for turn-based overlays.

#### Critical Fix
When rendering overlays AFTER `ctx.restore()`, must ADD camera offset instead of subtracting:
```javascript
// CORRECT for post-restore rendering
const screenX = iso.x + this.cameraX;  // Adding camera
const screenY = iso.y + this.cameraY;
```

#### Coordinate Layers
1. **World Space**: Game logic coordinates
2. **Isometric Space**: World-to-screen without camera
3. **Screen Space**: Final rendered position with camera

### Summary of Architectural Impact

These changes represent a complete architectural overhaul that transforms CyberOps from a hardcoded game into a flexible game engine:

1. **Engine is now content-agnostic** - Can run ANY theme or setting
2. **Service layer provides clean APIs** - All systems accessible via services
3. **Turn-based mode adds tactical depth** - Optional strategic gameplay
4. **RPG systems enhance progression** - Character development and customization
5. **Mission editor enables creativity** - Users can create custom content
6. **PWA support enables portability** - Play anywhere, even offline
7. **Campaign system enables modding** - Total conversion support

The game now follows enterprise software patterns while remaining a simple HTML file that runs in any browser. This architecture provides the foundation for infinite expandability while maintaining backward compatibility and performance.

## Architecture Documentation

### PlantUML Architecture Diagram

The game's architecture is documented in `architecture-diagram.puml`. This diagram shows:
- **Complete class hierarchy** with all 25 major components
- **Clean service relationships** with no circular dependencies
- **Manager pattern** under RPGService
- **Proper dependency flow** from game to services to managers

To view the diagram:
1. Use PlantUML extension in VS Code
2. Or paste contents into plantuml.com
3. Or generate with: `java -jar plantuml.jar architecture-diagram.puml`

### Architecture Principles Enforced
- ✅ Services NEVER reference game
- ✅ No circular dependencies
- ✅ Clean dependency injection
- ✅ 100% test coverage
- ✅ Single source of truth for each domain

## Running the Game

The game is a standalone HTML file that can be opened directly in a browser. No build process or server required.

```bash
# Simply open the HTML file in a browser
# Or use a local server for better performance:
python -m http.server 8000
# Then navigate to http://localhost:8000/
```

## Important Implementation Details

### Canvas and Camera System
- The game uses HTML5 Canvas 2D context for primary rendering
- Isometric projection with configurable tile dimensions (64x32 default)
- Camera position stored in `cameraX`, `cameraY` with zoom support
- Canvas automatically resizes to window dimensions

### Agent Selection Protection
- The game implements selection protection (`selectionProtection` flag) to prevent accidental deselection during gameplay
- Selected agent tracked via `_selectedAgent` with getter/setter pattern

### Audio Initialization
- Audio requires user interaction to enable (click/touch)
- Multiple audio tracks for different levels and screens
- Music files (.mp3/.wav) are gitignored but expected to exist

### 3D System Integration (Three.js r180)
- Three.js r180 loaded as ES6 module and exposed globally via lib/three-loader.js
- Module files in lib/ directory: three.module.min.js and three.core.min.js (dependencies)
- 3D mode toggleable with E key, cycles through camera modes:
  - Tactical (2D): Standard isometric view
  - Isometric (3D): Bird's eye 3D view
  - Third-person: Behind selected agent
  - First-person: From agent's perspective
- 3D container (#game3DContainer) overlays the 2D canvas when active
- WebGL renderer with shadows, frustum culling for performance
- Uses CapsuleGeometry for agents (requires Three.js r152+)
- 3D world created once per mission, not recreated on camera switches
- Separate HUD for 3D mode with crosshair and mode indicator

### Game State Persistence
- Mission progress tracked in `completedMissions` array
- Resource state (credits, research points) maintained across missions
- Auto-save system with pre-mission saves for retry functionality
- Manual save/load functionality with multiple save slots

## Recent Features and Approaches

### NPC System (game-npc.js)
- **Campaign-Driven**: NPCs loaded from mission definitions, not hardcoded
- **Dialog System**: HTML-based dialog boxes with typing animation effect
- **Quest System**: Side quests with objectives, rewards, and completion tracking
- **Context-Sensitive Actions**: NPCs offer different options based on nearby objects (terminals, enemies)
- **3D Integration**: NPCs render in both 2D and 3D modes with interaction indicators
- **Coordinate System**: NPCs use world coordinates, properly converted for screen rendering

### Keyboard Handling (game-keyboard.js)
- **Centralized Bindings**: All keyboard shortcuts in one place for easy modification
- **Robust Handler System**: Case-insensitive key handling with proper scope management
- **Key Features**:
  - H: Interact with NPCs or hack
  - C: Open character sheet (RPG stats and skills)
  - I: Open inventory management
  - Z: Cycle game speed (1x/2x/4x)
  - J: Show comprehensive mission list
  - E: Toggle 3D modes (tactical/third/first person)
  - Tab: Cycle through agents
  - T: Select all squad members
  - Space: Toggle turn-based mode
  - Enter: End turn (in turn-based mode)
  - 1-6: Direct agent selection
  - F/G/Q: Combat abilities (shoot/grenade/shield)

### Mission List System
- **Comprehensive Overview**: Shows primary objectives and all side quests
- **Quest Tracking**: Visual indicators for quest progress and completion
- **Statistics**: Tracks terminals hacked, enemies eliminated, credits earned
- **Rewards Display**: Shows potential rewards for completing quests

### UI/UX Improvements
- **HUD Dialog System**: Consistent dialog styling across all screens
- **Hall of Glory**: Memorial for fallen agents with cyberpunk aesthetic
- **Speed Indicator**: Visual feedback for current game speed
- **Quest HUD**: Active quests displayed on-screen during gameplay
- **Health Bars**: Fixed display for dead agents and text wrapping
- **Unified Equipment UI**: Hub equipment interface used across all game screens
- **RPG UI Integration**: Character sheets and inventory seamlessly integrated

### RPG System Architecture

The RPG system uses a **manager-based architecture** under RPGService:

#### RPGService Structure
```javascript
class RPGService {
    rpgManager        // Handles XP, leveling, stats (owns experience table)
    inventoryManager  // Manages inventories per agent
    shopManager       // Shop system (depends on RPG & Inventory managers)
}
```

#### Key Features
- **Manager Pattern**: Each manager handles specific RPG domain
- **Clean Dependencies**: ShopManager receives managers via constructor, not game reference
- **Experience Ownership**: RPGManager owns XP progression (not duplicate of service)
- **Equipment Synchronization**: Hub loadouts sync to RPG inventories
- **Combat Enhancement**: RPG stats affect damage, critical hits, dodge, and armor
- **Stat Bonuses**: Equipment provides visible bonuses displayed with "+" notation
- **Backward Compatibility**: RPG features enhance but don't break existing systems

## Campaign and Mission Architecture

### Complete Separation of Engine and Content
The game achieves "3rd normal form" - the engine knows NOTHING about specific campaigns or missions. All content is loaded dynamically from external campaign files.

### Campaign System
- **Campaign Files**: Each campaign is a directory with acts and missions
- **Mission Files**: Self-contained JavaScript files with embedded maps
- **Dynamic Loading**: `game-campaign-integration.js` loads campaigns at runtime
- **No Hardcoded Content**: Engine contains zero mission-specific code

### Campaign Loading Process
1. **HTML loads**: index.html includes game-campaign-integration.js
2. **Campaign auto-registers**: Each mission file self-registers with CampaignSystem
3. **Mission selection**: Player selects from available missions in hub
4. **Dynamic loading**: Mission data loaded at runtime, including embedded map
5. **NPC spawning**: NPCs loaded from mission definition, not hardcoded

### Mission File Structure
Each mission file (e.g., `campaigns/main/act1/main-01-001.js`) is self-contained:
```javascript
(function() {
    const mission = {
        id: 'main-01-001',
        campaign: 'main',
        act: 1,
        map: {
            embedded: {
                tiles: [
                    "################...", // String array, one per row
                    "################...", // Each string = map width chars
                ],
                spawn: { x: 2, y: 78 },
                extraction: { x: 78, y: 2 },
                terminals: [...],
                doors: [...],
                npcs: [...]
            }
        },
        objectives: [...],
        rewards: { credits: 2000, researchPoints: 50 }
    };

    // Self-registration
    CampaignSystem.registerMission('main', 1, 'main-01-001', mission);
})();
```

### Declarative Mission Design
- **OBJECTIVE_TYPES**: Interact, Eliminate, Collect, Reach, Survive, Custom
- **INTERACTION_TARGETS**: Terminal, Explosive, Switch, Gate, Door, NPC

### Mission Flow (Clean Architecture)
1. Mission loads from campaign definition
2. Map loads from embedded string arrays (NO generation)
3. MissionService handles ALL objective tracking (single source of truth)
4. MissionService enables extraction when objectives complete
5. MissionService completes mission when agents reach extraction

### Mission Tracking Architecture
- **MissionService**: The ONLY system that tracks objectives and mission state
- **No duplicate tracking**: Removed ALL legacy tracking: `missionTrackers`, `hackedTerminals`, `interactedObjects`, `enemiesEliminatedByType`, `survivalTimers`
- **Event-driven**: All game events call `MissionService.trackEvent()`
- **Enhanced tracking**: Tracks by enemy type, specific objects, and per-objective timers
- **Backward compatibility**: `missionTrackers` property proxies to MissionService.trackers
- **Quest system**: Kept separate in `activeQuests`/`completedQuests` for NPC compatibility

### Special Interactions
All interactions use the H key with context-sensitive behavior:
- **Terminals**: Hack to unlock doors or complete objectives
- **Explosives**: Plant bombs at designated targets (Mission 3)
- **Switches**: Activate to disable alarms or systems
- **Gates**: Breach fortified entrances (Mission 5)
- **NPCs**: Engage in dialog and receive quests

### Mission Integration (Clean)
- `game-mission-executor.js`: UI and display logic only
- `game-mission-integration.js`: Links MissionService objectives to game
- `MissionService.trackEvent()`: ALL tracking goes through this
- `MissionService.objectives`: Single array for all objective data
- No fallbacks or duplicate systems - MissionService is authoritative

### Map System
- **Embedded Maps Only**: All maps are embedded in mission files as string arrays
- **String-Based Format**: Each tile row is a string, '#' for walls, '.' for floors
- **Efficient Storage**: ~150 lines per mission vs 14,000+ lines in old format
- **Map Dimensions**: Corporate (80x80), Government (90x70), Industrial (100x80), etc.
- **NO Procedural Generation**: All procedural generation code completely removed

## Critical Architecture Principles

### Boy Scout Rule - Leave Code Cleaner Than You Found It
- **ALWAYS** clean up unused code when you encounter it
- **ALWAYS** remove commented-out code unless it has a TODO explanation
- **ALWAYS** fix inconsistencies in formatting when editing a file
- **ALWAYS** remove unused imports, variables, and functions
- **ALWAYS** update related documentation when changing code
- **NEVER** leave behind test code, console.logs (unless for errors), or temporary hacks
- **NEVER** use console.log for debugging - use event logging system instead

### NEVER Use Old Approaches
- **NEVER** create procedural map generation - all maps are embedded
- **NEVER** hardcode mission data in engine files
- **NEVER** put NPCs, quests, or content in engine code
- **NEVER** use browser-based tools for data conversion - use Node.js
- **NEVER** leave unused generation code in mission files
- **NEVER** use dual tracking systems - MissionService is the ONLY tracker
- **NEVER** use missionTrackers, hackedTerminals, or other legacy counters
- **NEVER** check objectives outside of MissionService
- **ALWAYS** keep complete separation between engine and content
- **ALWAYS** use campaign files for all mission-specific content
- **ALWAYS** use MissionService.trackEvent() for ALL mission events

### Content Location Rules
- **Mission Content**: ONLY in `campaigns/*/act*/mission.js` files
- **Engine Code**: ONLY generic systems in `js/game-*.js` files
- **NPCs and Quests**: ONLY in mission definition files
- **Maps**: ONLY as embedded string arrays in mission files

## Major Cleanup Process Completed

### What Was Removed (Complete Cleanup)
1. **Procedural Map Generation**: 973 lines reduced to 22-line stub
2. **Hardcoded NPCs**: 400+ lines of NPCs removed from game-npc.js
3. **Hardcoded Missions**: All mission data moved to campaign files
4. **game-maps-data.js**: Completely deleted (was 14,000+ lines)
5. **game-missions-data.js**: Completely deleted
6. **Intermediate Tools**: All test HTML files and conversion scripts removed
7. **Duplicate Tracking Systems**: Removed all missionTrackers initialization and direct usage
8. **OBJECTIVE_HANDLERS.checkComplete**: Removed - MissionService handles all checking
9. **Local tracking variables**: Removed interactedObjects, enemiesEliminatedByType, survivalTimers from game-mission-executor
10. **Duplicate completeMission**: Now uses MissionService.completeMission()
11. **Legacy counter updates**: Removed hackedTerminals counter, all interaction tracking through MissionService
12. **Duplicate enemy tracking**: Removed redundant MissionService.trackEvent in game-flow (onEnemyEliminated already tracks)

### Storage Efficiency Achieved
- **Old Format**: 14,000+ lines per mission (object per tile)
- **New Format**: ~150 lines per mission (string arrays)
- **Reduction**: 99% smaller file sizes

### Why This Architecture
- **3rd Normal Form**: Complete separation like database normalization
- **Engine Independence**: Engine can run ANY campaign without modification
- **Content Portability**: Campaigns are self-contained modules
- **Maintainability**: Clear separation of concerns
- **Performance**: Smaller files, faster loading

## Mission Editor System

The mission editor (`mission-editor.html` and `mission-editor.js`) provides comprehensive campaign management and map editing capabilities.

### Campaign Management Features
- **Full CRUD Operations**: Create, Read, Update, Delete for all campaign content types
- **IndexedDB Persistence**: Campaigns stored in browser storage for seamless switching
- **Import/Export**: Support for ZIP archives and directory imports
- **Mission Reordering**: Visual up/down arrows and dedicated reorder dialog
- **Act Management**: Create/delete acts with descriptive titles (Beginning Operations, Escalation, etc.)

### Key Implementation Details
- **Unified Mission Loading**: Single flow whether selecting from dropdown or clicking Map Editor button
- **Mission Dropdown**: Shows current mission in caption ("Current: Mission Name")
- **Auto-refresh**: Mission list updates automatically after any CRUD operation
- **Visual Feedback**: Green notification slides when mission loads, dialog auto-closes

### Campaign Storage Architecture
1. **Loading Priority** (in order):
   - IndexedDB (last saved campaign)
   - Window.MAIN_CAMPAIGN_CONFIG (from campaign-config.js)
   - Default campaign creation
2. **Mission Sync**: Missions dynamically loaded from campaign act folders
3. **Persistence**: All changes saved to IndexedDB automatically

### Mission Structure Requirements
New missions created via editor include:
- **Embedded map data**: 40x40 starter map with walls
- **Proper ID format**: `campaign-act-mission` (e.g., main-01-003)
- **Complete map object**: tiles, spawn, extraction, terminals, etc.
- **Default objectives**: At least one objective for valid mission

## GameServices Architecture and Formula System

### Service Locator Pattern
The game uses a **Service Locator** pattern via `GameServices` class to manage dependencies and provide centralized access to game systems:

```javascript
class GameServices {
    constructor() {
        // Core services
        this.formulaService = new FormulaService();
        this.resourceService = new ResourceService();
        this.agentService = new AgentService(this.resourceService);

        // Dependent services
        this.researchService = new ResearchService(this.formulaService);
        this.equipmentService = new EquipmentService(this.formulaService);
        this.rpgService = new RPGService(this.formulaService);
        this.inventoryService = new InventoryService(this.formulaService, this.equipmentService);
    }
}
```

### Key Architectural Principles

1. **Dependency Injection**: Services receive dependencies through constructor
2. **Single Responsibility**: Each service handles one aspect of the game
3. **Centralized Formulas**: All damage/combat calculations in FormulaService
4. **Service Integration**: Services can depend on other services

### Service Responsibilities

#### Core Services (No Dependencies)

##### FormulaService
- **Core Calculations**: Damage, protection, critical hits
- **Combat Mechanics**: Hit chance, dodge, armor penetration
- **Stat Modifiers**: Equipment bonuses, skill effects
- **Shared Logic**: Used by all other services for consistent calculations

##### ResourceService
- **Resource Management**: Credits, research points, world control, intel
- **Transaction Support**: Atomic multi-resource operations with rollback
- **Validation**: Constraints and affordability checks
- **History Tracking**: Complete audit trail of resource changes
- **Event System**: Notifies listeners for UI updates

##### AgentService
- **Agent Lifecycle**: Hire, kill, revive, damage, heal agents
- **Collection Management**: Available, active, and fallen agent tracking
- **Fast Lookups**: Find agents by ID, originalId, or name
- **Selection System**: Track selected agents for missions
- **Event Notifications**: Updates for hire, death, revival events
- **State Persistence**: Export/import for save system

##### MissionService
- **Objective Tracking**: Single source of truth for ALL mission objectives
- **Event Processing**: Handles all mission-related events (kills, hacks, interactions)
- **Extraction Control**: Manages extraction point activation
- **Quest Integration**: Separate tracking for NPC quests
- **Progress Reporting**: Real-time objective completion status

#### Dependent Services (Use Core Services)

##### EquipmentService (uses FormulaService)
- **Loadout Management**: Agent equipment assignments
- **Auto-Optimization**: Intelligent equipment distribution
- **Equipment Effects**: Apply bonuses to agent stats
- **Inventory Tracking**: Available vs equipped items

##### InventoryService (uses FormulaService, EquipmentService)
- **Item Management**: Centralized inventory for weapons, armor, utility items
- **Equipment Tracking**: Tracks what each agent has equipped
- **Pickup/Drop System**: Manages ground items and collectables
- **Buy/Sell Operations**: Handles shop transactions
- **Sync Operations**: Keeps equipment counts synchronized

##### RPGService (uses FormulaService)
- **Manager Architecture**: Contains RPGManager, InventoryManager, ShopManager
- **Character Progression**: XP, leveling, skill points via RPGManager
- **Stat Management**: Primary and derived stats
- **Class System**: Character classes and specializations
- **Shop Integration**: ShopManager with clean dependency injection

##### ResearchService (uses FormulaService)
- **Tech Tree**: Research progression and unlocks
- **Upgrades**: Apply research bonuses to agents/equipment
- **Resource Management**: Research point allocation

### Integration Flow

```javascript
// 1. Game initializes services
this.gameServices = new GameServices();

// 2. Services available globally
window.GameServices = this.gameServices;

// 3. Initialize with game data
this.gameServices.resourceService.initialize({
    credits: 10000,
    researchPoints: 0,
    worldControl: 0
});
this.gameServices.agentService.initialize(campaignAgents);

// 4. Use services for operations
// Resources
this.gameServices.resourceService.spend('credits', 1000, 'hire agent');
this.gameServices.resourceService.add('credits', 500, 'mission reward');

// Agents
this.gameServices.agentService.hireAgent('agent_001');
this.gameServices.agentService.damageAgent('agent_002', 25, 'enemy attack');

// Compatibility layer - legacy code still works
this.credits -= 100;  // Automatically uses ResourceService
this.activeAgents;    // Automatically uses AgentService
```

### Key Integration Points

1. **Mission Start**:
   - EquipmentService applies loadouts
   - RPGService syncs inventories
   - FormulaService ready for combat

2. **Combat Calculation**:
   - RPGService provides stat bonuses
   - FormulaService calculates final damage
   - EquipmentService applies item effects

3. **Hub Management**:
   - EquipmentService manages arsenal
   - RPGService handles character sheets
   - ResearchService tracks upgrades

### Critical Service Architecture Rules

#### NEVER Violate These Rules:
1. **Services NEVER Reference Game**: No service should have `this.game` or access `window.game`
2. **No Circular Dependencies**: Services can depend on other services, but never create cycles
3. **Single Source of Truth**: Each service completely owns its domain
4. **Clean Dependency Injection**: Pass dependencies via constructor, not global references
5. **Manager Independence**: Managers under services also follow these rules

#### ALWAYS Follow These Patterns:
- **Use Service Methods**: Never bypass services with direct manipulation
- **Formula Consistency**: ALL calculations MUST go through FormulaService
- **Resource Operations**: ALL credit/research changes MUST go through ResourceService
- **Agent Operations**: ALL agent management MUST go through AgentService
- **Mission Tracking**: ALL objective tracking MUST go through MissionService
- **Initialization Order**: Core services first (no deps), then dependent services
- **Backward Compatibility**: Use compatibility layer for legacy code

### Known Service Integration Issues (Fixed)

1. **AgentService Health Bug (FIXED)**:
   - **Issue**: AgentService was setting `maxHealth: 100` as default, ignoring campaign health values
   - **Impact**: Agents appeared damaged at mission start (e.g., 90/100 health)
   - **Fix**: Changed to `maxHealth: data.maxHealth || data.health || 100`
   - **Lesson**: Services must preserve original data flow behavior

2. **Mission Tracking Consolidation**:
   - **Issue**: Duplicate tracking between game code and MissionService
   - **Fix**: Removed all legacy tracking, MissionService is single source of truth
   - **Compatibility**: `missionTrackers` property proxies to MissionService

### Compatibility Layer

The game implements a transparent compatibility layer that allows legacy code to work unchanged while using the new service architecture:

```javascript
// These properties automatically delegate to services:
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    get: function() { return this.gameServices?.resourceService?.get('credits') ?? this._credits; },
    set: function(val) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.set('credits', val, 'direct assignment');
        } else {
            this._credits = val; // Fallback
        }
    }
});

// Similarly for: researchPoints, worldControl, availableAgents, activeAgents, fallenAgents
```

This means:
- `game.credits -= 100` automatically uses ResourceService
- `game.activeAgents` automatically returns from AgentService
- All existing code continues to work without modification
- New code can use services directly for enhanced features

### Clean Service Integration Examples

```javascript
// Services NEVER reference game directly
class ShopManager {
    constructor(rpgManager = null, inventoryManager = null) {
        // Clean dependency injection - NO game reference
        this.rpgManager = rpgManager;
        this.inventoryManager = inventoryManager;
        this.shops = new Map();
    }

    buyItem(agentId, itemId) {
        // Use injected managers, not game
        const inventory = this.inventoryManager.getInventory(agentId);
        const entity = this.rpgManager.getEntity(agentId);
        // ... handle purchase
    }
}

// GameServices uses services, not direct game properties
class GameServices {
    calculateAttackDamage(attacker, target, context) {
        // Get loadout from InventoryService, not game
        const agentId = attacker.originalId || attacker.id;
        const loadout = this.inventoryService.getAgentLoadout(agentId);

        // Use FormulaService for calculations
        return this.formulaService.calculateDamage(
            attacker.damage,
            loadout?.weapon?.damage || 0,
            attacker.damageBonus,
            target.protection
        );
    }
}
```

## Test Coverage Architecture

### Complete Test Coverage (100%)

The game achieves **100% test coverage** for all architectural components:

#### Test Files
- **rpg-managers-tests.js**: Tests for RPGManager, InventoryManager, ShopManager
- **game-services-tests.js**: Tests for GameServices initialization and dependencies
- **content-loader-tests.js**: Tests for ContentLoader and campaign loading
- **logger-tests.js**: Tests for Logger service and all log levels
- **campaign-system-tests.js**: Tests for CampaignInterface and CampaignSystem

#### Coverage Verification
```javascript
// All 25 classes in architecture have tests:
✓ CyberOpsGame
✓ GameServices (+ all services)
✓ ContentLoader
✓ CampaignInterface & CampaignSystem
✓ DeclarativeDialogEngine
✓ ModalEngine
✓ RPGManager, InventoryManager, ShopManager
✓ Logger
```

#### Test Principles
- **Isolation Tests**: Verify services work without game reference
- **Dependency Tests**: Ensure proper dependency injection
- **Integration Tests**: Validate service-to-service communication
- **No Circular Reference Tests**: Explicitly test for circular dependencies

## Lessons Learned from Development

### 1. Async/Await Consistency
**Issue**: Mixed callback and async patterns causing timing issues
**Solution**: Use async/await throughout, mark all async functions properly
```javascript
// Bad
function saveCampaign() {
    this.saveCampaignToDB(campaign);
}

// Good
async saveCampaign() {
    await this.saveCampaignToDB(campaign);
}
```

### 2. Global State Synchronization
**Issue**: Campaign data and game state getting out of sync
**Solution**: Use ContentLoader service for consistent access
```javascript
// Always get content through ContentLoader
const rpgConfig = window.ContentLoader.getContent('rpgConfig');
const agents = window.ContentLoader.getContent('agents');
```

### 3. UI State Management
**Issue**: Dropdown selections resetting after operations
**Solution**: Preserve selection state, update caption to show current selection

### 4. Data Structure Consistency
**Issue**: Missions without required embedded map data couldn't load
**Solution**: Always create complete data structures, even with defaults

### 5. Event Handler Cleanup
**Issue**: Memory leaks from duplicate event listeners
**Solution**: Check for existing elements/listeners before adding new ones

### 6. Visual Feedback Importance
**Issue**: Users uncertain if operations completed
**Solution**: Add notifications, loading states, and success confirmations

## Testing Approach and Strategy

### Test Framework Architecture

The game uses a custom BDD-style test framework (`js/test-framework.js`) that provides:
- **Async/await support** for testing asynchronous operations
- **describe/it syntax** similar to Jest/Mocha
- **Custom assertions**: `assertEqual`, `assertTruthy`, `assertFalsy`, `assertThrows`
- **Visual test runner** with real-time results and progress tracking
- **Test isolation**: Each test suite runs independently

### Dialog System Testing Strategy

#### 1. Coverage Levels
The dialog system achieves 100% state coverage through a two-tier approach:

**Tier 1: Simple State Testing (87% coverage)**
- Tests 13 out of 15 dialog states that don't require special data
- Direct navigation: `game.dialogEngine.navigateTo('state-name')`
- Covers: agent-management, arsenal, character, hall-of-glory, hire-agents, hub-settings, intel-missions, mission-select-hub, pause-menu, research-lab, save-load, settings, tech-tree

**Tier 2: Mock Data Testing (100% coverage)**
- Tests remaining 2 states that require runtime data
- Uses mock data injection for complete coverage:
  ```javascript
  // For hire-confirm state
  game.dialogEngine.stateData = {
      selectedAgent: { id: 'test_001', name: 'Ghost', cost: 5000 }
  };

  // For npc-interaction state
  game.dialogEngine.currentNPC = {
      id: 'npc_001', name: 'Informant', dialog: {...}
  };
  ```

#### 2. Test Categories

**Navigation Tests** (`dialog-basic-tests.js`)
- Basic state navigation
- Parent-child relationships
- Back button functionality
- State persistence

**State Machine Tests** (`state-machine-tests.js`)
- All documented transitions (53 total)
- State reachability from hub/game
- Navigation cycles
- Stack depth validation

**Audit Tests** (`dialog-state-audit.js`)
- Comprehensive coverage analysis
- Level hierarchy verification (1, 2, 3)
- Refresh behavior
- Transition validation

**Full Coverage Tests** (`dialog-state-full-coverage.js`)
- Mock data scenarios
- Edge case handling (missing data)
- Complete hiring flow simulation
- 100% state coverage achievement

#### 3. Testing Best Practices

**DOM Isolation**
- Tests run with minimal DOM (`test-runner.html` provides containers)
- Game loop disabled in test mode: `game.testMode = true`
- DOM element guards: Always check element exists before access
  ```javascript
  const element = document.getElementById('missionTimer');
  if (element) {
      element.textContent = '00:00';
  }
  ```

**Async Handling**
- Always use `await sleep(50)` after navigation for render completion
- Mark all async test functions with `async`
- Use try-catch for operations that may fail

**Test Data Management**
- Clear state before each test: `game.dialogEngine.closeAll()`
- Reset mock data: `game.dialogEngine.stateData = {}`
- Verify initial conditions before testing

### Running Tests

#### Quick Start
```bash
# Open test runner in browser
open test-runner.html

# Or serve locally
python -m http.server 8000
# Navigate to http://localhost:8000/test-runner.html
```

#### Test Runner Interface
- **🚀 RUN ALL TESTS**: Execute complete test suite
- **💬 TEST DIALOGS**: Run dialog-specific tests
- **🔄 TEST STATE MACHINE**: Validate state transitions
- **🔍 AUDIT STATES**: Run coverage audit (87% without mocks)
- **📋 TEST SUMMARY**: View test statistics
- **🩺 DIAGNOSTICS**: Identify problematic tests

#### Expected Results
- **Total Tests**: 35 (+ 7 skipped DOM-dependent)
- **Dialog States**: 15/15 (100% coverage)
- **Transitions**: 53 validated
- **Pass Rate**: 100% for non-DOM tests

### Common Test Issues and Solutions

#### Issue: "cannot access property of null"
**Cause**: DOM element doesn't exist in test environment
**Solution**: Add guard checks or skip DOM updates in test mode
```javascript
if (this.testMode) return;
```

#### Issue: "transition not allowed"
**Cause**: Trying to navigate to child state without parent
**Solution**: Navigate to parent first, then child
```javascript
game.dialogEngine.navigateTo('agent-management');  // Parent
game.dialogEngine.navigateTo('hire-agents');        // Child
```

#### Issue: "data is undefined"
**Cause**: Dialog expects data that doesn't exist
**Solution**: Provide mock data before navigation
```javascript
game.dialogEngine.stateData = { selectedAgent: mockAgent };
```

### Test Maintenance

#### Adding New Dialog States
1. Add state to `ALL_DIALOG_STATES` in `dialog-state-audit.js`
2. Categorize as simple or data-required
3. Add navigation test in appropriate suite
4. Update coverage expectations

#### Modifying Transitions
1. Update transition list in `state-machine-tests.js`
2. Add test case for new transition
3. Verify reachability from hub/game
4. Update documentation

#### Performance Considerations
- Keep individual tests under 100ms
- Use `sleep(50)` not longer delays
- Batch related assertions
- Clean up after each test

## Development Best Practices

### Tooling and Automation
- **Use Node.js for intermediate tasks**: When generating data, converting formats, or performing batch operations, use Node.js scripts rather than browser-based tools or manual copy-paste approaches
- **Keep the app as HTML SPA**: The game itself should remain a simple HTML single-page application without any Node.js build process or dependencies
- **Examples of Node.js tasks**: Map generation, batch file updates, data conversion, validation scripts

### Module Pattern
- Use prototype-based inheritance, NOT ES6 classes
- Functions attached to `CyberOpsGame.prototype`
- Example: `CyberOpsGame.prototype.functionName = function() { }`

### Coordinate Systems
- **World Coordinates**: Used for game logic (agents, NPCs, enemies)
- **Screen Coordinates**: Converted using `worldToIsometric()` for rendering
- **3D Coordinates**: Converted with map offset calculations for Three.js

### Error Handling
- Always check if functions exist before calling (e.g., `if (this.updateNPCs)`)
- Use safety checks for optional systems
- Provide fallbacks for missing features

### Logging System (REQUIRED for all new code)
**IMPORTANT: console.log is DEPRECATED - Use Logger for ALL logging operations**

The game uses a centralized logging system (logger-service.js) that provides:
- Timestamp tracking (HH:mm:ss.SSS format)
- Source class identification
- Six log levels: TRACE, DEBUG, INFO, WARN, ERROR, FATAL
- Color-coded console output for better visibility
- Log history for debugging (last 1000 entries)

#### Usage in Code:
```javascript
// Initialize logger in constructor or at module level
// For class methods:
constructor() {
    this.logger = window.Logger ? new window.Logger('ClassName') : null;
    if (this.logger) this.logger.debug('ClassName initialized');
}

// For standalone modules (use unique names to avoid conflicts):
const moduleLogger = window.Logger ? new window.Logger('ModuleName') : null;

// Use appropriate log levels
if (this.logger) this.logger.trace('Detailed diagnostic info');
if (this.logger) this.logger.debug('Debug information');
if (this.logger) this.logger.info('General information');
if (this.logger) this.logger.warn('Warning message');
if (this.logger) this.logger.error('Error occurred', errorDetails);
if (this.logger) this.logger.fatal('Critical system failure');
```

#### Output Format:
```
[14:25:33.123] [FormulaService] [DEBUG] FormulaService initialized
[14:25:33.456] [InventoryService] [INFO] 🔫 Weapon picked up: Plasma Rifle
[14:25:33.890] [FormulaService] [WARN] No armor equipped for protection
```

#### Rules:
1. **NEVER use console.log directly** - Only Logger class itself may use console methods
2. **Always check if logger exists** before calling: `if (this.logger)`
3. **Use appropriate log level**:
   - TRACE: Very detailed info (loops, calculations)
   - DEBUG: Development info (state changes, method calls)
   - INFO: Important events (item pickup, level complete)
   - WARN: Potential issues (missing items, fallback used)
   - ERROR: Errors that can be recovered from
   - FATAL: Critical failures requiring immediate attention
4. **Avoid global namespace conflicts** - Use unique names for module-level loggers
5. **Logger initialization locations**:
   - Instance methods: `this.logger` in constructor
   - Static/prototype methods: `this.logger` in first method that runs
   - Standalone modules: `const uniqueLogger` at module top
6. **Migration complete**: All console.log/warn/error have been replaced with Logger

### Debugging
- **Use Logger for ALL debugging output** - console.log is deprecated
- Debug flags for pathfinding, vision cones, etc. controlled via Logger levels
- Comprehensive error messages with context using appropriate logger level
- Check browser console for color-coded, timestamped logger output
- Access log history: `window.Logger.getHistory({source: 'ClassName', level: LogLevel.WARN})`
- Filter logs by source: `window.Logger.setMinLevel('ClassName', LogLevel.INFO)`

## Common Pitfalls to Avoid

For detailed conversion guidelines and common mistakes, see:
- **DIALOG_CONVERSION_GUIDE.md** - Section 6: "Common Conversion Mistakes to Avoid"
- **DIALOG_CONVERSION_GUIDE.md** - Section 7: "When to Stop and Ask"

Key reminders:
- **Never** recreate functionality - find and preserve existing implementations
- **Always** check if functions are async before calling
- **Always** refresh UI after data operations
- **Never** assume components are initialized

## Common Issues and Solutions

### Keyboard Input Issues
- **Keys Not Working (Language/Layout Issue)**:
  - Check keyboard layout is set to English (US/UK)
  - Non-English keyboard layouts can cause keys to not be recognized
  - Browser cache issues can prevent updated code from loading
  - Use Ctrl+Shift+R (Chrome/Edge/Firefox) for hard refresh
  - Event listeners are set up inline in `initKeyboardHandler`
  - Legacy `setupKeyboardListeners` function kept as no-op for compatibility

### 3D Mode Issues
- **3D Mode Not Working (E key)**:
  - Check console for "✅ Three.js r180 loaded!"
  - Ensure three.module.min.js and three.core.min.js are in lib/ directory
  - Container must have non-zero dimensions and proper z-index
  - Renderer alpha should be false for proper background rendering
- **3D World Not Visible**:
  - Check "🎨 Rendering 3D" logs for scene children count
  - Verify container3D display is "block" when 3D enabled
  - Canvas element needs absolute positioning within container
- **Performance Issues in 3D**:
  - Frustum culling automatically hides off-screen objects
  - Pixel ratio limited to 2 for high-DPI displays
  - Consider reducing shadow map size if needed

### Keyboard Handler Issues
- **Keys Not Working**: If keyboard shortcuts aren't responding:
  - Check console for "✅ initKeyboardHandler COMPLETED successfully"
- **Some Keys Working, Others Not (C/I, action buttons broken)**:
  - **CRITICAL ISSUE**: Duplicate/conflicting event listeners in game-events.js
  - **Root Cause**: Old keyboard handlers not properly commented out
  - **Fix Required**:
    1. Comment out line 98: `// window.addEventListener('keydown', (e) => this.handleKeyPress(e));`
    2. Ensure lines 118-239 (old keydown) are in complete `/* */` comment block
    3. Ensure lines 243-252 (old keyup) are in complete `/* */` comment block
    4. Check that comment blocks have proper closing `*/`
  - **Why This Happens**: Improperly closed comment blocks leave event listeners active
  - **Prevention**: All keyboard handling must be centralized in game-keyboard.js only
  - Verify "✅ keyBindings has 49 keys registered" message
  - Handler lookup uses case-insensitive matching: `e.key`, `e.key.toUpperCase()`, `e.key.toLowerCase()`
  - Common cause: JavaScript scope/closure issues with `this.keyBindings`
  - Solution: Adding debugging can force proper scope evaluation

### Mission System Issues
- **Extraction Not Working**: Check if `extractionEnabled = true` when objectives complete
- **Objectives Not Tracking**: Verify `missionTrackers.enemiesEliminated` increments
- **H Key Not Working**: Ensure `useActionAbility()` exists and checks all interaction types
- **Mission Not Loading**: Check console for "Setting currentMissionDef" message

### RPG System Issues
- **Equipment Not Showing in Mission**:
  - Check `originalId` is preserved when agents transition from hub to mission
  - Verify loadout lookup uses: `agent.originalId || agent.name || agent.id`
  - Ensure `syncEquipment()` is called after mission start
- **Stats Not Updating**:
  - Equipment bonuses should show with "+" notation
  - Base stats come from RPG entity, bonuses from equipment
  - Check `updateStatsPreview()` is using current loadout
- **Inventory Empty**:
  - Hub uses agent names, missions use `agent_0` format
  - RPG service must sync loadouts using correct ID mapping
  - Check console for "📦 Syncing loadout for" messages

### Integration Checks
- **Script Order**: Campaign integration → Mission executor → Mission integration
- **Campaign Loading**: Campaigns load from `campaigns/` directory at runtime
- **Constants**: OBJECTIVE_TYPES and INTERACTION_TARGETS must be defined
- **Initialization**: `initMissions()` called during game startup
- **Game Loop**: `updateMissionObjectives()` runs every frame

### Working with Missions
- **To modify a mission**: Edit the corresponding file in `campaigns/main/act*/`
- **To add items**: Add to the `embedded` section of the mission file
- **To add NPCs**: Add to the `npcs` array with spawn location and quests
- **To change map**: Edit the `tiles` string array (keep width consistent!)
- **Map characters**: '#' = wall, '.' = floor, other chars for special tiles

## Declarative Dialog System

The game uses a state-machine based declarative dialog system for all UI interactions.

### 📚 Documentation
- **Complete State Reference**: See `GAME_STATE_REFERENCE.md` for all 38 states and 98 transitions
- **Conversion Guide**: See `DIALOG_CONVERSION_GUIDE.md` for converting imperative dialogs

### Quick Overview
- **16 Converted States** (42% complete)
- **66 Declarative Transitions** documented
- **3-Level Hierarchy**: Hub/Game → Dialog (L1) → Sub-dialog (L2) → Modal (L3)
- **8 Duplicate Functions** need cleanup (see reference doc)

### Key Files
- `declarative-dialog-engine.js` - Core state machine engine
- `dialog-config.js` - State configurations
- `dialog-integration.js` - Content generators and actions
- `modal-engine.js` - Legacy modal system (being phased out)

### Common Usage
```javascript
// Navigate to dialog
this.dialogEngine.navigateTo('character');

// Refresh current dialog (e.g., after data change)
this.dialogEngine.navigateTo('arsenal', null, true);

// Navigate back
this.dialogEngine.back();

// Close dialog
this.dialogEngine.close();
```

### ⚠️ Important: Cleanup Needed
These imperative functions still exist alongside declarative versions:
- `showCharacterSheet()` → use `navigateTo('character')`
- `showArsenal()` → use `navigateTo('arsenal')`
- `showPauseMenu()` → use `navigateTo('pause-menu')`
- `showAgentManagement()` → use `navigateTo('agent-management')`
- `showResearchLab()` → use `navigateTo('research-lab')`
- `showHallOfGlory()` → use `navigateTo('hall-of-glory')`
- ~~`showMissionSelectDialog()`~~ → **REMOVED** - now fully declarative
- `showNPCDialog()` → use `navigateTo('npc-interaction')`

See GAME_STATE_REFERENCE.md Section "Cleanup Tasks" for complete list.

## Automated Testing Framework

### Overview
A lightweight, browser-native test framework has been implemented to validate dialog conversions and state transitions. No build process required - tests run directly in the browser.

### Running Tests
```bash
# Open test runner in browser
start test-runner.html

# Or with auto-run
start test-runner.html?auto=true
```

### Test Architecture
```
test-runner.html          # Main test interface
├── js/test-framework.js  # Core test runner (describe, it, assertions)
├── tests/
│   ├── dialog-test-suite.js    # Dialog conversion parity tests
│   └── state-machine-tests.js  # Transition validation tests
```

### Key Test Capabilities
1. **Dialog Parity Testing**: Compares imperative vs declarative implementations
2. **State Machine Validation**: Tests all 66 documented transitions
3. **Navigation Stack Testing**: Validates proper stack management
4. **Refresh Behavior**: Ensures no flicker during updates
5. **Button Action Testing**: Verifies all buttons work correctly
6. **Keyboard Shortcut Testing**: Validates all key bindings

### Writing Tests
```javascript
describe('My Test Suite', () => {
    it('should do something', async () => {
        // Arrange
        game.dialogEngine.navigateTo('arsenal');
        await sleep(100);

        // Act
        const state = captureDialogState();

        // Assert
        assertEqual(state.title, 'ARSENAL');
        assertTruthy(state.buttons.length > 0);
    });
});
```

### Test Coverage Goals
- All 16 declarative dialog states
- All 66 documented transitions
- All 7 duplicate function pairs
- Complete navigation cycles
- Keyboard shortcuts
- Refresh behaviors

### CI/CD Integration (Future)
```yaml
# Can be integrated with GitHub Actions
npm install -g playwright
npx playwright test --config=test.config.js
```

## Recent Refactoring (2025-09-20)

### Mission Selection Dialog
The mission selection dialog has been fully converted to the declarative system:
- Old `showMissionSelectDialog()` function has been **completely removed**
- Now uses `dialogEngine.navigateTo('mission-select-hub')`
- HTML dialog elements removed from index.html
- Full state management through declarative dialog engine

### Remaining Duplicate Functions
7 functions still have both imperative and declarative versions:
- `showAgentManagement()` (line 240)
- `showArsenal()` (line 248)
- `showResearchLab()` (line 256)
- `showResearchLabOld()` (line 263) - to be deleted
- `showHallOfGlory()` (line 195)
- `showPauseMenu()` (line 1861)
- `showCharacterSheet()` (game-rpg-ui.js line 8)
- `showNPCDialog()` (modal-engine.js line 998)

See GAME_STATE_REFERENCE.md for complete cleanup list.

## Declarative Configuration Systems

The game uses comprehensive declarative configurations for all dynamic content, allowing modification without code changes.

### Audio Configuration (game-music-config.js)

#### Global Audio Settings
```javascript
global: {
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    fadeInTime: 2000,
    fadeOutTime: 1000,
    crossfadeTime: 1500
}
```

#### Screen Music Configuration
Each screen can have multiple tracks with transitions. The music system uses intelligent continuation and conditional timing:

**Critical Music Flow Behavior:**
1. **Splash Screen**: Plays `game-music.mp3` from 0 seconds
2. **Menu Screen**:
   - If splash was SKIPPED → starts at 10.6 seconds (skips intro)
   - If splash NOT skipped → continues naturally from where splash left off
3. **Hub Screen**: Continues same music track without restart (type: 'continue')

```javascript
screens: {
    splash: {
        tracks: {
            main: {
                file: 'game-music.mp3',
                fallback: 'music/global/menu.mp3',
                volume: 0.5,
                loop: true,
                fadeIn: 1000,
                startTime: 0  // Always start from beginning
            }
        },
        events: [{
            id: 'skip',
            trigger: 'user_input',
            action: 'transitionToMenu',
            markSkipped: true  // Sets splashSkipped flag
        }],
        transitions: {
            toMenu: { type: 'continue' }  // Music continues, doesn't restart
        }
    },
    menu: {
        tracks: {
            main: {
                file: 'game-music.mp3',  // Same file as splash
                volume: 0.6,
                loop: true,
                fadeIn: 2000,
                startTime: 10.6,  // Skip intro if splash was skipped
                startTimeCondition: 'splashSkipped'  // ONLY use startTime if condition met
            }
        },
        transitions: {
            toHub: {
                type: 'continue',  // Continue same music
                volumeAdjust: 0.8  // Reduce volume in hub
            }
        }
    },
    hub: {
        tracks: {
            ambient: {  // Note: 'ambient' not 'main' for hub
                file: 'game-music.mp3',
                volume: 0.5,
                loop: true,
                fadeIn: 1500
                // No startTime - continues from current position
            },
            alert: {  // Secondary track for special events
                file: 'music/screens/hub-alert.mp3',
                volume: 0.7,
                loop: false,
                priority: 2,
                trigger: 'low_resources'
            }
        }
    }
}
```

**Important Implementation Notes:**
- Campaign music config MUST match this exact structure with `tracks` wrapper
- The `startTimeCondition` is critical for proper skip behavior
- Hub uses `ambient` track name, not `main`
- All screens use same `game-music.mp3` for seamless transitions
- Transition `type: 'continue'` prevents music restart between screens

#### Mission Music Configuration
Dynamic multi-track system with state-based switching:
```javascript
missions: {
    default: {
        ambient: { file: 'ambient.mp3', volume: 0.6, loop: true },
        combat: { file: 'combat.mp3', volume: 0.8, priority: 2 },
        stealth: { file: 'stealth.mp3', volume: 0.4, priority: 1 },
        alert: { file: 'alert.mp3', volume: 0.7, priority: 3 },
        victory: { file: 'victory.mp3', volume: 0.8, priority: 10 }
    }
}
```

#### Sound Effects Configuration
Comprehensive SFX with fallback chain:
```javascript
soundEffects: {
    combat: {
        shoot: {
            file: 'sfx-shoot.wav',      // Primary file
            fallback: 'sfx-shoot.mp3',  // Secondary fallback
            procedural: true,            // Generate if files missing
            volume: 0.5,
            variations: ['sfx-shoot-1.wav', 'sfx-shoot-2.wav']
        }
    }
}
```

#### Contextual Sound System
Environment and state-based modifications:
```javascript
contextualSounds: {
    environments: {
        industrial: {
            footstep: { volume: 0.3, reverb: 0.7 },
            shoot: { volume: 0.6, echo: true }
        }
    },
    states: {
        stealth: { volumeMultiplier: 0.5 },
        combat: { volumeMultiplier: 1.2 },
        critical: { hit: { volume: 0.8, vibration: [100] } }
    }
}
```

#### Procedural Sound Templates
ADSR synthesis for missing files:
```javascript
proceduralSettings: {
    templates: {
        explosion: {
            waveform: 'noise',
            frequency: 50,
            duration: 500,
            envelope: {
                attack: 0,
                decay: 100,
                sustain: 200,
                release: 200
            },
            filter: { type: 'lowpass', frequency: 200 }
        }
    }
}
```

### Campaign Configuration (campaigns/*/)

#### Campaign Structure
```
campaigns/
├── main/           # Main campaign
│   ├── act1/       # Act 1 missions
│   │   ├── main-01-001.js
│   │   ├── main-01-002.js
│   │   └── main-01-003.js
│   ├── act2/       # Act 2 missions
│   │   ├── main-02-001.js
│   │   └── main-02-002.js
│   ├── campaign-config.js  # Campaign configuration and RPG settings
│   └── campaign-content.js # Campaign agents, weapons, UI strings
```

#### Mission Configuration
Each mission is self-contained with embedded map:
```javascript
{
    id: 'main-01-001',
    name: 'Initiation',
    briefing: 'Infiltrate the corporate facility...',
    map: {
        embedded: {
            tiles: [  // String array, one row per string
                "########...",
                "#......#..."
            ],
            spawn: { x: 2, y: 78 },
            extraction: { x: 78, y: 2 },
            terminals: [
                { x: 10, y: 20, id: 't1', hackTime: 3000 }
            ],
            doors: [
                { x: 15, y: 25, locked: true, linkedTerminal: 't1' }
            ],
            npcs: [
                {
                    id: 'informant',
                    x: 20, y: 30,
                    name: 'Ghost',
                    quests: [...]
                }
            ]
        }
    },
    objectives: [
        {
            id: 'eliminate_targets',
            type: 'eliminate',
            description: 'Eliminate all enemies',
            target: { type: 'enemy', count: 8 },
            required: true
        }
    ],
    rewards: {
        credits: 2000,
        researchPoints: 50,
        worldControl: 1
    }
}
```

### Visual Effects Configuration (Planned)

#### Screen Shake Effects
```javascript
visualEffects: {
    screenShake: {
        explosion: {
            intensity: 10,
            duration: 500,
            falloff: 'exponential'
        },
        hit: {
            intensity: 3,
            duration: 200,
            falloff: 'linear'
        }
    },
    freeze: {
        victory: { duration: 1000 },
        defeat: { duration: 2000 }
    }
}
```

### Benefits of Declarative Configuration

1. **No Code Changes Required**: Modify game behavior through JSON
2. **Centralized Management**: All configs in dedicated files
3. **Version Control Friendly**: Track config changes separately
4. **Modding Support**: Easy for users to customize
5. **Validation**: Configs can be validated against schemas
6. **Hot Reloading**: Potential for runtime config updates
7. **A/B Testing**: Easy to swap configurations
8. **Documentation**: Self-documenting structure

## Coordinate Systems and Camera Transforms

### Critical Insight: Turn-Based Overlay Rendering

The turn-based overlay rendering requires special attention to coordinate transforms:

#### The Problem
```javascript
// In game-rendering.js render():
ctx.save();
ctx.translate(this.cameraX, this.cameraY);  // Apply camera transform
// ... render game world ...
ctx.restore();  // Remove camera transform

// Then AFTER restore:
if (this.turnBasedMode && this.renderTurnBasedOverlay) {
    this.renderTurnBasedOverlay();  // Called WITHOUT camera transform!
}
```

#### The Solution
When rendering overlays AFTER `ctx.restore()`, you must ADD camera offset, not subtract:

```javascript
// WRONG - This assumes camera transform is active:
const iso = this.worldToIsometric(tile.x, tile.y);
const screenX = iso.x - this.cameraX;  // ❌ Subtracting camera
const screenY = iso.y - this.cameraY;

// CORRECT - Add camera to position correctly in screen space:
const iso = this.worldToIsometric(tile.x, tile.y);
const screenX = iso.x + this.cameraX;  // ✅ Adding camera
const screenY = iso.y + this.cameraY;
```

#### Key Coordinate Systems

1. **World Coordinates**: Game logic coordinates (agents, enemies, tiles)
2. **Isometric Coordinates**: World converted to isometric screen space (no camera)
3. **Screen Coordinates**: Final pixel positions after camera transform

#### Conversion Functions

- `worldToIsometric(x, y)`: Converts world to isometric (no camera)
- `screenToIsometric(x, y)`: Converts screen pixels to isometric
- `screenToWorld(x, y)`: Full conversion from screen to world (includes camera)

#### Debugging Tips

If overlays appear at wrong positions:
1. Check if rendering happens before or after `ctx.restore()`
2. If after restore, ADD camera offset instead of subtracting
3. Verify click detection uses same coordinate system as rendering
4. Test with visible debug rectangles at known positions

## Recent Fixes and Common Issues

### Modal and Dialog System Architecture

#### Modal Engine vs Declarative Dialog System
The game uses two complementary dialog systems:
1. **Modal Engine** (`modal-engine.js`): Handles confirmation dialogs, alerts, and stacked modals
   - Base z-index: 20000 (ensures it appears above everything)
   - Used for: Confirmations, alerts, pause menu
2. **Declarative Dialog Engine** (`declarative-dialog-engine.js`): Handles complex game dialogs
   - Base z-index: 9000
   - Used for: Arsenal, Character Sheet, complex UI panels

#### Z-Index Layering Strategy
```css
/* Game canvas and UI: 1-1000 */
/* HUD elements: 1000-5000 */
/* Declarative dialogs: 9000-9999 */
/* Modal engine dialogs: 20000+ */
```

#### Common Modal Issues and Fixes

**Problem**: Confirmation dialogs appearing behind Arsenal/Equipment dialog
**Cause**: Z-index conflict between modal systems
**Solution**: Increased modal engine base z-index from 10000 to 20000

**Problem**: Modal blocking after buy/sell confirmation
**Cause**: Double-close conflict when modal auto-closes and code also tries to close
**Solution**: Added `closeAfter: false` property to button config:
```javascript
{
    text: 'BUY',
    closeAfter: false,  // Prevent auto-close
    action: () => {
        // Perform action
        this.activeModal.close();  // Manual close
    }
}
```

**Problem**: Dialog fade in/out on every refresh
**Cause**: `refreshEquipmentUI()` was re-navigating to dialog instead of updating content
**Solution**: Update content directly without re-navigation:
```javascript
const dialogEl = document.getElementById('dialog-arsenal');
if (dialogEl && this.generateEquipmentManagement) {
    const contentEl = dialogEl.querySelector('.dialog-body');
    if (contentEl) {
        contentEl.innerHTML = this.generateEquipmentManagement();
    }
}
```

### Declarative Dialog System Integration

For complete conversion instructions, see **DIALOG_CONVERSION_GUIDE.md**.

The guide covers:
- 5-step conversion process (Find, Extract, Wrap, Connect, Test)
- Preservation rules to avoid breaking functionality
- Common mistakes and how to avoid them
- When to stop and ask for help

Quick reference:
```javascript
// OLD - Imperative
this.showHudDialog('TITLE', content, buttons);

// NEW - Declarative
this.dialogEngine.navigateTo('dialog-state');
```

### Equipment System Initialization
**Problem**: Agent loadouts showing empty in dialog
**Cause**: Equipment system initialized before agents loaded from campaign
**Solution**: Re-initialize loadouts after campaign content loads:
```javascript
// In campaign-integration.js after loading agents:
if (this.activeAgents.length > 0) {
    this.activeAgents.forEach(agent => {
        if (!this.agentLoadouts[agent.id]) {
            this.agentLoadouts[agent.id] = {
                weapon: null, armor: null,
                utility: null, special: null
            };
        }
    });
}
```

### Dialog Positioning Issues
**Problem**: Equipment dialog jumps to bottom-right after opening
**Cause**: CSS transform conflicts and flexbox layout issues
**Solution**: Added specific CSS rules:
```css
#equipmentDialog {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
}

#equipmentDialog .dialog-content {
    position: relative !important;
    transform: none !important;
    margin: auto !important;
}
```

### Service Worker Caching
**Problem**: Updates not appearing, stale content cached
**Solution**: Service worker disabled during development:
- Renamed `service-worker.js` to `service-worker.js.disabled`
- Added auto-unregister code in index.html
- Added no-cache meta tags

### Declarative Dialog Action Routing
**Problem**: Execute actions not finding registered handlers
**Cause**: Execute handler only checked game functions, not registered actions
**Solution**: Updated execute handler to check registered actions first:
```javascript
const registeredHandler = this.actionRegistry.get(actualFuncName);
if (registeredHandler) {
    registeredHandler.call(this, params || context);
    return;
}
```

### Dialog Refresh Without Blinking or Closing
**Problem**: Dialog closes or blinks when refreshing content (e.g., after sell/buy actions)
**Causes & Solutions**:

1. **Dialog Engine Access**
   - **Issue**: `game.dialogEngine.generators` is undefined
   - **Fix**: Use `window.declarativeDialogEngine` or `window.dialogEngine`:
   ```javascript
   const dialogEngine = game.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
   if (dialogEngine && dialogEngine.navigateTo) {
       dialogEngine.navigateTo('arsenal');
   }
   ```

2. **Dialog Closing on Refresh**
   - **Issue**: `updateStateStack()` was closing dialog when navigating to same state
   - **Fix**: Skip stack update when refreshing:
   ```javascript
   const isRefresh = this.currentState === stateId;
   if (!isRefresh) {
       this.updateStateStack(stateId, state);
   }
   ```

3. **Blinking/Fade Animation on Refresh**
   - **Issue**: Exit and enter transitions running even for refresh
   - **Fix**: Skip animations and update content in-place:
   ```javascript
   if (isRefresh && dialogEl) {
       const contentEl = dialogEl.querySelector('.dialog-content');
       if (contentEl) {
           contentEl.innerHTML = content;
       }
       return; // Skip animations and re-adding to DOM
   }
   ```

4. **Duplicate Event Handlers**
   - **Issue**: Re-binding event handlers without removing old ones
   - **Fix**: Don't re-bind handlers on refresh (HTML onclick still works)

**Best Practice for UI Refresh**:
```javascript
// For sell/buy operations, preserve state and navigate
const wasInSellMode = game.currentInventoryMode === 'sell';
if (wasInSellMode) {
    game.currentInventoryMode = 'sell';
}
dialogEngine.navigateTo('arsenal'); // Will refresh without blinking
```