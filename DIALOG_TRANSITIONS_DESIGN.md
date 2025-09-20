# Dialog System Transitions Design Document

## 1. TRANSITION MECHANICS IN DECLARATIVE SYSTEM

### Navigation Methods
| Method | Syntax | Purpose | Stack Effect | Animation |
|--------|--------|---------|--------------|-----------|
| **navigateTo** | `navigateTo(stateId, params, forceRefresh)` | Go to specific state | Manages stack by level | Enter/Exit animations |
| **back** | `back()` | Return to parent state | Pops current from stack | Exit animation |
| **close** | `close()` | Close current dialog | Pops from stack | Exit animation |
| **refresh** | `navigateTo(currentState, null, true)` | Update without navigation | No stack change | No animation |
| **closeAll** | `closeAll()` | Close all dialogs | Clears entire stack | Exit animations |

### Action Types in Config
| Action | Example | Behavior |
|--------|---------|----------|
| `navigate:state` | `navigate:hire-agents` | Navigates to specified state |
| `back` | `back` | Returns to parent state |
| `close` | `close` | Closes current dialog |
| `execute:function` | `execute:confirmHire` | Runs registered action |
| `refresh` | Internal | Refreshes current state |

### Refresh Patterns
```javascript
// Pattern 1: Direct refresh with forceRefresh parameter
this.navigateTo('arsenal', null, true);

// Pattern 2: Using refresh action
this.actionRegistry.get('refresh')();

// Pattern 3: Navigate to same state (auto-detects refresh)
this.navigateTo(this.currentState);
```

## 2. CONVERTED SYSTEM STATE HIERARCHY

```
hub (virtual root)
├── agent-management (Level 1)
│   └── hire-agents (Level 2)
│       └── hire-confirm (Level 3)
├── character (Level 1)
├── arsenal (Level 1)
├── research-lab (Level 1)
│   └── tech-tree (Level 2)
├── hall-of-glory (Level 1)
├── mission-selection (Level 1)
├── intel-data (Level 1)
├── settings-controls (Level 1)

game (virtual root)
├── pause-menu (Level 1)
│   ├── save-load (Level 2)
│   └── settings (Level 2)
└── npc-interaction (Level 1)
```

## 3. TRANSITION MAP FOR CONVERTED SYSTEMS

| From State | To State | Trigger | Method | Animation | Refresh? | Notes |
|------------|----------|---------|--------|-----------|----------|-------|
| **Hub** | agent-management | Hub button click | `navigateTo('agent-management')` | fade-in | No | Opens management menu |
| agent-management | hire-agents | "HIRE NEW AGENTS" button | `navigate:hire-agents` | slide-left | No | Shows available agents |
| agent-management | hub | "CLOSE" button | `close` | fade-out | No | Returns to hub |
| hire-agents | hire-confirm | "HIRE" button | `navigate:hire-confirm` | zoom-in | No | Shows confirmation |
| hire-agents | agent-management | "BACK" button | `back` | slide-right | No | Returns to management |
| hire-confirm | hire-agents | After hire success | `navigateTo('hire-agents', null, true)` | fade | **Yes** | Refreshes list |
| hire-confirm | hire-agents | "CANCEL" button | `back` | zoom-out | No | Cancels hire |
| **Hub** | character | Hub button/"C" key | `navigateTo('character')` | fade-in | No | Opens character sheet |
| character | character | Agent selection | `navigateTo('character', null, true)` | none | **Yes** | Updates selected agent |
| character | hub/game | "CLOSE"/"BACK TO HUB" | `close`/`execute:returnToHub` | fade-out | No | Context-aware button |
| **Hub** | arsenal | Hub button/"I" key | `navigateTo('arsenal')` | fade-in | No | Opens equipment |
| arsenal | arsenal | Agent selection | `navigateTo('arsenal')` | none | **Yes** | Updates selection |
| arsenal | arsenal | Tab change | `navigateTo('arsenal')` | none | **Yes** | Changes inventory mode |
| arsenal | arsenal | Buy/Sell action | `navigateTo('arsenal')` | none | **Yes** | Updates after transaction |
| arsenal | hub/game | "CLOSE"/"BACK TO HUB" | `close`/`execute:returnToHub` | fade-out | No | Context-aware |
| **Game** | pause-menu | ESC key | `navigateTo('pause-menu')` | fade-in | No | Pauses game |
| pause-menu | game | "RESUME" | `close` | fade-out | No | Resumes game |
| pause-menu | save-load | "SAVE/LOAD" | `navigate:save-load` | slide-left | No | Save management |
| pause-menu | settings | "SETTINGS" | `navigate:settings` | slide-left | No | Game settings |

## 4. IMPERATIVE TO DECLARATIVE CONVERSION PATTERNS

### Current Imperative Patterns
```javascript
// OLD: Direct function calls
this.showCharacterSheet();
this.showArsenal();
this.showHudDialog(title, content, buttons);
this.closeDialog();
this.refreshEquipmentUI();

// OLD: DOM manipulation
document.getElementById('dialog').style.display = 'block';
dialog.classList.add('show');
```

### Declarative Equivalents
```javascript
// NEW: State navigation
this.dialogEngine.navigateTo('character');
this.dialogEngine.navigateTo('arsenal');
this.dialogEngine.navigateTo('confirm-dialog', {title, content, buttons});
this.dialogEngine.close();
this.dialogEngine.navigateTo('arsenal', null, true); // refresh
```

## 5. TRANSITION DESIGN FOR OLD SYSTEMS

