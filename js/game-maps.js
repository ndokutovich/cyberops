    // Enhanced Map Generation with Fog of War, Doors, Collectables
CyberOpsGame.prototype.generateMap1 = function() {
        const width = 20;
        const height = 20;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 17, y: 17 },
            cover: [],
            terminals: []
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || x === width - 1 || y === 0 || y === height - 1) ? 1 : 0;
            }
        }

        map.cover = [
            { x: 5, y: 5 }, { x: 10, y: 5 }, { x: 15, y: 5 },
            { x: 5, y: 10 }, { x: 15, y: 10 },
            { x: 5, y: 15 }, { x: 10, y: 15 }, { x: 15, y: 15 }
        ];

        return map;
}

CyberOpsGame.prototype.generateMap2 = function() {
        const width = 25;
        const height = 25;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 12 },
            extraction: { x: 22, y: 12 },
            cover: [],
            terminals: [
                { x: 8, y: 8, hacked: false },
                { x: 16, y: 8, hacked: false },
                { x: 12, y: 16, hacked: false }
            ]
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                    map.tiles[y][x] = 1;
                } else if (x === 12 && (y < 8 || y > 16)) {
                    map.tiles[y][x] = 1;
                } else if (y === 12 && (x < 5 || x > 19)) {
                    map.tiles[y][x] = 1;
                } else {
                    map.tiles[y][x] = 0;
                }
            }
        }

        for (let i = 0; i < 15; i++) {
            map.cover.push({
                x: 3 + Math.floor(Math.random() * 19),
                y: 3 + Math.floor(Math.random() * 19)
            });
        }

        return map;
}

CyberOpsGame.prototype.generateMapFromType = function(mapType) {
        // Handle both old system (actual map objects) and new system (string types)
        if (typeof mapType === 'object' && mapType.spawn) {
            return mapType; // Already a map object
        }

        // Generate map based on string type
        switch (mapType) {
            case 'corporate':
                return this.generateCorporateMap();
            case 'government':
                return this.generateGovernmentMap();
            case 'industrial':
                return this.generateIndustrialMap();
            case 'residential':
                return this.generateResidentialMap();
            case 'fortress':
                return this.generateFortressMap();
            default:
                // Fallback to basic map
                return this.generateMap1();
        }
}

