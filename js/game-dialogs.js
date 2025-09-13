    // HUD Dialog System
CyberOpsGame.prototype.showHudDialog = function(title, message, buttons) {
        document.getElementById('dialogTitle').textContent = title;
        document.getElementById('dialogBody').innerHTML = message;
        
        const actionsDiv = document.getElementById('dialogActions');
        actionsDiv.innerHTML = '';
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.className = 'menu-button';
            button.textContent = btn.text;
            button.onclick = () => {
                if (btn.action === 'close') {
                    this.closeDialog();
                } else if (typeof btn.action === 'function') {
                    btn.action();
                    this.closeDialog();
                }
            };
            actionsDiv.appendChild(button);
        });
        
        document.getElementById('hudDialog').classList.add('show');
}

CyberOpsGame.prototype.closeDialog = function() {
        document.getElementById('hudDialog').classList.remove('show');
}

