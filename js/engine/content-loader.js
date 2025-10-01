/**
 * Dynamic Content Loader
 * Loads campaign content into engine systems dynamically
 * Engine remains pure mechanics, all content comes from campaigns
 */

class ContentLoader {
    constructor() {
        this.currentCampaign = null;
        this.contentCache = new Map();
        this.formulas = new Map();
        this.strings = {};
    }

    /**
     * Load a campaign into the engine
     * @param {Object} campaign - Campaign data
     * @param {Object} game - Game instance
     * @returns {Promise<boolean>} Success status
     */
    async loadCampaign(campaign, game) {
        if (logger) logger.debug('📦 Loading campaign:', campaign.metadata?.name || 'Unknown');

        // Validate campaign first
        const validation = window.CampaignContentInterface.validateCampaign(campaign);
        if (!validation.valid) {
            if (logger) logger.error('❌ Campaign validation failed:', validation.errors);
            return false;
        }

        if (validation.warnings.length > 0) {
            if (logger) logger.warn('⚠️ Campaign warnings:', validation.warnings);
        }

        // Merge with defaults
        this.currentCampaign = window.CampaignContentInterface.mergeCampaignWithDefaults(campaign);

        // Load content into engine systems
        try {
            // 1. Load RPG configuration
            this.loadRPGConfig(game);

            // 2. Load agents
            this.loadAgents(game);

            // 3. Load weapons and equipment
            this.loadEquipment(game);

            // 4. Load enemies
            this.loadEnemies(game);

            // 5. Load economy settings
            this.loadEconomy(game);

            // 6. Load combat formulas
            this.loadCombatFormulas(game);

            // 7. Load UI strings
            this.loadUIStrings(game);

            // 8. Load audio configuration
            this.loadAudioConfig(game);

            // 9. Load progression system
            this.loadProgression(game);

            // 10. Load agent generation config
            this.loadAgentGeneration(game);

            if (logger) logger.info('✅ Campaign loaded successfully');
            return true;

        } catch (error) {
            if (logger) logger.error('❌ Error loading campaign:', error);
            return false;
        }
    }

    /**
     * Load RPG configuration from campaign
     */
    loadRPGConfig(game) {
        if (!this.currentCampaign.rpgConfig) {
            console.error('❌ [ContentLoader] Campaign has NO rpgConfig!');
            return;
        }

        console.log('🎮 [ContentLoader] Loading RPG configuration...');
        console.log('🎮 [ContentLoader] rpgConfig has perks:', !!this.currentCampaign.rpgConfig.perks);
        console.log('🎮 [ContentLoader] Number of perks:', Object.keys(this.currentCampaign.rpgConfig.perks || {}).length);
        console.log('🔍 [ContentLoader] rpgConfig has shops:', !!this.currentCampaign.rpgConfig.shops);
        console.log('🔍 [ContentLoader] rpgConfig keys:', Object.keys(this.currentCampaign.rpgConfig));

        // Set RPG_CONFIG globally for backward compatibility with game-rpg-system.js
        window.RPG_CONFIG = this.currentCampaign.rpgConfig;
        console.log('✅ [ContentLoader] window.RPG_CONFIG set globally');
        console.log('✅ [ContentLoader] window.RPG_CONFIG.perks has keys:', Object.keys(window.RPG_CONFIG.perks || {}).length);

        // Also inject into services for proper architecture
        if (window.GameServices?.rpgService) {
            window.GameServices.rpgService.setConfig(this.currentCampaign.rpgConfig);
        }

        // Make config available to RPG systems
        if (game.rpgManager) {
            game.rpgManager.loadConfig(this.currentCampaign.rpgConfig);
        }

        // Store for reference
        this.contentCache.set('rpgConfig', this.currentCampaign.rpgConfig);
        console.log('✅ [ContentLoader] rpgConfig stored in contentCache');

        // TEST: Verify we can read it back
        const testRead = this.contentCache.get('rpgConfig');
        console.log('✅ [ContentLoader] Test read from cache - perks count:', Object.keys(testRead?.perks || {}).length);
    }

