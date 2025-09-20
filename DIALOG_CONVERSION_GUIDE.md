# Dialog Conversion Guide
*Step-by-step guide for converting imperative dialogs to declarative system*

## ⚠️ CRITICAL CONVERSION RULES

### 🛑 STOP AND ASK Policy
1. **NEVER recreate functionality** - Always find and preserve existing implementation
2. **NEVER guess at behavior** - If you can't find the imperative version, STOP and ASK
3. **ALWAYS preserve ALL functionality** - Every button, every action, every feature must work
4. **ALWAYS extract from existing** - Find the actual showDialog/showHudDialog calls first

### ✅ Conversion Process
1. **FIND** the imperative implementation (showHudDialog, showDialog, etc.)
2. **EXTRACT** three key components:
   - Title (dialog header)
   - Content (HTML body)
   - Actions (button array with callbacks)
3. **WRAP** in declarative configuration
4. **CONNECT** actions to new system
5. **TEST** all functionality preserved

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

### Step 1: FIND the Imperative Implementation

```javascript
// Search for these patterns in game-*.js files:
showHudDialog(
showDialog(
showBriefingScreen(
showLoadoutSelection(
showVictoryScreen(
// etc.
```

### Step 2: EXTRACT Components

#### Example: Finding a showHudDialog Call
```javascript
// FOUND IN: game-flow.js:1986
this.showHudDialog(
    'CONFIRM EXIT',                    // <- TITLE
    'Return to hub? Mission progress will be lost.',  // <- CONTENT
    [
        { text: 'CONFIRM', action: () => this.returnToHubFromMission() },  // <- ACTION 1
        { text: 'CANCEL', action: () => this.showPauseMenu() }            // <- ACTION 2
    ]
);
```

#### What to Extract:
1. **Title**: The dialog header text
2. **Content**: Can be:
   - Simple string
   - HTML string with styles
   - Generated content (tables, lists, etc.)
3. **Actions**: Button array with:
   - Button text
   - Callback function
   - Optional styling (danger, primary, etc.)

### Step 3: WRAP in Declarative Config

```javascript
// IN dialog-config.js:
'confirm-exit': {
    type: 'dialog',
    level: 2,
    parent: 'pause-menu',
    title: 'CONFIRM EXIT',  // <- Extracted title
    content: {
        type: 'static',
        text: 'Return to hub? Mission progress will be lost.'  // <- Extracted content
    },
    buttons: [
        { text: 'CONFIRM', action: 'execute:returnToHubFromMission', danger: true },  // <- Converted action
        { text: 'CANCEL', action: 'back' }  // <- Simplified to 'back'
    ]
}
```

### Step 4: CONNECT Actions

```javascript
// IN dialog-integration.js:
engine.registerAction('returnToHubFromMission', function() {
    // Copy the EXACT logic from the imperative callback
    game.returnToHubFromMission();
});
```

### Step 5: TEST Preservation

Before:
```javascript
// OLD: Imperative call
this.showHudDialog('CONFIRM EXIT', content, buttons);
```

After:
```javascript
// NEW: Declarative call
this.dialogEngine.navigateTo('confirm-exit');
```

Both must have IDENTICAL behavior!

## 5. COMPLEX CONTENT EXTRACTION

### HTML Content with Styles
```javascript
// FOUND: Complex HTML content
this.showHudDialog(
    'RESEARCH LAB',
    `<div style="max-height: 400px; overflow-y: auto;">
        <div style="color: #00ffff;">Research Points: ${this.researchPoints}</div>
        <table>...</table>
    </div>`,
    buttons
);

// CONVERT TO: Generator function
'research-lab': {
    content: {
        type: 'dynamic',
        generator: 'generateResearchContent'  // <- Move HTML generation to function
    }
}

// IN dialog-integration.js:
engine.registerGenerator('generateResearchContent', function() {
    const game = window.game;
    return `<div style="max-height: 400px; overflow-y: auto;">
        <div style="color: #00ffff;">Research Points: ${game.researchPoints}</div>
        <table>...</table>
    </div>`;
});
```

