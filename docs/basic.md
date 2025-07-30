# Laravel Spectrum Interactive Sandbox Implementation

## 🎯 概要

ブラウザベースのインタラクティブなサンドボックス環境で、各Laravel/Lumenバージョンで直接コマンドを実行できるWebアプリケーション。

## 📁 プロジェクト構造

```
laravel-spectrum-sandbox/
├── docker-compose.yml
├── Makefile
├── README.md
├── .env.example
├── nginx/
│   ├── nginx.conf
│   └── sites/
│       └── sandbox.conf
├── sandbox-app/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js
│   ├── public/
│   │   ├── index.html
│   │   ├── sandbox.html
│   │   ├── css/
│   │   │   ├── main.css
│   │   │   └── terminal.css
│   │   ├── js/
│   │   │   ├── app.js
│   │   │   ├── terminal.js
│   │   │   ├── file-explorer.js
│   │   │   └── command-palette.js
│   │   └── assets/
│   └── src/
│       ├── websocket-server.js
│       ├── docker-manager.js
│       ├── session-manager.js
│       └── file-manager.js
├── environments/
│   ├── base/
│   │   ├── Dockerfile.sandbox
│   │   ├── entrypoint.sh
│   │   └── terminal-server.js
│   ├── laravel-10/
│   │   ├── Dockerfile
│   │   └── sandbox-config.json
│   ├── laravel-11/
│   │   ├── Dockerfile
│   │   └── sandbox-config.json
│   └── ... (other versions)
└── shared/
    ├── demo-projects/
    └── spectrum-presets/
```

## 🐳 Docker Compose設定

### docker-compose.yml

```yaml
version: '3.8'

x-sandbox-common: &sandbox-common
  networks:
    - sandbox-network
  volumes:
    - ./shared:/shared:ro
  environment:
    - SANDBOX_MODE=true
    - SPECTRUM_VERSION=${SPECTRUM_VERSION:-v0.1.0-beta}

services:
  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: spectrum-sandbox-proxy
    ports:
      - "8088:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/sites:/etc/nginx/sites-enabled:ro
    depends_on:
      - sandbox-app
      - laravel-10
      - laravel-11
      - laravel-12
      - lumen-10
      - lumen-11
      - lumen-12
    networks:
      - sandbox-network

  # Main Sandbox Application
  sandbox-app:
    build:
      context: ./sandbox-app
      dockerfile: Dockerfile
    container_name: spectrum-sandbox-app
    environment:
      - NODE_ENV=production
      - WS_PORT=3000
      - API_PORT=3001
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./sandbox-app:/app
    networks:
      - sandbox-network

  # Laravel 10 Sandbox
  laravel-10:
    build:
      context: ./environments/laravel-10
      dockerfile: Dockerfile
      args:
        - PHP_VERSION=8.1
        - LARAVEL_VERSION=^10.0
        - SPECTRUM_VERSION=${SPECTRUM_VERSION:-v0.1.0-beta}
    container_name: spectrum-sandbox-laravel-10
    <<: *sandbox-common
    environment:
      - SANDBOX_VERSION=laravel-10
      - TERMINAL_PORT=7010
    ports:
      - "7010:7010"

  # Laravel 11 Sandbox
  laravel-11:
    build:
      context: ./environments/laravel-11
      dockerfile: Dockerfile
      args:
        - PHP_VERSION=8.2
        - LARAVEL_VERSION=^11.0
        - SPECTRUM_VERSION=${SPECTRUM_VERSION:-v0.1.0-beta}
    container_name: spectrum-sandbox-laravel-11
    <<: *sandbox-common
    environment:
      - SANDBOX_VERSION=laravel-11
      - TERMINAL_PORT=7011
    ports:
      - "7011:7011"

  # Laravel 12 Sandbox
  laravel-12:
    build:
      context: ./environments/laravel-12
      dockerfile: Dockerfile
      args:
        - PHP_VERSION=8.2
        - LARAVEL_VERSION=^12.0
        - SPECTRUM_VERSION=${SPECTRUM_VERSION:-v0.1.0-beta}
    container_name: spectrum-sandbox-laravel-12
    <<: *sandbox-common
    environment:
      - SANDBOX_VERSION=laravel-12
      - TERMINAL_PORT=7012
    ports:
      - "7012:7012"

  # Lumen versions follow similar pattern...

networks:
  sandbox-network:
    driver: bridge
```

