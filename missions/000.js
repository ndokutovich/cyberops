// Mission 000: Corporate Infiltration
// First mission in the sequence

REGISTER_MISSION({
    // Mission metadata
    id: '000',
    name: 'Corporate Infiltration',
    title: 'Data Heist',
    description: 'Infiltrate SecureCorp and steal critical data while avoiding detection.',
    briefing: 'Intelligence suggests Nexus Corp is developing illegal surveillance tech. We need you to infiltrate their facility and download evidence from their mainframe.',

    // Agent configuration
    agents: {
        max: 4,           // Maximum agents for this mission
        required: 2,      // Minimum agents required
        startingGear: [   // Optional starting equipment
            'pistol',
            'medkit'
        ]
    },

    // Map configuration
    map: {
        type: 'corporate',
        width: 80,
        height: 80,
        spawn: { x: 2, y: 78 },
        extraction: { x: 78, y: 2 },

        // Terminals
        terminals: [
            { x: 15, y: 15, hacked: false, id: 0 },
            { x: 40, y: 40, hacked: false, id: 1 },
            { x: 50, y: 70, hacked: false, id: 2 }
        ],

        // Doors
        doors: [
            { x: 20, y: 10, locked: true, linkedTerminal: 0 },
            { x: 40, y: 10, locked: true, linkedTerminal: 1 },
            { x: 60, y: 10, locked: true, linkedTerminal: 2 }
        ],

        // Custom tile overrides (optional)
        tileOverrides: []
    },

    // Mission objectives
    objectives: [
        {
            id: 'eliminate_hostiles',
            type: 'eliminate',
            target: 'all',
            count: 8,
            required: true,
            description: 'Eliminate all hostiles'
        },
        {
            id: 'hack_terminals',
            type: 'interact',
            target: 'terminal',
            count: 3,
            required: false,
            description: 'Hack 3 terminals for bonus intel',
            rewards: {
                credits: 500,
                researchPoints: 1
            }
        },
        {
            id: 'no_alarms',
            type: 'custom',
            required: false,
            description: 'Complete without triggering alarms',
            checkFunction: 'checkNoAlarms',
            rewards: {
                credits: 1000
            }
        }
    ],

    // Enemy configuration
    enemies: {
        count: 8,
        types: ['guard', 'soldier'],
        spawns: [
            { x: 30, y: 30, type: 'guard' },
            { x: 50, y: 50, type: 'soldier' },
            { x: 20, y: 60, type: 'guard' },
            { x: 60, y: 20, type: 'guard' },
            { x: 40, y: 40, type: 'soldier' },
            { x: 25, y: 25, type: 'guard' },
            { x: 55, y: 55, type: 'soldier' },
            { x: 35, y: 65, type: 'guard' }
        ],
        reinforcements: {
            trigger: 'alarm',
            count: 5,
            delay: 30
        }
    },

    // NPCs
    npcs: [
        {
            id: 'informant',
            name: 'Data Broker',
            x: 13,
            y: 13,
            type: 'civilian',
            dialog: [
                { text: "I can help you bypass security...", options: ["Tell me more", "Not interested"] },
                { text: "For 500 credits, I'll disable one camera system.", options: ["Deal", "Too expensive"] }
            ],
            quests: []
        }
    ],

    // Rewards
    rewards: {
        credits: 2000,
        researchPoints: 2,
        experience: 500,
        unlocks: ['mission_001'] // Next mission(s) to unlock
    },

    // Mission specific settings
    settings: {
        timeLimit: 0,        // 0 = no limit
        visibility: 'normal', // normal, dark, foggy
        difficulty: 2,       // 1-5 scale
        allowSave: true,
        allowRetry: true
    },

    // Custom map generation function (optional)
    generateMap: function() {
        // If provided, this function will be called to generate the map
        // Otherwise, the default map generator for the type will be used
        return null; // Use default
    }
});