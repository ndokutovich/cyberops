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
            if (this.logger) {
                this.logger.debug(`📦 Initialized loadout for agent with ID: ${agent.id}, name: ${agent.name}`);
            }
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

// Close equipment dialog
CyberOpsGame.prototype.closeEquipmentDialog = function() {
    if (this.logger) this.logger.debug('🔒 Closing equipment dialog...');

    // Use DialogStateService (single source of truth)
    if (this.gameServices?.dialogStateService) {
        this.gameServices.dialogStateService.close();
    }

    // If there's an active modal from modal engine, close it too
    if (this.activeModal) {
        this.activeModal.close?.();
        this.activeModal = null;
    }

    // Close any declarative dialogs if open
    if (this.gameServices?.dialogStateService?.currentState) {
        this.gameServices.dialogStateService.closeAll();
    }
};

// Refresh entire equipment UI
CyberOpsGame.prototype.refreshEquipmentUI = function() {
    // Check if arsenal dialog exists in DOM (even if modal is on top)
    const arsenalDialog = document.getElementById('dialog-arsenal');
    if (arsenalDialog) {
        // Use DialogStateService for navigation (single source of truth)
        const dialogService = this.gameServices?.dialogStateService;
        if (dialogService) {
            dialogService.navigateTo('arsenal');
            if (this.logger) this.logger.debug('Arsenal UI refreshed via DialogStateService');
            return;
        }
    }

    // No fallback - declarative system is required
    if (this.logger) this.logger.warn('⚠️ Arsenal dialog not found, cannot refresh equipment UI');
};

// Legacy fallback functions removed - now using declarative dialog system only
// Deleted: updateInventoryDisplay(), updateAgentList()

// Select agent for equipment management
CyberOpsGame.prototype.selectAgentForEquipment = function(agentId) {
    this.selectedEquipmentAgent = agentId;

    // Refresh declarative dialog via DialogStateService
    const dialogService = this.gameServices?.dialogStateService;
    if (dialogService?.currentState === 'arsenal') {
        dialogService.navigateTo('arsenal');
    } else if (this.logger) {
        this.logger.warn('⚠️ Arsenal dialog not active, cannot refresh agent selection');
    }
};

// Deleted: updateLoadoutDisplay() - legacy fallback function removed

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

