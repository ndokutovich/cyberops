# Game State Reference
*Single source of truth for all game states and transitions*

## Quick Stats
- **38 Total States** (16 declarative, 22 imperative)
- **66 Declarative Transitions** (T01-T58 + T17a/b, T34a/b, T47a, T50a)
- **32 Imperative Transitions** (entry/menu/mission flow - listed separately)
- **98 Total Documented Transitions** (more exist in code)
- **42% States Converted** to declarative system
- **7 Duplicate Functions** need cleanup (1 removed: showMissionSelectDialog)

## State Inventory

### 🟢 Converted (Declarative) - 16 states

| State | Level | Parent | Imperative Duplicate | Status |
|-------|-------|--------|---------------------|---------|
| agent-management | 1 | hub | ⚠️ showAgentManagement() | Working |
| hire-agents | 2 | agent-management | - | Working |
| hire-confirm | 3 | hire-agents | - | Working |
| hire-success | 3 | hire-agents | - | Working |
| character | 1 | hub/game | ⚠️ showCharacterSheet() | Working |
| arsenal | 1 | hub/game | ⚠️ showArsenal() | Working |
| research-lab | 1 | hub | ⚠️ showResearchLab() + showResearchLabOld() | Working |
| tech-tree | 2 | research-lab | - | Working |
| hall-of-glory | 1 | hub | ⚠️ showHallOfGlory() | Working |
| mission-select-hub | 1 | hub | ✅ FULLY CONVERTED | Working |
| intel-missions | 1 | hub | - | Working |
| hub-settings | 1 | hub | - | Working |
| pause-menu | 1 | game | ⚠️ showPauseMenu() | Working |
| save-load | 2 | pause-menu | - | Working |
| settings | 2 | pause-menu | - | Working |
| npc-interaction | 1 | game | ⚠️ showNPCDialog() | Working |

### 🔴 Unconverted (Imperative) - 22 states

| State | Function | Priority | Effort | Notes |
|-------|----------|----------|--------|-------|
| **Entry/Menu** |||||
| initial | Page load | LOW | - | Bootstrap |
| splash | showSplashScreens() | LOW | 1h | One-time |
| menu | showMainMenu() | LOW | 2h | Custom animations |
| demoscene | startDemosceneIdleTimer() | LOW | 1h | Attract mode |
| credits | showCredits() | LOW | 1h | Static content |
| complete | showGameComplete() | LOW | 1h | End screen |
| **Hub** |||||
| hub | showSyndicateHub() | HIGH | 3h | Main hub screen |
| world-map | showWorldMap() | MEDIUM | 2h | Strategic view |
| **Mission Flow** |||||
| briefing | showBriefingScreen() | HIGH | 3h | Critical path |
| loadout | showLoadoutSelection() | HIGH | 2h | Critical path |
| game | startMission() | - | - | Core gameplay |
| victory | showVictoryScreen() | HIGH | 2h | Needs animations |
| defeat | showDefeatScreen() | HIGH | 2h | Retry options |
| **Modals** |||||
| terminal-hack | showTerminalHack() | MEDIUM | 2h | Mini-game |
| confirm-surrender | showHudDialog() | LOW | 30m | Simple |
| confirm-exit | showHudDialog() | LOW | 30m | Simple |
| insufficient-funds | showHudDialog() | LOW | 15m | Warning |
| save-confirm | showHudDialog() | LOW | 15m | Confirmation |
| load-confirm | showHudDialog() | LOW | 15m | Confirmation |
| delete-confirm | showHudDialog() | LOW | 15m | Confirmation |
| sell-confirm | Integrated in arsenal | - | - | ✅ Done |
| buy-confirm | Integrated in arsenal | - | - | ✅ Done |

## Complete Transition Matrix

