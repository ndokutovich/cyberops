/**
 * Equipment Management System
 * Handles per-agent loadouts, inventory management, and selling
 */

// Initialize equipment management
CyberOpsGame.prototype.initializeEquipmentSystem = function() {
    // Store agent loadouts (persists between missions)
    this.agentLoadouts = {};

    // Track selected agent in equipment screen
    this.selectedEquipmentAgent = null;

    // Initialize loadouts for existing agents
    this.activeAgents.forEach(agent => {
        if (!this.agentLoadouts[agent.id]) {
            this.agentLoadouts[agent.id] = {
                weapon: null,
                armor: null,
                utility: null,
                special: null
            };
        }
    });

    // Initialize InventoryService if available
    if (this.gameServices && this.gameServices.inventoryService) {
        if (this.logger) this.logger.debug('🎒 Initializing InventoryService...');
        this.gameServices.inventoryService.initializeFromGame(this);
        if (this.logger) this.logger.info('✅ InventoryService initialized');
    }

    // Add global handler for equipment dialog close buttons (fallback)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#equipmentDialog .dialog-close') ||
            (e.target.textContent === '[X]' && e.target.closest('#equipmentDialog')) ||
            (e.target.textContent === 'CLOSE' && e.target.closest('#equipmentDialog'))) {
            if (this.logger) this.logger.debug('🔒 Equipment close button clicked via delegation');
            this.closeEquipmentDialog();
        }
    });
};

// Open equipment management dialog
CyberOpsGame.prototype.showEquipmentManagement = function() {
    // If declarative dialog system is available, use it
    if (this.dialogEngine) {
        if (this.logger) this.logger.debug('🔫 Redirecting to declarative Arsenal dialog');
        this.dialogEngine.navigateTo('arsenal');
        return;
    }

    // Initialize if needed
    if (!this.agentLoadouts) {
        this.initializeEquipmentSystem();
    }

    // Auto-select first available agent if none selected
    let needsRefresh = false;
    if (!this.selectedEquipmentAgent && this.activeAgents && this.activeAgents.length > 0) {
        // In game mode, try to use the currently selected agent
        if (this.currentScreen === 'game' && this._selectedAgent) {
            this.selectedEquipmentAgent = this._selectedAgent.originalId || this._selectedAgent.id || this._selectedAgent.name;
        } else {
            // Otherwise select the first active agent
            this.selectedEquipmentAgent = this.activeAgents[0].id;
        }
        if (this.logger) this.logger.debug('Auto-selected agent for equipment:', this.selectedEquipmentAgent);
        needsRefresh = true; // Mark that we need to refresh UI
    }

    const dialog = document.getElementById('equipmentDialog');

    // Ensure dialog is properly positioned before showing (prevents jumping)
    dialog.style.display = 'flex';
    dialog.style.alignItems = 'center';
    dialog.style.justifyContent = 'center';

    // Add a small delay to prevent visual jump
    requestAnimationFrame(() => {
        dialog.classList.add('show');
    });

    // Ensure close buttons are properly wired (in case inline onclick isn't working)
    setTimeout(() => {
        const closeButton = dialog.querySelector('.dialog-close');
        const closeBtn = dialog.querySelector('button[onclick*="closeEquipmentDialog"]');

        if (closeButton && !closeButton._hasHandler) {
            closeButton._hasHandler = true;
            closeButton.style.cursor = 'pointer';
            closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.logger) this.logger.debug('🔒 Close button clicked');
                this.closeEquipmentDialog();
            });
        }

        if (closeBtn && !closeBtn._hasHandler) {
            closeBtn._hasHandler = true;
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (this.logger) this.logger.debug('🔒 CLOSE button clicked');
                this.closeEquipmentDialog();
            });
        }
    }, 100);

    // Update button visibility based on screen
    if (this.currentScreen === 'game') {
        // Hide shop/sell buttons in game, but keep optimize
        const shopBtn = dialog.querySelector('button[onclick*="showShopInterface"]');
        const sellBtn = dialog.querySelector('button[onclick*="showSellInterface"]');
        const optimizeBtn = dialog.querySelector('button[onclick*="optimizeLoadouts"]');

        if (shopBtn) {
            shopBtn.style.display = 'none';
            shopBtn.disabled = true;
        }
        if (sellBtn) {
            sellBtn.style.display = 'none';
            sellBtn.disabled = true;
        }
        // Keep optimize button visible and enabled in-game
        if (optimizeBtn) {
            optimizeBtn.style.display = '';
            optimizeBtn.disabled = false;
        }

        // Change title to indicate in-game mode
        const titleEl = dialog.querySelector('.dialog-title');
        if (titleEl) titleEl.textContent = '🎯 INVENTORY & EQUIPMENT';

        // Add a note that shop is not available during missions
        const buttonsDiv = dialog.querySelector('.equipment-buttons');
        if (buttonsDiv && !buttonsDiv.querySelector('.in-game-note')) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'in-game-note';
            noteDiv.style.cssText = 'color: #888; font-size: 0.9em; margin-top: 10px; text-align: center;';
            noteDiv.textContent = 'Shop unavailable during missions';
            buttonsDiv.appendChild(noteDiv);
        }
    } else {
        // Show all buttons in hub
        const shopBtn = dialog.querySelector('button[onclick*="showShopInterface"]');
        const sellBtn = dialog.querySelector('button[onclick*="showSellInterface"]');
        const optimizeBtn = dialog.querySelector('button[onclick*="optimizeLoadouts"]');

        if (shopBtn) {
            shopBtn.style.display = '';
            shopBtn.disabled = false;
        }
        if (sellBtn) {
            sellBtn.style.display = '';
            sellBtn.disabled = false;
        }
        if (optimizeBtn) {
            optimizeBtn.style.display = '';
            optimizeBtn.disabled = false;
        }

        // Restore original title
        const titleEl = dialog.querySelector('.dialog-title');
        if (titleEl) titleEl.textContent = '🎯 EQUIPMENT MANAGEMENT';

        // Remove in-game note if present
        const noteEl = dialog.querySelector('.in-game-note');
        if (noteEl) noteEl.remove();
    }

    // Refresh UI - this will update all displays
    // If we auto-selected an agent, this will show their inventory
    this.refreshEquipmentUI();

    // Force show weapon inventory immediately if agent is selected
    // This ensures the inventory tab is populated on open
    if (this.selectedEquipmentAgent) {
        // Call immediately to populate
        this.showWeaponInventory();

        // Also call with delay in case DOM needs time
        setTimeout(() => {
            if (!document.getElementById('inventoryList').innerHTML.includes('WEAPONS')) {
                if (this.logger) this.logger.debug('📦 Inventory was empty, populating now...');
                this.showWeaponInventory();
            }
        }, 50);
    }
};

