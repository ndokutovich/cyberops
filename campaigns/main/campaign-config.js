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

            items: {
                weapons: {
                    // This will be populated from existing weapons
                },
                armor: {
                    // This will be populated from existing equipment
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

    // Merge with existing campaign content if available
    if (window.MAIN_CAMPAIGN_CONTENT) {
        // Use agents from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.agents) {
            mainCampaign.agents = window.MAIN_CAMPAIGN_CONTENT.agents;
        }
        // Use weapons from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.weapons) {
            mainCampaign.weapons = window.MAIN_CAMPAIGN_CONTENT.weapons;
        }
        // Use equipment from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.equipment) {
            mainCampaign.equipment = window.MAIN_CAMPAIGN_CONTENT.equipment;
        }
        // Use enemies from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.enemies) {
            mainCampaign.enemies = window.MAIN_CAMPAIGN_CONTENT.enemies;
        }
        // Use missions from campaign-content.js
        if (window.MAIN_CAMPAIGN_CONTENT.missions) {
            mainCampaign.missions = window.MAIN_CAMPAIGN_CONTENT.missions;
        }
    }

    // Register the campaign
    if (window.CampaignSystem) {
        // Store complete campaign config
        window.CampaignSystem.campaignConfigs = window.CampaignSystem.campaignConfigs || {};
        window.CampaignSystem.campaignConfigs['main'] = mainCampaign;

        console.log('📦 Main campaign configuration registered');
    }

    // Export for direct access if needed
    window.MAIN_CAMPAIGN_CONFIG = mainCampaign;
})();