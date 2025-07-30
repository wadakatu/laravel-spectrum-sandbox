// Command Palette functionality
window.runCommand = function(command, buttonElement) {
    if (window.terminalManager) {
        // Add visual feedback
        if (buttonElement && buttonElement.target) {
            const btn = buttonElement.target.closest('.command-btn');
            if (btn) {
                // Add running state
                btn.classList.add('command-running');
                
                // Show running indicator
                const originalContent = btn.innerHTML;
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = 'bi bi-hourglass-split spin';
                }
                
                // Run the command
                window.terminalManager.runCommand(command);
                
                // Remove running state after a delay
                setTimeout(() => {
                    btn.classList.remove('command-running');
                    btn.innerHTML = originalContent;
                }, 2000);
            }
        } else {
            // Fallback if no button element
            window.terminalManager.runCommand(command);
        }
    }
};;

window.clearTerminal = function() {
    if (window.terminalManager) {
        window.terminalManager.clear();
    }
};

window.resetEnvironment = async function() {
    if (!confirm('Are you sure you want to reset the environment? All changes will be lost.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/sessions/${window.terminalManager.sessionId}/reset`, {
            method: 'POST'
        });
        
        if (response.ok) {
            // Reload the page to get a fresh environment
            window.location.reload();
        } else {
            alert('Failed to reset environment');
        }
    } catch (error) {
        console.error('Reset error:', error);
        alert('Failed to reset environment');
    }
};

window.downloadFiles = async function() {
    try {
        const response = await fetch(`/api/sessions/${window.terminalManager.sessionId}/download`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.downloadUrl) {
            // Create a temporary link and click it
            const link = document.createElement('a');
            link.href = data.downloadUrl;
            link.download = 'spectrum-output.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download files');
    }
};

window.refreshFileTree = function() {
    if (window.fileExplorer) {
        window.fileExplorer.refresh();
    }
};

window.loadOutput = async function() {
    const selector = document.getElementById('output-selector');
    const viewer = document.getElementById('output-viewer');
    const previewBtn = document.getElementById('swagger-preview-btn');
    
    if (!selector.value) {
        viewer.textContent = '';
        previewBtn.style.display = 'none';
        return;
    }
    
    // Show preview button only for OpenAPI files
    if (selector.value === 'openapi.json' || selector.value === 'openapi.yaml') {
        previewBtn.style.display = 'inline-flex';
    } else {
        previewBtn.style.display = 'none';
    }
    
    try {
        const response = await fetch(`/api/sessions/${window.terminalManager.sessionId}/output/${selector.value}`);
        const content = await response.json();
        
        // Pretty print JSON
        viewer.textContent = JSON.stringify(content, null, 2);
    } catch (error) {
        console.error('Failed to load output:', error);
        viewer.textContent = 'Failed to load output file';
    }
};

window.previewInSwagger = function() {
    const selector = document.getElementById('output-selector');
    
    if (!selector.value || !window.terminalManager || !window.terminalManager.sessionId) {
        alert('Please select an OpenAPI file first');
        return;
    }
    
    // Open Swagger UI in a new window
    const width = 1200;
    const height = 800;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    const url = `/swagger-preview.html?session=${window.terminalManager.sessionId}&file=${selector.value}`;
    
    window.open(
        url,
        'swagger-preview',
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
};
