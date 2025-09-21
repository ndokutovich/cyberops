/**
 * HUDService - Centralized HUD management for game overlay elements
 * Handles non-blocking UI elements that appear during gameplay
 * According to architecture: HUD Layer - Direct DOM manipulation or canvas rendering
 */
class HUDService {
    constructor() {
        // HUD element registry
        this.elements = new Map();
        this.canvasElements = [];
        this.domElements = new Map();

        // HUD state
        this.state = {
            visible: false, // Start hidden, will be shown when game starts
            minimized: false,
            opacity: 1,
            theme: 'cyberpunk'
        };

        // Configuration
        this.config = {
            position: {
                topLeft: { x: 20, y: 20 },
                topRight: { x: -20, y: 20 },
                bottomLeft: { x: 20, y: -100 },
                bottomRight: { x: -20, y: -20 },
                center: { x: 0, y: 0 }
            },
            fontSize: {
                small: 12,
                normal: 14,
                large: 18,
                header: 24
            },
            colors: {
                health: '#00ff00',
                healthLow: '#ff0000',
                healthMid: '#ffff00',
                energy: '#00ffff',
                ammo: '#ffaa00',
                objective: '#ffffff',
                objectiveComplete: '#00ff00',
                alert: '#ff0000',
                info: '#00ffcc'
            }
        };

        // HUD components
        this.components = {
            agentStatus: null,
            missionObjectives: null,
            minimap: null,
            resources: null,
            controls: null,
            alerts: [],
            combatLog: [],
            quickSlots: null
        };

        // Canvas reference for canvas-based HUD
        this.canvas = null;
        this.ctx = null;

        // DOM container for HTML-based HUD
        this.hudContainer = null;

        // Initialization state
        this.initialized = false;

        console.log('🎮 HUDService initialized');
    }

    /**
     * Initialize HUD service
     */
    initialize(canvas = null) {
        // Setup canvas if provided
        if (canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
        }

        // Create DOM container for HTML HUD elements
        this.createHUDContainer();

        // Don't create components yet - wait until HUD is shown
        // this.initializeComponents(); // Commented out for lazy initialization

        // Mark as initialized
        this.initialized = true;

        return this;
    }

    /**
     * Create HUD container for DOM elements
     */
    createHUDContainer() {
        if (!document.getElementById('hud-container')) {
            const container = document.createElement('div');
            container.id = 'hud-container';
            container.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 5000;
                display: none; /* Start hidden */
            `;
            document.body.appendChild(container);
            this.hudContainer = container;
        } else {
            this.hudContainer = document.getElementById('hud-container');
        }
    }

    /**
     * Initialize default HUD components
     */
    initializeComponents() {
        // Agent status panel
        this.createAgentStatusPanel();

        // Mission objectives panel
        this.createMissionObjectivesPanel();

        // Resource display
        this.createResourceDisplay();

        // Controls hint
        this.createControlsHint();

        // Combat log
        this.createCombatLog();

        // Alert area
        this.createAlertArea();
    }

    /**
     * Create agent status panel
     */
    createAgentStatusPanel() {
        const panel = document.createElement('div');
        panel.id = 'hud-agent-status';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ffcc;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            color: #fff;
            pointer-events: auto;
            min-width: 200px;
        `;
        panel.innerHTML = `
            <div style="color: #00ffcc; margin-bottom: 5px;">AGENT STATUS</div>
            <div id="agent-status-content">No agents deployed</div>
        `;

        this.hudContainer.appendChild(panel);
        this.components.agentStatus = panel;
    }

    /**
     * Create mission objectives panel
     */
    createMissionObjectivesPanel() {
        const panel = document.createElement('div');
        panel.id = 'hud-objectives';
        panel.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ffcc;
            padding: 10px;
            font-family: monospace;
            font-size: 12px;
            color: #fff;
            pointer-events: auto;
            min-width: 250px;
            max-width: 350px;
        `;
        panel.innerHTML = `
            <div style="color: #00ffcc; margin-bottom: 5px;">MISSION OBJECTIVES</div>
            <div id="objectives-content">No active mission</div>
        `;

        this.hudContainer.appendChild(panel);
        this.components.missionObjectives = panel;
    }

    /**
     * Create resource display
     */
    createResourceDisplay() {
        const display = document.createElement('div');
        display.id = 'hud-resources';
        display.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ffcc;
            padding: 5px 15px;
            font-family: monospace;
            font-size: 14px;
            color: #00ffcc;
            display: flex;
            gap: 20px;
        `;
        display.innerHTML = `
            <div>💰 <span id="hud-credits">0</span></div>
            <div>🔬 <span id="hud-research">0</span></div>
            <div>🌍 <span id="hud-control">0%</span></div>
        `;

        this.hudContainer.appendChild(display);
        this.components.resources = display;
    }

    /**
     * Create controls hint panel
     */
    createControlsHint() {
        const panel = document.createElement('div');
        panel.id = 'hud-controls';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.7);
            border: 1px solid #00ffcc;
            padding: 10px;
            font-family: monospace;
            font-size: 11px;
            color: #888;
            pointer-events: auto;
        `;
        panel.innerHTML = `
            <div style="color: #00ffcc; margin-bottom: 5px;">CONTROLS</div>
            <div>H - Hack/Interact | G - Grenade | S - Shield</div>
            <div>Tab - Cycle Agents | E - 3D Mode | ESC - Pause</div>
        `;

        this.hudContainer.appendChild(panel);
        this.components.controls = panel;
    }

    /**
     * Create combat log
     */
    createCombatLog() {
        const log = document.createElement('div');
        log.id = 'hud-combat-log';
        log.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.5);
            padding: 10px;
            font-family: monospace;
            font-size: 11px;
            color: #aaa;
            max-width: 300px;
            max-height: 150px;
            overflow-y: auto;
            pointer-events: none;
        `;

        this.hudContainer.appendChild(log);
        this.components.combatLog = [];
    }

