/**
 * QuestService - Centralized quest and objective tracking
 * Manages main missions, side quests, and NPC interactions
 */

class QuestService {
    constructor(resourceService) {
        this.logger = window.Logger ? new window.Logger('QuestService') : null;

        // Dependencies
        this.resourceService = resourceService;

        // Quest state
        this.activeQuests = new Map(); // questId -> quest data
        this.completedQuests = new Set(); // questId
        this.failedQuests = new Set(); // questId
        this.questProgress = new Map(); // questId -> progress data

        // NPC quest associations
        this.npcQuests = new Map(); // npcId -> array of questIds
        this.questGivers = new Map(); // questId -> npcId

        // Quest chains and dependencies
        this.questChains = new Map(); // chainId -> array of questIds
        this.questPrerequisites = new Map(); // questId -> array of prerequisite questIds

        // Dialog state for quests
        this.dialogHistory = new Map(); // npcId -> array of dialog choices

        // Quest rewards tracking
        this.pendingRewards = [];
        this.claimedRewards = new Set();

        // Quest item inventory - tracks collected quest items
        // Syncs with game.inventory for legacy NPC quest system
        this.questInventory = {};

        if (this.logger) this.logger.info('QuestService initialized');
    }

    /**
     * Register a new quest
     */
    registerQuest(questData) {
        const quest = {
            id: questData.id,
            name: questData.name,
            description: questData.description,
            type: questData.type || 'side', // main, side, daily, achievement
            giver: questData.giver || null,
            objectives: this.parseObjectives(questData.objectives || []),
            rewards: questData.rewards || {},
            prerequisites: questData.prerequisites || [],
            chain: questData.chain || null,
            timeLimit: questData.timeLimit || null,
            autoComplete: questData.autoComplete !== false,
            hidden: questData.hidden || false,
            repeatable: questData.repeatable || false,
            metadata: questData.metadata || {}
        };

        // Store quest
        this.activeQuests.set(quest.id, quest);

        // Initialize progress
        this.questProgress.set(quest.id, {
            startTime: Date.now(),
            objectives: quest.objectives.map(obj => ({
                id: obj.id,
                completed: false,
                progress: 0,
                target: obj.target || 1
            }))
        });

        // Store NPC association
        if (quest.giver) {
            if (!this.npcQuests.has(quest.giver)) {
                this.npcQuests.set(quest.giver, []);
            }
            this.npcQuests.get(quest.giver).push(quest.id);
            this.questGivers.set(quest.id, quest.giver);
        }

        // Store chain information
        if (quest.chain) {
            if (!this.questChains.has(quest.chain)) {
                this.questChains.set(quest.chain, []);
            }
            this.questChains.get(quest.chain).push(quest.id);
        }

        // Store prerequisites
        if (quest.prerequisites.length > 0) {
            this.questPrerequisites.set(quest.id, quest.prerequisites);
        }

        if (this.logger) this.logger.info(`Quest registered: ${quest.name}`, quest);

        return quest.id;
    }

    /**
     * Parse quest objectives into standard format
     */
    parseObjectives(objectives) {
        return objectives.map(obj => ({
            id: obj.id || this.generateObjectiveId(),
            type: obj.type || 'custom', // kill, collect, reach, interact, survive, deliver
            description: obj.description,
            target: obj.target || 1,
            targetType: obj.targetType || null,
            targetId: obj.targetId || null,
            location: obj.location || null,
            optional: obj.optional || false,
            hidden: obj.hidden || false,
            onComplete: obj.onComplete || null
        }));
    }

