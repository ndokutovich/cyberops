# Unidirectional Data Flow Architecture

## Overview

This document describes the unidirectional data flow patterns implemented in the CyberOps game to prevent state synchronization issues and maintain data integrity.

## Core Principle

**Data should flow in ONE direction through the system:**
```
User Input → Services → State → UI → User
```

Never allow circular flows where:
- UI directly modifies state that services also modify
- Multiple systems can change the same data
- State changes trigger other state changes in a cycle

## Implementation Pattern

### 1. Service-Oriented Architecture

All state modifications MUST flow through services:

```javascript
// ❌ BAD - Direct modification
this.credits -= 100;
agent.health = 50;
this.extractionEnabled = true;

// ✅ GOOD - Through services
this.gameServices.resourceService.spend('credits', 100, 'purchase');
this.gameServices.agentService.damageAgent(agentId, 50, 'combat');
this.gameServices.missionService.enableExtraction();
```

### 2. Property Proxies

Property proxies automatically delegate to services while maintaining backward compatibility:

```javascript
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    get: function() {
        return this.gameServices.resourceService.get('credits');
    },
    set: function(value) {
        this.gameServices.resourceService.set('credits', value, 'direct assignment');
    }
});
```

This means legacy code `this.credits -= 100` automatically uses the service.

### 3. Single Source of Truth

Each domain has ONE authoritative service:

| Domain | Service | Responsibilities |
|--------|---------|------------------|
| Resources | ResourceService | Credits, research points, world control |
| Agents | AgentService | Agent health, hiring, death, revival |
| Combat | CombatService | Attack calculations, damage application |
| Missions | MissionService | Objectives, extraction, completion |
| Equipment | InventoryService | Loadouts, item management |
| RPG Stats | RPGService | Experience, levels, skills |

### 4. No Fallbacks

Remove all fallback code that bypasses services:

```javascript
// ❌ BAD - Fallback pattern
if (this.gameServices && this.gameServices.resourceService) {
    this.gameServices.resourceService.spend('credits', cost);
} else {
    this.credits -= cost;  // Fallback creates bidirectional flow
}

// ✅ GOOD - Service required
if (!this.gameServices || !this.gameServices.resourceService) {
    if (this.logger) this.logger.error('ResourceService not available!');
    return;  // Fail safely rather than corrupt state
}
this.gameServices.resourceService.spend('credits', cost);
```

### 5. Read After Write Pattern

When a service modifies state, read the updated value back from the service:

```javascript
// ❌ BAD - Local update after service call
const result = combatService.performAttack(attackerId, targetId);
if (result.hit) {
    enemy.health -= result.damage;  // Duplicates what service already did
}

// ✅ GOOD - Read back from service
const result = combatService.performAttack(attackerId, targetId);
if (result.hit) {
    const updated = combatService.getCombatant(targetId);
    enemy.health = updated.entity.health;  // Sync from service
}
```

## Common Violations and Fixes

### 1. Resource Management

**Violation**: Direct manipulation of credits/research points
```javascript
// Found in game-hub.js, engine-integration.js
this.credits -= cost;
this.researchPoints += reward;
```

**Fix**: Use property proxies (automatic) or service calls (explicit)
```javascript
// Property proxy (automatic delegation)
this.credits -= cost;  // Now delegates to ResourceService

// Or explicit service call
this.gameServices.resourceService.spend('credits', cost, 'purchase');
```

### 2. Health Management

**Violation**: Multiple systems modifying health
```javascript
// Found in game-flow.js, game-facade.js
agent.health = 100;
enemy.health -= damage;
```

**Fix**: Only services modify health, others read back
```javascript
// Initial setup (allowed)
agent.health = agent.maxHealth;  // During initialization only

// Combat (service handles it)
const result = combatService.performAttack(attacker, target);
// Read back the result
const updated = combatService.getCombatant(target.id);
target.health = updated.entity.health;
```

### 3. Mission State

**Violation**: Multiple systems setting extraction enabled
```javascript
// Found in keyboard handler, mission service, game facade
this.extractionEnabled = true;
this.gameServices.missionService.extractionEnabled = true;
```

**Fix**: Only MissionService controls extraction
```javascript
// Through service method
this.gameServices.missionService.enableExtraction();

// Property proxy handles delegation
this.extractionEnabled = true;  // Delegates to MissionService
```

## Benefits

1. **Predictable State**: Always know where data changes originate
2. **Easier Debugging**: Single path to trace for each state change
3. **No Sync Issues**: Impossible to have conflicting state
4. **Better Testing**: Mock services to test components in isolation
5. **Maintainable**: Clear ownership and responsibilities

## Enforcement Rules

1. **Services Own State**: Only services can modify their domain
2. **No Circular Dependencies**: Services never reference game object
3. **Fail Safe**: Better to error than corrupt state
4. **Read After Write**: Always sync from authoritative source
5. **No Fallbacks**: Require services, don't work around them

## Migration Strategy

When encountering bidirectional flows:

1. **Identify the Owner**: Which service should own this data?
2. **Add Property Proxy**: Create getter/setter that delegates
3. **Remove Fallbacks**: Delete any bypass code
4. **Read Back State**: After service calls, sync from service
5. **Test Thoroughly**: Ensure no state corruption

## Examples of Fixed Flows

### Equipment System Fix
**Problem**: Agent IDs changed during mission, equipment lookups failed
**Solution**: Preserve `originalId`, create ID resolution chain
```javascript
agent.originalId = agent.id;  // Preserve original
agent.id = 'agent_' + idx;    // Transform for mission
// Lookup uses: originalId || id || name
```

### Combat Damage Fix
**Problem**: Multiple damage calculation paths
**Solution**: All damage flows through GameServices → FormulaService
```javascript
GameServices.calculateAttackDamage()
  → InventoryService.getLoadout()
  → FormulaService.calculateDamage()
```

### Resource Spending Fix
**Problem**: Direct credits manipulation in multiple places
**Solution**: Property proxy delegates all changes to ResourceService
```javascript
this.credits -= 100;  // Automatically uses ResourceService
```

## Conclusion

Unidirectional data flow eliminates an entire class of bugs related to state synchronization. By ensuring data flows in one direction through well-defined service interfaces, we achieve a more maintainable and reliable architecture.