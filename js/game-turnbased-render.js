// Turn-Based Mode Rendering Functions
// Handles all visual aspects of turn-based mode

// Main render function for turn-based overlays
CyberOpsGame.prototype.renderTurnBasedOverlay = function() {
    if (!this.turnBasedMode) return;

    // Ensure arrays exist
    if (!this.multiTurnPath) this.multiTurnPath = [];
    if (!this.movementPreviewTiles) this.movementPreviewTiles = [];

    // Render movement range
    this.renderMovementRange();

    // Render path preview
    this.renderPathPreview();

    // HUD elements now integrated into existing game HUD
    // Turn queue -> Squad health display with AP bars
    // Current unit info -> Objective tracker TB status
    // Action buttons -> Use existing game controls (H key, right-click, etc.)
    // REMOVED: this.renderTurnQueue();
    // REMOVED: this.renderCurrentUnitInfo();
    // REMOVED: this.renderActionButtons();

    // Render grid if enabled
    if (this.gridSnapMovement) {
        this.renderTileGrid();
    }
};

// Render movement range tiles
CyberOpsGame.prototype.renderMovementRange = function() {
    if (!this.movementPreviewTiles || this.movementPreviewTiles.length === 0) return;

    const ctx = this.ctx;
    ctx.save();

    // Use average tile size for calculations
    const tileSize = (this.tileWidth + this.tileHeight) / 2;

    this.movementPreviewTiles.forEach(tile => {
        // Calculate color based on AP cost
        const costRatio = tile.cost / (this.currentTurnUnit?.maxAp || 12);
        const green = Math.floor(255 * (1 - costRatio));
        const red = Math.floor(255 * costRatio);

        // Convert tile to world coordinates
        const worldX = tile.x * tileSize;
        const worldY = tile.y * tileSize;

        // Convert to isometric
        const iso = this.worldToIsometric(worldX, worldY);

        // Apply camera offset (ADD, not subtract)
        const screenX = iso.x + this.cameraX;
        const screenY = iso.y + this.cameraY;

        // Draw tile overlay
        ctx.fillStyle = `rgba(${red}, ${green}, 65, 0.3)`;
        ctx.strokeStyle = `rgba(${red}, ${green}, 65, 0.8)`;
        ctx.lineWidth = 2;

        // Draw isometric tile
        ctx.beginPath();
        ctx.moveTo(screenX + 32, screenY);
        ctx.lineTo(screenX + 64, screenY + 16);
        ctx.lineTo(screenX + 32, screenY + 32);
        ctx.lineTo(screenX, screenY + 16);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw AP cost
        if (tile.cost > 0) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(tile.cost.toString(), screenX + 32, screenY + 20);
        }
    });

    ctx.restore();
};

