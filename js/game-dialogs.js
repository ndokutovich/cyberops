    // HUD Dialog System
CyberOpsGame.prototype.showHudDialog = function(title, message, buttons) {
        document.getElementById('dialogTitle').textContent = title;
        document.getElementById('dialogBody').innerHTML = message;

        const actionsDiv = document.getElementById('dialogActions');
        actionsDiv.innerHTML = '';

        // Use global game instance to ensure correct context
        const gameInstance = window.game || this;

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'menu-button';
            button.textContent = btn.text;

            // Directly set onclick to ensure it works
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Dialog button clicked:', btn.text);

                if (btn.action === 'close') {
                    console.log('Closing dialog...');
                    gameInstance.closeDialog();
                } else if (typeof btn.action === 'function') {
                    console.log('Executing action function...');
                    try {
                        // Just call the function - arrow functions will maintain their context
                        btn.action();
                    } catch (err) {
                        console.error('Error executing dialog action:', err);
                    }
                } else {
                    console.log('Unknown action type:', btn.action);
                }
            });

            actionsDiv.appendChild(button);
        });

        document.getElementById('hudDialog').classList.add('show');
}

CyberOpsGame.prototype.closeDialog = function() {
        document.getElementById('hudDialog').classList.remove('show');

        // If we're closing the pause menu, also resume the game
        const dialogTitle = document.getElementById('dialogTitle');
        if (dialogTitle && dialogTitle.textContent === '⏸ GAME PAUSED' && this.isPaused) {
            // Directly resume the game without calling resumeFromPause (avoid recursion)
            this.isPaused = false;
            const pauseButton = document.querySelector('.pause-button');
            if (pauseButton) {
                pauseButton.textContent = '⏸';
            }
            this.resumeLevelMusic();
        }
}

