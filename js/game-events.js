// Select all alive agents in the squad
CyberOpsGame.prototype.selectAllSquad = function() {
        // In turn-based mode, don't allow selecting all
        if (this.turnBasedMode && this.currentTurnUnit) {
            if (this.logEvent) {
                this.logEvent(`Can't select all - it's ${this.currentTurnUnit.unit.name}'s turn!`, 'warning');
            }
            return;
        }

        let selectedCount = 0;
        this.agents.forEach(agent => {
            if (agent.alive) {
                agent.selected = true;
                selectedCount++;
            } else {
                agent.selected = false;
            }
        });

        // Update selected agent reference to first alive agent
        this._selectedAgent = this.agents.find(a => a.alive);

        console.log(`👥 SQUAD SELECT: Selected all ${selectedCount} alive agents`);
        this.updateSquadHealth();
        this.updateCooldownDisplay();

        // Visual feedback
        this.showSquadSelectionEffect();
}

// Move squad in square formation
CyberOpsGame.prototype.moveSquadInFormation = function(agents, targetX, targetY) {
        const squadSize = Math.ceil(Math.sqrt(agents.length));
        const spacing = 1.5; // Space between agents in formation

        // Calculate formation positions around the target point
        const startX = targetX - (squadSize - 1) * spacing / 2;
        const startY = targetY - (squadSize - 1) * spacing / 2;

        agents.forEach((agent, index) => {
            const row = Math.floor(index / squadSize);
            const col = index % squadSize;

            const formationX = startX + col * spacing;
            const formationY = startY + row * spacing;

            // Check if the formation position is walkable
            if (this.isWalkable(formationX, formationY)) {
                agent.targetX = formationX;
                agent.targetY = formationY;
            } else {
                // Try to find nearest walkable position
                let found = false;
                for (let radius = 1; radius <= 3 && !found; radius++) {
                    for (let angle = 0; angle < Math.PI * 2 && !found; angle += Math.PI / 4) {
                        const testX = formationX + Math.cos(angle) * radius;
                        const testY = formationY + Math.sin(angle) * radius;
                        if (this.isWalkable(testX, testY)) {
                            agent.targetX = testX;
                            agent.targetY = testY;
                            found = true;
                        }
                    }
                }
                // If still no valid position, move to center target
                if (!found) {
                    agent.targetX = targetX;
                    agent.targetY = targetY;
                }
            }
        });
}

