# Dialog System Redesign - 4-Level Architecture

## 🎯 DESIGN PRINCIPLES

### Level Definitions:
- **Level 0**: Base Screen (Hub/Game/Menu)
- **Level 1**: Category Dialog (Agent Management, Research, etc.)
- **Level 2**: Subcategory Dialog (Hire Agents, View Squad, etc.)
- **Level 3**: Action/Confirmation (Hire Confirm, Buy Item, etc.)
- **Level 4**: Result Only (Success/Error - AUTO-CLOSE)

### Rules:
1. **NO dialog beyond Level 3** (Level 4 is notification only)
2. **NO circular references** - always return to parent
3. **NO cross-level jumps** - must go through hierarchy
4. **EVERY dialog has Back button** returning to exact parent
5. **Close/X always returns to Level 0**

## 📊 NEW DIALOG HIERARCHY

### HUB DIALOGS (Level 0: Hub)

```
HUB
├─> [1] AGENT MANAGEMENT
│   ├─> [2] View Squad
│   │   ├─> [3] Agent Details (Read-only)
│   │   ├─> [3] Manage Equipment → Opens Equipment Dialog at L1
│   │   └─> [3] Dismiss Agent (Confirm)
│   │
│   ├─> [2] Hire Agents
│   │   ├─> [3] Hire Confirm → [4] Success (auto-close to L2)
│   │   └─> [3] View Details (Read-only)
│   │
│   └─> [2] Training Center
│       ├─> [3] Train Skill (Confirm)
│       └─> [3] View Progress (Read-only)
│
├─> [1] EQUIPMENT & ARSENAL
│   ├─> [2] Agent Loadouts
│   │   ├─> [3] Equip Weapon
│   │   ├─> [3] Equip Armor
│   │   └─> [3] Auto-Optimize (Confirm)
│   │
│   ├─> [2] Shop
│   │   ├─> [3] Buy Item → [4] Success/Fail (auto-close)
│   │   └─> [3] Item Details (Read-only)
│   │
│   └─> [2] Sell Items
│       └─> [3] Confirm Sell → [4] Success (auto-close)
│
├─> [1] RESEARCH LAB
│   ├─> [2] Available Research
│   │   └─> [3] Start Research → [4] Success/Fail (auto-close)
│   │
│   ├─> [2] Tech Tree View (Read-only)
│   └─> [2] Research Progress (Read-only)
│
├─> [1] INTEL & MISSIONS
│   ├─> [2] Intel Reports (Read-only)
│   ├─> [2] Mission Select
│   │   └─> [3] Start Mission (Confirm)
│   └─> [2] Campaign Progress (Read-only)
│
└─> [1] CHARACTER SYSTEM (RPG)
    ├─> [2] Character Sheets
    │   ├─> [3] Spend Points (Confirm)
    │   └─> [3] View Stats (Read-only)
    │
    ├─> [2] Skill Trees
    │   └─> [3] Learn Skill → [4] Success (auto-close)
    │
    └─> [2] Squad Overview (Read-only)
```

### GAME DIALOGS (Level 0: Game)

```
GAME
├─> [1] PAUSE MENU
│   ├─> [2] Resume Game (Action - closes all)
│   ├─> [2] Settings
│   │   └─> [3] Apply Settings (Confirm)
│   ├─> [2] Save/Load
│   │   └─> [3] Confirm Action
│   └─> [2] Exit Options
│       └─> [3] Confirm Exit
│
├─> [1] NPC INTERACTION
│   ├─> [2] Dialog Tree
│   │   └─> [3] Quest Accept/Decline
│   └─> [2] Trade (if merchant)
│       └─> [3] Confirm Trade
│
├─> [1] MISSION INFO (J key)
│   └─> [2] Quest Details (Read-only)
│
└─> [1] CHARACTER SHEET (C key)
    └─> [2] View Only Mode
        └─> [3] Close to Game
```

## 🔄 CONSOLIDATED DIALOGS

### Merged Dialogs (Reducing Depth):
1. **Hire Agent + Success** → Single "Hire Agent" with inline result
2. **Research Item + Success** → Single "Research" with inline result
3. **Equipment + Shop** → Combined "Equipment & Arsenal"
4. **Agent Management + Squad** → Combined under "Agent Management"
5. **All Confirmation Dialogs** → Inline confirms, not separate dialogs

### Removed Dialogs (Unnecessary):
1. ~~Continue Research~~ (circular)
2. ~~Hire More~~ (circular)
3. ~~Back to Hub~~ buttons (use standard Back)
4. ~~Intermediate success dialogs~~ (show inline)
5. ~~View Achievements~~ (move to Hub main screen)

## 💻 TECHNICAL IMPLEMENTATION

