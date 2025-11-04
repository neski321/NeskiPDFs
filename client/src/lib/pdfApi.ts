export async function mergePDFs(files: File[]): Promise<Blob> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('pdfs', file);
  });

  const response = await fetch('/api/pdf/merge', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to merge PDFs');
  }

  return response.blob();
}

export async function getPDFMetadata(file: File): Promise<{ pageCount: number; fileName: string; fileSize: number }> {
  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch('/api/pdf/metadata', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to get PDF metadata');
  }

  return response.json();
}

export async function rotatePDFPages(
  file: File,
  pageIndices: number[],
  rotation: number
): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageIndices', JSON.stringify(pageIndices));
  formData.append('rotation', rotation.toString());

  const response = await fetch('/api/pdf/rotate', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to rotate PDF pages');
  }

  return response.blob();
}

export async function deletePDFPages(file: File, pageIndices: number[]): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageIndices', JSON.stringify(pageIndices));

  const response = await fetch('/api/pdf/delete-pages', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to delete PDF pages');
  }

  return response.blob();
}

export async function reorderPDFPages(file: File, pageOrder: number[]): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageOrder', JSON.stringify(pageOrder));

  const response = await fetch('/api/pdf/reorder', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to reorder PDF pages');
  }

  return response.blob();
}

export async function extractPDFText(file: File, pageNumber: number): Promise<string> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageNumber', pageNumber.toString());

  const response = await fetch('/api/pdf/extract-text', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to extract text from PDF');
  }

  const data = await response.json();
  return data.text || '';
}

export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  color: [number, number, number];
}

export interface TextExtractionResult {
  textItems: TextItem[];
  pageWidth: number;
  pageHeight: number;
  fullText: string;
}

export async function extractPDFTextWithPositions(
  file: File,
  pageNumber: number
): Promise<TextExtractionResult> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageNumber', pageNumber.toString());

  const response = await fetch('/api/pdf/extract-text-positions', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to extract text with positions from PDF');
  }

  return response.json();
}

export async function replacePDFText(
  file: File,
  pageNumber: number,
  oldText: string,
  newText: string
): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageNumber', pageNumber.toString());
  formData.append('oldText', oldText);
  formData.append('newText', newText);

  const response = await fetch('/api/pdf/replace-text', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to replace text in PDF');
  }

  return response.blob();
}

export interface TextReplacement {
  oldText: string;
  newText: string;
  oldBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  x: number;
  y: number;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  color?: [number, number, number];
  alignment?: 'left' | 'center' | 'right';
  lineSpacing?: number;
  width?: number;
}

export async function replaceTextInPDF(
  file: File,
  pageNumber: number,
  textReplacements: TextReplacement[]
): Promise<Blob> {
  const formData = new FormData();
  formData.append('pdf', file);
  formData.append('pageNumber', pageNumber.toString());
  formData.append('textReplacements', JSON.stringify(textReplacements));

  const response = await fetch('/api/pdf/replace-text-in-pdf', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to replace text in PDF');
  }

  return response.blob();
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
