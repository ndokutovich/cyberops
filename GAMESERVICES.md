# GameServices Architecture Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture Principles](#architecture-principles)
3. [Service Catalog](#service-catalog)
4. [Detailed Service Documentation](#detailed-service-documentation)
5. [Usage Patterns](#usage-patterns)
6. [Migration Guide](#migration-guide)
7. [Best Practices](#best-practices)

---

## Overview

GameServices is a centralized service locator that provides access to all game subsystems through a unified interface. It implements a Service-Oriented Architecture (SOA) following SOLID principles to eliminate code duplication, ensure data consistency, and improve maintainability.

### Why GameServices?

**Before GameServices:**
- Resources modified directly in 15+ files: `this.credits += 100`
- Agent state scattered across multiple systems
- Audio code duplicated in 3 different files
- Effects created with `this.effects.push()` in 8+ places
- No validation or bounds checking
- Save/load logic scattered everywhere

**With GameServices:**
- Single source of truth for all game state
- Automatic validation and bounds checking
- Event-driven UI updates
- Centralized persistence
- Consistent APIs across all systems

### Access Pattern

```javascript
// Access via game instance
game.gameServices.resourceService.add('credits', 100, 'mission reward');

// Or via window.GameServices (singleton)
window.GameServices.audioService.playSound('explosion');
```

---

## Architecture Principles

### 1. Single Responsibility Principle
Each service has one clear purpose:
- ResourceService manages ONLY resources
- AgentService manages ONLY agents
- AudioService manages ONLY audio

### 2. Dependency Injection
Services declare their dependencies in constructors:
```javascript
class MissionService {
    constructor(resourceService, agentService, eventLogService) {
        // Dependencies injected, not created internally
    }
}
```

### 3. Event-Driven Communication
Services emit events instead of direct coupling:
```javascript
resourceService.addListener('credits', (change) => {
    updateUI(change.newValue);
});
```

### 4. Immutable Operations
Services return new states rather than mutating:
```javascript
const agents = agentService.getActiveAgents(); // Returns copy, not reference
```

---

## Service Catalog

| Service | Purpose | Primary Use Cases |
|---------|---------|------------------|
| **FormulaService** | Core game mathematics and calculations | Damage calc, economics, progression |
| **ResourceService** | Manages credits, research points, world control | All economic transactions |
| **AgentService** | Manages agent lifecycle and state | Hiring, death, mission selection |
| **ResearchService** | Research tree progression and bonuses | Tech upgrades, agent improvements |
| **EquipmentService** | Weapon and equipment management | Loadout optimization, stat bonuses |
| **RPGService** | RPG mechanics integration | Level system, skills, RPG damage |
| **KeybindingService** | Keyboard shortcut management | Custom bindings, conflict prevention |
| **MapService** | Map and tile management | Map loading, collision, fog of war |
| **CameraService** | Camera control and viewport | Position, zoom, shake, following |
| **InputService** | Unified input handling | Mouse, keyboard, touch, gamepad |
| **InventoryService** | Manages weapons, equipment, loadouts | Item pickups, equipment management |
| **GameStateService** | Handles save/load and persistence | Save games, auto-save, state export |
| **AudioService** | Unified audio playback and management | Music, sound effects, volume |
| **EffectsService** | Visual effects and particles | Explosions, damage numbers, screen shake |
| **EventLogService** | Structured event logging | Combat log, quest tracking, debugging |
| **MissionService** | Mission objectives and completion | Objective tracking, rewards, extraction |

---

## Detailed Service Documentation

### 📊 ResourceService
**Purpose:** Centralized management of all game resources with validation and history tracking.

**Resources Managed:**
- Credits (currency)
- Research Points
- World Control (0-100%)
- Intel

**Key Methods:**
```javascript
// Get resource value
const credits = resourceService.get('credits');

// Set resource (with validation)
resourceService.set('credits', 5000, 'starting bonus');

// Add to resource (handles rewards)
resourceService.add('researchPoints', 100, 'mission complete');

// Spend resource (with affordability check)
if (resourceService.spend('credits', 1000, 'buy weapon')) {
    // Purchase successful
}

// Check affordability
if (resourceService.canAfford('credits', 500)) {
    // Can make purchase
}

// Complex transaction (atomic - all or nothing)
resourceService.transaction([
    { resource: 'credits', amount: -1000, operation: 'spend' },
    { resource: 'researchPoints', amount: -50, operation: 'spend' }
], 'research upgrade');

// Apply mission rewards
resourceService.applyMissionRewards({
    credits: 2000,
    researchPoints: 100,
    worldControl: 5
});
```

**When to Use:**
- ✅ ANY resource modification
- ✅ Checking affordability before purchases
- ✅ Applying mission/quest rewards
- ✅ Multi-resource transactions
- ❌ NEVER modify game.credits directly

**Events:**
```javascript
resourceService.addListener('credits', (change) => {
    console.log(`Credits: ${change.oldValue} → ${change.newValue}`);
});
```

---

### 👥 AgentService
**Purpose:** Complete agent lifecycle management from hiring to death.

**Key Methods:**
```javascript
// Get agents
const active = agentService.getActiveAgents();
const available = agentService.getAvailableAgents();
const fallen = agentService.getFallenAgents();

// Get specific agent (by ID, name, or originalId)
const agent = agentService.getAgent('Alex Chen');
const agent2 = agentService.getAgent(1); // by ID

// Hire agent (auto-deducts cost via ResourceService)
if (agentService.hireAgent(agentId)) {
    // Agent hired successfully
}

// Agent death
agentService.killAgent(agentId, 'enemy sniper');

// Revive fallen agent
agentService.reviveAgent(agentId, 5000); // cost

// Select agents for mission
const selected = agentService.selectAgentsForMission([1, 2, 3, 4]);

// Update agent stats
agentService.updateAgent(agentId, {
    health: 75,
    xp: 150,
    level: 2
});

// Damage/heal
agentService.damageAgent(agentId, 25, 'explosion');
agentService.healAgent(agentId, 50);
```

**When to Use:**
- ✅ Agent hiring/dismissal
- ✅ Mission team selection
- ✅ Agent health/status changes
- ✅ Finding agents by any identifier
- ❌ NEVER modify game.activeAgents directly

**Events:**
```javascript
agentService.addListener('death', (data) => {
    console.log(`${data.agent.name} killed by ${data.killer}`);
});
```

---

### 🎒 InventoryService
**Purpose:** Manages all items, weapons, equipment, and agent loadouts.

**Key Methods:**
```javascript
// Pickup item (auto-equips if agent has empty slot)
inventoryService.pickupItem(agent, {
    type: 'weapon',
    weapon: 'plasma_rifle',
    damage: 50
});

// Equipment management
inventoryService.equipItem(agentId, 'weapon', weaponId);
inventoryService.unequipItem(agentId, 'weapon');

// Buy/sell
inventoryService.buyItem('weapon', itemData, 1000);
inventoryService.sellItem('weapon', weaponId);

// Get agent loadout
const equipment = inventoryService.getAgentEquipment(agentId);
// Returns: { weapon: itemId, armor: itemId, utility: itemId }

// Apply equipment to agent for mission
inventoryService.applyAgentEquipment(agent);

// Sync equipped counts (fixes equipped > owned bugs)
inventoryService.syncEquippedCounts();
```

**When to Use:**
- ✅ ALL item pickups
- ✅ Equipment changes
- ✅ Shop transactions
- ✅ Loadout management
- ❌ NEVER modify equipment arrays directly

---

### 💾 GameStateService
**Purpose:** Complete save/load management with versioning and validation.

**Key Methods:**
```javascript
// Save game
gameStateService.saveGame(game, slot, isAutoSave);
gameStateService.quickSave(game); // Current slot

// Load game
gameStateService.loadGame(game, slot);
gameStateService.quickLoad(game); // Current slot

// Auto-save management
gameStateService.startAutoSave(); // Every 60 seconds during gameplay
gameStateService.stopAutoSave();

// Get save info
const saves = gameStateService.getSaveSlots();
// Returns array of save slot info with timestamps

// Delete save
gameStateService.deleteSave(slot);

// Export/import saves
gameStateService.exportSave(slot); // Downloads as file
await gameStateService.importSave(file, slot); // From file upload
```

**When to Use:**
- ✅ ALL save/load operations
- ✅ Auto-save during missions
- ✅ Save management UI
- ✅ Cloud save sync (future)
- ❌ NEVER use localStorage directly

**Features:**
- Automatic save versioning
- Save migration for compatibility
- State validation
- Corruption prevention

---

### 🔊 AudioService
**Purpose:** Unified audio system replacing 3 scattered implementations.

**Key Methods:**
```javascript
// Initialize (required for user interaction)
await audioService.initialize();

// Music control
audioService.playMusic('music/combat.mp3', {
    loop: true,
    fadeIn: true,
    volume: 0.8
});
audioService.stopMusic({ fadeOut: true });
audioService.setMusicState('combat'); // Changes music based on state

// Sound effects
audioService.playSound('sfx/explosion.wav', {
    volume: 1.0,
    pitch: 1.2,
    position: { x: 100, y: 50, z: 0 } // 3D sound
});

// Procedural sounds (no file needed)
audioService.playProceduralSound('explosion', {
    duration: 500,
    volume: 0.8
});

// Volume control
audioService.setVolume('master', 0.8);
audioService.setVolume('music', 0.5);
audioService.setVolume('sfx', 1.0);

// 3D listener (for positional audio)
audioService.setListenerPosition(agent.x, agent.y, 0);

// Preload audio files
await audioService.preloadAudio([
    'music/menu.mp3',
    'sfx/shoot.wav',
    'sfx/hit.wav'
]);

// Pause/resume
audioService.setPaused(true);
```

**When to Use:**
- ✅ ALL music playback
- ✅ ALL sound effects
- ✅ Volume settings
- ✅ 3D positional audio
- ❌ NEVER create Audio elements directly

**Events:**
```javascript
audioService.addListener('stateChange', (data) => {
    console.log(`Music state: ${data.from} → ${data.to}`);
});
```

---

### ✨ EffectsService
**Purpose:** Visual effects with object pooling for performance.

**Key Methods:**
```javascript
// Create effects
effectsService.createEffect('explosion', x, y, {
    scale: 2,
    duration: 500,
    particleCount: 30
});

effectsService.createEffect('hit', x, y, {
    color: '#ff0000',
    scale: 0.5
});

// Damage numbers
effectsService.createDamageNumber(x, y, 50, '#ff0000');
effectsService.createStatusText(x, y, 'CRITICAL!', '#ffff00');

// Screen effects
effectsService.shakeScreen(10, 500); // intensity, duration
effectsService.flashScreen('#ffffff', 200, 0.5); // color, duration, alpha

// Particles
effectsService.createParticle(x, y, {
    vx: 5, vy: -10,
    lifetime: 1000,
    color: '#00ff00',
    gravity: true
});

// Update (call each frame)
effectsService.update(deltaTime);

// Get render data
const renderData = effectsService.getRenderData();
// Draw renderData.particles, apply renderData.screenShake, etc.

// Performance config
effectsService.setConfig('maxParticles', 200);
effectsService.setConfig('enableScreenShake', false);
```

**When to Use:**
- ✅ ALL visual effects
- ✅ Damage feedback
- ✅ Screen effects
- ✅ Particle systems
- ❌ NEVER push to effects array directly

**Features:**
- Object pooling (100 pre-allocated)
- Automatic cleanup
- Performance limits
- Physics simulation

---

### 📝 EventLogService
**Purpose:** Structured logging with filtering and search.

**Key Methods:**
```javascript
// Log events by category
eventLogService.logCombat('attack', attacker, target, 25);
eventLogService.logItem('pickup', agent, 'Plasma Rifle');
eventLogService.logQuest('complete', 'Hack the Mainframe');
eventLogService.logMission('start', 'Corporate Infiltration');
eventLogService.logResource('gain', 'credits', 1000);
eventLogService.logError('Failed to load audio', error);

// Custom logging
eventLogService.log('custom', 'special_event', {
    agent: 'Alex',
    action: 'used_ability',
    target: 'enemy_boss'
}, eventLogService.priorities.HIGH);

// Query events
const recent = eventLogService.getRecentEvents(60); // Last 60 seconds
const combat = eventLogService.getEventsByCategory('combat');
const critical = eventLogService.getEventsByPriority(2); // HIGH and above
const searched = eventLogService.searchEvents('plasma rifle');

// Filtering
eventLogService.setFilter('category', 'combat');
eventLogService.setFilter('priority', 2);
eventLogService.setFilter('search', 'Alex');
eventLogService.clearFilter();

// Export
const json = eventLogService.exportEvents('json');
const csv = eventLogService.exportEvents('csv');
const text = eventLogService.exportEvents('text');

// Statistics
const stats = eventLogService.getStatistics();
```

**When to Use:**
- ✅ Combat events
- ✅ Quest/objective updates
- ✅ Error tracking
- ✅ Player action history
- ✅ Debug logging
- ❌ NEVER use console.log for game events

**Templates:**
```javascript
// Add custom templates for consistent formatting
eventLogService.addTemplate('combat', 'backstab',
    '{attacker} backstabs {target} for {damage} damage!');
```

---

### 🎯 MissionService
**Purpose:** Complete mission lifecycle and objective management.

**Key Methods:**
```javascript
// Start mission
missionService.startMission({
    id: 'corp_01',
    name: 'Corporate Infiltration',
    objectives: [
        {
            type: 'eliminate',
            description: 'Eliminate all guards',
            target: { type: 'guard', count: 8 },
            required: true
        },
        {
            type: 'hack',
            description: 'Hack the mainframe',
            target: { id: 'mainframe' },
            required: true
        },
        {
            type: 'collect',
            description: 'Collect intel',
            target: { type: 'intel', count: 3 },
            bonus: true
        }
    ],
    rewards: {
        credits: 5000,
        researchPoints: 100,
        worldControl: 2
    },
    extractionPoint: { x: 78, y: 5 }
});

// Track events for objectives
missionService.trackEvent('enemyKilled', { enemyType: 'guard' });
missionService.trackEvent('terminalHacked', { terminalId: 'mainframe' });
missionService.trackEvent('itemCollected', { itemType: 'intel' });

// Complete objectives manually
missionService.completeObjective('obj_1');
missionService.failObjective('obj_2');

// Enable extraction
missionService.enableExtraction();

// Complete/fail mission
missionService.completeMission(true); // extracted successfully
missionService.failMission('All agents eliminated');
missionService.abortMission();

// Get progress
const progress = missionService.getMissionProgress();
const stats = missionService.getMissionStatistics();

// Update (call each frame)
missionService.update(deltaTime);
```

**When to Use:**
- ✅ Mission start/end
- ✅ Objective tracking
- ✅ Extraction management
- ✅ Mission rewards
- ❌ NEVER track objectives manually

**Events:**
```javascript
missionService.addListener('objectiveComplete', (data) => {
    console.log(`✅ ${data.objective.description}`);
});

missionService.addListener('extractionEnabled', (data) => {
    console.log('🚁 Get to the extraction point!');
});
```

---

### 🧮 FormulaService
**Purpose:** Central calculation engine for all game mathematics and formulas.

**Key Methods:**
```javascript
// Damage calculations
const damage = formulaService.calculateDamage(
    baseDamage,
    weaponBonus,
    researchBonus,
    targetArmor,
    { critical: true, headshot: false, cover: 0.5 }
);

// Collectible effects
const effect = formulaService.calculateCollectibleEffect(
    { type: 'credits', amount: 100 },
    agent,
    gameState
);

// Mission rewards with bonuses
const rewards = formulaService.calculateMissionRewards({
    baseCredits: 5000,
    baseResearch: 100,
    objectivesCompleted: 3,
    bonusObjectivesCompleted: 1,
    allAgentsSurvived: true,
    stealthBonus: true
});

// Economics
const sellPrice = formulaService.calculateSellPrice(1000); // 50% of value
const repairCost = formulaService.calculateRepairCost(agent);
const economy = formulaService.analyzeEconomy(gameState);

// Vision and detection
const visionRange = formulaService.calculateAgentVisionRange(agent);
const detectionRange = formulaService.calculateDetectionRange(
    enemy, stealthBonus, alertLevel
);

// Hacking calculations
const hackRange = formulaService.calculateHackingRange(
    baseRange, hackBonus, hasResearch
);
const hackSpeed = formulaService.calculateHackingSpeed(
    baseSpeed, hackBonus
);

// Movement costs
const cost = formulaService.calculateMovementCost(fromTile, toTile);
const speed = formulaService.calculateAgentSpeed(agent, wounded);

// XP and progression
const xpNeeded = formulaService.calculateXPRequired(currentLevel);
```

**When to Use:**
- ✅ ANY mathematical calculation
- ✅ Damage and combat math
- ✅ Economic calculations
- ✅ Vision/detection ranges
- ✅ Progression formulas
- ❌ NEVER hardcode formulas elsewhere

---

### 🔬 ResearchService
**Purpose:** Manages the research tree, tech progression, and research bonuses.

**Research Projects:**
```javascript
// Available research categories
1. Weapon Upgrades (+10% damage, +15% accuracy)
2. Stealth Technology (+2 stealth, +20% hack speed)
3. Combat Systems (+15% crit, +10% speed)
4. Hacking Protocols (+2 hack range, +30% hack speed)
5. Medical Systems (+20 HP, between-mission healing)
6. Advanced Tactics (+1 vision, +15% XP gain)
```

**Key Methods:**
```javascript
// Check research status
const completed = researchService.isResearchCompleted(projectId, completedList);
const canAfford = researchService.canAffordResearch(projectId, points);
const progress = researchService.calculateResearchProgress(completedList);

// Complete research
researchService.completeResearch(projectId, completedList);

// Apply bonuses to agents
const modifiedAgent = researchService.applyResearchToAgent(
    agent,
    completedResearch
);

const modifiedRoster = researchService.applyResearchToRoster(
    roster,
    completedResearch
);

// Get recommendations
const recommended = researchService.getRecommendedResearch(
    completedResearch,
    'stealth' // or 'combat', 'tech', 'balanced'
);

// Medical healing between missions
researchService.applyMedicalHealing(agents, completedResearch);

// Calculate costs
const totalSpent = researchService.calculateTotalSpent(completedResearch);
```

**When to Use:**
- ✅ Research tree UI
- ✅ Applying research bonuses
- ✅ Between-mission healing
- ✅ Research recommendations
- ❌ NEVER apply bonuses manually

---

### 🎯 EquipmentService
**Purpose:** Manages weapons, equipment, and provides loadout recommendations.

**Equipment Database:**
```javascript
// Weapons
- Silenced Pistol: 25 damage, 5 range, 85% accuracy
- Assault Rifle: 35 damage, 8 range, 75% accuracy
- Sniper Rifle: 50 damage, 12 range, 90% accuracy
- SMG: 20 damage, 6 range, 70% accuracy

// Equipment
- Body Armor: +20 protection
- Hacking Kit: +3 hack bonus
- Explosives Kit: +15 explosive damage, +2 blast radius
- Stealth Suit: +3 stealth bonus
```

**Key Methods:**
```javascript
// Get equipment data
const weapon = equipmentService.getWeapon('assault_rifle');
const armor = equipmentService.getEquipment('body_armor');

// Apply equipment to agent
const equippedAgent = equipmentService.applyEquipmentToAgent(
    agent,
    weaponInventory,
    equipmentInventory,
    assignedWeapon // optional specific weapon
);

// Get recommendations by role
const loadout = equipmentService.getRecommendedLoadout(
    'sniper', // or 'assault', 'stealth', 'hacker', 'demolition'
    10000 // budget
);

// Calculate effectiveness
const score = equipmentService.calculateEffectivenessScore(
    agent,
    'stealth_mission' // or 'assault_mission', 'defense_mission'
);

// Purchase planning
const cost = equipmentService.calculatePurchaseCost([
    { type: 'weapon', id: 'sniper_rifle' },
    { type: 'equipment', id: 'stealth_suit' }
]);

// Get upgrade suggestions
const upgrades = equipmentService.getUpgradePath(currentLoadout);
```

**When to Use:**
- ✅ Equipment shop UI
- ✅ Loadout optimization
- ✅ Mission preparation
- ✅ Equipment recommendations
- ❌ NEVER modify equipment stats directly

---

### ⚔️ RPGService
**Purpose:** Integrates RPG mechanics with the tactical game systems.

**Key Methods:**
```javascript
// Create RPG entities
const rpgAgent = rpgService.createRPGAgent(agent, 'soldier');
const rpgEnemy = rpgService.createRPGEnemy(enemy, 'guard');

// RPG damage calculation (uses real equipped weapons)
const damage = rpgService.calculateRPGDamage(
    attacker,
    target,
    'rifle' // weapon type
);

// Sync with game systems
rpgService.syncEquipment(game); // Sync hub equipment
rpgService.syncLoadouts(game); // Sync agent loadouts

// Apply RPG stats
if (agent.rpgEntity) {
    const strength = agent.rpgEntity.str;
    const critChance = agent.rpgEntity.critChance;
    const damageResist = agent.rpgEntity.damageResistance;
}
```

**When to Use:**
- ✅ RPG-enhanced missions
- ✅ Character progression
- ✅ Advanced damage calculations
- ✅ Skill systems
- ❌ NEVER mix RPG and non-RPG calculations

---

### ⌨️ KeybindingService
**Purpose:** Centralized keyboard shortcut management with conflict prevention.

**Key Methods:**
```javascript
// Register new binding
keybindingService.registerBinding(
    'myAction',           // Action identifier
    'K',                  // Default key
    'Perform My Action',  // Description
    'combat'              // Category
);

// Get binding info
const key = keybindingService.getKey('hack');           // Returns 'H'
const action = keybindingService.getActionByKey('F');   // Returns 'fire'
const bound = keybindingService.isKeyBound('G');        // Returns true

// Update bindings
keybindingService.updateBinding('fire', 'Space');       // Change fire to spacebar
keybindingService.resetBinding('fire');                 // Reset to default
keybindingService.resetAllBindings();                   // Reset everything

// Check key events
if (keybindingService.matchesBinding('hack', event)) {
    // H key was pressed, execute hack
}

// Get bindings by category
const combatKeys = keybindingService.getBindingsByCategory('combat');
const allBindings = keybindingService.getAllBindings();

// Generate help text
const helpText = keybindingService.getHelpText();
console.log(helpText);  // Formatted list of all keybindings

// Export for UI
const uiData = keybindingService.exportForUI();        // Structured data for settings UI
```

**Default Categories:**
- **agents**: Agent selection (1-6, Tab, T)
- **combat**: Combat actions (F=Fire, G=Grenade, R=Reload)
- **abilities**: Special abilities (H=Hack, Q=Shield, E=Stealth)
- **team**: Team commands (X=Hold, C=Patrol, V=Follow)
- **movement**: Movement controls (L=Squad follow)
- **view**: Camera controls (=/- for zoom, Home=center)
- **ui**: Interface toggles (M=Mission log, ?=Help)
- **game**: Game controls (Space=Pause, F5=Save, F9=Load)
- **debug**: Debug options (P=Paths, O=Pathfinding)

**When to Use:**
- ✅ ALL keyboard input handling
- ✅ Custom keybinding UI
- ✅ Preventing key conflicts
- ✅ Loading/saving user preferences
- ❌ NEVER hardcode keys in game logic

**Features:**
- Conflict prevention
- User customization
- Persistence to localStorage
- Category organization
- Help text generation

---

### 🗺️ MapService
**Purpose:** Centralized map management including tiles, collision, and visibility.

**Key Methods:**
```javascript
// Load map from mission data
mapService.loadMap(mapData);

// Tile operations
const tileType = mapService.getTileAt(x, y);            // Get tile (0=floor, 1=wall)
mapService.setTileAt(x, y, mapService.TILE_WALL);       // Set tile
const walkable = mapService.isWalkable(x, y);           // Check if walkable
const canMove = mapService.canMoveTo(x1, y1, x2, y2);   // Check movement path

// Fog of war management
mapService.setFogEnabled(true);                         // Enable/disable fog
mapService.updateFogOfWar([                             // Update visibility
    { x: agent1.x, y: agent1.y, visionRange: 8 },
    { x: agent2.x, y: agent2.y, visionRange: 8 }
]);
const visible = mapService.isVisible(x, y);             // Check if visible
const explored = mapService.isExplored(x, y);           // Check if explored
const fogState = mapService.getFogAt(x, y);             // 0=unexplored, 1=explored, 2=visible

// Entity queries
const terminal = mapService.getTerminalAt(x, y);        // Get nearby terminal
const door = mapService.getDoorAt(x, y);                // Get door
const collectible = mapService.getCollectibleAt(x, y);  // Get item
const entities = mapService.getEntitiesAt(x, y, radius); // All entities

// Door management
mapService.unlockDoor(x, y);                            // Unlock at position
mapService.unlockDoor(null, null, 'terminal_id');       // Unlock by terminal
const blocked = mapService.isDoorBlocking(x, y);        // Check if blocked

// Line of sight
const hasLOS = mapService.hasLineOfSight(x1, y1, x2, y2);

// Utilities
const pos = mapService.findNearestWalkable(x, y, 5);    // Find walkable spot
mapService.removeCollectible(index);                    // Remove collected item
```

**Map Data Properties:**
- `width`, `height` - Map dimensions
- `tiles` - 2D array of tile types
- `spawn` - Player spawn point
- `extraction` - Mission extraction point
- `terminals`, `doors`, `collectibles` - Interactive objects
- `fogOfWar` - 2D visibility array

**When to Use:**
- ✅ ALL map loading and queries
- ✅ Collision detection
- ✅ Fog of war updates
- ✅ Entity placement and queries
- ❌ NEVER modify map.tiles directly

---

### 📷 CameraService
**Purpose:** Centralized camera management with effects and boundaries.

**Key Methods:**
```javascript
// Position control
cameraService.setPosition(x, y, immediate);             // Set position
cameraService.move(dx, dy);                             // Move by delta
cameraService.centerOn(worldX, worldY);                 // Center on world pos
cameraService.centerOnIsometric(isoX, isoY);            // Center on iso pos

// Zoom control
cameraService.zoomIn(centerX, centerY);                 // Zoom in
cameraService.zoomOut(centerX, centerY);                // Zoom out
cameraService.setZoom(level, centerX, centerY);         // Set zoom level
cameraService.resetZoom();                              // Reset to 1.0

// Camera effects
cameraService.shake(intensity, duration);               // Screen shake
cameraService.followEntity(entity, offset);             // Follow target
cameraService.stopFollowing();                          // Stop following

// Boundaries
cameraService.setViewport(width, height);               // Update viewport
cameraService.setBoundaries(minX, minY, maxX, maxY);    // Set limits
cameraService.disableBoundaries();                      // Remove limits

// Visibility checks
const visible = cameraService.isVisible(x, y, margin);  // Check if on screen
const rectVis = cameraService.isRectVisible(x, y, w, h);
const bounds = cameraService.getVisibleBounds();        // Get screen area

// Edge scrolling
cameraService.edgeScrollEnabled = true;                 // Enable
cameraService.edgeScrollSpeed = 10;                     // Pixels/frame
cameraService.handleEdgeScroll(mouseX, mouseY);         // Process

// Update (call each frame)
cameraService.update(deltaTime);                        // Update camera
```

**Configuration:**
- `minZoom`, `maxZoom` - Zoom limits (default 0.5-2.0)
- `smoothing` - Camera movement smoothing (0-1)
- `edgeScrollZone` - Pixels from edge for scrolling
- `followDeadzone` - Dead zone for entity following

**When to Use:**
- ✅ ALL camera movement
- ✅ Zoom control
- ✅ Screen shake effects
- ✅ Entity following
- ❌ NEVER modify cameraX/cameraY directly

---

### 🎮 InputService
**Purpose:** Unified input handling for all input devices.

**Key Methods:**
```javascript
// Initialize
inputService.initialize(canvas, {
    screenToWorld: (x, y) => game.screenToWorld(x, y),
    worldToScreen: (x, y) => game.worldToScreen(x, y)
});

// Mouse state queries
const pos = inputService.mousePosition;                 // {x, y} in screen
const worldPos = inputService.mouseWorldPosition;       // {x, y} in world
const isDragging = inputService.isDragging;             // Is dragging?
const leftDown = inputService.isMouseButtonPressed(0);  // 0=left, 1=middle, 2=right

// Keyboard state queries
const wPressed = inputService.isKeyPressed('KeyW');     // Key codes
const pressed = inputService.getPressedKeys();          // All pressed keys

// Touch state
const touches = inputService.touches;                   // Map of active touches
const pinching = inputService.pinchDistance > 0;        // Pinch gesture active

// Event listeners
inputService.on('click', (data) => {
    // data.position, data.worldPosition, data.button
});

inputService.on('drag', (data) => {
    // data.position, data.delta, data.start
});

inputService.on('keydown', (data) => {
    // data.key, data.code, data.shiftKey, data.ctrlKey
});

inputService.on('wheel', (data) => {
    // data.delta (-1 or 1), data.deltaRaw
});

inputService.on('pinch', (data) => {
    // data.scale, data.distance, data.center
});

inputService.on('tap', (data) => {
    // data.position, data.duration
});

// Control
inputService.setEnabled(false);                         // Disable all input
inputService.captureMouse = false;                      // Disable mouse only
inputService.captureKeyboard = false;                   // Disable keyboard only

// Key repeat configuration
inputService.keyRepeatDelay = 500;                      // ms before repeat
inputService.keyRepeatInterval = 50;                    // ms between repeats

// Cleanup
inputService.destroy();                                 // Remove all listeners
```

**Events:**
- Mouse: `mousedown`, `mouseup`, `mousemove`, `click`, `doubleclick`, `drag`, `dragend`, `wheel`, `contextmenu`
- Keyboard: `keydown`, `keyup`
- Touch: `touchstart`, `touchmove`, `touchend`, `tap`, `pinch`
- Gamepad: `gamepadbuttondown`, `gamepadbuttonup`, `gamepadaxes`

**When to Use:**
- ✅ ALL input handling
- ✅ Gesture recognition
- ✅ Input state queries
- ✅ Multi-device support
- ❌ NEVER add event listeners directly to canvas/window

**Features:**
- Unified event system
- Touch gesture support
- Gamepad polling
- Key repeat handling
- Coordinate conversion

---

## Usage Patterns

### Pattern 1: Service Chaining
Services work together automatically:
```javascript
// AgentService uses ResourceService for hiring costs
agentService.hireAgent(agentId); // Auto-deducts credits

// MissionService uses ResourceService for rewards
missionService.completeMission(); // Auto-adds rewards
```

### Pattern 2: Event-Driven UI Updates
```javascript
// Setup listeners once
resourceService.addListener('any', updateResourceUI);
agentService.addListener('any', updateAgentUI);
effectsService.addListener('shakeStart', shakeCamera);

// Services handle all notifications
resourceService.add('credits', 1000); // UI updates automatically
```

### Pattern 3: Validation and Safety
```javascript
// Services validate all operations
resourceService.spend('credits', 999999); // Returns false if can't afford
agentService.hireAgent('invalid_id'); // Returns false, doesn't crash
audioService.playSound('missing.wav'); // Fails gracefully
```

### Pattern 4: Atomic Transactions
```javascript
// Multi-step operations succeed or fail together
resourceService.transaction([
    { resource: 'credits', amount: -5000 },
    { resource: 'researchPoints', amount: -100 }
], 'upgrade_purchase');
// If either fails, neither is applied
```

---

## Migration Guide

### Migrating Resource Code
```javascript
// OLD - Direct modification
this.credits += reward;
this.researchPoints -= cost;
if (this.credits >= price) { ... }

// NEW - Use ResourceService
gameServices.resourceService.add('credits', reward, 'mission reward');
gameServices.resourceService.spend('researchPoints', cost, 'research');
if (gameServices.resourceService.canAfford('credits', price)) { ... }
```

### Migrating Agent Code
```javascript
// OLD - Direct array manipulation
this.activeAgents.push(agent);
const agent = this.activeAgents.find(a => a.name === name);

// NEW - Use AgentService
gameServices.agentService.hireAgent(agentId);
const agent = gameServices.agentService.getAgent(name);
```

### Migrating Audio Code
```javascript
// OLD - Multiple audio systems
this.musicPlayer.play('track.mp3');
const audio = new Audio('sound.wav');
audio.play();

// NEW - Use AudioService
gameServices.audioService.playMusic('track.mp3');
gameServices.audioService.playSound('sound.wav');
```

### Migrating Effects Code
```javascript
// OLD - Direct array push
this.effects.push({
    type: 'explosion',
    x: 100, y: 200,
    lifetime: 0
});

// NEW - Use EffectsService
gameServices.effectsService.createEffect('explosion', 100, 200);
```

### Migrating Save/Load Code
```javascript
// OLD - Direct localStorage
localStorage.setItem('save', JSON.stringify(gameState));
const save = JSON.parse(localStorage.getItem('save'));

// NEW - Use GameStateService
gameServices.gameStateService.saveGame(game, slot);
gameServices.gameStateService.loadGame(game, slot);
```

---

## Best Practices

### 1. Always Use Services
```javascript
// ❌ BAD - Direct modification
game.credits += 100;
game.activeAgents.push(newAgent);
this.effects.push(explosion);

// ✅ GOOD - Use services
gameServices.resourceService.add('credits', 100, 'reward');
gameServices.agentService.hireAgent(agentId);
gameServices.effectsService.createEffect('explosion', x, y);
```

### 2. Provide Context for Operations
```javascript
// ❌ BAD - No context
resourceService.add('credits', 1000);

// ✅ GOOD - Clear context
resourceService.add('credits', 1000, 'mission_complete: corp_01');
```

### 3. Check Return Values
```javascript
// ❌ BAD - Assume success
gameServices.resourceService.spend('credits', 5000);
equipWeapon();

// ✅ GOOD - Verify success
if (gameServices.resourceService.spend('credits', 5000, 'buy weapon')) {
    equipWeapon();
} else {
    showError('Insufficient credits');
}
```

### 4. Use Events for Loose Coupling
```javascript
// ❌ BAD - Direct UI updates
resourceService.add('credits', 100);
document.getElementById('credits').textContent = resourceService.get('credits');

// ✅ GOOD - Event-driven
resourceService.addListener('credits', (change) => {
    document.getElementById('credits').textContent = change.newValue;
});
resourceService.add('credits', 100); // UI updates automatically
```

### 5. Initialize Services Early
```javascript
// In game initialization
async function initGame() {
    // Initialize services first
    await gameServices.audioService.initialize();
    gameServices.effectsService.initialize();

    // Then load game content
    await loadCampaign();

    // Start game
    startGame();
}
```

### 6. Use Service Methods, Not Properties
```javascript
// ❌ BAD - Direct property access
const credits = gameServices.resourceService.resources.credits;

// ✅ GOOD - Use getter methods
const credits = gameServices.resourceService.get('credits');
```

### 7. Handle Service Unavailability
```javascript
// ✅ GOOD - Graceful degradation
if (gameServices?.audioService?.initialized) {
    gameServices.audioService.playSound('explosion');
} else {
    console.warn('Audio not available');
}
```

### 8. Cleanup on Scene Changes
```javascript
// When leaving a mission
function exitMission() {
    gameServices.effectsService.clearAll();
    gameServices.audioService.stopAllSounds();
    gameServices.missionService.reset();
}
```

---

## Performance Considerations

### Object Pooling
EffectsService uses object pooling to reduce GC pressure:
- 100 pre-allocated effect objects
- 100 pre-allocated particle objects
- Reuses inactive objects instead of creating new

### Audio Buffer Caching
AudioService caches decoded audio:
- Loads once, plays many times
- Prevents duplicate network requests
- Shares buffers across instances

### Event Batching
Services batch events when possible:
```javascript
// Transaction batches multiple changes into one event
resourceService.transaction([
    { resource: 'credits', amount: 1000 },
    { resource: 'researchPoints', amount: 50 }
]);
```

### Lazy Initialization
Services initialize on-demand:
```javascript
// Audio only initializes when needed
if (userClickedStart) {
    await audioService.initialize();
}
```

---

## Debugging

### Enable Debug Logging
```javascript
// Add debug listener to any service
gameServices.resourceService.addListener('any', (event) => {
    console.log('Resource Event:', event);
});

// Get service statistics
console.log(gameServices.effectsService.getStatistics());
console.log(gameServices.eventLogService.getStatistics());
console.log(gameServices.agentService.getStatistics());
```

### View History
```javascript
// ResourceService tracks history
const history = gameServices.resourceService.getHistory(20);
console.table(history);

// EventLogService provides full event log
const events = gameServices.eventLogService.getEvents(100);
console.table(events);
```

### Export State
```javascript
// Export complete game state for debugging
const state = {
    resources: gameServices.resourceService.exportState(),
    agents: gameServices.agentService.exportState(),
    inventory: gameServices.inventoryService.exportState(),
    mission: gameServices.missionService.exportState()
};
console.log(JSON.stringify(state, null, 2));
```

---

## Future Enhancements

### Newly Added Services (Extracted 2024)

#### 🤖 AIService
**Purpose:** Centralized enemy AI behavior, pathfinding, and decision making.

**Key Methods:**
```javascript
// Add enemies to AI system
aiService.addEnemy(enemy);
aiService.removeEnemy(enemyId);

// Pathfinding (A* algorithm)
const path = aiService.findPath(startX, startY, endX, endY);

// AI state management
aiService.setEnemyState(enemyId, aiService.AI_STATES.ALERT);
const state = aiService.getEnemyState(enemyId);

// Vision and detection
const canSee = aiService.canSeeTarget(enemy, target);
const detected = aiService.detectPlayer(enemy, players);

// Update AI (called each frame)
aiService.update(deltaTime);
```

**AI States:**
- IDLE - Standing guard
- PATROL - Following patrol route
- ALERT - Heard something suspicious
- CHASE - Actively pursuing target
- ATTACK - Engaging in combat
- SEARCH - Looking for lost target
- RETURN - Returning to post

---

#### 🎯 ProjectileService
**Purpose:** Manages all projectile physics, collision detection, and damage.

**Key Methods:**
```javascript
// Fire a projectile
projectileService.fireProjectile(
    { x: agent.x, y: agent.y },
    { x: target.x, y: target.y },
    {
        damage: 20,
        speed: 10,
        owner: agent,
        type: 'bullet'
    }
);

// Manual projectile creation
const projectile = projectileService.createProjectile({
    x: startX,
    y: startY,
    vx: velocityX,
    vy: velocityY,
    damage: 15
});

// Update projectiles (called each frame)
projectileService.update(deltaTime, {
    agents: gameState.agents,
    enemies: gameState.enemies,
    walls: gameState.walls
});

// Get statistics
const stats = projectileService.getStats();
// { totalFired: 100, hits: 67, misses: 33, accuracy: 0.67 }
```

---

#### 🎬 AnimationService
**Purpose:** Centralized animation management for sprites and visual effects.

**Key Methods:**
```javascript
// Create sprite animation
const animId = animationService.createSpriteAnimation(
    agent,           // Target object
    'agent-walk',    // Animation name
    { loop: true }   // Options
);

// Property transitions
animationService.fadeIn(element, 1000);
animationService.fadeOut(element, 500);
animationService.moveTo(object, fromX, fromY, toX, toY, 1000);
animationService.scale(object, 1, 2, 500);  // Scale from 1x to 2x
animationService.shake(object, intensity, duration);

// Floating text
animationService.createFloatingText(
    x, y,
    '+100 XP',
    { color: '#0f0', duration: 2000 }
);

// Control animations
animationService.pause(animId);
animationService.resume(animId);
animationService.stop(animId);

// Update animations (called each frame)
animationService.update(deltaTime);
```

---

#### 🎨 RenderingService
**Purpose:** Centralized canvas rendering pipeline (consolidated 1,527 lines).

**Key Methods:**
```javascript
// Initialize with canvas
renderingService.initialize(canvas);

// Main render call
renderingService.renderFrame(gameState, camera);

// Visual effects
renderingService.applyScreenShake(intensity, duration);
renderingService.applyScreenFlash('#fff', 0.5, 200);

// Debug visualization
renderingService.setDebug('showFPS', true);
renderingService.setDebug('showVisionCones', true);
renderingService.setDebug('showPaths', true);

// Performance stats
const stats = renderingService.getStats();
// { fps: 60, drawCalls: 145, particlesRendered: 50 }
```

---

#### 🖼️ UIService
**Purpose:** Modal dialogs, notifications, tooltips (NOT HUD - separate service).

**Key Methods:**
```javascript
// Notifications
uiService.showNotification(
    'Mission Complete!',
    uiService.NotificationType.SUCCESS,
    { duration: 5000, persistent: false }
);

// Dialogs (integrates with DeclarativeDialogEngine)
uiService.showDialog({
    title: 'Confirm Action',
    content: 'Are you sure?',
    buttons: [
        { text: 'Yes', action: 'confirm' },
        { text: 'No', action: 'close' }
    ]
});

// Tooltips
uiService.showTooltip(element, 'Hover info', { position: 'top' });

// Context menus
uiService.showContextMenu(x, y, [
    { label: 'Attack', action: () => attack() },
    { separator: true },
    { label: 'Move', action: () => move() }
]);

// UI blocking
uiService.blockUI('Loading...');
uiService.unblockUI();
```

---

#### 🎮 HUDService
**Purpose:** Game HUD elements - health bars, objectives, minimap.

**Key Methods:**
```javascript
// Initialize HUD
hudService.initialize(canvas);  // Optional canvas for canvas-based HUD

// Update HUD elements
hudService.updateAgentStatus(agents);
hudService.updateMissionObjectives(objectives);
hudService.updateResources({
    credits: 5000,
    research: 100,
    control: 15.5
});

// Combat log
hudService.addCombatLogEntry('Enemy eliminated', 'kill');
hudService.addCombatLogEntry('Agent took 10 damage', 'damage');

// Alerts
hudService.showAlert('OBJECTIVE COMPLETE', 3000, 'success');
hudService.showAlert('WARNING: Low Health', 5000, 'warning');

// Canvas HUD rendering
hudService.renderCanvasHUD(ctx, gameState);

// HUD control
hudService.toggleVisibility();
hudService.toggleMinimized();
hudService.setOpacity(0.8);
```

---

### Planned Future Services
- **NetworkService** - Multiplayer and cloud sync
- **AnalyticsService** - Player behavior tracking
- **ConfigService** - Runtime configuration management

### Planned Features
- Service middleware for logging/validation
- Service composition for complex operations
- Service mocking for testing
- Performance profiling per service
- Service dependency graph visualization

---

## Integration Status

✅ **FULLY INTEGRATED** - All services are now actively integrated into the game loop:

1. **Services Created**: 23 total services (14 core + 9 system)
2. **Integration Layer**: `game-services-integration.js` wraps update/render methods
3. **Backward Compatibility**: Property getters/setters redirect to services
4. **Service Aliases**: Enhanced methods available as `fireWeapon`, `notify`, etc.
5. **Test Coverage**: Comprehensive service integration tests added
6. **Initialization**: Auto-initializes on game start via integration wrapper

### Verification Checklist
- ✅ Services instantiated in GameServices constructor
- ✅ Services loaded in correct order in HTML
- ✅ Integration wrapper methods created
- ✅ Backward compatibility maintained
- ✅ Services called in game update loop
- ✅ Test suite validates all services
- ✅ Service dependencies properly injected
- ✅ Initialization logs confirm loading

## Summary

GameServices provides a robust, scalable architecture for game state management. By centralizing all game systems into services with clear responsibilities, we achieve:

### Architecture Benefits:
1. **Reliability** - Single source of truth prevents state inconsistencies
2. **Maintainability** - Clear service boundaries make code easy to modify
3. **Testability** - Services can be tested in isolation
4. **Performance** - Optimizations like pooling and caching
5. **Scalability** - Easy to add new services without affecting existing code
6. **Active Integration** - Services are now actively used in game loop via integration wrapper

### Service Count: 23 Total Services
- **8 Core Services** - Formula, Resource, Agent, Research, Equipment, RPG, Inventory, GameState
- **9 System Services** - Map, Camera, Input, AI, Projectile, Animation, Rendering, UI, HUD
- **6 Support Services** - Audio, Effects, EventLog, Mission, Keybinding, GameServices Integration

### Code Impact:
- **14+ scattered systems** now centralized into clear services
- **1,527 lines of rendering code** consolidated into RenderingService
- **329 lines of integration code** in game-services-integration.js
- **200+ test assertions** validate service functionality
- **100% backward compatibility** through property getters/setters
- **Zero breaking changes** to existing game code

### Architecture Patterns Applied:
- **Service Locator Pattern** - GameServices provides centralized access
- **Dependency Injection** - Services receive dependencies via constructor
- **Event-Driven Architecture** - Services communicate via events
- **Object Pooling** - EffectsService and AnimationService use pooling
- **Single Responsibility** - Each service has one clear purpose
- **Three-Layer UI Architecture** - Screen/Modal/HUD separation
- **Wrapper Pattern** - Integration layer wraps existing methods

**Remember: If you find yourself directly modifying game state, there's probably a service method you should be using instead!**