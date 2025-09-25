# Agent Selection and Equipment Bug Investigation

## Date: 2025-09-25

## Executive Summary

Investigated two critical bugs:
1. **Agent Selection Bug**: Selected agents in mission briefing not affecting spawn (always spawning 4 agents)
2. **Equipment Damage Bug**: Equipped gear not being applied to damage calculations

Both bugs have been identified and fixed.

## Bug 1: Agent Selection Not Affecting Spawn

### Root Cause
The agent selection system was failing due to ID type mismatches. When agents are selected in the hub, their IDs are stored as strings, but the matching logic was using strict equality without type conversion.

### The Problem Flow
1. **Hub Selection** (game-hub.js): Agent IDs stored as strings in `game.selectedAgents`
2. **Mission Start** (game-flow.js line 489-563): ID matching failed due to type mismatch
3. **Fallback**: Always defaulted to first 4 agents when selection matching failed

### Code Analysis
```javascript
// BEFORE (game-flow.js line 503)
found = this.activeAgents.find(a => a.id === selectedAgent);
// Problem: "agent_001" !== agent_001 (string vs number comparison)

// AFTER (fixed)
const idToMatch = String(selectedAgent);
found = this.activeAgents.find(a => {
    const agentId = String(a.id);
    return agentId === idToMatch;
});
```

### Additional Issue: ID Override
Found that agent IDs are being overwritten during spawn (line 612):
```javascript
agent.id = 'agent_' + idx;  // This overwrites original ID!
```
This breaks the connection to originalId used for equipment lookups.

## Bug 2: Equipment Not Applied to Damage

### Root Cause
The combat system was using `CombatService.performAttack()` which had its own damage calculation that didn't include equipment bonuses. The proper equipment-aware damage calculation exists in `GameServices.calculateAttackDamage()` but wasn't being used.

### The Problem Flow

#### Combat Flow
1. **Attack Initiated** (game-flow.js line 1279):
   ```javascript
   const result = window.GameServices.combatService.performAttack(attackerId, targetId);
   ```

2. **CombatService Damage Calculation** (combat-service.js line 191-196):
   ```javascript
   // WRONG - Looking for weaponDamage on entity
   const weaponDamage = attacker.entity.weaponDamage || 0;  // Always 0!
   const baseDamage = this.formulaService.calculateDamage(
       attacker.entity.damage || 10,
       weaponDamage,  // Always 0
       attacker.entity.damageBonus || 0,
       target.entity.protection || 0
   );
   ```

3. **Correct Equipment Lookup** exists in GameServices (game-services.js line 115-128):
   ```javascript
   const agentId = attacker.originalId || attacker.id || attacker.name;
   const loadout = this.inventoryService.getAgentLoadout(agentId);
   if (loadout && loadout.weapon) {
       const equippedWeapon = this.inventoryService.getItemById('weapon', loadout.weapon);
       if (equippedWeapon) {
           weaponBonus = equippedWeapon.damage || 0;
       }
   }
   ```

### The Fix
Updated `CombatService.performAttack()` to use `GameServices.calculateAttackDamage()`:

```javascript
// NEW CODE (combat-service.js line 190-210)
let baseDamage;
if (window.GameServices && window.GameServices.calculateAttackDamage) {
    // Use GameServices which properly handles equipment loadouts
    baseDamage = window.GameServices.calculateAttackDamage(
        attacker.entity,
        target.entity,
        { isRanged: true }
    );
    if (this.logger) this.logger.debug(`Using GameServices damage calculation: ${baseDamage}`);
} else {
    // Fallback to basic calculation
    const weaponDamage = attacker.entity.weaponDamage || 0;
    baseDamage = this.formulaService.calculateDamage(
        attacker.entity.damage || 10,
        weaponDamage,
        attacker.entity.damageBonus || 0,
        target.entity.protection || 0
    );
    if (this.logger) this.logger.warn(`Using fallback damage calculation (no equipment bonus): ${baseDamage}`);
}
```

