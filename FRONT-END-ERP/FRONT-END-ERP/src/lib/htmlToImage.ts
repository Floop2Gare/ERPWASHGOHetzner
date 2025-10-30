export type ToPngOptions = {
  pixelRatio?: number;
  backgroundColor?: string;
};

export const toPng = async (element: HTMLElement, options: ToPngOptions = {}) => {
  const rect = element.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const clone = element.cloneNode(true) as HTMLElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const serializer = new XMLSerializer();
  const serialized = serializer.serializeToString(clone);
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject width="100%" height="100%">${serialized}</foreignObject>` +
    `</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const ratio = options.pixelRatio ?? window.devicePixelRatio ?? 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(width * ratio));
    canvas.height = Math.max(1, Math.floor(height * ratio));
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Impossible de créer le contexte 2D.');
    }
    context.scale(ratio, ratio);
    if (options.backgroundColor) {
      context.fillStyle = options.backgroundColor;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
};

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Impossible de charger la capture.'));
    image.src = url;
  });
