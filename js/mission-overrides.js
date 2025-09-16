// Mission Overrides
// Place exported missions here to override the default missions
// without breaking the existing 5-mission structure

window.MISSION_OVERRIDES = window.MISSION_OVERRIDES || {};

// Example: To override mission 1 (index 0) with custom agent count:
/*
window.MISSION_OVERRIDES[0] = {
    agents: {
        max: 3,        // Override max agents to 3 for mission 1
        required: 2,
        recommended: 3
    },
    // You can also override map tiles:
    map: {
        customTiles: [ ... ]  // Full tile array from editor
    }
};
*/

// Example: To override mission 3 (index 2):
/*
window.MISSION_OVERRIDES[2] = {
    agents: {
        max: 6,        // Allow 6 agents for mission 3
        required: 3,
        recommended: 4
    }
};
*/