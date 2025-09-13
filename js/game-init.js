// Initialize game
console.log('🚀 Starting CyberOps Game initialization...');
const game = new CyberOpsGame();
console.log('📦 Game instance created');
game.init();
console.log('✅ Game initialized successfully');

// Prevent pull-to-refresh
document.body.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) return;
    if (document.documentElement.scrollTop === 0) {
        e.preventDefault();
    }
}, { passive: false });

// Handle orientation change
window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        game.setupCanvas();
        if (game.currentScreen === 'game') {
            game.centerCameraOnAgents();
        }
    }, 100);
});