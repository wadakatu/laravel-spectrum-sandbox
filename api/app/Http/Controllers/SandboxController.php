<?php

namespace App\Http\Controllers;

use App\Services\DockerSandboxService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SandboxController extends Controller
{
    private DockerSandboxService $sandboxService;
    
    public function __construct(DockerSandboxService $sandboxService)
    {
        $this->sandboxService = $sandboxService;
    }
    
    public function create(Request $request)
    {
        try {
            $validated = $request->validate([
                'framework' => 'required|in:laravel,lumen',
                'framework_version' => 'required|in:10,11,12',
                'spectrum_version' => 'required|string',
                'php_version' => 'required|in:8.1,8.2,8.3,8.4'
            ]);
            
            $sessionId = $this->sandboxService->createSession(
                $validated['framework'],
                $validated['framework_version'],
                $validated['spectrum_version'],
                $validated['php_version']
            );
            
            return response()->json([
                'session_id' => $sessionId,
                'status' => 'ready',
                'expires_in' => 3600 // 1時間
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to create sandbox session', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Failed to create sandbox session: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function updateFile(Request $request, string $sessionId)
    {
        try {
            $validated = $request->validate([
                'path' => 'required|string',
                'content' => 'required|string'
            ]);
            
            $this->sandboxService->updateFile(
                $sessionId,
                $validated['path'],
                $validated['content']
            );
            
            return response()->json(['success' => true]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 400);
        }
    }
    
    public function executeCommand(Request $request, string $sessionId)
    {
        try {
            $validated = $request->validate([
                'command' => 'required|string|in:spectrum:generate,spectrum:watch,spectrum:mock,spectrum:cache,spectrum:export:postman,spectrum:export:insomnia'
            ]);
            
            $result = $this->sandboxService->executeCommand(
                $sessionId,
                $validated['command']
            );
            
            // generateコマンドの場合、生成されたOpenAPIも取得
            $openapi = null;
            if ($validated['command'] === 'spectrum:generate') {
                $openapi = $this->sandboxService->getGeneratedOpenApi($sessionId);
            }
            
            return response()->json([
                'output' => $result['output'],
                'error' => $result['error'] ?? null,
                'exit_code' => $result['exit_code'],
                'openapi' => $openapi
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 400);
        }
    }
    
    public function status(string $sessionId)
    {
        try {
            $status = $this->sandboxService->getSessionStatus($sessionId);
            
            return response()->json($status);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Session not found'
            ], 404);
        }
    }
    
    public function destroy(string $sessionId)
    {
        try {
            $this->sandboxService->destroySession($sessionId);
            
            return response()->json(['success' => true]);
            
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 400);
        }
    }
}