    // 3D SYSTEM IMPLEMENTATION
    
CyberOpsGame.prototype.init3D = function() {
        // Initialize selected action for 3D mode
        this.selectedAction3D = 1; // Default to Shoot (index 1)
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
            terminals: [],
            extraction: null
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

        // Add crosshair to center of screen
        this.addCrosshair();

        // Create/update 3D world
        this.create3DWorld();

        // Set initial camera position
        if (this.camera3D) {
            // Position camera based on mode
            if (this.cameraMode === 'third' && this._selectedAgent) {
                const agentX = (this._selectedAgent.x - this.map.tiles[0].length / 2) * 2;
                const agentZ = (this._selectedAgent.y - this.map.tiles.length / 2) * 2;

                // Use same positioning logic as update3DCamera for consistency
                const yaw = this.cameraRotationY || 0;
                const pitch = this.cameraRotationX || 0;
                const distance = 5;
                const height = 3;

                this.camera3D.position.set(
                    agentX - Math.sin(yaw) * distance,
                    1 + height + pitch * 2,
                    agentZ - Math.cos(yaw) * distance
                );
                this.camera3D.lookAt(agentX, 1.5, agentZ);
            } else if (this.cameraMode === 'first' && this._selectedAgent) {
                const agentX = (this._selectedAgent.x - this.map.tiles[0].length / 2) * 2;
                const agentZ = (this._selectedAgent.y - this.map.tiles.length / 2) * 2;
                this.camera3D.position.set(agentX, 1.6, agentZ);
            }
            console.log('📷 Camera positioned at:', this.camera3D.position);
        }

        // Update 3D HUD with current agent info
        this.update3DHUD();
        
        // Setup pointer lock for both FPS and TPS modes
        this.setupPointerLock();
        
        console.log('✅ 3D mode enabled');
}
    
CyberOpsGame.prototype.disable3DMode = function() {
        console.log('🎮 Disabling 3D mode...', 'Camera mode:', this.cameraMode);

        // Release pointer lock when switching back to tactical view
        if (document.pointerLockElement) {
            console.log('🔓 Releasing pointer lock for tactical mode');
            document.exitPointerLock();
        }

        this.is3DMode = false;
        this.canvas.style.display = 'block';
        this.container3D.style.display = 'none';
        this.container3D.style.pointerEvents = 'none';
        this.hud3D.style.display = 'none';

        // Show 2D HUD
        if (this.gameHUD) {
            this.gameHUD.style.display = 'block';
        }

        // Remove crosshair
        this.removeCrosshair();

        console.log('✅ 3D mode disabled');
}
    
CyberOpsGame.prototype.addCrosshair = function() {
        // Remove existing crosshair if any
        this.removeCrosshair();

        // Create crosshair element
        const crosshair = document.createElement('div');
        crosshair.id = 'crosshair3D';
        crosshair.style.position = 'fixed';
        crosshair.style.left = '50%';
        crosshair.style.top = '50%';
        crosshair.style.transform = 'translate(-50%, -50%)';
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.zIndex = '10000';
        crosshair.style.pointerEvents = 'none';

        // Create crosshair with CSS
        crosshair.innerHTML = `
            <div style="
                position: absolute;
                left: 50%;
                top: 0;
                width: 2px;
                height: 8px;
                background: rgba(0, 255, 255, 0.8);
                transform: translateX(-50%);
                box-shadow: 0 0 4px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="
                position: absolute;
                left: 50%;
                bottom: 0;
                width: 2px;
                height: 8px;
                background: rgba(0, 255, 255, 0.8);
                transform: translateX(-50%);
                box-shadow: 0 0 4px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                left: 0;
                width: 8px;
                height: 2px;
                background: rgba(0, 255, 255, 0.8);
                transform: translateY(-50%);
                box-shadow: 0 0 4px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="
                position: absolute;
                top: 50%;
                right: 0;
                width: 8px;
                height: 2px;
                background: rgba(0, 255, 255, 0.8);
                transform: translateY(-50%);
                box-shadow: 0 0 4px rgba(0, 255, 255, 0.5);
            "></div>
            <div style="
                position: absolute;
                left: 50%;
                top: 50%;
                width: 2px;
                height: 2px;
                background: rgba(255, 255, 255, 0.9);
                transform: translate(-50%, -50%);
            "></div>
        `;

        document.body.appendChild(crosshair);
}

