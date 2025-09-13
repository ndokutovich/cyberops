CyberOpsGame.prototype.setupEventListeners = function() {
        // Touch Events
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Keyboard Events
        window.addEventListener('keydown', (e) => this.handleKeyPress(e));

        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Keyboard Events for 3D mode - CONSOLIDATED E KEY HANDLING
        document.addEventListener('keydown', (e) => {
            // 3D Mode Controls - E Key
            if (e.code === 'KeyE' && this.currentScreen === 'game') {
                console.log('🔑 E key detected! Checking conditions...');
                console.log('  - currentScreen:', this.currentScreen);
                console.log('  - _selectedAgent exists:', !!this._selectedAgent);
                console.log('  - _selectedAgent details:', this._selectedAgent ? this._selectedAgent.name : 'none');
                console.log('  - 3D system available:', !!this.scene3D);

                // DEBUG: Check 3D system components
                if (!this.scene3D) {
                    console.log('🔍 3D System Debug:');
                    console.log('  - scene3D:', !!this.scene3D);
                    console.log('  - renderer3D:', !!this.renderer3D);
                    console.log('  - camera3D:', !!this.camera3D);
                    console.log('  - init3D called?', 'checking...');
                }

                if (this._selectedAgent && this.scene3D) {
                    console.log('✅ All conditions met! Switching camera mode...');
                    this.switchCameraMode();
                    e.preventDefault();
                    return;
                } else {
                    console.log('❌ Conditions not met for camera switch:');
                    if (!this._selectedAgent) console.log('  - No agent selected - auto-selecting first agent');
                    if (!this.scene3D) console.log('  - 3D system not available');

                    // Auto-select first agent if none selected
                    if (!this._selectedAgent && this.agents && this.agents.length > 0) {
                        const firstAlive = this.agents.find(a => a.alive);
                        if (firstAlive) {
                            this._selectedAgent = firstAlive;
                            firstAlive.selected = true;
                            console.log('🎯 Auto-selected first alive agent for E key:', firstAlive.name);
                            // Try switching mode again
                            if (this.scene3D) {
                                this.switchCameraMode();
                                e.preventDefault();
                                return;
                            }
                        }
                    }
                }
            }

            // Quick agent selection with Tab key
            if (e.code === 'Tab') {
                e.preventDefault();
                if (this.currentScreen === 'game' && this.agents && this.agents.length > 0) {
                    const aliveAgents = this.agents.filter(a => a.alive);
                    if (aliveAgents.length > 0) {
                        // Cycle through agents
                        const currentIndex = this._selectedAgent ? aliveAgents.indexOf(this._selectedAgent) : -1;
                        const nextIndex = (currentIndex + 1) % aliveAgents.length;
                        console.log('🔧 SETTING _selectedAgent via Tab to:', aliveAgents[nextIndex].name);
                        this._selectedAgent = aliveAgents[nextIndex]; // Direct assignment
                        console.log('🔄 Agent selected with Tab:', this._selectedAgent.name);
                        console.log('💡 Now press E to switch camera modes!');
                    }
                }
                return;
            }

            // WASD for 3D movement
            if (this.is3DMode) {
                switch(e.code) {
                    case 'KeyW': this.keys3D.W = true; break;
                    case 'KeyA': this.keys3D.A = true; break;
                    case 'KeyS': this.keys3D.S = true; break;
                    case 'KeyD': this.keys3D.D = true; break;
                }
            }

            if (this.currentScreen !== 'game') return;

            if (e.code === 'Escape') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.is3DMode) {
                switch(e.code) {
                    case 'KeyW': this.keys3D.W = false; break;
                    case 'KeyA': this.keys3D.A = false; break;
                    case 'KeyS': this.keys3D.S = false; break;
                    case 'KeyD': this.keys3D.D = false; break;
                }
            }
        });

        // Mouse handling for 3D shooting
        this.mouseClicked = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        document.addEventListener('mousedown', (e) => {
            if (this.is3DMode) {
                this.mouseClicked = true;
                this.mouseX = e.clientX;
                this.mouseY = e.clientY;
            }
        });
}

    // Touch Handlers
CyberOpsGame.prototype.handleTouchStart = function(e) {
        e.preventDefault();

        for (let touch of e.changedTouches) {
            this.touches[touch.identifier] = {
                x: touch.clientX,
                y: touch.clientY,
                startX: touch.clientX,
                startY: touch.clientY,
                startTime: Date.now()
            };
        }

        if (e.touches.length === 1) {
            this.isDragging = false;
        } else if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        }
}