// Close equipment dialog
CyberOpsGame.prototype.closeEquipmentDialog = function() {
    if (this.logger) this.logger.debug('🔒 Closing equipment dialog...');

    const dialog = document.getElementById('equipmentDialog');
    if (dialog) {
        // Remove show class
        dialog.classList.remove('show');

        // Also hide with style to be sure
        dialog.style.display = 'none';

        // Clear any inline styles that might override
        setTimeout(() => {
            dialog.style.display = '';
        }, 100);
    }

    // If there's an active modal from modal engine, close it too
    if (this.activeModal) {
        this.activeModal.close?.();
        this.activeModal = null;
    }

    // Close any declarative dialogs if open
    if (this.dialogEngine && this.dialogEngine.currentState) {
        this.dialogEngine.closeAll();
    }
};

// Refresh entire equipment UI
CyberOpsGame.prototype.refreshEquipmentUI = function() {
    // Check if arsenal dialog exists in DOM (even if modal is on top)
    const arsenalDialog = document.getElementById('dialog-arsenal');
    if (arsenalDialog) {
        // Simply re-navigate to arsenal to refresh with current data
        const dialogEngine = this.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
        if (dialogEngine && dialogEngine.navigateTo) {
            dialogEngine.navigateTo('arsenal');
            if (this.logger) this.logger.debug('Arsenal UI refreshed via navigation');
            return;
        }
    }

    // Otherwise use traditional update methods
    this.updateAgentList();
    this.updateInventoryDisplay();
    this.updateCreditsDisplay();

    if (this.selectedEquipmentAgent) {
        this.updateLoadoutDisplay(this.selectedEquipmentAgent);
        this.updateStatsPreview(this.selectedEquipmentAgent);
    }
};

// Update inventory display in equipment screen
CyberOpsGame.prototype.updateInventoryDisplay = function() {
    // This function updates the weapon inventory display
    // Since we handle inventory in the shop tab, this can be a placeholder
    // or we can add a quick inventory summary here if needed
    if (this.logger) this.logger.debug('Inventory updated:', {
        weapons: this.weapons.filter(w => w.owned > 0).length,
        totalWeapons: this.weapons.reduce((sum, w) => sum + (w.owned || 0), 0)
    });
};

// Update agent list in equipment screen
CyberOpsGame.prototype.updateAgentList = function() {
    const listEl = document.getElementById('equipmentAgentList');
    listEl.innerHTML = '';

    this.activeAgents.forEach(agent => {
        const agentDiv = document.createElement('div');
        const isSelected = this.selectedEquipmentAgent === agent.id;

        agentDiv.className = 'equipment-agent-card';
        agentDiv.style.cssText = `
            background: ${isSelected ? 'rgba(0,255,255,0.2)' : 'rgba(0,255,255,0.05)'};
            border: 2px solid ${isSelected ? '#00ffff' : 'transparent'};
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        `;

        const loadout = this.agentLoadouts[agent.id] || {};
        const weaponName = loadout.weapon ? this.getItemById('weapon', loadout.weapon).name : 'None';

        agentDiv.innerHTML = `
            <div style="font-weight: bold; color: #fff;">${agent.name}</div>
            <div style="color: #888; font-size: 0.9em;">${agent.specialization}</div>
            <div style="color: #ffa500; font-size: 0.85em; margin-top: 5px;">
                🔫 ${weaponName}
            </div>
        `;

        agentDiv.onclick = () => this.selectAgentForEquipment(agent.id);
        agentDiv.onmouseover = () => { if (!isSelected) agentDiv.style.background = 'rgba(0,255,255,0.1)'; };
        agentDiv.onmouseout = () => { if (!isSelected) agentDiv.style.background = 'rgba(0,255,255,0.05)'; };

        listEl.appendChild(agentDiv);
    });
};

// Select agent for equipment management
CyberOpsGame.prototype.selectAgentForEquipment = function(agentId) {
    this.selectedEquipmentAgent = agentId;

    // If using declarative dialog, refresh it
    if (this.dialogEngine && this.dialogEngine.currentState && this.dialogEngine.currentState.id === 'arsenal') {
        this.dialogEngine.navigateTo('arsenal');
    } else {
        // Otherwise use traditional update methods
        this.updateAgentList();
        this.updateLoadoutDisplay(agentId);
        this.showWeaponInventory(); // Default to weapons tab
    }
};

// Update loadout display for selected agent
CyberOpsGame.prototype.updateLoadoutDisplay = function(agentId) {
    const agent = this.activeAgents.find(a => a.id === agentId);
    if (!agent) return;

    // ONLY use InventoryService if available
    const loadout = (this.gameServices && this.gameServices.inventoryService)
        ? this.gameServices.inventoryService.agentLoadouts[agentId] || {}
        : this.agentLoadouts[agentId] || {};
    // Sync back to game for consistency
    this.agentLoadouts[agentId] = loadout;

    const loadoutEl = document.getElementById('currentLoadout');

    loadoutEl.innerHTML = `
        <h4 style="color: #fff; margin-bottom: 15px;">${agent.name}'s Loadout</h4>

        <div style="margin-bottom: 15px;">
            <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">PRIMARY WEAPON</div>
            <div class="loadout-slot" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                ${this.getLoadoutSlotHTML(loadout.weapon, 'weapon')}
                ${loadout.weapon ? `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em;" onclick="game.unequipItem('${agentId}', 'weapon')">UNEQUIP</button>` : ''}
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">ARMOR</div>
            <div class="loadout-slot" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                ${this.getLoadoutSlotHTML(loadout.armor, 'armor')}
                ${loadout.armor ? `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em;" onclick="game.unequipItem('${agentId}', 'armor')">UNEQUIP</button>` : ''}
            </div>
        </div>

        <div style="margin-bottom: 15px;">
            <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">UTILITY</div>
            <div class="loadout-slot" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                ${this.getLoadoutSlotHTML(loadout.utility, 'utility')}
                ${loadout.utility ? `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em;" onclick="game.unequipItem('${agentId}', 'utility')">UNEQUIP</button>` : ''}
            </div>
        </div>
    `;

    // Update stats preview
    this.updateStatsPreview(agentId);
};

// Get HTML for loadout slot
CyberOpsGame.prototype.getLoadoutSlotHTML = function(itemId, type) {
    if (!itemId) {
        return '<span style="color: #666;">Empty Slot</span>';
    }

    const item = this.getItemById(type, itemId);
    if (!item) {
        return '<span style="color: #666;">Unknown Item</span>';
    }

    let stats = '';
    if (item.damage) stats += `DMG: ${item.damage} `;
    if (item.protection) stats += `DEF: ${item.protection} `;
    if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
    if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

    return `
        <div>
            <span style="color: #00ffff; font-weight: bold;">${item.name}</span>
            <span style="color: #888; font-size: 0.85em; margin-left: 10px;">${stats}</span>
        </div>
    `;
};

// Update stats preview
CyberOpsGame.prototype.updateStatsPreview = function(agentId) {
    const agent = this.activeAgents.find(a => a.id === agentId);
    if (!agent) return;

    // Calculate stats with current loadout
    const loadout = this.agentLoadouts[agentId] || {};
    let totalDamage = agent.damage || 10;
    let totalProtection = agent.protection || 0;
    let totalHack = agent.hackBonus || 0;
    let totalStealth = agent.stealthBonus || 0;

    // Add weapon stats
    if (loadout.weapon) {
        const weapon = this.getItemById('weapon', loadout.weapon);
        if (weapon && weapon.damage) totalDamage += weapon.damage;
    }

    // Add armor stats
    if (loadout.armor) {
        const armor = this.getItemById('armor', loadout.armor);
        if (armor && armor.protection) totalProtection += armor.protection;
    }

    // Add utility stats
    if (loadout.utility) {
        const utility = this.getItemById('equipment', loadout.utility);
        if (utility) {
            if (utility.hackBonus) totalHack += utility.hackBonus;
            if (utility.stealthBonus) totalStealth += utility.stealthBonus;
        }
    }

    const statsEl = document.getElementById('statsPreview');
    statsEl.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>⚔️ Damage: <span style="color: #fff;">${totalDamage}</span></div>
            <div>🛡️ Protection: <span style="color: #fff;">${totalProtection}</span></div>
            <div>💻 Hacking: <span style="color: #fff;">+${totalHack}</span></div>
            <div>👁️ Stealth: <span style="color: #fff;">+${totalStealth}</span></div>
        </div>
    `;
};