CyberOpsGame.prototype.removeCrosshair = function() {
        const crosshair = document.getElementById('crosshair3D');
        if (crosshair) {
            crosshair.remove();
        }
}

CyberOpsGame.prototype.create3DWorld = function() {
        if (!this.scene3D || !this.map || !this.map.tiles) {
            console.log('❌ Cannot create 3D world - missing components:', {
                scene3D: !!this.scene3D,
                map: !!this.map,
                tiles: !!(this.map && this.map.tiles)
            });
            return;
        }

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

        // Create extraction point
        this.createExtractionPoint3D();

        console.log('✅ 3D world created');
}
    
CyberOpsGame.prototype.createGround = function() {
        const mapWidth = this.map.tiles[0].length;
        const mapHeight = this.map.tiles.length;
        
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
        const map = this.map.tiles;
        
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
                    wall.position.set(
                        (x - map[0].length / 2) * 2,
                        1.5,
                        (y - map.length / 2) * 2
                    );
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
                (agent.x - this.map.tiles[0].length / 2) * 2,
                1,
                (agent.y - this.map.tiles.length / 2) * 2
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
                (enemy.x - this.map.tiles[0].length / 2) * 2,
                1,
                (enemy.y - this.map.tiles.length / 2) * 2
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
                    (terminal.x - this.map.tiles[0].length / 2) * 2,
                    0.75,
                    (terminal.y - this.map.tiles.length / 2) * 2
                );
                terminalMesh.castShadow = true;

                terminalMesh.userData = { type: 'terminal', index: index, terminal: terminal };

                this.scene3D.add(terminalMesh);
                this.world3D.terminals.push(terminalMesh);
            });
        }
}

CyberOpsGame.prototype.createExtractionPoint3D = function() {
        if (!this.map.extraction) return;

        // Remove old extraction point if exists
        if (this.world3D.extraction) {
            this.scene3D.remove(this.world3D.extraction);
        }

        // Create extraction zone group
        const extractionGroup = new THREE.Group();

        // Create glowing platform
        const platformGeometry = new THREE.CylinderGeometry(3, 3, 0.2, 16);
        const platformMaterial = new THREE.MeshLambertMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = 0.1;
        extractionGroup.add(platform);

        // Create beacon pillar
        const beaconGeometry = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
        const beaconMaterial = new THREE.MeshLambertMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5
        });
        const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
        beacon.position.y = 5;
        extractionGroup.add(beacon);

        // Create rotating rings
        for (let i = 0; i < 3; i++) {
            const ringGeometry = new THREE.TorusGeometry(2 - i * 0.5, 0.1, 8, 16);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.5 - i * 0.1
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.position.y = 1 + i * 2;
            ring.rotation.x = Math.PI / 2;
            extractionGroup.add(ring);

            // Store ring for animation
            ring.userData = { rotationSpeed: 0.02 * (i + 1), index: i };
        }

        // Create particle effect
        const particleCount = 50;
        const particleGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = Math.random() * 3;
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = Math.random() * 8;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
        }

        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x00ffff,
            size: 0.2,
            transparent: true,
            opacity: 0.6
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        extractionGroup.add(particles);

        // Position the extraction point
        extractionGroup.position.set(
            (this.map.extraction.x - this.map.tiles[0].length / 2) * 2,
            0,
            (this.map.extraction.y - this.map.tiles.length / 2) * 2
        );

        // Add to scene
        this.scene3D.add(extractionGroup);
        this.world3D.extraction = extractionGroup;

        // Create extraction zone marker text
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.font = 'Bold 32px Arial';
        context.fillStyle = '#00ffff';
        context.textAlign = 'center';
        context.fillText('EXTRACTION', 128, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: 0.8
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.y = 8;
        sprite.scale.set(4, 1, 1);
        extractionGroup.add(sprite);

        console.log('🚁 Extraction point created at:', this.map.extraction);
}

