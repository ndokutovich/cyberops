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
- **game-loop.js**: Main game loop and update logic
- **game-rendering.js**: All rendering functions
- **game-3d.js**: Three.js 3D system
- **game-utils.js**: Utility functions and getters/setters
- **game-init.js**: Game instantiation and initialization

### Other Files
- **cyberops-game.html** (660 lines): HTML structure with module loading
- **cyberops-game.css** (2579 lines): All styling including animations, HUD, and screen transitions
- **three.js**: Local Three.js library for 3D rendering capabilities

### Key Systems in CyberOpsGame Class

- **Screen Management**: splash, menu, hub, briefing, loadout, game, victory, defeat screens
- **Mission System**: Campaign with multiple missions, objectives, enemy spawning
- **Combat System**: Isometric tactical combat with agents, enemies, projectiles, line-of-sight
- **3D Mode**: Optional Three.js-based 3D view with multiple camera modes
- **Audio System**: Dynamic music system with level-specific tracks and credits music
- **Resource Management**: Credits, research points, world control percentage
- **Agent System**: Agent selection, abilities, equipment, movement, and combat

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
- No external save system - state lives in memory during session