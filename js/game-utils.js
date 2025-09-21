// Select agent for RPG character sheet
CyberOpsGame.prototype.selectRPGAgent = function(agentId) {
    const agent = this.activeAgents.find(a => a.id === parseInt(agentId));
    if (agent) {
        this.selectedRPGAgent = agent;
        // Refresh dialog if open
        if (this.dialogEngine && this.dialogEngine.currentState) {
            const currentStateId = this.dialogEngine.currentState.id;
            if (currentStateId && currentStateId.includes('character')) {
                this.dialogEngine.renderState(currentStateId, this.dialogEngine.stateData);
            }
        }
    }
};

// Getter and setter for selectedAgent with logging
Object.defineProperty(CyberOpsGame.prototype, 'selectedAgent', {
    get: function() {
        return this._selectedAgent;
    },
    set: function(value) {
        const oldValue = this._selectedAgent;
        this._selectedAgent = value;

        console.log('🎯 selectedAgent SETTER called:', {
            from: oldValue ? oldValue.name : 'none',
            to: value ? value.name : 'none',
            stack: new Error().stack.split('\n')[1] // Show where it was called from
        });

        // CRITICAL: Track when selection is being cleared
        if (value === null && oldValue !== null) {
            console.error('🚨 SELECTION BEING CLEARED!', {
                previousAgent: oldValue.name,
                callStack: new Error().stack
            });

            // PROTECTION: Prevent accidental clearing during normal gameplay
            if (this.selectionProtection && this.currentScreen === 'game') {
                console.warn('🛡️ SELECTION PROTECTION: Preventing clear during gameplay!');
                // Don't actually clear - keep the old value
                this._selectedAgent = oldValue;
                return;
            }
        }
    }
});

