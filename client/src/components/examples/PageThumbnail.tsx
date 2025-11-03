import { PageThumbnail } from '../PageThumbnail';
import { useState } from 'react';

export default function PageThumbnailExample() {
  const [selected, setSelected] = useState(false);

  return (
    <div className="p-6 max-w-xs">
      <PageThumbnail
        pageNumber={1}
        isSelected={selected}
        onToggleSelect={() => setSelected(!selected)}
      />
    </div>
  );
}