// Show weapon inventory
CyberOpsGame.prototype.showWeaponInventory = function() {
    if (this.logger) this.logger.debug('🔫 showWeaponInventory called');
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        if (this.logger) this.logger.error('inventoryList element not found!');
        return;
    }

    // Sync weapons from InventoryService if available
    if (this.gameServices && this.gameServices.inventoryService) {
        this.weapons = this.gameServices.inventoryService.inventory.weapons;
        this.gameServices.inventoryService.syncEquippedCounts();
    }

    if (this.logger) this.logger.debug('   Weapons available:', this.weapons?.length || 0);
    if (this.logger) this.logger.debug('   Selected agent:', this.selectedEquipmentAgent);

    inventoryEl.innerHTML = '<h4 style="color: #ffa500; margin-bottom: 10px;">🔫 WEAPONS</h4>';

    // Get available weapons (not equipped by other agents)
    this.weapons.forEach(weapon => {
        const equippedCount = weapon.equipped || 0;
        const availableCount = (weapon.owned || 0) - equippedCount;

        if (availableCount > 0 || weapon.owned > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                background: rgba(255,255,255,0.05);
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            itemDiv.innerHTML = `
                <div>
                    <div style="color: #fff; font-weight: bold;">${weapon.name}</div>
                    <div style="color: #888; font-size: 0.85em;">
                        DMG: ${weapon.damage} | Owned: ${weapon.owned} | Equipped: ${equippedCount} | Available: ${availableCount}
                    </div>
                </div>
                <div>
                    ${availableCount > 0 && this.selectedEquipmentAgent ?
                        `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em;"
                         onclick="game.equipItem('${this.selectedEquipmentAgent}', 'weapon', ${weapon.id})">EQUIP</button>` : ''}
                    ${weapon.owned > 0 ?
                        `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em; background: #8b4513; margin-left: 5px;"
                         onclick="game.sellItem('weapon', ${weapon.id})">SELL</button>` : ''}
                </div>
            `;

            inventoryEl.appendChild(itemDiv);
        }
    });
};

// Show equipment inventory
CyberOpsGame.prototype.showEquipmentInventory = function() {
    const inventoryEl = document.getElementById('inventoryList');
    inventoryEl.innerHTML = '<h4 style="color: #ffa500; margin-bottom: 10px;">🛡️ EQUIPMENT</h4>';

    // Sync equipment from InventoryService if available
    if (this.gameServices && this.gameServices.inventoryService) {
        const invService = this.gameServices.inventoryService;
        invService.syncEquippedCounts();

        // Combine armor and utility into equipment array
        this.equipment = [
            ...invService.inventory.armor,
            ...invService.inventory.utility
        ];
    }

    this.equipment.forEach(item => {
        const equippedCount = item.equipped || 0;
        const availableCount = (item.owned || 0) - equippedCount;
        const slot = this.getEquipmentSlot(item);

        if (availableCount > 0 || item.owned > 0) {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                background: rgba(255,255,255,0.05);
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            let stats = '';
            if (item.protection) stats += `DEF: ${item.protection} `;
            if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
            if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

            itemDiv.innerHTML = `
                <div>
                    <div style="color: #fff; font-weight: bold;">${item.name}</div>
                    <div style="color: #888; font-size: 0.85em;">
                        ${stats}| Owned: ${item.owned} | Equipped: ${equippedCount} | Available: ${availableCount}
                    </div>
                </div>
                <div>
                    ${availableCount > 0 && this.selectedEquipmentAgent ?
                        `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em;"
                         onclick="game.equipItem('${this.selectedEquipmentAgent}', '${slot}', ${item.id})">EQUIP</button>` : ''}
                    ${item.owned > 0 ?
                        `<button class="menu-button" style="padding: 5px 10px; font-size: 0.9em; background: #8b4513; margin-left: 5px;"
                         onclick="game.sellItem('equipment', ${item.id})">SELL</button>` : ''}
                </div>
            `;

            inventoryEl.appendChild(itemDiv);
        }
    });
};

// Get equipment slot type
CyberOpsGame.prototype.getEquipmentSlot = function(item) {
    if (item.type === 'armor' || item.protection) return 'armor';
    if (item.type === 'utility' || item.hackBonus || item.stealthBonus) return 'utility';
    return 'special';
};

// Get available count (not equipped)
CyberOpsGame.prototype.getAvailableCount = function(type, itemId) {
    // ONLY use InventoryService if available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        // Fallback to basic calculation
        const items = this[type + 's'] || [];
        const item = items.find(i => i.id === itemId);
        if (!item) return 0;
        return item.owned || 0;
    }
    const inventoryService = this.gameServices.inventoryService;
    inventoryService.syncEquippedCounts();

    const items = type === 'weapon' ?
        inventoryService.inventory.weapons :
        [...(inventoryService.inventory.armor || []),
         ...(inventoryService.inventory.utility || [])];

    const item = items.find(i => i.id === itemId);
    if (!item) return 0;

    return Math.max(0, (item.owned || 0) - (item.equipped || 0));
};

