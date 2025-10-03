    // Demoscene Attract Mode System
CyberOpsGame.prototype.startDemosceneIdleTimer = function() {
        if (this.logger) this.logger.debug('🎬 startDemosceneIdleTimer() called:');
        if (this.logger) this.logger.debug('- currentScreen:', this.currentScreen);
        if (this.logger) this.logger.debug('- demosceneActive:', this.demosceneActive);
        if (this.logger) this.logger.debug('- DEMOSCENE_IDLE_TIMEOUT:', this.DEMOSCENE_IDLE_TIMEOUT);

        // Clear existing timer
        this.clearDemosceneTimer();

        // Check for main-menu (new screen system name)
        if (this.currentScreen === 'main-menu' && !this.demosceneActive) {
            if (this.logger) this.logger.debug('✅ Starting demoscene idle timer (' + this.DEMOSCENE_IDLE_TIMEOUT + ' ms)');
            this.demosceneTimer = setTimeout(() => {
                if (this.logger) this.logger.debug('⏰ Demoscene timer fired! Checking conditions...');
                if (this.logger) this.logger.debug('- currentScreen at timeout:', this.currentScreen);
                if (this.logger) this.logger.debug('- demosceneActive at timeout:', this.demosceneActive);
                if (this.currentScreen === 'main-menu' && !this.demosceneActive) {
                    if (this.logger) this.logger.debug('🎬 Starting demoscene!');
                    this.showDemoscene();
                } else {
                    if (this.logger) this.logger.debug('❌ Demoscene conditions not met at timeout');
                }
            }, this.DEMOSCENE_IDLE_TIMEOUT);
        } else {
            if (this.logger) this.logger.debug('❌ Not starting demoscene timer - conditions not met');
            if (this.logger) this.logger.debug('  - currentScreen === "main-menu":', this.currentScreen === 'main-menu');
            if (this.logger) this.logger.debug('  - !demosceneActive:', !this.demosceneActive);
        }
}
    
CyberOpsGame.prototype.clearDemosceneTimer = function() {
        if (this.demosceneTimer) {
            clearTimeout(this.demosceneTimer);
            this.demosceneTimer = null;
        }
}
    
CyberOpsGame.prototype.showDemoscene = function() {
        if (this.currentScreen !== 'main-menu') return;

        if (this.logger) this.logger.debug('Starting demoscene attract mode');
        this.demosceneActive = true;

        // Use screen manager to navigate to demoscene
        if (window.screenManager) {
            window.screenManager.navigateTo('demoscene');
        } else {
            // Fallback - shouldn't happen since screen manager should exist
            this.currentScreen = 'demoscene';
            if (this.logger) this.logger.warn('Screen manager not available for demoscene');
        }
        
        // Add click handler to interrupt demoscene
        this.setupDemosceneInterrupt();
        
        // Add subtle animation delays for visual appeal
        this.animateDemosceneElements();
}
    
CyberOpsGame.prototype.setupDemosceneInterrupt = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameDemoscene') : null;
    }
        // Demoscene is now appended directly to body with id 'screen-demoscene'
        const demosceneScreen = document.getElementById('screen-demoscene');
        if (!demosceneScreen) return;

        const interruptHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            this.interruptDemoscene();
        };

        // Add listeners for any interaction
        demosceneScreen.addEventListener('click', interruptHandler, { once: true });
        demosceneScreen.addEventListener('touchstart', interruptHandler, { once: true });
        demosceneScreen.addEventListener('keydown', interruptHandler, { once: true });

        // Store handler for cleanup
        this.demosceneInterruptHandler = interruptHandler;
}
    
CyberOpsGame.prototype.interruptDemoscene = function() {
        if (!this.demosceneActive) return;

        if (this.logger) this.logger.debug('Demoscene interrupted, returning to main menu');
        this.demosceneActive = false;

        // Use screen manager to go back to main menu
        if (window.screenManager) {
            window.screenManager.navigateTo('main-menu');
        } else {
            // Fallback - shouldn't happen
            this.currentScreen = 'main-menu';
            if (this.logger) this.logger.warn('Screen manager not available for demoscene interrupt');

            // Restart idle timer
            this.startDemosceneIdleTimer();

            // Clean up interrupt handlers
            this.removeDemosceneInterruptHandlers();
        }
}
    
CyberOpsGame.prototype.removeDemosceneInterruptHandlers = function() {
        // Demoscene is now appended directly to body with id 'screen-demoscene'
        const demosceneScreen = document.getElementById('screen-demoscene');
        if (this.demosceneInterruptHandler && demosceneScreen) {
            demosceneScreen.removeEventListener('click', this.demosceneInterruptHandler);
            demosceneScreen.removeEventListener('touchstart', this.demosceneInterruptHandler);
            demosceneScreen.removeEventListener('keydown', this.demosceneInterruptHandler);
            this.demosceneInterruptHandler = null;
        }
}
    
CyberOpsGame.prototype.animateDemosceneElements = function() {
        // Add staggered animation delays to lore sections
        const loreSections = document.querySelectorAll('.lore-section');
        loreSections.forEach((section, index) => {
            section.style.animationDelay = `${index * 0.3}s`;
        });
        
        // Add staggered animation delays to features
        const featureItems = document.querySelectorAll('.feature-item');
        featureItems.forEach((item, index) => {
            item.style.animationDelay = `${0.5 + index * 0.2}s`;
        });
        
        // Animate stat bars with proper widths
        setTimeout(() => {
            const corporateFill = document.querySelector('.corporate-fill');
            const resistanceFill = document.querySelector('.resistance-fill');
            const syndicateFill = document.querySelector('.syndicate-fill');
            
            if (corporateFill) corporateFill.style.width = '87%';
            if (resistanceFill) resistanceFill.style.width = '13%';
            if (syndicateFill) syndicateFill.style.width = '7%';
        }, 1000);
}

    // User Activity Detection (for resetting demoscene timer)
CyberOpsGame.prototype.resetDemosceneTimer = function() {
        if (this.currentScreen === 'main-menu' && !this.demosceneActive) {
            // Clear existing timer if any
            if (this.demosceneTimer) {
                this.clearDemosceneTimer();
            }
            // Always create a new timer (silently, no logging to avoid spam)
            this.demosceneTimer = setTimeout(() => {
                if (this.logger) this.logger.debug('⏰ Demoscene timer fired! Checking conditions...');
                if (this.currentScreen === 'main-menu' && !this.demosceneActive) {
                    if (this.logger) this.logger.debug('🎬 Starting demoscene!');
                    this.showDemoscene();
                }
            }, this.DEMOSCENE_IDLE_TIMEOUT);
        }
}
    
