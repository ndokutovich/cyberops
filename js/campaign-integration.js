// Campaign Integration Layer
// Bridges the new campaign system with the existing game code

// Initialize campaign system on game start
CyberOpsGame.prototype.initCampaignSystem = async function() {
    if (this.logger) this.logger.debug('🎮 Initializing Campaign System...');

    // Initialize the campaign system
    await CampaignSystem.init();

    // Always use campaign system - no fallback
    if (this.logger) this.logger.info('✅ Using campaign system');
    await this.loadCampaignMissions();
};

// Load campaign content (agents, weapons, equipment, etc.)
CyberOpsGame.prototype.loadCampaignContent = async function(campaignId) {
    if (this.logger) this.logger.debug(`📦 Loading content for campaign: ${campaignId}`);

    // ONLY use the new flexible content loader - no fallback
    if (!window.ContentLoader || !window.CampaignSystem) {
        throw new Error('ContentLoader and CampaignSystem are required - legacy loading removed');
    }

    if (this.logger) this.logger.debug('🚀 Using flexible content loader system');

    // Get complete campaign from unified store (includes structure + content + config)
    // getCampaign throws if campaign not found (fail fast)
    const campaign = window.CampaignSystem.getCampaign(campaignId);

    // Debug: Check what we actually got
    if (this.logger) this.logger.debug(`📊 Campaign object keys: ${Object.keys(campaign).join(', ')}`);
    if (this.logger) this.logger.debug(`📊 Has agents? ${!!campaign.agents}, count: ${campaign.agents?.length || 0}`);
    if (this.logger) this.logger.debug(`📊 Has weapons? ${!!campaign.weapons}, count: ${campaign.weapons?.length || 0}`);
    if (this.logger) this.logger.debug(`📊 Has equipment? ${!!campaign.equipment}, count: ${campaign.equipment?.length || 0}`);

    // Campaign already has everything merged via registerCampaignConfig/Content
    // Just ensure required fields for ContentLoader
    const completeCampaign = {
        ...campaign,
        // Map enemyTypes to enemies for ContentLoader compatibility
        enemies: campaign.enemyTypes || campaign.enemies || [],
        // Ensure metadata exists
        metadata: campaign.metadata || {
            id: campaign.id || campaignId,
            name: campaign.name || 'Campaign',
            version: '1.0.0',
            description: campaign.description || ''
        },
        // Missions will be loaded separately by campaign system
        missions: campaign.missions || []
    };

    const success = await window.ContentLoader.loadCampaign(completeCampaign, this);

    if (!success) {
        throw new Error(`Failed to load campaign: ${campaignId}`);
    }

    if (this.logger) this.logger.info('✅ Campaign loaded via flexible system');

    // Apply starting resources if new game
    if (!this.campaignStarted) {
        const economy = window.ContentLoader.getContent('economy');
        if (economy && this.gameServices?.resourceService) {
            // Use ResourceService ONLY - campaign config is required
            if (economy.startingCredits === undefined) {
                throw new Error('Campaign config missing economy.startingCredits');
            }
            this.gameServices.resourceService.set('credits', economy.startingCredits, 'campaign start');
            this.gameServices.resourceService.set('researchPoints', economy.startingResearchPoints ?? 0, 'campaign start');
            this.gameServices.resourceService.set('worldControl', economy.startingWorldControl ?? 0, 'campaign start');
        }
        this.campaignStarted = true;
    }

    // The flexible loader already set up agents, weapons, etc.
};

