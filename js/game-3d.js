    // 3D SYSTEM IMPLEMENTATION
    
CyberOpsGame.prototype.init3D = function() {
        console.log('🎮 init3D() FUNCTION ENTERED!');
        console.log('- window.THREE:', !!window.THREE);
        console.log('- typeof THREE:', typeof THREE);
        console.log('- THREE available globally:', typeof window.THREE);
        
        if (!window.THREE) {
            console.warn('❌ Three.js not loaded, 3D features disabled');
            console.log('📋 Available globals:', Object.keys(window).filter(k => k.includes('THREE') || k.includes('three')));
            
            // Try delayed initialization (Three.js might load later)
            console.log('🔄 Attempting delayed 3D initialization...');
            setTimeout(() => {
                console.log('🕐 Delayed check - window.THREE:', !!window.THREE);
                if (window.THREE) {
                    console.log('🎉 Three.js now available! Retrying initialization...');
                    this.init3D();
                } else {
                    console.error('💥 Three.js still not available after delay');
                }
            }, 2000);
            return;
        }
        
        console.log('🎮 Initializing 3D system...', 'THREE version:', THREE.REVISION);
        
        // Get 3D container
        this.container3D = document.getElementById('game3DContainer');
        console.log('- 3D container found:', !!this.container3D);
        
        if (!this.container3D) {
            console.error('❌ 3D container not found!');
            return;
        }
        
        // Create scene
        this.scene3D = new THREE.Scene();
        this.scene3D.background = new THREE.Color(0x0a0e1a);
        this.scene3D.fog = new THREE.Fog(0x0a0e1a, 10, 50);
        
        // Create cameras
        this.camera3D = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // Create renderer
        this.renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer3D.setSize(window.innerWidth, window.innerHeight);
        this.renderer3D.shadowMap.enabled = true;
        this.renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Add to container
        this.container3D.appendChild(this.renderer3D.domElement);
        this.canvas3D = this.renderer3D.domElement;
        
        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene3D.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0x00ffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene3D.add(directionalLight);
        
        // Additional atmospheric lighting
        const pinkLight = new THREE.PointLight(0xff00ff, 0.5, 30);
        pinkLight.position.set(-5, 10, -5);
        this.scene3D.add(pinkLight);
        
        // Initialize 3D HUD
        this.gameHUD3D = document.getElementById('game3DHUD');
        console.log('- 3D HUD found:', !!this.gameHUD3D);
        
        // Initialize other 3D components
        this.world3D = {
            agents: [],
            enemies: [],
            walls: [],
            terminals: []
        };
        
        console.log('✅ 3D system initialized successfully');
        console.log('📊 3D System Components:', {
            scene3D: !!this.scene3D,
            renderer3D: !!this.renderer3D,
            camera3D: !!this.camera3D,
            container3D: !!this.container3D,
            canvas3D: !!this.canvas3D,
            gameHUD3D: !!this.gameHUD3D
        });
}
    
