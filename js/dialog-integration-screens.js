/**
 * Game Screen Dialog Integration
 * Connects declarative screen configs to game functions
 * Following DIALOG_CONVERSION_GUIDE.md extraction patterns
 */

(function() {
    // Wait for dialog engine to be available
    function registerScreenIntegrations() {
    const logger = window.Logger ? new window.Logger('from') : null;
        const engine = window.declarativeDialogEngine;
        if (!engine) {
            if (this.logger) this.logger.warn('Dialog engine not ready for screen integrations');
            return;
        }

        const game = window.game;

        // ========== CONTENT GENERATORS ==========

        // Victory content generator
        engine.registerGenerator('generateVictoryContent', function() {
            if (!game || !game.currentMission) {
                return '<p>Mission data not available</p>';
            }

            const missionSummary = game.gatherMissionSummary ? game.gatherMissionSummary(true) : {};

            // Extract item collection stats
            const itemsCollected = missionSummary.itemsCollected || {};
            const intelCollected = missionSummary.intelCollected || itemsCollected.intel || 0;
            const creditsCollected = missionSummary.creditsCollected || itemsCollected.credits || 0;
            const healthCollected = itemsCollected.health || 0;
            const ammoCollected = itemsCollected.ammo || 0;
            const weaponsCollected = missionSummary.weaponsCollected || [];
            const hasCollectables = intelCollected > 0 || creditsCollected > 0 ||
                                   healthCollected > 0 || ammoCollected > 0 || weaponsCollected.length > 0;

            const data = {
                enemiesKilled: missionSummary.enemiesKilled || 0,
                totalEnemies: missionSummary.totalEnemies || 0,
                objectivesCompleted: missionSummary.objectivesCompleted || 0,
                totalObjectives: missionSummary.totalObjectives || 0,
                agentsLost: missionSummary.agentsLost || 0,
                missionTime: missionSummary.missionTime || '00:00',
                creditsEarned: missionSummary.totalCredits || 0,
                researchPoints: missionSummary.totalResearchPoints || 0,
                worldControl: missionSummary.worldControl || 0,
                bonusObjectives: missionSummary.bonusObjectives || [],
                // Collectables
                hasCollectables: hasCollectables,
                intelCollected: intelCollected,
                creditsCollected: creditsCollected,
                healthCollected: healthCollected,
                ammoCollected: ammoCollected,
                weaponsCollectedCount: weaponsCollected.length
            };

            return engine.renderTemplate('victory-summary', data);
        });

        // Defeat content generator
        engine.registerGenerator('generateDefeatContent', function() {
            if (!game) {
                return '<p>Mission data not available</p>';
            }

            const missionSummary = game.gatherMissionSummary ? game.gatherMissionSummary(false) : {};

            const data = {
                failureReason: game.defeatReason || 'All agents were eliminated',
                agentsLost: missionSummary.agentsLost || game.agents?.filter(a => !a.alive).length || 0,
                totalAgents: game.agents?.length || 0,
                objectivesCompleted: missionSummary.objectivesCompleted || 0,
                totalObjectives: missionSummary.totalObjectives || 0,
                enemiesKilled: missionSummary.enemiesKilled || 0,
                survivalTime: missionSummary.missionTime || '00:00',
                creditsLost: Math.floor((game.credits || 0) * 0.1) // 10% penalty
            };

            return engine.renderTemplate('defeat-summary', data);
        });

        // Victory buttons generator
        engine.registerGenerator('generateVictoryButtons', function() {
            const buttons = [];

            // Check if there are more missions
            if (game && game.currentMissionIndex < game.missions.length - 1) {
                buttons.push({
                    text: 'NEXT MISSION',
                    action: 'execute:proceedToNextMission',
                    primary: true
                });
            } else {
                buttons.push({
                    text: 'COMPLETE CAMPAIGN',
                    action: 'execute:completeCampaign',
                    primary: true
                });
            }

            buttons.push({
                text: 'RETURN TO HUB',
                action: 'execute:returnToHubFromVictory'
            });

            return buttons;
        });

        // Defeat buttons generator
        engine.registerGenerator('generateDefeatButtons', function() {
            return [
                { text: 'RETRY MISSION', action: 'execute:retryMission', primary: true },
                { text: 'RETURN TO HUB', action: 'execute:returnToHubFromDefeat' },
                { text: 'LOAD CHECKPOINT', action: 'navigate:save-load' }
            ];
        });

        // Briefing title generator
        engine.registerGenerator('generateBriefingTitle', function() {
            const mission = (game && game.currentMission) || this.stateData?.selectedMission;
            if (!mission) return 'MISSION BRIEFING';

            const missionNum = mission.missionNumber || mission.id;
            return `Mission ${missionNum}: ${mission.title}`;
        });

        // Briefing content generator
        engine.registerGenerator('generateBriefingContent', function() {
            const mission = (game && game.currentMission) || this.stateData?.selectedMission;
            if (!mission) {
                return '<p>No mission selected</p>';
            }

            const primaryObjectives = [];
            const secondaryObjectives = [];

            // Separate objectives by type
            mission.objectives?.forEach(obj => {
                const objText = typeof obj === 'string' ? obj :
                    (obj.description || obj.displayText || 'Complete objective');

                if (obj.required !== false) {
                    primaryObjectives.push(objText);
                } else {
                    secondaryObjectives.push(objText);
                }
            });

            const data = {
                missionTitle: mission.title,
                location: mission.location || 'Classified',
                description: mission.description || mission.briefing,
                primaryObjectives: primaryObjectives,
                secondaryObjectives: secondaryObjectives,
                difficulty: mission.difficulty || 'Moderate',
                difficultyColor: mission.difficulty === 'Hard' ? 'danger' :
                                 mission.difficulty === 'Easy' ? 'success' : 'warning',
                enemyCount: mission.enemyCount || '10-15',
                environment: mission.environment || 'Urban',
                baseCredits: mission.rewards?.credits || 1000,
                baseResearch: mission.rewards?.researchPoints || 50,
                worldControl: mission.rewards?.worldControl || 1
            };

            return engine.renderTemplate('mission-briefing-content', data);
        });

        // Loadout content generator
        // generateLoadoutContent removed - functionality merged into mission briefing screen

        // Hub content generator
        engine.registerGenerator('generateHubContent', function() {
            // The hub is special - it uses the existing HTML structure
            // This just ensures the hub display is updated
            if (game && game.updateHubStats) {
                game.updateHubStats();
            }
            return ''; // Hub uses existing DOM, not generated content
        });

        // ========== ACTION HANDLERS ==========

        // Victory actions
        engine.registerAction('continueFromVictory', function() {
            if (game && game.currentMissionIndex < game.missions.length - 1) {
                if (game.proceedToNextMission) game.proceedToNextMission();
            } else {
                if (game && game.completeCampaign) game.completeCampaign();
            }
        });

        engine.registerAction('proceedToNextMission', function() {
            this.closeAll();
            if (game) {
                // Use MissionService to increment index (single source of truth)
                if (game.gameServices?.missionService) {
                    game.gameServices.missionService.incrementMissionIndex();
                }
                const nextMission = game.missions[game.currentMissionIndex];
                game.currentMission = nextMission;
                this.navigateTo('mission-briefing', { selectedMission: nextMission });
            }
        });

        engine.registerAction('completeCampaign', function() {
            this.closeAll();
            if (game && game.showGameComplete) {
                game.showGameComplete();
            }
        });

        engine.registerAction('returnToHubFromVictory', function() {
            // Get fresh game reference (the captured 'game' variable may be stale)
            const currentGame = window.game;
            if (!currentGame) return;

            this.closeAll();
            // Save progress
            if (currentGame.saveMissionProgress) {
                currentGame.saveMissionProgress();
            }

            // Generate new agents for hire after each completed mission
            if (currentGame.generateNewAgentsForHire) {
                currentGame.generateNewAgentsForHire();
            }

            // Check if we're transitioning to a new act
            const completedMission = currentGame.currentMission;
            const completedMissionIndex = currentGame.currentMissionIndex;
            const missions = currentGame.missions || [];

            // Find next mission (if any)
            const nextMissionIndex = completedMissionIndex + 1;
            const nextMission = missions[nextMissionIndex];

            // Detect act transition: current mission's act is different from next mission's act
            if (completedMission && nextMission &&
                completedMission.act !== nextMission.act) {

                const nextActNumber = nextMission.act;
                const actIntroId = `act${nextActNumber}-intro`;

                // Check if act intro cutscene exists
                if (window.CUTSCENE_CONFIG?.cutscenes?.[actIntroId]) {
                    if (logger) logger.info(`🎬 Act transition detected: Act ${completedMission.act} → Act ${nextActNumber}`);

                    // Navigate to cutscene screen - cutscene's onComplete handles navigation to hub
                    if (window.screenManager) {
                        window.screenManager.navigateTo('cutscene', { cutsceneId: actIntroId });
                    }
                    return;
                }
            }

            // No act transition or no cutscene - go directly to hub
            if (currentGame.showSyndicateHub) {
                currentGame.showSyndicateHub();
            }
        });

        // Defeat actions
        engine.registerAction('retryMission', function() {
            if (logger) logger.info('🔄 retryMission handler running');
            const game = window.game; // Get current game reference
            this.closeAll();

            // CRITICAL: Use MissionStateService to restore snapshot
            // This properly restores agents, resources, inventory, RPG state
            if (game && game.gameServices?.missionStateService) {
                if (logger) logger.info('⏮️ Restoring pre-mission snapshot for retry');
                const restored = game.gameServices.missionStateService.restoreSnapshot(game);

                if (!restored) {
                    if (logger) logger.error('❌ Failed to restore snapshot');
                    return;
                }

                // Set flag so startMission knows this is a retry (don't create new snapshot)
                game._retryInProgress = true;
            } else {
                if (logger) logger.error('❌ MissionStateService not available');
                return;
            }

            // Reset MissionService status
            if (game.gameServices?.missionService) {
                if (logger) logger.info('🔄 Resetting MissionService for retry');
                game.gameServices.missionService.missionStatus = 'none';
                game.missionFailed = false;
            }

            // Restart mission
            if (game.startMission) {
                if (logger) logger.info('🔄 Restarting mission from index:', game.currentMissionIndex);
                game.startMission(game.currentMissionIndex);

                // Navigate to game screen
                if (window.screenManager) {
                    if (logger) logger.info('🔄 Navigating to game screen');
                    window.screenManager.navigateTo('game');
                }
            } else {
                if (logger) logger.error('❌ startMission not available');
            }
        });

        engine.registerAction('returnToHubFromDefeat', function() {
            if (logger) logger.info('🏠 returnToHubFromDefeat handler running');
            const game = window.game; // Get current game reference
            this.closeAll();

            // CRITICAL: Sync dead agents from mission to AgentService (PERMANENT deaths)
            if (game && game.agents && game.gameServices && game.gameServices.agentService) {
                if (logger) logger.info(`🔍 Checking ${game.agents.length} agents for deaths`);
                if (logger) logger.info(`📊 AgentService state: active=${game.gameServices.agentService.activeAgents.length}, fallen=${game.gameServices.agentService.fallenAgents.length}`);

                game.agents.forEach(missionAgent => {
                    if (logger) logger.info(`Agent: ${missionAgent.name}, alive: ${missionAgent.alive}, health: ${missionAgent.health}`);
                    if (!missionAgent.alive) {
                        // Find the corresponding active agent
                        const agentId = missionAgent.originalId || missionAgent.id || missionAgent.name;
                        if (logger) logger.info(`Looking for agent with ID: ${agentId}`);
                        const activeAgent = game.gameServices.agentService.getAgent(agentId);

                        if (activeAgent) {
                            if (logger) logger.info(`Found agent in service: alive=${activeAgent.alive}, hired=${activeAgent.hired}`);
                            if (activeAgent.alive) {
                                // Agent died in mission - kill them in AgentService
                                if (game.logger) game.logger.info(`☠️ Syncing death of ${missionAgent.name} to AgentService`);
                                game.gameServices.agentService.killAgent(agentId);
                            } else {
                                // Agent is already marked dead but might not be in fallenAgents
                                // Force move to fallenAgents if still in activeAgents
                                if (logger) logger.info(`Agent ${missionAgent.name} already dead - checking if in fallenAgents`);
                                const inActive = game.gameServices.agentService.activeAgents.includes(activeAgent);
                                const inFallen = game.gameServices.agentService.fallenAgents.includes(activeAgent);

                                if (inActive && !inFallen && activeAgent.hired) {
                                    if (logger) logger.info(`🔧 Agent is dead but still in activeAgents - moving to fallenAgents`);
                                    const index = game.gameServices.agentService.activeAgents.indexOf(activeAgent);
                                    if (index > -1) {
                                        game.gameServices.agentService.activeAgents.splice(index, 1);
                                        game.gameServices.agentService.fallenAgents.push(activeAgent);
                                    }
                                }
                            }
                        } else {
                            if (logger) logger.error(`❌ Agent ${missionAgent.name} not found in AgentService!`);
                        }
                    }
                });

                if (logger) logger.info(`📊 After sync: active=${game.gameServices.agentService.activeAgents.length}, fallen=${game.gameServices.agentService.fallenAgents.length}`);
            }

            // CRITICAL: Clear snapshot - we're accepting defeat and permanent deaths
            if (game.gameServices?.missionStateService) {
                if (logger) logger.info('🧹 Clearing mission snapshot (accepting defeat)');
                game.gameServices.missionStateService.clearSnapshot();
            }

            if (game && game.showSyndicateHub) {
                if (logger) logger.info('🏠 Calling game.showSyndicateHub()');
                game.showSyndicateHub();
            } else {
                if (logger) logger.error('❌ game.showSyndicateHub not available');
            }
        });

        // Briefing actions
        engine.registerAction('returnToHub', function() {
            this.closeAll();
            if (game && game.showSyndicateHub) {
                game.showSyndicateHub();
            }
        });

        // Loadout actions
        // toggleAgent removed - agent selection now handled directly in mission-briefing screen

        // startMissionWithLoadout and validateLoadoutSelection removed - functionality merged into mission briefing screen

        // New action for starting mission from briefing (with agent selection in briefing)
        engine.registerAction('startMissionFromBriefing', function() {
            this.closeAll();

            // NOTE: game.agents is now a computed property
            // It automatically filters activeAgents by selectedAgents
            if (game.selectedAgents && game.selectedAgents.length > 0) {
                // Check if there's an intro cutscene for this mission
                const missionId = game.currentMission?.id;
                const cutsceneId = missionId ? `mission-${missionId.replace('main-', '')}-intro` : null;

                if (cutsceneId && window.CUTSCENE_CONFIG?.cutscenes?.[cutsceneId]) {
                    // Navigate to cutscene screen - cutscene's onComplete handles starting gameplay
                    if (logger) logger.info(`🎬 Playing mission intro: ${cutsceneId}`);
                    if (window.screenManager) {
                        window.screenManager.navigateTo('cutscene', { cutsceneId: cutsceneId });
                    }
                } else {
                    // No cutscene, start mission directly
                    if (game.startMission) {
                        game.startMission(game.currentMissionIndex);
                    }
                    if (window.screenManager) {
                        window.screenManager.navigateTo('game');
                    }
                }
            }
        });

        // Hub initialization
        engine.registerAction('initializeHubScreen', function() {
            // CRITICAL: Disable 3D mode if active
            if (game && game.is3DMode) {
                if (logger) logger.debug('🔄 Disabling 3D mode when entering Hub');
                if (game.cleanup3D) game.cleanup3D();
            }

            // Hide all other screens (with safety checks for test mode)
            const elementsToHide = ['mainMenu', 'gameCompleteScreen', 'creditsScreen', 'endScreen', 'gameHUD', 'hallOfGlory'];
            elementsToHide.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            // Legacy dialogs removed - using declarative system

            // Capture previous screen before updating
            const previousScreen = game ? game.currentScreen : null;

            // Hub is now handled by screen manager
            if (game && game.showSyndicateHub) {
                game.showSyndicateHub();
            }
        });

        engine.registerAction('cleanupHubScreen', function() {
            // Hub cleanup now handled by screen manager
            // No manual DOM manipulation needed
        });

        // ========== WRAPPER FUNCTIONS ==========

        // Replace showIntermissionDialog with declarative version
        if (game && game.showIntermissionDialog) {
            const originalIntermission = game.showIntermissionDialog;
            game.showIntermissionDialog = function(victory) {
                if (engine && engine.navigateTo) {
                    engine.navigateTo(victory ? 'victory-screen' : 'defeat-screen');
                } else {
                    originalIntermission.call(this, victory);
                }
            };
        }

        // Replace showMissionBriefing with declarative version
        if (game && game.showMissionBriefing) {
            const originalBriefing = game.showMissionBriefing;
            game.showMissionBriefing = function(mission) {
                if (engine && engine.navigateTo) {
                    game.currentMission = mission;
                    engine.navigateTo('mission-briefing', { selectedMission: mission });
                } else {
                    originalBriefing.call(this, mission);
                }
            };
        }

        // Replace showSyndicateHub with declarative version (optional - hub is complex)
        // For now, we'll keep the original hub implementation since it's deeply integrated

        if (logger) logger.info('✅ Screen dialog integrations registered');
    }

    // Register when dialog engine is ready
    if (window.declarativeDialogEngine) {
        registerScreenIntegrations();
    } else {
        // Wait for engine to be initialized
        const checkInterval = setInterval(() => {
            if (window.declarativeDialogEngine) {
                clearInterval(checkInterval);
                registerScreenIntegrations();
            }
        }, 100);
    }
})();