// Load missions from campaign system
CyberOpsGame.prototype.loadCampaignMissions = async function() {
    const campaignId = this.currentCampaignId || 'main';

    try {
        // Load campaign content (agents, weapons, etc.) first
        await this.loadCampaignContent(campaignId);

        // Load campaign metadata
        const response = await fetch(`campaigns/${campaignId}/campaign.json`);
        const campaign = await response.json();

        // Load all mission files
        this.missions = [];
        window.CAMPAIGN_MISSIONS = window.CAMPAIGN_MISSIONS || {};

        for (const act of campaign.acts) {
            for (const missionInfo of act.missions) {
                try {
                    // Load NPCs file first if not already loaded
                    if (!window.CAMPAIGN_NPC_TEMPLATES || !window.CAMPAIGN_NPC_TEMPLATES[campaignId]) {
                        const npcScript = document.createElement('script');
                        npcScript.src = `campaigns/${campaignId}/npcs.js`;
                        await new Promise((resolve, reject) => {
                            npcScript.onload = resolve;
                            npcScript.onerror = () => {
                                if (this.logger) this.logger.warn(`No NPCs file for campaign ${campaignId}`);
                                resolve(); // Don't fail if no NPCs
                            };
                            document.head.appendChild(npcScript);
                        });
                    }

                    // Load the mission script
                    const script = document.createElement('script');
                    script.src = `campaigns/${campaignId}/${missionInfo.filename}`;
                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });

                    // Get the loaded mission data
                    const missionData = window.CAMPAIGN_MISSIONS[missionInfo.id];
                    if (missionData) {
                        // Convert to game format
                        const gameMission = this.convertToLegacyFormat(missionData, this.missions.length);
                        this.missions.push(gameMission);
                        if (this.logger) this.logger.info(`✅ Loaded mission: ${missionInfo.name}`);
                    }
                } catch (e) {
                    if (this.logger) this.logger.warn(`Failed to load mission ${missionInfo.filename}:`, e);
                }
            }
        }

        if (this.logger) this.logger.info(`✅ Loaded ${this.missions.length} missions from campaign`);
    } catch (e) {
        if (this.logger) this.logger.error('❌ Failed to load campaign:', e);
        if (this.logger) this.logger.error('Campaign system is required. Please check campaigns/main/ folder.');
        this.missions = [];
    }
};

// Convert new mission format to legacy format
CyberOpsGame.prototype.convertToLegacyFormat = function(missionData, index) {
    return {
        // Use the string ID from missionData for proper tracking
        id: missionData.id || `mission-${index + 1}`,
        // Keep numeric ID for display purposes
        missionNumber: missionData.missionNumber || index + 1,
        title: missionData.title || missionData.name,
        name: missionData.name,
        description: missionData.description,
        briefing: missionData.briefing,
        map: missionData.map || { type: 'corporate' },
        objectives: missionData.objectives || [],
        enemies: missionData.enemies || { count: 8 },
        rewards: missionData.rewards,
        npcs: missionData.npcs || [],

        // Agent configuration from new system
        maxAgents: missionData.agents?.max || 4,
        requiredAgents: missionData.agents?.required || 2,
        recommendedAgents: missionData.agents?.recommended || 3,

        // Store original data for full features
        _campaignData: missionData
    };
};

// Override agent selection to use mission-specific settings
CyberOpsGame.prototype.getMaxAgentsForMission = function(missionIndex) {
    // First check if we have an exported mission file for this index
    const missionOverride = window.MISSION_OVERRIDES && window.MISSION_OVERRIDES[missionIndex];
    if (missionOverride && missionOverride.agents) {
        if (this.logger) this.logger.debug(`📝 Using mission override for mission ${missionIndex}: ${missionOverride.agents.max} agents`);
        return missionOverride.agents.max;
    }

    if (this.missions && this.missions[missionIndex]) {
        const mission = this.missions[missionIndex];

        // Use mission-specific agent count if available
        if (mission.maxAgents) {
            return mission.maxAgents;
        }

        // Check campaign data
        if (mission._campaignData?.agents?.max) {
            return mission._campaignData.agents.max;
        }
    }

    // Mission must define agent count
    throw new Error('Mission missing agent count configuration');
};

// Override mission loading to support new system
const originalInitMission = CyberOpsGame.prototype.initMission;
CyberOpsGame.prototype.initMission = function(missionIndex) {

    // Initialize logger
    if (!this.logger) {
        this.logger = window.Logger ? new window.Logger('CampaignIntegration') : null;
    }
    const mission = this.missions[missionIndex];

    // If mission has campaign data, use it for enhanced features
    if (mission && mission._campaignData) {
        this.currentMissionData = mission._campaignData;

        // Apply mission-specific settings
        if (mission._campaignData.map.customTiles) {
            // Use custom map tiles if provided
            this.customMapTiles = mission._campaignData.map.customTiles;
        }

        // Set agent limits
        this.maxAgentsForMission = mission.maxAgents || 4;
        this.requiredAgentsForMission = mission.requiredAgents || 2;
    }

    // Call original init
    return originalInitMission.call(this, missionIndex);
};