CyberOpsGame.prototype.switchCameraMode = function() {
        console.log('🎬 switchCameraMode called!');
        console.log('  - scene3D exists:', !!this.scene3D);
        console.log('  - selectedAgent exists:', !!this._selectedAgent);
        
        if (!this.scene3D || !this._selectedAgent) {
            console.log('❌ Cannot switch camera mode:');
            if (!this.scene3D) console.log('  - No 3D scene');
            if (!this._selectedAgent) console.log('  - No selected agent');
            return;
        }
        
        const modes = ['tactical', 'third', 'first'];
        const currentIndex = modes.indexOf(this.cameraMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const oldMode = this.cameraMode;
        this.cameraMode = modes[nextIndex];
        
        console.log('🎬 Camera mode switched:', oldMode, '→', this.cameraMode);
        
        // Ensure we have an agent selected for 3D modes
        if ((this.cameraMode === 'third' || this.cameraMode === 'first') && !this._selectedAgent) {
            // Auto-select the first available alive agent
            const aliveAgent = this.agents.find(agent => agent.alive);
            if (aliveAgent) {
                // Clear previous selections
                this.agents.forEach(a => a.selected = false);
                this._selectedAgent = aliveAgent;
                aliveAgent.selected = true;
                console.log('🎯 Auto-selected agent for 3D mode:', aliveAgent.name);
            }
        }
        
        // Update mode indicator
        const indicator = document.getElementById('modeIndicator');
        if (indicator) {
            indicator.textContent = this.cameraMode.toUpperCase();
        }
        
        // Switch between 2D and 3D
        if (this.cameraMode === 'tactical') {
            this.disable3DMode();
        } else {
            this.enable3DMode();
        }
        
        this.update3DCamera();
}
    
CyberOpsGame.prototype.enable3DMode = function() {
        if (!this.scene3D) {
            console.log('❌ Cannot enable 3D mode - no scene3D');
            return;
        }
        
        console.log('🎮 Enabling 3D mode...', 'Camera mode:', this.cameraMode);
        
        this.is3DMode = true;
        this.canvas.style.display = 'none';
        this.container3D.style.display = 'block';
        this.container3D.style.pointerEvents = 'auto';
        this.hud3D.style.display = 'block';
        
        // Hide 2D HUD
        if (this.gameHUD) {
            this.gameHUD.style.display = 'none';
        }
        
        // Create/update 3D world
        this.create3DWorld();
        
        // Update 3D HUD with current agent info
        this.update3DHUD();
        
        // Setup pointer lock for FPS mode
        if (this.cameraMode === 'first') {
            this.setupPointerLock();
        }
        
        console.log('✅ 3D mode enabled');
}
    
CyberOpsGame.prototype.disable3DMode = function() {
        console.log('🎮 Disabling 3D mode...', 'Camera mode:', this.cameraMode);
        
        this.is3DMode = false;
        this.canvas.style.display = 'block';
        this.container3D.style.display = 'none';
        this.container3D.style.pointerEvents = 'none';
        this.hud3D.style.display = 'none';
        
        // Show 2D HUD
        if (this.gameHUD) {
            this.gameHUD.style.display = 'block';
        }
        
        // Exit pointer lock
        if (document.pointerLockElement) {
            document.exitPointerLock();
        }
        
        console.log('✅ 3D mode disabled');
}
    
CyberOpsGame.prototype.create3DWorld = function() {
        if (!this.scene3D || !this.currentMission) return;
        
        console.log('🌍 Creating 3D world from 2D map...');
        
        // Clear existing 3D objects
        Object.values(this.world3D).forEach(array => {
            if (Array.isArray(array)) {
                array.forEach(obj => this.scene3D.remove(obj));
                array.length = 0;
            } else if (array) {
                this.scene3D.remove(array);
            }
        });
        
        // Create ground
        this.createGround();
        
        // Create walls and obstacles
        this.createWalls();
        
        // Create agents
        this.createAgents3D();
        
        // Create enemies
        this.createEnemies3D();
        
        // Create terminals and objectives
        this.createObjectives3D();
        
        console.log('✅ 3D world created');
}
    
CyberOpsGame.prototype.createGround = function() {
        const mapWidth = this.currentMission.map[0].length;
        const mapHeight = this.currentMission.map.length;
        
        const geometry = new THREE.PlaneGeometry(mapWidth * 2, mapHeight * 2);
        const material = new THREE.MeshLambertMaterial({ 
            color: 0x1a1a2e,
            transparent: true,
            opacity: 0.8
        });
        
        const ground = new THREE.Mesh(geometry, material);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        
        this.scene3D.add(ground);
        this.world3D.ground = ground;
}
    
CyberOpsGame.prototype.createWalls = function() {
        const map = this.currentMission.map;
        
        for (let y = 0; y < map.length; y++) {
            for (let x = 0; x < map[y].length; x++) {
                const cell = map[y][x];
                
                if (cell === 1) { // Wall
                    const geometry = new THREE.BoxGeometry(1.8, 3, 1.8);
                    const material = new THREE.MeshLambertMaterial({ 
                        color: 0x2a2a4e,
                        transparent: true,
                        opacity: 0.9
                    });
                    
                    const wall = new THREE.Mesh(geometry, material);
                    wall.position.set(x * 2 - map[0].length, 1.5, y * 2 - map.length);
                    wall.castShadow = true;
                    wall.receiveShadow = true;
                    
                    this.scene3D.add(wall);
                    this.world3D.walls.push(wall);
                }
            }
        }
}
    
CyberOpsGame.prototype.createAgents3D = function() {
        this.agents.forEach((agent, index) => {
            if (!agent.alive) return;
            
        // Create agent geometry (fallback for older Three.js versions)
        const geometry = THREE.CapsuleGeometry ? 
            new THREE.CapsuleGeometry(0.3, 1.5, 4, 8) : 
            new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
            const material = new THREE.MeshLambertMaterial({ 
                color: agent === this.selectedAgent ? 0x00ffff : 0x00ff00
            });
            
            const agentMesh = new THREE.Mesh(geometry, material);
            agentMesh.position.set(
                agent.x * 0.1 - this.currentMission.map[0].length * 0.1, 
                1, 
                agent.y * 0.1 - this.currentMission.map.length * 0.1
            );
            agentMesh.castShadow = true;
            
            // Add agent data
            agentMesh.userData = { type: 'agent', index: index, agent: agent };
            
            this.scene3D.add(agentMesh);
            this.world3D.agents.push(agentMesh);
        });
}
    
CyberOpsGame.prototype.createEnemies3D = function() {
        this.enemies.forEach((enemy, index) => {
            if (!enemy.alive) return;
            
        // Create enemy geometry (fallback for older Three.js versions)
        const geometry = THREE.CapsuleGeometry ? 
            new THREE.CapsuleGeometry(0.3, 1.5, 4, 8) : 
            new THREE.CylinderGeometry(0.3, 0.3, 1.5, 8);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
            
            const enemyMesh = new THREE.Mesh(geometry, material);
            enemyMesh.position.set(
                enemy.x * 0.1 - this.currentMission.map[0].length * 0.1, 
                1, 
                enemy.y * 0.1 - this.currentMission.map.length * 0.1
            );
            enemyMesh.castShadow = true;
            
            enemyMesh.userData = { type: 'enemy', index: index, enemy: enemy };
            
            this.scene3D.add(enemyMesh);
            this.world3D.enemies.push(enemyMesh);
        });
}
    
CyberOpsGame.prototype.createObjectives3D = function() {
        // Create terminals
        if (this.currentMission.terminals) {
            this.currentMission.terminals.forEach((terminal, index) => {
                if (terminal.hacked) return;
                
                const geometry = new THREE.BoxGeometry(0.8, 1.5, 0.4);
                const material = new THREE.MeshLambertMaterial({ 
                    color: 0x0088ff,
                    emissive: 0x002244
                });
                
                const terminalMesh = new THREE.Mesh(geometry, material);
                terminalMesh.position.set(
                    terminal.x * 0.1 - this.currentMission.map[0].length * 0.1,
                    0.75,
                    terminal.y * 0.1 - this.currentMission.map.length * 0.1
                );
                terminalMesh.castShadow = true;
                
                terminalMesh.userData = { type: 'terminal', index: index, terminal: terminal };
                
                this.scene3D.add(terminalMesh);
                this.world3D.terminals.push(terminalMesh);
            });
        }
}
    
CyberOpsGame.prototype.update3DCamera = function() {
        if (!this.scene3D || !this._selectedAgent) return;
        
        const agent = this._selectedAgent;
        const agentPos = new THREE.Vector3(
            agent.x * 0.1 - this.currentMission.map[0].length * 0.1,
            1,
            agent.y * 0.1 - this.currentMission.map.length * 0.1
        );
        
        switch(this.cameraMode) {
            case 'third':
                // Third person camera - behind and above agent
                this.camera3D.position.set(
                    agentPos.x - 3,
                    agentPos.y + 2,
                    agentPos.z + 3
                );
                this.camera3D.lookAt(agentPos);
                break;
                
            case 'first':
                // First person camera - at agent's eye level
                this.camera3D.position.set(
                    agentPos.x,
                    agentPos.y + 0.6,
                    agentPos.z
                );
                
                // Mouse look in FPS mode (simplified)
                if (this.keys3D.mouse.deltaX !== 0 || this.keys3D.mouse.deltaY !== 0) {
                    const sensitivity = 0.002;
                    this.camera3D.rotation.y -= this.keys3D.mouse.deltaX * sensitivity;
                    this.camera3D.rotation.x -= this.keys3D.mouse.deltaY * sensitivity;
                    this.camera3D.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.camera3D.rotation.x));
                    
                    // Reset mouse deltas
                    this.keys3D.mouse.deltaX = 0;
                    this.keys3D.mouse.deltaY = 0;
                }
                break;
        }
}
    
