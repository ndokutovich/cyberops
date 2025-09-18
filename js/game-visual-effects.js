// Visual Effects System - Uses declarative configuration
// Manages screen shake, freeze frames, particles, and other visual effects

CyberOpsGame.prototype.initVisualEffects = function() {
    console.log('🎨 Initializing visual effects system...');

    // Initialize effect state
    this.visualEffects = {
        screenShake: {
            active: false,
            intensity: 0,
            duration: 0,
            startTime: 0,
            offsetX: 0,
            offsetY: 0,
            falloff: 'linear'
        },
        freeze: {
            active: false,
            duration: 0,
            startTime: 0,
            priority: 0
        },
        screenFlash: {
            active: false,
            color: '',
            duration: 0,
            startTime: 0
        },
        slowMotion: {
            active: false,
            timescale: 1.0,
            duration: 0,
            startTime: 0
        },
        particles: []
    };

    // Load settings from localStorage
    this.screenShakeEnabled = localStorage.getItem('cyberops_screenshake') !== 'false';
    this.freezeEffectsEnabled = localStorage.getItem('cyberops_freeze') !== 'false';
    this.particlesEnabled = localStorage.getItem('cyberops_particles') !== 'false';

    console.log('✅ Visual effects system initialized');
};

// Trigger an effect from config
CyberOpsGame.prototype.triggerVisualEffect = function(effectType, effectName, source) {
    if (!GAME_EFFECTS_CONFIG || !GAME_EFFECTS_CONFIG[effectType]) {
        return;
    }

    const config = GAME_EFFECTS_CONFIG[effectType][effectName];
    if (!config) {
        return;
    }

    // Apply environmental modifiers if in mission
    let modifiers = { screenShakeMultiplier: 1, freezeDurationMultiplier: 1 };
    if (this.currentMission && this.currentMission.environment) {
        modifiers = getEnvironmentModifiers(this.currentMission.environment);
    }

    switch(effectType) {
        case 'screenShake':
            this.applyScreenShake(config, source, modifiers.screenShakeMultiplier);
            break;
        case 'freezeEffects':
            this.applyFreezeEffect(config, modifiers.freezeDurationMultiplier);
            break;
        case 'particles':
            this.spawnParticles(config, source);
            break;
        case 'screenFlash':
            this.applyScreenFlash(config);
            break;
    }
};

// Apply screen shake effect
CyberOpsGame.prototype.applyScreenShake = function(config, source, multiplier = 1) {
    if (!this.screenShakeEnabled || !GAME_EFFECTS_CONFIG.global.screenShakeEnabled) {
        return;
    }

    let intensity = config.intensity * multiplier;

    // Distance-based falloff if specified
    if (config.distanceBased && source && this.selectedAgent) {
        const distance = Math.sqrt(
            Math.pow(source.x - this.selectedAgent.x, 2) +
            Math.pow(source.y - this.selectedAgent.y, 2)
        );
        const maxDist = config.maxDistance || 20;
        if (distance > maxDist) return;
        intensity *= (1 - distance / maxDist);
    }

    // Clamp to max intensity
    intensity = Math.min(intensity, GAME_EFFECTS_CONFIG.global.maxScreenShakeIntensity);

    // Apply or update shake
    if (!this.visualEffects.screenShake.active || intensity > this.visualEffects.screenShake.intensity) {
        this.visualEffects.screenShake = {
            active: true,
            intensity: intensity,
            duration: config.duration,
            startTime: Date.now(),
            offsetX: 0,
            offsetY: 0,
            falloff: config.falloff || 'linear',
            continuous: config.continuous || false
        };
    }
};

// Apply freeze frame effect
CyberOpsGame.prototype.applyFreezeEffect = function(config, multiplier = 1) {
    if (!this.freezeEffectsEnabled || !GAME_EFFECTS_CONFIG.global.freezeEffectsEnabled) {
        return;
    }

    const duration = Math.min(
        config.duration * multiplier,
        GAME_EFFECTS_CONFIG.global.maxFreezeDuration
    );

    // Only apply if higher priority or not currently frozen
    if (!this.visualEffects.freeze.active || config.priority > this.visualEffects.freeze.priority) {
        this.visualEffects.freeze = {
            active: true,
            duration: duration,
            startTime: Date.now(),
            priority: config.priority || 1
        };
    }
};

// Apply screen flash effect
CyberOpsGame.prototype.applyScreenFlash = function(config) {
    this.visualEffects.screenFlash = {
        active: true,
        color: config.color,
        duration: config.duration,
        startTime: Date.now()
    };
};

