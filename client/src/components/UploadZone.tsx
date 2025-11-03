import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadZoneProps {
  onFilesAccepted: (files: File[]) => void;
}

export function UploadZone({ onFilesAccepted }: UploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length > 0) {
      onFilesAccepted(pdfFiles);
    }
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
  });

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div
        {...getRootProps()}
        className={`flex w-full max-w-2xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
          isDragActive
            ? "border-primary bg-accent"
            : "border-border hover-elevate"
        }`}
        data-testid="dropzone-upload"
      >
        <input {...getInputProps()} data-testid="input-file-upload" />
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted mb-6">
          {isDragActive ? (
            <Upload className="h-10 w-10 text-primary" />
          ) : (
            <FileText className="h-10 w-10 text-muted-foreground" />
          )}
        </div>
        <h2 className="text-2xl font-semibold mb-2">
          {isDragActive ? "Drop PDFs here" : "Upload PDFs to get started"}
        </h2>
        <p className="text-muted-foreground mb-6 text-center">
          Drag & drop files or click to browse
        </p>
        <Button variant="outline" size="default" data-testid="button-browse-files">
          Browse Files
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">
          Supports PDF files up to 50MB
        </p>
      </div>
    </div>
  );
}