// Mission 1: Data Heist - Massive corporate office complex
CyberOpsGame.prototype.generateCorporateMap = function() {
        console.log('🏢 generateCorporateMap CALLED - generating new map');
        const width = 80;
        const height = 80;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 78 },
            extraction: { x: 78, y: 2 },
            cover: [],
            terminals: [],
            doors: [],
            collectables: [],
            enemySpawns: []
        };

        // Initialize all tiles as walls
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 1;
            }
        }

        // Create main corridors
        // Horizontal main corridors
        for (let y = 10; y < height - 10; y += 15) {
            for (let x = 1; x < width - 1; x++) {
                map.tiles[y][x] = 0;
                map.tiles[y + 1][x] = 0;
            }
        }

        // Vertical main corridors
        for (let x = 10; x < width - 10; x += 15) {
            for (let y = 1; y < height - 1; y++) {
                map.tiles[y][x] = 0;
                map.tiles[y][x + 1] = 0;
            }
        }

        // CRITICAL: Clear spawn and extraction areas
        // Clear spawn area (bottom left) - EXPANDED for better access
        for (let x = 0; x <= 10; x++) {
            for (let y = 75; y <= 79; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }


        // Clear extraction area (top right)
        for (let x = 75; x <= 79; x++) {
            for (let y = 1; y <= 5; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }

        // Connect spawn to main corridor system
        for (let y = 70; y < 79; y++) {
            map.tiles[y][2] = 0;
            map.tiles[y][3] = 0;
        }
        for (let x = 2; x < 11; x++) {
            map.tiles[70][x] = 0;
        }

        // Connect extraction to main corridor system
        for (let y = 2; y < 11; y++) {
            map.tiles[y][77] = 0;
            map.tiles[y][78] = 0;
        }
        for (let x = 70; x < 79; x++) {
            map.tiles[10][x] = 0;
        }

        // Create office rooms - ORIGINAL PATTERN
        for (let rx = 5; rx < width - 10; rx += 20) {
            for (let ry = 5; ry < height - 10; ry += 20) {
                // Room boundaries
                for (let x = rx; x < rx + 12; x++) {
                    for (let y = ry; y < ry + 12; y++) {
                        if (x < width - 1 && y < height - 1) {
                            map.tiles[y][x] = 0;
                        }
                    }
                }

                // Add internal walls for cubicles
                if (rx % 40 === 5) {
                    for (let i = 2; i < 10; i += 3) {
                        if (ry + i < height - 1 && rx + 6 < width - 1) {
                            map.tiles[ry + i][rx + 6] = 1;
                        }
                    }
                }
            }
        }

        // REMOVED: The wall-adding fix was making rooms too small
        // The original code already creates rooms, we just need to ensure they stay walkable

        // Re-clear the corridors that might have been overwritten by room walls
        // Horizontal main corridors
        for (let y = 10; y < height - 10; y += 15) {
            for (let x = 1; x < width - 1; x++) {
                map.tiles[y][x] = 0;
                map.tiles[y + 1][x] = 0;
            }
        }

        // Vertical main corridors
        for (let x = 10; x < width - 10; x += 15) {
            for (let y = 1; y < height - 1; y++) {
                map.tiles[y][x] = 0;
                map.tiles[y][x + 1] = 0;
            }
        }

        // Re-clear spawn and extraction connections
        for (let y = 70; y < 79; y++) {
            map.tiles[y][2] = 0;
            map.tiles[y][3] = 0;
        }
        for (let x = 2; x < 11; x++) {
            map.tiles[70][x] = 0;
        }
        for (let y = 2; y < 11; y++) {
            map.tiles[y][77] = 0;
            map.tiles[y][78] = 0;
        }
        for (let x = 70; x < 79; x++) {
            map.tiles[10][x] = 0;
        }

        // Add doors (locked areas requiring terminal hacking) - ORIGINAL POSITIONS
        map.doors = [
            { x: 20, y: 10, locked: true, linkedTerminal: 0 },
            { x: 40, y: 10, locked: true, linkedTerminal: 1 },
            { x: 60, y: 10, locked: true, linkedTerminal: 2 },
            { x: 20, y: 40, locked: true, linkedTerminal: 0 },
            { x: 60, y: 40, locked: true, linkedTerminal: 2 },
            { x: 40, y: 70, locked: true, linkedTerminal: 1 }
        ];

        // Add terminals (hack to open doors)
        map.terminals = [
            { x: 15, y: 15, hacked: false, id: 0 },
            { x: 40, y: 40, hacked: false, id: 1 },
            { x: 50, y: 70, hacked: false, id: 2 }
        ];

        // Add cover positions throughout the map
        for (let i = 0; i < 60; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }

        // Add collectables (credits, ammo, health packs, keycards)
        const collectableTypes = ['credits', 'ammo', 'health', 'keycard', 'intel'];
        for (let i = 0; i < 20; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.collectables.push({
                    x, y,
                    type: collectableTypes[Math.floor(Math.random() * collectableTypes.length)],
                    collected: false,
                    value: 50 + Math.floor(Math.random() * 100)
                });
            }
        }

        // Enemy spawn points
        for (let i = 0; i < 12; i++) {
            let x = 10 + Math.floor(Math.random() * (width - 20));
            let y = 10 + Math.floor(Math.random() * (height - 20));
            if (map.tiles[y][x] === 0) {
                map.enemySpawns.push({ x, y });
            }
        }

        // Final debug check - Check multiple rooms
        console.log(`🔍 FINAL CHECK - All room interiors:`);
        const roomsToCheck = [
            {x: 5, y: 5, label: "Top-left"},
            {x: 25, y: 5, label: "Top-mid-left"},
            {x: 45, y: 5, label: "Top-mid-right"},
            {x: 65, y: 5, label: "Top-right"},
            {x: 5, y: 25, label: "Mid-left"},
            {x: 25, y: 25, label: "Center"},
            {x: 45, y: 25, label: "Mid-right"},
            {x: 5, y: 45, label: "Bottom-left"},
            {x: 25, y: 45, label: "Bottom-mid-left"},
            {x: 45, y: 45, label: "Bottom-mid-right"}
        ];

        roomsToCheck.forEach(room => {
            const interior = map.tiles[room.y + 1] ? map.tiles[room.y + 1][room.x + 1] : undefined;
            console.log(`  ${room.label} room (${room.x},${room.y}): interior[${room.y+1}][${room.x+1}] = ${interior} (should be 0)`);
        });

        return map;
}

