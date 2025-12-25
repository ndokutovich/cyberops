/**
 * Event Log System
 * Tracks and displays all mission events in real-time
 */

// Initialize event log
CyberOpsGame.prototype.initEventLog = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameEventlog') : null;
    }
    this.eventLog = [];
    this.maxLogEntries = 50;
    this.eventLogElement = document.getElementById('eventLogContent');
    this.eventLogExpanded = true; // Start expanded
    this.eventLogMode = 'full'; // 'full' or 'compact'

    // Ensure event log container is interactive
    const eventLogContainer = document.getElementById('eventLogFull');
    if (eventLogContainer) {
        eventLogContainer.style.pointerEvents = 'auto';
        // Don't change position - it should stay as defined in HTML/CSS
        eventLogContainer.style.zIndex = '15';
    }

    // Ensure the entire event log wrapper is interactive
    const eventLogWrapper = document.getElementById('eventLog');
    if (eventLogWrapper) {
        eventLogWrapper.style.pointerEvents = 'auto';
        // Don't change position from absolute to relative! This breaks the layout
        // The HTML already has position: absolute with top: 100px, right: 20px
        eventLogWrapper.style.zIndex = '15';
    }
};

// Add event to log
CyberOpsGame.prototype.logEvent = function(message, type = 'info', important = false) {
    if (!this.eventLog) this.eventLog = [];

    const timestamp = this.getFormattedTime();
    const event = {
        time: timestamp,
        message: message,
        type: type,
        important: important
    };

    // Add to log array
    this.eventLog.unshift(event);

    // Limit log size
    if (this.eventLog.length > this.maxLogEntries) {
        this.eventLog.pop();
    }

    // Update UI
    this.updateEventLogUI(event);
};

// Get color for event type
CyberOpsGame.prototype.getEventColor = function(type) {
    const colors = {
        combat: '#ff4444',      // Red for combat
        enemy: '#ff6666',       // Light red for enemy actions
        player: '#00ff00',      // Green for player actions
        npc: '#ff00ff',         // Magenta for NPC interactions
        hack: '#00ffff',        // Cyan for hacking
        item: '#ffaa00',        // Gold for items/loot
        ability: '#8800ff',     // Purple for abilities
        team: '#00ff00',        // Green for team commands
        command: '#00ff00',     // Green for commands
        success: '#00ff00',     // Green for success
        objective: '#ffff00',   // Yellow for objectives
        quest: '#ff00ff',       // Magenta for quest updates
        reward: '#ffd700',      // Gold for rewards
        extraction: '#00ff00',  // Green for extraction point
        mission: '#00ffff',     // Cyan for mission updates
        warning: '#ff8800',     // Orange for warnings
        info: '#ffffff',        // White for info
        agent: '#00aaff',       // Blue for agent actions
        death: '#ff0000'        // Bright red for deaths
    };
    return colors[type] || colors.info;
};

// Update event log UI
CyberOpsGame.prototype.updateEventLogUI = function(event) {
    // Update compact mode display
    const compactEl = document.getElementById('eventLogCompact');
    if (compactEl) {
        const color = this.getEventColor(event.type);
        compactEl.innerHTML = `<span style="color: ${color};">[${event.time}] ${event.message}</span>`;
    }

    // Update full log
    const logContent = document.getElementById('eventLogContent');
    if (!logContent) return;

    // Create event element
    const eventDiv = document.createElement('div');
    eventDiv.style.cssText = `
        padding: 2px 0;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        animation: fadeIn 0.3s;
        ${event.important ? 'font-weight: bold;' : ''}
    `;

    // Get color for this event type
    const color = this.getEventColor(event.type);

    eventDiv.innerHTML = `
        <span style="color: #888;">[${event.time}]</span>
        <span style="color: ${color}; margin-left: 5px;">${event.message}</span>
    `;

    // Add to top of log (newest first)
    logContent.insertBefore(eventDiv, logContent.firstChild);

    // Remove old entries if too many
    while (logContent.children.length > 20) {
        logContent.removeChild(logContent.lastChild);
    }

    // Auto-scroll to show the newest entry
    const eventLogContainer = logContent.parentElement;
    if (eventLogContainer) {
        // With flex-direction: column-reverse, newest items are at the bottom
        // So we need to scroll to the maximum position to see the latest
        eventLogContainer.scrollTop = eventLogContainer.scrollHeight;
    }
};

