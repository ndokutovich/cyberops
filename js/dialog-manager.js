// Dialog Manager - 4-Level Hierarchy System
class DialogManager {
    constructor() {
        this.stack = [];
        this.maxDepth = 4;
        this.levelNames = ['Base', 'Category', 'Subcategory', 'Action', 'Notification'];
        this.configs = {};
        this.breadcrumbElement = null;

        // Initialize dialog configurations
        this.initializeConfigs();

        // Create breadcrumb UI if not exists
        this.initializeBreadcrumb();
    }

    initializeConfigs() {
        // Hub Dialog Configurations
        this.configs['agent-management'] = {
            id: 'agent-management',
            level: 1,
            title: 'Agent Management',
            parent: 'hub',
            children: ['view-squad', 'hire-agents', 'training-center'],
            buttons: {
                back: { text: 'Back to Hub', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['view-squad'] = {
            id: 'view-squad',
            level: 2,
            title: 'View Squad',
            parent: 'agent-management',
            children: ['agent-details', 'manage-equipment', 'dismiss-agent'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['hire-agents'] = {
            id: 'hire-agents',
            level: 2,
            title: 'Hire Agents',
            parent: 'agent-management',
            children: ['hire-confirm', 'view-details'],
            maxChildren: 1,
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['hire-confirm'] = {
            id: 'hire-confirm',
            level: 3,
            title: 'Confirm Hire',
            parent: 'hire-agents',
            children: ['hire-result'],
            buttons: {
                confirm: { text: 'Hire', action: 'execute-hire' },
                cancel: { text: 'Cancel', action: 'back' }
            },
            onSuccess: {
                showNotification: true,
                autoCloseDelay: 2000,
                returnToLevel: 2
            }
        };

        this.configs['training-center'] = {
            id: 'training-center',
            level: 2,
            title: 'Training Center',
            parent: 'agent-management',
            children: ['train-skill', 'view-progress'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        // Equipment & Arsenal Configurations
        this.configs['equipment-arsenal'] = {
            id: 'equipment-arsenal',
            level: 1,
            title: 'Equipment & Arsenal',
            parent: 'hub',
            children: ['agent-loadouts', 'shop', 'sell-items'],
            buttons: {
                back: { text: 'Back to Hub', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['agent-loadouts'] = {
            id: 'agent-loadouts',
            level: 2,
            title: 'Agent Loadouts',
            parent: 'equipment-arsenal',
            children: ['equip-weapon', 'equip-armor', 'auto-optimize'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['shop'] = {
            id: 'shop',
            level: 2,
            title: 'Shop',
            parent: 'equipment-arsenal',
            children: ['buy-item', 'item-details'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['buy-item'] = {
            id: 'buy-item',
            level: 3,
            title: 'Buy Item',
            parent: 'shop',
            onSuccess: {
                showNotification: true,
                autoCloseDelay: 2000,
                returnToLevel: 2
            }
        };

        // Research Lab Configurations
        this.configs['research-lab'] = {
            id: 'research-lab',
            level: 1,
            title: 'Research Lab',
            parent: 'hub',
            children: ['available-research', 'tech-tree-view', 'research-progress'],
            buttons: {
                back: { text: 'Back to Hub', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['available-research'] = {
            id: 'available-research',
            level: 2,
            title: 'Available Research',
            parent: 'research-lab',
            children: ['start-research'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['start-research'] = {
            id: 'start-research',
            level: 3,
            title: 'Start Research',
            parent: 'available-research',
            onSuccess: {
                showNotification: true,
                autoCloseDelay: 2000,
                returnToLevel: 2
            }
        };

        // Intel & Missions Configurations
        this.configs['intel-missions'] = {
            id: 'intel-missions',
            level: 1,
            title: 'Intel & Missions',
            parent: 'hub',
            children: ['intel-reports', 'mission-select', 'campaign-progress'],
            buttons: {
                back: { text: 'Back to Hub', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['mission-select'] = {
            id: 'mission-select',
            level: 2,
            title: 'Mission Select',
            parent: 'intel-missions',
            children: ['start-mission'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['start-mission'] = {
            id: 'start-mission',
            level: 3,
            title: 'Start Mission',
            parent: 'mission-select',
            buttons: {
                confirm: { text: 'Deploy', action: 'execute-mission' },
                cancel: { text: 'Cancel', action: 'back' }
            }
        };

        // Character System (RPG) Configurations
        this.configs['character-system'] = {
            id: 'character-system',
            level: 1,
            title: 'Character System',
            parent: 'hub',
            children: ['character-sheets', 'skill-trees', 'squad-overview'],
            buttons: {
                back: { text: 'Back to Hub', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['character-sheets'] = {
            id: 'character-sheets',
            level: 2,
            title: 'Character Sheets',
            parent: 'character-system',
            children: ['spend-points', 'view-stats'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['skill-trees'] = {
            id: 'skill-trees',
            level: 2,
            title: 'Skill Trees',
            parent: 'character-system',
            children: ['learn-skill'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['learn-skill'] = {
            id: 'learn-skill',
            level: 3,
            title: 'Learn Skill',
            parent: 'skill-trees',
            onSuccess: {
                showNotification: true,
                autoCloseDelay: 2000,
                returnToLevel: 2
            }
        };

        // Game State Dialogs (Pause Menu)
        this.configs['pause-menu'] = {
            id: 'pause-menu',
            level: 1,
            title: 'Pause Menu',
            parent: 'game',
            children: ['resume-game', 'settings', 'save-load', 'exit-options'],
            buttons: {
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['settings'] = {
            id: 'settings',
            level: 2,
            title: 'Settings',
            parent: 'pause-menu',
            children: ['apply-settings'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['save-load'] = {
            id: 'save-load',
            level: 2,
            title: 'Save/Load',
            parent: 'pause-menu',
            children: ['confirm-action'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };

        this.configs['exit-options'] = {
            id: 'exit-options',
            level: 2,
            title: 'Exit Options',
            parent: 'pause-menu',
            children: ['confirm-exit'],
            buttons: {
                back: { text: 'Back', action: 'back' },
                close: { text: 'X', action: 'close-all' }
            }
        };
    }

    initializeBreadcrumb() {
        // Check if breadcrumb element exists
        this.breadcrumbElement = document.getElementById('dialog-breadcrumb');
        if (!this.breadcrumbElement) {
            // Create breadcrumb element
            this.breadcrumbElement = document.createElement('div');
            this.breadcrumbElement.id = 'dialog-breadcrumb';
            this.breadcrumbElement.className = 'dialog-breadcrumb';
            document.body.appendChild(this.breadcrumbElement);
        }
    }

    open(dialogId, options = {}) {
        const config = this.configs[dialogId];
        if (!config) {
            console.error(`Dialog configuration not found: ${dialogId}`);
            return false;
        }

        // Check depth
        if (this.stack.length >= this.maxDepth) {
            console.error(`Cannot open dialog: Max depth (${this.maxDepth}) reached`);
            return false;
        }

        // Check for circular reference
        if (this.stack.find(d => d.id === dialogId)) {
            console.error(`Circular reference detected: ${dialogId}`);
            return false;
        }

        // Check if parent is correct (unless it's a base level dialog)
        if (config.level > 1 && this.stack.length > 0) {
            const expectedParent = this.stack[this.stack.length - 1].id;
            if (config.parent !== expectedParent) {
                console.error(`Invalid parent: Expected ${config.parent}, got ${expectedParent}`);
                return false;
            }
        }

        // Create dialog object
        const dialog = {
            id: dialogId,
            config: config,
            level: config.level,
            timestamp: Date.now(),
            options: options
        };

        // Auto-close Level 4 notifications
        if (this.stack.length === 3) {
            dialog.autoClose = true;
            dialog.autoCloseDelay = config.onSuccess?.autoCloseDelay || 2000;
        }

        // Add to stack
        this.stack.push(dialog);

        // Update breadcrumb
        this.updateBreadcrumb();

        // Render dialog
        this.render(dialog);

        return true;
    }

    back() {
        if (this.stack.length > 0) {
            const current = this.stack.pop();
            this.close(current);

            // Re-render parent if exists
            if (this.stack.length > 0) {
                const parent = this.stack[this.stack.length - 1];
                this.render(parent);
            } else {
                // Return to base screen
                this.returnToBase();
            }

            // Update breadcrumb
            this.updateBreadcrumb();
        }
    }

    closeAll() {
        while (this.stack.length > 0) {
            const dialog = this.stack.pop();
            this.close(dialog);
        }

        // Clear breadcrumb
        this.updateBreadcrumb();

        // Return to base screen
        this.returnToBase();
    }

    close(dialog) {
        // Close modal engine dialog if exists
        if (window.modalEngine && window.modalEngine.activeModals) {
            const modal = window.modalEngine.activeModals.find(m => m.options.dialogId === dialog.id);
            if (modal) {
                modal.close();
            }
        }

        // Additional cleanup if needed
        if (dialog.config.onClose) {
            dialog.config.onClose();
        }
    }

    render(dialog) {
        // Use modal engine if available
        if (window.modalEngine) {
            // Close any existing modal for this dialog
            this.close(dialog);

            // Prepare buttons based on config
            const buttons = [];

            // Add configured buttons
            if (dialog.config.buttons) {
                Object.entries(dialog.config.buttons).forEach(([key, btn]) => {
                    buttons.push({
                        text: btn.text,
                        action: btn.action,
                        primary: btn.primary || false,
                        dialogAction: key
                    });
                });
            }

            // Show modal
            const modal = window.modalEngine.show({
                type: 'standard',
                title: dialog.config.title,
                content: dialog.options.content || '',
                buttons: buttons,
                dialogId: dialog.id,
                closeButton: true,
                backdrop: true,
                closeOnBackdrop: false,
                onButtonClick: (action, btn) => {
                    this.handleAction(action, dialog, btn);
                },
                onClose: () => {
                    // Only update stack if dialog is still in stack
                    if (this.stack.find(d => d.id === dialog.id)) {
                        this.back();
                    }
                }
            });

            // Store modal reference
            dialog.modal = modal;
        } else {
            // Fallback rendering without modal engine
            console.warn('Modal engine not available, falling back to basic rendering');
        }
    }

    handleAction(action, dialog, button) {
        switch (action) {
            case 'back':
                this.back();
                break;

            case 'close':
            case 'close-all':
                this.closeAll();
                break;

            default:
                // Custom action - call handler if provided
                if (dialog.options.onAction) {
                    dialog.options.onAction(action, button);
                } else if (action.startsWith('execute-')) {
                    // Handle execute actions
                    this.executeAction(action, dialog);
                }
                break;
        }
    }

    executeAction(action, dialog) {
        // Handle specific execute actions
        const game = window.game;
        if (!game) return;

        switch (action) {
            case 'execute-hire':
                if (dialog.options.agentId && game.hireAgent) {
                    game.hireAgent(dialog.options.agentId);
                    // Show success notification
                    this.showNotification('Agent hired successfully!', 'success');
                    // Return to parent level
                    setTimeout(() => this.back(), 2000);
                }
                break;

            case 'execute-mission':
                if (dialog.options.missionId && game.selectMission) {
                    game.selectMission(dialog.options.missionId);
                    this.closeAll();
                }
                break;

            // Add more execute actions as needed
        }
    }

    showNotification(message, type = 'info') {
        // Level 4 notification - auto-closes
        if (window.modalEngine) {
            const notification = window.modalEngine.show({
                type: 'standard',
                title: type === 'success' ? '✓ Success' : 'ℹ Information',
                content: message,
                buttons: [],
                closeButton: false,
                backdrop: false,
                autoClose: true,
                autoCloseDelay: 2000,
                className: `notification-${type}`
            });
        }
    }

    updateBreadcrumb() {
        if (!this.breadcrumbElement) return;

        // Build breadcrumb path
        const path = ['Hub'];
        this.stack.forEach(dialog => {
            path.push(dialog.config.title);
        });

        // Update display
        this.breadcrumbElement.innerHTML = path.join(' > ');

        // Show/hide based on stack
        this.breadcrumbElement.style.display = this.stack.length > 0 ? 'block' : 'none';
    }

    returnToBase() {
        // Return to appropriate base screen
        const game = window.game;
        if (game) {
            // Determine current screen and act accordingly
            if (game.currentScreen === 'game') {
                // Just close dialogs, stay in game
                if (game.isPaused) {
                    game.resumeFromPause();
                }
            } else if (game.currentScreen === 'hub') {
                // Refresh hub if needed
                if (game.refreshHub) {
                    game.refreshHub();
                }
            }
        }
    }

    getCurrentLevel() {
        return this.stack.length;
    }

    canOpenDialog() {
        return this.stack.length < this.maxDepth;
    }

    getCurrentDialog() {
        return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
    }

    getParentDialog() {
        return this.stack.length > 1 ? this.stack[this.stack.length - 2] : null;
    }

    isDialogInStack(dialogId) {
        return this.stack.some(d => d.id === dialogId);
    }
}

// Create global instance
window.dialogManager = new DialogManager();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DialogManager;
}