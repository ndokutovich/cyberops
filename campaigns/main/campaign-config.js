/**
 * Main Campaign Configuration
 * All content data for the Syndicate Rising campaign
 * This file contains WHAT exists in the game, not HOW it works
 */

(function() {
    const mainCampaign = {
        metadata: {
            id: "main",
            name: "Syndicate Rising",
            version: "1.0.0",
            author: "CyberOps Team",
            description: "Fight against mega-corporations in a dystopian future",
            schemaVersion: "1.0.0"
        },

        // Move all RPG configuration here from game-rpg-config.js
        rpgConfig: {
            classes: {
                soldier: {
                    name: "Soldier",
                    description: "Frontline fighter with balanced combat skills",
                    icon: "👥",
                    statBonuses: {
                        strength: 2,
                        endurance: 2,
                        agility: 0,
                        intelligence: -1,
                        tech: -1,
                        charisma: 0
                    },
                    skills: ["weaponMastery", "tacticalAwareness", "suppression"],
                    startingEquipment: ["rifle", "combatArmor", "grenade"],
                    levelBonuses: {
                        health: 10,
                        damage: 2
                    }
                },
                infiltrator: {
                    name: "Infiltrator",
                    description: "Stealth specialist with hacking abilities",
                    icon: "🥷",
                    statBonuses: {
                        strength: -1,
                        endurance: 0,
                        agility: 3,
                        intelligence: 1,
                        tech: 1,
                        charisma: 0
                    },
                    skills: ["stealth", "hacking", "lockpicking"],
                    startingEquipment: ["smg", "stealthSuit", "hackingKit"],
                    levelBonuses: {
                        health: 5,
                        stealth: 5
                    }
                },
                techSpecialist: {
                    name: "Tech Specialist",
                    description: "Technology expert with support abilities",
                    icon: "💻",
                    statBonuses: {
                        strength: -2,
                        endurance: -1,
                        agility: 0,
                        intelligence: 3,
                        tech: 3,
                        charisma: 0
                    },
                    skills: ["hacking", "droneControl", "techSupport"],
                    startingEquipment: ["pistol", "techArmor", "drone"],
                    levelBonuses: {
                        health: 3,
                        hackSpeed: 10
                    }
                },
                medic: {
                    name: "Medic",
                    description: "Combat medic with healing abilities",
                    icon: "🏥",
                    statBonuses: {
                        strength: 0,
                        endurance: 1,
                        agility: 0,
                        intelligence: 2,
                        tech: 1,
                        charisma: 1
                    },
                    skills: ["firstAid", "surgery", "chemistry"],
                    startingEquipment: ["smg", "medicArmor", "medkit"],
                    levelBonuses: {
                        health: 7,
                        healing: 3
                    }
                },
                heavyWeapons: {
                    name: "Heavy Weapons",
                    description: "Demolitions expert with heavy firepower",
                    icon: "💪",
                    statBonuses: {
                        strength: 3,
                        endurance: 2,
                        agility: -2,
                        intelligence: -1,
                        tech: 0,
                        charisma: -1
                    },
                    skills: ["heavyWeapons", "demolitions", "suppression"],
                    startingEquipment: ["heavyRifle", "heavyArmor", "rocketLauncher"],
                    levelBonuses: {
                        health: 15,
                        damage: 3
                    }
                },
                recon: {
                    name: "Recon",
                    description: "Scout with enhanced perception",
                    icon: "🔍",
                    statBonuses: {
                        strength: 0,
                        endurance: 0,
                        agility: 2,
                        intelligence: 1,
                        tech: 0,
                        charisma: 1
                    },
                    skills: ["scouting", "marksmanship", "tracking"],
                    startingEquipment: ["sniperRifle", "scoutArmor", "binoculars"],
                    levelBonuses: {
                        health: 5,
                        detection: 10
                    }
                }
            },

            skills: {
                // Combat skills
                weaponMastery: {
                    name: "Weapon Mastery",
                    description: "Increased damage with all weapons",
                    maxLevel: 5,
                    effect: "damage",
                    perLevel: 5
                },
                marksmanship: {
                    name: "Marksmanship",
                    description: "Improved accuracy and critical chance",
                    maxLevel: 5,
                    effect: "accuracy",
                    perLevel: 10
                },
                tacticalAwareness: {
                    name: "Tactical Awareness",
                    description: "Better positioning and cover usage",
                    maxLevel: 3,
                    effect: "defense",
                    perLevel: 5
                },

                // Stealth skills
                stealth: {
                    name: "Stealth",
                    description: "Move undetected by enemies",
                    maxLevel: 5,
                    effect: "detection",
                    perLevel: -15
                },
                lockpicking: {
                    name: "Lockpicking",
                    description: "Open locked doors and containers",
                    maxLevel: 3,
                    effect: "lockpick",
                    perLevel: 20
                },

                // Tech skills
                hacking: {
                    name: "Hacking",
                    description: "Hack terminals and systems faster",
                    maxLevel: 5,
                    effect: "hackSpeed",
                    perLevel: 15
                },
                droneControl: {
                    name: "Drone Control",
                    description: "Control drones for recon and combat",
                    maxLevel: 3,
                    effect: "droneRange",
                    perLevel: 50
                },

                // Medical skills
                firstAid: {
                    name: "First Aid",
                    description: "Heal wounded agents",
                    maxLevel: 5,
                    effect: "healing",
                    perLevel: 10
                },
                surgery: {
                    name: "Surgery",
                    description: "Advanced medical procedures",
                    maxLevel: 3,
                    effect: "revive",
                    perLevel: 20
                },

                // Heavy weapons skills
                heavyWeapons: {
                    name: "Heavy Weapons",
                    description: "Mastery of heavy weapons and explosives",
                    maxLevel: 5,
                    effect: "heavyDamage",
                    perLevel: 8
                },
                demolitions: {
                    name: "Demolitions",
                    description: "Expert use of explosives and grenades",
                    maxLevel: 3,
                    effect: "explosiveDamage",
                    perLevel: 15
                },
                suppression: {
                    name: "Suppression",
                    description: "Pin down enemies with suppressive fire",
                    maxLevel: 3,
                    effect: "suppressionRadius",
                    perLevel: 1
                },

                // Recon skills
                scouting: {
                    name: "Scouting",
                    description: "Enhanced detection and vision range",
                    maxLevel: 5,
                    effect: "visionRange",
                    perLevel: 10
                },
                tracking: {
                    name: "Tracking",
                    description: "Track enemy movements and predict paths",
                    maxLevel: 3,
                    effect: "tracking",
                    perLevel: 20
                }
            },

            stats: {
                primary: [
                    { id: "strength", name: "Strength", icon: "💪", description: "Physical power and melee damage" },
                    { id: "agility", name: "Agility", icon: "🏃", description: "Speed, dodge, and initiative" },
                    { id: "intelligence", name: "Intelligence", icon: "🧠", description: "Hacking, tech use, and XP gain" },
                    { id: "endurance", name: "Endurance", icon: "🛡️", description: "Health, stamina, and resistance" },
                    { id: "tech", name: "Tech", icon: "⚡", description: "Technology and equipment effectiveness" },
                    { id: "charisma", name: "Charisma", icon: "💬", description: "Leadership and NPC interactions" }
                ],
                derived: {
                    maxHealth: { base: 100, stat: "endurance", multiplier: 10 },
                    initiative: { base: 10, stat: "agility", multiplier: 2 },
                    carryWeight: { base: 50, stat: "strength", multiplier: 5 },
                    hackSpeed: { base: 100, stat: "tech", multiplier: -5 },
                    critChance: { base: 5, stat: "agility", multiplier: 1 },
                    dodge: { base: 0, stat: "agility", multiplier: 2 }
                }
            },

            levelCurve: {
                type: "exponential",
                baseXP: 100,
                multiplier: 1.5,
                maxLevel: 20
            },

            perks: {
                // Combat perks
                rapidFire: {
                    name: "Rapid Fire",
                    description: "+10% damage with ranged weapons",
                    icon: "🔫",
                    effects: { damageBonus: 0.1 },
                    requirements: { level: 1, agility: 5 },
                    category: "combat"
                },
                juggernaut: {
                    name: "Juggernaut",
                    description: "Reduce incoming damage by 30%",
                    icon: "🛡️",
                    effects: { damageReduction: 0.3 },
                    requirements: { level: 3, endurance: 7 },
                    category: "defense"
                },
                deadEye: {
                    name: "Dead Eye",
                    description: "+25% critical hit chance",
                    icon: "🎯",
                    effects: { critChanceBonus: 25 },
                    requirements: { level: 6, agility: 8 },
                    category: "combat"
                },
                armorPiercing: {
                    name: "Armor Piercing",
                    description: "Ignore 50% of enemy armor",
                    icon: "⚔️",
                    effects: { armorPierce: 0.5 },
                    requirements: { level: 9, strength: 9 },
                    category: "combat"
                },

                // Stealth perks
                shadowOperative: {
                    name: "Shadow Operative",
                    description: "50% harder to detect when moving",
                    icon: "👤",
                    effects: { detectionReduction: 0.5 },
                    requirements: { level: 1, agility: 6 },
                    category: "stealth"
                },
                silentKiller: {
                    name: "Silent Killer",
                    description: "+50% damage on stealth attacks",
                    icon: "🗡️",
                    effects: { stealthDamageBonus: 0.5 },
                    requirements: { level: 3, agility: 7 },
                    category: "stealth"
                },
                ghostWalk: {
                    name: "Ghost Walk",
                    description: "Move without triggering alerts",
                    icon: "👻",
                    effects: { silentMovement: true },
                    requirements: { level: 6, agility: 9 },
                    category: "stealth"
                },

                // Tech perks
                techSavant: {
                    name: "Tech Savant",
                    description: "Hack terminals 25% faster",
                    icon: "💻",
                    effects: { hackSpeedBonus: 0.25 },
                    requirements: { level: 1, tech: 6, intelligence: 5 },
                    category: "tech"
                },
                overcharge: {
                    name: "Overcharge",
                    description: "Tech weapons deal +30% damage",
                    icon: "⚡",
                    effects: { techDamageBonus: 0.3 },
                    requirements: { level: 3, tech: 8 },
                    category: "tech"
                },
                systemMaster: {
                    name: "System Master",
                    description: "Can hack from longer range",
                    icon: "🖥️",
                    effects: { hackRangeBonus: 5 },
                    requirements: { level: 6, tech: 9, intelligence: 7 },
                    category: "tech"
                },

                // Medical perks
                fieldMedic: {
                    name: "Field Medic",
                    description: "Heal allies for +50% health",
                    icon: "🏥",
                    effects: { healingBonus: 0.5 },
                    requirements: { level: 1, intelligence: 5 },
                    category: "medical"
                },
                combatStims: {
                    name: "Combat Stims",
                    description: "Use stimpacks instantly (no AP cost)",
                    icon: "💉",
                    effects: { instantStims: true },
                    requirements: { level: 3, intelligence: 6 },
                    category: "medical"
                },
                medicSupremacy: {
                    name: "Medic Supremacy",
                    description: "Can revive fallen allies in combat",
                    icon: "⛑️",
                    effects: { combatRevive: true },
                    requirements: { level: 9, intelligence: 9 },
                    category: "medical"
                },

                // Leadership perks
                tacticalLeader: {
                    name: "Tactical Leader",
                    description: "Nearby allies gain +10% accuracy",
                    icon: "📊",
                    effects: { leadershipBonus: 0.1, radius: 5 },
                    requirements: { level: 3, charisma: 7 },
                    category: "leadership"
                },
                inspiringPresence: {
                    name: "Inspiring Presence",
                    description: "Nearby allies gain +2 AP per turn",
                    icon: "🌟",
                    effects: { apBonus: 2, radius: 5 },
                    requirements: { level: 6, charisma: 8 },
                    category: "leadership"
                },
                commandPresence: {
                    name: "Command Presence",
                    description: "All squad members gain +15% damage",
                    icon: "👑",
                    effects: { squadDamageBonus: 0.15 },
                    requirements: { level: 12, charisma: 10 },
                    category: "leadership"
                },

                // Survival perks
                ironWill: {
                    name: "Iron Will",
                    description: "+25 maximum health",
                    icon: "❤️",
                    effects: { maxHealthBonus: 25 },
                    requirements: { level: 1, endurance: 6 },
                    category: "survival"
                },
                secondWind: {
                    name: "Second Wind",
                    description: "Automatically heal 25% health when below 20%",
                    icon: "🔄",
                    effects: { autoHeal: true, threshold: 0.2, amount: 0.25 },
                    requirements: { level: 6, endurance: 8 },
                    category: "survival"
                },
                lastStand: {
                    name: "Last Stand",
                    description: "Cannot be killed for 5 seconds when health reaches 0",
                    icon: "⚡",
                    effects: { lastStandDuration: 5 },
                    requirements: { level: 12, endurance: 10 },
                    category: "survival"
                }
            },

            progression: {
                statPointsPerLevel: 3,
                skillPointsPerLevel: 5,
                perkPointsEvery: 3
            },

            items: {
                weapons: {
                    // Standard weapons (moved from campaign-content.js)
                    silencedPistol: {
                        id: "weapon_silenced_pistol",
                        name: "Silenced Pistol",
                        description: "Quiet and effective for stealth operations",
                        icon: "🔫",
                        type: "weapon",
                        slot: "primary",
                        weight: 3,
                        value: 500,
                        stats: {
                            damage: 15,
                            accuracy: 90,
                            critChance: 10,
                            silenced: true
                        },
                        rarity: "common",
                        initialOwned: 3  // Starting inventory
                    },
                    assaultRifle: {
                        id: "weapon_assault_rifle",
                        name: "Assault Rifle",
                        description: "Standard military-grade automatic weapon",
                        icon: "🔫",
                        type: "weapon",
                        slot: "primary",
                        weight: 5,
                        value: 800,
                        stats: {
                            damage: 25,
                            accuracy: 85,
                            critChance: 12,
                            fireRate: "auto"
                        },
                        rarity: "common",
                        initialOwned: 1
                    },
                    sniperRifle: {
                        id: "weapon_sniper_rifle",
                        name: "Sniper Rifle",
                        description: "Long-range precision weapon",
                        icon: "🎯",
                        type: "weapon",
                        slot: "primary",
                        weight: 6,
                        value: 1200,
                        stats: {
                            damage: 40,
                            accuracy: 95,
                            critChance: 25,
                            range: 15
                        },
                        rarity: "uncommon",
                        initialOwned: 0
                    },
                    smg: {
                        id: "weapon_smg",
                        name: "SMG",
                        description: "Rapid-fire close combat weapon",
                        icon: "🔫",
                        type: "weapon",
                        slot: "primary",
                        weight: 4,
                        value: 600,
                        stats: {
                            damage: 20,
                            accuracy: 75,
                            critChance: 8,
                            fireRate: "burst"
                        },
                        rarity: "common",
                        initialOwned: 2
                    },

                    // UNIQUE WEAPON - Only available from Viktor's shop
                    ghostPrototype: {
                        id: "weapon_ghost_prototype",
                        name: "Ghost Prototype",
                        description: "An experimental plasma rifle stolen from a military research facility. Deals massive damage but has a chance to malfunction.",
                        icon: "⚡",
                        type: "weapon",
                        slot: "primary",
                        weight: 8,
                        value: 8000,
                        stats: {
                            damage: 45,  // Very high damage
                            accuracy: 85,
                            critChance: 15,
                            malfunctionChance: 10  // 10% chance to misfire
                        },
                        rarity: "unique",
                        shopExclusive: "black_market"  // Only Viktor sells this
                    }
                },
                armor: {
                    // Armor/Equipment (moved from campaign-content.js)
                    bodyArmor: {
                        id: "armor_body_armor",
                        name: "Body Armor",
                        description: "Reduces damage from enemy attacks",
                        icon: "🛡️",
                        type: "armor",
                        slot: "chest",
                        weight: 8,
                        value: 300,
                        stats: {
                            protection: 10,
                            moveSpeedPenalty: -1
                        },
                        rarity: "common",
                        initialOwned: 3
                    },
                    stealthSuit: {
                        id: "armor_stealth_suit",
                        name: "Stealth Suit",
                        description: "Reduces enemy detection range",
                        icon: "🥷",
                        type: "armor",
                        slot: "chest",
                        weight: 4,
                        value: 800,
                        stats: {
                            protection: 5,
                            stealthBonus: 25,
                            detectionRadius: -2
                        },
                        rarity: "uncommon",
                        initialOwned: 1
                    }
                },
                utility: {
                    // Utility items (moved/created from equipment)
                    hackingKit: {
                        id: "util_hacking_kit",
                        name: "Hacking Kit",
                        description: "Speeds up terminal hacking",
                        icon: "💻",
                        type: "utility",
                        slot: "utility",
                        weight: 2,
                        value: 400,
                        stats: {
                            hackBonus: 20,
                            hackSpeed: 1.5
                        },
                        rarity: "common",
                        initialOwned: 2
                    },
                    explosivesKit: {
                        id: "util_explosives_kit",
                        name: "Explosives Kit",
                        description: "Demolition charges for objectives",
                        icon: "💣",
                        type: "utility",
                        slot: "utility",
                        weight: 5,
                        value: 600,
                        stats: {
                            explosiveDamage: 50,
                            blastRadius: 3
                        },
                        rarity: "uncommon",
                        initialOwned: 1,
                        consumable: true,
                        charges: 3
                    }
                },
                consumables: {
                    medkit: {
                        name: "Medkit",
                        description: "Restores 50 health",
                        value: 100,
                        weight: 2,
                        effect: { type: "heal", amount: 50 }
                    },
                    stimpack: {
                        name: "Stimpack",
                        description: "Boosts stats temporarily",
                        value: 150,
                        weight: 1,
                        effect: { type: "buff", duration: 5, stats: { agility: 2, strength: 2 } }
                    }
                }
            },

            // Shop configurations
            shops: {
                black_market: {
                    name: "Viktor's Black Market",
                    description: "The best gear in the city - for the right price",
                    priceMultiplier: 1.2,  // 20% markup
                    sellPriceMultiplier: 0.5,  // Buy back at 50% value
                    infiniteStock: true,
                    itemCategories: ["weapons", "armor", "utility", "consumables"],
                    // Items available in shop (references to items defined above)
                    availableItems: {
                        weapons: [
                            "weapon_silenced_pistol",
                            "weapon_assault_rifle",
                            "weapon_sniper_rifle",
                            "weapon_smg",
                            "weapon_ghost_prototype"  // Exclusive
                        ],
                        armor: [
                            "armor_body_armor",
                            "armor_stealth_suit"
                        ],
                        utility: [
                            "util_hacking_kit",
                            "util_explosives_kit"
                        ],
                        consumables: [
                            "medkit",
                            "stimpack"
                        ]
                    },
                    exclusiveItems: ["weapon_ghost_prototype"]  // Viktor's exclusive inventory
                }
            }
        },

        // Combat formulas and balance
        combat: {
            formulaSet: "standard", // Use standard formulas from ContentLoader
            damageVariance: 0.2,     // ±20% damage variance
            criticalMultiplier: 2.0,  // 2x damage on critical hits
            dodgeBaseChance: 0.05,    // 5% base dodge chance
            armorEffectiveness: 1.0,  // Full armor effectiveness

            // Additional combat parameters
            coverBonus: 0.5,         // 50% damage reduction in cover
            flankingBonus: 1.5,       // 50% more damage when flanking
            suppressionPenalty: 0.3,  // 30% accuracy penalty when suppressed

            // Range modifiers
            rangePenalties: {
                close: 0,
                medium: 0.1,
                long: 0.3,
                extreme: 0.5
            }
        },

        // Economy configuration
        economy: {
            startingCredits: 5000,
            startingResearchPoints: 100,

            // Mission rewards multipliers
            missionRewards: {
                credits: { base: 1000, perObjective: 500, perEnemy: 100 },
                research: { base: 50, perObjective: 25, perTerminal: 10 },
                xp: { base: 100, perObjective: 50, perEnemy: 25 }
            },

            // Shop prices multipliers
            sellValueMultiplier: 0.5,   // Sell for 50% of buy price
            repairCostMultiplier: 0.3,  // Repair for 30% of item value

            // Black market
            blackMarket: {
                enabled: true,
                priceMultiplier: 1.5,    // 50% more expensive
                rarityChance: 0.1        // 10% chance for rare items
            }
        },

        // Progression and unlocks
        progression: {
            // Research tree will be loaded from existing data
            researchTree: {},

            // Unlock schedule (mission number -> unlocks)
            unlockSchedule: [
                { mission: 1, unlocks: ["smg", "lightArmor"] },
                { mission: 3, unlocks: ["rifle", "mediumArmor", "grenades"] },
                { mission: 5, unlocks: ["sniperRifle", "heavyArmor"] },
                { mission: 8, unlocks: ["rocketLauncher", "powerArmor"] }
            ],

            // Milestones
            milestones: [
                { id: "firstBlood", name: "First Blood", description: "Eliminate first enemy", reward: { credits: 500 } },
                { id: "hacker", name: "Hacker", description: "Hack 10 terminals", reward: { research: 100 } },
                { id: "survivor", name: "Survivor", description: "Complete 5 missions without losing agents", reward: { credits: 5000 } }
            ]
        },

        // Audio configuration
        audio: {
            musicVolume: 0.7,
            sfxVolume: 0.8,

            tracks: {
                menu: "game-music.mp3",
                hub: "game-music.mp3",
                combat: "music/missions/combat.mp3",
                stealth: "music/missions/stealth.mp3",
                victory: "music/global/victory.mp3",
                defeat: "music/global/defeat.mp3"
            },

            soundEffects: {
                // Map game events to sound files
                shoot: "sfx/shoot.wav",
                explosion: "sfx/explosion.wav",
                hack: "sfx/hack.wav",
                door: "sfx/door.wav",
                alarm: "sfx/alarm.wav"
            }
        },

        // UI customization
        ui: {
            theme: "cyberpunk",
            primaryColor: "#00ffff",
            secondaryColor: "#ff00ff",
            dangerColor: "#ff0000",
            successColor: "#00ff00",
            warningColor: "#ffff00",

            // Complete UI strings for localization
            strings: {
                en: {
                    // Main menu
                    menu: {
                        newGame: "NEW GAME",
                        continue: "CONTINUE",
                        options: "OPTIONS",
                        credits: "CREDITS",
                        exit: "EXIT"
                    },

                    // Hub interface
                    hub: {
                        arsenal: "ARSENAL",
                        research: "RESEARCH",
                        missions: "MISSIONS",
                        agents: "AGENTS",
                        save: "SAVE GAME",
                        load: "LOAD GAME",
                        syndicate: "SYNDICATE HUB",
                        worldControl: "WORLD CONTROL",
                        credits: "CREDITS",
                        researchPoints: "RESEARCH"
                    },

                    // Mission interface
                    mission: {
                        briefing: "MISSION BRIEFING",
                        loadout: "LOADOUT",
                        deploy: "DEPLOY",
                        abort: "ABORT MISSION",
                        objectives: "OBJECTIVES",
                        extraction: "EXTRACTION",
                        enemiesRemaining: "ENEMIES REMAINING"
                    },

                    // Combat interface
                    combat: {
                        shoot: "SHOOT",
                        grenade: "GRENADE",
                        hack: "HACK",
                        shield: "SHIELD",
                        move: "MOVE",
                        endTurn: "END TURN",
                        reload: "RELOAD",
                        overwatch: "OVERWATCH"
                    },

                    // RPG interface
                    rpg: {
                        level: "LEVEL",
                        experience: "EXPERIENCE",
                        stats: "STATS",
                        skills: "SKILLS",
                        inventory: "INVENTORY",
                        equipment: "EQUIPMENT",
                        characterSheet: "CHARACTER SHEET",
                        levelUp: "LEVEL UP!"
                    },

                    // Messages
                    messages: {
                        missionComplete: "MISSION COMPLETE!",
                        missionFailed: "MISSION FAILED",
                        agentDown: "{agent} HAS BEEN ELIMINATED!",
                        agentHired: "{agent} JOINED YOUR SQUAD",
                        levelUp: "{agent} REACHED LEVEL {level}!",
                        itemAcquired: "ACQUIRED {item}",
                        researchComplete: "RESEARCH COMPLETE: {tech}",
                        notEnoughCredits: "INSUFFICIENT CREDITS",
                        notEnoughResearch: "INSUFFICIENT RESEARCH POINTS",
                        saveComplete: "GAME SAVED",
                        loadComplete: "GAME LOADED",
                        inventoryFull: "INVENTORY FULL",
                        questComplete: "QUEST COMPLETE: {quest}"
                    },

                    // Equipment
                    equipment: {
                        weapon: "WEAPON",
                        armor: "ARMOR",
                        utility: "UTILITY",
                        damage: "DAMAGE",
                        protection: "PROTECTION",
                        weight: "WEIGHT",
                        equipped: "EQUIPPED",
                        available: "AVAILABLE",
                        autoOptimize: "AUTO-OPTIMIZE"
                    }
                }
            }
        },

        // Formula configurations
        formulas: {
            damage: {
                type: "standard",
                config: {
                    strengthModifier: 0.5,  // Strength adds 50% of value to damage
                    weaponScaling: 1.0,     // Weapon damage at full effectiveness
                    armorReduction: "flat"  // Armor reduces damage by flat amount
                }
            },
            experience: {
                type: "standard",
                config: {
                    enemyBaseXP: 25,
                    objectiveXP: 100,
                    missionCompleteXP: 500,
                    levelDifferenceMultiplier: 0.1
                }
            },
            movement: {
                type: "standard",
                config: {
                    baseSpeed: 5,
                    agilityBonus: 0.2,      // 20% speed per agility point
                    armorPenalty: 0.1,      // 10% speed reduction per armor weight
                    terrainMultipliers: {
                        normal: 1.0,
                        difficult: 0.5,
                        water: 0.3
                    }
                }
            },
            detection: {
                type: "standard",
                config: {
                    baseRange: 150,
                    perceptionBonus: 10,     // Per point of perception
                    stealthReduction: 0.5,   // Stealth reduces detection by 50%
                    lightingMultipliers: {
                        bright: 1.2,
                        normal: 1.0,
                        dark: 0.6
                    }
                }
            }
        }
    };

    // DIAGNOSTIC: Check rpgConfig structure immediately after definition
    console.log('🔍 [campaign-config] DIAGNOSTIC - rpgConfig defined');
    console.log('🔍 [campaign-config] DIAGNOSTIC - rpgConfig keys:', Object.keys(mainCampaign.rpgConfig));
    console.log('🔍 [campaign-config] DIAGNOSTIC - rpgConfig.shops exists:', !!mainCampaign.rpgConfig.shops);
    if (mainCampaign.rpgConfig.shops) {
        console.log('🔍 [campaign-config] DIAGNOSTIC - shop IDs:', Object.keys(mainCampaign.rpgConfig.shops));
    }

    // Merge with existing campaign content if available
    console.log('🔍 [campaign-config] Starting merge process...');
    console.log('🔍 [campaign-config] window.MAIN_CAMPAIGN_CONTENT exists:', !!window.MAIN_CAMPAIGN_CONTENT);

    if (window.MAIN_CAMPAIGN_CONTENT) {
        console.log('🔍 [campaign-config] MAIN_CAMPAIGN_CONTENT has enemyTypes:', !!window.MAIN_CAMPAIGN_CONTENT.enemyTypes);

        // Use agents from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.agents) {
            mainCampaign.agents = window.MAIN_CAMPAIGN_CONTENT.agents;
            console.log('✅ [campaign-config] Merged agents:', mainCampaign.agents.length);
        }
        // DON'T merge weapons/equipment from campaign-content.js
        // They're deprecated (empty arrays) and would overwrite rpgConfig.items.weapons
        // Weapons are now defined in rpgConfig.items.weapons (lines 448-542)
        // Equipment is now defined in rpgConfig.items.armor/utility (lines 543+)
        console.log('✅ [campaign-config] Using weapons from rpgConfig.items.weapons');
        console.log('✅ [campaign-config] Using equipment from rpgConfig.items.armor/utility');
        // Use enemy types from campaign-content.js (stored as "enemies" for validation)
        if (window.MAIN_CAMPAIGN_CONTENT.enemyTypes) {
            mainCampaign.enemies = window.MAIN_CAMPAIGN_CONTENT.enemyTypes;
            console.log('✅ [campaign-config] Merged enemies:', mainCampaign.enemies.length);
        }

        // Missions are loaded separately from campaign files, add placeholder for validation
        if (!mainCampaign.missions) {
            mainCampaign.missions = [];
            console.log('✅ [campaign-config] Added placeholder missions array (loaded separately)');
        }
    } else {
        console.warn('⚠️ [campaign-config] MAIN_CAMPAIGN_CONTENT not available - merge skipped');
    }

    console.log('🔍 [campaign-config] After merge - mainCampaign has enemies:', !!mainCampaign.enemies);
    console.log('🔍 [campaign-config] After merge - mainCampaign has missions:', !!mainCampaign.missions);
    console.log('🔍 [campaign-config] After merge - mainCampaign has rpgConfig:', !!mainCampaign.rpgConfig);
    console.log('🔍 [campaign-config] After merge - mainCampaign keys:', Object.keys(mainCampaign));

    // Register campaign - FAIL FAST if CampaignSystem not available
    if (!window.CampaignSystem) {
        throw new Error('❌ CampaignSystem not available! Load campaign-system.js before campaign-config.js');
    }

    if (!window.CampaignSystem.registerCampaignConfig) {
        throw new Error('❌ CampaignSystem.registerCampaignConfig not available! Update campaign-system.js');
    }

    // Register using unified method (throws if fails)
    window.CampaignSystem.registerCampaignConfig('main', mainCampaign);
    console.log('✅ Main campaign config registered successfully');

    // Export for direct access if needed
    window.MAIN_CAMPAIGN_CONFIG = mainCampaign;
})();