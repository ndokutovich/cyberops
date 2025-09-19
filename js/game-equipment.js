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

    // Add global handler for equipment dialog close buttons (fallback)
    document.addEventListener('click', (e) => {
        if (e.target.closest('#equipmentDialog .dialog-close') ||
            (e.target.textContent === '[X]' && e.target.closest('#equipmentDialog')) ||
            (e.target.textContent === 'CLOSE' && e.target.closest('#equipmentDialog'))) {
            console.log('🔒 Equipment close button clicked via delegation');
            this.closeEquipmentDialog();
        }
    });
};

// Open equipment management dialog
CyberOpsGame.prototype.showEquipmentManagement = function() {
    // If declarative dialog system is available, use it
    if (this.dialogEngine) {
        console.log('🔫 Redirecting to declarative Arsenal dialog');
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
        console.log('Auto-selected agent for equipment:', this.selectedEquipmentAgent);
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
                console.log('🔒 Close button clicked');
                this.closeEquipmentDialog();
            });
        }

        if (closeBtn && !closeBtn._hasHandler) {
            closeBtn._hasHandler = true;
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔒 CLOSE button clicked');
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
                console.log('📦 Inventory was empty, populating now...');
                this.showWeaponInventory();
            }
        }, 50);
    }
};

// Close equipment dialog
CyberOpsGame.prototype.closeEquipmentDialog = function() {
    console.log('🔒 Closing equipment dialog...');

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
    // If using declarative dialog, update content without re-navigating
    if (this.dialogEngine && this.dialogEngine.currentState && this.dialogEngine.currentState.id === 'arsenal') {
        // Update content without re-navigating to avoid fade effect
        const dialogEl = document.getElementById('dialog-arsenal');
        if (dialogEl && this.generateEquipmentManagement) {
            const contentEl = dialogEl.querySelector('.dialog-body');
            if (contentEl) {
                contentEl.innerHTML = this.generateEquipmentManagement();
            }
        }
    } else {
        // Otherwise use traditional update methods
        this.updateAgentList();
        this.updateInventoryDisplay();
        this.updateCreditsDisplay();

        if (this.selectedEquipmentAgent) {
            this.updateLoadoutDisplay(this.selectedEquipmentAgent);
            this.updateStatsPreview(this.selectedEquipmentAgent);
        }
    }
};

