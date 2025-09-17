// Map System
// Maps are now loaded from mission files with embedded data
// This file is kept for compatibility but all generation logic has been removed

// Fallback for any legacy code that might call generateMapFromType
CyberOpsGame.prototype.generateMapFromType = function(mapType) {
    console.error('⚠️ generateMapFromType called but procedural generation removed!');
    console.error('Maps should be loaded from mission embedded data');

    // Return minimal valid map to prevent crashes
    return {
        width: 80,
        height: 80,
        tiles: Array(80).fill(null).map(() => Array(80).fill(0)),
        spawn: { x: 2, y: 2 },
        extraction: { x: 78, y: 78 },
        terminals: [],
        doors: [],
        cover: [],
        enemySpawns: []
    };
};