// Equip item to agent
CyberOpsGame.prototype.equipItem = function(agentId, slot, itemId) {
    // Check if service is available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        if (this.logger) this.logger.warn('InventoryService not available');
        return false;
    }
    // ONLY use InventoryService
    const success = this.gameServices.inventoryService.equipItem(agentId, slot, itemId);
    if (success) {
        // Sync loadouts from InventoryService
        this.agentLoadouts = this.gameServices.inventoryService.agentLoadouts;

        // Apply equipment to agent if they're active
        const agent = this.activeAgents.find(a =>
            a.id === agentId || a.originalId === agentId || a.name === agentId
        );
        if (agent) {
            this.gameServices.inventoryService.applyAgentEquipment(agent);
        }

        // If we're in a mission, also update the mission agent's weapon
        if (this.currentScreen === 'game' && this.agents && slot === 'weapon') {
            const missionAgent = this.agents.find(a =>
                a.originalId === agentId || a.name === agentId
            );
            if (missionAgent && itemId) {
                const weaponData = this.gameServices.inventoryService.inventory.weapons.find(w => w.id === itemId);
                if (weaponData) {
                    missionAgent.weapon = {
                        type: itemId,
                        damage: weaponData.damage,
                        range: weaponData.range || 5
                    };
                    if (this.logger) this.logger.info(`⚔️ Updated mission agent ${missionAgent.name} weapon: ${weaponData.name} (damage: ${weaponData.damage})`);
                }
            }
        }

        // Refresh UI
        this.refreshEquipmentUI();
    }
};

// Unequip item from agent
CyberOpsGame.prototype.unequipItem = function(agentId, slot) {
    // Check if service is available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        if (this.logger) this.logger.warn('InventoryService not available');
        return false;
    }
    // ONLY use InventoryService
    const success = this.gameServices.inventoryService.unequipItem(agentId, slot);
    if (success) {
        // Sync loadouts from InventoryService
        this.agentLoadouts = this.gameServices.inventoryService.agentLoadouts;

        // Update agent if they're active
        const agent = this.activeAgents.find(a =>
            a.id === agentId || a.originalId === agentId || a.name === agentId
        );
        if (agent && slot === 'weapon') {
            agent.weapon = null; // Remove weapon from agent
        }

        // If we're in a mission, also update the mission agent's weapon
        if (this.currentScreen === 'game' && this.agents && slot === 'weapon') {
            const missionAgent = this.agents.find(a =>
                a.originalId === agentId || a.name === agentId
            );
            if (missionAgent) {
                missionAgent.weapon = null;
                if (this.logger) this.logger.info(`🚫 Removed weapon from mission agent ${missionAgent.name}`);
            }
        }

        // Refresh UI
        this.refreshEquipmentUI();
    }
};

// Sell item
CyberOpsGame.prototype.sellItem = function(type, itemId) {
    // Check if service is available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        if (this.logger) this.logger.warn('InventoryService not available');
        return { success: false, error: 'Service not available' };
    }
    // ONLY use InventoryService
    const result = this.gameServices.inventoryService.sellItem(type, itemId);

    if (!result.success) {
        if (result.error === 'Item is equipped') {
            this.showHudDialog(
                '⚠️ CANNOT SELL',
                'This item is currently equipped. Unequip it first to sell.',
                [{ text: 'OK', action: 'close' }]
            );
        }
        return;
    }

    // Add credits via ResourceService
    if (this.gameServices && this.gameServices.resourceService) {
        this.gameServices.resourceService.add('credits', result.price, `sold ${result.itemName}`);
    } else {
        this.credits += result.price; // Fallback
    }

    // Sync weapons back
    if (this.gameServices && this.gameServices.inventoryService) {
        this.weapons = this.gameServices.inventoryService.inventory.weapons;
    }

    // Refresh UI
    this.refreshEquipmentUI();

    if (this.logger) this.logger.info(`✅ Sold item for ${result.price} credits`);

    if (this.logger) this.logger.debug('=== SELL PRICE DEBUG ===');
    if (this.logger) this.logger.debug('Item cost:', item.cost, 'type:', typeof item.cost);
    if (this.logger) this.logger.debug('Calculated sell price:', sellPrice, 'type:', typeof sellPrice);
    if (this.logger) this.logger.debug('Credits before:', this.credits, 'type:', typeof this.credits);

    // Type safety check
    if (typeof sellPrice !== 'number' || isNaN(sellPrice)) {
        if (this.logger) this.logger.error('ERROR: Sell price is not a valid number!', sellPrice);
        return;
    }

    // Confirm sale
    this.showHudDialog(
        '💰 SELL ITEM',
        `Sell ${item.name} for ${sellPrice} credits?<br>
        <span style="color: #888;">You currently have ${available} available to sell.</span>`,
        [
            {
                text: 'SELL',
                action: () => {
                    if (this.logger) this.logger.debug('=== EXECUTING SELL ===');
                    if (this.logger) this.logger.debug('Selling item:', item.name);
                    if (this.logger) this.logger.debug('Item count before:', item.owned);
                    if (this.logger) this.logger.debug('Credits before sell:', this.credits);
                    if (this.logger) this.logger.debug('Sell price to ADD:', sellPrice);

                    // Use InventoryService to decrement item count
                    if (this.gameServices && this.gameServices.inventoryService) {
                        this.gameServices.inventoryService.updateItemCount(type, itemId, -1);
                    } else {
                        // Fallback
                        item.owned = Math.max(0, (item.owned || 0) - 1);
                    }
                    const creditsBefore = this.credits;

                    // Safeguard: ensure sellPrice is positive
                    const finalSellPrice = Math.max(0, sellPrice);
                    if (finalSellPrice <= 0) {
                        if (this.logger) this.logger.error('WARNING: Sell price is not positive!', sellPrice);
                    }

                    // Add credits from sale
                    if (this.gameServices?.resourceService) {
                        this.gameServices.resourceService.add('credits', finalSellPrice, `sold ${item.name}`);
                    } else {
                        this.credits = creditsBefore + finalSellPrice;
                    }

                    if (this.logger) this.logger.debug('Item count after:', item.owned);
                    if (this.logger) this.logger.debug('Credits after sell:', this.credits);
                    if (this.logger) this.logger.debug('Change in credits:', this.credits - creditsBefore);
                    if (this.logger) this.logger.debug('Expected change:', finalSellPrice);
                    if (this.logger) this.logger.debug('Formula used: credits = ', creditsBefore, ' + ', finalSellPrice, ' = ', this.credits);

                    // Store reference to game instance and current mode
                    const game = this;
                    const wasInSellMode = game.currentInventoryMode === 'sell';
                    const currentTab = game.currentInventoryTab;

                    if (this.logger) this.logger.debug('Pre-sell state: mode=', game.currentInventoryMode, 'tab=', currentTab);

                    // We need to wait for the confirmation modal to close
                    // Then refresh the arsenal dialog that's underneath
                    setTimeout(() => {
                        if (this.logger) this.logger.debug('=== SELL REFRESH DEBUG ===');
                        if (this.logger) this.logger.debug('1. Refreshing Arsenal after sell...');
                        if (this.logger) this.logger.debug('2. Current mode:', game.currentInventoryMode);
                        if (this.logger) this.logger.debug('3. Should be in sell mode:', wasInSellMode);

                        // Ensure we stay in sell mode
                        if (wasInSellMode) {
                            game.currentInventoryMode = 'sell';
                            game.currentInventoryTab = currentTab || 'weapons';
                            if (this.logger) this.logger.debug('4. Restored sell mode and tab');
                        }

                        const arsenalDialog = document.getElementById('dialog-arsenal');
                        if (this.logger) this.logger.debug('5. Arsenal dialog found?', !!arsenalDialog);

                        if (arsenalDialog) {
                            const contentEl = arsenalDialog.querySelector('.dialog-content');
                            if (this.logger) this.logger.debug('6. Content element found?', !!contentEl);

                            if (contentEl) {
                                // The simplest approach - just navigate to arsenal again
                                // This will regenerate the content with the updated data
                                if (this.logger) this.logger.debug('7. Refreshing Arsenal by re-navigating...');

                                const dialogEngine = game.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
                                if (dialogEngine && dialogEngine.navigateTo) {
                                    if (this.logger) this.logger.debug('8. Current inventory mode:', game.currentInventoryMode);
                                    // Navigate to arsenal which will regenerate with current data
                                    dialogEngine.navigateTo('arsenal');
                                    if (this.logger) this.logger.info('9. ✅ Arsenal refreshed via navigation');

                                    // Verify the update
                                    setTimeout(() => {
                                        const newContent = document.getElementById('dialog-arsenal');
                                        if (newContent) {
                                            const itemShown = newContent.innerHTML.includes(item.name);
                                            if (this.logger) this.logger.debug('10. Item still shown after refresh?', itemShown);
                                            if (itemShown) {
                                                const regex = new RegExp(`Available: (\\d+)`);
                                                const matches = newContent.innerHTML.match(new RegExp(regex, 'g'));
                                                if (this.logger) this.logger.debug('11. Available counts found:', matches);
                                            }
                                        }
                                    }, 100);
                                } else {
                                    if (this.logger) this.logger.error('ERROR: Dialog engine or navigateTo not found');
                                }
                            } else {
                                if (this.logger) this.logger.error('ERROR: Missing components', { contentEl: !!contentEl, dialogEngine: !!(game.dialogEngine || window.dialogEngine) });
                            }
                        } else {
                            if (this.logger) this.logger.debug('Arsenal dialog not in DOM - trying fallback refresh');
                            game.refreshEquipmentUI();
                        }
                        if (this.logger) this.logger.debug('=== END DEBUG ===');
                    }, 200); // Slightly longer delay to ensure modal fully closes
                }
            },
            { text: 'CANCEL', action: 'close' }
        ]
    );
};

