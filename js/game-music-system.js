// Advanced Music System for Dynamic Mission Soundtracks
// Handles multiple tracks, transitions, and event-based music changes

CyberOpsGame.prototype.initMusicSystem = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameMusicSystem') : null;
    }
    if (this.logger) this.logger.debug('🎵 Initializing advanced music system...');

    this.musicSystem = {
        currentTrack: null,
        currentTrackType: null,
        currentPriority: 0,
        fadeTimers: [],

        // Track instances
        tracks: {
            ambient: null,
            combat: null,
            stealth: null,
            alert: null,
            victory: null,
            event: null
        },

        // Audio elements pool
        audioPool: [],
        maxAudioElements: 6,

        // State tracking
        combatState: false,
        stealthState: false,
        alertState: false,

        // Configuration from mission
        config: null
    };

    // Create audio element pool
    for (let i = 0; i < this.musicSystem.maxAudioElements; i++) {
        const audio = document.createElement('audio');
        audio.preload = 'none';
        this.musicSystem.audioPool.push({
            element: audio,
            inUse: false,
            type: null
        });
    }

    if (this.logger) this.logger.info('✅ Music system initialized with', this.musicSystem.maxAudioElements, 'audio channels');
};

// Load music configuration from mission
CyberOpsGame.prototype.loadMissionMusic = function(missionDef) {
    if (!missionDef || !missionDef.music) {
        if (this.logger) this.logger.debug('⚠️ No music configuration in mission, using defaults');
        this.loadDefaultMusic();
        return;
    }

    if (this.logger) this.logger.debug('🎵 Loading music for mission:', missionDef.name);
    this.musicSystem.config = missionDef.music;

    // Start with ambient music
    this.playMissionTrack('ambient');
};

// Play a specific track type
CyberOpsGame.prototype.playMissionTrack = function(trackType, eventId = null) {
    if (!this.musicSystem.config) return;

    let trackConfig;

    // Handle event tracks
    if (trackType === 'event' && eventId) {
        const event = this.musicSystem.config.events?.find(e => e.id === eventId);
        if (!event) {
            if (this.logger) this.logger.warn('❌ Event track not found:', eventId);
            return;
        }
        trackConfig = event;
    } else {
        trackConfig = this.musicSystem.config[trackType];
    }

    if (!trackConfig) {
        if (this.logger) this.logger.warn('❌ Track type not found:', trackType);
        return;
    }

    // Check priority
    const priority = trackConfig.priority || 0;
    if (priority < this.musicSystem.currentPriority) {
        if (this.logger) this.logger.debug('🎵 Track priority too low, not switching from', this.musicSystem.currentTrackType, 'to', trackType);
        return;
    }

    // Get an available audio element
    const audioSlot = this.getAvailableAudioSlot();
    if (!audioSlot) {
        if (this.logger) this.logger.error('❌ No available audio slots!');
        return;
    }

    // Try to load the track
    const audioElement = audioSlot.element;
    const musicFile = this.resolveMusicFile(trackConfig.file, trackConfig.fallback);

    if (!musicFile) {
        if (this.logger) this.logger.error('❌ No music file found for', trackType);
        return;
    }

    if (this.logger) this.logger.debug('🎵 Loading track:', trackType, 'from', musicFile);

    // Configure audio element
    audioElement.src = musicFile;
    audioElement.loop = trackConfig.loop !== false;
    audioElement.volume = 0; // Start at 0 for fade in

    // Mark slot as in use
    audioSlot.inUse = true;
    audioSlot.type = trackType;

    // Handle track transition
    if (this.musicSystem.currentTrack) {
        this.fadeOutTrack(this.musicSystem.currentTrack, 1000);
    }

    // Start new track
    audioElement.play().then(() => {
        if (this.logger) this.logger.info('✅ Started playing:', trackType);
        this.fadeInTrack(audioElement, trackConfig.volume || 0.7, trackConfig.fadeIn || 1000);

        // Update current track info
        this.musicSystem.currentTrack = audioElement;
        this.musicSystem.currentTrackType = trackType;
        this.musicSystem.currentPriority = priority;

        // Store in tracks object
        this.musicSystem.tracks[trackType] = audioElement;

    }).catch(error => {
        if (this.logger) this.logger.error('❌ Failed to play music:', error);
        audioSlot.inUse = false;
        audioSlot.type = null;
    });
};

// Get available audio slot from pool
CyberOpsGame.prototype.getAvailableAudioSlot = function() {
    return this.musicSystem.audioPool.find(slot => !slot.inUse);
};

// Resolve music file with fallback
CyberOpsGame.prototype.resolveMusicFile = function(primary, fallback) {
    // Try primary first, then fallback
    // In a real implementation, we'd check if the file exists
    // For now, we'll just return the primary if it exists, otherwise fallback
    return primary || fallback;
};

// Fade in track
CyberOpsGame.prototype.fadeInTrack = function(audio, targetVolume, duration) {
    if (!audio) return;

    const steps = 20;
    const stepTime = duration / steps;
    const volumeStep = targetVolume / steps;
    let currentStep = 0;

    const fadeTimer = setInterval(() => {
        currentStep++;
        audio.volume = Math.min(volumeStep * currentStep, targetVolume);

        if (currentStep >= steps) {
            clearInterval(fadeTimer);
            audio.volume = targetVolume;
        }
    }, stepTime);

    this.musicSystem.fadeTimers.push(fadeTimer);
};

