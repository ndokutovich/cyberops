    // 2D Background Effects
CyberOpsGame.prototype.init2DBackgroundEffects = function() {
        // Initialize background particles for 2D mode
        this.bgParticles2D = [];
        const particleCount = 50;

        for (let i = 0; i < particleCount; i++) {
            this.bgParticles2D.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 3 + 1,
                color: Math.random() > 0.5 ? '#00ffff' : '#ff00ff',
                opacity: Math.random() * 0.5 + 0.3
            });
        }
}

CyberOpsGame.prototype.render2DBackgroundEffects = function() {
        const ctx = this.ctx;

        // Initialize particles if not already done
        if (!this.bgParticles2D) {
            this.init2DBackgroundEffects();
        }

        // Draw grid pattern with parallax effect (moves slower than camera)
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 0.5;

        const gridSize = 50;
        const parallaxFactor = 0.3; // Grid moves at 30% of camera speed
        const offsetX = (this.cameraX * parallaxFactor) % gridSize;
        const offsetY = (this.cameraY * parallaxFactor) % gridSize;

        // Draw vertical lines
        for (let x = offsetX - gridSize; x < this.canvas.width + gridSize; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = offsetY - gridSize; y < this.canvas.height + gridSize; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();

        // Draw and update particles with parallax
        const particleParallax = 0.5; // Particles move at 50% of camera speed

        this.bgParticles2D.forEach(particle => {
            // Update particle position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Wrap around screen edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Draw particle with parallax offset
            const drawX = particle.x + (this.cameraX * particleParallax);
            const drawY = particle.y + (this.cameraY * particleParallax);

            ctx.save();
            ctx.globalAlpha = particle.opacity;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = particle.color;

            ctx.beginPath();
            ctx.arc(drawX, drawY, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        // Draw corner glows
        const time = Date.now() * 0.001;
        const corners = [
            { x: 0, y: 0 },
            { x: this.canvas.width, y: 0 },
            { x: 0, y: this.canvas.height },
            { x: this.canvas.width, y: this.canvas.height }
        ];

        corners.forEach((corner, index) => {
            const opacity = 0.1 + Math.sin(time * 2 + index) * 0.05;
            const size = 150 + Math.sin(time * 3 + index) * 30;

            ctx.save();
            ctx.globalAlpha = opacity;

            const gradient = ctx.createRadialGradient(corner.x, corner.y, 0, corner.x, corner.y, size);
            gradient.addColorStop(0, '#00ffff');
            gradient.addColorStop(0.5, '#00ffff40');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(corner.x - size, corner.y - size, size * 2, size * 2);
            ctx.restore();
        });
}

    // Rendering
// IMPORTANT: This render function is now handled by RenderingService
// The old 400+ line implementation has been removed
// game-services-integration.js overrides this at runtime
CyberOpsGame.prototype.render = function() {
    // This function is overridden by game-services-integration.js
    // which routes to RenderingService.renderFrame()
    console.warn('⚠️ Base render() called - should be overridden by services integration');
}

// ============= OLD RENDER CODE REMOVED =============
// The following 400+ lines of rendering code have been moved to RenderingService
// This includes: map rendering, agent rendering, projectiles, effects, HUD, etc.
// All helper methods below are preserved and used by RenderingService
// ===================================================

// PLACEHOLDER - Old render body was here (lines removed)
    
CyberOpsGame.prototype.renderMap = function() {
        const ctx = this.ctx;

        // Debug log once per toggle (commented out to reduce spam)
        // if (this._lastFogState !== this.fogEnabled) {
        //     console.log('RenderMap - fogEnabled:', this.fogEnabled);
        //     this._lastFogState = this.fogEnabled;
        // }

        // Safety check for map tiles
        if (!this.map.tiles || this.map.tiles.length === 0) {
            console.error('❌ Map tiles not initialized in renderMap!', {
                map: this.map,
                hasTiles: !!this.map.tiles,
                tilesLength: this.map.tiles ? this.map.tiles.length : 0
            });
            return;
        }

        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (!this.map.tiles[y]) {
                    console.error(`❌ Map tiles row ${y} is undefined!`);
                    continue;
                }
                const tile = this.map.tiles[y][x];
                const isoPos = this.worldToIsometric(x, y);
                
                ctx.save();
                ctx.translate(isoPos.x, isoPos.y);
                
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.tileWidth / 2, this.tileHeight / 2);
                ctx.lineTo(0, this.tileHeight);
                ctx.lineTo(-this.tileWidth / 2, this.tileHeight / 2);
                ctx.closePath();
                
                if (tile === 0) {
                    // Walkable floor - MUCH brighter when fog is disabled
                    // Make it even MORE obvious with cyan tint when fog is off
                    ctx.fillStyle = this.fogEnabled ? '#1a1a2e' : '#6a8ace';
                    ctx.fill();
                    ctx.strokeStyle = this.fogEnabled ? '#16213e' : '#80a0ff';

                    // Add stronger glow when fog is disabled
                    if (!this.fogEnabled) {
                        ctx.shadowColor = '#8888ff';
                        ctx.shadowBlur = 4;
                    }
                } else {
                    // Wall - also MUCH brighter when fog is disabled
                    ctx.fillStyle = this.fogEnabled ? '#0f0f1e' : '#4a4a8e';
                    ctx.fill();
                    ctx.strokeStyle = this.fogEnabled ? '#2a2a3e' : '#6060a0';
                    ctx.fillStyle = this.fogEnabled ? '#1f1f3e' : '#5555aa';
                    ctx.fillRect(-this.tileWidth / 2, -20, this.tileWidth, 20);

                    // Add stronger glow when fog is disabled
                    if (!this.fogEnabled) {
                        ctx.shadowColor = '#aaaaff';
                        ctx.shadowBlur = 5;
                    }
                }

                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                ctx.restore();
            }
        }
}
    
CyberOpsGame.prototype.renderCover = function(x, y) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.fillStyle = '#2a4a6a';
        ctx.fillRect(-15, -10, 30, 20);
        
        ctx.beginPath();
        ctx.moveTo(-15, -10);
        ctx.lineTo(0, -20);
        ctx.lineTo(15, -10);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fillStyle = '#3a5a7a';
        ctx.fill();
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderTerminal = function(x, y, hacked) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.fillStyle = hacked ? '#00ff00' : '#ff0000';
        ctx.fillRect(-10, -20, 20, 25);
        
        ctx.fillStyle = hacked ? '#00ff0044' : '#ff000044';
        ctx.fillRect(-8, -18, 16, 10);
        
        ctx.shadowColor = hacked ? '#00ff00' : '#ff0000';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = hacked ? '#00ff00' : '#ff0000';
        ctx.strokeRect(-10, -20, 20, 25);
        
        ctx.restore();
}
    
