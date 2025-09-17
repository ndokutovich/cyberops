# Mission Music System Design

## Overview
Each mission can have multiple music tracks that change based on game events, creating a dynamic and immersive audio experience.

## Music Configuration Structure

```javascript
music: {
    // Base ambient track (plays by default)
    ambient: {
        file: "music/missions/main-01-001/ambient.mp3",
        volume: 0.6,
        loop: true,
        fadeIn: 2000  // milliseconds
    },

    // Combat music (triggers when enemies detected)
    combat: {
        file: "music/missions/main-01-001/combat.mp3",
        volume: 0.8,
        loop: true,
        fadeIn: 500,
        priority: 2  // Higher priority overrides lower
    },

    // Stealth music (when sneaking near enemies)
    stealth: {
        file: "music/missions/main-01-001/stealth.mp3",
        volume: 0.5,
        loop: true,
        fadeIn: 1000,
        priority: 1
    },

    // Alert music (when alarm triggered)
    alert: {
        file: "music/missions/main-01-001/alert.mp3",
        volume: 0.9,
        loop: true,
        fadeIn: 100,
        priority: 3
    },

    // Victory music (objective complete)
    victory: {
        file: "music/missions/main-01-001/victory.mp3",
        volume: 0.7,
        loop: false,
        fadeIn: 500,
        priority: 4
    },

    // Custom event tracks
    events: [
        {
            id: "boss_appears",
            trigger: "custom",  // or "timer", "objective", "location"
            file: "music/missions/main-01-001/boss.mp3",
            volume: 0.8,
            loop: true,
            fadeIn: 1000,
            priority: 3
        },
        {
            id: "timer_30sec",
            trigger: "timer",
            time: 30,  // seconds remaining
            file: "music/missions/main-01-001/urgency.mp3",
            volume: 0.8,
            loop: true,
            fadeIn: 500,
            priority: 3
        },
        {
            id: "extraction_available",
            trigger: "objective",
            objective: "extraction_enabled",
            file: "music/missions/main-01-001/extraction.mp3",
            volume: 0.6,
            loop: true,
            fadeIn: 2000,
            priority: 1
        }
    ],

    // Fallback to global tracks if mission tracks not found
    fallback: {
        ambient: "music/global/ambient_corporate.mp3",
        combat: "music/global/combat_generic.mp3",
        stealth: "music/global/stealth_generic.mp3"
    }
}
```

## Directory Structure

```
cyberops-game/
├── music/
│   ├── global/           # Shared tracks for any mission
│   │   ├── ambient_corporate.mp3
│   │   ├── ambient_industrial.mp3
│   │   ├── combat_generic.mp3
│   │   └── stealth_generic.mp3
│   └── missions/
│       ├── main-01-001/  # Per-mission tracks
│       │   ├── ambient.mp3
│       │   ├── combat.mp3
│       │   ├── stealth.mp3
│       │   └── victory.mp3
│       └── main-01-002/
│           └── ...
```

## Music Triggers

### Automatic Triggers
- **Combat**: Enemy within 10 tiles and has line of sight
- **Stealth**: Enemy within 15 tiles but no line of sight
- **Alert**: Alarm activated or enemy calls for backup
- **Victory**: All objectives complete
- **Defeat**: All agents down

### Event-Based Triggers
- **Timer**: At specific time remaining
- **Objective**: When objective state changes
- **Location**: Agent enters specific area
- **Custom**: Triggered by script/code

## Transition System

```javascript
// Smooth transitions between tracks
transitionMusic(fromTrack, toTrack) {
    // Crossfade over 1-2 seconds
    fadeOut(fromTrack, 1000);
    fadeIn(toTrack, 1000);
}

// Priority system prevents lower priority from interrupting higher
if (newTrack.priority >= currentTrack.priority) {
    transitionMusic(currentTrack, newTrack);
}
```

## Mission Editor Support

The mission editor should have:
1. **Music Tab**: Configure all music tracks
2. **Track Upload**: Upload music files for the mission
3. **Preview Player**: Test music in editor
4. **Event Builder**: Visual editor for music triggers
5. **Volume Mixer**: Adjust relative volumes
6. **Export**: Package music with mission

## Implementation Priority

1. **Phase 1**: Basic ambient and combat music
2. **Phase 2**: Stealth and alert states
3. **Phase 3**: Event triggers
4. **Phase 4**: Mission editor integration

## Benefits

- **Immersion**: Music responds to gameplay
- **Tension**: Build atmosphere through audio
- **Feedback**: Audio cues for game state
- **Variety**: Each mission feels unique
- **Modding**: Community can add custom music