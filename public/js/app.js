// Command outputs mock data
const commandOutputs = {
    generate: [
        { text: '$ php artisan spectrum:generate', class: 'command' },
        { text: '🚀 Generating API documentation...', class: 'info' },
        { text: '🔍 Analyzing routes...', class: 'info' },
        { text: '📝 Found 4 API routes', class: 'success' },
        { text: '🔄 Processing endpoints...', class: 'info' },
        { text: '  ✓ GET /api/users', class: 'success' },
        { text: '  ✓ POST /api/users', class: 'success' },
        { text: '  ✓ GET /api/users/{id}', class: 'success' },
        { text: '  ✓ PUT /api/users/{id}', class: 'success' },
        { text: '✅ Documentation generated successfully!', class: 'success' },
        { text: '📁 Output: storage/app/spectrum/openapi.json', class: 'info' },
        { text: '⏱️  Generation time: 0.42 seconds', class: 'info' }
    ],
    watch: [
        { text: '$ php artisan spectrum:watch', class: 'command' },
        { text: '🚀 Starting Laravel Spectrum preview server...', class: 'info' },
        { text: '📄 Generating initial documentation...', class: 'info' },
        { text: '✅ Documentation generated successfully!', class: 'success' },
        { text: '📡 Preview server running at http://127.0.0.1:8080', class: 'success' },
        { text: '👀 Watching for file changes...', class: 'info' },
        { text: 'Press Ctrl+C to stop', class: 'info' }
    ],
    mock: [
        { text: '$ php artisan spectrum:mock', class: 'command' },
        { text: '🚀 Starting Laravel Spectrum Mock Server...', class: 'info' },
        { text: '📄 Loading OpenAPI specification...', class: 'info' },
        { text: '✅ Loaded 4 endpoints', class: 'success' },
        { text: '', class: '' },
        { text: '🎭 Mock Server Configuration:', class: 'info' },
        { text: '  Host: 127.0.0.1', class: 'info' },
        { text: '  Port: 8081', class: 'info' },
        { text: '  Endpoints: 4', class: 'info' },
        { text: '', class: '' },
        { text: '✅ Mock server is running at http://127.0.0.1:8081', class: 'success' },
        { text: 'Press Ctrl+C to stop', class: 'info' }
    ]
};

// Terminal element
const terminal = document.getElementById('terminal');

// Add terminal line
function addTerminalLine(text, className = '') {
    const line = document.createElement('div');
    line.className = `terminal-line ${className}`;
    line.innerHTML = text;
    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
}

// Simulate command execution
function executeCommand(command) {
    const outputs = commandOutputs[command] || [];
    
    // Clear previous output
    terminal.innerHTML = '';
    
    // Add outputs with delay for realistic effect
    outputs.forEach((output, index) => {
        setTimeout(() => {
            addTerminalLine(output.text, output.class);
        }, index * 100);
    });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Command buttons
    document.querySelectorAll('.command-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const command = e.currentTarget.getAttribute('data-command');
            executeCommand(command);
        });
    });
    
    // Clear terminal button
    document.getElementById('clear-terminal').addEventListener('click', () => {
        terminal.innerHTML = '<div class="terminal-line">$ <span class="text-info">Ready to execute commands...</span></div>';
    });
});