## 🌐 Nginx設定

### nginx/sites/sandbox.conf

```nginx
upstream sandbox_app {
    server sandbox-app:3001;
}

upstream laravel_10_terminal {
    server laravel-10:7010;
}

upstream laravel_11_terminal {
    server laravel-11:7011;
}

upstream laravel_12_terminal {
    server laravel-12:7012;
}

# Similar upstreams for Lumen versions...

server {
    listen 80;
    server_name localhost;

    # Main sandbox app
    location / {
        proxy_pass http://sandbox_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket for main app
    location /ws {
        proxy_pass http://sandbox_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Laravel 10 routes
    location /laravel/10 {
        rewrite ^/laravel/10(.*)$ /sandbox.html?version=laravel-10 break;
        proxy_pass http://sandbox_app;
    }

    location /terminal/laravel-10 {
        proxy_pass http://laravel_10_terminal/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Laravel 11 routes
    location /laravel/11 {
        rewrite ^/laravel/11(.*)$ /sandbox.html?version=laravel-11 break;
        proxy_pass http://sandbox_app;
    }

    location /terminal/laravel-11 {
        proxy_pass http://laravel_11_terminal/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Similar patterns for other versions...

    # Static file serving
    location /static {
        proxy_pass http://sandbox_app;
        proxy_cache_valid 200 1d;
        expires 1d;
    }
}
```

## 🖥️ サンドボックスUI

### sandbox-app/public/index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laravel Spectrum Sandbox</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
</head>
<body>
    <nav class="navbar navbar-dark bg-dark">
        <div class="container-fluid">
            <span class="navbar-brand mb-0 h1">
                <i class="bi bi-terminal"></i>
                Laravel Spectrum Sandbox
            </span>
            <span class="navbar-text">
                Interactive Testing Environment
            </span>
        </div>
    </nav>

    <div class="container mt-5">
        <div class="row">
            <div class="col-12">
                <h2 class="mb-4">Choose Your Environment</h2>
                <div class="row g-4">
                    <!-- Laravel Versions -->
                    <div class="col-md-4">
                        <div class="card environment-card" onclick="openSandbox('laravel', '10')">
                            <div class="card-body text-center">
                                <i class="bi bi-box-seam environment-icon text-danger"></i>
                                <h5 class="card-title">Laravel 10</h5>
                                <p class="card-text">PHP 8.1+ | Long Term Support</p>
                                <button class="btn btn-primary">
                                    <i class="bi bi-terminal"></i> Open Terminal
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card environment-card" onclick="openSandbox('laravel', '11')">
                            <div class="card-body text-center">
                                <i class="bi bi-box-seam environment-icon text-danger"></i>
                                <h5 class="card-title">Laravel 11</h5>
                                <p class="card-text">PHP 8.2+ | Current Release</p>
                                <button class="btn btn-primary">
                                    <i class="bi bi-terminal"></i> Open Terminal
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-4">
                        <div class="card environment-card" onclick="openSandbox('laravel', '12')">
                            <div class="card-body text-center">
                                <i class="bi bi-box-seam environment-icon text-danger"></i>
                                <h5 class="card-title">Laravel 12</h5>
                                <p class="card-text">PHP 8.2+ | Latest Version</p>
                                <button class="btn btn-primary">
                                    <i class="bi bi-terminal"></i> Open Terminal
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Lumen Versions -->
                    <div class="col-md-4">
                        <div class="card environment-card" onclick="openSandbox('lumen', '10')">
                            <div class="card-body text-center">
                                <i class="bi bi-lightning environment-icon text-warning"></i>
                                <h5 class="card-title">Lumen 10</h5>
                                <p class="card-text">PHP 8.1+ | Micro-framework</p>
                                <button class="btn btn-warning text-dark">
                                    <i class="bi bi-terminal"></i> Open Terminal
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Similar cards for Lumen 11 and 12 -->
                </div>
            </div>
        </div>

        <div class="row mt-5">
            <div class="col-12">
                <h3>Quick Commands</h3>
                <div class="quick-commands">
                    <code>php artisan spectrum:generate</code>
                    <code>php artisan spectrum:watch</code>
                    <code>php artisan spectrum:mock</code>
                    <code>php artisan spectrum:export:postman</code>
                </div>
            </div>
        </div>
    </div>

    <script>
        function openSandbox(framework, version) {
            window.location.href = `/${framework}/${version}`;
        }
    </script>