CyberOpsGame.prototype.handleTouchMove = function(e) {
        e.preventDefault();

        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const prev = this.touches[touch.identifier];
            if (prev) {
                const dx = touch.clientX - prev.startX;
                const dy = touch.clientY - prev.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 10) {
                    this.isDragging = true;
                    this.cameraX += touch.clientX - prev.x;
                    this.cameraY += touch.clientY - prev.y;
                }

                prev.x = touch.clientX;
                prev.y = touch.clientY;
            }
        } else if (e.touches.length === 2) {
            this.isDragging = true;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.lastTouchDistance > 0) {
                const scale = distance / this.lastTouchDistance;
                this.zoom = Math.max(0.5, Math.min(2, this.zoom * scale));
            }

            this.lastTouchDistance = distance;
        }
}

CyberOpsGame.prototype.handleTouchEnd = function(e) {
        e.preventDefault();

        for (let touch of e.changedTouches) {
            const touchData = this.touches[touch.identifier];
            if (touchData) {
                const dx = touch.clientX - touchData.startX;
                const dy = touch.clientY - touchData.startY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const duration = Date.now() - touchData.startTime;

                if (!this.isDragging && distance < 10 && duration < 300) {
                    this.handleTap(touch.clientX, touch.clientY);
                }

                delete this.touches[touch.identifier];
            }
        }

        if (e.touches.length === 0) {
            this.isDragging = false;
        }
}

    // Mouse Handlers
CyberOpsGame.prototype.handleMouseDown = function(e) {
        this.mouseDown = true;
        this.mouseStartX = e.clientX;
        this.mouseStartY = e.clientY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.isDragging = false;

        // Simplified mousedown - just track mouse state
        console.log('🖱️ Mouse down detected! Screen:', this.currentScreen);
        // All selection and movement logic moved to handleTap in mouseup
}

CyberOpsGame.prototype.handleMouseMove = function(e) {
        if (this.mouseDown) {
            const dx = e.clientX - this.mouseStartX;
            const dy = e.clientY - this.mouseStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) {
                this.isDragging = true;
                this.cameraX += e.clientX - this.lastMouseX;
                this.cameraY += e.clientY - this.lastMouseY;
            }

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        }
}

CyberOpsGame.prototype.handleMouseUp = function(e) {
        if (this.mouseDown) {
            const dx = e.clientX - this.mouseStartX;
            const dy = e.clientY - this.mouseStartY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (!this.isDragging && distance < 10) {
                // SIMPLIFIED: Just use handleTap for everything!
                this.handleTap(e.clientX, e.clientY);
                console.log('🖱️ Mouse UP: Using single handleTap for both selection and movement');
            }
        }
        this.mouseDown = false;
        this.isDragging = false;
}

CyberOpsGame.prototype.handleWheel = function(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.5, Math.min(2, this.zoom * delta));
}