// Buy item (alias for consistency)
CyberOpsGame.prototype.buyItem = function(type, itemId) {
    // Find item to get details for confirmation
    let itemData = null;

    // First look in local arrays (what's displayed in the UI)
    if (type === 'weapon') {
        itemData = this.weapons.find(w => w.id === itemId);
    } else {
        itemData = this.equipment.find(e => e.id === itemId);
    }

    // If not found locally, try GameServices
    if (!itemData && window.GameServices && window.GameServices.equipmentService) {
        if (type === 'weapon') {
            itemData = window.GameServices.equipmentService.getWeapon(itemId);
        } else {
            itemData = window.GameServices.equipmentService.getEquipment(itemId);
        }
    }

    if (!itemData) {
        if (this.logger) this.logger.error('Item not found for type:', type, 'id:', itemId);
        return;
    }

    // Check affordability
    const currentCredits = this.gameServices?.resourceService?.get('credits') || this.credits;
    if (currentCredits < itemData.cost) {
        this.showHudDialog(
            '❌ INSUFFICIENT FUNDS',
            `You need ${itemData.cost} credits to buy ${itemData.name}.<br>
            You currently have ${currentCredits} credits.`,
            [{ text: 'OK', action: 'close' }]
        );
        return;
    }

    // Show confirmation
    this.showHudDialog(
        '🛒 CONFIRM PURCHASE',
        `Buy ${itemData.name} for ${itemData.cost} credits?<br>
        <span style="color: #888;">You will have ${currentCredits - itemData.cost} credits remaining.</span>`,
        [
            {
                text: 'BUY',
                action: () => {
                    // Perform purchase
                    this.buyItemFromShop(type, itemId);
                }
            },
            { text: 'CANCEL', action: 'close' }
        ]
    );
};

