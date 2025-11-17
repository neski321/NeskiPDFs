<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;

// API routes are handled by api.php - this is just a fallback
Route::get('/api/{path?}', function () {
    return response()->json(['message' => 'Not found'], 404);
})->where('path', '.*');

// Serve the frontend application
// This route should be last to catch all non-API routes
Route::get('/{path?}', function ($path = null) {
    // Get the path to the built frontend files
    // Try multiple possible locations for Railway deployment
    $possiblePaths = [
        base_path('../dist/public'),  // Relative to backend directory
        base_path('../../dist/public'), // If backend is nested
        '/app/dist/public',            // Absolute path on Railway
        getcwd() . '/../dist/public',  // Current working directory relative
    ];
    
    $publicPath = null;
    foreach ($possiblePaths as $possiblePath) {
        $testPath = realpath($possiblePath);
        if ($testPath && File::exists($testPath . '/index.html')) {
            $publicPath = $testPath;
            break;
        }
    }
    
    // If we couldn't find the frontend, return error
    if (!$publicPath) {
        return response()->json([
            'message' => 'Frontend not found',
            'hint' => 'Frontend build files not found. Checked: ' . implode(', ', $possiblePaths),
            'cwd' => getcwd(),
            'base_path' => base_path(),
        ], 404);
    }
    
    // Normalize path - remove leading slash and handle empty path
    $requestedPath = $path ? ltrim($path, '/') : '';
    
    // If path is empty or just '/', serve index.html
    if (empty($requestedPath)) {
        $indexPath = $publicPath . '/index.html';
        if (File::exists($indexPath)) {
            return response()->file($indexPath, ['Content-Type' => 'text/html']);
        }
    }
    
    // Try to serve the requested file (for assets like JS, CSS, images)
    $filePath = $publicPath . '/' . $requestedPath;
    if (File::exists($filePath) && File::isFile($filePath)) {
        // Determine MIME type
        $extension = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeTypes = [
            'js' => 'application/javascript',
            'css' => 'text/css',
            'html' => 'text/html',
            'json' => 'application/json',
            'png' => 'image/png',
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            'svg' => 'image/svg+xml',
            'ico' => 'image/x-icon',
        ];
        $mimeType = $mimeTypes[$extension] ?? File::mimeType($filePath) ?? 'application/octet-stream';
        
        return response()->file($filePath, ['Content-Type' => $mimeType]);
    }
    
    // Fallback to index.html for SPA routing (React Router, etc.)
    $indexPath = $publicPath . '/index.html';
    if (File::exists($indexPath)) {
        return response()->file($indexPath, ['Content-Type' => 'text/html']);
    }
    
    // If frontend is not built, return a helpful message
    return response()->json([
        'message' => 'Frontend not built',
        'hint' => 'Run "npm run build" to build the frontend'
    ], 404);
})->where('path', '^(?!api).*');
