// Initialize game (wait for Three.js if needed)
const initLogger = window.Logger ? new window.Logger('GameInit') : null;
if (initLogger) initLogger.debug('🚀 Starting CyberOps Game initialization...');

// Create game instance and make it globally available
const game = new CyberOpsGame();
window.game = game; // Make game globally available for Three.js loader
if (initLogger) initLogger.debug('📦 Game instance created');

// Initialize declarative dialogs
if (game.initializeDeclarativeDialogs) {
    game.initializeDeclarativeDialogs();
    if (initLogger) initLogger.info('💬 Dialog system initialized');
}

// Initialize game
game.init();
if (initLogger) initLogger.info('✅ Game initialized successfully');

// Check for Three.js after a delay (modules load asynchronously)
setTimeout(() => {
    if (window.THREE && !game.scene3D) {
        if (initLogger) initLogger.debug('🎮 Three.js now available, initializing 3D system...');
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