// Declarative Music Configuration System
// Central configuration for all game music across all screens

const GAME_MUSIC_CONFIG = {
    // Global settings
    global: {
        masterVolume: 1.0,
        musicVolume: 0.7,
        sfxVolume: 0.8,
        fadeInTime: 2000,
        fadeOutTime: 1000,
        crossfadeTime: 1500
    },

    // Screen-specific music configurations
    screens: {
        // Initial splash screen
        splash: {
            tracks: {
                main: {
                    file: 'game-music.mp3',  // Same file as menu, starts from beginning
                    fallback: 'music/global/menu.mp3',
                    volume: 0.5,
                    loop: true,
                    fadeIn: 1000,
                    startTime: 0  // Play from beginning for splash (0-10.6 seconds)
                }
            },
            events: [
                {
                    id: 'skip',
                    trigger: 'user_input',
                    action: 'transitionToMenu',
                    markSkipped: true  // Sets splashSkipped flag
                }
            ],
            transitions: {
                toMenu: {
                    type: 'continue'  // Natural transition - same music file continues
                }
            }
        },

        // Main menu
        menu: {
            tracks: {
                main: {
                    file: 'game-music.mp3',
                    fallback: 'music/global/menu.mp3',
                    volume: 0.6,
                    loop: true,
                    fadeIn: 2000,
                    startTime: 10.6,  // Skip splash intro when coming from skipped splash
                    startTimeCondition: 'splashSkipped'  // Only use startTime if splash was skipped
                }
            },
            transitions: {
                toHub: {
                    type: 'continue',  // Continue same music, don't reload
                    volumeAdjust: 0.8  // Optional: slightly reduce volume in hub
                },
                toMission: {
                    type: 'fadeOut',
                    duration: 1000
                },
                toCredits: {
                    type: 'fadeOut',
                    duration: 800
                }
            }
        },

        // Syndicate Hub
        hub: {
            tracks: {
                ambient: {
                    file: 'game-music.mp3',
                    fallback: 'music/global/menu.mp3',
                    volume: 0.5,
                    loop: true,
                    fadeIn: 1500
                    // No startTime - should continue from current position
                },
                alert: {
                    file: 'music/screens/hub-alert.mp3',
                    volume: 0.7,
                    loop: false,
                    priority: 2,
                    trigger: 'low_resources'
                }
            },
            transitions: {
                toMenu: {
                    type: 'continue',  // Continue same music when going back to menu
                    volumeAdjust: 1.2  // Slightly increase volume back to menu level
                },
                toMission: {
                    type: 'fadeOut',
                    duration: 1000
                }
            },
            dynamicVolume: {
                // Reduce volume when dialogs open
                dialogOpen: 0.3,
                dialogClosed: 0.5
            }
        },

        // Mission briefing - removed, now continues main theme from hub
        // Music only changes when mission actually starts

        // Victory screen
        victory: {
            tracks: {
                fanfare: {
                    file: 'music/screens/victory-fanfare.mp3',
                    volume: 0.8,
                    loop: false,
                    fadeIn: 500
                },
                ambient: {
                    file: 'music/screens/victory-ambient.mp3',
                    volume: 0.5,
                    loop: true,
                    delay: 5000  // Start after fanfare
                }
            }
        },

        // Defeat screen
        defeat: {
            tracks: {
                somber: {
                    file: 'music/screens/defeat.mp3',
                    volume: 0.4,
                    loop: true,
                    fadeIn: 3000
                }
            }
        },

        // Credits
        credits: {
            tracks: {
                main: {
                    file: 'game-credits.mp3',
                    fallback: 'music/global/credits.mp3',
                    volume: 0.7,
                    loop: true,
                    fadeIn: 2000
                },
                // Alternative ending theme
                ending: {
                    file: 'music/screens/ending.mp3',
                    volume: 0.6,
                    loop: false,
                    trigger: 'campaign_complete'
                }
            },
            events: [
                {
                    id: 'scroll_end',
                    trigger: 'credits_finished',
                    action: 'fadeToTrack',
                    targetTrack: 'ending'
                }
            ]
        },

        // Hall of Glory (memorial)
        hallOfGlory: {
            tracks: {
                memorial: {
                    file: 'music/screens/memorial.mp3',
                    fallback: 'music/global/somber.mp3',
                    volume: 0.3,
                    loop: true,
                    fadeIn: 3000
                }
            }
        },

        // Demoscene (attract mode)
        demoscene: {
            tracks: {
                retro: {
                    file: 'music/screens/demoscene.mp3',
                    procedural: true,  // Use procedural generation
                    volume: 0.5,
                    loop: true,
                    fadeIn: 1000
                }
            },
            proceduralConfig: {
                style: 'chiptune',
                tempo: 140,
                complexity: 'medium'
            }
        }
    },

    // Mission music configuration (already exists but included for completeness)
    missions: {
        default: {
            ambient: {
                fallback: 'music/global/ambient_generic.mp3',
                volume: 0.6,
                loop: true,
                fadeIn: 2000
            },
            combat: {
                fallback: 'music/global/combat_generic.mp3',
                volume: 0.8,
                loop: true,
                fadeIn: 500,
                priority: 2
            },
            stealth: {
                fallback: 'music/global/stealth_generic.mp3',
                volume: 0.4,
                loop: true,
                fadeIn: 1500,
                priority: 1
            },
            alert: {
                fallback: 'music/global/alert_generic.mp3',
                volume: 0.7,
                loop: true,
                fadeIn: 800,
                priority: 3
            },
            victory: {
                fallback: 'music/global/victory_generic.mp3',
                volume: 0.8,
                loop: false,
                fadeIn: 500,
                priority: 10
            }
        }
    },

    // Sound effect configurations
    // Fully declarative SFX system with context awareness
    soundEffects: {
        // Global SFX settings
        global: {
            masterVolume: 1.0,
            sfxVolume: 0.8,
            maxSimultaneous: 10,  // Max simultaneous sounds
            cooldowns: {          // Minimum time between same sound
                shoot: 100,
                hit: 50,
                footstep: 200
            }
        },
        // UI sounds
        ui: {
            click: {
                file: 'sfx-click.wav',
                fallback: 'sfx-click.mp3',
                volume: 0.3,
                procedural: true
            },
            hover: {
                file: 'sfx-hover.wav',
                fallback: 'sfx-hover.mp3',
                volume: 0.2,
                procedural: true
            },
            error: {
                file: 'sfx-error.wav',
                fallback: 'sfx-error.mp3',
                volume: 0.4,
                procedural: true
            },
            success: {
                file: 'sfx-success.wav',
                fallback: 'sfx-success.mp3',
                volume: 0.4,
                procedural: true
            }
        },

        // Combat sounds
        combat: {
            shoot: {
                file: 'sfx-shoot.wav',
                fallback: 'sfx-shoot.mp3',
                volume: 0.5,
                procedural: true,  // Always fallback to procedural if files missing
                variations: ['sfx-shoot-1.wav', 'sfx-shoot-2.wav']
            },
            explosion: {
                file: 'sfx-explosion.wav',
                fallback: 'sfx-explosion.mp3',
                volume: 0.6,
                procedural: true  // Always fallback to procedural if files missing
            },
            hit: {
                file: 'sfx-hit.wav',
                fallback: 'sfx-hit.mp3',
                volume: 0.4,
                procedural: true  // Generate if missing
            },
            shield: {
                file: 'sfx-shield.wav',
                fallback: 'sfx-shield.mp3',
                volume: 0.5,
                procedural: true  // Always fallback to procedural if files missing
            }
        },

        // Interaction sounds
        interaction: {
            hack: {
                file: 'sfx-hack.wav',
                fallback: 'sfx-hack.mp3',
                volume: 0.4,
                procedural: true,
                duration: 1000,  // Sound duration for timing
                vibration: [20, 10, 20]  // Haptic feedback pattern
            },
            plant: {
                file: 'sfx-plant.wav',
                fallback: 'sfx-plant.mp3',
                volume: 0.5,
                procedural: true,
                description: 'Planting explosives'
            },
            door: {
                file: 'sfx-door.wav',
                fallback: 'sfx-door.mp3',
                volume: 0.5,
                procedural: true
            },
            terminal: {
                file: 'sfx-terminal.wav',
                fallback: 'sfx-terminal.mp3',
                volume: 0.3,
                procedural: true
            },
            pickup: {
                file: 'sfx-pickup.wav',
                fallback: 'sfx-pickup.mp3',
                volume: 0.4,
                procedural: true
            },
            type: {
                file: 'sfx-type.wav',
                fallback: 'sfx-type.mp3',
                volume: 0.1,
                procedural: true,
                description: 'NPC dialog typing'
            }
        },

        // Movement sounds
        movement: {
            footstep: {
                file: 'sfx-footstep.wav',
                fallback: 'sfx-footstep.mp3',
                volume: 0.2,
                procedural: true,
                variations: ['sfx-footstep-1.wav', 'sfx-footstep-2.wav']
            },
            move: {
                file: 'sfx-move.wav',
                fallback: 'sfx-move.mp3',
                volume: 0.1,
                procedural: true
            }
        }
    },

    // Contextual SFX configurations
    // These override default sounds based on game state
    contextualSounds: {
        // Environment-based overrides
        environments: {
            industrial: {
                footstep: { volume: 0.3, reverb: 0.7 },
                shoot: { volume: 0.6, echo: true }
            },
            slums: {
                footstep: { volume: 0.15, muffled: true },
                explosion: { volume: 0.8, distanceScale: 1.5 }
            },
            corporate: {
                footstep: { volume: 0.1, crisp: true },
                hack: { volume: 0.3, highTech: true }
            }
        },

        // State-based overrides
        states: {
            stealth: {
                volumeMultiplier: 0.5,
                disableSounds: ['footstep']
            },
            combat: {
                volumeMultiplier: 1.2,
                prioritySounds: ['shoot', 'explosion', 'hit']
            },
            critical: {
                // When agent health < 30%
                hit: { volume: 0.8, vibration: [100] },
                shield: { volume: 0.6 }
            }
        },

        // Distance-based attenuation
        distance: {
            enabled: true,
            maxDistance: 20,  // Tiles
            minVolume: 0.1,   // Minimum volume at max distance
            falloffCurve: 'linear'  // linear, exponential, logarithmic
        }
    },

    // Procedural sound generation settings
    proceduralSettings: {
        // Define how each sound type should be generated
        templates: {
            shoot: {
                waveform: 'sawtooth',
                frequency: 300,
                duration: 100,
                envelope: { attack: 0, decay: 100, sustain: 0, release: 0 }
            },
            explosion: {
                waveform: 'noise',
                frequency: 50,
                duration: 500,
                envelope: { attack: 0, decay: 100, sustain: 200, release: 200 }
            },
            hit: {
                waveform: 'square',
                frequency: 150,
                duration: 50,
                envelope: { attack: 0, decay: 50, sustain: 0, release: 0 }
            },
            shield: {
                waveform: 'sine',
                frequency: 800,
                duration: 200,
                envelope: { attack: 10, decay: 50, sustain: 100, release: 40 }
            },
            hack: {
                waveform: 'triangle',
                frequency: 400,
                duration: 300,
                modulation: { type: 'fm', rate: 10, depth: 100 }
            },
            plant: {
                waveform: 'square',
                frequency: 200,
                duration: 400,
                envelope: { attack: 50, decay: 100, sustain: 200, release: 50 }
            },
            type: {
                waveform: 'sine',
                frequency: 1000,
                duration: 30,
                randomPitch: 0.2  // ±20% pitch variation
            },
            click: {
                waveform: 'sine',
                frequency: 600,
                duration: 50,
                envelope: { attack: 0, decay: 50, sustain: 0, release: 0 }
            },
            footstep: {
                waveform: 'noise',
                frequency: 100,
                duration: 100,
                filter: { type: 'lowpass', frequency: 200 }
            }
        }
    },

    // Music event triggers
    triggers: {
        // Global triggers that can happen on any screen
        global: {
            low_health: {
                condition: 'avgHealth < 30',
                action: 'increaseIntensity',
                amount: 0.2
            },
            boss_encounter: {
                condition: 'bossSpawned',
                action: 'switchTrack',
                targetTrack: 'boss'
            },
            timer_warning: {
                condition: 'timeRemaining < 60',
                action: 'addLayer',
                layer: 'urgency'
            }
        }
    },

    // Procedural music settings
    procedural: {
        enabled: true,
        fallbackOnly: true,  // Only use when files missing
        styles: {
            chiptune: {
                waveforms: ['square', 'triangle', 'sawtooth'],
                tempo: [120, 140, 160],
                scales: ['minor', 'pentatonic']
            },
            ambient: {
                waveforms: ['sine', 'triangle'],
                tempo: [60, 80],
                scales: ['major', 'dorian']
            },
            combat: {
                waveforms: ['sawtooth', 'square'],
                tempo: [140, 160, 180],
                scales: ['minor', 'phrygian']
            }
        }
    }
};

// Helper function to get music config for a screen
function getMusicConfigForScreen(screenName) {
    return GAME_MUSIC_CONFIG.screens[screenName] || null;
}

// Helper function to get mission music defaults
function getDefaultMissionMusic() {
    return GAME_MUSIC_CONFIG.missions.default;
}

// Helper function to get sound effect config
function getSoundEffectConfig(category, effect) {
    if (GAME_MUSIC_CONFIG.soundEffects[category]) {
        return GAME_MUSIC_CONFIG.soundEffects[category][effect] || null;
    }
    return null;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GAME_MUSIC_CONFIG;
}