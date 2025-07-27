// API client with mock mode support
class SandboxAPIClient {
    constructor() {
        this.baseURL = 'http://localhost:8000/api/v1';
        this.sessionId = null;
        this.currentConfig = null;
        this.useMockMode = true; // モックモードを有効化（Dockerなしでも動作）
    }
    
    async createSession(framework, frameworkVersion, spectrumVersion, phpVersion) {
        // モックモードの場合は即座に成功を返す
        if (this.useMockMode) {
            this.sessionId = 'mock-' + Date.now();
            this.currentConfig = { framework, frameworkVersion, spectrumVersion, phpVersion };
            console.log('Mock mode: Session created', this.sessionId);
            return {
                session_id: this.sessionId,
                status: 'ready',
                expires_in: 3600
            };
        }
        
        try {
            const response = await fetch(`${this.baseURL}/sandbox/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    framework: framework,
                    framework_version: frameworkVersion,
                    spectrum_version: spectrumVersion,
                    php_version: phpVersion
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create session');
            }
            
            const data = await response.json();
            this.sessionId = data.session_id;
            this.currentConfig = { framework, frameworkVersion, spectrumVersion, phpVersion };
            return data;
        } catch (error) {
            console.error('Failed to create session:', error);
            throw error;
        }
    }
    
    async updateFile(path, content) {
        if (!this.sessionId) {
            throw new Error('No active session');
        }
        
        // モックモードの場合は成功を返す
        if (this.useMockMode) {
            console.log('Mock mode: File updated', path);
            return { success: true };
        }
        
        const response = await fetch(`${this.baseURL}/sandbox/${this.sessionId}/file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ path, content })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update file');
        }
        
        return response.json();
    }
    
    async executeCommand(command) {
        if (!this.sessionId) {
            throw new Error('No active session');
        }
        
        // モックモードの場合はサンプル出力を返す
        if (this.useMockMode) {
            console.log('Mock mode: Executing command', command);
            
            // コマンドに応じたモック出力を返す
            if (command === 'spectrum:generate') {
                return window.generateMockOutput ? window.generateMockOutput() : {
                    output: '🚀 Generating API documentation...\n✅ Documentation generated successfully!',
                    error: null,
                    exit_code: 0,
                    openapi: window.sampleOpenAPI || null
                };
            }
            
            return {
                output: `Mock execution of: ${command}`,
                error: null,
                exit_code: 0
            };
        }
        
        const response = await fetch(`${this.baseURL}/sandbox/${this.sessionId}/execute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ command })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to execute command');
        }
        
        return response.json();
    }
    
    async destroySession() {
        if (!this.sessionId) return;
        
        // モックモードの場合は即座にクリア
        if (this.useMockMode) {
            console.log('Mock mode: Session destroyed', this.sessionId);
            this.sessionId = null;
            this.currentConfig = null;
            return;
        }
        
        try {
            await fetch(`${this.baseURL}/sandbox/${this.sessionId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Failed to destroy session:', error);
        }
        
        this.sessionId = null;
        this.currentConfig = null;
    }
}

// Version compatibility matrix
const VERSION_COMPATIBILITY = {
    laravel: {
        '10': ['8.1', '8.2', '8.3', '8.4'],
        '11': ['8.2', '8.3', '8.4'],
        '12': ['8.3', '8.4']
    },
    lumen: {
        '10': ['8.1', '8.2', '8.3', '8.4'],
        '11': ['8.2', '8.3', '8.4'],
        '12': ['8.3', '8.4']
    }
};

