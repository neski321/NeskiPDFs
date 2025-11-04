import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, X, Trash2, AlignLeft, AlignCenter, AlignRight, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { extractPDFTextWithPositions, replaceTextInPDF, TextItem, TextExtractionResult } from "@/lib/pdfApi";

// Set up PDF.js worker with error handling - use jsDelivr for faster CDN
if (typeof window !== 'undefined') {
  try {
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      // Use jsDelivr CDN which is typically faster
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }
  } catch (error) {
    console.error('Error setting up PDF.js worker:', error);
    // Fallback to unpkg
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    } catch (fallbackError) {
      console.error('Failed to set fallback worker:', fallbackError);
    }
  }
}

interface TextBox {
  id: string;
  x: number; // PDF coordinates (points)
  y: number; // PDF coordinates (points)
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: [number, number, number];
  width?: number;
  alignment: 'left' | 'center' | 'right';
  lineSpacing: number;
}

interface PDFTextEditorProps {
  file: File;
  pageNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newFile: File) => Promise<void>;
}

const AVAILABLE_FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Times', label: 'Times New Roman' },
  { value: 'Courier', label: 'Courier' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Symbol', label: 'Symbol' },
  { value: 'ZapfDingbats', label: 'Zapf Dingbats' },
];

const FONT_STYLES = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'bold italic', label: 'Bold Italic' },
  { value: 'underline', label: 'Underline' },
];

