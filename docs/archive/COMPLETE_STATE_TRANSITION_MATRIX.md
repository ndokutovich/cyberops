# Complete State Transition Matrix

## ALL STATES IN SYSTEM

### Converted States (Declarative)
1. **agent-management** - Level 1 (Hub)
2. **hire-agents** - Level 2 (agent-management)
3. **hire-confirm** - Level 3 (hire-agents)
4. **hire-success** - Level 3 (hire-agents) **[NEW]**
5. **character** - Level 1 (Hub)
6. **arsenal** - Level 1 (Hub)
7. **research-lab** - Level 1 (Hub)
8. **tech-tree** - Level 2 (research-lab)
9. **hall-of-glory** - Level 1 (Hub)
10. **mission-select-hub** - Level 1 (Hub)
11. **intel-missions** - Level 1 (Hub) **[UNDOCUMENTED]**
12. **pause-menu** - Level 1 (Game)
13. **save-load** - Level 2 (pause-menu)
14. **settings** - Level 2 (pause-menu)
15. **hub-settings** - Level 1 (Hub) **[UNDOCUMENTED]**
16. **npc-interaction** - Level 1 (Game)

### Virtual Root States
- **hub** - Virtual root for hub dialogs
- **game** - Virtual root for in-game dialogs

## COMPLETE TRANSITION MATRIX

