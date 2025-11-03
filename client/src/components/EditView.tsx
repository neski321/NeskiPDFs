import { useState } from "react";
import { PageThumbnail } from "./PageThumbnail";
import { ActionToolbar } from "./ActionToolbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { rotatePDFPages, deletePDFPages, downloadBlob, getPDFMetadata } from "@/lib/pdfApi";

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
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
            Select pages to rotate, delete, or reorder
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-24">
        {currentPages.map((page) => (
          <PageThumbnail
            key={page.id}
            pageNumber={page.pageNumber}
            isSelected={selectedPages.has(page.id)}
            onToggleSelect={() => togglePageSelection(page.id)}
          />
        ))}
      </div>

      <ActionToolbar
        selectedCount={selectedPages.size}
        onRotateLeft={handleRotateLeft}
        onRotateRight={handleRotateRight}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />

      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <p className="text-lg font-medium">Processing PDF...</p>
          </div>
        </div>
      )}
    </div>
  );
}