CyberOpsGame.prototype.animateExtractionPoint = function() {
        if (!this.world3D.extraction) return;

        const time = Date.now() * 0.001;

        // Animate rings
        this.world3D.extraction.children.forEach(child => {
            if (child.userData.rotationSpeed) {
                child.rotation.z = time * child.userData.rotationSpeed;
                child.position.y = 1 + child.userData.index * 2 + Math.sin(time + child.userData.index) * 0.2;
            }
        });

        // Animate particles
        const particles = this.world3D.extraction.children.find(child => child instanceof THREE.Points);
        if (particles) {
            particles.rotation.y = time * 0.1;
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] = (positions[i + 1] + 0.05) % 8;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        }

        // Pulse platform
        const platform = this.world3D.extraction.children[0];
        if (platform && platform.material) {
            platform.material.emissiveIntensity = 0.3 + Math.sin(time * 2) * 0.2;
        }
}

CyberOpsGame.prototype.update3DCamera = function() {
        if (!this.scene3D || !this._selectedAgent) return;
        
        const agent = this._selectedAgent;
        const agentPos = new THREE.Vector3(
            (agent.x - this.map.tiles[0].length / 2) * 2,
            1,
            (agent.y - this.map.tiles.length / 2) * 2
        );
        
        switch(this.cameraMode) {
            case 'third':
                // Third person camera - behind and above agent with proper rotation
                const distance = 5;
                const height = 3;

                // Use same rotation system as FPS for consistency
                const yaw = this.cameraRotationY || 0;
                const pitch = this.cameraRotationX || 0;

                // Position camera behind agent based on rotation (negative sin/cos for behind view)
                this.camera3D.position.set(
                    agentPos.x - Math.sin(yaw) * distance,
                    agentPos.y + height + pitch * 2,
                    agentPos.z - Math.cos(yaw) * distance
                );

                // Look at point slightly above agent for better view
                const lookTarget = new THREE.Vector3(
                    agentPos.x,
                    agentPos.y + 0.5,
                    agentPos.z
                );
                this.camera3D.lookAt(lookTarget);
                break;

            case 'first':
                // First person camera - at agent's eye level
                this.camera3D.position.set(
                    agentPos.x,
                    agentPos.y + 0.6,
                    agentPos.z
                );

                // Apply rotation - make sure we're not accumulating rotation
                this.camera3D.rotation.order = 'YXZ'; // Proper FPS rotation order
                this.camera3D.rotation.y = this.cameraRotationY || 0;
                this.camera3D.rotation.x = this.cameraRotationX || 0;
                this.camera3D.rotation.z = 0; // Ensure no roll
                break;
        }
}
    
CyberOpsGame.prototype.setupPointerLock = function() {
        if (!this.canvas3D) return;

        // Initialize camera rotation values
        this.cameraRotationY = this.cameraRotationY || 0;
        this.cameraRotationX = this.cameraRotationX || 0;

        // Request pointer lock on first click, but don't prevent event propagation
        // The actual shooting is handled by handleTap
        if (!this.pointerLockSetup) {
            this.pointerLockSetup = true;

            // Handle clicks on 3D canvas
            this.canvas3D.addEventListener('click', async (e) => {
                if (this.is3DMode) {
                    if (!document.pointerLockElement) {
                        // First click - request pointer lock
                        try {
                            await this.canvas3D.requestPointerLock();
                        } catch (err) {
                            console.log('Pointer lock failed:', err);
                        }
                    } else {
                        // Subsequent clicks - shoot!
                        console.log('🔫 3D canvas clicked - shooting!');
                        this.mouseClicked = true;
                    }
                }
            });
        }

        // Handle pointer lock change
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.canvas3D) {
                console.log('🔒 Pointer locked');
                this.canvas3D.style.cursor = 'none';
            } else {
                console.log('🔓 Pointer unlocked');
                this.canvas3D.style.cursor = 'crosshair';
            }
        });

        this.canvas3D.addEventListener('mousemove', (e) => {
            // Camera rotation with pointer lock
            if (document.pointerLockElement === this.canvas3D) {
                const sensitivity = 0.002;

                // Use movementX/Y for smoother control
                const deltaX = e.movementX || 0;
                const deltaY = e.movementY || 0;

                // Update rotation values
                this.cameraRotationY -= deltaX * sensitivity;

                // Invert Y for TPS mode (camera looks down when mouse goes up)
                if (this.cameraMode === 'third') {
                    this.cameraRotationX += deltaY * sensitivity;  // Inverted for TPS
                } else {
                    this.cameraRotationX -= deltaY * sensitivity;  // Normal for FPS
                }

                // Clamp vertical rotation
                this.cameraRotationX = Math.max(-Math.PI/3, Math.min(Math.PI/3, this.cameraRotationX));
            }
        });

        this.canvas3D.addEventListener('mouseleave', () => {
            this.canvas3D.style.cursor = 'default';
        });

        // Set initial cursor
        this.canvas3D.style.cursor = 'crosshair';
}
    