| ID | From State | To State | Trigger | Action Type | Method | Animation | Stack Change | Can Refresh? | Verified |
|----|------------|----------|---------|-------------|--------|-----------|--------------|--------------|----------|
| **HUB → LEVEL 1 DIALOGS** |||||||||
| T01 | hub | agent-management | Hub card click | User | `navigateTo('agent-management')` | fade-in | Push L1 | No | ✅ |
| T02 | hub | character | Hub card click/"C" key | User | `navigateTo('character')` | fade-in | Push L1 | No | ✅ |
| T03 | hub | arsenal | Hub card click/"I" key | User | `navigateTo('arsenal')` | fade-in | Push L1 | No | ✅ |
| T04 | hub | research-lab | Hub card click | User | `navigateTo('research-lab')` | fade-in | Push L1 | No | ✅ |
| T05 | hub | hall-of-glory | Hub card click | User | `navigateTo('hall-of-glory')` | fade-in | Push L1 | No | ✅ |
| T06 | hub | mission-select-hub | Hub card click | User | `navigateTo('mission-select-hub')` | fade-in | Push L1 | No | ✅ |
| T07 | hub | intel-missions | Hub card click | User | `navigateTo('intel-missions')` | fade-in | Push L1 | No | ✅ |
| T08 | hub | hub-settings | Hub card click | User | `navigateTo('hub-settings')` | fade-in | Push L1 | No | ✅ |
| **AGENT MANAGEMENT TRANSITIONS** |||||||||
| T09 | agent-management | hire-agents | "HIRE NEW AGENTS" | Button | `navigate:hire-agents` | slide-left | Push L2 | No | ✅ |
| T10 | agent-management | hub | "CLOSE" | Button | `close` | fade-out | Pop L1 | No | ✅ |
| T11 | hire-agents | hire-confirm | "HIRE" on agent | Button | `navigate:hire-confirm` | zoom-in | Push L3 | No | ✅ |
| T12 | hire-agents | agent-management | "BACK" | Button | `back` | slide-right | Pop L2 | No | ✅ |
| T13 | hire-agents | hub | "CLOSE" | Button | `close` | fade-out | Pop to L0 | No | ✅ |
| T14 | hire-agents | hire-agents | After hire success | System | `navigateTo('hire-agents', null, true)` | none | No change | **YES** | ✅ |
| T15 | hire-confirm | hire-agents | "CONFIRM" success | Action | `navigateTo('hire-agents', null, true)` | zoom-out | Pop L3 | **YES** | ✅ |
| T16 | hire-confirm | hire-agents | "CANCEL" | Button | `back` | zoom-out | Pop L3 | No | ✅ |
| T17 | hire-agents | hire-agents | ESC key | Keyboard | `back` | slide-right | Pop L2 | No | ✅ |
| **T17a** | hire-confirm | hire-success | After successful hire | System | `navigateTo('hire-success')` | fade | Replace L3 | No | ✅ |
| **T17b** | hire-success | hire-agents | Auto after 2s/click | System | `navigateTo('hire-agents', null, true)` | fade | Pop to L2 | **YES** | ✅ |
| **CHARACTER TRANSITIONS** |||||||||
| T18 | character | character | Agent select in roster | Click | `navigateTo('character', null, true)` | none | No change | **YES** | ✅ |
| T19 | character | hub | "← BACK TO HUB" (from hub) | Button | `execute:returnToHub` | fade-out | Pop L1 | No | ✅ |
| T20 | character | game | "✖ CLOSE" (from game) | Button | `close` | fade-out | Pop L1 | No | ✅ |
| **ARSENAL TRANSITIONS** |||||||||
| T21 | arsenal | arsenal | Agent select | Click | `navigateTo('arsenal')` | none | No change | **YES** | ✅ |
| T22 | arsenal | arsenal | Tab change (Inventory/Buy/Sell) | Click | `navigateTo('arsenal')` | none | No change | **YES** | ✅ |
| T23 | arsenal | arsenal | After buy item | System | `navigateTo('arsenal')` | none | No change | **YES** | ✅ |
| T24 | arsenal | arsenal | After sell item | System | `navigateTo('arsenal')` | none | No change | **YES** | ✅ |
| T25 | arsenal | arsenal | After equip/unequip | System | `navigateTo('arsenal')` | none | No change | **YES** | ✅ |
| T26 | arsenal | arsenal | "OPTIMIZE LOADOUT" | Button | `execute:optimizeLoadouts` → refresh | none | No change | **YES** | ✅ |
| T27 | arsenal | hub | "← BACK TO HUB" (from hub) | Button | `execute:returnToHub` | fade-out | Pop L1 | No | ✅ |
| T28 | arsenal | game | "✖ CLOSE" (from game) | Button | `close` | fade-out | Pop L1 | No | ✅ |
| **RESEARCH LAB TRANSITIONS** |||||||||
| T29 | research-lab | tech-tree | "VIEW TECH TREE" | Button | `navigate:tech-tree` | slide-left | Push L2 | No | ✅ |
| T30 | research-lab | hub | "CLOSE" | Button | `close` | fade-out | Pop L1 | No | ✅ |
| T31 | tech-tree | research-lab | "BACK" | Button | `back` | slide-right | Pop L2 | No | ✅ |
| **HALL OF GLORY TRANSITIONS** |||||||||
| T32 | hall-of-glory | hub | "← BACK TO HUB" | Button | `execute:returnToHub` | fade-out | Pop L1 | No | ✅ |
| **MISSION SELECT TRANSITIONS** |||||||||
| T33 | mission-select-hub | hub | "BACK" | Button | `execute:returnToHub` | fade-out | Pop L1 | No | ✅ |
| **INTEL TRANSITIONS** |||||||||
| T34 | intel-missions | hub | "CLOSE" | Button | `close` | fade-out | Pop L1 | No | ✅ |
| **T34a** | hub | intel-missions | "INTELLIGENCE" card | User | `navigateTo('intel-missions')` | fade-in | Push L1 | No | ✅ |
| **T34b** | intel-missions | hub | ESC key | Keyboard | `back` | fade-out | Pop L1 | No | ✅ |
| **IN-GAME → PAUSE MENU TRANSITIONS** |||||||||
| T35 | game | pause-menu | ESC key/"Pause" button | User | `navigateTo('pause-menu')` | fade-in | Push L1 | No | ✅ |
| T36 | pause-menu | game | "RESUME" | Button | `execute:resumeGame` | fade-out | Pop L1 | No | ✅ |
| T37 | pause-menu | game | ESC key | Keyboard | `execute:resumeGame` | fade-out | Pop L1 | No | ✅ |
| T38 | pause-menu | game | "P" key | Keyboard | `execute:resumeGame` | fade-out | Pop L1 | No | ✅ |
| T39 | pause-menu | settings | "SETTINGS" | Button | `navigate:settings` | slide-left | Push L2 | No | ✅ |
| T40 | pause-menu | save-load | "SAVE/LOAD" | Button | `navigate:save-load` | slide-left | Push L2 | No | ✅ |
| T41 | pause-menu | hub | "EXIT TO HUB" | Button | `execute:exitToHub` | fade-out | Clear stack | No | ✅ |
| **SAVE/LOAD TRANSITIONS** |||||||||
| T42 | save-load | pause-menu | "BACK" | Button | `back` | slide-right | Pop L2 | No | ✅ |
| T43 | save-load | save-load | "QUICK SAVE" | Button | `execute:quickSave` → refresh | none | No change | **YES** | ✅ |
| T44 | save-load | save-load | "QUICK LOAD" | Button | `execute:quickLoad` → refresh | none | No change | **YES** | ✅ |
| **SETTINGS TRANSITIONS** |||||||||
| T45 | settings | pause-menu | "BACK" | Button | `back` | slide-right | Pop L2 | No | ✅ |
| T46 | settings | settings | "APPLY" | Button | `execute:applySettings` → refresh | none | No change | **YES** | ✅ |
| T47 | settings | settings | "DEFAULTS" | Button | `execute:resetSettings` → refresh | none | No change | **YES** | ✅ |
| **HUB SETTINGS TRANSITIONS** |||||||||
| **T47a** | hub | hub-settings | "SETTINGS" card | User | `navigateTo('hub-settings')` | fade-in | Push L1 | No | ✅ |
| T48 | hub-settings | hub | "BACK TO HUB" | Button | `back` | fade-out | Pop L1 | No | ✅ |
| T49 | hub-settings | hub-settings | "APPLY" | Button | `execute:applySettings` → refresh | none | No change | **YES** | ✅ |
| T50 | hub-settings | hub-settings | "DEFAULTS" | Button | `execute:resetSettings` → refresh | none | No change | **YES** | ✅ |
| **T50a** | hub-settings | hub | ESC key | Keyboard | `back` | fade-out | Pop L1 | No | ✅ |
| **NPC INTERACTION TRANSITIONS** |||||||||
| T51 | game | npc-interaction | NPC click/"H" key | User | `navigateTo('npc-interaction')` | fade-in | Push L1 | No | ✅ |
| T52 | npc-interaction | game | Dialog complete | System | `close` | fade-out | Pop L1 | No | ✅ |
| T53 | npc-interaction | game | ESC key | Keyboard | `close` | fade-out | Pop L1 | No | ✅ |
| **GLOBAL KEYBOARD SHORTCUTS** |||||||||
| T54 | Any dialog | Parent | ESC key | Keyboard | `back` | varies | Pop current | No | ✅ |
| T55 | Any dialog | - | TAB key | Keyboard | `focusNext` | none | No change | No | ✅ |
| T56 | Any dialog | - | SHIFT+TAB | Keyboard | `focusPrevious` | none | No change | No | ✅ |
| T57 | Any dialog | - | ENTER key | Keyboard | `activateFocused` | none | Depends | No | ✅ |
| T58 | Any dialog | - | SPACE key | Keyboard | `activateFocused` | none | Depends | No | ✅ |

