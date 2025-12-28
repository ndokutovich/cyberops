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
                    name: 'Clear the Floor',
                    description: 'Eliminate guards so Zero Cool can access the mainframe.',
                    introDialog: 'I need to get to the central mainframe to upload my virus, but there are too many guards patrolling. Take out at least 4 of them and I can slip through to finish the job myself. I\'ll make sure the financial data gets leaked to the press.',
                    completionDialog: 'Perfect - the path is clear. I\'m uploading the virus now... done! Transaction logs are being leaked to every news outlet. Nexus Corp is about to have some very uncomfortable questions to answer. Here\'s your cut.',
                    objectives: [
                        { id: 'clear_guards', type: 'eliminate', count: 4 }
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
                                if (game.closeNPCDialog) {
                                    game.closeNPCDialog();
                                }
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
        },

        // ==========================================
        // Mission 1-002 (London) NPCs
        // ==========================================
        'whistleblower': {
            name: 'Agent Whitmore',
            sprite: '🕴️',
            avatar: '🕴️',
            color: '#4488ff',
            movementType: 'stationary',
            backstory: 'MI5 agent who discovered the government\'s secret funding of Nexus Corp. Risked everything to leak the information to the Syndicate.',
            dialog: [
                {
                    greeting: 'You made it. I\'m the one who sent the tip to your Handler. The government is funneling billions to Nexus through this facility. I have proof, but I need your help getting it out.',
                    options: [
                        { text: '📋 What proof do you have?', action: 'info' },
                        { text: '💼 How can we help?', action: 'quests' },
                        { text: '👋 Stay hidden', action: 'close' }
                    ],
                    info: 'Senator Blackwood authorized everything. Secret payments, off-the-books contracts. It\'s all in the secure server room. Get me access and I\'ll make sure the world sees what they\'ve been hiding.'
                }
            ],
            quests: [
                {
                    id: 'secure_evidence',
                    name: 'Secure Evidence',
                    description: 'Hack the secure terminals to download financial records.',
                    introDialog: 'The transaction logs are split across multiple secure terminals. Hack them all and we\'ll have irrefutable proof of the conspiracy. This will bring down senators, generals... everyone involved.',
                    completionDialog: 'Got it! These records show forty billion dollars flowing to Nexus Corp. Senator Blackwood, seventeen officials... they\'re all implicated. I\'ll leak this to every news outlet. Thank you, operative.',
                    objectives: [
                        { id: 'hack_secure', type: 'hack', count: 3 }
                    ],
                    rewards: { credits: 700, researchPoints: 20, experience: 200 },
                    plotRelevance: 'Exposes government corruption, creates political crisis for Nexus'
                }
            ]
        },
        'sympathetic_guard': {
            name: 'Officer Reynolds',
            sprite: '👮',
            avatar: '👮',
            color: '#88aa88',
            movementType: 'stationary',
            backstory: 'Security guard who\'s seen too much. His conscience won\'t let him protect the people running this operation.',
            dialog: [
                {
                    greeting: 'You\'re not supposed to be here... but honestly? I don\'t care anymore. What they\'re funding here is wrong. Take what you need. I\'ll look the other way.',
                    options: [
                        { text: '📋 What have you seen?', action: 'info' },
                        { text: '💼 Help us then', action: 'quests' },
                        { text: '👋 Thanks', action: 'close' }
                    ],
                    info: 'Armored trucks come in at night. Crates of equipment going to Singapore. I heard them talking about "test subjects." Whatever Nexus is building... it\'s not defense research.'
                }
            ],
            quests: [
                {
                    id: 'patrol_route',
                    name: 'Clear Path',
                    description: 'Follow the safe route Officer Reynolds marked.',
                    introDialog: 'I can\'t disable the patrols, but I can tell you where they won\'t be. There\'s a service corridor the guards skip. Make it through without being spotted and you\'ll have clear access to the server room.',
                    completionDialog: 'You made it. The server room is just ahead. I\'ll make sure no one comes looking. Just... make them pay for what they\'ve done.',
                    objectives: [
                        { id: 'use_corridor', type: 'reach', x: 50, y: 25 }
                    ],
                    rewards: { credits: 400, experience: 125 },
                    plotRelevance: 'Provides safe passage, shows not all guards are loyal to Nexus'
                }
            ]
        },
        'nervous_researcher': {
            name: 'Dr. Emily Foster',
            sprite: '👩‍💼',
            avatar: '👩‍💼',
            color: '#cc88cc',
            movementType: 'stationary',
            backstory: 'Researcher forced to work on Nexus projects. Too scared to quit, too guilty to continue.',
            dialog: [
                {
                    greeting: 'Please... don\'t hurt me. I know what this facility does. I\'ve been looking for a way out. Can you... can you help me?',
                    options: [
                        { text: '📋 What do you know?', action: 'info' },
                        { text: '💼 We can help each other', action: 'quests' },
                        { text: '👋 Get somewhere safe', action: 'close' }
                    ],
                    info: 'They call it Project Convergence. An AI that controls weapons... and people. Neural interfaces. The test subjects... some of them were volunteers. Most weren\'t. I have access codes. Take them. Please.'
                }
            ],
            quests: [
                {
                    id: 'access_codes',
                    name: 'Security Override',
                    description: 'Use Dr. Foster\'s access codes to hack terminals faster.',
                    introDialog: 'My security credentials still work. Here - these codes will let you bypass the encryption on the main terminals. Just... make sure the world knows what they\'re doing here.',
                    completionDialog: 'Thank you. I\'ll disappear now. Maybe somewhere they can\'t find me. Stop them... stop Convergence.',
                    objectives: [
                        { id: 'use_codes', type: 'hack', count: 2 }
                    ],
                    rewards: { credits: 500, researchPoints: 25, experience: 175 },
                    plotRelevance: 'Confirms neural interface technology, adds urgency to stop Convergence'
                }
            ]
        },

        // ==========================================
        // Mission 1-003 (Tokyo) NPCs
        // ==========================================
        'factory_foreman': {
            name: 'Takeshi Yamamoto',
            sprite: '🔨',
            avatar: '🔨',
            color: '#aa8844',
            movementType: 'stationary',
            backstory: 'Factory foreman who built the production lines for Nexus. Now realizes what they\'re really making and wants to help destroy it.',
            dialog: [
                {
                    greeting: 'I heard you\'re here to shut this place down. Good. I built these assembly lines - I know exactly where they\'re weakest.',
                    options: [
                        { text: '📋 What are they making?', action: 'info' },
                        { text: '💼 Show us the weak points', action: 'quests' },
                        { text: '👋 Get out of here', action: 'close' }
                    ],
                    info: 'Autonomous weapons. Drones, combat robots, things that don\'t need human operators. All controlled by an AI in Singapore. This factory produces the bodies - Singapore gives them minds.'
                }
            ],
            quests: [
                {
                    id: 'structural_weakness',
                    name: 'Structural Weakness',
                    description: 'Plant explosives at the critical support points Takeshi identified.',
                    introDialog: 'The main power conduits run through three junction points. Hit them all and the chain reaction will take out the entire production floor. I marked the locations - just plant your charges and run.',
                    completionDialog: 'Perfect placement. This factory is finished. Months of production, gone. Nexus won\'t recover from this easily. Now get out before it blows!',
                    objectives: [
                        { id: 'plant_precise', type: 'interact', target: 'explosive', count: 3 }
                    ],
                    rewards: { credits: 600, experience: 200 },
                    plotRelevance: 'Maximizes destruction, cripples Nexus weapon production'
                }
            ]
        },
        'arms_dealer_tokyo': {
            name: 'Kenji "Ghost" Tanaka',
            sprite: '🎴',
            avatar: '🎴',
            color: '#ff4444',
            movementType: 'stationary',
            backstory: 'Yakuza arms dealer operating in the factory district. Hates Nexus Corp for muscling in on his territory.',
            dialog: [
                {
                    greeting: 'Syndicate? The enemy of my enemy... Nexus Corp thinks they own this city. They\'re wrong. Need weapons for your operation?',
                    options: [
                        {
                            text: '🛒 Open Shop',
                            action: function(game) {
                                if (game.closeNPCDialog) game.closeNPCDialog();
                                if (game.showShop) game.showShop('black_market');
                            }
                        },
                        { text: '💬 What\'s your stake in this?', action: 'info' },
                        { text: '👋 Leave', action: 'close' }
                    ],
                    info: 'Nexus Corp pushed out all the local suppliers. Bought the police, the politicians. Now they run everything. But a factory in flames? That sends a message. Here - take what you need. On the house.'
                }
            ],
            quests: []
        },
        'factory_saboteur': {
            name: 'Yuki Sato',
            sprite: '🔥',
            avatar: '🔥',
            color: '#ff8800',
            movementType: 'stationary',
            backstory: 'Disgruntled factory worker whose father died in a "workplace accident" that was really a cover-up. Now sabotaging from within.',
            dialog: [
                {
                    greeting: 'You\'re not security. Good. I\'ve been waiting for someone to burn this place down. My father died here - they said it was an accident. It wasn\'t.',
                    options: [
                        { text: '📋 What happened?', action: 'info' },
                        { text: '💼 Help us finish the job', action: 'quests' },
                        { text: '👋 Stay out of the blast zone', action: 'close' }
                    ],
                    info: 'He found out what they were really building. Tried to report it. Next day - "industrial accident." No investigation. I\'ve been loosening bolts, cutting wires... anything to slow them down. Now you can finish it.'
                }
            ],
            quests: [
                {
                    id: 'inside_help',
                    name: 'Inside Help',
                    description: 'Yuki has already weakened the structure. Finish the job.',
                    introDialog: 'I\'ve already compromised the backup generators and fire suppression. When you blow the main junctions, nothing will stop the fire. Just make sure you\'re not inside when it happens.',
                    completionDialog: 'For my father. Thank you, stranger. Now get out - this whole place is coming down.',
                    objectives: [
                        { id: 'final_sabotage', type: 'interact', target: 'explosive', count: 2 }
                    ],
                    rewards: { credits: 450, experience: 150 },
                    plotRelevance: 'Shows local resistance against Nexus, personal cost of their operations'
                }
            ]
        },

        // ==========================================
        // Mission 1-004 (Singapore Recon) NPCs
        // ==========================================
        'escaped_subject': {
            name: 'Marcus Webb',
            sprite: '😰',
            avatar: '😰',
            color: '#aaaaaa',
            movementType: 'stationary',
            backstory: 'Former test subject who escaped the Singapore facility. Hiding in the outer compound, desperate to stop others from suffering his fate.',
            dialog: [
                {
                    greeting: 'Don\'t... don\'t let them catch you. They put things in your head. You can still hear them... the voices. The AI. It never stops.',
                    options: [
                        { text: '📋 What did they do to you?', action: 'info' },
                        { text: '💼 Help us stop them', action: 'quests' },
                        { text: '👋 We\'ll get you out', action: 'close' }
                    ],
                    info: 'Neural interfaces. They drill into your skull and... connect you. To Convergence. The AI controls you. Makes you do things. There are forty-six others still in there. Please... save them.'
                }
            ],
            quests: [
                {
                    id: 'map_facility',
                    name: 'Map the Facility',
                    description: 'Marcus knows the layout. Use his knowledge to hack key terminals.',
                    introDialog: 'I remember the layout. The control room is in the center. Three terminal access points. Hack them and you\'ll have everything - security codes, patrol routes, the location of the test subjects. Just... be quiet. They\'re always listening.',
                    completionDialog: 'You have everything now. The assault team will know exactly where to hit. Please... when you come back, save the others. Before they become like me.',
                    objectives: [
                        { id: 'intel_hack', type: 'hack', count: 3 }
                    ],
                    rewards: { credits: 800, researchPoints: 30, experience: 225 },
                    plotRelevance: 'Reveals test subject locations, creates personal stakes for final mission'
                }
            ]
        },
        'security_tech': {
            name: 'Chen Wei',
            sprite: '💾',
            avatar: '💾',
            color: '#00ff88',
            movementType: 'stationary',
            backstory: 'Security technician disillusioned with Nexus. Provides technical support to resistance fighters.',
            dialog: [
                {
                    greeting: 'You\'re the Syndicate team? I can help. The security systems here - I designed half of them. I know their blind spots.',
                    options: [
                        { text: '📋 What can you tell us?', action: 'info' },
                        { text: '💼 Show us the blind spots', action: 'quests' },
                        { text: '👋 Thanks for the help', action: 'close' }
                    ],
                    info: 'Motion sensors, thermal cameras, drone patrols. But they have gaps. Timing windows. If you move carefully, you can slip through undetected. I\'ll mark the safe paths on your HUD.'
                }
            ],
            quests: [
                {
                    id: 'security_gaps',
                    name: 'Security Gaps',
                    description: 'Follow Chen Wei\'s route to avoid detection.',
                    introDialog: 'The patrol drones pass every ninety seconds. The thermal cameras have a fifteen-degree blind spot. Stick to the shadows, move when I signal, and you\'ll be invisible.',
                    completionDialog: 'You made it through! The main terminals are just ahead. Get what you need and extract the same way. Good luck.',
                    objectives: [
                        { id: 'stealth_route', type: 'reach', x: 35, y: 35 }
                    ],
                    rewards: { credits: 500, experience: 175 },
                    plotRelevance: 'Enables stealth approach, shows internal resistance to Nexus'
                }
            ]
        },
        'underground_contact': {
            name: 'Lian Ng',
            sprite: '🌙',
            avatar: '🌙',
            color: '#9966ff',
            movementType: 'stationary',
            backstory: 'Local resistance fighter coordinating the ground operation. Has been waiting for the Syndicate to arrive.',
            dialog: [
                {
                    greeting: 'Finally. We\'ve been watching this facility for months. Your Handler said you\'d come. The Singapore resistance is ready to support the assault - but first, we need intelligence.',
                    options: [
                        { text: '📋 What does the resistance know?', action: 'info' },
                        { text: '💼 What do you need?', action: 'quests' },
                        { text: '👋 Keep the resistance ready', action: 'close' }
                    ],
                    info: 'We know there are prisoners inside. Test subjects for their neural interface program. When you assault this place, we\'ll create a distraction. But we need the security data first.'
                }
            ],
            quests: [
                {
                    id: 'resistance_prep',
                    name: 'Resistance Preparation',
                    description: 'Get security data to help the resistance prepare for the final assault.',
                    introDialog: 'We need patrol schedules, guard positions, emergency protocols. Get us that data and we\'ll have fifty fighters ready to support your assault. This is bigger than the Syndicate now.',
                    completionDialog: 'This is perfect. Patrol routes, response times, everything. When you come back for the final push, we\'ll be ready. Singapore will fight.',
                    objectives: [
                        { id: 'security_data', type: 'hack', count: 2 }
                    ],
                    rewards: { credits: 600, researchPoints: 15, experience: 200 },
                    plotRelevance: 'Sets up local support for final mission, expands scope of resistance'
                }
            ]
        },

        // ==========================================
        // Mission 2-001 (Manila Slums) NPCs
        // ==========================================
        'local_mother': {
            name: 'Maria Santos',
            sprite: '👩',
            avatar: '👩',
            color: '#ffcc88',
            movementType: 'stationary',
            backstory: 'Local woman whose son was taken by the Ortega Syndicate and sold to Nexus Corp. Desperate for justice.',
            dialog: [
                {
                    greeting: 'You\'re here to stop them? The Ortegas? They... they took my son. Six months ago. Said he was going to a "good job" in Singapore. He never came back.',
                    options: [
                        { text: '📋 Tell me what happened', action: 'info' },
                        { text: '💼 We\'ll find him', action: 'quests' },
                        { text: '👋 We\'ll stop them', action: 'close' }
                    ],
                    info: 'The Ortegas recruit for Nexus. Promise poor families money, jobs. Then the trucks come at night. My boy was seventeen. Strong. They said he was "perfect for the program." I never saw him again.'
                }
            ],
            quests: [
                {
                    id: 'find_evidence',
                    name: 'Find Evidence',
                    description: 'Search for records of where the victims were taken.',
                    introDialog: 'The Ortegas keep records. Names, dates, payments from Nexus. If you find them, maybe we can trace where they sent my son. And all the others. Please... I need to know what happened to him.',
                    completionDialog: 'Singapore. They all went to Singapore. To that facility. Is he... is he still alive? Please, when you go there... if you find him... tell him his mother never stopped looking.',
                    objectives: [
                        { id: 'find_records', type: 'eliminate', count: 5 }
                    ],
                    rewards: { credits: 500, experience: 175 },
                    plotRelevance: 'Creates emotional stakes, connects Manila to Singapore mission'
                }
            ]
        },
        'ex_gang_member': {
            name: 'Rico Delgado',
            sprite: '🔪',
            avatar: '🔪',
            color: '#888888',
            movementType: 'stationary',
            backstory: 'Former Ortega enforcer who left when he discovered they were selling people to Nexus. Now hunted by his former gang.',
            dialog: [
                {
                    greeting: 'Syndicate? I used to work for Ortega. Did things I\'m not proud of. But when I found out what they were really doing... selling our own people... I couldn\'t anymore.',
                    options: [
                        { text: '📋 What can you tell us?', action: 'info' },
                        { text: '💼 Help us take them down', action: 'quests' },
                        { text: '👋 Keep your head down', action: 'close' }
                    ],
                    info: 'Ortega has two lieutenants. Santos handles the money, Reyes handles the muscle. Take them both out and the whole operation falls apart. Ortega himself stays in the central compound. Heavily guarded.'
                }
            ],
            quests: [
                {
                    id: 'inside_info',
                    name: 'Inside Information',
                    description: 'Rico knows where the lieutenants are. Eliminate them.',
                    introDialog: 'Santos is in the east building, counting his blood money. Reyes patrols the main street with his enforcers. I\'ll mark them for you. End them... end all of this.',
                    completionDialog: 'It\'s done. The lieutenants are dead. Ortega\'s operation is crippled. Maybe now I can sleep at night. Thank you, Syndicate.',
                    objectives: [
                        { id: 'kill_lieutenants', type: 'eliminate', count: 3 }
                    ],
                    rewards: { credits: 700, researchPoints: 20, experience: 225 },
                    plotRelevance: 'Provides tactical info on targets, shows defection from enemy'
                }
            ]
        },
        'street_informant': {
            name: 'Manny "Eyes" Ocampo',
            sprite: '👁️',
            avatar: '👁️',
            color: '#ffff00',
            movementType: 'stationary',
            backstory: 'Street vendor who sees everything. Sells information to the highest bidder - this time, it\'s the Syndicate.',
            dialog: [
                {
                    greeting: 'Syndicate money spends just as good as Ortega money. Better, actually - Ortega pays in threats. What do you want to know?',
                    options: [
                        { text: '📋 Tell me about Ortega', action: 'info' },
                        { text: '💼 I need locations', action: 'quests' },
                        { text: '👋 Later', action: 'close' }
                    ],
                    info: 'Miguel Ortega. Started as a street thug, now runs half the slums. Nexus Corp pays him for "recruitment" - that\'s what they call kidnapping. He\'s in the big house at the center. Always has guards.'
                }
            ],
            quests: [
                {
                    id: 'enemy_positions',
                    name: 'Enemy Positions',
                    description: 'Manny knows where all the guards are positioned.',
                    introDialog: 'For the right price, I\'ll tell you exactly where every guard is. Eight enforcers, two lieutenants, and Ortega himself. Kill them all and the slums are free. That\'s worth something, right?',
                    completionDialog: 'Pleasure doing business. The Ortegas are finished. Maybe this neighborhood can finally rebuild. And hey - if you ever need eyes on the ground, you know where to find me.',
                    objectives: [
                        { id: 'clear_area', type: 'eliminate', count: 6 }
                    ],
                    rewards: { credits: 450, experience: 150 },
                    plotRelevance: 'Provides tactical advantage, shows gray morality of informants'
                }
            ]
        },
        'slum_merchant': {
            name: 'Tita Rosa',
            sprite: '🏪',
            avatar: '🏪',
            color: '#ff88aa',
            movementType: 'stationary',
            backstory: 'Elderly woman running a small shop. Secretly supplies resistance fighters with weapons hidden under her vegetables.',
            dialog: [
                {
                    greeting: 'Ah, you look like trouble. Good trouble, I hope? Come, come. I have... vegetables. Very special vegetables.',
                    options: [
                        {
                            text: '🛒 Open Shop',
                            action: function(game) {
                                if (game.closeNPCDialog) game.closeNPCDialog();
                                if (game.showShop) game.showShop('black_market');
                            }
                        },
                        { text: '💬 What\'s your story?', action: 'info' },
                        { text: '👋 Thanks, Tita', action: 'close' }
                    ],
                    info: 'The Ortegas took my grandson. My neighbors\' children. Anyone young and strong. I\'m too old to fight, but I can help those who do. Guns hidden under the eggplants, grenades in the rice sacks. For you, special price.'
                }
            ],
            quests: []
        },

        // ==========================================
        // Mission 2-002 (Singapore Final) NPCs
        // ==========================================
        'dr_chen_finale': {
            name: 'Dr. Sarah Chen',
            sprite: '👩‍🔬',
            avatar: '👩‍🔬',
            color: '#ff9900',
            movementType: 'stationary',
            backstory: 'Dr. Chen returns for the final mission. She designed Convergence - now she\'ll help destroy it.',
            dialog: [
                {
                    greeting: 'I\'m here. I couldn\'t stay away - not when you\'re finally about to end this. I built Convergence. I have to be the one to destroy it.',
                    options: [
                        { text: '📋 How do we shut it down?', action: 'info' },
                        { text: '💼 Guide us through', action: 'quests' },
                        { text: '👋 Stay close', action: 'close' }
                    ],
                    info: 'The mainframe is in the center of the facility. Three layers of security gates. But I know the override codes. Get me to the core and I can shut Convergence down permanently. No more autonomous weapons. No more neural interfaces. No more monsters.'
                }
            ],
            quests: [
                {
                    id: 'shutdown_sequence',
                    name: 'Shutdown Sequence',
                    description: 'Help Dr. Chen reach the mainframe and initiate shutdown.',
                    introDialog: 'The gates use biometric locks, but I still have clearance. We need to breach all three, reach the mainframe, and I\'ll upload the kill code. Convergence dies today.',
                    completionDialog: 'It\'s done. Convergence is offline. The neural interfaces are deactivating. Those poor people... they\'re free. I\'ve finally fixed my mistake.',
                    objectives: [
                        { id: 'reach_mainframe', type: 'interact', target: 'terminal', count: 1 }
                    ],
                    rewards: { credits: 1000, researchPoints: 50, experience: 300 },
                    plotRelevance: 'Final story beat, Dr. Chen\'s redemption arc complete'
                }
            ]
        },
        'freed_prisoner': {
            name: 'James Webb',
            sprite: '😵',
            avatar: '😵',
            color: '#88ff88',
            movementType: 'stationary',
            backstory: 'Marcus Webb\'s brother, still trapped in the facility. Once freed from Convergence\'s control, he can help.',
            dialog: [
                {
                    greeting: 'I... I can think again. The voices stopped. What... what happened? Where am I?',
                    options: [
                        { text: '📋 We freed you from Convergence', action: 'info' },
                        { text: '💼 Your brother is alive', action: 'quests' },
                        { text: '👋 You\'re safe now', action: 'close' }
                    ],
                    info: 'I remember everything. They made me do things. Training exercises. Combat simulations. I couldn\'t stop myself. There are others - forty-six of us. We need to free them all before the backup systems kick in.'
                }
            ],
            quests: [
                {
                    id: 'save_subjects',
                    name: 'Save Test Subjects',
                    description: 'Disable the remaining neural interface pods.',
                    introDialog: 'The pods are connected to the main power grid. Destroy the power nodes and the pods will open. Please - free the others. Before Convergence comes back online.',
                    completionDialog: 'They\'re waking up. All of them. You saved us. My brother... Marcus... is he alive? I have to find him.',
                    objectives: [
                        { id: 'disable_pods', type: 'interact', target: 'gate', count: 2 }
                    ],
                    rewards: { credits: 800, experience: 250 },
                    plotRelevance: 'Resolves test subject plot, connects to Singapore Recon NPC'
                }
            ]
        },
        'facility_insider': {
            name: 'Agent Yeo',
            sprite: '🎖️',
            avatar: '🎖️',
            color: '#44aaff',
            movementType: 'stationary',
            backstory: 'Syndicate mole inside the facility. Has been waiting months for this assault.',
            dialog: [
                {
                    greeting: 'Syndicate? I\'ve been undercover for eight months. Handler said you\'d come. I\'ve got the security codes for all three gates. Let\'s end this.',
                    options: [
                        { text: '📋 What\'s the situation inside?', action: 'info' },
                        { text: '💼 Give us the codes', action: 'quests' },
                        { text: '👋 Stay in position', action: 'close' }
                    ],
                    info: 'Heavy resistance. Automated turrets, combat drones, and Nexus\'s private security. But I\'ve disabled the backup communications. No reinforcements are coming. It\'s now or never.'
                }
            ],
            quests: [
                {
                    id: 'gate_codes',
                    name: 'Security Override',
                    description: 'Use Agent Yeo\'s codes to breach the outer gates.',
                    introDialog: 'Here are the override codes. They\'ll give you ten seconds to breach each gate before the backup kicks in. Move fast, hit hard. I\'ll cover you from here.',
                    completionDialog: 'Outer perimeter is down. The path to the mainframe is clear. Go - finish what we started. I\'ll make sure no one follows you.',
                    objectives: [
                        { id: 'breach_gates', type: 'interact', target: 'gate', count: 1 }
                    ],
                    rewards: { credits: 600, experience: 200 },
                    plotRelevance: 'Enables faster breach, shows long-term Syndicate planning'
                }
            ]
        },
        'resistance_leader': {
            name: 'Colonel Lin',
            sprite: '⭐',
            avatar: '⭐',
            color: '#ffdd00',
            movementType: 'stationary',
            backstory: 'Former Singapore military officer leading the local resistance. Coordinating the final assault.',
            dialog: [
                {
                    greeting: 'Syndicate team, welcome to the fight. The Singapore resistance is committed. Fifty fighters waiting for your signal. Let\'s bring this facility down.',
                    options: [
                        { text: '📋 What\'s the plan?', action: 'info' },
                        { text: '💼 Coordinate the assault', action: 'quests' },
                        { text: '👋 For Singapore', action: 'close' }
                    ],
                    info: 'We hit them from three sides. Your team takes the center - that\'s where the mainframe is. My people will draw fire from the flanks. Once Convergence is offline, we mop up the survivors.'
                }
            ],
            quests: [
                {
                    id: 'coordinated_assault',
                    name: 'Coordinated Assault',
                    description: 'Eliminate enough enemies for the resistance to advance.',
                    introDialog: 'My fighters are in position. But those turrets are tearing us apart. Take out the defense grid and we can push through. Kill at least eight of them and we\'ll break their line.',
                    completionDialog: 'Defense grid is down! All units, advance! You did it, Syndicate. Singapore fights with you. Now go - destroy Convergence. We\'ll hold this perimeter.',
                    objectives: [
                        { id: 'clear_defenses', type: 'eliminate', count: 8 }
                    ],
                    rewards: { credits: 900, researchPoints: 30, experience: 275 },
                    plotRelevance: 'Shows scale of resistance, makes final battle feel epic'
                }
            ]
        }
    };

    // Export for use by missions
    if (typeof window !== 'undefined') {
        window.CAMPAIGN_NPC_TEMPLATES = window.CAMPAIGN_NPC_TEMPLATES || {};
        window.CAMPAIGN_NPC_TEMPLATES['main'] = npcTemplates;
    }
})();