// Spawn particle effects
CyberOpsGame.prototype.spawnParticles = function(config, position) {
    if (!this.particlesEnabled || !GAME_EFFECTS_CONFIG.global.particlesEnabled) {
        return;
    }

    for (let i = 0; i < config.count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = config.speed.min + Math.random() * (config.speed.max - config.speed.min);

        this.visualEffects.particles.push({
            x: position.x,
            y: position.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            lifetime: config.lifetime,
            color: config.color,
            gravity: config.gravity || 0,
            startTime: Date.now()
        });
    }

    // Limit particle count
    const maxParticles = 200;
    if (this.visualEffects.particles.length > maxParticles) {
        this.visualEffects.particles = this.visualEffects.particles.slice(-maxParticles);
    }
};

// Update visual effects
CyberOpsGame.prototype.updateVisualEffects = function(deltaTime) {
    if (!this.visualEffects) return;

    const now = Date.now();

    // Update screen shake
    if (this.visualEffects.screenShake.active) {
        const shake = this.visualEffects.screenShake;
        const elapsed = now - shake.startTime;

        if (!shake.continuous && elapsed > shake.duration) {
            shake.active = false;
            shake.offsetX = 0;
            shake.offsetY = 0;
        } else {
            const progress = shake.continuous ? 0 : elapsed / shake.duration;
            const falloffCurve = getFalloffCurve(shake.falloff);
            const currentIntensity = shake.intensity * falloffCurve(progress);

            shake.offsetX = (Math.random() - 0.5) * currentIntensity * 2;
            shake.offsetY = (Math.random() - 0.5) * currentIntensity * 2;
        }
    }

    // Update freeze effect
    if (this.visualEffects.freeze.active) {
        const freeze = this.visualEffects.freeze;
        if (now - freeze.startTime > freeze.duration) {
            freeze.active = false;
            freeze.priority = 0;
        }
    }

    // Update screen flash
    if (this.visualEffects.screenFlash.active) {
        const flash = this.visualEffects.screenFlash;
        if (now - flash.startTime > flash.duration) {
            flash.active = false;
        }
    }

    // Update particles
    this.visualEffects.particles = this.visualEffects.particles.filter(particle => {
        const elapsed = now - particle.startTime;
        if (elapsed > particle.lifetime) return false;

        // Update particle physics
        particle.vx *= 0.98; // Friction
        particle.vy *= 0.98;
        particle.vy += particle.gravity * deltaTime;
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;

        return true;
    });

    // Update slow motion
    if (this.visualEffects.slowMotion.active) {
        const slowMo = this.visualEffects.slowMotion;
        if (slowMo.duration > 0 && now - slowMo.startTime > slowMo.duration) {
            slowMo.active = false;
            slowMo.timescale = 1.0;
        }
    }
};

// Get current screen shake offset
CyberOpsGame.prototype.getScreenShakeOffset = function() {
    if (this.visualEffects && this.visualEffects.screenShake.active) {
        return {
            x: this.visualEffects.screenShake.offsetX,
            y: this.visualEffects.screenShake.offsetY
        };
    }
    return { x: 0, y: 0 };
};

// Check if freeze effect is active
CyberOpsGame.prototype.isFreezeActive = function() {
    return this.visualEffects && this.visualEffects.freeze.active;
};

// Get current time scale (for slow motion)
CyberOpsGame.prototype.getTimeScale = function() {
    if (this.visualEffects && this.visualEffects.slowMotion.active) {
        return this.visualEffects.slowMotion.timescale;
    }
    return 1.0;
};

// Render screen flash
CyberOpsGame.prototype.renderScreenFlash = function(ctx) {
    if (!this.visualEffects || !this.visualEffects.screenFlash.active) return;

    const flash = this.visualEffects.screenFlash;
    const elapsed = Date.now() - flash.startTime;
    const progress = elapsed / flash.duration;
    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = flash.color;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
};

// Render particles
CyberOpsGame.prototype.renderParticles = function(ctx) {
    if (!this.visualEffects || !this.visualEffects.particles.length) return;

    const now = Date.now();

    this.visualEffects.particles.forEach(particle => {
        const elapsed = now - particle.startTime;
        const progress = elapsed / particle.lifetime;
        const alpha = 1 - progress;

        const screenPos = this.worldToIsometric(particle.x, particle.y);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.fillRect(screenPos.x - 2, screenPos.y - 2, 4, 4);
        ctx.restore();
    });
};

// Trigger effect chain
CyberOpsGame.prototype.triggerEffectChain = function(chainName, source) {
    const chain = getEffectChain(chainName);
    if (!chain) return;

    chain.forEach(effect => {
        this.triggerVisualEffect(effect.type, effect.config, source);
    });
};

// Legacy compatibility functions
CyberOpsGame.prototype.addScreenShake = function(intensity, duration) {
    // Find closest matching config or use custom
    this.applyScreenShake({
        intensity: intensity,
        duration: duration,
        falloff: 'exponential'
    });
};

CyberOpsGame.prototype.triggerFreezeEffect = function(duration) {
    // Use custom freeze config
    this.applyFreezeEffect({
        duration: duration,
        priority: 1
    });
};