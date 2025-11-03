import { PDFFileCard } from '../PDFFileCard';

export default function PDFFileCardExample() {
  return (
    <div className="p-6 max-w-2xl">
      <PDFFileCard
        fileName="document.pdf"
        pageCount={5}
        fileSize="2.3 MB"
        onDelete={() => console.log('Delete clicked')}
        onEdit={() => console.log('Edit clicked')}
        onDownload={() => console.log('Download clicked')}
      />
    </div>
  );
}
