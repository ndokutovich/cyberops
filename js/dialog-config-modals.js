/**
 * Modal Dialog Configurations
 * Converted from imperative showHudDialog calls to declarative system
 * Following DIALOG_CONVERSION_GUIDE.md principles
 */

(function() {
    // Get the dialog config object
    const dialogConfig = window.DIALOG_CONFIG || {};

    // Ensure states object exists
    if (!dialogConfig.states) {
        dialogConfig.states = {};
    }

    // ========== CONFIRMATION MODALS ==========

    // Return to Hub Confirmation (from pause menu)
    dialogConfig.states['confirm-exit'] = {
        type: 'dialog',
        level: 2,
        parent: 'pause-menu',
        title: '🏢 RETURN TO HUB',
        layout: 'confirmation',
        content: {
            type: 'static',
            text: 'Return to Syndicate Hub?<br><br><strong>Note:</strong> Your mission progress will be saved and you can resume later.'
        },
        buttons: [
            { text: 'RETURN TO HUB', action: 'execute:performReturnToHub', danger: true },
            { text: 'CANCEL', action: 'back' }
        ],
        transitions: {
            enter: { animation: 'zoom-in', duration: 200 },
            exit: { animation: 'zoom-out', duration: 150 }
        }
    };

    // Insufficient Funds Modal
    dialogConfig.states['insufficient-funds'] = {
        type: 'dialog',
        level: 2,
        parent: null, // Can be opened from various places
        title: '❌ INSUFFICIENT FUNDS',
        layout: 'alert',
        content: {
            type: 'template',
            template: 'insufficient-funds-message',
            data: 'purchaseData' // Expects: { itemName, itemCost, currentCredits }
        },
        buttons: [
            { text: 'OK', action: 'close', primary: true }
        ],
        transitions: {
            enter: { animation: 'shake', duration: 300 },
            exit: { animation: 'fade-out', duration: 150 }
        }
    };

    // Save Confirmation
    dialogConfig.states['save-confirm'] = {
        type: 'dialog',
        level: 3,
        parent: 'save-load',
        title: '💾 SAVE GAME',
        layout: 'confirmation',
        content: {
            type: 'template',
            template: 'save-confirmation',
            data: 'saveSlot' // Expects: { slotNumber, slotName, timestamp }
        },
        buttons: [
            { text: 'SAVE', action: 'execute:confirmSave', primary: true },
            { text: 'CANCEL', action: 'back' }
        ]
    };

    // Load Confirmation
    dialogConfig.states['load-confirm'] = {
        type: 'dialog',
        level: 3,
        parent: 'save-load',
        title: '📂 LOAD GAME',
        layout: 'confirmation',
        content: {
            type: 'template',
            template: 'load-confirmation',
            data: 'saveSlot'
        },
        buttons: [
            { text: 'LOAD', action: 'execute:confirmLoad', danger: true },
            { text: 'CANCEL', action: 'back' }
        ]
    };

    // Delete Save Confirmation
    dialogConfig.states['delete-confirm'] = {
        type: 'dialog',
        level: 3,
        parent: 'save-load',
        title: '🗑️ DELETE SAVE',
        layout: 'confirmation',
        content: {
            type: 'template',
            template: 'delete-confirmation',
            data: 'saveSlot'
        },
        buttons: [
            { text: 'DELETE', action: 'execute:confirmDelete', danger: true },
            { text: 'CANCEL', action: 'back' }
        ]
    };

    // Surrender Confirmation (in-game)
    dialogConfig.states['confirm-surrender'] = {
        type: 'dialog',
        level: 2,
        parent: 'game',
        title: '🏳️ SURRENDER MISSION',
        layout: 'confirmation',
        content: {
            type: 'static',
            text: 'Are you sure you want to surrender?<br><br>All agents will retreat and the mission will be marked as failed.'
        },
        buttons: [
            { text: 'SURRENDER', action: 'execute:confirmSurrender', danger: true },
            { text: 'CONTINUE FIGHTING', action: 'close' }
        ]
    };

    // ========== TEMPLATES ==========

    dialogConfig.templates['insufficient-funds-message'] = `
        <div style="text-align: center;">
            <p>You need <span style="color: #ff6666;">{{itemCost}} credits</span> to buy {{itemName}}.</p>
            <p>You currently have <span style="color: #00ffff;">{{currentCredits}} credits</span>.</p>
            <div style="margin-top: 20px; color: #ffaa00;">
                💡 Tip: Complete missions to earn more credits!
            </div>
        </div>
    `;

    dialogConfig.templates['save-confirmation'] = `
        <div style="text-align: center;">
            <p>Save game to <strong>Slot {{slotNumber}}</strong>?</p>
            {{#if slotName}}
                <p style="color: #ffaa00;">This will overwrite:</p>
                <p style="color: #ccc;">{{slotName}}</p>
                <p style="color: #888; font-size: 0.9em;">{{timestamp}}</p>
            {{else}}
                <p style="color: #00ff00;">Empty slot</p>
            {{/if}}
        </div>
    `;

    dialogConfig.templates['load-confirmation'] = `
        <div style="text-align: center;">
            <p>Load game from <strong>Slot {{slotNumber}}</strong>?</p>
            {{#if slotName}}
                <p style="color: #00ffff;">{{slotName}}</p>
                <p style="color: #888; font-size: 0.9em;">{{timestamp}}</p>
                <hr style="margin: 15px 0; border-color: #333;">
                <p style="color: #ffaa00;">⚠️ Warning: Current progress will be lost!</p>
            {{else}}
                <p style="color: #ff6666;">This slot is empty!</p>
            {{/if}}
        </div>
    `;

    dialogConfig.templates['delete-confirmation'] = `
        <div style="text-align: center;">
            <p style="color: #ff6666;">⚠️ DELETE SAVE FILE ⚠️</p>
            <p>Are you sure you want to delete <strong>Slot {{slotNumber}}</strong>?</p>
            {{#if slotName}}
                <p style="color: #ccc;">{{slotName}}</p>
                <p style="color: #888; font-size: 0.9em;">{{timestamp}}</p>
                <hr style="margin: 15px 0; border-color: #333;">
                <p style="color: #ff6666;">This action cannot be undone!</p>
            {{/if}}
        </div>
    `;

    // Export config
    window.DIALOG_CONFIG = dialogConfig;
})();