// Render path preview with multi-turn segments
CyberOpsGame.prototype.renderPathPreview = function() {
    const ctx = this.ctx;
    ctx.save();


    // Render multi-turn path segments with different colors
    if (this.multiTurnPath && this.multiTurnPath.length > 0) {
        this.multiTurnPath.forEach((segment, segmentIndex) => {
            // Set color for this turn segment with cyberpunk aesthetic
            const colors = [
                'rgba(0, 255, 128, 0.7)',   // Turn 0 - Cyber Green
                'rgba(255, 255, 0, 0.7)',   // Turn 1 - Yellow
                'rgba(255, 128, 0, 0.7)',   // Turn 2 - Orange
                'rgba(255, 0, 0, 0.7)',      // Turn 3+ - Red
            ];
            const color = colors[Math.min(segment.turn, 3)];
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 5]); // Dashed tactical line
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Add glow effect
            ctx.shadowBlur = 8;
            ctx.shadowColor = color;

            // Draw line segments between consecutive points
            for (let i = 0; i < segment.tiles.length - 1; i++) {
                const tile1 = segment.tiles[i];
                const tile2 = segment.tiles[i + 1];

                // Convert to isometric
                const iso1 = this.worldToIsometric(tile1.x, tile1.y);
                const screen1X = iso1.x + this.cameraX;  // ADD camera offset
                const screen1Y = iso1.y + this.cameraY;

                const iso2 = this.worldToIsometric(tile2.x, tile2.y);
                const screen2X = iso2.x + this.cameraX;  // ADD camera offset
                const screen2Y = iso2.y + this.cameraY;

                // Draw line segment with tactical style
                ctx.beginPath();
                ctx.moveTo(screen1X, screen1Y);
                ctx.lineTo(screen2X, screen2Y);
                ctx.stroke();

                // Draw small waypoint markers at path corners
                if (i > 0 && i < segment.tiles.length - 2) {  // Skip first and last
                    ctx.save();
                    ctx.shadowBlur = 0;
                    ctx.fillStyle = color;
                    ctx.globalAlpha = 0.5;
                    ctx.beginPath();
                    ctx.arc(screen1X, screen1Y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Draw turn markers at segment boundaries (only for multi-turn paths)
            if (segment.tiles.length > 0 && this.multiTurnPath.length > 1) {
                const lastTile = segment.tiles[segment.tiles.length - 1];
                const iso = this.worldToIsometric(lastTile.x, lastTile.y);
                const screenX = iso.x + this.cameraX;
                const screenY = iso.y + this.cameraY;

                // Draw small turn indicator
                ctx.save();
                ctx.shadowBlur = 0;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.arc(screenX, screenY - 10, 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = color;
                ctx.font = 'bold 10px Courier New';
                ctx.textAlign = 'center';
                ctx.fillText(`${segment.turn + 1}`, screenX, screenY - 7);
                ctx.restore();
            }
        });
    }

    // Clear shadow before drawing marker
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);

    // Render destination marker
    if (this.movementMarker) {
        // Marker is in world coordinates
        const iso = this.worldToIsometric(this.movementMarker.x, this.movementMarker.y);
        const screenX = iso.x + this.cameraX;  // ADD camera offset
        const screenY = iso.y + this.cameraY;

        // Draw pulsing tactical marker
        const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;

        // Outer targeting ring
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(screenX, screenY, 15, 0, Math.PI * 2);
        ctx.stroke();

        // Inner targeting ring
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw turn count indicator if multi-turn
        if (this.pendingMovement && this.pendingMovement.segments.length > 1) {
            ctx.save();
            // Background pill
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
            ctx.lineWidth = 1;
            const text = `T${this.pendingMovement.segments.length}`;
            ctx.font = 'bold 11px Courier New';
            const metrics = ctx.measureText(text);
            const pillWidth = metrics.width + 10;
            const pillHeight = 16;

            // Draw rounded rect
            ctx.beginPath();
            ctx.roundRect(screenX - pillWidth/2, screenY + 20, pillWidth, pillHeight, 3);
            ctx.fill();
            ctx.stroke();

            // Draw text
            ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
            ctx.textAlign = 'center';
            ctx.fillText(text, screenX, screenY + 31);
            ctx.restore();
        }

        // Draw action text with cyberpunk style
        ctx.save();
        ctx.shadowBlur = 5;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('CONFIRM', screenX, screenY - 25);
        ctx.restore();
    }

    ctx.restore();
};

// Render tile grid
CyberOpsGame.prototype.renderTileGrid = function() {
    const ctx = this.ctx;
    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Use average tile size
    const tileSize = (this.tileWidth + this.tileHeight) / 2;

    // Calculate visible tile range
    const startTileX = Math.max(0, Math.floor(this.cameraX / tileSize) - 2);
    const startTileY = Math.max(0, Math.floor(this.cameraY / tileSize) - 2);
    const endTileX = Math.min(this.mapWidth, startTileX + Math.ceil(this.canvas.width / tileSize) + 4);
    const endTileY = Math.min(this.mapHeight, startTileY + Math.ceil(this.canvas.height / tileSize) + 4);

    // Draw grid
    for (let y = startTileY; y < endTileY; y++) {
        for (let x = startTileX; x < endTileX; x++) {
            const worldX = x * tileSize;
            const worldY = y * tileSize;
            const iso = this.worldToIsometric(worldX, worldY);
            const screenX = iso.x - this.cameraX;
            const screenY = iso.y - this.cameraY;

            // Draw isometric tile outline
            ctx.beginPath();
            ctx.moveTo(screenX + 32, screenY);
            ctx.lineTo(screenX + 64, screenY + 16);
            ctx.lineTo(screenX + 32, screenY + 32);
            ctx.lineTo(screenX, screenY + 16);
            ctx.closePath();
            ctx.stroke();
        }
    }

    // Highlight hovered tile
    if (this.hoveredTile) {
        const tileSize = (this.tileWidth + this.tileHeight) / 2;
        const worldX = this.hoveredTile.x * tileSize;
        const worldY = this.hoveredTile.y * tileSize;
        const iso = this.worldToIsometric(worldX, worldY);
        const screenX = iso.x - this.cameraX;
        const screenY = iso.y - this.cameraY;

        ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + 32, screenY);
        ctx.lineTo(screenX + 64, screenY + 16);
        ctx.lineTo(screenX + 32, screenY + 32);
        ctx.lineTo(screenX, screenY + 16);
        ctx.closePath();
        ctx.stroke();
    }

    ctx.restore();
};

