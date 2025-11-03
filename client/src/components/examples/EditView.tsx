import { EditView } from '../EditView';

export default function EditViewExample() {
  const mockPages = Array.from({ length: 12 }, (_, i) => ({
    id: `page-${i + 1}`,
    pageNumber: i + 1,
  }));

  const mockFile = new File([], 'document.pdf', { type: 'application/pdf' });

  return (
    <EditView
      fileName="document.pdf"
      pages={mockPages}
      onBack={() => console.log('Back to file list')}
      pdfFile={mockFile}
      onPDFUpdated={(newFile, pageCount) => console.log('PDF updated:', newFile, 'pages:', pageCount)}
    />
  );
}
