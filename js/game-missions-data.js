// Comprehensive Mission and Quest Data System
// This file defines all missions and quests in a data-driven way
// The game engine acts as an executor, interpreting these definitions

// Define objective types that the game engine understands
const OBJECTIVE_TYPES = {
    INTERACT: 'interact',      // Interact with objects (terminals, doors, switches)
    ELIMINATE: 'eliminate',    // Kill enemies
    COLLECT: 'collect',        // Collect items
    REACH: 'reach',           // Reach a location
    SURVIVE: 'survive',       // Survive for time
    ESCORT: 'escort',         // Escort NPC
    DEFEND: 'defend',         // Defend location
    CUSTOM: 'custom'          // Custom objective with function
};

// Define interaction targets
const INTERACTION_TARGETS = {
    TERMINAL: 'terminal',
    DOOR: 'door',
    SWITCH: 'switch',
    EXPLOSIVE: 'explosive',
    GATE: 'gate',
    NPC: 'npc'
};

// Mission definitions
const MISSION_DEFINITIONS = [
    {
        id: 1,
        name: 'Corporate Infiltration',
        title: 'Data Heist',
        description: 'Infiltrate SecureCorp and steal critical data while avoiding detection.',
        briefing: 'Intelligence suggests Nexus Corp is developing illegal surveillance tech. We need you to infiltrate their facility and download evidence from their mainframe. Watch out for their security systems.',
        objectiveStrings: ['Eliminate all hostiles', 'Avoid civilian casualties', 'Keep at least 2 agents alive'],
        map: {
            type: 'corporate',
            // Map is fully defined in MAP_DEFINITIONS in game-maps-data.js
            // This preserves 100% of original placements
            useDeclarativeMap: true
        },
        objectives: [
            {
                id: 'eliminate_hostiles',
                type: OBJECTIVE_TYPES.ELIMINATE,
                target: 'all',
                count: 8,
                required: true,
                description: 'Eliminate all hostiles',
                tracker: 'enemiesEliminated',
                displayText: 'Hostiles eliminated: {current}/{required}'
            },
            {
                id: 'avoid_civilians',
                type: OBJECTIVE_TYPES.CUSTOM,
                required: false,
                description: 'Avoid civilian casualties',
                displayText: 'Avoid civilian casualties',
                checkFunction: 'checkNoCivilianCasualties'
            },
            {
                id: 'keep_agents_alive',
                type: OBJECTIVE_TYPES.CUSTOM,
                required: false,
                description: 'Keep at least 2 agents alive',
                displayText: 'Keep at least 2 agents alive',
                checkFunction: 'checkAgentsAlive',
                minAgents: 2
            }
        ],
        enemies: {
            count: 8,
            types: ['guard', 'soldier'],
            reinforcements: {
                trigger: 'alarm',
                count: 5,
                delay: 30
            }
        },
        rewards: {
            credits: 2000,
            researchPoints: 50,
            experience: 500
        },
        // NPCs can be defined here with their quests
        npcs: [
            {
                id: 'data_broker',
                spawn: { x: 13, y: 13 },
                quests: ['corp_sabotage', 'intel_gathering']  // Reference quest IDs
            },
            {
                id: 'maintenance_worker',
                spawn: { x: 25, y: 20 },
                quests: ['secret_passage']
            }
        ]
    },
    {
        id: 2,
        name: 'Network Breach',
        title: 'Network Breach',
        description: 'Hack into government systems and extract classified information.',
        briefing: 'Government systems contain classified information about illegal surveillance programs. Your mission is to hack all terminals and extract the data without detection.',
        objectiveStrings: ['Hack all terminals', 'Extract data', 'Escape undetected'],
        map: {
            type: 'government',
            useDeclarativeMap: true
        },
        objectives: [
            {
                id: 'hack_all_terminals',
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.TERMINAL,
                count: 3,
                required: true,
                description: 'Hack all terminals',
                tracker: 'terminalsHacked',
                displayText: 'Hack terminals: {current}/{required}'
            },
            {
                id: 'extract_data',
                type: OBJECTIVE_TYPES.REACH,
                target: 'extraction',
                required: true,
                description: 'Extract data',
                displayText: 'Reach extraction point',
                triggerAfter: ['hack_all_terminals']
            },
            {
                id: 'escape_undetected',
                type: OBJECTIVE_TYPES.CUSTOM,
                required: false,
                description: 'Escape undetected',
                checkFunction: 'checkStealthObjective',
                displayText: 'Bonus: Complete without raising alarms',
                rewards: { credits: 500, researchPoints: 50 }
            }
        ],
        enemies: {
            count: 6,
            types: ['guard', 'soldier'],
            patrols: true
        },
        rewards: {
            credits: 2500,
            researchPoints: 75,
            experience: 750
        }
    },
    {
        id: 3,
        name: 'Industrial Sabotage',
        title: 'Sabotage Operation',
        description: 'Infiltrate industrial facility and sabotage critical infrastructure.',
        briefing: 'An arms dealer is using this industrial complex to manufacture illegal weapons. Plant explosives at key points to shut down production permanently.',
        objectiveStrings: ['Plant explosives on 3 targets', 'Eliminate security team', 'Extract all agents'],
        map: {
            type: 'industrial',
            useDeclarativeMap: true
        },
        objectives: [
            {
                id: 'plant_explosives',
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.EXPLOSIVE,
                count: 3,
                required: true,
                description: 'Plant explosives at production lines',
                tracker: 'explosivesPlanted',
                displayText: 'Plant explosives: {current}/{required}',
                actionKey: 'H',  // Which key triggers this action
                actionRange: 3   // How close agent must be
            },
            {
                id: 'optional_disable_alarms',
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.SWITCH,
                specific: ['power_switch'],
                required: false,
                description: 'Disable alarm system',
                tracker: 'switchesActivated',
                displayText: 'Optional: Disable alarms',
                rewards: { credits: 300 }
            },
            {
                id: 'survive_explosion',
                type: OBJECTIVE_TYPES.SURVIVE,
                duration: 60,  // seconds
                required: true,
                description: 'Survive until explosives detonate',
                displayText: 'Survive: {remaining}s',
                triggerAfter: ['plant_explosives']
            }
        ],
        enemies: {
            count: 10,
            types: ['guard', 'soldier', 'heavy'],
            waves: [
                { trigger: 'explosives_planted', count: 10, delay: 10 }
            ]
        },
        rewards: {
            credits: 3000,
            researchPoints: 100,
            experience: 1000
        }
    },
    {
        id: 4,
        name: 'Assassination Contract',
        title: 'Assassination Contract',
        description: 'Eliminate high-value targets while maintaining stealth and precision.',
        briefing: 'We have identified key figures in the criminal syndicate. Your mission is to eliminate the primary target and all secondary targets, leaving no witnesses.',
        objectiveStrings: ['Eliminate primary target', 'Eliminate secondary targets', 'No witnesses'],
        map: {
            type: 'residential',
            useDeclarativeMap: true
        },
        objectives: [
            {
                id: 'eliminate_primary',
                type: OBJECTIVE_TYPES.ELIMINATE,
                target: 'primary_target',
                count: 1,
                required: true,
                description: 'Eliminate primary target',
                tracker: 'primaryTargetsEliminated',
                displayText: 'Primary targets: {current}/{required}'
            },
            {
                id: 'eliminate_secondary',
                type: OBJECTIVE_TYPES.ELIMINATE,
                target: 'secondary_target',
                count: 2,
                required: true,
                description: 'Eliminate secondary targets',
                tracker: 'secondaryTargetsEliminated',
                displayText: 'Secondary targets: {current}/{required}'
            },
            {
                id: 'no_witnesses',
                type: OBJECTIVE_TYPES.ELIMINATE,
                target: 'all',
                count: 12,
                required: true,
                description: 'Leave no witnesses',
                tracker: 'enemiesEliminated',
                displayText: 'Witnesses eliminated: {current}/{required}'
            },
            {
                id: 'reach_extraction',
                type: OBJECTIVE_TYPES.REACH,
                target: 'extraction',
                required: true,
                description: 'Reach extraction point',
                displayText: 'Reach extraction point',
                triggerAfter: ['eliminate_primary', 'eliminate_secondary', 'no_witnesses']
            }
        ],
        enemies: {
            count: 12,
            types: ['guard', 'soldier', 'elite'],
            special: [
                { type: 'primary_target', count: 1, health: 150 },
                { type: 'secondary_target', count: 2, health: 100 }
            ]
        },
        rewards: {
            credits: 4000,
            researchPoints: 125,
            experience: 1500
        }
    },
    {
        id: 5,
        name: 'Final Convergence',
        title: 'Final Convergence',
        description: "Assault the Syndicate's main headquarters and seize control.",
        briefing: "This is it - the final assault on the Syndicate's fortress. Breach the main gate, control all sectors, and capture the mainframe to end their reign of terror.",
        objectiveStrings: ['Breach main gate', 'Control all sectors', 'Capture the mainframe'],
        map: {
            type: 'fortress',
            useDeclarativeMap: true
        },
        objectives: [
            {
                id: 'breach_gate',
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.GATE,
                count: 1,
                required: true,
                description: 'Breach main gate',
                tracker: 'gatesBreached',
                displayText: 'Breach main gate'
            },
            {
                id: 'control_sectors',
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.TERMINAL,
                count: 3,
                required: true,
                description: 'Control all sectors',
                tracker: 'terminalsHacked',
                displayText: 'Control sectors: {current}/3'
            },
            {
                id: 'eliminate_resistance',
                type: OBJECTIVE_TYPES.ELIMINATE,
                target: 'all',
                count: 15,
                required: true,
                description: 'Eliminate all resistance',
                tracker: 'enemiesEliminated',
                displayText: 'Security forces: {current}/{required}'
            },
            {
                id: 'capture_mainframe',
                type: OBJECTIVE_TYPES.CUSTOM,
                required: true,
                description: 'Capture the mainframe',
                checkFunction: 'checkMainframeCaptured',
                displayText: 'Capture the mainframe',
                triggerAfter: ['breach_gate', 'control_sectors', 'eliminate_resistance']
            }
        ],
        enemies: {
            count: 15,
            types: ['guard', 'soldier', 'elite', 'heavy'],
            reinforcements: {
                trigger: 'gate_breached',
                count: 10,
                delay: 20
            }
        },
        rewards: {
            credits: 5000,
            researchPoints: 150,
            experience: 2000
        }
    }
];

