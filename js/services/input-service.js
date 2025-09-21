/**
 * InputService - Centralized input management
 * Handles all mouse, keyboard, touch, and gamepad input with unified event system
 */

class InputService {
    constructor() {
        // Input state
        this.mousePosition = { x: 0, y: 0 };
        this.mouseWorldPosition = { x: 0, y: 0 };
        this.mouseButtons = new Map(); // button number -> pressed state
        this.keys = new Map(); // key code -> pressed state
        this.touches = new Map(); // touch identifier -> touch data

        // Mouse state
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.dragCurrent = { x: 0, y: 0 };
        this.lastClickTime = 0;
        this.doubleClickTime = 300; // ms

        // Touch state
        this.pinchDistance = 0;
        this.lastTouchDistance = 0;
        this.touchStartTime = 0;

        // Gamepad state (future)
        this.gamepads = new Map();
        this.gamepadDeadzone = 0.2;

        // Input modes
        this.inputMode = 'mouse'; // mouse, touch, gamepad
        this.enabled = true;
        this.captureKeyboard = true;
        this.captureMouse = true;

        // Event listeners storage
        this.listeners = new Map();
        this.boundHandlers = new Map();

        // Target element
        this.targetElement = null;

        // Coordinate conversion functions (to be set by game)
        this.screenToWorld = null;
        this.worldToScreen = null;

        // Key repeat configuration
        this.keyRepeatDelay = 500; // ms before repeat starts
        this.keyRepeatInterval = 50; // ms between repeats
        this.keyRepeatTimers = new Map();

        // Bind methods
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
        this.updateGamepads = this.updateGamepads.bind(this);

        console.log('🎮 InputService initialized');
    }

    /**
     * Initialize input handling for a target element
     */
    initialize(element, options = {}) {
        this.targetElement = element;

        // Set options
        if (options.screenToWorld) this.screenToWorld = options.screenToWorld;
        if (options.worldToScreen) this.worldToScreen = options.worldToScreen;

        // Mouse events
        if (this.captureMouse) {
            element.addEventListener('mousedown', this.handleMouseDown);
            element.addEventListener('mouseup', this.handleMouseUp);
            element.addEventListener('mousemove', this.handleMouseMove);
            element.addEventListener('wheel', this.handleWheel, { passive: false });
            element.addEventListener('contextmenu', this.handleContextMenu);

            // Also listen on document for mouse up/move (in case mouse leaves element)
            document.addEventListener('mouseup', this.handleMouseUp);
            document.addEventListener('mousemove', this.handleMouseMove);
        }

        // Touch events
        element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        element.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        element.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        element.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

        // Keyboard events (on window to capture all)
        if (this.captureKeyboard) {
            window.addEventListener('keydown', this.handleKeyDown);
            window.addEventListener('keyup', this.handleKeyUp);
        }

        // Gamepad polling
        this.startGamepadPolling();

        console.log('🎮 InputService attached to element');
    }

    /**
     * Cleanup and remove all event listeners
     */
    destroy() {
        if (this.targetElement) {
            // Remove mouse events
            this.targetElement.removeEventListener('mousedown', this.handleMouseDown);
            this.targetElement.removeEventListener('mouseup', this.handleMouseUp);
            this.targetElement.removeEventListener('mousemove', this.handleMouseMove);
            this.targetElement.removeEventListener('wheel', this.handleWheel);
            this.targetElement.removeEventListener('contextmenu', this.handleContextMenu);

            // Remove touch events
            this.targetElement.removeEventListener('touchstart', this.handleTouchStart);
            this.targetElement.removeEventListener('touchmove', this.handleTouchMove);
            this.targetElement.removeEventListener('touchend', this.handleTouchEnd);
            this.targetElement.removeEventListener('touchcancel', this.handleTouchEnd);
        }

        // Remove document events
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('mousemove', this.handleMouseMove);

        // Remove keyboard events
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        // Stop gamepad polling
        this.stopGamepadPolling();

        // Clear all state
        this.mouseButtons.clear();
        this.keys.clear();
        this.touches.clear();
        this.keyRepeatTimers.forEach(timer => clearTimeout(timer));
        this.keyRepeatTimers.clear();
    }

    /**
     * Mouse down handler
     */
    handleMouseDown(e) {
        if (!this.enabled || !this.captureMouse) return;

        this.inputMode = 'mouse';
        const button = e.button; // 0=left, 1=middle, 2=right
        this.mouseButtons.set(button, true);

        // Update position
        this.updateMousePosition(e);

        // Check for double click
        const now = Date.now();
        const isDoubleClick = (now - this.lastClickTime) < this.doubleClickTime;
        this.lastClickTime = now;

        // Start drag
        if (button === 0) { // Left button
            this.isDragging = true;
            this.dragStart = { ...this.mousePosition };
            this.dragCurrent = { ...this.mousePosition };
        }

        // Emit events
        this.emit('mousedown', {
            button,
            position: { ...this.mousePosition },
            worldPosition: { ...this.mouseWorldPosition },
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            isDoubleClick
        });

        if (isDoubleClick) {
            this.emit('doubleclick', {
                position: { ...this.mousePosition },
                worldPosition: { ...this.mouseWorldPosition }
            });
        }

        e.preventDefault();
    }