</body>
</html>
```

### sandbox-app/public/sandbox.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Laravel Spectrum Sandbox - Terminal</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/terminal.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
</head>
<body>
    <div class="sandbox-container">
        <!-- Header -->
        <div class="sandbox-header">
            <div class="header-left">
                <a href="/" class="btn btn-sm btn-outline-light">
                    <i class="bi bi-arrow-left"></i> Back
                </a>
                <span class="environment-badge" id="environment-name">Loading...</span>
            </div>
            <div class="header-center">
                <div class="btn-group" role="group">
                    <button class="btn btn-sm btn-primary" onclick="clearTerminal()">
                        <i class="bi bi-trash"></i> Clear
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="resetEnvironment()">
                        <i class="bi bi-arrow-clockwise"></i> Reset
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="downloadFiles()">
                        <i class="bi bi-download"></i> Download Files
                    </button>
                </div>
            </div>
            <div class="header-right">
                <span class="connection-status" id="connection-status">
                    <i class="bi bi-circle-fill"></i> Connected
                </span>
            </div>
        </div>

        <!-- Main Content -->
        <div class="sandbox-content">
            <!-- Sidebar -->
            <div class="sidebar">
                <!-- Command Palette -->
                <div class="panel">
                    <div class="panel-header">
                        <h6><i class="bi bi-command"></i> Commands</h6>
                    </div>
                    <div class="panel-body" id="command-palette">
                        <div class="command-group">
                            <div class="command-group-title">Generation</div>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:generate')">
                                spectrum:generate
                            </button>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:generate:optimized')">
                                spectrum:generate:optimized
                            </button>
                        </div>
                        <div class="command-group">
                            <div class="command-group-title">Development</div>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:watch')">
                                spectrum:watch
                            </button>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:mock')">
                                spectrum:mock
                            </button>
                        </div>
                        <div class="command-group">
                            <div class="command-group-title">Export</div>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:export:postman')">
                                export:postman
                            </button>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:export:insomnia')">
                                export:insomnia
                            </button>
                        </div>
                        <div class="command-group">
                            <div class="command-group-title">Cache</div>
                            <button class="command-btn" onclick="runCommand('php artisan spectrum:cache:clear')">
                                cache:clear
                            </button>
                        </div>
                    </div>
                </div>

                <!-- File Explorer -->
                <div class="panel">
                    <div class="panel-header">
                        <h6><i class="bi bi-folder-open"></i> Files</h6>
                        <button class="btn btn-sm btn-link" onclick="refreshFileTree()">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                    </div>
                    <div class="panel-body">
                        <div id="file-tree" class="file-tree">
                            <!-- Dynamically populated -->
                        </div>
                    </div>
                </div>

                <!-- Output Viewer -->
                <div class="panel">
                    <div class="panel-header">
                        <h6><i class="bi bi-file-earmark-text"></i> Output</h6>
                    </div>
                    <div class="panel-body">
                        <select class="form-select form-select-sm" id="output-selector" onchange="loadOutput()">
                            <option value="">Select output file...</option>
                            <option value="openapi.json">openapi.json</option>
                            <option value="openapi.yaml">openapi.yaml</option>
                            <option value="postman.json">postman.json</option>
                            <option value="insomnia.json">insomnia.json</option>
                        </select>
                        <div id="output-viewer" class="output-viewer mt-2">
                            <!-- Output content -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Terminal -->
            <div class="terminal-container">
                <div id="terminal"></div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.7.0/lib/xterm-addon-fit.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xterm-addon-web-links@0.8.0/lib/xterm-addon-web-links.js"></script>
    <script src="/js/terminal.js"></script>
    <script src="/js/file-explorer.js"></script>
    <script src="/js/command-palette.js"></script>
    <script src="/js/app.js"></script>
</body>
</html>
```

## 🎨 スタイルシート

### sandbox-app/public/css/terminal.css