CyberOpsGame.prototype.setupPointerLock = function() {
        if (!this.canvas3D) return;
        
        // Simple mouse look without PointerLock API (for better compatibility)
        let isMouseDown = false;
        
        this.canvas3D.addEventListener('mousedown', (e) => {
            if (this.cameraMode === 'first') {
                isMouseDown = true;
                this.canvas3D.style.cursor = 'none';
            }
        });
        
        this.canvas3D.addEventListener('mouseup', () => {
            isMouseDown = false;
            this.canvas3D.style.cursor = 'default';
        });
        
        this.canvas3D.addEventListener('mousemove', (e) => {
            if (isMouseDown && this.cameraMode === 'first') {
                this.keys3D.mouse.deltaX = e.movementX || (e.pageX - this.lastMouseX);
                this.keys3D.mouse.deltaY = e.movementY || (e.pageY - this.lastMouseY);
                this.lastMouseX = e.pageX;
                this.lastMouseY = e.pageY;
            }
        });
        
        this.canvas3D.addEventListener('mouseleave', () => {
            isMouseDown = false;
            this.canvas3D.style.cursor = 'default';
        });
}
    
CyberOpsGame.prototype.update3D = function() {
        if (!this.is3DMode || !this._selectedAgent) return;
        
        // Update agent position based on WASD
        if (this.keys3D.W || this.keys3D.A || this.keys3D.S || this.keys3D.D) {
            this.updateAgent3DMovement();
        }
        
        // Update camera
        this.update3DCamera();
        
        // Sync 2D positions with 3D positions
        this.sync3DTo2D();
        
        // Handle 3D shooting
        this.handle3DShooting();
}
    
