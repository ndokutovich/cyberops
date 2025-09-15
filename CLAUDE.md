# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CyberOps: Syndicate is a browser-based cyberpunk tactical game built with vanilla JavaScript, HTML5 Canvas, and Three.js for 3D rendering. The game features isometric tactical combat, resource management, and a strategic campaign system.

## Architecture

The game uses a modular JavaScript architecture with the main `CyberOpsGame` class split across multiple files for better organization. All functionality remains exactly the same, just divided into logical modules:

### JavaScript Modules (js/ directory)
- **game-core.js**: Core constructor and initialization
- **game-events.js**: Event handlers and input management
- **game-maps.js**: Map generation functions
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
- **game-init.js**: Game instantiation and initialization

### Other Files
- **cyberops-game.html** (660 lines): HTML structure with module loading
- **cyberops-game.css** (2579 lines): All styling including animations, HUD, and screen transitions
- **three.js**: Local Three.js library for 3D rendering capabilities

### Key Systems in CyberOpsGame Class

- **Screen Management**: splash, menu, hub, briefing, loadout, game, victory, defeat screens
- **Mission System**: Campaign with multiple missions, objectives, enemy spawning
- **Combat System**: Isometric tactical combat with agents, enemies, projectiles, line-of-sight
- **3D Mode**: Optional Three.js-based 3D view with multiple camera modes, includes NPC rendering
- **Audio System**: Dynamic music system with level-specific tracks and credits music
- **Resource Management**: Credits, research points, world control percentage
- **Agent System**: Agent selection, abilities, equipment, movement, and combat
- **NPC System**: Interactive NPCs with dialog trees, quest system, context-sensitive actions
- **Game Speed**: Adjustable game speed (1x/2x/4x) with auto-slowdown near enemies
- **Keyboard System**: Centralized keyboard handling with customizable bindings

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