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
    $publicPath = base_path('../dist/public');
    
    // If path is empty or just '/', serve index.html
    if (empty($path) || $path === '/') {
        $indexPath = $publicPath . '/index.html';
        if (File::exists($indexPath)) {
            return response()->file($indexPath);
        }
    }
    
    // Try to serve the requested file (for assets like JS, CSS, images)
    $filePath = $publicPath . '/' . $path;
    if (File::exists($filePath) && File::isFile($filePath)) {
        $mimeType = File::mimeType($filePath);
        return response()->file($filePath, ['Content-Type' => $mimeType]);
    }
    
    // Fallback to index.html for SPA routing (React Router, etc.)
    $indexPath = $publicPath . '/index.html';
    if (File::exists($indexPath)) {
        return response()->file($indexPath);
    }
    
    // If frontend is not built, return a helpful message
    return response()->json([
        'message' => 'Frontend not built',
        'hint' => 'Run "npm run build" to build the frontend'
    ], 404);
})->where('path', '^(?!api).*');