### Dialog Stack Manager:
```javascript
class DialogManager {
    constructor() {
        this.stack = [];
        this.maxDepth = 4;
        this.levelNames = ['Base', 'Category', 'Subcategory', 'Action', 'Notification'];
    }

    open(dialog) {
        // Check depth
        if (this.stack.length >= this.maxDepth) {
            console.error(`Cannot open dialog: Max depth (${this.maxDepth}) reached`);
            return false;
        }

        // Check for circular reference
        if (this.stack.find(d => d.id === dialog.id)) {
            console.error(`Circular reference detected: ${dialog.id}`);
            return false;
        }

        // Auto-close Level 4 notifications
        if (this.stack.length === 3) {
            dialog.autoClose = true;
            dialog.autoCloseDelay = 2000;
        }

        this.stack.push(dialog);
        this.render(dialog);
        return true;
    }

    back() {
        if (this.stack.length > 0) {
            const current = this.stack.pop();
            this.close(current);

            // Re-render parent if exists
            if (this.stack.length > 0) {
                const parent = this.stack[this.stack.length - 1];
                this.render(parent);
            }
        }
    }

    closeAll() {
        while (this.stack.length > 0) {
            const dialog = this.stack.pop();
            this.close(dialog);
        }
    }

    getCurrentLevel() {
        return this.stack.length;
    }

    canOpenDialog() {
        return this.stack.length < this.maxDepth;
    }
}
```

### Dialog Configuration:
```javascript
const DIALOG_CONFIG = {
    'agent-management': {
        id: 'agent-management',
        level: 1,
        title: 'Agent Management',
        parent: 'hub',
        children: ['view-squad', 'hire-agents', 'training-center'],
        buttons: {
            back: { text: 'Back to Hub', action: 'back' },
            close: { text: 'X', action: 'close-all' }
        }
    },
    'hire-agents': {
        id: 'hire-agents',
        level: 2,
        title: 'Hire Agents',
        parent: 'agent-management',
        children: ['hire-confirm', 'view-details'],
        maxChildren: 1,  // Prevent multiple confirms
        buttons: {
            back: { text: 'Back to Management', action: 'back' }
        }
    },
    'hire-confirm': {
        id: 'hire-confirm',
        level: 3,
        title: 'Confirm Hire',
        parent: 'hire-agents',
        children: ['hire-result'],
        buttons: {
            confirm: { text: 'Hire', action: 'execute-hire' },
            cancel: { text: 'Cancel', action: 'back' }
        },
        onSuccess: {
            showNotification: true,
            autoCloseDelay: 2000,
            returnToLevel: 2  // Back to hire-agents
        }
    }
}
```

## 🎨 UI STANDARDS

### Navigation Bar (All Dialogs):
```
┌─────────────────────────────────────────┐
│ [← Back] Dialog Title         [X Close] │
│ Level: Category > Subcategory           │
├─────────────────────────────────────────┤
│                                         │
│           Dialog Content                │
│                                         │
├─────────────────────────────────────────┤
│        [Action 1]  [Action 2]          │
└─────────────────────────────────────────┘
```

### Breadcrumb Display:
- Level 1: "Hub > Agent Management"
- Level 2: "Hub > Agent Management > Hire Agents"
- Level 3: "Hub > Agent Management > Hire > Confirm"

### Button Standards:
- **Back**: Always returns to immediate parent
- **Close/X**: Always returns to Level 0
- **Action buttons**: Perform action and auto-navigate
- **Cancel**: Same as Back

## 🚀 MIGRATION PLAN

### Phase 1: Core System (Week 1)
1. Implement new DialogManager class
2. Create dialog configurations
3. Add breadcrumb navigation
4. Test with single dialog chain

### Phase 2: Hub Dialogs (Week 2)
1. Migrate Agent Management
2. Migrate Equipment & Arsenal
3. Migrate Research Lab
4. Test all Hub paths

### Phase 3: Game Dialogs (Week 3)
1. Migrate Pause Menu
2. Migrate NPC System
3. Test Game state dialogs

### Phase 4: Polish (Week 4)
1. Remove old dialog code
2. Update all references
3. Complete testing
4. Documentation

## ✅ SUCCESS METRICS

### Navigation Clarity:
- User always knows current location (breadcrumbs)
- Back button behavior 100% predictable
- No orphaned dialogs possible

### Technical Health:
- Max stack depth: 4 (enforced)
- Zero circular references
- Single source of truth for state
- All dialogs properly garbage collected

### User Experience:
- Maximum 3 clicks to any action
- Consistent navigation patterns
- Clear visual hierarchy
- Fast response times (< 50ms transitions)

## 🎯 FINAL BENEFITS

1. **Predictable**: Every dialog follows same pattern
2. **Maintainable**: New dialogs just need config entry
3. **Debuggable**: Stack trace shows exact path
4. **Performant**: Limited depth = less memory
5. **Testable**: Can automate all paths
6. **Accessible**: Keyboard navigation works perfectly

This redesign will solve ALL current dialog issues permanently!