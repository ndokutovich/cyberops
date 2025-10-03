/**
 * game-rpg-ui.js
 * UI components for the RPG system
 * Includes character sheet, inventory, leveling, and shops
 */

// Character Sheet UI - Now uses declarative dialog system when available
// showCharacterSheet removed - now using declarative dialog system
// All calls replaced with: this._selectedAgent = agent; this.dialogEngine.navigateTo('character');

// Render stat list
CyberOpsGame.prototype.renderStatList = function(stats) {
    if (!stats) return '<div>No stats available</div>';

    if (this.logger) this.logger.debug('Rendering stats:', stats);

    return Object.entries(stats).map(([stat, value]) => {
        // Handle different stat value formats
        let statValue;
        if (typeof value === 'object' && value !== null) {
            // Try different properties for object-based stats
            if (typeof value.value === 'number') {
                statValue = value.value;  // Calculated value with getter
            } else if (typeof value.base === 'number') {
                statValue = value.base;  // Base value
            } else if (typeof value.baseValue === 'number') {
                statValue = value.baseValue;
            } else {
                statValue = 10; // Default
            }
        } else if (typeof value === 'number') {
            statValue = value;
        } else {
            if (this.logger) this.logger.warn(`Stat ${stat} has non-numeric value:`, value);
            statValue = 10; // Default fallback
        }

        return `
            <div class="stat-item">
                <span class="stat-name">${stat.charAt(0).toUpperCase() + stat.slice(1)}:</span>
                <span class="stat-value">${statValue}</span>
            </div>
        `;
    }).join('');
};

// Render skill list
CyberOpsGame.prototype.renderSkillList = function(skills) {
    if (!skills || skills.length === 0) {
        return '<div class="no-skills">No skills learned</div>';
    }

    return skills.map(skillId => {
        const rpgConfig = this.game?.getRPGConfig ? this.game.getRPGConfig() : {};
        const skill = rpgConfig?.skills?.[skillId];
        if (!skill) return '';

        return `
            <div class="skill-item" title="${skill.description || ''}">
                <span class="skill-icon">${skill.icon || '⚡'}</span>
                <span class="skill-name">${skill.name}</span>
                <span class="skill-level">Lvl ${skill.level || 1}</span>
            </div>
        `;
    }).join('');
};

// Render perk list
CyberOpsGame.prototype.renderPerkList = function(perks) {
    if (!perks || perks.length === 0) {
        return '<div class="no-perks">No perks acquired</div>';
    }

    return perks.map(perkId => {
        const rpgConfig = this.game?.getRPGConfig ? this.game.getRPGConfig() : {};
        const perk = rpgConfig?.perks?.[perkId];
        if (!perk) return '';

        return `
            <div class="perk-item" title="${perk.description || ''}">
                <span class="perk-icon">${perk.icon || '★'}</span>
                <span class="perk-name">${perk.name}</span>
            </div>
        `;
    }).join('');
};

// Calculate XP percentage
CyberOpsGame.prototype.calculateXPPercent = function(rpgEntity) {
    const currentLevel = rpgEntity.level || 1;
    const currentXP = rpgEntity.experience || 0;

    // For level 1, XP starts from 0
    // For higher levels, calculate from the previous level's requirement
    let previousLevelXP = 0;
    if (currentLevel > 1) {
        previousLevelXP = this.rpgManager.experienceTable[currentLevel] || 0;
    }

    const nextRequired = this.rpgManager.experienceTable[currentLevel + 1] || 1000;

    // Calculate progress from previous level to next level
    const xpIntoCurrentLevel = currentXP - previousLevelXP;
    const xpNeededForLevel = nextRequired - previousLevelXP;

    const percent = (xpIntoCurrentLevel / xpNeededForLevel) * 100;

    if (this.logger) this.logger.debug(`📊 XP Progress: ${currentXP}/${nextRequired} = ${percent.toFixed(1)}% (Level ${currentLevel})`);

    return Math.min(100, Math.max(0, percent));
};

