/**
 * Screen Manager
 * Manages full-screen application states (not dialogs!)
 * Only one screen can be active at a time
 */

class ScreenManager {
    constructor() {
        this.currentScreen = null;
        this.screenRegistry = new Map();
        this.screenContainer = null;
        this.game = null;
    }

    /**
     * Initialize the screen manager
     */
    init(game) {
        this.game = game;

        // Create or get screen container
        this.screenContainer = document.getElementById('screenContainer');
        if (!this.screenContainer) {
            this.screenContainer = document.createElement('div');
            this.screenContainer.id = 'screenContainer';
            this.screenContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1000;
                pointer-events: none;
            `;
            document.body.appendChild(this.screenContainer);
        }

        if (logger) logger.info('📺 Screen Manager initialized');
    }

    /**
     * Register a screen configuration
     */
    registerScreen(id, config) {
        this.screenRegistry.set(id, config);
    }

    /**
     * Navigate to a screen
     */
    navigateTo(screenId, params = {}) {
        if (logger) logger.debug(`📺 Navigating to screen: ${screenId}`);

        const screenConfig = this.screenRegistry.get(screenId);
        if (!screenConfig) {
            if (logger) logger.error(`Screen not found: ${screenId}`);
            return;
        }

        // Store previous screen for transitions
        const previousScreen = this.currentScreen;

        // Clean up current screen
        if (this.currentScreen) {
            this.exitScreen(this.currentScreen);
        }

        // Show new screen
        this.currentScreen = screenId;
        this.enterScreen(screenId, screenConfig, params);

        // Handle music transitions
        if (previousScreen && previousScreen !== screenId && this.game?.transitionScreenMusic) {
            // Use music transition system for screen-to-screen navigation
            // This allows for continue, crossfade, skip, etc.
            if (logger) logger.debug(`🎵 Transitioning music from ${previousScreen} to ${screenId}`);
            this.game.transitionScreenMusic(previousScreen, screenId);
        } else if (!previousScreen && screenConfig.music && this.game?.loadScreenMusic) {
            // First screen load - start music if configured
            if (logger) logger.debug(`🎵 Loading music for first screen: ${screenId}`);
            this.game.loadScreenMusic(screenId);
        } else {
            if (logger) logger.debug(`🎵 No music action: prev=${previousScreen}, music=${screenConfig.music}, hasTransition=${!!this.game?.transitionScreenMusic}`);
        }

        // Update game state
        if (this.game) {
            this.game.currentScreen = screenId;
        }
    }

    /**
     * Enter a screen
     */
    enterScreen(screenId, config, params) {
        // Handle different screen types
        switch (config.type) {
            case 'dom':
                // Use existing DOM element (like hub)
                this.showDOMScreen(config.elementId);
                break;

            case 'canvas':
                // Game canvas screen
                this.showCanvasScreen();
                break;

            case 'generated':
                // Generate HTML content
                this.showGeneratedScreen(screenId, config, params);
                break;
        }

        // Set HUD mode based on screen configuration
        if (config.hud !== undefined) {
            const hudService = this.game?.gameServices?.hudService;
            if (hudService) {
                const mode = config.hud;
                const elements = config.hudElements || [];
                if (logger) logger.debug(`🎨 Setting HUD mode: ${mode}, elements: ${elements.length}`);
                hudService.setMode(mode, elements);
            } else if (config.hud !== 'none') {
                // Fail-fast: HUD configured but service not available
                throw new Error(`HUD configured for screen '${screenId}' but HUDService not initialized`);
            }
        }

        // Execute enter actions
        if (config.onEnter) {
            if (typeof config.onEnter === 'string') {
                // Action name to execute
                this.executeAction(config.onEnter, params);
            } else if (typeof config.onEnter === 'function') {
                config.onEnter.call(this, params);
            }
        }

        // Music is now handled in navigateTo with proper transitions
        // (removed duplicate loadScreenMusic call)
    }

    /**
     * Exit a screen
     */
    exitScreen(screenId) {
        const config = this.screenRegistry.get(screenId);
        if (!config) return;

        // Execute exit actions
        if (config.onExit) {
            if (typeof config.onExit === 'string') {
                this.executeAction(config.onExit);
            } else if (typeof config.onExit === 'function') {
                config.onExit.call(this);
            }
        }

        // Hide screen elements
        switch (config.type) {
            case 'dom':
                this.hideDOMScreen(config.elementId);
                break;

            case 'canvas':
                this.hideCanvasScreen();
                break;

            case 'generated':
                this.hideGeneratedScreen(screenId);
                break;
        }
    }

    /**
     * Show a DOM-based screen
     */
    showDOMScreen(elementId) {
        // Hide all other screens
        document.querySelectorAll('.game-screen').forEach(el => {
            el.style.display = 'none';
        });

        // Show the target screen
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'flex';
            element.classList.add('active-screen');
        }

        // For DOM screens, disable pointer events on the container so clicks go through
        // The actual DOM element handles its own events
        this.screenContainer.style.pointerEvents = 'none';
    }

    /**
     * Hide a DOM-based screen
     */
    hideDOMScreen(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
            element.classList.remove('active-screen');
        }
    }

    /**
     * Show the game canvas
     */
    showCanvasScreen() {
        // Show game canvas (HUD visibility now managed by HUDService)
        const gameCanvas = document.getElementById('gameCanvas');

        if (gameCanvas) {
            gameCanvas.style.display = 'block';
        }

        // Hide screen container to allow canvas interaction
        this.screenContainer.style.pointerEvents = 'none';
        this.screenContainer.innerHTML = '';
    }

    /**
     * Hide the game canvas
     */
    hideCanvasScreen() {
        const gameCanvas = document.getElementById('gameCanvas');

        if (gameCanvas) {
            gameCanvas.style.display = 'none';
        }
        // HUD visibility now managed by HUDService via screen config
    }

    /**
     * Show a generated HTML screen
     */
    showGeneratedScreen(screenId, config, params) {
        // Hide game canvas and HUD when showing generated screen
        this.hideCanvasScreen();

        // Clear container
        this.screenContainer.innerHTML = '';
        this.screenContainer.style.pointerEvents = 'auto';

        // Create screen element
        const screenEl = document.createElement('div');
        screenEl.id = `screen-${screenId}`;

        // Add fade-in class for main-menu if configured
        let screenClasses = 'game-screen generated-screen';
        if (screenId === 'main-menu' && window.SPLASH_CONFIG?.transition?.contentFadeIn) {
            screenClasses += ' screen-fade-in';
        }

        screenEl.className = screenClasses;
        screenEl.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: ${config.background || 'linear-gradient(135deg, #0a0a0a, #1a1a2e)'};
        `;

        // Generate content
        let content = '';
        if (config.content) {
            if (typeof config.content === 'string') {
                content = config.content;
            } else if (typeof config.content === 'function') {
                content = config.content.call(this, params);
            }
        }

        // Add content
        screenEl.innerHTML = `
            <div class="screen-content">
                ${content}
            </div>
            ${this.generateScreenActions(config.actions, screenId)}
        `;

        // Add to container
        this.screenContainer.appendChild(screenEl);

        // Bind action handlers
        this.bindScreenActions(screenEl, config.actions);
    }

    /**
     * Hide a generated screen
     */
    hideGeneratedScreen(screenId) {
        const screenEl = document.getElementById(`screen-${screenId}`);
        if (screenEl) {
            screenEl.remove();
        }
        this.screenContainer.style.pointerEvents = 'none';
    }

    /**
     * Generate action buttons for a screen
     */
    generateScreenActions(actions, screenId) {
        // If actions is a function, call it to get the array
        if (typeof actions === 'function') {
            actions = actions.call(this);
        }

        if (!actions || actions.length === 0) return '';

        const buttons = actions.map((action, index) => {
            const classes = ['screen-action'];
            if (action.primary) classes.push('primary');
            if (action.secondary) classes.push('secondary');

            return `<button
                class="${classes.join(' ')}"
                data-action="${action.action}"
                data-screen="${screenId}"
                data-index="${index}"
            >${action.text}</button>`;
        }).join('');

        return `<div class="screen-actions">${buttons}</div>`;
    }

    /**
     * Bind action handlers
     */
    bindScreenActions(screenEl, actions) {
        if (!actions) return;

        // If actions is a function, call it to get the array
        if (typeof actions === 'function') {
            actions = actions.call(this);
        }

        screenEl.querySelectorAll('.screen-action').forEach(button => {
            button.addEventListener('click', (e) => {
                // Check if button is disabled
                if (e.target.disabled) return;

                // First check if action was dynamically updated in dataset
                const currentAction = e.target.dataset.action;

                // If we have a current action in dataset, use it
                if (currentAction) {
                    if (currentAction.startsWith('navigate:')) {
                        const targetScreen = currentAction.replace('navigate:', '');
                        this.navigateTo(targetScreen);
                    } else if (currentAction.startsWith('execute:')) {
                        const actionName = currentAction.replace('execute:', '');
                        this.executeAction(actionName);
                    }
                    return;
                }

                // Otherwise fall back to original action from array
                const actionIndex = parseInt(e.target.dataset.index);
                const action = actions[actionIndex];

                if (action && action.action) {
                    if (action.action.startsWith('navigate:')) {
                        const targetScreen = action.action.replace('navigate:', '');
                        this.navigateTo(targetScreen);
                    } else if (action.action.startsWith('execute:')) {
                        const actionName = action.action.replace('execute:', '');
                        this.executeAction(actionName);
                    } else if (typeof action.action === 'function') {
                        action.action.call(this);
                    }
                }
            });
        });
    }

    /**
     * Execute a named action
     */
    executeAction(actionName, params) {
        // Map action names to game functions
        const actionMap = {
            'startNewGame': () => this.game?.startNewGame(),
            'continueGame': () => this.game?.continueCampaign(),
            'showSettings': () => this.game?.dialogEngine?.navigateTo('settings'),
            'showLoadGame': () => {
                // Always open save-load dialog to let user choose which save to load
                if (this.game?.dialogEngine) {
                    this.game.dialogEngine.navigateTo('save-load');
                } else if (this.game?.showSaveLoadDialog) {
                    this.game.showSaveLoadDialog();
                }
            },
            'showCredits': () => this.navigateTo('credits'),
            'exitGame': () => window.close(),
            'skipSplash': () => {
                this.game.splashSkipped = true;
                this.navigateTo('main-menu');
            },
            'proceedToBriefing': () => {
                if (this.game?.currentMission) {
                    this.navigateTo('mission-briefing', { mission: this.game.currentMission });
                }
            },
            'startMission': () => {
                if (logger) logger.info(`🚀 startMission action triggered`);
                if (logger) logger.info(`Selected agents: ${this.game?.selectedAgents}`);

                if (this.game?.selectedAgents?.length > 0) {
                    // NOTE: game.agents is now a computed property
                    // It automatically filters activeAgents by selectedAgents

                    if (logger) logger.info(`✅ Starting mission with ${this.game.agents.length} agents`);

                    if (this.game?.startMission) {
                        if (logger) logger.info(`📍 Calling game.startMission()`);
                        this.game.startMission();
                        if (logger) logger.info(`📍 Navigating to game screen`);
                        this.navigateTo('game');
                    } else {
                        if (logger) logger.error('❌ game.startMission function not found!');
                    }
                } else {
                    if (logger) logger.warn('⚠️ No agents selected for mission');
                }
            },
            'returnToHub': () => this.navigateTo('hub'),
            'returnToHubFromDefeat': () => {
                if (logger) logger.info('🏠 returnToHubFromDefeat action called');
                if (this.game?.dialogEngine) {
                    const action = this.game.dialogEngine.actionRegistry?.get('returnToHubFromDefeat');
                    if (action) {
                        if (logger) logger.info('✅ Calling DialogEngine returnToHubFromDefeat handler');
                        action.call(this.game.dialogEngine);
                    } else {
                        if (logger) logger.error('❌ returnToHubFromDefeat not found in DialogEngine actionRegistry');
                    }
                } else {
                    if (logger) logger.error('❌ DialogEngine not available');
                }
            },
            'retryMission': () => {
                if (logger) logger.info('🔄 retryMission action called');
                if (this.game?.dialogEngine) {
                    const action = this.game.dialogEngine.actionRegistry?.get('retryMission');
                    if (action) {
                        if (logger) logger.info('✅ Calling DialogEngine retryMission handler');
                        action.call(this.game.dialogEngine);
                    } else {
                        if (logger) logger.error('❌ retryMission not found in DialogEngine actionRegistry');
                    }
                } else {
                    if (logger) logger.error('❌ DialogEngine not available');
                }
            },
            'returnToMenu': () => this.navigateTo('main-menu')
        };

        const action = actionMap[actionName];
        if (action) {
            action();
        } else {
            if (logger) logger.warn(`Unknown action: ${actionName}`);
        }
    }
}

// Create global instance
window.screenManager = new ScreenManager();

const logger = window.Logger ? new window.Logger('ScreenManager') : null;
if (logger) logger.info('📺 Screen Manager loaded');