// Mission 2: Network Breach - Government facility with server rooms
CyberOpsGame.prototype.generateGovernmentMap = function() {
        const width = 90;
        const height = 70;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 35 },
            extraction: { x: 88, y: 35 },
            cover: [],
            terminals: [],
            doors: [],
            collectables: [],
            enemySpawns: []
        };

        // Initialize all tiles as walls
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 1;
            }
        }

        // Create central hub
        for (let x = 35; x < 55; x++) {
            for (let y = 25; y < 45; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // Create wings extending from hub
        // North wing
        for (let y = 2; y < 25; y++) {
            for (let x = 42; x < 48; x++) {
                map.tiles[y][x] = 0;
            }
        }
        // South wing
        for (let y = 45; y < height - 2; y++) {
            for (let x = 42; x < 48; x++) {
                map.tiles[y][x] = 0;
            }
        }
        // East wing
        for (let x = 55; x < width - 2; x++) {
            for (let y = 32; y < 38; y++) {
                map.tiles[y][x] = 0;
            }
        }
        // West wing
        for (let x = 2; x < 35; x++) {
            for (let y = 32; y < 38; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // CRITICAL: Ensure spawn and extraction areas are clear
        // Clear spawn area
        for (let x = 1; x <= 4; x++) {
            for (let y = 33; y <= 37; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }
        // Clear extraction area
        for (let x = 86; x <= 89; x++) {
            for (let y = 33; y <= 37; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }

        // Create server rooms
        const serverRooms = [
            { x: 10, y: 10, w: 15, h: 10 },
            { x: 65, y: 10, w: 15, h: 10 },
            { x: 10, y: 50, w: 15, h: 10 },
            { x: 65, y: 50, w: 15, h: 10 }
        ];

        serverRooms.forEach(room => {
            for (let x = room.x; x < room.x + room.w; x++) {
                for (let y = room.y; y < room.y + room.h; y++) {
                    if (x < width - 1 && y < height - 1) {
                        map.tiles[y][x] = 0;
                    }
                }
            }
            // Connect to main corridors
            if (room.y < 35) {
                for (let y = room.y + room.h; y < 33; y++) {
                    map.tiles[y][room.x + Math.floor(room.w / 2)] = 0;
                }
            } else {
                for (let y = 37; y < room.y; y++) {
                    map.tiles[y][room.x + Math.floor(room.w / 2)] = 0;
                }
            }
        });

        // Add terminals (more than before for network breach theme)
        map.terminals = [
            { x: 17, y: 15, hacked: false, id: 0 },
            { x: 72, y: 15, hacked: false, id: 1 },
            { x: 17, y: 55, hacked: false, id: 2 },
            { x: 72, y: 55, hacked: false, id: 3 },
            { x: 45, y: 35, hacked: false, id: 4 } // Central mainframe
        ];

        // Add doors to server rooms
        map.doors = [
            { x: 17, y: 20, locked: true, linkedTerminal: 0 },
            { x: 72, y: 20, locked: true, linkedTerminal: 1 },
            { x: 17, y: 50, locked: true, linkedTerminal: 2 },
            { x: 72, y: 50, locked: true, linkedTerminal: 3 },
            { x: 35, y: 35, locked: true, linkedTerminal: 4 }, // Main vault
            { x: 55, y: 35, locked: true, linkedTerminal: 4 }
        ];

        // Add collectables with focus on intel
        for (let i = 0; i < 25; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.collectables.push({
                    x, y,
                    type: Math.random() > 0.6 ? 'intel' : ['credits', 'ammo', 'health'][Math.floor(Math.random() * 3)],
                    collected: false,
                    value: 75 + Math.floor(Math.random() * 150)
                });
            }
        }

        // Add cover
        for (let i = 0; i < 50; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }

        // Enemy spawns
        for (let i = 0; i < 10; i++) {
            let x = 10 + Math.floor(Math.random() * (width - 20));
            let y = 10 + Math.floor(Math.random() * (height - 20));
            if (map.tiles[y][x] === 0) {
                map.enemySpawns.push({ x, y });
            }
        }

        return map;
}

// Mission 3: Sabotage Operation - Industrial complex with machinery
CyberOpsGame.prototype.generateIndustrialMap = function() {
        const width = 100;
        const height = 80;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 50, y: 78 },
            extraction: { x: 50, y: 2 },
            cover: [],
            terminals: [],
            doors: [],
            collectables: [],
            explosiveTargets: [],
            enemySpawns: []
        };

        // Initialize all tiles as walls
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 1;
            }
        }

        // Create main factory floor (large open area)
        for (let x = 20; x < 80; x++) {
            for (let y = 20; y < 60; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // Create machinery blocks (obstacles within factory)
        const machines = [
            { x: 30, y: 30, w: 8, h: 8 },
            { x: 45, y: 25, w: 10, h: 6 },
            { x: 62, y: 32, w: 8, h: 8 },
            { x: 35, y: 45, w: 6, h: 10 },
            { x: 55, y: 48, w: 10, h: 6 }
        ];

        machines.forEach(m => {
            for (let x = m.x; x < m.x + m.w; x++) {
                for (let y = m.y; y < m.y + m.h; y++) {
                    if (x < width && y < height) {
                        map.tiles[y][x] = 1;
                    }
                }
            }
        });

        // Create side rooms and corridors
        // Left maintenance area
        for (let x = 2; x < 20; x++) {
            for (let y = 10; y < 70; y++) {
                if (y % 10 < 6) map.tiles[y][x] = 0;
            }
        }
        // Right storage area
        for (let x = 80; x < width - 2; x++) {
            for (let y = 10; y < 70; y++) {
                if (y % 10 < 6) map.tiles[y][x] = 0;
            }
        }

        // Create catwalks (upper level paths)
        for (let y = 10; y < 15; y++) {
            for (let x = 10; x < width - 10; x++) {
                map.tiles[y][x] = 0;
            }
        }
        for (let y = 65; y < 70; y++) {
            for (let x = 10; x < width - 10; x++) {
                map.tiles[y][x] = 0;
            }
        }

        // CRITICAL: Clear spawn and extraction areas
        // Clear spawn area (bottom center)
        for (let x = 48; x <= 52; x++) {
            for (let y = 76; y <= 79; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }
        // Connect spawn to main area
        for (let y = 60; y < 79; y++) {
            map.tiles[y][50] = 0;
            map.tiles[y][51] = 0;
        }

        // Clear extraction area (top center)
        for (let x = 48; x <= 52; x++) {
            for (let y = 1; y <= 3; y++) {
                if (y < height && x < width) {
                    map.tiles[y][x] = 0;
                }
            }
        }
        // Connect extraction to main area
        for (let y = 2; y < 20; y++) {
            map.tiles[y][50] = 0;
            map.tiles[y][51] = 0;
        }

        // Add explosive targets (mission objective)
        map.explosiveTargets = [
            { x: 34, y: 34, planted: false, id: 0 },
            { x: 50, y: 28, planted: false, id: 1 },
            { x: 66, y: 36, planted: false, id: 2 }
        ];

        // Add terminals
        map.terminals = [
            { x: 10, y: 40, hacked: false, id: 0 },
            { x: 50, y: 40, hacked: false, id: 1 },
            { x: 90, y: 40, hacked: false, id: 2 }
        ];

        // Add security doors
        map.doors = [
            { x: 20, y: 40, locked: true, linkedTerminal: 0 },
            { x: 80, y: 40, locked: true, linkedTerminal: 2 },
            { x: 50, y: 20, locked: true, linkedTerminal: 1 },
            { x: 50, y: 60, locked: true, linkedTerminal: 1 }
        ];

        // Add industrial-themed collectables
        for (let i = 0; i < 30; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.collectables.push({
                    x, y,
                    type: ['credits', 'ammo', 'health', 'explosives'][Math.floor(Math.random() * 4)],
                    collected: false,
                    value: 100 + Math.floor(Math.random() * 200)
                });
            }
        }

        // Add heavy cover (crates, barrels)
        for (let i = 0; i < 80; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }

        // Enemy spawns (more enemies for sabotage mission)
        for (let i = 0; i < 15; i++) {
            let x = 10 + Math.floor(Math.random() * (width - 20));
            let y = 10 + Math.floor(Math.random() * (height - 20));
            if (map.tiles[y][x] === 0) {
                map.enemySpawns.push({ x, y });
            }
        }

        return map;
}

// Mission 4: Assassination Contract - Residential district with buildings
CyberOpsGame.prototype.generateResidentialMap = function() {
        const width = 85;
        const height = 85;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 83, y: 83 },
            cover: [],
            terminals: [],
            doors: [],
            collectables: [],
            targets: [],
            enemySpawns: []
        };

        // Initialize all tiles as open (streets)
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 0;
            }
        }

        // Add map borders
        for (let x = 0; x < width; x++) {
            map.tiles[0][x] = 1;
            map.tiles[height - 1][x] = 1;
        }
        for (let y = 0; y < height; y++) {
            map.tiles[y][0] = 1;
            map.tiles[y][width - 1] = 1;
        }

        // CRITICAL: Ensure spawn and extraction areas are clear
        // Clear spawn area (top left corner)
        for (let x = 1; x <= 4; x++) {
            for (let y = 1; y <= 4; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // Clear extraction area (bottom right corner)
        for (let x = 81; x <= 84; x++) {
            for (let y = 81; y <= 84; y++) {
                if (x < width && y < height) {
                    map.tiles[y][x] = 0;
                }
            }
        }

        // Create city blocks (buildings)
        const buildings = [];
        for (let bx = 5; bx < width - 15; bx += 20) {
            for (let by = 5; by < height - 15; by += 20) {
                const buildingW = 12 + Math.floor(Math.random() * 6);
                const buildingH = 12 + Math.floor(Math.random() * 6);

                buildings.push({ x: bx, y: by, w: buildingW, h: buildingH });

                // Create building walls
                for (let x = bx; x < bx + buildingW && x < width - 1; x++) {
                    for (let y = by; y < by + buildingH && y < height - 1; y++) {
                        // Outer walls
                        if (x === bx || x === bx + buildingW - 1 ||
                            y === by || y === by + buildingH - 1) {
                            map.tiles[y][x] = 1;
                        }
                    }
                }

                // Create rooms inside buildings
                const roomsX = Math.floor(buildingW / 6);
                const roomsY = Math.floor(buildingH / 6);
                for (let rx = 0; rx < roomsX; rx++) {
                    for (let ry = 0; ry < roomsY; ry++) {
                        const wallX = bx + (rx + 1) * 6;
                        const wallY = by + (ry + 1) * 6;
                        if (wallX < bx + buildingW - 1 && wallY < by + buildingH - 1) {
                            // Room walls
                            for (let i = 0; i < 6; i++) {
                                if (wallX < width - 1 && by + i < height - 1) {
                                    map.tiles[by + i][wallX] = 1;
                                }
                                if (bx + i < width - 1 && wallY < height - 1) {
                                    map.tiles[wallY][bx + i] = 1;
                                }
                            }
                        }
                    }
                }

                // Create doorways
                const doorX = bx + Math.floor(buildingW / 2);
                const doorY = by + buildingH - 1;
                if (doorY < height - 1) {
                    map.tiles[doorY][doorX] = 0;
                    if (doorX + 1 < width - 1) map.tiles[doorY][doorX + 1] = 0;
                }
            }
        }

        // Add assassination targets
        map.targets = [
            { x: 25, y: 25, type: 'primary', eliminated: false },
            { x: 60, y: 25, type: 'secondary', eliminated: false },
            { x: 42, y: 60, type: 'secondary', eliminated: false }
        ];

        // Add terminals for security systems
        map.terminals = [
            { x: 20, y: 20, hacked: false, id: 0 },
            { x: 65, y: 20, hacked: false, id: 1 },
            { x: 42, y: 50, hacked: false, id: 2 }
        ];

        // Add doors (building entrances)
        buildings.forEach((b, idx) => {
            if (idx < 6) {
                map.doors.push({
                    x: b.x + Math.floor(b.w / 2),
                    y: b.y + b.h - 1,
                    locked: true,
                    linkedTerminal: idx % 3
                });
            }
        });

        // Add urban collectables
        for (let i = 0; i < 25; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.collectables.push({
                    x, y,
                    type: ['credits', 'ammo', 'health', 'intel', 'keycard'][Math.floor(Math.random() * 5)],
                    collected: false,
                    value: 50 + Math.floor(Math.random() * 150)
                });
            }
        }

        // Add urban cover (cars, dumpsters, etc.)
        for (let i = 0; i < 70; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }

        // Enemy spawns (guards and witnesses)
        for (let i = 0; i < 18; i++) {
            let x = 5 + Math.floor(Math.random() * (width - 10));
            let y = 5 + Math.floor(Math.random() * (height - 10));
            if (map.tiles[y][x] === 0) {
                map.enemySpawns.push({ x, y });
            }
        }

        return map;
}