### Hub → Level 1 Dialogs

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T01 | hub | agent-management | Card click | `navigateTo('agent-management')` | No |
| T02 | hub | character | Card/"C" | `navigateTo('character')` | No |
| T03 | hub | arsenal | Card/"I" | `navigateTo('arsenal')` | No |
| T04 | hub | research-lab | Card click | `navigateTo('research-lab')` | No |
| T05 | hub | hall-of-glory | Card click | `navigateTo('hall-of-glory')` | No |
| T06 | hub | mission-select-hub | Card click | `navigateTo('mission-select-hub')` | No |
| T07 | hub | intel-missions | Card click | `navigateTo('intel-missions')` | No |
| T08 | hub | hub-settings | Card click | `navigateTo('hub-settings')` | No |

### Agent Management Flow

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T09 | agent-management | hire-agents | "HIRE NEW AGENTS" | `navigate:hire-agents` | No |
| T10 | agent-management | hub | "CLOSE" | `close` | No |
| T11 | hire-agents | hire-confirm | "HIRE" button | `navigate:hire-confirm` | No |
| T12 | hire-agents | agent-management | "BACK" | `back` | No |
| T13 | hire-agents | hub | "CLOSE" | `close` | No |
| T14 | hire-confirm | hire-success | Confirm success | `navigateTo('hire-success')` | No |
| T15 | hire-success | hire-agents | Auto/Click | `navigateTo('hire-agents', null, true)` | **YES** |
| T16 | hire-confirm | hire-agents | "CANCEL" | `back` | No |
| T17 | hire-agents | hire-agents | ESC key | `back` | No |
| T17a | hire-confirm | hire-success | After successful hire | `navigateTo('hire-success')` | No |
| T17b | hire-success | hire-agents | Auto after 2s/click | `navigateTo('hire-agents', null, true)` | **YES** |

### Character & Arsenal

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T18 | character | character | Agent select | `navigateTo('character', null, true)` | **YES** |
| T19 | character | hub | "← BACK TO HUB" | `execute:returnToHub` | No |
| T20 | character | game | "✖ CLOSE" | `close` | No |
| T21 | arsenal | arsenal | Agent select | `navigateTo('arsenal', null, true)` | **YES** |
| T22 | arsenal | arsenal | Tab change | `navigateTo('arsenal', null, true)` | **YES** |
| T23 | arsenal | arsenal | After buy item | `navigateTo('arsenal', null, true)` | **YES** |
| T24 | arsenal | arsenal | After sell item | `navigateTo('arsenal', null, true)` | **YES** |
| T25 | arsenal | arsenal | After equip/unequip | `navigateTo('arsenal', null, true)` | **YES** |
| T26 | arsenal | arsenal | "OPTIMIZE" | `execute:optimizeLoadouts` | **YES** |
| T27 | arsenal | hub | "← BACK TO HUB" | `execute:returnToHub` | No |
| T28 | arsenal | game | "✖ CLOSE" | `close` | No |

### Research Lab

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T29 | research-lab | tech-tree | "VIEW TECH TREE" | `navigate:tech-tree` | No |
| T30 | research-lab | hub | "CLOSE" | `close` | No |
| T31 | tech-tree | research-lab | "BACK" | `back` | No |

### Other Hub Dialogs

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T32 | hall-of-glory | hub | "← BACK TO HUB" | `execute:returnToHub` | No |
| T33 | mission-select-hub | hub | "BACK" | `execute:returnToHub` | No |
| T34 | intel-missions | hub | "CLOSE" | `close` | No |
| T34a | hub | intel-missions | "INTELLIGENCE" card | `navigateTo('intel-missions')` | No |
| T34b | intel-missions | hub | ESC key | `back` | No |
| T47a | hub | hub-settings | "SETTINGS" card | `navigateTo('hub-settings')` | No |
| T48 | hub-settings | hub | "BACK TO HUB" | `back` | No |
| T49 | hub-settings | hub-settings | "APPLY" | `execute:applySettings` | **YES** |
| T50 | hub-settings | hub-settings | "DEFAULTS" | `execute:resetSettings` | **YES** |
| T50a | hub-settings | hub | ESC key | `back` | No |