// Render turn queue UI
CyberOpsGame.prototype.renderTurnQueue = function() {
    const ctx = this.ctx;
    ctx.save();

    // Background panel
    const panelX = 10;
    const panelY = 100;
    const panelWidth = 250;
    const panelHeight = Math.min(200, this.turnQueue.length * 35 + 10);

    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Title
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('TURN ORDER', panelX + 10, panelY + 20);

    // Turn queue entries
    let y = panelY + 35;
    const maxDisplay = 5;

    for (let i = 0; i < Math.min(maxDisplay, this.turnQueue.length); i++) {
        const entry = this.turnQueue[i];
        const isCurrent = i === this.currentTurnIndex;

        // Highlight current turn
        if (isCurrent) {
            ctx.fillStyle = 'rgba(0, 255, 65, 0.2)';
            ctx.fillRect(panelX + 5, y - 12, panelWidth - 10, 25);
        }

        // Unit icon/marker
        ctx.fillStyle = entry.team === 'player' ? '#00ff41' :
                        entry.team === 'enemy' ? '#ff073a' : '#ffaa00';
        ctx.fillRect(panelX + 10, y - 8, 8, 16);

        // Unit name
        ctx.fillStyle = isCurrent ? '#00ff41' : '#88ff88';
        ctx.font = isCurrent ? 'bold 12px Courier New' : '12px Courier New';
        const name = entry.unit.name || entry.type.toUpperCase();
        ctx.fillText(name, panelX + 25, y);

        // AP bar
        const barX = panelX + 150;
        const barWidth = 80;
        const apRatio = entry.ap / entry.maxAp;

        ctx.strokeStyle = '#00ff41';
        ctx.strokeRect(barX, y - 8, barWidth, 12);

        ctx.fillStyle = `rgba(0, 255, 65, ${0.3 + apRatio * 0.7})`;
        ctx.fillRect(barX, y - 8, barWidth * apRatio, 12);

        // AP text
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(`${entry.ap}/${entry.maxAp}`, barX + barWidth / 2, y);
        ctx.textAlign = 'left';

        y += 30;
    }

    ctx.restore();
};

