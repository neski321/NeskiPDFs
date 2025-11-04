<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use setasign\Fpdi\Fpdi;
use setasign\Fpdf\Fpdf;
use Smalot\PdfParser\Parser;
use Spatie\PdfToImage\Pdf as PdfToImage;

class PdfController extends Controller
{
    /**
     * Merge multiple PDF files into one
     */
    public function merge(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdfs' => 'required|array|min:2|max:20',
            'pdfs.*' => 'required|file|mimes:pdf|max:51200', // 50MB per file
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'At least 2 PDF files are required'
            ], 400);
        }

        try {
            $files = $request->file('pdfs');
            $pdf = new Fpdi();

            foreach ($files as $file) {
                $pageCount = $pdf->setSourceFile($file->getRealPath());
                
                for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                    $templateId = $pdf->importPage($pageNo);
                    $size = $pdf->getTemplateSize($templateId);
                    
                    // Add page with the same orientation
                    $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                    $pdf->useTemplate($templateId);
                }
            }

            $pdfContent = $pdf->Output('S'); // 'S' returns as string
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="merged.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error merging PDFs: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to merge PDFs'
            ], 500);
        }
    }

    /**
     * Get PDF metadata (page count, file name, file size)
     */
    public function metadata(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file is required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pdf = new Fpdi();
            $pageCount = $pdf->setSourceFile($file->getRealPath());

            return response()->json([
                'pageCount' => $pageCount,
                'fileName' => $file->getClientOriginalName(),
                'fileSize' => $file->getSize(),
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error reading PDF metadata: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to read PDF metadata'
            ], 500);
        }
    }

    /**
     * Rotate specified pages in a PDF
     */
    public function rotate(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageIndices' => 'required|string',
            'rotation' => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file, pageIndices, and rotation are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageIndices = json_decode($request->input('pageIndices'), true);
            $rotation = (int) $request->input('rotation');

            if (!is_array($pageIndices)) {
                return response()->json([
                    'error' => 'Invalid pageIndices format'
                ], 400);
            }

            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            $pdf = new Fpdi();

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                // Determine if this page should be rotated
                $pageIndex = $pageNo - 1; // Convert to 0-based index
                $shouldRotate = in_array($pageIndex, $pageIndices);
                
                // Calculate rotation
                $rotationAngle = $shouldRotate ? $rotation : 0;
                
                // Determine page dimensions and orientation
                $width = $size['width'];
                $height = $size['height'];
                $orientation = $size['orientation'];
                
                // If rotating 90 or 270 degrees, swap dimensions
                if ($shouldRotate && (abs($rotationAngle) % 180 === 90)) {
                    $temp = $width;
                    $width = $height;
                    $height = $temp;
                    $orientation = $orientation === 'P' ? 'L' : 'P';
                }
                
                // Add page with correct dimensions
                $pdf->AddPage($orientation === 'L' ? 'L' : 'P', [$width, $height]);
                
                // Rotate the page if needed
                if ($shouldRotate) {
                    // Calculate center point
                    $centerX = $width / 2;
                    $centerY = $height / 2;
                    
                    // Apply rotation
                    $pdf->Rotate($rotationAngle, $centerX, $centerY);
                    
                    // Use template with adjusted positioning
                    $pdf->useTemplate($templateId, 0, 0, $size['width'], $size['height']);
                    
                    // Reset rotation
                    $pdf->Rotate(0);
                } else {
                    $pdf->useTemplate($templateId);
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="rotated.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error rotating PDF pages: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to rotate PDF pages'
            ], 500);
        }
    }

    /**
     * Delete specified pages from a PDF
     */
    public function deletePages(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageIndices' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file and pageIndices are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageIndices = json_decode($request->input('pageIndices'), true);

            if (!is_array($pageIndices)) {
                return response()->json([
                    'error' => 'Invalid pageIndices format'
                ], 400);
            }

            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            $pdf = new Fpdi();

            // Sort indices in descending order to avoid index shifting issues
            $sortedIndices = array_unique($pageIndices);
            rsort($sortedIndices);

            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $pageIndex = $pageNo - 1; // Convert to 0-based index
                
                // Skip pages that should be deleted
                if (in_array($pageIndex, $sortedIndices)) {
                    continue;
                }

                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error deleting PDF pages: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete PDF pages'
            ], 500);
        }
    }

    /**
     * Reorder pages in a PDF according to the specified order
     */
    public function reorder(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageOrder' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file and pageOrder are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageOrder = json_decode($request->input('pageOrder'), true);

            if (!is_array($pageOrder)) {
                return response()->json([
                    'error' => 'Invalid pageOrder format'
                ], 400);
            }

            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            $pdf = new Fpdi();

            foreach ($pageOrder as $pageIndex) {
                $pageNo = $pageIndex + 1; // Convert to 1-based page number
                
                if ($pageNo < 1 || $pageNo > $pageCount) {
                    continue; // Skip invalid page indices
                }

                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="reordered.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error reordering PDF pages: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to reorder PDF pages'
            ], 500);
        }
    }

    /**
     * Extract text from a specific page of a PDF
     */
    public function extractText(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file and pageNumber are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');

            // Use PDF parser to extract text
            $parser = new Parser();
            $pdf = $parser->parseFile($file->getRealPath());
            $pages = $pdf->getPages();

            if ($pageNumber < 1 || $pageNumber > count($pages)) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Get the specific page (pages are 1-indexed in the library)
            $page = $pages[$pageNumber - 1];
            $text = $page->getText();

            // Clean up the text (remove excessive whitespace)
            $text = preg_replace('/\s+/', ' ', $text);
            $text = trim($text);

            return response()->json([
                'text' => $text,
                'pageNumber' => $pageNumber,
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error extracting text: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to extract text from PDF. This may be a scanned image or protected PDF.',
                'text' => ''
            ], 500);
        }
    }

    /**
     * Extract text with positions from a PDF page (Server-side)
     * Uses advanced PDF parsing to extract text with approximate positions
     */
    public function extractTextWithPositions(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file and pageNumber are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');

            $parser = new Parser();
            $parsedPdf = $parser->parseFile($file->getRealPath());
            $pages = $parsedPdf->getPages();
            
            if ($pageNumber < 1 || $pageNumber > count($pages)) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            $page = $pages[$pageNumber - 1];
            
            // Get page details for dimensions
            $details = $page->getDetails();
            $pageWidth = isset($details['MediaBox'][2]) ? $details['MediaBox'][2] : 612; // Default A4 width
            $pageHeight = isset($details['MediaBox'][3]) ? $details['MediaBox'][3] : 792; // Default A4 height
            
            // Extract text with better position estimation
            $textItems = [];
            
            try {
                $text = $page->getText();
            } catch (\Exception $e) {
                // If getText() fails, try alternative method
                \Log::warning('getText() failed, trying alternative: ' . $e->getMessage());
                $text = $page->getText(['simple' => false]);
            }
            
            // If text is still empty or null, return empty result
            if (empty($text)) {
                return response()->json([
                    'textItems' => [],
                    'pageWidth' => $pageWidth,
                    'pageHeight' => $pageHeight,
                    'fullText' => '',
                    'extractionMethod' => 'server-side',
                    'warning' => 'No text found in this PDF page. It may be a scanned image.',
                ]);
            }
            
            // Parse text segments and estimate positions
            // For native PDFs, we can get better position estimates
            $textSegments = preg_split('/\n+/', $text, -1, PREG_SPLIT_NO_EMPTY);
            $yPosition = $pageHeight - 72; // Start from top (72 points = 1 inch margin)
            $segmentId = 0;
            $lineHeight = 14; // Default line height
            $leftMargin = 72; // Default left margin (1 inch)
            
            foreach ($textSegments as $segment) {
                $segment = trim($segment);
                if (!empty($segment)) {
                    // Estimate text width based on character count
                    $estimatedWidth = strlen($segment) * 6; // Approximate 6 points per character
                    $estimatedFontSize = 12; // Default font size
                    
                    // Try to extract font information from page details (safely)
                    try {
                        $details = $page->getDetails();
                        if (isset($details['Font'])) {
                            $fontInfo = $details['Font'];
                            if (is_array($fontInfo) && isset($fontInfo['Size'])) {
                                $estimatedFontSize = (float)$fontInfo['Size'];
                            }
                        }
                    } catch (\Exception $e) {
                        // Font info not available, use default
                        \Log::debug('Could not extract font info: ' . $e->getMessage());
                    }
                    
                    $textItems[] = [
                        'id' => 'text-' . $segmentId++,
                        'text' => $segment,
                        'x' => $leftMargin,
                        'y' => $yPosition,
                        'width' => min($estimatedWidth, $pageWidth - $leftMargin - 72), // Don't exceed page width
                        'height' => $estimatedFontSize * 1.2, // Height with some spacing
                        'fontSize' => (int)$estimatedFontSize,
                        'fontFamily' => 'Arial', // Default, could be extracted from PDF
                        'fontStyle' => 'normal', // Default, could be extracted
                        'color' => [0, 0, 0], // Black (default)
                    ];
                    
                    // Move down for next line
                    $yPosition -= ($lineHeight * 1.2);
                }
            }

            return response()->json([
                'textItems' => $textItems,
                'pageWidth' => $pageWidth,
                'pageHeight' => $pageHeight,
                'fullText' => $text,
                'extractionMethod' => 'server-side',
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error extracting text with positions: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to extract text with positions from PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Replace text in a PDF page
     * Note: This is a simplified implementation that overlays text
     */
    public function replaceText(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
            'oldText' => 'required|string',
            'newText' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file, pageNumber, oldText, and newText are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');
            $oldText = $request->input('oldText');
            $newText = $request->input('newText');

            // Load the source PDF
            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            if ($pageNumber < 1 || $pageNumber > $pageCount) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Create new PDF
            $pdf = new Fpdi();

            // Copy all pages
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                // If this is the page we want to edit, add text overlay
                if ($pageNo === $pageNumber) {
                    // Try to find text position using PDF parser
                    try {
                        $parser = new Parser();
                        $parsedPdf = $parser->parseFile($file->getRealPath());
                        $pages = $parsedPdf->getPages();
                        $page = $pages[$pageNumber - 1];
                        $textContent = $page->get('Text');
                        
                        // Try to find position of old text (simplified approach)
                        // In a real implementation, you'd need to parse text objects and their positions
                        $x = 10;
                        $y = 20;
                        
                        // Set font for text overlay
                        $pdf->SetFont('Arial', '', 12);
                        $pdf->SetTextColor(0, 0, 0); // Black text
                        
                        // Add a white background to overlay old text (simple approach)
                        $pdf->SetFillColor(255, 255, 255);
                        $pdf->Rect($x - 2, $y - 5, strlen($newText) * 6, 15, 'F');
                        
                        // Position and add the new text
                        $pdf->SetXY($x, $y);
                        $pdf->Cell(0, 10, $newText, 0, 1);
                    } catch (\Exception $e) {
                        // Fallback: simple overlay
                        $pdf->SetFont('Arial', '', 12);
                        $pdf->SetTextColor(0, 0, 0);
                        $pdf->SetXY(10, 20);
                        $pdf->Cell(0, 10, $newText, 0, 1);
                    }
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited-text.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error replacing text: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to replace text in PDF'
            ], 500);
        }
    }

    /**
     * Replace text in PDF (Server-side text replacement)
     * This extracts text, allows replacement, and re-embeds the edited text
     * Uses background coverage to seamlessly replace existing text
     */
    public function replaceTextInPdf(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
            'textReplacements' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file, pageNumber, and textReplacements are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');
            $textReplacements = json_decode($request->input('textReplacements'), true);

            if (!is_array($textReplacements)) {
                return response()->json([
                    'error' => 'Invalid textReplacements format'
                ], 400);
            }

            // Load the source PDF
            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            if ($pageNumber < 1 || $pageNumber > $pageCount) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Extract existing text to find positions for replacement
            $parser = new Parser();
            $parsedPdf = $parser->parseFile($file->getRealPath());
            $pages = $parsedPdf->getPages();
            $page = $pages[$pageNumber - 1];
            $pageDetails = $page->getDetails();
            $pageHeight = isset($pageDetails['MediaBox'][3]) ? $pageDetails['MediaBox'][3] : 792;

            // Create new PDF
            $pdf = new Fpdi();

            // Available fonts
            $availableFonts = [
                'Arial' => 'Arial',
                'Times' => 'Times',
                'Courier' => 'Courier',
                'Helvetica' => 'Helvetica',
                'Symbol' => 'Symbol',
                'ZapfDingbats' => 'ZapfDingbats'
            ];

            // Copy all pages
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                // If this is the page we want to edit, replace text
                if ($pageNo === $pageNumber && count($textReplacements) > 0) {
                    foreach ($textReplacements as $replacement) {
                        $oldText = isset($replacement['oldText']) ? $replacement['oldText'] : '';
                        $newText = isset($replacement['newText']) ? $replacement['newText'] : '';
                        $oldBounds = isset($replacement['oldBounds']) ? $replacement['oldBounds'] : null;
                        $fontSize = isset($replacement['fontSize']) ? (int) $replacement['fontSize'] : 12;
                        $fontFamily = isset($replacement['fontFamily']) ? $replacement['fontFamily'] : 'Arial';
                        $fontStyle = isset($replacement['fontStyle']) ? $replacement['fontStyle'] : '';
                        $color = isset($replacement['color']) ? $replacement['color'] : [0, 0, 0];
                        $alignment = isset($replacement['alignment']) ? $replacement['alignment'] : 'left';
                        $lineSpacing = isset($replacement['lineSpacing']) ? (float) $replacement['lineSpacing'] : 1.0;
                        $width = isset($replacement['width']) ? (float) $replacement['width'] : null;

                        // Cover old text with white background if bounds provided
                        if ($oldBounds && !empty($oldText)) {
                            $oldX = isset($oldBounds['x']) ? (float) $oldBounds['x'] : 10;
                            $oldY = isset($oldBounds['y']) ? (float) $oldBounds['y'] : 10;
                            $oldWidth = isset($oldBounds['width']) ? (float) $oldBounds['width'] : 100;
                            $oldHeight = isset($oldBounds['height']) ? (float) $oldBounds['height'] : $fontSize * 1.2;
                            
                            // Convert Y coordinate (PDF.js uses bottom-left, FPDF uses top-left)
                            $oldY = $pageHeight - $oldY - $oldHeight;
                            
                            // Draw white rectangle to cover old text (seamless replacement)
                            $pdf->SetFillColor(255, 255, 255);
                            $pdf->Rect($oldX - 2, $oldY - 2, $oldWidth + 4, $oldHeight + 4, 'F');
                        }

                        // Set position for new text
                        $x = isset($replacement['x']) ? (float) $replacement['x'] : 10;
                        $y = isset($replacement['y']) ? (float) $replacement['y'] : 10;
                        
                        // Convert Y coordinate (PDF.js uses bottom-left, FPDF uses top-left)
                        $y = $pageHeight - $y;

                        // Validate coordinates
                        $x = max(0, min($x, $size['width'] - 10));
                        $y = max(0, min($y, $size['height'] - 10));

                        // Set font
                        $fontFamily = isset($availableFonts[$fontFamily]) ? $availableFonts[$fontFamily] : 'Arial';
                        
                        // Map font styles
                        $style = '';
                        if (strpos($fontStyle, 'bold') !== false || strpos($fontStyle, 'B') !== false) {
                            $style .= 'B';
                        }
                        if (strpos($fontStyle, 'italic') !== false || strpos($fontStyle, 'I') !== false) {
                            $style .= 'I';
                        }
                        if (strpos($fontStyle, 'underline') !== false || strpos($fontStyle, 'U') !== false) {
                            $style .= 'U';
                        }
                        
                        $pdf->SetFont($fontFamily, $style, $fontSize);
                        
                        // Set text color (RGB)
                        $r = isset($color[0]) ? (int) $color[0] : 0;
                        $g = isset($color[1]) ? (int) $color[1] : 0;
                        $b = isset($color[2]) ? (int) $color[2] : 0;
                        $pdf->SetTextColor($r, $g, $b);
                        
                        // Handle paragraph alignment and multi-line text
                        $lines = explode("\n", $newText);
                        $currentY = $y;
                        $lineHeight = $fontSize * $lineSpacing;
                        
                        foreach ($lines as $line) {
                            if (trim($line)) {
                                $pdf->SetXY($x, $currentY);
                                
                                if ($width && $alignment !== 'left') {
                                    // For center or right alignment with width constraint
                                    if ($alignment === 'center') {
                                        $pdf->SetX($x + ($width / 2) - ($pdf->GetStringWidth($line) / 2));
                                    } elseif ($alignment === 'right') {
                                        $pdf->SetX($x + $width - $pdf->GetStringWidth($line));
                                    }
                                }
                                
                                // Write the line
                                $pdf->Write($lineHeight, $line);
                            }
                            $currentY -= $lineHeight; // Move down (negative because Y decreases upward)
                        }
                    }
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited-text.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error replacing text in PDF: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to replace text in PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add text overlays to a PDF page
     * This modifies the actual PDF file by adding text on top of existing content
     * Uses PDF.js coordinates (points) for accurate positioning
     */
    public function addTextOverlays(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
            'textBoxes' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file, pageNumber, and textBoxes are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');
            $textBoxes = json_decode($request->input('textBoxes'), true);

            if (!is_array($textBoxes)) {
                return response()->json([
                    'error' => 'Invalid textBoxes format'
                ], 400);
            }

            // Load the source PDF
            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            if ($pageNumber < 1 || $pageNumber > $pageCount) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Create new PDF
            $pdf = new Fpdi();

            // Available fonts
            $availableFonts = [
                'Arial' => 'Arial',
                'Times' => 'Times',
                'Courier' => 'Courier',
                'Helvetica' => 'Helvetica',
                'Symbol' => 'Symbol',
                'ZapfDingbats' => 'ZapfDingbats'
            ];

            // Copy all pages
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                // If this is the page we want to edit, add text overlays
                if ($pageNo === $pageNumber && count($textBoxes) > 0) {
                    foreach ($textBoxes as $textBox) {
                        $x = isset($textBox['x']) ? (float) $textBox['x'] : 10;
                        $y = isset($textBox['y']) ? (float) $textBox['y'] : 10;
                        $text = isset($textBox['text']) ? $textBox['text'] : '';
                        $fontSize = isset($textBox['fontSize']) ? (int) $textBox['fontSize'] : 12;
                        $fontFamily = isset($textBox['fontFamily']) ? $textBox['fontFamily'] : 'Arial';
                        $fontStyle = isset($textBox['fontStyle']) ? $textBox['fontStyle'] : '';
                        $color = isset($textBox['color']) ? $textBox['color'] : [0, 0, 0];
                        $alignment = isset($textBox['alignment']) ? $textBox['alignment'] : 'left';
                        $lineSpacing = isset($textBox['lineSpacing']) ? (float) $textBox['lineSpacing'] : 1.0;
                        $width = isset($textBox['width']) ? (float) $textBox['width'] : null;

                        // Validate coordinates are within page bounds
                        $x = max(0, min($x, $size['width'] - 10));
                        $y = max(0, min($y, $size['height'] - 10));

                        // Set font family
                        $fontFamily = isset($availableFonts[$fontFamily]) ? $availableFonts[$fontFamily] : 'Arial';
                        
                        // Map font styles
                        $style = '';
                        if (strpos($fontStyle, 'bold') !== false || strpos($fontStyle, 'B') !== false) {
                            $style .= 'B';
                        }
                        if (strpos($fontStyle, 'italic') !== false || strpos($fontStyle, 'I') !== false) {
                            $style .= 'I';
                        }
                        if (strpos($fontStyle, 'underline') !== false || strpos($fontStyle, 'U') !== false) {
                            $style .= 'U';
                        }
                        
                        $pdf->SetFont($fontFamily, $style, $fontSize);
                        
                        // Set text color (RGB)
                        $r = isset($color[0]) ? (int) $color[0] : 0;
                        $g = isset($color[1]) ? (int) $color[1] : 0;
                        $b = isset($color[2]) ? (int) $color[2] : 0;
                        $pdf->SetTextColor($r, $g, $b);
                        
                        // Handle paragraph alignment and multi-line text
                        $lines = explode("\n", $text);
                        $currentY = $y;
                        $lineHeight = $fontSize * $lineSpacing;
                        
                        foreach ($lines as $line) {
                            $pdf->SetXY($x, $currentY);
                            
                            if ($width && $alignment !== 'left') {
                                // For center or right alignment with width constraint
                                if ($alignment === 'center') {
                                    $pdf->SetX($x + ($width / 2) - ($pdf->GetStringWidth($line) / 2));
                                } elseif ($alignment === 'right') {
                                    $pdf->SetX($x + $width - $pdf->GetStringWidth($line));
                                }
                            }
                            
                            // Write the line
                            $pdf->Write($lineHeight, $line);
                            $currentY += $lineHeight;
                        }
                    }
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited-text.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error adding text overlays: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to add text overlays to PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add or replace text in a PDF page with seamless text replacement
     * Supports multiple fonts, paragraph editing, and background coverage
     */
    public function addText(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
            'textBoxes' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file, pageNumber, and textBoxes are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');
            $textBoxes = json_decode($request->input('textBoxes'), true);

            if (!is_array($textBoxes)) {
                return response()->json([
                    'error' => 'Invalid textBoxes format'
                ], 400);
            }

            // Load the source PDF
            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($file->getRealPath());

            if ($pageNumber < 1 || $pageNumber > $pageCount) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Create new PDF
            $pdf = new Fpdi();

            // Available fonts in FPDF (built-in fonts)
            $availableFonts = [
                'Arial' => 'Arial',
                'Times' => 'Times',
                'Courier' => 'Courier',
                'Helvetica' => 'Helvetica',
                'Symbol' => 'Symbol',
                'ZapfDingbats' => 'ZapfDingbats'
            ];

            // Copy all pages
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                $pdf->useTemplate($templateId);

                // If this is the page we want to edit, process text boxes
                if ($pageNo === $pageNumber && count($textBoxes) > 0) {
                    foreach ($textBoxes as $textBox) {
                        $x = isset($textBox['x']) ? (float) $textBox['x'] : 10;
                        $y = isset($textBox['y']) ? (float) $textBox['y'] : 10;
                        $text = isset($textBox['text']) ? $textBox['text'] : '';
                        $fontSize = isset($textBox['fontSize']) ? (int) $textBox['fontSize'] : 12;
                        $fontFamily = isset($textBox['fontFamily']) ? $textBox['fontFamily'] : 'Arial';
                        $fontStyle = isset($textBox['fontStyle']) ? $textBox['fontStyle'] : '';
                        $color = isset($textBox['color']) ? $textBox['color'] : [0, 0, 0];
                        $oldTextBounds = isset($textBox['oldTextBounds']) ? $textBox['oldTextBounds'] : null;
                        $alignment = isset($textBox['alignment']) ? $textBox['alignment'] : 'left';
                        $lineSpacing = isset($textBox['lineSpacing']) ? (float) $textBox['lineSpacing'] : 1.0;
                        $width = isset($textBox['width']) ? (float) $textBox['width'] : null;

                        // Validate coordinates
                        $x = max(0, min($x, $size['width'] - 10));
                        $y = max(0, min($y, $size['height'] - 10));

                        // If replacing existing text, cover it with background first
                        if ($oldTextBounds) {
                            $oldX = isset($oldTextBounds['x']) ? (float) $oldTextBounds['x'] : $x;
                            $oldY = isset($oldTextBounds['y']) ? (float) $oldTextBounds['y'] : $y;
                            $oldWidth = isset($oldTextBounds['width']) ? (float) $oldTextBounds['width'] : 100;
                            $oldHeight = isset($oldTextBounds['height']) ? (float) $oldTextBounds['height'] : $fontSize * 1.2;
                            
                            // Draw white rectangle to cover old text (seamless replacement)
                            $pdf->SetFillColor(255, 255, 255);
                            $pdf->Rect($oldX - 2, $oldY - $oldHeight, $oldWidth + 4, $oldHeight + 4, 'F');
                        }

                        // Set font family (use available font or default to Arial)
                        $fontFamily = isset($availableFonts[$fontFamily]) ? $availableFonts[$fontFamily] : 'Arial';
                        
                        // Map font styles
                        $style = '';
                        if (strpos($fontStyle, 'bold') !== false || strpos($fontStyle, 'B') !== false) {
                            $style .= 'B';
                        }
                        if (strpos($fontStyle, 'italic') !== false || strpos($fontStyle, 'I') !== false) {
                            $style .= 'I';
                        }
                        if (strpos($fontStyle, 'underline') !== false || strpos($fontStyle, 'U') !== false) {
                            $style .= 'U';
                        }
                        
                        $pdf->SetFont($fontFamily, $style, $fontSize);
                        
                        // Set text color (RGB)
                        $r = isset($color[0]) ? (int) $color[0] : 0;
                        $g = isset($color[1]) ? (int) $color[1] : 0;
                        $b = isset($color[2]) ? (int) $color[2] : 0;
                        $pdf->SetTextColor($r, $g, $b);
                        
                        // Handle paragraph alignment and multi-line text
                        $lines = explode("\n", $text);
                        $currentY = $y;
                        $lineHeight = $fontSize * $lineSpacing;
                        
                        foreach ($lines as $line) {
                            $pdf->SetXY($x, $currentY);
                            
                            if ($width && $alignment !== 'left') {
                                // For center or right alignment with width constraint
                                if ($alignment === 'center') {
                                    $pdf->SetX($x + ($width / 2) - ($pdf->GetStringWidth($line) / 2));
                                } elseif ($alignment === 'right') {
                                    $pdf->SetX($x + $width - $pdf->GetStringWidth($line));
                                }
                            }
                            
                            // Write the line
                            $pdf->Write($lineHeight, $line);
                            $currentY += $lineHeight;
                        }
                    }
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited-text.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error adding text: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to add text to PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convert PDF page to image for editing
     * This allows editing any PDF (including scanned) by converting to image first
     */
    public function pdfToImage(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'pdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'PDF file and pageNumber are required'
            ], 400);
        }

        try {
            $file = $request->file('pdf');
            $pageNumber = (int) $request->input('pageNumber');

            // Save uploaded file temporarily
            $tempPath = $file->getRealPath();
            $tempDir = sys_get_temp_dir();
            $tempPdfPath = $tempDir . '/pdf_' . uniqid() . '.pdf';
            copy($tempPath, $tempPdfPath);

            // Convert PDF page to image using Spatie PDF to Image
            $pdfToImage = new PdfToImage($tempPdfPath);
            $pdfToImage->setPage($pageNumber);
            $pdfToImage->setResolution(300); // High resolution for quality
            $pdfToImage->setOutputFormat('png');
            
            // Get page dimensions from the original PDF
            $sourcePdf = new Fpdi();
            $sourcePdf->setSourceFile($tempPdfPath);
            $templateId = $sourcePdf->importPage($pageNumber);
            $size = $sourcePdf->getTemplateSize($templateId);
            $width = $size['width'];
            $height = $size['height'];

            // Convert to image
            $imagePath = $tempDir . '/img_' . uniqid() . '.png';
            $pdfToImage->saveImage($imagePath);

            // Read image as base64
            $imageData = file_get_contents($imagePath);
            $base64Image = base64_encode($imageData);
            $imageUrl = 'data:image/png;base64,' . $base64Image;

            // Clean up temporary files
            @unlink($tempPdfPath);
            @unlink($imagePath);

            return response()->json([
                'image' => $imageUrl,
                'width' => $width,
                'height' => $height,
                'pageNumber' => $pageNumber,
            ]);
            
        } catch (\Exception $e) {
            \Log::error('Error converting PDF to image: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to convert PDF to image. Please ensure ImageMagick is installed.',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convert image with text overlays back to PDF
     * This completes the PDF → Image → PDF workflow
     */
    public function imageToPdf(Request $request): \Illuminate\Http\Response|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'image' => 'required|file|mimes:png,jpg,jpeg|max:10240',
            'originalPdf' => 'required|file|mimes:pdf|max:51200',
            'pageNumber' => 'required|integer|min:1',
            'textBoxes' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Image, original PDF, pageNumber, and textBoxes are required'
            ], 400);
        }

        try {
            $imageFile = $request->file('image');
            $originalPdf = $request->file('originalPdf');
            $pageNumber = (int) $request->input('pageNumber');
            $textBoxes = json_decode($request->input('textBoxes'), true);

            if (!is_array($textBoxes)) {
                return response()->json([
                    'error' => 'Invalid textBoxes format'
                ], 400);
            }

            // Load the original PDF
            $sourcePdf = new Fpdi();
            $pageCount = $sourcePdf->setSourceFile($originalPdf->getRealPath());

            if ($pageNumber < 1 || $pageNumber > $pageCount) {
                return response()->json([
                    'error' => 'Invalid page number'
                ], 400);
            }

            // Create new PDF
            $pdf = new Fpdi();

            // Available fonts
            $availableFonts = [
                'Arial' => 'Arial',
                'Times' => 'Times',
                'Courier' => 'Courier',
                'Helvetica' => 'Helvetica',
                'Symbol' => 'Symbol',
                'ZapfDingbats' => 'ZapfDingbats'
            ];

            // Copy all pages
            for ($pageNo = 1; $pageNo <= $pageCount; $pageNo++) {
                $templateId = $sourcePdf->importPage($pageNo);
                $size = $sourcePdf->getTemplateSize($templateId);
                
                $pdf->AddPage($size['orientation'] === 'L' ? 'L' : 'P', [$size['width'], $size['height']]);
                
                // If this is the page we edited, use the image instead
                if ($pageNo === $pageNumber) {
                    // Get image dimensions
                    $imageInfo = getimagesize($imageFile->getRealPath());
                    $imageWidth = $imageInfo[0];
                    $imageHeight = $imageInfo[1];
                    
                    // Calculate scaling to fit page
                    $pageWidth = $size['width'];
                    $pageHeight = $size['height'];
                    
                    // Scale image to fit page while maintaining aspect ratio
                    $scaleX = $pageWidth / $imageWidth;
                    $scaleY = $pageHeight / $imageHeight;
                    $scale = min($scaleX, $scaleY);
                    
                    $scaledWidth = $imageWidth * $scale;
                    $scaledHeight = $imageHeight * $scale;
                    
                    // Center image on page
                    $x = ($pageWidth - $scaledWidth) / 2;
                    $y = ($pageHeight - $scaledHeight) / 2;
                    
                    // Add image to PDF
                    $pdf->Image($imageFile->getRealPath(), $x, $y, $scaledWidth, $scaledHeight);
                    
                    // Add text overlays on top of image
                    foreach ($textBoxes as $textBox) {
                        $x = isset($textBox['x']) ? (float) $textBox['x'] : 10;
                        $y = isset($textBox['y']) ? (float) $textBox['y'] : 10;
                        $text = isset($textBox['text']) ? $textBox['text'] : '';
                        $fontSize = isset($textBox['fontSize']) ? (int) $textBox['fontSize'] : 12;
                        $fontFamily = isset($textBox['fontFamily']) ? $textBox['fontFamily'] : 'Arial';
                        $fontStyle = isset($textBox['fontStyle']) ? $textBox['fontStyle'] : '';
                        $color = isset($textBox['color']) ? $textBox['color'] : [0, 0, 0];
                        $alignment = isset($textBox['alignment']) ? $textBox['alignment'] : 'left';
                        $lineSpacing = isset($textBox['lineSpacing']) ? (float) $textBox['lineSpacing'] : 1.0;
                        $width = isset($textBox['width']) ? (float) $textBox['width'] : null;

                        // Validate coordinates
                        $x = max(0, min($x, $pageWidth - 10));
                        $y = max(0, min($y, $pageHeight - 10));

                        // Set font
                        $fontFamily = isset($availableFonts[$fontFamily]) ? $availableFonts[$fontFamily] : 'Arial';
                        
                        $style = '';
                        if (strpos($fontStyle, 'bold') !== false || strpos($fontStyle, 'B') !== false) {
                            $style .= 'B';
                        }
                        if (strpos($fontStyle, 'italic') !== false || strpos($fontStyle, 'I') !== false) {
                            $style .= 'I';
                        }
                        if (strpos($fontStyle, 'underline') !== false || strpos($fontStyle, 'U') !== false) {
                            $style .= 'U';
                        }
                        
                        $pdf->SetFont($fontFamily, $style, $fontSize);
                        
                        // Set text color
                        $r = isset($color[0]) ? (int) $color[0] : 0;
                        $g = isset($color[1]) ? (int) $color[1] : 0;
                        $b = isset($color[2]) ? (int) $color[2] : 0;
                        $pdf->SetTextColor($r, $g, $b);
                        
                        // Handle multi-line text
                        $lines = explode("\n", $text);
                        $currentY = $y;
                        $lineHeight = $fontSize * $lineSpacing;
                        
                        foreach ($lines as $line) {
                            $pdf->SetXY($x, $currentY);
                            
                            if ($width && $alignment !== 'left') {
                                if ($alignment === 'center') {
                                    $pdf->SetX($x + ($width / 2) - ($pdf->GetStringWidth($line) / 2));
                                } elseif ($alignment === 'right') {
                                    $pdf->SetX($x + $width - $pdf->GetStringWidth($line));
                                }
                            }
                            
                            $pdf->Write($lineHeight, $line);
                            $currentY += $lineHeight;
                        }
                    }
                } else {
                    // For other pages, just copy the template
                    $pdf->useTemplate($templateId);
                }
            }

            $pdfContent = $pdf->Output('S');
            
            return response($pdfContent)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="edited-text.pdf"');
            
        } catch (\Exception $e) {
            \Log::error('Error converting image to PDF: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to convert image to PDF',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}