// Visual effect for squad selection
CyberOpsGame.prototype.showSquadSelectionEffect = function() {
        // Create a temporary visual effect
        this.squadSelectEffect = {
            active: true,
            duration: 500,
            startTime: Date.now()
        };
}

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

        // Initialize new centralized keyboard handler
        if (!this.keyboardInitialized) {
            if (this.initKeyboardHandler) {
                console.log('🎮 Found initKeyboardHandler, calling it...');
                this.initKeyboardHandler();
                this.keyboardInitialized = true;
                console.log('⌨️ Keyboard handler initialized in setupEventListeners');
            } else {
                console.error('❌ CRITICAL: initKeyboardHandler function NOT FOUND!');
                console.error('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this)).filter(m => m.includes('Keyboard')));
            }
        }

        /* OLD KEYBOARD HANDLERS - DISABLED - Moved to game-keyboard.js */
        /* COMMENTED OUT TO PREVENT CONFLICTS
        document.addEventListener('keydown', (e) => {
            // Select All Squad - 'T' key for Team
            if (e.code === 'KeyT' && this.currentScreen === 'game') {
                console.log('🎮 Team Select: Selecting all squad members');
                this.selectAllSquad();
                e.preventDefault();
                return;
            }

            // Action Hotkeys for both 2D and 3D modes
            if (this.currentScreen === 'game') {
                // Get ALL selected agents for team actions
                const selectedAgents = this.agents.filter(a => a.selected && a.alive);

                if (selectedAgents.length > 0) {
                    let actionTriggered = false;

                    // F - Fire/Shoot (ALL selected agents shoot)
                    if (e.code === 'KeyF') {
                        console.log(`🔫 Team Shoot! ${selectedAgents.length} agents firing`);
                        selectedAgents.forEach(agent => {
                            if (!agent.cooldowns[1] || agent.cooldowns[1] <= 0) {
                                this.shootNearestEnemy(agent);
                                agent.cooldowns[1] = 60;
                                actionTriggered = true;
                            }
                        });
                    }

                    // G - Grenade (ALL selected agents throw grenades)
                    else if (e.code === 'KeyG') {
                        console.log(`💣 Team Grenades! ${selectedAgents.length} agents throwing`);
                        selectedAgents.forEach(agent => {
                            if (!agent.cooldowns[2] || agent.cooldowns[2] <= 0) {
                                this.throwGrenade(agent);
                                agent.cooldowns[2] = 180;
                                actionTriggered = true;
                            }
                        });
                    }

                    // H - Hack/Interact (only first agent hacks to avoid duplicates)
                    else if (e.code === 'KeyH') {
                        console.log('💻 Hack hotkey pressed');
                        const hacker = selectedAgents[0];
                        if (!hacker.cooldowns[3] || hacker.cooldowns[3] <= 0) {
                            // Use generic action system for all interactions
                            let actionPerformed = false;
                            if (this.useActionAbility) {
                                actionPerformed = this.useActionAbility(hacker);
                            }
                            if (actionPerformed) {
                                hacker.cooldowns[3] = 120;
                                actionTriggered = true;
                            }
                        } else {
                            console.log('⏳ Hack on cooldown:', hacker.cooldowns[3]);
                        }
                    }

                    // V - Shield (ALL selected agents activate shields)
                    else if (e.code === 'KeyV') {
                        console.log(`🛡️ Team Shields! ${selectedAgents.length} agents shielding`);
                        selectedAgents.forEach(agent => {
                            if (!agent.cooldowns[4] || agent.cooldowns[4] <= 0) {
                                this.activateShield(agent);
                                agent.cooldowns[4] = 300;
                                actionTriggered = true;
                            }
                        });
                    }

                    if (actionTriggered) {
                        this.updateCooldownDisplay();
                        e.preventDefault();
                        return;
                    }
                }
            }

            // E key is now handled in the centralized keyboard handler (game-keyboard.js)

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
                    case 'KeyR':
                        // Cycle through actions
                        this.cycleAction3D();
                        e.preventDefault();
                        break;
                }
            }

            if (this.currentScreen !== 'game') return;

            if (e.code === 'Escape') {
                this.togglePause();
            }
        });
        // });  // End of old keydown handler - EXTRA BRACKET REMOVED

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
        END OF OLD KEYBOARD HANDLERS - Use game-keyboard.js instead */

        // Mouse handling for 3D shooting (keep this for mouse interaction)
        this.mouseClicked = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;

        document.addEventListener('mousedown', (e) => {
            // Handle both 2D and 3D canvas clicks
            if (this.is3DMode) {
                // For 3D mode, just mark that mouse was clicked
                // The actual shooting happens in handleTap
                this.mouseDownX = e.clientX;
                this.mouseDownY = e.clientY;
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
        // Update mouse position for turn-based preview
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left + this.cameraX;
        const mouseY = e.clientY - rect.top + this.cameraY;

        // Convert screen to world coordinates for isometric
        const worldPos = this.screenToWorld(mouseX - this.cameraX, mouseY - this.cameraY);

        // Update turn-based preview if in that mode
        if (this.turnBasedMode && this.updateTurnBasedPreview) {
            this.updateTurnBasedPreview(worldPos.x, worldPos.y);
        }

        // Handle dragging
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
                // Pass the shift key state for waypoint support
                this.handleTap(e.clientX, e.clientY, e.shiftKey);
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

CyberOpsGame.prototype.handleTap = function(x, y, shiftKey = false) {
        if (this.currentScreen !== 'game' || this.isPaused) return;

        // Handle 3D mode shooting
        if (this.is3DMode) {
            console.log('🎯 3D Mode click - shooting!');
            this.mouseClicked = true;  // Trigger shooting in handle3DShooting
            return;
        }

        // Double-click removed - use T key to select all agents

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
            // In turn-based mode, check if it's the right agent
            if (this.turnBasedMode && this.currentTurnUnit) {
                if (this.currentTurnUnit.unit !== selectedAgent) {
                    if (this.logEvent) {
                        this.logEvent(`Can't select ${selectedAgent.name} - it's ${this.currentTurnUnit.unit.name}'s turn!`, 'warning');
                    }
                    console.log(`❌ TB MODE: Cannot select ${selectedAgent.name} during ${this.currentTurnUnit.unit.name}'s turn`);
                    return;
                }
            }

            // Clear all selections first
            this.agents.forEach(a => a.selected = false);

            // Select the precisely clicked agent
            selectedAgent.selected = true;
            this._selectedAgent = selectedAgent;

            console.log(`✅ TAP SELECTED: ${selectedAgent.name} (precise sprite hit)`);
            return; // Don't move if we selected an agent
        }

        // If no agent selected, check for door clicks first
        const worldPos = this.screenToWorld(x, y);

        // Check if clicking on a door
        if (this.map && this.map.doors) {
            for (let door of this.map.doors) {
                const dx = Math.abs(worldPos.x - door.x);
                const dy = Math.abs(worldPos.y - door.y);
                if (dx < 1 && dy < 1) {
                    // Clicked on a door
                    if (door.locked) {
                        const terminal = this.map.terminals ? this.map.terminals.find(t => t.id === door.linkedTerminal) : null;
                        if (terminal && !terminal.hacked) {
                            this.addNotification(`🔒 Door locked! Hack terminal ${door.linkedTerminal + 1} to unlock.`);
                        } else if (terminal && terminal.hacked) {
                            this.addNotification(`🔓 This door should be unlocked...`);
                            door.locked = false; // Fix the door state
                        } else {
                            this.addNotification(`🔒 This door is locked!`);
                        }
                    } else {
                        this.addNotification(`🚪 Door is open - you can pass through.`);
                    }
                    return; // Don't move agents when clicking on doors
                }
            }
        }

        // Get all selected agents
        const selectedAgents = this.agents.filter(a => a.selected && a.alive);

        if (selectedAgents.length > 0) {
            // Handle turn-based movement differently
            if (this.turnBasedMode) {
                // In turn-based mode, use special movement handler
                if (this.handleTurnBasedMovement) {
                    this.handleTurnBasedMovement(worldPos.x, worldPos.y);
                }
                return;
            }

            // Normal real-time movement
            // Check if target position is walkable
            if (this.isWalkable(worldPos.x, worldPos.y)) {
                // Initialize waypoints array if needed
                if (!this.agentWaypoints) {
                    this.agentWaypoints = {};
                }

                selectedAgents.forEach((agent, index) => {
                    // Initialize waypoint list for this agent if needed
                    if (!this.agentWaypoints[agent.id]) {
                        this.agentWaypoints[agent.id] = [];
                    }

                    // If shift is held, add to waypoints; otherwise clear and set new destination
                    if (shiftKey) {
                        // Add waypoint
                        this.agentWaypoints[agent.id].push({ x: worldPos.x, y: worldPos.y });
                        console.log(`📍 Added waypoint for ${agent.name}: Point #${this.agentWaypoints[agent.id].length}`);

                        // If this is the first waypoint and agent isn't moving, start movement
                        if (this.agentWaypoints[agent.id].length === 1) {
                            const agentDx = agent.targetX - agent.x;
                            const agentDy = agent.targetY - agent.y;
                            const agentDist = Math.sqrt(agentDx * agentDx + agentDy * agentDy);

                            if (agentDist < 0.5) {
                                // Agent is stationary, set target to first waypoint
                                agent.targetX = worldPos.x;
                                agent.targetY = worldPos.y;
                                console.log(`🏃 Starting ${agent.name} movement to first waypoint`);
                            }
                        }
                    } else {
                        // Clear waypoints and set new destination
                        this.agentWaypoints[agent.id] = [];

                        if (selectedAgents.length === 1) {
                            // Single agent movement - only update if target changed significantly
                            const targetChanged = !agent.targetX || !agent.targetY ||
                                                Math.abs(agent.targetX - worldPos.x) > 0.3 ||
                                                Math.abs(agent.targetY - worldPos.y) > 0.3;

                            if (targetChanged) {
                                agent.targetX = worldPos.x;
                                agent.targetY = worldPos.y;
                                console.log(`🚶 TAP MOVEMENT: Moving ${agent.name} to (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)})`);

                                // Show coordinates in notification if in debug/pathfinding mode
                                if (this.showPaths || this.usePathfinding || this.debugMode) {
                                    this.addNotification(`📍 Destination: [${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}]`);
                                    // Also add to event log
                                    if (this.logEvent) {
                                        this.logEvent(`Agent moving to [${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}]`, 'player');
                                    }
                                }
                            } else {
                                console.log(`🔄 Agent already heading to this location`);
                            }
                        } else {
                            // Squad movement in formation
                            const squadSize = Math.ceil(Math.sqrt(selectedAgents.length));
                            const spacing = 1.5;
                            const startX = worldPos.x - (squadSize - 1) * spacing / 2;
                            const startY = worldPos.y - (squadSize - 1) * spacing / 2;

                            const row = Math.floor(index / squadSize);
                            const col = index % squadSize;
                            const formationX = startX + col * spacing;
                            const formationY = startY + row * spacing;

                            let newTargetX, newTargetY;
                            if (this.isWalkable(formationX, formationY)) {
                                newTargetX = formationX;
                                newTargetY = formationY;
                            } else {
                                newTargetX = worldPos.x;
                                newTargetY = worldPos.y;
                            }

                            // Only update if target changed significantly
                            const targetChanged = !agent.targetX || !agent.targetY ||
                                                Math.abs(agent.targetX - newTargetX) > 0.3 ||
                                                Math.abs(agent.targetY - newTargetY) > 0.3;

                            if (targetChanged) {
                                agent.targetX = newTargetX;
                                agent.targetY = newTargetY;
                            }
                        }
                    }
                });

                // Store destination indicators for all selected agents
                this.destinationIndicators = selectedAgents.map(agent => ({
                    x: agent.targetX || worldPos.x,
                    y: agent.targetY || worldPos.y,
                    agentColor: agent.color || '#00ff00',
                    timestamp: Date.now()
                }));

                this.showTouchIndicator(x, y);
                // Removed hit sound - doesn't make sense for movement
                // Could play a movement/click sound here if we had one
                // this.playSound('move', 0.05);
            } else {
                console.log(`🚫 Cannot move to (${Math.round(worldPos.x)}, ${Math.round(worldPos.y)}) - obstacle detected`);
                // Could show a different indicator for invalid moves
                this.showBlockedIndicator(x, y);
            }
        } else {
            console.log(`❌ No agent selected for movement`);
        }
}

CyberOpsGame.prototype.selectAgent = function(agent) {
        // In turn-based mode with initiative, only allow selecting the current turn unit
        if (this.turnBasedMode && this.currentTurnUnit) {
            if (this.currentTurnUnit.unit !== agent) {
                // Don't allow selection of other agents during their turn
                if (this.logEvent) {
                    this.logEvent(`It's ${this.currentTurnUnit.unit.name}'s turn!`, 'warning');
                }
                // Re-select the current turn unit
                this.agents.forEach(a => a.selected = false);
                this.currentTurnUnit.unit.selected = true;
                this._selectedAgent = this.currentTurnUnit.unit;
                this.updateSquadHealth();
                return;
            }
        }

        this.agents.forEach(a => a.selected = false);
        agent.selected = true;
        this._selectedAgent = agent;
        this.updateSquadHealth();
        this.updateCooldownDisplay();
        this.centerCameraOnAgent(agent);

        // Log agent selection
        if (this.logEvent && !this.turnBasedMode) {
            this.logEvent(`Switched to ${agent.name}`, 'info');
        }

        if ('vibrate' in navigator) {
            navigator.vibrate(10);
        }
}

// Replaced by centralized keyboard handler in game-keyboard.js
CyberOpsGame.prototype.handleKeyPress = function(e) {
    // This function is kept for backwards compatibility but is now empty
    // All keyboard handling is done in game-keyboard.js
}

CyberOpsGame.prototype.showTouchIndicator = function(x, y) {
        const indicator = document.createElement('div');
        indicator.className = 'touch-indicator';
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 500);
}

CyberOpsGame.prototype.showBlockedIndicator = function(x, y) {
        const indicator = document.createElement('div');
        indicator.className = 'touch-indicator blocked';
        indicator.style.left = x + 'px';
        indicator.style.top = y + 'px';
        indicator.style.borderColor = '#ff3333';
        indicator.style.backgroundColor = 'rgba(255, 51, 51, 0.2)';
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