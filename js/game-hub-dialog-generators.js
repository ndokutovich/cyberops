// ============= Dialog Manager Content Generators for Hub =============
// This file contains the content generation functions for the new 4-level DialogManager

// Generate Squad Management content for DialogManager
CyberOpsGame.prototype.generateSquadContent = function() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">SQUAD OVERVIEW</h3>';

        if (this.activeAgents.length === 0) {
            content += '<p style="color: #ff6666;">No agents in squad. Hire agents to build your team.</p>';
        } else {
            this.activeAgents.forEach((agent, index) => {
                content += `
                    <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 5px; border: 1px solid #00ffff;">
                        <div style="font-weight: bold; color: #00ff00; margin-bottom: 5px;">
                            ${agent.name} - ${agent.role || 'Operative'}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div>Health: ${agent.health}/${agent.maxHealth || 100}</div>
                            <div>Accuracy: ${agent.accuracy || 70}%</div>
                            <div>Damage: ${agent.damage || 25}</div>
                            <div>Speed: ${agent.speed || 4}</div>
                        </div>
                        <div style="margin-top: 10px;">
                            <button class="squad-action-btn" data-action="equip" data-agent="${index}"
                                    style="padding: 5px 10px; background: rgba(0,255,255,0.2); border: 1px solid #00ffff; color: #00ffff; cursor: pointer; margin-right: 5px;">
                                Equip
                            </button>
                            <button class="squad-action-btn" data-action="dismiss" data-agent="${index}"
                                    style="padding: 5px 10px; background: rgba(255,0,0,0.2); border: 1px solid #ff6666; color: #ff6666; cursor: pointer;">
                                Dismiss
                            </button>
                        </div>
                    </div>
                `;
            });
        }

        content += '</div>';
        return content;
}

// Generate Hiring content for DialogManager
CyberOpsGame.prototype.generateHiringContent = function() {
        const availableAgents = this.getAvailableAgents();
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">AVAILABLE AGENTS</h3>';
        content += `<p style="color: #ffff00; margin-bottom: 10px;">Credits: ${this.credits}</p>`;

        if (!availableAgents || availableAgents.length === 0) {
            content += '<p style="color: #ff6666;">No agents available for hire. Check back later.</p>';
        } else {
            availableAgents.forEach(agent => {
                const canAfford = this.credits >= agent.cost;
                content += `
                    <div style="background: rgba(0,255,255,0.1); padding: 10px; margin: 10px 0; border-radius: 5px; border: 1px solid ${canAfford ? '#00ffff' : '#666'};">
                        <div style="font-weight: bold; color: ${canAfford ? '#00ff00' : '#999'}; margin-bottom: 5px;">
                            ${agent.name} - ${agent.cost} credits
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: ${canAfford ? '#fff' : '#999'};">
                            <div>Health: ${agent.health}</div>
                            <div>Accuracy: ${agent.accuracy || 70}%</div>
                            <div>Damage: ${agent.damage || 25}</div>
                            <div>Speed: ${agent.speed || 4}</div>
                        </div>
                        ${canAfford ?
                            `<button class="hire-action-btn" data-agent-id="${agent.id}"
                                    style="margin-top: 10px; padding: 5px 15px; background: rgba(0,255,255,0.2); border: 1px solid #00ffff; color: #00ffff; cursor: pointer;">
                                HIRE
                            </button>` :
                            `<div style="margin-top: 10px; color: #ff6666;">Insufficient funds</div>`
                        }
                    </div>
                `;
            });
        }

        content += '</div>';

        // Add event listeners after render
        setTimeout(() => {
            document.querySelectorAll('.hire-action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const agentId = parseInt(e.target.dataset.agentId);
                    this.hireAgent(agentId);
                    // Refresh the dialog content
                    const currentDialog = window.dialogManager.getCurrentDialog();
                    if (currentDialog && currentDialog.modal) {
                        currentDialog.modal.update({
                            content: this.generateHiringContent()
                        });
                    }
                });
            });
        }, 100);

        return content;
}

