import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, GripVertical, Download, Edit, Eye, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up PDF.js worker if not already set
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFFileCardProps {
  fileName: string;
  pageCount: number;
  fileSize: string;
  onDelete: () => void;
  onEdit: () => void;
  onDownload: () => void;
  onView?: () => void;
  pdfFile?: File;
  isDragging?: boolean;
}

export function PDFFileCard({
  fileName,
  pageCount,
  fileSize,
  onDelete,
  onEdit,
  onDownload,
  onView,
  pdfFile,
  isDragging = false,
}: PDFFileCardProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [thumbnailError, setThumbnailError] = useState(false);

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
      className={`flex items-center gap-4 p-4 transition-opacity ${
        isDragging ? "opacity-50" : ""
      }`}
      data-testid={`card-pdf-${fileName}`}
    >
      <div className="flex-shrink-0 cursor-grab" data-testid="handle-drag">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-muted overflow-hidden relative">
        {fileUrl && pdfFile && !thumbnailError ? (
          <Document
            file={fileUrl}
            onLoadError={() => setThumbnailError(true)}
            loading={
              <div className="flex items-center justify-center h-full w-full">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <Page
              pageNumber={1}
              scale={0.15}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onLoadError={() => setThumbnailError(true)}
              className="!max-w-full !max-h-full"
            />
          </Document>
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="truncate font-medium" data-testid={`text-filename-${fileName}`}>
          {fileName}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          <Badge variant="secondary" className="text-xs">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </Badge>
          <span className="text-sm text-muted-foreground">{fileSize}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onView && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onView}
            data-testid={`button-view-${fileName}`}
            title="View PDF"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          data-testid={`button-edit-${fileName}`}
          title="Edit PDF"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          data-testid={`button-download-${fileName}`}
          title="Download PDF"
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          data-testid={`button-delete-${fileName}`}
          title="Delete PDF"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
