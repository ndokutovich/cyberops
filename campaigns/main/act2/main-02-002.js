// Mission: Final Convergence
// Campaign: Main Campaign
// Act: 2 - Escalation
// Mission: 002

(function() {
    const mission = {
        id: 'main-02-002',
        campaign: 'main',
        act: 2,
        missionNumber: 5,

        // Basic Info
        name: 'Final Convergence',
        title: 'Final Convergence',
        description: "Assault the Syndicate's main headquarters and seize control.",
        briefing: "This is it - the final assault on the Syndicate's fortress. Breach the main gate, control all sectors, and capture the mainframe to end their reign of terror.",

        // Agent Configuration
        agents: {
            max: 6,        // Mission 5: 6 agents max
            required: 3,
            recommended: 5
        },

        // Map Configuration
        map: {
            type: 'fortress',
            useDeclarativeMap: true
        },

        // Objectives
        objectives: [
            {
                id: 'breach_gate',
                type: 'interact',
                target: 'gate',
                count: 1,
                required: true,
                description: 'Breach main gate',
                tracker: 'gatesBreached',
                displayText: 'Breach main gate'
            },
            {
                id: 'control_sectors',
                type: 'interact',
                target: 'terminal',
                count: 3,
                required: true,
                description: 'Control all sectors',
                tracker: 'terminalsHacked',
                displayText: 'Control sectors: {current}/3'
            },
            {
                id: 'eliminate_resistance',
                type: 'eliminate',
                target: 'all',
                count: 15,
                required: true,
                description: 'Eliminate all resistance',
                tracker: 'enemiesEliminated',
                displayText: 'Security forces: {current}/{required}'
            },
            {
                id: 'capture_mainframe',
                type: 'custom',
                required: true,
                description: 'Capture the mainframe',
                checkFunction: 'checkMainframeCaptured',
                displayText: 'Capture the mainframe',
                triggerAfter: ['breach_gate', 'control_sectors', 'eliminate_resistance']
            }
        ],

        // Enemies
        enemies: {
            count: 15,
            types: ['guard', 'soldier', 'elite', 'heavy'],
            reinforcements: {
                trigger: 'gate_breached',
                count: 10,
                delay: 20
            }
        },

        // Rewards
        rewards: {
            credits: 5000,
            researchPoints: 150,
            experience: 2000
        }
    };

    // Register with campaign system
    if (typeof CampaignSystem !== 'undefined') {
        CampaignSystem.registerMission('main', 2, 'main-02-002', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['main-02-002'] = mission;
    }
})();