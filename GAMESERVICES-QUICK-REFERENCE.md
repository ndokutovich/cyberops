# GameServices Quick Reference

## 🚀 Quick Access
```javascript
// Via game instance
game.gameServices.resourceService
game.gameServices.agentService
game.gameServices.inventoryService
// ... etc

// Via global
window.GameServices.formulaService
window.GameServices.researchService
window.GameServices.equipmentService
```

## 📊 ResourceService - Money & Points
```javascript
// Get/Set
resourceService.get('credits')                           // → 5000
resourceService.set('credits', 1000, 'reason')          // Set to exact value

// Add/Spend
resourceService.add('credits', 500, 'mission')          // +500 credits
resourceService.spend('credits', 1000, 'purchase')      // -1000 (returns false if can't afford)

// Check
resourceService.canAfford('credits', 500)               // → true/false

// Transaction (all or nothing)
resourceService.transaction([
    { resource: 'credits', amount: -1000, operation: 'spend' },
    { resource: 'researchPoints', amount: -50, operation: 'spend' }
], 'upgrade purchase')
```

## 👥 AgentService - Team Management
```javascript
// Get agents
agentService.getActiveAgents()                          // Hired agents
agentService.getAvailableAgents()                       // Can hire
agentService.getAgent('Alex')                           // By name/ID

// Manage
agentService.hireAgent(agentId)                         // Auto-pays cost
agentService.killAgent(agentId, 'killer name')
agentService.reviveAgent(agentId, cost)
agentService.selectAgentsForMission([1,2,3,4])

// Update
agentService.healAgent(agentId, 50)
agentService.damageAgent(agentId, 25, 'explosion')
agentService.updateAgent(agentId, { level: 2, xp: 150 })
```

## 🎒 InventoryService - Items & Equipment
```javascript
// Pickup/Equip
inventoryService.pickupItem(agent, itemData)            // Auto-equips if slot empty
inventoryService.equipItem(agentId, 'weapon', itemId)
inventoryService.unequipItem(agentId, 'weapon')

// Shop
inventoryService.buyItem('weapon', itemData, cost)
inventoryService.sellItem('weapon', itemId)

// Get info
inventoryService.getAgentEquipment(agentId)             // → {weapon, armor, utility}
inventoryService.applyAgentEquipment(agent)             // Apply for mission
```

## 💾 GameStateService - Save/Load
```javascript
// Save/Load
gameStateService.saveGame(game, slot, isAutoSave)
gameStateService.loadGame(game, slot)
gameStateService.quickSave(game)                        // Current slot
gameStateService.quickLoad(game)                        // Current slot

// Manage
gameStateService.getSaveSlots()                         // → [{slot, exists, date}...]
gameStateService.deleteSave(slot)
gameStateService.exportSave(slot)                       // Download file
gameStateService.importSave(file, slot)                 // From upload

// Auto-save
gameStateService.startAutoSave()                        // Every 60s
gameStateService.stopAutoSave()
```

## 🔊 AudioService - Sounds & Music
```javascript
// Initialize (required!)
await audioService.initialize()

// Music
audioService.playMusic('path/music.mp3', {
    loop: true,
    fadeIn: true,
    volume: 0.8
})
audioService.stopMusic({ fadeOut: true })
audioService.setMusicState('combat')                    // Auto-switches track

// Sound Effects
audioService.playSound('sfx/explosion.wav', {
    volume: 1.0,
    position: { x: 100, y: 50 }                        // 3D sound
})

// Procedural (no file)
audioService.playProceduralSound('explosion')

// Volume
audioService.setVolume('master', 0.8)
audioService.setVolume('music', 0.5)
audioService.setVolume('sfx', 1.0)
```

## ✨ EffectsService - Visual Effects
```javascript
// Create effects
effectsService.createEffect('explosion', x, y, { scale: 2 })
effectsService.createEffect('hit', x, y, { color: '#ff0000' })

// Damage text
effectsService.createDamageNumber(x, y, 50)
effectsService.createStatusText(x, y, 'CRITICAL!')

// Screen effects
effectsService.shakeScreen(10, 500)                     // intensity, duration
effectsService.flashScreen('#ffffff', 200, 0.5)         // color, duration, alpha

// Update each frame
effectsService.update(deltaTime)
const renderData = effectsService.getRenderData()       // Get particles to draw
```

