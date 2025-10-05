/**
 * Dialog & Modal Editor Functionality for Mission Editor
 * Provides visual editors for the Declarative Dialog System and Modal Engine
 */

class DialogSystemEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.states = {};
        this.transitions = {};
        this.layouts = {};
        this.selectedState = null;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
    }

    async init() {
        this.canvas = document.getElementById('dialog-graph-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');

        // Set canvas size based on container
        this.resizeCanvas();

        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());

        // Load dialog config
        await this.loadDialogConfig();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.render();
    }

    resizeCanvas() {
        if (!this.canvas) return;

        // Make canvas large enough to show all nodes with readable text
        const nodeCount = Object.keys(this.states).length;
        const minSize = Math.max(800, nodeCount * 50); // Scale with number of nodes

        this.canvas.width = minSize;
        this.canvas.height = minSize;

        // Re-render after resize
        if (this.ctx) {
            this.render();
        }
    }

    async loadDialogConfig() {
        // Load from DIALOG_CONFIG if available
        if (typeof DIALOG_CONFIG !== 'undefined') {
            this.states = DIALOG_CONFIG.states || {};
            this.transitions = DIALOG_CONFIG.transitions || {};
            this.layouts = DIALOG_CONFIG.layouts || {};
        } else {
            // Try to load from file
            try {
                const response = await fetch('js/dialog-config.js');
                const text = await response.text();
                // Extract DIALOG_CONFIG object (simple regex-based extraction)
                const match = text.match(/const DIALOG_CONFIG = ({[\s\S]*});/);
                if (match) {
                    const config = eval('(' + match[1] + ')');
                    this.states = config.states || {};
                    this.transitions = config.transitions || {};
                    this.layouts = config.layouts || {};
                }
            } catch (error) {
                console.error('Failed to load dialog config:', error);
            }
        }

        // Update statistics
        this.updateStatistics();

        // Populate state list
        this.populateStateList();
    }

    updateStatistics() {
        const stateCount = Object.keys(this.states).length;
        const transitionCount = Object.keys(this.transitions).length;
        const layoutCount = Object.keys(this.layouts).length;

        // Count actions (approximate - count navigate and execute actions in buttons)
        let actionCount = 0;
        Object.values(this.states).forEach(state => {
            if (state.buttons) {
                if (Array.isArray(state.buttons)) {
                    actionCount += state.buttons.length;
                }
            }
        });

        document.getElementById('dialog-stats-states').textContent = stateCount;
        document.getElementById('dialog-stats-transitions').textContent = transitionCount;
        document.getElementById('dialog-stats-layouts').textContent = layoutCount;
        document.getElementById('dialog-stats-actions').textContent = actionCount;
    }

    populateStateList() {
        const listEl = document.getElementById('dialog-states-list');
        if (!listEl) return;

        listEl.innerHTML = '';

        Object.keys(this.states).sort().forEach(stateId => {
            const state = this.states[stateId];
            const stateEl = document.createElement('div');
            stateEl.className = 'dialog-state-item';
            stateEl.style.cssText = `
                padding: 10px;
                margin-bottom: 5px;
                background: #1a1a2e;
                border: 1px solid #00ff41;
                border-radius: 4px;
                cursor: pointer;
                transition: all 0.2s;
            `;

            stateEl.innerHTML = `
                <div style="font-weight: bold; color: #00ff41; font-size: 13px;">${stateId}</div>
                <div style="font-size: 11px; color: #888; margin-top: 3px;">Layout: ${state.layout || 'standard'}</div>
            `;

            stateEl.addEventListener('click', () => this.selectState(stateId));
            stateEl.addEventListener('mouseenter', () => {
                stateEl.style.background = '#2a2a3e';
                stateEl.style.borderColor = '#00ffff';
            });
            stateEl.addEventListener('mouseleave', () => {
                if (this.selectedState !== stateId) {
                    stateEl.style.background = '#1a1a2e';
                    stateEl.style.borderColor = '#00ff41';
                }
            });

            listEl.appendChild(stateEl);
        });
    }

    selectState(stateId) {
        this.selectedState = stateId;

        // Update visual selection in list
        document.querySelectorAll('.dialog-state-item').forEach(el => {
            el.style.background = '#1a1a2e';
            el.style.borderColor = '#00ff41';
        });

        event.target.closest('.dialog-state-item').style.background = '#2a2a3e';
        event.target.closest('.dialog-state-item').style.borderColor = '#00ffff';

        // Show state properties
        this.showStateProperties(stateId);

        // Highlight in graph
        this.render();
    }

    showStateProperties(stateId) {
        const state = this.states[stateId];
        const propsEl = document.getElementById('dialog-state-properties');
        if (!propsEl || !state) return;

        let html = `<h4 style="color: #00ff41; margin-top: 0;">State: ${stateId}</h4>`;

        html += `<div style="margin-bottom: 15px;">`;
        html += `<div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">Layout</div>`;
        html += `<div style="color: #fff; padding: 5px; background: #1a1a2e; border-radius: 3px;">${state.layout || 'standard'}</div>`;
        html += `</div>`;

        if (state.title) {
            html += `<div style="margin-bottom: 15px;">`;
            html += `<div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">Title</div>`;
            html += `<div style="color: #fff; padding: 5px; background: #1a1a2e; border-radius: 3px;">${state.title}</div>`;
            html += `</div>`;
        }

        if (state.content) {
            html += `<div style="margin-bottom: 15px;">`;
            html += `<div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">Content Type</div>`;
            html += `<div style="color: #fff; padding: 5px; background: #1a1a2e; border-radius: 3px;">${state.content.type || 'unknown'}</div>`;
            html += `</div>`;
        }

        // Find outgoing transitions
        const outgoing = Object.keys(this.transitions).filter(key => key.startsWith(stateId + '->'));
        if (outgoing.length > 0) {
            html += `<div style="margin-bottom: 15px;">`;
            html += `<div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">Outgoing Transitions (${outgoing.length})</div>`;
            outgoing.forEach(trans => {
                const target = trans.split('->')[1];
                html += `<div style="color: #888; font-size: 12px; padding: 3px;">→ ${target}</div>`;
            });
            html += `</div>`;
        }

        // Find incoming transitions
        const incoming = Object.keys(this.transitions).filter(key => key.endsWith('->' + stateId));
        if (incoming.length > 0) {
            html += `<div style="margin-bottom: 15px;">`;
            html += `<div style="color: #00ffff; font-weight: bold; margin-bottom: 5px;">Incoming Transitions (${incoming.length})</div>`;
            incoming.forEach(trans => {
                const source = trans.split('->')[0];
                html += `<div style="color: #888; font-size: 12px; padding: 3px;">← ${source}</div>`;
            });
            html += `</div>`;
        }

        propsEl.innerHTML = html;
    }

    setupEventListeners() {
        // Zoom controls
        document.getElementById('dialog-zoom-in')?.addEventListener('click', () => {
            this.zoom = Math.min(this.zoom * 1.2, 3);
            this.render();
        });

        document.getElementById('dialog-zoom-out')?.addEventListener('click', () => {
            this.zoom = Math.max(this.zoom / 1.2, 0.3);
            this.render();
        });

        document.getElementById('dialog-reset-view')?.addEventListener('click', () => {
            this.zoom = 1;
            this.offsetX = 0;
            this.offsetY = 0;
            this.render();
        });

        // Canvas drag
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragStartX = e.offsetX - this.offsetX;
            this.dragStartY = e.offsetY - this.offsetY;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.offsetX = e.offsetX - this.dragStartX;
                this.offsetY = e.offsetY - this.dragStartY;
                this.render();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Search
        document.getElementById('dialog-state-search')?.addEventListener('input', (e) => {
            this.filterStates(e.target.value);
        });
    }

    filterStates(searchTerm) {
        const items = document.querySelectorAll('.dialog-state-item');
        const term = searchTerm.toLowerCase();

        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    }

    render() {
        if (!this.ctx || !this.canvas) return;

        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Clear canvas
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);

        // Apply transformations
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);

        // Calculate node positions (simple force-directed layout)
        const states = Object.keys(this.states);
        const nodePositions = this.calculateNodePositions(states);

        // Draw transitions first (so they appear behind nodes)
        this.drawTransitions(nodePositions);

        // Draw nodes
        this.drawNodes(nodePositions);

        ctx.restore();
    }

    calculateNodePositions(states) {
        const positions = {};
        const centerX = this.canvas.width / (2 * this.zoom);
        const centerY = this.canvas.height / (2 * this.zoom);
        const radius = Math.min(centerX, centerY) * 0.7;

        // Simple circular layout
        states.forEach((stateId, index) => {
            const angle = (index / states.length) * 2 * Math.PI;
            positions[stateId] = {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
        });

        return positions;
    }

    drawTransitions(nodePositions) {
        const ctx = this.ctx;

        Object.keys(this.transitions).forEach(transKey => {
            const [from, to] = transKey.split('->');
            if (!nodePositions[from] || !nodePositions[to]) return;

            const fromPos = nodePositions[from];
            const toPos = nodePositions[to];

            // Draw arrow
            ctx.strokeStyle = '#00ff41';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fromPos.x, fromPos.y);
            ctx.lineTo(toPos.x, toPos.y);
            ctx.stroke();

            // Draw arrowhead
            const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
            const headLength = 10;
            ctx.beginPath();
            ctx.moveTo(toPos.x, toPos.y);
            ctx.lineTo(
                toPos.x - headLength * Math.cos(angle - Math.PI / 6),
                toPos.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(toPos.x, toPos.y);
            ctx.lineTo(
                toPos.x - headLength * Math.cos(angle + Math.PI / 6),
                toPos.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            ctx.stroke();
        });
    }

    drawNodes(nodePositions) {
        const ctx = this.ctx;

        Object.keys(nodePositions).forEach(stateId => {
            const pos = nodePositions[stateId];
            const isSelected = stateId === this.selectedState;
            const state = this.states[stateId];

            // Determine node color based on type
            let nodeColor = '#00ff41'; // Default (dialog)
            if (state.type === 'screen') nodeColor = '#ff00ff'; // Purple for screens
            else if (state.layout === 'confirmation') nodeColor = '#ffff00'; // Yellow for confirmations
            else if (state.layout === 'alert') nodeColor = '#ff0000'; // Red for alerts

            if (isSelected) nodeColor = '#00ffff';

            // Draw node circle (larger)
            ctx.fillStyle = nodeColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 30, 0, 2 * Math.PI);
            ctx.fill();

            if (isSelected) {
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 4;
                ctx.stroke();
            } else {
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // Draw label below (larger, multi-line if needed)
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';

            // Break long labels into multiple lines
            const maxChars = 16;
            if (stateId.length > maxChars) {
                const parts = stateId.split('-');
                let line1 = parts[0] || '';
                let line2 = parts.slice(1).join('-').substring(0, maxChars);
                ctx.fillText(line1, pos.x, pos.y + 35);
                ctx.fillText(line2, pos.x, pos.y + 50);
            } else {
                ctx.fillText(stateId, pos.x, pos.y + 35);
            }
        });
    }
}

class ModalEngineEditor {
    constructor() {
        this.selectedType = null;
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Modal type selection
        document.querySelectorAll('.modal-type-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectModalType(item.dataset.type);
            });
        });

        // Test preview button
        document.getElementById('modal-test-preview')?.addEventListener('click', () => {
            this.testModalLive();
        });
    }

    selectModalType(type) {
        this.selectedType = type;

        // Update visual selection
        document.querySelectorAll('.modal-type-item').forEach(item => {
            if (item.dataset.type === type) {
                item.style.background = '#2a2a3e';
                item.style.borderColor = '#00ffff';
            } else {
                item.style.background = '#1a1a2e';
                item.style.borderColor = '#00ff41';
            }
        });

        // Show configuration for this type
        this.showModalConfiguration(type);

        // Show preview
        this.showModalPreview(type);
    }

    showModalConfiguration(type) {
        const configArea = document.getElementById('modal-config-area');
        if (!configArea) return;

        const configs = {
            confirmation: `
                <label style="display: block; margin-bottom: 10px;">
                    Title: <input type="text" id="modal-conf-title" value="Confirm Action?" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Message: <textarea id="modal-conf-message" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; resize: vertical; height: 80px;">Are you sure you want to proceed?</textarea>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Confirm Button Text: <input type="text" id="modal-conf-confirm" value="YES" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Cancel Button Text: <input type="text" id="modal-conf-cancel" value="NO" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
            `,
            alert: `
                <label style="display: block; margin-bottom: 10px;">
                    Title: <input type="text" id="modal-alert-title" value="Alert" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Message: <textarea id="modal-alert-message" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; resize: vertical; height: 80px;">This is an alert message.</textarea>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Icon: <select id="modal-alert-icon" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;">
                        <option value="">None</option>
                        <option value="⚠">⚠ Warning</option>
                        <option value="ℹ">ℹ Info</option>
                        <option value="✓">✓ Success</option>
                        <option value="✗">✗ Error</option>
                    </select>
                </label>
            `,
            npc: `
                <label style="display: block; margin-bottom: 10px;">
                    NPC Name: <input type="text" id="modal-npc-name" value="Mysterious Contact" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Dialog Text: <textarea id="modal-npc-dialog" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; resize: vertical; height: 80px;">I have valuable information for you...</textarea>
                </label>
                <label style="display: block; margin-bottom: 10px;">
                    Number of Choices: <input type="number" id="modal-npc-choices" min="1" max="6" value="3" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
            `,
            equipment: `
                <p style="color: #888;">Equipment modal configuration...</p>
                <label style="display: block; margin-bottom: 10px;">
                    Title: <input type="text" id="modal-equip-title" value="Select Equipment" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
            `,
            list: `
                <p style="color: #888;">List modal configuration...</p>
                <label style="display: block; margin-bottom: 10px;">
                    Title: <input type="text" id="modal-list-title" value="Select Item" style="width: 100%; padding: 5px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41;" />
                </label>
            `
        };

        configArea.innerHTML = configs[type] || '<p style="color: #888;">No configuration available</p>';
    }

    showModalPreview(type) {
        const previewArea = document.getElementById('modal-preview-area');
        const previewContent = document.getElementById('modal-preview-content');
        if (!previewArea || !previewContent) return;

        previewArea.style.display = 'block';

        const previews = {
            confirmation: `
                <div style="text-align: center;">
                    <div style="font-size: 18px; font-weight: bold; color: #00ff41; margin-bottom: 15px;">Confirm Action?</div>
                    <div style="color: #ccc; margin-bottom: 20px;">Are you sure you want to proceed?</div>
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button style="padding: 10px 20px; background: #00ff41; color: #1a1a2e; border: none; cursor: pointer;">YES</button>
                        <button style="padding: 10px 20px; background: transparent; color: #ff0000; border: 1px solid #ff0000; cursor: pointer;">NO</button>
                    </div>
                </div>
            `,
            alert: `
                <div style="text-align: center;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠</div>
                    <div style="font-size: 18px; font-weight: bold; color: #00ff41; margin-bottom: 15px;">Alert</div>
                    <div style="color: #ccc; margin-bottom: 20px;">This is an alert message.</div>
                    <button style="padding: 10px 20px; background: #00ff41; color: #1a1a2e; border: none; cursor: pointer;">OK</button>
                </div>
            `,
            npc: `
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: #00ffff; margin-bottom: 10px;">💬 Mysterious Contact</div>
                    <div style="color: #ccc; margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-left: 3px solid #00ff41;">I have valuable information for you...</div>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button style="padding: 8px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; cursor: pointer; text-align: left;">1. Tell me more</button>
                        <button style="padding: 8px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; cursor: pointer; text-align: left;">2. How much?</button>
                        <button style="padding: 8px; background: #1a1a2e; color: #00ff41; border: 1px solid #00ff41; cursor: pointer; text-align: left;">3. Not interested</button>
                    </div>
                </div>
            `,
            equipment: `
                <div style="text-align: center; color: #888;">Equipment modal preview...</div>
            `,
            list: `
                <div style="text-align: center; color: #888;">List modal preview...</div>
            `
        };

        previewContent.innerHTML = previews[type] || '<p style="color: #888;">No preview available</p>';
    }

    testModalLive() {
        if (!this.selectedType) return;

        alert(`Would open ${this.selectedType} modal in live game (not implemented in editor)`);
    }
}

// Initialize editors when tab is opened
document.addEventListener('DOMContentLoaded', () => {
    const dialogEditor = new DialogSystemEditor();
    const modalEditor = new ModalEngineEditor();

    // Initialize when tabs are clicked
    document.querySelectorAll('.campaign-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;

            if (tabName === 'dialogs' && !dialogEditor.canvas) {
                setTimeout(() => dialogEditor.init(), 100);
            }

            if (tabName === 'modals' && !modalEditor.selectedType) {
                setTimeout(() => modalEditor.init(), 100);
            }
        });
    });
});
