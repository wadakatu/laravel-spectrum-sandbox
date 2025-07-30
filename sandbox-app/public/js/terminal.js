// Terminal Manager
class TerminalManager {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.socket = null;
        this.version = this.getVersionFromUrl();
        this.sessionId = this.generateSessionId();
    }

    getVersionFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('version') || 'laravel-11';
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2, 15);
    }

    async initialize() {
        // Create terminal
        this.terminal = new Terminal({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: 'Consolas, Monaco, monospace',
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selection: '#264f78',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
                brightBlack: '#666666',
                brightRed: '#f14c4c',
                brightGreen: '#23d18b',
                brightYellow: '#f5f543',
                brightBlue: '#3b8eea',
                brightMagenta: '#d670d6',
                brightCyan: '#29b8db',
                brightWhite: '#e5e5e5'
            }
        });

        // Add fit addon
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);

        // Add web links addon
        const webLinksAddon = new WebLinksAddon.WebLinksAddon();
        this.terminal.loadAddon(webLinksAddon);

        // Open terminal
        this.terminal.open(document.getElementById('terminal'));
        this.fitAddon.fit();

        // Connect WebSocket
        await this.connectWebSocket();

        // Handle resize
        window.addEventListener('resize', () => {
            this.fitAddon.fit();
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'resize',
                    cols: this.terminal.cols,
                    rows: this.terminal.rows
                }));
            }
        });

        // Handle input
        this.terminal.onData(data => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    type: 'input',
                    data: data
                }));
            }
        });

        // Update UI
        document.getElementById('environment-name').textContent = 
            this.formatVersionName(this.version);
    }

    async connectWebSocket() {
        return new Promise((resolve, reject) => {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.hostname}:8088/terminal/${this.version}`;
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
                
                // Send terminal size
                this.socket.send(JSON.stringify({
                    type: 'resize',
                    cols: this.terminal.cols,
                    rows: this.terminal.rows
                }));
                
                resolve();
            };

            this.socket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'output':
                        this.terminal.write(message.data);
                        break;
                    case 'clear':
                        this.terminal.clear();
                        break;
                    case 'file-update':
                        if (window.fileExplorer) {
                            window.fileExplorer.refresh();
                        }
                        break;
                }
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                
                // Attempt reconnection
                setTimeout(() => this.connectWebSocket(), 5000);
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
                reject(error);
            };
        });
    }

    runCommand(command) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            // Clear line and run command
            this.socket.send(JSON.stringify({
                type: 'input',
                data: '\x15' + command + '\r'
            }));
        }
    }

    clear() {
        this.terminal.clear();
    }

    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (connected) {
            statusEl.classList.add('connected');
            statusEl.classList.remove('disconnected');
            statusEl.innerHTML = '<i class="bi bi-circle-fill"></i> Connected';
        } else {
            statusEl.classList.remove('connected');
            statusEl.classList.add('disconnected');
            statusEl.innerHTML = '<i class="bi bi-circle-fill"></i> Disconnected';
        }
    }

    formatVersionName(version) {
        const parts = version.split('-');
        return parts.map(part => 
            part.charAt(0).toUpperCase() + part.slice(1)
        ).join(' ');
    }
}

// Export for global use
window.TerminalManager = TerminalManager;