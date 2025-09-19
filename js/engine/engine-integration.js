/**
 * Engine Integration
 * Connects the flexible content system with the existing game engine
 * This is the bridge between old hardcoded system and new data-driven system
 */

// Engine integration is now handled by campaign-integration.js
// This file provides helper functions for campaign content


/**
 * Callback when campaign is fully loaded
 */
CyberOpsGame.prototype.onCampaignLoaded = function() {
    // Update UI with campaign strings
    this.updateUIStrings();

    // Apply campaign theme
    this.applyCampaignTheme();

    // Initialize formula service with campaign formulas
    this.initializeFormulas();

    // Trigger any campaign-specific initialization
    this.triggerCampaignEvents('init');
};


/**
 * Update UI with campaign strings
 */
CyberOpsGame.prototype.updateUIStrings = function() {
    if (!window.ContentLoader) return;

    console.log('📝 Updating UI strings from campaign...');

    // Update menu buttons
    const menuButtons = {
        'btn-new-game': 'menu.newGame',
        'btn-continue': 'menu.continue',
        'btn-options': 'menu.options',
        'btn-credits': 'menu.credits'
    };

    for (const [id, stringKey] of Object.entries(menuButtons)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = window.ContentLoader.getString(stringKey);
        }
    }

    // Update hub interface
    const hubElements = {
        'hub-title': 'hub.syndicate',
        'btn-arsenal': 'hub.arsenal',
        'btn-research': 'hub.research',
        'btn-missions': 'hub.missions'
    };

    for (const [id, stringKey] of Object.entries(hubElements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = window.ContentLoader.getString(stringKey);
        }
    }
};

/**
 * Apply campaign visual theme
 */
CyberOpsGame.prototype.applyCampaignTheme = function() {
    const campaign = window.ContentLoader?.currentCampaign;
    if (!campaign?.ui) return;

    console.log('🎨 Applying campaign theme:', campaign.ui.theme);

    // Apply color scheme
    const root = document.documentElement;
    if (campaign.ui.primaryColor) {
        root.style.setProperty('--primary-color', campaign.ui.primaryColor);
    }
    if (campaign.ui.secondaryColor) {
        root.style.setProperty('--secondary-color', campaign.ui.secondaryColor);
    }
    if (campaign.ui.dangerColor) {
        root.style.setProperty('--danger-color', campaign.ui.dangerColor);
    }
    if (campaign.ui.successColor) {
        root.style.setProperty('--success-color', campaign.ui.successColor);
    }

    // Apply theme class
    document.body.className = `theme-${campaign.ui.theme || 'cyberpunk'}`;
};

/**
 * Initialize formulas from campaign
 */
CyberOpsGame.prototype.initializeFormulas = function() {
    const combat = window.ContentLoader?.getContent('combat');
    if (!combat || !this.gameServices?.formulaService) return;

    console.log('⚔️ Initializing campaign formulas...');

    // Override formula service with campaign settings
    const formulaService = this.gameServices.formulaService;

    // Store original calculate damage
    const originalCalculateDamage = formulaService.calculateDamage;

    // Enhanced damage calculation using campaign config
    formulaService.calculateDamage = function(baseDamage, weaponDamage, bonus, armor, modifiers = {}) {
        // Get campaign combat config
        const combatConfig = window.ContentLoader?.getContent('combat');

        if (combatConfig) {
            // Apply campaign variance
            const variance = combatConfig.damageVariance || 0;
            const varianceMultiplier = 1 + (Math.random() * variance * 2 - variance);

            // Apply campaign armor effectiveness
            const armorEffectiveness = combatConfig.armorEffectiveness || 1;
            const effectiveArmor = armor * armorEffectiveness;

            // Apply campaign modifiers
            let totalDamage = (baseDamage + weaponDamage + bonus) * varianceMultiplier;

            // Apply cover bonus if in cover
            if (modifiers.inCover && combatConfig.coverBonus) {
                totalDamage *= (1 - combatConfig.coverBonus);
            }

            // Apply flanking bonus
            if (modifiers.flanking && combatConfig.flankingBonus) {
                totalDamage *= combatConfig.flankingBonus;
            }

            // Apply armor
            totalDamage -= effectiveArmor;

            return Math.max(1, Math.round(totalDamage));
        }

        // Fallback to original
        return originalCalculateDamage.call(this, baseDamage, weaponDamage, bonus, armor, modifiers);
    };
};

