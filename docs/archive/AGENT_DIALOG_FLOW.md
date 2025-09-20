# Agent Management Dialog Flow Analysis

## Current Dialog Transition Graph

```
SYNDICATE HUB
    │
    ├─> AGENT MANAGEMENT
    │       ├─> [HIRE AGENTS] ──> Hire Agent List
    │       │                      ├─> [BACK] ──> Agent Management ✓
    │       │                      └─> (hire action) ──> Success Dialog
    │       │                                              ├─> [HIRE MORE] ──> Hire Agent List (recursive)
    │       │                                              └─> [BACK TO HUB] ──> Syndicate Hub ✗ (skips Agent Management)
    │       │
    │       ├─> [MANAGE SQUAD] ──> Squad Management
    │       │                       ├─> (remove agent) ──> Confirmation Dialog
    │       │                       │                       └─> [BACK] ──> Squad Management ✓
    │       │                       └─> (agent details) ──> Agent Details
    │       │                                               └─> [BACK] ──> Squad Management ✓
    │       │
    │       └─> [BACK] ──> Syndicate Hub ✓
    │
    └─> Other Hub Options...
```

## Problems Found

### 1. **Can't Close Hire List Dialog**
- The "Hire Agent List" dialog only has a [BACK] button
- If hiring fails or user wants to cancel, they're stuck

### 2. **Inconsistent Navigation After Hiring**
- Success dialog goes directly to Hub with [BACK TO HUB]
- Should return to Agent Management for consistency
- [HIRE MORE] creates a loop without way back to Agent Management

### 3. **Missing Close/Cancel Options**
- Several dialogs lack [X] close buttons
- No ESC key handling in some dialogs

## Recommended Flow

```
SYNDICATE HUB
    │
    ├─> AGENT MANAGEMENT
    │       ├─> [HIRE AGENTS] ──> Hire Agent List
    │       │                      ├─> [BACK] ──> Agent Management ✓
    │       │                      ├─> [CLOSE] ──> Agent Management ✓
    │       │                      └─> (hire action) ──> Success Dialog
    │       │                                              ├─> [HIRE MORE] ──> Hire Agent List ✓
    │       │                                              ├─> [MANAGE SQUAD] ──> Squad Management ✓
    │       │                                              └─> [BACK] ──> Agent Management ✓ (fixed)
    │       │
    │       ├─> [MANAGE SQUAD] ──> Squad Management
    │       │                       ├─> [BACK] ──> Agent Management ✓
    │       │                       └─> (actions stay within Squad Management)
    │       │
    │       └─> [BACK] ──> Syndicate Hub ✓
```

## Fixes Needed

1. **Fix Hire Success Dialog Navigation**
   - Change [BACK TO HUB] to [BACK] -> Agent Management
   - Or add both options: [BACK] and [BACK TO HUB]

2. **Add Close Button to Hire List**
   - Add [CLOSE] or [CANCEL] button
   - Ensure ESC key works

3. **Consistent Button Naming**
   - Use [BACK] to go up one level
   - Use [CLOSE] or [X] to close dialog
   - Use [BACK TO HUB] only for direct hub navigation

4. **Fix Dialog Stacking**
   - Ensure each dialog properly closes before opening next
   - Prevent multiple dialogs stacking incorrectly