// generateMapFromType is no longer needed - all maps are embedded
// Keeping a stub just in case something still references it
if (!CyberOpsGame.prototype.generateMapFromType) {
    CyberOpsGame.prototype.generateMapFromType = function(mapType) {
        if (this.logger) this.logger.error('❌ generateMapFromType called but all maps must be embedded!');
        throw new Error('Procedural generation removed - all maps must be embedded in mission files');
    };
}

// Add campaign selection to main menu
CyberOpsGame.prototype.showCampaignSelect = function() {
    // Create campaign selection UI
    const campaigns = CampaignSystem.campaigns;

    let html = '<div class="campaign-select">';
    html += '<h2>Select Campaign</h2>';

    for (const [id, campaign] of Object.entries(campaigns)) {
        const stats = CampaignSystem.getCampaignStats(id);
        const locked = campaign.locked && !this.isCampaignUnlocked(id);

        html += `
            <div class="campaign-option ${locked ? 'locked' : ''}"
                 onclick="${locked ? '' : `game.selectCampaign('${id}')`}">
                <h3>${campaign.name}</h3>
                <p>${campaign.description}</p>
                <div class="campaign-progress">
                    ${stats ? `Progress: ${stats.percentComplete}%` : 'New Campaign'}
                </div>
                ${locked ? '<div class="lock-icon">🔒</div>' : ''}
            </div>
        `;
    }

    html += '<button onclick="game.backToMainMenu()">Back</button>';
    html += '</div>';

    // Show in UI (you may need to create a campaign select screen)
    const container = document.getElementById('campaignSelectScreen');
    if (container) {
        container.innerHTML = html;
    } else {
        // Log warning if no container found
        if (this.logger) this.logger.warn('No campaign select screen container found');
    }
};

// Select a campaign
CyberOpsGame.prototype.selectCampaign = async function(campaignId) {
    this.currentCampaignId = campaignId;
    await this.loadCampaignMissions();
    this.startCampaign();
};

// Check if campaign is unlocked
CyberOpsGame.prototype.isCampaignUnlocked = function(campaignId) {
    // Check unlock conditions
    if (campaignId === 'main' || campaignId === 'tutorial' || campaignId === 'custom') {
        return true; // Always unlocked
    }

    // Check if purchased/unlocked
    return localStorage.getItem(`campaign_unlocked_${campaignId}`) === 'true';
};

// Update mission completion to work with campaign system
const originalCompleteMission = CyberOpsGame.prototype.completeMission;
CyberOpsGame.prototype.completeMission = function() {
    // Mark in campaign system if using it
    if (this.useCampaignSystem && this.currentMissionData) {
        if (this.logger) this.logger.debug('📊 Marking mission complete:', {
            campaign: this.currentMissionData.campaign,
            act: this.currentMissionData.act,
            id: this.currentMissionData.id,
            fullMissionData: this.currentMissionData
        });

        CampaignSystem.markMissionComplete(
            this.currentMissionData.campaign,
            this.currentMissionData.act,
            this.currentMissionData.id  // Use 'id' field, not 'mission'
        );

        // Check for next mission
        const nextMission = CampaignSystem.getNextMission();
        if (nextMission) {
            if (this.logger) this.logger.info('✅ Next mission available:', nextMission);
        } else {
            if (this.logger) this.logger.debug('⚠️ No next mission found');
        }
    }

    // Call original
    if (originalCompleteMission) {
        return originalCompleteMission.call(this);
    }
};

// Auto-initialize when game starts
const originalInitGame = CyberOpsGame.prototype.init;
CyberOpsGame.prototype.init = async function() {
    // Initialize campaign system first
    await this.initCampaignSystem();

    // Call original init
    if (originalInitGame) {
        return originalInitGame.call(this);
    }
};