CyberOpsGame.prototype.update3D = function() {
        if (!this.is3DMode) return;

        // Check if selected agent died and auto-select another
        if (this._selectedAgent && !this._selectedAgent.alive) {
            console.log('💀 Selected agent died, finding new agent...');

            // Find another alive agent
            const aliveAgent = this.agents.find(agent => agent.alive);
            if (aliveAgent) {
                // Clear previous selections
                this.agents.forEach(a => a.selected = false);
                this._selectedAgent = aliveAgent;
                aliveAgent.selected = true;
                console.log('🎯 Auto-selected new agent:', aliveAgent.name);
                this.update3DHUD();
            } else {
                console.log('☠️ No alive agents remaining');
                this._selectedAgent = null;
                // Could switch back to tactical view or show game over
                return;
            }
        }

        if (!this._selectedAgent) return;

        // Update agent position based on WASD
        if (this.keys3D.W || this.keys3D.A || this.keys3D.S || this.keys3D.D) {
            // Remove spam logging, movement is working
            this.updateAgent3DMovement();
        }

        // Update camera
        this.update3DCamera();

        // Sync 2D positions with 3D positions
        this.sync3DTo2D();

        // Handle 3D shooting
        this.handle3DShooting();

        // Animate extraction point
        this.animateExtractionPoint();
}
    
CyberOpsGame.prototype.updateAgent3DMovement = function() {
        const agent = this._selectedAgent;
        // Use EXACT same speed as 2D movement (from game-loop.js line 41)
        const moveSpeed = agent.speed / 60;
        
        let moveX = 0;
        let moveY = 0;
        
        // Movement relative to camera direction in FPS mode
        if (this.cameraMode === 'first') {
            // For true FPS controls: forward/back follows camera look, left/right strafe
            const yaw = this.cameraRotationY || 0;

            // Calculate movement vectors
            // In our coordinate system: X is left/right, Z is forward/back
            // Forward vector based on camera yaw (negated for correct direction)
            const forward = new THREE.Vector3(
                -Math.sin(yaw),
                0,
                -Math.cos(yaw)
            );
            // Right vector is perpendicular to forward (positive for correct strafe)
            const right = new THREE.Vector3(
                Math.sin(yaw + Math.PI/2),
                0,
                Math.cos(yaw + Math.PI/2)
            );

            if (this.keys3D.W) {
                moveX += forward.x * moveSpeed;
                moveY += forward.z * moveSpeed;
            }
            if (this.keys3D.S) {
                moveX -= forward.x * moveSpeed;
                moveY -= forward.z * moveSpeed;
            }
            if (this.keys3D.A) {
                moveX -= right.x * moveSpeed;
                moveY -= right.z * moveSpeed;
            }
            if (this.keys3D.D) {
                moveX += right.x * moveSpeed;
                moveY += right.z * moveSpeed;
            }
        } else if (this.cameraMode === 'third') {
            // Third person mode - camera-relative movement
            const yaw = this.cameraRotationY || 0;

            // Calculate forward and right vectors based on camera yaw
            const forward = new THREE.Vector3(
                Math.sin(yaw),  // Inverted sign
                0,
                Math.cos(yaw)   // Inverted sign
            );
            const right = new THREE.Vector3(
                -Math.sin(yaw + Math.PI/2),  // Inverted sign
                0,
                -Math.cos(yaw + Math.PI/2)   // Inverted sign
            );

            if (this.keys3D.W) {
                moveX += forward.x * moveSpeed;
                moveY += forward.z * moveSpeed;
            }
            if (this.keys3D.S) {
                moveX -= forward.x * moveSpeed;
                moveY -= forward.z * moveSpeed;
            }
            if (this.keys3D.A) {
                moveX -= right.x * moveSpeed;
                moveY -= right.z * moveSpeed;
            }
            if (this.keys3D.D) {
                moveX += right.x * moveSpeed;
                moveY += right.z * moveSpeed;
            }
        }
        
        // Apply movement
        const newX = agent.x + moveX;
        const newY = agent.y + moveY;

        // Simple boundary checking for now
        // TODO: Add proper collision detection with walls
        agent.x = newX;
        agent.y = newY;

        // CRITICAL: Also update targetX/targetY so 2D update doesn't pull us back!
        agent.targetX = newX;
        agent.targetY = newY;

        // Store agent body direction (for visual representation)
        // Body faces movement direction, head can look around independently
        if (moveX !== 0 || moveY !== 0) {
            agent.bodyDirection = Math.atan2(-moveX, -moveY);
        }
        
        // Update 3D mesh position
        const agentMesh = this.world3D.agents.find(mesh => mesh.userData.agent === agent);
        if (agentMesh) {
            agentMesh.position.set(
                (agent.x - this.map.tiles[0].length / 2) * 2,
                1,
                (agent.y - this.map.tiles.length / 2) * 2
            );

            // In TPS mode, rotate agent mesh to face camera direction
            if (this.cameraMode === 'third') {
                agentMesh.rotation.y = this.cameraRotationY || 0;
            } else if (this.cameraMode === 'first') {
                // In FPS mode, we could rotate based on movement if we had a visible body
                // For now, keep rotation based on last movement direction
                if (agent.bodyDirection !== undefined) {
                    agentMesh.rotation.y = agent.bodyDirection;
                }
            }
        }
}
    
