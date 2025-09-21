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

    // ========== MENU & NAVIGATION SCREENS ==========

    // Splash screen
    dialogConfig.states['splash-screen'] = {
        type: 'screen',
        level: 0,
        layout: 'full-screen',
        content: {
            type: 'static',
            html: '<div class="splash-content">' +
                  '<h1 class="splash-title">CYBEROPS: SYNDICATE</h1>' +
                  '<div class="splash-subtitle">A Tactical Cyberpunk Experience</div>' +
                  '<div class="splash-progress">Loading...</div>' +
                  '<div class="splash-hint">Click anywhere to skip</div>' +
                  '</div>'
        },
        transitions: {
            enter: { animation: 'fade-in', duration: 1000 },
            exit: { animation: 'fade-out', duration: 500 }
        },
        events: [
            { trigger: 'click', action: 'execute:skipSplash' },
            { trigger: 'timer', delay: 3000, action: 'navigate:menu-screen' }
        ]
    };

    // Main menu screen
    dialogConfig.states['menu-screen'] = {
        type: 'screen',
        level: 0,
        layout: 'full-screen',
        content: {
            type: 'static',
            html: '<div class="menu-content">' +
                  '<h1 class="menu-title">CYBEROPS: SYNDICATE</h1>' +
                  '<div class="menu-subtitle">Select Option</div>' +
                  '</div>'
        },
        buttons: [
            { text: 'NEW CAMPAIGN', action: 'execute:startNewCampaign', primary: true },
            { text: 'CONTINUE', action: 'execute:loadLastSave', condition: 'hasSavedGame' },
            { text: 'LOAD GAME', action: 'navigate:save-load' },
            { text: 'OPTIONS', action: 'navigate:settings' },
            { text: 'CREDITS', action: 'navigate:credits-screen' }
        ],
        transitions: {
            enter: { animation: 'slide-down', duration: 500 },
            exit: { animation: 'fade-out', duration: 300 }
        }
    };

    // Credits screen
    dialogConfig.states['credits-screen'] = {
        type: 'screen',
        level: 0,
        layout: 'full-screen',
        scrollable: true,
        content: { type: 'dynamic', generator: 'generateCreditsContent' },
        buttons: [{ text: 'BACK TO MENU', action: 'navigate:menu-screen' }],
        transitions: {
            enter: { animation: 'scroll-up', duration: 500, sound: 'credits' },
            exit: { animation: 'fade-out', duration: 300 }
        },
        events: [{ trigger: 'key', key: 'Escape', action: 'navigate:menu-screen' }]
    };

    // ========== GAMEPLAY DIALOGS ==========

    // Terminal hack dialog
    dialogConfig.states['terminal-hack'] = {
        type: 'dialog',
        level: 2,
        parent: 'game',
        title: 'TERMINAL ACCESS',
        layout: 'centered',
        modal: true,
        content: { type: 'dynamic', generator: 'generateTerminalContent' },
        buttons: [
            { text: 'HACK', action: 'execute:performHack', primary: true, condition: 'canHack' },
            { text: 'CANCEL', action: 'close' }
        ],
        transitions: {
            enter: { animation: 'glitch-in', duration: 300, sound: 'terminal-open' },
            exit: { animation: 'glitch-out', duration: 200 }
        },
        events: [{ trigger: 'hackComplete', action: 'execute:onHackComplete' }]
    };

    // World map screen
    dialogConfig.states['world-map'] = {
        type: 'screen',
        level: 1,
        parent: 'syndicate-hub',
        title: '🗺️ WORLD MAP - GLOBAL OPERATIONS',
        layout: 'full-screen',
        content: { type: 'dynamic', generator: 'generateWorldMapContent' },
        buttons: [
            { text: 'MISSION SELECT', action: 'navigate:mission-select-hub' },
            { text: 'BACK TO HUB', action: 'navigate:syndicate-hub' }
        ],
        transitions: {
            enter: { animation: 'zoom-out', duration: 500, sound: 'map-open' },
            exit: { animation: 'zoom-in', duration: 300 }
        },
        keyboard: {
            'Escape': 'navigate:syndicate-hub',
            'Enter': 'execute:selectRegion'
        }
    };

    // ========== END GAME SCREENS ==========

    // Game over screen
    dialogConfig.states['game-over'] = {
        type: 'screen',
        level: 0,
        layout: 'full-screen',
        title: 'GAME OVER',
        content: {
            type: 'static',
            html: '<div class="game-over-content">' +
                  '<h1>SYNDICATE DISSOLVED</h1>' +
                  '<p>Your organization has fallen. The megacorporations have won.</p>' +
                  '<div class="final-stats" id="gameOverStats"></div>' +
                  '</div>'
        },
        buttons: [
            { text: 'NEW GAME', action: 'execute:startNewCampaign', primary: true },
            { text: 'LOAD GAME', action: 'navigate:save-load' },
            { text: 'MAIN MENU', action: 'navigate:menu-screen' }
        ],
        transitions: {
            enter: { animation: 'fade-in', duration: 2000, sound: 'game-over' }
        }
    };

    // Campaign complete screen
    dialogConfig.states['campaign-complete'] = {
        type: 'screen',
        level: 0,
        layout: 'full-screen',
        title: 'VICTORY',
        content: { type: 'dynamic', generator: 'generateCampaignCompleteContent' },
        buttons: [
            { text: 'CONTINUE PLAYING', action: 'navigate:syndicate-hub' },
            { text: 'VIEW CREDITS', action: 'navigate:credits-screen' },
            { text: 'NEW GAME', action: 'execute:startNewCampaign' }
        ],
        transitions: {
            enter: { animation: 'celebration', duration: 1000, sound: 'campaign-victory' }
        }
    };

    // Tutorial overlay
    dialogConfig.states['tutorial'] = {
        type: 'dialog',
        level: 3,
        parent: 'game',
        title: 'TUTORIAL',
        layout: 'bottom-right',
        modal: false,
        content: { type: 'dynamic', generator: 'generateTutorialContent' },
        buttons: [
            { text: 'NEXT', action: 'execute:nextTutorialStep', condition: 'hasNextStep' },
            { text: 'SKIP TUTORIAL', action: 'execute:skipTutorial' }
        ],
        transitions: {
            enter: { animation: 'slide-left', duration: 300 },
            exit: { animation: 'slide-right', duration: 200 }
        }
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

    // Additional templates for new screens
    dialogConfig.templates['credits-content'] = `
        <div class="credits-scroll">
            <h1>CYBEROPS: SYNDICATE</h1>
            <div class="credits-section">
                <h2>Created By</h2>
                <p>Your Development Team</p>
            </div>
            <div class="credits-section">
                <h2>Programming</h2>
                <p>Lead Developer</p>
                <p>Gameplay Programmer</p>
                <p>UI/UX Developer</p>
            </div>
            <div class="credits-section">
                <h2>Art & Design</h2>
                <p>Art Director</p>
                <p>Environment Artist</p>
                <p>Character Designer</p>
            </div>
            <div class="credits-section">
                <h2>Sound & Music</h2>
                <p>Audio Director</p>
                <p>Sound Effects Designer</p>
                <p>Composer</p>
            </div>
            <div class="credits-section">
                <h2>Special Thanks</h2>
                <p>All our players and supporters</p>
                <p>The open source community</p>
            </div>
            <div class="credits-end">
                <p>Thank you for playing!</p>
            </div>
        </div>
    `;

    dialogConfig.templates['terminal-display'] = `
        <div class="terminal-interface">
            <div class="terminal-header">
                <span class="terminal-id">TERMINAL {{terminalId}}</span>
                <span class="terminal-status {{statusClass}}">{{status}}</span>
            </div>
            <div class="terminal-content">
                <div class="terminal-info">
                    <p>Security Level: {{securityLevel}}</p>
                    <p>Encryption: {{encryption}}</p>
                    <p>Access Required: {{accessLevel}}</p>
                </div>
                {{#if isLocked}}
                <div class="terminal-locked">
                    <span class="lock-icon">🔒</span>
                    <p>Terminal is locked. Hacking required.</p>
                </div>
                {{else}}
                <div class="terminal-unlocked">
                    <span class="unlock-icon">🔓</span>
                    <p>Terminal access granted.</p>
                </div>
                {{/if}}
                <div class="hack-progress" style="display: {{#if hacking}}block{{else}}none{{/if}}">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {{hackProgress}}%"></div>
                    </div>
                    <p>Hacking... {{hackProgress}}%</p>
                </div>
            </div>
        </div>
    `;

    dialogConfig.templates['world-map-display'] = `
        <div class="world-map-container">
            <div class="map-header">
                <h2>Global Control: {{worldControl}}%</h2>
                <div class="control-bar">
                    <div class="control-fill" style="width: {{worldControl}}%"></div>
                </div>
            </div>
            <div class="regions-grid">
                {{#each regions}}
                <div class="region-card {{#if controlled}}controlled{{/if}}" data-region="{{id}}">
                    <h3>{{name}}</h3>
                    <div class="region-stats">
                        <p>Control: {{control}}%</p>
                        <p>Resistance: {{resistance}}</p>
                        <p>Resources: {{resources}}</p>
                    </div>
                    {{#if hasMission}}
                    <div class="mission-available">
                        <span class="mission-icon">⚡</span>
                        <p>Mission Available</p>
                    </div>
                    {{/if}}
                </div>
                {{/each}}
            </div>
            <div class="map-legend">
                <span class="legend-item controlled">Controlled</span>
                <span class="legend-item contested">Contested</span>
                <span class="legend-item hostile">Hostile</span>
            </div>
        </div>
    `;

    dialogConfig.templates['campaign-complete-display'] = `
        <div class="campaign-complete-content">
            <div class="victory-banner">
                <h1>CAMPAIGN COMPLETE!</h1>
                <p>The syndicate has achieved global dominance.</p>
            </div>
            <div class="final-statistics">
                <h2>Campaign Statistics</h2>
                <div class="stat-grid">
                    <div class="stat-card">
                        <h3>Missions Completed</h3>
                        <p class="stat-value">{{missionsCompleted}}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Enemies Defeated</h3>
                        <p class="stat-value">{{totalEnemiesDefeated}}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Agents Lost</h3>
                        <p class="stat-value">{{totalAgentsLost}}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Credits Earned</h3>
                        <p class="stat-value">{{totalCredits}}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Research Completed</h3>
                        <p class="stat-value">{{researchCompleted}}</p>
                    </div>
                    <div class="stat-card">
                        <h3>World Control</h3>
                        <p class="stat-value">{{worldControl}}%</p>
                    </div>
                </div>
            </div>
            <div class="achievement-section">
                <h2>Achievements Unlocked</h2>
                <div class="achievement-list">
                    {{#each achievements}}
                    <div class="achievement-item">
                        <span class="achievement-icon">{{icon}}</span>
                        <span class="achievement-name">{{name}}</span>
                    </div>
                    {{/each}}
                </div>
            </div>
        </div>
    `;

    dialogConfig.templates['tutorial-step'] = `
        <div class="tutorial-content">
            <div class="tutorial-header">
                <h3>Tutorial Step {{currentStep}}/{{totalSteps}}</h3>
            </div>
            <div class="tutorial-body">
                <h4>{{title}}</h4>
                <p>{{description}}</p>
                {{#if hasVisual}}
                <div class="tutorial-visual">
                    {{visualContent}}
                </div>
                {{/if}}
            </div>
            <div class="tutorial-hints">
                {{#each hints}}
                <p class="hint">💡 {{this}}</p>
                {{/each}}
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