// Render fog of war overlay
CyberOpsGame.prototype.renderFogOfWar = function() {
        if (!this.fogOfWar || !this.fogEnabled) {
            return; // Skip rendering when fog is disabled
        }

        const ctx = this.ctx;

        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const fogState = this.fogOfWar[y][x];

                if (fogState === 0) {
                    // Unexplored - fully dark (black)
                    const isoPos = this.worldToIsometric(x + 0.5, y + 0.5);
                    ctx.save();
                    ctx.translate(isoPos.x, isoPos.y);
                    ctx.fillStyle = 'rgba(0, 0, 0, 1)';  // Completely black
                    ctx.fillRect(-this.tileWidth/2, -this.tileHeight, this.tileWidth, this.tileHeight * 2);
                    ctx.restore();
                } else if (fogState === 1) {
                    // Explored but not visible - very light blue tint for visibility
                    const isoPos = this.worldToIsometric(x + 0.5, y + 0.5);
                    ctx.save();
                    ctx.translate(isoPos.x, isoPos.y);
                    ctx.fillStyle = 'rgba(10, 20, 40, 0.15)';  // Very transparent dark blue - only 15% opacity
                    ctx.fillRect(-this.tileWidth/2, -this.tileHeight, this.tileWidth, this.tileHeight * 2);
                    ctx.restore();
                }
                // fogState === 2 is fully visible, no overlay needed
            }
        }
}

