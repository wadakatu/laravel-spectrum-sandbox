<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;

class DockerSandboxService
{
    private const SESSION_TTL = 3600; // 1時間
    private const MAX_SESSIONS = 10; // 同時実行数制限
    
    // バージョン互換性マトリックス
    private const VERSION_COMPATIBILITY = [
        'laravel' => [
            '10' => ['php' => ['8.1', '8.2', '8.3', '8.4']],
            '11' => ['php' => ['8.2', '8.3', '8.4']],
            '12' => ['php' => ['8.3', '8.4']]
        ],
        'lumen' => [
            '10' => ['php' => ['8.1', '8.2', '8.3', '8.4']],
            '11' => ['php' => ['8.2', '8.3', '8.4']],
            '12' => ['php' => ['8.3', '8.4']]
        ]
    ];
    
    public function createSession(string $framework, string $frameworkVersion, string $spectrumVersion, string $phpVersion): string
    {
        // バージョン互換性チェック
        $this->validateVersionCompatibility($framework, $frameworkVersion, $phpVersion);
        
        // セッション数チェック
        $activeSessions = Cache::get('active_sessions', []);
        if (count($activeSessions) >= self::MAX_SESSIONS) {
            throw new \RuntimeException('Maximum number of active sessions reached');
        }
        
        $sessionId = Str::uuid()->toString();
        $containerName = "spectrum-sandbox-{$sessionId}";
        
        // 汎用Dockerイメージを使用
        $imageName = "laravel-spectrum-sandbox:universal";
        
        // コンテナ作成・起動
        $process = new Process([
            'docker', 'run', '-d',
            '--name', $containerName,
            '--memory', '512m',
            '--cpus', '0.5',
            '--network', 'none', // ネットワーク分離
            '-e', "PHP_VERSION={$phpVersion}",
            '-e', "FRAMEWORK={$framework}",
            '-e', "FRAMEWORK_VERSION={$frameworkVersion}",
            '-e', "SPECTRUM_VERSION={$spectrumVersion}",
            $imageName
        ]);
        
        $process->run();
        
        if (!$process->isSuccessful()) {
            throw new \RuntimeException('Failed to create container: ' . $process->getErrorOutput());
        }
        
        // コンテナ内でフレームワークをセットアップ
        $this->setupFramework($containerName, $framework, $frameworkVersion);
        
        // Laravel Spectrumをインストール
        $this->executeInContainer($containerName, [
            'composer', 'require',
            "wadakatu/laravel-spectrum:{$spectrumVersion}",
            '--dev', '--no-interaction'
        ]);
        
        // デフォルトファイルを作成
        $this->createDefaultFiles($containerName, $framework);
        
        // セッション情報を保存
        $sessionData = [
            'container_name' => $containerName,
            'created_at' => now(),
            'framework' => $framework,
            'framework_version' => $frameworkVersion,
            'spectrum_version' => $spectrumVersion,
            'php_version' => $phpVersion
        ];
        
        Cache::put("session:{$sessionId}", $sessionData, self::SESSION_TTL);
        
        // アクティブセッションリストに追加
        $activeSessions[$sessionId] = $containerName;
        Cache::put('active_sessions', $activeSessions, 86400);
        
        return $sessionId;
    }
    
    private function validateVersionCompatibility(string $framework, string $frameworkVersion, string $phpVersion): void
    {
        if (!isset(self::VERSION_COMPATIBILITY[$framework][$frameworkVersion])) {
            throw new \RuntimeException("Unsupported {$framework} version: {$frameworkVersion}");
        }
        
        $supportedPhpVersions = self::VERSION_COMPATIBILITY[$framework][$frameworkVersion]['php'];
        if (!in_array($phpVersion, $supportedPhpVersions)) {
            throw new \RuntimeException(
                "{$framework} {$frameworkVersion} does not support PHP {$phpVersion}. " .
                "Supported versions: " . implode(', ', $supportedPhpVersions)
            );
        }
    }
    
