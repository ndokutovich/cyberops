# Modal System Conversion Status

## Overview
This document tracks the status of converting old modal/dialog systems to the new declarative dialog engine.

## Conversion Status Table

| Dialog/Modal | Location | Current System | Status | Priority | Effort | Notes |
|-------------|----------|----------------|---------|----------|---------|-------|
| **CHARACTER** | `game-rpg-ui.js` | Declarative | ✅ Converted | - | - | Full RPG sheet with roster |
| **ARSENAL** | `game-equipment.js` | Declarative | ✅ Converted | - | - | Equipment management with roster |
| **HIRE AGENTS** | `dialog-integration.js` | Declarative | ✅ Converted | - | - | Agent hiring with confirmations |
| **PAUSE MENU** | `game-flow.js` | Declarative | ⚠️ Partial | - | - | Basic conversion done |
| **Mission Briefing** | `game-flow.js` | showBriefingScreen() | ❌ Old | HIGH | 2-3h | Complex state, critical for game flow |
| **Loadout Selection** | `game-flow.js` | showLoadoutSelection() | ❌ Old | HIGH | 2h | Direct DOM manipulation |
| **Victory Screen** | `game-screens.js` | showVictoryScreen() | ❌ Old | HIGH | 2h | Needs animation support |
| **Defeat Screen** | `game-screens.js` | showDefeatScreen() | ❌ Old | HIGH | 2h | Retry options needed |
| **Save Dialog** | `game-saveload.js` | showHudDialog | ❌ Old | HIGH | 3-4h | Complex slot management |
| **Load Dialog** | `game-saveload.js` | showHudDialog | ❌ Old | HIGH | 3-4h | Preview functionality |
| **NPC Conversations** | `game-npc.js` | showNPCDialog() | ❌ Old | HIGH | 3-4h | Typing effects needed |
| **Research Lab** | `game-hub.js` | DialogManager | ❌ Old | MEDIUM | 1-2h | Hub functionality |
| **Intelligence Reports** | `game-hub.js` | showHudDialog | ❌ Old | MEDIUM | 1-2h | Data display |
| **World Map** | `game-hub.js` | Old dialog | ❌ Old | MEDIUM | 2h | Strategic overview |
| **Settings Menu** | `game-screens.js` | showHudDialog | ❌ Old | MEDIUM | 1h | User preferences |
| **Sell Confirmation** | `game-equipment.js:608` | showHudDialog | ❌ Old | MEDIUM | 30m | Transaction feedback |
| **Buy Confirmation** | `game-equipment.js:751` | showHudDialog | ❌ Old | MEDIUM | 30m | Transaction feedback |
| **Terminal Hacking** | `game-npc.js` | Custom HTML | ❌ Old | MEDIUM | 2h | Interactive UI |
| **Quest Dialogs** | `game-npc.js` | Modal engine | ❌ Old | MEDIUM | 2h | Quest management |
| **Side Mission Brief** | `game-npc.js` | Custom | ❌ Old | MEDIUM | 1h | Mission info |
| **Insufficient Funds** | `game-equipment.js:741` | showHudDialog | ❌ Old | LOW | 15m | Simple warning |
| **Cannot Sell Warning** | `game-equipment.js:583` | showHudDialog | ❌ Old | LOW | 15m | Simple warning |
| **Surrender Confirm** | `game-flow.js` | showHudDialog | ❌ Old | LOW | 30m | Simple confirmation |
| **Return Hub Confirm** | `game-flow.js` | showHudDialog | ❌ Old | LOW | 30m | Simple confirmation |
| **Delete Save Confirm** | `game-saveload.js` | showHudDialog | ❌ Old | LOW | 15m | Simple confirmation |
| **Overwrite Confirm** | `game-saveload.js` | showHudDialog | ❌ Old | LOW | 15m | Simple confirmation |
| **Splash Screen** | `game-screens.js` | Direct DOM | ❌ Old | LOW | 1h | One-time screen |
| **Main Menu** | `game-screens.js` | HTML-based | ❌ Old | LOW | 2h | Custom animations |
| **Credits Screen** | `game-screens.js` | Direct HTML | ❌ Old | LOW | 1h | Static content |

## Statistics
- **Total Dialogs**: 27
- **Converted**: 3 (11%)
- **Partially Converted**: 1 (4%)
- **Not Converted**: 23 (85%)

## Conversion Benefits
1. **Consistent UI/UX** - All dialogs use same system
2. **Better State Management** - Navigation stack, breadcrumbs
3. **Declarative Configuration** - Easier to modify
4. **Animation Support** - Built-in transitions
5. **Keyboard Navigation** - Standardized shortcuts
6. **Context-Aware Buttons** - Dynamic button text based on game state

## Recommended Conversion Order

### Phase 1: Mission Flow (HIGH priority)
1. Mission Briefing
2. Loadout Selection
3. Victory Screen
4. Defeat Screen

### Phase 2: Core Systems (HIGH priority)
1. Save/Load System
2. NPC Conversations

### Phase 3: Hub Features (MEDIUM priority)
1. Research Lab
2. Intelligence Reports
3. World Map
4. Settings Menu

### Phase 4: Confirmations (MEDIUM priority)
1. Buy/Sell Confirmations
2. Terminal Hacking
3. Quest Dialogs

### Phase 5: Simple Dialogs (LOW priority)
1. Warning dialogs
2. Confirmation dialogs
3. Static screens

## Notes
- Preserve special features during conversion (typing effects, save previews, etc.)
- Keep old systems functional during transition
- Use config-first approach in `dialog-config.js`
- Reuse components like agent roster where applicable

## Last Updated
2025-09-20