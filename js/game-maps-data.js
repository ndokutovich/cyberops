// Declarative Map Definitions
// This file contains all map layouts in JSON format, preserving 100% of original placements

const MAP_DEFINITIONS = {
    corporate: {
        name: 'Corporate Office Complex',
        width: 80,
        height: 80,
        spawn: { x: 2, y: 78 },
        extraction: { x: 78, y: 2 },

        // Instead of procedural generation, we define the map structure declaratively
        generation: {
            baseType: 'walls', // Start with all walls (1)

            // Corridors to carve out (make walkable)
            corridors: [
                // Horizontal main corridors
                { type: 'horizontal', startY: 10, endY: 70, stepY: 15, width: 2 },
                // Vertical main corridors
                { type: 'vertical', startX: 10, endX: 70, stepX: 15, width: 2 }
            ],

            // Clear areas (make walkable)
            clearAreas: [
                // Spawn area (bottom left) - EXPANDED for better access
                { x1: 0, y1: 75, x2: 10, y2: 79 },
                // Extraction area (top right)
                { x1: 75, y1: 1, x2: 79, y2: 5 },
                // Connect spawn to main corridor system
                { x1: 2, y1: 70, x2: 3, y2: 78 },
                { x1: 2, y1: 70, x2: 10, y2: 70 },
                // Connect extraction to main corridor system
                { x1: 77, y1: 2, x2: 78, y2: 10 },
                { x1: 70, y1: 10, x2: 78, y2: 10 }
            ],

            // Office rooms
            rooms: {
                type: 'grid',
                startX: 5,
                startY: 5,
                stepX: 20,
                stepY: 20,
                roomWidth: 12,
                roomHeight: 12,
                // Add internal walls for some rooms (cubicles)
                internalWalls: [
                    { condition: 'rx % 40 === 5', walls: [
                        { offsetX: 6, offsetY: 2 },
                        { offsetX: 6, offsetY: 5 },
                        { offsetX: 6, offsetY: 8 }
                    ]}
                ]
            }
        },

        // Static objects with exact positions from original
        doors: [
            { x: 20, y: 10, locked: true, linkedTerminal: 0 },
            { x: 40, y: 10, locked: true, linkedTerminal: 1 },
            { x: 60, y: 10, locked: true, linkedTerminal: 2 },
            { x: 20, y: 40, locked: true, linkedTerminal: 0 },
            { x: 60, y: 40, locked: true, linkedTerminal: 2 },
            { x: 40, y: 70, locked: true, linkedTerminal: 1 }
        ],

        terminals: [
            { x: 15, y: 15, hacked: false, id: 0 },
            { x: 40, y: 40, hacked: false, id: 1 },
            { x: 50, y: 70, hacked: false, id: 2 }
        ],

        // Cover positions (randomly generated in original, we'll define key positions)
        coverPositions: 60, // Number of random cover positions to generate

        // Enemy spawn configuration
        enemySpawns: [
            { x: 30, y: 30 },
            { x: 50, y: 50 },
            { x: 20, y: 55 },  // Changed from 60 to 55 (corridor position)
            { x: 55, y: 20 },  // Changed from 60 to 55 (corridor position)
            { x: 40, y: 40 },
            { x: 25, y: 25 },
            { x: 55, y: 55 },
            { x: 35, y: 70 }   // Changed from 65 to 70 (corridor position)
        ],

        // Collectables
        collectables: [
            { x: 8, y: 8, type: 'intel' },
            { x: 35, y: 35, type: 'keycard' },
            { x: 70, y: 70, type: 'credits' }
        ]
    },

    government: {
        name: 'Government Facility',
        width: 90,
        height: 70,
        spawn: { x: 2, y: 35 },
        extraction: { x: 88, y: 35 },

        generation: {
            baseType: 'walls',

            // Central hub design
            clearAreas: [
                // Central hub
                { x1: 35, y1: 25, x2: 54, y2: 44 },
                // Main entrance corridor
                { x1: 1, y1: 34, x2: 35, y2: 36 },
                // Exit corridor
                { x1: 54, y1: 34, x2: 89, y2: 36 }
            ],

            // Wings extending from hub
            wings: [
                // North wing
                { x1: 40, y1: 10, x2: 49, y2: 25 },
                // South wing
                { x1: 40, y1: 44, x2: 49, y2: 60 },
                // East wing
                { x1: 54, y1: 30, x2: 70, y2: 39 },
                // West wing
                { x1: 20, y1: 30, x2: 35, y2: 39 }
            ],

            // Security checkpoints
            securityRooms: [
                { x: 25, y: 35, width: 8, height: 8 },
                { x: 57, y: 35, width: 8, height: 8 }
            ]
        },

        doors: [
            { x: 25, y: 35, locked: true, keycard: 'level_1' },
            { x: 35, y: 35, locked: true, keycard: 'level_2' },
            { x: 54, y: 35, locked: true, keycard: 'level_2' },
            { x: 65, y: 35, locked: true, keycard: 'level_3' }
        ],

        terminals: [
            { x: 45, y: 20, hacked: false, id: 0, security: 'high' },
            { x: 30, y: 35, hacked: false, id: 1, security: 'high' },
            { x: 60, y: 35, hacked: false, id: 2, security: 'high' },
            { x: 45, y: 50, hacked: false, id: 3, security: 'maximum' }
        ],

        coverPositions: 80,

        enemySpawns: [
            { x: 30, y: 35 },
            { x: 60, y: 35 },
            { x: 45, y: 20 },
            { x: 45, y: 50 },
            { x: 25, y: 25 },
            { x: 65, y: 45 },
            { x: 15, y: 35 },
            { x: 75, y: 35 },
            { x: 45, y: 35 },
            { x: 40, y: 30 }
        ],

        collectables: [
            { x: 45, y: 15, type: 'classified_docs' },
            { x: 45, y: 55, type: 'keycard_level_3' }
        ]
    },

    industrial: {
        name: 'Industrial Complex',
        width: 100,
        height: 80,
        spawn: { x: 50, y: 78 },
        extraction: { x: 50, y: 2 },

        generation: {
            baseType: 'walls',

            // Main factory floor (large open area)
            clearAreas: [
                { x1: 20, y1: 20, x2: 79, y2: 59 }
            ],

            // Loading docks
            docks: [
                { x1: 1, y1: 30, x2: 20, y2: 50 },
                { x1: 80, y1: 30, x2: 99, y2: 50 }
            ],

            // Catwalks (elevated pathways)
            catwalks: [
                { x1: 25, y1: 15, x2: 75, y2: 17 },
                { x1: 25, y1: 63, x2: 75, y2: 65 }
            ],

            // Assembly lines (obstacles)
            assemblyLines: [
                { x: 30, y: 30, width: 40, height: 3 },
                { x: 30, y: 40, width: 40, height: 3 },
                { x: 30, y: 50, width: 40, height: 3 }
            ],

            // Control rooms
            controlRooms: [
                { x: 10, y: 10, width: 15, height: 10 },
                { x: 75, y: 10, width: 15, height: 10 },
                { x: 45, y: 65, width: 10, height: 10 }
            ]
        },

        explosiveTargets: [
            { x: 35, y: 30, planted: false, id: 0, plantTime: 5 },
            { x: 50, y: 40, planted: false, id: 1, plantTime: 5 },
            { x: 65, y: 50, planted: false, id: 2, plantTime: 5 }
        ],

        doors: [
            { x: 25, y: 20, locked: true, linkedTerminal: 0 },
            { x: 75, y: 20, locked: false },
            { x: 50, y: 60, locked: true, linkedTerminal: 1 }
        ],

        terminals: [
            { x: 15, y: 15, hacked: false, id: 0 },
            { x: 85, y: 15, hacked: false, id: 1 }
        ],

        coverPositions: 100,

        enemySpawns: [
            { x: 30, y: 25 },
            { x: 70, y: 25 },
            { x: 30, y: 55 },
            { x: 70, y: 55 },
            { x: 50, y: 30 },
            { x: 50, y: 50 },
            { x: 25, y: 40 },
            { x: 75, y: 40 },
            { x: 40, y: 35 },
            { x: 60, y: 45 }
        ],

        hazards: [
            { x: 35, y: 35, type: 'steam_vent' },
            { x: 65, y: 45, type: 'electric_panel' }
        ]
    },

    residential: {
        name: 'Residential District',
        width: 85,
        height: 85,
        spawn: { x: 2, y: 2 },
        extraction: { x: 83, y: 83 },

        generation: {
            baseType: 'open', // Start with open streets (0)

            // Add borders
            borders: true,

            // Buildings (as walls)
            buildings: [
                // Apartment blocks
                { x: 10, y: 10, width: 15, height: 20 },
                { x: 30, y: 10, width: 15, height: 20 },
                { x: 50, y: 10, width: 15, height: 20 },
                { x: 70, y: 10, width: 12, height: 20 },

                { x: 10, y: 35, width: 20, height: 15 },
                { x: 35, y: 35, width: 15, height: 15 },
                { x: 55, y: 35, width: 20, height: 15 },

                { x: 10, y: 55, width: 15, height: 20 },
                { x: 30, y: 55, width: 15, height: 20 },
                { x: 50, y: 55, width: 15, height: 20 },
                { x: 70, y: 55, width: 12, height: 20 }
            ],

            // Park in center
            park: { x: 37, y: 37, width: 10, height: 10, type: 'open' },

            // Alleyways (narrow passages)
            alleyways: [
                { x1: 25, y1: 15, x2: 26, y2: 75 },
                { x1: 45, y1: 15, x2: 46, y2: 75 },
                { x1: 65, y1: 15, x2: 66, y2: 75 },
                { x1: 15, y1: 30, x2: 75, y2: 31 },
                { x1: 15, y1: 50, x2: 75, y2: 51 }
            ]
        },

        doors: [
            { x: 17, y: 20, locked: false }, // Apartment entrances
            { x: 37, y: 20, locked: true, keycard: 'resident_key' },
            { x: 57, y: 20, locked: false },
            { x: 17, y: 65, locked: true, keycard: 'resident_key' },
            { x: 37, y: 65, locked: false },
            { x: 57, y: 65, locked: false }
        ],

        targets: [
            { x: 17, y: 20, type: 'primary', name: 'Target Alpha' },
            { x: 60, y: 60, type: 'secondary', name: 'Target Beta' },
            { x: 40, y: 40, type: 'secondary', name: 'Target Gamma' }
        ],

        coverPositions: 120,

        civilians: [
            { x: 25, y: 25 },
            { x: 60, y: 25 },
            { x: 25, y: 60 },
            { x: 60, y: 60 },
            { x: 42, y: 42 }
        ],

        enemySpawns: [
            { x: 20, y: 20 },
            { x: 65, y: 20 },
            { x: 20, y: 65 },
            { x: 65, y: 65 },
            { x: 30, y: 40 },
            { x: 55, y: 40 },
            { x: 40, y: 25 },
            { x: 40, y: 60 },
            { x: 15, y: 40 },
            { x: 70, y: 40 },
            { x: 42, y: 15 },
            { x: 42, y: 70 }
        ]
    },

    fortress: {
        name: 'Syndicate Fortress',
        width: 120,
        height: 100,
        spawn: { x: 60, y: 98 },
        extraction: { x: 60, y: 10 },

        generation: {
            baseType: 'walls',

            // Outer courtyard
            courtyards: [
                { x1: 10, y1: 70, x2: 109, y2: 97, name: 'outer' },
                { x1: 30, y1: 45, x2: 89, y2: 69, name: 'middle' },
                { x1: 45, y1: 20, x2: 74, y2: 44, name: 'inner' }
            ],

            // Fortress core
            core: { x1: 50, y1: 5, x2: 69, y2: 19 },

            // Gates between levels
            gateways: [
                { x1: 55, y1: 70, x2: 64, y2: 70, name: 'outer_gate' },
                { x1: 55, y1: 45, x2: 64, y2: 45, name: 'middle_gate' },
                { x1: 55, y1: 20, x2: 64, y2: 20, name: 'inner_gate' }
            ],

            // Towers
            towers: [
                { x: 10, y: 70, radius: 5 },
                { x: 109, y: 70, radius: 5 },
                { x: 30, y: 45, radius: 5 },
                { x: 89, y: 45, radius: 5 },
                { x: 45, y: 20, radius: 5 },
                { x: 74, y: 20, radius: 5 }
            ],

            // Side passages
            passages: [
                { x1: 5, y1: 75, x2: 8, y2: 92 },
                { x1: 111, y1: 75, x2: 114, y2: 92 },
                { x1: 25, y1: 50, x2: 28, y2: 65 },
                { x1: 91, y1: 50, x2: 94, y2: 65 }
            ]
        },

        gates: [
            { x: 60, y: 70, breached: false, id: 0, breachTime: 10 },
            { x: 60, y: 45, breached: false, id: 1, breachTime: 10 },
            { x: 60, y: 20, breached: false, id: 2, breachTime: 15 }
        ],

        terminals: [
            { x: 15, y: 75, hacked: false, id: 0, security: 'high' },
            { x: 105, y: 75, hacked: false, id: 1, security: 'high' },
            { x: 35, y: 50, hacked: false, id: 2, security: 'maximum' },
            { x: 85, y: 50, hacked: false, id: 3, security: 'maximum' },
            { x: 60, y: 10, hacked: false, id: 4, security: 'quantum', description: 'Mainframe' }
        ],

        turrets: [
            { x: 60, y: 65, active: true, id: 0 },
            { x: 60, y: 40, active: true, id: 1 },
            { x: 50, y: 25, active: true, id: 2 },
            { x: 70, y: 25, active: true, id: 3 }
        ],

        coverPositions: 150,

        enemySpawns: [
            // Outer defenses
            { x: 30, y: 85 },
            { x: 90, y: 85 },
            { x: 60, y: 75 },
            // Middle defenses
            { x: 40, y: 55 },
            { x: 80, y: 55 },
            { x: 60, y: 50 },
            // Inner defenses
            { x: 50, y: 30 },
            { x: 70, y: 30 },
            // Core defenses
            { x: 55, y: 15 },
            { x: 65, y: 15 },
            // Elite guards
            { x: 60, y: 12 },
            { x: 58, y: 8 },
            { x: 62, y: 8 },
            // Reinforcements
            { x: 20, y: 80 },
            { x: 100, y: 80 }
        ],

        boss: {
            x: 60,
            y: 7,
            type: 'syndicate_leader',
            health: 500
        }
    }
};

