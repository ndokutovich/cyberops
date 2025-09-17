// Audio System Redirects
// This file contains simplified redirects from old music system to new declarative system
// All old music logic has been removed - only redirects remain

// ============================================
// AUDIO INITIALIZATION
// ============================================

// Setup audio on first user interaction
CyberOpsGame.prototype.setupAudioInteraction = function() {
    const enableAudioOnClick = () => {
        if (!this.audioEnabled) {
            this.enableAudio();
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', enableAudioOnClick);
        document.removeEventListener('touchstart', enableAudioOnClick);
        document.removeEventListener('keydown', enableAudioOnClick);
    };

    // Add listeners for first user interaction
    document.addEventListener('click', enableAudioOnClick);
    document.addEventListener('touchstart', enableAudioOnClick);
    document.addEventListener('keydown', enableAudioOnClick);

    // Check if audio was previously enabled
    if (sessionStorage.getItem('audioEnabled') === 'true') {
        this.enableAudioImmediately();
    }
}

// ============================================
// OLD MUSIC SYSTEM REDIRECTS - SCREEN MUSIC
// ============================================

// Splash music redirects
CyberOpsGame.prototype.playSplashMusic = function() {
    if (this.loadScreenMusic) {
        this.loadScreenMusic('splash');
    }
}

CyberOpsGame.prototype.stopSplashMusic = function() {
    // Handled by screen music system transitions
}

// Main menu music redirects
CyberOpsGame.prototype.playMainMenuMusic = function() {
    if (this.loadScreenMusic) {
        this.loadScreenMusic('menu');
    }
}

CyberOpsGame.prototype.stopMainMenuMusic = function() {
    // Handled by screen music system
}

// Level music redirects (missions now use mission music system)
CyberOpsGame.prototype.playLevelMusic = function(levelNumber) {
    // Level music is now handled by mission music system
    console.log(`Level ${levelNumber} music handled by mission music system`);
}

CyberOpsGame.prototype.stopLevelMusic = function() {
    // Handled by mission music system
}

// Credits music redirects
CyberOpsGame.prototype.playCreditsMusic = function() {
    if (this.loadScreenMusic) {
        this.loadScreenMusic('credits');
    }
}

CyberOpsGame.prototype.stopCreditsMusic = function() {
    if (this.stopScreenMusic) {
        this.stopScreenMusic();
    }
}

// ============================================
// PROCEDURAL MUSIC FALLBACKS (DEPRECATED)
// ============================================
// These are kept for backward compatibility but no longer used

CyberOpsGame.prototype.playProceduralSplashMusic = function() {
    console.log('Procedural music deprecated - using screen music system');
}

CyberOpsGame.prototype.playProceduralMainMenuMusic = function() {
    console.log('Procedural music deprecated - using screen music system');
}

CyberOpsGame.prototype.playProceduralLevelMusic = function(levelNumber) {
    console.log('Procedural music deprecated - using mission music system');
}

CyberOpsGame.prototype.playProceduralCreditsMusic = function() {
    console.log('Procedural music deprecated - using screen music system');
}

