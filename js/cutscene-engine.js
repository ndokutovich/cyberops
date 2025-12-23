/**
 * Declarative Cutscene Engine
 * Renders cinematic sequences using declarative configuration
 * Follows same patterns as declarative-dialog-engine.js
 */

class CutsceneEngine {
    constructor(config = {}) {
        this.config = config;
        this.currentCutscene = null;
        this.currentSceneIndex = 0;
        this.currentElementIndex = 0;
        this.isPlaying = false;
        this.isPaused = false;
        this.container = null;
        this.textQueue = [];
        this.typewriterInterval = null;
        this.sceneTimeout = null;
        this.onCompleteCallback = null;
        this.sceneCompleted = false;  // Track if current scene is fully displayed
        this.currentTypewriterElement = null;  // Track current typewriter element
        this.currentTypewriterText = null;  // Track full text for completion
        this.musicFadeInterval = null;  // Track music fade interval for cleanup

        // Initialize logger
        this.logger = window.Logger ? new window.Logger('CutsceneEngine') : null;

        // Bind methods
        this.handleClick = this.handleClick.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
    }

    /**
     * Initialize the cutscene engine
     */
    init() {
        // Create container if not exists
        this.container = document.getElementById('cutsceneContainer');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'cutsceneContainer';
            this.container.className = 'cutscene-container';
            this.container.style.display = 'none';
            document.body.appendChild(this.container);
        }

