/**
 * CoordinateService - Single source of truth for all coordinate transformations
 *
 * Handles conversions between:
 * - World coordinates (game logic, agents, enemies)
 * - Isometric coordinates (2D rendering without camera)
 * - Screen coordinates (final pixel positions with camera and zoom)
 *
 * ARCHITECTURE: This service is stateless for core transformations.
 * Camera state is passed as parameters to avoid coupling to game object.
 */

class CoordinateService {
    constructor() {
        // Default tile dimensions (can be overridden per campaign)
        this.tileWidth = 64;
        this.tileHeight = 32;

        // Logger
        this.logger = window.Logger ? new window.Logger('CoordinateService') : null;

        if (this.logger) this.logger.debug('CoordinateService initialized');
    }

    /**
     * Configure tile dimensions (call when loading campaign)
     */
    configure(tileWidth = 64, tileHeight = 32) {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        if (this.logger) this.logger.debug(`Configured tile dimensions: ${tileWidth}x${tileHeight}`);
    }

    // ========== CORE TRANSFORMATIONS (Stateless) ==========

    /**
     * Convert world coordinates to isometric screen space (no camera)
     * This is the fundamental transformation for 2D isometric rendering.
     *
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @returns {{x: number, y: number}} Isometric screen position
     */
    worldToIsometric(x, y) {
        return {
            x: (x - y) * this.tileWidth / 2,
            y: (x + y) * this.tileHeight / 2
        };
    }

    /**
     * Convert isometric screen coordinates to world coordinates
     * Inverse of worldToIsometric.
     *
     * @param {number} isoX - Isometric X coordinate
     * @param {number} isoY - Isometric Y coordinate
     * @returns {{x: number, y: number}} World position
     */
    isometricToWorld(isoX, isoY) {
        return {
            x: (isoX / (this.tileWidth / 2) + isoY / (this.tileHeight / 2)) / 2,
            y: (isoY / (this.tileHeight / 2) - isoX / (this.tileWidth / 2)) / 2
        };
    }

    // ========== CAMERA-AWARE TRANSFORMATIONS ==========

    /**
     * Convert world coordinates to final screen pixel position
     * Applies isometric transformation, camera offset, and zoom.
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} cameraX - Camera X offset
     * @param {number} cameraY - Camera Y offset
     * @param {number} zoom - Zoom level (default 1)
     * @returns {{x: number, y: number}} Screen pixel position
     */
    worldToScreen(worldX, worldY, cameraX, cameraY, zoom = 1) {
        const iso = this.worldToIsometric(worldX, worldY);
        return {
            x: iso.x * zoom + cameraX,
            y: iso.y * zoom + cameraY
        };
    }

    /**
     * Convert screen pixel position to world coordinates
     * Inverse of worldToScreen.
     *
     * @param {number} screenX - Screen X pixel
     * @param {number} screenY - Screen Y pixel
     * @param {number} cameraX - Camera X offset
     * @param {number} cameraY - Camera Y offset
     * @param {number} zoom - Zoom level (default 1)
     * @returns {{x: number, y: number}} World position
     */
    screenToWorld(screenX, screenY, cameraX, cameraY, zoom = 1) {
        // Remove camera and zoom to get isometric coordinates
        const isoX = (screenX - cameraX) / zoom;
        const isoY = (screenY - cameraY) / zoom;
        // Convert isometric to world
        return this.isometricToWorld(isoX, isoY);
    }

    /**
     * Convert screen coordinates to isometric (intermediate step)
     * Removes camera and zoom but doesn't convert to world.
     *
     * @param {number} screenX - Screen X pixel
     * @param {number} screenY - Screen Y pixel
     * @param {number} cameraX - Camera X offset
     * @param {number} cameraY - Camera Y offset
     * @param {number} zoom - Zoom level (default 1)
     * @returns {{x: number, y: number}} Isometric position
     */
    screenToIsometric(screenX, screenY, cameraX, cameraY, zoom = 1) {
        return {
            x: (screenX - cameraX) / zoom,
            y: (screenY - cameraY) / zoom
        };
    }

    // ========== OVERLAY RENDERING HELPERS ==========