// Get formatted mission time
CyberOpsGame.prototype.getFormattedTime = function() {
    const totalSeconds = Math.floor(this.missionTimer / 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Log combat events
CyberOpsGame.prototype.logCombatHit = function(attacker, target, damage, killed = false) {
    const attackerName = attacker.name || (attacker.type === 'enemy' ? `Enemy ${attacker.id}` : 'Unknown');
    const targetName = target.name || (target.type === 'enemy' ? `Enemy ${target.id}` : 'Unknown');

    // Build message with kill confirmation if applicable
    let message = `${attackerName} hit ${targetName} for ${damage} damage`;
    if (killed) {
        message += ' (KILLED!)';
    }

    if (attacker.type === 'agent') {
        this.logEvent(message, 'combat');
    } else {
        this.logEvent(message, 'enemy');
    }
};

// Log death events
CyberOpsGame.prototype.logDeath = function(unit) {
    const unitName = unit.name || (unit.type === 'enemy' ? `Enemy ${unit.id}` : 'Unknown');

    if (unit.type === 'agent') {
        this.logEvent(`☠️ ${unitName} has fallen!`, 'death', true);
    } else {
        this.logEvent(`Enemy eliminated: ${unitName}`, 'combat');
    }
};

// Log item collection - uses CollectableRegistry for polymorphic behavior
CyberOpsGame.prototype.logItemCollected = function(agent, item) {
    const agentName = agent.name || 'Agent';

    // Use CollectableRegistry for polymorphic log message
    const itemDesc = window.CollectableRegistry
        ? window.CollectableRegistry.getLogMessage(item, { agent })
        : (item.name || item.type || 'item');

    this.logEvent(`${agentName} collected ${itemDesc}`, 'item');
};

// Log hacking events
CyberOpsGame.prototype.logHack = function(agent, target, success) {
    const agentName = agent.name || 'Agent';

    if (success) {
        this.logEvent(`💻 ${agentName} successfully hacked ${target}`, 'hack');
    } else {
        this.logEvent(`${agentName} failed to hack ${target}`, 'warning');
    }
};

// Log ability usage
CyberOpsGame.prototype.logAbility = function(agent, ability) {
    const agentName = agent.name || 'Agent';

    switch(ability) {
        case 'shoot':
            this.logEvent(`${agentName} opened fire 🎯`, 'ability');
            break;
        case 'grenade':
            this.logEvent(`${agentName} threw grenade 💣`, 'ability');
            break;
        case 'hack':
            this.logEvent(`${agentName} initiated hack 💻`, 'ability');
            break;
        case 'shield':
            this.logEvent(`${agentName} activated shield 🛡️`, 'ability');
            break;
    }
};

// Log team commands
CyberOpsGame.prototype.logTeamCommand = function(command) {
    switch(command) {
        case 'hold':
            this.logEvent('Team ordered to HOLD POSITION', 'team', true);
            break;
        case 'patrol':
            this.logEvent('Team ordered to PATROL AREA', 'team', true);
            break;
        case 'follow':
            this.logEvent('Team ordered to FOLLOW LEADER', 'team', true);
            break;
    }
};

// Log mission events
CyberOpsGame.prototype.logMissionEvent = function(event) {
    switch(event) {
        case 'start':
            this.logEvent('MISSION START', 'info', true);
            break;
        case 'objective_complete':
            this.logEvent('✅ Objective completed!', 'success', true);
            break;
        case 'alarm':
            this.logEvent('⚠️ ALARM TRIGGERED!', 'warning', true);
            break;
        case 'reinforcements':
            this.logEvent('Enemy reinforcements arriving!', 'enemy', true);
            break;
    }
};

// Toggle event log between full/compact/hidden
CyberOpsGame.prototype.toggleEventLog = function() {
    const fullLog = document.getElementById('eventLogFull');
    const compactLog = document.getElementById('eventLogCompact');
    const toggleIcon = document.getElementById('logToggleIcon');
    const modeIndicator = document.getElementById('logModeIndicator');

    if (!fullLog || !compactLog) return;

    // Cycle through: full -> compact -> hidden -> full
    if (this.eventLogMode === 'full') {
        // Switch to compact
        this.eventLogMode = 'compact';
        fullLog.style.display = 'none';
        compactLog.style.display = 'block';
        toggleIcon.textContent = '▶';
        modeIndicator.textContent = 'COMPACT';
    } else if (this.eventLogMode === 'compact') {
        // Switch to hidden
        this.eventLogMode = 'hidden';
        fullLog.style.display = 'none';
        compactLog.style.display = 'none';
        toggleIcon.textContent = '◀';
        modeIndicator.textContent = 'HIDDEN';
    } else {
        // Switch to full
        this.eventLogMode = 'full';
        fullLog.style.display = 'block';
        compactLog.style.display = 'none';
        toggleIcon.textContent = '▼';
        modeIndicator.textContent = 'FULL';
    }
};

// Clear log
CyberOpsGame.prototype.clearEventLog = function() {
    this.eventLog = [];
    const logContent = document.getElementById('eventLogContent');
    if (logContent) {
        logContent.innerHTML = '';
    }
    const compactEl = document.getElementById('eventLogCompact');
    if (compactEl) {
        compactEl.innerHTML = '';
    }
};

// Add CSS animation for fade in
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    `;
    document.head.appendChild(style);
}