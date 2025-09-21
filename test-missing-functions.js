// Script to find missing functions called from onclick handlers

const functionsCalledInOnclick = [
    'backToMainMenu',
    'startMissionFromHub',
    'startResearch',
    'showStatAllocation',
    'showSkillTree',
    'showPerkSelection',
    'resetSettings',
    'saveGameWithName',
    'loadSaveSlot',
    'unequipItem',
    'equipItem',
    'sellItem',
    'buyItem',
    'buyItemFromShop',
    'overwriteSave',
    'renameSave',
    'deleteSave',
    'useHealthPack',
    'dropItem',
    'unequipFromRPG',
    'equipFromRPG',
    'useItem',
    'switchShopTab',
    'allocateStat',
    'confirmStatAllocation',
    'closeSettingsDialog',
    'applySettings',
    'startKeyRebind',
    'resetKeyBinding',
    'showCharacterSheet'
];

console.log('Checking for missing onclick functions...\n');

const missing = [];
const found = [];

// Check if game object exists
if (typeof game !== 'undefined') {
    functionsCalledInOnclick.forEach(func => {
        if (typeof game[func] === 'function') {
            found.push(func);
        } else {
            missing.push(func);
        }
    });

    console.log(`✅ Found ${found.length} functions`);
    console.log(`❌ Missing ${missing.length} functions\n`);

    if (missing.length > 0) {
        console.log('Missing functions:');
        missing.forEach(func => {
            console.log(`  - ${func}`);
        });
    }

    // Try to find alternatives
    console.log('\nSearching for alternatives...');
    missing.forEach(func => {
        // Check for similar function names
        const similar = Object.keys(game).filter(key => {
            if (typeof game[key] !== 'function') return false;
            const lowerFunc = func.toLowerCase();
            const lowerKey = key.toLowerCase();
            return lowerKey.includes(lowerFunc.substring(0, 5)) ||
                   lowerFunc.includes(lowerKey.substring(0, 5));
        });

        if (similar.length > 0) {
            console.log(`  ${func} → might be: ${similar.join(', ')}`);
        }
    });
} else {
    console.log('Game object not found. Load this script after the game is initialized.');
}