/**
 * Get string from campaign with fallback
 */
CyberOpsGame.prototype.getString = function(key, params) {
    // Try campaign strings first
    if (window.ContentLoader) {
        const str = window.ContentLoader.getString(key, params);
        if (str !== key) return str; // Found a translation
    }

    // Fallback to hardcoded strings
    const fallbacks = {
        'mission.complete': 'Mission Complete!',
        'mission.failed': 'Mission Failed',
        'agent.down': params?.agent + ' has been eliminated!',
        'agent.levelUp': params?.agent + ' reached level ' + params?.level
    };

    return fallbacks[key] || key;
};


/**
 * Calculate mission rewards using campaign config
 */
CyberOpsGame.prototype.calculateMissionRewards = function(objectives, enemies) {
    const economy = window.ContentLoader?.getContent('economy');
    if (!economy?.missionRewards) {
        // Use legacy calculation
        return {
            credits: 1000 + (objectives * 500) + (enemies * 100),
            research: 50 + (objectives * 25),
            xp: 100 + (objectives * 50) + (enemies * 25)
        };
    }

    // Use campaign reward formulas
    const rewards = economy.missionRewards;
    return {
        credits: rewards.credits.base +
                (objectives * rewards.credits.perObjective) +
                (enemies * rewards.credits.perEnemy),
        research: rewards.research.base +
                 (objectives * rewards.research.perObjective),
        xp: rewards.xp.base +
            (objectives * rewards.xp.perObjective) +
            (enemies * rewards.xp.perEnemy)
    };
};

/**
 * Trigger campaign-specific events
 */
CyberOpsGame.prototype.triggerCampaignEvents = function(eventType, data) {
    const campaign = window.ContentLoader?.currentCampaign;
    if (!campaign) return;

    // Check for campaign event handlers
    if (campaign.events && campaign.events[eventType]) {
        const handler = campaign.events[eventType];
        if (typeof handler === 'function') {
            handler.call(this, data);
        }
    }

    // Check for milestone completion
    if (eventType === 'enemyKilled' && campaign.progression?.milestones) {
        this.checkMilestones('combat', data);
    }
};

/**
 * Check milestone completion
 */
CyberOpsGame.prototype.checkMilestones = function(category, data) {
    const milestones = window.ContentLoader?.getContent('progression')?.milestones;
    if (!milestones) return;

    milestones.forEach(milestone => {
        if (milestone.completed) return;

        // Check milestone conditions
        let completed = false;
        switch (milestone.id) {
            case 'firstBlood':
                completed = this.totalEnemiesKilled >= 1;
                break;
            case 'hacker':
                completed = this.totalTerminalsHacked >= 10;
                break;
            case 'survivor':
                completed = this.missionsWithoutLoss >= 5;
                break;
        }

        if (completed) {
            milestone.completed = true;
            this.onMilestoneComplete(milestone);
        }
    });
};

/**
 * Handle milestone completion
 */
CyberOpsGame.prototype.onMilestoneComplete = function(milestone) {
    console.log('🏆 Milestone complete:', milestone.name);

    // Show notification
    const message = window.ContentLoader.getString('messages.milestoneComplete', { milestone: milestone.name });
    if (this.showNotification) {
        this.showNotification(message, 'success');
    }

    // Grant rewards
    if (milestone.reward) {
        if (milestone.reward.credits) {
            this.credits += milestone.reward.credits;
        }
        if (milestone.reward.research) {
            this.researchPoints += milestone.reward.research;
        }
        if (milestone.reward.item) {
            this.addItem(milestone.reward.item);
        }
    }
};

console.log('✅ Engine integration loaded - campaigns can now override all content');