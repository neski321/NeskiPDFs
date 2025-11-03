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