## 📝 EventLogService - Game Events
```javascript
// Log by category
eventLogService.logCombat('attack', attacker, target, damage)
eventLogService.logItem('pickup', agent, 'Plasma Rifle')
eventLogService.logQuest('complete', 'Hack Mainframe')
eventLogService.logMission('start', 'Corporate Infiltration')
eventLogService.logResource('gain', 'credits', 1000)
eventLogService.logError('Audio failed', error)

// Query
eventLogService.getRecentEvents(60)                     // Last 60 seconds
eventLogService.getEventsByCategory('combat')
eventLogService.searchEvents('plasma')

// Filter
eventLogService.setFilter('category', 'combat')
eventLogService.setFilter('priority', 2)                // HIGH+
```

## 🧮 FormulaService - Game Math
```javascript
// Damage calculation
const damage = formulaService.calculateDamage(
    baseDamage, weaponBonus, researchBonus, targetArmor,
    { critical: true, headshot: false, cover: 0.5 }
)

// Mission rewards
const rewards = formulaService.calculateMissionRewards({
    baseCredits: 5000,
    allAgentsSurvived: true,
    stealthBonus: true
})

// Economics
const sellPrice = formulaService.calculateSellPrice(1000)   // 50% of value
const repairCost = formulaService.calculateRepairCost(agent)

// Vision/Detection
const visionRange = formulaService.calculateAgentVisionRange(agent)
const detectRange = formulaService.calculateDetectionRange(enemy, stealth, alert)

// Movement
const moveCost = formulaService.calculateMovementCost(from, to)
const speed = formulaService.calculateAgentSpeed(agent, wounded)
```

## 🔬 ResearchService - Tech Tree
```javascript
// Check research
const completed = researchService.isResearchCompleted(id, completedList)
const canAfford = researchService.canAffordResearch(id, points)

// Apply research bonuses
const upgraded = researchService.applyResearchToAgent(agent, completedResearch)
const roster = researchService.applyResearchToRoster(roster, completedResearch)

// Get recommendations
const next = researchService.getRecommendedResearch(
    completedResearch,
    'stealth'                                           // or combat/tech/balanced
)

// Medical healing (between missions)
researchService.applyMedicalHealing(agents, completedResearch)

// Calculate progress
const progress = researchService.calculateResearchProgress(completedResearch)
```

## 🎯 EquipmentService - Loadouts
```javascript
// Get equipment data
const weapon = equipmentService.getWeapon('assault_rifle')
const armor = equipmentService.getEquipment('body_armor')

// Apply equipment bonuses
const equipped = equipmentService.applyEquipmentToAgent(
    agent, weaponInventory, equipmentInventory
)

// Get recommendations
const loadout = equipmentService.getRecommendedLoadout(
    'sniper',                                           // Role: sniper/assault/stealth
    10000                                               // Budget
)

// Calculate effectiveness
const score = equipmentService.calculateEffectivenessScore(
    agent, 'stealth_mission'                           // Mission type
)

// Purchase planning
const cost = equipmentService.calculatePurchaseCost(items)
```

## ⚔️ RPGService - RPG Mechanics
```javascript
// Create RPG entities
const rpgAgent = rpgService.createRPGAgent(agent, 'soldier')
const rpgEnemy = rpgService.createRPGEnemy(enemy, 'guard')

// RPG damage (uses equipped weapons)
const damage = rpgService.calculateRPGDamage(
    attacker, target, 'rifle'                          // Weapon type
)

// Sync game systems
rpgService.syncEquipment(game)                         // Hub equipment
rpgService.syncLoadouts(game)                          // Agent loadouts

// Access RPG stats
if (agent.rpgEntity) {
    const str = agent.rpgEntity.str
    const crit = agent.rpgEntity.critChance
    const resist = agent.rpgEntity.damageResistance
}
```

## 📷 CameraService - Camera Control
```javascript
// Position and movement
cameraService.setPosition(x, y, immediate)              // Set camera position
cameraService.move(dx, dy)                              // Move by delta
cameraService.centerOn(worldX, worldY)                  // Center on world position

// Zoom control
cameraService.zoomIn()                                  // Zoom in
cameraService.zoomOut()                                 // Zoom out
cameraService.setZoom(level, centerX, centerY)          // Set zoom level

// Camera effects
cameraService.shake(intensity, duration)                // Screen shake
cameraService.followEntity(entity, offset)              // Follow target
cameraService.stopFollowing()                           // Stop following

// Viewport and boundaries
cameraService.setViewport(width, height)                // Update viewport
cameraService.setBoundaries(minX, minY, maxX, maxY)     // Set camera limits
cameraService.isVisible(x, y, margin)                   // Check visibility

// Edge scrolling
cameraService.edgeScrollEnabled = true                  // Enable edge scroll
cameraService.handleEdgeScroll(mouseX, mouseY)          // Process edge scroll

// Update (call each frame)
cameraService.update(deltaTime)                         // Update camera
```