// Show sell dialog (for declarative dialog system)
CyberOpsGame.prototype.showSellDialog = function() {
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    html += '<h3 style="color: #ff6600; margin-bottom: 15px;">💰 SELL ITEMS</h3>';
    const currentCredits = this.gameServices?.resourceService?.get('credits') || this.credits;
    html += `<div style="color: #ffa500; margin-bottom: 20px;">Credits: ${currentCredits}</div>`;

    // Get all sellable items
    const allItems = [];

    // Add weapons
    this.weapons.forEach(w => {
        const available = this.getAvailableCount('weapon', w.id);
        if (available > 0) {
            allItems.push({
                ...w,
                type: 'weapon',
                available: available,
                category: 'Weapons'
            });
        }
    });

    // Add equipment
    this.equipment.forEach(e => {
        const available = this.getAvailableCount('equipment', e.id);
        if (available > 0) {
            allItems.push({
                ...e,
                type: 'equipment',
                available: available,
                category: 'Equipment'
            });
        }
    });

    if (allItems.length === 0) {
        html += '<div style="color: #888; text-align: center; padding: 20px;">No items available to sell</div>';
    } else {
        // Group by category
        const categories = {};
        allItems.forEach(item => {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        });

        // Display each category
        Object.keys(categories).forEach(category => {
            html += `<h4 style="color: #00ffff; margin: 15px 0 10px;">${category}</h4>`;

            categories[category].forEach(item => {
                const sellPrice = Math.floor(item.cost * 0.6);

                html += `
                    <div style="background: rgba(255,102,0,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #fff; font-weight: bold;">${item.name}</div>
                                <div style="color: #888; font-size: 0.9em;">Available: ${item.available} | Sell Price: ${sellPrice}</div>
                            </div>
                            <div>
                                <button class="menu-button" style="padding: 5px 10px; background: #8b4513;"
                                        onclick="game.sellItem('${item.type}', ${item.id})">
                                    SELL
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
        });
    }

    html += '</div>';

    this.showHudDialog(
        '💰 SELL ITEMS',
        html,
        [
            { text: 'CLOSE', action: 'close' }
        ]
    );
};

// Show shop dialog (for declarative dialog system)
CyberOpsGame.prototype.showShopDialog = function() {
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    html += '<h3 style="color: #00ff00; margin-bottom: 15px;">🛒 WEAPON & EQUIPMENT SHOP</h3>';
    const currentCredits = this.gameServices?.resourceService?.get('credits') || this.credits;
    html += `<div style="color: #ffa500; margin-bottom: 20px;">Credits: ${currentCredits}</div>`;

    // Get all available items
    const allItems = [];

    // Add weapons
    this.weapons.forEach(w => {
        allItems.push({
            ...w,
            type: 'weapon',
            category: 'Weapons'
        });
    });

    // Add equipment
    this.equipment.forEach(e => {
        allItems.push({
            ...e,
            type: 'equipment',
            category: 'Equipment'
        });
    });

    // Group by category
    const categories = {};
    allItems.forEach(item => {
        if (!categories[item.category]) categories[item.category] = [];
        categories[item.category].push(item);
    });

    // Display each category
    Object.keys(categories).forEach(category => {
        html += `<h4 style="color: #00ffff; margin: 15px 0 10px;">${category}</h4>`;

        categories[category].forEach(item => {
            const canAfford = (this.gameServices?.resourceService?.canAfford('credits', item.cost)) || (this.credits >= item.cost);
            const owned = item.owned || 0;

            html += `
                <div style="background: rgba(0,255,255,0.05); padding: 10px; margin: 5px 0; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: ${canAfford ? '#fff' : '#666'}; font-weight: bold;">${item.name}</div>
                            <div style="color: #888; font-size: 0.9em;">${item.description || ''}</div>
                            <div style="color: #ffa500; font-size: 0.9em;">Cost: ${item.cost} | Owned: ${owned}</div>
                        </div>
                        <div>
                            ${canAfford ? `
                                <button class="menu-button" style="padding: 5px 10px;"
                                        onclick="game.buyItem('${item.type}', ${item.id})">
                                    BUY
                                </button>
                            ` : '<span style="color: #ff0000;">Not enough credits</span>'}
                        </div>
                    </div>
                </div>
            `;
        });
    });

    html += '</div>';

    this.showHudDialog(
        '🛒 SHOP',
        html,
        [
            { text: 'CLOSE', action: 'close' }
        ]
    );
};

// Auto-optimize loadouts
CyberOpsGame.prototype.optimizeLoadouts = function() {
    // ONLY use InventoryService if available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        if (this.logger) this.logger.warn('InventoryService not available');
        return;
    }
    const invService = this.gameServices.inventoryService;
    const logger = window.Logger ? new window.Logger('optimizeLoadouts') : null;

    // Ensure InventoryService has the current weapons data
    if (this.weapons && this.weapons.length > 0) {
        if (!invService.inventory.weapons || invService.inventory.weapons.length === 0) {
            if (logger) logger.info('Syncing weapons to InventoryService before optimization');
            invService.inventory.weapons = this.weapons.map(w => ({
                ...w,
                equipped: w.equipped || 0
            }));
        }
    }

    // Clear all loadouts in InventoryService
    Object.keys(invService.agentLoadouts).forEach(agentId => {
        // Unequip all items for each agent
        if (invService.agentLoadouts[agentId].weapon) {
            invService.unequipItem(agentId, 'weapon');
        }
        if (invService.agentLoadouts[agentId].armor) {
            invService.unequipItem(agentId, 'armor');
        }
        if (invService.agentLoadouts[agentId].utility) {
            invService.unequipItem(agentId, 'utility');
        }
    });

    // Initialize empty loadouts for all active agents
    this.activeAgents.forEach(agent => {
        if (!invService.agentLoadouts[agent.id]) {
            invService.agentLoadouts[agent.id] = {
                weapon: null,
                armor: null,
                utility: null
            };
        }
    });

    // Sync back - but NEVER overwrite with empty arrays
    this.agentLoadouts = invService.agentLoadouts;
    // Only sync weapons if InventoryService has valid data
    if (invService.inventory.weapons && invService.inventory.weapons.length > 0) {
        this.weapons = invService.inventory.weapons;
    }

    // Build a pool of all available weapons from InventoryService OR game state
    const weaponPool = [];
    const weaponsToUse = (invService.inventory.weapons && invService.inventory.weapons.length > 0)
        ? invService.inventory.weapons
        : this.weapons;

    weaponsToUse.forEach(weapon => {
        if (weapon.owned > 0) {
            for (let i = 0; i < weapon.owned; i++) {
                weaponPool.push({ ...weapon });
            }
        }
    });

    // Sort weapon pool by damage (best first)
    weaponPool.sort((a, b) => b.damage - a.damage);

    // Assign best weapons to agents
    this.activeAgents.forEach((agent, index) => {
        if (index < weaponPool.length) {
            // ONLY use InventoryService to equip
            invService.equipItem(agent.id, 'weapon', weaponPool[index].id);
        }
    });

    // Build equipment pools
    const armorPool = [];
    const utilityPool = [];

    this.equipment.forEach(item => {
        if (item.owned > 0) {
            for (let i = 0; i < item.owned; i++) {
                if (item.protection) {
                    armorPool.push({ ...item });
                } else if (item.hackBonus || item.stealthBonus || item.damage) {
                    utilityPool.push({ ...item });
                }
            }
        }
    });

    // Sort equipment by effectiveness
    armorPool.sort((a, b) => (b.protection || 0) - (a.protection || 0));
    utilityPool.sort((a, b) => {
        const aVal = (a.hackBonus || 0) + (a.stealthBonus || 0) + (a.damage || 0);
        const bVal = (b.hackBonus || 0) + (b.stealthBonus || 0) + (b.damage || 0);
        return bVal - aVal;
    });

    // Assign armor and utility to agents
    this.activeAgents.forEach((agent, index) => {
        // Assign armor if available
        if (index < armorPool.length) {
            invService.equipItem(agent.id, 'armor', armorPool[index].id);
        }

        // Assign utility based on specialization or availability
        let assigned = false;

        // Try to match specialization first
        if (agent.specialization === 'hacker') {
            const hackKit = utilityPool.find(item => item.hackBonus && !item.assigned);
            if (hackKit) {
                invService.equipItem(agent.id, 'utility', hackKit.id);
                hackKit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'stealth') {
            const stealthSuit = utilityPool.find(item => item.stealthBonus && !item.assigned);
            if (stealthSuit) {
                invService.equipItem(agent.id, 'utility', stealthSuit.id);
                stealthSuit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'demolition') {
            const explosives = utilityPool.find(item => item.damage && !item.assigned);
            if (explosives) {
                invService.equipItem(agent.id, 'utility', explosives.id);
                explosives.assigned = true;
                assigned = true;
            }
        }

        // If no specialization match, assign any available utility
        if (!assigned) {
            const anyUtility = utilityPool.find(item => !item.assigned);
            if (anyUtility) {
                invService.equipItem(agent.id, 'utility', anyUtility.id);
                anyUtility.assigned = true;
            }
        }
    });

    // Apply equipment to all active agents
    this.activeAgents.forEach(agent => {
        invService.applyAgentEquipment(agent);
    });

    // Sync loadouts back from InventoryService
    this.agentLoadouts = invService.agentLoadouts;

    // Force complete UI refresh
    this.updateAgentList();
    this.updateCreditsDisplay();

    // Update current inventory display
    const inventoryEl = document.getElementById('inventoryList');
    if (inventoryEl && inventoryEl.children.length > 0) {
        // Re-show current tab
        if (inventoryEl.innerHTML.includes('WEAPONS')) {
            this.showWeaponInventory();
        } else if (inventoryEl.innerHTML.includes('EQUIPMENT')) {
            this.showEquipmentInventory();
        }
    }

    // Force refresh the selected agent's loadout display
    if (this.selectedEquipmentAgent) {
        // Clear and rebuild the loadout display
        const loadoutEl = document.getElementById('currentLoadout');
        if (loadoutEl) {
            loadoutEl.innerHTML = '';
            setTimeout(() => {
                this.updateLoadoutDisplay(this.selectedEquipmentAgent);
                this.updateStatsPreview(this.selectedEquipmentAgent);
            }, 10);
        }
    }

    // Visual feedback - flash the loadout panel
    const loadoutEl = document.getElementById('currentLoadout');
    if (loadoutEl) {
        loadoutEl.style.transition = 'background 0.3s';
        loadoutEl.style.background = 'rgba(0,255,0,0.1)';
        setTimeout(() => {
            loadoutEl.style.background = 'rgba(0,255,255,0.05)';
        }, 300);
    }

    if (logger) {
        const equipped = Object.keys(invService.agentLoadouts).filter(
            id => invService.agentLoadouts[id].weapon
        ).length;
        logger.info(`Loadouts optimized! Equipped weapons to ${equipped} agents`);
    }

    // If we're in a mission, update the agents' weapon properties immediately
    if (this.currentScreen === 'game' && this.agents) {
        this.agents.forEach(agent => {
            const loadoutId = agent.originalId || agent.name || agent.id;
            const loadout = invService.agentLoadouts[loadoutId];

            if (loadout && loadout.weapon) {
                // Find the weapon details
                const weaponData = invService.inventory.weapons.find(w => w.id === loadout.weapon);
                if (weaponData) {
                    // Update the agent's weapon property for damage calculation
                    agent.weapon = {
                        type: loadout.weapon,
                        damage: weaponData.damage,
                        range: weaponData.range || 5
                    };
                    if (this.logger) this.logger.info(`⚔️ Updated ${agent.name}'s weapon to ${weaponData.name} (damage: ${weaponData.damage})`);
                } else {
                    if (this.logger) this.logger.warn(`⚠️ Weapon ${loadout.weapon} not found in inventory`);
                }
            } else {
                // No weapon equipped, clear it
                agent.weapon = null;
                if (this.logger) this.logger.debug(`🚫 ${agent.name} has no weapon equipped`);
            }
        });
    }

    if (this.logger) this.logger.info('✅ Loadouts optimized successfully');
};