    /**
     * Mouse up handler
     */
    handleMouseUp(e) {
        if (!this.enabled || !this.captureMouse) return;

        const button = e.button;
        this.mouseButtons.set(button, false);

        // Update position
        this.updateMousePosition(e);

        // End drag
        if (button === 0 && this.isDragging) {
            this.isDragging = false;

            // Check if it was a click (not a drag)
            const dx = this.mousePosition.x - this.dragStart.x;
            const dy = this.mousePosition.y - this.dragStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) { // Click threshold
                this.emit('click', {
                    button,
                    position: { ...this.mousePosition },
                    worldPosition: { ...this.mouseWorldPosition },
                    shiftKey: e.shiftKey,
                    ctrlKey: e.ctrlKey,
                    altKey: e.altKey
                });
            } else {
                this.emit('dragend', {
                    start: { ...this.dragStart },
                    end: { ...this.mousePosition },
                    distance
                });
            }
        }

        // Emit event
        this.emit('mouseup', {
            button,
            position: { ...this.mousePosition },
            worldPosition: { ...this.mouseWorldPosition }
        });
    }

    /**
     * Mouse move handler
     */
    handleMouseMove(e) {
        if (!this.enabled || !this.captureMouse) return;

        const oldPosition = { ...this.mousePosition };
        this.updateMousePosition(e);

        // Calculate delta
        const deltaX = this.mousePosition.x - oldPosition.x;
        const deltaY = this.mousePosition.y - oldPosition.y;

        // Handle drag
        if (this.isDragging) {
            this.dragCurrent = { ...this.mousePosition };
            this.emit('drag', {
                position: { ...this.mousePosition },
                delta: { x: deltaX, y: deltaY },
                start: { ...this.dragStart }
            });
        }

        // Emit move event
        this.emit('mousemove', {
            position: { ...this.mousePosition },
            worldPosition: { ...this.mouseWorldPosition },
            delta: { x: deltaX, y: deltaY },
            buttons: Array.from(this.mouseButtons.entries()).filter(([_, pressed]) => pressed).map(([button]) => button)
        });
    }

    /**
     * Mouse wheel handler
     */
    handleWheel(e) {
        if (!this.enabled || !this.captureMouse) return;

        e.preventDefault();

        const delta = e.deltaY > 0 ? -1 : 1; // Normalize to -1 or 1
        const deltaRaw = e.deltaY;

        this.emit('wheel', {
            delta,
            deltaRaw,
            position: { ...this.mousePosition },
            worldPosition: { ...this.mouseWorldPosition },
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey
        });
    }

    /**
     * Update mouse position
     */
    updateMousePosition(e) {
        if (!this.targetElement) return;

        const rect = this.targetElement.getBoundingClientRect();
        this.mousePosition.x = e.clientX - rect.left;
        this.mousePosition.y = e.clientY - rect.top;

        // Update world position if conversion function provided
        if (this.screenToWorld) {
            const world = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
            this.mouseWorldPosition.x = world.x;
            this.mouseWorldPosition.y = world.y;
        } else {
            this.mouseWorldPosition = { ...this.mousePosition };
        }
    }

    /**
     * Context menu handler
     */
    handleContextMenu(e) {
        e.preventDefault();

        this.updateMousePosition(e);

        this.emit('contextmenu', {
            position: { ...this.mousePosition },
            worldPosition: { ...this.mouseWorldPosition }
        });
    }

    /**
     * Key down handler
     */
    handleKeyDown(e) {
        if (!this.enabled || !this.captureKeyboard) return;

        // Check if key is already pressed (key repeat)
        const wasPressed = this.keys.get(e.code);
        this.keys.set(e.code, true);

        // Don't emit repeat events unless configured
        if (wasPressed && !this.keyRepeatTimers.has(e.code)) {
            return;
        }

        // Emit event
        this.emit('keydown', {
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey,
            repeat: wasPressed || false
        });

        // Set up key repeat if not already
        if (!wasPressed && this.keyRepeatDelay > 0) {
            const repeatTimer = setTimeout(() => {
                const interval = setInterval(() => {
                    if (!this.keys.get(e.code)) {
                        clearInterval(interval);
                        this.keyRepeatTimers.delete(e.code);
                        return;
                    }

                    this.emit('keydown', {
                        key: e.key,
                        code: e.code,
                        shiftKey: e.shiftKey,
                        ctrlKey: e.ctrlKey,
                        altKey: e.altKey,
                        metaKey: e.metaKey,
                        repeat: true
                    });
                }, this.keyRepeatInterval);

                this.keyRepeatTimers.set(e.code, interval);
            }, this.keyRepeatDelay);

            // Store initial timer too
            this.keyRepeatTimers.set(e.code + '_delay', repeatTimer);
        }

        // Prevent default for game keys
        if (this.shouldPreventDefault(e.code)) {
            e.preventDefault();
        }
    }

    /**
     * Key up handler
     */
    handleKeyUp(e) {
        if (!this.enabled || !this.captureKeyboard) return;

        this.keys.set(e.code, false);

        // Clear key repeat timers
        const delayTimer = this.keyRepeatTimers.get(e.code + '_delay');
        const repeatTimer = this.keyRepeatTimers.get(e.code);
        if (delayTimer) {
            clearTimeout(delayTimer);
            this.keyRepeatTimers.delete(e.code + '_delay');
        }
        if (repeatTimer) {
            clearInterval(repeatTimer);
            this.keyRepeatTimers.delete(e.code);
        }

        // Emit event
        this.emit('keyup', {
            key: e.key,
            code: e.code,
            shiftKey: e.shiftKey,
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        });
    }

    /**
     * Touch start handler
     */
    handleTouchStart(e) {
        if (!this.enabled) return;

        this.inputMode = 'touch';
        e.preventDefault();

        this.touchStartTime = Date.now();

        // Store touches
        for (const touch of e.touches) {
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            });
        }

        // Handle pinch start
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }

        // Emit event
        this.emit('touchstart', {
            touches: Array.from(this.touches.values()),
            touchCount: e.touches.length
        });

        // Single touch acts like mouse down
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.targetElement.getBoundingClientRect();

            this.mousePosition.x = touch.clientX - rect.left;
            this.mousePosition.y = touch.clientY - rect.top;
            this.updateWorldPosition();

            this.emit('mousedown', {
                button: 0,
                position: { ...this.mousePosition },
                worldPosition: { ...this.mouseWorldPosition }
            });
        }
    }

    /**
     * Touch move handler
     */
    handleTouchMove(e) {
        if (!this.enabled) return;

        e.preventDefault();

        // Update touches
        for (const touch of e.touches) {
            const storedTouch = this.touches.get(touch.identifier);
            if (storedTouch) {
                storedTouch.x = touch.clientX;
                storedTouch.y = touch.clientY;
            }
        }

        // Handle pinch
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const dx = touch2.clientX - touch1.clientX;
            const dy = touch2.clientY - touch1.clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                const scale = distance / this.lastTouchDistance;
                this.emit('pinch', {
                    scale,
                    distance,
                    center: {
                        x: (touch1.clientX + touch2.clientX) / 2,
                        y: (touch1.clientY + touch2.clientY) / 2
                    }
                });
            }

            this.lastTouchDistance = distance;
        }

        // Emit event
        this.emit('touchmove', {
            touches: Array.from(this.touches.values()),
            touchCount: e.touches.length
        });

        // Single touch acts like mouse move
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.targetElement.getBoundingClientRect();

            const oldPosition = { ...this.mousePosition };
            this.mousePosition.x = touch.clientX - rect.left;
            this.mousePosition.y = touch.clientY - rect.top;
            this.updateWorldPosition();

            this.emit('mousemove', {
                position: { ...this.mousePosition },
                worldPosition: { ...this.mouseWorldPosition },
                delta: {
                    x: this.mousePosition.x - oldPosition.x,
                    y: this.mousePosition.y - oldPosition.y
                }
            });
        }
    }

    /**
     * Touch end handler
     */
    handleTouchEnd(e) {
        if (!this.enabled) return;

        e.preventDefault();

        const touchEndTime = Date.now();
        const touchDuration = touchEndTime - this.touchStartTime;

        // Get ended touches
        const endedTouches = [];
        for (const [id, touch] of this.touches) {
            let found = false;
            for (const activeTouch of e.touches) {
                if (activeTouch.identifier === id) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                endedTouches.push(touch);
                this.touches.delete(id);
            }
        }

        // Emit event
        this.emit('touchend', {
            touches: endedTouches,
            duration: touchDuration,
            remainingTouches: e.touches.length
        });

        // Handle tap (short touch)
        if (touchDuration < 200 && endedTouches.length === 1) {
            const touch = endedTouches[0];
            const dx = touch.x - touch.startX;
            const dy = touch.y - touch.startY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 10) { // Tap threshold
                this.emit('tap', {
                    position: { x: touch.x, y: touch.y },
                    duration: touchDuration
                });

                // Also emit click for compatibility
                const rect = this.targetElement.getBoundingClientRect();
                this.mousePosition.x = touch.x - rect.left;
                this.mousePosition.y = touch.y - rect.top;
                this.updateWorldPosition();

                this.emit('click', {
                    button: 0,
                    position: { ...this.mousePosition },
                    worldPosition: { ...this.mouseWorldPosition }
                });
            }
        }

        // Reset pinch
        if (e.touches.length < 2) {
            this.lastTouchDistance = 0;
        }

        // All touches ended - emit mouse up
        if (e.touches.length === 0) {
            this.emit('mouseup', {
                button: 0,
                position: { ...this.mousePosition },
                worldPosition: { ...this.mouseWorldPosition }
            });
        }
    }

    /**
     * Update world position from mouse position
     */
    updateWorldPosition() {
        if (this.screenToWorld) {
            const world = this.screenToWorld(this.mousePosition.x, this.mousePosition.y);
            this.mouseWorldPosition.x = world.x;
            this.mouseWorldPosition.y = world.y;
        } else {
            this.mouseWorldPosition = { ...this.mousePosition };
        }
    }

    /**
     * Gamepad polling
     */
    startGamepadPolling() {
        const pollGamepads = () => {
            if (!this.enabled) {
                this.gamepadAnimationFrame = requestAnimationFrame(pollGamepads);
                return;
            }

            this.updateGamepads();
            this.gamepadAnimationFrame = requestAnimationFrame(pollGamepads);
        };
        this.gamepadAnimationFrame = requestAnimationFrame(pollGamepads);
    }

    /**
     * Stop gamepad polling
     */
    stopGamepadPolling() {
        if (this.gamepadAnimationFrame) {
            cancelAnimationFrame(this.gamepadAnimationFrame);
            this.gamepadAnimationFrame = null;
        }
    }

    /**
     * Update gamepad state
     */
    updateGamepads() {
        const gamepads = navigator.getGamepads();

        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            const previousState = this.gamepads.get(gamepad.index);
            const currentState = {
                index: gamepad.index,
                buttons: gamepad.buttons.map(b => b.pressed),
                axes: gamepad.axes.slice()
            };

            // Apply deadzone to axes
            for (let i = 0; i < currentState.axes.length; i++) {
                if (Math.abs(currentState.axes[i]) < this.gamepadDeadzone) {
                    currentState.axes[i] = 0;
                }
            }

            // Check for button changes
            if (previousState) {
                for (let i = 0; i < currentState.buttons.length; i++) {
                    if (currentState.buttons[i] !== previousState.buttons[i]) {
                        if (currentState.buttons[i]) {
                            this.emit('gamepadbuttondown', { gamepad: gamepad.index, button: i });
                        } else {
                            this.emit('gamepadbuttonup', { gamepad: gamepad.index, button: i });
                        }
                    }
                }
            }

            this.gamepads.set(gamepad.index, currentState);
        }

        // Emit axis events
        for (const [index, state] of this.gamepads) {
            if (state.axes.some(v => v !== 0)) {
                this.emit('gamepadaxes', {
                    gamepad: index,
                    axes: state.axes
                });
            }
        }
    }

    /**
     * Check if key should prevent default
     */
    shouldPreventDefault(keyCode) {
        // Prevent default for arrow keys, space, etc. in game
        const preventKeys = [
            'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Tab', 'Enter'
        ];
        return preventKeys.includes(keyCode);
    }

    /**
     * Check if a key is currently pressed
     */
    isKeyPressed(keyCode) {
        return this.keys.get(keyCode) || false;
    }

    /**
     * Check if a mouse button is currently pressed
     */
    isMouseButtonPressed(button) {
        return this.mouseButtons.get(button) || false;
    }

    /**
     * Get all pressed keys
     */
    getPressedKeys() {
        const pressed = [];
        for (const [key, isPressed] of this.keys) {
            if (isPressed) pressed.push(key);
        }
        return pressed;
    }

    /**
     * Set input enabled state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            // Clear all input state
            this.keys.clear();
            this.mouseButtons.clear();
            this.touches.clear();
            this.isDragging = false;
        }
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
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (!this.listeners.has(event)) return;

        const callbacks = this.listeners.get(event);
        callbacks.forEach(callback => callback(data));
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        return {
            inputMode: this.inputMode,
            enabled: this.enabled,
            mousePosition: { ...this.mousePosition },
            mouseWorldPosition: { ...this.mouseWorldPosition },
            isDragging: this.isDragging,
            pressedKeys: this.getPressedKeys(),
            pressedButtons: Array.from(this.mouseButtons.entries()).filter(([_, p]) => p).map(([b]) => b),
            touchCount: this.touches.size,
            gamepadCount: this.gamepads.size
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.InputService = InputService;
}