// Render current unit info panel
CyberOpsGame.prototype.renderCurrentUnitInfo = function() {
    if (!this.currentTurnUnit) return;

    const ctx = this.ctx;
    ctx.save();

    // Position at top right
    const panelX = this.canvas.width - 260;
    const panelY = 10;
    const panelWidth = 250;
    const panelHeight = 100;

    // Background
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = this.currentTurnUnit.team === 'player' ? '#00ff41' : '#ff073a';
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Current turn label
    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('CURRENT TURN', panelX + 10, panelY + 20);

    // Unit name
    const unit = this.currentTurnUnit.unit;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Courier New';
    ctx.fillText(unit.name || this.currentTurnUnit.type.toUpperCase(), panelX + 10, panelY + 45);

    // AP display
    ctx.font = '14px Courier New';
    ctx.fillStyle = '#00ff41';
    ctx.fillText(`AP: ${this.currentTurnUnit.ap}/${this.currentTurnUnit.maxAp}`, panelX + 10, panelY + 70);

    // Health if available
    if (unit.health !== undefined) {
        const healthRatio = unit.health / (unit.maxHealth || 100);
        ctx.fillText(`HP: ${unit.health}/${unit.maxHealth || 100}`, panelX + 120, panelY + 70);

        // Health bar
        ctx.strokeStyle = '#ff073a';
        ctx.strokeRect(panelX + 10, panelY + 80, 230, 10);
        ctx.fillStyle = `rgba(255, ${Math.floor(255 * healthRatio)}, 0, 0.8)`;
        ctx.fillRect(panelX + 10, panelY + 80, 230 * healthRatio, 10);
    }

    ctx.restore();
};

// Render action buttons
CyberOpsGame.prototype.renderActionButtons = function() {
    if (!this.currentTurnUnit || this.currentTurnUnit.team !== 'player') return;

    const ctx = this.ctx;
    ctx.save();

    // Position at bottom right
    const buttonWidth = 100;
    const buttonHeight = 30;
    const spacing = 10;
    const startX = this.canvas.width - (buttonWidth + 20);
    const startY = this.canvas.height - 200;

    const buttons = [
        { label: 'MOVE', action: 'move', cost: 1, enabled: this.currentTurnUnit.ap >= 1 },
        { label: 'SHOOT', action: 'shoot', cost: this.actionCosts.shoot, enabled: this.currentTurnUnit.ap >= this.actionCosts.shoot },
        { label: 'ABILITY', action: 'ability', cost: this.actionCosts.ability, enabled: this.currentTurnUnit.ap >= this.actionCosts.ability },
        { label: 'OVERWATCH', action: 'overwatch', cost: this.actionCosts.overwatch, enabled: this.currentTurnUnit.ap >= this.actionCosts.overwatch },
        { label: 'END TURN', action: 'endTurn', cost: 0, enabled: true }
    ];

    buttons.forEach((button, index) => {
        const y = startY + index * (buttonHeight + spacing);

        // Button background
        ctx.fillStyle = button.enabled ? 'rgba(0, 255, 65, 0.2)' : 'rgba(128, 128, 128, 0.2)';
        ctx.fillRect(startX, y, buttonWidth, buttonHeight);

        // Button border
        ctx.strokeStyle = button.enabled ? '#00ff41' : '#888888';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, y, buttonWidth, buttonHeight);

        // Button text
        ctx.fillStyle = button.enabled ? '#00ff41' : '#888888';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(button.label, startX + buttonWidth / 2, y + 15);

        // AP cost
        if (button.cost > 0) {
            ctx.font = '10px Courier New';
            ctx.fillText(`${button.cost} AP`, startX + buttonWidth / 2, y + 25);
        }
    });

    // Instructions
    ctx.fillStyle = '#88ff88';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('[SPACE] Toggle Turn-Based', 10, this.canvas.height - 40);
    ctx.fillText('[G] Toggle Grid Snap', 10, this.canvas.height - 25);
    ctx.fillText('[TAB] End Turn', 10, this.canvas.height - 10);

    ctx.restore();
};

// Render turn-based mode indicator
CyberOpsGame.prototype.renderTurnBasedIndicator = function() {
    if (!this.turnBasedMode) return;

    const ctx = this.ctx;
    ctx.save();

    // Mode indicator
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(this.canvas.width / 2 - 100, 10, 200, 30);

    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.canvas.width / 2 - 100, 10, 200, 30);

    ctx.fillStyle = '#00ff41';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('TURN-BASED MODE', this.canvas.width / 2, 30);

    // Round counter
    ctx.font = '12px Courier New';
    ctx.fillText(`Round ${this.turnRound || 1}`, this.canvas.width / 2, 50);

    ctx.restore();
};

console.log('🎨 Turn-based rendering system loaded');