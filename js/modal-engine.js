/**
 * Unified Modal Engine for CyberOps Game
 * Handles all dialog/modal types with consistent styling and behavior
 */

class ModalEngine {
    constructor() {
        this.activeModals = [];
        this.modalStack = [];
        this.typingEffects = new Map();
        this.defaultConfig = {
            type: 'standard',
            size: 'medium',
            position: 'center',
            animation: 'fade',
            backdrop: true,
            closeOnBackdrop: false,
            closeButton: true,
            theme: 'cyberpunk'
        };

        this.init();
    }

    init() {
        // Don't mark body as modal-engine-active to allow legacy dialogs to work

        // Create modal container if it doesn't exist
        if (!document.getElementById('modalEngineContainer')) {
            const container = document.createElement('div');
            container.id = 'modalEngineContainer';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 20000;
            `;
            document.body.appendChild(container);
        }

        // Add global styles if not already present
        if (!document.getElementById('modalEngineStyles')) {
            const styles = document.createElement('style');
            styles.id = 'modalEngineStyles';
            styles.innerHTML = this.getGlobalStyles();
            document.head.appendChild(styles);
        }

        // Setup keyboard handling via dispatcher or fallback
        this.setupKeyboardHandling();
    }

    /**
     * Setup keyboard handling via KeyboardDispatcherService
     */
    setupKeyboardHandling() {
        const dispatcher = window.game.gameServices.keyboardDispatcher;
        dispatcher.registerHandler('MODAL', '*', (e) => this.handleKeyboard(e));
    }

    /**
     * Handle keyboard - returns true if consumed
     */
    handleKeyboard(e) {
        if (this.modalStack.length === 0) return false;

        const topModalId = this.modalStack[this.modalStack.length - 1];
        const modal = this.activeModals.find(m => m.id === topModalId);
        if (!modal) return false;

        if (e.key === 'Escape' && modal.config.closeButton) {
            modal.close();
            return true;
        }

        if (modal.config.type === 'npc' && /^[1-9]$/.test(e.key)) {
            const choiceIndex = parseInt(e.key) - 1;
            const choiceBtn = modal.element.querySelector(`[data-choice-index="${choiceIndex}"]`);
            if (choiceBtn) {
                choiceBtn.click();
                return true;
            }
        }

        return false;
    }

    /**
     * Activate MODAL keyboard context
     */
    activateKeyboardContext() {
        window.game.gameServices.keyboardDispatcher.activateContext('MODAL');
    }

    /**
     * Deactivate MODAL keyboard context
     */
    deactivateKeyboardContext() {
        window.game.gameServices.keyboardDispatcher.deactivateContext('MODAL');
    }

    /**
     * Create and show a modal
     * @param {Object} config - Modal configuration
     * @returns {Object} Modal instance
     */
    show(config) {
        const modalConfig = { ...this.defaultConfig, ...config };
        const modalId = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Track if this is the first modal (stack empty before push)
        const wasEmpty = this.modalStack.length === 0;

        const modal = {
            id: modalId,
            config: modalConfig,
            element: null,
            close: () => this.close(modalId),
            update: (updates) => this.update(modalId, updates)
        };

        // Create modal element
        modal.element = this.createModalElement(modal);

        // Calculate z-index for stacking
        // Use higher base (20000) to ensure modals appear above declarative dialogs (9000)
        const stackPosition = this.modalStack.length;
        modal.element.style.zIndex = 20000 + (stackPosition * 10);

        // Add to container
        const container = document.getElementById('modalEngineContainer');
        container.appendChild(modal.element);
        container.style.pointerEvents = 'auto';

        // Add to active modals
        this.activeModals.push(modal);
        this.modalStack.push(modalId);

        // Activate keyboard context if this is the first modal
        if (wasEmpty) {
            this.activateKeyboardContext();
        }

        // Dim previous modals when stacking
        if (this.modalStack.length > 1) {
            this.activeModals.forEach(m => {
                if (m.id !== modalId) {
                    m.element.style.filter = 'brightness(0.5)';
                    m.element.style.pointerEvents = 'none';
                }
            });
        }

        // Apply animation
        this.animateIn(modal);

        // Handle typing effect for NPC dialogs (disabled for now - causes issues)
        // if (modalConfig.type === 'npc' && modalConfig.text) {
        //     this.startTypingEffect(modalId, modalConfig.text);
        // }

        // Auto-focus first button if requested
        if (modalConfig.autoFocus) {
            setTimeout(() => {
                const firstButton = modal.element.querySelector('.modal-action-button');
                if (firstButton) firstButton.focus();
            }, 100);
        }

        return modal;
    }

    /**
     * Create the modal DOM element
     */
    createModalElement(modal) {
        const config = modal.config;
        const wrapper = document.createElement('div');
        wrapper.id = modal.id;
        wrapper.className = `modal-wrapper modal-${config.type} modal-${config.size} modal-${config.position}`;

        // Add backdrop if needed
        if (config.backdrop) {
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop';
            if (config.closeOnBackdrop) {
                backdrop.onclick = () => modal.close();
            }
            wrapper.appendChild(backdrop);
        }

        // Create modal content
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal-content';

        // Build modal structure based on type
        let modalHTML = '';

        switch (config.type) {
            case 'npc':
                modalHTML = this.buildNPCModal(config);
                break;
            case 'equipment':
                modalHTML = this.buildEquipmentModal(config);
                break;
            case 'list':
                modalHTML = this.buildListModal(config);
                break;
            default:
                modalHTML = this.buildStandardModal(config);
        }

        modalDiv.innerHTML = modalHTML;
        wrapper.appendChild(modalDiv);

        // Bind event handlers
        this.bindEventHandlers(modal, wrapper);

        return wrapper;
    }

    /**
     * Build standard modal HTML
     */
    buildStandardModal(config) {
        let html = '<div class="modal-inner">';

        // Header
        if (config.title) {
            html += `
                <div class="modal-header">
                    <div class="modal-title">${config.icon ? config.icon + ' ' : ''}${config.title}</div>
                    ${config.closeButton ? '<div class="modal-close">[X]</div>' : ''}
                </div>
            `;
        }

        // Body
        html += `<div class="modal-body">${config.content || ''}</div>`;

        // Actions
        if (config.buttons && config.buttons.length > 0) {
            html += '<div class="modal-actions">';
            config.buttons.forEach((button, index) => {
                const btnClass = button.primary ? 'modal-action-button primary' : 'modal-action-button';
                html += `
                    <button class="${btnClass}" data-action-index="${index}">
                        ${button.icon ? button.icon + ' ' : ''}${button.text}
                    </button>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Build NPC dialog modal HTML
     */
    buildNPCModal(config) {
        let html = '<div class="modal-npc-inner">';

        // NPC info section
        html += `
            <div class="modal-npc-header">
                <div class="modal-npc-avatar">${config.avatar || '👤'}</div>
                <div class="modal-npc-info">
                    <div class="modal-npc-name">${config.name || 'Unknown'}</div>
                    <div class="modal-npc-text" id="npc-text-${config.modalId || Date.now()}">
                        ${config.text || ''}
                    </div>
                </div>
            </div>
        `;

        // Choices
        if (config.choices && config.choices.length > 0) {
            html += '<div class="modal-npc-choices">';
            config.choices.forEach((choice, index) => {
                html += `
                    <button class="modal-npc-choice" data-choice-index="${index}">
                        ${index + 1}. ${choice.text}
                    </button>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Build equipment modal HTML
     */
    buildEquipmentModal(config) {
        let html = '<div class="modal-equipment-inner">';

        // Header
        html += `
            <div class="modal-header">
                <div class="modal-title">${config.icon || '🎯'} ${config.title || 'Equipment'}</div>
                ${config.closeButton ? '<div class="modal-close">[X]</div>' : ''}
            </div>
        `;

        // Multi-column body
        html += '<div class="modal-equipment-body">';

        if (config.sections) {
            config.sections.forEach(section => {
                html += `
                    <div class="modal-equipment-section" style="flex: ${section.flex || 1};">
                        ${section.title ? `<h3>${section.title}</h3>` : ''}
                        <div class="section-content">${section.content || ''}</div>
                    </div>
                `;
            });
        }

        html += '</div>';

        // Actions
        if (config.buttons && config.buttons.length > 0) {
            html += '<div class="modal-actions">';
            config.buttons.forEach((button, index) => {
                html += `
                    <button class="modal-action-button" data-action-index="${index}">
                        ${button.text}
                    </button>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Build list modal HTML (for saves, missions, etc)
     */
    buildListModal(config) {
        let html = '<div class="modal-list-inner">';

        // Header
        html += `
            <div class="modal-header">
                <div class="modal-title">${config.icon || ''} ${config.title || 'Select'}</div>
                ${config.closeButton ? '<div class="modal-close">[X]</div>' : ''}
            </div>
        `;

        // List body
        html += '<div class="modal-list-body">';

        if (config.items && config.items.length > 0) {
            html += '<div class="modal-list-items">';
            config.items.forEach((item, index) => {
                html += `
                    <div class="modal-list-item" data-item-index="${index}">
                        ${item.icon ? `<span class="item-icon">${item.icon}</span>` : ''}
                        <div class="item-content">
                            <div class="item-title">${item.title}</div>
                            ${item.subtitle ? `<div class="item-subtitle">${item.subtitle}</div>` : ''}
                        </div>
                        ${item.actions ? `
                            <div class="item-actions">
                                ${item.actions.map(action =>
                                    `<button class="item-action" data-item="${index}" data-action="${action.type}">${action.label}</button>`
                                ).join('')}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            html += '</div>';
        } else if (config.emptyMessage) {
            html += `<div class="modal-empty-message">${config.emptyMessage}</div>`;
        }

        html += '</div>';

        // Actions
        if (config.buttons && config.buttons.length > 0) {
            html += '<div class="modal-actions">';
            config.buttons.forEach((button, index) => {
                html += `
                    <button class="modal-action-button" data-action-index="${index}">
                        ${button.text}
                    </button>
                `;
            });
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    /**
     * Bind event handlers to modal elements
     */
    bindEventHandlers(modal, wrapper) {
        const config = modal.config;

        // Close button
        const closeBtn = wrapper.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.close();
        }

        // Action buttons
        const actionButtons = wrapper.querySelectorAll('.modal-action-button');
        actionButtons.forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.actionIndex);
                const button = config.buttons[index];

                // Call onButtonClick if provided (for DialogManager integration)
                if (typeof config.onButtonClick === 'function') {
                    config.onButtonClick(button.action, button);
                } else if (button.action) {
                    if (button.action === 'close') {
                        modal.close();
                    } else if (typeof button.action === 'function') {
                        button.action();
                        if (button.closeAfter !== false) {
                            modal.close();
                        }
                    }
                }
            };
        });

        // NPC choices
        if (config.type === 'npc') {
            const choiceButtons = wrapper.querySelectorAll('.modal-npc-choice');
            choiceButtons.forEach(btn => {
                btn.onclick = () => {
                    // Check if modal is already being closed
                    if (!this.activeModals.find(m => m.id === modal.id)) {
                        return;
                    }

                    const index = parseInt(btn.dataset.choiceIndex);
                    const choice = config.choices[index];
                    if (choice.action) {
                        choice.action();
                    }
                    if (choice.closeAfter !== false) {
                        modal.close();
                    }
                };
            });
        }

        // List item actions
        if (config.type === 'list') {
            const itemActions = wrapper.querySelectorAll('.item-action');
            itemActions.forEach(btn => {
                btn.onclick = () => {
                    const itemIndex = parseInt(btn.dataset.item);
                    const actionType = btn.dataset.action;
                    const item = config.items[itemIndex];
                    const action = item.actions.find(a => a.type === actionType);
                    if (action && action.handler) {
                        action.handler(item);
                    }
                };
            });
        }
    }

    /**
     * Start typing effect for NPC dialog
     */
    startTypingEffect(modalId, text) {
        const modal = this.activeModals.find(m => m.id === modalId);
        if (!modal) return;

        const textElement = modal.element.querySelector('.typing-text');
        const cursorElement = modal.element.querySelector('.cursor');
        if (!textElement || !cursorElement) return;

        let charIndex = 0;
        const typeSpeed = 30;

        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                textElement.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeInterval);
                cursorElement.style.display = 'none';
                this.typingEffects.delete(modalId);
            }
        }, typeSpeed);

        this.typingEffects.set(modalId, typeInterval);
    }

    /**
     * Animate modal in
     */
    animateIn(modal) {
        const element = modal.element;
        element.classList.add('modal-animating');

        requestAnimationFrame(() => {
            element.classList.add('modal-active');
            setTimeout(() => {
                element.classList.remove('modal-animating');
            }, 300);
        });
    }

    /**
     * Close a modal
     */
    close(modalId) {
        const modalIndex = this.activeModals.findIndex(m => m.id === modalId);
        if (modalIndex === -1) return;

        const modal = this.activeModals[modalIndex];

        // Remove from active modals immediately to prevent further interaction
        this.activeModals.splice(modalIndex, 1);
        this.modalStack = this.modalStack.filter(id => id !== modalId);

        // Deactivate keyboard context if this was the last modal
        if (this.modalStack.length === 0) {
            this.deactivateKeyboardContext();
        }

        // Immediately disable interaction to prevent clicks during animation
        modal.element.style.pointerEvents = 'none';

        // Stop typing effect if exists
        if (this.typingEffects.has(modalId)) {
            clearInterval(this.typingEffects.get(modalId));
            this.typingEffects.delete(modalId);
        }

        // Animate out
        modal.element.classList.add('modal-animating');
        modal.element.classList.remove('modal-active');

        setTimeout(() => {
            modal.element.remove();

            // Restore previous modal if exists
            if (this.modalStack.length > 0) {
                const topModalId = this.modalStack[this.modalStack.length - 1];
                const topModal = this.activeModals.find(m => m.id === topModalId);
                if (topModal) {
                    topModal.element.style.filter = 'none';
                    topModal.element.style.pointerEvents = 'auto';
                }
            }

            // Check if we need to disable container
            if (this.activeModals.length === 0) {
                const container = document.getElementById('modalEngineContainer');
                container.style.pointerEvents = 'none';
            }

            // Call close callback if provided
            if (modal.config.onClose) {
                modal.config.onClose();
            }
        }, 300);
    }

    /**
     * Close all modals
     */
    closeAll() {
        const modalsToClose = [...this.activeModals];
        modalsToClose.forEach(modal => modal.close());
    }

    /**
     * Update modal content
     */
    update(modalId, updates) {
        const modal = this.activeModals.find(m => m.id === modalId);
        if (!modal) return;

        // Update title
        if (updates.title !== undefined) {
            const titleElement = modal.element.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = updates.title;
            }
        }

        // Update content
        if (updates.content !== undefined) {
            const bodyElement = modal.element.querySelector('.modal-body');
            if (bodyElement) {
                bodyElement.innerHTML = updates.content;
            }
        }

        // Update NPC text
        if (updates.text !== undefined && modal.config.type === 'npc') {
            const textElement = modal.element.querySelector('.modal-npc-text');
            if (textElement) {
                textElement.innerHTML = updates.text;
                // Typing effect disabled - was causing issues
                // this.startTypingEffect(modalId, updates.text);
            }
        }
    }

