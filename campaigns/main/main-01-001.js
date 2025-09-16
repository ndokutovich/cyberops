// Campaign: Main
// Act: 01 - Corporate Takeover
// Mission: 001 - Data Heist

REGISTER_MISSION({
    // Mission identification
    campaign: 'main',
    act: '01',
    mission: '001',

    // Mission metadata
    name: 'Data Heist',
    title: 'Corporate Infiltration',
    description: 'Infiltrate SecureCorp and steal critical data while avoiding detection.',

    briefing: `
        MISSION BRIEFING:
        Intelligence suggests Nexus Corp is developing illegal surveillance tech.
        We need you to infiltrate their facility and download evidence from their mainframe.

        PRIMARY OBJECTIVES:
        - Access the secure server room
        - Download classified data
        - Extract without raising alarms

        OPTIONAL OBJECTIVES:
        - Minimize casualties
        - Gather additional intel
        - Complete within time limit
    `,

    // Story context
    story: {
        actProgress: 1, // First mission of the act
        previousMission: null,
        nextMission: 'main-01-002',

        cutscenes: {
            intro: 'The year is 2089. Mega-corporations rule the world...',
            outro: 'Data secured. But this is just the beginning...'
        }
    },

    // Agent configuration
    agents: {
        max: 4,
        required: 2,
        recommended: 3,

        startingGear: ['pistol', 'medkit'],

        availableAgents: [
            { id: 'ghost', name: 'Ghost', speciality: 'stealth' },
            { id: 'hack', name: 'Hack', speciality: 'hacking' },
            { id: 'tank', name: 'Tank', speciality: 'combat' },
            { id: 'medic', name: 'Medic', speciality: 'support' }
        ]
    },

    // Map configuration
    map: {
        type: 'corporate',
        width: 80,
        height: 80,

        environment: {
            timeOfDay: 'night',
            weather: 'rain',
            visibility: 'normal',
            ambientLight: 0.3
        },

        spawn: { x: 2, y: 78 },
        extraction: { x: 78, y: 2 },

        // Key locations
        keyLocations: [
            { name: 'Server Room', x: 40, y: 40, importance: 'critical' },
            { name: 'Security Office', x: 20, y: 20, importance: 'high' },
            { name: 'Executive Floor', x: 60, y: 60, importance: 'optional' }
        ],

        // Terminals
        terminals: [
            { x: 15, y: 15, id: 0, difficulty: 'easy', rewards: ['map_reveal'] },
            { x: 40, y: 40, id: 1, difficulty: 'hard', rewards: ['objective_data'] },
            { x: 50, y: 70, id: 2, difficulty: 'medium', rewards: ['credits:500'] }
        ],

        // Security elements
        security: {
            cameras: [
                { x: 10, y: 10, angle: 45, range: 10, sweeping: true },
                { x: 30, y: 30, angle: 180, range: 8, sweeping: false }
            ],
            lasers: [
                { x1: 20, y1: 25, x2: 25, y2: 25, pattern: 'pulse' }
            ],
            alarmTriggers: [
                { x: 35, y: 35, radius: 5, silent: false }
            ]
        }
    },

    // Mission objectives with detailed conditions
    objectives: [
        {
            id: 'reach_server',
            type: 'reach',
            target: { x: 40, y: 40 },
            required: true,
            description: 'Reach the server room',

            rewards: {
                immediate: { experience: 100 },
                completion: { credits: 500 }
            }
        },
        {
            id: 'hack_mainframe',
            type: 'interact',
            target: 'terminal:1',
            required: true,
            description: 'Download classified data',
            prerequisite: 'reach_server',

            timer: 30, // Seconds to complete once started

            rewards: {
                immediate: { experience: 200 },
                completion: { researchPoints: 1 }
            }
        },
        {
            id: 'stealth_bonus',
            type: 'custom',
            required: false,
            description: 'Complete without triggering alarms',
            checkFunction: 'checkNoAlarms',

            rewards: {
                completion: {
                    credits: 1500,
                    achievement: 'ghost_protocol'
                }
            }
        },
        {
            id: 'speed_run',
            type: 'custom',
            required: false,
            description: 'Complete within 5 minutes',
            checkFunction: 'checkTimeLimit',
            timeLimit: 300,

            rewards: {
                completion: {
                    credits: 1000,
                    achievement: 'speed_demon'
                }
            }
        }
    ],

    // Enemy configuration with behaviors
    enemies: {
        totalCount: 8,

        groups: [
            {
                type: 'patrol',
                units: [
                    { x: 30, y: 30, type: 'guard', weapon: 'pistol', route: 'patrol_1' },
                    { x: 50, y: 50, type: 'guard', weapon: 'pistol', route: 'patrol_2' }
                ]
            },
            {
                type: 'stationary',
                units: [
                    { x: 40, y: 35, type: 'elite', weapon: 'rifle', facing: 'north' },
                    { x: 40, y: 45, type: 'elite', weapon: 'rifle', facing: 'south' }
                ]
            },
            {
                type: 'response',
                units: [
                    { type: 'soldier', weapon: 'smg', count: 4, spawnOnAlarm: true }
                ]
            }
        ],

        patrols: {
            'patrol_1': [
                { x: 30, y: 30, wait: 2 },
                { x: 30, y: 50, wait: 1 },
                { x: 50, y: 50, wait: 2 },
                { x: 50, y: 30, wait: 1 }
            ],
            'patrol_2': [
                { x: 20, y: 60, wait: 3 },
                { x: 60, y: 60, wait: 3 },
                { x: 60, y: 20, wait: 3 },
                { x: 20, y: 20, wait: 3 }
            ]
        }
    },

    // NPCs with expanded dialog
    npcs: [
        {
            id: 'informant',
            name: 'Corporate Insider',
            x: 13,
            y: 13,
            type: 'informant',

            dialog: {
                initial: "Psst... You're the extraction team, right?",
                options: [
                    {
                        text: "Who's asking?",
                        response: "A friend. I have information that might help.",
                        unlocks: 'quest_info'
                    },
                    {
                        text: "We don't need help.",
                        response: "Your loss. The security here is tighter than you think."
                    }
                ],

                quest_info: {
                    text: "There's a backdoor to the server room, but you'll need a keycard.",
                    quest: 'find_keycard'
                }
            },

            quests: [
                {
                    id: 'find_keycard',
                    name: 'Alternative Route',
                    description: 'Find the security keycard for backdoor access',

                    objectives: [
                        { type: 'collect', target: 'keycard', count: 1 }
                    ],

                    rewards: {
                        credits: 750,
                        items: ['keycard_level2']
                    }
                }
            ]
        }
    ],

    // Mission-specific events
    events: [
        {
            id: 'alarm_triggered',
            trigger: 'alarm',
            effects: [
                'spawn_reinforcements',
                'lock_doors',
                'increase_enemy_alertness'
            ]
        },
        {
            id: 'data_downloaded',
            trigger: 'objective:hack_mainframe',
            effects: [
                'unlock_extraction',
                'spawn_boss_enemy',
                'start_countdown:120'
            ]
        }
    ],

    // Rewards for mission completion
    rewards: {
        base: {
            credits: 2000,
            researchPoints: 2,
            experience: 500
        },

        performance: {
            'S': { multiplier: 2.0, unlock: 'elite_gear' },
            'A': { multiplier: 1.5 },
            'B': { multiplier: 1.2 },
            'C': { multiplier: 1.0 }
        },

        unlocks: {
            nextMission: 'main-01-002',
            equipment: ['smg', 'armor_vest'],
            abilities: ['hack_speed_boost']
        }
    },

    // Mission settings
    settings: {
        difficulty: 2,
        timeLimit: 0, // 0 = no limit
        visibility: 'normal',
        allowSave: true,
        allowRetry: true,

        scoring: {
            stealth: 40,    // Weight for stealth play
            combat: 30,     // Weight for combat efficiency
            speed: 20,      // Weight for completion time
            objectives: 10  // Weight for optional objectives
        }
    }
});