```css
/* Terminal Styles */
.sandbox-container {
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
}

.sandbox-header {
    background-color: #2d2d30;
    color: #cccccc;
    padding: 0.5rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #3e3e42;
}

.environment-badge {
    background-color: #007acc;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 0.25rem;
    font-weight: bold;
    margin-left: 1rem;
}

.connection-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.connection-status.connected i {
    color: #4ec9b0;
}

.connection-status.disconnected i {
    color: #f44747;
}

.sandbox-content {
    flex: 1;
    display: flex;
    overflow: hidden;
}

.sidebar {
    width: 300px;
    background-color: #252526;
    border-right: 1px solid #3e3e42;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.panel {
    border-bottom: 1px solid #3e3e42;
}

.panel-header {
    padding: 0.75rem 1rem;
    background-color: #2d2d30;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.panel-header h6 {
    margin: 0;
    color: #cccccc;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.panel-body {
    padding: 1rem;
}

.command-group {
    margin-bottom: 1rem;
}

.command-group-title {
    font-size: 0.75rem;
    color: #858585;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
}

.command-btn {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.25rem;
    background-color: #3e3e42;
    color: #cccccc;
    border: none;
    border-radius: 0.25rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    transition: background-color 0.2s;
}

.command-btn:hover {
    background-color: #094771;
    color: white;
}

.file-tree {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.875rem;
    color: #cccccc;
}

.file-tree-item {
    padding: 0.25rem 0.5rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.file-tree-item:hover {
    background-color: #2a2d2e;
}

.file-tree-item.selected {
    background-color: #094771;
}

.file-tree-item i {
    font-size: 1rem;
}

.output-viewer {
    background-color: #1e1e1e;
    border: 1px solid #3e3e42;
    border-radius: 0.25rem;
    padding: 1rem;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 0.75rem;
    color: #cccccc;
    max-height: 300px;
    overflow-y: auto;
}

.terminal-container {
    flex: 1;
    background-color: #1e1e1e;
    padding: 1rem;
}

#terminal {
    height: 100%;
}

/* Responsive */
@media (max-width: 768px) {
    .sidebar {
        display: none;
    }
    
    .sandbox-content {
        flex-direction: column;
    }
}
```

## 💻 ターミナル実装

### sandbox-app/public/js/terminal.js

```javascript
// Terminal Manager
class TerminalManager {
    constructor() {
        this.terminal = null;
        this.fitAddon = null;
        this.socket = null;
        this.version = this.getVersionFromUrl();
    }

    getVersionFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('version') || 'laravel-11';
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

        // Add addons
        this.fitAddon = new FitAddon.FitAddon();
        this.terminal.loadAddon(this.fitAddon);

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
            const wsUrl = `ws://${window.location.hostname}:8088/terminal/${this.version}`;
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
                        window.fileExplorer?.refresh();
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
```

## 🚀 サーバー実装

### environments/base/terminal-server.js

```javascript
#!/usr/bin/env node

const WebSocket = require('ws');
const pty = require('node-pty');
const fs = require('fs');
const path = require('path');

class TerminalServer {
    constructor() {
        this.port = process.env.TERMINAL_PORT || 7000;
        this.sessions = new Map();
        this.wss = null;
    }

    start() {
        this.wss = new WebSocket.Server({ port: this.port });
        
        console.log(`Terminal server listening on port ${this.port}`);

        this.wss.on('connection', (ws) => {
            const sessionId = this.generateSessionId();
            const session = this.createSession(sessionId);
            
            this.sessions.set(sessionId, {
                ws: ws,
                pty: session,
                workDir: process.cwd()
            });

            this.handleConnection(sessionId, ws, session);
        });
    }

    createSession(sessionId) {
        const shell = process.env.SHELL || 'bash';
        const ptyProcess = pty.spawn(shell, [], {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: {
                ...process.env,
                TERM: 'xterm-256color',
                COLORTERM: 'truecolor',
                SESSION_ID: sessionId
            }
        });

        // Auto-login to Laravel app directory
        ptyProcess.write('cd /app && clear\r');
        ptyProcess.write('echo "Welcome to ' + process.env.SANDBOX_VERSION + ' Sandbox!"\r');
        ptyProcess.write('echo "Laravel Spectrum version: ' + process.env.SPECTRUM_VERSION + '"\r');
        ptyProcess.write('echo ""\r');
        ptyProcess.write('echo "Type \'php artisan\' to see available commands"\r');
        ptyProcess.write('echo ""\r');

        return ptyProcess;
    }