    /**
     * Get global styles for modal engine
     */
    getGlobalStyles() {
        return `
            /* Modal wrapper and backdrop */
            .modal-wrapper {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .modal-wrapper.modal-active {
                opacity: 1;
            }

            .modal-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(2px);
            }

            /* Modal content container */
            .modal-content {
                position: relative;
                background: linear-gradient(135deg, #0a0e27 0%, #1a1a2e 100%);
                border: 2px solid #00ffff;
                border-radius: 10px;
                box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
                transform: scale(0.9);
                transition: transform 0.3s ease;
                display: flex;
                flex-direction: column;
                max-height: 85vh;
            }

            .modal-active .modal-content {
                transform: scale(1);
            }

            /* Size variations */
            .modal-small .modal-content {
                min-width: 300px;
                max-width: 400px;
            }

            .modal-medium .modal-content {
                min-width: 500px;
                max-width: 700px;
            }

            .modal-large .modal-content {
                min-width: 800px;
                max-width: 1200px;
                width: 90%;
            }

            .modal-fullscreen .modal-content {
                width: 95%;
                height: 95vh;
            }

            /* Position variations */
            .modal-bottom .modal-content {
                position: fixed;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%) scale(0.9);
            }

            .modal-bottom.modal-active .modal-content {
                transform: translateX(-50%) scale(1);
            }

            /* Modal inner structure */
            .modal-inner {
                padding: 0;
            }

            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #00ffff;
                background: rgba(0, 255, 255, 0.05);
            }

            .modal-title {
                font-size: 1.2em;
                font-weight: bold;
                color: #00ffff;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .modal-close {
                cursor: pointer;
                color: #ff0000;
                font-weight: bold;
                padding: 6px 12px;
                background: transparent;
                border: 1px solid #ff0000;
                border-radius: 4px;
                transition: all 0.3s;
            }

            .modal-close:hover {
                background: rgba(255, 0, 0, 0.2);
                color: #ff4466;
                border-color: #ff4466;
            }

            .modal-body {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
                color: #ffffff;
                line-height: 1.6;
                min-height: 100px;
            }

            .modal-actions {
                display: flex;
                justify-content: center;
                gap: 15px;
                padding: 20px;
                border-top: 1px solid #00ffff;
                background: rgba(0, 255, 255, 0.03);
            }

            .modal-action-button {
                min-width: 140px;
                padding: 12px 24px;
                background: transparent;
                border: 1px solid #00ffff;
                color: #00ffff;
                font-weight: bold;
                cursor: pointer;
                text-transform: uppercase;
                transition: all 0.3s;
                letter-spacing: 1px;
            }

            .modal-action-button:hover {
                background: #00ffff;
                color: #0a0e27;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
            }

            .modal-action-button.primary {
                background: #00ffff;
                color: #0a0e27;
            }

            .modal-action-button.primary:hover {
                background: #00ff41;
                border-color: #00ff41;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.5);
            }

            /* NPC Dialog specific styles */
            .modal-npc-inner {
                padding: 30px;
            }

            .modal-npc-header {
                display: flex;
                gap: 25px;
                margin-bottom: 20px;
            }

            .modal-npc-avatar {
                font-size: 64px;
                line-height: 1;
            }

            .modal-npc-info {
                flex: 1;
            }

            .modal-npc-name {
                color: #00ffff;
                font-weight: bold;
                margin-bottom: 10px;
                font-size: 18px;
                text-transform: uppercase;
            }

            .modal-npc-text {
                color: #ffffff;
                min-height: 60px;
                font-size: 16px;
                line-height: 1.5;
                font-family: 'Courier New', monospace;
            }

            .typing-text {
                display: inline;
                white-space: pre-wrap;
                word-wrap: break-word;
            }

            .cursor {
                display: inline;
                animation: blink 1s infinite;
            }

            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }

            .modal-npc-choices {
                margin-top: 20px;
            }

            .modal-npc-choice {
                display: block;
                width: 100%;
                padding: 12px 15px;
                margin: 8px 0;
                background: rgba(0, 255, 255, 0.1);
                border: 1px solid #00ffff;
                color: #ffffff;
                cursor: pointer;
                text-align: left;
                transition: all 0.2s;
                font-size: 14px;
                font-family: 'Courier New', monospace;
                border-radius: 5px;
            }

            .modal-npc-choice:hover {
                background: rgba(0, 255, 255, 0.3);
                transform: translateX(5px);
            }

            /* Equipment modal specific styles */
            .modal-equipment-inner {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            .modal-equipment-body {
                display: flex;
                gap: 20px;
                padding: 20px;
                flex: 1;
                overflow-y: auto;
            }

            .modal-equipment-section {
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 5px;
                padding: 15px;
                background: rgba(0, 255, 255, 0.02);
            }

            .modal-equipment-section h3 {
                color: #00ffff;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-size: 14px;
            }

            /* List modal specific styles */
            .modal-list-body {
                padding: 20px;
                max-height: 400px;
                overflow-y: auto;
            }

            .modal-list-items {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .modal-list-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: rgba(0, 255, 255, 0.05);
                border: 1px solid rgba(0, 255, 255, 0.3);
                border-radius: 5px;
                transition: all 0.2s;
            }

            .modal-list-item:hover {
                background: rgba(0, 255, 255, 0.1);
                border-color: #00ffff;
            }

            .item-icon {
                font-size: 24px;
            }

            .item-content {
                flex: 1;
            }

            .item-title {
                color: #ffffff;
                font-weight: bold;
                margin-bottom: 5px;
            }

            .item-subtitle {
                color: #888;
                font-size: 12px;
            }

            .item-actions {
                display: flex;
                gap: 5px;
            }

            .item-action {
                padding: 5px 10px;
                background: transparent;
                border: 1px solid #00ffff;
                color: #00ffff;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }

            .item-action:hover {
                background: #00ffff;
                color: #0a0e27;
            }

            .modal-empty-message {
                text-align: center;
                color: #888;
                padding: 40px;
                font-style: italic;
            }

            /* Scrollbar styling */
            .modal-body::-webkit-scrollbar,
            .modal-list-body::-webkit-scrollbar,
            .modal-equipment-body::-webkit-scrollbar {
                width: 8px;
            }

            .modal-body::-webkit-scrollbar-track,
            .modal-list-body::-webkit-scrollbar-track,
            .modal-equipment-body::-webkit-scrollbar-track {
                background: rgba(0, 255, 255, 0.1);
            }

            .modal-body::-webkit-scrollbar-thumb,
            .modal-list-body::-webkit-scrollbar-thumb,
            .modal-equipment-body::-webkit-scrollbar-thumb {
                background: #00ffff;
                border-radius: 4px;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .modal-content {
                    width: 95% !important;
                    max-width: none !important;
                    margin: 10px;
                }

                .modal-equipment-body {
                    flex-direction: column;
                }

                .modal-action-button {
                    min-width: 100px;
                    padding: 10px 15px;
                    font-size: 12px;
                }
            }
        `;
    }
}

