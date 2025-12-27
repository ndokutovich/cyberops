# Keyboard Bindings Reference

This document lists all keyboard bindings in CyberOps: Syndicate.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 UNIFIED KEYBOARD SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│  KeyboardDispatcherService (single document listener)           │
│  ├── KEY_REBIND (5) - Settings key capture (highest priority)   │
│  ├── CUTSCENE (4)   - Cutscene controls                         │
│  ├── MODAL (3)      - Modal dialogs                             │
│  ├── DIALOG (2)     - Declarative dialog system                 │
│  ├── GAME (1)       - Gameplay keys                             │
│  └── GLOBAL (0)     - Always-active (audio enable)              │
├─────────────────────────────────────────────────────────────────┤
│  KeybindingService - Source of truth, saved to localStorage     │
└─────────────────────────────────────────────────────────────────┘
```

## Rebindable Keys (via Settings)

All keys below can be rebound in Settings > Keyboard.

### Agent Control
| Key | Action | Description |
|-----|--------|-------------|
| `1` | selectAgent1 | Select Agent 1 |
| `2` | selectAgent2 | Select Agent 2 |
| `3` | selectAgent3 | Select Agent 3 |
| `4` | selectAgent4 | Select Agent 4 |
| `5` | selectAgent5 | Select Agent 5 |
| `6` | selectAgent6 | Select Agent 6 |
| `Tab` | cycleAgents | Cycle through agents |
| `T` | selectAllAgents | Select all squad members |

### Combat
| Key | Action | Description |
|-----|--------|-------------|
| `F` | fire | Fire/Shoot at target |
| `G` | grenade | Throw grenade |
| `R` | reload | Reload weapon (not implemented) |
| `Q` | shield | Activate shield ability |

### Abilities
| Key | Action | Description |
|-----|--------|-------------|
| `H` | hack | Hack terminal / Interact with NPC |
| `E` | stealth | Toggle 3D camera mode |

### Team Commands
| Key | Action | Description |
|-----|--------|-------------|
| `X` | teamHold | Team: Hold position |
| `N` | teamPatrol | Team: Patrol area |
| `V` | teamFollow | Team: Follow leader |

### Camera & View
| Key | Action | Description |
|-----|--------|-------------|
| `=` | zoomIn | Zoom in |
| `-` | zoomOut | Zoom out |
| `Home` | centerCamera | Center camera on agents |
| `L` | toggleSquadFollow | Toggle squad camera follow |

### User Interface
| Key | Action | Description |
|-----|--------|-------------|
| `C` | characterSheet | Open character sheet |
| `I` | inventory | Open inventory |
| `J` | missionProgress | Show mission progress |
| `M` | toggleEventLog | Toggle mission/event log |
| `?` | toggleHotkeyHelp | Show hotkey help overlay |

### Game Control
| Key | Action | Description |
|-----|--------|-------------|
| `Space` | pause | Toggle turn-based mode / Pause |
| `Y` | endTurn | End current turn (turn-based) |
| `B` | gridSnap | Toggle grid snap (turn-based) |
| `Z` | cycleSpeed | Cycle game speed (1x/2x/4x) |
| `F5` | quickSave | Quick save game |
| `F9` | quickLoad | Quick load game |

### Debug
| Key | Action | Description |
|-----|--------|-------------|
| `P` | togglePaths | Show pathfinding visualization |
| `O` | togglePathfinding | Toggle pathfinding on/off |
| `U` | toggleFogOfWar | Toggle fog of war |

## Non-Rebindable Keys

These keys have special behavior and cannot be rebound:

| Key | Context | Description |
|-----|---------|-------------|
| `Escape` | Global | Close dialog / Open pause menu |
| `W/A/S/D` | 3D Mode | Camera movement (tracked separately) |
| `0` | Debug | Force enable extraction point |
| `1-9` | Modal | Select NPC dialog options |
| `Space` | Cutscene | Advance cutscene |
| `Enter` | Cutscene | Advance cutscene |

## Available Keys (Not Used)

### Letters
| Key | Notes |
|-----|-------|
| `A` | Reserved for 3D movement |
| `D` | Reserved for 3D movement |
| `K` | Available |
| `S` | Reserved for 3D movement |
| `W` | Reserved for 3D movement |

### Numbers
| Key | Notes |
|-----|-------|
| `7` | Available |
| `8` | Available |
| `9` | Available (used in modals for NPC choices) |

### Function Keys
| Key | Notes |
|-----|-------|
| `F1` | Available (could be Help) |
| `F2` | Available |
| `F3` | Available |
| `F4` | Available |
| `F6` | Available |
| `F7` | Available |
| `F8` | Available |
| `F10` | Available |
| `F11` | Browser fullscreen (avoid) |
| `F12` | Browser DevTools (avoid) |

### Special Keys
| Key | Notes |
|-----|-------|
| `` ` `` | Available (console in many games) |
| `[` | Available |
| `]` | Available |
| `\` | Available |
| `;` | Available |
| `'` | Available |
| `,` | Available |
| `.` | Available |
| `/` | Available (without Shift) |
| `Insert` | Available |
| `Delete` | Available |
| `End` | Available |
| `Page Up` | Available |
| `Page Down` | Available |

### Modifier Combinations (Not Implemented)
The system currently does not support modifier key combinations, but these could be added:
- `Ctrl+S` - Save
- `Ctrl+Z` - Undo
- `Shift+Tab` - Cycle agents reverse
- `Alt+1-6` - Quick ability slots

## Files

| File | Purpose |
|------|---------|
| `js/services/keyboard-dispatcher-service.js` | Central event routing |
| `js/services/keybinding-service.js` | Binding storage & management |
| `js/game-keyboard.js` | Action handlers |
| `js/game-settings.js` | Key rebinding UI logic |
| `js/dialog-integration.js` | Settings dialog generator |

## Adding New Bindings

1. Add to `KeybindingService.initializeDefaults()`:
```javascript
this.registerBinding('actionName', 'K', 'Description', 'category');
```

2. Add handler to `game-keyboard.js` actionHandlers:
```javascript
actionName: () => { this.doSomething(); },
```

3. Implement the function in appropriate game file.

## User Customization

User key bindings are saved to `localStorage` under key `cyberops_keybindings`.

To reset all bindings:
```javascript
localStorage.removeItem('cyberops_keybindings');
location.reload();
```