// Render door
CyberOpsGame.prototype.renderDoor = function(x, y, locked) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        if (locked) {
            // Locked door - red
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(-15, -30, 30, 35);

            ctx.fillStyle = '#aa0000';
            ctx.fillRect(-12, -28, 24, 10);

            // Lock symbol
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -15, 5, Math.PI, 0);
            ctx.stroke();
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(-8, -15, 16, 12);
        } else {
            // Open door - green
            ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            ctx.fillRect(-15, -30, 30, 35);

            ctx.strokeStyle = '#00ff00';
            ctx.strokeRect(-15, -30, 30, 35);
        }

        ctx.restore();
}

// Render agent path for debugging
CyberOpsGame.prototype.renderPath = function(path, currentIndex = 0, agentColor = '#00ff00') {
        if (!path || path.length < 2) return;

        const ctx = this.ctx;
        ctx.save();

        // Parse the agent's color and create a semi-transparent version
        const color = agentColor || '#00ff00';

        // Draw path line using agent's color
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const pos = this.worldToIsometric(path[i].x, path[i].y);
            if (i === 0) {
                ctx.moveTo(pos.x, pos.y);
            } else {
                ctx.lineTo(pos.x, pos.y);
            }
        }
        ctx.stroke();

        // Draw waypoints
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        for (let i = 0; i < path.length; i++) {
            const pos = this.worldToIsometric(path[i].x, path[i].y);

            if (i < currentIndex) {
                // Visited waypoints - gray
                ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            } else if (i === currentIndex) {
                // Current waypoint - bright agent color
                ctx.fillStyle = color;
                ctx.globalAlpha = 1;
            } else {
                // Future waypoints - agent color faded
                ctx.fillStyle = color;
                ctx.globalAlpha = 0.6;
            }

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
}

// Render collectable item
CyberOpsGame.prototype.renderCollectable = function(x, y, type) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Pulse effect
        const pulse = Math.sin(this.missionTimer * 0.1) * 0.3 + 0.7;

        // Check if type is an emoji sprite
        if (type && (type.length <= 2 || type.includes('💰') || type.includes('📄') || type.includes('💵'))) {
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = pulse;
            ctx.fillText(type, 0, -10);
            ctx.restore();
            return;
        }

        // Draw based on type
        switch(type) {
            case 'credits':
                ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('$', 0, -10);
                break;

            case 'ammo':
                ctx.fillStyle = `rgba(200, 200, 200, ${pulse})`;
                ctx.fillRect(-5, -15, 10, 15);
                ctx.fillStyle = `rgba(255, 200, 0, ${pulse})`;
                ctx.fillRect(-3, -18, 6, 3);
                break;

            case 'health':
                ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
                ctx.fillRect(-8, -12, 16, 6);
                ctx.fillRect(-3, -17, 6, 16);
                break;

            case 'keycard':
                ctx.fillStyle = `rgba(0, 255, 255, ${pulse})`;
                ctx.fillRect(-6, -10, 12, 8);
                ctx.fillStyle = 'black';
                ctx.fillRect(-4, -8, 8, 2);
                break;

            case 'intel':
                ctx.fillStyle = `rgba(128, 0, 255, ${pulse})`;
                ctx.beginPath();
                ctx.arc(0, -10, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'white';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('i', 0, -7);
                break;

            case 'armor':
                ctx.fillStyle = `rgba(100, 100, 255, ${pulse})`;
                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(-8, -10);
                ctx.lineTo(-8, 0);
                ctx.lineTo(0, 5);
                ctx.lineTo(8, 0);
                ctx.lineTo(8, -10);
                ctx.closePath();
                ctx.fill();
                break;

            case 'explosives':
                ctx.fillStyle = `rgba(255, 100, 0, ${pulse})`;
                ctx.beginPath();
                ctx.arc(0, -10, 6, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -16);
                ctx.lineTo(0, -20);
                ctx.stroke();
                break;
        }

        // Glow effect
        ctx.shadowColor = type === 'credits' ? 'gold' :
                         type === 'health' ? 'red' :
                         type === 'intel' ? 'purple' : 'cyan';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -10, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
}

