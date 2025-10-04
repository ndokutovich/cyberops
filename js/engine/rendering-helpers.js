/**
 * RenderingHelpers - Encapsulates all entity and object rendering methods
 *
 * This class contains all the individual rendering methods that were previously
 * spread across game-rendering.js. It provides a clean, reusable set of rendering
 * functions that can be used by GameEngine.
 *
 * Design decisions:
 * - Stateless design: Each method receives all needed parameters
 * - No direct game state access: Pure rendering functions
 * - Consistent parameter pattern: (x, y, ..., ctx, worldToIsometric)
 */
class RenderingHelpers {
    constructor(tileWidth = 64, tileHeight = 32) {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;

        // Initialize logger
        this.logger = window.Logger ? new window.Logger('RenderingHelpers') : null;
    }

    /**
     * Render cover object
     * Migrated from game-rendering.js lines 37-57
     */
    renderCover(x, y, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

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

    /**
     * Render terminal
     * Migrated from game-rendering.js lines 59-78
     */
    renderTerminal(x, y, hacked, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

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

    /**
     * Render door
     * Migrated from game-rendering.js lines 87-148
     */
    renderDoor(x, y, locked, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

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

    /**
     * Render extraction point
     * Migrated from game-rendering.js lines 277-306
     */
    renderExtractionPoint(x, y, extractionEnabled, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Pulsing effect for extraction point
        const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;

        // Outer ring with color based on extraction state
        ctx.strokeStyle = extractionEnabled ? '#00ff00' : '#ffaa00';
        ctx.lineWidth = 3;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.stroke();

        // 'E' or 'X' marker
        ctx.fillStyle = extractionEnabled ? '#00ff00' : '#ffaa00';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(extractionEnabled ? 'E' : 'X', 0, 0);

        ctx.restore();
    }

    /**
     * Render agent
     * This is complex - migrated from game-rendering.js lines 308-393
     * Preserves all rendering logic including selection, shields, vision cones
     */
    renderAgent(agent, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(agent.x, agent.y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Draw body and selection WITHOUT rotation
        // UNIDIRECTIONAL: Check selection from single source of truth (_selectedAgent)
        const isSelected = game && game.isAgentSelected ? game.isAgentSelected(agent) : agent.selected;
        if (isSelected) {
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
        const isoAngle = (agent.facingAngle || 0) + Math.PI/2 - Math.PI/4;
        ctx.rotate(isoAngle);

        // Draw vision cone
        // UNIDIRECTIONAL: Reuse isSelected from line 160 (already calculated)
        ctx.fillStyle = isSelected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(0, 255, 255, 0.1)';
        ctx.strokeStyle = isSelected ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 60, -Math.PI/4, Math.PI/4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw direction indicator (small triangle)
        ctx.fillStyle = agent.color || '#00ff00';
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(-5, -20);
        ctx.lineTo(5, -20);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // Restore from rotation

        // Draw health bar (no rotation)
        const healthPercent = agent.health / agent.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -35, 30, 4);

        if (healthPercent > 0.5) {
            ctx.fillStyle = '#00ff00';
        } else if (healthPercent > 0.25) {
            ctx.fillStyle = '#ffff00';
        } else {
            ctx.fillStyle = '#ff0000';
        }
        ctx.fillRect(-15, -35, 30 * healthPercent, 4);

        // Draw name (no rotation)
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(agent.name, 0, -37);

        ctx.restore();
    }

    /**
     * Render enemy
     * Migrated from game-rendering.js lines 394-459
     */
    renderEnemy(enemy, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(enemy.x, enemy.y);

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

        // Apply rotation for vision cone and direction
        ctx.save();
        const isoAngle = (enemy.facingAngle || 0) - Math.PI/4;
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

        // Draw direction indicator
        ctx.fillStyle = enemy.type === 'heavy' ? '#ff6600' : (enemy.type === 'guard' ? '#ffff00' : '#ff0000');
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(-5, -20);
        ctx.lineTo(5, -20);
        ctx.closePath();
        ctx.fill();

        ctx.restore(); // Restore from rotation

        // Health bar (no rotation)
        const healthPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(-15, -35, 30, 4);
        ctx.fillStyle = healthPercent > 0.5 ? '#ff0000' : '#ff6600';
        ctx.fillRect(-15, -35, 30 * healthPercent, 4);

        ctx.restore();
    }

    /**
     * Render projectile
     * Migrated from game-rendering.js lines 460-487
     */
    renderProjectile(proj, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(proj.x, proj.y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Glow effect
        ctx.shadowColor = proj.color || '#ffff00';
        ctx.shadowBlur = 10;

        // Projectile body
        ctx.fillStyle = proj.color || '#ffff00';
        ctx.beginPath();
        ctx.arc(0, -15, proj.type === 'grenade' ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();

        // Trail effect for bullets
        if (proj.type !== 'grenade' && proj.prevX !== undefined && proj.prevY !== undefined) {
            const prevIso = worldToIsometric(proj.prevX, proj.prevY);
            ctx.strokeStyle = proj.color || '#ffff00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(prevIso.x - isoPos.x, prevIso.y - isoPos.y - 15);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render visual effect
     * Migrated from game-rendering.js lines 488-566
     */
    renderEffect(effect, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(effect.x, effect.y);
        // Effects use frame/duration, not age/lifetime
        // Default values if properties are missing
        const frame = effect.frame || 0;
        const duration = effect.duration || 30; // Default 30 frames
        const progress = Math.min(frame / duration, 1); // Clamp to 0-1

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        if (effect.type === 'explosion') {
            // Explosion effect
            // Visual scale: multiply by tile size for proper visual representation
            // effect.radius is in world units (3 = damage radius), visual needs to be bigger
            const visualScale = 15; // Scale factor for visual size
            const baseRadius = (effect.radius || 3) * visualScale;
            const radius = baseRadius * (1 + progress);
            const alpha = 1 - progress;

            // Shockwave
            ctx.strokeStyle = `rgba(255, 200, 0, ${alpha * 0.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, -20, radius * 1.5, 0, Math.PI * 2);
            ctx.stroke();

            // Fire core
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, -20, radius, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, -20, radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (effect.type === 'heal') {
            // Healing effect
            const alpha = 1 - progress;

            ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
            ctx.lineWidth = 2;

            // Cross symbol
            const size = 15 * (1 - progress * 0.5);
            ctx.beginPath();
            ctx.moveTo(-size, -20);
            ctx.lineTo(size, -20);
            ctx.moveTo(0, -20 - size);
            ctx.lineTo(0, -20 + size);
            ctx.stroke();

            // Glow
            ctx.shadowColor = '#00ff00';
            ctx.shadowBlur = 20 * alpha;
            ctx.beginPath();
            ctx.arc(0, -20, 10, 0, Math.PI * 2);
            ctx.stroke();
        } else if (effect.type === 'muzzle') {
            // Muzzle flash
            const alpha = 1 - progress;

            ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
            ctx.beginPath();
            ctx.arc(0, -15, 5 * (1 - progress), 0, Math.PI * 2);
            ctx.fill();
        } else if (effect.type === 'shield') {
            // Shield effect
            const alpha = 1 - progress;

            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -20, 25, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render collectable item
     * Migrated from game-rendering.js lines 177-276
     */
    renderCollectable(x, y, type, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Pulsing effect for collectables
        const pulse = Math.sin(Date.now() * 0.003) * 0.2 + 0.8;

        // Check if type is an emoji sprite FIRST (exactly like original)
        // This preserves the ORIGINAL rendering logic - emoji-first approach
        // Common emojis: 💰 💵 📄 🔫 💊 🛡️ 📦 💳 ❤️ 🏥 etc
        // Check for emoji by looking for unicode emoji ranges or specific known emojis
        const isEmoji = type && (
            type.length <= 2 ||  // Most emojis are 1-2 chars
            /[\u{1F300}-\u{1F9FF}]/u.test(type) ||  // Common emoji ranges
            /[\u{2600}-\u{26FF}]/u.test(type) ||    // Misc symbols
            /[\u{2700}-\u{27BF}]/u.test(type) ||    // Dingbats
            type.includes('💰') || type.includes('📄') ||
            type.includes('💵') || type.includes('🔫') ||
            type.includes('💊') || type.includes('🛡️') ||
            type.includes('📦') || type.includes('💳') ||
            type.includes('❤️') || type.includes('🏥') ||
            type.includes('🩹') || type.includes('⚡') ||
            type.includes('🔑') || type.includes('🗝️') ||
            type.includes('📱') || type.includes('💻') ||
            type.includes('🚪') || type.includes('🎯') ||
            type.startsWith('�')  // Malformed unicode often indicates emoji
        );

        if (isEmoji) {
            // Original emoji rendering
            ctx.font = '20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = pulse;
            ctx.fillText(type, 0, -10);
            ctx.restore();
            return;
        }

        // Base platform for non-emoji items
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Item-specific rendering for type strings
        switch(type) {
            case 'medkit':
            case 'health':
                ctx.fillStyle = '#ff0000';
                ctx.fillRect(-10, -20, 20, 15);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-2, -17, 4, 9);
                ctx.fillRect(-7, -14, 14, 3);
                break;

            case 'ammo':
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(-8, -18, 16, 12);
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(-6, -16, 12, 8);
                ctx.fillStyle = '#ffffff';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('A', 0, -12);
                break;

            case 'credits':
                ctx.fillStyle = '#ffff00';
                ctx.beginPath();
                ctx.arc(0, -15, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 10px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, -15);
                break;

            case 'shield':
                ctx.strokeStyle = '#00ffff';
                ctx.lineWidth = 3;
                ctx.globalAlpha = pulse;
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(-10, -20);
                ctx.lineTo(-10, -10);
                ctx.lineTo(0, -5);
                ctx.lineTo(10, -10);
                ctx.lineTo(10, -20);
                ctx.closePath();
                ctx.stroke();
                break;

            case 'intel':
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(-8, -20, 16, 12);
                ctx.fillStyle = '#00aa00';
                ctx.font = '8px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('i', 0, -14);
                break;

            case 'keycard':
                ctx.fillStyle = '#ff00ff';
                ctx.fillRect(-10, -18, 20, 10);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-8, -16, 5, 3);
                ctx.fillRect(-1, -16, 5, 3);
                ctx.fillRect(6, -16, 3, 3);
                break;

            case 'weapon':
                // Draw a weapon icon (only if no emoji sprite is provided)
                ctx.fillStyle = '#888888';
                ctx.fillRect(-12, -18, 24, 8);
                ctx.fillStyle = '#666666';
                ctx.fillRect(-6, -10, 8, 6);
                ctx.fillStyle = '#cccccc';
                ctx.fillRect(-10, -16, 18, 4);
                // Add a small highlight
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-10, -16, 18, 4);
                break;

            default:
                // Check if it's an emoji (like 🔫) or other special character
                if (type && (type.length <= 2 || type.startsWith('�'))) {
                    // Render emoji/special character
                    ctx.font = '20px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(type, 0, -12);
                } else {
                    // Generic item fallback
                    ctx.fillStyle = '#aaaaaa';
                    ctx.fillRect(-8, -18, 16, 12);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '8px monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('?', 0, -12);
                }
        }

        // Glow effect
        ctx.globalAlpha = pulse * 0.5;
        ctx.shadowColor = type === 'credits' ? '#ffff00' :
                         type === 'health' || type === 'medkit' ? '#ff0000' :
                         type === 'shield' ? '#00ffff' : '#ffffff';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = ctx.shadowColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -12, 20, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * Render marker
     * Migrated from game-rendering.js lines 748-773
     */
    renderMarker(x, y, sprite, name, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        // Marker base
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Sprite or emoji
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sprite || '📍', 0, -10);

        // Name label if provided
        if (name) {
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px monospace';
            ctx.fillText(name, 0, 10);
        }

        ctx.restore();
    }

    /**
     * Render explosive target
     * Migrated from game-rendering.js lines 774-805
     */
    renderExplosiveTarget(x, y, planted, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        if (planted) {
            // Planted explosive - blinking red
            const blink = Date.now() % 1000 < 500;
            ctx.fillStyle = blink ? '#ff0000' : '#aa0000';
            ctx.fillRect(-10, -15, 20, 15);

            // Timer display
            ctx.fillStyle = '#ffff00';
            ctx.font = '8px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('ARMED', 0, -5);
        } else {
            // Target location
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(-12, -17, 24, 18);
            ctx.setLineDash([]);

            // X marker
            ctx.beginPath();
            ctx.moveTo(-8, -13);
            ctx.lineTo(8, -3);
            ctx.moveTo(8, -13);
            ctx.lineTo(-8, -3);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Render assassination target
     * Migrated from game-rendering.js lines 806-845
     */
    renderAssassinationTarget(x, y, type, eliminated, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        if (eliminated) {
            // Eliminated target - grey with X
            ctx.fillStyle = '#666666';
            ctx.fillRect(-12, -25, 24, 30);

            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-8, -20);
            ctx.lineTo(8, -5);
            ctx.moveTo(8, -20);
            ctx.lineTo(-8, -5);
            ctx.stroke();
        } else {
            // Active target
            const pulse = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;

            // Target highlight
            ctx.strokeStyle = '#ff00ff';
            ctx.lineWidth = 2;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(0, -12, 20, 0, Math.PI * 2);
            ctx.stroke();

            // Target type indicator
            ctx.globalAlpha = 1;
            ctx.fillStyle = type === 'vip' ? '#ffff00' : '#ff00ff';
            ctx.fillRect(-10, -25, 20, 25);

            // Target symbol
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type === 'vip' ? 'V' : 'T', 0, -12);
        }

        ctx.restore();
    }

    /**
     * Render gate
     * Migrated from game-rendering.js lines 846-890
     */
    renderGate(x, y, breached, ctx, worldToIsometric) {
        const isoPos = worldToIsometric(x, y);

        ctx.save();
        ctx.translate(isoPos.x, isoPos.y);

        if (breached) {
            // Breached gate - destroyed
            ctx.fillStyle = '#444444';
            ctx.fillRect(-20, -5, 40, 8);

            // Debris
            ctx.fillStyle = '#666666';
            ctx.fillRect(-15, -15, 8, 8);
            ctx.fillRect(7, -12, 8, 8);
            ctx.fillRect(-5, -18, 6, 6);

            ctx.strokeStyle = '#333333';
            ctx.lineWidth = 1;
            ctx.strokeRect(-20, -5, 40, 8);
        } else {
            // Intact gate - fortified
            ctx.fillStyle = '#888888';
            ctx.fillRect(-20, -30, 40, 35);

            // Metal bars
            ctx.fillStyle = '#666666';
            for (let i = -15; i <= 15; i += 10) {
                ctx.fillRect(i - 2, -28, 4, 31);
            }

            // Reinforcement
            ctx.strokeStyle = '#aaaaaa';
            ctx.lineWidth = 2;
            ctx.strokeRect(-20, -30, 40, 35);

            // Lock indicator
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, -15, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Render path for debugging
     * Migrated from game-rendering.js lines 151-176
     */
    renderPath(path, currentIndex, agentColor, ctx, worldToIsometric) {
        if (!path || path.length < 2) return;

        ctx.save();

        // Draw path line
        ctx.strokeStyle = agentColor || '#00ff00';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([5, 5]);

        ctx.beginPath();
        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            const isoPos = worldToIsometric(node.x, node.y);

            if (i === 0) {
                ctx.moveTo(isoPos.x, isoPos.y);
            } else {
                ctx.lineTo(isoPos.x, isoPos.y);
            }

            // Mark current position
            if (i === currentIndex) {
                ctx.save();
                ctx.fillStyle = agentColor || '#00ff00';
                ctx.globalAlpha = 1;
                ctx.beginPath();
                ctx.arc(isoPos.x, isoPos.y, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        ctx.stroke();

        // Draw destination marker
        const dest = path[path.length - 1];
        const destIso = worldToIsometric(dest.x, dest.y);
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.8;
        ctx.strokeStyle = agentColor || '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(destIso.x, destIso.y, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// Export for use in GameEngine
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RenderingHelpers;
}