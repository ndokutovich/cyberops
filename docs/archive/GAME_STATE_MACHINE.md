# CyberOps Game State Machine - Technical Specification

## 1. STATE DEFINITIONS

### 1.1 Primary Screen States
```javascript
SCREEN_STATES = {
    // Initialization
    'initial':      { id: 0,  persistent: false, pausable: false },
    'splash':       { id: 1,  persistent: false, pausable: false },

    // Menu States
    'menu':         { id: 2,  persistent: true,  pausable: false },
    'demoscene':    { id: 3,  persistent: false, pausable: false },

    // Hub States
    'hub':          { id: 4,  persistent: true,  pausable: false },
    'briefing':     { id: 5,  persistent: false, pausable: false },
    'loadout':      { id: 6,  persistent: false, pausable: false },

    // Game States
    'game':         { id: 7,  persistent: true,  pausable: true  },
    'victory':      { id: 8,  persistent: false, pausable: false },
    'defeat':       { id: 9,  persistent: false, pausable: false },

    // End States
    'complete':     { id: 10, persistent: false, pausable: false },
    'credits':      { id: 11, persistent: false, pausable: false }
}
```

### 1.2 Dialog/Modal States (Overlay States)
```javascript
DIALOG_STATES = {
    // Hub Dialogs
    'hudDialog':            { parent: 'any',     modal: true,  stack: true  },
    'agentManagement':      { parent: 'hub',     modal: true,  stack: false },
    'hiringDialog':         { parent: 'hub',     modal: true,  stack: true  },
    'squadManagement':      { parent: 'hub',     modal: true,  stack: false },
    'researchLab':          { parent: 'hub',     modal: true,  stack: false },
    'intelReports':         { parent: 'hub',     modal: true,  stack: false },
    'arsenal':              { parent: 'hub',     modal: false, stack: false },
    'equipmentDialog':      { parent: 'hub',     modal: false, stack: false },

    // Game Dialogs
    'pauseMenu':            { parent: 'game',    modal: true,  stack: false },
    'missionList':          { parent: 'game',    modal: true,  stack: false },
    'npcDialog':            { parent: 'game',    modal: true,  stack: true  },
    'characterSheet':       { parent: 'game',    modal: true,  stack: false },

    // General Dialogs
    'saveListDialog':       { parent: 'any',     modal: true,  stack: false },
    'missionSelectDialog':  { parent: 'any',     modal: true,  stack: false },
    'settingsDialog':       { parent: 'any',     modal: true,  stack: false },
    'intermissionDialog':   { parent: 'game',    modal: true,  stack: false }
}
```

## 2. STATE TRANSITION MATRIX

### 2.1 Primary State Transitions
```
FROM\TO     | initial | splash | menu | hub | briefing | game | victory | defeat | complete | credits
------------|---------|--------|------|-----|----------|------|---------|--------|----------|--------
initial     |    -    |   ✓    |  -   |  -  |    -     |  -   |    -    |   -    |    -     |   -
splash      |    -    |   -    |  ✓   |  -  |    -     |  -   |    -    |   -    |    -     |   -
menu        |    -    |   -    |  -   |  ✓  |    -     |  ✓*  |    -    |   -    |    -     |   -
hub         |    -    |   -    |  ✓   |  -  |    ✓     |  -   |    -    |   -    |    -     |   -
briefing    |    -    |   -    |  -   |  ✓  |    -     |  ✓   |    -    |   -    |    -     |   -
game        |    -    |   -    |  ✓*  |  ✓* |    -     |  -   |    ✓    |   ✓    |    -     |   -
victory     |    -    |   -    |  -   |  ✓  |    -     |  -   |    -    |   -    |    ✓*    |   -
defeat      |    -    |   -    |  ✓   |  ✓  |    -     |  ✓*  |    -    |   -    |    -     |   -
complete    |    -    |   -    |  ✓   |  -  |    -     |  -   |    -    |   -    |    -     |   ✓
credits     |    -    |   -    |  ✓   |  -  |    -     |  -   |    -    |   -    |    -     |   -

Legend: ✓ = valid transition, ✓* = conditional transition, - = invalid transition
```

