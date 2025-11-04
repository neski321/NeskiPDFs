import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker
// Use CDN for worker (more reliable than local imports)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  file: File;
  fileName?: string;
  onDownload?: () => void;
}

export function PDFViewer({ file, fileName, onDownload }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setLoading(false);
  }

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(numPages || 1, prev + 1));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(3, prev + 0.2));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(0.5, prev - 0.2));
  };

  const fileUrl = URL.createObjectURL(file);

  // Cleanup: revoke object URL when component unmounts
  useEffect(() => {
    return () => {
      URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  return (
    <div className="flex flex-col h-full border rounded-lg bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2 px-3">
            <span className="text-sm font-medium">
              Page {pageNumber} of {numPages || "..."}
            </span>
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          
          <Button
            variant="outline"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {onDownload && (
            <Button
              variant="outline"
              size="icon"
              onClick={onDownload}
              className="ml-2"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <ScrollArea className="flex-1 p-4">
        <div className="flex justify-center">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Loading PDF...</p>
            </div>
          )}
          
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center h-96">
                <p className="text-muted-foreground">Loading PDF...</p>
              </div>
            }
            error={
              <div className="flex flex-col items-center justify-center h-96 p-4">
                <p className="text-destructive font-medium mb-2">Failed to load PDF</p>
                <p className="text-sm text-muted-foreground text-center">
                  {fileName || "The PDF file could not be displayed"}
                </p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
      </ScrollArea>

      {/* Page Navigation Footer */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-2 border-t bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPageNumber(1)}
            disabled={pageNumber === 1}
          >
            First
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousPage}
            disabled={pageNumber === 1}
          >
            Previous
          </Button>
          <input
            type="number"
            min="1"
            max={numPages}
            value={pageNumber}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= numPages) {
                setPageNumber(page);
              }
            }}
            className="w-16 text-center border rounded px-2 py-1 text-sm"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber === numPages}
          >
            Next
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPageNumber(numPages)}
            disabled={pageNumber === numPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
}