// Resource getters/setters that redirect to ResourceService
Object.defineProperty(CyberOpsGame.prototype, 'credits', {
    get: function() {
        if (this.gameServices?.resourceService) {
            return this.gameServices.resourceService.get('credits');
        }
        return this._credits || 0;
    },
    set: function(value) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.set('credits', value, 'direct assignment');
        } else {
            this._credits = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'researchPoints', {
    get: function() {
        if (this.gameServices?.resourceService) {
            return this.gameServices.resourceService.get('researchPoints');
        }
        return this._researchPoints || 0;
    },
    set: function(value) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.set('researchPoints', value, 'direct assignment');
        } else {
            this._researchPoints = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'worldControl', {
    get: function() {
        if (this.gameServices?.resourceService) {
            return this.gameServices.resourceService.get('worldControl');
        }
        return this._worldControl || 0;
    },
    set: function(value) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.set('worldControl', value, 'direct assignment');
        } else {
            this._worldControl = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'intel', {
    get: function() {
        if (this.gameServices?.resourceService) {
            return this.gameServices.resourceService.get('intel');
        }
        return this._intel || 0;
    },
    set: function(value) {
        if (this.gameServices?.resourceService) {
            this.gameServices.resourceService.set('intel', value, 'direct assignment');
        } else {
            this._intel = value;
        }
    }
});

// Agent getters/setters that redirect to AgentService
Object.defineProperty(CyberOpsGame.prototype, 'activeAgents', {
    get: function() {
        if (this.gameServices?.agentService) {
            return this.gameServices.agentService.getActiveAgents();
        }
        return this._activeAgents || [];
    },
    set: function(value) {
        if (this.gameServices?.agentService) {
            // Replace all active agents
            this.gameServices.agentService.activeAgents = value;
        } else {
            this._activeAgents = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'availableAgents', {
    get: function() {
        if (this.gameServices?.agentService) {
            return this.gameServices.agentService.getAvailableAgents();
        }
        return this._availableAgents || [];
    },
    set: function(value) {
        if (this.gameServices?.agentService) {
            // Replace all available agents
            this.gameServices.agentService.availableAgents = value;
        } else {
            this._availableAgents = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'fallenAgents', {
    get: function() {
        if (this.gameServices?.agentService) {
            return this.gameServices.agentService.getFallenAgents();
        }
        return this._fallenAgents || [];
    },
    set: function(value) {
        if (this.gameServices?.agentService) {
            // Replace all fallen agents
            this.gameServices.agentService.fallenAgents = value;
        } else {
            this._fallenAgents = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'selectedAgents', {
    get: function() {
        if (this.gameServices?.agentService) {
            return this.gameServices.agentService.getSelectedAgents();
        }
        return this._selectedAgents || [];
    },
    set: function(value) {
        if (this.gameServices?.agentService && Array.isArray(value)) {
            // Select agents by their IDs/objects
            const agentIds = value.map(a => typeof a === 'object' ? (a.id || a.name) : a);
            this.gameServices.agentService.selectAgentsForMission(agentIds);
        } else {
            this._selectedAgents = value;
        }
    }
});

// Camera getters/setters that redirect to CameraService
Object.defineProperty(CyberOpsGame.prototype, 'cameraX', {
    get: function() {
        if (this.gameServices?.cameraService) {
            return -this.gameServices.cameraService.x; // Negative because camera moves opposite to world
        }
        return this._cameraX || 0;
    },
    set: function(value) {
        if (this.gameServices?.cameraService) {
            this.gameServices.cameraService.x = -value; // Negative because camera moves opposite to world
        } else {
            this._cameraX = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'cameraY', {
    get: function() {
        if (this.gameServices?.cameraService) {
            return -this.gameServices.cameraService.y; // Negative because camera moves opposite to world
        }
        return this._cameraY || 0;
    },
    set: function(value) {
        if (this.gameServices?.cameraService) {
            this.gameServices.cameraService.y = -value; // Negative because camera moves opposite to world
        } else {
            this._cameraY = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'zoom', {
    get: function() {
        if (this.gameServices?.cameraService) {
            return this.gameServices.cameraService.zoom;
        }
        return this._zoom || 1;
    },
    set: function(value) {
        if (this.gameServices?.cameraService) {
            this.gameServices.cameraService.zoom = value;
        } else {
            this._zoom = value;
        }
    }
});

// Map getters/setters that redirect to MapService
Object.defineProperty(CyberOpsGame.prototype, 'map', {
    get: function() {
        if (this.gameServices?.mapService) {
            // Return a compatible map object
            return {
                width: this.gameServices.mapService.width,
                height: this.gameServices.mapService.height,
                tiles: this.gameServices.mapService.tiles,
                spawn: this.gameServices.mapService.spawn,
                extraction: this.gameServices.mapService.extraction,
                terminals: this.gameServices.mapService.terminals,
                doors: this.gameServices.mapService.doors,
                explosives: this.gameServices.mapService.explosives,
                switches: this.gameServices.mapService.switches,
                gates: this.gameServices.mapService.gates,
                collectibles: this.gameServices.mapService.collectibles,
                waypoints: this.gameServices.mapService.waypoints
            };
        }
        return this._map || null;
    },
    set: function(value) {
        if (this.gameServices?.mapService && value) {
            // Load map into service
            this.gameServices.mapService.loadMap(value);
        } else {
            this._map = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'fogOfWar', {
    get: function() {
        if (this.gameServices?.mapService) {
            return this.gameServices.mapService.fogOfWar;
        }
        return this._fogOfWar || null;
    },
    set: function(value) {
        if (this.gameServices?.mapService) {
            this.gameServices.mapService.fogOfWar = value;
        } else {
            this._fogOfWar = value;
        }
    }
});

Object.defineProperty(CyberOpsGame.prototype, 'fogEnabled', {
    get: function() {
        if (this.gameServices?.mapService) {
            return this.gameServices.mapService.fogEnabled;
        }
        return this._fogEnabled !== undefined ? this._fogEnabled : true;
    },
    set: function(value) {
        if (this.gameServices?.mapService) {
            this.gameServices.mapService.setFogEnabled(value);
        } else {
            this._fogEnabled = value;
        }
    }
});

// Redirect isWalkable to MapService if available
CyberOpsGame.prototype.isWalkable = function(x, y) {
    if (this.gameServices?.mapService) {
        return this.gameServices.mapService.isWalkable(x, y);
    }
    // Fallback to original implementation (from game-loop.js)
    // This will be overridden by the actual implementation in game-loop.js if MapService isn't available
    return false;
}

// Redirect canMoveTo to MapService if available
CyberOpsGame.prototype.canMoveTo = function(fromX, fromY, toX, toY) {
    if (this.gameServices?.mapService) {
        return this.gameServices.mapService.canMoveTo(fromX, fromY, toX, toY);
    }
    // Fallback will be provided by game-loop.js
    return false;
}

// Provide backward compatibility for projectiles array
Object.defineProperty(CyberOpsGame.prototype, 'projectiles', {
    get: function() {
        if (this.gameServices?.projectileService) {
            return this.gameServices.projectileService.projectiles;
        }
        return this._projectiles || [];
    },
    set: function(value) {
        if (this.gameServices?.projectileService) {
            this.gameServices.projectileService.projectiles = value;
        } else {
            this._projectiles = value;
        }
    }
});

// Provide backward compatibility for animatingTiles array
Object.defineProperty(CyberOpsGame.prototype, 'animatingTiles', {
    get: function() {
        // AnimationService tracks animations differently
        // Return empty array for compatibility
        return [];
    },
    set: function(value) {
        // Legacy code may try to set this, ignore it
    }
});

CyberOpsGame.prototype.resizeCanvas = function() {
    if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Update camera viewport if service exists
        if (this.gameServices?.cameraService) {
            this.gameServices.cameraService.setViewport(window.innerWidth, window.innerHeight);
        }
    }
}