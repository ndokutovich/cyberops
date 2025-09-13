    // Rendering
CyberOpsGame.prototype.render = function() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.save();
        ctx.translate(this.cameraX, this.cameraY);
        ctx.scale(this.zoom, this.zoom);
        
        if (this.map) {
            this.renderMap();
            
            if (this.map.cover) {
                this.map.cover.forEach(cover => {
                    this.renderCover(cover.x, cover.y);
                });
            }
            
            if (this.map.terminals) {
                this.map.terminals.forEach(terminal => {
                    this.renderTerminal(terminal.x, terminal.y, terminal.hacked);
                });
            }
            
            if (this.map.explosiveTargets) {
                this.map.explosiveTargets.forEach(target => {
                    this.renderExplosiveTarget(target.x, target.y, target.planted);
                });
            }
            
            if (this.map.targets) {
                this.map.targets.forEach(target => {
                    this.renderAssassinationTarget(target.x, target.y, target.type, target.eliminated);
                });
            }
            
            if (this.map.gates) {
                this.map.gates.forEach(gate => {
                    this.renderGate(gate.x, gate.y, gate.breached);
                });
            }
            
            if (this.map.extraction) {
                this.renderExtractionPoint(this.map.extraction.x, this.map.extraction.y);
            }
        }
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) this.renderEnemy(enemy);
        });
        
        this.agents.forEach(agent => {
            if (agent.alive) this.renderAgent(agent);
        });
        
        this.projectiles.forEach(proj => {
            this.renderProjectile(proj);
        });
        
        this.effects.forEach(effect => {
            this.renderEffect(effect);
        });
        
        ctx.restore();
        
        this.renderMinimap();
}
    
CyberOpsGame.prototype.renderMap = function() {
        const ctx = this.ctx;
        
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
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
                    ctx.fillStyle = '#1a1a2e';
                    ctx.fill();
                    ctx.strokeStyle = '#16213e';
                } else {
                    ctx.fillStyle = '#0f0f1e';
                    ctx.fill();
                    ctx.strokeStyle = '#2a2a3e';
                    ctx.fillStyle = '#1f1f3e';
                    ctx.fillRect(-this.tileWidth / 2, -20, this.tileWidth, 20);
                }
                
                ctx.lineWidth = 1;
                ctx.stroke();
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
        
        if (agent.selected) {
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 20, 0, Math.PI * 2);
            ctx.stroke();
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
                mctx.fillStyle = agent.selected ? '#00ffff' : '#4a7c8c';
                mctx.fillRect(agent.x * scale - 2, agent.y * scale - 2, 4, 4);
            }
        });
        
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
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
    
