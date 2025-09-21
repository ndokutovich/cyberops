# GameServices Architecture Diagram

## Service Hierarchy & Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                           GameServices                               │
│                    (Central Service Locator)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Core Management Services                   │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │   │
│  │  │ResourceService │  │ AgentService   │  │InventoryService│ │   │
│  │  ├────────────────┤  ├────────────────┤  ├────────────────┤ │   │
│  │  │• Credits       │  │• Active Agents │  │• Weapons       │ │   │
│  │  │• Research Pts  │  │• Available     │  │• Equipment     │ │   │
│  │  │• World Control │  │• Fallen        │  │• Loadouts      │ │   │
│  │  │• Intel         │  │• Selection     │  │• Pickups       │ │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘ │   │
│  │         ▲                    ▲                    ▲          │   │
│  │         └────────────────────┴────────────────────┘          │   │
│  │                              │                                │   │
│  │                   ┌──────────▼──────────┐                    │   │
│  │                   │ GameStateService    │                    │   │
│  │                   ├─────────────────────┤                    │   │
│  │                   │• Save/Load          │                    │   │
│  │                   │• Auto-save          │                    │   │
│  │                   │• State Validation   │                    │   │
│  │                   │• Import/Export      │                    │   │
│  │                   └─────────────────────┘                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     System Services                          │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │   │
│  │  │ AudioService   │  │ EffectsService │  │EventLogService │ │   │
│  │  ├────────────────┤  ├────────────────┤  ├────────────────┤ │   │
│  │  │• Music         │  │• Particles     │  │• Combat Log    │ │   │
│  │  │• SFX           │  │• Screen FX     │  │• Quest Log     │ │   │
│  │  │• 3D Audio      │  │• Damage Text   │  │• History       │ │   │
│  │  │• Volume        │  │• Object Pool   │  │• Filtering     │ │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘ │   │
│  │                                                ▲              │   │
│  │  ┌────────────────────────────────────────────┴───┐          │   │
│  │  │              MissionService                     │          │   │
│  │  ├─────────────────────────────────────────────────┤          │   │
│  │  │• Objectives    ◄──── Uses EventLogService      │          │   │
│  │  │• Extraction    ◄──── Uses ResourceService      │          │   │
│  │  │• Rewards       ◄──── Uses AgentService         │          │   │
│  │  │• Statistics                                     │          │   │
│  │  └──────────────────────────────────────────────────┘          │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Calculation Services                       │   │
│  ├──────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐ │   │
│  │  │ FormulaService │  │ResearchService │  │EquipmentService│ │   │
│  │  ├────────────────┤  ├────────────────┤  ├────────────────┤ │   │
│  │  │• Damage Calc   │  │• Tech Tree     │  │• Item Stats    │ │   │
│  │  │• Cost Calc     │  │• Upgrades      │  │• Bonuses       │ │   │
│  │  │• XP Calc       │  │• Requirements  │  │• Modifiers     │ │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘ │   │
│  │         ▲                    ▲                    ▲          │   │
│  │         └────────────────────┴────────────────────┘          │   │
│  │                              │                                │   │
│  │                     ┌────────▼────────┐                      │   │
│  │                     │  RPGService     │                      │   │
│  │                     ├─────────────────┤                      │   │
│  │                     │• Level System   │                      │   │
│  │                     │• Skills         │                      │   │
│  │                     │• Stats          │                      │   │
│  │                     └─────────────────┘                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Example 1: Agent Hiring
```
User clicks "Hire Agent"
         │
         ▼
   AgentService.hireAgent(id)
         │
         ├──► Check agent exists
         │
         ├──► ResourceService.canAfford('credits', cost)
         │            │
         │            └──► Validates credits >= cost
         │
         ├──► ResourceService.spend('credits', cost, 'hire agent')
         │            │
         │            └──► Deducts credits, logs transaction
         │
         ├──► Move agent from available[] to active[]
         │
         └──► EventLogService.log('agent', 'hire', data)
                      │
                      └──► Records in history
```

### Example 2: Mission Completion
```
Mission objectives complete
         │
         ▼
   MissionService.completeMission()
         │
         ├──► Calculate rewards (base + bonuses)
         │
         ├──► ResourceService.applyMissionRewards(rewards)
         │            │
         │            ├──► Add credits
         │            ├──► Add research points
         │            └──► Add world control
         │
         ├──► AgentService.updateAgent(id, {xp: earned})
         │            │
         │            └──► Level up check
         │
         ├──► EventLogService.logMission('complete', mission)
         │
         └──► GameStateService.autoSave()
                      │
                      └──► Saves all service states
```

