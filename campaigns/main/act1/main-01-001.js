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

        // Agent Configuration
        agents: {
            max: 4,        // Mission 1: 4 agents max
            required: 2,
            recommended: 3
        },

        // Map Configuration
        map: {
            type: 'corporate',
            useDeclarativeMap: true
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
            }
        ]
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