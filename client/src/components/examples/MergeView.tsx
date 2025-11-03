import { MergeView } from '../MergeView';

export default function MergeViewExample() {
  const mockFile = new File([], 'mock.pdf', { type: 'application/pdf' });
  
  const mockFiles = [
    { id: '1', name: 'document1.pdf', pageCount: 5, size: '2.3 MB', file: mockFile },
    { id: '2', name: 'report.pdf', pageCount: 12, size: '4.1 MB', file: mockFile },
    { id: '3', name: 'contract.pdf', pageCount: 8, size: '1.8 MB', file: mockFile },
  ];

  return (
    <MergeView
      files={mockFiles}
      onAddMore={() => console.log('Add more files')}
      onDeleteFile={(id) => console.log('Delete file:', id)}
      onMerge={() => console.log('Merge PDFs')}
      onReorderFiles={(newOrder) => console.log('Reorder files:', newOrder)}
    />
  );
}
