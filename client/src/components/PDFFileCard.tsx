import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Trash2, GripVertical, Download, Edit } from "lucide-react";

interface PDFFileCardProps {
  fileName: string;
  pageCount: number;
  fileSize: string;
  onDelete: () => void;
  onEdit: () => void;
  onDownload: () => void;
  isDragging?: boolean;
}

export function PDFFileCard({
  fileName,
  pageCount,
  fileSize,
  onDelete,
  onEdit,
  onDownload,
  isDragging = false,
}: PDFFileCardProps) {
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
      <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded bg-muted">
        <FileText className="h-8 w-8 text-muted-foreground" />
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
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          data-testid={`button-edit-${fileName}`}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          data-testid={`button-download-${fileName}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          data-testid={`button-delete-${fileName}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
