/**
 * game-rpg-ui.js
 * UI components for the RPG system
 * Includes character sheet, inventory, leveling, and shops
 */

// Character Sheet UI
CyberOpsGame.prototype.showCharacterSheet = function(agentIdOrName) {
    console.log('showCharacterSheet called with:', agentIdOrName);

    // Find agent by ID or name
    let agent;
    if (typeof agentIdOrName === 'string') {
        agent = this.agents.find(a => a.id === agentIdOrName || a.name === agentIdOrName);
    } else {
        agent = agentIdOrName;
    }

    if (!agent) {
        console.warn('Agent not found:', agentIdOrName);
        return;
    }

    // Initialize RPG entity if not present
    if (!agent.rpgEntity) {
        console.log('Creating RPG entity for agent:', agent.name);
        if (this.rpgManager) {
            agent.rpgEntity = this.rpgManager.createRPGAgent(agent, agent.class || 'soldier');
        } else {
            console.warn('RPG manager not initialized');
            return;
        }
    }

    const rpg = agent.rpgEntity;
    const derived = this.rpgManager.calculateDerivedStats(rpg);

    // Create character sheet dialog
    const dialog = document.createElement('div');
    dialog.className = 'character-sheet'; // Remove hud-dialog class that hides it
    dialog.innerHTML = `
        <div class="dialog-header">
            <h2>${agent.name} - Level ${rpg.level || 1} ${rpg.class || 'Soldier'}</h2>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>

        <div class="dialog-content">
            <div class="stats-panel">
                <h3>Primary Stats</h3>
                <div class="stat-list">
                    ${this.renderStatList(rpg.stats)}
                </div>

                ${rpg.unspentStatPoints > 0 ? `
                <div class="stat-points-available">
                    <span>${rpg.unspentStatPoints} stat points available</span>
                    <button onclick="game.showStatAllocation('${agent.id || agent.name}')">Allocate</button>
                </div>
                ` : ''}
            </div>

            <div class="derived-panel">
                <h3>Derived Stats</h3>
                <div class="derived-list">
                    <div class="derived-stat">
                        <span>Max Health:</span>
                        <span>${derived.maxHealth}</span>
                    </div>
                    <div class="derived-stat">
                        <span>Max AP:</span>
                        <span>${derived.maxAP}</span>
                    </div>
                    <div class="derived-stat">
                        <span>Crit Chance:</span>
                        <span>${derived.critChance.toFixed(1)}%</span>
                    </div>
                    <div class="derived-stat">
                        <span>Dodge:</span>
                        <span>${derived.dodge.toFixed(1)}%</span>
                    </div>
                    <div class="derived-stat">
                        <span>Carry Weight:</span>
                        <span>${derived.carryWeight} kg</span>
                    </div>
                </div>
            </div>

            <div class="xp-panel">
                <h3>Experience</h3>
                <div class="xp-bar">
                    <div class="xp-fill" style="width: ${this.calculateXPPercent(rpg)}%"></div>
                    <span class="xp-text">${rpg.experience || 0} / ${this.rpgManager.experienceTable[rpg.level + 1]} XP</span>
                </div>
            </div>

            <div class="skills-panel">
                <h3>Skills</h3>
                <div class="skill-list">
                    ${this.renderSkillList(rpg.skills || [])}
                </div>

                ${rpg.unspentSkillPoints > 0 ? `
                <div class="skill-points-available">
                    <span>${rpg.unspentSkillPoints} skill points available</span>
                    <button onclick="game.showSkillTree('${agent.id || agent.name}')">Learn Skills</button>
                </div>
                ` : ''}
            </div>

            <div class="perks-panel">
                <h3>Perks</h3>
                <div class="perk-list">
                    ${this.renderPerkList(rpg.perks || [])}
                </div>

                ${rpg.unspentPerkPoints > 0 ? `
                <div class="perk-points-available">
                    <span>${rpg.unspentPerkPoints} perk points available</span>
                    <button onclick="game.showPerkSelection('${agent.id || agent.name}')">Choose Perks</button>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
};

