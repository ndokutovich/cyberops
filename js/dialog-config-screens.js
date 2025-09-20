/**
 * Game Screen Dialog Configurations
 * HIGH Priority screen conversions to declarative system
 * Following DIALOG_CONVERSION_GUIDE.md principles
 */

(function() {
    // Get the dialog config object
    const dialogConfig = window.DIALOG_CONFIG || {};

    // ========== VICTORY/DEFEAT SCREENS (INTERMISSION) ==========

    // Victory Screen (Mission Complete)
    dialogConfig.states['victory-screen'] = {
        type: 'dialog',
        level: 1,
        parent: 'game',
        title: 'MISSION COMPLETE',
        layout: 'full-screen',
        content: {
            type: 'dynamic',
            generator: 'generateVictoryContent'
        },
        buttons: {
            type: 'dynamic',
            generator: 'generateVictoryButtons'
        },
        transitions: {
            enter: { animation: 'celebration', duration: 500, sound: 'victory' },
            exit: { animation: 'fade-out', duration: 300 }
        },
        autoClose: {
            timeout: 30000, // Auto-continue after 30 seconds
            action: 'execute:continueFromVictory'
        }
    };

    // Defeat Screen (Mission Failed)
    dialogConfig.states['defeat-screen'] = {
        type: 'dialog',
        level: 1,
        parent: 'game',
        title: 'MISSION FAILED',
        layout: 'full-screen',
        content: {
            type: 'dynamic',
            generator: 'generateDefeatContent'
        },
        buttons: {
            type: 'dynamic',
            generator: 'generateDefeatButtons'
        },
        transitions: {
            enter: { animation: 'fade-in', duration: 500, sound: 'defeat' },
            exit: { animation: 'fade-out', duration: 300 }
        }
    };

    // ========== MISSION BRIEFING ==========

    dialogConfig.states['mission-briefing'] = {
        type: 'dialog',
        level: 1,
        parent: 'hub',
        title: {
            type: 'dynamic',
            generator: 'generateBriefingTitle'
        },
        layout: 'large-layout',
        content: {
            type: 'dynamic',
            generator: 'generateBriefingContent'
        },
        buttons: [
            { text: 'PROCEED TO LOADOUT', action: 'navigate:loadout-select', primary: true },
            { text: 'BACK TO HUB', action: 'execute:returnToHub' }
        ],
        transitions: {
            enter: { animation: 'slide-up', duration: 300 },
            exit: { animation: 'slide-down', duration: 300 }
        }
    };

    // ========== LOADOUT SELECTION ==========

    dialogConfig.states['loadout-select'] = {
        type: 'dialog',
        level: 2,
        parent: 'mission-briefing',
        title: 'AGENT LOADOUT',
        layout: 'large-layout',
        content: {
            type: 'dynamic',
            generator: 'generateLoadoutContent'
        },
        buttons: [
            { text: 'START MISSION', action: 'execute:startMissionWithLoadout', primary: true, danger: true },
            { text: 'BACK TO BRIEFING', action: 'back' }
        ],
        validation: {
            startMission: 'validateLoadoutSelection'
        },
        transitions: {
            enter: { animation: 'slide-left', duration: 300 },
            exit: { animation: 'slide-right', duration: 300 }
        }
    };

    // ========== HUB SCREEN ==========

    dialogConfig.states['syndicate-hub'] = {
        type: 'screen', // Special type for full screens
        level: 0, // Root level
        parent: null,
        title: null, // No title bar for hub
        layout: 'full-screen-no-dialog',
        content: {
            type: 'dynamic',
            generator: 'generateHubContent'
        },
        keyboard: {
            'Escape': 'navigate:pause-menu',
            'm': 'navigate:mission-select-hub',
            'a': 'navigate:agent-management',
            'i': 'navigate:arsenal',
            'c': 'navigate:character',
            'r': 'navigate:research-lab'
        },
        onEnter: 'initializeHubScreen',
        onExit: 'cleanupHubScreen'
    };

    // ========== TEMPLATES ==========

    dialogConfig.templates['victory-summary'] = `
        <div class="intermission-content">
            <div class="status-header" style="color: #00ff00;">
                <span class="status-icon">✅</span>
                <span class="status-text">MISSION ACCOMPLISHED</span>
            </div>

            <div class="mission-stats">
                <h3>Mission Summary</h3>
                <div class="stat-row">
                    <span>Enemies Eliminated:</span>
                    <span>{{enemiesKilled}}/{{totalEnemies}}</span>
                </div>
                <div class="stat-row">
                    <span>Objectives Completed:</span>
                    <span>{{objectivesCompleted}}/{{totalObjectives}}</span>
                </div>
                <div class="stat-row">
                    <span>Agents Lost:</span>
                    <span class="{{#if agentsLost}}danger{{else}}success{{/if}}">{{agentsLost}}</span>
                </div>
                <div class="stat-row">
                    <span>Time Elapsed:</span>
                    <span>{{missionTime}}</span>
                </div>
            </div>

            <div class="rewards-section" style="border-top: 1px solid #00ffff; margin-top: 20px; padding-top: 20px;">
                <h3>Rewards</h3>
                <div class="reward-row" style="color: #ffff00;">
                    <span>Credits Earned:</span>
                    <span>+{{creditsEarned}}</span>
                </div>
                <div class="reward-row" style="color: #00ffff;">
                    <span>Research Points:</span>
                    <span>+{{researchPoints}}</span>
                </div>
                <div class="reward-row" style="color: #ff00ff;">
                    <span>World Control:</span>
                    <span>+{{worldControl}}%</span>
                </div>
            </div>

            {{#if bonusObjectives}}
            <div class="bonus-section" style="margin-top: 15px; color: #00ff00;">
                <h4>Bonus Objectives Completed!</h4>
                {{#each bonusObjectives}}
                    <div>✓ {{this}}</div>
                {{/each}}
            </div>
            {{/if}}
        </div>
    `;

    dialogConfig.templates['defeat-summary'] = `
        <div class="intermission-content">
            <div class="status-header" style="color: #ff0000;">
                <span class="status-icon">❌</span>
                <span class="status-text">MISSION FAILED</span>
            </div>

            <div class="failure-reason" style="margin: 20px 0; padding: 15px; background: rgba(255,0,0,0.1); border: 1px solid #ff0000;">
                <h3>Reason for Failure</h3>
                <p style="color: #ff6666;">{{failureReason}}</p>
            </div>

            <div class="mission-stats">
                <h3>Mission Statistics</h3>
                <div class="stat-row">
                    <span>Agents Lost:</span>
                    <span style="color: #ff0000;">{{agentsLost}}/{{totalAgents}}</span>
                </div>
                <div class="stat-row">
                    <span>Objectives Completed:</span>
                    <span>{{objectivesCompleted}}/{{totalObjectives}}</span>
                </div>
                <div class="stat-row">
                    <span>Enemies Eliminated:</span>
                    <span>{{enemiesKilled}}</span>
                </div>
                <div class="stat-row">
                    <span>Time Survived:</span>
                    <span>{{survivalTime}}</span>
                </div>
            </div>

            <div class="penalty-section" style="margin-top: 20px; color: #ff6666;">
                <h3>Penalties</h3>
                <div>Credits Lost: -{{creditsLost}}</div>
                <div>Agents require medical treatment</div>
            </div>
        </div>
    `;

    dialogConfig.templates['mission-briefing-content'] = `
        <div class="briefing-content">
            <div class="mission-header">
                <h2>{{missionTitle}}</h2>
                <div class="mission-location" style="color: #00ffff;">
                    Location: {{location}}
                </div>
            </div>

            <div class="mission-description" style="margin: 20px 0; padding: 15px; background: rgba(0,255,255,0.05); border-left: 3px solid #00ffff;">
                <p>{{description}}</p>
            </div>

            <div class="objectives-section">
                <h3>Primary Objectives</h3>
                <ul class="objectives-list">
                    {{#each primaryObjectives}}
                        <li class="objective-item">▸ {{this}}</li>
                    {{/each}}
                </ul>

                {{#if secondaryObjectives}}
                <h3>Secondary Objectives (Optional)</h3>
                <ul class="objectives-list secondary">
                    {{#each secondaryObjectives}}
                        <li class="objective-item">▸ {{this}}</li>
                    {{/each}}
                </ul>
                {{/if}}
            </div>

            <div class="mission-intel" style="margin-top: 20px;">
                <h3>Intelligence Report</h3>
                <div class="intel-row">
                    <span>Expected Resistance:</span>
                    <span class="{{difficultyColor}}">{{difficulty}}</span>
                </div>
                <div class="intel-row">
                    <span>Enemy Forces:</span>
                    <span>{{enemyCount}} hostiles</span>
                </div>
                <div class="intel-row">
                    <span>Environment:</span>
                    <span>{{environment}}</span>
                </div>
            </div>

            <div class="rewards-preview" style="margin-top: 20px; padding: 15px; background: rgba(255,255,0,0.05);">
                <h3>Mission Rewards</h3>
                <div>Credits: {{baseCredits}}</div>
                <div>Research Points: {{baseResearch}}</div>
                <div>World Control: +{{worldControl}}%</div>
            </div>
        </div>
    `;

    dialogConfig.templates['loadout-selection'] = `
        <div class="loadout-content">
            <div class="agent-selection">
                <h3>Select Agents for Mission</h3>
                <div class="agent-roster">
                    {{#each availableAgents}}
                        <div class="agent-card {{#if selected}}selected{{/if}}" data-agent-id="{{id}}">
                            <div class="agent-name">{{name}}</div>
                            <div class="agent-class">{{class}}</div>
                            <div class="agent-stats">
                                HP: {{health}} | DMG: {{damage}} | SPD: {{speed}}
                            </div>
                            <div class="agent-equipment">
                                <span class="weapon">{{weapon}}</span>
                                <span class="armor">{{armor}}</span>
                            </div>
                            <button class="select-btn" data-action="execute:toggleAgent" data-agent="{{id}}">
                                {{#if selected}}DESELECT{{else}}SELECT{{/if}}
                            </button>
                        </div>
                    {{/each}}
                </div>

                <div class="selection-summary" style="margin-top: 20px; padding: 15px; background: rgba(0,255,255,0.1);">
                    <h4>Selected Team ({{selectedCount}}/{{maxAgents}})</h4>
                    {{#if insufficientAgents}}
                        <div style="color: #ff6666;">⚠️ Select at least 1 agent to continue</div>
                    {{/if}}
                </div>
            </div>

            <div class="equipment-check">
                <h3>Equipment Overview</h3>
                <div class="equipment-summary">
                    <div>Total Firepower: {{totalDamage}}</div>
                    <div>Average Health: {{avgHealth}}</div>
                    <div>Team Speed: {{teamSpeed}}</div>
                </div>

                <div class="consumables" style="margin-top: 15px;">
                    <h4>Available Consumables</h4>
                    <div>Medkits: {{medkits}}</div>
                    <div>Grenades: {{grenades}}</div>
                    <div>Smoke Bombs: {{smokeBombs}}</div>
                </div>
            </div>
        </div>
    `;

    // Export config
    window.DIALOG_CONFIG = dialogConfig;
})();