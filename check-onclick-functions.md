# Onclick Function Verification

## Campaign/Navigation Functions
- [x] selectCampaign - EXISTS (campaign-integration.js)
- [x] backToMainMenu - EXISTS (game-screens.js:152)
- [x] startMissionFromHub - EXISTS (game-hub.js:201)

## Research Functions
- [x] startResearch - EXISTS (game-hub.js:423)

## Character/RPG Functions
- [x] showStatAllocation - EXISTS (game-rpg-ui.js:773)
- [x] showSkillTree - EXISTS (game-rpg-ui.js:941) - ADDED
- [x] showPerkSelection - EXISTS (game-rpg-ui.js:956) - ADDED
- [x] allocateStat - EXISTS (game-rpg-ui.js:815)
- [x] confirmStatAllocation - EXISTS (game-rpg-ui.js:840)
- [x] showCharacterSheet - EXISTS (game-rpg-ui.js:8)
- [x] useHealthPack - EXISTS (game-rpg-ui.js:971) - ADDED
- [x] dropItem - EXISTS (game-rpg-ui.js:1006) - ADDED
- [x] unequipFromRPG - EXISTS (game-rpg-ui.js:641)
- [x] equipFromRPG - EXISTS (game-rpg-ui.js:618)
- [x] useItem - EXISTS (game-rpg-ui.js:1028) - ADDED

## Equipment/Shop Functions
- [x] unequipItem - EXISTS (game-equipment.js:744)
- [x] equipItem - EXISTS (game-equipment.js:671)
- [x] sellItem - EXISTS (game-equipment.js:794)
- [x] buyItem - EXISTS (game-equipment.js:756)
- [x] buyItemFromShop - EXISTS (game-equipment.js:1258)
- [x] switchShopTab - EXISTS (game-rpg-ui.js:875)

## Save/Load Functions
- [x] overwriteSave - EXISTS (game-saveload.js:285)
- [x] loadSaveSlot - EXISTS (game-saveload.js:330)
- [x] renameSave - EXISTS (game-saveload.js:316)
- [x] deleteSave - EXISTS (game-saveload.js:297)
- [x] saveGameWithName - EXISTS (game-saveload.js:571) - ADDED EARLIER

## Settings Functions
- [x] closeSettingsDialog - EXISTS (game-settings.js:454)
- [x] resetSettings - EXISTS (game-settings.js:482)
- [x] applySettings - EXISTS (game-settings.js:462)
- [x] startKeyRebind - EXISTS (game-settings.js:262)
- [x] resetKeyBinding - EXISTS (game-settings.js:295)

## Inventory Mode Functions (anonymous functions, not direct calls)
- game.currentInventoryMode = 'inventory'
- game.currentInventoryMode = 'buy'
- game.currentInventoryMode = 'sell'
- game.currentInventoryTab = 'weapons'
- game.currentInventoryTab = 'equipment'
- [x] optimizeLoadouts - EXISTS (game-equipment.js:927)