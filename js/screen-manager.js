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

        console.log('📺 Screen Manager initialized');
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
        console.log(`📺 Navigating to screen: ${screenId}`);

        const screenConfig = this.screenRegistry.get(screenId);
        if (!screenConfig) {
            console.error(`Screen not found: ${screenId}`);
            return;
        }

        // Clean up current screen
        if (this.currentScreen) {
            this.exitScreen(this.currentScreen);
        }

        // Show new screen
        this.currentScreen = screenId;
        this.enterScreen(screenId, screenConfig, params);

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

        // Execute enter actions
        if (config.onEnter) {
            if (typeof config.onEnter === 'string') {
                // Action name to execute
                this.executeAction(config.onEnter, params);
            } else if (typeof config.onEnter === 'function') {
                config.onEnter.call(this, params);
            }
        }

        // Start screen-specific music
        if (config.music && this.game?.loadScreenMusic) {
            this.game.loadScreenMusic(screenId);
        }
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
        // Show game canvas and HUD
        const gameCanvas = document.getElementById('gameCanvas');
        const gameHUD = document.getElementById('gameHUD');

        if (gameCanvas) {
            gameCanvas.style.display = 'block';
        }
        if (gameHUD) {
            gameHUD.style.display = 'block';
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
        const gameHUD = document.getElementById('gameHUD');

        if (gameCanvas) {
            gameCanvas.style.display = 'none';
        }
        if (gameHUD) {
            gameHUD.style.display = 'none';
        }
    }

    /**
     * Show a generated HTML screen
     */
    showGeneratedScreen(screenId, config, params) {
        // Clear container
        this.screenContainer.innerHTML = '';
        this.screenContainer.style.pointerEvents = 'auto';

        // Create screen element
        const screenEl = document.createElement('div');
        screenEl.id = `screen-${screenId}`;
        screenEl.className = 'game-screen generated-screen';
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

        screenEl.querySelectorAll('.screen-action').forEach(button => {
            button.addEventListener('click', (e) => {
                const actionIndex = parseInt(e.target.dataset.index);
                const action = actions[actionIndex];

                if (action.action) {
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
                if (this.game?.loadGame) {
                    this.game.loadGame();
                } else if (this.game?.dialogEngine) {
                    this.game.dialogEngine.navigateTo('save-load');
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
                if (this.game?.startMission) {
                    this.game.startMission();
                    this.navigateTo('game');
                }
            },
            'returnToHub': () => this.navigateTo('hub'),
            'returnToMenu': () => this.navigateTo('main-menu')
        };

        const action = actionMap[actionName];
        if (action) {
            action();
        } else {
            console.warn(`Unknown action: ${actionName}`);
        }
    }
}

// Create global instance
window.screenManager = new ScreenManager();

console.log('📺 Screen Manager loaded');