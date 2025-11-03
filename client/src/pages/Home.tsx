import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { UploadZone } from "@/components/UploadZone";
import { MergeView } from "@/components/MergeView";
import { EditView } from "@/components/EditView";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getPDFMetadata, mergePDFs, downloadBlob } from "@/lib/pdfApi";

interface PDFFile {
  id: string;
  name: string;
  pageCount: number;
  size: string;
  file: File;
}

type ViewMode = "upload" | "merge" | "edit";

export default function Home() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("upload");
  const [currentEditFile, setCurrentEditFile] = useState<PDFFile | null>(null);
  const [activeTab, setActiveTab] = useState<"merge" | "edit">("merge");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFilesAccepted = async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    try {
      const newFiles: PDFFile[] = await Promise.all(
        acceptedFiles.map(async (file, index) => {
          try {
            const metadata = await getPDFMetadata(file);
            return {
              id: `${Date.now()}-${index}`,
              name: file.name,
              pageCount: metadata.pageCount,
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              file,
            };
          } catch (error) {
            console.error('Error loading PDF metadata:', error);
            return {
              id: `${Date.now()}-${index}`,
              name: file.name,
              pageCount: 1,
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              file,
            };
          }
        })
      );

      setFiles((prev) => [...prev, ...newFiles]);
      
      if (newFiles.length > 0) {
        setViewMode(newFiles.length > 1 ? "merge" : "edit");
        if (newFiles.length === 1) {
          setCurrentEditFile(newFiles[0]);
          setActiveTab("edit");
        }
      }

      toast({
        title: "Files uploaded",
        description: `${newFiles.length} PDF file(s) loaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process PDF files",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteFile = (id: string) => {
    setFiles((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (updated.length === 0) {
        setViewMode("upload");
      }
      return updated;
    });
  };

  const handleReorderFiles = (newOrder: PDFFile[]) => {
    setFiles(newOrder);
  };

  const handleEditFile = (file: PDFFile) => {
    setCurrentEditFile(file);
    setViewMode("edit");
    setActiveTab("edit");
  };

  const handleBackToList = () => {
    setCurrentEditFile(null);
    setViewMode(files.length > 1 ? "merge" : "upload");
    setActiveTab("merge");
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({
        title: "Not enough files",
        description: "Please upload at least 2 PDF files to merge",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const blob = await mergePDFs(files.map(f => f.file));
      downloadBlob(blob, 'merged.pdf');
      
      toast({
        title: "Success!",
        description: "PDFs merged successfully",
      });
    } catch (error) {
      toast({
        title: "Merge failed",
        description: "Failed to merge PDF files",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePDFUpdated = (newFile: File, pageCount: number) => {
    if (!currentEditFile) return;

    const updatedFile: PDFFile = {
      ...currentEditFile,
      file: newFile,
      pageCount: pageCount,
      size: `${(newFile.size / (1024 * 1024)).toFixed(1)} MB`,
    };

    setCurrentEditFile(updatedFile);
    
    setFiles((prev) =>
      prev.map((f) => (f.id === currentEditFile.id ? updatedFile : f))
    );
  };

  const handleDownloadFile = async (file: PDFFile) => {
    downloadBlob(file.file, file.name);
  };

  const mockPages = currentEditFile
    ? Array.from({ length: currentEditFile.pageCount }, (_, i) => ({
        id: `${currentEditFile.id}-page-${i + 1}`,
        pageNumber: i + 1,
      }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {isProcessing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <p className="text-lg font-medium">Processing...</p>
          </div>
        </div>
      )}
      
      {viewMode === "upload" && (
        <UploadZone onFilesAccepted={handleFilesAccepted} />
      )}

      {viewMode === "merge" && files.length > 0 && (
        <div className="py-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "merge" | "edit")} className="w-full">
            <div className="container mx-auto max-w-4xl px-6">
              <TabsList className="mb-6">
                <TabsTrigger value="merge" data-testid="tab-merge">
                  Merge PDFs
                </TabsTrigger>
                <TabsTrigger value="edit" data-testid="tab-edit">
                  Edit PDF
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="merge">
              <MergeView
                files={files}
                onAddMore={() => document.querySelector<HTMLInputElement>('[data-testid="input-file-upload"]')?.click()}
                onDeleteFile={handleDeleteFile}
                onMerge={handleMerge}
                onReorderFiles={handleReorderFiles}
              />
            </TabsContent>

            <TabsContent value="edit">
              {files.length > 0 && (
                <div className="container mx-auto max-w-4xl px-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-medium mb-4">Select a PDF to edit:</h3>
                    <div className="grid gap-3">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-4 rounded-lg border cursor-pointer hover-elevate"
                          onClick={() => handleEditFile(file)}
                          data-testid={`select-file-${file.name}`}
                        >
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {file.pageCount} pages • {file.size}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {viewMode === "edit" && currentEditFile && (
        <EditView
          fileName={currentEditFile.name}
          pages={mockPages}
          onBack={handleBackToList}
          pdfFile={currentEditFile.file}
          onPDFUpdated={handlePDFUpdated}
        />
      )}
    </div>
  );
}
