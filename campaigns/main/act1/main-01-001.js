// Mission: Corporate Infiltration - Data Heist
// Campaign: Main Campaign
// Act: 1 - Beginning Operations
// Mission: 001

(function() {
    const mission = {
        id: 'main-01-001',
        campaign: 'main',
        act: 1,
        missionNumber: 1,

        // Basic Info
        name: 'Corporate Infiltration',
        title: 'Data Heist',
        description: 'Infiltrate SecureCorp and steal critical data while avoiding detection.',
        briefing: 'Intelligence suggests Nexus Corp is developing illegal surveillance tech. We need you to infiltrate their facility and download evidence from their mainframe. Watch out for their security systems.',
        region: 'north_america',
        location: 'New York',

        // Agent Configuration
        agents: {
            max: 4,
            required: 2,
            recommended: 3
        },

        // Map Configuration with generation rules
        map: {
            type: 'corporate',
            name: 'Corporate Office Complex',
            width: 80,
            height: 80,
            spawn: { x: 2, y: 78 },
            extraction: { x: 78, y: 2 },

            // Embedded map data - no procedural generation needed
            embedded: {
                tiles: [
                    "##########..########..########..########..########..########..########..###.....",
                    "##########..########..########..########..########..########..########..###.....",
                    "##########..########..########..########..########..########..########..........",
                    "##########..########..########..########..########..########..########..........",
                    "##########..########..########..########..########..########..########..........",
                    "#####..................##..................##..................#######..........",
                    "#####..................##..................##..................#######..........",
                    "#####..................##..................##..................#######..........",
                    "#####..................##..................##..................#######..........",
                    "#####..................##..................##..................#######..........",
                    "................................................................................",
                    "................................................................................",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "................................................................................",
                    "................................................................................",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "................................................................................",
                    "................................................................................",
                    "#####..................##..................##..................#######..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "................................................................................",
                    "................................................................................",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "#####..................##..................##..................#######..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "##########..########..########..########..########..########..########..########",
                    "................................................................................",
                    "................................................................................",
                    "##..........########..########..########..########..########..########..########",
                    "##..........########..########..########..########..########..########..########",
                    "##..........########..########..########..########..########..########..########",
                    "............########..########..########..########..########..########..########",
                    "............########..########..########..########..########..########..########",
                    "............########..########..########..########..########..########..########",
                    "............########..########..########..########..########..########..########",
                    "............########..########..########..########..########..########..########"
                ],
                spawn: { x: 2, y: 78 },
                extraction: { x: 78, y: 2 },
                items: [
                    { type: 'terminal', x: 20, y: 20, id: 0 },
                    { type: 'terminal', x: 60, y: 20, id: 1 },
                    { type: 'terminal', x: 40, y: 40, id: 2 },
                    { type: 'marker', x: 72, y: 70, id: 'maintenance_tunnel', name: 'Maintenance Tunnel', sprite: '🚪', questRequired: 'secret_passage', hidden: true }
                ],
                collectables: [
                    // Regular collectables - always visible
                    { type: 'collectable', x: 10, y: 10, id: 'credits_northwest', name: 'Credits Stash', sprite: '💰', credits: 100 },
                    { type: 'collectable', x: 30, y: 30, id: 'medkit_central', name: 'Medical Kit', sprite: '💊', health: 30 },
                    { type: 'collectable', x: 50, y: 50, id: 'intel_center', name: 'Data Files', sprite: '📄', credits: 75 },
                    { type: 'collectable', x: 70, y: 10, id: 'credits_northeast', name: 'Credits Cache', sprite: '💵', credits: 150 },

                    // Quest-locked collectables (Wrench's secret passage quest)
                    { type: 'collectable', x: 73, y: 70, id: 'tunnel_intel', name: 'Intel Documents', sprite: '📄', item: 'tunnel_intel', questRequired: 'secret_passage', hidden: true },
                    { type: 'collectable', x: 74, y: 70, id: 'credits_1', name: 'Credits Cache', sprite: '💰', credits: 200, questRequired: 'secret_passage', hidden: true },
                    { type: 'collectable', x: 79, y: 71, id: 'credits_2', name: 'Credits Stash', sprite: '💵', credits: 150, questRequired: 'secret_passage', hidden: true }
                ],
                doors: [],
                coverCount: 100
            },

            // Add terminals for the mission
            terminals: [
                { x: 20, y: 20, hacked: false, id: 0 },
                { x: 60, y: 20, hacked: false, id: 1 },
                { x: 40, y: 40, hacked: false, id: 2 }
            ],

            // Enemy spawn positions
            enemySpawns: [
                { x: 30, y: 30 },
                { x: 50, y: 50 },
                { x: 20, y: 55 },
                { x: 55, y: 20 },
                { x: 40, y: 40 },
                { x: 25, y: 25 },
                { x: 55, y: 55 },
                { x: 35, y: 70 }
            ],

            // Map objects
            doors: [],  // Generated procedurally
            coverPositions: 100
        },

        // Objectives
        objectives: [
            {
                id: 'eliminate_hostiles',
                type: 'eliminate',
                target: 'all',
                count: 8,
                required: true,
                description: 'Eliminate all hostiles',
                tracker: 'enemiesEliminated',
                displayText: 'Hostiles eliminated: {current}/{required}'
            },
            {
                id: 'avoid_civilians',
                type: 'custom',
                required: false,
                description: 'Avoid civilian casualties',
                displayText: 'Avoid civilian casualties',
                checkFunction: 'checkNoCivilianCasualties'
            },
            {
                id: 'keep_agents_alive',
                type: 'custom',
                required: false,
                description: 'Keep at least 2 agents alive',
                displayText: 'Keep at least 2 agents alive',
                checkFunction: 'checkAgentsAlive',
                minAgents: 2
            },
            {
                id: 'stealth_bonus',
                type: 'custom',
                required: false,
                bonus: true,
                description: 'Complete first 3 terminals without triggering alerts',
                displayText: 'Stealth Hack: Complete 3 terminals undetected',
                checkFunction: 'checkStealthHack'
            }
        ],

        // Enemies
        enemies: {
            count: 8,
            types: ['guard', 'soldier'],
            reinforcements: {
                trigger: 'alarm',
                count: 5,
                delay: 30
            }
        },

        // Rewards
        rewards: {
            credits: 2000,
            researchPoints: 50,
            experience: 500
        },

        // Music Configuration
        music: {
            // Use the existing level 1 music as ambient
            ambient: {
                file: "music/missions/main-01-001/ambient.mp3",
                volume: 0.6,
                loop: true,
                fadeIn: 2000
            }
        },

        // NPCs
        npcs: [
            {
                id: 'data_broker',
                spawn: { x: 13, y: 13 },
                quests: ['corp_sabotage', 'intel_gathering']
            },
            {
                id: 'maintenance_worker',
                spawn: { x: 25, y: 20 },
                quests: ['secret_passage']
            },
            {
                id: 'black_market_merchant',
                spawn: { x: 5, y: 75 },
                quests: []  // Merchant has no quests, just shop access
            }
        ]
    };

    // Custom Objective Check Functions
    // These are called each frame to check if objectives are complete

    // Check stealth hack bonus objective
    window.checkStealthHack = function(game, objective, missionService) {
        // Check if we've hacked at least 3 terminals
        const terminalsHacked = missionService?.trackers?.terminalsHacked || 0;

        // Check if any alerts have been triggered
        const alertsTriggered = missionService?.trackers?.alertsTriggered || 0;

        // Complete if 3+ terminals hacked with no alerts
        return terminalsHacked >= 3 && alertsTriggered === 0;
    };

    // Example: Check if agents haven't used grenades (for a hypothetical stealth objective)
    window.checkNoGrenadesUsed = function(game, objective, missionService) {
        // This is an example that could track grenade usage
        const grenadesUsed = missionService?.trackers?.grenadesUsed || 0;
        return grenadesUsed === 0;
    };

    // Example: Check if mission completed within time limit
    window.checkSpeedRun = function(game, objective, missionService) {
        // Check if mission completed within 2 minutes (120 seconds)
        const elapsedTime = (Date.now() - game.missionStartTime) / 1000;

        // Don't complete this objective after time limit
        if (elapsedTime > 120) {
            return false;
        }

        // Check if main objectives are complete
        const mainObjective = missionService?.objectives?.find(o => o.id === 'eliminate_hostiles');
        return mainObjective?.completed === true;
    };

    // Register with campaign system
    if (typeof CampaignSystem !== 'undefined') {
        CampaignSystem.registerMission('main', 1, 'main-01-001', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['main-01-001'] = mission;
    }
})();