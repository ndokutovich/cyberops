/**
 * Modal Engine Usage Examples
 * This file demonstrates how to use the unified modal engine for all dialog types
 */

// ============================================
// Example 1: Simple Confirmation Dialog
// ============================================
function showConfirmDialog() {
    window.modalEngine.show({
        type: 'standard',
        title: '⚠️ CONFIRM ACTION',
        content: 'Are you sure you want to proceed with this action?',
        buttons: [
            {
                text: 'CONFIRM',
                primary: true,
                action: () => {
                    console.log('Confirmed!');
                    // Your confirmation logic here
                }
            },
            {
                text: 'CANCEL',
                action: 'close'
            }
        ]
    });
}

// ============================================
// Example 2: Information Dialog
// ============================================
function showInfoDialog() {
    window.modalEngine.show({
        type: 'standard',
        title: 'ℹ️ SYSTEM INFORMATION',
        content: `
            <div style="line-height: 1.8;">
                <p><strong>Version:</strong> 1.0.0</p>
                <p><strong>Status:</strong> <span style="color: #00ff41;">ONLINE</span></p>
                <p><strong>Resources:</strong> 5000 credits</p>
                <p><strong>Agents:</strong> 4 active</p>
            </div>
        `,
        buttons: [
            { text: 'OK', action: 'close' }
        ]
    });
}

// ============================================
// Example 3: NPC Dialog with Choices
// ============================================
function showNPCConversation() {
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        avatar: '🤖',
        name: 'CIPHER',
        text: 'Welcome to the underground network. I have information that might interest you... for a price.',
        choices: [
            {
                text: 'What information do you have?',
                action: () => {
                    console.log('Asking for information...');
                    showNPCFollowup();
                }
            },
            {
                text: 'How much will it cost?',
                action: () => {
                    console.log('Asking about price...');
                    showPriceDialog();
                }
            },
            {
                text: 'Not interested.',
                action: () => {
                    console.log('Declining offer...');
                }
            }
        ]
    });
}

// ============================================
// Example 4: Equipment Management Dialog
// ============================================
function showEquipmentDialog() {
    window.modalEngine.show({
        type: 'equipment',
        size: 'large',
        title: 'EQUIPMENT MANAGEMENT',
        icon: '🎯',
        sections: [
            {
                title: 'AGENTS',
                flex: 1,
                content: `
                    <div class="agent-list">
                        <div class="agent-item">Agent Alpha</div>
                        <div class="agent-item">Agent Beta</div>
                        <div class="agent-item">Agent Gamma</div>
                    </div>
                `
            },
            {
                title: 'WEAPONS',
                flex: 2,
                content: `
                    <div class="weapon-grid">
                        <div class="weapon-item">Pulse Rifle</div>
                        <div class="weapon-item">Plasma Pistol</div>
                        <div class="weapon-item">EMP Grenade</div>
                    </div>
                `
            },
            {
                title: 'ARMOR',
                flex: 1,
                content: `
                    <div class="armor-list">
                        <div class="armor-item">Kevlar Vest</div>
                        <div class="armor-item">Energy Shield</div>
                    </div>
                `
            }
        ],
        buttons: [
            { text: 'SAVE LOADOUT', action: () => console.log('Saving loadout...') },
            { text: 'AUTO-OPTIMIZE', primary: true, action: () => console.log('Optimizing...') },
            { text: 'CLOSE', action: 'close' }
        ]
    });
}

// ============================================
// Example 5: Save/Load List Dialog
// ============================================
function showSaveGameList() {
    const saves = [
        {
            title: 'Quick Save',
            subtitle: '2024-01-15 14:30:45',
            icon: '💾'
        },
        {
            title: 'Mission 3 Start',
            subtitle: '2024-01-15 12:15:22',
            icon: '🎯'
        },
        {
            title: 'Before Boss Fight',
            subtitle: '2024-01-14 22:45:10',
            icon: '⚔️'
        }
    ];

    window.modalEngine.show({
        type: 'list',
        size: 'medium',
        title: '💾 LOAD GAME',
        items: saves.map((save, index) => ({
            ...save,
            actions: [
                {
                    type: 'load',
                    label: 'LOAD',
                    handler: (item) => {
                        console.log('Loading save:', item.title);
                        window.modalEngine.closeAll();
                    }
                },
                {
                    type: 'delete',
                    label: 'DELETE',
                    handler: (item) => {
                        console.log('Deleting save:', item.title);
                        // Update the list after deletion
                    }
                }
            ]
        })),
        buttons: [
            { text: 'CANCEL', action: 'close' }
        ]
    });
}

// ============================================
// Example 6: Progress Dialog (Non-closeable)
// ============================================
function showProgressDialog() {
    const progressModal = window.modalEngine.show({
        type: 'standard',
        title: '⏳ PROCESSING',
        content: '<div style="text-align: center;">Loading mission data...</div>',
        closeButton: false,
        backdrop: true,
        closeOnBackdrop: false,
        buttons: [] // No buttons - programmatically controlled
    });

    // Simulate progress updates
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        progressModal.update({
            content: `
                <div style="text-align: center;">
                    <p>Loading mission data...</p>
                    <div style="width: 100%; background: rgba(0,255,255,0.2); border: 1px solid #00ffff; height: 20px;">
                        <div style="width: ${progress}%; background: #00ffff; height: 100%; transition: width 0.3s;"></div>
                    </div>
                    <p>${progress}%</p>
                </div>
            `
        });

        if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                progressModal.close();
                showSuccessDialog();
            }, 500);
        }
    }, 300);
}

