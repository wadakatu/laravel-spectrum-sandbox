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
        setTimeout(() => {
            ptyProcess.write('cd /app && clear\r');
            ptyProcess.write('echo "Welcome to ' + process.env.SANDBOX_VERSION + ' Sandbox!"\r');
            ptyProcess.write('echo "Laravel Spectrum version: ' + process.env.SPECTRUM_VERSION + '"\r');
            ptyProcess.write('echo ""\r');
            ptyProcess.write('echo "Type \'php artisan\' to see available commands"\r');
            ptyProcess.write('echo ""\r');
        }, 100);

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