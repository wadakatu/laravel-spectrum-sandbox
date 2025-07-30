// Main application entry point
let terminalManager = null;
let fileExplorer = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize terminal
    terminalManager = new TerminalManager();
    window.terminalManager = terminalManager;
    
    try {
        await terminalManager.initialize();
        
        // Initialize file explorer
        fileExplorer = new FileExplorer(terminalManager);
        window.fileExplorer = fileExplorer;
        
        // Initialize code editor
        const editor = new CodeEditor();
        window.codeEditor = editor;
        await editor.init(terminalManager.sessionId);
        
        // Load initial file tree
        await fileExplorer.refresh();
        
        console.log('Sandbox initialized successfully');
    } catch (error) {
        console.error('Failed to initialize sandbox:', error);
        document.getElementById('terminal').innerHTML = 
            '<div style="color: red; padding: 20px;">Failed to initialize terminal. Please refresh the page.</div>';
    }
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, could pause operations
    } else {
        // Page is visible again, could resume operations
        if (terminalManager && terminalManager.socket && 
            terminalManager.socket.readyState === WebSocket.CLOSED) {
            terminalManager.connectWebSocket();
        }
    }
});

// Global functions for editor
window.toggleTemplateDropdown = function() {
    const dropdown = document.getElementById('template-dropdown');
    dropdown.classList.toggle('show');
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
        if (!e.target.closest('.template-selector')) {
            dropdown.classList.remove('show');
            document.removeEventListener('click', closeDropdown);
        }
    });
}

window.loadTemplate = function(templateName) {
    if (window.codeEditor) {
        window.codeEditor.loadTemplate(templateName);
        document.getElementById('template-dropdown').classList.remove('show');
    }
}

window.saveFile = function() {
    if (window.codeEditor) {
        window.codeEditor.saveCurrentFile();
    }
}