// Generate Training Center content for DialogManager
CyberOpsGame.prototype.generateTrainingContent = function() {
        let content = '<div style="max-height: 400px; overflow-y: auto;">';
        content += '<h3 style="color: #00ffff; margin-bottom: 15px;">TRAINING CENTER</h3>';
        content += '<p style="color: #ffff00; margin-bottom: 15px;">Improve your agents\' skills and abilities</p>';

        if (this.activeAgents.length === 0) {
            content += '<p style="color: #ff6666;">No agents to train. Hire agents first.</p>';
        } else {
            content += '<div style="background: rgba(0,255,255,0.05); padding: 15px; border-radius: 5px; border: 1px solid #00ffff;">';
            content += '<h4 style="color: #00ff00; margin-bottom: 10px;">Available Training Programs</h4>';

            const trainingPrograms = [
                { name: 'Marksmanship', cost: 500, effect: 'Accuracy +10%', stat: 'accuracy' },
                { name: 'Combat Training', cost: 750, effect: 'Damage +5', stat: 'damage' },
                { name: 'Athletics', cost: 600, effect: 'Speed +1', stat: 'speed' },
                { name: 'Field Medicine', cost: 1000, effect: 'Health +20', stat: 'health' }
            ];

            trainingPrograms.forEach(program => {
                const canAfford = this.credits >= program.cost;
                content += `
                    <div style="background: rgba(255,255,255,0.05); padding: 10px; margin: 10px 0; border-radius: 3px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="color: #00ffff;">${program.name}</strong>
                                <div style="color: #aaa; font-size: 0.9em;">${program.effect}</div>
                                <div style="color: #ffff00;">Cost: ${program.cost} credits</div>
                            </div>
                            ${canAfford ?
                                `<button class="train-action-btn" data-program="${program.stat}" data-cost="${program.cost}"
                                        style="padding: 5px 15px; background: rgba(0,255,255,0.2); border: 1px solid #00ffff; color: #00ffff; cursor: pointer;">
                                    TRAIN ALL
                                </button>` :
                                `<div style="color: #ff6666;">Insufficient funds</div>`
                            }
                        </div>
                    </div>
                `;
            });

            content += '</div>';
        }

        content += '</div>';

        // Add event listeners after render
        setTimeout(() => {
            document.querySelectorAll('.train-action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const stat = e.target.dataset.program;
                    const cost = parseInt(e.target.dataset.cost);
                    if (this.credits >= cost) {
                        this.credits -= cost;
                        this.activeAgents.forEach(agent => {
                            // Use FormulaService to modify stats properly
                            const formulaService = window.GameServices.formulaService;
                            switch(stat) {
                                case 'accuracy':
                                    formulaService.modifyStat(agent, 'accuracy', 10);
                                    break;
                                case 'damage':
                                    formulaService.modifyStat(agent, 'damage', 5);
                                    break;
                                case 'speed':
                                    formulaService.modifyStat(agent, 'speed', 1);
                                    break;
                                case 'health':
                                    formulaService.modifyStat(agent, 'health', 20);
                                    break;
                            }
                        });
                        // Show success notification
                        window.dialogManager.showNotification('Training completed successfully!', 'success');
                        // Refresh content
                        const currentDialog = window.dialogManager.getCurrentDialog();
                        if (currentDialog && currentDialog.modal) {
                            currentDialog.modal.update({
                                content: this.generateTrainingContent()
                            });
                        }
                    }
                });
            });
        }, 100);

        return content;
}

// Helper function to get available agents
CyberOpsGame.prototype.getAvailableAgents = function() {
    // Return available agents that haven't been hired
    if (!this.availableAgents) {
        return [];
    }
    return this.availableAgents.filter(agent => !agent.hired);
}