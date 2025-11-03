import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import { PDFDocument, degrees } from "pdf-lib";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Merge multiple PDFs
  app.post("/api/pdf/merge", upload.array('pdfs', 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length < 2) {
        return res.status(400).json({ error: 'At least 2 PDF files are required' });
      }

      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const pdf = await PDFDocument.load(file.buffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      const mergedPdfBytes = await mergedPdf.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="merged.pdf"');
      res.send(Buffer.from(mergedPdfBytes));
    } catch (error) {
      console.error('Error merging PDFs:', error);
      res.status(500).json({ error: 'Failed to merge PDFs' });
    }
  });

  // Get PDF metadata (page count)
  app.post("/api/pdf/metadata", upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      const pdf = await PDFDocument.load(file.buffer);
      const pageCount = pdf.getPageCount();

      res.json({ 
        pageCount,
        fileName: file.originalname,
        fileSize: file.size
      });
    } catch (error) {
      console.error('Error reading PDF metadata:', error);
      res.status(500).json({ error: 'Failed to read PDF metadata' });
    }
  });

  // Rotate pages in a PDF
  app.post("/api/pdf/rotate", upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      const { pageIndices, rotation } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      if (!pageIndices || !rotation) {
        return res.status(400).json({ error: 'pageIndices and rotation are required' });
      }

      let indices: number[];
      try {
        indices = JSON.parse(pageIndices) as number[];
      } catch (error) {
        return res.status(400).json({ error: 'Invalid pageIndices format' });
      }

      const rotationAngle = parseInt(rotation);
      if (isNaN(rotationAngle)) {
        return res.status(400).json({ error: 'Invalid rotation value' });
      }

      const pdf = await PDFDocument.load(file.buffer);

      indices.forEach((index) => {
        if (index >= 0 && index < pdf.getPageCount()) {
          const page = pdf.getPage(index);
          const currentRotation = page.getRotation().angle;
          const newRotation = (currentRotation + rotationAngle) % 360;
          page.setRotation(degrees(newRotation));
        }
      });

      const pdfBytes = await pdf.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="rotated.pdf"');
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('Error rotating PDF pages:', error);
      res.status(500).json({ error: 'Failed to rotate PDF pages' });
    }
  });

  // Delete pages from a PDF
  app.post("/api/pdf/delete-pages", upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      const { pageIndices } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      if (!pageIndices) {
        return res.status(400).json({ error: 'pageIndices is required' });
      }

      let indices: number[];
      try {
        indices = JSON.parse(pageIndices) as number[];
      } catch (error) {
        return res.status(400).json({ error: 'Invalid pageIndices format' });
      }

      const pdf = await PDFDocument.load(file.buffer);
      
      // Sort in descending order to avoid index shifting issues
      const sortedIndices = [...indices].sort((a, b) => b - a);

      sortedIndices.forEach((index) => {
        if (index >= 0 && index < pdf.getPageCount()) {
          pdf.removePage(index);
        }
      });

      const pdfBytes = await pdf.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="edited.pdf"');
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('Error deleting PDF pages:', error);
      res.status(500).json({ error: 'Failed to delete PDF pages' });
    }
  });

  // Reorder pages in a PDF
  app.post("/api/pdf/reorder", upload.single('pdf'), async (req, res) => {
    try {
      const file = req.file;
      const { pageOrder } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: 'PDF file is required' });
      }

      if (!pageOrder) {
        return res.status(400).json({ error: 'pageOrder is required' });
      }

      let order: number[];
      try {
        order = JSON.parse(pageOrder) as number[];
      } catch (error) {
        return res.status(400).json({ error: 'Invalid pageOrder format' });
      }

      const sourcePdf = await PDFDocument.load(file.buffer);
      const newPdf = await PDFDocument.create();

      for (const index of order) {
        if (index >= 0 && index < sourcePdf.getPageCount()) {
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [index]);
          newPdf.addPage(copiedPage);
        }
      }

      const pdfBytes = await newPdf.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="reordered.pdf"');
      res.send(Buffer.from(pdfBytes));
    } catch (error) {
      console.error('Error reordering PDF pages:', error);
      res.status(500).json({ error: 'Failed to reorder PDF pages' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
