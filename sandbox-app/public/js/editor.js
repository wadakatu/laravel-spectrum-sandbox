class CodeEditor {
    constructor() {
        this.editor = null
        this.currentFile = null
        this.files = new Map()
        this.monaco = null
        this.sessionId = null
    }

    async init(sessionId) {
        this.sessionId = sessionId
        
        // Configure Monaco loader
        require.config({ 
            paths: { 
                'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' 
            }
        })

        // Load Monaco
        return new Promise((resolve) => {
            require(['vs/editor/editor.main'], () => {
                this.monaco = window.monaco
                this.createEditor()
                this.setupEventListeners()
                this.loadDefaultFile()
                resolve()
            })
        })
    }

    createEditor() {
        const container = document.getElementById('code-editor')
        if (!container) return

        this.editor = this.monaco.editor.create(container, {
            value: '<?php\n\n// Welcome to Laravel Spectrum Sandbox!\n// Start editing your code here...\n',
            language: 'php',
            theme: 'vs-dark',
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 4,
            insertSpaces: true
        })
    }

    setupEventListeners() {
        // Listen for file selection from file explorer
        window.addEventListener('file-selected', (event) => {
            this.loadFile(event.detail.path)
        })

        // Listen for save command (Ctrl+S / Cmd+S)
        this.editor.addCommand(this.monaco.KeyMod.CtrlCmd | this.monaco.KeyCode.KeyS, () => {
            this.saveCurrentFile()
        })
    }

    async loadFile(filePath) {
        try {
            const response = await fetch(`/api/sessions/${this.sessionId}/files/${encodeURIComponent(filePath)}`)
            if (!response.ok) throw new Error('Failed to load file')
            
            const content = await response.text()
            this.currentFile = filePath
            
            // Detect language from file extension
            const language = this.detectLanguage(filePath)
            this.monaco.editor.setModelLanguage(this.editor.getModel(), language)
            
            this.editor.setValue(content)
            this.files.set(filePath, content)
            
            // Update UI
            this.updateEditorHeader(filePath)
        } catch (error) {
            console.error('Error loading file:', error)
            this.showNotification('Failed to load file', 'error')
        }
    }

    async saveCurrentFile() {
        if (!this.currentFile) {
            this.showNotification('No file selected', 'warning')
            return
        }

        const content = this.editor.getValue()
        
        try {
            const response = await fetch(`/api/sessions/${this.sessionId}/files/${encodeURIComponent(this.currentFile)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            })

            if (!response.ok) throw new Error('Failed to save file')
            
            this.files.set(this.currentFile, content)
            this.showNotification('File saved successfully', 'success')
            
            // Trigger file tree refresh
            window.dispatchEvent(new Event('refresh-file-tree'))
        } catch (error) {
            console.error('Error saving file:', error)
            this.showNotification('Failed to save file', 'error')
        }
    }

    loadDefaultFile() {
        // Load a default example file
        const defaultCode = `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Http\\Requests\\UserRequest;
use App\\Http\\Resources\\UserResource;
use App\\Models\\User;
use Illuminate\\Http\\Request;

class UserController extends Controller
{
    /**
     * Display a listing of users.
     */
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
            })
            ->paginate($request->per_page ?? 15);

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user.
     */
    public function store(UserRequest $request)
    {
        $user = User::create($request->validated());

        return new UserResource($user);
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        return new UserResource($user);
    }

    /**
     * Update the specified user.
     */
    public function update(UserRequest $request, User $user)
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->noContent();
    }
}`

        this.editor.setValue(defaultCode)
        this.currentFile = 'app/Http/Controllers/Api/UserController.php'
        this.updateEditorHeader(this.currentFile)
    }

    detectLanguage(filePath) {
        const extension = filePath.split('.').pop().toLowerCase()
        const languageMap = {
            'php': 'php',
            'js': 'javascript',
            'json': 'json',
            'yaml': 'yaml',
            'yml': 'yaml',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'md': 'markdown'
        }
        
        return languageMap[extension] || 'plaintext'
    }

    updateEditorHeader(filePath) {
        const header = document.getElementById('editor-header')
        if (header) {
            header.textContent = filePath || 'No file selected'
        }
    }

    showNotification(message, type = 'info') {
        // Simple notification - can be enhanced later
        const notification = document.createElement('div')
        notification.className = `notification notification-${type}`
        notification.textContent = message
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
            color: white;
            border-radius: 4px;
            z-index: 1000;
        `
        
        document.body.appendChild(notification)
        
        setTimeout(() => {
            notification.remove()
        }, 3000)
    }

    // Load sample templates
    loadTemplate(templateName) {
        const templates = {
            'basic-api': {
                'app/Http/Controllers/Api/UserController.php': this.getBasicApiTemplate(),
                'app/Http/Requests/UserRequest.php': this.getUserRequestTemplate(),
                'app/Http/Resources/UserResource.php': this.getUserResourceTemplate(),
                'routes/api.php': this.getApiRoutesTemplate()
            },
            'complex-validation': {
                'app/Http/Controllers/Api/ProductController.php': this.getComplexValidationTemplate(),
                'app/Http/Requests/ProductRequest.php': this.getComplexProductRequestTemplate()
            }
        }

        const template = templates[templateName]
        if (template) {
            // Load the first file from template
            const firstFile = Object.keys(template)[0]
            this.currentFile = firstFile
            this.editor.setValue(template[firstFile])
            this.updateEditorHeader(firstFile)
            
            // Store all template files
            Object.entries(template).forEach(([path, content]) => {
                this.files.set(path, content)
            })
        }
    }

    getBasicApiTemplate() {
        return `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Http\\Requests\\UserRequest;
use App\\Http\\Resources\\UserResource;
use App\\Models\\User;
use Illuminate\\Http\\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::paginate($request->per_page ?? 15);
        return UserResource::collection($users);
    }

    public function store(UserRequest $request)
    {
        $user = User::create($request->validated());
        return new UserResource($user);
    }

    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function update(UserRequest $request, User $user)
    {
        $user->update($request->validated());
        return new UserResource($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->noContent();
    }
}`
    }

    getUserRequestTemplate() {
        return `<?php

namespace App\\Http\\Requests;

use Illuminate\\Foundation\\Http\\FormRequest;

class UserRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $this->user?->id,
            'password' => $this->isMethod('POST') ? 'required|string|min:8' : 'nullable|string|min:8',
            'role' => 'nullable|in:admin,user,moderator',
            'is_active' => 'boolean'
        ];
    }
}`
    }

    getUserResourceTemplate() {
        return `<?php

namespace App\\Http\\Resources;

use Illuminate\\Http\\Resources\\Json\\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}`
    }

    getApiRoutesTemplate() {
        return `<?php

use App\\Http\\Controllers\\Api\\UserController;
use Illuminate\\Support\\Facades\\Route;

Route::prefix('v1')->group(function () {
    Route::apiResource('users', UserController::class);
});`
    }

    getComplexValidationTemplate() {
        return `<?php

namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use App\\Http\\Requests\\ProductRequest;
use App\\Models\\Product;
use Illuminate\\Http\\Request;

class ProductController extends Controller
{
    public function store(ProductRequest $request)
    {
        $product = Product::create($request->validated());
        
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');
                $product->images()->create(['path' => $path]);
            }
        }
        
        return response()->json($product->load('images'), 201);
    }

    public function update(ProductRequest $request, Product $product)
    {
        $product->update($request->validated());
        return response()->json($product);
    }
}`
    }

    getComplexProductRequestTemplate() {
        return `<?php

namespace App\\Http\\Requests;

use Illuminate\\Foundation\\Http\\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'required|string|min:10',
            'price' => 'required|numeric|min:0|max:999999.99',
            'quantity' => 'required|integer|min:0',
            'category_id' => 'required|exists:categories,id',
            'tags' => 'array',
            'tags.*' => 'string|max:50',
            'specifications' => 'array',
            'specifications.*.name' => 'required|string',
            'specifications.*.value' => 'required|string',
            'images' => 'array|max:5',
            'images.*' => 'image|mimes:jpeg,png,jpg|max:2048',
            'is_featured' => 'boolean',
            'publish_at' => 'nullable|date|after:now'
        ];
    }

    public function messages()
    {
        return [
            'price.max' => 'The price cannot exceed $999,999.99',
            'images.*.max' => 'Each image must be less than 2MB',
            'publish_at.after' => 'The publish date must be in the future'
        ];
    }
}`
    }
}

// Export for use in other modules
window.CodeEditor = CodeEditor