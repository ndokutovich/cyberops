/**
 * AnimationService - Centralized animation management for all visual animations
 * Handles sprite animations, transitions, interpolations, and timing
 */
class AnimationService {
    constructor() {
        // Animation collections
        this.animations = new Map(); // Active animations by ID
        this.spriteAnimations = new Map(); // Sprite sheet definitions
        this.transitions = new Map(); // Active transitions

        // Animation state
        this.nextId = 1;
        this.lastUpdateTime = 0;

        // Configuration
        this.config = {
            defaultFPS: 60,
            defaultDuration: 1000,
            defaultEasing: 'linear',
            maxAnimations: 100
        };

        // Predefined easing functions
        this.easingFunctions = {
            linear: t => t,
            easeIn: t => t * t,
            easeOut: t => t * (2 - t),
            easeInOut: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            elastic: t => {
                const p = 0.3;
                if (t === 0) return 0;
                if (t === 1) return 1;
                return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
            },
            bounce: t => {
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    t -= 1.5 / 2.75;
                    return 7.5625 * t * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    t -= 2.25 / 2.75;
                    return 7.5625 * t * t + 0.9375;
                } else {
                    t -= 2.625 / 2.75;
                    return 7.5625 * t * t + 0.984375;
                }
            }
        };

        // Animation types
        this.AnimationType = {
            SPRITE: 'sprite',
            TRANSITION: 'transition',
            SEQUENCE: 'sequence',
            PARALLEL: 'parallel',
            LOOP: 'loop'
        };

        // Common sprite animations
        this.initializeSpriteAnimations();

        // Statistics
        this.stats = {
            totalCreated: 0,
            totalCompleted: 0,
            activeAnimations: 0
        };

        // Event listeners
        this.listeners = new Map();