### Example 3: Item Pickup
```
Agent walks over item
         │
         ▼
   InventoryService.pickupItem(agent, item)
         │
         ├──► Add to inventory
         │
         ├──► Check if auto-equip needed
         │      │
         │      └──► If weapon slot empty: equipItem()
         │
         ├──► EffectsService.createEffect('pickup', x, y)
         │            │
         │            └──► Visual feedback
         │
         ├──► AudioService.playSound('item_pickup.wav')
         │            │
         │            └──► Audio feedback
         │
         └──► EventLogService.logItem('pickup', agent, item)
```

## Service Communication Patterns

### Pattern 1: Direct Dependency
```
┌─────────────┐         ┌─────────────┐
│   Service A │ ───────►│   Service B │
└─────────────┘         └─────────────┘
  (has reference)        (provides API)

Example: MissionService has ResourceService reference
```

### Pattern 2: Event-Based
```
┌─────────────┐         ┌─────────────┐
│   Service A │ ≈≈≈≈≈≈≈►│   Listener  │
└─────────────┘ events  └─────────────┘
  (emits events)        (reacts to events)

Example: ResourceService emits, UI listens
```

### Pattern 3: Service Locator
```
        ┌─────────────┐
        │GameServices │
        └──────┬──────┘
               │ provides access
     ┌─────────┴─────────┬─────────┐
     ▼                   ▼         ▼
┌─────────┐        ┌─────────┐  ┌─────────┐
│Service A│        │Service B│  │Service C│
└─────────┘        └─────────┘  └─────────┘

Example: All services accessed via gameServices.*
```

## Service Initialization Order

```
1. FormulaService         (no dependencies - core math engine)
2. ResourceService        (no dependencies - resource tracking)
3. AgentService          (depends on ResourceService for hiring costs)
4. ResearchService       (depends on FormulaService for calculations)
5. EquipmentService      (depends on FormulaService for stats)
6. RPGService            (depends on FormulaService for damage)
7. InventoryService      (depends on Formula, Equipment for items)
8. AudioService          (no dependencies - audio system)
9. EffectsService        (no dependencies - visual effects)
10. EventLogService      (no dependencies - event tracking)
11. MissionService       (depends on Resource, Agent, EventLog)
12. GameStateService     (depends on Resource, Agent, Inventory for saving)
```

## Service Lifecycle

```
Game Start
    │
    ├──► Create GameServices instance
    │        │
    │        └──► Instantiate all services
    │
    ├──► Initialize services
    │        │
    │        ├──► AudioService.initialize()
    │        ├──► EffectsService.initialize()
    │        └──► Others auto-initialize
    │
    ├──► Load campaign content
    │        │
    │        └──► Services populated with data
    │
    ├──► Game loop
    │        │
    │        ├──► Services.update(deltaTime)
    │        ├──► Services.render()
    │        └──► Services handle events
    │
    └──► Game shutdown
             │
             ├──► GameStateService.saveGame()
             ├──► AudioService.destroy()
             └──► EffectsService.clearAll()
```

## Memory Management

```
┌──────────────────────────────────────────┐
│           Object Pooling                  │
├──────────────────────────────────────────┤
│                                           │
│  EffectsService:                         │
│    • 100 pre-allocated effects           │
│    • 100 pre-allocated particles         │
│    • Reuses inactive objects             │
│                                           │
│  AudioService:                           │
│    • Caches decoded audio buffers        │
│    • Max 20 simultaneous sounds          │
│    • Removes oldest when limit hit       │
│                                           │
│  EventLogService:                        │
│    • Max 1000 events in memory           │
│    • Auto-trims oldest events            │
│                                           │
└──────────────────────────────────────────┘
```

## Event Flow

```
User Input ──► Game Logic ──► Service Method ──► State Change
                                      │
                                      ▼
                              Event Emission
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              UI Update         Save System      Achievement
              Listener          Listener         Listener
```

## State Persistence

```
┌─────────────────────────────────────────────────────┐
│                 GameStateService                     │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Collects state from all services:                   │
│                                                       │
│  ┌─────────────┐  exportState()  ┌──────────────┐   │
│  │   Service   │ ───────────────► │  Save Data   │   │
│  └─────────────┘                  └──────────────┘   │
│                                           │           │
│                                           ▼           │
│                                    ┌──────────────┐   │
│                                    │ localStorage │   │
│                                    └──────────────┘   │
│                                           │           │
│  ┌─────────────┐  importState()  ┌──────────────┐   │
│  │   Service   │ ◄─────────────── │  Save Data   │   │
│  └─────────────┘                  └──────────────┘   │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## Performance Optimization Points

```
1. Object Pooling (EffectsService)
   └──► Reduces GC pressure

2. Audio Buffer Caching (AudioService)
   └──► Prevents redundant network requests

3. Event Batching (ResourceService.transaction)
   └──► Single notification for multiple changes

4. Lazy Initialization (AudioService)
   └──► Only creates context when needed

5. Service Method Binding (constructor)
   └──► Prevents runtime binding overhead

6. Immutable Getters (AgentService.getActiveAgents)
   └──► Returns copies to prevent external mutation
```