CyberOpsGame.prototype.renderExtractionPoint = function(x, y) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        const pulse = Math.sin(this.missionTimer * 0.05) * 0.3 + 0.7;
        
        ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = `rgba(0, 255, 255, ${pulse * 0.3})`;
        ctx.fill();
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', 0, 0);
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderAgent = function(agent) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(agent.x, agent.y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Draw body and selection WITHOUT rotation
        if (agent.selected) {
            // Pulsing selection ring for selected agents
            const pulse = Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.stroke();

            // Inner ring
            ctx.lineWidth = 2;
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();

            // Selection indicator on ground
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-15, -5, 30, 20);
            ctx.setLineDash([]);
        }

        if (agent.shield > 0) {
            ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(0, -10, 25, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = '#4a7c8c';
        ctx.fillRect(-10, -25, 20, 30);

        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-8, -23, 16, 5);

        // Now apply rotation ONLY for vision cone and direction indicator
        ctx.save();
        // Add 90 degrees (PI/2) to agent facing angle, then adjust for isometric view
        const isoAngle = (agent.facingAngle || 0) + Math.PI/2 - Math.PI/4; // +90 degrees then adjust for isometric
        ctx.rotate(isoAngle);

        // Draw vision cone
        ctx.fillStyle = agent.selected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(0, 255, 255, 0.1)';
        ctx.strokeStyle = agent.selected ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 60, -Math.PI/4, Math.PI/4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw direction indicator (small triangle pointing forward)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(10, -3);
        ctx.lineTo(10, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // Restore from rotation
        
        if (agent.health < agent.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-15, -35, 30, 4);
            
            const healthPercent = agent.health / agent.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : 
                            healthPercent > 0.25 ? '#ffff00' : '#ff0000';
            ctx.fillRect(-15, -35, 30 * healthPercent, 4);
        }
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderEnemy = function(enemy) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(enemy.x, enemy.y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Draw body and alert indicator WITHOUT rotation
        if (enemy.alertLevel > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${enemy.alertLevel / 100})`;
            ctx.beginPath();
            ctx.arc(0, -30, 5, 0, Math.PI * 2);
            ctx.fill();

            if (enemy.alertLevel > 50) {
                ctx.fillStyle = '#ff0000';
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('!', 0, -27);
            }
        }

        ctx.fillStyle = '#8c4a4a';
        ctx.fillRect(-10, -25, 20, 30);

        ctx.fillStyle = '#ff0000';
        ctx.fillRect(-8, -23, 16, 5);

        // Now apply rotation ONLY for vision cone and direction indicator
        ctx.save();
        const isoAngle = (enemy.facingAngle || 0) - Math.PI/4; // Adjust for isometric view
        ctx.rotate(isoAngle);

        // Draw vision cone
        if (enemy.alertLevel < 50) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, enemy.visionRange * 20, -Math.PI / 4, Math.PI / 4);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }

        // Draw direction indicator (small triangle pointing forward)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(10, -3);
        ctx.lineTo(10, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // Restore from rotation
        
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(-15, -35, 30, 4);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(-15, -35, 30 * (enemy.health / enemy.maxHealth), 4);
        }
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderProjectile = function(proj) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(proj.x, proj.y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        ctx.strokeStyle = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const trailPos = this.worldToIsometric(
            proj.x - (proj.targetX - proj.x) * 0.1,
            proj.y - (proj.targetY - proj.y) * 0.1
        );
        ctx.lineTo(trailPos.x - isoPos.x, trailPos.y - isoPos.y);
        ctx.stroke();
        
        ctx.shadowColor = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = proj.hostile ? '#ff0000' : '#00ffff';
        ctx.beginPath();
        ctx.arc(0, -10, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderEffect = function(effect) {
        const ctx = this.ctx;
        
        if (effect.type === 'explosion') {
            const isoPos = this.worldToIsometric(effect.x, effect.y);
            
            ctx.save();
            ctx.translate(isoPos.x, isoPos.y);
            
            const progress = effect.frame / effect.duration;
            const radius = effect.radius * 20 * (1 + progress);
            const opacity = 1 - progress;
            
            ctx.fillStyle = `rgba(255, 100, 0, ${opacity * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 200, 0, ${opacity})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = `rgba(255, 255, 0, ${opacity})`;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else if (effect.type === 'hack') {
            const isoPos = this.worldToIsometric(effect.x, effect.y);
            
            ctx.save();
            ctx.translate(isoPos.x, isoPos.y);
            
            const progress = effect.frame / effect.duration;
            ctx.strokeStyle = `rgba(0, 255, 0, ${1 - progress})`;
            ctx.lineWidth = 2;
            
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(0, -20, 10 + i * 10 * progress, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.fillStyle = `rgba(0, 255, 0, ${1 - progress})`;
            ctx.font = '10px monospace';
            ctx.fillText('01001', -20, -30 - progress * 20);
            ctx.fillText('11010', 10, -25 - progress * 15);
            
            ctx.restore();
        } else if (effect.type === 'shield') {
            const agent = this.agents.find(a => a.id === effect.target);
            if (agent) {
                const isoPos = this.worldToIsometric(agent.x, agent.y);
                
                ctx.save();
                ctx.translate(isoPos.x, isoPos.y);
                
                const pulse = Math.sin(effect.frame * 0.1) * 0.2 + 0.8;
                ctx.strokeStyle = `rgba(0, 255, 255, ${pulse * 0.5})`;
                ctx.lineWidth = 2;
                
                ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i;
                    const x = Math.cos(angle) * 25;
                    const y = Math.sin(angle) * 15 - 10;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.closePath();
                ctx.stroke();
                
                ctx.restore();
            }
        }
}
    
// Render FPS counter
CyberOpsGame.prototype.renderFPS = function() {
        const ctx = this.ctx;
        ctx.save();

        // Position in top right corner
        const x = this.canvas.width - 100;
        const y = 30;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, 90, 30);

        // FPS text
        const fpsColor = this.fps >= 30 ? '#00ff00' : this.fps >= 20 ? '#ffff00' : '#ff0000';
        ctx.fillStyle = fpsColor;
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`FPS: ${this.fps}`, x, y);

        ctx.restore();
}

// Render hotkey help overlay
CyberOpsGame.prototype.renderHotkeyHelp = function() {
        // Toggle help with '?' key or show when first starting
        if (!this.showHotkeyHelp) return;

        const ctx = this.ctx;
        ctx.save();

        // Position in bottom left corner
        const x = 20;
        const y = this.canvas.height - 200;

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

        // Hotkeys
        ctx.font = '12px monospace';
        ctx.fillStyle = '#88ffff';
        const hotkeys = [
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

        hotkeys.forEach((key, index) => {
            ctx.fillText(key, x, y + 25 + index * 15);
        });

        ctx.restore();
}

CyberOpsGame.prototype.renderMinimap = function() {
        const minimap = document.getElementById('minimapContent');
        
        if (!this.minimapCanvas) {
            this.minimapCanvas = document.createElement('canvas');
            this.minimapCanvas.width = 120;
            this.minimapCanvas.height = 120;
            minimap.appendChild(this.minimapCanvas);
            this.minimapCtx = this.minimapCanvas.getContext('2d');
        }
        
        const mctx = this.minimapCtx;
        mctx.clearRect(0, 0, 120, 120);
        
        if (!this.map) return;
        
        const scale = 120 / Math.max(this.map.width, this.map.height);
        
        mctx.fillStyle = '#1a1a2e';
        mctx.fillRect(0, 0, 120, 120);
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.tiles[y][x] === 1) {
                    mctx.fillStyle = '#0f0f1e';
                    mctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        this.agents.forEach(agent => {
            if (agent.alive) {
                // Draw agent vision cone first (behind the agent)
                mctx.save();
                mctx.translate(agent.x * scale, agent.y * scale);

                // Use the agent's stored facing angle
                const angle = agent.facingAngle !== undefined ? agent.facingAngle : 0;

                // Debug: log angle for selected agent
                if (agent.selected && Math.random() < 0.05) {
                    // Removed debug logging for vision cone
                }

                mctx.rotate(angle);

                // Draw vision cone - cyan for selected, dim cyan for others
                mctx.fillStyle = agent.selected ?
                    'rgba(0, 255, 255, 0.2)' : 'rgba(74, 124, 140, 0.15)';
                mctx.beginPath();
                mctx.moveTo(0, 0);
                // Agent vision cone (25 pixel radius, 90 degree arc)
                mctx.arc(0, 0, 25, -Math.PI/4, Math.PI/4);
                mctx.closePath();
                mctx.fill();

                mctx.restore();

                // Draw agent dot
                mctx.fillStyle = agent.selected ? '#00ffff' : '#4a7c8c';
                mctx.fillRect(agent.x * scale - 2, agent.y * scale - 2, 4, 4);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                // Draw enemy vision cone first (behind the enemy)
                mctx.save();
                mctx.translate(enemy.x * scale, enemy.y * scale);

                // Use the enemy's stored facing angle
                const angle = enemy.facingAngle || 0;

                mctx.rotate(angle);

                // Draw vision cone - red when alert, dim red when patrolling
                mctx.fillStyle = enemy.alertLevel > 0 ?
                    'rgba(255, 0, 0, 0.3)' : 'rgba(140, 74, 74, 0.2)';
                mctx.beginPath();
                mctx.moveTo(0, 0);
                // Smaller cone for enemies (20 pixel radius, 60 degree arc)
                mctx.arc(0, 0, 20, -Math.PI/6, Math.PI/6);
                mctx.closePath();
                mctx.fill();

                mctx.restore();

                // Draw enemy dot
                mctx.fillStyle = enemy.alertLevel > 0 ? '#ff0000' : '#8c4a4a';
                mctx.fillRect(enemy.x * scale - 2, enemy.y * scale - 2, 4, 4);
            }
        });
        
        if (this.map.extraction) {
            mctx.strokeStyle = '#00ffff';
            mctx.beginPath();
            mctx.arc(
                this.map.extraction.x * scale,
                this.map.extraction.y * scale,
                5, 0, Math.PI * 2
            );
            mctx.stroke();
        }
}
    
CyberOpsGame.prototype.renderMarker = function(x, y, sprite, name) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Draw marker sprite
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sprite, 0, -10);

        // Draw marker name if provided
        if (name) {
            ctx.font = '10px monospace';
            ctx.fillStyle = '#00ff00';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.strokeText(name, 0, 5);
            ctx.fillText(name, 0, 5);
        }

        ctx.restore();
    }