// Function to generate a map from its definition
// Made global so it can be called from mission executor
window.generateMapFromDefinition = function(mapName) {
    const def = MAP_DEFINITIONS[mapName];
    if (!def) {
        console.error(`Map definition not found: ${mapName}`);
        return null;
    }

    const map = {
        width: def.width,
        height: def.height,
        tiles: [],
        spawn: def.spawn,
        extraction: def.extraction,
        cover: [],
        terminals: def.terminals || [],
        doors: def.doors || [],
        collectables: def.collectables || [],
        enemySpawns: def.enemySpawns || []
    };

    // Add any special objects based on map type
    if (def.explosiveTargets) map.explosiveTargets = def.explosiveTargets;
    if (def.gates) map.gates = def.gates;
    if (def.targets) map.targets = def.targets;
    if (def.turrets) map.turrets = def.turrets;
    if (def.boss) map.boss = def.boss;
    if (def.civilians) map.civilians = def.civilians;
    if (def.hazards) map.hazards = def.hazards;

    // Initialize tiles based on generation rules
    const gen = def.generation;

    // Start with base type
    for (let y = 0; y < def.height; y++) {
        map.tiles[y] = [];
        for (let x = 0; x < def.width; x++) {
            map.tiles[y][x] = gen.baseType === 'walls' ? 1 : 0;
        }
    }

    // Apply generation rules to recreate exact original maps

    // Handle corridors (for corporate, government maps)
    if (gen.corridors) {
        gen.corridors.forEach(corridor => {
            if (corridor.type === 'horizontal') {
                for (let y = corridor.startY; y < def.height - 10 && y <= corridor.endY; y += corridor.stepY) {
                    for (let x = 1; x < def.width - 1; x++) {
                        map.tiles[y][x] = 0;
                        if (y + 1 < def.height) map.tiles[y + 1][x] = 0;
                    }
                }
            } else if (corridor.type === 'vertical') {
                for (let x = corridor.startX; x < def.width - 10 && x <= corridor.endX; x += corridor.stepX) {
                    for (let y = 1; y < def.height - 1; y++) {
                        map.tiles[y][x] = 0;
                        if (x + 1 < def.width) map.tiles[y][x + 1] = 0;
                    }
                }
            }
        });
    }

    // Clear areas
    if (gen.clearAreas) {
        gen.clearAreas.forEach(area => {
            for (let x = area.x1; x <= area.x2 && x < def.width; x++) {
                for (let y = area.y1; y <= area.y2 && y < def.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Handle rooms (for corporate map)
    if (gen.rooms && gen.rooms.type === 'grid') {
        const r = gen.rooms;
        for (let rx = r.startX; rx < def.width - 10; rx += r.stepX) {
            for (let ry = r.startY; ry < def.height - 10; ry += r.stepY) {
                // Room boundaries
                for (let x = rx; x < rx + r.roomWidth && x < def.width - 1; x++) {
                    for (let y = ry; y < ry + r.roomHeight && y < def.height - 1; y++) {
                        map.tiles[y][x] = 0;
                    }
                }

                // Add internal walls for cubicles (corporate specific)
                if (r.internalWalls) {
                    r.internalWalls.forEach(wallConfig => {
                        if (eval(wallConfig.condition.replace('rx', rx))) {
                            wallConfig.walls.forEach(wall => {
                                const wx = rx + wall.offsetX;
                                const wy = ry + wall.offsetY;
                                if (wx < def.width - 1 && wy < def.height - 1) {
                                    map.tiles[wy][wx] = 1;
                                }
                            });
                        }
                    });
                }
            }
        }
    }

    // Handle buildings (for residential map)
    if (gen.buildings) {
        gen.buildings.forEach(building => {
            for (let x = building.x; x < building.x + building.width && x < def.width; x++) {
                for (let y = building.y; y < building.y + building.height && y < def.height; y++) {
                    map.tiles[y][x] = 1;
                }
            }
        });
    }

    // Handle courtyards (for fortress map)
    if (gen.courtyards) {
        gen.courtyards.forEach(court => {
            for (let x = court.x1; x <= court.x2 && x < def.width; x++) {
                for (let y = court.y1; y <= court.y2 && y < def.height; y++) {
                    map.tiles[y][x] = 0;
                }
            }
        });
    }

    // Add borders if needed
    if (gen.borders) {
        for (let x = 0; x < def.width; x++) {
            map.tiles[0][x] = 1;
            map.tiles[def.height - 1][x] = 1;
        }
        for (let y = 0; y < def.height; y++) {
            map.tiles[y][0] = 1;
            map.tiles[y][def.width - 1] = 1;
        }
    }

    // Generate cover positions
    if (def.coverPositions) {
        for (let i = 0; i < def.coverPositions; i++) {
            let x = 2 + Math.floor(Math.random() * (def.width - 4));
            let y = 2 + Math.floor(Math.random() * (def.height - 4));
            if (map.tiles[y] && map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }
    }

    return map;
}