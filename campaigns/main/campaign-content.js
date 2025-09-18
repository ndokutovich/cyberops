// Main Campaign Content Definition
// This file contains all game content (agents, weapons, equipment, enemies, research, intel)
// that was previously hardcoded in the engine files

(function() {
    const mainCampaignContent = {
        id: 'main',
        name: 'Corporate Domination',
        description: 'Take control of the city\'s corporate infrastructure',

        // Starting resources
        startingResources: {
            credits: 10000,
            researchPoints: 150,
            worldControl: 15
        },

        // Available agents for this campaign
        agents: [
            {
                id: 1,
                name: 'Alex "Shadow" Chen',
                specialization: 'stealth',
                skills: ['stealth', 'melee'],
                cost: 1000,
                hired: true,
                health: 90,
                speed: 5,
                damage: 18,
                bio: 'Former corporate spy turned rogue operative'
            },
            {
                id: 2,
                name: 'Maya "Code" Rodriguez',
                specialization: 'hacker',
                skills: ['hacker', 'electronics'],
                cost: 1200,
                hired: true,
                health: 70,
                speed: 4,
                damage: 12,
                bio: 'Elite netrunner with unmatched cyberwarfare skills'
            },
            {
                id: 3,
                name: 'Jake "Tank" Morrison',
                specialization: 'assault',
                skills: ['assault', 'heavy_weapons'],
                cost: 1100,
                hired: true,
                health: 140,
                speed: 3,
                damage: 25,
                bio: 'Ex-military enforcer with heavy weapons expertise'
            },
            {
                id: 4,
                name: 'Lisa "Ghost" Park',
                specialization: 'sniper',
                skills: ['sniper', 'stealth'],
                cost: 1300,
                hired: true,
                health: 85,
                speed: 4,
                damage: 35,
                bio: 'Precision marksman with a perfect kill record'
            },
            {
                id: 5,
                name: 'Rico "Boom" Santos',
                specialization: 'demolition',
                skills: ['demolition', 'assault'],
                cost: 1250,
                hired: false,
                health: 110,
                speed: 3,
                damage: 22,
                bio: 'Explosives expert who loves big booms'
            },
            {
                id: 6,
                name: 'Zoe "Wire" Kim',
                specialization: 'hacker',
                skills: ['hacker', 'drone_control'],
                cost: 1400,
                hired: false,
                health: 75,
                speed: 4,
                damage: 15,
                bio: 'Drone specialist with advanced tech skills'
            }
        ],

        // Weapons available in this campaign
        weapons: [
            {
                id: 1,
                name: 'Silenced Pistol',
                type: 'weapon',
                cost: 500,
                owned: 3,
                damage: 15,
                description: 'Quiet and effective for stealth operations'
            },
            {
                id: 2,
                name: 'Assault Rifle',
                type: 'weapon',
                cost: 800,
                owned: 1,
                damage: 25,
                description: 'Standard military-grade automatic weapon'
            },
            {
                id: 3,
                name: 'Sniper Rifle',
                type: 'weapon',
                cost: 1200,
                owned: 0,
                damage: 40,
                description: 'Long-range precision weapon'
            },
            {
                id: 4,
                name: 'SMG',
                type: 'weapon',
                cost: 600,
                owned: 2,
                damage: 20,
                description: 'Rapid-fire close combat weapon'
            }
        ],

        // Equipment available in this campaign
        equipment: [
            {
                id: 1,
                name: 'Body Armor',
                type: 'equipment',
                cost: 300,
                owned: 3,
                protection: 10,
                description: 'Reduces damage from enemy attacks'
            },
            {
                id: 2,
                name: 'Hacking Kit',
                type: 'equipment',
                cost: 400,
                owned: 2,
                hackBonus: 20,
                description: 'Speeds up terminal hacking'
            },
            {
                id: 3,
                name: 'Explosives Kit',
                type: 'equipment',
                cost: 600,
                owned: 1,
                damage: 50,
                description: 'Demolition charges for objectives'
            },
            {
                id: 4,
                name: 'Stealth Suit',
                type: 'equipment',
                cost: 800,
                owned: 1,
                stealthBonus: 25,
                description: 'Reduces enemy detection range'
            }
        ],

        // Enemy types for this campaign
        enemyTypes: [
            {
                type: 'guard',
                health: 50,
                speed: 2,
                damage: 10,
                visionRange: 5,
                color: '#ff6666',
                description: 'Basic security personnel'
            },
            {
                type: 'soldier',
                health: 75,
                speed: 2.5,
                damage: 15,
                visionRange: 6,
                color: '#ff8888',
                description: 'Trained military units'
            },
            {
                type: 'elite',
                health: 100,
                speed: 3,
                damage: 20,
                visionRange: 7,
                color: '#ffaaaa',
                description: 'Special forces operatives'
            },
            {
                type: 'heavy',
                health: 150,
                speed: 1.5,
                damage: 25,
                visionRange: 4,
                color: '#ff4444',
                description: 'Heavily armored units'
            },
            {
                type: 'sniper',
                health: 60,
                speed: 2,
                damage: 35,
                visionRange: 10,
                color: '#ff9999',
                description: 'Long-range specialists'
            },
            {
                type: 'commander',
                health: 120,
                speed: 2.5,
                damage: 22,
                visionRange: 8,
                color: '#ffcccc',
                description: 'Enemy leadership units'
            }
        ],

        // Research tree for this campaign
        researchTree: {
            tier1: [
                {
                    id: 'improved_armor',
                    name: 'Improved Armor',
                    cost: 50,
                    description: 'Increases all agents\' health by 10%',
                    effect: { type: 'health_boost', value: 0.1 }
                },
                {
                    id: 'enhanced_weapons',
                    name: 'Enhanced Weapons',
                    cost: 50,
                    description: 'Increases all agents\' damage by 10%',
                    effect: { type: 'damage_boost', value: 0.1 }
                },
                {
                    id: 'tactical_training',
                    name: 'Tactical Training',
                    cost: 75,
                    description: 'Increases movement speed by 15%',
                    effect: { type: 'speed_boost', value: 0.15 }
                }
            ],
            tier2: [
                {
                    id: 'plasma_weapons',
                    name: 'Plasma Weapons',
                    cost: 150,
                    requires: ['enhanced_weapons'],
                    description: 'Unlocks plasma-based weaponry',
                    effect: { type: 'unlock_weapons', weapons: ['plasma_rifle'] }
                },
                {
                    id: 'nano_armor',
                    name: 'Nano Armor',
                    cost: 150,
                    requires: ['improved_armor'],
                    description: 'Self-repairing armor technology',
                    effect: { type: 'regen', value: 2 }
                },
                {
                    id: 'neural_implants',
                    name: 'Neural Implants',
                    cost: 200,
                    requires: ['tactical_training'],
                    description: 'Enhanced reflexes and accuracy',
                    effect: { type: 'accuracy_boost', value: 0.25 }
                }
            ],
            tier3: [
                {
                    id: 'quantum_computing',
                    name: 'Quantum Computing',
                    cost: 300,
                    requires: ['neural_implants'],
                    description: 'Instant hacking capabilities',
                    effect: { type: 'instant_hack', value: true }
                },
                {
                    id: 'shield_generator',
                    name: 'Shield Generator',
                    cost: 350,
                    requires: ['nano_armor'],
                    description: 'Personal energy shields',
                    effect: { type: 'shield', value: 50 }
                },
                {
                    id: 'orbital_strike',
                    name: 'Orbital Strike',
                    cost: 500,
                    requires: ['plasma_weapons'],
                    description: 'Call in devastating orbital bombardment',
                    effect: { type: 'ability', ability: 'orbital_strike' }
                }
            ]
        },

        // Intel reports that unlock at collection thresholds
        intelReports: [
            {
                threshold: 1,
                id: 'first',
                title: 'ENEMY PATROL ROUTES',
                content: 'Guards follow predictable patterns. Use this to your advantage.',
                reward: { credits: 500 }
            },
            {
                threshold: 3,
                id: 'basic',
                title: 'SECURITY PROTOCOLS',
                content: 'Terminal hacking detected. Increased firewall protection on main servers.',
                reward: { researchPoints: 25 }
            },
            {
                threshold: 5,
                id: 'weapons',
                title: 'WEAPON SHIPMENTS',
                content: 'New military-grade weapons arriving. Expect heavier resistance.',
                reward: { credits: 1000 }
            },
            {
                threshold: 8,
                id: 'command',
                title: 'COMMAND STRUCTURE',
                content: 'Enemy leadership identified. High-value targets marked for elimination.',
                reward: { researchPoints: 50 }
            },
            {
                threshold: 10,
                id: 'fortress',
                title: 'FORTRESS BLUEPRINTS',
                content: 'Structural weaknesses found in enemy stronghold. Multiple entry points available.',
                reward: { credits: 2000, researchPoints: 75 }
            },
            {
                threshold: 15,
                id: 'master',
                title: 'MASTER PLAN',
                content: 'Enemy preparing major offensive. Strike first or face overwhelming force.',
                reward: { worldControl: 5 }
            },
            {
                threshold: 20,
                id: 'ultimate',
                title: 'PROJECT OMEGA',
                content: 'Top secret weapon system discovered. Must be destroyed at all costs.',
                reward: { credits: 5000, researchPoints: 200, worldControl: 10 }
            }
        ],

        // Campaign-specific abilities
        abilities: [
            {
                id: 'cloak',
                name: 'Cloaking Device',
                description: 'Become invisible for 5 seconds',
                cooldown: 30,
                duration: 5,
                researchRequired: null
            },
            {
                id: 'emp',
                name: 'EMP Blast',
                description: 'Disable all electronics in area',
                cooldown: 45,
                radius: 10,
                researchRequired: null
            },
            {
                id: 'drone_strike',
                name: 'Drone Strike',
                description: 'Call in autonomous attack drones',
                cooldown: 60,
                damage: 50,
                researchRequired: 'neural_implants'
            },
            {
                id: 'orbital_strike',
                name: 'Orbital Strike',
                description: 'Devastating bombardment from orbit',
                cooldown: 120,
                damage: 200,
                radius: 15,
                researchRequired: 'orbital_strike'
            }
        ],

        // Campaign progression milestones
        milestones: [
            {
                missionsCompleted: 3,
                reward: {
                    credits: 5000,
                    researchPoints: 100,
                    unlockAgent: 5 // Rico becomes available
                },
                message: 'Act 1 Complete: Rico "Boom" Santos is now available for hire!'
            },
            {
                missionsCompleted: 5,
                reward: {
                    credits: 10000,
                    researchPoints: 200,
                    unlockAgent: 6, // Zoe becomes available
                    worldControl: 10
                },
                message: 'Act 2 Complete: Zoe "Wire" Kim joins the cause!'
            },
            {
                worldControl: 50,
                reward: {
                    credits: 20000,
                    researchPoints: 500
                },
                message: 'Half the city is under your control!'
            },
            {
                worldControl: 100,
                reward: {
                    victory: true
                },
                message: 'Total domination achieved! The city is yours!'
            }
        ]
    };

    // Register with the campaign system
    if (typeof CampaignSystem !== 'undefined' && CampaignSystem.registerCampaignContent) {
        CampaignSystem.registerCampaignContent('main', mainCampaignContent);
    } else {
        // Fallback for direct loading
        window.MAIN_CAMPAIGN_CONTENT = mainCampaignContent;
    }
})();