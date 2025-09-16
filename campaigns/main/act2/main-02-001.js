// Mission: Assassination Contract
// Campaign: Main Campaign
// Act: 2 - Escalation
// Mission: 001

(function() {
    const mission = {
        id: 'main-02-001',
        campaign: 'main',
        act: 2,
        missionNumber: 4,

        // Basic Info
        name: 'Assassination Contract',
        title: 'Assassination Contract',
        description: 'Eliminate high-value targets while maintaining stealth and precision.',
        briefing: 'We have identified key figures in the criminal syndicate. Your mission is to eliminate the primary target and all secondary targets, leaving no witnesses.',

        // Agent Configuration
        agents: {
            max: 6,        // Mission 4: 6 agents max
            required: 3,
            recommended: 4
        },

        // Map Configuration
        map: {
            type: 'residential',
            useDeclarativeMap: true
        },

        // Objectives
        objectives: [
            {
                id: 'eliminate_primary',
                type: 'eliminate',
                target: 'primary_target',
                count: 1,
                required: true,
                description: 'Eliminate primary target',
                tracker: 'primaryTargetsEliminated',
                displayText: 'Primary targets: {current}/{required}'
            },
            {
                id: 'eliminate_secondary',
                type: 'eliminate',
                target: 'secondary_target',
                count: 2,
                required: true,
                description: 'Eliminate secondary targets',
                tracker: 'secondaryTargetsEliminated',
                displayText: 'Secondary targets: {current}/{required}'
            },
            {
                id: 'no_witnesses',
                type: 'eliminate',
                target: 'all',
                count: 12,
                required: true,
                description: 'Leave no witnesses',
                tracker: 'enemiesEliminated',
                displayText: 'Witnesses eliminated: {current}/{required}'
            },
            {
                id: 'reach_extraction',
                type: 'reach',
                target: 'extraction',
                required: true,
                description: 'Reach extraction point',
                displayText: 'Reach extraction point',
                triggerAfter: ['eliminate_primary', 'eliminate_secondary', 'no_witnesses']
            }
        ],

        // Enemies
        enemies: {
            count: 12,
            types: ['guard', 'soldier', 'elite'],
            special: [
                { type: 'primary_target', count: 1, health: 150 },
                { type: 'secondary_target', count: 2, health: 100 }
            ]
        },

        // Rewards
        rewards: {
            credits: 4000,
            researchPoints: 125,
            experience: 1500
        }
    };

    // Register with campaign system
    if (typeof CampaignSystem !== 'undefined') {
        CampaignSystem.registerMission('main', 2, 'main-02-001', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['main-02-001'] = mission;
    }
})();