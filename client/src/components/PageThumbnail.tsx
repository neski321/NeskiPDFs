import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker if not already set
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PageThumbnailProps {
  pageNumber: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  pdfFile?: File;
  isDragging?: boolean;
}

export function PageThumbnail({
  pageNumber,
  isSelected,
  onToggleSelect,
  pdfFile,
  isDragging = false,
}: PageThumbnailProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [pdfFile]);

  return (
    <Card
      className={`relative cursor-pointer transition-all overflow-hidden ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${isDragging ? "opacity-50 scale-95" : "hover:scale-105"}`}
      onClick={onToggleSelect}
      data-testid={`thumbnail-page-${pageNumber}`}
    >
      <div className="aspect-[8.5/11] flex items-center justify-center bg-muted rounded-t-md overflow-hidden relative">
        {fileUrl && !error ? (
          <div className="w-full h-full flex items-center justify-center p-1">
            <Document
              file={fileUrl}
              loading={
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              onLoadError={() => {
                setError(true);
                setLoading(false);
              }}
            >
              <Page
                pageNumber={pageNumber}
                scale={0.3}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                onLoadSuccess={() => setLoading(false)}
                onLoadError={() => {
                  setError(true);
                  setLoading(false);
                }}
                className="shadow-sm"
              />
            </Document>
          </div>
        ) : (
          <FileText className="h-12 w-12 text-muted-foreground" />
        )}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="p-2 flex items-center justify-between">
        <Badge variant="secondary" className="text-xs">
          Page {pageNumber}
        </Badge>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          data-testid={`checkbox-page-${pageNumber}`}
        />
      </div>
    </Card>
  );
}
