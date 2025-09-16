// Mission: Network Breach
// Campaign: Main Campaign
// Act: 1 - Beginning Operations
// Mission: 002

(function() {
    const mission = {
        id: 'main-01-002',
        campaign: 'main',
        act: 1,
        missionNumber: 2,

        // Basic Info
        name: 'Network Breach',
        title: 'Network Breach',
        description: 'Hack into government systems and extract classified information.',
        briefing: 'Government systems contain classified information about illegal surveillance programs. Your mission is to hack all terminals and extract the data without detection.',

        // Agent Configuration
        agents: {
            max: 5,        // Mission 2: 5 agents max
            required: 2,
            recommended: 3
        },

        // Map Configuration
        map: {
            type: 'government',
            useDeclarativeMap: true
        },

        // Objectives
        objectives: [
            {
                id: 'hack_all_terminals',
                type: 'interact',
                target: 'terminal',
                count: 3,
                required: true,
                description: 'Hack all terminals',
                tracker: 'terminalsHacked',
                displayText: 'Hack terminals: {current}/{required}'
            },
            {
                id: 'extract_data',
                type: 'reach',
                target: 'extraction',
                required: true,
                description: 'Extract data',
                displayText: 'Reach extraction point',
                triggerAfter: ['hack_all_terminals']
            },
            {
                id: 'escape_undetected',
                type: 'custom',
                required: false,
                description: 'Escape undetected',
                checkFunction: 'checkStealthObjective',
                displayText: 'Bonus: Complete without raising alarms',
                rewards: { credits: 500, researchPoints: 50 }
            }
        ],

        // Enemies
        enemies: {
            count: 6,
            types: ['guard', 'soldier'],
            patrols: true
        },

        // Rewards
        rewards: {
            credits: 2500,
            researchPoints: 75,
            experience: 750
        }
    };

    // Register with campaign system
    if (typeof CampaignSystem !== 'undefined') {
        CampaignSystem.registerMission('main', 1, 'main-01-002', mission);
    }

    // Also make available for direct loading
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};
        window.CAMPAIGN_MISSIONS['main-01-002'] = mission;
    }
})();