/**
 * EffectsService - Centralized visual effects management
 * Handles particles, screen effects, and animations
 */
class EffectsService {
    constructor() {
        // Effect collections
        this.effects = [];
        this.particles = [];
        this.textEffects = [];
        this.screenEffects = [];

        // Effect pools for performance
        this.effectPool = [];
        this.particlePool = [];
        this.poolSize = 100;

        // Screen shake state
        this.screenShake = {
            active: false,
            intensity: 0,
            duration: 0,
            startTime: 0,
            offset: { x: 0, y: 0 }
        };

        // Screen flash state
        this.screenFlash = {
            active: false,
            color: 'white',
            alpha: 0,
            duration: 0,
            startTime: 0
        };

        // Configuration
        this.config = {
            maxEffects: 200,
            maxParticles: 500,
            enableParticles: true,
            enableScreenShake: true,
            enableScreenFlash: true,
            particleGravity: 0.2,
            particleFriction: 0.98
        };

        // Performance tracking
        this.stats = {
            activeEffects: 0,
            activeParticles: 0,
            totalCreated: 0,
            totalDestroyed: 0
        };

        // Event listeners
        this.listeners = {
            effectCreate: [],
            effectDestroy: [],
            shakeStart: [],
            shakeEnd: [],
            flashStart: [],
            flashEnd: [],
            any: []
        };
    }

    /**
     * Initialize effect pools
     */
    initialize() {
        // Pre-create pooled objects for performance
        for (let i = 0; i < this.poolSize; i++) {
            this.effectPool.push(this.createPooledEffect());
            this.particlePool.push(this.createPooledParticle());
        }

        console.log('✨ EffectsService initialized');
    }

    /**
     * Create pooled effect object
     */
    createPooledEffect() {
        return {
            active: false,
            type: null,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            lifetime: 0,
            maxLifetime: 0,
            scale: 1,
            alpha: 1,
            rotation: 0,
            color: 'white',
            data: {}
        };
    }

    /**
     * Create pooled particle object
     */
    createPooledParticle() {
        return {
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            lifetime: 0,
            maxLifetime: 0,
            size: 1,
            alpha: 1,
            color: 'white',
            gravity: true,
            friction: true
        };
    }

    /**
     * Create a visual effect
     */
    createEffect(type, x, y, options = {}) {
        if (!this.config.enableParticles && type === 'particle') return null;
        if (this.effects.length >= this.config.maxEffects) {
            this.removeOldestEffect();
        }

        // Get from pool or create new
        let effect = this.effectPool.find(e => !e.active);
        if (!effect) {
            effect = this.createPooledEffect();
        }

        // Configure effect based on type
        effect.active = true;
        effect.type = type;
        effect.x = x;
        effect.y = y;
        effect.lifetime = 0;

        switch (type) {
            case 'explosion':
                effect.maxLifetime = options.duration || 500;
                effect.scale = options.scale || 1;
                effect.color = options.color || '#ff6600';
                this.createExplosionParticles(x, y, options);
                break;

            case 'hit':
                effect.maxLifetime = options.duration || 200;
                effect.scale = options.scale || 0.5;
                effect.color = options.color || '#ff0000';
                this.createHitParticles(x, y, options);
                break;

            case 'muzzleFlash':
                effect.maxLifetime = options.duration || 100;
                effect.scale = options.scale || 0.3;
                effect.color = options.color || '#ffff00';
                effect.rotation = options.rotation || 0;
                break;

            case 'smoke':
                effect.maxLifetime = options.duration || 2000;
                effect.scale = options.scale || 1;
                effect.color = options.color || '#666666';
                effect.vx = options.vx || (Math.random() - 0.5) * 2;
                effect.vy = options.vy || -Math.random() * 2;
                break;

            case 'heal':
                effect.maxLifetime = options.duration || 1000;
                effect.scale = options.scale || 1;
                effect.color = options.color || '#00ff00';
                this.createHealParticles(x, y, options);
                break;

            case 'shield':
                effect.maxLifetime = options.duration || 1500;
                effect.scale = options.scale || 1.5;
                effect.color = options.color || '#0099ff';
                effect.rotation = 0;
                break;

            case 'text':
                effect.maxLifetime = options.duration || 1500;
                effect.text = options.text || '';
                effect.color = options.color || '#ffffff';
                effect.fontSize = options.fontSize || 20;
                effect.vy = options.vy || -2;
                break;

            default:
                effect.maxLifetime = options.duration || 1000;
                Object.assign(effect, options);
        }

        // Add to active effects
        this.effects.push(effect);
        this.stats.totalCreated++;
        this.stats.activeEffects = this.effects.filter(e => e.active).length;

        // Notify listeners
        this.notifyListeners('effectCreate', { type, x, y, options });

        return effect;
    }