// Update inventory display in equipment screen
CyberOpsGame.prototype.updateInventoryDisplay = function() {
    // This function updates the weapon inventory display
    // Since we handle inventory in the shop tab, this can be a placeholder
    // or we can add a quick inventory summary here if needed
    console.log('Inventory updated:', {
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

    const loadout = this.agentLoadouts[agentId] || {};
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
    console.log('🔫 showWeaponInventory called');
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        console.error('inventoryList element not found!');
        return;
    }
    console.log('   Weapons available:', this.weapons?.length || 0);
    console.log('   Selected agent:', this.selectedEquipmentAgent);

    inventoryEl.innerHTML = '<h4 style="color: #ffa500; margin-bottom: 10px;">🔫 WEAPONS</h4>';

    // Get available weapons (not equipped by other agents)
    this.weapons.forEach(weapon => {
        const availableCount = this.getAvailableCount('weapon', weapon.id);

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
                        DMG: ${weapon.damage} | Owned: ${weapon.owned} | Available: ${availableCount}
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

    this.equipment.forEach(item => {
        const availableCount = this.getAvailableCount('equipment', item.id);
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
                        ${stats}| Owned: ${item.owned} | Available: ${availableCount}
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
    const items = type === 'weapon' ? this.weapons : this.equipment;
    const item = items.find(i => i.id === itemId);
    if (!item) return 0;

    let equippedCount = 0;
    Object.values(this.agentLoadouts).forEach(loadout => {
        if (type === 'weapon' && loadout.weapon === itemId) equippedCount++;
        if (type === 'equipment') {
            if (loadout.armor === itemId) equippedCount++;
            if (loadout.utility === itemId) equippedCount++;
            if (loadout.special === itemId) equippedCount++;
        }
    });

    return Math.max(0, item.owned - equippedCount);
};

// Equip item to agent
CyberOpsGame.prototype.equipItem = function(agentId, slot, itemId) {
    if (!this.agentLoadouts[agentId]) {
        this.agentLoadouts[agentId] = {};
    }

    // Check if item is available
    const type = slot === 'weapon' ? 'weapon' : 'equipment';
    const available = this.getAvailableCount(type, itemId);
    if (available <= 0) {
        console.log('Item not available');
        return;
    }

    // Unequip current item if any
    if (this.agentLoadouts[agentId][slot]) {
        this.unequipItem(agentId, slot);
    }

    // Equip new item
    this.agentLoadouts[agentId][slot] = itemId;

    // Refresh UI
    this.refreshEquipmentUI();
};

// Unequip item from agent
CyberOpsGame.prototype.unequipItem = function(agentId, slot) {
    if (this.agentLoadouts[agentId]) {
        this.agentLoadouts[agentId][slot] = null;
    }
    this.refreshEquipmentUI();
};

// Sell item
CyberOpsGame.prototype.sellItem = function(type, itemId) {
    const items = type === 'weapon' ? this.weapons : this.equipment;
    const item = items.find(i => i.id === itemId);
    if (!item || item.owned <= 0) return;

    // Check if item is equipped
    const available = this.getAvailableCount(type, itemId);
    if (available <= 0) {
        this.showHudDialog(
            '⚠️ CANNOT SELL',
            'This item is currently equipped. Unequip it first to sell.',
            [{ text: 'OK', action: 'close' }]
        );
        return;
    }

    // Calculate sell price
    const sellPrice = window.GameServices ?
        window.GameServices.formulaService.calculateSellPrice(item, 0.9) :
        Math.floor(item.cost * 0.6);

    // Confirm sale
    this.showHudDialog(
        '💰 SELL ITEM',
        `Sell ${item.name} for ${sellPrice} credits?<br>
        <span style="color: #888;">You currently have ${available} available to sell.</span>`,
        [
            {
                text: 'SELL',
                closeAfter: false,
                action: () => {
                    item.owned--;
                    this.credits += sellPrice;
                    this.refreshEquipmentUI();
                    // Close current modal
                    if (this.activeModal && this.activeModal.close) {
                        this.activeModal.close();
                    }
                    // Show success message after a short delay
                    setTimeout(() => {
                        this.showHudDialog(
                            '✅ SOLD',
                            `${item.name} sold for ${sellPrice} credits!`,
                            [{ text: 'OK', action: 'close' }]
                        );
                    }, 100);
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
    if (window.GameServices && window.GameServices.equipmentService) {
        if (type === 'weapon') {
            itemData = window.GameServices.equipmentService.getWeapon(itemId);
        } else {
            itemData = window.GameServices.equipmentService.getEquipment(itemId);
        }
    }

    if (!itemData) {
        console.error('Item not found');
        return;
    }

    // Check affordability
    if (this.credits < itemData.cost) {
        this.showHudDialog(
            '❌ INSUFFICIENT FUNDS',
            `You need ${itemData.cost} credits to buy ${itemData.name}.<br>
            You currently have ${this.credits} credits.`,
            [{ text: 'OK', action: 'close' }]
        );
        return;
    }

    // Show confirmation
    this.showHudDialog(
        '🛒 CONFIRM PURCHASE',
        `Buy ${itemData.name} for ${itemData.cost} credits?<br>
        <span style="color: #888;">You will have ${this.credits - itemData.cost} credits remaining.</span>`,
        [
            {
                text: 'BUY',
                closeAfter: false,
                action: () => {
                    // Perform purchase
                    this.buyItemFromShop(type, itemId);
                    // Close current modal
                    if (this.activeModal && this.activeModal.close) {
                        this.activeModal.close();
                    }
                    // Show success message after a short delay
                    setTimeout(() => {
                        this.showHudDialog(
                            '✅ PURCHASED',
                            `${itemData.name} purchased for ${itemData.cost} credits!`,
                            [{ text: 'OK', action: 'close' }]
                        );
                    }, 100);
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
    html += `<div style="color: #ffa500; margin-bottom: 20px;">Credits: ${this.credits}</div>`;

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
    html += `<div style="color: #ffa500; margin-bottom: 20px;">Credits: ${this.credits}</div>`;

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
            const canAfford = this.credits >= item.cost;
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
    // Initialize loadouts for any new agents first
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

    // Clear all loadouts
    Object.keys(this.agentLoadouts).forEach(agentId => {
        this.agentLoadouts[agentId] = {
            weapon: null,
            armor: null,
            utility: null,
            special: null
        };
    });

    // Build a pool of all available weapons
    const weaponPool = [];
    this.weapons.forEach(weapon => {
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
            this.agentLoadouts[agent.id].weapon = weaponPool[index].id;
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
            this.agentLoadouts[agent.id].armor = armorPool[index].id;
        }

        // Assign utility based on specialization or availability
        let assigned = false;

        // Try to match specialization first
        if (agent.specialization === 'hacker') {
            const hackKit = utilityPool.find(item => item.hackBonus && !item.assigned);
            if (hackKit) {
                this.agentLoadouts[agent.id].utility = hackKit.id;
                hackKit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'stealth') {
            const stealthSuit = utilityPool.find(item => item.stealthBonus && !item.assigned);
            if (stealthSuit) {
                this.agentLoadouts[agent.id].utility = stealthSuit.id;
                stealthSuit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'demolition') {
            const explosives = utilityPool.find(item => item.damage && !item.assigned);
            if (explosives) {
                this.agentLoadouts[agent.id].utility = explosives.id;
                explosives.assigned = true;
                assigned = true;
            }
        }

        // If no specialization match, assign any available utility
        if (!assigned) {
            const anyUtility = utilityPool.find(item => !item.assigned);
            if (anyUtility) {
                this.agentLoadouts[agent.id].utility = anyUtility.id;
                anyUtility.assigned = true;
            }
        }
    });

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

    console.log('✅ Loadouts optimized successfully');
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
    if (creditsEl) creditsEl.textContent = this.credits.toLocaleString();

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
    return agents.map(agent => {
        // Try multiple ID formats to find the loadout
        const loadoutId = agent.id || agent.name;
        const loadout = this.agentLoadouts[loadoutId] ||
                       this.agentLoadouts[agent.name] ||
                       this.agentLoadouts[agent.originalId];

        if (!loadout) {
            console.log(`⚠️ No loadout found for agent: ${agent.name} (tried IDs: ${loadoutId}, ${agent.name}, ${agent.originalId})`);
            return agent;
        }

        console.log(`✅ Applying loadout to ${agent.name}:`, loadout);

        let modifiedAgent = { ...agent };

        // Apply weapon
        if (loadout.weapon) {
            const weapon = this.getItemById('weapon', loadout.weapon);
            if (weapon) {
                modifiedAgent.damage = (modifiedAgent.damage || 0) + weapon.damage;
                modifiedAgent.weaponName = weapon.name;
                modifiedAgent.weaponDamage = weapon.damage;
            }
        }

        // Apply armor
        if (loadout.armor) {
            const armor = this.getItemById('armor', loadout.armor);
            if (armor && armor.protection) {
                modifiedAgent.protection = (modifiedAgent.protection || 0) + armor.protection;
            }
        }

        // Apply utility
        if (loadout.utility) {
            const utility = this.getItemById('equipment', loadout.utility);
            if (utility) {
                if (utility.hackBonus) {
                    modifiedAgent.hackBonus = (modifiedAgent.hackBonus || 0) + utility.hackBonus;
                }
                if (utility.stealthBonus) {
                    modifiedAgent.stealthBonus = (modifiedAgent.stealthBonus || 0) + utility.stealthBonus;
                }
            }
        }

        return modifiedAgent;
    });
};

// Show shop interface to buy items
CyberOpsGame.prototype.showShopInterface = function() {
    // Check if we're in declarative dialog mode
    if (this.dialogEngine && this.dialogEngine.currentState) {
        // Open shop as a separate HUD dialog
        console.log('🛒 Opening Shop interface as HUD dialog');
        this.showShopDialog();
        return;
    }

    // Original implementation for old equipment dialog
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        console.error('inventoryList element not found');
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
        const canAfford = this.credits >= item.cost;

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
    // Find item in service
    let itemData = null;
    if (window.GameServices && window.GameServices.equipmentService) {
        if (type === 'weapon') {
            itemData = window.GameServices.equipmentService.getWeapon(itemId);
        } else {
            itemData = window.GameServices.equipmentService.getEquipment(itemId);
        }
    }

    if (!itemData) {
        console.error('Item not found in service');
        return;
    }

    // Check affordability
    if (this.credits < itemData.cost) {
        return;
    }

    // Purchase item
    this.credits -= itemData.cost;

    // Add to inventory
    const items = type === 'weapon' ? this.weapons : this.equipment;
    let existingItem = items.find(i => i.id === itemId);

    if (existingItem) {
        existingItem.owned++;
    } else {
        // Add new item to inventory
        const newItem = {
            id: itemData.id,
            name: itemData.name,
            type: type,
            cost: itemData.cost,
            owned: 1
        };

        // Copy relevant stats
        if (itemData.damage) newItem.damage = itemData.damage;
        if (itemData.protection) newItem.protection = itemData.protection;
        if (itemData.hackBonus) newItem.hackBonus = itemData.hackBonus;
        if (itemData.stealthBonus) newItem.stealthBonus = itemData.stealthBonus;
        if (itemData.explosiveDamage) newItem.explosiveDamage = itemData.explosiveDamage;

        items.push(newItem);
    }

    // Refresh UI
    this.showShopInterface();
    this.updateCreditsDisplay();

    // Show confirmation
    console.log(`Purchased ${itemData.name} for ${itemData.cost} credits`);
};

// Show sell interface
CyberOpsGame.prototype.showSellInterface = function() {
    // Check if we're in declarative dialog mode
    if (this.dialogEngine && this.dialogEngine.currentState) {
        // Open sell interface as a separate HUD dialog
        console.log('💰 Opening Sell interface as HUD dialog');
        this.showSellDialog();
        return;
    }

    // Original implementation for old equipment dialog
    const inventoryEl = document.getElementById('inventoryList');
    if (!inventoryEl) {
        console.error('inventoryList element not found');
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