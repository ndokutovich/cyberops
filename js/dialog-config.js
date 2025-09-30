/**
 * Declarative Dialog Configuration
 * Complete data-driven definition of ALL dialogs in the game
 */

const DIALOG_CONFIG = {
    // Global settings
    settings: {
        maxDepth: 4,
        defaultTransition: 'fade',
        animationDuration: 300,
        autoCloseDelay: 2000,
        enableBreadcrumb: true,
        enableKeyboard: true,
        enableGamepadSupport: false
    },

    // Layout definitions
    layouts: {
        'standard': {
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
        },
        'wide': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content">{{content}}</div>
                <div class="dialog-actions">{{buttons}}</div>
            `,
            styles: {
                maxWidth: '900px',
                maxHeight: '600px'
            }
        },
        'full-screen': {
            structure: `
                <div class="screen-content">{{content}}</div>
                <div class="screen-actions">{{buttons}}</div>
            `,
            styles: {
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%',
                position: 'fixed',
                top: '0',
                left: '0',
                background: 'rgba(0, 0, 0, 0.95)',
                zIndex: '9999'
            }
        },
        'full-screen-no-dialog': {
            structure: `{{content}}`,
            styles: {
                display: 'none'  // Special case - hub uses existing DOM
            }
        },
        'centered': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content">{{content}}</div>
                <div class="dialog-actions">{{buttons}}</div>
            `,
            styles: {
                maxWidth: '500px',
                maxHeight: '400px'
            }
        },
        'notification': {
            structure: `
                <div class="notification-content">{{content}}</div>
            `,
            styles: {
                maxWidth: '400px',
                maxHeight: '200px',
                position: 'fixed',
                top: '20px',
                right: '20px'
            }
        }
    },

    // State definitions
    states: {
        // ========== HUB DIALOGS (Level 1) ==========
        'agent-management': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '👥 AGENT MANAGEMENT',
            layout: 'standard',
            content: {
                type: 'dynamic',
                generator: 'generateAgentManagement'
            },
            buttons: [
                { text: 'HIRE NEW AGENTS', action: 'navigate:hire-agents' },
                { text: 'CLOSE', action: 'close' }
            ],
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            }
        },

        // Level 2: Hire Agents
        'hire-agents': {
            type: 'dialog',
            level: 2,
            parent: 'agent-management',
            title: 'HIRE AGENTS',
            layout: 'shop-layout',
            content: {
                type: 'list',
                source: 'availableAgents',
                filter: 'item => !item.hired',
                template: 'hire-agent-card',
                emptyMessage: 'No agents available for hire. Check back later.'
            },
            buttons: [
                { text: 'BACK', action: 'back' },
                { text: 'CLOSE', action: 'close' }
            ],
            keyboard: {
                'ArrowUp': 'selectPrevious',
                'ArrowDown': 'selectNext',
                'Enter': 'hireSelected',
                'Escape': 'back'
            }
        },

        // Level 3: Hire Confirmation
        'hire-confirm': {
            type: 'dialog',
            level: 3,
            parent: 'hire-agents',
            title: 'CONFIRM HIRE',
            layout: 'confirmation',
            content: {
                type: 'template',
                template: 'hire-confirmation',
                data: 'selectedAgent'
            },
            buttons: [
                { text: 'CONFIRM', action: 'execute:confirmHire', primary: true },
                { text: 'CANCEL', action: 'back' }
            ],
            autoClose: {
                onSuccess: true,
                delay: 2000,
                returnTo: 'hire-agents'
            }
        },



        // ARSENAL REMOVED - Now directly opens equipment dialog via showEquipmentDialog()

        // ========== RESEARCH LAB (Level 1) ==========
        'research-lab': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '🔬 RESEARCH LABORATORY',
            layout: 'standard',
            content: {
                type: 'dynamic',
                generator: 'generateResearchLab'
            },
            buttons: [
                { text: 'VIEW TECH TREE', action: 'navigate:tech-tree' },
                { text: 'CLOSE', action: 'close' }
            ]
        },

        // ========== CHARACTER/RPG (Level 1) ==========
        'character': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '📊 CHARACTER SHEET',
            layout: 'large-layout',
            content: {
                type: 'dynamic',
                generator: 'generateCharacterSheet'
            },
            buttons: {
                type: 'dynamic',
                generator: 'generateCharacterButtons'
            },
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            }
        },

        // ========== STAT ALLOCATION (Level 2 - Child of Character) ==========
        'stat-allocation': {
            type: 'dialog',
            level: 2,
            parent: 'character',
            title: '📈 ALLOCATE STAT POINTS',
            layout: 'medium-layout',
            content: {
                type: 'dynamic',
                generator: 'generateStatAllocation'
            },
            buttons: {
                type: 'static',
                items: [
                    {
                        text: 'CONFIRM',
                        action: { type: 'execute', handler: 'confirmStatAllocation' },
                        style: 'primary'
                    },
                    {
                        text: 'CANCEL',
                        action: { type: 'back' }
                    }
                ]
            },
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            },
            styles: {
                width: '500px',
                maxWidth: '90vw',
                height: '80vh',
                maxHeight: '80vh'
            }
        },

        // ========== PERK SELECTION (Level 2 - Child of Character) ==========
        'perk-selection': {
            type: 'dialog',
            level: 2,
            parent: 'character',
            title: '⭐ SELECT PERK',
            layout: 'large-layout',
            content: {
                type: 'dynamic',
                generator: 'generatePerkSelection'
            },
            buttons: [
                { text: '← BACK', action: 'back', primary: false },
                { text: 'CLOSE', action: 'close' }
            ],
            keyboard: {
                'Escape': 'back'
            },
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            },
            styles: {
                width: '700px',
                maxWidth: '90vw',
                height: '80vh',
                maxHeight: '80vh'
            }
        },

        // ========== SKILL TREE (Level 2 - Child of Character) ==========
        'skill-tree': {
            type: 'dialog',
            level: 2,
            parent: 'character',
            title: '🎯 SKILL TREE',
            layout: 'large-layout',
            content: {
                type: 'dynamic',
                generator: 'generateSkillTree'
            },
            buttons: {
                type: 'static',
                items: [
                    { text: 'CLOSE', action: { type: 'back' } }
                ]
            },
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            },
            styles: {
                width: '700px',
                maxWidth: '90vw',
                height: '80vh',
                maxHeight: '80vh'
            }
        },

        // ========== ARSENAL/EQUIPMENT (Level 1) ==========
        'arsenal': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '🔫 EQUIPMENT MANAGEMENT',
            layout: 'large-layout',
            content: {
                type: 'dynamic',
                generator: 'generateEquipmentManagement'
            },
            buttons: {
                type: 'dynamic',
                generator: 'generateArsenalButtons'
            },
            transitions: {
                enter: { animation: 'fade-in', sound: 'dialog-open' },
                exit: { animation: 'fade-out', sound: 'dialog-close' }
            }
        },

        // ========== HALL OF GLORY (Level 1) ==========
        'hall-of-glory': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '⚰️ HALL OF GLORY',
            layout: 'memorial-layout',
            content: {
                type: 'dynamic',
                generator: 'generateHallOfGlory'
            },
            buttons: [
                { text: '← BACK TO HUB', action: 'execute:returnToHub' }
            ],
            transitions: {
                enter: { animation: 'fade-in', sound: 'solemn-music' },
                exit: { animation: 'fade-out' }
            }
        },

        // ========== MISSION SELECT (Level 1) ==========
        'mission-select-hub': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '🎭 MISSION SELECTION',
            layout: 'mission-grid',
            content: {
                type: 'dynamic',
                generator: 'generateMissionSelection'
            },
            buttons: [
                { text: 'BACK', action: 'execute:returnToHub' }
            ]
        },

        // ========== INTEL & MISSIONS (Level 1) ==========
        'intel-missions': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '📡 INTEL & DATA',
            layout: 'standard',
            content: {
                type: 'dynamic',
                generator: 'generateIntelData'
            },
            buttons: [
                { text: 'CLOSE', action: 'close' }
            ]
        },

        // Level 2: Tech Tree
        'tech-tree': {
            type: 'dialog',
            level: 2,
            parent: 'research-lab',
            title: 'TECH TREE',
            layout: 'standard',
            content: {
                type: 'dynamic',
                generator: 'generateTechTree'
            },
            buttons: [
                { text: 'BACK', action: 'back' }
            ]
        },

        // Level 2: Save/Load
        'save-load': {
            type: 'dialog',
            level: 2,
            parent: 'pause-menu',
            title: 'SAVE/LOAD GAME',
            layout: 'standard',
            content: {
                type: 'dynamic',
                generator: 'generateSaveLoadUI'
            },
            buttons: [
                { text: 'QUICK SAVE', action: 'execute:quickSave' },
                { text: 'QUICK LOAD', action: 'execute:quickLoad' },
                { text: 'BACK', action: 'back' }
            ]
        },

        // ========== GAME STATE DIALOGS ==========
        'pause-menu': {
            type: 'dialog',
            level: 1,
            parent: 'game',
            title: '⏸ GAME PAUSED',
            layout: 'pause-layout',
            content: {
                type: 'dynamic',
                generator: 'generatePauseMenuContent'
            },
            buttons: [
                { text: 'RESUME', action: 'execute:resumeGame', primary: true },
                { text: 'SETTINGS', action: 'navigate:settings' },
                { text: 'SAVE/LOAD', action: 'navigate:save-load' },
                { text: 'EXIT TO HUB', action: 'execute:exitToHub', danger: true }
            ],
            keyboard: {
                'Escape': 'execute:resumeGame',
                'P': 'execute:resumeGame'
            }
        },

        'mission-progress': {
            type: 'dialog',
            level: 1,
            parent: 'game',
            title: '📊 MISSION PROGRESS',
            layout: 'dialog-layout',
            content: {
                type: 'dynamic',
                generator: 'generateMissionProgress'
            },
            buttons: [
                { text: '← BACK TO GAME', action: 'close', primary: true }
            ],
            keyboard: {
                'Escape': 'close',
                'J': 'close',
                'j': 'close'
            }
        },

        'rpg-shop': {
            type: 'dialog',
            level: 1,
            parent: 'game',
            title: '🛒 SHOP',
            layout: 'dialog-layout',
            content: {
                type: 'dynamic',
                generator: 'generateRPGShop'
            },
            buttons: [
                { text: '← CLOSE', action: 'close', primary: true }
            ],
            keyboard: {
                'Escape': 'close'
            },
            styles: {
                maxWidth: '800px',
                maxHeight: '80vh'
            }
        },

        // Level 2: Settings (from pause menu)
        'settings': {
            type: 'dialog',
            level: 2,
            parent: 'pause-menu',
            title: '⚙️ SETTINGS',
            layout: 'settings-layout',
            content: {
                type: 'dynamic',
                generator: 'generateSettingsForm'
            },
            buttons: [
                { text: 'APPLY', action: 'execute:applySettings', primary: true },
                { text: 'DEFAULTS', action: 'execute:resetSettings' },
                { text: 'BACK', action: 'back' }
            ]
        },

        // Level 3: Hire Success
        'hire-success': {
            type: 'dialog',
            level: 3,
            parent: 'hire-agents',
            title: 'AGENT HIRED',
            layout: 'notification',
            content: {
                type: 'template',
                template: 'hire-success-message',
                data: 'agent'
            },
            buttons: [
                { text: 'OK', action: 'back', primary: true }
            ],
            autoClose: {
                timeout: 2000,
                action: 'back'
            }
        },

        // Hub Settings (accessible from hub/menu)
        'hub-settings': {
            type: 'dialog',
            level: 1,
            parent: 'hub',
            title: '⚙️ SETTINGS & CONTROLS',
            layout: 'settings-layout',
            content: {
                type: 'dynamic',
                generator: 'generateSettingsForm'
            },
            buttons: [
                { text: 'APPLY', action: 'execute:applySettings', primary: true },
                { text: 'DEFAULTS', action: 'execute:resetSettings' },
                { text: 'BACK TO HUB', action: 'back' }
            ]
        },

        // ========== NPC DIALOGS ==========
        'npc-interaction': {
            type: 'dialog',
            level: 1,
            parent: 'game',
            title: 'NPC INTERACTION',
            layout: 'npc-layout',
            position: 'bottom',
            content: {
                type: 'dynamic',
                generator: 'generateNPCDialog'
            },
            buttons: {
                type: 'dynamic',
                generator: 'generateNPCChoices'
            }
        }
    },

    // Transition definitions
    transitions: {
        'hub->hub-settings': {
            condition: 'always',
            animation: 'fade-in'
        },
        'hub->agent-management': {
            condition: 'always',
            animation: 'fade-in'
        },
        'hub->research-lab': {
            condition: 'hasResearchPoints',
            animation: 'fade-in'
        },
        'hub->intel-missions': {
            condition: 'always',
            animation: 'fade-in'
        },
        'agent-management->hire-agents': {
            condition: 'hasCredits',
            animation: 'slide-left'
        },
        'hire-agents->hire-confirm': {
            condition: 'agentSelected',
            animation: 'zoom-in'
        },
        'game->pause-menu': {
            condition: 'always',
            animation: 'fade-in',
            pauseGame: true
        }
    },

    // Layout templates
    layouts: {
        'category-menu': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content">
                    {{content}}
                </div>
                <div class="dialog-actions category-actions">
                    {{buttons}}
                </div>
            `,
            styles: {
                maxWidth: '700px',
                maxHeight: '600px',
                minWidth: '500px'
            }
        },

        'list-layout': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <span class="dialog-resource">Credits: <span class="credits-display">{{credits}}</span></span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content dialog-list-content">
                    {{content}}
                </div>
                <div class="dialog-actions">
                    {{buttons}}
                </div>
            `,
            styles: {
                maxWidth: '800px',
                maxHeight: '600px'
            }
        },

        'large-layout': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-content">
                    {{content}}
                </div>
                <div class="dialog-actions">
                    {{buttons}}
                </div>
            `,
            styles: {
                width: '1200px',
                maxWidth: '1200px',
                maxHeight: '80vh',
                minWidth: '1000px'
            }
        },

        'shop-layout': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                    <span class="dialog-resource">Credits: {{credits}}</span>
                    <button class="dialog-close-button">×</button>
                </div>
                <div class="dialog-filters">
                    {{filters}}
                </div>
                <div class="dialog-content shop-content">
                    {{content}}
                </div>
                <div class="dialog-actions">
                    {{buttons}}
                </div>
            `,
            styles: {
                maxWidth: '900px',
                maxHeight: '700px'
            }
        },

        'confirmation': {
            structure: `
                <div class="dialog-header">
                    <span class="dialog-title">{{title}}</span>
                </div>
                <div class="dialog-content confirmation-content">
                    {{content}}
                </div>
                <div class="dialog-actions">
                    {{buttons}}
                </div>
            `,
            styles: {
                maxWidth: '400px',
                maxHeight: '300px'
            }
        },

        'npc-layout': {
            structure: `
                <div class="npc-dialog">
                    <div class="npc-avatar">{{avatar}}</div>
                    <div class="npc-content">
                        <div class="npc-name">{{name}}</div>
                        <div class="npc-text">{{content}}</div>
                        <div class="npc-choices">{{buttons}}</div>
                    </div>
                </div>
            `,
            styles: {
                maxWidth: '600px',
                position: 'fixed',
                bottom: '20px',
                left: '50%',
                transform: 'translateX(-50%)'
            }
        }
    },

    // Content templates
    templates: {
        'squad-agent-card': `
            <div class="agent-card">
                <div class="agent-header">
                    <span class="agent-name">{{name}}</span>
                    <span class="agent-role">{{role}}</span>
                </div>
                <div class="agent-stats">
                    <div>Health: {{health}}/{{maxHealth}}</div>
                    <div>Damage: {{damage}}</div>
                    <div>Speed: {{speed}}</div>
                    <div>Accuracy: {{accuracy}}%</div>
                </div>
                <div class="agent-actions">
                    <button data-action="execute:dismissAgent:{{id}}" class="danger">Dismiss</button>
                </div>
            </div>
        `,

        'hire-agent-card': `
            <div class="hire-card {{#if affordable}}affordable{{else}}unaffordable{{/if}}">
                <div class="agent-info">
                    <div class="agent-name">{{name}}</div>
                    <div class="agent-stats">
                        Health: {{health}} | Damage: {{damage}} | Speed: {{speed}}
                    </div>
                    <div class="agent-skills">Skills: {{skills}}</div>
                </div>
                <div class="agent-cost">
                    <span class="cost">{{cost}} credits</span>
                    {{#if affordable}}
                        <button data-action="navigate:hire-confirm" data-agent="{{id}}">HIRE</button>
                    {{else}}
                        <span class="insufficient">Insufficient Funds</span>
                    {{/if}}
                </div>
            </div>
        `,


        'mission-card': `
            <div class="mission-card difficulty-{{difficulty}}">
                <div class="mission-header">
                    <span class="mission-name">{{name}}</span>
                    <span class="mission-difficulty">{{difficulty}}</span>
                </div>
                <div class="mission-description">{{description}}</div>
                <div class="mission-rewards">
                    Credits: {{rewards.credits}} | RP: {{rewards.researchPoints}}
                </div>
                <button data-action="navigate:mission-briefing:{{id}}">SELECT</button>
            </div>
        `,

        'hire-confirmation': `
            <div class="confirmation-dialog">
                <h3>Confirm Hire</h3>
                <p>Hire <strong>{{name}}</strong> for <strong>{{cost}} credits</strong>?</p>
                <div class="agent-preview">
                    <div>Health: {{health}}</div>
                    <div>Damage: {{damage}}</div>
                    <div>Speed: {{speed}}</div>
                </div>
            </div>
        `
    },

    // Animation definitions
    animations: {
        'slide-up': {
            from: { transform: 'translateY(30px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 },
            duration: 300,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        },
        'slide-left': {
            from: { transform: 'translateX(100%)', opacity: 0 },
            to: { transform: 'translateX(0)', opacity: 1 },
            duration: 250
        },
        'fade-in': {
            from: { opacity: 0 },
            to: { opacity: 1 },
            duration: 200
        },
        'fade-out': {
            from: { opacity: 1 },
            to: { opacity: 0 },
            duration: 200
        },
        'zoom-in': {
            from: { transform: 'scale(0.8)', opacity: 0 },
            to: { transform: 'scale(1)', opacity: 1 },
            duration: 200,
            easing: 'ease-out'
        }
    },

    // Sound configuration
    sounds: {
        'dialog-open': { file: 'ui/dialog-open.mp3', volume: 0.4 },
        'dialog-close': { file: 'ui/dialog-close.mp3', volume: 0.3 },
        'button-hover': { file: 'ui/button-hover.mp3', volume: 0.2 },
        'button-click': { file: 'ui/button-click.mp3', volume: 0.3 },
        'purchase-success': { file: 'ui/purchase.mp3', volume: 0.5 },
        'error': { file: 'ui/error.mp3', volume: 0.4 }
    },

    // Keyboard shortcuts
    keyboard: {
        global: {
            'Escape': 'back',
            'Tab': 'focusNext',
            'Shift+Tab': 'focusPrevious',
            'Enter': 'activateFocused',
            'Space': 'activateFocused'
        }
    },

    // Events
    events: {
        'agentHired': {
            listeners: ['updateHubStats', 'refreshAgentLists', 'saveGameState'],
            broadcast: true
        },
        'itemPurchased': {
            listeners: ['updateInventory', 'refreshShop', 'updateCredits'],
            broadcast: true
        },
        'researchCompleted': {
            listeners: ['applyResearchBonuses', 'updateTechTree', 'showNotification'],
            broadcast: true
        }
    },

    // Validators (names map to registered functions)
    validators: {
        'hasAgents': 'return this.activeAgents && this.activeAgents.length > 0',
        'hasCredits': 'return this.credits > 0',
        'hasResearchPoints': 'return this.researchPoints > 0',
        'agentSelected': 'return this.selectedAgent !== null',
        'canAffordSelectedItem': 'return this.credits >= this.selectedItem?.price'
    }
};

// Make config globally available
window.DIALOG_CONFIG = DIALOG_CONFIG;

// Don't auto-initialize - let it happen after all configs are loaded
// The engine will be initialized in dialog-integration.js or manually

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DIALOG_CONFIG;
}