        console.log('🎬 AnimationService initialized');
    }

    /**
     * Initialize common sprite animation definitions
     */
    initializeSpriteAnimations() {
        // Agent animations
        this.defineSpriteAnimation('agent-idle', {
            frames: 4,
            frameRate: 8,
            loop: true
        });

        this.defineSpriteAnimation('agent-walk', {
            frames: 8,
            frameRate: 12,
            loop: true
        });

        this.defineSpriteAnimation('agent-attack', {
            frames: 6,
            frameRate: 15,
            loop: false
        });

        this.defineSpriteAnimation('agent-death', {
            frames: 8,
            frameRate: 10,
            loop: false
        });

        // Enemy animations
        this.defineSpriteAnimation('enemy-idle', {
            frames: 4,
            frameRate: 6,
            loop: true
        });

        this.defineSpriteAnimation('enemy-patrol', {
            frames: 8,
            frameRate: 10,
            loop: true
        });

        this.defineSpriteAnimation('enemy-alert', {
            frames: 2,
            frameRate: 4,
            loop: true
        });

        // Effect animations
        this.defineSpriteAnimation('explosion', {
            frames: 12,
            frameRate: 30,
            loop: false
        });

        this.defineSpriteAnimation('muzzle-flash', {
            frames: 3,
            frameRate: 30,
            loop: false
        });

        this.defineSpriteAnimation('smoke', {
            frames: 8,
            frameRate: 15,
            loop: false
        });

        // UI animations
        this.defineSpriteAnimation('loading', {
            frames: 8,
            frameRate: 10,
            loop: true
        });

        this.defineSpriteAnimation('pulse', {
            frames: 2,
            frameRate: 2,
            loop: true
        });
    }

    /**
     * Define a sprite animation
     */
    defineSpriteAnimation(name, config) {
        this.spriteAnimations.set(name, {
            name,
            frames: config.frames || 1,
            frameRate: config.frameRate || 10,
            loop: config.loop !== undefined ? config.loop : false,
            spriteWidth: config.spriteWidth || 64,
            spriteHeight: config.spriteHeight || 64,
            offsetX: config.offsetX || 0,
            offsetY: config.offsetY || 0
        });
    }

    /**
     * Create a sprite animation
     */
    createSpriteAnimation(target, animationName, options = {}) {
        const definition = this.spriteAnimations.get(animationName);
        if (!definition) {
            console.warn(`Animation definition not found: ${animationName}`);
            return null;
        }

        const id = this.generateId();
        const animation = {
            id,
            type: this.AnimationType.SPRITE,
            target,
            definition,
            currentFrame: 0,
            frameTime: 0,
            frameDuration: 1000 / definition.frameRate,
            loop: options.loop !== undefined ? options.loop : definition.loop,
            onComplete: options.onComplete,
            paused: false,
            finished: false
        };

        this.animations.set(id, animation);
        this.stats.totalCreated++;

        return id;
    }

    /**
     * Create a property transition animation
     */
    createTransition(target, property, from, to, duration, options = {}) {
        if (this.animations.size >= this.config.maxAnimations) {
            this.removeOldestAnimation();
        }

        const id = this.generateId();
        const animation = {
            id,
            type: this.AnimationType.TRANSITION,
            target,
            property,
            from,
            to,
            duration: duration || this.config.defaultDuration,
            elapsed: 0,
            easing: this.easingFunctions[options.easing] || this.easingFunctions.linear,
            onComplete: options.onComplete,
            onUpdate: options.onUpdate,
            paused: false,
            finished: false
        };

        this.animations.set(id, animation);
        this.stats.totalCreated++;

        return id;
    }

    /**
     * Create a sequence of animations
     */
    createSequence(animations, options = {}) {
        const id = this.generateId();
        const sequence = {
            id,
            type: this.AnimationType.SEQUENCE,
            animations: animations.map(anim => ({
                ...anim,
                started: false,
                finished: false
            })),
            currentIndex: 0,
            onComplete: options.onComplete,
            paused: false,
            finished: false
        };

        this.animations.set(id, sequence);
        this.stats.totalCreated++;

        return id;
    }

    /**
     * Create parallel animations
     */
    createParallel(animations, options = {}) {
        const id = this.generateId();
        const parallel = {
            id,
            type: this.AnimationType.PARALLEL,
            animations: animations.map(anim => ({
                ...anim,
                animationId: null
            })),
            onComplete: options.onComplete,
            paused: false,
            finished: false
        };

        // Start all animations
        parallel.animations.forEach(anim => {
            if (anim.type === 'transition') {
                anim.animationId = this.createTransition(
                    anim.target,
                    anim.property,
                    anim.from,
                    anim.to,
                    anim.duration,
                    anim.options
                );
            } else if (anim.type === 'sprite') {
                anim.animationId = this.createSpriteAnimation(
                    anim.target,
                    anim.animation,
                    anim.options
                );
            }
        });

        this.animations.set(id, parallel);
        this.stats.totalCreated++;

        return id;
    }

    /**
     * Create common animations
     */
    fadeIn(target, duration = 1000, options = {}) {
        return this.createTransition(target, 'opacity', 0, 1, duration, {
            ...options,
            easing: options.easing || 'easeOut'
        });
    }

    fadeOut(target, duration = 1000, options = {}) {
        return this.createTransition(target, 'opacity', 1, 0, duration, {
            ...options,
            easing: options.easing || 'easeIn'
        });
    }

    moveTo(target, fromX, fromY, toX, toY, duration = 1000, options = {}) {
        return this.createParallel([
            {
                type: 'transition',
                target,
                property: 'x',
                from: fromX,
                to: toX,
                duration,
                options
            },
            {
                type: 'transition',
                target,
                property: 'y',
                from: fromY,
                to: toY,
                duration,
                options
            }
        ], options);
    }

    scale(target, fromScale, toScale, duration = 500, options = {}) {
        return this.createTransition(target, 'scale', fromScale, toScale, duration, {
            ...options,
            easing: options.easing || 'easeInOut'
        });
    }

    rotate(target, fromAngle, toAngle, duration = 500, options = {}) {
        return this.createTransition(target, 'rotation', fromAngle, toAngle, duration, {
            ...options,
            easing: options.easing || 'linear'
        });
    }

    shake(target, intensity = 5, duration = 500) {
        const originalX = target.x;
        const originalY = target.y;
        const shakeSteps = [];
        const steps = 10;

        for (let i = 0; i < steps; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = intensity * (1 - i / steps); // Decay
            shakeSteps.push({
                type: 'transition',
                target,
                property: 'x',
                from: originalX,
                to: originalX + Math.cos(angle) * distance,
                duration: duration / steps
            });
            shakeSteps.push({
                type: 'transition',
                target,
                property: 'y',
                from: originalY,
                to: originalY + Math.sin(angle) * distance,
                duration: duration / steps
            });
        }

        // Return to original position
        shakeSteps.push({
            type: 'transition',
            target,
            property: 'x',
            from: target.x,
            to: originalX,
            duration: 100
        });
        shakeSteps.push({
            type: 'transition',
            target,
            property: 'y',
            from: target.y,
            to: originalY,
            duration: 100
        });

        return this.createSequence(shakeSteps);
    }

    /**
     * Create a floating text animation
     */
    createFloatingText(x, y, text, options = {}) {
        const textObject = {
            x,
            y,
            text,
            opacity: 1,
            scale: 1,
            color: options.color || '#ffffff',
            font: options.font || '16px monospace'
        };

        const id = this.createParallel([
            {
                type: 'transition',
                target: textObject,
                property: 'y',
                from: y,
                to: y - (options.distance || 50),
                duration: options.duration || 1500,
                options: { easing: 'easeOut' }
            },
            {
                type: 'transition',
                target: textObject,
                property: 'opacity',
                from: 1,
                to: 0,
                duration: options.duration || 1500,
                options: { easing: 'easeIn' }
            }
        ], {
            onComplete: () => {
                if (options.onComplete) options.onComplete();
            }
        });

        // Store text object for rendering
        const animation = this.animations.get(id);
        animation.textObject = textObject;

        return id;
    }

    /**
     * Update all animations
     */
    update(deltaTime) {
        const dt = deltaTime || 16; // Default to 60fps

        // Update all animations
        for (const [id, animation] of this.animations) {
            if (animation.paused || animation.finished) continue;

            switch (animation.type) {
                case this.AnimationType.SPRITE:
                    this.updateSpriteAnimation(animation, dt);
                    break;
                case this.AnimationType.TRANSITION:
                    this.updateTransition(animation, dt);
                    break;
                case this.AnimationType.SEQUENCE:
                    this.updateSequence(animation, dt);
                    break;
                case this.AnimationType.PARALLEL:
                    this.updateParallel(animation, dt);
                    break;
            }

            // Check if finished
            if (animation.finished) {
                if (animation.onComplete) {
                    animation.onComplete();
                }
                this.animations.delete(id);
                this.stats.totalCompleted++;
                this.emit('animationComplete', { id, animation });
            }
        }

        // Update stats
        this.stats.activeAnimations = this.animations.size;
    }

    /**
     * Update sprite animation
     */
    updateSpriteAnimation(animation, deltaTime) {
        animation.frameTime += deltaTime;

        if (animation.frameTime >= animation.frameDuration) {
            animation.frameTime = 0;
            animation.currentFrame++;

            if (animation.currentFrame >= animation.definition.frames) {
                if (animation.loop) {
                    animation.currentFrame = 0;
                } else {
                    animation.finished = true;
                }
            }

            // Update target's animation frame if it has one
            if (animation.target && animation.target.animationFrame !== undefined) {
                animation.target.animationFrame = animation.currentFrame;
            }
        }
    }

    /**
     * Update transition animation
     */
    updateTransition(animation, deltaTime) {
        animation.elapsed += deltaTime;
        const progress = Math.min(animation.elapsed / animation.duration, 1);
        const easedProgress = animation.easing(progress);

        // Interpolate value
        const value = animation.from + (animation.to - animation.from) * easedProgress;

        // Apply to target
        if (animation.target && animation.property) {
            animation.target[animation.property] = value;
        }

        // Call update callback
        if (animation.onUpdate) {
            animation.onUpdate(value, progress);
        }

        // Check completion
        if (progress >= 1) {
            animation.finished = true;
        }
    }

    /**
     * Update sequence animation
     */
    updateSequence(animation, deltaTime) {
        if (animation.currentIndex >= animation.animations.length) {
            animation.finished = true;
            return;
        }

        const current = animation.animations[animation.currentIndex];

        // Start animation if needed
        if (!current.started) {
            current.started = true;
            if (current.type === 'transition') {
                current.animationId = this.createTransition(
                    current.target,
                    current.property,
                    current.from,
                    current.to,
                    current.duration,
                    current.options
                );
            } else if (current.type === 'sprite') {
                current.animationId = this.createSpriteAnimation(
                    current.target,
                    current.animation,
                    current.options
                );
            }
        }

        // Check if current animation is finished
        if (current.animationId) {
            const anim = this.animations.get(current.animationId);
            if (!anim || anim.finished) {
                animation.currentIndex++;
            }
        }
    }

    /**
     * Update parallel animation
     */
    updateParallel(animation, deltaTime) {
        let allFinished = true;

        for (const anim of animation.animations) {
            if (anim.animationId) {
                const subAnimation = this.animations.get(anim.animationId);
                if (subAnimation && !subAnimation.finished) {
                    allFinished = false;
                }
            }
        }

        if (allFinished) {
            animation.finished = true;
        }
    }

    /**
     * Get animation by ID
     */
    getAnimation(id) {
        return this.animations.get(id);
    }

    /**
     * Pause animation
     */
    pause(id) {
        const animation = this.animations.get(id);
        if (animation) {
            animation.paused = true;
        }
    }

    /**
     * Resume animation
     */
    resume(id) {
        const animation = this.animations.get(id);
        if (animation) {
            animation.paused = false;
        }
    }

    /**
     * Stop animation
     */
    stop(id, complete = false) {
        const animation = this.animations.get(id);
        if (animation) {
            if (complete && animation.onComplete) {
                animation.onComplete();
            }
            this.animations.delete(id);
        }
    }

    /**
     * Stop all animations for a target
     */
    stopAllForTarget(target) {
        for (const [id, animation] of this.animations) {
            if (animation.target === target) {
                this.stop(id);
            }
        }
    }

    /**
     * Clear all animations
     */
    clearAll() {
        this.animations.clear();
        this.stats.activeAnimations = 0;
    }

    /**
     * Get render data for animations
     */
    getRenderData() {
        const renderData = {
            sprites: [],
            floatingTexts: [],
            debug: []
        };

        for (const animation of this.animations.values()) {
            if (animation.type === this.AnimationType.SPRITE && animation.target) {
                renderData.sprites.push({
                    target: animation.target,
                    animation: animation.definition.name,
                    frame: animation.currentFrame,
                    definition: animation.definition
                });
            } else if (animation.textObject) {
                renderData.floatingTexts.push(animation.textObject);
            }
        }

        return renderData;
    }

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `anim_${this.nextId++}`;
    }

    /**
     * Remove oldest animation
     */
    removeOldestAnimation() {
        const oldest = this.animations.keys().next().value;
        if (oldest) {
            this.stop(oldest);
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        return {
            ...this.stats,
            definitions: this.spriteAnimations.size
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.AnimationService = AnimationService;
}