// Deleted: updateStatsPreview() - legacy fallback function removed

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
                        DMG: ${weapon.stats?.damage || weapon.damage || 0} | Owned: ${weapon.owned} | Equipped: ${equippedCount} | Available: ${availableCount}
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
    // InventoryService is required
    if (!this.gameServices?.inventoryService) {
        throw new Error('InventoryService not available - required for equipment count');
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
    this.gameServices.resourceService.add('credits', result.price, `sold ${result.itemName}`);

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

                    // Use InventoryService to decrement item count (required)
                    if (!this.gameServices?.inventoryService) {
                        throw new Error('InventoryService not available - required for selling items');
                    }
                    this.gameServices.inventoryService.updateItemCount(type, itemId, -1);
                    const creditsBefore = this.credits;

                    // Safeguard: ensure sellPrice is positive
                    const finalSellPrice = Math.max(0, sellPrice);
                    if (finalSellPrice <= 0) {
                        if (this.logger) this.logger.error('WARNING: Sell price is not positive!', sellPrice);
                    }

                    // Add credits from sale
                    this.gameServices.resourceService.add('credits', finalSellPrice, `sold ${item.name}`);

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

                                const dialogService = game.gameServices?.dialogStateService;
                                if (dialogService) {
                                    if (this.logger) this.logger.debug('8. Current inventory mode:', game.currentInventoryMode);
                                    // Navigate to arsenal which will regenerate with current data
                                    dialogService.navigateTo('arsenal');
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
                                    if (this.logger) this.logger.error('ERROR: DialogStateService not found');
                                }
                            } else {
                                if (this.logger) this.logger.error('ERROR: Missing components', { contentEl: !!contentEl });
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
    if (logger) logger.debug(`📋 Existing loadout keys before clear: ${Object.keys(invService.agentLoadouts).join(', ')}`);
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
        // Use originalId if in mission, otherwise use regular id
        const loadoutId = agent.originalId || agent.id;
        if (logger) {
            logger.debug(`🎯 Creating loadout for agent "${agent.name}" with loadout ID: ${loadoutId} (originalId: ${agent.originalId}, id: ${agent.id})`);
        }
        if (!invService.agentLoadouts[loadoutId]) {
            invService.agentLoadouts[loadoutId] = {
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

    if (logger) {
        logger.info(`🔍 Building weapon pool from ${weaponsToUse.length} weapons`);
        weaponsToUse.forEach(w => {
            const damage = w.stats?.damage || w.damage || 0;
            logger.debug(`  - ${w.name}: owned=${w.owned}, damage=${damage}`);
        });
    }

    weaponsToUse.forEach(weapon => {
        if (weapon.owned > 0) {
            for (let i = 0; i < weapon.owned; i++) {
                weaponPool.push({ ...weapon });
            }
        }
    });

    if (logger) logger.info(`📊 Weapon pool created with ${weaponPool.length} weapons (${weaponsToUse.filter(w => w.owned > 0).length} types)`);

    // Sort weapon pool by damage (best first)
    // Handle both nested stats.damage and flat damage
    weaponPool.sort((a, b) => {
        const damageA = a.stats?.damage || a.damage || 0;
        const damageB = b.stats?.damage || b.damage || 0;
        return damageB - damageA;
    });

    if (logger && weaponPool.length > 0) {
        logger.info(`🎯 Top weapons by damage:`);
        weaponPool.slice(0, 5).forEach((w, i) => {
            const damage = w.stats?.damage || w.damage || 0;
            logger.debug(`  ${i + 1}. ${w.name}: ${damage} damage`);
        });
    }

    // Assign best weapons to agents
    this.activeAgents.forEach((agent, index) => {
        if (index < weaponPool.length) {
            // Use originalId if in mission, otherwise use regular id
            const loadoutId = agent.originalId || agent.id;
            if (logger) {
                logger.info(`🔫 Equipping weapon ${weaponPool[index].name} (ID: ${weaponPool[index].id}) to agent "${agent.name}" (loadout ID: ${loadoutId})`);
            }
            // ONLY use InventoryService to equip
            invService.equipItem(loadoutId, 'weapon', weaponPool[index].id);
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
        // Use originalId if in mission, otherwise use regular id
        const loadoutId = agent.originalId || agent.id;

        // Assign armor if available
        if (index < armorPool.length) {
            invService.equipItem(loadoutId, 'armor', armorPool[index].id);
        }

        // Assign utility based on specialization or availability
        let assigned = false;

        // Try to match specialization first
        if (agent.specialization === 'hacker') {
            const hackKit = utilityPool.find(item => item.hackBonus && !item.assigned);
            if (hackKit) {
                invService.equipItem(loadoutId, 'utility', hackKit.id);
                hackKit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'stealth') {
            const stealthSuit = utilityPool.find(item => item.stealthBonus && !item.assigned);
            if (stealthSuit) {
                invService.equipItem(loadoutId, 'utility', stealthSuit.id);
                stealthSuit.assigned = true;
                assigned = true;
            }
        } else if (agent.specialization === 'demolition') {
            const explosives = utilityPool.find(item => item.damage && !item.assigned);
            if (explosives) {
                invService.equipItem(loadoutId, 'utility', explosives.id);
                explosives.assigned = true;
                assigned = true;
            }
        }

        // If no specialization match, assign any available utility
        if (!assigned) {
            const anyUtility = utilityPool.find(item => !item.assigned);
            if (anyUtility) {
                invService.equipItem(loadoutId, 'utility', anyUtility.id);
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

    if (logger) {
        logger.info(`✅ Optimization complete. Final loadout keys: ${Object.keys(invService.agentLoadouts).join(', ')}`);
        Object.keys(invService.agentLoadouts).forEach(key => {
            const loadout = invService.agentLoadouts[key];
            if (loadout.weapon) {
                const weapon = invService.getItemById('weapon', loadout.weapon);
                logger.debug(`  - Agent[${key}]: ${weapon ? weapon.name : 'Unknown weapon'} (ID: ${loadout.weapon})`);
            }
        });
    }

    // Force complete UI refresh
    this.refreshEquipmentUI();

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

// Deleted: updateCreditsDisplay() - legacy fallback function removed

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

// Buy item from shop
CyberOpsGame.prototype.buyItemFromShop = function(type, itemId) {
    // ONLY use InventoryService - no fallback
    const inventoryService = this.gameServices.inventoryService;
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
    const itemCost = itemData.value || itemData.cost || 0;
    const canAfford = this.gameServices.resourceService.canAfford('credits', itemCost);
    if (!canAfford) {
        return;
    }

    // Use ONLY InventoryService
    const result = inventoryService.buyItem(type, itemData, itemCost);

    if (result.success) {
        // Deduct credits via ResourceService
        this.gameServices.resourceService.spend('credits', itemCost, `bought ${itemData.name}`);

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

    // Refresh UI - use DialogStateService
    const arsenalDialog = document.getElementById('dialog-arsenal');
    if (arsenalDialog) {
        const dialogService = this.gameServices?.dialogStateService;
        if (dialogService) {
            dialogService.navigateTo('arsenal');
            if (this.logger) this.logger.info('✅ Arsenal UI refreshed after buy');
        }
    } else if (this.logger) {
        this.logger.warn('⚠️ Arsenal dialog not found, cannot refresh after purchase');
    }

    // Show confirmation
    if (this.logger) this.logger.debug(`Purchased ${itemData.name} for ${itemData.cost} credits`);
};