## 🗺️ MapService - Map Management
```javascript
// Load map
mapService.loadMap(mapData)                             // Load from mission data

// Tile queries
const tile = mapService.getTileAt(x, y)                 // Get tile type
mapService.setTileAt(x, y, tileType)                    // Change tile
mapService.isWalkable(x, y)                             // Check if walkable
mapService.canMoveTo(fromX, fromY, toX, toY)            // Check movement path

// Fog of war
mapService.setFogEnabled(true)                          // Enable/disable fog
mapService.updateFogOfWar(viewerPositions)              // Update visibility
mapService.isVisible(x, y)                              // Check visibility
mapService.isExplored(x, y)                             // Check if explored

// Entities
const terminal = mapService.getTerminalAt(x, y)         // Get nearby terminal
const door = mapService.getDoorAt(x, y)                 // Get door at position
mapService.unlockDoor(x, y, terminalId)                 // Unlock door
const item = mapService.getCollectibleAt(x, y)          // Get collectible
mapService.removeCollectible(index)                     // Remove collected item

// Line of sight
mapService.hasLineOfSight(x1, y1, x2, y2)               // Check LOS

// Utilities
mapService.findNearestWalkable(x, y, maxDist)           // Find walkable position
mapService.getEntitiesAt(x, y, radius)                  // Get all entities
```

## 🎮 InputService - Input Handling
```javascript
// Initialize
inputService.initialize(canvas, {
    screenToWorld: (x, y) => game.screenToWorld(x, y)
})

// Mouse state
const pos = inputService.mousePosition                  // {x, y}
const worldPos = inputService.mouseWorldPosition        // World coords
const dragging = inputService.isDragging                // Is dragging?
inputService.isMouseButtonPressed(0)                    // Left button?

// Keyboard state
inputService.isKeyPressed('KeyW')                       // W pressed?
const pressed = inputService.getPressedKeys()           // All pressed keys

// Touch support
inputService.touches                                    // Active touches
inputService.pinchDistance                              // Pinch distance

// Event listeners
inputService.on('click', (data) => { })                 // Click event
inputService.on('drag', (data) => { })                  // Drag event
inputService.on('keydown', (data) => { })               // Key press
inputService.on('wheel', (data) => { })                 // Mouse wheel
inputService.on('pinch', (data) => { })                 // Touch pinch

// Control
inputService.setEnabled(false)                          // Disable all input
inputService.captureMouse = false                       // Disable mouse
inputService.captureKeyboard = false                    // Disable keyboard
```

## ⌨️ KeybindingService - Keyboard Shortcuts
```javascript
// Register/update bindings
keybindingService.registerBinding('action', 'K', 'Description', 'category')
keybindingService.updateBinding('fire', 'Space')        // Change key
keybindingService.resetAllBindings()                    // Reset to defaults

// Check keys
const key = keybindingService.getKey('hack')            // → 'H'
const action = keybindingService.getActionByKey('F')    // → 'fire'
if (keybindingService.matchesBinding('hack', event)) { }

// Get organized bindings
keybindingService.getBindingsByCategory('combat')       // Combat keys
keybindingService.getAllBindings()                      // All categories
keybindingService.getHelpText()                         // Formatted help

// Persistence
keybindingService.saveUserBindings()                    // Save to localStorage
keybindingService.loadUserBindings()                    // Load from localStorage
```

## 🤖 AIService - Enemy AI
```javascript
// Add/Remove enemies
aiService.addEnemy(enemy)
aiService.removeEnemy(enemyId)

// Pathfinding
aiService.findPath(startX, startY, endX, endY)

// Vision & detection
aiService.canSeeTarget(enemy, target)
aiService.detectPlayer(enemy, players)

// Update AI
aiService.update(deltaTime)
```

## 🎯 ProjectileService - Projectiles
```javascript
// Fire projectile
projectileService.fireProjectile(from, to, { damage: 20, speed: 10 })

// Update projectiles
projectileService.update(deltaTime, { agents, enemies, walls })

// Get stats
projectileService.getStats()                            // accuracy info
```

