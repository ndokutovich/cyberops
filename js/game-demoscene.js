    // Demoscene Attract Mode System
CyberOpsGame.prototype.startDemosceneIdleTimer = function() {
        console.log('🎬 startDemosceneIdleTimer() called:');
        console.log('- currentScreen:', this.currentScreen);
        console.log('- demosceneActive:', this.demosceneActive);
        console.log('- DEMOSCENE_IDLE_TIMEOUT:', this.DEMOSCENE_IDLE_TIMEOUT);
        
        // Clear existing timer
        this.clearDemosceneTimer();
        
        if (this.currentScreen === 'menu' && !this.demosceneActive) {
            console.log('✅ Starting demoscene idle timer (' + this.DEMOSCENE_IDLE_TIMEOUT + ' ms)');
            this.demosceneTimer = setTimeout(() => {
                console.log('⏰ Demoscene timer fired! Checking conditions...');
                console.log('- currentScreen at timeout:', this.currentScreen);
                console.log('- demosceneActive at timeout:', this.demosceneActive);
                if (this.currentScreen === 'menu' && !this.demosceneActive) {
                    console.log('🎬 Starting demoscene!');
                    this.showDemoscene();
                } else {
                    console.log('❌ Demoscene conditions not met at timeout');
                }
            }, this.DEMOSCENE_IDLE_TIMEOUT);
        } else {
            console.log('❌ Not starting demoscene timer - conditions not met');
            console.log('  - currentScreen === "menu":', this.currentScreen === 'menu');
            console.log('  - !demosceneActive:', !this.demosceneActive);
        }
}
    
CyberOpsGame.prototype.clearDemosceneTimer = function() {
        if (this.demosceneTimer) {
            clearTimeout(this.demosceneTimer);
            this.demosceneTimer = null;
        }
}
    
CyberOpsGame.prototype.showDemoscene = function() {
        if (this.currentScreen !== 'menu') return;
        
        console.log('Starting demoscene attract mode');
        this.demosceneActive = true;
        this.currentScreen = 'demoscene';
        
        // Hide main menu
        document.getElementById('mainMenu').style.display = 'none';
        
        // Show demoscene
        const demosceneScreen = document.getElementById('demoscene');
        demosceneScreen.style.display = 'flex';
        
        // Add click handler to interrupt demoscene
        this.setupDemosceneInterrupt();
        
        // Add subtle animation delays for visual appeal
        this.animateDemosceneElements();
}
    
CyberOpsGame.prototype.setupDemosceneInterrupt = function() {
        const demosceneScreen = document.getElementById('demoscene');
        
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
        
        console.log('Demoscene interrupted, returning to main menu');
        this.demosceneActive = false;
        this.currentScreen = 'menu';
        
        // Hide demoscene
        document.getElementById('demoscene').style.display = 'none';
        
        // Show main menu
        const mainMenu = document.getElementById('mainMenu');
        mainMenu.style.display = 'flex';
        
        // Restart idle timer
        this.startDemosceneIdleTimer();
        
        // Clean up interrupt handlers
        this.removeDemosceneInterruptHandlers();
}
    
CyberOpsGame.prototype.removeDemosceneInterruptHandlers = function() {
        const demosceneScreen = document.getElementById('demoscene');
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
        if (this.currentScreen === 'menu' && !this.demosceneActive) {
            this.startDemosceneIdleTimer();
        }
}
    
