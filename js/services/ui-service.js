/**
 * UIService - Centralized UI management for dialogs, notifications, and overlays
 * Works with existing declarative dialog and modal systems
 * NOTE: HUD rendering is handled separately by HUDService
 */
class UIService {
    constructor() {
        // UI components registry
        this.dialogs = new Map();
        this.notifications = [];
        this.overlays = new Map();
        this.tooltips = new Map();
        this.contextMenus = new Map();

        // External system references
        this.modalEngine = null;
        this.declarativeEngine = null;
        this.dialogManager = null;

        // Configuration
        this.config = {
            maxNotifications: 5,
            notificationDuration: 3000,
            notificationFadeTime: 500,
            defaultDialogTheme: 'cyberpunk',
            defaultPosition: 'center',
            enableAnimations: true,
            enableSounds: true
        };

        // UI state
        this.state = {
            activeDialog: null,
            dialogStack: [],
            notificationQueue: [],
            isBlocked: false,
            currentOverlay: null
        };

        // Notification types
        this.NotificationType = {
            INFO: 'info',
            SUCCESS: 'success',
            WARNING: 'warning',
            ERROR: 'error',
            MISSION: 'mission',
            COMBAT: 'combat',
            SYSTEM: 'system'
        };

        // Dialog types
        this.DialogType = {
            MODAL: 'modal',
            POPUP: 'popup',
            CONFIRM: 'confirm',
            PROMPT: 'prompt',
            MENU: 'menu',
            INVENTORY: 'inventory',
            CHARACTER: 'character'
        };

        // Event listeners
        this.listeners = new Map();

        console.log('🖼️ UIService initialized');
    }

    /**
     * Initialize UI service with external systems
     */
    initialize(systems = {}) {
        // Connect to existing modal/dialog systems if available
        if (systems.modalEngine || window.modalEngine) {
            this.modalEngine = systems.modalEngine || window.modalEngine;
            console.log('✅ Connected to ModalEngine');
        }

        if (systems.declarativeEngine || window.dialogEngine) {
            this.declarativeEngine = systems.declarativeEngine || window.dialogEngine;
            console.log('✅ Connected to DeclarativeDialogEngine');
        }

        if (systems.dialogManager || window.dialogManager) {
            this.dialogManager = systems.dialogManager || window.dialogManager;
            console.log('✅ Connected to DialogManager');
        }

        // Create notification container
        this.createNotificationContainer();

        // Setup keyboard shortcuts
        this.setupKeyboardHandlers();

        return this;
    }

    /**
     * Create notification container
     */
    createNotificationContainer() {
        if (!document.getElementById('ui-notification-container')) {
            const container = document.createElement('div');
            container.id = 'ui-notification-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                width: 350px;
                pointer-events: none;
                z-index: 15000;
            `;
            document.body.appendChild(container);
        }
    }

    /**
     * Show a notification
     */
    showNotification(message, type = this.NotificationType.INFO, options = {}) {
        const notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            message,
            type,
            timestamp: Date.now(),
            duration: options.duration || this.config.notificationDuration,
            persistent: options.persistent || false,
            icon: options.icon || this.getNotificationIcon(type),
            actions: options.actions || [],
            data: options.data || {}
        };

        // Add to queue or show immediately
        if (this.notifications.length >= this.config.maxNotifications) {
            this.notificationQueue.push(notification);
        } else {
            this.displayNotification(notification);
        }

        return notification.id;
    }

    /**
     * Display a notification
     */
    displayNotification(notification) {
        const container = document.getElementById('ui-notification-container');
        if (!container) return;

        // Create notification element
        const element = document.createElement('div');
        element.id = notification.id;
        element.className = `ui-notification ui-notification-${notification.type}`;
        element.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid ${this.getNotificationColor(notification.type)};
            border-radius: 5px;
            padding: 15px;
            margin-bottom: 10px;
            pointer-events: auto;
            opacity: 0;
            transform: translateX(50px);
            transition: all 0.3s ease;
            box-shadow: 0 0 20px ${this.getNotificationColor(notification.type)}40;
        `;

        // Build notification content
        element.innerHTML = `
            <div style="display: flex; align-items: center;">
                <div style="font-size: 24px; margin-right: 10px; color: ${this.getNotificationColor(notification.type)}">
                    ${notification.icon}
                </div>
                <div style="flex: 1;">
                    <div style="color: #fff; font-family: monospace; font-size: 14px;">
                        ${notification.message}
                    </div>
                    ${notification.actions.length > 0 ? this.renderNotificationActions(notification.actions) : ''}
                </div>
                ${!notification.persistent ? `
                    <button onclick="window.gameServices.uiService.dismissNotification('${notification.id}')"
                            style="background: none; border: none; color: #666; cursor: pointer; font-size: 20px; padding: 0 5px;">
                        ×
                    </button>
                ` : ''}
            </div>
        `;

        // Add to container
        container.appendChild(element);
        this.notifications.push(notification);

        // Trigger animation
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translateX(0)';
        }, 10);