CyberOpsGame.prototype.cycleAction3D = function() {
        if (!this.is3DMode) return;

        // Cycle through actions 0-4
        this.selectedAction3D = (this.selectedAction3D + 1) % 5;

        // Update UI
        this.updateAction3DDisplay();

        const actionNames = ['Move', 'Shoot', 'Grenade', 'Hack', 'Shield'];
        console.log(`🔄 Switched to action: ${actionNames[this.selectedAction3D]}`);
}

CyberOpsGame.prototype.updateAction3DDisplay = function() {
        const actionNames = ['Move', 'Shoot', 'Grenade', 'Hack', 'Shield'];
        const currentActionSpan = document.getElementById('currentAction3D');
        if (currentActionSpan) {
            currentActionSpan.textContent = actionNames[this.selectedAction3D];
        }

        // Update selected button visual
        const buttons = document.querySelectorAll('.action-button-3d');
        buttons.forEach((btn, index) => {
            if (index === this.selectedAction3D) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
}

CyberOpsGame.prototype.handle3DShooting = function() {
        // Handle mouse clicks for actions in 3D mode
        if (this.mouseClicked && this.is3DMode && this._selectedAgent) {
            this.mouseClicked = false;

            // Execute the selected action
            switch(this.selectedAction3D) {
                case 0: // Move
                    // In 2D mode, action 0 does nothing (movement is by clicking)
                    // In 3D mode, we could set a waypoint but for consistency, do nothing
                    console.log('👆 Move action selected - use WASD to move');
                    break;

                case 1: // Shoot
                    console.log('💥 Shooting nearest enemy!');
                    this.execute3DShooting();
                    break;

                case 2: // Grenade
                    console.log('💣 Throwing grenade at target position!');
                    this.execute3DGrenade();
                    break;

                case 3: // Hack
                    console.log('💻 Executing context action!');
                    this.execute3DHack();
                    break;

                case 4: // Shield
                    console.log('🛡️ Activating shield!');
                    this.execute3DShield();
                    break;
            }
        }
}

CyberOpsGame.prototype.execute3DShooting = function() {
        if (!this._selectedAgent) return;

        // Check cooldown
        if (this._selectedAgent.cooldowns[1] > 0) {
            console.log('⏰ Shoot on cooldown!');
            return;
        }

        // Use the SAME logic as 2D mode - shoot NEAREST enemy
        this.shootNearestEnemy(this._selectedAgent);

        // Create muzzle flash effect for visual feedback
        this.create3DMuzzleFlash();

        // Set cooldown (already set in shootNearestEnemy but ensure consistency)
        this._selectedAgent.cooldowns[1] = 60;
        this.update3DCooldowns();
}

CyberOpsGame.prototype.execute3DGrenade = function() {
        if (!this._selectedAgent) return;

        // Check cooldown
        if (this._selectedAgent.cooldowns[2] > 0) {
            console.log('⏰ Grenade on cooldown!');
            return;
        }

        // Use the SAME logic as 2D mode - throw at agent's current target position
        this.throwGrenade(this._selectedAgent);

        // Visual feedback in 3D at agent's target position
        const targetX = (this._selectedAgent.targetX - this.map.tiles[0].length / 2) * 2;
        const targetZ = (this._selectedAgent.targetY - this.map.tiles.length / 2) * 2;
        this.create3DGrenadeEffect(targetX, targetZ);

        // Set cooldown
        this._selectedAgent.cooldowns[2] = 180;
        this.update3DCooldowns();

        console.log(`💣 Grenade thrown at agent's target position`);
}

CyberOpsGame.prototype.create3DGrenadeEffect = function(x, z) {
        if (!this.scene3D) return;

        // Create explosion visual
        const geometry = new THREE.SphereGeometry(0.3, 8, 6);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });

        const grenade = new THREE.Mesh(geometry, material);
        grenade.position.set(x, 1, z);
        this.scene3D.add(grenade);

        // Animate grenade arc and explosion
        let frame = 0;
        const animateGrenade = () => {
            frame++;
            if (frame < 30) {
                // Arc motion
                grenade.position.y = 1 + Math.sin((frame / 30) * Math.PI) * 3;
                requestAnimationFrame(animateGrenade);
            } else {
                // Explosion
                this.scene3D.remove(grenade);
                this.create3DExplosion(x, z);
            }
        };
        animateGrenade();
}