    /**
     * Create explosion particles
     */
    createExplosionParticles(x, y, options = {}) {
        const particleCount = options.particleCount || 20;
        const speed = options.speed || 5;
        const colors = options.colors || ['#ff0000', '#ff6600', '#ffff00'];

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const velocity = speed * (0.5 + Math.random() * 0.5);

            this.createParticle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                lifetime: 500 + Math.random() * 500,
                size: 2 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: true
            });
        }
    }

    /**
     * Create hit particles
     */
    createHitParticles(x, y, options = {}) {
        const particleCount = options.particleCount || 5;
        const speed = options.speed || 3;

        for (let i = 0; i < particleCount; i++) {
            this.createParticle(x, y, {
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                lifetime: 300 + Math.random() * 200,
                size: 1 + Math.random() * 2,
                color: options.color || '#ff0000',
                gravity: false
            });
        }
    }

    /**
     * Create heal particles
     */
    createHealParticles(x, y, options = {}) {
        const particleCount = options.particleCount || 10;

        for (let i = 0; i < particleCount; i++) {
            this.createParticle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: -Math.random() * 3 - 1,
                lifetime: 1000 + Math.random() * 500,
                size: 2 + Math.random() * 2,
                color: '#00ff00',
                gravity: false
            });
        }
    }

    /**
     * Create a particle
     */
    createParticle(x, y, options = {}) {
        if (!this.config.enableParticles) return null;
        if (this.particles.length >= this.config.maxParticles) {
            this.removeOldestParticle();
        }

        // Get from pool or create new
        let particle = this.particlePool.find(p => !p.active);
        if (!particle) {
            particle = this.createPooledParticle();
        }

        // Configure particle
        particle.active = true;
        particle.x = x;
        particle.y = y;
        particle.vx = options.vx || 0;
        particle.vy = options.vy || 0;
        particle.lifetime = 0;
        particle.maxLifetime = options.lifetime || 1000;
        particle.size = options.size || 2;
        particle.alpha = options.alpha || 1;
        particle.color = options.color || 'white';
        particle.gravity = options.gravity !== false;
        particle.friction = options.friction !== false;

        // Add to active particles
        this.particles.push(particle);
        this.stats.activeParticles = this.particles.filter(p => p.active).length;

        return particle;
    }

    /**
     * Screen shake effect
     */
    shakeScreen(intensity = 10, duration = 500) {
        if (!this.config.enableScreenShake) return;

        this.screenShake = {
            active: true,
            intensity,
            duration,
            startTime: Date.now(),
            offset: { x: 0, y: 0 }
        };

        // Notify listeners
        this.notifyListeners('shakeStart', { intensity, duration });

        console.log(`📳 Screen shake: intensity ${intensity} for ${duration}ms`);
    }

    /**
     * Screen flash effect
     */
    flashScreen(color = 'white', duration = 200, maxAlpha = 0.5) {
        if (!this.config.enableScreenFlash) return;

        this.screenFlash = {
            active: true,
            color,
            alpha: maxAlpha,
            maxAlpha,
            duration,
            startTime: Date.now()
        };

        // Notify listeners
        this.notifyListeners('flashStart', { color, duration, maxAlpha });

        console.log(`⚡ Screen flash: ${color} for ${duration}ms`);
    }

    /**
     * Update all effects
     */
    update(deltaTime) {
        // Update effects
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            if (!effect.active) continue;

            effect.lifetime += deltaTime;

            // Update position
            effect.x += effect.vx * deltaTime;
            effect.y += effect.vy * deltaTime;

            // Update alpha
            const progress = effect.lifetime / effect.maxLifetime;
            effect.alpha = 1 - progress;

            // Check if expired
            if (effect.lifetime >= effect.maxLifetime) {
                effect.active = false;
                this.effects.splice(i, 1);
                this.stats.totalDestroyed++;
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            if (!particle.active) continue;

            particle.lifetime += deltaTime;

            // Apply physics
            if (particle.gravity) {
                particle.vy += this.config.particleGravity;
            }
            if (particle.friction) {
                particle.vx *= this.config.particleFriction;
                particle.vy *= this.config.particleFriction;
            }

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Update alpha
            const progress = particle.lifetime / particle.maxLifetime;
            particle.alpha = (1 - progress) * 0.8;

            // Check if expired
            if (particle.lifetime >= particle.maxLifetime) {
                particle.active = false;
                this.particles.splice(i, 1);
            }
        }

        // Update screen shake
        if (this.screenShake.active) {
            const elapsed = Date.now() - this.screenShake.startTime;
            const progress = elapsed / this.screenShake.duration;

            if (progress >= 1) {
                this.screenShake.active = false;
                this.screenShake.offset = { x: 0, y: 0 };
                this.notifyListeners('shakeEnd', {});
            } else {
                const decay = 1 - progress;
                const intensity = this.screenShake.intensity * decay;
                this.screenShake.offset = {
                    x: (Math.random() - 0.5) * intensity * 2,
                    y: (Math.random() - 0.5) * intensity * 2
                };
            }
        }

        // Update screen flash
        if (this.screenFlash.active) {
            const elapsed = Date.now() - this.screenFlash.startTime;
            const progress = elapsed / this.screenFlash.duration;

            if (progress >= 1) {
                this.screenFlash.active = false;
                this.screenFlash.alpha = 0;
                this.notifyListeners('flashEnd', {});
            } else {
                this.screenFlash.alpha = this.screenFlash.maxAlpha * (1 - progress);
            }
        }

        // Update stats
        this.stats.activeEffects = this.effects.length;
        this.stats.activeParticles = this.particles.length;
    }

    /**
     * Render effects (returns render data for game to draw)
     */
    getRenderData() {
        return {
            effects: this.effects.filter(e => e.active),
            particles: this.particles.filter(p => p.active),
            screenShake: this.screenShake.active ? this.screenShake.offset : null,
            screenFlash: this.screenFlash.active ? {
                color: this.screenFlash.color,
                alpha: this.screenFlash.alpha
            } : null
        };
    }

    /**
     * Clear all effects
     */
    clearAll() {
        // Deactivate all effects
        this.effects.forEach(e => e.active = false);
        this.particles.forEach(p => p.active = false);

        // Clear arrays
        this.effects = [];
        this.particles = [];
        this.textEffects = [];
        this.screenEffects = [];

        // Reset screen effects
        this.screenShake.active = false;
        this.screenFlash.active = false;

        // Reset stats
        this.stats.activeEffects = 0;
        this.stats.activeParticles = 0;

        console.log('🧹 All effects cleared');
    }

    /**
     * Remove oldest effect
     */
    removeOldestEffect() {
        if (this.effects.length > 0) {
            const oldest = this.effects.shift();
            oldest.active = false;
        }
    }

    /**
     * Remove oldest particle
     */
    removeOldestParticle() {
        if (this.particles.length > 0) {
            const oldest = this.particles.shift();
            oldest.active = false;
        }
    }

    /**
     * Create damage number
     */
    createDamageNumber(x, y, damage, color = null) {
        const dmgColor = color || (damage < 0 ? '#00ff00' : '#ff0000');
        const text = damage < 0 ? `+${Math.abs(damage)}` : damage.toString();

        return this.createEffect('text', x, y, {
            text,
            color: dmgColor,
            fontSize: 16 + Math.min(damage / 10, 10),
            vy: -3,
            duration: 1200
        });
    }

    /**
     * Create status text
     */
    createStatusText(x, y, text, color = '#ffff00') {
        return this.createEffect('text', x, y, {
            text,
            color,
            fontSize: 14,
            vy: -2,
            duration: 1500
        });
    }

    /**
     * Configure service
     */
    setConfig(key, value) {
        if (this.config.hasOwnProperty(key)) {
            this.config[key] = value;
            console.log(`⚙️ EffectsService config: ${key} = ${value}`);
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            ...this.stats,
            pooledEffects: this.effectPool.length,
            pooledParticles: this.particlePool.length,
            config: { ...this.config }
        };
    }

    /**
     * Add event listener
     */
    addListener(eventType, callback) {
        if (this.listeners[eventType]) {
            this.listeners[eventType].push(callback);
        } else if (eventType === 'any' || eventType === '*') {
            this.listeners.any.push(callback);
        }
    }

    /**
     * Remove event listener
     */
    removeListener(eventType, callback) {
        const list = eventType === 'any' || eventType === '*'
            ? this.listeners.any
            : this.listeners[eventType];

        if (list) {
            const index = list.indexOf(callback);
            if (index > -1) list.splice(index, 1);
        }
    }

    /**
     * Notify listeners
     */
    notifyListeners(eventType, data) {
        // Specific listeners
        if (this.listeners[eventType]) {
            this.listeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error in effects listener (${eventType}):`, e);
                }
            });
        }

        // Global listeners
        this.listeners.any.forEach(callback => {
            try {
                callback({ type: eventType, ...data });
            } catch (e) {
                console.error('Error in global effects listener:', e);
            }
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EffectsService;
}