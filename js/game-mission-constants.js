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
    // Objective completion is now handled by MissionService
    // This is kept for backward compatibility with getDisplayText

    // Get display text for an objective
    getDisplayText: function(objective, game) {
        let text = objective.displayText || objective.description;

        // Handle MissionService format (has progress/maxProgress)
        if (objective.progress !== undefined && objective.maxProgress !== undefined) {
            text = text.replace('{current}', objective.progress);
            text = text.replace('{required}', objective.maxProgress);
            // Also replace count-based placeholders for compatibility
            text = text.replace('({current}/{required})', `(${objective.progress}/${objective.maxProgress})`);
        }
        // Handle legacy format (uses tracker)
        else if (objective.tracker && game.gameServices && game.gameServices.missionService) {
            const current = game.gameServices.missionService.trackers[objective.tracker] || 0;
            if (game.logger) game.logger.debug(`📋 Display text: tracker=${objective.tracker}, current=${current}, count=${objective.count}`);
            text = text.replace('{current}', current);
            text = text.replace('{required}', objective.count || 1);
        }

        if (objective.type === OBJECTIVE_TYPES.SURVIVE && game.gameServices && game.gameServices.missionService) {
            const elapsed = game.gameServices.missionService.objectiveTimers[objective.id] || 0;
            const remaining = Math.max(0, objective.duration - elapsed);
            text = text.replace('{remaining}', Math.floor(remaining));
        }

        return text;
    },

    // Interaction handling is now done through MissionService.trackEvent
    handleInteraction: function(agent, targetType, targetId, game) {
        // This function is deprecated - use MissionService.trackEvent instead
        return false;
    }
};

// Helper object for mission interaction handling
const MissionHelpers = {
    // Handle interaction based on objective
    handleInteraction: function(agent, targetType, targetId, game) {
        return OBJECTIVE_HANDLERS.handleInteraction(agent, targetType, targetId, game);
    }
};