CyberOpsGame.prototype.create3DExplosion = function(x, z) {
        // Create explosion sphere
        const geometry = new THREE.SphereGeometry(3, 16, 12);
        const material = new THREE.MeshBasicMaterial({
            color: 0xff3300,
            transparent: true,
            opacity: 0.6
        });

        const explosion = new THREE.Mesh(geometry, material);
        explosion.position.set(x, 1, z);
        this.scene3D.add(explosion);

        // Animate explosion
        let scale = 0.1;
        const animateExplosion = () => {
            scale += 0.15;
            explosion.scale.set(scale, scale, scale);
            material.opacity = Math.max(0, 0.6 - scale * 0.15);

            if (material.opacity > 0) {
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene3D.remove(explosion);
            }
        };
        animateExplosion();
}

CyberOpsGame.prototype.execute3DHack = function() {
        if (!this._selectedAgent) return;

        // Check cooldown
        if (this._selectedAgent.cooldowns[3] > 0) {
            console.log('⏰ Hack on cooldown!');
            return;
        }

        // Use the SAME logic as 2D mode - handle based on mission type
        const agent = this._selectedAgent;

        if (this.currentMission.id === 3) {
            this.plantNearestExplosive(agent);
        } else if (this.currentMission.id === 4) {
            this.eliminateNearestTarget(agent);
        } else if (this.currentMission.id === 5) {
            this.breachNearestGate(agent) || this.hackNearestTerminal(agent);
        } else {
            this.hackNearestTerminal(agent);
        }

        // Visual feedback for hacked terminals in 3D
        const terminals = this.map.terminals || this.currentMission.terminals || [];
        terminals.forEach(terminal => {
            if (terminal.hacked) {
                // Update 3D terminal visual
                this.world3D.terminals.forEach(terminalMesh => {
                    if (terminalMesh.userData.terminal === terminal) {
                        if (!terminalMesh.userData.wasHacked) {
                            terminalMesh.material.color.setHex(0x00ff00);
                            terminalMesh.material.emissive.setHex(0x00ff00);
                            terminalMesh.material.emissiveIntensity = 0.5;
                            terminalMesh.userData.wasHacked = true;
                            // Create hack effect
                            this.create3DHackEffect(terminal.x, terminal.y);
                        }
                    }
                });
            }
        });

        // Set cooldown
        this._selectedAgent.cooldowns[3] = 120;
        this.update3DCooldowns();
}