    /**
     * Get screen position for overlay rendering AFTER ctx.restore()
     *
     * CRITICAL: When rendering overlays after ctx.restore(), camera offset
     * must be ADDED (not subtracted) because the canvas transform is no longer active.
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} cameraX - Camera X offset
     * @param {number} cameraY - Camera Y offset
     * @returns {{x: number, y: number}} Screen position for post-restore rendering
     */
    worldToScreenPostRestore(worldX, worldY, cameraX, cameraY) {
        const iso = this.worldToIsometric(worldX, worldY);
        // ADD camera offset for post-restore rendering
        return {
            x: iso.x + cameraX,
            y: iso.y + cameraY
        };
    }

    /**
     * Get screen position for overlay rendering DURING active camera transform
     * Use this when rendering between ctx.save() and ctx.restore().
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{x: number, y: number}} Screen position (camera already applied via transform)
     */
    worldToScreenDuringTransform(worldX, worldY) {
        // Just isometric conversion - camera is handled by canvas transform
        return this.worldToIsometric(worldX, worldY);
    }

    // ========== TILE HELPERS ==========

    /**
     * Snap world coordinates to tile center
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{x: number, y: number}} Tile-centered world position
     */
    snapToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX) + 0.5,
            y: Math.floor(worldY) + 0.5
        };
    }

    /**
     * Get tile coordinates from world position
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @returns {{x: number, y: number}} Tile indices
     */
    worldToTile(worldX, worldY) {
        return {
            x: Math.floor(worldX),
            y: Math.floor(worldY)
        };
    }

    /**
     * Get tile center in world coordinates
     *
     * @param {number} tileX - Tile X index
     * @param {number} tileY - Tile Y index
     * @returns {{x: number, y: number}} World position of tile center
     */
    tileToWorld(tileX, tileY) {
        return {
            x: tileX + 0.5,
            y: tileY + 0.5
        };
    }

    // ========== DISTANCE HELPERS ==========

    /**
     * Calculate world distance between two points
     *
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Euclidean distance
     */
    worldDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate Manhattan distance (tile-based)
     *
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Manhattan distance
     */
    tileDistance(x1, y1, x2, y2) {
        return Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }

    // ========== 3D CONVERSION HELPERS ==========

    /**
     * Convert world coordinates to 3D space
     *
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} mapWidth - Map width for centering
     * @param {number} mapHeight - Map height for centering
     * @returns {{x: number, y: number, z: number}} 3D position
     */
    worldTo3D(worldX, worldY, mapWidth = 80, mapHeight = 80) {
        return {
            x: worldX - mapWidth / 2,
            y: 0, // Ground level
            z: worldY - mapHeight / 2
        };
    }

    /**
     * Convert 3D coordinates back to world
     *
     * @param {number} x3d - 3D X coordinate
     * @param {number} z3d - 3D Z coordinate
     * @param {number} mapWidth - Map width for centering
     * @param {number} mapHeight - Map height for centering
     * @returns {{x: number, y: number}} World position
     */
    threeDToWorld(x3d, z3d, mapWidth = 80, mapHeight = 80) {
        return {
            x: x3d + mapWidth / 2,
            y: z3d + mapHeight / 2
        };
    }

    // ========== BOUNDS CHECKING ==========

    /**
     * Check if world coordinates are within map bounds
     *
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} mapWidth - Map width
     * @param {number} mapHeight - Map height
     * @returns {boolean} True if within bounds
     */
    isInBounds(x, y, mapWidth, mapHeight) {
        return x >= 0 && x < mapWidth && y >= 0 && y < mapHeight;
    }

    /**
     * Clamp world coordinates to map bounds
     *
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} mapWidth - Map width
     * @param {number} mapHeight - Map height
     * @returns {{x: number, y: number}} Clamped position
     */
    clampToBounds(x, y, mapWidth, mapHeight) {
        return {
            x: Math.max(0, Math.min(mapWidth - 1, x)),
            y: Math.max(0, Math.min(mapHeight - 1, y))
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CoordinateService;
}

// Make available globally
window.CoordinateService = CoordinateService;
