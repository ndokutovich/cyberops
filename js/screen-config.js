/**
 * Screen Configuration
 * Defines all full-screen application states
 * These are NOT dialogs - they're the main game screens
 */

// Splash Sequence Configuration - easily modify all splash aspects here
const SPLASH_CONFIG = {
    vendor: {
        duration: 3000,
        mainText: 'NEXUS INTERACTIVE',
        subText: 'Presents'
    },
    studio: {
        duration: 3000,
        mainText: 'CYBER DYNAMICS',
        subText: 'Game Studio'
    },
    game: {
        duration: 2500,
        title: 'CYBEROPS: SYNDICATE',
        beamSweep: true,
        infiniteLoadingBar: true,
        glowEffect: true
    },
    transition: {
        whiteFlash: true,
        flashDuration: 1500,
        contentFadeIn: true
    }
};

const SCREEN_CONFIG = {
    // Vendor Logo Splash
    'vendor-splash': {
        type: 'generated',
        background: '#000',
        music: true,  // Start music here at the beginning
        content: () => `
            <div class="logo-container">
                <div class="company-name">${SPLASH_CONFIG.vendor.mainText}</div>
                <div class="logo-subtitle">${SPLASH_CONFIG.vendor.subText}</div>
            </div>
        `,
        actions: [],
        onEnter: function() {
            // Reset splash skipped flag at start
            if (window.game) {
                window.game.splashSkipped = false;
            }

            // Auto-advance after configured duration
            setTimeout(() => {
                if (screenManager.currentScreen === 'vendor-splash') {
                    screenManager.navigateTo('studio-splash');
                }
            }, SPLASH_CONFIG.vendor.duration);

            // Click to skip entire splash sequence
            const container = document.getElementById('screen-vendor-splash');
            if (container) {
                container.addEventListener('click', () => {
                    if (window.game) {
                        window.game.splashSkipped = true;
                        // Trigger the skip transition for music (pass actual screen ID)
                        if (window.game.transitionScreenMusic) {
                            window.game.transitionScreenMusic('vendor-splash', 'main-menu');
                        }
                    }
                    // Navigate to main-menu screen
                    screenManager.navigateTo('main-menu');
                }, { once: true });
            }
        }
    },

    // Studio Logo Splash
    'studio-splash': {
        type: 'generated',
        background: '#000',
        content: () => `
            <div class="logo-container">
                <div class="studio-name">${SPLASH_CONFIG.studio.mainText}</div>
                <div class="logo-subtitle">${SPLASH_CONFIG.studio.subText}</div>
            </div>
        `,
        actions: [],
        onEnter: function() {
            // Auto-advance after configured duration
            setTimeout(() => {
                if (screenManager.currentScreen === 'studio-splash') {
                    screenManager.navigateTo('splash');
                }
            }, SPLASH_CONFIG.studio.duration);

            // Click to skip to game splash
            const container = document.getElementById('screen-studio-splash');
            if (container) {
                container.addEventListener('click', () => {
                    screenManager.navigateTo('splash');
                }, { once: true });
            }
        }
    },

    // Game Splash Screen (with configurable effects)
    'splash': {
        type: 'generated',
        background: '#0a0e1a',
        // music: true,  // Music continues from vendor-splash, don't restart
        content: () => `
            <div class="loading-screen" style="display: flex;">
                <h1 class="game-title${SPLASH_CONFIG.game.beamSweep ? ' beam-sweep' : ''}">${SPLASH_CONFIG.game.title}</h1>
                ${SPLASH_CONFIG.game.infiniteLoadingBar ? `
                    <div class="loading-bar">
                        <div class="loading-progress"></div>
                    </div>
                ` : ''}
            </div>
        `,
        actions: [],
        onEnter: function() {
            // Auto-advance after configured duration
            setTimeout(() => {
                if (screenManager.currentScreen === 'splash') {
                    screenManager.navigateTo('main-menu');
                }
            }, SPLASH_CONFIG.game.duration);

            // Click to skip
            const container = document.getElementById('screen-splash');
            if (container) {
                container.addEventListener('click', () => {
                    screenManager.executeAction('skipSplash');
                }, { once: true });
            }
        }
    },

    // Main Menu
    'main-menu': {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        // music: true,  // Music continues from vendor-splash, don't restart
        onEnter: function() {
            // Start demoscene idle timer
            if (window.game && window.game.startDemosceneIdleTimer) {
                window.game.startDemosceneIdleTimer();
            }

            // Reset timer on any user activity
            const resetTimer = () => {
                if (window.game && window.game.resetDemosceneTimer) {
                    window.game.resetDemosceneTimer();
                }
            };

            // Throttle mousemove events to prevent spam
            let lastMouseMove = 0;
            const throttledMouseMove = () => {
                const now = Date.now();
                if (now - lastMouseMove > 1000) {  // Only reset once per second max
                    lastMouseMove = now;
                    resetTimer();
                }
            };

            // Add activity listeners
            setTimeout(() => {
                const menuContainer = document.getElementById('screen-main-menu');
                if (menuContainer) {
                    menuContainer.addEventListener('click', resetTimer);
                    menuContainer.addEventListener('mousemove', throttledMouseMove);  // Use throttled version
                    menuContainer.addEventListener('keydown', resetTimer);
                }
            }, 100);
        },
        onExit: function() {
            // Clean up activity listeners
            const menuContainer = document.getElementById('screen-main-menu');
            if (menuContainer) {
                // Note: Can't remove anonymous functions, but they'll be garbage collected
            }
        },
        content: () => `
            ${SPLASH_CONFIG.transition.whiteFlash ? '<div class="white-flash-overlay"></div>' : ''}

            <!-- Background Effects (enhanced cyberpunk atmosphere) -->
            <div class="menu-bg-effects">
                <div class="menu-bg-grid"></div>
                <div class="menu-bg-particles"></div>
                <div class="menu-bg-sparks"></div>
                <div class="menu-circuit-pattern"></div>
                <div class="menu-hex-pattern"></div>
                <div class="menu-scanning-lines"></div>
                <div class="menu-glitch-overlay"></div>
                <div class="menu-data-streams">
                    <div class="menu-data-stream stream-1"></div>
                    <div class="menu-data-stream stream-2"></div>
                    <div class="menu-data-stream stream-3"></div>
                    <div class="menu-data-stream stream-4"></div>
                    <div class="menu-data-stream stream-5"></div>
                </div>
                <div class="menu-neon-pulses">
                    <div class="neon-pulse pulse-1"></div>
                    <div class="neon-pulse pulse-2"></div>
                    <div class="neon-pulse pulse-3"></div>
                </div>
                <div class="menu-holo-shimmer"></div>
                <div class="menu-status-indicators">
                    <div class="status-indicator ind-1"></div>
                    <div class="status-indicator ind-2"></div>
                    <div class="status-indicator ind-3"></div>
                </div>
                <div class="menu-running-text">
                    <div class="running-text-container">
                        <div class="running-text-line" id="runningText">
                            <span class="text-segment typing-text" data-text="NEXUS INTERACTIVE SYSTEMS">NEXUS INTERACTIVE SYSTEMS</span>
                            <span class="text-separator"> • </span>
                            <span class="text-segment typing-text" data-text="TACTICAL OPERATIONS NETWORK ONLINE">TACTICAL OPERATIONS NETWORK ONLINE</span>
                            <span class="text-separator"> • </span>
                            <span class="text-segment typing-text" data-text="SYNDICATE COMMAND INTERFACE v2.7">SYNDICATE COMMAND INTERFACE v2.7</span>
                            <span class="text-separator"> • </span>
                            <span class="text-segment typing-text" data-text="NEURAL LINK ESTABLISHED">NEURAL LINK ESTABLISHED</span>
                            <span class="text-separator"> • </span>
                            <span class="text-segment typing-text" data-text="QUANTUM ENCRYPTION ACTIVE">QUANTUM ENCRYPTION ACTIVE</span>
                            <span class="text-separator"> • </span>
                            <span class="text-segment typing-text" data-text="CYBER WARFARE PROTOCOLS LOADED">CYBER WARFARE PROTOCOLS LOADED</span>
                            <span class="text-separator"> • </span>
                        </div>
                    </div>
                    <div class="terminal-cursor"></div>
                </div>
            </div>

            <div class="menu-container">
                <h1 class="menu-title">CYBEROPS: SYNDICATE</h1>
                <div class="menu-subtitle">Main Menu</div>
            </div>
        `,
        actions: [
            { text: 'NEW CAMPAIGN', action: 'execute:startNewGame', primary: true },
            { text: 'CONTINUE', action: 'execute:continueGame' },
            { text: 'LOAD GAME', action: 'execute:showLoadGame' },
            { text: 'SETTINGS', action: 'execute:showSettings' },
            { text: 'CREDITS', action: 'navigate:credits' },
            { text: 'EXIT', action: 'execute:exitGame' }
        ]
    },

    // Mission Briefing
    'mission-briefing': {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a1628, #1a0a2e)',
        content: (params) => {
            const game = window.game;
            const mission = params?.mission || game?.currentMission;
            if (!mission) return '<p>No mission selected</p>';

            const objectives = mission.objectives?.map(obj =>
                `<li class="${obj.required !== false ? 'required' : 'optional'}">
                    ${obj.description || obj.displayText}
                </li>`
            ).join('') || '';

            // Get active agents for squad selection
            const activeAgents = game?.activeAgents || [];
            const selectedAgents = game?.selectedAgents || [];

            const squadInfo = activeAgents.length > 0 ?
                `<div class="squad-section">
                    <h4 style="margin-top: 20px; color: #00ffff;">SELECT SQUAD (${selectedAgents.length}/4):</h4>
                    <div class="selection-info" style="margin: 10px 0; padding: 10px; background: rgba(0,0,0,0.5); border-radius: 5px; text-align: center;">
                        ${selectedAgents.length === 0 ?
                            '<span style="color: #ff6666;">⚠️ Select at least one agent to start the mission</span>' :
                            `<span style="color: #00ff00;">✓ ${selectedAgents.length} agent(s) selected - Ready to deploy!</span>`
                        }
                    </div>
                    <div class="agents-grid" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin: 10px 0;">
                        ${activeAgents.map(agent => {
                            const selected = selectedAgents.some(id => String(id) === String(agent.id));
                            const loadout = game.agentLoadouts?.[agent.id];
                            return `
                                <div class="agent-card ${selected ? 'selected' : ''}" data-agent-id="${agent.id}"
                                     style="cursor: pointer; padding: 12px; background: ${selected ? 'rgba(0,255,0,0.15)' : 'rgba(0,255,255,0.1)'};
                                            border: 2px solid ${selected ? '#00ff00' : '#00ffff'}; border-radius: 8px; min-width: 150px;
                                            transition: all 0.2s;">
                                    <div style="font-weight: bold; color: ${selected ? '#00ff00' : '#00ffff'}; font-size: 1.1em;">
                                        ${selected ? '✓ ' : ''}${agent.name}
                                    </div>
                                    <div style="color: #888; font-size: 0.9em; margin: 4px 0;">${agent.class || 'Soldier'}</div>
                                    <div style="font-size: 0.85em; margin-top: 6px; color: #aaa;">
                                        ❤️ ${agent.health}/${agent.maxHealth || agent.health} | ⚔️ ${agent.damage} | 👟 ${agent.speed}
                                    </div>
                                    ${loadout?.weapon ? `<div style="font-size: 0.8em; color: #0ff; margin-top: 4px;">🔫 ${loadout.weapon.name}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>` :
                `<div class="squad-section">
                    <h4 style="margin-top: 20px; color: #ff6666;">⚠️ NO AGENTS AVAILABLE</h4>
                    <div style="margin: 10px 0; padding: 10px; background: rgba(255,0,0,0.1); border: 1px solid #ff6666; border-radius: 5px;">
                        You need to hire agents from the Hub before starting missions!
                    </div>
                </div>`;

            return `
                <div class="briefing-container">
                    <h2 class="briefing-title">MISSION BRIEFING</h2>
                    <h3 class="mission-name">${mission.title || mission.name || 'Operation Unknown'}</h3>

                    <div class="briefing-content">
                        <div class="mission-location">📍 ${mission.location || 'Classified Location'}</div>
                        <div class="mission-description">${mission.description || mission.briefing || 'Details classified.'}</div>

                        <div class="objectives-section">
                            <h4 style="margin-top: 20px; color: #00ffff;">OBJECTIVES:</h4>
                            <ul class="objectives-list">${objectives || '<li>Survive and extract</li>'}</ul>
                        </div>

                        ${squadInfo}

                        <div class="rewards-section">
                            <h4 style="margin-top: 20px; color: #00ffff;">REWARDS:</h4>
                            <div class="rewards">
                                💰 ${mission.rewards?.credits || 1000} Credits |
                                🔬 ${mission.rewards?.researchPoints || 50} RP |
                                🌍 +${mission.rewards?.worldControl || 1}% Control
                            </div>
                        </div>
                    </div>
                </div>
            `;
        },
        actions: function() {
            const game = window.game;
            const hasAgents = game?.activeAgents?.length > 0;
            const hasSelection = game?.selectedAgents?.length > 0;

            if (!hasAgents) {
                return [
                    { text: 'HIRE AGENTS FIRST', action: 'navigate:hub', primary: true }
                ];
            } else if (hasSelection) {
                return [
                    { text: 'START MISSION', action: 'execute:startMission', primary: true },
                    { text: 'BACK TO HUB', action: 'navigate:hub' }
                ];
            } else {
                return [
                    { text: 'SELECT AGENTS TO START', action: '', primary: false, disabled: true },
                    { text: 'BACK TO HUB', action: 'navigate:hub' }
                ];
            }
        },
        onEnter: function() {
            // Initialize selectedAgents array if not exists
            const game = window.game;
            if (game && !game.selectedAgents) {
                game.selectedAgents = [];
            }

            // Add click handlers for agent selection
            setTimeout(() => {
                document.querySelectorAll('.agent-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const agentId = this.dataset.agentId;
                        const game = window.game;
                        if (!game) return;

                        if (!game.selectedAgents) game.selectedAgents = [];

                        // Find if this agent is already selected
                        const index = game.selectedAgents.findIndex(id => String(id) === String(agentId));
                        if (index > -1) {
                            // Deselect
                            game.selectedAgents.splice(index, 1);
                            this.classList.remove('selected');
                            this.style.background = 'rgba(0,255,255,0.1)';
                            this.style.borderColor = '#00ffff';
                            // Update name color and remove checkmark
                            const nameEl = this.querySelector('div:first-child');
                            if (nameEl) {
                                nameEl.style.color = '#00ffff';
                                nameEl.textContent = nameEl.textContent.replace('✓ ', '');
                            }
                        } else if (game.selectedAgents.length < 4) {
                            // Select
                            game.selectedAgents.push(agentId);
                            this.classList.add('selected');
                            this.style.background = 'rgba(0,255,0,0.15)';
                            this.style.borderColor = '#00ff00';
                            // Update name color and add checkmark
                            const nameEl = this.querySelector('div:first-child');
                            if (nameEl) {
                                nameEl.style.color = '#00ff00';
                                if (!nameEl.textContent.startsWith('✓')) {
                                    nameEl.textContent = '✓ ' + nameEl.textContent;
                                }
                            }
                        }

                        // Update selection info
                        const infoEl = document.querySelector('.selection-info');
                        if (infoEl) {
                            const count = game.selectedAgents.length;
                            infoEl.innerHTML = count === 0 ?
                                '<span style="color: #ff6666;">⚠️ Select at least one agent to start the mission</span>' :
                                `<span style="color: #00ff00;">✓ ${count} agent(s) selected - Ready to deploy!</span>`;
                        }

                        // Update squad count in header
                        const squadHeader = document.querySelector('.squad-section h4');
                        if (squadHeader) {
                            squadHeader.textContent = `SELECT SQUAD (${game.selectedAgents.length}/4):`;
                        }

                        // Update buttons
                        const hasSelection = game.selectedAgents.length > 0;
                        const actionButtons = document.querySelectorAll('.screen-action');
                        actionButtons.forEach(btn => {
                            if (btn.textContent.includes('SELECT AGENTS') || btn.textContent === 'START MISSION') {
                                btn.textContent = hasSelection ? 'START MISSION' : 'SELECT AGENTS TO START';
                                btn.disabled = !hasSelection;
                                if (hasSelection) {
                                    btn.classList.add('primary');
                                    btn.dataset.action = 'execute:startMission';
                                } else {
                                    btn.classList.remove('primary');
                                    btn.dataset.action = '';
                                }
                            }
                        });
                    });
                });
            }, 100);
        }
    },

    // Loadout Selection
    'loadout': {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a1628, #2a1a3e)',
        content: () => {
            const game = window.game;
            if (!game || !game.activeAgents || game.activeAgents.length === 0) {
                return `
                    <div class="loadout-container">
                        <h2 class="loadout-title">NO AGENTS AVAILABLE</h2>
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                            <div style="color: #ff6666; font-size: 1.2em; margin-bottom: 20px;">
                                You haven't hired any agents yet!
                            </div>
                            <div style="color: #aaa;">
                                Return to the Hub and hire agents from the Agent Management office.
                            </div>
                        </div>
                    </div>
                `;
            }

            const selectedAgents = game.selectedAgents || [];
            const agentCards = game.activeAgents.map(agent => {
                // Check selection with type conversion for safety
                const selected = selectedAgents.some(id => String(id) === String(agent.id));
                const loadout = game.agentLoadouts?.[agent.id];

                return `
                    <div class="agent-card ${selected ? 'selected' : ''}" data-agent-id="${agent.id}"
                         style="cursor: pointer; padding: 15px; margin: 10px; background: ${selected ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.1)'};
                                border: 2px solid ${selected ? '#00ff00' : '#00ffff'}; border-radius: 8px;">
                        <div class="agent-name" style="font-weight: bold; color: ${selected ? '#00ff00' : '#00ffff'};">${agent.name}</div>
                        <div class="agent-class" style="color: #888; font-size: 0.9em;">${agent.class || 'Soldier'}</div>
                        <div class="agent-stats" style="margin-top: 8px; font-size: 0.9em;">
                            ❤️ ${agent.health}/${agent.maxHealth || agent.health} | ⚔️ ${agent.damage} | 👟 ${agent.speed}
                        </div>
                        ${loadout?.weapon ? `<div style="font-size: 0.8em; color: #aaa; margin-top: 4px;">🔫 ${loadout.weapon.name}</div>` : ''}
                        ${selected ? '<div style="color: #00ff00; margin-top: 8px;">✓ SELECTED</div>' : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="loadout-container">
                    <h2 class="loadout-title">SELECT YOUR TEAM</h2>
                    <div class="loadout-subtitle">Choose up to 4 agents for this mission</div>

                    <div class="agents-grid" style="display: flex; flex-wrap: wrap; justify-content: center; margin: 20px 0;">
                        ${agentCards}
                    </div>

                    <div class="selection-info" style="text-align: center; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 8px;">
                        Selected: <span style="color: ${selectedAgents.length > 0 ? '#00ff00' : '#ff6666'};">${selectedAgents.length}/4</span> agents
                        ${selectedAgents.length === 0 ? '<div style="color: #ff6666; margin-top: 8px;">⚠️ Select at least one agent to continue!</div>' : ''}
                    </div>
                </div>
            `;
        },
        actions: function() {
            const game = window.game;
            const hasAgents = game?.activeAgents?.length > 0;
            const hasSelection = game?.selectedAgents?.length > 0;

            if (!hasAgents) {
                return [
                    { text: 'HIRE AGENTS FIRST', action: 'navigate:hub', primary: true },
                    { text: 'BACK', action: 'navigate:mission-briefing' }
                ];
            } else if (hasSelection) {
                return [
                    { text: 'START MISSION', action: 'execute:startMission', primary: true },
                    { text: 'BACK', action: 'navigate:mission-briefing' }
                ];
            } else {
                return [
                    { text: 'SELECT AGENTS TO CONTINUE', action: '', primary: false, disabled: true },
                    { text: 'BACK', action: 'navigate:mission-briefing' }
                ];
            }
        },
        onEnter: function() {
            // Initialize selectedAgents array if not exists
            const game = window.game;
            if (game && !game.selectedAgents) {
                game.selectedAgents = [];
                if (window.Logger) {
                    const logger = new window.Logger('LoadoutScreen');
                    logger.info('Initialized selectedAgents array');
                }
            }

            // Add click handlers for agent selection
            setTimeout(() => {
                document.querySelectorAll('.agent-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const agentId = this.dataset.agentId; // Keep as string, don't parse
                        const game = window.game;
                        if (!game) return;

                        if (!game.selectedAgents) game.selectedAgents = [];

                        // Log for debugging
                        if (window.Logger) {
                            const logger = new window.Logger('LoadoutScreen');
                            logger.info(`Agent clicked: ${agentId}, current selection: [${game.selectedAgents.join(', ')}]`);
                        }

                        // Find if this agent is already selected (using string comparison)
                        const index = game.selectedAgents.findIndex(id => String(id) === String(agentId));
                        if (index > -1) {
                            game.selectedAgents.splice(index, 1);
                            this.classList.remove('selected');
                        } else if (game.selectedAgents.length < 4) {
                            game.selectedAgents.push(agentId);
                            this.classList.add('selected');
                        }

                        // Update count
                        const info = document.querySelector('.selection-info');
                        if (info) {
                            info.innerHTML = `Selected: <span style="color: ${game.selectedAgents.length > 0 ? '#00ff00' : '#ff6666'};">${game.selectedAgents.length}/4</span> agents
                                ${game.selectedAgents.length === 0 ? '<div style="color: #ff6666; margin-top: 8px;">⚠️ Select at least one agent to continue!</div>' : ''}`;
                        }

                        // Update buttons based on selection
                        const hasSelection = game.selectedAgents.length > 0;
                        const actionButtons = document.querySelectorAll('.screen-action');
                        actionButtons.forEach(btn => {
                            if (btn.textContent === 'SELECT AGENTS TO CONTINUE' || btn.textContent === 'START MISSION') {
                                btn.textContent = hasSelection ? 'START MISSION' : 'SELECT AGENTS TO CONTINUE';
                                btn.disabled = !hasSelection;
                                if (hasSelection) {
                                    btn.classList.add('primary');
                                    btn.dataset.action = 'execute:startMission';
                                } else {
                                    btn.classList.remove('primary');
                                    btn.dataset.action = '';
                                }
                            }
                        });
                    });
                });
            }, 100);
        }
    },

    // Game Screen (Canvas)
    'game': {
        type: 'canvas',
        onEnter: function() {
            const game = window.game;
            if (game) {
                game.currentScreen = 'game';
                game.screen = 'game';

                // Game loop now handled by GameController
                // Old gameLoop() call removed
            }
        },
        onExit: function() {
            // Pause game when leaving
            const game = window.game;
            if (game && !game.isPaused) {
                game.togglePause();
            }
        }
    },

    // Victory Screen
    'victory': {
        type: 'generated',
        background: 'radial-gradient(circle at center, #0a4a0a, #000000)',
        content: () => {
            const game = window.game;
            const summary = game?.gatherMissionSummary?.(true) || {};

            return `
                <div class="victory-container">
                    <h1 class="victory-title">✅ MISSION COMPLETE</h1>

                    <div class="mission-stats">
                        <div class="stat">⏱️ Time: ${summary.missionTime || '00:00'}</div>
                        <div class="stat">☠️ Enemies: ${summary.enemiesKilled || 0}/${summary.totalEnemies || 0}</div>
                        <div class="stat">📋 Objectives: ${summary.objectivesCompleted || 0}/${summary.totalObjectives || 0}</div>
                        <div class="stat">👥 Squad: ${game?.agents?.filter(a => a.alive).length || 0}/${game?.agents?.length || 0} Survived</div>
                    </div>

                    <div class="rewards">
                        <h3>REWARDS EARNED:</h3>
                        <div>💰 ${summary.totalCredits || 0} Credits</div>
                        <div>🔬 ${summary.totalResearchPoints || 0} Research Points</div>
                        <div>🌍 +${summary.worldControl || 0}% World Control</div>
                    </div>
                </div>
            `;
        },
        actions: [
            { text: 'CONTINUE', action: 'navigate:hub', primary: true },
            { text: 'NEXT MISSION', action: 'execute:proceedToNextMission' }
        ]
    },

    // Defeat Screen
    'defeat': {
        type: 'generated',
        background: 'radial-gradient(circle at center, #4a0a0a, #000000)',
        content: () => {
            const game = window.game;
            const summary = game?.gatherMissionSummary?.(false) || {};

            return `
                <div class="defeat-container">
                    <h1 class="defeat-title">❌ MISSION FAILED</h1>

                    <div class="failure-reason">${game?.defeatReason || 'All agents were eliminated'}</div>

                    <div class="mission-stats">
                        <div class="stat">⏱️ Survived: ${summary.missionTime || '00:00'}</div>
                        <div class="stat">☠️ Enemies Killed: ${summary.enemiesKilled || 0}</div>
                        <div class="stat">📋 Objectives: ${summary.objectivesCompleted || 0}/${summary.totalObjectives || 0}</div>
                        <div class="stat">💀 Agents Lost: ${summary.agentsLost || 0}</div>
                    </div>
                </div>
            `;
        },
        actions: [
            { text: 'RETRY MISSION', action: 'execute:retryMission', primary: true },
            { text: 'RETURN TO HUB', action: 'navigate:hub' },
            { text: 'LOAD CHECKPOINT', action: 'execute:showLoadGame' }
        ]
    },

    // Demoscene Attract Mode
    'demoscene': {
        type: 'generated',
        background: 'linear-gradient(135deg, #000000, #1a0a2e)',
        onEnter: function() {
            const game = window.game;
            if (game) {
                game.demosceneActive = true;
                // Setup interrupt handlers are already in showDemoscene
            }
        },
        onExit: function() {
            const game = window.game;
            if (game) {
                game.demosceneActive = false;
                if (game.removeDemosceneInterruptHandlers) {
                    game.removeDemosceneInterruptHandlers();
                }
            }
        },
        content: () => `
            <div class="demoscene-screen" style="width: 100%; height: 100%; position: relative;">
                <div class="demo-header">
                    <div class="demo-title">CyberOps: Syndicate</div>
                    <div class="demo-subtitle">--- CLASSIFIED INTEL BRIEFING ---</div>
                </div>

                <div class="demo-content">
                    <div class="demo-panels">
                        <!-- World Lore Panel -->
                        <div class="demo-panel lore-panel">
                            <div class="panel-title">WORLD STATE ANALYSIS</div>
                            <div class="lore-text">
                                <div class="lore-section">
                                    <span class="lore-header">YEAR 2087:</span><br>
                                    Mega-corporations rule the world through digital dominance.
                                    The line between human and machine has blurred beyond recognition.
                                </div>
                                <div class="lore-section">
                                    <span class="lore-header">THE SYNDICATE:</span><br>
                                    An elite organization of cyber-operatives fighting for freedom
                                    in a world controlled by algorithmic oppression.
                                </div>
                                <div class="lore-section">
                                    <span class="lore-header">YOUR MISSION:</span><br>
                                    Lead tactical operations to reclaim human autonomy from
                                    the corporate digital overlords.
                                </div>
                            </div>
                        </div>

                        <!-- Game Features Panel -->
                        <div class="demo-panel features-panel">
                            <div class="panel-title">OPERATION PARAMETERS</div>
                            <div class="features-list">
                                <div class="feature-item">
                                    <span class="feature-icon">⚡</span>
                                    <span class="feature-text">Isometric Tactical Combat</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🎯</span>
                                    <span class="feature-text">Strategic Agent Management</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🔬</span>
                                    <span class="feature-text">Research & Development</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">💰</span>
                                    <span class="feature-text">Resource Economy</span>
                                </div>
                                <div class="feature-item">
                                    <span class="feature-icon">🌍</span>
                                    <span class="feature-text">World Liberation Campaign</span>
                                </div>
                            </div>
                        </div>

                        <!-- Stats Panel -->
                        <div class="demo-panel stats-panel">
                            <div class="panel-title">GLOBAL STATISTICS</div>
                            <div class="global-stats">
                                <div class="stat-row">
                                    <span class="stat-label">Corporate Control:</span>
                                    <div class="stat-bar">
                                        <div class="stat-fill corporate-fill" id="corporateFill"></div>
                                    </div>
                                    <span class="stat-value">87%</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Human Resistance:</span>
                                    <div class="stat-bar">
                                        <div class="stat-fill resistance-fill" id="resistanceFill"></div>
                                    </div>
                                    <span class="stat-value">13%</span>
                                </div>
                                <div class="stat-row">
                                    <span class="stat-label">Active Syndicates:</span>
                                    <div class="stat-bar">
                                        <div class="stat-fill syndicate-fill" id="syndicateFill"></div>
                                    </div>
                                    <span class="stat-value">0.7%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="demo-footer">
                    <div class="demo-controls">
                        <div class="control-hint">CLICK ANYWHERE TO ACCESS MAIN TERMINAL</div>
                        <div class="demo-credits">
                            <span class="credits-scroll">
                                NEXUS INTERACTIVE PRESENTS • CYBER DYNAMICS GAME STUDIO •
                                FEATURING ADVANCED AI TACTICAL SYSTEMS • PROCEDURAL MISSION GENERATION •
                                DYNAMIC WORLD STATE SIMULATION •
                            </span>
                        </div>
                    </div>
                </div>

                <div class="demo-effects">
                    <div class="scanning-lines"></div>
                    <div class="data-streams">
                        <div class="data-stream stream-1"></div>
                        <div class="data-stream stream-2"></div>
                        <div class="data-stream stream-3"></div>
                    </div>
                </div>
            </div>
        `
    },

    // Syndicate Hub
    hub: {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a0a0a, #1a1a2e)',
        onEnter: function() {
            // Initialize hub data
            if (window.game && window.game.updateHubStats) {
                setTimeout(() => window.game.updateHubStats(), 100);
            }
        },
        content: function() {
            return `
                <div class="hub-screen" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                    <div class="hub-header">
                        <div class="hub-title">🏢 SYNDICATE HUB</div>
                        <div class="hub-subtitle">Central Command & Operations</div>

                        <div class="world-control-indicator">
                            <span>World Control: </span>
                            <span id="worldControlPercent">15%</span>
                            <div class="control-bar">
                                <div class="control-progress" id="controlProgress" style="width: 15%"></div>
                            </div>
                        </div>
                    </div>

                    <div class="hub-content">
                        <!-- Left Panel: Operations -->
                        <div class="hub-panel operations-panel">
                            <div class="panel-header">🎯 OPERATIONS</div>
                            <div class="panel-content">
                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('mission-select-hub'); } else if(game.showMissionsFromHub) { game.showMissionsFromHub(); } else { console.error('No mission selection available'); }">
                                    <div class="card-icon">🎭</div>
                                    <div class="card-title">MISSIONS</div>
                                    <div class="card-desc">Launch new operations</div>
                                    <div class="card-status" id="missionStatus">2 Available</div>
                                </div>

                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('agent-management'); } else { alert('Agent management not available'); }">
                                    <div class="card-icon">👥</div>
                                    <div class="card-title">AGENTS</div>
                                    <div class="card-desc">Hire & manage operatives</div>
                                    <div class="card-status" id="agentStatus">4 Active</div>
                                </div>

                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('research-lab'); } else { alert('Research lab not available'); }">
                                    <div class="card-icon">🔬</div>
                                    <div class="card-title">RESEARCH</div>
                                    <div class="card-desc">Upgrade capabilities</div>
                                    <div class="card-status" id="researchStatus">2 Active</div>
                                </div>

                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('hall-of-glory'); } else if(game.showHallOfGlory) { game.showHallOfGlory(); } else { alert('Hall of Glory not available'); }">
                                    <div class="card-icon">⚰️</div>
                                    <div class="card-title">HALL OF GLORY</div>
                                    <div class="card-desc">Remember the fallen</div>
                                    <div class="card-status" id="fallenStatus">0 Heroes</div>
                                </div>
                            </div>
                        </div>

                        <!-- Center Panel: Dashboard -->
                        <div class="hub-panel dashboard-panel">
                            <div class="panel-header">📊 COMMAND CENTER</div>
                            <div class="panel-content">
                                <div class="dashboard-stats">
                                    <div class="stat-group">
                                        <div class="stat-item">
                                            <div class="stat-label">Missions Complete</div>
                                            <div class="stat-value" id="hubMissionsComplete">0/5</div>
                                        </div>
                                        <div class="stat-item">
                                            <div class="stat-label">Active Agents</div>
                                            <div class="stat-value" id="hubActiveAgents">4</div>
                                        </div>
                                        <div class="stat-item">
                                            <div class="stat-label">Research Points</div>
                                            <div class="stat-value" id="hubResearchPoints">150</div>
                                        </div>
                                        <div class="stat-item">
                                            <div class="stat-label">Credits</div>
                                            <div class="stat-value" id="hubCredits">5000</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="world-map">
                                    <div class="map-title">🌍 GLOBAL INFLUENCE</div>
                                    <div class="influence-regions">
                                        <div class="region" data-region="north-america">
                                            <span class="region-name">North America</span>
                                            <span class="region-control">25%</span>
                                        </div>
                                        <div class="region" data-region="europe">
                                            <span class="region-name">Europe</span>
                                            <span class="region-control">10%</span>
                                        </div>
                                        <div class="region" data-region="asia">
                                            <span class="region-name">Asia</span>
                                            <span class="region-control">5%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right Panel: Resources -->
                        <div class="hub-panel resources-panel">
                            <div class="panel-header">🛡️ RESOURCES</div>
                            <div class="panel-content">
                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('arsenal'); } else if(game.showEquipmentManagement) { game.showEquipmentManagement(); } else { alert('Arsenal not available'); }">
                                    <div class="card-icon">🔫</div>
                                    <div class="card-title">ARSENAL</div>
                                    <div class="card-desc">Manage equipment</div>
                                    <div class="card-status" id="arsenalStatus">8 Items</div>
                                </div>

                                <div class="hub-card" onclick="if(game.dialogEngine) { game.dialogEngine.navigateTo('intel-missions'); } else { alert('Intel missions not available'); }">
                                    <div class="card-icon">📡</div>
                                    <div class="card-title">INTEL</div>
                                    <div class="card-desc">Surveillance & data</div>
                                    <div class="card-status" id="intelStatus">3 Reports</div>
                                </div>

                                <div class="hub-card" onclick="if(game.dialogEngine && game.dialogEngine.navigateTo) { game.dialogEngine.navigateTo('character'); } else if(game.showCharacterSheet) { game.showCharacterSheet(); } else { alert('Character sheet not available'); }">
                                    <div class="card-icon">📊</div>
                                    <div class="card-title">CHARACTER</div>
                                    <div class="card-desc">View RPG stats</div>
                                    <div class="card-status" id="characterStatus">Level 1</div>
                                </div>

                                <div class="hub-card" onclick="if(game.showWorldMap) { game.showWorldMap(); } else { alert('World map coming soon!'); }">
                                    <div class="card-icon">🗺️</div>
                                    <div class="card-title">WORLD MAP</div>
                                    <div class="card-desc">Global operations</div>
                                    <div class="card-status" id="worldMapStatus">L1 Access</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="hub-footer">
                        <button class="menu-button hub-button" onclick="game.startNextMission()" style="background: #2e7d32; font-size: 1.1em;">🎯 NEXT MISSION</button>
                        <button class="menu-button hub-button" onclick="game.backToMainMenu()">MAIN MENU</button>
                        <button class="menu-button hub-button" onclick="game.quickSave()">QUICK SAVE</button>
                        <button class="menu-button hub-button" onclick="game.saveGame()">SAVE MANAGER</button>
                    </div>
                </div>
            `;
        }
    },

    // Credits Screen
    'credits': {
        type: 'generated',
        background: 'linear-gradient(to bottom, #000000, #1a1a2e)',
        music: true,
        content: () => `
            <div class="credits-container">
                <h1 class="credits-title">CREDITS</h1>

                <div class="credits-scroll">
                    <div class="credit-section">
                        <h3>DEVELOPED BY</h3>
                        <p>Your Studio Name</p>
                    </div>

                    <div class="credit-section">
                        <h3>GAME DESIGN</h3>
                        <p>Lead Designer</p>
                    </div>

                    <div class="credit-section">
                        <h3>PROGRAMMING</h3>
                        <p>Lead Programmer</p>
                    </div>

                    <div class="credit-section">
                        <h3>ART & VISUALS</h3>
                        <p>Lead Artist</p>
                    </div>

                    <div class="credit-section">
                        <h3>MUSIC & SOUND</h3>
                        <p>Composer</p>
                    </div>

                    <div class="credit-section">
                        <h3>SPECIAL THANKS</h3>
                        <p>To all our players!</p>
                    </div>
                </div>
            </div>
        `,
        actions: [
            { text: 'BACK TO MENU', action: 'navigate:main-menu' }
        ]
    }
};

// Register all screens when loaded
if (window.screenManager) {
    // Force re-registration of all screens
    Object.entries(SCREEN_CONFIG).forEach(([id, config]) => {
        window.screenManager.registerScreen(id, config);
    });
    const logger = window.Logger ? new window.Logger('ScreenConfig') : null;
    if (logger) logger.debug('📺 Registered', Object.keys(SCREEN_CONFIG).length, 'screens');
    console.log('📺 SCREEN CONFIG LOADED - Version 2.0 with vendor/studio splashes');
    console.log('📺 Registered screens:', Object.keys(SCREEN_CONFIG));
    console.log('📺 Vendor splash registered:', SCREEN_CONFIG['vendor-splash'] ? 'YES' : 'NO');
    console.log('📺 Studio splash registered:', SCREEN_CONFIG['studio-splash'] ? 'YES' : 'NO');
}

// Also expose to window for debugging
window.SCREEN_CONFIG = SCREEN_CONFIG;