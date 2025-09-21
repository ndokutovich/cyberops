/**
 * Modal Dialog Integration
 * Connects declarative modal configs to game functions
 * Following DIALOG_CONVERSION_GUIDE.md extraction patterns
 */

(function() {
    // Wait for dialog engine to be available
    function registerModalIntegrations() {
        const engine = window.declarativeDialogEngine;
        if (!engine) {
            console.warn('Dialog engine not ready for modal integrations');
            return;
        }

        const game = window.game;

        // ========== ACTION HANDLERS ==========

        // Return to Hub from Mission
        engine.registerAction('performReturnToHub', function() {
            // Extracted from game-flow.js:2000-2012
            game.closeDialog();
            game.isPaused = false;

            const pauseButton = document.querySelector('.pause-button');
            if (pauseButton) {
                pauseButton.textContent = '⏸';
            }

            console.log('🎵 Keeping level music playing in hub');

            // Hide game elements
            const gameHUD = document.getElementById('gameHUD');
            if (gameHUD) {
                gameHUD.style.display = 'none';
            }

            // Save mission state (for potential resumption)
            // Original comment: could be implemented later for mission resumption

            game.showSyndicateHub();
        });

        // Confirm Save
        engine.registerAction('confirmSave', function() {
            const slotData = this.stateData.saveSlot;
            if (!slotData) {
                console.error('No save slot data provided');
                return;
            }

            // Perform the save
            game.saveToSlot(slotData.slotNumber);

            // Show success feedback
            this.navigateTo('save-success', { slot: slotData.slotNumber });

            // Auto-close after delay
            setTimeout(() => {
                this.navigateTo('save-load', null, true); // Refresh save/load dialog
            }, 1500);
        });

        // Confirm Load
        engine.registerAction('confirmLoad', function() {
            const slotData = this.stateData.saveSlot;
            if (!slotData || !slotData.slotName) {
                console.error('Cannot load from empty slot');
                return;
            }

            // Perform the load
            game.loadSaveSlot(slotData.slotNumber);

            // Close all dialogs and return to game
            this.closeAll();
        });

        // Confirm Delete
        engine.registerAction('confirmDelete', function() {
            const slotData = this.stateData.saveSlot;
            if (!slotData) {
                console.error('No save slot data provided');
                return;
            }

            // Delete the save
            game.deleteSave(slotData.slotNumber);

            // Refresh the save/load dialog
            this.navigateTo('save-load', null, true);
        });

        // Confirm Surrender
        engine.registerAction('confirmSurrender', function() {
            // Close dialog
            this.closeAll();

            // Trigger defeat
            game.triggerDefeat('surrender');
        });

        // ========== HELPER FUNCTIONS ==========

        // Helper to show insufficient funds modal
        engine.showInsufficientFunds = function(itemName, itemCost) {
            this.navigateTo('insufficient-funds', {
                purchaseData: {
                    itemName: itemName,
                    itemCost: itemCost,
                    currentCredits: game.credits
                }
            });
        };

        // Helper to show exit confirmation
        engine.showExitConfirmation = function() {
            this.navigateTo('confirm-exit');
        };

        // Helper to show surrender confirmation
        engine.showSurrenderConfirmation = function() {
            this.navigateTo('confirm-surrender');
        };

        console.log('✅ Modal dialog integrations registered');
    }

    // Function to apply wrappers after game is ready
    function applyWrappers() {
        const engine = window.declarativeDialogEngine;
        const game = window.game;

        if (!engine || !game) return false;

        // Replace returnToHubFromMission
        if (game.returnToHubFromMission && !game._returnToHubFromMissionWrapped) {
            const originalFunction = game.returnToHubFromMission;
            game.returnToHubFromMission = function() {
                if (engine && engine.navigateTo) {
                    engine.navigateTo('confirm-exit');
                } else {
                    // Fallback to original
                    originalFunction.call(this);
                }
            };
            game._returnToHubFromMissionWrapped = true;
            console.log('✅ Wrapped returnToHubFromMission');
        }

        // Replace insufficient funds dialog in equipment
        if (game.showInsufficientFundsDialog && !game._showInsufficientFundsWrapped) {
            game.showInsufficientFundsDialog = function(itemName, itemCost) {
                if (engine && engine.showInsufficientFunds) {
                    engine.showInsufficientFunds(itemName, itemCost);
                } else {
                    // Fallback to showHudDialog
                    this.showHudDialog(
                        '❌ INSUFFICIENT FUNDS',
                        `You need ${itemCost} credits to buy ${itemName}.<br>
                        You currently have ${this.credits} credits.`,
                        [{ text: 'OK', action: 'close' }]
                    );
                }
            };
            game._showInsufficientFundsWrapped = true;
            console.log('✅ Wrapped showInsufficientFundsDialog');
        }

        return true;
    }

    // Register when dialog engine is ready
    if (window.declarativeDialogEngine) {
        registerModalIntegrations();
        // Try to apply wrappers immediately
        applyWrappers();
    } else {
        // Wait for engine to be initialized
        const checkInterval = setInterval(() => {
            if (window.declarativeDialogEngine) {
                clearInterval(checkInterval);
                registerModalIntegrations();
                applyWrappers();
            }
        }, 100);
    }

    // Also try to apply wrappers after game initialization
    const wrapperInterval = setInterval(() => {
        if (window.game && window.declarativeDialogEngine) {
            if (applyWrappers()) {
                clearInterval(wrapperInterval);
            }
        }
    }, 100);
})();