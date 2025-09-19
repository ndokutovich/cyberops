/**
 * Fantasy Campaign Configuration
 * Example of a completely different setting using the same engine
 * This demonstrates the true flexibility of the engine
 */

(function() {
    const fantasyCampaign = {
        metadata: {
            id: "fantasy",
            name: "Realm of Shadows",
            version: "1.0.0",
            author: "Fantasy Mod Team",
            description: "A fantasy adventure in a world of magic and monsters",
            schemaVersion: "1.0.0"
        },

        // Fantasy RPG classes instead of cyberpunk
        rpgConfig: {
            classes: {
                warrior: {
                    name: "Warrior",
                    description: "Mighty fighter with sword and shield",
                    icon: "⚔️",
                    statBonuses: {
                        strength: 3,
                        endurance: 2,
                        agility: 0,
                        intelligence: -2,
                        tech: -2,  // Renamed to "magic" in UI
                        charisma: 0
                    },
                    skills: ["swordMastery", "shieldBash", "berserkerRage"],
                    startingEquipment: ["ironSword", "chainmail", "healingPotion"]
                },
                wizard: {
                    name: "Wizard",
                    description: "Master of arcane magic",
                    icon: "🧙",
                    statBonuses: {
                        strength: -2,
                        endurance: -1,
                        agility: 0,
                        intelligence: 4,
                        tech: 3,  // Magic power
                        charisma: 0
                    },
                    skills: ["fireball", "teleport", "manaShield"],
                    startingEquipment: ["staff", "robes", "spellbook"]
                },
                rogue: {
                    name: "Rogue",
                    description: "Stealthy assassin and thief",
                    icon: "🗡️",
                    statBonuses: {
                        strength: 0,
                        endurance: 0,
                        agility: 4,
                        intelligence: 1,
                        tech: 0,
                        charisma: 1
                    },
                    skills: ["stealth", "backstab", "poisonBlade"],
                    startingEquipment: ["dagger", "leatherArmor", "lockpicks"]
                }
            },

            stats: {
                primary: [
                    { id: "strength", name: "Strength", icon: "💪", description: "Physical power" },
                    { id: "agility", name: "Dexterity", icon: "🏃", description: "Speed and reflexes" },
                    { id: "intelligence", name: "Wisdom", icon: "🧠", description: "Magic and knowledge" },
                    { id: "endurance", name: "Constitution", icon: "🛡️", description: "Health and stamina" },
                    { id: "tech", name: "Magic", icon: "✨", description: "Magical power" },
                    { id: "charisma", name: "Charisma", icon: "💬", description: "Influence and leadership" }
                ]
            }
        },

        // Fantasy agents (party members)
        agents: [
            {
                id: "aldric",
                name: "Aldric the Bold",
                portrait: "warrior",
                health: 120,
                damage: 15,
                class: "warrior",
                hiringCost: 0,  // Starting character
                backstory: "A veteran knight seeking redemption"
            },
            {
                id: "elena",
                name: "Elena Starweaver",
                portrait: "wizard",
                health: 80,
                damage: 8,
                class: "wizard",
                hiringCost: 500,
                backstory: "Apprentice of the Archmage"
            },
            {
                id: "shadow",
                name: "Shadow",
                portrait: "rogue",
                health: 90,
                damage: 12,
                class: "rogue",
                hiringCost: 300,
                backstory: "A mysterious thief with a hidden past"
            }
        ],

        // Fantasy weapons
        weapons: [
            {
                id: "ironSword",
                name: "Iron Sword",
                damage: 10,
                range: 50,
                cost: 100,
                weight: 5
            },
            {
                id: "staff",
                name: "Mage Staff",
                damage: 5,
                range: 200,
                cost: 150,
                weight: 3,
                magical: true
            },
            {
                id: "bow",
                name: "Longbow",
                damage: 8,
                range: 300,
                cost: 200,
                weight: 4
            }
        ],

        // Fantasy armor
        equipment: [
            {
                id: "chainmail",
                name: "Chainmail",
                protection: 5,
                cost: 200,
                weight: 10
            },
            {
                id: "robes",
                name: "Mage Robes",
                protection: 2,
                cost: 150,
                weight: 2,
                magicBonus: 3
            },
            {
                id: "leatherArmor",
                name: "Leather Armor",
                protection: 3,
                cost: 100,
                weight: 5,
                stealthBonus: 2
            }
        ],

        // Fantasy enemies
        enemies: [
            {
                id: "goblin",
                name: "Goblin",
                health: 30,
                damage: 5,
                speed: 3,
                xpReward: 25,
                creditReward: 10,  // Gold in this setting
                color: "#00aa00"
            },
            {
                id: "orc",
                name: "Orc Warrior",
                health: 60,
                damage: 12,
                speed: 2,
                xpReward: 50,
                creditReward: 25,
                color: "#008800"
            },
            {
                id: "skeleton",
                name: "Skeleton",
                health: 40,
                damage: 8,
                speed: 2,
                xpReward: 35,
                creditReward: 0,  // No loot from undead
                color: "#ffffff"
            },
            {
                id: "dragon",
                name: "Dragon",
                health: 200,
                damage: 30,
                speed: 4,
                xpReward: 500,
                creditReward: 1000,
                color: "#ff0000",
                behavior: "boss"
            }
        ],

        // Fantasy economy
        economy: {
            startingCredits: 100,  // Gold pieces
            startingResearchPoints: 0,  // No research, use skill points instead
            sellValueMultiplier: 0.3,  // Medieval economy
            repairCostMultiplier: 0.2
        },

        // Fantasy combat
        combat: {
            formulaSet: "fantasy",
            damageVariance: 0.3,  // More random
            criticalMultiplier: 3.0,  // Higher crits
            dodgeBaseChance: 0.1,
            armorEffectiveness: 0.8,  // Armor less effective

            // Magic system
            magicDamageMultiplier: 1.5,
            magicResistance: 0.2,

            // Melee vs ranged
            meleeBonus: 1.2,
            rangedPenalty: 0.9
        },

        // Fantasy progression
        progression: {
            unlockSchedule: [
                { mission: 1, unlocks: ["bow", "leatherArmor"] },
                { mission: 3, unlocks: ["magicSword", "plateArmor"] },
                { mission: 5, unlocks: ["dragonScale", "legendaryWeapon"] }
            ],

            milestones: [
                { id: "dragonSlayer", name: "Dragon Slayer", description: "Defeat a dragon" },
                { id: "dungeonDelver", name: "Dungeon Delver", description: "Complete 10 dungeons" },
                { id: "treasureHunter", name: "Treasure Hunter", description: "Collect 10000 gold" }
            ]
        },

        // Fantasy audio
        audio: {
            tracks: {
                menu: "fantasy/tavern.mp3",
                hub: "fantasy/castle.mp3",
                combat: "fantasy/battle.mp3",
                stealth: "fantasy/dungeon.mp3",
                victory: "fantasy/fanfare.mp3",
                defeat: "fantasy/dirge.mp3"
            }
        },

        // Fantasy UI
        ui: {
            theme: "fantasy",
            primaryColor: "#8B4513",  // Brown
            secondaryColor: "#DAA520",  // Gold
            dangerColor: "#8B0000",  // Dark red
            successColor: "#228B22",  // Forest green

            strings: {
                en: {
                    menu: {
                        newGame: "NEW QUEST",
                        continue: "CONTINUE QUEST",
                        options: "SETTINGS",
                        credits: "TALE OF HEROES"
                    },
                    hub: {
                        arsenal: "ARMORY",
                        research: "SPELLBOOK",
                        missions: "QUESTS",
                        agents: "PARTY",
                        syndicate: "TAVERN"
                    },
                    combat: {
                        shoot: "ATTACK",
                        grenade: "SPELL",
                        hack: "ABILITY",
                        shield: "DEFEND"
                    },
                    messages: {
                        missionComplete: "QUEST COMPLETE!",
                        missionFailed: "QUEST FAILED",
                        agentDown: "{agent} HAS FALLEN!",
                        levelUp: "{agent} GAINED A LEVEL!"
                    }
                }
            }
        }
    };

    // Register the fantasy campaign
    if (window.CampaignSystem) {
        window.CampaignSystem.campaignConfigs = window.CampaignSystem.campaignConfigs || {};
        window.CampaignSystem.campaignConfigs['fantasy'] = fantasyCampaign;
        console.log('🧙 Fantasy campaign registered');
    }

    window.FANTASY_CAMPAIGN_CONFIG = fantasyCampaign;
})();