// Inventory UI - Always use hub equipment system
CyberOpsGame.prototype.showInventory = function(agentIdOrName) {
    if (this.logger) this.logger.debug('showInventory called with:', agentIdOrName);

    // Always use the hub equipment management UI for consistency
    if (this.showEquipmentManagement) {
        if (this.logger) this.logger.debug('📦 Opening unified equipment management UI');

        // If we have a specific agent selected in game, pre-select them
        if (agentIdOrName && this.currentScreen === 'game') {
            const agent = this.agents.find(a =>
                a.id === agentIdOrName ||
                a.name === agentIdOrName ||
                a.originalId === agentIdOrName
            );
            if (agent) {
                // Use the original ID for equipment system
                this.selectedEquipmentAgent = agent.originalId || agent.name || agent.id;
            }
        }

        this.showEquipmentManagement();
        return;
    }

    // Find agent - check both ID and name
    const agent = this.findAgentForRPG(agentIdOrName);
    if (!agent) {
        if (this.logger) this.logger.warn('Agent not found:', agentIdOrName);
        return;
    }

    // Ensure agent has RPG entity with derived stats
    if (!agent.rpgEntity) {
        if (this.logger) this.logger.debug('Creating RPG entity for inventory owner');
        if (this.rpgManager) {
            agent.rpgEntity = this.rpgManager.createRPGAgent(agent, agent.class || 'soldier');
        }
    }

    // Get or create inventory
    let inventory = this.inventoryManager?.getInventory(agentIdOrName);
    if (!inventory && this.inventoryManager) {
        if (this.logger) this.logger.debug('Creating inventory for agent:', agent.name);
        // Use carry weight from derived stats or default
        const carryWeight = agent.rpgEntity?.derivedStats?.carryWeight || 100;
        inventory = this.inventoryManager.createInventory(agentIdOrName, carryWeight);

        // Set the owner reference with derived stats
        if (inventory && agent.rpgEntity) {
            inventory.owner = agent.rpgEntity;
        }

        // Don't add any test items - inventory should sync from hub equipment
    }

    if (!inventory) {
        if (this.logger) this.logger.warn('Could not create inventory');
        return;
    }

    // Create unified inventory dialog for in-game use
    const dialog = document.createElement('div');
    dialog.className = 'inventory-dialog';
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ffff;
        border-radius: 10px;
        padding: 20px;
        width: 800px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 99999;
        display: block;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    `;

    // Sync current loadout if it exists - check by original ID for mission agents
    const loadoutId = agent.originalId || agent.name || agentIdOrName;
    const loadout = this.agentLoadouts?.[loadoutId] || {};
    if (this.logger) this.logger.debug(`📦 Getting loadout for ${loadoutId}:`, loadout);

    dialog.innerHTML = `
        <div class="dialog-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #00ffff; margin: 0;">${agent.name}'s Equipment</h2>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()"
                    style="background: #ff0000; border: none; color: white; padding: 5px 10px; cursor: pointer;">×</button>
        </div>

        <div class="dialog-content">
            <div class="inventory-stats" style="display: flex; justify-content: space-between; padding: 10px; background: rgba(0,255,255,0.1); margin-bottom: 20px;">
                <span>⚖️ Weight: ${inventory.currentWeight.toFixed(1)} / ${inventory.maxWeight} kg</span>
                <span>💰 Credits: ${this.credits || 0}</span>
                <span>📊 Level: ${agent.rpgEntity?.level || 1}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <!-- Equipped Items Column -->
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px;">
                    <h3 style="color: #ffa500; margin-bottom: 15px;">🎯 EQUIPPED</h3>

                    <div style="margin-bottom: 15px;">
                        <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">PRIMARY WEAPON</div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;">
                            ${this.renderEquipmentSlot(loadout.weapon, 'weapon', inventory)}
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">ARMOR</div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;">
                            ${this.renderEquipmentSlot(loadout.armor, 'armor', inventory)}
                        </div>
                    </div>

                    <div style="margin-bottom: 15px;">
                        <div style="color: #888; font-size: 0.9em; margin-bottom: 5px;">UTILITY</div>
                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 5px;">
                            ${this.renderEquipmentSlot(loadout.utility, 'utility', inventory)}
                        </div>
                    </div>
                </div>

                <!-- Inventory Items Column -->
                <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 5px;">
                    <h3 style="color: #ffa500; margin-bottom: 15px;">🎒 INVENTORY</h3>
                    <div style="max-height: 400px; overflow-y: auto;">
                        ${this.renderInventoryItems(inventory.items, agentIdOrName)}
                    </div>
                </div>
            </div>

            <!-- Quick Actions (only in game, not hub) -->
            ${this.currentScreen === 'game' ? `
                <div style="margin-top: 20px; display: flex; justify-content: center; gap: 10px;">
                    <button onclick="game.useHealthPack('${agentIdOrName}')"
                            style="background: #4caf50; border: none; color: white; padding: 10px 20px; cursor: pointer; border-radius: 5px;">
                        🏥 Use Medkit
                    </button>
                    <button onclick="game.dropItem('${agentIdOrName}')"
                            style="background: #f44336; border: none; color: white; padding: 10px 20px; cursor: pointer; border-radius: 5px;">
                        🗑️ Drop Item
                    </button>
                </div>
            ` : ''}
        </div>
    `;

    document.body.appendChild(dialog);
};

// Render equipped items
CyberOpsGame.prototype.renderEquippedItems = function(equipped) {
    if (!equipped) return '<div>No items equipped</div>';

    const slots = ['weapon', 'armor', 'accessory1', 'accessory2'];

    return slots.map(slot => {
        const item = equipped[slot];
        return `
            <div class="equipment-slot" data-slot="${slot}">
                <div class="slot-label">${slot.charAt(0).toUpperCase() + slot.slice(1)}</div>
                ${item ? this.renderItem(item) : '<div class="empty-slot">Empty</div>'}
            </div>
        `;
    }).join('');
};

// Render backpack items
CyberOpsGame.prototype.renderBackpackItems = function(items) {
    if (!items || items.length === 0) {
        return '<div class="empty-inventory">Inventory is empty</div>';
    }

    return `
        <div class="item-grid">
            ${items.map(item => this.renderItem(item, true)).join('')}
        </div>
    `;
};

// Render single item
CyberOpsGame.prototype.renderItem = function(item, showQuantity = false) {
    return `
        <div class="item" data-item-id="${item.id}" title="${item.description || ''}">
            <div class="item-icon">${item.icon || '📦'}</div>
            <div class="item-name">${item.name}</div>
            ${showQuantity && item.quantity > 1 ? `<div class="item-quantity">x${item.quantity}</div>` : ''}
            <div class="item-stats">
                ${item.damage ? `<span>DMG: ${item.damage}</span>` : ''}
                ${item.defense ? `<span>DEF: ${item.defense}</span>` : ''}
                ${item.weight ? `<span>${item.weight}kg</span>` : ''}
            </div>
        </div>
    `;
};

// Render equipment slot for unified UI
CyberOpsGame.prototype.renderEquipmentSlot = function(itemId, slotType, inventory) {
    // Check inventory equipped items first (for in-game)
    if (inventory && inventory.equipped) {
        const equippedItem = inventory.equipped[slotType] || inventory.equipped.primary;
        if (equippedItem) {
            let stats = '';
            if (equippedItem.damage || equippedItem.stats?.damage) {
                stats += `DMG: ${equippedItem.damage || equippedItem.stats.damage} `;
            }
            if (equippedItem.protection || equippedItem.defense || equippedItem.stats?.defense) {
                stats += `DEF: ${equippedItem.protection || equippedItem.defense || equippedItem.stats.defense} `;
            }
            if (equippedItem.hackBonus || equippedItem.stats?.hackBonus) {
                stats += `HACK: +${equippedItem.hackBonus || equippedItem.stats.hackBonus} `;
            }

            return `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span style="color: #00ffff; font-weight: bold;">${equippedItem.name}</span>
                        <span style="color: #888; font-size: 0.85em; margin-left: 10px;">${stats}</span>
                    </div>
                </div>
            `;
        }
    }

    if (!itemId) {
        return '<span style="color: #666;">Empty Slot</span>';
    }

    // Try to get item from hub equipment
    let item = null;
    if (slotType === 'weapon' && this.weapons) {
        item = this.weapons.find(w => w.id === itemId);
    } else if (this.equipment) {
        item = this.equipment.find(e => e.id === itemId);
    }

    if (!item) {
        return '<span style="color: #666;">Empty Slot</span>';
    }

    let stats = '';
    if (item.damage) stats += `DMG: ${item.damage} `;
    if (item.protection || item.defense) stats += `DEF: ${item.protection || item.defense} `;
    if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
    if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

    return `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span style="color: #00ffff; font-weight: bold;">${item.name}</span>
                <span style="color: #888; font-size: 0.85em; margin-left: 10px;">${stats}</span>
            </div>
            ${this.currentScreen === 'game' ? '' : `
                <button onclick="game.unequipFromRPG('${itemId}', '${slotType}')"
                        style="background: #f44336; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px; font-size: 0.9em;">
                    UNEQUIP
                </button>
            `}
        </div>
    `;
};

// Render inventory items for unified UI
CyberOpsGame.prototype.renderInventoryItems = function(items, agentId) {
    if (!items || items.length === 0) {
        // Show available hub items that aren't equipped
        let availableItems = [];

        if (this.weapons) {
            this.weapons.forEach(weapon => {
                const available = this.getAvailableCount('weapon', weapon.id);
                if (available > 0) {
                    availableItems.push({
                        ...weapon,
                        type: 'weapon',
                        available: available
                    });
                }
            });
        }

        if (this.equipment) {
            this.equipment.forEach(item => {
                const available = this.getAvailableCount('equipment', item.id);
                if (available > 0) {
                    availableItems.push({
                        ...item,
                        type: 'equipment',
                        available: available
                    });
                }
            });
        }

        if (availableItems.length === 0) {
            return '<div style="color: #888; text-align: center; padding: 20px;">No items available</div>';
        }

        return availableItems.map(item => {
            let stats = '';
            if (item.damage) stats += `DMG: ${item.damage} `;
            if (item.protection) stats += `DEF: ${item.protection} `;
            if (item.hackBonus) stats += `HACK: +${item.hackBonus} `;
            if (item.stealthBonus) stats += `STEALTH: +${item.stealthBonus} `;

            return `
                <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="color: #fff; font-weight: bold;">${item.name}</div>
                            <div style="color: #888; font-size: 0.85em;">${stats} | Available: ${item.available}</div>
                        </div>
                        ${this.currentScreen !== 'hub' ? '' : `
                            <button onclick="game.equipFromRPG('${agentId}', '${item.type}', ${item.id})"
                                    style="background: #4caf50; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;">
                                EQUIP
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Show RPG inventory items
    return items.map(item => {
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="color: #fff; font-weight: bold;">${item.name}</div>
                        <div style="color: #888; font-size: 0.85em;">
                            ${item.quantity > 1 ? `Qty: ${item.quantity} | ` : ''}
                            Weight: ${item.weight || 1}kg
                            ${item.value ? ` | Value: ${item.value}` : ''}
                        </div>
                    </div>
                    ${item.stackable ? `
                        <button onclick="game.useItem('${agentId}', '${item.id}')"
                                style="background: #2196f3; border: none; color: white; padding: 5px 10px; cursor: pointer; border-radius: 3px;">
                            USE
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
};

// Helper functions for equipment sync
CyberOpsGame.prototype.equipFromRPG = function(agentId, itemType, itemId) {
    // Determine slot type
    let slot = itemType === 'weapon' ? 'weapon' :
               (this.getEquipmentSlot && this.getEquipmentSlot({ id: itemId })) || 'utility';

    // Use existing equipment system
    if (this.equipItem) {
        this.equipItem(agentId, slot, itemId);
    }

    // Sync with RPG inventory
    if (this.inventoryManager) {
        const inventory = this.inventoryManager.getInventory(agentId);
        if (inventory) {
            const rpgItemId = `${itemType}_${itemId}`;
            inventory.equipItem(rpgItemId, slot);
        }
    }

    // Refresh UI
    this.showInventory(agentId);
};

CyberOpsGame.prototype.unequipFromRPG = function(itemId, slotType) {
    const agentId = this.selectedEquipmentAgent || (this._selectedAgent?.id || this._selectedAgent?.name);
    if (!agentId) return;

    // Use existing unequip function
    if (this.unequipItem) {
        this.unequipItem(agentId, slotType);
    }

    // Sync with RPG inventory
    if (this.inventoryManager) {
        const inventory = this.inventoryManager.getInventory(agentId);
        if (inventory && inventory.equipped[slotType]) {
            inventory.addItem(inventory.equipped[slotType], 1);
            inventory.equipped[slotType] = null;
        }
    }

    // Refresh UI
    this.showInventory(agentId);
};

// Shop UI
CyberOpsGame.prototype.showShop = function(shopId) {
    if (this.logger) this.logger.debug(`🛒 showShop - routing to declarative rpg-shop state (shopId: ${shopId})`);

    // Use the declarative dialog system
    if (this.dialogEngine && this.dialogEngine.navigateTo) {
        // Store shop ID in state data
        this.dialogEngine.stateData = this.dialogEngine.stateData || {};
        this.dialogEngine.stateData.shopId = shopId || 'black_market';
        this.dialogEngine.stateData.shopTab = 'buy'; // Default to buy tab

        this.dialogEngine.navigateTo('rpg-shop');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available for RPG shop');
    }
};

// Level up notification
CyberOpsGame.prototype.showLevelUpNotification = function(agent) {
    const notification = document.createElement('div');
    notification.className = 'level-up-notification';
    notification.innerHTML = `
        <div class="level-up-content">
            <h2>LEVEL UP!</h2>
            <div class="level-info">
                ${agent.name} reached Level ${agent.rpgEntity.level}!
            </div>
            <div class="rewards">
                <div>+${agent.rpgEntity.availableStatPoints || 0} Stat Points</div>
                <div>+${agent.rpgEntity.availableSkillPoints || 0} Skill Points</div>
                ${agent.rpgEntity.availablePerkPoints > 0 ? `<div>+1 Perk Point</div>` : ''}
            </div>
            <button onclick="game.selectedAgent = game.agents?.find(a => a.id === '${agent.id || agent.name}' || a.name === '${agent.id || agent.name}') || game.activeAgents?.find(a => a.id === '${agent.id || agent.name}' || a.name === '${agent.id || agent.name}'); game.dialogEngine?.navigateTo('character'); this.parentElement.parentElement.remove()">
                Open Character Sheet
            </button>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
};

// Helper function to find agent - ONLY use AgentService (NO FALLBACKS)
CyberOpsGame.prototype.findAgentForRPG = function(agentId) {
    // AgentService is the ONLY source of truth for agents
    if (window.GameServices && window.GameServices.agentService) {
        return window.GameServices.agentService.getAgent(agentId);
    }

    // NO FALLBACKS - Services must be available
    console.error('AgentService not available - cannot find agent');
    return null;
};

// Stat allocation dialog
CyberOpsGame.prototype.showStatAllocation = function(agentId) {
    if (this.logger) this.logger.debug('📈 showStatAllocation - routing to declarative stat-allocation state');

    // Store agentId in state data for the declarative generator
    if (this.dialogEngine) {
        this.dialogEngine.stateData = this.dialogEngine.stateData || {};
        this.dialogEngine.stateData.agentId = agentId;
        this.dialogEngine.stateData.pendingChanges = {}; // Reset pending changes
        this.dialogEngine.navigateTo('stat-allocation');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available for stat allocation');
    }
};

// Handle stat allocation (declarative version)
CyberOpsGame.prototype.allocateStatDeclarative = function(agentId, stat, change) {
    if (!this.dialogEngine || !this.dialogEngine.stateData) return;

    const pending = this.dialogEngine.stateData.pendingChanges || {};
    const current = pending[stat] || 0;
    const newValue = current + change;

    // Get agent to check bounds
    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.rpgEntity) return;

    const totalUsed = Object.values(pending).reduce((sum, val) => sum + val, 0);
    const pointsLeft = agent.rpgEntity.availableStatPoints - totalUsed;

    // Check bounds
    if (change > 0 && pointsLeft <= 0) return;
    if (change < 0 && current <= 0) return;

    // Update pending changes
    pending[stat] = Math.max(0, newValue);
    this.dialogEngine.stateData.pendingChanges = pending;

    // Refresh the dialog to update UI
    this.dialogEngine.navigateTo('stat-allocation', null, true);
};

// Confirm stat allocation (declarative version)
CyberOpsGame.prototype.confirmStatAllocation = function(agentId) {
    // If called from declarative system, get agentId from state data
    if (!agentId && this.dialogEngine?.stateData?.agentId) {
        agentId = this.dialogEngine.stateData.agentId;
    }

    // For declarative system, get pending changes from state data
    let pending;
    if (this.dialogEngine?.stateData?.pendingChanges) {
        pending = this.dialogEngine.stateData.pendingChanges;
    } else {
        // Fallback for old standalone dialog
        const dialog = document.querySelector('.stat-allocation');
        if (!dialog) return;
        pending = JSON.parse(dialog.dataset.pendingChanges || '{}');
    }

    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.rpgEntity) {
        console.error('Cannot find agent for stat confirmation:', agentId);
        return;
    }

    // Apply changes
    Object.entries(pending).forEach(([stat, points]) => {
        if (points > 0) {
            // Get current stat value (handle object or number format)
            let currentValue = agent.rpgEntity.stats[stat];
            if (typeof currentValue === 'object' && currentValue !== null) {
                currentValue = currentValue.value || currentValue.base || 0;
            }
            // Ensure it's a number and add points
            currentValue = (typeof currentValue === 'number' ? currentValue : 0) + points;
            // Store as simple number
            agent.rpgEntity.stats[stat] = currentValue;
        }
    });

    // Update available points
    const totalUsed = Object.values(pending).reduce((sum, val) => sum + val, 0);
    agent.rpgEntity.availableStatPoints -= totalUsed;

    // Recalculate derived stats
    const derived = this.rpgManager.calculateDerivedStats(agent.rpgEntity);
    agent.maxHealth = derived.maxHealth;
    agent.maxAP = derived.maxAP;

    // Close dialog and refresh character sheet
    if (this.dialogEngine?.currentState === 'stat-allocation') {
        // Declarative system - go back to character sheet
        this.dialogEngine.back();
        // Refresh character sheet
        setTimeout(() => {
            this.dialogEngine.navigateTo('character', null, true);
        }, 100);
    } else {
        // Old standalone dialog
        const dialog = document.querySelector('.stat-allocation');
        if (dialog) dialog.remove();

        // Set selected agent and open character sheet
        this.selectedAgent = (this.agents && this.agents.find(a => a.id === agentId || a.name === agentId)) ||
                             (this.activeAgents && this.activeAgents.find(a => a.id === agentId || a.name === agentId));
        if (this.dialogEngine && this.dialogEngine.navigateTo) {
            this.dialogEngine.navigateTo('character');
        }
    }

    if (this.logEvent) {
        this.logEvent(`${agent.name} allocated stat points!`, 'progression');
    }
};

// Select perk (declarative version)
CyberOpsGame.prototype.selectPerkDeclarative = function(agentId, perkId) {
    const logger = window.Logger ? new window.Logger('RPG-UI') : null;
    if (logger) logger.debug(`selectPerkDeclarative called: agent=${agentId}, perk=${perkId}`);

    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.rpgEntity) {
        if (logger) logger.error('Cannot find agent for perk selection:', agentId);
        return;
    }

    const rpg = agent.rpgEntity;

    // Check if agent has perk points
    if (rpg.availablePerkPoints <= 0) {
        if (this.logEvent) {
            this.logEvent('No perk points available!', 'warning');
        }
        return;
    }

    // Try to unlock the perk
    const success = rpg.unlockPerk(perkId);

    if (success) {
        if (logger) logger.info(`✅ ${agent.name} unlocked perk: ${perkId}`);
        if (this.logEvent) {
            const rpgConfig = window.ContentLoader?.getContent('rpgConfig');
            const perkName = rpgConfig?.perks?.[perkId]?.name || perkId;
            this.logEvent(`${agent.name} unlocked ${perkName}!`, 'progression');
        }

        // Update agent's derived stats (maxHealth, maxAP, etc.)
        if (this.rpgManager && rpg.derivedStats) {
            const derived = this.rpgManager.calculateDerivedStats(rpg);
            agent.maxHealth = derived.maxHealth;
            agent.maxAP = derived.maxAP || agent.maxAP;
            if (logger) logger.debug(`Updated agent stats: maxHealth=${agent.maxHealth}, maxAP=${agent.maxAP}`);
        }

        // Refresh the dialog to show updated perk points and unlocked perks
        if (this.dialogEngine) {
            // Always refresh the perk selection to show the updated perks
            // User can manually navigate back when done
            this.dialogEngine.navigateTo('perk-selection', null, true);
        }
    } else {
        if (logger) logger.warn(`❌ Failed to unlock perk: ${perkId}`);
        if (this.logEvent) {
            this.logEvent('Cannot unlock perk! Check requirements.', 'warning');
        }
    }
};

// Switch shop tabs
CyberOpsGame.prototype.switchShopTab = function(button, tab) {
    // Update active button
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    // Show/hide panels
    document.querySelectorAll('.shop-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.getElementById(`shop-${tab}`).style.display = 'block';
};

// Buy item from shop
CyberOpsGame.prototype.buyItem = function(itemId, quantity) {
    if (!this._selectedAgent) return;

    const shopId = 'black_market'; // Default shop for now
    const success = this.shopManager?.buyItem(shopId, itemId, quantity, this._selectedAgent.id || this._selectedAgent.name);

    if (success) {
        if (this.logEvent) {
            this.logEvent('Purchase successful!', 'shop');
        }
        // Refresh shop UI
        this.showShop(shopId);
    } else {
        if (this.logEvent) {
            this.logEvent('Not enough credits or inventory full!', 'warning');
        }
    }
};

// DECLARATIVE SHOP FUNCTIONS
// Switch RPG shop tabs (declarative version)
CyberOpsGame.prototype.switchRPGShopTab = function(shopId, tab) {
    if (this.logger) this.logger.debug(`🛒 Switching RPG shop tab to: ${tab}`);

    // Update state data
    if (this.dialogEngine) {
        this.dialogEngine.stateData = this.dialogEngine.stateData || {};
        this.dialogEngine.stateData.shopId = shopId;
        this.dialogEngine.stateData.shopTab = tab;

        // Refresh the dialog to show new tab
        this.dialogEngine.navigateTo('rpg-shop', null, true);
    }
};

// Buy item from RPG shop (declarative version)
CyberOpsGame.prototype.buyRPGItem = function(shopId, itemId) {
    if (!this._selectedAgent) {
        if (this.logger) this.logger.warn('No agent selected for purchase');
        return;
    }

    const agentId = this._selectedAgent.id || this._selectedAgent.name;
    const success = this.shopManager?.buyItem(shopId, itemId, 1, agentId);

    if (success) {
        if (this.logEvent) {
            this.logEvent('Purchase successful!', 'shop');
        }
        if (this.logger) this.logger.info(`✅ ${this._selectedAgent.name} purchased item: ${itemId}`);

        // Also add to hub inventory so it shows in Arsenal
        const shop = this.shopManager?.getShop(shopId);
        const item = shop?.inventory.find(i => i.id === itemId);
        if (item && this.gameServices?.inventoryService) {
            const inventoryService = this.gameServices.inventoryService;

            // Convert RPG item format to hub inventory format
            const hubItem = {
                id: item.id.replace('weapon_', '').replace('armor_', ''),  // Remove prefix
                name: item.name,
                damage: item.stats?.damage || item.damage || 0,
                protection: item.stats?.defense || item.defense || 0,
                weight: item.weight || 1,
                cost: item.value || item.price || 0,
                owned: 1,
                equipped: 0
            };

            // Add to appropriate hub inventory category
            if (item.type === 'weapon' || item.slot === 'primary') {
                // Check if weapon already exists
                const existingWeapon = inventoryService.inventory.weapons.find(w => w.id === hubItem.id);
                if (existingWeapon) {
                    existingWeapon.owned += 1;
                } else {
                    inventoryService.inventory.weapons.push(hubItem);
                }
            } else if (item.type === 'armor' || item.slot === 'armor') {
                // Check if armor already exists
                const existingArmor = inventoryService.inventory.armor.find(a => a.id === hubItem.id);
                if (existingArmor) {
                    existingArmor.owned += 1;
                } else {
                    inventoryService.inventory.armor.push(hubItem);
                }
            } else {
                // Check if utility already exists
                const existingUtility = inventoryService.inventory.utility.find(u => u.id === hubItem.id);
                if (existingUtility) {
                    existingUtility.owned += 1;
                } else {
                    inventoryService.inventory.utility.push(hubItem);
                }
            }

            if (this.logger) this.logger.info(`📦 Added ${item.name} to hub inventory`);
        }

        // Refresh the dialog
        if (this.dialogEngine) {
            this.dialogEngine.navigateTo('rpg-shop', null, true);
        }
    } else {
        if (this.logEvent) {
            this.logEvent('Not enough credits or inventory full!', 'warning');
        }
        if (this.logger) this.logger.warn(`❌ Failed to purchase item: ${itemId}`);
    }
};

// Sell item from RPG shop (declarative version)
CyberOpsGame.prototype.sellRPGItem = function(shopId, itemId) {
    if (!this._selectedAgent) {
        if (this.logger) this.logger.warn('No agent selected for selling');
        return;
    }

    const agentId = this._selectedAgent.id || this._selectedAgent.name;

    // Get item from inventory
    const inventory = this.inventoryManager?.getInventory(agentId) || [];
    const item = inventory.find(i => i.id === itemId);

    if (!item) {
        if (this.logger) this.logger.warn(`Item not found in inventory: ${itemId}`);
        return;
    }

    // Calculate sell price (50% of value)
    const sellPrice = Math.floor((item.value || 0) * 0.5);

    // Remove from inventory
    const removed = this.inventoryManager?.removeItem(agentId, itemId);

    if (removed) {
        // Add credits to agent
        if (this._selectedAgent.rpgEntity) {
            this._selectedAgent.rpgEntity.credits = (this._selectedAgent.rpgEntity.credits || 0) + sellPrice;
        } else {
            this._selectedAgent.credits = (this._selectedAgent.credits || 0) + sellPrice;
        }

        if (this.logEvent) {
            this.logEvent(`Sold ${item.name} for ${sellPrice} credits`, 'shop');
        }
        if (this.logger) this.logger.info(`✅ ${this._selectedAgent.name} sold ${item.name} for ${sellPrice} credits`);

        // Refresh the dialog
        if (this.dialogEngine) {
            this.dialogEngine.stateData.shopTab = 'sell'; // Stay on sell tab
            this.dialogEngine.navigateTo('rpg-shop', null, true);
        }
    } else {
        if (this.logger) this.logger.warn(`❌ Failed to remove item from inventory: ${itemId}`);
    }
};

// Add RPG UI keyboard shortcuts
CyberOpsGame.prototype.setupRPGKeyboardShortcuts = function() {
    // RPG keyboard shortcuts are now handled in game-keyboard.js
    // This function is kept for compatibility but no longer needed
    if (this.logger) this.logger.debug('🎮 RPG keyboard shortcuts already configured in game-keyboard.js');
};

// Initialize RPG UI when game starts
const _originalInitRPG = CyberOpsGame.prototype.initRPGSystem;
CyberOpsGame.prototype.initRPGSystem = function() {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('GameRpgUi') : null;
    }
    // Call original
    if (_originalInitRPG) {
        _originalInitRPG.call(this);
    }

    // Setup UI
    this.setupRPGKeyboardShortcuts();

    // Override level up to show notification
    const originalLevelUp = this.rpgManager?.levelUp;
    if (this.rpgManager && originalLevelUp) {
        this.rpgManager.levelUp = function(entity) {
            originalLevelUp.call(this, entity);

            // Find agent and show notification
            const agent = game.agents.find(a => a.rpgEntity === entity);
            if (agent) {
                game.showLevelUpNotification(agent);
            }
        };
    }
};

// Show skill tree dialog (declarative version)
CyberOpsGame.prototype.showSkillTree = function(agentId) {
    if (this.logger) this.logger.debug(`🎯 showSkillTree called with agentId: ${agentId} (type: ${typeof agentId})`);

    // Store agentId in state data for the dialog
    if (this.dialogEngine) {
        this.dialogEngine.stateData = this.dialogEngine.stateData || {};
        this.dialogEngine.stateData.agentId = agentId;
        if (this.logger) this.logger.debug(`🎯 Set dialogEngine.stateData.agentId to: ${agentId}`);
        this.dialogEngine.navigateTo('skill-tree');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available');
    }
};

// Learn a skill for an agent (uses unidirectional flow through RPGManager)
CyberOpsGame.prototype.learnSkill = function(agentId, skillId) {
    if (this.logger) {
        this.logger.debug(`🎓 learnSkill called: agentId=${agentId}, skillId=${skillId}`);
    }

    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.rpgEntity) {
        if (this.logger) this.logger.error(`❌ Cannot learn skill - agent not found: ${agentId}`);
        return false;
    }

    if (this.logger) {
        this.logger.debug(`🎓 Found agent: ${agent.name}, originalId=${agent.originalId}, id=${agent.id}`);
        this.logger.debug(`🎓 Agent rpgEntity: ${JSON.stringify({
            availableSkillPoints: agent.rpgEntity?.availableSkillPoints,
            skills: agent.rpgEntity?.skills
        })}`);
    }

    // UNIDIRECTIONAL FLOW: Game → RPGManager → Entity
    // Use RPGManager to learn skill (service manages the data)
    if (this.rpgManager && this.rpgManager.learnSkill) {
        const entityId = agent.originalId || agent.id || agent.name;
        if (this.logger) this.logger.debug(`🎓 Using entityId: ${entityId}`);
        const success = this.rpgManager.learnSkill(entityId, skillId);

        if (success) {
            // Apply skill effects to agent (game-level effects only)
            const rpgConfig = this.getRPGConfig ? this.getRPGConfig() : null;
            const skillConfig = rpgConfig?.skills?.[skillId];
            if (skillConfig) {
                this.applyPassiveSkillEffects(agent, skillId, skillConfig);
            }

            // Log the event
            if (this.logEvent) {
                this.logEvent(`${agent.name} learned ${skillConfig?.name || skillId}`, 'system');
            }
        } else {
            // RPGManager will have logged the specific reason for failure
            if (this.logEvent) {
                this.logEvent(`${agent.name} cannot learn skill`, 'system');
            }
        }

        return success;
    } else {
        if (this.logger) this.logger.error('RPGManager not available for skill learning');
        return false;
    }
};

// Apply skill effects
// Apply passive skill effects (stat bonuses) - used for character sheet
CyberOpsGame.prototype.applyPassiveSkillEffects = function(agent, skillId, skillConfig) {
    if (!agent.rpgEntity || !skillConfig) return;

    const skillLevel = agent.rpgEntity.skills?.[skillId] || 0;
    if (skillLevel === 0) return;

    const effect = skillConfig.effect;
    const perLevel = skillConfig.perLevel || 1;
    const totalEffect = skillLevel * perLevel;

    // Apply different effects based on skill type
    switch (effect) {
        case 'damage':
            agent.damageBonus = (agent.damageBonus || 0) + perLevel;
            break;
        case 'accuracy':
            agent.accuracyBonus = (agent.accuracyBonus || 0) + perLevel;
            break;
        case 'defense':
            agent.defenseBonus = (agent.defenseBonus || 0) + perLevel;
            break;
        case 'health':
            agent.maxHealth = (agent.maxHealth || agent.health) + perLevel;
            agent.health = Math.min(agent.health + perLevel, agent.maxHealth);
            break;
        case 'speed':
            agent.speed = (agent.speed || 0.2) + (perLevel * 0.01);
            break;
        case 'detection':
            agent.detectionRadius = (agent.detectionRadius || 10) + perLevel;
            break;
    }

    if (this.logger) {
        this.logger.debug(`Applied ${skillConfig.name} effect: +${totalEffect} ${effect} to ${agent.name}`);
    }
};

// Show perk selection dialog
CyberOpsGame.prototype.showPerkSelection = function(agentId) {
    if (this.logger) this.logger.debug('⭐ showPerkSelection - routing to declarative perk-selection state');

    // Use the declarative dialog system
    if (this.dialogEngine && this.dialogEngine.navigateTo) {
        // Store agentId in state data for the declarative generator
        this.dialogEngine.stateData = this.dialogEngine.stateData || {};
        this.dialogEngine.stateData.agentId = agentId;
        this.dialogEngine.navigateTo('perk-selection');
    } else {
        if (this.logger) this.logger.error('Dialog engine not available for perk selection');
    }
};

// Use health pack
CyberOpsGame.prototype.useHealthPack = function(agentId) {
    const agent = this.findAgentForRPG(agentId);
    if (!agent) return;

    // Check if agent has health packs
    const healthPack = agent.inventory?.find(item => item.type === 'consumable' && item.subtype === 'health');
    if (!healthPack) {
        if (this.logEvent) {
            this.logEvent(`${agent.name} has no health packs!`, 'error');
        }
        return;
    }

    // Use the health pack
    const healAmount = healthPack.healAmount || 50;
    agent.health = Math.min(agent.health + healAmount, agent.maxHealth);

    // Remove from inventory
    const index = agent.inventory.indexOf(healthPack);
    if (index > -1) {
        agent.inventory.splice(index, 1);
    }

    if (this.logEvent) {
        this.logEvent(`${agent.name} used a health pack (+${healAmount} HP)`, 'combat');
    }

    // Refresh UI if character sheet is open
    const dialog = document.querySelector('.rpg-character-sheet');
    if (dialog) {
        // Set selected agent and open character sheet
        this.selectedAgent = (this.agents && this.agents.find(a => a.id === agentId || a.name === agentId)) ||
                             (this.activeAgents && this.activeAgents.find(a => a.id === agentId || a.name === agentId));
        if (this.dialogEngine && this.dialogEngine.navigateTo) {
            this.dialogEngine.navigateTo('character');
        }
    }
};

// Drop item from inventory
CyberOpsGame.prototype.dropItem = function(agentId, itemId) {
    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.inventory) return;

    const itemIndex = agent.inventory.findIndex(item => item.id === itemId);
    if (itemIndex > -1) {
        const item = agent.inventory[itemIndex];
        agent.inventory.splice(itemIndex, 1);

        if (this.logEvent) {
            this.logEvent(`${agent.name} dropped ${item.name}`, 'inventory');
        }

        // Refresh UI if character sheet is open
        const dialog = document.querySelector('.rpg-character-sheet');
        if (dialog) {
            this.showCharacterSheet(agentId);
        }
    }
};

// Use item from inventory
CyberOpsGame.prototype.useItem = function(agentId, itemId) {
    const agent = this.findAgentForRPG(agentId);
    if (!agent || !agent.inventory) return;

    const item = agent.inventory.find(i => i.id === itemId);
    if (!item) return;

    // Handle different item types
    if (item.type === 'consumable') {
        if (item.subtype === 'health') {
            this.useHealthPack(agentId);
        } else {
            if (this.logEvent) {
                this.logEvent(`${agent.name} used ${item.name}`, 'inventory');
            }
            // Remove consumable after use
            const index = agent.inventory.indexOf(item);
            if (index > -1) {
                agent.inventory.splice(index, 1);
            }
        }
    } else {
        if (this.logEvent) {
            this.logEvent(`Cannot use ${item.name} - not a consumable`, 'error');
        }
    }

    // Refresh UI if character sheet is open
    const dialog = document.querySelector('.rpg-character-sheet');
    if (dialog) {
        // Set selected agent and open character sheet
        this.selectedAgent = (this.agents && this.agents.find(a => a.id === agentId || a.name === agentId)) ||
                             (this.activeAgents && this.activeAgents.find(a => a.id === agentId || a.name === agentId));
        if (this.dialogEngine && this.dialogEngine.navigateTo) {
            this.dialogEngine.navigateTo('character');
        }
    }
};

if (this.logger) this.logger.info('🎮 RPG UI System loaded');