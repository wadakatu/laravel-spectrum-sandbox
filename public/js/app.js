// Initialize code analyzer
const analyzer = new CodeAnalyzer();

// Store analyzed data
let currentAnalysis = {
    routes: [],
    validationRules: {},
    resourceFields: []
};

// Update command outputs based on analyzed code
function updateCommandOutputs() {
    const routesCode = window.sampleFiles['routes/api.php'] || '';
    const routes = analyzer.analyzeRoutes(routesCode);
    currentAnalysis.routes = routes;
    
    // Update route count in command outputs
    const routeCount = routes.length;
    const routeList = routes.map(r => `  ✓ ${r.method} ${r.uri}`);
    
    commandOutputs.generate = [
        { text: '$ php artisan spectrum:generate', class: 'command' },
        { text: '🚀 Generating API documentation...', class: 'info' },
        { text: '🔍 Analyzing routes...', class: 'info' },
        { text: `📝 Found ${routeCount} API routes`, class: 'success' },
        { text: '🔄 Processing endpoints...', class: 'info' },
        ...routeList.map(r => ({ text: r, class: 'success' })),
        { text: '✅ Documentation generated successfully!', class: 'success' },
        { text: '📁 Output: storage/app/spectrum/openapi.json', class: 'info' },
        { text: `⏱️  Generation time: ${(0.3 + routeCount * 0.05).toFixed(2)} seconds`, class: 'info' }
    ];
    
    // Analyze validation rules if StoreUserRequest is being viewed
    const requestCode = window.sampleFiles['app/Http/Requests/StoreUserRequest.php'] || '';
    if (requestCode) {
        currentAnalysis.validationRules = analyzer.analyzeValidationRules(requestCode);
    }
}

// Existing command outputs...
const commandOutputs = {
    generate: [],
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
        { text: '✅ Loaded 5 endpoints', class: 'success' },
        { text: '', class: '' },
        { text: '🎭 Mock Server Configuration:', class: 'info' },
        { text: '  Host: 127.0.0.1', class: 'info' },
        { text: '  Port: 8081', class: 'info' },
        { text: '  Endpoints: 5', class: 'info' },
        { text: '  Response delay: 0ms', class: 'info' },
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

// Original executeCommand function with modifications
function executeCommand(command) {
    // Update analysis before executing
    updateCommandOutputs();
    
    const outputs = commandOutputs[command] || [];
    
    // Clear previous output
    terminal.innerHTML = '';
    
    // Add outputs with delay for realistic effect
    outputs.forEach((output, index) => {
        setTimeout(() => {
            addTerminalLine(output.text, output.class);
            
            // Show documentation preview after generate command
            if (command === 'generate' && index === outputs.length - 1) {
                setTimeout(() => {
                    showDocumentationPreview();
                }, 500);
            }
        }, index * 100);
    });
}

// Enhanced documentation preview
function showDocumentationPreview() {
    const docPreview = document.getElementById('documentation-preview');
    const swaggerFrame = document.getElementById('swagger-frame');
    const loadingDiv = document.getElementById('swagger-loading');
    
    // Generate OpenAPI based on analyzed code
    const openApiSpec = analyzer.generateOpenApiPreview(
        currentAnalysis.routes,
        currentAnalysis.validationRules
    );
    
    // Show the documentation preview section
    docPreview.style.display = 'block';
    
    // Send spec to iframe
    swaggerFrame.onload = function() {
        setTimeout(function() {
            swaggerFrame.contentWindow.postMessage({
                type: 'swagger-spec',
                spec: openApiSpec
            }, '*');
            loadingDiv.style.display = 'none';
            swaggerFrame.style.display = 'block';
        }, 100);
    };
    
    // If iframe is already loaded, send message immediately
    if (swaggerFrame.contentDocument && swaggerFrame.contentDocument.readyState === 'complete') {
        swaggerFrame.contentWindow.postMessage({
            type: 'swagger-spec',
            spec: openApiSpec
        }, '*');
        loadingDiv.style.display = 'none';
        swaggerFrame.style.display = 'block';
    }
    
    // Scroll to preview
    docPreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Listen for code changes (called from editor.js)
window.addEventListener('codeChanged', (event) => {
    const { file, content } = event.detail;
    window.sampleFiles[file] = content;
    
    // If routes file changed, update the analysis
    if (file === 'routes/api.php') {
        updateCommandOutputs();
    }
});

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initial analysis
    updateCommandOutputs();
    
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
        document.getElementById('documentation-preview').style.display = 'none';
    });
});