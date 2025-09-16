// Mission: Industrial Sabotage
// Campaign: Main Campaign
// Act: 1 - Beginning Operations
// Mission: 003

(function() {
    const mission = {
        id: 'main-01-003',
        campaign: 'main',
        act: 1,
        missionNumber: 3,

        // Basic Info
        name: 'Industrial Sabotage',
        title: 'Sabotage Operation',
        description: 'Infiltrate industrial facility and sabotage critical infrastructure.',
        briefing: 'An arms dealer is using this industrial complex to manufacture illegal weapons. Plant explosives at key points to shut down production permanently.',

        // Agent Configuration
        agents: {
            max: 5,        // Mission 3: 5 agents max
            required: 2,
            recommended: 4
        },

        // Map Configuration
        map: {
            type: 'industrial',
            useDeclarativeMap: true
        },

        // Objectives
        objectives: [
            {
                id: 'plant_explosives',
                type: 'interact',
                target: 'explosive',
                count: 3,
                required: true,
                description: 'Plant explosives at production lines',
                tracker: 'explosivesPlanted',
                displayText: 'Plant explosives: {current}/{required}',
                actionKey: 'H',
                actionRange: 3
            },
            {
                id: 'optional_disable_alarms',
                type: 'interact',
                target: 'switch',
                specific: ['power_switch'],
                required: false,
                description: 'Disable alarm system',
                tracker: 'switchesActivated',
                displayText: 'Optional: Disable alarms',
                rewards: { credits: 300 }
            },
            {
                id: 'survive_explosion',
                type: 'survive',
                duration: 60,
                required: true,
                description: 'Survive until explosives detonate',
                displayText: 'Survive: {remaining}s',
                triggerAfter: ['plant_explosives']
            }
        ],

        // Enemies
        enemies: {
            count: 10,
            types: ['guard', 'soldier', 'heavy'],
            waves: [
                { trigger: 'explosives_planted', count: 10, delay: 10 }
            ]
        },

        // Rewards
        rewards: {
            credits: 3000,
            researchPoints: 100,
            experience: 1000
        }
    };

    // Register with campaign system
    if (typeof CampaignSystem !== 'undefined') {
        CampaignSystem.registerMission('main', 1, 'main-01-003', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['main-01-003'] = mission;
    }
})();