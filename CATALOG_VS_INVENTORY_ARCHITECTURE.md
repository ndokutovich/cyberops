# Catalog vs Inventory Architecture

## The Problem We Solved

Previously, the game was confusing **item definitions** (what items exist) with **item instances** (what players own), leading to bugs where players would get items with `owned: 0` in their inventory.

## The Solution: Clear Separation

We now have a clean service architecture that separates concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     ITEM ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  rpgConfig.items                                            │
│  ┌────────────────────────────────────┐                    │
│  │  CATALOG (All items in game)       │                    │
│  │  - Ghost Prototype (owned: 0)      │──┐                 │
│  │  - Silenced Pistol (owned: 3)      │  │                 │
│  │  - Assault Rifle (owned: 1)        │  │                 │
│  └────────────────────────────────────┘  │                 │
│                                           │                 │
│                    CatalogService         │                 │
│                    ┌─────────────────────▼────┐             │
│                    │ - Initialize catalog     │             │
│                    │ - Query items            │             │
│                    │ - Filter for shops       │             │
│                    │ - Get starting inventory │             │
│                    └─────────────────────┬────┘             │
│                                          │                  │
│                                          │ Filter owned > 0 │
│                                          ▼                  │
│                    ┌──────────────────────────────┐         │
│                    │  PLAYER INVENTORY            │         │
│                    │  - Silenced Pistol (owned:3) │         │
│                    │  - Assault Rifle (owned:1)   │         │
│                    └──────────────────────────────┘         │
│                               ▲                             │
│                    InventoryService                         │
│                    │ - Track owned items                    │
│                    │ - Buy/sell operations                  │
│                    │ - Equip/unequip                        │
│                    └──────────────────────────────          │
└─────────────────────────────────────────────────────────────┘
```

## Service Responsibilities

### CatalogService (NEW)
**What**: Complete database of all items that exist in the game world
**Scope**: Read-only catalog, initialized from `rpgConfig.items`
**Key Methods**:
- `initialize(rpgConfig, campaignId)` - Load catalog from campaign
- `getItem(itemId)` - Get item definition by ID
- `getItemsByCategory(category)` - Get all items in category
- `getPlayerStartingInventory()` - Filter for owned > 0
- `getShopItems(categories, filters)` - Get items for shop

**Example**:
```javascript
// Initialize catalog
catalogService.initialize(campaign.rpgConfig, 'main');

// Query catalog
const ghostProto = catalogService.getItem('weapon_ghost_prototype');
// Returns: { id: 'weapon_ghost_prototype', name: 'Ghost Prototype', ... }

// Get starting inventory (only owned items)
const startingInv = catalogService.getPlayerStartingInventory();
// Returns: { weapons: [...items with owned > 0], armor: [...], ... }
```

### InventoryService
**What**: Player's actual owned items
**Scope**: Mutable inventory, tracks what player owns
**Key Methods**:
- `initialize(data)` - Set up inventory from starting items
- `buyItem(type, itemData, cost)` - Purchase item from shop
- `sellItem(type, itemId, price)` - Sell item
- `pickupItem(agent, item)` - Pick up collectable
- `equipItem(agentId, slot, itemId)` - Equip item to agent

**Example**:
```javascript
// Initialize with starting inventory (from CatalogService)
const starting = catalogService.getPlayerStartingInventory();
inventoryService.initialize({
    weapons: starting.weapons,
    equipment: starting.armor.concat(starting.utility)
});

// Buy item (adds to inventory)
inventoryService.buyItem('weapon', ghostProtoData, 8000);
// Now Ghost Prototype is in player's inventory with owned: 1
```

### ItemService
**What**: Handle collectable items during missions
**Scope**: Mission-time item pickups and effects
**Key Methods**:
- `handleCollectablePickup(agent, item, context)` - Process pickup
- `handleCollectableEffects(agent, item, context)` - Apply effects
- `resetMissionStats()` - Reset mission statistics

**Example**:
```javascript
// Agent picks up weapon during mission
itemService.handleCollectablePickup(agent, {
    type: 'weapon',
    weapon: 'assault_rifle',
    x: 10, y: 20
}, { missionId: 'main-01-001' });
```

### EquipmentService
**What**: Manage agent loadouts and equipment assignments
**Scope**: What agents have equipped
**Key Methods**:
- `equipWeapon(agentId, weaponId)` - Equip weapon to agent
- `getAgentLoadout(agentId)` - Get agent's loadout
- `autoOptimizeLoadouts(agents)` - Auto-assign equipment

## Data Flow

### Campaign Start
```
1. ContentLoader loads campaign
   ↓