// Create version selector UI
function createVersionSelector() {
    const navbar = document.querySelector('.navbar .container-fluid');
    
    // Create selector container
    const selectorContainer = document.createElement('div');
    selectorContainer.className = 'd-flex align-items-center gap-2 ms-auto me-3';
    selectorContainer.innerHTML = `
        <select id="framework-select" class="form-select form-select-sm" style="width: 100px;">
            <option value="laravel">Laravel</option>
            <option value="lumen">Lumen</option>
        </select>
        <select id="framework-version-select" class="form-select form-select-sm" style="width: 80px;">
            <option value="12">12</option>
            <option value="11">11</option>
            <option value="10">10</option>
        </select>
        <select id="php-version-select" class="form-select form-select-sm" style="width: 100px;">
            <option value="8.4">PHP 8.4</option>
            <option value="8.3">PHP 8.3</option>
            <option value="8.2">PHP 8.2</option>
            <option value="8.1">PHP 8.1</option>
        </select>
        <select id="spectrum-version-select" class="form-select form-select-sm" style="width: 120px;">
            <option value="dev-main">dev-main</option>
            <option value="^1.0">^1.0</option>
        </select>
        <button id="apply-version-btn" class="btn btn-sm btn-primary">
            <i class="fas fa-sync"></i> Apply
        </button>
    `;
    
    // Insert before the version badge
    const versionBadge = navbar.querySelector('.badge');
    navbar.insertBefore(selectorContainer, versionBadge);
    
    // Add event listeners
    const frameworkSelect = document.getElementById('framework-select');
    const frameworkVersionSelect = document.getElementById('framework-version-select');
    const phpVersionSelect = document.getElementById('php-version-select');
    
    // Update PHP versions based on framework version
    function updatePhpVersionOptions() {
        const framework = frameworkSelect.value;
        const frameworkVersion = frameworkVersionSelect.value;
        const supportedPhpVersions = VERSION_COMPATIBILITY[framework][frameworkVersion];
        const currentPhpVersion = phpVersionSelect.value;
        
        // Clear and rebuild options
        phpVersionSelect.innerHTML = '';
        ['8.4', '8.3', '8.2', '8.1'].forEach(version => {
            if (supportedPhpVersions.includes(version)) {
                const option = document.createElement('option');
                option.value = version;
                option.textContent = `PHP ${version}`;
                phpVersionSelect.appendChild(option);
            }
        });
        
        // Restore selection if still valid
        if (supportedPhpVersions.includes(currentPhpVersion)) {
            phpVersionSelect.value = currentPhpVersion;
        }
    }
    
    frameworkSelect.addEventListener('change', updatePhpVersionOptions);
    frameworkVersionSelect.addEventListener('change', updatePhpVersionOptions);
    
    // Apply button
    document.getElementById('apply-version-btn').addEventListener('click', async () => {
        const btn = document.getElementById('apply-version-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        
        try {
            // Destroy existing session
            if (window.sandboxAPI.sessionId) {
                await window.sandboxAPI.destroySession();
            }
            
            // Create new session
            const framework = frameworkSelect.value;
            const frameworkVersion = frameworkVersionSelect.value;
            const phpVersion = phpVersionSelect.value;
            const spectrumVersion = document.getElementById('spectrum-version-select').value;
            
            await window.sandboxAPI.createSession(
                framework,
                frameworkVersion,
                spectrumVersion,
                phpVersion
            );
            
            // Upload sample files
            for (const [path, content] of Object.entries(window.sampleFiles)) {
                await window.sandboxAPI.updateFile(path, content);
            }
            
            // Show success message
            addTerminalLine(`✅ Environment created: ${framework} ${frameworkVersion} with PHP ${phpVersion}`, 'success');
            
            btn.innerHTML = '<i class="fas fa-sync"></i> Apply';
        } catch (error) {
            alert('Failed to create environment: ' + error.message);
            btn.innerHTML = '<i class="fas fa-sync"></i> Apply';
        } finally {
            btn.disabled = false;
        }
    });
    
    // Initialize with default values
    updatePhpVersionOptions();
}

// Create global instance
window.sandboxAPI = new SandboxAPIClient();

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Create version selector
    createVersionSelector();
    
    try {
        // Create initial session with default settings
        await window.sandboxAPI.createSession('laravel', '11', 'dev-main', '8.3');
        console.log('Sandbox session created');
        
        // Upload initial files
        for (const [path, content] of Object.entries(window.sampleFiles)) {
            await window.sandboxAPI.updateFile(path, content);
        }
        
        console.log('Sample files uploaded');
        addTerminalLine('✅ Environment ready: Laravel 11 with PHP 8.3', 'success');
    } catch (error) {
        console.error('Failed to initialize sandbox:', error);
        addTerminalLine('❌ Failed to initialize sandbox: ' + error.message, 'error');
    }
});

// Override executeCommand to use real API
window.executeCommand = async function(command) {
    const terminal = document.getElementById('terminal');
    
    try {
        // Clear terminal
        terminal.innerHTML = '';
        addTerminalLine(`$ php artisan ${command}`, 'command');
        addTerminalLine('Executing command...', 'info');
        
        // Execute real command
        const result = await window.sandboxAPI.executeCommand(command);
        
        // Clear and show real output
        terminal.innerHTML = '';
        addTerminalLine(`$ php artisan ${command}`, 'command');
        
        // Display output
        if (result.output) {
            result.output.split('\n').forEach(line => {
                if (line.trim()) {
                    addTerminalLine(line, 'info');
                }
            });
        }
        
        // Display errors if any
        if (result.error) {
            result.error.split('\n').forEach(line => {
                if (line.trim()) {
                    addTerminalLine(line, 'error');
                }
            });
        }
        
        // Update Swagger UI if OpenAPI was generated
        if (result.openapi && window.swaggerUI) {
            window.swaggerUI.updateSpec(result.openapi);
            
            // Switch to API Docs tab
            const docTab = new bootstrap.Tab(document.getElementById('documentation-tab'));
            docTab.show();
        }
        
    } catch (error) {
        addTerminalLine(`Error: ${error.message}`, 'error');
    }
};

// Update file when code changes
window.addEventListener('codeChanged', async (event) => {
    const { file, content } = event.detail;
    
    try {
        await window.sandboxAPI.updateFile(file, content);
        console.log(`File ${file} updated in sandbox`);
    } catch (error) {
        console.error(`Failed to update file ${file}:`, error);
    }
});