    /**
     * Load agents from campaign
     */
    loadAgents(game) {
        if (!this.currentCampaign.agents) return;

        if (logger) logger.debug(`👥 Loading ${this.currentCampaign.agents.length} agents...`);

        // Load agents into service
        const agentService = window.GameServices?.agentService;
        if (agentService) {
            // Process campaign agents to proper format
            const agents = this.currentCampaign.agents.map(agentData =>
                this.createAgentFromData(agentData)
            );

            // Use AgentService.initialize which properly handles hired flag
            agentService.initialize(agents);

            // Store for reference (both active and available)
            this.contentCache.set('agents', [
                ...agentService.getActiveAgents(),
                ...agentService.getAvailableAgents()
            ]);
        }
    }

    /**
     * Create agent object from campaign data
     */
    createAgentFromData(data) {
        return {
            id: data.id,
            name: data.name,
            portrait: data.portrait || 'default',
            specialization: data.specialization || data.class || 'soldier',  // Support both fields
            health: data.health || 100,
            maxHealth: data.maxHealth || data.health || 100,
            damage: data.damage || 10,
            speed: data.speed || 5,
            protection: data.protection || 0,
            class: data.class || data.specialization || 'soldier',
            cost: data.cost || data.hiringCost || 1000,  // Support both 'cost' and 'hiringCost'
            hired: data.hired || false,  // Respect campaign's hired flag
            alive: data.alive !== undefined ? data.alive : true,
            backstory: data.backstory || data.bio || '',  // Support both 'backstory' and 'bio'
            bio: data.bio || data.backstory || '',  // Also support bio field

            // RPG stats if defined
            stats: data.stats || {},
            skills: data.skills || [],
            level: data.level || 1,
            experience: data.experience || 0,

            // Equipment slots
            equipment: {
                primary: null,
                secondary: null,
                armor: null,
                utility: null
            },

            // Dynamic properties
            x: 0,
            y: 0,
            selected: false,
            path: null
        };
    }

    /**
     * Load weapons and equipment
     */
    loadEquipment(game) {
        if (logger) logger.debug('🔫 Loading equipment...');

        const inventoryService = window.GameServices?.inventoryService;
        if (inventoryService) {
            // Load weapons
            if (this.currentCampaign.weapons) {
                const weapons = this.currentCampaign.weapons.map(w => ({
                    ...w,
                    owned: w.owned || 0,
                    equipped: w.equipped || 0
                }));
                inventoryService.initialize({ weapons });
                this.contentCache.set('weapons', weapons);
            }

            // Load equipment
            if (this.currentCampaign.equipment) {
                const equipment = this.currentCampaign.equipment.map(e => ({
                    ...e,
                    owned: e.owned || 0,
                    equipped: e.equipped || 0
                }));
                inventoryService.initialize({ equipment });
                this.contentCache.set('equipment', equipment);
            }
        }
    }

    /**
     * Load enemy definitions
     */
    loadEnemies(game) {
        if (!this.currentCampaign.enemies) return;

        if (logger) logger.debug('👹 Loading enemy types...');

        game.enemyTypes = {};

        this.currentCampaign.enemies.forEach(enemy => {
            game.enemyTypes[enemy.id] = {
                name: enemy.name,
                health: enemy.health,
                damage: enemy.damage,
                speed: enemy.speed || 2,
                detection: enemy.detection || 150,
                xpReward: enemy.xpReward || 50,
                creditReward: enemy.creditReward || 100,

                // Visual properties
                color: enemy.color || '#ff0000',
                size: enemy.size || 'medium',

                // AI behavior
                behavior: enemy.behavior || 'aggressive',
                patrolRoute: enemy.patrolRoute || null,

                // RPG stats if any
                stats: enemy.stats || {}
            };
        });

        // Also set campaignEnemyTypes for backward compatibility with spawnMissionEnemies
        game.campaignEnemyTypes = this.currentCampaign.enemies;
        if (logger) logger.info(`✅ Set campaignEnemyTypes: ${game.campaignEnemyTypes.length} enemy types`);

        this.contentCache.set('enemyTypes', game.enemyTypes);
    }