// Fade out track
CyberOpsGame.prototype.fadeOutTrack = function(audio, duration) {
    if (!audio || audio.volume === 0) return;

    const steps = 20;
    const stepTime = duration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    const fadeTimer = setInterval(() => {
        currentStep++;
        audio.volume = Math.max(startVolume - (volumeStep * currentStep), 0);

        if (currentStep >= steps) {
            clearInterval(fadeTimer);
            audio.pause();
            audio.volume = 0;

            // Mark slot as available
            const slot = this.musicSystem.audioPool.find(s => s.element === audio);
            if (slot) {
                slot.inUse = false;
                slot.type = null;
            }
        }
    }, stepTime);

    this.musicSystem.fadeTimers.push(fadeTimer);
};

// Update music based on game state
CyberOpsGame.prototype.updateMusicState = function() {
    if (!this.musicSystem.config || !this.agents) return;

    let newCombatState = false;
    let newStealthState = false;
    let newAlertState = false;

    // Check for combat (enemy sees agent)
    for (const enemy of this.enemies) {
        if (!enemy.alive) continue;

        for (const agent of this.agents) {
            if (!agent.alive) continue;

            const dist = Math.sqrt(
                Math.pow(enemy.x - agent.x, 2) +
                Math.pow(enemy.y - agent.y, 2)
            );

            // Combat: enemy can see agent within 10 tiles
            if (dist < 10 && this.hasLineOfSight(enemy, agent)) {
                newCombatState = true;
                break;
            }

            // Stealth: enemy nearby but can't see
            if (dist < 15 && !this.hasLineOfSight(enemy, agent)) {
                newStealthState = true;
            }
        }

        // Alert: enemy is alerted
        if (enemy.alertLevel > 0) {
            newAlertState = true;
        }
    }

    // Handle state changes
    if (newAlertState && !this.musicSystem.alertState) {
        if (this.logger) this.logger.debug('🚨 Alert state activated!');
        this.playMissionTrack('alert');
    } else if (newCombatState && !this.musicSystem.combatState) {
        if (this.logger) this.logger.debug('⚔️ Combat state activated!');
        this.playMissionTrack('combat');
    } else if (newStealthState && !this.musicSystem.stealthState && !newCombatState && !newAlertState) {
        if (this.logger) this.logger.debug('🤫 Stealth state activated!');
        this.playMissionTrack('stealth');
    } else if (!newCombatState && !newStealthState && !newAlertState &&
              (this.musicSystem.combatState || this.musicSystem.stealthState || this.musicSystem.alertState)) {
        if (this.logger) this.logger.debug('😌 Returning to ambient music');
        this.playMissionTrack('ambient');
    }

    // Update states
    this.musicSystem.combatState = newCombatState;
    this.musicSystem.stealthState = newStealthState;
    this.musicSystem.alertState = newAlertState;

    // Check for event triggers
    this.checkMusicEventTriggers();
};

// Check for event-based music triggers
CyberOpsGame.prototype.checkMusicEventTriggers = function() {
    if (!this.musicSystem.config?.events) return;

    for (const event of this.musicSystem.config.events) {
        switch (event.trigger) {
            case 'objective':
                if (this.checkObjectiveCondition(event.condition)) {
                    this.playMissionTrack('event', event.id);
                }
                break;

            case 'health':
                if (this.checkHealthCondition(event.threshold)) {
                    this.playMissionTrack('event', event.id);
                }
                break;

            case 'timer':
                if (this.missionTimeRemaining <= event.time) {
                    this.playMissionTrack('event', event.id);
                }
                break;
        }
    }
};

// Check objective condition
CyberOpsGame.prototype.checkObjectiveCondition = function(condition) {
    switch (condition) {
        case 'all_terminals_hacked':
            // Check through MissionService
            if (this.gameServices && this.gameServices.missionService) {
                const terminalsHacked = this.gameServices.missionService.trackers.terminalsHacked || 0;
                const terminalsTotal = this.terminals ? this.terminals.length : 0;
                return terminalsHacked >= terminalsTotal;
            }
            return false;
        case 'extraction_enabled':
            return this.extractionEnabled;
        default:
            return false;
    }
};

// Check health condition
CyberOpsGame.prototype.checkHealthCondition = function(threshold) {
    if (!this.agents) return false;

    const aliveAgents = this.agents.filter(a => a.alive);
    if (aliveAgents.length === 0) return false;

    const avgHealthPercent = aliveAgents.reduce((sum, a) => sum + (a.health / a.maxHealth * 100), 0) / aliveAgents.length;
    return avgHealthPercent <= threshold;
};

// Play victory music
CyberOpsGame.prototype.playVictoryMusic = function() {
    if (this.logger) this.logger.debug('🎉 Playing victory music!');
    this.musicSystem.currentPriority = 10; // Override everything
    this.playMissionTrack('victory');
};

// Load default music configuration
CyberOpsGame.prototype.loadDefaultMusic = function() {
    this.musicSystem.config = {
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
        }
    };

    this.playMissionTrack('ambient');
};

// Clean up music system
CyberOpsGame.prototype.cleanupMusicSystem = function() {
    if (this.logger) this.logger.debug('🧹 Cleaning up music system');

    // Clear all fade timers
    for (const timer of this.musicSystem.fadeTimers) {
        clearInterval(timer);
    }
    this.musicSystem.fadeTimers = [];

    // Stop all audio
    for (const slot of this.musicSystem.audioPool) {
        if (slot.element) {
            slot.element.pause();
            slot.element.src = '';
        }
        slot.inUse = false;
        slot.type = null;
    }

    // Reset state
    this.musicSystem.currentTrack = null;
    this.musicSystem.currentTrackType = null;
    this.musicSystem.currentPriority = 0;
    this.musicSystem.combatState = false;
    this.musicSystem.stealthState = false;
    this.musicSystem.alertState = false;
};

// Initialize the system on game load
if (this.logger) this.logger.info('🎵 Music system module loaded');