## 🎬 AnimationService - Animations
```javascript
// Sprite animations
animationService.createSpriteAnimation(target, 'walk', { loop: true })

// Transitions
animationService.fadeIn(element, 1000)
animationService.moveTo(obj, fromX, fromY, toX, toY, 1000)
animationService.shake(obj, intensity, duration)

// Floating text
animationService.createFloatingText(x, y, '+100 XP')

// Update
animationService.update(deltaTime)
```

## 🎨 RenderingService - Rendering
```javascript
// Initialize
renderingService.initialize(canvas)

// Render frame
renderingService.renderFrame(gameState, camera)

// Effects
renderingService.applyScreenShake(10, 500)
renderingService.applyScreenFlash('#fff', 0.5, 200)

// Debug
renderingService.setDebug('showFPS', true)
```

## 🖼️ UIService - UI Elements
```javascript
// Notifications
uiService.showNotification('Mission Complete!', 'success')

// Dialogs
uiService.showDialog({ title: 'Confirm', content: 'Are you sure?' })

// Tooltips
uiService.showTooltip(element, 'Info text')

// Context menus
uiService.showContextMenu(x, y, menuItems)

// Blocking
uiService.blockUI('Loading...')
uiService.unblockUI()
```

## 🎮 HUDService - Game HUD
```javascript
// Update HUD
hudService.updateAgentStatus(agents)
hudService.updateMissionObjectives(objectives)
hudService.updateResources({ credits: 5000, research: 100 })

// Combat log
hudService.addCombatLogEntry('Enemy killed', 'kill')

// Alerts
hudService.showAlert('OBJECTIVE COMPLETE', 3000, 'success')

// Control HUD
hudService.toggleVisibility()
hudService.setOpacity(0.8)
```

## 🎯 MissionService - Objectives
```javascript
// Start mission
missionService.startMission({
    id: 'corp_01',
    name: 'Corporate Infiltration',
    objectives: [{
        type: 'eliminate',
        target: { type: 'guard', count: 8 },
        required: true
    }],
    rewards: { credits: 5000 }
})

// Track progress
missionService.trackEvent('enemyKilled', { enemyType: 'guard' })
missionService.trackEvent('terminalHacked', { terminalId: 'main' })
missionService.trackEvent('itemCollected', { itemType: 'intel' })

// Complete/Fail
missionService.enableExtraction()
missionService.completeMission(true)                    // extracted
missionService.failMission('All agents dead')

// Get info
missionService.getMissionProgress()
missionService.isMissionActive()
```

## 🎮 Common Patterns

### Check Before Action
```javascript
if (resourceService.canAfford('credits', 1000)) {
    resourceService.spend('credits', 1000, 'purchase');
    // Do purchase
}
```

### Event Listeners
```javascript
// Setup once
resourceService.addListener('credits', (change) => {
    updateUI(change.newValue);
});

// Remove when done
resourceService.removeListener('credits', callback);
```

### Service Chaining
```javascript
// Services work together
agentService.hireAgent(id);                            // Auto-uses ResourceService
missionService.completeMission();                       // Auto-uses ResourceService
inventoryService.pickupItem(agent, item);              // Auto-equips if needed
```

### Error Handling
```javascript
// Services return success/failure
if (!agentService.hireAgent(id)) {
    console.log('Hire failed - check credits or agent validity');
}

// Services fail gracefully
audioService.playSound('missing.wav');                  // Won't crash
effectsService.createEffect('invalid', x, y);          // Ignored
```

## ⚠️ Never Do This!
```javascript
// ❌ WRONG - Direct modification
game.credits += 100;
game.activeAgents.push(agent);
this.effects.push({type: 'explosion'});

// ✅ RIGHT - Use services
gameServices.resourceService.add('credits', 100, 'reward');
gameServices.agentService.hireAgent(agentId);
gameServices.effectsService.createEffect('explosion', x, y);
```

## 🔍 Debug Commands
```javascript
// View service state
gameServices.resourceService.getHistory(20)
gameServices.effectsService.getStatistics()
gameServices.agentService.getStatistics()
gameServices.eventLogService.exportEvents('json')

// Monitor all events
gameServices.resourceService.addListener('any', console.log)
gameServices.agentService.addListener('any', console.log)
```