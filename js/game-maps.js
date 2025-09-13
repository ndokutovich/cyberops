    // Map Generation
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

CyberOpsGame.prototype.generateCorporateMap = function() {
        const width = 22;
        const height = 22;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 19, y: 19 },
            cover: [],
            terminals: []
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }

        // Add office cubicles as cover
        for (let i = 0; i < 8; i++) {
            map.cover.push({
                x: 5 + (i % 3) * 5,
                y: 5 + Math.floor(i / 3) * 4
            });
        }

        return map;
}

CyberOpsGame.prototype.generateGovernmentMap = function() {
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
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }

        // Add security barriers as cover
        for (let i = 0; i < 6; i++) {
            map.cover.push({
                x: 6 + (i % 2) * 12,
                y: 6 + Math.floor(i / 2) * 6
            });
        }

        return map;
}

CyberOpsGame.prototype.generateIndustrialMap = function() {
        const width = 28;
        const height = 20;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 25, y: 17 },
            cover: [],
            terminals: [],
            explosiveTargets: [
                { x: 20, y: 6, planted: false, name: "Power Generator" },
                { x: 15, y: 10, planted: false, name: "Control Panel" },
                { x: 22, y: 14, planted: false, name: "Main Server" }
            ]
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }

        // Add industrial machinery as cover
        for (let i = 0; i < 12; i++) {
            map.cover.push({
                x: 4 + (i % 4) * 6,
                y: 4 + Math.floor(i / 4) * 4
            });
        }

        return map;
}

CyberOpsGame.prototype.generateResidentialMap = function() {
        const width = 30;
        const height = 25;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 2 },
            extraction: { x: 27, y: 22 },
            cover: [],
            terminals: [],
            targets: [
                { x: 20, y: 12, eliminated: false, name: "Primary Target", type: "primary" },
                { x: 15, y: 8, eliminated: false, name: "Secondary Target A", type: "secondary" },
                { x: 25, y: 16, eliminated: false, name: "Secondary Target B", type: "secondary" }
            ]
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }

        // Add houses and gardens as cover
        for (let i = 0; i < 15; i++) {
            map.cover.push({
                x: 4 + (i % 5) * 5,
                y: 4 + Math.floor(i / 5) * 6
            });
        }

        return map;
}

CyberOpsGame.prototype.generateFortressMap = function() {
        const width = 35;
        const height = 30;
        const map = {
            width, height,
            tiles: [],
            spawn: { x: 2, y: 15 },
            extraction: { x: 32, y: 15 },
            cover: [],
            terminals: [
                { x: 30, y: 12, hacked: false, name: "Sector Alpha Control" },
                { x: 30, y: 18, hacked: false, name: "Sector Beta Control" },
                { x: 28, y: 15, hacked: false, name: "Main Mainframe" }
            ],
            gates: [
                { x: 10, y: 15, breached: false, name: "Main Gate" }
            ]
        };

        for (let y = 0; y < height; y++) {
            map.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                map.tiles[y][x] = (x === 0 || y === 0 || x === width-1 || y === height-1) ? 1 : 0;
            }
        }

        // Add fortress walls and defensive positions
        for (let i = 0; i < 20; i++) {
            map.cover.push({
                x: 5 + (i % 5) * 5,
                y: 5 + Math.floor(i / 5) * 5
            });
        }

        return map;
}