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
- **game-audio.js**: Complete audio system
- **game-music-system.js**: Dynamic multi-track mission music system with event triggers
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

### Campaign Files (campaigns/ directory)
- **campaigns/main/**: Main campaign with 5 acts
  - **act1/**: Missions main-01-001.js through main-01-003.js
  - **act2/**: Missions main-02-001.js and main-02-002.js
  - Each mission file contains complete embedded map data and all mission-specific content

### REMOVED/DEPRECATED FILES
- **game-maps.js**: DELETED - no procedural generation, all maps embedded
- **game-maps-data.js**: DELETED - maps now embedded in mission files
- **game-missions-data.js**: DELETED - missions now in campaign files

### Other Files
- **cyberops-game.html**: HTML structure with module loading
- **cyberops-game.css** (2579 lines): All styling including animations, HUD, and screen transitions

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
- **Audio System**: Dynamic music system with mission-specific multi-track support
  - Ambient, combat, stealth, alert, and victory tracks per mission
  - Event-triggered music changes (objectives, health, timer)
  - Smooth crossfading between tracks with priority system
  - Fallback to global tracks if mission tracks unavailable
- **Resource Management**: Credits, research points, world control percentage
- **Agent System**: Agent selection, abilities, equipment, movement, and combat
- **NPC System**: Interactive NPCs with dialog trees, quest system, context-sensitive actions
- **Game Speed**: Adjustable game speed (1x/2x/4x) with auto-slowdown near enemies
- **Keyboard System**: Centralized keyboard handling with customizable bindings
- **Interaction System**: Universal H key for terminals, explosives, switches, gates, NPCs
- **Objective Tracking**: Real-time mission progress with extraction point activation

## Running the Game

The game is a standalone HTML file that can be opened directly in a browser. No build process or server required.

```bash
# Simply open the HTML file in a browser
# Or use a local server for better performance:
python -m http.server 8000
# Then navigate to http://localhost:8000/cyberops-game.html
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
- **Dialog System**: HTML-based dialog boxes with typing animation effect
- **Quest System**: Side quests with objectives, rewards, and completion tracking
- **Context-Sensitive Actions**: NPCs offer different options based on nearby objects (terminals, enemies)
- **3D Integration**: NPCs render in both 2D and 3D modes with interaction indicators
- **Coordinate System**: NPCs use world coordinates, properly converted for screen rendering

### Keyboard Handling (game-keyboard.js)
- **Centralized Bindings**: All keyboard shortcuts in one place for easy modification
- **Key Features**:
  - H: Interact with NPCs or hack
  - Z: Cycle game speed (1x/2x/4x)
  - J: Show comprehensive mission list
  - E: Toggle 3D modes (tactical/third/first person)
  - Tab: Cycle through agents
  - 1-6: Direct agent selection

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

## Campaign and Mission Architecture

### Complete Separation of Engine and Content
The game achieves "3rd normal form" - the engine knows NOTHING about specific campaigns or missions. All content is loaded dynamically from external campaign files.

### Campaign System
- **Campaign Files**: Each campaign is a directory with acts and missions
- **Mission Files**: Self-contained JavaScript files with embedded maps
- **Dynamic Loading**: `game-campaign-integration.js` loads campaigns at runtime
- **No Hardcoded Content**: Engine contains zero mission-specific code

### Campaign Loading Process
1. **HTML loads**: cyberops-game.html includes game-campaign-integration.js
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

### Mission Flow
1. Mission loads from JSON definition
2. Map generates from declarative data (preserving original layouts)
3. Objectives tracked via `missionTrackers` counters
4. Extraction enables when all required objectives complete
5. Mission completes when agents reach extraction point

### Special Interactions
All interactions use the H key with context-sensitive behavior:
- **Terminals**: Hack to unlock doors or complete objectives
- **Explosives**: Plant bombs at designated targets (Mission 3)
- **Switches**: Activate to disable alarms or systems
- **Gates**: Breach fortified entrances (Mission 5)
- **NPCs**: Engage in dialog and receive quests

### Mission Integration
- `game-mission-executor.js`: Generic objective checking, no hardcoded logic
- `game-mission-integration.js`: Bridges new system with legacy code
- `useActionAbility()`: Universal interaction handler
- Fallback system allows interactions even when not mission objectives

### Map System
- **Embedded Maps Only**: All maps are embedded in mission files as string arrays
- **String-Based Format**: Each tile row is a string, '#' for walls, '.' for floors
- **Efficient Storage**: ~150 lines per mission vs 14,000+ lines in old format
- **Map Dimensions**: Corporate (80x80), Government (90x70), Industrial (100x80), etc.
- **NO Procedural Generation**: All procedural generation code completely removed

## Critical Architecture Principles

### NEVER Use Old Approaches
- **NEVER** create procedural map generation - all maps are embedded
- **NEVER** hardcode mission data in engine files
- **NEVER** put NPCs, quests, or content in engine code
- **NEVER** use browser-based tools for data conversion - use Node.js
- **ALWAYS** keep complete separation between engine and content
- **ALWAYS** use campaign files for all mission-specific content

### Content Location Rules
- **Mission Content**: ONLY in `campaigns/*/act*/mission.js` files
- **Engine Code**: ONLY generic systems in `js/game-*.js` files
- **NPCs and Quests**: ONLY in mission definition files
- **Maps**: ONLY as embedded string arrays in mission files

## Major Cleanup Process Completed

### What Was Removed
1. **Procedural Map Generation**: 973 lines reduced to 22-line stub
2. **Hardcoded NPCs**: 400+ lines of NPCs removed from game-npc.js
3. **Hardcoded Missions**: All mission data moved to campaign files
4. **game-maps-data.js**: Completely deleted (was 14,000+ lines)
5. **game-missions-data.js**: Completely deleted
6. **Intermediate Tools**: All test HTML files and conversion scripts removed

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

### Debugging
- Console logging for major events with emojis for easy identification
- Debug flags for pathfinding, vision cones, etc.
- Comprehensive error messages with context
- Check console for mission system initialization messages

## Common Issues and Solutions

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

### Mission System Issues
- **Extraction Not Working**: Check if `extractionEnabled = true` when objectives complete
- **Objectives Not Tracking**: Verify `missionTrackers.enemiesEliminated` increments
- **H Key Not Working**: Ensure `useActionAbility()` exists and checks all interaction types
- **Mission Not Loading**: Check console for "Setting currentMissionDef" message

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