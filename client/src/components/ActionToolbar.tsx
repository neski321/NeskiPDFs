import { Button } from "@/components/ui/button";
import { RotateCcw, RotateCw, Trash2, Download } from "lucide-react";

interface ActionToolbarProps {
  selectedCount: number;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

export function ActionToolbar({
  selectedCount,
  onRotateLeft,
  onRotateRight,
  onDelete,
  onDownload,
}: ActionToolbarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="rounded-lg border bg-background/95 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 p-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="default"
          disabled={!hasSelection}
          onClick={onRotateLeft}
          data-testid="button-rotate-left"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Rotate Left
        </Button>
        <Button
          variant="ghost"
          size="default"
          disabled={!hasSelection}
          onClick={onRotateRight}
          data-testid="button-rotate-right"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Rotate Right
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button
          variant="ghost"
          size="default"
          disabled={!hasSelection}
          onClick={onDelete}
          data-testid="button-delete-selected"
        >
          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
          Delete Selected
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button
          variant="default"
          size="default"
          onClick={onDownload}
          data-testid="button-download-pdf"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </div>
    </div>
  );
}