// Quest definitions (side quests from NPCs)
const QUEST_DEFINITIONS = {
    'corp_sabotage': {
        id: 'corp_sabotage',
        name: 'Corporate Sabotage',
        giver: 'data_broker',
        description: 'Help the Data Broker disrupt corporate operations',
        introDialog: 'The corporation has been exploiting workers. Help me teach them a lesson by hacking 3 of their terminals.',
        progressDialog: "How's the hacking going? You've compromised {current} out of {required} terminals so far.",
        completionDialog: "Excellent work! Their systems are in chaos. Here's your payment.",
        objectives: [
            {
                type: OBJECTIVE_TYPES.INTERACT,
                target: INTERACTION_TARGETS.TERMINAL,
                count: 3,
                tracker: 'terminalsHacked',
                description: 'Hack 3 terminals'
            }
        ],
        requirements: {
            level: 0  // Available from mission 1
        },
        rewards: {
            credits: 500,
            researchPoints: 50,
            unlocks: ['intel_gathering']  // Unlocks next quest
        }
    },
    'intel_gathering': {
        id: 'intel_gathering',
        name: 'Intel Gathering',
        giver: 'data_broker',
        description: 'Collect classified documents',
        introDialog: 'I need you to collect intel documents scattered around the facility. They contain valuable information.',
        objectives: [
            {
                type: OBJECTIVE_TYPES.COLLECT,
                target: 'intel',
                count: 5,
                tracker: 'intelCollected',
                description: 'Collect 5 intel documents'
            }
        ],
        requirements: {
            completedQuests: ['corp_sabotage']
        },
        rewards: {
            credits: 750,
            researchPoints: 75,
            item: 'keycard_level2'
        }
    },
    'secret_passage': {
        id: 'secret_passage',
        name: 'Hidden Route',
        giver: 'maintenance_worker',
        description: 'Find the secret passage',
        introDialog: "There's a hidden passage in the east wing. I can mark it on your map for a small fee.",
        objectives: [
            {
                type: OBJECTIVE_TYPES.REACH,
                target: { x: 35, y: 15 },
                description: 'Find the secret passage'
            }
        ],
        requirements: {
            credits: 100  // Costs 100 credits to get the info
        },
        rewards: {
            mapReveal: 'secret_areas',
            experience: 100
        }
    }
};