// Mission 5: Final Convergence - Fortress compound
CyberOpsGame.prototype.generateFortressMap = function() {
        const width = 120;
        const height = 100;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 60, y: 98 },
            extraction: { x: 60, y: 10 },
            cover: [],
            terminals: [],
            doors: [],
            collectables: [],
            gates: [],
            enemySpawns: []
        };

        // Initialize all tiles as walls
        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = 1;
            }
        }

        // Create outer courtyard
        for (let x = 10; x < width - 10; x++) {
            for (let y = 70; y < height - 2; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // CRITICAL: Ensure spawn area is clear (bottom center)
        for (let x = 58; x <= 62; x++) {
            for (let y = 96; y <= 99; y++) {
                if (x < width && y < height) {
                    map.tiles[y][x] = 0;
                }
            }
        }

        // CRITICAL: Ensure extraction area is clear (top center in inner sanctum)
        for (let x = 58; x <= 62; x++) {
            for (let y = 8; y <= 12; y++) {
                if (x < width && y < height) {
                    map.tiles[y][x] = 0;
                }
            }
        }

        // Create middle defensive layer
        for (let x = 20; x < width - 20; x++) {
            for (let y = 40; y < 70; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // Create inner sanctum
        for (let x = 30; x < width - 30; x++) {
            for (let y = 10; y < 40; y++) {
                map.tiles[y][x] = 0;
            }
        }

        // Add defensive walls between layers
        for (let x = 10; x < width - 10; x++) {
            map.tiles[70][x] = 1;
            map.tiles[40][x] = 1;
        }

        // Create gate passages
        // Outer gates
        for (let x = 55; x < 65; x++) {
            map.tiles[70][x] = 0;
        }
        // Inner gates
        for (let x = 55; x < 65; x++) {
            map.tiles[40][x] = 0;
        }

        // Create bunkers and fortifications
        const bunkers = [
            { x: 25, y: 75, w: 10, h: 10 },
            { x: 85, y: 75, w: 10, h: 10 },
            { x: 25, y: 45, w: 10, h: 10 },
            { x: 85, y: 45, w: 10, h: 10 },
            { x: 55, y: 20, w: 10, h: 10 } // Central command
        ];

        bunkers.forEach(b => {
            for (let x = b.x; x < b.x + b.w; x++) {
                for (let y = b.y; y < b.y + b.h; y++) {
                    if (x < width - 1 && y < height - 1) {
                        // Create room with entrance
                        if (x === b.x || x === b.x + b.w - 1 ||
                            y === b.y || y === b.y + b.h - 1) {
                            map.tiles[y][x] = 1;
                        } else {
                            map.tiles[y][x] = 0;
                        }
                    }
                }
            }
            // Add entrance
            map.tiles[b.y + Math.floor(b.h / 2)][b.x] = 0;
        });

        // Create maze-like passages in inner sanctum
        for (let i = 0; i < 10; i++) {
            const startX = 35 + Math.floor(Math.random() * 40);
            const startY = 15 + Math.floor(Math.random() * 20);
            const length = 5 + Math.floor(Math.random() * 10);
            const horizontal = Math.random() > 0.5;

            if (horizontal) {
                for (let x = startX; x < startX + length && x < width - 31; x++) {
                    map.tiles[startY][x] = 1;
                }
            } else {
                for (let y = startY; y < startY + length && y < 39; y++) {
                    map.tiles[y][startX] = 1;
                }
            }
        }

        // Add gates (mission objectives)
        map.gates = [
            { x: 60, y: 70, breached: false, id: 0 }, // Outer gate
            { x: 60, y: 40, breached: false, id: 1 }, // Inner gate
            { x: 60, y: 25, breached: false, id: 2 }  // Command center
        ];

        // Add terminals (hack to control sectors)
        map.terminals = [
            { x: 30, y: 80, hacked: false, id: 0 }, // Outer control
            { x: 90, y: 80, hacked: false, id: 1 }, // Outer control
            { x: 30, y: 50, hacked: false, id: 2 }, // Middle control
            { x: 90, y: 50, hacked: false, id: 3 }, // Middle control
            { x: 60, y: 25, hacked: false, id: 4 }  // Mainframe
        ];

        // Add heavy security doors
        map.doors = [
            { x: 60, y: 70, locked: true, linkedTerminal: 0 },
            { x: 60, y: 40, locked: true, linkedTerminal: 2 },
            { x: 30, y: 55, locked: true, linkedTerminal: 2 },
            { x: 90, y: 55, locked: true, linkedTerminal: 3 },
            { x: 60, y: 30, locked: true, linkedTerminal: 4 }
        ];

        // Add high-value collectables
        for (let i = 0; i < 40; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.collectables.push({
                    x, y,
                    type: ['credits', 'ammo', 'health', 'intel', 'keycard', 'armor'][Math.floor(Math.random() * 6)],
                    collected: false,
                    value: 200 + Math.floor(Math.random() * 300)
                });
            }
        }

        // Add fortified cover positions
        for (let i = 0; i < 100; i++) {
            let x = 2 + Math.floor(Math.random() * (width - 4));
            let y = 2 + Math.floor(Math.random() * (height - 4));
            if (map.tiles[y][x] === 0) {
                map.cover.push({ x, y });
            }
        }

        // Enemy spawns (heavy resistance)
        for (let i = 0; i < 25; i++) {
            let x = 10 + Math.floor(Math.random() * (width - 20));
            let y = 10 + Math.floor(Math.random() * (height - 20));
            if (map.tiles[y][x] === 0) {
                map.enemySpawns.push({ x, y });
            }
        }

        return map;
}