import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { pdfjs } from "react-pdf";
import { extractPDFText, replacePDFText } from "@/lib/pdfApi";

// Set up PDF.js worker if not already set
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface TextEditorProps {
  file: File;
  pageNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newFile: File) => Promise<void>;
}

export function TextEditor({ file, pageNumber, isOpen, onClose, onSave }: TextEditorProps) {
  const [text, setText] = useState("");
  const [originalText, setOriginalText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file && isOpen) {
      extractText();
    }
  }, [file, pageNumber, isOpen]);

  const extractText = async () => {
    setLoading(true);
    try {
      const extractedText = await extractPDFText(file, pageNumber);
      setText(extractedText);
      setOriginalText(extractedText);
    } catch (error) {
      console.error('Error extracting text:', error);
      setText('Unable to extract text from this page. It may be a scanned image.');
      setOriginalText('');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (text === originalText) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const blob = await replacePDFText(file, pageNumber, originalText, text);
      const newFile = new File([blob], file.name, { type: 'application/pdf' });
      await onSave(newFile);
      onClose();
    } catch (error) {
      console.error('Error saving text:', error);
      alert('Failed to replace text. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Text - Page {pageNumber}</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <Label htmlFor="text-content">Text Content</Label>
            {loading ? (
              <div className="flex items-center justify-center h-48 border rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Extracting text...</span>
              </div>
            ) : (
              <Textarea
                id="text-content"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-2 h-full min-h-[300px] font-mono text-sm"
                placeholder="No text found on this page..."
              />
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Text editing is limited. For scanned PDFs or images, text extraction may not be available.
            </p>
            <p className="text-xs text-muted-foreground">
              <strong>Limitation:</strong> The current implementation overlays new text rather than perfectly replacing it. 
              This means the old text may still be visible underneath. For production use, consider using a more advanced PDF library.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
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