        // Auto-dismiss if not persistent
        if (!notification.persistent) {
            setTimeout(() => {
                this.dismissNotification(notification.id);
            }, notification.duration);
        }

        // Emit event
        this.emit('notificationShown', notification);
    }

    /**
     * Render notification actions
     */
    renderNotificationActions(actions) {
        return `
            <div style="margin-top: 10px; display: flex; gap: 10px;">
                ${actions.map(action => `
                    <button onclick="${action.handler}"
                            style="background: #00ffcc20; border: 1px solid #00ffcc;
                                   color: #00ffcc; padding: 5px 10px; cursor: pointer;
                                   font-family: monospace; font-size: 12px;">
                        ${action.label}
                    </button>
                `).join('')}
            </div>
        `;
    }

    /**
     * Dismiss a notification
     */
    dismissNotification(notificationId) {
        const element = document.getElementById(notificationId);
        if (!element) return;

        // Fade out animation
        element.style.opacity = '0';
        element.style.transform = 'translateX(50px)';

        setTimeout(() => {
            element.remove();

            // Remove from active notifications
            const index = this.notifications.findIndex(n => n.id === notificationId);
            if (index !== -1) {
                this.notifications.splice(index, 1);
            }

            // Process queue if any
            if (this.notificationQueue.length > 0) {
                const next = this.notificationQueue.shift();
                this.displayNotification(next);
            }
        }, 300);
    }

    /**
     * Clear all notifications
     */
    clearNotifications() {
        this.notifications.forEach(n => this.dismissNotification(n.id));
        this.notificationQueue = [];
    }

    /**
     * Show a dialog
     */
    showDialog(config) {
        // Use modal engine if available
        if (this.modalEngine) {
            return this.modalEngine.show(config);
        }

        // Otherwise create our own dialog
        const dialog = {
            id: `dialog-${Date.now()}`,
            type: config.type || this.DialogType.MODAL,
            title: config.title || 'Dialog',
            content: config.content || '',
            buttons: config.buttons || [{ text: 'OK', action: 'close' }],
            onClose: config.onClose,
            data: config.data || {}
        };

        // Create dialog element
        const element = this.createDialogElement(dialog);
        document.body.appendChild(element);

        // Track dialog
        this.dialogs.set(dialog.id, dialog);
        this.state.activeDialog = dialog.id;
        this.state.dialogStack.push(dialog.id);

        // Emit event
        this.emit('dialogOpened', dialog);

        return dialog;
    }

    /**
     * Create dialog element
     */
    createDialogElement(dialog) {
        const element = document.createElement('div');
        element.id = dialog.id;
        element.className = 'ui-dialog';
        element.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ffcc;
            border-radius: 5px;
            padding: 20px;
            min-width: 300px;
            max-width: 600px;
            z-index: 10000;
            box-shadow: 0 0 30px rgba(0, 255, 204, 0.5);
        `;

        element.innerHTML = `
            <div style="color: #00ffcc; font-size: 18px; margin-bottom: 15px; font-family: monospace;">
                ${dialog.title}
            </div>
            <div style="color: #fff; font-family: monospace; margin-bottom: 20px;">
                ${dialog.content}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                ${dialog.buttons.map(btn => `
                    <button onclick="window.gameServices.uiService.handleDialogAction('${dialog.id}', '${btn.action}')"
                            style="background: #00ffcc20; border: 1px solid #00ffcc;
                                   color: #00ffcc; padding: 8px 16px; cursor: pointer;
                                   font-family: monospace;">
                        ${btn.text}
                    </button>
                `).join('')}
            </div>
        `;

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'ui-dialog-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9999;
        `;
        backdrop.onclick = () => {
            if (dialog.closeOnBackdrop !== false) {
                this.closeDialog(dialog.id);
            }
        };
        element.appendChild(backdrop);

        return element;
    }

    /**
     * Handle dialog action
     */
    handleDialogAction(dialogId, action) {
        const dialog = this.dialogs.get(dialogId);
        if (!dialog) return;

        if (action === 'close') {
            this.closeDialog(dialogId);
        } else {
            // Emit custom action event
            this.emit('dialogAction', { dialog, action });
        }
    }

    /**
     * Close a dialog
     */
    closeDialog(dialogId) {
        const dialog = this.dialogs.get(dialogId);
        if (!dialog) return;

        // Remove element
        const element = document.getElementById(dialogId);
        if (element) {
            element.remove();
        }

        // Clean up state
        this.dialogs.delete(dialogId);
        this.state.dialogStack = this.state.dialogStack.filter(id => id !== dialogId);

        if (this.state.activeDialog === dialogId) {
            this.state.activeDialog = this.state.dialogStack[this.state.dialogStack.length - 1] || null;
        }

        // Call onClose callback
        if (dialog.onClose) {
            dialog.onClose(dialog);
        }

        // Emit event
        this.emit('dialogClosed', dialog);
    }

    /**
     * Show confirmation dialog
     */
    confirm(message, onConfirm, onCancel) {
        return this.showDialog({
            type: this.DialogType.CONFIRM,
            title: 'Confirm',
            content: message,
            buttons: [
                {
                    text: 'Cancel',
                    action: 'close'
                },
                {
                    text: 'Confirm',
                    action: 'confirm'
                }
            ],
            onClose: (dialog) => {
                // Handle based on which button was clicked
                if (dialog.data.confirmed && onConfirm) {
                    onConfirm();
                } else if (!dialog.data.confirmed && onCancel) {
                    onCancel();
                }
            }
        });
    }

    /**
     * Show prompt dialog
     */
    prompt(message, defaultValue = '', onSubmit) {
        const promptId = `prompt-${Date.now()}`;

        return this.showDialog({
            type: this.DialogType.PROMPT,
            title: 'Input Required',
            content: `
                <div>${message}</div>
                <input type="text" id="${promptId}" value="${defaultValue}"
                       style="width: 100%; padding: 5px; margin-top: 10px;
                              background: #001; border: 1px solid #0ff;
                              color: #0ff; font-family: monospace;">
            `,
            buttons: [
                {
                    text: 'Cancel',
                    action: 'close'
                },
                {
                    text: 'Submit',
                    action: 'submit'
                }
            ],
            onClose: (dialog) => {
                if (dialog.data.submitted && onSubmit) {
                    const input = document.getElementById(promptId);
                    if (input) {
                        onSubmit(input.value);
                    }
                }
            }
        });
    }

    /**
     * Show tooltip
     */
    showTooltip(element, content, options = {}) {
        const tooltipId = `tooltip-${Date.now()}`;

        const tooltip = document.createElement('div');
        tooltip.id = tooltipId;
        tooltip.className = 'ui-tooltip';
        tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #00ffcc;
            color: #fff;
            padding: 8px 12px;
            font-family: monospace;
            font-size: 12px;
            border-radius: 3px;
            pointer-events: none;
            z-index: 20000;
            max-width: 300px;
        `;
        tooltip.innerHTML = content;

        document.body.appendChild(tooltip);

        // Position tooltip
        const rect = element.getBoundingClientRect();
        const position = options.position || 'top';

        switch (position) {
            case 'top':
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.top - tooltip.offsetHeight - 5}px`;
                break;
            case 'bottom':
                tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                tooltip.style.top = `${rect.bottom + 5}px`;
                break;
            case 'left':
                tooltip.style.left = `${rect.left - tooltip.offsetWidth - 5}px`;
                tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`;
                break;
            case 'right':
                tooltip.style.left = `${rect.right + 5}px`;
                tooltip.style.top = `${rect.top + rect.height / 2 - tooltip.offsetHeight / 2}px`;
                break;
        }

        this.tooltips.set(element, tooltipId);

        return tooltipId;
    }

    /**
     * Hide tooltip
     */
    hideTooltip(element) {
        const tooltipId = this.tooltips.get(element);
        if (tooltipId) {
            const tooltip = document.getElementById(tooltipId);
            if (tooltip) {
                tooltip.remove();
            }
            this.tooltips.delete(element);
        }
    }

    /**
     * Show context menu
     */
    showContextMenu(x, y, items, options = {}) {
        const menuId = `context-menu-${Date.now()}`;

        const menu = document.createElement('div');
        menu.id = menuId;
        menu.className = 'ui-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid #00ffcc;
            border-radius: 3px;
            padding: 5px 0;
            z-index: 20000;
            min-width: 150px;
            box-shadow: 0 2px 10px rgba(0, 255, 204, 0.3);
        `;

        // Build menu items
        items.forEach((item, index) => {
            if (item.separator) {
                const separator = document.createElement('div');
                separator.style.cssText = `
                    height: 1px;
                    background: #00ffcc30;
                    margin: 5px 0;
                `;
                menu.appendChild(separator);
            } else {
                const menuItem = document.createElement('div');
                menuItem.style.cssText = `
                    padding: 8px 15px;
                    color: ${item.disabled ? '#666' : '#fff'};
                    font-family: monospace;
                    font-size: 13px;
                    cursor: ${item.disabled ? 'default' : 'pointer'};
                `;
                menuItem.innerHTML = `
                    ${item.icon ? `<span style="margin-right: 8px;">${item.icon}</span>` : ''}
                    ${item.label}
                    ${item.shortcut ? `<span style="float: right; color: #666; margin-left: 20px;">${item.shortcut}</span>` : ''}
                `;

                if (!item.disabled) {
                    menuItem.onmouseover = () => {
                        menuItem.style.background = '#00ffcc20';
                    };
                    menuItem.onmouseout = () => {
                        menuItem.style.background = 'transparent';
                    };
                    menuItem.onclick = () => {
                        if (item.action) {
                            item.action();
                        }
                        this.hideContextMenu(menuId);
                    };
                }

                menu.appendChild(menuItem);
            }
        });

        document.body.appendChild(menu);
        this.contextMenus.set(menuId, menu);

        // Close on click outside
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                this.hideContextMenu(menuId);
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeHandler);
        }, 0);

        return menuId;
    }

    /**
     * Hide context menu
     */
    hideContextMenu(menuId) {
        const menu = this.contextMenus.get(menuId);
        if (menu) {
            menu.remove();
            this.contextMenus.delete(menuId);
        }
    }

    /**
     * Show overlay
     */
    showOverlay(content, options = {}) {
        const overlayId = `overlay-${Date.now()}`;

        const overlay = document.createElement('div');
        overlay.id = overlayId;
        overlay.className = 'ui-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${options.background || 'rgba(0, 0, 0, 0.8)'};
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 15000;
        `;

        const contentDiv = document.createElement('div');
        contentDiv.innerHTML = content;
        overlay.appendChild(contentDiv);

        if (options.clickToClose) {
            overlay.onclick = () => this.hideOverlay(overlayId);
        }

        document.body.appendChild(overlay);
        this.overlays.set(overlayId, overlay);
        this.state.currentOverlay = overlayId;

        return overlayId;
    }

    /**
     * Hide overlay
     */
    hideOverlay(overlayId) {
        const overlay = this.overlays.get(overlayId);
        if (overlay) {
            overlay.remove();
            this.overlays.delete(overlayId);

            if (this.state.currentOverlay === overlayId) {
                this.state.currentOverlay = null;
            }
        }
    }

    /**
     * Setup keyboard handlers
     */
    setupKeyboardHandlers() {
        document.addEventListener('keydown', (e) => {
            // ESC to close dialogs
            if (e.key === 'Escape') {
                if (this.state.activeDialog) {
                    this.closeDialog(this.state.activeDialog);
                }
                if (this.state.currentOverlay) {
                    this.hideOverlay(this.state.currentOverlay);
                }
            }
        });
    }

    /**
     * Get notification color by type
     */
    getNotificationColor(type) {
        const colors = {
            info: '#00ffcc',
            success: '#00ff00',
            warning: '#ffcc00',
            error: '#ff0000',
            mission: '#ff00ff',
            combat: '#ff6600',
            system: '#0099ff'
        };
        return colors[type] || '#ffffff';
    }

    /**
     * Get notification icon by type
     */
    getNotificationIcon(type) {
        const icons = {
            info: 'ℹ',
            success: '✓',
            warning: '⚠',
            error: '✕',
            mission: '🎯',
            combat: '⚔',
            system: '⚙'
        };
        return icons[type] || '•';
    }

    /**
     * Block UI (prevent interactions)
     */
    blockUI(message = 'Processing...') {
        this.state.isBlocked = true;
        this.showOverlay(`
            <div style="text-align: center; color: #00ffcc; font-family: monospace;">
                <div style="font-size: 24px; margin-bottom: 20px;">⟳</div>
                <div>${message}</div>
            </div>
        `, { clickToClose: false });
    }

    /**
     * Unblock UI
     */
    unblockUI() {
        this.state.isBlocked = false;
        if (this.state.currentOverlay) {
            this.hideOverlay(this.state.currentOverlay);
        }
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     * Get UI state
     */
    getState() {
        return {
            ...this.state,
            dialogCount: this.dialogs.size,
            notificationCount: this.notifications.length,
            hasActiveUI: this.state.activeDialog !== null || this.state.currentOverlay !== null
        };
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            activeDialogs: this.dialogs.size,
            activeNotifications: this.notifications.length,
            queuedNotifications: this.notificationQueue.length,
            activeTooltips: this.tooltips.size,
            activeContextMenus: this.contextMenus.size,
            activeOverlays: this.overlays.size
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.UIService = UIService;
}