CyberOpsGame.prototype.handleTap = function(x, y) {
        if (this.currentScreen !== 'game' || this.isPaused) return;

        // Check if clicking on HUD elements - allow HUD agent selection
        const squadHealth = document.getElementById('squadHealth');
        const rect = squadHealth.getBoundingClientRect();

        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            const relativeY = y - rect.top;
            const barIndex = Math.floor(relativeY / 30);

            if (barIndex >= 0 && barIndex < this.agents.length) {
                const agent = this.agents[barIndex];
                if (agent && agent.alive) {
                    this.selectAgent(agent);
                    console.log(`✅ Agent selected via HUD: ${agent.name}`);
                    return;
                }
            }
        }

        // Convert to canvas coordinates for agent selection
        const rect2 = this.canvas.getBoundingClientRect();
        const canvasX = x - rect2.left;
        const canvasY = y - rect2.top;

        console.log('🎯 SIMPLIFIED TAP: Checking for agent selection at canvas coords:', canvasX, canvasY);

        // PRECISE AGENT SHAPE DETECTION (instead of distance)
        let selectedAgent = null;

        if (this.agents && this.agents.length > 0) {
            for (const agent of this.agents) {
                if (!agent.alive) continue;

                const screenPos = this.worldToScreen(agent.x, agent.y);

                // Define agent sprite bounds (actual visual size)
                const agentWidth = 32;   // Agent sprite width
                const agentHeight = 48;  // Agent sprite height (taller for isometric)

                // Agent bounds (centered on screen position)
                const left = screenPos.x - agentWidth / 2;
                const right = screenPos.x + agentWidth / 2;
                const top = screenPos.y - agentHeight / 2;
                const bottom = screenPos.y + agentHeight / 2;

                // Check if click is within agent sprite bounds
                const isInBounds = (canvasX >= left && canvasX <= right &&
                                  canvasY >= top && canvasY <= bottom);

                const distance = Math.sqrt((canvasX - screenPos.x) ** 2 + (canvasY - screenPos.y) ** 2);

                console.log(`🔍 Agent ${agent.name}:`, {
                    distance: Math.round(distance),
                    bounds: { left: Math.round(left), right: Math.round(right),
                             top: Math.round(top), bottom: Math.round(bottom) },
                    click: { x: canvasX, y: canvasY },
                    inBounds: isInBounds ? '✅ YES' : '❌ NO'
                });

                // If click is within sprite bounds, this agent is selected
                if (isInBounds) {
                    selectedAgent = agent;
                    console.log(`🎯 PRECISE HIT: ${agent.name} sprite bounds!`);
                    break; // First hit wins (prevents overlapping selections)
                }
            }
        }

        // If clicked exactly on an agent sprite, select it
        if (selectedAgent) {
            // Clear all selections first
            this.agents.forEach(a => a.selected = false);

            // Select the precisely clicked agent
            selectedAgent.selected = true;
            this._selectedAgent = selectedAgent;

            console.log(`✅ TAP SELECTED: ${selectedAgent.name} (precise sprite hit)`);
            return; // Don't move if we selected an agent
        }

        // If no agent selected, move the currently selected agent
        const worldPos = this.screenToWorld(x, y);
        this.showTouchIndicator(x, y);

        const selected = this.agents.find(a => a.selected);
        if (selected && selected.alive) {
            selected.targetX = worldPos.x;
            selected.targetY = worldPos.y;
            console.log(`🚶 TAP MOVEMENT: Moving ${selected.name} to (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);
        } else {
            console.log(`❌ No agent selected for movement`);
        }
}

CyberOpsGame.prototype.selectAgent = function(agent) {
        this.agents.forEach(a => a.selected = false);
        agent.selected = true;
        this.updateSquadHealth();
        this.updateCooldownDisplay();
        this.centerCameraOnAgent(agent);

        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
}

CyberOpsGame.prototype.handleKeyPress = function(e) {
        if (this.currentScreen !== 'game') return;

        // Number keys to select agents
        if (e.key >= '1' && e.key <= '4') {
            const idx = parseInt(e.key) - 1;
            if (idx < this.agents.length && this.agents[idx].alive) {
                this.selectAgent(this.agents[idx]);
            }
        }

        // Tab to cycle agents
        if (e.key === 'Tab') {
            e.preventDefault();
            const aliveAgents = this.agents.filter(a => a.alive);
            if (aliveAgents.length > 0) {
                const current = aliveAgents.findIndex(a => a.selected);
                const next = (current + 1) % aliveAgents.length;
                this.selectAgent(aliveAgents[next]);
            }
        }

        // Space to pause
        if (e.key === ' ') {
            e.preventDefault();
            this.togglePause();
        }
}

CyberOpsGame.prototype.showTouchIndicator = function(x, y) {
        const indicator = document.createElement('div');
        indicator.className = 'touch-indicator';
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 500);
}

    // Coordinate Conversion
CyberOpsGame.prototype.screenToWorld = function(screenX, screenY) {
        const x = (screenX - this.cameraX) / this.zoom;
        const y = (screenY - this.cameraY) / this.zoom;
        return this.screenToIsometric(x, y);
}

CyberOpsGame.prototype.worldToScreen = function(worldX, worldY) {
        const iso = this.worldToIsometric(worldX, worldY);
        return {
            x: iso.x * this.zoom + this.cameraX,
            y: iso.y * this.zoom + this.cameraY
        };
}

CyberOpsGame.prototype.worldToIsometric = function(x, y) {
        return {
            x: (x - y) * this.tileWidth / 2,
            y: (x + y) * this.tileHeight / 2
        };
}

CyberOpsGame.prototype.screenToIsometric = function(x, y) {
        return {
            x: (x / (this.tileWidth / 2) + y / (this.tileHeight / 2)) / 2,
            y: (y / (this.tileHeight / 2) - x / (this.tileWidth / 2)) / 2
        };
}