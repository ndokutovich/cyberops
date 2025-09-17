// Initialize game (wait for Three.js if needed)
console.log('🚀 Starting CyberOps Game initialization...');

// Create game instance and make it globally available
const game = new CyberOpsGame();
window.game = game; // Make game globally available for Three.js loader
console.log('📦 Game instance created');

// Initialize game
game.init();
console.log('✅ Game initialized successfully');

// Check for Three.js after a delay (modules load asynchronously)
setTimeout(() => {
    if (window.THREE && !game.scene3D) {
        console.log('🎮 Three.js now available, initializing 3D system...');
        game.init3D();
    }
}, 100);

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