// Save loadouts
CyberOpsGame.prototype.saveLoadouts = function() {
    // Loadouts are already saved in memory
    // This could trigger a save to localStorage
    if (this.saveGame) {
        this.saveGame();
    }

    this.showHudDialog(
        '✅ LOADOUTS SAVED',
        'Agent loadouts have been saved.',
        [{ text: 'OK', action: 'close' }]
    );
};

// Update credits display
CyberOpsGame.prototype.updateCreditsDisplay = function() {
    const creditsEl = document.getElementById('equipCredits');
    const currentCredits = this.gameServices?.resourceService?.get('credits') || this.credits;
    if (creditsEl) creditsEl.textContent = currentCredits.toLocaleString();

    // Calculate inventory value
    if (window.GameServices) {
        const inventoryValue = window.GameServices.formulaService.calculateInventoryValue({
            weapons: this.weapons,
            equipment: this.equipment
        });
        const valueEl = document.getElementById('inventoryValue');
        if (valueEl) valueEl.textContent = inventoryValue.toLocaleString();
    }
};

// Get item by ID
CyberOpsGame.prototype.getItemById = function(type, itemId) {
    if (type === 'weapon') {
        return this.weapons.find(w => w.id === itemId);
    } else {
        return this.equipment.find(e => e.id === itemId);
    }
};

// Apply loadouts to agents for mission
CyberOpsGame.prototype.applyLoadoutsToAgents = function(agents) {
    // Check if service is available
    if (!this.gameServices || !this.gameServices.inventoryService) {
        if (this.logger) this.logger.warn('InventoryService not available');
        return agents;
    }
    const inventoryService = this.gameServices.inventoryService;

    return agents.map(agent => {
        // Try multiple ID formats to find the loadout
        const loadoutId = agent.id || agent.name;
        const loadout = this.agentLoadouts[loadoutId] ||
                       this.agentLoadouts[agent.name] ||
                       this.agentLoadouts[agent.originalId];

        if (!loadout) {
            if (this.logger) this.logger.debug(`⚠️ No loadout found for agent: ${agent.name}`);
            return agent;
        }

        if (this.logger) this.logger.info(`✅ Applying loadout to ${agent.name}:`, loadout);

        // Create a copy of the agent and apply equipment via InventoryService
        let modifiedAgent = { ...agent };

        // Let InventoryService handle the actual equipment application
        // Note: applyAgentEquipment only takes the agent parameter, it looks up the loadout itself
        inventoryService.applyAgentEquipment(modifiedAgent);

        return modifiedAgent;
    });
};