    /**
     * Load economy settings
     */
    loadEconomy(game) {
        const economy = this.currentCampaign.economy;
        if (!economy) return;

        if (logger) logger.debug('💰 Loading economy configuration...');

        const resourceService = window.GameServices?.resourceService;
        if (resourceService) {
            resourceService.setCredits(economy.startingCredits || 5000);
            resourceService.setResearchPoints(economy.startingResearchPoints || 100);
        }

        // These can stay as game properties since they're config, not state
        game.sellValueMultiplier = economy.sellValueMultiplier || 0.5;
        game.repairCostMultiplier = economy.repairCostMultiplier || 0.3;

        // Store economy rules
        this.contentCache.set('economy', economy);
    }

    /**
     * Load combat formulas from campaign
     */
    loadCombatFormulas(game) {
        // Use campaign combat config if available, otherwise use defaults
        const combat = this.currentCampaign?.combat || { formulaSet: 'standard' };
        if (!combat && !this.currentCampaign) {
            // If no campaign at all, just set up standard formulas
            this.formulas.set('damage', this.standardDamageFormula.bind(this));
            this.formulas.set('hitChance', this.standardHitFormula.bind(this));
            this.formulas.set('critical', this.standardCriticalFormula.bind(this));
            return;
        }

        if (logger) logger.debug('⚔️ Loading combat formulas...');

        // Load formula set
        const formulaSet = combat.formulaSet || 'standard';

        // Define formula functions based on set
        switch (formulaSet) {
            case 'standard':
                this.formulas.set('damage', this.standardDamageFormula.bind(this));
                this.formulas.set('hitChance', this.standardHitFormula.bind(this));
                this.formulas.set('critical', this.standardCriticalFormula.bind(this));
                break;

            case 'realistic':
                this.formulas.set('damage', this.realisticDamageFormula.bind(this));
                this.formulas.set('hitChance', this.realisticHitFormula.bind(this));
                this.formulas.set('critical', this.realisticCriticalFormula.bind(this));
                break;

            case 'arcade':
                this.formulas.set('damage', this.arcadeDamageFormula.bind(this));
                this.formulas.set('hitChance', this.arcadeHitFormula.bind(this));
                this.formulas.set('critical', this.arcadeCriticalFormula.bind(this));
                break;

            case 'custom':
                // Load custom formulas from campaign
                if (combat.customFormulas) {
                    this.loadCustomFormulas(combat.customFormulas);
                }
                break;
        }

        // Store combat configuration
        this.contentCache.set('combat', combat);

        // Note: FormulaService has its own formula implementations
        // These methods don't exist and aren't needed:
        // - window.GameServices.formulaService.setFormulas(this.formulas);
        // - window.GameServices.formulaService.setCombatConfig(combat);
    }

    /**
     * Standard damage formula
     */
    standardDamageFormula(attacker, target, weapon) {
        const combat = this.contentCache.get('combat');
        const baseDamage = (attacker.damage || 10) + (weapon?.damage || 0);
        const armor = target.protection || 0;
        const variance = combat?.damageVariance || 0.2;

        // Add variance
        const multiplier = 1 + (Math.random() * variance * 2 - variance);

        // Calculate final damage
        const damage = Math.max(1, (baseDamage * multiplier) - (armor * (combat?.armorEffectiveness || 1)));

        return Math.round(damage);
    }

    /**
     * Standard hit chance formula
     */
    standardHitFormula(attacker, target, distance) {
        const baseChance = 0.8;
        const agilityDiff = (attacker.agility || 10) - (target.agility || 10);
        const distancePenalty = Math.max(0, (distance - 100) / 1000);

        const hitChance = baseChance + (agilityDiff * 0.02) - distancePenalty;
        return Math.max(0.1, Math.min(0.95, hitChance));
    }

    /**
     * Standard critical formula
     */
    standardCriticalFormula(attacker) {
        const combat = this.contentCache.get('combat');
        const baseCrit = combat?.dodgeBaseChance || 0.05;
        const luckBonus = (attacker.luck || 0) * 0.01;

        return baseCrit + luckBonus;
    }

    /**
     * Realistic damage formula (more complex)
     */
    realisticDamageFormula(attacker, target, weapon) {
        // Implement realistic ballistics, armor penetration, etc.
        const combat = this.contentCache.get('combat');

        // Consider weapon type, range, armor type, hit location
        const baseDamage = weapon?.damage || 10;
        const penetration = weapon?.penetration || 1;
        const armor = target.protection || 0;

        // Complex calculation
        const effectiveArmor = Math.max(0, armor - penetration);
        const damage = baseDamage * Math.exp(-effectiveArmor * 0.1);

        return Math.round(damage);
    }