### In-Game Pause Menu

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T35 | game | pause-menu | ESC/"Pause" | `navigateTo('pause-menu')` | No |
| T36 | pause-menu | game | "RESUME" | `execute:resumeGame` | No |
| T37 | pause-menu | game | ESC | `execute:resumeGame` | No |
| T38 | pause-menu | game | "P" | `execute:resumeGame` | No |
| T39 | pause-menu | settings | "SETTINGS" | `navigate:settings` | No |
| T40 | pause-menu | save-load | "SAVE/LOAD" | `navigate:save-load` | No |
| T41 | pause-menu | hub | "EXIT TO HUB" | `execute:exitToHub` | No |

### Save/Load & Settings

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T42 | save-load | pause-menu | "BACK" | `back` | No |
| T43 | save-load | save-load | "QUICK SAVE" | `execute:quickSave` | **YES** |
| T44 | save-load | save-load | "QUICK LOAD" | `execute:quickLoad` | **YES** |
| T45 | settings | pause-menu | "BACK" | `back` | No |
| T46 | settings | settings | "APPLY" | `execute:applySettings` | **YES** |
| T47 | settings | settings | "DEFAULTS" | `execute:resetSettings` | **YES** |

### NPC Interaction

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T51 | game | npc-interaction | NPC/"H" | `navigateTo('npc-interaction')` | No |
| T52 | npc-interaction | game | Complete | `close` | No |
| T53 | npc-interaction | game | ESC | `close` | No |

### Global Keyboard

| ID | From | To | Trigger | Method | Refresh |
|----|------|-----|---------|--------|---------|
| T54 | Any dialog | Parent | ESC | `back` | No |
| T55 | Any dialog | - | TAB | `focusNext` | No |
| T56 | Any dialog | - | SHIFT+TAB | `focusPrevious` | No |
| T57 | Any dialog | - | ENTER | `activateFocused` | Depends |
| T58 | Any dialog | - | SPACE | `activateFocused` | Depends |

## Cleanup Tasks

### Priority 1: Remove Duplicate Functions (Updated 2025-09-20)
| File | Line | Function | Action |
|------|------|----------|--------|
| game-hub.js | 240 | showAgentManagement() | Simplify to navigateTo only |
| game-hub.js | 248 | showArsenal() | Simplify to navigateTo only |
| game-hub.js | 256 | showResearchLab() | Simplify to navigateTo only |
| game-hub.js | 263 | showResearchLabOld() | **DELETE ENTIRELY** |
| game-hub.js | 195 | showHallOfGlory() | Simplify to navigateTo only |
| game-flow.js | - | showMissionSelectDialog() | **✅ DELETED - Now fully declarative** |
| game-flow.js | 1861 | showPauseMenu() | Simplify to navigateTo only |
| game-rpg-ui.js | 8 | showCharacterSheet() | Simplify to navigateTo only |
| modal-engine.js | 998 | showNPCDialog() | Check if still needed |

### Priority 2: Convert Critical Path (HIGH)
1. Hub screen (showSyndicateHub)
2. Mission briefing (showBriefingScreen)
3. Loadout selection (showLoadoutSelection)
4. Victory/Defeat screens

### Priority 3: Convert Remaining (MEDIUM/LOW)
1. Terminal hacking mini-game
2. World map view
3. Menu/splash/credits screens
4. Simple confirmation dialogs

## State Hierarchy

```
ROOT
├── initial (page load)
├── splash → menu → hub
│
├── hub (virtual root)
│   ├── agent-management [L1]
│   │   └── hire-agents [L2]
│   │       ├── hire-confirm [L3]
│   │       └── hire-success [L3]
│   ├── character [L1]
│   ├── arsenal [L1]
│   ├── research-lab [L1]
│   │   └── tech-tree [L2]
│   ├── hall-of-glory [L1]
│   ├── mission-select-hub [L1]
│   ├── intel-missions [L1]
│   ├── hub-settings [L1]
│   └── world-map [L1]
│
├── briefing → loadout → game
│
└── game (virtual root)
    ├── pause-menu [L1]
    │   ├── save-load [L2]
    │   └── settings [L2]
    ├── npc-interaction [L1]
    ├── terminal-hack [L1]
    ├── victory
    └── defeat
```

