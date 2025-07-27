<?php

namespace App\Http\Controllers;

class VersionController extends Controller
{
    public function available()
    {
        return response()->json([
            'frameworks' => [
                'laravel' => [
                    'versions' => ['10', '11', '12'],
                    'php_compatibility' => [
                        '10' => ['8.1', '8.2', '8.3', '8.4'],
                        '11' => ['8.2', '8.3', '8.4'],
                        '12' => ['8.3', '8.4']
                    ]
                ],
                'lumen' => [
                    'versions' => ['10', '11', '12'],
                    'php_compatibility' => [
                        '10' => ['8.1', '8.2', '8.3', '8.4'],
                        '11' => ['8.2', '8.3', '8.4'],
                        '12' => ['8.3', '8.4']
                    ]
                ]
            ],
            'spectrum_versions' => [
                'dev-main',
                '^1.0',
                '^0.9'
            ],
            'php_versions' => ['8.1', '8.2', '8.3', '8.4']
        ]);
    }
}