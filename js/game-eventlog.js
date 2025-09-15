/**
 * Event Log System
 * Tracks and displays all mission events in real-time
 */

// Initialize event log
CyberOpsGame.prototype.initEventLog = function() {
    this.eventLog = [];
    this.maxLogEntries = 50;
    this.eventLogElement = document.getElementById('eventLogContent');
    this.eventLogExpanded = true; // Start expanded
    this.eventLogMode = 'full'; // 'full' or 'compact'
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
        hack: '#00ffff',        // Cyan for hacking
        item: '#ffaa00',        // Gold for items/loot
        ability: '#ff00ff',     // Magenta for abilities
        team: '#00ff00',        // Green for team commands
        command: '#00ff00',     // Green for commands
        success: '#00ff00',     // Green for success
        warning: '#ffff00',     // Yellow for warnings
        info: '#ffffff',        // White for info
        agent: '#00aaff'        // Blue for agent actions
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
};

// Get formatted mission time
CyberOpsGame.prototype.getFormattedTime = function() {
    const totalSeconds = Math.floor(this.missionTimer / 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Log combat events
CyberOpsGame.prototype.logCombatHit = function(attacker, target, damage) {
    const attackerName = attacker.name || (attacker.type === 'enemy' ? `Enemy ${attacker.id}` : 'Unknown');
    const targetName = target.name || (target.type === 'enemy' ? `Enemy ${target.id}` : 'Unknown');

    if (attacker.type === 'agent') {
        this.logEvent(`${attackerName} hit ${targetName} for ${damage} damage`, 'combat');
    } else {
        this.logEvent(`${attackerName} hit ${targetName} for ${damage} damage`, 'enemy');
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

// Log item collection
CyberOpsGame.prototype.logItemCollected = function(agent, item) {
    const agentName = agent.name || 'Agent';
    let itemDesc = '';

    switch(item.type) {
        case 'credits':
            itemDesc = `💰 ${item.value} credits`;
            break;
        case 'intel':
            itemDesc = `📄 Intel document`;
            break;
        case 'health':
            itemDesc = `❤️ Health pack`;
            break;
        case 'armor':
            itemDesc = `🛡️ Armor upgrade`;
            break;
        case 'ammo':
            itemDesc = `🔫 Ammo`;
            break;
        case 'keycard':
            itemDesc = `🗝️ Keycard`;
            break;
        case 'explosives':
            itemDesc = `💣 Explosives`;
            break;
        default:
            itemDesc = item.type;
    }

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