### 2.2 Transition Conditions
```javascript
TRANSITION_CONDITIONS = {
    'menu->game': {
        condition: 'directMissionSelect',
        validate: () => this.missions && this.missions.length > 0
    },
    'menu->hub': {
        condition: 'campaignStart',
        validate: () => this.activeAgents && this.activeAgents.length > 0
    },
    'game->menu': {
        condition: 'surrenderOrExit',
        cleanup: () => { this.resetMission(); this.clearGameState(); }
    },
    'game->hub': {
        condition: 'returnToHub',
        cleanup: () => { this.saveMissionProgress(); }
    },
    'victory->complete': {
        condition: 'allMissionsComplete',
        validate: () => this.completedMissions.length === this.missions.length
    },
    'defeat->game': {
        condition: 'retryMission',
        validate: () => this.retryCount < 3
    }
}
```

## 3. DOM ELEMENT VISIBILITY MATRIX

### 3.1 Screen Element States
```javascript
ELEMENT_VISIBILITY = {
    //                    initial splash menu  hub   brief game  victory defeat complete credits
    'initialScreen':     [true,  false, false, false, false, false, false, false, false,  false],
    'splashScreens':     [false, true,  false, false, false, false, false, false, false,  false],
    'mainMenu':          [false, false, true,  false, false, false, false, false, false,  false],
    'syndicateHub':      [false, false, false, true,  false, false, false, false, false,  false],
    'briefingScreen':    [false, false, false, false, true,  false, false, false, false,  false],
    'gameCanvas':        [false, false, false, false, false, true,  false, false, false,  false],
    'gameHUD':           [false, false, false, false, false, true,  false, false, false,  false],
    'game3DContainer':   [false, false, false, false, false, true,  false, false, false,  false],
    'gameCompleteScreen':[false, false, false, false, false, false, false, false, true,   false],
    'creditsScreen':     [false, false, false, false, false, false, false, false, false,  true]
}
```

### 3.2 Element Control Functions
```javascript
ELEMENT_CONTROL = {
    show: (elementId) => {
        const elem = document.getElementById(elementId);
        if (elem) {
            elem.style.display = elem.dataset.displayType || 'flex';
            elem.classList.add('show');
        }
    },
    hide: (elementId) => {
        const elem = document.getElementById(elementId);
        if (elem) {
            elem.style.display = 'none';
            elem.classList.remove('show');
        }
    },
    toggle: (elementId, show) => {
        show ? ELEMENT_CONTROL.show(elementId) : ELEMENT_CONTROL.hide(elementId);
    }
}
```

## 4. DIALOG STACK MANAGEMENT

### 4.1 Stack Operations
```javascript
DIALOG_STACK = {
    stack: [],
    maxDepth: 5,

    push: function(dialog) {
        if (this.stack.length >= this.maxDepth) {
            console.warn('Dialog stack depth exceeded');
            return false;
        }
        this.stack.push({
            id: dialog.id,
            type: dialog.type,
            parent: this.getCurrentState(),
            timestamp: Date.now()
        });
        return true;
    },

    pop: function() {
        return this.stack.pop();
    },

    clear: function() {
        while(this.stack.length > 0) {
            const dialog = this.stack.pop();
            this.closeDialog(dialog.id);
        }
    },

    getCurrentDepth: function() {
        return this.stack.length;
    }
}
```

### 4.2 Z-Index Management
```javascript
Z_INDEX_LAYERS = {
    // Base layers
    'gameCanvas':        100,
    'game3DContainer':   200,
    'gameHUD':           500,

    // Screen layers
    'mainMenu':          1000,
    'syndicateHub':      1000,
    'briefingScreen':    1100,

    // Overlay layers
    'hudOverlay':        2000,
    'pauseOverlay':      2100,

    // Dialog layers
    'hudDialog':         10000,
    'modalEngine':       10000,  // Base modal z-index

    // Dynamic stacking
    getModalZIndex: function(stackPosition) {
        return this.modalEngine + (stackPosition * 10);
    }
}
```

## 5. STATE PERSISTENCE

### 5.1 Persistent State Data
```javascript
PERSISTENT_STATE = {
    // Core game state
    currentScreen: 'initial',
    previousScreen: null,

    // Game progress
    currentMissionIndex: 0,
    completedMissions: [],
    credits: 10000,
    researchPoints: 0,
    worldControl: 0,

    // Agent state
    activeAgents: [],
    agentLoadouts: {},

    // Dialog state
    activeDialogs: [],
    dialogStack: [],

    // Settings
    audioEnabled: true,
    musicVolume: 0.5,
    sfxVolume: 0.7
}
```