export function PDFTextEditor({ file, pageNumber, isOpen, onClose, onSave }: PDFTextEditorProps) {
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [editedTextItems, setEditedTextItems] = useState<Map<string, string>>(new Map());
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [scale, setScale] = useState(1.2);
  const [pageWidth, setPageWidth] = useState(0); // PDF points
  const [pageHeight, setPageHeight] = useState(0); // PDF points
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file && isOpen) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setTextItems([]);
      setEditedTextItems(new Map());
      setSelectedBox(null);
      setScale(1.2);
      setLoading(true);
      setExtracting(true);
      
      // Extract text from server
      extractPDFTextWithPositions(file, pageNumber)
        .then((result: TextExtractionResult) => {
          setTextItems(result.textItems);
          setPageWidth(result.pageWidth);
          setPageHeight(result.pageHeight);
          setLoading(false);
          setExtracting(false);
        })
        .catch((error) => {
          console.error('Error extracting text:', error);
          alert(`Failed to extract text: ${error.message}`);
          setLoading(false);
          setExtracting(false);
        });
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (!isOpen) {
      setTextItems([]);
      setEditedTextItems(new Map());
      setSelectedBox(null);
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
    }
  }, [file, isOpen, pageNumber]);

  const handlePageLoad = (page: any) => {
    // Get page dimensions in PDF points (1/72 inch)
    const viewport = page.getViewport({ scale: 1.0 });
    // Only set if not already set from server extraction
    if (pageWidth === 0) {
      setPageWidth(viewport.width);
      setPageHeight(viewport.height);
    }
  };

  // Convert screen coordinates to PDF coordinates
  // PDF.js uses bottom-left origin, but we need to convert to top-left for HTML
  const screenToPdf = (screenX: number, screenY: number): { x: number; y: number } => {
    if (!pageContainerRef.current) return { x: 0, y: 0 };
    
    const rect = pageContainerRef.current.getBoundingClientRect();
    const pdfX = (screenX - rect.left) / scale;
    // Y coordinate: PDF.js uses bottom-left, HTML uses top-left
    // So we need to flip: pdfY = pageHeight - (screenY - rect.top) / scale
    const pdfY = pageHeight - ((screenY - rect.top) / scale);
    
    return { x: pdfX, y: pdfY };
  };

  // Convert PDF coordinates (bottom-left origin) to screen coordinates (top-left origin)
  const pdfToScreen = (pdfX: number, pdfY: number): { x: number; y: number } => {
    // Convert PDF Y (bottom-left) to screen Y (top-left)
    const screenY = (pageHeight - pdfY) * scale;
    return { x: pdfX * scale, y: screenY };
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Find the clicked text item
    const clickedItem = textItems.find(item => {
      const screenPos = pdfToScreen(item.x, item.y);
      const rect = pageContainerRef.current?.getBoundingClientRect();
      if (!rect) return false;
      
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      return (
        clickX >= screenPos.x &&
        clickX <= screenPos.x + (item.width * scale) &&
        clickY >= screenPos.y &&
        clickY <= screenPos.y + (item.height * scale)
      );
    });
    
    if (clickedItem) {
      setSelectedBox(clickedItem.id);
    }
  };

  const handleTextChange = (id: string, newText: string) => {
    const newEdited = new Map(editedTextItems);
    newEdited.set(id, newText);
    setEditedTextItems(newEdited);
  };

  const handleDeleteBox = (id: string) => {
    // Mark text as deleted by setting it to empty
    const newEdited = new Map(editedTextItems);
    newEdited.set(id, '');
    setEditedTextItems(newEdited);
    if (selectedBox === id) {
      setSelectedBox(null);
    }
  };

  // Note: Drag functionality can be added later if needed
  // For now, we'll use server-side replacement which doesn't support moving text

  const handleSave = async () => {
    if (editedTextItems.size === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      // Build text replacements array
      const textReplacements = textItems
        .filter(item => editedTextItems.has(item.id))
        .map(item => {
          const newText = editedTextItems.get(item.id) || '';
          return {
            oldText: item.text,
            newText: newText,
            oldBounds: {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
            },
            x: item.x,
            y: item.y,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            fontStyle: item.fontStyle,
            color: item.color,
            alignment: 'left' as const,
            lineSpacing: 1.0,
            width: item.width,
          };
        });

      const blob = await replaceTextInPDF(file, pageNumber, textReplacements);
      const newFile = new File([blob], file.name, { type: 'application/pdf' });
      await onSave(newFile);
      onClose();
    } catch (error) {
      console.error('Error saving PDF:', error);
      alert(`Failed to save PDF: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedItem = textItems.find(item => item.id === selectedBox);
  const selectedText = selectedItem ? (editedTextItems.get(selectedItem.id) ?? selectedItem.text) : '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
          <DialogTitle>Edit Text - Page {pageNumber}</DialogTitle>
          <DialogDescription>
            Click on the canvas to add text boxes, or click existing text to edit
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden flex gap-4">
          {/* Canvas-based PDF Viewer with Text Overlays */}
          <div className="flex-1 min-h-0 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {textItems.length} text item{textItems.length !== 1 ? 's' : ''} extracted
                      {editedTextItems.size > 0 && ` • ${editedTextItems.size} edited`}
                    </span>
                  </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newScale = Math.max(0.5, scale - 0.1);
                    setScale(newScale);
                  }}
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium w-16 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newScale = Math.min(3, scale + 0.1);
                    setScale(newScale);
                  }}
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 border rounded-lg overflow-auto bg-muted/30 p-4">
              {fileUrl && (
                <div 
                  ref={pageContainerRef}
                  className="relative inline-block cursor-crosshair"
                  onClick={handleClick}
                >
                    {extracting ? (
                      <div className="flex flex-col items-center justify-center h-96">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-muted-foreground mt-2">Extracting text from PDF...</span>
                      </div>
                    ) : (
                      <Document
                        file={fileUrl}
                        loading={
                          <div className="flex flex-col items-center justify-center h-96">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground mt-2">Loading PDF...</span>
                          </div>
                        }
                      >
                        <Page
                          pageNumber={pageNumber}
                          scale={scale}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          onLoadSuccess={handlePageLoad}
                          className="shadow-lg"
                        />
                      </Document>
                    )}
                  
                  {/* Render extracted text items positioned on PDF */}
                  {textItems.map((item) => {
                    const screenPos = pdfToScreen(item.x, item.y);
                    const editedText = editedTextItems.get(item.id);
                    const displayText = editedText !== undefined ? editedText : item.text;
                    const isDeleted = editedText === '';
                    const isEdited = editedText !== undefined && editedText !== item.text;
                    
                    return (
                      <div
                        key={item.id}
                        className={`absolute border-2 rounded p-1 cursor-pointer transition-all ${
                          selectedBox === item.id 
                            ? 'border-primary ring-2 ring-primary bg-white/95 z-10' 
                            : isEdited 
                            ? 'border-blue-400 bg-blue-50/90 hover:bg-blue-100 z-5'
                            : 'border-gray-300 bg-white/90 hover:bg-white hover:border-primary z-0'
                        } ${isDeleted ? 'opacity-50 line-through' : ''}`}
                        style={{
                          left: `${screenPos.x}px`,
                          top: `${screenPos.y}px`,
                          minWidth: `${Math.max(item.width || 100, displayText.length * item.fontSize * 0.6) * scale}px`,
                          minHeight: `${Math.max(20, item.height) * scale}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBox(item.id);
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 h-full">
                          <span 
                            className={`text-xs whitespace-pre-wrap overflow-hidden ${
                              item.fontStyle.includes('bold') && item.fontStyle.includes('italic') ? 'font-bold italic' :
                              item.fontStyle.includes('bold') ? 'font-bold' :
                              item.fontStyle.includes('italic') ? 'italic' :
                              item.fontStyle.includes('underline') ? 'underline' : ''
                            }`}
                            style={{ 
                              fontSize: `${item.fontSize * scale}px`,
                              color: isDeleted ? '#999' : `rgb(${item.color[0]}, ${item.color[1]}, ${item.color[2]})`,
                              fontFamily: item.fontFamily,
                            }}
                          >
                            {isDeleted ? '(deleted)' : (displayText || "Empty")}
                          </span>
                          {isEdited && (
                            <span className="text-xs text-blue-600 font-semibold">Edited</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBox(item.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Text Editor Sidebar */}
          {selectedItem && (
            <div className="w-96 border rounded-lg p-4 bg-card flex-shrink-0 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label>Original Text</Label>
                  <div className="mt-2 p-2 bg-muted rounded text-sm text-muted-foreground">
                    {selectedItem.text}
                  </div>
                </div>
                
                <div>
                  <Label>Edit Text</Label>
                  <Textarea
                    value={selectedText}
                    onChange={(e) => handleTextChange(selectedItem.id, e.target.value)}
                    className="mt-2 min-h-[100px]"
                    placeholder="Enter new text..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {editedTextItems.has(selectedItem.id) 
                      ? 'This text has been edited'
                      : 'Edit the text above to replace it in the PDF'}
                  </p>
                </div>
                
                <div className="border-t pt-4">
                  <Label className="text-sm font-semibold">Text Properties</Label>
                  <div className="mt-2 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Font:</span>
                      <span>{selectedItem.fontFamily}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{selectedItem.fontSize}pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Style:</span>
                      <span>{selectedItem.fontStyle || 'normal'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Position:</span>
                      <span>({Math.round(selectedItem.x)}, {Math.round(selectedItem.y)})</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteBox(selectedItem.id)}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Text
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
