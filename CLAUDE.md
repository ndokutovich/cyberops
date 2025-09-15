# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CyberOps: Syndicate is a browser-based cyberpunk tactical game built with vanilla JavaScript, HTML5 Canvas, and Three.js for 3D rendering. The game features isometric tactical combat, resource management, and a strategic campaign system.

## Architecture

The game uses a modular JavaScript architecture with the main `CyberOpsGame` class split across multiple files for better organization. All functionality remains exactly the same, just divided into logical modules:

### JavaScript Modules (js/ directory)
- **game-core.js**: Core constructor and initialization
- **game-events.js**: Event handlers and input management
- **game-maps.js**: Map generation functions (procedural)
- **game-maps-data.js**: Declarative map definitions (JSON format)
- **game-flow.js**: Game flow, missions, and abilities
- **game-saveload.js**: Save/load system
- **game-hub.js**: Syndicate hub management
- **game-dialogs.js**: Dialog and HUD systems
- **game-screens.js**: Screen management and transitions
- **game-demoscene.js**: Demoscene attract mode
- **game-audio.js**: Complete audio system
- **game-loop.js**: Main game loop and update logic (includes game speed system)
- **game-rendering.js**: All rendering functions
- **game-3d.js**: Three.js 3D system with NPC support
- **game-utils.js**: Utility functions and getters/setters
- **game-keyboard.js**: Centralized keyboard handling system
- **game-npc.js**: NPC system with dialog, quests, and interactions
- **game-missions-data.js**: Declarative mission definitions (all 5 missions)
- **game-mission-executor.js**: Generic mission execution engine
- **game-mission-integration.js**: Bridges new system with existing code
- **game-init.js**: Game instantiation and initialization

### Other Files
- **cyberops-game.html** (660 lines): HTML structure with module loading
- **cyberops-game.css** (2579 lines): All styling including animations, HUD, and screen transitions
- **three.js**: Local Three.js library for 3D rendering capabilities

### Key Systems in CyberOpsGame Class

- **Screen Management**: splash, menu, hub, briefing, loadout, game, victory, defeat screens
- **Mission System**: Declarative JSON-based missions with dynamic objectives and extraction
- **Combat System**: Isometric tactical combat with agents, enemies, projectiles, line-of-sight
- **3D Mode**: Optional Three.js-based 3D view with multiple camera modes, includes NPC rendering
- **Audio System**: Dynamic music system with level-specific tracks and credits music
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

### 3D System Integration
- Three.js loaded from local file
- 3D mode toggleable with camera mode switching (tactical/third-person/first-person)
- 3D container and HUD separate from main canvas

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

## Mission System Architecture

### Declarative Mission Design
The game uses a comprehensive JSON-based mission system that separates data from logic:

- **MISSION_DEFINITIONS**: Array of mission objects with objectives, enemies, rewards
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
- **Procedural Generation**: Original maps in `game-maps.js`
- **Declarative Maps**: JSON definitions in `game-maps-data.js`
- **100% Position Preservation**: All spawn points, terminals, extraction points exact
- **Map Dimensions**: Corporate (80x80), Government (90x70), Industrial (100x80), etc.

## Development Best Practices

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

### Mission System Issues
- **Extraction Not Working**: Check if `extractionEnabled = true` when objectives complete
- **Objectives Not Tracking**: Verify `missionTrackers.enemiesEliminated` increments
- **H Key Not Working**: Ensure `useActionAbility()` exists and checks all interaction types
- **Mission Not Loading**: Check console for "Setting currentMissionDef" message

### Integration Checks
- **Script Order**: Maps data → Missions data → Executor → Integration
- **Constants**: OBJECTIVE_TYPES and INTERACTION_TARGETS must be defined
- **Initialization**: `initMissions()` called during game startup
- **Game Loop**: `updateMissionObjectives()` runs every frame

### Mission Specifics
- **Mission 1**: Eliminate 8 enemies, extraction at (78, 2)
- **Mission 2**: Hack 3 terminals for main objective
- **Mission 3**: Plant explosives, survive 60 seconds
- **Mission 4**: Eliminate targets without witnesses
- **Mission 5**: Breach gates, control sectors, capture mainframe