CyberOpsGame.prototype.create3DHackEffect = function(terminalX, terminalY) {
        if (!this.scene3D) return;

        // Convert to 3D coordinates
        const x = (terminalX - this.map.tiles[0].length / 2) * 2;
        const z = (terminalY - this.map.tiles.length / 2) * 2;

        // Create data stream effect
        const geometry = new THREE.BoxGeometry(0.1, 3, 0.1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 10; i++) {
            const stream = new THREE.Mesh(geometry, material.clone());
            const angle = (i / 10) * Math.PI * 2;
            stream.position.set(
                x + Math.cos(angle) * 0.5,
                0,
                z + Math.sin(angle) * 0.5
            );
            this.scene3D.add(stream);

            // Animate upward
            let y = 0;
            const animateStream = () => {
                y += 0.1;
                stream.position.y = y;
                stream.material.opacity = Math.max(0, 0.8 - y * 0.2);

                if (stream.material.opacity > 0) {
                    requestAnimationFrame(animateStream);
                } else {
                    this.scene3D.remove(stream);
                }
            };
            setTimeout(animateStream, i * 50);
        }
}

CyberOpsGame.prototype.execute3DShield = function() {
        if (!this._selectedAgent) return;

        // Check cooldown
        if (this._selectedAgent.cooldowns[4] > 0) {
            console.log('⏰ Shield on cooldown!');
            return;
        }

        // Activate shield
        this.activateShield(this._selectedAgent);

        // Create 3D shield visual
        this.create3DShieldEffect(this._selectedAgent);

        // Set cooldown
        this._selectedAgent.cooldowns[4] = 300;
        this.update3DCooldowns();

        console.log('🛡️ Shield activated for 3 seconds');
}

CyberOpsGame.prototype.create3DShieldEffect = function(agent) {
        if (!this.scene3D) return;

        // Remove any existing shield
        if (agent.shield3D) {
            this.scene3D.remove(agent.shield3D);
        }

        // Create shield sphere
        const geometry = new THREE.SphereGeometry(1.5, 16, 12);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        const shield = new THREE.Mesh(geometry, material);
        shield.position.set(
            (agent.x - this.map.tiles[0].length / 2) * 2,
            1,
            (agent.y - this.map.tiles.length / 2) * 2
        );

        // Add wireframe overlay
        const wireframeGeometry = new THREE.SphereGeometry(1.6, 8, 6);
        const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        });
        const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
        shield.add(wireframe);

        this.scene3D.add(shield);
        agent.shield3D = shield;

        // Animate shield
        const animateShield = () => {
            if (!agent.shield3D || agent.shieldDuration <= 0) {
                if (agent.shield3D) {
                    this.scene3D.remove(agent.shield3D);
                    agent.shield3D = null;
                }
                return;
            }

            // Update position to follow agent
            shield.position.set(
                (agent.x - this.map.tiles[0].length / 2) * 2,
                1,
                (agent.y - this.map.tiles.length / 2) * 2
            );

            // Pulse effect
            const time = Date.now() * 0.001;
            shield.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
            wireframe.rotation.y += 0.02;

            requestAnimationFrame(animateShield);
        };
        animateShield();
}

CyberOpsGame.prototype.update3DCooldowns = function() {
        if (!this._selectedAgent) return;

        for (let i = 0; i < 5; i++) {
            const overlay = document.getElementById('cooldown3d' + i);
            if (overlay) {
                const maxCooldown = [0, 60, 180, 120, 300][i];
                const progress = this._selectedAgent.cooldowns[i] / maxCooldown;
                overlay.style.background = `conic-gradient(from 0deg, transparent ${(1 - progress) * 360}deg, rgba(0,0,0,0.7) ${(1 - progress) * 360}deg)`;
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
            (agent.x - this.map.tiles[0].length / 2) * 2 + 0.5,
            1.2,
            (agent.y - this.map.tiles.length / 2) * 2
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
            if (enemyMesh) {
                // Always update visibility based on alive status
                if (enemyMesh.visible !== enemy.alive) {
                    console.log(`👻 Enemy ${index} visibility: ${enemyMesh.visible} -> ${enemy.alive}`);
                }
                enemyMesh.visible = enemy.alive;

                // Only update position if enemy is alive
                if (enemy.alive) {
                    enemyMesh.position.set(
                        (enemy.x - this.map.tiles[0].length / 2) * 2,
                        1,
                        (enemy.y - this.map.tiles.length / 2) * 2
                    );
                }
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

        // Update action display
        this.updateAction3DDisplay();

        // Update cooldowns
        this.update3DCooldowns();
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
    