// Generic objective handlers that the game engine will use
const OBJECTIVE_HANDLERS = {
    // Check if an objective is complete
    checkComplete: function(objective, game) {
        switch(objective.type) {
            case OBJECTIVE_TYPES.INTERACT:
                const tracker = game.missionTrackers[objective.tracker] || 0;
                if (objective.specific) {
                    // Check specific object IDs
                    return objective.specific.every(id =>
                        game.interactedObjects && game.interactedObjects.has(id)
                    );
                }
                return tracker >= (objective.count || 1);

            case OBJECTIVE_TYPES.ELIMINATE:
                const eliminated = game.missionTrackers.enemiesEliminated || 0;
                if (objective.target === 'all') {
                    // For 'all' target, check total enemies eliminated
                    return eliminated >= (objective.count || 1);
                } else if (objective.target) {
                    // Check specific enemy type
                    const typeEliminated = game.enemiesEliminatedByType[objective.target] || 0;
                    return typeEliminated >= (objective.count || 1);
                }
                return eliminated >= (objective.count || 1);

            case OBJECTIVE_TYPES.COLLECT:
                const collected = game.missionTrackers[objective.tracker] || 0;
                return collected >= (objective.count || 1);

            case OBJECTIVE_TYPES.REACH:
                if (!game.agents || game.agents.length === 0) return false;
                return game.agents.some(agent => {
                    if (!agent.alive) return false;
                    const dist = Math.sqrt(
                        Math.pow(agent.x - objective.target.x, 2) +
                        Math.pow(agent.y - objective.target.y, 2)
                    );
                    return dist < 3;
                });

            case OBJECTIVE_TYPES.SURVIVE:
                const elapsed = game.survivalTimers[objective.id] || 0;
                return elapsed >= objective.duration;

            case OBJECTIVE_TYPES.CUSTOM:
                if (game[objective.checkFunction]) {
                    return game[objective.checkFunction](objective);
                }
                return false;

            default:
                return false;
        }
    },

    // Get display text for an objective
    getDisplayText: function(objective, game) {
        let text = objective.displayText || objective.description;

        // Replace placeholders
        if (objective.tracker) {
            const current = game.missionTrackers[objective.tracker] || 0;
            text = text.replace('{current}', current);
            text = text.replace('{required}', objective.count || 1);
        }

        if (objective.type === OBJECTIVE_TYPES.SURVIVE) {
            const elapsed = game.survivalTimers[objective.id] || 0;
            const remaining = Math.max(0, objective.duration - elapsed);
            text = text.replace('{remaining}', Math.floor(remaining));
        }

        return text;
    },

    // Handle interaction based on objective
    handleInteraction: function(agent, targetType, targetId, game) {
        // Find all objectives that match this interaction
        const mission = game.missions && game.missions[game.currentMissionIndex];
        if (!mission) return false;

        let interactionHandled = false;

        mission.objectives.forEach(obj => {
            if (obj.type === OBJECTIVE_TYPES.INTERACT && obj.target === targetType) {
                // Check if this specific target matches
                if (obj.specific && !obj.specific.includes(targetId)) return;

                // Mark as interacted
                if (!game.interactedObjects) game.interactedObjects = new Set();
                game.interactedObjects.add(targetId);

                // Increment tracker
                if (obj.tracker) {
                    if (!game.missionTrackers) game.missionTrackers = {};
                    game.missionTrackers[obj.tracker] = (game.missionTrackers[obj.tracker] || 0) + 1;

                    console.log(`📊 ${obj.tracker}: ${game.missionTrackers[obj.tracker]}`);

                    // Show notification
                    if (game.addNotification) {
                        const display = OBJECTIVE_HANDLERS.getDisplayText(obj, game);
                        game.addNotification(display);
                    }
                }

                interactionHandled = true;
            }
        });

        // Also check active quests
        if (game.activeQuests) {
            Object.values(game.activeQuests).forEach(quest => {
                quest.objectives.forEach(obj => {
                    if (obj.type === OBJECTIVE_TYPES.INTERACT && obj.target === targetType) {
                        if (obj.tracker) {
                            game.missionTrackers[obj.tracker] = (game.missionTrackers[obj.tracker] || 0) + 1;
                        }
                    }
                });
            });
        }

        return interactionHandled;
    }
};

// Export for use in game
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MISSION_DEFINITIONS,
        QUEST_DEFINITIONS,
        OBJECTIVE_TYPES,
        INTERACTION_TARGETS,
        OBJECTIVE_HANDLERS
    };
}