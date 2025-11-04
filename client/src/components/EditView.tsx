import { useState, useRef } from "react";
import { PageThumbnail } from "./PageThumbnail";
import { ActionToolbar } from "./ActionToolbar";
import { PDFViewer } from "./PDFViewer";
import { PDFTextEditor } from "./PDFTextEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Grid, Edit, FilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rotatePDFPages, deletePDFPages, reorderPDFPages, downloadBlob, getPDFMetadata, appendPDFs } from "@/lib/pdfApi";

interface Page {
  id: string;
  pageNumber: number;
}

interface EditViewProps {
  fileName: string;
  pages: Page[];
  onBack: () => void;
  pdfFile: File;
  onPDFUpdated: (newFile: File, pageCount: number) => void;
}

export function EditView({ fileName, pages, onBack, pdfFile, onPDFUpdated }: EditViewProps) {
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPages, setCurrentPages] = useState<Page[]>(pages);
  const [currentFile, setCurrentFile] = useState<File>(pdfFile);
  const [viewMode, setViewMode] = useState<"grid" | "viewer">("grid");
  const [editingPage, setEditingPage] = useState<number | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const togglePageSelection = (pageId: string) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageId)) {
      newSelection.delete(pageId);
    } else {
      newSelection.add(pageId);
    }
    setSelectedPages(newSelection);
  };

  const getSelectedPageIndices = (): number[] => {
    return Array.from(selectedPages).map((pageId) => {
      const page = currentPages.find((p) => p.id === pageId);
      return page ? page.pageNumber - 1 : -1;
    }).filter((index) => index >= 0);
  };

  const updateFileState = async (blob: Blob, newFileName: string) => {
    const file = new File([blob], newFileName, { type: 'application/pdf' });
    
    try {
      const metadata = await getPDFMetadata(file);
      const newPages = Array.from({ length: metadata.pageCount }, (_, i) => ({
        id: `page-${Date.now()}-${i + 1}`,
        pageNumber: i + 1,
      }));
      
      setCurrentFile(file);
      setCurrentPages(newPages);
      onPDFUpdated(file, metadata.pageCount);
    } catch (error) {
      console.error('Error updating page metadata:', error);
    }
  };

  const handleRotateLeft = async () => {
    const indices = getSelectedPageIndices();
    if (indices.length === 0) return;

    setIsProcessing(true);
    try {
      const blob = await rotatePDFPages(currentFile, indices, -90);
      const newFileName = `${fileName.replace('.pdf', '')}_rotated.pdf`;
      await updateFileState(blob, newFileName);
      downloadBlob(blob, newFileName);
      
      setSelectedPages(new Set());
      toast({
        title: "Success!",
        description: `Rotated ${indices.length} page(s) left`,
      });
    } catch (error) {
      toast({
        title: "Rotation failed",
        description: "Failed to rotate PDF pages",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRotateRight = async () => {
    const indices = getSelectedPageIndices();
    if (indices.length === 0) return;

    setIsProcessing(true);
    try {
      const blob = await rotatePDFPages(currentFile, indices, 90);
      const newFileName = `${fileName.replace('.pdf', '')}_rotated.pdf`;
      await updateFileState(blob, newFileName);
      downloadBlob(blob, newFileName);
      
      setSelectedPages(new Set());
      toast({
        title: "Success!",
        description: `Rotated ${indices.length} page(s) right`,
      });
    } catch (error) {
      toast({
        title: "Rotation failed",
        description: "Failed to rotate PDF pages",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    const indices = getSelectedPageIndices();
    if (indices.length === 0) return;

    if (indices.length >= currentPages.length) {
      toast({
        title: "Cannot delete all pages",
        description: "PDF must have at least one page",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await deletePDFPages(currentFile, indices);
      const newFileName = `${fileName.replace('.pdf', '')}_edited.pdf`;
      await updateFileState(blob, newFileName);
      downloadBlob(blob, newFileName);
      
      setSelectedPages(new Set());
      toast({
        title: "Success!",
        description: `Deleted ${indices.length} page(s)`,
      });
    } catch (error) {
      toast({
        title: "Deletion failed",
        description: "Failed to delete PDF pages",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    downloadBlob(currentFile, fileName);
    toast({
      title: "Downloaded",
      description: "PDF downloaded successfully",
    });
  };

  const handleDragStart = (pageId: string) => {
    setDraggedPageId(pageId);
  };

  const handleDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    if (draggedPageId && draggedPageId !== pageId) {
      setDragOverPageId(pageId);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropTargetId: string) => {
    e.preventDefault();
    
    if (!draggedPageId || draggedPageId === dropTargetId) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    const draggedIndex = currentPages.findIndex(p => p.id === draggedPageId);
    const dropIndex = currentPages.findIndex(p => p.id === dropTargetId);

    if (draggedIndex === -1 || dropIndex === -1) {
      setDraggedPageId(null);
      setDragOverPageId(null);
      return;
    }

    // Reorder pages array - this gives us the new order
    const newPages = [...currentPages];
    const [draggedPage] = newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, draggedPage);
    
    // Create new page order array - send ORIGINAL page numbers in new order
    // The backend expects an array of original page numbers (1-indexed) in the new desired order
    // e.g., if original page 3 is moved to position 1, the order would be [3, 1, 2]
    // We use the pageNumber from each page object, which contains the ORIGINAL page number
    const newPageOrder = newPages.map(p => p.pageNumber);
    
    // Update page numbers to reflect new positions (1-indexed) for display
    const reorderedPages = newPages.map((page, index) => ({
      ...page,
      pageNumber: index + 1,
    }));
    setCurrentPages(reorderedPages);

    // Apply reordering to PDF via backend
    setIsProcessing(true);
    try {
      const blob = await reorderPDFPages(currentFile, newPageOrder);
      const newFileName = `${fileName.replace('.pdf', '')}_reordered.pdf`;
      await updateFileState(blob, newFileName);
      downloadBlob(blob, newFileName);
      
      toast({
        title: "Success!",
        description: "Pages reordered successfully",
      });
    } catch (error) {
      // Revert to original order on error
      setCurrentPages(pages);
      toast({
        title: "Reordering failed",
        description: "Failed to reorder PDF pages",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setDraggedPageId(null);
      setDragOverPageId(null);
    }
  };

  const handleEditText = (pageNumber: number) => {
    setEditingPage(pageNumber);
  };

  const handleTextSaved = async (newFile: File) => {
    try {
      const metadata = await getPDFMetadata(newFile);
      const newPages = Array.from({ length: metadata.pageCount }, (_, i) => ({
        id: `page-${Date.now()}-${i + 1}`,
        pageNumber: i + 1,
      }));
      
      setCurrentFile(newFile);
      setCurrentPages(newPages);
      onPDFUpdated(newFile, metadata.pageCount);
      
      toast({
        title: "Success!",
        description: "Text updated successfully",
      });
    } catch (error) {
      console.error('Error updating file:', error);
      toast({
        title: "Error",
        description: "Failed to update PDF",
        variant: "destructive",
      });
    }
  };

  const handleAddPDFs = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const additionalFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    if (additionalFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select PDF files only",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await appendPDFs(currentFile, additionalFiles);
      const newFileName = `${fileName.replace('.pdf', '')}_merged.pdf`;
      await updateFileState(blob, newFileName);
      
      toast({
        title: "Success!",
        description: `Added ${additionalFiles.length} PDF file(s) to the document`,
      });
    } catch (error) {
      console.error('Error appending PDFs:', error);
      toast({
        title: "Failed to add PDFs",
        description: error instanceof Error ? error.message : "Failed to append PDFs",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">{fileName}</h2>
            <p className="text-muted-foreground mt-1">
              {viewMode === "grid" 
                ? "Drag pages to reorder, or select pages to rotate/delete"
                : "View your PDF document"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddPDFs}
            disabled={isProcessing}
          >
            <FilePlus className="h-4 w-4 mr-2" />
            Add PDFs
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4 mr-2" />
            Thumbnails
          </Button>
          <Button
            variant={viewMode === "viewer" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("viewer")}
          >
            <Eye className="h-4 w-4 mr-2" />
            Viewer
          </Button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-24">
            {currentPages.map((page) => (
              <div
                key={page.id}
                className="relative group"
                draggable
                onDragStart={() => handleDragStart(page.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, page.id)}
                onDrop={(e) => handleDrop(e, page.id)}
              >
                <PageThumbnail
                  pageNumber={page.pageNumber}
                  isSelected={selectedPages.has(page.id)}
                  onToggleSelect={() => togglePageSelection(page.id)}
                  pdfFile={currentFile}
                  isDragging={draggedPageId === page.id}
                />
                <div
                  className={`absolute inset-0 border-2 border-dashed rounded-lg transition-all ${
                    dragOverPageId === page.id
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent'
                  }`}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditText(page.pageNumber);
                  }}
                  title="Edit text"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                {draggedPageId === page.id && (
                  <div className="absolute inset-0 bg-primary/20 border-2 border-primary rounded-lg pointer-events-none" />
                )}
              </div>
            ))}
          </div>

          <ActionToolbar
            selectedCount={selectedPages.size}
            onRotateLeft={handleRotateLeft}
            onRotateRight={handleRotateRight}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </>
      ) : (
        <div className="mb-6">
          <div className="h-[calc(100vh-300px)] min-h-[600px]">
            <PDFViewer
              file={currentFile}
              fileName={fileName}
              onDownload={handleDownload}
            />
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <p className="text-lg font-medium">Processing PDF...</p>
          </div>
        </div>
      )}

      {editingPage && (
        <PDFTextEditor
          file={currentFile}
          pageNumber={editingPage}
          isOpen={!!editingPage}
          onClose={() => setEditingPage(null)}
          onSave={handleTextSaved}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
