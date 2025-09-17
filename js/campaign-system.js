// Campaign System
// Hierarchical structure: Campaign → Act → Mission

const CampaignSystem = {
    campaigns: {},
    currentCampaign: null,
    currentAct: null,
    currentMission: null,
    progress: {},

    // Initialize the campaign system
    async init() {
        console.log('🎮 Initializing Campaign System...');

        // Load campaign structure
        await this.loadCampaigns();

        // Load saved progress
        this.loadProgress();

        return this.campaigns;
    },

    // Load all campaigns
    async loadCampaigns() {
        // Try to load campaign index
        try {
            await this.loadCampaignIndex();
        } catch (e) {
            console.log('No campaign index found, using hardcoded campaigns...');
            // Don't scan for files - use known campaign structure
            this.loadHardcodedCampaigns();
        }
    },

    // Load campaign index file
    async loadCampaignIndex() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'campaigns/index.js';

            window.REGISTER_CAMPAIGNS = (campaigns) => {
                this.campaigns = campaigns;
                console.log(`✅ Loaded ${Object.keys(campaigns).length} campaigns from index`);
            };

            script.onload = () => {
                delete window.REGISTER_CAMPAIGNS;
                resolve();
            };
            script.onerror = reject;

            document.head.appendChild(script);
        });
    },

    // Load hardcoded campaign structure (no file scanning)
    loadHardcodedCampaigns() {
        this.campaigns = {
            'main': {
                id: 'main',
                name: 'Main Campaign',
                description: 'The primary CyberOps storyline',
                folder: 'main',
                acts: [
                    {
                        id: '01',
                        name: 'Act 1',
                        missions: [
                            { id: '001', filename: 'act1/main-01-001', name: 'Corporate Infiltration' },
                            { id: '002', filename: 'act1/main-01-002', name: 'Network Breach' },
                            { id: '003', filename: 'act1/main-01-003', name: 'Industrial Sabotage' },
                            { id: '004', filename: 'act1/main-01-004', name: 'Stealth Recon' }
                        ]
                    },
                    {
                        id: '02',
                        name: 'Act 2',
                        missions: [
                            { id: '001', filename: 'act2/main-02-001', name: 'Assassination Contract' },
                            { id: '002', filename: 'act2/main-02-002', name: 'Final Convergence' }
                        ]
                    }
                ]
            }
        };

        console.log('✅ Loaded hardcoded campaign structure');
    },

    // Scan for campaign directories (DEPRECATED - causes 404 errors)
    async scanForCampaigns() {
        // Default campaign structure if no index found
        this.campaigns = {
            'main': {
                id: 'main',
                name: 'Main Campaign',
                description: 'The primary CyberOps storyline',
                acts: await this.scanForActs('main')
            },
            'dlc1': {
                id: 'dlc1',
                name: 'Corporate Wars',
                description: 'Extended corporate espionage campaign',
                locked: true,
                acts: []
            },
            'custom': {
                id: 'custom',
                name: 'Custom Missions',
                description: 'User-created and standalone missions',
                acts: await this.scanForActs('custom')
            }
        };
    },

    // Scan for acts in a campaign
    async scanForActs(campaignId) {
        const acts = [];

        // Try to load acts 01-99
        for (let actNum = 1; actNum <= 99; actNum++) {
            const actId = String(actNum).padStart(2, '0');
            const missions = await this.scanForMissions(campaignId, actId);

            if (missions.length > 0) {
                acts.push({
                    id: actId,
                    number: actNum,
                    name: `Act ${actNum}`,
                    description: '',
                    missions: missions
                });
            } else if (acts.length > 0) {
                // Stop scanning after finding a gap
                break;
            }
        }

        return acts;
    },

    // Scan for missions in an act
    async scanForMissions(campaignId, actId) {
        const missions = [];
        const prefix = `${campaignId}-${actId}`;

        // Try to load missions 001-999
        for (let missionNum = 1; missionNum <= 999; missionNum++) {
            const missionId = String(missionNum).padStart(3, '0');
            const filename = `${prefix}-${missionId}`;

            if (await this.missionExists(campaignId, filename)) {
                missions.push({
                    id: missionId,
                    filename: filename,
                    number: missionNum
                });
            } else if (missions.length > 0) {
                // Stop scanning after finding a gap
                break;
            }
        }

        return missions;
    },

    // Check if a mission file exists
    async missionExists(campaignId, filename) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = `campaigns/${campaignId}/${filename}.js`;

            const timeout = setTimeout(() => {
                if (document.head.contains(script)) {
                    document.head.removeChild(script);
                }
                resolve(false);
            }, 500);

            script.onload = () => {
                clearTimeout(timeout);
                document.head.removeChild(script);
                resolve(true);
            };

            script.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };

            document.head.appendChild(script);
        });
    },

    // Load a specific mission
    async loadMission(campaignId, actId, missionId) {
        const filename = `${campaignId}-${actId}-${missionId}`;
        const actFolder = `act${parseInt(actId)}`;
        console.log(`📋 Loading mission: ${filename}`);

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `campaigns/${campaignId}/${actFolder}/${filename}.js`;

            window.REGISTER_MISSION = (missionData) => {
                // Add campaign/act context
                missionData.campaignId = campaignId;
                missionData.actId = actId;
                missionData.missionId = missionId;
                missionData.filename = filename;

                this.currentCampaign = campaignId;
                this.currentAct = actId;
                this.currentMission = missionId;

                resolve(missionData);
            };

            script.onload = () => {
                if (!window.REGISTER_MISSION.called) {
                    reject(new Error('Mission file did not register'));
                }
                delete window.REGISTER_MISSION;
            };

            script.onerror = () => {
                reject(new Error('Failed to load mission file'));
            };

            document.head.appendChild(script);
        });
    },

    // Register a mission (called by mission files)
    registerMission(campaignId, actId, missionId, missionData) {
        // Store missions in a registry for loading
        if (!window.CAMPAIGN_MISSIONS) {
            window.CAMPAIGN_MISSIONS = {};
        }
        window.CAMPAIGN_MISSIONS[missionId] = missionData;
        console.log(`✅ Registered mission: ${missionId}`);
    },

    // Get campaign by ID
    getCampaign(campaignId) {
        return this.campaigns[campaignId] || null;
    },

    // Get act by ID
    getAct(campaignId, actId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return null;

        return campaign.acts.find(a => a.id === actId) || null;
    },

    // Get mission list for an act
    getMissions(campaignId, actId) {
        const act = this.getAct(campaignId, actId);
        return act ? act.missions : [];
    },

    // Get next mission in sequence
    getNextMission() {
        if (!this.currentCampaign || !this.currentAct || !this.currentMission) {
            return null;
        }

        const act = this.getAct(this.currentCampaign, this.currentAct);
        if (!act) return null;

        const currentIndex = act.missions.findIndex(m => m.id === this.currentMission);

        // Next mission in same act
        if (currentIndex < act.missions.length - 1) {
            return {
                campaignId: this.currentCampaign,
                actId: this.currentAct,
                missionId: act.missions[currentIndex + 1].id
            };
        }

        // First mission of next act
        const campaign = this.getCampaign(this.currentCampaign);
        const actIndex = campaign.acts.findIndex(a => a.id === this.currentAct);

        if (actIndex < campaign.acts.length - 1) {
            const nextAct = campaign.acts[actIndex + 1];
            if (nextAct.missions.length > 0) {
                return {
                    campaignId: this.currentCampaign,
                    actId: nextAct.id,
                    missionId: nextAct.missions[0].id
                };
            }
        }

        return null;
    },

    // Save progress
    saveProgress() {
        this.progress[this.currentCampaign] = {
            currentAct: this.currentAct,
            currentMission: this.currentMission,
            completedMissions: this.getCompletedMissions(),
            timestamp: Date.now()
        };

        localStorage.setItem('campaign_progress', JSON.stringify(this.progress));
    },

    // Load progress
    loadProgress() {
        const saved = localStorage.getItem('campaign_progress');
        if (saved) {
            this.progress = JSON.parse(saved);
        }
    },

    // Mark mission as complete
    markMissionComplete(campaignId, actId, missionId) {
        const key = `${campaignId}-${actId}-${missionId}`;

        if (!this.progress.completed) {
            this.progress.completed = [];
        }

        if (!this.progress.completed.includes(key)) {
            this.progress.completed.push(key);
            this.saveProgress();
        }
    },

    // Check if mission is completed
    isMissionCompleted(campaignId, actId, missionId) {
        const key = `${campaignId}-${actId}-${missionId}`;
        return this.progress.completed && this.progress.completed.includes(key);
    },

    // Get completed missions
    getCompletedMissions() {
        return this.progress.completed || [];
    },

    // Check if act is unlocked
    isActUnlocked(campaignId, actId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return false;

        const actIndex = campaign.acts.findIndex(a => a.id === actId);

        // First act is always unlocked
        if (actIndex === 0) return true;

        // Check if previous act is completed
        if (actIndex > 0) {
            const previousAct = campaign.acts[actIndex - 1];
            const requiredMissions = Math.floor(previousAct.missions.length * 0.7); // 70% required

            let completedCount = 0;
            previousAct.missions.forEach(mission => {
                if (this.isMissionCompleted(campaignId, previousAct.id, mission.id)) {
                    completedCount++;
                }
            });

            return completedCount >= requiredMissions;
        }

        return false;
    },

    // Get campaign statistics
    getCampaignStats(campaignId) {
        const campaign = this.getCampaign(campaignId);
        if (!campaign) return null;

        let totalMissions = 0;
        let completedMissions = 0;

        campaign.acts.forEach(act => {
            act.missions.forEach(mission => {
                totalMissions++;
                if (this.isMissionCompleted(campaignId, act.id, mission.id)) {
                    completedMissions++;
                }
            });
        });

        return {
            totalMissions,
            completedMissions,
            percentComplete: totalMissions > 0 ? Math.floor((completedMissions / totalMissions) * 100) : 0
        };
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CampaignSystem.init());
} else {
    CampaignSystem.init();
}