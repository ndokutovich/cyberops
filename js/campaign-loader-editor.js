// Campaign Loader for Mission Editor
// Loads campaign missions without requiring CyberOpsGame

// Create logger at module level so it's accessible everywhere
const editorLogger = window.Logger ? new window.Logger('CampaignLoaderEditor') : null;

async function loadCampaignIndex() {
    if (editorLogger) editorLogger.debug('📚 Loading campaign index for editor...');

    try {
        // Define available campaigns
        const campaigns = [
            { id: 'main', name: 'Main Campaign', acts: 2 }
        ];

        // Load all mission files
        for (const campaign of campaigns) {
            if (editorLogger) editorLogger.debug(`Loading campaign: ${campaign.name}`);

            // Load Act 1 missions
            const act1Missions = [
                'main-01-001.js',
                'main-01-002.js',
                'main-01-003.js',
                'main-01-004.js'
            ];

            for (const missionFile of act1Missions) {
                await loadMissionFile(`campaigns/main/act1/${missionFile}`);
            }

            // Load Act 2 missions
            const act2Missions = [
                'main-02-001.js',
                'main-02-002.js'
            ];

            for (const missionFile of act2Missions) {
                await loadMissionFile(`campaigns/main/act2/${missionFile}`);
            }
        }

        if (editorLogger) editorLogger.info('✅ All campaigns loaded:', Object.keys(window.CAMPAIGN_MISSIONS || {}));
    } catch (error) {
        if (editorLogger) editorLogger.error('Failed to load campaigns:', error);
    }
}

async function loadMissionFile(path) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = path;
        script.onload = () => {
            if (editorLogger) editorLogger.info('Loaded mission:', path);
            resolve();
        };
        script.onerror = () => {
            if (editorLogger) editorLogger.error('Failed to load mission:', path);
            reject(new Error(`Failed to load ${path}`));
        };
        document.head.appendChild(script);
    });
}

// Auto-load on script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCampaignIndex);
} else {
    loadCampaignIndex();
}