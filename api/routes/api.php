<?php

declare(strict_types=1);

use App\Http\Controllers\SandboxController;
use App\Http\Controllers\VersionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// CORS対応のためのプリフライトリクエスト
Route::options('{any}', function () {
    return response('', 200);
})->where('any', '.*');

// Sandboxエンドポイント
Route::prefix('v1')->group(function () {
    // バージョン情報
    Route::get('versions', [VersionController::class, 'available']);
    
    // Sandboxセッション管理
    Route::post('sandbox/create', [SandboxController::class, 'create']);
    Route::post('sandbox/{sessionId}/file', [SandboxController::class, 'updateFile']);
    Route::post('sandbox/{sessionId}/execute', [SandboxController::class, 'executeCommand']);
    Route::get('sandbox/{sessionId}/status', [SandboxController::class, 'status']);
    Route::delete('sandbox/{sessionId}', [SandboxController::class, 'destroy']);
});