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
            backstory: 'Former Nexus Corp data analyst who discovered Project Convergence and fled. Now works as an information broker, feeding intel to anyone fighting the corporation.',
            dialog: [
                {
                    greeting: 'You\'re with the Syndicate? Good. Nexus Corp needs to burn. I used to work for them - I know what they\'re really doing.',
                    options: [
                        { text: '📋 What do you know about Nexus?', action: 'info' },
                        { text: '💼 Got any work?', action: 'quests' },
                        { text: '👋 I should go', action: 'close' }
                    ],
                    info: 'Project Convergence isn\'t just surveillance - it\'s an AI weapons program. Autonomous drones, robotic soldiers, all controlled by a central AI. The government is funding it secretly. I have proof, but I need your help getting more.'
                }
            ],
            quests: [
                {
                    id: 'corp_sabotage',
                    name: 'Corporate Sabotage',
                    description: 'Hack 3 terminals to disrupt Nexus operations and download evidence.',
                    introDialog: 'Nexus keeps their dirty secrets spread across multiple terminals. Hack 3 of them and I can piece together the full picture of Project Convergence. This will give us leverage against them.',
                    completionDialog: 'Excellent! This data confirms government funding for Convergence. I\'ll leak this to our contacts - it\'ll make their London facility very nervous. Here\'s your payment.',
                    objectives: [
                        { id: 'hack_all', type: 'hack', count: 3, description: 'Hack 3 terminals' }
                    ],
                    rewards: { credits: 500, researchPoints: 10, experience: 150 },
                    plotRelevance: 'Reveals government connection, leads to mission 1-002'
                },
                {
                    id: 'intel_gathering',
                    name: 'Intelligence Gathering',
                    description: 'Find classified documents about Project Convergence.',
                    introDialog: 'There\'s a classified file called "CONVERGENCE-ALPHA" somewhere in their mainframe. It contains the location of their main research facility. Get it, and we\'ll know exactly where to hit them.',
                    completionDialog: 'This is it! The facility is in Singapore. Heavily fortified, but now we know where to look. The Syndicate will want to see this.',
                    objectives: [
                        { id: 'find_intel', type: 'collect', item: 'classified_docs', count: 1 }
                    ],
                    rewards: { credits: 750, items: ['keycard'], experience: 200 },
                    plotRelevance: 'Reveals Singapore facility location, leads to mission 1-004'
                }
            ]
        },
        'maintenance_worker': {
            name: 'Jim "Wrench" Wilson',
            sprite: '🔧',
            avatar: '🔧',
            color: '#ffaa00',
            movementType: 'stationary',
            backstory: 'Building maintenance worker who\'s seen too much. Knows every hidden passage in the facility and despises Nexus Corp for what they did to his brother - a test subject who never came back.',
            dialog: [
                {
                    greeting: 'Hey, you\'re not with Nexus, are you? Good. Those bastards took my brother for their "experiments." I want to help you hurt them.',
                    options: [
                        { text: '📋 What happened to your brother?', action: 'info' },
                        { text: '💼 Can you help us?', action: 'quests' },
                        { text: '👋 Stay safe', action: 'close' }
                    ],
                    info: 'They said it was a "medical trial." He went into that Singapore facility and never came out. I\'ve been looking for proof ever since. If you find anything about test subjects... let me know.'
                }
            ],
            quests: [
                {
                    id: 'secret_passage',
                    name: 'Secret Passage',
                    description: 'Find the hidden maintenance tunnel that bypasses security.',
                    introDialog: 'Listen, there\'s a maintenance tunnel the guards don\'t know about. It leads to a storage area where Nexus stashes... things. Evidence, maybe. I marked it on your map. Be careful - and if you find anything about test subjects, I need to know.',
                    completionDialog: 'You made it! Did you find anything about the experiments? ...No? Well, maybe the Singapore facility will have answers. Here, take this for your trouble.',
                    objectives: [
                        { id: 'find_tunnel', type: 'reach', x: 72, y: 70, description: 'Find the maintenance tunnel in the southeast area' }
                    ],
                    rewards: {
                        credits: 300,
                        experience: 100
                    },
                    plotRelevance: 'Foreshadows human experimentation, connects to mission 2-001 theme'
                }
            ]
        },
        'underground_hacker': {
            name: 'Zero Cool',
            sprite: '💻',
            avatar: '💻',
            color: '#00ffff',
            movementType: 'stationary',
            backstory: 'Legendary underground hacker who discovered the government\'s secret funding of Nexus Corp. Now hiding in government facilities, sabotaging from within.',
            dialog: [
                {
                    greeting: 'Syndicate operatives? Perfect timing. I\'ve been waiting for someone capable to show up. This facility is the money pipeline - government funds flowing straight to Nexus.',
                    options: [
                        { text: '📋 What did you find?', action: 'info' },
                        { text: '💼 How can we help?', action: 'quests' },
                        { text: '👋 Keep your head down', action: 'close' }
                    ],
                    info: 'Project Convergence is being funded through this facility. Black budget, completely off the books. Billions flowing to Nexus Corp for "defense research." If we crash their network, it\'ll delay the money transfer and buy us time.'
                }
            ],
            quests: [
                {
                    id: 'network_sabotage',
                    name: 'Network Sabotage',
                    description: 'Upload virus to disrupt government funding to Nexus Corp.',
                    introDialog: 'I\'ve written a virus that will corrupt their financial systems and expose the money trail. Upload it to any terminal and the whole world will see where their tax money is really going. This will hurt Nexus where it counts - their wallet.',
                    completionDialog: 'Beautiful! Their network is crashing and the transaction logs are being leaked to every news outlet. Nexus Corp is about to have some very uncomfortable questions to answer. Here\'s your cut.',
                    objectives: [
                        { id: 'upload_virus', type: 'hack', count: 1 }
                    ],
                    rewards: { credits: 600, researchPoints: 15, experience: 175 },
                    plotRelevance: 'Exposes government-Nexus financial connection, creates political pressure'
                }
            ]
        },
        'engineer': {
            name: 'Dr. Sarah Chen',
            sprite: '👩‍🔬',
            avatar: '👩‍🔬',
            color: '#ff9900',
            movementType: 'stationary',
            backstory: 'Former lead engineer on Project Convergence who left when she discovered the true purpose of her work. Now sabotaging Nexus from the inside, consumed by guilt for what she helped create.',
            dialog: [
                {
                    greeting: 'I designed the weapons they\'re building here. The autonomous targeting systems, the AI cores... I didn\'t know what they were for. When I found out about the human trials, I tried to quit. They said I knew too much.',
                    options: [
                        { text: '📋 What did you design?', action: 'info' },
                        { text: '💼 Help us destroy it', action: 'quests' },
                        { text: '👋 Get somewhere safe', action: 'close' }
                    ],
                    info: 'Convergence is an AI that controls autonomous weapons - drones, robots, even hijacked vehicles. It learns from combat data. The more it fights, the smarter it gets. And the human trials... they\'re testing neural interfaces. Making people into weapons. I have to stop what I started.'
                }
            ],
            quests: [
                {
                    id: 'sabotage_plan',
                    name: 'Sabotage Plan',
                    description: 'Use Dr. Chen\'s expertise to maximize damage to the weapons facility.',
                    introDialog: 'I know every weakness in this facility - I designed half of it. The production lines have critical failure points. Place explosives at these exact coordinates and the entire factory will be inoperable for months. It won\'t stop Convergence, but it\'ll slow them down.',
                    completionDialog: 'The chain reaction is starting. This factory is finished. But the main AI is in Singapore - that\'s where you need to go next. Destroy Convergence before it goes online. Please... fix my mistake.',
                    objectives: [
                        { id: 'precise_placement', type: 'interact', target: 'explosive', count: 3 }
                    ],
                    rewards: { credits: 800, experience: 250 },
                    plotRelevance: 'Reveals Convergence AI details, confirms Singapore as final target'
                }
            ]
        },
        'black_market_merchant': {
            name: 'Viktor "The Fence" Kozlov',
            sprite: '🛒',
            avatar: '💼',
            color: '#ffcc00',
            movementType: 'stationary',
            backstory: 'Arms dealer who sells to anyone fighting the megacorps. Has his own grudge against Nexus Corp - they destroyed his family\'s business when they refused to sell to them.',
            dialog: [
                {
                    greeting: 'Syndicate, yes? I heard you\'re hitting Nexus Corp. Good. They ruined my family. Now I arm their enemies. Looking to buy or sell?',
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
                            text: '💬 What do you know about Nexus?',
                            action: 'info'
                        },
                        {
                            text: '👋 Leave',
                            action: 'close'
                        }
                    ],
                    info: 'Nexus Corp? They control half the city through fear and money. But you\'re hurting them - I can see it in their supply lines. They\'re buying more weapons, hiring more guards. That means they\'re scared. Keep pushing. I\'ll make sure you have the firepower you need. Discount for Syndicate operatives.'
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