        if (this.logger) this.logger.info('CutsceneEngine initialized');
    }

    /**
     * Play a cutscene by ID
     * @param {string} cutsceneId - The cutscene ID to play
     * @param {Function} onComplete - Callback when cutscene ends
     */
    play(cutsceneId, onComplete = null) {
        const cutscene = this.config.cutscenes?.[cutsceneId];

        if (!cutscene) {
            if (this.logger) this.logger.error(`Cutscene not found: ${cutsceneId}`);
            if (onComplete) onComplete();
            return false;
        }

        if (this.logger) this.logger.info(`Playing cutscene: ${cutsceneId}`);

        this.currentCutscene = cutscene;
        this.currentSceneIndex = 0;
        this.currentElementIndex = 0;
        this.isPlaying = true;
        this.isPaused = false;
        this.onCompleteCallback = onComplete;

        // Show container
        this.container.style.display = 'flex';
        this.container.innerHTML = '';

        // Play cutscene-level music if specified, otherwise use default
        // Skip if continueMusic flag is set AND music is actually playing
        if (cutscene.continueMusic) {
            // Check if music is actually playing (cutscene audio or screen music)
            const game = this.game || window.game;
            const cutsceneMusicPlaying = this.cutsceneAudio && !this.cutsceneAudio.paused;
            const screenMusicPlaying = game?.screenMusic?.currentTrack && !game.screenMusic.currentTrack.paused;

            if (cutsceneMusicPlaying || screenMusicPlaying) {
                if (this.logger) this.logger.debug(`🎵 continueMusic: true - keeping current music`);
            } else {
                // No music playing, use fallback
                if (this.logger) this.logger.debug(`🎵 continueMusic: true but no music playing - using fallback`);
                const musicToPlay = cutscene.music || this.config.settings?.defaultMusic;
                if (musicToPlay) {
                    this.playCutsceneMusic(musicToPlay);
                }
            }
        } else {
            const musicToPlay = cutscene.music || this.config.settings?.defaultMusic;
            if (musicToPlay) {
                this.playCutsceneMusic(musicToPlay);
            }
        }

        // Add event listeners
        this.container.addEventListener('click', this.handleClick);
        document.addEventListener('keydown', this.handleKeyPress);

        // Start first scene
        this.playScene(0);

        return true;
    }

    /**
     * Play a specific scene
     * @param {number} index - Scene index
     */
    playScene(index) {
        if (!this.currentCutscene || index >= this.currentCutscene.scenes.length) {
            this.complete();
            return;
        }

        this.currentSceneIndex = index;
        this.currentElementIndex = 0;
        this.sceneCompleted = false;  // Reset scene completion flag
        this.currentTypewriterElement = null;
        this.currentTypewriterText = null;
        const scene = this.currentCutscene.scenes[index];

        if (this.logger) this.logger.debug(`Playing scene ${index}: ${scene.id || 'unnamed'}`);

        // Clear container
        this.container.innerHTML = '';

        // Apply background
        this.applyBackground(scene);

        // Create scene wrapper
        const sceneWrapper = document.createElement('div');
        sceneWrapper.className = 'cutscene-scene';
        sceneWrapper.id = `cutscene-scene-${index}`;
        this.container.appendChild(sceneWrapper);

        // Play scene-specific music if specified (overrides cutscene music)
        if (scene.music) {
            this.playCutsceneMusic(scene.music);
        }

        // Render elements sequentially
        this.renderNextElement(scene, sceneWrapper);

        // Set auto-advance timer if duration specified
        if (scene.duration && scene.duration > 0) {
            this.sceneTimeout = setTimeout(() => {
                this.nextScene();
            }, scene.duration);
        }
    }

    /**
     * Apply background to container
     * @param {Object} scene - Scene configuration
     */
    applyBackground(scene) {
        if (scene.background) {
            // Check if it's a gradient, color, or image
            if (scene.background.startsWith('linear-gradient') ||
                scene.background.startsWith('radial-gradient') ||
                scene.background.startsWith('#') ||
                scene.background.startsWith('rgb')) {
                this.container.style.background = scene.background;
                this.container.style.backgroundImage = 'none';
            } else {
                // Assume it's an image reference
                const bgClass = `cutscene-bg-${scene.background}`;
                this.container.className = `cutscene-container ${bgClass}`;
            }
        } else {
            this.container.style.background = 'linear-gradient(135deg, #0a0a0a, #1a1a2e)';
        }
    }

    /**
     * Render the next element in sequence
     * @param {Object} scene - Scene configuration
     * @param {HTMLElement} wrapper - Scene wrapper element
     */
    renderNextElement(scene, wrapper) {
        // Store wrapper for later use in completeCurrentScene
        this.currentSceneWrapper = wrapper;

        if (!scene.elements || this.currentElementIndex >= scene.elements.length) {
            // All elements rendered, mark scene as complete and add skip hint
            this.sceneCompleted = true;
            this.addSkipHint(wrapper);
            return;
        }

        const element = scene.elements[this.currentElementIndex];
        this.currentElementIndex++;

        const el = this.createElement(element);
        if (el) {
            wrapper.appendChild(el);

            // Apply entrance animation
            if (element.animation) {
                this.applyAnimation(el, element.animation);
            }

            // Handle typewriter effect for text and dialog elements
            if (element.typewriter && (element.type === 'text' || element.type === 'dialog')) {
                this.typewriterEffect(el, element.content, () => {
                    // Delay before next element
                    setTimeout(() => {
                        this.renderNextElement(scene, wrapper);
                    }, element.delay || 500);
                });
            } else {
                // Delay before next element
                setTimeout(() => {
                    this.renderNextElement(scene, wrapper);
                }, element.delay || 1000);
            }
        } else {
            // Skip invalid element
            this.renderNextElement(scene, wrapper);
        }
    }

    /**
     * Create a DOM element from configuration
     * @param {Object} config - Element configuration
     * @returns {HTMLElement|null}
     */
    createElement(config) {
        let el = null;

        switch (config.type) {
            case 'title':
                el = document.createElement('h1');
                el.className = `cutscene-title ${config.class || ''}`;
                el.textContent = config.text;
                break;

            case 'subtitle':
                el = document.createElement('h2');
                el.className = `cutscene-subtitle ${config.class || ''}`;
                el.textContent = config.text;
                break;

            case 'text':
                el = document.createElement('div');
                el.className = `cutscene-text ${config.class || ''}`;
                if (!config.typewriter) {
                    el.innerHTML = this.formatText(config.content);
                }
                break;

            case 'dialog':
                el = document.createElement('div');
                el.className = `cutscene-dialog ${config.class || ''}`;

                // Get avatar from config or from global speakers config
                const avatarSrc = config.avatar || this.getSpeakerAvatar(config.speaker);

                if (avatarSrc) {
                    const avatar = document.createElement('div');
                    avatar.className = 'cutscene-avatar';
                    avatar.innerHTML = `<img src="${avatarSrc}" alt="${config.speaker || ''}" onerror="this.parentElement.innerHTML='<div class=\\'cutscene-avatar-fallback\\'>${(config.speaker || '?')[0]}</div>'">`;
                    el.appendChild(avatar);
                }

                const dialogContent = document.createElement('div');
                dialogContent.className = 'cutscene-dialog-content';

                if (config.speaker) {
                    const speaker = document.createElement('div');
                    speaker.className = 'cutscene-speaker';
                    speaker.textContent = config.speaker;
                    dialogContent.appendChild(speaker);
                }

                const dialogText = document.createElement('div');
                dialogText.className = 'cutscene-dialog-text';
                if (config.typewriter) {
                    dialogContent.appendChild(dialogText);
                } else {
                    dialogText.innerHTML = this.formatText(config.content);
                    dialogContent.appendChild(dialogText);
                }

                el.appendChild(dialogContent);
                break;

            case 'image':
                el = document.createElement('div');
                el.className = `cutscene-image ${config.class || ''}`;
                const img = document.createElement('img');
                img.src = config.src;
                img.alt = config.alt || '';
                el.appendChild(img);
                break;

            case 'location':
                el = document.createElement('div');
                el.className = 'cutscene-location';
                el.innerHTML = `
                    <div class="cutscene-location-name">${config.name}</div>
                    ${config.subtitle ? `<div class="cutscene-location-subtitle">${config.subtitle}</div>` : ''}
                    ${config.time ? `<div class="cutscene-location-time">${config.time}</div>` : ''}
                `;
                break;

            case 'divider':
                el = document.createElement('div');
                el.className = 'cutscene-divider';
                break;

            case 'countdown':
                el = document.createElement('div');
                el.className = 'cutscene-countdown';
                el.innerHTML = `<span class="countdown-value">${config.value}</span><span class="countdown-label">${config.label || ''}</span>`;
                break;

            case 'news':
                el = document.createElement('div');
                el.className = 'cutscene-news';
                el.innerHTML = `
                    <div class="news-header">${config.channel || 'BREAKING NEWS'}</div>
                    <div class="news-content">${this.formatText(config.content)}</div>
                `;
                break;

            default:
                if (this.logger) this.logger.warn(`Unknown element type: ${config.type}`);
                return null;
        }

        // Apply custom styles
        if (config.style) {
            Object.assign(el.style, config.style);
        }

        return el;
    }

    /**
     * Format text with line breaks
     * @param {string} text - Raw text
     * @returns {string} - Formatted HTML
     */
    formatText(text) {
        if (!text) return '';
        return text.split('\n').map(line => `<p>${line}</p>`).join('');
    }

    /**
     * Get avatar for a speaker from global config
     * @param {string} speaker - Speaker name
     * @returns {string|null} - Avatar URL or null
     */
    getSpeakerAvatar(speaker) {
        if (!speaker) return null;
        const speakers = this.config?.speakers || window.CUTSCENE_CONFIG?.speakers;
        if (!speakers) return null;
        const speakerConfig = speakers[speaker.toUpperCase()];
        return speakerConfig?.avatar || null;
    }

    /**
     * Apply animation to element
     * @param {HTMLElement} el - Element
     * @param {string} animation - Animation name
     */
    applyAnimation(el, animation) {
        el.classList.add(`cutscene-anim-${animation}`);
    }

    /**
     * Typewriter effect for text
     * @param {HTMLElement} el - Element to type into
     * @param {string} text - Text to type
     * @param {Function} onComplete - Callback when done
     */
    typewriterEffect(el, text, onComplete) {
        const textContainer = el.querySelector('.cutscene-dialog-text') || el;
        const chars = text.split('');
        let index = 0;

        // Clear any existing interval
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
        }

        // Store references for completion on click
        this.currentTypewriterElement = textContainer;
        this.currentTypewriterText = text;
        this.currentTypewriterCallback = onComplete;

        textContainer.innerHTML = '';

        // Add typing class to show cursor
        textContainer.classList.add('typing');

        this.typewriterInterval = setInterval(() => {
            if (index < chars.length) {
                // Handle newlines
                if (chars[index] === '\n') {
                    textContainer.innerHTML += '<br>';
                } else {
                    textContainer.innerHTML += chars[index];
                }
                index++;
            } else {
                clearInterval(this.typewriterInterval);
                this.typewriterInterval = null;
                // Remove typing class to hide cursor
                textContainer.classList.remove('typing');
                this.currentTypewriterElement = null;
                this.currentTypewriterText = null;
                this.currentTypewriterCallback = null;
                if (onComplete) onComplete();
            }
        }, 30); // Speed of typewriter
    }

    /**
     * Complete typewriter effect instantly, showing full text
     * @returns {boolean} True if there was a typewriter to complete
     */
    completeTypewriter() {
        if (this.typewriterInterval && this.currentTypewriterElement && this.currentTypewriterText) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;

            // Show the full text immediately
            this.currentTypewriterElement.innerHTML = this.formatText(this.currentTypewriterText);

            // Remove typing class to hide cursor
            this.currentTypewriterElement.classList.remove('typing');

            // Store callback before clearing
            const callback = this.currentTypewriterCallback;

            // Clear references
            this.currentTypewriterElement = null;
            this.currentTypewriterText = null;
            this.currentTypewriterCallback = null;

            // Execute callback to continue rendering
            if (callback) callback();

            return true;
        }
        return false;
    }

    /**
     * Skip typewriter effect (legacy - now just clears interval)
     */
    skipTypewriter() {
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
            return true;
        }
        return false;
    }

    /**
     * Play cutscene music
     * @param {string|Object} musicConfig - Music file path or config object
     */
    playCutsceneMusic(musicConfig) {
        const musicPath = typeof musicConfig === 'string' ? musicConfig : musicConfig.file;
        const configVolume = typeof musicConfig === 'object' ? (musicConfig.volume || 0.5) : 0.5;
        const loop = typeof musicConfig === 'object' ? (musicConfig.loop !== false) : true;
        const fadeIn = typeof musicConfig === 'object' ? (musicConfig.fadeIn || 0) : 0;

        // Apply master and music volume multipliers (same as rest of game)
        const game = this.game || window.game;
        const masterVolume = game?.masterVolume ?? 1.0;
        const musicVolume = game?.musicVolume ?? 0.7;
        const targetVolume = configVolume * masterVolume * musicVolume;

        // Clear any pending fade interval from previous music
        if (this.musicFadeInterval) {
            clearInterval(this.musicFadeInterval);
            this.musicFadeInterval = null;
        }

        // Check if same track is already playing - just adjust volume
        if (this.cutsceneAudio && !this.cutsceneAudio.paused &&
            this.cutsceneAudio.src && this.cutsceneAudio.src.endsWith(musicPath)) {
            if (this.logger) this.logger.debug(`🎵 Same track already playing, adjusting volume`);
            this.cutsceneAudio.volume = targetVolume;
            return;
        }

        // Stop any currently playing audio cleanly (no fade, immediate)
        if (this.cutsceneAudio && !this.cutsceneAudio.paused) {
            this.cutsceneAudio.pause();
            this.cutsceneAudio.currentTime = 0;
        }

        if (this.logger) this.logger.info(`🎵 Playing cutscene music: ${musicPath} (vol: ${targetVolume.toFixed(2)})`);

        // Create or reuse audio element
        if (!this.cutsceneAudio) {
            this.cutsceneAudio = new Audio();
        }

        this.cutsceneAudio.src = musicPath;
        this.cutsceneAudio.loop = loop;

        // Start at 0 volume if fade in, otherwise target volume
        this.cutsceneAudio.volume = fadeIn > 0 ? 0 : targetVolume;

        this.cutsceneAudio.play().catch(err => {
            if (this.logger) this.logger.warn(`Could not play cutscene music: ${err.message}`);
        });

        // Apply fade in if configured
        if (fadeIn > 0) {
            const steps = 20;
            const volumeStep = targetVolume / steps;
            const stepTime = fadeIn / steps;
            let currentStep = 0;

            this.musicFadeInterval = setInterval(() => {
                currentStep++;
                this.cutsceneAudio.volume = Math.min(targetVolume, volumeStep * currentStep);
                if (currentStep >= steps) {
                    clearInterval(this.musicFadeInterval);
                    this.musicFadeInterval = null;
                }
            }, stepTime);
        }
    }

    /**
     * Stop cutscene music with fade out
     * @param {number} fadeTime - Fade duration in ms
     */
    stopCutsceneMusic(fadeTime = 500) {
        // Clear any pending fade-in interval first
        if (this.musicFadeInterval) {
            clearInterval(this.musicFadeInterval);
            this.musicFadeInterval = null;
        }

        if (!this.cutsceneAudio) return;

        if (this.logger) this.logger.debug('🎵 Stopping cutscene music');

        const audio = this.cutsceneAudio;
        const startVolume = audio.volume;
        const steps = 20;
        const volumeStep = startVolume / steps;
        const stepTime = fadeTime / steps;

        let step = 0;
        this.musicFadeInterval = setInterval(() => {
            step++;
            audio.volume = Math.max(0, startVolume - (volumeStep * step));

            if (step >= steps) {
                clearInterval(this.musicFadeInterval);
                this.musicFadeInterval = null;
                audio.pause();
                audio.currentTime = 0;
            }
        }, stepTime);
    }

    /**
     * Add skip hint to scene
     * @param {HTMLElement} wrapper - Scene wrapper
     */
    addSkipHint(wrapper) {
        const hint = document.createElement('div');
        hint.className = 'cutscene-skip-hint';
        hint.textContent = 'Click or press SPACE to continue...';
        wrapper.appendChild(hint);
    }

    /**
     * Handle click event
     */
    handleClick(e) {
        e.preventDefault();
        this.advance();
    }

    /**
     * Handle keypress event
     * @param {KeyboardEvent} e
     */
    handleKeyPress(e) {
        if (e.code === 'Space' || e.code === 'Enter') {
            e.preventDefault();
            this.advance();
        } else if (e.code === 'Escape') {
            e.preventDefault();
            this.skip();
        }
    }

    /**
     * Advance to next content
     * First click: complete current scene instantly
     * Second click: go to next scene
     */
    advance() {
        // If scene not completed, complete it first
        if (!this.sceneCompleted) {
            this.completeCurrentScene();
            return;
        }

        // Clear scene timeout
        if (this.sceneTimeout) {
            clearTimeout(this.sceneTimeout);
            this.sceneTimeout = null;
        }

        // Go to next scene
        this.nextScene();
    }

    /**
     * Complete current scene instantly - show all remaining content
     */
    completeCurrentScene() {
        // Complete any active typewriter
        this.completeTypewriter();

        // Get current scene
        const scene = this.currentCutscene?.scenes?.[this.currentSceneIndex];
        if (!scene || !scene.elements) {
            this.sceneCompleted = true;
            return;
        }

        // Render all remaining elements instantly
        const wrapper = this.currentSceneWrapper;
        if (!wrapper) {
            this.sceneCompleted = true;
            return;
        }

        // Render remaining elements without delays
        while (this.currentElementIndex < scene.elements.length) {
            const element = scene.elements[this.currentElementIndex];
            this.currentElementIndex++;

            const el = this.createElement(element);
            if (el) {
                wrapper.appendChild(el);

                // For typewriter elements, show full text immediately
                if (element.typewriter && (element.type === 'text' || element.type === 'dialog')) {
                    const textContainer = el.querySelector('.cutscene-dialog-text') || el;
                    textContainer.innerHTML = this.formatText(element.content);
                }

                // Apply animation class (will show instantly due to CSS)
                if (element.animation) {
                    this.applyAnimation(el, element.animation);
                }
            }
        }

        // Mark scene as completed and show hint
        this.sceneCompleted = true;
        this.addSkipHint(wrapper);
    }

    /**
     * Go to next scene
     */
    nextScene() {
        this.playScene(this.currentSceneIndex + 1);
    }

    /**
     * Skip entire cutscene
     */
    skip() {
        if (this.logger) this.logger.info('Cutscene skipped');
        this.complete();
    }

    /**
     * Pause cutscene
     */
    pause() {
        this.isPaused = true;
        if (this.sceneTimeout) {
            clearTimeout(this.sceneTimeout);
        }
        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
        }
    }

    /**
     * Resume cutscene
     */
    resume() {
        this.isPaused = false;
        // Resume would need to track state - simplified for now
    }

    /**
     * Complete cutscene
     */
    complete() {
        if (this.logger) this.logger.info('Cutscene complete');

        // Store reference to cutscene before clearing
        const completedCutscene = this.currentCutscene;
        const callback = this.onCompleteCallback;

        // Stop cutscene music with fade
        this.stopCutsceneMusic(500);

        // Clean up
        this.isPlaying = false;
        this.currentCutscene = null;
        this.onCompleteCallback = null;

        if (this.sceneTimeout) {
            clearTimeout(this.sceneTimeout);
            this.sceneTimeout = null;
        }

        if (this.typewriterInterval) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
        }

        // Remove event listeners
        this.container.removeEventListener('click', this.handleClick);
        document.removeEventListener('keydown', this.handleKeyPress);

        // Hide container with fade
        this.container.classList.add('cutscene-fade-out');

        setTimeout(() => {
            this.container.style.display = 'none';
            this.container.classList.remove('cutscene-fade-out');
            this.container.innerHTML = '';

            // If a callback was provided, use it instead of config action
            // This allows programmatic override of cutscene chaining
            if (callback) {
                callback();
            } else if (completedCutscene?.onComplete) {
                // No callback provided, use config action
                this.executeAction(completedCutscene.onComplete);
            }
        }, 500);
    }

    /**
     * Execute action string
     * @param {string} action - Action string like "navigate:hub"
     */
    executeAction(action) {
        if (!action) return;

        const [type, target] = action.split(':');

        switch (type) {
            case 'navigate':
                if (window.screenManager) {
                    window.screenManager.navigateTo(target);
                } else if (window.game?.dialogEngine) {
                    window.game.dialogEngine.navigateTo(target);
                }
                break;

            case 'cutscene':
                this.play(target);
                break;

            case 'execute':
                if (window.game && typeof window.game[target] === 'function') {
                    window.game[target]();
                }
                break;

            default:
                if (this.logger) this.logger.warn(`Unknown action type: ${type}`);
        }
    }

    /**
     * Check if cutscene is currently playing
     * @returns {boolean}
     */
    isActive() {
        return this.isPlaying;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.CutsceneEngine = CutsceneEngine;
}
