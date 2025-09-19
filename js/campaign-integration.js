// Campaign Integration Layer
// Bridges the new campaign system with the existing game code

// Initialize campaign system on game start
CyberOpsGame.prototype.initCampaignSystem = async function() {
    console.log('🎮 Initializing Campaign System...');

    // Initialize the campaign system
    await CampaignSystem.init();

    // Always use campaign system - no fallback
    console.log('✅ Using campaign system');
    await this.loadCampaignMissions();
};

// Load campaign content (agents, weapons, equipment, etc.)
CyberOpsGame.prototype.loadCampaignContent = async function(campaignId) {
    console.log(`📦 Loading content for campaign: ${campaignId}`);

    try {
        // First try to use the new flexible content loader
        if (window.ContentLoader && window.CampaignSystem?.campaignConfigs?.[campaignId]) {
            console.log('🚀 Using flexible content loader system');
            const campaign = window.CampaignSystem.campaignConfigs[campaignId];
            const success = await window.ContentLoader.loadCampaign(campaign, this);

            if (success) {
                console.log('✅ Campaign loaded via flexible system');

                // Apply starting resources if new game
                if (!this.campaignStarted) {
                    const economy = window.ContentLoader.getContent('economy');
                    if (economy) {
                        this.credits = economy.startingCredits || 5000;
                        this.researchPoints = economy.startingResearchPoints || 100;
                        this.worldControl = economy.startingWorldControl || 0;
                    }
                    this.campaignStarted = true;
                }

                // The flexible loader already set up agents, weapons, etc.
                return;
            }
        }


        // Load the campaign content file
        const script = document.createElement('script');
        script.src = `campaigns/${campaignId}/campaign-content.js`;
        await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => {
                console.warn(`No campaign content file for ${campaignId}, using defaults`);
                resolve(); // Don't fail if no content file
            };
            document.head.appendChild(script);
        });

        // Check if content was loaded
        const content = window.MAIN_CAMPAIGN_CONTENT ||
                       (window.CampaignSystem && window.CampaignSystem.getCampaignContent && window.CampaignSystem.getCampaignContent(campaignId));

        if (content) {
            console.log('✅ Campaign content loaded (legacy), applying to game...');

            // Apply starting resources if this is a new game
            if (!this.campaignStarted) {
                this.credits = content.startingResources.credits;
                this.researchPoints = content.startingResources.researchPoints;
                this.worldControl = content.startingResources.worldControl;
                this.campaignStarted = true;
            }

            // Load agents
            if (content.agents) {
                this.availableAgents = content.agents;
                this.activeAgents = content.agents.filter(agent => agent.hired);
                console.log(`✅ Loaded ${content.agents.length} agents`);

                // Re-initialize equipment loadouts for newly loaded agents
                if (this.activeAgents.length > 0) {
                    console.log('🔧 Initializing equipment loadouts for active agents...');
                    if (!this.agentLoadouts) {
                        this.agentLoadouts = {};
                    }
                    this.activeAgents.forEach(agent => {
                        if (!this.agentLoadouts[agent.id]) {
                            this.agentLoadouts[agent.id] = {
                                weapon: null,
                                armor: null,
                                utility: null,
                                special: null
                            };
                            console.log(`   - Created loadout for ${agent.name} (ID: ${agent.id})`);
                        }
                    });
                }
            }

            // Load weapons
            if (content.weapons) {
                this.weapons = content.weapons;
                console.log(`✅ Loaded ${content.weapons.length} weapons`);
            }

            // Load equipment
            if (content.equipment) {
                this.equipment = content.equipment;
                console.log(`✅ Loaded ${content.equipment.length} equipment items`);
            }

            // Store enemy types for mission spawning
            if (content.enemyTypes) {
                this.campaignEnemyTypes = content.enemyTypes;
                console.log(`✅ Loaded ${content.enemyTypes.length} enemy types`);
            }

            // Store research tree
            if (content.researchTree) {
                this.researchTree = content.researchTree;
                console.log('✅ Loaded research tree');
            }

            // Store intel reports
            if (content.intelReports) {
                this.campaignIntelReports = content.intelReports;
                console.log(`✅ Loaded ${content.intelReports.length} intel reports`);
            }

            // Store abilities
            if (content.abilities) {
                this.campaignAbilities = content.abilities;
                console.log(`✅ Loaded ${content.abilities.length} abilities`);
            }

            // Store milestones
            if (content.milestones) {
                this.campaignMilestones = content.milestones;
                console.log(`✅ Loaded ${content.milestones.length} milestones`);
            }

            // Load game configuration
            if (content.gameConfig) {
                // Apply configuration constants
                if (content.gameConfig.demosceneIdleTimeout !== undefined) {
                    this.DEMOSCENE_IDLE_TIMEOUT = content.gameConfig.demosceneIdleTimeout;
                }
                if (content.gameConfig.musicMenuStartTime !== undefined) {
                    this.MUSIC_MENU_START_TIME = content.gameConfig.musicMenuStartTime;
                }
                if (content.gameConfig.speedIndicatorFadeTime !== undefined) {
                    this.speedIndicatorFadeTime = content.gameConfig.speedIndicatorFadeTime;
                }
                if (content.gameConfig.defaultHackTime !== undefined) {
                    this.defaultHackTime = content.gameConfig.defaultHackTime;
                }
                if (content.gameConfig.defaultMissionRewards) {
                    this.defaultMissionRewards = content.gameConfig.defaultMissionRewards;
                }
                console.log('✅ Loaded game configuration');
            }

            // Load agent generation system
            if (content.agentGeneration) {
                this.agentGeneration = content.agentGeneration;
                console.log('✅ Loaded agent generation system');
            }

            // Load death system
            if (content.deathSystem) {
                this.deathSystem = content.deathSystem;
                console.log('✅ Loaded death system');
            }

            // Load skill definitions
            if (content.skillDefinitions) {
                this.skillDefinitions = content.skillDefinitions;
                console.log(`✅ Loaded ${Object.keys(content.skillDefinitions).length} skill definitions`);
            }

            // Load UI text
            if (content.uiText) {
                this.uiText = content.uiText;
                console.log('✅ Loaded UI text and labels');
            }

            // Load gameplay constants
            if (content.gameplayConstants) {
                // Apply tile dimensions
                if (content.gameplayConstants.tileWidth !== undefined) {
                    this.tileWidth = content.gameplayConstants.tileWidth;
                }
                if (content.gameplayConstants.tileHeight !== undefined) {
                    this.tileHeight = content.gameplayConstants.tileHeight;
                }

                // Store all constants for reference
                this.gameplayConstants = content.gameplayConstants;
                console.log('✅ Loaded gameplay constants');
            }

            // Load music configuration
            if (content.music) {
                this.campaignMusic = content.music;
                console.log('✅ Loaded music configuration');

                // Could update the GAME_MUSIC_CONFIG here if we want to override the hardcoded one
                // For now, just store it for use by music systems
            }

            console.log('✅ Campaign content fully loaded');
        } else {
            console.log('⚠️ No campaign content found, using hardcoded defaults');
        }
    } catch (e) {
        console.error('Failed to load campaign content:', e);
        console.log('⚠️ Using hardcoded defaults');
    }
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
                                console.warn(`No NPCs file for campaign ${campaignId}`);
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
                        console.log(`✅ Loaded mission: ${missionInfo.name}`);
                    }
                } catch (e) {
                    console.warn(`Failed to load mission ${missionInfo.filename}:`, e);
                }
            }
        }

        console.log(`✅ Loaded ${this.missions.length} missions from campaign`);
    } catch (e) {
        console.error('❌ Failed to load campaign:', e);
        console.error('Campaign system is required. Please check campaigns/main/ folder.');
        this.missions = [];
    }
};

// Convert new mission format to legacy format
CyberOpsGame.prototype.convertToLegacyFormat = function(missionData, index) {
    return {
        id: missionData.missionNumber || index + 1,
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
        console.log(`📝 Using mission override for mission ${missionIndex}: ${missionOverride.agents.max} agents`);
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
        console.error('❌ generateMapFromType called but all maps must be embedded!');
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
    const container = document.getElementById('campaignSelectScreen') ||
                     document.getElementById('mainMenu');
    container.innerHTML = html;
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
        CampaignSystem.markMissionComplete(
            this.currentMissionData.campaign,
            this.currentMissionData.act,
            this.currentMissionData.mission
        );

        // Check for next mission
        const nextMission = CampaignSystem.getNextMission();
        if (nextMission) {
            console.log('Next mission available:', nextMission);
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