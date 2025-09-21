/**
 * CameraService - Centralized camera management
 * Handles camera position, zoom, scrolling, boundaries, and coordinate conversions
 */

class CameraService {
    constructor() {
        // Core camera state
        this._x = 0;
        this._y = 0;
        this._zoom = 1;

        // Camera configuration
        this.minZoom = 0.5;
        this.maxZoom = 2.0;
        this.zoomStep = 0.1;
        this.smoothing = 0.15; // For smooth camera movement

        // Target position for smooth movement
        this.targetX = 0;
        this.targetY = 0;
        this.isSmoothing = false;

        // Boundaries
        this.boundaryEnabled = true;
        this.minX = null;
        this.minY = null;
        this.maxX = null;
        this.maxY = null;

        // Viewport info
        this.viewportWidth = 0;
        this.viewportHeight = 0;

        // Edge scrolling config
        this.edgeScrollEnabled = false;
        this.edgeScrollSpeed = 10;
        this.edgeScrollZone = 50; // Pixels from edge

        // Camera shake
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Follow target
        this.followTarget = null;
        this.followOffset = { x: 0, y: 0 };
        this.followDeadzone = { width: 100, height: 80 };

        // Event listeners
        this.listeners = new Map();

        // Bind methods
        this.update = this.update.bind(this);
        this.setPosition = this.setPosition.bind(this);
        this.move = this.move.bind(this);
        this.zoomIn = this.zoomIn.bind(this);
        this.zoomOut = this.zoomOut.bind(this);
        this.centerOn = this.centerOn.bind(this);

        console.log('📷 CameraService initialized');
    }

    /**
     * Get camera X position (with shake offset)
     */
    get x() {
        return this._x + this.shakeOffsetX;
    }

    /**
     * Set camera X position
     */
    set x(value) {
        const oldValue = this._x;
        this._x = this.applyBoundaryX(value);
        if (oldValue !== this._x) {
            this.emit('positionChange', { x: this._x, y: this._y });
        }
    }

    /**
     * Get camera Y position (with shake offset)
     */
    get y() {
        return this._y + this.shakeOffsetY;
    }

    /**
     * Set camera Y position
     */
    set y(value) {
        const oldValue = this._y;
        this._y = this.applyBoundaryY(value);
        if (oldValue !== this._y) {
            this.emit('positionChange', { x: this._x, y: this._y });
        }
    }

    /**
     * Get zoom level
     */
    get zoom() {
        return this._zoom;
    }

    /**
     * Set zoom level
     */
    set zoom(value) {
        const oldValue = this._zoom;
        this._zoom = Math.max(this.minZoom, Math.min(this.maxZoom, value));
        if (oldValue !== this._zoom) {
            this.emit('zoomChange', { zoom: this._zoom });
        }
    }

    /**
     * Set camera position
     */
    setPosition(x, y, immediate = false) {
        if (immediate || !this.isSmoothing) {
            this.x = x;
            this.y = y;
        } else {
            this.targetX = x;
            this.targetY = y;
        }
    }

    /**
     * Move camera by delta
     */
    move(dx, dy) {
        this.setPosition(this._x + dx, this._y + dy, true);
    }

