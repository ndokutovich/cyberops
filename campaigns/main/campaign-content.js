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
        ],

        // Game configuration constants
        gameConfig: {
            demosceneIdleTimeout: 15000, // 15 seconds of idle time before demoscene
            musicMenuStartTime: 10.6, // When splash ends and menu music starts
            speedIndicatorFadeTime: 3000, // How long speed indicator shows
            defaultHackTime: 3000, // Default terminal hack time in ms
            defaultMissionRewards: {
                credits: 5000,
                researchPoints: 2,
                worldControl: 1
            }
        },

        // Agent generation system for post-mission hiring
        agentGeneration: {
            // New agents become available after mission completion
            agentsPerMission: 2,
            baseCost: 1000,
            costIncreasePerMission: 100,
            maxCostVariance: 500,

            // Name generation pools
            firstNames: ['Marcus', 'Elena', 'Viktor', 'Sophia', 'Dmitri', 'Aria', 'Kane', 'Nova', 'Rex', 'Luna',
                        'Zara', 'Jax', 'Iris', 'Orion', 'Echo', 'Nyx', 'Atlas', 'Sage', 'Raven', 'Kai'],
            lastNames: ['Stone', 'Black', 'Wolf', 'Steel', 'Cross', 'Hawk', 'Frost', 'Storm', 'Viper', 'Phoenix',
                       'Night', 'Blade', 'Shadow', 'Iron', 'Silver', 'Ghost', 'Drake', 'Hunter', 'Reeves', 'Chen'],
            callsigns: ['Reaper', 'Phantom', 'Striker', 'Wraith', 'Razor', 'Specter', 'Thunder', 'Shadow', 'Venom', 'Blade',
                       'Cipher', 'Nova', 'Eclipse', 'Nexus', 'Quantum', 'Omega', 'Vector', 'Matrix', 'Binary', 'Pulse'],

            // Specialization templates for generated agents
            specializations: [
                { type: 'stealth', skills: ['stealth', 'melee'], health: 85, speed: 5, damage: 20 },
                { type: 'hacker', skills: ['hacker', 'electronics'], health: 75, speed: 4, damage: 15 },
                { type: 'assault', skills: ['assault', 'heavy_weapons'], health: 130, speed: 3, damage: 28 },
                { type: 'sniper', skills: ['sniper', 'stealth'], health: 90, speed: 4, damage: 38 },
                { type: 'demolition', skills: ['demolition', 'assault'], health: 115, speed: 3, damage: 25 },
                { type: 'medic', skills: ['medic', 'support'], health: 100, speed: 4, damage: 18 }
            ]
        },

        // Death system - final words for fallen agents
        deathSystem: {
            finalWords: [
                "Tell my family... I died fighting...",
                "It was... an honor... serving with you...",
                "Don't let them... win...",
                "Keep fighting... for all of us...",
                "The mission... must continue...",
                "Remember me... when you win...",
                "I regret... nothing...",
                "This is... a good death...",
                "Avenge... me...",
                "The Syndicate... lives on...",
                "Complete... the objective...",
                "I can see... the code...",
                "This isn't... the end...",
                "Fight on... without me...",
                "Make it... count..."
            ]
        },

        // Skills and their effects
        skillDefinitions: {
            stealth: {
                name: 'Stealth',
                description: 'Reduced enemy detection range',
                effect: { detectionReduction: 0.5 }
            },
            melee: {
                name: 'Melee Combat',
                description: 'Increased close-range damage',
                effect: { meleeDamageBonus: 1.5 }
            },
            hacker: {
                name: 'Hacking',
                description: 'Faster terminal hacking',
                effect: { hackSpeedBonus: 0.5 }
            },
            electronics: {
                name: 'Electronics',
                description: 'Disable enemy equipment',
                effect: { disableChance: 0.3 }
            },
            assault: {
                name: 'Assault Training',
                description: 'Increased fire rate',
                effect: { fireRateBonus: 1.3 }
            },
            heavy_weapons: {
                name: 'Heavy Weapons',
                description: 'Can use heavy weaponry',
                effect: { canUseHeavyWeapons: true }
            },
            sniper: {
                name: 'Sniper Training',
                description: 'Increased range and accuracy',
                effect: { rangeBonus: 2.0, accuracyBonus: 0.9 }
            },
            demolition: {
                name: 'Demolition Expert',
                description: 'Explosive damage and radius',
                effect: { explosiveDamageBonus: 1.5, explosiveRadiusBonus: 1.3 }
            },
            medic: {
                name: 'Field Medic',
                description: 'Heal squad members',
                effect: { healAmount: 30, healCooldown: 20 }
            },
            support: {
                name: 'Support Specialist',
                description: 'Buff nearby allies',
                effect: { allyDamageBonus: 0.2, allyDefenseBonus: 0.2 }
            },
            drone_control: {
                name: 'Drone Control',
                description: 'Deploy and control drones',
                effect: { maxDrones: 2, droneHealth: 50 }
            }
        },

        // UI Text and Labels
        uiText: {
            // Game title and branding
            gameTitle: 'CyberOps: Syndicate',
            campaignName: 'Corporate Domination',
            organizationName: 'The Syndicate',

            // Screen titles
            hallOfGloryTitle: '⚰️ HALL OF GLORY',
            mainMenuTitle: 'MAIN MENU',
            syndicateHubTitle: 'SYNDICATE HUB',

            // Mission status
            missionComplete: 'MISSION COMPLETE',
            missionFailed: 'MISSION FAILED',
            missionAccomplished: 'MISSION ACCOMPLISHED',
            extractionEnabled: 'EXTRACTION ENABLED',

            // Combat messages
            enemyEliminated: 'Enemy eliminated',
            agentDown: 'Agent down!',
            objectiveComplete: 'Objective complete',
            terminalHacked: 'Terminal hacked',
            doorUnlocked: 'Door unlocked',
            itemCollected: 'Item collected',

            // Hub messages
            agentHired: 'Agent hired',
            weaponPurchased: 'Weapon purchased',
            equipmentPurchased: 'Equipment purchased',
            researchComplete: 'Research complete',

            // Button labels
            continueButton: 'Continue',
            retryButton: 'Try Again',
            backButton: 'Back',
            deployButton: 'Deploy',
            hireButton: 'Hire',
            purchaseButton: 'Purchase',
            researchButton: 'Research',
            saveButton: 'Save',
            loadButton: 'Load',
            quitButton: 'Quit'
        },

        // Gameplay Constants
        gameplayConstants: {
            // Tile dimensions
            tileWidth: 64,
            tileHeight: 32,

            // Vision and detection
            defaultVisionCone: 45, // degrees
            defaultAlertRadius: 10,
            defaultPatrolSpeed: 2,
            stealthDetectionMultiplier: 0.5,

            // Combat
            defaultProjectileSpeed: 15,
            defaultReloadTime: 1000, // ms
            criticalHitChance: 0.1,
            criticalHitDamage: 2.0,

            // Hacking
            defaultHackTime: 3000, // ms
            hackingSkillBonus: 0.5, // 50% faster

            // Movement
            defaultMoveSpeed: 4,
            runSpeedMultiplier: 1.5,
            crouchSpeedMultiplier: 0.5,

            // Health and damage
            healthPackHeal: 25,
            armorDamageReduction: 0.3,
            coverDamageReduction: 0.5,

            // Economy
            missionBaseReward: 5000,
            killReward: 100,
            objectiveBonus: 1000,
            stealthBonus: 500,

            // Limits
            maxSquadSize: 6,
            maxInventorySize: 20,
            maxPathfindingIterations: 2000,

            // Timers
            alertDecayTime: 10000, // ms
            corpseCleanupTime: 30000, // ms
            effectDuration: 5000 // ms
        },

        // Map type configurations
        mapTypes: {
            corporate: {
                name: 'Corporate',
                tileSet: 'corporate',
                ambientLight: '#001133',
                fogColor: '#000022',
                musicTrack: 'corporate_ambient'
            },
            industrial: {
                name: 'Industrial',
                tileSet: 'industrial',
                ambientLight: '#110011',
                fogColor: '#220011',
                musicTrack: 'industrial_ambient'
            },
            government: {
                name: 'Government',
                tileSet: 'government',
                ambientLight: '#003311',
                fogColor: '#002211',
                musicTrack: 'government_ambient'
            },
            underground: {
                name: 'Underground',
                tileSet: 'underground',
                ambientLight: '#110000',
                fogColor: '#220000',
                musicTrack: 'underground_ambient'
            },
            fortress: {
                name: 'Fortress',
                tileSet: 'fortress',
                ambientLight: '#000033',
                fogColor: '#000044',
                musicTrack: 'fortress_ambient'
            }
        }
    };

    // Register with the campaign system
    if (typeof CampaignSystem !== 'undefined' && CampaignSystem.registerCampaignContent) {
        CampaignSystem.registerCampaignContent('main', mainCampaignContent);
    }

    // Also set as global for fallback access
    window.MAIN_CAMPAIGN_CONTENT = mainCampaignContent;
})();