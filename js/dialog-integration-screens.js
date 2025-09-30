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

            const data = {
                enemiesKilled: missionSummary.enemiesKilled || 0,
                totalEnemies: missionSummary.totalEnemies || 0,
                objectivesCompleted: missionSummary.objectivesCompleted || 0,
                totalObjectives: missionSummary.totalObjectives || 0,
                agentsLost: missionSummary.agentsLost || 0,
                missionTime: missionSummary.missionTime || '00:00',
                creditsEarned: missionSummary.totalCredits || 0,
                researchPoints: missionSummary.researchPoints || 0,
                worldControl: missionSummary.worldControl || 0,
                bonusObjectives: missionSummary.bonusObjectives || []
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
                game.currentMissionIndex++;
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
            this.closeAll();
            // Save progress
            if (game && game.saveMissionProgress) {
                game.saveMissionProgress();
            }
            if (game && game.showSyndicateHub) {
                game.showSyndicateHub();
            }
        });

        // Defeat actions
        engine.registerAction('retryMission', function() {
            if (logger) logger.info('🔄 retryMission handler running');
            const game = window.game; // Get current game reference
            this.closeAll();
            // Reload from pre-mission save
            if (game) {
                if (game.loadPreMissionSave) {
                    if (logger) logger.info('🔄 Loading pre-mission save');
                    game.loadPreMissionSave();
                } else if (game.startMission) {
                    if (logger) logger.info('🔄 Restarting mission from index:', game.currentMissionIndex);
                    // Restart current mission
                    game.startMission(game.currentMissionIndex);
                } else {
                    if (logger) logger.error('❌ No retry method available');
                }
            } else {
                if (logger) logger.error('❌ game not available');
            }
        });

        engine.registerAction('returnToHubFromDefeat', function() {
            if (logger) logger.info('🏠 returnToHubFromDefeat handler running');
            const game = window.game; // Get current game reference
            this.closeAll();

            // CRITICAL: Sync dead agents from mission to AgentService
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

            // Apply selected agents
            if (game.activeAgents && game.selectedAgents && game.selectedAgents.length > 0) {
                game.agents = game.activeAgents.filter(agent =>
                    game.selectedAgents.includes(agent.id)
                );

                // Start the mission
                if (game.startMission) {
                    game.startMission(game.currentMissionIndex);
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