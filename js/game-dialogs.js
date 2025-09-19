    // HUD Dialog System - Now using Modal Engine
CyberOpsGame.prototype.showHudDialog = function(title, message, buttons) {
    // Use new modal engine if available
    if (window.modalEngine) {
        // Close ALL existing modals first to prevent stacking issues
        if (window.modalEngine.closeAll) {
            window.modalEngine.closeAll();
        }
        this.activeModal = null;

        // Store modal reference for closeDialog compatibility
        this.activeModal = window.modalEngine.show({
            type: 'standard',
            title: title,
            content: message,
            buttons: buttons.map(btn => ({
                text: btn.text,
                action: btn.action === 'close' ? 'close' : btn.action,
                primary: btn.primary || false
            })),
            closeButton: true,
            backdrop: true,
            closeOnBackdrop: false,
            onClose: () => {
                this.activeModal = null;
                // Handle pause menu specific logic
                if (title === '⏸ GAME PAUSED' && this.isPaused) {
                    this.isPaused = false;
                    const pauseButton = document.querySelector('.pause-button');
                    if (pauseButton) {
                        pauseButton.textContent = '⏸';
                    }
                    this.resumeLevelMusic();
                }
            }
        });
        return;
    }

    // Fallback to old system if modal engine not available
    document.getElementById('dialogTitle').textContent = title;
    document.getElementById('dialogBody').innerHTML = message;

    const actionsDiv = document.getElementById('dialogActions');
    actionsDiv.innerHTML = '';

    // Use global game instance to ensure correct context
    const gameInstance = window.game || this;

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = 'menu-button';
        button.textContent = btn.text;

        // Directly set onclick to ensure it works
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Dialog button clicked:', btn.text);

            if (btn.action === 'close') {
                console.log('Closing dialog...');
                gameInstance.closeDialog();
            } else if (typeof btn.action === 'function') {
                console.log('Executing action function...');
                try {
                    // Just call the function - arrow functions will maintain their context
                    btn.action();
                } catch (err) {
                    console.error('Error executing dialog action:', err);
                }
            } else {
                console.log('Unknown action type:', btn.action);
            }
        });

        actionsDiv.appendChild(button);
    });

    document.getElementById('hudDialog').classList.add('show');
}

// Helper function for safe dialog transitions
CyberOpsGame.prototype.transitionDialog = function(targetFunction) {
    // Close all dialogs first
    this.closeDialog();

    // Add small delay to ensure cleanup completes
    setTimeout(() => {
        if (typeof targetFunction === 'function') {
            targetFunction.call(this);
        }
    }, 50);
}

CyberOpsGame.prototype.closeDialog = function() {
    // Close ALL modal engine dialogs if any exist
    if (window.modalEngine && window.modalEngine.activeModals && window.modalEngine.activeModals.length > 0) {
        window.modalEngine.closeAll();
        this.activeModal = null;
        this.activeNPCModal = null;
        this.activeIntermissionModal = null;
        this.activeSaveModal = null;
        return;
    }

    // Close specific modal if exists
    if (this.activeModal) {
        this.activeModal.close();
        this.activeModal = null;
        return;
    }

    // Fallback to old system
    const hudDialog = document.getElementById('hudDialog');
    if (hudDialog) {
        hudDialog.classList.remove('show');

        // If we're closing the pause menu, also resume the game
        const dialogTitle = document.getElementById('dialogTitle');
        if (dialogTitle && dialogTitle.textContent === '⏸ GAME PAUSED' && this.isPaused) {
            // Directly resume the game without calling resumeFromPause (avoid recursion)
            this.isPaused = false;
            const pauseButton = document.querySelector('.pause-button');
            if (pauseButton) {
                pauseButton.textContent = '⏸';
            }
            this.resumeLevelMusic();
        }
    }
}