CyberOpsGame.prototype.renderExplosiveTarget = function(x, y, planted) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (planted) {
            // Render planted explosive (red, pulsing)
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            ctx.strokeStyle = '#ff6666';
        } else {
            // Render target structure (gray)
            ctx.fillStyle = '#666666';
            ctx.strokeStyle = '#999999';
        }
        
        ctx.lineWidth = 2;
        ctx.fillRect(-15, -15, 30, 30);
        ctx.strokeRect(-15, -15, 30, 30);
        
        // Add warning symbol or checkmark
        ctx.fillStyle = planted ? '#ffff00' : '#ffaa00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(planted ? 'BOMB' : 'TARGET', 0, 0);
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderAssassinationTarget = function(x, y, type, eliminated) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (eliminated) {
            // Render eliminated target (dark red)
            ctx.fillStyle = '#440000';
            ctx.strokeStyle = '#ff0000';
        } else if (type === 'primary') {
            // Primary target (bright red)
            ctx.fillStyle = '#cc0000';
            ctx.strokeStyle = '#ff6666';
        } else {
            // Secondary target (orange)
            ctx.fillStyle = '#cc6600';
            ctx.strokeStyle = '#ff9966';
        }
        
        const pulse = eliminated ? 0.3 : Math.sin(Date.now() * 0.005) * 0.2 + 0.8;
        ctx.globalAlpha = pulse;
        
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -10, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Add target symbol
        ctx.fillStyle = eliminated ? '#666666' : '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(eliminated ? 'DEAD' : (type === 'primary' ? 'P' : 'S'), 0, -10);
        
        ctx.restore();
}
    