CyberOpsGame.prototype.updateAgent3DMovement = function() {
        const agent = this._selectedAgent;
        const speed = 100; // pixels per second in 2D space
        const deltaTime = 1/60; // assuming 60fps
        
        let moveX = 0;
        let moveY = 0;
        
        // Movement relative to camera direction in FPS mode
        if (this.cameraMode === 'first') {
            const forward = new THREE.Vector3(0, 0, -1);
            const right = new THREE.Vector3(1, 0, 0);
            
            forward.applyQuaternion(this.camera3D.quaternion);
            right.applyQuaternion(this.camera3D.quaternion);
            
            if (this.keys3D.W) {
                moveX += forward.x * speed * deltaTime;
                moveY += forward.z * speed * deltaTime;
            }
            if (this.keys3D.S) {
                moveX -= forward.x * speed * deltaTime;
                moveY -= forward.z * speed * deltaTime;
            }
            if (this.keys3D.A) {
                moveX -= right.x * speed * deltaTime;
                moveY -= right.z * speed * deltaTime;
            }
            if (this.keys3D.D) {
                moveX += right.x * speed * deltaTime;
                moveY += right.z * speed * deltaTime;
            }
        } else {
            // Simple movement in TPS mode
            if (this.keys3D.W) moveY -= speed * deltaTime;
            if (this.keys3D.S) moveY += speed * deltaTime;
            if (this.keys3D.A) moveX -= speed * deltaTime;
            if (this.keys3D.D) moveX += speed * deltaTime;
        }
        
        // Apply movement
        const newX = agent.x + moveX;
        const newY = agent.y + moveY;
        
        // Check collision (reuse existing collision detection)
        if (this.isValidPosition(newX, agent.y)) {
            agent.x = newX;
        }
        if (this.isValidPosition(agent.x, newY)) {
            agent.y = newY;
        }
        
        // Update 3D mesh position
        const agentMesh = this.world3D.agents.find(mesh => mesh.userData.agent === agent);
        if (agentMesh) {
            agentMesh.position.set(
                agent.x * 0.1 - this.currentMission.map[0].length * 0.1,
                1,
                agent.y * 0.1 - this.currentMission.map.length * 0.1
            );
        }
}
    
CyberOpsGame.prototype.handle3DShooting = function() {
        // Handle mouse clicks for shooting in 3D mode
        if (this.mouseClicked && this.is3DMode && this._selectedAgent) {
            this.mouseClicked = false;
            
            // Raycast for shooting
            const raycaster = new THREE.Raycaster();
            
            if (this.cameraMode === 'first') {
                // Shoot from camera center in FPS mode
                raycaster.setFromCamera({ x: 0, y: 0 }, this.camera3D);
            } else {
                // Convert mouse position for TPS mode
                const mouse = new THREE.Vector2(
                    (this.mouseX / window.innerWidth) * 2 - 1,
                    -(this.mouseY / window.innerHeight) * 2 + 1
                );
                raycaster.setFromCamera(mouse, this.camera3D);
            }
            
            // Check for enemy hits
            const enemyMeshes = this.world3D.enemies.filter(mesh => mesh.visible);
            const intersects = raycaster.intersectObjects(enemyMeshes);
            
            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                const enemy = hitMesh.userData.enemy;
                
                if (enemy && enemy.alive) {
                    // Deal damage
                    enemy.hp -= this._selectedAgent.damage;
                    
                    // Create muzzle flash effect
                    this.create3DMuzzleFlash();
                    
                    if (enemy.hp <= 0) {
                        enemy.alive = false;
                        hitMesh.visible = false;
                        console.log('🎯 Enemy eliminated in 3D mode!');
                    }
                }
            }
        }
}
    
