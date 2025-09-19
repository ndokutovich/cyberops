/**
 * Declarative Dialog Engine
 * A fully data-driven dialog system where ALL behavior is defined in configuration
 * Zero hardcoded dialog logic - everything is declarative
 */

class DeclarativeDialogEngine {
    constructor() {
        this.config = null;
        this.currentState = null;
        this.stateStack = [];
        this.stateData = {};
        this.actionRegistry = new Map();
        this.validatorRegistry = new Map();
        this.generatorRegistry = new Map();
        this.eventListeners = new Map();
        this.animationQueue = [];
        this.soundQueue = [];

        // Template engine for rendering
        this.templateCache = new Map();

        // Initialize core registries
        this.registerCoreActions();
        this.registerCoreValidators();
        this.registerCoreGenerators();
    }

    /**
     * Initialize with configuration
     */
    initialize(config) {
        console.log('🚀 Initializing Declarative Dialog Engine');

        // Validate configuration
        if (!this.validateConfig(config)) {
            throw new Error('Invalid dialog configuration');
        }

        this.config = config;

        // Setup keyboard handling
        if (config.settings?.enableKeyboard) {
            this.setupKeyboardHandling();
        }

        // Initialize subsystems
        this.initializeSounds();
        this.initializeAnimations();

        console.log('✅ Dialog Engine initialized with', Object.keys(config.states).length, 'states');
    }

    /**
     * Validate configuration structure
     */
    validateConfig(config) {
        if (!config || !config.states) {
            console.error('Config must have states object');
            return false;
        }

        // Validate each state
        for (const [stateId, state] of Object.entries(config.states)) {
            if (!state.type || !state.level) {
                console.error(`State ${stateId} missing required fields`);
                return false;
            }

            // Validate parent relationships
            if (state.parent && !config.states[state.parent] && state.parent !== 'hub' && state.parent !== 'game') {
                console.error(`State ${stateId} has invalid parent: ${state.parent}`);
                return false;
            }
        }

        return true;
    }

    /**
     * Navigate to a state
     */
    navigateTo(stateId, params = {}) {
        const state = this.config.states[stateId];

        if (!state) {
            console.error(`State not found: ${stateId}`);
            return false;
        }

        // Check if transition is allowed
        if (!this.canTransition(this.currentState, stateId)) {
            console.warn(`Transition not allowed: ${this.currentState} -> ${stateId}`);
            return false;
        }

        // Execute exit transition for current state
        if (this.currentState) {
            this.executeStateExit(this.currentState);
        }

        // Update stack based on level
        this.updateStateStack(stateId, state);

        // Store state data
        this.stateData[stateId] = params;

        // Render the new state
        this.renderState(stateId, state, params);

        // Execute enter transition
        this.executeStateEnter(stateId, state);

        // Update current state
        this.currentState = stateId;

        // Update breadcrumb
        this.updateBreadcrumb();

        // Emit state change event
        this.emitEvent('stateChanged', { from: this.currentState, to: stateId, params });

        return true;
    }

    /**
     * Check if transition is allowed
     */
    canTransition(fromId, toId) {
        // Always allow if no current state
        if (!fromId) return true;

        const transitionKey = `${fromId}->${toId}`;
        const transition = this.config.transitions?.[transitionKey];

        // If no specific transition defined, check general rules
        if (!transition) {
            const toState = this.config.states[toId];
            const fromState = this.config.states[fromId];

            if (!toState || !fromState) return false;

            // Allow navigation to parent
            if (toState.id === fromState.parent) return true;

            // Allow navigation to children
            if (fromState.children?.includes(toId)) return true;

            // Allow navigation from parent to any child
            if (toState.parent === fromId) return true;

            // Default allow for now (less strict validation)
            console.log(`Allowing transition: ${fromId} -> ${toId} (no specific rule)`);
            return true;
        }

        // Check condition
        if (transition.condition === 'always') return true;

        const validator = this.validatorRegistry.get(transition.condition);
        return validator ? validator.call(window.game) : true;
    }

