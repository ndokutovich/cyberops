# NPC and Dialog System - CyberOps: Syndicate

## Overview
A comprehensive NPC (Non-Player Character) and dialog system has been implemented with the following features:

### Core Features
1. **Neutral NPCs** - Non-hostile characters that populate each mission
2. **Interactive Dialogs** - Avatar-based dialog system with typing text effect
3. **Dialog Choices** - Multiple choice responses that affect outcomes
4. **Quest System** - NPCs can give optional side quests with rewards
5. **Multi-step Missions** - Main and optional objectives with NPC interactions

## How to Use

### Player Controls
- **H Key** - Hack/Interact with nearby NPCs (when within range) or use hack ability (when no NPC is near)
- NPCs within interaction range will show a pulsing "H" indicator
- Yellow **!** indicates an NPC has an available quest
- Green **?** indicates an NPC has a quest ready to turn in

### NPC Types by Mission

#### Mission 1 - Corporate
- **Data Broker** (🕵️) - Sells information about guard positions
- **Maintenance Worker** (🧹) - Provides tips about secret passages
- Quest: Corporate Sabotage (hack 3 terminals)

#### Mission 2 - Government
- **Underground Hacker** (💻) - Can disable alarms for 60 seconds
- Quest: Data Liberation (collect classified documents)

#### Mission 3 - Industrial
- **Disgruntled Engineer** (⚙️) - Warns about dangerous machines
- Quest: Stop the Machines (destroy prototypes)

#### Mission 4 - Underground
- **Resistance Leader** (🦾) - Offers alliance against the Syndicate

#### Mission 5 - Final
- **Double Agent** (🕴️) - Reveals boss weakness (but might be a trap!)

## Dialog System Features

### Visual Elements
- Avatar display (emoji representation of NPC)
- NPC name and title
- Typing text effect for immersion
- Cyberpunk-styled dialog box with neon borders

### Quest Tracking
- Automatic objective tracking
- Progress indicators for multi-part quests
- Reward system (credits, research points, items)
- Quest requirements and prerequisites

### NPC Behaviors
- **Stationary** - NPCs that stay in one place
- **Patrol** - NPCs that follow a set path
- **Wander** - NPCs that move randomly in an area

## Technical Implementation

### Files Modified
1. `js/game-npc.js` - Core NPC and dialog system
2. `js/game-flow.js` - NPC initialization in missions
3. `js/game-keyboard.js` - E key interaction handling
4. `js/game-loop.js` - NPC update logic
5. `js/game-rendering.js` - NPC rendering
6. `cyberops-game.html` - Script inclusion

### Key Functions
- `initNPCSystem()` - Initialize the NPC system
- `spawnNPCs()` - Spawn NPCs for current mission
- `interactWithNPC()` - Handle NPC interaction
- `showDialog()` - Display dialog UI
- `getNearbyNPC()` - Check for NPCs in range

## Testing the System

1. Start any mission
2. Look for NPCs (emoji characters with names)
3. Move an agent close to an NPC
4. Press **H** when the interaction prompt appears
5. Choose dialog options using the numbered buttons
6. Complete optional quests for rewards

## Quest Examples

### Corporate Sabotage (Mission 1)
- Hack 3 specific terminals
- Rewards: 500 credits, 50 research points

### Data Liberation (Mission 2)
- Collect 3 classified documents
- Rewards: 750 credits, 75 research points

### Stop the Machines (Mission 3)
- Plant explosives at production line and control room
- Escape to extraction point
- Rewards: 1000 credits, 100 research points, EMP grenade

## Future Enhancements
- Voice acting simulation
- More complex branching dialogs
- Reputation system affecting NPC reactions
- Trading system with merchants
- Companion NPCs that join your squad
- Romance options (joke)

## Notes
- The game pauses during dialog interactions
- NPCs remember previous interactions
- Some NPCs may become hostile based on dialog choices
- Quest rewards are automatically added to your resources
- NPCs show different indicators based on quest status

Enjoy the enhanced narrative experience in CyberOps: Syndicate!