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