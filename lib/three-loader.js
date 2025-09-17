// Three.js r180 Module Loader - converts ES module to global
// This loads Three.js as a module and exposes it globally

import * as THREE from './three.module.min.js';

// Expose THREE globally
window.THREE = THREE;

console.log('✅ Three.js r180 loaded!', 'Version:', THREE.REVISION);
console.log('✅ CapsuleGeometry available:', !!THREE.CapsuleGeometry);

// If game already exists and doesn't have 3D initialized, init it now
if (window.game && !window.game.scene3D) {
    console.log('🎮 Game exists, initializing 3D system now...');
    window.game.init3D();
}