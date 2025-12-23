/**
 * Cutscene Integration
 * Connects the declarative cutscene engine with the game
 */

(function() {
    // Create and initialize the global cutscene engine
    if (window.CutsceneEngine && window.CUTSCENE_CONFIG) {
        window.cutsceneEngine = new window.CutsceneEngine(window.CUTSCENE_CONFIG);
        window.cutsceneEngine.init();
    }
})();

/**
 * Initialize cutscene system for the game
 */
CyberOpsGame.prototype.initializeCutsceneSystem = function() {
    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('CutsceneIntegration') : null;
    }
    if (this.logger) this.logger.debug('🎬 Initializing Cutscene System');

    // Get the engine
    const engine = window.cutsceneEngine;
    if (!engine) {
        if (this.logger) this.logger.error('Cutscene Engine not found!');
        return;
    }

    // Store reference
    this.cutsceneEngine = engine;

    // Register game-specific actions
    this.registerCutsceneActions(engine);

    if (this.logger) this.logger.info('✅ Cutscene System ready');
};

/**
 * Register game-specific cutscene actions
 */
CyberOpsGame.prototype.registerCutsceneActions = function(engine) {
    const game = this;

    // Override executeAction to handle game-specific actions
    const originalExecuteAction = engine.executeAction.bind(engine);

    engine.executeAction = function(action) {
        if (!action) return;

        const [type, target] = action.split(':');

        switch (type) {
            case 'navigate':
                // Navigate to screen using screen manager
                if (window.screenManager) {
                    window.screenManager.navigateTo(target);
                } else if (game.dialogEngine) {
                    game.dialogEngine.navigateTo(target);
                }
                break;

            case 'cutscene':
                // Chain to another cutscene
                this.play(target);
                break;

            case 'execute':
                // Execute game function
                if (target === 'startMissionGameplay') {
                    game.startMissionGameplay();
                } else if (typeof game[target] === 'function') {
                    game[target]();
                }
                break;

            default:
                // Fall back to original handler
                originalExecuteAction(action);
        }
    };
};

/**
 * Play a cutscene by ID
 * @param {string} cutsceneId - The cutscene ID to play
 * @param {Function} onComplete - Optional callback when cutscene ends
 */
CyberOpsGame.prototype.playCutscene = function(cutsceneId, onComplete = null) {
    if (!this.cutsceneEngine) {
        if (this.logger) this.logger.warn('Cutscene engine not initialized');
        if (onComplete) onComplete();
        return false;
    }

    if (this.logger) this.logger.info(`🎬 Playing cutscene: ${cutsceneId}`);
    return this.cutsceneEngine.play(cutsceneId, onComplete);
};

/**
 * Skip current cutscene
 */
CyberOpsGame.prototype.skipCutscene = function() {
    if (this.cutsceneEngine && this.cutsceneEngine.isActive()) {
        this.cutsceneEngine.skip();
    }
};

/**
 * Check if a cutscene is playing
 */
CyberOpsGame.prototype.isCutscenePlaying = function() {
    return this.cutsceneEngine && this.cutsceneEngine.isActive();
};

/**
 * Start mission gameplay (called from cutscene)
 * This is called after mission intro cutscene finishes
 */
CyberOpsGame.prototype.startMissionGameplay = function() {
    if (this.logger) this.logger.info('🎮 Starting mission gameplay');

    // Navigate to game screen
    if (window.screenManager) {
        window.screenManager.navigateTo('game');
    }

    // Ensure game is not paused
    this.isPaused = false;

    // Start mission music
    if (this.startLevelMusic) {
        this.startLevelMusic();
    }
};

/**
 * Play mission intro cutscene
 * Act intros are handled separately:
 * - Act 1: Plays after game-intro (chained in cutscene-config)
 * - Act 2+: Plays when returning to hub after last mission of previous act
 * @param {string} missionId - The mission ID (e.g., 'main-01-001')
 * @param {Function} onComplete - Called when cutscene ends
 */
CyberOpsGame.prototype.playMissionIntroCutscene = function(missionId, onComplete) {
    const cutsceneId = `mission-${missionId.replace('main-', '')}-intro`;

    // Check if mission intro cutscene exists
    if (window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
        if (this.logger) this.logger.info(`🎬 Playing mission intro: ${cutsceneId}`);
        this.playCutscene(cutsceneId, onComplete);
    } else {
        // No cutscene, just call callback
        if (this.logger) this.logger.debug(`No intro cutscene: ${cutsceneId}`);
        if (onComplete) onComplete();
    }
};

/**
 * Play mission outro cutscene
 * @param {string} missionId - The mission ID (e.g., 'main-01-001')
 * @param {Function} onComplete - Called when cutscene ends
 */
CyberOpsGame.prototype.playMissionOutroCutscene = function(missionId, onComplete) {
    const cutsceneId = `mission-${missionId.replace('main-', '')}-outro`;

    // Check if cutscene exists
    if (window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
        this.playCutscene(cutsceneId, onComplete);
    } else {
        // No cutscene, just call callback
        if (this.logger) this.logger.debug(`No outro cutscene for mission ${missionId}`);
        if (onComplete) onComplete();
    }
};

/**
 * Play game intro cutscene (for new games)
 */
CyberOpsGame.prototype.playGameIntroCutscene = function(onComplete) {
    this.playCutscene('game-intro', onComplete);
};

/**
 * Play act intro cutscene
 * @param {number} actNumber - The act number (1 or 2)
 * @param {Function} onComplete - Called when cutscene ends
 */
CyberOpsGame.prototype.playActIntroCutscene = function(actNumber, onComplete) {
    const cutsceneId = `act${actNumber}-intro`;

    if (window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
        this.playCutscene(cutsceneId, onComplete);
    } else {
        if (onComplete) onComplete();
    }
};

/**
 * Play act outro cutscene
 * @param {number} actNumber - The act number (1 or 2)
 * @param {Function} onComplete - Called when cutscene ends
 */
CyberOpsGame.prototype.playActOutroCutscene = function(actNumber, onComplete) {
    const cutsceneId = `act${actNumber}-outro`;

    if (window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
        this.playCutscene(cutsceneId, onComplete);
    } else {
        if (onComplete) onComplete();
    }
};

/**
 * Play game finale cutscene
 */
CyberOpsGame.prototype.playGameFinaleCutscene = function(onComplete) {
    this.playCutscene('game-finale', onComplete);
};