## Imperative Transitions (Not Yet Converted)

### Entry & Menu Flow
| From | To | Trigger | Function |
|------|-----|---------|----------|
| initial | splash | Game load | showSplashScreens() |
| splash | menu | Timer/Skip | showMainMenu() |
| menu | demoscene | Idle timeout | startDemoscene() |
| demoscene | menu | Any input | showMainMenu() |
| menu | hub | "New Game" | showSyndicateHub() |
| menu | hub | "Continue" | loadAndContinue() |
| menu | credits | "Credits" | showCredits() |
| credits | menu | "Back"/ESC | showMainMenu() |

### Mission Flow
| From | To | Trigger | Function |
|------|-----|---------|----------|
| hub | mission-select | "Missions" | showMissionSelectDialog() |
| mission-select | briefing | Mission select | showBriefingScreen() |
| briefing | loadout | "Proceed" | showLoadoutSelection() |
| briefing | mission-select | "Back" | showMissionSelectDialog() |
| loadout | game | "Start Mission" | startMission() |
| loadout | briefing | "Back" | showBriefingScreen() |
| game | victory | Objectives complete | showVictoryScreen() |
| game | defeat | All agents dead | showDefeatScreen() |
| victory | hub | "Continue" | showSyndicateHub() |
| victory | credits | Final mission | showCredits() |
| defeat | loadout | "Retry" | showLoadoutSelection() |
| defeat | hub | "Return to Hub" | showSyndicateHub() |

### Terminal & NPCs
| From | To | Trigger | Function |
|------|-----|---------|----------|
| game | terminal-hack | Terminal/"H" | showTerminalHack() |
| terminal-hack | game | Complete/Cancel | closeDialog() |
| game | confirm-surrender | Surrender option | showHudDialog() |
| confirm-surrender | defeat | "Confirm" | showDefeatScreen() |

### Confirmation Modals
| From | To | Trigger | Function |
|------|-----|---------|----------|
| arsenal | sell-confirm | "Sell" item | (integrated) |
| arsenal | buy-confirm | "Buy" item | (integrated) |
| arsenal | insufficient-funds | Buy with no $ | showHudDialog() |
| save-load | save-confirm | Save to slot | showHudDialog() |
| save-load | load-confirm | Load slot | showHudDialog() |
| save-load | delete-confirm | Delete slot | showHudDialog() |
| pause-menu | confirm-exit | "Exit to Hub" | showHudDialog() |
| confirm-exit | hub | "Confirm" | returnToHubFromMission() |

## Navigation Patterns

| Pattern | Usage | Example |
|---------|-------|---------|
| `navigate:state` | Button action | `navigate:hire-agents` |
| `navigateTo(state)` | Direct call | `navigateTo('character')` |
| `navigateTo(state, null, true)` | Force refresh | `navigateTo('arsenal', null, true)` |
| `back` | Return to parent | Button: `back` |
| `close` | Close dialog | Button: `close` |
| `execute:function` | Custom action | `execute:returnToHub` |

## Animation Types

| Animation | Duration | Usage |
|-----------|----------|-------|
| fade-in/out | 200ms | Level 1 dialogs |
| slide-left/right | 250ms | Level 2 navigation |
| zoom-in/out | 200ms | Confirmations |
| none | 0ms | Refresh operations |

## Files Using State System

| File | Purpose | States Used |
|------|---------|-------------|
| dialog-config.js | State definitions | All declarative states |
| dialog-integration.js | Generators & actions | All declarative states |
| declarative-dialog-engine.js | Core engine | - |
| game-*.js files | Imperative wrappers | Various |

## Testing Checklist

- [ ] All declarative states open correctly
- [ ] Back/close navigation works
- [ ] Refresh doesn't flicker
- [ ] Context-aware buttons update
- [ ] Keyboard shortcuts function
- [ ] State data persists
- [ ] Animations play smoothly
- [ ] No console errors

## Last Updated
2025-09-20 - Consolidated from multiple docs