    /**
     * Start a quest
     */
    startQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) {
            if (this.logger) this.logger.warn(`Quest not found: ${questId}`);
            return false;
        }

        // Check prerequisites
        if (!this.checkPrerequisites(questId)) {
            if (this.logger) this.logger.debug(`Prerequisites not met for quest: ${questId}`);
            return false;
        }

        // Mark quest as started
        const progress = this.questProgress.get(questId);
        if (progress) {
            progress.started = true;
            progress.startTime = Date.now();
        }

        if (this.logger) this.logger.info(`Quest started: ${quest.name}`);

        // Trigger quest start event
        this.onQuestStart(quest);

        return true;
    }

    /**
     * Update quest progress
     */
    updateProgress(questId, objectiveId, amount = 1) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        const progress = this.questProgress.get(questId);
        if (!progress) return false;

        const objective = progress.objectives.find(obj => obj.id === objectiveId);
        if (!objective) return false;

        // Update progress
        const wasCompleted = objective.completed;
        objective.progress = Math.min(objective.progress + amount, objective.target);

        // Check if objective completed
        if (!wasCompleted && objective.progress >= objective.target) {
            objective.completed = true;
            objective.completedTime = Date.now();

            if (this.logger) this.logger.debug(`Objective completed: ${objectiveId} for quest ${questId}`);

            // Run objective completion callback
            const questObjective = quest.objectives.find(o => o.id === objectiveId);
            if (questObjective?.onComplete) {
                this.executeCallback(questObjective.onComplete);
            }

            // Check if quest is complete
            this.checkQuestCompletion(questId);
        }

        return true;
    }

    /**
     * Update progress by event type
     */
    updateProgressByEvent(eventType, eventData) {
        let updated = false;

        // Check all active quests
        this.activeQuests.forEach((quest, questId) => {
            const progress = this.questProgress.get(questId);
            if (!progress || !progress.started) return;

            quest.objectives.forEach((objective, index) => {
                const objProgress = progress.objectives[index];
                if (objProgress.completed) return;

                // Match event to objective
                let shouldUpdate = false;

                switch (objective.type) {
                    case 'kill':
                        if (eventType === 'enemy_killed' &&
                            (!objective.targetType || objective.targetType === eventData.enemyType)) {
                            shouldUpdate = true;
                        }
                        break;

                    case 'collect':
                        if (eventType === 'item_collected' &&
                            (!objective.targetId || objective.targetId === eventData.itemId)) {
                            shouldUpdate = true;
                        }
                        break;

                    case 'reach':
                        if (eventType === 'location_reached' &&
                            objective.location === eventData.location) {
                            shouldUpdate = true;
                        }
                        break;

                    case 'interact':
                        if (eventType === 'object_interacted' &&
                            (!objective.targetId || objective.targetId === eventData.objectId)) {
                            shouldUpdate = true;
                        }
                        break;

                    case 'survive':
                        if (eventType === 'time_elapsed') {
                            shouldUpdate = true;
                        }
                        break;

                    case 'deliver':
                        if (eventType === 'item_delivered' &&
                            objective.targetId === eventData.itemId &&
                            objective.location === eventData.location) {
                            shouldUpdate = true;
                        }
                        break;
                }

                if (shouldUpdate) {
                    this.updateProgress(questId, objective.id, eventData.amount || 1);
                    updated = true;
                }
            });
        });

        return updated;
    }

    /**
     * Check if quest is complete
     */
    checkQuestCompletion(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        const progress = this.questProgress.get(questId);
        if (!progress) return false;

        // Check if all required objectives are complete
        const requiredObjectives = quest.objectives.filter(obj => !obj.optional);
        const completedRequired = requiredObjectives.every((obj, index) => {
            const objProgress = progress.objectives[index];
            return objProgress && objProgress.completed;
        });

        if (completedRequired) {
            if (quest.autoComplete) {
                this.completeQuest(questId);
            } else {
                // Mark as ready for turn-in
                progress.readyForTurnIn = true;
                if (this.logger) this.logger.info(`Quest ready for turn-in: ${quest.name}`);
            }
            return true;
        }

        return false;
    }

    /**
     * Complete a quest
     */
    completeQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        // Move to completed
        this.activeQuests.delete(questId);
        this.completedQuests.add(questId);

        // Store completion data
        const progress = this.questProgress.get(questId);
        if (progress) {
            progress.completedTime = Date.now();
            progress.completionTime = progress.completedTime - progress.startTime;
        }

        // Grant rewards
        this.grantRewards(quest.rewards);

        if (this.logger) this.logger.info(`Quest completed: ${quest.name}`, quest.rewards);

        // Trigger quest completion event
        this.onQuestComplete(quest);

        // Check for chain quests
        if (quest.chain) {
            this.activateNextInChain(quest.chain, questId);
        }

        return true;
    }

    /**
     * Fail a quest
     */
    failQuest(questId, reason = null) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        // Move to failed
        this.activeQuests.delete(questId);
        this.failedQuests.add(questId);

        // Store failure data
        const progress = this.questProgress.get(questId);
        if (progress) {
            progress.failedTime = Date.now();
            progress.failureReason = reason;
        }

        if (this.logger) this.logger.info(`Quest failed: ${quest.name}`, reason);

        // Trigger quest failure event
        this.onQuestFail(quest, reason);

        return true;
    }

    /**
     * Abandon a quest
     */
    abandonQuest(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return false;

        // Remove from active
        this.activeQuests.delete(questId);

        // Reset progress
        this.questProgress.delete(questId);

        if (this.logger) this.logger.info(`Quest abandoned: ${quest.name}`);

        return true;
    }

    /**
     * Grant quest rewards
     */
    grantRewards(rewards) {
        if (!rewards) return;

        // Grant credits
        if (rewards.credits && this.resourceService) {
            this.resourceService.addCredits(rewards.credits);
        }

        // Grant research points
        if (rewards.researchPoints && this.resourceService) {
            this.resourceService.addResearchPoints(rewards.researchPoints);
        }

        // Grant XP
        if (rewards.experience && window.GameServices?.rpgService) {
            // Apply to active agents
            const agents = window.GameServices.agentService?.getActiveAgents() || [];
            agents.forEach(agent => {
                window.GameServices.rpgService.addExperience(agent.id, rewards.experience);
            });
        }

        // Grant items
        if (rewards.items && window.GameServices?.inventoryService) {
            rewards.items.forEach(item => {
                window.GameServices.inventoryService.addItem(item.type, item.id, item.count || 1);
            });
        }

        // Grant unlocks
        if (rewards.unlocks) {
            rewards.unlocks.forEach(unlock => {
                this.unlockContent(unlock);
            });
        }

        // Store custom rewards for later processing
        if (rewards.custom) {
            this.pendingRewards.push({
                timestamp: Date.now(),
                rewards: rewards.custom
            });
        }
    }

    /**
     * Check quest prerequisites
     */
    checkPrerequisites(questId) {
        const prerequisites = this.questPrerequisites.get(questId);
        if (!prerequisites || prerequisites.length === 0) return true;

        return prerequisites.every(prereq => {
            if (typeof prereq === 'string') {
                // Quest ID prerequisite
                return this.completedQuests.has(prereq);
            } else if (typeof prereq === 'object') {
                // Complex prerequisite
                return this.checkComplexPrerequisite(prereq);
            }
            return false;
        });
    }

    /**
     * Check complex prerequisite
     */
    checkComplexPrerequisite(prereq) {
        switch (prereq.type) {
            case 'level':
                // Check agent level
                const agents = window.GameServices?.agentService?.getActiveAgents() || [];
                return agents.some(agent => (agent.level || 1) >= prereq.value);

            case 'resource':
                // Check resource amount
                if (prereq.resource === 'credits') {
                    return (this.resourceService?.getCredits() || 0) >= prereq.value;
                }
                return false;

            case 'reputation':
                // Check faction reputation (future feature)
                return true;

            default:
                return false;
        }
    }

    /**
     * Activate next quest in chain
     */
    activateNextInChain(chainId, currentQuestId) {
        const chain = this.questChains.get(chainId);
        if (!chain) return;

        const currentIndex = chain.indexOf(currentQuestId);
        if (currentIndex === -1 || currentIndex >= chain.length - 1) return;

        const nextQuestId = chain[currentIndex + 1];
        this.startQuest(nextQuestId);
    }

    /**
     * Get quests for NPC
     */
    getQuestsForNPC(npcId) {
        const questIds = this.npcQuests.get(npcId) || [];
        return questIds.map(id => this.activeQuests.get(id)).filter(q => q);
    }

    /**
     * Get quest by ID
     */
    getQuest(questId) {
        return this.activeQuests.get(questId);
    }

    /**
     * Get quest progress
     */
    getQuestProgress(questId) {
        return this.questProgress.get(questId);
    }

    /**
     * Get all active quests
     */
    getActiveQuests() {
        return Array.from(this.activeQuests.values());
    }

    /**
     * Get completed quests
     */
    getCompletedQuests() {
        return Array.from(this.completedQuests);
    }

    /**
     * Get quest summary for UI
     */
    getQuestSummary(questId) {
        const quest = this.activeQuests.get(questId);
        if (!quest) return null;

        const progress = this.questProgress.get(questId);
        if (!progress) return null;

        return {
            id: quest.id,
            name: quest.name,
            description: quest.description,
            type: quest.type,
            objectives: quest.objectives.map((obj, index) => ({
                description: obj.description,
                progress: progress.objectives[index].progress,
                target: progress.objectives[index].target,
                completed: progress.objectives[index].completed,
                optional: obj.optional
            })),
            rewards: quest.rewards,
            readyForTurnIn: progress.readyForTurnIn || false
        };
    }

    /**
     * Record dialog choice
     */
    recordDialogChoice(npcId, choiceId) {
        if (!this.dialogHistory.has(npcId)) {
            this.dialogHistory.set(npcId, []);
        }

        this.dialogHistory.get(npcId).push({
            choiceId: choiceId,
            timestamp: Date.now()
        });
    }

    /**
     * Get dialog history for NPC
     */
    getDialogHistory(npcId) {
        return this.dialogHistory.get(npcId) || [];
    }

    /**
     * Quest lifecycle callbacks
     */
    onQuestStart(quest) {
        // Override in implementation
        if (this.logger) this.logger.debug('Quest started:', quest.name);
    }

    onQuestComplete(quest) {
        // Override in implementation
        if (this.logger) this.logger.debug('Quest completed:', quest.name);
    }

    onQuestFail(quest, reason) {
        // Override in implementation
        if (this.logger) this.logger.debug('Quest failed:', quest.name, reason);
    }

    /**
     * Execute callback
     */
    executeCallback(callback) {
        if (typeof callback === 'function') {
            callback();
        } else if (typeof callback === 'string') {
            // Execute named callback
            if (window[callback]) {
                window[callback]();
            }
        }
    }

    /**
     * Unlock content
     */
    unlockContent(unlockId) {
        // Implementation depends on game structure
        if (this.logger) this.logger.info(`Content unlocked: ${unlockId}`);
    }

    /**
     * Generate unique objective ID
     */
    generateObjectiveId() {
        return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Save quest state
     */
    saveState() {
        return {
            activeQuests: Array.from(this.activeQuests.entries()),
            completedQuests: Array.from(this.completedQuests),
            failedQuests: Array.from(this.failedQuests),
            questProgress: Array.from(this.questProgress.entries()),
            dialogHistory: Array.from(this.dialogHistory.entries()),
            pendingRewards: this.pendingRewards,
            questInventory: this.questInventory
        };
    }

    /**
     * Load quest state
     */
    loadState(state) {
        if (!state) return;

        this.activeQuests = new Map(state.activeQuests || []);
        this.completedQuests = new Set(state.completedQuests || []);
        this.failedQuests = new Set(state.failedQuests || []);
        this.questProgress = new Map(state.questProgress || []);
        this.dialogHistory = new Map(state.dialogHistory || []);
        this.pendingRewards = state.pendingRewards || [];
        this.questInventory = state.questInventory || {};

        if (this.logger) this.logger.info('Quest state loaded');
    }

    /**
     * Get quest inventory (for save system)
     */
    getQuestInventory() {
        // Sync from game.inventory if available
        if (window.game && window.game.inventory) {
            this.questInventory = { ...window.game.inventory };
        }
        return this.questInventory;
    }

    /**
     * Set quest inventory item
     */
    setQuestItem(itemId, count) {
        this.questInventory[itemId] = count;
        // Sync to game.inventory
        if (window.game) {
            window.game.inventory = window.game.inventory || {};
            window.game.inventory[itemId] = count;
        }
    }

    /**
     * Add quest item
     */
    addQuestItem(itemId, count = 1) {
        this.questInventory[itemId] = (this.questInventory[itemId] || 0) + count;
        // Sync to game.inventory
        if (window.game) {
            window.game.inventory = window.game.inventory || {};
            window.game.inventory[itemId] = (window.game.inventory[itemId] || 0) + count;
        }
        if (this.logger) this.logger.info(`Quest item added: ${itemId} x${count}`);
    }

    /**
     * Load quest data from save (for save-game-service)
     */
    loadQuestData(data) {
        if (!data) return;

        // Load quest inventory
        if (data.questInventory) {
            this.questInventory = data.questInventory;
            // Sync to game.inventory
            if (window.game) {
                window.game.inventory = { ...data.questInventory };
            }
        }

        // Load active/completed quests
        if (data.active) {
            this.activeQuests = new Map(data.active.map(q => [q.id, q]));
        }
        if (data.completed) {
            this.completedQuests = new Set(data.completed);
            // Sync to game.completedQuests
            if (window.game) {
                window.game.completedQuests = new Set(data.completed);
            }
        }

        if (this.logger) this.logger.info('Quest data loaded from save');
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.QuestService = QuestService;
}