### 5.2 State Save/Load Functions
```javascript
STATE_PERSISTENCE = {
    save: function() {
        const state = {
            timestamp: Date.now(),
            screen: this.currentScreen,
            gameState: { ...PERSISTENT_STATE },
            dialogStack: [...DIALOG_STACK.stack]
        };
        localStorage.setItem('cyberops_state', JSON.stringify(state));
    },

    load: function() {
        const saved = localStorage.getItem('cyberops_state');
        if (!saved) return null;

        const state = JSON.parse(saved);
        Object.assign(PERSISTENT_STATE, state.gameState);
        DIALOG_STACK.stack = state.dialogStack;
        return state;
    }
}
```

## 6. EVENT FLOW DIAGRAM

### 6.1 Input Event Processing
```
User Input → Input Handler → State Validation → Action Execution → State Update → DOM Update
     ↓              ↓               ↓                  ↓               ↓            ↓
  Mouse/KB    Check Screen    Valid for State?   Execute Action   Update State   Update UI
                                    ↓                  ↓               ↓
                                If Invalid        Side Effects    Save State
                                  Return          (Audio, etc)   (if needed)
```

### 6.2 State Change Event Flow
```javascript
STATE_CHANGE_FLOW = {
    1: 'Validate transition',
    2: 'Execute exit callbacks',
    3: 'Save current state',
    4: 'Clear active dialogs',
    5: 'Update currentScreen',
    6: 'Update DOM visibility',
    7: 'Load new state data',
    8: 'Execute enter callbacks',
    9: 'Update UI components',
    10: 'Trigger state events'
}
```

## 7. COMMON ISSUES AND VALIDATION

### 7.1 State Validation Rules
```javascript
VALIDATION_RULES = {
    // Prevent invalid transitions
    'no_direct_game_to_complete': {
        from: 'game',
        to: 'complete',
        validate: () => false,
        message: 'Must go through victory/defeat first'
    },

    // Ensure cleanup on exit
    'cleanup_game_state': {
        from: 'game',
        to: ['menu', 'hub'],
        cleanup: () => {
            this.clearGameTimers();
            this.stopGameAudio();
            this.saveProgress();
        }
    },

    // Prevent dialog stacking issues
    'clear_dialogs_on_transition': {
        from: '*',
        to: ['game', 'menu', 'hub'],
        cleanup: () => {
            DIALOG_STACK.clear();
            window.modalEngine?.closeAll();
        }
    }
}
```

### 7.2 Common Transition Bugs
```javascript
KNOWN_ISSUES = {
    'stuck_dialogs': {
        symptoms: ['Dialog wont close', 'Multiple dialogs stacked'],
        cause: 'Dialog references lost during transitions',
        fix: 'Use DIALOG_STACK.clear() before state changes'
    },

    'lost_game_state': {
        symptoms: ['Progress lost', 'Agents missing'],
        cause: 'State not persisted before transition',
        fix: 'Call STATE_PERSISTENCE.save() on critical transitions'
    },

    'wrong_music': {
        symptoms: ['Wrong music playing', 'Multiple tracks'],
        cause: 'Audio not cleaned up on transition',
        fix: 'Stop all audio before loading new screen music'
    }
}
```

## 8. TESTING CHECKLIST

### 8.1 State Transition Tests
- [ ] Initial → Splash → Menu
- [ ] Menu → Hub → Briefing → Game
- [ ] Game → Victory → Hub
- [ ] Game → Defeat → Menu
- [ ] Game → Pause → Settings → Game
- [ ] Hub → Agent Management → Hire → Success → Hub
- [ ] Any State → Save/Load → Same State

### 8.2 Dialog Stack Tests
- [ ] Open 3 nested dialogs, close with X
- [ ] Open dialog A → B → C, use Back buttons
- [ ] Open dialog during state transition
- [ ] Test ESC key at various stack depths

### 8.3 Edge Cases
- [ ] Rapid state transitions
- [ ] State change during dialog animation
- [ ] Network lag during state load
- [ ] Browser back button handling

## 9. IMPLEMENTATION REFERENCE

### 9.1 Key Files
```
game-core.js        - State initialization
game-screens.js     - Screen transition logic
game-hub.js         - Hub state management
game-flow.js        - Game state flow
game-dialogs.js     - Dialog state handling
modal-engine.js     - Modal stack management
```

### 9.2 Key Functions
```javascript
// State transitions
showSyndicateHub()
startMission()
backToMainMenu()
showIntermissionDialog()

// Dialog management
showHudDialog()
closeDialog()
transitionDialog()

// State queries
getCurrentScreen()
getPreviousScreen()
isInGameState()
canTransitionTo()
```