/**
 * Comprehensive RPG System Configuration
 * Declarative configuration for stats, skills, perks, classes, items, and progression
 */

const RPG_CONFIG = {
    // Core character statistics
    stats: {
        primary: {
            strength: {
                name: "Strength",
                abbr: "STR",
                description: "Physical power and melee damage",
                baseValue: 10,
                maxValue: 100,
                affects: ["meleeDamage", "carryCapacity", "health"],
                formula: (str) => ({
                    meleeDamage: Math.floor(str * 1.5),
                    carryCapacity: 50 + (str * 5),
                    healthBonus: str * 2
                })
            },
            agility: {
                name: "Agility",
                abbr: "AGI",
                description: "Speed, dodge chance, and initiative",
                baseValue: 10,
                maxValue: 100,
                affects: ["speed", "dodgeChance", "initiative", "ap"],
                formula: (agi) => ({
                    speed: 2 + (agi * 0.05),
                    dodgeChance: agi * 0.5,
                    initiative: 10 + (agi * 0.3),
                    apBonus: Math.floor(agi / 10)
                })
            },
            intelligence: {
                name: "Intelligence",
                abbr: "INT",
                description: "Hacking, tech use, and skill points",
                baseValue: 10,
                maxValue: 100,
                affects: ["hackSpeed", "techDamage", "skillPoints", "xpGain"],
                formula: (int) => ({
                    hackSpeed: 1 + (int * 0.02),
                    techDamage: int * 1.2,
                    skillPointsPerLevel: 1 + Math.floor(int / 20),
                    xpMultiplier: 1 + (int * 0.01)
                })
            },
            perception: {
                name: "Perception",
                abbr: "PER",
                description: "Accuracy, critical chance, and detection",
                baseValue: 10,
                maxValue: 100,
                affects: ["accuracy", "critChance", "sightRange", "detectTraps"],
                formula: (per) => ({
                    accuracy: 70 + per,
                    critChance: 5 + (per * 0.3),
                    sightRange: 5 + Math.floor(per / 10),
                    trapDetection: per * 1.5
                })
            },
            endurance: {
                name: "Endurance",
                abbr: "END",
                description: "Health, stamina, and resistances",
                baseValue: 10,
                maxValue: 100,
                affects: ["maxHealth", "stamina", "resistance"],
                formula: (end) => ({
                    maxHealth: 50 + (end * 5),
                    stamina: 100 + (end * 2),
                    damageResistance: end * 0.3
                })
            },
            charisma: {
                name: "Charisma",
                abbr: "CHA",
                description: "Leadership, trading, and squad bonuses",
                baseValue: 10,
                maxValue: 100,
                affects: ["shopPrices", "squadMorale", "recruitCost"],
                formula: (cha) => ({
                    priceModifier: 1 - (cha * 0.005),
                    moraleBonus: cha * 0.5,
                    recruitDiscount: cha * 2
                })
            },
            tech: {
                name: "Tech",
                abbr: "TEC",
                description: "Cybernetic compatibility and tech weapon damage",
                baseValue: 10,
                maxValue: 100,
                affects: ["cyberCapacity", "energyWeaponDamage", "shieldEfficiency"],
                formula: (tec) => ({
                    cyberSlots: 2 + Math.floor(tec / 15),
                    energyDamageBonus: tec * 1.3,
                    shieldRegenRate: 1 + (tec * 0.02)
                })
            }
        },

        derived: {
            maxHealth: {
                name: "Max Health",
                formula: (stats) => stats.endurance.value * 5 + stats.strength.value * 2 + 50
            },
            maxAP: {
                name: "Action Points",
                formula: (stats) => 10 + Math.floor(stats.agility.value / 10) + Math.floor(stats.endurance.value / 20)
            },
            initiative: {
                name: "Initiative",
                formula: (stats) => 10 + stats.agility.value * 0.3 + stats.perception.value * 0.1
            },
            carryWeight: {
                name: "Carry Weight",
                formula: (stats) => 50 + stats.strength.value * 5
            },
            hackingPower: {
                name: "Hacking Power",
                formula: (stats) => stats.intelligence.value * 1.5 + stats.tech.value * 0.5
            }
        }
    },

    // Character classes with stat bonuses and starting perks
    classes: {
        infiltrator: {
            name: "Infiltrator",
            description: "Stealth specialist with hacking skills",
            icon: "👤",
            statBonuses: { agility: 5, intelligence: 3, perception: 2 },
            startingPerks: ["ghost", "quickHack"],
            startingSkills: ["stealth", "hacking"],
            levelBonuses: {
                2: { stats: { agility: 1 }, newPerk: "shadowStep" },
                5: { stats: { intelligence: 2 }, newSkill: "advancedHacking" },
                10: { stats: { agility: 2, perception: 1 }, newPerk: "invisibility" }
            }
        },
        assault: {
            name: "Assault",
            description: "Heavy weapons and combat specialist",
            icon: "💥",
            statBonuses: { strength: 5, endurance: 5 },
            startingPerks: ["toughness", "rapidFire"],
            startingSkills: ["heavyWeapons", "explosives"],
            levelBonuses: {
                2: { stats: { strength: 1 }, newPerk: "armorPiercing" },
                5: { stats: { endurance: 2 }, newSkill: "demolition" },
                10: { stats: { strength: 3 }, newPerk: "juggernaut" }
            }
        },
        technician: {
            name: "Technician",
            description: "Technology and support specialist",
            icon: "🔧",
            statBonuses: { intelligence: 5, tech: 5 },
            startingPerks: ["engineer", "energyWeapons"],
            startingSkills: ["robotics", "medic"],
            levelBonuses: {
                2: { stats: { tech: 1 }, newPerk: "overcharge" },
                5: { stats: { intelligence: 2 }, newSkill: "droneControl" },
                10: { stats: { tech: 3 }, newPerk: "technopath" }
            }
        },
        operative: {
            name: "Operative",
            description: "Balanced fighter with leadership skills",
            icon: "🎯",
            statBonuses: { perception: 3, charisma: 3, agility: 2, strength: 2 },
            startingPerks: ["tactician", "inspiring"],
            startingSkills: ["leadership", "marksmanship"],
            levelBonuses: {
                2: { stats: { charisma: 1 }, newPerk: "rallyingCry" },
                5: { stats: { perception: 2 }, newSkill: "coordination" },
                10: { stats: { all: 1 }, newPerk: "commander" }
            }
        }
    },

    // Skills that can be learned and upgraded
    skills: {
        // Combat skills
        marksmanship: {
            name: "Marksmanship",
            maxLevel: 5,
            requirements: { perception: 15 },
            effects: (level) => ({
                accuracy: level * 5,
                critChance: level * 2,
                headshotDamage: 1 + (level * 0.2)
            }),
            cost: (level) => level * 2
        },
        heavyWeapons: {
            name: "Heavy Weapons",
            maxLevel: 5,
            requirements: { strength: 20 },
            effects: (level) => ({
                heavyWeaponDamage: 1 + (level * 0.15),
                recoilReduction: level * 10,
                explosiveRadius: level * 0.5
            }),
            cost: (level) => level * 2
        },

        // Tech skills
        hacking: {
            name: "Hacking",
            maxLevel: 5,
            requirements: { intelligence: 15 },
            effects: (level) => ({
                hackSpeed: 1 + (level * 0.2),
                bypassChance: level * 10,
                dataStealBonus: level * 20
            }),
            cost: (level) => level * 2
        },
        robotics: {
            name: "Robotics",
            maxLevel: 5,
            requirements: { tech: 15, intelligence: 10 },
            effects: (level) => ({
                droneDamage: 1 + (level * 0.2),
                droneHealth: 1 + (level * 0.3),
                turretHackChance: level * 15
            }),
            cost: (level) => level * 3
        },

        // Stealth skills
        stealth: {
            name: "Stealth",
            maxLevel: 5,
            requirements: { agility: 15 },
            effects: (level) => ({
                detectionRadius: 1 - (level * 0.1),
                sneakSpeed: 0.5 + (level * 0.1),
                backstabDamage: 1 + (level * 0.3)
            }),
            cost: (level) => level * 2
        },

        // Support skills
        medic: {
            name: "Medic",
            maxLevel: 5,
            requirements: { intelligence: 10 },
            effects: (level) => ({
                healAmount: 20 + (level * 10),
                reviveChance: 20 + (level * 15),
                healSpeed: 1 + (level * 0.2)
            }),
            cost: (level) => level * 2
        },
        leadership: {
            name: "Leadership",
            maxLevel: 5,
            requirements: { charisma: 20 },
            effects: (level) => ({
                squadAccuracy: level * 3,
                squadMorale: level * 5,
                squadAPBonus: Math.floor(level / 2)
            }),
            cost: (level) => level * 3
        }
    },

    // Perks - special abilities unlocked through leveling
    perks: {
        // Stealth perks
        ghost: {
            name: "Ghost",
            description: "25% harder to detect",
            requirements: { level: 1, agility: 15 },
            effects: { detectionModifier: 0.75 }
        },
        shadowStep: {
            name: "Shadow Step",
            description: "First move each turn costs 1 less AP",
            requirements: { level: 3, agility: 20 },
            effects: { firstMoveAPReduction: 1 }
        },
        invisibility: {
            name: "Invisibility",
            description: "Can become invisible for 2 turns (once per mission)",
            requirements: { level: 10, agility: 40 },
            cooldown: "mission",
            effects: { invisible: true, duration: 2 }
        },

        // Combat perks
        toughness: {
            name: "Toughness",
            description: "+20% health",
            requirements: { level: 1, endurance: 15 },
            effects: { healthMultiplier: 1.2 }
        },
        rapidFire: {
            name: "Rapid Fire",
            description: "Can shoot twice if not moving",
            requirements: { level: 3, perception: 20 },
            effects: { doubleShot: true }
        },
        armorPiercing: {
            name: "Armor Piercing",
            description: "Ignore 50% of enemy armor",
            requirements: { level: 5, strength: 25 },
            effects: { armorPenetration: 0.5 }
        },
        juggernaut: {
            name: "Juggernaut",
            description: "Immune to knockback, +30% damage resistance",
            requirements: { level: 10, endurance: 40, strength: 40 },
            effects: { knockbackImmune: true, damageResistance: 0.3 }
        },

        // Tech perks
        engineer: {
            name: "Engineer",
            description: "Can deploy turrets",
            requirements: { level: 1, tech: 15 },
            effects: { canDeployTurrets: true }
        },
        overcharge: {
            name: "Overcharge",
            description: "Energy weapons deal +30% damage",
            requirements: { level: 3, tech: 20 },
            effects: { energyWeaponBonus: 1.3 }
        },
        technopath: {
            name: "Technopath",
            description: "Can control enemy robots",
            requirements: { level: 10, tech: 40, intelligence: 30 },
            effects: { robotControl: true }
        },

        // Leadership perks
        tactician: {
            name: "Tactician",
            description: "Squad gets +2 initiative",
            requirements: { level: 1, charisma: 15 },
            effects: { squadInitiativeBonus: 2 }
        },
        inspiring: {
            name: "Inspiring",
            description: "Squad gets +10% damage when near",
            requirements: { level: 3, charisma: 20 },
            effects: { squadDamageBonus: 0.1, range: 5 }
        },
        rallyingCry: {
            name: "Rallying Cry",
            description: "Can restore 3 AP to all allies (once per combat)",
            requirements: { level: 5, charisma: 30 },
            cooldown: "combat",
            ability: { type: "active", apRestore: 3, aoe: true }
        },
        commander: {
            name: "Commander",
            description: "All squad bonuses doubled",
            requirements: { level: 10, charisma: 40 },
            effects: { squadBonusMultiplier: 2 }
        }
    },

    // Experience and leveling system
    progression: {
        xpFormula: (level) => 100 * Math.pow(level, 1.5),
        maxLevel: 20,
        statPointsPerLevel: 3,
        skillPointsPerLevel: 2,
        perkPointsEvery: 2, // Get a perk point every 2 levels

        levelRewards: {
            5: { type: "ability", id: "specialAbility1" },
            10: { type: "ability", id: "specialAbility2" },
            15: { type: "passive", id: "masterBonus" },
            20: { type: "ultimate", id: "ultimateAbility" }
        },

        xpSources: {
            enemyKill: (enemyLevel, playerLevel) => 50 * (1 + (enemyLevel - playerLevel) * 0.1),
            questComplete: (questLevel) => 200 * questLevel,
            objectiveComplete: 100,
            hackSuccess: 25,
            firstTimeBonus: 500
        }
    },

    // Item system with stats and effects
    items: {
        // Weapon types
        weapons: {
            pistol: {
                name: "Pistol",
                type: "ranged",
                slot: "primary",
                baseStats: {
                    damage: 10,
                    range: 8,
                    apCost: 3,
                    accuracy: 85,
                    critChance: 10
                },
                requirements: { strength: 5 },
                modSlots: 2,
                sfx: "pistol_fire",
                vfx: "muzzleFlash_small"
            },
            assaultRifle: {
                name: "Assault Rifle",
                type: "ranged",
                slot: "primary",
                baseStats: {
                    damage: 15,
                    range: 12,
                    apCost: 4,
                    accuracy: 75,
                    burstFire: 3
                },
                requirements: { strength: 15, level: 3 },
                modSlots: 3,
                sfx: "rifle_burst",
                vfx: "muzzleFlash_medium",
                screenShake: { intensity: 2, duration: 100 }
            },
            plasmaCannon: {
                name: "Plasma Cannon",
                type: "energy",
                slot: "heavy",
                baseStats: {
                    damage: 40,
                    range: 15,
                    apCost: 6,
                    accuracy: 70,
                    aoeRadius: 2
                },
                requirements: { tech: 25, strength: 20, level: 8 },
                modSlots: 2,
                sfx: "plasma_charge",
                vfx: "plasmaBlast",
                screenShake: { intensity: 5, duration: 300 }
            },
            monoKatana: {
                name: "Monomolecular Katana",
                type: "melee",
                slot: "secondary",
                baseStats: {
                    damage: 25,
                    range: 1,
                    apCost: 3,
                    armorPiercing: 0.8,
                    bleedChance: 30
                },
                requirements: { agility: 20, strength: 15 },
                modSlots: 1,
                sfx: "blade_swing",
                vfx: "slashTrail"
            }
        },

        // Armor types
        armor: {
            kevlarVest: {
                name: "Kevlar Vest",
                slot: "body",
                baseStats: {
                    defense: 10,
                    damageReduction: 5,
                    speedPenalty: 0
                },
                requirements: { strength: 10 },
                modSlots: 2
            },
            powerArmor: {
                name: "Power Armor",
                slot: "body",
                baseStats: {
                    defense: 30,
                    damageReduction: 15,
                    strengthBonus: 10,
                    speedPenalty: -2
                },
                requirements: { strength: 30, tech: 20, level: 10 },
                modSlots: 4,
                sfx: "servo_move",
                vfx: "powerField"
            }
        },

        // Cybernetics
        cybernetics: {
            neuralInterface: {
                name: "Neural Interface",
                slot: "brain",
                baseStats: {
                    intelligenceBonus: 5,
                    hackingSpeed: 1.3,
                    reactionTime: 0.9
                },
                requirements: { tech: 20, intelligence: 25 },
                cyberCost: 2,
                installSfx: "cyber_install",
                activeSfx: "neural_pulse"
            },
            reflexBooster: {
                name: "Reflex Booster",
                slot: "spine",
                baseStats: {
                    agilityBonus: 8,
                    initiativeBonus: 5,
                    dodgeChance: 10
                },
                requirements: { tech: 15, agility: 20 },
                cyberCost: 2,
                vfx: "speedLines"
            }
        },

        // Consumables
        consumables: {
            medkit: {
                name: "Medkit",
                type: "healing",
                stackSize: 5,
                effect: { heal: 50, removeBleed: true },
                useTime: 1,
                sfx: "medkit_use",
                vfx: "healingGlow"
            },
            stimpack: {
                name: "Combat Stim",
                type: "buff",
                stackSize: 3,
                effect: {
                    apBonus: 4,
                    damageBonus: 1.5,
                    duration: 3,
                    crashPenalty: { ap: -2, duration: 2 }
                },
                useTime: 0,
                sfx: "stim_inject",
                vfx: "stimRush",
                screenShake: { intensity: 1, duration: 50 }
            },
            empGrenade: {
                name: "EMP Grenade",
                type: "tactical",
                stackSize: 3,
                effect: {
                    damage: 0,
                    empDuration: 2,
                    radius: 4,
                    disableElectronics: true
                },
                throwRange: 10,
                sfx: "emp_detonate",
                vfx: "empPulse",
                screenShake: { intensity: 3, duration: 200 }
            }
        },

        // Modifications for weapons/armor
        mods: {
            scope: {
                name: "Advanced Scope",
                type: "weapon",
                validSlots: ["sight"],
                stats: { accuracy: 15, range: 3, critChance: 5 },
                requirements: { level: 3 }
            },
            extendedMag: {
                name: "Extended Magazine",
                type: "weapon",
                validSlots: ["magazine"],
                stats: { burstFire: 2, reloadSpeed: 0.8 },
                requirements: { level: 2 }
            },
            shieldGenerator: {
                name: "Shield Generator",
                type: "armor",
                validSlots: ["utility"],
                stats: { shieldPoints: 25, shieldRegen: 2 },
                requirements: { tech: 15, level: 5 },
                vfx: "shieldBubble"
            }
        }
    },

    // Shop and economy system
    economy: {
        shops: {
            generalStore: {
                name: "Supply Depot",
                inventory: ["pistol", "kevlarVest", "medkit"],
                priceMultiplier: 1.0,
                refreshRate: "mission",
                reputation: 0
            },
            blackMarket: {
                name: "Black Market",
                inventory: ["assaultRifle", "empGrenade", "stimpack"],
                priceMultiplier: 1.5,
                refreshRate: "mission",
                reputation: 20,
                special: true
            },
            techShop: {
                name: "Tech Workshop",
                inventory: ["plasmaCannon", "neuralInterface", "shieldGenerator"],
                priceMultiplier: 1.2,
                refreshRate: "weekly",
                reputation: 40,
                requirements: { intelligence: 20 }
            }
        },

        pricing: {
            buyMultiplier: (charisma, reputation) => 1 - (charisma * 0.005 + reputation * 0.001),
            sellMultiplier: (charisma, reputation) => 0.5 + (charisma * 0.003 + reputation * 0.0005),

            baseValues: {
                common: 100,
                uncommon: 500,
                rare: 2000,
                legendary: 10000,
                unique: 50000
            }
        }
    },

    // Enhanced quest system
    questSystem: {
        questTypes: {
            main: {
                name: "Main Quest",
                xpMultiplier: 2,
                canAbandon: false,
                affectsStory: true
            },
            side: {
                name: "Side Quest",
                xpMultiplier: 1,
                canAbandon: true,
                affectsReputation: true
            },
            faction: {
                name: "Faction Quest",
                xpMultiplier: 1.5,
                canAbandon: true,
                affectsFaction: true
            },
            random: {
                name: "Contract",
                xpMultiplier: 0.8,
                canAbandon: true,
                repeatable: true
            }
        },

        objectives: {
            kill: {
                verify: (target, count) => target.eliminated >= count,
                track: "eliminated"
            },
            collect: {
                verify: (item, count) => item.collected >= count,
                track: "collected"
            },
            hack: {
                verify: (terminal) => terminal.hacked === true,
                track: "hacked"
            },
            escort: {
                verify: (npc) => npc.alive && npc.atDestination,
                track: "escorted"
            },
            survive: {
                verify: (time) => time.elapsed >= time.required,
                track: "survived"
            },
            choice: {
                verify: (choice) => choice.made !== null,
                track: "chosen",
                branching: true
            }
        },

        rewards: {
            xp: (level, type) => RPG_CONFIG.progression.xpSources.questComplete(level) * type.xpMultiplier,
            credits: (level) => 500 * level + Math.random() * 200,
            items: (level) => {
                const pool = Object.keys(RPG_CONFIG.items.weapons)
                    .filter(w => (RPG_CONFIG.items.weapons[w].requirements?.level || 1) <= level);
                return pool[Math.floor(Math.random() * pool.length)];
            },
            reputation: (faction, amount) => ({ [faction]: amount }),
            statPoints: (amount) => ({ statPoints: amount }),
            perk: (perkId) => ({ newPerk: perkId })
        }
    },

    // VFX/SFX triggers
    effects: {
        vfx: {
            muzzleFlash_small: {
                sprite: "flash_small",
                duration: 100,
                scale: 0.5,
                rotation: "random"
            },
            muzzleFlash_medium: {
                sprite: "flash_medium",
                duration: 150,
                scale: 0.8,
                rotation: "random"
            },
            plasmaBlast: {
                sprite: "plasma_explosion",
                duration: 400,
                scale: 1.5,
                particles: true,
                color: "#00ff00"
            },
            healingGlow: {
                sprite: "heal_aura",
                duration: 1000,
                scale: 1.0,
                fade: true,
                color: "#00ff00"
            },
            shieldBubble: {
                sprite: "shield_dome",
                duration: "persistent",
                scale: 1.2,
                opacity: 0.5,
                color: "#00ffff"
            },
            empPulse: {
                sprite: "emp_wave",
                duration: 500,
                scale: 3.0,
                expandSpeed: 0.1,
                color: "#0000ff"
            }
        },

        sfx: {
            pistol_fire: { file: "pistol.wav", volume: 0.6 },
            rifle_burst: { file: "rifle_burst.wav", volume: 0.7 },
            plasma_charge: { file: "plasma.wav", volume: 0.8 },
            blade_swing: { file: "sword.wav", volume: 0.5 },
            medkit_use: { file: "heal.wav", volume: 0.4 },
            stim_inject: { file: "inject.wav", volume: 0.3 },
            emp_detonate: { file: "emp.wav", volume: 0.9 },
            level_up: { file: "levelup.wav", volume: 1.0 },
            skill_unlock: { file: "skill.wav", volume: 0.7 }
        },

        screenShake: {
            light: { intensity: 1, duration: 50 },
            medium: { intensity: 3, duration: 150 },
            heavy: { intensity: 5, duration: 300 },
            extreme: { intensity: 10, duration: 500 }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RPG_CONFIG;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
    window.RPG_CONFIG = RPG_CONFIG;
}