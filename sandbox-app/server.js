const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/sandbox.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sandbox.html'));
});

// API endpoints
app.get('/api/sessions/:sessionId/files', (req, res) => {
    // Mock file tree for now
    const files = {
        name: 'app',
        type: 'directory',
        children: [
            {
                name: 'routes',
                type: 'directory',
                children: [
                    { name: 'api.php', type: 'file' },
                    { name: 'web.php', type: 'file' }
                ]
            },
            {
                name: 'Http',
                type: 'directory',
                children: [
                    {
                        name: 'Controllers',
                        type: 'directory',
                        children: [
                            { name: 'UserController.php', type: 'file' },
                            { name: 'ProductController.php', type: 'file' }
                        ]
                    }
                ]
            },
            {
                name: 'storage',
                type: 'directory',
                children: [
                    {
                        name: 'app',
                        type: 'directory',
                        children: [
                            {
                                name: 'spectrum',
                                type: 'directory',
                                children: [
                                    { name: 'openapi.json', type: 'file' },
                                    { name: 'openapi.yaml', type: 'file' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    };
    res.json(files);
});

app.get('/api/sessions/:sessionId/output/:file', (req, res) => {
    // Mock output content
    const mockOutputs = {
        'openapi.json': {
            openapi: '3.0.0',
            info: {
                title: 'Laravel API',
                version: '1.0.0'
            },
            paths: {
                '/api/users': {
                    get: {
                        summary: 'Get all users',
                        responses: {
                            '200': {
                                description: 'Success'
                            }
                        }
                    }
                }
            }
        },
        'openapi.yaml': `openapi: 3.0.0
info:
  title: Laravel API
  version: 1.0.0
paths:
  /api/users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Success`,
        'postman.json': {
            info: {
                name: 'Laravel API',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: []
        },
        'insomnia.json': {
            _type: 'export',
            __export_format: 4,
            resources: []
        }
    };
    
    const content = mockOutputs[req.params.file] || {};
    res.json(content);
});

// Get file content
app.get('/api/sessions/:sessionId/files/:filePath(*)', (req, res) => {
    // Mock file content based on file path
    const filePath = req.params.filePath;
    
    const mockFiles = {
        'app/Http/Controllers/Api/UserController.php': `<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

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
}`,
        'routes/api.php': `<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::apiResource('users', UserController::class);
});`,
        'app/Http/Requests/UserRequest.php': `<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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
        ];
    }
}`,
        'app/Http/Resources/UserResource.php': `<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}`
    };
    
    const content = mockFiles[filePath];
    if (content) {
        res.type('text/plain').send(content);
    } else {
        res.status(404).json({ error: 'File not found' });
    }
});

// Save file content
app.put('/api/sessions/:sessionId/files/:filePath(*)', (req, res) => {
    const filePath = req.params.filePath;
    const { content } = req.body;
    
    // In a real implementation, this would save to the container's filesystem
    console.log(`Saving file ${filePath} with content:`, content.substring(0, 100) + '...');
    
    // Mock successful save
    res.json({ 
        success: true, 
        message: `File ${filePath} saved successfully`,
        path: filePath
    });
});

app.post('/api/sessions/:sessionId/download', (req, res) => {
    // Mock download functionality
    res.json({ downloadUrl: `/downloads/${uuidv4()}.zip` });
});

app.post('/api/sessions/:sessionId/reset', (req, res) => {
    // Mock reset functionality
    res.json({ success: true, message: 'Environment reset successfully' });
});

// WebSocket server for main app communication
const wss = new WebSocket.Server({ port: WS_PORT });

wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            // Echo back for now
            ws.send(JSON.stringify({
                type: 'ack',
                data: 'Message received'
            }));
        } catch (err) {
            console.error('WebSocket message error:', err);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket connection closed');
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Sandbox app server running on port ${PORT}`);
    console.log(`WebSocket server running on port ${WS_PORT}`);
});