    /**
     * Render state to DOM
     */
    renderState(stateId, state, params) {
        // Get or create container
        let container = document.getElementById('declarative-dialog-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'declarative-dialog-container';
            container.className = 'declarative-dialog-container';
            document.body.appendChild(container);
        }

        // Get layout template
        const layout = this.config.layouts?.[state.layout] || this.getDefaultLayout();

        // Generate content
        const content = this.generateContent(state.content, params);

        // Generate buttons
        const buttons = this.generateButtons(state.buttons, stateId);

        // Build final HTML
        const html = this.renderTemplate(layout.structure, {
            title: state.title || '',
            content: content,
            buttons: buttons,
            stateId: stateId,
            level: state.level
        });

        // Create dialog element
        const dialogEl = document.createElement('div');
        dialogEl.className = `declarative-dialog level-${state.level}`;
        dialogEl.id = `dialog-${stateId}`;
        dialogEl.innerHTML = html;

        // Apply styles
        if (layout.styles) {
            Object.assign(dialogEl.style, layout.styles);
        }

        // Calculate z-index for stacking
        const zIndex = 10000 + (this.stateStack.length * 10);
        dialogEl.style.zIndex = zIndex;

        // Add to container
        container.appendChild(dialogEl);

        // Bind event handlers
        this.bindEventHandlers(dialogEl, state, stateId);

        // Apply enter animation
        if (state.transitions?.enter?.animation) {
            this.applyAnimation(dialogEl, state.transitions.enter.animation);
        }
    }

    /**
     * Generate content based on config
     */
    generateContent(contentConfig, params) {
        if (!contentConfig) return '';

        switch (contentConfig.type) {
            case 'static':
                return contentConfig.html || '';

            case 'dynamic':
                const generator = this.generatorRegistry.get(contentConfig.generator);
                if (generator) {
                    const game = window.game;
                    return generator.call(game, params);
                }
                return `<p>Generator not found: ${contentConfig.generator}</p>`;

            case 'template':
                const template = this.config.templates?.[contentConfig.template];
                if (template) {
                    const data = this.getData(contentConfig.data, params);
                    return this.renderTemplate(template, data);
                }
                return `<p>Template not found: ${contentConfig.template}</p>`;

            case 'list':
                return this.generateList(contentConfig, params);

            case 'conditional':
                return this.generateConditional(contentConfig, params);

            default:
                return `<p>Unknown content type: ${contentConfig.type}</p>`;
        }
    }

    /**
     * Generate list content
     */
    generateList(config, params) {
        const game = window.game;
        const source = this.getData(config.source, params);

        if (!Array.isArray(source)) {
            return '<p>No items available</p>';
        }

        let items = [...source];

        // Apply filter
        if (config.filter) {
            const filterFn = new Function('item', `return ${config.filter}`);
            items = items.filter(filterFn);
        }

        // Apply sort
        if (config.sortBy) {
            items.sort((a, b) => a[config.sortBy] - b[config.sortBy]);
        }

        // Check if empty
        if (items.length === 0) {
            return `<p class="empty-message">${config.emptyMessage || 'No items available'}</p>`;
        }

        // Render items
        const template = this.config.templates?.[config.template];
        if (!template) return '<p>Template not found</p>';

        let html = '<div class="dialog-list-items">';
        items.forEach(item => {
            html += this.renderTemplate(template, item);
        });
        html += '</div>';

        return html;
    }

    /**
     * Generate conditional content
     */
    generateConditional(config, params) {
        for (const condition of config.conditions) {
            const validator = this.validatorRegistry.get(condition.test);
            const result = validator ? validator.call(window.game) : condition.test === 'always';

            if (result) {
                return this.generateContent(condition.render, params);
            }
        }

        return '';
    }

