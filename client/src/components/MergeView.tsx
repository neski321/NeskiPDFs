import { useState } from "react";
import { PDFFileCard } from "./PDFFileCard";
import { Button } from "@/components/ui/button";
import { Combine, Plus } from "lucide-react";
import { downloadBlob } from "@/lib/pdfApi";

interface PDFFile {
  id: string;
  name: string;
  pageCount: number;
  size: string;
  file: File;
}

interface MergeViewProps {
  files: PDFFile[];
  onAddMore: () => void;
  onDeleteFile: (id: string) => void;
  onMerge: () => void;
  onReorderFiles: (newOrder: PDFFile[]) => void;
}

export function MergeView({ files, onAddMore, onDeleteFile, onMerge, onReorderFiles }: MergeViewProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };

  const handleDrop = (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    
    if (!draggedId || draggedId === dropTargetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const draggedIndex = files.findIndex(f => f.id === draggedId);
    const dropIndex = files.findIndex(f => f.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) return;

    const newFiles = [...files];
    const [draggedFile] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(dropIndex, 0, draggedFile);

    onReorderFiles(newFiles);
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDownloadFile = (file: PDFFile) => {
    downloadBlob(file.file, file.name);
  };

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Merge PDFs</h2>
          <p className="text-muted-foreground mt-1">
            Drag to reorder, then merge into a single PDF
          </p>
        </div>
        <Button onClick={onAddMore} variant="outline" data-testid="button-add-more">
          <Plus className="h-4 w-4 mr-2" />
          Add More
        </Button>
      </div>

      <div className="space-y-4 mb-8">
        {files.map((file) => (
          <div
            key={file.id}
            draggable
            onDragStart={() => handleDragStart(file.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, file.id)}
            onDrop={(e) => handleDrop(e, file.id)}
            className={dragOverId === file.id && draggedId !== file.id ? 'border-t-2 border-primary' : ''}
          >
            <PDFFileCard
              fileName={file.name}
              pageCount={file.pageCount}
              fileSize={file.size}
              onDelete={() => onDeleteFile(file.id)}
              onEdit={() => console.log('Edit', file.id)}
              onDownload={() => handleDownloadFile(file)}
              isDragging={draggedId === file.id}
            />
          </div>
        ))}
      </div>

      {files.length > 1 && (
        <div className="flex justify-center">
          <Button size="lg" onClick={onMerge} data-testid="button-merge-pdfs">
            <Combine className="h-5 w-5 mr-2" />
            Merge {files.length} PDFs
          </Button>
        </div>
      )}
    </div>
  );
}
