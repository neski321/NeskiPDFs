import { ActionToolbar } from '../ActionToolbar';

export default function ActionToolbarExample() {
  return (
    <div className="relative h-48 bg-muted/30">
      <ActionToolbar
        selectedCount={3}
        onRotateLeft={() => console.log('Rotate left')}
        onRotateRight={() => console.log('Rotate right')}
        onDelete={() => console.log('Delete')}
        onDownload={() => console.log('Download')}
      />
    </div>
  );
}
