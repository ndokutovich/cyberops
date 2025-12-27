/**
 * Screen Manager
 * Manages full-screen application states (not dialogs!)
 * Only one screen can be active at a time
 */

// Initialize logger BEFORE class definition so it's available in all methods
const logger = window.Logger ? new window.Logger('ScreenManager') : null;

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
        if (logger) logger.info(`🔍 NAVIGATE TO START: ${screenId}`);

        const screenConfig = this.screenRegistry.get(screenId);

        if (logger) logger.info(`🔍 Screen config retrieved: ${!!screenConfig}, type: ${screenConfig?.type}`);

        if (!screenConfig) {
            if (logger) logger.error(`❌ Screen not found: ${screenId}`);
            if (logger) logger.error(`   Available screens: ${Array.from(this.screenRegistry.keys()).join(', ')}`);
            return;
        }

        // Store previous screen for transitions
        const previousScreen = this.currentScreen;
        if (logger) logger.info(`🔍 Previous screen: ${previousScreen}`);

        // Clean up current screen
        if (this.currentScreen) {
            if (logger) logger.info(`🔍 Exiting current screen: ${this.currentScreen}`);
            this.exitScreen(this.currentScreen);
        }

        // Show new screen
        this.currentScreen = screenId;

        // Update game state BEFORE enterScreen so onEnter functions can check current screen
        if (this.game) {
            this.game.currentScreen = screenId;
        }

        if (logger) logger.info(`🔍 About to call enterScreen for: ${screenId}`);

        try {
            this.enterScreen(screenId, screenConfig, params);
            if (logger) logger.info(`🔍 enterScreen completed for: ${screenId}`);
        } catch (error) {
            if (logger) logger.error(`❌ Error in enterScreen: ${error.message}`, error);
            throw error;
        }

        // Handle music transitions
        const audioService = this.game?.gameServices?.audioService;
        if (logger) logger.info(`🎵 Music check: prev=${previousScreen}, screenId=${screenId}, music=${screenConfig?.music}, hasAudioService=${!!audioService}`);
        if (previousScreen && previousScreen !== screenId && audioService) {
            // Use music transition system for screen-to-screen navigation
            // This allows for continue, crossfade, skip, etc.
            if (logger) logger.info(`🎵 Transitioning music from ${previousScreen} to ${screenId}`);
            audioService.transitionScreenMusic(previousScreen, screenId);
        } else if (!previousScreen && screenConfig.music && audioService) {
            // First screen load - start music if configured
            if (logger) logger.info(`🎵 Loading music for first screen: ${screenId}`);
            audioService.loadScreenMusic(screenId);
        } else {
            if (logger) logger.warn(`🎵 No music action: prev=${previousScreen}, music=${screenConfig?.music}, hasAudioService=${!!audioService}`);
        }
    }

    /**
     * Enter a screen
     */
    enterScreen(screenId, config, params) {
        if (logger) logger.info(`🔍 ENTER SCREEN START: ${screenId}, type: ${config?.type}`);

        if (!config) {
            if (logger) logger.error(`❌ No config for screen: ${screenId}`);
            return;
        }

        // Handle different screen types
        switch (config.type) {
            case 'dom':
                if (logger) logger.info(`🔍 Showing DOM screen: ${config.elementId}`);
                this.showDOMScreen(config.elementId);
                break;

            case 'canvas':
                if (logger) logger.info(`🔍 Showing canvas screen`);
                this.showCanvasScreen();
                break;

            case 'generated':
                if (logger) logger.info(`🔍 Showing generated screen: ${screenId}`);
                this.showGeneratedScreen(screenId, config, params);
                break;

            default:
                if (logger) logger.error(`❌ Unknown screen type: ${config.type} for ${screenId}`);
                return;
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
        if (logger) logger.info(`🔍 showGeneratedScreen START: ${screenId}`);

        // Hide game canvas and HUD when showing generated screen
        this.hideCanvasScreen();

        // Clear container
        if (!this.screenContainer) {
            if (logger) logger.error(`❌ screenContainer is null!`);
            return;
        }

        this.screenContainer.innerHTML = '';
        this.screenContainer.style.pointerEvents = 'auto';

        if (logger) logger.info(`🔍 Container cleared, creating screen element`);

        // Create screen element
        const screenEl = document.createElement('div');
        screenEl.id = `screen-${screenId}`;

        // Add fade-in class for main-menu if configured
        let screenClasses = 'game-screen generated-screen';
        if (screenId === 'main-menu' && window.SPLASH_CONFIG?.transition?.contentFadeIn) {
            screenClasses += ' screen-fade-in';
        }

        // Add demoscene-specific class for proper styling
        if (screenId === 'demoscene') {
            screenClasses += ' demoscene-screen';
        }

        screenEl.className = screenClasses;

        // For demoscene, use position: fixed with z-index higher than dialog systems
        if (screenId === 'demoscene') {
            screenEl.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                display: flex !important;
                flex-direction: column;
            `;
        } else {
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
        }

        // Generate content
        let content = '';
        if (config.content) {
            if (typeof config.content === 'string') {
                content = config.content;
            } else if (typeof config.content === 'function') {
                if (logger) logger.info(`🔍 Calling content function for ${screenId}`);
                try {
                    content = config.content.call(this, params);
                    if (logger) logger.info(`🔍 Content generated, length: ${content.length}`);
                } catch (error) {
                    if (logger) logger.error(`❌ Error generating content: ${error.message}`, error);
                    throw error;
                }
            }
        }

        // Add content
        screenEl.innerHTML = `
            <div class="screen-content">
                ${content}
            </div>
            ${this.generateScreenActions(config.actions, screenId)}
        `;

        if (logger) logger.info(`🔍 Screen element HTML set, children: ${screenEl.children.length}`);

        // Add to container (demoscene appends to body for proper z-index)
        if (screenId === 'demoscene') {
            document.body.appendChild(screenEl);
            if (logger) logger.info(`🔍 Demoscene appended directly to body`);
        } else {
            this.screenContainer.appendChild(screenEl);
            if (logger) logger.info(`🔍 Screen appended to container, total children: ${this.screenContainer.children.length}`);
        }

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
            if (logger) logger.info(`🔍 Removed generated screen: ${screenId}`);
        }
        // Only reset screenContainer pointer events if it's not demoscene (which is on body)
        if (screenId !== 'demoscene') {
            this.screenContainer.style.pointerEvents = 'none';
        }
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

                    // Check if there's an intro cutscene for this mission
                    const missionId = this.game.currentMission?.id;
                    const cutsceneId = missionId ? `mission-${missionId.replace('main-', '')}-intro` : null;

                    if (cutsceneId && window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
                        // Navigate to cutscene screen - cutscene's onComplete handles starting gameplay
                        if (logger) logger.info(`🎬 Playing mission intro: ${cutsceneId}`);
                        this.navigateTo('cutscene', { cutsceneId: cutsceneId });
                    } else {
                        // No cutscene, start mission directly
                        if (this.game?.startMission) {
                            if (logger) logger.info(`📍 Calling game.startMission()`);
                            this.game.startMission();
                            if (logger) logger.info(`📍 Navigating to game screen`);
                            this.navigateTo('game');
                        } else {
                            if (logger) logger.error('❌ game.startMission function not found!');
                        }
                    }
                } else {
                    if (logger) logger.warn('⚠️ No agents selected for mission');
                }
            },
            'returnToHub': () => this.navigateTo('hub'),
            'returnToHubFromVictory': () => {
                if (logger) logger.info('🏠 returnToHubFromVictory action called');
                if (!this.game?.dialogEngine) {
                    throw new Error('DialogEngine not available - required for returnToHubFromVictory');
                }
                const action = this.game.dialogEngine.actionRegistry?.get('returnToHubFromVictory');
                if (!action) {
                    throw new Error('returnToHubFromVictory action not registered in DialogEngine');
                }
                if (logger) logger.info('✅ Calling DialogEngine returnToHubFromVictory handler');
                action.call(this.game.dialogEngine);
            },
            'returnToHubFromDefeat': () => {
                if (logger) logger.info('🏠 returnToHubFromDefeat action called');
                if (!this.game?.dialogEngine) {
                    throw new Error('DialogEngine not available - required for returnToHubFromDefeat');
                }
                const action = this.game.dialogEngine.actionRegistry?.get('returnToHubFromDefeat');
                if (!action) {
                    throw new Error('returnToHubFromDefeat action not registered in DialogEngine');
                }
                if (logger) logger.info('✅ Calling DialogEngine returnToHubFromDefeat handler');
                action.call(this.game.dialogEngine);
            },
            'retryMission': () => {
                if (logger) logger.info('🔄 retryMission action called');
                if (!this.game?.dialogEngine) {
                    throw new Error('DialogEngine not available - required for retryMission');
                }
                const action = this.game.dialogEngine.actionRegistry?.get('retryMission');
                if (!action) {
                    throw new Error('retryMission action not registered in DialogEngine');
                }
                if (logger) logger.info('✅ Calling DialogEngine retryMission handler');
                action.call(this.game.dialogEngine);
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

// Logger is now defined at the top of the file
if (logger) logger.info('📺 Screen Manager loaded');