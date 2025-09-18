// Declarative Visual Effects Configuration System
// Central configuration for all visual effects

const GAME_EFFECTS_CONFIG = {
    // Global settings
    global: {
        screenShakeEnabled: true,
        freezeEffectsEnabled: true,
        particlesEnabled: true,
        maxScreenShakeIntensity: 20,
        maxFreezeDuration: 2000
    },

    // Screen shake effects
    screenShake: {
        // Combat effects
        shoot: {
            intensity: 2,
            duration: 100,
            falloff: 'exponential',
            trigger: 'agent_shoot'
        },
        explosion: {
            intensity: 10,
            duration: 500,
            falloff: 'exponential',
            trigger: 'explosion',
            distanceBased: true,
            maxDistance: 15
        },
        hit: {
            intensity: 3,
            duration: 200,
            falloff: 'linear',
            trigger: 'agent_hit'
        },
        heavyHit: {
            intensity: 5,
            duration: 300,
            falloff: 'exponential',
            trigger: 'agent_critical_hit'
        },

        // Environmental effects
        doorBreach: {
            intensity: 4,
            duration: 250,
            falloff: 'exponential',
            trigger: 'gate_breach'
        },
        alarmTriggered: {
            intensity: 1,
            duration: 1000,
            falloff: 'sine',
            trigger: 'alarm_active',
            continuous: true
        },

        // Ability effects
        overload: {
            intensity: 6,
            duration: 400,
            falloff: 'exponential',
            trigger: 'ability_overload'
        },
        dash: {
            intensity: 2,
            duration: 150,
            falloff: 'linear',
            trigger: 'ability_dash'
        }
    },

    // Freeze frame effects
    freezeEffects: {
        // Combat freezes
        shoot: {
            duration: 50,
            trigger: 'agent_shoot',
            priority: 1
        },
        explosion: {
            duration: 150,
            trigger: 'explosion',
            priority: 3
        },
        kill: {
            duration: 100,
            trigger: 'enemy_killed',
            priority: 2,
            condition: 'isHeadshot'
        },

        // Dramatic moments
        missionComplete: {
            duration: 1000,
            trigger: 'mission_complete',
            priority: 10
        },
        agentDeath: {
            duration: 500,
            trigger: 'agent_death',
            priority: 5
        },
        bossDefeat: {
            duration: 2000,
            trigger: 'boss_defeated',
            priority: 10
        },

        // Ability freezes
        criticalHit: {
            duration: 75,
            trigger: 'critical_hit',
            priority: 2
        },
        shieldBreak: {
            duration: 100,
            trigger: 'shield_break',
            priority: 3
        }
    },

    // Particle effects
    particles: {
        // Blood/damage
        blood: {
            count: 10,
            lifetime: 1000,
            color: '#ff0000',
            speed: { min: 50, max: 150 },
            gravity: 0.5,
            trigger: 'enemy_hit'
        },
        sparks: {
            count: 15,
            lifetime: 500,
            color: '#ffff00',
            speed: { min: 100, max: 200 },
            gravity: 0.3,
            trigger: 'wall_hit'
        },

        // Environmental
        smoke: {
            count: 20,
            lifetime: 2000,
            color: '#808080',
            speed: { min: 10, max: 30 },
            gravity: -0.1,
            trigger: 'explosion'
        },
        debris: {
            count: 8,
            lifetime: 1500,
            color: '#404040',
            speed: { min: 50, max: 100 },
            gravity: 0.8,
            trigger: 'wall_destroy'
        },

        // Tech effects
        dataStream: {
            count: 30,
            lifetime: 1000,
            color: '#00ff00',
            speed: { min: 20, max: 50 },
            gravity: 0,
            trigger: 'hack_complete'
        },
        energyPulse: {
            count: 25,
            lifetime: 800,
            color: '#00ffff',
            speed: { min: 80, max: 120 },
            gravity: 0,
            trigger: 'shield_activate'
        }
    },

    // Screen flash effects
    screenFlash: {
        explosion: {
            color: 'rgba(255, 255, 0, 0.3)',
            duration: 200,
            trigger: 'explosion'
        },
        damage: {
            color: 'rgba(255, 0, 0, 0.2)',
            duration: 150,
            trigger: 'agent_hit'
        },
        heal: {
            color: 'rgba(0, 255, 0, 0.2)',
            duration: 300,
            trigger: 'agent_heal'
        },
        transition: {
            color: 'rgba(255, 255, 255, 0.8)',
            duration: 500,
            trigger: 'screen_transition'
        }
    },

    // Contextual modifiers
    contextModifiers: {
        // Slow motion contexts
        slowMotion: {
            lastEnemyKill: {
                timescale: 0.3,
                duration: 2000,
                condition: 'lastEnemyInRoom'
            },
            criticalHealth: {
                timescale: 0.7,
                duration: -1, // Continuous while condition met
                condition: 'agentHealth < 20'
            },
            abilityActivation: {
                timescale: 0.5,
                duration: 500,
                condition: 'ultimateAbilityUsed'
            }
        },

        // Environmental modifiers
        environments: {
            industrial: {
                screenShakeMultiplier: 1.2,
                freezeDurationMultiplier: 0.8
            },
            corporate: {
                screenShakeMultiplier: 0.8,
                freezeDurationMultiplier: 1.0
            },
            slums: {
                screenShakeMultiplier: 1.5,
                freezeDurationMultiplier: 1.2
            }
        }
    },

    // Effect chains (multiple effects triggered together)
    effectChains: {
        megaExplosion: [
            { type: 'screenShake', config: 'explosion' },
            { type: 'freeze', config: 'explosion' },
            { type: 'screenFlash', config: 'explosion' },
            { type: 'particles', config: 'smoke' },
            { type: 'particles', config: 'debris' }
        ],
        agentDeath: [
            { type: 'freeze', config: 'agentDeath' },
            { type: 'screenFlash', config: 'damage' },
            { type: 'slowMotion', config: 'lastEnemyKill' }
        ],
        missionComplete: [
            { type: 'freeze', config: 'missionComplete' },
            { type: 'screenFlash', config: 'transition' }
        ]
    },

    // Falloff curves
    falloffCurves: {
        linear: function(t) { return 1 - t; },
        exponential: function(t) { return Math.pow(1 - t, 2); },
        sine: function(t) { return Math.sin((1 - t) * Math.PI / 2); },
        bounce: function(t) {
            if (t < 0.5) return 1 - t * 2;
            return (t - 0.5) * 2 * 0.3;
        }
    }
};

// Helper function to get effect config
function getEffectConfig(category, effect) {
    if (GAME_EFFECTS_CONFIG[category]) {
        return GAME_EFFECTS_CONFIG[category][effect] || null;
    }
    return null;
}

// Helper function to get effect chain
function getEffectChain(chainName) {
    return GAME_EFFECTS_CONFIG.effectChains[chainName] || null;
}

// Helper function to get falloff curve
function getFalloffCurve(curveName) {
    return GAME_EFFECTS_CONFIG.falloffCurves[curveName] || GAME_EFFECTS_CONFIG.falloffCurves.linear;
}

// Helper function to apply environmental modifiers
function getEnvironmentModifiers(environment) {
    return GAME_EFFECTS_CONFIG.contextModifiers.environments[environment] || {
        screenShakeMultiplier: 1.0,
        freezeDurationMultiplier: 1.0
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_EFFECTS_CONFIG;
}