CyberOpsGame.prototype.renderGate = function(x, y, breached) {
        const ctx = this.ctx;
        const isoPos = this.worldToIsometric(x, y);
        
        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);
        
        if (breached) {
            // Render breached gate (broken, smoking)
            ctx.fillStyle = '#333333';
            ctx.strokeStyle = '#666666';
        } else {
            // Render intact gate (metallic)
            ctx.fillStyle = '#555555';
            ctx.strokeStyle = '#888888';
        }
        
        ctx.lineWidth = 3;
        ctx.fillRect(-25, -20, 50, 40);
        ctx.strokeRect(-25, -20, 50, 40);
        
        // Add gate details
        if (breached) {
            // Add explosion/damage effects
            ctx.fillStyle = '#ff6600';
            ctx.fillRect(-20, -15, 15, 10);
            ctx.fillRect(5, -10, 15, 8);
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BREACH', 0, 0);
        } else {
            // Add lock symbol
            ctx.fillStyle = '#ffff00';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('GATE', 0, 0);
        }

        ctx.restore();
}

// Render game speed indicator
CyberOpsGame.prototype.renderSpeedIndicator = function() {
    const ctx = this.ctx;

    // Always show if speed is not 1x, or show temporarily after changes
    if (this.gameSpeed === 1 && this.speedIndicatorFadeTime <= 0) return;

    // Keep showing if speed is > 1x
    if (this.gameSpeed > 1) {
        this.speedIndicatorFadeTime = Math.max(this.speedIndicatorFadeTime, 1000);
    }

    // Fade out the indicator over time
    if (this.speedIndicatorFadeTime > 0) {
        this.speedIndicatorFadeTime -= 16; // Roughly 60fps
    }

    const alpha = Math.min(1, this.speedIndicatorFadeTime / 1000);
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Position in top-right corner below mission timer
    const x = this.canvas.width - 100;
    const y = 60;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x - 40, y - 15, 80, 30);

    // Border - different colors for different speeds
    const speedColor = this.gameSpeed === 1 ? '#00ffff' :     // Cyan for 1x
                       this.gameSpeed === 2 ? '#ffff00' :     // Yellow for 2x
                       this.gameSpeed === 4 ? '#ff00ff' :     // Magenta for 4x
                       this.gameSpeed === 8 ? '#ff8800' :     // Orange for 8x
                       '#ff0000';                              // Red for 16x
    ctx.strokeStyle = speedColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 40, y - 15, 80, 30);

    // Speed text
    ctx.fillStyle = speedColor;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${this.gameSpeed}x SPEED`, x, y);

    // Add pulsing effect for high speeds
    if (this.gameSpeed > 1) {
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        ctx.globalAlpha = alpha * pulse * 0.5;
        ctx.strokeStyle = speedColor;
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 42, y - 17, 84, 34);
    }

    ctx.restore();
}
