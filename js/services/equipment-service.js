/**
 * EquipmentService - Manages weapon and equipment calculations
 * Follows single responsibility and open/closed principles
 */
if (typeof EquipmentService === 'undefined') {
    var EquipmentService = class EquipmentService {
    constructor(formulaService) {
        if (!formulaService) {
            throw new Error('EquipmentService requires FormulaService - dependency injection required');
        }
        this.formulaService = formulaService;

        // Weapon definitions
        this.weapons = {
            1: {
                id: 1,
                name: 'Silenced Pistol',
                type: 'weapon',
                cost: 500,
                damage: 15,
                range: 8,
                accuracy: 0.85,
                traits: ['silent', 'lightweight']
            },
            2: {
                id: 2,
                name: 'Assault Rifle',
                type: 'weapon',
                cost: 800,
                damage: 25,
                range: 10,
                accuracy: 0.80,
                traits: ['automatic', 'versatile']
            },
            3: {
                id: 3,
                name: 'Sniper Rifle',
                type: 'weapon',
                cost: 1200,
                damage: 40,
                range: 15,
                accuracy: 0.95,
                traits: ['long_range', 'high_damage']
            },
            4: {
                id: 4,
                name: 'SMG',
                type: 'weapon',
                cost: 600,
                damage: 20,
                range: 7,
                accuracy: 0.75,
                traits: ['rapid_fire', 'mobile']
            }
        };

        // Equipment definitions
        this.equipment = {
            1: {
                id: 1,
                name: 'Body Armor',
                type: 'armor',
                cost: 300,
                protection: 10,
                speedPenalty: 0,
                traits: ['damage_reduction']
            },
            2: {
                id: 2,
                name: 'Hacking Kit',
                type: 'utility',
                cost: 400,
                hackBonus: 20,
                traits: ['tech_enhancement']
            },
            3: {
                id: 3,
                name: 'Explosives Kit',
                type: 'explosive',
                cost: 600,
                explosiveDamage: 50,
                blastRadius: 4,
                traits: ['area_damage']
            },
            4: {
                id: 4,
                name: 'Stealth Suit',
                type: 'stealth',
                cost: 800,
                stealthBonus: 25,
                speedBonus: 0,
                traits: ['detection_reduction']
            }
        };
    }

    /**
     * Get all weapons
     * @returns {Array} Array of weapons
     */
    getAllWeapons() {
        return Object.values(this.weapons);
    }

    /**
     * Get all equipment
     * @returns {Array} Array of equipment
     */
    getAllEquipment() {
        return Object.values(this.equipment);
    }

    /**
     * Get weapon by ID
     * @param {number} weaponId - Weapon ID
     * @returns {Object} Weapon object
     */
    getWeapon(weaponId) {
        return this.weapons[weaponId];
    }

    /**
     * Get equipment by ID
     * @param {number} equipmentId - Equipment ID
     * @returns {Object} Equipment object
     */
    getEquipment(equipmentId) {
        return this.equipment[equipmentId];
    }

    /**
     * Calculate best available weapon from inventory
     * @param {Array} weaponInventory - Array of {id, owned} objects
     * @returns {Object|null} Best weapon or null
     */
    getBestAvailableWeapon(weaponInventory = []) {
        let bestWeapon = null;
        let highestDamage = 0;

        weaponInventory.forEach(item => {
            if (item.owned > 0) {
                const weapon = this.getWeapon(item.id);
                if (weapon && weapon.damage > highestDamage) {
                    highestDamage = weapon.damage;
                    bestWeapon = weapon;
                }
            }
        });

        return bestWeapon;
    }

    // REMOVED: distributeWeapons method
    // Weapon distribution is now handled by the agentLoadouts system
    // Each agent's equipment is manually configured in the Arsenal/Equipment screen

    /**
     * Calculate total equipment bonuses from inventory
     * @param {Array} equipmentInventory - Array of {id, owned} objects
     * @returns {Object} Combined bonuses
     */
    calculateEquipmentBonuses(equipmentInventory = []) {
        const bonuses = {
            protection: 0,
            hackBonus: 0,
            stealthBonus: 0,
            explosiveDamage: 0,
            speedModifier: 0,
            blastRadius: 3 // Default blast radius
        };

        equipmentInventory.forEach(item => {
            if (item.owned > 0) {
                const equipment = this.getEquipment(item.id);
                if (equipment) {
                    // Stack bonuses based on quantity owned
                    const multiplier = item.owned;

                    if (equipment.protection) {
                        bonuses.protection += equipment.protection * multiplier;
                    }
                    if (equipment.hackBonus) {
                        bonuses.hackBonus += equipment.hackBonus * multiplier;
                    }
                    if (equipment.stealthBonus) {
                        bonuses.stealthBonus += equipment.stealthBonus * multiplier;
                    }
                    if (equipment.explosiveDamage) {
                        bonuses.explosiveDamage += equipment.explosiveDamage * multiplier;
                    }
                    if (equipment.blastRadius) {
                        bonuses.blastRadius = Math.max(bonuses.blastRadius, equipment.blastRadius);
                    }
                    if (equipment.speedPenalty) {
                        bonuses.speedModifier += equipment.speedPenalty * multiplier;
                    }
                    if (equipment.speedBonus) {
                        bonuses.speedModifier += equipment.speedBonus * multiplier;
                    }
                }
            }
        });

        return bonuses;
    }

    /**
     * Apply equipment to agent
     * @param {Object} agent - Agent object
     * @param {Array} weaponInventory - Weapon inventory
     * @param {Array} equipmentInventory - Equipment inventory
     * @param {Object} assignedWeapon - Pre-assigned weapon (optional)
     * @returns {Object} Modified agent
     */
    applyEquipmentToAgent(agent, weaponInventory = [], equipmentInventory = [], assignedWeapon = null) {
        // Create a copy to avoid mutation
        const modifiedAgent = { ...agent };

        // Use assigned weapon or find best available
        const weapon = assignedWeapon || this.getBestAvailableWeapon(weaponInventory);
        if (weapon) {
            modifiedAgent.weaponDamage = weapon.damage;
            modifiedAgent.weaponRange = weapon.range;
            modifiedAgent.weaponAccuracy = weapon.accuracy;
            modifiedAgent.weaponName = weapon.name;

            // Add weapon damage to base damage
            modifiedAgent.damage = (modifiedAgent.damage || 0) + weapon.damage;
        }

        // Apply equipment bonuses
        const equipmentBonuses = this.calculateEquipmentBonuses(equipmentInventory);

        modifiedAgent.protection = (modifiedAgent.protection || 0) + equipmentBonuses.protection;
        modifiedAgent.hackBonus = (modifiedAgent.hackBonus || 0) + equipmentBonuses.hackBonus;
        modifiedAgent.stealthBonus = (modifiedAgent.stealthBonus || 0) + equipmentBonuses.stealthBonus;
        modifiedAgent.explosiveDamage = (modifiedAgent.explosiveDamage || 0) + equipmentBonuses.explosiveDamage;
        modifiedAgent.blastRadius = equipmentBonuses.blastRadius;

        // Apply speed modifiers
        if (equipmentBonuses.speedModifier !== 0) {
            modifiedAgent.speed = Math.max(1, (modifiedAgent.speed || 0) + equipmentBonuses.speedModifier);
        }

        return modifiedAgent;
    }

    /**
     * Calculate purchase cost for multiple items
     * @param {Array} items - Array of {type: 'weapon'|'equipment', id, quantity}
     * @returns {number} Total cost
     */
    calculatePurchaseCost(items = []) {
        let totalCost = 0;

        items.forEach(item => {
            let itemData = null;

            if (item.type === 'weapon') {
                itemData = this.getWeapon(item.id);
            } else if (item.type === 'equipment') {
                itemData = this.getEquipment(item.id);
            }

            if (itemData) {
                totalCost += itemData.cost * (item.quantity || 1);
            }
        });

        return totalCost;
    }

    /**
     * Check if items can be afforded
     * @param {Array} items - Array of purchase items
     * @param {number} availableCredits - Available credits
     * @returns {boolean} Can afford
     */
    canAffordPurchase(items, availableCredits) {
        const cost = this.calculatePurchaseCost(items);
        return availableCredits >= cost;
    }

    /**
     * Get recommended equipment for agent specialization
     * @param {string} specialization - Agent specialization
     * @param {number} budget - Available credits
     * @returns {Array} Recommended items
     */
    getRecommendedLoadout(specialization, budget) {
        const recommendations = [];

        // Define loadout templates by specialization
        const loadoutTemplates = {
            stealth: [
                { type: 'weapon', id: 1, priority: 1 }, // Silenced Pistol
                { type: 'equipment', id: 4, priority: 1 }, // Stealth Suit
                { type: 'equipment', id: 2, priority: 2 }  // Hacking Kit
            ],
            assault: [
                { type: 'weapon', id: 2, priority: 1 }, // Assault Rifle
                { type: 'equipment', id: 1, priority: 1 }, // Body Armor
                { type: 'equipment', id: 3, priority: 2 }  // Explosives Kit
            ],
            sniper: [
                { type: 'weapon', id: 3, priority: 1 }, // Sniper Rifle
                { type: 'equipment', id: 4, priority: 2 }, // Stealth Suit
                { type: 'equipment', id: 1, priority: 3 }  // Body Armor
            ],
            hacker: [
                { type: 'weapon', id: 4, priority: 2 }, // SMG
                { type: 'equipment', id: 2, priority: 1 }, // Hacking Kit
                { type: 'equipment', id: 4, priority: 2 }  // Stealth Suit
            ],
            demolition: [
                { type: 'weapon', id: 2, priority: 2 }, // Assault Rifle
                { type: 'equipment', id: 3, priority: 1 }, // Explosives Kit
                { type: 'equipment', id: 1, priority: 1 }  // Body Armor
            ]
        };

        const template = loadoutTemplates[specialization] || loadoutTemplates.assault;

        // Sort by priority
        template.sort((a, b) => a.priority - b.priority);

        // Add items within budget
        let remainingBudget = budget;
        template.forEach(item => {
            const cost = this.calculatePurchaseCost([{ ...item, quantity: 1 }]);
            if (cost <= remainingBudget) {
                recommendations.push(item);
                remainingBudget -= cost;
            }
        });

        return recommendations;
    }

    /**
     * Calculate equipment effectiveness score
     * @param {Object} agent - Agent with equipment
     * @param {string} missionType - Type of mission
     * @returns {number} Effectiveness score (0-100)
     */
    calculateEffectivenessScore(agent, missionType = 'combat') {
        let score = 50; // Base score

        // Mission type bonuses
        const missionBonuses = {
            combat: {
                damage: 1.5,
                protection: 1.0,
                stealth: 0.5,
                hacking: 0.3
            },
            stealth: {
                damage: 0.5,
                protection: 0.7,
                stealth: 2.0,
                hacking: 1.0
            },
            hacking: {
                damage: 0.3,
                protection: 0.5,
                stealth: 1.0,
                hacking: 2.0
            },
            demolition: {
                damage: 1.5,
                protection: 1.0,
                stealth: 0.3,
                hacking: 0.5,
                explosive: 2.0
            }
        };

        const bonuses = missionBonuses[missionType] || missionBonuses.combat;

        // Calculate score based on equipment
        if (agent.damage) {
            score += Math.min(20, agent.damage / 5 * bonuses.damage);
        }
        if (agent.protection) {
            score += Math.min(15, agent.protection / 2 * bonuses.protection);
        }
        if (agent.stealthBonus) {
            score += Math.min(15, agent.stealthBonus / 5 * bonuses.stealth);
        }
        if (agent.hackBonus) {
            score += Math.min(15, agent.hackBonus / 5 * bonuses.hacking);
        }
        if (agent.explosiveDamage && bonuses.explosive) {
            score += Math.min(20, agent.explosiveDamage / 10 * bonuses.explosive);
        }

        return Math.min(100, Math.floor(score));
    }

    /**
     * Get equipment upgrade path
     * @param {Object} currentEquipment - Current equipment state
     * @returns {Array} Suggested upgrades in order
     */
    getUpgradePath(currentEquipment) {
        const upgrades = [];

        // Check what's missing or could be upgraded
        if (!currentEquipment.weapon || currentEquipment.weapon.damage < 25) {
            upgrades.push({
                type: 'weapon',
                current: currentEquipment.weapon,
                suggested: this.getWeapon(2), // Assault Rifle
                reason: 'Increase base damage output'
            });
        }

        if (!currentEquipment.armor || currentEquipment.armor.protection < 10) {
            upgrades.push({
                type: 'armor',
                current: currentEquipment.armor,
                suggested: this.getEquipment(1), // Body Armor
                reason: 'Improve survivability'
            });
        }

        if (currentEquipment.weapon && currentEquipment.weapon.damage >= 25) {
            upgrades.push({
                type: 'weapon',
                current: currentEquipment.weapon,
                suggested: this.getWeapon(3), // Sniper Rifle
                reason: 'Maximize damage potential'
            });
        }

        return upgrades;
    }
    }; // End of EquipmentService class definition

    // Also expose on window for compatibility
    window.EquipmentService = EquipmentService;
}

// Export as singleton
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EquipmentService;
}