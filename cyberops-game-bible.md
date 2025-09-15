● 📚 CYBEROPS: SYNDICATE - COMPLETE GAME MECHANICS BIBLE

  I. AGENT SYSTEM - The Foundation

  Base Parameters & Their Impact:

  1. Health (HP)
    - Range: 70-140 HP
    - Impact: Determines survivability and role viability
    - Tactical Use: High HP agents (Tank) lead breaches, low HP (Hackers) stay back
    - Death Penalty: Permanent - fallen agents go to Hall of Glory
  2. Damage
    - Range: 12-35 base damage
    - Multipliers: +Equipment +Research +Abilities
    - Final Formula: (Base + Weapon + Research) - Enemy_Protection
    - Tactical Impact: High damage agents eliminate threats faster
  3. Speed
    - Range: 3-5 movement units
    - Impact: Positioning, escape capability, objective rushing
    - Synergy: Speed + Stealth = infiltration, Speed + Tank = rapid response
  4. Specialization Classes:
    - Stealth: Glass cannon scouts (90HP/18DMG/5SPD)
    - Hacker: Support specialists (70HP/12DMG/4SPD)
    - Assault: Balanced fighters (140HP/25DMG/3SPD)
    - Sniper: Long-range elimination (85HP/35DMG/4SPD)
    - Demolition: Area denial (110HP/22DMG/3SPD)
    - Drone: Tech warfare (75HP/15DMG/4SPD)

  II. ABILITY SYSTEM - Tactical Options

  Core Abilities & Strategic Usage:

  1. MOVE (No cooldown)
    - Pathfinding: A* algorithm avoids obstacles
    - Squad Movement: T key selects all, maintains formation
    - 3D Mode: WASD control with squad following
  2. SHOOT (F key, 60 frame CD)
    - Range: 10 tiles
    - Auto-targeting: Nearest enemy
    - Team Fire: All selected agents shoot together
    - Screen Effects: Minor shake + freeze
  3. GRENADE (G key, 180 frame CD)
    - AOE: 3-tile radius, 50 damage
    - Delay: 0.5 seconds
    - Best Use: Grouped enemies, area denial
    - Visual: Maximum screen shake (15 intensity)
  4. HACK/INTERACT (H key, 120 frame CD)
    - Mission-Adaptive:
        - M1-2: Terminal hacking (doors, data)
      - M3: Explosive planting
      - M4: Target elimination
      - M5: Gate breaching
    - Range: 3 tiles + hackBonus%
  5. SHIELD (V key, 300 frame CD)
    - Protection: 100 shield points
    - Duration: 3 seconds
    - Strategy: Pre-breach activation, rescue operations

  III. RESEARCH SYSTEM - Permanent Evolution

  Research Projects & Compound Effects:

  1. Weapon Upgrades (150 RP)
    - Effect: +5 damage ALL agents
    - Compound: With equipment = +5-45 total damage
    - Priority: Early game essential
  2. Stealth Technology (200 RP)
    - Effect: -20% enemy detection range
    - Compound: With stealth agents = near invisibility
    - Priority: Mission-dependent
  3. Combat Systems (175 RP)
    - Effect: +15 HP ALL agents
    - Compound: 85HP hacker → 100HP (25% survivability increase)
    - Priority: Mid-game survival boost
  4. Hacking Protocols (225 RP)
    - Effect: +25% hack speed/range
    - Compound: 3 tiles → 3.75 tiles range
    - Priority: Objective-heavy missions
  5. Medical Systems (300 RP)
    - Effect: 20% auto-heal between missions
    - Compound: Reduces agent downtime
    - Priority: Late-game sustainability
  6. Advanced Tactics (250 RP)
    - Effect: +1 speed ALL agents
    - Compound: 3 speed → 4 speed (33% mobility boost)
    - Priority: Game-changing for slow agents

  IV. EQUIPMENT SYSTEM - Loadout Customization

  Weapons (Damage Modifiers):
  - Silenced Pistol: +15 DMG, stealth ops
  - Assault Rifle: +25 DMG, balanced choice
  - Sniper Rifle: +40 DMG, elimination missions
  - SMG: +20 DMG, rapid engagement

  Equipment (Stat Modifiers):
  - Body Armor: -10 incoming damage (minimum 1)
  - Hacking Kit: +20% hack range/speed
  - Explosives Kit: +50 grenade damage
  - Stealth Suit: -25% detection radius

  Stacking Mechanics:
  - Multiple items stack additively
  - 3x Body Armor = -30 damage reduction
  - Equipment shared across squad

  V. MISSION ECONOMY & PROGRESSION

  Resource Flow:

  Mission Success → Rewards:
  ├── Credits (500-5000) → Buy Equipment/Agents
  ├── Research Points (50-200) → Unlock Upgrades
  └── World Control (5-25%) → Campaign Progress

  Mission Failure → Penalties:
  ├── No rewards
  ├── Agent deaths (permanent)
  └── Must retry or select different mission

  Mission Requirements:
  - M1: Basic infiltration
  - M2: Requires hacker skill
  - M3: Requires demolition skill
  - M4: Requires sniper skill
  - M5: Requires hacker + assault + demolition

  VI. COMBAT MECHANICS - Deep Dive

  Damage Resolution:

  Final_Damage = (Agent_Base + Weapon_Bonus + Research_Bonus)
                 - (Target_Armor + Target_Shield)

  Minimum_Damage = 1 (always)

  Enemy AI States:

  1. Patrol (Alert 0)
    - Random movement
    - 5-tile vision
    - Slow reaction
  2. Alert (Alert 1-50)
    - Investigating
    - Enhanced vision
    - Calls reinforcements
  3. Combat (Alert 51-100)
    - Direct pursuit
    - 2% shoot chance/frame
    - Coordinate attacks

  Fog of War System:
  - Vision Range: 8 tiles (12 for Ghost agents)
  - Line of Sight: Walls block vision
  - Memory: Explored areas remain visible (dimmed)
  - Updates: Every frame for responsiveness

  VII. TACTICAL SYNERGIES

  Optimal Team Compositions:

  1. Balanced Squad (Default):
    - 1 Tank (breach), 1 Sniper (overwatch), 1 Hacker (objectives), 1 Stealth (scout)
  2. Stealth Team:
    - 2 Stealth + 2 Hackers
    - Research: Stealth Tech priority
    - Equipment: Stealth Suits
  3. Assault Team:
    - 2 Assault + 2 Demo
    - Research: Weapon/Combat priority
    - Equipment: Assault Rifles + Armor

  Advanced Tactics:

  - Pincer Movement: Split squad, attack from multiple angles
  - Overwatch: Sniper covers hacker during terminal work
  - Shield Wall: Tank with shield leads, team follows
  - Hit & Run: High speed agents strike and retreat

  VIII. WIN CONDITIONS & OPTIMIZATION

  Mission Success Factors:
  1. All objectives complete
  2. At least 1 agent survives
  3. Bonus: No casualties = full rewards

  Campaign Optimization:
  - Early: Hire all agents, basic equipment
  - Mid: Focus research on core upgrades
  - Late: Specialized equipment for final missions

  Resource Priority:
  1. Agents (redundancy)
  2. Research (permanent benefits)
  3. Equipment (mission-specific)

  IX. HIDDEN MECHANICS

  - Squad Following: In 3D mode, unselected agents auto-follow
  - Path Caching: A* pathfinding caches routes for 5 seconds
  - Frustum Culling: 3D objects beyond 100 units not rendered
  - LOS Caching: Line-of-sight calculations cached for performance
  - Music Continuity: Level music continues in hub for atmosphere
  
  
  
  
  
  ✅ SOLID ARCHITECTURE IMPLEMENTATION COMPLETE!

  I've successfully extracted all research and weapon math into a dedicated service layer following SOLID
  principles:

  🏗️ ARCHITECTURE OVERVIEW:

  1. FormulaService (Single Responsibility)

  - Purpose: Centralized game mathematics
  - Responsibilities:
    - Damage calculations (with armor, criticals, cover)
    - Vision and detection ranges
    - Movement costs and speed
    - Health and healing
    - Combat mechanics (hit chance, shield absorption)
    - Hacking calculations
    - Mission rewards

  2. ResearchService (Open/Closed)

  - Purpose: Research system management
  - Responsibilities:
    - Project definitions and costs
    - Research effects application
    - Progress tracking
    - Recommendations engine
    - Medical healing between missions

  3. EquipmentService (Interface Segregation)

  - Purpose: Weapon and equipment management
  - Responsibilities:
    - Weapon/equipment definitions
    - Best weapon selection
    - Equipment stacking calculations
    - Loadout recommendations by specialization
    - Effectiveness scoring

  4. GameServices (Dependency Injection)

  - Purpose: Service locator and orchestrator
  - Responsibilities:
    - Service initialization
    - Combined calculations
    - State validation
    - Recommendations engine

  🎯 KEY BENEFITS:

  1. Separation of Concerns
    - Each service has a single, well-defined responsibility
    - Math logic separated from game logic
  2. Testability
    - Each service can be unit tested independently
    - Mock dependencies easily
  3. Maintainability
    - Changes to formulas don't affect game code
    - Easy to add new research/equipment
  4. Extensibility
    - Open for extension (new formulas)
    - Closed for modification (existing code stable)
  5. Reusability
    - Services can be used anywhere in the game
    - Consistent calculations throughout

  📊 USAGE EXAMPLE:

  // Old way (scattered calculations):
  agent.damage = baseData.damage + 5; // Research hardcoded
  agent.damage += weapon.damage; // Equipment hardcoded

  // New way (centralized services):
  const agent = GameServices.calculateAgentStats(
      baseAgent,
      completedResearch,
      weapons,
      equipment
  );

  // All calculations handled by services with proper formulas

  🔧 INTEGRATION:

  - Services loaded before game scripts
  - Fallback to old system if services unavailable
  - Progressive enhancement approach
  - No breaking changes to existing code

  The system now follows SOLID principles with clean separation, dependency injection, and single responsibilities
  for each service!