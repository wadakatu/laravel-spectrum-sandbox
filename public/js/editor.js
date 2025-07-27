// Sample code files
const sampleFiles = {
    'routes/api.php': `<?php

use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Route;
use App\\Http\\Controllers\\UserController;
use App\\Http\\Controllers\\PostController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // User endpoints
    Route::apiResource('users', UserController::class);
    
    // Post endpoints  
    Route::apiResource('posts', PostController::class);
    Route::get('users/{user}/posts', [PostController::class, 'userPosts']);
});`,
    
    'app/Http/Controllers/UserController.php': `<?php

namespace App\\Http\\Controllers;

use App\\Http\\Requests\\StoreUserRequest;
use App\\Http\\Requests\\UpdateUserRequest;
use App\\Http\\Resources\\UserResource;
use App\\Models\\User;
use Illuminate\\Http\\Request;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request)
    {
        $users = User::query()
            ->when($request->get('search'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            })
            ->paginate($request->get('per_page', 15));

        return UserResource::collection($users);
    }

    /**
     * Store a newly created user
     */
    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());

        return new UserResource($user);
    }

    /**
     * Display the specified user
     */
    public function show(User $user)
    {
        return new UserResource($user->load('posts'));
    }

    /**
     * Update the specified user
     */
    public function update(UpdateUserRequest $request, User $user)
    {
        $user->update($request->validated());

        return new UserResource($user);
    }

    /**
     * Remove the specified user
     */
    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ], 204);
    }
}`,

    'app/Http/Requests/StoreUserRequest.php': `<?php

namespace App\\Http\\Requests;

use Illuminate\\Foundation\\Http\\FormRequest;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['sometimes', 'string', 'in:admin,user,moderator'],
            'is_active' => ['sometimes', 'boolean']
        ];
    }

    /**
     * Get custom error messages
     */
    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
            'password.min' => 'Password must be at least 8 characters long.',
            'role.in' => 'Role must be either admin, user, or moderator.'
        ];
    }
}`,

    'app/Http/Resources/UserResource.php': `<?php

namespace App\\Http\\Resources;

use Illuminate\\Http\\Request;
use Illuminate\\Http\\Resources\\Json\\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
            'posts_count' => $this->whenCounted('posts'),
            'posts' => PostResource::collection($this->whenLoaded('posts')),
        ];
    }
}`
};

// Store original code for reset functionality
const originalFiles = JSON.parse(JSON.stringify(sampleFiles));

// Export sampleFiles to global scope for access from app.js
window.sampleFiles = sampleFiles;

// Initialize Monaco Editor
let editor;
let currentFile = 'routes/api.php';

// Monaco loader configuration
require.config({ paths: { 'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' }});

// Load Monaco and initialize editor
require(['vs/editor/editor.main'], function() {
    // Create editor
    editor = monaco.editor.create(document.getElementById('editor'), {
        value: sampleFiles[currentFile],
        language: 'php',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
        scrollBeyondLastLine: false,
        wordWrap: 'on'
    });

    // Track changes and emit events
    editor.onDidChangeModelContent(() => {
        const newContent = editor.getValue();
        sampleFiles[currentFile] = newContent;
        
        // Emit custom event for code changes
        window.dispatchEvent(new CustomEvent('codeChanged', {
            detail: {
                file: currentFile,
                content: newContent
            }
        }));
    });
});

// File selection
document.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', (e) => {
        // Update active state
        document.querySelectorAll('.file-item').forEach(f => f.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        // Load file content
        const fileName = e.currentTarget.getAttribute('data-file');
        currentFile = fileName;
        document.getElementById('current-file').textContent = fileName;
        
        if (editor) {
            editor.setValue(sampleFiles[fileName] || '// File not found');
            
            // Emit event for file switch
            window.dispatchEvent(new CustomEvent('codeChanged', {
                detail: {
                    file: fileName,
                    content: sampleFiles[fileName]
                }
            }));
        }
    });
});

// Reset code button
document.getElementById('reset-code').addEventListener('click', () => {
    if (confirm('Reset this file to its original content?')) {
        sampleFiles[currentFile] = originalFiles[currentFile];
        editor.setValue(sampleFiles[currentFile]);
    }
});