    private function setupFramework(string $containerName, string $framework, string $version): void
    {
        if ($framework === 'laravel') {
            // Laravelプロジェクトを作成
            $this->executeInContainer($containerName, [
                'composer', 'create-project',
                "laravel/laravel:^{$version}.0",
                '/app',
                '--no-interaction',
                '--prefer-dist'
            ]);
        } else if ($framework === 'lumen') {
            // Lumenプロジェクトを作成
            $this->executeInContainer($containerName, [
                'composer', 'create-project',
                "laravel/lumen:^{$version}.0",
                '/app',
                '--no-interaction',
                '--prefer-dist'
            ]);
        }
    }
    
    private function createDefaultFiles(string $containerName, string $framework): void
    {
        // デフォルトのルートファイル
        $routesContent = $this->getDefaultRoutesContent($framework);
        $this->writeFileToContainer($containerName, 'routes/api.php', $routesContent);
        
        // デフォルトのコントローラー
        $controllerContent = $this->getDefaultControllerContent();
        $this->writeFileToContainer($containerName, 'app/Http/Controllers/UserController.php', $controllerContent);
        
        // デフォルトのFormRequest
        $requestContent = $this->getDefaultRequestContent();
        $this->writeFileToContainer($containerName, 'app/Http/Requests/StoreUserRequest.php', $requestContent);
        
        // デフォルトのResource
        $resourceContent = $this->getDefaultResourceContent();
        $this->writeFileToContainer($containerName, 'app/Http/Resources/UserResource.php', $resourceContent);
    }
    
    private function writeFileToContainer(string $containerName, string $path, string $content): void
    {
        $tempFile = tempnam(sys_get_temp_dir(), 'sandbox');
        file_put_contents($tempFile, $content);
        
        $process = new Process([
            'docker', 'cp',
            $tempFile,
            "{$containerName}:/app/{$path}"
        ]);
        
        $process->run();
        unlink($tempFile);
    }
    
    private function getDefaultRoutesContent(string $framework): string
    {
        if ($framework === 'lumen') {
            return <<<'PHP'
<?php

/** @var \Laravel\Lumen\Routing\Router $router */

$router->group(['prefix' => 'api/v1'], function () use ($router) {
    // Users endpoints
    $router->get('users', 'UserController@index');
    $router->post('users', 'UserController@store');
    $router->get('users/{id}', 'UserController@show');
    $router->put('users/{id}', 'UserController@update');
    $router->delete('users/{id}', 'UserController@destroy');
    
    // Posts endpoints
    $router->get('posts', 'PostController@index');
    $router->post('posts', 'PostController@store');
    $router->get('posts/{id}', 'PostController@show');
    $router->put('posts/{id}', 'PostController@update');
    $router->delete('posts/{id}', 'PostController@destroy');
});
PHP;
        }
        
        // Laravel routes
        return <<<'PHP'
<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\PostController;

Route::prefix('api/v1')->group(function () {
    // Users endpoints
    Route::apiResource('users', UserController::class);
    
    // Posts endpoints  
    Route::apiResource('posts', PostController::class);
    Route::get('users/{user}/posts', [PostController::class, 'userPosts']);
});
PHP;
    }
    
