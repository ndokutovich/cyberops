/**
 * Screen Configuration
 * Defines all full-screen application states
 * These are NOT dialogs - they're the main game screens
 */

const SCREEN_CONFIG = {
    // Splash Screen
    'splash': {
        type: 'generated',
        background: 'radial-gradient(circle at center, #0a1628, #000000)',
        music: true,
        content: () => `
            <div class="splash-container">
                <h1 class="game-title">CYBEROPS: SYNDICATE</h1>
                <div class="game-subtitle">A Tactical Cyberpunk Experience</div>
                <div class="loading-bar">
                    <div class="loading-progress"></div>
                </div>
                <div class="splash-hint">Click anywhere to continue</div>
            </div>
        `,
        actions: [],
        onEnter: function() {
            // Auto-advance after 3 seconds
            setTimeout(() => {
                if (screenManager.currentScreen === 'splash') {
                    screenManager.navigateTo('main-menu');
                }
            }, 3000);

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
        music: true,
        content: () => `
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

    // Syndicate Hub
    'hub': {
        type: 'dom',
        elementId: 'syndicateHub',
        music: true,
        onEnter: function() {
            const game = window.game;
            if (game) {
                // Disable 3D mode if active
                if (game.is3DMode && game.cleanup3D) {
                    game.cleanup3D();
                }

                // Update hub statistics
                if (game.updateHubStats) {
                    game.updateHubStats();
                }

                // Set game state
                game.currentScreen = 'hub';
            }
        },
        onExit: function() {
            // Cleanup if needed
        }
    },

    // Mission Briefing
    'mission-briefing': {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a1628, #1a0a2e)',
        content: (params) => {
            const mission = params?.mission || window.game?.currentMission;
            if (!mission) return '<p>No mission selected</p>';

            const objectives = mission.objectives?.map(obj =>
                `<li class="${obj.required !== false ? 'required' : 'optional'}">
                    ${obj.description || obj.displayText}
                </li>`
            ).join('') || '';

            return `
                <div class="briefing-container">
                    <h2 class="briefing-title">MISSION BRIEFING</h2>
                    <h3 class="mission-name">${mission.title}</h3>

                    <div class="briefing-content">
                        <div class="mission-location">📍 ${mission.location || 'Classified'}</div>
                        <div class="mission-description">${mission.description || mission.briefing}</div>

                        <div class="objectives-section">
                            <h4>OBJECTIVES:</h4>
                            <ul class="objectives-list">${objectives}</ul>
                        </div>

                        <div class="rewards-section">
                            <h4>REWARDS:</h4>
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
        actions: [
            { text: 'SELECT LOADOUT', action: 'navigate:loadout', primary: true },
            { text: 'BACK TO HUB', action: 'navigate:hub' }
        ]
    },

    // Loadout Selection
    'loadout': {
        type: 'generated',
        background: 'linear-gradient(135deg, #0a1628, #2a1a3e)',
        content: () => {
            const game = window.game;
            if (!game || !game.activeAgents) {
                return '<p>No agents available</p>';
            }

            const selectedAgents = game.selectedAgents || [];
            const agentCards = game.activeAgents.map(agent => {
                const selected = selectedAgents.includes(agent.id);
                return `
                    <div class="agent-card ${selected ? 'selected' : ''}" data-agent-id="${agent.id}">
                        <div class="agent-name">${agent.name}</div>
                        <div class="agent-class">${agent.class || 'Soldier'}</div>
                        <div class="agent-stats">
                            ❤️ ${agent.health} | ⚔️ ${agent.damage} | 👟 ${agent.speed}
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="loadout-container">
                    <h2 class="loadout-title">SELECT YOUR TEAM</h2>
                    <div class="loadout-subtitle">Choose up to 4 agents for this mission</div>

                    <div class="agents-grid">${agentCards}</div>

                    <div class="selection-info">
                        Selected: ${selectedAgents.length}/4 agents
                    </div>
                </div>
            `;
        },
        actions: [
            { text: 'START MISSION', action: 'execute:startMission', primary: true },
            { text: 'BACK', action: 'navigate:mission-briefing' }
        ],
        onEnter: function() {
            // Add click handlers for agent selection
            setTimeout(() => {
                document.querySelectorAll('.agent-card').forEach(card => {
                    card.addEventListener('click', function() {
                        const agentId = parseInt(this.dataset.agentId);
                        const game = window.game;
                        if (!game) return;

                        if (!game.selectedAgents) game.selectedAgents = [];

                        const index = game.selectedAgents.indexOf(agentId);
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
                            info.textContent = `Selected: ${game.selectedAgents.length}/4 agents`;
                        }
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

                // Start game loop if needed
                if (game.gameLoop && !game.gameLoopRunning) {
                    game.gameLoop();
                }
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
    Object.entries(SCREEN_CONFIG).forEach(([id, config]) => {
        window.screenManager.registerScreen(id, config);
    });
    const logger = window.Logger ? new window.Logger('ScreenConfig') : null;
    if (logger) logger.debug('📺 Registered', Object.keys(SCREEN_CONFIG).length, 'screens');
}