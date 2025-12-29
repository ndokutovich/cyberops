/**
 * Additional Dialog Integrations
 * Handles menu screens, terminal hack, world map, and other dialogs
 * Completes 100% declarative conversion
 */

(function() {
    // Wait for dialog engine
    function registerAdditionalIntegrations() {
    const logger = window.Logger ? new window.Logger('DialogIntegrationAdditional') : null;
        const engine = window.declarativeDialogEngine;
        if (!engine) {
            if (this.logger) this.logger.warn('Dialog engine not ready for additional integrations');
            return;
        }

        const game = window.game;

        // ========== CONTENT GENERATORS ==========

        // Credits content generator
        engine.registerGenerator('generateCreditsContent', function() {
            // Credits can be static or dynamic based on game state
            return engine.renderTemplate('credits-content', {});
        });

        // Terminal content generator
        engine.registerGenerator('generateTerminalContent', function() {
            const terminal = this.stateData?.terminal || {};
            const agent = (game && game._selectedAgent) || (game && game.agents?.[0]);

            return engine.renderTemplate('terminal-display', {
                terminalId: terminal.id || 'UNKNOWN',
                status: terminal.hacked ? 'ACCESSED' : 'SECURED',
                statusClass: terminal.hacked ? 'success' : 'danger',
                securityLevel: terminal.securityLevel || 'STANDARD',
                encryption: terminal.encryption || 'AES-256',
                accessLevel: terminal.accessLevel || 'LEVEL 3',
                isLocked: !terminal.hacked,
                hacking: this.stateData?.hacking || false,
                hackProgress: this.stateData?.hackProgress || 0
            });
        });

        // World map content generator
        engine.registerGenerator('generateWorldMapContent', function() {
            // Use the game's generateWorldMapContent if available - it returns complete HTML
            if (game && game.generateWorldMapContent) {
                const htmlContent = game.generateWorldMapContent();
                if (logger) logger.debug('📍 World map generator returning HTML content');
                return htmlContent;
            }

            // Fallback to basic HTML (since template engine doesn't support {{#each}})
            const regions = (game && game.worldRegions) || [
                { id: 'north-america', name: 'North America', control: 45, resistance: 'Moderate', resources: 'High', controlled: false, hasMission: true },
                { id: 'europe', name: 'Europe', control: 30, resistance: 'High', resources: 'Medium', controlled: false, hasMission: false },
                { id: 'asia', name: 'Asia', control: 60, resistance: 'Low', resources: 'Very High', controlled: true, hasMission: true },
                { id: 'south-america', name: 'South America', control: 25, resistance: 'High', resources: 'Medium', controlled: false, hasMission: true },
                { id: 'africa', name: 'Africa', control: 15, resistance: 'Very High', resources: 'Low', controlled: false, hasMission: false },
                { id: 'oceania', name: 'Oceania', control: 70, resistance: 'Very Low', resources: 'Medium', controlled: true, hasMission: false }
            ];

            // Build HTML directly since template doesn't support loops
            let html = '<div class="world-map-container">';
            html += '<div class="map-header">';
            html += '<h2>Global Control: ' + ((game && game.worldControl) || 0) + '%</h2>';
            html += '<div class="control-bar"><div class="control-fill" style="width: ' + ((game && game.worldControl) || 0) + '%"></div></div>';
            html += '</div><div class="regions-grid">';

            regions.forEach(region => {
                html += '<div class="region-card ' + (region.controlled ? 'controlled' : '') + '" data-region="' + region.id + '">';
                html += '<h3>' + region.name + '</h3>';
                html += '<div class="region-stats">';
                html += '<p>Control: ' + region.control + '%</p>';
                html += '<p>Resistance: ' + region.resistance + '</p>';
                html += '<p>Resources: ' + region.resources + '</p>';
                html += '</div>';
                if (region.hasMission) {
                    html += '<div class="mission-available"><span class="mission-icon">⚡</span><p>Mission Available</p></div>';
                }
                html += '</div>';
            });

            html += '</div></div>';
            return html;
        });

        // Campaign complete content generator
        engine.registerGenerator('generateCampaignCompleteContent', function() {
            const stats = (game && game.campaignStats) || {};

            return engine.renderTemplate('campaign-complete-display', {
                missionsCompleted: stats.missionsCompleted || (game && game.completedMissions?.length) || 0,
                totalEnemiesDefeated: stats.totalEnemiesDefeated || 0,
                totalAgentsLost: stats.totalAgentsLost || 0,
                totalCredits: stats.totalCredits || (game && game.credits) || 0,
                researchCompleted: stats.researchCompleted || 0,
                worldControl: (game && game.worldControl) || 100,
                achievements: stats.achievements || [
                    { icon: '🏆', name: 'Campaign Victor' },
                    { icon: '💀', name: 'Enemy of the State' },
                    { icon: '🔬', name: 'Tech Supremacy' }
                ]
            });
        });

        // Tutorial content generator
        engine.registerGenerator('generateTutorialContent', function() {
            const tutorialStep = (game && game.currentTutorialStep) || 0;
            const tutorialSteps = (game && game.tutorialSteps) || [
                {
                    title: 'Welcome to CyberOps',
                    description: 'Click on agents to select them, then right-click to move.',
                    hints: ['Use Tab to cycle through agents', 'Press H near terminals to hack them']
                },
                {
                    title: 'Combat Basics',
                    description: 'Click on enemies to attack them. Use cover for tactical advantage.',
                    hints: ['Use 1-2 for abilities', 'Press 5 for overwatch mode']
                },
                {
                    title: 'Mission Objectives',
                    description: 'Complete all primary objectives to enable extraction.',
                    hints: ['Check objectives with J key', 'Yellow markers show objectives']
                }
            ];

            const step = tutorialSteps[tutorialStep] || tutorialSteps[0];

            return engine.renderTemplate('tutorial-step', {
                currentStep: tutorialStep + 1,
                totalSteps: tutorialSteps.length,
                title: step.title,
                description: step.description,
                hints: step.hints,
                hasVisual: step.visual ? true : false,
                visualContent: step.visual
            });
        });

        // ========== ACTION HANDLERS ==========

        // Splash screen actions
        engine.registerAction('skipSplash', function() {
            if (game) game.splashSkipped = true;
            this.navigateTo('menu-screen');
        });

        // Menu actions
        engine.registerAction('startNewCampaign', function() {
            this.closeAll();
            if (game && game.startNewGame) {
                game.startNewGame();
            }
        });

        engine.registerAction('loadLastSave', function() {
            this.closeAll();
            // Load most recent save directly via GameStateService
            if (game?.gameServices?.gameStateService) {
                const saves = game.gameServices.gameStateService.getAllSaves();
                if (saves.length > 0) {
                    // Load most recent save (first in sorted list)
                    game.gameServices.gameStateService.loadGame(game, saves[0].id);
                } else if (game.quickLoad) {
                    // Fallback to quickLoad
                    game.quickLoad();
                }
            }
        });

        // Terminal hack actions
        engine.registerAction('performHack', function() {
            const agent = game && game._selectedAgent;
            const terminal = this.stateData?.terminal;

            if (!agent || !terminal) return;

            // Start hacking animation
            this.updateState({ hacking: true, hackProgress: 0 });

            // Simulate hack progress
            let progress = 0;
            const hackInterval = setInterval(() => {
                progress += 20;
                this.updateState({ hackProgress: progress });

                if (progress >= 100) {
                    clearInterval(hackInterval);
                    this.trigger('hackComplete');
                }
            }, 500);
        });

        engine.registerAction('onHackComplete', function() {
            const terminal = this.stateData?.terminal;
            if (terminal) {
                terminal.hacked = true;
                if (game && game.hackNearestTerminal) {
                    game.hackNearestTerminal(game._selectedAgent);
                }
            }
            this.close();
        });

        // World map actions
        engine.registerAction('selectRegion', function() {
            const selectedRegion = this.stateData?.selectedRegion;
            if (!selectedRegion) return;

            // Load missions for the selected region
            if (game && game.loadRegionMissions) {
                game.loadRegionMissions(selectedRegion);
            }

            this.navigateTo('mission-select-hub');
        });

        // Tutorial actions
        engine.registerAction('nextTutorialStep', function() {
            if (game) {
                if (!game.currentTutorialStep) {
                    game.currentTutorialStep = 0;
                }
                game.currentTutorialStep++;

                const totalSteps = game.tutorialSteps?.length || 3;
                if (game.currentTutorialStep >= totalSteps) {
                    this.close();
                } else {
                    // Refresh tutorial content
                    this.navigateTo('tutorial', null, true);
                }
            }
        });

        engine.registerAction('skipTutorial', function() {
            if (game) game.tutorialCompleted = true;
            this.close();
        });

        // ========== CONDITIONS ==========

        // Use registerValidator for condition checks (same as conditions)
        engine.registerValidator('hasSavedGame', function() {
            return game && game.hasSaveGame && game.hasSaveGame();
        });

        engine.registerValidator('canHack', function() {
            const agent = game && game._selectedAgent;
            const terminal = this.stateData?.terminal;
            return agent && terminal && !terminal.hacked;
        });

        engine.registerValidator('hasSelectedRegion', function() {
            return this.stateData?.selectedRegion != null;
        });

        engine.registerValidator('hasNextStep', function() {
            const currentStep = (game && game.currentTutorialStep) || 0;
            const totalSteps = (game && game.tutorialSteps?.length) || 3;
            return currentStep < totalSteps - 1;
        });

        // ========== WRAPPER FUNCTIONS ==========

        // Replace showSplashScreens
        if (game && game.showSplashScreens) {
            const originalSplash = game.showSplashScreens;
            game.showSplashScreens = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('splash-screen');
                } else {
                    originalSplash.call(this);
                }
            };
        }

        // Replace showMainMenu
        if (game && game.showMainMenu) {
            const originalMenu = game.showMainMenu;
            game.showMainMenu = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('menu-screen');
                } else {
                    originalMenu.call(this);
                }
            };
        }

        // Replace showCredits
        if (game && game.showCredits) {
            const originalCredits = game.showCredits;
            game.showCredits = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('credits-screen');
                } else {
                    originalCredits.call(this);
                }
            };
        }

        // Replace showGameOver
        if (game && game.showGameOver) {
            const originalGameOver = game.showGameOver;
            game.showGameOver = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('game-over');
                } else {
                    originalGameOver.call(this);
                }
            };
        }

        // Replace showGameComplete
        if (game && game.showGameComplete) {
            const originalComplete = game.showGameComplete;
            game.showGameComplete = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('campaign-complete');
                } else {
                    originalComplete.call(this);
                }
            };
        }

        // Terminal hack wrapper
        if (game && game.showTerminalHack) {
            const originalTerminal = game.showTerminalHack;
            game.showTerminalHack = function(terminal) {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('terminal-hack', { terminal: terminal });
                } else {
                    originalTerminal.call(this, terminal);
                }
            };
        }

        // World map wrapper
        if (game && game.showWorldMap) {
            const originalWorldMap = game.showWorldMap;
            game.showWorldMap = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('world-map');
                } else {
                    originalWorldMap.call(this);
                }
            };
        }

        // Tutorial wrapper
        if (game && game.showTutorial) {
            const originalTutorial = game.showTutorial;
            game.showTutorial = function() {
                if (engine && engine.navigateTo) {
                    game.currentTutorialStep = 0;
                    engine.navigateTo('tutorial');
                } else {
                    originalTutorial.call(this);
                }
            };
        }

        if (logger) logger.info('✅ Additional dialog integrations registered');
    }

    // Register when dialog engine is ready
    if (window.declarativeDialogEngine) {
        registerAdditionalIntegrations();

        // Final initialization with complete config after all files loaded
        if (window.DIALOG_CONFIG && window.declarativeDialogEngine) {
            // Re-initialize to ensure all states from all config files are included
            window.declarativeDialogEngine.initialize(window.DIALOG_CONFIG);
        }
    } else {
        // Wait for engine to be initialized
        const checkInterval = setInterval(() => {
            if (window.declarativeDialogEngine) {
                clearInterval(checkInterval);
                registerAdditionalIntegrations();

                // Final initialization with complete config
                if (window.DIALOG_CONFIG) {
                    window.declarativeDialogEngine.initialize(window.DIALOG_CONFIG);
                }
            }
        }, 100);
    }
})();