// Mission System Constants
// Defines types and targets used by the mission system

// Objective types
const OBJECTIVE_TYPES = {
    INTERACT: 'interact',     // Interact with specific objects
    ELIMINATE: 'eliminate',   // Eliminate enemies/targets
    COLLECT: 'collect',       // Collect items
    REACH: 'reach',          // Reach a location
    SURVIVE: 'survive',      // Survive for duration
    CUSTOM: 'custom'         // Custom objective with check function
};

// Interaction target types
const INTERACTION_TARGETS = {
    TERMINAL: 'terminal',
    EXPLOSIVE: 'explosive',
    SWITCH: 'switch',
    GATE: 'gate',
    DOOR: 'door',
    NPC: 'npc'
};

// Objective handlers
const OBJECTIVE_HANDLERS = {
    // Check if an objective is complete
    checkComplete: function(objective, game) {
        if (!objective || !objective.type) return false;

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
                game.interactedObjects.add(targetId);

                // Update tracker if specified
                if (obj.tracker) {
                    game.missionTrackers[obj.tracker] =
                        (game.missionTrackers[obj.tracker] || 0) + 1;
                }

                interactionHandled = true;
                if (logger) logger.info(`✅ Interaction completed: ${targetType} - ${targetId}`);
            }
        });

        return interactionHandled;
    }
};

// Helper object for mission interaction handling
const MissionHelpers = {
    // Handle interaction based on objective
    handleInteraction: function(agent, targetType, targetId, game) {
        return OBJECTIVE_HANDLERS.handleInteraction(agent, targetType, targetId, game);
    }
};