    /**
     * Generate buttons
     */
    generateButtons(buttonsConfig, stateId) {
        if (!buttonsConfig) return '';

        let html = '<div class="dialog-buttons-container">';

        // Handle different button config formats
        if (Array.isArray(buttonsConfig)) {
            // Simple array of buttons
            buttonsConfig.forEach((btn, index) => {
                html += this.createButton(btn, index, stateId);
            });
        } else if (buttonsConfig.template) {
            // Template-based buttons
            const template = this.config.buttonTemplates?.[buttonsConfig.template];
            if (template) {
                html += this.renderTemplate(template, { buttons: buttonsConfig.items, stateId });
            } else if (buttonsConfig.items) {
                buttonsConfig.items.forEach((btn, index) => {
                    html += this.createButton(btn, index, stateId);
                });
            }
        }

        html += '</div>';
        return html;
    }

    /**
     * Create a single button
     */
    createButton(button, index, stateId) {
        const classes = ['dialog-button'];
        if (button.primary) classes.push('primary');
        if (button.danger) classes.push('danger');

        return `
            <button class="${classes.join(' ')}"
                    data-action="${button.action}"
                    data-state="${stateId}"
                    data-index="${index}">
                ${button.icon ? `<span class="button-icon">${button.icon}</span>` : ''}
                <span class="button-text">${button.text}</span>
            </button>
        `;
    }