// Initialize modal engine and attach to window
window.modalEngine = new ModalEngine();

// Compatibility layer for existing game functions
CyberOpsGame.prototype.showModalDialog = function(config) {

    // Initialize logger if needed
    if (!this.logger && window.Logger) {
        this.logger = new window.Logger('ModalEngine');
    }
    return window.modalEngine.show(config);
};

// Helper function for quick standard dialogs
CyberOpsGame.prototype.showQuickDialog = function(title, content, buttons) {
    return window.modalEngine.show({
        type: 'standard',
        title: title,
        content: content,
        buttons: buttons || [{ text: 'OK', action: 'close' }]
    });
};

// showNPCDialog removed - now using declarative dialog system
// All NPC interactions now use: this.dialogEngine.navigateTo('npc-interaction');

// Helper for equipment dialogs
CyberOpsGame.prototype.showEquipmentModal = function(sections, buttons) {
    return window.modalEngine.show({
        type: 'equipment',
        size: 'large',
        title: 'Equipment Management',
        icon: '🎯',
        sections: sections,
        buttons: buttons
    });
};

// Helper for list dialogs
CyberOpsGame.prototype.showListModal = function(title, items, buttons) {
    return window.modalEngine.show({
        type: 'list',
        title: title,
        items: items,
        buttons: buttons,
        emptyMessage: 'No items available'
    });
};