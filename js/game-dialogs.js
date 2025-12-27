    // HUD Dialog System - Uses Modal Engine (single source of truth)
CyberOpsGame.prototype.showHudDialog = function(title, message, buttons) {

    // Initialize logger if needed
    if (!this.logger && window.Logger) {
        this.logger = new window.Logger('GameDialogs');
    }

    // Ensure modal engine is available (create if class exists but instance doesn't)
    if (!window.modalEngine && window.ModalEngine) {
        window.modalEngine = new window.ModalEngine();
    }

    // Modal engine is required - fail fast if not available
    if (!window.modalEngine) {
        throw new Error('ModalEngine not available - required for dialogs');
    }

    // Don't close all modals for confirmation dialogs - allow stacking
    const isConfirmation = title.includes('CONFIRM') || title.includes('⚠️') || title.includes('💰');
    if (!isConfirmation && window.modalEngine.closeAll) {
        window.modalEngine.closeAll();
        this.activeModal = null;
    }

    // Store modal reference for closeDialog compatibility
    this.activeModal = window.modalEngine.show({
        type: 'standard',
        title: title,
        content: message,
        buttons: buttons.map(btn => ({
            text: btn.text,
            action: btn.action === 'close' ? 'close' : btn.action,
            primary: btn.primary || false,
            closeAfter: btn.closeAfter !== undefined ? btn.closeAfter : true
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
    // Close declarative dialog engine dialogs if any exist
    if (this.dialogEngine && this.dialogEngine.stateStack && this.dialogEngine.stateStack.length > 0) {
        this.dialogEngine.close();
        return;
    }

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

    // Legacy dialog removed - handle pause menu through modal
    if (this.isPaused) {
            // Directly resume the game without calling resumeFromPause (avoid recursion)
            this.isPaused = false;
            const pauseButton = document.querySelector('.pause-button');
            if (pauseButton) {
                pauseButton.textContent = '⏸';
            }
            this.resumeLevelMusic();
        }
}

