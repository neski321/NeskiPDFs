<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\PdfController;

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

// PDF operations
Route::post('/pdf/merge', [PdfController::class, 'merge']);
Route::post('/pdf/metadata', [PdfController::class, 'metadata']);
Route::post('/pdf/rotate', [PdfController::class, 'rotate']);
Route::post('/pdf/delete-pages', [PdfController::class, 'deletePages']);
Route::post('/pdf/reorder', [PdfController::class, 'reorder']);
Route::post('/pdf/extract-text', [PdfController::class, 'extractText']);
Route::post('/pdf/extract-text-positions', [PdfController::class, 'extractTextWithPositions']);
Route::post('/pdf/replace-text', [PdfController::class, 'replaceText']);
Route::post('/pdf/replace-text-in-pdf', [PdfController::class, 'replaceTextInPdf']);
Route::post('/pdf/add-text', [PdfController::class, 'addText']);
Route::post('/pdf/add-text-overlays', [PdfController::class, 'addTextOverlays']);
Route::post('/pdf/to-image', [PdfController::class, 'pdfToImage']);
Route::post('/pdf/image-to-pdf', [PdfController::class, 'imageToPdf']);