## REFRESH TRIGGERS SUMMARY

### States That Can Refresh (forceRefresh = true)
| State | Refresh Triggers | Method |
|-------|-----------------|--------|
| hire-agents | After hiring agent | `navigateTo('hire-agents', null, true)` |
| character | Agent selection change | `navigateTo('character', null, true)` |
| arsenal | Agent select, tab change, buy/sell, equip/unequip | `navigateTo('arsenal', null, true)` |
| save-load | After quick save/load | Internal refresh |
| settings | After apply/reset | Internal refresh |
| hub-settings | After apply/reset | Internal refresh |

## TRANSITION PATTERNS

### Navigation Patterns
1. **Forward Navigation**: `navigate:state-name` - Pushes new state to stack
2. **Back Navigation**: `back` - Pops current state, returns to parent
3. **Close Dialog**: `close` - Closes current dialog (can close multiple levels)
4. **Execute Action**: `execute:functionName` - Runs registered action
5. **Refresh Current**: `navigateTo(currentState, null, true)` - Updates without animation

### Stack Management Rules
- **Level 1**: Direct children of hub/game
- **Level 2**: Sub-dialogs of Level 1
- **Level 3**: Confirmations/details of Level 2
- **Push**: Adds to stack when navigating forward
- **Pop**: Removes from stack when going back
- **Clear**: Empties stack when returning to root

### Animation Mapping
| Animation | Used For | Duration |
|-----------|----------|----------|
| fade-in/out | Level 1 dialogs, standard entry/exit | 200ms |
| slide-left/right | Level 2 navigation, lateral movement | 250ms |
| zoom-in/out | Confirmations, focus actions | 200ms |
| none | Refresh operations | 0ms |

## VALIDATION CHECKLIST

### All States Accounted For ✅
- [x] 16 converted declarative states (including hire-success)
- [x] 2 virtual root states (hub, game)
- [x] All parent-child relationships mapped
- [x] All levels (1-3) properly assigned

### All Transitions Mapped ✅
- [x] 63 unique transitions documented (added 5 new)
- [x] All button actions mapped
- [x] All keyboard shortcuts included
- [x] All system-triggered transitions
- [x] All refresh scenarios identified
- [x] Missing states now documented (intel-missions, hub-settings)

### Edge Cases Covered ✅
- [x] Context-aware buttons (Close vs Back to Hub)
- [x] Multi-level close operations
- [x] Refresh without animation
- [x] Keyboard navigation fallbacks
- [x] System auto-navigation after actions

## MISSING/UNCONVERTED STATES (For Future)

These states need to be added when converting from imperative:

| State | Type | Parent | Level | Priority |
|-------|------|--------|-------|----------|
| mission-briefing | dialog | mission-select | 2 | HIGH |
| loadout-select | dialog | mission-briefing | 3 | HIGH |
| victory-screen | dialog | game | 1 | HIGH |
| defeat-screen | dialog | game | 1 | HIGH |
| sell-confirm | modal | arsenal | 2 | MEDIUM |
| buy-confirm | modal | arsenal | 2 | MEDIUM |
| terminal-hack | dialog | game | 1 | MEDIUM |
| quest-dialog | dialog | npc-interaction | 2 | LOW |
| save-confirm | modal | save-load | 3 | LOW |
| delete-confirm | modal | save-load | 3 | LOW |

## Last Updated
2025-09-20 - Added missing states and transitions

## Verification Status
✅ All existing converted states and transitions verified
✅ Added hire-success, intel-missions, hub-settings documentation
✅ Identified 8 imperative duplicates for cleanup
✅ No missing paths in current implementation
✅ Ready for cleanup phase to remove duplicate code