    /**
     * Set viewport dimensions
     */
    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
        // Also store as viewport object for compatibility
        this.viewport = {
            width: width,
            height: height
        };
        this.updateBoundaries();
    }

    /**
     * Set camera boundaries based on map size
     */
    setBoundaries(minX, minY, maxX, maxY) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
        this.boundaryEnabled = true;
    }

    /**
     * Disable camera boundaries
     */
    disableBoundaries() {
        this.boundaryEnabled = false;
    }

    /**
     * Apply X boundary constraint
     */
    applyBoundaryX(x) {
        if (!this.boundaryEnabled) return x;

        if (this.minX !== null && x < this.minX) return this.minX;
        if (this.maxX !== null && x > this.maxX) return this.maxX;
        return x;
    }

    /**
     * Apply Y boundary constraint
     */
    applyBoundaryY(y) {
        if (!this.boundaryEnabled) return y;

        if (this.minY !== null && y < this.minY) return this.minY;
        if (this.maxY !== null && y > this.maxY) return this.maxY;
        return y;
    }

    /**
     * Update boundaries based on viewport and map
     */
    updateBoundaries() {
        // This would be called when map changes or viewport resizes
        // Implementation depends on map size
    }

    /**
     * Zoom in
     */
    zoomIn(centerX = null, centerY = null) {
        const oldZoom = this._zoom;
        this.zoom = this._zoom + this.zoomStep;

        // Zoom towards point if provided
        if (centerX !== null && centerY !== null && oldZoom !== this._zoom) {
            const zoomRatio = this._zoom / oldZoom;
            this.x = centerX - (centerX - this._x) * zoomRatio;
            this.y = centerY - (centerY - this._y) * zoomRatio;
        }
    }

    /**
     * Zoom out
     */
    zoomOut(centerX = null, centerY = null) {
        const oldZoom = this._zoom;
        this.zoom = this._zoom - this.zoomStep;

        // Zoom from point if provided
        if (centerX !== null && centerY !== null && oldZoom !== this._zoom) {
            const zoomRatio = this._zoom / oldZoom;
            this.x = centerX - (centerX - this._x) * zoomRatio;
            this.y = centerY - (centerY - this._y) * zoomRatio;
        }
    }

    /**
     * Set zoom level
     */
    setZoom(zoom, centerX = null, centerY = null) {
        const oldZoom = this._zoom;
        this.zoom = zoom;

        // Adjust position to zoom around center point
        if (centerX !== null && centerY !== null && oldZoom !== this._zoom) {
            const zoomRatio = this._zoom / oldZoom;
            this.x = centerX - (centerX - this._x) * zoomRatio;
            this.y = centerY - (centerY - this._y) * zoomRatio;
        }
    }

    /**
     * Reset zoom to default
     */
    resetZoom() {
        this.zoom = 1;
    }

    /**
     * Center camera on world position
     */
    centerOn(worldX, worldY) {
        // Convert world to screen position
        const screenPos = this.worldToScreen(worldX, worldY);

        // Center on screen
        this.setPosition(
            screenPos.x - this.viewportWidth / 2,
            screenPos.y - this.viewportHeight / 2
        );
    }

    /**
     * Center camera on isometric position
     */
    centerOnIsometric(isoX, isoY) {
        this.setPosition(
            isoX - this.viewportWidth / 2,
            isoY - this.viewportHeight / 2
        );
    }

    /**
     * Follow a target entity
     */
    followEntity(entity, offset = { x: 0, y: 0 }) {
        this.followTarget = entity;
        this.followOffset = offset;
    }

    /**
     * Stop following target
     */
    stopFollowing() {
        this.followTarget = null;
    }

    /**
     * Start camera shake effect
     */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    /**
     * Update camera shake
     */
    updateShake(deltaTime) {
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;

            if (this.shakeDuration <= 0) {
                this.shakeOffsetX = 0;
                this.shakeOffsetY = 0;
                this.shakeIntensity = 0;
            } else {
                // Random shake offset
                this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
                this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            }
        }
    }

    /**
     * Handle edge scrolling
     */
    handleEdgeScroll(mouseX, mouseY) {
        if (!this.edgeScrollEnabled) return;

        let dx = 0;
        let dy = 0;

        // Check edges
        if (mouseX < this.edgeScrollZone) {
            dx = -this.edgeScrollSpeed;
        } else if (mouseX > this.viewportWidth - this.edgeScrollZone) {
            dx = this.edgeScrollSpeed;
        }

        if (mouseY < this.edgeScrollZone) {
            dy = -this.edgeScrollSpeed;
        } else if (mouseY > this.viewportHeight - this.edgeScrollZone) {
            dy = this.edgeScrollSpeed;
        }

        if (dx !== 0 || dy !== 0) {
            this.move(dx, dy);
        }
    }

    /**
     * Update camera (call each frame)
     */
    update(deltaTime) {
        // Update shake
        this.updateShake(deltaTime);

        // Smooth camera movement
        if (this.isSmoothing) {
            const dx = this.targetX - this._x;
            const dy = this.targetY - this._y;

            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                this.x = this._x + dx * this.smoothing;
                this.y = this._y + dy * this.smoothing;
            } else {
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }

        // Follow target
        if (this.followTarget && this.followTarget.x !== undefined) {
            const targetScreenPos = this.worldToScreen(
                this.followTarget.x,
                this.followTarget.y
            );

            const centerX = this.viewportWidth / 2;
            const centerY = this.viewportHeight / 2;

            // Check if target is outside deadzone
            const dx = targetScreenPos.x - (this._x + centerX);
            const dy = targetScreenPos.y - (this._y + centerY);

            if (Math.abs(dx) > this.followDeadzone.width / 2) {
                const moveX = dx - Math.sign(dx) * this.followDeadzone.width / 2;
                this.move(moveX * this.smoothing, 0);
            }

            if (Math.abs(dy) > this.followDeadzone.height / 2) {
                const moveY = dy - Math.sign(dy) * this.followDeadzone.height / 2;
                this.move(0, moveY * this.smoothing);
            }
        }
    }

    /**
     * Convert world coordinates to screen coordinates
     * (This is a placeholder - actual implementation depends on game's coordinate system)
     */
    worldToScreen(worldX, worldY) {
        // This would use the game's isometric conversion
        // For now, return as-is (would be overridden by game integration)
        return { x: worldX, y: worldY };
    }

    /**
     * Convert screen coordinates to world coordinates
     */
    screenToWorld(screenX, screenY) {
        // This would use the game's isometric conversion
        // For now, return as-is (would be overridden by game integration)
        return { x: screenX, y: screenY };
    }

    /**
     * Check if point is visible on screen
     */
    isVisible(x, y, margin = 50) {
        return x >= this._x - margin &&
               x <= this._x + this.viewportWidth + margin &&
               y >= this._y - margin &&
               y <= this._y + this.viewportHeight + margin;
    }

    /**
     * Check if rectangle is visible on screen
     */
    isRectVisible(x, y, width, height, margin = 50) {
        return !(x + width < this._x - margin ||
                x > this._x + this.viewportWidth + margin ||
                y + height < this._y - margin ||
                y > this._y + this.viewportHeight + margin);
    }

    /**
     * Get visible area bounds
     */
    getVisibleBounds() {
        return {
            left: this._x,
            top: this._y,
            right: this._x + this.viewportWidth,
            bottom: this._y + this.viewportHeight,
            width: this.viewportWidth,
            height: this.viewportHeight
        };
    }

    /**
     * Save camera state
     */
    exportState() {
        return {
            x: this._x,
            y: this._y,
            zoom: this._zoom,
            followTarget: this.followTarget ? this.followTarget.id : null
        };
    }

    /**
     * Load camera state
     */
    importState(state) {
        if (state.x !== undefined) this._x = state.x;
        if (state.y !== undefined) this._y = state.y;
        if (state.zoom !== undefined) this._zoom = state.zoom;
        // Follow target would need to be resolved by game
    }

    /**
     * Reset camera to default position
     */
    reset() {
        this._x = 0;
        this._y = 0;
        this._zoom = 1;
        this.targetX = 0;
        this.targetY = 0;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;
        this.followTarget = null;

        this.emit('reset');
    }

    /**
     * Add event listener
     */
    addListener(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    /**
     * Remove event listener
     */
    removeListener(event, callback) {
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
            position: { x: this._x, y: this._y },
            zoom: this._zoom,
            shake: { intensity: this.shakeIntensity, duration: this.shakeDuration },
            boundaries: {
                enabled: this.boundaryEnabled,
                min: { x: this.minX, y: this.minY },
                max: { x: this.maxX, y: this.maxY }
            },
            viewport: { width: this.viewportWidth, height: this.viewportHeight },
            following: this.followTarget ? true : false
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.CameraService = CameraService;
}