// Render stat list
CyberOpsGame.prototype.renderStatList = function(stats) {
    if (!stats) return '<div>No stats available</div>';

    console.log('Rendering stats:', stats);

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
            console.warn(`Stat ${stat} has non-numeric value:`, value);
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
        const skill = window.RPG_CONFIG?.skills?.[skillId];
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
        const perk = window.RPG_CONFIG?.perks?.[perkId];
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
    const currentRequired = this.rpgManager.experienceTable[currentLevel] || 0;
    const nextRequired = this.rpgManager.experienceTable[currentLevel + 1] || 1000;

    const levelXP = currentXP - currentRequired;
    const levelRange = nextRequired - currentRequired;

    return Math.min(100, (levelXP / levelRange) * 100);
};

// Inventory UI - Always use hub equipment system
CyberOpsGame.prototype.showInventory = function(agentIdOrName) {
    console.log('showInventory called with:', agentIdOrName);

    // Always use the hub equipment management UI for consistency
    if (this.showEquipmentManagement) {
        console.log('📦 Opening unified equipment management UI');

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
    const agent = this.agents.find(a =>
        a.id === agentIdOrName ||
        a.name === agentIdOrName ||
        a.originalId === agentIdOrName
    );
    if (!agent) {
        console.warn('Agent not found:', agentIdOrName);
        return;
    }

    // Ensure agent has RPG entity with derived stats
    if (!agent.rpgEntity) {
        console.log('Creating RPG entity for inventory owner');
        if (this.rpgManager) {
            agent.rpgEntity = this.rpgManager.createRPGAgent(agent, agent.class || 'soldier');
        }
    }

    // Get or create inventory
    let inventory = this.inventoryManager?.getInventory(agentIdOrName);
    if (!inventory && this.inventoryManager) {
        console.log('Creating inventory for agent:', agent.name);
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
        console.warn('Could not create inventory');
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
    console.log(`📦 Getting loadout for ${loadoutId}:`, loadout);

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
    const shop = this.shopManager?.shops.get(shopId);
    if (!shop) return;

    const dialog = document.createElement('div');
    dialog.className = 'hud-dialog shop-dialog';
    dialog.innerHTML = `
        <div class="dialog-header">
            <h2>${shop.name}</h2>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>

        <div class="dialog-content">
            <div class="shop-description">${shop.description || ''}</div>

            <div class="shop-tabs">
                <button class="tab-button active" onclick="game.switchShopTab(this, 'buy')">Buy</button>
                <button class="tab-button" onclick="game.switchShopTab(this, 'sell')">Sell</button>
            </div>

            <div class="shop-content">
                <div id="shop-buy" class="shop-panel">
                    <div class="shop-inventory">
                        ${this.renderShopInventory(shop.inventory)}
                    </div>
                </div>

                <div id="shop-sell" class="shop-panel" style="display: none;">
                    <div class="sell-instructions">Select items from your inventory to sell</div>
                    <div class="agent-inventory">
                        ${this.renderSellableItems()}
                    </div>
                </div>
            </div>

            <div class="shop-footer">
                <span>Your Credits: ${this._selectedAgent?.credits || 0}</span>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);
};

// Render shop inventory
CyberOpsGame.prototype.renderShopInventory = function(inventory) {
    if (!inventory || inventory.length === 0) {
        return '<div>Shop is out of stock!</div>';
    }

    return `
        <div class="shop-items">
            ${inventory.map(item => `
                <div class="shop-item">
                    <div class="item-info">
                        <span class="item-icon">${item.icon || '📦'}</span>
                        <div class="item-details">
                            <div class="item-name">${item.name}</div>
                            <div class="item-description">${item.description || ''}</div>
                            <div class="item-stats">
                                ${item.damage ? `DMG: ${item.damage} ` : ''}
                                ${item.defense ? `DEF: ${item.defense} ` : ''}
                                ${item.weight ? `${item.weight}kg` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="item-purchase">
                        <span class="item-price">${item.price} ©</span>
                        ${item.stock !== -1 ? `<span class="item-stock">Stock: ${item.stock}</span>` : ''}
                        <button onclick="game.buyItem('${item.id}', 1)">Buy</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
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
                <div>+${agent.rpgEntity.unspentStatPoints || 0} Stat Points</div>
                <div>+${agent.rpgEntity.unspentSkillPoints || 0} Skill Points</div>
                ${agent.rpgEntity.unspentPerkPoints > 0 ? `<div>+1 Perk Point</div>` : ''}
            </div>
            <button onclick="game.showCharacterSheet('${agent.id || agent.name}'); this.parentElement.parentElement.remove()">
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

// Stat allocation dialog
CyberOpsGame.prototype.showStatAllocation = function(agentId) {
    const agent = this.agents.find(a => a.id === agentId || a.name === agentId);
    if (!agent || !agent.rpgEntity) return;

    const rpg = agent.rpgEntity;
    if (rpg.unspentStatPoints <= 0) return;

    const dialog = document.createElement('div');
    dialog.className = 'hud-dialog stat-allocation';
    dialog.innerHTML = `
        <div class="dialog-header">
            <h2>Allocate Stat Points</h2>
            <button class="close-button" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>

        <div class="dialog-content">
            <div class="points-remaining">Points Remaining: <span id="points-left">${rpg.unspentStatPoints}</span></div>

            <div class="stat-allocation-list">
                ${Object.keys(rpg.stats).map(stat => `
                    <div class="stat-allocation-row">
                        <span class="stat-name">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
                        <span class="stat-current">${rpg.stats[stat]}</span>
                        <button onclick="game.allocateStat('${agentId}', '${stat}', -1)">-</button>
                        <span class="stat-change" id="change-${stat}">+0</span>
                        <button onclick="game.allocateStat('${agentId}', '${stat}', 1)">+</button>
                    </div>
                `).join('')}
            </div>

            <div class="dialog-buttons">
                <button onclick="game.confirmStatAllocation('${agentId}')">Confirm</button>
                <button onclick="this.parentElement.parentElement.remove()">Cancel</button>
            </div>
        </div>
    `;

    dialog.dataset.pendingChanges = '{}';
    document.body.appendChild(dialog);
};

// Handle stat allocation
CyberOpsGame.prototype.allocateStat = function(agentId, stat, change) {
    const dialog = document.querySelector('.stat-allocation');
    if (!dialog) return;

    const pending = JSON.parse(dialog.dataset.pendingChanges || '{}');
    const current = pending[stat] || 0;
    const newValue = current + change;

    // Check bounds
    const pointsLeft = parseInt(document.getElementById('points-left').textContent);
    if (change > 0 && pointsLeft <= 0) return;
    if (change < 0 && current <= 0) return;

    pending[stat] = Math.max(0, newValue);
    dialog.dataset.pendingChanges = JSON.stringify(pending);

    // Update UI
    document.getElementById(`change-${stat}`).textContent = `+${pending[stat]}`;

    const totalUsed = Object.values(pending).reduce((sum, val) => sum + val, 0);
    const agent = this.agents.find(a => a.id === agentId || a.name === agentId);
    document.getElementById('points-left').textContent = agent.rpgEntity.unspentStatPoints - totalUsed;
};

// Confirm stat allocation
CyberOpsGame.prototype.confirmStatAllocation = function(agentId) {
    const dialog = document.querySelector('.stat-allocation');
    if (!dialog) return;

    const agent = this.agents.find(a => a.id === agentId || a.name === agentId);
    if (!agent || !agent.rpgEntity) return;

    const pending = JSON.parse(dialog.dataset.pendingChanges || '{}');

    // Apply changes
    Object.entries(pending).forEach(([stat, points]) => {
        if (points > 0) {
            agent.rpgEntity.stats[stat] += points;
        }
    });

    // Update unspent points
    const totalUsed = Object.values(pending).reduce((sum, val) => sum + val, 0);
    agent.rpgEntity.unspentStatPoints -= totalUsed;

    // Recalculate derived stats
    const derived = this.rpgManager.calculateDerivedStats(agent.rpgEntity);
    agent.maxHealth = derived.maxHealth;
    agent.maxAP = derived.maxAP;

    // Close dialog and refresh character sheet
    dialog.remove();
    this.showCharacterSheet(agentId);

    if (this.logEvent) {
        this.logEvent(`${agent.name} allocated stat points!`, 'progression');
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

// Add RPG UI keyboard shortcuts
CyberOpsGame.prototype.setupRPGKeyboardShortcuts = function() {
    // RPG keyboard shortcuts are now handled in game-keyboard.js
    // This function is kept for compatibility but no longer needed
    console.log('🎮 RPG keyboard shortcuts already configured in game-keyboard.js');
};

// Initialize RPG UI when game starts
const _originalInitRPG = CyberOpsGame.prototype.initRPGSystem;
CyberOpsGame.prototype.initRPGSystem = function() {
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

console.log('🎮 RPG UI System loaded');