    private function getDefaultControllerContent(): string
    {
        return <<<'PHP'
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
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

    public function store(StoreUserRequest $request)
    {
        $user = User::create($request->validated());
        return new UserResource($user);
    }

    public function show($id)
    {
        $user = User::findOrFail($id);
        return new UserResource($user->load('posts'));
    }

    public function update(StoreUserRequest $request, $id)
    {
        $user = User::findOrFail($id);
        $user->update($request->validated());
        return new UserResource($user);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully'], 204);
    }
}
PHP;
    }
    
    private function getDefaultRequestContent(): string
    {
        return <<<'PHP'
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['sometimes', 'string', 'in:admin,user,moderator'],
            'is_active' => ['sometimes', 'boolean']
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'This email address is already registered.',
            'password.min' => 'Password must be at least 8 characters long.',
            'role.in' => 'Role must be either admin, user, or moderator.'
        ];
    }
}
PHP;
    }
    
    private function getDefaultResourceContent(): string
    {
        return <<<'PHP'
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'posts_count' => $this->whenCounted('posts'),
            'posts' => PostResource::collection($this->whenLoaded('posts')),
        ];
    }
}
PHP;
    }
    
    // 残りのメソッド...
    public function updateFile(string $sessionId, string $path, string $content): void
    {
        $session = $this->getSession($sessionId);
        
        // パスの検証
        $this->validatePath($path);
        
        // 一時ファイル作成
        $tempFile = tempnam(sys_get_temp_dir(), 'sandbox');
        file_put_contents($tempFile, $content);
        
        // Dockerコンテナにコピー
        $process = new Process([
            'docker', 'cp',
            $tempFile,
            "{$session['container_name']}:/app/{$path}"
        ]);
        
        $process->run();
        unlink($tempFile);
        
        if (!$process->isSuccessful()) {
            throw new \RuntimeException('Failed to update file: ' . $process->getErrorOutput());
        }
    }
    
    public function executeCommand(string $sessionId, string $command): array
    {
        $session = $this->getSession($sessionId);
        
        // コマンドマッピング
        $commandMap = [
            'spectrum:generate' => ['php', 'artisan', 'spectrum:generate', '--format=json'],
            'spectrum:watch' => ['timeout', '5', 'php', 'artisan', 'spectrum:watch'], // 5秒でタイムアウト
            'spectrum:mock' => ['timeout', '5', 'php', 'artisan', 'spectrum:mock'],
            'spectrum:cache' => ['php', 'artisan', 'spectrum:cache', 'stats'],
            'spectrum:export:postman' => ['php', 'artisan', 'spectrum:export:postman'],
            'spectrum:export:insomnia' => ['php', 'artisan', 'spectrum:export:insomnia']
        ];
        
        if (!isset($commandMap[$command])) {
            throw new \RuntimeException('Invalid command');
        }
        
        $result = $this->executeInContainer($session['container_name'], $commandMap[$command]);
        
        return $result;
    }
    
    public function getGeneratedOpenApi(string $sessionId): ?array
    {
        $session = $this->getSession($sessionId);
        
        $process = new Process([
            'docker', 'exec',
            $session['container_name'],
            'cat', '/app/storage/app/spectrum/openapi.json'
        ]);
        
        $process->run();
        
        if ($process->isSuccessful()) {
            $json = $process->getOutput();
            return json_decode($json, true);
        }
        
        return null;
    }
    
    public function getSessionStatus(string $sessionId): array
    {
        $session = $this->getSession($sessionId);
        
        // コンテナの状態確認
        $process = new Process([
            'docker', 'inspect',
            '--format', '{{.State.Status}}',
            $session['container_name']
        ]);
        
        $process->run();
        
        return [
            'session_id' => $sessionId,
            'status' => $process->isSuccessful() ? trim($process->getOutput()) : 'unknown',
            'created_at' => $session['created_at'],
            'expires_in' => Cache::ttl("session:{$sessionId}")
        ];
    }
    
    public function destroySession(string $sessionId): void
    {
        $session = Cache::get("session:{$sessionId}");
        
        if ($session) {
            // コンテナ削除
            $process = new Process([
                'docker', 'rm', '-f',
                $session['container_name']
            ]);
            
            $process->run();
            
            // キャッシュから削除
            Cache::forget("session:{$sessionId}");
            
            // アクティブセッションリストから削除
            $activeSessions = Cache::get('active_sessions', []);
            unset($activeSessions[$sessionId]);
            Cache::put('active_sessions', $activeSessions, 86400);
        }
    }
    
    private function getSession(string $sessionId): array
    {
        $session = Cache::get("session:{$sessionId}");
        
        if (!$session) {
            throw new \RuntimeException('Session not found or expired');
        }
        
        return $session;
    }
    
    private function executeInContainer(string $containerName, array $command): array
    {
        $process = new Process(array_merge(['docker', 'exec'], [$containerName], $command));
        $process->setTimeout(30);
        $process->run();
        
        return [
            'output' => $process->getOutput(),
            'error' => $process->getErrorOutput(),
            'exit_code' => $process->getExitCode()
        ];
    }
    
    private function validatePath(string $path): void
    {
        $allowedPaths = [
            'routes/api.php',
            'routes/web.php',
            'app/Http/Controllers/',
            'app/Http/Requests/',
            'app/Http/Resources/',
            'app/Models/'
        ];
        
        $isValid = false;
        foreach ($allowedPaths as $allowed) {
            if (str_starts_with($path, $allowed)) {
                $isValid = true;
                break;
            }
        }
        
        if (!$isValid) {
            throw new \RuntimeException('Invalid file path. Only specific directories are allowed.');
        }
    }
}