// Show shop interface to buy items
CyberOpsGame.prototype.showShopInterface = function() {
    // Check if we're in declarative dialog mode
    if (this.dialogEngine && this.dialogEngine.currentState) {
        // Open shop as a separate HUD dialog
        if (this.logger) this.logger.debug('🛒 Opening Shop interface as HUD dialog');
        this.showShopDialog();
        return;
    }

    // Original implementation for old equipment dialog
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        if (this.logger) this.logger.error('inventoryList element not found');
        return;
    }
    inventoryEl.innerHTML = '<h4 style="color: #2e7d32; margin-bottom: 10px;">🛒 SHOP - BUY ITEMS</h4>';

    // Show all available items from services
    const allItems = [];

    // Get weapons from service
    if (window.GameServices && window.GameServices.equipmentService) {
        const serviceWeapons = window.GameServices.equipmentService.getAllWeapons();
        serviceWeapons.forEach(w => {
            const owned = this.weapons.find(weapon => weapon.id === w.id);
            allItems.push({
                ...w,
                type: 'weapon',
                owned: owned ? owned.owned : 0
            });
        });

        const serviceEquipment = window.GameServices.equipmentService.getAllEquipment();
        serviceEquipment.forEach(e => {
            const owned = this.equipment.find(item => item.id === e.id);
            allItems.push({
                ...e,
                type: 'equipment',
                owned: owned ? owned.owned : 0
            });
        });
    }

    allItems.forEach(item => {
        const canAfford = (this.gameServices?.resourceService?.canAfford('credits', item.cost)) || (this.credits >= item.cost);

        const itemDiv = document.createElement('div');
        itemDiv.style.cssText = `
            background: ${canAfford ? 'rgba(46,125,50,0.1)' : 'rgba(128,128,128,0.1)'};
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            opacity: ${canAfford ? '1' : '0.6'};
        `;

        let stats = '';
        if (item.damage) stats += `DMG: ${item.damage} `;
        if (item.protection) stats += `DEF: ${item.protection} `;
        if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
        if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

        itemDiv.innerHTML = `
            <div>
                <div style="color: #fff; font-weight: bold;">${item.name}</div>
                <div style="color: #888; font-size: 0.85em;">
                    ${stats}| Cost: ${item.cost} credits | Owned: ${item.owned}
                </div>
            </div>
            <button class="menu-button"
                    style="padding: 5px 10px; font-size: 0.9em; background: ${canAfford ? '#2e7d32' : '#555'};"
                    ${canAfford ? `onclick="game.buyItemFromShop('${item.type}', ${item.id})"` : 'disabled'}>
                ${canAfford ? 'BUY' : 'INSUFFICIENT FUNDS'}
            </button>
        `;

        inventoryEl.appendChild(itemDiv);
    });
};

// Buy item from shop
CyberOpsGame.prototype.buyItemFromShop = function(type, itemId) {
    // ONLY use InventoryService - no fallback
    const inventoryService = this.gameServices?.inventoryService;
    if (!inventoryService) {
        if (this.logger) this.logger.error('❌ InventoryService is required!');
        return;
    }

    // Find item - first in local arrays, then in service
    let itemData = null;

    // First look in local arrays (what's displayed in the UI)
    if (type === 'weapon') {
        itemData = this.weapons.find(w => w.id === itemId);
    } else {
        itemData = this.equipment.find(e => e.id === itemId);
    }

    // If not found locally, try GameServices
    if (!itemData && window.GameServices && window.GameServices.equipmentService) {
        if (type === 'weapon') {
            itemData = window.GameServices.equipmentService.getWeapon(itemId);
        } else {
            itemData = window.GameServices.equipmentService.getEquipment(itemId);
        }
    }

    if (!itemData) {
        if (this.logger) this.logger.error('Item not found for type:', type, 'id:', itemId);
        return;
    }

    // Check affordability
    const canAfford = this.gameServices?.resourceService?.canAfford('credits', itemData.cost) || this.credits >= itemData.cost;
    if (!canAfford) {
        return;
    }

    // Use ONLY InventoryService
    const result = inventoryService.buyItem(type, itemData, itemData.cost);

    if (result.success) {
        // Deduct credits via ResourceService
        if (this.gameServices && this.gameServices.resourceService) {
            this.gameServices.resourceService.spend('credits', itemData.cost, `bought ${itemData.name}`);
        } else {
            this.credits -= itemData.cost; // Fallback
        }

        // Sync inventory back
        if (type === 'weapon') {
            this.weapons = inventoryService.inventory.weapons;
        } else {
            // Sync equipment arrays
            this.equipment = [
                ...inventoryService.inventory.armor,
                ...inventoryService.inventory.utility
            ];
        }

        if (this.logger) this.logger.info(`✅ Purchased ${itemData.name} for ${itemData.cost} credits`);
    }

    // Refresh UI - simply re-navigate to arsenal
    const arsenalDialog = document.getElementById('dialog-arsenal');
    if (arsenalDialog) {
        const dialogEngine = this.dialogEngine || window.dialogEngine || window.declarativeDialogEngine;
        if (dialogEngine && dialogEngine.navigateTo) {
            dialogEngine.navigateTo('arsenal');
            if (this.logger) this.logger.info('✅ Arsenal UI refreshed after buy');
        }
    } else {
        // Original refresh for old UI
        this.showShopInterface();
        this.updateCreditsDisplay();
    }

    // Show confirmation
    if (this.logger) this.logger.debug(`Purchased ${itemData.name} for ${itemData.cost} credits`);
};

// Show sell interface
CyberOpsGame.prototype.showSellInterface = function() {
    // Check if we're in declarative dialog mode
    if (this.dialogEngine && this.dialogEngine.currentState) {
        // Open sell interface as a separate HUD dialog
        if (this.logger) this.logger.debug('💰 Opening Sell interface as HUD dialog');
        this.showSellDialog();
        return;
    }

    // Original implementation for old equipment dialog
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        if (this.logger) this.logger.error('inventoryList element not found');
        return;
    }
    inventoryEl.innerHTML = '<h4 style="color: #8b4513; margin-bottom: 10px;">💰 SELL ITEMS</h4>';

    // Show all sellable items
    const allItems = [
        ...this.weapons.map(w => ({ ...w, type: 'weapon' })),
        ...this.equipment.map(e => ({ ...e, type: 'equipment' }))
    ];

    allItems.forEach(item => {
        const available = this.getAvailableCount(item.type, item.id);
        if (available > 0) {
            const sellPrice = window.GameServices ?
                window.GameServices.formulaService.calculateSellPrice(item, 0.9) :
                Math.floor(item.cost * 0.6);

            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = `
                background: rgba(139,69,19,0.1);
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            itemDiv.innerHTML = `
                <div>
                    <div style="color: #fff; font-weight: bold;">${item.name}</div>
                    <div style="color: #888; font-size: 0.85em;">
                        Available: ${available} | Sell Price: ${sellPrice} credits
                    </div>
                </div>
                <button class="menu-button" style="padding: 5px 10px; font-size: 0.9em; background: #8b4513;"
                 onclick="game.sellItem('${item.type}', ${item.id})">SELL</button>
            `;

            inventoryEl.appendChild(itemDiv);
        }
    });

    if (inventoryEl.children.length === 1) {
        inventoryEl.innerHTML += '<div style="color: #888; text-align: center; padding: 20px;">No items available to sell (unequip items first)</div>';
    }
};