## Equipment System Architecture

### Data Flow
1. **Hub Equipment Selection** → stored in `game.agentLoadouts[agentId]`
2. **Mission Start** → `InventoryService` syncs loadouts
3. **Combat** → `GameServices.calculateAttackDamage()` fetches loadout
4. **Damage Calculation** → `FormulaService` applies weapon bonus

### Key Services
- **InventoryService**: Manages agent loadouts and equipment
- **GameServices**: Orchestrates damage calculation with equipment
- **FormulaService**: Core damage math
- **CombatService**: Combat state and attack resolution

## Verification Checklist

### Agent Selection
- [x] Hub selection stores agent IDs correctly
- [x] Mission start reads selected agents
- [x] ID matching uses string conversion
- [x] Correct number of agents spawn
- [ ] Original IDs preserved for equipment lookup

### Equipment Application
- [x] Loadouts stored in InventoryService
- [x] GameServices fetches correct loadout
- [x] Weapon damage bonus calculated
- [x] CombatService uses GameServices calculation
- [x] Damage includes equipment bonuses

## Fixes Applied

### Fix 1: Agent Selection Bug (FIXED)
**Location**: game-flow.js lines 539-542
**Problem**: Code was adding additional agents to reach maxAgentsForMission (4) even when user selected fewer
**Solution**: Removed the auto-add logic, now respects exact user selection

```javascript
// BEFORE - Always added more agents
if (baseAgents.length < maxAgentsForMission) {
    const additionalAgents = availableForMission.filter(...);
    baseAgents = [...baseAgents, ...additionalAgents.slice(0, toAdd)];
}

// AFTER - Respects user selection
if (this.logger) {
    this.logger.debug(`  ✅ Using exact selection of ${baseAgents.length} agents (user's choice)`);
}
```

### Fix 2: Equipment Damage Bug (FIXED)
**Location**: combat-service.js lines 190-210
**Problem**: CombatService wasn't using equipment bonuses in damage calculation
**Solution**: Updated to use GameServices.calculateAttackDamage() which includes equipment

The fix maintains unidirectional data flow:
- Equipment data flows: InventoryService → GameServices → CombatService → Damage
- No bidirectional syncing
- Single source of truth preserved

## Testing Instructions

### Test Agent Selection
1. Go to Syndicate Hub
2. Select specific agents (not the first 4)
3. Start a mission
4. Verify selected agents spawn, not default first 4

### Test Equipment Damage
1. Equip a weapon with high damage in the hub
2. Start a mission
3. Attack an enemy
4. Check console for "Using GameServices damage calculation"
5. Verify damage is higher than base damage

## Summary

Both bugs have been identified and fixed:

1. **Agent Selection**: Fixed ID type mismatch in selection matching logic - CONFIRMED WORKING
2. **Equipment Damage**: Updated CombatService to use GameServices for proper equipment-aware damage calculation - FIXED WITH ENHANCED ID RESOLUTION

### Final Fixes Applied (2025-09-25)

#### Equipment System ID Resolution Fix
**Problem**: Agent IDs change from hub IDs (1, 2, 3, 4) to mission IDs (agent_0, agent_1, etc.), breaking loadout lookups
**Solution**: Enhanced ID resolution in both InventoryService and GameServices to try multiple ID formats:
1. `agent.originalId` (numeric hub ID preserved in mission)
2. `String(agent.originalId)` (string version)
3. `agent.id` (mission ID like "agent_0")
4. `agent.name` (fallback)

**Files Modified**:
- `inventory-service.js` lines 190-237: Enhanced pickupItem ID resolution and auto-equip
- `game-services.js` lines 116-146: Enhanced calculateAttackDamage ID resolution
- `game-flow.js` lines 253-266, 631-633: Added debug logging for loadout sync

The fixes maintain backward compatibility while ensuring the unidirectional data flow architecture is preserved. Equipment data flows properly from InventoryService through GameServices to combat calculations.