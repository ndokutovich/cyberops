# CyberOps: Syndicate

A browser-based cyberpunk tactical strategy game featuring isometric combat, resource management, and a strategic campaign system. Built with vanilla JavaScript, HTML5 Canvas, and Three.js for optional 3D rendering.

## Features

### Core Gameplay
- **Tactical Combat**: Isometric turn-based tactical combat with line-of-sight mechanics
- **Mission System**: 5 unique missions with dynamic objectives and extraction mechanics
- **Agent Management**: Control up to 6 agents with unique abilities and equipment
- **Resource System**: Manage credits, research points, and world control percentage
- **3D Mode**: Toggle between 2D isometric and full 3D view with multiple camera modes

### Advanced Systems
- **NPC Interactions**: Dialog trees, side quests, and context-sensitive actions
- **Dynamic Objectives**: Hack terminals, plant explosives, eliminate targets, breach gates
- **Game Speed Control**: Adjustable speed (1x/2x/4x) with auto-slowdown near enemies
- **Save System**: Multiple save slots with auto-save and pre-mission checkpoint
- **Audio System**: Dynamic level-specific music and sound effects

## Quick Start

No installation or build process required!

```bash
# Option 1: Open directly in browser
# Simply open index.html in any modern browser

# Option 2: Use local server for better performance
python -m http.server 8000
# Navigate to http://localhost:8000/
```

## Controls

### Keyboard Shortcuts
- **1-6**: Select specific agent
- **Tab**: Cycle through agents
- **H**: Universal interact (hack terminals, plant explosives, talk to NPCs)
- **E**: Toggle 3D view modes (tactical/third-person/first-person)
- **Z**: Cycle game speed (1x/2x/4x)
- **J**: Show mission objectives and quest list
- **M**: Toggle minimap
- **P**: Pause game
- **Esc**: Return to menu

### Mouse Controls
- **Left Click**: Select agent, move to location, interact with objects
- **Right Click**: Attack enemy or use ability
- **Scroll**: Zoom in/out
- **Middle Drag**: Pan camera

## Mission Overview

1. **Corporate Infiltration**: Breach corporate defenses and eliminate security forces
2. **Data Heist**: Hack multiple terminals to steal valuable data
3. **Sabotage Operation**: Plant explosives and survive the countdown
4. **Silent Elimination**: Eliminate targets without alerting witnesses
5. **Final Assault**: Breach fortified gates and capture the mainframe

## Game Architecture

### Modular Design
The game uses a prototype-based JavaScript architecture split across specialized modules:

- **Core Systems**: Initialization, game loop, event handling
- **Mission Engine**: JSON-based declarative mission definitions
- **Rendering**: 2D Canvas and Three.js 3D rendering pipelines
- **AI Systems**: Enemy pathfinding and behavior
- **UI/UX**: HUD, dialogs, screen transitions

### Key Technologies
- **HTML5 Canvas**: Primary 2D rendering
- **Three.js**: Optional 3D visualization
- **Vanilla JavaScript**: No framework dependencies
- **CSS3**: Animations and UI styling

## Development

### Project Structure
```
cyberops-game/
├── cyberops-game.html      # Main game file
├── cyberops-game.css       # All styling
├── js/                     # Game modules
│   ├── game-core.js        # Core initialization
│   ├── game-loop.js        # Main game loop
│   ├── game-rendering.js   # 2D rendering
│   ├── game-3d.js          # 3D rendering
│   ├── game-missions-data.js # Mission definitions
│   └── ...                 # Other modules
└── three.js                # Three.js library
```

### Adding New Features

#### Creating a New Mission
1. Add mission definition to `game-missions-data.js`
2. Define objectives using OBJECTIVE_TYPES
3. Set up map layout in `game-maps-data.js`
4. Test extraction and completion flow

#### Adding NPCs
1. Define NPC in mission's `npcs` array
2. Add dialog trees and quest definitions
3. Implement quest objectives and rewards
4. Test interaction with H key

## Performance Tips

- Use Chrome or Firefox for best performance
- Enable hardware acceleration in browser settings
- Close other tabs when playing
- Lower resolution if experiencing lag in 3D mode

## Browser Compatibility

- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Supported (may need to enable WebGL)
- **Edge**: Full support

## Known Issues

- Audio may require initial user interaction to enable
- 3D mode performance varies by hardware
- Save files stored in browser localStorage (clear cache will delete saves)

## Credits

Created as a tribute to classic tactical strategy games with modern web technologies.

## License

This is a personal project for educational and entertainment purposes.