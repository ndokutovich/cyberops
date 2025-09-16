// Campaign Index
// Registers all available campaigns

if (typeof REGISTER_CAMPAIGNS !== 'undefined') {
    REGISTER_CAMPAIGNS({
        'main': {
            id: 'main',
            name: 'Main Campaign',
            description: 'The primary campaign of CyberOps: Syndicate',
            folder: 'main',
            acts: [
                {
                    id: 1,
                    name: 'Beginning Operations',
                    missions: [
                        { id: 'main-01-001', filename: 'act1/main-01-001.js', name: 'Corporate Infiltration' },
                        { id: 'main-01-002', filename: 'act1/main-01-002.js', name: 'Network Breach' },
                        { id: 'main-01-003', filename: 'act1/main-01-003.js', name: 'Industrial Sabotage' }
                    ]
                },
                {
                    id: 2,
                    name: 'Escalation',
                    missions: [
                        { id: 'main-02-001', filename: 'act2/main-02-001.js', name: 'Assassination Contract' },
                        { id: 'main-02-002', filename: 'act2/main-02-002.js', name: 'Final Convergence' }
                    ]
                }
            ],
            locked: false
        },
        'tutorial': {
            id: 'tutorial',
            name: 'Tutorial',
            description: 'Learn the basics of CyberOps',
            folder: 'tutorial',
            acts: [],
            locked: false
        },
        'custom': {
            id: 'custom',
            name: 'Custom Missions',
            description: 'User-created missions',
            folder: 'custom',
            acts: [],
            locked: false
        },
        'dlc': {
            id: 'dlc',
            name: 'Extended Operations',
            description: 'Additional campaign content',
            folder: 'dlc',
            acts: [],
            locked: true
        }
    });
}