    /**
     * Create alert area
     */
    createAlertArea() {
        const alertArea = document.createElement('div');
        alertArea.id = 'hud-alerts';
        alertArea.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            text-align: center;
        `;

        this.hudContainer.appendChild(alertArea);
        this.components.alerts = [];
    }

    /**
     * Update agent status display
     */
    updateAgentStatus(agents) {
        if (!this.components.agentStatus) return;

        const content = document.getElementById('agent-status-content');
        if (!content) return;

        if (!agents || agents.length === 0) {
            content.innerHTML = 'No agents deployed';
            return;
        }

        let html = '';
        agents.forEach((agent, index) => {
            const healthPercent = (agent.health / agent.maxHealth) * 100;
            const healthColor = healthPercent > 50 ? '#0f0' :
                              healthPercent > 25 ? '#ff0' : '#f00';

            html += `
                <div style="margin-bottom: 8px; ${agent.selected ? 'border-left: 2px solid #0ff; padding-left: 5px;' : ''}">
                    <div style="display: flex; justify-content: space-between;">
                        <span>${index + 1}. ${agent.name}</span>
                        <span>${agent.health}/${agent.maxHealth}</span>
                    </div>
                    <div style="background: #333; height: 4px; margin-top: 2px;">
                        <div style="background: ${healthColor}; height: 100%; width: ${healthPercent}%;"></div>
                    </div>
                    ${agent.shield > 0 ? `
                        <div style="color: #0ff; font-size: 10px;">Shield: ${agent.shield}</div>
                    ` : ''}
                    ${agent.ammo !== undefined ? `
                        <div style="color: #fa0; font-size: 10px;">Ammo: ${agent.ammo}</div>
                    ` : ''}
                </div>
            `;
        });

        content.innerHTML = html;
    }

    /**
     * Update mission objectives
     */
    updateMissionObjectives(objectives) {
        if (!this.components.missionObjectives) return;

        const content = document.getElementById('objectives-content');
        if (!content) return;

        if (!objectives || objectives.length === 0) {
            content.innerHTML = 'No active objectives';
            return;
        }

        let html = '';
        objectives.forEach(obj => {
            const color = obj.completed ? '#0f0' :
                         obj.optional ? '#888' : '#fff';
            const icon = obj.completed ? '✓' :
                        obj.failed ? '✗' : '•';

            html += `
                <div style="margin-bottom: 5px; color: ${color};">
                    <span style="margin-right: 5px;">${icon}</span>
                    <span style="${obj.completed ? 'text-decoration: line-through;' : ''}">
                        ${obj.description}
                    </span>
                    ${obj.progress !== undefined ? `
                        <span style="color: #0ff; margin-left: 5px;">
                            (${obj.progress}/${obj.total})
                        </span>
                    ` : ''}
                </div>
            `;
        });

        content.innerHTML = html;
    }

    /**
     * Update resource display
     */
    updateResources(resources) {
        if (!this.components.resources) return;

        if (resources.credits !== undefined) {
            const element = document.getElementById('hud-credits');
            if (element) element.textContent = resources.credits.toLocaleString();
        }

        if (resources.research !== undefined) {
            const element = document.getElementById('hud-research');
            if (element) element.textContent = resources.research.toLocaleString();
        }

        if (resources.control !== undefined) {
            const element = document.getElementById('hud-control');
            if (element) element.textContent = `${Math.round(resources.control)}%`;
        }
    }

    /**
     * Add combat log entry
     */
    addCombatLogEntry(message, type = 'info') {
        const log = document.getElementById('hud-combat-log');
        if (!log) return;

        const entry = document.createElement('div');
        entry.style.cssText = `
            margin-bottom: 2px;
            color: ${this.getCombatLogColor(type)};
        `;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;

        log.appendChild(entry);
        this.components.combatLog.push(entry);

        // Limit log size
        if (this.components.combatLog.length > 50) {
            const old = this.components.combatLog.shift();
            old.remove();
        }

        // Auto-scroll to bottom
        log.scrollTop = log.scrollHeight;
    }

    /**
     * Show alert message
     */
    showAlert(message, duration = 3000, type = 'info') {
        const alertArea = document.getElementById('hud-alerts');
        if (!alertArea) return;

        const alert = document.createElement('div');
        alert.style.cssText = `
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid ${this.getAlertColor(type)};
            color: ${this.getAlertColor(type)};
            padding: 15px 30px;
            margin-bottom: 10px;
            font-family: monospace;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.3s;
        `;
        alert.textContent = message;

        alertArea.appendChild(alert);

        // Animate in
        setTimeout(() => {
            alert.style.opacity = '1';
            alert.style.transform = 'scale(1)';
        }, 10);

        // Auto-remove
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'scale(0.8)';
            setTimeout(() => alert.remove(), 300);
        }, duration);
    }

    /**
     * Render canvas-based HUD elements
     */
    renderCanvasHUD(ctx, gameState) {
        if (!this.state.visible || !ctx) return;

        ctx.save();

        // Apply HUD opacity
        ctx.globalAlpha = this.state.opacity;

        // Render radar/minimap
        if (gameState.showMinimap) {
            this.renderMinimap(ctx, gameState);
        }

        // Render crosshair in 3D mode
        if (gameState.mode3D && gameState.mode3D !== '2d') {
            this.renderCrosshair(ctx);
        }

        // Render waypoints
        if (gameState.waypoints && gameState.waypoints.length > 0) {
            this.renderWaypoints(ctx, gameState);
        }

        // Render interaction prompts
        if (gameState.nearInteractable) {
            this.renderInteractionPrompt(ctx, gameState.nearInteractable);
        }

        ctx.restore();
    }

    /**
     * Render minimap
     */
    renderMinimap(ctx, gameState) {
        const size = 150;
        const x = ctx.canvas.width - size - 20;
        const y = 20;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, size, size);

        // Border
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, size, size);

        // Scale factor
        const scale = size / Math.max(gameState.mapWidth, gameState.mapHeight);

        // Draw map features
        ctx.fillStyle = '#004444';
        if (gameState.walls) {
            gameState.walls.forEach(wall => {
                ctx.fillRect(
                    x + wall.x * scale,
                    y + wall.y * scale,
                    scale, scale
                );
            });
        }

        // Draw agents
        ctx.fillStyle = '#00ff00';
        if (gameState.agents) {
            gameState.agents.forEach(agent => {
                if (agent.health > 0) {
                    ctx.beginPath();
                    ctx.arc(
                        x + agent.x * scale,
                        y + agent.y * scale,
                        3, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
            });
        }

        // Draw enemies
        ctx.fillStyle = '#ff0000';
        if (gameState.enemies) {
            gameState.enemies.forEach(enemy => {
                if (enemy.health > 0) {
                    ctx.fillRect(
                        x + enemy.x * scale - 1,
                        y + enemy.y * scale - 1,
                        3, 3
                    );
                }
            });
        }
    }

    /**
     * Render crosshair
     */
    renderCrosshair(ctx) {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height / 2;

        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;

        // Horizontal line
        ctx.beginPath();
        ctx.moveTo(centerX - 20, centerY);
        ctx.lineTo(centerX - 5, centerY);
        ctx.moveTo(centerX + 5, centerY);
        ctx.lineTo(centerX + 20, centerY);
        ctx.stroke();

        // Vertical line
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - 20);
        ctx.lineTo(centerX, centerY - 5);
        ctx.moveTo(centerX, centerY + 5);
        ctx.lineTo(centerX, centerY + 20);
        ctx.stroke();

        // Center dot
        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /**
     * Render waypoints
     */
    renderWaypoints(ctx, gameState) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);

        gameState.waypoints.forEach((waypoint, index) => {
            const iso = gameState.worldToIsometric(waypoint.x, waypoint.y);

            // Draw waypoint marker
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(iso.x, iso.y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Draw waypoint number
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(index + 1, iso.x, iso.y - 10);

            // Connect waypoints
            if (index > 0) {
                const prevWaypoint = gameState.waypoints[index - 1];
                const prevIso = gameState.worldToIsometric(prevWaypoint.x, prevWaypoint.y);
                ctx.beginPath();
                ctx.moveTo(prevIso.x, prevIso.y);
                ctx.lineTo(iso.x, iso.y);
                ctx.stroke();
            }
        });

        ctx.setLineDash([]);
    }

    /**
     * Render interaction prompt
     */
    renderInteractionPrompt(ctx, interactable) {
        const centerX = ctx.canvas.width / 2;
        const centerY = ctx.canvas.height * 0.7;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(centerX - 100, centerY - 20, 200, 40);

        // Border
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(centerX - 100, centerY - 20, 200, 40);

        // Text
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`Press H to ${interactable.action}`, centerX, centerY);
    }

    /**
     * Show HUD (and initialize components if needed)
     */
    show() {
        // Initialize components on first show
        if (!this.components.agentStatus) {
            this.initializeComponents();
        }

        this.state.visible = true;
        if (this.hudContainer) {
            this.hudContainer.style.display = 'block';
        }
    }

    /**
     * Hide HUD
     */
    hide() {
        this.state.visible = false;
        if (this.hudContainer) {
            this.hudContainer.style.display = 'none';
        }
    }

    /**
     * Toggle HUD visibility
     */
    toggleVisibility() {
        if (this.state.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Set HUD opacity
     */
    setOpacity(opacity) {
        this.state.opacity = Math.max(0, Math.min(1, opacity));

        if (this.hudContainer) {
            this.hudContainer.style.opacity = this.state.opacity;
        }
    }

    /**
     * Toggle minimized state
     */
    toggleMinimized() {
        this.state.minimized = !this.state.minimized;

        // Hide/show non-essential HUD elements
        const elements = ['hud-controls', 'hud-combat-log'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = this.state.minimized ? 'none' : 'block';
            }
        });
    }

    /**
     * Show/hide specific component
     */
    toggleComponent(componentName) {
        const component = this.components[componentName];
        if (component && component.style) {
            const isHidden = component.style.display === 'none';
            component.style.display = isHidden ? 'block' : 'none';
        }
    }

    /**
     * Get combat log color by type
     */
    getCombatLogColor(type) {
        const colors = {
            damage: '#ff6666',
            heal: '#66ff66',
            kill: '#ff0000',
            info: '#aaaaaa',
            warning: '#ffaa00',
            success: '#00ff00'
        };
        return colors[type] || colors.info;
    }

    /**
     * Get alert color by type
     */
    getAlertColor(type) {
        const colors = {
            success: '#00ff00',
            warning: '#ffaa00',
            error: '#ff0000',
            info: '#00ffcc',
            mission: '#ff00ff'
        };
        return colors[type] || colors.info;
    }

    /**
     * Clear all HUD elements
     */
    clear() {
        // Clear combat log
        const log = document.getElementById('hud-combat-log');
        if (log) log.innerHTML = '';
        this.components.combatLog = [];

        // Clear alerts
        const alertArea = document.getElementById('hud-alerts');
        if (alertArea) alertArea.innerHTML = '';
        this.components.alerts = [];

        // Reset displays
        this.updateAgentStatus([]);
        this.updateMissionObjectives([]);
    }

    /**
     * Destroy HUD service
     */
    destroy() {
        if (this.hudContainer) {
            this.hudContainer.remove();
            this.hudContainer = null;
        }

        this.elements.clear();
        this.components = {};
    }

    /**
     * Get HUD state
     */
    getState() {
        return {
            ...this.state,
            componentsVisible: Object.entries(this.components).reduce((acc, [key, comp]) => {
                if (comp && comp.style) {
                    acc[key] = comp.style.display !== 'none';
                }
                return acc;
            }, {})
        };
    }
}

// Export for use in game
if (typeof window !== 'undefined') {
    window.HUDService = HUDService;
}