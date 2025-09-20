/**
 * Game Screen Dialog Integration
 * Connects declarative screen configs to game functions
 * Following DIALOG_CONVERSION_GUIDE.md extraction patterns
 */

(function() {
    // Wait for dialog engine to be available
    function registerScreenIntegrations() {
        const engine = window.declarativeDialogEngine;
        if (!engine) {
            console.warn('Dialog engine not ready for screen integrations');
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
        engine.registerGenerator('generateLoadoutContent', function() {
            if (!game || !game.activeAgents) {
                return '<p>No agents available</p>';
            }

            const selectedAgents = game.selectedAgents || [];
            const maxAgents = 4; // Maximum agents per mission

            const data = {
                availableAgents: game.activeAgents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    class: agent.class || 'Soldier',
                    health: agent.health,
                    damage: agent.damage,
                    speed: agent.speed,
                    weapon: agent.weapon || 'Assault Rifle',
                    armor: agent.armor || 'Standard',
                    selected: selectedAgents.includes(agent.id)
                })),
                selectedCount: selectedAgents.length,
                maxAgents: maxAgents,
                insufficientAgents: selectedAgents.length === 0,
                totalDamage: selectedAgents.reduce((sum, id) => {
                    const agent = game.activeAgents.find(a => a.id === id);
                    return sum + (agent?.damage || 0);
                }, 0),
                avgHealth: selectedAgents.length > 0 ?
                    Math.round(selectedAgents.reduce((sum, id) => {
                        const agent = game.activeAgents.find(a => a.id === id);
                        return sum + (agent?.health || 0);
                    }, 0) / selectedAgents.length) : 0,
                teamSpeed: selectedAgents.length > 0 ?
                    Math.round(selectedAgents.reduce((sum, id) => {
                        const agent = game.activeAgents.find(a => a.id === id);
                        return sum + (agent?.speed || 0);
                    }, 0) / selectedAgents.length) : 0,
                medkits: game.inventory?.medkits || 3,
                grenades: game.inventory?.grenades || 5,
                smokeBombs: game.inventory?.smokeBombs || 2
            };

            return engine.renderTemplate('loadout-selection', data);
        });

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
            this.closeAll();
            // Reload from pre-mission save
            if (game) {
                if (game.loadPreMissionSave) {
                    game.loadPreMissionSave();
                } else if (game.startMission) {
                    // Restart current mission
                    game.startMission(game.currentMissionIndex);
                }
            }
        });

        engine.registerAction('returnToHubFromDefeat', function() {
            this.closeAll();
            if (game && game.showSyndicateHub) {
                game.showSyndicateHub();
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
        engine.registerAction('toggleAgent', function(agentId) {
            if (game && !game.selectedAgents) {
                game.selectedAgents = [];
            }

            const index = game.selectedAgents.indexOf(agentId);
            if (index > -1) {
                game.selectedAgents.splice(index, 1);
            } else if (game.selectedAgents.length < 4) {
                game.selectedAgents.push(agentId);
            }

            // Refresh the loadout display
            this.navigateTo('loadout-select', null, true);
        });

        engine.registerAction('startMissionWithLoadout', function() {
            if (!game || !game.selectedAgents || game.selectedAgents.length === 0) {
                // Show error - need at least one agent
                return;
            }

            this.closeAll();

            // Apply selected loadout
            if (game.activeAgents && game.selectedAgents) {
                game.agents = game.activeAgents.filter(agent =>
                    game.selectedAgents.includes(agent.id)
                );
            }

            // Start the mission
            if (game.startMission) {
                game.startMission(game.currentMissionIndex);
            }
        });

        // Validation
        engine.registerValidator('validateLoadoutSelection', function() {
            return game && game.selectedAgents && game.selectedAgents.length > 0;
        });

        // Hub initialization
        engine.registerAction('initializeHubScreen', function() {
            // Show the hub DOM element
            const hubElement = document.getElementById('syndicateHub');
            if (hubElement) {
                hubElement.style.display = 'flex';
            }

            // Update hub statistics
            if (game.updateHubStats) {
                game.updateHubStats();
            }

            // Start hub music
            if (game.loadScreenMusic) {
                game.loadScreenMusic('hub');
            }
        });

        engine.registerAction('cleanupHubScreen', function() {
            // Hide the hub DOM element when leaving
            const hubElement = document.getElementById('syndicateHub');
            if (hubElement) {
                hubElement.style.display = 'none';
            }
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

        console.log('✅ Screen dialog integrations registered');
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