2. CatalogService.initialize(rpgConfig.items)
   - Loads ALL items into catalog
   ↓
3. CatalogService.getPlayerStartingInventory()
   - Filters for owned > 0
   ↓
4. InventoryService.initialize(startingInventory)
   - Player now has only owned items
```

### Shop Purchase
```
1. Player opens Viktor's shop
   ↓
2. CatalogService.getShopItems(['weapons'], { shopExclusive: 'black_market' })
   - Returns Ghost Prototype and other shop items
   ↓
3. Player clicks "Buy Ghost Prototype"
   ↓
4. InventoryService.buyItem('weapon', ghostProtoData, 8000)
   - Adds to inventory with owned: 1
   - Deducts credits
```

### Mission Pickup
```
1. Agent walks over weapon pickup
   ↓
2. ItemService.handleCollectablePickup(agent, item)
   ↓
3. InventoryService.pickupItem(agent, item)
   - Adds weapon to inventory
   - Can auto-equip if slot empty
```

## Key Architectural Principles

### 1. Catalog is Read-Only
```javascript
// ✅ CORRECT
const catalog = catalogService.exportCatalog();  // Read only

// ❌ WRONG
catalogService.catalog.weapons.set('new_weapon', {...});  // Don't mutate!
```

### 2. Inventory is Player's State
```javascript
// ✅ CORRECT
inventoryService.buyItem('weapon', weaponData, cost);  // Modify through service

// ❌ WRONG
inventoryService.inventory.weapons.push(weapon);  // Don't access directly!
```

### 3. Only Load Owned Items
```javascript
// ✅ CORRECT - Filter before loading
const startingInv = catalogService.getPlayerStartingInventory();
// Only items with owned > 0

// ❌ WRONG - Load everything
const allWeapons = Object.values(rpgConfig.items.weapons);
inventoryService.initialize({ weapons: allWeapons });  // Includes owned: 0!
```

### 4. Clear Naming
```javascript
// ✅ CORRECT - Clear intent
const itemCatalog = catalogService.getItemsByCategory('weapons');
const playerWeapons = inventoryService.getWeapons();

// ❌ WRONG - Ambiguous
const items = someService.getItems();  // Which items? Catalog or inventory?
```

## Migration Guide

### Before (Old Code)
```javascript
// content-loader.js
if (rpgItems.weapons) {
    Object.entries(rpgItems.weapons).forEach(([id, weapon]) => {
        weapons.push(weapon);  // ❌ Adds ALL weapons!
    });
}
```

### After (New Code)
```javascript
// content-loader.js
catalogService.initialize(rpgConfig, campaignId);
const startingInv = catalogService.getPlayerStartingInventory();
weapons = startingInv.weapons;  // ✅ Only owned items!
```

## Testing Checklist

When working with items:

- [ ] Items in catalog have clear definitions (name, stats, value)
- [ ] Player inventory only contains items with owned > 0
- [ ] Shop queries catalog, not inventory
- [ ] Buy operations add to inventory correctly
- [ ] Sell operations remove from inventory correctly
- [ ] Pickup operations during missions work
- [ ] Equipment system can query both catalog and inventory

## Future Enhancements

### Possible Improvements

1. **Item Validation**
   - Validate item references against catalog
   - Warn if trying to equip non-existent item

2. **Shop Service**
   - Move shop logic to dedicated service
   - Use CatalogService for shop inventory

3. **Crafting System**
   - Use catalog for recipes
   - Check inventory for materials

4. **Item Rarity**
   - Filter catalog by rarity
   - Special drops for rare items

5. **Dynamic Pricing**
   - Base prices in catalog
   - Market fluctuation in shop service

## Common Pitfalls to Avoid

### ❌ Don't Mix Catalog and Inventory
```javascript
// WRONG
const weapon = catalogService.getItem('weapon_001');
weapon.owned = 3;  // Mutating catalog!
```

### ❌ Don't Load Entire Catalog into Inventory
```javascript
// WRONG
const allWeapons = catalogService.getItemsByCategory('weapons');
inventoryService.initialize({ weapons: allWeapons });  // Includes owned: 0!
```

### ❌ Don't Bypass Services
```javascript
// WRONG
game.weapons.push(newWeapon);  // Direct manipulation!

// CORRECT
inventoryService.buyItem('weapon', newWeapon, cost);
```

## Summary

**CatalogService** = What items **exist** in the game (read-only database)
**InventoryService** = What items the player **owns** (mutable state)
**ItemService** = Mission collectables and pickup logic
**EquipmentService** = What agents have **equipped**

This architecture prevents the "owned: 0 but in inventory" bug by ensuring clear separation of concerns and proper filtering at the boundary between catalog and inventory.
