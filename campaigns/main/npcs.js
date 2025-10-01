// NPC Templates for Main Campaign
// These are referenced by mission files

(function() {
    const npcTemplates = {
        'data_broker': {
            name: 'Marcus "The Broker" Kane',
            sprite: '🕵️',
            avatar: '🕵️',
            color: '#00ff00',
            movementType: 'stationary',
            dialog: [],
            quests: [
                {
                    id: 'corp_sabotage',
                    name: 'Corporate Sabotage',
                    description: 'Hack 3 terminals to disrupt their operations.',
                    introDialog: 'The corporation has been exploiting workers. Help me teach them a lesson by hacking 3 of their terminals.',
                    completionDialog: 'Excellent work! Their systems are in chaos. Here\'s your payment.',
                    objectives: [
                        { id: 'hack_all', type: 'hack', count: 3, description: 'Hack 3 terminals' }
                    ],
                    rewards: { credits: 500, researchPoints: 10, experience: 150 }
                },
                {
                    id: 'intel_gathering',
                    name: 'Intelligence Gathering',
                    description: 'Find classified documents in the mainframe.',
                    introDialog: 'I need classified documents from their mainframe. Can you help?',
                    completionDialog: 'Perfect! This intel will be very useful.',
                    objectives: [
                        { id: 'find_intel', type: 'collect', item: 'classified_docs', count: 1 }
                    ],
                    rewards: { credits: 750, items: ['keycard'], experience: 200 }
                }
            ]
        },
        'maintenance_worker': {
            name: 'Jim "Wrench" Wilson',
            sprite: '🔧',
            avatar: '🔧',
            color: '#ffaa00',
            movementType: 'stationary',
            dialog: [],
            quests: [
                {
                    id: 'secret_passage',
                    name: 'Secret Passage',
                    description: 'Find the maintenance tunnel entrance.',
                    introDialog: 'There\'s a maintenance tunnel that can get you past security. I marked it on your map.',
                    completionDialog: 'You found it! That tunnel will save you a lot of trouble.',
                    objectives: [
                        { id: 'find_tunnel', type: 'reach', x: 72, y: 70, description: 'Find the maintenance tunnel in the southeast area' }
                    ],
                    rewards: { credits: 300, experience: 100 }
                }
            ]
        },
        'underground_hacker': {
            name: 'Zero Cool',
            sprite: '💻',
            avatar: '💻',
            color: '#00ffff',
            movementType: 'stationary',
            dialog: [],
            quests: [
                {
                    id: 'network_sabotage',
                    name: 'Network Sabotage',
                    description: 'Upload virus to government servers.',
                    introDialog: 'I have a virus that can bring down their network. Upload it to any terminal.',
                    completionDialog: 'Their network is crashing! Nice work!',
                    objectives: [
                        { id: 'upload_virus', type: 'hack', count: 1 }
                    ],
                    rewards: { credits: 600, researchPoints: 15, experience: 175 }
                }
            ]
        },
        'engineer': {
            name: 'Dr. Sarah Chen',
            sprite: '👩‍🔬',
            avatar: '👩‍🔬',
            color: '#ff9900',
            movementType: 'stationary',
            dialog: [],
            quests: [
                {
                    id: 'sabotage_plan',
                    name: 'Sabotage Plan',
                    description: 'Maximize damage to production.',
                    introDialog: 'I worked here before they fired me. Place the explosives at these exact coordinates for maximum damage.',
                    completionDialog: 'Perfect! Their production line will be down for months.',
                    objectives: [
                        { id: 'precise_placement', type: 'interact', target: 'explosive', count: 3 }
                    ],
                    rewards: { credits: 800, experience: 250 }
                }
            ]
        },
        'black_market_merchant': {
            name: 'Viktor "The Fence" Kozlov',
            sprite: '🛒',
            avatar: '💼',
            color: '#ffcc00',
            movementType: 'stationary',
            dialog: [
                {
                    greeting: 'Looking to buy or sell? I have the best gear in the city... for the right price.',
                    options: [
                        {
                            text: '🛒 Open Shop',
                            action: function(game) {
                                // game parameter is passed by the action handler
                                // Close NPC dialog first
                                if (game.closeNPCDialog) {
                                    game.closeNPCDialog();
                                }
                                // Open the RPG shop
                                if (game.showShop) {
                                    game.showShop('black_market');
                                }
                            }
                        },
                        {
                            text: '💬 Tell me about your goods',
                            action: 'info'
                        },
                        {
                            text: '👋 Leave',
                            action: 'close'
                        }
                    ],
                    info: 'I deal in weapons, armor, and special equipment. Everything you need to survive the corporate wars. My prices are fair... mostly. I buy items too, but at half price - that\'s business.'
                }
            ],
            quests: []
        }
    };

    // Export for use by missions
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_NPC_TEMPLATES = window.CAMPAIGN_NPC_TEMPLATES || {};
        window.CAMPAIGN_NPC_TEMPLATES['main'] = npcTemplates;
    }
})();