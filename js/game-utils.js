// Select agent for RPG character sheet
CyberOpsGame.prototype.selectRPGAgent = function(agentId) {

    // Initialize logger if needed
    if (!this.logger && window.Logger) {
        this.logger = new window.Logger('GameUtils');
    }
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

// Computed property for campaignEnemyTypes - flows from ContentLoader
Object.defineProperty(CyberOpsGame.prototype, 'campaignEnemyTypes', {
    get: function() {
        if (window.ContentLoader && window.ContentLoader.currentCampaign) {
            // Handle both 'enemies' (from config) and 'enemyTypes' (from content)
            const result = window.ContentLoader.currentCampaign.enemies ||
                   window.ContentLoader.currentCampaign.enemyTypes ||
                   [];
            if (this.logger && result.length === 0) {
                this.logger.debug('🐛 campaignEnemyTypes getter: ContentLoader.currentCampaign exists but no enemies');
                this.logger.debug('🐛 currentCampaign.enemies:', window.ContentLoader.currentCampaign.enemies);
                this.logger.debug('🐛 currentCampaign.enemyTypes:', window.ContentLoader.currentCampaign.enemyTypes);
            }
            return result;
        }
        if (this.logger) {
            this.logger.debug('🐛 campaignEnemyTypes getter: ContentLoader or currentCampaign missing');
        }
        return [];
    },
    enumerable: true,
    configurable: true
});

// Getter and setter for selectedAgent with logging
Object.defineProperty(CyberOpsGame.prototype, 'selectedAgent', {
    get: function() {
        return this._selectedAgent;
    },
    set: function(value) {
        const oldValue = this._selectedAgent;
        this._selectedAgent = value;

        if (this.logger) this.logger.debug('🎯 selectedAgent SETTER called:', {
            from: oldValue ? oldValue.name : 'none',
            to: value ? value.name : 'none',
            stack: new Error().stack.split('\n')[1] // Show where it was called from
        });

        // CRITICAL: Track when selection is being cleared
        if (value === null && oldValue !== null) {
            if (this.logger) this.logger.error('🚨 SELECTION BEING CLEARED!', {
                previousAgent: oldValue.name,
                callStack: new Error().stack
            });

            // PROTECTION: Prevent accidental clearing during normal gameplay
            if (this.selectionProtection && this.currentScreen === 'game') {
                if (this.logger) this.logger.warn('🛡️ SELECTION PROTECTION: Preventing clear during gameplay!');
                // Don't actually clear - keep the old value
                this._selectedAgent = oldValue;
                return;
            }
        }

        // CRITICAL: Sync the .selected flag on agent objects
        // Movement code checks agent.selected, not just _selectedAgent
        if (this.agents && Array.isArray(this.agents)) {
            this.agents.forEach(agent => {
                // Use ID comparison instead of reference equality
                // because this.agents is a computed property that returns new array each time
                if (value) {
                    agent.selected = (agent.id === value.id || agent.name === value.name);
                } else {
                    agent.selected = false;
                }
            });
        }
    }
});

// Check if an agent is selected (unidirectional - reads from _selectedAgent only)
CyberOpsGame.prototype.isAgentSelected = function(agent) {
    if (!this._selectedAgent) return false;
    return agent.id === this._selectedAgent.id || agent.name === this._selectedAgent.name;
};

CyberOpsGame.prototype.resizeCanvas = function() {
    if (this.canvas) {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
}