// ============================================
// Example 7: Multi-Step Dialog
// ============================================
function showMultiStepDialog() {
    let currentStep = 1;
    const totalSteps = 3;

    const modal = window.modalEngine.show({
        type: 'standard',
        title: `MISSION BRIEFING - STEP ${currentStep}/${totalSteps}`,
        content: getStepContent(currentStep),
        buttons: [
            {
                text: 'PREVIOUS',
                action: () => {
                    if (currentStep > 1) {
                        currentStep--;
                        updateStep();
                    }
                },
                closeAfter: false
            },
            {
                text: 'NEXT',
                primary: true,
                action: () => {
                    if (currentStep < totalSteps) {
                        currentStep++;
                        updateStep();
                    } else {
                        modal.close();
                        console.log('Mission briefing complete!');
                    }
                },
                closeAfter: false
            }
        ]
    });

    function updateStep() {
        modal.update({
            title: `MISSION BRIEFING - STEP ${currentStep}/${totalSteps}`,
            content: getStepContent(currentStep)
        });
    }

    function getStepContent(step) {
        const contents = {
            1: '<h3>Objective</h3><p>Infiltrate the corporate facility and retrieve the data.</p>',
            2: '<h3>Intel</h3><p>Guards patrol every 5 minutes. Security cameras are on the east side.</p>',
            3: '<h3>Loadout</h3><p>Recommended: Stealth gear and EMP grenades.</p>'
        };
        return contents[step];
    }
}

// ============================================
// Example 8: Custom Styled Dialog
// ============================================
function showCustomStyledDialog() {
    window.modalEngine.show({
        type: 'standard',
        size: 'large',
        title: '🌟 ACHIEVEMENT UNLOCKED',
        content: `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🏆</div>
                <h2 style="color: #00ff41; margin-bottom: 10px;">MASTER INFILTRATOR</h2>
                <p style="color: #888; margin-bottom: 20px;">Complete a mission without being detected</p>
                <div style="display: flex; justify-content: center; gap: 20px; margin-top: 30px;">
                    <div style="text-align: center;">
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">500</div>
                        <div style="color: #888; font-size: 12px;">XP EARNED</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: #00ffff; font-size: 24px; font-weight: bold;">1000</div>
                        <div style="color: #888; font-size: 12px;">CREDITS</div>
                    </div>
                </div>
            </div>
        `,
        buttons: [
            { text: 'AWESOME!', primary: true, action: 'close' }
        ]
    });
}

// ============================================
// Example 9: Error Dialog
// ============================================
function showErrorDialog(errorMessage) {
    window.modalEngine.show({
        type: 'standard',
        title: '❌ ERROR',
        content: `
            <div style="color: #ff073a;">
                <p><strong>An error occurred:</strong></p>
                <p style="font-family: monospace; background: rgba(255,7,58,0.1); padding: 10px; border-radius: 5px;">
                    ${errorMessage || 'Unknown error'}
                </p>
            </div>
        `,
        buttons: [
            { text: 'REPORT', action: () => console.log('Reporting error...') },
            { text: 'DISMISS', action: 'close' }
        ]
    });
}

// ============================================
// Example 10: Dynamic NPC Dialog Chain
// ============================================
function startNPCQuestDialog() {
    const npc = {
        avatar: '👨‍💼',
        name: 'THE BROKER'
    };

    // First dialog
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        ...npc,
        text: 'I have a job that requires... discretion. Are you interested?',
        choices: [
            {
                text: 'Tell me more about the job.',
                action: () => showQuestDetails(npc)
            },
            {
                text: 'What\'s the pay?',
                action: () => showPaymentDialog(npc)
            },
            {
                text: 'I\'ll pass.',
                action: () => console.log('Quest declined')
            }
        ]
    });
}

function showQuestDetails(npc) {
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        ...npc,
        text: 'There\'s a data chip in the Nexus Corp building. Floor 47, server room. I need it retrieved... quietly.',
        choices: [
            {
                text: 'I\'ll take the job.',
                action: () => {
                    console.log('Quest accepted!');
                    // Add quest to player's quest log
                }
            },
            {
                text: 'Too risky for me.',
                action: () => console.log('Quest declined')
            }
        ]
    });
}

function showPaymentDialog(npc) {
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        ...npc,
        text: '10,000 credits up front, 20,000 on completion. Plus, I\'ll throw in some military-grade equipment.',
        choices: [
            {
                text: 'Deal. Tell me about the job.',
                action: () => showQuestDetails(npc)
            },
            {
                text: 'Not enough for the risk.',
                action: () => console.log('Negotiating price...')
            }
        ]
    });
}

// ============================================
// Helper Functions
// ============================================

function showSuccessDialog() {
    window.modalEngine.show({
        type: 'standard',
        title: '✅ SUCCESS',
        content: '<p style="text-align: center; color: #00ff41;">Operation completed successfully!</p>',
        buttons: [{ text: 'CONTINUE', primary: true, action: 'close' }]
    });
}

function showNPCFollowup() {
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        avatar: '🤖',
        name: 'CIPHER',
        text: 'The corporation is planning something big. I have the blueprints to their new facility.',
        choices: [
            { text: 'I\'ll buy the blueprints.', action: () => console.log('Purchasing...') },
            { text: 'Maybe later.', action: () => console.log('Postponing...') }
        ]
    });
}

function showPriceDialog() {
    window.modalEngine.show({
        type: 'npc',
        position: 'bottom',
        avatar: '🤖',
        name: 'CIPHER',
        text: '5000 credits. Non-negotiable. This information could save your life.',
        choices: [
            { text: 'Deal.', action: () => console.log('Transaction complete') },
            { text: 'Too expensive.', action: () => console.log('Declining offer') }
        ]
    });
}