    /**
     * Arcade damage formula (simpler, more predictable)
     */
    arcadeDamageFormula(attacker, target, weapon) {
        const damage = (attacker.damage || 10) + (weapon?.damage || 0);
        return damage; // No variance, no armor reduction
    }

    /**
     * Load UI strings for current language
     */
    loadUIStrings(game) {
        const ui = this.currentCampaign.ui;
        if (!ui?.strings) return;

        if (logger) logger.debug('📝 Loading UI strings...');

        // Get current language (default to 'en')
        const language = game.currentLanguage || 'en';

        // Load strings for language
        this.strings = ui.strings[language] || ui.strings['en'] || {};

        // Make strings globally accessible
        window.gameStrings = this.strings;

        // Store for reference
        this.contentCache.set('strings', this.strings);
    }

    /**
     * Load audio configuration
     */
    loadAudioConfig(game) {
        const audio = this.currentCampaign.audio;
        if (!audio) return;

        if (logger) logger.debug('🎵 Loading audio configuration...');

        // Update music config
        if (window.MUSIC_CONFIG) {
            // Update screen music paths
            if (audio.tracks) {
                if (audio.tracks.menu) {
                    window.MUSIC_CONFIG.screens.menu.tracks.main.file = audio.tracks.menu;
                }
                if (audio.tracks.hub) {
                    window.MUSIC_CONFIG.screens.hub.tracks.ambient.file = audio.tracks.hub;
                }
            }

            // Update volume settings
            if (audio.musicVolume !== undefined) {
                window.MUSIC_CONFIG.global.musicVolume = audio.musicVolume;
            }
            if (audio.sfxVolume !== undefined) {
                window.MUSIC_CONFIG.global.sfxVolume = audio.sfxVolume;
            }
        }

        this.contentCache.set('audio', audio);
    }

    /**
     * Load progression system
     */
    loadProgression(game) {
        const progression = this.currentCampaign.progression;
        if (!progression) return;

        if (logger) logger.debug('📈 Loading progression system...');

        // Load research tree
        if (progression.researchTree && window.GameServices?.researchService) {
            // Note: ResearchService doesn't have loadTree method
            // Research tree loaded via legacy path instead
            // window.GameServices.researchService.loadTree(progression.researchTree);
        }

        // Load unlock schedule
        if (progression.unlockSchedule) {
            game.unlockSchedule = progression.unlockSchedule;
        }

        // Load milestones
        if (progression.milestones) {
            game.milestones = progression.milestones;
        }

        this.contentCache.set('progression', progression);
    }

    /**
     * Load agent generation configuration
     */
    loadAgentGeneration(game) {
        const agentGen = this.currentCampaign.agentGeneration;
        if (!agentGen) return;

        if (logger) logger.debug('👥 Loading agent generation configuration...');

        // Set on game object for mission completion
        game.agentGeneration = agentGen;

        // Store for reference
        this.contentCache.set('agentGeneration', agentGen);
    }

    /**
     * Get a string by key with fallback
     */
    getString(key, params = {}) {
        // Navigate nested keys (e.g., "menu.newGame")
        const keys = key.split('.');
        let value = this.strings;

        for (const k of keys) {
            value = value?.[k];
            if (!value) break;
        }

        // Fallback to key if not found
        if (!value) {
            if (logger) logger.warn(`String not found: ${key}`);
            return key;
        }

        // Replace parameters (e.g., {agent} with actual value)
        if (typeof value === 'string' && params) {
            for (const [param, val] of Object.entries(params)) {
                value = value.replace(`{${param}}`, val);
            }
        }

        return value;
    }

    /**
     * Get current campaign metadata
     */
    getCampaignMetadata() {
        return this.currentCampaign?.metadata || null;
    }

    /**
     * Get cached content by type
     */
    getContent(type) {
        return this.contentCache.get(type);
    }
}

// Create global instance
window.ContentLoader = new ContentLoader();