/**
 * Declarative Dialog Engine
 * A fully data-driven dialog system where ALL behavior is defined in configuration
 * Zero hardcoded dialog logic - everything is declarative
 */

class DeclarativeDialogEngine {
    constructor() {

        // Initialize logger
        this.logger = window.Logger ? new window.Logger('DialogEngine') : null;
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
        if (this.logger) this.logger.debug('🚀 Initializing Declarative Dialog Engine');

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

        if (this.logger) this.logger.info('✅ Dialog Engine initialized with', Object.keys(config.states).length, 'states');
    }

    /**
     * Validate configuration structure
     */
    validateConfig(config) {
        if (!config || !config.states) {
            if (this.logger) this.logger.error('Config must have states object');
            return false;
        }

        // Validate each state
        for (const [stateId, state] of Object.entries(config.states)) {
            if (!state.type || (state.level === undefined || state.level === null)) {
                if (this.logger) this.logger.error(`State ${stateId} missing required fields (type: ${state.type}, level: ${state.level})`);
                return false;
            }

            // Validate parent relationships
            if (state.parent && !config.states[state.parent] && state.parent !== 'hub' && state.parent !== 'game') {
                if (this.logger) this.logger.error(`State ${stateId} has invalid parent: ${state.parent}`);
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
            if (this.logger) this.logger.error(`State not found: ${stateId}`);
            return false;
        }

        // Check if we're refreshing the same state
        const isRefresh = this.currentState === stateId;

        if (isRefresh) {
            if (this.logger) this.logger.debug(`🔄 Refreshing state: ${stateId}`);
        } else {
            if (this.logger) this.logger.debug(`➡️ Navigating from ${this.currentState} to ${stateId}`);
        }

        // Check if transition is allowed
        if (!this.canTransition(this.currentState, stateId)) {
            if (this.logger) this.logger.warn(`Transition not allowed: ${this.currentState} -> ${stateId}`);
            return false;
        }

        // Execute exit transition for current state (skip if refreshing)
        if (this.currentState && !isRefresh) {
            this.executeStateExit(this.currentState);
        }

        // Update stack based on level (skip if refreshing to avoid closing dialog)
        if (!isRefresh) {
            this.updateStateStack(stateId, state);
        }

        // Store state data
        this.stateData[stateId] = params;

        // Render the new state (pass isRefresh flag)
        this.renderState(stateId, state, params, isRefresh);

        // Execute enter transition (skip if refreshing)
        if (!isRefresh) {
            this.executeStateEnter(stateId, state);
        }

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
            if (this.logger) this.logger.debug(`Allowing transition: ${fromId} -> ${toId} (no specific rule)`);
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
    renderState(stateId, state, params, isRefresh = false) {
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

        // Build final HTML - use placeholder for content to insert later
        // Spread params into template data so custom placeholders (avatar, name, etc.) get substituted
        const html = this.renderTemplate(layout.structure, {
            title: state.title || '',
            content: '__CONTENT_PLACEHOLDER__',
            buttons: buttons,
            stateId: stateId,
            level: state.level,
            ...params  // Include custom params like avatar, name for NPC dialogs
        });

        // Check if dialog already exists (refresh scenario)
        let dialogEl = document.getElementById(`dialog-${stateId}`);

        if (isRefresh && dialogEl) {
            // Just update the content without creating a new element
            const contentEl = dialogEl.querySelector('.dialog-content');
            if (contentEl) {
                contentEl.innerHTML = content;
            }

            // Note: We're NOT updating buttons or re-binding handlers
            // because the buttons don't change and re-binding causes issues
            // The onclick handlers in the HTML will still work

            return; // Skip the rest, no need for animations or re-adding to DOM
        }

        // Create new dialog element if not refreshing
        if (!dialogEl) {
            dialogEl = document.createElement('div');
            // Add layout-specific class for proper styling
            const layoutClass = state.layout ? `layout-${state.layout}` : 'layout-standard';
            dialogEl.className = `declarative-dialog level-${state.level} ${layoutClass}`;
            dialogEl.id = `dialog-${stateId}`;
        }
        dialogEl.innerHTML = html;

        // Replace placeholder with actual HTML content
        const contentEl = dialogEl.querySelector('.dialog-content');
        if (contentEl && content !== '__CONTENT_PLACEHOLDER__') {
            contentEl.innerHTML = content.replace('__CONTENT_PLACEHOLDER__', '');
        }

        // Apply styles
        if (layout.styles) {
            if (this.logger) this.logger.debug('🎨 Applying styles to dialog:', stateId, layout.styles);
            Object.assign(dialogEl.style, layout.styles);
            if (this.logger) this.logger.debug('🎨 Dialog element actual width after styles:', dialogEl.style.width);
        } else {
            if (this.logger) this.logger.debug('⚠️ No styles found for layout:', state.layout);
        }

        // Force Arsenal dialog to be wide
        if (stateId === 'arsenal') {
            if (this.logger) this.logger.debug('🔫 Forcing Arsenal dialog to 1200px width');
            dialogEl.style.width = '1200px';
            dialogEl.style.maxWidth = '1200px';
            dialogEl.style.minWidth = '1100px';

            // Also force the dialog-content to be full width
            setTimeout(() => {
                const contentEl = dialogEl.querySelector('.dialog-content');
                if (contentEl) {
                    if (this.logger) this.logger.debug('🔫 Forcing dialog-content to full width');
                    contentEl.style.width = '100%';
                    contentEl.style.maxWidth = '100%';
                    contentEl.style.minWidth = '1100px';
                }
            }, 10);
        }

        // Calculate z-index for stacking - lower than HUD dialogs (20000)
        const zIndex = 9000 + (this.stateStack.length * 10);
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
                    // Pass game as context but provide dialog engine via property
                    game._dialogEngineContext = this;
                    const result = generator.call(game, params);
                    delete game._dialogEngineContext;
                    return result;
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

            case 'tabbed':
                return this.generateTabbed(contentConfig, params);

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
            if (this.logger) this.logger.debug(`Applying filter: ${config.filter}`);
            if (this.logger) this.logger.debug(`Items before filter: ${items.length} agents`);
            items.forEach(item => { if (this.logger) this.logger.debug(`  - ${item.name}: hired=${item.hired}`); });

            // Handle arrow function syntax
            if (config.filter.includes('=>')) {
                // It's already an arrow function, evaluate it
                const filterFn = eval(`(${config.filter})`);
                items = items.filter(filterFn);
            } else {
                // It's a simple expression, wrap in return
                const filterFn = new Function('item', `return ${config.filter}`);
                items = items.filter(filterFn);
            }

            if (this.logger) this.logger.debug(`Items after filter: ${items.length} agents`);
            items.forEach(item => { if (this.logger) this.logger.debug(`  - ${item.name}: hired=${item.hired}`); });
        }

        // Add computed properties for hire-agents
        if (config.source === 'availableAgents') {
            items = items.map(agent => {
                const canAfford = game.credits >= (agent.cost || 0);
                if (this.logger) this.logger.debug(`Agent ${agent.name}: cost=${agent.cost}, credits=${game.credits}, affordable=${canAfford}`);
                return {
                    ...agent,
                    affordable: canAfford,
                    // Format skills array for display
                    skills: Array.isArray(agent.skills) ? agent.skills.join(', ') : (agent.skills || 'none')
                };
            });
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
     * Generate tabbed content
     */
    generateTabbed(config, params) {
        if (!config.tabs || !Array.isArray(config.tabs) || config.tabs.length === 0) {
            return '<p>No tabs configured</p>';
        }

        const game = window.game;
        // Determine active tab and store it
        const activeTab = this.activeTab || config.tabs[0].id;
        this.activeTab = activeTab;  // Store for test verification

        // Generate tab navigation
        let html = '<div class="tabbed-content-wrapper">';
        html += '<div class="tab-navigation" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #444; padding-bottom: 10px;">';

        config.tabs.forEach(tab => {
            const isActive = tab.id === activeTab;
            html += `
                <button
                    class="tab-button ${isActive ? 'active' : ''}"
                    onclick="(window.declarativeDialogEngine || window.game?.dialogEngine)?.switchTab('${tab.id}')"
                    style="
                        background: ${isActive ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
                        border: 1px solid ${isActive ? '#00ffff' : '#444'};
                        color: ${isActive ? '#00ffff' : '#ccc'};
                        padding: 10px 20px;
                        cursor: pointer;
                        border-radius: 5px 5px 0 0;
                        font-size: 14px;
                        transition: all 0.2s;
                    "
                    onmouseover="if (!this.classList.contains('active')) { this.style.background = 'rgba(255, 255, 255, 0.1)'; this.style.borderColor = '#666'; }"
                    onmouseout="if (!this.classList.contains('active')) { this.style.background = 'rgba(255, 255, 255, 0.05)'; this.style.borderColor = '#444'; }"
                >
                    ${tab.icon || ''} ${tab.label}
                </button>
            `;
        });

        html += '</div>';

        // Generate tab content areas
        config.tabs.forEach(tab => {
            const isActive = tab.id === activeTab;
            html += `
                <div class="tab-content" id="tab-content-${tab.id}" style="display: ${isActive ? 'block' : 'none'};">
            `;

            // Generate content for this tab using its generator
            if (tab.generator) {
                const generator = this.generatorRegistry.get(tab.generator);
                if (generator) {
                    game._dialogEngineContext = this;
                    html += generator.call(game, params);
                    delete game._dialogEngineContext;
                } else {
                    html += `<p style="color: #ff4444;">Generator not found: ${tab.generator}</p>`;
                }
            } else if (tab.content) {
                // Direct content
                html += tab.content;
            } else {
                html += '<p>No content configured for this tab</p>';
            }

            html += '</div>';
        });

        html += '</div>';
        return html;
    }

    /**
     * Switch active tab in tabbed content
     */
    switchTab(tabId) {
        this.activeTab = tabId;

        // Hide all tab contents and deactivate all buttons
        const tabContents = document.querySelectorAll('.tab-content');
        const tabButtons = document.querySelectorAll('.tab-button');

        tabContents.forEach(content => {
            content.style.display = 'none';
        });

        tabButtons.forEach(button => {
            button.classList.remove('active');
            button.style.background = 'rgba(255, 255, 255, 0.05)';
            button.style.borderColor = '#444';
            button.style.color = '#ccc';
        });

        // Show active tab content
        const activeContent = document.getElementById(`tab-content-${tabId}`);
        if (activeContent) {
            activeContent.style.display = 'block';
        }

        // Activate button
        const activeButton = Array.from(tabButtons).find(btn => btn.textContent.includes(tabId) || btn.onclick?.toString().includes(`'${tabId}'`));
        if (activeButton) {
            activeButton.classList.add('active');
            activeButton.style.background = 'rgba(0, 255, 255, 0.2)';
            activeButton.style.borderColor = '#00ffff';
            activeButton.style.color = '#00ffff';
        }
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
        } else if (buttonsConfig.type === 'static' && buttonsConfig.items) {
            // Static buttons with items array
            buttonsConfig.items.forEach((btn, index) => {
                html += this.createButton(btn, index, stateId);
            });
        } else if (buttonsConfig.type === 'dynamic' && buttonsConfig.generator) {
            // Dynamic buttons - call generator function
            const generatorFunc = this.generatorRegistry.get(buttonsConfig.generator);
            if (generatorFunc) {
                const game = window.game;
                const buttons = generatorFunc.call(game);
                if (Array.isArray(buttons)) {
                    buttons.forEach((btn, index) => {
                        html += this.createButton(btn, index, stateId);
                    });
                }
            }
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
        } else if (buttonsConfig.items) {
            // Fallback - just use items if available
            buttonsConfig.items.forEach((btn, index) => {
                html += this.createButton(btn, index, stateId);
            });
        }

        html += '</div>';
        return html;
    }

    /**
     * Create a single button
     */
    createButton(button, index, stateId) {
        const classes = ['dialog-button'];
        if (button.primary || button.style === 'primary') classes.push('primary');
        if (button.danger || button.style === 'danger') classes.push('danger');

        // Convert action object to string format
        let actionString = button.action;
        if (typeof button.action === 'object' && button.action.type) {
            if (button.action.type === 'execute' && button.action.handler) {
                actionString = `execute:${button.action.handler}`;
            } else if (button.action.type === 'navigate' && button.action.state) {
                actionString = `navigate:${button.action.state}`;
            } else if (button.action.type === 'back') {
                actionString = 'back';
            } else if (button.action.type === 'close') {
                actionString = 'close';
            } else {
                actionString = button.action.type;
            }
        }

        return `
            <button class="${classes.join(' ')}"
                    data-action="${actionString}"
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
    // Public method for executing actions from HTML onclick handlers
    executeAction(actionString, context) {
        return this.handleAction(actionString, context || {});
    }

    handleAction(actionString, context) {
        if (this.logger) this.logger.debug('🎮 Handling action:', actionString);

        // Parse action string (e.g., "navigate:view-squad" or "execute:hire:42")
        const parts = actionString.split(':');
        const actionType = parts[0];
        const actionParams = parts.slice(1);

        // Add any data attributes to context
        if (context.element) {
            const dataAttrs = {};
            for (const attr of context.element.attributes) {
                if (attr.name.startsWith('data-') && attr.name !== 'data-action') {
                    const key = attr.name.substring(5); // Remove 'data-' prefix
                    dataAttrs[key] = attr.value;
                }
            }
            context = { ...context, ...dataAttrs };
        }

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
            if (this.logger) this.logger.error('Unknown action type:', actionType);
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
            while (this.stateStack.length > targetLevel) {
                const poppedState = this.stateStack.pop();
                if (poppedState) {
                    this.closeStateDialog(poppedState.id);
                }
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

            // Navigate to parent and refresh it
            if (this.stateStack.length > 0) {
                const parent = this.stateStack[this.stateStack.length - 1];
                this.currentState = parent.id;

                // Refresh the parent dialog to show updated data
                this.navigateTo(parent.id, null, true);
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
                this.currentState = prevState.id;  // Use the ID string, not the state object
                // Re-render the previous state
                this.navigateTo(prevState.id, prevState.params);
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
        this.activeTab = null;  // Reset active tab for next dialog
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

            // Restore focus to canvas if in game screen
            if (game.currentScreen === 'game' && game.canvas) {
                game.canvas.focus();
                // Reset any agent movement that might have been interrupted
                if (game.agents) {
                    game.agents.forEach(agent => {
                        if (agent.moveTarget) {
                            // Keep their current move target, don't reset to spawn
                            // This preserves their intended movement
                        }
                    });
                }
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
        let result = template;

        // First handle if/else blocks (must be done before variable replacement)
        // Handle {{#if condition}}...{{else}}...{{/if}}
        result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, condition, content) => {
            // Check if there's an else clause
            const elseMatch = content.match(/^([\s\S]*?)\{\{else\}\}([\s\S]*?)$/);
            if (elseMatch) {
                // Has else clause
                return data[condition] ? elseMatch[1] : elseMatch[2];
            } else {
                // No else clause
                return data[condition] ? content : '';
            }
        });

        // Then replace simple variables
        result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? data[key] : '';
        });

        return result;
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
            audio.play().catch(e => { if (this.logger) this.logger.error('Sound play failed:', e); });
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
            // If navigating to hire-confirm, pass agent data
            if (target === 'hire-confirm' && context.agent) {
                // Find the agent and store it for the confirmation dialog
                const game = window.game;
                const agentId = parseInt(context.agent);
                const agent = game.availableAgents?.find(a => a.id === agentId);
                if (this.logger) this.logger.debug('Navigate to hire-confirm: agentId=', agentId, 'found agent=', agent);
                if (agent) {
                    // Store only the original agent, not the enhanced version
                    this.stateData.selectedAgent = {
                        id: agent.id,
                        name: agent.name,
                        cost: agent.cost,
                        health: agent.health,
                        damage: agent.damage,
                        speed: agent.speed,
                        skills: agent.skills,
                        hired: agent.hired
                    };
                    if (this.logger) this.logger.debug('Stored selectedAgent:', this.stateData.selectedAgent);
                }
            }
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

            // First check if there's a registered action handler (but not 'execute' to avoid recursion)
            const registeredHandler = this.actionRegistry.get(actualFuncName);
            if (registeredHandler && actualFuncName !== 'execute') {
                // Call the registered handler with proper context
                registeredHandler.call(this, params, context);
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
        this.validatorRegistry.set('hasResearchPoints', function() { return this.researchPoints > 0; });
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
        if (this.logger) this.logger.debug('🔄 Hot reloading dialog configuration');

        // Validate new config
        if (!this.validateConfig(newConfig)) {
            if (this.logger) this.logger.error('Invalid configuration, reload aborted');
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

        if (this.logger) this.logger.info('✅ Configuration reloaded successfully');
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
                e.stopImmediatePropagation(); // Prevent game handler from seeing this event
                this.handleAction(stateKeyboard, { key: e.key });
                return;
            }

            // Check global keyboard config
            const globalKeyboard = this.config.keyboard?.global?.[e.key];
            if (globalKeyboard) {
                e.preventDefault();
                e.stopImmediatePropagation(); // Prevent game handler from seeing this event
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