### Mission Flow Transitions
| State | Parent | Level | Entry | Exit | Refresh Trigger |
|-------|--------|-------|-------|------|-----------------|
| mission-select | hub | 1 | fade-in | fade-out | Mission complete |
| mission-briefing | mission-select | 2 | slide-up | slide-down | - |
| loadout-select | mission-briefing | 3 | slide-left | slide-right | Agent change |
| mission-confirm | loadout-select | 4 | zoom-in | zoom-out | - |
| victory-screen | game | 1 | celebration | fade-out | - |
| defeat-screen | game | 1 | fade-in | fade-out | - |
| defeat-options | defeat-screen | 2 | slide-up | slide-down | - |

### Save/Load System Transitions
| State | Parent | Level | Entry | Exit | Refresh Trigger |
|-------|--------|-------|-------|------|-----------------|
| save-dialog | pause-menu/hub | 2 | slide-up | slide-down | After save |
| save-confirm | save-dialog | 3 | zoom-in | zoom-out | - |
| load-dialog | pause-menu/hub | 2 | slide-up | slide-down | After delete |
| load-confirm | load-dialog | 3 | zoom-in | zoom-out | - |
| delete-confirm | save-dialog | 3 | zoom-in | zoom-out | - |

### NPC System Transitions
| State | Parent | Level | Entry | Exit | Refresh Trigger |
|-------|--------|-------|-------|------|-----------------|
| npc-dialog | game | 1 | fade-in + typing | fade-out | - |
| npc-quest | npc-dialog | 2 | slide-left | slide-right | Quest accept |
| npc-shop | npc-dialog | 2 | slide-left | slide-right | After purchase |
| terminal-hack | game | 1 | glitch-in | glitch-out | Hack progress |
| terminal-success | terminal-hack | 2 | flash | fade-out | - |

### Shop/Equipment Transitions
| State | Parent | Level | Entry | Exit | Refresh Trigger |
|-------|--------|-------|-------|------|-----------------|
| sell-confirm | arsenal | 2 | zoom-in | zoom-out | - |
| buy-confirm | arsenal | 2 | zoom-in | zoom-out | - |
| insufficient-funds | arsenal | 2 | shake + fade | fade-out | - |
| item-equipped | arsenal | 2 | flash | auto-close | - |

## 6. REFRESH STRATEGY

### When to Refresh (forceRefresh = true)
- After data mutation (hire, buy, sell, equip)
- After selection change (agent, item, tab)
- After async operations (save, load)
- After state changes affecting display

### When NOT to Refresh
- Simple navigation (forward/back)
- Opening confirmations
- Closing dialogs
- View-only operations

## 7. IMPLEMENTATION GUIDELINES

### State Definition Pattern
```javascript
'state-name': {
    type: 'dialog',
    level: 1,              // Hierarchy level
    parent: 'parent-state', // Parent for back navigation
    title: 'DIALOG TITLE',
    layout: 'standard',
    content: {
        type: 'dynamic',
        generator: 'generateContent'
    },
    buttons: {
        type: 'dynamic',    // For context-aware buttons
        generator: 'generateButtons'
    },
    transitions: {
        enter: { animation: 'fade-in', sound: 'dialog-open' },
        exit: { animation: 'fade-out', sound: 'dialog-close' }
    },
    keyboard: {            // Optional keyboard shortcuts
        'Escape': 'close',
        'Enter': 'confirm'
    }
}
```

### Generator Pattern for Refresh
```javascript
engine.registerGenerator('generateContent', function() {
    // Access current state data
    const data = this.stateData;
    const game = window.game;

    // Generate content based on current game state
    // This runs on every refresh
    return html;
});
```

### Action Pattern for Mutations
```javascript
engine.registerAction('confirmPurchase', function(context) {
    // Perform mutation
    game.credits -= item.cost;

    // Refresh current dialog to show changes
    this.navigateTo(this.currentState, null, true);

    // Or navigate elsewhere
    this.navigateTo('purchase-success', {item});
});
```

## 8. TRANSITION PRESERVATION RULES

When converting imperative to declarative:

1. **Preserve Timing**: Keep same delays/durations
2. **Preserve Effects**: Maintain visual feedback (shake, flash)
3. **Preserve Flow**: Same navigation paths
4. **Preserve State**: Maintain data between transitions
5. **Preserve Context**: Keep game state awareness

### Example Conversion
```javascript
// OLD IMPERATIVE
this.showHudDialog(
    'CONFIRM PURCHASE',
    `Buy ${item.name} for ${item.cost}?`,
    [
        { text: 'BUY', action: () => {
            this.buyItem(item);
            this.closeDialog();
            this.refreshShop();
        }},
        { text: 'CANCEL', action: () => this.closeDialog() }
    ]
);

// NEW DECLARATIVE
// In dialog-config.js:
'buy-confirm': {
    type: 'dialog',
    level: 2,
    parent: 'shop',
    title: 'CONFIRM PURCHASE',
    content: {
        type: 'template',
        template: 'buy-confirmation'
    },
    buttons: [
        { text: 'BUY', action: 'execute:confirmPurchase' },
        { text: 'CANCEL', action: 'back' }
    ]
}

// In action handler:
engine.registerAction('confirmPurchase', function() {
    game.buyItem(this.stateData.item);
    this.navigateTo('shop', null, true); // Refresh shop
});
```

## 9. TESTING CHECKLIST

- [ ] Navigation forward works
- [ ] Back button returns to parent
- [ ] Close button works correctly
- [ ] Refresh updates content without flicker
- [ ] Animations play correctly
- [ ] Sound effects trigger
- [ ] Keyboard shortcuts work
- [ ] Context-aware buttons update
- [ ] State data persists across transitions
- [ ] Multiple dialog levels stack correctly

## Last Updated
2025-09-20