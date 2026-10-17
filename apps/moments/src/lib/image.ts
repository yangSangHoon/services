/**
 * 폰 사진(4~10MB)을 그대로 올리면 느리다. 긴 변 1600px JPEG 로 줄여서 200~500KB 로.
 * createImageBitmap 의 imageOrientation 으로 EXIF 회전도 반영한다.
 */
export async function compressPhoto(file: Blob, max = 1600, quality = 0.82): Promise<Blob> {
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await loadImage(file);
  }
  const w = bitmap.width;
  const h = bitmap.height;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if ('close' in bitmap) bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return blob ?? file;
}

function loadImage(file: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    img.src = URL.createObjectURL(file);
  });
}
