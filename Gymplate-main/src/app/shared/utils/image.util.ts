// [PRODUCTS-FS #10] Shrinks a photo so it fits inside a Firestore document (max 1MB per document).
// The photo is kept as text (a "data URL"). Tries smaller sizes until it is small enough.
export async function compressImageToDataUrl(file: File, maxChars = 500000): Promise<string> {
  const attempts: [number, number][] = [
    [900, 0.75],
    [700, 0.6],
    [500, 0.5],
  ];
  for (const [maxSize, quality] of attempts) {
    const dataUrl = await draw(file, maxSize, quality);
    if (dataUrl.length <= maxChars) return dataUrl;
  }
  throw new Error('Image is too large even after shrinking');
}

function draw(file: File, maxSize: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff'; // PNG transparency becomes white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image'));
    };
    img.src = url;
  });
}

// [SAMPLE-FS #2] A simple picture for sample meals that have no photo yet.
// It is a small JPEG drawn in the browser (the seller can replace it from Edit Meal).
export function makePlaceholderImage(title: string, category: string): string {
  const colors: Record<string, [string, string]> = {
    'Protein Bowls': ['#2f5d3a', '#6aa36f'],
    Salads: ['#3f7d4e', '#9acd7a'],
    Wraps: ['#8a5a2b', '#d9a566'],
    Smoothies: ['#7a3b6b', '#d68fc2'],
    Snacks: ['#b5651d', '#f0b46a'],
    'Meal Prep': ['#2c5f7a', '#7fb7d1'],
  };
  const [c1, c2] = colors[category] ?? ['#444444', '#999999'];
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 400, 300);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 400, 300);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px sans-serif';
  // wrap the title into lines of about 20 characters
  const words = title.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 20) {
      lines.push(line.trim());
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  const startY = 150 - (lines.length - 1) * 18;
  lines.forEach((l, i) => ctx.fillText(l, 200, startY + i * 36));
  ctx.font = '16px sans-serif';
  ctx.fillText(category, 200, 270);
  return canvas.toDataURL('image/jpeg', 0.8);
}

// Small square-ish profile photo (256px) for avatars. Tiny enough to store on the user document.
export function compressAvatarToDataUrl(file: File): Promise<string> {
  return draw(file, 256, 0.8);
}

// [PROFILE-PHOTO] A small square picture for a profile (cropped from the middle, about 20-40 KB).
export function squareAvatarDataUrl(file: File, size = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read the image'));
    };
    img.src = url;
  });
}