CyberOpsGame.prototype.create3DMuzzleFlash = function() {
        if (!this._selectedAgent) return;
        
        // Create muzzle flash geometry
        const geometry = new THREE.SphereGeometry(0.2, 8, 6);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xffff00,
            transparent: true,
            opacity: 0.8
        });
        
        const flash = new THREE.Mesh(geometry, material);
        
        // Position flash at agent weapon
        const agent = this._selectedAgent;
        flash.position.set(
            agent.x * 0.1 - this.currentMission.map[0].length * 0.1 + 0.5,
            1.2,
            agent.y * 0.1 - this.currentMission.map.length * 0.1
        );
        
        this.scene3D.add(flash);
        
        // Remove flash after short time
        setTimeout(() => {
            this.scene3D.remove(flash);
        }, 100);
}
    
CyberOpsGame.prototype.sync3DTo2D = function() {
        // Update enemy positions in 3D based on 2D logic
        this.enemies.forEach((enemy, index) => {
            const enemyMesh = this.world3D.enemies[index];
            if (enemyMesh && enemy.alive) {
                enemyMesh.position.set(
                    enemy.x * 0.1 - this.currentMission.map[0].length * 0.1,
                    1,
                    enemy.y * 0.1 - this.currentMission.map.length * 0.1
                );
                
                // Update visibility
                enemyMesh.visible = enemy.alive;
            }
        });
        
        // Update agent colors (selected vs unselected)
        this.world3D.agents.forEach(agentMesh => {
            const agent = agentMesh.userData.agent;
            if (agent) {
                agentMesh.material.color.setHex(
                    agent === this._selectedAgent ? 0x00ffff : 0x00ff00
                );
            }
        });
}
    
CyberOpsGame.prototype.render3D = function() {
        if (!this.renderer3D || !this.scene3D || !this.camera3D) return;
        
        if (this.renderer3D && this.scene3D && this.camera3D) {
            this.renderer3D.render(this.scene3D, this.camera3D);
        } else {
            console.log('❌ Cannot render 3D - missing components:', {
                renderer: !!this.renderer3D,
                scene: !!this.scene3D,
                camera: !!this.camera3D
            });
        }
}
    
    // Enhanced 3D HUD update
CyberOpsGame.prototype.update3DHUD = function() {
        if (!this.is3DMode || !this._selectedAgent) return;
        
        // Update health display
        const healthDisplay = document.querySelector('.health-display-3d');
        if (healthDisplay) {
            healthDisplay.textContent = `HP: ${this._selectedAgent.hp}/${this._selectedAgent.maxHp}`;
        }
        
        // Update ammo display
        const ammoDisplay = document.querySelector('.ammo-display-3d');
        if (ammoDisplay) {
            ammoDisplay.textContent = `AMMO: ${this._selectedAgent.ammo || '∞'}`;
        }
        
        // Update objective display
        const objectiveDisplay = document.querySelector('.objective-display-3d');
        if (objectiveDisplay && this.currentMission) {
            objectiveDisplay.textContent = this.getObjectiveText();
        }
        
        // Update agent info
        const agentNameDisplay = document.getElementById('agentName3D');
        const agentClassDisplay = document.getElementById('agentClass3D');
        if (agentNameDisplay && this._selectedAgent) {
            agentNameDisplay.textContent = this._selectedAgent.name;
        }
        if (agentClassDisplay && this._selectedAgent) {
            agentClassDisplay.textContent = this._selectedAgent.class;
        }
}
    
    // REMOVED: checkAgentSelection - all logic moved to simplified handleTap
    
CyberOpsGame.prototype.getObjectiveText = function() {
        if (!this.currentMission) return '';
        
        if (this.currentMission.objectives && this.currentMission.objectives.length > 0) {
            return this.currentMission.objectives[0];
        }
        
        // Fallback objectives based on mission type
        switch(this.currentMissionIndex) {
            case 0: return 'Eliminate all hostiles';
            case 1: return 'Hack all terminals';
            case 2: return 'Plant explosives';
            case 3: return 'Eliminate targets';
            case 4: return 'Breach the fortress';
            default: return 'Complete mission objectives';
        }
}
    