    /**
     * Bind event handlers to dialog
     */
    bindEventHandlers(element, state, stateId) {
        // Button clicks
        element.querySelectorAll('.dialog-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = btn.dataset.action;
                if (action) {
                    this.handleAction(action, { stateId, element: btn, event: e });
                }
            });
        });

        // Close button
        const closeBtn = element.querySelector('.dialog-close-button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
            });
        }

        // List item actions
        element.querySelectorAll('[data-action]').forEach(el => {
            if (!el.classList.contains('dialog-button')) {
                el.addEventListener('click', (e) => {
                    const action = el.dataset.action;
                    this.handleAction(action, { stateId, element: el, event: e });
                });
            }
        });
    }

    /**
     * Handle action execution
     */
    handleAction(actionString, context) {
        console.log('🎮 Handling action:', actionString);

        // Parse action string (e.g., "navigate:view-squad" or "execute:hire:42")
        const parts = actionString.split(':');
        const actionType = parts[0];
        const actionParams = parts.slice(1);

        // Special handling for navigation with dynamic states
        if (actionType === 'navigate' && actionParams.length > 1) {
            // This is a dynamic state ID like "agent-equipment:3"
            const baseStateId = actionParams[0];
            const dynamicId = actionParams[1];

            // Check if base state exists
            if (this.config.states[baseStateId]) {
                // Store the dynamic ID in state data for the target state
                this.stateData[baseStateId] = {
                    ...this.stateData[baseStateId],
                    dynamicId: dynamicId,
                    selectedId: dynamicId
                };

                // Navigate to the base state with context
                this.navigateTo(baseStateId, { dynamicId });
                return;
            }
        }

        // Join params back for regular handling
        const actionParam = actionParams.join(':');

        // Get action handler
        const handler = this.actionRegistry.get(actionType);

        if (handler) {
            handler.call(this, actionParam, context);
        } else {
            console.error('Unknown action type:', actionType);
        }
    }

    /**
     * Update state stack
     */
    updateStateStack(stateId, state) {
        // Determine stack behavior based on level
        const currentLevel = this.stateStack.length;
        const targetLevel = state.level;

        if (targetLevel <= currentLevel) {
            // Pop states until we reach the right level
            while (this.stateStack.length >= targetLevel) {
                const poppedState = this.stateStack.pop();
                this.closeStateDialog(poppedState.id);
            }
        }

        // Push new state
        this.stateStack.push({ id: stateId, state: state });
    }

    /**
     * Close state dialog
     */
    closeStateDialog(stateId) {
        const element = document.getElementById(`dialog-${stateId}`);
        if (element) {
            // Apply exit animation if configured
            const state = this.config.states[stateId];
            if (state?.transitions?.exit?.animation) {
                this.applyAnimation(element, state.transitions.exit.animation, () => {
                    element.remove();
                });
            } else {
                element.remove();
            }
        }
    }

    /**
     * Navigate back
     */
    back() {
        if (this.stateStack.length > 0) {
            // Pop current state
            const current = this.stateStack.pop();
            this.closeStateDialog(current.id);

            // Navigate to parent
            if (this.stateStack.length > 0) {
                const parent = this.stateStack[this.stateStack.length - 1];
                this.currentState = parent.id;
                this.updateBreadcrumb();
            } else {
                this.currentState = null;
                this.returnToBase();
            }
        }
    }

    /**
     * Close current dialog only
     */
    close() {
        if (this.stateStack.length > 0) {
            const state = this.stateStack.pop();
            this.closeStateDialog(state.id);

            // If there are more dialogs in the stack, show the previous one
            if (this.stateStack.length > 0) {
                const prevState = this.stateStack[this.stateStack.length - 1];
                this.currentState = prevState.state;
                // Re-render the previous state
                this.navigateTo(prevState.state.id, prevState.params);
            } else {
                this.currentState = null;
                this.returnToBase();
            }

            this.updateBreadcrumb();
        }
    }

    /**
     * Close all dialogs
     */
    closeAll() {
        while (this.stateStack.length > 0) {
            const state = this.stateStack.pop();
            this.closeStateDialog(state.id);
        }

        this.currentState = null;
        this.updateBreadcrumb();
        this.returnToBase();
    }

    /**
     * Return to base screen
     */
    returnToBase() {
        const game = window.game;
        if (game) {
            // Clean up container
            const container = document.getElementById('declarative-dialog-container');
            if (container) {
                container.innerHTML = '';
            }

            // Return to appropriate screen
            if (game.currentScreen === 'hub') {
                if (game.updateHubStats) game.updateHubStats();
            }
        }
    }

    /**
     * Update breadcrumb display
     */
    updateBreadcrumb() {
        if (!this.config.settings?.enableBreadcrumb) return;

        let breadcrumb = document.getElementById('dialog-breadcrumb');
        if (!breadcrumb) {
            breadcrumb = document.createElement('div');
            breadcrumb.id = 'dialog-breadcrumb';
            breadcrumb.className = 'dialog-breadcrumb';
            document.body.appendChild(breadcrumb);
        }

        if (this.stateStack.length === 0) {
            breadcrumb.style.display = 'none';
            return;
        }

        // Build breadcrumb path
        const path = ['Hub'];
        this.stateStack.forEach(({ state }) => {
            path.push(state.title || state.id);
        });

        breadcrumb.innerHTML = path.join(' > ');
        breadcrumb.style.display = 'block';
    }

    /**
     * Template rendering
     */
    renderTemplate(template, data) {
        // Simple template engine - replace {{variable}} with data
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : '';
        }).replace(/\{\{#if\s+(\w+)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/gs, (match, condition, ifContent, elseContent) => {
            return data[condition] ? ifContent : elseContent;
        });
    }

    /**
     * Get data from path
     */
    getData(dataPath, params) {
        if (!dataPath) return params;

        const game = window.game;

        // Handle special data paths
        if (dataPath === 'selectedAgent') {
            return this.stateData.selectedAgent;
        }

        // Get from game object
        const parts = dataPath.split('.');
        let value = game;

        for (const part of parts) {
            value = value?.[part];
        }

        return value !== undefined ? value : params;
    }

    /**
     * Get default layout
     */
    getDefaultLayout() {
        return {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content">{{content}}</div>
                <div class="dialog-actions">{{buttons}}</div>
            `,
            styles: {
                maxWidth: '600px',
                maxHeight: '500px'
            }
        };
    }

    /**
     * Execute state enter actions
     */
    executeStateEnter(stateId, state) {
        // Play sound
        if (state.transitions?.enter?.sound) {
            this.playSound(state.transitions.enter.sound);
        }

        // Trigger events
        if (state.transitions?.enter?.events) {
            state.transitions.enter.events.forEach(event => {
                this.emitEvent(event, { stateId });
            });
        }
    }

    /**
     * Execute state exit actions
     */
    executeStateExit(stateId) {
        const state = this.config.states[stateId];

        if (state?.transitions?.exit?.sound) {
            this.playSound(state.transitions.exit.sound);
        }

        if (state?.transitions?.exit?.events) {
            state.transitions.exit.events.forEach(event => {
                this.emitEvent(event, { stateId });
            });
        }
    }

    /**
     * Apply animation
     */
    applyAnimation(element, animationName, callback) {
        const animation = this.config.animations?.[animationName];

        if (!animation) {
            if (callback) callback();
            return;
        }

        // Apply from state
        Object.assign(element.style, animation.from);

        // Force reflow
        element.offsetHeight;

        // Apply transition
        element.style.transition = `all ${animation.duration || 300}ms ${animation.easing || 'ease-out'}`;

        // Apply to state
        requestAnimationFrame(() => {
            Object.assign(element.style, animation.to);

            if (callback) {
                setTimeout(callback, animation.duration || 300);
            }
        });
    }

    /**
     * Play sound effect
     */
    playSound(soundId) {
        const sound = this.config.sounds?.[soundId];
        if (!sound) return;

        // Use game's audio system if available
        const game = window.game;
        if (game?.playSound) {
            game.playSound(sound.file, sound.volume);
        } else {
            // Fallback to audio element
            const audio = new Audio(`sounds/${sound.file}`);
            audio.volume = sound.volume || 0.5;
            audio.play().catch(e => console.log('Sound play failed:', e));
        }
    }

    /**
     * Emit event
     */
    emitEvent(eventName, data) {
        const eventConfig = this.config.events?.[eventName];

        if (eventConfig?.listeners) {
            eventConfig.listeners.forEach(listener => {
                const handler = this.eventListeners.get(listener);
                if (handler) {
                    handler(data);
                }
            });
        }

        // Broadcast to game
        const game = window.game;
        if (game && eventConfig?.broadcast) {
            if (game[eventName]) {
                game[eventName](data);
            }
        }
    }

    /**
     * Register core action handlers
     */
    registerCoreActions() {
        // Navigation
        this.actionRegistry.set('navigate', (target, context) => {
            this.navigateTo(target, context);
        });

        // Back
        this.actionRegistry.set('back', () => {
            this.back();
        });

        // Close current dialog only
        this.actionRegistry.set('close', () => {
            this.close();
        });

        // Close all dialogs
        this.actionRegistry.set('closeAll', () => {
            this.closeAll();
        });

        // Execute game function or registered action
        this.actionRegistry.set('execute', (funcName, context) => {
            // funcName might be something like "showEquipmentForAgent:1"
            // Split it to get the actual function name and parameters
            const parts = funcName.split(':');
            const actualFuncName = parts[0];
            const params = parts.slice(1).join(':');

            // First check if there's a registered action handler
            const registeredHandler = this.actionRegistry.get(actualFuncName);
            if (registeredHandler) {
                registeredHandler.call(this, params || context);
                return;
            }

            // Otherwise try to call it as a game function
            const game = window.game;
            if (game && game[actualFuncName]) {
                game[actualFuncName](params || context);
            }
        });

        // Refresh current dialog
        this.actionRegistry.set('refresh', () => {
            if (this.currentState) {
                const state = this.config.states[this.currentState];
                const element = document.getElementById(`dialog-${this.currentState}`);
                if (element && state) {
                    const content = this.generateContent(state.content, this.stateData[this.currentState]);
                    const contentEl = element.querySelector('.dialog-content');
                    if (contentEl) {
                        contentEl.innerHTML = content;
                    }
                }
            }
        });
    }

    /**
     * Register core validators
     */
    registerCoreValidators() {
        this.validatorRegistry.set('always', () => true);
        this.validatorRegistry.set('never', () => false);
        this.validatorRegistry.set('hasAgents', function() { return this.activeAgents?.length > 0; });
        this.validatorRegistry.set('hasCredits', function() { return this.credits > 0; });
        this.validatorRegistry.set('hasInitialized', function() { return this.initialized === true; });
    }

    /**
     * Register core content generators
     */
    registerCoreGenerators() {
        // Agent overview generator
        this.generatorRegistry.set('generateAgentOverview', function() {
            if (!this.activeAgents || this.activeAgents.length === 0) {
                return '<p>No active agents. Hire agents to build your team.</p>';
            }

            let html = '<div class="agent-overview">';
            this.activeAgents.forEach(agent => {
                html += `
                    <div class="agent-card">
                        <div class="agent-name">${agent.name}</div>
                        <div class="agent-stats">
                            Health: ${agent.health} |
                            Damage: ${agent.damage} |
                            Speed: ${agent.speed}
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            return html;
        });
    }

    /**
     * Register custom action handler
     */
    registerAction(name, handler) {
        this.actionRegistry.set(name, handler);
    }

    /**
     * Register custom validator
     */
    registerValidator(name, validator) {
        this.validatorRegistry.set(name, validator);
    }

    /**
     * Register custom generator
     */
    registerGenerator(name, generator) {
        this.generatorRegistry.set(name, generator);
    }

    /**
     * Hot reload configuration
     */
    reloadConfig(newConfig) {
        console.log('🔄 Hot reloading dialog configuration');

        // Validate new config
        if (!this.validateConfig(newConfig)) {
            console.error('Invalid configuration, reload aborted');
            return false;
        }

        // Save current state
        const currentState = this.currentState;
        const stateStack = [...this.stateStack];
        const stateData = { ...this.stateData };

        // Update config
        this.config = newConfig;

        // Restore state if possible
        if (currentState && newConfig.states[currentState]) {
            this.currentState = currentState;
            this.stateStack = stateStack;
            this.stateData = stateData;

            // Re-render current dialog
            const element = document.getElementById(`dialog-${currentState}`);
            if (element) {
                element.remove();
                this.renderState(currentState, newConfig.states[currentState], stateData[currentState]);
            }
        }

        console.log('✅ Configuration reloaded successfully');
        return true;
    }

    /**
     * Setup keyboard handling
     */
    setupKeyboardHandling() {
        document.addEventListener('keydown', (e) => {
            // Check if dialog is active
            if (this.stateStack.length === 0) return;

            const currentState = this.config.states[this.currentState];
            if (!currentState) return;

            // Check state-specific keyboard config
            const stateKeyboard = currentState.keyboard?.[e.key];
            if (stateKeyboard) {
                e.preventDefault();
                this.handleAction(stateKeyboard, { key: e.key });
                return;
            }

            // Check global keyboard config
            const globalKeyboard = this.config.keyboard?.global?.[e.key];
            if (globalKeyboard) {
                e.preventDefault();
                this.handleAction(globalKeyboard, { key: e.key });
            }
        });
    }

    /**
     * Initialize sound system
     */
    initializeSounds() {
        // Preload sounds if configured
        if (this.config.sounds) {
            Object.entries(this.config.sounds).forEach(([id, sound]) => {
                if (sound.preload) {
                    const audio = new Audio(`sounds/${sound.file}`);
                    audio.preload = 'auto';
                }
            });
        }
    }

    /**
     * Initialize animation system
     */
    initializeAnimations() {
        // Add animation styles if not present
        if (!document.getElementById('declarative-dialog-animations')) {
            const style = document.createElement('style');
            style.id = 'declarative-dialog-animations';
            style.textContent = `
                .declarative-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 40, 80, 0.95));
                    border: 2px solid #00ffff;
                    border-radius: 10px;
                    padding: 20px;
                    color: #fff;
                    box-shadow: 0 10px 50px rgba(0, 255, 255, 0.3);
                }

                .declarative-dialog-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    pointer-events: none;
                    z-index: 10000;
                }

                .declarative-dialog-container .declarative-dialog {
                    pointer-events: auto;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

// Create global instance
window.declarativeDialogEngine = new DeclarativeDialogEngine();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeclarativeDialogEngine;
}