### Dynamic Buttons
```javascript
// FOUND: Conditional buttons
const buttons = [];
if (canSave) buttons.push({ text: 'SAVE', action: () => this.saveGame() });
if (canLoad) buttons.push({ text: 'LOAD', action: () => this.loadGame() });
buttons.push({ text: 'CANCEL', action: () => this.closeDialog() });

// CONVERT TO: Dynamic button generator
'save-load': {
    buttons: {
        type: 'dynamic',
        generator: 'generateSaveLoadButtons'
    }
}

engine.registerButtonGenerator('generateSaveLoadButtons', function() {
    const buttons = [];
    if (game.canSave) buttons.push({ text: 'SAVE', action: 'execute:saveGame' });
    if (game.canLoad) buttons.push({ text: 'LOAD', action: 'execute:loadGame' });
    buttons.push({ text: 'CANCEL', action: 'back' });
    return buttons;
});
```

## 6. COMMON CONVERSION MISTAKES TO AVOID

### ❌ WRONG: Creating New Functionality
```javascript
// DON'T invent new features
'inventory': {
    content: {
        // Making up a sorting feature that didn't exist
        sortBy: 'value',
        showCategories: true  // <- This wasn't in original!
    }
}
```

### ❌ WRONG: Losing Functionality
```javascript
// ORIGINAL had 3 buttons
buttons: [
    { text: 'SAVE', ... },
    { text: 'LOAD', ... },
    { text: 'DELETE', ... }  // <- Don't forget this!
]

// WRONG: Only converted 2 buttons
buttons: [
    { text: 'SAVE', ... },
    { text: 'LOAD', ... }
    // Missing DELETE!
]
```

### ❌ WRONG: Changing Behavior
```javascript
// ORIGINAL: Returns to pause menu
{ text: 'CANCEL', action: () => this.showPauseMenu() }

// WRONG: Returns to hub instead
{ text: 'CANCEL', action: 'execute:returnToHub' }  // <- Different behavior!

// CORRECT: Preserve exact navigation
{ text: 'CANCEL', action: 'execute:showPauseMenu' }
```

## 7. WHEN TO STOP AND ASK

### 🛑 STOP if you can't find:
1. The original `showDialog`/`showHudDialog` call
2. The complete content generation code
3. All button actions and their callbacks
4. Special features (animations, sounds, timers)

### 🛑 STOP if the dialog has:
1. Complex mini-games (terminal hacking)
2. Real-time updates (combat stats)
3. External dependencies (save system)
4. Multi-step flows (tutorial sequences)

### ✅ PROCEED only when you have:
1. Located exact imperative implementation
2. Understood all functionality
3. Mapped all actions to new system
4. Verified no features will be lost

## 8. TRANSITION DESIGN FOR OLD SYSTEMS

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

## 10. CONVERSION CHECKLIST

For each dialog conversion:

### Pre-Conversion
- [ ] Found the original imperative implementation
- [ ] Located all showHudDialog/showDialog calls
- [ ] Identified the title string
- [ ] Found complete content generation
- [ ] Listed all buttons and actions
- [ ] Checked for special features (timers, animations, sounds)

### During Conversion
- [ ] Created state config in dialog-config.js
- [ ] Set correct parent and level
- [ ] Extracted title exactly as-is
- [ ] Moved content to generator if dynamic
- [ ] Converted all button actions
- [ ] Registered all execute: actions
- [ ] Added keyboard shortcuts if present

### Post-Conversion
- [ ] Original function now calls dialogEngine.navigateTo
- [ ] All buttons work identically
- [ ] Content displays correctly
- [ ] Navigation (back/close) works
- [ ] Refresh works if applicable
- [ ] No console errors
- [ ] No lost functionality

### Documentation
- [ ] Updated GAME_STATE_REFERENCE.md
- [ ] Marked imperative version for cleanup
- [ ] Added to conversion progress tracking

## Last Updated
2025-09-20 - Added extraction patterns and preservation rules