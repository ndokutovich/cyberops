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

CyberOpsGame.prototype.resizeCanvas = function() {
    if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
}