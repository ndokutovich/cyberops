// Mission Loader System
// Dynamically loads numbered mission files (000.js, 001.js, etc.)

const MissionLoader = {
    missions: [],
    missionFiles: [],

    // Initialize the mission loader
    async init() {
        console.log('🎮 Initializing Mission Loader...');

        // Try to load missions starting from 000
        let missionNumber = 0;
        let consecutiveFails = 0;

        while (consecutiveFails < 3) { // Stop after 3 consecutive missing files
            const filename = this.formatMissionNumber(missionNumber);

            if (await this.missionExists(filename)) {
                console.log(`✅ Found mission: ${filename}`);
                this.missionFiles.push(filename);
                consecutiveFails = 0;
            } else {
                consecutiveFails++;
            }

            missionNumber++;

            // Safety limit
            if (missionNumber > 100) break;
        }

        console.log(`📋 Found ${this.missionFiles.length} mission files`);

        // Load all found missions
        await this.loadAllMissions();

        return this.missions;
    },

    // Format mission number as 000, 001, etc.
    formatMissionNumber(num) {
        return String(num).padStart(3, '0');
    },

    // Check if mission file exists
    async missionExists(filename) {
        try {
            const script = document.createElement('script');
            script.src = `missions/${filename}.js`;

            return new Promise((resolve) => {
                script.onload = () => {
                    document.head.removeChild(script);
                    resolve(true);
                };
                script.onerror = () => {
                    document.head.removeChild(script);
                    resolve(false);
                };

                document.head.appendChild(script);

                // Timeout after 1 second
                setTimeout(() => {
                    if (document.head.contains(script)) {
                        document.head.removeChild(script);
                        resolve(false);
                    }
                }, 1000);
            });
        } catch (e) {
            return false;
        }
    },

    // Load all found missions
    async loadAllMissions() {
        // Clear existing missions
        this.missions = [];

        // Each mission file should register itself
        window.REGISTER_MISSION = (missionData) => {
            this.missions.push(missionData);
        };

        // Load each mission file
        for (const filename of this.missionFiles) {
            await this.loadMissionFile(filename);
        }

        // Clean up
        delete window.REGISTER_MISSION;

        console.log(`✅ Loaded ${this.missions.length} missions`);
    },

    // Load a single mission file
    async loadMissionFile(filename) {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = `missions/${filename}.js`;
            script.onload = resolve;
            script.onerror = () => {
                console.warn(`Failed to load mission: ${filename}`);
                resolve();
            };
            document.head.appendChild(script);
        });
    },

    // Get mission by index
    getMission(index) {
        return this.missions[index] || null;
    },

    // Get all missions
    getAllMissions() {
        return this.missions;
    },

    // Add or replace mission
    addMission(index, missionData) {
        // Ensure the array is large enough
        while (this.missions.length <= index) {
            this.missions.push(null);
        }

        this.missions[index] = missionData;
        console.log(`✅ Added/replaced mission at index ${index}`);
    },

    // Get mission count
    getMissionCount() {
        return this.missions.filter(m => m !== null).length;
    }
};

// Disabled auto-initialization - now using campaign system
// To use MissionLoader, call MissionLoader.init() manually
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => MissionLoader.init());
// } else {
//     MissionLoader.init();
// }