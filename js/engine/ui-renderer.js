/**
 * UIRenderer - Handles all UI overlay rendering
 *
 * This class is responsible for rendering UI elements that overlay the game view,
 * such as FPS counter, minimap, speed indicator, and help overlays.
 *
 * Design principles:
 * - Stateless rendering: Each method receives all needed data
 * - No game logic: Pure rendering functions
 * - Consistent styling: Cyberpunk aesthetic throughout
 * - Responsive positioning: Adapts to canvas size
 */

class UIRenderer {
    constructor() {
        // Initialize logger
        this.logger = window.Logger ? new window.Logger('UIRenderer') : null;

        // Cache for performance
        this.minimapCanvas = null;
        this.minimapCtx = null;

        // UI state
        this.speedIndicatorFadeTime = 0;
        this.lastSpeedUpdateTime = 0;
    }

    /**
     * Render FPS counter
     * Migrated from game-rendering.js lines 567-586
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} fps - Current FPS value
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    renderFPS(ctx, fps, canvasWidth, canvasHeight) {
        ctx.save();

        // Position in top right corner
        const x = canvasWidth - 100;
        const y = 30;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, 90, 30);

        // FPS text with color based on performance
        const fpsColor = fps >= 30 ? '#00ff00' :  // Green for good
                        fps >= 20 ? '#ffff00' :   // Yellow for okay
                        '#ff0000';                 // Red for poor

        ctx.fillStyle = fpsColor;
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`FPS: ${fps}`, x, y);

        ctx.restore();
    }

    /**
     * Render hotkey help overlay
     * Migrated from game-rendering.js lines 589-636
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} show - Whether to show the help
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {Object} customHotkeys - Optional custom hotkey list
     */
    renderHotkeyHelp(ctx, show, canvasWidth, canvasHeight, customHotkeys = null) {
        if (!show) return;

        ctx.save();

        // Position in bottom left corner
        const x = 20;
        const y = canvasHeight - 200;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 10, y - 10, 180, 190);

        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 10, y - 10, 180, 190);

        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('ACTION HOTKEYS:', x, y + 5);

        // Default hotkeys or custom ones
        const hotkeys = customHotkeys || [
            'F - Fire/Shoot',
            'G - Grenade',
            'H - Hack/Interact',
            'V - Shield',
            'T - Team Select',
            'E - 3D Mode',
            'Space - TB Mode',
            'Y - End Turn (TB)',
            'L - Squad Follow (3D)',
            'Z - Game Speed',
            '? - Toggle Help'
        ];

        // Render hotkey list
        ctx.font = '12px monospace';
        ctx.fillStyle = '#88ffff';

        hotkeys.forEach((key, index) => {
            ctx.fillText(key, x, y + 25 + index * 15);
        });

        ctx.restore();
    }

    /**
     * Render minimap
     * Migrated from game-rendering.js lines 638-747
     *
     * @param {Object} map - Map data
     * @param {Array} agents - Array of agents
     * @param {Array} enemies - Array of enemies
     * @param {HTMLElement} minimapContainer - Container element for minimap
     * @param {Object} extraction - Extraction point coordinates
     * @param {boolean} extractionEnabled - Whether extraction is enabled
     */
    renderMinimap(map, agents, enemies, minimapContainer, extraction = null, extractionEnabled = false) {
        // Skip if no container or map
        if (!minimapContainer || !map) return;

        // Create or get minimap canvas
        if (!this.minimapCanvas) {
            this.minimapCanvas = document.createElement('canvas');
            this.minimapCanvas.width = 120;
            this.minimapCanvas.height = 120;
            minimapContainer.appendChild(this.minimapCanvas);
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }

        const ctx = this.minimapCtx;
        if (!ctx) return;

        // Clear minimap
        ctx.clearRect(0, 0, 120, 120);

        // Calculate scale
        const scale = 120 / Math.max(map.width, map.height);

        // Background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 120, 120);

        // Render walls
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.tiles[y] && map.tiles[y][x] === 1) {
                    ctx.fillStyle = '#0f0f1e';
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }

        // Render agents
        agents.forEach(agent => {
            if (agent.alive) {
                // Draw agent vision cone
                ctx.save();
                ctx.translate(agent.x * scale, agent.y * scale);

                // Use agent's facing angle
                const angle = agent.facingAngle !== undefined ? agent.facingAngle : 0;
                ctx.rotate(angle);

                // Vision cone
                ctx.fillStyle = agent.selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(0, 255, 0, 0.1)';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.arc(0, 0, 30 * scale, -Math.PI / 4, Math.PI / 4);
                ctx.closePath();
                ctx.fill();

                ctx.restore();

                // Draw agent dot
                ctx.fillStyle = agent.selected ? '#00ffff' : '#00ff00';
                ctx.fillRect(
                    agent.x * scale - 2,
                    agent.y * scale - 2,
                    4, 4
                );

                // Selected agent gets a circle
                if (agent.selected) {
                    ctx.strokeStyle = '#00ffff';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(
                        agent.x * scale - 3,
                        agent.y * scale - 3,
                        6, 6
                    );
                }
            }
        });

        // Render enemies
        enemies.forEach(enemy => {
            if (enemy.alive) {
                // Enemy vision cone
                if (enemy.alertLevel > 0) {
                    ctx.save();
                    ctx.translate(enemy.x * scale, enemy.y * scale);
                    ctx.rotate(enemy.facingAngle || 0);

                    ctx.fillStyle = `rgba(255, 0, 0, ${enemy.alertLevel / 500})`;
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, enemy.visionRange * scale, -Math.PI / 4, Math.PI / 4);
                    ctx.closePath();
                    ctx.fill();

                    ctx.restore();
                }

                // Enemy dot
                const enemyColor = enemy.alertLevel > 50 ? '#ff0000' :
                                  enemy.alertLevel > 0 ? '#ff8800' : '#ff00ff';
                ctx.fillStyle = enemyColor;
                ctx.fillRect(
                    enemy.x * scale - 2,
                    enemy.y * scale - 2,
                    3, 3
                );
            }
        });

        // Render extraction point
        if (extraction) {
            ctx.save();

            // Pulsing effect
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            ctx.globalAlpha = pulse;

            // Color based on enabled state
            ctx.strokeStyle = extractionEnabled ? '#00ff00' : '#ffaa00';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                extraction.x * scale - 4,
                extraction.y * scale - 4,
                8, 8
            );

            // Center dot
            ctx.fillStyle = extractionEnabled ? '#00ff00' : '#ffaa00';
            ctx.fillRect(
                extraction.x * scale - 1,
                extraction.y * scale - 1,
                2, 2
            );

            ctx.restore();
        }
    }

    /**
     * Render speed indicator
     * Migrated from game-rendering.js lines 891-948
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} gameSpeed - Current game speed
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {boolean} forceShow - Force show the indicator
     */
    renderSpeedIndicator(ctx, gameSpeed, canvasWidth, canvasHeight, forceShow = false) {
        // Update fade time
        if (gameSpeed !== 1 || forceShow) {
            this.speedIndicatorFadeTime = 3000; // Show for 3 seconds
            this.lastSpeedUpdateTime = Date.now();
        }

        // Keep showing if speed is > 1x
        if (gameSpeed > 1) {
            this.speedIndicatorFadeTime = Math.max(this.speedIndicatorFadeTime, 1000);
        }

        // Skip if should not show
        if (gameSpeed === 1 && this.speedIndicatorFadeTime <= 0 && !forceShow) return;

        // Calculate fade
        if (this.speedIndicatorFadeTime > 0) {
            this.speedIndicatorFadeTime -= 16; // Roughly 60fps
        }

        const alpha = Math.min(1, this.speedIndicatorFadeTime / 1000);
        if (alpha <= 0 && !forceShow) return;

        ctx.save();
        ctx.globalAlpha = forceShow ? 1 : alpha;

        // Position in top-right corner below FPS
        const x = canvasWidth - 100;
        const y = 70;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 40, y - 15, 80, 30);

        // Border - different colors for different speeds
        const speedColor = gameSpeed === 1 ? '#00ffff' :     // Cyan for 1x
                          gameSpeed === 2 ? '#ffff00' :     // Yellow for 2x
                          gameSpeed === 4 ? '#ff00ff' :     // Magenta for 4x
                          gameSpeed === 8 ? '#ff8800' :     // Orange for 8x
                          '#ff0000';                        // Red for 16x

        ctx.strokeStyle = speedColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 40, y - 15, 80, 30);

        // Speed text
        ctx.fillStyle = speedColor;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${gameSpeed}x SPEED`, x, y);

        // Add pulsing effect for high speeds
        if (gameSpeed > 1) {
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
            ctx.globalAlpha = (forceShow ? 1 : alpha) * pulse * 0.5;
            ctx.strokeStyle = speedColor;
            ctx.lineWidth = 4;
            ctx.strokeRect(x - 42, y - 17, 84, 34);
        }

        ctx.restore();
    }

    /**
     * Render turn-based mode indicator
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {boolean} turnBasedMode - Whether turn-based mode is active
     * @param {Object} currentUnit - Current unit in turn
     * @param {number} actionPoints - Current unit's action points
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     */
    renderTurnBasedIndicator(ctx, turnBasedMode, currentUnit, actionPoints, canvasWidth, canvasHeight) {
        if (!turnBasedMode) return;

        ctx.save();

        // Position at top center
        const x = canvasWidth / 2;
        const y = 40;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 100, y - 20, 200, 40);

        // Border
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 100, y - 20, 200, 40);

        // Turn-based mode text
        ctx.fillStyle = '#ff00ff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TURN-BASED MODE', x, y - 5);

        // Current unit and AP
        if (currentUnit) {
            ctx.font = '12px monospace';
            ctx.fillStyle = '#ffffff';
            const unitName = currentUnit.name || 'Unknown';
            const ap = actionPoints || 0;
            ctx.fillText(`${unitName} - AP: ${ap}`, x, y + 10);
        }

        ctx.restore();
    }

    /**
     * Render mission timer
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} missionTime - Mission time in milliseconds
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {boolean} isUrgent - Whether timer should appear urgent
     */
    renderMissionTimer(ctx, missionTime, canvasWidth, canvasHeight, isUrgent = false) {
        ctx.save();

        // Position at top center-right
        const x = canvasWidth - 200;
        const y = 30;

        // Format time
        const seconds = Math.floor(missionTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, 100, 30);

        // Timer color based on urgency
        const timerColor = isUrgent ? '#ff0000' : '#00ffff';

        // Border
        if (isUrgent) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.5 + 0.5;
            ctx.strokeStyle = timerColor;
            ctx.globalAlpha = pulse;
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 10, y - 20, 100, 30);
            ctx.globalAlpha = 1;
        }

        // Timer text
        ctx.fillStyle = timerColor;
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeString, x + 40, y);

        ctx.restore();
    }

    /**
     * Render notification
     *
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {string} message - Notification message
     * @param {number} alpha - Fade alpha (0-1)
     * @param {number} canvasWidth - Canvas width
     * @param {number} canvasHeight - Canvas height
     * @param {string} type - Notification type (info, warning, error, success)
     */
    renderNotification(ctx, message, alpha, canvasWidth, canvasHeight, type = 'info') {
        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Position at center top
        const x = canvasWidth / 2;
        const y = 100;

        // Calculate text width
        ctx.font = 'bold 16px monospace';
        const textWidth = ctx.measureText(message).width;
        const boxWidth = textWidth + 40;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - boxWidth / 2, y - 20, boxWidth, 40);

        // Border color based on type
        const borderColors = {
            'info': '#00ffff',
            'warning': '#ffff00',
            'error': '#ff0000',
            'success': '#00ff00'
        };
        ctx.strokeStyle = borderColors[type] || '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - boxWidth / 2, y - 20, boxWidth, 40);

        // Message text
        ctx.fillStyle = borderColors[type] || '#00ffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, x, y);

        ctx.restore();
    }

    /**
     * Reset UI state
     * Called when starting a new mission or changing screens
     */
    reset() {
        this.speedIndicatorFadeTime = 0;
        this.lastSpeedUpdateTime = 0;

        // Clear minimap
        if (this.minimapCtx) {
            this.minimapCtx.clearRect(0, 0, 120, 120);
        }

        if (this.logger) this.logger.debug('UI state reset');
    }

    /**
     * Dispose of resources
     */
    dispose() {
        // Remove minimap canvas if it exists
        if (this.minimapCanvas && this.minimapCanvas.parentNode) {
            this.minimapCanvas.parentNode.removeChild(this.minimapCanvas);
        }
        this.minimapCanvas = null;
        this.minimapCtx = null;

        if (this.logger) this.logger.debug('UIRenderer disposed');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIRenderer;
}

if (typeof window !== 'undefined') {
    window.UIRenderer = UIRenderer;
}