    handleConnection(sessionId, ws, ptyProcess) {
        const session = this.sessions.get(sessionId);

        // Handle PTY output
        ptyProcess.on('data', (data) => {
            try {
                ws.send(JSON.stringify({
                    type: 'output',
                    data: data
                }));
            } catch (err) {
                console.error('Send error:', err);
            }
        });

        // Handle WebSocket messages
        ws.on('message', (message) => {
            try {
                const msg = JSON.parse(message);
                
                switch (msg.type) {
                    case 'input':
                        ptyProcess.write(msg.data);
                        this.checkFileChanges(sessionId);
                        break;
                        
                    case 'resize':
                        ptyProcess.resize(msg.cols, msg.rows);
                        break;
                        
                    case 'command':
                        this.executeCommand(sessionId, msg.command);
                        break;
                }
            } catch (err) {
                console.error('Message handling error:', err);
            }
        });

        // Handle disconnect
        ws.on('close', () => {
            const session = this.sessions.get(sessionId);
            if (session) {
                session.pty.kill();
                this.sessions.delete(sessionId);
            }
            console.log(`Session ${sessionId} closed`);
        });

        // Handle errors
        ws.on('error', (err) => {
            console.error(`WebSocket error in session ${sessionId}:`, err);
        });

        ptyProcess.on('exit', () => {
            ws.close();
            this.sessions.delete(sessionId);
        });
    }

    checkFileChanges(sessionId) {
        // Monitor for file changes that might need UI updates
        const watchPaths = [
            'storage/app/spectrum',
            'config/spectrum.php'
        ];

        // Simple file change detection
        // In production, use chokidar or similar
        setTimeout(() => {
            const session = this.sessions.get(sessionId);
            if (session && session.ws.readyState === WebSocket.OPEN) {
                session.ws.send(JSON.stringify({
                    type: 'file-update',
                    paths: watchPaths
                }));
            }
        }, 1000);
    }

    executeCommand(sessionId, command) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Clear current line and execute command
        session.pty.write('\x15'); // Ctrl+U to clear line
        session.pty.write(command + '\r');
    }

    generateSessionId() {
        return Math.random().toString(36).substring(2, 15);
    }
}

// Start server
const server = new TerminalServer();
server.start();

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down terminal server...');
    server.wss.close(() => {
        process.exit(0);
    });
});
```

## 🐳 環境別Dockerfile

### environments/laravel-11/Dockerfile

```dockerfile
ARG PHP_VERSION=8.2
FROM php:${PHP_VERSION}-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git curl libpng-dev libonig-dev libxml2-dev zip unzip \
    nodejs npm python3 build-essential \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node dependencies for terminal server
RUN npm install -g node-pty ws

# Create Laravel project
ARG LARAVEL_VERSION="^11.0"
WORKDIR /app
RUN composer create-project laravel/laravel:${LARAVEL_VERSION} . --no-interaction

# Install Laravel Spectrum
ARG SPECTRUM_VERSION="v0.1.0-beta"
RUN composer require wadakatu/laravel-spectrum:${SPECTRUM_VERSION} --dev --no-interaction

# Publish Spectrum config
RUN php artisan vendor:publish --provider="LaravelSpectrum\SpectrumServiceProvider"

# Setup demo API
COPY --from=base /shared/demo-projects/laravel-demo-api/* /app/

# Copy terminal server
COPY --from=base /terminal-server.js /usr/local/bin/terminal-server
RUN chmod +x /usr/local/bin/terminal-server

# Setup entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 7011

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "/usr/local/bin/terminal-server"]
```

## 📝 使用方法

### 初期セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/yourname/laravel-spectrum-sandbox
cd laravel-spectrum-sandbox

# 環境変数設定
cp .env.example .env

# ビルドと起動
make up
```

### アクセス方法

1. ブラウザで `http://localhost:8088` にアクセス
2. 使用したいバージョンをクリック
3. ターミナルが開き、直接コマンドを実行可能

### 機能

- **インタラクティブターミナル** - 実際のシェル環境
- **コマンドパレット** - よく使うコマンドをワンクリック実行
- **ファイルエクスプローラー** - 生成されたファイルを確認
- **アウトプットビューアー** - 生成されたOpenAPI/Postmanファイルを表示
- **ダウンロード機能** - 生成されたファイルをダウンロード

### Makefile

```makefile
.PHONY: up down build logs clean

up:
	docker-compose up -d
	@echo "Sandbox is running at http://localhost:8088"

down:
	docker-compose down

build:
	docker-compose build --parallel

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -f
```

このサンドボックス環境により、各バージョンでLaravel Spectrumを直接試すことができ、テスト結果をリアルタイムで確認できます。